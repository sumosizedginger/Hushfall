// C2M16 SOUNDING DEEP HEART: the boss; the Sub-Cantor. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md, design/LORE.md section 2b.)
// The bottom of the Deep: a cavern in two lobes joined at the waist, floored in a warm skin and walled in membrane, and hung over the waist a mass of swollen flesh on cords of vein: the heart that the district's whole
// Song is kept in. The west lobe is the GUARD HALL (three Zealots in a rank, porters, singers, four pillars of flesh for cover); the east lobe is the Sub-Cantor's, a round floor with a low dais in the middle where it stands, four
// FORKS (`bellnode`, the nodes) at the corners of the lobe holding a note it no longer remembers, and six pillars of flesh round the dais. The SUB-CANTOR (engine PT-039) keeps its distance and never speaks; it breathes out a
// tone pulse that goes out across the floor TO 22 m, TURNS BACK and comes home to it: the ring that passed you comes round again, so cover that held for the ring going out has to be held for the ring coming in. It is
// shielded (5%) while any fork stands; once the forks are down it fans toll-shots; it calls Gaunts out of the lobe's edge. When it falls its phrase stops in the middle of a bar. The exit, east of the dais, opens when it is dead.
// A seam in the guard hall's north wall hides the last cache. Drop-fed ammunition keeps its boxes (a boss map).
// SHAPE: two blobs and a waist (the cave kit), a dais, pillars; no rectangle but the exit corridor. Scale class SET-PIECE (the lobes are open to the cave's roof: sky_deep; the boss needs the room it keeps).
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, box, ellipse, placer, FLOORS } from '../tools/mapkit/c2.mjs';
import { blob, finger, smooth, rng } from '../tools/mapkit/cave.mjs';

