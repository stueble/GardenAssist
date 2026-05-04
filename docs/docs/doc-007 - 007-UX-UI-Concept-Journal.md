---
id: doc-007
title: 007 - UX/UI Concept - Journal
type: other
created_date: '2026-05-03'
updated_date: '2026-05-04 17:07'
---
# UI Concept – Journal

**Version:** 0.1  
**Last updated:** 2026-05-03

---

## 1. Purpose

The Journal is a chronological diary of the user's gardening activities. It provides a personal history of the garden — what was done, what was observed, what was spent. Entries are grouped by month and displayed as a timeline. The user can add new entries quickly via a floating action button, filter by entry type, and search across all entries.

---

## 2. Context & Placement

- **Accessed via:** "Journal" link in the top navigation
- **Part of:** Main navigation — fourth tab
- **Related views:**
  - Dashboard (completed tasks could eventually auto-generate journal entries)
  - Plant overview (plant detail view could link to related journal entries)
  - AI assistant (embedded as collapsible panel; can be used to create or query journal entries)

---

## 3. Design Principles (for this view)

- **Chronological, not categorical** – entries are sorted by date descending, grouped by month; the timeline metaphor reflects the personal diary character
- **Scan before expand** – entry headers show type, plant, title and date at a glance; full content expands on click
- **Type color carries meaning** – each entry type has a consistent color used in the left border, dot on the timeline, and type badge
- **Quick entry via FAB** – the floating action button is always visible and opens the new entry panel without navigating away
- **Context via plant reference** – every entry is linked to either a specific plant or the garden as a whole

---

## 4. Layout & Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  🌿 GardenAssist  [ Dashboard ][ Plants ][ Calendar ][ Journal ] │
├──────────────────────────────────────────────────────────────────┤
│  🔍 Search …    [✅ Erledigt] [👁 Beobachtung] [⚠️ Problem] [💰] │
├────────────────────────────────────────────────┬─────────────┬──┤
│                                                │             │  │
│  Mai 2026                                      │  New Entry  │  │
│  ●── ✅ Erledigt  🌹 Rose  Rosen geschnitten  1. Mai│  Panel      │ 💬│
│  ●── 👁 Beobachtung  🌸 Magnolia  Erste Knospen  1. Mai│  (opens    │  │
│                                                │  via FAB)   │ver│
│  April 2026                                    │             │ti-│
│  ●── ⚠️ Problem  🌿 Hortensie  Blattläuse  28. Apr│             │cal│
│  ●── 💰 Ausgabe  🌿 Garten  Dünger & Mulch  10. Apr│             │  │
│                                           ＋   │             │  │
└────────────────────────────────────────────────┴─────────────┴──┘
```

When an entry is clicked it expands inline:

```
│  ●── ✅ Erledigt  🌹 Rose  Rosen geschnitten  1. Mai  ▴
│     Frühjahrsschnitt durchgeführt. Alle alten Triebe auf 3 Augen
│     zurückgeschnitten …
│     [📷 Rose] [📷 –] [📷 –]
```

### Zones in Detail

| Zone | Width | Content |
|---|---|---|
| **Navigation** (top) | 100% | Same nav bar as all views |
| **Subheader** | 100% | Search input + entry-type filter chips |
| **Timeline** | flex (remaining) | Chronological entries grouped by month; vertical line on left |
| **New entry panel** | ~320px (when open) | Slides in from right; type selector, plant picker, date, title, notes, photo slots |
| **Chat strip** (right) | ~34px (collapsed) / ~300px (expanded) | AI assistant; mutually exclusive with new entry panel |
| **FAB** | 48×48px, bottom-right of timeline | Opens new entry panel; moves with the timeline area when chat opens |

### Mockup

Interactive HTML mockup: `ui-mockups/journal/journal-mockup.html`

---

## 5. Components & Elements

### Subheader

| Element | Description | Behavior |
|---|---|---|
| **Search input** | Text field with 🔍 icon | Live filters entries by title, notes text, and plant name |
| **Filter chip: ✅ Erledigt** | Completed tasks | Click to activate; second click deactivates (returns to show all) |
| **Filter chip: 👁 Beobachtung** | Observations | Same toggle behavior; only one chip active at a time |
| **Filter chip: ⚠️ Problem** | Problems / issues | Same toggle behavior |
| **Filter chip: 💰 Ausgabe** | Expenses / purchases | Same toggle behavior |

No "All" chip — deactivating the active chip returns to unfiltered view.

### Timeline

| Element | Description | Behavior |
|---|---|---|
| **Month heading** | "Mai 2026" with horizontal rule | Groups all entries for that month; always visible |
| **Vertical timeline line** | 2px line on the left of the entries column | Visual connector; runs through all entries in a month group |
| **Entry dot** | Colored circle on the timeline line | Color matches entry type (see color table below) |
| **Entry card** | White card with colored left border (4px) | Collapsed by default; click to expand |
| **Entry header** | Type badge + plant tag + title + date + chevron ▾ | Always visible; chevron rotates on expand |
| **Type badge** | Small colored pill: e.g. "✅ Erledigt" | Background and text color match entry type |
| **Plant tag** | Emoji + plant name or "Garten (allgemein)" | Light green background pill |
| **Entry body** | Text content + photo slots | Hidden until entry is expanded |
| **Photo slots** | Up to 3 photo thumbnails | Shows placeholder emoji or uploaded photo; click to upload *(not yet implemented)* |

### Entry Type Color Coding

| Type | Dot / border color | Badge background |
|---|---|---|
| ✅ Erledigt | Green `#27ae60` | Light green |
| 👁 Beobachtung | Blue `#4a78c0` | Light blue |
| ⚠️ Problem | Red `#c0392b` | Light red |
| 💰 Ausgabe | Purple `#7d3c98` | Light purple |

