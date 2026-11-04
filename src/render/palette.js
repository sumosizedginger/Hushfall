// The colours that carry meaning, by the player's choice of palette. Pure. Every state here is also told by something other than colour
// (tests/accessibility-pt083.test.js holds the table):
// a blow's tell is a star, a shot's a star inside a ring; a hostile outline belongs to a thing that comes for you, a peaceful one's owner runs and
// says nothing.
export const PALETTES = {
  standard: { label: 'Standard', hostile: [0.22, 0.025, 0.03], melee: 0xffb070, ranged: 0x9ffff0 },
  deutan: { label: 'Red-green (deutan)', hostile: [0.26, 0.15, 0.0], melee: 0xffc04a, ranged: 0x6fb8ff },
  protan: { label: 'Red-green (protan)', hostile: [0.24, 0.2, 0.02], melee: 0xffd24a, ranged: 0x5fb4ff },
  tritan: { label: 'Blue-yellow (tritan)', hostile: [0.28, 0.02, 0.12], melee: 0xff7a9a, ranged: 0x7affc8 },
};
export const paletteOf = (name) => PALETTES[name] ?? PALETTES.standard;

/** what tells each thing that matters, beyond its colour */
export const STATE_CUES = [
  { state: 'a blow is coming', not_colour: 'a four-point star on the creature that turns as it comes; a windup sound; the arm goes up' },
  { state: 'a shot is coming', not_colour: 'the same star inside a ring; a different sound; the caption says who' },
  { state: 'it is hostile', not_colour: 'it comes for you, and a shot wakes it' },
  { state: 'it is peaceful', not_colour: 'it runs from you and never fights; the toast says so when one dies' },
  { state: 'it is asleep', not_colour: 'it stands still, head down, and does not turn to you' },
  { state: 'a key', not_colour: 'the chip in the HUD has two letters of its name, and a locked door says which it wants' },
  { state: 'low health', not_colour: 'the number, the heartbeat, and the edges of the screen' },
  { state: 'a load is on the gun', not_colour: 'its name on the HUD' },
  { state: 'a shielded boss', not_colour: 'the boss bar says so in words, the shell rings when hit, and the nodes are marked by a ring of light' },
];
