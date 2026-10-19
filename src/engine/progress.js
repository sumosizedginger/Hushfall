// Campaign progression (owner decision, PT-008, 2026-10-05): a RANK per map (S/A/B/C from time, kills and secrets), SALVAGE earned from ranks and secrets, and persistent UPGRADES bought with it
// (a bigger ammunition satchel, better plate). Pure data in, data out: the simulation reads only the upgrade tiers (caps, below); the shell owns the salvage, the records and the buying.
// Every number here is a tunable first guess: nobody has played it. Change them here, not in the callers.
import { AMMO_MAX, PLAYER, FOLK, ENEMIES, PICKUPS, MODS, MOD_ORDER } from './defs.js';

export const RANK = {
  weights: { withSecrets: { kills: 0.4, time: 0.35, secrets: 0.25 }, noSecrets: { kills: 0.55, time: 0.45 } },
  time: [[0.5, 1.0], [1.0, 0.75], [1.5, 0.5], [2.0, 0.25]],        // [time / par at most, time score]; slower than twice par scores 0; a map with no par never costs time
  thresholds: [['S', 0.92], ['A', 0.78], ['B', 0.55]],              // anything below B is a C
  salvage: { S: 3, A: 2, B: 1, C: 0 },
  secretSalvage: 2,
};
export const RANK_ORDER = ['C', 'B', 'A', 'S'];

/** the two upgrade tracks: five tiers each, the cost of each tier in salvage */
export const TRACKS = {
  ammo: { name: 'Ammunition satchel', costs: [3, 5, 8, 12, 18], step: 0.15 },     // each tier: +15% of every ammunition cap
  armor: { name: 'Plate carrier', costs: [3, 5, 8, 12, 18], step: 20 },           // each tier: +20 points of armour capacity
};

/** what the player may carry of one ammunition type with `up` = {ammo, armor} tiers */
export const ammoCap = (type, up) => Math.round(AMMO_MAX[type] * (1 + TRACKS.ammo.step * clampTier('ammo', up?.ammo)));
export const armorCap = (up) => PLAYER.maxArmor + TRACKS.armor.step * clampTier('armor', up?.armor);
function clampTier(track, v) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(TRACKS[track].costs.length, n)) : 0; }
/** PT-057: the second tiers of mods bought at the Locker ({ id: true }): known mods only; null when there are none, so a progress that never bought one is exactly what it was */
function sanitizeMods2(m) { const o = {}; if (m && typeof m === 'object' && !Array.isArray(m)) for (const id of MOD_ORDER) if (Object.hasOwn(m, id) && m[id] === true) o[id] = true; return Object.keys(o).length ? o : null; }
export const sanitizeUpgrades = (up) => { const o = { ammo: clampTier('ammo', up?.ammo), armor: clampTier('armor', up?.armor) }, m = sanitizeMods2(up?.mods2); if (m) o.mods2 = m; return o; };

/** the rank of a finished level. `end` = the world's endStats ({time, kills, secrets, total: {enemies, secrets}}), `par` = seconds or undefined */
export function rankFor(end, par) {
  const total = end.total ?? {};
  const kills = total.enemies ? Math.min(1, end.kills / total.enemies) : 1;
  let time = 1; if (par) { time = 0; for (const [limit, score] of RANK.time) if (end.time / par <= limit) { time = score; break; } }
  const hasSecrets = (total.secrets ?? 0) > 0, secrets = hasSecrets ? Math.min(1, end.secrets / total.secrets) : null;
  const w = hasSecrets ? RANK.weights.withSecrets : RANK.weights.noSecrets;
  const cost = Math.min(FOLK.innocentMax, (end.innocents ?? 0) * FOLK.innocentCost);                          // PT-037: a Vael who never raised a hand and is dead costs the rank, and only a map that has such Vael ever carries the count
  const score = Math.max(0, Math.round((w.kills * kills + w.time * time + (hasSecrets ? w.secrets * secrets : 0) - cost) * 1000) / 1000);
  const rank = (RANK.thresholds.find(([, min]) => score >= min) ?? ['C'])[0];
  return { rank, score, parts: { kills, time, secrets } };
}
export const salvageFor = (rank, secretsFound) => (RANK.salvage[rank] ?? 0) + RANK.secretSalvage * Math.max(0, secretsFound | 0);

