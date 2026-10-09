// C1E2M03 RAIL YARD: moving-train route puzzle under fire. Bodies shipped inland by rail.
// Scale class MIXED (design/CAMPAIGN_SPINE.md): a roofed marshalling shed (two consists of wagons, three aisles), an open throat behind it, a roofed dock. The new idea is SHUNTING: the shed's east end is closed by a train
// whose three wagons are moving floors raised as walls; each of three levers (one per aisle) lowers ONE wagon to a flat bed and wakes the throat beyond it. Every way east has its own fire: the north and south aisles come out
// beside a tower each, the centre aisle comes out on the road between them. A fourth lever, in the signal box on the road, rolls up the dock gate; the Warden-Graft and its guard wait in the dock.
// Route: the signal cabin (spawn) -> the shed (a gang asleep 11 m from the cabin door) -> a lever -> its wagon drops -> the throat (Tollbearers, Gaunts, a Bellhand on each tower) -> the signal box -> the dock -> the exit.
// Optional: a SECRET tool locker behind a loose panel in the north wall of the shed.
// Open air vs roof (PT-007/PT-008): the shed, cabin, signal box, dock and the locker are roofed (floor skins `f q`); the throat is open (`l s b`).
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(84, 40);

// ---- the throat (open air): salt crust, a slate road to the signal box, two tracks; its ring wall is the shed's east wall and the dock's west wall -----------------------
L.room([42, 4, 60, 36], { floor: 'l', wall: 'L' });
L.rect([42, 19, 50, 21], 's');
L.rect([42, 14, 60, 14], 'b'); L.rect([42, 26, 60, 26], 'b');

// ---- the marshalling shed (roofed): shell 'K', three aisles, two consists of solid wagons with couplings between them -------------------------------------------------
L.rect([10, 5, 41, 29], 'K'); L.rect([11, 6, 38, 28], 'f');
for (const z of [8, 17, 26]) L.rect([11, z, 38, z], 'q');                                         // a track down each aisle
for (const [z0, z1] of [[10, 12], [22, 24]]) { L.rect([13, z0, 37, z1], 'K'); for (const gx of [20, 29]) L.rect([gx, z0, gx + 1, z1], 'f'); }    // the consists (solid) and their coupling gaps (open)
// the train across the east end: three wagons, each a moving floor (raised 4 m = a wall; lowered 0.5 m = a flat bed you walk over)
const wagon = (z0, z1) => { const cells = []; for (let z = z0; z <= z1; z++) for (let x = 39; x <= 41; x++) { L.rect([x, z, x, z], 'p'); L.height([x, z, x, z], 1); cells.push([x, z]); } return cells; };
const wn = wagon(6, 9), wc = wagon(13, 21), ws = wagon(25, 28);

// ---- the signal cabin (arrival) ---------------------------------------------------------------------------------------------------------------------------------------
L.room([3, 16, 9, 22], { floor: 'f', wall: 'K' }); L.door(10, 19);

// ---- the tool locker (secret) behind the shed's north wall -----------------------------------------------------------------------------------------------------------
L.room([24, 2, 28, 4], { floor: 'f', wall: 'K' }); L.secretPanel(26, 5);

// ---- the towers (3 m platforms with a stair each), the derelict wagons that cut the throat's sightlines, the signal box ---------------------------------------------------
L.height([54, 5, 58, 8], 6); L.stairs([48, 6, 53, 7], 'x', 1, 6);
L.height([54, 32, 58, 35], 6); L.stairs([48, 33, 53, 34], 'x', 1, 6);
L.rect([45, 9, 48, 11], 'K'); L.rect([45, 29, 48, 31], 'K'); L.rect([46, 15, 49, 17], 'K'); L.rect([46, 23, 49, 25], 'K');
L.rect([51, 16, 57, 24], 'K'); L.rect([52, 17, 56, 23], 'f'); L.door(51, 20);

