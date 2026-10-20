// C1E4S01 THE QUIET ROOM (secret): Ines's choice, foreshadowed. (Episode 4, Batch B, owner go 2026-10-10.) Entered from the Mirror Array's secret exit, back to the Drift Orchard. One round room, sixteen cells across, stepped down in four rings to a single stone;
// a dome over it, a single warm lamp, nothing else lit. No creatures, no score, no ambience (`atmosphere.silence`: your own footsteps and nothing of the ship). A voice, a message, a cache. The opposite of the Choirless Chamber: that was plaster and
// flagstones in the light of a hall, this is dark smoky glass and one lamp. A vestibule (round) and a short passage lead in; a nook (round) and a passage lead out. Scale class COMPRESSION. Look: quiet.
import { Level, hchar } from '../tools/mapkit/builder.mjs';

const W = 46, H = 34, CX = 24, CZ = 17;
const L = new Level(W, H, { fill: '3' }); L.usedHeights = true; L.usedCeil = true;
const rOf = (x, z) => Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
// the room: four steps down to the stone (a half-metre each); the lid is a dome, 9 m over the stone, 4.5 m at the wall
for (let z = CZ - 10; z <= CZ + 10; z++) for (let x = CX - 10; x <= CX + 10; x++) {
  const r = rOf(x, z); if (r > 8.5) continue;
  const h = r <= 2.6 ? 0 : r <= 4.6 ? 1 : r <= 6.6 ? 2 : 3;
  L.g[z][x] = '5'; L.ht[z][x] = h; L.ce[z][x] = hchar(Math.round(2 * (9 - 0.5 * r)) + 0);
}
const vest = L.disc(6, 17, 3.7, 3.5, '5', '3'), nook = L.disc(40, 17, 3.2, 3.2, '5', '3');
for (const [x, z] of [...vest, ...nook].map((k) => k.split(',').map(Number))) { L.ht[z][x] = 3; }
L.rect([9, 17, 15, 17], '5'); L.rect([32, 17, 38, 17], '5');                                 // the passages (their floors are the outer ring's height)
for (let x = 9; x <= 15; x++) L.ht[17][x] = 3; for (let x = 32; x <= 38; x++) L.ht[17][x] = 3;

L.put(5, 17, '@');
// the stone at the middle: a table (an altar with nothing on it), one lamp hung over it; the cache is on the second ring
const ents = [{ type: 'prop', kind: 'table', at: [CX, CZ] }, { type: 'prop', kind: 'lantern', at: [CX - 2, CZ - 1] }, { type: 'prop', kind: 'lantern', at: [CX + 2, CZ + 1] }];
for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 + 0.4, x = Math.floor(CX + 6.2 * Math.cos(a)), z = Math.floor(CZ + 6.2 * Math.sin(a)); ents.push({ type: 'prop', kind: 'lantern', at: [x, z] }); }       // a ring of lanterns on the third step
const put = (kind, x, z) => { if (L.g[z][x] === '5') ents.push({ type: 'pickup', kind, at: [x, z] }); else console.log('S01: no cell for', kind, x, z); };
put('armor_vest', 19, 14); put('health_large', 29, 14); put('ammo_shell', 19, 20); put('ammo_rivet', 29, 20); put('ammo_flare', 24, 24); put('health_large', 24, 10);
for (const [x, z] of [[3, 15], [3, 19], [42, 15], [42, 19]]) ents.push({ type: 'prop', kind: 'lantern', at: [x, z] });
const MAP = {
  id: 'C1E4S01', name: 'The Quiet Room', version: 1, ceilingHeight: 4.2, par: { time: 150 },
  atmosphere: { fog: '#0c0a08', fogDensity: 0.012, sky: 'orbit', ambient: 0.9, look: 'quiet', silence: true },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'THE QUIET ROOM', lines: ['The hum has gone again.', 'Someone kept this room.'] },
  outro: 'Back to the array, and on. The orchard is next.',
  objective: 'Walk into the quiet. There is no hurry',
  ...L.layers(),
  entities: [...ents, { type: 'exit', at: [40, 17], dest: 'next' }],
  messages: [
    { id: 'arrive', at: [5, 17], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, I have lost the hum again. This room is on no plan I have. Stay as long as you like. I will be here.' },
    { id: 'room', at: [24, 17], radius: 4, speaker: 'A TIDE-WARDEN', text: 'I held Pier Nine\'s lock when the first ships came, and was taken up the cable. A door is held from one side or the other. I chose the side I could see. You may choose differently.' },
    { id: 'ines', at: [24, 10], radius: 3, speaker: 'INES', text: 'That is a great deal of words for someone who is not here to hear the answer.' },
    { id: 'cache', at: [19, 14], radius: 3, speaker: 'HULL', text: 'A cache, left for whoever came after. It is dry. Someone looked after it.' },
  ],
  triggers: [
    { id: 'stone', when: 'enter', at: [CX, CZ], radius: 3.5, do: [{ objective: 'Take what was left. The way out is east, past the stone' }] },
    { id: 'out', when: 'enter', at: [34, 17], radius: 2.5, do: [{ objective: 'The way out is the nook ahead. The orchard is next' }] },
  ],
  quality: { safe: true, enemies: [0, 0], botSeconds: [5, 300], mechanics: ['heights', 'triggers'], skins: 2,
    scaleClass: 'COMPRESSION', introduces: 'the Quiet Room: a round room stepped down to a stone, no creatures, no sound of the ship, and the voice of a Tide-Warden who held a door and stayed with it (Ines\'s choice, foreshadowed)' },
};
export default MAP;
