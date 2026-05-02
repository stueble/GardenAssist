---
id: doc-004
title: UX/UI Concept - Dashboard
type: other
created_date: '2026-05-02 20:45'
updated_date: '2026-05-03'
---

# UI Concept – Dashboard

**Version:** 0.4  
**Last updated:** 2026-05-03

---

## 1. Purpose

The dashboard is the primary entry point of the application. It gives the user everything relevant at a glance: open and overdue tasks, the visual garden plan, and a seasonal monthly overview. The user should be able to act immediately — complete tasks, review the garden, and consult the AI assistant — without leaving this view.

---

## 2. Context & Placement

- **Accessed via:** App start (home / root route)
- **Part of:** Main navigation — first tab / default active state
- **Related views:**
  - Plant overview (clicking a plant symbol in the plan opens the detail panel inline in the left column)
  - Garden calendar (monthly band is a simplified version of it)
  - Journal (log entries linked to completed tasks)
  - AI assistant (embedded as a collapsible panel)

---

## 3. Design Principles (for this view)

- **Garden as the main character** – the visual center (garden plan) receives the largest share of the layout
- **Action over information** – task actions (✓ Done, → Skip) are directly visible, no extra click required
- **Organic aesthetic** – green tones, natural typefaces (Playfair Display + DM Sans), no hard edges
- **Contextual hover instead of dialogs** – details appear as tooltips, not modal overlays
- **Assistant always reachable** – the chat trigger is permanently visible, never hidden in a menu

---

## 4. Layout & Structure

The dashboard follows a 4-zone layout:

```
┌──────────────────────────────────────────────────────────────────┐
│  🌿 GardenAssist  [ Dashboard ][ Plants ][ Calendar ][ Journal ] │
├──────────────────┬───────────────────────────────────────┬───────┤
│  ☁️ 18°C         │                                       │       │
│  Mo Tu We Th Fr  │     Garden Plan                       │  💬   │
│  ──────────────  │     (central, interactive)            │       │
│  ⚠️ Warnings     │                                  ↕ ↔  │  ver- │
│  🔴 Todo 1  ✓ → ├───────────────────────────────────────┤  ti-  │
│  🟡 Todo 2  ✓ → │  Jan  Feb  Mar  Apr  May  Jun …  Dec  │  cal  │
│  🔵 Todo 3  ✓ → │                                       │  strip│
└──────────────────┴───────────────────────────────────────┴───────┘
```

When a plant pin is clicked, the left column switches from todo list to plant detail:

```
├──────────────────┬─ …
│  ☁️ 18°C         │
│  Mo Tu We Th Fr  │
│  ──────────────  │
│  🌹 Rose         │
│  Rosa            │
│  ┌──────────┐    │
│  │ Steckbr. │    │
│  └──────────┘    │
│  [💬 Ask] [✏️]   │
```

### Zones in Detail

| Zone | Width | Content |
|---|---|---|
| **Navigation** (top) | 100% | Logo, main nav links, settings |
| **Left column** | ~280px | Weather widget (always) + divider + either todo list or plant detail panel |
| **Center area** | flex (remaining) | Interactive garden plan |
| **Monthly band** (bottom) | Center only | 12-month overview, aligned below the garden plan |
| **Chat strip** (right) | ~34px (collapsed) / ~300px (expanded) | AI assistant as vertical strip; expands to full panel |

### Mockup

Interactive HTML mockup: `ui-mockups/dashboard/garden-app-mockup.html`

---

## 5. Components & Elements

| Element | Description | Behavior |
|---|---|---|
| **Top navigation** | Logo + 4 nav links + settings icon | Links navigate to Dashboard, Plants, Calendar, Journal; active tab highlighted |
| **Weather widget** (left, top) | Current temperature + weather icon + 5-day forecast strip | Always visible; never replaced by other content; data source not yet defined |
| **Todo list** (left, below weather) | Prioritized list of all open tasks | Shown by default; hidden when plant detail is open; section labels per priority tier |
| **Todo item** | Color dot + title + subtitle + action buttons | Hover: subtle background tint; color coding: 🔴 overdue · 🟡 current · 🔵 upcoming |
| **Button ✓ Done** | Green button per todo | Click: item slides out to the left with animation |
| **Button → Skip** | Gray button per todo | Click: item slides out to the right with animation |
| **Plant detail panel** (left, below weather) | Full plant profile: images, fact sheet, care history, notes, action buttons | Replaces todo list when a plant pin is clicked; same ✕ close button returns to todo list |
| **Garden plan** (center) | Image-based layout with plant pins | Pan & zoom via mouse/touch; image loaded from `gartenplan.png`; pins counter-scaled to stay constant size |
| **Plant pin** | Emoji + ring on the plan surface; red dot indicator for overdue tasks | Hover: tooltip with name, status, next task; first click: opens detail panel; second click on same pin: closes panel |
| **Zoom buttons ↕ / ↔** | Fixed bottom-right of garden area | ↕ fits the image to the available height; ↔ fits to width; not affected by pan/zoom transform |
| **Legend** | Fixed bottom-left of garden area | Color key: overdue / current / ok; not affected by pan/zoom transform |
| **Monthly band** (bottom) | 12 month cells with colored dots | Current month highlighted dark; hover per cell: tooltip with task list for that month |
| **Month tooltip** | Tasks grouped by category (✂️ 💧 🌱) | Appears above the month cell; disappears on mouseout |
| **Chat strip** (right) | Narrow vertical strip: 💬 emoji top + "Assistent" label below | Color: `--green-mid`, slightly lighter than nav bar; click: expands to full chat panel |
| **Chat panel** | Full chat window with history + input | Close via ✕; clicking a todo text also opens chat; plant detail "Ask assistant" button opens chat with plant context pill |

