// Prototype atlas for the refined creature rigs (tools/look/rigs_v2.js). SAME shape as the game's atlases (src/render/models.js atlas(): a 256 px image, 4x4 cells of 64 px, cell 0 top-left,
// one Lambert material per creature, UV per primitive), so a rig built on it moves into src/render unchanged in L1; the recipe moves into tools/baker the same way. Until then it is written to
// review/look-bible/proto/choir_atlas.png (never assets/baked). Each cell is painted by a DIFFERENT method on purpose (the assessment's finding: one blotch-and-scratch recipe on every surface).
// LESSON (first renders through the real post pass, 480 px wide): a mark thinner than about 1.2 px or closer than about 6 px to the next is lost to nearest-neighbour sampling and the value banding,
// so the engraving here is BOLD (1.1-1.8 px strokes, 6-8 px spacing, high contrast): it is meant to survive at fighting distance, not to look fine in the atlas file.
import { R } from '../baker/recipes.js';
import { hatch, nodal, mix } from './recipes_look.js';

const sq = (X, Y, p = 2) => [[X + p, Y + p], [X + 64 - p, Y + p], [X + 64 - p, Y + 64 - p], [X + p, Y + 64 - p]];
const base = (g, X, Y, col) => g.solid(X, Y, 64, 64, col);
const weave = (g, X, Y, col, step = 6, wt = 0.9) => { g.stroke('cpencil', col, wt); for (let k = 3; k < 64; k += step) { g.line(X + k, Y + 2, X + k, Y + 62); g.line(X + 2, Y + k, X + 62, Y + k); } };
const rings = (g, cx, cy, rs, col, wt) => { g.noFill(); g.stroke('2B', col, wt); for (const r of rs) g.circle(cx, cy, r); };
/** veined cells found on a coarse grid (sites -> nearest-site boundaries), drawn as brush line-work */
function veins(g, X, Y, col, wt, n = 8) {
  const sites = Array.from({ length: n }, () => [g.rnd(X, X + 64), g.rnd(Y, Y + 64)]), N = 20, c = 60 / N, id = (i, j) => { let b = 0, bd = 1e9; sites.forEach(([sx, sy], k) => { const d = (X + 2 + (i + 0.5) * c - sx) ** 2 + (Y + 2 + (j + 0.5) * c - sy) ** 2; if (d < bd) { bd = d; b = k; } }); return b; };
  const grid = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => id(i, j)));
  g.stroke('HB', col, wt);
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) { const px = X + 2 + (i + 1) * c, py = Y + 2 + (j + 1) * c; if (grid[i][j] !== grid[i + 1][j]) g.line(px, py - c, px, py); if (grid[i][j] !== grid[i][j + 1]) g.line(px - c, py, px, py); }
}

