// C1E3M01 LANDING SCAR: crater approach, crossfire lanes. First look at a grounded Choir Ship. (Episode 3, The Choir Ships; Gate 4 batch 3, Batch A, owner approval 2026-10-09.)
// The thing came down three nights ago on the hill behind Port Marrow and burned a bowl into the ground. The player lands on the west rim, goes down a ramp into the basin and has to cross it to a wound in the ship's side. Two
// rims (a north and a south ledge, 3 m up) hold the CHORISTERS, the first Vael-grown shooters: they sing in bursts of four, keep their distance, circle, and every round that goes by close SUPPRESSES (your guns open up for a moment, see
// DROPS / SUPPRESS in src/engine/defs.js): standing in the open under their fire is how you lose. Cover is rubble in the basin; the high ground is the other answer (the ledges can be climbed at their east ends and walked).
// Inside, the hull is a body: a long ribbed gullet (platforms along the ribs hold more singers), a throat with the one machine in the ship (a valve lever on its north wall) and the hatch it opens. A rib on the north side sounds
// hollow: the secret is a bone-white niche behind it.
// Route: the plateau (two sleepers in sight of the spawn) -> the ramp -> the basin, rubble to rubble, under both rims -> the breach -> the gullet -> the throat door -> the valve -> the hatch -> the exit.
// Scale class MIXED (about 45% roofed: the open crater against the roofed hull). Open air vs roof: the crater floors (m s) are open; the hull floors (n g) are roofed.
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(84, 44);

// ---- the Landing Scar (open air): the west rim where you land, two ledges, the basin, a ramp, and the steps at the east end of each ledge ------------------------------------------------
L.room([3, 10, 31, 33], { floor: 'm', wall: 'T' });                                          // interior x 3..31, z 10..33 (the ring is wall)
L.rect([3, 10, 8, 33], 's'); L.height([3, 10, 8, 33], 6);                                      // the west rim: slate, 3 m above the basin
L.rect([9, 10, 31, 14], 's'); L.height([9, 10, 31, 14], 6);                                    // the north ledge
L.rect([9, 29, 31, 33], 's'); L.height([9, 29, 31, 33], 6);                                    // the south ledge
L.stairs([9, 19, 15, 25], 'x', 6, 0);                                                          // the ramp from the rim into the basin (6 steps of half a metre)
L.stairs([25, 10, 31, 14], 'x', 6, 0); L.stairs([25, 29, 31, 33], 'x', 6, 0);                  // each ledge steps down into the basin at its east end: a way round the crossfire, through the singers
for (const r of [[17, 16, 18, 17], [17, 26, 18, 27], [22, 19, 23, 20], [22, 24, 23, 25], [26, 16, 27, 17], [26, 26, 27, 27], [13, 16, 14, 17], [13, 26, 14, 27]]) L.rect(r, 'T');       // rubble: stone blocks that stop a round and break a line, the lane z 21..23 between them left open

// ---- the hull: a wound in the east wall, the gullet, the throat, the hatch and the niche ----------------------------------------------------------------------------------------------------
L.room([33, 14, 54, 29], { floor: 'n', wall: 'R' });                                           // the gullet (roofed, resin ribs): x 33..54, z 14..29
L.rect([32, 20, 32, 24], 'n');                                                                 // the breach: five cells of the crater's east wall are gone
L.stairs([34, 14, 36, 17], 'x', 0, 2); L.height([37, 14, 52, 17], 2);                          // the north rib: a platform a metre up along the wall, the singers' perch
L.stairs([34, 26, 36, 29], 'x', 0, 2); L.height([37, 26, 52, 29], 2);                          // the south rib
L.room([56, 17, 67, 26], { floor: 'g', wall: 'R' }); L.door(55, 22);                           // the throat (a grate floor: the one made thing): x 56..67, z 17..26
L.room([69, 20, 74, 24], { floor: 'n', wall: 'R' }); L.door(68, 22, { remote: true });         // the hatch and the last chamber: the valve opens it
L.room([41, 8, 47, 12], { floor: 'n', wall: 'R' }); L.secretPanel(44, 13); L.height([41, 8, 47, 12], 2);                     // the niche behind a hollow rib on the gullet's north wall

