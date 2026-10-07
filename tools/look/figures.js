// L0 look bible: the creature DESIGN STUDIES as data (design/LOOK_BIBLE.md). Pure functions, no p5, no DOM: tools/look/recipes_look.js draws them (flat silhouettes + painted studies) and
// tools/look/check-figures.mjs checks them against defs.js (drawn height, width) in plain Node.
// Coordinates are METRES, front view, x to the right, y UP from the feet (a hovering flyer includes its hover). These are not meshes and not game assets; they are the designs the L1 rigs must reproduce.
// Language of the design ("Tuned", owner-approved 2026-10-06): a silhouette is an instrument family (BELL, PIPE, CLAPPER, DRUM/SHELL, TINE/FORK, GLASS-BELL, SAC); humans are being tuned into instruments; the Vael are the singers.
// Legibility rule (renderer, 480 px internal width): every silhouette-defining part is at least ~15 cm at its thinnest; finer line-work is texture (hatch, nodal figures), never geometry.

export const COL = {
  bone: '#d9cdb0', boneLt: '#efe6cc', boneSh: '#a89c80', bronze: '#b8722e', bronzeLt: '#d9a04c', bronzeDk: '#6b3a14', verd: '#4f8a74', oxb: '#6a1f24', oxbDk: '#3a0f12', violet: '#5b3f7a',
  oil: '#2d2a1d', oilLt: '#8a6d18', skin: '#bdbaa9', skinSh: '#8e9a88', ink: '#0d0f14', teal: '#3fffe0', sulphur: '#e8c25a', iron: '#33363a', amber: '#d8c08a', glass: '#e9e2c6',
};

// ---- geometry helpers ------------------------------------------------------------------------------------------------------------
const neg = ([x, y]) => [-x, y];
/** a closed outline from its RIGHT half, listed top to bottom (x >= 0); the left half is the mirror image */
export const sym = (half) => { const full = [...half, ...half.slice().reverse().map(neg)]; return full.filter((p, i) => i === 0 || Math.hypot(p[0] - full[i - 1][0], p[1] - full[i - 1][1]) > 1e-6); };
/** closed Chaikin corner cutting: a polygon becomes a soft closed curve (the silhouette and the painted shape use the SAME points) */
export const chaikin = (pts, it = 2) => { let p = pts; for (let k = 0; k < it; k++) { const q = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } p = q; } return p; };
export const ell = (cx, cy, rx, ry, rot = 0, n = 20) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; });
/** a tapered limb between two points with widths w0 (at a) and w1 (at b) */
export const limb = (x0, y0, x1, y1, w0, w1) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; return [[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]]; };

// ---- item constructors (the little drawing language) -----------------------------------------------------------------------------
const P = (pts, col, o = {}) => ({ t: 'part', pts, col, ...o });
const S = (half, col, o = {}) => P(half, col, { sym: true, ...o });
const B = (x0, y0, x1, y1, col, o = {}) => P([[x0, y1], [x1, y1], [x1, y0], [x0, y0]], col, { it: 0, ...o });
const E = (cx, cy, rx, ry, col, o = {}) => P(ell(cx, cy, rx, ry, o.rot ?? 0, o.n ?? 20), col, { it: 1, ...o });
const L = (x0, y0, x1, y1, w0, w1, col, o = {}) => P(limb(x0, y0, x1, y1, w0, w1), col, { it: 1, ...o });
const ln = (a, b, col, o = {}) => ({ t: 'line', a, b, col, ...o });
const dot = (at, r, col, o = {}) => ({ t: 'dot', at, r, col, ...o });
const ring = (at, r, col, o = {}) => ({ t: 'ring', at, r, col, ...o });
const nod = (box, n, m, col, o = {}) => ({ t: 'nodal', box, n, m, col, ...o });
const echo = (of, k, dx, dy, col = COL.teal) => ({ t: 'echo', of, k, dx, dy, col });          // the RINGING tell: the outline of a part (by id) repeated k times, drifting, in the Hush colour
const H = (ang, gap, col, wt = 0.6) => ({ ang, gap, col, wt });                      // a hatch (engraving) spec for a part

const C = COL;

