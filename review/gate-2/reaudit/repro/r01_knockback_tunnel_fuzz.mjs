// R01: re-verify audit A03 (knockback tunnelling) with (a) a scenario that fails on the pre-repair sim and (b) a fuzz over every shipped map.
// (a) a real Warden charge hits a player standing 0.55 m from a one-cell wall with a room behind it: pre-repair the player lands in the next room (3 m shove, destination-only test); repaired the player stays.
// (b) tryMove(player, 3 m and 6 m in random directions from random floor positions) on every shipped map: count "tunnels" = the straight segment start->end spends >= 1 m inside solid wall/door cells and the final position is beyond the wall, in free space. Pre-repair count vs repaired count.
// Run from repo root: node review/gate-2/reaudit/repro/r01_knockback_tunnel_fuzz.mjs [rootDir]   (rootDir = alternative repo copy, default '.')
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || '.');
const M = await import(pathToFileURL(path.join(root, 'src/engine/mapformat.js')).href);
const W = await import(pathToFileURL(path.join(root, 'src/engine/world.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/engine/defs.js')).href);
const T = await import(pathToFileURL(path.join(root, 'src/engine/terrain.js')).href);
const R = D.PLAYER.radius;
// tryMove: pre-repair it is a private function; reimplement the OLD one here when the module does not export it
// the pre-repair tryMove (private in that tree) tested only the END point of each axis move; reproduce it verbatim for the fuzz when the tree does not export the repaired one
const tryMove = W.tryMove ?? ((w, o, dx, dz, r) => { if (!W.blockedCircle(w, o.x + dx, o.z, r, o)) o.x += dx; if (!W.blockedCircle(w, o.x, o.z + dz, r, o)) o.z += dz; o.y = T.groundAt(w, o.x, o.z, r); });

// ---- (a) real charge
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const g = ['###########', '#....#....#', '#....#....#', '#....#....#', '###########'];
const src = { format: 1, id: 'K', version: 1, name: 'k', grid: g, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [9, 3] }] };
const w = W.createWorld(M.parseMap(src), { seed: 1 }); const cell = (c) => (c + 0.5) * 2;
const e = W.spawnEnemy(w, 'wardengraft', cell(1), cell(2), Math.PI / 2);   // yaw +pi/2 heads +x, towards the player (the audit-repair kit test used -pi/2, which sends the Warden the other way: see REAUDIT R03)
w.player.hp = 5000; Object.assign(w.player, { x: 10 - 0.55, z: cell(2), yaw: 0 }); e.state = 'chase'; e.chargeT = 0.86; e.chargeCd = 0;
let maxX = w.player.x, jumped = 0; for (let i = 0; i < 300; i++) { const x0 = w.player.x; W.step(w, idle()); W.drainEvents(w); jumped = Math.max(jumped, Math.abs(w.player.x - x0)); maxX = Math.max(maxX, w.player.x); }
console.log(`(a) Warden charge beside a 2 m wall: player x from 9.45 to ${w.player.x.toFixed(2)} (wall occupies x 10..12); biggest single-tick jump ${jumped.toFixed(2)} m; ended in the far room: ${w.player.x > 12}`);

// ---- (b) fuzz
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let total = 0, tunnels = 0, sample = null;
for (const f of fs.readdirSync(path.join(root, 'maps')).filter((x) => x.endsWith('.json'))) {
  const map = M.parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', f), 'utf8')));
  const ww = W.createWorld(map, { seed: 1 }); for (const en of ww.enemies) en.state = 'dead'; ww.player.x = -999; ww.player.z = -999;
  const mk = () => ({ x: 0, z: 0, y: 0 });
  for (let n = 0; n < 4000; n++) {
    const cx = Math.floor(rnd() * map.w), cz = Math.floor(rnd() * map.h); if (map.kind(cx, cz) !== 'floor' && map.kind(cx, cz) !== 'outdoor') continue;
    const o = mk(); o.x = (cx + rnd()) * map.cell; o.z = (cz + rnd()) * map.cell; o.y = T.groundAt(ww, o.x, o.z, R); if (W.blockedCircle(ww, o.x, o.z, R, o)) continue;
    const a = rnd() * Math.PI * 2, len = rnd() < 0.5 ? 3 : 6, dx = Math.sin(a) * len, dz = Math.cos(a) * len, x0 = o.x, z0 = o.z;
    // the straight line crosses >= 1 m of solid wall / closed door cells (not props: those can be slid around)
    let tIn = null, tOut = null, inside = 0; for (let t = 0.05; t <= len; t += 0.05) if (W.cellSolid(ww, Math.floor((x0 + dx * t / len) / map.cell), Math.floor((z0 + dz * t / len) / map.cell))) { if (tIn == null) tIn = t; tOut = t; inside += 0.05; }
    tryMove(ww, o, dx, dz, R); total++;
    if (tIn != null && inside >= 1.0) { const proj = (o.x - x0) * dx / len + (o.z - z0) * dz / len; if (proj > tOut + 0.05 && !W.blockedCircle(ww, o.x, o.z, R, { y: o.y })) { tunnels++; if (!sample) sample = `${f} from (${x0.toFixed(2)},${z0.toFixed(2)}) dir ${a.toFixed(2)} len ${len}: wall from ${tIn.toFixed(2)} to ${tOut.toFixed(2)} m, moved ${proj.toFixed(2)} m along the line`; } }
  }
}
console.log(`(b) ${total} random knock-backs (3 m / 6 m) on the nine shipped maps: ${tunnels} tunnelled through a blocked point`, sample ? '| first: ' + sample : '');
