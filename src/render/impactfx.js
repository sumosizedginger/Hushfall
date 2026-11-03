// The small things that fly: chips and sparks where a shot stopped, spent cases, the parts of a burst body. Render only: nothing here touches the sim.
// Chips and cases are one instanced mesh each, a fixed pool with no allocation per frame; the parts of a body share the rig's own geometry and materials.
import * as THREE from 'three';
import { SURFACE_BURST, CASINGS, GIBS } from './feel.js';
import { debrisFloor, spawnGround } from './debris.js';

const CHIP_CAP = 220,
  CASE_CAP = 48;
const M = new THREE.Matrix4(),
  Q = new THREE.Quaternion(),
  E = new THREE.Euler(),
  P = new THREE.Vector3(),
  S = new THREE.Vector3(),
  C = new THREE.Color();

function makePool(geo, cap, scene) {
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), cap);
  mesh.frustumCulled = false;
  mesh.count = 0;
  scene.add(mesh);
  return { mesh, items: [], next: 0, cap };
}

export class ImpactFx {
  constructor(scene, rnd) {
    this.scene = scene;
    this.rnd = rnd;
    this.chips = makePool(new THREE.TetrahedronGeometry(0.06), CHIP_CAP, scene);
    this.cases = makePool(new THREE.BoxGeometry(1, 1, 1), CASE_CAP, scene);
    for (const pool of [this.chips, this.cases]) pool.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pool.cap * 3), 3);
    this.parts = [];
  }

  /** one chip into the pool, the oldest going if it is full */
  put(pool, it) {
    if (pool.items.length < pool.cap) pool.items.push(it);
    else {
      pool.items[pool.next] = it;
      pool.next = (pool.next + 1) % pool.cap;
    }
  }

  /** chips where a shot stopped, by the family of what it hit */
  burst(family, x, y, z, k = 1) {
    const B = SURFACE_BURST[family] ?? SURFACE_BURST.stone,
      r = this.rnd;
    for (let i = 0, n = Math.round(B.n * k); i < n; i++) {
      this.put(this.chips, {
        x,
        y,
        z,
        vx: (r() - 0.5) * B.speed,
        vy: (r() * 0.7 + 0.25) * B.speed,
        vz: (r() - 0.5) * B.speed,
        g: B.gravity,
        life: B.life * (0.7 + 0.6 * r()),
        size: B.size * (0.7 + 0.6 * r()),
        color: B.colors[Math.floor(r() * B.colors.length) % B.colors.length],
        ax: r() * 6,
        ay: r() * 6,
        ground: null,
      });
    }
  }

  /** a spray of wet chips from a burst body */
  spray(x, y, z, color, n = 26) {
    const r = this.rnd;
    for (let i = 0; i < n; i++) {
      this.put(this.chips, {
        x: x + (r() - 0.5) * 0.3,
        y: y + r() * 0.6,
        z: z + (r() - 0.5) * 0.3,
        vx: (r() - 0.5) * 6,
        vy: r() * 4.5 + 0.5,
        vz: (r() - 0.5) * 6,
        g: 13,
        life: 0.5 + r() * 0.5,
        size: 0.5 + r() * 1.1,
        color,
        ax: r() * 6,
        ay: r() * 6,
        ground: null,
      });
    }
  }

  /** a spent case thrown out to the right of the view; (rx, rz) is the view's right, (vx, vz) the shooter's own speed */
  casing(kind, x, y, z, rx, rz, vx, vz) {
    const C0 = CASINGS[kind];
    if (!C0) return;
    const r = this.rnd;
    this.put(this.cases, {
      x,
      y,
      z,
      vx: vx * 0.7 + rx * C0.speed * (0.8 + 0.4 * r()) + (r() - 0.5) * 0.5,
      vy: 1.5 + r() * 1.1,
      vz: vz * 0.7 + rz * C0.speed * (0.8 + 0.4 * r()) + (r() - 0.5) * 0.5,
      g: 11,
      life: C0.life,
      sx: C0.size[0],
      sy: C0.size[1],
      sz: C0.size[2],
      color: C0.color,
      ax: r() * 6,
      ay: r() * 6,
      bounced: 0,
      ground: null,
    });
  }

  /**
   * a body bursts: the rig's meshes fly apart from where they stand now. (dx, dz) is the blow's direction. The meshes are new objects over the rig's own geometry and
   * materials, so the ink and the paint are the creature's own.
   */
  burstBody(rig, x, y, z, dx, dz) {
    const meshes = [];
    rig.updateWorldMatrix(true, true);
    rig.traverse((o) => {
      if (o.isMesh && o.visible) meshes.push(o);
    });
    meshes.sort((a, b) => (b.geometry.boundingSphere?.radius ?? 0) - (a.geometry.boundingSphere?.radius ?? 0));
    const r = this.rnd;
    for (const o of meshes.slice(0, GIBS.maxParts)) {
      const m = new THREE.Mesh(o.geometry, o.material);
      o.matrixWorld.decompose(m.position, m.quaternion, m.scale);
      m.frustumCulled = false;
      this.scene.add(m);
      const up = m.position.y - y,
        sp = GIBS.speed * (0.5 + r());
      this.parts.push({
        m,
        vx: dx * sp * 0.8 + (m.position.x - x) * 2 + (r() - 0.5) * 2.5,
        vy: 1.5 + r() * 3 + up * 0.8,
        vz: dz * sp * 0.8 + (m.position.z - z) * 2 + (r() - 0.5) * 2.5,
        wx: (r() - 0.5) * 14,
        wy: (r() - 0.5) * 14,
        wz: (r() - 0.5) * 14,
        life: GIBS.life[0] + r() * (GIBS.life[1] - GIBS.life[0]),
        k: m.scale.x,
        rest: false,
        ground: null,
      });
    }
    while (this.parts.length > GIBS.cap) this.scene.remove(this.parts.shift().m);
  }

  stepPool(pool, w, dt, drawSize) {
    const items = pool.items;
    let n = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const q = items[i];
      q.life -= dt;
      if (q.life <= 0) {
        items[i] = items[items.length - 1];
        items.pop();
        continue;
      }
      if (!q.still) {
        q.vy -= q.g * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.z += q.vz * dt;
        q.ax += dt * 11;
        q.ay += dt * 8;
        q.ground ??= spawnGround(w, q.x, q.z);
        const floor = debrisFloor(w, q.x, q.z, q.ground);
        if (q.y <= floor + 0.015) {
          q.y = floor + 0.015;
          if (q.bounced != null && q.bounced < 2 && q.vy < -1) {
            q.bounced++;
            q.vy *= -0.32;
            q.vx *= 0.55;
            q.vz *= 0.55;
          } else q.still = true;
        }
      }
    }
    pool.next = Math.min(pool.next, Math.max(0, items.length - 1));
    for (const q of items) {
      P.set(q.x, q.y, q.z);
      E.set(q.still ? 1.57 : q.ax, q.ay, 0);
      Q.setFromEuler(E);
      drawSize(q, S);
      M.compose(P, Q, S);
      pool.mesh.setMatrixAt(n, M);
      pool.mesh.setColorAt(n, C.setHex(q.color));
      n++;
    }
    pool.mesh.count = n;
    pool.mesh.instanceMatrix.needsUpdate = true;
    if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
  }

  update(w, dt) {
    this.stepPool(this.chips, w, dt, (q, s) => s.setScalar(q.size * Math.min(1, q.life * 6)));
    this.stepPool(this.cases, w, dt, (q, s) => s.set(q.sx, q.sy, q.sz));
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.m);
        this.parts.splice(i, 1);
        continue;
      }
      if (p.life < 0.6) p.m.scale.setScalar(p.k * (p.life / 0.6));
      if (p.rest) continue;
      p.vy -= 13 * dt;
      p.m.position.x += p.vx * dt;
      p.m.position.y += p.vy * dt;
      p.m.position.z += p.vz * dt;
      p.m.rotation.x += p.wx * dt;
      p.m.rotation.y += p.wy * dt;
      p.m.rotation.z += p.wz * dt;
      p.ground ??= spawnGround(w, p.m.position.x, p.m.position.z);
      const floor = debrisFloor(w, p.m.position.x, p.m.position.z, p.ground);
      if (p.m.position.y <= floor + 0.05) {
        p.m.position.y = floor + 0.05;
        if (p.vy < -2) {
          p.vy *= -0.28;
          p.vx *= 0.5;
          p.vz *= 0.5;
          p.wx *= 0.4;
          p.wy *= 0.4;
          p.wz *= 0.4;
        } else p.rest = true;
      }
    }
  }

  dispose() {
    for (const pool of [this.chips, this.cases]) {
      this.scene.remove(pool.mesh);
      pool.mesh.geometry.dispose();
      pool.mesh.material.dispose();
      pool.mesh.dispose();
    }
    for (const p of this.parts) this.scene.remove(p.m);
    this.parts.length = 0;
  }
}
