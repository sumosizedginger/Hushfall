// LOOK POLISH (2026-10-26; the owner: "show me your style and your art and your taste"): recipes that supersede earlier ones of the same id (all.js merges this last). The style is CHUNKY PAINTED: few, bold,
// high-contrast marks that survive the game's low resolution, every surface lit from above (a lighter top, a darker foot) so it reads as a solid thing, colour that has a temperature (warm lights, cool shadows),
// and no fine noise that blurs to grey. Painted with the Canvas 2D kit (paint2d.js): gradients, round brush strokes with alpha, multiply for grime and screen for light.
import { R } from './recipes.js';
import { paint2d } from './paint2d.js';

// ---- the guns' materials (look polish 1), at twice the old resolution: a 4 x 4 atlas of 128 px cells, the SAME layout as before (models_guns.js etc. name cells by index), so the guns now drawn crisp at the
// screen's resolution show paint, not big texels. Each cell is a material seen on a curved part: a lit band along the top, a body, a dark underside, wear on the edges.
//  0 walnut   1 blued steel   2 brass   3 hammered copper   4 yellow enamel   5 stamped steel (perforated)   6 black rubber (checkered)   7 bleached oak with bone inlay
//  8 pitted black iron   9 rope   10 polished lantern brass (ribbed)   11 teal glass   12 copper coil   13 crazed porcelain   14 stitched leather   15 dark gunmetal
const CELL = 128;
export const recipesPolish = {
  guns_atlas: {
    seed: 9811, width: 512, height: 512,
    draw: R((g, w, h) => paint2d(g, w, h, (ctx, K) => {
      const at = (i, fn) => K.cell((i % 4) * CELL, Math.floor(i / 4) * CELL, CELL, CELL, fn);
      const body = (stops) => K.grad(0, 0, CELL, CELL, stops);                                       // lit from above: the stops run top to bottom
      const rim = (light, dark) => { K.stroke(2, 3, CELL - 2, 3, light, 4, 0.75); K.stroke(2, CELL - 3, CELL - 2, CELL - 3, dark, 6, 0.6); };
      const wear = (n, c) => { for (let k = 0; k < n; k++) { const y = K.pick([K.R(1, 10), K.R(CELL - 10, CELL - 1)]), x = K.R(0, CELL); K.stroke(x, y, x + K.R(3, 12), y + K.R(-2, 2), c, K.R(1.5, 3.5), K.R(0.5, 0.9)); } };
      // 0 walnut: a warm red-brown, long flowing grain in a few bold dark streaks, a figured swirl, a lit top
      at(0, () => { body([[0, '#9a5c30'], [0.35, '#7a4424'], [1, '#3e2010']]); K.strokes(0, 0, CELL, CELL, 26, { pal: ['#4a2612', '#5a3018', '#2e170a'], len: [50, 120], wt: [2, 5], ang: 0, jit: 0.06, a: [0.4, 0.75], bend: 0.05 });
        K.strokes(0, 0, CELL, CELL, 12, { pal: ['#c08048', '#b07040'], len: [30, 80], wt: [1.5, 3], ang: 0, jit: 0.05, a: [0.35, 0.6] }); K.radial(80, 70, 22, '#5a2c12', 'rgba(90,44,18,0)', 0.7); rim('#e0a066', '#1a0c04'); });
      // 1 blued steel: deep blue-black with a broad soft highlight band and a crisp specular line, silver wear on the edges
      at(1, () => { body([[0, '#5a7896'], [0.12, '#8eb0c8'], [0.2, '#3a5068'], [0.6, '#1c2834'], [1, '#0a1016']]); K.strokes(0, 30, CELL, 60, 10, { pal: ['#26384a', '#304558'], len: [40, 110], wt: [3, 6], ang: 0, jit: 0.03, a: [0.3, 0.5] });
        K.stroke(4, 16, CELL - 4, 16, '#e0eef8', 2, 0.85); wear(10, '#c0ccd4'); rim('#cfe0ec', '#05080b'); });
      // 2 brass: warm gold, a bright band, engraved lines picked out dark, green verdigris pooled in the low parts
      at(2, () => { body([[0, '#f6d27a'], [0.15, '#ffe9a8'], [0.3, '#cfa23e'], [0.75, '#8a6420'], [1, '#4a3410']]); for (const y of [34, 66, 98]) K.stroke(6, y, CELL - 6, y, '#5a400e', 2.2, 0.8);
        for (let k = 0; k < 7; k++) K.dot(12 + k * 17, 66, 3.4, '#5a400e', 0.85); K.strokes(0, 84, CELL, 44, 14, { pal: ['#4f9a7a', '#6ab894'], len: [6, 18], wt: [3, 6], a: [0.35, 0.7], jit: 1.5 }); wear(8, '#fff4cc'); rim('#fff8dc', '#2a1c06'); });
      // 3 hammered copper: red-brown skin dimpled all over (a lit lip and a dark lip to each dimple)
      at(3, () => { body([[0, '#d8844a'], [0.5, '#a85a2c'], [1, '#5a2a10']]); for (let k = 0; k < 46; k++) { const x = K.R(8, CELL - 8), y = K.R(8, CELL - 8), r = K.R(6, 11); K.dot(x + 1.5, y + 2, r, '#5a2810', 0.5); K.dot(x - 1, y - 1, r * 0.8, '#f0a060', 0.55); } rim('#ffc08a', '#2a1006'); });
      // 4 yellow enamel: a safety yellow, glossy on top, chipped to dark steel at the edges, grease run down from the top
      at(4, () => { body([[0, '#ffe066'], [0.18, '#fff2a6'], [0.32, '#f0c02c'], [0.8, '#b88a10'], [1, '#6a4c08']]); for (let k = 0; k < 16; k++) { const x = K.R(0, CELL), y = K.pick([K.R(2, 14), K.R(CELL - 14, CELL - 2)]); K.poly([[x, y], [x + K.R(4, 12), y + K.R(-3, 3)], [x + K.R(2, 8), y + K.R(3, 7)]], '#2a2c2e', 0.95); }
        for (let k = 0; k < 6; k++) { const x = K.R(10, CELL - 10); K.stroke(x, 0, x + K.R(-3, 3), K.R(30, 80), '#5a4410', K.R(2, 4), 0.3); } rim('#fffbe0', '#3a2a04'); });
      // 5 stamped steel: a dark grey sheet pressed into rows of cooling louvres (a dark slot with a lit lower lip), a pressed seam, oil dulling the lower half. (The first polish bake had round
      //   perforations on a pale sheet: stretched over a box they read as leopard spots, and the pale sheet was the brightest thing in the picture.)
      at(5, () => { body([[0, '#8e989e'], [0.18, '#6c767c'], [0.6, '#40484e'], [1, '#1e2428']]); for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) { const x = 14 + c * 38, y = 16 + r * 24; K.stroke(x, y, x + 24, y, '#0c1012', 6.5, 1); K.stroke(x + 1, y + 4, x + 23, y + 4, '#b4c0c6', 1.8, 0.7); }
        K.stroke(0, 64, CELL, 64, '#1a2024', 3, 0.7); K.stroke(0, 67, CELL, 67, '#8a969c', 1.5, 0.5); wear(8, '#b8c4ca'); rim('#c8d4da', '#0e1214'); });
      // 6 black rubber: matt black, a diamond checkering, a dull sheen across the top third
      at(6, () => { body([[0, '#4a3e36'], [0.25, '#2c241e'], [1, '#100c0a']]); for (let k = -8; k <= 16; k++) { K.stroke(k * 12, 0, k * 12 + CELL, CELL, '#0a0706', 2, 0.9); K.stroke(k * 12 + CELL, 0, k * 12, CELL, '#0a0706', 2, 0.9); } K.grad(0, 0, CELL, 40, [[0, 'rgba(160,140,120,0.35)'], [1, 'rgba(160,140,120,0)']]); });
      // 7 bleached oak with bone inlay: pale salt-silvered wood, long grain, a knot, two scrimshaw plates
      at(7, () => { body([[0, '#e2d0a8'], [0.4, '#bca47a'], [1, '#6e5a38']]); K.strokes(0, 0, CELL, CELL, 22, { pal: ['#7a6440', '#8c7448', '#5e4a2a'], len: [60, 120], wt: [1.5, 3.5], ang: 0, jit: 0.04, a: [0.35, 0.6] });
        K.radial(30, 82, 12, '#4a3618', 'rgba(74,54,24,0)', 0.9); for (const [x, y] of [[74, 30], [96, 90]]) { K.poly([[x - 16, y - 9], [x + 16, y - 9], [x + 16, y + 9], [x - 16, y + 9]], '#f4ecd8', 0.95); K.stroke(x - 10, y - 2, x + 10, y + 3, '#3a3226', 1.2, 0.8); K.stroke(x - 6, y + 4, x + 8, y - 4, '#3a3226', 1, 0.6); } rim('#fffaea', '#3a2c14'); });
      // 8 pitted black iron: cast black, pitted, rust bleeding from the lower edge
      at(8, () => { body([[0, '#4a5258'], [0.2, '#2e3438'], [1, '#0c0e10']]); K.specks(0, 0, CELL, CELL, 120, ['#08090a', '#16191b'], [1, 3], [0.6, 0.95]); for (let k = 0; k < 10; k++) { const x = K.R(4, CELL - 4); K.stroke(x, CELL, x + K.R(-4, 4), CELL - K.R(10, 40), '#8a4a22', K.R(2, 5), 0.5); } rim('#7a868e', '#000000'); });
      // 9 rope: twisted hemp, bold diagonal strands, each lit on one side
      at(9, () => { body([[0, '#d0b878'], [1, '#6a5430']]); for (let k = -10; k <= 14; k++) { K.stroke(k * 11, 0, k * 11 + 46, CELL, '#4a3a1c', 6, 0.85); K.stroke(k * 11 + 3, 0, k * 11 + 49, CELL, '#f0dca0', 2.4, 0.7); } });
      // 10 polished lantern brass, ribbed: bright, a dark groove and a lit lip every 16 px, a hot highlight column
      at(10, () => { body([[0, '#ffe08a'], [0.5, '#d9a83a'], [1, '#7a5418']]); for (let k = 0; k < 8; k++) { K.stroke(0, 8 + k * 16, CELL, 8 + k * 16, '#5a3c0e', 3.5, 0.85); K.stroke(0, 11 + k * 16, CELL, 11 + k * 16, '#fff6c8', 2, 0.75); } K.grad(24, 0, 18, CELL, [[0, 'rgba(255,255,230,0)'], [0.5, 'rgba(255,255,230,0.7)'], [1, 'rgba(255,255,230,0)']], false); });
      // 11 teal glass: deep teal that lightens to a glowing heart, a bright streak, a dark rim
      at(11, () => { K.fill('#0c5a52', 0, 0, CELL, CELL); K.radial(64, 64, 70, '#9affee', 'rgba(20,140,124,0)', 0.95); K.stroke(28, 18, 28, 108, '#f0fffc', 6, 0.85); K.stroke(42, 22, 42, 60, '#f0fffc', 2.5, 0.6); rim('#c0fff4', '#03201c'); });
      // 12 copper coil: wire in tight turns, a lit crown and a dark gap to each
      at(12, () => { K.fill('#4a2410', 0, 0, CELL, CELL); for (let k = 0; k < 14; k++) { const y = 4 + k * 9; K.grad(0, y, CELL, 7, [[0, '#f4a868'], [0.5, '#c06a2c'], [1, '#5a2a0e']]); } });
      // 13 crazed porcelain: off-white glaze, a web of fine dark hairlines, one tea-brown stain
      at(13, () => { body([[0, '#fbf8ee'], [0.6, '#e2ddcc'], [1, '#a8a290']]); for (let k = 0; k < 12; k++) { let x = K.R(0, CELL), y = K.R(0, CELL); for (let s = 0; s < 4; s++) { const nx = x + K.R(-24, 24), ny = y + K.R(-24, 24); K.stroke(x, y, nx, ny, '#6a665a', 1, 0.55); x = nx; y = ny; } } K.radial(90, 96, 22, '#a07040', 'rgba(160,112,64,0)', 0.45); });
      // 14 stitched leather: tan hide, two rows of pale stitching, creases, lighter worn edges
      at(14, () => { body([[0, '#a87848'], [0.4, '#7e5430'], [1, '#3a2410']]); for (const y of [16, 112]) for (let x = 6; x < CELL; x += 12) K.stroke(x, y, x + 6, y, '#f0dcb0', 2.4, 0.9); K.strokes(0, 26, CELL, 76, 9, { pal: ['#4a2e14', '#5a3a1c'], len: [30, 90], wt: [2, 4], ang: 0, jit: 0.2, a: [0.35, 0.6], bend: 0.12 }); rim('#d8b080', '#1e1006'); });
      // 15 dark gunmetal: near black with a cold sheen and fine wear
      at(15, () => { body([[0, '#4c5a62'], [0.15, '#6c7c86'], [0.3, '#26303a'], [1, '#0a0e12']]); wear(8, '#9aa8b0'); rim('#a8b8c0', '#000000'); });
    })),
  },
};
