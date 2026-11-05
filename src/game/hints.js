// The first time a system matters, one line that names the player's own key. Pure: the shell shows the text and remembers what was shown
// (settings.hintsSeen). The same words go into the Journal's item help.
import { prettyCode } from './bindings.js';
import { padGlyph } from './gamepad.js';

/** each hint: `when(ctx)` is true the moment it matters; ctx = { world, events, firing } */
export const HINTS = [
  {
    id: 'sprint',
    when: ({ world, firing }) => firing && world.player.sprinting,
    text: (k) => `The gun is down while you run. Let go of ${k('sprint')} and it comes back up.`,
  },
  {
    id: 'guard',
    when: ({ world }) => world.player.weapon === 'fists' || world.player.meleeWeapon !== 'fists',
    text: (k) => `With a melee weapon in hand, ${k('aim')} is the guard. Raise it just as a blow lands and it is a parry.`,
  },
  {
    id: 'arc',
    when: ({ world }) => world.player.weapon === 'arc',
    text: (k) => `Tap ${k('fire')} for an arc. Hold it to charge a forked bolt, and let go.`,
  },
  {
    id: 'fork',
    when: ({ world }) => world.player.weapon === 'fork',
    text: (k) => `Hold ${k('aim')} to lift a crate or drag a creature in. ${k('fire')} throws it.`,
  },
  {
    id: 'mortar',
    when: ({ world }) => world.player.weapon === 'mortar',
    text: () => 'The shell lands where the ring on the ground is. It cannot be fired at your feet.',
  },
  {
    id: 'saw',
    when: ({ world }) => world.player.weapon === 'chainsaw',
    text: (k) => `Hold ${k('fire')} to rev and cut. Cut too long and it stalls.`,
  },
  {
    id: 'load',
    when: ({ world }) => !!world.player.loads && Object.keys(world.player.loads).length > 0,
    text: (k) => `You found a load for your gun. ${k('load')} turns the gun to it.`,
  },
  {
    id: 'mod',
    when: ({ events }) => events.some((e) => e.type === 'weapon_pickup' && String(e.kind).startsWith('mod_')),
    text: (k) => `A mod stays with the gun for good. ${k('map')} opens the Journal: Items says what it does.`,
  },
  {
    id: 'lamp',
    when: ({ world }) => !!world.map.lantern && !!world.map.dark && !world.player.lamp?.on,
    text: (k) => `It is dark. ${k('lamp')} lights the lantern. The oil runs out, and some things hunt by light.`,
  },
  {
    id: 'key',
    when: ({ events }) => events.some((e) => e.type === 'door_locked'),
    text: (k) => `That door wants a key, and the key is now marked on your map. ${k('map')} opens the map: a locked door shows in its key's colour.`,
  },
  {
    id: 'mirror',
    when: ({ world }) => (world.map.props ?? []).some((q) => q.kind === 'mirror' && Math.hypot(q.x - world.player.x, q.z - world.player.z) < 6),
    text: (k) => `${k('use')} turns a mirror a quarter. A beam leaves the bright face at a right angle; the black back stops it.`,
  },
  {
    id: 'wheel',
    when: ({ world }) => (world.player.weapons?.length ?? 0) >= 4,
    text: (k) => `Hold ${k('weaponLast')} for the weapon wheel: time slows while it is open.`,
  },
];

/** the first hint due now that has not been shown: its id and its words, or null */
export function nextHint({ world, events = [], firing = false, seen = {}, keyOf }) {
  if (!world?.player) return null;
  for (const h of HINTS) {
    if (seen[h.id]) continue;
    let due = false;
    try {
      due = h.when({ world, events, firing });
    } catch {
      due = false;
    }
    if (due) return { id: h.id, text: h.text(keyOf) };
  }
  return null;
}

/** the name of an action's key or button as the player has it */
export const keyNamer =
  ({ bindings = {}, padBindings = {}, family = 'xbox', pad = false } = {}) =>
  (a) =>
    (pad ? padGlyph(padBindings[a]?.[0], family) : prettyCode(bindings[a]?.[0])) || a;

/** a text that says {key:action}, with the player's own keys in it */
export const withKeys = (text, keyOf) => String(text ?? '').replace(/\{key:([a-zA-Z0-9]+)\}/g, (_, a) => keyOf(a));
