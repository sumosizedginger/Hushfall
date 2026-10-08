// C1E1M08 BELL TOWER OF ST. ORRIN: the end of Port Marrow. A spiral ascent (counter-clockwise, 12 m of climb) to an open-air ringing chamber and the Cantor.
// The Cantor is shielded (5% damage) while any of its six bell nodes ring. It sings expanding tone pulses (cover and height stop them), summons Gaunts, and once the ring is broken it fans toll-shots.
// Sever the ring, kill the Cantor: the belfry hatch (the exit) opens. The door to the chamber seals behind you.
// Route: courtyard -> tower door (SE) -> south leg (west) -> west leg (north) -> north leg (east) -> east leg (south; a Warden-Graft among pillars) -> chamber door -> the ring, the Cantor, the hatch.
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(54, 62);
L.rect([10, 6, 46, 44], 'B');                                                   // the tower: solid stone, corridors carved out of it
const climb = (r, axis, fromLow, h0, h1) => {                                   // a corridor whose floor climbs h0 -> h1 (0.5 m units) along its length
  const len = axis === 'x' ? r[2] - r[0] + 1 : r[3] - r[1] + 1;
  for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) { const i = axis === 'x' ? x - r[0] : z - r[1], t = (fromLow ? i : len - 1 - i) / (len - 1); L.height([x, z, x, z], Math.round(h0 + (h1 - h0) * t)); }
};
// the four legs, wound counter-clockwise: south (east -> west, 0 -> 3 m), west (south -> north, 3 -> 6 m), north (west -> east, 6 -> 9 m), east (north -> south, 9 -> 12 m)
L.rect([11, 39, 45, 43], 'f'); climb([11, 39, 45, 43], 'x', false, 0, 6);
L.rect([11, 7, 15, 38], 't'); climb([11, 7, 15, 38], 'z', false, 6, 12);
L.rect([11, 7, 45, 11], 'f'); climb([11, 7, 45, 11], 'x', true, 12, 18);
L.rect([41, 7, 45, 37], 'g'); climb([41, 7, 45, 37], 'z', true, 18, 24);
// courtyard (open air) with the tower door at the south-east corner of the tower
L.room([20, 45, 48, 57], { floor: ':', wall: 'B' }); L.door(44, 44);
// the ringing chamber: open to the sky, 6 m above the ground floor... a big walled belfry with a door in the east wall
L.rect([17, 13, 39, 37], 'p'); L.height([17, 13, 39, 37], 24); L.door(40, 35);
// four low platforms (1.5 m up) with stairs: standing on them, the tone pulses pass beneath you
L.rect([18, 14, 20, 16], 'p'); L.height([18, 14, 20, 16], 27); L.stairs([21, 14, 23, 16], 'x', 27, 25);
L.rect([36, 14, 38, 16], 'p'); L.height([36, 14, 38, 16], 27); L.stairs([33, 14, 35, 16], 'x', 25, 27);
L.rect([18, 34, 20, 36], 'p'); L.height([18, 34, 20, 36], 27); L.stairs([21, 34, 23, 36], 'x', 27, 25);
L.rect([36, 34, 38, 36], 'p'); L.height([36, 34, 38, 36], 27); L.stairs([33, 34, 35, 36], 'x', 25, 27);
// seam between the top of the spiral and the bottom of it
// (the east leg stops at z=37; row z=38 stays stone)

