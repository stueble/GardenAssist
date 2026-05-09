/**
 * usePlantEditContext — global bridge between AiPanel and PlantEditDialog.
 *
 * A module-level singleton (same pattern as useAiPanelState).
 * PlantsView registers the handler; AiPanel dispatches the single tool call.
 *
 * Tool: editPlant(id, fields)
 *   id === null  → open in "new plant" mode, prefill with fields
 *   id === str   → load that plant, open in edit mode, overlay fields as AI suggestions
 *
 * In both cases the dialog is opened if it isn't already.
 * The user always confirms by clicking Save — no direct API writes.
 */

import { useEffect, useRef } from "react";

/**
 * One schedule suggestion from the AI.
 * action:
 *   "add"    — insert a new schedule row
 *   "remove" — soft-delete an existing row (matched by id)
 *   "update" — patch an existing row (matched by id)
 */
export type AiScheduleSuggestion = {
  action:         "add" | "remove" | "update";
  /** Required for remove/update — the schedule's server-side id. */
  id?:            string;
  schedule_type?: string;
  start_week?:    number;
  end_week?:      number;
  /** Hex color, e.g. "#c0392b". Omit to use the section default. */
  color?:         string | null;
  label?:         string | null;
  notes?:         string | null;
};

/**
 * All fields the AI can suggest via the editPlant tool.
 * Scalar fields mirror PlantInput (excluding positions/attachments).
 * schedules: optional array of add/remove/update operations.
 */
export type PlantEditFields = Partial<{
  icon:                  string;
  name_common:           string;
  name_botanical:        string;
  description:           string;
  category:              string;
  origin_type:           string;
  lifecycle:             string;
  location:              string;
  watering_zone:         string;
  purchase_date:         string;
  purchase_price:        string;
  sun_demand:            string;
  water_demand:          string;
  frost_tolerance_min_c: string;
  soil_type:             string;
  health_status:         string;
  temperature_protected: boolean;
  care_notes:            string;
  schedules:             AiScheduleSuggestion[];
}>;

/** The single handler registered by PlantsView. */
type PlantEditHandler = {
  /**
   * Open the plant edit dialog and apply AI field suggestions.
   * id === null  → new plant mode
   * id === str   → edit mode for that plant ID (looked up from garden data)
   */
  editPlant: (id: string | null, fields: PlantEditFields) => void;
};

// Module-level singleton
let _handler: PlantEditHandler | null = null;

/** Called by PlantsView to register the current handler. Returns an unregister fn. */
export function registerPlantEditHandler(h: PlantEditHandler): () => void {
  _handler = h;
  return () => { if (_handler === h) _handler = null; };
}

/** Called by AiPanel to dispatch tool calls. Returns null if PlantsView not mounted. */
export function getPlantEditHandler(): PlantEditHandler | null {
  return _handler;
}

/**
 * Hook for PlantsView — keeps the singleton always pointing to the latest handler.
 *
 * We store the latest handler in a ref so the singleton never goes stale,
 * then register a stable proxy function that delegates to the ref.
 * This avoids stale-closure bugs when the caller's callbacks change (e.g.
 * because `usePlantEditDialog` returns a new object on every render).
 */
export function usePlantEditHandler(handler: PlantEditHandler) {
  const handlerRef = useRef(handler);
  // Keep the ref current on every render — no stale closures.
  handlerRef.current = handler;

  useEffect(() => {
    // Register a stable proxy that always calls through the ref.
    return registerPlantEditHandler({
      editPlant: (id, fields) => handlerRef.current.editPlant(id, fields),
    });
    // Empty deps: register once, unregister on unmount. The proxy always
    // delegates to the latest handler via the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
