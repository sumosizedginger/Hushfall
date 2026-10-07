// L0 look bible: concept recipes. Same conventions as tools/baker/recipes.js (R/wrap: top-left px coordinates, p5.brush ink + washes), different purpose: DESIGN STUDIES for design/LOOK_BIBLE.md.
// Each concept is one PNG in review/look-bible/ (written by tools/look/bake-concepts.mjs; never assets/baked). The figures live in figures.js as metre-space data and feed both the
// flat silhouettes (sil_*: the overlap test, tools/look/sil-matrix.mjs) and the painted studies (paint_*). The surface studies each use a DIFFERENT generator on purpose: that is the point of them.
import { R } from '../baker/recipes.js';
import { COL, FIGURES, FUTURE, KIT, figureBox, chaikin, sym, ell, limb } from './figures.js';

const PAPER = '#d9cfb6';
const SIL_S = 100, SIL_W = 360, SIL_H = 560;            // the silhouette canvas: 100 px per metre, feet on one row, centred: pixel overlap IS true-scale overlap

// ------------------------------------------------------------------------------------------------------------------ drawing
import { pip, hex, toHex, mix, lum, lineOn, hatch, nodal } from '../baker/paint_util.js';
export { hex, mix, hatch, nodal };

/** a native opaque polygon (p5, not brush: brush fills are translucent washes and a dark coat would come out pale) */
function poly(g, ctx, pts, col, a = 255, ink = 0) {
  const { p } = g; p.push();
  if (ink) { p.stroke(13, 15, 20); p.strokeWeight(ink); p.strokeJoin(p.ROUND); } else p.noStroke();
  const [r, gg, b] = hex(col); p.fill(r, gg, b, a);
  p.beginShape(); for (const [x, y] of pts) p.vertex(x - ctx.W / 2, y - ctx.H / 2); p.endShape(p.CLOSE); p.pop();
}

/** an outline-only native polygon */
function outline(g, ctx, pts, col, wt = 1) { const { p } = g, [r, gg, b] = hex(col); p.push(); p.noFill(); p.stroke(r, gg, b); p.strokeWeight(wt); p.strokeJoin(p.ROUND); p.beginShape(); for (const [x, y] of pts) p.vertex(x - ctx.W / 2, y - ctx.H / 2); p.endShape(p.CLOSE); p.pop(); }

/** draw a figure (the item list of figures.js) at a transform. mode 'sil' = flat black. mode 'paint' = ONE unified ink silhouette (every part grown by a few px, drawn first, so only the OUTER edge is inked and no limb has
 *  its own outline: the mannequin look), then opaque colour per part with a lighter wash on top, engraving hatch only on the shadow side (light from the upper left), then the marks. */
