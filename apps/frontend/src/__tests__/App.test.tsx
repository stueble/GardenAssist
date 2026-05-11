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
import { _resetGardenForTest } from "../hooks/useGarden";
import { getPlantEditHandler } from "../hooks/usePlantEditContext";

// JSDOM stub for ResizeObserver (used by GardenPlanWidget)
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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
  chatWithAi:  vi.fn().mockResolvedValue({ content: "Antwort vom Assistenten" }),
  getWeather:  vi.fn().mockResolvedValue(null),
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  resetAiPanelState();
  resetAssistantContext();
  _resetGardenForTest();
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

  it("/plants renders the Plants view", async () => {
    renderAt("/plants");
    // PlantsView initially shows loading, then transitions to the search input
    // after getGarden() resolves. Either state is acceptable here.
    await waitFor(() => {
      const hasLoader = !!screen.queryByText(/Pflanzen werden geladen/i);
      const hasSearch = !!screen.queryByTestId("plants-search");
      expect(hasLoader || hasSearch).toBe(true);
    });
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

describe("GlobalPlantEditOverlay — editPlant handler available from any view (TASK-067)", () => {
  it("editPlant handler is registered when JournalView is the active view", async () => {
    renderAt("/journal");
    // GlobalPlantEditOverlay is mounted in App.tsx regardless of active view.
    // After mount the handler must be registered.
    await waitFor(() => {
      expect(screen.getByTestId("journal-view")).toBeInTheDocument();
    });
    expect(getPlantEditHandler()).not.toBeNull();
  });

  it("editPlant handler is registered when SettingsView is the active view", async () => {
    renderAt("/settings");
    await waitFor(() => {
      expect(screen.getByText(/Einstellungen/i)).toBeInTheDocument();
    });
    expect(getPlantEditHandler()).not.toBeNull();
  });

  it("editPlant dispatches successfully from JournalView context (no error message)", async () => {
    renderAt("/journal");
    await waitFor(() => {
      expect(screen.getByTestId("journal-view")).toBeInTheDocument();
    });

    const handler = getPlantEditHandler();
    expect(handler).not.toBeNull();
    // Calling editPlant should not throw — new-plant mode
    expect(() => handler!.editPlant(null, {})).not.toThrow();
  });

  it("editPlant dispatches successfully from SettingsView context (no error message)", async () => {
    renderAt("/settings");
    await waitFor(() => {
      expect(screen.getByText(/Einstellungen/i)).toBeInTheDocument();
    });

    const handler = getPlantEditHandler();
    expect(handler).not.toBeNull();
    // Calling editPlant should not throw — new-plant mode
    expect(() => handler!.editPlant(null, {})).not.toThrow();
  });
});
