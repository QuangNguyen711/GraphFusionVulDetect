FROM python:3.12-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt-get update && apt-get install -y --no-install-recommends

WORKDIR graphfusion


COPY uv.lock pyproject.toml .python-version ./
RUN uv sync

COPY src ./src
COPY ge-sc-artifacts/ ./ge-sc-artifacts/

CMD ["uv", "run", "src.main"]