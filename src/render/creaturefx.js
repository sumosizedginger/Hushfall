// What the view draws for the Marksman and the Mender (PT-060, R8) that the rigs cannot. Render only: it reads the sim's state (`e.snipeT`, `e.snipeAim`, `e.healTarget`) and the drained `snipe_shot` events, never writes either.
//   THE MARKSMAN'S LINE: a thin bar of light from the reed's muzzle to where it points, from the first tick of the tell. While it FOLLOWS you (the first `track` s) it is thin and amber and flickers; when it FREEZES (`lock` s) it is thicker, white-hot and steady:
//   that change is the cue to move. On the shot a bright streak stays for a tenth of a second down the line that was fired.
//   THE MENDER'S TETHER: a soft amber thread from the Mender's lantern to the creature it is mending, pulsing, with a small glow on the one being mended.
import * as THREE from 'three';
import { ENEMIES } from '../engine/defs.js';

const UP = new THREE.Vector3(0, 1, 0);

export function makeCreatureFx(scene) {
  const group = new THREE.Group(); scene.add(group);
  const bar = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), halo = new THREE.SphereGeometry(1, 8, 6);
  const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
  const trackMat = mat(0xffb04a, 0.55), lockMat = mat(0xfff2d8, 0.95), shotMat = mat(0xffffff, 1), tetherMat = mat(0xffc060, 0.5), glowMat = mat(0xffd890, 0.35);
  const lines = new Map(), tethers = new Map(), streaks = [], tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const place = (m, from, to, r) => { const d = tmp2.copy(to).sub(from), len = d.length() || 1; m.position.copy(from).addScaledVector(d, 0.5); m.scale.set(r, len, r); m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len)); };
  const get = (map, key, geo, material) => { let m = map.get(key); if (!m) { m = new THREE.Mesh(geo, material); m.frustumCulled = false; group.add(m); map.set(key, m); } return m; };
  /** `enemyViews` is GameView's map of rigs (so the line starts at the drawn muzzle, not at a guess), `time` the view clock */
  function update(w, enemyViews, time, dt) {
    const live = new Set(), liveT = new Set();
    for (const e of w.enemies) {
      if (e.state === 'dead') continue; const def = ENEMIES[e.kind], v = enemyViews.get(e.id);
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
    for (let i = streaks.length - 1; i >= 0; i--) { const s = streaks[i]; s.t -= dt; s.m.material.opacity = Math.max(0, s.t / 0.12); if (s.t <= 0) { group.remove(s.m); s.m.material.dispose(); streaks.splice(i, 1); } }
  }
  /** a `snipe_shot` event: the line that was fired stays bright for a tenth of a second */
  function shot(e) {
    const from = new THREE.Vector3(e.x0, e.y0, e.z0), to = new THREE.Vector3(e.x1, e.y1, e.z1), m = new THREE.Mesh(bar, shotMat.clone()); m.frustumCulled = false; place(m, from, to, 0.06); group.add(m); streaks.push({ m, t: 0.12 });
  }
  function dispose() { scene.remove(group); bar.dispose(); halo.dispose(); for (const m of [trackMat, lockMat, shotMat, tetherMat, glowMat]) m.dispose(); for (const s of streaks) s.m.material.dispose(); }
  return { group, update, shot, dispose };
}
