// C2M26 SILENT ROOTS (Campaign 2, Act D; design/ACTD.md section 5). COMPRESSION in this build (a roofed cave of root columns), DARK, threat 6.
// A FOREST OF ROOT COLUMNS: a low cave of pillars at irregular spacing with open lanes between them, a bare clearing for a hub in the middle, three hold-out chambers (the Silent's: west, south and east) a step above the floor, and at the far end, down a stair, the Songkeepers' refectory.
// The verb is to be quiet, then not to be. `atmosphere.silence` (no score: the sound of the floor and what breathes), `dark` with a hand lantern (eyes follow light: a Gaunt, a Gill or a Zealot sees a lit lamp from 24 m and an unlit one from 6; a Tollbearer or a Bellhand follows the Hush and ignores it),
// and the noise tell (`noiseTell`): the HUD says QUIET or LOUD for the weapon in hand and how far it carries, and the automap shows the ring; a loud gun wakes what stands in its reach. The arc lamp, the fork and a blow are quiet.
// Each chamber holds one of the Silent, who refuses one thing and says where the sleepers are, and a LATCH (a candle beside it, named: "the west latch", "the south latch", "the east latch": in any order). When all three are thrown the refectory gate opens; the refectory is the brawl; the exit is beyond it.
// A hollow root column holds a Songkeeper's reed and a tin. Drop-fed ammunition.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';

