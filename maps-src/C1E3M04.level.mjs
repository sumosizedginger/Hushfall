// C1E3M04 MARROW NAVE: cathedral-scale arena, secret exit. The ship rehearses the Song. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch C, owner go 2026-10-09.)
// The ship's dorsal vault has been torn open to the ash sky and what is left is a nave: two colonnades of pillars down an open floor of silt and slate, a roofed gallery 3 m up along each flank (singers on both), and at the east
// end a DAIS of the Choir where the WEEPING MOTHER sits enthroned with two BULWARK SHELLS at the foot of her stairs and a singer on each corner. The east gate is sealed until she is dead. The north gallery steps down at its west end,
// the south gallery at its east end: the high ground is a way round the crossfire, through the singers, and from the south gallery's east end a person can come down behind the Bulwarks. A hollow rib at the north gallery's west
// end hides the way to the Choirless Chamber (the secret exit, S01).
// Route (main): the narthex -> the nave's west end (sleepers wake) -> the centre (the galleries wake: crossfire, Bellhands) -> the foot of the dais (Bulwarks: circle them, or use a blast) -> the stairs -> the Mother (tears and brood) ->
// the east gate opens when she falls -> the exit chamber. Secret route: the north gallery's west stair -> along the gallery -> the hollow rib -> the tunnel -> the secret exit.
// Scale class SET-PIECE (about a quarter roofed: only the narthex, the galleries and the exit are under a roof). Look: choir, the ash sky, rib walls, silt and slate floors.
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(100, 60);
const WALL = 'V';

// ---- the narthex, the nave, its two galleries, the dais, the east gate and the exit chamber -------------------------------------------------------------------------------------------------------------
L.room([3, 24, 12, 34], { floor: 'n', wall: WALL });                                                // the narthex (roofed)
L.room([15, 9, 75, 49], { floor: 'm', wall: WALL });                                                // the nave: x 15..75, z 9..49 (open to the sky)
L.rect([13, 27, 14, 31], 'n');                                                                      // the narthex opens onto the nave
L.rect([15, 27, 62, 31], 's');                                                                      // the central way is slate
L.rect([15, 9, 75, 14], 'o'); L.height([15, 9, 75, 14], 6); L.ceiling([15, 9, 75, 14], 7);          // the north gallery (3 m up, roofed at 7 m)
L.stairs([15, 9, 20, 14], 'x', 0, 5);                                                               // it steps down at its west end
L.rect([15, 44, 75, 49], 'o'); L.height([15, 44, 75, 49], 6); L.ceiling([15, 44, 75, 49], 7);       // the south gallery
L.stairs([70, 44, 75, 49], 'x', 5, 0);                                                              // it steps down at its east end
L.rect([62, 23, 74, 35], 's'); L.height([62, 23, 74, 35], 6);                                       // the dais of the Choir (3 m)
L.stairs([57, 27, 62, 31], 'x', 0, 5);                                                              // its stair: the west face (the dais itself is 3 m)
for (const x of [22, 30, 38, 46, 54]) { L.put(x, 21, 'P'); L.put(x, 37, 'P'); }                     // the colonnades: pillars stop a round and hide what is behind them
for (const r of [[34, 25, 35, 26], [34, 32, 35, 33], [48, 24, 49, 25], [48, 33, 49, 34], [26, 18, 27, 19], [26, 39, 27, 40], [58, 20, 59, 21], [58, 37, 59, 38]]) L.rect(r, 'R');      // rubble: ribs of the ship's growth, cover; the central way z 27..31 is left open
L.room([77, 26, 85, 32], { floor: 'n', wall: WALL }); L.door(76, 29, { remote: true });             // the exit chamber (roofed); the gate is sealed until the Mother is dead
L.room([26, 3, 34, 7], { floor: 'n', wall: WALL }); L.height([26, 3, 34, 7], 6); L.secretPanel(30, 8);      // the hollow rib in the north gallery's wall, and the tunnel behind it (3 m up, level with the gallery)

