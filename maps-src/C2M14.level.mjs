// C2M14 HARMONIC GARDENS: the first real sound puzzle; the Song gardened like a crop. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md E6, design/LORE.md section 2b.)
// PT-082 REDRAW (design/FUN_CHECK.md: a flat disc dotted with boxes, 3819 cells, a 189 m walk with nothing awake). Now a SUNKEN GARDEN: you come in high on the south rim and see the whole bowl below you, the
// tree on its mound in the plaza at the bottom; three terraces of beds step down to it (each a metre, a cliff to drop from, a ramp at three places to climb), stone planters laid on the golden angle on every
// terrace, a gardener's lodge on the west rim. The GREAT CHIME-TREE has five fruit (a circle, a triangle, a square, a diamond, a ring, each in its own colour and note); five chimes stand round it on the
// plaza. USE the tree: it plays a phrase; answer it on the chimes (Use or a shot), each note within 8 s of the last. Three rounds (3, 4, 5 notes) open the three garden walls in the AVENUE that climbs out of
// the bowl to the north; a wrong note starts the phrase again; each wall that opens wakes the beds. The Harvesters (Zealots in garden-green) and their pests work the terraces: a puzzle under pressure, with
// the shooters above you. Two secrets of two kinds: the grove behind the east rim (a panel: the last of the oil) and the lodge's cracked back wall.
import { Level } from '../tools/mapkit/builder.mjs';
import { floorBorder } from '../tools/mapkit/accents.mjs';
import { setCell, box, placer } from '../tools/mapkit/c2.mjs';
import { amphitheatre, skinWalls } from '../tools/mapkit/cave.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';

