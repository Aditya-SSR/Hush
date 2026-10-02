"use client";

import { useEffect, useState } from "react";
import { MOBILE_BREAKPOINT } from "@/lib/stops";

/**
 * Picks the art direction for the current viewport.
 *
 * Returns `null` on the server and during the first client render, then settles
 * on "mobile" or "desktop". The null is deliberate: the film's scroll length,
 * beat count and product poses all differ between the two, so committing to one
 * set on the server and switching after hydration would rebuild the timeline
 * mid-scroll. Callers hold off rendering until this resolves, behind the
 * loading curtain the viewer is already looking at.
 */
export default function useArtDirection() {
  const [mode, setMode] = useState(null);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    const sync = () => setMode(query.matches ? "mobile" : "desktop");

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return mode;
}