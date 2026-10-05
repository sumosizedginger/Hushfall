// C1E2M01 BRINE GATE: Checkpoint assault across open ground. The processing site is guarded and organised.
// SCAFFOLD (npm run map:new): a bare room from the player to the exit. Design it: the brief in design/ first, then rooms, objects, triggers, messages, quality. New idea of this map: TODO.
// Cell coordinates (x = column, z = row); rooms with L.room([x0,z0,x1,z1], { floor, wall }); objects with L.put / L.putAll (legend in tools/mapkit/compile.mjs); see maps-src/C1E1M03.level.mjs.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(40, 30);
L.room([2, 12, 37, 18], { floor: '.', wall: '#' });                                      // TODO: the whole map
L.put(4, 15, '@'); L.put(35, 15, '>');

const layers = L.layers();

export default {
  id: 'C1E2M01', name: 'Brine Gate', version: 1, ceilingHeight: 3.4, par: { time: 600 },                      // TODO: par from the owner's clear times
  atmosphere: { fog: '#20262e', fogDensity: 0.012, sky: 'overcast' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 8, shell: 12, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'BRINE GATE', lines: ['TODO: two lines that set the scene.'] },
  outro: 'TODO: one line toward C1E2M02.',
  objective: 'TODO: the objective line.',
  ...layers,
  messages: [],
  quality: { enemies: [0, 0], botSeconds: [10, 600], mechanics: [], skins: 1 },                                // TODO: the contract this map must meet (see another map's quality block)
};