// ---- the dock (roofed): the gate in its west wall is rolled up by the signal box lever; the exit at its east end ---------------------------------------------------------------
L.rect([61, 10, 77, 30], 'L'); L.rect([62, 11, 76, 29], 'f'); L.door(61, 20, { remote: true });

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 19, '@'); L.put(75, 20, '>');
// the cabin: a table, a shelf, lamps, a little ammunition
L.putAll('f', [[4, 17], [4, 21]]); L.put(3, 19, 'F'); L.putAll('m', [[6, 17], [6, 21]]); L.putAll('e', [[8, 18], [8, 20]]); L.putAll('r', [[3, 17], [3, 21]]); L.put(7, 19, 'h');
// the shed: the gang in the centre aisle, one in each side aisle; columns, the cradle rail overhead (machinery), lamps; ammunition on the aisles
L.putAll('t', [[16, 15], [16, 19], [24, 15], [24, 19], [32, 15], [32, 19]]); L.putAll('g', [[19, 17], [27, 17]]);
L.putAll('t', [[20, 8], [34, 8]]); L.put(28, 7, 'g'); L.putAll('t', [[22, 27], [35, 27]]); L.put(30, 26, 'g');
L.putAll('P', [[18, 14], [18, 20], [26, 14], [26, 20], [34, 14], [34, 20]]); L.putAll('m', [[12, 14], [12, 20], [22, 14], [22, 20], [30, 14], [30, 20]]);
L.putAll('O', [[13, 14], [23, 14], [33, 14]]); L.putAll('D', [[13, 20], [23, 20], [33, 20]]);
L.putAll('C', [[15, 7], [25, 9], [16, 28], [29, 28]]); L.putAll('o', [[13, 8], [33, 9], [13, 26], [37, 27]]);
L.putAll('r', [[13, 15], [20, 16], [29, 18], [36, 19], [14, 8], [26, 8], [14, 26], [27, 26]]); L.putAll('e', [[21, 18], [28, 16], [35, 16], [18, 8], [31, 27]]); L.putAll('a', [[29, 16], [22, 19], [37, 18]]);
L.putAll('h', [[23, 16], [31, 17], [31, 8], [33, 26]]); L.putAll('H', [[35, 17], [12, 17]]);
// the throat: the garrison (idle until a wagon drops), blocks, lampposts, ammunition on the road and both flanks
L.putAll('t', [[45, 7], [46, 13], [44, 20], [46, 27], [45, 33], [52, 12], [52, 28], [58, 14], [58, 26]]); L.putAll('g', [[51, 14], [51, 26]]); L.putAll('b', [[56, 6], [56, 34]]);
L.putAll('j', [[43, 17], [43, 23], [58, 9], [58, 31]]); L.putAll('P', [[44, 15], [44, 25], [51, 9], [51, 31]]); L.putAll('o', [[43, 8], [43, 32], [50, 13], [50, 27]]);
L.putAll('r', [[43, 18], [44, 6], [44, 34], [47, 20], [49, 20], [43, 22]]); L.putAll('e', [[43, 20], [46, 6], [46, 34], [48, 19], [48, 21], [50, 20]]); L.putAll('a', [[44, 12], [44, 28], [45, 21]]);
L.putAll('h', [[45, 19], [47, 6], [47, 34], [44, 8]]); L.putAll('H', [[50, 19], [50, 21], [59, 20]]); L.putAll('e', [[59, 19], [59, 21]]); L.putAll('r', [[59, 18], [59, 22]]);
// the signal box: two sleepers, the lever on its east wall; a lamp
L.putAll('t', [[53, 18], [53, 22]]); L.put(54, 20, 'n'); L.put(55, 18, 'e'); L.put(55, 22, 'r');
// the dock: the Warden-Graft and its guard (idle until the gate rolls up); a pillar on its charge lane, columns; the cradle rail and pods overhead
L.put(72, 20, 'w'); L.putAll('t', [[66, 14], [66, 26], [69, 17], [69, 23]]); L.putAll('g', [[64, 17], [64, 23]]);
L.putAll('P', [[66, 17], [66, 23], [70, 15], [70, 25], [68, 20], [65, 20]]); L.putAll('O', [[64, 12], [70, 12], [64, 28], [70, 28]]); L.putAll('D', [[63, 15], [63, 25], [74, 14], [74, 26]]);
L.putAll('H', [[63, 12], [63, 28]]); L.putAll('e', [[64, 20], [65, 14]]); L.putAll('r', [[65, 26], [66, 20]]); L.putAll('h', [[62, 22], [62, 18]]);
// the locker: the foreman's cache
L.put(25, 3, 'v'); L.put(27, 3, 'H'); L.put(26, 2, 'e'); L.put(25, 2, 'r'); L.put(27, 2, 'a');

