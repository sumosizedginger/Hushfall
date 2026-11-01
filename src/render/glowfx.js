// GLOWING EFFECTS (PT-079, design/ART_ASSESSMENT.md item 5: the shields, rings and pulses were single-colour see-through planes, which read as debug drawing next to the painted plates). Two materials, render only:
//   ringMaterial: a ring of sound on the floor (a pulse, the ripple of an absorbed hit): brightest at its LEADING edge (where the sim's ring is, so the danger reads exactly as before) and fading behind it, a
//                 thin white line on the very edge. Its geometry is RING_GEO's band (the inner radius is where the trail has faded out).
//   plateMaterial: a shield plate: nearly clear in the middle, a bright frame along its edges, a glow where it is seen edge-on, and rings of sound running up it; `flash` (a hit just absorbed) whitens and
//                 brightens it. `opacity` stays a plain number on both (the view sets it every frame as it did the old materials).
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

export function plateMaterial(color = 0x3fffe0, opacity = 0.2) {
  const u = { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 }, uFlash: { value: 0 } };
  const m = keepOpacity(new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity, uTime, uFlash; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  float ex = abs(vUv.x - 0.5) * 2.0, ey = abs(vUv.y - 0.5) * 2.0, rim = max(pow(ex, 8.0), pow(ey, 5.0));
  float scan = 0.5 + 0.5 * sin(vUv.y * 16.0 - uTime * 3.0), fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float a = uOpacity * (0.25 + 1.6 * rim + 0.5 * fres + 0.25 * scan);                       // (a hit absorbed raises uOpacity to SHIELD.flare: the whole cage lights)
  gl_FragColor = vec4(mix(uColor, vec3(0.9, 1.0, 0.97), clamp(rim * 0.55 + uFlash * 0.8, 0.0, 1.0)), clamp(a, 0.0, 0.95));
}`,
  }), u);
  m.userData.u = u;
  return m;
}
