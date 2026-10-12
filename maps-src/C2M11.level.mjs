// C2M11 UNDERCANTOR HALLS: politics through architecture; the Vael are divided. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md.)
// A butterfly of two wings round one seat. The player comes up the GRAND STAIR from the vestibule into the COLONNADE, a hall 84 m long under a marble roof, and from it two arches lead north: WEST to the Songkeepers' gallery
// (a procession hall of marble and bronze, columns in rows, a carpet down the middle, Zealots standing in ranks: a fight) and EAST to the low halls where the Silent are kept (round rooms of flowstone and bone-coral, a few
// sleepers, a few of the Silent sitting, plates and notes: a conversation and a quiet way). Both wings end at a gate into the Undercantor's seat, which holds the exit. The Songkeepers' gate opens when its two captains are dead;
// the Silent's gate is on a sound-lock and opens for someone who has been quiet. Going through a gate RECORDS THE CHOICE (`choose` / `choices`, engine PT-039): C2M12 and the Gardens answer it.
// SHAPE: a vestibule, a stair, an unroofed colonnade, a rectilinear marble gallery (the Songkeepers' wing is the rigid side) and a chain of blobs and fingers (the Silent's wing is the grown side), a seat. Scale class MIXED.
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, box, ramp, placer, FLOORS } from '../tools/mapkit/c2.mjs';
import { blob, finger, smooth, skinWalls } from '../tools/mapkit/cave.mjs';

