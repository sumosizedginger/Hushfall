// C1E2M07 SLURRY UNDERCROFT: dark close-quarters, light management. The Hush is thickest underground.
// Scale class COMPRESSION: every room is roofed and low (3.2 m). The new idea is LIGHT AS A SCHEDULE: the undercroft starts nearly dark; four breaker levers, one per zone, each (1) raises the light a stage,
// (2) rolls up the door to the next zone and (3) WAKES whatever lives there: the light is what draws them. So the player chooses when to throw each lever and what ammunition and health to carry through the door.
// Route: the pump gallery (spawn, three sleepers; breaker 1) -> the vat hall (wading slurry, vats as cover, cross-shaped dry lanes; breaker 2) -> the settling tanks (breaker 3; a SECRET drain room) -> the sump heart (breaker 4 unlocks the exit).
// Open air vs roof: everything is `v f` (roofed). Nothing is hung in the open.
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(68, 48);

// ---- zone 1: the pump gallery (arrival) -----------------------------------------------------------------------------------------------------------------------------------------
L.room([3, 18, 16, 26], { floor: 'f', wall: 'R' }); L.rect([8, 20, 11, 24], 'v'); L.door(17, 22, { remote: true });
// ---- zone 2: the vat hall: slurry floor, wading pools round four vats, two dry lanes crossing in the middle --------------------------------------------------------------------
L.room([18, 12, 34, 32], { floor: 'v', wall: 'R' }); L.fx([19, 13, 33, 31], 'w');
L.rect([18, 21, 34, 23], 'f'); L.rect([25, 12, 27, 32], 'f'); L.fx([18, 21, 34, 23], '.'); L.fx([25, 12, 27, 32], '.');
for (const r of [[20, 14, 23, 18], [29, 14, 32, 18], [20, 26, 23, 30], [29, 26, 32, 30]]) { L.rect(r, 'R'); L.fx(r, '.'); }
L.door(35, 22, { remote: true });
// ---- zone 3: the settling tanks: iron tanks to hide behind; a secret drain room under the south wall -------------------------------------------------------------------------
L.room([36, 14, 50, 30], { floor: 'f', wall: 'L' }); L.rect([38, 16, 49, 28], 'v');
for (const r of [[39, 17, 42, 20], [45, 17, 48, 20], [39, 24, 42, 27], [45, 24, 48, 27]]) L.rect(r, 'I');
L.rect([36, 21, 50, 23], 'f'); L.door(51, 22, { remote: true });
L.room([41, 32, 45, 35], { floor: 'f', wall: 'L' }); L.secretPanel(43, 31);
// ---- zone 4: the sump heart: the last room, the pods and cradles of the line --------------------------------------------------------------------------------------------------------
L.room([52, 16, 63, 28], { floor: 'f', wall: 'R' });

// ---- objects -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 22, '@');
// zone 1: a little light and a little ammunition; three sleepers; the first breaker on the north wall
L.putAll('n', [[6, 19], [6, 25]]); L.putAll('t', [[12, 20], [12, 24]]); L.put(14, 22, 'g'); L.putAll('e', [[4, 20], [4, 24]]); L.putAll('r', [[5, 19], [5, 25]]); L.putAll('h', [[7, 22], [15, 20]]); L.putAll('a', [[9, 19], [9, 25]]);
L.putAll('P', [[10, 21], [10, 23]]); L.putAll('o', [[14, 19], [14, 25]]);
// zone 2: the vat hall's occupants (asleep until breaker 1), pillars of vats, a lantern at the lane crossing; pickups on the dry lanes
L.putAll('t', [[22, 12], [31, 13], [22, 31], [31, 31], [27, 17], [27, 28]]); L.putAll('g', [[24, 19], [30, 20], [24, 25], [30, 25]]);
L.putAll('n', [[26, 22], [19, 22], [33, 22]]); L.putAll('e', [[20, 22], [32, 22], [26, 15], [26, 29]]); L.putAll('r', [[22, 22], [30, 22], [26, 19], [26, 25]]); L.putAll('a', [[28, 22], [26, 13], [26, 31]]); L.putAll('h', [[24, 22], [26, 17], [26, 27]]); L.putAll('H', [[33, 24], [19, 20]]);
L.putAll('O', [[21, 22], [31, 22]]); L.putAll('D', [[27, 22]]);
// zone 3: the tanks' occupants, Bellhands behind the iron; pickups on the dry lanes and the plinths
L.putAll('t', [[38, 22], [44, 18], [44, 26], [47, 22], [49, 16]]); L.putAll('g', [[40, 22], [43, 22], [46, 22]]); L.putAll('b', [[43, 15], [43, 29]]);
L.putAll('n', [[37, 22], [44, 22], [50, 22]]); L.putAll('e', [[37, 21], [37, 23], [44, 21], [44, 23], [49, 21]]); L.putAll('r', [[38, 21], [38, 23], [49, 23]]); L.putAll('a', [[40, 21], [40, 23], [47, 21]]); L.putAll('h', [[42, 22], [45, 22]]); L.putAll('H', [[37, 29], [37, 15]]);
// the drain room: the cache
L.put(42, 33, 'v'); L.put(44, 33, 'H'); L.put(42, 34, 'e'); L.put(44, 34, 'r'); L.put(43, 34, 'a');
// zone 4: the sump heart's occupants and machinery; a Bellhand in each far corner; the exit is locked
L.putAll('t', [[55, 20], [55, 24], [59, 19], [59, 25]]); L.putAll('g', [[57, 22], [61, 20]]); L.putAll('b', [[62, 17], [62, 27]]);
L.putAll('O', [[54, 18], [54, 26], [58, 17], [58, 27]]); L.putAll('D', [[56, 20], [56, 24], [60, 22], [61, 18], [61, 26]]); L.putAll('n', [[53, 22], [57, 18], [57, 26]]);
L.putAll('P', [[58, 21], [58, 23]]); L.putAll('H', [[53, 19], [53, 25]]); L.putAll('e', [[53, 20], [53, 24]]); L.putAll('r', [[54, 22], [60, 18]]); L.putAll('a', [[60, 26], [55, 22]]);

