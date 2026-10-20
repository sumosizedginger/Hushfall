// C1E3S01 THE CHOIRLESS CHAMBER (secret): the silent inverse of the ship. A Vael defector's message. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch C, owner go 2026-10-09; the rooms were redrawn the same night after the owner asked "are they all boxes?")
// Entered from Marrow Nave's secret exit; returns to the Resonance Loom. Somewhere inside the grown ship is a room that was scrubbed of the Song and kept that way: plain plaster, flagstones, empty choir stalls in arcs, a bell with its tongue cut
// out. No enemies, and no sound of the ship at all (`atmosphere.silence`: the audio keeps your own footsteps and your guns and nothing else: no score, no ambience, no tolling). A Vael that left the Choir left a message in the alcove at the end,
// and a cache. Three ROUND rooms (a vestibule, a round hall with four pillars and the stalls in two arcs, an oval alcove) joined by short passages; scale class COMPRESSION (all roofed); the walls are plaster, the opposite of the ribs.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(46, 30);
const WALL = 'P';
/** an ellipse of floor (cx, cz, rx, rz) with a wall drawn round it: the rooms of this map are round, because the ship's are not */
function disc(cx, cz, rx, rz, floor) {
  const cells = new Set();
  for (let z = Math.floor(cz - rz) - 1; z <= Math.ceil(cz + rz) + 1; z++) for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) if (((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1) { L.rect([x, z, x, z], floor); cells.add(x + ',' + z); }
  for (const k of cells) { const [x, z] = k.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const nx = x + dx, nz = z + dz; if (!cells.has(nx + ',' + nz) && L.g[nz]?.[nx] === '#') L.g[nz][nx] = WALL; } }
}

// the vestibule, the round hall of stalls, the defector's oval alcove, and the passages between them
disc(5.5, 14, 3.8, 4.2, 'n'); disc(20, 14, 8.5, 8.5, 'f'); disc(35, 14, 5.8, 4.8, 'f');
L.room([9, 14, 11, 14], { floor: 'n', wall: WALL }); L.room([28, 14, 30, 14], { floor: 'f', wall: WALL });

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 14, '@'); L.put(38, 14, '>');
L.putAll('n', [[4, 12], [4, 16], [7, 12], [7, 16]]); L.put(6, 14, 'h');
// the hall: four pillars in a ring, the empty stalls (tables) in two arcs either side of the way through; lanterns
L.putAll('P', [[15, 11], [15, 17], [25, 11], [25, 17]]);
for (const z of [9, 19]) for (const x of [17, 18, 19, 21, 22, 23]) L.put(x, z, 'f');
for (const z of [11, 17]) for (const x of [13, 14, 26, 27]) L.put(x, z, 'f');
L.putAll('n', [[15, 9], [25, 9], [15, 19], [25, 19], [19, 14]]);
L.putAll('h', [[14, 14], [22, 14]]);
// the alcove: a bell with its tongue cut out (the bellnode prop, silent), two shelves of nothing, the cache
L.put(36, 14, 'N'); L.putAll('F', [[36, 11], [36, 17]]); L.putAll('n', [[32, 11], [32, 17], [39, 11], [39, 17]]);
L.putAll('H', [[33, 12], [33, 16]]); L.putAll('v', [[34, 11], [34, 17]]); L.putAll('e', [[33, 13], [33, 15]]); L.putAll('r', [[34, 13], [34, 15]]); L.putAll('a', [[35, 12], [35, 16]]);

const layers = L.layers();

const MAP = {
  id: 'C1E3S01', name: 'The Choirless Chamber', version: 1, ceilingHeight: 3.6, par: { time: 150 },
  atmosphere: { fog: '#c4c8c0', fogDensity: 0.01, sky: 'overcast', ambient: 0.9, look: 'salt', silence: true },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'THE CHOIRLESS CHAMBER', lines: ['The hum has stopped.', 'Listen to what the ship is not saying.'] },
  outro: 'Back to the ship. The Resonance Loom is next.',
  objective: 'Walk the hall. It is silent',
  ...layers,
  entities: [],
  messages: [
    { id: 'arrive', at: [5, 14], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, I have lost the hum. It didn\'t fade; it stopped. There\'s nothing from the ship where you\'re standing. I don\'t know whether to be glad.' },
    { id: 'hall', at: [19, 14], radius: 5, speaker: 'INES', text: 'No ribs. No growth. Plaster and stone, and rows of empty stalls. Someone scrubbed the Song out of these walls and kept it out.' },
    { id: 'quiet', at: [36, 14], radius: 4, speaker: 'THE QUIET ONE', text: 'I was a voice, once. I stopped. The Song is a count of who is left to sing. Go to the Loom and cut the thread. It is how they tune you.' },
    { id: 'bell', at: [34, 14], radius: 2, speaker: 'HULL', text: 'A bell with its tongue cut out. Someone did this on purpose, and cleaned up after.' },
  ],
  triggers: [
    { id: 'hall', when: 'enter', at: [14, 14], radius: 3, do: [{ objective: 'The alcove is at the east end of the hall' }] },
    { id: 'alcove', when: 'enter', at: [31, 14], radius: 2.5, do: [{ objective: 'Take what was left for you. The way out is behind the bell' }] },
  ],
  quality: { safe: true, enemies: [0, 0], botSeconds: [5, 300], mechanics: ['triggers'], skins: 3,
    scaleClass: 'COMPRESSION', introduces: 'the Choirless Chamber: the first place in the ship the Song does not reach (no score, no ambience, no tolling: only your own sound), and the first word from a Vael that left the Choir' },
};


export default MAP;
