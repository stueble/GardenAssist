---
id: doc-003
title: Product Requirements
type: other
created_date: '2026-05-02 20:42'
updated_date: '2026-05-03 20:07'
---
# Product Requirements Document – GardenAssist

**Version:** 0.1 (Draft)
**Status:** Work in progress
**Last updated:** 2026-05-02

---

## 1. Vision

GardenAssist is an AI-powered web application that helps hobby gardeners manage their garden efficiently and enjoyably. It brings together plant knowledge, task management, seasonal planning, and a conversational AI assistant in a single, coherent interface.

The core idea: the AI does the heavy lifting. Users should be able to describe their garden in natural language, ask questions, and get things done — without filling in forms or consulting external sources.

---

## 2. Target User

A single-user application for hobby gardeners who:
- maintain a personal garden with a variety of plants
- want to keep track of care tasks without a lot of overhead
- appreciate guidance and explanations, not just reminders
- are comfortable using a web app and chatting with an AI

> Multi-user and collaborative features are explicitly out of scope for the initial version.

---

## 3. Goals

- Provide a clear, always up-to-date overview of the garden and its plants
- Reduce the mental effort of tracking what needs to be done and when
- Make plant knowledge accessible through conversation, not just documentation
- Enable gradual data entry — the garden doesn't need to be fully set up before the app is useful

---

## 4. Features

### 4.1 Plant Management

A structured overview of all plants in the garden.

Each plant record includes:
- Name (common and botanical), 
- Category: 
    - Grass,
    - Tree, 
    - Shrub
    - Flower
- Description: Free text
- Origin Type
    - Native
    - Neophyt
    - Invasive neophyt
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
    - [x] tempeature protected/inside (bool)
- Visual attributes: 
    - flower color
    - leaf color
    - growth habit
- Current state: 
    - age, 
    - health status,
    - location
    - watering section
- Journal
    - history of all care activities (pruning, fertilization, repotting, pest control, ...)
- Images: 
    - general photo, 
    - flower photo, 
    - leaf photo
- Misc
    - Position on map
- Purchasing
    - Date
    - Price

**Views:**
- Table view with selectable visible columns
- Google-style filter/search
- Detail view (plant profile / "Steckbrief") on row click

### 4.2 Task Management

A clear list of what needs to be done in the garden.

- Distinguish between: overdue, current, and upcoming tasks
- Mark tasks as done or skip them
- Tasks are derived from plant care schedules, not entered manually (ideally)

### 4.3 Garden Calendar

A Gantt-style seasonal overview with months as columns and plants as rows.

Switchable sub-views:
- Bloom period (with flower color)
- Growth period
- Pruning window
- Fertilization period
- Foliage (leaf / no leaf)

Additionally: a compact monthly band (12 months) for the dashboard showing at a glance which months have tasks, with details on hover.

### 4.4 Visual Garden Plan

An interactive map of the garden showing the position and approximate size of each plant.

- Plant symbols on a schematic layout
- Hover: quick summary (name, current status, next task)
- Click plant symbol → open plant detail view
- Click table row → highlight plant in garden plan

### 4.5 AI Assistant

A conversational assistant embedded in the application.

Capabilities:
- Answer questions about plants, care routines, and gardening best practices
- Explain *why* a task is recommended at a given time ("Explain mode")
- Add, update, or remove plant data through natural language
- Identify plants from uploaded photos
- Search for suitable reference images
- Analyze uploaded documents (e.g. care instructions, plant tags)
- Provide context-aware advice (e.g. "my rose leaves are turning yellow")

The assistant has access to the user's garden data as context for all interactions.

### 4.6 Garden Journal

A chronological diary of gardening activities and observations.

- Log completed tasks with date and optional notes
- Free-form entries for observations, problems, and milestones
- Provides a personal history of the garden's development

### 4.7 Dashboard

The primary entry point of the application, combining:
- Hints & warnings (e.g. frost risk, overdue tasks)
- Open and upcoming task list
- Garden plan (visual, interactive)
- Monthly task band (compact 12-month overview)
- AI chat window

---

## 5. UI Principles

*(Details in the separate UI Concept documents)*

- Single-page web application, German UI language
- Clean, calm design — the garden should feel like the main character
- Mouse-over interactions for contextual details (tasks, plant info)
- The AI chat is always accessible, not hidden in a submenu

---

## 6. Future Ideas *(not in scope for v1)*

These are captured here to avoid losing them, but will not drive initial development:

- Weather integration (frost warnings, rain forecast, watering recommendations)
- Calendar sync (export tasks to external calendar apps)
- Email / push notifications for upcoming tasks
- Garden conditions input (soil type, sun exposure, microclimate)
- Multi-device / mobile support
- Upload receipe to generate an expense journal entry. Use AI to extract what has been bought and the price
- Drop picture to view to create pre-filled journal entry with the picture attached

---

## 7. Out of Scope

- Multi-user or collaborative features
- E-commerce (buying plants, tools)
- Integration with smart garden hardware
- Public plant database contributions

---

## 8. Open Questions
