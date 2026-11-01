// GLOWING EFFECTS (PT-079, design/ART_ASSESSMENT.md item 5: the shields, rings and pulses were single-colour see-through planes, which read as debug drawing next to the painted plates). Two materials, render only:
//   ringMaterial: a ring of sound on the floor (a pulse, the ripple of an absorbed hit): brightest at its LEADING edge (where the sim's ring is, so the danger reads exactly as before) and fading behind it, a
//                 thin white line on the very edge. Its geometry is RING_GEO's band (the inner radius is where the trail has faded out).
//   shellMaterial (PT-080): the shield's bell of sound. beamMaterial (PT-080): the soft part of a beam drawn as a box. `opacity` stays a plain number on all of them (the view sets it every frame).
import * as THREE from 'three';

/** the band a ring is drawn on: the inner part is the fading trail, the outer edge is the ring itself */
export const RING_BAND = { inner: 0.78, outer: 1 };
export const ringGeometry = (seg = 72) => new THREE.RingGeometry(RING_BAND.inner, RING_BAND.outer, seg, 1);

const keepOpacity = (m, u) => { Object.defineProperty(m, 'opacity', { get: () => u.uOpacity.value, set: (v) => { u.uOpacity.value = v; }, configurable: true }); return m; };

export function ringMaterial(color = 0xbafff2, opacity = 0.8) {
  const u = { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uIn: { value: RING_BAND.inner } };
  return keepOpacity(new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity, uIn; varying vec2 vP;
void main() {
  float r = length(vP), k = clamp((r - uIn) / (1.0 - uIn), 0.0, 1.0);
  float a = pow(k, 2.6) * 0.85 + smoothstep(0.95, 0.985, r) * 0.55;                       // the trail rises to the leading edge, and the edge itself is a bright line
  gl_FragColor = vec4(mix(uColor, vec3(1.0), smoothstep(0.955, 1.0, r) * 0.55), clamp(a, 0.0, 1.0) * uOpacity);
}`,
  }), u);
}

/** PT-080 (Art Gate 4): the shield's BELL OF SOUND (shield.js). Additive: clear where you look straight through it, glowing where you see it edge-on (a resonating volume, not a pane), thin bright rings of sound
 *  running along it from the crown to the lip (`rings` of them, `speed` how fast and which way), and a hit (`uFlash`, with the view raising `opacity` to SHIELD.flare) lights the whole bell. */
export function shellMaterial(color = 0x3fffe0, opacity = 0.2, rings = 9, speed = 1) {
  const u = { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 }, uFlash: { value: 0 }, uRings: { value: rings }, uSpeed: { value: speed } };
  const m = keepOpacity(new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity, uTime, uFlash, uRings, uSpeed; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float ring = pow(0.5 + 0.5 * sin((vUv.y * uRings - uTime * uSpeed) * 6.2831853), 10.0);
  float a = uOpacity * (0.05 + 1.15 * fres + 0.6 * ring * (0.35 + 0.65 * fres) + 0.35 * smoothstep(0.8, 1.0, vUv.y) * fres);
  gl_FragColor = vec4(mix(uColor, vec3(0.92, 1.0, 0.98), clamp(ring * 0.45 + uFlash * 0.7, 0.0, 1.0)), clamp(a, 0.0, 1.0));
}`,
  }), u);
  m.userData.u = u;
  return m;
}

/** PT-080 (Art Gate 4): the soft part of a beam drawn as a long box (the Mirror Array's beams, the Gate Warden's sweep): brightest along the beam's axis and fading to nothing at the box's sides, so no
 *  flat translucent face and no edge shows. Additive. Works on any box: the across-the-beam coordinate is read from the face's own normal and UV. */
export function beamMaterial(color = 0xffc860, opacity = 0.4) {
  const u = { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } };
  return keepOpacity(new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; varying vec3 vNo; void main() { vUv = uv; vNo = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying vec3 vNo;
void main() {
  vec3 n = abs(vNo); float across = n.x > 0.5 ? vUv.y : n.y > 0.5 ? vUv.x : max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) + 0.5;          // the side faces' cross-beam coordinate; an end face fades from its middle
  float r = clamp(abs(across - 0.5) * 2.0, 0.0, 1.0), k = (1.0 - r) * (1.0 - r);
  gl_FragColor = vec4(uColor, k * uOpacity);
}`,
  }), u);
}

