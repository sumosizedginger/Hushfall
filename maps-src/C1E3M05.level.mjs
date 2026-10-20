// C1E3M05 RESONANCE LOOM: timing platforms and sound-lock doors. How the Hush is tuned. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch D, owner overnight go 2026-10-09.)
// The ship tunes its song in a hall that is a loom: gold strings strung from the vault, and under them a PIT that nobody is meant to cross on foot. Four TIMING PLATFORMS (src/engine/platforms.js: a floor on a pure clock, 14 s a beat, each one
// two seconds behind the one before it) cross the pit from the west ledge to the east; the pit is toxic (a fall is not fatal: there are stairs out of it, but it burns), and the long way round is a walkway along each side with singers on it.
// The doors are SOUND-LOCKS: a door that listens (it opens to Use only after four seconds without noise near it): the first on the way into the hall, the second on the way into the Heart, where the tuned stand in rows asleep and an ACOLYTE
// (the Choir's attendant, new: it wards everything within nine metres) keeps them. A lever in the Heart opens the last door.
// Route (main): the Spool Room (two sleepers by the door: kill them and wait the lock out, or sneak) -> the hall's west ledge (Gaunts, a Bellhand, singers on the walkways) -> the platforms (waitplatform ops) -> the east ledge (an Acolyte warding a
// Bulwark Shell, a Bellhand and runners: kill the Acolyte first) -> the second lock -> the Heart (the tuned, an Acolyte, a Sexton; the lever) -> the exit. Secret: a loose panel in the hall's south wall and a cellar of strings behind it.
// Scale class COMPRESSION (all roofed, round rooms). Look: loom (dim violet and gold), lacquered posts and taut strings for walls, a woven floor.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(74, 60);
const WALL = 'M', FLOOR = 'w';

// ---- the Spool Room, the Warp Hall with its pit and platforms, the Heart, the exit, the cellar -------------------------------------------------------------------------------------------------------------
L.disc(7, 28.5, 4.5, 4.5, FLOOR, WALL);                                                           // the Spool Room: round, where you arrive
L.room([13, 28, 16, 28], { floor: FLOOR, wall: WALL }); L.door(12, 28, { soundlock: { quiet: 4 } });   // the first sound-lock, and a short passage behind it
L.disc(29, 28.5, 12.5, 13, FLOOR, WALL);                                                            // the Warp Hall: an ellipse 25 x 26 cells under a 7 m vault
L.height([0, 0, 73, 59], 4); L.ceiling([15, 13, 43, 44], 7);                                        // the whole place stands 2 m up; the hall's roof is 7 m (the platforms rise 2 m)
L.rect([23, 20, 34, 37], FLOOR); L.height([23, 20, 34, 37], 0);                                     // THE PIT: 12 x 18 cells, 2 m down
L.fx([23, 20, 34, 37], 'x'); L.fx([23, 27, 34, 30], '.');                                           // toxic everywhere in it but under the platforms
L.stairs([23, 20, 26, 23], 'z', 4, 1); L.fx([23, 20, 26, 23], '.');                                 // the way out of the pit, north-west ...
L.stairs([31, 34, 34, 37], 'z', 1, 4); L.fx([31, 34, 34, 37], '.');                                 // ... and south-east: a fall is a burn and a walk, not a trap
L.room([42, 28, 45, 28], { floor: FLOOR, wall: WALL }); L.door(43, 28, { soundlock: { quiet: 5 } });  // the second sound-lock, east of the hall
L.disc(51.5, 28.5, 6, 6, 'c', WALL);                                                                // the Heart: the tuned stand in rows, on a carpet
L.room([59, 28, 60, 28], { floor: FLOOR, wall: WALL }); L.door(58, 28, { remote: true });           // the last door: a lever in the Heart opens it
L.disc(65, 28.5, 5, 4.5, 'f', WALL);                                                                // the exit room (flagstones)
L.disc(29, 46, 3.5, 3.5, FLOOR, WALL); L.secretPanel(29, 42);                                       // the cellar of strings behind a loose panel in the hall's south wall

