// C1E3M08 THE CANTOR'S THROAT: the Episode 3 boss, the Grand Cantor. The Choir ship's voice.
// A gullet leads into a throat that widens like a horn: a serpentine of four ribs (each rib shuts off most of the width and leaves a gap on the other side, so the way in is an S that sightlines cannot run down), then the BELL, a round chamber 26 x 29 cells
// where the Grand Cantor stands (four-legged, a horn the size of a doorway, a crest of organ pipes) with FOUR REEDS round it. It is shielded while any reed stands. Cut the reeds (a trigger tells you the shield is down), then the Grand Cantor: its pulse is a DOUBLE
// RING (stone stops both rings; hold the cover until the second has gone by), it calls Choristers out of the walls, it fans toll-shots from the start. The exit (north of the bell) is locked until it falls.
// Route: the airlock -> the gullet (the secret: a cellar of caught breath) -> the four ribs (sleepers, a Bulwark, singers, an Acolyte) -> the bell: the reeds, then the Grand Cantor (the bot's `killboss` op) -> the north passage -> the exit.
// Scale class COMPRESSION (all roofed under a 9 m vault; the ribs and a ring of pillars break the sightlines). Look: throat (wet pink and red-violet), ribbed walls, a wet floor.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(74, 58);
const WALL = 'H';
const CZ = 28;
const half = (x) => Math.round(4 + (x - 22) * 0.2);                                                // the horn's half-width at column x (4 at the gullet, 8 where it meets the bell)

// ---- the airlock, the gullet, the throat's horn with its four ribs, the bell, the north passage and the exit, the cellar --------------------------------------------------------------------------------------------
L.disc(7, 28.5, 4.5, 4.5, 'f', WALL);                                                              // the airlock: round, flagstones, where you arrive
L.room([13, 28, 21, 28], { floor: 'c', wall: WALL }); L.door(12, 28);                              // the gullet: a carpeted tube
const floors = new Set();
for (let x = 22; x <= 46; x++) { const h = half(x); for (let z = CZ - h; z <= CZ + h; z++) { L.rect([x, z, x, z], 'y'); floors.add(x + ',' + z); } }          // the throat's horn
for (const key of floors) { const [x, z] = key.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const nx = x + dx, nz = z + dz; if (!floors.has(nx + ',' + nz) && L.g[nz]?.[nx] === '#') L.g[nz][nx] = WALL; } }
L.disc(57, 28.5, 13, 14.5, 'y', WALL);                                                             // THE BELL: the round chamber at the horn's mouth
L.rect([30, CZ - 6, 30, CZ + 1], WALL); L.rect([35, CZ - 1, 35, CZ + 7], WALL); L.rect([40, CZ - 8, 40, CZ + 2], WALL); L.rect([44, CZ - 3, 44, CZ + 9], WALL);        // the four ribs (north, south, north, south): the S that leads in
L.rect([48, 25, 49, 31], WALL);                                                                     // a baffle across the bell's mouth: the Grand Cantor does not see the way in until you are round it
L.ceiling([22, 12, 70, 44], 9);                                                                    // a 9 m vault over horn and bell: the Grand Cantor stands 6.2 m
L.room([57, 9, 57, 13], { floor: 'c', wall: WALL });                                                  // the north passage (the bell's north edge is at z 14)
L.disc(57.5, 5.5, 4.5, 3.5, 'i', WALL);                                                            // the exit room
L.disc(17, 33, 3.5, 3.5, 'y', WALL); L.secretPanel(17, 29);                                           // a cellar of caught breath behind a loose panel in the gullet's south wall

