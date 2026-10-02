"use client";

import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import Product from "./Product";
import { REST, REST_MOBILE, LIGHTING } from "@/lib/stops";
import { rig, applyStop } from "@/lib/rig";

/**
 * Studio rig.
 *
 * The whole art direction problem here is that the product is black leather and
 * matte plastic, sitting on white. A dark object has no colour to bounce light,
 * and a dark object's own surfaces absorb fill, so the naive setup renders a
 * silhouette. Three things fix that:
 *
 *  1. A bright environment map. Broad, even reflections across the shells —
 *     this is what the metal hardware and the leather sheen actually read from.
 *  2. Rim lights at grazing angles, from behind and beside. These draw the
 *     silhouette's contour as a bright line against the white field, which is
 *     what separates the product from the background instead of letting it
 *     dissolve into a dark blob.
 *  3. A low kicker skimming across the ear cushions at a shallow angle. The
 *     leather grain is a normal-map detail, so it only becomes visible when a
 *     light source rakes across it rather than hitting it flat.
 *
 * Built from Lightformers rather than a photographic HDRI so the environment is
 * self-contained, art-directable, and costs no network round trip.
 */
function Studio() {
  const L = LIGHTING;

  return (
    <>
      <ambientLight intensity={L.ambient} />

      {/* Key: high and front-right, establishes the primary form. */}
      <directionalLight
        position={[5, 8, 6]}
        intensity={L.key}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={34}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      {/* Fill: soft, opposite the key, lifts the shadow side off black. */}
      <directionalLight position={[-7, 2.5, 4]} intensity={L.fill} />

      {/*
        Rim pair: behind and to the sides, angled so the light grazes the
        silhouette. This is the single most important light in the scene for a
        black product on white.
      */}
      <directionalLight position={[-4, 5, -9]} intensity={L.rim} />
      <directionalLight position={[7, 3, -7]} intensity={L.rim * 0.8} />

      {/* Kicker: low, near-horizontal, to rake the leather grain into view. */}
      <directionalLight position={[-9, -1.2, 2]} intensity={L.kicker} />

      <Environment resolution={512} frames={1}>
        {/* Overhead softbox — the dominant broad reflection. */}
        <Lightformer
          intensity={3.2}
          form="rect"
          scale={[14, 9, 1]}
          position={[0, 7, 3]}
          rotation={[-Math.PI / 2.3, 0, 0]}
        />
        {/* Tall side panels wrap the shell in vertical gradient. */}
        <Lightformer
          intensity={2.4}
          form="rect"
          scale={[9, 14, 1]}
          position={[-8, 1, 2]}
          rotation={[0, Math.PI / 2.5, 0]}
        />
        <Lightformer
          intensity={2.4}
          form="rect"
          scale={[9, 14, 1]}
          position={[8, 1, 2]}
          rotation={[0, -Math.PI / 2.5, 0]}
        />
        {/* Behind, to separate the silhouette from the white field. */}
        <Lightformer
          intensity={2.8}
          form="rect"
          scale={[16, 6, 1]}
          position={[0, 2, -8]}
        />
        {/* Bounce from below keeps the underside from crushing. */}
        <Lightformer
          intensity={1.3}
          form="circle"
          scale={6}
          position={[0, -6, 3]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </Environment>
    </>
  );
}

export default function Stage({ mode = "desktop", orbit = false }) {
  const rest = mode === "mobile" ? REST_MOBILE : REST;

  useEffect(() => {
    Object.assign(rig, applyStop(rest));
  }, [rest]);

  return (
    <div
      className={`fixed inset-0 z-0 ${orbit ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{
          fov: rest.cam.fov,
          near: 0.1,
          far: 100,
          position: [rest.cam.x, rest.cam.y, rest.cam.z],
        }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = rest.exposure;
          scene.background = null;
        }}
      >
        <Suspense fallback={null}>
          <Studio />
          <Product />
        </Suspense>
      </Canvas>
    </div>
  );
}