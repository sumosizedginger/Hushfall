// PT-049 U2 (the owner: "the writing is on the screen while the game continues to move at full speed, so you can't really read" ... "we need a menu or something like in an RPG"), DECIDED 2026-10-15: the simulation clock is NEVER slowed for text.
// A message is shown as before (comms.js), and ALSO written to the Journal's log; the HUD says how many have not been read; Tab opens the Journal and pauses, so the player reads when they want to. This module is the Log's model, PURE (no DOM, no sim):
// the messages received on the map being played, NEWEST FIRST, the ones that arrived since the Journal was last opened marked new, and how many belong to earlier maps (the Record holds them).
import { isDocument } from './record.js';

/** `maps` = { id: map with .messages }, `progress.record` = { mapId: [messageId ...] in the order they were received }, `unread` = a Set of message ids received since the last time the Journal opened */
export function journalLog({ maps, progress, mapId, unread = new Set() }) {
  const ids = progress?.record?.[mapId] ?? [], byId = new Map((maps?.[mapId]?.messages ?? []).map((m) => [m.id, m])), entries = [];
  for (const id of [...ids].reverse()) { const m = byId.get(id); if (m) entries.push({ id, speaker: m.speaker || '', text: m.text, document: isDocument(m.speaker), isNew: unread.has(id) }); }
  let earlier = 0; for (const [k, v] of Object.entries(progress?.record ?? {})) if (k !== mapId && Array.isArray(v)) earlier += v.length;
  return { entries, newCount: entries.filter((e) => e.isNew).length, earlier };
}
/** the tab the Journal opens on: the Log when something has not been read, otherwise the Map */
export const openTab = (newCount) => (newCount > 0 ? 'log' : 'map');

// ---- PT-052 U3 (Session C): the other pages of the Journal. All PURE (data in, data out; no DOM, no sim): the shell passes what the world and the progress hold at the moment the Journal opens. ----
import { WEAPONS, SLOT_KEYS, KEYS } from '../engine/defs.js';
import { ammoCap, armorCap, TRACKS, sanitizeUpgrades } from '../engine/progress.js';
import { WEAPON_CARDS } from './toasts.js';

const STARTER_LINES = { flare: 'The starting gun: splash and burning ground.' };            // the guns found on a map have their line in WEAPON_CARDS (toasts.js); the one you start with has none there
export const JOURNAL_TABS = Object.freeze(['map', 'objectives', 'log', 'items', 'bestiary']);
export const tabAfter = (tab, step = 1) => JOURNAL_TABS[(Math.max(0, JOURNAL_TABS.indexOf(tab)) + step + JOURNAL_TABS.length) % JOURNAL_TABS.length];

/** the Objectives page: the goal the map names NOW, and the goals it named earlier on this map, newest first, each once. `history` = the objective texts in the order they arrived. Never the steps: the objective line says what the goal is, not how. */
export function objectivesPage({ current = null, history = [] } = {}) {
  const done = []; for (const t of [...history].reverse()) if (typeof t === 'string' && t && t !== current && !done.includes(t)) done.push(t);
  return { current: current || null, done };
}

/** the key that selects a weapon: the guns by their slot (the mortar is 0), every melee weapon on 6 */
export const weaponKey = (id) => { const i = SLOT_KEYS.indexOf(WEAPONS[id]?.kind === 'melee' ? 'melee' : id); return i < 0 ? '' : String((i + 1) % 10); };

/** the Items page: the weapons carried (with the key, the ammunition against its cap and the one line of what it is for), the keys by colour, the armour against its cap, and the Locker's tiers */
export function itemsPage({ player = {}, upgrades = null } = {}) {
  const up = sanitizeUpgrades(upgrades), p = player, order = (id) => { const i = SLOT_KEYS.indexOf(WEAPONS[id]?.kind === 'melee' ? 'melee' : id); return i < 0 ? 99 : i; };
  const weapons = [...new Set(p.weapons ?? [])].filter((id) => WEAPONS[id]).sort((a, b) => order(a) - order(b) || String(a).localeCompare(String(b))).map((id) => {
    const d = WEAPONS[id], t = d.ammo ?? null;
    return { id, name: d.name, key: weaponKey(id), melee: d.kind === 'melee', ammo: t ? { type: t, have: Math.floor(p.ammo?.[t] ?? 0), cap: ammoCap(t, up) } : null, line: WEAPON_CARDS['weapon_' + id]?.[1] ?? STARTER_LINES[id] ?? '' };
  });
  const keys = [...new Set(p.keys ?? [])].map((id) => ({ id, name: KEYS[id]?.name ?? String(id), color: KEYS[id]?.color ?? '#c9a44c' }));
  return { weapons, keys, armor: { value: Math.floor(p.armor ?? 0), cap: armorCap(up) }, upgrades: Object.keys(TRACKS).map((track) => ({ track, name: TRACKS[track].name, tier: up[track], max: TRACKS[track].costs.length })) };
}
