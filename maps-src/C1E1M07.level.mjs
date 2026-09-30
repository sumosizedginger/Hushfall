// C1E1M07 SIGNAL HOUSE: Warden Calder's broadcast station at the ridge foot. Tight brass-and-oilcloth rooms, the power out, ammunition short.
// New ideas: the dark (the level starts at 30% light and comes up as fuses are found), fuses (three keys with fuse names: the radio spends them), a switch that asks for items,
//            the first clear Vael transmission, closets in the dormitory, a Sexton in the atrium, and the rivet driver as the workhorse.
// Route: porch -> atrium -> generator cellar (brass fuse) -> dormitory (iron fuse, three closets open when you take it) -> east corridor -> attic gallery (bell fuse, Bellhands on the gantry)
//        -> back to the radio room: install the fuses. The lights surge, the Vael speak, the sealed hatch opens.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(60, 46);
L.room([2, 21, 7, 25], { floor: ':', wall: 'B' });                              // porch (open air)
L.room([9, 17, 28, 29], { floor: '.', wall: 'W' });                             // atrium
L.room([16, 8, 24, 15], { floor: 't', wall: 'W' });                             // radio room (tiled)
L.room([3, 6, 12, 15], { floor: 'n', wall: 'I' });                              // generator cellar (silt-stained)
L.room([9, 31, 28, 40], { floor: 'c', wall: 'P' });                             // dormitory (carpet, plaster)
L.room([30, 21, 42, 25], { floor: 'g', wall: 'I' }); L.ceiling([30, 21, 42, 25], 8);      // east corridor, its stairs
L.stairs([37, 21, 42, 25], 'x', 1, 6);
L.room([44, 10, 56, 36], { floor: '.', wall: 'T', height: 6 });                 // attic gallery, 3 m up
// the dormitory niches behind the closet panels (south wall) and a raised gantry in the attic
for (const x of [12, 18, 24]) { L.closet(x, 41); L.rect([x, 42, x, 42], '.'); }
L.ceiling([44, 10, 56, 36], 9); L.height([46, 12, 54, 16], 9);                   // the gantry: 1.5 m above the attic floor, the bell fuse at the far end
L.stairs([46, 17, 54, 19], 'z', 9, 7);
L.rect([46, 12, 54, 16], '.');
// doors
L.door(8, 23); L.door(10, 16); L.door(20, 16); L.door(18, 30); L.door(29, 23); L.door(43, 23);
// the exit hatch inside the radio room, sealed until the radio is repaired
// (the exit is the explicit locked entity below: a '>' glyph here would create a second, unlocked exit on the same cell)

// ---- objects -------------------------------------------------------------------------------------------------------------
L.put(3, 23, '@');
// porch: a lantern, two Tollbearers loitering by the door
L.put(6, 22, 'n'); L.putAll('t', [[5, 24], [6, 25]]); L.put(4, 22, 'h');
// atrium: shelves make lanes, the sorting table in the middle, lamps low; one Sexton behind the shelves
L.putAll('F', [[12, 20], [13, 20], [14, 20], [12, 26], [13, 26], [14, 26], [23, 20], [24, 20], [25, 20], [23, 26], [24, 26], [25, 26]]);
L.putAll('f', [[17, 22], [18, 22], [19, 22], [17, 24], [18, 24], [19, 24]]); L.putAll('m', [[10, 18], [27, 18], [10, 28], [27, 28], [18, 23]]);
L.putAll('t', [[14, 23], [22, 19], [22, 27], [26, 23], [12, 28], [27, 26]]); L.putAll('g', [[16, 18], [20, 28], [10, 21]]); L.put(25, 24, 'x');
L.putAll('e', [[11, 24], [21, 18]]); L.putAll('r', [[27, 20], [15, 21]]); L.put(11, 27, 'h');
// radio room: a bench, the set, two Tollbearers in the dark; the radio lever on the north wall
L.putAll('f', [[18, 11], [22, 11]]); L.putAll('t', [[19, 13], [23, 13]]); L.putAll('m', [[17, 9], [23, 9]]); L.put(20, 14, 'h');
// generator cellar: pods, the brass fuse in the far corner, a Sexton over the fallen
L.putAll('D', [[4, 8], [6, 12], [10, 8]]); L.put(4, 7, 'k'); L.putAll('t', [[6, 8], [9, 12], [11, 9]]); L.putAll('g', [[5, 11], [8, 7]]); L.put(9, 10, 'x'); L.putAll('n', [[5, 14], [11, 14]]); L.put(7, 14, 'r'); L.put(11, 7, 'h');
// dormitory: beds (tables) in rows, the iron fuse at the far end; three ambush niches open when it is taken
L.putAll('f', [[11, 34], [12, 34], [14, 34], [15, 34], [17, 34], [18, 34], [20, 34], [21, 34], [23, 34], [24, 34], [26, 34], [27, 34], [11, 38], [12, 38], [14, 38], [15, 38], [20, 38], [21, 38], [23, 38], [24, 38]]);
L.put(27, 38, 'i'); L.putAll('t', [[13, 36], [19, 36], [25, 36], [16, 38], [22, 36]]); L.putAll('g', [[10, 33]]); L.putAll('m', [[10, 32], [27, 32], [10, 39], [27, 39], [18, 36]]);
L.putAll('t', [[12, 42]]); L.putAll('g', [[18, 42], [24, 42]]);
L.putAll('e', [[19, 32], [26, 39]]); L.put(16, 32, 'r'); L.put(20, 39, 'H'); L.put(12, 39, 'h'); L.put(22, 32, 'r');
// east corridor: two Bellhands at the top of the stairs
L.putAll('n', [[33, 21], [33, 25]]); L.putAll('t', [[35, 23]]); L.put(32, 23, 'a');
// attic: a long dark gallery. rafters, crates, three Tollbearers, two Bellhands on the gantry, the bell fuse beyond them
L.putAll('C', [[48, 26], [52, 26], [48, 30], [52, 30], [46, 33], [54, 33]]); L.putAll('c', [[49, 26], [53, 30]]); L.putAll('o', [[50, 24], [50, 34]]); L.putAll('n', [[45, 24], [55, 24], [50, 28], [45, 34], [55, 34]]);
L.putAll('t', [[47, 24], [53, 24], [50, 31]]); L.putAll('g', [[47, 32], [53, 32]]); L.putAll('b', [[48, 13], [52, 13]]); L.put(50, 11, 'q'); L.putAll('h', [[46, 23], [55, 22]]); L.put(50, 22, 'e'); L.putAll('r', [[45, 13], [52, 22]]); L.put(55, 15, 'H');