function drawFigure(g, ctx, items, mode) {
  const polys = {}, shape = (it) => chaikin(it.sym ? sym(it.pts) : it.pts, it.it ?? 2).map(ctx.T);
  const parts = items.filter((it) => it.t === 'part');
  if (mode === 'sil') { for (const it of parts) poly(g, ctx, shape(it), '#000000'); return; }
  for (const it of parts) poly(g, ctx, shape(it), '#0d0f14', 255, 6);                    // the ink underlay
  for (const it of items) {
    if (it.t === 'part') {
      const pts = shape(it); if (it.id) polys[it.id] = pts;
      poly(g, ctx, pts, it.col, it.a ?? 255);
      g.blob(pts, mix(it.col, '#fff6dc', 0.22), { a: 90, curv: 0, ink: false });         // a lighter wash: the painted surface, not a flat fill
      if (it.hatch) { const xs = pts.map((q) => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs); hatch(g, pts, { ...it.hatch, col: lineOn(it.col) }, x0 + (x1 - x0) * 0.46); }
      if (it.id && it.ink !== false) outline(g, ctx, pts, mix(it.col, '#0d0f14', 0.7), 1);
    } else {
      if (it.t === 'echo') { const base = polys[it.of]; if (base) for (let i = 1; i <= it.k; i++) outline(g, ctx, base.map(([x, y]) => [x + it.dx * i, y + it.dy * i]), it.col, 1.6); }
      else if (it.t === 'line') { g.stroke(it.k ?? 'cpencil', it.col, it.wt ?? 0.8); const [ax, ay] = ctx.T(it.a), [bx, by] = ctx.T(it.b); g.line(ax, ay, bx, by); }
      else if (it.t === 'dot') { const [x, y] = ctx.T(it.at); g.noStroke(); g.fill(it.col, 255); g.circle(x, y, it.r * ctx.s); if (it.col === COL.teal) { g.fill('#f0fffb', 255); g.circle(x, y, it.r * ctx.s * 0.4); } }
      else if (it.t === 'ring') { const [x, y] = ctx.T(it.at); g.noFill(); g.stroke(it.k ?? 'HB', it.col, it.wt ?? 0.8); g.circle(x, y, it.r * ctx.s); }
      else if (it.t === 'nodal') { const [bx0, by1] = ctx.T([it.box[0], it.box[1]]), [bx1, by0] = ctx.T([it.box[2], it.box[3]]); nodal(g, [bx0, by0, bx1, by1], it.n, it.m, it.col, it.wt ?? 0.7, it.clip ? polys[it.clip] : null); }
    }
  }
}

const silCtx = (ox) => ({ W: SIL_W, H: SIL_H, s: SIL_S, T: ([x, y]) => [ox + x * SIL_S, SIL_H - 40 - y * SIL_S] });
const sil = (items) => ({ seed: 1, width: SIL_W, height: SIL_H, draw: R((g) => { g.bg('#ffffff'); drawFigure(g, silCtx(SIL_W / 2), items, 'sil'); }) });

function fitCtx(W, H, items) {
  const b = figureBox(items), s = Math.min((H - 90) / (b.y1 - b.y0), (W - 70) / (b.x1 - b.x0));
  return { W, H, s, b, T: ([x, y]) => [W / 2 + (x - (b.x0 + b.x1) / 2) * s, H - 45 - (y - b.y0) * s] };
}
const paint = (items, seed) => ({ seed, width: 560, height: 800, draw: R((g) => {
  g.bg(PAPER); const ctx = fitCtx(560, 800, items);
  if (ctx.b.y0 < 0.05) { const e = ell(0, 0, (ctx.b.x1 - ctx.b.x0) * 0.42, 0.07, 0, 24).map(ctx.T); g.blob(e, '#b3a88c', { a: 170, ink: false, curv: 0 }); }
  drawFigure(g, ctx, items, 'paint');
}) });

