# Migration to FastAPI and React

The migration is intentionally incremental. The existing application remains
the reference implementation until every acceptance criterion has moved.

## Chosen stack

- `frontend/`: React, TypeScript and Vite.
- `backend/`: Python 3.12, FastAPI, SQLAlchemy and Alembic.
- Production persistence: PostgreSQL.
- Local persistence: SQLite for a zero-setup developer experience.
- Redis and a worker are deferred until server-side reminders exist.

Next.js is not needed for this private workspace: there are no public pages that
benefit from SEO or server rendering, and FastAPI already owns the server API.

## Safe migration order

1. Run FastAPI with the current versioned workspace contract.
2. Add the Vite/React shell, typed API client, routing and shared design tokens.
3. Move Today and Tasks, then Calendar/Habits, Notes/Projects/Goals, Finance,
   Review, Islam and Settings. Keep parity tests for each moved module.
4. Normalize the JSON document into owner-scoped PostgreSQL tables and import
   existing exports transactionally while preserving IDs and money minor units.
5. Switch production traffic only after end-to-end tests cover authentication,
   revision conflicts, import/export and the product acceptance criteria.
