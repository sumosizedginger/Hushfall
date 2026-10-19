// C2M30 THE UNRUNG GATE (Campaign 2, Act D; design/ACTD.md section 5; the last map). The walk of the Preview's HIVEEND (maps-dev/HIVEEND.level.mjs, played by the owner), as a real map: no combat, a short walk in silence (`atmosphere.silence`), dark but for the hand lantern, which is
// ETERNAL here (Ines's own lamp: it never burns out). Callbacks of the descent in reverse, each a small room with the one object that stands for it, in its own skins and its own look (`lookZones`): the floor of the Bell with the roots drawn back, a stair up the shaft, the Hive with the beat
// gone, the Deep's city with one bell, the steppe under a low red sun (open to the sky), and the Gate: a door that is also a bell. The last input: light the lamp (L) and keep it lit; the lamp's light holds the door quiet, and the exit opens. The exit of the last map of a campaign is the
// epilogue (`ENDINGS[2]`, src/game/ending.js: a first draft, to be written after the owner has played the descent), the tally and the closing titles. A seam in the wall of the Deep's room holds the last page of Pellew's log: the line the Ossuary's page left unfinished.
import { Level } from '../tools/mapkit/builder.mjs';
import { placer } from '../tools/mapkit/c2.mjs';

const W = 120, H = 26, L = new Level(W, H, { fill: '#' }); L.usedHeights = true; L.usedCeil = true;
const P = placer(L, { silent: false }), ents = P.ents, put = (e) => ents.push(e);
const CZ = 13;
// a corridor of six small rooms (x 6..110), each opening into the next; the Gate at the end. [x0, x1, what it is, wall, floor, look, sky or null for a roofed room]
const ROOMS = [[6, 20, 'the floor of the Bell, the roots drawn back', 'ν', 'Ν', 'rootbell', null], [24, 38, 'a stair up the shaft', 'ι', 'Ι', 'descent', 'root'], [42, 56, 'the Hive, the beat gone', 'θ', 'Θ', 'conductor', null], [60, 74, 'the Deep, a single bell', '[', '{', 'deep', null], [78, 92, 'the steppe under a low red sun', '%', '-', 'threshold', 'anselm'], [96, 110, 'the Gate', 'ξ', 'Ξ', 'unrung', null]];
const zones = [];
ROOMS.forEach(([x0, x1, , wall, floor, look, sky], i) => {
  L.room([x0, CZ - 4, x1, CZ + 4], { floor, wall });
  if (i) L.rect([ROOMS[i - 1][1] + 1, CZ - 1, x0 - 1, CZ + 1], ROOMS[i - 1][4]);
  zones.push({ rect: [x0 - 2, CZ - 5, x1 + 2, CZ + 5], look, ...(sky ? { sky } : {}) });
});
L.ceiling([4, CZ - 6, 112, CZ + 9], 6);
// the secret: a seam in the south wall of the Deep's room, and a closet behind it (three by two)
const SEC = { panel: [67, CZ + 5], cells: [[66, CZ + 6], [67, CZ + 6], [68, CZ + 6], [66, CZ + 7], [67, CZ + 7], [68, CZ + 7]] };
for (const [x, z] of SEC.cells) L.g[z][x] = '{';
L.g[SEC.panel[1]][SEC.panel[0]] = 'S';
// the one object of each room, and a lantern hung beside the last
put({ type: 'prop', kind: 'pillar', at: [13, CZ - 2] }); put({ type: 'prop', kind: 'pillar', at: [13, CZ + 2] });
put({ type: 'prop', kind: 'pew', at: [31, CZ + 2] }); put({ type: 'prop', kind: 'organ', at: [49, CZ - 2] }); put({ type: 'prop', kind: 'lantern', at: [67, CZ + 2] });
put({ type: 'prop', kind: 'lamppost', at: [85, CZ - 2] }); put({ type: 'prop', kind: 'lantern', at: [103, CZ - 3] });
P.P('oil', SEC.cells[1][0], SEC.cells[1][1]);
L.put(8, CZ, '@');
put({ type: 'exit', dest: 'next', at: [109, CZ], locked: true });
const layers = L.layers();

