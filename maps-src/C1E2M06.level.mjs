// C1E2M06 PUMP CATHEDRAL: verticality and catwalk combat. The Works drains something from the sea.
// Scale class MIXED/COMPRESSION is decided by the measured numbers (design/CAMPAIGN_SPINE.md); the nave is 13 m tall (quality.tallReason: it is the episode's one named cathedral hall). The new idea is the CAGE LIFT and
// the VERTICAL ROUTE: the ground is a wading sump around the great pump; the only way up is a cage (a moving floor with a call lever); the catwalks run round the east end (north, east, south), and each gallery is a
// stair-climb over the nave: the drain lever is on the SOUTH gallery, the exit on the NORTH gallery, so the route climbs twice with Bellhands over you in both.
// Route: the entrance hall -> the ground nave (gangs round the sump, pillars and pump housings) -> the cage on the east side -> the east catwalk -> the south terrace -> stairs up the south gallery (the drain lever)
//        -> back down -> the north terrace -> stairs up the north gallery -> the exit.
// Open air vs roof: the whole nave is roofed (`g f` floors), the sump is wading water. Nothing is hung in the open.
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(76, 52);

// ---- the entrance hall and the nave (iron walls, a grate floor, one absolute 13 m ceiling so the catwalks have air above them) -------------------------------------------------
L.room([3, 21, 11, 28], { floor: 'f', wall: 'L' }); L.door(12, 24);
L.room([13, 7, 57, 43], { floor: 'g', wall: 'I' }); L.ceiling([13, 7, 57, 43], 13);
L.fx([26, 17, 44, 33], 'w');                                                                    // the sump: wading water round the great pump
L.rect([32, 22, 38, 28], 'I'); L.fx([32, 22, 38, 28], '.');                                                                  // the great pump: a solid iron column in the sump
// pump housings and partitions: solid blocks that break the nave's sightlines and give the ground cover
for (const r of [[18, 12, 21, 16], [18, 34, 21, 38], [24, 9, 26, 12], [24, 38, 26, 41], [30, 12, 34, 14], [30, 36, 34, 38], [40, 12, 43, 15], [40, 35, 43, 38], [46, 18, 47, 21], [46, 29, 47, 32], [17, 17, 18, 18], [17, 31, 18, 32], [23, 19, 24, 20], [23, 29, 24, 30], [35, 15, 36, 16], [35, 34, 36, 35], [41, 19, 42, 20], [41, 30, 42, 31]]) L.rect(r, 'K');
L.fx([41, 19, 42, 20], '.'); L.fx([41, 30, 42, 31], '.');
L.rect([55, 18, 56, 19], 'I'); L.rect([53, 30, 54, 31], 'I'); L.rect([55, 12, 56, 13], 'I'); L.rect([53, 36, 54, 37], 'I');          // staggered blocks on the east catwalk: no 29 m straight line

// ---- the east end: catwalks at 4 m (north, east, south), two galleries at 8 m with stairs, the cage lift between the ground and the east catwalk -----------------------------
L.height([51, 7, 56, 10], 8); L.height([53, 11, 56, 39], 8); L.height([51, 40, 56, 43], 8);              // the catwalks (4 m)
L.stairs([43, 7, 50, 10], 'x', 16, 8); L.height([28, 7, 42, 10], 16);                                 // the north gallery (8 m) and its stair
L.stairs([43, 40, 50, 43], 'x', 16, 8); L.height([28, 40, 42, 43], 16);                               // the south gallery and its stair
L.wall([50, 23, 52, 23], 'I'); L.wall([50, 27, 52, 27], 'I'); L.wall([48, 23, 48, 23], 'I');         // the cage shaft's walls, and the post the call lever is on
const cage = []; for (let z = 24; z <= 26; z++) for (let x = 50; x <= 52; x++) cage.push([x, z]);

