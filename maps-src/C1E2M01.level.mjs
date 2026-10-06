// C1E2M01 BRINE GATE (version 3): checkpoint assault across open ground. The processing site is guarded and organised.
// Revised after the owner's PT-008 feedback ("the entire game feels way wide open ... the wide open without a reason feels weird", a roofless walled yard, no sign of the aliens): a SHORTER approach
// bracketed by rooms, a roofed hall behind the gate, the machinery of the Works on screen from the first room. Scale class MIXED (see design/CAMPAIGN_SPINE.md).
// Kept from versions 1-2 (proven): the sluice wheel in the guardhouse is the only thing that opens the gate; the dyke of crates cuts the line of sight so the rank, the towers and the gate are met one
// engagement at a time; the ditches are the slow covered way; the Warden-Graft in the hall wants a pillar to run into.
// Route: the arrival shed (two cradles on the rail: something is wrong in the first room) -> out onto the pan -> north ditch -> the guardhouse (the kennels open as you enter) -> the sluice wheel
//        -> out the south door -> east across the pan, cover to cover, through the rank and the gate -> the hall (Warden-Graft and its guard) -> the grafting bay (resin, pods) -> the exit.
// Optional: the pump house on the south side holds a cache, two sleepers and a SECRET valve room behind the east wall.
// Open air vs roof (PT-007/PT-008): a floor skin of kind `floor` (. f) gets a ceiling, the outdoor skins (l s m p) do not. The pan is open; the shed, guardhouse, pump house, gate passage, hall and bay are roofed.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(76, 40);

// ---- the pan (open air), its ring wall, and the gate wall ------------------------------------------------------------------------
L.room([11, 11, 44, 33], { floor: 'l', wall: 'L' });                                       // the salt pan: x 11..44, z 11..33 (room() takes the INTERIOR; its ring is the wall)
L.rect([43, 10, 45, 34], 'L');                                                              // the gate wall, three cells thick (x 43..45)
L.rect([11, 21, 42, 23], 's');                                                              // the road: slate flags straight to the gate
L.rect([13, 11, 15, 33], 'm'); L.fx([13, 11, 15, 33], 'w');                                 // the brine channel runs north to south (wading: slow)
L.rect([13, 21, 15, 23], 'p'); L.fx([13, 21, 15, 23], '.');                                 // a plank bridge carries the road over it (an OUTDOOR floor: the grate `g` is an indoor skin and grows a ceiling slab, PT-007)
L.rect([11, 11, 42, 12], 'm'); L.fx([11, 11, 42, 12], 'w');                                 // the north ditch (to the guardhouse)
L.rect([11, 32, 42, 33], 'm'); L.fx([11, 32, 42, 33], 'w');                                 // the south ditch

// ---- the arrival shed: the first room (roofed), a door onto the pan ---------------------------------------------------------------
L.room([3, 19, 9, 25], { floor: '.', wall: 'K' }); L.door(10, 22);                           // interior x 3..9, z 19..25; its east wall (x 10) is the pan's west wall

// ---- the gate passage and the hall behind it (roofed) -------------------------------------------------------------------------------
L.rect([43, 22, 43, 22], 's'); L.door(44, 22, { remote: true });                            // the gate: one door, 2 m wide, rolled up by the sluice wheel
L.room([46, 14, 64, 29], { floor: 'f', wall: 'L' }); L.rect([45, 22, 45, 22], 'f');         // the receiving hall: x 46..64, z 14..29 (the passage cell at x 45 is hall floor)
L.room([66, 19, 73, 25], { floor: 'f', wall: 'R' }); L.door(65, 22);                         // the grafting bay: x 66..73, z 19..25, resin walls, the exit at its east end

// ---- the towers (3 m platforms with a stair each) ---------------------------------------------------------------------------------
L.height([39, 14, 42, 17], 6); L.stairs([33, 15, 38, 16], 'x', 1, 6);                       // north tower
L.height([39, 27, 42, 30], 6); L.stairs([33, 28, 38, 29], 'x', 1, 6);                       // south tower

// ---- the guardhouse (north flank): kennels on its west wall, the sluice wheel on its south wall ------------------------------------
L.rect([17, 13, 27, 18], 'K'); L.rect([21, 14, 26, 17], 'f');                               // corrugated walls, flagged floor
L.door(23, 13); L.door(23, 18);                                                              // north door (the ditch side) and south door (the pan side)
for (const z of [15, 17]) { L.rect([19, z, 19, z], 'f'); L.closet(20, z); }                  // two kennel cubbies, shut

