/**
 * useGardenPlan — manages garden plan image state with deferred upload.
 *
 * Upload and remove are staged locally first; the actual API calls happen
 * only when save() is called. This allows the Settings SaveBar to reflect
 * unsaved plan changes alongside other settings changes.
 *
 * - Fetches plan_url and plan_name from getGarden() on mount
 * - selectFile(file)  — stages a file for upload (no API call yet)
 * - markRemove()      — stages the plan for removal (no API call yet)
 * - save()            — applies the staged change via API
 * - discard()         — reverts to the last saved state
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/api/client";

export type PlanPendingAction =
  | { type: "upload"; file: File }
  | { type: "remove" }
  | null;

export interface GardenPlanState {
  /** Currently active plan URL (saved or from last successful save) */
  savedPlanUrl:    string | null;
  savedPlanName:   string | null;
  /** Staged, not-yet-saved action */
  pending:         PlanPendingAction;
  /** True if there is a staged change not yet saved */
  dirty:           boolean;
  saving:          boolean;
  loading:         boolean;
  error:           string | null;
  selectFile:      (file: File) => void;
  markRemove:      () => void;
  save:            () => Promise<void>;
  discard:         () => void;
}

export function useGardenPlan(): GardenPlanState {
  const [savedPlanUrl,  setSavedPlanUrl]  = useState<string | null>(null);
  const [savedPlanName, setSavedPlanName] = useState<string | null>(null);
  const [pending,       setPending]       = useState<PlanPendingAction>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.getGarden().then((garden) => {
      if (!cancelled) {
        setSavedPlanUrl(garden.plan_url);
        setSavedPlanName(garden.plan_name);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
        setError("Gartenplan konnte nicht geladen werden.");
      }
    });
    return () => { cancelled = true; };
  }, []);

  const selectFile = useCallback((file: File) => {
    setError(null);
    setPending({ type: "upload", file });
  }, []);

  const markRemove = useCallback(() => {
    setError(null);
    // If there's a staged upload, simply cancel it
    if (pending?.type === "upload") {
      setPending(null);
      return;
    }
    // Otherwise stage a removal of the saved plan
    if (savedPlanUrl) {
      setPending({ type: "remove" });
    }
  }, [pending, savedPlanUrl]);

  const save = useCallback(async () => {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      if (pending.type === "upload") {
        const garden = await apiClient.uploadGardenPlan(pending.file);
        setSavedPlanUrl(garden.plan_url);
        setSavedPlanName(garden.plan_name);
      } else {
        await apiClient.deleteGardenPlan();
        setSavedPlanUrl(null);
        setSavedPlanName(null);
      }
      setPending(null);
    } catch {
      setError(
        pending.type === "upload"
          ? "Upload fehlgeschlagen. Bitte versuche es erneut."
          : "Löschen fehlgeschlagen. Bitte versuche es erneut."
      );
    } finally {
      setSaving(false);
    }
  }, [pending]);

  const discard = useCallback(() => {
    setPending(null);
    setError(null);
  }, []);

  return {
    savedPlanUrl,
    savedPlanName,
    pending,
    dirty:   pending !== null,
    saving,
    loading,
    error,
    selectFile,
    markRemove,
    save,
    discard,
  };
}
