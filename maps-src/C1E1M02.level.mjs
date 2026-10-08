// C1E1M02 CUSTOMS HALL: a key hunt through a looping civic hall with ambush closets.
// New ideas: floor heights (a raised gallery and registry), triggered closets, the iron key, the Riveter driver.
// Route: landing yard -> (bond store: Riveter driver) -> vestibule -> grand hall -> stairs to the gallery (brass key) -> brass door -> registry -> iron key
//        -> iron door -> descending stair corridor -> exit. Secret: the Lost Property office behind the vestibule wall.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(64, 52);

// ---- rooms -------------------------------------------------------------------------------------------------------------
L.room([2, 38, 15, 48], { floor: 's', wall: 'C' });                                           // landing yard (open air)
L.room([4, 28, 13, 35], { floor: 'f', wall: 'W' }); L.room([8, 36, 8, 36], { floor: 'f', wall: 'W' }); L.door(8, 37);      // bond store + its door
L.room([15, 31, 15, 31], { floor: 'f', wall: 'W' }); L.closet(14, 31);                          // bond-store closet
L.room([17, 40, 21, 46], { floor: 't', wall: 'P' }); L.door(16, 43);                            // vestibule
L.room([17, 33, 21, 38], { floor: 'f', wall: 'W' });                                            // lost property (secret)
L.room([23, 30, 47, 48], { floor: 't', wall: 'P' }); L.ceiling([23, 30, 47, 48], 9); L.door(22, 43);      // the grand hall
L.height([23, 30, 47, 32], 6);                                                                  // gallery, 3 m up
L.stairs([24, 33, 29, 34], 'x', 1, 6); L.stairs([41, 33, 46, 34], 'x', 6, 1);                   // west flight up (east), east flight up (west)
for (const x of [28, 33, 38, 43]) { L.room([x, 50, x, 50], { floor: 't', wall: 'P' }); L.closet(x, 49); }        // hall closets (open when the brass key is taken)
L.room([24, 8, 46, 27], { floor: 'c', wall: 'W', height: 6 });                                  // registry wing, 3 m up
L.room([35, 28, 35, 28], { floor: 'c', wall: 'W', height: 6 }); L.door(35, 29, { key: 'brass' });
L.wall([33, 8, 33, 27], 'W'); L.rect([33, 14, 33, 15], 'c'); L.rect([33, 22, 33, 23], 'c');     // partitions: reading room | antechamber | excise office
L.wall([37, 8, 37, 27], 'W'); L.rect([37, 12, 37, 13], 'c'); L.rect([37, 20, 37, 21], 'c');
L.height([43, 9, 45, 11], 7);                                                                   // the iron key's dais (+0.5 m)
for (const x of [26, 30, 40, 44]) { L.room([x, 6, x, 6], { floor: 'c', wall: 'W', height: 6 }); L.closet(x, 7); }   // registry closets (open when the iron key is taken)
L.door(47, 17, { key: 'iron' });                                                                // iron door east
L.room([48, 17, 60, 18], { floor: 'g', wall: 'C' }); L.stairs([48, 17, 60, 18], 'x', 6, 0, 2);  // the excise stair: 3 m down in twelve cells
L.room([52, 15, 52, 15], { floor: 'g', wall: 'C' }); L.height([52, 15, 52, 15], 4); L.closet(52, 16);
L.room([56, 20, 56, 20], { floor: 'g', wall: 'C' }); L.height([56, 20, 56, 20], 2); L.closet(56, 19);
L.room([61, 15, 62, 20], { floor: 'g', wall: 'I' });                                            // exit vestibule
L.secretPanel(19, 39);