// ---- objects -------------------------------------------------------------------------------------------------------------
L.put(30, 55, '@');
// courtyard: crates, lanterns, guards
L.putAll('C', [[26, 50], [34, 50], [42, 52], [24, 54]]); L.putAll('c', [[27, 50], [35, 50]]); L.putAll('o', [[30, 48], [40, 48]]); L.putAll('n', [[22, 46], [46, 46], [22, 56], [46, 56], [34, 54]]);
L.putAll('t', [[26, 52], [38, 52], [32, 47], [42, 50]]); L.putAll('g', [[28, 54], [40, 54]]); L.put(22, 48, 'b'); L.putAll('h', [[24, 56], [44, 56]]); L.put(30, 53, 'e'); L.put(36, 56, 'r');
// south leg (walk west): three Tollbearers, Gaunts, a Bellhand at the far end of the long corridor
L.putAll('t', [[40, 41], [34, 40], [28, 42], [22, 40], [16, 42]]); L.putAll('g', [[36, 42], [26, 40]]); L.put(12, 41, 'b'); L.putAll('n', [[38, 39], [24, 43], [14, 39]]); L.putAll('C', [[31, 41], [19, 41]]);
L.putAll('h', [[42, 43], [20, 43]]); L.putAll('e', [[33, 43], [15, 40]]); L.put(27, 39, 'r'); L.put(44, 40, 'a');
// west leg (walk north)
L.putAll('t', [[13, 33], [13, 25], [13, 17]]); L.putAll('g', [[12, 29], [14, 21]]); L.put(13, 9, 'b'); L.putAll('n', [[15, 34], [11, 22], [15, 12]]); L.putAll('C', [[13, 29], [13, 13]]);
L.put(11, 35, 'H'); L.putAll('e', [[14, 27], [12, 15]]); L.put(14, 19, 'r'); L.put(12, 31, 'a'); L.put(11, 24, 'h');
// north leg (walk east): a Sexton stands over the corridor's far end
L.putAll('t', [[20, 9], [28, 9], [36, 9]]); L.putAll('g', [[24, 10], [32, 8]]); L.put(41, 9, 'x'); L.put(44, 9, 'b'); L.putAll('n', [[18, 7], [30, 11], [40, 7]]); L.putAll('C', [[22, 9], [34, 9]]);
L.putAll('h', [[16, 10], [38, 10]]); L.putAll('e', [[26, 8], [42, 11]]); L.put(30, 9, 'r'); L.put(14, 8, 'a'); L.put(24, 7, 'H');
// east leg (walk south): a Warden-Graft among pillars; charge lanes are short
L.put(43, 15, 'w'); L.putAll('P', [[42, 20], [44, 24], [42, 28]]); L.putAll('t', [[43, 23], [42, 31], [44, 34]]); L.putAll('g', [[44, 27]]); L.put(43, 36, 'b'); L.putAll('n', [[45, 13], [41, 26], [45, 35]]);
L.putAll('h', [[41, 12], [45, 30]]); L.putAll('e', [[44, 18], [41, 33]]); L.put(42, 12, 'r'); L.put(43, 30, 'a'); L.put(44, 37, 'H'); L.put(41, 37, 'H');
// chamber: the ring of six bell nodes, the Cantor at the centre, pillars for cover, a cache by the door
L.putAll('B', [[28, 18], [34, 21], [34, 29], [28, 32], [22, 29], [22, 21]]);

L.putAll('P', [[24, 25], [32, 25], [28, 22], [28, 28], [25, 22], [31, 22], [25, 28], [31, 28]]);
L.putAll('r', [[38, 33], [38, 27], [38, 23], [18, 24], [18, 26], [38, 31], [18, 22], [18, 28]]); L.putAll('e', [[37, 31], [37, 25], [19, 25]]); L.putAll('a', [[38, 21], [19, 27], [38, 29]]); L.putAll('H', [[38, 25], [18, 30], [18, 20]]); L.putAll('v', [[38, 35], [38, 19], [18, 32]]); L.putAll('H', [[30, 36], [26, 14]]); L.put(19, 31, 'r');
L.putAll('n', [[19, 14], [37, 14], [19, 36], [37, 36]]);
// (the exit is the explicit locked entity below; no '>' glyph)