// ------------------------------------------------------------------------------------------------------------------ the lineup (to scale)
const REF_MAN = [
  { t: 'part', pts: ell(0, 1.66, 0.1, 0.12, 0, 16), col: '#8a8780', it: 1 },
  { t: 'part', sym: true, pts: [[0.06, 1.52], [0.2, 1.46], [0.18, 0.95], [0.12, 0.9], [0, 0.9]], col: '#8a8780' },
  { t: 'part', pts: limb(-0.07, 0.95, -0.08, 0.02, 0.13, 0.1), col: '#8a8780', it: 1 }, { t: 'part', pts: limb(0.07, 0.95, 0.08, 0.02, 0.13, 0.1), col: '#8a8780', it: 1 },
  { t: 'part', pts: limb(-0.22, 1.46, -0.27, 0.8, 0.1, 0.08), col: '#8a8780', it: 1 }, { t: 'part', pts: limb(0.22, 1.46, 0.27, 0.8, 0.1, 0.08), col: '#8a8780', it: 1 },
];
const ORDER = ['gaunt', 'tollbearer', 'bellhand', 'sexton', 'bellnode', 'wardengraft', 'gill', 'feeder', 'cantor', 'graftmother'];
const WIDTH = { ref: 0.7, gaunt: 1.0, tollbearer: 1.05, bellhand: 1.15, sexton: 1.0, bellnode: 1.15, wardengraft: 1.75, gill: 1.35, feeder: 1.3, cantor: 1.95, graftmother: 2.85 };
const lineupLayout = () => { let x = 0.35; const pos = {}; for (const k of ['ref', ...ORDER]) { pos[k] = x + WIDTH[k] / 2; x += WIDTH[k] + 0.3; } return { pos, total: x + 0.1 }; };
const lineup = (mode) => { const { pos, total } = lineupLayout(), W = Math.ceil(total * 100), H = 580;
  return { seed: 4, width: W, height: H, draw: R((g) => {
    g.bg(mode === 'sil' ? '#ffffff' : PAPER);
    const at = (k) => ({ W, H, s: 100, T: ([x, y]) => [pos[k] * 100 + x * 100, H - 40 - y * 100] });
    drawFigure(g, at('ref'), REF_MAN, mode);
    for (const k of ORDER) drawFigure(g, at(k), k === 'tollbearer' ? FIGURES.tollbearer(2) : FIGURES[k](), mode);
  }) }; };

