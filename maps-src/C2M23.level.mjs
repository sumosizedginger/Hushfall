// C2M23 THE REPRISE (Campaign 2, Act C; design/ACTC.md section 5, the callback). MIXED, threat 6.
// The Hive keeps copies of what the grafted remember, and has built Port Marrow from them, wrong. Three parts on a diagonal: the QUAY (the committed plan of C1E1M01 turned by a node tool, tools/mapkit/reprise.mjs: MIRRORED east to west, in crystal and bone, the sea
// glass, every creature of it standing where it stood and in crystal), the TOWN (a warren of copied streets, new: roofed lanes with houses that have a door and nobody behind it), and the HILL (a crystal copy of the Signal House and its lamp, up a long slope).
// The way on is the way of the first night: the brass key lies where it lay, mirrored, and the brass door is where the door was; the jetty goes on by a causeway into the town; the town's far end opens on the hill; the exit is at the top of the house's tower.
// A player who remembers the Quay is quick; one who does not follows the objective. SIGNAL HOUSE speaks ONCE, from the copied set, in the first-night voice with details that are wrong (the ferry): Ines answers once and dryly. Nothing is explained.
// The secret is the net-loft nook, as it was on the first night: its panel leads to the warm lamp, and to C2S02. The Acts' quiet dread, not a new mechanic. Drop-fed ammunition.
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';
import { reprise, QW } from '../tools/mapkit/reprise.mjs';

