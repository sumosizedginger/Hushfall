// C1E3M03 GILL GARDENS: spore hazards, snipers on high ledges. Where captured humans are kept docile. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch B, owner go 2026-10-09.)
// The ship grows its own larder: two open garden halls under the ash sky, a vault between them where the captured stand in rows, asleep, in alcoves. The gardens are laid out in SPORE BEDS (src/engine/breath.js): the floor breathes, harmless
// while dormant, a bloom that slows and burns while it is on (it swells and glows for a second first). In the first garden two beds lie across the basin out of step with each other, singers stand on the ledges above (snipers in all but name:
// a position, not a kind), and at the far end a pedestal holds the BELL-BREAKER MORTAR (key 0): the gun that throws its shell to the ring on the ground, high, onto a ledge or over cover. In the second garden a raised dais of singers rules the
// bowl; its two stairs begin in a spore bed each, one bed blooming while the other sleeps; the lever that opens the hatchery door is a column on the dais, so the way out goes through the singers (or through the mortar).
// Route (main): the arrival hall -> the first garden along the lane: bed A on its off beat, the gap, bed B on its off beat -> the mortar -> the vault (sleepers) -> the second garden: the safe stair, the dais, the lever -> the hatchery door -> the exit.
// Scale class MIXED (about half roofed: the gardens are open to the sky, the arrival hall, the vault and the exit are roofed). Look: choir, the ash sky, resin walls, silt floors.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(100, 44);
const WALL = 'V';

// ---- the arrival hall, the first garden (a basin between two 3 m ledges), the vault, the second garden (a bowl round a dais) and the hatchery -------------------------------------------------------------
L.room([3, 19, 13, 27], { floor: 'n', wall: WALL });                                                // the arrival hall (roofed)
L.room([15, 10, 45, 36], { floor: 'u', wall: WALL });                                               // the first garden: x 15..45, z 10..36 (open to the sky)
L.rect([14, 22, 14, 24], 'n');                                                                      // the hall opens onto the garden
L.rect([15, 10, 45, 14], 'u'); L.height([15, 10, 45, 14], 6);                                       // the north ledge (3 m)
L.rect([15, 32, 45, 36], 'u'); L.height([15, 32, 45, 36], 6);                                       // the south ledge
L.stairs([40, 10, 45, 14], 'x', 6, 0); L.stairs([15, 32, 20, 36], 'x', 0, 6);                       // each ledge steps down at one end: the north at its east end, the south at its west end
for (const r of [[20, 20, 21, 21], [20, 26, 21, 27], [32, 19, 33, 20], [32, 26, 33, 27], [41, 18, 42, 19], [41, 27, 42, 28]]) L.rect(r, 'R');      // rubble: ribs of the ship's growth that stop a round; the lane z 22..24 is left open
L.fx([26, 17, 31, 29], 's'); L.fx([35, 17, 39, 29], 's');                                           // bed A and bed B (they bloom out of step: see MAP.pulses)
L.room([47, 20, 58, 26], { floor: 'n', wall: WALL }); L.rect([46, 22, 46, 24], 'n'); L.rect([59, 22, 59, 24], 'n');            // the vault (roofed), open at both ends
L.room([60, 12, 88, 34], { floor: 'o', wall: WALL }); L.ceiling([60, 12, 88, 34], 8);                // the second garden: x 60..88, z 12..34, ROOFED under an 8 m vault (the first is open to the sky: that is what makes the map MIXED)
L.rect([70, 20, 78, 26], 'o'); L.height([70, 20, 78, 26], 6);                                       // the dais (3 m)
L.stairs([72, 14, 74, 19], 'z', 0, 5); L.stairs([72, 27, 74, 32], 'z', 6, 1);                       // the north stair and the south stair up to it
L.rect([73, 22, 75, 24], WALL);                                                                     // the column on the dais that carries the lever
L.fx([71, 12, 75, 16], 's'); L.fx([71, 30, 75, 34], 's');                                           // the beds at the foot of each stair
L.room([91, 20, 97, 26], { floor: 'n', wall: WALL }); L.door(89, 23, { remote: true });             // the hatchery (roofed): the lever opens its door; the exit chamber is behind
L.rect([90, 23, 90, 23], 'n');                                                                      // a cell of floor between the door and the chamber
L.room([49, 28, 55, 32], { floor: 'n', wall: WALL }); L.secretPanel(52, 27);                        // the niche behind a hollow rib of the vault's south wall

