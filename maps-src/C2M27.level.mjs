// C2M27 FAULT LINE (Campaign 2, Act D; design/ACTD.md section 5). SET-PIECE, threat 7.
// A RIFT: a crack running west to east across the whole map, thirty metres wide, open to a black sky with a copper glow welling up out of it; a road along its north lip and one along its south, two metres above a shelf at the bottom, joined by bridges. The world answering the
// loss of the beat. The verb is run the line: a FRONT of falling stones starts at the west end three-quarters of a minute in and advances along both roads at a metre a second (a strip of the road falls every twelve seconds, three times, and the view shakes before it begins); a stretch it has
// passed is a kill zone. The north road is broken at the middle: the way is down the first bridge (it SINKS once you have crossed: a stair climbs out of the pit on the far side), along the south road, up the second bridge (it sinks too) and on along the north road to the far lip.
// There a lever (lit by the rift's glow, named from the first bridge) unlocks the exit. A third bridge in the east is an optional way to the south road's cache. A hollow in the north wall of the first stretch holds a cache. Drop-fed ammunition.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';

const W = 128, H = 44, L = new Level(W, H, { fill: 'λ' }); L.usedHeights = true;
const ROAD = 'Λ', DECK = 'Μ', SHELF = 'Λ', WALL = 'λ', BASALT = '%', ROAD_H = 4;
const NZ0 = 4, NZ1 = 12, RZ0 = 13, RZ1 = 27, SZ0 = 28, SZ1 = 36;
// the roads, the rift (a walkable shelf), the stairs out of it at the two ends
for (let z = NZ0; z <= NZ1; z++) for (let x = 4; x <= 123; x++) setCell(L, x, z, ROAD, ROAD_H);
for (let z = SZ0; z <= SZ1; z++) for (let x = 4; x <= 123; x++) setCell(L, x, z, ROAD, ROAD_H);
for (let z = RZ0; z <= RZ1; z++) for (let x = 4; x <= 123; x++) setCell(L, x, z, SHELF, 0);
for (let z = SZ0; z <= SZ1; z++) for (let x = 4; x <= 123; x++) L.g[z][x] = 'Ι';                                                    // the south road is a different stone
for (const [x0, x1] of [[6, 8], [118, 120]]) for (let k = 0; k < 3; k++) for (let x = x0; x <= x1; x++) { setCell(L, x, RZ0 + k, SHELF, 3 - k); setCell(L, x, RZ1 - k, SHELF, 3 - k); }       // four stairs out of the rift, at both ends
// the north road is broken in the middle: a stretch of the rift's own floor, with no way along it for the player (a wall of fallen rock across the road)
for (let z = NZ0; z <= NZ1; z++) for (let x = 64; x <= 70; x++) setCell(L, x, z, WALL, 0);
for (let z = SZ0; z <= SZ1; z++) for (let x = 86; x <= 92; x++) setCell(L, x, z, WALL, 0);
// the bridges: the first (x 38..40) and the second (x 78..80) sink once crossed; the third (x 106..108) is the optional one to the south road's cache
const sectors = [], triggers = [];
const bridge = (id, x, from, sinkAtZ) => {
  const cells = []; for (let z = RZ0; z <= RZ1; z++) for (let dx = 0; dx <= 2; dx++) { cells.push([x + dx, z]); setCell(L, x + dx, z, DECK, 0); }
  // the far end: a stair out of the pit once the deck has sunk
  if (from === 'north') for (let k = 0; k < 3; k++) for (let dx = 0; dx <= 2; dx++) setCell(L, x + dx, RZ1 - 2 + k, SHELF, 2 + k - 0);
  else for (let k = 0; k < 3; k++) for (let dx = 0; dx <= 2; dx++) setCell(L, x + dx, RZ0 + 2 - k, SHELF, 2 + k - 0);
  sectors.push({ id, cells, low: 0.5, high: 2, speed: 1.5, start: 'high' });
  triggers.push({ id: 'warn-' + id, when: 'enter', at: [x + 1, from === 'north' ? RZ0 + 3 : RZ1 - 3], radius: 2.5, do: [{ tremor: 0.6 }] }, { id: 'sink-' + id, when: 'enter', at: [x + 1, sinkAtZ], radius: 2.5, do: [{ sector: { id, to: 'low' } }, { tremor: 1 }] });
};
bridge('bridge1', 38, 'north', SZ0 + 2); bridge('bridge2', 78, 'south', NZ1 - 2); bridge('bridge3', 106, 'north', SZ0 + 2);
// the front: a strip of both roads falls every twelve seconds, three times, from the west end (a metre a second); the view shakes before every other one
const loads = [];
const hasFloor = (r) => { for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) if (L.g[z][x] === ROAD || L.g[z][x] === 'Ι') return true; return false; };
for (let k = 0; k < 20; k++) { const x0 = 4 + 6 * k, x1 = Math.min(123, x0 + 5); const nr = [x0, NZ0, x1, NZ1], sr = [x0, SZ0, x1, SZ1]; if (hasFloor(nr)) loads.push({ rect: nr, period: 6, start: 45 + 12 * k, count: 3, ...(k % 2 === 0 ? { tremor: 0.5 } : {}) }); if (hasFloor(sr)) loads.push({ rect: sr, period: 6, start: 45 + 12 * k, count: 3 }); }
// the far lip: the lever on the north wall of the north road, near the east end; the exit is locked until it is thrown
const LEVER = { at: [114, NZ0], wall: 'north' }, EXIT = [122, 8];
// the secret: a seam in the wall of the north road in the first stretch
const SEC = { panel: [20, NZ0 - 1], cells: [] };
for (let z = NZ0 - 3; z <= NZ0 - 2; z++) for (let x = 19; x <= 21; x++) { setCell(L, x, z, ROAD, ROAD_H); SEC.cells.push([x, z]); }
L.g[SEC.panel[1]][SEC.panel[0]] = 'S'; L.ht[SEC.panel[1]][SEC.panel[0]] = ROAD_H;
// the walls beside the roads are basalt in stripes
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (L.g[z][x] === WALL) { let t = false; for (let dz = -1; dz <= 1 && !t; dz++) for (let dx = -1; dx <= 1; dx++) if ('ΛΜΙ'.includes(L.g[z + dz]?.[x + dx] ?? '')) { t = true; break; } if (t && (x + z) % 3 === 0) L.g[z][x] = BASALT; }
// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; L.put(6, 8, '@'); P.reserve(6, 8);
for (let x = 10; x <= 120; x += 12) { PR('lamppost', x, NZ0 + 1); PR('lamppost', x + 6, SZ1 - 1); }
PR('lamppost', LEVER.at[0] - 1, LEVER.at[1] + 1); PR('lamppost', LEVER.at[0] + 1, LEVER.at[1] + 1); PR('lantern', LEVER.at[0], LEVER.at[1] + 2);
for (const x of [14, 28, 52, 74, 94, 100]) { PR('pillar', x, 8); PR('pillar', x + 3, 32); }
const R = (list, kind, extra = {}) => list.forEach(([x, z]) => E(kind, x, z, extra));
R([[16, 7], [30, 10], [46, 8], [58, 6]], 'tollbearer'); R([[22, 6], [52, 10]], 'gaunt'); R([[34, 8], [60, 9]], 'zealot'); R([[42, 6]], 'chorister');
R([[48, 32], [58, 30], [70, 33], [82, 31]], 'tollbearer'); R([[54, 34], [66, 30], [76, 34]], 'gaunt'); R([[62, 32]], 'zealot'); R([[72, 29]], 'chorister');
R([[84, 8], [96, 10], [108, 7], [116, 9]], 'tollbearer'); R([[88, 6], [102, 11], [112, 6]], 'gaunt'); R([[92, 9], [110, 10]], 'zealot'); R([[100, 8]], 'chorister');
R([[40, 20], [70, 20], [100, 20]], 'gill'); R([[96, 31], [112, 33]], 'bellhand'); E('bulwark', 104, 9, { facing: 0 }); E('sexton', 118, 32); R([[110, 32], [120, 30]], 'zealot');
for (const [x, z, k] of [[10, 8, 'health_small'], [24, 8, 'health_small'], [38, 9, 'health_small'], [48, 31, 'health_large'], [60, 31, 'health_small'], [72, 31, 'health_small'], [84, 9, 'health_large'], [98, 9, 'health_small'], [108, 8, 'health_large'], [114, 9, 'health_small'], [120, 8, 'health_small']]) PK(k, x, z);
for (const [x, z] of [[30, 8], [70, 31], [110, 9]]) PK('armor_vest', x, z);
SEC.cells.slice(0, 5).forEach(([x, z], i) => PK(['armor_vest', 'ammo_rocket', 'ammo_rocket', 'health_large', 'ammo_round'][i], x, z));
PK('armor_vest', 112, 32); PK('health_large', 116, 31); PK('ammo_rocket', 114, 33);                                                  // the cache of the south road's east end (the third bridge)
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [40,30], radius: 2, cells: ENC.around([40,30], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [59,31], radius: 2, cells: ENC.around([59,31], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M27', name: 'Fault Line', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { look: 'fault', sky: 'root', fog: '#20100a', fogDensity: 0.008 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 30, rivet: 200, bolt: 18, cell: 50, round: 50, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'FAULT LINE', lines: ['The stone has cracked from end to end, and the crack is lit from below.', 'Three-quarters of a minute from now the road begins to fall, from the west.'] },
  outro: 'The last lip held. Behind it the front went on along the road to the end of the world and fell into the glow without a sound, and the glow went on.',
  objective: 'Run east, ahead of the fall. The way is down the first bridge, along the south road, up the second bridge, and on to the lever on the far lip',
  ...L.layers(),
  secrets: [{ id: 'seam', panel: SEC.panel, cells: SEC.cells }],
  groups: [], sectors, loads,
  entities: [...P.ents,
    { type: 'switch', id: 'far-lip', at: LEVER.at, wall: LEVER.wall, once: true, do: [{ exit: { set: 'unlock' } }, { message: 'far-lip' }, { objective: 'The far lip is held. The exit is at the east end of the north road' }] },
    { type: 'exit', at: EXIT, dest: 'next', locked: true }],
  scenery: [{ kind: 'shaft', at: [64, 20], y: -13, scale: 2 }],
  messages: [
    { id: 'start', at: [6, 8], radius: 5, speaker: 'INES', text: 'The stone is cold, and from the crack comes a light the colour of a forge. The whole country has cracked along one line, and the crack is as wide as a harbour mouth.' },
    { id: 'front', at: [14, 8], radius: 5, speaker: 'HULL', text: 'Forty-five seconds after you arrive the road starts to fall from the west end, a strip at a time, a metre a second. A strip falls three times; the view shakes first. Stay ahead.' },
    { id: 'bridge', at: [38, 10], radius: 5, speaker: 'HULL', text: 'The north road is broken in the middle. The first bridge is the way across: it sinks half a metre after you cross, and a stair on the far side climbs out of the pit.' },
    { id: 'south', at: [50, 31], radius: 5, speaker: 'INES', text: 'The south road goes on in the same grey and the same cold. Somebody has laid lamps along it. The stone that is going has not reached this far yet.' },
    { id: 'lip', at: [96, 9], radius: 5, speaker: 'HULL', text: 'The lever on the far lip is on the north wall of the road, under two lamps and a lantern. It holds the lip. The exit is locked until it is thrown.' },
    { id: 'far-lip', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The lip is held. The exit has come unlocked at the east end of the road.' },
    { id: 'exit', at: [118, 8], radius: 4, speaker: 'HULL', text: 'The exit is locked. The lever on the north wall of this road, near the far lip, unlocks it.' },
    { id: 'hollow', at: [20, 7], radius: 3, speaker: 'HULL', text: 'The wall of the north road rings hollow in one short run, in the first stretch. There is a seam.' },
    { id: 'cache', at: SEC.cells[4], radius: 3, speaker: 'A SILENT (NOTE)', text: 'I put this in the wall the winter the crack began. It was a hand wide then. It was a hand wide for a very long time.' },
  ],
  triggers: [...triggers,
    { id: 'beat', when: 'enter', at: [40, 8], radius: 5, do: [{ objective: 'The first bridge is ahead: down it and across the rift, ahead of the front' }] },
    { id: 'south-road', when: 'enter', at: [80, 31], radius: 6, do: [{ objective: 'The second bridge, then the lever on the far lip of the north road' }] },
  ],
  quality: { enemies: [20, 80], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 5,
    enemyKinds: { tollbearer: 8, gaunt: 6, zealot: 5, chorister: 3, gill: 2, bellhand: 1, bulwark: 1, sexton: 1 },
    scaleClass: 'SET-PIECE', reason: 'the place is a crack in the world seen under an open sky: a long run along two roads and over bridges, ahead of a front of stones', introduces: 'the falling front: a strip of the road falls every twelve seconds from the west end, a metre a second, and what it has passed is a kill zone' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M27: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'loads', loads.length);
const Z = (x, z) => [x, z];
const mid = (x) => [x, 8];
export const waypoints = {
  main: [[6, 8, 0], Z(14, 7), Z(24, 8), Z(32, 8), Z(39, 11), Z(39, 18), Z(39, 24), [39, 27, 0], Z(40, 31), Z(48, 31), Z(58, 31), Z(66, 31), Z(76, 31), Z(79, 29), Z(79, 22), Z(79, 16), [79, 13, 0], Z(80, 9), Z(88, 8), Z(96, 9), Z(106, 8), { op: 'switch', id: 'far-lip' }, Z(114, 9), Z(120, 8), [EXIT[0], EXIT[1], 0]],
  secret: [[6, 8, 0], Z(14, 7), Z(20, 7), { op: 'use', at: SEC.panel }, [20, 2, 0], Z(20, 7), Z(24, 8), Z(32, 8), Z(39, 11), Z(39, 18), Z(39, 24), [39, 27, 0], Z(40, 31), Z(48, 31), Z(58, 31), Z(66, 31), Z(76, 31), Z(79, 29), Z(79, 22), Z(79, 16), [79, 13, 0], Z(80, 9), Z(88, 8), Z(96, 9), Z(106, 8), { op: 'switch', id: 'far-lip' }, Z(114, 9), Z(120, 8), [EXIT[0], EXIT[1], 0]],
};
void mid;
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M27', lane: [...(laneOf('C2M27') ?? [])], keep: [], plan: [] };
ENC.apply(MAP);

// ---- PT-070 unless (the story pass): reminders that are silent once the thing they remind of has happened
for (const [mid, unless] of Object.entries({ "exit": ["msg:far-lip"] })) MAP.messages.find((m) => m.id === mid).unless = unless;
// ---- end PT-070 unless
export default MAP;