// the engineers' office (secret): a panel in the nave's west wall
L.room([6, 10, 11, 14], { floor: 'f', wall: 'L' }); L.secretPanel(12, 12);

// ---- objects --------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 24, '@');
L.putAll('f', [[4, 22], [4, 27]]); L.put(3, 24, 'F'); L.putAll('m', [[6, 22], [6, 27]]); L.putAll('e', [[8, 23], [8, 25]]); L.putAll('r', [[3, 22], [3, 27]]); L.put(7, 24, 'h');
// the ground nave: gangs in the aisles, pillars, the cradle rail overhead (machinery), lanterns; ammunition on the aisle lane z=24..25
L.putAll('t', [[16, 14], [16, 36], [22, 24], [22, 20], [22, 30], [28, 17], [28, 33], [38, 16], [38, 34], [44, 22], [44, 28]]); L.putAll('g', [[19, 20], [19, 30], [30, 25], [46, 24]]);
L.putAll('P', [[16, 20], [16, 30], [24, 16], [24, 34], [28, 22], [28, 28], [44, 17], [44, 33]]); L.putAll('O', [[20, 24], [30, 20], [30, 30], [42, 24]]); L.putAll('D', [[21, 24], [31, 20], [31, 30], [43, 24]]);
L.putAll('n', [[15, 24], [27, 25], [45, 25], [15, 10], [15, 40]]); L.putAll('m', [[20, 10], [20, 40], [36, 10], [36, 40], [50, 14], [50, 36]]);
L.putAll('e', [[14, 24], [17, 25], [23, 25], [29, 24], [37, 21], [45, 26], [47, 25]]); L.putAll('r', [[15, 25], [20, 25], [26, 24], [33, 21], [41, 25], [48, 26]]); L.putAll('a', [[18, 24], [25, 25], [35, 29], [47, 24]]);
L.putAll('h', [[14, 20], [14, 30], [22, 25], [36, 30], [46, 25]]); L.putAll('H', [[16, 18], [16, 32], [45, 21]]);
// the east catwalk, the terraces and galleries: Bellhands on both galleries and both terraces; Gaunts on the catwalk; stairs of ammunition
L.putAll('g', [[54, 15], [54, 35], [55, 25]]); L.putAll('t', [[55, 20], [55, 30]]); L.putAll('b', [[54, 8], [54, 42], [35, 8], [30, 9], [35, 42], [30, 41]]); L.putAll('t', [[40, 9], [40, 41], [47, 8], [47, 42]]);
L.putAll('e', [[54, 12], [54, 38], [53, 9], [53, 41], [47, 9], [47, 41]]); L.putAll('r', [[55, 14], [55, 36], [45, 8], [45, 42], [33, 9], [33, 41]]); L.putAll('a', [[54, 20], [55, 28], [39, 8], [39, 42]]);
L.putAll('H', [[53, 24], [53, 26], [29, 9], [29, 41]]); L.putAll('h', [[55, 16], [55, 38], [41, 8], [41, 42]]); L.putAll('v', [[28, 8], [28, 42]]);
L.putAll('n', [[53, 8], [53, 42], [56, 25]]);
L.put(29, 8, '.');
// more of the congregation: Gaunts on the stairs, guards on the galleries, more on the ground
L.putAll('g', [[46, 9], [46, 41], [25, 14], [25, 36]]); L.putAll('t', [[34, 9], [34, 41], [22, 14], [22, 36], [32, 10], [32, 40]]); L.putAll('t', [[26, 22], [26, 28], [42, 17], [42, 33]]);
// the office: the engineer's own supplies
L.put(7, 11, 'v'); L.put(10, 11, 'H'); L.put(7, 13, 'e'); L.put(10, 13, 'r'); L.put(8, 12, 'f'); L.put(9, 11, 'a'); L.put(8, 10, 'F');

