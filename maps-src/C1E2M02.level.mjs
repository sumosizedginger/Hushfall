// C1E2M02 EVAPORATION PANS: open salt flats with hazard channels. Hunting parties working the pans.
// Scale class SET-PIECE (design/CAMPAIGN_SPINE.md): the one open crossing of Episode 2, never the opener. Its reason is a CROSSING UNDER PURSUIT: the cradles in the dispatch hut let a hunting party go behind you at the
// first causeway, so the open ground has a job (keep moving, heap to heap) and the brine channels cut it into three pans that are crossed on planks (or waded: they slow and burn).
// Route: the dispatch hut (empty cradles, ropes still swinging) -> out onto the west pan (a gang asleep 10 m from the door) -> the first causeway (the party is released behind you) -> the middle pan (two more gangs, two Bellhands
//        on the flanks) -> the PUMP STATION (the valve wheel opens the east cradle hall and unlocks the exit; a secret cistern behind its east wall) -> the second causeway -> the east pan -> the cradle hall (what the valve woke) -> the hatch.
// Open air vs roof (PT-007/PT-008): the floor skins `l m s p` are outdoor and get no ceiling; the hut, the station, the cistern and the hall are `. f` and are roofed. About a tenth of the map is roofed, on purpose.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(84, 52);

// ---- the pans (open air) and their ring wall; the road; the two brine channels with their planked causeways ---------------------------
L.room([10, 5, 71, 46], { floor: 'l', wall: 'L' });                                           // the whole flat: x 10..71, z 5..46
L.rect([10, 24, 34, 26], 's'); L.rect([46, 24, 61, 26], 's');                                  // the road: slate flags, west of the station and east of it
L.rect([24, 5, 28, 46], 'm'); L.fx([24, 5, 28, 46], 'x');                                      // channel 1 (toxic brine: slows, burns)
L.rect([52, 5, 56, 46], 'm'); L.fx([52, 5, 56, 46], 'x');                                      // channel 2
for (const z of [[9, 10], [24, 26], [41, 42]]) { L.rect([24, z[0], 28, z[1]], 'p'); L.fx([24, z[0], 28, z[1]], '.'); }   // channel 1: three plank causeways (an OUTDOOR floor: the grate would grow a ceiling slab, PT-007)
for (const z of [[24, 26], [41, 42]]) { L.rect([52, z[0], 56, z[1]], 'p'); L.fx([52, z[0], 56, z[1]], '.'); }            // channel 2: two

// ---- the dispatch hut (roofed): the first room; its door opens onto the west pan --------------------------------------------------------
L.room([2, 21, 8, 29], { floor: '.', wall: 'K' }); L.door(9, 25);

// ---- the pump station (middle pan, roofed) and the cistern behind its east wall (secret) ------------------------------------------------
L.rect([35, 20, 45, 30], 'K'); L.rect([36, 21, 44, 29], 'f'); L.door(35, 25); L.door(45, 25);
L.rect([45, 19, 50, 24], 'K'); L.rect([46, 20, 49, 23], 'f'); L.secretPanel(45, 22);

// ---- the cradle hall (east pan, roofed) with the hatch at its east end; its door is rolled up by the valve ----------------------------------
L.rect([62, 19, 71, 31], 'L'); L.rect([63, 20, 70, 30], 'f'); L.door(62, 25, { remote: true });

// ---- objects -------------------------------------------------------------------------------------------------------------------------------
L.put(3, 25, '@');
// the hut: empty cradles on the rail, ropes, pods against the wall, lamps, a little ammunition. The party that is released later is made here
L.putAll('O', [[4, 22], [4, 28]]); L.putAll('D', [[7, 22], [7, 28]]); L.putAll('d', [[5, 23], [5, 27]]); L.putAll('m', [[5, 22], [5, 28]]);
L.putAll('e', [[3, 23], [3, 27]]); L.putAll('r', [[2, 22], [2, 28]]); L.put(8, 22, 'h');

