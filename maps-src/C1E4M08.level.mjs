// C1E4M08 GATE WARDEN: the end of Campaign One. An oval hall under a dome, seventy cells by sixty: a RIM walkway all the way round (1 m up), a RING WALL of dark stone with four gaps (the stations: a step down each) separating the rim from the ARENA, and at the
// arena's east end a DAIS (3 m up, with six metres of stair all round it) where the GATE WARDEN stands: an arch of bone and brass in the mouth of the way out, with a ring of light behind it. The east half of the hall is open to the sky (the Gate's light pours in);
// the west half has its dome. The Warden never moves. Three SEALS stand in the arena (a node each: the shield is 5% while any stands). Its SWEEP (src/engine/sweep.js) is a beam of white through a half circle after a 2.4 s tell: pillars stop it (a dozen blocks of
// stone stand about the arena, and they are what makes the hall compress), the MIRRORS (three, on plinths, one-sided, turned a quarter step by Use) turn it: a beam that comes off a mirror turned the right way passes through the seal beyond it and shatters it. Or shoot the
// seals. It also sings a ring of tone like the Cantors' and calls Drone-Gills out of the walls. The exit, behind the dais, is locked until it falls. Scale class MIXED (the dome over the west half and the rim, the sky over the east). Look: gate (white and black).
import { Level, hchar } from '../tools/mapkit/builder.mjs';

const W = 72, H = 60, CX = 36, CZ = 30, RAD = Math.PI / 180, R2 = Math.SQRT1_2;
const L = new Level(W, H, { fill: '2' });
L.usedHeights = true; L.usedCeil = true;
const q = (x, z, ax, bz) => ((x + 0.5 - CX) / ax) ** 2 + ((z + 0.5 - CZ) / bz) ** 2;
const ang = (x, z) => { let a = Math.atan2(z + 0.5 - CZ, x + 0.5 - CX) / RAD; if (a < 0) a += 360; return a; };
const DOME = CX + 3;                                                                                   // west of this column the hall has a dome; east of it, the sky
const STATIONS = [270, 90, 215, 145];                                                                    // the gaps in the ring wall: north, south, north-west, south-west
const inGap = (x, z) => STATIONS.some((s) => { const d = Math.abs(((ang(x, z) - s + 540) % 360) - 180); return 180 - d < 4.2; });
const DAIS = { cx: CX + 25, cz: CZ, rx: 12, rz: 13 };
const daisR = (x, z) => Math.hypot((x + 0.5 - DAIS.cx) / DAIS.rx, (z + 0.5 - DAIS.cz) / DAIS.rz);
const daisH = (x, z) => { const r = daisR(x, z); if (r >= 1) return 0; return r <= 0.5 ? 6 : Math.round(6 * (1 - (r - 0.5) / 0.5)); };
const FL = (x) => (x < DOME ? ';' : '<');                                                                // roofed gate floor in the west, open gate floor in the east

// ---- the hall: rim, ring wall with its gaps, arena, dais --------------------------------------------------------------------------------------------------------------------------------------------------------
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  const arena = q(x, z, 25.5, 18.5) <= 1, ring = !arena && q(x, z, 27, 20) <= 1, hall = !arena && !ring && q(x, z, 31, 24) <= 1;
  if (arena) { L.g[z][x] = FL(x); L.ht[z][x] = Math.max(0, daisH(x, z)); }
  else if (ring) { if (inGap(x, z)) { L.g[z][x] = FL(x); L.ht[z][x] = 1; } else L.g[z][x] = '1'; }
  else if (hall) { L.g[z][x] = FL(x); L.ht[z][x] = 2; }
}
// the way out: a straight two-wide corridor east from the dais, through the ring wall and the rim, with a wall on each side (the rim is cut by it); the exit at its end
const EXZ = CZ - 1;
for (let x = DAIS.cx - 6; x <= W - 3; x++) { for (const z of [EXZ - 1, EXZ + 2]) { if (x >= CX + 24) L.g[z][x] = '2'; } for (const z of [EXZ, EXZ + 1]) { L.g[z][x] = '<'; L.ht[z][x] = 6; } }
const EXIT = [W - 3, EXZ];

