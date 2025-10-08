"""Load OHLCV data and compute how many rows meet the MLGridStrategy's signal thresholds.

Usage: python tools/threshold_scan.py --file user_data/data/bybit/BTC-USDT-1h.csv
"""
import argparse
import pandas as pd
import numpy as np
import talib as ta


def load_data(path):
    if path.endswith('.feather'):
        return pd.read_feather(path)
    return pd.read_csv(path)


def compute_counts(df):
    df = df.copy()
    df['rsi'] = ta.RSI(df['close'].values, timeperiod=14)
    macd, macdsignal, macdhist = ta.MACD(df['close'].values)
    df['macdhist'] = macdhist
    # sentiment is not available offline; use neutral 0.5 unless sentiment column exists
    if 'sentiment' not in df.columns:
        df['sentiment'] = 0.5

    # predicted_delta not available: use 0
    df['predicted_delta'] = 0.0

    cond_long = (df['rsi'] < 30) & (df['macdhist'] > 0) & (df['predicted_delta'] > 0.005) & (df['sentiment'] > 0.6)
    cond_short = (df['rsi'] > 70) & (df['macdhist'] < 0) & (df['predicted_delta'] < -0.005) & (df['sentiment'] < 0.4)
    exit_long = (df['rsi'] > 70) | (df['sentiment'] < 0.4)
    exit_short = (df['rsi'] < 30) | (df['sentiment'] > 0.6)

    return {
        'rows': len(df),
        'long_matches': int(cond_long.sum()),
        'short_matches': int(cond_short.sum()),
        'exit_long': int(exit_long.sum()),
        'exit_short': int(exit_short.sum())
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--file', required=True)
    args = p.parse_args()
    df = load_data(args.file)
    counts = compute_counts(df)
    print('Scanned:', args.file)
    for k, v in counts.items():
        print(f"{k}: {v}")


if __name__ == '__main__':
    main()
