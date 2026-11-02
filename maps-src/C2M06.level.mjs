// C2M06 CHITIN AQUEDUCT: water-traversal combat; the Vael lifeline. (Campaign 2, Act A THRESHOLD; the first use of CURRENT.)
// PT-082 REDRAW (design/FUN_CHECK.md: three parallel strips in a Z, three corridors). Drawn by hand as the course of the water, climbed UPSTREAM the whole way: the OUTFALL BASIN where you start, the LOW CHANNEL
// running west, the WEIR (the water falls down a ramp: climb it), the RESERVOIR with a pumphouse on an island and a window up to the top channel 3 m above, the AQUEDUCT BRIDGE east across a dry RAVINE (the
// bridge's south side is a 3 m drop into it), the roofed TOWER (the water falls down a second weir inside it from the top channel; a dry stair goes down to a lower hall that opens on the ravine: the loop), the TOP
// CHANNEL running back west, and the SIPHON HALL with the lever and the door to the exit. Wading water pushes (with it you fly, against it you crawl) and carries what wakes in it down to you; the arc lamp conducts
// through it. Two secrets of two kinds: the keepers' store behind the basin's south wall (a panel) and a grotto behind the ravine's cracked west face (shoot it).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { placer } from '../tools/mapkit/c2.mjs';
import { sketch } from '../tools/mapkit/sketch.mjs';

