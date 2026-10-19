// C2M04 TUNING FORK FIELDS: sound-lure hazards; the Song is an economy. (Campaign 2, Act A THRESHOLD.)
// A hillside of three terraces, each a field of standing forks (the resonators: they ring at a noise, call the forks beside them and wake everything asleep near them) with a long roofed FORCING HALL behind it where the spare forks hang. You climb by stairs at the ends of the halls, zig-zagging west and east
// (L1 -> L2 at the east, L2 -> L3 at the west, L3 -> the plateau at the east), to the TUNING TOWER on the plateau: a round bell house with the great bell and a lever on its stand, which works the north gate. The harvesters (Tollbearers) tend the forks and are asleep on their feet along the rows. The answer is the gun you
// choose: the arc lamp (14 m: a fork hears it from 8 m), a blow (9 m) and the tuning-fork gun (12 m) are quiet; a rivet driver is heard from 12 m, a rocket from 18 m, and a row of twenty forks takes twenty seconds to ring through. Some forks wear a plate on their foot: they are people.
// SHAPE: a hillside of terraces (0 / 2 / 4 / 6 m), halls with doorways to the fields, stair rooms at alternating ends, a round tower on the plateau (the big thing). Scale class MIXED (the halls, the stair rooms and the tower are roofed: about 46%).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { setCell, ellipse, ellipseCells, box, ramp, placer, ring } from '../tools/mapkit/c2.mjs';

