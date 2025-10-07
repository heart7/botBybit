## Contributing

Thanks for considering contributing! A few quick guidelines:

- Open an issue first to discuss larger changes.
- Fork the repo and create a feature branch.
- Keep changes focused and add tests for new behaviour.
- Run tests locally: `.venv\Scripts\python.exe -m pytest -q`.
- Ensure no secrets are committed (use `.env` or GitHub Secrets for keys).

Development setup
 - Use the provided setup scripts to create a venv and install dev requirements:
	 - PowerShell: `.\scripts\setup-dev.ps1 -PythonPath "C:\\Python312\\python.exe"`
	 - Bash: `PYTHON=/usr/bin/python3 ./scripts/setup-dev.sh`
 - The setup script will run `pre-commit install` to enable hooks (ruff auto-formatting).

When submitting a PR, include a short description and link to any related issues.
