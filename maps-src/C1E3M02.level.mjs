// C1E3M02 RIBBED CORRIDORS: organic maze, door-gates that breathe. The ship is a body. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch B, owner go 2026-10-09.)
// You are inside. The corridors are ribs and the doors are valves: three BREATHING GATES (src/engine/breath.js) open and shut on a clock whatever anyone does, and never shut on a body standing in them. They make the rhythm of the level: a gate that opens is an ambush
// (everything staged behind it is looking at you) and a gate that shuts is a retreat. Two routes meet at the Heart: the short one (a gate, a chamber of sleepers, a gate, a corridor) and the long one north (the same chamber, then a long gallery of singers, a gate, a
// drop back to the Heart); the Heart holds the one lever that opens the remote hatch to the exit. A hollow rib on the Heart's south wall hides a niche.
// Route (main): the Mouth -> gate 1 (shut when you arrive: wait for it to open) -> the First Chamber (sleepers, a Bellhand at the far gate, a singer in the north-east corner) -> gate 2 -> the south corridor -> the Heart -> the lever -> the hatch -> the exit.
// Scale class COMPRESSION (100% roofed, every sightline short: corridors and chambers). The gates are the only moving part: a shut gate is a wall, so a creature behind one cannot see or shoot you.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(78, 46);
const WALL = 'V';                                                                                  // ribbed marrow (wall_rib_a)
const G1 = { period: 9, open: 0.6, phase: 0 }, G2 = { period: 8, open: 0.5, phase: 3 }, G3 = { period: 10, open: 0.5, phase: 5 };

