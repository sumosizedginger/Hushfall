// LOOK POLISH 2 (2026-10-26): what every level surface does in its shader, beyond its paint. A tiled 2 m texture repeated across a 40 m hall reads as wallpaper; real walls and floors are
// lighter and darker in broad patches, warmer here and cooler there, and dirtier at the foot. Three things, all in WORLD space (so they never tile with the texture and never swim with the camera):
//   * MACRO: two octaves of value noise (about 5 m and 1.8 m across) scale the paint between SURFACE.macro[0] and [1];
//   * TEMPERATURE: the finer octave drifts the paint a little warm or a little cool;
//   * FOOT (walls and trims): the bottom SURFACE.foot.h metres of a wall darken toward SURFACE.foot.k, counted from the wall's own floor (a wall's texture v runs up from its floor: levelmesh.js face()).
// Nothing here reads the simulation, and a material that is never compiled (node tests, the software rasteriser) is unchanged. `tests/surface.test.js` holds the GLSL to the numbers below.
export const SURFACE = Object.freeze({ macro: [0.8, 1.13], f1: 0.19, f2: 0.55, temp: 0.55, foot: { h: 0.85, k: 0.64 } });

const KINDS = new Set(['wall', 'floor', 'ceil', 'riser', 'trim']);
const glslNum = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

/** the GLSL the fragment shader gets (exported for the test): `kind` decides the plane the noise is read in and whether the foot darkens; `cell` is the map's cell size in metres */
export function surfaceGLSL(kind, cell) {
  const wallish = kind === 'wall' || kind === 'trim' || kind === 'riser', foot = kind === 'wall' || kind === 'trim';
  return `
  {
    vec3 sw = vSurfW; vec2 sp = ${wallish ? 'vec2(sw.x + sw.z, sw.y)' : 'sw.xz'};
    float sn1 = sNoise(sp * ${glslNum(SURFACE.f1)}), sn2 = sNoise(sp * ${glslNum(SURFACE.f2)} + 17.0);
    diffuseColor.rgb *= mix(${glslNum(SURFACE.macro[0])}, ${glslNum(SURFACE.macro[1])}, sn1 * 0.65 + sn2 * 0.35);
    diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(0.95, 0.99, 1.05), vec3(1.05, 1.0, 0.95), sn2), ${glslNum(SURFACE.temp)});
    ${foot ? `#ifdef USE_MAP
    diffuseColor.rgb *= mix(${glslNum(SURFACE.foot.k)}, 1.0, smoothstep(0.0, ${glslNum(SURFACE.foot.h)}, vMapUv.y * ${glslNum(cell)}));
    #endif` : ''}
  }`;
}
const NOISE = `
varying vec3 vSurfW;
float sHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float sNoise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y); }`;

/** give a level material the surface treatment (chains any onBeforeCompile it already has) */
export function patchSurface(mat, kind, cell = 2) {
  if (!KINDS.has(kind)) throw new Error('unknown surface kind ' + kind);
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile = (s, r) => {
    prev?.call(mat, s, r);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSurfW;').replace('#include <project_vertex>', '#include <project_vertex>\nvSurfW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>' + NOISE).replace('#include <map_fragment>', '#include <map_fragment>' + surfaceGLSL(kind, cell));
  };
  mat.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|surface-' + kind + '-' + cell;
  mat.userData.surface = kind;
  return mat;
}
