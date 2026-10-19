// What the view draws for the Marksman and the Mender (PT-060, R8) that the rigs cannot. Render only: it reads the sim's state (`e.snipeT`, `e.snipeAim`, `e.healTarget`) and the drained `snipe_shot` events, never writes either.
//   THE MARKSMAN'S LINE: a thin bar of light from the reed's muzzle to where it points, from the first tick of the tell. While it FOLLOWS you (the first `track` s) it is thin and amber and flickers; when it FREEZES (`lock` s) it is thicker, white-hot and steady:
//   that change is the cue to move. On the shot a bright streak stays for a tenth of a second down the line that was fired.
//   THE NODE MARKER (PT-061, V9): ONE cue for every node of every boss (a bell node, a feeder, a reed, a seal, a root anchor, a brood vat): a thin ring of white-cyan light round its body at the height of its vulnerable point, pulsing while a boss that it holds a shield for still stands,
//   steady once the shield is down. A player learns it once and reads every boss with it.
//   BOSS STAGING (PT-061, V10): an awake boss is lit from BEHIND (a cool point light on the far side of it from the player, so its silhouette reads against the room) and stands in a faint ground ring the size of its reach (the line past which its blows cannot land).
//   THE MENDER'S TETHER: a soft amber thread from the Mender's lantern to the creature it is mending, pulsing, with a small glow on the one being mended.
import * as THREE from 'three';
import { ENEMIES } from '../engine/defs.js';

const UP = new THREE.Vector3(0, 1, 0);

