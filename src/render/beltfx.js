// What a clocked conveyor looks like (PT-045, drop B, E8a; src/engine/belts.js): a dark strip over the flowing cells and two rows of chevrons per cell that slide the way the floor is carrying you (reversing with it), slow to a stop with it and turn AMBER when it
// stands still or is about to (a stopped belt must read as stopped before anyone steps on it). Read-only: the clock is `w.time` (a belt is a pure function of it); the chevrons' position is the integral of the belt's push over the frames, so they move at
// the speed the sim moves a body. Built from plain geometry (no texture): the same idiom as the launch plates in airfx.js. The module must load and build in node (tests/belts.test.js builds and updates one with no GPU).
import * as THREE from 'three';
import { FX } from '../engine/defs.js';
import { beltState } from '../engine/belts.js';

const RUN = new THREE.Color(0xbff8ec), STOP = new THREE.Color(0xffb040);
const basic = (o) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, ...o });

/** one view for every belt of the map: { group, views: [{ mesh, strip, mat, cells, pos, sign }], update(w, dt, time) } */
export function makeBeltView(map) {
  const S = map.cell, group = new THREE.Group(), views = [];
  const shape = new THREE.Shape(); shape.moveTo(0, 0.5); shape.lineTo(0.5, -0.1); shape.lineTo(0.3, -0.25); shape.lineTo(0, 0.1); shape.lineTo(-0.3, -0.25); shape.lineTo(-0.5, -0.1); shape.closePath();
  const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2);                                         // lying flat, the tip towards -z
  for (const B of map.belts) {
    const cells = [];
    for (let cz = B.rect[1]; cz <= B.rect[3]; cz++) for (let cx = B.rect[0]; cx <= B.rect[2]; cx++) { const f = FX[map.fx(cx, cz)]?.flow; if (f) cells.push({ x: (cx + 0.5) * S, z: (cz + 0.5) * S, y: map.floor(cx, cz), f }); }
    const pos = [], idx = [];                                                                                   // the strip: one quad a cell, a hair above the floor overlays
    cells.forEach((c, i) => { const h = S / 2, y = c.y + 0.09; pos.push(c.x - h, y, c.z - h, c.x - h, y, c.z + h, c.x + h, y, c.z + h, c.x + h, y, c.z - h); idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); });
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx);
    const strip = new THREE.Mesh(sg, basic({ color: 0x14181c, opacity: 0.8 })); strip.renderOrder = 2; group.add(strip);
    const mat = basic({ color: RUN.clone(), opacity: 0.8 }), mesh = new THREE.InstancedMesh(geo, mat, cells.length * 2); mesh.renderOrder = 3; mesh.frustumCulled = false; group.add(mesh);
    views.push({ B, strip, mat, mesh, cells, p: 0, sign: 1, dummy: new THREE.Object3D() });
  }
  const bv = { group, views, update: (w, dt, time) => updateBeltView(bv, w, dt, time) };
  return bv;
}

/** per frame: integrate each belt's push (cells travelled), lay the chevrons along the cell's flow, colour them by the belt's state */
export function updateBeltView(bv, w, dt, time = 0) {
  const step = Math.max(0, Math.min(0.1, dt || 0));
  for (const v of bv.views) {
    const s = beltState(v.B, w.time), S = w.map.cell;
    v.p = (v.p + s.factor * v.B.speed * step / S) % 1; if (v.p < 0) v.p += 1;
    if (Math.abs(s.factor) > 0.02) v.sign = s.factor > 0 ? 1 : -1;
    const sc = S * 0.3, d = v.dummy;
    v.cells.forEach((c, i) => {
      const dx = c.f[0] * v.sign, dz = c.f[1] * v.sign, yaw = Math.atan2(-dx, -dz);
      for (let k = 0; k < 2; k++) { const along = ((v.p + k / 2) % 1) - 0.5; d.position.set(c.x + c.f[0] * along * S, c.y + 0.11, c.z + c.f[1] * along * S); d.rotation.set(0, yaw, 0); d.scale.setScalar(sc); d.updateMatrix(); v.mesh.setMatrixAt(i * 2 + k, d.matrix); }
    });
    v.mesh.instanceMatrix.needsUpdate = true;
    const blink = 0.5 + 0.5 * Math.sin(time * 14), amber = s.running ? s.warn * blink : 0.55 + 0.45 * blink;                 // slowing: it flickers towards amber; stopped: a steady, pulsing amber
    v.mat.color.copy(RUN).lerp(STOP, Math.min(1, s.running ? amber : 0.75 + 0.25 * blink)); v.mat.opacity = s.running ? 0.45 + 0.4 * Math.abs(s.factor) : 0.9;
  }
}
