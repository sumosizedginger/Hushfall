// R06: re-check audit A22 on the repaired sim with a scenario that can fail. A two-cell lift carries the player (with 50 hp) up 2 m; a health pack lies on the far lift cell and a lever is mounted on the near one.
//   before the repair (f79bf59): the pack stayed at y=0 under the raised slab (uncollectable, hp stays 50) and the lever's reach test used its creation height.
//   after: the pack rises with the floor and is collected on the platform; the lever is still usable at the top.
// Run from repo root: node review/gate-2/reaudit/repro/r06_pickup_switch_on_lift.mjs [rootDir]   (rootDir = an alternative copy of the repo, e.g. the pre-repair tree)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || '.');
const M = await import(pathToFileURL(path.join(root, 'src/engine/mapformat.js')).href);
const W = await import(pathToFileURL(path.join(root, 'src/engine/world.js')).href);
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const g = ['#########', '#...#...#', '#...#...#', '#########'];
const src = { format: 1, id: 'R6', version: 1, name: 'r6', grid: g, doors: [], secrets: [], ceilingHeight: 8,
  heights: ['.........', '.........', '.........', '.........'],
  sectors: [{ id: 'car', cells: [[5, 1], [6, 1]], low: 0, high: 2, speed: 4, start: 'low' }],
  triggers: [{ id: 'drive', when: 'time:9999', do: [{ sector: { id: 'car', to: 'high' } }] }],
  entities: [{ type: 'player', at: [5, 1], facing: 'east' }, { type: 'exit', at: [7, 2] },
    { type: 'switch', id: 'lever', at: [5, 1], wall: 'north', once: false, do: [{ sector: { id: 'car', to: 'low' } }] },
    { type: 'pickup', kind: 'health_large', at: [6, 1] }] };
const v = M.validateMap(src); console.log('validateMap ok:', v.ok, v.errors ?? '');
if (!v.ok) process.exit(0);
const w = W.createWorld(M.parseMap(src), { seed: 1 }); w.player.hp = 50; const cell = (c) => (c + 0.5) * 2;
Object.assign(w.player, { x: cell(5), z: cell(1), yaw: 0 });
const r = (n, cmd) => { for (let i = 0; i < n; i++) { W.step(w, cmd ? cmd(i) : idle()); W.drainEvents(w); } };
const { runAction } = await import(pathToFileURL(path.join(root, 'src/engine/script.js')).href);
runAction(w, { sector: { id: 'car', to: 'high' } }); r(60);
console.log('lift at', w.sectors[0].h, '| player y', w.player.y, '| pack y', w.pickups[0]?.y ?? '(collected)', '| hp', w.player.hp);
w.player.x = cell(6); r(5); console.log('after stepping onto the pack cell: hp', w.player.hp, w.pickups.length ? '(pack still lying there)' : '(pack collected)');
Object.assign(w.player, { x: cell(5), z: cell(1), yaw: 0 }); const u = W.useTarget(w); console.log('lever usable at the top:', u?.switchId === 'lever');
