// Pickup toast text. DOM-free so it can be tested. The NAME is presentation; the AMOUNT is read from PICKUPS (gameplay data), so the toast can never
// say "+30" while the pickup grants 40 (the rivet toast did exactly that).
import { PICKUPS, SLOT_KEYS, WEAPONS, KEYS, AMMO_LOADS, MODS } from '../engine/defs.js';

export const PICKUP_NAMES = {
  health_small: 'Field dressing', health_large: 'Medical satchel', ammo_flare: 'Flare shells', armor_vest: 'Canvas flak vest', ammo_shell: 'Shotgun shells', ammo_rivet: 'Rivets', ammo_bolt: 'Harpoon bolts', ammo_cell: 'Charge cells', ammo_round: 'Carbine rounds', ammo_rocket: 'Line-thrower rockets',
  oil: 'Lamp oil',
  key_brass: 'Brass key', key_iron: 'Iron key', key_bell: 'Bell key',
};
// the load pickups (PT-056): "Slag shells", "Rime bolts", "Penetrator rounds"
const LOAD_AMMO_NAME = { scattergun: 'shells', rivet: 'rivets', carbine: 'rounds', harpoon: 'bolts', flare: 'flares' };
for (const [kind, d] of Object.entries(PICKUPS)) if (d.type === 'mod') PICKUP_NAMES[kind] = MODS[d.mod].name;          // (PT-057: a mod is named by the mod)
for (const [kind, d] of Object.entries(PICKUPS)) if (d.type === 'load') PICKUP_NAMES[kind] = `${AMMO_LOADS[d.load].name} ${LOAD_AMMO_NAME[d.gun]}`;
/** "Rivets (+40)": ammo, health and armour show what they give; keys and unknown kinds show just the name */
export function pickupToast(kind) {
  const name = PICKUP_NAMES[kind]; if (!name) return 'Picked up ' + kind;
  const def = PICKUPS[kind]; return def && def.type !== 'key' && def.amount ? `${name} (+${def.amount})` : name;
}

/** PT-047 V2: the toast column as a MODEL (the DOM only draws it). A toast equal to the newest one still showing is MERGED into it (a count, a renewed life: "Rivets (+40) x2") instead of stacking a copy; at most `max` show at once, the oldest goes first.
 *  `stack` is [{ text, count, until }] in order, oldest first; `now` is in seconds. Returns the new stack (expired toasts dropped). */
export const TOAST = Object.freeze({ life: 3.2, max: 3 });
export function pushToast(stack, text, now) {
  const live = (stack ?? []).filter((t) => t.until > now), top = live.at(-1);
  if (top && top.text === text) { top.count++; top.until = now + TOAST.life; } else live.push({ text, count: 1, until: now + TOAST.life });
  while (live.length > TOAST.max) live.shift();
  return live;
}
export const toastLabel = (t) => (t.count > 1 ? `${t.text} \u00d7${t.count}` : t.text);

