// Recipes for the 3D look: tiling surface textures, UV atlases for code-authored models, sky, paper grain.
// Opaque outputs only (no matting). Atlases are 4x4 cells of 64px; models remap UVs into a cell (see src/look/models.js).
import { R } from './recipes.js';

// coordinate-shifting view of the wrapped drawing API, for painting inside one atlas cell
const sub = (g, ox, oy) => ({
  ...g,
  line: (a, b, c, d) => g.line(a + ox, b + oy, c + ox, d + oy),
  rect: (x, y, w, h) => g.rect(x + ox, y + oy, w, h),
  circle: (x, y, r) => g.circle(x + ox, y + oy, r),
  blob: (pts, col, o) => g.blob(pts.map(([x, y]) => [x + ox, y + oy]), col, o),
});

// paints one 64px cell: solid base, tonal mottling kept inside the cell, then details in cell-local coords
function cell(g, i, base, mottle, details) {
  const ox = (i % 4) * 64, oy = Math.floor(i / 4) * 64, c = sub(g, ox, oy);
  g.solid(ox, oy, 64, 64, base); g.noStroke(); g.bleed(0.03, 'out');
  for (let k = 0; k < 9; k++) {
    const r = g.rnd(8, 22), x = g.rnd(r / 2 + 3, 61 - r / 2), y = g.rnd(r / 2 + 3, 61 - r / 2);
    g.fill(mottle[k % mottle.length], g.rnd(50, 120)); c.circle(x, y, r);
  }
  if (details) details(c, g);
}
const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
// PT-020: a cell REPAINTED at the very end of its atlas. The first painting of the cell stays where it was, so the random sequence (and with it every other cell) is exactly what it was; this paints over it, opaque.
const repaint = (g, i, base, mottle, details) => { g.solid((i % 4) * 64, Math.floor(i / 4) * 64, 64, 64, base); cell(g, i, base, mottle, details); };

