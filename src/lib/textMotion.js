import gsap from "gsap";
import { getLines, subscribeLines } from "@/lib/lineRegistry";

/**
 * Copy director — owns every piece of text motion in the film.
 *
 * CONTRACT (shared between Film.jsx and the typography layer):
 *
 *   const director = createCopyDirector({ beats, reduced });
 *   director.show(i)      // make beat `i` the one on screen. Idempotent. Safe to
 *                         // call rapidly / out of order (fast scrolling, jumping
 *                         // over beats, scrolling backwards): it always ends
 *                         // with exactly one beat visible and no stray tweens.
 *                         // show(-1) = "nothing is active" (product in transit):
 *                         // the visible beat exits, nothing is revealed.
 *   director.playIntro()  // first reveal, once the loading curtain starts to lift
 *   director.reset()      // hard-clear everything to the hidden state
 *   director.dispose()    // kill all tweens
 *
 * The text is *played*, not scrubbed: scroll speed must never change how the
 * type moves. Film.jsx only decides WHICH beat is active (from the product's
 * arrival); this module decides HOW it arrives and leaves.
 *
 * Elements: each beat's block is `[data-copy="i"]`; its split lines are
 * registered under `beat-${i}-${k}` (k = index in beat.copy) in lineRegistry.
 * Anything else that should cascade in (the buy button, the drag hint) is
 * tagged `data-reveal="cta" | "hint"` inside the block.
 *
 * Nothing shows before `playIntro()`: until then `show()` only remembers which
 * beat is wanted, so the first reveal is never played underneath the curtain.
 *
 * State model. Hidden state lives on the BLOCK (autoAlpha 0), never on the
 * lines, so a SplitText re-split can't expose anything. Each beat is
 * `hidden | in | out`; `show()` exits every non-target beat and enters the
 * target, killing whatever was in flight on those beats first.
 *
 * Only transform + opacity are animated (no filter blur): the canvas behind is
 * WebGL and every extra compositing cost shows up as dropped frames.
 */

/** Headline tones rise through a clip mask; everything else fades up softly. */
const MASKED_TONES = new Set(["lead", "wordmark"]);
export const isMaskedTone = (tone) => MASKED_TONES.has(tone);

/**
 * Timing, in seconds. Chosen as a set:
 *  - The headline rises on expo.out: most of the travel happens in the first
 *    ~0.4s so it reads as decisive, then settles for the remaining ~0.7s —
 *    that long tail is what makes it feel expensive rather than snappy.
 *  - Lines stagger tightly (0.09) so a two-line headline reads as one phrase.
 *  - The sub copy is a separate, softer beat: it starts once the headline is
 *    nearly home and only fades + drifts a few px, so the eye is led headline
 *    first, supporting line second.
 *  - Exit is short and fades faster than it travels; the next beat starts at
 *    ~75% of it, so the screen is never empty and never double-printed.
 */
const T = {
  hideY: 130, // yPercent below the mask; > 100 + the mask's bottom padding
  leadDur: 1.15,
  leadEase: "expo.out",
  stagger: 0.09,
  subAfterLead: 0.38, // gap between the last headline line starting and sub
  subStagger: 0.08,
  subY: 14,
  subFadeDur: 0.9,
  subRiseDur: 1.15,
  exitDur: 0.4,
  exitY: -14,
  exitEase: "power2.inOut",
  exitOverlap: 0.1, // incoming may start this long before the exit ends
  introDelay: 0.4, // curtain is still fading when playIntro fires
};

/** Extras tagged `data-reveal`: when (after the sub copy starts) and how. */
const EXTRAS = {
  cta: { at: 0.22, y: 12, dur: 0.9, ease: "power3.out" },
  hint: { at: 0.62, y: 0, dur: 1.0, ease: "power1.out" },
};

const REST_PROPS = "transform,opacity,willChange";

