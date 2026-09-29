# Architecture

## Runtime

The Vite-built React SPA calls FastAPI under `/api/v1`. FastAPI validates the
schema, resolves the authenticated owner at the trusted proxy boundary and uses
an async SQLAlchemy repository. Alembic owns database migrations. PostgreSQL is
the production database and SQLite is the local development fallback.

Nginx serves immutable frontend assets, falls back to `index.html` for client
navigation and proxies API requests. Docker Compose supplies PostgreSQL,
FastAPI and Nginx as independent services.

## Persistence boundary

Each owner currently has one schema-versioned workspace document. The document
contract preserves transactional import/export, stable IDs and atomic optimistic
revision checks while the resource schema evolves. It is bounded to 1.5 MB and
3,000 records per collection. Financial amounts are integer minor units.

This boundary is deliberate: normalization should happen behind repositories
without requiring another frontend rewrite. High-volume histories will require
owner-scoped resource tables and pagination before raising these bounds.

## Authentication boundary

Production accepts only the trusted `OAI-Authenticated-User-Id` header supplied
by the hosting authentication edge. `X-User-Id` works only in development.
Container ports must not be publicly exposed without an authentication proxy
that overwrites the trusted header.

## Deferred infrastructure

Redis and Celery are not runtime dependencies yet. Add them when reminders are
delivered by the server and require retries, scheduling and deduplication. Event
occurrence exceptions, external calendars, verified scheduled backups and full
offline conflict resolution remain separate production milestones.