const W = 80, H = 78, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
const XA = 16, XB = 63, LV = [{ zb: 70, h: 0 }, { zb: 55, h: 4 }, { zb: 40, h: 8 }];
const stairAt = [[60, 63], [16, 19], [60, 63]];                                                            // the stair room of each level: east, west, east
// ---- the three levels: field (open turf), a wall with three doorways, a roofed hall, its north wall with the stair room's opening --------------------------------------------------------------------------------------------------------------
LV.forEach(({ zb, h }, k) => {
  box(L, [XA, zb - 6, XB, zb], '-', h);                                                                      // the field
  box(L, [XA, zb - 7, XB, zb - 7], '$', h); for (const dx of [8, 24, 40]) box(L, [XA + dx, zb - 7, XA + dx + 2, zb - 7], '.', h, h * 1 + 9);         // the wall between the field and the hall, three doorways
  box(L, [XA, zb - 13, XB, zb - 8], '.', h, h + 9);                                                          // the forcing hall: planks, a lid 4.5 m up
  box(L, [XA, zb - 14, XB, zb - 14], '$', h);                                                                // the hall's north wall
  const [sa, sb] = stairAt[k];
  for (let z = zb - 13; z <= zb - 8; z++) for (let x = sa; x <= sb; x++) setCell(L, x, z, '.', h + [4, 3, 2, 1, 0, 0][z - (zb - 13)], h + 9 + 4);    // the stair room: from the hall's level (south) up 2 m to the next field (north)
  box(L, [sa, zb - 14, sb, zb - 14], '.', h + 4, h + 13);                                                    // ... and out through the hall's north wall
  const wallX = sa === 60 ? 59 : 20; for (let z = zb - 12; z <= zb - 9; z++) setCell(L, wallX, z, '$', h);   // the stair room's side wall
});
// ---- the plateau and the tuning tower ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [XA, 6, XB, 25], '-', 12);
const TOWER = ellipse(L, 40, 16, 8.5, 7, 'f', 12, 20); const TS = new Set(TOWER.map(([x, z]) => x + ',' + z));
for (const [x, z] of ellipseCells(40, 16, 10.2, 8.7)) if (!TS.has(x + ',' + z)) setCell(L, x, z, '%', 12);       // the tower's wall: a ring of basalt round its floor
for (let z = 22; z <= 26; z++) for (const x of [39, 40, 41]) setCell(L, x, z, 'f', 12, 20);                    // the tower's door on the south side
for (const [cx, cz, rx, rz] of [[24, 18, 2, 1.5], [56, 18, 2.5, 1.5], [22, 10, 2, 1.5], [58, 10, 2, 1.5]]) ellipse(L, cx, cz, rx, rz, '!', 12);   // rocks on the plateau
box(L, [38, 0, 42, 5], '$', 12); box(L, [39, 1, 41, 5], ')', 12, 22); L.door(40, 5, { remote: true }); setCell(L, 40, 5, 'D', 12); setCell(L, 39, 5, '$', 12); setCell(L, 41, 5, '$', 12);   // the north gate and the way out
// ---- the cliff round it all: the fill is glass crust; the sheds and halls are salt plate, the tower basalt -----------------------------------------------------------------------------------------------------------------------------------------------------
ring(L, '!', (x, z) => (z >= 26 && z <= 71 && x >= 14 && x <= 65 ? '$' : (x >= 28 && x <= 52 && z >= 5 && z <= 27 ? '%' : '!')));
const P = placer(L); L.put(18, 68, '@'); P.reserve(18, 68);
const { E, P: PK, PR } = P;
// ---- the forks: CLUSTERS of three, set far apart (more than 18 m between one cluster and the next), so a ring wakes only what tends that cluster: fight away from the forks (pull the harvesters out of their zone), or choose the gun --------------------
const cluster = (cx, cz) => { PR('resonator', cx, cz); PR('resonator', cx + 2, cz + 1); PR('resonator', cx + 1, cz - 2); };
LV.forEach(({ zb }) => {
  for (const x of [32, 52]) cluster(x, zb - 3 - (x === 52 ? 1 : 0));                                      // three clusters in each field
  for (const x of [28, 52]) cluster(x, zb - 10);                                                              // two in each hall
});
cluster(22, 22); cluster(58, 22);                                                                             // and on the plateau, outside the tower
// ---- the harvesters and the guards -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[24, 66], [36, 67], [48, 66], [58, 67]]) E('tollbearer', x, z);                         // field one
for (const [x, z] of [[22, 51], [34, 52], [46, 51]]) E('tollbearer', x, z); E('gaunt', 56, 52);
for (const [x, z] of [[24, 36], [50, 36]]) E('tollbearer', x, z); E('gaunt', 38, 37); E('gaunt', 60, 37);
E('gaunt', 26, 60); E('gaunt', 46, 59); E('gaunt', 34, 45); E('gaunt', 52, 44); E('gaunt', 28, 29); E('gaunt', 46, 30);   // the halls
E('bellhand', 56, 45); E('bellhand', 36, 30); E('bellhand', 56, 59);
E('sexton', 40, 59); E('sexton', 24, 44); E('sexton', 44, 29);
E('gill', 30, 62); E('gill', 50, 48); E('gill', 30, 34); E('gill', 50, 14);
E('tollbearer', 28, 20); E('tollbearer', 52, 20); E('bulwark', 37, 19); E('bulwark', 43, 19); E('gaunt', 40, 12);         // the plateau and the tower
E('gaunt', 35, 14); E('gaunt', 45, 14); E('gaunt', 40, 3);
// ---- supplies and furniture -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[19, 68], [40, 66], [62, 66], [62, 58], [24, 52], [62, 52], [18, 44], [40, 50], [62, 44], [20, 38], [40, 33], [62, 30], [20, 22], [40, 26], [60, 22]]) PK(x % 3 ? 'health_small' : 'health_large', x, z);
PK('armor_vest', 62, 62); PK('armor_vest', 18, 47); PK('armor_vest', 62, 32); PK('armor_vest', 40, 26);
for (const [x, z] of [[30, 66], [54, 66], [30, 51], [54, 51], [30, 36], [54, 36]]) PR('crate', x, z);
for (const [x, z] of [[24, 60], [40, 60], [56, 60], [24, 45], [40, 45], [56, 45], [24, 30], [40, 30], [56, 30]]) PR('lamp', x, z);
for (const [x, z] of [[38, 17], [42, 17], [40, 14]]) PR('lantern', x, z);
PR('bellnode', 40, 10);                                                                                         // the great bell, on its stand at the north of the tower
for (const [x, z] of [[34, 16], [46, 16]]) PR('pillar', x, z, { skin: '%' });
// ---- the secret: a shed in the east cliff of the first field: the harvesters' store (and a plate) -------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [64, 67], cells: [[65, 66], [66, 66], [67, 66], [65, 67], [66, 67], [67, 67], [65, 68], [66, 68], [67, 68]] };
{ for (const [x, z] of SEC.cells) setCell(L, x, z, '.', 0, 8); box(L, [64, 65, 68, 65], '$', 0); box(L, [64, 69, 68, 69], '$', 0); box(L, [68, 66, 68, 68], '$', 0); setCell(L, 64, 66, '$', 0); setCell(L, 64, 68, '$', 0); setCell(L, 64, 67, 'S', 0);
  PK('armor_vest', 65, 66); PK('health_large', 67, 66); PK('ammo_shell', 65, 68); PK('ammo_rivet', 67, 68); PK('ammo_flare', 66, 67); }
