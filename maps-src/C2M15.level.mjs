// C2M15 ASH BASILICA: the elite gauntlet; Vael zealots who want the Grafting. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md.)
// PT-082 REDRAW (design/FUN_CHECK.md: a strip of five identical bays, 4278 cells, mirrored 0.96; "keep the five elite fights, make them five different rooms"). A basilica burned out and kept: ash-grey stone, soot
// to the vault. Ines, who grew up beside a slipway, reads the five STATIONS of the Grafting as the five stages of a launch, and each is now its own room, wound through the burned house: THE HAUL, the rope-walk
// (a long hall with a gallery 2 m up along its south side, a stair at each end; a Bulwark Shell and its porters); THE HOLD, the round chapter house (a ring of columns, the Weeping Mother on the dais in the
// middle); THE CHOCK, the low crypt of the cross (the crossing raised half a metre where the Acolyte stands, Zealots in the arms); THE FIT, the choir (stalls a metre up down both sides, a rank of Zealots
// across the aisle, Choristers behind); THE FLOAT, the crossing under the dome (a balcony round three sides, Choristers on it, the Warden-Graft on the floor). Each room's screen opens when everything in it is
// dead. The altar room is last; the exit behind it. Two secrets of two kinds: the crypt behind the rope-walk's west gallery (a panel) and a cell behind the cracked wall at the end of the cross's east arm.
import { Level } from '../tools/mapkit/builder.mjs';
import { placer } from '../tools/mapkit/c2.mjs';
import { sketch } from '../tools/mapkit/sketch.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';