// ---- objects --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(4, 28, '@'); L.put(66, 28, '>');
L.putAll('n', [[4, 26], [4, 31], [9, 25], [9, 32], [23, 18], [23, 39], [37, 19], [36, 39], [47, 26], [47, 31], [56, 26], [56, 31], [63, 26], [63, 31]]);
L.putAll('t', [[9, 26], [9, 31]]);                                                                  // the Spool Room: two sleepers by the first lock
L.putAll('H', [[17, 28], [35, 28], [50, 28], [56, 28]]); L.putAll('v', [[48, 28], [36, 28]]); L.putAll('h', [[21, 28], [41, 28], [47, 28], [27, 28], [30, 28], [38, 28]]);   // (27, 28) and (30, 28) are on the second and third platforms: a medic string on the way across   // health on the lane: west ledge, after the platforms, in the Heart
L.putAll('g', [[19, 22], [19, 35]]); L.put(20, 25, 'b');                                            // the west ledge: runners and a Bellhand
L.put(27, 41, '1');                                                      // the singers on the walkways (symbol 1: Chorister)
L.putAll('t', [[24, 18], [34, 40], [21, 38], [36, 18]]);                                            // sleepers on the walkways
L.put(40, 24, '6'); L.put(40, 31, 'b'); L.put(39, 34, 't'); L.putAll('g', [[38, 22], [38, 33]]);    // the east ledge: an Acolyte (symbol 6) warding a Bulwark Shell (3), a Bellhand, runners
L.putAll('t', [[51, 23], [51, 34], [54, 24], [54, 33]]); L.put(54, 28, '6'); L.put(52, 28, 'x');       // the Heart: the tuned in rows, an Acolyte, a Sexton
L.putAll('m', [[22, 20], [35, 20], [22, 37], [35, 37], [28, 23], [28, 34], [31, 24], [31, 33], [21, 26], [37, 26]]);          // gold lamps hung from the vault over the pit, the ledges and the platforms: the hall was black without them (the first real-game stills)
L.putAll('5', [[21, 20], [21, 37], [26, 18], [32, 18], [26, 39], [32, 39], [38, 21], [38, 36]]);    // the Loom's string frames (symbol 5: loomstring), standing on the ledges
// the cellar (the secret): a cache
L.putAll('H', [[28, 45], [30, 45]]); L.putAll('v', [[28, 47], [30, 47]]); L.putAll('e', [[27, 46], [31, 46]]); L.putAll('r', [[28, 44], [30, 44]]); L.put(29, 47, 'a');

// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [22,28], radius: 2, cells: ENC.around([22,28], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const layers = L.layers();

