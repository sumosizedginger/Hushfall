// C1E3M07 THE SPORE FOUNDRY: spawner denial. Where the Choir's hands are made. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch E, owner overnight go 2026-10-09.)
// The ship casts its bell-bearers in a round hall around a furnace: a solid core of black iron at the middle, a ring of floor round it, and on the ring four BROOD VATS (new: src/engine/world.js `vatStep`, a cistern on stilts that wakes when it sees you,
// swells its dome and drops a Gaunt or a Tollbearer beside it, three alive at most, for as long as it lives). Slag runs to each vat through a toxic trough from the core. Nothing is locked but the exit, and the exit opens only when the vats are dead:
// you do not outlast a spawner, you deny it. Pillars and the troughs are the cover; a Sexton walks the ring behind the sleepers; two Bellhands guard the east.
// Route (main): the intake (two sleepers) -> the passage -> the hall's west mouth (the supply station) -> the south-west vat -> round the south to the south-east vat -> up the east side (Bellhands) to the north-east vat -> along the north to the north-west vat
// -> the vats are dead, the north passage unlocks -> the exit. Secret: a loose panel in the hall's south wall, a cellar of caught slag.
// Scale class COMPRESSION (all roofed, the core breaks every sightline across the hall). Look: foundry (green-black iron, the glow is the light), a floor of cast plates, toxic troughs.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(52, 56);
const WALL = 'F';
const CX = 34, CZ = 28.5;                                                                          // the hall's centre (cells; the core sits on it)
const cellAt = (r, deg) => [Math.round(CX + r * Math.cos(deg * Math.PI / 180) - 0.5), Math.round(CZ + r * Math.sin(deg * Math.PI / 180) - 0.5)];

// ---- the intake, the passage, the casting hall with its core, the north passage and the exit, the cellar -------------------------------------------------------------------------------------------------------
L.disc(7, 28.5, 4.5, 4.5, 'g', WALL);                                                              // the intake: round, a grating, where you arrive
L.room([13, 28, 21, 28], { floor: 'q', wall: WALL }); L.door(12, 28);                              // the way into the hall
L.disc(CX, CZ, 12.5, 13, 'j', WALL);                                                               // THE CASTING HALL: 25 x 26 cells of cast plate under a 7 m vault
L.ceiling([21, 15, 47, 42], 7);
for (let z = 22; z <= 36; z++) for (let x = 28; x <= 40; x++) if (Math.hypot(x + 0.5 - CX, z + 0.5 - CZ) < 3.9) L.rect([x, z, x, z], WALL);      // the furnace: a solid core of iron at the middle
for (const deg of [45, 135, 225, 315]) for (let z = 15; z <= 42; z++) for (let x = 21; x <= 47; x++) {                                     // a toxic trough runs from the core towards each vat
  const dx = x + 0.5 - CX, dz = z + 0.5 - CZ, r = Math.hypot(dx, dz), a = deg * Math.PI / 180, perp = Math.abs(-dx * Math.sin(a) + dz * Math.cos(a));
  if (r >= 4.6 && r <= 8.6 && perp <= 1.3 && Math.hypot(dx, dz) > 4) L.fx([x, z, x, z], 'x');
}
L.room([34, 10, 34, 15], { floor: 'q', wall: WALL });                                                // the north passage
L.disc(34.5, 5.5, 4.5, 4, 'f', WALL);                                                              // the exit room (flagstones)
L.disc(34.5, 46, 3.5, 3.5, 'j', WALL); L.secretPanel(34, 42);                                       // the cellar of caught slag behind a loose panel in the hall's south wall

// ---- objects --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 28, '@');
L.putAll('Q', [[4, 26], [4, 31], [9, 25], [9, 32], [24, 25], [24, 32], [44, 25], [44, 32], [34, 11], [31, 5], [38, 5], [34, 49], [31, 46], [38, 46]]);
L.putAll('t', [[9, 26], [9, 31]]);                                                                   // the intake: two sleepers by the door
L.putAll('P', [[43, 32], [39, 36], [29, 36], [25, 32], [25, 25], [29, 21], [39, 21], [43, 25]]);        // pillars on the ring between the vats: cover
L.putAll('H', [[23, 28], [44, 28], [34, 40]]); L.putAll('h', [[27, 28], [30, 19], [38, 19], [30, 38], [38, 38], [34, 12]]); L.put(34, 17, 'v');
L.putAll('a', [[23, 26], [23, 27], [23, 29], [23, 30]]); L.putAll('e', [[24, 26], [24, 30]]); L.put(24, 28, 'r');                // the supply station at the hall's west mouth: the only ammunition boxes on the road (see MAP.drops keep)
// the ring: sleepers between the vats, a Sexton behind the south-east ones, two Bellhands guarding the east
L.putAll('t', [[25, 22], [25, 35], [30, 17], [38, 17], [30, 40], [38, 40], [43, 22], [43, 35]]);
L.putAll('g', [[24, 24], [24, 33], [45, 26], [45, 31]]); L.putAll('b', [[43, 28], [41, 29]]); L.put(36, 38, 'x');
// the exit room and the north passage: lanterns
L.putAll('n', [[34, 4], [31, 6], [38, 6]]);
// the cellar (the secret): a cache
L.putAll('H', [[33, 46], [35, 46]]); L.putAll('v', [[33, 48], [35, 48]]); L.putAll('e', [[32, 47], [36, 47]]); L.putAll('r', [[33, 44], [35, 44]]); L.put(34, 48, 'a');