// ---- the mouth, the first passage and the first gate ------------------------------------------------------------------------------------------------------------------------------------
L.room([3, 21, 14, 30], { floor: 'n', wall: WALL });                                               // the Mouth (arrival): x 3..14, z 21..30
L.room([15, 25, 22, 26], { floor: 'g', wall: WALL });                                              // the first passage, two wide
L.room([24, 19, 37, 32], { floor: 'n', wall: WALL });                                              // the First Chamber: x 24..37, z 19..32
L.door(23, 25, { breath: G1 });                                                                    // gate 1: open 5.4 s of every 9, shut for the rest; shut as you arrive
// ---- the south way: gate 2 and a corridor into the Heart -------------------------------------------------------------------------------------------------------------------------------------
L.room([39, 25, 44, 26], { floor: 'g', wall: WALL });
L.door(38, 25, { breath: G2 });                                                                    // gate 2: open half of every 8 s, a quarter-cycle out of step with the first
// ---- the north way: a corridor north, the long gallery, gate 3, a corridor south into the Heart ---------------------------------------------------------------------------------------------
L.room([30, 11, 31, 17], { floor: 'g', wall: WALL });                                              // the north corridor, two wide
L.room([22, 5, 52, 9], { floor: 'n', wall: WALL });                                                // the gallery: x 22..52, z 5..9
L.rect([30, 18, 31, 18], 'n'); L.rect([30, 10, 31, 10], 'n');                                      // both ends of the north corridor are open
L.room([54, 7, 57, 8], { floor: 'g', wall: WALL });
L.door(53, 7, { breath: G3 });                                                                     // gate 3 at the gallery's east end
L.room([56, 9, 57, 17], { floor: 'g', wall: WALL });                                               // the corridor that drops into the Heart's north side
// ---- the Heart, the hatch, the exit and the niche -------------------------------------------------------------------------------------------------------------------------------------------
L.room([46, 19, 66, 32], { floor: 'o', wall: WALL });                                              // the Heart: x 46..66, z 19..32 (the gill floor)
L.rect([45, 25, 45, 26], 'o'); L.rect([56, 18, 57, 18], 'o');                                      // from the south corridor, from the north corridor
L.room([68, 22, 74, 30], { floor: 'n', wall: WALL }); L.door(67, 26, { remote: true });            // the exit chamber behind a hatch the lever opens
L.room([53, 34, 59, 38], { floor: 'n', wall: WALL }); L.secretPanel(56, 33);                        // the niche behind a hollow rib on the Heart's south wall

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(4, 25, '@'); L.put(73, 26, '>');
L.putAll('h', [[4, 22], [4, 28]]); L.putAll('n', [[3, 24], [3, 27], [14, 22], [14, 29]]);
// the First Chamber: sleepers and gaunts staged behind gate 1; the lane (z 24..26) runs from gate 1 to gate 2 between the pillars
L.putAll('t', [[28, 21], [33, 29]]); L.putAll('g', [[26, 29], [35, 22], [31, 20], [30, 29]]);
L.putAll('P', [[28, 23], [33, 23], [28, 28], [33, 28], [30, 21], [30, 30]]); L.putAll('h', [[25, 20], [25, 31]]); L.put(36, 21, 'H'); L.putAll('n', [[24, 22], [24, 29], [37, 22], [37, 29]]);
// the south corridor: health on the road at both ends of it (a person walks the middle and picks it up)
L.putAll('g', [[41, 26], [43, 25]]); L.put(42, 26, 'n'); L.put(36, 26, 'H'); L.put(40, 25, 'h'); L.put(46, 25, 'H'); L.put(47, 26, 'v');
// the north corridor and the gallery: sleepers in the dark, a Sexton behind the pillars, a singer at the east end
L.put(30, 14, 'g'); L.putAll('t', [[28, 7], [36, 8], [44, 6]]); L.put(40, 7, 'x'); L.put(47, 8, 'b'); L.put(50, 8, '1'); L.putAll('P', [[26, 7], [33, 7], [38, 6], [38, 8], [46, 7], [49, 6]]); L.putAll('h', [[23, 6], [52, 6]]); L.putAll('n', [[22, 7], [32, 5], [42, 9], [51, 9]]);
L.put(56, 13, 'g');
// the Heart: guards on both lanes, singers in the corners, a Sexton behind the pillars, the lever on the east wall
L.putAll('t', [[50, 22], [54, 29], [60, 22]]); L.putAll('g', [[52, 27], [61, 24]]); L.put(58, 26, 'b'); L.put(64, 20, '1'); L.put(55, 24, 'x');
L.putAll('P', [[50, 25], [54, 21], [54, 28], [59, 24], [59, 28], [62, 22]]); L.putAll('h', [[47, 20], [47, 31]]); L.put(65, 31, 'v'); L.putAll('n', [[46, 22], [46, 29], [66, 22], [66, 29]]);
// the exit chamber
L.putAll('h', [[70, 24], [70, 28]]); L.put(72, 26, 'n');
// the niche (the secret): a cache of what the dead will not give
L.putAll('H', [[54, 35], [58, 35]]); L.putAll('v', [[54, 37], [58, 37]]); L.putAll('e', [[55, 36], [57, 36]]); L.putAll('r', [[55, 37], [57, 37]]); L.put(56, 36, 'a'); L.put(56, 38, 'n');

