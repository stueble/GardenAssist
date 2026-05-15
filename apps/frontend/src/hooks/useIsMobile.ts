/**
 * useIsMobile — returns true when the viewport width is ≤ 768px.
 *
 * Uses matchMedia so the value updates reactively on resize without a
 * polling loop. The hook is stable across re-renders — the listener is
 * registered once on mount and torn down on unmount.
 */

import { useState, useEffect } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

// Set to `true` to force the mobile layout in any browser window size.
// Useful for desktop testing without resizing. Do not commit as `true`.
const FORCE_MOBILE = false;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => FORCE_MOBILE || window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    if (FORCE_MOBILE) return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
