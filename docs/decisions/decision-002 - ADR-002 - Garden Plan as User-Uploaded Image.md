---
id: decision-002
title: ADR-002 - Garden Plan as User-Uploaded Image
date: '2026-05-03'
status: Accepted
---

## Context

The app needs a visual garden plan as the central reference for plant positions.
Options considered: interactive drawing canvas, map integration, or a simple image upload.
The image generation itself is out of scope for the application — users have many
existing options: a photo of their garden, a maps screenshot, a hand-drawn scan,
or an AI-generated image.

## Decision

The garden plan is a static image uploaded by the user (PNG, JPG, or SVG).
Generation of the image happens entirely outside the app. Plant positions are stored
as X/Y percentage coordinates relative to the image dimensions, making them
resolution-independent and preserved when the image is replaced.
The upload and management of the image is handled in Settings → Gartenplan.

## Consequences

- No in-app drawing or editing tools are needed.
- The app is decoupled from any map or image-generation service.
- Plant positions stay valid when the user swaps the plan image (e.g. same garden,
  higher resolution or updated layout).
- Image storage is local (see Settings → Daten & Backup).
