// C2M05 THE RELIQUARY ROAD: ambush corridors; the graves of earlier worlds. (Campaign 2, Act A THRESHOLD.)
// The road down to the Deep: an avenue eight wide and a hundred long, going DOWN in three terraces (3 m, 2 m, 1 m, ground), with a colossal rib arching it, and lined with graves of the people of other worlds the Vael have sung. Eight roofed CHAPELS open off it (four a side, each a different people: one object to a chapel, counted in
// rows), six long ARCHES (roofed stretches with walls: nothing shoots down into them) alternate with open stretches (the long shots), and in the walls of both are CLOSETS, ambushes that open as you pass. Sextons raise what you kill. The road ends at a wall with a door and a guard (a Bulwark Shell and two Sextons)
// that locks the exit until it is dead. The last chapel on the east side holds a bare slab with a name cut in our letters. No new engine: closets, sextons and the grave prop.
// SHAPE: a comb (an avenue and eight chapels), a stair between terraces, arches and open stretches; heights 0 / 1 / 2 / 3 m; lids 3.5 m (chapels) and 6 m (arches). Scale class MIXED (the chapels and the arches are roofed: about 55%).
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, ellipse, box, ramp, placer, ring } from '../tools/mapkit/c2.mjs';

const W = 62, H = 124, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
const AX = [26, 33];                                                                                      // the avenue's floor: x 26..33, its walls at x 25 and 34
const TERR = [{ z0: 90, z1: 116, h: 6 }, { z0: 56, z1: 85, h: 4 }, { z0: 24, z1: 51, h: 2 }, { z0: 8, z1: 19, h: 0 }];     // the four levels, going down (north)
const hAt = (z) => { for (const t of TERR) if (z >= t.z0 && z <= t.z1) return t.h; for (let i = 0; i < 3; i++) { const a = TERR[i], b = TERR[i + 1]; if (z > b.z1 && z < a.z0) { const k = z - b.z1; return Math.min(a.h, b.h + k * 0.5 > a.h ? a.h : Math.round(b.h + (a.h - b.h) * (k / (a.z0 - b.z1)))); } } return 0; };
// the avenue: open slate between the arches, basalt flags under them
const ARCH = [[98, 111], [70, 84], [36, 50]];
for (let z = 8; z <= 116; z++) {
  const h = hAt(z), arch = ARCH.some(([a, b]) => z >= a && z <= b);
  for (let x = AX[0]; x <= AX[1]; x++) setCell(L, x, z, arch ? ')' : 's', h, arch ? 12 + h : null);
}
// the stairs between the levels: a unit a cell over four rows
for (let i = 0; i < 3; i++) { const a = TERR[i], b = TERR[i + 1]; for (let z = b.z1 + 1; z < a.z0; z++) { const k = (z - b.z1 - 1) / Math.max(1, (a.z0 - b.z1 - 2)), h = Math.round(b.h + (a.h - b.h) * k); for (let x = AX[0]; x <= AX[1]; x++) setCell(L, x, z, 's', h); } }
// ---- the eight chapels: west at x 15..24, east at x 35..44, ten rows each, a doorway three wide through the avenue's wall ------------------------------------------------------------------------------------------------------------------------
const WEST = [108, 80, 46, 14], EAST = [96, 62, 30, 14], CH = [];
for (const [side, list] of [['w', WEST], ['e', EAST]]) for (const zc of list) {
  const h = hAt(zc), x0 = side === 'w' ? 15 : 35, x1 = x0 + 9, z0 = zc - 4, z1 = zc + 5;
  ellipse(L, (x0 + x1 + 1) / 2, zc + 0.5, 5.2, 5.6, ')', h, h + 9);                                          // an apsed chapel: an ellipse of floor under a lid (the ring of walls is drawn round it below)
  const dx = side === 'w' ? 25 : 34; for (let z = zc - 1; z <= zc + 1; z++) setCell(L, dx, z, ')', h, h + 9);   // the doorway
  CH.push({ side, zc, h, x0, x1, z0, z1 });
}
// ---- the closets: a niche behind a panel in the avenue's wall, between the chapels --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const CLW = [98, 90, 70, 60, 54, 36, 24], CLE = [106, 86, 76, 70, 50, 40, 20], CLOSETS = [];
for (const [side, list] of [['w', CLW], ['e', CLE]]) for (const z of list) { const h = hAt(z), nx = side === 'w' ? 24 : 35, px = side === 'w' ? 25 : 34; setCell(L, nx, z, ')', h, h + 8); L.closet(px, z); L.ht[z][px] = h; CLOSETS.push({ nx, z, px }); }
// ---- the end of the road: a wall with a door and the guard; the exit is behind it -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [26, 4, 33, 7], ')', 0, 11); box(L, [25, 3, 34, 3], '%', 0); setCell(L, 29, 3, '%', 0);
const GOAL = [29, 5];
ring(L, '!', (x, z) => (z <= 8 ? '%' : (x < 25 && (Math.floor(z / 30) % 2 === 0) ? '*' : (x > 34 && (Math.floor(z / 30) % 2 === 1) ? '*' : '='))));
const P = placer(L); L.put(29, 114, '@'); P.reserve(29, 114);
const { E, P: PK, PR } = P;
// ---- the dead ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const c of CH) {
  const rows = c.side === 'w' ? [[c.x0 + 1, c.x1 - 3]] : [[c.x0 + 3, c.x1 - 1]];                          // graves in two ranks away from the doorway
  for (let z = c.z0 + 1; z <= c.z1 - 1; z += 3) for (let x = (c.side === 'w' ? c.x0 + 1 : c.x0 + 3); x <= (c.side === 'w' ? c.x1 - 3 : c.x1 - 1); x += 3) PR('grave', x, z);
  void rows;
}
for (let z = 112; z >= 10; z -= 6) { PR('grave', 27, z); PR('grave', 32, z + 3); }                           // along the avenue's edges: slabs stood on end, bronze across them
// ---- the living (and the not quite dead) -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
CH.forEach((c, i) => { const cx = c.side === 'w' ? c.x0 + 4 : c.x1 - 4; E('tollbearer', cx, c.zc - 2); E(i % 2 ? 'gaunt' : 'bellhand', cx + (c.side === 'w' ? 2 : -2), c.zc + 2); });
for (const i of [3]) { const c = CH[i]; E('sexton', c.side === 'w' ? c.x0 + 2 : c.x1 - 2, c.zc); }
CLOSETS.forEach((c, i) => E(i % 3 === 2 ? 'bellhand' : 'gaunt', c.nx, c.z, { group: 'cl' + i }));
for (const z of [112, 98, 82, 64, 48, 34]) E(z % 4 ? 'tollbearer' : 'bellhand', z % 4 ? 28 : 31, z);
E('gill', 30, 100); E('gill', 30, 60);
E('bulwark', 29, 12, { group: 'guard' }); E('sexton', 29, 9, { group: 'guard' }); E('gaunt', 27, 11, { group: 'guard' }); E('gaunt', 31, 11, { group: 'guard' });
// ---- supplies and furniture --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const z of [112, 104, 92, 82, 72, 62, 54, 46, 38, 30, 22, 14]) PK(z % 3 ? 'health_small' : 'health_large', z % 2 ? 27 : 32, z);
PK('armor_vest', 29, 88); PK('armor_vest', 29, 40); PK('armor_vest', 29, 16);
for (const [x, z] of [[27, 104], [32, 104], [27, 70], [32, 70], [27, 36], [32, 36], [27, 22], [32, 22]]) PR('lantern', x, z);
for (const [x, z] of [[29, 105], [29, 77], [29, 43]]) PR('lamp', x, z);
for (const c of CH) PR('lamp', c.side === 'w' ? c.x0 + 4 : c.x1 - 4, c.zc);
// ---- the secret: the east end of the last east chapel opens on a second, smaller chapel: one bare slab with a name on it ---------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [45, 15], cells: [[46, 14], [47, 14], [48, 14], [46, 15], [47, 15], [48, 15], [46, 16], [47, 16], [48, 16]] };
{ for (const [x, z] of SEC.cells) setCell(L, x, z, ')', 0, 9); box(L, [45, 13, 49, 13], '=', 0); box(L, [45, 17, 49, 17], '=', 0); box(L, [49, 14, 49, 16], '=', 0); setCell(L, 45, 14, '=', 0); setCell(L, 45, 16, '=', 0); setCell(L, 45, 15, 'S', 0);
  PR('grave', 47, 15); PK('armor_vest', 46, 14); PK('health_large', 48, 14); PK('ammo_shell', 46, 16); PK('ammo_rivet', 48, 16); PK('ammo_flare', 47, 14); }
