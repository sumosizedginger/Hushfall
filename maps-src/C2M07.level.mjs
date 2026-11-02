// C2M07 BELLWRIGHT YARD: enemy factory denial; where the Bells are grown. (Campaign 2, Act A THRESHOLD; the new thing: SEEDS.)
// PT-082 REDRAW (design/FUN_CHECK.md: a perfect ring with a round hall in the middle, four sheds and four towers, mirrored). Drawn by hand as a working foundry: the start lane into the CASTING YARD (moulds
// stacked for cover, two sunken casting pits with steps), the long SOUTH SHED off it with two doors, the WEST SHED down a lane, the COAL YARD with its heaps west of the kiln and the barred YARD GATE in its far
// corner (the way out, seen early), the KILN HOUSE off-centre (an octagon of basalt, the furnace on a platform 2 m up, a gallery out of its east side), the TERRACE along the east 3 m up (a balcony over the yard, a
// ramp up from it, a watchtower), the EAST SHED on the terrace, and a stair down from the terrace's north end into the NORTH SHED, whose west door opens on the coal yard. A ring of walking round the kiln.
// A seed is a bell node (it takes a lot of damage to break) with a clock on it: at its time it CRACKS and a bell-bearer steps out of it (a trigger `time:` AND `not:dead:<seed>`), in the order the sheds are
// reached: south at 45 and 70 s, west at 100 and 125, east at 160 and 185, north at 220 and 245; a message warns twenty seconds before. Forks stand by each shed's door: a bell broken loudly rings them and the
// yard hears. The kiln's lever unbars the yard gate. Two secrets of two kinds: the bellwrights' store behind the west shed (a panel) and a cupboard behind the east shed's split wall (shoot it).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { placer } from '../tools/mapkit/c2.mjs';
import { sketch } from '../tools/mapkit/sketch.mjs';