// ---- the entities' ground: the Warden, the mirrors, the seals ------------------------------------------------------------------------------------------------------------------------------------------------------
const FACE = [[-R2, -R2], [R2, -R2], [R2, R2], [-R2, R2]];
const WARDEN = [DAIS.cx - 2, CZ];                                                                        // (cell coordinates; the Warden stands near the centre of the dais' flat top)
const MIRRORS = [{ id: 'm1', at: [CX + 9, CZ], want: -1 }, { id: 'm2', at: [CX + 5, CZ - 8], want: -1 }, { id: 'm3', at: [CX + 5, CZ + 8], want: 1 }];
const clearLine = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let i = 0; i <= n; i++) { const x = Math.floor(a[0] + 0.5 + (b[0] - a[0]) * i / n), z = Math.floor(a[1] + 0.5 + (b[1] - a[1]) * i / n); if (!/[;<]/.test(L.g[z]?.[x] ?? '2')) return false; } return true; };
const SEALS = [];
for (const m of MIRRORS) {
  const dx = m.at[0] - WARDEN[0], dz = m.at[1] - WARDEN[1], len = Math.hypot(dx, dz), d = [dx / len, dz / len];
  let best = null;
  for (let rot = 0; rot < 4; rot++) {
    const n = FACE[rot], dn = d[0] * n[0] + d[1] * n[1]; if (dn >= 0) continue;
    const r = [d[0] - 2 * dn * n[0], d[1] - 2 * dn * n[1]];
    for (let D = 9; D >= 5; D--) {
      const s = [Math.round(m.at[0] + r[0] * D), Math.round(m.at[1] + r[1] * D)];
      if (q(s[0], s[1], 25.5, 18.5) > 0.82 || !clearLine(m.at, s) || r[1] * m.want < 0.35) continue;
      if (!best || D > best.D) best = { rot, D, s, r }; break;
    }
  }
  if (!best) { console.log('C1E4M08: no seal spot for mirror', m.id); continue; }
  m.rot = (best.rot + 2) % 4; m.solve = best.rot; SEALS.push(best.s);                                    // it starts with its BACK to the Warden: the beam ends there until the player turns it
}
const reserved = [];                                                                                      // lines the beam must be able to take: Warden -> mirror, mirror -> seal
MIRRORS.forEach((m, i) => { reserved.push([WARDEN, m.at]); if (SEALS[i]) reserved.push([m.at, SEALS[i]]); });
const nearLine = (x, z, w = 1.9) => reserved.some(([a, b]) => { const vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz, t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)); return Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t)) < w; });

// ---- twelve blocks of stone about the arena: cover from the sweep and the thing that makes the hall compress (2 x 2 solid) ------------------------------------------------------------------------------------------
const BLOCKS = [];
const ring = (n, rx, rz, off) => { for (let i = 0; i < n; i++) { const a = (off + (360 * i) / n) * RAD, x = Math.round(CX + rx * Math.cos(a)), z = Math.round(CZ + rz * Math.sin(a)); BLOCKS.push([x, z]); } };
ring(6, 10, 7, 30); ring(8, 19, 13.5, 8);
BLOCKS.push([46, 20], [46, 38], [50, 14], [50, 44], [52, 24], [52, 34], [44, 26], [44, 33]);                            // cover on the way to the dais
const blockOk = (x, z) => { for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) { const xx = x + dx, zz = z + dz; if (q(xx, zz, 25.5, 18.5) > 0.9 || daisR(xx, zz) < 1.12 || nearLine(xx, zz) || !/[;<]/.test(L.g[zz]?.[xx] ?? '2')) return false; } return !MIRRORS.some((m) => Math.hypot(m.at[0] - x, m.at[1] - z) < 3.2) && !SEALS.some((s) => Math.hypot(s[0] - x, s[1] - z) < 3.2); };
const PILLARS = [];
for (const [x, z] of BLOCKS) { if (!blockOk(x, z)) { console.log('C1E4M08: block skipped', x, z); continue; } for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) { L.g[z + dz][x + dx] = '1'; L.ht[z + dz][x + dx] = 0; } PILLARS.push([x, z]); }