const msgs = [
  { id: 'start', at: [29, 114], radius: 3, speaker: 'INES', text: 'A road lined with graves. Not mounds: slabs stood on end with a bronze band across them, in rows. Somebody sweeps them. The bronze is bright.' },
  { id: 'arches', at: [29, 100], radius: 3, speaker: 'HULL', text: 'The roofed arches have walls: nothing shoots down into them. The open stretches between are the long shots. The wall panels beside you will open.' },
  { id: 'tools', at: [20, 108], radius: 4, speaker: 'INES', text: 'Hand tools, a whole chapel of them: planes, saws, chisels, one pattern, thousands, hung in rows. They made everything with the same few things.' },
  { id: 'clocks', at: [40, 96], radius: 4, speaker: 'INES', text: 'A clock on every grave, and no two agree. Somebody wound them all, once. Nobody has since.' },
  { id: 'plate1', at: [29, 90], radius: 2.5, speaker: 'RINGING PLATE', text: 'Run a nail down it: one number, 211,408, and a short falling note. The same number is on the slab beside it, and the one beside that.' },
  { id: 'boots', at: [20, 80], radius: 4, speaker: 'INES', text: 'Boots in pairs, a pair to a grave, laced. The pairs go small, large, small.' },
  { id: 'lamps', at: [40, 62], radius: 4, speaker: 'INES', text: 'Lamps: brass, glass, clay, a hundred ways of holding a flame. They liked to see what they were doing.' },
  { id: 'nets', at: [20, 46], radius: 4, speaker: 'INES', text: 'Nets, folded, a net to a grave, folded the way you fold one you mean to use again.' },
  { id: 'strings', at: [40, 30], radius: 4, speaker: 'INES', text: 'Stringed instruments, one to a grave, and every string cut.' },
  { id: 'bare', at: [20, 14], radius: 4, speaker: 'INES', text: 'Rows of bare slabs, the bronze polished, nothing laid on them yet. A great many. These are new. There is a lever on the west wall.' },
  { id: 'name', at: [47, 15], radius: 2, speaker: 'INES', text: 'A bare slab with a name cut in our letters. Calder. There is no bronze on it yet. I am not going to look for a date.' },
  { id: 'end', at: [29, 22], radius: 4, speaker: 'INES', text: 'The road ends at a wall with a door in it and a shell-back in front. Two sextons with it. Everything here that can be raised, they will raise.' },
  { id: 'lever', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The lever works a bar across the door at the end of the road. Somewhere ahead, iron lifts.' },
  { id: 'open', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The door at the end of the road is open.' },
  { id: 'hollow', at: [44, 15], radius: 2, speaker: 'HULL', text: 'The east wall of this chapel rings hollow.' },
];
const MAP = {
  id: 'C2M05', name: 'The Reliquary Road', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#9a9ab4', fogDensity: 0.006, sky: 'anselm', look: 'reliquary' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'THE RELIQUARY ROAD', lines: ['The road to the Deep is lined with graves.', 'Every one of them is from somewhere else.'] },
  outro: 'Next: the Chitin Aqueduct. The only water on the world that still moves.',
  objective: 'Follow the road down. The exit is locked: a lever in the last west chapel, and a guard',
  ...L.layers(),
  secrets: [{ id: 'slab', panel: SEC.panel, cells: SEC.cells }],
  groups: [...CLOSETS.map((c, i) => ({ name: 'cl' + i, rect: [c.nx, c.z, c.nx, c.z] })), { name: 'guard', rect: [26, 8, 33, 14] }],
  entities: [...P.ents, { type: 'switch', id: 'door', at: [15, 14], wall: 'west', once: true, do: [{ message: 'lever' }] }, { type: 'exit', at: GOAL, dest: 'next', locked: true }],
  scenery: [{ kind: 'rib', at: [29, 70], yaw: 1.5708 }, { kind: 'rib', at: [29, 38], yaw: 1.5708 }, { kind: 'rib', at: [29, 102], yaw: 1.5708 }, { kind: 'spire', at: [8, -10] }, { kind: 'spire', at: [50, -16] }],
  messages: msgs,
  triggers: [
    { id: 'guard-down', when: ['dead:guard', 'msg:lever'], do: [{ exit: { set: 'unlock' } }, { message: 'open' }, { objective: 'The door is open: the exit is behind it' }, { shake: 1.5 }] },
    { id: 'end', when: 'enter', at: [29, 24], radius: 4, do: [{ wake: 'guard' }, { objective: 'The exit stays locked: kill the guard, and throw the lever in the last chapel' }] },
    { id: 'mid', when: 'enter', at: [29, 66], radius: 4, do: [{ objective: 'The second terrace. The road goes on down' }] },
    ...CLOSETS.map((c, i) => ({ id: 'cl' + i, when: 'enter', at: [29, c.z], radius: 2.2, do: [{ open: [c.px, c.z] }, { wake: 'cl' + i }] })),
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 800], mechanics: ['heights', 'triggers', 'closets', 'secret'], skins: 6, enemyKinds: { tollbearer: 8, gaunt: 8, sexton: 2, bellhand: 3, bulwark: 1 },
    scaleClass: 'MIXED', introduces: 'the graves of earlier worlds: a long road of chapels, each a different people and its dead, with ambush closets in the walls and sextons raising what you kill, ending at a guard that locks the exit' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M05: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'graves', P.ents.filter((e) => e.kind === 'grave').length);
export default MAP;
