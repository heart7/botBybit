FROM python:3.11-slim AS builder
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/autoflow_Bot
# Copy the entire repository into the build context. Some files (setup.cfg, requirements.txt)
# may be optional; copying the whole repo avoids build-time failures when they are absent.
COPY . /opt/autoflow_Bot

# Copy .env file (if you choose to include it in the image)
COPY .env /opt/autoflow_Bot/.env

# Create venv and install requirements into it
RUN python -m venv /opt/venv \
  && /opt/venv/bin/python -m pip install --upgrade pip setuptools wheel \
  && if [ -f /opt/autoflow_Bot/requirements.txt ]; then /opt/venv/bin/pip install -r /opt/autoflow_Bot/requirements.txt; fi

### Runtime stage: copy venv and minimal files
FROM python:3.11-slim AS runtime
ENV PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/autoflow_Bot
# Copy project files and venv from builder
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /opt/autoflow_Bot /opt/autoflow_Bot

# Copy entrypoint and make executable
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

VOLUME ["/opt/autoflow_Bot/user_data"]

ENV FREQTRADE_CONFIG_PATH=/opt/autoflow_Bot/config.json

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD []

from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file

TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')
TELEGRAM_API_KEY = os.getenv('TELEGRAM_API_KEY')
