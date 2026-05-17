/**
 * MobilePlanView tests — story-087 / story-090 / story-094.
 *
 * story-087 ACs:
 * AC #1  TopBar: title "Gartenplan", hamburger, + button, chat button
 * AC #2  Plan area fills available space (rendered)
 * AC #5  Legend rendered by GardenPlanWidget (legend=true)
 * AC #8  ChatPanel starts closed; opens on chat click
 * AC #9  BottomNav: Plan tab active
 *
 * story-094 ACs (replaces story-090 chip):
 * AC #1  First tap on pin opens peek sheet with plant name + botanical name
 * AC #2  Swipe up on sheet handle → expanded mode
 * AC #3  PlantDetailContent rendered inside expanded sheet
 * AC #4  Tapping map backdrop dismisses sheet
 * AC #5  Tapping different pin opens sheet for new plant
 * AC #6  Edit button navigates to /plants/:id/edit
 * AC #7  Swipe down on expanded → peek; swipe down on peek → dismiss
 * AC #8  No PinChip rendered; no navigation to /plants/:id on pin tap
 * AC #9  No regression: desktop unaffected (onPinClick wired to widget)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Routes, Route } from "react-router-dom";
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

// Mock apiClient so PlantDetailContent's delete flow doesn't hit the network
vi.mock("../api/client", () => ({
  apiClient: {
    deletePlant: vi.fn().mockResolvedValue({}),
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlant(id: string, status: "overdue" | "due" | "ok", opts: Partial<Plant> = {}): Plant {
  const schedule = {
    id: `s-${id}`, schedule_type: "pruning" as const,
    start_week: 1, end_week: 5,
    color: "#27ae60", label: "Schneiden",
    notes: null, created_at: "", updated_at: "",
  };
  return {
    id,
    name_common:           `Plant ${id}`,
    name_botanical:        `Botanica ${id}`,
    icon:                  "🌹",
    origin_type:           null,
    category:              null,
    lifecycle:             null,
    description:           "Eine Testbeschreibung.",
    care_notes:            null,
    sun_demand:            null,
    water_demand:          null,
    soil_type:             null,
    frost_tolerance_min_c: null,
    temperature_protected: false,
    health_status:         null,
    location:              null,
    watering_zone:         null,
    purchase_date:         null,
    purchase_price:        null,
    positions:             [{ x_percent: 25, y_percent: 40 }],
    attachments:           [],
    journal_entries:       [],
    schedules:             status !== "ok" ? [schedule] : [],
    tasks:                 status !== "ok"
      ? [{ status, schedule, week: "2026-W01" }]
      : [],
    created_at: "", updated_at: "",
    ...opts,
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
  const invalidateGarden = vi.fn();
  const result = render(
    <MemoryRouter initialEntries={["/plan"]}>
      <I18nextProvider i18n={i18n}>
        <Routes>
          <Route
            path="/plan"
            element={
              <MobilePlanView
                garden={garden}
                loading={false}
                invalidateGarden={invalidateGarden}
              />
            }
          />
          <Route path="/plants/:id/edit" element={<div data-testid="plant-edit-view" />} />
          <Route path="/plants/:id"      element={<div data-testid="plant-detail-view" />} />
        </Routes>
      </I18nextProvider>
    </MemoryRouter>,
  );
  return { ...result, invalidateGarden };
}

/** Fire a pointer swipe on an element: pointerdown at startY, pointerup at endY */
function swipe(el: HTMLElement, startY: number, endY: number) {
  fireEvent.pointerDown(el, { clientY: startY, pointerId: 1 });
  fireEvent.pointerUp(el,   { clientY: endY,   pointerId: 1 });
}

