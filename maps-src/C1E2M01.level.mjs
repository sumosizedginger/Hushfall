// C1E2M01 BRINE GATE: checkpoint assault across open ground. The processing site is guarded and organised.
// New idea: the first FORTIFIED approach. A wide salt pan with nothing on it but cover, brine channels that slow you, and a gate wall with a rank of Tollbearers in front of it and a Bellhand
// tower at each end. The straight road is a kill lane; the gate does not open for force, only for the sluice wheel in the guardhouse on the north flank. Three ways in: the road (fast, exposed),
// the north ditch (slow brine, covered, leads to the guardhouse and its kennels), the south ditch (slow, leads to a pump house cache and the south tower stair).
// The guardhouse stands in the WEST half of the pan, 30 m from the towers (a Bellhand shoots 22 m): the ditch brings you to its north door unseen. Pull the wheel and the gate rolls up, the yard wakes and pours
// out across the pan at you: the assault is the walk back east, under the towers, through the rank, to the gate.
// Route: start (west) -> north ditch -> guardhouse north door (the kennels open as you enter) -> the sluice wheel -> out the south door -> east across the pan, cover to cover, through the rank and the gate
//        -> the yard (Warden-Graft and its guard) -> the exit, east end.
// Look: the Salt Works (salt-caked brick, rusted corrugated sheet, cracked salt crust under a pale overcast).
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(72, 50);

// ---- the pan (open air), its ring wall, and the gate wall ----------------------------------------------------------------------
L.room([3, 6, 46, 43], { floor: 'l', wall: 'L' });                                         // the salt pan: x 3..46, z 6..43
L.rect([47, 6, 49, 43], 'L');                                                               // the gate wall, three cells thick
L.rect([3, 23, 46, 25], 's');                                                               // the road: slate flags straight to the gate
for (const x of [14, 30]) { L.rect([x, 6, x + 2, 43], 'm'); L.fx([x, 6, x + 2, 43], 'w'); } // two brine channels run north to south (wading: slow)
for (const x of [14, 30]) { L.rect([x, 23, x + 2, 25], 'g'); L.fx([x, 23, x + 2, 25], '.'); }   // grate bridges carry the road over them
L.rect([3, 6, 46, 7], 'm'); L.fx([3, 6, 46, 7], 'w');                                       // the north ditch (to the guardhouse)
L.rect([3, 42, 46, 43], 'm'); L.fx([3, 42, 46, 43], 'w');                                   // the south ditch (to the pump house and the south tower)

// ---- the gate and the yard ------------------------------------------------------------------------------------------------------
L.rect([47, 24, 49, 24], 's'); L.door(48, 24, { remote: true });                            // the gate: one door, 2 m wide, rolled up by the sluice wheel
L.room([50, 15, 69, 34], { floor: 's', wall: 'L' });                                        // the yard behind it

// ---- the towers (3 m platforms with a stair each) ---------------------------------------------------------------------------------
L.height([43, 16, 46, 19], 6); L.stairs([37, 17, 42, 18], 'x', 1, 6);                       // north tower
L.height([43, 29, 46, 32], 6); L.stairs([37, 30, 42, 31], 'x', 1, 6);                       // south tower

// ---- the guardhouse (north flank): kennels on its west wall, the sluice wheel on its north wall -------------------------------------
L.rect([18, 8, 29, 13], 'K'); L.rect([22, 9, 28, 12], 'f');                                 // corrugated walls, flagged floor
L.door(25, 8); L.door(25, 13);                                                              // north door (the ditch side) and south door (the pan side)
for (const z of [10, 12]) { L.rect([20, z, 20, z], 'f'); L.closet(21, z); }                   // two kennel cubbies, shut

// ---- the pump house (south): a cache for whoever comes by the south ditch -------------------------------------------------------------
L.rect([19, 37, 28, 41], 'K'); L.rect([20, 38, 27, 40], 'f'); L.door(23, 37);

