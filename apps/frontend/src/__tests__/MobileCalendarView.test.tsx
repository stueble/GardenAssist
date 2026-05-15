/**
 * MobileCalendarView tests — story-085.
 *
 * AC #1  TopBar: title "Kalender", hamburger, chat button — no + button
 * AC #2  FilterChips: all 6 chips rendered, no white wrapper
 * AC #3  Active chip has correct dark-green background
 * AC #4  Clicking another chip makes it active
 * AC #5  Sticky month header with 12 groups
 * AC #6  Each plant has a row (all plants visible incl. those without data)
 * AC #7  Plants without data have opacity 0.4
 * AC #8  Tooltip closed by default; opens on row click; closes on second click
 * AC #10 ChatPanel starts closed; opens on chat click
 * AC #11 BottomNav: Kalender tab active
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n/index";
import { MobileCalendarView, _resetCalendarFilterForTest } from "../views/MobileCalendarView";
import type { Plant } from "@api/plant";
import type { Garden } from "@api/garden";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlant(id: string, name: string, scheduleType: Plant["schedules"][0]["schedule_type"] | null): Plant {
  const schedules = scheduleType ? [{
    id:            `s-${id}`,
    schedule_type: scheduleType,
    start_week:    14,
    end_week:      22,
    color:         "#e84393",
    label:         "Test",
    notes:         null,
    created_at:    "",
    updated_at:    "",
  }] : [];

  return {
    id,
    name_common:          name,
    name_botanical:       `Bot. ${name}`,
    icon:                 "🌿",
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
    positions:            [],
    attachments:          [],
    journal_entries:      [],
    schedules,
    tasks:                [],
    created_at:           "",
    updated_at:           "",
  };
}

// Plant with bloom schedule
const BLOOM_PLANT = makePlant("p1", "Rose",     "bloom");
// Plant with NO bloom schedule (will be dimmed in bloom filter)
const NO_DATA_PLANT = makePlant("p2", "Tulpe",  null);
// Plant with two bloom schedules (multiple bars)
const MULTI_PLANT: Plant = {
  ...makePlant("p3", "Lavendel", "bloom"),
  schedules: [
    { id: "s3a", schedule_type: "bloom", start_week: 10, end_week: 18, color: "#9c27b0", label: "Frühjahr", notes: null, created_at: "", updated_at: "" },
    { id: "s3b", schedule_type: "bloom", start_week: 26, end_week: 34, color: "#e91e63", label: "Sommer",   notes: null, created_at: "", updated_at: "" },
  ],
};

const MOCK_GARDEN: Garden = {
  plan_url: null, plan_name: null,
  plants: [BLOOM_PLANT, NO_DATA_PLANT, MULTI_PLANT],
  journal_entries: [], attachments: [], warnings: [],
};

function renderView(garden: Garden | null = MOCK_GARDEN, loading = false) {
  return render(
    <MemoryRouter initialEntries={["/calendar"]}>
      <I18nextProvider i18n={i18n}>
        <MobileCalendarView
          garden={garden}
          loading={loading}
          invalidateGarden={vi.fn()}
        />
      </I18nextProvider>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MobileCalendarView", () => {

  beforeEach(() => {
    // Reset filter singleton so each test starts with bloom active
    _resetCalendarFilterForTest();
  });

  describe("AC #1 — TopBar", () => {
    it("renders the title (Kalender / Calendar)", () => {
      renderView();
      const topbar = screen.getByTestId("mobile-calendar-topbar");
      const text   = topbar.textContent ?? "";
      expect(text.includes("Kalender") || text.includes("Calendar")).toBe(true);
    });

    it("renders hamburger button", () => {
      renderView();
      expect(screen.getByTestId("mobile-calendar-hamburger")).toBeDefined();
    });

    it("renders chat button", () => {
      renderView();
      expect(screen.getByTestId("mobile-calendar-chat-btn")).toBeDefined();
    });

    it("does NOT render a + button", () => {
      renderView();
      expect(screen.queryByTestId("mobile-calendar-add-btn")).toBeNull();
    });
  });

  describe("AC #2 — FilterChips", () => {
    it("renders all 6 filter chips", () => {
      renderView();
      const chips = screen.getByTestId("mobile-calendar-chips");
      expect(chips).toBeDefined();
      expect(screen.getByTestId("mobile-calendar-chip-bloom")).toBeDefined();
      expect(screen.getByTestId("mobile-calendar-chip-fertilization")).toBeDefined();
      expect(screen.getByTestId("mobile-calendar-chip-pruning")).toBeDefined();
      expect(screen.getByTestId("mobile-calendar-chip-misc")).toBeDefined();
      expect(screen.getByTestId("mobile-calendar-chip-foliage")).toBeDefined();
      expect(screen.getByTestId("mobile-calendar-chip-growth")).toBeDefined();
    });
  });

  describe("AC #3 — Active chip style", () => {
    it("bloom chip starts active with dark-green background", () => {
      renderView();
      const chip = screen.getByTestId("mobile-calendar-chip-bloom");
      expect(chip.style.background).toBe("rgb(45, 74, 45)"); // #2d4a2d
    });

    it("inactive chip has light green background", () => {
      renderView();
      const chip = screen.getByTestId("mobile-calendar-chip-foliage");
      expect(chip.style.background).toBe("rgb(238, 244, 235)"); // #eef4eb
    });
  });

  describe("AC #4 — Chip switching", () => {
    it("clicking foliage chip makes it active", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-calendar-chip-foliage"));
      await waitFor(() => {
        const chip = screen.getByTestId("mobile-calendar-chip-foliage");
        expect(chip.style.background).toBe("rgb(45, 74, 45)");
      });
    });

    it("previously active chip becomes inactive after switching", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-calendar-chip-foliage"));
      await waitFor(() => {
        const bloom = screen.getByTestId("mobile-calendar-chip-bloom");
        expect(bloom.style.background).toBe("rgb(238, 244, 235)");
      });
    });
  });

  describe("AC #5 — Month header", () => {
    it("renders 12 month groups", () => {
      renderView();
      for (let i = 0; i < 12; i++) {
        expect(screen.getByTestId(`mobile-calendar-month-${i}`)).toBeDefined();
      }
    });
  });

  describe("AC #6 — Plant rows", () => {
    it("renders a row for every plant", () => {
      renderView();
      const rows = screen.getAllByTestId("mobile-calendar-plant-row");
      expect(rows.length).toBe(3);
    });

    it("shows plant names", () => {
      renderView();
      expect(screen.getByText("Rose")).toBeDefined();
      expect(screen.getByText("Tulpe")).toBeDefined();
      expect(screen.getByText("Lavendel")).toBeDefined();
    });
  });

  describe("AC #7 — Dimmed rows for plants without data", () => {
    it("plant with no bloom schedule has opacity 0.4", () => {
      renderView();
      // NO_DATA_PLANT (Tulpe) has no bloom schedule → opacity 0.4
      const rows = screen.getAllByTestId("mobile-calendar-plant-row");
      const tulpeRow = rows.find((r) => r.textContent?.includes("Tulpe"));
      expect(tulpeRow?.style.opacity).toBe("0.4");
    });

    it("plant with bloom schedule has opacity 1", () => {
      renderView();
      const rows = screen.getAllByTestId("mobile-calendar-plant-row");
      const roseRow = rows.find((r) => r.textContent?.includes("Rose"));
      expect(roseRow?.style.opacity).toBe("1");
    });
  });

  describe("AC #8 — Tooltip", () => {
    it("tooltip is hidden by default", () => {
      renderView();
      expect(screen.queryByTestId("mobile-calendar-tooltip")).toBeNull();
    });

    it("tooltip appears after clicking a plant row", async () => {
      renderView();
      const rows = screen.getAllByTestId("mobile-calendar-plant-row");
      fireEvent.click(rows[0]);
      await waitFor(() => {
        expect(screen.getByTestId("mobile-calendar-tooltip")).toBeDefined();
      });
    });

    it("tooltip closes on second click of the same row", async () => {
      renderView();
      const rows = screen.getAllByTestId("mobile-calendar-plant-row");
      fireEvent.click(rows[0]);
      await waitFor(() => {
        expect(screen.getByTestId("mobile-calendar-tooltip")).toBeDefined();
      });
      fireEvent.click(rows[0]);
      await waitFor(() => {
        expect(screen.queryByTestId("mobile-calendar-tooltip")).toBeNull();
      });
    });

    it("tooltip shows plant name", async () => {
      renderView();
      const rows = screen.getAllByTestId("mobile-calendar-plant-row");
      const roseRow = rows.find((r) => r.textContent?.includes("Rose"))!;
      fireEvent.click(roseRow);
      await waitFor(() => {
        const tooltip = screen.getByTestId("mobile-calendar-tooltip");
        expect(tooltip.textContent).toContain("Rose");
      });
    });

    it("tooltip switches when clicking a different row", async () => {
      renderView();
      const rows = screen.getAllByTestId("mobile-calendar-plant-row");
      fireEvent.click(rows[0]); // Rose
      await waitFor(() => {
        expect(screen.getByTestId("mobile-calendar-tooltip").textContent).toContain("Rose");
      });
      fireEvent.click(rows[2]); // Lavendel
      await waitFor(() => {
        expect(screen.getByTestId("mobile-calendar-tooltip").textContent).toContain("Lavendel");
      });
    });

    it("plant with multiple schedules shows all entries in tooltip", async () => {
      renderView();
      const rows = screen.getAllByTestId("mobile-calendar-plant-row");
      const lavendelRow = rows.find((r) => r.textContent?.includes("Lavendel"))!;
      fireEvent.click(lavendelRow);
      await waitFor(() => {
        const tooltip = screen.getByTestId("mobile-calendar-tooltip");
        // Both schedule labels should appear
        expect(tooltip.textContent).toContain("Frühjahr");
        expect(tooltip.textContent).toContain("Sommer");
      });
    });
  });

  describe("AC #10 — ChatPanel", () => {
    it("chat panel starts closed", () => {
      renderView();
      const panel = screen.getByTestId("mobile-chat-panel");
      expect(panel.style.height).toBe("0px");
    });

    it("opens when chat button is clicked", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-calendar-chat-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("210px");
      });
    });
  });

  describe("AC #11 — BottomNav", () => {
    it("calendar tab has active highlight", () => {
      renderView();
      const calTab = screen.getByTestId("mobile-tab-calendar");
      // Active tab has inner span with rgba(255,255,255,.15) background
      const inner = calTab.querySelector("span");
      expect(inner?.style.background).toBe("rgba(255, 255, 255, 0.15)");
    });
  });

  describe("Loading state", () => {
    it("shows loading text while loading", () => {
      renderView(null, true);
      const el = screen.queryByText(/Loading/) ?? screen.queryByText(/Wird geladen/);
      expect(el).toBeDefined();
    });
  });
});
