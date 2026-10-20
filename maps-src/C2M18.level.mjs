// C2M18 NERVE CATHEDRAL (Campaign 2, Act C; design/ACTC.md section 5). SET-PIECE, threat 6.
// A LATTICE: a cathedral with no floor. In the middle an island, the GANGLION (+3 m), with a great organ rooted in it; round it two square RING bridges (the mid ring at +2 m, the outer ring at +1.5 m) and, under the wall at the edge of the
// map, a RIM walk at +1 m. Eight bridges (two to a side) join island, rings and rim, climbing a half-metre a cell, three cells wide; between them is the void, and under it a second sky. NERVE PULSES run along the bridges: a segment is hot for
// a beat in every four, the segments light in turn from the rim to the island, so a pulse travels inward, and the light comes before the heat. Falling is the old void rule (hurt, back on the last bridge cell, never killed).
// The verb is crossing on a clock. The way on: four nerve KNOTS on the corners of the outer ring (nodes: shoot them), then a CUT lever on the island at the foot of the organ; the exit on the north rim is locked until both.
// Four vents across the void are the shortcuts; a rib-hollow in the rim's south wall holds a cache. Drop-fed ammunition.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';

const W = 100, H = 100, C = 50, L = new Level(W, H, { fill: 'β' }); L.usedHeights = true;
const NERVE = 'Β', VOID = '_', WALL = 'β', BONE = 'γ', FLESH = 'Γ';
const mOf = (x, z) => Math.max(Math.abs(x - C), Math.abs(z - C));
// the height along a bridge at distance m from the centre (half-metre units): island 12, down to the mid ring 8, to the outer ring 6, to the rim 4
const prof = (m) => (m <= 9 ? 12 : m <= 13 ? 12 - (m - 9) : m <= 20 ? 8 : m <= 22 ? 8 - (m - 20) : m <= 30 ? 6 : m <= 32 ? 6 - (m - 30) : 4);
const RING = (m) => (m >= 17 && m <= 20) || (m >= 27 && m <= 30) || (m >= 41 && m <= 44) || m <= 9;
const spokeAt = (x, z) => { const cx = Math.abs(x - C), cz = Math.abs(z - C); return (cx >= 7 && cx <= 9 && cz >= 10 && cz <= 40) || (cz >= 7 && cz <= 9 && cx >= 10 && cx <= 40); };
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  const m = mOf(x, z); if (m > 44) continue;
  if (RING(m) || spokeAt(x, z)) setCell(L, x, z, m >= 41 ? 'Α' : NERVE, prof(m)); else setCell(L, x, z, VOID, 0);
}
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (L.g[z][x] === WALL && mOf(x, z) === 45 && (z < 30 || z > 70)) L.g[z][x] = BONE;       // the walls above and below the rim are the cathedral's ribs
// ---- the root of the organ: a block in the middle of the island, with the lever on its south face -------------------------------------------------------------------------------------------------------------------------------------------------
for (let z = C - 2; z <= C + 1; z++) for (let x = C - 2; x <= C + 2; x++) { L.g[z][x] = BONE; }
const LEVER = { at: [C, C + 2], wall: 'north' };
// ---- the pulses on the bridges: segments in turn from the rim to the island; the second bridge of each side runs half a bar behind --------------------------------------------------------------------------------------------------------------
const pulses = [], SEG = [[37, 40], [33, 36], [23, 26], [14, 16]];                                                    // outermost first (each [m0, m1] inclusive)
const sides = [{ ax: 'z', sgn: -1 }, { ax: 'x', sgn: 1 }, { ax: 'z', sgn: 1 }, { ax: 'x', sgn: -1 }];                  // north, east, south, west
for (const sd of sides) for (const lat of [-8, 8]) SEG.forEach(([m0, m1], j) => {
  const a = Math.min(C + sd.sgn * m0, C + sd.sgn * m1), b = Math.max(C + sd.sgn * m0, C + sd.sgn * m1), l0 = C + lat - 1, l1 = C + lat + 1;
  const rect = sd.ax === 'z' ? [l0, a, l1, b] : [a, l0, b, l1];
  L.fx(rect, 's'); pulses.push({ rect, period: 6, on: 1.5, phase: (6 - 1.5 * j + (lat > 0 ? 3 : 0)) % 6 });
});
// ---- the rib-hollow: a cache in the south wall of the rim (the rim is rows 91..94; the wall 95; the cache 96..98) -----------------------------------------------------------------------------------------------------------------------------------
const XS = 30, ZS = 95, SEC = { panel: [XS, ZS], cells: [] };
for (let z = ZS + 1; z <= ZS + 3; z++) for (let x = XS - 2; x <= XS + 2; x++) { setCell(L, x, z, FLESH, 4); SEC.cells.push([x, z]); }
L.g[ZS][XS] = 'S'; L.ht[ZS][XS] = 4;
// ---- objects -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; L.put(6, C, '@'); P.reserve(6, C);
// lamps: posts along the rim, the rings and the island, and two beside the lever
for (const [x, z] of [[8, 30], [8, 70], [92, 30], [92, 70], [32, 8], [68, 8], [34, 92], [66, 92], [20, 36], [20, 64], [80, 36], [80, 64], [36, 20], [64, 20], [36, 80], [64, 80], [33, 38], [33, 62], [67, 38], [67, 62], [38, 33], [62, 33], [38, 67], [62, 67]]) PR('lamppost', x, z);
for (const [x, z] of [[C - 3, C + 3], [C + 3, C + 3], [C - 6, C - 6], [C + 6, C - 6], [C - 6, C + 6], [C + 6, C + 6]]) PR('lamppost', x, z);
// columns of nerve (cover) on the corners of the rings
for (const [dx, dz] of [[-25, -25], [25, -25], [25, 25], [-25, 25], [-17, -17], [17, -17], [17, 17], [-17, 17]]) { PR('pillar', C + dx, C + dz); }
for (const [dx, dz] of [[-28, -25], [-25, -28], [28, -25], [25, -28], [28, 25], [25, 28], [-28, 25], [-25, 28]]) { PR('pillar', C + dx, C + dz); }
// the knots: four, on the corners of the outer ring
for (const [dx, dz] of [[-28, -28], [28, -28], [28, 28], [-28, 28]]) E('bellnode', C + dx, C + dz, { group: 'knots' });
// the garrison
const R = (list, kind, extra = {}) => list.forEach(([x, z]) => E(kind, x, z, extra));
const hv = { variant: 'hived' };
R([[22, 30], [34, 22], [66, 22], [78, 34], [78, 66], [66, 78], [34, 78], [22, 66]], 'tollbearer', hv);                       // the outer ring's patrols
R([[26, 44], [74, 56], [56, 26], [44, 74]], 'zealot');
R([[25, 36], [64, 25], [36, 75]], 'chorister');
R([[10, 44], [90, 56], [56, 10], [44, 90], [30, 58], [70, 42]], 'gaunt');
R([[32, 32], [68, 32], [68, 68], [32, 68]], 'gill');
R([[24, 50], [76, 50]], 'bellhand'); E('sexton', 50, 24); E('bulwark', 58, 56, { facing: 0 });
R([[40, 56], [60, 44], [46, 40], [54, 60], [36, 56], [64, 44], [66, 30], [34, 70]], 'tollbearer');
R([[68, 44], [32, 56], [56, 68], [44, 32]], 'chorister');                                                              // the mid ring's mouths, the other bridges
R([[32, 44], [68, 56], [56, 32], [44, 68], [22, 56]], 'zealot');
R([[78, 30], [22, 30], [22, 70], [40, 22], [60, 78]], 'gaunt');
R([[12, 50], [88, 50], [50, 90]], 'bellhand'); E('sexton', 50, 78); E('sexton', 50, 66); E('bulwark', 50, 32, { facing: 0 });
R([[40, 44], [60, 56]], 'gill');
// health ON the lane (the route walks the west spoke, the outer ring, the west spoke again, the island and the north spoke)
const HEALTH = [[12, 42, 'health_small'], [22, 36, 'health_small'], [36, 22, 'health_large'], [62, 22, 'health_small'], [78, 36, 'health_large'], [78, 62, 'health_small'], [64, 78, 'health_large'], [36, 78, 'health_small'], [22, 66, 'health_large'], [28, 58, 'health_small'], [38, 58, 'health_large'], [44, 46, 'health_small'], [42, 36, 'health_small'], [42, 24, 'health_large']];
for (const [x, z, k] of HEALTH) PK(k, x, z);
for (const [x, z] of [[78, 50], [22, 50], [50, 22]]) PK('armor_vest', x, z);
PK('armor_vest', XS - 1, ZS + 2); PK('ammo_rocket', XS + 1, ZS + 2); PK('ammo_rocket', XS, ZS + 3); PK('health_large', XS, ZS + 1); PK('ammo_round', XS - 2, ZS + 3);

