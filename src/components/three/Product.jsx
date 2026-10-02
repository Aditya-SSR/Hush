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
 * Drives the scene from the GSAP-authored `rig` values.
 *
 * ScrollTrigger scrubs `rig`; this loop damps the live scene toward it. That
 * second layer of damping is what gives the film its weight — the product
 * glides into each mark instead of snapping to it.
 */
function RigDriver() {
  const pivot = useRef(null);
  const target = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const g = pivot.current;
    if (!g) return;

    const { camera, gl } = state;

    const k = 3.4;
    const dt = Math.min(delta, 0.05);

    /**
     * Viewer orbit.
     *
     * While dragging, the offset follows the pointer with a light lag so the
     * product feels weighted rather than welded to the cursor. Once released it
     * decays back to zero, which returns the product to exactly the pose the
     * scroll timeline authored — the two never fight, because the orbit is an
     * additive offset that is always heading back to identity.
     */
    if (rig.grab > 0) {
      rig.orbitY = damp(rig.orbitY, rig.orbitTargetY, 11, dt);
      rig.orbitX = damp(rig.orbitX, rig.orbitTargetX, 11, dt);
    } else {
      rig.orbitY = damp(rig.orbitY, 0, 3.2, dt);
      rig.orbitX = damp(rig.orbitX, 0, 3.2, dt);
    }

    g.position.x = damp(g.position.x, rig.mx, k, dt);
    g.position.y = damp(g.position.y, rig.my, k, dt);
    g.position.z = damp(g.position.z, rig.mz, k, dt);

    g.rotation.x = damp(g.rotation.x, rig.rx + rig.orbitX, k, dt);
    g.rotation.y = damp(g.rotation.y, rig.ry + rig.orbitY, k, dt);
    g.rotation.z = damp(g.rotation.z, rig.rz, k, dt);

    const s = damp(g.scale.x, rig.s, k, dt);
    g.scale.setScalar(s);

    camera.position.x = damp(camera.position.x, rig.cx, k, dt);
    camera.position.y = damp(camera.position.y, rig.cy, k, dt);
    camera.position.z = damp(camera.position.z, rig.cz, k, dt);

    if (Math.abs(camera.fov - rig.fov) > 0.001) {
      camera.fov = damp(camera.fov, rig.fov, k, dt);
      camera.updateProjectionMatrix();
    }

    gl.toneMappingExposure = damp(
      gl.toneMappingExposure,
      rig.exposure,
      k,
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