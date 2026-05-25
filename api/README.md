# TaskHorizon API

## Development

```bash
pip install -e ".[dev]"
pytest
ruff check .
```

## Run

```bash
uvicorn taskhorizon.main:app --reload
```

Open http://localhost:8000/docs for API documentation

## Build

```bash
docker build -t taskhorizon-api .
docker run -p 8000:8000 taskhorizon-api
```
