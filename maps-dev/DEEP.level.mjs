// THE DEEP RANGE (PT-038, Campaign 2 Act B): a DEV-ONLY map for the new tools of the Sounding Deep, beside the Range (maps-dev/RANGE.level.mjs). Not one of the 68, never in maps/, never validated or counted.
// Build it with: node tools/dev/build-range.mjs DEEP   (writes maps-dev/DEEP.json); the dev level picker lists it. It is DARK (atmosphere.dark) and lit only by the hand lantern (key L; the oil is on the HUD) and by
// the few lanterns hung in it. It is a cave system made by the CAVE KIT (tools/mapkit/cave.mjs): a hall, a winding tunnel, a grotto, a bowl of terraces and a grove, with
//   the TUNNEL: oil tins, three sleepers (Gaunts see you from 6 m in the dark, 24 m lit; a Tollbearer follows the Hush and ignores the light)
//   the GROTTO: Zealots (two sponges, three sleepers): the lance, the lunge, a hit that grafts
//   the BOWL: seven metres of terraces going down, a ramp each way (the cave kit's `tiers`)
//   the GROVE: the chime tree and five chimes, three rounds (3, 4, 5 notes), and a gate that opens when all three are answered
import { Level } from '../tools/mapkit/builder.mjs';
import { placer } from '../tools/mapkit/c2.mjs';
import { blob, finger, tiers } from '../tools/mapkit/cave.mjs';

const W = 96, H = 76, L = new Level(W, H, { fill: 'C' });
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;

// ---- the caves ---------------------------------------------------------------------------------------------------------------
const rock = 'C', FL = 'f';
const G = 14;                                                                                     // every floor stands 7 m up, so that the bowl has somewhere to go down to
const hall = blob(L, 12, 60, 9, 7, { seed: 21, rough: 0.22, ch: FL, h: G, lidMid: 34, lidEdge: 24 });
const tunnel = finger(L, [18, 57], [44, 42], { seed: 31, width: 4, wobble: 4, ch: FL, h: G, lid: 24 });
const grotto = blob(L, 56, 34, 15, 11, { seed: 22, rough: 0.2, ch: FL, h: G, lidMid: 34, lidEdge: 24 });
const bowl = tiers(L, 23, 17, { rx: 18, rz: 14, rings: 4, rise: 3, top: G, ramps: 2, rampAt: 0.6, seed: 24, ch: FL, lid: 30 });
const toBowl = finger(L, [48, 30], [36, 20], { seed: 32, width: 4, wobble: 2, ch: FL, h: G, lid: 30 });
const toGrove = finger(L, [60, 42], [70, 55], { seed: 33, width: 4, wobble: 3, ch: FL, h: G, lid: 24 });
const grove = blob(L, 72, 62, 11, 8, { seed: 23, rough: 0.2, ch: FL, h: G, lidMid: 34, lidEdge: 24 });
// the alcove behind the chime gate (east of the grove): a gap in the rock, a door, a room
L.rect([82, 62, 83, 64], FL); L.room([85, 61, 89, 65], { floor: FL, wall: 'C' }); L.door(84, 63, { remote: true }); L.height([82, 61, 89, 65], G); L.ceiling([82, 61, 90, 66], 12);

// ---- placement ---------------------------------------------------------------------------------------------------------------
const P = placer(L, { silent: false });
const E = P.ents;
const put = (type, kind, at, extra) => P.put(type, kind, at, extra);
put('prop', 'lantern', [9, 57]); put('prop', 'lantern', [15, 63]); put('prop', 'lantern', [8, 62]);                                        // the hall is lit
put('prop', 'lantern', [48, 30]); put('prop', 'lantern', [53, 24]);                                                                        // the grotto's way in and its north side
for (const [x, z] of [[68, 58], [76, 58], [64, 64], [80, 64], [72, 69]]) put('prop', 'lantern', [x, z]);                                    // the grove
for (const [x, z] of [[36, 21], [12, 12], [30, 8], [14, 24], [23, 17], [34, 28]]) put('prop', 'lantern', [x, z]);                                                                                                           // the top of the bowl
for (const [x, z] of [[20, 55], [31, 49], [43, 43], [58, 40]]) put('pickup', 'oil', [x, z]);                                                  // oil along the road
put('pickup', 'oil', [24, 20]); put('pickup', 'health_large', [86, 63]);
// the tunnel: three sleepers and a Tollbearer (asleep: it wakes by sight at its own range, light or none)
for (const [kind, x, z] of [['gaunt', 26, 52], ['gaunt', 33, 47], ['gaunt', 38, 45], ['tollbearer', 28, 51]]) put('enemy', kind, [x, z], { facing: EAST });
// the grotto: two sponges for the outline and the hit volume, three live sleepers
put('enemy', 'zealot', [52, 30], { facing: S, hold: 'inert', hp: 5000 }); put('enemy', 'zealot', [62, 30], { facing: N, hold: 'inert', hp: 5000 });
for (const [x, z] of [[50, 38], [58, 40], [64, 36]]) put('enemy', 'zealot', [x, z], { facing: WEST });
// the bowl: sleepers on the terraces
for (const [x, z] of [[20, 14], [30, 22], [26, 26]]) put('enemy', 'gill', [x, z], { facing: S });
// the grove: the tree, the five chimes in an arc, three rounds
put('prop', 'chimetree', [72, 62], { id: 'tree', plays: ['r1', 'r2', 'r3'] });
[[64, 58], [68, 56], [72, 55], [76, 56], [80, 58]].forEach(([x, z], n) => put('prop', 'chime', [x, z], { id: 'c' + n, note: n }));
// the exit back to the title
E.push({ type: 'exit', dest: 'next', at: [7, 60] });
L.put(12, 60, '@');

