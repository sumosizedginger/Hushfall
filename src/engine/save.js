// Versioned save data. Policy: a save is either migrated to the current version or rejected with an explicit reason.
// Nothing is ever silently coerced. Unknown/newer versions and corrupt files are reported, not loaded.
import { createWorld, carryOver } from './world.js';
import { ENEMIES, WEAPONS, KEYS, PICKUPS, DIFFICULTY, PLAYER, AMMO_MAX } from './defs.js';
import { newProgress, sanitizeProgress, armorCap, ammoCap } from './progress.js';

export const SAVE_MAGIC = 'HUSHFALL_SAVE';
export const SAVE_VERSION = 10;
/** version N -> function producing version N+1. */
export const MIGRATIONS = {
  // v1 -> v2 (2026-09-29): player gained sprint/aim state (ads, sprint, recover, sprinting). Old mid-level worlds start from rest.
  // v2 -> v3 (2026-09-29): weapon switching + Gaunt lunge. Player gains switchT, projectiles record their weapon, enemies gain lunge state.
  // v3 -> v4 (2026-09-29): automap exploration state. Old worlds start with nothing explored (the sim re-creates the array).
  // v4 -> v5 (2026-09-29): in-world messages remember which have been shown.
  // v5 -> v6 (2026-09-29): levelStart (Retry restores the level-start inventory, not the mid-level one), enemy shots, hunt state. Old worlds get a fresh level start.
  // v6 -> v7 (2026-09-30, Gate 2 kit): terrain height for actors/pickups, moving floors, triggers/switches/exit locks, objective, remote doors, hazard state.
  // v7 -> v8 (2026-09-30): tone pulses (the boss), enemy stagger/charge/channel state (read lazily, so old worlds simply have none).
  // v8 -> v9 (2026-10-05): campaign progression (progress.js): the save carries `progress` (salvage, upgrade tiers, per-map records) and the world carries `upgrades` (its level-start copy too). Old saves start with none.
  // v9 -> v10 (2026-10-07): weapon identities and melee (PT-013). The player gains the charge, swing, guard and melee-slot fields, the world gains burning ground. Old worlds start with all of it at rest.
  9: (s) => ({ ...s, version: 10, world: s.world ? { burns: [], ...s.world, player: { charge: 0, swingT: -1, swingKind: null, swingHit: false, guard: 0, guarding: false, parryW: 0, parryCd: 0, riposteT: 0, brokenT: 0, meleeWeapon: 'fists', lastWeapon: null, ...s.world.player } } : s.world }),
  8: (s) => ({ ...s, version: 9, progress: newProgress(), carry: s.carry ? { upgrades: { ammo: 0, armor: 0 }, ...s.carry } : s.carry, world: s.world ? { upgrades: { ammo: 0, armor: 0 }, ...s.world, levelStart: s.world.levelStart ? { upgrades: { ammo: 0, armor: 0 }, ...s.world.levelStart } : s.world.levelStart } : s.world }),
  7: (s) => ({ ...s, version: 8, world: s.world ? { pulses: [], ...s.world } : s.world }),
  6: (s) => ({ ...s, version: 7, world: s.world ? { sectors: [], triggerState: {}, switchState: {}, exitLocked: {}, objective: null, ...s.world, player: { y: 0, hazardT: 0, fx: null, ...s.world.player }, enemies: (s.world.enemies || []).map((e) => ({ y: 0, group: null, ...e })), pickups: (s.world.pickups || []).map((p) => ({ y: 0, ...p })), doors: (s.world.doors || []).map((d) => ({ remote: false, closet: false, sealed: false, ...d })) } : s.world }),
  5: (s) => ({ ...s, version: 6, world: s.world ? { levelStart: { hp: 100, armor: 0, ammo: { flare: 8 }, weapons: ['flare'] }, enemyShots: [], ...s.world, enemies: (s.world.enemies || []).map((e) => ({ lastX: null, lastZ: null, lost: 0, steer: 0, ...e })) } : s.world }),
  4: (s) => ({ ...s, version: 5, world: s.world ? { messagesSeen: [], ...s.world } : s.world }),
  3: (s) => ({ ...s, version: 4, world: s.world ? { explored: [], ...s.world } : s.world }),
  2: (s) => {
    const out = { ...s, version: 3 };
    if (s.world) out.world = { ...s.world, player: { switchT: 0, ...s.world.player }, projectiles: (s.world.projectiles || []).map((q) => ({ weapon: 'flare', ...q })), enemies: (s.world.enemies || []).map((e) => ({ lungeT: -1, lungeCd: 0, lungeHit: false, ...e })) };
    return out;
  },
  1: (s) => {
    const out = { ...s, version: 2 };
    if (s.world?.player) out.world = { ...s.world, player: { ads: 0, sprint: 0, recover: 0, sprinting: false, ...s.world.player } };
    return out;
  },
};

