// Campaign progression (owner decision, PT-008, 2026-10-05): a RANK per map (S/A/B/C from time, kills and secrets), SALVAGE earned from ranks and secrets, and persistent UPGRADES bought with it
// (a bigger ammunition satchel, better plate). Pure data in, data out: the simulation reads only the upgrade tiers (caps, below); the shell owns the salvage, the records and the buying.
// Every number here is a tunable first guess: nobody has played it. Change them here, not in the callers.
import { AMMO_MAX, PLAYER } from './defs.js';

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
export const sanitizeUpgrades = (up) => ({ ammo: clampTier('ammo', up?.ammo), armor: clampTier('armor', up?.armor) });

/** the rank of a finished level. `end` = the world's endStats ({time, kills, secrets, total: {enemies, secrets}}), `par` = seconds or undefined */
export function rankFor(end, par) {
  const total = end.total ?? {};
  const kills = total.enemies ? Math.min(1, end.kills / total.enemies) : 1;
  let time = 1; if (par) { time = 0; for (const [limit, score] of RANK.time) if (end.time / par <= limit) { time = score; break; } }
  const hasSecrets = (total.secrets ?? 0) > 0, secrets = hasSecrets ? Math.min(1, end.secrets / total.secrets) : null;
  const w = hasSecrets ? RANK.weights.withSecrets : RANK.weights.noSecrets;
  const score = Math.round((w.kills * kills + w.time * time + (hasSecrets ? w.secrets * secrets : 0)) * 1000) / 1000;
  const rank = (RANK.thresholds.find(([, min]) => score >= min) ?? ['C'])[0];
  return { rank, score, parts: { kills, time, secrets } };
}
export const salvageFor = (rank, secretsFound) => (RANK.salvage[rank] ?? 0) + RANK.secretSalvage * Math.max(0, secretsFound | 0);

export const newProgress = () => ({ salvage: 0, upgrades: { ammo: 0, armor: 0 }, records: {} });
/** a progress object read from a save or a dev field: anything malformed becomes safe zeros (a damaged save must not take the shell down) */
export function sanitizeProgress(p) {
  const out = newProgress(); if (!p || typeof p !== 'object') return out;
  out.salvage = Number.isFinite(p.salvage) ? Math.max(0, Math.floor(p.salvage)) : 0;
  out.upgrades = sanitizeUpgrades(p.upgrades);
  if (p.records && typeof p.records === 'object') for (const [id, r] of Object.entries(p.records)) if (r && RANK_ORDER.includes(r.rank)) out.records[id] = { rank: r.rank, score: Number(r.score) || 0, time: Number(r.time) || 0, kills: Number(r.kills) || 0, secrets: Number(r.secrets) || 0, paid: Math.max(0, Math.floor(r.paid) || 0) };
  return out;
}

/** record a finished map. Only the IMPROVEMENT over what this map has already paid is awarded, so replaying a level cannot farm salvage. -> { progress, gain, record } */
export function earn(progress, mapId, end, par) {
  const res = rankFor(end, par), value = salvageFor(res.rank, end.secrets), prev = progress.records[mapId];
  const paid = Math.max(prev?.paid ?? 0, value), gain = paid - (prev?.paid ?? 0);
  const record = { rank: prev && RANK_ORDER.indexOf(prev.rank) > RANK_ORDER.indexOf(res.rank) ? prev.rank : res.rank, score: Math.max(prev?.score ?? 0, res.score), time: prev ? Math.min(prev.time, end.time) : end.time,
    kills: Math.max(prev?.kills ?? 0, end.kills), secrets: Math.max(prev?.secrets ?? 0, end.secrets), paid };
  return { progress: { ...progress, salvage: progress.salvage + gain, records: { ...progress.records, [mapId]: record } }, gain, record, result: res };
}

/** buy the next tier of a track. -> { ok, progress, cost, reason } (reason: 'maxed' | 'salvage' | 'unknown') */
export function buy(progress, track) {
  const t = TRACKS[track]; if (!t) return { ok: false, progress, cost: 0, reason: 'unknown' };
  const tier = clampTier(track, progress.upgrades?.[track]);
  if (tier >= t.costs.length) return { ok: false, progress, cost: 0, reason: 'maxed' };
  const cost = t.costs[tier]; if (progress.salvage < cost) return { ok: false, progress, cost, reason: 'salvage' };
  return { ok: true, cost, progress: { ...progress, salvage: progress.salvage - cost, upgrades: { ...sanitizeUpgrades(progress.upgrades), [track]: tier + 1 } } };
}

/** one line for the Locker: what the next tier of a track gives and costs ('maxed' when there is none) */
export function describeNext(progress, track) {
  const t = TRACKS[track], tier = clampTier(track, progress.upgrades?.[track]);
  if (tier >= t.costs.length) return { name: t.name, tier, text: 'fully upgraded', cost: null };
  const next = { ...progress.upgrades, [track]: tier + 1 };
  const text = track === 'ammo' ? `+${Math.round(t.step * 100)}% carried: flares ${ammoCap('flare', next)}, shells ${ammoCap('shell', next)}, rivets ${ammoCap('rivet', next)}, bolts ${ammoCap('bolt', next)}` : `armour holds up to ${armorCap(next)}`;
  return { name: t.name, tier, text, cost: t.costs[tier] };
}