// ---- objects -----------------------------------------------------------------------------------------------------------------------
L.put(4, 24, '@'); L.put(68, 25, '>');
// cover: stacked crates (salt cargo) in staggered rows across the pan, sacks beside them, carts and barrels along the road
for (const [ri, z] of [16, 20, 28, 35].entries()) for (const x of [9, 19, 25]) { const xx = x + (ri % 2 ? 2 : 0); L.put(xx, z, 'C'); L.put(xx + 1, z, 'y'); }
// the salt dyke: a line of stacked crates across the pan with the road left open. It cuts the line of sight between the west half and the rank, so the rank, the towers and the gate are met one engagement at a time
for (let z = 9; z <= 41; z++) if (z < 22 || z > 26) L.put(35, z, 'C');
L.putAll('z', [[7, 22], [7, 26], [21, 22], [21, 26], [27, 22], [27, 26], [38, 22], [38, 26]]);
L.putAll('o', [[10, 24], [24, 24], [34, 24], [8, 10], [8, 39], [24, 9], [24, 36]]);
L.putAll('P', [[12, 15], [12, 33], [28, 15], [28, 33], [41, 19], [41, 29]]);
// the garrison: a rank in front of the wall (the road lane stays open), the towers, the Sexton behind the rank, hunters in the channels, patrols
L.putAll('t', [[43, 21], [43, 27], [46, 22], [46, 26]]);
L.putAll('b', [[44, 18], [44, 30]]); L.putAll('c', [[46, 16], [46, 19], [46, 29], [46, 32]]);
L.putAll('g', [[15, 10], [15, 38]]);
L.putAll('t', [[8, 12], [8, 36], [22, 32], [36, 31], [12, 10], [28, 10]]);
// the guardhouse: its crew, the kennels
L.putAll('t', [[23, 10], [27, 10], [23, 11], [27, 11]]); L.putAll('g', [[20, 10], [20, 12]]); L.putAll('F', [[22, 9], [28, 9]]); L.put(25, 11, 'n');
// the pump house: a cache and two sleepers
L.putAll('g', [[22, 39], [26, 39]]); L.putAll('H', [[21, 38], [27, 38]]); L.putAll('e', [[23, 38], [25, 38]]); L.putAll('r', [[24, 39], [23, 40], [25, 40]]); L.put(24, 38, 'n');
// the yard: the Warden-Graft and its guard, idle until the gate rolls up
L.put(62, 25, 'w'); L.putAll('t', [[57, 20], [57, 30], [60, 22], [60, 28]]); L.put(66, 25, 'x'); L.putAll('g', [[58, 24], [58, 26], [64, 22]]); L.putAll('C', [[54, 20], [54, 30], [65, 20], [65, 30]]); L.putAll('n', [[53, 25], [67, 21], [67, 29]]);
// pickups: ammunition and health in the lee of the cover, more on the flanks than on the road
L.putAll('e', [[8, 15], [10, 31], [20, 15], [20, 36], [26, 16], [26, 36], [33, 15], [37, 30], [10, 7], [22, 7], [34, 7]]); L.putAll('r', [[6, 7], [14, 7], [18, 7], [26, 7], [30, 7]]); L.putAll('a', [[8, 7], [20, 7]]); L.put(12, 7, 'h'); L.put(16, 7, 'h'); L.put(24, 7, 'v');
L.putAll('r', [[10, 14], [8, 31], [20, 14], [18, 36], [24, 14], [24, 36], [34, 16], [36, 32], [11, 24], [23, 23], [35, 25]]);
L.putAll('a', [[9, 20], [20, 20], [26, 20], [9, 30], [26, 30], [37, 20]]);
L.putAll('h', [[7, 24], [21, 24], [27, 24], [39, 24], [24, 14], [26, 14], [20, 40], [38, 36]]); L.putAll('H', [[33, 22], [33, 27], [25, 10]]); L.putAll('v', [[22, 24], [28, 12], [33, 21], [33, 28]]); L.putAll('C', [[37, 20], [37, 28], [39, 22], [39, 26]]);          // armour in the safe pocket west of the dyke; a pillbox of crates just past the gap
L.putAll('e', [[52, 18], [52, 32]]); L.putAll('r', [[52, 20], [52, 30], [55, 25]]); L.putAll('H', [[52, 25]]); L.putAll('h', [[66, 18], [66, 32]]);
L.putAll('m', [[6, 24], [20, 24], [26, 24], [44, 24], [52, 24], [66, 25]]);

const layers = L.layers();

export default {
  id: 'C1E2M01', name: 'Brine Gate', version: 1, ceilingHeight: 6, par: { time: 600 },
  atmosphere: { fog: '#9a9a8c', fogDensity: 0.008, sky: 'overcast' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'BRINE GATE', lines: ['The works guard themselves the way a port does.', 'With people who were told to stand there.'] },
  outro: 'Next: the Evaporation Pans. Everything out there is white.',
  objective: 'Cross the pan. The gate only answers to the sluice wheel in the guardhouse: take the north ditch',
  ...layers,
  groups: [{ name: 'yard', rect: [50, 15, 69, 34] }, { name: 'kennel', rect: [20, 10, 20, 12] }],
  entities: [
    { type: 'switch', id: 'sluice', at: [23, 12], wall: 'south', do: [{ open: [48, 24] }, { wake: 'yard' }, { objective: 'The gate is rolling up. The yard is awake: take the road, east end' }, { shake: 2 }] },
  ],
  messages: [
    { id: 'start', at: [5, 24], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Salt Works. That wall is the Brine Gate and the road runs straight at it. Do not take the road.' },
    { id: 'pan', at: [33, 24], radius: 4, speaker: 'INES', text: 'A rank in front of the gate. Bellhands on both towers. Whoever set this up has done it before.' },
    { id: 'ditch', at: [14, 8], radius: 3, speaker: 'INES', text: 'The ditch slows me, and nothing up on the towers can see into it. The guardhouse is ahead, north door.' },
    { id: 'guard', at: [25, 11], radius: 3, speaker: 'GUARD LOG', text: 'GATE OPENS BY THE SLUICE WHEEL ONLY. NIGHT SHIFT KEEPS THE KENNEL KEYS. ALL PERSONS REMAIN ON THE ROAD.' },
    { id: 'yard', at: [51, 24], radius: 3, speaker: 'INES', text: 'Plate. That is the Warden-Graft again. Let it run into the wall.' },
    { id: 'exit', at: [66, 25], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'That is the way into the Works. After it, the Evaporation Pans: open flats and channels, and hunting parties.' },
  ],
  triggers: [
    { id: 'kennels', when: 'enter', at: [25, 10], radius: 2.5, do: [{ open: [21, 10] }, { open: [21, 12] }, { wake: 'kennel' }, { objective: 'The kennels are open. The sluice wheel is on the south wall' }] },
  ],
  quality: { enemies: [28, 50], botSeconds: [70, 600], mechanics: ['heights', 'switches', 'triggers', 'hazards', 'closets'], skins: 7, enemyKinds: { wardengraft: 1, bellhand: 2 } },
};
