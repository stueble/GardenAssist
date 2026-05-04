---
id: decision-008
title: ADR-008 - SQL Relational Database
date: '2026-05-04'
status: Accepted
---

## Context

The application needs a local persistence layer that works on-premise without
any external service dependency (see ADR-004). Options considered:

- **Document store (e.g. JSON files, LevelDB):** Simple for nested objects, but
  lacks query capabilities and referential integrity
- **SQLite:** Embedded relational database, zero external dependencies, single file,
  excellent tooling and ORM support
- **PostgreSQL:** Full relational database, requires a separate server process but
  is already available in many on-premise environments
- **MySQL:** Full relational database; less suitable than PostgreSQL for this use case

## Decision

The application uses a SQL relational database with support for two backends:

- **SQLite** — default for v1; zero external dependencies, single-file database,
  ideal for simple on-premise installs where no existing database server is available
- **PostgreSQL** — supported from v1 as an alternative; recommended when the user
  already runs a PostgreSQL server on-premise

The active backend is selected via the `DATABASE_URL` environment variable. The
ORM (Drizzle, see ADR-009) abstracts the difference — no application code changes
are required when switching between backends.

The database model is intentionally different from the API model:
- The API delivers assembled, nested objects (e.g. Plant with positions[], schedules[])
- The database stores normalized, flat tables with foreign keys
- Derived data (e.g. tasks) is never persisted — computed at query time
- The mapping between DB rows and API objects is the responsibility of the
  backend service layer

## Consequences

- Referential integrity is enforced at the database level (foreign keys).
- Complex queries (e.g. task derivation, journal lookups) benefit from SQL joins.
- The ORM schema becomes the authoritative source for the database structure —
  migrations are generated from schema changes.
- SQLite's single-file nature simplifies backup and restore for simple installs
  (see Settings → Daten & Backup).
- PostgreSQL users can leverage their existing infrastructure and tooling for
  backup, replication, and monitoring.
- Switching between SQLite and PostgreSQL requires only a change to the
  `DATABASE_URL` environment variable — no code changes needed.
