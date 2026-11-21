"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STOPS, STOPS_MOBILE } from "@/lib/stops";
import { rig, applyStop, applyStopGroup } from "@/lib/rig";
import { createCopyDirector } from "@/lib/textMotion";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Pacing model.
 *
 * The film is one timeline measured in abstract "units"; VH_PER_UNIT converts
 * units to scroll distance, so changing the feel of the whole film is a single
 * number and the spacer height below can never disagree with the timeline.
 *
 *   [ intro hold ][ travel | hold ][ travel | hold ] ... [ travel | hold | coda ]
 *
 * TRAVEL is how long the product takes to reach the next mark; HOLD is how long
 * it then sits there. The hold is deliberately longer than the travel (about
 * 1 : 1.2) so the product is still for more than half of the film — that
 * stillness is what makes the sequence read as a directed film rather than a
 * continuous spin, and it is where the type is read.
 *
 * Any stop may override its own pacing without touching these defaults:
 *   stop.travel  multiplier on TRAVEL for the move INTO this stop
 *   stop.hold    multiplier on HOLD for the rest AT this stop
 *                (on beat 0 it scales INTRO_HOLD)
 *   stop.ease    one GSAP ease name used for every channel of that move
 *   stop.linger  fraction (0..~0.5) of the move INTO this stop that the previous
 *                stop's copy stays up for, instead of leaving the instant the
 *                move begins. For small moves that follow a line worth reading.
 */
const TRAVEL = 1.7;
const HOLD = 2.0;

/**
 * The opening statement is composed and still before the product moves at all.
 * Without a real leading hold the product began leaving its intro pose at
 * scroll 0 while the intro type was still on screen.
 */
const INTRO_HOLD = 1.3;

/** Extra rest after the final hold, so the closing beat can be read before the
 * footer rises over it. Mobile's footer is taller, so it needs more. */
const CODA = { desktop: 1.0, mobile: 3.0 };

/** ~34vh per unit gives travel ≈ 58vh and a whole beat ≈ 125vh of scroll. */
const VH_PER_UNIT = 34;

/**
 * Where, within a move, the product counts as "arrived" for the type.
 * Copy lands on a product that is essentially still, never on one mid-flight.
 */
const ARRIVE_AT = 0.85;

/** Timeline units of slack around a text threshold, so scrubbing exactly on it
 * cannot make the copy flicker in and out. */
const HYSTERESIS = 0.05;

/**
 * Per-channel-group choreography, as fractions of a move's travel time.
 *
 * Rotation leads on a smooth ease; position and camera start a touch later and
 * finish last on a softer ease, which gives the move an arc and a sense of
 * intent (the product turns, then the world settles around it). Scale and fov
 * share a gentle sine. Exposure travels the whole move on sine so it never
 * pulses. Every group finishes by 1.0, so a move's duration is exactly TRAVEL.
 */
const CHOREO = {
  rot: { at: 0, dur: 0.8, ease: "power2.inOut" },
  pos: { at: 0.08, dur: 0.9, ease: "sine.inOut" },
  cam: { at: 0.14, dur: 0.86, ease: "sine.inOut" },
  lens: { at: 0.04, dur: 0.92, ease: "sine.inOut" },
  exposure: { at: 0, dur: 1, ease: "sine.inOut" },
};

/**
 * Lays the beats out on the timeline.
 *
 * Pure and generic over `beats.length`; used both for the spacer height (at
 * render) and to build the timeline (in the effect), so the two always agree.
 */
