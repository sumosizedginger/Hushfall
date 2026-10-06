// C1E2M05 THE CRADLE ANNEX: the first cradle-pod reveal, stealth-to-brawl. The Grafting mechanism shown, not told.
// Scale class COMPRESSION (design/CAMPAIGN_SPINE.md): roofed, three bays divided by walls with arches. The new idea is THE FIRST VAEL-GROWN ENEMY, the Drone-Gill, and the way it is shown: the first two bays are QUIET
// (rows of pods hanging in cradles, a few sleepers at the far ends, ammunition and lanterns: you may walk it without firing); at the middle of the aisle the pods HATCH (four Drone-Gills spawn from them, the ambush
// closets in the walls open on Gaunts): a quiet hall becomes a brawl, and the player learns to aim up. The table room beyond holds the release lever and a second pair of sleeping Gills.
// Route: the airlock (two inert pods already hang here) -> the aisle (bays 1 and 2) -> the hatch -> the brawl -> the graft table room -> the release lever -> the exit.
// Optional: a SECRET store behind a panel in the aisle's north wall.
// Open air vs roof: everything is `g f` (roofed). Nothing is hung in the open.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(72, 44);

// ---- the airlock, the aisle (three bays, resin walls, grate floor), the graft table room ----------------------------------------------------------------------------------------
L.room([3, 19, 9, 25], { floor: 'f', wall: 'K' }); L.door(10, 22);
L.room([11, 16, 44, 28], { floor: 'g', wall: 'R' });
L.rect([21, 16, 22, 19], 'R'); L.rect([21, 25, 22, 28], 'R'); L.rect([33, 16, 34, 19], 'R'); L.rect([33, 25, 34, 28], 'R');          // two walls across the aisle with a five-wide arch each
for (const [x, z, cz] of [[26, 15, 14], [30, 15, 14]]) { L.closet(x, z); L.rect([x, cz, x, cz], 'f'); }   // two ambush closets: a cubby behind each shut panel (they open when the pods hatch)
L.room([46, 14, 62, 30], { floor: 'f', wall: 'Y' }); L.door(45, 22);
L.rect([52, 20, 56, 24], 'Y');                                                                                                  // the graft table: a solid block in the middle of the room
L.room([16, 12, 20, 14], { floor: 'f', wall: 'R' }); L.secretPanel(18, 15);                                                      // the store (secret)

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 22, '@');
// the airlock: two inert pods already hang here (the first thing wrong, within 12 m of the spawn), a bench, lamps, a little ammunition
L.putAll('D', [[6, 20], [6, 24]]); L.putAll('f', [[4, 20], [4, 24]]); L.put(3, 22, 'F'); L.putAll('m', [[5, 19], [5, 25]]); L.putAll('e', [[8, 21], [8, 23]]); L.putAll('r', [[3, 20], [3, 24]]); L.put(7, 22, 'h');
// the aisle: rows of cradles with pods hanging in them (machinery, quiet), lanterns; a few sleepers at the far ends; ammunition and health on the lane z=21..23
L.putAll('O', [[14, 18], [14, 26], [18, 18], [18, 26], [24, 18], [24, 26], [28, 17], [28, 27], [36, 18], [36, 26], [40, 18], [40, 26]]);
L.putAll('D', [[15, 20], [15, 24], [19, 21], [19, 23], [25, 19], [25, 25], [29, 19], [29, 25], [37, 20], [37, 24], [41, 21], [41, 23]]);
L.putAll('n', [[13, 22], [23, 22], [32, 22], [43, 22]]); L.putAll('m', [[16, 17], [16, 27], [38, 17], [38, 27], [28, 20], [28, 24]]);
L.putAll('t', [[14, 21], [14, 23], [18, 17]]); L.put(19, 27, 't');                                                                 // bay 1: asleep
L.putAll('t', [[38, 21], [38, 23]]); L.putAll('g', [[42, 19], [42, 25]]);                                                           // bay 3: asleep
L.putAll('g', [[26, 14], [30, 14]]);                                                                           // the Gaunts asleep in the cradle closets (group `brood`)
L.putAll('e', [[12, 21], [17, 22], [24, 22], [27, 22], [31, 22], [35, 22], [40, 22]]); L.putAll('r', [[12, 23], [20, 22], [26, 21], [30, 23], [36, 22], [43, 21]]); L.putAll('a', [[16, 22], [28, 22], [33, 21], [39, 22], [43, 23]]);
L.putAll('h', [[13, 20], [17, 24], [27, 23], [31, 21], [35, 23]]); L.putAll('H', [[23, 21], [35, 21]]); L.put(29, 22, 'v');
L.putAll('P', [[20, 17], [20, 27], [32, 17], [32, 27]]);
// the table room: the graft table in the middle, pillars, the lever on the east wall; Bellhands, a guard, and two Drone-Gills asleep over the table
L.putAll('t', [[48, 17], [58, 27]]); L.putAll('g', [[50, 22], [60, 22]]); L.put(58, 16, 'b'); L.putAll('G', [[52, 18], [52, 26]]);
L.putAll('P', [[50, 19], [50, 25], [58, 20], [58, 24]]); L.putAll('O', [[48, 22], [60, 18], [60, 26]]); L.putAll('D', [[54, 17], [54, 27], [61, 22]]); L.putAll('n', [[47, 15], [47, 29], [61, 15]]);
L.putAll('e', [[47, 21], [47, 23], [57, 19], [57, 25]]); L.putAll('r', [[47, 20], [47, 24], [59, 21]]); L.putAll('a', [[46, 22], [57, 22]]); L.putAll('H', [[47, 19], [47, 25]]); L.putAll('h', [[60, 20], [60, 24]]); L.put(61, 29, 'v');
// the store (secret): a cache
L.put(17, 13, 'v'); L.put(19, 13, 'H'); L.put(17, 12, 'e'); L.put(19, 12, 'r'); L.put(18, 13, 'a');

