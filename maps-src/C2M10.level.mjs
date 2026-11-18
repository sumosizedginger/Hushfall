// C2M10 ECHO MARKETS: a bazaar round an echo-well; dozens of peaceful Vael, Zealots among them. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md.)
// PT-082 REDRAW (design/FUN_CHECK.md: a perfect disc with rings of blocks, flat, six empty rooms). Drawn by hand as a MARKET TOWN under a cave roof: the south gate opens on the lower market (house blocks with
// lanes between, no street running straight through), the ECHO WELL on the west (a funnel 3 m deep in a pillared ring: the one place where a loud noise turns round and comes back), the ARCADE along the west wall
// (the Silent's wing, roofed in bone-coral, its back room behind a panel), the east street under the UPPER QUARTER (2 m up, marble, its own houses and lanes, a parapet over the street and a stair at each end: the
// loop above the loop), and the north square before the SOUND-LOCKED gate. `atmosphere.echo: 2`: a SHOT carries twice as far in here (the arc lamp uncharged, a blow and the fork are quiet). The crowd runs from a
// shot, the Zealots and porters sleeping in the lanes wake to it, and the north gate will not open while the hall has been loud in the last six seconds. A civilian shot is an innocent (a message and a rank cost).
// Two secrets of two kinds: the Silent's back room (a panel in the arcade's west wall) and a sealed house behind the quarter's east wall (shoot the crack).
import { Level } from '../tools/mapkit/builder.mjs';
import { floorBorder } from '../tools/mapkit/accents.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { placer } from '../tools/mapkit/c2.mjs';
import { rng } from '../tools/mapkit/cave.mjs';
import { sketch } from '../tools/mapkit/sketch.mjs';