export function createCopyDirector({ beats, reduced = false }) {
  /** phase: hidden | in | out. `shown` = the block has actually been made visible. */
  const states = beats.map(() => ({ phase: "hidden", shown: false, tl: null }));
  let target = -1;
  let wanted = -1; // last show() received before the intro
  let introDone = false;
  let disposed = false;
  let fallback = null;

  const block = (i) => document.querySelector(`[data-copy="${i}"]`);

  /** Everything a beat animates, resolved fresh (lines change on re-split). */
  const parts = (i) => {
    const el = block(i);
    if (!el) return null;
    const lead = [];
    const soft = [];
    beats[i].copy.forEach((c, k) => {
      (isMaskedTone(c.tone) ? lead : soft).push(...getLines(`beat-${i}-${k}`));
    });
    const extras = Array.from(el.querySelectorAll("[data-reveal]"));
    return { el, lead, soft, extras, all: [...lead, ...soft, ...extras] };
  };

  /** Strip every inline style we animated, so text rests crisp and untransformed. */
  const rest = (p) => p.all.length && gsap.set(p.all, { clearProps: REST_PROPS });

  const killTl = (s) => {
    s.tl?.kill();
    s.tl = null;
  };

  /** Instantly hidden, nothing in flight, no stale inline styles. */
  const hideNow = (i) => {
    const s = states[i];
    killTl(s);
    s.phase = "hidden";
    s.shown = false;
    const p = parts(i);
    if (!p) return;
    gsap.killTweensOf([p.el, ...p.all]);
    gsap.set(p.el, { autoAlpha: 0, y: 0 });
    rest(p);
  };

  /** Instantly fully visible and at rest. */
  const settle = (i) => {
    const s = states[i];
    killTl(s);
    s.phase = "in";
    s.shown = true;
    const p = parts(i);
    if (!p) return;
    gsap.killTweensOf([p.el, ...p.all]);
    gsap.set(p.el, { autoAlpha: 1, y: 0 });
    rest(p);
  };

  const exit = (i) => {
    const s = states[i];
    if (s.phase !== "in") return;
    // Not yet revealed (still inside its entry delay) or reduced motion: there
    // is nothing on screen to animate away.
    if (!s.shown || reduced) return hideNow(i);
    const p = parts(i);
    if (!p) return hideNow(i);
    killTl(s);
    s.phase = "out";
    // Lines keep whatever position they reached; the whole block drifts up and
    // fades together, so a half-revealed beat leaves as gracefully as a full one.
    s.tl = gsap.to(p.el, {
      autoAlpha: 0,
      y: T.exitY,
      duration: T.exitDur,
      ease: T.exitEase,
      overwrite: true,
      onComplete: () => hideNow(i),
    });
  };

  const enter = (i, delay) => {
    const s = states[i];
    const p = parts(i);
    if (!p) return;

    if (reduced) return settle(i);

    // Coming back while its own exit is still running (scrolled back, or the
    // product wobbled across the threshold): finish the reveal instantly and
    // fade the block back in rather than replaying it from scratch.
    if (s.phase === "out") {
      killTl(s);
      gsap.killTweensOf([p.el, ...p.all]);
      rest(p);
      s.phase = "in";
      s.shown = true;
      s.tl = gsap.to(p.el, {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        ease: "power2.out",
        delay: Math.min(delay, 0.12),
        overwrite: true,
        onComplete: () => settle(i),
      });
      return;
    }

    killTl(s);
    gsap.killTweensOf([p.el, ...p.all]);
    s.phase = "in";
    s.shown = false;

    const tl = gsap.timeline({ onComplete: () => settle(i) });
    s.tl = tl;

    // The block is revealed only when its delay elapses, so an entry that gets
    // superseded during the delay costs nothing and flashes nothing.
    tl.call(
      () => {
        s.shown = true;
        gsap.set(p.el, { autoAlpha: 1, y: 0 });
        if (p.all.length) gsap.set(p.all, { willChange: "transform, opacity" });
      },
      null,
      delay,
    );

    // 1. Headline: masked rise, line by line.
    if (p.lead.length) {
      tl.fromTo(
        p.lead,
        { yPercent: T.hideY },
        {
          yPercent: 0,
          duration: T.leadDur,
          ease: T.leadEase,
          stagger: T.stagger,
        },
        delay,
      );
    }

    // 2. Sub copy / tagline: a separate, softer beat. Opacity and travel run on
    // different curves — it is visible early but takes its time to land.
    const leadSpan = p.lead.length ? (p.lead.length - 1) * T.stagger + T.subAfterLead : 0;
    const softAt = delay + leadSpan;
    if (p.soft.length) {
      tl.fromTo(
        p.soft,
        { opacity: 0 },
        { opacity: 1, duration: T.subFadeDur, ease: "power1.out", stagger: T.subStagger },
        softAt,
      );
      tl.fromTo(
        p.soft,
        { y: T.subY },
        { y: 0, duration: T.subRiseDur, ease: "power3.out", stagger: T.subStagger },
        softAt,
      );
    }

    // 3. Extras (buy button, drag hint) cascade in after the copy.
    p.extras.forEach((el) => {
      const x = EXTRAS[el.dataset.reveal] || EXTRAS.cta;
      tl.fromTo(
        el,
        { opacity: 0, y: x.y },
        { opacity: 1, y: 0, duration: x.dur, ease: x.ease },
        softAt + x.at,
      );
    });
  };

  /** Seconds until the longest-running exit is "mostly gone". */
  const exitWait = () => {
    let wait = 0;
    states.forEach((s) => {
      if (s.phase === "out" && s.tl) {
        wait = Math.max(wait, s.tl.duration() * (1 - s.tl.progress()));
      }
    });
    return Math.max(0, wait - T.exitOverlap);
  };

  const go = (i, minDelay = 0) => {
    if (i === target) return;
    target = i;
    states.forEach((s, n) => {
      if (n !== i) exit(n);
    });
    if (i >= 0) enter(i, Math.max(minDelay, exitWait()));
  };

  // A re-split (fonts loaded, container resized) swaps the line elements. If the
  // beat is visible and settled the fresh lines are already at rest; if it is
  // mid-reveal the running tweens point at detached elements, so land it.
  const unsubscribe = subscribeLines((key) => {
    const m = /^beat-(\d+)-/.exec(key);
    if (!m) return;
    const i = Number(m[1]);
    const s = states[i];
    if (!s || s.phase !== "in" || !s.tl) return;
    if (i !== target) return;
    if (s.shown) settle(i);
    else {
      s.phase = "hidden";
      enter(i, 0.05);
    }
  });

  const playIntro = () => {
    if (disposed) return;
    introDone = true;
    fallback?.kill();
    fallback = null;
    go(wanted >= 0 ? wanted : 0, T.introDelay);
  };

  return {
    show(i) {
      if (disposed) return;
      const next = Number.isInteger(i) && i < beats.length ? Math.max(i, -1) : null;
      if (next === null) return;

      if (!introDone) {
        wanted = next;
        // Safety net: if the curtain already lifted but nobody called
        // playIntro (director created after the ready event), don't stay blank.
        if (!fallback && document.documentElement.dataset.hushReady === "1") {
          fallback = gsap.delayedCall(1.2, playIntro);
        }
        return;
      }
      go(next);
    },
    playIntro,
    reset() {
      target = -1;
      wanted = -1;
      beats.forEach((_, n) => hideNow(n));
    },
    dispose() {
      disposed = true;
      unsubscribe();
      fallback?.kill();
      states.forEach(killTl);
    },
  };
}
