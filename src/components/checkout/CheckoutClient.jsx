"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const SlideToOrder = dynamic(() => import("./SlideToOrder"), { ssr: false });

/**
 * Custom animations for the success popup and drawing the tick mark.
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
  const [placed, setPlaced] = useState(false);

  return (
    <div className="min-h-svh bg-white">
      <style>{ANIMATION_STYLES}</style>
      
      <div className="mx-auto w-full max-w-2xl px-[max(1.25rem,5vw)] pb-[max(3rem,8vh)]">
        {/* Header */}
        <header className="flex items-center justify-between py-6 sm:py-8">
          <Link
            href="/"
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

          <span className="font-sans text-[0.62rem] font-medium tracking-[0.24em] text-neutral-400 uppercase">
            Checkout
          </span>
        </header>

        {/* Title */}
        <div className="pt-6 pb-10 sm:pt-10 sm:pb-14">
          <h1 className={H1}>Checkout</h1>
          <p className="font-sans mt-3 max-w-[42ch] text-[0.98rem] leading-[1.55] tracking-[-0.005em] text-neutral-500">
            Adaptive noise cancelling over-ear. Free two-day shipping and a
            thirty-day return window.
          </p>
        </div>

        {/* Summary Block */}
        <div className="flex flex-col">
          <div className="flex items-start gap-4 sm:gap-5">
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

            <p className="font-display shrink-0 text-[1.05rem] font-medium tracking-[-0.015em] text-neutral-900 tabular-nums">
              $499
            </p>
          </div>

          <dl className="mt-7 flex flex-col gap-3 border-t border-neutral-900/10 pt-6 font-sans text-[0.88rem]">
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
          <div className="mt-8 pt-1">
            <SlideToOrder onComplete={() => setPlaced(true)} />
          </div>

          <ul className="font-sans mt-8 flex flex-col gap-2 text-[0.82rem] text-neutral-500">
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

        <footer className="font-sans mt-14 border-t border-neutral-900/10 pt-6 text-[0.7rem] tracking-[0.02em] text-neutral-400">
          HUSH is a fictional brand. No payment is processed and no card details
          leave this page.
        </footer>
      </div>

      {/* Success Popup Modal */}
      {placed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/60 backdrop-blur-md animate-fade">
          <div className="flex flex-col items-center max-w-sm w-full p-8 bg-white border border-neutral-900/10 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] animate-pop">
            
            {/* Animated Tick Circle */}
            <div className="relative flex items-center justify-center w-20 h-20 mb-6 bg-[#5B6CFF]/10 rounded-full">
              <svg 
                className="w-10 h-10 text-[#5B6CFF]" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <path
                  className="animate-draw stroke-current stroke-[2.5]"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ strokeDasharray: "50", strokeDashoffset: "50" }}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            
            <h3 className="font-display text-2xl font-medium tracking-[-0.02em] text-neutral-900 mb-2">
              Order Confirmed
            </h3>
            
            <p className="font-sans text-center text-[0.92rem] leading-relaxed text-neutral-500 mb-8">
              Order <span className="font-medium text-neutral-900">H1-8842</span> has been placed. We&apos;ve sent a receipt to your email.
            </p>
            
            <button
              onClick={() => setPlaced(false)}
              className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-display font-medium text-[0.95rem] transition-colors duration-200 active:scale-[0.98]"
            >
              Continue Shopping
            </button>
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