// ---- the pump house (south) and its secret valve room -------------------------------------------------------------------------------
L.rect([17, 27, 25, 31], 'K'); L.rect([18, 28, 24, 30], 'f'); L.door(21, 27);
L.rect([25, 27, 29, 31], 'K'); L.rect([26, 28, 28, 30], 'f'); L.secretPanel(25, 29);        // the valve room: east wall of the pump house

// ---- objects -----------------------------------------------------------------------------------------------------------------------
L.put(5, 22, '@'); L.put(72, 22, '>');
// the first room: two cradles on the rail (the machinery of the Works, on screen from the start), a little ammunition
L.putAll('O', [[4, 20], [4, 24]]); L.putAll('e', [[8, 20], [8, 24]]); L.put(7, 22, 'h');
// cover: stacked crates (salt cargo) with sacks beside them, carts and barrels along the road
L.putAll('C', [[19, 20], [25, 20], [19, 25], [25, 25], [28, 25], [12, 17], [12, 28]]); L.putAll('y', [[20, 20], [26, 20], [20, 25], [26, 25], [29, 25], [11, 17]]);
// the salt dyke: a line of stacked crates across the pan with the road left open. It cuts the line of sight between the west half and the rank
for (let z = 13; z <= 31; z++) if (z < 20 || z > 24) L.put(31, z, 'C');
L.putAll('z', [[17, 20], [17, 24], [27, 24], [36, 20], [36, 24]]);
L.putAll('o', [[12, 20], [22, 24], [30, 22], [34, 22]]);
L.putAll('P', [[35, 18], [35, 26]]);
// the garrison: a rank in front of the wall (the road lane stays open), the towers, hunters in the channel, patrols
L.putAll('t', [[39, 19], [39, 25], [42, 20], [42, 24]]);
L.putAll('b', [[40, 16], [40, 28]]); L.putAll('c', [[42, 14], [42, 17], [42, 27], [42, 30]]);
L.putAll('g', [[14, 12], [14, 32]]);
L.putAll('t', [[12, 15], [12, 30], [22, 25], [34, 30], [16, 12], [27, 12]]);
// the guardhouse: its crew, the kennels
L.putAll('t', [[22, 15], [25, 15], [22, 16], [25, 16]]); L.putAll('g', [[19, 15], [19, 17]]); L.putAll('F', [[21, 14], [26, 14]]); L.put(24, 17, 'n');
// the pump house: a cache and two sleepers; the valve room: the secret cache
L.putAll('g', [[20, 29], [23, 29]]); L.putAll('H', [[18, 28], [24, 28]]); L.putAll('e', [[19, 28], [23, 28]]); L.putAll('r', [[21, 29], [20, 30], [22, 30]]); L.put(21, 28, 'n');
L.putAll('v', [[26, 29], [28, 29]]); L.putAll('H', [[27, 28]]); L.putAll('e', [[27, 30]]); L.putAll('r', [[26, 30], [28, 28]]); L.put(27, 29, 'n');
// the hall: the Warden-Graft and its guard (idle until the gate rolls up); columns, and a pillar on the Warden's charge lane (let it run into the pillar: the 'yard' message says so)
L.put(60, 22, 'w'); L.putAll('t', [[53, 19], [53, 25], [58, 19], [58, 25]]); L.putAll('g', [[56, 21], [56, 23], [62, 20]]);
L.putAll('P', [[50, 18], [50, 26], [56, 17], [56, 27], [62, 17], [62, 27], [54, 22]]);
L.putAll('O', [[48, 15], [53, 15], [58, 15], [63, 15], [48, 28], [53, 28], [58, 28], [63, 28]]);       // the cradle rail
L.putAll('D', [[47, 19], [47, 25], [64, 19], [64, 25]]);                                              // pods
L.putAll('n', [[47, 16], [47, 28], [63, 22]]); L.putAll('C', [[49, 17], [49, 27], [61, 17], [61, 27]]);
// the grafting bay: pods on the resin, one more cradle, the exit
L.putAll('D', [[67, 19], [67, 25], [72, 19], [72, 25]]); L.put(69, 22, 'O'); L.put(68, 22, 'n');
// pickups: ammunition and health in the lee of the cover, more on the flanks than on the road. The north ditch is the loot path of the slow way
L.putAll('r', [[11, 12], [19, 12], [23, 12], [31, 12], [35, 12]]); L.putAll('e', [[15, 12], [26, 12], [39, 12]]); L.putAll('a', [[13, 12], [25, 12]]); L.putAll('h', [[17, 12], [21, 12]]); L.put(29, 12, 'v');
L.putAll('e', [[18, 19], [26, 19], [20, 26], [28, 26], [34, 19], [37, 26], [12, 19], [12, 27]]);
L.putAll('r', [[12, 18], [12, 26], [19, 19], [24, 19], [18, 26], [27, 26], [34, 20], [36, 28], [16, 22], [26, 22], [37, 22]]);
L.putAll('a', [[16, 19], [22, 19], [28, 19], [16, 26], [23, 26], [36, 18]]);
L.putAll('h', [[12, 22], [18, 22], [28, 22], [35, 22], [21, 19], [26, 26], [22, 26], [38, 24]]); L.putAll('H', [[33, 21], [33, 25], [25, 11]]); L.putAll('v', [[20, 22], [33, 19], [34, 26]]);
L.putAll('e', [[47, 17], [47, 27]]); L.putAll('r', [[47, 20], [47, 24], [50, 22]]); L.put(48, 22, 'H'); L.putAll('h', [[63, 16], [62, 28]]);
L.putAll('j', [[23, 20], [23, 24], [37, 20], [41, 24]]);                                           // lampposts, off the centre lane: `m` hangs from the ceiling and floats in open air (PT-007)

