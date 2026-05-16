/**
 * useAssistantSettings — fetches the Settings subset needed for the AI assistant.
 *
 * Returns only the fields relevant to the assistant (no API keys, provider, limits).
 * The result is stable across re-renders unless settings are changed by the user.
 */

import { useState, useEffect } from "react";
import { apiClient }           from "@/api/client";
import type { AssistantSettings } from "@api/assistant-context";

export function useAssistantSettings(): AssistantSettings | undefined {
  const [settings, setSettings] = useState<AssistantSettings | undefined>(undefined);

  useEffect(() => {
    apiClient.getSettings().then((s) => {
      setSettings({
        location_city:    s.location_city,
        location_zip:     s.location_zip,
        irrigation_zones: s.irrigation_zones,
        plant_categories: s.plant_categories,
        color_presets:    s.color_presets,
        gardener_profile: s.gardener_profile,
        soil_moisture_dry_threshold_pct: s.soil_moisture_dry_threshold_pct,
      });
    }).catch(() => {
      // Non-critical — assistant works without settings block
    });
  }, []);

  return settings;
}
