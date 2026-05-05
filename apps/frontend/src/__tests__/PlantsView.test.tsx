/**
 * PlantsView tests.
 *
 * Verifies:
 * - AC #1: Table renders plants from Garden.plants[]
 * - AC #2: Live search filters by name, botanical name, location
 * - AC #3: Column headers clickable for sort
 * - AC #4: Status derived from tasks[]
 * - AC #5: View toggle switches between table and card layout
 * - AC #6: FAB button visible
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { PlantsView } from "../views/PlantsView";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { Garden } from "@api/garden";
import type { Plant } from "@api/plant";

// ── Mock data ─────────────────────────────────────────────────────────────────

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id:                      "plant-1",
    name_common:             "Rose",
    name_botanical:          "Rosa",
    icon:                    "🌹",
    origin_type:             null,
    category:                "Strauch",
    lifecycle:               null,
    description:             null,
    care_notes:              "Schnitt im Frühjahr",
    sun_demand:              null,
    water_demand:            null,
    soil_type:               null,
    frost_tolerance_min_c:   -15,
    temperature_protected:   false,
    health_status:           null,
    location:                "Westbeet",
    watering_zone:           null,
    purchase_date:           "2022-04-01",
    purchase_price:          null,
    thumbnail_attachment_id: null,
    positions:               [],
    attachments:             [],
    journal_entries:         [],
    schedules:               [],
    tasks:                   [],
    created_at:              "2022-04-01T00:00:00Z",
    updated_at:              "2022-04-01T00:00:00Z",
    ...overrides,
  };
}

const MOCK_GARDEN: Garden = {
  plan_url:        null,
  plan_name:       null,
  attachments:     [],
  journal_entries: [],
  plants: [
    makePlant({ id: "p1", name_common: "Rose",         name_botanical: "Rosa",      location: "Westbeet", tasks: [] }),
    makePlant({ id: "p2", name_common: "Rhododendron", name_botanical: "Rhodo hyb.", location: "Terrasse", category: "Strauch",
      tasks: [{ schedule: { id:"s1", schedule_type:"fertilization", start_week:14, end_week:20, color:null, label:"Düngen", notes:null, created_at:"", updated_at:"" }, week:"2026-W19", status:"due" }]
    }),
    makePlant({ id: "p3", name_common: "Gingko", name_botanical: null, location: "Einfahrt", tasks: [
      { schedule: { id:"s2", schedule_type:"pruning", start_week:1, end_week:5, color:null, label:"Schnitt", notes:null, created_at:"", updated_at:"" }, week:"2026-W01", status:"overdue" }
    ]}),
  ],
};

vi.mock("../api/client", () => ({
  apiClient: {
    // Data inlined — vi.mock is hoisted, cannot reference module-level variables
    getGarden: vi.fn().mockResolvedValue({
      plan_url: null, plan_name: null, attachments: [], journal_entries: [],
      plants: [
        {
          id:"p1", name_common:"Rose", name_botanical:"Rosa", icon:"🌹",
          origin_type:null, category:"Strauch", lifecycle:null,
          description:null, care_notes:"Schnitt im Frühjahr",
          sun_demand:null, water_demand:null, soil_type:null,
          frost_tolerance_min_c:-15, temperature_protected:false,
          health_status:null, location:"Westbeet", watering_zone:null,
          purchase_date:"2022-04-01", purchase_price:null,
          thumbnail_attachment_id:null,
          positions:[], attachments:[], journal_entries:[], schedules:[],
          tasks:[], created_at:"2022-04-01T00:00:00Z", updated_at:"2022-04-01T00:00:00Z",
        },
        {
          id:"p2", name_common:"Rhododendron", name_botanical:"Rhodo hyb.", icon:null,
          origin_type:null, category:"Strauch", lifecycle:null,
          description:null, care_notes:null,
          sun_demand:null, water_demand:null, soil_type:null,
          frost_tolerance_min_c:null, temperature_protected:false,
          health_status:null, location:"Terrasse", watering_zone:null,
          purchase_date:null, purchase_price:null, thumbnail_attachment_id:null,
          positions:[], attachments:[], journal_entries:[], schedules:[],
          tasks:[{ schedule:{ id:"s1", schedule_type:"fertilization", start_week:14, end_week:20, color:null, label:"Düngen", notes:null, created_at:"", updated_at:"" }, week:"2026-W19", status:"due" }],
          created_at:"2022-04-01T00:00:00Z", updated_at:"2022-04-01T00:00:00Z",
        },
        {
          id:"p3", name_common:"Gingko", name_botanical:null, icon:null,
          origin_type:null, category:null, lifecycle:null,
          description:null, care_notes:null,
          sun_demand:null, water_demand:null, soil_type:null,
          frost_tolerance_min_c:null, temperature_protected:false,
          health_status:null, location:"Einfahrt", watering_zone:null,
          purchase_date:null, purchase_price:null, thumbnail_attachment_id:null,
          positions:[], attachments:[], journal_entries:[], schedules:[],
          tasks:[{ schedule:{ id:"s2", schedule_type:"pruning", start_week:1, end_week:5, color:null, label:"Schnitt", notes:null, created_at:"", updated_at:"" }, week:"2026-W01", status:"overdue" }],
          created_at:"2022-04-01T00:00:00Z", updated_at:"2022-04-01T00:00:00Z",
        },
      ],
    }),
    getSettings: vi.fn().mockResolvedValue({ ai_provider: null, ai_api_key: null }),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
  resetAiPanelState();
});

function renderView() {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <PlantsView />
      </I18nextProvider>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PlantsView — table rendering (AC #1)", () => {
  it("renders all plants from Garden.plants[]", async () => {
    renderView();
    await waitFor(() =>
      expect(screen.getAllByTestId("plant-row")).toHaveLength(3)
    );
    expect(screen.getByText("Rose")).toBeInTheDocument();
    expect(screen.getByText("Rhododendron")).toBeInTheDocument();
    expect(screen.getByText("Gingko")).toBeInTheDocument();
  });

  it("shows botanical name in table row", async () => {
    renderView();
    await waitFor(() => expect(screen.getByText("Rosa")).toBeInTheDocument());
  });

  it("shows location in table row", async () => {
    renderView();
    await waitFor(() => expect(screen.getByText("Westbeet")).toBeInTheDocument());
  });

  it("shows plant count in subheader", async () => {
    renderView();
    await waitFor(() =>
      expect(screen.getByTestId("plants-count")).toHaveTextContent("3")
    );
  });
});

describe("PlantsView — search (AC #2)", () => {
  it("filters by common name", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    fireEvent.change(screen.getByTestId("plants-search"), { target: { value: "Rose" } });
    expect(screen.getAllByTestId("plant-row")).toHaveLength(1);
    expect(screen.getByText("Rose")).toBeInTheDocument();
  });

  it("filters by botanical name", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    fireEvent.change(screen.getByTestId("plants-search"), { target: { value: "Rhodo" } });
    expect(screen.getAllByTestId("plant-row")).toHaveLength(1);
    expect(screen.getByText("Rhododendron")).toBeInTheDocument();
  });

  it("filters by location", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    fireEvent.change(screen.getByTestId("plants-search"), { target: { value: "Einfahrt" } });
    expect(screen.getAllByTestId("plant-row")).toHaveLength(1);
    expect(screen.getByText("Gingko")).toBeInTheDocument();
  });

  it("shows empty state when no results", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    fireEvent.change(screen.getByTestId("plants-search"), { target: { value: "xyz" } });
    expect(screen.getByTestId("plants-empty")).toBeInTheDocument();
  });
});

describe("PlantsView — sorting (AC #3)", () => {
  it("default sort is name asc — Gingko first", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    const rows = screen.getAllByTestId("plant-row");
    const names = rows.map((r) => within(r).getAllByRole("cell")[1].textContent);
    expect(names[0]).toContain("Gingko");
  });

  it("clicking Name header switches to desc — Rose first", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    // First click: already asc → switches to desc
    fireEvent.click(screen.getByText(/^Name/));
    const rows = screen.getAllByTestId("plant-row");
    const names = rows.map((r) => within(r).getAllByRole("cell")[1].textContent);
    expect(names[0]).toContain("Rose");
  });

  it("second click on Name reverts to asc — Gingko first again", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    fireEvent.click(screen.getByText(/^Name/));
    fireEvent.click(screen.getByText(/^Name/));
    const rows = screen.getAllByTestId("plant-row");
    const names = rows.map((r) => within(r).getAllByRole("cell")[1].textContent);
    expect(names[0]).toContain("Gingko");
  });
});

describe("PlantsView — status badges (AC #4)", () => {
  it("shows overdue status dot for plant with overdue task", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    const dot = screen.getByTestId("status-dot-p3");
    // overdue = red-warn color
    expect(dot.style.background).toContain("var(--red-warn)");
  });

  it("shows due status dot for plant with due task", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    const dot = screen.getByTestId("status-dot-p2");
    expect(dot.style.background).toContain("var(--yellow-warn)");
  });

  it("shows ok status dot for plant with no tasks", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    const dot = screen.getByTestId("status-dot-p1");
    expect(dot.style.background).toContain("var(--green-light)");
  });
});

describe("PlantsView — view toggle (AC #5)", () => {
  it("switches to card view on ⊞ click", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    fireEvent.click(screen.getByTestId("view-card"));
    expect(screen.getByTestId("plants-cards")).toBeInTheDocument();
    expect(screen.queryByTestId("plants-table")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("plant-card")).toHaveLength(3);
  });

  it("switches back to table view on ☰ click", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    fireEvent.click(screen.getByTestId("view-card"));
    fireEvent.click(screen.getByTestId("view-table"));
    expect(screen.getByTestId("plants-table")).toBeInTheDocument();
    expect(screen.queryByTestId("plants-cards")).not.toBeInTheDocument();
  });
});

describe("PlantsView — FAB (AC #6)", () => {
  it("FAB button is visible", async () => {
    renderView();
    await waitFor(() => expect(screen.getByTestId("fab-add-plant")).toBeInTheDocument());
  });
});

describe("PlantsView — detail panel", () => {
  it("opens detail panel on row click", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    fireEvent.click(screen.getAllByTestId("plant-row")[0]);
    expect(screen.getByTestId("detail-panel")).toBeInTheDocument();
    expect(screen.getByTestId("detail-close")).toBeInTheDocument();
  });

  it("closes detail panel on ✕ click", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    fireEvent.click(screen.getAllByTestId("plant-row")[0]);
    fireEvent.click(screen.getByTestId("detail-close"));
    // Panel should shrink (width 0) — detail-close disappears
    expect(screen.queryByTestId("detail-close")).not.toBeInTheDocument();
  });

  it("shows plant care notes in detail panel", async () => {
    renderView();
    await waitFor(() => expect(screen.getAllByTestId("plant-row")).toHaveLength(3));
    // Click on Rose row (has care_notes) — find by name text
    fireEvent.click(screen.getByText("Rose").closest("[data-testid='plant-row']")!);
    expect(screen.getByText("Schnitt im Frühjahr")).toBeInTheDocument();
  });
});
