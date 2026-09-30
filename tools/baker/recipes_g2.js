// Gate 2 production-kit textures: five wall kits, six floor kits, two skies. Same conventions as recipes3d.js:
// opaque, tiling (g.tile paints at 9 wrapped offsets), seeds recorded in ART_BIBLE.md. Palette rules: salt and rust, bell bronze, hush teal.
import { R } from './recipes.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const blooms = (g, cols, n, a0, a1, r0, r1) => { g.noStroke(); g.bleed(0.7, 'out'); for (let i = 0; i < n; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(r0, r1), c = pick(g, cols), a = g.rnd(a0, a1); g.tile((dx, dy) => { g.fill(c, a); g.circle(x + dx, y + dy, r); }); } };

export const recipesG2 = {
  // ---- walls ------------------------------------------------------------------------------------------------------------
  wall_timber_a: {                                            // weathered vertical siding: fishing sheds, cellars
    seed: 7101, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#4a3c30'); g.solid(0, 0, 256, 256, '#4a3c30');
      const n = 8, cw = 256 / n;
      for (let c = 0; c < n; c++) {
        g.noStroke(); g.bleed(0.08, 'out'); const x = c * cw;
        g.tile((dx, dy) => { g.fill(pick(g, ['#5a4838', '#4f4034', '#665240', '#443628']), 255); g.rect(x + 1 + dx, 0 + dy, cw - 2, 256); });
        g.stroke('cpencil', '#2a1e14', 0.7); for (let k = 0; k < 5; k++) { const gx = x + g.rnd(3, cw - 3), gy = g.rnd(0, 200); g.tile((dx, dy) => g.line(gx + dx, gy + dy, gx + g.rnd(-1, 1) + dx, gy + g.rnd(24, 70) + dy)); }
        g.stroke('cpencil', '#8a7458', 0.6); const hx = x + g.rnd(3, cw - 3), hy = g.rnd(0, 220); g.tile((dx, dy) => g.line(hx + dx, hy + dy, hx + dx, hy + 30 + dy));
      }
      g.stroke('2B', '#140e08', 1.2); for (let c = 0; c <= n; c++) g.tile((dx, dy) => g.line(c * cw + dx, dy, c * cw + dx, 256 + dy));
      g.stroke('HB', '#a89a80', 0.7); for (let c = 0; c < n; c++) for (const y of [24, 128, 232]) g.tile((dx, dy) => g.circle(c * cw + cw / 2 + dx, y + dy, 1.4));     // nail heads
      blooms(g, ['#1a120a', '#2a3a3a', '#6a7a70'], 12, 40, 90, 20, 46);                        // damp, salt
    }),
  },
  wall_plaster_a: {                                           // institutional plaster: cream above, green wainscot below (Customs Hall, Signal House)
    seed: 7201, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#c8bfa0'); g.solid(0, 0, 256, 256, '#c8bfa0'); g.solid(0, 150, 256, 106, '#3f5a4a');
      g.noStroke(); g.bleed(0.4, 'out');
      for (let i = 0; i < 24; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 140), r = g.rnd(20, 50); g.tile((dx, dy) => { g.fill(pick(g, ['#d8cfb0', '#b8ae90', '#a89e80']), g.rnd(60, 120)); g.circle(x + dx, y + dy, r); }); }
      for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(150, 256), r = g.rnd(20, 44); g.tile((dx, dy) => { g.fill(pick(g, ['#34503f', '#4a6a56', '#2c4436']), g.rnd(60, 120)); g.circle(x + dx, y + dy, r); }); }
      g.stroke('2B', '#20301f', 1.6); g.tile((dx, dy) => g.line(dx, 150 + dy, 256 + dx, 150 + dy));                                     // the rail
      g.stroke('cpencil', '#e8dfc4', 0.9); g.tile((dx, dy) => g.line(dx, 146 + dy, 256 + dx, 146 + dy));
      g.stroke('charcoal', '#3a3020', 0.8); for (let i = 0; i < 9; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 100); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(-3, 3) + dx, y + g.rnd(20, 60) + dy)); }      // water stains
      g.stroke('cpencil', '#6a8a76', 0.6); for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(160, 250); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(8, 20) + dx, y + dy)); }
      g.stroke('2B', '#4a4030', 0.9); const cx = g.rnd(20, 230), cy = g.rnd(20, 100); g.tile((dx, dy) => { g.line(cx + dx, cy + dy, cx + 14 + dx, cy + 9 + dy); g.line(cx + 14 + dx, cy + 9 + dy, cx + 10 + dx, cy + 24 + dy); });          // a crack
    }),
  },
  wall_concrete_a: {                                          // poured concrete: ferry terminal, signal house exterior
    seed: 7301, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#6a6c68'); g.solid(0, 0, 256, 256, '#6a6c68'); g.noStroke(); g.bleed(0.3, 'out');
      for (let i = 0; i < 40; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(14, 44); g.tile((dx, dy) => { g.fill(pick(g, ['#7a7c76', '#585a56', '#84867e', '#4e504c']), g.rnd(50, 110)); g.circle(x + dx, y + dy, r); }); }
      g.stroke('2B', '#26282a', 1.3); for (let r = 0; r <= 2; r++) g.tile((dx, dy) => g.line(dx, r * 128 + dy, 256 + dx, r * 128 + dy)); g.tile((dx, dy) => { g.line(dx, dy, dx, 256 + dy); g.line(128 + dx, dy, 128 + dx, 256 + dy); });    // form joints
      g.stroke('HB', '#2a2c2e', 0.9); for (const x of [40, 88, 168, 216]) for (const y of [32, 96, 160, 224]) g.tile((dx, dy) => g.circle(x + dx, y + dy, 2));                                      // tie holes
      g.stroke('charcoal', '#22201e', 0.8); for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 200); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(-2, 2) + dx, y + g.rnd(30, 80) + dy)); }
      g.stroke('cpencil', '#a8582a', 0.8); for (let i = 0; i < 8; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 220); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(-1, 1) + dx, y + g.rnd(14, 36) + dy)); }                      // rust weeping from rebar
      g.stroke('cpencil', '#a0b8b0', 0.6); for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(3, 8) + dx, y + dy)); }
    }),
  },
  wall_iron_a: {                                              // riveted iron plate: ferry, gantries, signal house
    seed: 7401, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3a3f44'); g.solid(0, 0, 256, 256, '#3a3f44'); g.noStroke(); g.bleed(0.2, 'out');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) g.tile((dx, dy) => { g.fill(pick(g, ['#454b50', '#3a4045', '#4c5358', '#31373c']), 255); g.rect(c * 128 + 3 + dx, r * 128 + 3 + dy, 122, 122); });
      g.stroke('2B', '#0e1214', 1.5); g.tile((dx, dy) => { g.line(dx, dy, 256 + dx, dy); g.line(dx, 128 + dy, 256 + dx, 128 + dy); g.line(dx, dy, dx, 256 + dy); g.line(128 + dx, dy, 128 + dx, 256 + dy); });
      g.stroke('HB', '#8a949a', 0.9); for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) for (const [ox, oy] of [[10, 10], [64, 10], [118, 10], [10, 64], [118, 64], [10, 118], [64, 118], [118, 118]]) g.tile((dx, dy) => g.circle(c * 128 + ox + dx, r * 128 + oy + dy, 2.4));
      blooms(g, ['#a8582a', '#7a3a1a', '#c9743a'], 26, 60, 130, 10, 30);                          // rust bloom
      g.stroke('cpencil', '#a8582a', 0.8); for (let i = 0; i < 18; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 200); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(-1, 1) + dx, y + g.rnd(16, 60) + dy)); }
      g.stroke('cpencil', '#9fb0b0', 0.6); for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(4, 10) + dx, y + dy)); }
    }),
  },
  wall_resin_a: {                                             // Vael resin: crystalline growth, teal-violet, veined and faintly luminous
    seed: 7501, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3a2a55'); g.solid(0, 0, 256, 256, '#3a2a55'); g.noStroke(); g.bleed(0.5, 'out');
      for (let i = 0; i < 34; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(22, 60); g.tile((dx, dy) => { g.fill(pick(g, ['#4a3a75', '#2a1e45', '#5a4a8a', '#1e3a4a', '#356a78']), g.rnd(70, 150)); g.circle(x + dx, y + dy, r); }); }
      g.stroke('HB', '#3fffe0', 0.9); for (let i = 0; i < 16; i++) { let x = g.rnd(0, 256), y = g.rnd(0, 256); for (let k = 0; k < 5; k++) { const nx = x + g.rnd(-24, 24), ny = y + g.rnd(8, 30), ax = x, ay = y; g.tile((dx, dy) => g.line(ax + dx, ay + dy, nx + dx, ny + dy)); x = nx; y = ny; } }
      g.stroke('2B', '#140a24', 1.0); for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), l = g.rnd(10, 28); g.tile((dx, dy) => { g.line(x + dx, y + dy, x + l + dx, y + g.rnd(-8, 8) + dy); }); }        // facets
      g.noStroke(); g.bleed(0.2, 'in'); for (let i = 0; i < 26; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => { g.fill('#c8fff0', 170); g.circle(x + dx, y + dy, g.rnd(1.6, 3.4)); }); }
    }),
  },

  // ---- floors -----------------------------------------------------------------------------------------------------------
  floor_tile_a: {                                             // black and cream checker: Customs Hall, Signal House
    seed: 7601, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2a2a2c'); g.solid(0, 0, 256, 256, '#2a2a2c'); g.noStroke(); g.bleed(0.08, 'out');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const light = (r + c) % 2 === 0; g.tile((dx, dy) => { g.fill(light ? pick(g, ['#c8bfa0', '#bdb496', '#d2c9aa']) : pick(g, ['#232426', '#2c2d30', '#1c1d20']), 255); g.rect(c * 64 + 1.5 + dx, r * 64 + 1.5 + dy, 61, 61); }); }
      g.stroke('2B', '#0c0c0e', 1.3); for (let i = 0; i <= 4; i++) g.tile((dx, dy) => { g.line(i * 64 + dx, dy, i * 64 + dx, 256 + dy); g.line(dx, i * 64 + dy, 256 + dx, i * 64 + dy); });
      g.stroke('charcoal', '#3a3428', 0.8); for (let i = 0; i < 10; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => { g.line(x + dx, y + dy, x + g.rnd(8, 22) + dx, y + g.rnd(-6, 6) + dy); }); }    // cracks
      blooms(g, ['#5a5a48', '#3a4a4a', '#6a5a3a'], 14, 40, 90, 20, 44);                          // grime
    }),
  },
  floor_grate_a: {                                            // iron grating over black water
    seed: 7701, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#0a1214'); g.solid(0, 0, 256, 256, '#0a1214'); g.noStroke(); g.bleed(0.1, 'out');
      for (let i = 0; i < 6; i++) { g.fill('#12242a', g.rnd(120, 200)); g.tile((dx, dy) => g.circle(g.rnd(0, 256) + dx, g.rnd(0, 256) + dy, g.rnd(20, 50))); }
      g.stroke('2B', '#4a5258', 2.2); for (let i = 0; i < 16; i++) g.tile((dx, dy) => g.line(i * 16 + 4 + dx, dy, i * 16 + 4 + dx, 256 + dy));
      g.stroke('2B', '#3a4248', 1.6); for (let i = 0; i < 4; i++) g.tile((dx, dy) => g.line(dx, i * 64 + 8 + dy, 256 + dx, i * 64 + 8 + dy));
      g.stroke('cpencil', '#8a949a', 0.8); for (let i = 0; i < 16; i++) g.tile((dx, dy) => g.line(i * 16 + 3 + dx, dy, i * 16 + 3 + dx, 256 + dy));
      blooms(g, ['#a8582a', '#7a3a1a'], 14, 60, 120, 8, 22);
    }),
  },
  floor_carpet_a: {                                           // worn red-brown runner carpet: signal house, warden's rooms
    seed: 7801, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#5a2a26'); g.solid(0, 0, 256, 256, '#5a2a26'); g.noStroke(); g.bleed(0.4, 'out');
      for (let i = 0; i < 40; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(16, 40); g.tile((dx, dy) => { g.fill(pick(g, ['#6a3430', '#4a2220', '#7a423a', '#3a1a18']), g.rnd(60, 120)); g.circle(x + dx, y + dy, r); }); }
      g.stroke('cpencil', '#c9a44c', 1.0); for (const y of [20, 236]) g.tile((dx, dy) => g.line(dx, y + dy, 256 + dx, y + dy));
      g.stroke('cpencil', '#8a5a3a', 0.8); for (let i = 0; i < 8; i++) g.tile((dx, dy) => { g.circle(16 + i * 32 + dx, 128 + dy, 5); });
      g.stroke('cpencil', '#3a1a18', 0.7); for (let i = 0; i < 80; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(-3, 3) + dx, y + g.rnd(3, 8) + dy)); }
      blooms(g, ['#241010', '#3a2a1a'], 10, 60, 120, 16, 34);
    }),
  },
  floor_flag_a: {                                             // indoor flagstones: cellars, the lighthouse cellar
    seed: 7901, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2a2c2c'); g.solid(0, 0, 256, 256, '#2a2c2c');
      const rows = [[0, 3], [85, 4], [170, 3]];
      for (const [y0, per] of rows) for (let c = 0; c < per; c++) { const w = 256 / per, x = c * w + g.rnd(-3, 3); g.noStroke(); g.bleed(0.1, 'out'); g.tile((dx, dy) => { g.fill(pick(g, ['#4a4e50', '#3f4446', '#545a5a', '#454a4c']), 255); g.rect(x + 2 + dx, y0 + 2 + dy, w - 4, 81); }); }
      g.stroke('2B', '#0e1010', 1.4); for (const [y0] of rows) g.tile((dx, dy) => g.line(dx, y0 + dy, 256 + dx, y0 + dy));
      for (const [y0, per] of rows) for (let c = 0; c < per; c++) g.tile((dx, dy) => g.line(c * (256 / per) + dx, y0 + dy, c * (256 / per) + dx, y0 + 85 + dy));
      g.stroke('cpencil', '#7a8484', 0.7); for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(6, 18) + dx, y + dy)); }
      blooms(g, ['#3b6a78', '#2a4a3a', '#4a6a3a'], 14, 50, 110, 20, 44);                          // damp, moss
    }),
  },
  floor_silt_a: {                                             // wet silt and mud: drained market gutters, Ferry Terminal apron
    seed: 8001, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3a3226'); g.solid(0, 0, 256, 256, '#3a3226'); g.noStroke(); g.bleed(0.6, 'out');
      for (let i = 0; i < 46; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(16, 46); g.tile((dx, dy) => { g.fill(pick(g, ['#4a4030', '#2a241a', '#544a38', '#332c20', '#3b4a48']), g.rnd(70, 140)); g.circle(x + dx, y + dy, r); }); }
      g.stroke('cpencil', '#6a6a58', 0.7); for (let i = 0; i < 40; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(6, 20) + dx, y + g.rnd(-2, 2) + dy)); }   // drag lines
      g.stroke('2B', '#14100a', 0.8); for (let i = 0; i < 30; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.circle(x + dx, y + dy, g.rnd(1.2, 2.6))); }                                  // pebbles
      blooms(g, ['#3b7a80', '#5a8a90'], 8, 60, 120, 20, 40);                                       // standing water
    }),
  },
  floor_slate_a: {                                            // outdoor slate flags: hill streets, terraces, the ferry deck
    seed: 8101, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2a2e36'); g.solid(0, 0, 256, 256, '#2a2e36');
      const rows = 4, rh = 64;
      for (let r = 0; r < rows; r++) { let x = -g.rnd(0, 60); while (x < 256) { const w = g.rnd(56, 100); g.noStroke(); g.bleed(0.1, 'out'); const xx = x, rr = r; g.tile((dx, dy) => { g.fill(pick(g, ['#3a4048', '#444b54', '#333a42', '#4c5560']), 255); g.rect(xx + 2 + dx, rr * rh + 2 + dy, w - 4, rh - 4); }); g.stroke('2B', '#0c0e12', 1.3); g.tile((dx, dy) => g.line(xx + dx, rr * rh + dy, xx + dx, rr * rh + rh + dy)); x += w; } g.stroke('2B', '#0c0e12', 1.3); g.tile((dx, dy) => g.line(dx, r * rh + dy, 256 + dx, r * rh + dy)); }
      g.stroke('cpencil', '#7a8896', 0.7); for (let i = 0; i < 24; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(6, 16) + dx, y + dy)); }
      blooms(g, ['#3b6a78', '#4a6a3a'], 14, 50, 110, 18, 40);
    }),
  },

  // ---- skies ------------------------------------------------------------------------------------------------------------
  sky_night: {                                                // the Hush by night: indigo, faint teal aurora, cold stars
    seed: 8201, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.noStroke(); g.bleed(0.8, 'out');
      ['#04060f', '#080b1c', '#0e1230', '#161a44', '#1c2a58', '#243a66', '#2e4a6a'].forEach((c, i) => { g.fill(c, 250); g.rect(-10, i * 40 - 10, w + 20, 56); });
      for (let i = 0; i < 22; i++) { const x = g.rnd(0, w), y = g.rnd(20, 200), r = g.rnd(30, 80); g.tile((dx) => { g.fill(pick(g, ['#0e1230', '#1c2a58', '#2a5a70', '#3fffe0']), g.rnd(24, 70)); g.circle(x + dx, y, r); }); }
      g.stroke('marker', '#3fffe0', 1.6); for (let i = 0; i < 5; i++) { const y = 50 + i * 14, d = g.rnd(-24, 24); g.line(0, y, w, y + d); }
      g.stroke('marker', '#8affea', 0.9); for (let i = 0; i < 3; i++) { const y = 56 + i * 20, d = g.rnd(-16, 16); g.line(0, y, w, y + d); }
      g.noStroke(); g.fill('#e8fff8', 240); for (let i = 0; i < 90; i++) g.circle(g.rnd(0, w), g.rnd(4, 120), g.rnd(0.5, 1.5));
    }),
  },
  sky_overcast: {                                             // low fog-bound cloud, grey-lilac: hill streets in the morning after
    seed: 8301, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.noStroke(); g.bleed(0.9, 'out');
      ['#5a5a70', '#6a6a80', '#7a7a90', '#8a8a9c', '#9a98a8', '#aaa8b4', '#bab6bc'].forEach((c, i) => { g.fill(c, 250); g.rect(-10, i * 40 - 10, w + 20, 56); });
      for (let i = 0; i < 34; i++) { const x = g.rnd(0, w), y = g.rnd(10, 230), r = g.rnd(34, 90); g.tile((dx) => { g.fill(pick(g, ['#4a4a60', '#8a8aa0', '#b8b4c0', '#6a5a70']), g.rnd(50, 110)); g.circle(x + dx, y, r); }); }
      g.stroke('marker', '#9ad8c8', 0.9); for (let i = 0; i < 3; i++) { const y = 30 + i * 9, d = g.rnd(-12, 12); g.line(0, y, w, y + d); }
    }),
  },
};
