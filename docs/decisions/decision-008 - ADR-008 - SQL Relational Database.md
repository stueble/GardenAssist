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
- **PostgreSQL / MySQL:** Full relational databases, but require a separate server
  process — incompatible with a simple on-premise install

## Decision

The application uses a SQL relational database. SQLite is the expected implementation
for v1 due to its zero-dependency, single-file nature which aligns well with the
on-premise, self-hostable deployment model (see ADR-004).

The database schema is defined using an ORM (Drizzle or Prisma) to maintain
type-safety between the database layer and the TypeScript API spec (see ADR-006).

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
- SQLite's single-file nature simplifies backup and restore (see Settings →
  Daten & Backup).
- If the app is later scaled to a multi-user or cloud deployment, migrating from
  SQLite to PostgreSQL is straightforward with Drizzle/Prisma.
