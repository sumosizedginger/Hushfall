// C1E3M04 MARROW NAVE: cathedral-scale arena, secret exit. The ship rehearses the Song. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch C, owner go 2026-10-09; rooms redrawn the same night after the owner asked "are they all boxes?")
// The ship's dorsal vault has been torn open to the ash sky and what is left is a nave: a floor of silt crossed by ribs of slate, two colonnades of pillars, a roofed gallery 3 m up along each flank with balconies that jut out over the floor
// (singers on both) and open chapels cut into the walls behind them, and at the east end a ROUND APSE (a semicircle 28 cells across) holding a stepped DAIS of the Choir where the WEEPING MOTHER sits enthroned with two BULWARK SHELLS at the foot
// of her stairs. The east gate is at the apse's tip and is sealed until she is dead. The north gallery steps down at its west end, the south gallery at its east end (beside the stairs to the dais): the high ground is a way round the crossfire,
// through the singers. A hollow rib at the north gallery's back wall hides the way to the Choirless Chamber (the secret exit, S01).
// Route (main): the narthex -> the nave's west end (sleepers wake) -> the centre (the galleries wake: crossfire, Bellhands) -> the supply station -> the foot of the dais (Bulwarks: circle them, or use a blast) -> the stairs -> the Mother (tears
// and brood) -> the east gate opens when she falls -> the exit chamber. Secret route: the north gallery's west stair -> along the gallery -> the hollow rib -> the tunnel -> the secret exit.
// Scale class SET-PIECE (about a third roofed: the narthex, the galleries and the exit are under a roof; the nave, the balconies, the chapels and the apse are open to the sky). Look: choir, the ash sky, rib walls, silt and slate floors.
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(100, 60);
const WALL = 'V';

// ---- the narthex, the nave's body, its two galleries, the apse and its dais, the east gate and the exit chamber -------------------------------------------------------------------------------------------
L.room([3, 24, 12, 34], { floor: 'n', wall: WALL });                                                // the narthex (roofed)
L.room([15, 9, 61, 49], { floor: 'm', wall: WALL });                                                // the nave's body: x 15..61, z 9..49 (open to the sky)
L.rect([13, 27, 14, 31], 'n');                                                                      // the narthex opens onto the nave
L.rect([15, 27, 61, 31], 's');                                                                      // the central way is slate
for (const x of [23, 31, 39, 47]) L.rect([x, 15, x, 43], 's');                                      // ribs of slate across the floor, one every eight cells
L.rect([15, 9, 61, 14], 'o'); L.height([15, 9, 61, 14], 6); L.ceiling([15, 9, 61, 14], 7);          // the north gallery (3 m up, roofed at 7 m)
L.stairs([15, 9, 20, 14], 'x', 0, 5);                                                               // it steps down at its west end
L.rect([15, 44, 61, 49], 'o'); L.height([15, 44, 61, 49], 6); L.ceiling([15, 44, 61, 49], 7);       // the south gallery
L.stairs([57, 44, 61, 49], 'x', 5, 1);                                                              // it steps down at its east end, beside the foot of the dais
for (const x of [22, 32, 36, 46, 50]) { L.rect([x, 14, x + 1, 14], WALL); L.rect([x, 44, x + 1, 44], WALL); }      // the arcade: a pier two cells wide between the openings of each gallery's front
for (const x0 of [26, 40, 54]) { L.rect([x0, 15, x0 + 3, 16], 'u'); L.height([x0, 15, x0 + 3, 16], 6); L.rect([x0, 42, x0 + 3, 43], 'u'); L.height([x0, 42, x0 + 3, 43], 6); }      // balconies: the galleries' fronts jut out over the floor, open to the sky
for (const x0 of [37, 52]) { L.room([x0, 4, x0 + 6, 8], { floor: 'u', wall: WALL }); L.height([x0, 4, x0 + 6, 8], 6); L.room([x0, 50, x0 + 6, 54], { floor: 'u', wall: WALL }); L.height([x0, 50, x0 + 6, 54], 6); }      // four chapels cut into the galleries' back walls
// THE APSE: a semicircle of radius 14 round (62, 29), slate; its wall is drawn round whatever floor it has
const apse = new Set();
for (let x = 62; x <= 75; x++) { const h = Math.round(14 * Math.sqrt(1 - ((x - 62) / 14) ** 2)); for (let z = 29 - h; z <= 29 + h; z++) { L.rect([x, z, x, z], 's'); apse.add(x + ',' + z); } }
for (const key of apse) { const [x, z] = key.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const nx = x + dx, nz = z + dz; if (nx >= 62 && !apse.has(nx + ',' + nz) && L.g[nz][nx] === '#') L.g[nz][nx] = WALL; } }
L.rect([59, 24, 75, 34], 's'); L.height([59, 24, 75, 34], 4);                                       // the dais of the Choir: an outer tier (2 m) ...
L.stairs([55, 27, 58, 31], 'x', 0, 3);                                                              // ... its stair, the west face ...
L.rect([67, 26, 67, 32], 's'); L.height([67, 26, 67, 32], 5); L.rect([68, 26, 74, 32], 's'); L.height([68, 26, 74, 32], 6);      // ... and the throne's top (3 m)
for (const x of [22, 30, 38, 46, 54]) { L.put(x, 21, 'P'); L.put(x, 37, 'P'); }                     // the colonnades: pillars stop a round and hide what is behind them
for (const r of [[34, 25, 35, 26], [34, 32, 35, 33], [48, 24, 49, 25], [48, 33, 49, 34], [26, 18, 27, 19], [26, 39, 27, 40], [58, 20, 59, 21], [58, 37, 59, 38]]) L.rect(r, 'R');      // rubble: ribs of the ship's growth, cover; the central way z 27..31 is left open
L.room([77, 26, 85, 32], { floor: 'n', wall: WALL }); L.height([76, 26, 85, 32], 4); L.door(76, 29, { remote: true });      // the exit chamber (roofed, level with the outer tier); the gate at the apse's tip is sealed until the Mother is dead
L.room([26, 3, 34, 7], { floor: 'n', wall: WALL }); L.height([26, 3, 34, 7], 6); L.secretPanel(30, 8);      // the hollow rib in the north gallery's wall, and the tunnel behind it (3 m up, level with the gallery)

