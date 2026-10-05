// Painterly post pass: low-res render target -> nearest upscale, depth-based ink outline, paper grain, value banding, grade.
import * as THREE from 'three';

const vert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */`
precision highp float;
uniform sampler2D tColor, tDepth, tPaper;
uniform vec2 uRes;
uniform float uExposure, uNear, uFar, uLevels, uEdgeLo, uEdgeHi, uCreaseLo, uCreaseHi, uOutline, uPaint, uDamage, uDebug;
varying vec2 vUv;

float invZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  float z = d * 2.0 - 1.0;
  float lin = 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
  return 1.0 / lin;                     // 1/z is linear in screen space on planes -> planes give ~0 second difference
}
vec3 toSRGB(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }

void main() {
  vec3 col = toSRGB(texture2D(tColor, vUv).rgb * uExposure);
  vec2 fc = gl_FragCoord.xy;
  float p1 = texture2D(tPaper, fc / 128.0).r;
  float p2 = texture2D(tPaper, fc / 96.0 + 0.37).g;

  if (uPaint > 0.5) {
    col *= 0.9 + 0.2 * p1;                                            // paper tooth
    float lum0 = dot(col, vec3(0.299, 0.587, 0.114));
    float lq = floor((lum0 + (p2 - 0.5) / uLevels) * uLevels + 0.5) / uLevels;   // painted value steps on luminance only: no hue speckle
    col = min(col * (lq / max(lum0, 0.02)), vec3(1.0));
    float lum = lq;
    col *= mix(vec3(0.9, 1.0, 1.08), vec3(1.07, 1.0, 0.93), smoothstep(0.15, 0.7, lum));   // cool shadows, warm lights
  }

  if (uOutline > 0.5) {
    vec2 px = 1.0 / uRes;
    float c = invZ(vUv);
    float l = invZ(vUv - vec2(px.x, 0.0)), r = invZ(vUv + vec2(px.x, 0.0));
    float u = invZ(vUv + vec2(0.0, px.y)), d = invZ(vUv - vec2(0.0, px.y));
    float e = (abs(l + r - 2.0 * c) + abs(u + d - 2.0 * c)) / max(c, 1e-4);
    float edge = smoothstep(uEdgeLo, uEdgeHi, e);                       // silhouettes: a step in depth, relative to how far away it is
    // creases: where two planes meet (floor and wall, wall and ceiling, a prop's foot on the floor) 1/z is continuous and only its SLOPE changes, so the step test above never sees them.
    // At such a corner the absolute second difference is a roughly constant ~1/(eye height x focal length) at ANY distance, so one absolute threshold inks every corner alike.
    float d2 = max(abs(l + r - 2.0 * c), abs(u + d - 2.0 * c));
    edge = max(edge, smoothstep(uCreaseLo, uCreaseHi, d2));
    edge *= clamp(0.6 + p1 * 0.9, 0.0, 1.0);                           // hand-inked, slightly broken line (less broken than before: the line is read, not lost in the paper tooth)
    col = mix(col, vec3(0.035, 0.04, 0.06), edge * 0.94);
    if (uDebug > 0.5) { gl_FragColor = vec4(vec3(edge), 1.0); return; }          // dev measurement only: the ink mask (tools/dev/shoot-outlines.mjs)
  }

  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * 0.9;                                         // vignette
  col = mix(col, vec3(0.75, 0.05, 0.05), uDamage * clamp(dot(q, q) * 4.0 + 0.15, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

const CREASE_LO = 0.0007, CREASE_HI = 0.0014;       // 1/z units per pixel at 480 px wide: about 40% / 80% of a floor-wall corner seen from eye height

export class PostPass {
  constructor(renderer, paperTex, near, far) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.uniforms = {
      tColor: { value: null }, tDepth: { value: null }, tPaper: { value: paperTex }, uRes: { value: new THREE.Vector2(1, 1) },
      uNear: { value: near }, uFar: { value: far }, uExposure: { value: 2.2 }, uLevels: { value: 10 }, uEdgeLo: { value: 0.06 }, uEdgeHi: { value: 0.22 }, uCreaseLo: { value: 0.0007 }, uCreaseHi: { value: 0.0014 },
      uOutline: { value: 1 }, uPaint: { value: 1 }, uDamage: { value: 0 }, uDebug: { value: 0 },
    };
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false })));
    this.rt = null;
  }
  resize(w, h) {
    this.rt?.dispose(); this.rt?.depthTexture?.dispose();
    const depth = new THREE.DepthTexture(w, h); depth.type = THREE.UnsignedIntType; depth.minFilter = depth.magFilter = THREE.NearestFilter;
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: depth, samples: 0 });
    this.uniforms.tColor.value = this.rt.texture; this.uniforms.tDepth.value = depth; this.uniforms.uRes.value.set(w, h);
    this.uniforms.uCreaseLo.value = CREASE_LO * 480 / w; this.uniforms.uCreaseHi.value = CREASE_HI * 480 / w;      // a corner's slope change in 1/z per pixel shrinks with the internal resolution
  }
  dispose() {
    this.rt?.dispose(); this.rt?.depthTexture?.dispose(); this.rt = null;
    this.scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
  /** draw = () => renders world + weapon into the bound render target */
  render(draw) {
    const r = this.renderer;
    r.setRenderTarget(this.rt); r.clear(); draw(); r.setRenderTarget(null);
    r.clear(); r.render(this.scene, this.cam);
  }
}