const layers = L.layers();

export default {
  id: 'C1E2M05', name: 'The Cradle Annex', version: 1, ceilingHeight: 4.2, par: { time: 300 },
  atmosphere: { fog: '#1c2a2a', fogDensity: 0.02, sky: 'night', ambient: 0.55 },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'THE CRADLE ANNEX', lines: ['They are not making them here. They are growing them.', 'Do not touch anything that hangs.'] },
  outro: 'Next: the Pump Cathedral. What the Works drains from the sea comes up through the floor of a church.',
  objective: 'Cross the aisle quietly. Nothing is awake yet: the release lever is in the table room, east',
  ...layers,
  secrets: [{ id: 'the-store', panel: [18, 15], cells: [[18, 14], [18, 13], [18, 12]] }],
  groups: [{ name: 'brood', rect: [26, 14, 30, 14] }],
  entities: [
    { type: 'exit', at: [61, 28], locked: true, dest: 'next' },
    { type: 'switch', id: 'release', at: [62, 22], wall: 'east', do: [{ exit: { set: 'unlock' } }, { objective: 'The line is stopped. The exit is in the south-east corner of the table room' }, { shake: 1.5 }, { message: 'stopped' }] },
  ],
  messages: [
    { id: 'start', at: [5, 22], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Cradle Annex. This is where the grafts are made. Do not run, do not fire. Nothing in here is awake yet.' },
    { id: 'pods', at: [8, 22], radius: 3, speaker: 'INES', text: 'Pods. Hanging, like fruit. Something is moving in the nearest. Walk slowly.' },
    { id: 'aisle', at: [18, 22], radius: 3, speaker: 'INES', text: 'Rows of them. This is the line. They hang the shells here, and they put something else in the shells.' },
    { id: 'hatch', at: [28, 22], radius: 0.1, speaker: 'INES', text: 'They are hatching! Not people. Not anything I know. Aim UP: they are flying.' },
    { id: 'store', at: [18, 13], radius: 2.5, speaker: 'STORE LOG', text: 'SPARE SHELLS AND BELTS FOR THE NIGHT CREW. KEEP THE PANEL CLOSED: THE HATCHERY SMELLS.' },
    { id: 'table', at: [49, 22], radius: 4, speaker: 'INES', text: 'The graft table. This is where the shell is joined to what grows in the pod. The lever on the east wall stops the line.' },
    { id: 'stopped', at: [62, 22], radius: 0.1, speaker: 'SIGNAL HOUSE', text: 'The line is stopped. Calder, those were not drones in the aisle: they were hatchlings. The Vael are growing their own now.' },
  ],
  triggers: [
    { id: 'hatch', when: 'enter', at: [28, 22], radius: 3, do: [
      { spawn: { kind: 'gill', at: [25, 19], group: 'brood', facing: 'south' } }, { spawn: { kind: 'gill', at: [29, 25], group: 'brood', facing: 'north' } },
      { open: [26, 15] }, { open: [30, 15] }, { wake: 'brood' }, { shake: 2 }, { message: 'hatch' }, { objective: 'The pods have hatched: flying Drone-Gills, and Gaunts in the walls. Aim up' }] },
  ],
  quality: { enemies: [14, 50], botSeconds: [40, 600], mechanics: ['triggers', 'switches', 'closets', 'secret'], skins: 5, enemyKinds: { gill: 2, bellhand: 1 },
    scaleClass: 'COMPRESSION', introduces: 'the first non-human enemy: the Drone-Gill, a flying Vael hatchling, revealed by pods that crack open in a quiet hall and by ambush closets that open around you' },
};
