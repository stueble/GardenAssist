---
id: doc-006
title: UX/UI Concept - Garden Calendar
type: other
created_date: '2026-05-03'
updated_date: '2026-05-03'
---

# UI Concept – Garden Calendar

**Version:** 0.1  
**Last updated:** 2026-05-03

---

## 1. Purpose

The Garden Calendar gives the user a seasonal overview of all plants across all 12 months of the year. Rather than a to-do list, this view answers the question "when does what happen?" — bloom times, pruning windows, fertilization periods, and miscellaneous schedules are shown as color-coded bars in a Gantt-style layout. The user can switch between schedule types and find any plant instantly with the search field.

---

## 2. Context & Placement

- **Accessed via:** "Calendar" link in the top navigation
- **Part of:** Main navigation — third tab
- **Related views:**
  - Dashboard (monthly band at the bottom is a simplified summary of this view)
  - Plant overview (clicking a row in the calendar opens the same plant detail panel)
  - AI assistant (embedded as a collapsible panel, same pattern as all views)

---

## 3. Design Principles (for this view)

- **Time as the primary axis** – months run left to right; plants are rows; intervals are bars
- **Color carries meaning** – bloom bars use the plant's actual flower color; other schedule types use consistent semantic colors
- **Switch context, not views** – the four schedule types share the same table; toggling between them re-renders the bars without changing the layout
- **Empty rows sink to the bottom** – plants with no intervals in the current schedule type are sorted to the end so relevant data stays at the top
- **Detail without leaving** – clicking a row opens the plant detail panel overlaying the table from the left, consistent with the Plants Overview

---

