/**
 * The bridge between GSAP and the render loop.
 *
 * GSAP's ScrollTrigger timeline writes plain numbers into `rig`; the R3F
 * `useFrame` loop in Product.jsx damps the live objects toward whatever `rig`
 * currently holds. Nothing here is React state, so scrolling never triggers a
 * re-render — the whole film runs outside the reconciler.
 */
export const rig = {
  mx: 0,
  my: 0.72,
  mz: 0,
  rx: -0.04,
  ry: 0,
  rz: 0,
  s: 1.0,
  cx: 0,
  cy: 0.18,
  cz: 9.4,
  fov: 30,
  exposure: 1.08,
  /**
   * User-driven orbit offset, in radians.
   *
   * Separate from `ry`/`rx` because those belong to the scroll timeline: the
   * timeline must keep writing the film's pose while the viewer is turning the
   * product. These accumulate on top and are always decaying back to zero, so
   * the product can never be left in a state the film did not author.
   */
  orbitY: 0,
  orbitX: 0,
  /** Where the pointer has dragged the product to, in radians. */
  orbitTargetY: 0,
  orbitTargetX: 0,
  /** 1 while the viewer is dragging, 0 otherwise. */
  grab: 0,
};

export function applyStop(stop) {
  const { model, cam, exposure } = stop;
  return {
    mx: model.x,
    my: model.y,
    mz: model.z,
    rx: model.rx,
    ry: model.ry,
    rz: model.rz,
    s: model.s,
    cx: cam.x,
    cy: cam.y,
    cz: cam.z,
    fov: cam.fov,
    exposure,
  };
}