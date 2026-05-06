---
id: doc-011
title: 011 - UX/UI Styleguide
type: other
created_date: '2026-05-05 00:00'
updated_date: '2026-05-05 12:00'
---

# UX/UI Styleguide

**Version:** 0.1  
**Last updated:** 2026-05-05

---

## 1. Purpose

This document is the single source of truth for visual and interaction design decisions in GardenAssist. It bridges the HTML mockups (`ui-mockups/`) and the React implementation, explaining *why* patterns look the way they do — not just *what* they look like.

Developers must consult this guide before implementing any UI component. Deviations require explicit justification and a corresponding update to this document.

---

## 2. Design Tokens

All tokens are defined in `apps/frontend/src/index.css` via a Tailwind v4 `@theme` block and are available both as Tailwind utility classes (`bg-green-deep`, `text-text-mid`) and as CSS custom properties (`var(--green-deep)`).

### 2.1 Color Palette

#### Brand Greens

| Token | Value | Usage |
|---|---|---|
| `green-deep` | `#2d4a2d` | Primary actions, nav background, headings |
| `green-mid` | `#4a7c4a` | Secondary actions, hover states, focus borders |
| `green-light` | `#7aab6a` | Accents, success indicators |
| `green-pale` | `#c8dfc0` | Nav text, subtle highlights |
| `green-mist` | `#eef4eb` | Input backgrounds, row containers, hover surfaces |

#### Neutral / Backgrounds

| Token | Value | Usage |
|---|---|---|
| `cream` | `#f8f4ee` | App background |
| `warm-white` | `#fdfbf8` | Card/panel backgrounds |
| `bark` | `#8b6f47` | Warm accent (e.g. nature-themed highlights) |
| `bark-light` | `#c4a882` | Softer warm accent |

#### Semantic / State

| Token | Value | Usage |
|---|---|---|
| `red-warn` | `#c0392b` | Destructive actions, error states |
| `red-soft` | `#fdf0ee` | Error backgrounds |
| `yellow-warn` | `#d4850a` | Warning text |
| `yellow-soft` | `#fef9ee` | Warning backgrounds, notes |
| `blue-mid` | `#4a78c0` | Informational elements |
| `blue-soft` | `#e8f0fb` | Informational backgrounds |

#### Text

| Token | Value | Usage |
|---|---|---|
| `text-dark` | `#1e2e1e` | Primary body text, headings |
| `text-mid` | `#4a5e4a` | Secondary text, labels |
| `text-light` | `#8a9e8a` | Hints, placeholders, metadata |

#### Schedule / Gantt Categories

| Token | Value | Schedule type |
|---|---|---|
| `sc-bloom` | `#c0392b` | Bloom periods |
| `sc-growth` | `#2e7d32` | Growth periods |
| `sc-foliage` | `#1b5e20` | Foliage periods |
| `sc-prune` | `#27ae60` | Pruning windows |
| `sc-fertilize` | `#2980b9` | Fertilization periods |
| `sc-misc` | `#7f8c8d` | Miscellaneous schedules |

Bloom, foliage, and misc colors are user-configurable via the Color Presets settings section (planned feature). Growth, pruning, and fertilization use fixed semantic colors.

---

### 2.2 Typography

#### Fonts

Two fonts are used throughout the application, both loaded via Google Fonts in `index.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap");
```

| Token | Font | Weights loaded | Usage |
|---|---|---|---|
| `--font-display` | Playfair Display, serif | 400, 600 (+ 400 italic) | Page titles, section headings, logo, plant names |
| `--font-body` | DM Sans, sans-serif | 300, 400, 500 | All body text, inputs, labels, buttons, nav links |

#### Rules for Using `font-display`

- **Always apply via inline `style`**, not via Tailwind classes:
  ```tsx
  // ✅ correct
  style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 600 }}

  // ❌ avoid — Tailwind v4 does not reliably resolve arbitrary font classes
  className="font-display text-[24px]"
  ```
