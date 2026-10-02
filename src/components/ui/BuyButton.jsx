"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Buy button.
 *
 * A dark pill: label, hairline divider, price, and a circular arrow chip that
 * lifts on hover. The arrow is the point of interaction, so it does the work —
 *
 *   1. it rotates ~45° so it points up-and-right, the direction of travel, and
 *      slightly overshoots before settling (back.out), which is what sells the
 *      "premium" read rather than a plain spin;
 *   2. it scales up and inverts against the pill;
 *   3. the pill's own fill lifts from near-black to full black.
 *
 * Renders as a real link to the checkout so the destination is openable in a
 * new tab, shareable, and crawlable — while the hover animation is identical.
 */
export default function BuyButton({
  label = "Get H1",
  price = "$499",
  href = "/checkout",
  className = "",
  onClick,
  ...attributes
}) {
  // `root` and `pill` are the same node — the pill *is* the link. An earlier
  // version kept a second ref for it that was never attached to anything, so
  // the fill tween below had a null target and the pill never lifted.
  const root = useRef(null);
  const arrow = useRef(null);
  const chip = useRef(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduced) return;

      const tl = gsap
        .timeline({ paused: true })
        .to(arrow.current, {
          rotate: 45,
          duration: 0.7,
          ease: "back.out(2.2)",
        })
        .to(chip.current, { scale: 1.14, duration: 0.5, ease: "power3.out" }, 0)
        .to(root.current, { backgroundColor: "#000000", duration: 0.45, ease: "power2.out" }, 0);

      const enter = () => tl.play();
      const leave = () => tl.reverse();

      const el = root.current;
      el.addEventListener("mouseenter", enter);
      el.addEventListener("mouseleave", leave);
      el.addEventListener("focus", enter);
      el.addEventListener("blur", leave);

      return () => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
        el.removeEventListener("focus", enter);
        el.removeEventListener("blur", leave);
        tl.kill();
      };
    },
    { scope: root },
  );

  return (
    <Link
      ref={root}
      href={href}
      onClick={onClick}
      // No `transition-colors` here. The only colour that changes on this
      // element is the background, and GSAP owns it — a CSS transition on the
      // same property chases GSAP's per-frame inline writes, which pinned the
      // fill at its start colour for ~2.5s and then snapped it, so the hover
      // read as broken.
      className={`group pointer-events-auto inline-flex items-center gap-5 rounded-full bg-[#111111] py-2 pl-7 pr-2 text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B6CFF] ${className}`}
      {...attributes}
    >
      <span className="font-display text-[0.82rem] font-medium tracking-[-0.005em]">
        {label}
      </span>

      <span aria-hidden="true" className="h-4 w-px bg-white/25" />

      <span className="font-display text-[0.82rem] font-normal tracking-[-0.005em] text-white/70">
        {price}
      </span>

      <span
        ref={chip}
        className="ml-1 grid size-10 place-items-center rounded-full bg-white"
      >
        <svg
          ref={arrow}
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          aria-hidden="true"
          className="translate-x-[1px]"
        >
          <path
            d="M3 12L12 3M12 3H5.5M12 3V9.5"
            stroke="#111111"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}