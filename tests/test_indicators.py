import pandas as pd
import numpy as np
from config_loader import load_config
from strategies.ml_grid_strategy import MLGridStrategy


def make_dummy_ohlcv(n=60):
    dates = pd.date_range(end=pd.Timestamp.utcnow(), periods=n, freq='H')
    close = np.linspace(10000, 10100, n) + np.random.normal(0, 1, n)
    open_ = close + np.random.normal(0, 1, n)
    high = np.maximum(open_, close) + np.random.rand(n)
    low = np.minimum(open_, close) - np.random.rand(n)
    volume = np.random.randint(1, 1000, n)
    df = pd.DataFrame({
        'date': dates,
        'open': open_,
        'high': high,
        'low': low,
        'close': close,
        'volume': volume,
    })
    df.set_index('date', inplace=True)
    return df


def test_populate_indicators_runs():
    cfg = load_config()
    strat = MLGridStrategy(cfg)
    df = make_dummy_ohlcv()
    out = strat.populate_indicators(df.copy(), {'pair': 'BTC/USDT:USDT'})
    # basic assertions
    assert 'rsi' in out.columns
    assert 'macd' in out.columns
    assert len(out) == len(df)
