"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * AsciiWordmark.
 *
 * Renders the HUSH wordmark as a grid of ASCII characters on black. The letters
 * are sampled from a real glyph render — the word is drawn to an offscreen
 * canvas in Instrument Sans, then every cell's brightness is mapped onto a
 * character ramp — so the ASCII is a true reproduction of the typeface rather
 * than a hand-typed approximation.
 *
 * Interaction is the spring model from the reference implementation: characters
 * near the cursor are pushed away along the vector from it, then pulled back to
 * their home position by a spring and bled off by damping. Each glyph is a
 * particle with its own offset and velocity, so the field ripples and settles
 * rather than snapping.
 *
 * Driven from gsap.ticker rather than its own rAF, so the whole page runs on a
 * single frame loop — the same reason the film's scroll rig does.
 */
export default function AsciiWordmark({
  text = "HUSH",
  fullWidth = false,
}) {
  const canvasRef = useRef(null);

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { alpha: false });
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Dense ramp: a coarse one leaves the wordmark looking like scattered
      // punctuation rather than lettering.
      const RAMP = " .'`^\",:;Il!i><~+_-?}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
      const CHAR_COLOR = "#f5f5f4";
      const BG_COLOR = "#0a0a0a";

      const PUSH_RADIUS = 5.2;
      const PUSH_FORCE = 34;
      const SPRING = 0.024;
      const DAMPING = 0.5;

      let cell = 8;
      let step = 10;
      let cols = 0;
      let rows = 0;
      let cells = [];
      let raf = null;
      let tickFn = null;

      const mouse = { x: -9999, y: -9999, active: false };
      let idleTimer = null;

      /** Draws the word in the real typeface, for the grid to sample. */
      const sample = () => {
        const fontFamily = `${
          getComputedStyle(document.body).getPropertyValue(
            "--font-instrument-sans",
          )
        }, sans-serif`;

        /**
         * Size the word to the grid rather than to the canvas, so the letters
         * actually resolve — drawn at canvas scale, most cells sample empty and
         * the wordmark reads as scattered marks.
         *
         * The fill factor is derived from the font's measured advance width
         * rather than guessed from the character count. A string with wide
         * glyphs ("HUSH BY LYNX" carries three W-width letters) otherwise
         * overflows the panel and the tail gets clipped off the right edge.
         *
         * fullWidth stretches the word to the panel's full width; otherwise it
         * is inset. Vertical headroom is kept so tall glyphs never clip.
         */
        const targetWidth = cols * step * (fullWidth ? 0.99 : 0.84);
        const targetHeight = rows * step * 0.5;

        const measure = document.createElement("canvas");
        const mctx = measure.getContext("2d");
        mctx.font = `600 100px ${fontFamily}`;
        const measured = mctx.measureText(text).width || 1;

        // Solve for the size whose drawn width matches the target. Clamped to a
        // minimum of 1px: a zero font size would produce a zero-height probe
        // canvas, which getImageData rejects.
        const fontPx = Math.max(
          1,
          Math.min((targetWidth / (measured / 100)) * 0.92, targetHeight),
        );

        const probe = document.createElement("canvas");
        const pctx = probe.getContext("2d", { willReadFrequently: true });

        pctx.font = `600 ${fontPx}px ${fontFamily}`;
        const metrics = pctx.measureText(text);

        const w = Math.max(1, Math.ceil(metrics.width) + Math.ceil(fontPx * 0.12));
        const h = Math.ceil(fontPx * 1.35);

        probe.width = w;
        probe.height = h;

        // Re-apply after resizing the canvas; resizing resets 2D state.
        pctx.font = `600 ${fontPx}px ${fontFamily}`;
        pctx.textAlign = "center";
        pctx.textBaseline = "middle";
        pctx.fillStyle = "#000";
        pctx.fillRect(0, 0, w, h);
        pctx.fillStyle = "#fff";
        pctx.fillText(text, w / 2, h / 2);

        return { data: pctx.getImageData(0, 0, w, h).data, w, h };
      };

      const build = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        cell = window.innerWidth < 640 ? 4 : window.innerWidth < 1200 ? 6 : 8;
        step = cell + Math.max(1, Math.round(cell * 0.2));

        cols = Math.ceil(canvas.clientWidth / step);
        rows = Math.ceil(canvas.clientHeight / step);

        // Bail while the element has no box.
        //
        // A resize (or the footer's first layout pass) can hand us a zero-size
        // canvas. Without this guard every dimension downstream collapses to 0
        // and `getImageData(0, 0, w, 0)` throws IndexSizeError, taking the whole
        // page down with it. The next resize or the initial effect will rebuild.
        if (cols < 1 || rows < 1) return;

        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

        const { data, w, h } = sample();

        // Stretch the sampled glyph across the full grid width. Rows are
        // derived from the glyph's aspect ratio so the letters keep their
        // proportions instead of shearing, then centred vertically.
        const glyphCols = cols;
        // Rows the glyph occupies, derived from its pixel aspect ratio scaled by
        // the cell's aspect ratio (cells are taller than they are wide, so this
        // keeps the letters from stretching vertically).
        const glyphRows = Math.max(
          1,
          Math.min(rows, Math.round((cols * (h / w)) * (step / cell))),
        );
        const originX = 0;
        const originY = Math.max(
          0,
          Math.floor((rows - glyphRows) / 2),
        );

        const next = [];
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const gx = col - originX;
            const gy = row - originY;

            let char = " ";
            let lit = false;

            if (gx >= 0 && gx < w && gy >= 0 && gy < h) {
              const px = Math.floor((gx * w) / glyphCols);
              const py = Math.floor((gy * h) / glyphRows);
              const i = (py * w + px) * 4;
              const lum =
                (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) /
                255;

              if (lum > 0.18) {
                lit = true;
                const idx = Math.min(
                  RAMP.length - 1,
                  Math.max(1, Math.floor(lum * RAMP.length)),
                );
                char = RAMP[idx];
              }
            }

            next.push({
              col,
              row,
              char,
              lit,
              ox: 0,
              oy: 0,
              vx: 0,
              vy: 0,
            });
          }
        }
        cells = next;
      };

      const draw = () => {
        // No cells yet means build() bailed on a zero-size canvas.
        if (!cells.length) return;

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);

        ctx.font = `${cell + 1}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = CHAR_COLOR;

        for (const c of cells) {
          if (!c.lit) continue;
          ctx.fillText(
            c.char,
            (c.col + c.ox) * step + step / 2,
            (c.row + c.oy) * step + step / 2,
          );
        }
      };

      const stepPhysics = () => {
        for (const c of cells) {
          if (!c.lit) continue;

          if (mouse.active) {
            const dx = c.col + c.ox - mouse.x;
            const dy = c.row + c.oy - mouse.y;
            const dist = Math.hypot(dx, dy);

            if (dist < PUSH_RADIUS && dist > 0.001) {
              const falloff = (1 - dist / PUSH_RADIUS) ** 2 * PUSH_FORCE;
              c.vx += (dx / dist) * falloff;
              c.vy += (dy / dist) * falloff;
            }
          }

          c.vx += -c.ox * SPRING;
          c.vy += -c.oy * SPRING;
          c.vx *= DAMPING;
          c.vy *= DAMPING;
          c.ox += c.vx;
          c.oy += c.vy;

          // Snap to rest once the glyph is visually home, so settled cells stop
          // costing anything.
          if (Math.abs(c.ox) < 0.02 && Math.abs(c.vx) < 0.02) c.ox = c.vx = 0;
          if (Math.abs(c.oy) < 0.02 && Math.abs(c.vy) < 0.02) c.oy = c.vy = 0;
        }
      };

      const loop = () => {
        stepPhysics();
        draw();
      };

      if (reduced) {
        // Static render: the wordmark, no interaction, no ticker.
        build();
        draw();
      } else {
        build();
        tickFn = () => loop();
        gsap.ticker.add(tickFn);

        const onMove = (e) => {
          const r = canvas.getBoundingClientRect();
          mouse.x = (e.clientX - r.left) / step;
          mouse.y = (e.clientY - r.top) / step;
          mouse.active = true;
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            mouse.active = false;
          }, 90);
        };

        const onLeave = () => {
          mouse.x = mouse.y = -9999;
          mouse.active = false;
        };

        canvas.addEventListener("mousemove", onMove);
        canvas.addEventListener("mouseleave", onLeave);

        /**
         * Rebuild on resize.
         *
         * Deferred to the next frame because the window resize event fires
         * before layout has settled: the canvas can still measure zero at that
         * point, and drawing then throws. Waiting a frame means we measure the
         * real box. The ResizeObserver covers the case where the panel changes
         * size without the window doing so.
         */
        let pending = 0;
        const rebuild = () => {
          cancelAnimationFrame(pending);
          pending = requestAnimationFrame(() => {
            build();
            draw();
          });
        };

        window.addEventListener("resize", rebuild);

        const observer =
          typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(rebuild)
            : null;
        observer?.observe(canvas);

        return () => {
          cancelAnimationFrame(pending);
          window.removeEventListener("resize", rebuild);
          observer?.disconnect();
          canvas.removeEventListener("mousemove", onMove);
          canvas.removeEventListener("mouseleave", onLeave);
          if (idleTimer) clearTimeout(idleTimer);
          if (tickFn) gsap.ticker.remove(tickFn);
          if (raf) cancelAnimationFrame(raf);
        };
      }

      return () => {
        if (idleTimer) clearTimeout(idleTimer);
        if (tickFn) gsap.ticker.remove(tickFn);
      };
    },
    { dependencies: [text, fullWidth] },
  );

  return (
    <canvas
      ref={canvasRef}
      aria-label={`${text} wordmark`}
      role="img"
      className="block size-full"
    />
  );
}