const msg = (id, x, z, r, speaker, text) => ({ id, at: [x, z], radius: r, speaker, text });
const MAP = {
  id: 'C2M30', name: 'The Unrung Gate', version: 1, ceilingHeight: 6, par: { time: 240 },
  atmosphere: { look: 'unrung', dark: true, silence: true, fog: '#2a2a32', fogDensity: 0.012, sky: 'gate_dim' },
  lantern: { oil: 60, max: 60, eternal: true },
  lampHolds: { plain: 0.6, own: 0.4 },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 4 }, weapons: ['flare'] },
  intro: { title: 'THE UNRUNG GATE', lines: ['A short walk, in silence.', 'At the Gate: light the lamp (L), and keep it lit.'] },
  outro: 'The door is a door again. Behind you the stair is lit all the way down, and in front of you the lamp is steady.',
  objective: 'Walk to the Gate. The lamp is yours: L',
  ...layers,
  lookZones: zones,
  secrets: [{ id: 'seam', panel: SEC.panel, cells: SEC.cells }],
  entities: ents.map((e) => ({ ...e })),
  scenery: [{ kind: 'arch', at: [118, CZ], y: 0, scale: 0.7, yaw: 1.5708 }],
  startFacing: 'east',
  messages: [
    msg('floor', 13, CZ, 5, 'INES', 'The floor of the Bell. The roots have drawn back from the walls and left the stone clean, as if it had been waiting for someone to sweep it.'),
    msg('shaft', 31, CZ, 5, 'INES', 'The stair goes up the inside of the shaft. A plate at the first landing says how far down this is. I do not read the number.'),
    msg('hive', 49, CZ, 5, 'INES', 'The Hive, and nothing moving in it. The organs hang where they hung and none of them swells. Whatever kept the beat has stopped.'),
    msg('deep', 67, CZ, 5, 'INES', 'The city under the stone. Every lamp out, and one bell, high up, that nobody is ringing. It sways a little. I count three swings and then I stop counting.'),
    msg('hollow', 67, CZ + 3, 2, 'INES', 'One stretch of the south wall sounds different under my knuckles. Somebody has been here with a hand and a reason.'),
    msg('steppe', 85, CZ, 5, 'INES', 'A road across a plain under a low red sun. It was always going to be here when I got to this end. It is a different road from the one I walked.'),
    msg('gate', 103, CZ, 4, 'SIGNAL HOUSE', 'Ines. I have you on the set. There is no line down there, and I have you. Tell me what is in front of you.'),
    msg('door', 106, CZ, 3, 'INES', 'A door that is also a bell. A hook beside it, the kind a lamp hangs from. My father said what a lamp is for. Light it, and keep it lit.'),
    msg('lit', 1, 1, 0.1, 'SIGNAL HOUSE', 'The bell on the door has gone quiet. It is holding.'),
    msg('page', SEC.cells[1][0], SEC.cells[1][1], 3, 'PELLEW, MARROW GIRL (LOG)', 'Day 16, later. ringing, once in a very long while. I have timed it against my pulse, and my pulse is slower than it was. It is not the water. Whoever finds this: not the water.'),
  ],
  triggers: [
    { id: 'door', when: ['msg:door', 'lamp:on'], do: [{ exit: { set: 'unlock' } }, { message: 'lit' }, { objective: 'The lamp is lit and the door is quiet. Walk through' }] },
    { id: 'first', when: 'enter', at: [31, CZ], radius: 5, do: [{ objective: 'Up the stair, through the Hive and the Deep, across the steppe to the Gate' }] },
    { id: 'gate-arrive', when: 'enter', at: [100, CZ], radius: 3, do: [{ objective: 'The Gate: light the lamp (L) and keep it lit' }, { cinematic: 'the-gate' }] },
  ],
  quality: { safe: true, enemies: [0, 0], botSeconds: [10, 600], mechanics: ['triggers', 'secret'], skins: 8,
    scaleClass: 'MIXED', tallReason: 'six metres under the roofs: a stair up a shaft and a hall for a door that is also a bell', introduces: 'the lamp at the Gate: the one input of the ending, and the lamp that holds a door shut' },
};
console.log('C2M30: entities', ents.length);
const Z = (x, z) => [x, z, 0];
export const waypoints = {
  main: [Z(8, CZ), Z(22, CZ), Z(40, CZ), Z(58, CZ), Z(76, CZ), Z(94, CZ), Z(103, CZ), Z(106, CZ), { op: 'wait', seconds: 2 }, Z(109, CZ)],
  secret: [Z(8, CZ), Z(22, CZ), Z(40, CZ), Z(58, CZ), Z(67, CZ + 3), { op: 'use', at: SEC.panel }, Z(67, CZ + 7), Z(67, CZ + 3), Z(76, CZ), Z(94, CZ), Z(103, CZ), Z(106, CZ), { op: 'wait', seconds: 2 }, Z(109, CZ)],
};
export default MAP;