const W = 72, H = 68, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
// ---- the town, drawn: north is up. The market floor is 3 m up (h 6) so the well can be sunk; the upper quarter is 2 m above it (h 10); the cave roof is 15 m (30) over all of it --------------------------------------
const PLAN = String.raw`

                                   ###
                                   #X#
                               #####g#####
                               #####g#####
                               #####g#####
                               #####g#####
                               #####g#####
                               #####D#####
                                fffffffff
                                fffffffff
               fffffffffffffffffffffffffffffffffffff
               fffffffffffffYfffffffYfffTfffffffffff
    *******    fffff#####fQffffffffffffffffff  77777
    *ccccc*fffffffff#####fffffffff#####+fffff  88888
    *ccccc*fff#####f#####fffffffff#####ffffff  99999
    *ccYcc*fff#####f#####fffffffff#####ffffff  qqqqq
    *ccccc*fff#####fffffffffGfffff#####ffffff qqqqqqqqqqqqqqqq
    *ccccccfff#####ffffffffffffffffffffffffff qqqqqqqqqHqqqqqq
    *ccccccffffffffffffff#####fffffffff#####f qqqqqqqqqqqqqqqq
    *ccccccf$fffffffffff!#####ffffff$ff#####f qqq#####qq#####q
    *ccccc*fffff#####ffff#####fffffffff#####f qqq#####qq#####qqqq
    *cccHc*fffff#####ffff#####fffffffff#####f qqq#####qq#####qqqq
    *ccccc*fffff#####ffffffffffffffffffffffff qqq#####qq#####qqqq
    *ccccc*fffff#####fffffffffTfffffffffffYff qqqqqqqqqqqqqqqqqqq
    *ccccc*fQfffffffffffffffffffffffffffffffffqqqqqqTqqYqqq!qqHqq
    *ccccc*ffffffffrrffffff+ffffffffffffffffffAqqqqqqqqqqqqqqqqqq
    *ccccc*fYfffrrrrrrrrffffffffffffffffffTfffqqq######qq#####qqq
    *ccc+c*fffrrrrrrrrTrrrffffffffffffffffffffqqq######qq#####qqq
    *ccccc*ffrrrrrrwwrrrrrrfffffffffffff#####fqqq######qq#####qqq#####
    *ccccccfrrrrwwwwKwwwrrrrff#####fffff#####fqHq######qq#####qqq#kkk#
    *ccccccfrrrwwwwwwwwwwrrrff#####fffff#####fqqqqqqqqqqq#####qqqZkkk#
*****ccccccrrrwwwwwwwwwwwwrrrf#####fffff#####fqqqqqqqqqqqqqqqqqqq#kkk#
*hhh*ccccc*rrrwwwwwwwwwwwwrrrf#####fffffffffffqqYqqqqqq$qqQqGqqqq#####
*hhh*ccccc*rrrwwwwwwwwwwwwrrrf#####fffffffffQfqqq#####qqqqqqqqqqq
*hhhSccccc*rrwwwwwwwwwwwwwwrrrffffffffffffffffqqq#####qq#####qqqq
*hhh*ccccc*rrwwwwwwwwwwwwwwrrrffffffffff#####fqqq#####qq#####qqqq
*hhh*ccccc*rrrwwwwwwwwwwwwrrrfffffffffff#####fqqq#####qq#####qqqq
*****ccccc*rTrwwwwwwwwwwwwrrrf#####fffff#####fqqq#####qq#####qqqq
    *ccccc*rrrwwwwwwwwwwwwrrrf#####fffff#####fqqqqqqqqqqqqqqqqqqq
    *ccccccfrrrwwwwwwwwwwrrrff#####fffffffffffqHqqq+qqqTqqqqqqqqq
    *ccccccfrrrrwwwwwwwwrrrrff#####fffffffffffqqqqqqqqqqqqqqqqqqq
    *ccccccffrrrKrrwwrrrrrKfff#####fffffffYfffqqq######qq#####qqq
    *ccccc*fffrrrrrrrrrrrrffffffffffffffffffffqqq######qq#####qqq
    *ccccc*GffffrrrrrrrrffffffffffffQfGfffff+fqqq######qq#####qqq
    *ccccc*ffffffffrrfffffffffffffffffffffffffqqq######qq#####qqq
    *ccccc*fffffffffffffffffffffffffffffffffffqqqqqqqqqqq#####qqq
    *ccccc*fffYfffffTfffffffffffffffffffffffffqqqqqqqqqYqqqqqq
    *cc$cc*   ffffffffffffffffYfffffffffffffffqqqqqGqqqqqqqqqq
    *ccccc*   ffffffffffQffffffffffffffffffffGqqqqqqqqqqqqqq+q
    *ccccc*fffffffff+ffffff#####ffffff#####fffqqqqqqqqqqqqqqqq
    *ccccc*ffff#####fffffff#####ffffff#####ffff   9999
    *ccYcc*ffff#####fffffff#####ffff!f#####ffff   8888
    *ccccc*ffff#####fffffff#####ffffff#####ffff   7777
    *ccccc*ffff#####ffffffffffffffffffffffffffffffffff
    *ccccc*ffffffffffffffffffffffTffffffffffffffffffff
    *******fffffffffff#####ffffffffffff#####ffffffffff
           fffff#####f#####fff$ffffffff#####ffffffffff
           fffff#####T#####ffffffffffff#####fff
           fffff#####f#####ffffffffYfff#####
           fffff#####fffffffffffffffffffffff
                                 #sss#
                                 #sss#
                                 #s@s#
                                 #sss#
                                 #sss#
                                 #####
`;
const ROOF = 30, F = (t, h, c = ROOF) => ({ t, h, c });
const S = sketch(L, PLAN, {
  '#': { t: ']' }, '*': { t: '*' },
  f: F('f', 6), r: F(')', 6), w: { t: '{', h: (x, z) => Math.max(0, 6 - Math.round(6.6 - Math.hypot(x + 0.5 - 20, z + 0.5 - 36))), c: ROOF },     // the lanes, the ring, the well's funnel
  q: F('^', 10), 7: F('f', 7), 8: F('f', 8), 9: F('f', 9),                                                        // the upper quarter and its stairs
  c: { t: 'c', h: 6, lid: 6 }, h: { t: '^', h: 6, lid: 6 }, k: { t: 'c', h: 10, lid: 5 },                        // the arcade (low roof), the back room, the sealed house
  g: F('f', 6, 20), e: F('^', 6, 14), s: F('f', 6, 14),                                                           // the gate's stair, the exit, the south gate's corridor
}, { marks: '@XDSZQTGKHA$+!Y' });
const P = placer(L), { E, P: PK, PR } = P, rnd = rng(1010); const [sx, sz] = S.one('@'); L.put(sx, sz, '@'); P.reserve(sx, sz);
const GATE = S.one('D'), ROOM = S.one('S'), SEALED = S.one('Z'), EXIT = S.one('X');
L.door(GATE[0], GATE[1], { soundlock: { quiet: 6, radius: 45 } }); L.secretPanel(ROOM[0], ROOM[1]); L.secretPanel(SEALED[0], SEALED[1]);
// ---- the hostile: sleepers among the crowd ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [ch, kind] of [['Q', 'zealot'], ['T', 'tollbearer'], ['G', 'gaunt'], ['K', 'chorister'], ['H', 'bellhand'], ['A', 'acolyte']]) for (const [x, z] of S.at(ch)) E(kind, x, z, kind === 'zealot' ? { facing: rnd() * 6.28 } : undefined);
// ---- health and armour (ammunition comes from the dead) ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('$')) PK('health_large', x, z); for (const [x, z] of S.at('+')) PK('health_small', x, z); for (const [x, z] of S.at('!')) PK('armor_vest', x, z);
// the back room (the quiet bazaar: the Silent sell at the back) and the sealed house
PK('armor_vest', 1, 34); PK('health_large', 1, 36); PK('ammo_shell', 2, 33); PK('ammo_rivet', 2, 37); PK('ammo_flare', 3, 34); PK('ammo_bolt', 3, 36);
PK('ld_rime_scattergun', 67, 31); PK('health_large', 66, 30);
// ---- the light: lanterns where drawn, a ring of them round the well, lamps hung over the lanes ------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('Y')) PR('lantern', x, z);
for (let k = 0; k < 16; k++) { const a = (k / 16) * 2 * Math.PI; PR('lantern', Math.round(20 - 0.5 + 8.6 * Math.cos(a)), Math.round(36 - 0.5 + 8.6 * Math.sin(a))); }
for (let k = 0; k < 8; k++) { const a = (k / 8) * 2 * Math.PI + 0.2; PR('pillar', Math.round(20 - 0.5 + 7.8 * Math.cos(a)), Math.round(36 - 0.5 + 7.8 * Math.sin(a))); }
// ---- the stalls: seeded against the house walls, only where the lane is wide enough that a stall never closes it ----------------------------------------------------------------------------------------------------------------------------------------------
const lane = (x, z) => L.g[z]?.[x] === 'f' || L.g[z]?.[x] === '^';
const nearGate = (x, z) => Math.hypot(x - sx, z - sz) < 6 || Math.hypot(x - GATE[0], z - GATE[1]) < 6;
const kinds = ['crate2', 'shelf', 'shelf', 'stall', 'cart', 'crate2', 'table', 'stall'], taken = [];
for (let n = 0, tries = 0; n < 70 && tries < 12000; tries++) {
  const x = 2 + Math.floor(rnd() * (W - 4)), z = 2 + Math.floor(rnd() * (H - 4));
  if (!lane(x, z) || nearGate(x, z)) continue;
  const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => L.g[z + b]?.[x + a] === ']'); if (!wall) continue;
  let open = 0; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (lane(x + a, z + b)) open++; if (open < 15) continue;          // the lane is at least three wide here
  if (taken.some(([a, b]) => Math.abs(a - x) < 3 && Math.abs(b - z) < 3)) continue;
  taken.push([x, z]); PR(kinds[Math.floor(rnd() * kinds.length)], x, z); n++;
}
// ---- the crowd: peaceful Vael in the lanes, round the well and in the quarter, seeded ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let n = 0, tries = 0; n < 40 && tries < 8000; tries++) {
  const x = 2 + Math.floor(rnd() * (W - 4)), z = 2 + Math.floor(rnd() * (H - 4)), t = L.g[z]?.[x];
  if (!(t === 'f' || t === ')' || t === '^') || nearGate(x, z)) continue;
  if (E('vaelfolk', x, z, { facing: rnd() * 6.28 })) n++;
}
const ENC = new Encounters(L);
ENC.dropIn({ at: [24, 47], radius: 2.5, cells: [[19, 49], [28, 48], [25, 52]], kind: 'g' });                        // porters out of the lanes as you cross to the well