// ---- the ten kinds ---------------------------------------------------------------------------------------------------------------
/** TOLLBEARER (BELL). stage 0 = early graft (Episode 1), stage 2 = grown (Episode 2+). The drawn height is 2.25 at EVERY stage (the hit height is fixed): stage 0 is stretched and tall with a narrow bell. */
export function tollbearer(stage = 2) {
  // the bell grows from the RIGHT shoulder (leaning out, like a satchel of bronze) and the body leans LEFT under its weight: a lopsided, top-heavy figure that nothing else in the roster resembles
  const bell = stage === 0 ? [[0.28, 2.25], [0.34, 2.18], [0.42, 2.0], [0.5, 1.78], [0.52, 1.5], [0.1, 1.5], [0.15, 1.8], [0.22, 2.0], [0.26, 2.15]]
    : [[0.34, 2.25], [0.42, 2.18], [0.52, 1.98], [0.62, 1.7], [0.64, 1.48], [0.06, 1.48], [0.14, 1.78], [0.24, 2.0], [0.3, 2.15]];
  const lip = stage === 0 ? [0.31, 1.5, 0.21] : [0.35, 1.48, 0.29];
  const lean = ([x, y]) => [x - 0.13 * Math.min(1, Math.max(0, (y - 0.55) / 1.1)), y];
  const leanItem = (it) => (it.t === 'part' ? { ...it, pts: (it.sym ? sym(it.pts) : it.pts).map(lean), sym: false } : it.t === 'line' ? { ...it, a: lean(it.a), b: lean(it.b) } : it.t === 'echo' ? it : { ...it, at: lean(it.at) });
  const len = [0.5, 0.64, 0.42, 0.68, 0.46, 0.6, 0.44], tat = (stage === 2 ? len : []).map((l, i) => P([[-0.255 + i * 0.085, 0.92], [-0.175 + i * 0.085, 0.92], [-0.215 + i * 0.085 + (i % 2 ? 0.015 : -0.015), 0.92 - l]], C.oil, { it: 0, ink: false }));
  const fixed = [
    P(bell, C.bronze, { id: 'bell', hatch: H(80, 5, C.bronzeDk, 0.6) }),
    ...(stage === 2 ? [P([[0.1, 1.7], [0.6, 1.68], [0.64, 1.48], [0.06, 1.48]], C.verd, { a: 210, ink: false, it: 1 })] : []),
    E(lip[0], lip[1], lip[2], 0.05, C.bronzeDk, { wt: 1 }),
    nod([stage === 0 ? 0.14 : 0.12, 1.7, stage === 0 ? 0.46 : 0.58, 2.2], 2, 3, '#2a1608', { clip: 'bell', wt: 0.7 }),
    echo('bell', 2, 9, -3),
    ...[-1, 1].flatMap((s) => [
      L(s * 0.09, 0.98, s * 0.1, 0.5, 0.16, 0.14, C.oil), L(s * 0.1, 0.52, s * 0.1, 0.08, 0.12, 0.1, '#a9b0a0', { hatch: H(80, 5, '#4a5044', 0.5) }),
      P([[s * 0.04, 0.09], [s * 0.18, 0.09], [s * 0.21, 0], [s * 0.03, 0]], C.oil, { it: 0 }),
    ]),
  ];
  const body = [
    ...tat,
    S(stage === 2 ? [[0.07, 1.64], [0.25, 1.55], [0.26, 1.3], [0.24, 1.05], [0.27, 0.9], [0, 0.9]] : [[0.07, 1.64], [0.25, 1.55], [0.26, 1.3], [0.24, 1.05], [0.31, 0.78], [0.26, 0.58], [0.2, 0.7], [0.16, 0.52], [0.1, 0.68], [0.05, 0.54], [0, 0.62]], C.oil, { id: 'coat', hatch: H(78, 6, '#14120a', 0.5) }),
    S([[0.25, 1.55], [0.26, 1.3], [0.24, 1.05], [0.21, 1.05], [0.23, 1.3], [0.22, 1.52]], C.oilLt, { ink: false, a: 220, it: 1 }),
    S([[0, 1.52], [0.075, 1.5], [0.075, 1.1], [0, 1.08]], '#0f0d0a', { it: 0 }),
    ...[-0.05, -0.025, 0, 0.025, 0.05].map((x) => ln([x, 1.13], [x, 1.47], C.boneLt, { k: '2B', wt: 1 })),
    ...[1.2, 1.3, 1.4].map((y) => ln([-0.075, y], [0.075, y], C.boneSh, { k: '2B', wt: 0.9 })),
    // arms bend: dark sleeves, pale long forearms, big hands with long fingers; the right hand steadies the weight
    L(-0.28, 1.56, -0.38, 1.2, 0.13, 0.11, C.oil), L(-0.38, 1.22, -0.33, 0.76, 0.1, 0.09, C.skin), E(-0.32, 0.64, 0.07, 0.13, C.skin, { rot: -0.1 }),
    ...[-0.04, 0, 0.04].map((d) => ln([-0.32 + d, 0.54], [-0.36 + d * 2, 0.3], C.boneSh, { k: '2B', wt: 1.4 })),
    L(0.27, 1.56, 0.34, 1.2, 0.13, 0.11, C.oil), L(0.34, 1.22, 0.4, 0.82, 0.1, 0.09, C.skin), E(0.41, 0.7, 0.07, 0.13, C.skin, { rot: 0.1 }),
    ...[-0.04, 0, 0.04].map((d) => ln([0.41 + d, 0.6], [0.43 + d * 2, 0.36], C.boneSh, { k: '2B', wt: 1.4 })),
    L(0, 1.6, -0.05, 1.78, 0.1, 0.09, '#a39f8c'),
    ln([-0.03, 1.74], [0.0, 1.5], C.bronzeLt, { k: '2B', wt: 2 }), ln([0.02, 1.74], [0.07, 1.52], C.bronzeLt, { k: '2B', wt: 2 }),         // grown cables from the jaw into the chest: the tuning
    E(-0.07, 1.94, 0.105, 0.2, C.skin, { rot: 0.3, id: 'head', hatch: H(70, 5, '#5e5a48', 0.5) }),
    E(-0.105, 1.85, 0.03, 0.09, '#120808', { it: 1, ink: false, rot: 0.3 }), E(-0.03, 1.99, 0.026, 0.03, '#120808', { it: 1, ink: false }),
    dot([-0.115, 1.99], 0.02, C.teal), ring([-0.105, 1.85], 0.09, '#2a2a24', { wt: 0.5 }), ring([-0.105, 1.85], 0.13, '#2a2a24', { wt: 0.4 }),
    ...(stage === 2 ? [P([[-0.2, 1.62], [-0.34, 2.0], [-0.42, 1.6]], C.boneLt, { it: 0, wt: 1 })] : []),   // one bone vane on the other shoulder: the grown graft
  ].map(leanItem);
  return [...fixed, ...body];
}