// ---- objects -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 29, '@'); L.put(84, 29, '>'); L.put(30, 4, '$');
L.putAll('n', [[4, 25], [4, 33], [11, 25], [11, 33], [18, 24], [18, 34], [30, 24], [44, 24], [44, 34], [56, 24], [56, 34]]);          // lanterns: the narthex and the colonnades
L.putAll('H', [[8, 29]]); L.putAll('h', [[4, 27], [4, 31]]); L.put(12, 29, 'v');
// the nave: sleepers among the pillars, runners behind the rubble; the singers up on the galleries (symbol 1: Chorister), the Bellhands and the Sexton in the middle
L.putAll('t', [[22, 25], [22, 33], [30, 23], [30, 35], [38, 28]]); L.putAll('g', [[36, 24], [36, 34], [28, 17], [28, 41]]);
L.putAll('1', [[26, 11], [46, 11], [58, 47]]);
L.put(46, 25, 'b'); L.put(46, 33, 't'); L.putAll('t', [[40, 23], [40, 35], [50, 23], [50, 35]]); L.putAll('g', [[44, 20], [44, 38]]);
L.put(24, 29, 'h'); L.put(34, 29, 'H'); L.put(50, 29, 'H'); L.put(46, 29, 'v'); L.put(40, 29, 'h');
L.putAll('a', [[53, 29], [56, 29]]); L.putAll('e', [[54, 29], [57, 29]]); L.put(55, 29, 'r');                 // the supply station in the middle of the nave: the only ammunition boxes on the road (see MAP.drops keep)
// the Choir: the Mother (symbol 4) on the dais, a Bulwark Shell (symbol 3) either side of the stairs' foot, a singer on each corner of the dais
L.put(70, 29, '4'); L.putAll('3', [[58, 25], [58, 33]]);
L.putAll('h', [[60, 29], [66, 27], [66, 31]]); L.putAll('H', [[64, 29]]);
L.putAll('n', [[78, 27], [78, 31], [84, 27], [84, 31]]); L.put(82, 29, 'h');
// the tunnel (the secret): a cache, and the way out
L.putAll('H', [[28, 5], [32, 5]]); L.putAll('v', [[27, 4], [33, 4]]); L.putAll('e', [[28, 3], [32, 3]]); L.putAll('r', [[27, 6], [33, 6]]); L.put(30, 6, 'a');

