---
id: decision-009
title: ADR-009 - Tech Stack
date: '2026-05-04'
status: Accepted
---

## Context

The application is a single-user, on-premise web app deployed via Docker. The
tech stack must satisfy the following constraints:

- TypeScript throughout (see ADR-007)
- SQL database support for SQLite and PostgreSQL (see ADR-008)
- Open-source, permissive licenses only
- Deployable as a Docker container without external service dependencies
- Small enough to remain maintainable for a single developer or AI-assisted
  implementation

## Decision

### Frontend

| Component | Technology | Rationale |
|---|---|---|
| Framework | React + TypeScript | Industry standard; best AI code generation support |
| Build tool | Vite | Fast dev server and build; replaces Create React App |
| UI components | shadcn/ui | Radix UI (accessible, headless) + Tailwind; components copied into project for full control |
| Styling | Tailwind CSS | Utility-first; no separate CSS files needed |

### Backend

| Component | Technology | Rationale |
|---|---|---|
| Server framework | Hono | Lightweight, TypeScript-first; simpler than NestJS, more modern than Express |
| Validation | Zod | Runtime validation of all API inputs; enables OpenAPI generation for future mobile client (see ADR-007) |
| ORM | Drizzle | TypeScript-first schema definition; lightweight; supports SQLite and PostgreSQL with a single connection config change |
| Database | SQLite (v1) → PostgreSQL (future) | SQLite for zero-dependency on-premise install; Drizzle abstracts the switch to PostgreSQL |

### Deployment

| Component | Technology | Rationale |
|---|---|---|
| Containerization | Docker | On-premise, self-hostable; single docker-compose.yml for the full stack |
| Persistence | Docker Volume | SQLite file and attachment directory mounted as a volume; survives container restarts |

### Monorepo Tooling

| Component | Technology | Rationale |
|---|---|---|
| Package manager | pnpm | Native workspace support; avoids hoisting issues; faster installs than npm; single `pnpm-workspace.yaml` to declare packages |

## Consequences

- TypeScript is required for both frontend and backend — no language boundary
  between client and server.
- Drizzle schema migrations are generated automatically from schema changes —
  no manual SQL migrations needed.
- Switching from SQLite to PostgreSQL requires only a change to the
  `DATABASE_URL` environment variable and the Drizzle connection config.
- shadcn/ui components are copied into the project at install time — updates
  are applied manually per component, not via a package upgrade.
- TanStack Query is explicitly excluded — state management is handled via
  React's built-in useState/useEffect for simplicity, given the app's small
  scope and single root API call (getGarden).
- All components are open-source with MIT or Apache 2.0 licenses.
- pnpm workspaces manage the monorepo — `pnpm install` at the root installs all
  packages; individual packages are run with `pnpm --filter frontend ...` or
  `pnpm --filter backend ...`.
