"use client";

import { useEffect, useRef } from "react";
import { rig } from "@/lib/rig";

/**
 * Lets the viewer turn the product by hand on the closing beat.
 *
 * A shopper reaching the buy page wants to inspect what they are buying, so the
 * product becomes draggable there. Three rules keep it from feeling like a toy
 * bolted onto a directed film:
 *
 *  1. It only arms on the buy beat. Everywhere else the scroll timeline owns
 *     the pose completely, and a stray drag mid-film would fight it.
 *  2. It is an *additive* offset layered over the film's rotation, and it is
 *     always decaying back to zero. Releasing returns the product to exactly
 *     the pose the timeline authored, so there is no second resting state to
 *     keep in sync.
 *  3. Pitch is clamped. Unrestricted vertical drag would let the product flip
 *     over and reveal the empty underside.
 *
 * Pointer Events cover mouse, pen and touch with one code path; `setPointerCapture`
 * keeps the drag alive when the pointer leaves the canvas mid-gesture.
 */
export default function ProductOrbit({ enabled }) {
  const active = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const canHover = window.matchMedia("(hover: hover)").matches;

    const down = (e) => {
      if (!enabled) return;
      active.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      rig.grab = 1;
      canvas.style.cursor = "grabbing";
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
    };

    const move = (e) => {
      if (!enabled) return;
      if (!active.current) return;

      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };

      // Sensitivity scaled by viewport so the gesture feels the same on a phone
      // as on a desktop, rather than becoming a full spin on a small screen.
      const gain = 0.006 * Math.min(1.6, Math.max(0.55, 900 / window.innerWidth));

      rig.orbitTargetY += dx * gain;
      rig.orbitTargetX = Math.max(
        -0.55,
        Math.min(0.55, rig.orbitTargetX + dy * gain * 0.55),
      );
    };

    const up = (e) => {
      if (!active.current) return;
      active.current = false;
      rig.grab = 0;
      canvas.style.cursor = canHover && enabled ? "grab" : "";
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* nothing to release */
      }
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    // Idle affordance, and a re-assert when the beat changes.
    canvas.style.cursor = canHover && enabled ? "grab" : "";

    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.style.cursor = "";
    };
  }, [enabled]);

  // Disarming must also cancel any drag in flight, or the product would stay
  // pinned to the last pointer position after the beat ended.
  useEffect(() => {
    if (enabled) return;
    rig.grab = 0;
    rig.orbitTargetY = 0;
    rig.orbitTargetX = 0;
  }, [enabled]);

  return null;
}