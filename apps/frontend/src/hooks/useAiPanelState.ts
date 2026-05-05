/**
 * useAiPanelState — shared open/close state for the AI assistant panel.
 *
 * Stored at module level so all AiPanel instances across views share the
 * same value. When the user opens the panel in Settings and navigates to
 * Dashboard, the panel stays open (and vice versa).
 *
 * Uses a simple pub/sub pattern with React state hooks so all mounted
 * AiPanel instances re-render when the state changes.
 */

import { useState, useEffect } from "react";

// Module-level state — persists across view unmounts/mounts
let _open = false;
const _listeners = new Set<(open: boolean) => void>();

function setGlobalOpen(open: boolean) {
  _open = open;
  _listeners.forEach((fn) => fn(open));
}

/** Reset to closed — used in tests to prevent state bleeding between test cases. */
export function resetAiPanelState() {
  setGlobalOpen(false);
}

export function useAiPanelState() {
  const [open, setOpen] = useState(_open);

  useEffect(() => {
    _listeners.add(setOpen);
    return () => { _listeners.delete(setOpen); };
  }, []);

  return {
    open,
    setOpen: setGlobalOpen,
  };
}