const W = 64, H = 72, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const NH = 8, LID = 34;
// ---- the burned house, drawn: north is up. Floors 4 m up (h 8); galleries and balconies 2 m above them; the cross is roofed low ------------------------------------------------------------------------------------------------------------------------------------
const PLAN = String.raw`


                                     '        '''''''''''''''''
                             '''''''qXq''''''''bbbbbbbbbbbbbbb'
                             'xxxxxxxxxxxxxxxx'bbbKbbbbbbbKbbb'
                             'xxxxyyyyyyyyxxxx'bbaaaaaaaaaaabb'
                             'xxxxyyyyyyyyxxxx'bbaaaaaLaaaaabb'
                             'xxxxyyyyyyyyxxxx'bbaaaaaaaaaaabb'
                             'xxxxxxxxxxxxxxxx'aaaaaaaaaaaaabb'
                             'xxxxx$xxxxxxxxxxDaaaaaVaaaaaaa!b'
                             'xxx!xxxxxx+xxxxx'aaaaaaaaaaaaabb'
                             'xxxxxxxxxxxxxxxx'bbaaaTaaaaaaabb'
                             'xxxxxLxxxxLxxxxx'bba+aaaLaaaaabb'
                             'xxxxxxxxxxxxxxxx'bbaaaaa$aaaaabb'
                             'xxxxxxxxxxxxxxxx'uuaaaaaaaaaaauu'
                             ''''''''''''''''''21aaaaaaaaaaa12'
                                              '''''''''''aaa'''
                         ''''''''''''''''''''''''''''''''aaa
                         'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaaa
                         'eeeeHeeeeeeeeeeeeeeeeeeeeeeeeeea!a
                         'vaaaaaaaaaaaaaaaaaaaaaaaaaaaaavaaa
                         'aaaaaaaaaaaaaaQaaaaaaaaaaaaaaaa$aa
                         'aaaaaaGaaaaaaaaaaaaaaaaaaaaaaaa'aaa
                         'aaLaaaaaaaaaaaQaaaLaKaaaaaaaaaaDaaa
                         'aaaa+aaaaaaaaaaaaa$aaaaaaaaaaaa'aaa
                         'aaaaaaGaaaaaaaQaaaaaaaaaaaaaaaa'
                         'vaaaaaaaaaaaaaaaaaaaaaaaaaaaaav'
                         'eeeeeaaaeeKeeeeeeeeeeeee!eeeeee'
                         'eeeeeaaaeeeeeeeeeeeeeeeeeeeeeee'
                         '''''''a'''''''''''''''''''''''''
                             '''D'''
                             'ccccc'
            '''''            'ccLcc'
          ''aaaaa''          'c$ccc'
         'aaaaaaaaa'         'ccQcc'
        'aaaa|aaaaaa'        'ccccc'
       'aaaaaaaaaaTaa' '''''''cc+cc'''''''
       'aaaaaaaaaa|aa' '''''''ccccc'''''''
      'aaaaaadddaaaaaa''ccccccwwwwwcccccc'''''
      'aa|aadddddaaaaaa'ccLcccwwwwwcccQcc'kkk'
      'aaaaLddMddaLaaaaDccTcccwwAwwcccTccZkkk'
      'aaaaadddddaa|aaa'ccccccwwwwwcccLcc'kkk'
      'aaaaaadddaaaa+a''ccc$ccwwwwwcccccc'''''
       'aa|aaaaaaaaaa' '''''''ccccc'''''''
       'aaaaaaaaaaaaa' '''''''cc!cH'''''''
        'aaaaaa|aaaa'        'ccccc'
         'aaaaaa!aa'         'ccQ+c'
          ''aaaaa''          'ccccc'
           aaaaa'            'ccccc'
           a$aaa             '''''''
           aaa!a
       ''''''D''''''''''''''''''''''''''''
       'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
       'aaaaLaaaaaaaaaTaLaaaaaaaaaTaLaaaa'
       'aaaaaaaaGaaaaaaaGaaaaaaaaaaa+aaaa'
       'aaaaaa|aaaaa|aaaaa|aaaTaaa|aaaaaa'
       'aaaaUa|aaaaa|aaa$a|aaaaaaa|aaaGaa'
       'aaaaaaaaGaaaaaaaaaaaGaaaaaaaaaaaa'
       'aaaaaaaaaaaaaaGaaaaaaaaaaaaaaaaaa'
       '12ubbbbbbbbbbbbbbbTbbaaaaabbbbu21'
       '12ubbbbbbbbb!bbbbbbbbaaaaabbHbu21'
       '12ubbbbbbbbbbbbbbbbbbaaaaabbbbu21'
       '''''''S''''''''''''''''a''''''''''
            'hhh'          'nnnnnnn'
            'hhh'          'nnnnnnn'
            'hhh'          'nnnnnnn'
            '''''          'nnn@nnn'
                           'nnnnnnn'
                           'nnnnnnn'
                           '''''''''
`;
const T = (t, h, c) => ({ t, h, c });
const S = sketch(L, PLAN, {
  "'": { t: "'" }, '|': { t: '|' },
  n: T(')', NH, 24), a: T(')', NH, LID), b: T('f', NH + 4, LID), 1: T(')', NH + 1, LID), 2: T(')', NH + 2, LID), u: T(')', NH + 3, LID),          // the floors, the galleries, the gallery stairs
  d: T('^', NH + 1, LID), c: T(')', NH, NH + 6), w: T('^', NH + 1, NH + 7), e: T('f', NH + 2, LID), v: T(')', NH + 1, LID),                // the Mother's dais, the low cross and its chock, the choir stalls and their steps
  x: T('^', NH, LID), y: T('^', NH + 1, LID), q: T('^', NH, 20), h: T('^', NH + 4, NH + 10), k: T(')', NH, NH + 6),                         // the altar room, its dais, the stair out, the crypt, the cell
}, { marks: '@XDSZUMAVGTQKH$+!L' });
const P = placer(L), { E, P: PK, PR } = P; const [sx, sz] = S.one('@'); L.put(sx, sz, '@'); P.reserve(sx, sz);
const EXIT = S.one('X'), CRYPT = S.one('S'), CELL = S.one('Z');
L.secretPanel(CRYPT[0], CRYPT[1]); L.secretPanel(CELL[0], CELL[1]);
// ---- the five screens, in the order they are met; each room's keepers are its group ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SCREENS = S.at('D').map((p) => ({ p, k: p[1] > 45 ? 0 : p[0] < 26 ? 1 : p[1] > 26 ? 2 : p[0] > 50 ? 3 : 4 })).sort((a, b) => a.k - b.k).map((q) => q.p);
for (const [x, z] of SCREENS) L.door(x, z, { remote: true });
const roomOf = ([x, z]) => (z >= 52 ? 1 : x <= 23 && z >= 31 ? 2 : z >= 30 ? 3 : z >= 17 ? 4 : 5);
const g = (p) => ({ group: 's' + roomOf(p) });
for (const [ch, kind] of [['U', 'bulwark'], ['M', 'weeping'], ['A', 'acolyte'], ['V', 'wardengraft'], ['G', 'gaunt'], ['T', 'tollbearer'], ['K', 'chorister'], ['H', 'bellhand']]) for (const p of S.at(ch)) E(kind, p[0], p[1], g(p));
for (const p of S.at('Q')) E('zealot', p[0], p[1], { ...g(p), facing: roomOf(p) === 4 ? -Math.PI / 2 : 0 });
// ---- the burned house's furniture and supplies (ammunition comes from the dead; the galleries pay) ----------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('L')) PR('lamp', x, z);
for (const [x, z] of [[29, 18], [35, 18], [41, 18], [47, 18], [29, 28], [35, 28], [41, 28], [47, 28]]) PR('pew', x, z);                       // the choir's stalls
PR('organ', 33, 5); PR('organ', 42, 5); PR('lantern', 31, 64); PR('lantern', 31, 61); PR('lantern', 13, 49); PR('lantern', 24, 40); PR('lantern', 32, 31); PR('lantern', 58, 23); PR('lantern', 46, 10);
for (const [x, z] of S.at('$')) PK('health_large', x, z); for (const [x, z] of S.at('+')) PK('health_small', x, z); for (const [x, z] of S.at('!')) PK('armor_vest', x, z);
PK('armor_vest', 13, 63); PK('health_large', 15, 63); PK('ammo_shell', 13, 65); PK('ammo_rivet', 15, 65); PK('ammo_flare', 14, 63); PK('ammo_bolt', 14, 65);           // the crypt
PK('ld_pen_rivet', 43, 40); PK('health_large', 42, 39);                                                                                                // the cell
const ENC = new Encounters(L);
// PT-083 L2: the level floors
ENC.bypass({ from: [26, 23], to: [30, 9] }); // a sacristy passage
ENC.dropIn({ at: [32, 36], radius: 2, cells: [[31, 32], [33, 33]], kind: 'g' });                                           // sextons' boys out of the north arm's vault as you cross the chock
ENC.dropIn({ at: [42, 9], radius: 2.5, cells: [[33, 12], [38, 12]], kind: 'g' });                                          // and two more at the altar, the house's last word
const MAP = {
  // the opening (design/OPENING_VIEWS.md O2, 2026-11-16): the start faced a wall; it faces the way the route goes
  id: 'C2M15', name: 'Ash Basilica', version: 3, startFacing: 0.52, ceilingHeight: 4.2, par: { time: 660 },
  atmosphere: { look: 'basilica', fog: '#14100e', fogDensity: 0.012 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 12, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'ASH BASILICA', lines: ['A house of the Song, burned out and kept.', 'Five stations, five rooms. At each one, someone who wants the Grafting to go on.'] },
  outro: 'Behind the altar a stair goes down. The ash on it has been walked by many feet, all going the same way.',
  objective: 'Fight through the house, station by station. Each screen opens when the ones who hold it are dead',
  ...L.layers(),
  secrets: [{ id: 'crypt', panel: CRYPT, cells: [[13, 63], [14, 63], [15, 63], [13, 64], [14, 64], [15, 64], [13, 65], [14, 65], [15, 65]] }, { id: 'cell', panel: CELL, cells: [[42, 40], [43, 40]], open: 'shoot' }],
  groups: [],
  entities: [...P.ents, { type: 'exit', at: EXIT, dest: 'next' }],
  scenery: [],
  messages: [
    { id: 'start', at: [sx, sz], radius: 4, speaker: 'INES', text: 'Ash on the flags and soot to the roof. Everything that can burn has. The stone is still warm at the foot of the walls.' },
    { id: 'raised', at: [31, 58], radius: 4, speaker: 'HULL', text: 'There are galleries two metres up in most of these rooms, with stairs at their ends. High ground costs a flight of steps and gives you the room below.' },
    { id: 'haul', at: [24, 57], radius: 4, speaker: 'RINGING PLATE', text: 'First station, THE HAUL. Run a nail down it: the line is drawn in, hand over hand, by all of the ones who are able. It is owed.' },
    { id: 'slip', at: [17, 55], radius: 3, speaker: 'INES', text: 'Haul, hold, chock, fit, float. That\'s a launch. Five stages, in that order, on every slip I ever stood beside. They are launching something here.' },
    { id: 'hold', at: [14, 46], radius: 4, speaker: 'RINGING PLATE', text: 'Second station, THE HOLD. The line is made fast. It is not lost if it is held: the Mother holds it, and weeps, and does not let go.' },
    { id: 'chock', at: [27, 40], radius: 4, speaker: 'RINGING PLATE', text: 'Third station, THE CHOCK. A wedge is set and the wheel is stopped. The wheel is a person who has been asked to stand still.' },
    { id: 'fit', at: [32, 26], radius: 4, speaker: 'RINGING PLATE', text: 'Fourth station, THE FIT. The bell is fitted. A rank of the willing holds the one who is being fitted, so that it is done without fear.' },
    { id: 'zealot', at: [35, 23], radius: 4, speaker: 'INES', text: 'Spears in a rank, shoulder to shoulder, facing the far screen with their backs to me. They guard the one behind them from the ones in front.' },
    { id: 'float', at: [58, 14], radius: 4, speaker: 'RINGING PLATE', text: 'Fifth station, THE FLOAT. The first toll. After it the fitted one is no longer asked anything, because it has been answered.' },
    { id: 'hollow', at: [14, 60], radius: 2, speaker: 'HULL', text: 'The wall behind the west gallery rings hollow where a plate has been taken down.' },
    { id: 'crypt', at: [14, 64], radius: 3, speaker: 'A SILENT (NOTE)', text: 'The ones of this house who would not be fitted are put here. Their bells are on the wall, unfitted, in a row. Take what they left.' },
    { id: 'split', at: [38, 40], radius: 2, speaker: 'INES', text: 'The wall at the end of this arm has cracked in the heat, and there is a cell behind it. One shot would finish it.' },
    { id: 'found', at: [43, 40], radius: 1.5, speaker: 'INES', text: 'A sexton\'s cell. Rivets with hard points, a mend, and a blanket folded on a stone bed.' },
    { id: 'altar', at: [37, 9], radius: 4, speaker: 'INES', text: 'An organ with no pipes left but the lowest ones, and the lowest are warm. Somebody is still playing this house. Very slowly. One note a minute.' },
  ],
  triggers: [
    { id: 'gate1', when: 'dead:s1', do: [{ open: SCREENS[0] }, { objective: 'The first screen is open: the Weeping Mother holds the round room' }] },
    { id: 'gate2', when: 'dead:s2', do: [{ open: SCREENS[1] }, { objective: 'The second screen is open: an Acolyte and Zealots hold the cross' }] },
    { id: 'gate3', when: 'dead:s3', do: [{ open: SCREENS[2] }, { objective: 'The third screen is open: a rank of Zealots holds the choir' }] },
    { id: 'gate4', when: 'dead:s4', do: [{ open: SCREENS[3] }, { objective: 'The fourth screen is open: the dome, and a Warden-Graft' }] },
    { id: 'gate5', when: 'dead:s5', do: [{ open: SCREENS[4] }, { objective: 'The last screen is open. The altar and the exit are beyond' }] },
    { id: 'bay1', when: 'enter', at: [31, 57], radius: 4, do: [{ objective: 'The rope-walk: a Bulwark Shell and its porters hold the screen' }] },
  ],
  quality: { enemies: [30, 90], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 6, enemyKinds: { bulwark: 1, weeping: 1, acolyte: 1, zealot: 5, wardengraft: 1, chorister: 3, tollbearer: 8, gaunt: 8, bellhand: 2 },
    scaleClass: 'COMPRESSION', introduces: 'the elite gauntlet: five stations of the Grafting in five different rooms, each held by an elite or a rank (a Bulwark, the Weeping Mother, an Acolyte with Zealots, a rank of Zealots, a Warden-Graft), galleries for the high ground, and every screen opened by clearing the room' },
};
MAP.drops = { scale: 1, keep: [] };
ENC.apply(MAP);
console.log('C2M15: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'screens', SCREENS.map((p) => p.join(',')).join(' '));
const D = (x, z) => [x, z];
export const waypoints = {
  main: [[sx, sz, 0], [31, 62, 0], D(31, 56), D(22, 56), D(13, 55), [13, 52, 0], [13, 50, 0], D(14, 44), D(14, 36), D(19, 40), [22, 40, 0], [24, 40, 0], D(28, 40), D(32, 44), D(32, 35), [32, 31, 0], [32, 29, 0], D(32, 23), D(42, 23), D(52, 23),
    [56, 23, 0], [58, 23, 0], [58, 18, 0], [58, 15, 0], D(54, 11), D(50, 6), [49, 9, 0], [47, 9, 0], [45, 9, 0], D(37, 9), [37, 4, 0], [EXIT[0], EXIT[1], 0]],
};
waypoints.secret = (() => {
  const m = waypoints.main, a = m.findIndex((w) => Array.isArray(w) && w[0] === 13 && w[1] === 55), b = m.findIndex((w) => Array.isArray(w) && w[0] === 28 && w[1] === 40);
  return [...m.slice(0, a + 1), [8, 57, 0], [8, 60, 0], [11, 60, 0], [14, 61, 0], { op: 'use', at: CRYPT }, [14, 64, 0], [14, 61, 0], [11, 60, 0], [8, 60, 0], [8, 57, 0], ...m.slice(a + 1, b + 1), [36, 40, 0], { op: 'crack', at: CELL }, [43, 40, 0], [36, 40, 0], ...m.slice(b + 1)];
})();
export default MAP;