// PT-082 (after the stalls and the crowd are placed, so neither moves): the LOWER MARKET (every lane south of the well) is open to the cavern's own vault of small lights (sky_deep, as in the Silent Orchard); the well, the arcade, the upper quarter and the north
// square stay under the rock. The town reads as a hall of two halves, and the space contract measures it as MIXED (it was a 100% roofed hall with 23.5 m sightlines, which no class allows). The
// simulation is the same on either floor (an outdoor cell walks, sees and shoots as a roofed one, the ceiling layer is unchanged): only what is drawn overhead differs.
for (let z = 42; z < H; z++) for (let x = 0; x < W; x++) if (L.get(x, z) === 'f') L.g[z][x] = 's';
// ---- G3 room accents (Session 12 of design/OPUS_HANDOFF.md, tools/mapkit/accents.mjs): the market halls were flagstone wall to wall and the yard open slate wall to wall. Basalt flags along the walls of the halls, open flowstone round the yard. The second skin is of the same surface family, so
// nothing the simulation does moves (tools/dev/route-fingerprint.mjs: identical) ----
floorBorder(L, [[28,15],[42,15],[36,11]], 'f', ')');
floorBorder(L, [[13,57]], 's', '@');
// ---- end G3 room accents ----

const MAP = {
  // the opening (design/OPENING_VIEWS.md O2, 2026-11-16): the start faced a wall; it faces the way the route goes
  id: 'C2M10', name: 'Echo Markets', version: 3, startFacing: -0.1, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { look: 'markets', sky: 'deep', echo: 2, fog: '#1a1410', fogDensity: 0.01 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'ECHO MARKETS', lines: ['A market town under the roof of the cave, round a well.', 'Everyone in it is speaking softly. A shot here carries twice as far.'] },
  outro: 'The north gate opened when the hall had gone quiet. Behind it the stair goes down, and the noise of the market stays behind.',
  objective: 'Cross the market to the north gate. It stays shut while the hall is loud',
  ...L.layers(),
  secrets: [{ id: 'store', panel: ROOM, cells: [[1, 33], [2, 33], [3, 33], [1, 34], [2, 34], [3, 34], [1, 35], [2, 35], [3, 35], [1, 36], [2, 36], [3, 36], [1, 37], [2, 37], [3, 37]] },
    { id: 'sealed', panel: SEALED, cells: [[66, 31], [67, 31]], open: 'shoot' }],
  groups: [],
  entities: [...P.ents, { type: 'exit', at: EXIT, dest: 'next' }],
  scenery: [],
  messages: [
    { id: 'start', at: [sx, sz - 1], radius: 4, speaker: 'INES', text: 'A hall with a roof I can\'t see. Stalls, strings of lamps, and a crowd that\'s doing its buying in a murmur. Nobody here has a bell.' },
    { id: 'echo', at: [35, 57], radius: 4, speaker: 'HULL', text: 'The hall has an echo: a shot carries twice as far as it does outside, and wakes what sleeps that far off. A blow, the arc lamp uncharged and the fork are quiet.' },
    { id: 'folk', at: [30, 50], radius: 4, speaker: 'INES', text: 'A stallholder throws a cloth over the fruit as I pass, the way you cover a pan when a gull lands. Not at me. At what I\'m carrying.' },
    { id: 'zealot', at: [22, 47], radius: 4, speaker: 'INES', text: 'Spears among the stalls. They stand with the butts on the flags and nobody gives them room or takes any. Part of the furniture, like the bollards at home.' },
    { id: 'well', at: [20, 26], radius: 4, speaker: 'HULL', text: 'The well is an echo well: a noise made over it comes back from the walls. Keep anything quiet away from it.' },
    { id: 'ledger', at: [27, 24], radius: 3, speaker: 'MARKET LEDGER', text: 'Cord, per length: one voice. Lamp oil, per tin: two. A room at the back, for a night: nothing, and ask no one.' },
    { id: 'north', at: [36, 11], radius: 4, speaker: 'HULL', text: 'The north gate is on a sound-lock. It will not open while the hall has made a loud noise in the last six seconds. Wait, then use it.' },
    { id: 'hollow', at: [5, 35], radius: 2, speaker: 'HULL', text: 'The west wall of the arcade rings hollow behind the last stall.' },
    { id: 'rack', at: [2, 35], radius: 2, speaker: 'A SILENT (NOTE)', text: 'This is the room at the back. Nobody asks. Take what you need and leave the door as it was.' },
    { id: 'split', at: [63, 31], radius: 2, speaker: 'INES', text: 'One house in the quarter has its door walled up, and the wall has cracked. Whatever is inside has been inside a long time.' },
    { id: 'sealed', at: [67, 31], radius: 1.5, speaker: 'INES', text: 'A room shut a long time ago and left: a bed, a lamp, scattergun shells packed in frost, and a mend in a tin by the door.' },
    { id: 'end', at: [EXIT[0], EXIT[1] + 1], radius: 2, speaker: 'INES', text: 'A stair down, wide, and the murmur of the market already thinner behind me. It was a good market. I did not buy anything.' },
  ],
  triggers: [
    { id: 'wheel', when: 'enter', at: [24, 47], radius: 4, do: [{ objective: 'The market: round the well or up through the quarter. The north gate is beyond' }] },
    { id: 'gate', when: 'enter', at: [36, 12], radius: 5, do: [{ objective: 'The north gate is sound-locked: stand quiet until it opens, then use it' }] },
  ],
  quality: { enemies: [25, 60], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 6, enemyKinds: { zealot: 5, tollbearer: 8, gaunt: 5, chorister: 3, bellhand: 2, acolyte: 1 },
    scaleClass: 'MIXED', introduces: 'the echo: a hall where a shot carries twice as far and wakes the market, a crowd of peaceful Vael to keep from harm, and a gate that only opens when the hall has gone quiet' },
};
MAP.drops = { scale: 1, keep: [] };
ENC.apply(MAP);
// FREEZE F8: the heavy ammunition crate in the back room, with a dressing beside it (an even count of new entities)
MAP.entities.push({ type: 'pickup', kind: 'ammo_crate', at: [1, 35] }, { type: 'pickup', kind: 'health_small', at: [3, 35] });
console.log('C2M10: enemies', P.ents.filter((e) => e.type === 'enemy' && e.kind !== 'vaelfolk').length, 'folk', P.ents.filter((e) => e.kind === 'vaelfolk').length, 'props', P.ents.filter((e) => e.type === 'prop').length);

