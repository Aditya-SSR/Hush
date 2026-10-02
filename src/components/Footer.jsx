"use client";

import dynamic from "next/dynamic";

const AsciiWordmark = dynamic(() => import("./ui/AsciiWordmark"), {
  ssr: false,
});

/**
 * Closing footer.
 *
 * The ASCII wordmark is the whole event, so the panel is sized to the content
 * rather than to the viewport: a full-height footer with a single line of type
 * in it was mostly empty space. Half the viewport gives the wordmark the
 * weight it needs without stranding the composition.
 *
 * The panel is opaque black above the WebGL stage, which also does the useful
 * job of covering the product once the film is over.
 */
export default function Footer() {
  return (
    <footer className="relative z-10 flex h-[46svh] min-h-[340px] w-full flex-col justify-between overflow-hidden bg-[#08080a]">
      {/*
        Wordmark spans the full width edge to edge. `fullWidth` makes the ASCII
        grid stretch to the panel's own bounds rather than sitting inset.
      */}
      <div className="min-h-0 flex-1 px-4 pt-[3vh]">
        <AsciiWordmark text="HUSH BY LYNX" fullWidth />
      </div>

      {/*
        Credit row on a three-column grid so the copyright genuinely sits at the
        optical centre — flex-1 columns skew it off-centre whenever one side's
        content is a different width.
      */}
      <div className="grid shrink-0 grid-cols-3 items-end gap-4 px-[max(1.25rem,3.5vw)] pb-[max(1.25rem,2.2vh)]">
        <span className="justify-self-start font-sans text-[0.6rem] font-medium tracking-[0.24em] text-white/35 uppercase max-sm:hidden">
          Silence, made visible.
        </span>

        <span className="col-start-2 flex items-center justify-center gap-2 font-sans text-[0.68rem] font-medium tracking-[0.02em] text-white/60">
          <span aria-hidden="true">©</span>
          <span>Made by Lynx</span>
        </span>

        <a
          href="https://github.com/Aditya-SSR"
          target="_blank"
          rel="noopener noreferrer"
          className="col-start-3 flex items-center justify-end gap-2 font-sans text-[0.68rem] font-medium tracking-[0.02em] text-white/60 transition-colors duration-300 hover:text-white focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B6CFF]"
          aria-label="Aditya-SSR on GitHub"
        >
          <span className="max-sm:hidden">Aditya-SSR</span>
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
      </div>
    </footer>
  );
}