// ---- objects --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(4, 23, '@'); L.put(96, 23, '>');
L.putAll('h', [[4, 20], [4, 26]]); L.putAll('n', [[3, 22], [3, 24], [13, 20], [13, 26]]);
// the first garden: sleepers in the open, gaunts behind the rubble, a Bellhand either side of the far bed; the singers up on the ledges (symbol 1: Chorister), well back from the edge
L.putAll('1', [[22, 12], [36, 12], [26, 34], [40, 34]]); L.putAll('t', [[22, 18], [23, 29], [34, 21], [43, 21]]); L.putAll('g', [[18, 23], [33, 17], [33, 29]]); L.put(41, 17, 'b');
L.putAll('h', [[19, 19], [19, 27], [44, 18], [44, 28]]); L.put(33, 23, 'H'); L.put(41, 23, 'h');          // health on the lane: in the gap between the beds and past the second one L.putAll('C', [[17, 13], [30, 12], [18, 33], [31, 34]]);
L.put(43, 23, 'W'); L.putAll('2', [[43, 22], [43, 24]]);                                           // the pedestal: the mortar and two crates of rockets (they are the line-thrower's: see MAP.drops keep)
// the vault: the captured, standing in rows along both walls (asleep: leave them), a Sexton in the middle, lanterns
L.putAll('t', [[49, 21], [51, 21], [53, 21], [55, 21], [57, 21], [50, 25], [54, 25], [56, 25]]); L.put(52, 23, 'x'); L.putAll('n', [[47, 21], [47, 25], [58, 21], [58, 25]]); L.put(48, 23, 'H'); L.put(57, 23, 'h');
// the second garden: the dais of singers, gaunts and Bellhands in the bowl, sleepers by the east wall
L.putAll('1', [[71, 22], [77, 22], [74, 26]]); L.putAll('g', [[65, 16], [65, 30]]); L.put(82, 23, 'b'); L.putAll('t', [[66, 22], [66, 24], [84, 18], [84, 28]]); L.put(80, 24, 'x');
L.putAll('h', [[62, 14], [62, 32], [86, 14], [86, 32]]); L.putAll('v', [[63, 23]]); L.put(66, 28, 'h'); L.put(80, 23, 'H'); L.putAll('C', [[67, 14], [67, 32], [81, 16], [81, 30]]); L.putAll('P', [[79, 18], [79, 29], [83, 22], [83, 25]]);
L.putAll('h', [[93, 21], [93, 25]]); L.put(95, 21, 'n');
// the niche (the secret): a cache
L.putAll('H', [[50, 29], [54, 29]]); L.putAll('v', [[50, 31], [54, 31]]); L.putAll('e', [[51, 30], [53, 30]]); L.putAll('r', [[51, 31], [53, 31]]); L.put(52, 30, 'a'); L.put(52, 32, 'n');