### New Entry Panel

| Element | Description | Behavior |
|---|---|---|
| **Panel header** | "Neuer Eintrag" + ✕ close | ✕ closes panel; FAB returns to green |
| **Type selector** | 4 toggle buttons in 2×2 grid | Active button highlighted in type color; selecting "Ausgabe" reveals price field |
| **Price field** | Number input for amount in € | Only visible when "Ausgabe" type is selected |
| **Plant / reference dropdown** | Lists all plants with emoji + name + flower color + location | First option is always "🌿 Garten (allgemein)" |
| **Date input** | Pre-filled with today's date | Editable |
| **Title input** | Short text field | Required |
| **Notes textarea** | Multi-line text | Optional; min-height 90px |
| **Photo slots** | 3 dashed upload slots | Click to upload photo *(not yet implemented)* |
| **Save / Cancel buttons** | At bottom of panel | Save closes panel; Cancel discards |

### FAB (Floating Action Button)

| Element | Description | Behavior |
|---|---|---|
| **＋ button** | 48×48px rounded square, dark green | `position:absolute` within content column; always bottom-right of the timeline area; moves with the content area when chat panel opens |
| **Active state** | Brown/bark color when new entry panel is open | Returns to green when panel closes |

---

## 6. Interactions & States

### Interactions

- **Type in search** → Entries filter live across all months; empty months disappear; "no results" message if nothing matches
- **Click filter chip** → Entries filtered to that type only; chip highlighted; second click removes filter
- **Click entry card** → Entry expands showing full text and photo slots; chevron rotates to ▴; second click collapses
- **Click FAB (＋)** → New entry panel slides in from right; FAB turns brown; chat panel closes if open
- **Click ✕ in new entry panel** → Panel closes; FAB returns to green
- **Select "Ausgabe" type in new entry panel** → Price field appears below type selector
- **Select other type** → Price field hidden
- **Click "Save"** → Panel closes *(actual save not yet implemented in mockup)*
- **Click chat strip** → Chat panel expands; new entry panel closes if open; FAB returns to green
- **Click ✕ in chat** → Chat collapses; strip reappears

### States

- **Default** – all entries shown, no filter active, new entry panel closed
- **Filter active** – chip highlighted, only matching entries visible
- **Search active** – entries filtered by query text; month groups with no matches hidden
- **Entry expanded** – card shows full content; all other entries remain in their collapsed state
- **New entry panel open** – panel visible on right; FAB brown; chat closed
- **Empty state (no entries)** – "Noch keine Einträge — fangen Sie an, Ihren Garten zu dokumentieren!"
- **Empty state (filter/search)** – "Keine Einträge gefunden."
- **Loading state** – *(not yet defined)*

---

## 7. AI Assistant Integration

- **Always reachable:** Chat strip permanently visible; opening it closes the new entry panel
- **Create via chat:** The assistant can create journal entries from natural language ("I just pruned the roses") — *(not yet implemented)*
- **Query history:** The assistant can search and summarize past journal entries ("When did I last fertilize the rhododendron?")
- **Data access:** The assistant has full read access to all journal entries as conversation context
- **Mutual exclusion with new entry panel:** Only one right-side panel (new entry or chat) can be open at a time

---

## 8. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Desktop (>1200px) | Default layout as described above |
| Tablet (768–1200px) | New entry panel overlays timeline (full-height drawer) instead of pushing it |
| Mobile (<768px) | Not in scope for v1 |

---

## 9. Open Questions

- [ ] Should completed tasks on the Dashboard auto-generate journal entries ("Erledigt" type), or is journal entry always manual?
- [ ] Should the journal show entries created by the AI assistant differently from manually created entries?
- [ ] Photo upload: what formats and file size limits? Where are photos stored?
- [ ] Should entries be editable after saving, or append-only?
- [ ] Should "Ausgabe" entries contribute to a running cost total visible somewhere in the view?
- [ ] Should the plant dropdown be searchable (especially once the plant list grows)?

---

## 10. Not Yet Implemented (Mockup Placeholders)

- **Save entry** – the "Speichern" button closes the panel but does not persist data
- **Photo upload** – slots show placeholder icons only
- **Edit existing entries** – no edit mode designed yet
- **AI-assisted entry creation** – assistant can be opened but does not auto-fill the new entry form

---

## 11. Out of Scope for this View

- Task management (lives on the Dashboard)
- Plant data editing (handled via Plant Overview or AI assistant)
- Bulk delete or export of journal entries
- Shared or multi-user journal
- Mobile-optimized layout (v1)
