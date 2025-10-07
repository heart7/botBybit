import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from config_loader import load_config

def main():
    cfg = load_config()
    print('Loaded config exchange:', cfg.get('exchange', {}).get('name'))

    # Try importing strategy module
    try:
        from strategies.ml_grid_strategy import MLGridStrategy
        print('Successfully imported MLGridStrategy')
    except Exception as e:
        print('Failed importing MLGridStrategy:', e)
        raise

    print('Smoke test passed (import only).')


if __name__ == '__main__':
    main()
