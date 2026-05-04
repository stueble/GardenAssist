---
id: doc-010
title: 010 - Data Model
type: other
created_date: '2026-05-03'
updated_date: '2026-05-04 22:12'
---
# Data Model – GardenAssist

**Version:** 0.4
**Status:** Work in progress
**Last updated:** 2026-05-04

---

## 1. API and Design Decisions

### API Specification

The authoritative API specification lives in `docs/api/*.ts` as TypeScript types
and interfaces with JSDoc comments. The API is the contract between the backend
and the frontend — the database model exists to serve it.

Key files:

| File | Description |
|---|---|
| `api.ts` | All API methods (getGarden, createPlant, etc.) |
| `plant.ts` | Plant type and all plant-related enums |
| `schedule.ts` | Schedule type and ScheduleType enum |
| `task.ts` | Derived Task type (read-only, never persisted) |
| `journal-entry.ts` | JournalEntry type |
| `attachment.ts` | Attachment type (images and PDFs) |
| `color-preset.ts` | ColorPreset type |
| `garden.ts` | Garden root object |
| `settings.ts` | Settings type |
| `plant-position.ts` | PlantPosition type |

### Key Design Decisions

**API vs. Database model:**
The API delivers assembled, nested objects (e.g. `Plant` includes `positions[]`,
`schedules[]`, `tasks[]`, `attachments[]`, `journal_entries[]`). The database
stores these as normalized, flat tables with foreign keys. The backend service
layer is responsible for mapping between the two.

**Derived data:**
`Task` objects are never persisted. They are computed at query time by expanding
`Schedule` records into weekly occurrences and subtracting resolved `JournalEntry`
records. See ADR-005.

**Attachments:**
Images and PDFs share a single `attachments` table. The `attachment_type` column
is derived server-side from the file's MIME type — never set by the client.
Binary files are stored on the local file system; only the relative URL is stored
in the database. See ADR-003.

**Dangling references:**
`Plant.watering_zone` and `Plant.category` reference values from `Settings` as
plain strings — no foreign key. Deleting a zone or category does not cascade to
plants. This is intentional — see `docs/api/plant.ts`.

**Color presets:**
`ColorPreset` records are stored as rows in the database but managed as part of
`Settings` in the API (always read and written as a complete list).

For full architectural context see `docs/decisions/`:
- ADR-004: Local-First, On-Premise Deployment
- ADR-005: Ephemeral Tasks and Journal as Persistent Protocol
- ADR-007: API Specification in TypeScript
- ADR-008: SQL Relational Database

---

## 2. Database Schema

All tables use UUID primary keys (stored as TEXT). Timestamps are stored as
ISO 8601 strings. Boolean values are stored as INTEGER (0/1).

---

### plants

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `name_common` | TEXT | NOT NULL | |
| `name_botanical` | TEXT | | |
| `icon` | TEXT | | SVG string |
| `origin_type` | TEXT | | Enum: native, neophyte, invasive_neophyte |
| `category` | TEXT | | Free string; references Settings.plant_categories |
| `lifecycle` | TEXT | | Enum: annual, biennial, perennial, evergreen |
| `description` | TEXT | | |
| `care_notes` | TEXT | | |
| `sun_demand` | TEXT | | Enum: sunny, partial_shade, shady |
| `water_demand` | TEXT | | Enum: low, medium, high |
| `soil_type` | TEXT | | Enum: loamy, sandy, humus_rich, calcareous, acidic |
| `frost_tolerance_min_c` | INTEGER | | |
| `temperature_protected` | INTEGER | NOT NULL DEFAULT 0 | Boolean |
| `health_status` | TEXT | | Enum: good, watch, needs_treatment |
| `location` | TEXT | | |
| `watering_zone` | TEXT | | Free string; references Settings.irrigation_zones |
| `purchase_date` | TEXT | | ISO 8601 date |
| `purchase_price` | REAL | | |
| `thumbnail_attachment_id` | TEXT | FK → attachments.id | Nullable |
| `created_at` | TEXT | NOT NULL | ISO 8601 datetime |
| `updated_at` | TEXT | NOT NULL | ISO 8601 datetime |

---

### plant_positions

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `plant_id` | TEXT | NOT NULL, FK → plants.id ON DELETE CASCADE | |
| `x_percent` | REAL | NOT NULL | 0–100 |
| `y_percent` | REAL | NOT NULL | 0–100 |

No sort_order — display order in the UI is determined by insertion order.

---

