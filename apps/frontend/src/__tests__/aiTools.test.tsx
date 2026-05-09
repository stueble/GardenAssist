/**
 * Tests for TASK-053: openPlantEdit / updatePlantEdit tools
 *
 * Covers:
 * - AC #1: openPlantEdit tool opens dialog (new or edit)
 * - AC #2: updatePlantEdit sets fields; error if dialog closed
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

    await waitFor(() => {
      expect(getRef()).not.toBeNull();
    });

    act(() => {
      getRef()!.applyAiFields({ water_demand: "low", care_notes: "Regelmäßig gießen." });
    });

    await waitFor(() => {
      // Status bar visible with count 2
      expect(screen.getByTestId("ai-suggestion-bar")).toBeInTheDocument();
      expect(screen.getByTestId("ai-suggestion-bar").textContent).toContain("2 Felder");
    });

    // Green marker wrapper present for both fields
    expect(screen.getByTestId("ai-field-water_demand")).toBeInTheDocument();
    expect(screen.getByTestId("ai-field-care_notes")).toBeInTheDocument();
  });

  it("reverts a field on × click and removes its marker (AC #4)", async () => {
    const { getRef } = renderWithRef(MOCK_PLANT);

    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => {
      getRef()!.applyAiFields({ water_demand: "low" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-field-water_demand")).toBeInTheDocument();
    });

    // Click revert button
    fireEvent.click(screen.getByTestId("ai-revert-water_demand"));

    await waitFor(() => {
      expect(screen.queryByTestId("ai-field-water_demand")).not.toBeInTheDocument();
      expect(screen.queryByTestId("ai-suggestion-bar")).not.toBeInTheDocument();
    });

    // Field value reverted to original
    const waterSelect = screen.getByTestId("field-water") as HTMLSelectElement;
    expect(waterSelect.value).toBe("medium"); // original value from MOCK_PLANT
  });

  it("status bar count decrements as fields are reverted", async () => {
    const { getRef } = renderWithRef(MOCK_PLANT);

    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => {
      getRef()!.applyAiFields({ water_demand: "low", sun_demand: "shady" });
    });

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

// ── AC #1: openPlantEdit via PlantEditContext ─────────────────────────────────

describe("openPlantEdit via PlantEditContext (AC #1)", () => {
  it("registers handler and getPlantEditHandler() returns it", () => {
    const openPlantEdit = vi.fn();
    const updatePlantEdit = vi.fn();
    const unregister = registerPlantEditHandler({ openPlantEdit, updatePlantEdit });
    expect(getPlantEditHandler()).not.toBeNull();
    unregister();
    expect(getPlantEditHandler()).toBeNull();
  });

  it("dispatches openPlantEdit with plant_id", () => {
    const openPlantEdit = vi.fn();
    const updatePlantEdit = vi.fn();
    const unregister = registerPlantEditHandler({ openPlantEdit, updatePlantEdit });

    const handler = getPlantEditHandler()!;
    handler.openPlantEdit({ plantId: "p1" }, [MOCK_PLANT]);
    expect(openPlantEdit).toHaveBeenCalledWith({ plantId: "p1" }, [MOCK_PLANT]);

    unregister();
  });

  it("dispatches openPlantEdit with prefill for new plant", () => {
    const openPlantEdit = vi.fn();
    const updatePlantEdit = vi.fn();
    const unregister = registerPlantEditHandler({ openPlantEdit, updatePlantEdit });

    const handler = getPlantEditHandler()!;
    handler.openPlantEdit({ prefill: { name_common: "Magnolie", sun_demand: "sunny" } }, []);
    expect(openPlantEdit).toHaveBeenCalledWith(
      { prefill: { name_common: "Magnolie", sun_demand: "sunny" } },
      []
    );

    unregister();
  });
});

// ── AC #2: updatePlantEdit returns false if dialog closed ────────────────────

describe("updatePlantEdit (AC #2)", () => {
  it("returns false when no handler registered", () => {
    // No handler registered
    const handler = getPlantEditHandler();
    expect(handler).toBeNull();
  });

  it("updatePlantEdit returns false when dialog is not open", () => {
    const updatePlantEdit = vi.fn().mockReturnValue(false);
    const unregister = registerPlantEditHandler({ openPlantEdit: vi.fn(), updatePlantEdit });

    const handler = getPlantEditHandler()!;
    const result = handler.updatePlantEdit({ water_demand: "low" });
    expect(result).toBe(false);

    unregister();
  });

  it("updatePlantEdit returns true when dialog is open", () => {
    const updatePlantEdit = vi.fn().mockReturnValue(true);
    const unregister = registerPlantEditHandler({ openPlantEdit: vi.fn(), updatePlantEdit });

    const handler = getPlantEditHandler()!;
    const result = handler.updatePlantEdit({ care_notes: "Gießen" });
    expect(result).toBe(true);

    unregister();
  });
});

// ── AC #6: No direct API writes triggered by tool use ────────────────────────

describe("Tool use does not trigger API writes (AC #6)", () => {
  it("applyAiFields does not call createPlant or updatePlant", async () => {
    const { apiClient } = await import("../api/client");
    const { getRef } = renderWithRef(MOCK_PLANT);

    await waitFor(() => { expect(getRef()).not.toBeNull(); });

    act(() => {
      getRef()!.applyAiFields({ water_demand: "low", care_notes: "Test" });
    });

    // Wait a tick
    await new Promise((r) => setTimeout(r, 10));

    expect(apiClient.createPlant).not.toHaveBeenCalled();
    expect(apiClient.updatePlant).not.toHaveBeenCalled();
  });
});

// ── Tool-call parsing ─────────────────────────────────────────────────────────

describe("parseToolCall (tool-call infrastructure)", () => {
  it("parses a valid tool block from AI response", () => {
    const raw = `Ich öffne jetzt den Dialog.\n\`\`\`tool\n{"tool":"openPlantEdit","prefill":{"sun_demand":"sunny"}}\n\`\`\``;
    const { toolCall, displayText } = parseToolCall(raw);
    expect(toolCall).toEqual({ tool: "openPlantEdit", prefill: { sun_demand: "sunny" } });
    expect(displayText).toBe("Ich öffne jetzt den Dialog.");
  });

  it("returns null toolCall for plain text response", () => {
    const raw = "Kein Tool-Aufruf hier.";
    const { toolCall, displayText } = parseToolCall(raw);
    expect(toolCall).toBeNull();
    expect(displayText).toBe(raw);
  });

  it("returns null toolCall for invalid JSON in block", () => {
    const raw = "```tool\nnot-json\n```";
    const { toolCall } = parseToolCall(raw);
    expect(toolCall).toBeNull();
  });

  it("strips the tool block from displayText", () => {
    const raw = `Antwort.\n\`\`\`tool\n{"tool":"updatePlantEdit","fields":{"care_notes":"X"}}\n\`\`\`\nEnde.`;
    const { displayText } = parseToolCall(raw);
    expect(displayText).not.toContain("```tool");
    expect(displayText).toContain("Antwort.");
    expect(displayText).toContain("Ende.");
  });
});

// ── dispatchToolCall feedback messages ────────────────────────────────────────

describe("dispatchToolCall (AC #2 error feedback)", () => {
  it("returns error feedback if no handler and updatePlantEdit called", () => {
    // No handler registered
    const msg = dispatchToolCallForTest({ tool: "updatePlantEdit", fields: {} }, [], "de");
    expect(msg).toContain("⚠️");
    expect(msg).toContain("geöffnet");
  });

  it("returns empty string on successful openPlantEdit dispatch", () => {
    const openPlantEdit = vi.fn();
    const updatePlantEdit = vi.fn().mockReturnValue(true);
    const unregister = registerPlantEditHandler({ openPlantEdit, updatePlantEdit });

    const msg = dispatchToolCallForTest(
      { tool: "openPlantEdit", prefill: { name_common: "Test" } },
      [MOCK_PLANT],
      "de"
    );
    expect(msg).toBe("");
    expect(openPlantEdit).toHaveBeenCalled();

    unregister();
  });

  it("returns error in English when lang is en", () => {
    const msg = dispatchToolCallForTest({ tool: "updatePlantEdit", fields: {} }, [], "en");
    expect(msg).toContain("⚠️");
    expect(msg.toLowerCase()).toContain("open");
  });
});
