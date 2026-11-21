"use client";

import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { clearLines, registerLines } from "@/lib/lineRegistry";

gsap.registerPlugin(SplitText);

/**
 * Line — splits text into visually identical lines for the copy director.
 *
 * It only *prepares* the text: it splits, and publishes the resulting line
 * elements to the shared registry. It owns no tween and no hidden state — the
 * director (src/lib/textMotion.js) plays the reveal by time, and the hidden
 * state lives on the copy block, which a re-split never touches. That is what
 * keeps a mid-flight re-split harmless: the new lines come out in their natural
 * resting position, inside a block that is still hidden or still visible.
 *
 * `mask` wraps each line in an overflow-clip parent so the line can rise from
 * below its own line box. Only headline-type tones want that; softer copy
 * (sub, tagline) is unmasked so it can drift and fade freely without being
 * clipped to its line box.
 *
 * autoSplit re-splits when webfonts finish loading and when the container's
 * width changes. SplitText replaces the line elements each time, so `onSplit`
 * re-publishes them: the registry is always the current set, never reverted
 * ones.
 *
 * @param children    text string, or a single element to split
 * @param registryKey publishes line elements for the director
 * @param mask        clip each line so it can rise from beneath itself
 */
export default function Line({
  children,
  registryKey,
  mask = true,
  className = "",
}) {
  const containerRef = useRef(null);

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      const targets = root.hasAttribute("data-line-wrapper")
        ? Array.from(root.children)
        : [root];

      // One token per effect run, so a stale cleanup can never wipe the lines a
      // fresh run (StrictMode, HMR) has already published.
      const owner = {};
      const splits = new Map();

      const publish = () => {
        const lines = [];
        splits.forEach((split) => lines.push(...split.lines));
        registerLines(registryKey, lines, owner);
      };

      targets.forEach((element) => {
        // SplitText measures against the element's own text-indent, which
        // throws off the first line's mask. Capture it once and move it onto
        // the first line after every split (a re-split would otherwise lose it).
        const { textIndent } = window.getComputedStyle(element);
        const hasIndent = textIndent && textIndent !== "0px";

        SplitText.create(element, {
          type: "lines",
          ...(mask ? { mask: "lines" } : {}),
          linesClass: "hush-line",
          autoSplit: true,
          onSplit: (self) => {
            splits.set(element, self);
            if (hasIndent && self.lines[0]) {
              self.lines[0].style.paddingLeft = textIndent;
              element.style.textIndent = "0";
            }
            publish();
          },
        });
      });

      return () => {
        clearLines(registryKey, owner);
        splits.forEach((split) => split.revert());
        splits.clear();
      };
    },
    { scope: containerRef, dependencies: [registryKey, mask] },
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
