// Sun shadows under open sky (design/VISUAL_AWE_PLAN.md, session A3). Nothing in the world cast a shadow, so a building looked pasted on the ground
// and a doorway to the outside was no brighter than the room. The sun (the place's one directional light) now casts onto the level: walls, roofs,
// props and scenery throw shadows; the level's surfaces take them. Creatures keep their contact shadows (shadows.js) and do not cast: the level
// stands still, so the shadow map is drawn only a few times a second (doors and lifts move), never every frame.
// Hard-edged on purpose: at the game's pixel size a soft edge is mush, and a hard one suits the ink. Drawn only.
import * as THREE from 'three';

export const SUN_SHADOW = Object.freeze({
  size: 2048, // the shadow map's side in texels
  bigSize: 4096, // ... for a map wider than `bigOver` metres
  bigOver: 180,
  strength: 0.78, // how dark a sun shadow is (1 = the sun gone); some sun is left so a roofed room is not lit by the sky alone
  every: 0.25, // seconds between redraws of the shadow map
  normalBias: 0.06,
  bias: -0.0006,
  margin: 6, // metres round the map's own box
});

/** does the map have any open sky to cast a shadow under? */
export function hasOpenSky(map) {
  for (let cz = 0; cz < map.h; cz++)
    for (let cx = 0; cx < map.w; cx++) {
      const k = map.kind(cx, cz);
      if (k === 'outdoor' || k === 'water' || k === 'void') return true;
    }
  return false;
}

/**
 * the box the sun's shadow camera must see: the map's centre, the half-width of a square that holds the whole map from any sun direction, the
 * distance to stand the sun at, and the shadow map's side
 */
export function shadowBox(map) {
  const w = map.w * map.cell,
    d = map.h * map.cell,
    half = Math.hypot(w, d) / 2 + SUN_SHADOW.margin;
  return {
    cx: w / 2,
    cz: d / 2,
    half,
    dist: half + 60,
    size: Math.max(w, d) > SUN_SHADOW.bigOver ? SUN_SHADOW.bigSize : SUN_SHADOW.size,
  };
}

/**
 * stand the sun `dir` ([x, y, z], any length, pointing FROM the ground TO the sun) over the map and fit its shadow camera; returns the sun's
 * elevation in degrees
 */
export function placeSun(sun, map, dir) {
  const b = shadowBox(map),
    len = Math.hypot(dir[0], dir[1], dir[2]) || 1,
    n = [dir[0] / len, dir[1] / len, dir[2] / len];
  sun.target.position.set(b.cx, 0, b.cz);
  sun.position.set(b.cx + n[0] * b.dist, n[1] * b.dist, b.cz + n[2] * b.dist);
  sun.target.updateMatrixWorld?.();
  const c = sun.shadow?.camera;
  if (c) {
    c.left = c.bottom = -b.half;
    c.right = c.top = b.half;
    c.near = 1;
    c.far = b.dist * 2 + 80;
    c.updateProjectionMatrix?.();
  }
  return (Math.asin(Math.max(-1, Math.min(1, n[1]))) * 180) / Math.PI;
}

/**
 * turn the sun's shadows on for a built level. `renderer` the WebGLRenderer, `sun` the DirectionalLight (its target must be in the scene), `group`
 * the level's group, `map` the MapData. Returns { on, casters, receivers } ; `on` false = a place with no open sky (nothing to do).
 */
export function setupSunShadow(renderer, sun, group, map) {
  const out = { on: false, casters: 0, receivers: 0 };
  if (!hasOpenSky(map) || !renderer.shadowMap) return out;
  const b = shadowBox(map);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  sun.castShadow = true;
  sun.shadow.mapSize.set(b.size, b.size);
  sun.shadow.normalBias = SUN_SHADOW.normalBias;
  sun.shadow.bias = SUN_SHADOW.bias;
  sun.shadow.intensity = SUN_SHADOW.strength;
  group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m || Array.isArray(m) || m.transparent || m.blending === THREE.AdditiveBlending) return;
    if (m.isMeshLambertMaterial || m.isMeshStandardMaterial || m.isMeshPhongMaterial) {
      o.castShadow = true;
      o.receiveShadow = true;
      out.casters++;
      out.receivers++;
    }
  });
  out.on = true;
  return out;
}

/** the effects rung (a weak machine): shadows off or on again */
export function setSunShadow(renderer, sun, on) {
  if (!renderer.shadowMap) return;
  sun.castShadow = on;
  renderer.shadowMap.needsUpdate = true;
}
