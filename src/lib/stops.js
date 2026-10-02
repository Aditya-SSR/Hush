/**
 * HUSH — art direction.
 *
 * Every stop is a complete, hand-tuned state for the product: where it sits in
 * frame, how it is turned, and where the camera looks from. GSAP scrubs between
 * these values; the render loop damps toward them.
 *
 * Model axes, read from the GLB: +Y up, earcups on +/-X, band arcing across +Y,
 * and the ear cushions facing +/-Z. So:
 *   ry 0        front elevation (band across the top, cups either side)
 *   ry ~ -1.57  an earcup turned square to camera
 *   rx ~ 1.15   tipped to look down onto the headband / rim
 *
 * `cam.x` matters as much as `model.x`: the camera tracks the product, so the
 * two must move together or the product re-centres itself and collides with the
 * copy. Close-up beats need a much larger separation than the wide beats.
 */

/** Viewport at or below which the mobile art direction takes over. */
export const MOBILE_BREAKPOINT = 900;

export const MODEL_URL = "/models/hush-h1-draco.glb";

/** Self-hosted Draco decoder, so no request leaves the deployment. */
export const DRACO_PATH = "/draco/";

/**
 * Runtime-fit the product to this world-space width, centred on origin.
 *
 * Tuned up from 3.15: the Draco pass left the silhouette reading slightly small
 * in frame, and the product should own the composition rather than sit inside
 * it. Bigger target, and larger per-beat scales below.
 */
export const TARGET_WIDTH = 3.62;

/** Resting state, identical to STOPS[0]. Applied before first paint. */
export const REST = {
  model: { x: 0, y: 0.72, z: 0, rx: -0.04, ry: 0, rz: 0, s: 1.0 },
  cam: { x: 0, y: 0.18, z: 9.4, fov: 30 },
  exposure: 1.08,
};

export const STOPS = [
  {
    id: "intro",
    align: "center",
    model: { x: 0, y: 0.72, z: 0, rx: -0.04, ry: 0, rz: 0, s: 1.0 },
    cam: { x: 0, y: 0.18, z: 9.4, fov: 30 },
    exposure: 1.08,
    copy: [
      { text: "There is enough noise in the world.", tone: "lead" },
      { text: "Make room for what is worth hearing.", tone: "lead" },
    ],
  },
  {
    // Designed to disappear — the product turns to present its silhouette and
    // construction. Product held right of frame, copy in the left gutter.
    id: "design",
    align: "left",
    model: { x: 1.78, y: 0.34, z: 0, rx: -0.04, ry: -0.26, rz: 0.02, s: 0.98 },
    cam: { x: 0.92, y: 0.12, z: 8.6, fov: 30 },
    exposure: 1.06,
    copy: [
      { text: "Designed to disappear.", tone: "lead" },
      { text: "Every curve, surface, and detail has a purpose.", tone: "sub" },
    ],
  },
  {
    // Every detail matters — raked onto the top of the headband so the rim,
    // stitching and slider construction read as the subject.
    //
    // The camera stays low on purpose. Raising it to "look down" partly cancels
    // the model's own rx tip and the shot flattens back into a three-quarter
    // view — the rotation has to come from the model, not the camera.
    id: "sound",
    align: "right",
    model: { x: -2.02, y: 0.12, z: 0, rx: 1.14, ry: -0.3, rz: 0.04, s: 1.06 },
    cam: { x: -1.02, y: 0.16, z: 8.2, fov: 27 },
    exposure: 1.14,
    copy: [
      { text: "Every detail matters.", tone: "lead" },
      { text: "Rich, balanced sound built for the way you listen.", tone: "sub" },
    ],
  },
  {
    // Leave the noise behind — the grandest shot in the film, and the one the
    // whole sequence builds toward.
    //
    // Both earcups fill the frame dead-on and symmetric, cropped by the edges,
    // headband disappearing out of the top. The camera stays square to the
    // product (ry ~0) rather than turning it: the scale and the symmetry are
    // what make it monumental. Held far right so the copy has the left third to
    // itself without ever touching the product.
    id: "silence",
    align: "left",
    model: { x: 2.45, y: -0.5, z: 0, rx: 0.02, ry: 0, rz: 0, s: 1.2 },
    cam: { x: 1.28, y: -0.42, z: 6.2, fov: 26 },
    exposure: 1.2,
    copy: [
      { text: "Leave the noise behind.", tone: "lead" },
      {
        text: "Adaptive noise cancellation creates space for what matters.",
        tone: "sub",
      },
    ],
  },
  {
    // Made for hours, not moments — pulled back, rolled upright, and centred so
    // the whole product reads in one piece with the copy beneath it. The pose
    // is unchanged; only the framing moves.
    id: "comfort",
    align: "center",
    model: { x: 0, y: 0.5, z: 0, rx: -0.14, ry: 0.34, rz: 0, s: 1.04 },
    cam: { x: 0, y: 0.14, z: 8.8, fov: 30 },
    exposure: 1.04,
    copy: [
      { text: "Made for hours, not moments.", tone: "lead" },
      { text: "Soft materials. Balanced weight. Effortless comfort.", tone: "sub" },
    ],
  },
  {
    // Closing reveal and the purchase moment. Clean front hero, wordmark locked
    // beneath it, nothing else on screen.
    id: "buy",
    align: "buy",
    model: { x: 0, y: 0.52, z: 0, rx: -0.03, ry: 0, rz: 0, s: 1.0 },
    cam: { x: 0, y: 0.16, z: 9.1, fov: 30 },
    exposure: 1.1,
    copy: [
      { text: "Hush H1", tone: "wordmark" },
      { text: "Hear what matters.", tone: "tagline" },
    ],
  },
];