// ---- objects -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 29, '@'); L.put(84, 29, '>'); L.put(30, 4, '$');
L.putAll('n', [[5, 26], [5, 32], [10, 26], [10, 32], [18, 24], [18, 34], [30, 24], [44, 24], [44, 34], [56, 24], [56, 34]]);          // lanterns: the narthex and the colonnades
L.putAll('H', [[8, 29]]); L.putAll('h', [[6, 27], [6, 31]]); L.put(12, 29, 'v');
// the nave: sleepers among the pillars, runners behind the rubble; the singers up on the galleries (symbol 1: Chorister), the Bellhand in the middle
L.putAll('t', [[22, 25], [22, 33], [30, 23], [30, 35], [38, 28]]); L.putAll('g', [[36, 24], [36, 34], [28, 17], [28, 41]]);
L.putAll('1', [[26, 11], [46, 11], [50, 47]]);
L.put(46, 25, 'b'); L.put(46, 33, 't'); L.putAll('t', [[40, 23], [40, 35], [50, 23], [50, 35]]); L.putAll('g', [[44, 20], [44, 38]]);
L.put(24, 29, 'h'); L.put(34, 29, 'H'); L.put(40, 29, 'h'); L.put(44, 29, 'v'); L.put(47, 29, 'H');
L.putAll('a', [[49, 29], [52, 29]]); L.putAll('e', [[50, 29], [53, 29]]); L.put(51, 29, 'r');                 // the supply station in the middle of the nave: the only ammunition boxes on the road (see MAP.drops keep)
L.put(56, 29, 'h');
// the chapels: a silent bell (the bellnode prop) at the back of each, a lantern either side, and a little health for whoever climbs the galleries
for (const [x0, bz, hz] of [[37, 4, 6], [52, 4, 6], [37, 54, 52], [52, 54, 52]]) { L.put(x0 + 3, bz, 'N'); L.putAll('n', [[x0 + 1, bz], [x0 + 5, bz]]); L.put(x0 + 3, hz, 'h'); }
// the Choir: the Mother (symbol 4) on the top of the dais, a Bulwark Shell (symbol 3) either side of the stairs' foot
L.put(70, 29, '4'); L.putAll('3', [[58, 25], [58, 33]]);
L.putAll('h', [[66, 27], [66, 31]]); L.putAll('H', [[60, 29], [64, 29]]);
L.putAll('n', [[78, 27], [78, 31], [84, 27], [84, 31]]); L.put(82, 29, 'h');
// the tunnel (the secret): a cache, and the way out
L.putAll('H', [[28, 5], [32, 5]]); L.putAll('v', [[27, 4], [33, 4]]); L.putAll('e', [[28, 3], [32, 3]]); L.putAll('r', [[27, 6], [33, 6]]); L.put(30, 6, 'a');

