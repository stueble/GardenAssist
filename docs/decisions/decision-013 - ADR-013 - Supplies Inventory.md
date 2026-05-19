---
id: decision-013
title: ADR-013 - Supplies Inventory
date: '2026-05-17'
status: Accepted
---

## Context

Users maintain a collection of garden products (fertilizers, pesticides, herbicides,
fungicides, soil amendments, etc.) that they use throughout the season. Currently
the AI assistant has no knowledge of which specific products the user owns, limiting
its ability to give product-specific advice. For example, when recommending nitrogen
fertilization for a lawn, the assistant cannot tell whether the user's specific
product is suitable or not.

Two approaches were considered for enriching the assistant's context with product
knowledge:

- **Unstructured notes:** The user describes their products as free text in a
  general notes field. Simple, but not queryable and hard to maintain.
- **Structured inventory:** A dedicated data model for supplies with typed fields
  for category, ingredients, and EAN, passed as structured context to the assistant.

## Decision

A **Supplies Inventory** is introduced as a first-class feature, separate from the
plant and journal data models.

### Data Model

Each supply record contains:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | string | Product name / brand |
| `category` | string | References a user-configurable category list in Settings (see below) |
| `ean` | string? | Optional EAN/barcode; serves as a persistent product identifier |
| `ingredients` | `{ name, amount, unit }[]` | Structured list; e.g. `[{ name: "N", amount: 12, unit: "%" }]` |
| `location` | string? | Free text; e.g. "Basement shelf left" |
| `description` | string? | Free text; purpose, dosage instructions, warnings, use cases |
| `created_at` | ISO 8601 | |
| `updated_at` | ISO 8601 | |

Ingredients are stored in a separate `supply_ingredients` table (normalized,
foreign key to `supplies`).

### Categories

Supply categories are user-configurable in Settings, following the same pattern
as plant categories and irrigation zones. Default values:

`Fertilizer`, `Herbicide`, `Pesticide`, `Fungicide`, `Insecticide`,
`Soil Amendment`, `Other`

Deleting a category does not cascade to supplies — the category value is stored
as a plain string (same pattern as `Plant.category`).

### AI Assistant Context

All supplies are passed as structured context to the AI assistant on every
request, alongside garden and plant data. The assistant can:

- Reference specific products by name and category
- Use ingredient data (e.g. NPK values, active substances) for product-specific
  recommendations
- Use the EAN to look up additional product information from the web if the
  assistant has web search capabilities

The inventory is an **enrichment layer** — all assistant functionality remains
fully operational when no supplies are defined.

### Navigation

- **Desktop:** "Supplies" added as a new entry in the main navigation bar
- **Mobile:** "Supplies" added as an entry in the left drawer, alongside Settings

### UI Pattern

The Supplies feature follows the established Plants Overview pattern:

- `InventoryListView` (desktop) — table with columns: Name, Category, Location;
  live search; detail panel slides in from the right, left of the AI assistant strip
- `InventoryDetailContent` — shared component embedded in both the desktop
  detail panel and the mobile fullscreen view
- `MobileInventoryView` — list view; tapping a row opens `MobileInventoryDetailView`
- `MobileInventoryDetailView` — dedicated fullscreen view (same pattern as
  `MobilePlantDetailView`, TASK-089)
- `InventoryEditDialog` — shared modal for create and edit, used on both
  desktop and mobile

### Out of Scope for v1

- Barcode scanning (camera-based EAN capture)
- Automatic product lookup via EAN at creation time
- JSON import with preview/edit step (separate TASK-096)
- Quantity / stock management
- Expiry date tracking
- Linking supplies to specific journal entries or tasks

## Consequences

- A new `supplies` table and `supply_ingredients` table are added to the database
  schema; a Drizzle migration is required.
- `docs/api/supply.ts` is added as the authoritative type definition.
- The AI assistant context builder must be extended to include supplies data.
- Settings gain a new `supply_categories` field (string array), following the
  existing pattern for `plant_categories` and `irrigation_zones`.
- The inventory is purely additive — no existing features are affected when
  supplies are empty.
- EAN is stored as a plain string; validation (format, checksum) is left to
  the client and is not enforced at the database level.