const W = 100, H = 100, L = new Level(W, H, { fill: 'κ' }); L.usedHeights = true; L.usedCeil = true;
const FOREST = 'Κ', REFEC = 'Ν', WALL = 'κ', ROOTW = 'ι', FH = 4;
const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const box = (r, ch, h, ce) => { for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) setCell(L, x, z, ch, h, ce); };
// ---- the forest floor, then the clearing, the chambers and the refectory ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box([5, 31, 94, 94], FOREST, FH, 10);                                                                                      // the cave: floor +2 m, lid 5 m
box([37, 37, 63, 63], FOREST, FH, 16);                                                                                     // the hub: a clearing under a higher lid (8 m)
const CH = { w: [8, 40, 24, 60], s: [40, 76, 60, 92], e: [76, 40, 92, 60] };
box(CH.w, 'Ν', 7, 12); box(CH.s, 'Ν', 7, 12); box(CH.e, 'Ν', 7, 12);                                                      // the Silent's chambers: +3.5 m, lid 6 m: a lived-in floor
const wallRing = (r, gap) => { for (let z = r[1] - 1; z <= r[3] + 1; z++) for (let x = r[0] - 1; x <= r[2] + 1; x++) { if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) continue; if (gap(x, z)) continue; L.g[z][x] = WALL; } };
wallRing(CH.w, (x, z) => x === CH.w[2] + 1 && z >= 49 && z <= 51); wallRing(CH.e, (x, z) => x === CH.e[0] - 1 && z >= 49 && z <= 51); wallRing(CH.s, (x, z) => z === CH.s[1] - 1 && x >= 49 && x <= 51);
for (const z of [49, 50, 51]) { setCell(L, 26, z, 'Κ', 5, 11); setCell(L, 25, z, 'Κ', 6, 11); }                              // west: a half metre a cell up to the chamber
for (const z of [49, 50, 51]) { setCell(L, 74, z, 'Κ', 5, 11); setCell(L, 75, z, 'Κ', 6, 11); }                              // east
for (const x of [49, 50, 51]) { setCell(L, x, 74, 'Κ', 5, 11); setCell(L, x, 75, 'Κ', 6, 11); }                              // south
// the refectory: sunk two metres below the forest, down a stair in a lane behind a gate; the exit beyond it
box([28, 6, 72, 26], REFEC, 0, 14);
for (let z = 28; z <= 36; z++) for (const x of [48, 49, 50, 51, 52]) setCell(L, x, z, FOREST, Math.max(0, Math.min(4, z - 31)), 12);
for (let x = 28; x <= 72; x++) L.g[27][x] = WALL; L.door(50, 27, { remote: true }); setCell(L, 50, 27, REFEC, 0, 12); L.door(50, 27, { remote: true });
for (let z = 3; z <= 5; z++) for (const x of [49, 50, 51]) setCell(L, x, z, 'Ξ', 0, 12);
// ---- the columns of the forest: 2 x 2 blocks of root on an irregular grid, a lane or two wide between them --------------------------------------------------------------------------------------------------------------------------------------------
const clear = (x, z) => (x >= 34 && x <= 66 && z >= 34 && z <= 66) || (x >= 4 && x <= 28 && z >= 38 && z <= 62) || (x >= 72 && x <= 96 && z >= 38 && z <= 62) || (x >= 38 && x <= 62 && z >= 72) || (x >= 46 && x <= 54 && z <= 40);
const cols = [];
for (let gz = 33; gz < 93; gz += 5) for (let gx = 7; gx < 93; gx += 5) { const x = gx + Math.floor(hash(gx, gz) * 5) - 2, z = gz + Math.floor(hash(gz, gx) * 5) - 2; if (clear(x, z) || clear(x + 1, z + 1) || clear(x - 1, z - 1) || clear(x + 2, z + 2)) continue; for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) if (L.g[z + dz][x + dx] === FOREST) L.g[z + dz][x + dx] = ROOTW; cols.push([x, z]); }
for (const [x, z] of [[40, 40], [56, 40], [40, 56], [56, 56], [48, 48], [38, 48], [58, 48], [48, 38], [48, 58], [44, 44], [52, 44], [44, 52], [52, 52], [60, 60], [38, 60], [60, 38], [38, 38]]) for (let dz = 0; dz < 3; dz++) for (let dx = 0; dx < 3; dx++) L.g[z + dz][x + dx] = ROOTW;                  // the clearing has its own pillars: a brawl needs something to stand behind
// ridges of root (thick walls with gaps) that cut the forest into stalls
const ridge = (x0, z0, x1, z1, gaps) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (!gaps.some(([a, b]) => (x >= a && x <= b) || (z >= a && z <= b && x1 === x0))) { if (L.g[z][x] === FOREST) L.g[z][x] = ROOTW; } };
ridge(6, 66, 30, 67, [[12, 15], [24, 27]]); ridge(70, 66, 93, 67, [[76, 79], [86, 89]]); ridge(30, 78, 31, 92, [[84, 87]]); ridge(70, 78, 71, 92, [[84, 87]]); ridge(6, 34, 33, 35, [[16, 19], [28, 31]]); ridge(67, 34, 93, 35, [[72, 75], [86, 89]]); ridge(33, 66, 34, 76, [[70, 73]]); ridge(66, 66, 67, 76, [[70, 73]]);
// the refectory's long tables (solid: a table is a wall to a bullet and to the eye) and the benches of the chambers
for (const z of [10, 17]) for (const [a, b] of [[32, 44], [56, 68]]) for (let x = a; x <= b; x++) for (let dz = 0; dz < 2; dz++) L.g[z + dz][x] = ROOTW;
for (const [x, z] of [[14, 44], [18, 54], [20, 44], [12, 56], [46, 80], [54, 86], [44, 88], [56, 80], [82, 44], [86, 56], [80, 54], [88, 46]]) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) L.g[z + dz][x + dx] = ROOTW;
// the start: the south-west corner; its walls are roots
// ---- the hollow column: a 7 x 7 block of root south-west of the south chamber, a seam in its north face ---------------------------------------------------------------------------------------------------------------------------------------------------------
const HB = [32, 80];                                                                                                       // top-left cell of the block
for (let z = HB[1]; z < HB[1] + 7; z++) for (let x = HB[0]; x < HB[0] + 7; x++) L.g[z][x] = ROOTW;
const SEC = { panel: [HB[0] + 3, HB[1]], cells: [] };
for (let z = HB[1] + 2; z <= HB[1] + 4; z++) for (let x = HB[0] + 2; x <= HB[0] + 4; x++) { setCell(L, x, z, 'Κ', FH, 10); SEC.cells.push([x, z]); }
setCell(L, HB[0] + 3, HB[1] + 1, 'Κ', FH, 10); SEC.cells.push([HB[0] + 3, HB[1] + 1]); L.g[HB[1]][HB[0] + 3] = 'S'; L.ht[HB[1]][HB[0] + 3] = FH;
for (let x = HB[0] - 1; x <= HB[0] + 7; x++) setCell(L, x, HB[1] - 1, FOREST, FH, 10);                                       // the lane in front of the seam
// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; L.put(8, 90, '@'); P.reserve(8, 90);
const LATCH = { r1: { at: [8, 50], wall: 'west', name: 'west' }, r2: { at: [50, 92], wall: 'south', name: 'south' }, r3: { at: [92, 50], wall: 'east', name: 'east' } };
for (const [id, v] of Object.entries(LATCH)) { const [x, z] = v.at, dx = v.wall === 'west' ? 1 : v.wall === 'east' ? -1 : 0, dz = v.wall === 'north' ? 1 : v.wall === 'south' ? -1 : 0; PR('lantern', x + dx * 1 + (dz ? 2 : 0), z + dz * 1 + (dx ? 2 : 0)); PR('lantern', x + dx * 1 - (dz ? 2 : 0), z + dz * 1 - (dx ? 2 : 0)); }
for (const [x, z] of [[8, 88], [14, 90], [30, 70], [44, 80], [58, 82], [70, 70], [86, 74], [30, 40], [30, 56], [70, 40], [70, 56], [50, 36], [42, 42], [58, 42], [42, 58], [58, 58], [50, 44], [40, 48], [60, 48]]) PR('lantern', x, z);
for (const [x, z] of [[50, 30], [46, 28], [54, 28], [34, 12], [66, 12], [34, 22], [66, 22], [40, 8], [60, 8]]) PR('lantern', x, z);
const R = (list, kind, extra = {}) => list.forEach(([x, z]) => E(kind, x, z, extra));
// the Silent: one in each chamber (peaceful, they stand where they are put)
E('vaelfolk', 16, 50); E('vaelfolk', 50, 85); E('vaelfolk', 84, 50);
// sleepers: Zealots and Gaunts see a lit lamp from 24 m; Tollbearers hear the Hush
R([[18, 76], [30, 84], [70, 84], [84, 70]], 'zealot'); R([[14, 70], [20, 82], [60, 74], [80, 80], [88, 62], [12, 62]], 'gaunt'); R([[24, 66], [40, 70], [72, 76]], 'tollbearer');
R([[20, 36], [76, 36], [28, 44], [70, 44], [38, 52], [62, 54]], 'gaunt'); R([[34, 40], [66, 40], [22, 52]], 'zealot'); R([[44, 40], [58, 36], [88, 40]], 'tollbearer'); R([[20, 44], [80, 62]], 'gill');
// the refectory brawl
R([[60, 12]], 'bulwark', { facing: 0 }); R([[36, 18], [64, 20]], 'chorister'); R([[40, 22], [32, 14]], 'bellhand'); R([[44, 16]], 'sexton'); R([[50, 14]], 'zealot'); R([[44, 10], [56, 8]], 'tollbearer');
for (const [x, z, k] of [[10, 86, 'health_small'], [24, 78, 'health_small'], [14, 62, 'health_large'], [16, 48, 'health_small'], [36, 44, 'health_small'], [50, 58, 'health_large'], [64, 46, 'health_small'], [86, 54, 'health_small'], [80, 66, 'health_large'], [50, 82, 'health_small'], [46, 33, 'health_large'], [54, 31, 'health_small'], [50, 22, 'health_large'], [50, 29, 'health_large'], [49, 30, 'health_large'], [51, 30, 'health_small']]) PK(k, x, z);
for (const [x, z] of [[14, 52], [52, 86], [86, 46]]) PK('armor_vest', x, z);
for (const [x, z] of [[20, 80], [44, 62], [76, 70], [24, 40]]) PK('oil', x, z);
SEC.cells.slice(0, 4).forEach(([x, z], i) => PK(['armor_vest', 'oil', 'ammo_rocket', 'health_large'][i], x, z));
const EXIT = [50, 4];
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [17,50], radius: 2, cells: ENC.around([17,50], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [72,55], radius: 2, cells: ENC.around([72,55], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M26', name: 'Silent Roots', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'roots', sky: 'root', dark: true, silence: true, fog: '#14120c', fogDensity: 0.014, ambient: 0.5 },
  lantern: { oil: 200, max: 300 }, noiseTell: true,
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 30, rivet: 200, bolt: 18, cell: 80, round: 50, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'SILENT ROOTS', lines: ['A cave of root columns, and what sleeps among them.', 'A shot carries far in here. So does a lit lantern.'] },
  outro: 'The refectory was a long table laid for forty. The corridor beyond it goes down into the root, and there is a sound at the end of it that is very slow.',
  objective: 'Find the three chambers of the Silent: west, south and east. A latch in each. Gunfire wakes what is in its reach: the arc and a blow are quiet',
  ...L.layers(),
  secrets: [{ id: 'hollow-root', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents,
    ...Object.entries(LATCH).map(([id, v]) => ({ type: 'switch', id, at: v.at, wall: v.wall, once: true, do: [{ message: id }, { objective: `The ${v.name} latch is thrown. ${id === 'r1' ? 'Two chambers more' : id === 'r2' ? 'Two chambers more' : 'Two chambers more'}` }] })),
    { type: 'exit', at: EXIT, dest: 'next' }],
  scenery: [{ kind: 'rootcolumn', at: [50, 50], y: 0, scale: 1.2 }],
  messages: [
    { id: 'start', at: [8, 90], radius: 5, speaker: 'INES', text: 'Columns of root as thick as a house, set at irregular distances, and a floor that gives back every step. Something breathes in the dark a long way off, and it\'s more than one.' },
    { id: 'tell', at: [14, 86], radius: 5, speaker: 'HULL', text: 'Gunfire carries far in here. The arc lamp, the fork and a blow carry almost nowhere. A lit lantern is seen from far off by anything that sees.' },
    { id: 'west', at: [14, 50], radius: 4, speaker: 'A SILENT', text: 'I will not say who sleeps by the south chamber. I will say they sleep by the door, and that a quiet hand goes past them.' },
    { id: 'south', at: [50, 84], radius: 4, speaker: 'A SILENT', text: 'I will not call anyone. I will say the ones in the east keep their eyes on the light. Put the lamp out in the lanes. They hear nothing else.' },
    { id: 'east', at: [84, 50], radius: 4, speaker: 'A SILENT', text: 'I will not sing. The refectory has forty places and nobody in them. They have come in since the bell: eleven, from the north, in armour.' },
    { id: 'r1', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The west latch is thrown. Somewhere north of here a long wooden bolt has moved a hand.' },
    { id: 'r2', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The south latch is thrown. The same sound as before, a little further to the left.' },
    { id: 'r3', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The east latch is thrown. The bolts all hang free: the refectory gate is open.' },
    { id: 'gate', at: [50, 35], radius: 5, speaker: 'HULL', text: 'The refectory gate is shut. It is held by three bolts, one from the latch in each of the three chambers of the Silent.' },
    { id: 'refectory', at: [50, 24], radius: 5, speaker: 'INES', text: 'A table laid for forty with a lamp at every fifth place. They are standing in the gaps. They have been waiting for me to open the door.' },
    { id: 'hollow', at: [HB[0] + 3, HB[1] - 2], radius: 3, speaker: 'HULL', text: 'This column is thicker than the rest, and one run of its south face rings hollow.' },
    { id: 'cache', at: SEC.cells[4], radius: 3, speaker: 'A SILENT (NOTE)', text: 'A Songkeeper left a reed and a tin in the root. I kept the tin. I have not played the reed and I will not.' },
  ],
  triggers: [
    { id: 'gate-open', when: ['msg:r1', 'msg:r2', 'msg:r3'], do: [{ open: [50, 27] }, { objective: 'The refectory gate is open: down the stair at the north end of the clearing' }] },
  ],
  quality: { enemies: [20, 80], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 5,
    enemyKinds: { zealot: 5, gaunt: 8, tollbearer: 5, gill: 2, bellhand: 2, chorister: 2, sexton: 1 },
    scaleClass: 'COMPRESSION', introduces: 'the noise tell: the HUD says QUIET or LOUD and how far a shot carries, the automap shows the ring, and a lit lantern is seen from far off: sleepers among the root columns, then a brawl' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M26: enemies', P.ents.filter((e) => e.type === 'enemy' && e.kind !== 'vaelfolk').length, 'columns', cols.length, 'panel', SEC.panel);
const Z = (x, z) => [x, z];
const hubIn = [50, 62];
export const waypoints = {
  main: [[8, 90, 0], Z(14, 78), Z(20, 66), Z(26, 56), [30, 50, 0], Z(16, 50), { op: 'switch', id: 'r1' }, Z(30, 50), Z(38, 56), Z(44, 66), Z(50, 74), Z(50, 82), { op: 'switch', id: 'r2' }, Z(50, 72), Z(58, 64), Z(66, 56), Z(72, 50), Z(84, 50), { op: 'switch', id: 'r3' }, Z(72, 50), Z(60, 44), Z(52, 38), Z(50, 33), [50, 28, 0], [50, 25, 0], Z(50, 16), Z(50, 8), [50, 5, 0], [EXIT[0], EXIT[1], 0]],
  secret: [[8, 90, 0], Z(14, 84), Z(24, 80), Z(HB[0] + 3, HB[1] - 2), { op: 'use', at: SEC.panel }, [HB[0] + 3, HB[1] + 4, 0], Z(HB[0] + 3, HB[1] - 2), Z(20, 66), Z(26, 56), [30, 50, 0], Z(16, 50), { op: 'switch', id: 'r1' }, Z(30, 50), Z(38, 56), Z(44, 66), Z(50, 74), Z(50, 82), { op: 'switch', id: 'r2' }, Z(50, 72), Z(58, 64), Z(66, 56), Z(72, 50), Z(84, 50), { op: 'switch', id: 'r3' }, Z(72, 50), Z(60, 44), Z(52, 38), Z(50, 33), [50, 28, 0], [50, 25, 0], Z(50, 16), Z(50, 8), [50, 5, 0], [EXIT[0], EXIT[1], 0]],
};
void hubIn;
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M26', lane: [...(laneOf('C2M26') ?? [])], keep: [], plan: [{"from":"gaunt","to":"gill","pick":"spread","n":1},{"from":"gaunt","to":"chorister","pick":"spread","n":1}] };
ENC.apply(MAP);

// ---- PT-052 Level B: THE SQUEEZE (tools/mapkit/squeeze.mjs). The forest was 100 by 100 cells for 36 creatures (six per thousand cells, the sparsest map): sixteen columns and eighteen rows are taken out where nothing stands and no ramp runs.
// Everything above this line is in the AUTHORING frame; the shipped map is narrower and its routes are the waypoints with the same cuts (`node tools/dev/write-routes.mjs C2M26`). Kit calls and the lane file stay in the authoring frame.
MAP.squeeze = [{axis:'x',cuts:[[3,4], [6,7], [11,12], [17,18], [21,22], [23,24], [31,32], [42,43], [57,58], [63,64], [68,69], [77,78], [82,83], [89,91], [96,97]]}, {axis:'z',cuts:[[7,8], [9,10], [13,14], [21,22], [23,24], [37,38], [41,42], [45,46], [53,54], [57,58], [59,60], [64,65], [71,73], [77,78], [89,90], [94,95], [96,97]]}];
// ---- end PT-052 Level B squeeze ----

// ---- PT-070 unless (the story pass): reminders that are silent once the thing they remind of has happened
for (const [mid, unless] of Object.entries({ "gate": ["msg:r3"] })) MAP.messages.find((m) => m.id === mid).unless = unless;
// ---- end PT-070 unless
export default MAP;
