// Episode 3 materials, Batches D and E (PT-029, PT-030): four places that must NOT melt together with the first four maps' rib-and-gill look (design/EPISODE3.md, "the look rule"): the RESONANCE LOOM (dark lacquer and taut gold strings, violet-black),
// the CHOIR LOFT (warm bronze organ pipes on walnut, polished boards: amber), the SPORE FOUNDRY (riveted black cast iron with green slag light, an iron grating over a furnace: green-gold) and the CANTOR'S THRONE (the inside of a throat: wet rings of
// pink cartilage, red-violet muscle, a veined wet floor). Same conventions as recipes_e3.js: opaque, tiling (g.tile paints at 9 wrapped offsets), top-left px, big shapes and strong value steps first (the game renders at about 480 px wide and bands the value).
import { R } from './recipes.js';
import { hex, mix } from './paint_util.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };
const wash = (g, x, y, w, h, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.rect(x + dx - g.p.width / 2, y + dy - g.p.height / 2, w, h); g.p.pop(); });
const blot = (g, x, y, d, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, d, d); g.p.pop(); });
const ink = (g, x1, y1, x2, y2, c, wt, a = 255) => g.tile((dx, dy) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 + dx - g.p.width / 2, y1 + dy - g.p.height / 2, x2 + dx - g.p.width / 2, y2 + dy - g.p.height / 2); g.p.pop(); });

