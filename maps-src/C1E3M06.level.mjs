// C1E3M06 THE CHOIR LOFT: suppression in numbers, cover-to-cover advance. Tollbearers arranged as instruments. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch D, owner overnight go 2026-10-09.)
// The ship's choir sings from a raked hall: eight tiers of stalls climbing a wedge of a room (nine cells wide at the foot, thirty-three at the top) under a clerestory that stops half way, so the lower tiers are roofed in walnut and organ pipes
// and the upper ones stand open to the dusk. The aisle runs straight up the middle and it is a killing floor: the tuned (Tollbearers, standing asleep in rows like the stops of an organ) fill the lower stalls, an ACOLYTE walks behind them warding
// the lot, and from the upper tiers the singers (CHORISTERS in numbers: bursts, and a round that goes by suppresses your guns) fire down the rake with a Bulwark Shell walking in front of them. The pews are the cover: low, thick, in rows
// staggered tier by tier, so the way up is a zig-zag from one to the next. At the top a conductor's lever opens the door to the exit. A pew-back at the north wall of the second tier slides: a cache.
// Route (main): the vestibule -> the aisle up the first tiers (the tuned wake as you go: kill them at the pews) -> the middle tiers (the first Acolyte, a Bellhand, a Sexton) -> the open tiers (the singers and the shell, the second Acolyte) -> the top
// tier and the lever -> the conductor's door -> the exit. Secret: the pew-back, a niche of pipes.
// Scale class MIXED (about half roofed). Look: loft (amber, walnut, bronze pipes), a wall of organ pipes, polished boards.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(80, 48);
const WALL = 'E';
const CZ = 24;                                                                                      // the aisle runs along z = 24
const half = (x) => Math.round(4 + (x - 14) * 0.26);
const at = (x, dz) => [x, CZ + Math.max(-(half(x) - 1), Math.min(half(x) - 1, dz))];                          // a cell in the wedge at column x, dz from the aisle (clamped to the floor)
const putAt = (c, pts) => { for (const [x, dz] of pts) L.put(...at(x, dz), c); };                                                // half-width of the wedge at column x: 4 at the foot, 16 at the top

// ---- the vestibule, the wedge of tiers, the conductor's door and the exit room, the niche ----------------------------------------------------------------------------------------------------------------
L.disc(7, CZ + 0.5, 4.5, 4.5, 'i', WALL);                                                           // the vestibule: round, where you arrive
const floors = new Set();
for (let x = 14; x <= 61; x++) { const h = half(x), tier = Math.floor((x - 14) / 6); for (let z = CZ - h; z <= CZ + h; z++) { L.rect([x, z, x, z], x <= 37 ? 'i' : 'z'); L.height([x, z, x, z], tier); floors.add(x + ',' + z); } }      // the tiers: each 6 cells deep and half a metre higher; roofed on the lower four, open on the upper four
for (const key of floors) { const [x, z] = key.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const nx = x + dx, nz = z + dz; if (!floors.has(nx + ',' + nz) && L.g[nz]?.[nx] === '#') L.g[nz][nx] = WALL; } }
L.room([8, CZ, 13, CZ], { floor: 'i', wall: WALL });                                                // the passage from the vestibule to the first tier
L.ceiling([14, 8, 37, 40], 8);                                                                      // the clerestory: 8 m over the roofed tiers (the open ones have none)
L.height([62, CZ - 1, 70, CZ + 1], 7);
L.room([63, CZ, 64, CZ], { floor: 'i', wall: WALL }); L.door(62, CZ, { remote: true });             // the conductor's door at the top of the aisle
L.disc(69, CZ + 0.5, 4.5, 4, 'i', WALL); L.height([60, 10, 75, 38], 7);                             // the exit room
L.disc(22, 13.5, 3.5, 3.5, 'i', WALL); L.secretPanel(22, 17); L.height([18, 9, 26, 17], 2);         // the niche behind the pew-back (the second tier's north wall)

// ---- objects --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(4, CZ, '@'); L.put(70, CZ, '>');
L.putAll('n', [[4, CZ - 2], [4, CZ + 3], [9, CZ - 3], [9, CZ + 3]]);
// the pews: a row across each tier, staggered, the aisle (z 23..25) left open
for (let k = 0; k < 8; k++) { const x = 16 + 6 * k; for (let j = 1; j <= 8; j++) for (const sgn of [-1, 1]) { const z = CZ + sgn * (k % 2 ? 2 + 4 * j : 4 * j); if (Math.abs(z - CZ) <= half(x) - 1 && Math.abs(z - CZ) >= 2) L.put(x, z, 'p'); } }
// the tuned: Tollbearers standing asleep in rows like the stops of an organ (tiers 1 and 2), a Bellhand and a Sexton behind them, runners at the pews
putAt('t', [[20, -5], [20, 5], [26, -7], [26, 7], [26, 3]]); putAt('g', [[24, -7], [29, 8], [31, -8]]);
putAt('6', [[33, -2]]);                                                                             // the first Acolyte (symbol 6), behind the tuned
putAt('3', [[46, 0]]);                                                         // the second Acolyte, and a Bulwark Shell walking in front of the singers
putAt('1', [[53, -8], [58, 9], [58, -12]]);                         // the singers (symbol 1: Chorister), high on the open tiers
putAt('t', [[40, -6], [44, -4]]); putAt('b', [[40, 6]]); putAt('x', [[44, 5]]);
L.putAll('H', [[17, CZ], [35, CZ], [43, CZ], [57, CZ]]); L.putAll('h', [[22, CZ], [28, CZ], [49, CZ], [53, CZ], [59, CZ]]);
L.putAll('a', [[36, CZ], [40, CZ]]); L.putAll('e', [[37, CZ], [39, CZ]]); L.put(38, CZ, 'r');                 // the supply station on the middle tiers: the only ammunition boxes on the road (see MAP.drops keep) L.putAll('v', [[31, CZ], [47, CZ]]);
// the top tier: lanterns, the exit room's lanterns, the niche's cache
putAt('n', [[60, -6], [60, 6]]); L.putAll('n', [[66, CZ - 2], [66, CZ + 2], [72, CZ - 1], [72, CZ + 3]]);
L.putAll('H', [[21, 12], [23, 12]]); L.putAll('v', [[20, 14], [24, 14]]); L.putAll('e', [[21, 15], [23, 15]]); L.putAll('r', [[20, 12], [24, 12]]); L.put(22, 11, 'a');

