# AGENTS.md

Operational reference for coding agents (Claude Code, OpenCode, Cursor, etc.).
Conceptual background lives in `docs/` — this file contains commands, paths, and IDs.

---

## What This Project Is

An AI-assisted web application to help users managing their garden, keep track of tasks, and to
understand why certain tasks are required.

---

## Read Before Implementing

| File | Why |
|---|---|
| `docs/docs/doc-001 - Backlog-Usage-Guide.md` | Instructions on how to use the backlog.md tool for task management |
| `docs/docs/doc-002 - Contributing.md` | Ticket workflow, story format, commit conventions — applies to AI too |

## Running the System

## Key Paths

## Tests

## GitHub CLI

Always pass `--repo stueble/gf-risk-system` explicitly — `gh` won't find it otherwise.

```bash
gh api repos/stueble/gf-risk-system/issues/<NR>
gh issue list --repo stueble/gf-risk-system
gh pr create --repo stueble/gf-risk-system --title "..." --body "..."
```

### Setting Ticket Status (GraphQL)

Status lives in the **Risk Assessment Board** (GitHub Projects), not the issue body.

```bash
# Step 1: fetch item ID for the ticket (always fresh — never reuse from another ticket)
gh api graphql -f query='
{
  repository(owner: "stueble", name: "gf-risk-system") {
    issue(number: <NR>) {
      projectItems(first: 5) { nodes { id project { id } } }
    }
  }
}'

# Step 2: set status
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwHOA_QDis4BVqQD"
    itemId: "<ITEM_ID>"
    fieldId: "PVTSSF_lAHOA_QDis4BVqQDzhREkbc"
    value: { singleSelectOptionId: "<OPTION_ID>" }
  }) { projectV2Item { id } }
}'
```

| Status | Option ID |
|---|---|
| Backlog | `f75ad846` |
| Ready | `61e4505c` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |

Project ID: `PVT_kwHOA_QDis4BVqQD` · Status field ID: `PVTSSF_lAHOA_QDis4BVqQDzhREkbc`

**AI must not move tickets from "In review" to "Done".**

---

## Implementation Guidelines

### Before starting

> Describe in 2–3 sentences how you would approach this task.  
> Is there a simpler alternative — even one that touches code outside the ticket scope?  
> If yes: propose it and wait for confirmation before proceeding.

### Principles

**Prefer the simplest working solution.** Avoid abstractions, patterns, and indirection
that aren't immediately necessary. If complexity exists, be able to justify it explicitly.

**Start minimal, iterate.** Implement the smallest version that satisfies the
acceptance criteria first. Extend only when the minimal version is confirmed.

**Change existing structures when that simplifies the solution.** Don't work around
something awkward — fix it and flag it. Local optimization within a bad structure
is not desired.

**Propose alternatives.** When multiple approaches exist, name them briefly with
tradeoffs. Pick the simplest unless there's a concrete reason not to.

### After implementing

Actively look for things to simplify before moving to "In review":
- Dead code, redundant checks, unnecessary indirection
- Anything you implemented awkwardly because you assumed it was out of scope — flag it now

### Tests

Write at least one test per implementation — see [Tests](#tests) for where and how.
Cover edge cases and error paths, not just the happy path.

### Process

All process rules (story format, commit conventions, status transitions) are in
`docs/contributing.md`. They apply to AI agents as well.