- Use Playfair Display for: page-level headings, the app logo, plant names in detail panels, section titles in chat.
- Use DM Sans for everything else — including input labels, button text, and navigation.

#### Why Two Fonts

Playfair Display signals "nature, premium, editorial" at heading level. DM Sans is neutral and highly legible at small sizes. Mixing them creates hierarchy without needing heavy weights or uppercase throughout.

---

### 2.3 Spacing, Border Radius & Shadows

#### Border Radius

| Token | Value | Typical usage |
|---|---|---|
| `--radius-sm` | `4px` | Chips, badges, small pills |
| `--radius-md` | `8px` | Input fields, buttons, list rows |
| `--radius-lg` | `12px` | Cards, section panels |
| `--radius-xl` | `20px` | Modals, large panels |
| `--radius-full` | `9999px` | Round buttons, avatar circles |

#### Shadows

| Token | Value | Typical usage |
|---|---|---|
| `--shadow-ga` | `0 2px 12px rgba(45,74,45,.10)` | Default card elevation |
| `--shadow-ga-lg` | `0 8px 32px rgba(45,74,45,.15)` | Modal/dialog elevation |

---

## 3. Form Input Patterns

GardenAssist uses **two distinct input field patterns**. They look similar but serve different UX purposes. Using the wrong pattern is a visual bug.

### 3.1 Standalone Field — `FieldInput`

Used for **named, labeled form fields** where the input is the primary element on a line.

**Visual behavior:**

| State | Background | Border |
|---|---|---|
| Default | `green-mist` (light green) | `border` |
| Focus (active) | `white` | `green-mid` |

The background change on focus communicates: *"you are now editing this field."* It draws the eye to the active input in a form with multiple fields.

**Component:** `apps/frontend/src/components/settings/FieldInput.tsx → FieldInput`

```tsx
// Usage
<FieldInput
  id="location_zip"
  type="text"
  value={form.location_zip ?? ""}
  onChange={(e) => onChange({ location_zip: e.target.value || null })}
  placeholder="z.B. 80331"
/>
```

**Applies to:** location city/zip, API key, numeric config fields, text fields with a label above.

---

### 3.2 List Row — `ListEntry`

Used for **items in a user-managed list** (irrigation zones, plant categories, color preset names). Each row is a self-contained unit: editable name + delete button.

**Visual structure:**

```
┌── green-mist container (rounded-[8px]) ──────────────────┐
│  [ white input field          ]          [✕ delete]       │
└──────────────────────────────────────────────────────────┘
```

**Visual behavior:**

| Level | State | Background |
|---|---|---|
| Container | Always | `green-mist` |
| Inner input | Always | `white` |
| Inner input | Focus | border changes to `green-mid` |

The **green container is always visible** because it groups the editable content with the delete control. It communicates "this is one list item" — not just a field. The **inner input is always white** because list rows are always in edit mode by nature; no focus-triggered color change is needed at container level. The user's attention is drawn to the row, not to the specific focus state.

This is a deliberate **container–content pattern**: the outer shell defines the element type (list row), the inner white box defines the editable area.

**Component:** `apps/frontend/src/components/settings/FieldInput.tsx → ListEntry`

```tsx
// Usage
<ListEntry
  value={zone}
  onChange={(val) => updateZone(i, val)}
  onDelete={() => deleteZone(i)}
  placeholder="Zonenname …"
/>
```

**Applies to:** irrigation zones, plant categories, color preset name fields.

---

### 3.3 Summary: When to Use Which

| Context | Component | Pattern |
|---|---|---|
| Single field with a label above it | `FieldInput` | Standalone — green → white on focus |
| Row in a user-editable list | `ListEntry` | Container (green) + inner input (always white) |
| Dropdown / select | `FieldSelect` | Same as `FieldInput` — green → white on focus |

---

## 4. Interactive States

### Focus

