# Migration record

The vanilla JavaScript/Cloudflare prototype was replaced incrementally to keep
the application usable throughout the rewrite.

Completed sequence:

1. FastAPI workspace contract, owner isolation and revision conflicts.
2. React/Vite shell and typed API client.
3. Tasks, Calendar, Habits, Notes, Projects/Goals and Finance.
4. Weekly Review, Islam workspace, Settings and JSON data tools.
5. RU/EN interface, search, reminders, PWA shell and deletion undo.
6. PostgreSQL/Alembic, Docker/Nginx and GitHub Actions.
7. Removal of the legacy runtime after parity tests passed.

The Git history preserves every migration stage and the removed prototype.
