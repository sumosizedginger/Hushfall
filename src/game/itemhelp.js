// PT-054 (the owner, 2026-10-19: the Journal "does not track items or weapons you pick up, so the player still isn't sure what all they have and how best to use it"): what each gun, each key and each kind of pickup is FOR, in plain words, for the Items page.
// PURE data and two lookups: no DOM, no sim. Facts only, read from the definitions in engine/defs.js and from the cards in toasts.js (the one-liners the player saw when they picked the thing up): a line here never promises what the game does not do (tests/journal-levels.test.js checks every
// weapon and every pickup kind has its line). `role` is a few words for a heading, `use` is how to get the most out of it.
import { WEAPONS, PICKUPS, KEYS, AMMO_LOADS, MODS } from '../engine/defs.js';

export const WEAPON_USE = Object.freeze({
  flare: { role: 'Fire and light', use: 'It lobs a flare that lights the dark and leaves burning ground where it lands: put it at their feet or in a doorway, then keep out of the flames.' },
  scattergun: { role: 'Close burst', use: 'Strongest close in; a hit knocks a creature out of its wind-up. Shells go quickly, so save them for what is near.' },
  rivet: { role: 'A steady stream', use: 'Hold to fire. Rivets slow what they hit and break a lunge. They are plentiful: use them for the middle distance and keep the heavy guns for the hard targets.' },
  harpoon: { role: 'One heavy bolt', use: 'Hold aim to zoom. A bolt pins what it hits and goes through plate and bodies. It is slow: pick the shooter or the armoured one, then fire.' },
  arc: { role: 'Chain lightning', use: 'Tap for an arc that picks its targets and jumps between close ones; hold to charge a forked bolt. It lights the dark and is strongest against the Vael. Short range.' },
  carbine: { role: 'Precision', use: 'No bloom at any range. Aim at the head: a round there does 2.4 times. The answer to shooters on a ridge.' },
  linethrower: { role: 'Wide blast', use: 'A rocket with a wide blast, best on a crowd. Aim at the ground beside them, not at your own feet: the blast hurts you too.' },
  mortar: { role: 'Indirect shell', use: 'The shell lands where the ring on the ground shows, so it goes over cover. It takes two rockets a shell and the blast hurts you too.' },
  fork: { role: 'Gravity, no ammunition', use: 'Hold aim to lift a crate, a barrel or a sack, or to drag a creature in; fire to throw or punt. A punt turns a toll-shot back.' },
  fists: { role: 'Always with you', use: 'Hold the strike to charge a heavy blow. The quick melee key works with every gun in your hands.' },
  boathook: { role: 'Reach', use: 'Long reach, and it pulls them in: hook the shooters that keep their distance.' },
  marlinspike: { role: 'The back', use: 'Fast, and three times as deadly in the back: walk round a creature and strike from behind.' },
  mallet: { role: 'Staggering', use: 'It staggers, and plate does not turn it: take it to the armoured ones.' },
  axe: { role: 'Cleaving', use: 'Slow, and it cleaves everything in front of you: wait for them to bunch, then swing.' },
  chainsaw: { role: 'Hold fire', use: 'Hold fire against something close. It never runs out of fuel, but it is loud and it stalls.' },
});

const AMMO_FOR = (type) => Object.entries(WEAPONS).filter(([, d]) => d.ammo === type).map(([, d]) => d.name).join(', ');
/** one line of what a pickup kind does, for the ledger; null for a kind this module does not know */
export function pickupUse(kind) {
  const d = Object.hasOwn(PICKUPS, kind) ? PICKUPS[kind] : null; if (!d) return null;
  if (d.type === 'weapon') return WEAPON_USE[d.weapon]?.use ?? null;
  if (d.type === 'key') return `Opens the doors that wear its colour (${KEYS[d.key]?.name ?? 'a key'}); it stays with you for the map.`;
  if (d.type === 'health') return `Restores ${d.amount} health, up to the full hundred. It is only taken while you are hurt, so a spare one waits where it lies.`;
  if (d.type === 'armor') return `Gives ${d.amount} armour, which soaks part of every hit until it is gone. It is only taken while you are below your limit.`;
  if (d.type === 'crate') return `Brings the ammunition of every gun you carry up to ${Math.round(d.fill * 100)} per cent of what it can hold, and takes nothing from a gun that has more. It is only taken when it would add something, so a full set of guns leaves it where it lies.`;
  if (d.type === 'oil') return `Fills the hand lantern by ${d.amount}. The lantern burns oil while it is lit (L): light it for the dark, keep it dark to stay unseen.`;
  if (d.type === 'mod') { const M = MODS[d.mod]; return `A permanent change to the ${WEAPONS[M.gun].name}: ${M.line} At the Locker, ${M.tier2.cost} salvage buys a second tier (${M.tier2.line.toLowerCase()})`; }
  if (d.type === 'load') { const L = AMMO_LOADS[d.load], what = d.load === 'slag' ? `Hits set what they do not kill alight (${L.ignite.dps} a second for ${L.ignite.t} seconds); nothing catches in water.` : d.load === 'rime' ? `${Math.round(L.dmg * 100)}% of the damage, but it chills (${Math.round(L.chill.slow * 100)}% slower for ${L.chill.t} seconds), the next blow lands ${L.chill.brittle} times as hard, and it puts fire out; a bell node takes it twice.` : `${L.plate} times the damage against plate, and it goes through one more body at ${Math.round(L.throughMult * 100)}%; the rivet driver and the carbine spend two rounds a shot.`; return `Gives ${d.amount} ${L.name} for the ${WEAPONS[d.gun].name}. ${what} Press T to turn the gun to its next load; a load is spent instead of the ordinary ammunition, and the gun goes back to it when the load is gone.`; }
  if (d.type === 'ammo') return `Gives ${d.amount} for the ${AMMO_FOR(d.ammo) || d.ammo}. It is only taken while you are below your limit; creatures also drop ammunition, for the gun you are using or the one that is emptiest.`;
  return null;
}
