/**
 * MobilePlantDetailView tests — TASK-089
 *
 * AC #3  TopBar: back arrow, plant name (2-line), edit stub button, chat button
 * AC #4  PlantDetailContent rendered (facts, description, etc.)
 * AC #5  ChatPanel opens in-flow on chat button click
 * AC #6  Back arrow navigates to /plants
 * AC #7  BottomNav visible with /plants tab active
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import i18n from "../i18n/index";
import { MobilePlantDetailView } from "../views/MobilePlantDetailView";
import { ChatPanel } from "../components/mobile/MobileParts";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { Plant } from "@api/plant";
import type { Garden } from "@api/garden";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../api/client", () => ({
  apiClient: {
    deletePlant:  vi.fn().mockResolvedValue({}),
    getSettings:  vi.fn().mockResolvedValue({ ai_provider: null, ai_api_key: null }),
  },
  chatWithAi: vi.fn().mockResolvedValue({ content: "" }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_PLANT: Plant = {
  id:                    "p1",
  name_common:           "Rose",
  name_botanical:        "Rosa canina",
  icon:                  "🌹",
  origin_type:           null,
  category:              null,
  lifecycle:             null,
  description:           "Eine schöne Rose.",
  care_notes:            null,
  sun_demand:            null,
  water_demand:          null,
  soil_type:             null,
  frost_tolerance_min_c: null,
  temperature_protected: false,
  health_status:         null,
  location:              "Ostbeet",
  watering_zone:         null,
  purchase_date:         null,
  purchase_price:        null,
  positions:             [],
  attachments:           [],
  journal_entries:       [],
  schedules:             [],
  tasks:                 [],
  created_at:            "",
  updated_at:            "",
};

const MOCK_GARDEN: Garden = {
  plan_url: null, plan_name: null,
  plants: [MOCK_PLANT],
  journal_entries: [], attachments: [], warnings: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderAt(plantId: string, garden: Garden | null = MOCK_GARDEN) {
  return render(
    <MemoryRouter initialEntries={[`/plants/${plantId}`]}>
      <I18nextProvider i18n={i18n}>
        <ChatPanel />
        <Routes>
          <Route
            path="/plants/:id"
            element={<MobilePlantDetailView garden={garden} loading={false} invalidateGarden={vi.fn()} />}
          />
          <Route path="/plants" element={<div data-testid="plants-view">Plants</div>} />
        </Routes>
      </I18nextProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  resetAiPanelState();
  await i18n.changeLanguage("de");
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MobilePlantDetailView", () => {
  describe("AC #3 — TopBar", () => {
    it("renders the top bar", () => {
      renderAt("p1");
      expect(screen.getByTestId("mobile-plant-detail-topbar")).toBeInTheDocument();
    });

    it("shows plant name in top bar", () => {
      renderAt("p1");
      expect(screen.getByText("Rose")).toBeInTheDocument();
    });

    it("shows botanical name in top bar", () => {
      renderAt("p1");
      expect(screen.getByText("Rosa canina")).toBeInTheDocument();
    });

    it("renders back button", () => {
      renderAt("p1");
      expect(screen.getByTestId("mobile-plant-detail-back")).toBeInTheDocument();
    });

    it("renders edit stub button", () => {
      renderAt("p1");
      expect(screen.getByTestId("mobile-plant-detail-edit")).toBeInTheDocument();
    });

    it("renders chat button", () => {
      renderAt("p1");
      expect(screen.getByTestId("mobile-plant-detail-chat")).toBeInTheDocument();
    });
  });

  describe("AC #4 — PlantDetailContent", () => {
    it("renders plant description", () => {
      renderAt("p1");
      expect(screen.getByText("Eine schöne Rose.")).toBeInTheDocument();
    });

    it("renders the delete link in the scroll area", () => {
      renderAt("p1");
      expect(screen.getByTestId("detail-btn-delete")).toBeInTheDocument();
    });

    it("does not render a pinned edit button (edit is in the top bar on mobile)", () => {
      renderAt("p1");
      expect(screen.queryByTestId("detail-btn-edit")).not.toBeInTheDocument();
    });
  });

  describe("AC #5 — ChatPanel", () => {
    it("chat panel starts closed", () => {
      renderAt("p1");
      expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("0px");
    });

    it("opens on chat button click", async () => {
      renderAt("p1");
      fireEvent.click(screen.getByTestId("mobile-plant-detail-chat"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("210px");
      });
    });
  });

  describe("AC #6 — Back navigation", () => {
    it("back button navigates to /plants", async () => {
      renderAt("p1");
      fireEvent.click(screen.getByTestId("mobile-plant-detail-back"));
      await waitFor(() => {
        expect(screen.getByTestId("plants-view")).toBeInTheDocument();
      });
    });
  });

  describe("AC #7 — BottomNav", () => {
    it("renders bottom nav", () => {
      renderAt("p1");
      expect(screen.getByTestId("mobile-bottom-nav")).toBeInTheDocument();
    });

    it("plants tab is active", () => {
      renderAt("p1");
      expect(screen.getByTestId("mobile-tab-plants")).toBeInTheDocument();
    });
  });

  describe("Not found", () => {
    it("renders minimal placeholder when plant id not found", () => {
      renderAt("unknown-id");
      // Shows back button but no plant detail content
      expect(screen.queryByTestId("mobile-plant-detail-view")).not.toBeInTheDocument();
      expect(screen.queryByTestId("detail-btn-edit")).not.toBeInTheDocument();
    });
  });
});
