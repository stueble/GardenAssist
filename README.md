# GardenAssist

> An AI-powered web application to support and simplify everyday gardening.

GardenAssist helps gardeners keep track of their plants, plan garden tasks, and get intelligent advice — all in one place. An integrated AI assistant can answer questions, explain care instructions, identify plants, and help manage your garden data through natural conversation.

---

## Core Features

### 🌿 Plant Management
Maintain a comprehensive list of all plants in your garden. Each plant includes care details such as pruning schedules, fertilization cycles, bloom periods, leaf and flower colors, frost tolerance, and general growing conditions. Track the current state and age of each plant, as well as the dates of last care activities.

### ✅ Tasks & Reminders
View all open, current, and upcoming garden tasks at a glance. Mark tasks as done or skip them as needed. A monthly calendar overview provides a quick visual indication of which months have pending work, with details available on hover.

### 📅 Garden Calendar
A Gantt-style calendar with plants as rows and months as columns gives a seasonal overview of bloom times, pruning windows, fertilization periods, and growth phases — with color-coded display per activity type.

### 🗺️ Visual Garden Plan
An interactive layout of your garden showing the position and size of each plant. Hover over plant symbols to see a quick summary; click to open the full plant detail view. Selecting a plant in the table highlights its location in the plan.

### 🤖 AI Assistant
A conversational assistant that supports you throughout the app:
- Answer questions about plants, care routines, and gardening best practices
- Explain *why* a task is recommended at a given time
- Add or update plant data as well as journal entries through natural language


### 📖 Garden Journal
A diary for logging completed tasks, observations, and notes over time. Provides a personal history of your garden's development.

### 📊 Dashboard
A central overview combining urgent hints and warnings, open and upcoming tasks, the garden plan, a monthly task band, and the AI chat window — everything relevant at a single glance.

---

## Screenshots

<table>
  <tr>
    <td align="center" width="33%">
      <a href="examples/screenshots/Dashboard view.png">
        <img src="examples/screenshots/Dashboard view.png" width="100%" alt="Dashboard" />
      </a>
      <br /><sub><b>Dashboard</b> — weather widget, open tasks with done/skip actions, interactive garden plan with plant markers, and the monthly task band.</sub>
    </td>
    <td align="center" width="33%">
      <a href="examples/screenshots/Dashboard view and with opened assistent.png">
        <img src="examples/screenshots/Dashboard view and with opened assistent.png" width="100%" alt="Dashboard with AI Assistant" />
      </a>
      <br /><sub><b>AI Assistant</b> — the assistant panel opens alongside any view. Here it answers a question about fertilizing the apple tree, citing the plant's own schedule.</sub>
    </td>
    <td align="center" width="33%">
      <a href="examples/screenshots/Plants overview and plant details.png">
        <img src="examples/screenshots/Plants overview and plant details.png" width="100%" alt="Plants overview and detail panel" />
      </a>
      <br /><sub><b>Plant list &amp; detail</b> — sortable table with bloom, health, and task columns; clicking a row opens the detail panel with photos, facts, care notes, and schedule history.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <a href="examples/screenshots/Calendar view.png">
        <img src="examples/screenshots/Calendar view.png" width="100%" alt="Calendar view" />
      </a>
      <br /><sub><b>Garden calendar</b> — Gantt-style view with plants as rows and months as columns. Filter by activity type (bloom, growth, foliage, fertilization, pruning, misc).</sub>
    </td>
    <td align="center" width="33%">
      <a href="examples/screenshots/Journal view.png">
        <img src="examples/screenshots/Journal view.png" width="100%" alt="Journal view" />
      </a>
      <br /><sub><b>Garden journal</b> — chronological log of completed tasks, skipped items, observations, and problems. Filterable by entry type.</sub>
    </td>
    <td align="center" width="33%">
      <a href="examples/screenshots/Assistant prefilling new plant.png">
        <img src="examples/screenshots/Assistant prefilling new plant.png" width="100%" alt="Assistant prefilling a new plant form" />
      </a>
      <br /><sub><b>AI-assisted plant entry</b> — asking the assistant to add a yellow rose automatically opens the plant form pre-filled with name, description, category, care notes, and bloom schedules. Information provided by the assistant is always marked orange and can individually deselected or overwritten. The user always needs to save to accept changes suggested by the assistant. Journal entries can also be added, modified, or deleted using the assistant.</sub>
    </td>
  </tr>