const isFloor = (x, z) => /[a-z.:]/.test(L.g[z]?.[x] ?? '#'), skipped = [], putSafe = (cells, c) => { for (const [x, z] of cells) { if (isFloor(x, z)) L.put(x, z, c); else skipped.push(c + ' ' + x + ',' + z); } };
// ---- objects --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 28, '@');
L.putAll('Q', [[4, 26], [4, 31], [9, 25], [9, 32], [24, 26], [23, 32], [28, 24], [33, 32], [39, 22], [43, 32], [57, 10], [54, 5], [61, 5], [17, 36], [15, 33], [20, 33]]);
L.putAll('P', [[51, 21], [51, 36], [55, 18], [55, 39], [60, 18], [60, 39], [64, 22], [64, 34], [57, 23], [57, 34]]);            // the ring of pillars in the bell: cover from the pulse
// the ribs: sleepers, a Bulwark behind the second, singers behind the third, an Acolyte at the last
L.putAll('t', [[24, 25], [24, 31], [28, 33], [33, 23]]); L.putAll('g', [[27, 31], [32, 24]]); L.put(31, 33, 'b');
L.put(37, 31, '3'); L.put(38, 24, '1'); L.put(42, 33, 't'); L.put(41, 26, 't'); L.putAll('t', [[43, 22], [46, 36]]); L.put(45, 33, '6'); L.put(46, 27, 'x');
// the bell: a Tollbearer or two in the corners, the reeds are entities below
L.putAll('t', [[50, 40], [50, 17], [66, 20], [66, 37]]); L.putAll('g', [[53, 30], [53, 26]]);
// health and ammunition on the way (the boss maps keep every box: see MAP.drops)
putSafe([[23, 28], [34, 28], [43, 28], [50, 28], [57, 40], [57, 17]], 'H'); putSafe([[27, 28], [31, 27], [38, 30], [47, 30], [53, 22], [53, 34], [61, 24], [61, 33], [57, 12]], 'h'); putSafe([[22, 28], [48, 28], [57, 38], [57, 19]], 'v');
putSafe([[25, 28], [29, 29], [33, 28], [37, 28], [41, 28], [45, 29], [49, 27], [52, 28], [55, 26], [55, 31], [59, 28], [62, 25]], 'a');
putSafe([[26, 29], [30, 28], [34, 29], [38, 29], [42, 28], [46, 28], [50, 29], [53, 28], [56, 27], [56, 30], [60, 27], [62, 31]], 'e');
putSafe([[26, 27], [30, 30], [34, 27], [38, 27], [42, 29], [46, 29], [50, 27], [53, 29], [56, 28], [58, 24], [60, 30], [62, 29]], 'r');
L.putAll('n', [[57, 3], [54, 7], [61, 7]]);
// the bell: more rivets (the boss fight eats them) and health behind the pillars
putSafe([[52, 24], [52, 33], [58, 26], [58, 31], [61, 22], [61, 35], [54, 20], [54, 37]], 'r'); putSafe([[53, 27], [59, 28], [56, 22], [56, 35]], 'H'); putSafe([[62, 26], [62, 30]], 'a'); putSafe([[54, 28], [60, 25]], 'e');
// the cellar (the secret): a cache for the boss
L.putAll('H', [[16, 33], [18, 33]]); L.putAll('v', [[16, 35], [18, 35]]); L.putAll('e', [[15, 34], [19, 34]]); L.putAll('r', [[16, 31], [18, 31]]); L.put(17, 35, 'a');

if (skipped.length) console.log('C1E3M08: skipped (not floor):', skipped.join('; '));
// ---- PT-035, the materials (the outside audits and my own eye: the Throat was one crimson, horn and bell alike, so the boss's chamber was not a place). The four ribs and the baffle are bone-pale rib-work against the crimson, and the BELL itself is brass: organ pipes on its walls and a gold-diamond
// floor, so the room where the Grand Cantor stands reads as the bell it is. Only the character of a wall or a floor changes, never its kind: no route, sight line or shot moves. ----
{
  for (const [x0, z0, x1, z1] of [[30, CZ - 6, 30, CZ + 1], [35, CZ - 1, 35, CZ + 7], [40, CZ - 8, 40, CZ + 2], [44, CZ - 3, 44, CZ + 9], [48, 25, 49, 31]]) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (L.g[z][x] === WALL) L.g[z][x] = 'V';
  for (let z = 0; z < 58; z++) for (let x = 0; x < 74; x++) {
    const r = Math.hypot((x + 0.5 - 57) / 13, (z + 0.5 - 28.5) / 14.5);
    if (L.g[z][x] === WALL && x >= 46 && r > 0.85 && r < 1.2 && !(z < 14 || z > 43 && x > 53 && z > 44)) L.g[z][x] = 'E'; else if (L.g[z][x] === 'y' && x >= 46 && r <= 1) L.g[z][x] = 'i';
  }
}
// ---- end PT-035 materials ----
const layers = L.layers();