const W = 100, H = 90, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const ROCK = '[', FLESH = '>', SKIN = '0', FLOOR = '@', SLAB = '^', MEMB = '0';
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const F = 8;
const lobeA = blob(L, 30, 44, 15, 16, { seed: 161, rough: 0.12, ch: FLOOR, h: F });
const waist = finger(L, [40, 44], [56, 44], { seed: 162, width: 9, wobble: 2, ch: FLOOR, h: F });
const lobeB = blob(L, 70, 44, 17, 17, { seed: 163, rough: 0.1, ch: FLOOR, h: F });
const startRoom = blob(L, 8, 44, 5, 5, { seed: 164, rough: 0.2, ch: FLESH, h: F, lidMid: 24, lidEdge: 20 });
finger(L, [12, 44], [20, 44], { seed: 165, width: 4, wobble: 1, ch: FLESH, h: F, lid: 22 });
// the exit corridor, east of the dais: a straight roofed passage in the lobe's east wall
box(L, [86, 42, 92, 46], FLESH, F, 22);
// ---- the dais: a low step up in the middle of the east lobe --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const DX = 71, DZ = 44;
ellipse(L, DX, DZ, 6, 6, 's', F + 1);                                                                                         // (half a metre: a ring that leaves a boss standing higher than a metre above the floor passes over everyone)
// ---- pillars of flesh: six round the dais, four in the guard hall ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const pillars = [];
const pillar = (x, z) => { box(L, [x, z, x + 1, z + 1], MEMB); pillars.push([x, z]); };
for (let k = 0; k < 6; k++) { const a = (k * 60 + 30) * Math.PI / 180; pillar(Math.round(DX - 0.5 + 10.5 * Math.cos(a)), Math.round(DZ - 0.5 + 10.5 * Math.sin(a))); }
for (const [x, z] of [[24, 36], [24, 52], [36, 36], [36, 52]]) pillar(x, z);
// ---- the seam: a cache in the north wall of the guard hall -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let zn = 99, xn = 30; for (const [x, z] of lobeA) if (x >= 26 && x <= 34 && z < zn) { zn = z; xn = x; }
const SEC = { panel: [xn, zn - 1], cells: [] };
for (let z = zn - 4; z <= zn - 2; z++) for (let x = xn - 2; x <= xn + 2; x++) { setCell(L, x, z, SLAB, F, F + 12); SEC.cells.push([x, z]); }
setCell(L, xn, zn - 1, 'S', F);
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (L.g[z][x] === ROCK) { let t = false; for (let dz = -1; dz <= 1 && !t; dz++) for (let dx = -1; dx <= 1; dx++) if (FLOORS.has(L.g[z + dz][x + dx])) { t = true; break; } if (t) L.g[z][x] = (x * 5 + z * 3) % 4 ? MEMB : ROCK; }
const P = placer(L); L.put(6, 44, '@'); P.reserve(6, 44);
const { E, P: PK, PR } = P;
// ---- light: lanterns at the edges of both lobes, lamps over the dais ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[20, 34], [20, 54], [30, 30], [30, 58], [42, 40], [42, 48], [56, 38], [56, 50], [60, 32], [60, 56], [70, 30], [70, 58], [82, 36], [82, 52]]) PR('lantern', x, z);
for (const [x, z] of [[8, 46], [14, 44]]) PR('lantern', x, z);
for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) PR('lantern', DX + dx, DZ + dz);                                                  // four lanterns round the dais: the conductor is lit
// ---- the forks: the Sub-Cantor's four nodes, at the corners of its lobe ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[62, 33], [62, 55], [80, 33], [80, 55]]) E('bellnode', x, z, { group: 'forks' });
// ---- the boss, with its call for Gaunts from the edge of the lobe --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
E('subcantor', DX, DZ, { group: 'subcantor', facing: WEST, summons: [[58, 40], [58, 48], [84, 38], [84, 50], [70, 30], [70, 58]] });
// ---- the guard hall: ranks of Zealots, porters, singers ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[30, 42], [30, 46], [37, 44]]) E('zealot', x, z, { facing: WEST });
for (const [x, z, k] of [[22, 38, 'tollbearer'], [22, 50, 'tollbearer'], [28, 34, 'tollbearer'], [28, 54, 'tollbearer'], [34, 44, 'tollbearer'], [26, 30, 'gaunt'], [32, 56, 'gaunt'], [38, 34, 'gaunt'], [38, 54, 'gaunt']]) E(k, x, z);
E('chorister', 33, 38); E('chorister', 33, 50);
// ---- health and armour (the boss map keeps every box of ammunition on the ground) ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[8, 42], [14, 44], [22, 36], [22, 52], [34, 44], [44, 44], [52, 44], [60, 38], [60, 50], [66, 34], [66, 54], [76, 34], [76, 54], [82, 44], [88, 44]]) PK((x + z) % 3 ? 'health_small' : 'health_large', x, z);
for (const [x, z] of [[10, 44], [30, 40], [48, 40], [64, 36], [78, 52]]) PK('armor_vest', x, z);
for (const [x, z, k] of [[18, 44, 'ammo_rivet'], [28, 38, 'ammo_shell'], [28, 50, 'ammo_flare'], [46, 44, 'ammo_bolt'], [60, 44, 'ammo_rivet'], [66, 38, 'ammo_shell'], [66, 50, 'ammo_cell'], [76, 38, 'ammo_flare'], [76, 50, 'ammo_rivet'], [50, 44, 'ammo_cell'], [80, 44, 'ammo_bolt'], [42, 44, 'ammo_shell'], [14, 42, 'ammo_rivet'], [24, 44, 'ammo_rivet'], [56, 42, 'ammo_rivet'], [64, 44, 'ammo_rivet'], [84, 42, 'ammo_rivet']]) PK(k, x, z);
PK('armor_vest', xn - 1, zn - 3); PK('health_large', xn + 1, zn - 3); PK('ammo_shell', xn - 1, zn - 2); PK('ammo_rivet', xn + 1, zn - 2); PK('ammo_flare', xn, zn - 3);
const MAP = {
  id: 'C2M16', name: 'Sounding Deep Heart', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'heart', sky: 'deep', fog: '#1a0610', fogDensity: 0.012 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 16, shell: 24, rivet: 100, bolt: 12, cell: 50, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'SOUNDING DEEP HEART', lines: ['The bottom of the Deep: a floor like skin, and over it the thing that the Song is kept in.', 'One conductor stands between you and the stair.'] },
  outro: 'The conductor stopped in the middle of a bar. The forks rang on without it, one at a time, and then they stopped too. Beyond the corridor the stair goes down again, and it is cold.',
  objective: 'Cross the guard hall to the waist. The Sub-Cantor is on its dais in the east lobe: break its four forks to drop its shield, then break it. Its ring comes back',
  ...L.layers(),
  secrets: [{ id: 'seam', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents, { type: 'exit', at: [91, 44], dest: 'next', locked: true }],
  scenery: [{ kind: 'heartmass', at: [48, 44], y: 11, scale: 1.4 }],
  messages: [
    { id: 'start', at: [7, 44], radius: 4, speaker: 'INES', text: 'The floor is warm. Not heated: warm, like a hand. The wall has a grain, the way a muscle does, and it\'s moving very slowly in and out.' },
    { id: 'hall', at: [20, 44], radius: 5, speaker: 'INES', text: 'A hall of spears in ranks again, facing the way I came in. They have stopped expecting anyone from the other side.' },
    { id: 'plate', at: [32, 44], radius: 4, speaker: 'RINGING PLATE', text: 'Run a nail down it: the count of this district, kept on one note. The note is in four forks. It has not been struck since the conductor lost it.' },
    { id: 'heart', at: [47, 44], radius: 5, speaker: 'INES', text: 'It hangs from the roof on cords as thick as a mast, and it\'s the size of a house. It\'s beating, once in about as long as it takes to say so.' },
    { id: 'boss', at: [60, 44], radius: 5, speaker: 'INES', text: 'One Vael on a round dais with a rod in one hand and the other up in front of its face. It\'s looking at the forks.' },
    { id: 'ring', at: [56, 44], radius: 5, speaker: 'HULL', text: 'Its breath is a ring across the floor, to the wall and back. A pillar stops it going out and coming in. Stand behind one, and keep standing there until the second one has passed.' },
    { id: 'shield', at: [58, 44], radius: 4, speaker: 'HULL', text: 'It takes a twentieth of what you hit it with while any fork stands. The forks are at the corners of the lobe and they can be broken.' },
    { id: 'hollow', at: [xn, zn + 1], radius: 2, speaker: 'HULL', text: 'The guard hall wall rings hollow in the north, in a seam of paler skin.' },
    { id: 'seam', at: [xn, zn - 3], radius: 3, speaker: 'A SILENT (NOTE)', text: 'For whoever is sent to stop it. It never wanted to be a conductor, and nobody asked. Do not make it suffer: it has been afraid for a long time.' },
    { id: 'dead', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'It said nothing the whole time. Its last note went out across the floor and, for once, did not come back.' },
    { id: 'end', at: [90, 44], radius: 3, speaker: 'INES', text: 'A corridor, straight, the first straight thing in the whole Deep. Cold air at the far end. What is below this isn\'t warm.' },
    { id: 'last-call', at: [92, 44], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the conductor was the hum I was riding, and it has stopped. This is the last I can hold. The lamp is lit and the tea is cold. I\'m here until the set goes.' },
  ],
  triggers: [
    { id: 'hall', when: 'enter', at: [22, 44], radius: 6, do: [{ objective: 'The guard hall: spears in ranks. The waist is east, past the heart' }] },
    { id: 'lobe', when: 'enter', at: [62, 44], radius: 6, do: [{ objective: 'The Sub-Cantor holds the east lobe: the four forks first, then the conductor' }] },
    { id: 'forks-down', when: 'dead:forks', do: [{ objective: 'The forks are down and its shield with them. Break the conductor' }] },
    { id: 'boss-down', when: 'dead:subcantor', do: [{ exit: { set: 'unlock' } }, { objective: 'The conductor is down. The corridor east of the dais is open' }, { message: 'dead' }] },
  ],
  quality: { enemies: [15, 60], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 6, enemyKinds: { subcantor: 1, bellnode: 4, zealot: 3, tollbearer: 5, gaunt: 4, chorister: 2 },
    scaleClass: 'SET-PIECE', reason: 'the boss needs the floor: a ring that goes out to 22 m and comes back is a thing you stand in the open and hide from, and the lobes are the arena', introduces: 'the Sub-Cantor: a boss whose tone ring turns back at the edge of the lobe and comes home to it, so cover has to hold twice, and whose shield is four forks' },
};
MAP.drops = { scale: 1.3, keep: [[0, 0, 999, 999]] };
console.log('C2M16: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'pillars', pillars.length, 'sec', SEC.cells.length, 'xn zn', xn, zn);
export const waypoints = {
  main: [[6, 44, 0], [14, 44, 0], [20, 44], [26, 44], [32, 44], [40, 44], [48, 44], [56, 44], [60, 44], { op: 'killboss' }, [80, 44, 0], [86, 44, 0], [91, 44, 0]],
  secret: [[6, 44, 0], [14, 44, 0], [20, 44], [xn, zn + 3], { op: 'use', at: [xn, zn - 1] }, [xn, zn - 3, 0], [xn, zn + 3, 0], [26, 44], [32, 44], [40, 44], [48, 44], [56, 44], [60, 44], { op: 'killboss' }, [80, 44, 0], [86, 44, 0], [91, 44, 0]],
};
export default MAP;