- All interactive elements must have a visible focus style.
- Inputs: border changes to `green-mid` + background changes to `white` (standalone) or border only (list row inner input).
- Buttons: `focus-visible:ring-2 focus-visible:ring-green-pale` (see `Button` component).
- Never use `outline: none` without providing an alternative focus indicator.

### Hover

- Clickable rows/cards: `hover:bg-green-mist`
- Buttons: darken (`green-mid` → `green-deep`) or lighten depending on variant
- Delete/destructive icons: `hover:text-red-warn`
- Nav links: `hover:bg-[rgba(255,255,255,0.1)]` on dark nav background

### Disabled

- Opacity: `disabled:opacity-50`
- Cursor: `disabled:pointer-events-none`
- Save bar buttons use this pattern when there are no unsaved changes.

---

## 5. AI Assistant Panel

The AI assistant panel is a persistent, collapsible panel on the far right edge of every view. Its visual behavior differs subtly between views where no context dialog is open (e.g. Plants Overview, Calendar) and views where a context dialog is open alongside it (e.g. Plant Edit Dialog).

### 5.1 Structure

The assistant is wrapped in a `chat-wrap` container that holds two children in this fixed order: strip (left), panel (right).

### 5.2 Collapsed State (default)

Only the strip is visible. The panel has `width: 0`.

Strip width: **36px** (icon 20px + 8px padding each side). Strip color: `green-mid`. Clicking the strip opens the panel.

### 5.3 Open State

The panel slides in from the right and overlaps the strip via `z-index`. Only **4px** of the strip remains visible on its left edge, acting as a permanent visual separator. Panel width: **310px**. Total footprint: **314px**. Panel background: `green-mist` — visually distinct from the `warm-white` edit dialog.

### 5.4 Opening / Closing Animation

Toggled via `chat-wrap.open` class. Both elements animate simultaneously with `transition: width 0.3s ease`.

| Element | Closed | Open |
|---|---|---|
| `chat-wrap` | `width: 36px` | `width: 314px` |
| `chat-panel` | `width: 0` | `width: 310px` |

The panel uses `position: absolute; right: 0; z-index: 2` — it slides over the strip from right to left. The strip never changes width; it is progressively covered until only 4px remain. Closing reverses this: panel shrinks, strip re-emerges.

### 5.5 Close Control

When the panel is open, a **`›` chevron** in the panel header closes it. There is no ✕ close button. The chevron communicates directionality ("collapse to the right") rather than "dismiss". ✕ implies "remove" — the assistant is never removed, only hidden.

### 5.6 Strip Hover State

The strip responds to hover with a background color transition from `green-mid` to `green-light`:

```css
.chat-toggle { background: var(--green-mid); transition: background 0.2s; }
.chat-toggle:hover { background: var(--green-light); }
```

This applies in both states — whether the strip is at full width (36px, collapsed) or reduced to 4px (open). At 4px the hover area is narrow but still interactive, giving subtle visual feedback that the separator is clickable. The transition duration is `0.2s` — fast enough to feel responsive, slow enough to read as intentional.

### 5.7 Visual Differentiation from Edit Dialog

When the Plant Edit Dialog and the assistant panel are open simultaneously, two signals distinguish them:

| Signal | Edit Dialog | Assistant Panel |
|---|---|---|
| Background | `warm-white` | `green-mist` |
| Left edge | plain border | 4px `green-mid` strip (permanent) |

The 4px strip is the primary separator. The `green-mist` background is a secondary reinforcement. Chat bubbles (bot), the context bar, and the input field use `white` backgrounds inside the panel so they remain readable against `green-mist`.

### 5.8 Context Bar (Plant Edit view only)

A fixed bar below the panel header shows the plant currently being edited: `✏️ Bearbeite: 🌹 [Plant name]`. Background: `rgba(255,255,255, 0.85)`. The bar is always visible while scrolling and gives the assistant implicit context — the user never needs to name the plant again.

---

## 6. Component Patterns

### 6.1 Collapsible Section (`SettingsSection`)

