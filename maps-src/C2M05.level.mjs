// C2M05 THE RELIQUARY ROAD: ambush corridors; the graves of earlier worlds. (Campaign 2, Act A THRESHOLD.)
// PT-082 REDRAW (design/FUN_CHECK.md: the old road was one straight avenue a hundred metres long with round pods on it, a procession drawn with a ruler). Now the road WINDS DOWN A HILLSIDE in three legs, drawn by hand:
// leg one along the top (the tools chapel, the clocks chapel, two roofed arches), the first bend steps down past the boots chapel, leg two runs back west under it (a balcony of leg one looks down into it; the lamps
// chapel), the second bend steps down again (the nets chapel), leg three runs east to the foot (the strings chapel; leg two's alcove looks down into its end), and the road ends in a YARD OF BARE SLABS: the guard,
// the chapel of bare slabs with the lever, the locked exit. The OSSUARY STAIR runs down the west edge from the tools chapel to a grate at the foot of the second bend, bolted on the low side: the shortcut back up.
// In the walls of every leg are CLOSETS, ambushes that open as you pass; Sextons raise what you kill. Two secrets of two kinds: Calder's slab behind the yard's east wall (a panel) and a reliquary niche behind the
// strings chapel's cracked wall (shoot it).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { placer } from '../tools/mapkit/c2.mjs';
import { sketch } from '../tools/mapkit/sketch.mjs';

