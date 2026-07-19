#!/bin/sh
set -e

echo "Waiting for postgres..."
until uv run python -c "
import os, psycopg2
psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=os.getenv('DB_PORT', '5432'),
    dbname=os.getenv('DATABASE_NAME', 'taskhorizon'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', ''),
)
" 2>/dev/null; do
  echo "Postgres not ready, retrying in 2s..."
  sleep 2
done
echo "Postgres ready."

echo "Running Alembic migrations..."
uv run alembic upgrade head

echo "Starting TaskHorizon API..."
exec uv run uvicorn taskhorizon.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    ${UVICORN_RELOAD:+--reload}
