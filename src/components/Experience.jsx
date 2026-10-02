"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Chrome, { Curtain, Fallback } from "./ui/Chrome";
import Copy from "./Copy";
import Film from "./Film";
import Footer from "./Footer";
import SmoothScroll from "./SmoothScroll";
import ProductOrbit from "./ProductOrbit";
import useArtDirection from "./useArtDirection";

// Only the WebGL stage needs to be excluded from SSR. `Copy` must be a static
// import: GSAP resolves its selector strings to elements when each tween is
// built, so if Copy mounted in a later commit than Film's timeline, every copy
// tween would capture an empty target list and silently do nothing.
const Stage = dynamic(() => import("./three/Stage"), { ssr: false });

export default function Experience() {
  const mode = useArtDirection();
  // The film reports when the closing beat is on screen; that is the only
  // point where the product is handed to the viewer.
  const [orbit, setOrbit] = useState(false);

  return (
    <>
      <SmoothScroll />

      {/*
        Held until the viewport is known. The mobile and desktop films differ in
        beat count, poses and scroll length, so committing before the
        measurement arrives would build the wrong timeline and then rebuild it
        under the viewer.
      */}
      {mode ? (
        <>
          <Stage mode={mode} orbit={orbit} />
          <ProductOrbit enabled={orbit} />
          <Film mode={mode} onOrbitChange={setOrbit}>
            <Copy mode={mode} />
          </Film>
          <Footer />
        </>
      ) : null}

      <Chrome />
      <Curtain />
      <noscript>
        <Fallback />
      </noscript>
    </>
  );
}