## 4. Layout & Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  🌿 GardenAssist  [ Dashboard ][ Plants ][ Calendar ][ Journal ] │
├──────────────────────────────────────────────────────────────────┤
│  🔍 Search …   [🌸 Blütezeit] [💧 Düngen] [✂️ Schnitt] [📋 Sonst] │
├───────────────────────────────────────────────────────────────┬──┤
│  ▓▓▓▓▓▓▓▓▓▓   Jan  Feb  Mär  Apr  Mai  Jun  Jul  Aug  …  Dez│  │
│  🌹 Rose    │               ████████████████████              │  │
│  💐 Rhodod. │          ████████████                           │  │
│  🌸 Magnol. │         █████                                   │ 💬│
│  🌻 Sonnenb.│                          ██████████             │  │
│  …                                                            │ver│
│  ──────────────────────────────────────────────────           │ti-│
│  (empty rows below)                                           │cal│
└───────────────────────────────────────────────────────────────┴──┘
```

When a row is clicked, a detail panel overlays from the left:

```
├────────────────┬──────────────────────────────────────────────┬──
│  🌹 Rose       │  Jan  Feb  Mär  Apr  Mai  Jun  …             │
│  Rosa          │                                              │
│  ┌──────────┐  │  ████████████████████████                   │
│  │ Steckbr. │  │                                              │
│  └──────────┘  │  …                                           │
│  [💬 Ask][✏️]  │                                              │
```

### Zones in Detail

| Zone | Width | Content |
|---|---|---|
| **Navigation** (top) | 100% | Same nav bar as all views |
| **Subheader** | 100% | Search input + 4 schedule-type toggle buttons |
| **Plant name column** | ~220px fixed | Thumbnail + common name + botanical name; sticky left |
| **Gantt bars area** | flex (remaining) | 12 month columns + colored interval bars per plant |
| **Plant detail panel** | ~300px (when open) | Overlays the table from the left; same panel as Plants Overview |
| **Chat strip** (right) | ~34px (collapsed) / ~300px (expanded) | AI assistant vertical strip |

### Mockup

Interactive HTML mockup: `ui-mockups/calendar/calendar-mockup.html`

---

## 5. Components & Elements

### Subheader

| Element | Description | Behavior |
|---|---|---|
| **Search input** | Text field with 🔍 icon | Live filters rows by common name or botanical name; no submit needed |
| **Schedule toggle: 🌸 Blütezeit** | Shows bloom period intervals | Bars colored in each plant's flower color |
| **Schedule toggle: 💧 Düngen** | Shows fertilization windows | Bars in blue |
| **Schedule toggle: ✂️ Schnitt** | Shows pruning windows | Bars in green |
| **Schedule toggle: 📋 Sonstiges** | Shows miscellaneous schedules (sowing, harvest, observation, etc.) | Bars in grey/orange per sub-type |

### Gantt Table

| Element | Description | Behavior |
|---|---|---|
| **Table header** | Month abbreviations (Jan–Dez) | Current month column has light green background tint |
| **Plant name cell** | Emoji thumbnail + common name (bold) + botanical name (italic, small) | Sticky left column; click anywhere in row to open detail panel |
| **Month grid lines** | Vertical 1px borders between month columns | Visual guide; current month column subtly tinted |
| **Interval bar** | Colored rounded rectangle spanning the relevant months | Width and position calculated as percentage of 12 months; hover shows tooltip |
| **Bar tooltip** | Appears above the bar on hover | Shows month range (e.g. "Mai–Sep") and interval label (e.g. "Rot/Pink") |
| **Empty row indicator** | "–" centered in the bars area | Shown when a plant has no intervals in the current schedule type; row sorted to end of list |
| **Selected row highlight** | Light green background on selected row | Applied when detail panel is open for that plant |

### Plant Detail Panel

Same component as in Plants Overview (doc-005, Section 5). Overlays the table from the left with `position:absolute`.

| Element | Behavior |
|---|---|
| Plant name + botanical name + ✕ close | ✕ closes panel, deselects row |
| Image slots (Plant / Bloom / Leaf) | Placeholder emoji; click to upload *(not yet implemented)* |
| Fact sheet grid | Type, location, bloom period, flower color, age, min. temperature |
| Care history | Last pruning date, last fertilization date |
| Care notes | Yellow background; read-only |
| "Ask assistant" button | Opens chat with plant context pill |
| "Edit" button | Placeholder — not yet implemented |

---

## 6. Interactions & States

### Interactions

- **Type in search** → Table rows filter live; empty rows re-sort to bottom within filtered set
- **Click schedule toggle** → Bars re-render for the new schedule type; row order re-sorts (plants with bars first)
- **Click table row** → Detail panel slides in from left overlaying the table; row highlighted; first click opens, second click closes
- **Click ✕ in detail panel** → Panel closes; row deselected
- **Hover over bar** → Tooltip appears above bar with month range and label
- **Click "Ask assistant"** in detail panel → Chat panel opens with plant context pill
- **Click chat strip** → Chat expands; strip hidden
- **Click ✕ in chat** → Chat collapses; strip reappears

### States

- **Default** – Blütezeit active, all plants shown with bloom bars, current month tinted
- **Schedule switched** – bars re-render, rows re-sorted, selected plant detail closes
- **Search active** – filtered rows only; plants with bars still sorted above empty rows
- **Empty state (no search match)** – "No plants match your search"
- **Detail panel open** – selected row highlighted; panel overlays left side of table
- **Loading state** – skeleton rows *(not yet defined)*
- **Error state** – *(not yet defined)*

---

## 7. Bar Color Logic

| Schedule type | Color source |
|---|---|
| **Blütezeit** | First value of the plant's `blueSwatches` array (actual flower color) |
| **Düngen** | Fixed: `#2980b9` (blue) |
| **Schnitt** | Fixed: `#27ae60` (green) |
| **Sonstiges** | Sub-type dependent: observation `#7f8c8d` (grey), harvest `#e67e22` (orange), sowing `#7f8c8d` |

Multiple bars per plant per schedule type are supported (e.g. a rose that is pruned twice per year shows two separate green bars).

---

## 8. AI Assistant Integration

- **Context-aware entry:** "Ask assistant" in the detail panel opens the chat with a context pill for the selected plant
- **Data access:** The assistant can answer questions about any plant's schedule shown in the current view
- **Always reachable:** Chat strip permanently visible on the right edge

---

## 9. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Desktop (>1200px) | Default layout as described above |
| Tablet (768–1200px) | Plant name column narrows; month columns compress; horizontal scroll enabled |
| Mobile (<768px) | Not in scope for v1 |

---

## 10. Open Questions

- [ ] The PRD lists "Growth period" and "Foliage (leaf / no leaf)" as schedule sub-views — these are not yet in the mockup. Should they be added as additional toggle buttons?
- [ ] Should bars be clickable independently (not just the row), e.g. to edit an interval directly?
- [ ] Should the current month column be more strongly highlighted (e.g. a vertical line or darker tint)?
- [ ] Can the user add or edit schedule intervals directly in this view, or only via the plant detail / AI assistant?

---

## 11. Out of Scope for this View

- Editing plant data (handled via plant detail panel or AI assistant)
- Creating new plants (handled via Plants Overview FAB)
- Task management / to-do list (lives on the Dashboard)
- Export to external calendar (future feature per PRD)
