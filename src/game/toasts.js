// Pickup toast text. DOM-free so it can be tested. The NAME is presentation; the AMOUNT is read from PICKUPS (gameplay data), so the toast can never
// say "+30" while the pickup grants 40 (the rivet toast did exactly that).
import { PICKUPS } from '../engine/defs.js';

export const PICKUP_NAMES = {
  health_small: 'Field dressing', health_large: 'Medical satchel', ammo_flare: 'Flare shells', armor_vest: 'Canvas flak vest', ammo_shell: 'Shotgun shells', ammo_rivet: 'Rivets', ammo_bolt: 'Harpoon bolts', ammo_cell: 'Charge cells', ammo_round: 'Carbine rounds', ammo_rocket: 'Line-thrower rockets',
  oil: 'Lamp oil',
  key_brass: 'Brass key', key_iron: 'Iron key', key_bell: 'Bell key',
};
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