/** GAUNT (UNTUNED): stripped, no instrument, too-long limbs, the jaw unhinged as a horn. 1.5 m. */
export function gaunt() {
  return [
    ...[-1, 1].flatMap((s) => [L(s * 0.1, 0.64, s * 0.27, 0.36, 0.13, 0.11, '#cdc6b0'), L(s * 0.27, 0.38, s * 0.21, 0.07, 0.11, 0.09, '#c4bca6'), P([[s * 0.1, 0.07], [s * 0.34, 0.07], [s * 0.38, 0], [s * 0.12, 0]], '#b5ad96', { it: 0 })]),
    S([[0.1, 1.14], [0.18, 1.06], [0.2, 0.82], [0.14, 0.62], [0, 0.6]], '#cdc6b0', { id: 'torso', hatch: H(75, 5, '#6a6450', 0.5) }),
    E(0.07, 0.92, 0.07, 0.13, C.oxb, { a: 190, ink: false }),
    ...[0.98, 0.9, 0.82, 0.74].map((y) => ln([-0.13, y], [0.13, y], C.boneSh, { k: '2B', wt: 0.8 })),
    ...[-1, 1].flatMap((s) => [L(s * 0.17, 1.06, s * 0.31, 0.62, 0.11, 0.1, '#cdc6b0'), L(s * 0.31, 0.64, s * 0.4, 0.2, 0.1, 0.09, '#c4bca6'), ...[-0.06, 0, 0.06].map((d) => ln([s * 0.4 + d, 0.22], [s * 0.43 + d, 0.02], C.boneSh, { k: '2B', wt: 1.1 }))]),
    // the jaw has come off its hinge: a long bone jaw hangs and the throat is a red horn; no instrument yet, only the horn
    S([[0.06, 1.22], [0.075, 1.02], [0.03, 0.88], [0, 0.86]], '#cdc6b0', { it: 1, id: 'jaw' }),
    E(0, 1.34, 0.15, 0.2, '#cdc6b0', { id: 'head', hatch: H(70, 5, '#6a6450', 0.5) }),
    E(0, 1.2, 0.075, 0.1, C.oxbDk, { it: 1, ink: false }),
    ...[-0.05, -0.025, 0.025, 0.05].map((x) => ln([x, 1.27], [x * 0.8, 1.2], C.boneLt, { k: '2B', wt: 1.3 })),
    dot([-0.065, 1.42], 0.026, C.teal), dot([0.065, 1.42], 0.026, C.teal),
  ];
}

