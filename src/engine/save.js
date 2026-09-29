// Versioned save data. Policy: a save is either migrated to the current version or rejected with an explicit reason.
// Nothing is ever silently coerced. Unknown/newer versions and corrupt files are reported, not loaded.
import { createWorld, carryOver } from './world.js';

export const SAVE_MAGIC = 'HUSHFALL_SAVE';
export const SAVE_VERSION = 5;
/** version N -> function producing version N+1. */
export const MIGRATIONS = {
  // v1 -> v2 (2026-09-29): player gained sprint/aim state (ads, sprint, recover, sprinting). Old mid-level worlds start from rest.
  // v2 -> v3 (2026-09-29): weapon switching + Gaunt lunge. Player gains switchT, projectiles record their weapon, enemies gain lunge state.
  // v3 -> v4 (2026-09-29): automap exploration state. Old worlds start with nothing explored (the sim re-creates the array).
  // v4 -> v5 (2026-09-29): in-world messages remember which have been shown.
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
  const save = { magic: SAVE_MAGIC, version: SAVE_VERSION, savedAt: now, kind, campaign: { mapId: w.mapId, mapVersion: w.mapVersion, difficulty: w.difficulty, seed: w.seed }, carry: carryOver(w) };
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

/** Rebuild a world from a save. mapLoader(id) -> MapData. Mid-level saves need the same map version; otherwise fall back to level start. */
export function loadWorld(save, mapLoader) {
  const map = mapLoader(save.campaign.mapId);
  if (!map) return { ok: false, reason: 'unknown-map', detail: save.campaign.mapId };
  const opts = { seed: save.campaign.seed, difficulty: save.campaign.difficulty, carry: save.carry };
  if (save.kind === 'mid-level') {
    if (map.version !== save.campaign.mapVersion) return { ok: true, world: createWorld(map, opts), degraded: 'map-changed: resumed from level start' };
    const w = createWorld(map, opts), snap = JSON.parse(JSON.stringify(save.world));
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
