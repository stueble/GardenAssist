---
id: doc-005
title: 005 - UX/UI Concept - Plants Overview
type: other
created_date: '2026-05-02'
updated_date: '2026-05-04 17:07'
---
# UI Concept – Plants Overview

**Version:** 0.3  
**Last updated:** 2026-05-03

---

## 1. Purpose

The Plants Overview is the central management view for all plants in the garden. It gives the user a structured, searchable list of every plant with key attributes visible at a glance, and provides access to a full plant profile (care history, images, notes) without navigating away. The user should be able to find any plant quickly, assess its current status, and take action or consult the AI assistant in a single view.

---

## 2. Context & Placement

- **Accessed via:** "Plants" link in the top navigation
- **Part of:** Main navigation — second tab
- **Related views:**
  - Dashboard (clicking a plant symbol in the garden plan opens the detail panel inline — *not yet implemented*)
  - Garden calendar (plants are the rows; clicking a plant there may open this view)
  - AI assistant (embedded as a collapsible panel, same pattern as dashboard)

---

## 3. Design Principles (for this view)

- **Scan before drill-down** – the table provides enough information to act without opening the detail panel
- **Search over filter chips** – a single text input handles filtering; no preset filter chips to reduce visual noise
- **Detail without navigation** – the plant profile opens as a side panel, keeping the full list in context
- **Consistent visual language** – same color coding (🔴 overdue · 🟡 current · 🔵 upcoming), same nav, same chat strip pattern as the dashboard
- **Two layouts, one dataset** – table and card view show the same data; the user picks their preferred density

---

