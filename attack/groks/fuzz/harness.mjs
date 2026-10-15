// GROKS shared harness. Imports the sim; writes nothing outside attack/groks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorld, step, drainEvents, hashWorld, restartWorld } from '../../../src/engine/world.js';
import { loadMapFile } from '../../../src/engine/harness.js';
import { makeSave, parseSave, loadWorld } from '../../../src/engine/save.js';
import { PLAYER } from '../../../src/engine/defs.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const MAPS_DIR = path.join(ROOT, 'maps');
export const OUT = path.join(ROOT, 'attack', 'groks', 'fuzz', 'out');

export function mapList() {
  return fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
}
export function loadMap(id) { return loadMapFile(path.join(MAPS_DIR, id + '.json')); }

export const idle = () => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, melee: false, lamp: false, weapon: null, weaponStep: 0, weaponLast: false, pause: false, map: false });

export function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** finite-number and containment checks a tick of play must keep. Returns short strings. */
export function invariantErrors(w) {
  const bad = [];
  const num = (v, name) => { if (typeof v !== 'number' || !Number.isFinite(v)) bad.push(name + '=' + v); };
  const p = w.player;
  if (!p) return ['no player'];
  num(p.x, 'player.x'); num(p.z, 'player.z'); num(p.y, 'player.y'); num(p.hp, 'player.hp'); num(p.armor, 'player.armor'); num(p.yaw, 'player.yaw'); num(p.pitch, 'player.pitch');
  if (p.hp < 0) bad.push('player.hp negative');
  if (p.armor < 0) bad.push('player.armor negative');
  if (p.ammo && typeof p.ammo === 'object') for (const [k, v] of Object.entries(p.ammo)) { num(v, 'ammo.' + k); if (typeof v === 'number' && v < 0) bad.push('ammo.' + k + ' negative'); }
  const m = w.map;
  if (m?.kind && Number.isFinite(p.x) && Number.isFinite(p.z)) {
    if (p.x < -2 || p.z < -2 || p.x > m.w * m.cell + 2 || p.z > m.h * m.cell + 2) bad.push('player out of bounds ' + p.x.toFixed(2) + ',' + p.z.toFixed(2));
    if (!p.air && w.status === 'playing') {
      const cx = Math.floor(p.x / m.cell), cz = Math.floor(p.z / m.cell);
      if (m.kind(cx, cz) === 'wall') bad.push('player centre in a wall cell ' + cx + ',' + cz);
    }
  }
  if (Array.isArray(w.enemies)) for (const e of w.enemies) {
    num(e.x, 'e' + e.id + '.x'); num(e.z, 'e' + e.id + '.z'); num(e.y, 'e' + e.id + '.y'); num(e.hp, 'e' + e.id + '.hp');
  }
  if (Array.isArray(w.projectiles)) for (const q of w.projectiles) { num(q.x, 'proj.x'); num(q.y, 'proj.y'); num(q.z, 'proj.z'); }
  if (w.events && w.events.length > 800) bad.push('event flood ' + w.events.length);
  if (Array.isArray(w.enemies) && w.enemies.length > 400) bad.push('enemy leak ' + w.enemies.length);
  return bad;
}

/** step n ticks. Returns { threw, error, bad, ticks, hash, status, hp }. */
export function runTicks(w, n, cmdFn, { drain = true } = {}) {
  let threw = null, bad = null, i = 0;
  try {
    for (; i < n && w.status === 'playing'; i++) {
      step(w, cmdFn(i, w));
      const errs = invariantErrors(w);
      if (errs.length) { bad = errs; break; }
      if (drain && w.events) drainEvents(w);
    }
  } catch (e) { threw = (e && e.stack) ? e.stack.split('\n').slice(0, 6).join('\n') : String(e); }
  return { threw, bad, ticks: i, hash: threw ? null : safeHash(w), status: w.status, hp: w.player?.hp, x: w.player?.x, z: w.player?.z };
}
function safeHash(w) { try { return hashWorld(w); } catch (e) { return 'hash-threw:' + e.message; } }

export function armEverything(w) {
  const ammo = { flare: 80, shell: 40, rivet: 80, bolt: 24, cell: 60, round: 40, rocket: 20 };
  w.player.weapons = ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'fists', 'boathook', 'marlinspike', 'mallet', 'axe', 'chainsaw', 'carbine', 'linethrower', 'fork', 'mortar'];
  w.player.ammo = { ...ammo };
  w.player.hp = PLAYER.maxHp; w.player.armor = 50;
}

export function roundTrip(w, map) {
  const save = makeSave(w, 'mid-level', { now: 1 });
  const parsed = parseSave(JSON.stringify(save));
  if (!parsed.ok) return { ok: false, stage: 'parse', detail: parsed.detail };
  let loaded;
  try { loaded = loadWorld(parsed.save, () => map); }
  catch (e) { return { ok: false, stage: 'load-threw', detail: e.message }; }
  if (!loaded.ok) return { ok: false, stage: 'load', detail: loaded.detail };
  return { ok: true, world: loaded.world };
}

export function writeOut(name, data) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));
}

export { createWorld, step, drainEvents, hashWorld, restartWorld, makeSave, parseSave, loadWorld };
