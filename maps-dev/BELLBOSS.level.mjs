// THE ROOT BELL'S ARENA (PT-043, design/PREVIEW.md, design/ACTD.md section 4; Act D's last boss, C2M29): a DEV-ONLY map with the REAL rules (a mortal player, ammunition that runs out, caches, Retry from the death screen). Build it with
//   node tools/dev/build-range.mjs BELLBOSS     (maps-dev/BELLBOSS.json); the DEV level picker lists it. Not one of the 68, never in maps/.
// The INSIDE OF A BELL: a round chamber 44 m across (11 cells of radius) under a 17 m dome, dark but for the hand lantern (L), the copper of the roots and the boss's own glow. Three tiers of seating round the floor at +1, +2, +3 m, eight pillars of root on the tiers
// (cover, and the foot of a pillar is a step: a ring passes over anyone a metre above it). Hung from the dome's centre, the CLAPPER (the Root Bell): a bronze cage round a copper heart, a PENDULUM (period 6 s, the line turns at every pass of the middle), a ring struck
// across the floor at the end of a swing, a crush under the middle. FOUR ROOT ANCHORS (nodes, on the tier below the pillars) pin its chain: while one stands it takes 30% of a hit; each one cut lowers it and widens the swing. The last cut and it FALLS and becomes a ground boss:
// a charge (a crash into stone stuns it), rooted spikes where you stand, the guard's second wave (two Zealots). Under 30%: THE LAST NOTE (the lights fall, the note rolls the floor every three seconds over the tiers, the heart cracks open). At zero it does not break:
// it hangs, and every sound in the game cuts out (the score, the ambience, the guns, your steps) for a held second, then one footstep. The stair north opens. A lit lantern cuts a ring to 0.6 (`lampHolds`). Every number a first guess, to be felt by the owner.
import { Level } from '../tools/mapkit/builder.mjs';
import { placer } from '../tools/mapkit/c2.mjs';

const W = 104, H = 76, L = new Level(W, H, { fill: '#' }); L.usedHeights = true; L.usedCeil = true;
const CX = 62, CZ = 42, S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const P = placer(L, { silent: false }), ents = P.ents, put = (e) => ents.push(e);
const enemy = (kind, x, z, facing, extra = {}) => put({ type: 'enemy', kind, at: [x, z], facing, ...extra });
const FL = 'Ν', WL = 'ν';
// the bell: a disc of radius 11: floor r < 5, tier 1 (+1 m) 5..7, tier 2 (+2 m) 7..9, tier 3 (+3 m) 9..11
L.disc(CX, CZ, 11, 11, FL, WL);
// PT-043 report 1: "no way to step back up if you go down into the bell's hole": the tiers were 1 m risers and a player climbs 0.5 m at most; now a half-step ring at every radius, a stair all the way round
const hR = (r) => (r < 5 ? 0 : r < 6 ? 1 : r < 7 ? 2 : r < 8 ? 3 : r < 9 ? 4 : r < 10 ? 5 : 6);
for (let z = CZ - 12; z <= CZ + 12; z++) for (let x = CX - 12; x <= CX + 12; x++) { const r = Math.hypot(x - CX, z - CZ); if (r <= 11 && L.get(x, z) === FL) L.height([x, z, x, z], hR(r)); }
L.ceiling([CX - 12, CZ - 12, CX + 12, CZ + 12], 17);
// the way in: the start hall's corridor in the west rim (at the top tier), and the stair north of the rim (locked until the clapper hangs still)
L.room([CX - 18, CZ - 2, CX - 10, CZ + 2], { floor: 't', wall: '#' }); L.height([CX - 18, CZ - 2, CX - 10, CZ + 2], 6);
L.room([8, CZ - 8, CX - 19, CZ + 8], { floor: 't', wall: '#' }); L.height([8, CZ - 8, CX - 19, CZ + 8], 6);
L.room([CX - 2, CZ - 18, CX + 2, CZ - 10], { floor: 't', wall: '#' }); L.height([CX - 2, CZ - 18, CX + 2, CZ - 10], 6);
// eight pillars of root on tier 2, and the four anchors in front of four of them (on tier 1)
const PIL = []; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8, x = Math.round(CX + Math.cos(a) * 8 - 0.5), z = Math.round(CZ + Math.sin(a) * 8 - 0.5); L.wall([x, z, x + 1, z + 1], WL); PIL.push([x, z, a]); }
for (const [x, z, a] of PIL.filter((_, i) => i % 2 === 0)) enemy('rootanchor', Math.round(CX + Math.cos(a) * 6), Math.round(CZ + Math.sin(a) * 6), a + Math.PI, { group: 'anchors' });
// the clapper over the middle
enemy('rootbell', CX, CZ, EAST, { group: 'rootbell' });
// the guard: wave one (asleep on tier 3, woken with the bell): two Zealots and two Choristers (PT-043 report 1: eight, with an Acolyte, "overwhelmed" the owner on Easy: the fight is about the clapper)
const G1 = [['zealot', 1.0], ['zealot', 3.9], ['chorister', 2.4], ['chorister', 5.4]];
for (const [kind, a] of G1) enemy(kind, Math.round(CX + Math.cos(a) * 10), Math.round(CZ + Math.sin(a) * 10), Math.atan2(CX - (CX + Math.cos(a) * 10), CZ - (CZ + Math.sin(a) * 10)), { group: 'guard1' });
// light: the lantern in the start hall, a few lamps on the top tier (the arena is dark on purpose), oil on the road
for (const [x, z] of [[14, CZ - 6], [14, CZ + 6], [24, CZ - 6], [24, CZ + 6], [CX - 14, CZ + 2], [CX - 14, CZ - 2]]) put({ type: 'prop', kind: 'lantern', at: [x, z] });
for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78, x = Math.round(CX + Math.cos(a) * 10.5), z = Math.round(CZ + Math.sin(a) * 10.5); put({ type: 'prop', kind: 'lamp', at: [x, z] }); }
for (const [x, z] of [[12, CZ], [20, CZ], [CX - 15, CZ - 1], [CX - 15, CZ + 1], [CX + 3, CZ - 14]]) P.P('oil', x, z);
// the caches: everything for every weapon on the start hall and the top tier; the heal station on tier 3
const AMMO = ['ammo_flare', 'ammo_shell', 'ammo_rivet', 'ammo_bolt', 'ammo_cell', 'ammo_round', 'ammo_rocket'];
AMMO.forEach((k, i) => { P.P(k, 10 + i * 3, CZ - 5); P.P(k, 10 + i * 3, CZ + 5); });
for (const [x, z] of [[11, CZ], [14, CZ], [17, CZ]]) P.P('armor_vest', x, z);
for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2, x = Math.round(CX + Math.cos(a) * 9.8), z = Math.round(CZ + Math.sin(a) * 9.8); P.P(k % 2 ? 'health_large' : 'health_small', x, z); P.P(AMMO[(k * 3) % 7], x + 1, z); P.P(AMMO[(k * 3 + 1) % 7], x, z + 1); }
for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78, x = Math.round(CX + Math.cos(a) * 9.5), z = Math.round(CZ + Math.sin(a) * 9.5); P.P('ammo_rocket', x, z); P.P('weapon_mortar', x + 1, z + 1); }
L.put(9, CZ, '@');
put({ type: 'exit', dest: 'next', at: [CX, CZ - 17], locked: true });
const layers = L.layers();

