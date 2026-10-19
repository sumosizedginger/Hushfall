// C2M19 BONE LOOM (Campaign 2, Act C; design/ACTC.md section 5). COMPRESSION, threat 7.
// A WEAVING HALL: three warp lanes (north-south) cross three weft lanes (east-west): nine CROSSINGS, each a roofed hall twelve cells across with a stump of the frame in its middle, joined by corridors fourteen cells long. The crossings stand at
// three heights (the corners +3 m, the edges +1 m, the middle one, under the great loom frame, at the bottom) so the corridors between them are ramps. Cradles hang from the roof over the crossings. The verb is threading the timing:
// the way to the cutting room (the north end, past the top crossing) is THREE BREATH GATES in a narrow passage, each opening for three seconds of six and one second behind the last, so a walker who goes as one opens is through all three;
// two corridors of the hall are CONVEYORS (one flips, one runs and rests), and a SHUTTLE (a load) crosses the south weft lane every bar. The WOVEN (pale Tollbearers) drop out of the cradles when the middle crossing is entered.
// The way on: the IRON KEY lies on the cutting table behind the three gates, lit and named; the exit door at the east end of the top weft lane is locked with it and says so. A hollow behind the loom frame holds a cache.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';

const W = 100, H = 100, L = new Level(W, H, { fill: 'γ' }); L.usedHeights = true; L.usedCeil = true;
const FLOOR = 'Γ', WALL = 'γ', FRAME = 'M', CUT = 'Δ', CUTW = 'δ';
const X0 = [18, 44, 70], Z0 = [26, 52, 78], CH = [[6, 2, 6], [2, 0, 2], [6, 2, 6]];                      // the crossings' corners and floor heights (half metres), [j][i]
const lidOf = (h, kind) => h + (kind === 'corner' ? 13 : kind === 'edge' ? 15 : kind === 'mid' ? 19 : 9);   // lids: floor + 4.5 m in a corridor, 6.5 / 7.5 in a crossing, 9.5 in the middle one
const kindOf = (i, j) => (i === 1 && j === 1 ? 'mid' : i === 1 || j === 1 ? 'edge' : 'corner');
const floorCell = (x, z, h, ce) => setCell(L, x, z, FLOOR, h, ce);
// ---- the nine crossings and their stumps ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
  const h = CH[j][i], k = kindOf(i, j);
  for (let z = Z0[j]; z < Z0[j] + 12; z++) for (let x = X0[i]; x < X0[i] + 12; x++) floorCell(x, z, h, lidOf(h, k));
  const s = k === 'mid' ? 3 : 2;                                                                                       // the frame in the middle: the big one (6 x 6), or a stump (4 x 4)
  for (let z = Z0[j] + 6 - s; z < Z0[j] + 6 + s; z++) for (let x = X0[i] + 6 - s; x < X0[i] + 6 + s; x++) setCell(L, x, z, k === 'mid' ? FRAME : WALL, h);
}
// ---- the corridors, four wide, with a flat of three cells at each end and a ramp between ---------------------------------------------------------------------------------------------------------------------------------------------------
const ramp = (a, b, k) => a + Math.round((b - a) * Math.min(1, Math.max(0, (k - 3) / 7)));
for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) for (let k = 0; k < 14; k++) for (let o = 4; o < 8; o++) { const h = ramp(CH[j][i], CH[j][i + 1], k); floorCell(X0[i] + 12 + k, Z0[j] + o, h, h + 9); }          // east-west
for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) for (let k = 0; k < 14; k++) for (let o = 4; o < 8; o++) { const h = ramp(CH[j][i], CH[j + 1][i], k); floorCell(X0[i] + o, Z0[j] + 12 + k, h, h + 9); }          // north-south
// ---- the start (west of the bottom-left crossing), the exit (east of the top-right one), the cutting room (north of the top-middle one) -----------------------------------------------------------------------------------------------
for (let k = 0; k < 14; k++) for (let o = 4; o < 8; o++) setCell(L, 4 + k, Z0[2] + o, 'Ζ', 6, 15);
for (let k = 0; k < 14; k++) for (let o = 4; o < 8; o++) setCell(L, X0[2] + 12 + k, Z0[0] + o, 'Ζ', 6, 15);
for (let z = 12; z < 26; z++) for (let x = 48; x < 52; x++) floorCell(x, z, 2, 11);
for (let z = 4; z < 12; z++) for (let x = 40; x < 60; x++) setCell(L, x, z, CUT, 2, 15);
for (let z = 4; z < 12; z++) for (let x = 39; x <= 60; x++) if (x === 39 || x === 60) L.g[z][x] = CUTW;
for (let x = 39; x <= 60; x++) { L.g[3][x] = CUTW; L.g[12][x] = L.g[12][x] === WALL ? CUTW : L.g[12][x]; }
// ---- gates: a wall row across a corridor with a single doorway -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const gateRow = (x0, z0, axis, door) => { for (let o = 0; o < 4; o++) { const x = axis === 'x' ? x0 + o : x0, z = axis === 'x' ? z0 : z0 + o; if (o === 2) door(x, z); else setCell(L, x, z, WALL, 2); } };
// three breath gates in the passage to the cutting room, one second behind each other: a walker who goes as one opens is through all three
[[22, 0], [18, 5], [14, 4]].forEach(([z, ph]) => gateRow(48, z, 'x', (x, zz) => L.door(x, zz, { breath: { period: 6, open: 0.5, phase: ph } })));
// the exit door, locked with the iron key
const EXD = [X0[2] + 18, Z0[0] + 6]; gateRow(EXD[0], Z0[0] + 4, 'z', (x, z) => L.door(x, z, { key: 'iron' }));
// ---- the conveyors (a flow on the floor): the west corridor of the middle row flips, the south lane's west corridor runs and rests -------------------------------------------------------------------------------------------------------------
const belts = [], loads = [];
const BELT1 = [X0[0] + 12, Z0[1] + 4, X0[0] + 25, Z0[1] + 7], BELT2 = [X0[0] + 12, Z0[2] + 4, X0[0] + 25, Z0[2] + 7];
L.fx(BELT1, '>'); L.fx(BELT2, '<');
belts.push({ rect: BELT1, period: 24, mode: 'flip', phase: 0 }, { rect: BELT2, period: 18, mode: 'run', on: 10, phase: 0 });
loads.push({ rect: [X0[1] + 12 + 6, Z0[2] + 4, X0[1] + 12 + 7, Z0[2] + 7], period: 6, start: 4 });                                // the shuttle: a load crosses the south lane's east corridor every bar
// ---- the secret: a cache between the two east corridors of the middle row (the panel in the north wall of the east corridor, behind the loom's shadow) ----------------------------------------------------------------------------------
const CACHE = [60, 52, 64, 54], SEC = { panel: [62, 55], cells: [] };
for (let z = CACHE[1]; z <= CACHE[3]; z++) for (let x = CACHE[0]; x <= CACHE[2]; x++) { setCell(L, x, z, FLOOR, 1, 10); SEC.cells.push([x, z]); }
setCell(L, SEC.panel[0], SEC.panel[1], 'S', 1);
// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; L.put(6, Z0[2] + 5, '@'); P.reserve(6, Z0[2] + 5);
const cx = (i) => X0[i] + 5, cz = (j) => Z0[j] + 5;
for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { for (const [dx, dz] of [[2, 2], [9, 2], [2, 9], [9, 9]]) PR('lamp', X0[i] + dx, Z0[j] + dz); PR('cradle', X0[i] + 3, Z0[j] + 6); PR('cradle', X0[i] + 8, Z0[j] + 6); }
for (let k = 0; k < 14; k += 5) { for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) PR('lamp', X0[i] + 12 + k, Z0[j] + 3); }
for (const [x, z] of [[8, Z0[2] + 3], [14, Z0[2] + 3], [X0[2] + 14, Z0[0] + 3], [X0[2] + 20, Z0[0] + 3], [50, 24], [50, 17], [50, 13], [45, 8], [55, 8], [50, 8]]) PR('lamp', x, z);
PK('key_iron', 50, 7);
// the roster: by crossing and corridor along the way to the cutting room and back out by the north lane (the side crossings are held too: noise carries)
const R = (list, kind, extra = {}) => list.forEach(([x, z]) => E(kind, x, z, extra));
const wv = { variant: 'woven' };
const c = (i, j, dx, dz) => [X0[i] + dx, Z0[j] + dz];
R([c(0, 2, 8, 2), c(0, 2, 9, 9), c(1, 2, 2, 2), c(1, 2, 9, 9), c(0, 1, 2, 3), c(0, 1, 9, 9), c(1, 1, 2, 10), c(2, 2, 3, 3), c(2, 2, 8, 9)], 'tollbearer', wv);
R([c(0, 2, 5, 9), c(2, 0, 2, 9), c(1, 0, 3, 2), c(1, 0, 8, 9), c(2, 1, 8, 3), c(0, 0, 8, 8), c(2, 0, 9, 3)], 'tollbearer');
R([[36, Z0[2] + 5], [58, Z0[2] + 6], [50, Z0[1] + 14], [50, Z0[0] + 14], [64, Z0[0] + 5], [40, Z0[1] + 5], [74, Z0[1] + 5], [76, Z0[0] + 15]], 'gaunt');
R([c(1, 2, 5, 3), c(1, 1, 3, 3), c(1, 0, 3, 9), c(2, 0, 4, 3), c(0, 1, 5, 9), c(2, 2, 4, 9)], 'bellhand');
R([c(0, 1, 9, 3), c(1, 0, 9, 3), c(2, 1, 3, 9), c(0, 2, 9, 3), c(1, 2, 8, 3)], 'zealot');
R([c(2, 1, 3, 8), c(1, 0, 9, 8), c(0, 1, 6, 3), c(1, 2, 9, 3), c(0, 0, 3, 3)], 'chorister');
R([c(1, 1, 5, 0), c(2, 1, 5, 5), c(2, 2, 6, 6), c(0, 1, 6, 6)], 'gill');
E('sexton', ...c(0, 0, 5, 5)); E('sexton', ...c(1, 0, 6, 5)); E('sexton', ...c(2, 1, 6, 6)); E('bulwark', ...c(2, 1, 8, 8)); E('bulwark', ...c(0, 1, 3, 8)); E('bulwark', ...c(0, 2, 3, 8));
R([[44, 8], [56, 8]], 'tollbearer', wv);
E('weeping', ...c(2, 2, 6, 5));                                                                                         // the mother of the loom: her brood drops into the south lane                                                                                // the cutting room
// health ON the lane
for (const [x, z, k] of [[22, Z0[2] + 5, 'health_small'], [36, Z0[2] + 6, 'health_small'], [cx(1) - 3, cz(2) - 1, 'health_large'], [50, Z0[1] + 14, 'health_small'], [50, cz(1) - 5, 'health_small'], [50, Z0[0] + 16, 'health_large'], [50, 46, 'health_large'], [50, 50, 'health_small'], [50, 20, 'health_large'], [50, 10, 'health_small'], [56, cz(0) + 1, 'health_small'], [64, Z0[0] + 6, 'health_large'], [76, Z0[0] + 6, 'health_small']]) PK(k, x, z);
PK('armor_vest', 48, 15); PK('armor_vest', cx(2) - 3, cz(0) + 1);
PK('armor_vest', CACHE[0] + 1, CACHE[1] + 1); PK('ammo_rocket', CACHE[0], CACHE[1]); PK('ammo_rocket', CACHE[2], CACHE[1]); PK('health_large', CACHE[0], CACHE[3]); PK('ammo_round', CACHE[2], CACHE[3]);

// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [48,81], radius: 2, cells: ENC.around([48,81], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M19', name: 'Bone Loom', version: 1, ceilingHeight: 4.2, par: { time: 660 },
  atmosphere: { look: 'woven', fog: '#2a2214', fogDensity: 0.012, beat: true },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 24, rivet: 100, bolt: 18, cell: 50, round: 50, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'BONE LOOM', lines: ['Nine crossings under a roof of rails, and a cradle hung over every one.', 'The doors breathe on the beat. The way to the key is three of them.'] },
  outro: 'The iron key turned and the door at the end of the north lane let go. The cradles above the crossings were all empty by then. Beyond the door a rail leads out, and it is warm.',
  objective: 'Cross the hall to the north: the iron key is in the cutting room behind three breathing doors. The locked door is at the east end of the north lane',
  ...L.layers(),
  secrets: [{ id: 'behind-the-frame', panel: SEC.panel, cells: SEC.cells }],
  groups: [], belts, loads,
  entities: [...P.ents, { type: 'exit', at: [EXD[0] + 5, EXD[1]], dest: 'next' }],
  scenery: [],
  messages: [
    { id: 'start', at: [7, Z0[2] + 5], radius: 5, speaker: 'INES', text: 'A loom the size of a church, and nobody at it. Every crossing in the hall has two cradles on rails over it, and the people in them are not awake.' },
    { id: 'thread', at: [24, Z0[2] + 5], radius: 5, speaker: 'PLATE', text: 'A thread, one voice to a cradle, cut to a length and laid in the weave. The plate counts the cradles in a night: four hundred and six. The Quiet One was right about the loom.' },
    { id: 'belt', at: [34, Z0[2] + 3], radius: 5, speaker: 'HULL', text: 'The floor of this corridor runs west for ten seconds and stands for eight. When the chevrons turn amber it is about to change.' },
    { id: 'breath', at: [49, 27], radius: 5, speaker: 'HULL', text: 'These doors breathe. Each is open three seconds in six, and each opens a second after the one in front. Go when the first opens and you are through all three.' },
    { id: 'shuttle', at: [50, 81], radius: 5, speaker: 'HULL', text: 'The shuttle comes down on this corridor once a bar. Its shadow comes first, and the floor glows orange before it lands.' },
    { id: 'cut', at: [50, 12], radius: 4, speaker: 'PLATE', text: 'CUTTING ROOM. The length of a thread is the length of a life: it is measured here and cut. The tally on the table is not finished.' },
    { id: 'key', at: [50, 8], radius: 4, speaker: 'HULL', text: 'The iron key lies on the cutting table, under the lamps. It opens the door at the east end of the north lane.' },
    { id: 'door', at: [EXD[0] - 2, EXD[1]], radius: 4, speaker: 'HULL', text: 'The door is shut. It takes an iron key, and the key is in the cutting room at the north end of the hall.' },
    { id: 'woven', at: [cx(1), cz(1) + 3], radius: 5, speaker: 'INES', text: 'The pale ones are woven, not grafted: they come out of the cradles already walking. Somebody has been spinning them all night.' },
    { id: 'hollow', at: [62, 57], radius: 3, speaker: 'HULL', text: 'The north wall of this corridor rings hollow in one place. The weave is thinner there.' },
    { id: 'cache', at: [CACHE[0] + 1, CACHE[1] + 1], radius: 3, speaker: 'A SILENT (NOTE)', text: 'I hid these under the frame the night they began the new loom. If you are reading this the old one has stopped.' },
  ],
  triggers: [
    { id: 'woven', when: 'enter', at: [cx(1), cz(1)], radius: 5, do: [{ spawn: { kind: 'tollbearer', variant: 'woven', at: [45, 53], group: 'woven' } }, { spawn: { kind: 'tollbearer', variant: 'woven', at: [54, 53], group: 'woven' } }, { spawn: { kind: 'tollbearer', variant: 'woven', at: [54, 62], group: 'woven' } }, { message: 'woven' }] },
    { id: 'cutting', when: 'enter', at: [50, 20], radius: 4, do: [{ objective: 'The iron key is on the cutting table at the north end' }] },
    { id: 'key', when: 'key:iron', do: [{ objective: 'The iron key: the locked door is at the east end of the north lane' }] },
  ],
  quality: { enemies: [30, 70], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 6,
    enemyKinds: { tollbearer: 8, gaunt: 3, bellhand: 2, zealot: 2, chorister: 2, gill: 2, sexton: 1, bulwark: 1 },
    scaleClass: 'COMPRESSION', introduces: 'timing at scale: breathing doors on the beat, two conveyors and a shuttle, and the woven that come out of the cradles' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M19: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'exit door', EXD, 'cache', CACHE);