export const recipes3d = {
  // ---- Tollbearer UV atlas -------------------------------------------------
  tollbearer_atlas: {
    seed: 5101, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#333');
      cell(g, 0, '#c9a227', ['#b8951f', '#d8b840', '#8a6d18'], (c) => {          // oilskin coat
        g.stroke('cpencil', '#7a5f12', 0.8);
        for (let i = 0; i < 7; i++) { const x = 6 + i * 8 + g.rnd(-2, 2); c.line(x, 5, x + g.rnd(-3, 3), 58); }
        g.stroke('cpencil', '#f0dc88', 0.7);
        for (let i = 0; i < 5; i++) { const x = g.rnd(6, 56), y = g.rnd(6, 40); c.line(x, y, x + 1, y + g.rnd(6, 14)); }
        g.stroke('charcoal', '#241a10', 0.7);
        for (let i = 0; i < 3; i++) { const x = g.rnd(8, 54), y = g.rnd(24, 34); c.line(x, y, x + g.rnd(-1, 1), y + g.rnd(14, 24)); }
      });
      cell(g, 1, '#8a6d18', ['#5e4a10', '#a08320'], null);                        // coat lining
      cell(g, 2, '#93a196', ['#7d8c86', '#a9b5ab', '#6f7d78'], (c) => {          // grey skin + Hush veins
        g.stroke('HB', '#3fd6c0', 0.8);
        for (let i = 0; i < 4; i++) { let x = g.rnd(8, 56), y = g.rnd(8, 20); for (let k = 0; k < 3; k++) { const nx = x + g.rnd(-8, 8), ny = y + g.rnd(6, 14); c.line(x, y, Math.min(60, Math.max(4, nx)), Math.min(60, ny)); x = nx; y = ny; } }
        g.stroke('2B', '#3a4540', 0.8); c.line(10, 40, 30, 44); c.line(34, 30, 52, 36);
      });
      cell(g, 3, '#4a5650', ['#2d3532', '#5a6660'], (c) => { g.stroke('2B', '#1a201e', 0.8); c.line(10, 20, 54, 20); c.line(14, 40, 50, 40); });
      cell(g, 4, '#3d4c5a', ['#2f3b46', '#4b5c6b'], (c) => {                      // trousers + patch
        g.noStroke(); g.fill('#5a6a52', 220); c.rect(20, 22, 22, 18); g.stroke('2B', '#20281e', 0.8); c.line(20, 22, 42, 22); c.line(20, 40, 42, 40); c.line(20, 22, 20, 40); c.line(42, 22, 42, 40);
        g.stroke('cpencil', '#7a8a96', 0.7); for (let i = 0; i < 5; i++) { const x = g.rnd(6, 56); c.line(x, 6, x + g.rnd(-2, 2), 58); }
      });
      cell(g, 5, '#1a1d22', ['#2a2e35', '#101216'], (c) => { g.stroke('cpencil', '#5a6470', 0.8); for (let i = 0; i < 4; i++) { const y = g.rnd(8, 54); c.line(8, y, 50, y + 2); } });
      cell(g, 6, '#b8722e', ['#8a5220', '#d9a04c', '#a0601c'], (c) => {          // bell bronze
        g.stroke('2B', '#5b3416', 0.9); for (let i = 0; i < 4; i++) c.line(6 + i * 14, 6, 14 + i * 14, 58);
        g.stroke('cpencil', '#f0c078', 0.8); for (let i = 0; i < 4; i++) c.line(10 + i * 14, 10, 16 + i * 14, 40);
        g.stroke('HB', '#3fd6c0', 0.8); c.line(8, 50, 26, 44); c.line(26, 44, 34, 54);
      });
      cell(g, 7, '#e0aa5a', ['#f0c078', '#c88a3a'], (c) => { g.stroke('cpencil', '#fff0c8', 0.8); for (let i = 0; i < 4; i++) c.line(8 + i * 14, 8, 12 + i * 14, 56); });
      cell(g, 8, '#7d8c86', ['#6a7973', '#93a196'], (c) => { g.stroke('2B', '#2a3330', 0.8); for (let i = 0; i < 4; i++) c.line(10 + i * 12, 40, 12 + i * 12, 58); });
      for (let i = 9; i < 16; i++) cell(g, i, '#555', ['#666', '#444'], null);
    }),
  },

  // ---- Flare-cannon view-model atlas ---------------------------------------
  flarecannon_atlas: {
    seed: 5201, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#333');
      cell(g, 0, '#a07a2c', ['#c9a44c', '#7a5a1c', '#b8893a'], (c) => {          // brass barrel
        g.stroke('cpencil', '#e0be6a', 0.9); for (let i = 0; i < 5; i++) c.line(8 + i * 12, 6, 10 + i * 12, 58);
        g.stroke('cpencil', '#5fbfa8', 0.8); for (let i = 0; i < 9; i++) { const x = g.rnd(6, 58), y = g.rnd(6, 40); c.line(x, y, x + g.rnd(-2, 2), y + g.rnd(4, 12)); }
      });
      cell(g, 1, '#c9a44c', ['#e0be6a', '#a07a2c'], null);
      cell(g, 2, '#37474a', ['#2b3a3f', '#4b6064', '#5d7476'], (c) => {          // receiver steel
        g.stroke('cpencil', '#8aa0a0', 0.7); for (let i = 0; i < 8; i++) { const x = g.rnd(6, 50), y = g.rnd(6, 56); c.line(x, y, x + g.rnd(6, 14), y + g.rnd(-2, 2)); }
        g.stroke('cpencil', '#5fbfa8', 0.8); for (let i = 0; i < 5; i++) { const x = g.rnd(6, 58), y = g.rnd(40, 54); c.line(x, y, x, y + g.rnd(4, 8)); }
      });
      cell(g, 3, '#5a4632', ['#3e2f20', '#75603f'], (c) => { g.stroke('2B', '#2a1e12', 0.8); for (let i = 0; i < 5; i++) { const y = 8 + i * 10; c.line(6, y, 56, y + g.rnd(-3, 3)); } });
      cell(g, 4, '#c9a227', ['#b8951f', '#d8b840'], (c) => { g.stroke('cpencil', '#7a5f12', 0.8); for (let i = 0; i < 6; i++) { const x = 6 + i * 9; c.line(x, 4, x + g.rnd(-2, 2), 60); } });
      cell(g, 5, '#1a1d22', ['#2a2e35', '#0e1013'], (c) => { g.stroke('HB', '#5a6470', 0.8); for (let i = 0; i < 4; i++) c.circle(10 + i * 14, 32, 1.4); });
      cell(g, 6, '#3fd6c0', ['#7fffe8', '#1fa090'], (c) => { g.noStroke(); g.fill('#e8fff8', 200); for (let i = 0; i < 6; i++) c.circle(g.rnd(8, 56), g.rnd(8, 56), g.rnd(1.5, 3)); });
      cell(g, 7, '#4a3826', ['#382818', '#5a4632'], (c) => { g.stroke('cpencil', '#20160c', 0.8); for (let i = 0; i < 6; i++) c.line(6, 8 + i * 9, 58, 9 + i * 9 + g.rnd(-2, 2)); });
      // ---- cells 8-15: the melee set (PT-013): fists and found weapons. Olive, not green-teal; teal is light, never paint (design/LOOK_BIBLE.md).
      cell(g, 8, '#cdbfa0', ['#e2d6b8', '#b3a584'], (c) => {                      // linen hand-wraps: diagonal bands, sweat and old blood
        g.stroke('cpencil', '#8c7e60', 0.9); for (let i = 0; i < 8; i++) c.line(-4, 4 + i * 9, 66, 16 + i * 9);
        g.stroke('2B', '#6a4a3a', 0.8); for (let i = 0; i < 3; i++) { const x = g.rnd(10, 54), y = g.rnd(10, 54); c.line(x, y, x + g.rnd(3, 8), y + g.rnd(2, 6)); }
      });
      cell(g, 9, '#b4846a', ['#c99a80', '#9a6c54'], (c) => {                       // knuckle skin: scuffs and a split
        g.stroke('cpencil', '#6e4634', 0.8); for (let i = 0; i < 5; i++) { const x = g.rnd(6, 56), y = g.rnd(6, 56); c.line(x, y, x + g.rnd(4, 12), y + g.rnd(-3, 3)); }
        g.stroke('HB', '#e0b49a', 0.7); for (let i = 0; i < 4; i++) c.circle(10 + i * 14, 20, 2.2);
      });
      cell(g, 10, '#7f8e92', ['#a7b6ba', '#5d6c70'], (c) => {                      // forged steel: a bright edge down one side, file marks, nicks
        g.stroke('cpencil', '#e6f2f2', 1.2); c.line(6, 2, 6, 62); c.line(8, 2, 8, 62);
        g.stroke('HB', '#34454a', 0.8); for (let i = 0; i < 7; i++) { const y = 6 + i * 8; c.line(14, y, 50, y + g.rnd(-2, 2)); }
        g.stroke('2B', '#1e2a2e', 0.9); for (let i = 0; i < 4; i++) { const y = g.rnd(8, 56); c.line(4, y, 11, y + 2); }
      });
      cell(g, 11, '#a8895a', ['#c3a574', '#8a6c40'], (c) => {                      // rope: twist lines
        g.stroke('2B', '#5a4326', 1.0); for (let i = -2; i < 12; i++) c.line(i * 8, 0, i * 8 + 14, 64);
        g.stroke('cpencil', '#dcc08a', 0.8); for (let i = -2; i < 12; i++) c.line(i * 8 + 4, 0, i * 8 + 18, 64);
      });
      cell(g, 12, '#4a3a34', ['#7a4a2a', '#2e2420', '#8a5a30'], (c) => {          // rusted iron: pitted, orange where the paint is gone
        g.stroke('cpencil', '#b86a30', 0.8); for (let i = 0; i < 14; i++) { const x = g.rnd(4, 60), y = g.rnd(4, 60); c.circle(x, y, g.rnd(1, 2.4)); }
        g.stroke('2B', '#1c1410', 0.9); for (let i = 0; i < 5; i++) { const x = g.rnd(4, 50), y = g.rnd(6, 58); c.line(x, y, x + g.rnd(6, 14), y + g.rnd(-2, 2)); }
      });
      cell(g, 13, '#6b4a2e', ['#7a5636', '#4d321c'], (c) => {                      // a handle worn dark by hands: long grain, a polished stripe where the grip sits
        g.stroke('2B', '#2c1c0e', 0.9); for (let i = 0; i < 7; i++) c.line(6 + i * 8, 0, 8 + i * 8 + g.rnd(-2, 2), 64);
        g.stroke('cpencil', '#9a7a52', 0.9); c.line(30, 0, 31, 64); c.line(34, 0, 35, 64);
      });
      cell(g, 14, '#7a6a3a', ['#9a8a4a', '#6a6a30', '#4a3a1c'], (c) => {          // the lamplighter's mallet head: old bronze, olive patina in the recesses
        g.stroke('cpencil', '#7d7a3c', 1.0); for (let i = 0; i < 6; i++) { const x = g.rnd(4, 58), y = g.rnd(4, 40); c.line(x, y, x + g.rnd(-3, 3), y + g.rnd(8, 18)); }
        g.stroke('HB', '#d8c070', 0.8); c.line(4, 6, 58, 6); c.line(4, 58, 58, 58);
      });
      cell(g, 15, '#9b2e22', ['#b8402e', '#7a2218'], (c) => {                      // red fire-service enamel, chipped to steel at the edges
        g.stroke('cpencil', '#b6c0c0', 1.0); for (let i = 0; i < 9; i++) { const x = g.rnd(2, 62), y = g.rnd(2, 62); c.line(x, y, x + g.rnd(2, 6), y + g.rnd(-2, 4)); }
        g.stroke('2B', '#4a1410', 0.9); for (let i = 0; i < 4; i++) { const y = g.rnd(8, 56); c.line(4, y, 60, y + g.rnd(-2, 2)); }
      });
      // ---- PT-020: the sleeve, the hand wraps and the skin, repainted (the owner: the arms were flat, saturated pipes, the hands 2x4s). Painted last so no other cell moves.
      // 4: a waxed oilskin sleeve, a value darker and quieter than before so the weapon leads. Washes, not hard lines (the first try was a plaid at this size): a few soft folds with a lit ridge beside each, cross creases crowded at the elbow and above the cuff, a stitched seam, scuffs and oil stains, shaded at both ends
      repaint(g, 4, '#8f7526', ['#7c661f', '#a28a35', '#6e5a19'], (c) => {
        g.noStroke();
        for (let i = 0; i < 5; i++) { const x = 6 + i * 12 + g.rnd(-2, 2); g.fill('#3a2c0a', 78); c.rect(x, 0, 3.2, 64); g.fill('#d6ba5a', 62); c.rect(x + 3.4, 2, 2.6, 60); }
        for (const y0 of [23, 29, 35, 41, 53, 57]) { g.fill('#2e2308', 70); c.rect(0, y0, 64, 1.8); g.fill('#cfb34f', 55); c.rect(0, y0 + 2, 64, 1.6); }
        g.stroke('cpencil', '#e6d58f', 0.6); for (let y = 3; y < 61; y += 6) c.line(58, y, 58, y + 2.5);
        g.noStroke(); g.fill('#c9ae55', 80); for (let i = 0; i < 7; i++) c.circle(g.rnd(4, 60), g.rnd(4, 60), g.rnd(1.5, 4));
        g.fill('#2a2008', 66); for (let i = 0; i < 5; i++) c.circle(g.rnd(4, 60), g.rnd(8, 60), g.rnd(2, 5));
        g.fill('#1c1604', 80); c.rect(0, 0, 64, 6); c.rect(0, 58, 64, 6);
      });
      // 8: linen hand wraps: overlapping bands that run round the hand (a lit upper edge and a shadow under each, as soft washes), sweat and old blood; no plank grain, no check
      repaint(g, 8, '#d9ccac', ['#e8dcc0', '#c4b690'], (c) => {
        g.noStroke();
        for (let i = 0; i < 9; i++) { const y = 2 + i * 7 + g.rnd(-1, 1); g.fill('#8d805c', 85); c.rect(0, y + 4.6, 64, 2.2); g.fill('#f6efd8', 95); c.rect(0, y, 64, 2.2); }
        g.stroke('HB', '#b2a47c', 0.35); for (let i = 0; i < 5; i++) { const x = g.rnd(0, 64); c.line(x, 0, x + g.rnd(-6, 6), 64); }
        g.noStroke(); g.fill('#b89a54', 60); for (let i = 0; i < 4; i++) c.circle(g.rnd(6, 58), g.rnd(6, 58), g.rnd(3, 6)); g.fill('#6a3a2c', 95); for (let i = 0; i < 3; i++) c.circle(g.rnd(6, 58), g.rnd(6, 58), g.rnd(1, 2.2));
      });
      // 9: bare skin: warm, with creases across the knuckles, scuffs and a little dirt
      repaint(g, 9, '#c4937a', ['#d5a68c', '#ad7d64'], (c) => {
        g.stroke('cpencil', '#8f6048', 0.7); for (let i = 0; i < 6; i++) { const y = 6 + i * 10; c.line(4, y, 60, y + g.rnd(-1.5, 1.5)); }
        g.stroke('cpencil', '#e6bda4', 0.8); for (let i = 0; i < 6; i++) { const y = 8 + i * 10; c.line(6, y, 56, y + g.rnd(-1, 1)); }
        g.stroke('2B', '#6e4634', 0.7); for (let i = 0; i < 4; i++) { const x = g.rnd(6, 56), y = g.rnd(6, 56); c.line(x, y, x + g.rnd(3, 9), y + g.rnd(-2, 2)); }
        g.noStroke(); g.fill('#5a3a2c', 60); for (let i = 0; i < 4; i++) c.circle(g.rnd(4, 60), g.rnd(40, 62), g.rnd(2, 5));
      });
    }),
  },

  // ---- Tiling surfaces -------------------------------------------------------
  floor_planks_a: {
    seed: 5301, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3a3026');
      const rows = 8, rh = 256 / rows;
      for (let r = 0; r < rows; r++) {
        g.noStroke(); g.bleed(0.08, 'out');
        let x = -g.rnd(0, 120);
        while (x < 256) {
          const len = g.rnd(90, 170), y = r * rh;
          g.tile((dx, dy) => { g.fill(pick(g, ['#3a3026', '#43362a', '#332a20', '#4a3c2e']), 255); g.rect(x + dx, y + 1 + dy, len, rh - 2); });
          g.stroke('2B', '#14100a', 1.1); g.tile((dx, dy) => g.line(x + dx, y + dy, x + dx, y + rh + dy));
          x += len;
        }
        g.stroke('2B', '#14100a', 1.2); g.tile((dx, dy) => g.line(dx, r * rh + dy, 256 + dx, r * rh + dy));
      }
      g.stroke('cpencil', '#1c150e', 0.7);
      for (let i = 0; i < 60; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), l = g.rnd(12, 40); g.tile((dx, dy) => g.line(x + dx, y + dy, x + l + dx, y + dy + g.rnd(-1, 1))); }
      g.stroke('HB', '#7f8a86', 0.6);
      for (let i = 0; i < 40; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.circle(x + dx, y + dy, 0.9)); }
      g.noStroke(); g.bleed(0.7, 'out');
      for (let i = 0; i < 6; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(24, 44); g.tile((dx, dy) => { g.fill('#3b6a70', 70); g.circle(x + dx, y + dy, r); }); }
    }),
  },

  crate_wood_a: {
    seed: 5401, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#5a3f24');
      g.noStroke(); g.bleed(0.06, 'out');
      for (let i = 0; i < 4; i++) { g.fill(pick(g, ['#6b4a2a', '#5f4224', '#775430']), 255); g.rect(6, 6 + i * 61, 244, 57); }
      g.stroke('2B', '#1c1208', 1.4); for (let i = 0; i <= 4; i++) g.line(6, 6 + i * 61, 250, 6 + i * 61);
      g.stroke('cpencil', '#2a1c0e', 0.8); for (let i = 0; i < 46; i++) { const x = g.rnd(10, 240), y = g.rnd(10, 246); g.line(x, y, x + g.rnd(20, 60), y + g.rnd(-1, 1)); }
      g.noStroke(); g.fill('#3e2a16', 255); g.rect(0, 0, 256, 14); g.rect(0, 242, 256, 14); g.rect(0, 0, 14, 256); g.rect(242, 0, 14, 256);      // frame
      g.stroke('2B', '#1c1208', 1.4); g.rect(0, 0, 256, 256);
      g.stroke('HB', '#b8a070', 1.0); for (const [x, y] of [[7, 7], [249, 7], [7, 249], [249, 249]]) g.circle(x, y, 2);
      g.stroke('cpencil', '#d9c89a', 1.2); g.circle(128, 122, 26); g.line(128, 96, 128, 160); g.line(108, 118, 148, 118); g.line(100, 140, 128, 160); g.line(156, 140, 128, 160);   // painted anchor stencil
      g.noStroke(); g.bleed(0.6, 'out'); for (let i = 0; i < 8; i++) { g.fill('#1a120a', g.rnd(40, 90)); g.circle(g.rnd(10, 246), g.rnd(10, 246), g.rnd(14, 30)); }
    }),
  },

  pod_organic_a: {
    seed: 5501, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#6b3f6a');
      g.noStroke(); g.bleed(0.5, 'out');
      for (let i = 0; i < 26; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(24, 60); g.tile((dx, dy) => { g.fill(pick(g, ['#8a5a80', '#4a2a4a', '#a06a8a', '#5b3060']), g.rnd(70, 140)); g.circle(x + dx, y + dy, r); }); }
      g.stroke('HB', '#3fffe0', 0.9);
      for (let i = 0; i < 16; i++) { let x = g.rnd(0, 256), y = g.rnd(0, 256); for (let k = 0; k < 5; k++) { const nx = x + g.rnd(-22, 22), ny = y + g.rnd(10, 30); const [ax, ay, bx, by] = [x, y, nx, ny]; g.tile((dx, dy) => g.line(ax + dx, ay + dy, bx + dx, by + dy)); x = nx; y = ny; } }
      g.stroke('2B', '#1e0f20', 0.9);
      for (let i = 0; i < 24; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.circle(x + dx, y + dy, g.rnd(2.5, 5))); }
      g.noStroke(); g.bleed(0.2, 'in'); for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => { g.fill('#e8b0d0', 150); g.circle(x + dx - 1, y + dy - 1, 2.2); }); }
    }),
  },

  sky_dusk: {
    seed: 5601, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.noStroke(); g.bleed(0.8, 'out');
      ['#0e0a24', '#1a1233', '#2a1b4d', '#48246a', '#7a3a7a', '#c0587a', '#e8946a'].forEach((c, i) => { g.fill(c, 245); g.rect(-10, i * 40 - 10, w + 20, 56); });
      for (let i = 0; i < 26; i++) {
        const x = g.rnd(0, w), y = g.rnd(90, 240), r = g.rnd(28, 70), a = g.rnd(80, 150);
        const col = pick(g, ['#1a1233', '#2a1b4d', '#c0587a', '#e8946a', '#48246a']);
        g.tile((dx) => { g.fill(col, a); g.circle(x + dx, y, r); });
      }
      g.stroke('marker', '#3fffe0', 1.2);
      for (let i = 0; i < 6; i++) { const y = 36 + i * 12, d = g.rnd(-20, 20); g.line(0, y, w, y + d); }
      g.noStroke(); g.fill('#e8fff8', 230); for (let i = 0; i < 40; i++) g.circle(g.rnd(0, w), g.rnd(4, 70), g.rnd(0.6, 1.4));
    }),
  },

  paper_grain: {
    seed: 5701, width: 128, height: 128,
    draw: R((g, w, h) => {
      g.bg('#808080');
      g.stroke('cpencil', '#a4a4a4', 0.5);
      for (let i = 0; i < 260; i++) { const x = g.rnd(0, w), y = g.rnd(0, h), l = g.rnd(3, 12), j = g.rnd(-3, 3); g.tile((dx, dy) => g.line(x + dx, y + dy, x + l + dx, y + j + dy)); }
      g.stroke('cpencil', '#5c5c5c', 0.5);
      for (let i = 0; i < 260; i++) { const x = g.rnd(0, w), y = g.rnd(0, h), l = g.rnd(3, 12), j = g.rnd(-3, 3); g.tile((dx, dy) => g.line(x + dx, y + dy, x + j + dx, y + l + dy)); }
    }),
  },
};