// ---- objects --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(4, 22, '@'); L.put(73, 22, '>');
// the rim: two sleepers in sight of the spawn (something is wrong at once), a Gaunt behind them
L.put(7, 17, 't'); L.put(6, 13, 'g');
L.putAll('h', [[5, 20], [5, 24]]);
// the ledges: the singers (symbol 1: Chorister), two on each, set well back from the edge; a Bellhand at each east corner of the basin
L.putAll('1', [[14, 12], [23, 12], [14, 31], [23, 31]]); L.putAll('b', [[30, 17], [30, 27]]);
// the basin: sleepers in the open and Gaunts behind the rubble
L.putAll('t', [[20, 19], [25, 22]]); L.putAll('g', [[21, 28], [28, 20]]);
L.putAll('h', [[19, 16], [19, 27], [24, 18], [24, 26], [28, 15], [28, 28]]); L.putAll('H', [[16, 22]]);
// the wreck's own cargo, set down by the landing (cover on the ledges)
L.putAll('C', [[12, 11], [18, 13], [26, 11], [12, 32], [18, 30], [26, 32]]); L.putAll('P', [[20, 11], [20, 32]]);
// the gullet: a guard in the lane, a singer on the north rib, a Bellhand at its east end, a Sexton behind the pillars; pillars (ribs of bone) off the lane
L.putAll('t', [[38, 19], [44, 24], [50, 20]]); L.putAll('g', [[41, 21], [47, 23]]);
L.put(44, 16, '1'); L.put(51, 15, 'b'); L.put(50, 22, 'x');
L.putAll('P', [[40, 19], [40, 25], [47, 19], [47, 25], [52, 19], [52, 25]]);
L.putAll('h', [[36, 20], [36, 24], [43, 22]]); L.putAll('v', [[35, 22]]); L.putAll('H', [[53, 18], [53, 26]]);
L.putAll('n', [[34, 19], [34, 25], [54, 20], [54, 24]]);                                         // lanterns on the ribs
// the throat: two singers across the door, sleepers, the lever
L.putAll('1', [[58, 19], [58, 24]]); L.putAll('t', [[61, 20], [64, 23]]); L.put(59, 22, 'g');
L.putAll('P', [[60, 18], [60, 25], [63, 22]]); L.putAll('h', [[57, 20], [57, 24]]); L.put(66, 22, 'H'); L.putAll('n', [[56, 17], [67, 26]]);
// the last chamber: the exit and a little of everything
L.putAll('h', [[71, 21], [71, 23]]); L.put(72, 22, 'v'); L.put(70, 22, 'n');
// the niche (the secret): a cache
L.putAll('v', [[42, 9], [46, 9]]); L.putAll('H', [[43, 9], [45, 9]]); L.putAll('r', [[42, 11], [46, 11]]); L.putAll('e', [[43, 11], [45, 11]]); L.putAll('a', [[44, 10]]); L.put(44, 8, 'n');