/** BELLHAND (CLAPPER): a collar-bell, one arm grown into a hanging clapper-hammer, the other raising a bell-cup. 2.35 m. */
export function bellhand() {
  return [
    ...[-1, 1].flatMap((s) => [L(s * 0.07, 0.96, s * 0.08, 0.07, 0.12, 0.1, '#a9b0a0', { hatch: H(80, 5, '#4a5044', 0.5) }), P([[s * 0.03, 0.08], [s * 0.17, 0.08], [s * 0.2, 0], [s * 0.02, 0]], C.oil, { it: 0 })]),
    S([[0.06, 1.86], [0.17, 1.78], [0.17, 1.3], [0.14, 1.0], [0.19, 0.72], [0.14, 0.62], [0.09, 0.72], [0.04, 0.62], [0, 0.68]], C.oil, { id: 'coat', hatch: H(78, 6, '#14120a', 0.5) }),
    S([[0.1, 2.0], [0.17, 1.96], [0.32, 1.82], [0.4, 1.7], [0.08, 1.76]], C.bronze, { id: 'collar', hatch: H(80, 5, C.bronzeDk, 0.6) }),
    E(0, 1.72, 0.4, 0.05, C.bronzeDk, { wt: 1 }),
    nod([-0.15, 1.74, 0.15, 1.98], 2, 3, '#2a1608', { clip: 'collar', wt: 0.6 }),
    // the long arm (left) swings out: a hammer-limb to the knee ending in a clapper knob
    L(-0.2, 1.74, -0.36, 1.3, 0.14, 0.12, C.oil), L(-0.36, 1.32, -0.46, 0.75, 0.13, 0.13, C.skin, { hatch: H(80, 5, '#5e5a48', 0.5) }),
    ln([-0.46, 0.72], [-0.48, 0.58], C.boneSh, { k: '2B', wt: 1.6 }), E(-0.48, 0.46, 0.15, 0.15, C.bronze, { id: 'clapper', hatch: H(60, 5, C.bronzeDk, 0.6) }), dot([-0.48, 0.46], 0.03, C.teal),
    // the raised arm (right) holds a bronze cup like a hand-bell
    L(0.2, 1.74, 0.34, 1.56, 0.13, 0.11, C.oil), L(0.34, 1.58, 0.42, 2.0, 0.12, 0.1, C.skin),
    P(sym([[0.0, 2.32], [0.1, 2.22], [0.18, 2.04], [0.21, 2.0]]).map(([x, y]) => [x + 0.42, y]), C.bronze, { id: 'cup', hatch: H(80, 5, C.bronzeDk, 0.6) }),
    E(0.0, 2.17, 0.12, 0.17, C.skin, { id: 'head', hatch: H(70, 5, '#5e5a48', 0.5) }),
    E(0.0, 2.1, 0.03, 0.055, '#120808', { it: 1, ink: false }),
    dot([-0.045, 2.22], 0.019, C.teal), dot([0.045, 2.22], 0.019, C.teal),
  ];
}

/** SEXTON (PIPE): a comb of pipes grown from the back, a floor-length robe, a stooped hooded head. 2.35 m. */
export function sexton() {
  // stooped: the hooded head hangs LOW between the shoulders (1.5 m), the pipes rise from the back above it to 2.35; the robe is a bell-skirt that flares to the floor. A top-wide, bottom-wide figure with a waist.
  const xs = [-0.34, -0.17, 0, 0.17, 0.34], tops = [1.95, 2.2, 2.35, 2.2, 1.95];
  return [
    ...xs.map((x, i) => B(x - 0.08, 1.2, x + 0.08, tops[i], i % 2 ? C.bone : C.bronze, { id: 'pipe' + i, hatch: H(90, 5, i % 2 ? C.boneSh : C.bronzeDk, 0.6) })),
    ...xs.map((x) => B(x - 0.05, 1.5, x + 0.05, 1.62, '#120d08', { ink: false })),
    dot([0, 1.56], 0.022, C.teal),
    S([[0.08, 1.45], [0.22, 1.38], [0.2, 1.05], [0.2, 0.85], [0.36, 0.4], [0.52, 0.08], [0.5, 0], [0, 0]], C.oil, { id: 'robe', hatch: H(84, 6, '#14120a', 0.5) }),
    S([[0.22, 1.38], [0.2, 1.05], [0.2, 0.85], [0.36, 0.4], [0.52, 0.08], [0.47, 0.08], [0.32, 0.4], [0.16, 0.85], [0.16, 1.05], [0.17, 1.34]], C.oilLt, { ink: false, a: 200, it: 1 }),
    E(0, 1.55, 0.17, 0.19, C.oil, { it: 1 }), E(0, 1.52, 0.09, 0.12, '#cfc9b2', { id: 'face' }),
    E(0, 1.46, 0.035, 0.055, '#120808', { it: 1, ink: false }), dot([-0.04, 1.56], 0.018, C.teal), dot([0.04, 1.56], 0.018, C.teal),
    L(-0.2, 1.3, -0.26, 0.8, 0.12, 0.1, C.oil), L(0.2, 1.3, 0.26, 0.8, 0.12, 0.1, C.oil), ln([0.26, 0.8], [0.26, 0.52], C.boneSh, { k: '2B', wt: 1.2 }), E(0.26, 0.42, 0.09, 0.1, C.bronze, { wt: 1.1 }),
  ];
}