const spawn = (kind, x, z, facing, group) => ({ spawn: { kind, at: [x, z], facing, group } });
const msg = (id, x, z, r, speaker, text) => ({ id, at: [x, z], radius: r, speaker, text });
export default {
  id: 'BELLBOSS', name: 'The Root Bell (dev only)', version: 1, ceilingHeight: 4.2, dev: true,
  atmosphere: { look: 'rootbell', dark: true, fog: '#080604', fogDensity: 0.018, sky: 'root' },
  lantern: { oil: 150, max: 150 },
  lampHolds: { plain: 0.6, own: 0.4 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 24, rivet: 100, bolt: 12, cell: 60, round: 60, rocket: 8 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'mortar', 'fork', 'chainsaw', 'boathook', 'marlinspike', 'mallet', 'axe'] },
  intro: { title: 'THE ROOT BELL', lines: ['The inside of a bell, and its heart on a chain.', 'The real rules. L lights the lantern: it cuts a ring, but eyes follow light. Retry restarts the whole fight.'] },
  objective: 'Cross the start hall into the bell. Shoot the four root anchors from cover; the clapper takes 30% while one stands',
  ...layers,
  entities: ents.map((e) => ({ ...e })),
  scenery: [],
  startFacing: 'east',
  messages: [
    msg('start', 12, CZ, 6, 'HULL', 'THE ROOT BELL (dev). Caches here and on the top tier, oil on the road, the mortar in four places. L lights the lantern; a lit lantern cuts a ring to 0.6 of its blow.'),
    msg('gate', CX - 15, CZ, 3, 'HULL', 'A bell with its heart hung from the dome on a chain. It swings: lead it. Four root anchors on the tier below the pillars hold the chain: while one stands, it takes 30%.'),
    msg('swing', CX - 10, CZ, 3, 'HULL', 'At the end of a swing it strikes a ring across the floor: a metre up, or behind a pillar, it passes. Under the middle it crushes: the orange glow shows where, a second ahead.'),
    msg('guard', 1, 1, 0.1, 'A SONGKEEPER', 'The bell is for the ones who keep it. Go back.'),
    msg('drop', 2, 2, 0.1, 'HULL', 'The chain is gone: it falls. Bait its charge into a pillar or the tier wall and it stands stunned three seconds. Rooted spikes come up where you stand: move.'),
    msg('last', 3, 3, 0.1, 'HULL', 'Under a third: the lights fall, the note rolls the whole floor every three seconds, the tiers too, and the heart is open to everything. Cover, then the mortar and the rockets.'),
    msg('hush', 4, 4, 0.1, 'INES', 'It does not break. It hangs there, and the sound is gone out of the place as though the room had been unscrewed from the air.'),
  ],
  triggers: [
    { id: 'in', when: 'enter', at: [CX - 14, CZ], radius: 4, do: [{ wake: 'rootbell' }, { wake: 'guard1' }, { message: 'guard' }, { objective: 'The clapper swings: shoot the four root anchors from cover' }] },
    { id: 'anchors', when: 'dead:anchors', do: [spawn('zealot', CX - 7, CZ - 7, 0, 'guard2'), spawn('zealot', CX + 7, CZ + 7, N, 'guard2'), { message: 'drop' }, { tremor: 1.6 }, { objective: 'The chain is gone: it falls. Bait its charge into stone, then unload into it' }] },
    { id: 'last', when: 'hp:rootbell<0.3', do: [{ lights: 0.25 }, { tremor: 1.2 }, { message: 'last' }, { objective: 'The Last Note: cover for the ring, then the whole arsenal into the heart' }] },
    { id: 'down', when: 'dead:rootbell', do: [{ silence: true }, { exit: { set: 'unlock' } }, { lights: 0.6 }, { message: 'hush' }, { objective: 'It hangs still. The stair is lit, north of the bell' }] },
  ],
};
console.log('BELLBOSS: enemies', ents.filter((e) => e.type === 'enemy').length);
