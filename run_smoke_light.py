import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from strategies.ml_grid_strategy import MLGridStrategy
from config_loader import load_config


def make_dummy_ohlcv(n=60):
    now = datetime.utcnow()
    dates = [now - timedelta(hours=i) for i in reversed(range(n))]
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


def main():
    cfg = load_config()
    strat = MLGridStrategy(cfg)
    df = make_dummy_ohlcv(60)
    try:
        df2 = strat.populate_indicators(df.copy(), {'pair': 'BTC/USDT:USDT'})
        print('populate_indicators ran; sample columns:', list(df2.columns)[:8])
    except Exception as e:
        print('populate_indicators failed:', e)


if __name__ == '__main__':
    main()