const layers = L.layers();

export default {
  id: 'DEEP', name: 'The Deep Range (dev only)', version: 1, ceilingHeight: 8, range: true,
  atmosphere: { look: 'deep', dark: true, fog: '#04050a', fogDensity: 0.03 },
  lantern: { oil: 45, max: 90 },
  chimes: [{ id: 'r1', phrase: [0, 2, 1], window: 8 }, { id: 'r2', phrase: [3, 1, 4, 0], window: 8 }, { id: 'r3', phrase: [2, 4, 0, 3, 1], window: 8 }],
  entryLoadout: { hp: 100, armor: 100, ammo: { flare: 30, shell: 40, rivet: 200, bolt: 24, cell: 100, round: 180, rocket: 12 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'fork', 'mortar', 'boathook', 'marlinspike', 'mallet', 'axe', 'chainsaw'] },
  intro: { title: 'THE DEEP RANGE', lines: ['Dark. L lights the lantern; the oil is on the HUD.', 'Zealots, chimes and a cave made by the cave kit. You cannot die.'] },
  objective: 'DEEP RANGE: the hall (lit), the tunnel (oil, sleepers), the grotto (Zealots), the bowl (terraces), the grove (the chime tree and its gate)',
  ...layers,
  doors: [...(layers.doors ?? [])],
  triggers: [
    { id: 'round1', when: 'seq:r1', do: [{ message: 'r1' }] }, { id: 'round2', when: 'seq:r2', do: [{ message: 'r2' }] },
    { id: 'gate', when: ['seq:r1', 'seq:r2', 'seq:r3'], do: [{ open: [84, 63] }, { message: 'r3' }] },
  ],
  entities: E.map((e) => ({ ...e })),
  startFacing: 'east',
  messages: [
    { id: 'hall', at: [12, 60], radius: 6, speaker: 'RANGE', text: 'DEEP RANGE. Dark: L lights the lantern (OIL on the HUD). Gaunts, Gills, Zealots see you from 6 m dark, 24 m lit. Tollbearers and Bellhands follow the Hush and ignore light.' },
    { id: 'tunnel', at: [30, 49], radius: 6, speaker: 'RANGE', text: 'TUNNEL: oil tins on the road (+30). Three Gaunts and a Tollbearer asleep: with the lantern out the Gaunts stay asleep until you are 6 m off; the Tollbearer wakes by itself.' },
    { id: 'grotto', at: [56, 34], radius: 8, speaker: 'RANGE', text: 'SONGKEEPER YARD (dark): two sponge Zealots (front, back) and three sleepers. A lance thrusts from 3.5 m after it dips; a hit GRAFTS: you walk slower for three seconds.' },
    { id: 'bowl', at: [26, 18], radius: 8, speaker: 'RANGE', text: 'THE BOWL: five terraces going down, made by the cave kit; a stair is cut through every ring (two of them): each ring is a cliff elsewhere. Gills sleep on the terraces.' },
    { id: 'grove', at: [72, 60], radius: 8, speaker: 'RANGE', text: 'CHIME GROVE: Use the tree: it plays a phrase (fruit light in order). Strike the chimes in that order (Use or a shot). Rounds of 3, 4, 5 notes open the alcove gate.' },
    { id: 'r1', at: [1, 1], radius: 0.1, speaker: 'RANGE', text: 'ROUND ONE answered. Use the tree again for the next phrase.' },
    { id: 'r2', at: [1, 1], radius: 0.1, speaker: 'RANGE', text: 'ROUND TWO answered. One more.' },
    { id: 'r3', at: [1, 1], radius: 0.1, speaker: 'RANGE', text: 'ALL THREE answered: the alcove gate is open.' },
  ],
};
