"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const ARMED_AT = 0.86;
const COMMIT_AT = 0.965;

/**
 * Slide to order.
 *
 * A drag-to-confirm control. Committing an irreversible action by tapping a
 * button is a mis-click risk; requiring a deliberate slide turns intent into a
 * gesture. This is the same pattern a safe requires, so it earns its weight.
 *
 * Interaction notes, all learned from the orbit control:
 *
 *  - `touch-action: none` and pointer capture, so a thumb drag is claimed by
 *    the control instead of scrolling the page.
 *  - Move and release are bound to `window`, not the track. Capture is not
 *    guaranteed, and a finger that slides off the control must not freeze it.
 *  - `pointerId` is tracked so a second finger cannot hijack the gesture.
 *  - The thumb follows through `gsap.quickTo`, which gives it weight without
 *    allocating a tween per pointer event.
 *
 * Keyboard and screen-reader users get the same affordance: the control is
 * focusable, arrow keys push the thumb, Enter or Space commits at the end.
 */
export default function SlideToOrder({ onComplete }) {
  const root = useRef(null);
  const track = useRef(null);
  const thumb = useRef(null);
  const fill = useRef(null);
  const ring = useRef(null);
  const tick = useRef(null);

  const [armed, setArmed] = useState(false);
  const [placed, setPlaced] = useState(false);
  // Mirrors the drag progress for aria. A ref cannot be read during render, and
  // committing it to state on every pointermove would re-render at 60fps.
  const [percent, setPercent] = useState(0);

  const state = useRef({ active: false, pointerId: null, startX: 0, progress: 0 });

  /** Puts the control back to rest after a failed slide. */
  const springBack = () => {
    const s = state.current;
    gsap.to(s, {
      progress: 0,
      duration: 0.55,
      ease: "elastic.out(1, 0.55)",
      onUpdate: () => paint(s.progress),
      onComplete: () => {
        paint(0);
        setArmed(false);
      },
    });
  };

  /**
   * Writes the visual state and keeps the announced percentage in step.
   *
   * The state sync lives here rather than in the drag handler because
   * `springBack` drives the thumb through this too — without it a released
   * partial slide would animate home while `aria-valuenow` stayed frozen at the
   * value it held when the finger lifted.
   */
  const paint = (progress) => {
    state.current.progress = progress;
    const travel = Math.max(
      1,
      track.current.clientWidth - thumb.current.offsetWidth,
    );
    thumb.current.style.transform = `translate3d(${progress * travel}px, 0, 0)`;
    fill.current.style.transform = `scaleX(${progress})`;

    // Guarded, so an animation frame only re-renders when the value a screen
    // reader would announce actually changes.
    const pct = Math.round(progress * 100);
    setPercent((prev) => (prev === pct ? prev : pct));
  };

  const commit = () => {
    if (placed) return;
    setPlaced(true);
    setArmed(false);

    const s = state.current;
    const travel = track.current.clientWidth - thumb.current.offsetWidth;

    const tl = gsap.timeline();

    // Lock the thumb home and flood the track.
    tl.to(thumb.current, {
      x: travel,
      duration: 0.22,
      ease: "power3.out",
      onStart: () => {
        fill.current.style.transform = "scaleX(1)";
      },
    })
      .to(
        // The thumb has done its job once the track is flooded; leaving it
        // parked on the black bar reads as a dark blob rather than a control.
        thumb.current,
        { autoAlpha: 0, scale: 0.7, duration: 0.3, ease: "power2.inOut" },
        0.12,
      )
      .to(track.current, {
        backgroundColor: "#0a0a0a",
        duration: 0.4,
        ease: "power2.inOut",
      }, 0)
      .to([".slide-label-hold", ".slide-label-release"], {
        autoAlpha: 0,
        y: -8,
        duration: 0.28,
        stagger: 0.04,
        ease: "power2.in",
      }, 0)
      .to(".slide-success", { autoAlpha: 1, duration: 0.01 }, 0.18)
      .fromTo(
        ".slide-success-mark",
        { scale: 0.55, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(2.4)" },
        0.2,
      )
      .fromTo(".slide-success-text", {
        autoAlpha: 0,
        y: 6,
      }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.45,
        ease: "power2.out",
      }, 0.36);

    // Draw the ring, then the tick, both as strokes.
    const drawRing = (el, delay) => {
      const len = el.getTotalLength();
      gsap.fromTo(
        el,
        { strokeDasharray: len, strokeDashoffset: len },
        {
          strokeDashoffset: 0,
          duration: 0.55,
          delay,
          ease: "power2.inOut",
          onComplete: () => el.style.strokeDasharray = "none",
        },
      );
    };

    drawRing(ring.current, 0.24);
    drawRing(tick.current, 0.52);

    onComplete?.();

    return tl;
  };

  useEffect(() => {
    const el = track.current;
    const thumbEl = thumb.current;
    if (!el || !thumbEl) return;

    // Claim the gesture from the scroller, and kill the iOS tap flash.
    el.style.touchAction = "none";
    el.style.webkitTapHighlightColor = "transparent";

    const travel = () =>
      Math.max(1, el.clientWidth - thumbEl.offsetWidth);

    const apply = (progress) => {
      paint(progress);
      setArmed(progress >= ARMED_AT);
    };

    const onDown = (e) => {
      if (placed || state.current.active) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      state.current.active = true;
      state.current.pointerId = e.pointerId;
      state.current.startX = e.clientX;
      thumbEl.style.transition = "none";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* best effort */
      }
    };

    const onMove = (e) => {
      const s = state.current;
      if (!s.active || e.pointerId !== s.pointerId) return;
      apply(Math.min(1, Math.max(0, (e.clientX - s.startX) / travel())));
    };

    const onUp = (e) => {
      const s = state.current;
      if (!s.active) return;
      if (e.pointerId !== undefined && e.pointerId !== s.pointerId) return;

      s.active = false;
      s.pointerId = null;
      thumbEl.style.transition = "";

      if (s.progress >= COMMIT_AT) {
        apply(1);
        commit();
      } else {
        springBack();
      }
    };

    const onKeyDown = (e) => {
      if (placed) return;
      const s = state.current;
      const step = 0.12;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        apply(Math.min(1, s.progress + step));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        apply(Math.max(0, s.progress - step));
      } else if (e.key === "Enter" || e.key === " ") {
        // No threshold for the keyboard path. Making someone tap ArrowRight
        // nine times before they may confirm is a worse mis-click guard than
        // the one that motivated the slider in the first place.
        e.preventDefault();
        apply(1);
        commit();
      } else if (e.key === "Escape") {
        springBack();
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", onUp);
    el.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
      el.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  // Exactly one resting label is visible at a time, and neither survives the
  // commit, so the success overlay ends up owning the track. Computed here so
  // the two spans cannot drift out of step with each other.
  const showHold = !armed && !placed;
  const showRelease = armed && !placed;

  // Initial paint once fonts have settled and the track has a width.
  useGSAP(
    () => {
      document.fonts?.ready.then(() => paint()).catch(() => {});
      paint();
    },
    { scope: root },
  );

  return (
    // `select-none` is not cosmetic. A horizontal drag across a page will
    // happily sweep a text selection through the labels and confirmation line
    // sitting under the thumb, which reads as a glitch on release.
    <div ref={root} className="relative w-full select-none">
      {placed && (
        <p
          aria-live="polite"
          className="slide-success-text mt-4 text-center font-display text-[0.95rem] font-medium tracking-[-0.01em] text-neutral-900"
        >
          Order placed — confirmation sent to your email.
        </p>
      )}

      <div
        ref={track}
        role="slider"
        tabIndex={placed ? -1 : 0}
        aria-label="Slide to place order"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-disabled={placed}
        className="relative flex h-[64px] w-full touch-none items-center overflow-hidden rounded-full bg-neutral-900/[0.06] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[#5B6CFF] focus-visible:ring-offset-4 focus-visible:ring-offset-white sm:h-[72px]"
      >
        {/* Progress fill. */}
        <div
          ref={fill}
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-neutral-900/[0.06]"
        />

        {/* Resting labels. Only the relevant one is visible at a time. */}
        <span
          className={`slide-label-hold pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[0.82rem] font-medium tracking-[0.16em] text-neutral-500 uppercase ${showHold ? "opacity-100" : "opacity-0"}`}
        >
          Slide to order
        </span>

        <span
          className={`slide-label-release pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[0.82rem] font-medium tracking-[0.16em] text-neutral-900 uppercase ${showRelease ? "opacity-100" : "opacity-0"}`}
        >
          Release to order
        </span>

        {/* Success overlay, revealed on commit. */}
        <span className="slide-success pointer-events-none absolute inset-0 flex items-center justify-center gap-3 opacity-0">
          <span className="slide-success-mark grid size-8 place-items-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle
                ref={ring}
                cx="16"
                cy="16"
                r="14"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                ref={tick}
                d="M9.5 16.5 L14 21 L22.5 11.5"
                stroke="#ffffff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="slide-success-text font-display text-[0.82rem] font-medium tracking-[0.16em] text-white uppercase">
            Ordered
          </span>
        </span>

        {/* Thumb. Big enough to be a comfortable touch target. */}
        <div
          ref={thumb}
          aria-hidden="true"
          className="relative z-10 ml-1.5 grid size-[52px] shrink-0 place-items-center rounded-full bg-neutral-900 will-change-transform sm:size-[58px]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={placed ? "opacity-0" : "opacity-100 transition-opacity duration-200"}
          >
            <path
              d="M2.5 8h11M9.5 4l4 4-4 4"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}