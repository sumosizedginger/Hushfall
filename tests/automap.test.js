import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, hashWorld } from '../src/engine/world.js';
import { automapModel, EXPLORE_RADIUS_CELLS } from '../src/engine/automap.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { InputState, DEFAULT_BINDINGS } from '../src/engine/input.js';
import { loadMap, mapLoader } from './helpers.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const quiet = (seed = 1) => { const w = createWorld(loadMap(), { seed }); w.enemies.length = 0; return w; };
const isSeen = (w, cx, cz) => w.explored[cz * w.map.w + cx] === 1;
const settle = (w, ticks = 12) => { for (let i = 0; i < ticks; i++) step(w, idle()); };

test('nothing is explored at the start except what is in view; the player cell always is', () => {
  const w = createWorld(loadMap(), { seed: 1 }); assert.equal(w.explored.reduce((a, b) => a + b, 0), 0, 'before the first tick');
  w.enemies.length = 0; settle(w);
  assert.ok(isSeen(w, Math.floor(w.player.x / 2), Math.floor(w.player.z / 2)));
  assert.ok(w.explored.reduce((a, b) => a + b, 0) > 10);
});

test('fog of war: cells behind walls and closed doors stay unexplored, and the radius is finite', () => {
  const w = quiet(); Object.assign(w.player, { x: 11, z: 19 }); settle(w, 30);                    // hall, just north of the closed storeroom door (5,10)
  assert.equal(isSeen(w, 5, 11), false, 'storeroom behind the closed door');
  assert.equal(isSeen(w, 20, 3), false, 'quay behind the thick wall');
  assert.equal(isSeen(w, 12, 3), false, 'secret pocket inside the wall');
  const far = w.map.w - 2; assert.equal(isSeen(w, far, 8), false, 'far away');
  for (let i = 0; i < w.explored.length; i++) if (w.explored[i]) {
    const cx = i % w.map.w, cz = Math.floor(i / w.map.w);
    assert.ok(Math.hypot((cx + 0.5) * 2 - w.player.x, (cz + 0.5) * 2 - w.player.z) <= EXPLORE_RADIUS_CELLS * 2 + 1e-6, `cell ${cx},${cz} beyond the explore radius`);
  }
});

test('opening the door and looking through reveals the room beyond', () => {
  const w = quiet(); Object.assign(w.player, { x: 11, z: 19, yaw: Math.PI });                    // facing south at the door
  const door = w.doors.find((d) => d.cx === 5 && d.cz === 10); door.target = 1; door.open = 1;
  w.player.x = 11; w.player.z = 21;                                                               // standing in the doorway
  settle(w, 30); assert.ok(isSeen(w, 5, 12) || isSeen(w, 5, 11), 'storeroom now seen');
});

test('exploration only ever grows, and it is deterministic', () => {
  const run = () => { const w = quiet(4); let last = 0; for (let t = 0; t < 600; t++) { step(w, idle({ move: [0, 1], yaw: t % 100 < 10 ? 0.05 : 0 })); const n = w.explored.reduce((a, b) => a + b, 0); assert.ok(n >= last); last = n; } return hashWorld(w); };
  assert.equal(run(), run());
});

test('the model never gives away an unopened secret panel or unseen exit', () => {
  const w = quiet(); Object.assign(w.player, { x: 7, z: 7, yaw: Math.PI / 2 }); settle(w, 30);
  const panel = w.doors.find((d) => d.secret);
  let m = automapModel(w); const cell = m.cells.find((c) => c.cx === panel.cx && c.cz === panel.cz);
  if (cell) assert.equal(cell.kind, 'wall', 'a closed secret panel is drawn as ordinary wall');
  assert.equal(m.exits.length, 0, 'the exit is not on the map until seen');
  panel.open = 1; panel.target = 1; w.player.x = (panel.cx + 0.5) * 2 - 2; w.player.z = (panel.cz + 0.5) * 2; settle(w, 30);
  m = automapModel(w); assert.equal(m.cells.find((c) => c.cx === panel.cx && c.cz === panel.cz).kind, 'secret-revealed');
});

test('the model reports doors with their key type, and the player pose', () => {
  const w = quiet(); Object.assign(w.player, { x: 53, z: 7, yaw: -Math.PI / 2 }); settle(w, 30);        // west of the locked boathouse door
  const m = automapModel(w); const d = m.doors.find((x) => x.cx === 27 && x.cz === 3);
  assert.ok(d && d.key === 'brass' && d.axis === 'z', 'brass door seen: ' + JSON.stringify(m.doors));
  assert.equal(m.player.x, w.player.x); assert.equal(m.name, 'Fixture Hall and Quay'); assert.ok(m.exploredCount > 20);
});

test('exploration survives save/load, and a save from before the automap migrates cleanly', () => {
  const w = quiet(); for (let t = 0; t < 300; t++) step(w, idle({ move: [0, 1] }));
  const n = w.explored.reduce((a, b) => a + b, 0); assert.ok(n > 30);
  const back = loadWorld(parseSave(JSON.stringify(makeSave(w, 'mid-level'))).save, mapLoader).world;
  assert.equal(back.explored.reduce((a, b) => a + b, 0), n); assert.equal(hashWorld(back), hashWorld(w));
  const s = makeSave(w, 'mid-level'); s.version = 3; delete s.world.explored;                     // exactly a v3 file
  const r = parseSave(JSON.stringify(s)); assert.equal(r.ok, true, r.detail); assert.equal(r.migratedFrom, 3);
  const old = loadWorld(r.save, mapLoader).world; for (let t = 0; t < 30; t++) step(old, idle());
  assert.ok(old.explored.length === old.map.w * old.map.h && old.explored.reduce((a, b) => a + b, 0) > 0, 'automap works after loading an old save');
});

test('the map key is bound by default and reaches the command as an edge action', () => {
  assert.deepEqual(DEFAULT_BINDINGS.map, ['Tab']);
  const i = new InputState(); i.keyDown('Tab'); const a = i.sample(), b = i.sample(); assert.equal(a.map, true); assert.equal(b.map, false);
});
