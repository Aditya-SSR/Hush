"use client";

import { STOPS, STOPS_MOBILE } from "@/lib/stops";
import Line from "./ui/Line";
import BuyButton from "./ui/BuyButton";

const ALIGN = {
  center: "items-center text-center",
  left: "items-start text-left",
  right: "items-end text-right",
  buy: "items-center text-center",
};

/**
 * Desktop layout.
 *
 * `center` beats stack copy beneath the product. Side beats sit in a gutter at
 * optical centre, on the side opposite wherever the product has been pushed, so
 * copy and product share the frame without ever overlapping.
 */
const POSITION = {
  center: "inset-x-0 bottom-[7vh] px-6",
  left: "inset-y-0 left-0 flex w-full justify-center px-6 py-[22vh] pl-[max(1.5rem,6vw)] sm:w-[52%] sm:py-0",
  right: "inset-y-0 right-0 flex w-full justify-center px-6 py-[22vh] pr-[max(1.5rem,6vw)] sm:w-[52%] sm:py-0",
  buy: "inset-x-0 bottom-[7vh] justify-end px-6",
};

/**
 * Mobile layout.
 *
 * Every mobile beat is centred, so the copy always stacks beneath the product in
 * a single column with a safe gutter. No side alignment — the frame has no room
 * for it.
 */
const POSITION_MOBILE = {
  center: "inset-x-0 bottom-[8vh] px-6",
  buy: "inset-x-0 bottom-[6vh] justify-end px-6",
};

/**
 * Type scale.
 *
 * Instrument Sans carries the entire design across four weights; Inter is
 * reserved for the smallest supporting text only, where its tighter counters
 * stay legible below ~13px.
 *
 * The wordmark deliberately shares the `lead` sizing and weight of the stop
 * headings rather than scaling up as a title would — it is the last beat of the
 * same sequence, not a separate page-level moment.
 */
const TONE = {
  lead: "font-display text-[clamp(1.9rem,4.6vw,4.1rem)] font-medium leading-[1.04] tracking-[-0.035em] text-neutral-900",
  sub: "font-sans mt-[1.15em] inline-block max-w-[28ch] text-[clamp(0.95rem,1.15vw,1.15rem)] leading-[1.55] tracking-[-0.005em] text-neutral-500",
  wordmark:
    "font-display text-[clamp(1.9rem,4.6vw,4.1rem)] font-medium leading-[1.04] tracking-[-0.035em] text-neutral-900",
  // No top margin of its own: the wordmark block's flex gap handles the
  // rhythm, and stacking both left a visible hole under the heading.
  tagline:
    "font-sans text-[clamp(0.95rem,1.1vw,1.1rem)] font-normal leading-[1.4] tracking-[-0.005em] text-neutral-500",
};

function CopyBlock({ stop, index, isMobile }) {
  const isWordmark = stop.copy.some((c) => c.tone === "wordmark");
  const isSide = !isMobile && stop.align !== "center" && stop.align !== "buy";

  const position = isMobile
    ? POSITION_MOBILE.center
    : POSITION[stop.align];

  // The silence beat frames the product so large that a full gutter column
  // would run underneath it. Constrain the measure there so the headline
  // wraps short of the product instead of colliding with it.
  const narrow = stop.id === "silence" && !isMobile;

  return (
    <div
      data-copy={index}
      className={`pointer-events-none absolute flex flex-col opacity-0 will-change-transform ${isSide ? "justify-center" : "justify-end"} ${ALIGN[isMobile ? "center" : stop.align]} ${position}`}
    >
      <div
        className={`${isWordmark ? "flex flex-col items-center gap-3" : ""} ${narrow ? "max-w-[min(30rem,42vw)]" : ""} ${isMobile ? "max-w-[34rem]" : ""}`}
      >
        {stop.copy.map((line, i) => (
          <span key={line.text} className="block overflow-hidden">
            {/*
              `Line` registers its split lines against `beat-{index}-{i}` so the
              film timeline can tween the real elements rather than re-querying
              the DOM. It only prepares the masked, hidden start state — the
              tween itself belongs to the scrubbed timeline, which is what makes
              the reveal reverse when you scroll back up.
            */}
            <Line registryKey={`beat-${index}-${i}`}>
              <span className={`block will-change-transform ${TONE[line.tone]}`}>
                {line.text}
              </span>
            </Line>
          </span>
        ))}

        {isWordmark && (
          <>
            <span className="pointer-events-auto block">
              <BuyButton />
            </span>

            {/*
              Discoverability for the orbit control: without a cue there is no
              way to know the product can be turned.
            */}
            <span
              data-hint
              className="mt-5 block font-sans text-[0.6rem] font-medium tracking-[0.24em] text-neutral-400 uppercase"
            >
              Drag to inspect
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The typography layer.
 *
 * Sits above the canvas as a fixed overlay. Every block is stacked in the same
 * place and cross-faded by the master timeline, so the product is never
 * occluded by copy that belongs to a different beat.
 */
export default function Copy({ mode = "desktop" }) {
  const stops = mode === "mobile" ? STOPS_MOBILE : STOPS;
  const isMobile = mode === "mobile";

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {stops.map((stop, i) => (
        <CopyBlock key={stop.id} stop={stop} index={i} isMobile={isMobile} />
      ))}
    </div>
  );
}