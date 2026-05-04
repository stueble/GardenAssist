---
id: STORY-015
title: React + Vite Frontend Skeleton
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-04 17:26'
updated_date: '2026-05-04 21:52'
labels:
  - setup
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up the React frontend with Vite, Tailwind CSS, and shadcn/ui. Establishes design tokens and routing between the four main views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 React + Vite project created with TypeScript
- [x] #2 Tailwind CSS configured with design tokens from mockups (colors, fonts, border-radius)
- [x] #3 shadcn/ui installed and base components available
- [x] #4 Navigation bar with four tabs: Dashboard, Plants, Calendar, Journal + Settings icon
- [x] #5 Four empty view components with correct routes
- [x] #6 API client set up calling the Hono backend
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. React, Vite, TypeScript, Tailwind, react-router-dom installieren
2. Tailwind konfigurieren mit Design-Tokens
3. shadcn/ui initialisieren + button, tabs Komponenten
4. src/main.tsx + src/App.tsx
5. NavBar mit 4 Tabs + Settings-Icon
6. 4 View-Komponenten + Routing
7. src/api/client.ts
8. Tests (vitest + @testing-library/react)
9. Typecheck + Tests gruen
10. ACs, Final Summary, In Review, Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Set up the React + Vite frontend skeleton with Tailwind, shadcn/ui, routing, and API client.

Changes:
- Installed: react, react-dom, react-router-dom, vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, lucide-react, clsx, tailwind-merge, class-variance-authority, vitest, @testing-library/react, @testing-library/jest-dom
- index.html: SPA entry point
- src/index.css: Tailwind v4 + all design tokens from mockups as CSS custom properties
- vite.config.ts: React plugin, Tailwind plugin, @api/* and @/* path aliases, /api proxy, vitest jsdom config
- tsconfig.json: rootDir, path aliases, vite-env.d.ts for CSS imports
- src/lib/utils.ts: cn() helper (clsx + tailwind-merge)
- src/components/ui/button.tsx: shadcn/ui Button component with GardenAssist color variants
- components.json: shadcn/ui config
- src/components/NavBar.tsx: 4 tabs (Dashboard, Pflanzen, Kalender, Tagebuch) + Settings icon, active state highlighting
- src/views/: DashboardView, PlantsView, CalendarView, JournalView, SettingsView
- src/App.tsx: React Router routes wiring all views
- src/main.tsx: StrictMode + BrowserRouter entry point
- src/api/client.ts: fetch-based apiClient implementing all methods from docs/api/api.ts
- 12 tests: NavBar renders all tabs + correct hrefs; App routing renders correct view per path

Verified:
- pnpm --filter frontend test: 12/12 passed
- pnpm --filter frontend typecheck: no errors
- pnpm --filter backend test: 18/18 still passing
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