/** WARDEN-GRAFT (SHELL/DRUM): a squat hulk carrying a grown drum-shell on its chest, a faceless bone plate for a head. 3.0 m. */
export function wardengraft() {
  const items = [
    ...[-1, 1].flatMap((s) => [L(s * 0.24, 1.05, s * 0.26, 0.1, 0.3, 0.26, C.oil, { hatch: H(82, 6, '#14120a', 0.5) }), P([[s * 0.1, 0.12], [s * 0.42, 0.12], [s * 0.46, 0], [s * 0.08, 0]], C.iron, { it: 0 })]),
    S([[0.28, 2.55], [0.5, 2.35], [0.54, 1.3], [0.4, 1.0], [0, 1.0]], C.oil, { id: 'body', hatch: H(78, 6, '#14120a', 0.5) }),
    L(-0.5, 2.3, -0.64, 1.3, 0.26, 0.24, C.oil), E(-0.67, 1.1, 0.16, 0.15, C.skin, { hatch: H(70, 5, '#5e5a48', 0.5) }),
    L(0.5, 2.3, 0.64, 1.3, 0.26, 0.24, C.oil), E(0.67, 1.1, 0.16, 0.15, C.skin, { hatch: H(70, 5, '#5e5a48', 0.5) }),
    E(0, 1.85, 0.53, 0.6, C.bronzeDk, { n: 32, wt: 1.5 }),
    E(0, 1.85, 0.46, 0.53, '#d6cdb0', { n: 32, id: 'drum', hatch: H(70, 6, '#8a7e60', 0.5) }),
    ...[0.14, 0.24, 0.34, 0.43].map((r) => ring([0, 1.85], r, '#3a3020', { wt: 0.6 })),
    ...Array.from({ length: 12 }, (_, i) => dot([Math.cos(i / 12 * Math.PI * 2) * 0.5, 1.85 + Math.sin(i / 12 * Math.PI * 2) * 0.57], 0.035, C.bronzeLt)),
    E(0, 1.85, 0.1, 0.11, C.bronze, { wt: 1.2 }), ring([0, 1.85], 0.15, C.teal, { wt: 0.9 }),
    L(0, 2.45, 0, 2.7, 0.2, 0.18, C.oil),
    E(0, 2.82, 0.15, 0.17, '#cfc7aa', { id: 'plate', hatch: H(80, 5, '#8a7e60', 0.5) }),
    B(-0.025, 2.7, 0.025, 2.92, '#120808', { ink: false }),
  ];
  return items;
}

/** CANTOR (CHOIR-MASTER): a tall bell-organ robe, a façade of pipes on the chest, a halo of resonator petals, two fork-bearing arms. 4.8 m. */
export function cantor() {
  const petals = Array.from({ length: 8 }, (_, k) => { const a = Math.PI / 2 + k / 8 * Math.PI * 2; return E(Math.cos(a) * 0.48, 4.15 + Math.sin(a) * 0.48, 0.2, 0.085, k % 2 ? C.bone : C.boneLt, { rot: a, hatch: H(Math.round(a * 180 / Math.PI), 4, C.boneSh, 0.5), wt: 1.2 }); });
  const ptop = [2.8, 3.1, 3.3, 3.1, 2.8];
  return [
    ...petals,
    ring([0, 4.15], 0.92, C.teal, { wt: 1 }),
    S([[0.12, 3.95], [0.26, 3.75], [0.4, 3.0], [0.54, 2.0], [0.66, 1.0], [0.74, 0.15], [0.7, 0], [0, 0]], C.oil, { id: 'robe', hatch: H(85, 6, '#14120a', 0.5) }),
    ...[-0.24, -0.12, 0, 0.12, 0.24].map((x, i) => B(x - 0.055, 1.5, x + 0.055, ptop[i], i % 2 ? C.bone : C.bronze, { hatch: H(90, 5, i % 2 ? C.boneSh : C.bronzeDk, 0.6) })),
    ...[-0.24, 0, 0.24].map((x) => B(x - 0.035, 1.75, x + 0.035, 1.9, '#120d08', { ink: false })),
    L(-0.36, 3.75, -0.78, 3.15, 0.2, 0.16, C.oil), L(0.36, 3.75, 0.78, 3.15, 0.2, 0.16, C.oil),
    B(-0.94, 3.1, -0.82, 3.7, C.iron), B(-0.74, 3.1, -0.62, 3.7, C.iron), B(-0.94, 3.05, -0.62, 3.14, C.iron),
    B(0.82, 3.1, 0.94, 3.7, C.iron), B(0.62, 3.1, 0.74, 3.7, C.iron), B(0.62, 3.05, 0.94, 3.14, C.iron),
    E(0, 4.12, 0.18, 0.26, C.skin, { id: 'head', hatch: H(70, 5, '#5e5a48', 0.5) }), E(0, 4.04, 0.07, 0.12, '#100808', { it: 1, ink: false }),
    dot([-0.07, 4.2], 0.022, C.teal), dot([0.07, 4.2], 0.022, C.teal),
  ];
}

/** BELL NODE (RESONATOR): a bell hung in a tuning-fork frame. 2.45 m. */
export function bellnode() {
  // a tuning fork struck into the ground: two flared tines, and the bell floats between them on the sound (no cord, no gallows)
  return [
    B(-0.5, 0, 0.5, 0.3, C.iron, { hatch: H(0, 5, '#14161a', 0.5) }),
    ...[-1, 1].map((s) => L(s * 0.15, 0.3, s * 0.58, 2.45, 0.24, 0.2, C.bone, { hatch: H(90, 5, C.boneSh, 0.6) })),
    S([[0.0, 2.02], [0.08, 1.98], [0.13, 1.72], [0.24, 1.3], [0.28, 1.1]], C.bronze, { id: 'bell', hatch: H(82, 5, C.bronzeDk, 0.6) }),
    E(0, 1.1, 0.28, 0.05, C.bronzeDk, { wt: 1 }), dot([0, 1.02], 0.045, C.teal),
    nod([-0.12, 1.2, 0.12, 1.95], 1, 2, '#2a1608', { clip: 'bell', wt: 0.6 }),
    ring([0, 1.55], 0.42, C.teal, { wt: 0.8 }),
  ];
}

