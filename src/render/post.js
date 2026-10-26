// Painterly post pass: low-res render target -> nearest upscale, depth-based ink outline, paper grain, value banding, grade.
import * as THREE from 'three';

const vert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */`
precision highp float;
uniform sampler2D tColor, tDepth, tPaper, tWeapon;
uniform vec2 uRes, uWRes;
uniform float uWeapon;
uniform vec4 uHit[4];          // look polish 10 (hitdir.js): where blows came from: (sin, cos) of the bearing from straight ahead, strength, half-width in radians
uniform vec3 uShadowTint, uLightTint;
uniform float uShoulder, uShoulderPre;          // PT-061 V4: the tone shoulder (src/render/tonecurve.js is its node twin: never edit one without the other)
uniform float uSat, uExposure, uNear, uFar, uLevels, uEdgeLo, uEdgeHi, uCreaseLo, uCreaseHi, uClassic, uOutline, uPaint, uDamage, uDebug, uFrost;
varying vec2 vUv;

float invZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  float z = d * 2.0 - 1.0;
  float lin = 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
  return 1.0 / lin;                     // 1/z is linear in screen space on planes -> planes give ~0 second difference
}
vec3 toSRGB(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
vec3 shoulder(vec3 x) { vec3 y = max(x, vec3(0.0)) * uShoulderPre; return y * (1.0 + uShoulder) / (1.0 + uShoulder * y); }

/** the painted grade: paper tooth, value steps on luminance, the place's shadow and light tints, saturation (the world and the held weapon both wear it) */
vec3 paint(vec3 col, float p1, float p2) {
  if (uPaint < 0.5) return col;
  col *= 0.9 + 0.2 * p1;                                            // paper tooth
  float lum0 = dot(col, vec3(0.299, 0.587, 0.114));
  float lq = floor((lum0 + (p2 - 0.5) / uLevels) * uLevels + 0.5) / uLevels;   // painted value steps on luminance only: no hue speckle
  col = min(col * (lq / max(lum0, 0.02)), vec3(1.0));
  col = mix(col, vec3(1.0), smoothstep(0.88, 1.0, lq) * 0.35);                 // PT-061 V4: the last band bleaches toward white instead of the flat clamp
  col *= mix(uShadowTint, uLightTint, smoothstep(0.15, 0.7, lq));    // shadows and lights tinted by the place's look (LOOKS in defs.js; the default is cool shadows, warm lights)
  return mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, uSat);
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float p1 = texture2D(tPaper, fc / 128.0).r;
  float p2 = texture2D(tPaper, fc / 96.0 + 0.37).g;
  vec3 col = paint(toSRGB(shoulder(texture2D(tColor, vUv).rgb * uExposure)), p1, p2);

  if (uOutline > 0.5) {
    vec2 px = 1.0 / uRes;
    float c = invZ(vUv);
    float l = invZ(vUv - vec2(px.x, 0.0)), r = invZ(vUv + vec2(px.x, 0.0));
    float u = invZ(vUv + vec2(0.0, px.y)), d = invZ(vUv - vec2(0.0, px.y));
    // ENTITY pixels: enemies and the weapon write alpha 0 (entityflag.js). A pixel that is, or touches, one keeps the ORIGINAL ink exactly (owner, PT-006: the corner lines read as a wireframe on a
    // rig): the original thresholds, the original break, no corner lines. Only the level and its props get the new corner ink. ?outline=classic (uClassic) gives everything the original pass.
    float aMin = min(min(texture2D(tColor, vUv).a, texture2D(tColor, vUv - vec2(px.x, 0.0)).a), min(min(texture2D(tColor, vUv + vec2(px.x, 0.0)).a, texture2D(tColor, vUv + vec2(0.0, px.y)).a), texture2D(tColor, vUv - vec2(0.0, px.y)).a));
    float ent = max(step(aMin, 0.5), uClassic);
    float hostile = (1.0 - step(0.15, aMin)) * (1.0 - uClassic);                                    // look polish 6: a hostile creature writes alpha 0, a peaceful one 0.3 (entityflag.js): the hostile outline is inked blood red
    float e = (abs(l + r - 2.0 * c) + abs(u + d - 2.0 * c)) / max(c, 1e-4);
    float edge = smoothstep(mix(uEdgeLo, 0.10, ent), mix(uEdgeHi, 0.30, ent), e);      // silhouettes: a step in depth, relative to how far away it is
    // creases: where two planes meet (floor and wall, wall and ceiling, a prop's foot on the floor) 1/z is continuous and only its SLOPE changes, so the step test above never sees them.
    // At such a corner the absolute second difference is a roughly constant ~1/(eye height x focal length) at ANY distance, so one absolute threshold inks every corner alike.
    float d2 = max(abs(l + r - 2.0 * c), abs(u + d - 2.0 * c));
    edge = max(edge, smoothstep(uCreaseLo, uCreaseHi, d2) * (1.0 - ent));
    edge *= clamp(mix(0.6 + p1 * 0.9, 0.45 + p1 * 1.1, ent), 0.0, 1.0);   // hand-inked, slightly broken line (the level: less broken, so a line is read, not lost in the paper tooth; entities: as they always were)
    col = mix(col, mix(vec3(0.035, 0.04, 0.06), vec3(0.22, 0.025, 0.03), hostile), edge * 0.94);
    if (uDebug > 0.5) { gl_FragColor = vec4(vec3(edge), 1.0); return; }          // dev measurement only: the ink mask (tools/dev/shoot-outlines.mjs)
  }

  // THE HELD WEAPON (look polish 1): drawn into its own target at the screen's resolution, so the object you look at all game is crisp while the world keeps its chunky pixels. It wears the same
  // painted grade; its ink is a clean line where its opaque silhouette ends (sleeves fading in the sights are not inked). Its colour is premultiplied by its coverage (blended over a clear target).
  if (uWeapon > 0.5) {
    vec4 wc = texture2D(tWeapon, vUv);
    if (wc.a > 0.003) col = mix(col, paint(toSRGB(shoulder(wc.rgb / wc.a * uExposure)), p1, p2), wc.a);
    if (uOutline > 0.5) {
      vec2 wp = 1.25 / uWRes;
      float s0 = step(0.94, wc.a), sl = step(0.94, texture2D(tWeapon, vUv - vec2(wp.x, 0.0)).a), sr = step(0.94, texture2D(tWeapon, vUv + vec2(wp.x, 0.0)).a);
      float su = step(0.94, texture2D(tWeapon, vUv + vec2(0.0, wp.y)).a), sd = step(0.94, texture2D(tWeapon, vUv - vec2(0.0, wp.y)).a);
      float wEdge = max(max(sl, sr), max(su, sd)) - min(min(min(sl, sr), min(su, sd)), s0);
      col = mix(col, vec3(0.035, 0.04, 0.06), clamp(wEdge, 0.0, 1.0) * 0.9);
    }
  }

  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * 0.9;                                         // vignette
  col = mix(col, vec3(0.78, 0.9, 1.0), uFrost * clamp(dot(q, q) * 5.5 - 0.12, 0.0, 0.88));           // PT-033: frost creeping in from the edges while you are in vacuum
  col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), uFrost * 0.35);
  col = mix(col, vec3(0.75, 0.05, 0.05), uDamage * clamp(dot(q, q) * 4.0 + 0.15, 0.0, 1.0));
  // the direction of a blow: a red glow in a band along the edge of the picture on the attacker's side (ahead = the top edge, behind = the bottom); never in the middle
  float edgeD = min(0.5 - abs(q.x), 0.5 - abs(q.y)), band = 1.0 - smoothstep(0.0, 0.11, edgeD);
  if (band > 0.0) {
    float ang = atan(q.x * uRes.x / uRes.y, q.y), hitA = 0.0;
    for (int i = 0; i < 4; i++) { vec4 h = uHit[i]; if (h.z <= 0.0) continue; float d = abs(mod(ang - atan(h.x, h.y) + 3.14159265, 6.28318531) - 3.14159265); hitA = max(hitA, h.z * (1.0 - smoothstep(h.w * 0.55, h.w, d))); }
    col = mix(col, vec3(0.86, 0.08, 0.05), clamp(hitA * band, 0.0, 0.85));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const CLASSIC = typeof location !== 'undefined' && new URLSearchParams(location.search).get('outline') === 'classic';      // ?outline=classic: the whole picture gets the original ink (to compare)
const CREASE_LO = 0.0007, CREASE_HI = 0.0014;
/** look polish 4 (colour): every place's shadow and light tints pushed this much further from neutral, so a place's light has a temperature (cool shadows, warm lamps, or its own pair) */
export const GRADE_K = 1.5;       // 1/z units per pixel at 480 px wide: about 40% / 80% of a floor-wall corner seen from eye height

export class PostPass {
  constructor(renderer, paperTex, near, far) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.uniforms = {
      tColor: { value: null }, tDepth: { value: null }, tPaper: { value: paperTex }, uRes: { value: new THREE.Vector2(1, 1) },
      uNear: { value: near }, uFar: { value: far }, uExposure: { value: 2.2 }, uShoulder: { value: 1 }, uShoulderPre: { value: 0.55 }, uLevels: { value: 10 }, uEdgeLo: { value: 0.06 }, uEdgeHi: { value: 0.22 }, uCreaseLo: { value: 0.0007 }, uCreaseHi: { value: 0.0014 }, uClassic: { value: CLASSIC ? 1 : 0 },
      uOutline: { value: 1 }, uPaint: { value: 1 }, uDamage: { value: 0 }, uDebug: { value: 0 }, uFrost: { value: 0 },
      tWeapon: { value: null }, uWRes: { value: new THREE.Vector2(1, 1) }, uWeapon: { value: 0 }, uHit: { value: [new THREE.Vector4(0, 1, 0, 0), new THREE.Vector4(0, 1, 0, 0), new THREE.Vector4(0, 1, 0, 0), new THREE.Vector4(0, 1, 0, 0)] },
      uShadowTint: { value: new THREE.Vector3(0.9, 1.0, 1.08) }, uLightTint: { value: new THREE.Vector3(1.07, 1.0, 0.93) }, uSat: { value: 1 },
    };
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false })));
    this.rt = null;
  }
  /** the place's grade: { shadow: [r,g,b], light: [r,g,b], sat } (LOOKS in defs.js; the exposure is the view's: the player's brightness times the place's) */
  setGrade(g) { const k = GRADE_K, x = (v) => 1 + (v - 1) * k; this.uniforms.uShadowTint.value.set(...g.shadow.map(x)); this.uniforms.uLightTint.value.set(...g.light.map(x)); this.uniforms.uSat.value = g.sat; }
  /** w x h = the internal (chunky) resolution of the world; dw x dh = the screen's, for the held weapon's own target (capped at 1920 wide: a crisp gun, not a costly one) */
  resize(w, h, dw = w, dh = h) {
    this.rt?.dispose(); this.rt?.depthTexture?.dispose(); this.wrt?.dispose();
    const ww = Math.max(w, Math.min(1920, Math.round(dw))), wh = Math.max(1, Math.round(ww * (dh / Math.max(1, dw))));
    this.wrt = new THREE.WebGLRenderTarget(ww, wh, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, samples: 0 });
    this.uniforms.tWeapon.value = this.wrt.texture; this.uniforms.uWRes.value.set(ww, wh);
    const depth = new THREE.DepthTexture(w, h); depth.type = THREE.UnsignedIntType; depth.minFilter = depth.magFilter = THREE.NearestFilter;
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: depth, samples: 0 });
    this.uniforms.tColor.value = this.rt.texture; this.uniforms.tDepth.value = depth; this.uniforms.uRes.value.set(w, h);
    this.uniforms.uCreaseLo.value = CREASE_LO * 480 / w; this.uniforms.uCreaseHi.value = CREASE_HI * 480 / w;      // a corner's slope change in 1/z per pixel shrinks with the internal resolution
  }
  dispose() {
    this.rt?.dispose(); this.rt?.depthTexture?.dispose(); this.rt = null; this.wrt?.dispose(); this.wrt = null;
    this.scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
  /** draw = () => renders the world into the bound render target; drawWeapon (or null in a story scene) renders the held weapon into its own clear target at the screen's resolution */
  render(draw, drawWeapon = null) {
    const r = this.renderer;
    r.setRenderTarget(this.rt); r.clear(); draw();
    this.uniforms.uWeapon.value = drawWeapon && this.wrt ? 1 : 0;
    if (drawWeapon && this.wrt) {
      const keep = (this._cc ??= new THREE.Color()); r.getClearColor?.(keep); const a = r.getClearAlpha?.() ?? 1;
      r.setRenderTarget(this.wrt); r.setClearColor?.(0x000000, 0); r.clear(); drawWeapon(); r.setClearColor?.(keep, a);
    }
    r.setRenderTarget(null);
    r.clear(); r.render(this.scene, this.cam);
  }
}
