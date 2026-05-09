/**
 * usePlantEditContext — global bridge between AiPanel and PlantEditDialog.
 *
 * A module-level pub/sub singleton (same pattern as useAiPanelState).
 * PlantsView registers handlers; AiPanel dispatches tool calls.
 *
 * Handlers:
 *   openPlantEdit(plantId?, prefill?) — open dialog (edit or new with prefill)
 *   updatePlantEdit(fields)           — push AI suggestions into open dialog
 *
 * Returns null if no handler is registered (dialog not mounted).
 */

import { useEffect } from "react";
import type { Plant } from "@api/plant";

// Partial form fields the AI can suggest
export type PlantEditFields = {
  icon?:                  string;
  name_common?:           string;
  name_botanical?:        string;
  description?:           string;
  category?:              string;
  origin_type?:           string;
  lifecycle?:             string;
  location?:              string;
  watering_zone?:         string;
  purchase_date?:         string;
  purchase_price?:        string;
  sun_demand?:            string;
  water_demand?:          string;
  frost_tolerance_min_c?: string;
  soil_type?:             string;
  health_status?:         string;
  care_notes?:            string;
};

export type OpenPlantEditArgs = {
  plantId?: string;
  prefill?: PlantEditFields;
};

type PlantEditHandler = {
  openPlantEdit:   (args: OpenPlantEditArgs, plants: Plant[]) => void;
  updatePlantEdit: (fields: PlantEditFields) => boolean; // returns false if dialog closed
};

// Module-level singleton
let _handler: PlantEditHandler | null = null;

/** Called by PlantsView to register the current handler. */
export function registerPlantEditHandler(h: PlantEditHandler): () => void {
  _handler = h;
  return () => { if (_handler === h) _handler = null; };
}

/** Called by AiPanel to dispatch tool calls. Returns null if not mounted. */
export function getPlantEditHandler(): PlantEditHandler | null {
  return _handler;
}

/**
 * Hook for PlantsView — registers the handler on mount, unregisters on unmount.
 */
export function usePlantEditHandler(handler: PlantEditHandler) {
  useEffect(() => {
    return registerPlantEditHandler(handler);
  // We intentionally capture the handler reference once — callers must
  // use stable references (useCallback) or re-register explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