/** DRONE-GILL (GLASS-BELL): a translucent bell mantle on a tine fringe with a note-bubble spore sac; it hovers 1.2 m, so the drawn body spans y 1.2..2.35. */
export function gill() {
  const tx = [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45];
  return [
    ...[-0.34, -0.12, 0.12, 0.34].map((x, i) => P(limb(x, 1.5, x + (i % 2 ? 0.1 : -0.1), 1.2, 0.16, 0.14), C.violet, { it: 1, a: 200, wt: 1 })),
    ...tx.map((x, i) => B(x - 0.07, 1.28, x + 0.07, 1.62, i % 2 ? C.bone : '#d8cba0', { wt: 1.1 })),
    S([[0.0, 2.35], [0.3, 2.28], [0.52, 2.02], [0.62, 1.72], [0.64, 1.58], [0, 1.55]], C.glass, { id: 'mantle', a: 235, hatch: H(60, 7, '#a89c70', 0.5) }),
    P(sym([[0.0, 2.25], [0.07, 2.2], [0.1, 1.9], [0.14, 1.72], [0.1, 1.6], [0, 1.58]]), '#5a2a50', { a: 235, id: 'heart', it: 1 }),
    nod([-0.5, 1.62, 0.5, 2.3], 2, 3, '#7a6a48', { clip: 'mantle', wt: 0.6 }),
    ring([0, 1.64], 0.09, C.teal, { wt: 0.8 }), echo('mantle', 2, 0, -8),
    E(0, 1.38, 0.14, 0.16, C.sulphur, { wt: 1.2 }), ring([0, 1.38], 0.08, '#8a6d18', { wt: 0.6 }),
  ];
}

/** CRADLE SAC (feeder): a membrane sac with a person inside, hung from pipes over an iron rack. 2.1 m. */
export function feeder() {
  return [
    B(-0.85, 0, 0.85, 0.2, C.iron), B(-0.82, 0.2, -0.64, 1.3, C.iron), B(0.64, 0.2, 0.82, 1.3, C.iron), E(0, 1.28, 0.82, 0.07, C.iron, { wt: 1.2 }),
    ...[-0.2, 0, 0.2].map((x, i) => B(x - 0.075, 1.8, x + 0.075, 2.1, i % 2 ? C.bone : C.bronze, { hatch: H(90, 5, C.boneSh, 0.6) })),
    S([[0.0, 1.92], [0.22, 1.84], [0.46, 1.6], [0.62, 1.25], [0.62, 0.9], [0.46, 0.6], [0.22, 0.44], [0, 0.4]], C.amber, { id: 'sac', a: 230, hatch: H(70, 7, '#9a8658', 0.5) }),
    E(0, 1.58, 0.1, 0.12, '#3a2e3e', { a: 225 }), S([[0.11, 1.46], [0.17, 1.3], [0.14, 0.95], [0.09, 0.62], [0, 0.58]], '#3a2e3e', { a: 225, it: 1 }),
    ln([-0.13, 1.28], [0.12, 1.08], '#3a2e3e', { k: '2B', wt: 3 }),
    nod([-0.5, 0.5, 0.5, 1.82], 2, 3, '#7a6a48', { clip: 'sac', wt: 0.6 }),
    dot([0, 1.55], 0.02, C.teal),
  ];
}

/** GRAFT-MOTHER (PIPE-ORGAN BODY): ranks of pipes round a central throat, cradle racks as ribs. 4.2 m, a wide fan. */
export function graftmother() {
  const xs = Array.from({ length: 9 }, (_, i) => (i - 4) * 0.3), tops = [2.9, 3.3, 3.7, 4.0, 4.2, 4.0, 3.7, 3.3, 2.9];
  return [
    ...[-1, 1].flatMap((s) => [L(s * 0.55, 1.0, s * 0.95, 0.0, 0.34, 0.4, C.iron), L(s * 1.0, 1.4, s * 1.25, 0.0, 0.3, 0.38, C.iron)]),
    S([[0.0, 3.1], [0.7, 3.0], [1.1, 2.5], [1.25, 1.8], [1.15, 1.1], [0.8, 0.8], [0, 0.8]], '#cbbf9d', { id: 'case', hatch: H(75, 7, '#8a7e60', 0.5) }),
    ...xs.map((x, i) => B(x - 0.13, 2.2, x + 0.13, tops[i], i % 2 ? C.bone : C.bronze, { hatch: H(90, 6, i % 2 ? C.boneSh : C.bronzeDk, 0.6) })),
    ...xs.map((x, i) => B(x - 0.085, 2.45, x + 0.085, 2.6, '#120d08', { ink: false })),
    E(0, 1.9, 0.52, 0.62, C.oxb, { n: 28, wt: 1.5 }), E(0, 1.9, 0.4, 0.5, '#14090b', { n: 28, ink: false }),
    ring([0, 1.9], 0.3, C.oxb, { wt: 1 }),
    ...[-1, 1].flatMap((s) => [0, 1, 2].flatMap((i) => [E(s * 1.02, 1.1 + i * 0.58, 0.19, 0.25, C.amber, { a: 230, wt: 1.1 }), E(s * 1.02, 1.1 + i * 0.58, 0.06, 0.12, '#3a2e3e', { a: 220, ink: false })])),
    nod([-0.5, 0.9, 0.5, 1.4], 3, 4, '#7a6a48', { clip: 'case', wt: 0.6 }),
    dot([0, 1.9], 0.03, C.teal),
  ];
}