const W = 64, H = 58, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true; L.usedFx = true;
// ---- the water's course, drawn: north is up. The basin, low channel and ravine on the ground; the reservoir, bridge and tower gallery 3 m up (h 6); the top channel and the siphon 6 m up (h 12). Water cells carry their flow ----------------
const PLAN = String.raw`
    *****
    *eXe*
    *eee*
 *****D******
 *hhhhhhhVhh?
 *hLhhhhhhhh?????????????????????????????????????????????????
 *hGhhhhhh$hnnnnnnnnnnntttttRtttttttttttttttttt?nnYnnnnnnnn??
 *hh*****hhhnnnnnnnnnnntttttttJtttGttttttt+tttHnnnnnnnnnnnn??
 *hh*****hhhmmmmmmmmmmm^^^J^^^^^^^^^^^^^^^^^^^^mmmmmmmmmmmm??
 *hh*****hhhmmmmmmmmmmm^^^^^^^^^^^^^^^^^T^^^^^^mmmmmmmmmmmm??
 *hh*****hhhmmmmmmmmmmm^^^^^^^^^^^^^^^^^^^^^^^^mmmmmmmmmmmm??
 *hhhhhhhhhhnnnnnnnnGnnttttttttttttttttttttttttnnnnnnnnnnnn??
 *h+hhUhThLhnnnnnnnnnnnttt$ttt!tttYtttttttttttt?nnnnnnnnnnn??
 *h???????????rrrrYrrrr???????????????????????????cccccc?????
 **???rrrrrrrrrrrrrrrrrrrrr?                   ???cccccc?????
   ???Lrrrrrrrrrrrrrrrrr!rr?                   ???cccccc?????
   ???+rrrrrrrrrrrrrrrrrrrr?                   ???cccccc?????
   ???rrrrrrrrrrrrrrrrrrrrr?                   ???cccccc?????
   ???rr{{{{{{{{J{{{{{{{{rr?                   ???cccccc?????
   ???rr{{{{{{{{{{{{{{{{{rr?                   ???cccccc?????
   ???rr{{{{T{{??????{{{{rr?                   ?ggggggggYgg??
   ???rr{{{{{{{?ppYp?{{{{rr?????????????????????ggggggggg$g??
   ???rr{{{{{{{?pHppp{{{{rrbbbbbbbbbbbJbbbbbbbbbggggUgggggg??
   ???rr{{{{{{{?pppp?{{{{rr{{{{{{{G{{{{{{{{{{{{{ggggggggggg??
   ???rrG{{{{{{??????{{{{rr{{{{{{{{{{{{{T{{{{{{{gggggggTggg??
   ???rr{{{{{{{{{{{{{{{{{rrbbbLbbbbbbbbbbbbb$bbbggggggggggg??
   ???}}}}}}}}{{{{{{T{{{{rr?? vvvvvvvvvvvvvvv  ?gggg!ggggRg??
   ???}}}}}}}}{{{{{{{{{{{rr?  vvvvvvvvvvvvvvv  ????????ssss??
   ???}}}}}}}}rrrrrrrrrrrrr?  vvvvvvvvvvHvvvv  ????????ssss??
   ???}}}}$}}}rrrrrrrrrrrLr?  vvvvvGvvvvvvvvv  ????????ssss??
   ???}}}}}}}}rrrrrrrrrrRrr?  vvvvvv     vvvv  ????????ssss??
   ???WWWWWWW???????????????  vvvvvv     vvvv  ????????ssss??
     ?WWWHWWW?           ?????vvvvvv     vvvv  ????????ssss??
     ?WWWWWWW?           ?ooo?vvvvvv     vvvvvlllllllllllll??
     ?WWWWWWW?           ?oooZvvvvvvvvvvvvvvvvlllllllllllll??
     ?WWWTWWW?           ?ooo?vvvvvvvvvvvvGvvvllllllJllllll??
     ?WWWWWWW?           ?????vv+vvvvvvvRvvvvvlllllllllllll??
     ?WWWWWWW?                vvvvvvvvvvvvvvv  ?Yl+llllllLl??
     ?WWWWWWW?                vvvvvvvvvvvvvvv  ??????????????
     ?????????????????????????vvvvvvvvvvvvvvvv???????????????
     ?kkkkkkkkkkkkkkkkkkHkkkkkkkkkkkkkkkkkkkk??????????????????
     ?kkLkkkkkkkkkkkkkkkkkYkkkkkkkkkkkkkkkkkLkkkkkkkRkkkkkkkkk?
     ?~~~~~~~~~~~~~~T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~kk!k?
     ?~~~~~~~~G~~~~~~~~~~~~~~~~~~~~~~~T~~~~~~~~~~~~~~~~~~~kkkk?
     ?~~~~~~~~~~~~~~~~~~~~~~~~G~~~~~~~~~~~~~~~~~~~~~~~J~~~kkkk?
     ?kkkkkkkkkkkkkkkk+kkkkkkkkkkkRk$kkkkkkkkk~~~~~~~~~~~~kkkk?
     ?????????????????????????????????????????~~~~T~~~~~~~kk$k?
     ?????????????????????????????????????????~~~~~~~G~~~~kkkk?
                                             ?~~~~~~~~~~~~kkkk?
                                             ?~~~~~~~~~~~~kkkk?
                                             ?kkkkkkkkkkkkkkkk?
                                             ?kkHkkkkkkkkkkkkk?
                                             ?kkkkkkkkkkk@kkkk?
                                             ?kk+kkkkkkkkkkkLk?
                                             ?????S????????????
                                                ?qqq?
                                                ?qqq?
                                                ?????
`;
const F = (t, h, lid = null, fx = null) => ({ t, h, ...(lid != null ? { lid } : {}), ...(fx ? { fx } : {}) });
const S = sketch(L, PLAN, {
  '*': { t: '*' }, '?': { t: '?' },
  h: F('/', 12, 12), e: F('f', 12, 8),                                                                               // the siphon hall (roofed bonecoral), the exit chamber
  t: F(',', 12), '^': F(',', 12, null, '>'), n: F('/', 12, 12), m: F('/', 12, 12, '>'),                             // the top channel: banks and water (flowing east), open or roofed
  c: { t: '/', h: (x, z) => Math.max(6, 25 - z), c: 24, fx: 'v' },                                                   // the tower's weir: the water falls south from the top channel to the gallery
  g: F('/', 6, 12), s: { t: '/', h: (x, z) => Math.max(0, Math.min(6, 32 - z)), c: 18 }, l: F('/', 0, 10),           // the gallery, the dry stair, the lower hall
  r: F(',', 6), '{': F(',', 6, null, '<'), '}': F(',', 6, null, 'v'), p: F('/', 7, 7), b: F(',', 6),                // the reservoir (banks, water west, water south to the weir), the pumphouse, the bridge's walkways
  v: F('(', 0), W: { t: ',', h: (x, z) => Math.max(0, Math.min(6, 37 - z)), fx: 'v' },                               // the dry ravine, the weir
  k: F(',', 0), '~': F(',', 0, null, '>'), q: F('/', 0, 8), o: F('(', 0, 6),                                        // the low channel and the basin (banks, water east), the store, the grotto
}, { marks: '@XVDSZTGHJU$+!LYR' });
const P = placer(L), { E, P: PK, PR } = P; const [sx, sz] = S.one('@'); L.put(sx, sz, '@'); P.reserve(sx, sz);
const DOOR = S.one('D'), STORE = S.one('S'), GROTTO = S.one('Z'), EXIT = S.one('X'), [vx, vz] = S.one('V');
L.door(DOOR[0], DOOR[1], { remote: true }); L.secretPanel(STORE[0], STORE[1]); L.secretPanel(GROTTO[0], GROTTO[1]);
// ---- creatures: gills over the water, wading dead, gaunts that run the channels, bellhands on the banks, a shell-back at the tower's weir and one in the siphon ------------------------------------------------------------------------------------------
for (const [ch, kind] of [['T', 'tollbearer'], ['G', 'gaunt'], ['H', 'bellhand'], ['J', 'gill'], ['U', 'bulwark']]) for (const [x, z] of S.at(ch)) E(kind, x, z);
// ---- supplies and furniture ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('$')) PK('health_large', x, z); for (const [x, z] of S.at('+')) PK('health_small', x, z); for (const [x, z] of S.at('!')) PK('armor_vest', x, z);
for (const [x, z] of S.at('L')) PR('lamp', x, z); for (const [x, z] of S.at('Y')) PR('lantern', x, z); for (const [x, z] of S.at('R')) PR('crate', x, z);
PK('armor_vest', 49, 55); PK('health_large', 51, 55); PK('ammo_shell', 49, 56); PK('ammo_rivet', 51, 56); PK('ammo_flare', 50, 56);       // the keepers' store
PK('ld_slag_rivet', 27, 34); PK('health_large', 26, 33);                                                                                  // the grotto
const ENC = new Encounters(L);
ENC.dropIn({ at: [9, 30], radius: 2.5, cells: [[14, 28], [18, 29], [22, 28]], kind: 'g' });                          // over the top of the weir
ENC.dropIn({ at: [49, 23], radius: 2, cells: [[56, 25], [52, 20], [57, 21]], kind: 'g' });                           // into the gallery from the bridge

