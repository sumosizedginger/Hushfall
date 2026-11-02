// C2M11 UNDERCANTOR HALLS: politics through architecture; the Vael are divided. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md.)
// PT-082 REDRAW (design/FUN_CHECK.md: 3851 cells, eight creatures a thousand, four empty rooms). The same palace of two wings round one seat, drawn by hand at half the size: the VESTIBULE and the GRAND STAIR up
// to the COLONNADE (open to the cave roof, two rows of pillars), and from it two ways north. WEST, the Songkeepers' GALLERY: marble, a red carpet, columns in pairs, Zealots in ranks, a BALCONY along its west wall
// where two Choristers sing down (a stair up at the south, a drop at the north: the loop), and the DAIS where the two captains stand before the west gate. EAST, the Silent's halls: rooms like bowls joined in a RING
// (two ways round), flowstone under bone-coral, a lantern in each, a few sleepers and a few of the Silent sitting; the east gate at their end is on a sound-lock and opens for someone who has been quiet.
// Both gates open on the SEAT; its chair's arm is the lever of the exit. Going through a gate RECORDS THE CHOICE (`choose`): C2M12 and the Gardens answer it. Two secrets of two kinds: a cell off the far
// room (a panel) and a cracked wall off the first room (shoot it).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { placer } from '../tools/mapkit/c2.mjs';
import { sketch } from '../tools/mapkit/sketch.mjs';

