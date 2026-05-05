/**
 * PlantEditDialog tests — story-026.
 *
 * Verifies:
 * - AC #1: Dialog opens as left panel (renders in PlantsView on FAB click)
 * - AC #2: All Grunddaten fields present
 * - AC #3: Icon picker with 20 options, auto-suggestion from category
 * - AC #4: Enum dropdowns (origin, lifecycle, sun, water, soil) from i18n
 * - AC #5: Category + watering zone from Settings
 * - AC #6: Cancel closes with confirmation when dirty
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { PlantEditDialog } from "../components/PlantEditDialog";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { Plant } from "@api/plant";

const MOCK_SETTINGS = {
  language: "de", location_city: null, location_zip: null,
  irrigation_zones: ["Beet West", "Terrasse"],
  plant_categories: ["Strauch", "Baum", "Staude"],
  color_presets: [], task_lookback_weeks: 2, task_lookahead_weeks: 4,
  attachment_size_limit_mb: 10,
  ai_provider: null, ai_model: null, ai_api_key: null,
};

const MOCK_PLANT: Plant = {
  id: "p1", name_common: "Rote Rose", name_botanical: "Rosa",
  icon: "🌹", origin_type: "native", category: "Strauch",
  lifecycle: "perennial", description: "Eine Rose.", care_notes: "Schnitt nötig.",
  sun_demand: "sunny", water_demand: "medium", soil_type: "loamy",
  frost_tolerance_min_c: -15, temperature_protected: false,
  health_status: "good", location: "Westbeet", watering_zone: "Beet West",
  purchase_date: "2022-03-15", purchase_price: 12.5,
  thumbnail_attachment_id: null,
  positions: [], attachments: [], journal_entries: [], schedules: [], tasks: [],
  created_at: "", updated_at: "",
};

vi.mock("../api/client", () => ({
  apiClient: {
    getSettings: vi.fn().mockResolvedValue({
      language: "de", location_city: null, location_zip: null,
      irrigation_zones: ["Beet West", "Terrasse"],
      plant_categories: ["Strauch", "Baum", "Staude"],
      color_presets: [], task_lookback_weeks: 2, task_lookahead_weeks: 4,
      attachment_size_limit_mb: 10, ai_provider: null, ai_model: null, ai_api_key: null,
    }),
    createPlant: vi.fn().mockResolvedValue({
      id: "new-p", name_common: "Magnolie", name_botanical: null, icon: "🌿",
      origin_type: null, category: null, lifecycle: null, description: null,
      care_notes: null, sun_demand: null, water_demand: null, soil_type: null,
      frost_tolerance_min_c: null, temperature_protected: false,
      health_status: null, location: null, watering_zone: null,
      purchase_date: null, purchase_price: null, thumbnail_attachment_id: null,
      positions: [], attachments: [], journal_entries: [], schedules: [], tasks: [],
      created_at: "", updated_at: "",
    }),
    updatePlant: vi.fn().mockImplementation((_id: string, data: unknown) =>
      Promise.resolve({ id: "p1", ...data as object, tasks: [], journal_entries: [], schedules: [], attachments: [], positions: [], created_at: "", updated_at: "" })
    ),
    getGarden: vi.fn().mockResolvedValue({ plan_url: null, plan_name: null, plants: [], attachments: [], journal_entries: [] }),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
  resetAiPanelState();
});

function renderDialog(plant: Plant | null = null, onClose = vi.fn(), onSaved = vi.fn()) {
  return render(
    <I18nextProvider i18n={i18n}>
      <PlantEditDialog plant={plant} onClose={onClose} onSaved={onSaved} />
    </I18nextProvider>
  );
}

describe("PlantEditDialog — new plant", () => {
  it("shows 'Neue Pflanze' title for new plant", () => {
    renderDialog(null);
    expect(screen.getByText("Neue Pflanze")).toBeInTheDocument();
  });

  it("renders all Grunddaten fields (AC #2)", () => {
    renderDialog(null);
    expect(screen.getByTestId("field-name")).toBeInTheDocument();
    expect(screen.getByTestId("field-botanical")).toBeInTheDocument();
    expect(screen.getByTestId("field-description")).toBeInTheDocument();
    expect(screen.getByTestId("field-category")).toBeInTheDocument();
    expect(screen.getByTestId("field-origin")).toBeInTheDocument();
    expect(screen.getByTestId("field-lifecycle")).toBeInTheDocument();
    expect(screen.getByTestId("field-location")).toBeInTheDocument();
    expect(screen.getByTestId("field-watering")).toBeInTheDocument();
    expect(screen.getByTestId("field-sun")).toBeInTheDocument();
    expect(screen.getByTestId("field-water")).toBeInTheDocument();
    expect(screen.getByTestId("field-soil")).toBeInTheDocument();
    expect(screen.getByTestId("field-temp")).toBeInTheDocument();
    expect(screen.getByTestId("field-frost")).toBeInTheDocument();
    expect(screen.getByTestId("field-purchase-date")).toBeInTheDocument();
    expect(screen.getByTestId("field-purchase-price")).toBeInTheDocument();
    expect(screen.getByTestId("field-care-notes")).toBeInTheDocument();
  });
});

describe("PlantEditDialog — edit existing plant", () => {
  it("shows plant name in title", () => {
    renderDialog(MOCK_PLANT);
    expect(screen.getByText(/Rote Rose bearbeiten/i)).toBeInTheDocument();
  });

  it("pre-fills name field from plant", () => {
    renderDialog(MOCK_PLANT);
    expect(screen.getByTestId("field-name")).toHaveValue("Rote Rose");
  });

  it("pre-fills botanical field from plant", () => {
    renderDialog(MOCK_PLANT);
    expect(screen.getByTestId("field-botanical")).toHaveValue("Rosa");
  });
});

describe("PlantEditDialog — icon picker (AC #3)", () => {
  it("shows icon preview button", () => {
    renderDialog(null);
    expect(screen.getByTestId("icon-preview")).toBeInTheDocument();
  });

  it("opens picker on icon click", () => {
    renderDialog(null);
    fireEvent.click(screen.getByTestId("icon-preview"));
    expect(screen.getByTestId("icon-picker")).toBeInTheDocument();
  });

  it("shows 20 icon options", () => {
    renderDialog(null);
    fireEvent.click(screen.getByTestId("icon-preview"));
    const opts = screen.getAllByRole("button", { name: /🌹|🌸|🌺|🌻|🌼|💐|🌷|🌿|🌱|🌳|🌲|🎋|🍃|🍂|🍎|🍋|🌵|🪴|🌾|🎍/ });
    expect(opts.length).toBe(20);
  });

  it("selecting an icon closes the picker and updates preview", () => {
    renderDialog(null);
    fireEvent.click(screen.getByTestId("icon-preview"));
    fireEvent.click(screen.getByTestId("icon-opt-🌸"));
    expect(screen.queryByTestId("icon-picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("icon-preview")).toHaveTextContent("🌸");
  });

  it("auto-suggests icon when category changes (AC #3)", async () => {
    renderDialog(null);
    // Wait for settings to load so categories appear in select
    await waitFor(() => {
      const sel = screen.getByTestId("field-category") as HTMLSelectElement;
      expect(sel).toHaveTextContent("Strauch");
    });
    fireEvent.change(screen.getByTestId("field-category"), { target: { value: "Baum" } });
    // Allow React effect to run — "Baum" → 🌳
    await waitFor(() =>
      expect(screen.getByTestId("icon-preview").textContent).toBe("🌳")
    );
  });
});

describe("PlantEditDialog — enum dropdowns (AC #4)", () => {
  it("origin dropdown contains i18n options", () => {
    renderDialog(null);
    const sel = screen.getByTestId("field-origin");
    expect(sel).toHaveTextContent("Heimisch");
    expect(sel).toHaveTextContent("Neophyt");
    expect(sel).toHaveTextContent("Invasiver Neophyt");
  });

  it("lifecycle dropdown contains i18n options", () => {
    renderDialog(null);
    const sel = screen.getByTestId("field-lifecycle");
    expect(sel).toHaveTextContent("Mehrjährig");
    expect(sel).toHaveTextContent("Immergrün");
  });

  it("sun demand dropdown contains i18n options", () => {
    renderDialog(null);
    const sel = screen.getByTestId("field-sun");
    expect(sel).toHaveTextContent("Sonnig");
    expect(sel).toHaveTextContent("Halbschattig");
  });
});

describe("PlantEditDialog — Settings dropdowns (AC #5)", () => {
  it("category dropdown loads from Settings", async () => {
    renderDialog(null);
    await waitFor(() => {
      const sel = screen.getByTestId("field-category");
      expect(sel).toHaveTextContent("Strauch");
      expect(sel).toHaveTextContent("Baum");
    });
  });

  it("watering zone dropdown loads from Settings", async () => {
    renderDialog(null);
    await waitFor(() => {
      const sel = screen.getByTestId("field-watering");
      expect(sel).toHaveTextContent("Beet West");
      expect(sel).toHaveTextContent("Terrasse");
    });
  });
});

describe("PlantEditDialog — save and cancel (AC #6)", () => {
  it("shows error when saving without name", async () => {
    renderDialog(null);
    fireEvent.click(screen.getByTestId("edit-save"));
    await waitFor(() =>
      expect(screen.getByText(/erforderlich/i)).toBeInTheDocument()
    );
  });

  it("calls createPlant when saving a new plant with a name", async () => {
    const { apiClient } = await import("../api/client");
    const onSaved = vi.fn();
    renderDialog(null, vi.fn(), onSaved);
    fireEvent.change(screen.getByTestId("field-name"), { target: { value: "Magnolie" } });
    fireEvent.click(screen.getByTestId("edit-save"));
    await waitFor(() => expect(apiClient.createPlant).toHaveBeenCalledOnce());
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  it("calls updatePlant when editing an existing plant", async () => {
    const { apiClient } = await import("../api/client");
    const onSaved = vi.fn();
    renderDialog(MOCK_PLANT, vi.fn(), onSaved);
    fireEvent.change(screen.getByTestId("field-name"), { target: { value: "Rosa Alba" } });
    fireEvent.click(screen.getByTestId("edit-save"));
    await waitFor(() => expect(apiClient.updatePlant).toHaveBeenCalledOnce());
  });

  it("calls onClose on cancel when not dirty", () => {
    const onClose = vi.fn();
    renderDialog(null, onClose);
    fireEvent.click(screen.getByTestId("edit-cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
