from freqtrade.strategy import IStrategy
try:
    # freqtrade.freqai may vary between versions; import safely
    from freqtrade.freqai.prediction_models import TensorflowRegressor
    from freqtrade.freqai.data_kitchen import FreqaiDataKitchen
except Exception:
    TensorflowRegressor = None
    FreqaiDataKitchen = None
from datetime import datetime
import numpy as np
import pandas as pd
import talib.abstract as ta
from pandas import DataFrame
import requests
import logging

logger = logging.getLogger(__name__)


class MLGridStrategy(IStrategy):
    INTERFACE_VERSION = 3
    minimal_roi = {"0": 0.05}
    stoploss = -0.05
    trailing_stop = True
    trailing_stop_positive = 0.02
    timeframe = '1h'
    # Rename numeric default to avoid colliding with the leverage() method
    default_leverage = 2
    grid_levels = 5
    grid_spacing = 0.01
    startup_candle_count: int = 50

    # Default to False to avoid requiring heavy ML dependencies for quick runs.
    # Enable via config (or set to True after installing freqai/TensorFlow).
    freqai_enabled = False
    # Use imported model if available, otherwise disable freqai features at runtime
    freqai_model = TensorflowRegressor if TensorflowRegressor is not None else None
    freqai_corr_pairlist = ['BTC/USDT:USDT']
    freqai_feature_parameters = {
        'window_size': 20,
        'corr_window_size': 20,
    }
    freqai_model_parameters = {
        'epochs': 100,
        'batch_size': 32,
        'optimizer': 'adam',
        'loss': 'mse',
        'metrics': ['mae'],
        'layers': [
            {'type': 'MultiHeadAttention', 'num_heads': 4, 'key_dim': 50},
            {'type': 'Dense', 'units': 64, 'activation': 'relu'},
            {'type': 'Dense', 'units': 1},
        ]
    }
    freqai_retrain_period = 12
    freqai_identifier = 'mlgrid_transformer'

    def __init__(self, config: dict) -> None:
        # IStrategy implementations may be constructed with a config dict.
        # Safely load freqai configuration overrides from the strategy/config file
        # while keeping reasonable defaults when freqai isn't available.
        super().__init__(config)
        try:
            self._load_freqai_config()
        except Exception:
            # Do not fail strategy construction if freqai or config keys are missing
            logger.debug("Failed to load freqai config overrides; using defaults.")

    def _load_freqai_config(self) -> None:
        """Merge freqai-related config from self.config with strategy defaults.

        This allows users to set `freqai_enabled` and `freqai_model_parameters`
        in `config.json` (top-level or under strategy-specific keys) without
        requiring code changes.
        """
        cfg = getattr(self, 'config', None) or {}

        # Top-level config option: freqai_enabled
        if isinstance(cfg, dict):
            top_enabled = cfg.get('freqai_enabled')
            if isinstance(top_enabled, bool):
                self.freqai_enabled = top_enabled

            # Strategy-specific overrides: config['strategy'] or config['strategy_config']
            strat_cfg = cfg.get('strategy') if isinstance(cfg.get('strategy'), dict) else {}
            if not strat_cfg:
                strat_cfg = cfg.get('strategy_config') if isinstance(cfg.get('strategy_config'), dict) else {}

            # Some users may put strategy options under strategy_name -> options
            # e.g., config['strategy']['MLGridStrategy'] = {...}
            strat_name_cfg = {}
            if isinstance(strat_cfg, dict):
                strat_name_cfg = strat_cfg.get(self.__class__.__name__, {}) if isinstance(strat_cfg.get(self.__class__.__name__), dict) else {}

            # Merge order: defaults <- top-level strategy dict <- strategy-name dict
            merged = {}
            merged.update(getattr(self, 'freqai_model_parameters', {}) or {})
            # top-level freqai_model_parameters
            top_params = cfg.get('freqai_model_parameters')
            if isinstance(top_params, dict):
                merged.update(top_params)

            # strategy-level params
            strat_params = strat_cfg.get('freqai_model_parameters') if isinstance(strat_cfg.get('freqai_model_parameters'), dict) else None
            if isinstance(strat_params, dict):
                merged.update(strat_params)

            # named strategy override
            named_params = strat_name_cfg.get('freqai_model_parameters') if isinstance(strat_name_cfg.get('freqai_model_parameters'), dict) else None
            if isinstance(named_params, dict):
                merged.update(named_params)

            # Apply merged model params back to the strategy
            self.freqai_model_parameters = merged

            # Also allow enabling via strategy-specific flags
            strat_enabled = strat_name_cfg.get('freqai_enabled') if isinstance(strat_name_cfg.get('freqai_enabled'), bool) else None
            if strat_enabled is not None:
                self.freqai_enabled = strat_enabled

        # Log resolved settings for easier debugging (non-fatal)
        try:
            logger.info(f"freqai_enabled={self.freqai_enabled}")
            logger.info(f"freqai_model_parameters={self.freqai_model_parameters}")
        except Exception:
            # Best-effort logging; do not raise
            pass

    def informative_pairs(self):
        return [("BTC/USDT:USDT", "1h")]

    def fetch_sentiment(self) -> float:
        try:
            url = "https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=false&community_data=true"
            response = requests.get(url, timeout=5)
            data = response.json()
            sentiment = data.get('sentiment_votes_up_percentage', 50) / 100
            logger.info(f"Fetched sentiment: {sentiment}")
            return sentiment
        except Exception as e:
            logger.warning(f"Sentiment fetch failed: {e}")
            return 0.5

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        macd, macdsignal, macdhist = ta.MACD(dataframe)
        dataframe['macd'] = macd
        dataframe['macdsignal'] = macdsignal
        dataframe['macdhist'] = macdhist
        dataframe['sentiment'] = self.fetch_sentiment()

        # Debug: log the most recent calculated indicators for visibility during backtests
        try:
            last = dataframe.tail(1).iloc[0]
            logger.debug(f"Indicators (last row) - rsi={last.get('rsi')}, macdhist={last.get('macdhist')}, sentiment={last.get('sentiment')}")
        except Exception:
            pass

        if self.freqai_enabled and FreqaiDataKitchen is not None:
            dk = FreqaiDataKitchen(self.config)
            dataframe = dk.make_features(dataframe, self, metadata, self.freqai_feature_parameters)

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['enter_long'] = 0
        dataframe['enter_short'] = 0

        # Obtain predicted_delta series: prefer freqai predictions, otherwise use a simple momentum fallback
        use_fallback = True
        predicted_delta = None
        sentiment = dataframe['sentiment'] if 'sentiment' in dataframe.columns else 0.5

        if self.freqai_enabled and hasattr(self, 'freqai') and self.freqai is not None:
            try:
                pred_df = self.freqai.get_predictions(dataframe, metadata)
                if pred_df is not None and 'prediction' in pred_df:
                    predicted_delta = pred_df['prediction']
                    use_fallback = False
                else:
                    logger.warning("Missing or malformed prediction data; falling back to momentum predictor.")
            except Exception:
                logger.exception("Error obtaining freqai predictions; falling back to momentum predictor.")

        if use_fallback:
            # Momentum fallback: short-window percent change as a cheap proxy for predicted delta
            try:
                # 3-period return (can be tuned); clip to avoid extreme values
                predicted_delta = dataframe['close'].pct_change(periods=3).fillna(0).clip(-0.1, 0.1)
            except Exception:
                # Final safeguard: zero series if even that fails
                predicted_delta = pd.Series([0.0] * len(dataframe), index=dataframe.index)

        # Choose thresholds depending on whether we're using the ML predictor or fallback
        if use_fallback:
            pred_threshold_long = 0.001
            pred_threshold_short = -0.001
            # Relaxed fallback thresholds for easier signal generation during testing
            pred_threshold_long = 0.0005
            pred_threshold_short = -0.0005
            # For fallback, do not gate on sentiment (useful for offline testing)
            sentiment_high = 0.0
            sentiment_low = 1.0
            # Use a small MACD magnitude threshold: values with abs(macdhist) in the top 75%
            try:
                macd_abs_thresh = dataframe['macdhist'].abs().quantile(0.25)
            except Exception:
                macd_abs_thresh = 0.0
        else:
            pred_threshold_long = 0.005
            pred_threshold_short = -0.005
            sentiment_high = 0.6
            sentiment_low = 0.4

        # Now compute conditions; predicted_delta may be a Series or array-like
        try:
            pd_pred = pd.Series(predicted_delta, index=dataframe.index)
        except Exception:
            pd_pred = predicted_delta

        # When using fallback, use relaxed RSI bounds and require a meaningful macdhist magnitude
        if use_fallback:
            conditions_long = (
                (dataframe['rsi'] < 40) &
                (dataframe['macdhist'] > macd_abs_thresh) &
                (pd_pred > pred_threshold_long)
            )
        else:
            conditions_long = (
                (dataframe['rsi'] < 30) &
                (dataframe['macdhist'] > 0) &
                (pd_pred > pred_threshold_long) &
                (sentiment > sentiment_high)
            )
        dataframe.loc[conditions_long, 'enter_long'] = 1

        # Debug: log how many long conditions matched and a sample index
        try:
            n_long = int(conditions_long.sum())
            logger.debug(f"populate_entry_trend: {n_long} long conditions matched")
            if n_long > 0:
                sample_idxs = dataframe.loc[conditions_long].iloc[-3:].index.tolist()
                logger.debug(f"populate_entry_trend: sample long indices: {sample_idxs}")
        except Exception:
            pass

        if use_fallback:
            conditions_short = (
                (dataframe['rsi'] > 60) &
                (dataframe['macdhist'] < -macd_abs_thresh) &
                (pd_pred < pred_threshold_short)
            )
        else:
            conditions_short = (
                (dataframe['rsi'] > 70) &
                (dataframe['macdhist'] < 0) &
                (pd_pred < pred_threshold_short) &
                (sentiment < sentiment_low)
            )

        dataframe.loc[conditions_short, 'enter_short'] = 1

        # Debug: log how many short conditions matched
        try:
            n_short = int(conditions_short.sum())
            logger.debug(f"populate_entry_trend: {n_short} short conditions matched")
            if n_short > 0:
                sample_idxs = dataframe.loc[conditions_short].iloc[-3:].index.tolist()
                logger.debug(f"populate_entry_trend: sample short indices: {sample_idxs}")
        except Exception:
            pass

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['exit_long'] = 0
        dataframe['exit_short'] = 0

        exit_long_mask = (dataframe['rsi'] > 70) | (dataframe['sentiment'] < 0.4)
        exit_short_mask = (dataframe['rsi'] < 30) | (dataframe['sentiment'] > 0.6)
        dataframe.loc[exit_long_mask, 'exit_long'] = 1
        dataframe.loc[exit_short_mask, 'exit_short'] = 1

        try:
            n_exit_long = int(exit_long_mask.sum())
            n_exit_short = int(exit_short_mask.sum())
            logger.debug(f"populate_exit_trend: exit_long={n_exit_long}, exit_short={n_exit_short}")
        except Exception:
            pass

        return dataframe

    def leverage(self, pair: str, current_time: datetime, current_rate: float,
                 proposed_leverage: float, max_leverage: float, entry_tag: str, side: str,
                 **kwargs) -> float:
        """
        Compute dynamic leverage. Returns a numeric leverage value.
        Note: use `default_leverage` as the numeric default to avoid recursion.
        """
        if self.freqai_enabled and hasattr(self, 'freqai') and self.freqai is not None:
            pred_df = self.freqai.get_predictions(pd.DataFrame(), {'pair': pair})

            if pred_df is None or 'prediction' not in pred_df:
                return self.default_leverage

            vol_pred = np.std(pred_df['prediction'][-10:])
            sentiment = self.fetch_sentiment()
            leverage_adj = self.default_leverage * (1 - vol_pred * 5) * (1 + (sentiment - 0.5))
            # Ensure leverage is at least 1 and does not exceed the strategy default
            leverage_final = min(max(leverage_adj, 1), self.default_leverage)
            logger.info(f"Adjusted leverage: {leverage_final}")
            return leverage_final
        return self.default_leverage

    from typing import Any

    def custom_stoploss(self, pair: str, trade: Any, current_time: datetime, current_rate: float,
                        current_profit: float, **kwargs) -> float:
        """
        Custom stoploss: once trade profit reaches 1% (0.01), start trailing the stoploss
        so that it remains 1% behind the current profit. Return a stoploss as a
        negative fraction (e.g., -0.02 means 2% stoploss). Return 1 to keep existing
        stoploss behavior.
        """
        try:
            # current_profit is a fraction (e.g., 0.02 for +2%) provided by freqtrade
            profit = float(current_profit)
        except Exception:
            return 1

        # If profit hasn't reached the trailing threshold, use normal strategy stoploss
        trailing_threshold = 0.01  # 1%
        trailing_distance = 0.01   # keep stoploss 1% behind current profit

        if profit >= trailing_threshold:
            # Desired stoploss level: current_profit - trailing_distance
            new_stop = profit - trailing_distance
            # Convert to negative stoploss fraction (freqtrade expects negative)
            stoploss_frac = -abs(new_stop)
            # Ensure we don't set a stoploss that's higher (less protective) than strategy stoploss
            strategy_stop = getattr(self, 'stoploss', -0.05)
            # Use the tighter (closer to zero) of the two (i.e., max since both negative)
            final_stop = max(stoploss_frac, strategy_stop)
            logger.debug(f"custom_stoploss: profit={profit:.4f} new_stop={final_stop:.4f}")
            return float(final_stop)

        return 1

    def custom_entry(self, pair: str, current_time: datetime, current_rate: float,
                     current_profit: float, **kwargs):
        """
        Implements grid order placement logic based on prediction and sentiment.
        """
        # If freqai is disabled or not available, do not attempt custom grid entry
        if not self.freqai_enabled or not hasattr(self, 'freqai') or self.freqai is None:
            return None

        pred_df = self.freqai.get_predictions(pd.DataFrame(), {'pair': pair})
        if pred_df is None or 'prediction' not in pred_df:
            logger.warning("No prediction data for custom_entry.")
            return None

        sentiment = self.fetch_sentiment()
        predicted_delta = pred_df['prediction'].iloc[-1]
        vol_pred = np.std(pred_df['prediction'][-10:])
        dynamic_spacing = self.grid_spacing * (1 + vol_pred + (sentiment - 0.5))

        grid_orders = []
        direction = 'buy' if predicted_delta > 0 else 'sell'
        base_price = current_rate

        for i in range(1, self.grid_levels + 1):
            offset = base_price * dynamic_spacing * i
            price = base_price - offset if direction == 'buy' else base_price + offset
            grid_orders.append({
                'price': round(price, 2),
                'amount': 1 / self.grid_levels,
                'side': direction,
                'leverage': self.leverage(pair, current_time, current_rate, self.default_leverage, self.default_leverage, 'grid', direction)
            })

        logger.info(f"Placing {direction} grid orders: {grid_orders}")
        return grid_orders
