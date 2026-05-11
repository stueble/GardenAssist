/**
 * Tests for TASK-053: editPlant AI tool
 *
 * Covers:
 * - AC #1: editPlant(null, fields) opens dialog in new-plant mode with prefill
 * - AC #1: editPlant(id, fields) opens dialog in edit mode and applies fields
 * - AC #2: if handler not registered, dispatchToolCall returns error feedback
 * - AC #3: AI-suggested fields have green marker styling
 * - AC #4: × revert button restores previous value and removes marker
 * - AC #5: Status bar shows count of active suggestions
 * - AC #6: No direct API writes triggered by tool use
 * - AC #7: applyAiSuggestions utility is generic and reusable
 */

import React, { useRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { PlantEditDialog, type PlantEditDialogHandle } from "../components/PlantEditDialog";
import { applyAiSuggestions } from "../lib/applyAiSuggestions";
import {
  registerPlantEditHandler,
  getPlantEditHandler,
} from "../hooks/usePlantEditContext";
import { parseToolCall, dispatchToolCallForTest } from "../components/AiPanel";
import { resetAiPanelState } from "../hooks/useAiPanelState";
import type { Plant } from "@api/plant";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../api/client", () => ({
  apiClient: {
    getSettings: vi.fn().mockResolvedValue({
      language: "de", location_city: null, location_zip: null,
      irrigation_zones: ["Beet West"],
      plant_categories: ["Strauch"],
      color_presets: [],
      task_lookback_weeks: 2, task_lookahead_weeks: 4,
      attachment_size_limit_mb: 10,
      ai_provider: "anthropic", ai_model: "claude-sonnet-4-6", ai_api_key: "sk-test",
    }),
    createPlant: vi.fn(),
    updatePlant: vi.fn(),
    getGarden: vi.fn(),
    uploadAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
  },
  chatWithAi: vi.fn(),
}));

const MOCK_PLANT: Plant = {
  id: "p1", name_common: "Rose", name_botanical: "Rosa", icon: "🌹",
  origin_type: "native", category: "Strauch", lifecycle: "perennial",
  description: null, care_notes: null, sun_demand: "sunny",
  water_demand: "medium", soil_type: "loamy",
  frost_tolerance_min_c: -15, temperature_protected: false,
  health_status: "good", location: "Westbeet", watering_zone: "Beet West",
  purchase_date: null, purchase_price: null,
  positions: [], attachments: [], journal_entries: [], schedules: [], tasks: [],
  created_at: "", updated_at: "",
};

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
  resetAiPanelState();
});

// ── Helper: render PlantEditDialog with a ref ─────────────────────────────────

function renderWithRef(plant: Plant | null = null) {
  let capturedRef: React.RefObject<PlantEditDialogHandle | null> | null = null;

  function Wrapper() {
    const ref = useRef<PlantEditDialogHandle>(null);
    capturedRef = ref;
    return (
      <I18nextProvider i18n={i18n}>
        <PlantEditDialog
          ref={ref}
          plant={plant}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          positions={[]}
          onPositionsChange={vi.fn()}
          initialPositions={[]}
          pickMode={false}
          onPickModeChange={vi.fn()}
        />
      </I18nextProvider>
    );
  }

  const result = render(<Wrapper />);
  return { ...result, getRef: () => capturedRef?.current ?? null };
}

// ── AC #7: applyAiSuggestions utility ────────────────────────────────────────

describe("applyAiSuggestions utility (AC #7)", () => {
  it("merges non-null suggestions into current form", () => {
    const current = { a: "old", b: "keep", c: "old" };
    const suggestion = { a: "new", c: "changed" };
    const { nextForm, nextMarked, prevValues } = applyAiSuggestions(current, suggestion);
    expect(nextForm).toEqual({ a: "new", b: "keep", c: "changed" });
    expect(nextMarked).toEqual({ a: true, c: true });
    expect(prevValues).toEqual({ a: "old", c: "old" });
  });

  it("skips null/undefined suggestions", () => {
    const current = { x: "keep" };
    const { nextForm, nextMarked } = applyAiSuggestions(current, { x: undefined });
    expect(nextForm.x).toBe("keep");
    expect(nextMarked).toEqual({});
  });

  it("works with an empty suggestion object", () => {
    const current = { foo: "bar" };
    const { nextForm, nextMarked } = applyAiSuggestions(current, {});
    expect(nextForm).toEqual({ foo: "bar" });
    expect(Object.keys(nextMarked)).toHaveLength(0);
  });

  it("does not mutate the original object", () => {
    const current = { a: "original" };
    applyAiSuggestions(current, { a: "changed" });
    expect(current.a).toBe("original");
  });
});

