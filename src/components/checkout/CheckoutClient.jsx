"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const SlideToOrder = dynamic(() => import("./SlideToOrder"), { ssr: false });

/**
 * Custom animations for the page entrance, the confirmation dialog and the
 * tick mark. Transform and opacity only; all of it is switched off for
 * `prefers-reduced-motion`.
 */
const ANIMATION_STYLES = `
  @keyframes draw-check {
    0% { stroke-dasharray: 50; stroke-dashoffset: 50; }
    100% { stroke-dasharray: 50; stroke-dashoffset: 0; }
  }
  @keyframes pop-in {
    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes fade-bg {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes rise {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .animate-draw {
    animation: draw-check 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    animation-delay: 0.15s;
  }
  .animate-pop {
    animation: pop-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .animate-fade {
    animation: fade-bg 0.3s ease-out forwards;
  }
  .rise {
    animation: rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(var(--i, 0) * 70ms);
  }
  @media (prefers-reduced-motion: reduce) {
    .rise, .animate-pop, .animate-fade { animation: none !important; }
    .animate-draw { animation: none !important; stroke-dashoffset: 0 !important; }
  }
`;

/**
 * Display type.
 */
const H1 =
  "font-display text-[clamp(1.9rem,4.6vw,4.1rem)] font-medium leading-[1.04] tracking-[-0.035em] text-neutral-900";

/** Minimal headphone glyph. */
function ProductMark() {
  return (
    <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-neutral-900/[0.05] sm:size-24">
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M11 27v-6a13 13 0 0 1 26 0v6"
          stroke="#171717"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <rect x="6.5" y="25" width="9" height="13" rx="4.5" fill="#171717" />
        <rect x="32.5" y="25" width="9" height="13" rx="4.5" fill="#171717" />
      </svg>
    </span>
  );
}

export default function Checkout() {
  const [open, setOpen] = useState(false);
  const cta = useRef(null);

  // The slider plays its own confirmation first, then hands over to the dialog.
  const handleComplete = () => setOpen(true);

  useEffect(() => {
    if (!open) return;
    cta.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-svh bg-white">
      <style>{ANIMATION_STYLES}</style>

      {/* `inert` keeps keyboard and screen-reader focus inside the dialog. */}
      <main
        inert={open}
        className="mx-auto w-full max-w-2xl px-[max(1.25rem,5vw)] pb-[max(3rem,8vh)]"
      >
        {/* Header */}
        <header className="py-6 sm:py-8">
          <Link
            href="/"
            aria-label="Back to Hush H1"
            className="font-sans inline-flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.24em] text-neutral-500 uppercase transition-colors duration-300 hover:text-neutral-900 focus-visible:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B6CFF]"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M14 8H3M7 4L3 8l4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Hush H1
          </Link>
        </header>

        {/* Title */}
        <div className="rise pt-6 pb-10 sm:pt-10 sm:pb-14" style={{ "--i": 0 }}>
          <h1 className={H1}>Checkout</h1>
          <p className="font-sans mt-3 max-w-[42ch] text-[0.98rem] leading-[1.55] tracking-[-0.005em] text-neutral-500">
            Review your order, then slide to confirm.
          </p>
        </div>

        {/* Summary Block */}
        <div className="flex flex-col">
          <div className="rise flex items-start gap-4 sm:gap-5" style={{ "--i": 1 }}>
            <ProductMark />

            <div className="min-w-0 flex-1 pt-1">
              <h2 className="font-display text-[1.05rem] font-medium tracking-[-0.015em] text-neutral-900">
                Hush H1
              </h2>
              <p className="font-sans mt-1 text-[0.85rem] leading-[1.5] text-neutral-500">
                Midnight. Adaptive noise cancelling over-ear.
              </p>
              <p className="font-sans mt-2 text-[0.8rem] text-neutral-500">
                Quantity 1
              </p>
            </div>

            <p className="font-display shrink-0 pt-1 text-[1.05rem] font-medium tracking-[-0.015em] text-neutral-900 tabular-nums">
              $499
            </p>
          </div>

          <dl
            className="rise mt-7 flex flex-col gap-3 border-t border-neutral-900/10 pt-6 font-sans text-[0.88rem]"
            style={{ "--i": 2 }}
          >
            <div className="flex justify-between">
              <dt className="text-neutral-500">Subtotal</dt>
              <dd className="text-neutral-900 tabular-nums">$499</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Shipping</dt>
              <dd className="text-neutral-900">Free</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Estimated tax</dt>
              <dd className="text-neutral-900 tabular-nums">$40</dd>
            </div>

            <div className="mt-2 flex items-baseline justify-between border-t border-neutral-900/10 pt-5">
              <dt className="font-display text-[1rem] font-medium tracking-[-0.015em] text-neutral-900">
                Total
              </dt>
              <dd className="font-display text-[1.35rem] font-medium tracking-[-0.02em] text-neutral-900 tabular-nums">
                $539
              </dd>
            </div>
          </dl>

          {/* Slide To Order Component */}
          <div className="rise mt-10" style={{ "--i": 3 }}>
            <SlideToOrder onComplete={handleComplete} />
          </div>

          <ul
            className="rise font-sans mt-6 flex flex-col gap-2 text-[0.82rem] text-neutral-500"
            style={{ "--i": 4 }}
          >
            <li className="flex items-center gap-2">
              <Tick />
              Free two-day shipping
            </li>
            <li className="flex items-center gap-2">
              <Tick />
              Thirty-day returns
            </li>
            <li className="flex items-center gap-2">
              <Tick />
              Two-year warranty
            </li>
          </ul>
        </div>

        <footer className="font-sans mt-14 border-t border-neutral-900/10 pt-6 text-[0.7rem] tracking-[0.02em] text-neutral-500">
          HUSH is a fictional brand. No payment is processed and no card details
          leave this page.
        </footer>
      </main>

      {/* Confirmation dialog */}
      {open && (
        <div className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-white/60 p-4 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-confirmed-title"
            className="animate-pop flex w-full max-w-sm flex-col items-center rounded-[2rem] border border-neutral-900/10 bg-white p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)]"
          >
            {/* Animated tick circle */}
            <div className="relative mb-6 flex size-20 items-center justify-center rounded-full bg-[#5B6CFF]/10">
              <svg className="size-10 text-[#5B6CFF]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  className="animate-draw stroke-current stroke-[2.5]"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ strokeDasharray: "50", strokeDashoffset: "50" }}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2
              id="order-confirmed-title"
              className="font-display mb-2 text-2xl font-medium tracking-[-0.02em] text-neutral-900"
            >
              Order confirmed
            </h2>

            <p className="font-sans text-center text-[0.92rem] leading-relaxed text-neutral-500">
              Order{" "}
              <span className="font-medium text-neutral-900">H1-8842</span>{" "}
              has been placed. We&apos;ve sent a receipt to your email.
            </p>

            <div className="font-sans mt-6 mb-8 flex w-full items-baseline justify-between border-t border-neutral-900/10 pt-4 text-[0.88rem]">
              <span className="text-neutral-500">Hush H1, Midnight</span>
              <span className="font-display font-medium text-neutral-900 tabular-nums">$539</span>
            </div>

            {/* Real navigation. The old button only closed the dialog and left
                the slider locked on a finished order with nowhere to go. */}
            <Link
              ref={cta}
              href="/"
              className="font-display block w-full rounded-xl bg-neutral-900 px-6 py-4 text-center text-[0.95rem] font-medium text-white transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B6CFF]"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M2.5 6.5L5 9l4.5-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
