// What Episode 4's low-gravity machinery looks like (PT-032): the launch VENT plates (a bronze ring, a pulsing disc, chevrons that run towards the landing) and the falling LOADS (a container that drops out of the dark in the last LOADS.warn seconds, a hazard-orange
// glow and a shadow on the deck that build with it, a squashed wreck for half a second after the impact). Read-only views of sim state: positions come from the map, the clock from `w.time` (a load is a pure function of it, src/engine/loads.js).
import * as THREE from 'three';
import { loadState } from '../engine/loads.js';

const basic = (o) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, ...o });
const lam = (o) => new THREE.MeshLambertMaterial(o);

/** one plate: a ring and a disc lying on the floor, three chevrons pointing along the ground track towards the landing; returns { group, disc, chevrons, dir } */
export function makeVentView(map, v, floorY) {
  const S = map.cell, x = (v.at[0] + 0.5) * S, z = (v.at[1] + 0.5) * S, tx = (v.to[0] + 0.5) * S, tz = (v.to[1] + 0.5) * S, g = new THREE.Group(), yaw = Math.atan2(tx - x, tz - z);
  g.position.set(x, floorY + 0.05, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(S * 0.42, 0.07, 5, 24), lam({ color: 0xc08a34, emissive: 0x4a2c08 })); ring.rotation.x = Math.PI / 2; g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(S * 0.36, 20), basic({ color: 0x8ff4e0, opacity: 0.55 })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.02; g.add(disc);
  const chevrons = []; const shape = new THREE.Shape(); shape.moveTo(0, 0.5); shape.lineTo(0.5, -0.1); shape.lineTo(0.3, -0.25); shape.lineTo(0, 0.1); shape.lineTo(-0.3, -0.25); shape.lineTo(-0.5, -0.1); shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(geo, basic({ color: 0xe8fff8, opacity: 0.8 })); c.rotation.x = -Math.PI / 2; c.rotation.z = -yaw; c.scale.setScalar(S * 0.3); c.position.y = 0.04; g.add(c); chevrons.push(c); }
  return { group: g, disc, chevrons, yaw, S, flash: 0 };
}
/** per frame: the chevrons run from the middle of the plate to its edge in the direction of the throw, the disc breathes; `flash` (1 at a launch, decaying) whites the plate out */
export function updateVentView(vv, time, dt) {
  vv.flash = Math.max(0, vv.flash - dt * 2.5);
  vv.chevrons.forEach((c, i) => { const ph = (time * 0.9 + i / 3) % 1; c.position.x = Math.sin(vv.yaw) * (ph - 0.5) * vv.S * 0.8; c.position.z = Math.cos(vv.yaw) * (ph - 0.5) * vv.S * 0.8; c.material.opacity = Math.sin(ph * Math.PI) * 0.9; });
  vv.disc.material.opacity = 0.4 + 0.2 * Math.sin(time * 3) + 0.4 * vv.flash; vv.disc.scale.setScalar(1 + 0.06 * Math.sin(time * 3) + 0.25 * vv.flash);
}

const DROP = 16;                                                           // m: the container is that high up the instant its warning begins
/** one load: the container (a box with four dark corner posts), its shadow and its hazard glow on the deck; returns { group, box, shadow, glow } */
export function makeLoadView(map, L, floorY) {
  const S = map.cell, w = (L.rect[2] - L.rect[0] + 1) * S, d = (L.rect[3] - L.rect[1] + 1) * S, cx = (L.rect[0] + L.rect[2] + 1) / 2 * S, cz = (L.rect[1] + L.rect[3] + 1) / 2 * S, group = new THREE.Group();
  group.position.set(cx, floorY, cz);
  const box = new THREE.Group(); const H = 2.2, body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, H, d * 0.92), lam({ color: 0x7a4a30, emissive: 0x1a0c06 })); body.position.y = H / 2; box.add(body);
  const post = lam({ color: 0x2a1a12 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, H + 0.1, 0.22), post); p.position.set(sx * w * 0.46, H / 2, sz * d * 0.46); box.add(p); }
  for (const y of [0.35, H - 0.1]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.14, d * 0.95), post); bar.position.y = y; box.add(bar); }
  box.visible = false; group.add(box);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w, d), basic({ color: 0x000000, opacity: 0 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; group.add(shadow);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w, d), basic({ color: 0xff6a2c, opacity: 0 })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.07; group.add(glow);
  return { group, box, shadow, glow, H };
}
/** per frame (time = sim time + the frame's fraction of a tick): the container falls with the square of the warning, a hazard glow builds and blinks as it nears, a wreck squashes and goes after the impact */
export function updateLoadView(lv, L, time) {
  const s = loadState(L, time);
  if (s.warn > 0) {
    lv.box.visible = true; lv.box.scale.y = 1; lv.box.position.y = (1 - s.fall) * DROP;
    lv.shadow.material.opacity = 0.55 * s.warn; const blink = s.until < 0.7 ? 0.5 + 0.5 * Math.sin(time * 26) : 1;
    lv.glow.material.opacity = (0.12 + 0.35 * s.warn) * blink;
  } else if (s.since < 0.55) {
    lv.box.visible = true; const k = s.since / 0.55; lv.box.position.y = 0; lv.box.scale.y = Math.max(0.05, 1 - 0.85 * k); lv.shadow.material.opacity = 0.55 * (1 - k); lv.glow.material.opacity = 0.5 * (1 - k);
  } else { lv.box.visible = false; lv.shadow.material.opacity = 0; lv.glow.material.opacity = 0; }
}
export function disposeAirViews(views) {
  for (const v of views) v.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } });
}