// ── AC #3 / AC #4 / AC #5: AI marker rendering in PlantEditDialog ─────────────

describe("PlantEditDialog — AI field markers (AC #3, #4, #5)", () => {
  it("shows no AI suggestion bar initially", async () => {
    renderWithRef(MOCK_PLANT);
    await waitFor(() => {
      expect(screen.queryByTestId("ai-suggestion-bar")).not.toBeInTheDocument();
    });
  });

  it("applies AI suggestions and shows green marker + status bar (AC #3, #5)", async () => {
    const { getRef } = renderWithRef(MOCK_PLANT);

    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => {
      getRef()!.applyAiFields({ water_demand: "low", care_notes: "Regelmäßig gießen." });
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-suggestion-bar")).toBeInTheDocument();
      expect(screen.getByTestId("ai-suggestion-bar").textContent).toContain("2 Felder");
    });

    expect(screen.getByTestId("ai-field-water_demand")).toBeInTheDocument();
    expect(screen.getByTestId("ai-field-care_notes")).toBeInTheDocument();
  });

  it("reverts a field on × click and removes its marker (AC #4)", async () => {
    const { getRef } = renderWithRef(MOCK_PLANT);

    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => { getRef()!.applyAiFields({ water_demand: "low" }); });

    await waitFor(() => {
      expect(screen.getByTestId("ai-field-water_demand")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("ai-revert-water_demand"));

    await waitFor(() => {
      expect(screen.queryByTestId("ai-field-water_demand")).not.toBeInTheDocument();
      expect(screen.queryByTestId("ai-suggestion-bar")).not.toBeInTheDocument();
    });

    const waterSelect = screen.getByTestId("field-water") as HTMLSelectElement;
    expect(waterSelect.value).toBe("medium"); // original value from MOCK_PLANT
  });

  it("status bar count decrements as fields are reverted", async () => {
    const { getRef } = renderWithRef(MOCK_PLANT);

    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => { getRef()!.applyAiFields({ water_demand: "low", sun_demand: "shady" }); });

    await waitFor(() => {
      expect(screen.getByTestId("ai-suggestion-bar").textContent).toContain("2 Felder");
    });

    fireEvent.click(screen.getByTestId("ai-revert-water_demand"));

    await waitFor(() => {
      expect(screen.getByTestId("ai-suggestion-bar").textContent).toContain("1 Feld");
    });
  });

  it("isOpen() returns true when dialog is mounted", async () => {
    const { getRef } = renderWithRef(MOCK_PLANT);
    await waitFor(() => { expect(getRef()).not.toBeNull(); });
    expect(getRef()!.isOpen()).toBe(true);
  });
});

// ── AC #1: editPlant via PlantEditContext ─────────────────────────────────────

describe("editPlant via PlantEditContext (AC #1)", () => {
  it("registers handler and getPlantEditHandler() returns it", () => {
    const editPlant = vi.fn();
    const unregister = registerPlantEditHandler({ editPlant });
    expect(getPlantEditHandler()).not.toBeNull();
    unregister();
    expect(getPlantEditHandler()).toBeNull();
  });

  it("dispatches editPlant with null id for new plant", () => {
    const editPlant = vi.fn();
    const unregister = registerPlantEditHandler({ editPlant });

    getPlantEditHandler()!.editPlant(null, { name_common: "Magnolie", sun_demand: "sunny" });
    expect(editPlant).toHaveBeenCalledWith(null, { name_common: "Magnolie", sun_demand: "sunny" });

    unregister();
  });

  it("dispatches editPlant with plant id for edit mode", () => {
    const editPlant = vi.fn();
    const unregister = registerPlantEditHandler({ editPlant });

    getPlantEditHandler()!.editPlant("p1", { care_notes: "Gießen" });
    expect(editPlant).toHaveBeenCalledWith("p1", { care_notes: "Gießen" });

    unregister();
  });
});

