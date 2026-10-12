// C2M14 HARMONIC GARDENS: the first real sound puzzle; the Song gardened like a crop. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md E6, design/LORE.md section 2b.)
// A cavern garden under the roof of small lights: planters laid on the golden angle (a spiral of stone beds, never a grid), a round plaza in the middle with a mound, and on the mound the GREAT CHIME-TREE, five fruit on it
// (a circle, a triangle, a square, a diamond, a ring, each in its own colour and its own note). Five chimes stand on the plaza ring with the same glyphs. USE the tree: it plays a phrase (the fruit light in order, a note every
// 0.7 s); answer it on the chimes (Use or a shot), each note within 8 s of the last. Three rounds (3, 4, 5 notes) and three garden walls in the avenue to the north: round one opens the first wall, two the second, three the third;
// the tree always plays the next round that is not solved. A wrong note leaves the wall shut and the tree plays the round again. The Harvesters (Zealots in garden-green that tend the beds) and their pests stand about the plaza:
// it is a puzzle under pressure, which is the point. The exit is at the far end of the avenue. A secret grove east of the plaza holds the last of the oil.
// SHAPE: an ellipse of garden cut by a spiral of planters, a round plaza with a mound, a straight avenue with three walls (the only straight line in the map). Scale class SET-PIECE (the plaza and the garden are open to the cave roof).
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, box, ellipse, placer } from '../tools/mapkit/c2.mjs';
import { skinWalls } from '../tools/mapkit/cave.mjs';