// ---- PT-021, rooms that are not boxes (the lane of the routes decides what may be cut) -----------------------------------------------------------------------------------------------------
const S = new Shape(L, { lane: laneOf('C1E3M04'), keep: [[30, 8]] });
const h0 = S.bayLog.length;
S.hall([3, 24, 12, 34], { sides: { n: { w: 3, gap: 2, d: 2, heart: true }, s: { w: 3, gap: 2, d: 2, heart: true } }, cut: 1 }); S.dressBays('cradle', h0);        // the narthex's alcoves: the cradles of the ones who sang first
S.hall([77, 26, 85, 32], { sides: { n: { w: 3, gap: 2, d: 1 }, s: { w: 3, gap: 2, d: 1 } }, cut: 1 });
S.chamfer([15, 9, 75, 49], 'nw ne sw se', 4); S.chamfer([3, 24, 12, 34], 'nw ne sw se', 1);
console.log('C1E3M04 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

const layers = L.layers();

const MAP = {
  id: 'C1E3M04', name: 'Marrow Nave', version: 1, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { fog: '#2c3830', fogDensity: 0.006, sky: 'ash', look: 'choir' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  legend: { 1: { type: 'enemy', kind: 'chorister' }, 3: { type: 'enemy', kind: 'bulwark' }, 4: { type: 'enemy', kind: 'weeping', group: 'mother' } },
  intro: { title: 'MARROW NAVE', lines: ['The ship opened its back to sing.', 'Something is enthroned at the far end.'] },
  outro: 'Next: the Resonance Loom. The ship has stopped rehearsing.',
  objective: 'Cross the nave. The gate at its east end is sealed',
  ...layers,
  secrets: [{ id: 'hollow-rib', panel: [30, 8], cells: [[30, 7], [30, 6], [30, 5]] }],
  groups: [{ name: 'west', rect: [15, 15, 38, 43] }, { name: 'galleries-n', rect: [15, 9, 75, 14] }, { name: 'galleries-s', rect: [15, 44, 75, 49] }, { name: 'centre', rect: [39, 15, 56, 43] }, { name: 'dais', rect: [57, 15, 75, 43] }],
  entities: [],
  messages: [
    { id: 'start', at: [6, 29], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the nave. There is no roof left: the ship tore it open to sing at the sky. Whatever sits at the far end is why the gate is sealed.' },
    { id: 'nave', at: [20, 29], radius: 3, speaker: 'INES', text: 'Two galleries, north and south, with singers on both. The pillars stop a round. Do not cross this floor in a straight line.' },
    { id: 'shell', at: [44, 29], radius: 4, speaker: 'HULL', text: 'Shells on legs. A round does almost nothing to the front of one. It opens its shell to hit you: that is when to shoot. Or circle it. Or throw a bell-breaker over it.' },
    { id: 'mother', at: [58, 29], radius: 4, speaker: 'INES', text: 'She is weeping. Where it lands it burns, and it slows you: walk out of it. Something is swelling on her skirt. Kill her. The gate will open.' },
    { id: 'hollow', at: [30, 10], radius: 2.5, speaker: 'HULL', text: 'One rib of this wall is thin. A held breath, behind it.' },
    { id: 'gate', at: [79, 29], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'The gate is open. Past it the ship goes on singing, but it is quieter.' },
  ],
  triggers: [
    { id: 'nave', when: 'enter', at: [17, 29], radius: 2.5, do: [{ wake: 'west' }, { objective: 'Cross the nave: singers on both galleries, the Choir at the east end' }] },
    { id: 'centre', when: 'enter', at: [40, 29], radius: 3.5, do: [{ wake: 'galleries-n' }, { wake: 'galleries-s' }, { wake: 'centre' }] },
    { id: 'choir', when: 'enter', at: [52, 29], radius: 4, do: [{ wake: 'dais' }, { wake: 'mother' }, { objective: 'Break the Choir: the Mother on the dais. The gate waits for her' }] },
    { id: 'mother-down', when: 'dead:mother', do: [{ open: [76, 29] }, { objective: 'The gate is open: the exit is east' }, { shake: 1.4 }] },
  ],
  quality: { enemies: [14, 60], botSeconds: [60, 700], mechanics: ['heights', 'triggers', 'secret'], skins: 5, enemyKinds: { chorister: 3, bulwark: 2, weeping: 1, bellhand: 1, tollbearer: 8, gaunt: 6 },
    scaleClass: 'SET-PIECE', reason: 'it is the one place in the episode where the ship is open to the sky: the player must cross an arena under two galleries of fire to reach the sealed gate, and the creatures that make it a fight (the Bulwark Shells and the Weeping Mother) need room to be circled and walked away from',
    tallReason: 'the nave is the episode\'s one named cathedral hall: the galleries have 4 m of air above them and the floor none (it is open to the sky)',
    introduces: 'the two ELITES: the BULWARK SHELL (a carapace that takes 7% of a direct hit from the front and opens to bash) and the WEEPING MOTHER (a brood-mother that lobs tears into pools and drops her young); met as a Choir enthroned at the east end of an open nave' },
};

// ---- PT-025: fed by the dead (src/engine/drops.js): no ammunition boxes on the road, except the tunnel's own cache (the secret) ----
MAP.drops = { scale: 1, keep: [[53, 29, 57, 29]] };

MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
MAP.decals = [{ kind: 'ichorpool', at: [66, 29], size: 2.4 }, { kind: 'damp', at: [70, 25], size: 2 }, { kind: 'damp', at: [70, 33], size: 2 }, { kind: 'scorch', at: [44, 29], size: 2 }, { kind: 'bloodpool', at: [24, 27], size: 1.6 }, { kind: 'smear', at: [57, 29], size: 1.6 }, { kind: 'damp', at: [31, 10], size: 1.8 }];
MAP.growth = [{ at: [70, 29], r: 26, power: 1.25 }];                                                        // the throne's growth reaches out across the nave

export default MAP;