const W = 100, H = 100, L = new Level(W, H, { fill: 'η' }); L.usedHeights = true; L.usedCeil = true;
const OX = 51, OZ = 2, Q = reprise(OX, OZ);
const GLASS = '~', STREET = 'Ζ', HOUSE = 'Γ', HILLF = 'Η', WALL = 'η', BONE = 'γ';
// ---- the Quay, mirrored ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const c of Q.cells) { if (c.x < 1 || c.z < 1 || c.x >= W - 1 || c.z >= H - 1) continue; if (c.ch === 'D') continue; setCell(L, c.x, c.z, c.ch, 0); }
for (const d of Q.doors) L.door(d.at[0], d.at[1], d.key ? { key: d.key } : {});
const NOOK = [[2, 21], [3, 21], [2, 22], [3, 22], [2, 23], [3, 23]].map(Q.at), PANEL = Q.at([4, 22]);
for (const [x, z] of NOOK) setCell(L, x, z, STREET, 0); L.secretPanel(PANEL[0], PANEL[1]);
// the causeway: the end of the jetty goes on over the glass to the town
for (let z = 34; z <= 36; z++) for (let x = 58; x <= 60; x++) setCell(L, x, z, HILLF, 0);
// ---- the Town: a warren of roofed lanes between blocks of houses ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
const TOWN = [31, 37, 73, 66];
for (let z = TOWN[1]; z <= TOWN[3]; z++) for (let x = TOWN[0]; x <= TOWN[2]; x++) setCell(L, x, z, STREET, 0, 9);
const BX = [34, 44, 54, 64], BZ = [40, 49, 58], rooms = [[0, 0], [2, 1], [1, 2], [3, 0], [0, 2], [3, 2]];
for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
  const x0 = BX[i], x1 = x0 + 6, z0 = BZ[j], z1 = z0 + 5;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) L.g[z][x] = WALL;
  if (rooms.some(([a, b]) => a === i && b === j)) { for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 1; x < x1; x++) setCell(L, x, z, HOUSE, 0, 8); L.door(x0 + 3, z1, {}); }
}
L.g[67][32] = STREET; L.g[68][32] = STREET; setCell(L, 32, 67, STREET, 0, 9); setCell(L, 32, 68, STREET, 0, 9);                      // the way out, south-west
// ---- the Hill: a long slope up to a crystal house ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const hOf = (x) => Math.max(0, Math.round((26 - x) / 2.4)), HF = hOf(17);
for (let z = 69; z <= 97; z++) for (let x = 2; x <= 46; x++) setCell(L, x, z, HILLF, hOf(x));
for (let z = 82; z <= 95; z++) for (let x = 3; x <= 16; x++) { L.g[z][x] = WALL; }
for (let z = 83; z <= 94; z++) for (let x = 4; x <= 15; x++) setCell(L, x, z, HOUSE, HF, 20);
for (let z = 86; z <= 90; z++) for (let x = 5; x <= 11; x++) setCell(L, x, z, 'Ξ', HF + (11 - x), 24);                // the stair up the tower: a half metre a cell
L.door(16, 88, {});
const EXIT = [5, 88];
// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; const START = Q.at([4, 16]); L.put(START[0], START[1], '@'); P.reserve(START[0], START[1]);
const crystal = { variant: 'crystal' };
for (const e of Q.entities) {
  const [x, z] = e.at;
  if (e.type === 'enemy') { E(e.kind, x, z, crystal); }
  else if (e.type === 'prop') { PR(e.kind, x, z); }
  else if (e.type === 'pickup') { if (e.kind === 'weapon_scattergun') PK('ammo_shell', x, z); else PK(e.kind, x, z); }
}
// the net-loft nook: the warm lamp and the exit to the lamp's own room
PR('lamp', NOOK[0][0], NOOK[0][1]); const NOOKX = Q.at([2, 22]);
// the town and the hill
for (const [x, z] of [[41, 38], [51, 38], [61, 38], [41, 47], [51, 47], [61, 47], [41, 56], [51, 56], [61, 56], [41, 65], [51, 65], [61, 65], [36, 65], [32, 62]]) PR('lamp', x, z);
for (const [x, z] of [[40, 72], [34, 76], [28, 80], [22, 84], [18, 78], [26, 90], [36, 88], [20, 72]]) PR('lamppost', x, z);
PR('lamppost', 19, 90); PR('lamppost', 19, 86);
const R = (list, kind, extra = {}) => list.forEach(([x, z]) => E(kind, x, z, extra));
R([[37, 38], [47, 38], [57, 38], [42, 44], [42, 53], [52, 53], [42, 62]], 'tollbearer', crystal); R([[67, 38], [52, 44]], 'gill', crystal); R([[62, 53], [62, 62]], 'bellhand', crystal);
R([[46, 47], [56, 47], [46, 56], [66, 56], [35, 65], [45, 65], [66, 65]], 'gaunt', crystal);
R([[42, 40], [52, 49], [62, 58], [33, 52]], 'chorister', crystal); R([[36, 47], [56, 65], [66, 47], [47, 56]], 'zealot', crystal);
R([[36, 56], [66, 40]], 'resonant', crystal); E('weeping', 52, 65, crystal);
R([[32, 44], [72, 50], [32, 58]], 'sexton', crystal); R([[44, 39], [64, 39], [54, 48]], 'gill', crystal); R([[38, 48], [60, 56]], 'bellhand', crystal); R([[72, 62]], 'bulwark', crystal);
R([[40, 74], [34, 78], [28, 82], [22, 86], [30, 90], [26, 76]], 'tollbearer', crystal); R([[36, 84], [24, 80]], 'chorister', crystal); R([[40, 90], [32, 94]], 'gaunt', crystal); R([[20, 82]], 'zealot', crystal); E('bulwark', 28, 94, crystal);
// health and armour ON the lane of the town and the hill
for (const [x, z, k] of [[59, 36, 'health_small'], [50, 38, 'health_large'], [42, 46, 'health_small'], [42, 56, 'health_large'], [38, 65, 'health_small'], [33, 66, 'health_large'], [32, 72, 'health_large'], [26, 80, 'health_large'], [20, 85, 'health_small'], [14, 88, 'health_large']]) PK(k, x, z);
for (const [x, z] of [[42, 40], [34, 74], [18, 88]]) PK('armor_vest', x, z);
const msg = (id, at, r, speaker, text, extra = {}) => ({ id, at, radius: r, speaker, text, ...extra });
const MAP = {
  id: 'C2M23', name: 'The Reprise', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'copy', sky: 'dusk', beat: true, fog: '#2a4058', fogDensity: 0.01 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 24, rivet: 130, bolt: 18, cell: 50, round: 50, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'THE REPRISE', lines: ['A harbour, a town and a hill, built from what the grafted remember of them.', 'The pier is on the wrong side. The sea is glass. Everything is in the right place.'] },
  outro: 'The tower door opened on a stair, and the stair went down into the dark with the same care for the treads as every stair in this country. The lamp on the hill was never lit.',
  objective: 'Take the quay as you took it the first time: the brass key, the brass door. Then the town, and the house on the hill',
  ...L.layers(),
  secrets: [{ id: 'net-loft', panel: PANEL, cells: NOOK }],
  groups: [],
  entities: [...P.ents, { type: 'exit', at: EXIT, dest: 'next' }, { type: 'exit', at: NOOKX, dest: 'secret' }],
  scenery: [{ kind: 'crystaltower', at: [20, 96], y: 6, scale: 1.4 }, { kind: 'crystaltower', at: [48, 2], y: 0, scale: 1.0 }],
  messages: [
    msg('start', Q.at([6, 16]), 5, 'INES', 'The pier again, the other way round. The boats are where the boats were. The water is glass and nothing is moving under it.'),
    msg('signal', Q.at([10, 16]), 5, 'SIGNAL HOUSE', 'Calder, come in. The bells are ringing. Nobody rings the bells at night. The ferry is alongside at the north pier, engines running.'),
    msg('answer', Q.at([12, 16]), 5, 'INES', 'The ferry was dead in the water. You told me so yourself. It has the voice right and the ferry wrong.'),
    msg('plaza', Q.at([22, 16]), 6, 'INES', 'The harbour crew in their oilskins again, in crystal this time, standing where they stood. Something has copied them down to the buttons.'),
    msg('manifest', Q.at([23, 5]), 4, 'CUSTOMS MANIFEST', '212 persons received. 212 processed. Signed for by no one. Under it in a second hand: KEPT AS COPIES: 213.'),
    msg('door', Q.at([38, 26]), 4, 'HULL', 'The brass door is where it was. The brass key is where it lay, in the warehouse behind the plaza.'),
    msg('jetty', Q.at([39, 30]), 4, 'INES', 'The jetty goes on over the glass. It was not here. Somebody wanted the way out to be easy to find.'),
    msg('nook', [NOOK[2][0], NOOK[2][1]], 3, 'HULL', 'The lamp in the net-loft is the only one on this quay that is warm to hold. The rest are glass.'),
    msg('lamp-note', [NOOK[1][0], NOOK[1][1]], 3, 'A SILENT (NOTE)', 'The Hive copied the lamps and could not copy the light. Take the warm one, and keep it low.'),
    msg('town', [59, 39], 6, 'INES', 'A street of the right width and the wrong houses. The doors are where doors are at home, and there is nobody behind any of them.'),
    msg('hill', [32, 72], 6, 'INES', 'The hill, and a house on the top of it with the aerial up. It is the right size. The lamp beside it is not lit.'),
    msg('tower', [20, 88], 5, 'HULL', 'The exit is at the top of the tower, up the stair at the back of the house.'),
    msg('exit', [8, 88], 3, 'HULL', 'The tower door. Past it the stair goes down, and it is cold.'),
  ],
  triggers: [
    { id: 'quay', when: 'enter', at: Q.at([22, 16]), radius: 7, do: [{ objective: 'The brass key is in the warehouse, the brass door is south of it' }] },
    { id: 'key', when: 'key:brass', do: [{ objective: 'The brass key. The brass door is on the south side of the quay' }] },
    { id: 'town-in', when: 'enter', at: [59, 40], radius: 5, do: [{ objective: 'The town: through the lanes to the south-west gap' }] },
    { id: 'hill-in', when: 'enter', at: [32, 72], radius: 5, do: [{ objective: 'The house on the hill: its tower has the exit' }] },
  ],
  quality: { enemies: [30, 90], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'keys>=1', 'secret'], skins: 6,
    enemyKinds: { tollbearer: 12, gaunt: 8, bellhand: 4, chorister: 4, zealot: 3, gill: 2, sexton: 2, resonant: 2, weeping: 1, bulwark: 2 },
    scaleClass: 'MIXED', introduces: 'recognition: the committed plan of Marrow Quay mirrored in crystal, its creatures where they stood, the brass key and the brass door where they were' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M23: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'start', START, 'nook', NOOKX);
