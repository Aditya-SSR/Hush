"use client";

import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";

/**
 * Minimal chrome: a wordmark and a hairline progress rule, and nothing else.
 *
 * Progress arrives as a CSS custom property written by the Film timeline, and
 * the rule is driven straight off it in a rAF loop — no React re-render per
 * scroll frame.
 */
export default function Chrome() {
  const bar = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    let frame = 0;
    const tick = () => {
      const p = Number(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--hush-progress"),
      );
      if (bar.current && Number.isFinite(p)) {
        bar.current.style.transform = `scaleX(${p})`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [loaded]);

  return (
    <>
      {/*
        No wordmark here: the footer carries the brand at full weight, and a
        small repeated one over the film competed with the product. Only the
        progress rule remains.
      */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-px bg-neutral-900/10">
        <div
          ref={bar}
          className="h-px w-full origin-left scale-x-0 bg-[#5B6CFF]"
        />
      </div>

      <Ready onReady={() => setLoaded(true)} />
    </>
  );
}

/** Bridges drei's loader progress to the chrome's rAF loop. */
function Ready({ onReady }) {
  const { active, progress } = useProgress();

  useEffect(() => {
    if (!active && progress >= 100) onReady();
  }, [active, progress, onReady]);

  return null;
}

/**
 * Loading curtain.
 *
 * Held until the product has actually been fetched and decoded, so the film
 * never starts against an empty canvas. The wordmark is set at the same size
 * and weight as the stop headings, so the curtain reads as the first frame of
 * the sequence rather than as a separate loading state.
 *
 * Percentage is padded to three digits so the counter does not jitter in width
 * as it climbs.
 */
export function Curtain() {
  const { progress, active } = useProgress();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!active && progress >= 100 && !gone) {
      const t = setTimeout(() => setGone(true), 340);
      return () => clearTimeout(t);
    }
  }, [active, progress, gone]);

  if (gone) return null;

  const pct = Math.min(100, Math.round(progress));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-white">
      <span className="font-display text-[clamp(1.9rem,4.6vw,4.1rem)] font-medium leading-none tracking-[-0.035em] text-neutral-900">
        Hush
      </span>

      <div className="relative h-px w-[min(52vw,260px)] bg-neutral-900/12">
        <div
          className="absolute inset-y-0 left-0 bg-neutral-900 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className="font-sans text-[0.6rem] font-medium tracking-[0.28em] text-neutral-400 uppercase tabular-nums">
        {String(pct).padStart(3, "0")}
      </span>
    </div>
  );
}

/** Shown only if the experience cannot run, so the page is never blank. */
export function Fallback() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-white px-8 text-center">
      <span className="font-display text-[0.72rem] font-semibold tracking-[0.34em] text-neutral-900 uppercase">
        Hush
      </span>
      <p className="font-sans max-w-sm text-sm leading-relaxed text-neutral-500">
        Hush H1 — a headphone engineered around silence, clarity and comfort.
        This experience needs WebGL to display the product in three dimensions.
      </p>
    </div>
  );
}