// ---- Episode 3 family sketches (silhouette-level only; NOT built, NOT in the game) ------------------------------------------------
export function chorister() {          // a tuning-fork tripod under a bell dome: suppression and flanking
  return [
    ...[-1, 0, 1].map((s) => L(s * 0.12, 1.3, s * 0.78, 0, 0.2, 0.18, C.bone, { hatch: H(80, 5, C.boneSh, 0.5) })),
    ...[-1, 0, 1].map((s) => B(s * 0.78 - 0.1, 0, s * 0.78 + 0.1, 0.18, C.bronze)),
    E(0, 1.85, 0.42, 0.55, C.glass, { a: 235, hatch: H(60, 6, '#a89c70', 0.5) }),
    B(-0.2, 2.25, -0.08, 2.9, C.bone), B(0.08, 2.25, 0.2, 2.9, C.bone), B(-0.2, 2.2, 0.2, 2.34, C.bone),
    dot([0, 1.85], 0.05, C.teal),
  ];
}
export function bulwark() {            // a conch carapace on short legs: the shield-bearer
  return [
    ...[-1, 1].map((s) => L(s * 0.4, 0.5, s * 0.5, 0.0, 0.26, 0.22, C.boneSh)),
    E(0, 0.95, 0.8, 0.5, '#d6cdb0', { n: 28, hatch: H(60, 6, '#8a7e60', 0.5) }), E(0.1, 1.45, 0.52, 0.42, '#cdc3a4', { n: 24, hatch: H(60, 6, '#8a7e60', 0.5) }), E(0.18, 1.85, 0.3, 0.26, '#d6cdb0', { n: 20 }),
    E(-0.55, 0.85, 0.2, 0.2, C.skin, { n: 14 }), dot([-0.58, 0.9], 0.03, C.teal),
  ];
}
export function weeping() {            // an organ throne hung with cradle sacs: the elite mother
  return [
    ...[-1, 1].map((s) => L(s * 0.6, 0.9, s * 0.85, 0.0, 0.36, 0.34, C.iron)),
    S([[0.0, 3.2], [0.5, 3.0], [0.9, 2.2], [1.0, 1.2], [0.8, 0.5], [0, 0.5]], '#cbbf9d', { hatch: H(75, 7, '#8a7e60', 0.5) }),
    ...[-0.3, -0.1, 0.1, 0.3].map((x, i) => B(x - 0.085, 2.5, x + 0.085, 3.2 + (i % 3 === 1 ? 0.0 : 0.0), i % 2 ? C.bone : C.bronze)),
    ...[-1, 1].flatMap((s) => [0, 1].map((i) => E(s * 0.82, 0.9 + i * 0.7, 0.2, 0.3, C.amber, { a: 230 }))),
    E(0, 1.9, 0.3, 0.38, '#14090b', { ink: false }), dot([0, 1.9], 0.025, C.teal),
  ];
}

