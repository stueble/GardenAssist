---
id: doc-009
title: 009 - UX/UI Concept - Settings
type: other
created_date: '2026-05-03'
updated_date: '2026-05-04 17:07'
---
# UI Concept – Settings

**Version:** 0.1  
**Last updated:** 2026-05-03

---

## 1. Purpose

The Settings view is the central configuration area of the application. It lets the user manage everything that applies globally to the whole garden — the plan image, location, irrigation zones, plant categories, color presets, AI configuration, and data backup. Settings changes take effect only after explicit saving.

---

## 2. Context & Placement

- **Accessed via:** ⚙️ icon in the top-right of the navigation bar (present in all views)
- **Not part of the main tab navigation** — the four nav links (Dashboard, Plants, Calendar, Journal) remain visible; the settings icon replaces the active state
- **Related views:**
  - Plant Edit Dialog (consumes irrigation zones, plant categories, and color presets configured here)
  - Dashboard (consumes garden plan image and location for weather/frost warnings)

### Mockup

Interactive HTML mockup: `ui-mockups/settings/settings-mockup.html`

---

## 3. Layout & Structure

The settings view is a single scrollable column of collapsible sections, centered with a max-width. A fixed save bar at the bottom holds the Discard and Save actions.

```
┌──────────────────────────────────────────────────────────────┐
│  🌿 GardenAssist  [ Dashboard ][ Plants ][ Calendar ][ Journal ]  ⚙️ │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚙️ Einstellungen                                            │
│  Gartenplan, Farben, Zonen und weitere Konfigurationen       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🗺️  Gartenplan                                  ▾   │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  📍  Standort                                    ▾   │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  💧  Bewässerungszonen                           ▾   │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  📂  Pflanzenkategorien                          ▾   │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  🎨  Farb-Presets                                ▾   │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  🤖  KI-Assistent                                ▾   │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  💾  Daten & Backup                              ▾   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Änderungen werden erst nach dem Speichern übernommen        │
│                                              [Verwerfen] [Speichern] │
└──────────────────────────────────────────────────────────────┘
```

### Zones in Detail

| Zone | Content |
|---|---|
| **Page header** | Title "⚙️ Einstellungen" + subtitle |
| **Section list** | Collapsible cards; each with icon, title, subtitle, and expand toggle |
| **Save bar** (fixed bottom) | Hint text + Discard + Save buttons; always visible while scrolling |

---

## 4. Sections & Fields

### 4.1 Gartenplan (Garden Plan)

Manages the background image used in the dashboard and plant edit dialog.

| State | Display |
|---|---|
| **Image uploaded** | Preview row: thumbnail + filename + file size + dimensions + upload date; ✕ to remove |
| **No image** | Dashed upload dropzone: drag & drop or click to open file picker |

- Accepted formats: PNG, JPG, SVG
- Recommended minimum width: 2000 px
- Plant positions are stored as percentages and are preserved when the image is replaced
- Removal switches back to the dropzone

### 4.2 Standort (Location)

Two fields side by side: **Ort / Stadt** (free text) and **Postleitzahl** (free text).

Used for weather data and frost warnings in the dashboard. Weather integration is planned for a future version — this field is captured now so it is available when needed.

### 4.3 Bewässerungszonen (Irrigation Zones)

A list of irrigation zone names. Each entry has:
- An editable free-text name input
- A ✕ delete button

A ➕ button appends a new empty entry. Zone names and their order are entirely up to the user — no auto-assigned IDs. Zone names appear as dropdown options in the Plant Edit Dialog (Bewässerungszone field).

### 4.4 Pflanzenkategorien (Plant Categories)

A flat list of category names. Each entry has an editable name input and a ✕ delete button. A ➕ button appends a new empty entry.

These are the options that appear in the **Kategorie** dropdown in the Plant Edit Dialog. The list is entirely under user control — no protected defaults, no minimum entries. The user can replace all values, add freely, or leave the list empty.

### 4.5 Farb-Presets (Color Presets)

Three sub-groups, each with their own list of preset entries:

| Group | Used in |
|---|---|
| 🌸 Blütezeiten | Bloom period entries in Plant Edit Dialog |
| 🍃 Blätter | Foliage period entries in Plant Edit Dialog |
| 📋 Sonstiges | Miscellaneous schedule entries in Plant Edit Dialog |

Each preset entry consists of:
- A **color preview swatch** (updates live)
- An **editable name field** (e.g. "Dunkelrot", "Frühjahrsgrün")
- A **native color picker** (`<input type="color">`) — opens the system color picker
- A ✕ delete button

A ➕ button appends a new entry with a random default color. Changes here are reflected immediately in the color picker popups of the Plant Edit Dialog.

Growth, pruning, and fertilization schedules use fixed semantic colors and have no configurable presets.

### 4.6 KI-Assistent

| Field | Type | Notes |
|---|---|---|
| **API-Schlüssel** | Password input + test button | Stored locally only; never transmitted; masked by default; "🔌 Verbindung testen" sends a minimal test request and shows inline success/error feedback |
| **Modell** | Select | claude-sonnet-4-6 (recommended) · claude-opus-4-6 · claude-haiku-4-5 |

### 4.7 Daten & Backup

Three sub-groups:

**Export**
- "Alle Daten als JSON exportieren" — full data dump
- "Pflanzenliste als CSV" — plants only, for use in spreadsheets

**Import**
- "JSON importieren" — merges with existing data, does not overwrite

**Zurücksetzen**
- "Alle Daten löschen" — destructive action with confirmation dialog; user is advised to export first

---

## 5. Interactions & States

### Interactions

- **Click section header** → section expands or collapses; chevron rotates
- **Drag file onto dropzone / click dropzone** → file picker opens; on selection: preview row replaces dropzone; save bar activates
- **Click ✕ on plan preview** → preview removed; dropzone appears; save bar activates
- **Click ✕ on zone / category / preset entry** → entry removed; save bar activates
- **Click ➕ button** → new empty entry appended; name input focused; save bar activates
- **Any input change** → save bar activates (buttons enabled, hint text updates)
- **Interact with native color picker** → preview swatch updates live; hex value synced; save bar activates
- **Click "🔌 Verbindung testen"** → button shows "⏳ Teste …" while checking; shows ✅ success or ❌ error message below the field
- **Click "Verwerfen"** → confirmation dialog: "Alle ungespeicherten Änderungen verwerfen?"; on confirm: all changes reverted, save bar greys out
- **Click "Speichern"** → changes persisted; save bar greys out; hint returns to "Keine ungespeicherten Änderungen"

### States

| State | Save bar | Hint text |
|---|---|---|
| **No changes** | Greyed out (buttons disabled) | "Keine ungespeicherten Änderungen" |
| **Unsaved changes** | Active (buttons enabled) | "Ungespeicherte Änderungen vorhanden" |
| **After save** | Greyed out | "Keine ungespeicherten Änderungen" |

- **No garden plan uploaded** – dropzone visible instead of preview row
- **Empty list (zones / categories / presets)** – list area empty; ➕ button still visible

---

## 6. Open Questions

- [ ] Should the API key field have a show/hide toggle for the masked value?
- [ ] Should irrigation zone names have any length limit or character restrictions?
- [ ] Should import warn the user if the incoming data contains plants with the same name as existing ones?

**Resolved:**
- [x] Save bar is always visible, but greyed out (buttons disabled) when no changes have been made.
- [x] API key section includes a "Verbindung testen" button with inline success/error feedback.
- [x] Clicking "Verwerfen" triggers a confirmation dialog before discarding changes.
- [x] Irrigation zones are fully user-controlled free text — no auto-assigned letter IDs in the name.
- [x] Plant categories are fully user-controlled — no protected default entries.

---

## 7. Out of Scope for this View

- Per-plant settings (handled in Plant Edit Dialog)
- User account / authentication (single-user app, out of scope)
- Notification settings (future feature per PRD)
- Theme / appearance settings (single design, not configurable in v1)
- Language settings (German only in v1)