## 4. Layout & Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  🌿 GardenAssist  [ Dashboard ][ Plants ][ Calendar ][ Journal ] │
├──────────────────────────────────────────────────────────────────┤
│  🔍 Search …                              9 plants · 3 open  ☰ ⊞ │
├───────────────┬──────────────────────────────────────────────┬───┤
│               │                                              │   │
│  Detail       │  Name       │ Type  │ Location │ Bloom │ …  │ 💬 │
│  Panel        │  ───────────┼───────┼──────────┼───────┼─── │   │
│  (opens on    │  🌹 Rose    │ Shrub │ West bed │May–Sep│ …  │ver│
│  row click,   │  💐 Rhodod. │ Shrub │ Terrace  │Apr–Jun│ …  │ti-│
│  left side)   │  🌸 Magnolia│ Tree  │ NW       │Apr–May│ …  │cal│
│               │  …                                           │   │
└───────────────┴──────────────────────────────────────────────┴───┘
```

### Zones in Detail

| Zone | Width | Content |
|---|---|---|
| **Top navigation** | 100% | Same nav bar as all views |
| **Subheader** | 100% | Search input → spacer → result count → view toggle |
| **Detail panel** (left of table) | ~300px (when open) | Plant profile: images, fact sheet, care history, notes, action buttons |
| **Table / Card area** | flex (shrinks when detail panel is open) | Scrollable plant list in table or card layout |
| **Chat strip** (far right) | ~34px (collapsed) / ~300px (expanded) | AI assistant; same vertical strip pattern as dashboard |

### Mockup

Interactive HTML mockup: `ui-mockups/plants-overview/plants-overview-mockup.html`

---

## 5. Components & Elements

### Subheader

| Element | Description | Behavior |
|---|---|---|
| **Search input** | Text field with 🔍 icon; fixed width ~300px | Live filters the list on each keystroke; matches against common name, botanical name, and location |
| **Result count** | "N plants · N with open tasks" | Updates in real time as search filters |
| **View toggle ☰ / ⊞** | Switch between table and card view; right-aligned | Instant re-render of the same dataset; active mode highlighted |

### Table View

| Element | Description | Behavior |
|---|---|---|
| **Table header** | Column names with sort arrows | Click to sort ascending/descending; active sort column highlighted |
| **Plant thumbnail** | Emoji or photo in first column | Placeholder emoji if no photo uploaded |
| **Plant name cell** | Common name (bold) + botanical name (small, italic) | — |
| **Status badge** | Color-coded pill: 🔴 overdue · 🟡 current · 🔵 upcoming · ✅ ok | Visual priority indicator |
| **Table row** | Full row is clickable | Click: opens detail panel; selected row highlighted in light green |

### Card View

| Element | Description | Behavior |
|---|---|---|
| **Plant card** | Emoji/image header + name + type + next task badge | Click: opens detail panel; selected card highlighted |

### Detail Panel

| Element | Description | Behavior |
|---|---|---|
| **Panel header** | Common name + botanical name + close button ✕ | ✕ closes panel; deselects row/card |
| **Image slots** | Three slots: Plant / Bloom / Leaf | Placeholder emoji when no image uploaded; click to upload *(not yet implemented)* |
| **Fact sheet** | 2-column grid: Type, Location, Bloom period, Flower color, Age, Min. temperature | Read-only |
| **Care history** | Last pruning date + last fertilization date | Read-only |
| **Care notes** | Free-text with yellow background | Read-only; shows care instructions |
| **Button: Edit** | Opens the Plant Edit Dialog | Pre-fills all fields from the selected plant |
| **Button: Delete plant** | Red text-link below the action bar | Opens inline confirmation; on confirm calls DELETE /api/plants/:id; on success closes panel and removes plant from list |

### FAB (Floating Action Button)

| Element | Description | Behavior |
|---|---|---|
| **＋ button** | 48×48px rounded square, dark green; `position:absolute` within the content column | Always visible at bottom-right of the plant list area; moves with the content area when the chat panel opens; opens the add-plant dialog |
| **Active state** | Brown/bark color when add-plant dialog is open | Returns to dark green when dialog closes |

### Chat Strip

| Element | Description | Behavior |
|---|---|---|
| **Chat strip** | Narrow vertical strip: 💬 emoji top + "Assistent" label | Color: `--green-mid`; click expands to full chat panel |
| **Chat panel** | Full chat window with history + input | Close via ✕; strip reappears |

---

## 6. Interactions & States

### Interactions

- **Type in search field** → List filters live; result count updates; no submit needed
- **Click ☰ (table view)** → Switches to table layout; button highlighted
- **Click ⊞ (card view)** → Switches to card grid layout; button highlighted
- **Click table row / plant card** → Detail panel slides open from the right; row/card highlighted
- **Click ✕ in detail panel** → Detail panel closes; row/card deselected
- **Click column header** → Sort ascending; second click: descending
- **Select a plant (row/card click)** → Chat panel automatically gains plant context; no explicit "Ask assistant" button needed
- **Click "Delete plant" in detail panel** → Inline confirmation appears; Cancel dismisses it; Delete calls API; on success panel closes, plant removed from list; on failure inline error shown
- **Click chat strip** → Chat panel expands; strip hidden
- **Click ✕ in chat** → Chat panel collapses; strip reappears

### States

- **Default** – full unfiltered list in table view, no detail panel open
- **Search active** – result count reflects filtered set
- **Empty state (no search match)** – "No plants match your search" with a clear-search link
- **Empty state (no plants yet)** – "No plants yet — add your first plant or ask the assistant"
- **Detail panel open** – table/card area narrows; selected row/card highlighted
- **Loading state** – skeleton rows in table *(not yet defined)*
- **Error state** – *(not yet defined)*

---

## 7. AI Assistant Integration

- **Automatic context:** Selecting a plant (clicking a row or card) automatically sets the plant as the assistant's context — no "Ask assistant" button is needed in the detail panel
- **Add plant via AI:** The FAB (＋) opens an AI-assisted dialog where the user can describe a plant in natural language or upload a photo for identification *(not yet implemented)*
- **Data modification:** The assistant can update plant data (care dates, notes, attributes) through conversation
- **Always reachable:** Chat strip permanently visible on the right edge, same as all views

---

## 8. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Desktop (>1200px) | Default layout: table + detail panel side-by-side |
| Tablet (768–1200px) | Detail panel overlays the table (full-height drawer) instead of pushing it; card view preferred |
| Mobile (<768px) | Not in scope for v1 |

---

## 9. Open Questions

- [ ] Which columns are visible by default, and which are hidden? A column selector is not yet designed.
- [ ] Image upload: what formats and size limits are supported? Where are images stored?
- [ ] Add plant flow: will this be a chat dialog, a photo upload, a form, or a combination?
- [ ] Should clicking a plant in the garden plan (dashboard) open the Plants view with that plant's detail panel already open?
- [ ] Should the detail panel have an inline edit mode, or navigate to a separate edit page?

---

## 10. Not Yet Implemented (Mockup Placeholders)

- **Add plant (FAB ＋)** – opens an alert; AI-assisted add-plant dialog not designed
- **Image upload in detail panel** – image slots show placeholder emojis; no upload interaction
- **Edit button in detail panel** – no edit mode or edit view designed yet
- **Dashboard → Plants link** – clicking a plant in the garden plan does not yet navigate to this view

---

## 11. Out of Scope for this View

- Filter chips / preset category filters (removed in favour of free-text search)
- Column selector (deferred — not yet designed)
- Garden calendar / Gantt view (separate "Calendar" view)
- Task management (tasks visible as status badges; todo list lives on the dashboard)
- Plant identification via photo (future feature, triggered from add-plant flow)
- Bulk actions (select multiple plants, bulk delete/edit)
- Mobile-optimized layout (v1)
