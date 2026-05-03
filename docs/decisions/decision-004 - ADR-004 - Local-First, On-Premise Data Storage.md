---
id: decision-004
title: ADR-004 - Local-First, On-Premise Data Storage
date: '2026-05-03'
status: Accepted
---

## Context

The app needs a strategy for persisting all user data: garden plan image, plant
records, journal entries, calendar schedules, and settings. Options considered
were cloud-hosted storage, a hybrid approach, and fully local/on-premise storage.

## Decision

The application is designed for local-first, on-premise deployment. All data —
including images, plant records, settings, and journal entries — is stored on the
user's own infrastructure. No data is transmitted to any external service except
for outbound AI API calls initiated explicitly by the user (using their own API key).

The app must be self-hostable and installable without requiring any external account
or cloud dependency.

## Consequences

- No backend-as-a-service, cloud database, or authentication provider is needed.
- The user is responsible for backup and data migration (supported via
  Settings → Daten & Backup).
- Offline functionality is a natural result of this architecture (see ADR-005).
- The tech stack must support local persistence (e.g. local file system, SQLite,
  or similar embedded storage).
- Multi-device sync is out of scope for v1.