beforeEach(async () => {
  await i18n.changeLanguage("de");
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MobilePlanView", () => {

  // ── story-087: Base layout ──────────────────────────────────────────────────

  describe("AC #1 — TopBar", () => {
    it("renders the title", () => {
      renderView();
      const bar  = screen.getByTestId("mobile-plan-topbar");
      const text = bar.textContent ?? "";
      expect(text.includes("Gartenplan") || text.includes("Garden Plan")).toBe(true);
    });

    it("renders hamburger button", () => {
      renderView();
      expect(screen.getByTestId("mobile-plan-hamburger")).toBeInTheDocument();
    });

    it("renders + button", () => {
      renderView();
      expect(screen.getByTestId("mobile-plan-add-btn")).toBeInTheDocument();
    });

    it("renders chat button", () => {
      renderView();
      expect(screen.getByTestId("mobile-plan-chat-btn")).toBeInTheDocument();
    });
  });

  describe("AC #2 — Plan area", () => {
    it("renders the plan area", () => {
      renderView();
      expect(screen.getByTestId("mobile-plan-area")).toBeInTheDocument();
    });

    it("renders zoom buttons inside plan area", () => {
      renderView();
      expect(screen.getByTestId("zoom-btn-fit-h")).toBeInTheDocument();
      expect(screen.getByTestId("zoom-btn-fit-w")).toBeInTheDocument();
    });
  });

  describe("AC #5 — Legend", () => {
    it("renders the plan legend", () => {
      renderView();
      expect(screen.getByTestId("plan-legend")).toBeInTheDocument();
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
    it("renders plan area even without plan_url", () => {
      const noplan: Garden = { ...MOCK_GARDEN, plan_url: null };
      renderView(noplan);
      expect(screen.getByTestId("mobile-plan-area")).toBeInTheDocument();
    });
  });

  // ── story-094: Snap-sheet ───────────────────────────────────────────────────

  describe("story-094 AC #1 — first tap opens peek sheet", () => {
    it("no sheet visible initially", () => {
      renderView();
      expect(screen.queryByTestId("plan-snap-sheet")).toBeNull();
    });

    it("sheet appears in peek mode after pin tap", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      const sheet = screen.getByTestId("plan-snap-sheet");
      expect(sheet).toBeInTheDocument();
      expect(sheet.dataset.mode).toBe("peek");
    });

    it("sheet header shows plant name", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      expect(screen.getByTestId("sheet-header").textContent).toContain("Plant p1");
    });

    it("sheet header shows botanical name", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      expect(screen.getByTestId("sheet-header").textContent).toContain("Botanica p1");
    });

    it("sheet header shows plant emoji", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      expect(screen.getByTestId("sheet-header").textContent).toContain("🌹");
    });
  });

  describe("story-094 AC #2 — swipe up expands sheet", () => {
    it("swipe up on drag handle switches to expanded mode", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      const handle = screen.getByTestId("sheet-drag-handle");
      swipe(handle, 300, 200); // upward swipe (startY > endY, delta > 50)
      expect(screen.getByTestId("plan-snap-sheet").dataset.mode).toBe("expanded");
    });

    it("small swipe (< threshold) does not expand", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      const handle = screen.getByTestId("sheet-drag-handle");
      swipe(handle, 300, 280); // only 20px — below threshold
      expect(screen.getByTestId("plan-snap-sheet").dataset.mode).toBe("peek");
    });
  });

  describe("story-094 AC #3 — PlantDetailContent in expanded sheet", () => {
    it("sheet-content is rendered", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      expect(screen.getByTestId("sheet-content")).toBeInTheDocument();
    });
  });

  describe("story-094 AC #4 — tapping backdrop dismisses sheet", () => {
    it("tapping sheet-backdrop dismisses the sheet", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      expect(screen.getByTestId("plan-snap-sheet")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("sheet-backdrop"));
      expect(screen.queryByTestId("plan-snap-sheet")).toBeNull();
    });

    it("tapping mobile-plan-area dismisses the sheet", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      expect(screen.getByTestId("plan-snap-sheet")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("mobile-plan-area"));
      expect(screen.queryByTestId("plan-snap-sheet")).toBeNull();
    });

    it("close button dismisses the sheet", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      fireEvent.click(screen.getByTestId("sheet-close-btn"));
      expect(screen.queryByTestId("plan-snap-sheet")).toBeNull();
    });
  });

  describe("story-094 AC #5 — tapping different pin switches sheet", () => {
    it("tapping a different pin shows sheet for the new plant", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0")); // p1
      expect(screen.getByTestId("sheet-header").textContent).toContain("Plant p1");

      fireEvent.click(screen.getByTestId("plan-pin-1")); // p2
      expect(screen.getByTestId("sheet-header").textContent).toContain("Plant p2");
    });

    it("new sheet always opens in peek mode", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      // Expand first
      swipe(screen.getByTestId("sheet-drag-handle"), 300, 200);
      expect(screen.getByTestId("plan-snap-sheet").dataset.mode).toBe("expanded");
      // Tap different pin
      fireEvent.click(screen.getByTestId("plan-pin-1"));
      expect(screen.getByTestId("plan-snap-sheet").dataset.mode).toBe("peek");
    });
  });

  describe("story-094 AC #6 — edit button navigates to /plants/:id/edit", () => {
    it("edit button navigates to the plant edit view", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      fireEvent.click(screen.getByTestId("sheet-edit-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("plant-edit-view")).toBeInTheDocument();
      });
    });
  });

  describe("story-094 AC #7 — swipe down collapses/dismisses sheet", () => {
    it("swipe down on expanded sheet goes back to peek", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      const handle = screen.getByTestId("sheet-drag-handle");
      // First swipe up to expand
      swipe(handle, 300, 200);
      expect(screen.getByTestId("plan-snap-sheet").dataset.mode).toBe("expanded");
      // Then swipe down to collapse back to peek
      swipe(handle, 200, 300);
      expect(screen.getByTestId("plan-snap-sheet").dataset.mode).toBe("peek");
    });

    it("swipe down on peek sheet dismisses it", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      const handle = screen.getByTestId("sheet-drag-handle");
      swipe(handle, 200, 300); // downward from peek
      expect(screen.queryByTestId("plan-snap-sheet")).toBeNull();
    });
  });

  describe("story-094 AC #8 — no PinChip, no navigation to /plants/:id on pin tap", () => {
    it("pin-chip testid is not rendered", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      expect(screen.queryByTestId("pin-chip")).toBeNull();
    });

    it("pin tap does not navigate to /plants/:id", () => {
      renderView();
      fireEvent.click(screen.getByTestId("plan-pin-0"));
      // plant-detail-view (/plants/:id) should NOT appear
      expect(screen.queryByTestId("plant-detail-view")).toBeNull();
      // sheet should appear instead
      expect(screen.getByTestId("plan-snap-sheet")).toBeInTheDocument();
    });
  });

  describe("story-094 AC #9 — no desktop regression", () => {
    it("GardenPlanWidget receives onPinClick (all pins rendered)", () => {
      renderView();
      expect(screen.getByTestId("plan-pin-0")).toBeInTheDocument();
      expect(screen.getByTestId("plan-pin-1")).toBeInTheDocument();
      expect(screen.getByTestId("plan-pin-2")).toBeInTheDocument();
    });
  });
});
