from freqtrade.strategy import IStrategy
try:
    # freqtrade.freqai may vary between versions; import safely
    from freqtrade.freqai.prediction_models import TensorflowRegressor
    from freqtrade.freqai.data_kitchen import FreqaiDataKitchen
except Exception:
    TensorflowRegressor = None
    FreqaiDataKitchen = None
from freqtrade.persistence import Trade
from freqtrade.exchange import timeframe_to_minutes
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
    default_leverage = 10
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

        if self.freqai_enabled and FreqaiDataKitchen is not None:
            dk = FreqaiDataKitchen(self.config)
            dataframe = dk.make_features(dataframe, self, metadata, self.freqai_feature_parameters)

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['enter_long'] = 0
        dataframe['enter_short'] = 0

        if self.freqai_enabled and hasattr(self, 'freqai') and self.freqai is not None:
            pred_df = self.freqai.get_predictions(dataframe, metadata)
            if pred_df is None or 'prediction' not in pred_df:
                logger.warning("Missing prediction data.")
                return dataframe

            predicted_delta = pred_df['prediction']
            sentiment = dataframe['sentiment']
            vol_pred = np.std(predicted_delta[-10:])
            dynamic_spacing = self.grid_spacing * (1 + vol_pred + (sentiment - 0.5))

            conditions_long = (
                (dataframe['rsi'] < 30) &
                (dataframe['macdhist'] > 0) &
                (predicted_delta > 0.005) &
                (sentiment > 0.6)
            )
            dataframe.loc[conditions_long, 'enter_long'] = 1

            conditions_short = (
                (dataframe['rsi'] > 70) &
                (dataframe['macdhist'] < 0) &
                (predicted_delta < -0.005) &
                (sentiment < 0.4)
            )
            dataframe.loc[conditions_short, 'enter_short'] = 1

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['exit_long'] = 0
        dataframe['exit_short'] = 0

        dataframe.loc[(dataframe['rsi'] > 70) | (dataframe['sentiment'] < 0.4), 'exit_long'] = 1
        dataframe.loc[(dataframe['rsi'] < 30) | (dataframe['sentiment'] > 0.6), 'exit_short'] = 1

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
            leverage_final = min(max(leverage_adj, 5), self.default_leverage)
            logger.info(f"Adjusted leverage: {leverage_final}")
            return leverage_final
        return self.default_leverage

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