// ---- PT-021, rooms that are not boxes (tools/mapkit/shape.mjs: only floor is added and corners are cut, away from every object and the routes' lane; props go into the new bays) ----
const S = new Shape(L, { lane: laneOf('C1E2M06'), keep: [[35, 44], [50, 23], [48, 23]], foes: [[55, 17], [55, 33]] });                                  // the drain lever's wall and the cage levers' walls stay
const n0 = S.bayLog.length;
S.hall([13, 7, 57, 43], { sides: { n: { w: 3, gap: 4, d: 2, heart: true }, s: { w: 3, gap: 4, d: 2, heart: true }, w: { w: 3, gap: 3, d: 2, heart: 'alt' }, e: { w: 3, gap: 3, d: 2, heart: 'alt' } }, cut: 3 });   // the nave: chapels down both walls, the corners cut
S.dressBays('lantern', n0);
S.chamfer([3, 21, 11, 28], 'nw ne sw se', 2); S.chamfer([6, 10, 11, 14], 'nw ne sw se', 1);
console.log('C1E2M06 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

const layers = L.layers();

const MAP = {
  id: 'C1E2M06', name: 'Pump Cathedral', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { fog: '#3a4a4a', fogDensity: 0.01, sky: 'overcast', look: 'pump' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'PUMP CATHEDRAL', lines: ['They built a church for a pump.', 'It has been drawing something up out of the sea.'] },
  outro: 'Next: the Slurry Undercroft. Whatever they drained comes out down there.',
  objective: 'Cross the nave to the cage lift, east side. The catwalks are the only way up',
  ...layers,
  secrets: [{ id: 'engineers-office', panel: [12, 12], cells: [[11, 12], [10, 12], [9, 12]] }],
  sectors: [{ id: 'cage', cells: cage, low: 0, high: 4, speed: 1.2, start: 'low' }],
  entities: [
    { type: 'exit', at: [29, 8], locked: true, dest: 'next' },
    { type: 'switch', id: 'cage-up', at: [50, 24], wall: 'north', once: false, do: [{ sector: { id: 'cage', to: 'high' } }, { objective: 'Riding up. Bellhands on both galleries: use the pillars' }] },
    { type: 'switch', id: 'cage-call', at: [48, 24], wall: 'north', once: false, do: [{ sector: { id: 'cage', to: 'low' } }] },
    { type: 'switch', id: 'drain', at: [35, 43], wall: 'south', do: [{ exit: { set: 'unlock' } }, { objective: 'The sump is draining. The exit is on the north gallery, west end' }, { shake: 2 }, { message: 'draining' }] },
  ],
  messages: [
    { id: 'start', at: [5, 24], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Pump Cathedral. The pump that drains the pans is in the middle of the nave. The cage on the east side is the only way up to the catwalks. Cross the floor first.' },
    { id: 'nave', at: [14, 24], radius: 3, speaker: 'INES', text: 'This is not a pump house. This is a church for the pump. Look at the height of it, and at what is hung from the roof.' },
    { id: 'sump', at: [26, 24], radius: 3, speaker: 'INES', text: 'The water round the pump is up to your knees. It will slow you. Keep to the grate and the aisles.' },
    { id: 'cage', at: [47, 25], radius: 3, speaker: 'CAGE PLACARD', text: 'CAGE LIFT. LEVER ON THE CAGE RISES IT, CALL LEVER ON THE POST BRINGS IT DOWN. FOUR METRES. NO MORE THAN SIX PERSONS.' },
    { id: 'top', at: [54, 25], radius: 4, speaker: 'INES', text: 'Bellhands on both galleries. Stay off the edge of the catwalk, and use the pillars. The drain lever is on the south gallery.' },
    { id: 'drain', at: [35, 42], radius: 3, speaker: 'DRAIN LEVER', text: 'SUMP DRAIN. PULL AND THE PUMP RUNS DRY, AND THE HATCH ON THE NORTH GALLERY OPENS. DO NOT PULL WITH PERSONS IN THE SUMP.' },
    { id: 'draining', at: [35, 41], radius: 0.1, speaker: 'SIGNAL HOUSE', text: 'The pump has stopped. What was in the sump is on the grate now. Get to the north gallery.' },
    { id: 'exit', at: [30, 8], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'The hatch leads under the Works: the Slurry Undercroft. It is dark down there, and it is where everything drains to.' },
  ],
  triggers: [
    { id: 'cage-top', when: 'sector:cage:high', do: [{ spawn: { kind: 'gaunt', at: [55, 17], group: 'catwalk', facing: 'south' } }, { spawn: { kind: 'gaunt', at: [55, 33], group: 'catwalk', facing: 'north' } }, { shake: 0.8 }, { objective: 'The drain lever is on the south gallery: south terrace, then the stair' }] },
  ],
  quality: { enemies: [38, 64], botSeconds: [60, 600], mechanics: ['heights', 'switches', 'sectors', 'triggers', 'hazards'], skins: 5, enemyKinds: { bellhand: 6 },
    scaleClass: 'COMPRESSION', tallReason: 'the nave is the episode\'s one named cathedral hall: 13 m to the roof so the catwalks and galleries have air above them',
    introduces: 'the vertical route: a cage lift is the only way up, and the exit is two climbs away (south gallery lever, north gallery hatch) under Bellhand fire from both galleries; and the Charge-arc lamp, waiting on the landing where the cage stops' },
};

// bolt boxes for the Harpoon rifle (PT-010): ON the lane the route walks. They are appended AFTER every other entity so no other entity's id shifts (an id shift changes what the chaotic bot does)
MAP.entities ??= []; MAP.entities.push(...[[46,23],[54,24],[55,29]].map(([x, z]) => ({ type: 'pickup', kind: 'ammo_bolt', at: [x, z] })));
// the Charge-arc lamp and its cells (owner go 2026-10-06), ON the lane, appended last so no other entity's id shifts
MAP.entities.push(...[["weapon_arc",54,25],["ammo_cell",54,28],["ammo_cell",54,39],["ammo_cell",42,41]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
// PT-021: the props set down in the new bays (after every other entity: no id shifts)
MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
// ---- PT-021 marks and growth (render-only data, validated by mapformat: what the place has been through, and where the Vael's growth started) ----
MAP.decals = [{ kind: 'ichorpool', at: [20, 25], size: 1.4 }, { kind: 'bloodpool', at: [16, 24], size: 1.2 }, { kind: 'smear', at: [54, 14], rot: 1.5708, size: 2.4, h: 1.0 }, { kind: 'damp', at: [45, 25], size: 1.6 }];
MAP.growth = [{ at: [31, 25], r: 22, power: 0.9 }];                                                                                                                                                          // from the great pump: what the Works drains is growing in its housings
// ---- end PT-021 marks and growth ----

// ---- PT-023 (owner, 2026-10-08: "update all the maps"): ammunition for the carbine (rounds) and the line-thrower (rockets); movable props for the tuning-fork ----
// Every pickup is ON the lane the routes walk (tools/dev/place-near.mjs) and every movable prop OFF the traffic of every route, all appended after every other entity so no id shifts and no route moves.
MAP.entities ??= [];
MAP.entities.push(...[['ammo_round', 24, 25], ['ammo_round', 47, 23], ['ammo_round', 43, 41], ['ammo_round', 54, 14], ['ammo_rocket', 45, 22], ['ammo_rocket', 48, 41]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
MAP.entities.push(...[['crate', 15, 27], ['barrel', 34, 16], ['crate', 51, 44], ['barrel', 19, 33], ['crate', 22, 11], ['sack', 35, 37], ['sack', 39, 13]].map(([kind, x, z]) => ({ type: 'prop', kind, at: [x, z], movable: true })));
// ---- end PT-023 ----

export default MAP;