const MAP = {
  id: 'C2M06', name: 'Chitin Aqueduct', version: 2, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#a8d0b8', fogDensity: 0.006, sky: 'anselm', look: 'aqueduct' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'CHITIN AQUEDUCT', lines: ['The only water on the world that still moves.', 'It runs toward you, and it is the only way up.'] },
  outro: 'Next: the Bellwright Yard, where the Bells are grown.',
  objective: 'Climb the aqueduct against the current to the siphon at the top',
  ...L.layers(),
  secrets: [{ id: 'sluice', panel: STORE, cells: [[49, 55], [50, 55], [51, 55], [49, 56], [50, 56], [51, 56]] }, { id: 'grotto', panel: GROTTO, cells: [[28, 34], [27, 34]], open: 'shoot' }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'sluice', at: [vx, vz], wall: 'north', once: true, do: [{ open: DOOR }, { message: 'sluice' }, { objective: 'The door in the north wall is open: the exit chamber' }, { shake: 1.5 }] },
    { type: 'exit', at: EXIT, dest: 'next' }],
  scenery: [{ kind: 'spire', at: [20, -4] }, { kind: 'spire', at: [60, -8] }, { kind: 'spire', at: [74, 30] }],
  messages: [
    { id: 'start', at: [sx, sz], radius: 3, speaker: 'INES', text: 'Channels stepped up the hill like a stair, and the water in every one of them runs toward me. The only water on this world I have seen move.' },
    { id: 'current', at: [52, 50], radius: 3, speaker: 'HULL', text: 'Wading water pushes: with it you are fast, against it slow, and what wakes in it is carried down to you. The arc lamp conducts through it.' },
    { id: 'hum', at: [38, 44], radius: 3, speaker: 'INES', text: 'The channel hums when I put a hand in. Sound goes a long way down water. I think this is how the count reaches the cities.' },
    { id: 'weir', at: [9, 40], radius: 3, speaker: 'HULL', text: 'A weir: the water falls down the ramp and you climb it, against the water. At the top is a reservoir.' },
    { id: 'plate', at: [32, 22], radius: 2.5, speaker: 'RINGING PLATE', text: 'Run a nail down it: a rising note, a falling note, the same two, over and over. A question and an answer, I think. Nobody here is listening to either.' },
    { id: 'east', at: [50, 23], radius: 3, speaker: 'HULL', text: 'The second weir is inside the tower, under its roof, and a shell-back stands at its foot. The plate faces the water: take it from the side.' },
    { id: 'stair', at: [52, 35], radius: 3, speaker: 'HULL', text: 'A dry stair in the tower goes up to the bridge. The keepers used it to come down to the ravine without wading.' },
    { id: 'split', at: [31, 34], radius: 2, speaker: 'INES', text: 'The west face of the ravine is cracked through, and the cracks are wet. There is a hollow behind it. A shot would open it.' },
    { id: 'grotto', at: [27, 34], radius: 1.5, speaker: 'INES', text: 'A keeper\'s grotto, dry as a cupboard. Rivets packed in slag, a mend, and a mat somebody slept on.' },
    { id: 'sluice-plate', at: [16, 9], radius: 3, speaker: 'SLUICE PLATE', text: 'OPENED, AND CLOSED AGAIN BY HAND. THE WATER REMEMBERS THE COUNT. (The last line was added later, in a different hand, by someone who pressed hard.)' },
    { id: 'lever', at: [vx, vz + 1], radius: 2.5, speaker: 'INES', text: 'The siphon: the whole aqueduct goes down this throat and comes out in the Deep. The lever on the north wall works the door to the exit.' },
    { id: 'sluice', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The sluice shuts above the door. The door opens. The water goes on past it as if nothing had happened.' },
    { id: 'hollow', at: [50, 52], radius: 2, speaker: 'HULL', text: 'The south wall of the basin rings hollow here.' },
  ],
  triggers: [
    { id: 'west-weir', when: 'enter', at: [9, 40], radius: 3, do: [{ objective: 'The weir: up the ramp, against the falling water, to the reservoir' }] },
    { id: 'east-weir', when: 'enter', at: [50, 23], radius: 3, do: [{ objective: 'The tower: up its weir to the top channel, then west to the siphon' }] },
    { id: 'siphon', when: 'enter', at: [16, 9], radius: 3, do: [{ objective: 'The siphon: the lever on its north wall opens the door to the exit' }] },
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 700], mechanics: ['heights', 'triggers', 'switches', 'secret', 'hazards'], skins: 6, enemyKinds: { tollbearer: 7, gaunt: 5, bellhand: 3, gill: 3, bulwark: 2 },
    scaleClass: 'MIXED', introduces: 'the current: wading water that pushes (2.2 m/s: against it you crawl, with it you fly), the whole map an upstream climb through two weirs, with creatures carried down to you; the arc lamp conducts through the water' },
};
MAP.drops = { scale: 1.4, keep: [] };
ENC.apply(MAP);
console.log('C2M06: enemies', P.ents.filter((e) => e.type === 'enemy').length);