export function makeSave(w, kind, { now = 0, progress = null } = {}) {
  const save = { magic: SAVE_MAGIC, version: SAVE_VERSION, savedAt: now, kind, campaign: { mapId: w.mapId, mapVersion: w.mapVersion, difficulty: w.difficulty, seed: w.seed },
    progress: sanitizeProgress(progress ?? { upgrades: w.upgrades }),            // the shell passes its progress (salvage, records); a bare world records only its upgrade tiers
    carry: kind === 'mid-level' && w.levelStart ? JSON.parse(JSON.stringify(w.levelStart)) : carryOver(w) };          // a mid-level save's carry is what the LEVEL began with: it is what a map-changed fallback or Retry must restore
  if (kind === 'mid-level') save.world = JSON.parse(JSON.stringify(w));
  return save;
}

/** text -> {ok:true, save, migratedFrom} | {ok:false, reason, detail} */
export function parseSave(text, migrations = MIGRATIONS, current = SAVE_VERSION) {
  let s; try { s = JSON.parse(text); } catch (e) { return { ok: false, reason: 'corrupt', detail: e.message }; }
  if (!s || s.magic !== SAVE_MAGIC) return { ok: false, reason: 'wrong-magic', detail: 'not a HUSHFALL save' };
  if (!Number.isInteger(s.version) || s.version < 1) return { ok: false, reason: 'bad-version', detail: String(s.version) };
  if (s.version > current) return { ok: false, reason: 'newer-version', detail: `save v${s.version}, game reads up to v${current}` };
  const from = s.version;
  while (s.version < current) {
    const m = migrations[s.version];
    if (!m) return { ok: false, reason: 'incompatible', detail: `no migration from v${s.version}; development save invalidated` };
    try { s = m(s); } catch (e) { return { ok: false, reason: 'migration-failed', detail: e.message }; }
    if (!s || s.version == null) return { ok: false, reason: 'migration-failed', detail: 'migration returned no version' };
  }
  if (!s.campaign?.mapId || !s.carry) return { ok: false, reason: 'corrupt', detail: 'missing campaign/carry' };
  return { ok: true, save: s, migratedFrom: from === current ? null : from };
}

const kindOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
/** structural problems of a saved world relative to a fresh world of the same map: missing or mistyped fields, non-finite numbers, unknown enemy kinds, wrong door/sector counts (audit A08) */
export function worldShapeErrors(fresh, snap) {
  const bad = [];
  if (!snap || typeof snap !== 'object') return ['world is not an object'];
  for (const [k, v] of Object.entries(fresh)) {
    if (!(k in snap)) { if (v !== undefined && v !== null) bad.push('missing field ' + k); continue; }
    const a = kindOf(v), b = kindOf(snap[k]); if (a !== b && a !== 'null') bad.push(`field ${k} is a ${b}, expected ${a}`);
    if (b === 'number' && !Number.isFinite(snap[k])) bad.push(`field ${k} is not finite`);
  }
  const P = snap.player; if (!P || typeof P !== 'object') bad.push('player missing'); else for (const [k, v] of Object.entries(fresh.player)) if (typeof v === 'number' && !Number.isFinite(P[k])) bad.push('player.' + k + ' is not finite');
  if (P && typeof P === 'object') for (const [k, v] of Object.entries(fresh.player)) { const a = kindOf(v); if (k in P && a !== 'null' && a !== kindOf(P[k])) bad.push(`player.${k} is a ${kindOf(P[k])}, expected ${a}`); }       // PT-050 H1: a list stored as a string, an object as a number
  if (Array.isArray(snap.enemies)) for (const e of snap.enemies) { if (!ENEMIES[e?.kind]) bad.push('unknown enemy kind ' + e?.kind); else if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.hp)) bad.push('enemy ' + e.id + ' has a non-finite position or hp'); }
  for (const k of ['doors', 'sectors']) if (Array.isArray(snap[k]) && Array.isArray(fresh[k]) && snap[k].length !== fresh[k].length) bad.push(`${k} count ${snap[k].length} differs from the map's ${fresh[k].length}`);
  return bad.slice(0, 8);
}