// the west pan: a gang asleep 10 m from the door, two more further out; heaps, carts and pillars to break the long lines; ammunition along the road
L.putAll('t', [[13, 22], [13, 28]]); L.put(16, 25, 'g');
L.putAll('t', [[14, 11], [17, 13], [22, 12]]); L.put(20, 10, 'g');
L.putAll('t', [[14, 39], [17, 37], [22, 38]]); L.put(20, 40, 'g');
L.putAll('t', [[19, 18], [19, 32]]); L.putAll('g', [[22, 19], [22, 31]]);                       // the road gangs: seven cells off the lane, they wake as you pass
L.putAll('C', [[12, 19], [12, 31], [16, 20], [16, 30], [20, 19], [20, 31], [14, 15], [14, 35], [18, 8], [18, 42], [22, 16], [22, 34]]);
L.putAll('y', [[13, 19], [13, 31], [17, 20], [17, 30], [21, 19], [21, 31]]); L.putAll('z', [[11, 16], [11, 34], [19, 13], [19, 37]]);
L.putAll('o', [[15, 22], [15, 28], [21, 23], [21, 27]]); L.putAll('P', [[18, 22], [18, 28]]); L.putAll('j', [[12, 23], [12, 27], [20, 23], [20, 27]]);
L.putAll('e', [[11, 23], [18, 27], [21, 22], [12, 12], [12, 38]]); L.putAll('r', [[12, 26], [19, 23], [22, 26], [16, 11], [16, 40]]); L.putAll('a', [[15, 27], [21, 28], [13, 9], [13, 41]]);
L.putAll('h', [[12, 22], [19, 28], [22, 23], [20, 12], [19, 38]]); L.put(23, 25, 'H');
L.putAll('r', [[14, 25], [22, 25]]); L.putAll('e', [[18, 25], [11, 25]]); L.put(20, 25, 'a'); L.put(25, 25, 'h');            // on the road itself: the first approach should find its ammunition ON the route

// the middle pan: the guard on the station road, two gangs with a Bellhand each on the flank, heaps; the station's own sleeper
L.putAll('t', [[32, 22], [32, 28], [33, 19], [33, 31]]); L.put(30, 25, 'g');
L.putAll('t', [[33, 11], [37, 9]]); L.put(41, 12, 'g');                                          // far north: optional work party
L.putAll('t', [[33, 39], [37, 41]]); L.put(41, 40, 'g');                                         // far south: optional work party
L.putAll('t', [[38, 18], [42, 18]]); L.put(46, 17, 'b'); L.putAll('t', [[38, 32], [42, 32]]); L.put(46, 33, 'b');   // the flank gangs and their Bellhands, either side of the station
L.putAll('P', [[31, 17], [31, 33], [35, 16], [35, 34], [39, 17], [39, 33], [43, 15], [43, 35], [48, 16], [48, 34]]);
L.putAll('C', [[32, 18], [32, 32], [36, 15], [36, 35], [40, 16], [40, 34], [44, 16], [44, 34]]); L.putAll('y', [[33, 18], [33, 32], [37, 15], [37, 35]]);
L.putAll('z', [[29, 12], [29, 38], [49, 12], [49, 38]]); L.putAll('o', [[34, 20], [34, 30], [45, 32], [51, 33]]); L.rect([46, 28, 50, 31], 'K'); L.putAll('j', [[30, 23], [30, 27], [48, 27]]);       // the tank is a solid settling tank south of the road: it keeps the south Bellhand off the east causeway
L.putAll('e', [[31, 24], [33, 26], [47, 26], [49, 26], [35, 12], [35, 38]]); L.putAll('r', [[30, 26], [32, 24], [48, 26], [39, 13], [39, 39]]); L.putAll('a', [[33, 23], [34, 28], [45, 13], [45, 39]]);
L.putAll('h', [[31, 28], [33, 22], [42, 12], [43, 38]]); L.put(50, 26, 'H');
L.putAll('e', [[31, 25], [47, 25]]); L.putAll('r', [[32, 25], [49, 25]]); L.put(34, 25, 'H'); L.put(51, 25, 'a'); L.put(29, 25, 'h');     // on the road (both sides of the station)
// inside the station: the pump machinery (cradles and pods on the line), lanterns, a cache; the valve wheel is on the north wall at (40, 21)
L.put(40, 27, 't'); L.putAll('O', [[38, 22], [42, 22]]); L.putAll('D', [[38, 28], [42, 28]]); L.putAll('n', [[38, 23], [42, 27]]);
// the harpoon rifle (weapon 4) hangs on the foreman's hook by the lane, and the valve wheel is on this same wall: nobody gets the valve without walking past it. Out of the east door there is a Bellhand on each flank at sixteen metres, which is what it is for
L.put(38, 25, 'X');
L.put(37, 28, 'H'); L.put(43, 22, 'e'); L.put(36, 28, 'r'); L.put(44, 28, 'a'); L.put(37, 25, 'e'); L.put(39, 25, 'r'); L.put(41, 25, 'h'); L.put(43, 25, 'a');
// the cistern (secret): the foreman's own supplies
L.put(47, 21, 'v'); L.put(48, 21, 'H'); L.put(47, 23, 'e'); L.put(48, 23, 'r'); L.put(46, 21, 'a'); L.putAll('F', [[49, 20], [49, 23]]); L.put(46, 23, 'y'); L.put(49, 22, 'o');