// ------------------------------------------------------------------------------------------------------------------ surface studies: six materials, six different generators
const surfaces = { seed: 7, width: 768, height: 512, draw: R((g) => {
  g.bg('#1a1814');
  const cell = (c, r) => [c * 256, r * 256], solid = (c, r, col) => { const [x, y] = cell(c, r); g.solid(x + 4, y + 4, 248, 248, col); return [x + 4, y + 4, x + 252, y + 252]; };
  // 1. NODAL: ivory plate, two Chladni figures (computed contours)
  { const [x0, y0, x1, y1] = solid(0, 0, '#e2d8bd'); nodal(g, [x0 + 10, y0 + 10, x1 - 10, y1 - 10], 2, 5, '#1a1208', 0.9, null, 40, '2B'); nodal(g, [x0 + 10, y0 + 10, x1 - 10, y1 - 10], 3, 7, '#4f8a74', 0.6, null, 40, 'cpencil'); }
  // 2. ENGRAVED BONE: a lit boss; line density follows the light (more passes in the shade), the line-work IS the shading
  { const [x0, y0, x1, y1] = solid(1, 0, '#d9cdb0'), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rr = 100, lum = (x, y) => { const dx = (x - cx) / rr, dy = (y - cy) / rr, d = dx * dx + dy * dy; if (d > 1) return 0.9; const nz = Math.sqrt(1 - d); return Math.max(0, Math.min(1, (-dx * 0.5 - dy * 0.6 + nz * 0.62))); };
    g.stroke('2B', '#1a1208', 1.1); for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; g.line(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(a + 0.16) * rr, cy + Math.sin(a + 0.16) * rr); }
    [[0.62, 35, 7], [0.42, 80, 6], [0.26, 125, 5], [0.14, 10, 4]].forEach(([th, ang, gap]) => { const a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a); g.stroke('cpencil', '#1a1208', 0.7);
      for (let v = -rr; v <= rr; v += gap) { let run = null; for (let u = -rr; u <= rr + 1; u += 2) { const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca, on = u <= rr && lum(x, y) < th && (x - cx) ** 2 + (y - cy) ** 2 < rr * rr; if (on && !run) run = [x, y]; if ((!on || u > rr) && run) { g.line(run[0], run[1], x, y); run = null; } } } }); }
  // 3. VERDIGRIS BRONZE: bronze plate, irregular patina patches, engraved rings and rim ticks
  { const [x0, y0, x1, y1] = solid(2, 0, '#9b5a24'), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (let i = 0; i < 9; i++) { const px = g.rnd(x0 + 30, x1 - 30), py = g.rnd(y0 + 30, y1 - 30), r = g.rnd(14, 34), pts = Array.from({ length: 11 }, (_, k) => { const a = k / 11 * Math.PI * 2, rr2 = r * g.rnd(0.55, 1.15); return [px + Math.cos(a) * rr2, py + Math.sin(a) * rr2]; }); g.blob(pts, i % 2 ? '#4f8a74' : '#6fa890', { a: 230, curv: 0.5, ink: false }); }
    for (const r of [24, 44, 66, 90, 112]) { g.noFill(); g.stroke('2B', '#3a2008', 0.9); g.circle(cx, cy, r); }
    g.stroke('cpencil', '#3a2008', 0.8); for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; g.line(cx + Math.cos(a) * 112, cy + Math.sin(a) * 112, cx + Math.cos(a) * 120, cy + Math.sin(a) * 120); } }
  // 4. OILSKIN REMNANT: dark woven coat, torn edge with stitching, a yellow remnant
  { const [x0, y0, x1, y1] = solid(0, 1, '#2d2a1d'); g.stroke('cpencil', '#3d3925', 0.5);
    for (let x = x0 + 4; x < x1; x += 6) g.line(x, y0 + 2, x, y1 - 2); for (let y = y0 + 4; y < y1; y += 6) g.line(x0 + 2, y, x1 - 2, y);
    g.blob([[x0 + 20, y0 + 30], [x0 + 80, y0 + 52], [x0 + 70, y0 + 100], [x0 + 130, y0 + 120], [x0 + 110, y0 + 160], [x0 + 30, y0 + 140]], '#8a6d18', { a: 235, curv: 0.1, wt: 1.4 });
    g.blob([[x0 + 150, y0 + 40], [x0 + 220, y0 + 70], [x0 + 200, y0 + 130], [x0 + 170, y0 + 100]], '#0f0d0a', { a: 255, curv: 0, wt: 1.2 });
    g.stroke('2B', '#c9bd8a', 0.9); for (let k = 0; k < 9; k++) { const t = k / 8; g.line(x0 + 22 + t * 100, y0 + 190 + Math.sin(t * 9) * 6, x0 + 30 + t * 100, y0 + 202 + Math.sin(t * 9) * 6); } }
  // 5. MEMBRANE: amber skin of a cradle sac, a Voronoi vein network (cells found on a coarse grid), a curled person inside
  { const [x0, y0, x1, y1] = solid(1, 1, '#d8c08a'), sites = Array.from({ length: 16 }, () => [g.rnd(x0, x1), g.rnd(y0, y1)]), N = 32, cw = (x1 - x0) / N, ch = (y1 - y0) / N, id = (i, j) => { let b = 0, bd = 1e9; sites.forEach(([sx, sy], k) => { const d = (x0 + (i + 0.5) * cw - sx) ** 2 + (y0 + (j + 0.5) * ch - sy) ** 2; if (d < bd) { bd = d; b = k; } }); return b; };
    const grid = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => id(i, j)));
    g.blob(chaikin([[x0 + 100, y0 + 60], [x0 + 150, y0 + 70], [x0 + 160, y0 + 130], [x0 + 140, y0 + 200], [x0 + 100, y0 + 215], [x0 + 80, y0 + 160], [x0 + 85, y0 + 100]], 2), '#3a2e3e', { a: 150, curv: 0, ink: false });
    g.stroke('HB', '#7a5a30', 0.9); for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) { const px = x0 + (i + 1) * cw, py = y0 + (j + 1) * ch; if (grid[i][j] !== grid[i + 1][j]) g.line(px, py - ch, px, py); if (grid[i][j] !== grid[i][j + 1]) g.line(px - cw, py, px, py); } }
  // 6. DRUM-SKIN: pale tight skin, radial tension lines to the hoop, rim lugs, one thin teal ring (the Hush)
  { const [x0, y0, x1, y1] = solid(2, 1, '#d6cdb0'), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    g.noFill(); g.stroke('2B', '#4a3a20', 1.6); g.circle(cx, cy, 116); g.stroke('HB', '#8a7e60', 0.5); for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; g.line(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, cx + Math.cos(a) * 112, cy + Math.sin(a) * 112); }
    g.noStroke(); g.fill('#b8722e', 255); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.circle(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120, 5.5); } g.fill('#b8722e', 255); g.circle(cx, cy, 14); g.noFill(); g.stroke('HB', '#3fffe0', 0.9); g.circle(cx, cy, 24); }
}) };

