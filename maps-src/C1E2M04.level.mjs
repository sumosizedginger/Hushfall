// C1E2M04 KILN ROW: heat hazards, narrow furnaces, a secret exit. The kilns were used to cook the Tollbearer shells.
// Scale class COMPRESSION (design/CAMPAIGN_SPINE.md): every room is roofed and none runs longer than the sightline limit. The new idea is the EMBER BED (fx `h`: it slows and burns, 8 dps): a trench down the middle of the
// charging hall, strips down the gallery's three corridors. Two DAMPER HANDLES (brass: on an island in the trench; iron: in the gallery's east corridor) are what the flue lever in the last chamber needs;
// taking the iron handle opens the kiln mouths (ambush closets) in the central block of the gallery.
// Route: the gatehouse (spawn) -> the charging hall (two gangs, a Bellhand on each far corner; the trench between them; the brass handle on the island) -> a corridor -> the firing gallery (a ring round a block of kilns;
//        the iron handle in the east corridor; the kilns open) -> the flue chamber (Bellhands, the cradle rail; the flue lever spends both handles and unlocks the exit).
// Optional: a SECRET panel in the south wall of the gallery hides a tunnel with the secret exit (to C1E2S01, The Rime Vault).
// Open air vs roof (PT-007/PT-008): every floor here is `k f` (roofed), so there is no sky; nothing is hung in the open.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(82, 46);

// ---- the gatehouse (arrival) and the charging hall (the ember trench, an island with the brass handle, two bridges) -------------------------------------------------
L.room([3, 20, 9, 26], { floor: 'f', wall: 'K' }); L.door(10, 23);
L.room([11, 15, 31, 31], { floor: 'k', wall: 'Y' });
L.fx([14, 20, 28, 26], 'h');
L.rect([21, 20, 22, 21], 'f'); L.rect([21, 22, 22, 24], 'f'); L.rect([21, 25, 22, 26], 'f'); L.fx([21, 20, 22, 26], '.');        // north bridge, the island, south bridge: the safe line across the trench