const MAP = {
  id: 'C1E3M05', name: 'Resonance Loom', version: 1, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { fog: '#1c1428', fogDensity: 0.012, sky: 'night', look: 'loom' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  legend: { 1: { type: 'enemy', kind: 'chorister' }, 3: { type: 'enemy', kind: 'bulwark' }, 6: { type: 'enemy', kind: 'acolyte' }, 5: { type: 'prop', kind: 'loomstring' } },
  intro: { title: 'RESONANCE LOOM', lines: ['The ship tunes the Hush here.', 'The doors are listening.'] },
  outro: 'Next: the Choir Loft. The ship has noticed how quiet you are.',
  objective: 'Cross the Loom. The doors listen: no noise near them',
  ...layers,
  sectors: [26, 29, 32, 35].map((x, i) => ({ id: 'p' + (i + 1), cells: [[x - 3, 27], [x - 2, 27], [x - 1, 27], [x - 3, 28], [x - 2, 28], [x - 1, 28], [x - 3, 29], [x - 2, 29], [x - 1, 29], [x - 3, 30], [x - 2, 30], [x - 1, 30]], low: 0, high: 2, speed: 2, cycle: { period: 14, hold: 8, phase: [0, 12.8, 11.6, 10.4][i] } })),
  secrets: [{ id: 'loose-panel', panel: [29, 42], cells: [[29, 43], [29, 44], [29, 45]] }],
  groups: [{ name: 'east', rect: [35, 18, 42, 40] }, { name: 'heart', rect: [46, 20, 57, 37] }, { name: 'walks', rect: [16, 14, 42, 19] }, { name: 'walks-s', rect: [16, 38, 42, 43] }],
  entities: [
    { type: 'switch', id: 'warp', at: [56, 25], wall: 'east', do: [{ open: [58, 28] }, { objective: 'The last door is open: the exit is east' }, { shake: 1.2 }] },
  ],
  messages: [
    { id: 'start', at: [5, 28], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Loom. Every door in there listens. Make a noise near one and it will not open for you until it has heard nothing for a while. Kill quietly, or wait.' },
    { id: 'lock', at: [11, 28], radius: 2, speaker: 'INES', text: 'It is listening, and your own gun is what it hears. Stand still and count to four. It will let you through.' },
    { id: 'hall', at: [17, 28], radius: 3, speaker: 'HULL', text: 'A pit, and four floors that rise and fall on a beat, each two seconds behind the last. Step on the first when it is up, the next when it comes up. Or go round, past the singers.' },
    { id: 'east', at: [36, 28], radius: 3, speaker: 'INES', text: 'Another of the tall ones, a wheel of bells behind it. Whatever stands near it takes half. Kill it first.' },
    { id: 'heart', at: [47, 28], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Rows of them, standing, asleep: the ones the ship has tuned. If you can cross without a sound, cross. The lever is on the east wall.' },
    { id: 'panel', at: [29, 40], radius: 2, speaker: 'HULL', text: 'One panel in this wall rings wrong. Hollow, like the others were once.' },
    { id: 'exit', at: [62, 28], radius: 2.5, speaker: 'INES', text: 'That is the end of the tuning. Whatever was being tuned is still above us, singing.' },
  ],
  triggers: [
    { id: 'hall', when: 'enter', at: [17, 28], radius: 2.5, do: [{ objective: 'Cross the pit: the platforms rise on the beat, or go round the walkways' }] },
    { id: 'far', when: 'enter', at: [35, 28], radius: 3, do: [{ wake: 'east' }] },
    { id: 'lock2', when: 'enter', at: [41, 28], radius: 2, do: [{ objective: 'The second lock listens: kill the Acolyte, then be quiet for five seconds' }] },
    { id: 'heart', when: 'enter', at: [47, 28], radius: 3, do: [{ objective: 'The lever is on the east wall of the Heart, past the platforms' }] },
  ],
  quality: { enemies: [14, 60], botSeconds: [50, 700], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 4, enemyKinds: { acolyte: 2, chorister: 1, tollbearer: 8, gaunt: 4, bellhand: 2 },
    scaleClass: 'COMPRESSION', tallReason: 'the Warp Hall is the episode\'s one named loom: 7 m to the vault so the platforms have 5 m of air above their top',
    introduces: 'TIMING PLATFORMS (floors on a pure clock, each two seconds behind the last) and SOUND-LOCK DOORS (they open only after a quiet), and the CANTOR ACOLYTE (a ward: everything within nine metres takes half); met as a pit to cross and a lock to wait at' },
};

// ---- PT-025: fed by the dead (src/engine/drops.js): no ammunition boxes on the road, except the cellar's cache (the secret) ----
MAP.drops = { scale: 1 };

// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C1E3M05', lane: [...(laneOf('C1E3M05') ?? [])], keep: [], plan: [{"from":"tollbearer","to":"bellhand","pick":"spread","n":1},{"from":"tollbearer","to":"chorister","pick":"spread","n":1}] };
ENC.apply(MAP);

// ---- PT-065 (R9: the axe moves from Kiln Row to map 21, so a new weapon still turns up in the second half): a fire axe on a hook by the first platform, ON the lane (tools/dev/place-near.mjs), appended after every other entity so no id shifts ----
MAP.entities ??= [];
MAP.entities.push({ type: 'pickup', kind: 'weapon_axe', at: [18, 28] });
(MAP.messages ??= []).push({ id: 'found-axe', at: [18, 28], radius: 1.5, speaker: 'HULL', text: 'A fire axe on a hook by the first platform, the handle worn smooth. Slow, and it takes everything in front of you.' });
MAP.quality.introduces += '; also found here: the fire axe, on a hook by the first platform';
// ---- end PT-065 ----

export default MAP;
