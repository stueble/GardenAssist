/**
 * useGarden — singleton garden state for App.tsx.
 *
 * Loads garden data once on app start and exposes an invalidate function
 * that any view can call after a mutation to trigger a fresh fetch.
 *
 * Pattern mirrors useAssistantContext: module-level singleton state +
 * listener set so App.tsx re-renders when data changes.
 *
 * Public API:
 *   useGarden()           — React hook for App.tsx; triggers initial fetch
 *   invalidateGarden()    — call after any mutation (save, delete, import…)
 *   getGardenSnapshot()   — synchronous read without subscribing (for hooks)
 */

import { useState, useEffect } from "react";
import { apiClient }           from "@/api/client";
import type { Garden }         from "@api/garden";

// ── Singleton state ───────────────────────────────────────────────────────────

type GardenState = {
  garden:  Garden | null;
  loading: boolean;
};

let _state: GardenState = { garden: null, loading: true };
let _listeners: Set<(s: GardenState) => void> = new Set();

function setState(next: GardenState) {
  _state = next;
  _listeners.forEach((l) => l(next));
}

// ── Internal fetch ────────────────────────────────────────────────────────────

let _fetchPromise: Promise<void> | null = null;

function fetchGarden(): Promise<void> {
  // Deduplicate concurrent calls
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = apiClient
    .getGarden()
    .then((g) => {
      setState({ garden: g, loading: false });
    })
    .catch(() => {
      setState({ garden: null, loading: false });
    })
    .finally(() => {
      _fetchPromise = null;
    });

  return _fetchPromise;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Trigger a fresh getGarden() call.
 * Call this after any mutation: save plant, delete plant, import, delete-all.
 */
export function invalidateGarden(): void {
  setState({ ..._state, loading: true });
  void fetchGarden();
}

/**
 * Read the current garden snapshot without subscribing.
 * Useful in effects or callbacks that don't need reactivity.
 */
export function getGardenSnapshot(): Garden | null {
  return _state.garden;
}

/**
 * React hook for App.tsx.
 * Subscribes to garden state changes and triggers the initial fetch.
 * Should be called exactly once (in App.tsx).
 */
export function useGarden(): GardenState {
  const [state, setLocalState] = useState<GardenState>(_state);

  useEffect(() => {
    // Subscribe
    _listeners.add(setLocalState);

    // Kick off initial fetch if not already started
    if (_state.loading && !_fetchPromise) {
      void fetchGarden();
    }

    return () => {
      _listeners.delete(setLocalState);
    };
  }, []);

  return state;
}

/**
 * Exported for tests — resets all singleton state so tests are isolated.
 */
export function _resetGardenForTest(): void {
  _state        = { garden: null, loading: true };
  _listeners    = new Set();
  _fetchPromise = null;
}
