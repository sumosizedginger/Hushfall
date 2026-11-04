// A key hunt for a map that has a plain door on its way (PT-083 L0, node only). It finds the door the main route passes, a lit place off the road before that door for the key, writes both into the
// map's sidecar (maps-src/skill/<ID>.json), compiles, and puts a walk to the key into every route of the map, before the first waypoint the shut door cuts off.
//   node tools/dev/add-key-hunt.mjs <ID> <brass|iron|bell> "<what the player says finding it>" [--lever=<switch id>]
// With --lever the key goes to a lever on the road instead of a door (Campaign 2 has no plain doors; its gates are levers): the lever wants the key, and the walk goes before the switch op.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
import { sidecarFile, readSidecar } from '../mapkit/skill.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const [id, key, line] = process.argv.slice(2),
  leverId = process.argv.find((a) => a.startsWith('--lever='))?.slice(8);
if (!id || !key || !line) throw new Error('usage: add-key-hunt.mjs <ID> <key> "<line>"');
const compile = () => execFileSync(process.execPath, ['tools/mapkit/compile.mjs', id], { cwd: root, stdio: 'ignore' });
const srcMap = JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8')),
  map = loadMapFile(path.join(root, 'maps', id + '.json')),
  S = map.cell;
const mainFile = path.join(root, 'routes', id + '.main.route.json');
const laneOrder = [],
  seen = new Map();
runRoute(map, loadRouteFile(mainFile), {
  seed: 1,
  difficulty: 'normal',
  onTick: (w) => {
    const c = [Math.floor(w.player.x / S), Math.floor(w.player.z / S)],
      k = c.join(',');
    if (!seen.has(k)) {
      seen.set(k, laneOrder.length);
      laneOrder.push(c);
    }
  },
});
const plain = (srcMap.doors ?? []).filter((d) => !d.remote && !d.breath && !d.secret && !d.interlock && !d.soundlock && !d.key && !d.open && !d.sealed);
// the door the road goes through, as far along the road as possible but not in its first quarter
const leverEnt = leverId && srcMap.entities.find((e) => e.type === 'switch' && e.id === leverId);
if (leverId && !leverEnt) throw new Error(id + ': no lever ' + leverId);
const leverAt = leverEnt
  ? laneOrder.reduce(
      (b, c, i) =>
        Math.hypot(c[0] - leverEnt.at[0], c[1] - leverEnt.at[1]) < Math.hypot(laneOrder[b][0] - leverEnt.at[0], laneOrder[b][1] - leverEnt.at[1]) ? i : b,
      0,
    )
  : -1;
const onRoad = leverEnt
  ? [{ d: { at: [-1, -1] }, at: leverAt }]
  : plain.map((d) => ({ d, at: seen.get(d.at.join(',')) })).filter((q) => q.at != null && q.at > laneOrder.length * 0.25);
if (!onRoad.length) {
  console.error(`${id}: no plain door on the road`);
  process.exit(2);
}
const { d: door, at: doorAt } = onRoad[0];
const secretCells = new Set((map.secrets ?? []).flatMap((s) => s.cells.map((c) => c.join(','))));
const walk = (x, z) => {
  const k = map.kind(x, z);
  return k === 'floor' || k === 'outdoor' || k === 'door';
};
// everything that can be reached with this door shut
const reach = new Set();
{
  const sx = leverEnt ? laneOrder[leverAt][0] : Math.floor(map.spawn.x / S),
    sz = leverEnt ? laneOrder[leverAt][1] : Math.floor(map.spawn.z / S),
    q = [[sx, sz]];
  reach.add(sx + ',' + sz);
  while (q.length) {
    const [x, z] = q.pop();
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        k = nx + ',' + nz;
      if (reach.has(k) || !walk(nx, nz) || secretCells.has(k)) continue;
      if (nx === door.at[0] && nz === door.at[1]) continue;
      // a lever's key must be reachable with every gate a script opens still shut
      if (leverEnt && (srcMap.doors ?? []).some((d) => (d.remote || d.breath || d.soundlock || d.interlock) && d.at[0] === nx && d.at[1] === nz)) continue;
      if (map.secretPanelAt?.(nx, nz)) continue;
      reach.add(k);
      q.push([nx, nz]);
    }
  }
}
const taken = new Set(srcMap.entities.map((e) => e.at.join(',')));
for (const d of srcMap.doors ?? []) taken.add(d.at.join(','));
const before = laneOrder.slice(0, doorAt);
const clear = (x, z) => {
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (taken.has(x + dx + ',' + (z + dz))) return false;
  return !map.fx?.(x, z) || map.fx(x, z) === '.';
};
let best = null,
  bestS = -1;
for (const k of reach) {
  const [x, z] = k.split(',').map(Number);
  if (seen.has(k) || !clear(x, z) || map.kind(x, z) === 'door' || map.sectorAt(x, z) >= 0) continue;
  const near = before.reduce((m, c) => Math.min(m, Math.hypot(c[0] - x, c[1] - z)), 1e9);
  if (near < 3 || near > 12) continue;
  // far enough off the road to be a small detour, the later along the road the better
  const along = before.findIndex((c) => Math.hypot(c[0] - x, c[1] - z) === near),
    s = near + (along / Math.max(1, before.length)) * 6;
  if (s > bestS) {
    bestS = s;
    best = [x, z];
  }
}
if (!best) {
  console.error(`${id}: no place for the key`);
  process.exit(2);
}
const lamp = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]
  .map(([dx, dz]) => [best[0] + dx, best[1] + dz])
  .find(([x, z]) => reach.has(x + ',' + z) && !seen.has(x + ',' + z));
const side = readSidecar(id) ?? {};
side.keys = [{ ...(leverEnt ? { lever: leverId } : { door: door.at }), key, at: best, lamp: lamp ?? null, line }];
fs.mkdirSync(path.dirname(sidecarFile(id)), { recursive: true });
fs.writeFileSync(sidecarFile(id), JSON.stringify(side, null, 1) + '\n');
compile();
// the walk to it, in every route: before the first waypoint the shut door cuts off
let patched = 0;
for (const f of fs.readdirSync(path.join(root, 'routes')).filter((n) => n.startsWith(id + '.') && n.endsWith('.route.json'))) {
  const file = path.join(root, 'routes', f),
    ops = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (ops.some((o) => o.op === 'goto' && o.at?.[0] === best[0] && o.at?.[1] === best[1])) continue;
  const k = leverEnt ? ops.findIndex((o) => o.op === 'switch' && o.id === leverId) : ops.findIndex((o) => Array.isArray(o.at) && !reach.has(o.at.join(',')));
  if (k < 0) continue;
  ops.splice(k, 0, { op: 'goto', at: best });
  fs.writeFileSync(file, JSON.stringify(ops, null, 1) + '\n');
  patched++;
}
console.log(`${id}: the ${key} key at [${best}], for the door at [${door.at}]; ${patched} route(s) walk to it`);
