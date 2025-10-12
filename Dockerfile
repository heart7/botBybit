FROM python:3.11-slim AS builder
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/autoflow_Bot
# Copy the entire repository into the build context. Some files (setup.cfg, requirements.txt)
# may be optional; copying the whole repo avoids build-time failures when they are absent.
COPY . /opt/autoflow_Bot

# Create venv and install requirements into it
RUN python -m venv /opt/venv \
  && /opt/venv/bin/python -m pip install --upgrade pip setuptools wheel \
  && if [ -f /opt/autoflow_Bot/requirements.txt ]; then /opt/venv/bin/pip install -r /opt/autoflow_Bot/requirements.txt; fi

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
