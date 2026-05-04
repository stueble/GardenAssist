---
id: decision-003
title: ADR-003 - Plant Images and Icons
date: '2026-05-03'
updated_date: '2026-05-04'
status: Accepted
---

## Context

Plants need a visual representation at two levels: a small icon used in pins
and list views, and one or more full images (photo, bloom, leaf) used in the detail
panel and plant edit dialog. The source of these assets and their display logic
needed to be defined.

## Decision

**Icon:**
Each plant has an SVG icon selected from the app's icon library. The AI assistant
suggests an appropriate SVG shape based on the plant's name and care data
(e.g. rose shape for roses, tree shape for trees). The color is not stored in the
icon — it is derived at render time from the plant's bloom or foliage schedules,
so that plants of the same type but different colors are visually distinct.
The user can override the icon via the icon picker in the Plant Edit Dialog.

Note: the current mockup (Plant Edit Dialog) still shows an emoji picker — this
predates the SVG decision and will be updated during implementation.

**Plant Attachments:**
Any source is valid — user-uploaded photos, screenshots, AI-generated images, or
PDFs (e.g. invoices, care instructions). Attachments are uploaded in the Plant
Edit Dialog and categorized as: main, bloom, leaf, problem, or invoice.

All attachments associated with a plant are shared with the Journal — images added
in the journal for a plant are visible in Plant.attachments[] and vice versa.

**Thumbnail:**
The first attachment in Plant.attachments[] (by insertion order) is used as the
thumbnail in the Plants Overview and all list views — regardless of category.
The user can control which attachment appears first via Plant.thumbnail_attachment_id.

## Consequences

- No integration with an external plant database or image search API is required.
- The AI assistant selects an SVG shape from the app's icon library; the icon
  library must be defined during implementation.
- Icon color is derived at render time from schedules — no color field on the icon.
- Attachments are shared between the Plant Edit Dialog and the Journal — no
  duplicate uploads needed.
- Accepted formats: PNG, JPG, WebP, PDF.
- File size limit is configurable in Settings (attachment_size_limit_mb).
- Binary files are stored on the local file system; only the relative URL is
  stored in the database (see ADR-008).
