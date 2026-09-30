// C1E1M05 LAMPLIGHTER HILL: vertical switchback streets, ranged pressure from above.
// New ideas: real height (five terraces, 10 m of climb; cliffs you can drop off but not climb), the funicular car (a moving floor you call with a lever), the Sexton (raises the fallen: kill it first),
//            a sealed gate that only the summit beacon opens. The survivors' lamps are dressing: they show the road, they carry no signal.
// Route: harbour road -> stairs to terrace 1 -> the funicular car (the ONLY way from terrace 1 to 2) -> stairs west (T3) -> stairs east (T4) -> stairs west (summit) -> light the beacon -> the gate opens -> exit.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(56, 60);
const TERR = [{ z0: 52, z1: 57, h: 0, f: ':' }, { z0: 43, z1: 51, h: 4, f: 's' }, { z0: 34, z1: 42, h: 8, f: ':' }, { z0: 25, z1: 33, h: 12, f: 's' }, { z0: 16, z1: 24, h: 16, f: ':' }, { z0: 5, z1: 15, h: 20, f: 'p' }];
for (const t of TERR) { L.room([3, t.z0, 52, t.z1], { floor: t.f, wall: 'B' }); L.height([3, t.z0, 52, t.z1], t.h); }
// switchback stairs: 4 steps (2 m) cut into the cliff, alternating west / east
L.stairs([4, 48, 6, 51], 'z', 4, 1); L.stairs([4, 30, 6, 33], 'z', 12, 9); L.stairs([47, 21, 49, 24], 'z', 16, 13); L.stairs([4, 12, 6, 15], 'z', 20, 17);
// the funicular shaft between terraces 1 and 2: iron walls either side, a grated car that rides 2 m
L.wall([25, 39, 25, 42], 'I'); L.wall([28, 39, 28, 42], 'I'); L.rect([26, 39, 27, 42], 'p'); L.height([26, 39, 27, 42], 4);
// (terrace 1 -> 2 has NO stairs: the funicular car is the way up; a player who drops back down calls it with the lever at its foot)
// houses: solid blocks for cover and sight lines, two or three to a terrace
for (const r of [[12, 45, 17, 47], [32, 45, 38, 47], [13, 36, 19, 38], [34, 36, 41, 38], [12, 27, 18, 29], [31, 27, 37, 29], [42, 27, 47, 29], [13, 18, 20, 20], [33, 18, 40, 20], [14, 8, 22, 11], [30, 8, 36, 10]]) L.wall(r, 'W');
L.wall([44, 6, 52, 6], 'C');

// ---- objects -------------------------------------------------------------------------------------------------------------
L.put(4, 55, '@');
// lanterns light the switchbacks (the survivors' lamps), lamp posts on the harbour road
L.putAll('n', [[8, 51], [45, 42], [8, 33], [45, 24], [8, 15], [20, 49], [40, 40], [22, 31], [42, 22], [30, 13], [26, 53], [38, 55]]);
// terrace 0: the harbour road
L.putAll('t', [[18, 54], [30, 55]]); L.putAll('h', [[10, 55]]); L.putAll('a', [[14, 54]]); L.putAll('C', [[22, 54], [34, 54]]); L.putAll('o', [[24, 55], [40, 54]]);
// terrace 1
L.putAll('t', [[10, 45], [22, 46], [34, 44], [42, 49], [20, 50]]); L.putAll('g', [[16, 49], [34, 50], [44, 45]]); L.putAll('e', [[9, 47], [40, 44]]); L.putAll('r', [[24, 50], [30, 46]]); L.putAll('h', [[14, 44], [36, 50]]); L.put(46, 47, 'H'); L.put(24, 44, 'H'); L.put(28, 44, 'v');
L.putAll('C', [[24, 45], [40, 48], [18, 51]]); L.putAll('o', [[27, 50], [44, 49]]);
// the funicular levers: inside the car (rides it up) and on terrace 2 (calls it back down)
// terrace 2: Bellhands on the cliff edge over terrace 1
L.putAll('b', [[16, 41], [22, 41], [36, 41]]); L.putAll('t', [[10, 37], [44, 37], [46, 40]]); L.putAll('g', [[8, 40], [43, 36]]); L.putAll('h', [[24, 36], [31, 38]]); L.putAll('r', [[9, 36], [45, 35], [30, 35]]); L.putAll('e', [[18, 35], [42, 41]]); L.put(50, 36, 'v'); L.put(20, 35, 'a');
L.putAll('C', [[22, 38], [32, 39]]); L.putAll('o', [[26, 37], [43, 39]]);
// terrace 3
L.putAll('t', [[9, 30], [24, 31], [40, 31], [50, 30]]); L.putAll('g', [[20, 27], [40, 26]]); L.putAll('b', [[10, 26], [25, 26], [44, 26]]); L.put(30, 29, 'x');
L.putAll('r', [[11, 29], [26, 26], [48, 31]]); L.putAll('e', [[20, 31], [46, 30]]); L.putAll('h', [[38, 28]]); L.put(7, 28, 'H'); L.put(7, 31, 'v'); L.putAll('H', [[51, 27]]); L.putAll('a', [[15, 31], [35, 26]]);
// terrace 4
L.putAll('t', [[10, 21], [22, 22], [30, 23], [44, 19], [50, 22]]); L.putAll('g', [[18, 17], [38, 17], [48, 24]]); L.putAll('b', [[10, 17], [24, 17], [44, 17]]); L.put(26, 21, 'x');
L.putAll('r', [[8, 19], [24, 17], [46, 21]]); L.putAll('e', [[16, 21], [40, 22]]); L.putAll('h', [[9, 18], [32, 21], [50, 18]]); L.put(48, 17, 'v'); L.put(12, 17, 'H'); L.put(47, 19, 'H'); L.putAll('a', [[21, 19], [42, 24]]);
// the summit: three Tollbearers and two Bellhands around the beacon, the sealed gate at the east end
L.putAll('t', [[16, 13], [26, 12], [38, 13]]); L.putAll('b', [[24, 9], [40, 8]]); L.put(32, 12, 'x'); L.putAll('r', [[10, 12], [28, 7], [44, 10]]); L.putAll('e', [[20, 13], [34, 12]]); L.putAll('H', [[48, 12], [8, 8]]); L.putAll('h', [[46, 8]]); L.put(50, 8, 'n');

