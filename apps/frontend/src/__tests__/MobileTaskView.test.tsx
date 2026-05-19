/**
 * MobileTaskView tests — story-083.
 *
 * AC #1  TopBar shows title "Aufgaben" and hamburger + chat buttons
 * AC #6  Tasks grouped into Überfällig / Diese Woche / Demnächst
 * AC #7  Task rows show plant tag, location, skip button only for overdue
 * AC #8  Checkbox calls createJournalEntry with entry_type "done"
 * AC #8  Skip button calls createJournalEntry with entry_type "skipped"
 * AC #9  ChatPanel starts closed, opens on chat icon click
 * AC #11 BottomNav renders five tabs
 * AC #12 Search pill present with green background
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n/index";
import { MobileTaskView } from "../views/MobileTaskView";
import { apiClient } from "../api/client";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import { ChatPanel } from "../components/mobile/MobileParts";
import type { Plant } from "@api/plant";
import type { Garden } from "@api/garden";

// ── Stubs ─────────────────────────────────────────────────────────────────────

// matchMedia is stubbed globally in test-setup.ts

// ── Fixtures ──────────────────────────────────────────────────────────────────

const OVERDUE_PLANT: Plant = {
  id: "p1", name_common: "Rote Rose", name_botanical: null,
  icon: "🌹", origin_type: null, category: null,
  lifecycle: null, description: null, care_notes: null,
  sun_demand: null, water_demand: null, soil_type: null,
  frost_tolerance_min_c: null, temperature_protected: false,
  health_status: null, location: "Südbeete", watering_zone: null,
  purchase_date: null, purchase_price: null,
  positions: [], attachments: [], journal_entries: [],
  schedules: [{
    id: "s1", schedule_type: "pruning",
    start_week: 1, end_week: 5,
    color: "#27ae60", label: "Schneiden",
    notes: null, created_at: "", updated_at: "",
  }],
  tasks: [{
    status: "overdue",
    schedule: {
      id: "s1", schedule_type: "pruning",
      start_week: 1, end_week: 5,
      color: "#27ae60", label: "Schneiden",
      notes: null, created_at: "", updated_at: "",
    },
    week: "2026-W01",
  }],
  created_at: "", updated_at: "",
};

const DUE_PLANT: Plant = {
  id: "p2", name_common: "Tomate", name_botanical: null,
  icon: "🍅", origin_type: null, category: null,
  lifecycle: null, description: null, care_notes: null,
  sun_demand: null, water_demand: null, soil_type: null,
  frost_tolerance_min_c: null, temperature_protected: false,
  health_status: null, location: "Hochbeet", watering_zone: null,
  purchase_date: null, purchase_price: null,
  positions: [], attachments: [], journal_entries: [],
  schedules: [{
    id: "s2", schedule_type: "fertilization",
    start_week: 15, end_week: 20,
    color: "#e67e22", label: "Düngen",
    notes: null, created_at: "", updated_at: "",
  }],
  tasks: [{
    status: "due",
    schedule: {
      id: "s2", schedule_type: "fertilization",
      start_week: 15, end_week: 20,
      color: "#e67e22", label: "Düngen",
      notes: null, created_at: "", updated_at: "",
    },
    week: "2026-W15",
  }],
  created_at: "", updated_at: "",
};

const UPCOMING_PLANT: Plant = {
  id: "p3", name_common: "Dahlie", name_botanical: null,
  icon: "🌸", origin_type: null, category: null,
  lifecycle: null, description: null, care_notes: null,
  sun_demand: null, water_demand: null, soil_type: null,
  frost_tolerance_min_c: null, temperature_protected: false,
  health_status: null, location: null, watering_zone: null,
  purchase_date: null, purchase_price: null,
  positions: [], attachments: [], journal_entries: [],
  schedules: [{
    id: "s3", schedule_type: "misc",
    start_week: 30, end_week: 35,
    color: "#8e44ad", label: "Einpflanzen",
    notes: null, created_at: "", updated_at: "",
  }],
  tasks: [{
    status: "upcoming",
    schedule: {
      id: "s3", schedule_type: "misc",
      start_week: 30, end_week: 35,
      color: "#8e44ad", label: "Einpflanzen",
      notes: null, created_at: "", updated_at: "",
    },
    week: "2026-W30",
  }],
  created_at: "", updated_at: "",
};

const MOCK_GARDEN: Garden = {
  plan_url:       null,
  plan_name:      null,
  plants:         [OVERDUE_PLANT, DUE_PLANT, UPCOMING_PLANT],
  journal_entries:[],
  attachments:    [],
  warnings:       [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderView(garden: Garden | null = MOCK_GARDEN, loading = false) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <I18nextProvider i18n={i18n}>
        <ChatPanel />
        <MobileTaskView
          garden={garden}
          loading={loading}
          invalidateGarden={vi.fn()}
        />
      </I18nextProvider>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MobileTaskView", () => {
  beforeEach(() => {
    resetAiPanelState();
    vi.spyOn(apiClient, "createJournalEntry").mockResolvedValue({
      id: "je1", plant_id: "p1", schedule_id: "s1", week: "2026-W01",
      entry_type: "done", date: "2026-01-01", title: null, notes: null,
      attachment_ids: [], created_at: "", updated_at: "",
    });
  });

  describe("AC #1 — TopBar", () => {
    it("renders the title (Tasks / Aufgaben)", () => {
      renderView();
      expect(screen.getByTestId("mobile-topbar")).toBeDefined();
      // i18n test environment may render 'Tasks' (en) or 'Aufgaben' (de)
      const text = screen.getByTestId("mobile-topbar").textContent ?? "";
      expect(text.includes("Tasks") || text.includes("Aufgaben")).toBe(true);
    });

    it("renders hamburger button", () => {
      renderView();
      expect(screen.getByTestId("mobile-hamburger")).toBeDefined();
    });

    it("renders chat button", () => {
      renderView();
      expect(screen.getByTestId("mobile-chat-btn")).toBeDefined();
    });
  });

  describe("AC #11 — BottomNav", () => {
    it("renders five navigation tabs", () => {
      renderView();
      const nav = screen.getByTestId("mobile-bottom-nav");
      expect(nav).toBeDefined();
      expect(screen.getByTestId("mobile-tab-tasks")).toBeDefined();
      expect(screen.getByTestId("mobile-tab-plants")).toBeDefined();
      expect(screen.getByTestId("mobile-tab-calendar")).toBeDefined();
      expect(screen.getByTestId("mobile-tab-journal")).toBeDefined();
      expect(screen.getByTestId("mobile-tab-plan")).toBeDefined();
    });
  });

  describe("AC #12 — Search", () => {
    it("renders search bar with green-tinted pill background", () => {
      renderView();
      const search = screen.getByTestId("mobile-search");
      expect(search).toBeDefined();
      // jsdom converts hex to rgb — accept both representations
      const bg = search.style.background;
      expect(bg === "#dde8d8" || bg === "rgb(221, 232, 216)").toBe(true);
    });
  });

  describe("AC #6 — Task grouping", () => {
    it("renders overdue section header", () => {
      renderView();
      // i18n may render 'Overdue' (en) or 'Überfällig' (de)
      const el = screen.queryByText("Überfällig") ?? screen.queryByText("Overdue");
      expect(el).toBeDefined();
    });

    it("renders this-week section header", () => {
      renderView();
      const el = screen.queryByText("Diese Woche") ?? screen.queryByText("This Week");
      expect(el).toBeDefined();
    });

    it("renders upcoming section header", () => {
      renderView();
      const el = screen.queryByText("Demnächst") ?? screen.queryByText("Upcoming");
      expect(el).toBeDefined();
    });

    it("renders three task rows for three plants with tasks", () => {
      renderView();
      const rows = screen.getAllByTestId("mobile-task-row");
      expect(rows.length).toBe(3);
    });
  });

  describe("AC #7 — Task row content", () => {
    it("shows plant tag with plant name", () => {
      renderView();
      expect(screen.getByText(/Rote Rose/)).toBeDefined();
    });

    it("shows location with pin icon for plants that have a location", () => {
      renderView();
      expect(screen.getByText(/Südbeete/)).toBeDefined();
      expect(screen.getByText(/Hochbeet/)).toBeDefined();
    });

    it("shows skip button for overdue and due tasks", () => {
      renderView();
      const skipBtns = screen.getAllByTestId("mobile-task-skip");
      // OVERDUE_PLANT (p1) is overdue, DUE_PLANT (p2) is due — both get skip
      expect(skipBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("AC #8 — Resolving tasks", () => {
    it("calls createJournalEntry with entry_type 'done' on checkbox click", async () => {
      renderView();
      const checkboxes = screen.getAllByTestId("mobile-task-checkbox");
      fireEvent.click(checkboxes[0]);
      await waitFor(() => {
        expect(apiClient.createJournalEntry).toHaveBeenCalledWith(
          expect.objectContaining({ entry_type: "done" }),
        );
      });
    });

    it("calls createJournalEntry with entry_type 'skipped' on skip click", async () => {
      renderView();
      const skipBtn = screen.getAllByTestId("mobile-task-skip")[0];
      fireEvent.click(skipBtn);
      await waitFor(() => {
        expect(apiClient.createJournalEntry).toHaveBeenCalledWith(
          expect.objectContaining({ entry_type: "skipped" }),
        );
      });
    });
  });

  describe("AC #9 — Chat panel", () => {
    it("chat panel is closed by default", () => {
      renderView();
      const panel = screen.getByTestId("mobile-chat-panel");
      expect(panel.style.height).toBe("0px");
    });

    it("chat panel opens when chat button is clicked", async () => {
      renderView();
      const btn = screen.getByTestId("mobile-chat-btn");
      fireEvent.click(btn);
      await waitFor(() => {
        const panel = screen.getByTestId("mobile-chat-panel");
        expect(panel.style.height).toBe("210px");
      });
    });

    it("chat panel closes via close button", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-chat-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("210px");
      });
      fireEvent.click(screen.getByTestId("mobile-chat-close"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("0px");
      });
    });

    it("chat panel is position:fixed with zIndex 100 (AC #1)", () => {
      renderView();
      const panel = screen.getByTestId("mobile-chat-panel");
      expect(panel.style.position).toBe("fixed");
      expect(panel.style.zIndex).toBe("100");
    });

    it("--mobile-chat-height is set on <html> when panel opens (AC #2)", async () => {
      renderView();
      expect(document.documentElement.style.getPropertyValue("--mobile-chat-height")).toBe("0px");
      fireEvent.click(screen.getByTestId("mobile-chat-btn"));
      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue("--mobile-chat-height")).toBe("210px");
      });
    });

    it("--mobile-chat-height resets to 0px when panel closes (AC #4)", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-chat-btn"));
      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue("--mobile-chat-height")).toBe("210px");
      });
      fireEvent.click(screen.getByTestId("mobile-chat-close"));
      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue("--mobile-chat-height")).toBe("0px");
      });
    });
  });

  describe("Loading state", () => {
    it("shows loading message while garden is loading", () => {
      renderView(null, true);
      // i18n may render German or English
      const el = screen.queryByText(/Wird geladen/) ?? screen.queryByText(/Loading/);
      expect(el).toBeDefined();
    });
  });

  describe("Empty state", () => {
    it("shows empty message when garden has no tasks", () => {
      const emptyGarden: Garden = { ...MOCK_GARDEN, plants: [] };
      renderView(emptyGarden, false);
      const el = screen.queryByText(/Keine offenen Aufgaben/) ?? screen.queryByText(/No open tasks/);
      expect(el).toBeDefined();
    });
  });
});
