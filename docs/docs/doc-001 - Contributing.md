---
id: doc-001
title: Contributing
type: other
created_date: '2026-05-02 13:55'
updated_date: '2026-05-02 14:26'
---
# Contributing

Process rules for everyone working on this project — developers and AI agents alike.
AI agents: also read `AGENTS.md` for operative commands and implementation guidelines.

## User Stories

User stories are managed exclusively as backlogmd tasks. Also read `docs/docs/doc-001 - Backlog-Usage-Guide.md`
— the issue is the single source of truth.

### Issue structure

```
**Area:** {Dashboard | Chat | Backend | Infrastructure | …}
**Date:** {YYYY-MM-DD}

---

**As a** {role}
**I want to** {goal}
**so that** {benefit}.

## Acceptance Criteria

- …

## Technical Notes

- …

## Dependencies

- …
```

---

## Ticket Workflow

All work on this project — by developers or AI — must be tied to a ticket,
ideally a user story ticket.

### Status rules

User stories of state `Draft` are located in `docs/drafts/`. Once accepted by the user, 
they will be promoted and moved into  `docs/tasks/`. Tasks can have the following
states

| Status | Meaning |
|---|---|
| **Ready** | Ready to work on — all dependencies resolved |
| **In Progress** | Actively being worked on |
| **In review** | Implementation complete, awaiting sign-off by user |
| **Done** | Accepted and closed |

### Flow

1. Only work on tickets in **Ready** status.
2. Move to **In Progress** as soon as work begins.
3. Move to **In Review** once the implementer considers it done.
4. **AI must not move tickets from "In review" to "Done".** That decision belongs to a human.

---

## Git Commits

Every commit must reference its ticket:

```
Short description of the change (#<issue-number>)

Longer explanation if needed.
```

Example: `Risk Analyst: initial risk analysis after assessment (#8)`