/**
 * Mobile art direction.
 *
 * Deliberately a separate film rather than a scaled-down desktop one. A phone
 * in portrait is roughly half as wide as it is tall, so the desktop composition
 * — product shoved to one side, copy in the opposite gutter — cannot survive:
 * the side push walks the product off the edge and the gutter copy lands on top
 * of it.
 *
 * So the rule changes instead of the numbers. Every beat is centred, the product
 * sits in the upper half with the copy stacked beneath it, the camera pulls
 * back and narrows its field of view so the whole product fits the frame width,
 * and the close-up beats reduce scale rather than pushing sideways. The
 * choreography and copy are identical; only the framing is rebuilt.
 *
 * The buy stop is shared with desktop deliberately — it is already a centred
 * composition that works unchanged at any aspect ratio.
 */
const MOBILE_COMMON = {
  align: "center",
  cam: { x: 0, y: 0.1, z: 10.6, fov: 34 },
  exposure: 1.08,
};

export const STOPS_MOBILE = [
  {
    id: "intro",
    ...MOBILE_COMMON,
    model: { x: 0, y: 0.5, z: 0, rx: -0.04, ry: 0, rz: 0, s: 0.92 },
    copy: STOPS[0].copy,
  },
  {
    id: "design",
    ...MOBILE_COMMON,
    model: { x: 0, y: 0.44, z: 0, rx: -0.04, ry: -0.26, rz: 0.02, s: 0.9 },
    cam: { x: 0, y: 0.1, z: 10.4, fov: 34 },
    copy: STOPS[1].copy,
  },
  {
    id: "sound",
    ...MOBILE_COMMON,
    // The raked top-down read survives on a phone, scaled back so the whole
    // band still fits the narrower frame.
    model: { x: 0, y: 0.42, z: 0, rx: 1.1, ry: -0.3, rz: 0.04, s: 0.82 },
    cam: { x: 0, y: 0.16, z: 10.2, fov: 32 },
    copy: STOPS[2].copy,
  },
  {
    id: "silence",
    ...MOBILE_COMMON,
    // Still the monumental symmetric shot, but pulled back and centred: on a
    // portrait frame a side crop would just cut the product in half.
    model: { x: 0, y: 0.2, z: 0, rx: 0.02, ry: 0, rz: 0, s: 0.86 },
    cam: { x: 0, y: 0.02, z: 9.4, fov: 30 },
    exposure: 1.2,
    copy: STOPS[3].copy,
  },
  {
    id: "comfort",
    ...MOBILE_COMMON,
    model: { x: 0, y: 0.46, z: 0, rx: -0.14, ry: 0.34, rz: 0, s: 0.88 },
    copy: STOPS[4].copy,
  },
  {
    // The buy stop is shared with desktop in every respect except the camera's
    // field of view.
    //
    // Its framing is identical to the other stops' intent — centred product,
    // wordmark beneath — but a 30-degree vertical FOV that frames a landscape
    // viewport fills a portrait one, because the narrow axis becomes the
    // constraint. Widening to 42 degrees pulls the product back to the same
    // optical size it has on desktop without touching the pose, and leaves the
    // room below for the wordmark, price and footer.
    id: "buy",
    ...STOPS[5],
    model: { ...STOPS[5].model, s: 0.86, y: 0.66 },
    cam: { ...STOPS[5].cam, z: 9.6, fov: 42 },
  },
];

/**
 * Mobile rest state, applied before first paint so the opening frame matches
 * the mobile art direction rather than flashing the desktop composition.
 */
export const REST_MOBILE = {
  model: { x: 0, y: 0.5, z: 0, rx: -0.04, ry: 0, rz: 0, s: 0.92 },
  cam: { x: 0, y: 0.1, z: 10.6, fov: 34 },
  exposure: 1.08,
};

/**
 * Light rig.
 *
 * A black product on a white field is the hardest lighting problem here: it has
 * no colour to bounce light and its own surfaces swallow fill, so it reads as a
 * silhouette unless it is deliberately edge-lit. The approach is a bright
 * environment for the broad reflections, plus hard rim and kicker sources at
 * grazing angles to draw the silhouette's edge out of the background — that
 * edge light is what makes it read as a solid object rather than a dark blob,
 * and it is what reveals the leather grain on the cushions.
 */
export const LIGHTING = {
  ambient: 1.15,
  key: 2.6,
  fill: 1.35,
  rim: 3.4,
  kicker: 2.2,
  envIntensity: 0.95,
  exposure: 1.08,
};