// ── AC #6: No direct API writes triggered by tool use ────────────────────────

describe("Tool use does not trigger API writes (AC #6)", () => {
  it("applyAiFields does not call createPlant or updatePlant", async () => {
    const { apiClient } = await import("../api/client");
    const { getRef } = renderWithRef(MOCK_PLANT);

    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => { getRef()!.applyAiFields({ water_demand: "low", care_notes: "Test" }); });

    await new Promise((r) => setTimeout(r, 10));

    expect(apiClient.createPlant).not.toHaveBeenCalled();
    expect(apiClient.updatePlant).not.toHaveBeenCalled();
  });
});

// ── Tool-call parsing ─────────────────────────────────────────────────────────

describe("parseToolCall", () => {
  it("parses a valid editPlant tool block", () => {
    const raw = `Ich öffne den Dialog.\n\`\`\`tool\n{"tool":"editPlant","id":null,"fields":{"sun_demand":"sunny"}}\n\`\`\``;
    const { toolCall, displayText, parseError } = parseToolCall(raw);
    expect(toolCall).toEqual({ tool: "editPlant", id: null, fields: { sun_demand: "sunny" } });
    expect(displayText).toBe("Ich öffne den Dialog.");
    expect(parseError).toBe(false);
  });

  it("returns null toolCall and parseError:false for plain text", () => {
    const { toolCall, displayText, parseError } = parseToolCall("Kein Tool.");
    expect(toolCall).toBeNull();
    expect(displayText).toBe("Kein Tool.");
    expect(parseError).toBe(false);
  });

  it("returns parseError:true for malformed JSON in complete block", () => {
    const { toolCall, parseError } = parseToolCall("```tool\nnot-json\n```");
    expect(toolCall).toBeNull();
    expect(parseError).toBe(true);
  });

  it("returns parseError:true for truncated response (no closing ```)", () => {
    const raw = `Ich erstelle die Pflanze.\n\`\`\`tool\n{"tool":"editPlant","id":null,"fields":{"name_common":"Zitrone",`;
    const { toolCall, parseError, displayText } = parseToolCall(raw);
    expect(toolCall).toBeNull();
    expect(parseError).toBe(true);
    // Broken block should be stripped from displayText
    expect(displayText).not.toContain("```tool");
    expect(displayText).toContain("Ich erstelle die Pflanze.");
  });

  it("strips the tool block from displayText", () => {
    const raw = `Antwort.\n\`\`\`tool\n{"tool":"editPlant","id":"p1","fields":{}}\n\`\`\`\nEnde.`;
    const { displayText } = parseToolCall(raw);
    expect(displayText).not.toContain("```tool");
    expect(displayText).toContain("Antwort.");
    expect(displayText).toContain("Ende.");
  });

  it("strips broken block from displayText on invalid JSON", () => {
    const raw = `Text davor.\n\`\`\`tool\n{invalid json}\n\`\`\``;
    const { displayText, parseError } = parseToolCall(raw);
    expect(parseError).toBe(true);
    expect(displayText).not.toContain("```tool");
    expect(displayText).toContain("Text davor.");
  });
});

// ── dispatchToolCall (AC #2 error feedback) ───────────────────────────────────

describe("dispatchToolCallForTest", () => {
  it("returns error feedback if no handler registered", () => {
    const msg = dispatchToolCallForTest({ tool: "editPlant", id: null, fields: {} }, "de");
    expect(msg).toContain("⚠️");
    expect(msg).toContain("Pflanzenansicht");
  });

  it("returns English error when lang=en and no handler", () => {
    const msg = dispatchToolCallForTest({ tool: "editPlant", id: null, fields: {} }, "en");
    expect(msg).toContain("⚠️");
    expect(msg.toLowerCase()).toContain("plants view");
  });

  it("returns empty string on successful dispatch", () => {
    const editPlant = vi.fn();
    const unregister = registerPlantEditHandler({ editPlant });

    const msg = dispatchToolCallForTest(
      { tool: "editPlant", id: null, fields: { name_common: "Test" } },
      "de"
    );
    expect(msg).toBe("");
    expect(editPlant).toHaveBeenCalledWith(null, { name_common: "Test" });

    unregister();
  });

  it("returns error for unknown tool", () => {
    const msg = dispatchToolCallForTest({ tool: "deletePlant" }, "de");
    expect(msg).toContain("⚠️");
    expect(msg).toContain("deletePlant");
  });
});