---

## 6. Interactions & States

### Interactions

- **Click ✓ (Done)** → Todo item animates out to the left (opacity 0 + translateX(-20px)), then `display: none`
- **Click → (Skip)** → Todo item animates out to the right
- **Click on todo text** → Chat panel opens with the task as implicit context
- **Click plant pin (first click)** → Plant detail panel slides in below weather widget, replacing todo list; pin gets green highlight ring
- **Click plant pin (second click on same pin)** → Detail panel closes, todo list returns
- **Click ✕ in detail panel** → Detail panel closes, todo list returns
- **Click "Ask assistant" in detail panel** → Chat panel opens; context pill for the selected plant injected
- **Hover over plant pin** → Tooltip: name, status, next task
- **Hover over month cell** → Tooltip appears above with categorized tasks
- **Click chat strip** → Chat panel expands (width transition), strip is hidden
- **Click ✕ in chat** → Chat panel collapses, strip reappears
- **Scroll wheel over garden plan** → Zoom in/out, centered on mouse position
- **Click + drag in garden plan** → Pan; cursor changes to grabbing hand
- **Pinch gesture (touch / trackpad)** → Two-finger zoom, centered on pinch midpoint
- **Button ↕** → Scale image to fit available height, center horizontally
- **Button ↔** → Scale image to fit available width, center vertically
- **Plant pins at any zoom level** → Counter-scaled (inverse of zoom) to remain constant visual size

### States

- **Default** – todo list visible, whole garden plan image visible (Math.min fit), current month highlighted
- **Plant detail open** – todo list hidden, detail panel visible below weather; selected pin highlighted
- **Empty state (no todos)** – todo list shows message: "No open tasks — well done! 🌿"
- **Empty state (no garden plan)** – center area shows CTA "Set up garden plan"
- **Loading state** – skeleton placeholders *(not yet defined)*
- **Error state** – *(not yet defined)*
- **Chat open** – chat panel expands from right; strip hidden

---

## 7. AI Assistant Integration

- **Contextual entry via todo:** Clicking a todo text opens the chat with the task as implicit context
- **Contextual entry via plant:** Clicking "Ask assistant" in the plant detail panel opens the chat with a context pill for that plant
- **Proactive hints:** The assistant can proactively address overdue tasks (e.g. "The roses have been on the list for a while…")
- **Data access:** The assistant has access to all garden data (plants, tasks, schedule) as context for all responses
- **Modification:** The assistant can mark tasks as done or add new tasks via natural language
- **Always reachable:** Chat strip permanently visible on the right edge — never hidden behind a menu

---

## 8. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Desktop (>1200px) | Default layout as described above: Left–Center–Right |
| Tablet (768–1200px) | Left column collapses to drawer; plan fills more width |
| Mobile (<768px) | Not in scope for v1 |

---

## 9. Open Questions

- [ ] Where does weather data come from? Widget is implemented in the mockup but data source (API, mock, manual) is not yet decided.
- [ ] How is the garden plan image created and updated — free drawing tool, image upload, or structured coordinates?
- [ ] When the chat opens via todo click, should it auto-populate a message or just set context silently?
- [ ] How does the left column behave when all todo items are completed — empty state or hide the section?
- [ ] Monthly band: Is the current month always highlighted, or can the user set a different "active" month?

---

## 10. Out of Scope for this View

- Full garden calendar / Gantt view (separate "Calendar" view)
- Manually creating tasks (handled via AI assistant or plant detail)
- Multi-user features
- Mobile-optimized layout (v1)
