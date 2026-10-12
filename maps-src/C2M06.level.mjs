// C2M06 CHITIN AQUEDUCT: water-traversal combat; the Vael lifeline. (Campaign 2, Act A THRESHOLD; the first use of CURRENT.)
// Three channels of pale chitin, stepped like a stair (ground, +3 m, +6 m), joined by two WEIRS and all running toward you: the water falls from the top channel (flowing east) down the east weir into the middle one (flowing west), down the west weir into the bottom one (flowing east), so the climb from the south-east
// corner to the great siphon at the north-west is UPSTREAM the whole way: walking against the current is slow (2.8 m/s), and whatever the water carries (creatures that wake in it are carried down to you) arrives fast. The arc lamp conducts through wading water between creatures standing in it. The banks are dry; the east half
// of the aqueduct and the siphon hall are roofed; the middle is open to the red sky. At the siphon a lever shuts the sluice above the door and opens it.
// SHAPE: three bands and two ramps in a serpentine, a roofed east block and a siphon hall, a gap of open sky between; heights 0 / 1.5 / 3 / 6 m. Scale class MIXED (about 50% roofed).
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, ellipse, box, ramp, placer, ring } from '../tools/mapkit/c2.mjs';

const W = 80, H = 56, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true; L.usedFx = true;
const XA = 6, XB = 73, RX = 44;                                                                              // the aqueduct's x range; the roofed east block starts at x 44
const BANDS = [{ z0: 40, z1: 47, h: 0, w0: 42, w1: 45, flow: '>' }, { z0: 25, z1: 32, h: 6, w0: 27, w1: 30, flow: '<' }, { z0: 9, z1: 16, h: 12, w0: 11, w1: 14, flow: '>' }];
const floorCh = (x, roofed) => (roofed ? '/' : ',');
for (const b of BANDS) for (let z = b.z0; z <= b.z1; z++) for (let x = XA; x <= XB; x++) { const roofed = x >= RX || (b.h === 12 && x <= 24); setCell(L, x, z, floorCh(x, roofed), b.h, roofed ? b.h + 12 : null); }
for (const b of BANDS) L.fx([XA, b.w0, XB, b.w1], b.flow);                                                  // the water: wading, and it flows
// the weirs: ramps of 7 rows, the water falling down them (flow 'v' south); the first at the west end (middle -> bottom), the second at the east end (top -> middle)
const weir = (x0, x1, z0, z1, from, to, roofed) => { ramp(L, [x0, z0, x1, z1], 'z', from, to, roofed ? '/' : ',', roofed ? to + 14 : null); L.fx([x0, z0, x1, z1], 'v'); };
weir(10, 17, 33, 39, 6, 0, false);                                                                          // west weir: from the middle channel's south bank (z 33, 3 m) down to the bottom channel's north bank (z 39, ground)
{ ramp(L, [62, 17, 69, 24], 'z', 12, 6, '/', 20); L.fx([62, 17, 69, 24], 'v'); }                            // east weir, under the roof: from the top channel's south bank (z 17, 6 m) down to the middle channel's north bank (z 24, 3 m)
for (let x = 10; x <= 17; x++) setCell(L, x, 39, ',', 0);                                                    // keep the foot of the west weir a plain bank cell (no ramp rounding)
// the siphon hall: a bonecoral hall round the west end of the top channel, the exit chamber north of it
box(L, [4, 8, 25, 8], '*', 12); box(L, [11, 4, 13, 7], 'f', 12, 20);
box(L, [10, 3, 14, 3], '*', 12); box(L, [10, 4, 10, 7], '*', 12); box(L, [14, 4, 14, 7], '*', 12);
L.door(12, 8, { remote: true }); setCell(L, 12, 8, 'D', 12); setCell(L, 11, 8, '*', 12); setCell(L, 13, 8, '*', 12);
// pillars of chitin in the channels (cover that the water goes round): blocks of wall in the water, off the lanes
for (const [cx, cz, rx, rz] of [[58, 43.5, 1.3, 1.2], [38, 44, 1.5, 1.2], [20, 43, 1.3, 1.2], [26, 29, 1.5, 1.2], [46, 28, 1.3, 1.2], [60, 29, 1.3, 1.2], [56, 12, 1.5, 1.2], [36, 13, 1.3, 1.2]]) for (const [x, z] of ellipse(L, cx, cz, rx, rz, '?', 0)) L.fx([x, z, x, z], '.');                  // (a block stands in the water: no water on it)
ring(L, '!', (x, z) => (x <= 26 && z <= 9 ? '*' : '?'));
const P = placer(L); L.put(70, 46, '@'); P.reserve(70, 46);
const { E, P: PK, PR } = P;
// ---- creatures: gills over the water, wading dead, gaunts that run the channels, bellhands on the banks ------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[62, 43]]) E('gill', x, z);
for (const [x, z] of [[54, 43], [40, 44], [12, 44]]) E('tollbearer', x, z);
for (const [x, z] of [[58, 45], [30, 43], [16, 42]]) E('gaunt', x, z);
for (const [x, z] of [[46, 46], [12, 46]]) E('bellhand', x, z);
E('bellhand', 13, 33); E('tollbearer', 15, 36);                                                             // the west weir
for (const [x, z] of [[18, 28], [48, 28], [60, 29]]) E('tollbearer', x, z);                        // the middle channel
for (const [x, z] of [[24, 28], [40, 29], [54, 28]]) E('gaunt', x, z);
for (const [x, z] of [[28, 25]]) E('bellhand', x, z);
for (const [x, z] of [[36, 27]]) E('gill', x, z);
E('tollbearer', 66, 20); E('bulwark', 64, 23);                                                              // the east weir
for (const [x, z] of [[60, 12], [30, 12]]) E('tollbearer', x, z);                                  // the top channel
for (const [x, z] of [[52, 14], [36, 11]]) E('gaunt', x, z);
E('gill', 50, 12); E('bellhand', 58, 15);
E('bulwark', 12, 12); E('tollbearer', 14, 10); E('gaunt', 8, 12);                    // the siphon hall
// ---- supplies and furniture ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[68, 46], [52, 47], [36, 40], [22, 47], [10, 40], [12, 31], [30, 32], [50, 26], [66, 25], [64, 16], [48, 15], [32, 10], [20, 16]]) PK(x % 3 ? 'health_small' : 'health_large', x, z);
PK('armor_vest', 66, 40); PK('armor_vest', 20, 32); PK('armor_vest', 40, 16); PK('armor_vest', 54, 26); PK('health_large', 58, 26); PK('armor_vest', 14, 15);
for (const [x, z] of [[60, 47], [48, 40], [66, 32], [56, 26], [66, 10], [50, 16]]) PR('lamp', x, z);
for (const [x, z] of [[20, 9], [8, 16], [20, 16]]) PR('lamp', x, z);
for (const [x, z] of [[30, 47], [16, 41], [38, 32], [38, 26], [22, 10], [30, 16]]) PR('lantern', x, z);
for (const [x, z] of [[52, 41], [34, 46], [24, 32], [40, 25], [68, 16], [30, 9]]) PR('crate', x, z);
// ---- the secret: a sluice chamber behind the south wall of the bottom channel's east block (the keepers' store) ------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [60, 48], cells: [[59, 50], [60, 50], [61, 50], [59, 49], [60, 49], [61, 49]] };
{ for (const [x, z] of SEC.cells) setCell(L, x, z, '/', 0, 14); box(L, [58, 51, 62, 51], '?', 0); box(L, [58, 49, 58, 50], '?', 0); box(L, [62, 49, 62, 50], '?', 0); setCell(L, 60, 48, 'S', 0);
  PK('armor_vest', 59, 50); PK('health_large', 61, 50); PK('ammo_shell', 59, 49); PK('ammo_rivet', 61, 49); PK('ammo_flare', 60, 50); }
