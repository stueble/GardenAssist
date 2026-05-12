/**
 * useSettings — loads settings from the API and manages local form state.
 *
 * - Fetches getSettings() on mount
 * - Tracks dirty state (local form differs from saved)
 * - save() calls updateSettings() and syncs saved state
 * - discard() resets local form to last saved state
 */

import { useState, useEffect, useCallback } from "react";
import type { Settings } from "@api/settings";
import { apiClient } from "@/api/client";

export type SettingsSaveStatus = "idle" | "saving" | "success" | "error";

export interface UseSettingsResult {
  settings:    Settings | null;
  form:        Settings | null;
  dirty:       boolean;
  status:      SettingsSaveStatus;
  loading:     boolean;
  error:       boolean;
  updateForm:  (patch: Partial<Settings>) => void;
  save:        () => Promise<void>;
  discard:     () => void;
}

const DEFAULT_SETTINGS: Settings = {
  language:                 "en",
  location_city:            null,
  location_zip:             null,
  irrigation_zones:         [],
  plant_categories:         [],
  color_presets:            [],
  task_lookback_weeks:      8,
  task_lookahead_weeks:     4,
  attachment_size_limit_mb: 10,
  ai_provider:              null,
  ai_model:                 null,
  ai_api_key:               null,
  gardener_profile:         null,
};

export function useSettings(): UseSettingsResult {
  const [saved,   setSaved]   = useState<Settings | null>(null);
  const [form,    setForm]    = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState<SettingsSaveStatus>("idle");
  const [error,   setError]   = useState(false);

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    apiClient.getSettings().then((s) => {
      if (!cancelled) {
        // Both saved and form start from the DB value.
        // The language dropdown shows the DB-stored language.
        // Changing it marks the form dirty; saving writes it to DB and
        // then SettingsView applies it to i18n/localStorage.
        setSaved(s);
        setForm(s);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        // Show defaults so the form is usable even if backend is unreachable
        setSaved(DEFAULT_SETTINGS);
        setForm(DEFAULT_SETTINGS);
        setError(true);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const dirty = saved !== null && form !== null && JSON.stringify(form) !== JSON.stringify(saved);

  const updateForm = useCallback((patch: Partial<Settings>) => {
    setForm((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  const save = useCallback(async () => {
    if (!form) return;
    setStatus("saving");
    try {
      const updated = await apiClient.updateSettings(form);
      setSaved(updated);
      setForm(updated);
      setStatus("success");
      // Clear success indicator after 2s
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [form]);

  const discard = useCallback(() => {
    setForm(saved);
    setStatus("idle");
  }, [saved]);

  return {
    settings: saved,
    form,
    dirty,
    status,
    loading,
    error,
    updateForm,
    save,
    discard,
  };
}