// ---- PT-021, rooms that are not boxes (tools/mapkit/shape.mjs: only floor is added and corners are cut, away from every object and the routes' lane; props go into the new bays) ----
const S = new Shape(L, { lane: laneOf('C1E2M07'), keep: [[15, 17], [33, 11], [49, 13], [57, 15]] });                         // the four breakers' walls stay
S.hall([3, 18, 16, 26], { sides: { n: { w: 3, gap: 2, d: 1 }, s: { w: 3, gap: 2, d: 1 } }, cut: 2 });                      // the pump gallery
S.hall([18, 12, 34, 32], { sides: { n: { w: 3, gap: 3, d: 1 }, s: { w: 3, gap: 3, d: 1 } }, cut: 3 });                     // the vat hall
S.hall([36, 14, 50, 30], { sides: { n: { w: 3, gap: 3, d: 1 }, s: { w: 3, gap: 3, d: 1 } }, cut: 2 });                     // the settling tanks
const s0 = S.bayLog.length;
S.hall([52, 16, 63, 28], { sides: { n: { w: 3, gap: 3, d: 2, heart: true }, s: { w: 3, gap: 3, d: 2, heart: true }, e: { w: 3, gap: 3, d: 2, heart: true } }, cut: 2 }); S.dressBays('cradle', s0);   // the sump heart: a cradle in each apse
console.log('C1E2M07 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

const layers = L.layers();

const MAP = {
  id: 'C1E2M07', name: 'Slurry Undercroft', version: 1, ceilingHeight: 3.2, par: { time: 480 },
  atmosphere: { fog: '#101c18', fogDensity: 0.03, sky: 'night', ambient: 0.3, look: 'pump' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'SLURRY UNDERCROFT', lines: ['Everything the Works drains ends up here.', 'It is very quiet. That is the Hush, and it is thick.'] },
  outro: 'Next: the Grafting Floor. The line that makes them, and what runs it.',
  objective: 'It is dark on purpose. Breaker one is on the north wall, east end: the light will wake the next hall',
  ...layers,
  secrets: [{ id: 'drain-room', panel: [43, 31], cells: [[43, 32], [43, 33], [43, 34]] }],
  groups: [{ name: 'z2', rect: [18, 12, 34, 32] }, { name: 'z3', rect: [36, 14, 50, 30] }, { name: 'z4', rect: [52, 16, 63, 28] }],
  entities: [
    { type: 'exit', at: [62, 22], locked: true, dest: 'next' },
    { type: 'switch', id: 'breaker-1', at: [15, 18], wall: 'north', do: [{ lights: 0.5 }, { open: [17, 22] }, { wake: 'z2' }, { objective: 'Breaker one is in. The vat hall is awake. Breaker two: north wall, east end' }, { shake: 1 }] },
    { type: 'switch', id: 'breaker-2', at: [33, 12], wall: 'north', do: [{ lights: 0.7 }, { open: [35, 22] }, { wake: 'z3' }, { objective: 'Breaker two is in. The tanks are awake. Breaker three: north wall, east end' }, { shake: 1 }] },
    { type: 'switch', id: 'breaker-3', at: [49, 14], wall: 'north', do: [{ lights: 0.85 }, { open: [51, 22] }, { wake: 'z4' }, { objective: 'Breaker three is in. The sump heart is awake. The last breaker is inside' }, { shake: 1.2 }] },
    { type: 'switch', id: 'breaker-4', at: [57, 16], wall: 'north', do: [{ lights: 1 }, { exit: { set: 'unlock' } }, { objective: 'All four breakers are in. The exit is at the east end' }, { shake: 2 }, { message: 'lit' }] },
  ],
  messages: [
    { id: 'start', at: [5, 22], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Slurry Undercroft. They cut the lights down here so nobody would see what drains in. Four breakers, one in each hall. Each one you throw wakes the hall ahead.' },
    { id: 'dark', at: [12, 22], radius: 3, speaker: 'INES', text: 'The lanterns are ours, and they will not carry far. Count your ammunition before you throw the breaker. You cannot turn the light back off.' },
    { id: 'vats', at: [26, 22], radius: 4, speaker: 'INES', text: 'Vats, and slurry up to the knee round them. Keep to the dry lanes: the cross in the middle.' },
    { id: 'tanks', at: [44, 22], radius: 4, speaker: 'INES', text: 'Bellhands behind the iron tanks. They hear you before they see you.' },
    { id: 'heart', at: [57, 22], radius: 4, speaker: 'SIGNAL HOUSE', text: 'The sump heart. Every pipe in the Works ends in that wall. The cradles are warm, Calder: this is where the line starts.' },
    { id: 'lit', at: [57, 18], radius: 0.1, speaker: 'INES', text: 'It is as bright as it gets. And that is the end of the dark: the hatch is open.' },
    { id: 'drain', at: [43, 34], radius: 2.5, speaker: 'WARDEN CALDER', text: 'Slurry drains do not drain only slurry. I hid a week of supplies here when I was a younger man, in case the Works went bad.' },
  ],
  quality: { enemies: [30, 56], botSeconds: [60, 600], mechanics: ['switches', 'hazards', 'secret'], skins: 5, enemyKinds: { bellhand: 4 },
    scaleClass: 'COMPRESSION', introduces: 'light as a schedule: the undercroft starts nearly dark; each of four breakers raises the light a stage, opens the next door and wakes what lives there' },
};

// bolt boxes for the Harpoon rifle (PT-010): ON the lane the route walks. They are appended AFTER every other entity so no other entity's id shifts (an id shift changes what the chaotic bot does)
MAP.entities ??= []; MAP.entities.push(...[[23,22],[49,20]].map(([x, z]) => ({ type: 'pickup', kind: 'ammo_bolt', at: [x, z] })));
// the Charge-arc lamp and its cells (owner go 2026-10-06), ON the lane, appended last so no other entity's id shifts
MAP.entities.push(...[["ammo_cell",27,16],["ammo_cell",34,22],["ammo_cell",49,19]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
// PT-021: the props set down in the new bays (after every other entity: no id shifts)
MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
// ---- PT-021 marks and growth (render-only data, validated by mapformat: what the place has been through, and where the Vael's growth started) ----
MAP.decals = [{ kind: 'ichorpool', at: [26, 22], size: 1.5 }, { kind: 'bloodpool', at: [10, 22], size: 1.2 }, { kind: 'ichor', at: [59, 16], wall: 'north', y: 1.6, size: 1.4 }, { kind: 'smear', at: [43, 22], rot: 0, size: 2.4, h: 0.9 }];
MAP.growth = [{ at: [57, 22], r: 26, power: 1.2 }];                                                                                                                                                          // the sump heart: the line's last room, and it has overflowed
// ---- end PT-021 marks and growth ----

// ---- PT-023 (owner, 2026-10-08: "update all the maps"): found here: the Shipwright's chainsaw again, on a rack at the pump gallery door (for the player who missed the Rail Yard's tool locker); ammunition for the carbine (rounds) and the line-thrower (rockets); movable props for the tuning-fork ----
// Every pickup is ON the lane the routes walk (tools/dev/place-near.mjs) and every movable prop OFF the traffic of every route, all appended after every other entity so no id shifts and no route moves.
MAP.entities ??= [];
MAP.entities.push(...[['weapon_chainsaw', 9, 22], ['ammo_round', 16, 22], ['ammo_round', 32, 12], ['ammo_round', 39, 22], ['ammo_round', 49, 22], ['ammo_rocket', 25, 22], ['ammo_rocket', 49, 15]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
MAP.entities.push(...[['crate', 15, 26], ['barrel', 34, 25], ['sack', 46, 13], ['crate', 49, 26], ['barrel', 58, 30]].map(([kind, x, z]) => ({ type: 'prop', kind, at: [x, z], movable: true })));
(MAP.messages ??= []).push({ id: 'found-chainsaw', at: [9, 22], radius: 1.5, speaker: 'PUMP GALLERY RACK', text: 'A saw rack by the pump gallery door: the Shipwright\'s chainsaw, for anyone who missed it. Close quarters, a long run, a hard stall.' });
MAP.quality.introduces += '; also found here: the Shipwright\'s chainsaw again, on a rack at the pump gallery door (for the player who missed the Rail Yard\'s tool locker)';
// ---- end PT-023 ----

export default MAP;