const D = (x, z) => [x, z];
export const waypoints = {
  main: [[sx, sz, 0], D(52, 50), D(50, 46), [45, 43, 0], D(38, 43), D(28, 43), D(18, 43), D(10, 42), [9, 39, 0], [9, 34, 0], D(9, 30), D(12, 22), D(18, 17), D(24, 23), [27, 24, 0], D(34, 24), D(42, 24), [48, 23, 0], D(53, 23),
    [52, 19, 0], [52, 14, 0], D(52, 9), D(44, 9), D(34, 9), D(24, 9), D(14, 9), [10, 12, 0], D(6, 12), { op: 'switch', id: 'sluice' }, [6, 4, 0], [EXIT[0], EXIT[1], 0]],
  secret: [[sx, sz, 0], [50, 53, 0], { op: 'use', at: STORE }, [50, 56, 0], [50, 53, 0], D(52, 50), D(50, 46), [45, 43, 0], D(38, 43), [34, 38, 0], D(33, 34), { op: 'crack', at: GROTTO }, [27, 34, 0], [33, 34, 0], D(42, 35), [47, 35, 0],
    D(52, 36), [56, 33, 0], [56, 27, 0], D(53, 23), [52, 19, 0], [52, 14, 0], D(52, 9), D(44, 9), D(34, 9), D(24, 9), D(14, 9), [10, 12, 0], D(6, 12), { op: 'switch', id: 'sluice' }, [6, 4, 0], [EXIT[0], EXIT[1], 0]],
};
export default MAP;
