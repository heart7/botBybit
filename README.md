# autolfow_Bot

This folder holds configuration for an automated trading bot.

Files:

- `config.json` - Exchange and strategy configuration. Replace `YOUR_API_KEY` and `YOUR_SECRET` with real credentials or use environment variables/secrets management.

Security:

- Never commit secrets to version control. Use environment variables or a secrets manager when running the bot.

Quick start (Windows PowerShell):

1. Copy `.env.example` to `.env` and fill in your keys, or set the environment variables in your shell:

```powershell
copy .env.example .env
$env:EXCHANGE_KEY = 'your_api_key_here'
$env:EXCHANGE_SECRET = 'your_api_secret_here'
```

2. Create a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

3. Run the smoke test to ensure the strategy imports correctly:

```powershell
python run_smoke.py
```

If the import fails, check that `freqtrade` and the `freqai` extension (plus TensorFlow) are installed.
