// How a place sounds: a family of room for every look, each a synthesized impulse (decaying noise, darker with distance, with early slaps off the
// walls). Pure data and a pure builder.
export const ROOMS = {
  open: { secs: 0.7, power: 4.5, damp: 0.25, early: [0.11], send: 0.1, wet: 0.5 }, // a slap off something far away, then nothing
  town: { secs: 1.3, power: 3.5, damp: 0.4, early: [0.03, 0.07], send: 0.22, wet: 0.5 }, // rooms of plaster and timber
  hall: { secs: 2.6, power: 2.6, damp: 0.5, early: [0.05, 0.12, 0.19], send: 0.3, wet: 0.55 }, // a long stone room
  hull: { secs: 1.5, power: 2.8, damp: 0.12, early: [0.02, 0.045, 0.08, 0.13], send: 0.28, wet: 0.5 }, // iron: bright, ringing, close
  cave: { secs: 3.6, power: 2.2, damp: 0.72, early: [0.09, 0.21], send: 0.32, wet: 0.6 }, // rock: long and dark
  flesh: { secs: 1.1, power: 3.2, damp: 0.85, early: [0.04], send: 0.26, wet: 0.55 }, // a living wall swallows the top of a sound
};

/** the family of every look in the game; a test fails for a look with no row */
export const ROOM_OF_LOOK = {
  harbour: 'town',
  dusk: 'town',
  customs: 'town',
  moon: 'town',
  cellar: 'town',
  signal: 'town',
  hill: 'town',
  salt: 'hull',
  kiln: 'hall',
  cradle: 'hull',
  pump: 'hall',
  choir: 'flesh',
  loom: 'flesh',
  loft: 'hall',
  foundry: 'hull',
  throat: 'flesh',
  tether: 'hull',
  wreck: 'hull',
  rime: 'hall',
  mirror: 'hall',
  quiet: 'hall',
  dock: 'hull',
  orchard: 'flesh',
  approach: 'hall',
  stair: 'hall',
  threshold: 'town',
  steppe: 'hall',
  outpost: 'hull',
  fields: 'town',
  reliquary: 'hall',
  aqueduct: 'hall',
  bellwright: 'hull',
  ascent: 'hall',
  deep: 'cave',
  deepgate: 'cave',
  markets: 'cave',
  halls: 'cave',
  drowned: 'cave',
  ossuary: 'cave',
  gardens: 'cave',
  basilica: 'hall',
  heart: 'flesh',
  tender: 'flesh',
  hive: 'flesh',
  nerve: 'flesh',
  woven: 'flesh',
  veins: 'flesh',
  reactor: 'hull',
  mourning: 'hall',
  copy: 'town',
  conductor: 'hull',
  descent: 'cave',
  roots: 'cave',
  fault: 'cave',
  tide: 'cave',
  rootbell: 'hull',
  unrung: 'hall',
  gate: 'hall',
};

/** the room around the player: under the sky every place sounds open, under a roof it sounds as its look says */
export const roomFor = (look, interior) => (interior ? (ROOM_OF_LOOK[look] ?? 'town') : 'open');

/**
 * the two channels of a room's impulse, as plain arrays of samples. The tail is noise under a power curve, and a one-pole lowpass that closes as the
 * tail goes on (`damp`: 0 stays
 * bright, 1 goes dark fast); `early` puts a discrete slap at each of those seconds.
 */
export function impulse(rand, sampleRate, room) {
  const R = ROOMS[room] ?? ROOMS.town,
    len = Math.max(1, Math.floor(sampleRate * R.secs)),
    out = [];
  for (let ch = 0; ch < 2; ch++) {
    const d = new Float32Array(len);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const u = i / len,
        a = 1 - R.damp * Math.min(1, u * 2.2) * 0.96;
      lp += a * (rand() * 2 - 1 - lp);
      d[i] = lp * Math.pow(1 - u, R.power);
    }
    for (const [k, s] of R.early.entries()) {
      const at = Math.floor(s * sampleRate * (ch ? 1.07 : 1));
      if (at < len) d[at] += (k % 2 ? -1 : 1) * (0.7 - k * 0.12);
    }
    out.push(d);
  }
  return out;
}

/** the footstep of a floor family */
export const STEP_OF_FAMILY = {
  wood: 'step_plank',
  stone: 'step_stone',
  metal: 'step_metal',
  earth: 'step_outdoor',
  soft: 'step_soft',
  organic: 'step_wet',
  water: 'step_water',
};

/** how much the music gives way, and for how long, when something has to be heard over it. `k` is the music's level during it (1 = untouched). */
export const DUCKS = {
  explode: { k: 0.45, s: 0.5 },
  hurt: { k: 0.65, s: 0.3 },
  windup: { k: 0.75, s: 0.35 },
  message: { k: 0.55, s: 3 },
};
