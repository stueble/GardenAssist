/**
 * useAssistantContext — shared AssistantContext state across all views.
 *
 * Module-level singleton (same pattern as useAiPanelState).
 * Each view calls setAssistantContext() when its context changes and
 * clears it on unmount. App.tsx reads the current context and forwards
 * it to the single AiPanel instance.
 *
 * This allows AiPanel to stay mounted in App.tsx and retain its messages
 * state across view navigation.
 */

import { useState, useEffect } from "react";
import type { AssistantContext } from "@api/assistant-context";

// Module-level state — persists across view unmounts/mounts
let _ctx: AssistantContext | undefined = undefined;
const _listeners = new Set<(ctx: AssistantContext | undefined) => void>();

function setGlobalContext(ctx: AssistantContext | undefined) {
  _ctx = ctx;
  // Defer listener notifications to avoid "Cannot update a component while
  // rendering a different component" — views call setAssistantContext() from
  // useEffect (after render), but React may still be committing the tree.
  // queueMicrotask ensures the state update runs after the current commit.
  queueMicrotask(() => {
    _listeners.forEach((fn) => fn(ctx));
  });
}

/** Called by each view to report its current AssistantContext. */
export function setAssistantContext(ctx: AssistantContext | undefined): void {
  setGlobalContext(ctx);
}

/** Reset to undefined — used in tests to prevent state bleeding between test cases. */
export function resetAssistantContext(): void {
  setGlobalContext(undefined);
}

/** Hook for App.tsx — subscribes to context changes from the active view. */
export function useAssistantContext(): AssistantContext | undefined {
  const [ctx, setCtx] = useState<AssistantContext | undefined>(_ctx);

  useEffect(() => {
    _listeners.add(setCtx);
    return () => { _listeners.delete(setCtx); };
  }, []);

  return ctx;
}