export const newProgress = () => ({ salvage: 0, upgrades: { ammo: 0, armor: 0 }, records: {} });
/** a progress object read from a save or a dev field: anything malformed becomes safe zeros (a damaged save must not take the shell down) */
export function sanitizeProgress(p) {
  const out = newProgress(); if (!p || typeof p !== 'object') return out;
  out.salvage = Number.isFinite(p.salvage) ? Math.min(1e9, Math.max(0, Math.floor(p.salvage))) : 0;      // PT-050 H1: a safe integer, never 1e308 (Grok G-05)
  out.upgrades = sanitizeUpgrades(p.upgrades);
  if (p.records && typeof p.records === 'object') for (const [id, r] of Object.entries(p.records)) if (r && RANK_ORDER.includes(r.rank)) out.records[id] = { rank: r.rank, score: Number(r.score) || 0, time: Number(r.time) || 0, kills: Number(r.kills) || 0, secrets: Number(r.secrets) || 0, paid: Math.max(0, Math.floor(r.paid) || 0) };
  if (p.record && typeof p.record === 'object') {                                         // PT-037, THE RECORD: the ids of the messages a player has received, per map (the text is read from the map, so a corrected line corrects the Record). Lazy: absent until the first message.
    const rec = {};
    for (const [id, list] of Object.entries(p.record)) if (Array.isArray(list)) { const ids = [...new Set(list.filter((x) => typeof x === 'string' && x.length > 0 && x.length <= 48))].slice(0, 400); if (ids.length) rec[String(id).slice(0, 16)] = ids; }
    if (Object.keys(rec).length) out.record = rec;
  }
  if (p.choices && typeof p.choices === 'object') {                                      // PT-039 (Act B): the choices a player has made (a wing taken at C2M11): id -> value, short lower-case tokens. Lazy: absent until the first choice.
    const ch = {};
    for (const [id, v] of Object.entries(p.choices)) if (/^[a-z0-9-]{1,24}$/.test(id) && typeof v === 'string' && /^[a-z0-9-]{1,24}$/.test(v)) ch[id] = v;
    if (Object.keys(ch).length) out.choices = ch;
  }
  if (p.recordAt && typeof p.recordAt === 'object') {                                    // PT-054 (the Log): when and where each message was received, [seconds, cell x, cell z], per map. Lazy: absent until the first message.
    const ra = {}; for (const [mid, byId] of Object.entries(p.recordAt)) if (byId && typeof byId === 'object' && !Array.isArray(byId)) {
      const m = {}; let n = 0; for (const [id, v] of Object.entries(byId)) { if (n >= 400) break; if (id.length > 0 && id.length <= 48 && Array.isArray(v) && v.length === 3 && v.every((x) => Number.isFinite(x))) { m[id] = [Math.min(1e6, Math.max(0, Math.round(v[0]))), Math.min(2000, Math.max(0, Math.round(v[1]))), Math.min(2000, Math.max(0, Math.round(v[2])))]; n++; } }
      if (n) ra[String(mid).slice(0, 16)] = m;
    }
    if (Object.keys(ra).length) out.recordAt = ra;
  }
  if (p.found && typeof p.found === 'object') {                                          // PT-054 (the Items page): the pickups of the attempt being played, [kind, seconds, cell x, cell z], per map, at most 300 each. Lazy: absent until the first pickup.
    const fo = {}; for (const [mid, list] of Object.entries(p.found)) if (Array.isArray(list)) {
      const l = list.filter((v) => Array.isArray(v) && v.length === 4 && typeof v[0] === 'string' && Object.hasOwn(PICKUPS, v[0]) && v.slice(1).every((x) => Number.isFinite(x))).slice(-300).map((v) => [v[0], Math.min(1e6, Math.max(0, Math.round(v[1]))), Math.min(2000, Math.max(0, Math.round(v[2]))), Math.min(2000, Math.max(0, Math.round(v[3])))]);
      if (l.length) fo[String(mid).slice(0, 16)] = l;
    }
    if (Object.keys(fo).length) out.found = fo;
  }
  if (Array.isArray(p.bestiary)) {                                                       // PT-052 U3b (the Bestiary): the kinds of creature the player has met, in the order of ENEMIES. Lazy: absent until the first meeting.
    const met = new Set(p.bestiary.filter((k) => typeof k === 'string')), b = Object.keys(ENEMIES).filter((k) => met.has(k));
    if (b.length) out.bestiary = b;
  }
  return out;
}