const MAP = {
  id: 'C2M06', name: 'Chitin Aqueduct', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#a8d0b8', fogDensity: 0.006, sky: 'anselm', look: 'aqueduct' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'CHITIN AQUEDUCT', lines: ['The only water on the world that still moves.', 'It runs toward you, and it is the only way up.'] },
  outro: 'Next: the Bellwright Yard, where the Bells are grown.',
  objective: 'Climb the aqueduct against the current to the siphon at the top: the water carries the dead down to you',
  ...L.layers(),
  secrets: [{ id: 'sluice', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'sluice', at: [18, 9], wall: 'north', once: true, do: [{ open: [12, 8] }, { message: 'sluice' }, { objective: 'The door in the north wall is open: the exit chamber' }, { shake: 1.5 }] },
    { type: 'exit', at: [12, 4], dest: 'next' }],
  scenery: [{ kind: 'spire', at: [20, 0] }, { kind: 'spire', at: [60, -4] }, { kind: 'spire', at: [90, 30] }],
  messages: [
    { id: 'start', at: [70, 46], radius: 3, speaker: 'INES', text: 'Three channels stepped like a stair, and the water in every one of them runs toward me. The only water on this world I have seen move.' },
    { id: 'current', at: [64, 44], radius: 3, speaker: 'HULL', text: 'Wading water pushes: with it you are fast, against it slow, and what wakes in it is carried down to you. The arc lamp conducts through it.' },
    { id: 'hum', at: [46, 44], radius: 3, speaker: 'INES', text: 'The channel hums when I put a hand in. Sound goes a long way down water. I think this is how the count reaches the cities.' },
    { id: 'weir', at: [14, 38], radius: 3, speaker: 'HULL', text: 'A weir: the water falls down the ramp and you climb it. The banks on either side are dry; use them.' },
    { id: 'plate', at: [30, 31], radius: 2.5, speaker: 'RINGING PLATE', text: 'Run a nail down it: a rising note, a falling note, the same two, over and over. A question and an answer, I think. Nobody here is listening to either.' },
    { id: 'east', at: [66, 22], radius: 3, speaker: 'HULL', text: 'The east weir is under a roof, and a shell-back stands in the water at its foot. The plate faces the current: take it from the bank.' },
    { id: 'sluice-plate', at: [24, 12], radius: 3, speaker: 'SLUICE PLATE', text: 'OPENED, AND CLOSED AGAIN BY HAND. THE WATER REMEMBERS THE COUNT. (The last line was added later, in a different hand, by someone who pressed hard.)' },
    { id: 'lever', at: [18, 10], radius: 2.5, speaker: 'INES', text: 'The siphon: the whole aqueduct goes down this throat and comes out in the Deep. The lever on the north wall works the door to the exit.' },
    { id: 'sluice', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The sluice shuts above the door. The door opens. The water goes on past it as if nothing had happened.' },
    { id: 'hollow', at: [60, 49], radius: 2, speaker: 'HULL', text: 'The south wall of the bottom channel rings hollow here.' },
  ],
  triggers: [
    { id: 'west-weir', when: 'enter', at: [14, 40], radius: 3, do: [{ objective: 'The west weir: up the ramp, against the falling water, to the middle channel' }] },
    { id: 'east-weir', when: 'enter', at: [66, 26], radius: 3, do: [{ objective: 'The east weir: up the ramp to the top channel, then west to the siphon' }] },
    { id: 'siphon', when: 'enter', at: [28, 12], radius: 3, do: [{ objective: 'The siphon: the lever on its north wall opens the door to the exit' }] },
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 700], mechanics: ['heights', 'triggers', 'switches', 'secret', 'hazards'], skins: 6, enemyKinds: { tollbearer: 7, gaunt: 5, bellhand: 3, gill: 3, bulwark: 2 },
    scaleClass: 'MIXED', introduces: 'the current: wading water that pushes (2.2 m/s: against it you crawl, with it you fly), the whole map an upstream climb through three channels and two weirs, with creatures carried down to you; the arc lamp conducts through the water' },
};
MAP.drops = { scale: 1.4, keep: [] };
console.log('C2M06: enemies', P.ents.filter((e) => e.type === 'enemy').length);
export default MAP;
