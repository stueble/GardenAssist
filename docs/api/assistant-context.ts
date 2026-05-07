import type { Garden } from "./garden";
import type { Plant }  from "./plant";

/**
 * Context passed from each view to AiPanel so the assistant can build
 * a relevant, situation-aware system prompt.
 *
 * - view:          which view the user is currently on
 * - selectedPlant: the plant the user has open/selected (optional)
 * - garden:        full garden data — serialized and stripped before sending
 */
export type AssistantView =
  | "dashboard"
  | "plants"
  | "calendar"
  | "journal"
  | "settings";

export type AssistantContext = {
  view:           AssistantView;
  selectedPlant?: Plant;
  garden:         Garden;
};
