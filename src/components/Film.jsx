"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STOPS, STOPS_MOBILE } from "@/lib/stops";
import { rig, applyStop } from "@/lib/rig";
import { getLines } from "@/lib/lineRegistry";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Pacing.
 *
 * TRAVEL is how long the product takes to reach the next mark; HOLD is how long
 * it sits there. The holds are deliberately long relative to the travel: that
 * ratio is what makes the sequence read as a directed film rather than a
 * continuous spin. Roughly, two thirds of the film's runtime is stillness.
 */
const TRAVEL = 2.3;
const HOLD = 1.6;

/**
 * The film.
 *
 * The canvas and typography are both position:fixed, so the stage is already
 * effectively pinned — all that needs to scroll is a tall spacer, which gives
 * ScrollTrigger its scrub axis. This is the pinned pattern for a fixed WebGL
 * stage and avoids the pin-spacer reflow a DOM pin would force behind a
 * full-viewport canvas.
 *
 * One scrubbed master timeline drives the product rig *and* the copy, so words
 * and product share a single clock and cannot drift apart. Because the timeline
 * is scrubbed rather than played, every beat is inherently reversible: scroll
 * back and the product returns and the type re-masks, with no second set of
 * tweens and no `onLeaveBack` handlers to keep in sync.
 *
 * Text targets come from the Line registry — real element references published
 * by each <Line> during its own effect — rather than selector strings, which
 * GSAP resolves once at tween-creation time and would silently capture nothing.
 */
export default function Film({ children, mode = "desktop", onOrbitChange }) {
  const root = useRef(null);

  // Mobile has its own art direction rather than a scaled copy of the desktop
  // film — see STOPS_MOBILE for why. Resolved here so the spacer below can size
  // itself before the effect runs.
  const beats = mode === "mobile" ? STOPS_MOBILE : STOPS;

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

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

      const copy = (i) => `[data-copy="${i}"]`;

      /** Split-line elements for beat `i`, in copy order. */
      const beatLines = (i) =>
        beats[i].copy.flatMap((_, k) => getLines(`beat-${i}-${k}`));

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: reduced ? true : 1.15,
          invalidateOnRefresh: true,
        },
      });

      // Arrival state: the opening statement is already composed on screen.
      // Scroll must begin from a finished frame, never a blank one.
      //
      // Applied imperatively rather than as tl.set(): a set at time 0 never
      // renders on its own, and `autoAlpha: 0` would otherwise leave
      // `visibility: hidden` on the opening block permanently.
      gsap.set(rig, applyStop(beats[0]));
      gsap.set(gsap.utils.toArray("[data-copy]"), { autoAlpha: 0 });
      gsap.set(copy(0), { autoAlpha: 1 });

      let cursor = 0;
      /** Timeline time at which each beat's copy has fully arrived. */
      const arriveAt = [0];

      /**
       * The opening beat's reveal is played on load rather than scrubbed.
       *
       * A scrubbed timeline renders at its own progress, so at progress 0 a
       * tween placed at position 0 has not started — the opening text would sit
       * permanently at its hidden start state behind a "finished" product. The
       * page must open composed, and this one entrance is the only motion the
       * viewer sees before they touch the scroll, so it belongs to load time.
       * Every later beat is scrubbed, which is what makes the type reverse when
       * scrolling back up.
       */
      const opener = gsap.timeline({ delay: 0.35 });
      opener.fromTo(
        beatLines(0),
        { yPercent: reduced ? 0 : 118, opacity: reduced ? 1 : 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.5,
          stagger: 0.1,
          ease: "power4.out",
        },
      );

      for (let i = 0; i < beats.length; i++) {
        const isFirst = i === 0;
        const arrive = isFirst ? 0 : cursor + TRAVEL * 0.62;

        if (!isFirst) {
          // Product eases to its mark.
          tl.to(rig, { ...applyStop(beats[i]), duration: TRAVEL }, cursor);

          // Outgoing copy clears before the incoming lands, with a deliberate
          // overlap so the frame is never empty mid-transition.
          tl.to(
            copy(i - 1),
            {
              autoAlpha: 0,
              y: reduced ? 0 : -46,
              duration: TRAVEL * 0.5,
              ease: "power2.in",
            },
            cursor + TRAVEL * 0.06,
          );

          tl.set(copy(i), { autoAlpha: 1 }, arrive);
        }

        // Beat 0's reveal is handled by `opener`; scrubbing it would fight the
        // load-time entrance.
        if (isFirst) continue;

        const lines = beatLines(i);

        if (lines.length) {
          // Masked line reveal: type lifts out from behind its own clip.
          tl.fromTo(
            lines,
            { yPercent: reduced ? 0 : 118, opacity: reduced ? 1 : 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 1.45,
              stagger: 0.1,
              ease: "power4.out",
              immediateRender: false,
            },
            arrive,
          );
        }

        cursor += TRAVEL + HOLD;
        arriveAt.push(cursor - HOLD);
      }

      // Final rest, so the closing beat can be read rather than scrolled past.
      tl.to({}, { duration: 2.4 });

      /**
       * Chapter is resolved from the timeline's own beat positions rather than
       * from linear scroll progress. Beats are unevenly spaced (travel + hold),
       * so linear math reports a chapter ahead of the copy actually on screen.
       *
       * Also arms the viewer orbit on the closing beat, which is the only point
       * where the product is released to the shopper's hands.
       */
      const buyBeat = beats.length - 1;
      let orbitArmed = null;

      const syncChrome = () => {
        const t = tl.time();
        let beat = 0;
        for (let i = 0; i < arriveAt.length; i++) {
          if (t >= arriveAt[i]) beat = i;
        }
        const style = document.documentElement.style;
        style.setProperty("--hush-chapter", String(beat + 1));
        style.setProperty("--hush-progress", tl.progress().toFixed(4));

        const armed = beat === buyBeat;
        if (armed !== orbitArmed) {
          orbitArmed = armed;
          onOrbitChange?.(armed);
        }
      };

      tl.eventCallback("onUpdate", syncChrome);
      syncChrome();

      /**
       * Re-measure against the current layout.
       *
       * The spacer's height differs between the mobile and desktop films, and the
       * scroll position may have moved while the breakpoint was crossing. Without
       * this the new trigger keeps the old trigger's start/end and the scrub
       * range is wrong, which leaves beats stuck half-revealed.
       */
      ScrollTrigger.refresh();
    },
    // `mode` in the dependency list rebuilds the whole timeline when the
    // viewport crosses the breakpoint, so the two sets can never interleave.
    { dependencies: [mode, onOrbitChange] },
  );

  return (
    <>
      {children}

      {/*
        Scroll distance: roughly one viewport of travel per beat, plus a coda so
        the closing beat settles and its purchase moment can actually be read
        before the footer rises over it.
      */}
      <div
        ref={root}
        aria-hidden="true"
        style={{
          height: `${(beats.length + (mode === "mobile" ? 1.9 : 1.15)) * 100}vh`,
        }}
      />
    </>
  );
}