### schedules

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `plant_id` | TEXT | NOT NULL, FK → plants.id ON DELETE CASCADE | |
| `schedule_type` | TEXT | NOT NULL | Enum: bloom, growth, foliage, pruning, fertilization, misc |
| `start_week` | INTEGER | NOT NULL | 1–52 |
| `end_week` | INTEGER | NOT NULL | 1–52; if < start_week: wraps across year-end |
| `color` | TEXT | | Hex string, e.g. #8B0000 |
| `label` | TEXT | | |
| `notes` | TEXT | | |
| `created_at` | TEXT | NOT NULL | ISO 8601 datetime |
| `updated_at` | TEXT | NOT NULL | ISO 8601 datetime |

---

### journal_entries

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `plant_id` | TEXT | FK → plants.id ON DELETE SET NULL | Nullable |
| `schedule_id` | TEXT | FK → schedules.id ON DELETE SET NULL | Nullable |
| `week` | TEXT | | ISO 8601 week, e.g. 2026-W12 |
| `entry_type` | TEXT | NOT NULL | Enum: manual, done, skipped |
| `date` | TEXT | NOT NULL | ISO 8601 date |
| `title` | TEXT | | |
| `notes` | TEXT | | |
| `created_at` | TEXT | NOT NULL | ISO 8601 datetime |
| `updated_at` | TEXT | NOT NULL | ISO 8601 datetime |

---

### attachments

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `owner_type` | TEXT | NOT NULL | Enum: plant, journal_entry, garden |
| `owner_id` | TEXT | | UUID; null for garden attachments |
| `attachment_type` | TEXT | NOT NULL | Enum: image, pdf; derived server-side from MIME type |
| `category` | TEXT | | Enum: main, bloom, leaf, problem, invoice |
| `url` | TEXT | NOT NULL | Relative path to binary file |
| `created_at` | TEXT | NOT NULL | ISO 8601 datetime |

---

### journal_entry_attachments

Junction table linking journal entries to attachments.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `journal_entry_id` | TEXT | NOT NULL, FK → journal_entries.id ON DELETE CASCADE | |
| `attachment_id` | TEXT | NOT NULL, FK → attachments.id ON DELETE CASCADE | |

Primary key: (`journal_entry_id`, `attachment_id`)

---

### color_presets

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `schedule_type` | TEXT | NOT NULL | Enum: bloom, growth, foliage, pruning, fertilization, misc |
| `name` | TEXT | NOT NULL | |
| `color` | TEXT | NOT NULL | Hex string |
| `sort_order` | INTEGER | NOT NULL | Display order within schedule_type group |

Note: managed via the Settings API — always read and written as a complete list.

---

### garden

Single-row table (always exactly one record).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | Fixed value: 'garden' |
| `plan_url` | TEXT | | Relative path to plan image |
| `plan_name` | TEXT | | |

---

### settings

Single-row table (always exactly one record).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | Fixed value: 'settings' |
| `language` | TEXT | NOT NULL DEFAULT 'de' | Enum: de, en; UI display language |
| `location_city` | TEXT | | |
| `location_zip` | TEXT | | |
| `irrigation_zones` | TEXT | | JSON array of strings |
| `plant_categories` | TEXT | | JSON array of strings |
| `task_lookback_weeks` | INTEGER | NOT NULL DEFAULT 2 | |
| `task_lookahead_weeks` | INTEGER | NOT NULL DEFAULT 4 | |
| `attachment_size_limit_mb` | INTEGER | NOT NULL DEFAULT 10 | |
| `ai_provider` | TEXT | | Enum: anthropic, openai, openrouter |
| `ai_model` | TEXT | | |
| `ai_api_key` | TEXT | | Stored locally only |

---

## 3. Entity Relationships

```
garden (singleton)
  └── attachments (owner_type = 'garden')

plants
  ├── plant_positions (CASCADE DELETE)
  ├── schedules (CASCADE DELETE)
  ├── attachments (owner_type = 'plant', CASCADE DELETE)
  └── journal_entries (ON DELETE SET NULL → plant_id becomes null)

journal_entries
  ├── schedules (ON DELETE SET NULL → schedule_id becomes null)
  └── attachments (via journal_entry_attachments junction table)

color_presets
  └── (managed as part of settings API; no FK to settings table)

settings (singleton)
```

---

## 4. Derived Data (not persisted)

| Derived | Computed from |
|---|---|
| `Task[]` | `schedules` expanded into weekly occurrences minus resolved `journal_entries` (type done or skipped, matching schedule_id and week) |
| Open task count per month | Aggregated from derived tasks across all plants |
| Last pruning / fertilization date | Most recent `journal_entries` of type done with matching schedule_type |
