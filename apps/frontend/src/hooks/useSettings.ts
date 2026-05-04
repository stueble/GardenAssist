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
  updateForm:  (patch: Partial<Settings>) => void;
  save:        () => Promise<void>;
  discard:     () => void;
}

export function useSettings(): UseSettingsResult {
  const [saved,   setSaved]   = useState<Settings | null>(null);
  const [form,    setForm]    = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState<SettingsSaveStatus>("idle");

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    apiClient.getSettings().then((s) => {
      if (!cancelled) {
        setSaved(s);
        setForm(s);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
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
    updateForm,
    save,
    discard,
  };
}
