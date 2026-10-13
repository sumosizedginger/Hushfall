// C2M24 CHOIR OF ONE (Campaign 2, Act C; design/ACTC.md section 5; the boss of the act, built from the arena the owner played in the Preview: maps-dev/HIVEBOSS). SET-PIECE in spirit, MIXED by the contract (the tiers are roofed, the middle is open to the sky).
// An AMPHITHEATRE of square rings 31 cells (62 m) across: a flat podium with the HIVE CANTOR hovering over it, an arena floor open to the sky with four blocks of nerve to hide behind, and three TIERS of seats under the dome rising a metre each, each with a half-step in front, with 9 singers
// (Tollbearers 5, Zealots 4: the singers of the Preview that shot from the top tier stay in the dome, called in phase two) who act on the beat, in unison (`onBeat`). Six pillars of nerve stand on the tiers for cover and for steps. The floors of the tiers are BEAT FLOORS (`pulses`): the inner tier blooms on beat 1 of a bar, the middle on beat 2, the outer on beat 3:
// stand on the tier that is resting, or on a step. The conductor's UNISON SHIELD takes 95% while the choir sings, a little less with every voice that falls; its double returning ring comes on beat 3 of every other bar and is low (a tier a metre up clears it; so does a block or a pillar).
// At half its hit points, or with the choir dead, PHASE TWO: a ring every bar and Choristers called from the dome. When it falls the beat stops (`beatOff`): Act D is quiet because of it. The start hall west of the bowl holds every box of ammunition (a boss map keeps them all); the exit is east of the
// podium and opens when the conductor is dead. A conductor's alcove behind the north wall, behind a pillar, is the secret.
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';

