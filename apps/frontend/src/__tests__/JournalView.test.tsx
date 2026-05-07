/**
 * JournalView tests — story-035.
 *
 * AC #1  Entries grouped by month descending
 * AC #2  Entry card: badge, plant tag, title, date; expands for notes
 * AC #3  Filter chips toggle single type
 * AC #4  Live search filters entries
 * AC #5  Empty state shown when no matches
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { JournalView } from "../views/JournalView";
import { resetAiPanelState } from "../hooks/useAiPanelState";

vi.mock("../api/client", () => ({
  apiClient: {
    getGarden: vi.fn().mockResolvedValue({
      plan_url: null, plan_name: null, attachments: [], warnings: [],
      plants: [
        {
          id: "p1", name_common: "Rote Rose", name_botanical: "Rosa",
          icon: "🌹", origin_type: null, category: null, lifecycle: null,
          description: null, care_notes: null, sun_demand: null, water_demand: null,
          soil_type: null, frost_tolerance_min_c: null, temperature_protected: false,
          health_status: null, location: null, watering_zone: null,
          purchase_date: null, purchase_price: null, thumbnail_attachment_id: null,
          positions: [], attachments: [], schedules: [], tasks: [],
          journal_entries: [], created_at: "", updated_at: "",
        },
      ],
      journal_entries: [
        {
          id: "je1", plant_id: "p1", schedule_id: null, week: null,
          entry_type: "done", date: "2026-05-01",
          title: "Rosen geschnitten", notes: "Frühjahrsschnitt durchgeführt.",
          attachment_ids: [], created_at: "", updated_at: "",
        },
        {
          id: "je2", plant_id: null, schedule_id: null, week: null,
          entry_type: "manual", date: "2026-04-15",
          title: "Dünger gekauft", notes: null,
          attachment_ids: [], created_at: "", updated_at: "",
        },
        {
          id: "je3", plant_id: "p1", schedule_id: null, week: null,
          entry_type: "skipped", date: "2026-05-02",
          title: null, notes: "Zu nass",
          attachment_ids: [], created_at: "", updated_at: "",
        },
      ],
    }),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
  resetAiPanelState();
});

function renderJournal() {
  return render(
    <I18nextProvider i18n={i18n}>
      <JournalView />
    </I18nextProvider>
  );
}

describe("JournalView — layout", () => {
  it("renders journal view container", () => {
    renderJournal();
    expect(screen.getByTestId("journal-view")).toBeInTheDocument();
  });

  it("renders search input (AC #4)", () => {
    renderJournal();
    expect(screen.getByTestId("journal-search")).toBeInTheDocument();
  });

  it("renders filter chips (AC #3)", () => {
    renderJournal();
    expect(screen.getByTestId("filter-chip-done")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-skipped")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-manual")).toBeInTheDocument();
  });
});

describe("JournalView — timeline entries (AC #1, #2)", () => {
  it("renders all entries", async () => {
    renderJournal();
    await waitFor(() => {
      const entries = screen.getAllByTestId("journal-entry");
      expect(entries).toHaveLength(3);
    });
  });

  it("shows entry title", async () => {
    renderJournal();
    await waitFor(() =>
      expect(screen.getByText("Rosen geschnitten")).toBeInTheDocument()
    );
  });

  it("shows type badge (AC #2)", async () => {
    renderJournal();
    await waitFor(() => {
      const badges = screen.getAllByTestId("entry-type-badge");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it("shows plant tag when entry has plant_id (AC #2)", async () => {
    renderJournal();
    await waitFor(() => {
      const tags = screen.getAllByTestId("entry-plant-tag");
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0]).toHaveTextContent("Rote Rose");
    });
  });

  it("groups entries by month (AC #1)", async () => {
    renderJournal();
    await waitFor(() => {
      expect(screen.getByText(/Mai 2026/)).toBeInTheDocument();
      expect(screen.getByText(/April 2026/)).toBeInTheDocument();
    });
  });
});

describe("JournalView — expand entry (AC #2)", () => {
  it("clicking entry with notes expands it", async () => {
    renderJournal();
    await waitFor(() => screen.getAllByTestId("journal-entry"));
    // Click the entry with title "Rosen geschnitten" (has notes)
    const entries = screen.getAllByTestId("journal-entry");
    // je3 is first (2026-05-02), je1 is second (2026-05-01)
    fireEvent.click(entries[1]);
    await waitFor(() =>
      expect(screen.getByText("Frühjahrsschnitt durchgeführt.")).toBeInTheDocument()
    );
  });
});

describe("JournalView — filter chips (AC #3)", () => {
  it("activating 'Erledigt' chip filters to done entries only", async () => {
    renderJournal();
    await waitFor(() => screen.getAllByTestId("journal-entry"));
    fireEvent.click(screen.getByTestId("filter-chip-done"));
    await waitFor(() => {
      const entries = screen.getAllByTestId("journal-entry");
      expect(entries).toHaveLength(1);
    });
  });

  it("clicking active chip again deactivates filter (shows all)", async () => {
    renderJournal();
    await waitFor(() => screen.getAllByTestId("journal-entry"));
    fireEvent.click(screen.getByTestId("filter-chip-done"));
    fireEvent.click(screen.getByTestId("filter-chip-done"));
    await waitFor(() => {
      expect(screen.getAllByTestId("journal-entry")).toHaveLength(3);
    });
  });
});

describe("JournalView — search (AC #4)", () => {
  it("filters entries by title", async () => {
    renderJournal();
    await waitFor(() => screen.getAllByTestId("journal-entry"));
    fireEvent.change(screen.getByTestId("journal-search"), { target: { value: "Dünger" } });
    await waitFor(() => {
      expect(screen.getAllByTestId("journal-entry")).toHaveLength(1);
      expect(screen.getByText("Dünger gekauft")).toBeInTheDocument();
    });
  });

  it("filters by plant name", async () => {
    renderJournal();
    await waitFor(() => screen.getAllByTestId("journal-entry"));
    fireEvent.change(screen.getByTestId("journal-search"), { target: { value: "Rote Rose" } });
    await waitFor(() => {
      // je1 and je3 both have plant_id: "p1" (Rote Rose)
      expect(screen.getAllByTestId("journal-entry")).toHaveLength(2);
    });
  });
});

describe("JournalView — empty state (AC #5)", () => {
  it("shows empty state when search has no match", async () => {
    renderJournal();
    await waitFor(() => screen.getAllByTestId("journal-entry"));
    fireEvent.change(screen.getByTestId("journal-search"), { target: { value: "xyznotfound" } });
    await waitFor(() =>
      expect(screen.getByTestId("journal-empty")).toBeInTheDocument()
    );
  });
});
