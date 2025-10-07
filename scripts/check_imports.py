import re
from pathlib import Path
import sys
import subprocess

ROOT = Path(__file__).resolve().parents[1]
# Ensure project root is importable so local modules (config_loader, strategies) can be imported
sys.path.insert(0, str(ROOT))

py_files = list(ROOT.glob('**/*.py'))
# exclude venv and hidden dirs
py_files = [p for p in py_files if '.venv' not in str(p) and 'site-packages' not in str(p)]

import_pattern = re.compile(r'^(?:from|import)\s+([\w\.]+)', re.M)

modules = set()
for p in py_files:
    try:
        text = p.read_text(encoding='utf-8')
    except Exception:
        continue
    for m in import_pattern.findall(text):
        root = m.split('.')[0]
        # ignore local relative imports like 'strategies'
        if root in ('from', 'import'):
            continue
        modules.add(root)

ignore = {'os', 'sys', 're', 'json', 'logging', 'datetime', 'pathlib', 'typing', 'math', 'random', 'time'}
modules = sorted([m for m in modules if m not in ignore])

print('Found modules to check:', modules)

ok = []
fail = []
for m in modules:
    try:
        __import__(m)
        ok.append(m)
    except Exception as e:
        fail.append((m, str(e)))

print('\nImport results:')
for m in ok:
    print(f'  OK   - {m}')
for m, e in fail:
    print(f'  FAIL - {m}: {e}')

print('\nSuggested next steps:')
if fail:
    print('  - Install missing packages via pip (use the project venv):')
    for m, _ in fail:
        print(f'      .venv\\Scripts\\pip.exe install {m}')
    print('  - Or add the missing names to requirements.txt and run pip install -r requirements.txt')
else:
    print('  - All imports resolved in the current environment.')

print('\nEnvironment:')
try:
    out = subprocess.check_output([str(ROOT / '.venv' / 'Scripts' / 'python.exe'), '--version'], stderr=subprocess.STDOUT, text=True)
    print('  Python:', out.strip())
except Exception:
    print('  Python: (venv python not found)')
