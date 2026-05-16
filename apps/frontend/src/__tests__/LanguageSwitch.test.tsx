/**
 * Language switching via SettingsView integration tests.
 *
 * Verifies that:
 * 1. Switching from English → German saves to DB and applies i18n
 * 2. Switching from German → English saves to DB and applies i18n
 *
 * These tests mount SettingsView with a controlled apiClient mock so that
 * updateSettings echoes back whatever was sent (simulating real backend).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { SettingsView } from "../views/SettingsView";
import type { Settings } from "@api/settings";
import type { Garden } from "@api/garden";

// ── Shared mock state ─────────────────────────────────────────────────────────

// We need getSettings to return a mutable value so we can change the
// "DB language" between tests.
let mockDbLanguage: "de" | "en" = "en";

vi.mock("../api/client", () => ({
  apiClient: {
    getSettings: vi.fn().mockImplementation((): Promise<Settings> =>
      Promise.resolve({
        language:                 mockDbLanguage,
        location_city:            null,
        location_zip:             null,
        irrigation_zones:         [],
        plant_categories:         [],
        color_presets:            [],
        soil_moisture_dry_threshold_pct: 40,
        task_lookback_weeks:      8,
        task_lookahead_weeks:     4,
        attachment_size_limit_mb: 10,
        ai_provider:              null,
        ai_model:                 null,
        ai_api_key:               null,
        gardener_profile:         null,
      })
    ),
    // Echo back whatever the caller sends — mirrors real backend behaviour
    updateSettings: vi.fn().mockImplementation((s: Settings): Promise<Settings> => {
      mockDbLanguage = s.language;
      return Promise.resolve(s);
    }),
    getGarden: vi.fn().mockResolvedValue({
      plan_url: null, plan_name: null, plants: [],
      journal_entries: [], attachments: [], warnings: [],
    }),
    uploadGardenPlan: vi.fn(),
    deleteGardenPlan: vi.fn(),
    exportJson:       vi.fn().mockResolvedValue(new Blob()),
    exportPlantsCsv:  vi.fn().mockResolvedValue(new Blob()),
    importJson:       vi.fn().mockResolvedValue({}),
    exportBackup:     vi.fn().mockResolvedValue(new Blob()),
    importBackup:     vi.fn().mockResolvedValue({ skipped_count: 0, skipped_errors: [] }),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_GARDEN: Garden = {
  plan_url: null, plan_name: null, plants: [],
  journal_entries: [], attachments: [], warnings: [],
};

function renderSettings() {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <SettingsView
          garden={MOCK_GARDEN}
          loading={false}
          invalidateGarden={vi.fn()}
        />
      </I18nextProvider>
    </MemoryRouter>
  );
}

/** Opens the Language accordion section and returns the <select> element. */
async function openLanguageSection(): Promise<HTMLSelectElement> {
  // Wait for the language accordion toggle to appear (settings have loaded)
  const btn = await screen.findByTestId("language-section-toggle", {}, { timeout: 3000 });
  fireEvent.click(btn);
  // The select is now visible
  return screen.getByRole("combobox") as HTMLSelectElement;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Language switching via SettingsView", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset DB state to English before every test
    mockDbLanguage = "en";
    await i18n.changeLanguage("en");
    localStorage.removeItem("ga_language");
  });

  it("EN → DE: saves to DB and switches i18n to German", async () => {
    renderSettings();
    const select = await openLanguageSection();

    // Confirm starting language
    expect(i18n.language).toBe("en");
    expect(select.value).toBe("en");

    // Switch to German
    fireEvent.change(select, { target: { value: "de" } });
    expect(select.value).toBe("de");

    // Save is now active — click it
    const saveBtn = screen.getByTestId("save-bar-save");
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    // Wait for i18n to switch to German
    await waitFor(() => expect(i18n.language).toBe("de"), { timeout: 3000 });

    // DB was updated with German
    const { apiClient } = await import("../api/client");
    const savedPayload = (apiClient.updateSettings as ReturnType<typeof vi.fn>).mock.calls[0][0] as Settings;
    expect(savedPayload.language).toBe("de");

    // The dropdown still shows German after save (not reverted)
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("de");

    // Save bar is no longer dirty
    expect(screen.getByTestId("save-bar-save")).toBeDisabled();
  });

  it("DE → EN: saves to DB and switches i18n to English", async () => {
    // Start with German in DB and i18n
    mockDbLanguage = "de";
    await i18n.changeLanguage("de");

    renderSettings();
    const select = await openLanguageSection();

    // Confirm starting language
    expect(i18n.language).toBe("de");
    expect(select.value).toBe("de");

    // Switch to English
    fireEvent.change(select, { target: { value: "en" } });
    expect(select.value).toBe("en");

    // Save is now active — click it
    const saveBtn = screen.getByTestId("save-bar-save");
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    // Wait for i18n to switch to English
    await waitFor(() => expect(i18n.language).toBe("en"), { timeout: 3000 });

    // DB was updated with English
    const { apiClient } = await import("../api/client");
    const savedPayload = (apiClient.updateSettings as ReturnType<typeof vi.fn>).mock.calls[0][0] as Settings;
    expect(savedPayload.language).toBe("en");

    // The dropdown still shows English after save (not reverted)
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("en");

    // Save bar is no longer dirty
    expect(screen.getByTestId("save-bar-save")).toBeDisabled();
  });
});
