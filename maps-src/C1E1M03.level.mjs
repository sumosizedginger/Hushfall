// C1E1M03 FISHMARKET ROWS: dense stalls, flanking pressure, sightline management. The town tried to flee and was herded here.
// New ideas: wall switches (two fish hoists run the auction shutters), Bellhand packs on a raised boardwalk, gutter water that slows you, spawn waves.
// Route: west gate -> stairs up to the boardwalk (three Bellhands) -> north hoist switch (a wave of Gaunts comes for you) -> back through the rows ->
//        south smokehouse (closets) -> south hoist switch -> the auction hall's two shutters -> exit.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(66, 48);

// ---- rooms -------------------------------------------------------------------------------------------------------------
L.room([3, 22, 6, 26], { floor: 's', wall: 'B' });                                          // the west gate lane
L.room([7, 11, 50, 40], { floor: ':', wall: 'B' });                                         // the market floor (open air)
L.room([51, 11, 54, 40], { floor: ':', wall: 'B' });                                        // the east lane, running south to the auction shutters
L.room([7, 8, 54, 10], { floor: 'p', wall: 'B' }); L.height([7, 8, 54, 10], 4);              // the boardwalk, 2 m up, running the width of the market
L.stairs([7, 11, 8, 15], 'z', 4, 0); L.stairs([52, 11, 53, 15], 'z', 4, 0);                    // west and east stairs down from the boardwalk (0.5 m steps); everywhere else the edge is a 2 m drop
L.rect([8, 17, 54, 18], 'm'); L.fx([8, 17, 54, 18], 'w'); L.rect([8, 29, 54, 30], 'm'); L.fx([8, 29, 54, 30], 'w');      // two gutters run the width of the market
L.room([8, 42, 20, 45], { floor: 'f', wall: 'W' }); L.door(14, 41);                          // the smokehouse
for (const z of [42, 44]) { L.room([22, z, 22, z], { floor: 'f', wall: 'W' }); L.closet(21, z); }          // smokehouse closets
L.room([56, 25, 56, 25], { floor: 'g', wall: 'I' }); L.door(55, 25, { remote: true }); L.door(57, 25, { remote: true });   // the two auction shutters
L.room([58, 22, 63, 28], { floor: 't', wall: 'T' }); L.height([61, 23, 61, 27], 1); L.height([62, 23, 63, 27], 2);           // the auction hall, and its stage (+1 m)

// ---- objects -------------------------------------------------------------------------------------------------------------
L.put(4, 24, '@');
// stall blocks in staggered rows (two stalls each)
const stalls = [];
for (const [ri, row] of [14, 20, 26, 32, 38].entries()) for (let i = 0; i < 7; i++) { const x0 = 12 + i * 6 + (ri % 2 ? 3 : 0); if (x0 + 1 > 49) continue; stalls.push([x0, row], [x0 + 1, row]); }
L.putAll('A', stalls);
// lanterns on iron posts, lamps
L.putAll('n', [[9, 16], [9, 22], [9, 28], [9, 34], [30, 16], [30, 24], [30, 36], [50, 20], [50, 32], [15, 38], [45, 38]]);
// tollbearers between the blocks (the herded crowd), gaunts lurking in the gutters, crates and carts as cover
const crowd = [];
for (const [ri, row] of [14, 20, 26, 32, 38].entries()) for (let i = 0; i < 7; i++) { const x0 = 12 + i * 6 + (ri % 2 ? 3 : 0); if (x0 + 3 < 50 && (i + ri) % 3 !== 2) crowd.push([x0 + 3, row]); }
L.putAll('t', crowd);
L.putAll('g', [[16, 17], [28, 18], [40, 17], [22, 29], [34, 30], [46, 29], [12, 30], [50, 18]]);
L.putAll('C', [[15, 22], [27, 24], [39, 22], [21, 27], [33, 35], [45, 27], [17, 34]]); L.putAll('c', [[16, 22], [28, 24], [40, 22], [22, 27], [34, 35], [46, 27]]); L.putAll('z', [[24, 22], [36, 33], [44, 20], [12, 36]]); L.putAll('o', [[19, 25], [31, 27], [43, 25]]);
// the boardwalk: three Bellhands, health at the far end, the north hoist switch
L.putAll('b', [[19, 9], [33, 9], [47, 9]]); L.putAll('C', [[12, 10], [16, 8], [23, 10], [27, 8], [30, 10], [37, 8], [40, 10], [43, 8], [50, 10]]);         // cover every few cells so the boardwalk can be taken a Bellhand at a time L.putAll('h', [[10, 9], [30, 9]]); L.put(51, 9, 'H'); L.putAll('r', [[14, 9], [21, 9], [28, 9], [35, 9], [41, 9], [49, 9]]);
L.put(53, 9, 'j'); L.put(48, 9, 'e');
// pickups through the market: ammo and health in the stalls' lee
L.putAll('e', [[20, 22], [38, 24], [26, 35], [44, 34]]); L.putAll('a', [[14, 24], [32, 28], [48, 26]]); L.putAll('r', [[17, 22], [35, 22], [23, 28], [41, 31], [53, 18], [13, 26], [25, 24], [31, 30], [37, 27], [46, 22], [19, 33], [29, 37], [43, 37], [52, 30]]); L.putAll('e', [[24, 20], [36, 36], [48, 30]]); L.putAll('a', [[20, 30], [40, 24]]);
L.putAll('h', [[15, 19], [27, 21], [39, 33], [21, 36]]); L.putAll('H', [[33, 26], [47, 36]]); L.put(11, 24, 'v'); L.put(49, 24, 'v');
// smokehouse: the south hoist switch, racks of fish, three ambush closets
L.putAll('t', [[22, 42], [22, 44]]); L.putAll('F', [[10, 43], [12, 43], [16, 43], [18, 43]]); L.put(14, 44, 'H'); L.putAll('e', [[10, 44], [18, 44]]); L.put(14, 43, 'n'); L.put(9, 42, 'r'); L.put(19, 42, 'r');
// auction hall: the exit, the stage guards
L.putAll('b', [[62, 24], [62, 26]]); L.putAll('t', [[60, 23], [60, 27]]); L.put(60, 25, 'H'); L.put(63, 25, '>'); L.put(59, 22, 'Q'); L.put(59, 28, 'Q');

