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
| Styling | Tailwind CSS v4 | Utility-first; design tokens defined via @theme in CSS, no tailwind.config.ts needed |
| Internationalisation | i18next + react-i18next | De-facto standard for React i18n; TypeScript-first; supports multiple locales via JSON locale files |
| Package manager | pnpm | Faster and more disk-efficient than npm; better monorepo workspace support |

### Backend

| Component | Technology | Rationale |
|---|---|---|
| Server framework | Hono | Lightweight, TypeScript-first; simpler than NestJS, more modern than Express |
| Validation | Zod | Runtime validation of all API inputs; enables OpenAPI generation for future mobile client (see ADR-007) |
| ORM | Drizzle | TypeScript-first schema definition; lightweight; supports SQLite and PostgreSQL with a single connection config change |
| Database | SQLite (default) / PostgreSQL | SQLite for zero-dependency on-premise install; PostgreSQL for users with existing infrastructure; switched via DATABASE_URL |

### Deployment

| Component | Technology | Rationale |
|---|---|---|
| Containerization | Docker | On-premise, self-hostable; single docker-compose.yml for the full stack |
| Persistence | Docker Volume | SQLite file and attachment directory mounted as a volume; survives container restarts |

## Consequences

- TypeScript is required for both frontend and backend — no language boundary
  between client and server.
- Drizzle schema migrations are generated automatically from schema changes —
  no manual SQL migrations needed.
- Switching from SQLite to PostgreSQL requires only a change to the
  `DATABASE_URL` environment variable and the Drizzle connection config.
- shadcn/ui components are copied into the project at install time — updates
  are applied manually per component, not via a package upgrade.
- Tailwind v4 design tokens are defined in CSS via @theme — no tailwind.config.ts.
- TanStack Query is explicitly excluded — state management is handled via
  React's built-in useState/useEffect for simplicity, given the app's small
  scope and single root API call (getGarden).
- All UI text must be wrapped in i18next t() calls — no hardcoded strings in
  JSX. Enum labels are defined in locale JSON files, not in code.
- Initial locale is German (de); English (en) is prepared as a second locale
  from the start. Additional locales can be added without code changes.
- All components are open-source with MIT or Apache 2.0 licenses.