</table>

---

## Planned Integrations *(future)*

- **Moisture** calculation based on whether information and irrigation information
- **User** authentication based on OpenID Connect
- **Photo analysis** Identify plants from uploaded photos, search for suitable reference images, or analyze uploaded documents or photos for relevant gardening context
- **Calendar sync** – export or sync garden tasks to external calendar apps
- **Email notifications** – reminders for upcoming or overdue tasks

---

## Tech Stack

## Frontend
 
| Component | Technology | Rationale |
|---|---|---|
| Framework | React + TypeScript | Industry standard; best AI code generation support |
| Build tool | Vite | Fast dev server and build; replaces Create React App |
| UI components | shadcn/ui | Radix UI (accessible, headless) + Tailwind; components copied into project for full control |
| Styling | Tailwind CSS | Utility-first; no separate CSS files needed |
 
### Backend
 
| Component | Technology | Rationale |
|---|---|---|
| Server framework | Hono | Lightweight, TypeScript-first; simpler than NestJS, more modern than Express |
| Validation | Zod | Runtime validation of all API inputs; enables OpenAPI generation for future mobile client (see ADR-007) |
| ORM | Drizzle | TypeScript-first schema definition; lightweight; supports SQLite and PostgreSQL with a single connection config change |
| Database | SQLite (v1) → PostgreSQL (future) | SQLite for zero-dependency on-premise install; Drizzle abstracts the switch to PostgreSQL |
 
### Deployment
 
| Component | Technology | Rationale |
|---|---|---|
| Containerization | Docker | On-premise, self-hostable; single docker-compose.yml for the full stack |
| Persistence | Docker Volume | SQLite file and attachment directory mounted as a volume; survives container restarts |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9 — install with `npm install -g pnpm`
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose (for production deployment)

### Install dependencies

```bash
pnpm install
```

### Development

```bash
# Frontend (React + Vite, http://localhost:5173)
pnpm dev:frontend

# Backend (Hono, http://localhost:3000)
pnpm dev:backend
```

API requests from the frontend are proxied to the backend via Vite's dev proxy
(`/api` → `http://localhost:3000`).

### Type checking

```bash
pnpm typecheck
```

### Docker (production / on-premise)

#### Using pre-built images from ghcr.io (recommended)

No local build required. Images are published automatically on every push to `main`
and on every version tag (`v*.*.*`).

```bash
# 1. Copy and adjust environment variables
cp .env.example .env          # set GARDENASSIST_PORT if needed

# 2. Pull the latest images and start the stack
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The frontend is reachable at `http://<server>:3110` (or the port set via `GARDENASSIST_PORT`).

To pin a specific version instead of `latest`, edit `docker-compose.prod.yml` and replace
`:latest` with the desired tag, e.g. `:1.2.0`.

To update to a newer version:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Data (SQLite database + attachments) is persisted in the named Docker volume `gardenassist_data`
and survives container restarts and image updates.

#### Building locally

```bash
# Copy and adjust environment variables
cp .env.example .env

# Build images locally and start the stack
docker compose up --build
```

To use PostgreSQL instead of SQLite, set `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql://user:password@host:5432/gardenassist
```

### Shared API types

The TypeScript types in `docs/api/` are the source of truth for the data model.
Both packages import them via the `@api/*` path alias, e.g.:

```ts
import type { Garden } from "@api/garden";
```

No copying or code generation required — the alias resolves directly to `docs/api/`.

---

## Project Status

🌱 **Development** — core features implemented and in use.

| Feature | Status |
|---|---|
| Plant management (list, detail, edit, attachments) | ✅ Done |
| Dashboard (task list, warnings, garden plan, weather widget) | ✅ Done |
| Garden calendar (Gantt, color presets) | ✅ Done |
| Journal (timeline, filters, manual entries, done/skipped tasks) | ✅ Done |
| Settings (all sections, API integration, language switch) | ✅ Done |
| Garden plan upload | ✅ Done |
| AI Assistant (provider-agnostic, persistent across views) | ✅ Done |
| Export / Import (JSON, backup tar.gz) | ✅ Done |
| Weather widget (Open-Meteo, real-time, 5-day forecast) | ✅ Done |
| Docker build + ghcr.io publish (GitHub Actions) | ✅ Done |
| CSV export | 🔲 Ready |
| Soil moisture / water balance (Open-Meteo Archive) | 🔲 Ready |