// ---- the secret: a loose panel in the north wall of the rim, a chamber behind it ------------------------------------------------------------------------------------------------------------------------------------
let SECRET = null;
{ const solid = (x, z) => L.g[z]?.[x] === '2';
  for (let off = 0; off < 16 && !SECRET; off++) for (const sgn of [1, -1]) {
    const bx = CX + sgn * off - 14, bz = [...Array(10).keys()].map((k) => k + 5).find((z) => /[;<]/.test(L.g[z]?.[bx] ?? '2')); if (bz == null) continue;
    const px = bx, pz = bz - 1; if (!solid(px, pz) || !solid(px - 1, pz) || !solid(px + 1, pz)) continue;
    let ok = true; for (let dz = 1; dz <= 5 && ok; dz++) for (let dx = -2; dx <= 2; dx++) if (!solid(px + dx, pz - dz) || pz - dz < 1) ok = false;
    if (!ok || pz - 4 < 1) continue;
    const cells = [], h = L.ht[bz][bx];
    for (let dz = 2; dz <= 4; dz++) for (let dx = -1; dx <= 1; dx++) { L.g[pz - dz][px + dx] = ';'; L.ht[pz - dz][px + dx] = h; cells.push([px + dx, pz - dz]); }
    L.g[pz - 1][px] = ';'; L.ht[pz - 1][px] = h; cells.push([px, pz - 1]);
    L.g[pz][px] = 'S'; L.ht[pz][px] = h; SECRET = { panel: [px, pz], cells, centre: [px, pz - 3], h, front: [bx, bz] }; break;
  }
}

// windows: panes of glass in the hall's outer wall behind the rim, every so often
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) { if (L.g[z][x] !== '2') continue; const qq = q(x, z, 31, 24); if (qq <= 1 || qq > 1.12) continue; if (Math.floor(ang(x, z) / 7) % 2 === 0 && Math.abs(ang(x, z) - 0) > 6) L.g[z][x] = 'J'; }

// ---- ceilings: the dome over the west half (14 m), the secret chamber low ------------------------------------------------------------------------------------------------------------------------------------------
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { const c = L.g[z][x]; if (c === ';') L.ce[z][x] = hchar(L.ht[z][x] + 28); else if (c === 'S') L.ce[z][x] = hchar(L.ht[z][x] + 8); }
if (SECRET) for (const [x, z] of SECRET.cells) L.ce[z][x] = hchar(SECRET.h + 8);