const layers = L.layers();
const carCells = [[26, 39], [27, 39], [26, 40], [27, 40], [26, 41], [27, 41], [26, 42], [27, 42]];

export default {
  id: 'C1E1M05', name: 'Lamplighter Hill', version: 1, ceilingHeight: 4.2, par: { time: 900 },
  atmosphere: { fog: '#30303e', fogDensity: 0.011, sky: 'overcast' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 8, shell: 12, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'LAMPLIGHTER HILL', lines: ['Somebody up there keeps the lamps lit.', 'Follow them to the beacon.'] },
  outro: 'Next: the Ferry Terminal. Whatever the town could not carry, it left there.',
  objective: 'Climb the hill. Stairs on the terraces, or take the funicular car',
  ...layers,
  groups: [{ name: 'ambush-t2', rect: [24, 34, 32, 37] }],
  sectors: [{ id: 'car', cells: carCells, low: 2, high: 4, speed: 0.8, start: 'low' }],
  entities: [
    { type: 'exit', at: [51, 10], locked: true, dest: 'next' },
    { type: 'switch', id: 'car-up', at: [26, 42], wall: 'west', once: false, do: [{ sector: { id: 'car', to: 'high' } }, { objective: 'Riding up. Bellhands will be waiting on the top terrace' }] },
    { type: 'switch', id: 'car-down', at: [24, 41], wall: 'east', once: false, do: [{ sector: { id: 'car', to: 'low' } }] },
    { type: 'switch', id: 'car-call', at: [25, 43], wall: 'north', once: false, do: [{ sector: { id: 'car', to: 'low' } }] },
    { type: 'switch', id: 'beacon', at: [46, 7], wall: 'north', do: [{ exit: { set: 'unlock' } }, { objective: 'The beacon burns green. The gate is open: east end of the summit' }, { shake: 1 }] },
  ],
  messages: [
    { id: 'start', at: [4, 55], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the hill. There are people at the top: the lamps along the switchbacks are theirs. Get to the summit beacon.' },
    { id: 'lamp', at: [6, 49], radius: 3, speaker: 'SURVIVOR (LAMP)', text: 'Lamps all the way up: that is us, showing you the road. Watch the cliff edges: they shoot down.' },
    { id: 'car', at: [26, 44], radius: 3, speaker: 'FUNICULAR PLACARD', text: 'Funicular. The only way up from terrace one to terrace two. Pull the lever on the car. If it is up, the call lever at its foot brings it down.' },
    { id: 'sexton', at: [30, 32], radius: 5, speaker: 'INES', text: 'That one is not fighting. It is waiting for something to fall. Kill it first, and quickly.' },
    { id: 'high', at: [26, 21], radius: 5, speaker: 'SURVIVOR (LAMP)', text: 'Bellhands on the cliff edge over the next terrace! Use the houses; go round, not through.' },
    { id: 'summit', at: [40, 12], radius: 5, speaker: 'SURVIVOR (LAMP)', text: 'You made it up! Light the beacon: the lever on the north wall of the summit. We will open the gate.' },
    { id: 'gate', at: [50, 10], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'Ferry Terminal is over the crest and down. Whatever the town could not carry, it left there.' },
  ],
  triggers: [
    { id: 'lift-top', when: 'sector:car:high', do: [{ spawn: { kind: 'gaunt', at: [24, 36], group: 'ambush-t2', facing: 'east' } }, { spawn: { kind: 'gaunt', at: [30, 36], group: 'ambush-t2', facing: 'west' } }, { shake: 0.8 }, { objective: 'Climb on: the next stairs are at the west end (terrace three)' }] },
    { id: 'summit', when: 'enter', at: [40, 10], radius: 6, do: [{ objective: 'Light the beacon: the lever on the summit north wall (east)' }] },
  ],
  quality: { enemies: [40, 66], botSeconds: [110, 540], mechanics: ['heights', 'switches', 'sectors', 'triggers'], skins: 6, enemyKinds: { sexton: 2, bellhand: 8 } },
};