// ---- PT-021, rooms that are not boxes (the lane of the routes decides what may be cut) -----------------------------------------------------------------------------------------------------
const S = new Shape(L, { lane: laneOf('C1E3M03'), keep: [[74, 25], [52, 26]] });                 // the lever's column face and the hollow rib stay
const h0 = S.bayLog.length;
S.hall([47, 20, 58, 26], { sides: { n: { w: 3, gap: 2, d: 2, heart: true }, s: { w: 3, gap: 2, d: 2, heart: true } }, cut: 1 }); S.dressBays('cradle', h0);        // the vault's alcoves: the cradles that hold the captured
S.chamfer([3, 19, 13, 27], 'nw ne sw se', 2); S.chamfer([91, 20, 97, 26], 'nw ne sw se', 1); S.chamfer([15, 10, 45, 36], 'nw ne sw se', 3); S.chamfer([60, 12, 88, 34], 'nw ne sw se', 3);
console.log('C1E3M03 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);

// ---- end PT-052 ----

const layers = L.layers();

const MAP = {
  id: 'C1E3M03', name: 'Gill Gardens', version: 1, ceilingHeight: 4.2, par: { time: 360 },
  atmosphere: { fog: '#2a3a2c', fogDensity: 0.009, sky: 'ash', look: 'choir' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  legend: { 1: { type: 'enemy', kind: 'chorister' }, 2: { type: 'pickup', kind: 'ammo_rocket' }, W: { type: 'pickup', kind: 'weapon_mortar' } },
  intro: { title: 'GILL GARDENS', lines: ['The floor is breathing too.', 'Cross it on the off beat.'] },
  outro: 'Next: the Marrow Nave. The ship rehearses the Song, and it has started to sing to you.',
  objective: 'Cross the gardens. The hatchery is at the east end',
  ...layers,
  pulses: [{ rect: [26, 17, 31, 29], period: 8, on: 3, phase: 0 }, { rect: [35, 17, 39, 29], period: 8, on: 3, phase: 4 }, { rect: [71, 12, 75, 16], period: 8, on: 3, phase: 0 }, { rect: [71, 30, 75, 34], period: 8, on: 3, phase: 4 }],
  secrets: [{ id: 'hollow-rib', panel: [52, 27], cells: [[52, 28], [52, 29], [52, 30]] }],
  groups: [{ name: 'ledges', rect: [15, 10, 45, 14] }, { name: 'ledges-south', rect: [15, 32, 45, 36] }, { name: 'dais', rect: [60, 12, 88, 34] }],
  entities: [
    { type: 'switch', id: 'column', at: [74, 25], wall: 'north', do: [{ open: [89, 23] }, { objective: 'The hatchery is open: the exit is at the east end' }, { shake: 1.2 }] },
  ],
  messages: [
    { id: 'start', at: [5, 23], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the gardens. Whatever the ship keeps alive it keeps here. The floor is not safe to stand on. Watch it: it swells before it blooms.' },
    { id: 'ledges', at: [18, 23], radius: 3, speaker: 'INES', text: 'Singers on the ledges, north and south. Cross the beds when they are asleep and use the rubble in between. The ledges step down at opposite ends.' },
    { id: 'bed', at: [24, 23], radius: 2, speaker: 'INES', text: 'The bed is swelling. When it goes dark, go. Do not stop in the middle: the other one is out of step with it.' },
    { id: 'mortar', at: [42, 23], radius: 3, speaker: 'HULL', text: 'A bell-breaker, left on a plinth with its rockets. The shell goes where the ring on the ground shows, over cover, up onto a ledge. It hurts you too.' },
    { id: 'vault', at: [52, 23], radius: 4, speaker: 'INES', text: 'People, standing. They are not dead and they are not awake. Walk past them, please.' },
    { id: 'hollow', at: [52, 25], radius: 2, speaker: 'HULL', text: 'One rib of this wall is thin. Like a held breath, again.' },
    { id: 'dais', at: [68, 23], radius: 4, speaker: 'SIGNAL HOUSE', text: 'The lever is a column on that dais, in the middle of the singers. A stair at each end, a bed at the foot of each: one sleeps while the other blooms.' },
    { id: 'exit', at: [93, 23], radius: 2.5, speaker: 'INES', text: 'The hatchery. Past that is the nave, and it is bigger than this.' },
  ],
  triggers: [
    { id: 'garden', when: 'enter', at: [17, 23], radius: 2.5, do: [{ wake: 'ledges' }, { wake: 'ledges-south' }, { objective: 'Cross the first garden: the beds bloom out of step, the ledges are a way round' }] },
    { id: 'vault', when: 'enter', at: [52, 23], radius: 3, do: [{ objective: 'The second garden is east: the lever is on the dais' }] },
    { id: 'bowl', when: 'enter', at: [62, 23], radius: 2.5, do: [{ wake: 'dais' }] },
  ],
  quality: { enemies: [20, 56], botSeconds: [40, 600], mechanics: ['spores', 'heights', 'switches', 'secret'], skins: 5, enemyKinds: { chorister: 6, bellhand: 2, sexton: 1 },
    scaleClass: 'MIXED', introduces: 'the SPORE BED: a floor that breathes (swells and glows, then blooms and burns and slows) and the bell-breaker MORTAR that throws its shell to the ring on the ground; met as two beds out of step across a basin of singers, then a dais of singers whose stairs start in a bed each' },
};

MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
MAP.decals = [{ kind: 'damp', at: [24, 23], size: 2.4 }, { kind: 'damp', at: [37, 23], size: 2.4 }, { kind: 'scorch', at: [43, 20], size: 2 }, { kind: 'bloodpool', at: [49, 22], size: 1.4 }, { kind: 'ichorpool', at: [64, 23], size: 2 }, { kind: 'damp', at: [73, 14], size: 2.2 }, { kind: 'damp', at: [73, 32], size: 2.2 }];
MAP.growth = [{ at: [52, 23], r: 30, power: 1.2 }];

// ---- PT-025: fed by the dead (src/engine/drops.js): no ammunition boxes on the road, except the mortar's own rockets on its plinth and the niche's cache ----
MAP.drops = { scale: 1, keep: [[43, 22], [43, 24]] };

// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C1E3M03', lane: [...(laneOf('C1E3M03') ?? [])], keep: [], plan: [{"from":"tollbearer","to":"gaunt","pick":"spread","n":5}] };
ENC.apply(MAP);

export default MAP;
