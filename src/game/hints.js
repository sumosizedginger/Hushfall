// The first time a system matters, one line that names the player's own key. Pure: the shell shows the text and remembers what was shown
// (settings.hintsSeen). The same words go into the Journal's item help.
import { prettyCode } from './bindings.js';
import { padGlyph } from './gamepad.js';
import { ENEMIES, WEAPONS, MELEE_ORDER } from '../engine/defs.js';

// the basics, one at a time where they matter (the outside playtest of 2026-11-18: aim, sprint, melee, switching and ammunition were only ever in
// a legend). A hint with `known` is marked seen silently once the player has shown they know it, so it never lectures.
const isMelee = (w) => MELEE_ORDER.includes(w) || !!WEAPONS[w]?.melee;
const hostiles = (world, r) =>
  world.enemies.filter(
    (e) => e.state !== 'dead' && e.state !== 'idle' && !ENEMIES[e.kind]?.peaceful && Math.hypot(e.x - world.player.x, e.z - world.player.z) < r,
  );
// in the picture: within 50 degrees of where the player looks (forward = (-sin yaw, -cos yaw)). The first browser check, 2026-11-17: the melee
// lesson came while the player looked out to sea with the creature at their side, and "too close for the gun?" meant nothing
const inFront = (world, e) => {
  const p = world.player,
    dx = e.x - p.x,
    dz = e.z - p.z,
    d = Math.hypot(dx, dz) || 1;
  return (-Math.sin(p.yaw ?? 0) * dx - Math.cos(p.yaw ?? 0) * dz) / d > Math.cos((50 * Math.PI) / 180);
};
const facing = (world, r) => hostiles(world, r).filter((e) => inFront(world, e));

/** each hint: `when(ctx)` is true the moment it matters; `known(ctx)`, when given, is true once the player plainly knows it; ctx = { world, events, firing, down } */
export const HINTS = [
  {
    id: 'aim',
    known: ({ world, down }) => down.has('aim') || (world.player.ads ?? 0) > 0.5,
    when: ({ world }) => !isMelee(world.player.weapon) && facing(world, 24).length > 0,
    text: (k) => `Hold ${k('aim')} to aim down the sights: a tighter shot, a slower step.`,
  },
  {
    id: 'melee',
    known: ({ world }) => (world.player.swingT ?? -1) >= 0,
    when: ({ world }) => !isMelee(world.player.weapon) && facing(world, 3.2).length > 0,
    text: (k) => `Too close for the gun? ${k('melee')} strikes without putting it away.`,
  },
  {
    id: 'switch',
    when: ({ world, events }) =>
      (world.player.weapons?.length ?? 0) >= 2 &&
      events.some((e) => e.type === 'weapon_pickup' && !String(e.kind).startsWith('mod_') && !MELEE_ORDER.includes(e.kind)),
    text: (k) => `A new gun. The bar at the bottom shows what you carry: ${k('weapon1')} to ${k('weapon10')} pick one, ${k('weaponLast')} swaps back.`,
  },
  {
    id: 'ammo',
    when: ({ world }) => {
      const t = WEAPONS[world.player.weapon]?.ammo;
      return !!t && (world.player.ammo?.[t] ?? 99) <= 2;
    },
    text: (k) => `Running low. A creature drops ammunition when it falls: walk over it. ${k('melee')} costs nothing.`,
  },
  {
    id: 'folk',
    when: ({ world }) =>
      world.enemies.some((e) => e.state === 'calm' && ENEMIES[e.kind]?.peaceful && Math.hypot(e.x - world.player.x, e.z - world.player.z) < 14),
    text: () => 'Not every Vael here fights. The ones that walk on and never turn on you are no threat, and killing one costs you rank.',
  },
  {
    id: 'run',
    known: ({ world }) => !!world.player.sprinting,
    when: ({ world }) => world.time > 30 && hostiles(world, 30).length === 0,
    text: (k) => `Hold ${k('sprint')} to run. The gun comes back up when you let go.`,
  },
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

/**
 * the first hint due now that has not been shown: its id and its words; else { id, silent: true } for a hint the player plainly already knows
 * (the shell marks it seen without a word); else null
 */
export function nextHint({ world, events = [], firing = false, down = new Set(), seen = {}, keyOf }) {
  if (!world?.player) return null;
  let known = null;
  for (const h of HINTS) {
    if (seen[h.id]) continue;
    try {
      if (h.known?.({ world, events, firing, down })) {
        known ??= { id: h.id, silent: true };
        continue;
      }
    } catch {
      /* a hint that cannot read the world is not known yet */
    }
    let due = false;
    try {
      due = h.when({ world, events, firing, down });
    } catch {
      due = false;
    }
    if (due) return { id: h.id, text: h.text(keyOf) };
  }
  return known;
}

/** the name of an action's key or button as the player has it */
export const keyNamer =
  ({ bindings = {}, padBindings = {}, family = 'xbox', pad = false } = {}) =>
  (a) =>
    (pad ? padGlyph(padBindings[a]?.[0], family) : prettyCode(bindings[a]?.[0])) || a;

/** a text that says {key:action}, with the player's own keys in it */
export const withKeys = (text, keyOf) => String(text ?? '').replace(/\{key:([a-zA-Z0-9]+)\}/g, (_, a) => keyOf(a));
