/**
 * SettingsView tests.
 *
 * Uses MSW-free approach: mocks the apiClient directly via vi.mock.
 * Verifies that fields are populated from API, form state is tracked,
 * and save/discard work correctly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { SettingsView } from "../views/SettingsView";
import type { Settings } from "@api/settings";
import type { Garden } from "@api/garden";

// Mock the API client — data must be inlined in factory (vi.mock is hoisted)
vi.mock("../api/client", () => ({
  apiClient: {
    getSettings: vi.fn().mockResolvedValue({
      language: "de", location_city: "München", location_zip: "80331",
      irrigation_zones: ["Zone A", "Terrasse"], plant_categories: ["Rosen", "Gemüse"],
      color_presets: [], task_lookback_weeks: 2, task_lookahead_weeks: 4,
      attachment_size_limit_mb: 10, ai_provider: null, ai_model: null, ai_api_key: null,
    }),
    updateSettings:  vi.fn().mockImplementation((s: Settings) => Promise.resolve(s)),
    // getGarden is used by GardenPlanSection (rendered inside SettingsView)
    getGarden: vi.fn().mockResolvedValue({
      plan_url: null, plan_name: null, plants: [], journal_entries: [], attachments: [],
    }),
    uploadGardenPlan: vi.fn(),
    deleteGardenPlan: vi.fn(),
    exportJson:      vi.fn().mockResolvedValue(new Blob()),
    exportPlantsCsv: vi.fn().mockResolvedValue(new Blob()),
    importJson:      vi.fn().mockResolvedValue({}),
  },
}));

// Reference for assertions
const MOCK_SETTINGS_CITY = "München";

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
});

const MOCK_GARDEN: Garden = {
  plan_url: null, plan_name: null, plants: [],
  journal_entries: [], attachments: [], warnings: [],
};

function renderSettings(garden: Garden | null = MOCK_GARDEN) {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <SettingsView garden={garden} loading={garden === null} invalidateGarden={vi.fn()} />
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe("SettingsView — API integration", () => {
  it("shows loading state initially", () => {
    renderSettings();
    expect(screen.getByText(/Einstellungen werden geladen/i)).toBeInTheDocument();
  });

  it("populates location fields from API (AC #1)", async () => {
    renderSettings();
    await waitFor(() => expect(screen.queryByText(/werden geladen/i)).not.toBeInTheDocument());
    expect(screen.getByDisplayValue(MOCK_SETTINGS_CITY)).toBeInTheDocument();
    expect(screen.getByDisplayValue("80331")).toBeInTheDocument();
  });

  it("shows irrigation zones from API", async () => {
    renderSettings();
    await waitFor(() => expect(screen.queryByText(/werden geladen/i)).not.toBeInTheDocument());
    expect(screen.getByDisplayValue("Zone A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Terrasse")).toBeInTheDocument();
  });

  it("save bar shows 'no changes' when form is untouched", async () => {
    renderSettings();
    await waitFor(() => expect(screen.queryByText(/werden geladen/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Keine ungespeicherten Änderungen/i)).toBeInTheDocument();
    expect(screen.getByTestId("save-bar-save")).toBeDisabled();
  });

  it("marks dirty when a field is changed (AC #2 prerequisite)", async () => {
    renderSettings();
    await waitFor(() => expect(screen.queryByText(/werden geladen/i)).not.toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue(MOCK_SETTINGS_CITY), { target: { value: "Berlin" } });
    expect(screen.getByText(/Ungespeicherte Änderungen vorhanden/i)).toBeInTheDocument();
    expect(screen.getByTestId("save-bar-save")).not.toBeDisabled();
  });

  it("calls updateSettings on save (AC #2)", async () => {
    const { apiClient } = await import("../api/client");
    renderSettings();
    await waitFor(() => expect(screen.queryByText(/werden geladen/i)).not.toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue(MOCK_SETTINGS_CITY), { target: { value: "Berlin" } });
    fireEvent.click(screen.getByTestId("save-bar-save"));
    await waitFor(() => expect(apiClient.updateSettings).toHaveBeenCalledOnce());
    const called = (apiClient.updateSettings as ReturnType<typeof vi.fn>).mock.calls[0][0] as Settings;
    expect(called.location_city).toBe("Berlin");
  });

  it("resets form on discard (AC #3)", async () => {
    renderSettings();
    await waitFor(() => expect(screen.queryByText(/werden geladen/i)).not.toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue(MOCK_SETTINGS_CITY), { target: { value: "Berlin" } });
    expect(screen.getByTestId("save-bar-discard")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("save-bar-discard"));
    await waitFor(() => expect(screen.getByDisplayValue(MOCK_SETTINGS_CITY)).toBeInTheDocument());
    expect(screen.queryByDisplayValue("Berlin")).not.toBeInTheDocument();
  });

  it("shows success feedback after save (AC #4)", async () => {
    renderSettings();
    await waitFor(() => expect(screen.queryByText(/werden geladen/i)).not.toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue(MOCK_SETTINGS_CITY), { target: { value: "Berlin" } });
    fireEvent.click(screen.getByTestId("save-bar-save"));
    await waitFor(() => expect(screen.getByText(/Einstellungen gespeichert/i)).toBeInTheDocument());
  });

  it("does not render an AiPanel directly (AiPanel is in App.tsx now)", async () => {
    renderSettings();
    await waitFor(() => expect(screen.queryByText(/werden geladen/i)).not.toBeInTheDocument());
    // AiPanel is no longer rendered inside SettingsView — it lives in App.tsx
    expect(screen.queryByTestId("ai-toggle")).not.toBeInTheDocument();
  });

  it("selecting a language in the dropdown and saving switches i18n", async () => {
    await i18n.changeLanguage("de");
    renderSettings();
    await waitFor(() => expect(screen.queryByText(/werden geladen/i)).not.toBeInTheDocument());

    // German subtitle visible before any change
    expect(screen.getByText(/Gartenplan, Farben, Zonen/i)).toBeInTheDocument();

    // Open the language section (it starts closed)
    const langSectionBtn = screen.getByRole("button", { name: /Sprache/i });
    fireEvent.click(langSectionBtn);

    // Find the language select and switch to English
    const langSelect = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(langSelect, { target: { value: "en" } });

    // Language has NOT changed yet — save is required
    expect(i18n.language).toBe("de");

    // Save
    fireEvent.click(screen.getByTestId("save-bar-save"));
    await waitFor(() => expect(i18n.language).toBe("en"));

    // UI should now show English labels
    expect(screen.getByText(/Garden plan, colors, zones/i)).toBeInTheDocument();

    // Cleanup
    await i18n.changeLanguage("de");
  });
});
