"use client";

import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { clearLines, registerLines } from "@/lib/lineRegistry";

gsap.registerPlugin(SplitText);

/**
 * Line — masked line-by-line text reveal.
 *
 * Wraps a string (or a single child element) and splits it into visually
 * identical lines, each masked by an overflow-hidden parent so the text rises
 * into view from below its own line box.
 *
 * Two-way by design. The original version drove this with its own ScrollTrigger
 * and `once: true`, which meant the reveal could fire but never reverse —
 * scrolling back left the text sitting up, fully visible, with no motion. Here
 * the element only ever *prepares* itself: it sets the hidden start state and
 * publishes its line elements to the shared registry. The actual tween is owned
 * by the film timeline, which is scrubbed, so the reveal plays forward on the
 * way down and plays in reverse on the way back up — automatically, because it
 * is the same tween.
 *
 * @param children   text string, or a single element to split
 * @param registryKey when set, publishes line elements for a parent timeline
 * @param delay      stagger offset between lines, in seconds
 */
export default function Line({ children, registryKey, delay = 0, className = "" }) {
  const containerRef = useRef(null);

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      const targets =
        root.hasAttribute("data-line-wrapper")
          ? Array.from(root.children)
          : [root];

      const splits = [];
      const lines = [];

      targets.forEach((element) => {
        const split = SplitText.create(element, {
          type: "lines",
          mask: "lines",
          linesClass: "hush-line",
          autoSplit: true,
        });

        splits.push(split);
        lines.push(...split.lines);

        // SplitText measures against the element's own text-indent, which
        // throws off the first line's mask. Move it onto the line itself.
        const { textIndent } = window.getComputedStyle(element);
        if (textIndent && textIndent !== "0px" && split.lines[0]) {
          split.lines[0].style.paddingLeft = textIndent;
          element.style.textIndent = "0";
        }
      });

      // Hidden start state. Registered lines are animated by the film timeline;
      // unregistered ones (used standalone) simply appear.
      gsap.set(lines, { yPercent: 115, opacity: 0 });
      registerLines(registryKey, lines);

      return () => {
        clearLines(registryKey);
        splits.forEach((split) => split?.revert());
      };
    },
    { scope: containerRef, dependencies: [registryKey] },
  );

  if (typeof children === "string") {
    return (
      <span ref={containerRef} className={`block ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <span ref={containerRef} data-line-wrapper="true" className={className}>
      {children}
    </span>
  );
}

/** Shared stagger so every reveal in the film breathes at the same rate. */
export const LINE_EASE = "power4.out";
export const LINE_STAGGER = 0.09;
export const LINE_DELAY = delay => delay;