// ---- PT-021, rooms that are not boxes (the lane of the routes decides what may be cut; props go into the new bays) -----------------------------------------------------------------------
const S = new Shape(L, { lane: laneOf('C1E3M02'), keep: [[67, 25], [56, 32]] });
const h0 = S.bayLog.length;
S.hall([24, 19, 37, 32], { sides: { n: { w: 3, gap: 3, d: 2, heart: true }, s: { w: 3, gap: 3, d: 2, heart: true } }, cut: 2 }); S.dressBays('cradle', h0);
S.chamfer([46, 19, 66, 32], 'nw ne sw se', 2); S.chamfer([3, 21, 14, 30], 'nw ne sw se', 2); S.chamfer([68, 22, 74, 30], 'nw ne sw se', 1);
console.log('C1E3M02 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [33,25], radius: 2, cells: ENC.around([33,25], { n: 3, min: 4, max: 8 }), kind: 'g' });
ENC.dropIn({ at: [46,25], radius: 2, cells: ENC.around([46,25], { n: 3, min: 4, max: 8 }), kind: 'g' });

// ---- end PT-052 ----

const layers = L.layers();

const MAP = {
  id: 'C1E3M02', name: 'Ribbed Corridors', version: 1, ceilingHeight: 4.2, par: { time: 300 },
  atmosphere: { fog: '#243430', fogDensity: 0.02, sky: 'ash', look: 'choir' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  legend: { 1: { type: 'enemy', kind: 'chorister' } },
  intro: { title: 'RIBBED CORRIDORS', lines: ['The doors are breathing.', 'Wait for them. Do not be in one when it matters.'] },
  outro: 'Next: the Gill Gardens. Where the ship keeps the people it has not finished with.',
  objective: 'Find the heart of the ship. The gates open when it breathes in',
  ...layers,
  secrets: [{ id: 'hollow-rib', panel: [56, 33], cells: [[56, 34], [56, 35], [56, 36]] }],
  groups: [{ name: 'chamber', rect: [24, 19, 37, 32] }, { name: 'gallery', rect: [22, 5, 52, 9] }, { name: 'heart', rect: [46, 19, 66, 32] }],
  entities: [
    { type: 'switch', id: 'bellows', at: [66, 25], wall: 'east', do: [{ open: [67, 26] }, { objective: 'The hatch is open: the exit is at the east end of the last chamber' }, { shake: 1.2 }] },
  ],
  messages: [
    { id: 'start', at: [5, 25], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, you are in. Those are not corridors, they are ribs. Keep to the floor and listen. The ship is breathing and you are in its lungs.' },
    { id: 'gate1', at: [21, 25], radius: 2.5, speaker: 'INES', text: 'That door is breathing. It opens, it shuts, and it does not care what you want. It will not shut on you if you are standing in it. Wait for it.' },
    { id: 'chamber', at: [26, 25], radius: 3, speaker: 'INES', text: 'People, standing, asleep. And something singing in the corner. Gate on the far side, a way north on this one. Stay out of the middle of the room.' },
    { id: 'north', at: [30, 22], radius: 3.6, speaker: 'INES', text: 'The air moves up that corridor. It is longer and there is no gate at the mouth. I do not think it is quieter.' },
    { id: 'heart', at: [50, 25], radius: 4, speaker: 'SIGNAL HOUSE', text: 'This is the heart room. Everything you have passed was a valve. There is a lever on the east wall: that is the way out.' },
    { id: 'hollow', at: [56, 31], radius: 2, speaker: 'HULL', text: 'This rib is thinner than the others. It sounds hollow, like a held breath.' },
    { id: 'exit', at: [70, 26], radius: 2.5, speaker: 'INES', text: 'It is open. It let you through. I would like to know why.' },
  ],
  triggers: [
    { id: 'chamber', when: 'enter', at: [28, 25], radius: 3, do: [{ objective: 'Cross the chamber. Gate 2 is on the east wall; a corridor leads north' }] },
    { id: 'heart', when: 'enter', at: [47, 25], radius: 2.5, do: [{ objective: 'The lever is on the Heart\'s east wall' }] },
  ],
  quality: { enemies: [20, 56], botSeconds: [40, 600], mechanics: ['gates', 'switches', 'secret'], skins: 4, enemyKinds: { chorister: 2, bellhand: 2, sexton: 1 },
    scaleClass: 'COMPRESSION', introduces: 'the BREATHING GATE: a door on a clock that opens and shuts by itself and never shuts on a body in it; a gate that opens is an ambush, one that shuts is a retreat; you learn the rhythm in a chamber with a way round' },
};

// PT-021: the props set down in the new bays (after every other entity: no id shifts)
MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
MAP.decals = [{ kind: 'ichorpool', at: [20, 25], size: 1.8 }, { kind: 'smear', at: [37, 25], rot: 0, size: 2.2, h: 0.8 }, { kind: 'bloodpool', at: [28, 22], size: 1.4 }, { kind: 'damp', at: [42, 25], size: 1.8 }, { kind: 'ichorpool', at: [56, 25], size: 2 }, { kind: 'scorch', at: [60, 27], size: 2 }];
MAP.growth = [{ at: [56, 25], r: 26, power: 1.3 }];                                                     // the Heart: growth thickest round it, reaching down every corridor

// ---- PT-025: fed by the dead (src/engine/drops.js): no ammunition boxes on the road, a few in the niche ----
MAP.drops = { scale: 1 };

// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C1E3M02', lane: [...(laneOf('C1E3M02') ?? [])], keep: [], plan: [{"from":"gaunt","to":"bellhand","pick":"spread","n":1},{"from":"gaunt","to":"chorister","pick":"spread","n":1}] };
ENC.apply(MAP);

export default MAP;