// ------------------------------------------------------------------------------------------------------------------ the colour script (3 hues + 1 accent per episode; teal only as the Hush voice)
const SCRIPT = [
  ['#34474c', '#7a4a2b', '#c0587a', '#e0b040', '#b9b7a6', '#b8722e'],        // E1 Port Marrow: slate, brick, dusk-rose | lamp | pale skin, bell bronze
  ['#d9d6c8', '#a8582a', '#6aa090', '#e0602a', '#d9cdb0', '#4f8a74'],        // E2 The Salt Works: salt, rust, chemical green | ember | bone, verdigris
  ['#e6dcc0', '#5b3f7a', '#6a1f24', '#e8c25a', '#d8c08a', '#e9e2c6'],        // E3 The Choir Ships: ivory, violet, oxblood | sulphur | membrane, glass
  ['#0b0d14', '#3a4a66', '#e8e8ee', '#d8402a', '#c9ccd6', '#4a2a5a'],        // E4 The Hollow Sky: black, cold steel, bone-white | vermilion | pale, bruise
];
const palette = { seed: 9, width: 900, height: 500, draw: R((g) => {
  g.bg('#1a1814');
  SCRIPT.forEach((row, r) => { row.forEach((c, i) => { const w = i < 3 ? 150 : i === 3 ? 100 : 70, x = 20 + [0, 160, 320, 480, 590, 670][i]; g.solid(x, 20 + r * 118, w, 100, c); }); g.solid(756, 20 + r * 118, 24, 100, '#3fffe0'); });   // the narrow teal strip is the Hush voice
}) };

// ------------------------------------------------------------------------------------------------------------------ the room kit (to scale, one row)
const KIT_ORDER = ['ribArch', 'membranePanel', 'cradleChain', 'bellCluster', 'pipeColumn', 'lantern'], KIT_X = [1.4, 4.0, 6.7, 9.3, 11.5, 13.3];
const kitSheet = { seed: 11, width: 1480, height: 440, draw: R((g) => {
  g.bg(PAPER);
  KIT_ORDER.forEach((k, i) => drawFigure(g, { W: 1480, H: 440, s: 100, T: ([x, y]) => [KIT_X[i] * 100 + x * 100, 440 - 40 - y * 100] }, KIT[k](), 'paint'));
}) };

// ------------------------------------------------------------------------------------------------------------------ registry
export const recipes = {
  lineup_paint: lineup('paint'), lineup_sil: lineup('sil'), surfaces, palette, kit_paint: kitSheet,
  ...Object.fromEntries(['gaunt', 'bellhand', 'sexton', 'wardengraft', 'cantor', 'bellnode', 'gill', 'feeder', 'graftmother'].flatMap((k, n) => [[`sil_${k}`, sil(FIGURES[k]())], [`paint_${k}`, paint(FIGURES[k](), 100 + n)]])),
  sil_tollbearer: sil(FIGURES.tollbearer(2)), sil_tollbearer0: sil(FIGURES.tollbearer(0)),
  paint_tollbearer: paint(FIGURES.tollbearer(2), 90), paint_tollbearer0: paint(FIGURES.tollbearer(0), 91),
  ...Object.fromEntries(Object.entries(FUTURE).map(([k, fn]) => [`sil_${k}`, sil(fn())])),
};
