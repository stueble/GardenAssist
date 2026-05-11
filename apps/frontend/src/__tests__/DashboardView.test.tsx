/**
 * DashboardView tests — story-030.
 *
 * AC #1  Garden plan rendered (or placeholder)
 * AC #2  Plant pins rendered for plants with positions
 * AC #3  Red dot indicator present on pins with tasks
 * AC #5  Click pin opens PlantDetailPanel in left column
 * AC #6  Zoom buttons present
 * AC #7  Legend shown
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { DashboardView, computeFrostWarnings } from "../views/DashboardView";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { Plant } from "@api/plant";
import type { Garden } from "@api/garden";
import type { WeatherDay } from "@api/weather";

// JSDOM stub for ResizeObserver
if (!("ResizeObserver" in window)) {
  (window as unknown as Record<string, unknown>).ResizeObserver = class {
    observe()    {}
    unobserve()  {}
    disconnect() {}
  };
}

const MOCK_PLANT_WITH_POS: Plant = {
  id: "p1", name_common: "Rote Rose", name_botanical: "Rosa",
  icon: "🌹", origin_type: "native", category: "Strauch",
  lifecycle: "perennial", description: null, care_notes: null,
  sun_demand: "sunny", water_demand: "medium", soil_type: "loamy",
  frost_tolerance_min_c: -15, temperature_protected: false,
  health_status: "good", location: "Westbeet", watering_zone: null,
  purchase_date: null, purchase_price: null, 
  positions: [{ x_percent: 25, y_percent: 40 }],
  attachments: [], journal_entries: [],
  schedules: [{
    id: "s1", schedule_type: "pruning",
    start_week: 9, end_week: 11,
    color: "#27ae60", label: "Frühjahrsschnitt",
    notes: null, created_at: "", updated_at: "",
  }],
  tasks: [{
    status: "overdue",
    schedule: {
      id: "s1", schedule_type: "pruning",
      start_week: 9, end_week: 11,
      color: "#27ae60", label: "Frühjahrsschnitt",
      notes: null, created_at: "", updated_at: "",
    },
    week: "2026-W09",
  }],
  created_at: "", updated_at: "",
};

const MOCK_PLANT_NO_POS: Plant = {
  ...MOCK_PLANT_WITH_POS,
  id: "p2", name_common: "Tulpe",
  positions: [],
  tasks: [],
};

vi.mock("../api/client", () => ({
  getWeather: vi.fn().mockResolvedValue(null),
  apiClient: {
    getGarden: vi.fn().mockResolvedValue({
      plan_url:    "/static/garden/plan.png",
      plan_name:   "Gartenplan",
      plants: [
        {
          id: "p1", name_common: "Rote Rose", name_botanical: "Rosa",
          icon: "🌹", origin_type: "native", category: "Strauch",
          lifecycle: "perennial", description: null, care_notes: null,
          sun_demand: "sunny", water_demand: "medium", soil_type: "loamy",
          frost_tolerance_min_c: -15, temperature_protected: false,
          health_status: "good", location: "Westbeet", watering_zone: null,
          purchase_date: null, purchase_price: null, 
          positions: [{ x_percent: 25, y_percent: 40 }],
          attachments: [], journal_entries: [],
          schedules: [{
            id: "s1", schedule_type: "pruning",
            start_week: 9, end_week: 11,
            color: "#27ae60", label: "Frühjahrsschnitt",
            notes: null, created_at: "", updated_at: "",
          }],
          tasks: [{
            status: "overdue",
            schedule: {
              id: "s1", schedule_type: "pruning",
              start_week: 9, end_week: 11,
              color: "#27ae60", label: "Frühjahrsschnitt",
              notes: null, created_at: "", updated_at: "",
            },
            week: "2026-W09",
          }],
          created_at: "", updated_at: "",
        },
        {
          id: "p2", name_common: "Tulpe", name_botanical: null,
          icon: "🌷", origin_type: null, category: null,
          lifecycle: null, description: null, care_notes: null,
          sun_demand: null, water_demand: null, soil_type: null,
          frost_tolerance_min_c: null, temperature_protected: false,
          health_status: null, location: null, watering_zone: null,
          purchase_date: null, purchase_price: null, 
          positions: [], attachments: [], journal_entries: [], schedules: [], tasks: [],
          created_at: "", updated_at: "",
        },
      ],
      attachments: [], journal_entries: [],
      warnings: [],
    }),
    deletePlant:         vi.fn().mockResolvedValue(undefined),
    deleteAttachment:    vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({
      language: "de", location_city: null, location_zip: null,
      irrigation_zones: [], plant_categories: [], color_presets: [],
      task_lookback_weeks: 2, task_lookahead_weeks: 4,
      attachment_size_limit_mb: 10,
      ai_provider: null, ai_model: null, ai_api_key: null,
    }),
    createJournalEntry:  vi.fn().mockResolvedValue({ id: "je-1", entry_type: "done" }),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
  resetAiPanelState();
});

const MOCK_GARDEN: Garden = {
  plan_url:  "/static/garden/plan.png",
  plan_name: "Gartenplan",
  plants: [
    {
      id: "p1", name_common: "Rote Rose", name_botanical: "Rosa",
      icon: "🌹", origin_type: "native", category: "Strauch",
      lifecycle: "perennial", description: null, care_notes: null,
      sun_demand: "sunny", water_demand: "medium", soil_type: "loamy",
      frost_tolerance_min_c: -15, temperature_protected: false,
      health_status: "good", location: "Westbeet", watering_zone: null,
      purchase_date: null, purchase_price: null,
      positions: [{ x_percent: 25, y_percent: 40 }],
      attachments: [], journal_entries: [],
      schedules: [{
        id: "s1", schedule_type: "pruning",
        start_week: 9, end_week: 11,
        color: "#27ae60", label: "Frühjahrsschnitt",
        notes: null, created_at: "", updated_at: "",
      }],
      tasks: [{
        status: "overdue",
        schedule: {
          id: "s1", schedule_type: "pruning",
          start_week: 9, end_week: 11,
          color: "#27ae60", label: "Frühjahrsschnitt",
          notes: null, created_at: "", updated_at: "",
        },
        week: "2026-W09",
      }],
      created_at: "", updated_at: "",
    },
    {
      id: "p2", name_common: "Tulpe", name_botanical: null,
      icon: "🌷", origin_type: null, category: null,
      lifecycle: null, description: null, care_notes: null,
      sun_demand: null, water_demand: null, soil_type: null,
      frost_tolerance_min_c: null, temperature_protected: false,
      health_status: null, location: null, watering_zone: null,
      purchase_date: null, purchase_price: null,
      positions: [], attachments: [], journal_entries: [], schedules: [], tasks: [],
      created_at: "", updated_at: "",
    },
  ],
  attachments: [], journal_entries: [],
  warnings: [],
};

function renderDashboard(garden: Garden | null = MOCK_GARDEN) {
  return render(
    <I18nextProvider i18n={i18n}>
      <DashboardView garden={garden} loading={garden === null} invalidateGarden={vi.fn()} />
    </I18nextProvider>
  );
}

describe("DashboardView — layout", () => {
  it("renders the dashboard container", () => {
    renderDashboard();
    expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
  });

  it("renders the sidebar", () => {
    renderDashboard();
    expect(screen.getByTestId("dashboard-sidebar")).toBeInTheDocument();
  });

  it("renders the weather widget stub", () => {
    renderDashboard();
    expect(screen.getByTestId("weather-widget")).toBeInTheDocument();
  });

  it("renders the monthly band", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId("month-band")).toBeInTheDocument());
  });

  it("renders 12 month cells", async () => {
    renderDashboard();
    await waitFor(() => {
      const cells = screen.getAllByTestId(/^month-cell-/);
      expect(cells).toHaveLength(12);
    });
  });
});

describe("DashboardView — frost warnings section", () => {
  it("shows no warnings section when no frost risk exists", async () => {
    // MOCK_GARDEN plants have no frost_tolerance_min_c set → no warnings
    renderDashboard();
    await waitFor(() => screen.getByTestId("dashboard-view"));
    expect(screen.queryByTestId("warnings-section")).not.toBeInTheDocument();
  });
});

describe("DashboardView — garden plan (AC #1)", () => {
  it("renders GardenPlanWidget", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-widget")).toBeInTheDocument()
    );
  });

  it("renders plan image when plan_url is set", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByTestId("garden-plan-img")).toBeInTheDocument()
    );
  });
});

describe("DashboardView — pins (AC #2)", () => {
  it("renders one pin for the plant that has a position", async () => {
    renderDashboard();
    await waitFor(() => {
      const pins = screen.getAllByTestId(/^plan-pin-/);
      expect(pins).toHaveLength(1); // only MOCK_PLANT_WITH_POS has positions
    });
  });
});

describe("DashboardView — zoom buttons (AC #6)", () => {
  it("renders fit-height button", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByTestId("zoom-btn-fit-h")).toBeInTheDocument()
    );
  });

  it("renders fit-width button", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByTestId("zoom-btn-fit-w")).toBeInTheDocument()
    );
  });
});

describe("DashboardView — legend (AC #7)", () => {
  it("renders the legend", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByTestId("plan-legend")).toBeInTheDocument()
    );
  });
});

describe("DashboardView — pin click opens detail panel (AC #5)", () => {
  it("clicking a plant pin opens the detail panel (close button visible)", async () => {
    renderDashboard();
    await waitFor(() => screen.getByTestId("plan-pin-0"));
    fireEvent.click(screen.getByTestId("plan-pin-0"));
    await waitFor(() =>
      expect(screen.getByTestId("detail-close")).toBeInTheDocument()
    );
  });

  it("clicking the same pin again closes the detail panel", async () => {
    renderDashboard();
    await waitFor(() => screen.getByTestId("plan-pin-0"));
    fireEvent.click(screen.getByTestId("plan-pin-0"));
    await waitFor(() => screen.getByTestId("detail-close"));
    fireEvent.click(screen.getByTestId("plan-pin-0"));
    await waitFor(() =>
      expect(screen.queryByTestId("detail-close")).not.toBeInTheDocument()
    );
  });

  it("todo list shown by default (no plant selected)", async () => {
    // With plants that have tasks, todo list should render
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByTestId("todo-list")).toBeInTheDocument()
    );
  });

  it("closing detail panel with ✕ restores todo list", async () => {
    renderDashboard();
    await waitFor(() => screen.getByTestId("plan-pin-0"));
    fireEvent.click(screen.getByTestId("plan-pin-0"));
    await waitFor(() => screen.getByTestId("detail-close"));
    fireEvent.click(screen.getByTestId("detail-close"));
    await waitFor(() =>
      expect(screen.getByTestId("todo-list")).toBeInTheDocument()
    );
  });
});

// ── story-032: Monthly task band ──────────────────────────────────────────────

describe("DashboardView — MonthBand (story-032)", () => {
  it("renders 12 month cells (AC #1)", async () => {
    renderDashboard();
    await waitFor(() => {
      const cells = screen.getAllByTestId(/^month-cell-/);
      expect(cells).toHaveLength(12);
    });
  });

  it("current month cell is rendered (AC #2)", async () => {
    renderDashboard();
    await waitFor(() => screen.getByTestId("month-band"));
    // At least one cell exists — current month is determined by runtime date
    const cells = screen.getAllByTestId(/^month-cell-/);
    expect(cells).toHaveLength(12);
  });

  it("shows colored dot for plant with pruning schedule in correct month (AC #3)", async () => {
    renderDashboard();
    await waitFor(() => screen.getByTestId("month-band"));
    // Pruning w9-11 → month index 2 (März) — dot should exist there
    const dots = screen.getAllByTestId("month-dot");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("tooltip appears on month cell hover (AC #4)", async () => {
    renderDashboard();
    await waitFor(() => screen.getAllByTestId(/^month-cell-/));
    // Hover the March cell (idx 2) which should have a pruning schedule
    const marchCell = screen.getByTestId("month-cell-2");
    fireEvent.mouseEnter(marchCell.firstElementChild!);
    await waitFor(() =>
      expect(screen.queryByTestId("month-tooltip")).toBeInTheDocument()
    );
  });

  it("tooltip disappears on mouse leave (AC #4)", async () => {
    renderDashboard();
    await waitFor(() => screen.getAllByTestId(/^month-cell-/));
    const marchCell = screen.getByTestId("month-cell-2");
    const trigger = marchCell.firstElementChild!;
    fireEvent.mouseEnter(trigger);
    await waitFor(() => screen.queryByTestId("month-tooltip"));
    fireEvent.mouseLeave(trigger);
    await waitFor(() =>
      expect(screen.queryByTestId("month-tooltip")).not.toBeInTheDocument()
    );
  });
});

// ── computeFrostWarnings unit tests ──────────────────────────────────────────

function makeForecast(overrides: Partial<WeatherDay>[] = []): WeatherDay[] {
  const base: WeatherDay = {
    date: "2026-05-11", weather_code: 0,
    temp_max: 10, temp_min: 2, precipitation: 0,
  };
  return overrides.map((o, i) => ({
    ...base,
    date: `2026-05-${String(11 + i).padStart(2, "0")}`,
    ...o,
  }));
}

function makePlantForFrost(overrides: Partial<Plant> = {}): Plant {
  return {
    ...MOCK_GARDEN.plants[0],
    frost_tolerance_min_c: -2,
    temperature_protected: false,
    location: "Beet A",
    ...overrides,
  };
}

describe("computeFrostWarnings", () => {
  it("returns empty array when no plants", () => {
    const result = computeFrostWarnings([], makeForecast([{ temp_min: -5 }]), "de");
    expect(result).toHaveLength(0);
  });

  it("returns empty array when forecast is empty", () => {
    const result = computeFrostWarnings([makePlantForFrost()], [], "de");
    expect(result).toHaveLength(0);
  });

  it("skips plant with temperature_protected: true", () => {
    const plant = makePlantForFrost({ temperature_protected: true });
    const result = computeFrostWarnings([plant], makeForecast([{ temp_min: -5 }]), "de");
    expect(result).toHaveLength(0);
  });

  it("skips plant with frost_tolerance_min_c: null", () => {
    const plant = makePlantForFrost({ frost_tolerance_min_c: null });
    const result = computeFrostWarnings([plant], makeForecast([{ temp_min: -5 }]), "de");
    expect(result).toHaveLength(0);
  });

  it("returns no warning when temp_min stays above limit", () => {
    const plant = makePlantForFrost({ frost_tolerance_min_c: -5 });
    const result = computeFrostWarnings([plant], makeForecast([{ temp_min: -4 }, { temp_min: -3 }]), "de");
    expect(result).toHaveLength(0);
  });

  it("returns warning when temp_min falls below limit", () => {
    const plant = makePlantForFrost({ frost_tolerance_min_c: -2 });
    const result = computeFrostWarnings([plant], makeForecast([{ temp_min: -3 }]), "de");
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain("Rote Rose");
    expect(result[0].message).toContain("Beet A");
    expect(result[0].sub).toContain("-3°C");
    expect(result[0].sub).toContain("-2°C");
  });

  it("uses the first day the limit is breached", () => {
    const plant = makePlantForFrost({ frost_tolerance_min_c: -2 });
    const forecast = makeForecast([
      { temp_min: 1 },    // day 1: fine
      { temp_min: -3 },   // day 2: first breach
      { temp_min: -5 },   // day 3: also breach
    ]);
    const result = computeFrostWarnings([plant], forecast, "de");
    expect(result).toHaveLength(1);
    // sub should mention day 2 date (12.05.) and NOT day 3 (13.05.)
    expect(result[0].sub).toContain("12.05.");
    expect(result[0].sub).not.toContain("13.05.");
  });

  it("omits location when plant.location is null", () => {
    const plant = makePlantForFrost({ location: null });
    const result = computeFrostWarnings([plant], makeForecast([{ temp_min: -5 }]), "de");
    expect(result).toHaveLength(1);
    expect(result[0].message).not.toContain("(");
    expect(result[0].message).toContain("Rote Rose");
  });

  it("returns one warning per affected plant", () => {
    const p1 = makePlantForFrost({ id: "p1", name_common: "Rose",  frost_tolerance_min_c: -2 });
    const p2 = makePlantForFrost({ id: "p2", name_common: "Thuja", frost_tolerance_min_c: -10 });
    const forecast = makeForecast([{ temp_min: -3 }]);  // -3 breaches -2 but not -10
    const result = computeFrostWarnings([p1, p2], forecast, "de");
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain("Rose");
  });

  it("uses English locale for EN language", () => {
    const plant = makePlantForFrost({ frost_tolerance_min_c: -2 });
    const result = computeFrostWarnings([plant], makeForecast([{ temp_min: -3 }]), "en");
    expect(result[0].sub).toMatch(/Frost expected/);
    expect(result[0].sub).toMatch(/limit/);
  });
});