// ---- objects --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const ents = [], used = new Set();
const isFloor = (x, z) => /[;<]/.test(L.g[z]?.[x] ?? '2');
const blocked = (x, z) => !isFloor(x, z) || used.has(x + ',' + z) || nearLine(x, z, 1.2);
const spot = (x0, z0) => { for (let k = 0; k <= 4; k++) for (let dz = -k; dz <= k; dz++) for (let dx = -k; dx <= k; dx++) { const x = x0 + dx, z = z0 + dz; if (!blocked(x, z)) return [x, z]; } return null; };
const put = (type, kind, x, z, extra = {}) => { const p = spot(x, z); if (!p) { console.log('C1E4M08: no cell for', kind, x, z); return null; } used.add(p.join(',')); ents.push({ type, kind, at: p, ...extra }); return p; };
if (SECRET) for (const [ox, oz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) used.add((SECRET.front[0] + ox) + ',' + (SECRET.front[1] + oz));
const START = [CX - 29, CZ]; used.add(START.join(',')); for (const [dx, dz] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) used.add((START[0] + dx) + ',' + (START[1] + dz)); L.put(START[0], START[1], '@');
const E = (kind, x, z, extra) => put('enemy', kind, x, z, extra);
// the mirrors, the seals and the Warden
for (const m of MIRRORS) { used.add(m.at.join(',')); ents.push({ type: 'prop', kind: 'mirror', id: m.id, at: m.at, rot: m.rot }); }
for (const s of SEALS) { used.add(s.join(',')); ents.push({ type: 'enemy', kind: 'seal', at: s, group: 'seals', facing: 'east' }); }
const SUMMONS = [[CX + 12, CZ - 15], [CX + 12, CZ + 15], [CX + 4, CZ - 16], [CX + 4, CZ + 16]].map(([x, z]) => spot(x, z)).filter(Boolean);
ents.push({ type: 'enemy', kind: 'gatewarden', at: WARDEN, facing: 'west', group: 'warden', summons: SUMMONS });
// the rim: the sleepers of the hall; the arena: the rest
E('tollbearer', CX - 26, CZ - 6); E('tollbearer', CX - 26, CZ + 6); E('tollbearer', CX - 22, CZ - 15); E('gaunt', CX - 14, CZ - 20); E('gaunt', CX - 22, CZ + 15); E('gaunt', CX - 14, CZ + 20);
E('chorister', CX, CZ - 21); E('chorister', CX, CZ + 21); E('tollbearer', CX + 10, CZ - 20); E('tollbearer', CX + 10, CZ + 20);
E('tollbearer', CX - 18, CZ - 3); E('tollbearer', CX - 18, CZ + 3); E('gaunt', CX - 10, CZ - 8); E('gaunt', CX - 10, CZ + 8); E('bellhand', CX + 4, CZ - 3); E('gaunt', CX + 4, CZ + 4);
// lamps under the dome; lampposts in the open half
for (const [x, z] of [[CX - 24, CZ - 8], [CX - 24, CZ + 8], [CX - 12, CZ - 14], [CX - 12, CZ + 14], [CX - 14, CZ], [CX - 4, CZ - 16], [CX - 4, CZ + 16], [CX - 20, CZ - 12], [CX - 20, CZ + 12], [CX, CZ - 8], [CX, CZ + 8]]) { if (isFloor(x, z) && !used.has(x + ',' + z) && L.ce[z][x] !== '.') { used.add(x + ',' + z); ents.push({ type: 'prop', kind: 'lamp', at: [x, z] }); } }
for (const [x, z] of [[CX + 8, CZ - 6], [CX + 8, CZ + 6], [CX + 14, CZ - 12], [CX + 14, CZ + 12], [DAIS.cx - 8, CZ - 6], [DAIS.cx - 8, CZ + 6]]) { const p = spot(x, z); if (p) { used.add(p.join(',')); ents.push({ type: 'prop', kind: 'lamppost', at: p }); } }
// health and ammunition: the boss map keeps every box (see MAP.drops); the supply is round the arena's rim of stations
const P = (kind, x, z) => put('pickup', kind, x, z);
for (const [x, z] of [[CX - 24, CZ - 4], [CX - 24, CZ + 4], [CX - 16, CZ - 12], [CX - 16, CZ + 12], [CX - 8, CZ - 5], [CX - 8, CZ + 5], [CX + 2, CZ - 10], [CX + 2, CZ + 10], [CX + 8, CZ - 2], [CX + 8, CZ + 2], [CX + 14, CZ - 8], [CX + 14, CZ + 8]]) {
  const i = ents.length % 5; P(['health_small', 'ammo_rivet', 'ammo_shell', 'ammo_flare', 'ammo_rivet'][i], x, z);
}
for (const [x, z] of [[CX - 3, CZ - 3], [CX - 3, CZ + 3], [CX + 6, CZ - 14], [CX + 6, CZ + 14], [CX - 20, CZ - 16], [CX - 20, CZ + 16], [CX + 12, CZ - 13], [CX + 12, CZ + 13], [CX + 14, CZ - 6], [CX + 14, CZ + 6], [CX + 16, CZ - 10], [CX + 16, CZ + 10], [CX + 17, CZ - 3], [CX + 17, CZ + 3], [CX + 10, CZ - 6], [CX + 10, CZ + 6]]) P(['health_large', 'armor_vest'][(x + z) % 2], x, z);
for (const [x, z] of [[CX - 12, CZ - 2], [CX - 12, CZ + 2], [CX + 12, CZ - 10], [CX + 12, CZ + 10]]) P('ammo_rivet', x, z);
for (const [x, z] of [[CX - 6, CZ - 14], [CX - 6, CZ + 14], [CX + 16, CZ - 4], [CX + 16, CZ + 4]]) P('ammo_shell', x, z);
for (const [x, z] of [[CX - 6, CZ - 8], [CX - 6, CZ + 8], [CX + 18, CZ - 2], [CX + 18, CZ + 2]]) P('ammo_flare', x, z);
if (SECRET) { const [qx, qz] = SECRET.centre; for (const [k, dx, dz] of [['ammo_shell', -1, 0], ['ammo_rivet', 1, 0], ['ammo_flare', 0, 1], ['health_large', 1, 1], ['armor_vest', -1, 1]]) ents.push({ type: 'pickup', kind: k, at: [qx + dx, qz + dz] }); }
for (const [x, z] of PILLARS) void x, void z;

const MAP = {
  id: 'C1E4M08', name: 'Gate Warden', version: 1, ceilingHeight: 14, par: { time: 720 },
  atmosphere: { fog: '#c8ccdc', fogDensity: 0.0035, sky: 'gate', look: 'gate' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'GATE WARDEN', lines: ['The Gate is behind it. It is the colour of the inside of a bell.', 'It has been here since before there was anything to keep out.'] },
  outro: 'The ring of light folds in on itself, and the Gate is a doorway. What is on the other side has been waiting the whole time.',
  objective: 'The Warden holds the Gate, at the east end of the arena. Three seals shield it',
  ...L.layers(),
  startFacing: 'east',
  secrets: SECRET ? [{ id: 'rim-panel', panel: SECRET.panel, cells: SECRET.cells }] : [],
  groups: [{ name: 'warden', rect: [WARDEN[0], WARDEN[1], WARDEN[0], WARDEN[1]] }, ...SEALS.map((s) => ({ name: 'seals', rect: [s[0], s[1], s[0], s[1]] }))],
  entities: [...ents, { type: 'exit', at: EXIT, locked: true, dest: 'next' }],
  messages: [
    { id: 'start', at: START, radius: 4, speaker: 'SIGNAL HOUSE', text: 'Calder, the Gate Warden. Three seals hold its shield up. Its eye opens before the beam. Stone stops the beam; the mirrors turn it.' },
    { id: 'rim', at: [CX - 20, CZ - 15], radius: 4, speaker: 'INES', text: 'The wall has gaps: steps down to the arena. The rim goes all the way round. It is a place to run.' },
    { id: 'mirrors', at: [CX + 5, CZ + 3], radius: 4, speaker: 'HULL', text: 'Mirror plinths, one-sided: a back stops the light. Use turns one a quarter step. Light off the face runs straight on, and there are seals on those lines.' },
    { id: 'shield', at: [CX, CZ], radius: 0.1, speaker: 'INES', text: 'The last seal is gone. The shield is gone. Hit it with everything.' },
    ...(SECRET ? [{ id: 'panel', at: SECRET.panel, radius: 3, speaker: 'HULL', text: 'The panel in the rim wall rings hollow.' }] : []),
    { id: 'broken', at: [EXIT[0] - 4, EXIT[1]], radius: 3, speaker: 'SIGNAL HOUSE', text: 'It is down. The Gate is open, Calder. The way out is the way in. Whatever is on the other side has stopped being quiet.' },
  ],
  triggers: [
    { id: 'rim', when: 'enter', at: [CX - 20, CZ - 15], radius: 3, do: [{ objective: 'Down the steps to the arena. The seals are on plinths between the stone blocks' }] },
    { id: 'seals-down', when: 'dead:seals', do: [{ objective: 'The shield is down. Hit the Warden with everything: east end of the arena' }, { shake: 2 }, { message: 'shield' }] },
    { id: 'warden-dead', when: 'dead:warden', do: [{ exit: { set: 'unlock' } }, { objective: 'The Gate is open: the corridor behind the dais' }, { shake: 3 }, { message: 'broken' }] },
  ],
  quality: { enemies: [14, 70], botSeconds: [60, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 5, enemyKinds: { gatewarden: 1, seal: 3, tollbearer: 6, gaunt: 5, chorister: 2, bellhand: 1 },
    scaleClass: 'MIXED', tallReason: 'a domed hall: the Gate Warden stands 7.2 m and the dome is the 14 m the ring of light needs',
    introduces: 'the Gate Warden: a boss arch that never moves, shielded while its three seals stand, sweeping a beam of light through a half circle (stone stops it, a mirror turns it onto a seal), singing a ring and calling Drone-Gills' },
};
MAP.drops = { scale: 1.3, keep: [[0, 0, 999, 999]] };
console.log('C1E4M08: enemies', ents.filter((e) => e.type === 'enemy').length, 'seals', SEALS.length, 'blocks', PILLARS.length, 'mirror rots', JSON.stringify(MIRRORS.map((m) => [m.id, m.rot, m.solve])), 'secret', SECRET?.panel);
export default MAP;
export { L, WARDEN, EXIT, START, SEALS, MIRRORS, PILLARS, SECRET, DAIS };