Used in Settings view. Each section has:
- Icon (emoji, 20px)
- Title (14px, `font-semibold`, `text-text-dark`) — uses DM Sans, **not** Playfair Display
- Optional subtitle (11px, `text-text-light`)
- Expand/collapse toggle (▾ rotates 180° when open)

The section *title* is DM Sans because it is a UI control label, not a content heading. Playfair Display is reserved for content headings (plant names, page titles).

### 6.2 Save Bar Pattern

Settings-style views with deferred persistence (changes saved only on explicit user action) use a fixed bottom bar:

- Always visible while scrolling
- Greyed out (buttons disabled) when no changes are pending
- Active when `dirty === true`
- Shows status feedback after save attempt (success / error) with auto-clear

### 6.3 Dialog Action Buttons

Buttons in the footer bar of side-panel dialogs (Detail panel, Edit dialog) must follow these rules:

**Height:** Determined by a single line of text. Use `padding: 0 12px–18px` (horizontal only) combined with `line-height: "32px"` **or** `height: "32px"` with `display: flex; align-items: center`. Never use vertical padding (`padding: "8px"`) — this causes the button to grow to two lines when text wraps on narrow panels.

**Icon + Label:** Every action button must show an icon and a label. No icon-only or text-only buttons in dialog footers. Standard icon assignments:

| Action | Icon | Notes |
|---|---|---|
| Save / Confirm | `✓` | Unicode checkmark |
| Cancel / Close | `✕` | Unicode multiplication sign |
| AI Assistant | `💬` | Speech bubble emoji |
| Edit | `✏️` | Pencil emoji |

**Layout:** Always `display: flex; align-items: center; justify-content: center; gap: 4px`. Add `white-space: nowrap` to prevent unintended line breaks.

**Icon placement in JSX:** Render the icon as a `<span>` sibling of the translated label text. Do **not** embed icons in i18n strings — this keeps translations clean and icon swaps trivial.

```tsx
// ✅ correct
<button style={actionBtnStyle}>
  <span>✓</span>{t("edit.btn_save")}
</button>

// ❌ avoid — icon in i18n string
// "btn_save": "✓ Speichern"
```

**Consistent sizing across dialogs:** All dialog footer buttons — regardless of which panel they appear in — must use the same effective height. When both the Detail panel and Edit dialog are visible in sequence, their footer buttons must be visually indistinguishable in height.

---

### 6.4 List with Add/Delete (`ListEntry` + `AddRowButton`)

Pattern for user-managed lists:

```
[ ListEntry row ]
[ ListEntry row ]
[ + Add button  ]  ← dashed border, secondary style
```

The ➕ button uses a dashed border to visually distinguish it from existing rows. On click: appends an empty entry and focuses the new input.

---

## 7. Layout Conventions

| Token | Value | Element |
|---|---|---|
| `--height-nav` | `52px` | Top navigation bar |
| `--width-nav-logo` | `280px` | Logo area in nav |

Panel layout order (left → right) follows ADR-006:
1. Main content area (flex)
2. Detail/edit panel (fixed width, slides in from left or overlays)
3. AI chat panel (right edge, collapsible strip)

---

## 8. Writing Style (UI Text)

- All UI text is internationalized via `i18n` — no hardcoded strings in JSX.
- German is the primary language; English translations maintained in parallel.
- Labels are concise, sentence-case (not ALL CAPS except for section metadata labels at 10px).
- Destructive actions always require confirmation.
- Error messages are specific: say what went wrong, not just "An error occurred."

---

## 9. References

| File | Contents |
|---|---|
| `apps/frontend/src/index.css` | All design tokens (`@theme` block) |
| `apps/frontend/src/components/settings/FieldInput.tsx` | `FieldInput`, `FieldSelect`, `ListEntry`, `AddRowButton` |
| `apps/frontend/src/components/ui/button.tsx` | Button variants |
| `ui-mockups/` | Reference HTML mockups for all views |
| `docs/decisions/ADR-006*` | Panel layout order |