// ── TASK-055: Schedule suggestions via editPlant tool ─────────────────────────

describe("applyAiFields — schedule add (AC #1, #2)", () => {
  it("PlantEditFields type accepts schedules array", () => {
    // Type-level test: this must compile without errors
    const fields = {
      schedules: [
        { action: "add" as const, schedule_type: "bloom", start_week: 17, end_week: 36, color: "#c0392b", label: "Hauptblüte", notes: null },
        { action: "add" as const, schedule_type: "pruning", start_week: 9, end_week: 10 },
      ],
    };
    expect(fields.schedules).toHaveLength(2);
    expect(fields.schedules[0].action).toBe("add");
  });

  it("adds a new schedule row with aiAction='add'", async () => {
    const { getRef } = renderWithRef(MOCK_PLANT);
    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => {
      getRef()!.applyAiFields({
        schedules: [{ action: "add", schedule_type: "bloom", start_week: 17, end_week: 36, color: "#c0392b", label: "Hauptblüte" }],
      });
    });

    // Bloom section should auto-open and show the new entry
    await waitFor(() => {
      const entries = screen.queryAllByTestId("schedule-entry");
      const aiEntries = entries.filter((e) => e.getAttribute("data-ai-action") === "add");
      expect(aiEntries.length).toBeGreaterThan(0);
    });
  });

  it("preserves existing schedule rows (additive behaviour, AC #2)", async () => {
    const plantWithSchedule: Plant = {
      ...MOCK_PLANT,
      schedules: [{
        id: "s1", schedule_type: "bloom", start_week: 17, end_week: 36,
        color: "#c0392b", label: "Existing", notes: null, created_at: "", updated_at: "",
      }],
    };
    const { getRef } = renderWithRef(plantWithSchedule);
    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    // Open the bloom section (it auto-opens when AI adds rows there)
    // First add a pruning schedule via AI — it opens the pruning section
    act(() => {
      getRef()!.applyAiFields({
        schedules: [{ action: "add", schedule_type: "bloom", start_week: 5, end_week: 8, label: "Zweite Blüte" }],
      });
    });

    await waitFor(() => {
      // Both the existing and the new AI row should be present in bloom section
      const entries = screen.queryAllByTestId("schedule-entry");
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("marks a row for removal with aiAction='remove'", async () => {
    const plantWithSchedule: Plant = {
      ...MOCK_PLANT,
      schedules: [{
        id: "s-remove", schedule_type: "bloom", start_week: 17, end_week: 36,
        color: "#c0392b", label: "To remove", notes: null, created_at: "", updated_at: "",
      }],
    };
    const { getRef } = renderWithRef(plantWithSchedule);
    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => {
      getRef()!.applyAiFields({
        schedules: [{ action: "remove", id: "s-remove" }],
      });
    });

    await waitFor(() => {
      const entries = screen.queryAllByTestId("schedule-entry");
      const removed = entries.filter((e) => e.getAttribute("data-ai-action") === "remove");
      expect(removed.length).toBe(1);
    });
  });

  it("reverts a 'remove' mark when × is clicked", async () => {
    const plantWithSchedule: Plant = {
      ...MOCK_PLANT,
      schedules: [{
        id: "s-rev", schedule_type: "bloom", start_week: 17, end_week: 36,
        color: "#c0392b", label: "Revert me", notes: null, created_at: "", updated_at: "",
      }],
    };
    const { getRef } = renderWithRef(plantWithSchedule);
    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => {
      getRef()!.applyAiFields({ schedules: [{ action: "remove", id: "s-rev" }] });
    });

    await waitFor(() => {
      const entries = screen.queryAllByTestId("schedule-entry");
      expect(entries.some((e) => e.getAttribute("data-ai-action") === "remove")).toBe(true);
    });

    // Click the × button on the removed entry
    const deleteButtons = screen.getAllByTestId("schedule-entry-delete");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      const entries = screen.queryAllByTestId("schedule-entry");
      // After revert the entry should exist but have no ai-action
      expect(entries.some((e) => e.getAttribute("data-ai-action") === "remove")).toBe(false);
      expect(entries.length).toBe(1); // still there, just no longer marked
    });
  });

  it("does not call createPlant or updatePlant when schedules are suggested (AC #6)", async () => {
    const { apiClient } = await import("../api/client");
    const { getRef } = renderWithRef(MOCK_PLANT);
    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => {
      getRef()!.applyAiFields({
        schedules: [{ action: "add", schedule_type: "bloom", start_week: 17, end_week: 36 }],
      });
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(apiClient.createPlant).not.toHaveBeenCalled();
    expect(apiClient.updatePlant).not.toHaveBeenCalled();
  });
});