// ---- PT-049 U1 (the owner: "not knowing when you pick something up or the importance of it"): pickups come in three tiers. MINOR (ammunition, a small dressing): the toast in the column, as before. MEDIUM (armour, a large satchel, lamp oil): the toast and its own
// sound (pickup_armor / pickup_health already differ by type). MAJOR (a gun, a melee weapon, a key): a CARD at lower centre for about 2.5 s: an icon, the name, ONE line of what it does, in the item's colour; the sound is the bell of a key or the pump of a gun.
// Mods, upgrades and documents join the major tier when they exist. The text lives HERE (it used to be a ternary in ui.js), the DOM only draws it.
/** weapon pickup kind -> [name, one line]; the slot key is read from SLOT_KEYS, so a re-ordered key never contradicts the card */
export const WEAPON_CARDS = Object.freeze({
  weapon_scattergun: ['Tidewarden scattergun', 'A close burst; it empties fast.'],
  weapon_rivet: ['Rivet driver', 'Hold to fire a stream of rivets at range.'],
  weapon_harpoon: ['Harpoon rifle', 'Hold aim to zoom. A bolt goes through plate and bodies.'],
  weapon_arc: ['Charge-arc lamp', 'Tap for an arc that picks its targets; hold to charge a forked bolt. It lights the dark.'],
  weapon_boathook: ['Boat hook', 'Long reach, and it pulls them in.'],
  weapon_marlinspike: ['Marlinspike', 'Fast, and three times as deadly in the back.'],
  weapon_mallet: ["Lamplighter's mallet", 'It staggers, and plate does not turn it.'],
  weapon_axe: ['Fire axe', 'Slow. It cleaves everything in front of you.'],
  weapon_carbine: ['Harbour carbine', 'No bloom; a round in the head does 2.4 times.'],
  weapon_linethrower: ['Rocket line-thrower', 'A wide blast, and it hurts you too.'],
  weapon_mortar: ['Bell-breaker mortar', 'The shell lands on the ring. Two rockets a shell; it hurts you too.'],
  weapon_fork: ['Vael tuning-fork', 'Hold aim to lift; fire to throw or punt.'],
  weapon_chainsaw: ["Shipwright's chainsaw", 'Hold fire. It is loud, and it stalls.'],
});
/** 'minor' | 'medium' | 'major', or null for a kind that does not exist */
export function pickupTier(kind) {
  const d = Object.hasOwn(PICKUPS, kind) ? PICKUPS[kind] : null; if (!d) return null;
  if (d.type === 'weapon' || d.type === 'key' || d.type === 'mod') return 'major';
  if (d.type === 'armor' || d.type === 'oil' || d.type === 'load' || (d.type === 'health' && d.amount >= 25)) return 'medium';
  return 'minor';
}
const slotLabel = (weapon) => { const i = SLOT_KEYS.indexOf(WEAPONS[weapon]?.kind === 'melee' ? 'melee' : weapon); return i < 0 ? '' : String((i + 1) % 10); };
/** the card for a MAJOR pickup: { tier, kind, title, line, color, icon }, or null for anything else */
/** `labels`: the map's own names for its keys (`keyLabels`: the Signal House's keys are FUSES; the card must say what the place calls them) */
export function pickupCard(kind, labels = {}) {
  if (pickupTier(kind) !== 'major') return null; const d = PICKUPS[kind];
  if (d.type === 'key') { const k = KEYS[d.key], own = labels[d.key]; return { tier: 'major', kind, title: own ?? k.name, line: own ? `${/^[aeiou]/i.test(own) ? 'An' : 'A'} ${own.toLowerCase()}: the ${d.key} lock takes it.` : `Opens ${d.key} doors and switches.`, color: k.color, icon: 'key' }; }
  if (d.type === 'mod') { const M = MODS[d.mod]; return { tier: 'major', kind, title: M.name, line: `For the ${WEAPONS[M.gun].name}. ${M.line}`, color: '#ffd488', icon: 'gun' }; }          // PT-057: a mod is a card
  const [title, line] = WEAPON_CARDS[kind] ?? [WEAPONS[d.weapon]?.name ?? 'Weapon', ''], slot = slotLabel(d.weapon), melee = WEAPONS[d.weapon]?.kind === 'melee';
  return { tier: 'major', kind, title, line: (slot ? `Key ${slot}. ` : '') + line, color: melee ? '#d9a04c' : d.weapon === 'fork' ? '#6ffff0' : '#e8e2d0', icon: melee ? 'melee' : d.weapon === 'fork' ? 'tool' : 'gun' };
}
const svg = (d) => `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
const ICONS = { gun: svg('M3 19h27l4-4h11v9H33l-4 4h-7l-2 11h-8l2-11H3z'), melee: svg('M9 42 35 8l5 4-26 34zM29 5l14 3-3 15z'), tool: svg('M20 4h8v18a8 8 0 0 0 8-8V4h6v10a14 14 0 0 1-12 13.8V44h-8V27.8A14 14 0 0 1 6 14V4h6v10a8 8 0 0 0 8 8z'), key: svg('M31 6a11 11 0 1 1-7 19.5L12 38H5v-6l3-2v-4h4v-4h4l6-5A11 11 0 0 1 31 6zm4 7a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z') };
/** the card's icon as inline SVG (our own constants only, never player text) */
export const cardIcon = (name) => ICONS[name] ?? ICONS.gun;
