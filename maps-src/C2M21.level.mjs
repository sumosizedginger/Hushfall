// C2M21 PULSE FOUNDRY (Campaign 2, Act C; design/ACTC.md section 5). SET-PIECE, threat 9, the peak of the act.
// NESTED RINGS: three catwalk circles at +0, +5 and +10 m round a REACTOR (a pit of white-red light, ten metres wide, swelling on the beat). Between the rings stand retaining walls of cast stone; through each wall four straight ramps (a cell of climb
// to every cell of run) take you up: the outer ring to the middle by the diagonals, the middle ring to the top by the four points of the compass, so each ring must be walked half round to find the way up. Steam jets (hot segments on a clock,
// lit before they fire) cross the catwalks. Low piers of stone on every ring are cover. THE RESONANT, in twos on the middle and top rings, with the ordinary foundry hands round them: a Resonant's ring (every beat, harder with company) is
// answered by distance, by a pier, or by being a metre above or below it: the lanes between the rings are what separates them.
// The way on: three coolant VALVES, one on each ring (a wheel on a steam pipe under a red lamp, beside the Resonants that stand by it); the exit on the top ring opens when all three are turned. Drop-fed ammunition. A hatch under the reactor's rim holds a cache.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';

const W = 100, H = 100, C = 50, L = new Level(W, H, { fill: 'ε' }); L.usedHeights = true;
const OUT = 'Α', MID = 'Η', TOP = 'Β', WALLS = 'ε', INNER = 'α', BONE = 'γ', FLESH = 'Γ';
const rOf = (x, z) => Math.hypot(x + 0.5 - C, z + 0.5 - C), aOf = (x, z) => ((Math.atan2(z + 0.5 - C, x + 0.5 - C) * 180 / Math.PI) + 360) % 360;
const angd = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
// the ramps: radial strips three cells wide at these angles (outer <-> middle: the diagonals; middle <-> top: the compass points)
const R1 = [45, 135, 225, 315], R2 = [0, 90, 180, 270];
const onStrip = (x, z, list) => { const r = rOf(x, z); return list.some((a) => Math.abs(Math.sin((aOf(x, z) - a) * Math.PI / 180)) * r <= 1.6 && angd(aOf(x, z), a) < 40); };
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  const r = rOf(x, z);
  if (r < 7) { setCell(L, x, z, '_', 0); continue; }                                                                    // the reactor pit
  if (r < 8) { L.g[z][x] = INNER; continue; }                                                                           // its rim wall
  if (r <= 13) { setCell(L, x, z, TOP, 20); continue; }                                                                 // the top ring, +10 m
  if (r < 24) { if (onStrip(x, z, R2)) setCell(L, x, z, TOP, 10 + Math.round(10 * (23.5 - r) / 10)); continue; }       // mid -> top ramps
  if (r <= 30) { setCell(L, x, z, MID, 10); continue; }                                                                 // the middle ring, +5 m
  if (r < 41) { if (onStrip(x, z, R1)) setCell(L, x, z, MID, Math.round(10 * (40.5 - r) / 10)); continue; }            // outer -> mid ramps
  if (r <= 47) { setCell(L, x, z, OUT, 0); continue; }                                                                  // the outer ring
}
// a ramp strip must meet the ring at its foot at the right height: clamp
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) { if ('ΑΗΒ'.includes(L.g[z][x])) L.ht[z][x] = Math.max(0, Math.min(20, L.ht[z][x])); }
const polar = (r, a) => [Math.floor(C + r * Math.cos(a * Math.PI / 180)), Math.floor(C + r * Math.sin(a * Math.PI / 180))];
// ---- piers of stone on the rings: cover -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const piers = [];
for (const [r, step, off, list] of [[44, 18, 9, R1], [27, 20, 10, R2], [10.5, 30, 15, []]]) for (let a = off; a < 360; a += step) { const [x, z] = polar(r, a); if (L.g[z]?.[x] && 'ΑΗΒ'.includes(L.g[z][x]) && !list.some((q) => angd(a, q) < 14)) { L.g[z][x] = WALLS; piers.push([x, z]); } }
// ---- steam: hot segments on the catwalks, lit before they fire, one beat apart round each ring -------------------------------------------------------------------------------------------------------------------------------------------------
const pulses = [];
const steam = (r, a0, len, ph) => { const cells = []; for (let k = 0; k < len; k++) { const [x, z] = polar(r, a0 + k * 2.2); if ('ΑΗΒ'.includes(L.g[z]?.[x] ?? '')) cells.push([x, z]); } return cells; };
let sj = 0;
for (const [r, step, a0, wid] of [[44, 45, 20, 1], [27, 60, 30, 1], [10.5, 90, 45, 1]]) for (let a = a0; a < 360; a += step) {
  const [cx, cz] = polar(r, a); if (!'ΑΗΒ'.includes(L.g[cz]?.[cx] ?? '')) continue; if (R1.concat(R2).some((q) => angd(a, q) < 16)) continue;
  const rect = [cx - 1, cz - 1, cx + 1, cz + 1]; let okc = true; for (let z = rect[1]; z <= rect[3]; z++) for (let x = rect[0]; x <= rect[2]; x++) if (!'ΑΗΒ'.includes(L.g[z]?.[x] ?? '')) okc = false; if (!okc) continue; L.fx(rect, 's'); pulses.push({ rect, period: 6, on: 1.5, phase: (6 - 1.5 * (sj++ % 4)) % 6 });
}
void steam;
// ---- the secret: a hatch in the face of the middle ring's retaining wall, between two ramps, with a cache inside the wall -----------------------------------------------------------------------------------------------------------------------
const SEC = { panel: null, cells: [] };
find: for (let a = 272; a < 290; a += 1) {
  if (R1.some((q) => angd(a, q) < 28)) continue; const [cx, cz] = polar(29.2, a); if (L.g[cz]?.[cx] !== MID) continue;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const px = cx + dx, pz = cz + dz; if (L.g[pz][px] !== WALLS) continue;
    const perp = dx === 0 ? [1, 0] : [0, 1]; if (L.g[pz + perp[1]][px + perp[0]] !== WALLS || L.g[pz - perp[1]][px - perp[0]] !== WALLS) continue;
    const cells = []; let ok = true; for (let k = 1; k <= 3 && ok; k++) for (let o = -1; o <= 1 && ok; o++) { const x = px + dx * k + perp[0] * o, z = pz + dz * k + perp[1] * o; if (L.g[z]?.[x] !== WALLS) ok = false; else cells.push([x, z]); }
    if (!ok) continue;
    for (let k = 1; k <= 3; k++) for (let o = -2; o <= 2; o += 4) { const x = px + dx * k + perp[0] * o, z = pz + dz * k + perp[1] * o; if (L.g[z]?.[x] !== WALLS) ok = false; }
    if (!ok) continue;
    SEC.panel = [px, pz]; SEC.cells = cells; SEC.front = [cx, cz]; for (const [x, z] of cells) setCell(L, x, z, FLESH, 10); L.g[pz][px] = 'S'; L.ht[pz][px] = 10; break find;
  }
}
if (!SEC.panel) throw new Error('no place for the hatch');
const CACHE = SEC.cells;
// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; L.put(6, C, '@'); P.reserve(6, C);
const at = (r, a) => polar(r, a);
for (const r of [44, 27, 10.5]) for (let a = 5; a < 360; a += 26) { if ((r === 10.5) && a % 52 !== 5) continue; PR('lamppost', ...at(r + (r > 40 ? 1.5 : r > 20 ? 2 : 1.2), a)); }
// the valves: one on each ring, on the wall beside a ring cell, under a red lamp
const nearWall = (r0, a0) => { let best = null, bd = 1e9; for (let z = 2; z < H - 2; z++) for (let x = 2; x < W - 2; x++) { if (!'ΑΗΒ'.includes(L.g[z][x])) continue; const r = rOf(x, z), a = aOf(x, z); if (angd(a, a0) > 12 || Math.abs(r - r0) > 3) continue; for (const [dx, dz, wall] of [[1, 0, 'east'], [-1, 0, 'west'], [0, 1, 'south'], [0, -1, 'north']]) { const nk = L.g[z + dz][x + dx]; if (nk === WALLS || nk === INNER) { const d = Math.abs(r - r0) + angd(a, a0) * 0.3; if (d < bd) { bd = d; best = { at: [x, z], wall }; } } } } return best; };
const V1 = nearWall(46, 200), V2 = nearWall(30, 292), V3 = nearWall(13, 330);
const valve = (id, v, text) => ({ type: 'switch', id, at: v.at, wall: v.wall, once: true, do: [{ message: id }, { objective: text }] });
for (const v of [V1, V2, V3]) { const [x, z] = v.at; PR('lamppost', x + (v.wall === 'east' ? -1 : v.wall === 'west' ? 1 : 0), z + (v.wall === 'south' ? -1 : v.wall === 'north' ? 1 : 0)); PR('lamppost', x + (v.wall === 'east' || v.wall === 'west' ? 0 : 2), z + (v.wall === 'east' || v.wall === 'west' ? 2 : 0)); }
const EXIT = at(10, 190);
// the roster: the outer ring's hands, the middle ring's pairs, the top ring's pair, and the Resonants
const R = (list, kind, extra = {}) => list.forEach(([r, a]) => E(kind, ...at(r, a), extra));
R([[44, 250], [44, 285], [44, 340], [44, 10]], 'tollbearer', { variant: 'hived' }); R([[44, 140], [44, 90]], 'gaunt'); R([[44, 305]], 'chorister');
R([[27, 245], [27, 280], [27, 330]], 'tollbearer'); R([[27, 15], [27, 70]], 'gaunt'); R([[27, 300], [27, 40]], 'chorister'); R([[27, 120]], 'zealot'); R([[27, 180]], 'bellhand');
R([[10.5, 300], [10.5, 5], [10.5, 85]], 'tollbearer', { variant: 'hived' }); R([[10.5, 345]], 'chorister'); R([[10.5, 150], [10.5, 240]], 'zealot'); E('bulwark', ...at(10.5, 120)); E('sexton', ...at(10.5, 210));
R([[44, 120]], 'resonant'); R([[27, 255], [27, 60]], 'resonant'); R([[10.5, 330], [10.5, 40]], 'resonant');
R([[44, 60], [44, 180]], 'bellhand'); R([[44, 100], [44, 160], [27, 100], [27, 340]], 'tollbearer'); R([[27, 200], [27, 140]], 'gaunt'); R([[44, 50]], 'zealot'); E('sexton', ...at(27, 150));
R([[27, 249], [27, 262]], 'tollbearer', { variant: 'hived' }); R([[10.5, 323]], 'tollbearer', { variant: 'hived' });                       // the company that powers a Resonant's ring
for (const [r, a, k] of [[44, 195, 'health_small'], [44, 215, 'health_large'], [27, 230, 'health_small'], [27, 270, 'health_large'], [27, 310, 'health_small'], [10.5, 280, 'health_large'], [10.5, 320, 'health_small'], [10.5, 355, 'health_large'], [44, 355, 'health_small'], [44, 300, 'health_small']]) PK(k, ...at(r, a));
for (const [r, a] of [[44, 230], [27, 285], [10.5, 300]]) PK('armor_vest', ...at(r, a));
CACHE.slice(0, 5).forEach(([x, z], i) => PK(['armor_vest', 'ammo_rocket', 'ammo_rocket', 'health_large', 'ammo_round'][i], x, z));
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [47,23], radius: 2, cells: ENC.around([47,23], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [54,41], radius: 2, cells: ENC.around([54,41], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M21', name: 'Pulse Foundry', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'reactor', sky: 'ash', beat: true, fog: '#2a1a10', fogDensity: 0.012 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 24, rivet: 100, bolt: 18, cell: 50, round: 50, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'PULSE FOUNDRY', lines: ['Three catwalks round a pit of white light, one above another, and a bell in a body at every turn.', 'The valves that open the way are where the biggest ones stand.'] },
  outro: 'The last wheel stopped and the pit went from white to red, and the red went slowly down. On the top ring a door that had been a wall stood open on a stair, and the stair was cold.',
  objective: 'Climb the rings: three coolant valves, one on each ring, beside the Resonants. The exit on the top ring opens when all three are turned',
  ...L.layers(),
  secrets: [{ id: 'hatch', panel: SEC.panel, cells: SEC.cells }],
  groups: [], pulses,
  entities: [...P.ents,
    valve('v1', V1, 'Valve 1 turned. The middle ring is up the ramps at the corners'), valve('v2', V2, 'Valve 2 turned. The top ring is up the ramps at the compass points'), valve('v3', V3, 'Valve 3 turned. The exit on the top ring is open'),
    { type: 'exit', at: EXIT, dest: 'next', locked: true }],
  scenery: [{ kind: 'reactor', at: [C, C], y: 3, scale: 1.3 }],
  messages: [
    { id: 'start', at: [7, C], radius: 5, speaker: 'INES', text: 'A pit of white light with three catwalks round it, one above another, and a wall between each. The light goes up and down about once every second and a half.' },
    { id: 'steam', at: [12, C - 8], radius: 6, speaker: 'HULL', text: 'A steam jet is lit for a beat before it fires. A segment that is dark has just fired and will not again for four seconds.' },
    { id: 'resonant', at: [30, 30], radius: 7, speaker: 'INES', text: 'Three of them fused at the hip and grown into one body with a skirt of small bells round the waist. The bells ring when something else is near it. Alone, it\'s slow.' },
    { id: 'ring', at: [C - 20, C - 25], radius: 6, speaker: 'HULL', text: 'Its ring comes out of the waist on the beat. A pier of stone stops it, and so does a catwalk above or below it. Keep it away from the others.' },
    { id: 'log', at: [41, 48], radius: 5, speaker: 'FOREMAN LOG', text: 'FUSED THIS WEEK: 9. Each of the nine was three singers, and the Hive counts them as three. A ring of nine bells is cheaper than twenty-seven voices.' },
    { id: 'ramps', at: [12, 31], radius: 6, speaker: 'HULL', text: 'The ramps to the middle ring are at the corners, the ramps to the top at the points of the compass. You cannot go straight up.' },
    { id: 'v1', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The first wheel is turned. The pipe beside it goes quiet and the steam on this ring is a shade lower.' },
    { id: 'v2', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The second wheel is turned. The pit is a little less white.' },
    { id: 'v3', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The third wheel is turned. The seal on the top ring has let go.' },
    { id: 'exit', at: [EXIT[0] + 1, EXIT[1]], radius: 4, speaker: 'HULL', text: 'The exit is sealed by three valves, one on each ring. The wheels are under red lamps, on the walls beside the catwalks.' },
    { id: 'hatch', at: [SEC.panel[0] - 1, SEC.panel[1]], radius: 3, speaker: 'HULL', text: 'A short run of the retaining wall above the pit rings hollow. There is a hatch in it.' },
    { id: 'cache', at: [CACHE[0]?.[0] ?? 50, CACHE[0]?.[1] ?? 50], radius: 3, speaker: 'A SILENT (NOTE)', text: 'I stoked the pit for a year. Nobody counts what goes into it, and nobody counts what is left out. Take it.' },
  ],
  triggers: [
    { id: 'mid', when: 'enter', at: at(27, 245), radius: 8, do: [{ objective: 'Middle ring: valve 2 is on a wall by the catwalk. Up at the compass points' }] },
    { id: 'top', when: 'enter', at: at(10.5, 300), radius: 6, do: [{ objective: 'The top ring: valve 3, then the exit' }] },
    { id: 'open', when: ['msg:v1', 'msg:v2', 'msg:v3'], do: [{ exit: { set: 'unlock' } }, { objective: 'All three valves are turned. The exit on the top ring is open' }] },
  ],
  quality: { enemies: [30, 80], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6,
    enemyKinds: { resonant: 3, tollbearer: 8, gaunt: 3, chorister: 3, zealot: 2, bellhand: 2, bulwark: 1, sexton: 1 },
    scaleClass: 'SET-PIECE', reason: 'the place is three open catwalks round a pit: the player fights in the round, in the open, and the rings are the only way up', introduces: 'the Resonant: fused singers whose ring grows with their company, so the answer is to take them one at a time' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M21: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'valves', V1, V2, V3, 'exit', EXIT, 'panel', SEC.panel, 'cache', CACHE.length, 'pulses', pulses.length, 'piers', piers.length);
const Q = (r, a) => at(r, a);
const route = [[6, 50, 0], Q(44, 190), { op: 'switch', id: 'v1' }, Q(44, 205), Q(44, 215), Q(44, 225), Q(36, 225), Q(27, 225), Q(27, 240), Q(27, 255), Q(27, 270), { op: 'switch', id: 'v2' }, Q(27, 270), Q(20, 270), Q(13.5, 270), Q(10.5, 285), Q(10.5, 300), { op: 'switch', id: 'v3' }, Q(10.5, 270), Q(10.5, 240), Q(10.5, 215), [EXIT[0] + 1, EXIT[1], 0], [EXIT[0], EXIT[1], 0]];
export const waypoints = { main: route, secret: route.slice(0, 11).concat([[SEC.front[0], SEC.front[1]], { op: 'use', at: SEC.panel }, [CACHE[1][0], CACHE[1][1], 0], [SEC.front[0], SEC.front[1], 0]], route.slice(11)) };
// ---- PT-057 (R9, weapon mods): the mortar airburst, in an alcove of the foundry, off the road ----
MAP.entities ??= [];
MAP.entities.push(...[["mod_airburst",52,16]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
// ---- end PT-057 ----
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M21', lane: [...(laneOf('C2M21') ?? [])], keep: [], plan: [{"from":"tollbearer","to":"chorister","pick":"spread","n":1},{"from":"tollbearer","to":"bellhand","pick":"spread","n":1},{"from":"tollbearer","to":"gaunt","pick":"spread","n":1}] };
ENC.apply(MAP);

// ---- PT-070 unless (the story pass): reminders that are silent once the thing they remind of has happened
for (const [mid, unless] of Object.entries({ "exit": ["msg:v3"] })) MAP.messages.find((m) => m.id === mid).unless = unless;
// ---- end PT-070 unless
export default MAP;
