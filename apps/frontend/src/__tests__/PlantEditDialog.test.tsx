/**
 * PlantEditDialog tests — story-026 + story-027.
 *
 * Verifies:
 * story-026:
 * - AC #1: Dialog opens as left panel (renders in PlantsView on FAB click)
 * - AC #2: All Grunddaten fields present
 * - AC #3: Icon picker with 20 options, auto-suggestion from category
 * - AC #4: Enum dropdowns (origin, lifecycle, sun, water, soil) from i18n
 * - AC #5: Category + watering zone from Settings
 * - AC #6: Cancel closes with confirmation when dirty
 *
 * story-027:
 * - AC #1: Each schedule type rendered as a collapsible section
 * - AC #2: Add entry button creates a new schedule row
 * - AC #3: Color picker shown for bloom/foliage/misc; absent for others
 * - AC #4: Week selects present; year-wrap indicator shown when start > end
 * - AC #5: Delete button removes a schedule entry
 * - AC #6: Entry count badge shown in section header
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { PlantEditDialog } from "../components/PlantEditDialog";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { Plant } from "@api/plant";
import type { Schedule } from "@api/schedule";

const MOCK_COLOR_PRESETS = [
  { schedule_type: "bloom" as const, name: "Dunkelrot", color: "#c0392b" },
  { schedule_type: "bloom" as const, name: "Rosa",      color: "#ff6b9d" },
  { schedule_type: "foliage" as const, name: "Frühjahrsgrün", color: "#a8d5a2" },
  { schedule_type: "misc" as const, name: "Orange", color: "#e67e22" },
];

const MOCK_SETTINGS = {
  language: "de", location_city: null, location_zip: null,
  irrigation_zones: ["Beet West", "Terrasse"],
  plant_categories: ["Strauch", "Baum", "Staude"],
  color_presets: MOCK_COLOR_PRESETS,
  task_lookback_weeks: 2, task_lookahead_weeks: 4,
  attachment_size_limit_mb: 10,
  ai_provider: null, ai_model: null, ai_api_key: null,
};

const MOCK_SCHEDULE: Schedule = {
  id: "s1", schedule_type: "bloom",
  start_week: 17, end_week: 36,
  color: "#c0392b", label: "Rot", notes: "Hauptblüte",
  created_at: "", updated_at: "",
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
      color_presets: [
        { schedule_type: "bloom",    name: "Dunkelrot",      color: "#c0392b" },
        { schedule_type: "bloom",    name: "Rosa",           color: "#ff6b9d" },
        { schedule_type: "foliage",  name: "Frühjahrsgrün",  color: "#a8d5a2" },
        { schedule_type: "misc",     name: "Orange",         color: "#e67e22" },
      ],
      task_lookback_weeks: 2, task_lookahead_weeks: 4,
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

/** Opens a collapsible section by clicking the role=button that contains the given text. */
function openSection(sectionText: string) {
  const headers = screen.getAllByRole("button");
  const header = headers.find((el) => el.textContent?.includes(sectionText));
  if (!header) throw new Error(`Section header not found: ${sectionText}`);
  fireEvent.click(header);
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

// ── story-027: Schedule sections ─────────────────────────────────────────────

describe("PlantEditDialog — schedule sections (AC #1)", () => {
  it("renders all 6 schedule section headers (collapsed by default)", () => {
    renderDialog(null);
    // Sections render their headers even when collapsed; add-buttons are inside children
    // We verify by opening each and checking the add-button appears
    openSection("Blütezeiten");
    expect(screen.getByTestId("add-schedule-bloom")).toBeInTheDocument();
    openSection("Wachstum");
    expect(screen.getByTestId("add-schedule-growth")).toBeInTheDocument();
    openSection("Blätter");
    expect(screen.getByTestId("add-schedule-foliage")).toBeInTheDocument();
    openSection("Schnittzeiten");
    expect(screen.getByTestId("add-schedule-pruning")).toBeInTheDocument();
    openSection("Düngezeiten");
    expect(screen.getByTestId("add-schedule-fertilization")).toBeInTheDocument();
    openSection("Sonstiges");
    expect(screen.getByTestId("add-schedule-misc")).toBeInTheDocument();
  });
});

describe("PlantEditDialog — add schedule entry (AC #2)", () => {
  it("clicking add-bloom creates a schedule entry with week selects", () => {
    renderDialog(null);
    openSection("Blütezeiten");
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    const entries = screen.getAllByTestId("schedule-entry");
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(within(entry).getByTestId("week-start")).toBeInTheDocument();
    expect(within(entry).getByTestId("week-end")).toBeInTheDocument();
  });

  it("clicking add-growth creates an entry with color swatch (all types have color)", () => {
    renderDialog(null);
    openSection("Wachstum");
    fireEvent.click(screen.getByTestId("add-schedule-growth"));
    const entry = screen.getByTestId("schedule-entry");
    expect(within(entry).getByTestId("color-swatch-btn")).toBeInTheDocument();
  });
});

describe("PlantEditDialog — color picker (AC #3)", () => {
  it("bloom entry shows color swatch button", () => {
    renderDialog(null);
    openSection("Blütezeiten");
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    expect(screen.getByTestId("color-swatch-btn")).toBeInTheDocument();
  });

  it("pruning entry shows color swatch button (all types have color)", () => {
    renderDialog(null);
    openSection("Schnittzeiten");
    fireEvent.click(screen.getByTestId("add-schedule-pruning"));
    expect(screen.getByTestId("color-swatch-btn")).toBeInTheDocument();
  });

  it("opening color popup shows presets from Settings (AC #3)", async () => {
    renderDialog(null);
    openSection("Blütezeiten");
    // Wait for settings (color presets) to load
    await waitFor(() => screen.getByTestId("add-schedule-bloom"));
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    fireEvent.click(screen.getByTestId("color-swatch-btn"));
    await waitFor(() => expect(screen.getByTestId("color-popup")).toBeInTheDocument());
    expect(screen.getByTestId("color-preset-Dunkelrot")).toBeInTheDocument();
    expect(screen.getByTestId("color-preset-Rosa")).toBeInTheDocument();
  });

  it("selecting bloom preset auto-fills label", async () => {
    renderDialog(null);
    openSection("Blütezeiten");
    await waitFor(() => screen.getByTestId("add-schedule-bloom"));
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    fireEvent.click(screen.getByTestId("color-swatch-btn"));
    await waitFor(() => screen.getByTestId("color-preset-Dunkelrot"));
    fireEvent.click(screen.getByTestId("color-preset-Dunkelrot"));
    const label = screen.getByTestId("schedule-label") as HTMLInputElement;
    expect(label.value).toBe("Dunkelrot");
  });
});

describe("PlantEditDialog — week range (AC #4)", () => {
  it("wrap indicator appears when start > end", () => {
    renderDialog(null);
    openSection("Blütezeiten");
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    const startSel = screen.getByTestId("week-start") as HTMLSelectElement;
    const endSel   = screen.getByTestId("week-end")   as HTMLSelectElement;
    // Set start=40 (W1 Okt, idx 40), end=3 (W4 Jan, idx 3) → wrap
    fireEvent.change(startSel, { target: { value: "40" } });
    fireEvent.change(endSel,   { target: { value: "3"  } });
    expect(screen.getByTestId("wrap-indicator")).toBeInTheDocument();
  });

  it("no wrap indicator when start <= end", () => {
    renderDialog(null);
    openSection("Blütezeiten");
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    const startSel = screen.getByTestId("week-start");
    const endSel   = screen.getByTestId("week-end");
    fireEvent.change(startSel, { target: { value: "4"  } });
    fireEvent.change(endSel,   { target: { value: "20" } });
    expect(screen.queryByTestId("wrap-indicator")).not.toBeInTheDocument();
  });
});

describe("PlantEditDialog — delete schedule entry (AC #5)", () => {
  it("delete button removes the entry", () => {
    renderDialog(null);
    openSection("Blütezeiten");
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    expect(screen.getAllByTestId("schedule-entry")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("schedule-entry-delete"));
    expect(screen.queryAllByTestId("schedule-entry")).toHaveLength(0);
  });
});

describe("PlantEditDialog — entry count badge (AC #6)", () => {
  it("count badge not visible when no entries", () => {
    renderDialog(null);
    // No numeric badge before any entries are added
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("count badge shows 1 after adding one bloom entry", () => {
    renderDialog(null);
    openSection("Blütezeiten");
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    // Badge is a span sibling of the section title with text "1"
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("count badge shows 2 after adding two bloom entries", () => {
    renderDialog(null);
    openSection("Blütezeiten");
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

describe("PlantEditDialog — pre-fill schedules from existing plant (AC #2)", () => {
  const plantWithSchedule: Plant = {
    ...{
      id: "p2", name_common: "Tulpe", name_botanical: null,
      icon: "🌷", origin_type: null, category: null,
      lifecycle: null, description: null, care_notes: null,
      sun_demand: null, water_demand: null, soil_type: null,
      frost_tolerance_min_c: null, temperature_protected: false,
      health_status: null, location: null, watering_zone: null,
      purchase_date: null, purchase_price: null, thumbnail_attachment_id: null,
      positions: [], attachments: [], journal_entries: [], tasks: [],
      created_at: "", updated_at: "",
    },
    schedules: [MOCK_SCHEDULE],
  };

  it("pre-fills one bloom entry from plant.schedules", () => {
    renderDialog(plantWithSchedule);
    openSection("Blütezeiten");
    const entries = screen.getAllByTestId("schedule-entry");
    expect(entries).toHaveLength(1);
  });

  it("pre-filled entry has correct label", () => {
    renderDialog(plantWithSchedule);
    openSection("Blütezeiten");
    const label = screen.getByTestId("schedule-label") as HTMLInputElement;
    expect(label.value).toBe("Rot");
  });
});

describe("PlantEditDialog — schedules included in save payload (AC #2)", () => {
  it("createPlant is called with schedules array when entries exist", async () => {
    const { apiClient } = await import("../api/client");
    renderDialog(null);
    fireEvent.change(screen.getByTestId("field-name"), { target: { value: "Tulpe" } });
    openSection("Blütezeiten");
    fireEvent.click(screen.getByTestId("add-schedule-bloom"));
    fireEvent.click(screen.getByTestId("edit-save"));
    await waitFor(() => expect(apiClient.createPlant).toHaveBeenCalledOnce());
    const payload = (apiClient.createPlant as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.schedules).toHaveLength(1);
    expect(payload.schedules[0].schedule_type).toBe("bloom");
  });
});
