/**
 * PlantDetailPanel tests — story-025 + story-040.
 *
 * story-025 coverage:
 * - AC #1: name, botanical name, close button
 * - AC #2: image slots rendered
 * - AC #3: fact sheet fields visible
 * - AC #4: care notes rendered
 * - AC #5: tasks list rendered
 * - AC #6: Bearbeiten button calls onEdit prop
 * - AC #8: ✕ button calls onClose
 *
 * story-040 coverage:
 * - AC #1: Ask-assistant button removed
 * - AC #3: Delete button rendered (red text-link style)
 * - AC #4: Clicking Delete shows confirmation dialog
 * - AC #5: Confirming calls deletePlant(id)
 * - AC #6: On success onDelete callback fired
 * - AC #7: On API failure inline error shown, panel stays open
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { PlantDetailPanel } from "../components/PlantDetailPanel";
import type { Plant } from "@api/plant";

const MOCK_PLANT: Plant = {
  id:                      "p1",
  name_common:             "Rote Rose",
  name_botanical:          "Rosa",
  icon:                    "🌹",
  origin_type:             "native",
  category:                "Strauch",
  lifecycle:               "perennial",
  description:             "Eine wunderschöne Gartenrose.",
  care_notes:              "Schnitt im Frühjahr empfohlen.",
  sun_demand:              "sunny",
  water_demand:            "medium",
  soil_type:               "loamy",
  frost_tolerance_min_c:   -15,
  temperature_protected:   false,
  health_status:           "good",
  location:                "Westbeet",
  watering_zone:           "Beet West",
  purchase_date:           "2022-03-15",
  purchase_price:          null,
  
  positions:               [],
  attachments:             [],
  journal_entries:         [],
  schedules: [
    {
      id: "s1", schedule_type: "pruning",
      start_week: 9, end_week: 11,
      color: "#27ae60", label: "Frühlingsschnitt",
      notes: null, created_at: "", updated_at: "",
    },
    {
      id: "s2", schedule_type: "fertilization",
      start_week: 15, end_week: 20,
      color: "#3498db", label: "Düngen",
      notes: null, created_at: "", updated_at: "",
    },
  ],
  tasks: [],
  created_at: "2022-04-01T00:00:00Z",
  updated_at: "2022-04-01T00:00:00Z",
};

vi.mock("../api/client", () => ({
  apiClient: {
    deletePlant: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
});

function renderPanel(overrides?: Partial<Parameters<typeof PlantDetailPanel>[0]>) {
  const onClose  = vi.fn();
  const onEdit   = vi.fn();
  const onDelete = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <PlantDetailPanel
        plant={MOCK_PLANT}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        {...overrides}
      />
    </I18nextProvider>
  );
  return { onClose, onEdit, onDelete };
}

describe("PlantDetailPanel — header (AC #1)", () => {
  it("shows common name", () => {
    renderPanel();
    expect(screen.getByText("Rote Rose")).toBeInTheDocument();
  });

  it("shows botanical name", () => {
    renderPanel();
    expect(screen.getByText("Rosa")).toBeInTheDocument();
  });

  it("shows close button (AC #8)", () => {
    renderPanel();
    expect(screen.getByTestId("detail-close")).toBeInTheDocument();
  });
});

describe("PlantDetailPanel — close (AC #8)", () => {
  it("calls onClose when ✕ is clicked", () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByTestId("detail-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("PlantDetailPanel — images (AC #2)", () => {
  it("renders three image slots", () => {
    renderPanel();
    expect(screen.getByText("Pflanze")).toBeInTheDocument();
    expect(screen.getByText("Blüte")).toBeInTheDocument();
    expect(screen.getByText("Blatt")).toBeInTheDocument();
  });
});

describe("PlantDetailPanel — facts (AC #3)", () => {
  it("shows description", () => {
    renderPanel();
    expect(screen.getByText("Eine wunderschöne Gartenrose.")).toBeInTheDocument();
  });

  it("shows frost tolerance in fact grid", () => {
    renderPanel();
    expect(screen.getByText("-15°C")).toBeInTheDocument();
  });

  it("shows watering zone in fact grid", () => {
    renderPanel();
    expect(screen.getByText("Beet West")).toBeInTheDocument();
  });
});

describe("PlantDetailPanel — care notes (AC #4)", () => {
  it("renders care notes as plain text", () => {
    renderPanel();
    expect(screen.getByText("Schnitt im Frühjahr empfohlen.")).toBeInTheDocument();
  });

  it("does not render care notes section when null", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <PlantDetailPanel
          plant={{ ...MOCK_PLANT, care_notes: null }}
          onClose={vi.fn()}
        />
      </I18nextProvider>
    );
    expect(screen.queryByText("Pflegehinweise")).not.toBeInTheDocument();
  });
});

describe("PlantDetailPanel — tasks (AC #5)", () => {
  it("renders task schedules (pruning, fertilization)", () => {
    renderPanel();
    expect(screen.getByText("Frühlingsschnitt")).toBeInTheDocument();
    expect(screen.getByText("Düngen")).toBeInTheDocument();
  });
});

// ── TASK-064: expandable task notes ──────────────────────────────────────────

describe("PlantDetailPanel — expandable task notes (TASK-064)", () => {
  const PLANT_WITH_NOTES: Plant = {
    ...MOCK_PLANT,
    schedules: [
      {
        id: "s-notes", schedule_type: "pruning",
        start_week: 9, end_week: 11,
        color: null, label: "Frühjahrsschnitt",
        notes: "Fördert kräftiges Wachstum. Optional — einmaliges Auslassen schadet nicht.",
        created_at: "", updated_at: "",
      },
      {
        id: "s-nonotes", schedule_type: "fertilization",
        start_week: 13, end_week: 14,
        color: null, label: "Düngen",
        notes: null,
        created_at: "", updated_at: "",
      },
    ],
  };

  function renderWithNotes() {
    return render(
      <I18nextProvider i18n={i18n}>
        <PlantDetailPanel
          plant={PLANT_WITH_NOTES}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </I18nextProvider>
    );
  }

  it("notes are visible by default (expanded)", () => {
    renderWithNotes();
    expect(screen.getByTestId("task-notes-s-notes")).toBeInTheDocument();
    expect(screen.getByText(/Fördert kräftiges Wachstum/)).toBeInTheDocument();
  });

  it("toggle button only appears for schedules that have notes", () => {
    renderWithNotes();
    expect(screen.getByTestId("task-toggle-s-notes")).toBeInTheDocument();
    expect(screen.queryByTestId("task-toggle-s-nonotes")).not.toBeInTheDocument();
  });

  it("clicking toggle collapses the notes", () => {
    renderWithNotes();
    fireEvent.click(screen.getByTestId("task-row-s-notes"));
    expect(screen.queryByTestId("task-notes-s-notes")).not.toBeInTheDocument();
  });

  it("clicking toggle again re-expands the notes", () => {
    renderWithNotes();
    fireEvent.click(screen.getByTestId("task-row-s-notes"));
    fireEvent.click(screen.getByTestId("task-row-s-notes"));
    expect(screen.getByTestId("task-notes-s-notes")).toBeInTheDocument();
  });

  it("schedules without notes are not clickable (no role=button)", () => {
    renderWithNotes();
    const row = screen.getByTestId("task-row-s-nonotes");
    expect(row).not.toHaveAttribute("role", "button");
  });
});

describe("PlantDetailPanel — actions (AC #6)", () => {
  it("calls onEdit when Bearbeiten is clicked (AC #6)", () => {
    const { onEdit } = renderPanel();
    fireEvent.click(screen.getByTestId("detail-btn-edit"));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledWith(MOCK_PLANT);
  });
});

// ── story-040: Ask-assistant removed, Delete added ────────────────────────────

describe("PlantDetailPanel — ask-assistant button removed (story-040 AC #1)", () => {
  it("does NOT render an assistant button", () => {
    renderPanel();
    expect(screen.queryByTestId("detail-btn-assistant")).not.toBeInTheDocument();
  });
});

describe("PlantDetailPanel — delete button (story-040 AC #3)", () => {
  it("renders delete button", () => {
    renderPanel();
    expect(screen.getByTestId("detail-btn-delete")).toBeInTheDocument();
  });

  it("delete button has red color and no filled background", () => {
    renderPanel();
    const btn = screen.getByTestId("detail-btn-delete");
    expect(btn.style.background).toBe("none");
    expect(btn.style.color).toContain("red-warn");
  });
});

describe("PlantDetailPanel — confirmation dialog (story-040 AC #4)", () => {
  it("confirmation not visible initially", () => {
    renderPanel();
    expect(screen.queryByTestId("detail-delete-confirm")).not.toBeInTheDocument();
  });

  it("shows confirmation after clicking delete button", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("detail-btn-delete"));
    expect(screen.getByTestId("detail-delete-confirm")).toBeInTheDocument();
  });

  it("shows cancel and confirm buttons in dialog", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("detail-btn-delete"));
    expect(screen.getByTestId("detail-delete-cancel")).toBeInTheDocument();
    expect(screen.getByTestId("detail-delete-ok")).toBeInTheDocument();
  });

  it("cancel hides confirmation dialog", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("detail-btn-delete"));
    fireEvent.click(screen.getByTestId("detail-delete-cancel"));
    expect(screen.queryByTestId("detail-delete-confirm")).not.toBeInTheDocument();
  });
});

describe("PlantDetailPanel — delete confirmed (story-040 AC #5, #6)", () => {
  it("calls deletePlant with plant id on confirm", async () => {
    const { apiClient } = await import("../api/client");
    renderPanel();
    fireEvent.click(screen.getByTestId("detail-btn-delete"));
    fireEvent.click(screen.getByTestId("detail-delete-ok"));
    await waitFor(() => expect(apiClient.deletePlant).toHaveBeenCalledWith("p1"));
  });

  it("calls onDelete callback after successful deletion", async () => {
    const { onDelete } = renderPanel();
    fireEvent.click(screen.getByTestId("detail-btn-delete"));
    fireEvent.click(screen.getByTestId("detail-delete-ok"));
    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce());
  });
});

describe("PlantDetailPanel — delete failure (story-040 AC #7)", () => {
  it("shows inline error when deletePlant rejects", async () => {
    const { apiClient } = await import("../api/client");
    (apiClient.deletePlant as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));
    renderPanel();
    fireEvent.click(screen.getByTestId("detail-btn-delete"));
    fireEvent.click(screen.getByTestId("detail-delete-ok"));
    await waitFor(() =>
      expect(screen.getByTestId("detail-delete-error")).toBeInTheDocument()
    );
  });

  it("hides confirmation dialog on failure but keeps panel open", async () => {
    const { apiClient } = await import("../api/client");
    (apiClient.deletePlant as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));
    renderPanel();
    fireEvent.click(screen.getByTestId("detail-btn-delete"));
    fireEvent.click(screen.getByTestId("detail-delete-ok"));
    await waitFor(() =>
      expect(screen.queryByTestId("detail-delete-confirm")).not.toBeInTheDocument()
    );
    // Panel still shows plant name — it's still open
    expect(screen.getByText("Rote Rose")).toBeInTheDocument();
  });
});

// ── TASK-075: Cold protection badge ──────────────────────────────────────────

describe("PlantDetailPanel — cold protection badge (TASK-075 AC #4)", () => {
  it("shows protected badge when temperature_protected is true", () => {
    const plant: Plant = { ...MOCK_PLANT, temperature_protected: true };
    render(
      <I18nextProvider i18n={i18n}>
        <PlantDetailPanel plant={plant} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
      </I18nextProvider>
    );
    expect(screen.getByTestId("protected-badge")).toBeInTheDocument();
    expect(screen.getByTestId("protected-badge").textContent).toContain("Kälteschutz/Indoor");
  });

  it("does not show protected badge when temperature_protected is false", () => {
    renderPanel(); // MOCK_PLANT has temperature_protected: false
    expect(screen.queryByTestId("protected-badge")).not.toBeInTheDocument();
  });
});
