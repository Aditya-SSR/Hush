"use client";

import { useEffect, useRef } from "react";
import { rig } from "@/lib/rig";

/**
 * Lets the viewer turn the product by hand on the closing beat.
 *
 * A shopper reaching the buy page wants to inspect what they are buying, so the
 * product becomes draggable there. Rules that keep it from feeling bolted onto
 * a directed film:
 *
 *  1. It only arms on the buy beat. Everywhere else the scroll timeline owns the
 *     pose completely.
 *  2. It is an *additive* offset over the film's rotation, always decaying back
 *     to zero, so release returns the product to exactly the pose the timeline
 *     authored. There is no second resting state to keep in sync.
 *  3. Pitch is clamped, so a drag can never flip the product over.
 *
 * Touch is handled explicitly rather than inherited: the page runs a smooth
 * scroller, so a default touch drag on the canvas would scroll the film instead
 * of turning the product. `touch-action: none` is what claims the gesture.
 */
export default function ProductOrbit({ enabled }) {
  const active = useRef(false);
  const pointerId = useRef(null);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "development") window.__hushRig = rig;
  }, []);

  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const fine = window.matchMedia("(hover: hover)").matches;

    const gain = () => {
      // Scale with viewport so the gesture feels the same on a phone as on a
      // desktop, rather than becoming a full spin on a small screen.
      const scale = Math.min(
        1.6,
        Math.max(0.55, 900 / window.innerWidth),
      );
      return 0.0075 * scale;
    };

    /**
     * Ignore gestures that begin on the copy layer. The BuyButton sits directly
     * over the canvas on this beat; without this a drag that happens to start on
     * the button would spin the product while the user is trying to click it.
     */
    const onUI = (e) => !!(e.target instanceof Element && e.target.closest("[data-copy]"));

    const applyMove = (e) => {
      if (!active.current || e.pointerId !== pointerId.current) return;

      const now = performance.now();
      // Elapsed time is needed to convert a pointer delta into an angular
      // velocity, so a fast flick coasts further than a slow drag of the same
      // pixel distance.
      const dt = Math.max(1, now - last.current.t) / 1000;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY, t: now };

      const k = gain();

      rig.orbitTargetY += dx * k;
      rig.orbitTargetX = Math.max(
        -0.55,
        Math.min(0.55, rig.orbitTargetX + dy * k * 0.6),
      );

      // Smooth the velocity estimate so one jittery sample cannot launch the
      // product. Weighting recent samples higher tracks a flick better than a
      // plain running average.
      const instant = (dx * k) / dt;
      rig.orbitVel = rig.orbitVel * 0.45 + instant * 0.55;
    };

    const release = (e) => {
      if (!active.current) return;
      if (e && e.pointerId !== undefined && e.pointerId !== pointerId.current) return;

      active.current = false;
      pointerId.current = null;
      rig.grab = 0;
      // Momentum is retained: `orbitVel` is already seeded from the last move,
      // and the render loop coasts on it from here.
      canvas.style.cursor = fine && enabled ? "grab" : "";
    };

    const down = (e) => {
      if (!enabled || active.current || onUI(e)) return;
      // Primary button / single touch only, so a right-click never spins it.
      if (e.pointerType === "mouse" && e.button !== 0) return;

      active.current = true;
      pointerId.current = e.pointerId;
      last.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      rig.grab = 1;
      // A new gesture starts from rest, so a previous flick's momentum cannot
      // leak into the next drag.
      rig.orbitVel = 0;
      canvas.style.cursor = "grabbing";

      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* best effort */
      }
    };

    canvas.addEventListener("pointerdown", down);

    // Move/up on the window, not the canvas. Pointer capture normally retargets
    // these to the canvas, but capture is not guaranteed — a gesture that leaves
    // the element must keep tracking, otherwise the product freezes mid-turn
    // instead of following the pointer.
    window.addEventListener("pointermove", applyMove, { passive: true });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);

    canvas.style.cursor = fine && enabled ? "grab" : "";
    // Claim the gesture from the scroller while the product is interactive.
    canvas.style.touchAction = enabled ? "none" : "";

    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", applyMove);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      canvas.style.cursor = "";
      canvas.style.touchAction = "";
    };
  }, [enabled]);

  // Disarming must also cancel any drag in flight, or the product stays pinned
  // to the last pointer position after the beat ends.
  useEffect(() => {
    if (enabled) return;
    rig.grab = 0;
    rig.orbitTargetY = 0;
    rig.orbitTargetX = 0;
    rig.orbitVel = 0;
  }, [enabled]);

  return null;
}