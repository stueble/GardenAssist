/**
 * applyAiSuggestions — shared utility for AI-suggested field overlays.
 *
 * Generic over any record type T. Given the current form values and a partial
 * suggestion from the assistant, returns:
 *  - `nextForm`:    current form merged with non-null suggestions
 *  - `nextMarked`:  set of field keys that are now AI-suggested
 *  - `prevValues`:  previous values for those keys (needed for × revert)
 *
 * Usage:
 *   const { nextForm, nextMarked, prevValues } =
 *     applyAiSuggestions(form, suggestion);
 *   setForm(nextForm);
 *   setAiMarked(prev => ({ ...prev, ...nextMarked }));
 *   setAiPrev(prev => ({ ...prev, ...prevValues }));
 */
export function applyAiSuggestions<T extends Record<string, unknown>>(
  current: T,
  suggestion: Partial<T>,
): {
  nextForm:   T;
  nextMarked: Partial<Record<keyof T, true>>;
  prevValues: Partial<T>;
} {
  const nextForm   = { ...current };
  const nextMarked: Partial<Record<keyof T, true>> = {};
  const prevValues: Partial<T> = {};

  for (const key of Object.keys(suggestion) as (keyof T)[]) {
    const val = suggestion[key];
    // Only apply non-null/undefined suggestions
    if (val === null || val === undefined) continue;
    prevValues[key] = current[key] as T[keyof T];
    nextForm[key]   = val as T[keyof T];
    nextMarked[key] = true;
  }

  return { nextForm, nextMarked, prevValues };
}
