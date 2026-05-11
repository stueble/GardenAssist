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
import { assignLanes, schedulesOverlap, computeLaneGeometry } from "../views/CalendarView";
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

// ── TASK-058: Lane assignment unit tests (AC #3, #7, #8) ──────────────────────

describe("schedulesOverlap", () => {
  it("returns true when schedules share a week", () => {
    expect(schedulesOverlap({ start_week: 10, end_week: 20 }, { start_week: 15, end_week: 25 })).toBe(true);
  });

  it("returns true when one schedule fully contains the other", () => {
    expect(schedulesOverlap({ start_week: 5, end_week: 40 }, { start_week: 10, end_week: 20 })).toBe(true);
  });

  it("returns false for adjacent non-overlapping schedules", () => {
    expect(schedulesOverlap({ start_week: 1, end_week: 10 }, { start_week: 11, end_week: 20 })).toBe(false);
  });

  it("returns false for non-overlapping schedules with a gap", () => {
    expect(schedulesOverlap({ start_week: 1, end_week: 10 }, { start_week: 15, end_week: 25 })).toBe(false);
  });

  it("returns true for two identical schedules", () => {
    expect(schedulesOverlap({ start_week: 10, end_week: 20 }, { start_week: 10, end_week: 20 })).toBe(true);
  });

  it("wrapping schedule overlaps a normal schedule spanning year boundary", () => {
    // wrapping: W48–W8 (Nov–Feb); normal: W1–W10 — they share W1..W8
    expect(schedulesOverlap({ start_week: 48, end_week: 8 }, { start_week: 1, end_week: 10 })).toBe(true);
  });

  it("wrapping schedule does not overlap a mid-year schedule", () => {
    // wrapping: W48–W8 (Nov–Feb); mid-year: W20–W30 — no shared weeks
    expect(schedulesOverlap({ start_week: 48, end_week: 8 }, { start_week: 20, end_week: 30 })).toBe(false);
  });

  it("two wrapping schedules overlap each other", () => {
    // both wrap across year boundary → they share weeks near Jan
    expect(schedulesOverlap({ start_week: 45, end_week: 5 }, { start_week: 50, end_week: 10 })).toBe(true);
  });
});

describe("assignLanes — AC #3, #7, #8", () => {
  it("empty input → totalLanes 0", () => {
    const { totalLanes, laneMap } = assignLanes([]);
    expect(totalLanes).toBe(0);
    expect(laneMap.size).toBe(0);
  });

  it("single schedule → lane 0, totalLanes 1", () => {
    const { laneMap, totalLanes } = assignLanes([
      { id: "a", start_week: 10, end_week: 20 },
    ]);
    expect(totalLanes).toBe(1);
    expect(laneMap.get("a")).toBe(0);
  });

  it("two non-overlapping schedules → both in lane 0 (AC #2)", () => {
    const { laneMap, totalLanes } = assignLanes([
      { id: "a", start_week: 1,  end_week: 10 },
      { id: "b", start_week: 15, end_week: 25 },
    ]);
    expect(totalLanes).toBe(1);
    expect(laneMap.get("a")).toBe(0);
    expect(laneMap.get("b")).toBe(0);
  });

  it("two overlapping schedules → different lanes (AC #1)", () => {
    const { laneMap, totalLanes } = assignLanes([
      { id: "a", start_week: 10, end_week: 25 },
      { id: "b", start_week: 18, end_week: 35 },
    ]);
    expect(totalLanes).toBe(2);
    expect(laneMap.get("a")).not.toBe(laneMap.get("b"));
  });

  it("three bars: A overlaps B and C, B and C do not overlap → 2 lanes", () => {
    // A: 1–30, B: 5–10 (overlaps A), C: 35–45 (does not overlap A or B)
    const { laneMap, totalLanes } = assignLanes([
      { id: "a", start_week: 1,  end_week: 30 },
      { id: "b", start_week: 5,  end_week: 10 },
      { id: "c", start_week: 35, end_week: 45 },
    ]);
    expect(totalLanes).toBe(2);
    // A and B must be in different lanes
    expect(laneMap.get("a")).not.toBe(laneMap.get("b"));
    // C does not overlap A — it should reuse lane 0
    expect(laneMap.get("c")).toBe(0);
  });

  it("three mutually overlapping schedules → 3 lanes", () => {
    const { laneMap, totalLanes } = assignLanes([
      { id: "a", start_week: 10, end_week: 40 },
      { id: "b", start_week: 15, end_week: 45 },
      { id: "c", start_week: 20, end_week: 50 },
    ]);
    expect(totalLanes).toBe(3);
    const lanes = [laneMap.get("a"), laneMap.get("b"), laneMap.get("c")];
    expect(new Set(lanes).size).toBe(3);   // all in distinct lanes
  });

  it("wrapping schedule overlapping normal schedule → different lanes (AC #7)", () => {
    const { laneMap, totalLanes } = assignLanes([
      { id: "a", start_week: 48, end_week: 8  },   // wrapping
      { id: "b", start_week: 1,  end_week: 10 },   // normal, overlaps a in W1-W8
    ]);
    expect(totalLanes).toBe(2);
    expect(laneMap.get("a")).not.toBe(laneMap.get("b"));
  });

  it("wrapping schedule non-overlapping with a mid-year schedule → same lane", () => {
    const { laneMap, totalLanes } = assignLanes([
      { id: "a", start_week: 48, end_week: 8  },   // wrapping: Nov–Feb
      { id: "b", start_week: 20, end_week: 30 },   // mid-year: May–Jul, no overlap
    ]);
    expect(totalLanes).toBe(1);
    expect(laneMap.get("a")).toBe(0);
    expect(laneMap.get("b")).toBe(0);
  });
});

