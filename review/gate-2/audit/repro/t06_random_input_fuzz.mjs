// T06: random-input fuzz of the real sim on every shipped map, everything awake and the player made hard to kill (so the run lasts): random movement, turning,
// firing, weapon switching, aiming, sprinting and Use for 4000 ticks x 3 seeds per map. Checks after every 20 ticks: no exception, every number finite, the player and
// every living enemy is not inside a wall/closed door cell, and the player's y is within one step of the floor beneath. Reports the first violation per map/seed.
// Run: node review/gate-2/audit/repro/t06_random_input_fuzz.mjs
import fs from 'node:fs';
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, step, cellSolid } from '../../../../src/engine/world.js';
import { groundAt } from '../../../../src/engine/terrain.js';
import { PLAYER, ENEMIES, STEP } from '../../../../src/engine/defs.js';
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const nonFinite = (o, path = 'w', out = []) => { if (out.length > 3) return out; if (typeof o === 'number') { if (!Number.isFinite(o)) out.push(path + '=' + o); } else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) nonFinite(v, path + '.' + k, out); return out; };
let total = 0;
for (const f of fs.readdirSync('maps').filter((f) => f.endsWith('.json'))) {
  const map = loadMapFile('maps/' + f);
  for (const seed of [1, 2, 3]) {
    const w = createWorld(map, { seed, difficulty: 'hard' }), rnd = mulberry(seed * 7919 + map.w), issues = [];
    w.player.weapons = ['flare', 'scattergun', 'rivet']; w.player.ammo = { flare: 30, shell: 40, rivet: 200 };
    for (const e of w.enemies) if (e.state === 'idle' && !ENEMIES[e.kind].node) { e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; }
    let cmd = null, hold = 0;
    try {
      for (let t = 0; t < 4000 && w.status === 'playing' && issues.length === 0; t++) {
        if (hold-- <= 0) { hold = 10 + Math.floor(rnd() * 40); cmd = { move: [Math.round(rnd() * 2 - 1), Math.round(rnd() * 2 - 1)], yaw: (rnd() - 0.5) * 0.12, pitch: (rnd() - 0.5) * 0.04, fire: rnd() < 0.5, aim: rnd() < 0.2, sprint: rnd() < 0.3, use: rnd() < 0.3, weapon: rnd() < 0.05 ? Math.floor(rnd() * 3) : null, weaponStep: 0, map: false }; }
        w.player.hp = Math.max(w.player.hp, 60);                                        // keep the run going
        step(w, { ...cmd, use: cmd.use && t % 7 === 0 });
        if (t % 20 === 0) {
          const nf = nonFinite(w); if (nf.length) issues.push('non-finite state at tick ' + w.tick + ': ' + nf.join(', '));
          const p = w.player, S = map.cell;
          if (cellSolid(w, Math.floor(p.x / S), Math.floor(p.z / S))) issues.push(`player inside a solid cell at tick ${w.tick} (${(p.x / S).toFixed(2)},${(p.z / S).toFixed(2)}) kind ${map.kind(Math.floor(p.x / S), Math.floor(p.z / S))}`);
          if (Math.abs(p.y - groundAt(w, p.x, p.z, PLAYER.radius)) > STEP + 0.01) issues.push(`player y ${p.y} far from ground ${groundAt(w, p.x, p.z, PLAYER.radius)} at tick ${w.tick}`);
          for (const e of w.enemies) if (e.state !== 'dead' && cellSolid(w, Math.floor(e.x / S), Math.floor(e.z / S)) ) issues.push(`${e.kind}#${e.id} inside a solid cell at tick ${w.tick} (${(e.x / S).toFixed(2)},${(e.z / S).toFixed(2)}) kind ${map.kind(Math.floor(e.x / S), Math.floor(e.z / S))}`);
        }
      }
    } catch (e) { issues.push('EXCEPTION ' + e.message.slice(0, 100)); }
    total += issues.length;
    console.log(f.replace('.json', '').padEnd(9), 'seed', seed, 'ticks', w.tick, 'status', w.status, '|', issues[0] ?? 'no violation');
  }
}
console.log('violations:', total);
