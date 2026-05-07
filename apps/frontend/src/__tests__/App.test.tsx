/**
 * App routing tests.
 *
 * Verifies that navigating to each route renders the correct view.
 * Tests run with German locale (default).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { App } from "../App";

// PlantsView loads data via apiClient — mock to prevent real requests
vi.mock("../api/client", () => ({
  apiClient: {
    getGarden:    vi.fn().mockResolvedValue({ plan_url:null, plan_name:null, plants:[], attachments:[], journal_entries:[], warnings:[] }),
    getSettings:  vi.fn().mockResolvedValue({ language:"de", location_city:null, location_zip:null, irrigation_zones:[], plant_categories:[], color_presets:[], task_lookback_weeks:2, task_lookahead_weeks:4, attachment_size_limit_mb:10, ai_provider:null, ai_model:null, ai_api_key:null }),
    updateSettings: vi.fn().mockImplementation((s) => Promise.resolve(s)),
    exportJson:   vi.fn().mockResolvedValue(new Blob()),
    exportPlantsCsv: vi.fn().mockResolvedValue(new Blob()),
    importJson:   vi.fn().mockResolvedValue({}),
    uploadGardenPlan: vi.fn(),
    deleteGardenPlan: vi.fn(),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe("App routing", () => {
  it("/ renders the Dashboard view", () => {
    renderAt("/");
    expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
  });

  it("/plants renders the Plants view", () => {
    renderAt("/plants");
    // PlantsView shows a search input (no h1) — check for loading state or search
    expect(
      screen.getByText(/Pflanzen werden geladen/i) ||
      screen.queryByTestId("plants-search")
    ).toBeTruthy();
  });

  it("/calendar renders the Calendar view", () => {
    renderAt("/calendar");
    expect(screen.getByRole("heading", { name: /Kalender/i })).toBeInTheDocument();
  });

  it("/journal renders the Journal view", () => {
    renderAt("/journal");
    expect(screen.getByRole("heading", { name: /Tagebuch/i })).toBeInTheDocument();
  });

  it("/settings renders the Settings view", () => {
    renderAt("/settings");
    expect(screen.getByText(/Einstellungen/i)).toBeInTheDocument();
  });
});
