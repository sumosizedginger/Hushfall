// What a car looks like (PT-045, drop B, E8b; src/engine/cars.js): a steel deck with a tread plate, a rim of lamps, four corner posts and a dark undercarriage, carried along its loop by the clock. The rim is the TELL: steady dim amber while the car waits, blinking
// amber and white in the last CARS.warn s of the dwell (it is about to leave: step off or ride), pale teal while it runs. Read-only: the position is `carState(car, t)` at the time the player is drawn at (the view interpolates the player between two ticks, so the car is
// drawn at the same instant: a rider and the deck never slide against each other). Built from plain geometry (no texture). Builds and updates in node (tests/render-pt45.test.js).
import * as THREE from 'three';
import { carState } from '../engine/cars.js';
import { TICK } from '../engine/defs.js';

const STEEL = new THREE.Color(0x3b444a), AMBER = new THREE.Color(0xffa23a), WHITE = new THREE.Color(0xfff2d0), TEAL = new THREE.Color(0x7ff0dc), DIM = new THREE.Color(0x7a5020);

/** { group, views: [{ car, group, rim }], update(w, alpha) } */
export function makeCarView(map) {
  const S = map.cell, group = new THREE.Group(), views = [];
  for (const car of map.cars) {
    const W = car.size[0] * S, D = car.size[1] * S, g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, D), new THREE.MeshLambertMaterial({ color: STEEL })); deck.position.y = -0.15; g.add(deck);
    const tread = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.5, D - 0.5), new THREE.MeshLambertMaterial({ color: 0x59636a, emissive: 0x0c0f12 })); tread.rotation.x = -Math.PI / 2; tread.position.y = 0.012; g.add(tread);
    const under = new THREE.Mesh(new THREE.BoxGeometry(W * 0.55, 0.7, D * 0.55), new THREE.MeshLambertMaterial({ color: 0x20262a })); under.position.y = -0.65; g.add(under);
    const rim = new THREE.MeshBasicMaterial({ color: DIM.clone() }), edge = 0.16;
    for (const [w, d, x, z] of [[W, edge, 0, -D / 2 + edge / 2], [W, edge, 0, D / 2 - edge / 2], [edge, D, -W / 2 + edge / 2, 0], [edge, D, W / 2 - edge / 2, 0]]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), rim); bar.position.set(x, 0.03, z); g.add(bar); }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), new THREE.MeshLambertMaterial({ color: 0x2b3238 })); post.position.set(x * (W / 2 - 0.15), 0.45, z * (D / 2 - 0.15)); g.add(post); const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.24), rim); lamp.position.set(x * (W / 2 - 0.15), 0.98, z * (D / 2 - 0.15)); g.add(lamp); }
    group.add(g); views.push({ car, group: g, rim });
  }
  const cv = { group, views, update: (w, alpha = 1, time = 0) => updateCarView(cv, w, alpha, time) };
  return cv;
}

/** per frame: put each deck where the clock says (at the instant the interpolated player is drawn at) and colour its rim by what it is about to do */
export function updateCarView(cv, w, alpha = 1, time = 0) {
  const t = w.time + (alpha - 1) * TICK;
  for (const v of cv.views) {
    const st = carState(v.car, t); v.group.position.set(st.x, st.y, st.z);
    const blink = Math.sin(time * 16) > 0;
    if (st.moving) v.rim.color.copy(TEAL);
    else if (st.warn > 0) v.rim.color.copy(blink ? WHITE : AMBER);
    else v.rim.color.copy(DIM).lerp(AMBER, 0.35 + 0.15 * Math.sin(time * 2));
  }
}
