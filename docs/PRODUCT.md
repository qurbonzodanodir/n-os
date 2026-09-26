# n-os specification update 2.0

This update supplements the original product and architecture specifications. The immediate release is a private, server-backed web prototype with public source code. The long-term target remains a modular production application. Original uploaded Word documents remain unchanged.

## Acceptance criteria

1. Liquid Glass styling applies to navigation, surfaces, dialogs, forms and all module views. Main content remains readable; reduced transparency and reduced motion are supported. Mobile navigation exposes all sections through More.
2. Russian is the default. All UI labels, error messages, empty states, date displays and money formats support Russian and English. User-entered text is never translated automatically.
3. Today uses the configured timezone, not a hard-coded demo date. Due dates are local calendar dates; the current event editor stores local wall time in the workspace timezone.
4. Task completion updates the dashboard and weekly review. Recurring tasks create one successor when completed. Reopening and completing again must not create another successor. Cancellation does not count as completion.
5. Habits use date-keyed completions and selected weekdays. Future dates cannot be checked in. Current and best streaks are derived, not seed values.
6. Calendar supports month/week/day/agenda, dated navigation, task deadlines and repeating events. Editing a recurring event edits the series. Per-occurrence exceptions and cross-timezone events remain future work.
7. Notes support folders, tags, archive, pinning and a safe basic Markdown preview. Unsupported formatting is displayed as text. Uploaded files are not supported in this release.
8. Goals aggregate linked tasks and milestone completion. Projects show linked tasks, notes and events. Deleting a container unlinks records rather than deleting their content.
9. Financial amounts use integer minor units. Each account has a currency. Transfers require two distinct accounts in the same currency, and must not inflate income or expense totals. Currency totals are never summed across currencies.
10. Weekly statistics use real records and the configured first weekday. Reflections are stored per week.
11. Server writes require the current authenticated owner and a matching revision. Missing identity returns 401. A stale revision returns 409. Failed saves retain the edited data and offer retry/export.
12. Destructive actions require in-app confirmation and allow immediate undo. Import replaces a workspace only after an explicit confirmation; export is offered before replacement.

## Clarifications to the original documents

- Keep core modules and later infrastructure milestones distinct. UI completeness does not imply that the production Python architecture has shipped.
- Push/email/Telegram reminders require background delivery, retry and duplicate-prevention rules. This release shows in-app reminders and says so explicitly.
- Specify recurrence timezone, month-end behavior and exception handling before expanding scheduling. Monthly recurrence clamps to the last available day.
- Specify backup retention, recovery targets and restore procedures before treating the system as a production source of critical data. User JSON export exists; scheduled verified database backups are not configured here.
- Define financial corrections, transfers, currency conversion and rounding independently of visual charts. Automatic exchange rates and recurring financial entries remain future work.
- Preserve reference documents and user records outside the public repository. A public source repository does not authorize public workspace access.

## Remaining production milestones

Next.js/TypeScript frontend migration; FastAPI/PostgreSQL API; registration and account recovery; structured relational schema and Alembic migrations; Redis/Celery reminders; integration tests for auth and background workers; operational backups and monitoring; PWA/offline conflict resolution; third-party calendar integrations; AI permissions and audit logs.