// the east pan: two more gangs, a Bellhand on the south side; heaps; ammunition before the hall
L.putAll('t', [[60, 11], [63, 9], [69, 10]]); L.put(66, 12, 'g');
L.putAll('t', [[60, 39], [64, 41], [69, 42]]); L.put(67, 38, 'g');
L.putAll('g', [[60, 17], [60, 33]]); L.put(60, 20, 't'); L.putAll('b', [[67, 17], [67, 33]]);                                  // the east road gang, with a Bellhand each side of the hall (far back: nothing that shoots covers the causeway)
L.putAll('P', [[59, 22], [59, 28]]);                                                                     // screens at the foot of the causeway: step out of the brine behind them
L.putAll('C', [[58, 15], [58, 35], [61, 14], [61, 36], [64, 15], [64, 37], [67, 16], [67, 35]]); L.putAll('P', [[59, 18], [59, 32], [65, 16]]);
L.putAll('y', [[59, 15], [59, 35]]); L.putAll('z', [[58, 12], [58, 38]]); L.putAll('o', [[61, 21], [61, 29], [58, 28], [58, 21]]); L.putAll('j', [[58, 23], [58, 27]]);
L.putAll('e', [[58, 24], [58, 26], [62, 12], [62, 38]]); L.putAll('r', [[59, 24], [59, 26], [65, 10], [66, 40]]); L.putAll('a', [[60, 24], [60, 13], [63, 36]]);
L.putAll('h', [[60, 26], [67, 13], [68, 37]]); L.put(61, 23, 'H');
L.putAll('e', [[58, 25], [57, 25]]); L.put(60, 25, 'r'); L.put(59, 25, 'a'); L.put(57, 26, 'H');                                      // on the east road, before the hall
// the cradle hall: what the valve wakes (a group), the rail overhead, pods on the floor
L.putAll('t', [[65, 22], [65, 28], [69, 29], [65, 24], [65, 26]]); L.putAll('g', [[67, 23], [67, 27]]);
L.putAll('O', [[64, 21], [64, 29], [68, 21], [68, 29]]); L.putAll('D', [[66, 21], [66, 29], [70, 21], [70, 29]]); L.put(66, 22, 'n');
L.putAll('H', [[63, 22], [63, 28]]); L.putAll('e', [[64, 23], [64, 27], [64, 25]]); L.put(65, 25, 'r');

const layers = L.layers();

