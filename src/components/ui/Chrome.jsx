"use client";

import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import gsap from "gsap";

/**
 * Minimal chrome: a hairline progress rule, nothing else.
 *
 * Progress arrives as a CSS custom property written by the Film timeline on
 * <html> and is driven straight off it in a rAF loop — no React re-render per
 * scroll frame.
 */
export default function Chrome() {
  const bar = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    // A live CSSStyleDeclaration: created once, read cheaply every frame.
    const cs = getComputedStyle(document.documentElement);
    let frame = 0;

    const tick = () => {
      const p = Number(cs.getPropertyValue("--hush-progress"));
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
        No wordmark and no chapter counter here: the footer carries the brand at
        full weight, and anything repeated over the film competes with the
        product. Only the progress rule remains.
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
 * Flag the loading curtain as lifting. Film (and the copy director behind it)
 * start the first reveal from this: the event for a listener that is already
 * mounted, the dataset flag for one that mounts afterwards (revisit, HMR).
 */
function markReady() {
  const root = document.documentElement;
  if (root.dataset.hushReady === "1") return;
  root.dataset.hushReady = "1";
  window.dispatchEvent(new Event("hush:ready"));
}

/**
 * Curtain timing, in ms.
 *
 * MIN_SHOW   the curtain never lifts earlier than this after navigation start,
 *            so a cached load reads as a composed beat rather than a flash. It
 *            is measured from navigation, not from mount: a slow hydration eats
 *            into it, so the minimum never stacks on top of a slow load.
 * FINISH     shortest time the bar takes to run its last stretch to 100.
 * HOLD       beat on the full hairline before anything starts to leave.
 * SAFETY     lift anyway if the loader never reports (nothing to load).
 */
const MIN_SHOW = 1400;
const FINISH = 520;
const HOLD = 160;
const SAFETY = 25000;

/** Ground wipe: starts this far into the exit (s), runs for GROUND seconds. */
const GROUND_AT = 0.42;
const GROUND = 1.0;

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Loading curtain.
 *
 * Entrance (CSS, runs from first paint, no JS needed): the wordmark rises
 * through a mask, the hairline draws out from its centre, the counter fades in.
 *
 * Progress. drei reports progress in jumps (a single large GLB can sit at 0 and
 * then leap to 100), so the bar and counter never show it raw. A rAF loop keeps
 * a displayed value `v` that only ever increases:
 *   - while loading it eases toward a goal of the real progress, plus a gentle
 *     time-based creep (capped at 55 + a third of the real value, never past
 *     94), so it keeps moving without ever promising completion;
 *   - once loading has finished and held for 180ms it runs the remaining
 *     distance to 100 on an ease-out curve, timed to land no earlier than the
 *     minimum display time.
 * The hairline is a transform: scaleX; the counter is three rolling digit
 * columns moved with transforms. Neither causes layout, and no React render
 * happens per frame.
 *
 * Exit. The wordmark rises out of its mask, the hairline retracts and the
 * counter fades; then the white ground wipes upward (clip-path), revealing the
 * already-composed scene. `hush:ready` fires as the ground starts to move, so
 * the intro copy (which rises ~0.4s later) appears as the curtain clears and
 * never underneath it. Reduced motion: a plain 0.4s fade.
 */
export function Curtain() {
  const [phase, setPhase] = useState("loading"); // loading | lifting | gone
  const { progress, active } = useProgress();

  const root = useRef(null);
  const word = useRef(null);
  const rule = useRef(null);
  const fill = useRef(null);
  const count = useRef(null);
  const hundreds = useRef(null);
  const tens = useRef(null);
  const units = useRef(null);

  // Latest loader state, read by the rAF loop without re-subscribing.
  const live = useRef({ real: 0, done: false });
  useEffect(() => {
    live.current.real = progress;
    live.current.done = !active && progress >= 100;
  }, [progress, active]);

  useEffect(() => {
    // Already lifted once this session (HMR, remount): just drop the curtain
    // rather than replaying the lift over a page that is already live.
    if (document.documentElement.dataset.hushReady === "1") {
      const t = setTimeout(() => setPhase("gone"), 0);
      return () => clearTimeout(t);
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let anim = null;
    let first = null;
    let last = null;
    let v = 0;
    let shown = -1;
    let doneAt = null;
    let finish = null;

    const paint = (value) => {
      if (fill.current) fill.current.style.transform = `scaleX(${value / 100})`;
      const n = Math.min(100, Math.floor(value));
      if (n === shown) return;
      shown = n;
      const h = n >= 100 ? 1 : 0;
      const t = Math.floor((n % 100) / 10);
      const u = n % 10;
      if (hundreds.current) {
        hundreds.current.style.transform = `translate3d(0, ${-h * 50}%, 0)`;
      }
      if (tens.current) {
        tens.current.style.transform = `translate3d(0, ${-t * 10}%, 0)`;
      }
      if (units.current) {
        units.current.style.transform = `translate3d(0, ${-u * 10}%, 0)`;
      }
    };

    const lift = () => {
      setPhase("lifting");
      const el = root.current;
      if (reduced || !el) {
        markReady();
        if (el) {
          anim = gsap.to(el, {
            opacity: 0,
            duration: 0.4,
            ease: "power1.out",
            onComplete: () => setPhase("gone"),
          });
        } else {
          setPhase("gone");
        }
        return;
      }
      anim = gsap.timeline({ onComplete: () => setPhase("gone") });
      anim
        .to(
          word.current,
          { yPercent: -112, duration: 0.62, ease: "power3.inOut" },
          0,
        )
        .to(
          rule.current,
          {
            scaleX: 0,
            transformOrigin: "100% 50%",
            duration: 0.5,
            ease: "power3.inOut",
          },
          0,
        )
        .to(count.current, { opacity: 0, duration: 0.28, ease: "none" }, 0)
        // The ground begins to move: this is "the curtain starts to lift".
        .call(markReady, null, GROUND_AT)
        .to(
          el,
          {
            clipPath: "inset(0% 0% 100% 0%)",
            duration: GROUND,
            ease: "power3.inOut",
          },
          GROUND_AT,
        );
    };

    const tick = (now) => {
      first ??= now;
      const dt = Math.min(0.25, (now - (last ?? now)) / 1000);
      last = now;
      const { real, done } = live.current;

      if (finish == null) {
        if (done) doneAt ??= now;
        else doneAt = null;

        if (doneAt != null && now - doneAt >= 180) {
          // Run the remaining distance in one deliberate move, landing no
          // earlier than the minimum display time (minus the closing hold).
          finish = {
            t0: now,
            v0: v,
            t1: Math.max(now + FINISH, MIN_SHOW - HOLD),
          };
        } else {
          // The creep drifts toward 85 over several seconds so the bar never
          // looks stalled, but is capped relative to the real value (55 plus a
          // third of it) so it cannot run far ahead. Ease toward the goal,
          // never backwards.
          const t = (now - first) / 1000;
          const creep = 85 * (1 - Math.exp(-t / 5));
          const goal = Math.min(94, Math.max(real, Math.min(creep, 55 + real * 0.35)));
          v = Math.max(v, v + (goal - v) * (1 - Math.exp(-dt / 0.55)));
        }
      }

      if (finish) {
        const k = clamp01((now - finish.t0) / (finish.t1 - finish.t0));
        v = Math.max(v, finish.v0 + (100 - finish.v0) * easeOutCubic(k));
        paint(v);
        if (k >= 1 && now >= finish.t1 + HOLD) {
          paint(100);
          lift();
          return;
        }
      } else {
        paint(v);
        if (now - first > SAFETY) {
          lift();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      anim?.kill();
    };
  }, []);

  if (phase === "gone") return null;

  const lifting = phase === "lifting";

  return (
    <div
      ref={root}
      role="status"
      aria-label="Loading"
      aria-hidden={lifting || undefined}
      className={`fixed inset-0 z-50 bg-white ${lifting ? "pointer-events-none" : ""}`}
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
    >
      <div className="flex h-full flex-col items-center justify-center">
        <div className="overflow-hidden px-[0.1em] py-[0.14em]">
          <span
            ref={word}
            className="hush-load-word font-display block text-[clamp(1.9rem,4.6vw,4.1rem)] leading-none font-medium tracking-[-0.035em] text-neutral-900"
          >
            Hush
          </span>
        </div>

        <div
          ref={rule}
          className="hush-load-rule relative mt-6 h-px w-[min(52vw,220px)] bg-neutral-900/12"
        >
          <div
            ref={fill}
            className="absolute inset-0 origin-left bg-neutral-900"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        <div
          ref={count}
          className="hush-load-count font-sans mt-3 flex w-[min(52vw,220px)] justify-end text-[0.62rem] leading-none font-medium tracking-[0.12em] text-neutral-400 tabular-nums"
        >
          <Digit ref={hundreds} glyphs={[" ", "1"]} />
          <Digit ref={tens} glyphs={DIGITS} />
          <Digit ref={units} glyphs={DIGITS} />
        </div>
      </div>
    </div>
  );
}

/**
 * One rolling numeral: a column of glyphs one line tall, moved with a
 * transform (translate percentages are of the column's own height).
 */
function Digit({ ref, glyphs }) {
  return (
    <span className="inline-block h-[1em] w-[0.62em] overflow-hidden">
      <span
        ref={ref}
        className="block will-change-transform"
        style={{ transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {glyphs.map((g, i) => (
          <span key={i} className="block h-[1em] text-center leading-none">
            {g}
          </span>
        ))}
      </span>
    </span>
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