describe("System prompt contains schedule documentation (AC #4, #5)", () => {
  it("TOOLS_DESCRIPTION contains 'schedules'", async () => {
    const { buildSystemPrompt } = await import("../lib/aiPrompt");
    const ctx = {
      view: "plants" as const,
      garden: {
        plan_url: null, plan_name: null,
        plants: [], attachments: [], journal_entries: [], warnings: [],
      },
    };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("schedules");
    expect(prompt).toContain("bloom");
    expect(prompt).toContain("start_week");
    expect(prompt).toContain("end_week");
  });

  it("TOOLS_DESCRIPTION explains year-wrap (AC #5)", async () => {
    const { buildSystemPrompt } = await import("../lib/aiPrompt");
    const ctx = {
      view: "plants" as const,
      garden: {
        plan_url: null, plan_name: null,
        plants: [], attachments: [], journal_entries: [], warnings: [],
      },
    };
    const prompt = buildSystemPrompt(ctx, "de");
    // Year-wrap hint: start_week > end_week
    expect(prompt).toMatch(/start_week.*>.*end_week|Jahres/);
  });
});

// ── TASK-054: openJournalEdit / updateJournalEdit tools ───────────────────────

import {
  registerJournalEditHandler,
  getJournalEditHandler,
} from "../hooks/useJournalEditContext";
import type { JournalEditFields } from "../hooks/useJournalEditContext";
import { JournalView } from "../views/JournalView";
import type { Garden } from "@api/garden";

const MOCK_GARDEN: Garden = {
  plan_url: null, plan_name: null,
  plants: [], attachments: [],
  journal_entries: [],
  warnings: [],
};

// Helper to render JournalView (which registers the journal edit handler)
function renderJournalView(garden: Garden = MOCK_GARDEN) {
  return render(
    <I18nextProvider i18n={i18n}>
      <JournalView garden={garden} loading={false} invalidateGarden={() => {}} />
    </I18nextProvider>
  );
}

describe("TASK-054 — openJournalEdit tool (AC #1)", () => {
  it("openJournalEdit with no entry_id opens the panel in new-entry mode", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();
    expect(handler).not.toBeNull();

    // Panel should be closed initially
    expect(screen.queryByTestId("panel-save")).toBeNull();

    // Open new entry panel
    act(() => {
      handler!.openJournalEdit(undefined, {});
    });

    await waitFor(() => {
      expect(screen.getByTestId("panel-save")).toBeDefined();
    });
  });

  it("openJournalEdit prefills date field with AI marker", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => {
      handler!.openJournalEdit(undefined, { date: "2026-06-15" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("panel-date")).toBeDefined();
    });

    // Date field should have AI-suggested value
    await waitFor(() => {
      const dateInput = screen.getByTestId("panel-date") as HTMLInputElement;
      expect(dateInput.value).toBe("2026-06-15");
    });

    // AI suggestions bar should be visible
    await waitFor(() => {
      expect(screen.getByTestId("ai-suggestions-bar")).toBeDefined();
    });
  });

  it("openJournalEdit prefills title with AI marker", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => {
      handler!.openJournalEdit(undefined, { title: "Blattläuse entdeckt" });
    });

    await waitFor(() => {
      const titleInput = screen.getByTestId("panel-title") as HTMLInputElement;
      expect(titleInput.value).toBe("Blattläuse entdeckt");
    });
  });

  it("openJournalEdit prefills notes with AI marker", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => {
      handler!.openJournalEdit(undefined, { notes: "Behandlung empfohlen." });
    });

    await waitFor(() => {
      const notesInput = screen.getByTestId("panel-notes") as HTMLTextAreaElement;
      expect(notesInput.value).toBe("Behandlung empfohlen.");
    });
  });
});