// ---- Gate 1 engine skeleton additions -------------------------------------
recipes3d.door_hatch_a = {
  seed: 5801, width: 256, height: 256,
  draw: R((g) => {
    g.bg('#3a2a1a');
    g.noStroke(); g.bleed(0.06, 'out');
    for (let i = 0; i < 6; i++) { g.solid(i * 42.6, 0, 43, 256, pick(g, ['#4a3420', '#3e2c1a', '#54402a'])); }
    g.stroke('2B', '#140c06', 1.4); for (let i = 0; i <= 6; i++) g.line(i * 42.6, 0, i * 42.6, 256);
    g.stroke('cpencil', '#20140a', 0.8); for (let i = 0; i < 40; i++) { const x = g.rnd(4, 252), y = g.rnd(4, 200); g.line(x, y, x + g.rnd(-2, 2), y + g.rnd(20, 50)); }
    for (const y of [40, 200]) { g.solid(0, y - 10, 256, 20, '#2a2e32'); g.stroke('2B', '#0a0c0e', 1.4); g.line(0, y - 10, 256, y - 10); g.line(0, y + 10, 256, y + 10);
      g.stroke('HB', '#8a9a9a', 1.0); for (let x = 16; x < 256; x += 32) g.circle(x, y, 2); }
    g.solid(96, 108, 64, 44, '#7a5a1c'); g.stroke('2B', '#1a1208', 1.4); g.rect(96, 108, 64, 44);
    g.noStroke(); g.fill('#c9a44c', 220); g.circle(128, 126, 9); g.fill('#141416', 255); g.circle(128, 126, 3);
    g.noStroke(); g.bleed(0.6, 'out'); for (let i = 0; i < 6; i++) { g.fill('#0a0806', g.rnd(40, 90)); g.circle(g.rnd(10, 246), g.rnd(10, 246), g.rnd(14, 30)); }
  }),
};