const EXIT = [C, 7];
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [36,79], radius: 2, cells: ENC.around([36,79], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M18', name: 'Nerve Cathedral', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'nerve', sky: 'hive', beat: true, fog: '#1c0e22', fogDensity: 0.01 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 24, rivet: 100, bolt: 18, cell: 50, round: 50, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'NERVE CATHEDRAL', lines: ['A hall with no floor: an island, two rings, a rim and eight bridges over a drop.', 'Every bridge lights a segment at a time. The light comes first.'] },
  outro: 'The organ hung slack and the bridges stopped lighting. At the north rim the wall opened on a stair, going down.',
  objective: 'Cross the bridges to the outer ring. The light on a segment comes before the heat: cross on the dark',
  ...L.layers(),
  secrets: [{ id: 'rib-hollow', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  pulses,
  vents: [{ at: [C, 23], to: [C, 31], time: 3 }, { at: [C + 27, C], to: [C + 19, C], time: 3 }, { at: [C, C + 27], to: [C, C + 19], time: 3 }, { at: [C - 27, C], to: [C - 19, C], time: 3 }],
  entities: [...P.ents,
    { type: 'switch', id: 'cut', at: LEVER.at, wall: LEVER.wall, once: true, do: [{ message: 'cut' }, { objective: 'The ganglion is cut. The exit is on the north rim' }] },
    { type: 'exit', at: EXIT, dest: 'next', locked: true }],
  scenery: [{ kind: 'ganglion', at: [C, C], y: 8, scale: 1.5 }],
  messages: [
    { id: 'start', at: [7, 50], radius: 5, speaker: 'INES', text: 'A cathedral with no floor. An island in the middle, two rings round it, and eight bridges over a drop I cannot see the bottom of. Every bridge lights one segment at a time.' },
    { id: 'pulse', at: [10, 42], radius: 5, speaker: 'HULL', text: 'The light comes first, then the heat. A segment that has just gone dark is safe to cross for about four seconds.' },
    { id: 'strand', at: [20, 42], radius: 4, speaker: 'INES', text: 'A strand as thick as a hawser runs along the rail. A brass badge is fused into it, a Port Marrow harbour badge, number 118. The harbour issued them in order.' },
    { id: 'knots', at: [22, 36], radius: 6, speaker: 'HULL', text: 'A knot is where the lattice is tied off. There is one on every corner of this ring. Break all four and the strands they hold go slack.' },
    { id: 'tally', at: [50, 22], radius: 5, speaker: 'TALLY PLATE', text: 'HELD IN THE LATTICE: 1,218. Under it, in a second hand: NOT YET SUNG. The mark beside the number is the one the Vael use for a name.' },
    { id: 'island', at: [42, 40], radius: 5, speaker: 'INES', text: 'The organ is rooted in the island like a tooth. Every strand in the cathedral comes back to it. There is a lever low on the root, under two lamps.' },
    { id: 'lever', at: [C, C + 3], radius: 3, speaker: 'HULL', text: 'The cut lever is on the south face of the root, under the lamps. It does nothing while a knot still ties the lattice.' },
    { id: 'cut', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The root has let go of the strands. Every bridge has stopped lighting.' },
    { id: 'door', at: [C, 11], radius: 4, speaker: 'HULL', text: 'The north wall is shut. It opens when the four knots are broken and the root is cut, in either order.' },
    { id: 'hollow', at: [XS, 92], radius: 3, speaker: 'HULL', text: 'The rim wall rings hollow here. There is a seam in the bone.' },
    { id: 'cache', at: [XS, ZS + 2], radius: 3, speaker: 'A SILENT (NOTE)', text: 'For whoever walks the bridges. I kept this under the rim. The bridges are cooler at the edges; it is the middle they keep hot.' },
  ],
  triggers: [
    { id: 'ring', when: 'enter', at: [C - 28, C], radius: 9, do: [{ objective: 'Break the four knots on the outer ring, then cut the organ on the island' }] },
    { id: 'island-in', when: 'enter', at: [C, C], radius: 9, do: [{ spawn: { kind: 'tollbearer', variant: 'hived', at: [C - 6, C + 5], group: 'drop' } }, { spawn: { kind: 'tollbearer', variant: 'hived', at: [C + 6, C + 5], group: 'drop' } }, { spawn: { kind: 'tollbearer', variant: 'hived', at: [C + 6, C - 6], group: 'drop' } }] },
    { id: 'knots-down', when: 'dead:knots', do: [{ objective: 'All four knots are broken. Cut the organ: the lever is on the island' }] },
    { id: 'open', when: ['dead:knots', 'msg:cut'], do: [{ exit: { set: 'unlock' } }, { objective: 'The lattice is slack. The exit is on the north rim' }] },
  ],
  quality: { enemies: [30, 70], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 5,
    enemyKinds: { bellnode: 4, tollbearer: 8, zealot: 3, chorister: 3, gaunt: 5, gill: 3, bellhand: 2, sexton: 1, bulwark: 1 },
    scaleClass: 'SET-PIECE', reason: 'the place is a lattice over a drop: the player crosses open bridges on a clock, and every ring is a place to be seen from', introduces: 'a lattice over a void crossed on a pulse clock: the bridges light a segment at a time, from the rim to the island, and the light comes before the heat' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M18: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'pulses', pulses.length);
const X = (x, z) => [x, z];
const main = [X(6, 50), X(14, 42), X(21, 42), X(21, 34), X(21, 24), X(36, 21), X(50, 21), X(64, 21), X(79, 21), X(79, 36), X(79, 50), X(79, 64), X(79, 79), X(64, 79), X(50, 79), X(36, 79), X(21, 79), X(21, 64), X(21, 58), X(26, 58), X(32, 58), X(38, 58), X(44, 54), X(47, 54)];
export const waypoints = {
  main: [[6, 50, 0], ...main.slice(1), { op: 'switch', id: 'cut' }, [44, 46, 0], [42, 38], [42, 30], [42, 22], [42, 14], [44, 9, 0], [C, 8, 0], [C, 7, 0]],
  secret: [[6, 50, 0], [6, 70, 0], [6, 88, 0], [20, 93, 0], [XS, 93, 0], { op: 'use', at: [XS, ZS] }, [XS, ZS + 2, 0], [XS, 93, 0], [14, 42, 0], ...main.slice(2), { op: 'switch', id: 'cut' }, [44, 46, 0], [42, 38], [42, 30], [42, 22], [42, 14], [44, 9, 0], [C, 8, 0], [C, 7, 0]],
};
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M18', lane: [...(laneOf('C2M18') ?? [])], keep: [], plan: [{"pick":"range","from":"tollbearer","to":"mender","n":2}] };
ENC.apply(MAP);

// ---- PT-070 unless (the story pass): reminders that are silent once the thing they remind of has happened
for (const [mid, unless] of Object.entries({ "door": ["msg:cut"] })) MAP.messages.find((m) => m.id === mid).unless = unless;
// ---- end PT-070 unless
export default MAP;