function planFilm(beats, mode) {
  const slots = [];
  let cursor = INTRO_HOLD * (beats[0].hold ?? 1);

  slots.push({ start: 0, end: 0, arrive: 0, leave: 0 });

  for (let i = 1; i < beats.length; i++) {
    const travel = TRAVEL * (beats[i].travel ?? 1);
    const hold = HOLD * (beats[i].hold ?? 1);
    slots.push({
      start: cursor,
      end: cursor + travel,
      arrive: cursor + travel * ARRIVE_AT,
      // When the PREVIOUS beat's copy has to be gone: its exit is played after
      // this, so it never overlaps the arrival (linger is clamped below it).
      leave: cursor + travel * Math.min(beats[i].linger ?? 0, ARRIVE_AT - 0.3),
    });
    cursor += travel + hold;
  }

  return { slots, total: cursor + CODA[mode === "mobile" ? "mobile" : "desktop"] };
}

/**
 * The film.
 *
 * The canvas and typography are both position:fixed, so the stage is already
 * effectively pinned — all that needs to scroll is a tall spacer, which gives
 * ScrollTrigger its scrub axis. This is the pinned pattern for a fixed WebGL
 * stage and avoids the pin-spacer reflow a DOM pin would force behind a
 * full-viewport canvas.
 *
 * One scrubbed master timeline drives the product rig, so scrolling back
 * reverses every move with no second set of tweens to keep in sync.
 *
 * The type is NOT on that timeline. It is played (time-based) by the copy
 * director so scroll speed never changes how words move; the timeline only
 * decides which beat is active, from the product's arrival.
 *
 * One smoothing stack, tuned together: Lenis gives the scroll its feel, the
 * scrub (small) just bridges Lenis' steps into the timeline, and the rig damps
 * the last few percent in the render loop. They are deliberately short so the
 * product tracks the scroll tightly and settles well inside a hold.
 */
const SCRUB = 0.35;

