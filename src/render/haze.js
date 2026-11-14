// Haze and glow (design/VISUAL_AWE_PLAN.md, sessions A4 and A5). Far things were as crisp and as saturated as near things, so a big place looked
// small; and almost nothing in a picture was bright. Two things in the final pass (post.js) answer that:
// * HAZE: a surface fades toward the place's far colour with its distance from the eye (and, over open sky below, with how far down it is), and
//   the level's ink fades with it. A creature keeps most of itself and all of its red line: reading a target comes first.
// * GLOW: what is brighter than a threshold spreads a soft light onto the pixels round it (lamps, windows, a bright sky behind a roofline, fire).
// Pure numbers here, no Three: `hazeAt` is the node twin of the GLSL in post.js (tests/haze.test.js reads the shader back). Drawn only.

/** a place's haze under open sky and under a roof; a look may carry its own `haze: { out, in, color }` and `glow` (LOOKS in defs.js) */
export const HAZE = Object.freeze({
  out: Object.freeze({ near: 14, far: 70, max: 0.5 }),
  in: Object.freeze({ near: 10, far: 42, max: 0.26 }),
  below: Object.freeze({ y: -2.5, band: 3, max: 0.62, from: 4, to: 14 }), // over open sky: what lies under the deck fades into the air
  entity: 0.45, // how much of the haze a creature takes
  ink: 0.8, // how much of the level's ink the haze takes at full strength
  ease: 2.5, // per second: how fast the numbers move when the eye goes under a roof or out from one
});
export const GLOW = Object.freeze({ threshold: 1.5, strength: 0.3, r1: 2.5, r2: 6, taps: 8 });

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** how much haze lies over a surface `dist` metres from the eye at world height `y` (0..1); `h` = { near, far, max, belowY?, belowMax? } */
export function hazeAt(dist, y, h) {
  let a = h.max * smooth(h.near, h.far, dist);
  if (h.belowMax > 0)
    a = Math.max(a, h.belowMax * (1 - smooth(h.belowY - HAZE.below.band, h.belowY + HAZE.below.band, y)) * smooth(HAZE.below.from, HAZE.below.to, dist));
  return a;
}

const rgb = (hex) => {
  const n = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * the haze of a place: `look` (a LOOKS row), `atmosphere` (the map's: its fog colour is the far colour unless the look names one), `roofed` (is
 * the eye under a roof), `hasVoid` (the map has open sky below it). Returns { color: [r, g, b] (as displayed), near, far, max, belowY, belowMax }
 */
export function hazeFor(look, atmosphere, roofed, hasVoid = false) {
  const own = look?.haze ?? {},
    base = { ...(roofed ? HAZE.in : HAZE.out), ...((roofed ? own.in : own.out) ?? {}) };
  return {
    color: rgb(own.color ?? atmosphere?.fog ?? '#2a2244'),
    near: base.near,
    far: base.far,
    max: base.max,
    belowY: own.belowY ?? HAZE.below.y,
    belowMax: hasVoid ? (own.belowMax ?? HAZE.below.max) : 0,
  };
}

/** the glow of a place: { threshold, strength }; `on` false (the effects rung, a look that wants none) gives strength 0 */
export const glowFor = (look, on = true) => ({
  threshold: look?.glow?.threshold ?? GLOW.threshold,
  strength: on ? (look?.glow?.strength ?? GLOW.strength) : 0,
});

/** move the haze in use toward the haze wanted, a step of `dt` seconds (the eye walking through a doorway must not snap the picture) */
export function easeHaze(cur, want, dt) {
  const k = Math.min(1, dt * HAZE.ease);
  for (const f of ['near', 'far', 'max', 'belowY', 'belowMax']) cur[f] += (want[f] - cur[f]) * k;
  for (let i = 0; i < 3; i++) cur.color[i] += (want.color[i] - cur.color[i]) * k;
  return cur;
}

const f = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
/** the GLSL of both, built from the numbers above (post.js puts them in its fragment shader) */
export const HAZE_UNIFORMS = /* glsl */ `
uniform mat4 uInvProj, uCamMat;
uniform vec3 uHazeColor;
uniform vec4 uHaze;            // near, far, max, the most haze over open sky below
uniform float uHazeBelowY, uGlow, uGlowThr;`;
export const HAZE_GLSL = /* glsl */ `
  float haze = 0.0;
  float dRaw = texture2D(tDepth, vUv).x;
  if (uHaze.z + uHaze.w > 0.0 && dRaw < 0.99999) {                    // (the sky writes no depth: it is the far colour's source, never hazed)
    vec4 vp = uInvProj * vec4(vUv * 2.0 - 1.0, dRaw * 2.0 - 1.0, 1.0);
    vp /= vp.w;
    float dist = length(vp.xyz);
    haze = uHaze.z * smoothstep(uHaze.x, uHaze.y, dist);
    float wy = (uCamMat * vec4(vp.xyz, 1.0)).y;
    haze = max(haze, uHaze.w * (1.0 - smoothstep(uHazeBelowY - ${f(HAZE.below.band)}, uHazeBelowY + ${f(HAZE.below.band)}, wy)) * smoothstep(${f(HAZE.below.from)}, ${f(HAZE.below.to)}, dist));
    haze *= mix(${f(HAZE.entity)}, 1.0, step(0.5, texture2D(tColor, vUv).a));
    col = mix(col, uHazeColor, haze);
  }`;
export const GLOW_GLSL = /* glsl */ `
  if (uGlow > 0.0) {
    vec2 gp = 1.0 / uRes;
    vec3 glowSum = vec3(0.0);
    for (int i = 0; i < ${GLOW.taps}; i++) {
      float ga = float(i) * ${f(+((2 * Math.PI) / GLOW.taps).toFixed(6))} + p1 * 6.2831853;
      vec2 gd = vec2(cos(ga), sin(ga)) * gp;
      glowSum += max(texture2D(tColor, vUv + gd * ${f(GLOW.r1)}).rgb * uExposure - uGlowThr, 0.0) * 0.6;
      glowSum += max(texture2D(tColor, vUv + gd * ${f(GLOW.r2)}).rgb * uExposure - uGlowThr, 0.0) * 0.4;
    }
    col += min(glowSum / ${f(GLOW.taps)}, vec3(1.0)) * uGlow;
  }`;