const W = 68, H = 62, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
// ---- the hillside, drawn: north is up. The road: leg one at 3 m (h 6), leg two 2 m, leg three 1 m, the yard on the ground. Chapels (')' under a 4.5 m lid), arches (roofed road, 6 m), closets N with their niches n ----------------
const PLAN = String.raw`

           **********        ==========
""""       *pppppppp*        =pppppppp=
"vv""""""""*pppppppp*        =pppppppp=
"vvvvvvvvvvpppppTppp*        =pppLppHp=
"vvvvvvvvvvppHpLppGp*        =ppppTppp=
"vv""""""""*pppppppp*        =pppppppp=
"vv"       *pppppppp*   n    =pppppppp=  n
"Yv"     ==****pp****===N========pp======N==================
"vv"     =aLaaaaaaaaaaAAAAAAAAaaaaaaaaAAAAAAAAaaaaa=aaaaaaa=
"vv"     =aaaaaaaaaaaaYAAAAAAAaaaaaaaaYAAAAAAAaaaaaaaaaaLaa=
"ww"     =a@aaTaaaaaaaAAAAAAAAaaHaaaaaAAAAAA$AaaTaaaaaaaaaa=
"ww"     =aa$aaaaaaaaaAAAAAA+YaaaaaaaaAAAAAAAYaaaaaaaaaaa$a=
"ww"     =aaaaaaaaaaaaAAAAAAAAaaaaaaaaAAAAAAAAaaaaa=aaaTaaa=
"ww"     =================N===aaaaaaaa====N===N=====aaaaaaa=
"ww"                      n  =aaaa!aaa=   n   n    =aaaaaaa=
"ww"                n        =bbbbbbbb=     n   n  =5555555=
"ww"================N=========bbbbbbbb======N===N====55555********
"ww"=bbbbbbbb=bbbbbbbbbbbbbbbbbbbbbbbbbbBBBBBBBBbbbb=bbbbb*qqqqqq*
"xx"=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbYBBBBBBBbbbbbbbbbb*qqqqqq*
"xx"=bbbb$bbbbbbbHbbbbbbbbTbbbbbbbJbbbbbBBBBBBBBbbbbbbbbbb*qqqTqq*
"xx"=bbbbbbbbbbbbbbb$bbbbbbbbbbbbbbb+bbbBBBBBBBYbbbbbbbbbbqqqqqqq*
"xY"=bbbbbbLb=bbbbbbbbbbbbbbbbbbbbbbbbbbBBBBBBBBbbbb=bbbbbqqqLqKq*
"xx"=bbbbbbbb=====N==============qq========N======bbbbbbb=qqqqqqq*
"xx"=bbbbbTbb=    n          =qqqqqqqq=    n     =bbbb!bb=*qqGqqq*
"xx"=bbbbbbbb= **********    =qqqqqqqq=          =bbbbbbb=*qqqqqq*
"xx"=bbbbbbbb= *rrrrrrrr*    =qqqTqqqq=          =bbbbbbb=*qqqqqq*
"yy"=33333333= *rrrrrrrr*    =qq$qqHqq=          =bbbbbbb=********
"yy"=33333333= *rrrrrGrr*    =qqqLqqqq=          =ccccccc=
"yy"=cccccccc= *rrrTrrrr*    =qqqqqqqq=          =ccccccc=
"yy"=cccHcccc= *rrrLrrrr*    ==========          =cccc+cc=
"yy"=cccccc!c= *rrrrrrrr* n          n           =ccccccc=
"Yy"=cccccccc==****rr****=N==========N============ccccccc=
"yy"=cccccccccccccccccccccccccccccCCCCCCCCccccccccccccccc=
"yy"=ccc+cccccccccccccccccccccccccYCCCCCCCcccccc$cccccccc=
"zzzOcccccccccccccccTcccccc$ccccccCCCCCCCCJccHccccccccccc=
"zzz=cccccccccccc+ccccccccccccccccCCCCCCCYccccccccccccccc=
""""=QccccccccccccccccccccccccccccCCCCCCCCccccccccccccccc=
    =====N=====N======N======rr====================111111=
         n     n      n  =rrrrrrrr=          ======111111=====
                         =rrrrrrrr=          =ddddddddddddddd=
                         =rrrrrGrr=          =dddddddLddddddd=
                         =rrrrTrrr=          =ddddddddddddddd=
                         =rrrLrrrr=          =dd$dddddddddddd=
                         =rrrrrrrr=          =ddddddddddddd+d=====
                         =====Z==== **********ddddddddddddddd=hhh=
                            =kkk=   *uuuuuuuu*dddddddUdddddddShhh=
                            =kkk=   *uuKuuuuu*ddddddddddddddd=hhh=
                            =kkk=   *uuuuuuuuuddddddddddddddd=====
                            =====   *VuuuuuuuudddddddKddddddd=
                                    *uuuuTuuu*ddGddddddddGddd=
                                    *uuuLuuuu*ddddddddddddddd=
                                    *uuuuuuuu*ddddddddddddddd=
                                    **********====%%eee%%=====
                                                  %eeeee%
                                                  %eeeee%
                                                  %eeXee%
                                                  %eeeee%
                                                  %%%%%%%
`;
const F = (t, h, lid = null) => (lid == null ? { t, h } : { t, h, lid });
const S = sketch(L, PLAN, {
  '"': { t: '"' }, '=': { t: '=' }, '*': { t: '*' }, '%': { t: '%' },
  a: F('s', 6), b: F('s', 4), c: F('s', 2), d: F('s', 0), 5: F('s', 5), 3: F('s', 3), 1: F('s', 1),                // the road, open slate, and its steps
  A: F(')', 6, 12), B: F(')', 4, 12), C: F(')', 2, 12),                                                              // the arches: roofed road, 6 m
  p: F(')', 6, 9), q: F(')', 4, 9), r: F(')', 2, 9), u: F(')', 0, 9),                                               // the chapels
  v: F(')', 6, 6), w: F(')', 5, 6), x: F(')', 4, 6), y: F(')', 3, 6), z: F(')', 2, 6),                              // the ossuary stair, a half-metre every eight rows
  n: { t: ')', h: (x, z) => (z <= 15 ? 6 : z <= 24 ? 4 : 2), lid: 8 },                                             // a closet's niche, at its road's height
  e: F(')', 0, 11), h: F(')', 0, 9), k: F(')', 2, 7),                                                                // the exit court, the slab chapel, the reliquary niche
}, { marks: '@XVQOSZNTGHKJU$+!LY' });
const P = placer(L), { E, P: PK, PR } = P; const [sx, sz] = S.one('@'); L.put(sx, sz, '@'); P.reserve(sx, sz);
const GRATE = S.one('O'), SLAB = S.one('S'), NICHE = S.one('Z'), GOAL = S.one('X'), [vx, vz] = S.one('V'), [qx, qz] = S.one('Q');
L.door(GRATE[0], GRATE[1], { remote: true }); L.secretPanel(SLAB[0], SLAB[1]); L.secretPanel(NICHE[0], NICHE[1]);
// ---- the closets: each panel N has its niche n beside it, away from the road; the road cell on the other side is where the trigger stands ------------------------------------------------------------------------------------------------
const nset = new Set(S.cells('n').map(([x, z]) => x + ',' + z)), CLOSETS = [];
for (const [px, pz] of S.at('N')) {
  const d = [[0, -1], [0, 1], [-1, 0], [1, 0]].find(([dx, dz]) => nset.has(px + dx + ',' + (pz + dz))); if (!d) throw new Error('closet without a niche at ' + px + ',' + pz);
  L.closet(px, pz); CLOSETS.push({ px, pz, nx: px + d[0], nz: pz + d[1], road: [px - d[0], pz - d[1]] });
}
// ---- the dead: graves in rows in every chapel, slabs along the roads, bare slabs in the yard --------------------------------------------------------------------------------------------------------------------------------------------------------
const CHAPELS = [[12, 2, 19, 7], [30, 2, 37, 7], [59, 18, 64, 26], [30, 24, 37, 29], [16, 26, 23, 31], [26, 39, 33, 44], [35, 46, 42, 53]];
for (const [x0, z0, x1, z1] of CHAPELS) for (let z = z0 + 1; z <= z1 - 1; z += 2) for (let x = x0 + 1; x <= x1 - 1; x += 3) PR('grave', x, z);
for (const [x0, x1, z] of [[11, 50, 9], [14, 50, 22], [14, 50, 37]]) for (let x = x0; x <= x1; x += 7) PR('grave', x, z);
for (let z = 42; z <= 51; z += 3) for (let x = 47; x <= 59; x += 4) if (!(x >= 50 && x <= 56 && z >= 44)) PR('grave', x, z);
// ---- the living (and the not quite dead) ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const GUARD = [46, 40, 60, 52], inGuard = ([x, z]) => x >= GUARD[0] && x <= GUARD[2] && z >= GUARD[1] && z <= GUARD[3];
for (const [ch, kind] of [['T', 'tollbearer'], ['G', 'gaunt'], ['H', 'bellhand'], ['K', 'sexton'], ['J', 'gill'], ['U', 'bulwark']]) for (const p of S.at(ch)) E(kind, p[0], p[1], inGuard(p) && kind !== 'tollbearer' ? { group: 'guard' } : undefined);
CLOSETS.forEach((c, i) => E(i % 3 === 2 ? 'bellhand' : 'gaunt', c.nx, c.nz, { group: 'cl' + i }));
// ---- supplies and furniture ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('$')) PK('health_large', x, z); for (const [x, z] of S.at('+')) PK('health_small', x, z); for (const [x, z] of S.at('!')) PK('armor_vest', x, z);
for (const [x, z] of S.at('L')) PR('lamp', x, z); for (const [x, z] of S.at('Y')) PR('lantern', x, z);
// the secrets: Calder's slab (and the heavy crate, FREEZE F8) and the reliquary niche
PR('grave', 64, 46); PK('armor_vest', 62, 45); PK('health_large', 64, 45); PK('ammo_shell', 62, 47); PK('ammo_rivet', 63, 45); PK('ammo_flare', 63, 47);
PK('ld_rime_harpoon', 30, 47); PK('armor_vest', 29, 46);
const msgs = [
  { id: 'start', at: [sx, sz], radius: 3, speaker: 'INES', text: 'A road lined with graves. Not mounds: slabs stood on end with a bronze band across them, in rows. Somebody sweeps them. The bronze is bright.' },
  { id: 'arches', at: [18, 11], radius: 3, speaker: 'HULL', text: 'The roofed arches have walls: nothing shoots down into them. The open stretches between are the long shots. The wall panels beside you will open.' },
  { id: 'tools', at: [15, 5], radius: 4, speaker: 'INES', text: 'Hand tools, a whole chapel of them: planes, saws, chisels, one pattern, thousands, hung in rows. They made everything with the same few things.' },
  { id: 'clocks', at: [33, 5], radius: 4, speaker: 'INES', text: 'A clock on every grave, and no two agree. Somebody wound them all, once. Nobody has since.' },
  { id: 'plate1', at: [48, 11], radius: 2.5, speaker: 'RINGING PLATE', text: 'Run a nail down it: one number, 211,408, and a short falling note. The same number is on the slab beside it, and the one beside that.' },
  { id: 'boots', at: [61, 22], radius: 4, speaker: 'INES', text: 'Boots in pairs, a pair to a grave, laced. The pairs go small, large, small.' },
  { id: 'lamps', at: [33, 26], radius: 4, speaker: 'INES', text: 'Lamps: brass, glass, clay, a hundred ways of holding a flame. They liked to see what they were doing.' },
  { id: 'nets', at: [19, 28], radius: 4, speaker: 'INES', text: 'Nets, folded, a net to a grave, folded the way you fold one you mean to use again.' },
  { id: 'grate', at: [6, 36], radius: 2.5, speaker: 'HULL', text: 'A grate in the west wall, bolted on this side. Behind it a stair climbs back up to the tools chapel at the head of the road.' },
  { id: 'strings', at: [29, 41], radius: 4, speaker: 'INES', text: 'Stringed instruments, one to a grave, and every string cut.' },
  { id: 'split', at: [30, 43], radius: 2, speaker: 'INES', text: 'The back wall of this chapel is cracked through, and the cracks are clean. Something is kept behind it. A shot would open it.' },
  { id: 'kept', at: [30, 47], radius: 1.5, speaker: 'INES', text: 'A reliquary. Harpoon bolts packed in frost, laid out like a saint\'s bones, and a vest for whoever came to take them.' },
  { id: 'end', at: [53, 37], radius: 3, speaker: 'INES', text: 'The road ends in a yard of bare slabs, with a door in the far wall and a shell-back in front of it. Two sextons with it. Everything here that can be raised, they\'ll raise.' },
  { id: 'bare', at: [40, 49], radius: 4, speaker: 'INES', text: 'Rows of bare slabs, the bronze polished, nothing laid on them yet. A great many. These are new. There\'s a lever on the west wall.' },
  { id: 'name', at: [63, 46], radius: 2, speaker: 'INES', text: 'A bare slab with a name cut in our letters. Calder. There is no bronze on it yet. I am not going to look for a date.' },
  { id: 'lever', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The lever works a bar across the door at the end of the road. Somewhere ahead, iron lifts.' },
  { id: 'open', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The door at the end of the road is open.' },
  { id: 'hollow', at: [59, 46], radius: 2, speaker: 'HULL', text: 'The east wall of this yard rings hollow.' },
];
const ENC = new Encounters(L);

const MAP = {
  id: 'C2M05', name: 'The Reliquary Road', version: 2, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#9a9ab4', fogDensity: 0.006, sky: 'anselm', look: 'reliquary' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'THE RELIQUARY ROAD', lines: ['The road to the Deep is lined with graves.', 'Every one of them is from somewhere else.'] },
  outro: 'Next: the Chitin Aqueduct. The only water on the world that still moves.',
  objective: 'Follow the road down the hill. The exit is locked: a lever in the chapel of bare slabs at the foot, and a guard',
  ...L.layers(),
  secrets: [{ id: 'slab', panel: SLAB, cells: [[62, 45], [63, 45], [64, 45], [62, 46], [63, 46], [64, 46], [62, 47], [63, 47], [64, 47]] }, { id: 'kept', panel: NICHE, cells: [[30, 46], [30, 47]], open: 'shoot' }],
  groups: [...CLOSETS.map((c, i) => ({ name: 'cl' + i, rect: [c.nx, c.nz, c.nx, c.nz] })), { name: 'guard', rect: GUARD }],
  entities: [...P.ents,
    { type: 'switch', id: 'door', at: [vx, vz], wall: 'west', once: true, do: [{ message: 'lever' }] },
    { type: 'switch', id: 'grate', at: [qx, qz], wall: 'west', once: true, do: [{ open: GRATE }] },
    { type: 'exit', at: GOAL, dest: 'next', locked: true }],
  scenery: [{ kind: 'rib', at: [33.5, 11.5], yaw: Math.PI / 2, scale: 1.2 }, { kind: 'rib', at: [26.5, 20.5], yaw: Math.PI / 2, scale: 1.2 }, { kind: 'rib', at: [24.5, 35.5], yaw: Math.PI / 2, scale: 1.2 }, { kind: 'spire', at: [8, -10] }, { kind: 'spire', at: [50, -16] }],
  messages: msgs,
  triggers: [
    { id: 'guard-down', when: ['dead:guard', 'msg:lever'], do: [{ exit: { set: 'unlock' } }, { message: 'open' }, { objective: 'The door is open: the exit is behind it' }, { shake: 1.5 }] },
    { id: 'end', when: 'enter', at: [53, 38], radius: 3, do: [{ wake: 'guard' }, { objective: 'Kill the guard and throw the lever in the chapel of bare slabs' }] },
    { id: 'mid', when: 'enter', at: [50, 20], radius: 3, do: [{ objective: 'The road turns back west under the first leg, and goes on down' }] },
    ...CLOSETS.map((c, i) => ({ id: 'cl' + i, when: 'enter', at: c.road, radius: 2.2, do: [{ open: [c.px, c.pz] }, { wake: 'cl' + i }] })),
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 800], mechanics: ['heights', 'triggers', 'closets', 'secret'], skins: 6, enemyKinds: { tollbearer: 8, gaunt: 8, sexton: 2, bellhand: 3, bulwark: 1 },
    scaleClass: 'MIXED', introduces: 'the graves of earlier worlds: a long road of chapels, each a different people and its dead, with ambush closets in the walls and sextons raising what you kill, ending at a guard that locks the exit' },
};
MAP.drops = { scale: 1, keep: [] };
ENC.apply(MAP);
// FREEZE F8: the heavy ammunition crate in Calder's chapel, with a dressing beside it (an even count of new entities)
MAP.entities.push({ type: 'pickup', kind: 'ammo_crate', at: [64, 47] }, { type: 'pickup', kind: 'health_small', at: [62, 46] });
console.log('C2M05: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'graves', P.ents.filter((e) => e.kind === 'grave').length, 'closets', CLOSETS.length);

const D = (x, z) => [x, z];
export const waypoints = {
  main: [[sx, sz, 0], D(12, 11), [15, 8, 0], D(15, 5), [15, 9, 0], D(20, 11), D(27, 11), [33, 9, 0], D(33, 5), [33, 9, 0], D(40, 11), D(48, 11), D(55, 12), [55, 15, 0], [55, 17, 0], D(55, 20), [58, 22, 0], D(61, 22), [57, 22, 0],
    D(48, 20), D(40, 20), [33, 22, 0], D(33, 26), [33, 22, 0], D(24, 20), D(16, 20), D(9, 22), [9, 26, 0], [9, 28, 0], D(9, 31), [6, 35, 0], { op: 'switch', id: 'grate' }, D(12, 35), [19, 33, 0], D(19, 28), [19, 34, 0],
    D(24, 35), [29, 37, 0], D(29, 41), [29, 37, 0], D(36, 35), D(44, 35), D(53, 35), [53, 38, 0], D(53, 43), D(49, 47), [45, 48, 0], D(40, 49), { op: 'switch', id: 'door' }, [45, 48, 0], D(53, 47), D(53, 51), [53, 53, 0], [GOAL[0], GOAL[1], 0]],
};
waypoints.secret = (() => {
  const m = waypoints.main, a = m.findIndex((w) => Array.isArray(w) && w[0] === 29 && w[1] === 41), b = m.findIndex((w) => Array.isArray(w) && w[0] === 53 && w[1] === 43);
  return [...m.slice(0, a + 1), [30, 43, 0], { op: 'crack', at: NICHE }, [30, 47, 0], [30, 43, 0], ...m.slice(a + 1, b + 1), [59, 46, 0], { op: 'use', at: SLAB }, [63, 46, 0], [59, 46, 0], ...m.slice(b + 1)];
})();
export default MAP;