const W = 68, H = 61, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
// ---- the yard, drawn: north is up. The ground is 1 m up (h 2) so the casting pits can be sunk into it; the furnace platform, the gallery and the terrace are 3 m up (h 6), the watchtower 5 m (h 10) ---------------------------------------------------
const PLAN = String.raw`


                         $$$$$$$$$$$$$$$$$$$$$$$$$$$$$
       $$$$$$$$ccccccBc  $nnnnnnnnnnnnnnnnnnnnnnnnnnn$
       $eeeeee$ccccccccccnnnLnnnnnNnnnnnnnnnNnnnnnnnn$
       $eXeeeeDccccccFc!cnnnnnnnnnnnnnnnnnHnnn+nnUnnn$
       $eeeeee$ccccccccccnnnnn&nnnnnTnnnnnnnnnnnnnLnn$
       $$$$$$$$cccTcccc  $nnnnnnnnnnnnnnnnnnnnnnnnnnn$
               cccccc    $$$$$$$$$$$$$$$$$$$$$$33333$$
               cc  cc                          44444
               cc  cc                          55555
               cc  cc      %%%%%%%%%%%%%%%%%%%tttttt
               ccccc+      %%%%fffffffffff%%%%ttYttt
               cccccc      %%%fffffffffffffU%%tttGtt
               cccccc      %%ffffPPPPPPPffff%%tttttt
               c cccG      %ff&ffPPPHPPPfffff%tttttt
    $$$$$      c cccc      %fLfffPPPPPPPggggggtttttt
    $hhh$      cccccc      %fffffPPPPPPPggHgggtttttR
    $hhh$      ccccccccccccffffffPPPLPPPggggggtttttt
    $hhh$      ccccccccccccffffffPPPPPPPfffff%tttttt
    $hhh$      cccc  ccccccffffffPPPPPPPfffff%ttttJt
   $$$S$$$       cc  cc    %ffffffuuuuufff+ff%tttttt
   $wwwww$       cc        %VfffffvvvvvffffLf%tt+ttt
   $wwwLw$       cccc      %ffffffxxxxxffffff%tttttt $$$$$$$$$$$
   $wwGww$       cHcc      %%fTfffffffffffTf%%tttttt $EEEEEEEEE$
   $wwwww$       cccc      %%%ffffffffff!ff%%%tttGtt $ELEEEEEEE$
   $wwNww$       cccc      %%%%fffffGfffff%%%%ttttttt$EEENE&EEE$$$$$
   $wwwww$       Ycc&      %%%%%%%%fff%%%%%%%%tttttttEEEEEEEEEE$ooo$
   $wwwww$       cccc              yyy        ttttFttEEEEEEEEEEZooo$
   $wwTww$       cccR              yyy        tttttttEEEEETEEEE$ooo$
   $wwwww$       cccc              yyy        ttttttt$EEEEEEEEE$$$$$
   $wwwww$        yyyyyyyyyyyyyyyyyyyyyyyyyyyytttttt $EEEEEENGE$
   $wwNww$        yyyyyyyyyyyyyyyyyyyyyy&yyyyytHtttt $EEEEEEELE$
   $wwwwwwyyyyyyRyyyyyyyyyyyyyyyyyyyTyyyy  yyytttttt $$$$$$$$$$$
   $wwwwwwyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy  yyyttttt! $$$$$$$$$$$
   $ww&Lwwyyyyyyyqqqqqyy   yyyyyyyyyyyyyyyyyyytttttB
   $wwwww$    yyyqqGqqzy   yyyyyyyyyyyyyyyyRyytHtttt
   $$$$$$$    yyyqqqqqzy    yyJyyyyyyyyyyyyyyytttttt
              yyyqqqqqyyyyyyyyyyyyyyyGyyyyyyyyttttYt
              yyyyyyyyyyyyyGyyyyyyyyyyyyyyyyB ttttttt   WWWW
              yGyyyyyyyyyyyyyyyyyyyyyyyyyyyyy tttttTt789WWWW
              yyFyyyyyyyyyyyyqqqqqyyyyyyTyyyy345ttttt78JWHWW
              yyyyyyyyyyyyyyzqqqqqyyyyyyyyyyy345ttttt789WW+W
              yyyyyyTyyyyyyyzqqTqqyyyyyyyyyyy345ttttt   WWWW
                yyyyyyyyyyyyyqqqqqy+         345tt&t
                yyyyyyyyyyyyyyyyyyyy          tttttt
     yyyyyy&yyyyyyyyyyyyKyFyyyyyyyyy          Rttttt
     yyyyyyyyyyy+yyyyyyyyyyyyyyyyy!y
     yyyy       yyyyyyyyyyyyyyyyyyyy
     yyyy      $$$$ss$$$$$$$$$$$ss$$$$
     y+yy      $sssssssssssssssssssss$
     yyyy      $ssLsssNsssssssNsssLss$
     yyyy      $ssssGsssssHssssssssss$
     yyyy      $sssssssssssssssssssss$
     yyyy      $$$$$$$$$$$$$$$$$$$$$$$
     yyyy
     y@yy
     yyyy
     yyyy
`;
const F = (t, h, lid = null) => (lid == null ? { t, h } : { t, h, lid });
const S = sketch(L, PLAN, {
  '$': { t: '$' }, '%': { t: '%' },
  y: F('m', 2), q: F('m', 0), z: F('m', 1), c: F('k', 2),                                                            // the casting yard, its pits and their steps, the coal yard
  s: F('k', 2, 9), w: F('k', 2, 9), n: F('k', 2, 9), E: F('k', 6, 9), h: F('k', 2, 8), o: F('k', 6, 7), e: F('f', 2, 9),     // the sheds (the east one on the terrace), the store, the cupboard, the exit passage
  f: F('f', 2, 16), P: F('f', 6, 12), u: F('f', 5, 13), v: F('f', 4, 14), x: F('f', 3, 15), g: F('f', 6, 12),      // the kiln house: its floor, the furnace platform, the platform's stair, the gallery
  t: F('k', 6), 3: F('k', 3), 4: F('k', 4), 5: F('k', 5), 7: F('d', 7), 8: F('d', 8), 9: F('d', 9), W: F('d', 10),   // the terrace, the ramps and stairs, the watchtower
}, { marks: '@XVDSZNFTGHJUK&+!LYRB' });
const P = placer(L), { E, P: PK, PR } = P; const [sx, sz] = S.one('@'); L.put(sx, sz, '@'); P.reserve(sx, sz);
const GATE = S.one('D'), STORE = S.one('S'), CUPBOARD = S.one('Z'), EXIT = S.one('X'), [vx, vz] = S.one('V');
L.door(GATE[0], GATE[1], { remote: true }); L.secretPanel(STORE[0], STORE[1]); L.secretPanel(CUPBOARD[0], CUPBOARD[1]);
// ---- the seeds: bell nodes, two to a shed, in the order they ripen; a bearer steps out on the side of the shed's door -------------------------------------------------------------------------------------------------------------------------------------------
const shedOf = ([x, z]) => (z >= 49 ? 0 : x <= 9 ? 1 : x >= 53 ? 2 : 3), OUT = [[0, -1], [1, 0], [-1, 0], [0, 1]], TIMES = [[45, 70], [100, 125], [160, 185], [220, 245]];
const SEEDS = []; for (let k = 0; k < 4; k++) S.at('N').filter((p) => shedOf(p) === k).sort((a, b) => a[0] - b[0] || a[1] - b[1]).forEach(([x, z], j) => SEEDS.push({ x, z, t: TIMES[k][j], out: [x + OUT[k][0], z + OUT[k][1]] }));
SEEDS.forEach(({ x, z }, i) => E('bellnode', x, z, { group: 'seed' + i }));
// ---- the yard's keepers -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [ch, kind] of [['T', 'tollbearer'], ['G', 'gaunt'], ['H', 'bellhand'], ['J', 'gill'], ['U', 'bulwark'], ['K', 'sexton']]) for (const [x, z] of S.at(ch)) E(kind, x, z);
// ---- the forks by each shed's door (a cluster of three): a broken seed rung out loud calls the yard ------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('F')) { PR('resonator', x, z); PR('resonator', x + 2, z + 1); PR('resonator', x + 1, z - 2); }
// ---- supplies and furniture ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('&')) PK('health_large', x, z); for (const [x, z] of S.at('+')) PK('health_small', x, z); for (const [x, z] of S.at('!')) PK('armor_vest', x, z);
for (const [x, z] of S.at('L')) PR('lamp', x, z); for (const [x, z] of S.at('Y')) PR('lantern', x, z); for (const [x, z] of S.at('R')) PR('crate', x, z); for (const [x, z] of S.at('B')) PR('barrel', x, z);
PR('vat', 36, 17);                                                                                                             // the furnace, on its platform
PK('armor_vest', 5, 17); PK('health_large', 7, 17); PK('ammo_shell', 5, 19); PK('ammo_rivet', 7, 19); PK('ammo_flare', 6, 18);         // the bellwrights' store
PK('ld_pen_carbine', 65, 28); PK('armor_vest', 64, 27);                                                                           // the cupboard
const warn = (i, t) => ({ id: 'warn' + i, when: ['time:' + (t - 20), 'not:dead:seed' + i], do: [{ message: 'ripening' }] });
const crack = (i, at, t) => ({ id: 'crack' + i, when: ['time:' + t, 'not:dead:seed' + i], do: [{ spawn: { kind: i % 2 ? 'gaunt' : 'tollbearer', at, group: 'born' } }, { message: 'cracked' }] });
const ENC = new Encounters(L);