const D = (x, z) => [x, z];
export const waypoints = {
  main: [[sx, sz, 0], [35, 59, 0], D(34, 54), D(30, 49), D(22, 47), D(14, 45), D(11, 38), D(13, 28), D(20, 26), D(27, 24), D(30, 18), D(33, 12), [36, 10, 0], [36, 9, 0], { op: 'use', at: GATE }, [36, 6, 0], [EXIT[0], EXIT[1], 0]],
};
waypoints.secret = (() => {
  const m = waypoints.main, a = m.findIndex((w) => Array.isArray(w) && w[0] === 11 && w[1] === 38), b = m.findIndex((w) => Array.isArray(w) && w[0] === 33 && w[1] === 12);
  return [...m.slice(0, a + 1), [11, 41, 0], [9, 41, 0], [6, 37, 0], { op: 'use', at: ROOM }, [2, 35, 0], [6, 35, 0], [9, 41, 0], [11, 41, 0], ...m.slice(a + 1, b + 1),
    [40, 12, 0], [47, 12, 0], [49, 14, 0], [49, 17, 0], D(55, 25), D(55, 32), [60, 32, 0], [62, 31, 0], { op: 'crack', at: SEALED }, [67, 31, 0], [62, 31, 0], D(55, 32), D(55, 25), [55, 18, 0], [49, 17, 0], [49, 14, 0], [47, 12, 0], [40, 11, 0], ...m.slice(b + 1)];
})();
export default MAP;