// ---- PT-035, the materials (the outside audits and my own eye: the Foundry was one green, wall and floor, and the furnace you fight round did not look hot). The core of the furnace is kiln brick with the fire in its joints and the floor round it is clinker and ember cracks. Only the character of a wall or a
// floor changes, never its kind: no route, sight line or shot moves (tools/dev/route-fingerprint.mjs proves it). ----
for (let z = 0; z < 56; z++) for (let x = 0; x < 52; x++) {
  const r = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
  if (L.g[z][x] === WALL && r < 5.2) L.g[z][x] = 'Y'; else if (L.g[z][x] === 'j' && r < 7.6) L.g[z][x] = 'k';
}
// ---- end PT-035 materials ----
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [42,23], radius: 2, cells: ENC.around([42,23], { n: 2, min: 4, max: 8 }), kind: 'g' });
ENC.dropIn({ at: [25,34], radius: 2, cells: ENC.around([25,34], { n: 2, min: 4, max: 8 }), kind: 'g' });

// ---- end PT-052 ----

const layers = L.layers();

const VATS = [[27, 22, ['gaunt']], [41, 22, null], [41, 35, ['gaunt']], [27, 35, ['tollbearer']]];           // (the SW vat is the first: order by id = how a route meets them)
const MAP = {
  id: 'C1E3M07', name: 'The Spore Foundry', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#101c14', fogDensity: 0.013, sky: 'night', look: 'foundry' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  legend: { V: { type: 'prop', kind: 'vat' } },
  intro: { title: 'THE SPORE FOUNDRY', lines: ['The ship grows its bell-bearers here.', 'Do not wait for the vats to run dry.'] },
  outro: 'Next: the Cantor\'s Throat. What the Foundry makes, the Throat sings to.',
  objective: 'Break the four brood vats: the exit opens when they are dead',
  ...layers,
  secrets: [{ id: 'loose-panel', panel: [34, 42], cells: [[34, 43], [34, 44], [34, 45]] }],
  groups: VATS.map(([x, z]) => ({ name: 'vats', rect: [x, z, x, z] })),
  entities: [
    { type: 'exit', at: [34, 5], locked: true, dest: 'next' },
    ...VATS.map(([x, z, spawns]) => ({ type: 'enemy', kind: 'vat', at: [x, z], group: 'vats', facing: 'south', ...(spawns ? { spawns } : {}) })),
  ],
  messages: [
    { id: 'start', at: [5, 28], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Choir grows what it wants more of here. I\'m reading four vats on a ring round a furnace. Break them and the way out opens.' },
    { id: 'hall', at: [20, 28], radius: 2.5, speaker: 'INES', text: 'It\'s a ring of floor round a furnace. The vats are on stilts at the four corners, and every one of them is breathing. Don\'t stand where they can see you and wait.' },
    { id: 'vat', at: [26, 31], radius: 4, speaker: 'HULL', text: 'The dome swells, then something drops out of the spout. Kill the vat and it stops. What it has already made stays made.' },
    { id: 'troughs', at: [34, 38], radius: 4, speaker: 'INES', text: 'Slag in the troughs. It burns. The pillars are cover from the vats, and the floor between them is yours.' },
    { id: 'panel', at: [34, 40], radius: 2, speaker: 'HULL', text: 'One panel in the south wall rings hollow.' },
    { id: 'done', at: [34, 13], radius: 2, speaker: 'SIGNAL HOUSE', text: 'All four vats are dead. The north passage is open. The furnace is going cold.' },
  ],
  triggers: [
    { id: 'hall', when: 'enter', at: [22, 28], radius: 2.5, do: [{ objective: 'Break the four vats on the ring: the exit is north and opens when they are dead' }] },
    { id: 'foundry-cold', when: 'dead:vats', do: [{ exit: { set: 'unlock' } }, { objective: 'The vats are dead. The exit is open: north' }, { shake: 2 }, { message: 'done' }] },
  ],
  quality: { enemies: [14, 60], botSeconds: [50, 800], mechanics: ['triggers', 'secret'], skins: 4, enemyKinds: { vat: 4, tollbearer: 8, gaunt: 4, bellhand: 2, sexton: 1 },
    scaleClass: 'COMPRESSION', tallReason: 'the casting hall is the episode\'s one named foundry: 7 m to the vault because the vats stand 4.9 m tall',
    introduces: 'SPAWNER DENIAL: four brood vats on a ring round a furnace swell and birth Gaunts and Tollbearers for as long as they live; the exit is locked until they are dead, so the only answer is to break them while the ring fights back' },
};

// ---- PT-025: fed by the dead (src/engine/drops.js): the supply station at the west mouth keeps its boxes; a vat's brood and the vats never drop, the rest of the hall does ----
MAP.drops = { scale: 1.35, keep: [[23, 26, 24, 30]] };

// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C1E3M07', lane: [...(laneOf('C1E3M07') ?? [])], keep: [], plan: [{"from":"tollbearer","to":"bellhand","pick":"spread","n":2}] };
ENC.apply(MAP);

export default MAP;
