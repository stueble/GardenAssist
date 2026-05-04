---
id: decision-006
title: "ADR-006 - Panel Layout Order: Main View → Dialog → Assistant"
date: '2026-05-03'
status: Accepted
---

## Context

The application has three competing areas that may be visible simultaneously in the
body of any view: the main content (e.g. plant list, timeline, garden plan), a context
dialog (e.g. new/edit entry, plant edit dialog), and the AI assistant panel.

Two layout orders were considered:

**Option A — Dialog left, assistant right (rejected):**
The dialog slides in from the left, pushing the main content to the right. The
assistant strip stays fixed on the far right. When the dialog opens, the main content
shifts position.

**Option B — Main left, dialog center, assistant right (accepted):**
The main content occupies the left and center. When a dialog opens, it appears to
the right of the main content. The assistant strip stays fixed on the far right, and
opens to the left of itself. The order from left to right is always:
Main View → Dialog (when open) → Assistant (when open).

## Decision

All views follow the fixed left-to-right panel order:

1. **Main view** (always leftmost, `flex: 1`) — the primary content of the view
   (timeline, plant list, garden plan, calendar). Always visible, never displaced.
2. **Context dialog** (center-right, fixed width, hidden by default) — any panel
   that requires user input: new/edit journal entry, plant edit dialog, detail panels.
   Opens by sliding in from the right edge of the main view.
3. **Assistant panel** (rightmost, fixed width, hidden by default) — the AI chat.
   Always opens from the far right, to the right of any open dialog. Represented
   by a narrow vertical strip when closed.

The main view shrinks as panels open (it loses flex space to the right), but it does
not shift its left edge. Dialogs and the assistant can be open simultaneously —
they are not mutually exclusive.

The FAB (floating action button), if present, is hidden while its associated dialog
is open, and re-appears when the dialog closes.

## Consequences

- The main content area never changes position — only its width changes as panels
  open, which is less disorienting than a lateral shift.
- The assistant is always on the right edge, consistent across all views. Users
  develop spatial muscle memory for its location.
- Dialogs and the assistant can coexist without overlap; the user can consult the
  assistant while filling in a form.
- The layout maps to a natural left-to-right reading flow:
  context → detail → help.
- Panel widths must be carefully balanced so that on narrower screens (e.g. 1280px)
  all three areas remain usable. Responsive behavior for tablet is deferred to v2.
- Views that previously opened dialogs on the left side (Journal new-entry panel,
  Plant Edit Dialog) must be updated to follow this order.
