import os
import json
import argparse

from pathlib import Path


def load_config(path: str = None) -> dict:
    """Load config.json and override keys with environment variables if present.

    Returns a dict of the merged configuration.
    """
    base = Path(path or Path(__file__).parent / 'config.json')
    with open(base, 'r', encoding='utf-8') as f:
        cfg = json.load(f)

    # Override from env
    ex = cfg.get('exchange', {}) or {}
    ex_name = os.getenv('EXCHANGE_NAME')
    if ex_name:
        ex['name'] = ex_name

    ex_key = os.getenv('EXCHANGE_KEY')
    if ex_key:
        ex['key'] = ex_key

    ex_secret = os.getenv('EXCHANGE_SECRET')
    if ex_secret:
        ex['secret'] = ex_secret

    # Preserve existing pair whitelist and ccxt_config if present
    cfg['exchange'] = {**ex}
    return cfg


def write_runtime_config(out_path: str = 'config.runtime.json', src_path: str = None) -> Path:
    """Write a merged runtime config to out_path and return the path.

    This file can be passed to freqtrade's --config argument to avoid putting secrets in the repo.
    """
    cfg = load_config(src_path)
    out = Path(out_path)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2)
    return out


def main():
    ap = argparse.ArgumentParser(description='Write runtime config merged with ENV vars')
    ap.add_argument('--out', '-o', default='config.runtime.json', help='Output runtime config path')
    ap.add_argument('--src', '-s', default='config.json', help='Source config.json path')
    args = ap.parse_args()
    out = write_runtime_config(args.out, args.src)
    print(f'Wrote runtime config: {out}')


if __name__ == '__main__':
    main()