const MAP = {
  id: 'C1E2M02', name: 'Evaporation Pans', version: 1, ceilingHeight: 4.2, par: { time: 360 },                      // par: still a placeholder until the owner sets it from their clear times
  atmosphere: { fog: '#b4b2a4', fogDensity: 0.0055, sky: 'bleach', look: 'salt' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'EVAPORATION PANS', lines: ['White ground to the horizon, and the horizon is working.', 'Nothing out here is hiding. That is the point.'] },
  outro: 'Next: the Rail Yard. The trains here do not stop for anyone.',
  objective: 'Cross the pans. The pump station in the middle is the only roof for a kilometre: get to it',
  ...layers,
  secrets: [{ id: 'cistern', panel: [45, 22], cells: [[46, 22], [47, 22], [48, 22]] }],
  groups: [{ name: 'cradlehall', rect: [63, 20, 70, 30] }],
  entities: [
    { type: 'exit', at: [70, 25], locked: true, dest: 'next' },
    { type: 'switch', id: 'pump', at: [40, 21], wall: 'north', do: [{ open: [62, 25] }, { wake: 'cradlehall' }, { exit: { set: 'unlock' } }, { objective: 'The east hall is rolling up and it is awake. The hatch is behind it' }, { shake: 2 }, { message: 'valve' }] },
  ],
  messages: [
    { id: 'start', at: [3, 25], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Evaporation Pans. White ground to the horizon and one roof in the middle: the pump station. Everything between us and it is working.' },
    { id: 'harpoon', at: [38, 25], radius: 2, speaker: 'INES', text: 'The foreman left a harpoon rifle on its hook. Hold aim and it zooms in a long way. The bolt goes through plate, and through the one behind it.' },
    { id: 'cradles', at: [4, 25], radius: 2.5, speaker: 'INES', text: 'Empty cradles, ropes still swinging. They hang their hunting parties here and let them go when somebody walks the pans.' },
    { id: 'pans', at: [12, 25], radius: 3, speaker: 'INES', text: 'Brine channels, five metres across, and they burn. Cross on the planks, or wade and pay for it. Keep the heaps between you and anything that stands up.' },
    { id: 'release', at: [26, 25], radius: 3, speaker: 'INES', text: 'Behind us. The cradles opened. They have your scent. Do not stop on the open ground.' },
    { id: 'station', at: [36, 25], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The pump station. The valve wheel is on the north wall: it feeds the east cradle hall, and the hatch is behind that hall.' },
    { id: 'pumplog', at: [40, 22], radius: 2.5, speaker: 'PUMP LOG', text: 'BRINE LINE B. THE VALVE OPENS THE EAST CRADLE HALL SLUICE AS WELL. KEEP CLEAR OF THE CRADLES WHEN RUNNING.' },
    { id: 'valve', at: [40, 24], radius: 0.1, speaker: 'INES', text: 'That is the hall rolling up. Whatever it hung up there has been waiting a long time for the pumps.' },
    { id: 'cistern', at: [47, 22], radius: 2.5, speaker: 'CISTERN LOG', text: 'RESERVE CISTERN. DRY SINCE THE SECOND FIRING. THE FOREMAN KEPT HIS OWN SUPPLIES HERE AND PAINTED THE DOOR OVER.' },
    { id: 'hall', at: [64, 25], radius: 2.5, speaker: 'INES', text: 'Rails of cradles, all the way down. The hatch is under the last one.' },
  ],
  triggers: [
    { id: 'rel-b', when: 'enter', at: [26, 10], radius: 3, do: [{ message: 'release' }] },
    { id: 'rel-c', when: 'enter', at: [26, 42], radius: 3, do: [{ message: 'release' }] },
    { id: 'station', when: 'enter', at: [40, 25], radius: 3, do: [{ message: 'release' }, { objective: 'The pump station. The valve wheel is on the north wall' }] },
    { id: 'hunt', when: 'msg:release', do: [
      { spawn: { kind: 'tollbearer', at: [6, 24], group: 'hunt', facing: 'east' } }, { spawn: { kind: 'tollbearer', at: [6, 26], group: 'hunt', facing: 'east' } }, { spawn: { kind: 'gaunt', at: [7, 25], group: 'hunt', facing: 'east' } },
      { spawn: { kind: 'gaunt', at: [6, 22], group: 'hunt', facing: 'east' } }, { spawn: { kind: 'tollbearer', at: [6, 28], group: 'hunt', facing: 'east' } },
      { open: [9, 25] }, { shake: 1.2 }, { objective: 'A hunting party is loose behind you. Keep moving: the pump station' }] },
  ],
  quality: { enemies: [40, 72], botSeconds: [40, 600], mechanics: ['switches', 'triggers', 'hazards', 'secret'], skins: 6, enemyKinds: { bellhand: 4 },
    scaleClass: 'SET-PIECE', reason: 'A crossing under pursuit: the pans are open on purpose. A hunting party is released behind you at the first causeway, so the open ground has a job (keep moving, heap to heap) and the brine channels cut it into pans crossed on planks.',
    introduces: 'the hunted crossing: a hunting party released behind you across open ground, and toxic brine channels that slow and burn (crossed on planks, or waded at a cost); and the Harpoon rifle, the long gun that the open ground asks for' },
};

// bolt boxes for the Harpoon rifle (PT-010): ON the lane the route walks. They are appended AFTER every other entity so no other entity's id shifts (an id shift changes what the chaotic bot does)
MAP.entities ??= []; MAP.entities.push(...[[44,25],[50,25],[61,25],[66,25]].map(([x, z]) => ({ type: 'pickup', kind: 'ammo_bolt', at: [x, z] })));
export default MAP;
