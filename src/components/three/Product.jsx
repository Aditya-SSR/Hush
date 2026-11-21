"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MODEL_URL, DRACO_PATH, TARGET_WIDTH, LIGHTING } from "@/lib/stops";
import { rig } from "@/lib/rig";

const damp = THREE.MathUtils.damp;

/**
 * The product.
 *
 * The GLB is Draco-compressed and authored in millimetres with its origin
 * off-centre, so we measure the real bounds once and fit it to TARGET_WIDTH,
 * centred on the origin. Fitting from measured geometry rather than trusting
 * the file's declared bounding box keeps framing exact regardless of how the
 * exporter wrote it.
 *
 * Draco's decoder is served from /draco rather than a CDN, so the page makes no
 * third-party requests and cannot be broken by an external host.
 */
function Headphone() {
  const inner = useRef(null);
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);

  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const fit = TARGET_WIDTH / Math.max(size.x, size.y, size.z);

    return { scale: fit, offset: center.clone().multiplyScalar(-fit) };
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if (!child.isMesh) return;

      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((m) => {
        if (!m) return;
        // Lift environment response so the leather sheen and metal read
        // against the white field instead of flattening out.
        m.envMapIntensity = LIGHTING.envIntensity;
        m.needsUpdate = true;
      });
    });
  }, [scene]);

  return (
    <group ref={inner} scale={scale} position={offset}>
      <primitive object={scene} />
    </group>
  );
}

/**
 * Follow rates (1/seconds) for the damped approach to the rig, per channel.
 *
 * The timeline already choreographs each move, and Lenis + a short scrub sit
 * upstream, so this layer only needs to take the last bit of edge off: a time
 * constant of roughly 0.12-0.15s. It tracks the scroll tightly and settles well
 * inside a hold, while still giving the weighted, un-robotic arrival. Camera is
 * a touch slower than the product so the world trails the object slightly.
 */
const FOLLOW = { rot: 8, pos: 7.5, cam: 7, lens: 8, exposure: 5 };

/**
 * Drives the scene from the GSAP-authored `rig` values.
 *
 * ScrollTrigger scrubs `rig`; this loop damps the live scene toward it.
 */
function RigDriver() {
  const pivot = useRef(null);
  const target = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const g = pivot.current;
    if (!g) return;

    const { camera, gl } = state;

    // Frame-rate independent (THREE.damp is exponential in dt). The clamp only
    // guards against a huge first frame or a tab-resume spike; 0.1s still lets
    // the product arrive on a slow frame instead of crawling in slow motion.
    const dt = Math.min(delta, 0.1);

    /**
     * Viewer orbit.
     *
     * While dragging, the offset follows the pointer with a light lag so the
     * product feels weighted rather than welded to the cursor.
     *
     * On release it coasts: the flick's angular velocity carries the product a
     * little further in the direction it was thrown, then both the velocity and
     * the target decay back to zero. Without that inertia the product snapped
     * straight back on release and the gesture read as one-directional — the
     * product appeared to spin out but never settle back on its own axis.
     */
    if (rig.grab > 0) {
      rig.orbitY = damp(rig.orbitY, rig.orbitTargetY, 11, dt);
      rig.orbitX = damp(rig.orbitX, rig.orbitTargetX, 11, dt);
    } else {
      // Coast, then bleed off.
      rig.orbitTargetY += rig.orbitVel * dt;
      rig.orbitVel *= Math.exp(-7 * dt);
      if (Math.abs(rig.orbitVel) < 0.002) rig.orbitVel = 0;

      // Ease the accumulated target home. Exponential, so it never overshoots
      // and always returns to exactly the pose the timeline authored.
      rig.orbitTargetY *= Math.exp(-2.4 * dt);
      rig.orbitTargetX *= Math.exp(-2.4 * dt);
      if (Math.abs(rig.orbitTargetY) < 0.0004) rig.orbitTargetY = 0;
      if (Math.abs(rig.orbitTargetX) < 0.0004) rig.orbitTargetX = 0;

      rig.orbitY = damp(rig.orbitY, rig.orbitTargetY, 6, dt);
      rig.orbitX = damp(rig.orbitX, rig.orbitTargetX, 6, dt);
    }

    g.position.x = damp(g.position.x, rig.mx, FOLLOW.pos, dt);
    g.position.y = damp(g.position.y, rig.my, FOLLOW.pos, dt);
    g.position.z = damp(g.position.z, rig.mz, FOLLOW.pos, dt);

    g.rotation.x = damp(g.rotation.x, rig.rx + rig.orbitX, FOLLOW.rot, dt);
    g.rotation.y = damp(g.rotation.y, rig.ry + rig.orbitY, FOLLOW.rot, dt);
    g.rotation.z = damp(g.rotation.z, rig.rz, FOLLOW.rot, dt);

    const s = damp(g.scale.x, rig.s, FOLLOW.lens, dt);
    g.scale.setScalar(s);

    camera.position.x = damp(camera.position.x, rig.cx, FOLLOW.cam, dt);
    camera.position.y = damp(camera.position.y, rig.cy, FOLLOW.cam, dt);
    camera.position.z = damp(camera.position.z, rig.cz, FOLLOW.cam, dt);

    if (Math.abs(camera.fov - rig.fov) > 0.001) {
      camera.fov = damp(camera.fov, rig.fov, FOLLOW.lens, dt);
      camera.updateProjectionMatrix();
    }

    gl.toneMappingExposure = damp(
      gl.toneMappingExposure,
      rig.exposure,
      FOLLOW.exposure,
      dt,
    );

    camera.lookAt(target.current.set(rig.cx * 0.22, rig.cy * 0.3, 0));
  });

  return (
    <group ref={pivot} position={[rig.mx, rig.my, rig.mz]} scale={rig.s}>
      <Headphone />
    </group>
  );
}

export default function Product() {
  return (
    <>
      <RigDriver />
      <ContactPlane />
    </>
  );
}

/**
 * A soft shadow catcher, kept far below the product.
 *
 * The product floats in an open white void, so the shadow is pushed well clear
 * of the frame's centre and the type that lives there — a grounding hint, not a
 * floor the viewer reads as solid ground.
 */
function ContactPlane() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -4.6, 0]}
      receiveShadow
    >
      <planeGeometry args={[40, 40]} />
      <shadowMaterial opacity={0.09} transparent />
    </mesh>
  );
}

useGLTF.preload(MODEL_URL, DRACO_PATH);