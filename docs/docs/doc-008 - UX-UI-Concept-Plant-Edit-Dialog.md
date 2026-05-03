---
id: doc-008
title: UX/UI Concept - Plant Edit Dialog
type: other
created_date: '2026-05-03'
updated_date: '2026-05-03'
---

# UI Concept – Plant Edit Dialog

**Version:** 0.1  
**Last updated:** 2026-05-03

---

## 1. Purpose

The Plant Edit Dialog is the central interface for creating and editing individual plant records. It handles both adding a new plant and updating an existing one. The dialog opens alongside the AI assistant so the user can enter data manually, have the assistant pre-fill fields, or do both at the same time.

---

## 2. Context & Placement

- **Opened from:**
  - FAB (＋) in the Plants Overview → new plant, empty form
  - "Bearbeiten" button in the plant detail panel → existing plant, pre-filled form
  - AI assistant command ("Füge Rose hinzu" / "Bearbeite Rhododendron") → dialog opens, assistant fills what it knows
- **Replaces:** the detail panel in the Plants Overview; sits to the left while the garden plan occupies the center and the chat panel the right
- **Closes:** via "Abbrechen" or "✕ Schließen" — if unsaved changes are present, a confirmation prompt should be shown *(not yet implemented in mockup)*
- **Related views:**
  - Plants Overview (the underlying view; list stays visible in the background on the calendar, garden plan visible in center)
  - Garden Calendar (schedule data entered here appears directly there)
  - Dashboard garden plan (positions entered here appear as pins)

### Mockup

Interactive HTML mockup: `ui-mockups/plant-edit/plant-edit-mockup.html`

---

## 3. Layout & Structure

The dialog uses the same 3-column body layout as the Plants Overview, with the edit panel replacing the left detail panel:

```
┌──────────────────────────────────────────────────────────────────┐
│  🌿 GardenAssist  [ Dashboard ][ Plants ][ Calendar ][ Journal ] │
├────────────────────┬──────────────────────────────┬─────────────┤
│  ✏️ Rose bearb.    │                              │  🤖 Assistent│
│  ────────────────  │   Gartenplan                 │  ──────────  │
│  Grunddaten ▾      │   (pan/zoom, pick-mode)      │  ✏️ Bearbeite:│
│  Bilder ▾          │                              │  🌹 Rose     │
│  Positionen ▾      │              ↕ ↔ (zoom)      │  ──────────  │
│  Blütezeiten ▾     │                              │  Chat …      │
│  Wachstum ▾        │                              │             │
│  Blätter ▾         │                              │             │
│  Schnittzeiten ▾   │                              │             │
│  Düngezeiten ▾     │                              │             │
│  Sonstiges ▾       │                              │             │
│  ────────────────  │                              │             │
│  [Abbrechen][Spe.] │                              │             │
└────────────────────┴──────────────────────────────┴─────────────┘
```

### Zones in Detail

| Zone | Width | Content |
|---|---|---|
| **Edit panel** (left) | ~360px | All plant fields in collapsible sections; save/cancel at bottom |
| **Garden plan** (center) | flex (remaining) | Same pan/zoom plan as dashboard; pick-mode for position entry |
| **Chat panel** (right) | ~310px | AI assistant with fixed context pill showing the plant being edited |

---

## 4. AI Integration & Shared State

The edit dialog and the chat panel share the same plant data object in memory. This enables bidirectional interaction:

**Assistant → Dialog (push):**
- The assistant fills fields directly based on natural language: "Set location to Westbeet" → location field updates
- Newly filled entries get a 🤖 KI badge and a green border so the user can review before saving
- Suggested schedule entries (e.g. pruning dates) are shown with an "In Dialog übernehmen" button in the chat — clicking it scrolls to the relevant section and flashes it green

**Dialog → Assistant (pull):**
- Clicking "Assistent fragen" sends the current plant as context
- The user can ask: "When should I prune a rose?" → assistant answers; the user manually transfers the recommendation or asks "Übernehme das in den Dialog"

**Context pill:**
A fixed bar below the chat header always shows `✏️ Bearbeite: 🌹 [Plant name]`. The assistant uses this as implicit context for all messages while the dialog is open — the user never needs to name the plant again.

---

## 5. Sections & Fields

The edit panel is divided into collapsible sections. Each section has a colored accent dot matching its semantic color.

### 5.1 Grunddaten (Basic Data)