const MAP = {
  id: 'C2M07', name: 'Bellwright Yard', version: 2, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { fog: '#b08060', fogDensity: 0.007, sky: 'anselm', look: 'bellwright' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'BELLWRIGHT YARD', lines: ['The Vael do not cast their bells. They grow them.', 'Every one of these is waiting for someone.'] },
  outro: 'Next: the Threshold Ascent, a city built up a cliff of glass, and the shaft in the middle of it.',
  objective: 'The kiln house and its lever unbar the yard gate in the coal yard. Break the bells before they crack',
  ...L.layers(),
  secrets: [{ id: 'spares', panel: STORE, cells: [[5, 17], [6, 17], [7, 17], [5, 18], [6, 18], [7, 18], [5, 19], [6, 19], [7, 19], [5, 20], [6, 20], [7, 20]] }, { id: 'cupboard', panel: CUPBOARD, cells: [[64, 28], [65, 28]], open: 'shoot' }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'quench', at: [vx, vz], wall: 'west', once: true, do: [{ open: GATE }, { message: 'quench' }, { objective: 'The yard gate is open: the north-west corner of the coal yard' }, { shake: 1.5 }] },
    { type: 'exit', at: EXIT, dest: 'next' }],
  scenery: [{ kind: 'spire', at: [8, -6] }, { kind: 'spire', at: [66, -4] }, { kind: 'spire', at: [38, -18] }],
  messages: [
    { id: 'start', at: [sx, sz], radius: 3, speaker: 'INES', text: 'A yard round a kiln. Long sheds, a coal yard, a tower on a terrace, and a furnace the size of a house. The air tastes of hot metal.' },
    { id: 'seeds', at: [22, 47], radius: 3, speaker: 'INES', text: 'Bells on stands in the shed, green with new bronze, ringing very faintly. They weren\'t cast. Each is for somebody who hasn\'t been brought here yet.' },
    { id: 'forks', at: [27, 44], radius: 3, speaker: 'HULL', text: 'Forks stand at every shed door. A bell broken with a rifle rings them, and the yard hears. A blow, the arc lamp and the tuning-fork gun are quieter.' },
    { id: 'tally', at: [6, 28], radius: 2.5, speaker: "BELLWRIGHT'S TALLY", text: 'THE MARROW ORDER. 311 BELLS GROWN. 311 HUNG. FOUR SPARE.' },
    { id: 'hollow', at: [6, 23], radius: 2, speaker: 'HULL', text: 'The north wall of the west shed rings hollow.' },
    { id: 'gate', at: [19, 6], radius: 3, speaker: 'HULL', text: 'The yard gate, in the corner of the coal yard. It is barred, and the bar is worked from the kiln house.' },
    { id: 'ripening', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'A bell in one of the sheds has begun to ring louder. When it cracks, a bell-bearer steps out of it. Break it first.' },
    { id: 'cracked', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'A bell cracks, and something steps out of it.' },
    { id: 'kiln', at: [36, 29], radius: 3, speaker: 'INES', text: 'The furnace is banked with salt, not out. The lever on the kiln house wall is the only thing in here that isn\'t hot.' },
    { id: 'quench', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The lever drops. Out in the coal yard, the bar falls out of the gate.' },
    { id: 'split', at: [61, 28], radius: 2, speaker: 'INES', text: 'The back wall of this shed has split, and warm air comes through the split. A shot would bring it down.' },
    { id: 'spare', at: [65, 28], radius: 1.5, speaker: 'INES', text: 'A bellwright\'s cupboard: carbine rounds with hard tips, a vest, and a small bell with no name in it yet.' },
  ],
  triggers: [
    { id: 'kiln', when: 'enter', at: [36, 29], radius: 3, do: [{ objective: 'The kiln house: the lever is on its west wall' }] },
    ...SEEDS.flatMap(({ t, out }, i) => [warn(i, t), crack(i, out, t)]),
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 700], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 5, enemyKinds: { tollbearer: 8, gaunt: 5, bellhand: 4, bulwark: 1, bellnode: 8 },
    scaleClass: 'MIXED', introduces: 'seeds: bells that ripen on a clock and crack a bell-bearer out of themselves unless broken first, in sheds with forks at their doors, so a loud kill calls the yard and a quiet one does not' },
};
MAP.drops = { scale: 1.3, keep: [] };
ENC.apply(MAP);
console.log('C2M07: enemies', P.ents.filter((e) => e.type === 'enemy').length);