const layers = L.layers();

const MAP = {
  id: 'C1E3M06', name: 'The Choir Loft', version: 1, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { fog: '#33241a', fogDensity: 0.007, sky: 'dusk', look: 'loft' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  legend: { 1: { type: 'enemy', kind: 'chorister' }, 3: { type: 'enemy', kind: 'bulwark' }, 6: { type: 'enemy', kind: 'acolyte' }, p: { type: 'prop', kind: 'pew', yaw: Math.PI / 2 } },
  intro: { title: 'THE CHOIR LOFT', lines: ['They have been rehearsing for years.', 'You are the audience.'] },
  outro: 'Next: the Spore Foundry. What the Choir sings, the Foundry makes.',
  objective: 'Climb the Loft. The conductor\'s lever is at the top',
  ...layers,
  secrets: [{ id: 'pew-back', panel: [22, 17], cells: [[22, 16], [22, 15], [22, 14]] }],
  groups: [{ name: 'tuned', rect: [18, 14, 31, 36] }, { name: 'middle', rect: [32, 12, 37, 36] }, { name: 'upper', rect: [38, 8, 61, 40] }],
  entities: [
    { type: 'switch', id: 'conductor', at: [61, 18], wall: 'east', do: [{ open: [62, 24] }, { objective: 'The conductor\'s door is open: the exit is east' }, { shake: 1.2 }] },
  ],
  messages: [
    { id: 'start', at: [5, CZ], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, a hall that climbs. I count rows of them standing before the first pews, and more above. Use the pews. Do not walk up the middle.' },
    { id: 'tuned', at: [19, CZ], radius: 3, speaker: 'INES', text: 'Standing in rows like the stops of an organ. Asleep, or what the ship calls asleep. Whatever you do near them, do it from behind a pew.' },
    { id: 'ward', at: [32, CZ], radius: 3, speaker: 'HULL', text: 'The tall one with the wheel of bells again. Everything near it takes half. It is behind the rows: go round the end of a pew and put it down.' },
    { id: 'singers', at: [42, CZ], radius: 3, speaker: 'INES', text: 'The rake is open sky from here, and the singers are up on the top tiers. A round that goes past you spoils your aim. Pew to pew. Do not stop in the aisle.' },
    { id: 'top', at: [58, CZ], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The conductor\'s lever, north end of the top tier, on the east wall. The door is at the head of the aisle.' },
    { id: 'pewback', at: [22, 19], radius: 2, speaker: 'HULL', text: 'The pew-back here slides under the hand. It was built to hide something.' },
    { id: 'exit', at: [66, CZ], radius: 2.5, speaker: 'INES', text: 'Past the conductor. Whatever they were rehearsing, they were rehearsing for this.' },
  ],
  triggers: [
    { id: 'tiers', when: 'enter', at: [16, CZ], radius: 2.5, do: [{ objective: 'Climb the Loft pew to pew: the tuned wake as you go' }] },
    { id: 'middle', when: 'enter', at: [33, CZ], radius: 3, do: [{ wake: 'middle' }, { objective: 'The singers are on the open tiers: use the pews against their fire' }] },
    { id: 'open', when: 'enter', at: [42, CZ], radius: 3, do: [{ wake: 'upper' }] },
    { id: 'top', when: 'enter', at: [56, CZ], radius: 3, do: [{ objective: 'The conductor\'s lever: the top tier, east wall, north end' }] },
  ],
  quality: { enemies: [14, 60], botSeconds: [50, 700], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 4, enemyKinds: { acolyte: 1, bulwark: 1, chorister: 3, tollbearer: 6, gaunt: 3, bellhand: 1, sexton: 1 },
    scaleClass: 'MIXED', tallReason: 'the Loft is the episode\'s one named raked hall: 8 m under the clerestory so the tiers can climb 2 m and still have air above them',
    introduces: 'SUPPRESSION IN NUMBERS and the cover-to-cover advance: three singers high on a raked hall under open sky, an Acolyte warding the rows of the tuned, and the pews as the only cover between them and you' },
};

// ---- PT-025: fed by the dead (src/engine/drops.js): no ammunition boxes on the road, except the niche's cache (the secret) ----
MAP.drops = { scale: 1, keep: [[36, 24, 40, 24]] };

export default MAP;
