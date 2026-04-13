FROM python:3.12-alpine

COPY entrypoint.sh /app/entrypoint.sh
COPY generate_config.py /app/generate_config.py

RUN printf '%s\n' '#!/bin/sh' \
    'echo "Hermes full runtime is not baked into this lightweight setup image yet."' \
    'echo "Add the required Google Workspace and Algolia credentials, then switch to the full Hermes build pipeline."' \
    'exit 1' > /usr/local/bin/hermes \
    && chmod +x /usr/local/bin/hermes \
    && chmod +x /app/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