recipes3d.props_atlas = {
  seed: 5901, width: 256, height: 256,
  draw: R((g) => {
    g.bg('#333');
    cell(g, 0, '#d8d2c0', ['#c8c2b0', '#e8e2d0'], (c) => { g.noStroke(); g.fill('#b8322a', 255); c.rect(22, 10, 20, 44); c.rect(10, 22, 44, 20); g.stroke('cpencil', '#7a6a50', 0.8); for (let i = 0; i < 4; i++) { const y = g.rnd(6, 58); c.line(6, y, 30, y + 2); } });
    cell(g, 1, '#6b5a2c', ['#54461f', '#7a683a'], (c) => { g.stroke('cpencil', '#e0be6a', 1.0); c.circle(32, 32, 12); c.line(32, 12, 32, 52); c.line(20, 32, 44, 32); });
    cell(g, 2, '#4a5a44', ['#3a4a36', '#5a6a54'], (c) => { g.stroke('2B', '#1e281c', 1.0); for (let i = 0; i < 4; i++) c.line(8 + i * 16, 4, 8 + i * 16, 60); });
    cell(g, 3, '#c9a44c', ['#e0be6a', '#a07a2c'], (c) => { g.stroke('cpencil', '#fff0c0', 0.8); c.line(8, 10, 8, 54); c.line(20, 8, 24, 54); });
    cell(g, 4, '#b8322a', ['#8a2018', '#d04a3a'], null);
    cell(g, 5, '#e6e0d0', ['#d0c8b4', '#f4f0e4'], null);
    cell(g, 6, '#3fd6c0', ['#7fffe8', '#1fa090'], null);
    cell(g, 7, '#8a7a5a', ['#6a5a3a', '#a08a64'], (c) => { g.stroke('cpencil', '#4a3a20', 0.8); for (let i = 0; i < 6; i++) c.line(4, 6 + i * 9, 60, 8 + i * 9); });
    for (let i = 8; i < 16; i++) cell(g, i, '#555', ['#666', '#444'], null);
  }),
};

