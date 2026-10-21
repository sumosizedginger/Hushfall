// C2M07 BELLWRIGHT YARD: enemy factory denial; where the Bells are grown. (Campaign 2, Act A THRESHOLD; the new thing: SEEDS.)
// A ring yard of cinder, 24 cells in radius, with a great round KILN HOUSE in the middle (r 11: a furnace on a platform 3 m up, stairs down all round inside the hall, a lever on its west wall) and four long sheds round the edge (north, east, south, west) where the Bells are GROWN: bells of new bronze on stands, ringing very
// faintly, two to a shed. A seed is a bell node (it takes a lot of damage to break) with a clock on it: at its time it CRACKS and a bell-bearer steps out of it (a trigger `time:` AND `not:dead:<seed>`: the first use of `not:`, so breaking a seed before its time denies it, and a seed that is left cracks once). The seeds
// crack in the order the player reaches the sheds: south at 45 and 70 s, west at 100 and 125, east at 160 and 185, north at 220 and 245; a message warns twenty seconds before. Forks (the resonators of M04) stand at each shed door: break a seed with a rifle and they ring and call the yard; a blow, the arc or the tuning-fork gun does not. The
// exit gate (behind the north shed) opens by the kiln's lever. Four watchtowers 4 m up on the diagonals hold Bellhands. Route: the south door -> round the south shed to the kiln house -> up to the lever -> the north shed -> its rear door -> the exit.
// SHAPE: a circle with a round hall in the middle (the big thing), four sheds, four towers; heights 0 / 3 / 4 m. Scale class MIXED (the kiln house and the sheds are roofed: about 50%).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, ellipse, ellipseCells, box, ramp, placer, ring } from '../tools/mapkit/c2.mjs';

