// C2M20 VEIN RAIL (Campaign 2, Act C; design/ACTC.md section 5, the ride). SET-PIECE, threat 8.
// A LOOP: a rail ring round a void with three STATIONS (south, west, east) and, in the middle of the ring, a HUB island on a pier that meets the rail on its north side. Two CARS run the ring clockwise (one lap about a minute and a half, eight seconds'
// dwell at every stop, the second car half a cycle behind the first): a deck eight metres square on a clock, the only floor over the drop. The rail is a viaduct over the void; the stations are cuttings with their docks on a ledge; the heights climb
// from the south station (0) by the west (+2 m) and the east (+3 m) to the hub (+6 m). The verb is ride and shoot: the car carries you, you fire from it, the stations fire back, and Gills chase the viaduct. A fall off the deck is the old void rule
// (hurt, back on the last dock, never killed).
// The way on: the HUB RELAY, a lever on the island that can only be reached by riding (south station -> west -> hub); the exit is the east station (hub -> east), locked until the relay is thrown. The hub is lit and in sight from the first dock;
// the objective says ride to the hub. A hollow behind the west station holds a cache. Drop-fed ammunition.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';
import { makeCar } from '../src/engine/cars.js';

const W = 128, H = 96, L = new Level(W, H, { fill: 'δ' }); L.usedHeights = true; L.usedCeil = true;
const VOID = '_', WALL = 'δ', RIB = 'V', BONE = 'γ';
const S_FLOOR = 'Α', W_FLOOR = 'Β', E_FLOOR = 'Η', HUB_FLOOR = 'Β';
// the rail: a closed polyline of deck centres (cell coordinates; integers: the deck is 4 x 4 cells, so its edges lie on cell edges), clockwise, with the height of the deck in metres at each vertex
const PATH = [[64, 70, 0], [34, 70, 1], [34, 48, 2], [34, 26, 4], [64, 26, 6], [94, 26, 5], [94, 48, 4], [94, 70, 2]];
const STOPS = [0, 2, 4, 6];                                                                                         // south, west, the hub's pier, east
const car = makeCar({ id: 'a', size: [4, 4], path: PATH, stops: STOPS, speed: 10, dwell: 8 }, 2), CYCLE = car.cycle;
const cars = [{ id: 'a', size: [4, 4], path: PATH, stops: STOPS, speed: 10, dwell: 8, phase: 0 }, { id: 'b', size: [4, 4], path: PATH, stops: STOPS, speed: 10, dwell: 8, phase: Math.round(CYCLE / 2) }];
// ---- the void: the band the decks sweep (4 cells wide round the path) and the whole inside of the ring -----------------------------------------------------------------------------------------------------------------------------------------------
const seg = (a, b, f) => { const [x0, z0] = a, [x1, z1] = b; for (let z = Math.min(z0, z1) - 2; z < Math.max(z0, z1) + 2; z++) for (let x = Math.min(x0, x1) - 2; x < Math.max(x0, x1) + 2; x++) f(x, z); };
for (let i = 0; i < PATH.length; i++) seg(PATH[i], PATH[(i + 1) % PATH.length], (x, z) => setCell(L, x, z, VOID, 0));
for (let z = 28; z < 68; z++) for (let x = 36; x < 92; x++) setCell(L, x, z, VOID, 0);                                  // the drop inside the ring
// ---- the stations: a room beside each stop, its dock the row or column that touches the sweep ---------------------------------------------------------------------------------------------------------------------------------------------------
const room = (r, ch, h, wall = WALL) => { for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) setCell(L, x, z, ch, h); for (let z = r[1] - 1; z <= r[3] + 1; z++) for (let x = r[0] - 1; x <= r[2] + 1; x++) if (!(x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) && L.g[z][x] === WALL) L.g[z][x] = wall; };
const SR = [48, 72, 80, 88], WR = [12, 38, 31, 58], ER = [96, 38, 115, 58];                                              // south (the start), west, east (the exit)
room(SR, S_FLOOR, 0, BONE); room(WR, W_FLOOR, 4, BONE); room(ER, E_FLOOR, 8, BONE);
// ledges for the singers: a metre and a half up, a half-step stair at each end
const ledge = (r, h) => { for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) setCell(L, x, z, L.g[z][x], h); };
for (const [x0, x1, z, base] of [[100, 112, 39, 8], [100, 112, 57, 8]]) { for (let x = x0; x <= x1; x++) { const k = Math.min(x - x0, x1 - x, 3); setCell(L, x, z, E_FLOOR, base + k); setCell(L, x, z + (z < 48 ? 1 : -1), E_FLOOR, base + Math.max(0, k - 1)); } }
for (const [x0, x1, z, base] of [[16, 28, 39, 4], [16, 28, 57, 4]]) { for (let x = x0; x <= x1; x++) { const k = Math.min(x - x0, x1 - x, 3); setCell(L, x, z, W_FLOOR, base + k); setCell(L, x, z + (z < 48 ? 1 : -1), W_FLOOR, base + Math.max(0, k - 1)); } }
// ---- the hub: an island on a pier that meets the rail at the north ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let z = 36; z <= 56; z++) for (let x = 54; x <= 73; x++) setCell(L, x, z, HUB_FLOOR, 12);
for (let z = 28; z <= 35; z++) for (let x = 62; x <= 65; x++) setCell(L, x, z, HUB_FLOOR, 12);                         // the pier: its end is the dock of the hub stop (the sweep ends at row 27)
for (let z = 46; z <= 47; z++) for (let x = 62; x <= 65; x++) L.g[z][x] = 'ε';                                       // the relay stack: a wall of copper with the lever on its south face
// ---- the secret: a cache behind the west room's west wall -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [11, 48], cells: [] };
for (let z = 47; z <= 49; z++) for (let x = 7; x <= 10; x++) { setCell(L, x, z, W_FLOOR, 4); SEC.cells.push([x, z]); }
setCell(L, 11, 48, 'S', 4);
// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; L.put(64, 86, '@'); P.reserve(64, 86);
for (const [x, z] of [[50, 74], [78, 74], [50, 86], [78, 86], [64, 74], [14, 40], [29, 40], [14, 56], [29, 56], [98, 40], [113, 40], [98, 56], [113, 56], [62, 56], [66, 56], [56, 38], [72, 38], [56, 54], [72, 54], [60, 48], [67, 48], [62, 32], [65, 30]]) PR('lamppost', x, z);
for (const [x, z] of [[56, 74], [72, 80], [18, 44], [26, 52], [104, 44], [108, 52], [60, 42], [68, 52]]) PR('pillar', x, z);
const R = (list, kind, extra = {}) => list.forEach(([x, z]) => E(kind, x, z, extra));
R([[50, 86], [78, 86], [48, 80]], 'gaunt'); R([[78, 80]], 'tollbearer');
R([[16, 42], [28, 54]], 'tollbearer', { variant: 'hived' }); R([[24, 40], [24, 56]], 'chorister'); R([[20, 46]], 'zealot');
R([[58, 44], [70, 44], [60, 52], [68, 50], [58, 48], [70, 54]], 'tollbearer'); R([[56, 42], [72, 46]], 'gaunt'); R([[56, 50]], 'bellhand'); R([[60, 54]], 'tollbearer', { variant: 'hived' }); R([[66, 40]], 'zealot'); E('bulwark', 64, 52, { facing: 0 }); E('sexton', 58, 38);
R([[106, 40], [112, 56]], 'chorister'); R([[102, 46], [108, 50]], 'tollbearer', { variant: 'hived' }); R([[110, 52]], 'zealot'); R([[112, 46]], 'gaunt');
R([[30, 40], [30, 56], [31, 48], [97, 40], [97, 56], [97, 48], [56, 38], [72, 54], [62, 30]], 'gill');
for (const [x, z, k] of [[60, 80, 'health_small'], [64, 74, 'health_small'], [20, 46, 'health_large'], [24, 50, 'health_small'], [60, 46, 'health_large'], [66, 52, 'health_small'], [62, 31, 'health_small'], [104, 50, 'health_large'], [100, 48, 'health_large'], [98, 46, 'health_small'], [98, 50, 'health_small'], [108, 48, 'health_large']]) PK(k, x, z);
for (const [x, z] of [[62, 82], [28, 48], [96, 48]]) PK('armor_vest', x, z);
PK('armor_vest', 8, 47); PK('ammo_rocket', 9, 48); PK('ammo_rocket', 10, 49); PK('health_large', 8, 49); PK('ammo_round', 9, 47);
const EXIT = [114, 48];
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [65,44], radius: 2, cells: ENC.around([65,44], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [64,38], radius: 2, cells: ENC.around([64,38], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M20', name: 'Vein Rail', version: 1, ceilingHeight: 4.2, par: { time: 540 },
  atmosphere: { look: 'veins', sky: 'hive', beat: true, fog: '#2a1418', fogDensity: 0.008 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 24, rivet: 100, bolt: 18, cell: 50, round: 50, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'VEIN RAIL', lines: ['A rail round a drop, and two cars that never stop going round.', 'The island in the middle is the hub. The only way onto it is the car.'] },
  outro: 'The exit station is dark behind you. The rail runs on without a rider, round the drop, and the cars wait eight seconds at every stop, as if somebody were still getting on.',
  objective: 'Ride to the hub: the relay is on the island in the middle of the ring. A car stops at every station for eight seconds and the rim blinks before it leaves',
  ...L.layers(),
  secrets: [{ id: 'siding', panel: SEC.panel, cells: SEC.cells }],
  groups: [], cars,
  entities: [...P.ents,
    { type: 'switch', id: 'relay', at: [63, 48], wall: 'north', once: true, do: [{ exit: { set: 'unlock' } }, { message: 'relay' }, { objective: 'The hub relay is thrown. The exit is at the east station: ride there' }] },
    { type: 'exit', at: EXIT, dest: 'next', locked: true }],
  scenery: [{ kind: 'rails', at: [64, 6], y: 0, scale: 1.4 }],
  messages: [
    { id: 'start', at: [64, 84], radius: 6, speaker: 'INES', text: 'A rail goes round a drop and the cars go round the rail. In the middle of it there\'s an island with a copper stack on it and a lamp, and no bridge.' },
    { id: 'manifest', at: [64, 80], radius: 5, speaker: 'MANIFEST PLATE', text: 'CARS: 2. VOICES BORNE PER RUN: 31. RUNS TO THE HUB: 1 IN 4. The last line is a tally of runs, one stroke each. It does not stop at the edge of the plate.' },
    { id: 'rim', at: [64, 74], radius: 5, speaker: 'HULL', text: 'A car stops at each station for eight seconds. The rim of the deck blinks for the last two. The car stops where the rail stops.' },
    { id: 'hub', at: [64, 72], radius: 6, speaker: 'HULL', text: 'The hub is the third stop after this one. The relay is a lever on the south face of the copper stack, under two lamps.' },
    { id: 'viaduct', at: [24, 48], radius: 6, speaker: 'INES', text: 'The west station is a cutting with a ledge on each side. There are singers on the ledges. They are facing the rail.' },
    { id: 'pier', at: [63, 30], radius: 4, speaker: 'HULL', text: 'The pier is the only way off the car at the hub. The island has its own guard. The relay is on the south face of the copper stack.' },
    { id: 'relay', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The relay is thrown. The east station is the last stop before this one: the exit there has come unlocked.' },
    { id: 'exit', at: [112, 48], radius: 4, speaker: 'HULL', text: 'The exit is locked. The hub relay opens it, on the island in the middle of the ring.' },
    { id: 'hollow', at: [14, 48], radius: 3, speaker: 'HULL', text: 'The west wall of the west station rings hollow in one place. A line in the paint where a door has been.' },
    { id: 'cache', at: [8, 48], radius: 3, speaker: 'A SILENT (NOTE)', text: 'I rode this rail for a year with my hands over my ears. If you can read this, take the cases and do not wait for the second car.' },
  ],
  triggers: [
    { id: 'board', when: 'enter', at: [64, 82], radius: 6, do: [{ objective: 'Ride to the hub: south to west to the pier on the north side of the ring' }] },
    { id: 'west', when: 'enter', at: [22, 48], radius: 8, do: [{ objective: 'The west station. Stay on the rail: the hub is the next stop' }] },
  ],
  quality: { enemies: [30, 80], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6,
    enemyKinds: { gill: 8, chorister: 4, gaunt: 3, tollbearer: 6, zealot: 3, bellhand: 1 },
    scaleClass: 'SET-PIECE', reason: 'the place is a rail ring round a drop: the player rides a deck over open air, so the fights are in the open and at the docks', introduces: 'carriers: a deck on a clock that carries what stands on it, the only floor over the drop' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M20: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'cycle', CYCLE.toFixed(1), 's');
const D = (x, z) => [x, z];
export const waypoints = {
  main: [[64, 86, 0], D(64, 80), { op: 'ride', board: [64, 72], from: 0, to: 4, exit: [63, 29] }, D(64, 34), D(64, 40), D(64, 44), D(63, 49), { op: 'switch', id: 'relay' }, D(64, 40), D(64, 34), D(63, 30), { op: 'ride', board: [63, 28], from: 4, to: 6, exit: [96, 48] }, D(102, 48), D(110, 48), [EXIT[0], EXIT[1], 0]],
  secret: [[64, 86, 0], D(64, 80), { op: 'ride', board: [64, 72], from: 0, to: 2, exit: [31, 48] }, D(26, 48), D(14, 48), { op: 'use', at: SEC.panel }, [8, 48, 0], D(26, 48), { op: 'ride', board: [31, 48], from: 2, to: 4, exit: [63, 29] }, D(64, 34), D(64, 40), D(64, 44), D(63, 49), { op: 'switch', id: 'relay' }, D(64, 40), D(64, 34), D(63, 30), { op: 'ride', board: [63, 28], from: 4, to: 6, exit: [96, 48] }, D(102, 48), D(110, 48), [EXIT[0], EXIT[1], 0]],
};
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M20', lane: [...(laneOf('C2M20') ?? [])], keep: [], plan: [] };
ENC.apply(MAP);

// ---- PT-070 unless (the story pass): reminders that are silent once the thing they remind of has happened
for (const [mid, unless] of Object.entries({ "exit": ["msg:relay"] })) MAP.messages.find((m) => m.id === mid).unless = unless;
// ---- end PT-070 unless
export default MAP;