const layers = L.layers();

export default {
  id: 'C1E1M07', name: 'Signal House', version: 1, ceilingHeight: 4.2, par: { time: 800 },
  atmosphere: { fog: '#0e1218', fogDensity: 0.03, sky: 'night', ambient: 0.3 },
  keyLabels: { brass: 'Brass fuse', iron: 'Iron fuse', bell: 'Bell fuse' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 4, shell: 8, rivet: 40 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'SIGNAL HOUSE', lines: ['The lamps went out at dusk.', 'Somebody is still keying the set.'] },
  outro: 'Next: the Bell Tower of St. Orrin. The transmission gave the hour.',
  objective: 'The power is out. Find three fuses: generator cellar, dormitory, attic',
  ...layers,
  groups: [{ name: 'niche', rect: [12, 42, 24, 42] }],
  entities: [
    { type: 'exit', at: [24, 9], locked: true, dest: 'next' },
    { type: 'switch', id: 'radio', at: [20, 8], wall: 'north', needs: ['brass', 'iron', 'bell'],
      do: [{ lights: 1 }, { exit: { set: 'unlock' } }, { shake: 1.4 }, { message: 'vael' }, { objective: 'The set is live. The hatch in the radio room is open' }] },
  ],
  messages: [
    { id: 'start', at: [3, 23], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Signal House. The generator is down and the set is dead. Three fuses will bring it up: the cellar, the dormitory, the attic. Ammunition is short. Do not waste it.' },
    { id: 'dark', at: [12, 23], radius: 3, speaker: 'INES', text: 'It is dark on purpose. They cut the lamps so we cannot see them. The lanterns are yours: stay near them.' },
    { id: 'radio-locked', at: [20, 12], radius: 3, speaker: 'RADIO SET', text: 'The set is cold. Three fuse sockets, all empty: brass, iron, bell. The lever on the north wall waits for them.' },
    { id: 'cellar', at: [7, 10], radius: 3.5, speaker: 'INES', text: 'That bell-carrier is feeding the fallen back into the line. Kill it before it finishes.' },
    { id: 'dorm', at: [18, 33], radius: 4, speaker: 'INES', text: 'Beds. All made. Whatever slept here got up in the night and did not undo them.' },
    { id: 'attic', at: [50, 30], radius: 4, speaker: 'SIGNAL HOUSE', text: 'The last fuse is on the gantry above the antenna hatch. Two on the rails; take the high ground last.' },
    { id: 'vael', at: [20, 12], radius: 6, speaker: 'UNKNOWN (VAEL)', text: 'TOLL RECEIVED. THE FIRST BELL HAS RUNG. PORT MARROW IS NOT THE END OF THE LINE. IT IS THE MIDDLE OF IT. SING WHEN THE BELL SINGS.' },
    { id: 'hatch', at: [23, 10], radius: 2.5, speaker: 'SIGNAL HOUSE', text: 'That was not a station. That was a summons. Go: the tower on the ridge is next, and it is already ringing.' },
  ],
  triggers: [
    { id: 'p1', when: 'key:brass', do: [{ lights: 0.4 }, { objective: 'Brass fuse. Now the dormitory (south) and the attic (east)' }] },
    { id: 'p2', when: 'key:iron', do: [{ lights: 0.5 }, { wake: 'niche' }, { open: [12, 41] }, { open: [18, 41] }, { open: [24, 41] }, { shake: 0.7 }, { objective: 'Iron fuse. They were waiting in the walls. The attic is left (east)' }] },
    { id: 'p3', when: 'key:bell', do: [{ lights: 0.6 }, { objective: 'All three fuses. Back to the radio room, north of the atrium' }] },
  ],
  quality: { enemies: [30, 60], botSeconds: [80, 600], mechanics: ['heights', 'switches', 'triggers', 'closets'], skins: 6, enemyKinds: { sexton: 2 } },
};
