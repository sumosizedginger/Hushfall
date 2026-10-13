// C2S02 INES'S LAMP (Campaign 2, Act C; design/ACTC.md, the secret of C2M23). SET-PIECE, safe: no creature, no score of fighting, almost no sound (`atmosphere.silence`).
// The lamp from the quay and from the title picture, on its post at the end of a short pier into a sea of glass: the lamp, the water, a ring of low stone. It is the only warm light in Act C. Taking it (the lever on the post) sets the choice
// `lamp = own` (the engine remembers it like the wing taken in C2M11): in a dark map that has a hand lantern the lantern burns without oil from then on, and where a map says `lampHolds` a lit lamp cuts a ring harder (0.4 instead of 0.6).
// A reward, never a requirement: the plain lantern works and the ending is the same, and the exit is open from the first step. Three short lines: the weight of it, that she filled it that night, that the Tide-Warden lights it when a boat is out.
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';

const W = 40, H = 44, L = new Level(W, H, { fill: '~' }); L.usedHeights = true; L.usedCeil = false;
const PIER = 'Η', STONE = 'η', POST = 'γ';
// the quay at the south end, the pier, the platform and its ring of low stone
for (let z = 36; z <= 41; z++) for (let x = 14; x <= 25; x++) setCell(L, x, z, PIER, 0);
for (let z = 12; z <= 35; z++) for (let x = 18; x <= 21; x++) setCell(L, x, z, PIER, 0);
for (let z = 5; z <= 13; z++) for (let x = 15; x <= 24; x++) { const d = Math.hypot(x - 19.5, z - 9); if (d <= 4.6) setCell(L, x, z, PIER, 0); }
for (let z = 3; z <= 15; z++) for (let x = 13; x <= 26; x++) { const d = Math.hypot(x - 19.5, z - 9); if (d > 4.6 && d <= 5.8 && !(z >= 13 && x >= 18 && x <= 21)) setCell(L, x, z, STONE, 0); }      // the ring: the pier comes through the south of it
// the post: a block of stone at the middle of the platform, the lamp on its south face
for (let z = 7; z <= 8; z++) for (let x = 19; x <= 20; x++) L.g[z][x] = POST;
const P = placer(L); const { PR } = P; L.put(19, 40, '@'); P.reserve(19, 40);
for (const [x, z] of [[16, 9], [23, 9], [19, 12], [20, 12]]) PR('lamppost', x, z);
const MAP = {
  id: 'C2S02', name: "Ines's Lamp", version: 1, ceilingHeight: 4.2, par: { time: 150 },
  atmosphere: { look: 'quiet', sky: 'dusk', silence: true, fog: '#3a3028', fogDensity: 0.008 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 8, shell: 12, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: "INES'S LAMP", lines: ['A pier into a sea of glass.', 'At the end of it a lamp that is lit.'] },
  outro: 'The pier was the same length going back. The lamp behind her was lit, and then it was not behind her any more.',
  objective: 'Walk the pier to the lamp. Take it, or leave it: the exit is behind you',
  ...L.layers(),
  secrets: [], groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'lamp', at: [19, 9], wall: 'north', once: true, do: [{ choose: { id: 'lamp', value: 'own' } }, { message: 'taken' }, { objective: 'The lamp is yours. Go back down the pier' }] },
    { type: 'exit', at: [19, 41], dest: 'next' }],
  scenery: [],
  messages: [
    { id: 'start', at: [19, 38], radius: 4, speaker: 'INES', text: 'The lamp from the quay, on its post at the end of a pier. The water under the pier is glass, and the lamp is the only thing here that is not.' },
    { id: 'weight', at: [19, 14], radius: 4, speaker: 'INES', text: 'It is heavier than I remembered. The brass is the same. I filled it that night at the second bell, from the can behind the door.' },
    { id: 'use', at: [19, 11], radius: 3, speaker: 'HULL', text: 'The lamp hangs on the south face of the post. Taken, it burns without oil, and a ring that reaches whoever carries it lit is cut to two-fifths.' },
    { id: 'taken', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'The Tide-Warden lights it when a boat is out. There is no boat out. I will carry it anyway.' },
  ],
  triggers: [{ id: 'ring', when: 'enter', at: [19, 15], radius: 4, do: [{ objective: 'The ring of stone: the lamp is on the post inside it' }] }],
  quality: { safe: true, enemies: [0, 0], botSeconds: [5, 300], mechanics: [], skins: 3,
    scaleClass: 'SET-PIECE', reason: 'a pier over open glass: nobody means harm, and the one thing to do is walk to the end of it', introduces: "Ines's lamp: the only warm light in Act C, a reward that holds a ring back harder and never a requirement" },
};
console.log('C2S02: entities', P.ents.length);
export const waypoints = { main: [[19, 40, 0], [19, 30, 0], [19, 20, 0], [19, 13, 0], { op: 'switch', id: 'lamp' }, [19, 20, 0], [19, 36, 0], [19, 41, 0]] };
export default MAP;