// ---- Marrow Quay environment set (Gate 1 real level) ---------------------------------------------------------------
recipes3d.water_dusk = {
  seed: 6101, width: 256, height: 256,
  draw: R((g) => {
    g.bg('#16303c'); g.solid(0, 0, 256, 256, '#16303c');
    g.noStroke(); g.bleed(0.7, 'out');
    for (let i = 0; i < 34; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(26, 60); g.tile((dx, dy) => { g.fill(pick(g, ['#0f2430', '#1d4250', '#24525f', '#3b2a55']), g.rnd(70, 140)); g.circle(x + dx, y + dy, r); }); }
    // sky reflections: long horizontal smears in dusk pink / amber / teal
    for (const [col, n, wt] of [['#c0587a', 14, 1.6], ['#e8946a', 10, 1.4], ['#3fd6c0', 8, 1.0], ['#f0c8a0', 6, 0.8]]) {
      g.stroke('marker', col, wt);
      for (let i = 0; i < n; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), l = g.rnd(14, 60); g.tile((dx, dy) => g.line(x + dx, y + dy, x + l + dx, y + g.rnd(-2, 2) + dy)); }
    }
    g.stroke('cpencil', '#0a1a22', 0.8);
    for (let i = 0; i < 70; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), l = g.rnd(8, 30); g.tile((dx, dy) => g.line(x + dx, y + dy, x + l + dx, y + dy)); }      // troughs
  }),
};
recipes3d.cobble_wet_a = {
  seed: 6201, width: 256, height: 256,
  draw: R((g) => {
    g.bg('#2a2e33'); g.solid(0, 0, 256, 256, '#2a2e33');
    const rows = 8, rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      const per = 7, cw = 256 / per, off = (r % 2) * cw / 2;
      for (let c = 0; c < per; c++) {
        const x = c * cw + off + g.rnd(-1.5, 1.5), y = r * rh + g.rnd(-1, 1), col = pick(g, ['#4a5057', '#3f454b', '#545b62', '#454b54', '#5a5f66']);
        g.noStroke(); g.bleed(0.1, 'out');
        g.tile((dx, dy) => { g.fill(col, 255); g.rect(x + 2 + dx, y + 2 + dy, cw - 4, rh - 4); });
        g.stroke('cpencil', '#7f8890', 0.7); g.tile((dx, dy) => g.line(x + 4 + dx, y + 4 + dy, x + cw * 0.5 + dx, y + 4 + dy));
      }
    }
    g.stroke('2B', '#0c0e10', 1.2);
    for (let r = 0; r <= rows; r++) g.tile((dx, dy) => g.line(dx, r * rh + dy, 256 + dx, r * rh + dy));
    g.noStroke(); g.bleed(0.7, 'out');
    for (let i = 0; i < 10; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(20, 44); g.tile((dx, dy) => { g.fill('#3b6a78', 70); g.circle(x + dx, y + dy, r); }); }        // wet sheen
    for (let i = 0; i < 30; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => { g.fill('#4a6a3a', 130); g.circle(x + dx, y + dy, g.rnd(1.5, 3)); }); }          // moss
  }),
};
recipes3d.brick_warm_a = {
  seed: 6301, width: 256, height: 256,
  draw: R((g) => {
    g.bg('#3a302c'); g.solid(0, 0, 256, 256, '#3a302c');
    const rows = 12, rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      const per = 6, cw = 256 / per, off = (r % 2) * cw / 2;
      for (let c = 0; c < per; c++) {
        const x = c * cw + off, y = r * rh, col = pick(g, ['#7a4a3a', '#8a5a44', '#6a3e30', '#7a5240', '#5e382c']);
        g.noStroke(); g.bleed(0.08, 'out'); g.tile((dx, dy) => { g.fill(col, 255); g.rect(x + 1.5 + dx, y + 1.5 + dy, cw - 3, rh - 3); });
        g.stroke('cpencil', '#a8785a', 0.6); g.tile((dx, dy) => g.line(x + 3 + dx, y + 3 + dy, x + cw * 0.6 + dx, y + 3 + dy));
      }
    }
    g.stroke('charcoal', '#1a1210', 0.9);
    for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), l = g.rnd(24, 70); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(-2, 2) + dx, y + l + dy)); }      // soot runs
    g.stroke('cpencil', '#c9d6d0', 0.6);
    for (let i = 0; i < 30; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(3, 9) + dx, y + dy)); }                            // salt bloom
  }),
};
recipes3d.awning_stripe_a = {
  seed: 6401, width: 128, height: 128,
  draw: R((g) => {
    g.bg('#e6dcc0');
    for (let i = 0; i < 8; i++) g.solid(i * 16, 0, 16, 128, i % 2 ? '#e6dcc0' : '#b8322a');
    g.noStroke(); g.bleed(0.6, 'out');
    for (let i = 0; i < 10; i++) { g.fill('#2a1a10', g.rnd(40, 90)); g.circle(g.rnd(0, 128), g.rnd(60, 128), g.rnd(10, 26)); }
    g.stroke('cpencil', '#1a120a', 0.8); for (let i = 0; i < 12; i++) { const x = g.rnd(0, 128), y = g.rnd(20, 90); g.line(x, y, x + g.rnd(-2, 2), y + g.rnd(10, 36)); }
    g.stroke('2B', '#2a1a10', 1.0); for (let i = 0; i <= 8; i++) g.line(i * 16, 0, i * 16, 128);
  }),
};
recipes3d.boat_hull_a = {
  seed: 6501, width: 256, height: 256,
  draw: R((g) => {
    g.bg('#2c4a58'); g.solid(0, 0, 256, 256, '#2c4a58');
    const rows = 8, rh = 256 / rows;
    for (let r = 0; r < rows; r++) g.solid(0, r * rh, 256, rh, pick(g, ['#2c4a58', '#345666', '#264352', '#3a5c6c']));      // opaque native fills: full-width brush rects crash p5.brush's scatter
    g.stroke('2B', '#0c1a20', 1.3); for (let r = 0; r <= rows; r++) g.tile((dx, dy) => g.line(dx, r * rh + dy, 256 + dx, r * rh + dy));
    g.noStroke(); g.bleed(0.5, 'out');
    for (let i = 0; i < 26; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => { g.fill(pick(g, ['#7a4a2b', '#8c5a30', '#c9d6d0']), 200); g.circle(x + dx, y + dy, g.rnd(2, 6)); }); }            // chipped paint + barnacles
    for (let i = 0; i < 9; i++) { g.fill('#0e2a1e', 90); g.circle(i * 32 + g.rnd(-6, 6), 214 + g.rnd(-10, 10), g.rnd(26, 40)); }        // weed stain along the waterline                                                                                                            // weed stain at the waterline
    g.stroke('charcoal', '#1a120a', 0.9); for (let i = 0; i < 12; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 200); g.tile((dx, dy) => g.line(x + dx, y + dy, x + dx, y + g.rnd(14, 40) + dy)); }
  }),
};
recipes3d.tower_stone_a = {
  seed: 6601, width: 256, height: 256,
  draw: R((g) => {
    g.bg('#585a64'); g.solid(0, 0, 256, 256, '#585a64');
    const rows = 6, rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      const per = 3 + (r % 2), cw = 256 / per;
      for (let c = 0; c < per; c++) { g.noStroke(); g.bleed(0.1, 'out'); g.tile((dx, dy) => { g.fill(pick(g, ['#7a7c86', '#6c6e78', '#8a8c96', '#62646e']), 255); g.rect(c * cw + 2 + dx, r * rh + 2 + dy, cw - 4, rh - 4); }); }
    }
    g.stroke('2B', '#1a1c22', 1.4); for (let r = 0; r <= rows; r++) g.tile((dx, dy) => g.line(dx, r * rh + dy, 256 + dx, r * rh + dy));
    g.stroke('cpencil', '#c8c8d0', 0.7); for (let i = 0; i < 30; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + dx + g.rnd(-2, 2), y + g.rnd(8, 24) + dy)); }
    g.noStroke(); g.bleed(0.6, 'out'); for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => { g.fill('#3f6a52', 110); g.circle(x + dx, y + dy, g.rnd(8, 20)); }); }        // verdigris / moss
  }),
};