// ---- objects -------------------------------------------------------------------------------------------------------------
L.put(3, 44, '@');
// landing yard: a screen of stacked crates hides the first Tollbearers from the arrival corner
L.line('C', [8, 41], [8, 46]); L.putAll('o', [[5, 40], [12, 47], [13, 38]]); L.putAll('z', [[6, 46], [13, 41]]); L.putAll('j', [[4, 39], [14, 47], [14, 39]]);
L.putAll('t', [[11, 43], [12, 46]]); L.put(13, 40, 'g'); L.putAll('h', [[5, 47]]); L.put(4, 40, 'a');
// bond store: shelves, the Riveter driver on a table, one guard and a closet Gaunt
L.putAll('F', [[5, 30], [5, 32], [5, 34], [12, 29], [12, 33]]); L.put(8, 29, 'R'); L.putAll('r', [[7, 29], [9, 29]]); L.put(8, 32, 'f'); L.put(8, 31, 't'); L.put(6, 29, 'M');
L.put(12, 35, 'r'); L.put(15, 31, 'g');
// vestibule
L.putAll('f', [[18, 41], [20, 41]]); L.put(19, 43, 'M'); L.put(19, 45, 't'); L.put(18, 46, 'h');
// lost property (secret): armour, rivets, a big health kit
L.putAll('v', [[18, 34], [20, 34]]); L.putAll('r', [[18, 36], [20, 36]]); L.put(19, 35, 'H'); L.put(19, 33, 'm');
// grand hall: pillars, a counter island of tables, lamps, the crowd
L.putAll('P', [[27, 36], [43, 36], [27, 44], [43, 44]]);
L.line('f', [30, 38], [34, 38]); L.line('f', [36, 38], [40, 38]); L.line('f', [30, 42], [34, 42]); L.line('f', [36, 42], [40, 42]); L.line('f', [30, 39], [30, 41]); L.line('f', [40, 39], [40, 41]);
L.putAll('M', [[28, 41], [35, 36], [42, 41], [35, 46]]);
L.putAll('t', [[26, 40], [44, 40], [33, 45], [37, 45], [29, 36], [42, 36]]); L.putAll('g', [[25, 46], [45, 46], [35, 47]]);
L.put(35, 40, 'h'); L.put(35, 41, 'H'); L.put(20, 46, 'H'); L.put(18, 44, 'a'); L.put(20, 44, 'e'); L.putAll('e', [[24, 47], [46, 47]]); L.putAll('a', [[26, 43], [44, 43]]); L.putAll('r', [[33, 36], [37, 36]]);
// gallery: three Bellhands over the hall, the brass key at the east end
L.putAll('b', [[30, 31], [40, 31], [44, 32]]); L.put(46, 30, 'k'); L.put(24, 31, 'H'); L.put(45, 31, 'v'); L.putAll('r', [[25, 32], [43, 30]]); L.putAll('e', [[31, 32], [39, 32]]);
// hall closets (Gaunts)
L.putAll('g', [[28, 50], [33, 50], [38, 50], [43, 50]]);
// registry: reading room stacks, antechamber, excise office with the dais
for (const x of [25, 28, 31]) for (const z of [14, 15, 16, 17, 18, 21, 22, 23, 24, 25]) L.put(x, z, "F");
L.putAll('f', [[40, 14], [43, 14], [40, 20], [43, 20], [41, 17]]);
L.putAll('m', [[28, 19], [42, 18], [35, 12], [35, 24]]); L.putAll('O', [[30, 12], [30, 26], [42, 12], [42, 25]]);
L.putAll('t', [[25, 13], [28, 20], [31, 24], [39, 25], [45, 24], [38, 10]]); L.putAll('b', [[32, 12], [44, 18]]);
L.put(44, 10, 'i'); L.put(35, 9, 'v'); L.putAll('r', [[34, 24], [36, 24], [34, 11]]); L.putAll('e', [[34, 12], [36, 12]]); L.putAll('a', [[36, 26], [34, 26]]); L.put(35, 23, 'H'); L.putAll('e', [[24, 26], [46, 9]]); L.putAll('r', [[46, 26], [25, 9]]); L.putAll('h', [[25, 10], [38, 26]]); L.put(44, 25, 'H');
L.putAll('g', [[26, 6], [30, 6], [40, 6], [44, 6]]);
// excise stair and the exit
L.putAll('t', [[52, 15], [56, 20]]); L.put(62, 16, 'b'); L.put(62, 19, 't'); L.put(59, 17, 'h'); L.put(56, 17, 'H'); L.put(58, 18, 'r'); L.put(58, 17, 'e'); L.put(61, 15, 'Q'); L.put(62, 17, '>');

