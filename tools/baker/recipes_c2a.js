// Campaign 2, Act A (THRESHOLD) materials (PT-037): the world the Gate opens onto, Anselm-Nine, dying and quiet. Bleached glass and salt and rust under a low red sun; the Vael appear as shapes first. Six walls (fused glass crust, rusted salt plate, basalt
// bastion, ivory bone-coral lattice, cold reliquary stone, pale ribbed chitin), four floors (glass sand, basalt flags, terrace turf, aqueduct chitin) and `sky_anselm`. Same conventions as recipes_e4b.js: opaque, tiling (g.tile paints at 9 wrapped offsets), top-left
// px, big shapes and strong value steps first (the game renders at about 480 px wide and bands the value); the sky is 512 x 256 (zenith at the TOP, horizon at the bottom) and uses plain p5 ellipses and solid rows (a brush fill in the hundreds hangs the baker).
import { R } from './recipes.js';
import { hex, mix } from './paint_util.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };
const wash = (g, x, y, w, h, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.rect(x + dx - g.p.width / 2, y + dy - g.p.height / 2, w, h); g.p.pop(); });
const blot = (g, x, y, d, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, d, d); g.p.pop(); });
const oval = (g, x, y, rw, rh, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, rw, rh); g.p.pop(); });
const skyBlot = (g, x, y, rw, rh, c, a) => g.tile((dx, dy) => { if (dy) return; g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y - g.p.height / 2, rw, rh); g.p.pop(); });
const ink = (g, x1, y1, x2, y2, c, wt, a = 255) => g.tile((dx, dy) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 + dx - g.p.width / 2, y1 + dy - g.p.height / 2, x2 + dx - g.p.width / 2, y2 + dy - g.p.height / 2); g.p.pop(); });
const gradient = (g, w, h, stops) => { for (let y = 0; y < h; y += 2) { const t = y / h; let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++; const [t0, c0] = stops[i], [t1, c1] = stops[i + 1], k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1))); g.solid(0, y, w, 2.5, mix(c0, c1, k)); } };

