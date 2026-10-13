// THE UNRUNG GATE'S WALK (PT-043, design/PREVIEW.md, design/ACTD.md C2M30): a DEV-ONLY map, the ending as it is meant to be played: a short walk in silence (`atmosphere.silence`), dark but for the hand lantern, callbacks of the descent in reverse, each a small room with the one
// object that stands for it, and at the end the Gate: a door that is also a bell. The last input: light the lamp (L) and keep it lit. Build it with  node tools/dev/build-range.mjs HIVEEND  (maps-dev/HIVEEND.json); the DEV level picker lists it.
// The lantern is ETERNAL here (Ines's own lamp: it never burns out). When it is lit at the Gate the exit opens; the exit shows the DRAFT epilogue of Campaign Two (src/game/ending.js ENDINGS[2], `devEnding`) and then goes back to the title. Every word a first draft.
import { Level } from '../tools/mapkit/builder.mjs';
import { placer } from '../tools/mapkit/c2.mjs';

const W = 120, H = 26, L = new Level(W, H, { fill: '#' }); L.usedHeights = true; L.usedCeil = true;
const P = placer(L, { silent: false }), ents = P.ents, put = (e) => ents.push(e);
const FL = 'Ξ', WL = 'ξ', CZ = 13;
// a corridor of five small rooms (x 6..~108), each opening into the next; the Gate at the end
const ROOMS = [[6, 20, 'the floor of the Bell, the roots drawn back'], [24, 38, 'a stair up the shaft'], [42, 56, 'the Hive, the beat gone'], [60, 74, 'the Deep, a single bell'], [78, 92, 'the steppe under a low red sun'], [96, 110, 'the Gate']];
ROOMS.forEach(([x0, x1], i) => { L.room([x0, CZ - 4, x1, CZ + 4], { floor: FL, wall: WL }); if (i) L.rect([ROOMS[i - 1][1] + 1, CZ - 1, x0 - 1, CZ + 1], FL); });
L.rect([ROOMS[0][1] + 1, CZ - 1, ROOMS[1][0] - 1, CZ + 1], FL);
L.ceiling([4, CZ - 6, 112, CZ + 6], 6);
// the one object of each room, and a lantern hung beside the last
put({ type: 'prop', kind: 'pillar', at: [13, CZ - 2] }); put({ type: 'prop', kind: 'pillar', at: [13, CZ + 2] });
put({ type: 'prop', kind: 'pew', at: [31, CZ + 2] }); put({ type: 'prop', kind: 'organ', at: [49, CZ - 2] }); put({ type: 'prop', kind: 'lantern', at: [67, CZ + 2] });
put({ type: 'prop', kind: 'lamppost', at: [85, CZ - 2] }); put({ type: 'prop', kind: 'lantern', at: [103, CZ - 3] });
L.put(8, CZ, '@');
put({ type: 'exit', dest: 'secret', at: [109, CZ], locked: true });
const layers = L.layers();

const msg = (id, x, z, r, speaker, text) => ({ id, at: [x, z], radius: r, speaker, text });
export default {
  id: 'HIVEEND', name: 'The Unrung Gate (dev only)', version: 1, ceilingHeight: 6, dev: true,
  atmosphere: { look: 'unrung', dark: true, silence: true, fog: '#2a2a32', fogDensity: 0.012, sky: 'gate_dim' },
  lantern: { oil: 60, max: 60, eternal: true },
  lampHolds: { plain: 0.6, own: 0.4 },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 4 }, weapons: ['flare'] },
  intro: { title: 'THE UNRUNG GATE', lines: ['A short walk, in silence.', 'At the Gate: light the lamp (L), and keep it lit.'] },
  objective: 'Walk to the Gate. The lamp is yours: L',
  ...layers,
  entities: ents.map((e) => ({ ...e })),
  scenery: [{ kind: 'arch', at: [118, CZ], y: 0, scale: 0.7, yaw: 1.5708 }],
  startFacing: 'east',
  devEnding: { dest: 'secret', ending: 2 },
  messages: [
    msg('floor', 13, CZ, 5, 'INES', 'The floor of the Bell. The roots have drawn back from the walls and left the stone clean, as if it had been waiting for someone to sweep it.'),
    msg('shaft', 31, CZ, 5, 'INES', 'The stair goes up the inside of the shaft. A plate at the first landing says how far down this is. I do not read the number.'),
    msg('hive', 49, CZ, 5, 'INES', 'The Hive, and nothing moving in it. The organs hang where they hung and none of them swells. Whatever kept the beat has stopped.'),
    msg('deep', 67, CZ, 5, 'INES', 'The city under the stone. Every lamp out, and one bell, high up, that nobody is ringing. It sways a little. I count three swings and then I stop counting.'),
    msg('steppe', 85, CZ, 5, 'INES', 'A road across a plain under a low red sun. It is not the one I walked. It is the one that was always going to be here when I got to this end.'),
    msg('gate', 103, CZ, 4, 'SIGNAL HOUSE', 'Ines. I have you on the set. There is no line down there, and I have you. What is in front of you?'),
    msg('door', 106, CZ, 3, 'INES', 'A door that is also a bell. A hook beside it, the kind a lamp hangs from. My father said what a lamp is for. Light it, and keep it lit.'),
    msg('lit', 1, 1, 0.1, 'SIGNAL HOUSE', 'The bell on the door has gone quiet. It is holding.'),
  ],
  triggers: [
    { id: 'door', when: ['msg:door', 'lamp:on'], do: [{ exit: { set: 'unlock' } }, { message: 'lit' }, { objective: 'The lamp is lit and the door is quiet. Walk through' }] },
  ],
};
console.log('HIVEEND: entities', ents.length);