const W = 76, H = 76, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
const CX = 38, CZ = 38, R = 24;
// ---- the yard ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of ellipseCells(CX, CZ, R, R)) setCell(L, x, z, (x + z) % 7 === 0 ? 'l' : 'm', 0);
// ---- the kiln house: a round hall, r 13 (floor), its wall to r 14.8, gaps north and south; the furnace platform r 7 at 3 m, stairs down all round ---------------------------------------------------------------------------------------------------------
for (let z = CZ - 16; z <= CZ + 16; z++) for (let x = CX - 16; x <= CX + 16; x++) {
  const dx = x + 0.5 - CX, dz = z + 0.5 - CZ, r = Math.hypot(dx, dz);
  if (r <= 11.4) { const h = r <= 6 ? 6 : Math.max(0, Math.round(11.4 - r)); setCell(L, x, z, 'k', h, 18 + h * 1); }
  else if (r <= 12.9) { if (!(Math.abs(dx) <= 1.7)) setCell(L, x, z, '$', 0); else setCell(L, x, z, 'k', 0, 18); }
}
// ---- the four sheds (interior 13 x 7), roofed, with a doorway three wide facing the kiln; the north one has a rear door ---------------------------------------------------------------------------------------------------------------------------------------------
const SHED = { n: [32, 15, 44, 21], s: [32, 55, 44, 61], e: [55, 32, 61, 44], w: [15, 32, 21, 44] };
for (const [k, r] of Object.entries(SHED)) { box(L, [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1], '$', 0); box(L, r, 'k', 0, 9); for (const [x, z] of [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]]) setCell(L, x, z, '$', 0); }
for (let i = -1; i <= 1; i++) { setCell(L, CX + i, 22, 'k', 0, 9); setCell(L, CX + i, 54, 'k', 0, 9); setCell(L, 54, CZ + i, 'k', 0, 9); setCell(L, 22, CZ + i, 'k', 0, 9); }   // the doorways (the shed wall rows / columns beside the kiln's side)
// the north shed's rear door and the way out
L.door(CX, 14, { remote: true }); setCell(L, CX, 14, 'D', 0); box(L, [CX - 1, 14, CX - 1, 14], '$', 0); box(L, [CX + 1, 14, CX + 1, 14], '$', 0);
box(L, [CX, 8, CX, 13], 'k', 0, 9); box(L, [CX - 2, 4, CX + 2, 7], 'k', 0, 9);
// ---- the four watchtowers on the diagonals: a platform of open deck 4 m up, a stair (a unit a cell) up from the yard on the side facing the kiln ------------------------------------------------------------------------------------------------------------------------
const TOW = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [CX + sx * 17, CZ + sz * 17]);
for (const [tx, tz] of TOW) { box(L, [tx - 2, tz - 2, tx + 2, tz + 2], 'd', 8); const sx = tx < CX ? 1 : -1; for (let i = 1; i <= 8; i++) for (let dz = -1; dz <= 1; dz++) setCell(L, tx + sx * (2 + i), tz + dz, 'd', 8 - i); }
ring(L, '!', (x, z) => '%');
const P = placer(L); L.put(26, 54, '@'); P.reserve(26, 54);
const { E, P: PK, PR } = P;
// ---- the seeds: bell nodes, two to a shed, each with a name for its group ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SEEDS = [['s', 36, 60, 45, 36, 58], ['s', 40, 60, 70, 40, 58], ['w', 16, 36, 100, 18, 36], ['w', 16, 40, 125, 18, 40], ['e', 60, 36, 160, 58, 36], ['e', 60, 40, 185, 58, 40], ['n', 36, 16, 220, 36, 18], ['n', 40, 16, 245, 40, 18]];       // [shed, x, z, ripens at (s), where the bell-bearer steps out]
SEEDS.forEach(([, x, z], i) => E('bellnode', x, z, { group: 'seed' + i }));
// ---- the yard ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[24, 56], [52, 56], [24, 24], [52, 24]]) E('tollbearer', x, z); for (const [x, z] of [[30, 46], [46, 46], [30, 30], [46, 30]]) E('gaunt', x, z);
for (const [x, z] of [[20, 50], [56, 50], [20, 26], [56, 26], [38, 24]]) E('gaunt', x, z);
for (const [tx, tz] of TOW) E('bellhand', tx, tz);
E('tollbearer', 36, 49); E('tollbearer', 40, 49); E('tollbearer', 38, 47); E('gaunt', 34, 50); E('bellhand', 42, 46);          // at the kiln house's south gap
E('gill', 52, 46);
for (const k of ['n', 'e', 's', 'w']) { const r = SHED[k]; E(k === 'n' || k === 's' ? 'bellhand' : 'tollbearer', Math.round((r[0] + r[2]) / 2), Math.round((r[1] + r[3]) / 2)); }     // a keeper in each shed
E('gaunt', CX, 6); E('tollbearer', CX - 1, 18); E('bulwark', CX + 3, 19);                                  // (a shell in the north shed: the last fight)                                                          // the way out
// ---- the forks at each shed door (a cluster of three): a broken seed rung out loud calls the yard ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[34, 25], [42, 51], [51, 34], [25, 42]]) { PR('resonator', x, z); PR('resonator', x + 2, z + 1); PR('resonator', x + 1, z - 2); }
for (const [x, z] of [[28, 52], [48, 52], [28, 24], [50, 24]]) PR('lantern', x, z);
for (const [x, z] of [[CX, CZ - 2], [CX - 3, CZ + 3], [CX + 3, CZ + 3]]) PR('lamp', x, z);
PR('vat', CX, CZ);                                                                                       // the furnace
for (const [x, z] of [[33, 17], [43, 17], [33, 59], [43, 59], [57, 34], [57, 42], [19, 34], [19, 42]]) PR('lamp', x, z);
for (const [x, z] of [[30, 38], [46, 38], [26, 26], [50, 50], [26, 50], [50, 26]]) PR('crate', x, z);
for (const [x, z] of [[24, 52], [52, 52], [24, 26], [52, 26]]) PR('barrel', x, z);
for (const [x, z] of [[27, 52], [CX - 7, 53], [CX + 7, 53], [24, 38], [52, 38], [CX, 34], [CX - 7, 24], [CX + 7, 24], [CX, 11]]) PK(x % 3 ? 'health_small' : 'health_large', x, z);
PK('armor_vest', 28, 54); PK('armor_vest', 48, 54); PK('armor_vest', CX, 26);
// ---- the secret: behind the west shed's back wall: the bellwrights' store (the spare bells, four of them) -------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [14, 38], cells: [[11, 37], [12, 37], [13, 37], [11, 38], [12, 38], [13, 38], [11, 39], [12, 39], [13, 39]] };
{ for (const [x, z] of SEC.cells) setCell(L, x, z, 'k', 0, 9); box(L, [10, 36, 14, 36], '$', 0); box(L, [10, 40, 14, 40], '$', 0); box(L, [10, 37, 10, 39], '$', 0); setCell(L, 14, 37, '$', 0); setCell(L, 14, 39, '$', 0); setCell(L, 14, 38, 'S', 0);
  PK('armor_vest', 11, 37); PK('health_large', 13, 37); PK('ammo_shell', 11, 39); PK('ammo_rivet', 13, 39); PK('ammo_flare', 12, 38); }
