// THE HIVE CANTOR'S ARENA (PT-043, design/PREVIEW.md; Act C's boss, C2M24): a DEV-ONLY map with the REAL rules (a mortal player, ammunition that runs out, a heal station and caches, Retry from the death screen as in the game). Build it with
//   node tools/dev/build-range.mjs HIVEBOSS     (maps-dev/HIVEBOSS.json); the DEV level picker lists it. Not one of the 68, never in maps/.
// An AMPHITHEATRE of square rings 33 cells (66 m) across under a 17 m dome: a podium (+0.5 m) with the HIVE CANTOR hovering over it, an arena floor, three tiers of seats rising (+1, +2, +3 m) with 36 singers in them (Tollbearers 18, Choristers 10, Zealots 8: they
// act on the beat, in unison, `onBeat`), six pillars of nerve for cover and for steps. The floors of the tiers are BEAT FLOORS (`pulses`, pink): the inner tier blooms on beat 1 of each bar, the middle on beat 2, the outer on beat 3: stand on the tier that is resting,
// or on a step. The conductor's UNISON SHIELD: it takes 5% while the choir sings, more with every voice that falls; kill them and it is open. Its double returning ring comes on beat 3 of every other bar. Half its hit points or the choir dead: PHASE TWO: a ring every
// bar and Choristers called from the dome. When it falls the beat stops. A start hall with the caches west of the bowl, the exit east of it (locked until the conductor is dead). Every number a first guess, to be felt by the owner.
import { Level } from '../tools/mapkit/builder.mjs';
import { placer, ellipse } from '../tools/mapkit/c2.mjs';

const W = 90, H = 58, L = new Level(W, H, { fill: '#' }); L.usedHeights = true; L.usedCeil = true;
const CX = 54, CZ = 28, S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const P = placer(L, { silent: false }), ents = P.ents, put = (e) => ents.push(e);
const enemy = (kind, x, z, facing, extra = {}) => put({ type: 'enemy', kind, at: [x, z], facing, ...extra });
const FL = 'Θ', WL = 'θ';
// the bowl: square rings (Chebyshev distance from the podium): podium <= 3 (+0.5 m), floor 4..9, tier 1 10..13 (+1 m), tier 2 14..17 (+2 m), tier 3 18..21 (+3 m)
L.room([CX - 15, CZ - 15, CX + 15, CZ + 15], { floor: FL, wall: WL });
const hOf = (d) => (d <= 2 ? 1 : d <= 6 ? 0 : d <= 9 ? 2 : d <= 12 ? 4 : 6);
for (let z = CZ - 15; z <= CZ + 15; z++) for (let x = CX - 15; x <= CX + 15; x++) L.height([x, z, x, z], hOf(Math.max(Math.abs(x - CX), Math.abs(z - CZ))));
L.ceiling([CX - 16, CZ - 16, CX + 16, CZ + 16], 17);
// the gates: the start hall's corridor in the west wall of the bowl, the exit corridor in the east one (both at the height of the top tier)
L.room([CX - 20, CZ - 2, CX - 16, CZ + 2], { floor: 't', wall: '#' }); L.height([CX - 20, CZ - 2, CX - 16, CZ + 2], 6);
L.room([CX + 16, CZ - 2, CX + 22, CZ + 2], { floor: 't', wall: '#' }); L.height([CX + 16, CZ - 2, CX + 22, CZ + 2], 6); L.ceiling([CX + 16, CZ - 2, CX + 22, CZ + 2], 6);
L.room([6, CZ - 8, CX - 21, CZ + 8], { floor: 't', wall: '#' }); L.height([6, CZ - 8, CX - 21, CZ + 8], 6);
// six pillars of nerve, on the tiers (each a 2 x 2 block: cover from a ring, and the step of a pillar's foot)
const PIL = [[CX - 11, CZ - 6], [CX - 11, CZ + 5], [CX + 10, CZ - 6], [CX + 10, CZ + 5], [CX - 6, CZ - 11], [CX + 5, CZ + 10]];
for (const [x, z] of PIL) L.wall([x, z, x + 1, z + 1], WL);
// the beat floors: a tier is four strips; every strip of a tier blooms together, a beat after the tier inside it
const strips = (a, b) => [[CX - b, CZ - b, CX + b, CZ - a - 1], [CX - b, CZ + a + 1, CX + b, CZ + b], [CX - b, CZ - a, CX - a - 1, CZ + a], [CX + a + 1, CZ - a, CX + b, CZ + a]];
const pulses = [];
[[7, 9, 0], [10, 12, -1.5], [13, 15, -3]].forEach(([a, b, phase]) => { for (const r of strips(a, b)) { pulses.push({ rect: r, period: 6, on: 1.5, phase, tint: 0xff6a98 }); for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) if (L.get(x, z) === FL) L.fx([x, z, x, z], 's'); } });
// the singers: 36 in the tiers, facing the podium, none on the west side near the gate
const seat = (tier, side, off) => { const d = [8, 11, 14][tier]; return side === 0 ? [CX + off, CZ - d] : side === 1 ? [CX + d, CZ + off] : side === 2 ? [CX + off, CZ + d] : [CX - d, CZ + off]; };
const choir = []; const OFFS = [-6, -2, 2, 6];
for (let tier = 0; tier < 3; tier++) for (let side = 0; side < 4; side++) for (const off of OFFS) { if (side === 3 && Math.abs(off) < 3) continue; const [x, z] = seat(tier, side, off); if (PIL.some(([px, pz]) => Math.abs(px + 0.5 - x) < 2.2 && Math.abs(pz + 0.5 - z) < 2.2)) continue; choir.push({ tier, x: Math.round(x), z: Math.round(z) }); }
const KINDS = { 0: ['tollbearer'], 1: ['tollbearer', 'zealot'], 2: ['chorister', 'chorister', 'zealot'] }; const counts = { tollbearer: 18, chorister: 10, zealot: 8 }; let placed = 0;
for (const c of choir) { if (placed >= 36) break; const list = KINDS[c.tier]; let kind = list[(c.x + c.z) % list.length]; if (counts[kind] <= 0) kind = Object.keys(counts).find((k) => counts[k] > 0); if (!kind || counts[kind] <= 0) continue; counts[kind]--; placed++; const f = Math.atan2(CX - c.x, CZ - c.z); enemy(kind, c.x, c.z, f, { group: 'choir', onBeat: true, ...(kind === 'tollbearer' ? { variant: 'hived' } : {}) }); }
// the conductor over the podium; its summons come out of the dome's corners in phase two
enemy('hivecantor', CX, CZ, EAST, { group: 'cantor', summons: [[CX - 14, CZ - 14], [CX + 14, CZ - 14], [CX - 14, CZ + 14], [CX + 14, CZ + 14], [CX, CZ - 14], [CX, CZ + 14]] });
// light: lamps round the top tier (pink, as the amphitheatre look), four lanterns at the podium's corners
for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, x = Math.round(CX + Math.cos(a) * 14.8), z = Math.round(CZ + Math.sin(a) * 14.8); put({ type: 'prop', kind: 'lamp', at: [x, z] }); }
for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) put({ type: 'prop', kind: 'lantern', at: [CX + dx, CZ + dz] });
for (const [x, z] of [[12, CZ - 6], [12, CZ + 6], [26, CZ - 6], [26, CZ + 6]]) put({ type: 'prop', kind: 'lamp', at: [x, z] });
// the start hall's caches and the heal station on the top tier (a boss map: every box on the ground)
const AMMO = ['ammo_flare', 'ammo_shell', 'ammo_rivet', 'ammo_bolt', 'ammo_cell', 'ammo_round', 'ammo_rocket'];
AMMO.forEach((k, i) => { P.P(k, 9 + i * 3, CZ - 5); P.P(k, 9 + i * 3, CZ + 5); });
for (const [x, z] of [[12, CZ], [16, CZ], [20, CZ]]) P.P('armor_vest', x, z);
for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.4, x = Math.round(CX + Math.cos(a) * 14), z = Math.round(CZ + Math.sin(a) * 14); P.P(k % 2 ? 'health_large' : 'health_small', x, z); }
for (const [dx, dz] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) { P.P('ammo_rocket', CX + dx, CZ + dz); P.P('ammo_shell', CX + dx + 1, CZ + dz); P.P('health_large', CX + dx, CZ + dz + 1); }
L.put(9, CZ, '@');
put({ type: 'exit', dest: 'next', at: [CX + 21, CZ], locked: true });
const layers = L.layers();