// ---- a corridor between the halls, the firing gallery (a ring round a central block of kilns), the flue chamber ----------------------------------------------------------
L.room([33, 17, 40, 19], { floor: 'k', wall: 'Y' }); L.door(32, 18); L.door(41, 18);
L.room([42, 13, 63, 33], { floor: 'k', wall: 'Y' });
L.rect([46, 17, 59, 29], 'Y');                                                                                                  // the block of kilns in the middle
L.fx([47, 14, 58, 15], 'h'); L.fx([47, 31, 58, 32], 'h'); L.fx([61, 18, 62, 28], 'h');                                           // an ember strip down each corridor, leaving a narrow safe lane on both sides of it
for (const x of [49, 54]) { L.rect([x, 18, x, 18], 'k'); L.closet(x, 17); L.rect([x, 28, x, 28], 'k'); L.closet(x, 29); }        // four kiln mouths: a cubby behind each shut panel
L.room([65, 14, 77, 32], { floor: 'f', wall: 'Y' }); L.door(64, 16);
L.room([52, 35, 54, 38], { floor: 'k', wall: 'Y' }); L.secretPanel(53, 34);                                                     // the secret tunnel under the gallery's south wall

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 23, '@');
L.put(53, 37, '$');
// the gatehouse: a bench, a lamp, a little ammunition
L.putAll('f', [[4, 21], [4, 25]]); L.put(3, 23, 'F'); L.putAll('m', [[6, 21], [6, 25]]); L.putAll('e', [[8, 22], [8, 24]]); L.putAll('r', [[3, 21], [3, 25]]); L.put(7, 23, 'h');
// the charging hall: gangs on the north and south strips, a Bellhand on each far corner, pillars, cradles overhead, lanterns; the brass handle on the island
L.putAll('t', [[13, 17], [17, 16], [28, 16]]); L.put(24, 17, 'g'); L.put(30, 16, 'b'); L.putAll('t', [[13, 29], [24, 29], [28, 30]]); L.put(18, 30, 'g'); L.put(30, 30, 'b');
L.putAll('P', [[16, 18], [16, 28], [26, 18], [26, 28], [20, 17], [20, 29]]); L.putAll('O', [[14, 15], [22, 15], [14, 31], [22, 31]]); L.putAll('n', [[12, 19], [12, 27], [30, 19], [30, 27]]);
L.put(22, 23, 'k'); L.put(21, 23, 'n');
L.putAll('e', [[12, 17], [12, 29], [19, 16], [19, 30], [27, 18], [27, 28]]); L.putAll('r', [[12, 23], [15, 17], [15, 29], [25, 16], [25, 30]]); L.putAll('a', [[17, 17], [17, 29], [29, 17], [29, 29]]);
L.putAll('h', [[14, 19], [14, 27], [23, 19], [23, 27]]); L.putAll('H', [[11, 18], [11, 28]]); L.put(30, 22, 'v');
// lamps in the halls and along the gallery's lanes (the kilns are dark brick: without them the rooms read as black)
L.putAll('m', [[15, 15], [25, 15], [15, 31], [25, 31], [11, 23], [31, 23], [37, 17], [43, 13], [43, 33], [52, 13], [52, 33], [63, 13], [63, 33], [66, 22], [66, 24], [72, 14], [72, 32], [76, 18], [76, 28]]);
// the corridor: two sleepers
L.put(36, 18, 't'); L.put(39, 18, 'g'); L.putAll('e', [[34, 18], [38, 17]]); L.put(35, 19, 'r');
// the gallery: sleepers on the safe lanes, Gaunts asleep in the kiln mouths (group `kiln`: the closets open when the iron handle is taken); machinery; the iron handle in the east corridor
L.putAll('g', [[43, 21], [43, 27]]); L.putAll('t', [[48, 13], [56, 16], [48, 33], [56, 30], [63, 15], [63, 31]]); L.putAll('g', [[49, 18], [54, 18], [49, 28], [54, 28]]);
L.put(63, 23, 'i'); L.putAll('n', [[63, 21], [63, 25]]); L.putAll('P', [[44, 16], [44, 30], [60, 16], [60, 30]]); L.putAll('O', [[50, 16], [55, 16], [50, 30], [55, 30]]);
L.putAll('e', [[44, 14], [44, 32], [51, 13], [51, 33], [60, 14], [60, 32]]); L.putAll('r', [[42, 18], [42, 28], [57, 13], [57, 33], [63, 18], [63, 28]]); L.putAll('a', [[45, 22], [45, 24], [52, 16], [52, 30]]);
L.putAll('h', [[43, 15], [43, 31], [60, 22], [60, 24]]); L.putAll('H', [[42, 22], [42, 24], [63, 20], [63, 26]]);
// the flue chamber: Bellhands, a guard, pods and cradles (the shells hang here); the flue lever on the north wall; the exit
L.putAll('b', [[69, 16], [69, 30]]); L.putAll('t', [[67, 19], [67, 27], [71, 21], [71, 25]]); L.putAll('g', [[73, 18], [73, 28]]);
L.putAll('O', [[67, 15], [72, 15], [67, 31], [72, 31]]); L.putAll('D', [[66, 23], [74, 20], [74, 26], [70, 23]]); L.putAll('n', [[66, 17], [66, 29]]);
L.putAll('P', [[69, 20], [69, 26], [73, 23]]); L.putAll('H', [[66, 21], [66, 25]]); L.putAll('e', [[67, 16], [67, 30], [66, 19]]); L.putAll('r', [[68, 17], [68, 29]]); L.putAll('a', [[67, 20], [67, 26]]);
// the secret tunnel: a cache before the secret exit
L.put(52, 36, 'v'); L.put(54, 36, 'H'); L.put(52, 38, 'e'); L.put(54, 38, 'r');

const layers = L.layers();

