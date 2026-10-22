// PT-049 U2 (the owner: "the writing is on the screen while the game continues to move at full speed, so you can't really read" ... "we need a menu or something like in an RPG"), DECIDED 2026-10-15: the simulation clock is NEVER slowed for text.
// A message is shown as before (comms.js), and ALSO written to the Journal's log; the HUD says how many have not been read; Tab opens the Journal and pauses, so the player reads when they want to. This module is the Log's model, PURE (no DOM, no sim).
// PT-054 (the owner, 2026-10-19: "no way to tell when or where it was said, the sayings should be based on the level you are currently on, and be sorted by the level you are currently on"): the Log is SORTED BY LEVEL: the level being played first (what was said
// on THIS attempt, newest first, each with the time into the level it arrived at, a plain place, and a number that is also a pin on the Map page), then every earlier level the Record holds, the most recent level first.
import { isDocument, recordView } from './record.js';

/** seconds into the level as the clock shows them: 4:07 */
export const clock = (t) => { const s = Math.max(0, Math.round(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
/** the cell the player starts a map on */
export const levelStart = (map) => map?.entities?.find((e) => e.type === 'player')?.at ?? [0, 0];
/** a place in words, from the start of the map: "near the start", or "40 m north-east of the start" (north is up on the map) */
export function placeOf(map, cx, cz) {
  if (!map || ![cx, cz].every(Number.isFinite)) return '';
  const [sx, sz] = levelStart(map), cell = map.cell ?? 2, dx = (cx - sx) * cell, dz = (cz - sz) * cell, d = Math.hypot(dx, dz);
  if (d < 14) return 'near the start';
  return `${Math.round(d / 5) * 5} m ${COMPASS[Math.round(((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360 / 45) % 8]} of the start`;
}

/** `maps` = { id: map with .messages }, `progress.record` = { mapId: [messageId ...] in the order they were received }, `progress.recordAt` = when and where, `unread` = a Set of message ids received since the last time the Journal opened,
 *  `seen` = the ids this ATTEMPT of the map has received, in order (the world's `messagesSeen`: when it is given, the level being played shows exactly these), `manifest` = the campaign, for the order of the earlier levels.
 *  -> { entries (this level, newest first, each numbered in the order received), pins [{ n, cx, cz }], levels [{ mapId, name, entries }] (earlier levels, the most recent first), newCount, earlier } */
export function journalLog({ maps, progress, mapId, unread = new Set(), seen = null, manifest = null }) {
  const map = maps?.[mapId], ids = Array.isArray(seen) ? seen : progress?.record?.[mapId] ?? [], byId = new Map((map?.messages ?? []).map((m) => [m.id, m]));
  const stamp = (m, id, at) => { const a = at?.[id]; return a ? { when: clock(a[0]), where: placeOf(m, a[1], a[2]), cell: [a[1], a[2]] } : { when: null, where: null, cell: null }; };
  const chron = []; for (const id of ids) { const m = byId.get(id); if (m) chron.push({ id, n: chron.length + 1, speaker: m.speaker || '', text: m.text, document: isDocument(m.speaker), isNew: unread.has(id), ...stamp(map, id, progress?.recordAt?.[mapId]) }); }
  const entries = chron.slice().reverse(), pins = chron.filter((e) => e.cell).map((e) => ({ n: e.n, cx: e.cell[0], cz: e.cell[1] }));
  const levels = manifest ? recordView(manifest, maps, progress).filter((g) => g.mapId !== mapId).reverse().map((g) => ({ mapId: g.mapId, name: g.name, entries: g.entries.map((e) => ({ ...e, ...stamp(maps?.[g.mapId], e.id, progress?.recordAt?.[g.mapId]) })) })) : [];
  let earlier = 0; for (const [k, v] of Object.entries(progress?.record ?? {})) if (k !== mapId && Array.isArray(v)) earlier += v.length;
  return { entries, pins, levels, newCount: entries.filter((e) => e.isNew).length, earlier };
}
/** the tab the Journal opens on: the Log when something has not been read, otherwise the Map */
export const openTab = (newCount) => (newCount > 0 ? 'log' : 'map');

// ---- PT-052 U3 (Session C): the other pages of the Journal. All PURE (data in, data out; no DOM, no sim): the shell passes what the world and the progress hold at the moment the Journal opens. ----
import { WEAPONS, SLOT_KEYS, KEYS, PICKUPS } from '../engine/defs.js';
import { ammoCap, armorCap, TRACKS, sanitizeUpgrades } from '../engine/progress.js';
import { WEAPON_CARDS, PICKUP_NAMES, pickupTier } from './toasts.js';
import { WEAPON_USE, pickupUse } from './itemhelp.js';

const STARTER_LINES = { flare: 'The starting gun: splash and burning ground.' };            // the guns found on a map have their line in WEAPON_CARDS (toasts.js); the one you start with has none there
export const JOURNAL_TABS = Object.freeze(['map', 'objectives', 'log', 'items', 'bestiary']);
/** the shoulder buttons turn the Journal's pages as the arrow keys do: the buttons bound to previous and next weapon (Pad4 and Pad5, the bumpers, by default) step -1 and +1; 0 when neither was pressed (round 1, Gemini 2: the tabs were reachable by D-pad focus but had no shortcut) */
export function journalPadStep(pressed = [], bindings = {}) {
  const has = (codes, dflt) => (codes?.length ? codes : dflt).some((c) => pressed.includes(c));
  return has(bindings.weaponPrev, ['Pad4']) ? -1 : has(bindings.weaponNext, ['Pad5']) ? 1 : 0;
}
export const tabAfter = (tab, step = 1) => JOURNAL_TABS[(Math.max(0, JOURNAL_TABS.indexOf(tab)) + step + JOURNAL_TABS.length) % JOURNAL_TABS.length];

/** the Objectives page: the goal the map names NOW, and the goals it named earlier on this map, newest first, each once. `history` = the objective texts in the order they arrived. Never the steps: the objective line says what the goal is, not how. */
export function objectivesPage({ current = null, history = [] } = {}) {
  const done = []; for (const t of [...history].reverse()) if (typeof t === 'string' && t && t !== current && !done.includes(t)) done.push(t);
  return { current: current || null, done };
}

/** the key that selects a weapon: the guns by their slot (the mortar is 0), every melee weapon on 6 */
export const weaponKey = (id) => { const i = SLOT_KEYS.indexOf(WEAPONS[id]?.kind === 'melee' ? 'melee' : id); return i < 0 ? '' : String((i + 1) % 10); };

/** the Items page (PT-054: it now says what you picked up and how to use it): `weapons` carried (the key, the ammunition against its cap, what it is for, how to get the most from it, and where it came from), `keys` by colour, `armor` against its cap, `lamp` (the oil, on a map with a lantern),
 *  the Locker's tiers, and `ledger`: everything picked up on THIS attempt of the map, one row per kind (how many, when and where the first and the last), the guns and keys first, then armour, oil and satchels, then ammunition and dressings.
 *  `found` = progress.found[mapId] (the pickups of this attempt: [kind, seconds, cell x, cell z]), `map` = the map being played (for the words of a place). */
export function itemsPage({ player = {}, upgrades = null, found = [], map = null } = {}) {
  const up = sanitizeUpgrades(upgrades), p = player, order = (id) => { const i = SLOT_KEYS.indexOf(WEAPONS[id]?.kind === 'melee' ? 'melee' : id); return i < 0 ? 99 : i; };
  const at = (v) => ({ when: clock(v[1]), where: placeOf(map, v[2], v[3]) }), list = Array.isArray(found) ? found.filter((v) => Array.isArray(v) && typeof v[0] === 'string') : [];
  const weapons = [...new Set(p.weapons ?? [])].filter((id) => WEAPONS[id]).sort((a, b) => order(a) - order(b) || String(a).localeCompare(String(b))).map((id) => {
    const d = WEAPONS[id], t = d.ammo ?? null, got = list.find((v) => PICKUPS[v[0]]?.weapon === id), h = WEAPON_USE[id];
    return { id, name: d.name, key: weaponKey(id), melee: d.kind === 'melee', ammo: t ? { type: t, have: Math.floor(p.ammo?.[t] ?? 0), cap: ammoCap(t, up) } : null, line: WEAPON_CARDS['weapon_' + id]?.[1] ?? STARTER_LINES[id] ?? '',
      role: h?.role ?? '', use: h?.use ?? '', from: got ? { ...at(got) } : null };                         // from: null = you began with it
  });
  const keys = [...new Set(p.keys ?? [])].map((id) => ({ id, name: KEYS[id]?.name ?? String(id), color: KEYS[id]?.color ?? '#c9a44c', use: pickupUse('key_' + id) ?? '' }));
  const rank = { major: 0, medium: 1, minor: 2 }, groups = new Map();
  for (const v of list) { const g = groups.get(v[0]); if (g) { g.count++; g.last = at(v); } else groups.set(v[0], { kind: v[0], name: WEAPON_CARDS[v[0]]?.[0] ?? PICKUP_NAMES[v[0]] ?? v[0], count: 1, first: at(v), last: at(v), tier: pickupTier(v[0]) ?? 'minor', use: pickupUse(v[0]) ?? '' }); }
  const ledger = [...groups.values()].sort((a, b) => rank[a.tier] - rank[b.tier]);
  const L = p.lamp, lamp = L ? { oil: Math.floor(L.oil ?? 0), max: L.max ?? 0, use: pickupUse('oil') ?? '' } : null;
  return { weapons, keys, ledger, lamp, armor: { value: Math.floor(p.armor ?? 0), cap: armorCap(up) }, upgrades: Object.keys(TRACKS).map((track) => ({ track, name: TRACKS[track].name, tier: up[track], max: TRACKS[track].costs.length })) };
}