const msg = (id, x, z, r, speaker, text) => ({ id, at: [x, z], radius: r, speaker, text });
export default {
  id: 'HIVEBOSS', name: 'The Hive Cantor (dev only)', version: 1, ceilingHeight: 4.2, dev: true,
  atmosphere: { look: 'conductor', fog: '#2a1a2c', fogDensity: 0.005, sky: 'hive', beat: true },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 24, rivet: 100, bolt: 12, cell: 60, round: 60, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'mortar', 'fork', 'chainsaw', 'boathook', 'marlinspike', 'mallet', 'axe'] },
  intro: { title: 'THE HIVE CANTOR', lines: ['A bowl of seats, thirty-six singers, one conductor over the podium.', 'The real rules: you can die, ammunition runs out. Retry restarts the whole arena.'] },
  objective: 'Cross the start hall to the bowl. The conductor takes 5% while the choir sings: break the choir',
  ...layers,
  pulses,
  entities: ents.map((e) => ({ ...e })),
  scenery: [],
  startFacing: 'east',
  messages: [
    msg('start', 9, CZ, 6, 'HULL', 'THE HIVE CANTOR (dev). Caches here and on the top tier. The beat is the pulse under everything: the singers act on it, the floors bloom on it, the conductor rings on it.'),
    msg('gate', CX - 18, CZ, 3, 'HULL', 'Three tiers and a podium: 36 singers, and the conductor takes 5% while they sing. A tier glows pink before it blooms: inner, middle, outer, a beat each.'),
    msg('ring', CX - 12, CZ, 4, 'HULL', 'Its ring goes out to the wall, turns, and comes home: twice. Cover that held going out must hold coming back. A pillar stops it; a step a metre up passes under.'),
    msg('half', 1, 1, 0.1, 'HULL', 'Half its strength gone or the choir silent: a ring every bar now, and Choristers from the dome. The beat is gone from nothing yet: end it.'),
    msg('dead', 2, 2, 0.1, 'HULL', 'The conductor is down and the beat has stopped. The lights hold still. East of the podium the corridor is open.'),
  ],
  triggers: [
    { id: 'enter', when: 'enter', at: [CX - 18, CZ], radius: 4, do: [{ wake: 'choir' }, { wake: 'cantor' }, { objective: 'The choir is up and the conductor is awake: silence the singers, then break it' }] },
    { id: 'half', when: 'hp:cantor<0.5', do: [{ objective: 'Phase two: a ring every bar and Choristers from the dome' }, { message: 'half' }, { shake: 1.2 }] },
    { id: 'down', when: 'dead:cantor', do: [{ exit: { set: 'unlock' } }, { beatOff: true }, { objective: 'The conductor is down and the beat has stopped. The way east is open' }, { message: 'dead' }] },
  ],
};
console.log('HIVEBOSS: enemies', ents.filter((e) => e.type === 'enemy').length, 'singers', placed);
