# Production optimized backend dockerfile
FROM python:3.12-slim-trixie

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy uv from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /graphfusion

# Copy dependency files
COPY uv.lock pyproject.toml ./
RUN uv sync --frozen --no-dev

# Copy application code
COPY src ./src
COPY core ./core
COPY ge-sc-artifacts/ ./ge-sc-artifacts/

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /graphfusion
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uv", "run", "src.main"]