export function makeCreatureFx(scene) {
  const group = new THREE.Group(); scene.add(group);
  const bar = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), halo = new THREE.SphereGeometry(1, 8, 6);
  const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
  const trackMat = mat(0xffb04a, 0.55), lockMat = mat(0xfff2d8, 0.95), shotMat = mat(0xffffff, 1), tetherMat = mat(0xffc060, 0.5), glowMat = mat(0xffd890, 0.35);
  const ringGeo = new THREE.TorusGeometry(1, 0.035, 4, 28), ringMat = mat(0xd8fff8, 0.7), rings = new Map();
  const reachGeo = new THREE.TorusGeometry(1, 0.03, 4, 48), reachMat = mat(0xffb878, 0.28), rim = new THREE.PointLight(0xaee8ff, 0, 22, 1.6); group.add(rim);
  const reachRings = new Map();
  const lines = new Map(), tethers = new Map(), streaks = [], tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const place = (m, from, to, r) => { const d = tmp2.copy(to).sub(from), len = d.length() || 1; m.position.copy(from).addScaledVector(d, 0.5); m.scale.set(r, len, r); m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len)); };
  const get = (map, key, geo, material) => { let m = map.get(key); if (!m) { m = new THREE.Mesh(geo, material); m.frustumCulled = false; group.add(m); map.set(key, m); } return m; };
  /** `enemyViews` is GameView's map of rigs (so the line starts at the drawn muzzle, not at a guess), `time` the view clock */
  function update(w, enemyViews, time, dt) {
    let star = null; for (const b of w.enemies) if (b.state !== 'dead' && b.state !== 'idle' && ENEMIES[b.kind].boss && (!star || Math.hypot(b.x - w.player.x, b.z - w.player.z) < Math.hypot(star.x - w.player.x, star.z - w.player.z))) star = b;
    const liveR = new Set(); if (star) { const d = ENEMIES[star.kind], dx = star.x - w.player.x, dz = star.z - w.player.z, l = Math.hypot(dx, dz) || 1; rim.position.set(star.x + dx / l * (d.radius + 2.5), (star.y ?? 0) + (star.lift ?? 0) + d.height * 0.55, star.z + dz / l * (d.radius + 2.5)); rim.intensity = 7 + 1.5 * Math.sin(time * 2); const m = get(reachRings, star.id, reachGeo, reachMat); liveR.add(star.id); m.position.set(star.x, (star.y ?? 0) + 0.06, star.z); m.rotation.x = Math.PI / 2; m.scale.setScalar(d.attack.reach); } else rim.intensity = 0;
    const live = new Set(), liveT = new Set(), liveN = new Set(), held = w.enemies.some((b) => b.state !== 'dead' && ENEMIES[b.kind].boss && ENEMIES[b.kind].shield);
    for (const e of w.enemies) {
      if (e.state === 'dead') continue; const def = ENEMIES[e.kind], v = enemyViews.get(e.id);
      if (def.node) { const m = get(rings, e.id, ringGeo, ringMat); liveN.add(e.id); const r = (def.hitRadius ?? def.radius) + 0.25; m.position.set(e.x, (e.y ?? 0) + (e.lift ?? 0) + def.height * 0.55, e.z); m.rotation.x = Math.PI / 2; m.scale.setScalar(r * (held ? 1 + 0.08 * Math.sin(time * 6 + e.id) : 1)); }
      if (def.snipe && (e.snipeT ?? -1) >= 0 && e.snipeAim) {
        const S = def.snipe, locked = e.snipeT >= S.track, muzzle = v?.J?.lens;
        if (muzzle) { v.root.updateMatrixWorld(true); muzzle.getWorldPosition(a); } else a.set(e.x, (e.y ?? 0) + (S.muzzleY ?? 1.7), e.z);
        b.set(e.snipeAim[0], e.snipeAim[1], e.snipeAim[2]); const d = tmp.copy(b).sub(a), len = d.length() || 1; b.copy(a).addScaledVector(d, Math.min(S.max * 1.3, 60) / len);
        const m = get(lines, e.id, bar, locked ? lockMat : trackMat); m.material = locked ? lockMat : trackMat; live.add(e.id);
        place(m, a, b, locked ? 0.05 : 0.018 + 0.008 * Math.sin(time * 40));
      }
      if (def.heal && e.healTarget != null) {
        const t = w.enemies.find((o) => o.id === e.healTarget); if (!t || t.state === 'dead') continue;
        const lamp = v?.J?.flame; if (lamp) { v.root.updateMatrixWorld(true); lamp.getWorldPosition(a); } else a.set(e.x, (e.y ?? 0) + 1.2, e.z);
        b.set(t.x, (t.y ?? 0) + ENEMIES[t.kind].height * 0.55, t.z); const m = get(tethers, e.id, bar, tetherMat); liveT.add(e.id); place(m, a, b, 0.03 + 0.012 * Math.sin(time * 9 + e.id));
        const g = get(tethers, 'g' + e.id, halo, glowMat); liveT.add('g' + e.id); g.position.copy(b); g.scale.setScalar(0.35 + 0.1 * Math.sin(time * 7));
      }
    }
    for (const [k, m] of lines) if (!live.has(k)) { group.remove(m); lines.delete(k); }
    for (const [k, m] of tethers) if (!liveT.has(k)) { group.remove(m); tethers.delete(k); }
    for (const [k, m] of rings) if (!liveN.has(k)) { group.remove(m); rings.delete(k); }
    for (const [k, m] of reachRings) if (!liveR.has(k)) { group.remove(m); reachRings.delete(k); }
    for (let i = streaks.length - 1; i >= 0; i--) { const s = streaks[i]; s.t -= dt; s.m.material.opacity = Math.max(0, s.t / 0.12); if (s.t <= 0) { group.remove(s.m); s.m.material.dispose(); streaks.splice(i, 1); } }
  }
  /** a `snipe_shot` event: the line that was fired stays bright for a tenth of a second */
  function shot(e) {
    const from = new THREE.Vector3(e.x0, e.y0, e.z0), to = new THREE.Vector3(e.x1, e.y1, e.z1), m = new THREE.Mesh(bar, shotMat.clone()); m.frustumCulled = false; place(m, from, to, 0.06); group.add(m); streaks.push({ m, t: 0.12 });
  }
  function dispose() { scene.remove(group); bar.dispose(); halo.dispose(); ringGeo.dispose(); ringMat.dispose(); reachGeo.dispose(); reachMat.dispose(); rim.dispose(); for (const m of [trackMat, lockMat, shotMat, tetherMat, glowMat]) m.dispose(); for (const s of streaks) s.m.material.dispose(); }
  return { group, update, shot, dispose };
}