const W = 108, H = 92, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const ROCK = '[', MARBLE = '|', SLAB = '^', CARPET = 'c', BONE = '"', CORAL = '*', FLOW = '{', BASALT = ')';
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const F = 10;                                                                                                          // the floor of the colonnade, the wings and the seat: 5 m up from the vestibule
// ---- vestibule, grand stair, colonnade ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [44, 76, 64, 86], SLAB, 0, 22); ramp(L, [49, 64, 59, 75], 'z', F, 0, SLAB, 26);
box(L, [12, 48, 96, 63], 's', F);                                                                       // the colonnade has lost its roof (the cave's own roof, sky_deep, is above it): 36% of the map is open
for (let x = 18; x <= 90; x += 8) { if (x > 44 && x < 64) continue; box(L, [x, 52, x + 1, 53], MARBLE); box(L, [x, 58, x + 1, 59], MARBLE); }                       // two rows of pillars
// ---- the Songkeepers' gallery (west): a long marble hall, ranks of columns, a carpet down the middle, a dais at the north end ----------------------------------------------------------------------------------------------------------------------------------
box(L, [6, 10, 42, 46], SLAB, F, 30); box(L, [21, 12, 27, 46], CARPET, F, 30); box(L, [16, 47, 30, 47], SLAB, F, 28);
for (let z = 16; z <= 42; z += 6) for (const x of [12, 16, 32, 36]) box(L, [x, z, x + 1, z + 1], MARBLE);
box(L, [16, 10, 32, 13], SLAB, F + 2, 32);                                                                              // the dais
for (const x of [8, 40]) for (let z = 14; z <= 44; z += 8) box(L, [x, z, x, z], MARBLE);                                // buttresses on the long walls
// ---- the Undercantor's seat: a hall in the middle at the north, a gate on each side ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [47, 9, 59, 25], SLAB, F, 34); box(L, [49, 9, 57, 11], SLAB, F + 1, 35);
box(L, [43, 16, 45, 18], SLAB, F, 28); setCell(L, 46, 16, MARBLE, F); setCell(L, 46, 18, MARBLE, F); L.door(46, 17, { remote: true }); L.height([46, 17, 46, 17], F);
// ---- the Silent's low halls (east): a chain of rooms and passages grown out of the rock -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const east = [];
east.push(...blob(L, 84, 38, 7, 6, { seed: 111, rough: 0.2, ch: FLOW, h: F, lidMid: 26, lidEdge: 22 }));
east.push(...finger(L, [84, 47], [84, 42], { seed: 112, width: 4, wobble: 0, ch: FLOW, h: F, lid: 24 }));
east.push(...blob(L, 96, 28, 6, 6, { seed: 113, rough: 0.2, ch: FLOW, h: F, lidMid: 26, lidEdge: 22 }));
east.push(...finger(L, [88, 34], [93, 31], { seed: 114, width: 3, wobble: 1, ch: FLOW, h: F, lid: 24 }));
east.push(...blob(L, 84, 20, 7, 6, { seed: 115, rough: 0.2, ch: FLOW, h: F, lidMid: 26, lidEdge: 22 }));
east.push(...finger(L, [93, 25], [88, 22], { seed: 116, width: 3, wobble: 1, ch: FLOW, h: F, lid: 24 }));
east.push(...blob(L, 71, 15, 6, 5, { seed: 117, rough: 0.2, ch: FLOW, h: F, lidMid: 26, lidEdge: 22 }));
east.push(...finger(L, [78, 18], [75, 16], { seed: 118, width: 3, wobble: 1, ch: FLOW, h: F, lid: 24 }));
east.push(...blob(L, 70, 34, 5, 5, { seed: 119, rough: 0.2, ch: FLOW, h: F, lidMid: 26, lidEdge: 22 }));
east.push(...finger(L, [78, 38], [74, 36], { seed: 120, width: 3, wobble: 1, ch: FLOW, h: F, lid: 24 }));
east.push(...finger(L, [70, 29], [71, 20], { seed: 121, width: 3, wobble: 1, ch: FLOW, h: F, lid: 24 }));
smooth(L, east, 2);
box(L, [61, 16, 65, 18], FLOW, F, 28); setCell(L, 60, 16, MARBLE, F); setCell(L, 60, 18, MARBLE, F); L.door(60, 17, { soundlock: { quiet: 6, radius: 36 } }); L.height([60, 17, 60, 17], F);
box(L, [66, 14, 66, 18], FLOW, F, 28);
// the arches from the colonnade into the east wing: a 4-wide gap in the north wall of the colonnade at x 82..86
box(L, [82, 47, 86, 47], FLOW, F, 28);
// ---- the secret: a room in the east wing's far room, behind a panel in its north wall -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let zn = 99, xs = 96; for (const [x, z] of east) if (x >= 93 && x <= 99 && z < zn) { zn = z; xs = x; }               // the northmost floor cell of the far room: the panel goes straight above it
const SEC = { panel: [xs, zn - 1], cells: [] };
const isOpen = (x, z) => FLOORS.has(L.g[z]?.[x]);
let hw = 2, dz0 = 5; for (let tries = 0; tries < 12; tries++) {                                                      // a room of silt that touches nothing but its panel: narrower or further north until it is clean
  let clean = true; for (let z = zn - dz0 - 1; z <= zn; z++) for (let x = xs - hw - 1; x <= xs + hw + 1; x++) { const inRoom = z >= zn - dz0 && z <= zn - 2 && x >= xs - hw && x <= xs + hw, panel = x === xs && z === zn - 1; if (!inRoom && !panel && isOpen(x, z) && z <= zn - 1) clean = false; }
  if (clean) break; if (hw > 1) hw--; else dz0++;
}
for (let z = zn - dz0; z <= zn - 2; z++) for (let x = xs - hw; x <= xs + hw; x++) { setCell(L, x, z, SLAB, F, F + 12); SEC.cells.push([x, z]); }
setCell(L, xs, zn - 1, 'S', F);
// ---- walls: marble in the Songkeepers' half and the colonnade, bone and coral in the Silent's -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
skinWalls(L, ROCK, (x, z) => (x > 62 && z < 47 ? (z % 2 ? BONE : CORAL) : MARBLE));
const P = placer(L); L.put(54, 84, '@'); P.reserve(54, 84);
const { E, P: PK, PR } = P;
// ---- lamps and dressing --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[46, 80], [62, 80], [46, 70], [62, 70], [54, 66]]) PR('lantern', x, z);
for (let x = 20; x <= 88; x += 8) { PR('lantern', x, 55); }                                                           // the colonnade is lit
for (let z = 14; z <= 44; z += 6) { PR('lantern', 9, z); PR('lantern', 39, z); PR('lamp', 24, z); }                // the gallery blazes: lamps down the carpet
for (const [x, z] of [[84, 38], [96, 28], [84, 20], [71, 15], [70, 34]]) PR('lantern', x, z);                          // one lantern in each of the Silent's rooms: they live by a little light
for (const [x, z] of [[50, 14], [56, 14], [50, 22], [56, 22]]) PR('lamp', x, z);                                         // the seat
for (const [x, z] of [[24, 14], [24, 24], [24, 34], [24, 44]]) PR('stall', x, z);                                         // nothing: censers (the stall prop is a table with an awning)
// ---- supplies (ammunition comes from the dead) ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[48, 82], [60, 82], [54, 72], [30, 56], [78, 56], [54, 56], [20, 40], [34, 40], [24, 20], [38, 14], [84, 40], [96, 30], [84, 18], [70, 36], [72, 14], [54, 20]]) PK((x + z) % 3 ? 'health_small' : 'health_large', x, z);
for (const [x, z] of [[54, 62], [24, 28], [36, 24], [96, 26], [70, 16]]) PK('armor_vest', x, z);
PK('armor_vest', xs - 1, zn - 4); PK('health_large', xs + 1, zn - 4); PK('ammo_shell', xs - 1, zn - 3); PK('ammo_rivet', xs + 1, zn - 3); PK('ammo_flare', xs, zn - 4); PK('ammo_bolt', xs, zn - 2);          // the secret
// ---- the colonnade's company ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z, k] of [[40, 55, 'tollbearer'], [68, 55, 'tollbearer'], [54, 50, 'tollbearer'], [30, 60, 'gaunt'], [78, 60, 'gaunt'], [24, 55, 'bellhand'], [86, 55, 'bellhand']]) E(k, x, z);
for (const [x, z] of [[26, 56], [32, 62], [76, 56], [70, 60]]) E('vaelfolk', x, z);
// ---- the Songkeepers' wing: ranks of Zealots down the carpet, porters, a Bulwark at the middle, an Acolyte behind it, the two captains on the dais ----------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[20, 38], [28, 38], [20, 28], [28, 28]]) E('zealot', x, z, { facing: S });
E('zealot', 21, 14, { facing: S, group: 'captains' }); E('zealot', 27, 14, { facing: S, group: 'captains' });
for (const [x, z, k] of [[10, 42, 'tollbearer'], [38, 42, 'tollbearer'], [10, 30, 'tollbearer'], [38, 30, 'tollbearer'], [10, 18, 'tollbearer'], [38, 18, 'tollbearer'], [14, 34, 'gaunt'], [34, 34, 'gaunt'], [14, 24, 'gaunt'], [34, 24, 'gaunt']]) E(k, x, z);
E('chorister', 18, 22); E('chorister', 30, 22);
// ---- the Silent's wing: sleepers, and the Silent themselves (peaceful, sitting) -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z, k] of [[84, 36, 'gaunt'], [97, 30, 'gaunt'], [85, 22, 'gaunt'], [72, 17, 'tollbearer'], [69, 33, 'tollbearer'], [82, 40, 'gaunt']]) E(k, x, z);
for (const [x, z] of [[82, 38], [86, 40], [94, 28], [98, 30], [82, 20], [86, 22], [70, 14], [72, 17], [68, 34], [72, 32]]) E('vaelfolk', x, z);
// ---- the seat: its two guards, asleep -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
E('zealot', 51, 20, { facing: S }); E('zealot', 57, 20, { facing: S });
const MAP = {
  id: 'C2M11', name: 'Undercantor Halls', version: 1, ceilingHeight: 4.2, par: { time: 540 },
  atmosphere: { look: 'halls', sky: 'deep', fog: '#10121c', fogDensity: 0.008 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'UNDERCANTOR HALLS', lines: ['A palace in two halves, and one seat between them.', 'The west wing keeps the count. The east wing keeps the ones who will not.'] },
  outro: 'The seat is empty. The stair behind it goes down, and whichever way she came, someone in this house will tell the next what she did.',
  objective: 'Climb the grand stair to the colonnade. Two wings lead to the seat: the west is the Songkeepers, the east is the Silent',
  ...L.layers(),
  secrets: [{ id: 'cell', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'seat', at: [59, 13], wall: 'east', once: true, do: [{ exit: { set: 'unlock' } }, { objective: 'The chair has opened the stair: the exit is on the north wall' }, { message: 'chair' }] },
    { type: 'exit', at: [53, 9], dest: 'next', locked: true }],
  scenery: [],
  messages: [
    { id: 'start', at: [54, 83], radius: 4, speaker: 'INES', text: 'A hall of cold marble with bronze bands, and a stair as wide as a slipway. Nobody on it. Somebody has swept it.' },
    { id: 'plate-w', at: [54, 62], radius: 3, speaker: 'RINGING PLATE', text: 'West: the count is kept here. East: those who are not counted. The plate offers no third door.' },
    { id: 'hub', at: [54, 56], radius: 4, speaker: 'HULL', text: 'The wings meet at the seat in the north. The west gate opens when the two captains are dead. The east gate is on a sound-lock and opens for someone who has been quiet.' },
    { id: 'gallery', at: [24, 46], radius: 4, speaker: 'INES', text: 'Spears in ranks down a red carpet, all of them looking at the door I am standing in. Somebody knew somebody would come this way.' },
    { id: 'plate-c', at: [24, 20], radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: the ranks are numbered, and the number of the dead is cut into the same plate, in the same hand, a little lower.' },
    { id: 'captains', at: [24, 15], radius: 4, speaker: 'INES', text: 'Two on the dais, standing very still, and a gate in the wall behind them. The gate is the only door in the room that is not a way out.' },
    { id: 'low', at: [84, 44], radius: 4, speaker: 'INES', text: 'It is darker here, and it smells of oil and a cold hearth. Rooms like bowls, one after another, and a lantern in each, turned low.' },
    { id: 'silent1', at: [82, 38], radius: 3, speaker: 'A SILENT', text: 'I stopped singing the day the count was read. They have not asked me again. We are kept here because we are not worth the stair.' },
    { id: 'silent2', at: [94, 28], radius: 3, speaker: 'A SILENT', text: 'Put down the gun in the rooms ahead. The gate at the end listens, and I do not think it listens for you.' },
    { id: 'silent3', at: [82, 20], radius: 3, speaker: 'A SILENT', text: 'You are the one with no ear for it. We heard. Nobody here will ring for you, and nobody will stop you.' },
    { id: 'hollow', at: [xs, zn + 1], radius: 2, speaker: 'HULL', text: 'The north wall of the far room rings hollow behind the lantern.' },
    { id: 'cell', at: [xs, zn - 3], radius: 3, speaker: 'A SILENT (NOTE)', text: 'Four tins, a pair of boots and a cloak. Left for whoever the Marrow crew sent after them. They did not come this way.' },
    { id: 'seat', at: [53, 15], radius: 5, speaker: 'INES', text: 'The seat is a stone chair on a dais, and the stone is worn at the arms. It has been sat in a long time. Not today.' },
  ],
  triggers: [
    { id: 'wing-w', when: 'enter', at: [44, 17], radius: 1.6, do: [{ choose: { id: 'halls', value: 'songkeepers' } }, { objective: 'Through the west gate: the seat. The exit is on its north wall' }] },
    { id: 'wing-e', when: 'enter', at: [63, 17], radius: 1.6, do: [{ choose: { id: 'halls', value: 'silent' } }, { objective: 'Through the east gate: the seat. The exit is on its north wall' }] },
    { id: 'captains-down', when: 'dead:captains', do: [{ open: [46, 17] }, { objective: 'The captains are down and the west gate is open' }, { message: 'open-w' }] },
    { id: 'colonnade', when: 'enter', at: [54, 56], radius: 5, do: [{ objective: 'The colonnade: west is a fight, east is the quiet way' }] },
  ],
  quality: { enemies: [30, 60], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { zealot: 6, tollbearer: 8, gaunt: 5, chorister: 2, bellhand: 2 },
    scaleClass: 'MIXED', introduces: 'a choice by architecture: two wings of one palace, a fight through the Songkeepers or a quiet way through the Silent, and the game remembers which gate you went through' },
};
MAP.messages.push({ id: 'chair', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The arm of the chair is a lever. Whoever sits here decides who goes down, and the stair was cut for a long line of them.' });
MAP.messages.push({ id: 'open-w', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The west gate has opened. It was held by the captains, not by a lock.' });
MAP.drops = { scale: 1, keep: [] };
console.log('C2M11: enemies', P.ents.filter((e) => e.type === 'enemy' && e.kind !== 'vaelfolk').length, 'folk', P.ents.filter((e) => e.kind === 'vaelfolk').length);
export const waypoints = {
  main: [[54, 84, 0], [54, 78, 0], [54, 70], [54, 63, 0], [54, 56], [24, 54], [24, 48], [24, 44], [24, 38], [24, 30], [24, 22], [24, 16], [40, 17], [44, 17, 0], [46, 17, 0], [50, 17], [58, 14], { op: 'switch', id: 'seat' }, [53, 12], [53, 9, 0]],
  secret: [[54, 84, 0], [54, 78, 0], [54, 70], [54, 63, 0], [54, 56], [84, 52], [84, 44], [84, 38], [94, 30], [xs, zn + 2], { op: 'use', at: [xs, zn - 1] }, [xs, zn - 3, 0], [xs, zn + 3, 0], [86, 22], [76, 16], [70, 15], [64, 17, 0], { op: 'use', at: [60, 17] }, [58, 17, 0], [56, 14], { op: 'switch', id: 'seat' }, [53, 12], [53, 9, 0]],
};
export default MAP;
