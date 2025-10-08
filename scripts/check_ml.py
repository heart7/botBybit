#!/usr/bin/env python3
"""Check ML dependencies (freqai, tensorflow) and print results.

Usage:
  python scripts/check_ml.py
"""
import importlib

def check(pkg):
    try:
        mod = importlib.import_module(pkg)
        return True, getattr(mod, "__version__", "(no __version__)")
    except Exception as e:
        return False, str(e)

def main():
    for pkg in ("freqai", "tensorflow"):
        ok, info = check(pkg)
        if ok:
            print(f"{pkg}: OK ({info})")
        else:
            print(f"{pkg}: MISSING / ERROR -> {info}")

if __name__ == "__main__":
    main()
