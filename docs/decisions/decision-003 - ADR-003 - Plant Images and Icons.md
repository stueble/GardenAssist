---
id: decision-003
title: ADR-003 - Plant Images and Icons
date: '2026-05-03'
status: Accepted
---

## Context

Plants need a visual representation at two levels: a small icon/emoji used in pins
and list views, and one or more full images (photo, bloom, leaf) used in the detail
panel and plant edit dialog. The source of these assets needed to be defined.

## Decision

**Icon / Emoji:**
The AI assistant automatically suggests an icon based on plant type and attributes
(e.g. Strauch + Rot → 🌹). The user can accept the suggestion or override it manually
at any time via the emoji picker in the Plant Edit Dialog.

**Plant Images:**
Any source is valid — user-uploaded photos, screenshots, AI-generated images, or
images sourced externally. Images are uploaded directly in the Plant Edit Dialog
(section: Bilder) and categorized as Pflanze / Blüte / Blatt. The first image of
type "Pflanze" is used as the thumbnail in Plants Overview.

## Consequences

- No integration with an external plant database or image search API is required.
- The AI assistant needs logic to derive an icon suggestion from plant type and
  bloom color.
- Image storage is local (see Settings → Daten & Backup).
- Accepted formats, size limits, and storage path are to be defined during
  implementation.