const layers = L.layers();

export default {
  id: 'C1E1M03', name: 'Fishmarket Rows', version: 1, ceilingHeight: 4.2, par: { time: 700 },
  atmosphere: { fog: '#1a2438', fogDensity: 0.012, sky: 'night' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 8, shell: 12, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'FISHMARKET ROWS', lines: ['The town tried to run. It ran here.', 'Every lane is a queue that never moved.'] },
  outro: 'Next: the Drowned Chandlery. The cellars flood on the ebb.',
  objective: 'Get up on the boardwalk (stairs, west end)',
  ...layers,
  groups: [{ name: 'smoke-closet', rect: [22, 42, 22, 44] }],
  scenery: [{ kind: 'tower', at: [80, 6], scale: 1.4 }],
  entities: [
    { type: 'switch', id: 'north', at: [52, 8], wall: 'north', do: [{ open: [55, 25] }, { objective: 'North hoist raised. Now the south hoist, in the smokehouse' }, { spawn: { kind: 'gaunt', at: [8, 22], group: 'wave-n', facing: 'east' } }, { spawn: { kind: 'gaunt', at: [8, 24], group: 'wave-n', facing: 'east' } }, { spawn: { kind: 'gaunt', at: [8, 26], group: 'wave-n', facing: 'east' } }, { spawn: { kind: 'gaunt', at: [8, 28], group: 'wave-n', facing: 'east' } }, { shake: 1 }, { message: 'north' }] },
    { type: 'switch', id: 'south', at: [14, 45], wall: 'south', do: [{ open: [57, 25] }, { open: [21, 42] }, { open: [21, 44] }, { wake: 'smoke-closet' }, { objective: 'Both hoists are up. Auction hall, east end: the way out' }, { shake: 1 }] },
  ],
  messages: [
    { id: 'start', at: [4, 24], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the market road. Everyone who ran ended up here. Keep to cover; the Bellhands will pick at you along the boardwalk.' },
    { id: 'boardwalk', at: [14, 9], radius: 3, speaker: 'INES', text: 'Bells overhead. Three of them, patient as gulls.' },
    { id: 'north', at: [52, 9], radius: 2, speaker: 'FISH HOIST LOG', text: 'Auction shutters run on two hoists, north and south. Somebody wanted that hall shut, and set both to fail closed.' },
    { id: 'mid', at: [30, 24], radius: 4, speaker: 'INES', text: 'Scales set, stalls open, nobody behind them. They were herded, not slaughtered.' },
    { id: 'smoke', at: [14, 43], radius: 3, speaker: 'LEDGER', text: 'Order from the Vael: keep them in the rows till the tone finds them all. Fish keep. People will too.' },
    { id: 'hall', at: [60, 25], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'That is the way out. After it, the Drowned Chandlery: the cellars flood on the ebb. Bring a light, and courage.' },
  ],
  triggers: [{ id: 'boardwalk', when: 'enter', at: [10, 9], radius: 2, do: [{ objective: 'Three Bellhands on the boardwalk: take them one at a time from behind the crates' }] }],
  quality: { enemies: [36, 56], botSeconds: [150, 480], mechanics: ['switches', 'heights', 'triggers', 'hazards', 'closets'], skins: 7 },
};
