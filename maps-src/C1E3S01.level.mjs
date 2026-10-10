// C1E3S01 THE CHOIRLESS CHAMBER (secret): the silent inverse of the ship. A Vael defector's message. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch C, owner go 2026-10-09.)
// Entered from Marrow Nave's secret exit; returns to the Resonance Loom (not built yet). Somewhere inside the grown ship is a room that was scrubbed of the Song and kept that way: plain plaster, flagstones, empty choir stalls in rows, a
// bell with its tongue cut out. No enemies, and no sound of the ship at all (`atmosphere.silence`: the audio keeps your own footsteps and your guns and nothing else: no score, no ambience, no tolling). A Vael that left the Choir
// left a message in the alcove at the end, and a cache. Scale class COMPRESSION (all roofed); the walls are plaster, the opposite of the ribs.
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(46, 30);
const WALL = 'P';

// the antechamber, the hall of stalls, the defector's alcove
L.room([3, 11, 8, 17], { floor: 'n', wall: WALL });
L.room([12, 6, 27, 22], { floor: 'f', wall: WALL }); L.rect([9, 14, 11, 14], 'n');
L.room([31, 10, 40, 18], { floor: 'f', wall: WALL }); L.rect([28, 14, 30, 14], 'f');

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 14, '@'); L.put(38, 14, '>');
L.putAll('n', [[4, 12], [4, 16], [7, 12], [7, 16]]); L.put(6, 14, 'h');
// the hall: pillars and rows of empty stalls (tables) either side of the way through; lanterns
L.putAll('P', [[16, 10], [16, 18], [23, 10], [23, 18]]);
for (const z of [8, 20]) for (const x of [14, 15, 18, 19, 20, 21, 24, 25]) L.put(x, z, 'f');
for (const z of [12, 16]) for (const x of [14, 15, 24, 25]) L.put(x, z, 'f');
L.putAll('n', [[13, 7], [26, 7], [13, 21], [26, 21], [19, 14]]);
L.putAll('h', [[14, 14], [22, 14]]);
// the alcove: a bell with its tongue cut out (the bellnode prop, silent), two shelves of nothing, the cache
L.put(36, 14, 'N'); L.putAll('F', [[36, 11], [36, 17]]); L.putAll('n', [[32, 11], [32, 17], [39, 11], [39, 17]]);
L.putAll('H', [[33, 12], [33, 16]]); L.putAll('v', [[34, 11], [34, 17]]); L.putAll('e', [[33, 13], [33, 15]]); L.putAll('r', [[34, 13], [34, 15]]); L.putAll('a', [[35, 12], [35, 16]]);

// ---- PT-021, rooms that are not boxes (the lane of the routes decides what may be cut) -----------------------------------------------------------------------------------------------------
const S = new Shape(L, { lane: laneOf('C1E3S01'), keep: [] });
S.hall([12, 6, 27, 22], { sides: { n: { w: 3, gap: 3, d: 1 }, s: { w: 3, gap: 3, d: 1 } }, cut: 2 });
S.hall([31, 10, 40, 18], { sides: { n: { w: 3, gap: 2, d: 1 }, s: { w: 3, gap: 2, d: 1 }, e: { w: 3, gap: 2, d: 1 } }, cut: 1 });
S.chamfer([3, 11, 8, 17], 'nw ne sw se', 1);
console.log('C1E3S01 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

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
    { id: 'arrive', at: [5, 14], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, I have lost the hum. Not faded: gone. There is no signal where you are standing. I do not know whether to be glad.' },
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

MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];

export default MAP;