const W = 96, H = 100, CX = 48, CZ = 52, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const ROCK = '[', MOSS = '7', PATH = ',', FLOW = '{', PLANTER = 'Q', HEDGE = 'U';
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const FL = 4;
const polar = (r, deg) => [Math.round(CX - 0.5 + r * Math.cos((deg * Math.PI) / 180)), Math.round(CZ - 0.5 + r * Math.sin((deg * Math.PI) / 180))];
// ---- the garden: an ellipse of moss, the plaza of swept path, the mound -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const garden = ellipse(L, CX, CZ + 6, 36, 34, MOSS, FL);
let xe = 0; for (const [x, z] of garden) if (z === CZ + 6 && x > xe) xe = x;                                  // the east edge of the garden, where the secret grove's panel goes
const plaza = ellipse(L, CX, CZ, 12.5, 12.5, PATH, FL);
for (const [x, z] of ellipse(L, CX, CZ, 6.5, 6.5, PATH, FL)) { const r = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ); setCell(L, x, z, PATH, FL + Math.max(0, Math.min(2, Math.round(6.5 - r)))); }                  // the mound: two units up over the last two cells
// ---- the planters of the spiral: stone beds 2 x 2 on the golden angle ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const GOLD = (137.50776 * Math.PI) / 180, planters = [];
for (let k = 1; k <= 70; k++) {
  const r = 3.3 * Math.sqrt(k) + 8, th = k * GOLD, x = Math.round(CX - 0.5 + r * 1.05 * Math.cos(th)), z = Math.round(CZ + 4 + r * Math.sin(th));
  if (Math.hypot(x + 0.5 - CX, z + 0.5 - CZ) < 14.5) continue;                                                      // not on the plaza
  if (x > CX - 7 && x < CX + 7 && z < CZ - 8) continue;                                                              // not in the avenue's mouth
  if (x > CX - 5 && x < CX + 5 && z > 84) continue;                                                                  // not in front of the start
  if (x >= xe - 7 && z >= CZ + 2 && z <= CZ + 11) continue;                                                           // not in front of the grove's panel
  if (![[0, 0], [1, 0], [0, 1], [1, 1]].every(([a, b]) => L.g[z + b]?.[x + a] === MOSS)) continue;
  if (planters.some(([a, b]) => Math.abs(a - x) < 4 && Math.abs(b - z) < 4)) continue;
  box(L, [x, z, x + 1, z + 1], PLANTER); planters.push([x, z]);
}
// ---- the start corridor (south) and the avenue of three walls (north) ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [47, 86, 49, 97], FLOW, FL, 16);
box(L, [44, 8, 52, 39], FLOW, FL, 20);                                                                               // the avenue: a roofed passage, 9 wide
for (const z of [30, 22, 14]) { box(L, [44, z, 52, z], HEDGE, FL); L.door(48, z, { remote: true }); L.height([48, z, 48, z], FL); }
// ---- the secret grove east of the plaza: a closet in the east wall, a small round room ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [xe + 1, CZ + 6], cells: [] };
for (let z = CZ + 4; z <= CZ + 8; z++) for (let x = xe + 2; x <= xe + 6; x++) if (x < W - 1) { setCell(L, x, z, MOSS, FL + 1, FL + 15); SEC.cells.push([x, z]); }
setCell(L, xe + 1, CZ + 6, 'S', FL);
skinWalls(L, ROCK, (x, z) => ((x * 7 + z * 3) % 5 ? HEDGE : PLANTER));
const P = placer(L); L.put(48, 94, '@'); P.reserve(48, 94);
const { E, P: PK, PR } = P;
// ---- the tree and the five chimes ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
PR('chimetree', CX, CZ, { id: 'tree', plays: ['r1', 'r2', 'r3'] });
[22, 62, 102, 142, 182].forEach((d, n) => PR('chime', ...polar(8.6, d + 20), { id: 'c' + n, note: n }));
for (const d of [0, 60, 120, 180, 240, 300]) PR('lantern', ...polar(11.5, d));
for (let i = 0; i < 14; i++) { const [x, z] = planters[i] ?? [CX, CZ + 20]; PR('lantern', x, z - 1); }
for (const z of [37, 26, 18, 10]) { PR('lantern', 45, z); PR('lantern', 51, z); }
PR('lantern', 48, 90); PR('lantern', 48, 84);
// ---- supplies -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[48, 88], [40, 78], [56, 78], [32, 66], [64, 66], [40, 60], [56, 60], [36, 50], [60, 50], [44, 36], [52, 36], [48, 27], [48, 19], [48, 11]]) PK((x + z) % 3 ? 'health_small' : 'health_large', x, z);
for (const [x, z] of [[44, 74], [60, 70], [48, 40], [48, 26]]) PK('armor_vest', x, z);
for (let i = 0; i < SEC.cells.length; i += 3) PK(['oil', 'oil', 'health_large', 'armor_vest', 'ammo_cell', 'ammo_shell', 'oil'][i / 3 | 0] ?? 'oil', ...SEC.cells[i]);
// ---- the Harvesters and their pests ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [r, d] of [[12, 30], [12, 90], [12, 150], [12, 210], [11, 270], [11, 330]]) E('zealot', ...polar(r, d));
for (const [r, d, k] of [[18, 40, 'tollbearer'], [18, 100, 'tollbearer'], [18, 160, 'tollbearer'], [18, 220, 'tollbearer'], [20, 300, 'tollbearer'], [24, 60, 'tollbearer'], [24, 130, 'tollbearer'], [24, 190, 'tollbearer']]) E(k, ...polar(r, d));
for (const [r, d] of [[20, 20], [20, 75], [20, 125], [20, 175], [20, 235], [22, 285], [26, 90], [26, 160], [26, 30], [26, 210]]) E('gaunt', ...polar(r, d));
for (const [r, d] of [[16, 70], [16, 190], [16, 310]]) E('bellhand', ...polar(r, d));
E('chorister', ...polar(15, 110)); E('chorister', ...polar(15, 250)); E('gill', ...polar(22, 150)); E('gill', ...polar(22, 330));
// ---- the garden answers: each wall that opens wakes the beds (pests step out of the planters round the plaza) ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const spawnAt = (list, group) => list.map(([r, d, kind]) => { const [x, z] = polar(r, d); const ok = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]].map(([a, b]) => [x + a, z + b]).find(([xx, zz]) => P.isFloor(xx, zz)) ?? [x, z]; return { spawn: { kind, at: ok, group, facing: N } }; });
const wave1 = spawnAt([[14, 20, 'gaunt'], [14, 60, 'gaunt'], [14, 100, 'tollbearer'], [14, 140, 'gaunt'], [14, 180, 'tollbearer'], [14, 220, 'gaunt']], 'beds1');
const wave2 = spawnAt([[14, 30, 'tollbearer'], [14, 90, 'gaunt'], [14, 150, 'tollbearer'], [14, 210, 'gaunt'], [14, 270, 'tollbearer'], [14, 330, 'gaunt'], [16, 120, 'bellhand']], 'beds2');
const MAP = {
  id: 'C2M14', name: 'Harmonic Gardens', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'gardens', sky: 'deep', fog: '#0c1812', fogDensity: 0.01 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'HARMONIC GARDENS', lines: ['A garden laid out on a spiral, and a tree in the middle of it.', 'Every plant in it was grown to ring.'] },
  outro: 'The third wall opens on a stair. Behind her the garden is still ringing, very faintly, in a chord she did not play.',
  objective: 'Cross the garden to the plaza. The tree in the middle plays a phrase: answer it on the chimes. Three phrases open the three walls',
  ...L.layers(),
  secrets: [{ id: 'grove', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  chimes: [{ id: 'r1', phrase: [0, 2, 1], window: 8 }, { id: 'r2', phrase: [3, 1, 4, 0], window: 8 }, { id: 'r3', phrase: [2, 4, 0, 3, 1], window: 8 }],
  entities: [...P.ents, { type: 'exit', at: [48, 9], dest: 'next' }],
  scenery: [],
  messages: [
    { id: 'start', at: [48, 92], radius: 4, speaker: 'INES', text: 'Stone beds on a spiral, each one a little further round than the last. Whoever laid it out did not use a line or a plumb. They used a count.' },
    { id: 'harvest', at: [48, 78], radius: 5, speaker: 'INES', text: 'Spearmen in green, walking the beds with long hooks. They are not guarding it. They are picking.' },
    { id: 'plate', at: [48, 70], radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: five plants, five notes. A gardener grows one for each, and lays the bed so that a tone from one strikes the next.' },
    { id: 'tree', at: [48, 60], radius: 5, speaker: 'HULL', text: 'The tree in the middle plays a phrase when you use it: the fruit light in order, a note each. Answer on the chimes, in order, each within eight seconds of the last.' },
    { id: 'avenue', at: [48, 38], radius: 4, speaker: 'HULL', text: 'Three walls across the avenue to the north. The tree plays the next phrase that is not yet answered. A wrong note starts the phrase again.' },
    { id: 'r1', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'Three notes, and the first wall has gone back into its bed. It folded. Like a hedge in a wind.' },
    { id: 'r2', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'Four. The second wall. The tree is a count: three, four, and I suppose five.' },
    { id: 'r3', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'Five, and the last wall is open. It was a count the whole way, and the first time the Song has been one I could repeat.' },
    { id: 'hollow', at: [xe, CZ + 6], radius: 2, speaker: 'HULL', text: 'The east edge of the garden rings hollow behind a planter with no plant in it.' },
    { id: 'grove', at: [xe + 4, CZ + 6], radius: 3, speaker: 'A SILENT (NOTE)', text: 'The seed of the chimes is pressed for oil. This is the last pressing before the count was called. Whoever has a lantern, take it.' },
    { id: 'end', at: [48, 10], radius: 3, speaker: 'INES', text: 'The stair is cut very wide, and the steps are worn on both sides and not in the middle, as if the ones who used it were carrying something between them.' },
  ],
  triggers: [
    { id: 'wall1', when: 'seq:r1', do: [{ open: [48, 30] }, { message: 'r1' }, { objective: 'The first wall is open. Use the tree again: the second phrase' }, ...wave1] },
    { id: 'wall2', when: 'seq:r2', do: [{ open: [48, 22] }, { message: 'r2' }, { objective: 'The second wall is open. Use the tree: the third phrase, five notes' }, ...wave2] },
    { id: 'wall3', when: 'seq:r3', do: [{ open: [48, 14] }, { message: 'r3' }, { objective: 'The third wall is open. The exit is at the north end of the avenue' }] },
    { id: 'plaza', when: 'enter', at: [CX, CZ + 4], radius: 8, do: [{ objective: 'The plaza: use the tree (E), strike the chimes in its order' }] },
  ],
  quality: { enemies: [30, 70], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 6, enemyKinds: { zealot: 6, tollbearer: 8, gaunt: 8, bellhand: 3, chorister: 2, gill: 2 },
    scaleClass: 'SET-PIECE', reason: 'the plaza has to be open: five chimes and a tree are played by walking between them in the open, under the pressure of the Harvesters who tend the garden', introduces: 'the chimes: the first sound puzzle, a tree that plays a phrase and chimes to answer it, three rounds opening three walls, with the garden\'s Harvesters about the plaza' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M14: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'planters', planters.length, 'sec', SEC.cells.length, 'xe', xe);
const ch = (n) => ({ op: 'chime', id: 'c' + n }), tree = { op: 'chime', id: 'tree' };
const chimeAt = (n) => polar(8.6, [22, 62, 102, 142, 182][n] + 20);
const rounds = [[0, 2, 1], [3, 1, 4, 0], [2, 4, 0, 3, 1]];
const solve = (r) => [[...polar(5, 90), 0], tree, ...rounds[r].map((n) => ch(n)), { op: 'kill' }];
export const waypoints = {
  main: [[48, 94, 0], [48, 88, 0], [48, 78], [48, 70], [48, 64], [...polar(11, 90)], [...polar(11, 90), 0], ...solve(0), ...solve(1), ...solve(2), [48, 38], [48, 31, 0], [48, 26, 0], [48, 20, 0], [48, 12, 0], [48, 9, 0]],
  secret: [[48, 94, 0], [48, 88, 0], [48, 78], [48, 70], [48, 64], [...polar(11, 90)], [xe - 4, CZ + 6], [xe, CZ + 6], { op: 'use', at: [xe + 1, CZ + 6] }, [xe + 4, CZ + 6, 0], [xe - 4, CZ + 6, 0], [...polar(11, 90), 0], ...solve(0), ...solve(1), ...solve(2), [48, 38], [48, 31, 0], [48, 26, 0], [48, 20, 0], [48, 12, 0], [48, 9, 0]],
};
export default MAP;
