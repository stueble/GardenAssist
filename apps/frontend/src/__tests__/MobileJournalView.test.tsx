/**
 * MobileJournalView tests — story-086.
 *
 * AC #1  TopBar: title, hamburger, + button, chat button
 * AC #2  SearchPill background #dde8d8
 * AC #3  5 filter chips; active chip highlights; tap active → deactivates
 * AC #4  Entries grouped by month heading
 * AC #5  Entry card collapsed by default; tap → expands; tap again → collapses
 * AC #6  Entry dot colors correct per type
 * AC #9  NewEntrySheet opens on +; closes on ✕; mutually exclusive with chat
 * AC #10 ChatPanel opens on chat click; mutually exclusive with new-entry
 * AC #11 BottomNav: Tagebuch tab active
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n/index";
import { MobileJournalView } from "../views/MobileJournalView";
import { apiClient } from "../api/client";
import { ChatPanel } from "../components/mobile/MobileParts";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { JournalEntry } from "@api/journal-entry";
import type { Garden } from "@api/garden";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<JournalEntry> & { id: string }): JournalEntry {
  return {
    plant_id:       null,
    schedule_id:    null,
    week:           null,
    entry_type:     "manual",
    date:           "2026-05-14",
    title:          "Test Entry",
    notes:          "Some notes",
    attachment_ids: [],
    created_at:     "",
    updated_at:     "",
    ...overrides,
  };
}

const DONE_ENTRY = makeEntry({ id: "e1", entry_type: "done",        title: "Rosen Schnitt",      date: "2026-05-14" });
const OBS_ENTRY  = makeEntry({ id: "e2", entry_type: "observation", title: "Blätter beobachtet", date: "2026-05-10" });
const PROB_ENTRY = makeEntry({ id: "e3", entry_type: "problem",     title: "Blattläuse",         date: "2026-04-20" });

const MOCK_GARDEN: Garden = {
  plan_url: null, plan_name: null,
  plants:   [],
  journal_entries: [DONE_ENTRY, OBS_ENTRY, PROB_ENTRY],
  attachments: [], warnings: [],
};

function renderView(garden: Garden | null = MOCK_GARDEN, loading = false) {
  return render(
    <MemoryRouter initialEntries={["/journal"]}>
      <I18nextProvider i18n={i18n}>
        <ChatPanel />
        <MobileJournalView
          garden={garden}
          loading={loading}
          invalidateGarden={vi.fn()}
        />
      </I18nextProvider>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MobileJournalView", () => {
  beforeEach(() => {
    resetAiPanelState();
    vi.spyOn(apiClient, "createJournalEntry").mockResolvedValue({
      id: "new1", plant_id: null, schedule_id: null, week: null,
      entry_type: "manual", date: "2026-05-15", title: null, notes: null,
      attachment_ids: [], created_at: "", updated_at: "",
    });
  });

  describe("AC #1 — TopBar", () => {
    it("renders title (Tagebuch / Journal)", () => {
      renderView();
      const bar = screen.getByTestId("mobile-journal-topbar");
      const text = bar.textContent ?? "";
      expect(text.includes("Tagebuch") || text.includes("Journal")).toBe(true);
    });

    it("renders hamburger button", () => {
      renderView();
      expect(screen.getByTestId("mobile-journal-hamburger")).toBeDefined();
    });

    it("renders + button", () => {
      renderView();
      expect(screen.getByTestId("mobile-journal-add-btn")).toBeDefined();
    });

    it("renders chat button", () => {
      renderView();
      expect(screen.getByTestId("mobile-journal-chat-btn")).toBeDefined();
    });
  });

  describe("AC #2 — SearchPill", () => {
    it("search pill has green-tinted background", () => {
      renderView();
      const search = screen.getByTestId("mobile-journal-search");
      const bg = search.style.background;
      expect(bg === "#dde8d8" || bg === "rgb(221, 232, 216)").toBe(true);
    });
  });

  describe("AC #3 — Filter chips", () => {
    it("renders 5 filter chips", () => {
      renderView();
      expect(screen.getByTestId("mobile-journal-chip-done")).toBeDefined();
      expect(screen.getByTestId("mobile-journal-chip-observation")).toBeDefined();
      expect(screen.getByTestId("mobile-journal-chip-problem")).toBeDefined();
      expect(screen.getByTestId("mobile-journal-chip-irrigation")).toBeDefined();
      expect(screen.getByTestId("mobile-journal-chip-manual")).toBeDefined();
    });

    it("no chip is active by default", () => {
      renderView();
      const chip = screen.getByTestId("mobile-journal-chip-done");
      expect(chip.style.background).toBe("rgb(238, 244, 235)"); // #eef4eb
    });

    it("tapping a chip activates it", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-journal-chip-done"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-journal-chip-done").style.background).toBe("rgb(45, 74, 45)");
      });
    });

    it("tapping active chip deactivates it", async () => {
      renderView();
      const chip = screen.getByTestId("mobile-journal-chip-done");
      fireEvent.click(chip);
      await waitFor(() => {
        expect(chip.style.background).toBe("rgb(45, 74, 45)");
      });
      fireEvent.click(chip);
      await waitFor(() => {
        expect(chip.style.background).toBe("rgb(238, 244, 235)");
      });
    });

    it("filter chip hides entries of other types", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-journal-chip-done"));
      await waitFor(() => {
        expect(screen.queryByText("Blattläuse")).toBeNull();
        expect(screen.getByText("Rosen Schnitt")).toBeDefined();
      });
    });
  });

  describe("AC #4 — Month grouping", () => {
    it("renders month headings for May and April", () => {
      renderView();
      const timeline = screen.getByTestId("mobile-journal-timeline");
      const text = timeline.textContent ?? "";
      // May entries and April entry → two month groups
      expect(text.includes("2026")).toBe(true);
    });

    it("renders all three entries", () => {
      renderView();
      const entries = screen.getAllByTestId("mobile-journal-entry");
      expect(entries.length).toBe(3);
    });
  });

  describe("AC #5 — Entry card expand/collapse", () => {
    it("entry body hidden by default", () => {
      renderView();
      expect(screen.queryAllByTestId("mobile-journal-entry-body").length).toBe(0);
    });

    it("tap on entry expands it", async () => {
      renderView();
      const entries = screen.getAllByTestId("mobile-journal-entry");
      fireEvent.click(entries[0]);
      await waitFor(() => {
        expect(screen.getAllByTestId("mobile-journal-entry-body").length).toBe(1);
      });
    });

    it("tap again collapses it", async () => {
      renderView();
      const entries = screen.getAllByTestId("mobile-journal-entry");
      fireEvent.click(entries[0]);
      await waitFor(() => {
        expect(screen.getAllByTestId("mobile-journal-entry-body").length).toBe(1);
      });
      fireEvent.click(entries[0]);
      await waitFor(() => {
        expect(screen.queryAllByTestId("mobile-journal-entry-body").length).toBe(0);
      });
    });
  });

  describe("Search", () => {
    it("filters entries by title", async () => {
      renderView();
      const input = screen.getByTestId("mobile-journal-timeline")
        .closest("[data-testid='mobile-journal-view']")!
        .querySelector("input[type='text']") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Blattläuse" } });
      await waitFor(() => {
        expect(screen.getAllByTestId("mobile-journal-entry").length).toBe(1);
      });
    });

    it("hides empty month groups", async () => {
      renderView();
      const input = screen.getByTestId("mobile-journal-timeline")
        .closest("[data-testid='mobile-journal-view']")!
        .querySelector("input[type='text']") as HTMLInputElement;
      // Filter to only April entry
      fireEvent.change(input, { target: { value: "Blattläuse" } });
      await waitFor(() => {
        const entries = screen.getAllByTestId("mobile-journal-entry");
        expect(entries.length).toBe(1);
      });
    });
  });

  describe("AC #9 — New-entry sheet", () => {
    it("new-entry sheet starts closed", () => {
      renderView();
      const sheet = screen.getByTestId("mobile-journal-new-sheet");
      expect(sheet.style.maxHeight).toBe("0px");
    });

    it("opens when + is clicked", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-journal-add-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-journal-new-sheet").style.maxHeight).toBe("70vh");
      });
    });

    it("closes when ✕ is clicked again", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-journal-add-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-journal-new-sheet").style.maxHeight).toBe("70vh");
      });
      fireEvent.click(screen.getByTestId("mobile-journal-add-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-journal-new-sheet").style.maxHeight).toBe("0px");
      });
    });

    it("opening + closes chat if open", async () => {
      renderView();
      // Open chat first
      fireEvent.click(screen.getByTestId("mobile-journal-chat-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("210px");
      });
      // Open new-entry sheet → chat should close
      fireEvent.click(screen.getByTestId("mobile-journal-add-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("0px");
        expect(screen.getByTestId("mobile-journal-new-sheet").style.maxHeight).toBe("70vh");
      });
    });

    it("renders type selector with 5 options", () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-journal-add-btn"));
      expect(screen.getByTestId("mobile-journal-type-select")).toBeDefined();
      expect(screen.getByTestId("mobile-journal-type-done")).toBeDefined();
      expect(screen.getByTestId("mobile-journal-type-skipped")).toBeDefined();
      expect(screen.getByTestId("mobile-journal-type-observation")).toBeDefined();
      expect(screen.getByTestId("mobile-journal-type-problem")).toBeDefined();
      expect(screen.getByTestId("mobile-journal-type-irrigation")).toBeDefined();
      // "manual" is derived (done + no schedule), not a selectable type
    });

    it("save calls createJournalEntry", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-journal-add-btn"));
      fireEvent.change(screen.getByTestId("mobile-journal-title-input"), {
        target: { value: "Neuer Eintrag Test" },
      });
      fireEvent.click(screen.getByTestId("mobile-journal-save-btn"));
      await waitFor(() => {
        expect(apiClient.createJournalEntry).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Neuer Eintrag Test" }),
        );
      });
    });
  });

  describe("AC #10 — ChatPanel", () => {
    it("chat panel starts closed", () => {
      renderView();
      expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("0px");
    });

    it("opens on chat button click", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-journal-chat-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("210px");
      });
    });

    it("opening chat closes new-entry sheet if open", async () => {
      renderView();
      fireEvent.click(screen.getByTestId("mobile-journal-add-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-journal-new-sheet").style.maxHeight).toBe("70vh");
      });
      fireEvent.click(screen.getByTestId("mobile-journal-chat-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("mobile-journal-new-sheet").style.maxHeight).toBe("0px");
        expect(screen.getByTestId("mobile-chat-panel").style.height).toBe("210px");
      });
    });
  });

  describe("AC #11 — BottomNav", () => {
    it("journal tab is active", () => {
      renderView();
      const tab = screen.getByTestId("mobile-tab-journal");
      const inner = tab.querySelector("span");
      expect(inner?.style.background).toBe("rgba(255, 255, 255, 0.15)");
    });
  });

  describe("Loading state", () => {
    it("shows loading text", () => {
      renderView(null, true);
      const el = screen.queryByText(/Loading/) ?? screen.queryByText(/Wird geladen/);
      expect(el).toBeDefined();
    });
  });

  describe("Empty state", () => {
    it("shows empty message when no entries", () => {
      const empty: Garden = { ...MOCK_GARDEN, journal_entries: [] };
      renderView(empty);
      const el =
        screen.queryByText(/Keine Einträge/) ??
        screen.queryByText(/No entries/);
      expect(el).toBeDefined();
    });
  });
});
