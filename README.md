# autolfow_Bot

[![CI](https://github.com/heart7/botBybit/actions/workflows/ci.yml/badge.svg)](https://github.com/heart7/botBybit/actions/workflows/ci.yml)

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

FreqAI configuration
--------------------

The strategy supports optional integration with `freqai` (an ML add-on). The ML features are disabled by default to avoid requiring heavy ML dependencies. To enable and tune the ML model, add the following to your `config.json`.

Example (top-level + strategy-scoped overrides):

```json
{
	"freqai_enabled": true,
	"freqai_model_parameters": {
		"epochs": 50,
		"batch_size": 16,
		"optimizer": "adam",
		"loss": "mse",
		"metrics": ["mae"],
		"layers": [
			{"type": "MultiHeadAttention", "num_heads": 4, "key_dim": 32},
			{"type": "Dense", "units": 32, "activation": "relu"},
			{"type": "Dense", "units": 1}
		]
	},
	"strategy_config": {
		"MLGridStrategy": {
			"freqai_enabled": true,
			"freqai_model_parameters": {
				"epochs": 25
			}
		}
	}
}
```

Notes:
- `freqai_enabled`: enable ML features (requires `freqai` and TensorFlow installed).
- `freqai_model_parameters`: merged with strategy defaults; you can override specific keys (e.g. `epochs`) at top-level or for the named strategy under `strategy_config`.
- If you enable `freqai` but the ML dependencies are missing, the strategy will skip ML features and keep running (it logs the resolved settings on startup).

If you want help selecting model layers or training parameters, tell me your target latency and model complexity and I can suggest conservative defaults.

Bybit testnet and .env (recommended)
----------------------------------

1. Create Bybit testnet API keys:
	- Visit https://testnet.bybit.com/ and log in (or create an account).
	- Go to "API Management" and create a new API key for trading; restrict it to "Trade" only (no withdrawals).
	- Copy the API Key and Secret; keep the secret in a secure place.

2. Use a local `.env` file (never commit this file):
	- Copy `.env.example` to `.env` and fill `EXCHANGE_KEY` and `EXCHANGE_SECRET`.
	- The provided PowerShell helper scripts (`scripts/run_backtest.ps1` and `scripts/run_backtest_docker.ps1`) will load `.env` automatically for local runs.

3. Confirm dry-run mode:
	- Ensure `"dry_run": true` is set in `config.json` while testing on testnet.

If you prefer system-level environment variables, set `EXCHANGE_KEY` and `EXCHANGE_SECRET` in your shell instead of using `.env`.