const MAP = {
  id: 'C1E2M04', name: 'Kiln Row', version: 1, ceilingHeight: 3.8, par: { time: 420 },
  atmosphere: { fog: '#4a3226', fogDensity: 0.012, sky: 'ash', look: 'kiln' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  keyLabels: { brass: 'Brass damper handle', iron: 'Iron damper handle' },
  intro: { title: 'KILN ROW', lines: ['They fire them here, like pots.', 'The kilns are still warm. Nobody banked them.'] },
  outro: 'Next: the Cradle Annex. The room where they are made.',
  objective: 'Two damper handles open the flue: brass in the charging hall, iron in the gallery',
  ...layers,
  secrets: [{ id: 'cold-tunnel', panel: [53, 34], cells: [[53, 35], [53, 36], [53, 37]] }],
  groups: [{ name: 'kiln', rect: [49, 18, 54, 18] }, { name: 'kiln', rect: [49, 28, 54, 28] }, { name: 'flue', rect: [65, 14, 77, 32] }],
  entities: [
    { type: 'exit', at: [76, 23], locked: true, dest: 'next' },
    { type: 'switch', id: 'flue', at: [70, 14], wall: 'north', needs: ['brass', 'iron'],
      do: [{ exit: { set: 'unlock' } }, { objective: 'The flue is drawing. The exit is at the east end of the chamber' }, { shake: 2 }, { message: 'flue-open' }] },
  ],
  messages: [
    { id: 'start', at: [5, 23], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, Kiln Row. They fire the shells here. The flue is dampered shut, and the handles were taken out and hidden so nobody could draw it. Brass first: the charging hall.' },
    { id: 'hall', at: [13, 23], radius: 3, speaker: 'INES', text: 'That trench is embers. It burns, and it slows you. There is a bridge in the middle, and a handle on the island.' },
    { id: 'brass', at: [21, 23], radius: 2, speaker: 'DAMPER LOG', text: 'BRASS DAMPER HANDLE, KEPT ON THE ISLAND SO NO ONE CAN REACH IT WITHOUT CROSSING THE TRENCH. SIGNED, THE KILN MASTER.' },
    { id: 'gallery', at: [43, 19], radius: 3, speaker: 'INES', text: 'A ring round the kilns, and an ember strip down each side of it. Stay on the lane by the wall. Do not stand near the kiln mouths.' },
    { id: 'iron', at: [63, 23], radius: 2, speaker: 'DAMPER LOG', text: 'IRON DAMPER HANDLE. TAKE IT AND THE KILN MOUTHS OPEN: THE SHELLS COME OUT TO MEET WHOEVER TOOK IT.' },
    { id: 'kilns', at: [53, 23], radius: 0.1, speaker: 'INES', text: 'The kiln mouths are opening. Move off the lane, now.' },
    { id: 'flue', at: [70, 16], radius: 3, speaker: 'FLUE LEVER', text: 'FLUE. NEEDS BOTH DAMPER HANDLES, BRASS AND IRON, IN THE SOCKETS BELOW THE LEVER. DO NOT FIRE WITH THE DOOR OPEN.' },
    { id: 'flue-open', at: [70, 14], radius: 0.1, speaker: 'SIGNAL HOUSE', text: 'The flue is drawing. That is the cold coming up the stack. Whatever they hid below the Works, it is much colder than it should be.' },
    { id: 'tunnel', at: [53, 36], radius: 2.5, speaker: 'WARDEN CALDER', text: 'A cold draught in a kiln. I hid one thing the Works could not burn. Go on: the vault is down there.' },
  ],
  triggers: [
    { id: 'got-brass', when: 'key:brass', do: [{ objective: 'Brass handle taken. The iron handle is in the gallery, east side' }] },
    { id: 'got-iron', when: 'key:iron', do: [{ open: [49, 17] }, { open: [54, 17] }, { open: [49, 29] }, { open: [54, 29] }, { wake: 'kiln' }, { message: 'kilns' }, { shake: 1.5 }, { objective: 'The kilns are open. Take both handles to the flue lever, east chamber' }] },
  ],
  quality: { enemies: [30, 56], botSeconds: [40, 600], mechanics: ['switches', 'triggers', 'hazards', 'closets', 'keys>=2', 'secret'], skins: 5, enemyKinds: { bellhand: 4 },
    scaleClass: 'COMPRESSION', introduces: 'the ember bed: a hazard strip (slows and burns) that cuts rooms into a safe lane and a hot one, and the damper handles (two keys) that the flue lever needs' },
};

// bolt boxes for the Harpoon rifle (PT-010): ON the lane the route walks. They are appended AFTER every other entity so no other entity's id shifts (an id shift changes what the chaotic bot does)
MAP.entities ??= []; MAP.entities.push(...[[30,26],[63,22]].map(([x, z]) => ({ type: 'pickup', kind: 'ammo_bolt', at: [x, z] })));
export default MAP;