const W = 74, H = 68, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const S0 = 0, F = 10;                                                                                                  // the colonnade, the wings and the seat are 5 m above the vestibule
// ---- the palace, drawn: north is up ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const PLAN = String.raw`

                                    qXq
                           |||||||||qqq||||||||
                           |xxxxxyyyyyyyxxxxx||
                           |xxxxxyyyyyyyxxxxx||
                           |xxxxxyyyyyyyxxxxx||
                           |xxxxxxxxxxxxxxxxV||
        ||||||||||||||||||||xxxxxxxxxxxxxxxxx||"""
        |gddddddddddddddddg|xxxxxxxQxxxxxQxxx|eee*
        |gddddPddddddPddddgWxxxxxxxxxxxxxxxxxEeee"
        |guuuuuuuuuuuuuuuug|xxxxxxxxxxxxxxxxx|eee*
        |gggggggCCCCggggggg|xxxxxxxxxxxxxxxxx|eee""
        |gggggggCCCCgggg$gg|xxxxYxxxxxxx$xYxx|eeee*****
        |ggg||ggCCCCgg||ggg|xxxxxxxxxxxxxxxxx||eee"eee"""
        |bbb||ggCCLCgg||ggg|xxxxxxxxxxxxxxxxx||eeeeeeeee**
        |bbbggggCCCCggggggg||||||||||||||||||||"eeeeeee!e""
        |bLbgTggCCCCggggTgg|                  *eeeFeYeeeee*
        |bbbggggCCCCggggggg|                  "eeeeeGeeeee"
        |bbbggggCCCCggggggg|                  *e+eeeeeeFee***
        |bbb||ggCCCCgg||ggg|                  ""eeeeeeeeeeee""""
        |bKb||ggC+CCgg||ggg|                   **eeeeeeeeeeeeee***
        |bbbggggCCCCggggggg|                    "eeeee""eeeeeeeee""
        |bbbggggCCLCggggg!g|                    *eee****eeeeee$eee"""""
        |bbbggggCCCCggggggg|                    "eee"  ""eeJeYeFee"hhh"
        |bb+ggggCCQCggggggg|                    *eee*   *eeeeeeeeeShhh"
        |bbb||ggCCCCgg||ggg|                    "eFe"   "eeeeeeeee"hhh"
        |bbb||ggCCCCgg||ggg|                    *eee* ***eeeFHeeee"""""
        |bbbggggCCCCggggggg|                    "eee" "eeeeeeeeee""
        |bKbggHgCCCCggggGgg|                    *eee***eeFe*eee***
        |bbbggggCCCCggggggg|                   ""eeeeeeeeee"""""
        |bbbggggCCLCggggggg|                   *eeeeeeeeeee*
        |bLb||QgCCCCgQ||ggg|              """"""eeeeYeeTe"""
        |bbb||ggCCCCgg||ggg|              "kkk"eeeFeeeeeee*
        |bbbggggCCCCggggggg|              "kkkZeeeeeeeeeee"
        |333ggggCCCCGgggggg|              "kkk"eeeeeGeeeee*
        |222ggggCCCCggggggg|              """"""eeeeeeeFe""
        |111gTggCCLCggggTgg|                   *eeeeee+ee*
        |gggggggCCCC$gggggg|                   """eeeee"""
        |gggggggCCCCggggggg|                     *eeeee*
        |||||||gggggg|||||||                     "eeeee"
        |||||||gggggg|||||||                     *eeeee*
         ||||||gggggg|||||||||||||||||||||||||||||eeeee|||||||||||
         |ooooooooooooooooooooooooooooooooooooooooooooooooooooooo|
         |ooooooooooooooooooooooFoooooooooooooooooooooooooooooooo|
         |oooo|ooooooo|ooooooo|ooooooooooooo|ooooooo|oooooJo|oooo|
         |ooHoooooYoooooToYoooooooooooooooooooooYooooooFYoooooooo|
         |ooooooooooooooooooooo+ooooooooooooooooooToooooo+ooooooo|
         |oooo|oGooooo|ooooFoo|ooooooooooooo|oFooooo|ooooooo|oHoo|
         |ooooooooooooooooooooooooooo!ooooooooooooooooooooooooooo|
         |ooooooooooooooooooooooooooooooooooooooooooooooooooooooo|
         |||||||||||||||||||||||||zzzzzzz|||||||||||||||||||||||||
                                  zzzzzzz
                                  zzzzzzz
                                  zzzzzzz
                                  zzzzzzz
                                  zzz$zzz
                                  zzzzzzz
                                  zzzzzzz
                                  zzzzzzz
                                  zzzzzzz
                              ||||zzzzzzz||||
                              |vvvvvvvvvvvvv|
                              |vvYvvvvvvvYvv|
                              |vvvvvv@vvvvvv|
                              |vvvvvvvvvvvvv|
                              |vvvvvvvvvvvvv|
                              |||||||||||||||
`;
const T = (t, h, c) => ({ t, h, c });
const S = sketch(L, PLAN, {
  '|': { t: '|' }, '"': { t: '"' }, '*': { t: '*' },
  v: T('^', 0, 22), z: { t: '^', h: (x, z) => Math.max(0, Math.min(F, 60 - z)), c: 26 }, o: { t: 's', h: F },            // the vestibule, the grand stair, the colonnade (open)
  g: T('^', F, 30), C: T('c', F, 30), d: T('^', F + 2, 32), u: T('^', F + 1, 31), b: T('^', F + 4, 30), 1: T('^', F + 1, 30), 2: T('^', F + 2, 30), 3: T('^', F + 3, 30),   // the gallery, its carpet, the dais, the balcony and its stair
  x: T('^', F, 34), y: T('^', F + 1, 35), q: T('^', F + 1, 30),                                                         // the seat, its dais, the stair down behind it
  e: { t: '{', h: F, lid: 14 }, h: { t: '^', h: F, lid: 12 }, k: { t: '{', h: F, lid: 12 },                           // the Silent's halls, the cell, the cracked room
}, { marks: '@XVWESZTGHKQPFJ$+!YL' });
const P = placer(L), { E, P: PK, PR } = P; const [sx, sz] = S.one('@'); L.put(sx, sz, '@'); P.reserve(sx, sz);
const WG = S.one('W'), EG = S.one('E'), CELL = S.one('S'), CRACK = S.one('Z'), EXIT = S.one('X'), [vx, vz] = S.one('V');
L.door(WG[0], WG[1], { remote: true }); L.door(EG[0], EG[1], { soundlock: { quiet: 6, radius: 36 } }); L.secretPanel(CELL[0], CELL[1]); L.secretPanel(CRACK[0], CRACK[1]);
// ---- the household ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [ch, kind] of [['T', 'tollbearer'], ['G', 'gaunt'], ['H', 'bellhand'], ['K', 'chorister'], ['J', 'gill']]) for (const [x, z] of S.at(ch)) E(kind, x, z);
for (const [x, z] of S.at('Q')) E('zealot', x, z, { facing: 0 });
for (const [x, z] of S.at('P')) E('zealot', x, z, { facing: 0, group: 'captains' });
for (const [x, z] of S.at('F')) E('vaelfolk', x, z, { facing: (x * 7 + z) % 6 });
// ---- supplies and light ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('$')) PK('health_large', x, z); for (const [x, z] of S.at('+')) PK('health_small', x, z); for (const [x, z] of S.at('!')) PK('armor_vest', x, z);
for (const [x, z] of S.at('Y')) PR('lantern', x, z); for (const [x, z] of S.at('L')) PR('lamp', x, z);
PK('armor_vest', 67, 23); PK('health_large', 69, 23); PK('ammo_shell', 67, 25); PK('ammo_rivet', 69, 25); PK('ammo_flare', 68, 23); PK('ammo_bolt', 68, 25);          // the cell
PK('ld_pen_harpoon', 44, 33); PK('health_large', 43, 32);                                                                                                   // the cracked room
const ENC = new Encounters(L);
ENC.dropIn({ at: [17, 37], radius: 2.5, cells: [[13, 33], [24, 33], [20, 30]], kind: 'g' });
ENC.dropIn({ at: [17, 18], radius: 2.5, cells: [[14, 22], [24, 23], [20, 15]], kind: 'g' });

const MAP = {
  id: 'C2M11', name: 'Undercantor Halls', version: 2, ceilingHeight: 4.2, par: { time: 540 },
  atmosphere: { look: 'halls', sky: 'deep', fog: '#10121c', fogDensity: 0.008 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'UNDERCANTOR HALLS', lines: ['A palace in two halves, and one seat between them.', 'The west wing keeps the count. The east wing keeps the ones who will not.'] },
  outro: 'The seat is empty. The stair behind it goes down, and whichever way you came, someone in this house will tell the next what you did.',
  objective: 'Climb the grand stair to the colonnade. Two wings lead to the seat: the west is the Songkeepers, the east is the Silent',
  ...L.layers(),
  secrets: [{ id: 'cell', panel: CELL, cells: [[67, 24], [68, 24]] }, { id: 'kept', panel: CRACK, cells: [[45, 33], [44, 33]], open: 'shoot' }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'seat', at: [vx, vz], wall: 'east', once: true, do: [{ exit: { set: 'unlock' } }, { objective: 'The chair has opened the stair: the exit is behind the dais' }, { message: 'chair' }] },
    { type: 'exit', at: EXIT, dest: 'next', locked: true }],
  scenery: [],
  messages: [
    { id: 'start', at: [sx, sz], radius: 4, speaker: 'INES', text: 'A hall of cold marble with bronze bands, and a stair as wide as a slipway. Nobody on it. Somebody has swept it.' },
    { id: 'plate-w', at: [37, 51], radius: 3, speaker: 'RINGING PLATE', text: 'West: the count is kept here. East: those who are not counted. The plate offers no third door.' },
    { id: 'hub', at: [37, 46], radius: 4, speaker: 'HULL', text: 'The wings meet at the seat in the north. The west gate opens when the two captains are dead. The east gate is on a sound-lock and opens for someone who has been quiet.' },
    { id: 'gallery', at: [17, 40], radius: 4, speaker: 'INES', text: 'Spears in ranks down a red carpet, all of them looking at the door I am standing in. Somebody knew somebody would come this way.' },
    { id: 'plate-c', at: [17, 16], radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: the ranks are numbered, and the number of the dead is cut into the same plate, in the same hand, a little lower.' },
    { id: 'captains', at: [17, 12], radius: 4, speaker: 'INES', text: 'Two on the dais, standing very still, and a gate in the wall behind them. The gate is the only door in the room that is not a way out.' },
    { id: 'low', at: [52, 40], radius: 4, speaker: 'INES', text: 'It is darker here, and it smells of oil and a cold hearth. Rooms like bowls, one after another, and a lantern in each, turned low.' },
    { id: 'silent1', at: [51, 32], radius: 3, speaker: 'A SILENT', text: 'I stopped singing the day the count was read. They have not asked me again. We are kept here because we are not worth the stair.' },
    { id: 'silent2', at: [61, 25], radius: 3, speaker: 'A SILENT', text: 'Put down the gun in the rooms ahead. The gate at the end listens, and I do not think it listens for you.' },
    { id: 'silent3', at: [52, 17], radius: 3, speaker: 'A SILENT', text: 'You are the one with no ear for it. We heard. Nobody here will ring for you, and nobody will stop you.' },
    { id: 'hollow', at: [65, 24], radius: 2, speaker: 'HULL', text: 'The east wall of the far room rings hollow behind the lantern.' },
    { id: 'cell', at: [68, 24], radius: 2, speaker: 'A SILENT (NOTE)', text: 'Four tins, a pair of boots and a cloak. Left for whoever the Marrow crew sent after them. They did not come this way.' },
    { id: 'split', at: [48, 33], radius: 2, speaker: 'INES', text: 'The west wall of this room has cracked across, and someone has pushed a rag into the crack to keep the draught out.' },
    { id: 'kept', at: [44, 33], radius: 1.5, speaker: 'INES', text: 'A store behind the crack: harpoon bolts with hard heads, and a mend. The Silent keep them and will not use them.' },
    { id: 'seat', at: [37, 8], radius: 5, speaker: 'INES', text: 'The seat is a stone chair on a dais, and the stone is worn at the arms. It has been sat in a long time. Not today.' },
  ],
  triggers: [
    { id: 'wing-w', when: 'enter', at: [WG[0] - 1, WG[1]], radius: 1.6, do: [{ choose: { id: 'halls', value: 'songkeepers' } }, { objective: 'Through the west gate: the seat. Its chair opens the stair' }] },
    { id: 'wing-e', when: 'enter', at: [EG[0] + 1, EG[1]], radius: 1.6, do: [{ choose: { id: 'halls', value: 'silent' } }, { objective: 'Through the east gate: the seat. Its chair opens the stair' }] },
    { id: 'captains-down', when: 'dead:captains', do: [{ open: WG }, { objective: 'The captains are down and the west gate is open' }, { message: 'open-w' }] },
    { id: 'colonnade', when: 'enter', at: [37, 46], radius: 5, do: [{ objective: 'The colonnade: west is a fight, east is the quiet way' }] },
  ],
  quality: { enemies: [25, 60], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { zealot: 6, tollbearer: 6, gaunt: 5, chorister: 2, bellhand: 2 },
    scaleClass: 'MIXED', introduces: 'a choice by architecture: two wings of one palace, a fight through the Songkeepers or a quiet way through the Silent, and the game remembers which gate you went through' },
};
MAP.messages.push({ id: 'chair', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The arm of the chair is a lever. Whoever sits here decides who goes down, and the stair was cut for a long line of them.' });
MAP.messages.push({ id: 'open-w', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The west gate has opened. It was held by the captains, not by a lock.' });
MAP.drops = { scale: 1, keep: [] };
ENC.apply(MAP);
console.log('C2M11: enemies', P.ents.filter((e) => e.type === 'enemy' && e.kind !== 'vaelfolk').length, 'folk', P.ents.filter((e) => e.kind === 'vaelfolk').length);

const D = (x, z) => [x, z];
export const waypoints = {
  main: [[sx, sz, 0], [37, 58, 0], [37, 51, 0], D(37, 46), D(24, 46), D(17, 44), [17, 40, 0], D(17, 36), D(17, 28), D(17, 20), D(17, 13), D(24, 11), [WG[0] - 1, WG[1], 0], [WG[0] + 1, WG[1], 0], D(36, 9), D(vx - 1, vz), { op: 'switch', id: 'seat' }, [37, 3, 0], [EXIT[0], EXIT[1], 0]],
  secret: [[sx, sz, 0], [37, 58, 0], [37, 51, 0], D(37, 46), D(52, 45), [52, 40, 0], D(52, 35), [48, 33, 0], { op: 'crack', at: CRACK }, [44, 33, 0], [48, 33, 0], D(56, 29), D(61, 25), [65, 24, 0], { op: 'use', at: CELL }, [68, 24, 0], [64, 24, 0],
    D(58, 21), D(52, 17), [48, 13, 0], [47, 10, 0], [EG[0] + 1, EG[1], 0], { op: 'use', at: EG }, [EG[0] - 1, EG[1], 0], D(40, 9), D(vx - 1, vz), { op: 'switch', id: 'seat' }, [37, 3, 0], [EXIT[0], EXIT[1], 0]],
};
export default MAP;
