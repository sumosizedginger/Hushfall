// What the view draws for Acts C and D that the creatures' rigs cannot (PT-043, the Preview). Render only: it reads the sim's state (`w.enemies`, `w.spikes`, an enemy's `rb`) and the rigs' joints, and writes nothing back.
//   THE CHOIR'S THREADS: a thin line from each of the Hive Cantor's ten fingertips to every singer of its unison group who is still alive; a singer's death snaps its thread.
//   THE ROOT BELL: the chain from the top of the clapper up to the dome, the shadow and glow a second ahead of where the clapper will be at the bottom of its swing (it crushes there), and the spikes: a ring that warns on the floor, then a root that strikes up.
import * as THREE from 'three';
import { ENEMIES } from '../engine/defs.js';
import { swingAt } from '../engine/rootbell.js';

const UP = new THREE.Vector3(0, 1, 0);

export function makeHiveView(scene) {
  const group = new THREE.Group(); scene.add(group);
  const lineGeo = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true), threadMat = new THREE.MeshBasicMaterial({ color: 0xffb050, transparent: true, opacity: 0.55, depthWrite: false }), chainMat = new THREE.MeshLambertMaterial({ color: 0x1c1c22 });
  const discGeo = new THREE.CircleGeometry(1, 28), discMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide }), ringGeo = new THREE.RingGeometry(0.82, 1, 32), spikeGeo = new THREE.ConeGeometry(1, 1, 6);
  const threads = new Map(), spikes = new Map(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
  let chain = null, shadow = null, shadowMat = null;
  const glow = new THREE.PointLight(0xff9a40, 0, 34, 2); group.add(glow);                                // the clapper's own light (a copper glow on the roots and the tiers): made with the view so the scene's light count never changes mid-fight
  const line = (m, a, b, r) => { const d = tmp2.copy(b).sub(a), len = d.length() || 1; m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(r, len, r); m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len)); };

  function update(w, enemyViews, time) {
    // ---- the Hive Cantor's threads
    const live = new Set();
    for (const e of w.enemies) {
      const def = ENEMIES[e.kind]; if (!def.unison || e.state === 'dead') continue;
      const v = enemyViews.get(e.id); if (!v || !v.J) continue; v.root.updateMatrixWorld(true);
      const tips = []; for (const s of ['A', 'B']) for (let f = 0; f < 5; f++) { const j = v.J['tip' + s + f]; if (j) tips.push(j.getWorldPosition(new THREE.Vector3())); }
      if (!tips.length) continue;
      let i = 0; for (const o of w.enemies) {
        if (o.group !== def.unison.group || o.state === 'dead') continue;
        let near = e, nd = Math.hypot(o.x - e.x, o.z - e.z); for (const b of w.enemies) if (b !== e && b.state !== 'dead' && ENEMIES[b.kind].unison?.group === def.unison.group) { const d = Math.hypot(o.x - b.x, o.z - b.z); if (d < nd) { nd = d; near = b; } }
        if (near !== e) continue;                                                                      // a singer is tied to the nearest conductor only (the Preview has several in one map)
        const key = e.id + ':' + o.id; live.add(key); let m = threads.get(key); if (!m) { m = new THREE.Mesh(lineGeo, threadMat); group.add(m); threads.set(key, m); }
        const tip = tips[i++ % tips.length], awake = o.state !== 'idle';
        tmp3.set(o.x, (o.y ?? 0) + 1.5, o.z); line(m, tip, tmp3, awake ? 0.045 + 0.02 * Math.sin(time * 6 + o.id) : 0.028);
      }
    }
    for (const [k, m] of threads) if (!live.has(k)) { group.remove(m); threads.delete(k); }
    // ---- the Root Bell: its chain, and where it will be a second from now
    let bell = null; for (const e of w.enemies) if (e.kind === 'rootbell' && e.rb && e.state !== 'dead') bell = e; else if (e.kind === 'rootbell' && e.rb && e.state === 'dead') bell = e;
    if (bell) {
      const B = ENEMIES.rootbell.bell, rb = bell.rb, h = ENEMIES.rootbell.height;
      if (!chain) { chain = new THREE.Mesh(lineGeo, chainMat); group.add(chain); chain.frustumCulled = false; }
      const hung = rb.mode === 'hung' || rb.mode === 'rise';
      chain.visible = hung || rb.mode === 'fall';
      if (chain.visible) { tmp.set(bell.x, bell.y + (bell.lift ?? 0) + h + 0.55, bell.z); tmp3.set(rb.cx, B.top + 3, rb.cz); line(chain, tmp, tmp3, 0.13); }
      if (!shadow) { shadowMat = discMat(0xff7a1a, 0.4); shadow = new THREE.Mesh(discGeo, shadowMat); shadow.rotation.x = -Math.PI / 2; group.add(shadow); }
      shadow.visible = false;
      glow.position.set(bell.x, bell.y + (bell.lift ?? 0) + h / 2, bell.z); glow.intensity = (bell.state === 'dead' ? 3 : 20 * (0.78 + 0.22 * Math.sin(time * 3.1)) * (1 + (rb.last ? 0.9 : 0))) ;
      if (rb.mode === 'hung' && rb.t0 != null && bell.state !== 'dead') {
        const tt = w.time - rb.t0, s = swingAt(B, rb, tt + 0.9), low = s.cy - h / 2;
        if (low < B.crush.below + 1.2) { shadow.visible = true; shadow.position.set(s.x, rb.fy + 0.06, s.z); shadow.scale.setScalar(B.crush.r * (1.1 + 0.4 * Math.sin(time * 14))); shadowMat.opacity = 0.18 + 0.4 * Math.max(0, Math.min(1, (B.crush.below + 1.2 - low) / 1.6)); }
      }
    } else { glow.intensity = 0; if (chain) { group.remove(chain); chain = null; } }
    // ---- spikes
    const seen = new Set();
    for (const q of w.spikes ?? []) {
      seen.add(q.id); let s = spikes.get(q.id);
      if (!s) { const ring = new THREE.Mesh(ringGeo, discMat(0xff5a1a, 0.7)), cone = new THREE.Mesh(spikeGeo, new THREE.MeshLambertMaterial({ color: 0x241a14 })); ring.rotation.x = -Math.PI / 2; group.add(ring); group.add(cone); s = { ring, cone }; spikes.set(q.id, s); }
      const warn = ENEMIES.rootbell.bell.spikes.warn, r = ENEMIES.rootbell.bell.spikes.r;
      s.ring.position.set(q.x, q.y + 0.07, q.z); s.ring.scale.setScalar(r * (q.struck ? 1 : 0.5 + 0.5 * (q.age / warn))); s.ring.material.opacity = q.struck ? 0.15 : 0.35 + 0.4 * (q.age / warn);
      const k = q.struck ? Math.min(1, (q.age - warn) / 0.12) : 0, fall = q.struck ? Math.max(0, 1 - (q.age - warn - 0.5) / 1.0) : 0;
      s.cone.visible = q.struck; s.cone.scale.set(r * 0.7, Math.max(0.01, 2.6 * k * Math.min(1, fall * 1.3)), r * 0.7); s.cone.position.set(q.x, q.y + s.cone.scale.y / 2, q.z);
    }
    for (const [id, s] of spikes) if (!seen.has(id)) { group.remove(s.ring); group.remove(s.cone); s.ring.material.dispose(); s.cone.material.dispose(); spikes.delete(id); }
  }
  /** what is drawn right now (the dev hook's probe compares it with the sim) */
  function counts() { return { threads: threads.size, spikes: spikes.size, chain: !!chain?.visible, shadow: !!shadow?.visible }; }
  function dispose() { lineGeo.dispose(); threadMat.dispose(); chainMat.dispose(); discGeo.dispose(); ringGeo.dispose(); spikeGeo.dispose(); shadowMat?.dispose(); for (const s of spikes.values()) { s.ring.material.dispose(); s.cone.material.dispose(); } scene.remove(group); }
  return { group, update, counts, dispose };
}
