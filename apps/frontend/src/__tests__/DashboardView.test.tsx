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
import { DashboardView } from "../views/DashboardView";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { Plant } from "@api/plant";

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
  purchase_date: null, purchase_price: null, thumbnail_attachment_id: null,
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
          purchase_date: null, purchase_price: null, thumbnail_attachment_id: null,
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
          purchase_date: null, purchase_price: null, thumbnail_attachment_id: null,
          positions: [], attachments: [], journal_entries: [], schedules: [], tasks: [],
          created_at: "", updated_at: "",
        },
      ],
      attachments: [], journal_entries: [],
    }),
    deletePlant:         vi.fn().mockResolvedValue(undefined),
    deleteAttachment:    vi.fn().mockResolvedValue(undefined),
    createJournalEntry:  vi.fn().mockResolvedValue({ id: "je-1", entry_type: "done" }),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
  resetAiPanelState();
});

function renderDashboard() {
  return render(
    <I18nextProvider i18n={i18n}>
      <DashboardView />
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