const W = 90, H = 58, L = new Level(W, H, { fill: 'θ' }); L.usedHeights = true; L.usedCeil = true;
const CX = 54, CZ = 28, EAST = Math.PI / 2;
const P = placer(L, { silent: false }), ents = P.ents, put = (e) => ents.push(e), enemy = (kind, x, z, facing, extra = {}) => put({ type: 'enemy', kind, at: [x, z], facing, ...extra });
const FL = 'Θ', OPEN = 'Π', WL = 'θ', HALLF = 't';
const hOf = (d) => (d <= 6 ? 0 : d === 7 ? 1 : d <= 9 ? 2 : d === 10 ? 3 : d <= 12 ? 4 : d === 13 ? 5 : 6);                 // a half-step in front of each tier: the bowl can be climbed out of anywhere
for (let z = CZ - 15; z <= CZ + 15; z++) for (let x = CX - 15; x <= CX + 15; x++) { const d = Math.max(Math.abs(x - CX), Math.abs(z - CZ)); setCell(L, x, z, d <= 9 ? OPEN : FL, hOf(d), d <= 9 ? null : 34); }
const hall = (r, h, lid) => { for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) setCell(L, x, z, HALLF, h, lid); };
hall([CX - 20, CZ - 2, CX - 16, CZ + 2], 6, 14); hall([CX + 16, CZ - 2, CX + 22, CZ + 2], 6, 14); hall([6, CZ - 8, CX - 21, CZ + 8], 6, 14);
// the walls round the halls take the bowl's skin: the ring of the rooms
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (L.g[z][x] === 'θ') { let touch = false; for (let dz = -1; dz <= 1 && !touch; dz++) for (let dx = -1; dx <= 1; dx++) { const c = L.g[z + dz]?.[x + dx]; if (c === HALLF) { touch = true; break; } } if (touch) L.g[z][x] = '#'; }
// six pillars of nerve on the tiers; four blocks on the arena floor (the ring is a plane at the conductor's floor: the floor needs something to hide behind)
const PIL = [[CX - 11, CZ - 6], [CX - 11, CZ + 5], [CX + 10, CZ - 6], [CX + 10, CZ + 5], [CX - 6, CZ - 11], [CX + 5, CZ + 10]];
for (const [x, z] of PIL) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) L.g[z + dz][x + dx] = WL;
const FLOORPIL = [[CX - 5, CZ - 5], [CX + 4, CZ - 5], [CX - 5, CZ + 4], [CX + 4, CZ + 4]];
for (const [x, z] of FLOORPIL) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) L.g[z + dz][x + dx] = WL;
// the beat floors: four strips to a tier; a tier blooms a beat after the one inside it
const strips = (a, b) => [[CX - b, CZ - b, CX + b, CZ - a - 1], [CX - b, CZ + a + 1, CX + b, CZ + b], [CX - b, CZ - a, CX - a - 1, CZ + a], [CX + a + 1, CZ - a, CX + b, CZ + a]];
const pulses = [];
[[7, 9, 0], [10, 12, -1.5], [13, 15, -3]].forEach(([a, b, phase]) => { for (const r of strips(a, b)) { pulses.push({ rect: r, period: 6, on: 1.5, phase }); for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) if (L.g[z][x] === FL || L.g[z][x] === OPEN) L.fx([x, z, x, z], 's'); } });
// the conductor's alcove: behind the north wall, behind the pillar at (CX - 6, CZ - 11): the panel is in the wall of the top tier
const XS = CX - 6, ZS = CZ - 16, SEC = { panel: [XS, ZS], cells: [] };
for (let z = ZS - 3; z <= ZS - 1; z++) for (let x = XS - 1; x <= XS + 1; x++) { setCell(L, x, z, FL, 6, 14); SEC.cells.push([x, z]); }
L.g[ZS][XS] = 'S'; L.ht[ZS][XS] = 6;
// the singers: 16 in the tiers, facing the podium, none on the west side near the gate
const seat = (tier, side, off) => { const d = [8, 11, 14][tier]; return side === 0 ? [CX + off, CZ - d] : side === 1 ? [CX + d, CZ + off] : side === 2 ? [CX + off, CZ + d] : [CX - d, CZ + off]; };
const choir = []; const OFFS = [-6, -2, 2, 6], SINGERS = 9;
for (let tier = 0; tier < 3; tier++) for (let side = 0; side < 4; side++) for (const off of OFFS) { if (side === 3 && Math.abs(off) < 3) continue; const [x, z] = seat(tier, side, off); if (PIL.some(([px, pz]) => Math.abs(px + 0.5 - x) < 2.2 && Math.abs(pz + 0.5 - z) < 2.2)) continue; choir.push({ tier, x: Math.round(x), z: Math.round(z) }); }
const KINDS = { 0: ['tollbearer'], 1: ['tollbearer', 'zealot'], 2: ['zealot', 'zealot', 'tollbearer'] }; const counts = { tollbearer: 5, chorister: 0, zealot: 4 }; let placed = 0, seen = 0;
for (const c of choir) { if (placed >= SINGERS) break; seen++; if (Math.floor(seen * SINGERS / choir.length) === Math.floor((seen - 1) * SINGERS / choir.length)) continue; const list = KINDS[c.tier]; let kind = list[(c.x + c.z) % list.length]; if (counts[kind] <= 0) kind = Object.keys(counts).find((k) => counts[k] > 0); if (!kind || counts[kind] <= 0) continue; counts[kind]--; placed++; const f = Math.atan2(CX - c.x, CZ - c.z); enemy(kind, c.x, c.z, f, { group: 'choir', onBeat: true, ...(kind === 'tollbearer' ? { variant: 'hived' } : {}) }); }
enemy('hivecantor', CX, CZ, EAST, { group: 'cantor', summons: [[CX - 14, CZ - 14], [CX + 14, CZ - 14], [CX - 14, CZ + 14], [CX + 14, CZ + 14], [CX, CZ - 14], [CX, CZ + 14]] });
// light: lamps round the top tier (under the dome), lanterns at the podium's corners, lamps in the halls
for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, x = Math.round(CX + Math.cos(a) * 14.8), z = Math.round(CZ + Math.sin(a) * 14.8); put({ type: 'prop', kind: 'lamp', at: [x, z] }); }
for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) put({ type: 'prop', kind: 'lantern', at: [CX + dx, CZ + dz] });
for (const [x, z] of [[12, CZ - 6], [12, CZ + 6], [26, CZ - 6], [26, CZ + 6], [CX + 18, CZ - 1], [CX + 21, CZ + 1], [CX - 18, CZ - 1]]) put({ type: 'prop', kind: 'lamp', at: [x, z] });
// the start hall's caches and the heal stations on the top tier (a boss map: every box on the ground)
const AMMO = ['ammo_flare', 'ammo_shell', 'ammo_rivet', 'ammo_bolt', 'ammo_cell', 'ammo_round', 'ammo_rocket'];
AMMO.forEach((k, i) => { P.P(k, 9 + i * 3, CZ - 5); P.P(k, 9 + i * 3, CZ + 5); });
for (const x of [10, 13, 16, 19]) P.P('ammo_bolt', x, CZ - 2);
for (const [x, z] of [[12, CZ], [16, CZ], [20, CZ]]) P.P('armor_vest', x, z);
for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.4, x = Math.round(CX + Math.cos(a) * 14), z = Math.round(CZ + Math.sin(a) * 14); P.P(k % 2 ? 'health_large' : 'health_small', x, z); }
for (const [dx, dz] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) { P.P('ammo_rocket', CX + dx, CZ + dz); P.P('ammo_shell', CX + dx + 1, CZ + dz); P.P('health_large', CX + dx, CZ + dz + 1); }
for (const [dx, dz, k] of [[-7, 0, 'health_large'], [7, 0, 'health_large'], [0, -7, 'health_large'], [0, 7, 'health_large'], [-7, 7, 'armor_vest'], [7, -7, 'armor_vest'], [-8, -3, 'health_small'], [8, 3, 'health_small']]) P.P(k, CX + dx, CZ + dz);
for (const [x, z, k] of [[44, 24, 'health_large'], [44, 28, 'health_large'], [43, 26, 'health_large'], [42, 24, 'armor_vest'], [42, 28, 'armor_vest'], [41, 26, 'health_large'], [44, 31, 'health_large'], [44, 25, 'health_small']]) P.P(k, x, z);                      // on the west tiers, where a player climbs out of the ring
SEC.cells.slice(0, 5).forEach(([x, z], i) => P.P(['armor_vest', 'ammo_rocket', 'ammo_rocket', 'health_large', 'ammo_round'][i], x, z));
L.put(9, CZ, '@'); const EXIT = [CX + 21, CZ];
put({ type: 'exit', dest: 'next', at: EXIT, locked: true });
const msg = (id, x, z, r, speaker, text) => ({ id, at: [x, z], radius: r, speaker, text });
const MAP = {
  id: 'C2M24', name: 'Choir of One', version: 1, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { look: 'conductor', fog: '#2a1a2c', fogDensity: 0.005, sky: 'hive', beat: true },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 28, shell: 24, rivet: 200, bolt: 24, cell: 70, round: 60, rocket: 8 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'CHOIR OF ONE', lines: ['A bowl of seats, sixteen singers, one conductor over the podium.', 'Everything in the Hive keeps time to it.'] },
  outro: 'The conductor stopped in the middle of a bar and the lights on the ribs went still. For the first time in this country nothing is keeping time.',
  objective: 'Cross the start hall to the bowl. The conductor takes a twentieth of what you hit it with while the choir sings: break the choir. Its ring is low',
  ...L.layers(),
  secrets: [{ id: 'alcove', panel: SEC.panel, cells: SEC.cells }],
  groups: [], pulses,
  entities: ents.map((e) => ({ ...e })),
  scenery: [{ kind: 'hivetower', at: [CX, 0], y: 0, scale: 2.4 }],
  messages: [
    msg('start', 9, CZ, 6, 'INES', 'A long hall with every box I could want in it, laid out in two rows, as if somebody expected a person to come and take them. Somebody has.'),
    msg('plate', CX - 18, CZ, 3, 'COUNT PLATE', 'OWED 52,310. SUNG 49,715. SHORT 2,595. It is the same plate as the one at the first fire-base, and the sum has not moved.'),
    msg('gate', CX - 14, CZ, 4, 'HULL', 'Nine singers in three tiers. The conductor takes a twentieth of a hit while they sing, and more with every one that falls. A tier lights before it blooms.'),
    msg('ring', CX - 12, CZ, 4, 'HULL', 'The baton rises a beat before the ring. It goes out, turns, and comes home. Stand a metre up on a tier, or behind a block or a pillar. A half-step is too low.'),
    msg('half', 1, 1, 0.1, 'HULL', 'Half its strength gone, or the choir silent: a ring every bar now, and Choristers from the dome.'),
    msg('dead', 2, 2, 0.1, 'HULL', 'The conductor is down and the beat has stopped. The lights hold still. East of the podium the corridor is open.'),
    msg('hollow', XS, ZS + 3, 3, 'HULL', 'The wall of the top tier rings hollow behind the north pillar. There is a seam in it.'),
    msg('alcove', XS, ZS - 2, 3, 'A SILENT (NOTE)', 'A conductor sits down between movements. This was the chair. Whoever it was is not on the podium now, and the baton is on the podium. Draw the line.'),
    msg('exit', EXIT[0] - 3, EXIT[1], 3, 'INES', 'A corridor, straight, at the height of the top tier. At the far end the air is cold, and nothing in it is keeping time.'),
  ],
  triggers: [
    { id: 'enter', when: 'enter', at: [CX - 18, CZ], radius: 4, do: [{ wake: 'choir' }, { wake: 'cantor' }, { objective: 'The choir is up and the conductor is awake: silence the singers, then break it' }] },
    { id: 'half', when: 'hp:cantor<0.5', do: [{ objective: 'Phase two: a ring every bar and Choristers from the dome' }, { message: 'half' }, { shake: 1.2 }] },
    { id: 'down', when: 'dead:cantor', do: [{ exit: { set: 'unlock' } }, { beatOff: true }, { objective: 'The conductor is down and the beat has stopped. The way east is open' }, { message: 'dead' }] },
  ],
  quality: { enemies: [8, 40], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 5,
    enemyKinds: { hivecantor: 1, tollbearer: 4, zealot: 3 },
    scaleClass: 'MIXED', introduces: 'the Hive Cantor: a read-the-beat boss, a conductor whose choir is its shield, whose floors bloom on the beat and whose ring comes back' },
};
MAP.drops = { scale: 1.3, keep: [[0, 0, 999, 999]] };
console.log('C2M24: enemies', ents.filter((e) => e.type === 'enemy').length, 'singers', placed, 'panel', SEC.panel);
const G = (x, z) => [x, z, 0];
export const waypoints = {
  main: [G(9, CZ), G(20, CZ), G(CX - 19, CZ), G(CX - 16, CZ), G(CX - 12, CZ), { op: 'killboss' }, G(CX + 10, CZ), G(CX + 16, CZ), G(CX + 20, CZ), G(EXIT[0], EXIT[1])],
  secret: [G(9, CZ), G(20, CZ), G(CX - 19, CZ), G(CX - 16, CZ), G(CX - 12, CZ), { op: 'killboss' }, G(XS, ZS + 4), { op: 'use', at: SEC.panel }, G(XS, ZS - 2), G(XS, ZS + 4), G(CX + 10, CZ), G(CX + 16, CZ), G(CX + 20, CZ), G(EXIT[0], EXIT[1])],
};
export default MAP;
