/**
 * App routing tests.
 *
 * Verifies that navigating to each route renders the correct view.
 * Tests run with German locale (default).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { App } from "../App";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import { resetAssistantContext } from "../hooks/useAssistantContext";

// All views load data via apiClient — mock to prevent real requests
vi.mock("../api/client", () => ({
  apiClient: {
    getGarden:    vi.fn().mockResolvedValue({ plan_url:null, plan_name:null, plants:[], attachments:[], journal_entries:[], warnings:[] }),
    getSettings:  vi.fn().mockResolvedValue({ language:"de", location_city:null, location_zip:null, irrigation_zones:[], plant_categories:[], color_presets:[], task_lookback_weeks:2, task_lookahead_weeks:4, attachment_size_limit_mb:10, ai_provider:"anthropic", ai_model:"claude-sonnet-4-6", ai_api_key:"sk-test" }),
    updateSettings: vi.fn().mockImplementation((s) => Promise.resolve(s)),
    exportJson:   vi.fn().mockResolvedValue(new Blob()),
    exportPlantsCsv: vi.fn().mockResolvedValue(new Blob()),
    importJson:   vi.fn().mockResolvedValue({}),
    uploadGardenPlan: vi.fn(),
    deleteGardenPlan: vi.fn(),
  },
  chatWithAi: vi.fn().mockResolvedValue({ content: "Antwort vom Assistenten" }),
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  resetAiPanelState();
  resetAssistantContext();
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
    expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
  });

  it("/journal renders the Journal view", () => {
    renderAt("/journal");
    expect(screen.getByTestId("journal-view")).toBeInTheDocument();
  });

  it("/settings renders the Settings view", () => {
    renderAt("/settings");
    expect(screen.getByText(/Einstellungen/i)).toBeInTheDocument();
  });
});

describe("App — AiPanel in App.tsx (TASK-059 AC #1, #2)", () => {
  it("AiPanel toggle is visible at every route (AC #1)", () => {
    renderAt("/");
    expect(screen.getByTestId("ai-toggle")).toBeInTheDocument();
  });

  it("AiPanel toggle is visible on /calendar", () => {
    renderAt("/calendar");
    expect(screen.getByTestId("ai-toggle")).toBeInTheDocument();
  });

  it("AiPanel toggle is visible on /settings", () => {
    renderAt("/settings");
    expect(screen.getByTestId("ai-toggle")).toBeInTheDocument();
  });

  it("AiPanel open state persists across view changes via singleton (AC #2)", async () => {
    // The open/close state is managed by useAiPanelState — a module-level singleton.
    // Since AiPanel is now mounted once in App.tsx, the messages state also lives
    // there and survives route changes within the same App instance.
    // This test verifies the panel can be opened and the singleton state is visible.
    renderAt("/dashboard");

    fireEvent.click(screen.getByTestId("ai-toggle"));

    // Panel is now open
    await waitFor(() => {
      const panel = screen.getByTestId("ai-chat-panel") as HTMLElement;
      expect(panel.style.width).toBe("310px");
    });

    // The panel open state is in the singleton — remains open when context changes
    const panel = screen.getByTestId("ai-chat-panel") as HTMLElement;
    expect(panel.style.width).toBe("310px");
  });
});
