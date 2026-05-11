/**
 * useJournalEditContext — global bridge between AiPanel and the EntryPanel in JournalView.
 *
 * Same singleton pattern as usePlantEditContext.
 * JournalView registers the handler; AiPanel dispatches openJournalEdit / updateJournalEdit.
 *
 * Tools:
 *   openJournalEdit(prefill?)  — opens the entry panel, optionally prefilled
 *   updateJournalEdit(fields)  — sets fields in the currently open entry panel;
 *                                returns an error string if the panel is not open
 */

import { useEffect, useRef } from "react";
import type { JournalEntryType } from "@api/journal-entry";

/** Fields the AI can prefill or update in the journal entry panel. */
export type JournalEditFields = Partial<{
  entry_type: JournalEntryType;
  plant_id:   string;
  date:       string;
  title:      string;
  notes:      string;
}>;

type JournalEditHandler = {
  /**
   * Opens the journal entry panel.
   * entry_id === undefined  → new entry (null panel state)
   * entry_id === string     → edit mode for that entry
   * prefill                 → optional fields to apply as AI suggestions after opening
   */
  openJournalEdit: (entry_id: string | undefined, prefill: JournalEditFields) => void;

  /**
   * Applies AI field suggestions to the currently open entry panel.
   * Returns an error message string if the panel is not open, or "" on success.
   */
  updateJournalEdit: (fields: JournalEditFields) => string;
};

// Module-level singleton
let _handler: JournalEditHandler | null = null;

/** Called by JournalView to register the current handler. Returns an unregister fn. */
export function registerJournalEditHandler(h: JournalEditHandler): () => void {
  _handler = h;
  return () => { if (_handler === h) _handler = null; };
}

/** Called by AiPanel to dispatch tool calls. Returns null if JournalView not mounted. */
export function getJournalEditHandler(): JournalEditHandler | null {
  return _handler;
}

/**
 * Hook for JournalView — keeps the singleton always pointing to the latest handler.
 * Same stale-closure-safe ref pattern as usePlantEditHandler.
 */
export function useJournalEditHandler(handler: JournalEditHandler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return registerJournalEditHandler({
      openJournalEdit:   (id, fields) => handlerRef.current.openJournalEdit(id, fields),
      updateJournalEdit: (fields)     => handlerRef.current.updateJournalEdit(fields),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
