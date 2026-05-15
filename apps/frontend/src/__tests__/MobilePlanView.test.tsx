/**
 * MobilePlanView tests — story-087.
 *
 * AC #1  TopBar: title "Gartenplan", hamburger, + button, chat button
 * AC #2  Plan area fills available space (rendered)
 * AC #5  Legend rendered by GardenPlanWidget (legend=true)
 * AC #8  ChatPanel starts closed; opens on chat click
 * AC #9  BottomNav: Plan tab active
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n/index";
import { MobilePlanView } from "../views/MobilePlanView";
import type { Garden } from "@api/garden";
import type { Plant } from "@api/plant";

// ── Stubs ─────────────────────────────────────────────────────────────────────

// ResizeObserver stub (GardenPlanWidget uses it)
if (!("ResizeObserver" in window)) {
  (window as unknown as Record<string, unknown>).ResizeObserver = class {
    observe()    {}
    unobserve()  {}
    disconnect() {}
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlant(id: string, status: "overdue" | "due" | "ok"): Plant {
  const schedule = {
    id: `s-${id}`, schedule_type: "pruning" as const,
    start_week: 1, end_week: 5,
    color: "#27ae60", label: "Schneiden",
    notes: null, created_at: "", updated_at: "",
  };
  return {
    id,
    name_common:          `Plant ${id}`,
    name_botanical:       null,
    icon:                 "🌹",
    origin_type:          null,
    category:             null,
    lifecycle:            null,
    description:          null,
    care_notes:           null,
    sun_demand:           null,
    water_demand:         null,
    soil_type:            null,
    frost_tolerance_min_c: null,
    temperature_protected: false,
    health_status:        null,
    location:             null,
    watering_zone:        null,
    purchase_date:        null,
    purchase_price:       null,
    positions:            [{ x_percent: 25, y_percent: 40 }],
    attachments:          [],
    journal_entries:      [],
    schedules:            status !== "ok" ? [schedule] : [],
    tasks:                status !== "ok"
      ? [{ status, schedule, week: "2026-W01" }]
      : [],
    created_at: "", updated_at: "",
  };
}

const MOCK_GARDEN: Garden = {
  plan_url:        "/static/plan.jpg",
  plan_name:       "Mein Garten",
  plants:          [
    makePlant("p1", "overdue"),
    makePlant("p2", "due"),
    makePlant("p3", "ok"),
  ],
  journal_entries: [],
  attachments:     [],
  warnings:        [],
};

function renderView(garden: Garden | null = MOCK_GARDEN) {
  return render(
    <MemoryRouter initialEntries={["/plan"]}>
      <I18nextProvider i18n={i18n}>
        <MobilePlanView
          garden={garden}
          loading={false}
          invalidateGarden={vi.fn()}
        />
      </I18nextProvider>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MobilePlanView", () => {

  describe("AC #1 — TopBar", () => {
    it("renders the title (Gartenplan / Garden Plan)", () => {
      renderView();
      const bar  = screen.getByTestId("mobile-plan-topbar");
      const text = bar.textContent ?? "";
      expect(text.includes("Gartenplan") || text.includes("Garden Plan")).toBe(true);
    });

    it("renders hamburger button", () => {
      renderView();
      expect(screen.getByTestId("mobile-plan-hamburger")).toBeDefined();
    });

    it("renders + button", () => {
      renderView();
      expect(screen.getByTestId("mobile-plan-add-btn")).toBeDefined();
    });

    it("renders chat button", () => {
      renderView();
      expect(screen.getByTestId("mobile-plan-chat-btn")).toBeDefined();
    });
  });

  describe("AC #2 — Plan area", () => {
    it("renders the plan area", () => {
      renderView();
      expect(screen.getByTestId("mobile-plan-area")).toBeDefined();
    });

    it("renders GardenPlanWidget inside plan area", () => {
      renderView();
      // GardenPlanWidget renders a data-testid="garden-plan-widget" or the plan area contains it
      const area = screen.getByTestId("mobile-plan-area");
      expect(area).toBeDefined();
      // The widget renders zoom buttons
      expect(screen.getByTestId("zoom-btn-fit-h")).toBeDefined();
      expect(screen.getByTestId("zoom-btn-fit-w")).toBeDefined();
    });
  });

  describe("AC #5 — Legend", () => {
    it("renders the plan legend", () => {
      renderView();
      expect(screen.getByTestId("plan-legend")).toBeDefined();
    });
  });

  describe("AC #6 — Zoom buttons", () => {
    it("fit-height zoom button is rendered", () => {
      renderView();
      expect(screen.getByTestId("zoom-btn-fit-h")).toBeDefined();
    });

    it("fit-width zoom button is rendered", () => {
      renderView();
      expect(screen.getByTestId("zoom-btn-fit-w")).toBeDefined();
    });
  });

  describe("AC #8 — ChatPanel", () => {
    it("chat panel starts closed", () => {
      renderView();
      expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("0px");
    });

    it("opens when chat button is clicked", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-plan-chat-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("210px");
      });
    });
  });

  describe("AC #9 — BottomNav", () => {
    it("plan tab is active", () => {
      renderView();
      const tab   = screen.getByTestId("mobile-tab-plan");
      const inner = tab.querySelector("span");
      expect(inner?.style.background).toBe("rgba(255, 255, 255, 0.15)");
    });
  });

  describe("No garden plan", () => {
    it("renders placeholder when plan_url is null", () => {
      const noplan: Garden = { ...MOCK_GARDEN, plan_url: null };
      renderView(noplan);
      expect(screen.getByTestId("mobile-plan-area")).toBeDefined();
    });
  });
});