export const recipesE3b = {
  // ---- the Loom's wall: dark violet lacquer posts with taut gold strings in bundles between them, bronze pegs, a dark foot ---------------------------------------------------------------------------------
  wall_loom_a: {
    seed: 9311, width: 256, height: 256,
    draw: R((g) => {
      const base = '#1a1224';
      g.bg(base); g.solid(0, 0, 256, 256, base);
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(50, 100), pick(g, ['#241a34', '#150e1e', '#2a2038']), 90);
      for (let c = 0; c < 4; c++) {                                                                       // four lacquered posts across the tile, each a round bar lit from the left
        const x = c * 64;
        g.solid(x, 0, 8, 256, '#0e0816'); g.solid(x + 8, 0, 8, 256, '#3a2c52'); g.solid(x + 16, 0, 8, 256, '#6a5a88'); g.solid(x + 24, 0, 6, 256, '#2a2040');
        for (let k = 0; k < 7; k++) { const sx = x + 34 + k * 4 + (k % 2); ink(g, sx, 0, sx + g.rnd(-0.4, 0.4), 256, pick(g, ['#e8c860', '#f4dc88', '#d4b04c']), 1.2, 230); }      // seven taut gold strings between this post and the next
        ink(g, x + 33, 0, x + 33, 256, '#0a0610', 1.5, 200); ink(g, x + 64, 0, x + 64, 256, '#0a0610', 1.5, 160);
      }
      for (const y of [44, 212]) { for (let c = 0; c < 4; c++) { blot(g, c * 64 + 20, y, 11, '#a8782c', 255); blot(g, c * 64 + 18, y - 2, 4, '#f4d890', 230); blot(g, c * 64 + 20, y, 17, '#0a0610', 90); } }      // bronze tuning pegs, two rows
      for (let i = 0; i < 26; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); blot(g, x, y, g.rnd(1.2, 3), '#fff4c8', 170); }                                  // glints on the strings
      for (let i = 0; i < 10; i++) { const y = g.rnd(0, 256); ink(g, 0, y, 256, y + g.rnd(-2, 2), '#0a0610', 0.9, 50); }
      wash(g, 0, 224, 256, 32, '#07040c', 90);
    }),
  },
  // ---- the Loom's floor: a woven floor, basket-weave blocks of dim threads with bright warp lines -----------------------------------------------------------------------------------------------------
  floor_loom_a: {
    seed: 9312, width: 256, height: 256,
    draw: R((g) => {
      const base = '#18121f';
      g.bg(base); g.solid(0, 0, 256, 256, base);
      for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) {                                     // 32 px blocks, alternately horizontal and vertical thread
        const horiz = (bx + by) % 2 === 0, x = bx * 32, y = by * 32;
        g.solid(x, y, 32, 32, horiz ? '#241b30' : '#1d1628');
        for (let k = 0; k < 6; k++) { const o = 3 + k * 5; if (horiz) ink(g, x, y + o, x + 32, y + o, pick(g, ['#7a6a44', '#5a4c36', '#8a7a50']), 1.6, 190); else ink(g, x + o, y, x + o, y + 32, pick(g, ['#7a6a44', '#5a4c36', '#8a7a50']), 1.6, 190); }
        ink(g, x, y, x + 32, y, '#08040e', 1.5, 200); ink(g, x, y, x, y + 32, '#08040e', 1.5, 200);
      }
      for (let i = 0; i < 4; i++) { const x = i * 64 + 31; ink(g, x, 0, x, 256, '#e8c860', 1.6, 140); }                                           // the bright warp lines
      for (let i = 0; i < 30; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(24, 60), pick(g, ['#2e2440', '#120c1a']), 50);
      for (let i = 0; i < 30; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1, 2.4), '#f4dc88', 110);
    }),
  },
  // ---- the Loft's wall: warm bronze organ pipes standing in a row against dark walnut, each with a dark mouth and a lip ---------------------------------------------------------------------------------
  wall_loft_a: {
    seed: 9313, width: 256, height: 256,
    draw: R((g) => {
      const wood = '#2a1a10';
      g.bg(wood); g.solid(0, 0, 256, 256, wood);
      for (let i = 0; i < 40; i++) ink(g, g.rnd(0, 256), 0, g.rnd(0, 256) , 256, pick(g, ['#3a2416', '#1e1209']), 1.1, 90);                 // walnut grain
      for (let c = 0; c < 8; c++) {                                                                       // eight pipes of different length across the tile, round bars lit from the left
        const x = c * 32 + 4, top = 16 + ((c * 37) % 5) * 12;
        g.solid(x, top, 5, 256 - top, '#5a3a14'); g.solid(x + 5, top, 6, 256 - top, '#a8742c'); g.solid(x + 11, top, 8, 256 - top, '#f0c470'); g.solid(x + 19, top, 5, 256 - top, '#7a5020');
        g.solid(x - 1, top - 5, 26, 6, '#c89038');                                                         // the cap
        const my = 150 + ((c * 29) % 4) * 14;
        g.solid(x + 4, my, 16, 22, '#0c0604'); g.solid(x + 2, my - 3, 20, 4, '#f4cc7a'); g.solid(x + 2, my + 22, 20, 3, '#3a2008');     // a dark mouth with a bright upper lip
        blot(g, x + 13, top + 30, 5, '#fff0b0', 140);
      }
      for (const y of [8, 238]) { g.solid(0, y, 256, 6, '#c89038'); g.solid(0, y + 1, 256, 2, '#f8e0a0'); }       // gilded rails top and bottom
      wash(g, 0, 232, 256, 24, '#0c0604', 80);
    }),
  },
  // ---- the Loft's floor: polished dark boards with a bronze inlay and gloss ------------------------------------------------------------------------------------------------------------------------------
  floor_loft_a: {
    seed: 9314, width: 256, height: 256,
    draw: R((g) => {
      const wood = '#2e1c10';
      g.bg(wood); g.solid(0, 0, 256, 256, wood);
      for (let b = 0; b < 8; b++) { g.solid(b * 32, 0, 32, 256, pick(g, ['#34200f', '#2a1a0e', '#3a2414', '#271608'])); ink(g, b * 32, 0, b * 32, 256, '#0e0804', 2, 220); }
      for (let i = 0; i < 70; i++) { const x = g.rnd(0, 256); ink(g, x, g.rnd(0, 256), x + g.rnd(-1.5, 1.5), g.rnd(0, 256), pick(g, ['#4a2c18', '#1c0f06']), 1, 90); }
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const cx = c * 64 + 32, cy = r * 64 + 32; ink(g, cx - 14, cy, cx, cy - 14, '#c89038', 1.8, 230); ink(g, cx, cy - 14, cx + 14, cy, '#c89038', 1.8, 230); ink(g, cx + 14, cy, cx, cy + 14, '#c89038', 1.8, 230); ink(g, cx, cy + 14, cx - 14, cy, '#c89038', 1.8, 230); blot(g, cx, cy, 4, '#f0c470', 220); }      // a bronze diamond inlaid in each square
      for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(10, 26), y + g.rnd(-2, 2), '#f4dca0', 1.4, 70); }       // gloss
    }),
  },
  // ---- the Foundry's wall: riveted black cast-iron plates, green slag light in the seams, soot and verdigris --------------------------------------------------------------------------------------------
  wall_foundry_a: {
    seed: 9315, width: 256, height: 256,
    draw: R((g) => {
      const iron = '#171e1a';
      g.bg(iron); g.solid(0, 0, 256, 256, iron);
      for (let py = 0; py < 4; py++) for (let px = 0; px < 2; px++) { const x = px * 128 + (py % 2) * 64 - 64, y = py * 64; g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, pick(g, ['#222c26', '#1b241f', '#28332c']), 255); g.p.rect(x + dx - g.p.width / 2, y + dy - g.p.height / 2, 128, 64); g.p.pop(); }); }
      for (let py = 0; py < 4; py++) { const y = py * 64; ink(g, 0, y, 256, y, '#9aff6a', 2.4, 210); ink(g, 0, y, 256, y, '#e8ffb0', 0.9, 150); ink(g, 0, y + 3, 256, y + 3, '#0a0f0c', 2, 200); }       // the seams glow green, hot
      for (let py = 0; py < 4; py++) for (let k = 0; k < 8; k++) { const x = ((py % 2) * 64 + k * 32 + 16) % 256, y = py * 64; g.solid(x - 64, y, 2, 64, '#0a0f0c'); for (const ry of [10, 32, 54]) { blot(g, x, y + ry, 7, '#0a0f0c', 220); blot(g, x - 1, y + ry - 1, 3.4, '#6a7a6a', 230); } }      // rivets on the plate edges
      for (let i = 0; i < 30; i++) { const x = g.rnd(0, 256); ink(g, x, g.rnd(0, 150), x + g.rnd(-3, 3), g.rnd(150, 256), '#050806', g.rnd(1, 2.6), 90); }      // soot streaks
      for (let i = 0; i < 16; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(12, 30), pick(g, ['#3a5a3a', '#2a4a30']), 70);                                       // verdigris
      for (let py = 0; py < 4; py++) wash(g, 0, py * 64, 256, 16, '#78e04c', 26);                                                                                   // the glow bleeding up off each seam
      wash(g, 0, 232, 256, 24, '#040605', 90);
    }),
  },
  // ---- the Foundry's floor: an iron grating, a furnace's green-gold glow under it ----------------------------------------------------------------------------------------------------------------------------
  floor_foundry_a: {
    seed: 9316, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#0d1208'); g.solid(0, 0, 256, 256, '#0d1208');
      for (let i = 0; i < 24; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#3a6a1c', '#78b030', '#a8d848', '#244810']), 130);        // the glow beneath: green-gold, mottled
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 30), '#e8ff90', 90);
      for (let i = 0; i < 9; i++) { g.solid(i * 32 - 4, 0, 8, 256, '#161b14'); g.solid(0, i * 32 - 4, 256, 8, '#161b14'); g.solid(i * 32 - 4, 0, 2, 256, '#3a4636'); g.solid(0, i * 32 - 4, 256, 2, '#3a4636'); }      // the bars of the grating, lit on one edge
      for (let i = 0; i < 9; i++) for (let k = 0; k < 9; k++) blot(g, i * 32, k * 32, 8, '#10150e', 255);     // a bolt at every crossing
      for (let i = 0; i < 9; i++) for (let k = 0; k < 9; k++) blot(g, i * 32 - 1, k * 32 - 1, 3, '#6a7a64', 230);
    }),
  },
  // ---- the Throne's wall: the inside of a throat: wet rings of pale pink cartilage on red-violet muscle, veins, gloss ---------------------------------------------------------------------------------------
  wall_throat_a: {
    seed: 9317, width: 256, height: 256,
    draw: R((g) => {
      const muscle = '#5a2038';
      g.bg(muscle); g.solid(0, 0, 256, 256, muscle);
      for (let i = 0; i < 20; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#6a2840', '#481830', '#7a3048', '#3a1228']), 100);
      for (let r = 0; r < 8; r++) {                                                                       // a ring of cartilage every 32 px: a shadowed lower flank, a pale crest, a bright lip
        const y = r * 32 + 4;
        g.solid(0, y, 256, 5, '#2a0e1c'); g.solid(0, y + 5, 256, 7, '#a85a70'); g.solid(0, y + 12, 256, 8, '#e8a8b4'); g.solid(0, y + 20, 256, 5, '#8a4058');
        for (let x = 10; x < 256; x += 60 + Math.floor(g.rnd(0, 20))) blot(g, x, y + 15, g.rnd(4, 8), '#fff0f0', 150);
      }
      for (let i = 0; i < 22; i++) { let x = g.rnd(0, 256), y = g.rnd(0, 256); for (let k = 0; k < 4; k++) { const nx = x + g.rnd(-10, 10), ny = y + g.rnd(8, 24); ink(g, x, y, nx, ny, '#220a14', 1.5, 190); ink(g, x + 1, y, nx + 1, ny, '#d86a80', 0.6, 130); x = nx; y = ny; } }      // veins running down the muscle
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.4, 3.4), '#fff4f4', 160);                                        // wet glints
      wash(g, 0, 232, 256, 24, '#1a0610', 80);
    }),
  },
  // ---- the Throne's floor: a wet membrane: mottled pink-grey cells walled by dark veins, a few ridges, gloss -----------------------------------------------------------------------------------------------
  floor_throat_a: {
    seed: 9318, width: 256, height: 256,
    draw: R((g) => {
      const base = '#6a3446';
      g.bg(base); g.solid(0, 0, 256, 256, base);
      for (let i = 0; i < 34; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(30, 70), pick(g, ['#7a4254', '#5a2a3a', '#8a5262', '#4a2230']), 110);
      const sites = Array.from({ length: 22 }, () => [g.rnd(0, 256), g.rnd(0, 256)]);                    // a cell net: dark veins where the nearest-site regions meet (a coarse grid walk, tiled)
      const N = 64, c = 256 / N, id = (px, py) => { let b = 0, bd = 1e9; sites.forEach(([sx, sy], k) => { for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { const d = (px - sx - ox) ** 2 + (py - sy - oy) ** 2; if (d < bd) { bd = d; b = k; } } }); return b; };
      const grid = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => id((i + 0.5) * c, (j + 0.5) * c)));
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const a = grid[i][j]; if (a !== grid[(i + 1) % N][j]) ink(g, (i + 1) * c, j * c, (i + 1) * c, (j + 1) * c, '#2a0e1a', 2.6, 220); if (a !== grid[i][(j + 1) % N]) ink(g, i * c, (j + 1) * c, (i + 1) * c, (j + 1) * c, '#2a0e1a', 2.6, 220); }
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.6, 4), '#ffe8ec', 130);
      for (let i = 0; i < 12; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(20, 50), y + g.rnd(-6, 6), '#f0b0bc', 1.6, 80); }
    }),
  },
};