const REEDS = [[51, 25], [51, 32], [63, 20], [63, 37]];
const MAP = {
  id: 'C1E3M08', name: 'The Cantor\'s Throat', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { fog: '#2a1020', fogDensity: 0.011, sky: 'night', look: 'throat' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  legend: { 1: { type: 'enemy', kind: 'chorister' }, 3: { type: 'enemy', kind: 'bulwark' }, 6: { type: 'enemy', kind: 'acolyte' } },
  intro: { title: 'THE CANTOR\'S THROAT', lines: ['Every note the Choir ever sang came out of this room.', 'Something is about to sing the last one.'] },
  outro: 'Next: the Ascent Tether, where the cable goes up from the foot of the world.',
  objective: 'The Grand Cantor is at the bell, past the ribs. It walks. While a reed sings it throws two rings',
  ...layers,
  secrets: [{ id: 'loose-panel', panel: [17, 29], cells: [[17, 30], [17, 31], [17, 32]] }],
  groups: [...REEDS.map(([x, z]) => ({ name: 'reeds', rect: [x, z, x, z] })), { name: 'cantor', rect: [64, 28, 64, 28] }],
  entities: [
    { type: 'exit', at: [57, 5], locked: true, dest: 'next' },
    ...REEDS.map(([x, z]) => ({ type: 'enemy', kind: 'reed', at: [x, z], group: 'reeds' })),
    { type: 'enemy', kind: 'grandcantor', at: [64, 28], group: 'cantor', facing: 'west', summons: [[50, 17], [50, 40], [66, 17], [66, 40]] },
  ],
  messages: [
    { id: 'start', at: [5, 28], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, every ship in the fleet sings through this chamber. The singer is at the far end, and I read four reeds feeding it. Cut the reeds first.' },
    { id: 'gullet', at: [17, 28], radius: 3, speaker: 'INES', text: 'It\'s wet. The walls are wet. Don\'t think about what the walls are.' },
    { id: 'ribs', at: [28, 28], radius: 3, speaker: 'HULL', text: 'Ribs, four of them, one wall to the other with a gap on alternate sides. It is a bend in a throat. They will be waiting at every gap.' },
    { id: 'singers', at: [38, 28], radius: 3, speaker: 'INES', text: 'Singers in the curve, a shell-back in front of them, and the tall one with the wheel behind.' },
    { id: 'bell', at: [47, 24], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Four-legged, a horn the size of a doorway, and it walks.' },
    { id: 'rings', at: [47, 24], radius: 3, speaker: 'HULL', text: 'Pillars are cover from its rings. While a reed sings it throws two: wait for the second.' },
    { id: 'panel', at: [17, 27], radius: 2, speaker: 'HULL', text: 'The panel in the gullet\'s south wall rings hollow.' },
    { id: 'shield', at: [57, 28], radius: 0.1, speaker: 'INES', text: 'The reeds are silent. One ring now, and it\'s angry. Stay behind a pillar for the ring, then hit it.' },
    { id: 'broken', at: [57, 8], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The voice is gone, Calder. The ships are quiet. They were calling something, and it heard that. We should not be here when it answers.' },
  ],
  triggers: [
    { id: 'ribs', when: 'enter', at: [26, 28], radius: 3, do: [{ objective: 'Through the ribs: a gap on alternate sides. The bell is at the end' }] },
    { id: 'shield-down', when: 'dead:reeds', do: [{ objective: 'The reeds are cut: one ring now. Kill the Grand Cantor, east end of the bell' }, { shake: 2 }, { message: 'shield' }] },
    { id: 'cantor-dead', when: 'dead:cantor', do: [{ exit: { set: 'unlock' } }, { objective: 'The voice is gone. The exit is open: north of the bell' }, { shake: 3 }, { message: 'broken' }] },
  ],
  quality: { enemies: [14, 70], botSeconds: [60, 900], mechanics: ['triggers', 'secret'], skins: 5, enemyKinds: { grandcantor: 1, reed: 4, tollbearer: 8, gaunt: 3, chorister: 1, bulwark: 1, acolyte: 1 },
    scaleClass: 'COMPRESSION', tallReason: 'the throat is the episode\'s one named chamber: 9 m to the vault because the Grand Cantor stands 6.2 m',
    introduces: 'the Grand Cantor: a boss four-legged with a horn the size of a doorway that WALKS and circles, with no shield: a second ring of tone for as long as one of its four reeds sings, calling Choristers and fanning toll-shots' },
};

// ---- PT-025: the boss map keeps ALL its ammunition boxes on the ground (the reeds, the boss and its called singers never drop; the fight eats rivets); drops add to them ----
MAP.drops = { scale: 1.3, keep: [[0, 0, 999, 999]] };

export default MAP;
