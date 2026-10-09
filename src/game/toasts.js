// Pickup toast text. DOM-free so it can be tested. The NAME is presentation; the AMOUNT is read from PICKUPS (gameplay data), so the toast can never
// say "+30" while the pickup grants 40 (the rivet toast did exactly that).
import { PICKUPS } from '../engine/defs.js';

export const PICKUP_NAMES = {
  health_small: 'Field dressing', health_large: 'Medical satchel', ammo_flare: 'Flare shells', armor_vest: 'Canvas flak vest', ammo_shell: 'Shotgun shells', ammo_rivet: 'Rivets', ammo_bolt: 'Harpoon bolts', ammo_cell: 'Charge cells', ammo_round: 'Carbine rounds', ammo_rocket: 'Line-thrower rockets',
  key_brass: 'Brass key', key_iron: 'Iron key', key_bell: 'Bell key',
};
/** "Rivets (+40)": ammo, health and armour show what they give; keys and unknown kinds show just the name */
export function pickupToast(kind) {
  const name = PICKUP_NAMES[kind]; if (!name) return 'Picked up ' + kind;
  const def = PICKUPS[kind]; return def && def.type !== 'key' && def.amount ? `${name} (+${def.amount})` : name;
}
