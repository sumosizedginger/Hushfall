// Episode 2 theme kit: THE SALT WORKS (industrial evaporation works, rail yards, kilns). Same conventions as recipes_g2.js: opaque, tiling (g.tile paints at 9 wrapped offsets),
// seeds recorded in ART_BIBLE.md. Palette: salt-white and bone, rust, soot, oxidised-copper teal; the E1 painterly rules (hand-drawn lines, translucent washes, no photo-real noise).
// p5.brush note (ART_BIBLE): narrow or full-size brush rects can crash its scatter: flat opaque areas are drawn with g.solid.
import { R } from './recipes.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const blooms = (g, cols, n, a0, a1, r0, r1) => { g.noStroke(); g.bleed(0.7, 'out'); for (let i = 0; i < n; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(r0, r1), c = pick(g, cols), a = g.rnd(a0, a1); g.tile((dx, dy) => { g.fill(c, a); g.circle(x + dx, y + dy, r); }); } };

export const recipesE2 = {
  // ---- walls ------------------------------------------------------------------------------------------------------------
  wall_saltbrick_a: {                                         // salt-caked brick: the works' boundary walls, kiln stacks, the gatehouse; pale, crusted, rust weeping from the mortar
    seed: 9101, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#4a4638'); g.solid(0, 0, 256, 256, '#4a4638');                                                                                                          // dark mortar shows through the joints
      const rows = 8, rh = 32, joints = [];
      for (let r = 0; r < rows; r++) {
        let x = -(r % 2) * 22 - g.rnd(0, 6);
        while (x < 256) { const w = g.rnd(38, 52), xx = x, rr = r; g.noStroke(); g.bleed(0.12, 'out'); g.tile((dx, dy) => { g.fill(pick(g, ['#b0ac9a', '#bcb8a6', '#a4a090', '#c4c0ae', '#989484']), 255); g.rect(xx + 2 + dx, rr * rh + 2 + dy, w - 4, rh - 4); }); joints.push([xx, rr]); x += w; }
      }
      g.stroke('2B', '#2e2a20', 1.2); for (let r = 0; r <= rows; r++) g.tile((dx, dy) => g.line(dx, r * rh + dy, 256 + dx, r * rh + dy));                       // the courses
      g.stroke('2B', '#2e2a20', 1.0); for (const [x, r] of joints) g.tile((dx, dy) => g.line(x + dx, r * rh + dy, x + dx, r * rh + rh + dy));                       // the head joints
      blooms(g, ['#e8e6da', '#d8d6c8', '#f2f0e6'], 22, 60, 130, 10, 32);                                                                                          // salt efflorescence
      g.stroke('cpencil', '#a8582a', 0.8); for (let i = 0; i < 7; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 200); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(-3, 3) + dx, y + g.rnd(18, 46) + dy)); }   // rust weeping from the joints
      g.stroke('charcoal', '#3a362a', 0.6); for (let i = 0; i < 5; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 220); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(-2, 2) + dx, y + g.rnd(10, 26) + dy)); }          // soot
      g.stroke('cpencil', '#f2f0e6', 0.6); for (let i = 0; i < 26; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(4, 12) + dx, y + g.rnd(-1, 1) + dy)); }          // salt rime on the faces
    }),
  },
  wall_corrugated_a: {                                        // rusted corrugated sheet: pump houses, kennels, the guardhouse, fences; copper-green bloom and long weeping streaks
    seed: 9102, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#6a4a34'); g.solid(0, 0, 256, 256, '#6a4a34');
      const ribs = 16, rw = 16;
      for (let c = 0; c < ribs; c++) g.solid(c * rw, 0, rw, 256, c % 2 ? pick(g, ['#7a5238', '#845a3c', '#6e4a32']) : pick(g, ['#5a3c2a', '#52362a', '#603f2c']));
      blooms(g, ['#8a5a3a', '#4a2e20', '#7a5238'], 16, 40, 90, 8, 24);                                                                                            // mottling over the ribs
      g.stroke('cpencil', '#b88a5a', 0.9); for (let c = 0; c < ribs; c++) g.tile((dx, dy) => g.line(c * rw + 3 + dx, dy, c * rw + 3 + dx, 256 + dy));                // the sheen on each crest
      g.stroke('2B', '#1a0e08', 1.0); for (let c = 0; c < ribs; c++) g.tile((dx, dy) => g.line(c * rw + rw - 1 + dx, dy, c * rw + rw - 1 + dx, 256 + dy));             // the shadow in each trough
      g.stroke('cpencil', '#a8582a', 0.9); for (let i = 0; i < 12; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 180); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(-1, 1) + dx, y + g.rnd(30, 90) + dy)); }   // rust streaks
      blooms(g, ['#3b6a60', '#5a8a78', '#a08a6a'], 14, 40, 100, 10, 30);                                                                                          // oxidised copper, salt
      g.stroke('2B', '#140a06', 1.4); for (const y of [0, 128]) g.tile((dx, dy) => g.line(dx, y + dy, 256 + dx, y + dy));                                       // overlapped seams
      g.stroke('HB', '#c8a878', 0.8); for (const y of [10, 138]) for (let c = 0; c < ribs; c += 2) g.tile((dx, dy) => g.circle(c * rw + rw / 2 + dx, y + dy, 1.6));          // bolt heads
    }),
  },
  // ---- floors -----------------------------------------------------------------------------------------------------------
  floor_saltcrust_a: {                                        // the pans: cracked salt crust, rust stains, shallow brine; the open-air floor of the Works
    seed: 9201, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#98948a'); g.solid(0, 0, 256, 256, '#98948a'); g.noStroke(); g.bleed(0.5, 'out');                                   // mid-tone: the post pass and the exposure lift it, a pale base bleached to white outdoors
      for (let i = 0; i < 40; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(16, 44); g.tile((dx, dy) => { g.fill(pick(g, ['#b8b4a4', '#8a867a', '#c4c0b0', '#9a968a', '#a8a496']), g.rnd(90, 160)); g.circle(x + dx, y + dy, r); }); }
      // the crust: a jittered grid of 6 x 6 plates (wraps, so it tiles); each plate edge is drawn with a chance of being left unbroken
      const N = 6, S = 256 / N, P = []; for (let j = 0; j < N; j++) { P.push([]); for (let i = 0; i < N; i++) P[j].push([i * S + g.rnd(-0.28, 0.28) * S, j * S + g.rnd(-0.28, 0.28) * S]); }
      g.stroke('2B', '#34302a', 1.2);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const [x0, y0] = P[j][i], [x1, y1] = [P[j][(i + 1) % N][0] + (i + 1 === N ? 256 : 0), P[j][(i + 1) % N][1]], [x2, y2] = [P[(j + 1) % N][i][0], P[(j + 1) % N][i][1] + (j + 1 === N ? 256 : 0)];
        if (g.rnd(0, 1) > 0.14) g.tile((dx, dy) => g.line(x0 + dx, y0 + dy, x1 + dx, y1 + dy));
        if (g.rnd(0, 1) > 0.14) g.tile((dx, dy) => g.line(x0 + dx, y0 + dy, x2 + dx, y2 + dy));
      }
      g.stroke('cpencil', '#f2f0e6', 0.7); for (let i = 0; i < 28; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(5, 14) + dx, y + g.rnd(-2, 2) + dy)); }  // salt glitter on the crust
      blooms(g, ['#8a6a4a', '#9a7a56', '#7a5a3a'], 9, 40, 90, 14, 34);                                                                                            // rust and iron stains
      blooms(g, ['#6a8a90', '#7a9aa0'], 5, 60, 110, 16, 30);                                                                                                       // shallow brine
    }),
  },
};
