/**
 * JournalView tests — story-035 + story-036.
 *
 * story-035: AC #1-#6 Timeline & Entry List
 * story-036: AC #1 FAB, #2 Type selector, #3 Plant picker, #4 Fields,
 *            #6 Save creates entry, #7 Edit mode
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { JournalView } from "../views/JournalView";
import { resetAiPanelState } from "../hooks/useAiPanelState";

vi.mock("../api/client", () => ({
  apiClient: {
    createJournalEntry: vi.fn().mockResolvedValue({
      id: "je-new", plant_id: null, schedule_id: null, week: null,
      entry_type: "done", date: "2026-05-10",
      title: "Neu", notes: null, attachment_ids: [], created_at: "", updated_at: "",
    }),
    updateJournalEntry: vi.fn().mockResolvedValue({
      id: "je1", plant_id: "p1", schedule_id: null, week: null,
      entry_type: "done", date: "2026-05-01",
      title: "Aktualisiert", notes: null, attachment_ids: [], created_at: "", updated_at: "",
    }),
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

// ── story-036: New Entry Panel & Edit ────────────────────────────────────────

describe("JournalView — FAB opens new entry panel (story-036 AC #1)", () => {
  it("FAB is visible by default", () => {
    renderJournal();
    expect(screen.getByTestId("journal-fab")).toBeInTheDocument();
  });

  it("clicking FAB opens the entry panel", async () => {
    renderJournal();
    fireEvent.click(screen.getByTestId("journal-fab"));
    await waitFor(() =>
      expect(screen.getByTestId("entry-panel")).toBeInTheDocument()
    );
    expect(screen.getByText("Neuer Eintrag")).toBeInTheDocument();
  });

  it("FAB hidden when panel is open", async () => {
    renderJournal();
    fireEvent.click(screen.getByTestId("journal-fab"));
    await waitFor(() => screen.getByTestId("entry-panel"));
    expect(screen.queryByTestId("journal-fab")).not.toBeInTheDocument();
  });
});

describe("JournalView — entry panel fields (story-036 AC #2, #3, #4)", () => {
  it("shows type selector buttons (AC #2)", async () => {
    renderJournal();
    fireEvent.click(screen.getByTestId("journal-fab"));
    await waitFor(() => screen.getByTestId("panel-type-0"));
    expect(screen.getByTestId("panel-type-0")).toBeInTheDocument();
    expect(screen.getByTestId("panel-type-1")).toBeInTheDocument();
  });

  it("shows plant picker with plants (AC #3)", async () => {
    renderJournal();
    fireEvent.click(screen.getByTestId("journal-fab"));
    await waitFor(() => screen.getByTestId("panel-plant"));
    const select = screen.getByTestId("panel-plant") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent("Rote Rose");
  });

  it("shows date, title, notes fields (AC #4)", async () => {
    renderJournal();
    fireEvent.click(screen.getByTestId("journal-fab"));
    await waitFor(() => screen.getByTestId("panel-date"));
    expect(screen.getByTestId("panel-date")).toBeInTheDocument();
    expect(screen.getByTestId("panel-title")).toBeInTheDocument();
    expect(screen.getByTestId("panel-notes")).toBeInTheDocument();
  });
});

describe("JournalView — save new entry (story-036 AC #6)", () => {
  it("clicking Speichern calls createJournalEntry and closes panel", async () => {
    const { apiClient } = await import("../api/client");
    renderJournal();
    fireEvent.click(screen.getByTestId("journal-fab"));
    await waitFor(() => screen.getByTestId("panel-save"));
    fireEvent.change(screen.getByTestId("panel-title"), { target: { value: "Neuer Eintrag" } });
    fireEvent.click(screen.getByTestId("panel-save"));
    await waitFor(() => expect(apiClient.createJournalEntry).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText("Neuer Eintrag")).not.toBeInTheDocument());
  });
});

describe("JournalView — close panel (story-036 AC #1)", () => {
  it("✕ button closes the panel", async () => {
    renderJournal();
    fireEvent.click(screen.getByTestId("journal-fab"));
    await waitFor(() => screen.getByTestId("panel-close"));
    fireEvent.click(screen.getByTestId("panel-close"));
    await waitFor(() =>
      expect(screen.queryByTestId("panel-close")).not.toBeInTheDocument()
    );
  });
});

describe("JournalView — edit existing entry (story-036 AC #7)", () => {
  it("edit button opens panel in edit mode", async () => {
    renderJournal();
    await waitFor(() => screen.getAllByTestId("entry-edit-btn"));
    fireEvent.click(screen.getAllByTestId("entry-edit-btn")[0]);
    await waitFor(() =>
      expect(screen.getByText("Eintrag bearbeiten")).toBeInTheDocument()
    );
  });

  it("saving edit calls updateJournalEntry (AC #7)", async () => {
    const { apiClient } = await import("../api/client");
    renderJournal();
    await waitFor(() => screen.getAllByTestId("entry-edit-btn"));
    fireEvent.click(screen.getAllByTestId("entry-edit-btn")[0]);
    await waitFor(() => screen.getByTestId("panel-save"));
    fireEvent.click(screen.getByTestId("panel-save"));
    await waitFor(() => expect(apiClient.updateJournalEntry).toHaveBeenCalledOnce());
  });
});