const G = (x, z) => [x, z];
const tail = [G(59, 36), G(59, 38), G(52, 38), G(42, 38), G(42, 46), G(42, 56), G(42, 65), G(34, 65), G(32, 67), G(32, 72), G(30, 76), G(26, 80), G(21, 84), G(18, 88)];
const quayOps = Q.route.slice(1);                                                                                         // the first op of the original is a bare kill
const finish = [{ op: 'goto', at: [17, 88] }, { op: 'use', at: [16, 88] }, { op: 'goto', at: [13, 88] }, { op: 'goto', at: [9, 88] }, { op: 'goto', at: [EXIT[0], EXIT[1]] }];
const cvt = (list) => list.flatMap((q) => [{ op: 'goto', at: q }, { op: 'kill' }]);
const main = [{ op: 'goto', at: START }, ...quayOps, ...cvt(tail), ...finish];
const huts = main.findIndex((o) => o.op === 'goto' && o.at[0] === Q.at([9, 21])[0] && o.at[1] === 21 + OZ);
export const waypoints = { main, secret: [{ op: 'goto', at: START }, ...quayOps.slice(0, 5), { op: 'goto', at: Q.at([6, 22]) }, { op: 'use', at: PANEL }, { op: 'goto', at: Q.at([3, 22]) }, { op: 'goto', at: NOOKX }] };
void huts;
export default MAP;