// ---- PT-050 H1 (the hostile testers' save findings, design/HARDENING.md): a save the loader ACCEPTS must be one the game can play. Before, a save with the right shape but wrong VALUES (an unknown weapon, a string for a list, ammunition of 1e9,
// a status nobody handles, a "complete" world with no end stats, an unknown difficulty) loaded fine and then threw in the frame loop, and Continue loaded it again at every start. The loader now refuses such a save with a reason and NEVER throws.
const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const num = (v) => typeof v === 'number' && Number.isFinite(v);
/** a number no honest game reaches: not a finite number, negative, or more than twice its cap (a generous bound: an edge case of normal play must never cost a player their save) */
const absurd = (v, cap) => !num(v) || v < 0 || v > cap * 2 + 10;
const SAVE_STATUS = ['playing', 'dead', 'complete'];
const HIDDEN_OR_DANGEROUS = new Set(['__proto__', 'constructor', 'prototype']);

/** what a level carries in (hit points, armour, ammunition, guns): only the fields that are present are checked, each against what the sim could have produced */
export function carryErrors(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return ['carry is not an object'];
  const bad = [], up = c.upgrades && typeof c.upgrades === 'object' ? c.upgrades : null;
  if (c.hp !== undefined && absurd(c.hp, PLAYER.maxHp)) bad.push('carry hp ' + String(c.hp));
  if (c.armor !== undefined && absurd(c.armor, armorCap(up))) bad.push('carry armor ' + String(c.armor));
  if (c.ammo !== undefined) { if (!c.ammo || typeof c.ammo !== 'object' || Array.isArray(c.ammo)) bad.push('carry ammo is not an object'); else for (const [k, v] of Object.entries(c.ammo)) if (!own(AMMO_MAX, k) || absurd(v, ammoCap(k, up))) bad.push('carry ammo ' + k + ' = ' + String(v)); }
  if (c.weapons !== undefined && (!Array.isArray(c.weapons) || !c.weapons.every((id) => own(WEAPONS, id)))) bad.push('carry weapons is not a list of known weapons');
  return bad.slice(0, 6);
}
/** a finished map's numbers: the rank and the salvage are computed from them, so a "complete" world without them cannot be played on (or paid for) */
export function endStatsErrors(es) {
  if (!es || typeof es !== 'object' || Array.isArray(es)) return ['endStats is not an object'];
  const bad = []; for (const k of ['time', 'kills', 'secrets']) if (!num(es[k]) || es[k] < 0) bad.push('endStats.' + k + ' = ' + String(es[k]));
  if (!es.total || typeof es.total !== 'object' || !num(es.total.enemies) || !num(es.total.secrets)) bad.push('endStats.total');
  return bad;
}
/** the VALUES of a saved world (worldShapeErrors sees only types and finiteness): status, guns, keys, caps, pickups, enemy states */
export function worldValueErrors(snap) {
  const bad = [], P = snap.player, up = snap.upgrades && typeof snap.upgrades === 'object' ? snap.upgrades : null;
  if (!SAVE_STATUS.includes(snap.status)) bad.push('unknown status ' + String(snap.status));
  else if (snap.status === 'complete') bad.push(...endStatsErrors(snap.endStats));
  if (P && typeof P === 'object') {
    if (!own(WEAPONS, P.weapon)) bad.push('unknown weapon ' + String(P.weapon));
    if (!Array.isArray(P.weapons) || !P.weapons.every((id) => own(WEAPONS, id))) bad.push('player.weapons is not a list of known weapons');
    if (!Array.isArray(P.keys) || !P.keys.every((k) => own(KEYS, k))) bad.push('player.keys is not a list of known keys');
    if (absurd(P.hp, PLAYER.maxHp)) bad.push('player.hp ' + String(P.hp)); if (absurd(P.armor, armorCap(up))) bad.push('player.armor ' + String(P.armor));
    if (!P.ammo || typeof P.ammo !== 'object' || Array.isArray(P.ammo)) bad.push('player.ammo is not an object'); else for (const [k, v] of Object.entries(P.ammo)) if (!own(AMMO_MAX, k) || absurd(v, ammoCap(k, up))) bad.push('player.ammo.' + k + ' = ' + String(v));
  }
  { const d = snap.drops; if (d != null && (typeof d !== 'object' || Array.isArray(d) || !num(d.dry) || d.rngState == null || !d.seen || typeof d.seen !== 'object' || !d.firedAt || typeof d.firedAt !== 'object')) bad.push('the ammunition-drop state is damaged'); }      // lazy state `{ rngState, dry, seen, firedAt }` (drops.js): the fuzz found it accepted as a string or an empty object
  if (Array.isArray(snap.pickups)) for (const it of snap.pickups) if (!it || typeof it !== 'object' || !own(PICKUPS, it.kind) || !num(it.x) || !num(it.z)) { bad.push('a pickup is not a known pickup with a position'); break; }
  if (Array.isArray(snap.enemies)) for (const e of snap.enemies) if (typeof e.state !== 'string') { bad.push('enemy ' + e.id + ' has no state'); break; }
  return bad.slice(0, 8);
}