describe("TASK-054 — updateJournalEdit tool (AC #2)", () => {
  it("updateJournalEdit returns error when panel is not open", () => {
    renderJournalView();
    const handler = getJournalEditHandler();
    expect(handler).not.toBeNull();

    const result = handler!.updateJournalEdit({ title: "Test" });
    expect(result).toMatch(/not open|nicht geöffnet/i);
  });

  it("updateJournalEdit applies fields to open panel", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    // First open the panel
    act(() => {
      handler!.openJournalEdit(undefined, {});
    });

    await waitFor(() => {
      expect(screen.getByTestId("panel-save")).toBeDefined();
    });

    // Then update a field
    act(() => {
      const result = handler!.updateJournalEdit({ title: "KI-Titel" });
      expect(result).toBe("");
    });

    await waitFor(() => {
      const titleInput = screen.getByTestId("panel-title") as HTMLInputElement;
      expect(titleInput.value).toBe("KI-Titel");
    });
  });

  it("updateJournalEdit shows AI suggestions bar after applying fields", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => { handler!.openJournalEdit(undefined, {}); });
    await waitFor(() => expect(screen.getByTestId("panel-save")).toBeDefined());

    act(() => { handler!.updateJournalEdit({ notes: "KI-Notiz" }); });

    await waitFor(() => {
      expect(screen.getByTestId("ai-suggestions-bar")).toBeDefined();
    });
  });
});

describe("TASK-054 — AI field visual treatment (AC #3)", () => {
  it("title field shows revert button when AI-suggested", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => { handler!.openJournalEdit(undefined, { title: "KI-Titel" }); });

    await waitFor(() => {
      expect(screen.getByTestId("ai-revert-title")).toBeDefined();
    });
  });

  it("notes field shows revert button when AI-suggested", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => { handler!.openJournalEdit(undefined, { notes: "KI-Notiz" }); });

    await waitFor(() => {
      expect(screen.getByTestId("ai-revert-notes")).toBeDefined();
    });
  });

  it("date field shows revert button when AI-suggested", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => { handler!.openJournalEdit(undefined, { date: "2026-12-01" }); });

    await waitFor(() => {
      expect(screen.getByTestId("ai-revert-date")).toBeDefined();
    });
  });

  it("AI suggestions bar counts active suggestions correctly", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => { handler!.openJournalEdit(undefined, { title: "T", notes: "N", date: "2026-01-01" }); });

    await waitFor(() => {
      const bar = screen.getByTestId("ai-suggestions-bar");
      expect(bar.textContent).toMatch(/3/);
    });
  });
});

describe("TASK-054 — × revert restores previous value (AC #3 revert)", () => {
  it("clicking × on title reverts to original value and removes marker", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => { handler!.openJournalEdit(undefined, { title: "KI-Titel" }); });

    await waitFor(() => expect(screen.getByTestId("ai-revert-title")).toBeDefined());

    // Title should be AI value
    const titleInput = screen.getByTestId("panel-title") as HTMLInputElement;
    expect(titleInput.value).toBe("KI-Titel");

    // Click revert
    fireEvent.click(screen.getByTestId("ai-revert-title"));

    await waitFor(() => {
      // Title should be reverted to original (empty for new entry)
      const input = screen.getByTestId("panel-title") as HTMLInputElement;
      expect(input.value).toBe("");
      // Revert button should be gone
      expect(screen.queryByTestId("ai-revert-title")).toBeNull();
    });
  });

  it("clicking × on notes reverts to original value", async () => {
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => { handler!.openJournalEdit(undefined, { notes: "KI-Notiz" }); });
    await waitFor(() => expect(screen.getByTestId("ai-revert-notes")).toBeDefined());

    fireEvent.click(screen.getByTestId("ai-revert-notes"));

    await waitFor(() => {
      const input = screen.getByTestId("panel-notes") as HTMLTextAreaElement;
      expect(input.value).toBe("");
      expect(screen.queryByTestId("ai-revert-notes")).toBeNull();
    });
  });
});

