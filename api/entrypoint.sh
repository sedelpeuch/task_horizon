#!/bin/sh
set -e

echo "Running Alembic migrations..."
uv run alembic upgrade head

echo "Starting TaskHorizon API..."
exec uv run uvicorn taskhorizon.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    ${UVICORN_RELOAD:+--reload}