// ---- PT-021, rooms that are not boxes (tools/mapkit/shape.mjs: only floor is added and corners are cut, away from every object and the routes' lane; props go into the new bays) ----
const S = new Shape(L, { lane: laneOf('C1E2M03'), keep: [[12, 5], [36, 12], [12, 29], [57, 20]] });                          // the four levers' walls stay
S.bays('n', 5, 12, 37, { w: 3, gap: 3, d: 1 }); S.bays('s', 29, 13, 37, { w: 3, gap: 3, d: 1 }); S.bays('w', 10, 7, 14, { w: 3, gap: 3, d: 1 }); S.bays('w', 10, 24, 27, { w: 3, gap: 3, d: 1 });   // the shed's end bays
const d0 = S.bayLog.length;
S.hall([62, 11, 76, 29], { sides: { n: { w: 3, gap: 3, d: 1 }, s: { w: 3, gap: 3, d: 1 } }, cut: 2 }); S.dressBays('crate2', d0);   // the dock
S.chamfer([3, 16, 9, 22], 'nw ne sw se', 1);
console.log('C1E2M03 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

const layers = L.layers();

const MAP = {
  id: 'C1E2M03', name: 'Rail Yard', version: 1, ceilingHeight: 4.2, par: { time: 400 },
  atmosphere: { fog: '#a0a094', fogDensity: 0.008, sky: 'bleach', look: 'salt' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'RAIL YARD', lines: ['The line ends here, at the Works.', 'Everything that came down it was shipped inland on purpose.'] },
  outro: 'Next: Kiln Row. The smoke over the roofs is not weather.',
  objective: 'A train is parked across the shed. A lever in an aisle lowers one wagon: find one',
  ...layers,
  secrets: [{ id: 'tool-locker', panel: [26, 5], cells: [[26, 4], [26, 3], [26, 2]] }],
  groups: [{ name: 'throat', rect: [42, 4, 60, 36] }, { name: 'dock', rect: [62, 11, 68, 29] }],
  sectors: [
    { id: 'wn', cells: wn, low: 0.5, high: 4, speed: 3, start: 'high' },
    { id: 'wc', cells: wc, low: 0.5, high: 4, speed: 3, start: 'high' },
    { id: 'ws', cells: ws, low: 0.5, high: 4, speed: 3, start: 'high' },
  ],
  entities: [
    { type: 'switch', id: 'lever-n', at: [12, 6], wall: 'north', do: [{ sector: { id: 'wn', to: 'low' } }, { wake: 'throat' }, { objective: 'The north wagon is down. The signal box is dead ahead, east' }, { shake: 1.5 }] },
    { type: 'switch', id: 'lever-c', at: [36, 13], wall: 'north', do: [{ sector: { id: 'wc', to: 'low' } }, { wake: 'throat' }, { objective: 'The centre wagon is down. Both towers see this road. Box ahead' }, { shake: 1.5 }] },
    { type: 'switch', id: 'lever-s', at: [12, 28], wall: 'south', do: [{ sector: { id: 'ws', to: 'low' } }, { wake: 'throat' }, { objective: 'The south wagon is down. The signal box is dead ahead, east' }, { shake: 1.5 }] },
    { type: 'switch', id: 'tower', at: [56, 20], wall: 'east', do: [{ open: [61, 20] }, { wake: 'dock' }, { objective: 'The dock gate is rolling up and the dock is awake: use a pillar' }, { shake: 2 }] },
  ],
  messages: [
    { id: 'start', at: [5, 19], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Rail Yard. The trains here shipped the grafted inland. A consist is parked across the shed, three wagons wide, and each wagon has its own lever.' },
    { id: 'shed', at: [12, 19], radius: 3, speaker: 'INES', text: 'Wagons end to end down both sides, and a gang asleep between them. The levers are at the ends of the aisles. Pull one and the way east opens, and so does whatever is waiting there.' },
    { id: 'lever', at: [36, 14], radius: 4, speaker: 'LEVER PLACARD', text: 'SHUNTING LEVER. ONE WAGON AT A TIME. THE LOCOMOTIVE WILL NOT MOVE ON ITS OWN. STAND CLEAR OF THE BED WHEN IT DROPS.' },
    { id: 'locker', at: [26, 3], radius: 2.5, speaker: 'TOOL LOCKER', text: 'FOREMAN: SPARE FUSES, SPARE AMMUNITION, THE GOOD GLOVES. THE PANEL STICKS. KICK IT.' },
    { id: 'throat', at: [44, 20], radius: 4, speaker: 'INES', text: 'A tower on each side and a road between them. Bellhands up there. Put the derelict wagons between you and them and move.' },
    { id: 'box', at: [53, 20], radius: 3, speaker: 'SIGNAL BOX', text: 'DOCK GATE: BY THE LEVER ON THE EAST WALL ONLY. NO TRAIN LEAVES THE DOCK UNTIL THE GATE IS RAISED.' },
    { id: 'dock', at: [63, 20], radius: 3, speaker: 'INES', text: 'Plate. The Warden-Graft again, and cradles all the way down the rail. Let it run into a pillar.' },
    { id: 'exit', at: [73, 20], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'The rail ends in Kiln Row. After this, the heat. Everything past that door is cooking something.' },
  ],
  quality: { enemies: [30, 56], botSeconds: [40, 600], mechanics: ['heights', 'switches', 'sectors', 'secret'], skins: 6, enemyKinds: { wardengraft: 1, bellhand: 2 },
    scaleClass: 'MIXED', introduces: 'shunting: three wagons that are moving floors, raised as walls across the shed and lowered one at a time by levers; every way east has its own threat' },
};

// bolt boxes for the Harpoon rifle (PT-010): ON the lane the route walks. They are appended AFTER every other entity so no other entity's id shifts (an id shift changes what the chaotic bot does)
MAP.entities ??= []; MAP.entities.push(...[[37,13],[50,24]].map(([x, z]) => ({ type: 'pickup', kind: 'ammo_bolt', at: [x, z] })));
// PT-021: the props set down in the new bays (after every other entity: no id shifts)
MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
// ---- PT-021 marks and growth (render-only data, validated by mapformat: what the place has been through, and where the Vael's growth started) ----
MAP.decals = [{ kind: 'bloodpool', at: [44, 20], size: 1.3 }, { kind: 'smear', at: [46, 20], rot: 0, size: 2.6, h: 1.0 }, { kind: 'soot', at: [64, 11], wall: 'north', y: 1.6, size: 1.6 }, { kind: 'bloodpool', at: [6, 19], size: 1.2 }];
// ---- end PT-021 marks and growth ----

// ---- PT-023 (owner, 2026-10-08: "update all the maps"): found here: the Shipwright's chainsaw, in the tool locker (the secret); ammunition for the carbine (rounds) and the line-thrower (rockets) ----
// Every pickup is ON the lane the routes walk (tools/dev/place-near.mjs) and every movable prop OFF the traffic of every route, all appended after every other entity so no id shifts and no route moves.
MAP.entities ??= [];
MAP.entities.push(...[['weapon_chainsaw', 26, 3], ['ammo_round', 23, 17], ['ammo_round', 42, 18], ['ammo_round', 51, 25], ['ammo_round', 63, 23], ['ammo_rocket', 38, 13], ['ammo_rocket', 60, 20]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
(MAP.messages ??= []).push({ id: 'found-chainsaw', at: [26, 3], radius: 1.5, speaker: 'TOOL LOCKER', text: 'A shipwright\'s chainsaw, oiled and wrapped. It runs and runs, and it is loud; hold it on plate or bell and it stalls.' });
MAP.quality.introduces += '; also found here: the Shipwright\'s chainsaw, in the tool locker (the secret)';
// ---- end PT-023 ----

export default MAP;