// ---- the alien room KIT (scenery that dresses the rectangular rooms; design studies, front view, metres) ---------------------------------------------------------------------
const arc = (cx, cy, r, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
/** a pipe-rib arch: two fluted legs joined by a semicircular rib, the instrument "organ case" turned into a vault */
export function ribArch() {
  const ring = [...arc(0, 2.3, 1.15, Math.PI, 0), ...arc(0, 2.3, 0.8, 0, Math.PI)];
  return [P([[-1.15, 0], [-0.8, 0], [-0.8, 2.3], [-1.15, 2.3]], C.bone, { id: 'legL', hatch: H(90, 5, C.boneSh, 0.6) }), P([[0.8, 0], [1.15, 0], [1.15, 2.3], [0.8, 2.3]], C.bone, { id: 'legR', hatch: H(90, 5, C.boneSh, 0.6) }),
    P(ring, C.bronze, { id: 'rib', it: 0, hatch: H(80, 5, C.bronzeDk, 0.6) }), ...[-0.975, 0.975].flatMap((x) => [0.4, 0.9, 1.4, 1.9].map((y) => B(x - 0.07, y, x + 0.07, y + 0.18, '#120d08', { ink: false }))), ring_dot(0, 3.5)];
}
const ring_dot = (x, y) => dot([x, y], 0.04, C.teal);
/** a membrane wall panel: a bulging amber skin with a nodal figure and a dark vein */
export function membranePanel() {
  return [B(-0.95, 0, 0.95, 0.12, C.iron), S([[0.0, 3.0], [0.55, 2.9], [0.88, 2.2], [0.95, 1.4], [0.85, 0.6], [0.7, 0.14], [0, 0.12]], C.amber, { id: 'skin', a: 235, hatch: H(70, 7, '#9a8658', 0.5) }),
    nod([-0.85, 0.3, 0.85, 2.8], 3, 5, '#7a6a48', { clip: 'skin', wt: 0.7 }), S([[0.04, 2.7], [0.1, 1.9], [0.05, 0.9], [0, 0.4]], '#3a2e3e', { a: 200, it: 1, ink: false })];
}
/** three cradle sacs on a pipe: the horror of the premise as set dressing, each with a person inside */
export function cradleChain() {
  return [B(-1.3, 3.0, 1.3, 3.2, C.bronze, { hatch: H(0, 5, C.bronzeDk, 0.6) }),
    ...[-0.85, 0, 0.85].flatMap((x, i) => [ln([x, 3.0], [x, 2.6 - i * 0.05], C.iron, { k: '2B', wt: 2.5 }), E(x, 1.85 - i * 0.05, 0.36, 0.7, C.amber, { n: 22, a: 235, id: 'sac' + i, hatch: H(70, 7, '#9a8658', 0.5) }), E(x, 1.95 - i * 0.05, 0.1, 0.4, '#3a2e3e', { a: 215, it: 1, ink: false }), E(x, 2.35 - i * 0.05, 0.09, 0.1, '#3a2e3e', { a: 215, it: 1, ink: false })])];
}
/** a ceiling cluster of resonator bells, three sizes */
export function bellCluster() {
  return [B(-1.1, 3.0, 1.1, 3.15, C.iron), ...[[-0.7, 0.4], [0, 0.62], [0.7, 0.34]].flatMap(([x, r], i) => [ln([x, 3.0], [x, 2.6], C.iron, { k: '2B', wt: 2 }), P(sym([[0, 2.6], [r * 0.4, 2.55], [r * 0.7, 2.0], [r, 1.6]].map(([a, b]) => [a, b - i * 0.15])).map(([a, b]) => [a + x, b]), i === 1 ? C.bronze : C.verd, { id: 'b' + i, hatch: H(82, 5, i === 1 ? C.bronzeDk : '#1f3a30', 0.6) }), E(x, 1.6 - i * 0.15, r, 0.05, C.bronzeDk, { wt: 1 }), dot([x, 1.5 - i * 0.15], 0.04, C.teal)])];
}
/** a column of pipes of unequal length under a bronze capital: the load-bearing organ */
export function pipeColumn() {
  const hs = [3.4, 3.0, 3.6, 3.0, 3.4];
  return [...hs.map((h, i) => B(-0.55 + i * 0.22 - 0.1, 0.3, -0.55 + i * 0.22 + 0.1, h, i % 2 ? C.bone : C.bronze, { hatch: H(90, 5, i % 2 ? C.boneSh : C.bronzeDk, 0.6) })), B(-0.75, 0, 0.75, 0.32, C.iron), B(-0.7, 1.6, 0.7, 1.78, C.bronzeDk)];
}
/** the lantern: warm yellow means a survivor or a lamp, never an enemy */
export function lantern() {
  return [ln([0, 3.0], [0, 2.4], C.iron, { k: '2B', wt: 2.5 }), B(-0.2, 2.34, 0.2, 2.42, C.iron), E(0, 2.0, 0.22, 0.34, '#f0c040', { n: 18, a: 245, id: 'glass' }), E(0, 2.0, 0.09, 0.16, '#fff2b0', { a: 255, ink: false }), B(-0.22, 1.6, 0.22, 1.68, C.iron),
    ring([0, 2.0], 0.9, '#f0c040', { wt: 0.7 })];
}
export const KIT = { ribArch, membranePanel, cradleChain, bellCluster, pipeColumn, lantern };

/** every kind the game has, keyed by defs.js ENEMIES kind (tollbearer is drawn at the stage the episode shows) */
export const FIGURES = { tollbearer, gaunt, bellhand, sexton, wardengraft, cantor, bellnode, gill, feeder, graftmother };
export const FUTURE = { chorister, bulwark, weeping };

/** bounding box in metres of a figure's outline parts (the smoothed shapes, as drawn) */
export function figureBox(items) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of items) if (it.t === 'part') for (const [x, y] of chaikin(it.sym ? sym(it.pts) : it.pts, it.it ?? 2)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}
