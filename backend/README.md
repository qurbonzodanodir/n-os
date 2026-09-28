# n-os backend

The new backend is a Python 3.12+ FastAPI application. During migration it keeps
the existing versioned workspace-document contract, so the frontend can move to
React screen by screen without losing data. Normalized PostgreSQL resources and
Alembic migrations are the next storage milestone.

## Local development

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

The local-only identity is sent as `X-User-Id`. Production accepts only the
trusted `OAI-Authenticated-User-Id` header from the hosting/authentication layer.
Do not expose development mode to the internet.
