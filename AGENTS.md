# AGENTS.md

Operational reference for coding agents (OpenCode, Claude Code, Cursor, etc.).
Conceptual background lives in `docs/` — this file contains commands, paths, and conventions.

---

## What This Project Is

An AI-assisted web application for garden management. Stack: React + TypeScript + Vite (frontend),
Hono + Drizzle + SQLite (backend), deployed via Docker. Monorepo with pnpm workspaces.
**Scaffolding complete (stories 011–020 done). Active feature development in progress.**

---

## Read Before Implementing

| File | Why |
|---|---|
| `docs/docs/doc-001 - 001-Contributing.md` | Ticket workflow, story format, commit conventions |
| `docs/docs/doc-002 - 002-Backlog-Usage-Guide.md` | How to use the `backlog` CLI — critical, read fully |
| `docs/api/*.ts` | Authoritative API contract (TypeScript types, not yet implemented) |

---

## Task Management (backlog CLI)

All tasks live in `docs/tasks/` as `task-NNN - Title.md`. **Never edit these files directly.**
All operations go through the `backlog` CLI.

```bash
backlog task list --plain                    # list all tasks
backlog task list -s "Ready" --plain         # filter by status
backlog task 11 --plain                      # view a single task
backlog search "auth" --plain                # fuzzy search
```

### Workflow when starting a task

```bash
# 1. Mark in progress and assign yourself
backlog task edit 11 -s "In Progress" -a @agent

# 2. Write an implementation plan, share it with the user, and wait for approval
backlog task edit 11 --plan $'1. Step one\n2. Step two'

# 3. As you work, check off ACs and append notes
backlog task edit 11 --check-ac 1 --check-ac 2
backlog task edit 11 --append-notes $'- Did X\n- Found Y'

# 4. Add a final summary (PR description) when done
backlog task edit 11 --final-summary "What changed, why, tests run"

# 5. Move to In Review — AI must NOT move to Done
backlog task edit 11 -s "In Review"
```

**Do not begin coding until the user approves the implementation plan.**

### Status rules

| Status | Who transitions |
|---|---|
| Ready → In Progress | Agent, when starting |
| In Progress → In Review | Agent, when complete |
| In Review → Done | Human only |

---

## Commit Convention

Every commit must reference its ticket:

```
Short description of the change (#11)

Optional longer explanation.
```

---

## Key Paths

| Path | Contents |
|---|---|
| `docs/api/*.ts` | TypeScript API types — source of truth for the data model |
| `docs/tasks/` | All user stories (managed via `backlog` CLI) |
| `docs/docs/` | Project documentation |
| `docs/decisions/` | Architectural Decision Records (ADR-001 through ADR-009) |
| `docs/drafts/` | Draft stories not yet accepted |
| `ui-mockups/` | UI mockup files |
| `apps/backend/src/services/` | Business logic (garden, settings, tasks) |
| `apps/backend/src/routes/` | Hono route handlers |
| `apps/backend/src/db/` | Drizzle schema, migrations, seed |
| `apps/frontend/src/views/` | Page-level view components |
| `apps/frontend/src/components/` | Shared UI components |
| `apps/frontend/src/hooks/` | React hooks (useSettings, etc.) |
| `apps/frontend/src/locales/` | i18n translation files (de/en) |

---

## Architecture Notes

- **Garden is a singleton.** `getGarden()` returns everything in one call — all plants,
  schedules, tasks, attachments, journal entries. Write operations are per-entity.
- **Tasks are derived**, not stored. They are computed from schedules minus resolved
  journal entries (`entry_type: "done"` or `"skipped"`).
- **Monorepo** with `/apps/frontend` and `/apps/backend`, pnpm workspaces.
- **Shared types** in `docs/api/` imported via `@api/*` path alias in both packages.
- SQLite for v1; Drizzle abstracts the switch to PostgreSQL later.
- **i18n:** All UI text via `t()` — no hardcoded strings in JSX. Locale files in `apps/frontend/src/locales/de/` and `en/`. Language stored in localStorage (`ga_language`).
- **Tailwind v4:** Design tokens defined via `@theme` in `index.css` — no `tailwind.config.ts`. Font sizes and layout values use `style={{ ... }}` with CSS variables (Tailwind v4 does not reliably resolve arbitrary font-size classes). Always use `var(--font-display)` etc. inline for typography.
- **UI Mockups:** Always check `ui-mockups/` before implementing a view. Match styles exactly — pixel values, colors, fonts. Deviations need explicit justification.
- **backlog CLI task IDs** use `STORY-NNN` format (e.g. `backlog task edit STORY-016 ...`).

---

## Running the System

```bash
# Install (once)
export PNPM_HOME="/home/stueble/.local/share/pnpm" && export PATH="$PNPM_HOME:$PATH"
pnpm install

# Seed DB (once, or after db:migrate)
pnpm --filter backend db:migrate
pnpm --filter backend db:seed

# Dev servers
pnpm dev:backend    # http://localhost:3000
pnpm dev:frontend   # http://localhost:3110

# Tests + typecheck
pnpm --filter backend test
pnpm --filter frontend test
pnpm --filter backend typecheck
pnpm --filter frontend typecheck

# Kill a stuck port
lsof -ti:3000 | xargs kill -9
```

**Known quirk:** `apps/backend/data/` must exist for static file serving (already committed).
The SQLite DB file (`gardenassist.db`) is created in `apps/backend/` on first run.

---

## Database Migrations

When the Drizzle schema (`apps/backend/src/db/schema.ts`) changes, generate a new migration:

```bash
pnpm --filter backend db:generate   # creates a new SQL file + updates _journal.json
pnpm --filter backend db:migrate    # applies pending migrations to the local DB
```

**Rules:**
- Run `db:generate` with the correct system time. The `when` timestamp in `_journal.json`
  is set automatically by drizzle-kit — **never edit it manually**.
- Commit the generated `.sql` file **and** the updated `_journal.json` before pushing.
- If `_journal.json` timestamps are wrong (e.g. hardcoded or lower than earlier entries),
  Drizzle silently skips migrations — the backend starts but crashes on the first DB query.
- AC #4 (task-091): `db:generate` was intentionally skipped because the schema is unchanged
  since migration 0006. Running it on an unchanged schema produces no output.

---

## Implementation Guidelines

### Before starting

Describe in 2–3 sentences how you would approach the task. Is there a simpler alternative —
even one that touches code outside the ticket scope? If yes: propose it and wait for confirmation.

If the task feels large or touches multiple concerns, consider splitting it into smaller tasks
first. Propose the breakdown to the user before starting.

### Principles

- **Prefer the simplest working solution.** Justify any complexity explicitly.
- **Start minimal, iterate.** Smallest version satisfying ACs first.
- **Change awkward structures** rather than working around them — flag it.
- **No native TypeScript `enum`s.** Use `const` objects instead (ADR-007).

### After implementing

Look for dead code, redundant checks, and unnecessary indirection before moving to In Review.

### Tests

Write at least one test per implementation. Cover edge cases and error paths, not just happy path.
Tests should verify that the implementation fulfils its purpose — not that the code does what it does.
Test behaviour and outcomes, not implementation details.
