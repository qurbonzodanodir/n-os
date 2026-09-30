# n-os

A bilingual personal workspace with a React/TypeScript frontend and a Python
FastAPI backend. The repository contains no personal records or credentials.

## Architecture

- `frontend/` — React 19, TypeScript and Vite.
- `backend/` — Python 3.12, FastAPI, SQLAlchemy and Alembic.
- PostgreSQL in production; SQLite for zero-setup local development.
- Nginx serves the SPA and proxies `/api` to FastAPI.
- Optimistic revisions prevent silent concurrent overwrites.

Redis/Celery is intentionally deferred until server-delivered reminders are
implemented; in-app and installed-PWA reminders do not need a worker.

## Local development

Terminal 1:

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Terminal 2:

```sh
cd frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. The Vite proxy connects to FastAPI and sends the
local-only development identity. Never expose development mode to the internet.

## Production-like deployment

```sh
cp .env.example .env
# Set a strong POSTGRES_PASSWORD and the public origin.
docker compose up --build
```

The container deployment must sit behind an authentication edge that replaces
the trusted `OAI-Authenticated-User-Id` header. Do not expose it directly.

### Deploy, rollback and restore

On the server, `sh scripts/deploy.sh` takes a database backup, pulls `main`,
builds, restarts and checks `/api/v1/ready` through nginx. If the check fails it
returns to the previous commit and images. `sh scripts/restore-check.sh`
restores the newest backup into a throw-away database to prove it is usable.

## Verification

```sh
cd frontend
npm run check        # typecheck, ESLint, Prettier, unit tests
npx playwright test  # end-to-end tests against a real backend (first run: npx playwright install chromium)
cd ../backend
ruff check app migrations tests
pytest -q
```

GitHub Actions runs frontend checks/build/audit, the Playwright suite and backend lint/tests on every
push and pull request.

## Data safety

Export JSON before importing a replacement workspace. Money is stored as
integer minor units. Every workspace is owner-scoped, bounded to 1.5 MB and
protected by revision checks. A stale save returns HTTP 409 instead of replacing
newer data.

The backend retains the latest 50 workspace revisions. Production also runs a
daily compressed PostgreSQL backup with 14-day retention via
`scripts/backup-postgres.sh`; the cron definition is in `deploy/n-os-backup.cron`.

No license has been selected; a public repository does not itself grant an
open-source license.
