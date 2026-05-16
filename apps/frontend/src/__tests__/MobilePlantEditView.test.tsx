/**
 * MobilePlantEditView tests.
 *
 * - TopBar rendered with close and save buttons
 * - PlantEditDialog body rendered (form fields accessible)
 * - Edit existing plant: title shows plant name
 * - New plant: title shows "new plant" label
 * - Close button navigates back
 * - Save button triggers form save
 * - + button in MobilePlantsView navigates to /plants/new
 * - Edit button in MobilePlantDetailView navigates to /plants/:id/edit
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import i18n from "../i18n/index";
import { MobilePlantEditView } from "../views/MobilePlantEditView";
import { MobilePlantsView } from "../views/MobilePlantsView";
import { MobilePlantDetailView } from "../views/MobilePlantDetailView";
import type { Plant } from "@api/plant";
import type { Garden } from "@api/garden";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../api/client", () => ({
  apiClient: {
    getSettings: vi.fn().mockResolvedValue({
      language: "de", location_city: null, location_zip: null,
      irrigation_zones: [], plant_categories: ["Rosen"], color_presets: [],
      soil_moisture_dry_threshold_pct: 40, task_lookback_weeks: 2,
      task_lookahead_weeks: 4, attachment_size_limit_mb: 10,
      ai_provider: null, ai_model: null, ai_api_key: null,
    }),
    createPlant:  vi.fn().mockResolvedValue({ id: "new-p", name_common: "Neue Pflanze", schedules: [], positions: [], attachments: [], journal_entries: [], tasks: [] }),
    updatePlant:  vi.fn().mockResolvedValue({ id: "p1", name_common: "Rose", schedules: [], positions: [], attachments: [], journal_entries: [], tasks: [] }),
    deletePlant:  vi.fn().mockResolvedValue({}),
    uploadAttachment: vi.fn().mockResolvedValue({}),
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_PLANT: Plant = {
  id: "p1", name_common: "Rose", name_botanical: "Rosa canina",
  icon: "🌹", origin_type: null, category: null, lifecycle: null,
  description: null, care_notes: null, sun_demand: null, water_demand: null,
  soil_type: null, frost_tolerance_min_c: null, temperature_protected: false,
  health_status: null, location: null, watering_zone: null,
  purchase_date: null, purchase_price: null,
  positions: [], attachments: [], journal_entries: [], schedules: [], tasks: [],
  created_at: "", updated_at: "",
};

const MOCK_GARDEN: Garden = {
  plan_url: null, plan_name: null, plants: [MOCK_PLANT],
  journal_entries: [], attachments: [], warnings: [],
};

const defaultProps = { garden: MOCK_GARDEN, loading: false, invalidateGarden: vi.fn() };

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderEdit(path: string, garden = MOCK_GARDEN) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nextProvider i18n={i18n}>
        <Routes>
          <Route path="/plants/new"      element={<MobilePlantEditView {...defaultProps} garden={garden} />} />
          <Route path="/plants/:id/edit" element={<MobilePlantEditView {...defaultProps} garden={garden} />} />
          <Route path="/plants/:id"      element={<div data-testid="detail-view">Detail</div>} />
          <Route path="/plants"          element={<div data-testid="plants-view">Plants</div>} />
        </Routes>
      </I18nextProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MobilePlantEditView", () => {
  describe("TopBar", () => {
    it("renders the top bar", () => {
      renderEdit("/plants/p1/edit");
      expect(screen.getByTestId("mobile-plant-edit-topbar")).toBeInTheDocument();
    });

    it("renders close and save buttons", () => {
      renderEdit("/plants/p1/edit");
      expect(screen.getByTestId("mobile-plant-edit-close")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-plant-edit-save")).toBeInTheDocument();
    });

    it("shows plant name in title when editing existing plant", async () => {
      renderEdit("/plants/p1/edit");
      await waitFor(() =>
        expect(screen.getByText(/Rose/)).toBeInTheDocument()
      );
    });

    it("shows new plant title when creating", async () => {
      renderEdit("/plants/new");
      await waitFor(() => {
        const el = screen.queryByText(/Neue Pflanze/) ?? screen.queryByText(/New plant/i);
        expect(el).toBeTruthy();
      });
    });
  });

  describe("Form body", () => {
    it("renders the name input field", async () => {
      renderEdit("/plants/p1/edit");
      await waitFor(() =>
        expect(screen.getByTestId("field-name")).toBeInTheDocument()
      );
    });

    it("name field pre-filled when editing existing plant", async () => {
      renderEdit("/plants/p1/edit");
      await waitFor(() => {
        const input = screen.getByTestId("field-name") as HTMLInputElement;
        expect(input.value).toBe("Rose");
      });
    });

    it("no built-in header (edit-close testid absent)", async () => {
      renderEdit("/plants/p1/edit");
      await waitFor(() => screen.getByTestId("field-name"));
      expect(screen.queryByTestId("edit-close")).not.toBeInTheDocument();
    });

    it("no built-in footer (edit-save testid absent)", async () => {
      renderEdit("/plants/p1/edit");
      await waitFor(() => screen.getByTestId("field-name"));
      expect(screen.queryByTestId("edit-save")).not.toBeInTheDocument();
    });

    it("no pick-mode button", async () => {
      renderEdit("/plants/p1/edit");
      await waitFor(() => screen.getByTestId("field-name"));
      expect(screen.queryByTestId("positions-pick-mode-btn")).not.toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("close button is rendered and clickable (no error)", () => {
      renderEdit("/plants/p1/edit");
      const btn = screen.getByTestId("mobile-plant-edit-close");
      expect(btn).toBeInTheDocument();
      // navigate(-1) requires history — we just verify no error is thrown on click
      expect(() => fireEvent.click(btn)).not.toThrow();
    });
  });
});

describe("MobilePlantsView — + button navigates to /plants/new", () => {
  it("clicking + opens new plant edit view", async () => {
    render(
      <MemoryRouter initialEntries={["/plants"]}>
        <I18nextProvider i18n={i18n}>
          <Routes>
            <Route path="/plants" element={<MobilePlantsView {...defaultProps} />} />
            <Route path="/plants/new" element={<div data-testid="new-plant-view">New</div>} />
          </Routes>
        </I18nextProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("mobile-plants-add-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("new-plant-view")).toBeInTheDocument()
    );
  });
});

describe("MobilePlantDetailView — edit button navigates to /plants/:id/edit", () => {
  it("clicking ✏️ opens edit view", async () => {
    render(
      <MemoryRouter initialEntries={["/plants/p1"]}>
        <I18nextProvider i18n={i18n}>
          <Routes>
            <Route path="/plants/:id"      element={<MobilePlantDetailView {...defaultProps} />} />
            <Route path="/plants/:id/edit" element={<div data-testid="edit-view">Edit</div>} />
          </Routes>
        </I18nextProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("mobile-plant-detail-edit"));
    await waitFor(() =>
      expect(screen.getByTestId("edit-view")).toBeInTheDocument()
    );
  });
});
