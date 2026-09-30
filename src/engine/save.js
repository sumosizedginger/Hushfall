// Versioned save data. Policy: a save is either migrated to the current version or rejected with an explicit reason.
// Nothing is ever silently coerced. Unknown/newer versions and corrupt files are reported, not loaded.
import { createWorld, carryOver } from './world.js';
import { ENEMIES } from './defs.js';

export const SAVE_MAGIC = 'HUSHFALL_SAVE';
export const SAVE_VERSION = 8;
/** version N -> function producing version N+1. */
export const MIGRATIONS = {
  // v1 -> v2 (2026-09-29): player gained sprint/aim state (ads, sprint, recover, sprinting). Old mid-level worlds start from rest.
  // v2 -> v3 (2026-09-29): weapon switching + Gaunt lunge. Player gains switchT, projectiles record their weapon, enemies gain lunge state.
  // v3 -> v4 (2026-09-29): automap exploration state. Old worlds start with nothing explored (the sim re-creates the array).
  // v4 -> v5 (2026-09-29): in-world messages remember which have been shown.
  // v5 -> v6 (2026-09-29): levelStart (Retry restores the level-start inventory, not the mid-level one), enemy shots, hunt state. Old worlds get a fresh level start.
  // v6 -> v7 (2026-09-30, Gate 2 kit): terrain height for actors/pickups, moving floors, triggers/switches/exit locks, objective, remote doors, hazard state.
  // v7 -> v8 (2026-09-30): tone pulses (the boss), enemy stagger/charge/channel state (read lazily, so old worlds simply have none).
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

export function makeSave(w, kind, { now = 0 } = {}) {
  const save = { magic: SAVE_MAGIC, version: SAVE_VERSION, savedAt: now, kind, campaign: { mapId: w.mapId, mapVersion: w.mapVersion, difficulty: w.difficulty, seed: w.seed },
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
  if (Array.isArray(snap.enemies)) for (const e of snap.enemies) { if (!ENEMIES[e?.kind]) bad.push('unknown enemy kind ' + e?.kind); else if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.hp)) bad.push('enemy ' + e.id + ' has a non-finite position or hp'); }
  for (const k of ['doors', 'sectors']) if (Array.isArray(snap[k]) && Array.isArray(fresh[k]) && snap[k].length !== fresh[k].length) bad.push(`${k} count ${snap[k].length} differs from the map's ${fresh[k].length}`);
  return bad.slice(0, 8);
}

/** Rebuild a world from a save. mapLoader(id) -> MapData. Mid-level saves need the same map version; otherwise fall back to level start. */
export function loadWorld(save, mapLoader) {
  const map = mapLoader(save.campaign.mapId);
  if (!map) return { ok: false, reason: 'unknown-map', detail: save.campaign.mapId };
  const opts = { seed: save.campaign.seed, difficulty: save.campaign.difficulty, carry: save.carry };
  if (save.kind === 'mid-level') {
    if (map.version !== save.campaign.mapVersion) return { ok: true, world: createWorld(map, opts), degraded: 'map-changed: resumed from level start' };
    const w = createWorld(map, opts), snap = JSON.parse(JSON.stringify(save.world));
    const shape = worldShapeErrors(w, snap); if (shape.length) return { ok: false, reason: 'corrupt', detail: shape.join('; ') };
    for (const k of Object.keys(w)) delete w[k];
    Object.assign(w, snap);
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