const layers = L.layers();

export default {
  id: 'C1E2M01', name: 'Brine Gate', version: 3, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { fog: '#9a9a8c', fogDensity: 0.008, sky: 'overcast' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'BRINE GATE', lines: ['The works guard themselves the way a port does.', 'With people who were told to stand there.'] },
  outro: 'Next: the Evaporation Pans. Everything out there is white.',
  objective: 'Cross the pan. The gate only answers to the sluice wheel in the guardhouse: take the north ditch',
  ...layers,
  secrets: [{ id: 'valve-room', panel: [25, 29], cells: [[26, 29], [27, 29], [28, 29]] }],
  groups: [{ name: 'yard', rect: [46, 14, 58, 29] }, { name: 'kennel', rect: [19, 15, 19, 17] }],       // the sluice wakes the guard on the near side of the hall; the Warden-Graft and its Gaunt, at the far end, wait for you
  entities: [
    { type: 'switch', id: 'sluice', at: [21, 17], wall: 'south', do: [{ open: [44, 22] }, { wake: 'yard' }, { objective: 'The gate is rolling up. The hall is awake: take the road, east end' }, { shake: 2 }] },
  ],
  messages: [
    { id: 'start', at: [5, 22], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Salt Works. Past that door is open ground and the Brine Gate at the far end. The road runs straight at it. Do not take the road.' },
    { id: 'cradles', at: [4, 22], radius: 2.5, speaker: 'INES', text: 'Cradles on a rail. They hang them here to wait.' },
    { id: 'pan', at: [30, 22], radius: 4, speaker: 'INES', text: 'A rank in front of the gate. Bellhands on both towers. Whoever set this up has done it before.' },
    { id: 'ditch', at: [16, 12], radius: 3, speaker: 'INES', text: 'The ditch slows me, and nothing up on the towers can see into it. The guardhouse is ahead, north door.' },
    { id: 'guard', at: [23, 15], radius: 3, speaker: 'GUARD LOG', text: 'GATE OPENS BY THE SLUICE WHEEL ONLY. NIGHT SHIFT KEEPS THE KENNEL KEYS. ALL PERSONS REMAIN ON THE ROAD.' },
    { id: 'pump', at: [21, 29], radius: 2.5, speaker: 'PUMP LOG', text: 'VALVE ROOM KEPT SHUT. THE EAST WALL SOUNDS HOLLOW. SALT DUST ON THE SILL IS FRESH.' },
    { id: 'yard', at: [47, 22], radius: 3, speaker: 'INES', text: 'Plate. That is the Warden-Graft again, and rails of cradles over the floor. Let it run into a pillar.' },
    { id: 'exit', at: [70, 22], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'That is the way into the Works. After it, the Evaporation Pans: open flats and channels, and hunting parties.' },
  ],
  triggers: [
    { id: 'kennels', when: 'enter', at: [23, 15], radius: 2.5, do: [{ open: [20, 15] }, { open: [20, 17] }, { wake: 'kennel' }, { objective: 'The kennels are open. The sluice wheel is on the south wall' }] },
  ],
  quality: { enemies: [28, 50], botSeconds: [40, 600], mechanics: ['heights', 'switches', 'triggers', 'hazards', 'closets'], skins: 7, enemyKinds: { wardengraft: 1, bellhand: 2 },
    scaleClass: 'MIXED', introduces: 'the fortified approach: a gate that only a switch in a side building opens, and the first machinery of the Works (cradle rails) on screen from the first room' },
};