// ---- PT-021, rooms that are not boxes (tools/mapkit/shape.mjs: only floor is added and corners are cut, away from every object and the routes' lane; props go into the new bays) ----
const S = new Shape(L, { lane: laneOf('C1E3M01'), keep: [[63, 16], [44, 13]] });                       // the valve's wall and the hollow rib stay
const h0 = S.bayLog.length;
S.hall([33, 14, 54, 29], { sides: { n: { w: 3, gap: 3, d: 2, heart: true }, s: { w: 3, gap: 3, d: 2, heart: true } }, cut: 2 }); S.dressBays('cradle', h0);        // the gullet's ribs: a cradle in each apse
S.chamfer([56, 17, 67, 26], 'nw ne sw se', 2); S.chamfer([69, 20, 74, 24], 'nw ne sw se', 1);
console.log('C1E3M01 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

const layers = L.layers();

const MAP = {
  id: 'C1E3M01', name: 'Landing Scar', version: 1, ceilingHeight: 4.2, par: { time: 320 },
  atmosphere: { fog: '#2c3a3a', fogDensity: 0.011, sky: 'ash', look: 'choir' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  legend: { 1: { type: 'enemy', kind: 'chorister' } },
  intro: { title: 'LANDING SCAR', lines: ['It came down three nights ago and has not stopped singing.', 'The crater is the only way to the ship.'] },
  outro: 'Next: the Ribbed Corridors. The ship is not a building. It breathes, and the doors with it.',
  objective: 'Go down into the crater and cross it. The ship is in the east wall',
  ...layers,
  secrets: [{ id: 'hollow-rib', panel: [44, 13], cells: [[44, 12], [44, 11], [44, 10]] }],
  groups: [{ name: 'rim', rect: [9, 10, 31, 14] }, { name: 'rim-south', rect: [9, 29, 31, 33] }],
  entities: [
    { type: 'switch', id: 'valve', at: [62, 17], wall: 'north', do: [{ open: [68, 22] }, { objective: 'The hatch is open: the exit is at the east end of the last chamber' }, { shake: 1.5 }] },
  ],
  messages: [
    { id: 'start', at: [4, 22], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Landing Scar. Three nights ago something came down in that bowl. The ship is in the east wall. There is no other way to it.' },
    { id: 'sleepers', at: [7, 20], radius: 3, speaker: 'INES', text: 'People, standing. They have been standing there since it landed. Do not wake them if you can help it.' },
    { id: 'rim', at: [13, 22], radius: 2.5, speaker: 'INES', text: 'Singers on both rims. They sing in fours, and anything that goes past you shakes your aim. Cross rubble to rubble. Do not stand in the open.' },
    { id: 'high', at: [27, 22], radius: 3, speaker: 'INES', text: 'The ledges step down at the east end. If you can get up there they are close enough to hit with anything.' },
    { id: 'breach', at: [33, 22], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'It is open. It was not forced: it opened. This is not a wreck, Calder. It is still alive.' },
    { id: 'gullet', at: [38, 22], radius: 3, speaker: 'INES', text: 'Ribs. Those are ribs. Singers on the ledges again: get under them or get past them.' },
    { id: 'hollow', at: [44, 15], radius: 2, speaker: 'HULL', text: 'This rib is thinner than the rest. Put a knuckle to it and it answers like a bell.' },
    { id: 'throat', at: [59, 22], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The valve on the north wall is the one thing in here that was made rather than grown. Turn it and the hatch should open.' },
    { id: 'exit', at: [71, 22], radius: 2.5, speaker: 'INES', text: 'Past that is the ship proper. Listen. It is breathing.' },
  ],
  triggers: [
    { id: 'rim', when: 'enter', at: [14, 22], radius: 2.5, do: [{ wake: 'rim' }, { wake: 'rim-south' }, { objective: 'Singers on both rims. Cross rubble to rubble: the breach is east' }] },
    { id: 'breach', when: 'enter', at: [33, 22], radius: 2, do: [{ objective: 'Inside the hull. The valve is on the throat wall' }] },
  ],
  quality: { enemies: [22, 56], botSeconds: [40, 600], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { chorister: 6, bellhand: 3 },
    scaleClass: 'MIXED', introduces: 'the CHORISTER: a Vael-grown singer that fires bursts of four from the high ground and, when its fire goes by close, suppresses you (your guns open up); met as crossfire from two rims over an open crater, then again on the ribs of the first grounded Choir Ship' },
};

// PT-021: the props set down in the new bays (after every other entity: no id shifts)
MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
// ---- marks and growth (render-only data, validated by mapformat) ----
MAP.decals = [{ kind: 'scorch', at: [13, 22], size: 2.6 }, { kind: 'scorch', at: [21, 22], size: 2.2 }, { kind: 'ichorpool', at: [30, 22], size: 1.8 }, { kind: 'smear', at: [36, 22], rot: 0, size: 2.4, h: 0.9 }, { kind: 'bloodpool', at: [8, 20], size: 1.4 }, { kind: 'ichorpool', at: [47, 22], size: 1.6 }, { kind: 'damp', at: [60, 22], size: 1.8 }];
MAP.growth = [{ at: [44, 22], r: 30, power: 1.2 }];                                                      // the ship's growth reaches out of the breach and across the crater floor
// ---- end marks and growth ----

// ---- PT-025: fed by the dead (src/engine/drops.js): no ammunition boxes on the road, a few in the niche ----
MAP.drops = { scale: 1 };

export default MAP;
