/**
 * useGardenPlan — manages garden plan image state.
 *
 * - Fetches plan_url and plan_name from getGarden() on mount
 * - upload(file) calls uploadGardenPlan() and updates local state
 * - remove() calls deleteGardenPlan() and clears local state
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/api/client";

export interface GardenPlanState {
  planUrl:    string | null;
  planName:   string | null;
  uploading:  boolean;
  removing:   boolean;
  loading:    boolean;
  error:      string | null;
  upload:     (file: File) => Promise<void>;
  remove:     () => Promise<void>;
}

export function useGardenPlan(): GardenPlanState {
  const [planUrl,   setPlanUrl]   = useState<string | null>(null);
  const [planName,  setPlanName]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removing,  setRemoving]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.getGarden().then((garden) => {
      if (!cancelled) {
        setPlanUrl(garden.plan_url);
        setPlanName(garden.plan_name);
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

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const garden = await apiClient.uploadGardenPlan(file);
      setPlanUrl(garden.plan_url);
      setPlanName(garden.plan_name);
    } catch {
      setError("Upload fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setUploading(false);
    }
  }, []);

  const remove = useCallback(async () => {
    setRemoving(true);
    setError(null);
    try {
      await apiClient.deleteGardenPlan();
      setPlanUrl(null);
      setPlanName(null);
    } catch {
      setError("Löschen fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setRemoving(false);
    }
  }, []);

  return {
    planUrl,
    planName,
    uploading,
    removing,
    loading,
    error,
    upload,
    remove,
  };
}
