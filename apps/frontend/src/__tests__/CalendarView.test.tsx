/**
 * CalendarView tests — story-033.
 *
 * AC #1  Plant rows from Garden.plants[]
 * AC #2  12 month column headers
 * AC #3  Sticky plant name column with name/botanical
 * AC #4  Current month header highlighted
 * AC #5  Live search filters rows
 * AC #6  Click row opens PlantDetailPanel
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { CalendarView } from "../views/CalendarView";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { Plant } from "@api/plant";
import type { Garden } from "@api/garden";

const MOCK_PLANT: Plant = {
  id: "p1", name_common: "Rote Rose", name_botanical: "Rosa",
  icon: "🌹", origin_type: "native", category: "Strauch",
  lifecycle: "perennial", description: null, care_notes: null,
  sun_demand: null, water_demand: null, soil_type: null,
  frost_tolerance_min_c: null, temperature_protected: false,
  health_status: null, location: "Westbeet", watering_zone: null,
  purchase_date: null, purchase_price: null, 
  positions: [], attachments: [], journal_entries: [], tasks: [],
  schedules: [{
    id: "s1", schedule_type: "bloom",
    start_week: 18, end_week: 30,
    color: "#c0392b", label: "Rot", notes: null,
    created_at: "", updated_at: "",
  }],
  created_at: "", updated_at: "",
};

const MOCK_PLANT_2: Plant = {
  ...MOCK_PLANT,
  id: "p2", name_common: "Thuja", name_botanical: "Thuja occidentalis",
  schedules: [],
};

vi.mock("../api/client", () => ({
  apiClient: {
    getGarden: vi.fn().mockResolvedValue({
      plan_url: null, plan_name: null,
      plants: [
        {
          id: "p1", name_common: "Rote Rose", name_botanical: "Rosa",
          icon: "🌹", origin_type: "native", category: "Strauch",
          lifecycle: "perennial", description: null, care_notes: null,
          sun_demand: null, water_demand: null, soil_type: null,
          frost_tolerance_min_c: null, temperature_protected: false,
          health_status: null, location: "Westbeet", watering_zone: null,
          purchase_date: null, purchase_price: null, 
          positions: [], attachments: [], journal_entries: [], tasks: [],
          schedules: [{
            id: "s1", schedule_type: "bloom",
            start_week: 18, end_week: 30,
            color: "#c0392b", label: "Rot", notes: null,
            created_at: "", updated_at: "",
          }],
          created_at: "", updated_at: "",
        },
        {
          id: "p2", name_common: "Thuja", name_botanical: "Thuja occidentalis",
          icon: "🌲", origin_type: null, category: null,
          lifecycle: null, description: null, care_notes: null,
          sun_demand: null, water_demand: null, soil_type: null,
          frost_tolerance_min_c: null, temperature_protected: false,
          health_status: null, location: null, watering_zone: null,
          purchase_date: null, purchase_price: null, 
          positions: [], attachments: [], journal_entries: [], tasks: [],
          schedules: [],
          created_at: "", updated_at: "",
        },
      ],
      attachments: [], journal_entries: [], warnings: [],
    }),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({
      language: "de", location_city: null, location_zip: null,
      irrigation_zones: [], plant_categories: [], color_presets: [],
      task_lookback_weeks: 2, task_lookahead_weeks: 4,
      attachment_size_limit_mb: 10,
      ai_provider: null, ai_model: null, ai_api_key: null,
    }),
    deletePlant:      vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
  resetAiPanelState();
});

const MOCK_GARDEN: Garden = {
  plan_url: null, plan_name: null,
  plants: [MOCK_PLANT, MOCK_PLANT_2],
  attachments: [], journal_entries: [], warnings: [],
};

function renderCalendar(garden: Garden | null = MOCK_GARDEN) {
  return render(
    <I18nextProvider i18n={i18n}>
      <CalendarView garden={garden} loading={garden === null} invalidateGarden={vi.fn()} />
    </I18nextProvider>
  );
}

describe("CalendarView — layout", () => {
  it("renders calendar view container", () => {
    renderCalendar();
    expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
  });

  it("renders 12 month headers (AC #2)", async () => {
    renderCalendar();
    await waitFor(() => {
      const headers = screen.getAllByTestId(/^month-header-/);
      expect(headers).toHaveLength(12);
    });
  });

  it("renders search input (AC #5)", () => {
    renderCalendar();
    expect(screen.getByTestId("calendar-search")).toBeInTheDocument();
  });

  it("renders schedule type toggle buttons", () => {
    renderCalendar();
    expect(screen.getByTestId("schedule-toggle-bloom")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-toggle-pruning")).toBeInTheDocument();
  });
});

describe("CalendarView — plant rows (AC #1, #3)", () => {
  it("renders one row per plant", async () => {
    renderCalendar();
    await waitFor(() => {
      const rows = screen.getAllByTestId("calendar-plant-row");
      expect(rows).toHaveLength(2);
    });
  });

  it("shows plant common name", async () => {
    renderCalendar();
    await waitFor(() =>
      expect(screen.getByText("Rote Rose")).toBeInTheDocument()
    );
  });

  it("shows botanical name", async () => {
    renderCalendar();
    await waitFor(() =>
      expect(screen.getByText("Rosa")).toBeInTheDocument()
    );
  });
});

describe("CalendarView — bars", () => {
  it("renders a bar for plant with matching schedule type", async () => {
    renderCalendar();
    await waitFor(() => {
      const bars = screen.getAllByTestId("calendar-bar");
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  it("switching to pruning type shows no bars (no pruning schedules)", async () => {
    renderCalendar();
    await waitFor(() => screen.getAllByTestId("calendar-plant-row"));
    fireEvent.click(screen.getByTestId("schedule-toggle-pruning"));
    await waitFor(() => {
      const bars = screen.queryAllByTestId("calendar-bar");
      expect(bars).toHaveLength(0);
    });
  });
});

describe("CalendarView — search (AC #5)", () => {
  it("filters rows by plant name", async () => {
    renderCalendar();
    await waitFor(() => screen.getAllByTestId("calendar-plant-row"));
    fireEvent.change(screen.getByTestId("calendar-search"), { target: { value: "Thuja" } });
    await waitFor(() => {
      const rows = screen.getAllByTestId("calendar-plant-row");
      expect(rows).toHaveLength(1);
      expect(screen.getByText("Thuja")).toBeInTheDocument();
    });
  });

  it("shows 'Keine Pflanzen' when search has no match", async () => {
    renderCalendar();
    await waitFor(() => screen.getAllByTestId("calendar-plant-row"));
    fireEvent.change(screen.getByTestId("calendar-search"), { target: { value: "xyznotfound" } });
    await waitFor(() =>
      expect(screen.getByText("Keine Pflanzen gefunden.")).toBeInTheDocument()
    );
  });
});

describe("CalendarView — detail panel (AC #6)", () => {
  it("clicking a plant row shows the detail panel", async () => {
    renderCalendar();
    await waitFor(() => screen.getAllByTestId("calendar-plant-row"));
    fireEvent.click(screen.getAllByTestId("calendar-plant-row")[0]);
    await waitFor(() =>
      expect(screen.getByTestId("detail-close")).toBeInTheDocument()
    );
  });

  it("clicking same row again closes detail panel", async () => {
    renderCalendar();
    await waitFor(() => screen.getAllByTestId("calendar-plant-row"));
    const row = screen.getAllByTestId("calendar-plant-row")[0];
    fireEvent.click(row);
    await waitFor(() => screen.getByTestId("detail-close"));
    fireEvent.click(row);
    await waitFor(() =>
      expect(screen.queryByTestId("detail-close")).not.toBeInTheDocument()
    );
  });
});