const warn = (i, t) => ({ id: 'warn' + i, when: ['time:' + (t - 20), 'not:dead:seed' + i], do: [{ message: 'ripening' }] });
const crack = (i, at, t) => ({ id: 'crack' + i, when: ['time:' + t, 'not:dead:seed' + i], do: [{ spawn: { kind: i % 2 ? 'gaunt' : 'tollbearer', at, group: 'born' } }, { message: 'cracked' }] });
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);

// ---- end PT-052 ----

const MAP = {
  id: 'C2M07', name: 'Bellwright Yard', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#b08060', fogDensity: 0.007, sky: 'anselm', look: 'bellwright' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'BELLWRIGHT YARD', lines: ['The Vael do not cast their bells. They grow them.', 'Every one of these is waiting for someone.'] },
  outro: 'Next: the Threshold Ascent, a city built up a cliff of glass, and the shaft in the middle of it.',
  objective: 'Reach the kiln house and its lever: the exit gate is behind the north shed. Break the bells before they crack',
  ...L.layers(),
  secrets: [{ id: 'spares', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'quench', at: [CX - 11, CZ], wall: 'west', once: true, do: [{ open: [CX, 14] }, { message: 'quench' }, { objective: 'The north shed\'s rear door is open: through it to the exit' }, { shake: 1.5 }] },
    { type: 'exit', at: [CX, 5], dest: 'next' }],
  scenery: [{ kind: 'spire', at: [8, 4] }, { kind: 'spire', at: [68, 6] }, { kind: 'spire', at: [38, -16] }],
  messages: [
    { id: 'start', at: [26, 54], radius: 3, speaker: 'INES', text: 'A yard round a kiln. Four long sheds, a tower on each diagonal, and in the middle a furnace the size of a house. The air tastes of hot metal.' },
    { id: 'seeds', at: [24, 50], radius: 4, speaker: 'INES', text: 'Bells on stands in the shed, green with new bronze, ringing very faintly. They weren\'t cast. Each is for somebody who hasn\'t been brought here yet.' },
    { id: 'forks', at: [CX, 52], radius: 3, speaker: 'HULL', text: 'Forks stand at every shed door. A bell broken with a rifle rings them, and the yard hears. A blow, the arc lamp and the tuning-fork gun are quieter.' },
    { id: 'tally', at: [17, 38], radius: 2.5, speaker: "BELLWRIGHT'S TALLY", text: 'THE MARROW ORDER. 311 BELLS GROWN. 311 HUNG. FOUR SPARE.' },
    { id: 'ripening', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'A bell in one of the sheds has begun to ring louder. When it cracks, a bell-bearer steps out of it. Break it first.' },
    { id: 'cracked', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'A bell cracks, and something steps out of it.' },
    { id: 'kiln', at: [CX, 46], radius: 3, speaker: 'INES', text: 'The furnace is banked with salt, not out. The lever on the kiln house wall is the only thing in here that isn\'t hot.' },
    { id: 'quench', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The lever drops. Somewhere behind the north shed a bar falls out of a door.' },
    { id: 'hollow', at: [13, 38], radius: 2, speaker: 'HULL', text: 'The back wall of the west shed rings hollow.' },
  ],
  triggers: [
    { id: 'kiln', when: 'enter', at: [CX, 44], radius: 3, do: [{ objective: 'The kiln house: the lever is on its west wall, at the foot of the stairs' }] },
    ...SEEDS.flatMap(([, , , t, sx, sz], i) => [warn(i, t), crack(i, [sx, sz], t)]),
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 700], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 5, enemyKinds: { tollbearer: 8, gaunt: 5, bellhand: 4, bulwark: 1, bellnode: 8 },
    scaleClass: 'MIXED', introduces: 'seeds: bells that ripen on a clock and crack a bell-bearer out of themselves unless broken first, in sheds with forks at their doors, so a loud kill calls the yard and a quiet one does not' },
};
MAP.drops = { scale: 1.3, keep: [] };
console.log('C2M07: enemies', P.ents.filter((e) => e.type === 'enemy').length);
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M07', lane: [...(laneOf('C2M07') ?? [])], keep: [], plan: [] };
ENC.apply(MAP);

export default MAP;
