"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling, wired into ScrollTrigger rather than running beside it.
 *
 * Lenis and ScrollTrigger both believe they own the scroll position, and if
 * they disagree the scrubbed timeline visibly stutters. Lenis publishes its
 * scroll through gsap's ticker and ScrollTrigger reads from Lenis, so there is
 * exactly one source of truth.
 *
 * Driven by gsap.ticker (not rAF) to keep a single frame loop for the whole
 * page, and paused when the tab is hidden so a backgrounded tab cannot fall
 * behind and snap on return.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      // Honour the preference natively: no smoothing, ScrollTrigger drives scroll.
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      // Exponential ease-out: long, decelerating tail so the product eases into
      // each stop instead of stopping dead.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
      lerp: 0.09,
      smoothWheel: true,
      autoRaf: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onVisibility = () => {
      if (document.hidden) lenis.stop();
      else lenis.start();
    };

    document.addEventListener("visibilitychange", onVisibility);

    // Anchors and any programmatic scroll must route through Lenis, or the
    // two will fight over the position.
    const onClick = (e) => {
      const anchor = e.target.closest?.('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    };

    document.addEventListener("click", onClick);

    ScrollTrigger.refresh();

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return null;
}