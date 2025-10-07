import os
import json

from pathlib import Path


def load_config(path: str = None) -> dict:
    """Load config.json and override key/secret with environment variables if present.

    Returns a dict of the merged configuration.
    """
    base = Path(path or Path(__file__).parent / 'config.json')
    with open(base, 'r', encoding='utf-8') as f:
        cfg = json.load(f)

    # Override from env
    ex = cfg.get('exchange', {})
    ex_name = os.getenv('EXCHANGE_NAME')
    if ex_name:
        ex['name'] = ex_name

    ex_key = os.getenv('EXCHANGE_KEY')
    if ex_key:
        ex['key'] = ex_key

    ex_secret = os.getenv('EXCHANGE_SECRET')
    if ex_secret:
        ex['secret'] = ex_secret

    cfg['exchange'] = ex
    return cfg


if __name__ == '__main__':
    import pprint
    pprint.pprint(load_config())