const W = 84, H = 76, CX = 41, CZ = 40, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const ROCK = '[', MOSS = '7', PATH = ',', FLOW = '{', PLANTER = 'Q', HEDGE = 'U', TIMBER = 'W', PLANK = '.';
const S = 0, N = Math.PI;
const polar = (r, deg) => [Math.round(CX - 0.5 + r * Math.cos((deg * Math.PI) / 180)), Math.round(CZ - 0.5 + r * Math.sin((deg * Math.PI) / 180))];
// ---- the bowl: a plaza at the bottom (h 4) and three terraces of beds, a metre each, to the rim (h 10); ramps climb at the south, the north-west and the north-east --------------------------------------------------------------------------------------------
const BOWL = amphitheatre(L, CX, CZ, { rx: 24, rz: 21, steps: 3, rise: 2, bottom: 4, plaza: 0.33, ramps: 3, rampAt: Math.PI / 2, rampWidth: 3, seed: 1414, rough: 0.12, ch: MOSS });
for (const [x, z] of BOWL.cells) { const r = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ); if (BOWL.step(x, z) === 0) setCell(L, x, z, PATH, 4 + (r < 2.2 ? 2 : r < 3.4 ? 1 : 0)); }           // the plaza of swept path, and the mound the tree stands on
const TOP = BOWL.top;
// ---- the planters: stone beds 2 x 2 on the golden angle, on the terraces only (never a ramp, the plaza or the rim's walk) ------------------------------------------------------------------------------------------------------------------------------
const GOLD = (137.50776 * Math.PI) / 180, planters = [];
for (let k = 1; k <= 140; k++) {
  const r = 2.4 * Math.sqrt(k) + 7, th = k * GOLD, x = Math.round(CX - 0.5 + r * 1.1 * Math.cos(th)), z = Math.round(CZ + r * Math.sin(th));
  const cells = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => [x + a, z + b]);
  if (!cells.every(([xx, zz]) => L.g[zz]?.[xx] === MOSS && !BOWL.ramp(xx, zz) && BOWL.step(xx, zz) >= 1)) continue;          // the terraces carry the beds (never the plaza or a ramp)
  if (!cells.every(([xx, zz]) => BOWL.height(xx, zz) === BOWL.height(x, z))) continue;                                                                    // a bed sits on one terrace, never across a cliff
  if (planters.some(([a, b]) => Math.abs(a - x) < 3 && Math.abs(b - z) < 3)) continue;
  box(L, [x, z, x + 1, z + 1], PLANTER); planters.push([x, z]);
}
// ---- the start (a passage onto the south rim), the avenue that climbs out of the bowl to the north, its three walls ------------------------------------------------------------------------------------------------------------------------------------
let zs = 0; for (const [x, z] of BOWL.cells) if (x === CX && z > zs) zs = z;                                                // the southmost rim cell on the axis
box(L, [CX - 1, zs + 1, CX + 1, zs + 6], FLOW, TOP, TOP + 8);
let zn = 99; for (const [x, z] of BOWL.cells) if (x === CX && z < zn) zn = z;                                               // the northmost rim cell on the axis
const AV = [CX - 4, 4, CX + 4, zn - 1];
for (let z = AV[1]; z <= AV[3]; z++) for (let x = AV[0]; x <= AV[2]; x++) setCell(L, x, z, FLOW, TOP + Math.max(0, Math.min(4, Math.floor((zn - 1 - z) / 4))), TOP + 14);          // the avenue climbs 2 m in four steps
const WALLS = [zn - 3, zn - 9, zn - 15];
for (const z of WALLS) { const h = L.ht[z][CX]; for (let x = AV[0]; x <= AV[2]; x++) setCell(L, x, z, HEDGE, h); L.door(CX, z, { remote: true }); L.height([CX, z, CX, z], h); for (const dz of [-1, 1]) for (let x = AV[0]; x <= AV[2]; x++) L.ht[z + dz][x] = h; }
// ---- the gardener's lodge on the west rim (timber, roofed), and the crack in its back wall --------------------------------------------------------------------------------------------------------------------------------------------------------------------
let xw = 99; for (const [x, z] of BOWL.cells) if (z === CZ && x < xw) xw = x;
box(L, [xw - 7, CZ - 4, xw - 1, CZ + 4], TIMBER, TOP); box(L, [xw - 6, CZ - 3, xw - 1, CZ + 3], PLANK, TOP, TOP + 7);
for (let z = CZ - 1; z <= CZ + 1; z++) setCell(L, xw - 1, z, PLANK, TOP, TOP + 7);
box(L, [xw - 11, CZ - 2, xw - 8, CZ + 2], TIMBER, TOP); box(L, [xw - 10, CZ - 1, xw - 8, CZ + 1], PLANK, TOP, TOP + 6);
L.secretPanel(xw - 7, CZ); const LODGE = [xw - 7, CZ];
// ---- the secret grove behind the east rim: a panel, a small round room ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const rowMax = (z) => Math.max(-1, ...BOWL.cells.filter((c) => c[1] === z).map((c) => c[0]));          // the panel goes where the rim's row sticks out furthest (a straight bit of wall above and below it)
const ZG = [CZ + 4, CZ + 3, CZ + 5, CZ + 2, CZ + 6, CZ + 1, CZ + 7, CZ, CZ + 8].find((z) => rowMax(z - 1) <= rowMax(z) && rowMax(z + 1) <= rowMax(z)) ?? CZ + 4, xe = rowMax(ZG);
const SEC = { panel: [xe + 1, ZG], cells: [] };
for (let z = CZ + 2; z <= CZ + 6; z++) for (let x = xe + 2; x <= xe + 6; x++) if (x < W - 1) { setCell(L, x, z, MOSS, TOP + 1, TOP + 15); SEC.cells.push([x, z]); }
setCell(L, xe + 1, ZG, 'S', TOP);
skinWalls(L, ROCK, (x, z) => ((x * 7 + z * 3) % 5 ? HEDGE : PLANTER));
const P = placer(L); L.put(CX, zs + 5, '@'); P.reserve(CX, zs + 5);
const { E, P: PK, PR } = P;
// ---- the tree and the five chimes ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
PR('chimetree', CX, CZ, { id: 'tree', plays: ['r1', 'r2', 'r3'] });
const CHD = [22, 62, 102, 142, 182].map((d) => d + 20), CHR = 5.2;
CHD.forEach((d, n) => PR('chime', ...polar(CHR, d), { id: 'c' + n, note: n }));
for (const d of [0, 60, 120, 180, 240, 300]) PR('lantern', ...polar(6.6, d + 30));
for (const d of [0, 120, 240]) PR('pillar', ...polar(5.9, d + 70), { skin: 'Q' });                                  // three stone posts on the plaza: something to stand behind while the tree plays
for (let i = 0; i < 16; i++) { const [x, z] = planters[i] ?? [CX, CZ + 14]; PR('lantern', x, z - 1); }
for (const z of [zn - 5, zn - 11, zn - 17]) { PR('lantern', AV[0] + 1, z); PR('lantern', AV[2] - 1, z); }
PR('lantern', CX, zs + 3); PR('lamp', xw - 4, CZ - 2); PR('lamp', xw - 4, CZ + 2);
// ---- supplies ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [r, d] of [[16, 90], [12, 40], [12, 140], [17, 0], [17, 180], [9, 270], [14, 220], [14, 320], [19, 60], [19, 120]]) PK((r + d) % 3 ? 'health_small' : 'health_large', ...polar(r, d));
for (const [r, d] of [[18, 90], [10, 200], [15, 300]]) PK('armor_vest', ...polar(r, d));
for (const z of [zn - 6, zn - 12, zn - 18]) PK('health_small', CX + 2, z);
for (let i = 0; i < SEC.cells.length; i += 3) PK(['oil', 'oil', 'health_large', 'armor_vest', 'ammo_cell', 'ammo_shell', 'oil'][i / 3 | 0] ?? 'oil', ...SEC.cells[i]);
PK('ld_slag_carbine', xw - 9, CZ); PK('armor_vest', xw - 10, CZ - 1);                                                   // the lodge's back room
// ---- the Harvesters and their pests: the Zealots on the plaza, the rest on the terraces and the rim (the shooters above you) -------------------------------------------------------------------------------------------------------------------------------------
for (const [r, d] of [[6.8, 30], [6.8, 150], [6.8, 270], [10, 210]]) E('zealot', ...polar(r, d));
for (const [r, d] of [[11, 40], [11, 160], [11, 280], [15, 100], [15, 220], [15, 340], [16, 20]]) E('tollbearer', ...polar(r, d));
for (const [r, d] of [[10, 10], [10, 130], [10, 250], [14, 70], [14, 190], [14, 310], [17, 270], [12, 330]]) E('gaunt', ...polar(r, d));
for (const [r, d] of [[17, 65], [17, 115]]) E('bellhand', ...polar(r, d));                                     // the bell-ringers on the terraces either side of the south ramp: met on the way down, not from behind while the tree plays
E('chorister', ...polar(19, 200)); E('chorister', ...polar(19, 330)); E('gill', ...polar(13, 260)); E('gill', ...polar(13, 20));
// ---- the garden answers: each wall that opens wakes the beds (pests step out of the beds on the first terrace) ----------------------------------------------------------------------------------------------------------------------------------------------
const spawnAt = (list, group) => list.map(([r, d, kind]) => { const [x, z] = polar(r, d); const ok = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]].map(([a, b]) => [x + a, z + b]).find(([xx, zz]) => P.isFloor(xx, zz)) ?? [x, z]; return { spawn: { kind, at: ok, group, facing: N } }; });
const wave1 = spawnAt([[9.5, 20, 'gaunt'], [9.5, 60, 'gaunt'], [9.5, 100, 'tollbearer'], [9.5, 140, 'gaunt'], [9.5, 180, 'tollbearer'], [9.5, 220, 'gaunt']], 'beds1');
const wave2 = spawnAt([[9.5, 30, 'tollbearer'], [9.5, 90, 'gaunt'], [9.5, 150, 'tollbearer'], [9.5, 210, 'gaunt'], [9.5, 270, 'tollbearer'], [9.5, 330, 'gaunt'], [13, 120, 'bellhand']], 'beds2');
const ENC = new Encounters(L);
// PT-083 L2: the level floors
ENC.bypass({ from: [41, 66], to: [44, 60] }); // a gardeners' way behind the hedges
// ---- G3 room accents (Session 12 of design/OPUS_HANDOFF.md, tools/mapkit/accents.mjs): the beds were moss wall to wall, the walks flowstone, the potting shed planks. A terrace edge round the moss, flagstone along the flowstone walks, loft boards round the shed. The second skin is of the same surface family, so
// nothing the simulation does moves (tools/dev/route-fingerprint.mjs: identical) ----
floorBorder(L, [[60,46],[62,38]], '7', '-');
floorBorder(L, [[41,9],[41,15]], '{', 'f');
floorBorder(L, [[14,40]], '.', 'i');
// ---- end G3 room accents ----

