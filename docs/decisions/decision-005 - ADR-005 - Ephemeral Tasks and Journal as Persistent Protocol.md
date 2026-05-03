---
id: decision-005
title: ADR-005 - Ephemeral Tasks and Journal as Persistent Protocol
date: '2026-05-03'
status: Accepted
---

## Context

The app needs to track what care activities are due, and maintain a history of what
was actually done. Two approaches were considered: persisting tasks as standalone
objects (like a to-do database), or deriving tasks dynamically from plant schedules.

## Decision

**Tasks are ephemeral** — they are calculated on the fly from plant care schedules
for the current time window. Tasks are never stored as independent objects in the
database.

**The Journal is the persistent protocol** — every outcome (done, skipped, or manual
observation) is recorded as a journal entry. Completed and skipped tasks are
automatically converted into journal entries. Manual entries can be added freely.

Journal entries optionally reference the schedule that triggered them.

The AI assistant can propose journal entries, which the user confirms via
"In Journal übernehmen" before they are persisted.

## Consequences

- The data model requires only Schedules and Journal Entries — no separate Task entity.
- The task list (dashboard) is always derived from schedules and the journal (tasks
  with no journal entry in the current period = open).
- Skipped tasks must produce a journal entry to prevent them from reappearing.
- Deleting a schedule does not delete historical journal entries.
- Journal entries carry a type: `manual` | `done` | `skipped` | `ai-suggested` (before confirmation).
