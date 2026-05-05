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
 *
 * previewUrl is the URL to display in the thumbnail:
 * - While a file is staged: a blob: URL created from the File object
 * - After save / on load:   the server URL (/static/garden/plan.xxx)
 * - No plan:                null
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/api/client";

export type PlanPendingAction =
  | { type: "upload"; file: File }
  | { type: "remove" }
  | null;

export interface GardenPlanState {
  /** URL to show in the thumbnail (blob: while staged, server URL after save) */
  previewUrl:    string | null;
  /** Display name (original filename or server-side plan_name) */
  previewName:   string | null;
  /** Staged, not-yet-saved action */
  pending:       PlanPendingAction;
  /** True if there is a staged change not yet saved */
  dirty:         boolean;
  saving:        boolean;
  loading:       boolean;
  error:         string | null;
  selectFile:    (file: File) => void;
  markRemove:    () => void;
  save:          () => Promise<void>;
  discard:       () => void;
}

export function useGardenPlan(): GardenPlanState {
  // Saved state (from server)
  const [savedPlanUrl,  setSavedPlanUrl]  = useState<string | null>(null);
  const [savedPlanName, setSavedPlanName] = useState<string | null>(null);

  // Staged state
  const [pending,  setPending]  = useState<PlanPendingAction>(null);

  // Blob URL for the staged file — managed here to control lifetime
  const [blobUrl,  setBlobUrl]  = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Revoke the blob URL when the component unmounts
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Load saved plan on mount
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

  function revokeBlobUrl() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setBlobUrl(null);
  }

  const selectFile = useCallback((file: File) => {
    setError(null);
    // Revoke any previous blob URL before creating a new one
    revokeBlobUrl();
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setBlobUrl(url);
    setPending({ type: "upload", file });
  }, []);

  const markRemove = useCallback((currentPending: PlanPendingAction, currentSavedUrl: string | null) => {
    setError(null);
    if (currentPending?.type === "upload") {
      // Cancel staged upload
      revokeBlobUrl();
      setPending(null);
      return;
    }
    if (currentSavedUrl) {
      setPending({ type: "remove" });
    }
  }, []);

  const save = useCallback(async (currentPending: PlanPendingAction) => {
    if (!currentPending) return;
    setSaving(true);
    setError(null);
    try {
      if (currentPending.type === "upload") {
        const garden = await apiClient.uploadGardenPlan(currentPending.file);
        setSavedPlanUrl(garden.plan_url);
        setSavedPlanName(garden.plan_name ?? currentPending.file.name);
        // Keep the blob URL alive as preview — revoke happens on unmount or next selectFile
      } else {
        await apiClient.deleteGardenPlan();
        setSavedPlanUrl(null);
        setSavedPlanName(null);
        revokeBlobUrl();
      }
      setPending(null);
    } catch {
      setError(
        currentPending.type === "upload"
          ? "Upload fehlgeschlagen. Bitte versuche es erneut."
          : "Löschen fehlgeschlagen. Bitte versuche es erneut."
      );
    } finally {
      setSaving(false);
    }
  }, []);

  const discard = useCallback(() => {
    revokeBlobUrl();
    setPending(null);
    setError(null);
  }, []);

  // Derive display values
  const previewUrl  = blobUrl ?? savedPlanUrl;
  const previewName = pending?.type === "upload"
    ? pending.file.name
    : savedPlanName ?? savedPlanUrl?.split("/").pop() ?? null;

  return {
    previewUrl,
    previewName,
    pending,
    dirty:   pending !== null,
    saving,
    loading,
    error,
    selectFile,
    // Wrap with current state to avoid stale closures in the component
    markRemove: () => markRemove(pending, savedPlanUrl),
    save:       () => save(pending),
    discard,
  };
}