// ---- PT-021, rooms that are not boxes (the lane of the routes decides what may be cut) -----------------------------------------------------------------------------------------------------
const S = new Shape(L, { lane: laneOf('C1E3M04'), keep: [[30, 8]] });
const h0 = S.bayLog.length;
S.hall([3, 24, 12, 34], { sides: { n: { w: 3, gap: 2, d: 2, heart: true }, s: { w: 3, gap: 2, d: 2, heart: true } }, cut: 3 }); S.dressBays('cradle', h0);        // the narthex: alcoves with the cradles of the ones who sang first, and its corners cut deep
S.hall([77, 26, 85, 32], { sides: { n: { w: 3, gap: 2, d: 1 }, s: { w: 3, gap: 2, d: 1 } }, cut: 2 });
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
  groups: [{ name: 'west', rect: [15, 15, 38, 43] }, { name: 'galleries-n', rect: [15, 3, 61, 14] }, { name: 'galleries-s', rect: [15, 44, 61, 54] }, { name: 'centre', rect: [39, 15, 56, 43] }, { name: 'dais', rect: [57, 15, 75, 43] }],
  entities: [],
  messages: [
    { id: 'start', at: [6, 29], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, there\'s no roof left: the ship tore it open to sing at the sky. Something sits at the far end, and it\'s why the gate is sealed.' },
    { id: 'nave', at: [20, 29], radius: 3, speaker: 'INES', text: 'Two galleries, north and south, with singers on both. The pillars stop a round. Don\'t cross this floor in a straight line.' },
    { id: 'shell', at: [44, 29], radius: 4, speaker: 'HULL', text: 'Shells on legs. A round does almost nothing to the front of one. It opens its shell to hit you: that is when to shoot, or to circle it, or to throw a bell-breaker over it.' },
    { id: 'mother', at: [58, 29], radius: 4, speaker: 'INES', text: 'She is weeping, and where it lands it burns and slows you: walk out of it. Something is swelling on her skirt. Kill her and the gate will open.' },
    { id: 'hollow', at: [30, 10], radius: 2.5, speaker: 'HULL', text: 'One rib of this wall is thin. A held breath, behind it.' },
    { id: 'gate', at: [79, 29], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'The gate is open. Past it the ship goes on singing, but it\'s quieter.' },
  ],
  triggers: [
    { id: 'nave', when: 'enter', at: [17, 29], radius: 2.5, do: [{ wake: 'west' }, { objective: 'Cross the nave: singers on both galleries, the Choir at the east end' }] },
    { id: 'centre', when: 'enter', at: [40, 29], radius: 3.5, do: [{ wake: 'galleries-n' }, { wake: 'galleries-s' }, { wake: 'centre' }] },
    { id: 'choir', when: 'enter', at: [52, 29], radius: 4, do: [{ wake: 'dais' }, { wake: 'mother' }, { objective: 'Break the Choir: the Weeping Mother on the dais. The gate waits' }] },
    { id: 'mother-down', when: 'dead:mother', do: [{ open: [76, 29] }, { objective: 'The gate is open: the exit is east' }, { shake: 1.4 }] },
  ],
  quality: { enemies: [14, 60], botSeconds: [60, 700], mechanics: ['heights', 'triggers', 'secret'], skins: 5, enemyKinds: { chorister: 3, bulwark: 2, weeping: 1, bellhand: 1, tollbearer: 8, gaunt: 6 },
    scaleClass: 'SET-PIECE', reason: 'it is the one place in the episode where the ship is open to the sky: the player must cross an arena under two galleries of fire to reach the sealed gate, and the creatures that make it a fight (the Bulwark Shells and the Weeping Mother) need room to be circled and walked away from',
    tallReason: 'the nave is the episode\'s one named cathedral hall: the galleries have 4 m of air above them and the floor none (it is open to the sky)',
    introduces: 'the two ELITES: the BULWARK SHELL (a carapace that takes 7% of a direct hit from the front and opens to bash) and the WEEPING MOTHER (a brood-mother that lobs tears into pools and drops her young); met as a Choir enthroned at the east end of an open nave' },
};

// ---- PT-025: fed by the dead (src/engine/drops.js): no ammunition boxes on the road, except the tunnel's own cache (the secret) ----
MAP.drops = { scale: 1, keep: [[49, 29, 53, 29]] };

MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
MAP.decals = [{ kind: 'ichorpool', at: [66, 29], size: 2.4 }, { kind: 'damp', at: [70, 25], size: 2 }, { kind: 'damp', at: [70, 33], size: 2 }, { kind: 'scorch', at: [44, 29], size: 2 }, { kind: 'bloodpool', at: [24, 27], size: 1.6 }, { kind: 'smear', at: [57, 29], size: 1.6 }, { kind: 'damp', at: [31, 10], size: 1.8 }];
MAP.growth = [{ at: [70, 29], r: 26, power: 1.25 }];                                                        // the throne's growth reaches out across the nave

export default MAP;