// ---- rooms that are not boxes (tools/mapkit/shape.mjs: only floor is added and corners are cut, away from every object and the routes' lane; the routes prove nothing moved: route-fingerprint.mjs) ----
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';
const S = new Shape(L, { lane: laneOf('C2M04'), keep: [[32, 16]] });                                       // the lever's wall stays
for (const { zb } of LV) { S.chamfer([XA, zb - 6, XB, zb], 'nw ne sw se', 2); S.hall([XA, zb - 13, XB, zb - 8], { sides: { s: { w: 3, gap: 5, d: 1 } }, cut: 2 }); }
S.chamfer([XA, 6, XB, 25], 'nw ne sw se', 3);
console.log('C2M04 shape:', S.summary()); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end shaping ----
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [41,49], radius: 2, cells: ENC.around([41,49], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [62,25], radius: 2, cells: ENC.around([62,25], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M04', name: 'Tuning Fork Fields', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#d0c090', fogDensity: 0.005, sky: 'anselm', look: 'fields' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'TUNING FORK FIELDS', lines: ['Every row on this hill is a fork, and every fork has been tuned.', 'What gets struck here is paid for somewhere else.'] },
  outro: 'Next: the Reliquary Road, where the Vael keep the people they have finished with.',
  objective: 'Climb the hill: a stair at the end of each hall. The tower is on the plateau',
  ...L.layers(),
  secrets: [{ id: 'store', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'tune', at: [32, 16], wall: 'west', once: true, do: [{ open: [40, 5] }, { message: 'tune' }, { objective: 'The north gate is open: the corridor beyond it goes to the exit' }, { shake: 1.5 }] },
    { type: 'exit', at: [40, 2], dest: 'next' }],
  scenery: [{ kind: 'spire', at: [12, -6] }, { kind: 'spire', at: [66, -10] }, { kind: 'spire', at: [40, -22] }],
  messages: [
    { id: 'start', at: [18, 68], radius: 3, speaker: 'INES', text: 'Terraces, and on every terrace a row of standing forks, brass and green, taller than a man. They are all humming. Not a sound I would put a word to.' },
    { id: 'fork', at: [24, 64], radius: 3, speaker: 'HULL', text: 'A fork rings at a shot, answers its neighbours down the row, and everything asleep near them wakes. The arc lamp and a blow are heard from least far.' },
    { id: 'plate', at: [30, 65], radius: 2.5, speaker: 'FORK PLATE', text: 'A brass plate hammered onto the foot, in our letters: PELLEW, S. MATE. Somebody here had that courtesy. I count eight more plates in this row.' },
    { id: 'tend', at: [40, 52], radius: 4, speaker: 'INES', text: 'They are tending the forks. Weeding round them, wiping them down, putting an ear to them. Nobody looks up. I would like to keep it that way.' },
    { id: 'count', at: [40, 46], radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: a long number, a longer number, then one short note that rises like a question. Struck and owed, if I had to guess.' },
    { id: 'tower', at: [40, 25], radius: 3.5, speaker: 'INES', text: 'A round tower on the top terrace with a bell inside it the size of a boat. Everything on this hill is tuned to that.' },
    { id: 'lever', at: [33, 16], radius: 2, speaker: 'HULL', text: 'A lever on the bell stand. It works the gate in the north wall; the Keepers ring the bell and the gate answers.' },
    { id: 'tune', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The gate in the north wall opens. Down the hill, every fork in every field gives one low note, and stops.' },
    { id: 'hollow', at: [64, 66], radius: 2, speaker: 'HULL', text: 'The east wall of this field rings hollow behind the last fork.' },
  ],
  triggers: [
    { id: 'l2', when: 'enter', at: [40, 52], radius: 3, do: [{ objective: 'Second terrace: the stair is at the west end of the hall behind it' }] },
    { id: 'l3', when: 'enter', at: [40, 37], radius: 3, do: [{ objective: 'Third terrace: the stair is at the east end of the hall behind it' }] },
    { id: 'plateau', when: 'enter', at: [40, 27], radius: 3, do: [{ objective: 'The tuning tower: the lever on the bell stand opens the north gate' }] },
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 700], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { tollbearer: 8, gaunt: 4, bellhand: 3, sexton: 2, gill: 3, bulwark: 1 },
    scaleClass: 'MIXED',
    introduces: 'the resonators: standing forks that ring at a noise, answer the forks beside them down the row and wake everything asleep near them, so the gun you fire near them is the puzzle (the arc lamp, a blow and the tuning-fork gun are heard from least far)' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M04: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'forks', P.ents.filter((e) => e.kind === 'resonator').length);
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M04', lane: [...(laneOf('C2M04') ?? [])], keep: [], plan: [{"from":"gaunt","to":"bellhand","pick":"spread","n":1}] };
ENC.apply(MAP);

// ---- PT-052 Level B: THE SQUEEZE (tools/mapkit/squeeze.mjs). The terraces were 80 by 75 cells for 36 creatures (thirteen per thousand cells): thirteen columns and eleven rows are taken out where nothing stands and no stair runs.
// Everything above this line is in the AUTHORING frame; the shipped map is narrower and its routes are the waypoints with the same cuts (`node tools/dev/write-routes.mjs C2M04`). Kit calls and the lane file stay in the authoring frame.
MAP.squeeze = [{axis:'x',cuts:[[3,4], [7,8], [10,11], [17,18], [21,22], [25,26], [49,50], [51,52], [55,56], [61,62], [70,71], [72,73], [76,77]]}, {axis:'z',cuts:[[7,8], [13,14], [18,19], [21,22], [24,25], [39,40], [48,49], [54,55], [63,64], [73,75]]}];
// ---- end PT-052 Level B squeeze ----

export default MAP;