const A = (x, z) => [x, z];
export const waypoints = {
  main: [[6, Z0[2] + 5, 0], A(X0[0] + 2, Z0[2] + 5), A(X0[0] + 9, Z0[2] + 8), A(X0[1] - 8, Z0[2] + 6), A(X0[1] + 1, Z0[2] + 8), A(X0[1] + 5, Z0[2] + 3), A(50, Z0[1] + 14), A(50, Z0[1] + 10), A(50, cz(1) - 5), A(50, Z0[0] + 16), A(50, Z0[0] + 8), A(50, 26), [50, 24, 0], [49, 23, 0], { op: 'wait', seconds: 1 }, [49, 21, 0], [49, 19, 0], [49, 17, 0], [49, 15, 0], [49, 13, 0], A(50, 7), A(50, 20), A(50, Z0[0] + 8), A(cx(2) - 4, Z0[0] + 6), A(EXD[0] - 3, EXD[1]), [EXD[0] - 1, EXD[1], 0], [EXD[0] + 2, EXD[1], 0], [EXD[0] + 5, EXD[1], 0]],
  secret: [[6, Z0[2] + 5, 0], A(X0[0] + 2, Z0[2] + 5), A(X0[0] + 9, Z0[2] + 8), A(X0[1] - 8, Z0[2] + 6), A(X0[1] + 1, Z0[2] + 8), A(X0[1] + 5, Z0[2] + 3), A(50, Z0[1] + 14), A(50, Z0[1] + 10), A(50, cz(1) - 5), A(58, 57), [62, 57, 0], { op: 'use', at: SEC.panel }, [62, 53, 0], [62, 57, 0], [54, 55, 0], A(50, cz(1) - 5), A(50, Z0[0] + 16), A(50, Z0[0] + 8), A(50, 26), [50, 24, 0], [49, 23, 0], { op: 'wait', seconds: 1 }, [49, 21, 0], [49, 19, 0], [49, 17, 0], [49, 15, 0], [49, 13, 0], A(50, 7), A(50, 20), A(50, Z0[0] + 8), A(cx(2) - 4, Z0[0] + 6), A(EXD[0] - 3, EXD[1]), [EXD[0] - 1, EXD[1], 0], [EXD[0] + 2, EXD[1], 0], [EXD[0] + 5, EXD[1], 0]],
};
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M19', lane: [...(laneOf('C2M19') ?? [])], keep: [], plan: [] };
ENC.apply(MAP);

export default MAP;
