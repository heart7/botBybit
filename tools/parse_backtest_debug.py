"""Parse user_data/backtest_debug.log for debug markers added to MLGridStrategy.

Usage: python tools/parse_backtest_debug.py [path/to/user_data/backtest_debug.log]
"""
import re
import sys
from collections import defaultdict

LOG_PATTERNS = {
    'indicators': re.compile(r"Indicators \(last row\) - rsi=(.*), macdhist=(.*), sentiment=(.*)"),
    'entry_long': re.compile(r"populate_entry_trend: (\d+) long conditions matched"),
    'entry_short': re.compile(r"populate_entry_trend: (\d+) short conditions matched"),
    'sample_long': re.compile(r"populate_entry_trend: sample long indices: (\[.*\])"),
    'sample_short': re.compile(r"populate_entry_trend: sample short indices: (\[.*\])"),
    'exit_counts': re.compile(r"populate_exit_trend: exit_long=(\d+), exit_short=(\d+)")
}


def parse_log(path):
    stats = defaultdict(int)
    samples = {}
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            m = LOG_PATTERNS['indicators'].search(line)
            if m:
                stats['indicators_logged'] += 1
                continue
            m = LOG_PATTERNS['entry_long'].search(line)
            if m:
                stats['total_long_matches'] += int(m.group(1))
                stats['entry_long_logged'] += 1
                continue
            m = LOG_PATTERNS['entry_short'].search(line)
            if m:
                stats['total_short_matches'] += int(m.group(1))
                stats['entry_short_logged'] += 1
                continue
            m = LOG_PATTERNS['sample_long'].search(line)
            if m:
                samples['sample_long'] = m.group(1)
                continue
            m = LOG_PATTERNS['sample_short'].search(line)
            if m:
                samples['sample_short'] = m.group(1)
                continue
            m = LOG_PATTERNS['exit_counts'].search(line)
            if m:
                stats['exit_long_total'] += int(m.group(1))
                stats['exit_short_total'] += int(m.group(2))
                stats['exit_logged'] += 1
                continue
    return stats, samples


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else 'user_data/backtest_debug.log'
    stats, samples = parse_log(path)
    print('Parsed log:', path)
    for k, v in stats.items():
        print(f"{k}: {v}")
    if samples:
        print('\nSamples:')
        for k, v in samples.items():
            print(f"{k}: {v}")


if __name__ == '__main__':
    main()