const MAP = {
  id: 'C2M14', name: 'Harmonic Gardens', version: 2, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'gardens', sky: 'deep', fog: '#0c1812', fogDensity: 0.01 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'HARMONIC GARDENS', lines: ['A garden sunk in a bowl of terraces, and a tree at the bottom of it.', 'Every plant in it was grown to ring.'] },
  outro: 'The third wall opens on a stair. Behind you the garden is still ringing, very faintly, in a chord you did not play.',
  objective: 'Go down into the garden. The tree at the bottom plays a phrase: answer it on the chimes. Three phrases open the three walls',
  ...L.layers(),
  secrets: [{ id: 'grove', panel: SEC.panel, cells: SEC.cells }, { id: 'lodge', panel: LODGE, cells: [[xw - 9, CZ], [xw - 8, CZ]], open: 'shoot' }],
  groups: [],
  chimes: [{ id: 'r1', phrase: [0, 2, 1], window: 8 }, { id: 'r2', phrase: [3, 1, 4, 0], window: 8 }, { id: 'r3', phrase: [2, 4, 0, 3, 1], window: 8 }],
  entities: [...P.ents, { type: 'exit', at: [CX, AV[1] + 1], dest: 'next' }],
  scenery: [],
  messages: [
    { id: 'start', at: [CX, zs + 4], radius: 3, speaker: 'INES', text: 'A garden in a bowl. Stone beds on a spiral down every terrace, each a little further round than the last. Whoever laid it out did not use a line or a plumb. They used a count.' },
    { id: 'harvest', at: [CX, zs - 3], radius: 4, speaker: 'INES', text: 'Spearmen in green walking the beds with long hooks, picking.' },
    { id: 'plate', at: [CX, CZ + 9], radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: five plants, five notes. A gardener grows one for each, and lays the bed so that a tone from one strikes the next.' },
    { id: 'tree', at: [CX, CZ + 6], radius: 4, speaker: 'HULL', text: 'The tree in the middle plays a phrase when you use it: the fruit light in order, a note each. Answer on the chimes, in order, each within eight seconds of the last.' },
    { id: 'avenue', at: [CX, zn + 1], radius: 4, speaker: 'HULL', text: 'Three walls across the avenue out of the bowl. The tree plays the next phrase that is not yet answered. A wrong note starts the phrase again.' },
    { id: 'r1', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'Three notes, and the first wall has gone back into its bed. It folded. Like a hedge in a wind.' },
    { id: 'r2', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'Four. The second wall. The tree is a count: three, four, and I suppose five.' },
    { id: 'r3', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'Five, and the last wall is open. It was a count the whole way, and the first time the Song has been one I could repeat.' },
    { id: 'hollow', at: [xe, ZG], radius: 2, speaker: 'HULL', text: 'The east rim of the garden rings hollow behind a bed with no plant in it.' },
    { id: 'grove', at: [xe + 4, ZG], radius: 3, speaker: 'A SILENT (NOTE)', text: 'The seed of the chimes is pressed for oil. This is the last pressing before the count was called. Whoever has a lantern, take it.' },
    { id: 'split', at: [xw - 5, CZ], radius: 2, speaker: 'INES', text: 'The gardener\'s lodge. Hooks, twine, a bench, and the back wall split from the floor up where the roots have got into it. A shot would open it.' },
    { id: 'lodge', at: [xw - 9, CZ], radius: 1.5, speaker: 'INES', text: 'The gardener kept a rifle\'s worth of carbine rounds behind the wall, the tips packed in slag. For pests, I imagine.' },
    { id: 'end', at: [CX, AV[1] + 2], radius: 3, speaker: 'INES', text: 'The stair is cut very wide, and the steps are worn on both sides and not in the middle, as though the ones who used it were carrying something between them.' },
  ],
  triggers: [
    { id: 'wall1', when: 'seq:r1', do: [{ open: [CX, WALLS[0]] }, { message: 'r1' }, { objective: 'The first wall is open. Use the tree again: the second phrase' }, ...wave1] },
    { id: 'wall2', when: 'seq:r2', do: [{ open: [CX, WALLS[1]] }, { message: 'r2' }, { objective: 'The second wall is open. Use the tree: the third phrase, five notes' }, ...wave2] },
    { id: 'wall3', when: 'seq:r3', do: [{ open: [CX, WALLS[2]] }, { message: 'r3' }, { objective: 'The third wall is open. The exit is at the top of the avenue' }] },
    { id: 'plaza', when: 'enter', at: [CX, CZ + 4], radius: 6, do: [{ objective: 'The plaza: use the tree (E), strike the chimes in its order' }] },
  ],
  quality: { enemies: [20, 70], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 6, enemyKinds: { zealot: 4, tollbearer: 6, gaunt: 6, bellhand: 2, chorister: 2, gill: 2 },
    scaleClass: 'SET-PIECE', reason: 'the plaza has to be open: five chimes and a tree are played by walking between them in the open, under the pressure of the Harvesters who tend the garden', introduces: 'the chimes: the first sound puzzle, a tree that plays a phrase and five chimes to answer it, three rounds that open three walls, in a garden that fights back' },
};
MAP.drops = { scale: 1, keep: [] };
ENC.apply(MAP);
console.log('C2M14: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'planters', planters.length, 'rim', TOP, 'zs', zs, 'zn', zn, 'xw', xw, 'xe', xe);
const ch = (n) => ({ op: 'chime', id: 'c' + n }), tree = { op: 'chime', id: 'tree' };
const rounds = [[0, 2, 1], [3, 1, 4, 0], [2, 4, 0, 3, 1]];
const solve = (r) => [[...polar(3.6, 90), 0], tree, ...rounds[r].map((n) => ch(n)), { op: 'kill' }];
const down = [[CX, zs + 5, 0], [CX, zs, 0], [CX, CZ + 15], [CX, CZ + 10], [CX, CZ + 7], polar(8, 20), polar(8, 160), polar(8, 270), polar(8, 340), [CX, CZ + 7]];          // down the south ramp, then once round the plaza's edge before the tree is played
const out = [[...polar(19, -90 + 120 * 1 + 90 - 90), 0]];
export const waypoints = { main: [], secret: [] };
{ // up out of the bowl: the ramp at the north-east (rampAt + 240 degrees), the rim, the avenue
  const rampDeg = (90 + 240) % 360, up = [polar(5, rampDeg), polar(10, rampDeg), polar(15, rampDeg), polar(19.5, rampDeg)].map((p) => [...p, 0]);
  const tail = [...up, [CX + 3, zn + 1, 0], [CX, zn, 0], [CX, WALLS[0] + 1, 0], [CX, WALLS[0] - 1, 0], [CX, WALLS[1] - 1, 0], [CX, WALLS[2] - 1, 0], [CX, AV[1] + 1, 0]];
  waypoints.main = [...down, ...solve(0), ...solve(1), ...solve(2), ...tail];
  const west = [polar(19.5, 180 + 30), [xw + 1, CZ - 1, 0], [xw - 3, CZ, 0], { op: 'crack', at: LODGE }, [xw - 9, CZ, 0], [xw - 3, CZ, 0], [xw + 1, CZ - 1, 0]];
  const east = [polar(19.5, 30), [xe - 1, ZG, 0], { op: 'use', at: SEC.panel }, [xe + 4, ZG, 0], [xe - 1, ZG, 0]];
  waypoints.secret = [[CX, zs + 5, 0], [CX, zs, 0], ...[polar(20, 110), polar(20, 150), ...west.slice(0, 1)].map((p) => [...p, 0]), ...west.slice(1), ...[polar(20, 160), polar(20, 120), polar(20, 80), polar(20, 50)].map((p) => [...p, 0]), ...east, [CX, CZ + 15], [CX, CZ + 10], [CX, CZ + 7], ...solve(0), ...solve(1), ...solve(2), ...tail];
  void out;
}
export default MAP;