// ---- PT-021, rooms that are not boxes (tools/mapkit/shape.mjs: only floor is added and corners are cut, away from every object and the routes' lane; props go into the new bays) ----
const S = new Shape(L, { lane: laneOf('C1E1M08') });
S.bays('w', 10, 8, 38, { w: 3, gap: 3, d: 1 }); S.bays('e', 46, 9, 36, { w: 3, gap: 3, d: 1 }); S.bays('n', 6, 12, 44, { w: 3, gap: 3, d: 1 });      // embrasures in the tower's outer wall, one on every leg
S.dressBays('lantern');
S.hall([20, 45, 48, 57], { sides: { w: { w: 3, gap: 3, d: 1 }, e: { w: 3, gap: 3, d: 1 }, s: { w: 3, gap: 3, d: 2 } }, cut: 3 });  // the courtyard
console.log('C1E1M08 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

const layers = L.layers();

const MAP = {
  id: 'C1E1M08', name: 'Bell Tower of St. Orrin', version: 2, ceilingHeight: 4.2, par: { time: 1100 },
  atmosphere: { fog: '#1a1428', fogDensity: 0.014, sky: 'night', look: 'moon' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 8, shell: 12, rivet: 80 }, weapons: ['flare', 'scattergun', 'rivet'] },
  legend: { B: { type: 'enemy', kind: 'bellnode' } },
  intro: { title: 'BELL TOWER OF ST. ORRIN', lines: ['The bell has rung for three days.', 'Nobody is pulling the rope.'] },
  outro: 'Port Marrow is quiet. The signal is not: it is going somewhere. Episode one ends here.',
  objective: 'Enter the tower (south-east door) and climb',
  ...layers,
  groups: [{ name: 'cantor', rect: [28, 25, 28, 25] }],
  entities: [
    { type: 'exit', at: [28, 15], locked: true, dest: 'next' },
    { type: 'enemy', kind: 'cantor', at: [28, 25], group: 'cantor', facing: 'east', summons: [[19, 20], [37, 20], [19, 30], [37, 30]] },
  ],
  messages: [
    { id: 'start', at: [30, 55], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Bell Tower. It has rung since the transmission. The signal goes up through it. Climb: the tower is a spiral, a long stair. Whatever rings it is at the top.' },
    { id: 'door', at: [44, 42], radius: 3, speaker: 'INES', text: 'The whole stair is one corridor, going round and up. Nothing to find: just the way, and what is on it.' },
    { id: 'warden', at: [43, 12], radius: 4, speaker: 'INES', text: 'Another plate-bearer. Pillars in the corridor: that is your friend, again.' },
    { id: 'sexton', at: [38, 9], radius: 4, speaker: 'INES', text: 'The bell-carrier at the end of the corridor. It will raise anything you leave on the floor. Reach it first.' },
    { id: 'chamber', at: [38, 35], radius: 3, speaker: 'SIGNAL HOUSE', text: 'That is it: the ring of six bells, and the Cantor in the middle. The Bell is a machine, Calder. Cut the ring, then the singer. Use the pillars: the tone will not go through stone.' },
    { id: 'ring', at: [28, 18], radius: 2, speaker: 'INES', text: 'One bell down. The Cantor staggered when it broke. Keep cutting the ring.' },
    { id: 'quiet', at: [28, 17], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The tower is silent. The signal did not stop: it went somewhere else. The hatch is open. Go.' },
  ],
  triggers: [
    { id: 'sealed', when: 'enter', at: [37, 33], radius: 3, do: [{ seal: [40, 35] }, { message: 'chamber' }, { objective: 'Sever the ring: six bell nodes, then the Cantor. Stone breaks the tone' }, { shake: 1.2 }] },
    { id: 'cantor-dead', when: 'dead:cantor', do: [{ exit: { set: 'unlock' } }, { unseal: [40, 35] }, { message: 'quiet' }, { objective: 'The Cantor falls. The belfry hatch is open, north side of the chamber' }, { shake: 2 }] },
  ],
  quality: { enemies: [40, 70], botSeconds: [120, 720], mechanics: ['heights', 'triggers'], skins: 6, enemyKinds: { cantor: 1, bellnode: 6, wardengraft: 1, sexton: 1 } },
};

// PT-021: the props set down in the new bays (after every other entity: no id shifts)
MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
// ---- PT-021 marks and growth (render-only data, validated by mapformat: what the place has been through, and where the Vael's growth started) ----
MAP.decals = [{ kind: 'bloodpool', at: [40, 48], size: 1.3 }, { kind: 'smear', at: [33, 41], rot: 0, size: 2.6, h: 1.0 }, { kind: 'scrape', at: [25, 43], wall: 'south', y: 1.1, size: 1.4 }, { kind: 'scorch', at: [28, 25], size: 1.6 }];                 // the courtyard, the south leg, under the ring
MAP.growth = [{ at: [28, 25], r: 22, power: 0.8 }];                                                                                                                                                          // the chamber where the Cantor sings: it has climbed down the east leg
// ---- end PT-021 marks and growth ----

export default MAP;