| Field | Type | Notes |
|---|---|---|
| **Icon** | Emoji picker | Auto-generated from Typ + Blütenfarbe (e.g. Strauch + Rot → 🌹); overridable via picker with 20 emoji options |
| **Name** | Text input | Common name |
| **Botanisch** | Text input | Botanical / Latin name |
| **Beschreibung** | Textarea | Free-form description; shown directly after name |
| **Typ** | Select | Strauch, Baum, Staude, Einjährig, Nadelbaum, Obstbaum, Kletterpflanze, Bodendecker |
| **Herkunftstyp** | Select | Native / Neophyt / Invasiver Neophyt |
| **Lifecycle** | Select | Mehrjährig / Einjährig / Zweijährig / Immergrün |
| **Standort** | Text input | Free text, e.g. "Westbeet" |
| **Bewässerungszone** | Select | Dropdown of configured irrigation zones; "– keine –" as default |
| **Anschaffungsdatum** | Date input | Purchase or planting date |
| **Preis** | Number input | Purchase price in € |
| **Sonnenbedarf** | Select | Sonnig / Halbschattig / Schattig |
| **Wasserbedarf** | Select | Gering / Mittel / Hoch |
| **Min. Temperatur** | Text input | e.g. "−15°C" |
| **Bodentyp** | Select | Lehmig / Sandig / Humusreich / Kalkhaltig / Sauer |
| **Gesundheitsstatus** | Select | Gut / Beobachten / Behandlung nötig |
| **Pflegehinweise** | Textarea | Free-form care notes |

**Auto-icon logic:** Typ + first bloom color → suggested emoji. Examples: Strauch + Rot → 🌹, Baum → 🌳, Nadelbaum → 🌲, Obstbaum → 🍎. The user can override via the emoji picker at any time.

### 5.2 Bilder (Images)

An open-ended list of images — any number can be uploaded. Each image entry consists of a thumbnail slot (click to upload) and a type dropdown: **Pflanze** / **Blüte** / **Blatt**. New entries are added via a ➕ button; each entry has a ✕ delete button.

The first image with type "Pflanze" is used as the thumbnail in the Plants Overview table and card views. Multiple images of the same type are allowed (e.g. bloom photos from different seasons).

### 5.3 Positionen im Plan (Positions)

| Element | Description |
|---|---|
| **Pick-mode button** | "📍 Klick-Modus aktivieren" — toggles crosshair cursor on the garden plan; each click on the plan adds a position entry |
| **Position rows** | Numbered list of X/Y coordinate pairs (0–100%); each row has ✕ delete; coordinates editable manually |
| **Add button** | "＋ Position hinzufügen" for manual entry |
| **Markers on plan** | Each position renders as a numbered pulsing dot on the garden plan at the corresponding coordinates |

Multiple positions are supported — a plant that appears as a row along a hedge or in multiple beds can have one entry per individual location.

### 5.4 Schedule Sections

Each of the following sections follows the same pattern: a list of interval entries, each with a week-range picker, an optional color picker, a label field, a notes field, and a ✕ delete button. A ➕ add button appears at the bottom of each section.

| Section | Color picker | Fixed color | Notes |
|---|---|---|---|
| **Blütezeiten** | ✅ Yes | — | Clicking a preset swatch auto-fills the label with the color name (e.g. "Dunkelrot"); multiple periods supported |
| **Wachstum** | ❌ No | `#2e7d32` dark green | Typically one period; multiple possible |
| **Blätter** | ✅ Yes | — | Designed for seasonal color phases; no entry = no foliage (e.g. deciduous tree in winter); preset swatches include seasonal names |
| **Schnittzeiten** | ❌ No | `#27ae60` green | Multiple windows per year typical (e.g. spring + summer) |
| **Düngezeiten** | ❌ No | `#2980b9` blue | Multiple windows per year typical |
| **Sonstiges** | ✅ Yes | — | Harvest, sowing, observation periods, etc. |

**Week-range picker:** Two linked dropdowns — each with 48 options (W1–W4 per month, January to December). Granularity is one week; displayed as "W2 Mär → W4 Mär".

**AI badge:** Entries inserted by the assistant carry a 🤖 KI badge and a green border so the user can identify and review them before saving.

**Section counter:** Each section header shows the current number of entries as a small pill.

### 5.5 Color Picker (for sections with color)

The color picker opens as a popup anchored to the color swatch button of each entry:

| Element | Description |
|---|---|
| **Preset swatches** | Type-specific presets with name labels below each swatch (e.g. "Frühjahrsgrün", "Dunkelrot") |
| **Hex input** | Free text field for custom hex value; synced with native picker and preview |
| **Native color picker** | `<input type="color">` — opens system color picker for visual mixing |
| **Preview swatch** | Small square showing current color, updates in real time |

Preset swatch lists are configurable in the app settings *(planned settings feature — not yet designed)*.

**Auto-label for bloom:** When a preset swatch is selected in the Blütezeiten section, the label field is automatically populated with the color name — if the field is still empty or contains a previous preset name.

---

## 6. Garden Plan (Center)

The center garden plan behaves identically to the Dashboard:

| Interaction | Behavior |
|---|---|
| **Scroll wheel** | Zoom in/out (free mode); pan H/V when a fit-mode is active |
| **Click + drag** | Pan the plan |
| **↕ button (toggle)** | Fit plan to available height; auto-refit on resize |
| **↔ button (toggle)** | Fit plan to available width; auto-refit on resize |
| **Both active** | Plan stretched to fill area |
| **Pick-mode active** | Cursor becomes crosshair; click adds position at that coordinate |
| **Position markers** | Numbered pulsing dots; counter-scaled to stay the same size at all zoom levels |

The zoom buttons are positioned fixed at bottom-right of the plan area, identical to the dashboard.

---

## 7. Interactions & States

### Interactions

- **Click section header** → section expands or collapses
- **Click icon preview** → emoji picker opens/closes
- **Click emoji in picker** → icon preview updates; picker closes
- **Change Typ dropdown** → icon auto-updates if no manual override
- **Click "📍 Klick-Modus aktivieren"** → button turns dark green, garden plan cursor changes to crosshair
- **Click on garden plan (pick-mode)** → position row added to list; numbered marker appears on plan; Positionen section scrolls into view
- **Edit X/Y inputs in position row** → marker on plan moves in real time
- **Click ✕ on position row** → row and marker removed
- **Click ➕ in schedule section** → new empty entry appended; label field focused
- **Click color swatch button** → color popup opens anchored to that button; others close
- **Select preset swatch (bloom)** → color applied; label auto-filled with color name
- **Select preset swatch (other)** → color applied; label not changed
- **Type in hex input** → color and native picker update live
- **Use native color picker** → hex input and preview update live
- **Click "In Dialog übernehmen" in chat** → relevant section opens, flashes green, AI entries appear with 🤖 badge
- **Click "Speichern"** → saves plant data *(not yet implemented in mockup)*
- **Click "Abbrechen" / "✕ Schließen"** → dialog closes *(confirmation prompt for unsaved changes: not yet implemented)*

### States

- **New plant** – all fields empty; icon shows auto-suggestion based on default type
- **Existing plant** – all fields pre-filled from saved data
- **AI pre-filled** – fields filled by assistant shown with green border and 🤖 indicator
- **Pick-mode active** – plan cursor is crosshair; mode button is dark green
- **Unsaved changes** – *(not yet indicated in mockup; save button could show a dot)*
- **Saving** – *(not yet defined)*
- **Error (validation)** – *(not yet defined)*

---

## 8. Not Yet Implemented (Mockup Placeholders)

- **Save action** – "Speichern" shows an alert; no data is persisted
- **Image upload** – slots show placeholder emojis; no file picker connected
- **Unsaved changes guard** – closing the dialog does not prompt for confirmation
- **Validation** – required fields (Name) not yet enforced
- **AI push integration** – "In Dialog übernehmen" flashes the section but does not actually write entries; full state sharing between chat and form is not yet wired

---

## 9. Open Questions

- [ ] Should the dialog open as a full overlay on mobile (tablet breakpoint) rather than a side panel?
- [ ] Irrigation zones: are these configured globally in settings, or per-garden-plan?
- [ ] Should "Speichern" trigger immediate sync to the garden plan (pins) and calendar (bars), or is there a separate refresh cycle?
- [ ] Should the assistant be able to identify a plant from a photo uploaded in the Bilder section and pre-fill fields automatically?
- [ ] How should week ranges that span year-end (e.g. W3 Dez → W2 Jan) be handled?

---

## 10. Out of Scope for this Dialog

- Bulk editing of multiple plants at once
- Deleting a plant (separate confirmation flow)
- Viewing the plant's journal entries (visible in Journal view)
- Viewing tasks derived from this plant's schedule (visible in Dashboard and Plants Overview)
