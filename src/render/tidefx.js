// What the tide looks like (PT-045, drop B, E12; src/engine/tide.js): one translucent sea over the whole footprint of the map, lifted to the water level of the sim clock each frame. Read-only: the level is a pure function of `w.time`. Every walkable cell whose floor
// is under it is wet for the sim (terrain.js fxAt); this is how the player sees which. The painted water texture is the level mesh's own (a clone, so the view can drift it without touching the sea under the pier). Builds and updates in node (tests/render-pt45.test.js).
import * as THREE from 'three';
import { tideLevel, tideState } from '../engine/tide.js';

/** { group, sea, update(w, dt, time) }: the sea is hidden while the level is under the lowest floor of the map (the dock is dry) */
export function makeTideView(map, tex) {
  const S = map.cell, W = map.w * S, H = map.h * S, group = new THREE.Group(), base = tex.water_dusk ?? new THREE.Texture();
  const t = base.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 8, H / 8);
  const mat = new THREE.MeshBasicMaterial({ map: t, color: 0x7fb4c4, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); sea.rotation.x = -Math.PI / 2; sea.position.set(W / 2, -10, H / 2); sea.renderOrder = 2; sea.visible = false; group.add(sea);
  const tv = { group, sea, mat, tex: t, update: (w, dt, time) => updateTideView(tv, w, dt, time) };
  return tv;
}
export function updateTideView(tv, w, dt, time = 0) {
  const L = tideLevel(w.map, w.time), s = tideState(w.map, w.time);
  tv.sea.visible = Number.isFinite(L) && L > -1.5; if (!tv.sea.visible) return;
  tv.sea.position.y = L; tv.tex.offset.x += Math.max(0, Math.min(0.1, dt || 0)) * 0.012; tv.tex.offset.y += Math.max(0, Math.min(0.1, dt || 0)) * 0.007;
  tv.mat.opacity = 0.58 + 0.05 * Math.sin(time * 1.7) + (s.rate !== 0 ? 0.05 : 0);                       // a moving tide is a little more solid than a held one
}