const D = (x, z) => [x, z];
export const waypoints = {
  main: [[sx, sz, 0], D(6, 48), D(14, 46), D(22, 46), D(28, 40), D(36, 33), [36, 28, 0], D(36, 25), D(31, 23), { op: 'switch', id: 'quench' }, [36, 25, 0], [36, 22, 0], D(36, 17), [42, 17, 0], [46, 17, 0], D(49, 22), D(49, 28), [53, 28, 0], D(57, 29), [53, 28, 0],
    D(49, 20), D(49, 13), [49, 10, 0], [49, 8, 0], D(46, 5), D(38, 5), D(30, 5), [25, 5, 0], D(20, 5), [15, 5, 0], [EXIT[0], EXIT[1], 0]],
};
waypoints.secret = (() => {
  const m = waypoints.main, a = m.findIndex((w) => Array.isArray(w) && w[0] === 14 && w[1] === 46), b = m.findIndex((w) => Array.isArray(w) && w[0] === 57 && w[1] === 29);
  return [...m.slice(0, a + 1), [12, 34, 0], [9, 34, 0], D(6, 30), [6, 23, 0], { op: 'use', at: STORE }, [6, 19, 0], [6, 23, 0], [9, 34, 0], [12, 34, 0], ...m.slice(a + 1, b + 1), [60, 28, 0], { op: 'crack', at: CUPBOARD }, [65, 28, 0], [60, 28, 0], ...m.slice(b + 1)];
})();
export default MAP;