// cell order is the contract with tools/look/rigkit.js (CELL)
const CELLS = [
  (g, X, Y) => { base(g, X, Y, '#cfc7ae'); hatch(g, sq(X, Y), { ang: 72, gap: 6, col: '#5f6456', wt: 1.1 }, X + 30); g.stroke('2B', '#6a5a82', 1.3); g.line(X + 8, Y + 14, X + 26, Y + 30); g.line(X + 26, Y + 30, X + 30, Y + 52); g.line(X + 26, Y + 30, X + 46, Y + 36); },     // 0 skin: pale, drum-tight, engraved shade, a violet vein
  (g, X, Y) => { base(g, X, Y, '#7f8c88'); g.blob([[X + 6, Y + 8], [X + 34, Y + 4], [X + 42, Y + 28], [X + 12, Y + 34]], '#5e4e78', { a: 200, curv: 0.4, ink: false }); g.blob([[X + 30, Y + 38], [X + 58, Y + 34], [X + 60, Y + 58], [X + 32, Y + 60]], '#4e3e68', { a: 190, curv: 0.4, ink: false }); hatch(g, sq(X, Y), { ang: 60, gap: 7, col: '#36423f', wt: 1.1 }, X + 24); },   // 1 bruise
  (g, X, Y) => { base(g, X, Y, '#4a4530'); weave(g, X, Y, '#665e3e'); g.stroke('2B', '#d8cc98', 1.5); for (let k = 0; k < 7; k++) { const t = k / 6; g.line(X + 8 + t * 46, Y + 20 + t * 22 + (k % 2) * 4, X + 14 + t * 46, Y + 25 + t * 22 + (k % 2) * 4); } },        // 2 oilskin: mid-dark (reads in a dark hall), woven, a stitched tear
  (g, X, Y) => { base(g, X, Y, '#8a6e1a'); weave(g, X, Y, '#aa8a22'); g.stroke('cpencil', '#4a3a0c', 1.4); for (let k = 0; k < 6; k++) { const x = X + 8 + k * 10; g.line(x, Y + 4, x + g.rnd(-1.5, 1.5), Y + g.rnd(30, 60)); } },                  // 3 oilskin yellow REMNANT: muted, streaked
  (g, X, Y) => { base(g, X, Y, '#dccfb0'); hatch(g, sq(X, Y), { ang: 90, gap: 6, col: '#7a6e50', wt: 1.2 }, X + 22); hatch(g, sq(X, Y), { ang: 72, gap: 6, col: '#7a6e50', wt: 1.2 }, X + 40); rings(g, X + 18, Y + 20, [4, 8], '#7a6e50', 1.1); },                          // 4 bone: engraved, denser in the shade
  (g, X, Y) => { base(g, X, Y, '#e2d8bd'); nodal(g, [X + 3, Y + 3, X + 61, Y + 61], 2, 5, '#2a1c0c', 1.6, null, 28, '2B'); nodal(g, [X + 3, Y + 3, X + 61, Y + 61], 3, 4, '#8a7e60', 1.0, null, 28, 'cpencil'); },                                                  // 5 bone with a Chladni figure
  (g, X, Y) => { base(g, X, Y, '#c0762e'); g.blob([[X + 6, Y + 40], [X + 24, Y + 34], [X + 30, Y + 54], [X + 10, Y + 58]], '#7a8a3a', { a: 235, curv: 0.5, ink: false }); g.blob([[X + 40, Y + 8], [X + 58, Y + 14], [X + 52, Y + 30], [X + 38, Y + 24]], '#7a8a3a', { a: 225, curv: 0.5, ink: false }); rings(g, X + 32, Y + 22, [8, 15, 22], '#3a2008', 1.3); },   // 6 bronze with patina
  (g, X, Y) => { base(g, X, Y, '#6b3a14'); rings(g, X + 32, Y + 32, [6, 12, 18, 24, 29], '#d89a50', 1.2); g.stroke('cpencil', '#2a1406', 1.2); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.line(X + 32 + Math.cos(a) * 29, Y + 32 + Math.sin(a) * 29, X + 32 + Math.cos(a) * 32, Y + 32 + Math.sin(a) * 32); } },   // 7 dark bronze, ring-engraved
  (g, X, Y) => { base(g, X, Y, '#7a8a3a'); g.blob([[X + 6, Y + 6], [X + 30, Y + 4], [X + 34, Y + 26], [X + 10, Y + 30]], '#a0ae56', { a: 225, curv: 0.5, ink: false }); g.blob([[X + 34, Y + 36], [X + 58, Y + 32], [X + 56, Y + 58], [X + 30, Y + 56]], '#a0ae56', { a: 215, curv: 0.5, ink: false }); g.stroke('2B', '#2c3a14', 1.3); g.line(X + 6, Y + 50, X + 22, Y + 40); g.line(X + 22, Y + 40, X + 28, Y + 52); },   // 8 verdigris: olive-yellow (a green-teal would read as the Hush under the game's cool light)
  (g, X, Y) => { base(g, X, Y, '#c49c58'); veins(g, X, Y, '#4e3010', 1.7, 9); },                                                                                                                                                                          // 9 membrane, amber, veined
  (g, X, Y) => { base(g, X, Y, '#4c2446'); veins(g, X, Y, '#b070a0', 1.6, 8); },                                                                                                                                                                          // 10 membrane, bruise-violet, veined
  (g, X, Y) => { base(g, X, Y, '#e9e2c6'); rings(g, X + 32, Y + 40, [6, 11, 16, 21, 25], '#9a8c60', 1.1); nodal(g, [X + 3, Y + 3, X + 61, Y + 61], 1, 3, '#b8ac7c', 0.9, null, 24, 'cpencil'); },                                                          // 11 glass: pale, arcs and one nodal line
  (g, X, Y) => { base(g, X, Y, '#5a1a1f'); g.stroke('cpencil', '#c05a5a', 1.6); for (let k = 0; k < 5; k++) { const x = X + g.rnd(6, 58), y = Y + g.rnd(6, 50); g.line(x, y, x + g.rnd(3, 8), y + g.rnd(5, 12)); } g.stroke('2B', '#2a0a0c', 1.4); g.line(X + 4, Y + 58, X + 60, Y + 50); },    // 12 oxblood, wet
  (g, X, Y) => { base(g, X, Y, '#3a3d42'); hatch(g, sq(X, Y), { ang: 0, gap: 7, col: '#1a1c20', wt: 1.2 }, X); g.noStroke(); g.fill('#80858c', 255); for (const [x, y] of [[7, 7], [57, 7], [7, 57], [57, 57]]) g.circle(X + x, Y + y, 3); },                          // 13 iron
  (g, X, Y) => { base(g, X, Y, '#d8cfb2'); g.stroke('HB', '#7a6e50', 1.0); for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; g.line(X + 32 + Math.cos(a) * 7, Y + 32 + Math.sin(a) * 7, X + 32 + Math.cos(a) * 29, Y + 32 + Math.sin(a) * 29); } rings(g, X + 32, Y + 32, [29], '#4a3a20', 1.6); },       // 14 drum-skin: radial tension to a hoop
  (g, X, Y) => { base(g, X, Y, '#c8982c'); g.blob([[X + 16, Y + 16], [X + 48, Y + 14], [X + 50, Y + 48], [X + 14, Y + 50]], mix('#c8982c', '#fff2b0', 0.55), { a: 220, curv: 0.6, ink: false }); },                                                       // 15 lamp / sulphur: the survivors' warm colour
];

export const recipesProto = {
  proto_choir_atlas: { seed: 21, width: 256, height: 256, draw: R((g) => { g.bg('#222222'); CELLS.forEach((paint, i) => paint(g, (i % 4) * 64, Math.floor(i / 4) * 64)); }) },
};
