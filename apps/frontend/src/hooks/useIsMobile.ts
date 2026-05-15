/**
 * useIsMobile — returns true when the viewport width is ≤ 768px.
 *
 * Uses matchMedia so the value updates reactively on resize without a
 * polling loop. The hook is stable across re-renders — the listener is
 * registered once on mount and torn down on unmount.
 */

import { useState, useEffect } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