export const recipesC2a = {
  // ---- fused glass crust: slabs of pale aqua glass cooled over salt, hair cracks, rust seeping down from the seams, bubbles caught in it, a white bloom of salt at the foot ------------------------------------------------------------------
  wall_glasscrust_a: {
    seed: 9501, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#8fb0a8'); g.solid(0, 0, 256, 256, '#8fb0a8');
      for (let i = 0; i < 16; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(50, 120), pick(g, ['#a8cac0', '#7a9c94', '#bad8ce', '#6c8c86']), 150);                       // slabs of tone
      for (let i = 0; i < 12; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 200); ink(g, x, y, x + g.rnd(-60, 60), y + g.rnd(30, 90), '#2a4844', g.rnd(1.4, 3), 190); }                // hair cracks
      for (let i = 0; i < 9; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 150); ink(g, x, y, x + g.rnd(-3, 3), y + g.rnd(40, 100), '#b46a36', g.rnd(2, 4.5), 170); }                // rust seeping from the seams
      for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), d = g.rnd(6, 15); blot(g, x, y, d, '#1c3430', 130); blot(g, x - d * 0.12, y - d * 0.12, d * 0.7, '#dcf0ea', 190); }    // bubbles
      wash(g, 0, 224, 256, 32, '#eceee4', 110); for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(214, 256), g.rnd(2, 6), '#ffffff', g.rnd(90, 200));                              // the salt bloom
      for (let k = 0; k < 4; k++) wash(g, 0, k * 64, 256, 2.5, '#e4f6f0', 70);                                                                                                            // the seams between slabs catch the light
    }),
  },
  // ---- a rusted salt plate: four riveted plates, rust in three oranges, a crust of white salt dried down from the top edge of each ------------------------------------------------------------------------------------------------------
  wall_saltplate_a: {
    seed: 9502, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#7a4a2e'); g.solid(0, 0, 256, 256, '#7a4a2e');
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { g.solid(x, y, 128, 128, pick(g, ['#8a502e', '#7a4628', '#94582f'])); g.solid(x, y, 128, 4, '#2c1608'); g.solid(x, y + 4, 128, 2, '#c8803a'); g.solid(x, y, 4, 128, '#2c1608'); }
      for (let i = 0; i < 26; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 46), pick(g, ['#a8582e', '#6a3a22', '#c8743a', '#5a3018']), 140);
      for (let i = 0; i < 22; i++) { const x = g.rnd(6, 250), y0 = Math.floor(g.rnd(0, 2)) * 128 + 6; ink(g, x, y0, x + g.rnd(-3, 3), y0 + g.rnd(20, 100), '#f0eee4', g.rnd(1.6, 4.4), 160); }              // salt dried down from each plate's top edge
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) for (let k = 0; k < 6; k++) { blot(g, x + 10 + k * 21, y + 12, 7, '#2a1408', 255); blot(g, x + 9 + k * 21, y + 11, 3, '#e8a070', 210); }          // rivets
    }),
  },
  // ---- the bastion: courses of black basalt blocks, bronze studs, a little lichen where it is damp, the top edge of every block lit ----------------------------------------------------------------------------------------------------------------
  wall_basalt_a: {
    seed: 9503, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#1c1c22'); g.solid(0, 0, 256, 256, '#1c1c22');
      for (let r = 0; r < 3; r++) {
        const y = Math.round(r * 85.3), h = 85, off = r % 2 ? 42 : 0;
        for (let c = -1; c < 4; c++) { const x = c * 85 + off; g.solid(x + 2, y + 2, 81, h - 3, pick(g, ['#34343c', '#26262e', '#3e3e48', '#2c2c36'])); g.solid(x + 2, y + 2, 81, 4, '#5e5e72'); g.solid(x + 2, y + h - 4, 81, 3, '#0e0e12'); }
      }
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(10, 30), pick(g, ['#5a6a3e', '#44502e']), 100);                                                         // lichen
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const bx = c * 85 + 42 + (r % 2 ? 42 : 0), by = r * 85 + 44; blot(g, bx, by, 7, '#2a1c08', 255); blot(g, bx - 1, by - 1, 3, '#d8a050', 220); }   // a bronze stud in each block
      for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-14, 14), y + g.rnd(8, 30), '#101016', g.rnd(1, 2.2), 180); }
    }),
  },
  // ---- bone-coral: a Vael wall, ivory, grown as a lattice: staggered rows of rounded holes with a bright rim, cream and ochre veining -------------------------------------------------------------------------------------------------------------
  wall_bonecoral_a: {
    seed: 9504, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#d4caa8'); g.solid(0, 0, 256, 256, '#d4caa8');
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 100), pick(g, ['#e2dab8', '#c2b890', '#d8c8a0', '#e8e0c4']), 130);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const x = c * 32 + (r % 2 ? 16 : 0) + 16, y = r * 32 + 16 + (c % 2 ? 6 : -6); oval(g, x, y, 15, 30, '#f2ecd6', 255); oval(g, x + 1, y, 6, 23, '#4a3c26', 255); oval(g, x + 1, y + 5, 4, 12, '#2a2016', 255);      // a slot in the lattice, narrow, in a lit rim
      }
      for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-30, 30), y + g.rnd(10, 40), '#a8986c', g.rnd(1.2, 2.6), 160); }
      for (let i = 0; i < 24; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 5), '#fff8e0', g.rnd(100, 200));
    }),
  },
  // ---- reliquary stone: cold grey-violet blocks, each cut with a recessed arch and a rib in relief; a worn bronze plate under each arch ---------------------------------------------------------------------------------------------------------------
  wall_reliquary_a: {
    seed: 9505, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#5e5e6c'); g.solid(0, 0, 256, 256, '#5e5e6c');
      for (let i = 0; i < 16; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 100), pick(g, ['#6c6c7c', '#52525e', '#76768a', '#4a4a58']), 130);
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) {
        g.solid(x, y, 128, 3, '#1a1a22'); g.solid(x, y, 3, 128, '#1a1a22'); g.solid(x + 3, y + 3, 125, 2, '#9494aa');
        g.solid(x + 30, y + 40, 68, 88, '#34343f'); oval(g, x + 64, y + 40, 68, 66, '#34343f', 255);                                                                                   // the arch's recess
        g.solid(x + 36, y + 46, 56, 82, '#262630'); oval(g, x + 64, y + 46, 56, 54, '#262630', 255);
        for (let k = 0; k < 4; k++) ink(g, x + 64, y + 22, x + 64 + (k - 1.5) * 24, y + 126, '#8a8aa0', 2, 150);                                                                       // ribs in relief
        g.solid(x + 46, y + 100, 36, 14, '#8a6a30'); g.solid(x + 48, y + 102, 32, 3, '#d8b058');                                                                                       // a worn bronze plate
      }
      for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-6, 6), y + g.rnd(10, 40), '#1c1c24', g.rnd(1, 2.4), 170); }
    }),
  },
  // ---- pale chitin: the aqueduct's wall, bands of ribbed shell, each lit at the top and dark at the foot, a gloss streak, seams in teal-black -----------------------------------------------------------------------------------------------------
  wall_chitin_a: {
    seed: 9506, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#6e8e68'); g.solid(0, 0, 256, 256, '#6e8e68');
      for (let b = 0; b < 8; b++) {
        const y = b * 32, top = mix('#d4ecc4', '#b4d4a4', (b % 3) / 3), bot = mix('#5e7e5a', '#46624a', (b % 2) / 2);
        for (let k = 0; k < 8; k++) g.solid(0, y + k * 4, 256, 4.5, mix(top, bot, k / 7)); g.solid(0, y, 256, 3, '#1c2c24'); g.solid(0, y + 3, 256, 2, '#e8f8dc');
      }
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(20, 60), pick(g, ['#8cb480', '#486648']), 100);
      for (let i = 0; i < 9; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 220); ink(g, x, y, x + g.rnd(-6, 6), y + g.rnd(20, 60), '#f4fff0', g.rnd(1.6, 3.4), 150); }                                   // the gloss
      for (let i = 0; i < 6; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 230); ink(g, x, y, x + g.rnd(-4, 4), y + g.rnd(10, 26), '#0e2a2a', g.rnd(1, 2), 170); }
    }),
  },
  // ---- glass sand: pale gold, ripples, and a scatter of bright shards; some of them aqua ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  floor_glasssand_a: {
    seed: 9511, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#d4bc8c'); g.solid(0, 0, 256, 256, '#d4bc8c');
      for (let i = 0; i < 22; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 100), pick(g, ['#c8b07e', '#e2cc9c', '#b8a070', '#dcc490']), 130);
      for (let i = 0; i < 14; i++) { const y = g.rnd(0, 256), x = g.rnd(0, 256); ink(g, x, y, x + g.rnd(40, 100), y + g.rnd(-6, 6), '#a89060', g.rnd(1.4, 2.6), 140); ink(g, x, y - 2, x + g.rnd(40, 90), y - 2 + g.rnd(-5, 5), '#f0e0b4', 1.4, 120); }       // ripples
      for (let i = 0; i < 46; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), a = g.rnd(0, 6.28), l = g.rnd(4, 11); ink(g, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, pick(g, ['#f6fff8', '#9ae4d6', '#e0f4ec']), g.rnd(1.2, 2.4), g.rnd(150, 240)); }  // shards
    }),
  },
  // ---- basalt flags: a courtyard floor of black stone slabs, mortar lines, damp at the seams ---------------------------------------------------------------------------------------------------------------------------------------------------------
  floor_basaltflag_a: {
    seed: 9512, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#14141a'); g.solid(0, 0, 256, 256, '#14141a');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64, y = r * 64; g.solid(x + 2, y + 2, 60, 60, pick(g, ['#32323c', '#282832', '#3a3a46', '#2e2e38'])); g.solid(x + 2, y + 2, 60, 3, '#56566a'); g.solid(x + 2, y + 2, 3, 60, '#46465a'); }
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(10, 30), pick(g, ['#4a5a38', '#3a4630']), 80);
      for (let i = 0; i < 22; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-12, 12), y + g.rnd(6, 24), '#0a0a0e', g.rnd(1, 2), 180); }
    }),
  },
  // ---- terrace turf: the fields' dry vine and stubble in rows, tan and olive, a dark line of soil between rows -----------------------------------------------------------------------------------------------------------------------------------------
  floor_terrace_a: {
    seed: 9513, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#a89a58'); g.solid(0, 0, 256, 256, '#a89a58');
      for (let r = 0; r < 8; r++) { const y = r * 32; g.solid(0, y, 256, 26, pick(g, ['#a89a58', '#b4a664', '#9a8c4e'])); g.solid(0, y + 26, 256, 6, '#3c3018'); g.solid(0, y + 24, 256, 2, '#6a5a2a'); }
      for (let i = 0; i < 150; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-2, 2), y - g.rnd(4, 10), pick(g, ['#d8c878', '#7a8a3c', '#c0ae64', '#5a6a2c']), g.rnd(1, 2), 190); }       // stubble
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 40), pick(g, ['#c8b878', '#8a7c42']), 90);
    }),
  },
  // ---- aqueduct chitin: pale green-white ribs across the channel, teal stain where the water stands, a gloss line down the middle --------------------------------------------------------------------------------------------------------------
  floor_chitin_a: {
    seed: 9514, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#9cbcb0'); g.solid(0, 0, 256, 256, '#9cbcb0');
      for (let r = 0; r < 8; r++) { const y = r * 32; for (let k = 0; k < 8; k++) g.solid(0, y + k * 4, 256, 4.5, mix('#c8e4d4', '#7a9c90', k / 7)); g.solid(0, y, 256, 3, '#1e3a34'); g.solid(0, y + 3, 256, 2, '#eefaf0'); }
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(20, 60), pick(g, ['#5a8a84', '#488078', '#76a69c']), 90);
      ink(g, 128, 0, 128, 256, '#f4fff4', 4, 90);
    }),
  },
  // ---- the sky of Anselm-Nine: a rose-violet zenith falling to a pale amber glare at the horizon, a huge red sun low on one side, long streaks of glass-dust cloud, a few cold stars, and thin dark spires on the far horizon: the Vael, as shapes first -----------------
  sky_anselm: {
    seed: 9515, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#c08a68'); gradient(g, w, h, [[0, '#241630'], [0.35, '#4a2a44'], [0.62, '#9a4a56'], [0.82, '#dc8860'], [0.94, '#f2c08a'], [1, '#f6d6a4']]);
      for (let i = 0; i < 60; i++) { const d = g.rnd(1.1, 2.4); skyBlot(g, g.rnd(0, w), g.rnd(0, 110), d, d, pick(g, ['#fff2e0', '#e8d8ff']), g.rnd(110, 220)); }                                        // cold stars, high
      for (let i = 0; i < 16; i++) { const y = g.rnd(90, 230), x = g.rnd(0, w); skyBlot(g, x, y, g.rnd(120, 280), g.rnd(5, 12), pick(g, ['#e8a07a', '#c8707a', '#f4c496']), g.rnd(40, 90)); }                    // streaks of glass-dust cloud
      skyBlot(g, 150, 244, 260, 130, '#ff6a40', 46); skyBlot(g, 150, 246, 150, 76, '#ff7a48', 80); skyBlot(g, 150, 248, 76, 40, '#ffa064', 150); skyBlot(g, 150, 250, 36, 20, '#ffd0a0', 230);               // the sun, low and huge
      for (const [x, hh, wt] of [[330, 40, 4], [346, 64, 3], [352, 30, 3], [372, 88, 3.4], [388, 36, 4], [404, 52, 3], [470, 46, 3], [492, 70, 3.4], [60, 34, 3]]) { ink(g, x, 256, x, 256 - hh, '#3c2438', wt, 220); ink(g, x + 0.6, 256 - hh, x + 0.6, 256 - hh - 8, '#3c2438', 1.2, 200); }   // spires, far off, dark against the glare
      g.solid(0, 250, w, 6, '#4a2c3c');                                                                                                                                                              // the far ground
    }),
  },
};