export default function Film({ children, mode = "desktop", onOrbitChange }) {
  const root = useRef(null);

  // Mobile has its own art direction rather than a scaled copy of the desktop
  // film — see STOPS_MOBILE for why. Resolved here so the spacer below can size
  // itself before the effect runs.
  const beats = mode === "mobile" ? STOPS_MOBILE : STOPS;
  const { total } = planFilm(beats, mode);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const director = createCopyDirector({ beats, reduced });

      /**
       * Hard reset of the copy layer before anything else.
       *
       * Written directly to the DOM rather than through GSAP, so it is not
       * captured by this effect's context and therefore cannot be reverted when
       * the timeline rebuilds.
       *
       * This matters on a viewport change: the mobile and desktop films have the
       * same beat count, so <Line> reuses its registry keys and the blocks are
       * reconciled rather than remounted. Any inline opacity left over from the
       * previous film would survive the rebuild and two beats would end up
       * stacked on top of each other.
       */
      gsap.utils.toArray("[data-copy]").forEach((el) => {
        el.style.removeProperty("opacity");
        el.style.removeProperty("visibility");
        el.style.removeProperty("transform");
      });
      gsap.utils.toArray("[data-line]").forEach((el) => {
        el.style.removeProperty("opacity");
        el.style.removeProperty("transform");
      });
      director.reset();

      const { slots } = planFilm(beats, mode);

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: reduced ? true : SCRUB,
          invalidateOnRefresh: true,
        },
      });

      // Arrival state: the product starts composed in the opening pose.
      //
      // Applied imperatively rather than as tl.set(): a set at time 0 never
      // renders on its own.
      gsap.set(rig, applyStop(beats[0]));

      // Beat 0 is a pure hold (no tweens). Each later beat is one move whose
      // channel groups are staggered inside the move's travel window.
      for (let i = 1; i < beats.length; i++) {
        const { start, end } = slots[i];
        const travel = end - start;
        for (const group of Object.keys(CHOREO)) {
          const c = CHOREO[group];
          tl.to(
            rig,
            {
              ...applyStopGroup(beats[i], group),
              duration: travel * c.dur,
              ease: beats[i].ease ?? c.ease,
            },
            start + travel * c.at,
          );
        }
      }

      // Anchor the timeline's length to the plan (final hold + coda), which is
      // what the spacer height was computed from.
      tl.set({}, {}, total);

      /**
       * Which beat's text is on screen, derived from the product's arrival.
       *
       *   beat i is "text-active" from its arrival until the NEXT move begins (plus its `linger`);
       *   in between (-1) the product is in transit and no text is shown.
       *
       * That gives the contract the type needs: copy appears only after the
       * product has essentially arrived, and the previous copy has cleared before
       * the product starts moving. The same rule runs in reverse when scrolling
       * back. A little hysteresis around each threshold stops a scrub parked
       * exactly on one from flickering.
       */
      const enters = slots.map((s, i) => (i === 0 ? -Infinity : s.arrive));
      const leaves = slots.map((_, i) =>
        i < slots.length - 1 ? slots[i + 1].leave : Infinity,
      );

      let textBeat = 0;
      const resolveTextBeat = (t) => {
        const within = (i, m) => t >= enters[i] - m && t <= leaves[i] + m;
        if (textBeat >= 0 && within(textBeat, HYSTERESIS)) return textBeat;
        for (let i = 0; i < slots.length; i++) {
          if (within(i, 0)) return i;
        }
        return -1;
      };

      // Text must not start before the loading curtain has lifted.
      let started = false;
      let shown = null;
      const pushText = () => {
        if (!started || shown === textBeat) return;
        shown = textBeat;
        director.show(textBeat);
      };

      const onReady = () => {
        started = true;
        // First reveal of the opening statement is a played entrance; if the
        // page restored to a later scroll position, just show that beat.
        if (textBeat === 0) {
          shown = 0;
          director.playIntro();
        } else pushText();
      };

      /**
       * Chapter follows the text, not the product, so the marker and the copy
       * change together. It holds its last value while the product is in
       * transit. Also arms the viewer orbit on the closing beat, the only point
       * where the product is released to the shopper's hands.
       */
      const buyBeat = beats.length - 1;
      let chapter = 0;
      let orbitArmed = null;

      const syncChrome = () => {
        textBeat = resolveTextBeat(tl.time());
        if (textBeat >= 0) chapter = textBeat;
        pushText();

        const style = document.documentElement.style;
        style.setProperty("--hush-chapter", String(chapter + 1));
        style.setProperty("--hush-progress", tl.progress().toFixed(4));

        const armed = chapter === buyBeat;
        if (armed !== orbitArmed) {
          orbitArmed = armed;
          onOrbitChange?.(armed);
        }
      };

      document.documentElement.style.setProperty(
        "--hush-total",
        String(beats.length),
      );

      tl.eventCallback("onUpdate", syncChrome);
      syncChrome();

      if (document.documentElement.dataset.hushReady === "1") onReady();
      else window.addEventListener("hush:ready", onReady, { once: true });

      /**
       * Re-measure against the current layout.
       *
       * The spacer's height differs between the mobile and desktop films, and the
       * scroll position may have moved while the breakpoint was crossing. Without
       * this the new trigger keeps the old trigger's start/end and the scrub
       * range is wrong, which leaves beats stuck half-revealed.
       */
      ScrollTrigger.refresh();

      return () => {
        window.removeEventListener("hush:ready", onReady);
        director.dispose();
      };
    },
    // `mode` in the dependency list rebuilds the whole timeline when the
    // viewport crosses the breakpoint, so the two sets can never interleave.
    // revertOnUpdate is required for that: by default useGSAP defers cleanup
    // until unmount, which would leave the previous film's timeline and
    // ScrollTrigger alive and still writing to the rig.
    { dependencies: [mode, onOrbitChange], revertOnUpdate: true },
  );

  return (
    <>
      {children}

      {/*
        Scroll distance comes from the timeline plan (one viewport is the pinned
        frame itself, the rest is the film), so each beat gets roughly 125vh and
        the closing beat has room to be read before the footer rises.
      */}
      <div
        ref={root}
        aria-hidden="true"
        style={{ height: `${total * VH_PER_UNIT + 100}vh` }}
      />
    </>
  );
}
