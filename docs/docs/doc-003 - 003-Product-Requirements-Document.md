---
id: doc-003
title: 003 - Product Requirements Document
type: other
created_date: '2026-05-02 13:55'
updated_date: '2026-05-04 17:06'
---
# Product Requirements Document

**Version:** 0.2
**Status:** Work in progress
**Last updated:** 2026-05-03

---

## 1. Vision

GardenAssist is an AI-powered web application that helps hobby gardeners manage their garden efficiently and enjoyably. It brings together plant knowledge, task management, seasonal planning, and a conversational AI assistant in a single, coherent interface.

The core idea: the AI does the heavy lifting. Users should be able to describe their garden in natural language, ask questions, and get things done — without filling in forms or consulting external sources.

## 2. Target User

A single-user application for hobby gardeners who:
- maintain a personal garden with a variety of plants
- want to keep track of care tasks without a lot of overhead
- appreciate guidance and explanations, not just reminders
- are comfortable using a web app and chatting with an AI

> Multi-user and collaborative features are explicitly out of scope for the initial version.

## 3. Goals

- Provide a clear, always up-to-date overview of the garden and its plants
- Reduce the mental effort of tracking what needs to be done and when
- Make plant knowledge accessible through conversation, not just documentation
- Enable gradual data entry — the garden doesn't need to be fully set up before the app is useful

## 4. Features

### 4.1 Plant Management
A structured overview of all plants in the garden.

Each plant record includes:
- Name (common and botanical)
- Type: Grass, Tree, Shrub, Flower
- Description: Free text
- Category: Native, Neophyt, Invasive neophyt
- Care details:
  - pruning schedule(s) (unit: weeks)
  - fertilization cycle(s) (unit: weeks)
  - pest control schedule(s) (unit: weeks)
  - misc schedule(s) (unit: weeks) e.g., aerification, scarification, etc.
  - bloom period(s) (unit: weeks)
  - growth period(s) (unit: weeks)
  - frost tolerance(s) (unit: temp °C)
  - water demand
  - sun demand: full, half, shady
  - soil requirement(s)
  - lifecycle: annual, biennial, perennial
  - temperature protected/inside (bool)
- Visual attributes: flower color, leaf color, growth habit
- Current state: age, health status, location, watering section
- Images: general photo, flower photo, leaf photo (PNG, JPG, WebP; size limit configurable in Settings)
- Position(s) on garden plan (stored as X/Y percentage coordinates)
- Purchasing: date, price

**Views:**
- Table view (default visible columns fixed in v1; column selector deferred to v2)
- Google-style filter/search
- Detail panel on row click (read-only; edit via Plant Edit Dialog)

### 4.2 Task Management
Tasks are ephemeral — derived from plant care schedules for the current time window,
not stored as independent objects (see ADR-005).

- Distinguish between: overdue, current, and upcoming tasks
- Mark tasks as done → creates a journal entry automatically
- Skip tasks → creates a journal entry automatically

### 4.3 Garden Calendar
A Gantt-style seasonal overview with months as columns and plants as rows.

Switchable sub-views: Bloom period, Growth period, Pruning window, Fertilization period, Foliage.

Current month highlighted with a vertical line.

Schedule intervals that span year-end are supported: if `start_week > end_week`, the interval wraps across the calendar year.

Additionally: a compact monthly band (12 months) for the dashboard showing at a glance which months have tasks, with details on hover.

### 4.4 Visual Garden Plan
The garden plan is a static image uploaded by the user (PNG, JPG, or SVG; see ADR-002).
Plant positions are stored as X/Y percentage coordinates relative to the image dimensions.

- Plant pins (emoji + ring) on the plan surface
- Hover: quick summary (name, current status, next task)
- Click pin → open plant detail panel
- Click table row → highlight plant in garden plan

### 4.5 AI Assistant
A conversational assistant embedded in the application. Provider-agnostic — users
configure their own API key (Anthropic, OpenAI, or OpenRouter; see ADR-001).

Capabilities:
- Answer questions about plants, care routines, and gardening best practices
- Explain *why* a task is recommended at a given time ("Explain mode")
- Add, update, or remove plant data through natural language
- Propose plant data that the user confirms via "In Dialog übernehmen"
- Propose journal entries that the user confirms via "In Journal übernehmen"
- Analyze uploaded documents (e.g. care instructions, plant tags)
- Provide context-aware advice (e.g. "my rose leaves are turning yellow")

The assistant has access to the user's garden data as context for all interactions.

### 4.6 Garden Journal
A chronological diary of gardening activities and observations.

- Completed and skipped tasks are automatically converted into journal entries
- Free-form manual entries for observations, problems, and milestones
- Each entry optionally references a plant and/or the schedule that triggered it
- AI-proposed entries are confirmed by the user before being persisted
- Entries are editable after saving
- Plant search/filter uses a searchable dropdown
- Photos can be attached (PNG, JPG, WebP; size limit configurable in Settings)

### 4.7 Dashboard
The primary entry point of the application, combining:
- Hints & warnings (e.g. frost risk, overdue tasks)
- Open and upcoming task list
- Garden plan (visual, interactive)
- Monthly task band (compact 12-month overview)
- AI chat window

## 5. UI Principles

*(Details in the separate UI Concept documents)*

- Single-page web application, German UI language
- Clean, calm design — the garden should feel like the main character
- Mouse-over interactions for contextual details (tasks, plant info)
- The AI chat is always accessible, not hidden in a submenu
- On-premise installable; works fully offline (except AI calls; see ADR-004)

## 6. Future Ideas *(not in scope for v1)*
These are captured here to avoid losing them, but will not drive initial development:

- **Column selector** – configurable visible columns in the Plants table
- **Clickable calendar bars** – direct interval editing from the Calendar view
- **Tablet / mobile layout** – Plant Edit Dialog as full overlay on tablet; mobile-optimized views
- **Plant identification from chat** – upload a photo in the AI chat; assistant identifies the plant and pre-fills the Plant Edit Dialog
- **Plant identification from Bilder section** – assistant identifies a plant from a photo uploaded in the Plant Edit Dialog and pre-fills fields automatically
- **Cost tracking** – running expense sum derived from "Ausgabe" journal entries
- **Receipt upload** – upload a receipt to generate a pre-filled expense journal entry; AI extracts items and price
- **Drop photo to journal** – drop a picture onto the journal view to create a pre-filled entry with the photo attached
- **Weather integration** – current conditions, frost warnings, rain forecast, watering recommendations
- **Calendar sync** – export tasks to external calendar apps
- **Email / push notifications** – reminders for upcoming or overdue tasks
- **Multi-device sync** – share garden data across devices

## 7. Out of Scope
- Multi-user or collaborative features
- E-commerce (buying plants, tools)
- Integration with smart garden hardware
- Public plant database contributions