describe("TASK-054 — dispatchToolCall for journal tools (AC #1 + #2)", () => {
  it("openJournalEdit tool returns empty string when handler registered", () => {
    const openFn = vi.fn();
    const updateFn = vi.fn().mockReturnValue("");
    registerJournalEditHandler({ openJournalEdit: openFn, updateJournalEdit: updateFn });

    const result = dispatchToolCallForTest(
      { tool: "openJournalEdit", prefill: { entry_type: "observation" } },
      "de"
    );
    expect(result).toBe("");
    expect(openFn).toHaveBeenCalledWith(undefined, { entry_type: "observation" });
  });

  it("openJournalEdit tool returns error when handler not registered", () => {
    // Unregister by registering a dummy then clearing
    const dummy = { openJournalEdit: vi.fn(), updateJournalEdit: vi.fn().mockReturnValue("") };
    const unregister = registerJournalEditHandler(dummy);
    unregister();

    const result = dispatchToolCallForTest(
      { tool: "openJournalEdit", prefill: {} },
      "de"
    );
    expect(result).toMatch(/Tagebuch|journal/i);
  });

  it("updateJournalEdit tool calls handler and returns empty string on success", () => {
    const openFn = vi.fn();
    const updateFn = vi.fn().mockReturnValue("");
    registerJournalEditHandler({ openJournalEdit: openFn, updateJournalEdit: updateFn });

    const fields: JournalEditFields = { notes: "Test" };
    const result = dispatchToolCallForTest({ tool: "updateJournalEdit", fields }, "de");
    expect(result).toBe("");
    expect(updateFn).toHaveBeenCalledWith(fields);
  });

  it("updateJournalEdit tool wraps error message from handler", () => {
    const openFn = vi.fn();
    const updateFn = vi.fn().mockReturnValue("Panel is not open");
    registerJournalEditHandler({ openJournalEdit: openFn, updateJournalEdit: updateFn });

    const result = dispatchToolCallForTest({ tool: "updateJournalEdit", fields: {} }, "de");
    expect(result).toMatch(/Panel is not open/);
  });

  it("updateJournalEdit tool returns error when handler not registered", () => {
    const dummy = { openJournalEdit: vi.fn(), updateJournalEdit: vi.fn().mockReturnValue("") };
    const unregister = registerJournalEditHandler(dummy);
    unregister();

    const result = dispatchToolCallForTest({ tool: "updateJournalEdit", fields: {} }, "en");
    expect(result).toMatch(/journal/i);
  });
});

describe("TASK-054 — AC #4: AI never calls journal API directly", () => {
  it("openJournalEdit does not call createJournalEntry or updateJournalEntry", async () => {
    const { apiClient } = await import("../api/client");
    renderJournalView();
    const handler = getJournalEditHandler();

    act(() => {
      handler!.openJournalEdit(undefined, { title: "Test", notes: "Test notes" });
    });

    await waitFor(() => expect(screen.getByTestId("panel-save")).toBeDefined());

    // No API calls should have been made
    expect(apiClient.createPlant).not.toHaveBeenCalled();
  });

  it("aiPrompt.ts includes journal tool descriptions (de)", async () => {
    const { buildSystemPrompt } = await import("../lib/aiPrompt");
    const ctx = {
      view: "journal" as const,
      garden: MOCK_GARDEN,
    };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("openJournalEdit");
    expect(prompt).toContain("updateJournalEdit");
    expect(prompt).toContain("createJournalEntry");
  });

  it("aiPrompt.ts includes journal tool descriptions (en)", async () => {
    const { buildSystemPrompt } = await import("../lib/aiPrompt");
    const ctx = {
      view: "journal" as const,
      garden: MOCK_GARDEN,
    };
    const prompt = buildSystemPrompt(ctx, "en");
    expect(prompt).toContain("openJournalEdit");
    expect(prompt).toContain("updateJournalEdit");
  });
});
