# Build stage — install deps without source for better layer caching
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

# Install dependencies first (cached unless pyproject.toml/uv.lock changes)
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --no-install-project

# Runtime stage
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

# Copy venv from builder
COPY --from=builder /app/.venv ./.venv

# Copy project files
COPY pyproject.toml uv.lock* ./
COPY src ./src
COPY alembic ./alembic
COPY alembic.ini ./
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh

# Install project in editable mode into the existing venv
RUN uv sync --no-dev

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