/** record a finished map. Only the IMPROVEMENT over what this map has already paid is awarded, so replaying a level cannot farm salvage. -> { progress, gain, record } */
export function earn(progress, mapId, end, par) {
  if (!end || typeof end !== 'object' || ![end.time, end.kills, end.secrets].every((v) => Number.isFinite(v) && v >= 0) || !end.total || typeof end.total !== 'object')      // PT-050 H1: a finish without real numbers pays nothing and records nothing (Grok G-01, G-04)
    return { progress, gain: 0, record: progress.records?.[mapId] ?? null, result: { rank: 'C', score: 0, parts: { kills: 0, time: 0, secrets: null } } };
  const res = rankFor(end, par), value = salvageFor(res.rank, end.secrets), prev = progress.records[mapId];
  const paid = Math.max(prev?.paid ?? 0, value), gain = paid - (prev?.paid ?? 0);
  const record = { rank: prev && RANK_ORDER.indexOf(prev.rank) > RANK_ORDER.indexOf(res.rank) ? prev.rank : res.rank, score: Math.max(prev?.score ?? 0, res.score), time: prev ? Math.min(prev.time, end.time) : end.time,
    kills: Math.max(prev?.kills ?? 0, end.kills), secrets: Math.max(prev?.secrets ?? 0, end.secrets), paid };
  return { progress: { ...progress, salvage: progress.salvage + gain, records: { ...progress.records, [mapId]: record } }, gain, record, result: res };
}

/** buy the next tier of a track. -> { ok, progress, cost, reason } (reason: 'maxed' | 'salvage' | 'unknown') */
export function buy(progress, track) {
  const t = Object.hasOwn(TRACKS, track) ? TRACKS[track] : null; if (!t) return { ok: false, progress, cost: 0, reason: 'unknown' };       // (PT-050 H-S6: `toString` and `__proto__` are not upgrade tracks)
  const tier = clampTier(track, progress.upgrades?.[track]);
  if (tier >= t.costs.length) return { ok: false, progress, cost: 0, reason: 'maxed' };
  const cost = t.costs[tier]; if (progress.salvage < cost) return { ok: false, progress, cost, reason: 'salvage' };
  return { ok: true, cost, progress: { ...progress, salvage: progress.salvage - cost, upgrades: { ...sanitizeUpgrades(progress.upgrades), [track]: tier + 1 } } };
}

/** PT-057: buy tier two of a mod the player has FOUND (`owned` = the mod ids the world says they carry). -> { ok, progress, cost, reason } (reason: 'unknown' | 'notfound' | 'bought' | 'salvage') */
export function buyMod(progress, id, owned) {
  if (!Object.hasOwn(MODS, id)) return { ok: false, progress, cost: 0, reason: 'unknown' };
  if (!owned?.includes(id)) return { ok: false, progress, cost: 0, reason: 'notfound' };
  const up = sanitizeUpgrades(progress.upgrades); if (up.mods2?.[id]) return { ok: false, progress, cost: 0, reason: 'bought' };
  const cost = MODS[id].tier2.cost; if (progress.salvage < cost) return { ok: false, progress, cost, reason: 'salvage' };
  return { ok: true, cost, progress: { ...progress, salvage: progress.salvage - cost, upgrades: { ...up, mods2: { ...(up.mods2 ?? {}), [id]: true } } } };
}
/** PT-057: the Locker's rows for the mods a player owns: [{ id, name, tier, cost, text }] (cost null once bought) */
export const modRows = (progress, owned) => MOD_ORDER.filter((id) => owned?.includes(id)).map((id) => { const M = MODS[id], two = !!sanitizeUpgrades(progress.upgrades).mods2?.[id]; return { id, name: M.name, tier: two ? 2 : 1, cost: two ? null : M.tier2.cost, text: two ? M.tier2.line + ' (bought)' : M.tier2.line }; });

/** one line for the Locker: what the next tier of a track gives and costs ('maxed' when there is none) */
export function describeNext(progress, track) {
  if (!Object.hasOwn(TRACKS, track)) return { name: 'Unknown', tier: 0, text: '', cost: null };         // PT-050 H-S6
  const t = TRACKS[track], tier = clampTier(track, progress.upgrades?.[track]);
  if (tier >= t.costs.length) return { name: t.name, tier, text: 'fully upgraded', cost: null };
  const next = { ...progress.upgrades, [track]: tier + 1 };
  const text = track === 'ammo' ? `+${Math.round(t.step * 100)}% carried: flares ${ammoCap('flare', next)}, shells ${ammoCap('shell', next)}, rivets ${ammoCap('rivet', next)}, bolts ${ammoCap('bolt', next)}, cells ${ammoCap('cell', next)}, rounds ${ammoCap('round', next)}, rockets ${ammoCap('rocket', next)}` : `armour holds up to ${armorCap(next)}`;
  return { name: t.name, tier, text, cost: t.costs[tier] };
}
