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

/**
 * Pacing for the comfort beat ("Made for hours, not moments.").
 *
 * The line is about time, so it is the one beat that is allowed to be slower
 * than the rest: a longer, softer move in, a long rest, and a gentle leave.
 * Numbers are multipliers on Film.jsx's TRAVEL / HOLD (see the pacing notes
 * there); `linger` is the fraction of the NEXT move that the copy outlasts.
 * Shared by the desktop and mobile films so both breathe the same way.
 */
const COMFORT_PACE = { travel: 1.35, hold: 1.8, ease: "sine.inOut" };
/** The move out of comfort is small (a quarter-turn and a hair of scale), so it
 * is eased softly and the comfort copy stays up for the first part of it. */
const BUY_PACE = { ease: "sine.inOut", linger: 0.25 };

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
    // Designed to disappear — one idea: the product turns a near-quarter to its
    // side profile and the silhouette thins to a single line. A profile is much
    // narrower than the front elevation, so it can sit right of centre with the
    // copy in the left gutter without either crowding the other.
    //
    // Almost the whole move is yaw. Position barely changes (cam.x trails
    // model.x), so the product turns in place rather than swinging across frame.
    id: "design",
    align: "left",
    model: { x: 1.5, y: 0.0, z: 0, rx: -0.04, ry: -1.42, rz: 0, s: 1.14 },
    cam: { x: 0.4, y: 0.1, z: 9, fov: 30 },
    exposure: 1.06,
    copy: [
      { text: "Designed to disappear.", tone: "lead" },
      { text: "Every curve, surface, and detail has a purpose.", tone: "sub" },
    ],
  },
  {
    // Every detail matters — a push-in on the right earcup, the high-detail,
    // fully textured one (the left cup is a lighter flat-black mesh and would not
    // survive this close). Cropped by the frame edge on purpose: the leather
    // grain, the machined ring and the hinge are the whole subject.
    //
    // `measure` wraps the headline short of the product; at this scale the
    // single-line headline would otherwise end a few pixels from the cushion.
    id: "detail",
    align: "left",
    measure: "min(30rem,36vw)",
    model: { x: 1.1, y: 0.0, z: 0, rx: 0.1, ry: -1.32, rz: 0, s: 1.3 },
    cam: { x: 0, y: 0.1, z: 6.8, fov: 26 },
    exposure: 1.08,
    copy: [
      { text: "Every detail matters.", tone: "lead" },
      { text: "Stitched leather, machined rings, and nothing left to chance.", tone: "sub" },
    ],
  },
  {
    // Sound, composed — pulled back to a calm three-quarter view. The yaw opens
    // the cushions to the camera, so the viewer looks into the cup where the
    // sound actually happens. The copy stacks beneath, as in the comfort beat.
    id: "sound",
    align: "center",
    model: { x: 0.2, y: 0.35, z: 0, rx: 0.22, ry: -0.55, rz: 0, s: 1.0 },
    cam: { x: 0, y: 0.2, z: 9.4, fov: 30 },
    exposure: 1.06,
    copy: [
      { text: "Sound, composed.", tone: "lead" },
      { text: "Rich, balanced sound built for the way you listen.", tone: "sub" },
    ],
  },
  {
    // Leave the noise behind — the space is the point. A symmetric front view,
    // deliberately small, with a wide margin of white all round it: silence made
    // visible. It lets the features chapter end on a breath before comfort.
    id: "silence",
    align: "center",
    model: { x: 0, y: 0.5, z: 0, rx: -0.02, ry: 0, rz: 0, s: 0.64 },
    cam: { x: 0, y: 0.2, z: 9.8, fov: 30 },
    exposure: 1.08,
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
    ...COMFORT_PACE,
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
    ...BUY_PACE,
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
    model: { x: 0, y: 0.4, z: 0, rx: -0.04, ry: -1.2, rz: 0, s: 0.95 },
    copy: STOPS[1].copy,
  },
  {
    id: "detail",
    ...MOBILE_COMMON,
    // Dropped and eased back so the band clears the chapter marker in the
    // top-left corner; the cup still bleeds off the left edge.
    model: { x: -0.5, y: 0.02, z: 0, rx: 0, ry: -0.85, rz: 0, s: 1.1 },
    cam: { x: 0, y: 0.1, z: 9.4, fov: 30 },
    copy: STOPS[2].copy,
  },
  {
    id: "sound",
    ...MOBILE_COMMON,
    model: { x: 0, y: 0.5, z: 0, rx: 0.22, ry: -0.55, rz: 0, s: 0.85 },
    copy: STOPS[3].copy,
  },
  {
    id: "silence",
    ...MOBILE_COMMON,
    model: { x: 0, y: 1.0, z: 0, rx: -0.02, ry: 0, rz: 0, s: 0.6 },
    copy: STOPS[4].copy,
  },
  {
    id: "comfort",
    ...MOBILE_COMMON,
    ...COMFORT_PACE,
    model: { x: 0, y: 0.46, z: 0, rx: -0.14, ry: 0.34, rz: 0, s: 0.88 },
    copy: STOPS[5].copy,
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
    ...STOPS[6],
    model: { ...STOPS[6].model, s: 0.86, y: 0.66 },
    cam: { ...STOPS[6].cam, z: 9.6, fov: 42 },
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