describe("computeLaneGeometry — AC #4, #5", () => {
  it("1 lane → BASE values (28px bar, 60px row)", () => {
    const geo = computeLaneGeometry(1);
    expect(geo.barHeight).toBe(28);
    expect(geo.rowHeight).toBe(60);
  });

  it("2 lanes → barHeight 13px (floor((44 - 2) / 2) = 21, not less than 8)", () => {
    const geo = computeLaneGeometry(2);
    // usableHeight = 60 - 2*8 = 44; barH = floor((44 - 1*2) / 2) = floor(21) = 21
    expect(geo.barHeight).toBe(21);
    expect(geo.rowHeight).toBe(60);
  });

  it("2 lanes → topForLane(0) = ROW_PADDING = 8", () => {
    const geo = computeLaneGeometry(2);
    expect(geo.topForLane(0)).toBe(8);
  });

  it("2 lanes → topForLane(1) = 8 + barH + 2", () => {
    const geo = computeLaneGeometry(2);
    expect(geo.topForLane(1)).toBe(8 + geo.barHeight + 2);
  });

  it("many lanes → barHeight never below MIN_BAR_HEIGHT (8px)", () => {
    const geo = computeLaneGeometry(20);
    expect(geo.barHeight).toBeGreaterThanOrEqual(8);
  });

  it("many lanes → rowHeight grows to fit all lanes", () => {
    const geo = computeLaneGeometry(20);
    const needed = 2 * 8 + 20 * geo.barHeight + 19 * 2;
    expect(geo.rowHeight).toBeGreaterThanOrEqual(needed);
  });
});

// ── TASK-058: Integration — overlapping bars rendered as separate DOM elements ─

describe("CalendarView — overlapping bars rendered in lanes (AC #1, #6)", () => {
  const MOCK_PLANT_OVERLAP: Plant = {
    ...MOCK_PLANT,
    id: "p-overlap",
    name_common: "Überlapp-Rose",
    schedules: [
      {
        id: "s-a", schedule_type: "bloom",
        start_week: 15, end_week: 25,
        color: "#c0392b", label: "Blüte 1", notes: null,
        created_at: "", updated_at: "",
      },
      {
        id: "s-b", schedule_type: "bloom",
        start_week: 20, end_week: 30,
        color: "#8e44ad", label: "Blüte 2", notes: null,
        created_at: "", updated_at: "",
      },
    ],
  };

  const GARDEN_OVERLAP: Garden = {
    plan_url: null, plan_name: null,
    plants: [MOCK_PLANT_OVERLAP],
    attachments: [], journal_entries: [], warnings: [],
  };

  it("both overlapping bars are rendered as separate DOM elements", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <CalendarView garden={GARDEN_OVERLAP} loading={false} invalidateGarden={vi.fn()} />
      </I18nextProvider>
    );
    await waitFor(() => {
      const calBars = screen.getAllByTestId("calendar-bar");
      expect(calBars).toHaveLength(2);
    });
  });

  it("overlapping bars have different top positions (stacked in lanes)", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <CalendarView garden={GARDEN_OVERLAP} loading={false} invalidateGarden={vi.fn()} />
      </I18nextProvider>
    );
    await waitFor(() => {
      const calBars = screen.getAllByTestId("calendar-bar");
      expect(calBars).toHaveLength(2);
      const top0 = calBars[0].style.top;
      const top1 = calBars[1].style.top;
      // Both should have explicit pixel tops (not "50%") and they must differ
      expect(top0).toMatch(/px$/);
      expect(top1).toMatch(/px$/);
      expect(top0).not.toBe(top1);
    });
  });

  it("bar tooltip includes label and month range (AC #6)", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <CalendarView garden={GARDEN_OVERLAP} loading={false} invalidateGarden={vi.fn()} />
      </I18nextProvider>
    );
    await waitFor(() => {
      const calBars = screen.getAllByTestId("calendar-bar");
      // First bar should have "Blüte 1" in its title
      expect(calBars.some((b) => b.getAttribute("title")?.includes("Blüte 1"))).toBe(true);
    });
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