const layers = L.layers();

export default {
  id: 'C1E1M02', name: 'Customs Hall', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { fog: '#2a3038', fogDensity: 0.012, sky: 'dusk', look: 'customs' },
  intro: { title: 'CUSTOMS HALL', lines: ['Every ship that ever came to Port Marrow was counted here.', 'The lamps are lit. Nobody lit them.'] },
  outro: 'Next: Fishmarket Rows. That is where the town tried to run.',
  objective: 'Find a way into the hall',
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 8, shell: 12 }, weapons: ['flare', 'scattergun'] },        // arriving from Marrow Quay with the scattergun
  ...layers,
  groups: [
    { name: 'hall-closet', rect: [28, 50, 43, 50] }, { name: 'reg-closet', rect: [26, 6, 44, 6] }, { name: 'stair', rect: [52, 15, 56, 20] }, { name: 'bond-closet', rect: [15, 31, 15, 31] },
  ],
  secrets: [{ id: 'lost-property', panel: [19, 39], cells: [[19, 38], [19, 37]] }],
  messages: [
    { id: 'yard', at: [3, 44], radius: 3, speaker: 'SIGNAL HOUSE', text: "Calder, the hall's lamps are lit. Nobody lit them. Get inside, find the keys, and come up through the registry." },
    { id: 'bond', at: [8, 33], radius: 3, speaker: 'BOND STORE LOG', text: 'Riveters for the dock crews, sealed until the Tide Board signs. Nobody signed. Take them; hold the trigger and let them run.' },
    { id: 'notice', at: [19, 43], radius: 2.5, speaker: 'CUSTOMS NOTICE', text: 'All persons received will be counted. All persons counted will be processed. Please do not ring the bells.' },
    { id: 'hall', at: [26, 44], radius: 4, speaker: 'INES', text: 'Bells. Dozens of them, and every one in tune with the next. That is what wrong sounds like.' },
    { id: 'gallery', at: [46, 31], radius: 3, speaker: 'REGISTER', text: 'Last page. 212 received, 424 processed. The second count is the Graft.' },
    { id: 'registry', at: [35, 26], radius: 3, speaker: 'INES', text: "They are not only taking people. They are filing them." },
    { id: 'ironkey', at: [44, 12], radius: 3, speaker: 'COUNTER-BOOK', text: "Final entry: 'Tone verified.' Then the ink stops, mid-word." },
    { id: 'exit', at: [58, 17], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Fishmarket Rows next. That is where the town tried to run. Mind the lanes.' },
  ],
  triggers: [
    { id: 'start', when: 'start', do: [{ objective: 'Find the brass key upstairs (gallery, east end)' }] },
    { id: 'bond-rivets', when: 'enter', at: [8, 29], radius: 1.6, do: [{ open: [14, 31] }, { wake: 'bond-closet' }, { objective: 'Rivets in hand: into the vestibule and the hall' }] },
    { id: 'brass', when: 'key:brass', do: [{ open: [28, 49] }, { open: [33, 49] }, { open: [38, 49] }, { open: [43, 49] }, { wake: 'hall-closet' }, { shake: 1.2 }, { objective: 'The closets are open. Then the brass door on the gallery' }] },
    { id: 'iron', when: 'key:iron', do: [{ open: [26, 7] }, { open: [30, 7] }, { open: [40, 7] }, { open: [44, 7] }, { wake: 'reg-closet' }, { shake: 1.2 }, { objective: 'Iron door, east wall: get out' }] },
    { id: 'stair', when: 'enter', at: [54, 17], radius: 2.5, do: [{ open: [52, 16] }, { open: [56, 19] }, { wake: 'stair' }] },
  ],
  quality: { enemies: [30, 46], botSeconds: [90, 420], mechanics: ['heights', 'closets', 'triggers', 'keys>=2'], skins: 5 },
};
