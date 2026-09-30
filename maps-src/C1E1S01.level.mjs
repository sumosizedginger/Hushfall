// C1E1S01 THE LIGHTHOUSE CELLAR (secret): a quiet cache room behind an unremarkable wall. Warden Calder's family history.
// Entered from The Drowned Chandlery's secret exit; returns to Lamplighter Hill. No enemies: a place to stand still. Cache below, a beacon room above (a 4 m climb, open to the sea).
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(30, 28);
L.rect([0, 0, 29, 1], '~');                                                                          // the sea to the north
L.room([3, 14, 14, 24], { floor: 'f', wall: 'W' });                                                  // the keeper's cellar
L.room([6, 6, 7, 13], { floor: 'f', wall: 'W' }); L.stairs([6, 6, 7, 13], 'z', 8, 1);               // the stair up the tower (4 m)
L.room([3, 2, 10, 5], { floor: 's', wall: 'C' }); L.height([3, 2, 10, 5], 8);                        // the beacon room, open to the sea on its north side
L.rect([3, 1, 10, 1], '~');
L.room([15, 19, 18, 19], { floor: 'f', wall: 'W' }); L.door(15, 19); L.room([19, 17, 25, 21], { floor: 't', wall: 'P' }); L.door(18, 19);     // the way out: a short hall to the harbour road

L.put(4, 22, '@');
// cellar: warm, lived-in
L.putAll('F', [[4, 15], [5, 15], [12, 15], [13, 15]]); L.putAll('f', [[9, 17], [10, 17], [4, 19]]); L.putAll('o', [[13, 22], [4, 17]]); L.putAll('y', [[12, 21], [13, 20]]); L.putAll('c', [[13, 17], [13, 18]]); L.putAll('d', [[5, 23], [11, 23]]);
L.putAll('m', [[6, 17], [9, 21], [5, 21]]); L.putAll('n', [[8, 15], [11, 19]]);
L.putAll('H', [[10, 16], [5, 20]]); L.putAll('v', [[4, 16], [13, 23]]); L.putAll('e', [[12, 18], [11, 22]]); L.putAll('a', [[6, 22], [7, 20]]); L.putAll('r', [[9, 22], [8, 19]]);
// beacon room: the lamp itself, and the view
L.putAll('n', [[5, 3], [9, 3], [7, 4]]); L.putAll('H', [[4, 4]]); L.putAll('v', [[10, 4]]); L.putAll('r', [[6, 4], [8, 4]]);
// the way out
L.putAll('m', [[22, 19]]); L.put(25, 19, '>');

const layers = L.layers();

export default {
  id: 'C1E1S01', name: 'The Lighthouse Cellar', version: 1, ceilingHeight: 3.4, par: { time: 240 },
  atmosphere: { fog: '#20262e', fogDensity: 0.01, sky: 'night' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 8, shell: 12, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'THE LIGHTHOUSE CELLAR', lines: ['A warm room under a dark lamp.', 'Nothing here wants you dead. Take a breath.'] },
  outro: 'Back to the harbour road. Lamplighter Hill is next.',
  objective: 'Rest. Read. The beacon room is up the tower stair.',
  ...layers,
  messages: [
    { id: 'arrive', at: [4, 22], radius: 3, speaker: 'LIGHTHOUSE KEEPER', text: 'Welcome, Calder. Your father kept this cellar for the day the harbour needed one. It does now. Sit a minute.' },
    { id: 'log1', at: [9, 16], radius: 2.5, speaker: "WARDEN CALDER'S LOG", text: 'First entry. The hum in the chalk. I knew it for what it was. Ines hears none of it: the ear I damaged by accident may be the best thing I ever did.' },
    { id: 'drawing', at: [4, 18], radius: 2, speaker: "A CHILD'S DRAWING", text: 'A bell tower ringed in red crayon. In the corner, in your own hand at six years old: "the loud one".' },
    { id: 'stair', at: [6, 11], radius: 2, speaker: 'INES', text: 'Every step of this stair was cut by hand. He climbed it every night to keep the lamp lit. Every night for thirty years.' },
    { id: 'lamp', at: [7, 4], radius: 3, speaker: 'BEACON NOTES', text: 'The lamp flashes once a minute. Not for ships. It is a counter-tone: a sound turned into light. Keep it lit, and it holds the tone back from the harbour.' },
    { id: 'end', at: [22, 19], radius: 2, speaker: 'INES', text: 'Thank you, Dad. I will keep it lit.' },
  ],
  quality: { safe: true, enemies: [0, 0], botSeconds: [20, 180], mechanics: ['heights'], skins: 4 },
};
