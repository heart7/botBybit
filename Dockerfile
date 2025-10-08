### Builder stage: install dependencies into a venv
FROM python:3.12-slim as builder
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/autoflow_Bot
COPY requirements.txt setup.cfg pyproject.toml* /opt/autoflow_Bot/ 2>/dev/null || true
COPY requirements-dev.txt /opt/autoflow_Bot/ 2>/dev/null || true
COPY . /opt/autoflow_Bot

# Create venv and install requirements into it
RUN python -m venv /opt/venv \
  && /opt/venv/bin/python -m pip install --upgrade pip setuptools wheel \
  && if [ -f requirements.txt ]; then /opt/venv/bin/pip install -r requirements.txt; fi

### Runtime stage: copy venv and minimal files
FROM python:3.12-slim
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
