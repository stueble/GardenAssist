/**
 * MobileSettingsView tests.
 *
 * Verifies:
 * - Top bar is rendered with title and back button
 * - Clicking back navigates to "/"
 * - SettingsView content is rendered below
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import i18n from "../i18n/index";
import { MobileSettingsView } from "../views/MobileSettingsView";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../api/client", () => ({
  apiClient: {
    getGarden: vi.fn().mockResolvedValue({
      plan_url: null, plan_name: null, plants: [], attachments: [], journal_entries: [], warnings: [],
    }),
    getSettings: vi.fn().mockResolvedValue({
      language: "de",
      location_city: null,
      location_zip: null,
      irrigation_zones: [],
      plant_categories: [],
      color_presets: [],
      soil_moisture_dry_threshold_pct: 40,
      task_lookback_weeks: 2,
      task_lookahead_weeks: 4,
      attachment_size_limit_mb: 10,
      ai_provider: "anthropic",
      ai_model: "claude-sonnet-4-6",
      ai_api_key: "sk-test",
    }),
    updateSettings: vi.fn().mockImplementation((s) => Promise.resolve(s)),
    uploadGardenPlan: vi.fn(),
    deleteGardenPlan: vi.fn(),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  garden:           null,
  loading:          false,
  invalidateGarden: vi.fn(),
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nextProvider i18n={i18n}>
        <Routes>
          <Route path="/settings" element={<MobileSettingsView {...defaultProps} />} />
          <Route path="/"         element={<div data-testid="home-view">Home</div>} />
        </Routes>
      </I18nextProvider>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MobileSettingsView", () => {
  it("renders the top bar with title", async () => {
    renderAt("/settings");
    expect(screen.getByTestId("mobile-settings-topbar")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Einstellungen")).toBeInTheDocument()
    );
  });

  it("renders a back button", () => {
    renderAt("/settings");
    expect(screen.getByTestId("mobile-settings-back")).toBeInTheDocument();
  });

  it("clicking back navigates to /", async () => {
    renderAt("/settings");
    fireEvent.click(screen.getByTestId("mobile-settings-back"));
    await waitFor(() =>
      expect(screen.getByTestId("home-view")).toBeInTheDocument()
    );
  });

  it("renders SettingsView content below the top bar", async () => {
    renderAt("/settings");
    // The scroll container wrapping SettingsView must be present
    await waitFor(() => {
      expect(screen.getByTestId("mobile-settings-topbar")).toBeInTheDocument();
    });
    // SettingsView is rendered inside the scroll wrapper (any child element suffices)
    const topbar = screen.getByTestId("mobile-settings-topbar");
    expect(topbar.parentElement).not.toBeNull();
    // The scroll wrapper is a sibling of the topbar inside the outer flex container
    const outer = topbar.parentElement!;
    expect(outer.children.length).toBeGreaterThan(1);
  });
});