/** Rebuild a world from a save. mapLoader(id) -> MapData. Mid-level saves need the same map version; otherwise fall back to level start.
 *  -> { ok: true, world, degraded? } | { ok: false, reason, detail }. It NEVER throws: any failure while rebuilding is a rejected save (PT-050 H1). */
export function loadWorld(save, mapLoader) {
  try { return loadWorldUnsafe(save, mapLoader); } catch (e) { return { ok: false, reason: 'corrupt', detail: 'load failed: ' + (e?.message ?? String(e)) }; }
}
function loadWorldUnsafe(save, mapLoader) {
  const c = save?.campaign; if (!c || typeof c !== 'object') return { ok: false, reason: 'corrupt', detail: 'no campaign' };
  if (!own(DIFFICULTY, c.difficulty)) return { ok: false, reason: 'corrupt', detail: 'unknown difficulty ' + String(c.difficulty) };
  if (!num(c.seed)) return { ok: false, reason: 'corrupt', detail: 'seed is not a number' };
  const carry = carryErrors(save.carry); if (carry.length) return { ok: false, reason: 'corrupt', detail: carry.join('; ') };
  const map = mapLoader(c.mapId);
  if (!map) return { ok: false, reason: 'unknown-map', detail: c.mapId };
  const opts = { seed: c.seed, difficulty: c.difficulty, carry: save.carry };
  if (save.kind === 'mid-level') {
    if (map.version !== c.mapVersion) return { ok: true, world: createWorld(map, opts), degraded: 'map-changed: resumed from level start' };
    const w = createWorld(map, opts), snap = JSON.parse(JSON.stringify(save.world));
    const shape = worldShapeErrors(w, snap); if (shape.length) return { ok: false, reason: 'corrupt', detail: shape.join('; ') };
    const vals = worldValueErrors(snap); if (vals.length) return { ok: false, reason: 'corrupt', detail: vals.join('; ') };
    const hidden = new Set(Object.getOwnPropertyNames(w).filter((k) => !Object.getOwnPropertyDescriptor(w, k).enumerable));      // the map and the event queue are not saved state: a save never overwrites them (Gemini-02, Grok G-02)
    for (const k of Object.keys(w)) delete w[k];
    for (const [k, v] of Object.entries(snap)) if (!hidden.has(k) && !HIDDEN_OR_DANGEROUS.has(k)) w[k] = v;
    return { ok: true, world: w };
  }
  return { ok: true, world: createWorld(map, opts) };
}

/** Slot storage over any localStorage-like object. */
export class SaveStore {
  constructor(storage, prefix = 'hushfall.save.') { this.s = storage; this.p = prefix; }
  write(slot, save) { this.s.setItem(this.p + slot, JSON.stringify(save)); }
  read(slot) { const t = this.s.getItem(this.p + slot); return t == null ? { ok: false, reason: 'empty', detail: slot } : parseSave(t); }
  clear(slot) { this.s.removeItem(this.p + slot); }
}
