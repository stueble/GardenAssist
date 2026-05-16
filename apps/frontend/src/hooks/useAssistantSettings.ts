/**
 * useAssistantSettings — fetches the Settings subset needed for the AI assistant.
 *
 * Uses a module-level singleton so all consumers share the same cached value
 * and a single network request. Call invalidateAssistantSettings() after saving
 * settings (e.g. from SettingsView) to force an immediate re-fetch and push
 * the fresh values to all mounted consumers.
 *
 * Returns only the fields relevant to the assistant (no API keys, provider, limits).
 */

import { useState, useEffect } from "react";
import { apiClient }           from "@/api/client";
import type { AssistantSettings } from "@api/assistant-context";

// ── Singleton ─────────────────────────────────────────────────────────────────

let _settings: AssistantSettings | undefined = undefined;
let _fetching  = false;
const _listeners = new Set<(s: AssistantSettings | undefined) => void>();

function applySettings(s: AssistantSettings | undefined) {
  _settings = s;
  _listeners.forEach((fn) => fn(s));
}

function fetchSettings() {
  if (_fetching) return;
  _fetching = true;
  apiClient.getSettings()
    .then((s) => {
      _fetching = false;
      applySettings({
        location_city:    s.location_city,
        location_zip:     s.location_zip,
        irrigation_zones: s.irrigation_zones,
        plant_categories: s.plant_categories,
        color_presets:    s.color_presets,
        gardener_profile: s.gardener_profile,
        soil_moisture_dry_threshold_pct: s.soil_moisture_dry_threshold_pct,
      });
    })
    .catch(() => {
      _fetching = false;
      // Non-critical — assistant works without settings block
    });
}

/**
 * Force a re-fetch of assistant settings and push fresh values to all consumers.
 * Call this after saving settings so that soil moisture warnings and zone lists
 * update immediately without requiring a page reload.
 */
export function invalidateAssistantSettings() {
  applySettings(undefined);
  fetchSettings();
}

/**
 * Reset the singleton completely — for use in tests to ensure a clean slate
 * between test cases (prevents stale cached values leaking across tests).
 */
export function resetAssistantSettings() {
  _settings = undefined;
  _fetching  = false;
  _listeners.clear();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAssistantSettings(): AssistantSettings | undefined {
  const [settings, setSettings] = useState<AssistantSettings | undefined>(_settings);

  useEffect(() => {
    _listeners.add(setSettings);
    // Fetch on first mount if not yet loaded
    if (_settings === undefined) fetchSettings();
    return () => { _listeners.delete(setSettings); };
  }, []);

  return settings;
}
