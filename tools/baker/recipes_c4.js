// Campaign 2, Act D (THE ROOT BELL) materials (PT-043, the Preview): the bottom of Anselm-Nine, where the roots of the world come down to the thing they hang. Six walls and six floors, one pair for each place of the act, and three skies.
// Same conventions and helpers as recipes_c3.js. The colours are the Root's own: wet black, copper going green, pale dead moss, bronze, and at the very end a white that has lost its light.
import { R } from './recipes.js';
import { pick, wash, blot, oval, skyBlot, gradient, ink, vein } from './recipes_c3.js';

export const recipesC4 = {
  // ---- the descent (C2M25): the wall of a well, black wet stone in courses with a thick root crawling through the joints, and from every joint a streak of green-copper seep running down ------------------------------------------------------------------------------
  wall_rootwell_a: {
    seed: 9801, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#1a1c1c'); g.solid(0, 0, 256, 256, '#1a1c1c');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2 ? 32 : 0), y = r * 64; g.solid(x + 2, y + 2, 60, 60, pick(g, ['#2a2e2e', '#222626', '#323636', '#1c2020'])); g.solid(x + 2, y + 2, 60, 3, '#5a6262'); g.solid(x + 2, y + 58, 60, 4, '#0a0c0c'); }
      for (let i = 0; i < 6; i++) vein(g, g.rnd(0, 256), g.rnd(0, 256), 7, '#12100e', '#5a4026', g.rnd(4, 7), g.rnd(-0.5, 0.5), 1, 12);                       // roots in the joints: black cords with a brown glint
      for (let i = 0; i < 16; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 200); ink(g, x, y, x + g.rnd(-2, 2), y + g.rnd(30, 90), pick(g, ['#4a8a6a', '#3a7a58', '#6aa07a']), g.rnd(1.6, 3.2), 150); }       // verdigris seep
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(20, 60), '#060808', 90);
    }),
  },
  // ---- the silent roots (C2M26): the wall is wood: tall columns of root and bark pressed together, brown-black, fibred along their length, with pale dead moss in the hollows between and nothing living on it --------------------------------------------------------------------
  wall_rootbark_a: {
    seed: 9802, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2a2018'); g.solid(0, 0, 256, 256, '#2a2018');
      for (let k = 0; k < 6; k++) { const x = k * 43 + g.rnd(-3, 3); g.solid(x, 0, 43, 256, pick(g, ['#3a2c20', '#2e241a', '#44342a', '#241a12'])); g.solid(x + 4, 0, 3, 256, '#6a5440'); g.solid(x + 37, 0, 6, 256, '#0e0a06'); for (let i = 0; i < 5; i++) { const xx = x + g.rnd(8, 34); ink(g, xx, 0, xx + g.rnd(-6, 6), 256, pick(g, ['#1a120c', '#54402e']), g.rnd(1, 2), 150); } }
      for (let i = 0; i < 18; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); oval(g, x, y, g.rnd(10, 26), g.rnd(6, 14), pick(g, ['#c8c4a8', '#b4b094', '#d8d4b8']), g.rnd(110, 190)); }                 // dead moss
      for (let i = 0; i < 10; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-12, 12), y + g.rnd(10, 40), '#0a0604', g.rnd(1.6, 3.4), 200); }
    }),
  },
  // ---- the fault (C2M27): basalt split in slabs along a long crack: dark brown-grey slabs with a bright lip, and in every seam between them a line of copper glow, hotter in the middle of a seam than at its ends -------------------------------------------------------------------------
  wall_fault_a: {
    seed: 9803, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2e2622'); g.solid(0, 0, 256, 256, '#2e2622');
      for (let r = 0; r < 4; r++) { const y = r * 64 + g.rnd(-3, 3); for (let c = 0; c < 3; c++) { const x = c * 86 + (r % 2 ? 40 : 0) + g.rnd(-4, 4), w = g.rnd(66, 92); g.solid(x, y + 6, w, 52, pick(g, ['#463a34', '#3a302a', '#52443c', '#34292a'])); g.solid(x, y + 6, w, 3, '#8a7868'); g.solid(x, y + 52, w, 6, '#120c0a'); } }
      for (let r = 0; r < 4; r++) { const y = r * 64 + 60; g.solid(0, y, 256, 5, '#1a0c06'); g.solid(0, y + 1, 256, 2.4, '#ff8a2a'); ink(g, 0, y + 2, 256, y + 2, '#ffd890', 1, 200); }
      for (let i = 0; i < 8; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-8, 8), y + g.rnd(14, 44), '#ff8a2a', g.rnd(1.2, 2.2), 190); }
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 40), '#0e0806', 90);
    }),
  },
  // ---- the last tide (C2M28): the wall of a round dock: large dark stone blocks stained rust-brown from the iron, a white lime line where the tide stands, below it green weed and a few barnacles, above it dry stone and a mooring ring or two ---------------------------------------------------
  wall_tidestone_a: {
    seed: 9804, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3a3a38'); g.solid(0, 0, 256, 256, '#3a3a38');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2 ? 32 : 0), y = r * 64; g.solid(x + 2, y + 2, 60, 60, pick(g, ['#4a4a46', '#42423e', '#545450', '#383836'])); g.solid(x + 2, y + 2, 60, 3, '#7c7c74'); g.solid(x + 2, y + 58, 60, 4, '#121210'); }
      for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 140); ink(g, x, y, x + g.rnd(-3, 3), y + g.rnd(30, 90), pick(g, ['#8a4a2a', '#7a3e22', '#a05a30']), g.rnd(2, 5), 120); }              // rust runs
      g.solid(0, 140, 256, 7, '#e0dccc'); g.solid(0, 147, 256, 4, '#a09c8c');
      g.solid(0, 151, 256, 105, '#1c2a24'); wash(g, 0, 151, 256, 105, '#2a4a3a', 80);
      for (let i = 0; i < 16; i++) { const x = g.rnd(0, 256), y = g.rnd(154, 250); ink(g, x, y, x + g.rnd(-3, 3), y + g.rnd(14, 50), pick(g, ['#3e7a4a', '#2e6a3c', '#58904e']), g.rnd(2, 5), 160); }
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(154, 254), g.rnd(2.5, 6), pick(g, ['#c8c8b0', '#a8a890']), g.rnd(150, 230));
      for (const x of [64, 192]) { oval(g, x, 60, 22, 22, '#14140e', 255); oval(g, x, 60, 15, 15, '#8a8470', 255); oval(g, x, 60, 7, 7, '#14140e', 255); }
    }),
  },
  // ---- the inside of the Bell (C2M29): bronze plates riveted in wide courses, an embossed band of letters in no alphabet across the middle, verdigris at every seam, and pale roots drawn through the plates like stitching ----------------------------------------------------------
  wall_bellinside_a: {
    seed: 9805, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#6a4a22'); g.solid(0, 0, 256, 256, '#6a4a22');
      for (let r = 0; r < 4; r++) { const y = r * 64; for (let c = 0; c < 2; c++) { const x = c * 128 + (r % 2 ? 64 : 0); g.solid(x + 3, y + 3, 122, 58, pick(g, ['#9a6a2e', '#8a5e28', '#a87434', '#7c5424'])); g.solid(x + 3, y + 3, 122, 4, '#e8b868'); g.solid(x + 3, y + 57, 122, 4, '#2a1a08'); for (const [dx, dy] of [[10, 12], [112, 12], [10, 50], [112, 50]]) { blot(g, x + dx, y + dy, 8, '#2a1a08', 255); blot(g, x + dx - 1, y + dy - 1, 4, '#e8c888', 230); } } }
      for (let k = 0; k < 16; k++) { const x = k * 16 + 4; g.solid(x, 92, 10, 12, '#5a3a16'); g.solid(x + 2, 94, 6, 3, '#d8a860'); g.solid(x + 2, 99, 3, 4, '#d8a860'); }
      for (let i = 0; i < 10; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-3, 3), y + g.rnd(20, 60), pick(g, ['#4a8a6a', '#3a7a58']), g.rnd(1.6, 3.2), 150); }
      for (let i = 0; i < 3; i++) vein(g, g.rnd(0, 256), g.rnd(0, 120), 7, '#e8e0c8', null, g.rnd(1.6, 2.4), g.rnd(-0.3, 0.3), 1, 10);
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 34), '#1c1004', 70);
    }),
  },
  // ---- the unrung gate's walk (C2M30): quiet marble gone dim, long soft veins, a single thin line of gold at head height all the way along, dust in the corners and nothing else ---------------------------------------------------------------------------------------------------------
  wall_unrung_a: {
    seed: 9806, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#9a9aa2'); g.solid(0, 0, 256, 256, '#9a9aa2');
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { g.solid(x + 2, y + 2, 124, 124, pick(g, ['#a4a4ac', '#9696a0', '#acacb4', '#8e8e98'])); g.solid(x + 2, y + 2, 124, 3, '#cacad2'); g.solid(x, y, 3, 128, '#5a5a64'); g.solid(x, y, 128, 3, '#5a5a64'); }
      for (let i = 0; i < 12; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-50, 50), y + g.rnd(20, 80), pick(g, ['#6a6a78', '#c4c4ce']), g.rnd(1, 2.6), 120); }
      g.solid(0, 126, 256, 4, '#8a7a4a'); g.solid(0, 126, 256, 1.4, '#d8c88a');
      wash(g, 0, 200, 256, 56, '#6a6a74', 50);
    }),
  },

  // ---- FLOORS ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // a landing in the well (C2M25): copper-green flagstones, big and uneven, a root through a joint here and there, a ring of old bolts in the middle of each
  floor_rootwell_a: {
    seed: 9811, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#1e2a22'); g.solid(0, 0, 256, 256, '#1e2a22');
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { g.solid(x + 3, y + 3, 122, 122, pick(g, ['#3a5a48', '#2e4e3c', '#44664e', '#34503e'])); g.solid(x + 3, y + 3, 122, 4, '#7aa88a'); g.solid(x + 3, y + 120, 122, 5, '#0e1612'); blot(g, x + 64, y + 64, 22, '#162018', 200); blot(g, x + 64, y + 64, 14, '#6a8a70', 255); blot(g, x + 62, y + 62, 5, '#c8e0c8', 220); }
      for (let i = 0; i < 3; i++) vein(g, g.rnd(0, 256), g.rnd(0, 256), 6, '#161210', '#5a4026', g.rnd(3, 5.5), g.rnd(-0.5, 0.5), 1, 10);
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(12, 34), '#0a100c', 80);
    }),
  },
  // the dead forest floor (C2M26): pale loam, grey-white, a litter of dry curled leaves and root threads, no green anywhere
  floor_rootloam_a: {
    seed: 9812, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#a8a088'); g.solid(0, 0, 256, 256, '#a8a088');
      for (let i = 0; i < 26; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(30, 80), pick(g, ['#bab294', '#988e78', '#c8c2a6', '#8a8068']), 120);
      for (let i = 0; i < 70; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); oval(g, x, y, g.rnd(8, 18), g.rnd(4, 8), pick(g, ['#7a6a4a', '#6a5a3e', '#8a7a58', '#5a4a30']), g.rnd(140, 230)); }
      for (let i = 0; i < 8; i++) vein(g, g.rnd(0, 256), g.rnd(0, 256), 6, '#4a3a26', '#8a7248', g.rnd(1.6, 3), g.rnd(-1, 1), g.rnd(-1, 1) > 0 ? 0.4 : -0.4, 12);
    }),
  },
  // the rift (C2M27): broken basalt, plates of dark brown-grey with sharp bright edges, copper-orange light welling up in the gaps
  floor_faultrock_a: {
    seed: 9813, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#140c08'); g.solid(0, 0, 256, 256, '#140c08');
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const x = c * 51 + (r % 2 ? 26 : 0) + g.rnd(-4, 4), y = r * 51 + g.rnd(-4, 4); oval(g, x, y, 54, 46, '#ff8a2a', 190); oval(g, x, y, 47, 40, pick(g, ['#4a3e38', '#3a302a', '#54463e', '#30262a']), 255); oval(g, x - 6, y - 7, 18, 8, '#8a7a68', 150); }
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 4), '#ffd890', g.rnd(110, 220));
    }),
  },
  // the dock (C2M28): wide planks of drowned oak, grey-brown, salt-white at the edges, dark brine stains in the grain, an iron nail at each end
  floor_tideplank_a: {
    seed: 9814, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#4a4034'); g.solid(0, 0, 256, 256, '#4a4034');
      for (let k = 0; k < 8; k++) { const y = k * 32; g.solid(0, y + 1, 256, 30, pick(g, ['#6a5c48', '#5a4e3c', '#74654f', '#54483a'])); g.solid(0, y + 1, 256, 3, '#9a8a70'); g.solid(0, y + 28, 256, 4, '#14100a'); for (let i = 0; i < 6; i++) { const x = g.rnd(0, 256); ink(g, x, y + 4, x + g.rnd(20, 60), y + g.rnd(6, 26), '#2a2218', g.rnd(1, 2), 150); } blot(g, 12, y + 16, 5, '#1a1612', 255); blot(g, 244, y + 16, 5, '#1a1612', 255); }
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(16, 44), pick(g, ['#1e1a12', '#e0dccc']), 60);
    }),
  },
  // inside the Bell (C2M29): flagstones of bronze gone green, each laid with a ring embossed in it, the rings' edges worn bright
  floor_bellstone_a: {
    seed: 9815, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2a3a24'); g.solid(0, 0, 256, 256, '#2a3a24');
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { g.solid(x + 3, y + 3, 122, 122, pick(g, ['#4a6a3c', '#3e5c34', '#567448', '#44623a'])); g.solid(x + 3, y + 3, 122, 4, '#9ab880'); g.solid(x + 3, y + 120, 122, 5, '#121a0e'); oval(g, x + 64, y + 64, 84, 84, '#a87a38', 255); oval(g, x + 64, y + 64, 70, 70, pick(g, ['#4a6a3c', '#3e5c34']), 255); oval(g, x + 64, y + 64, 30, 30, '#a87a38', 255); oval(g, x + 64, y + 64, 22, 22, '#3a5430', 255); }
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(12, 30), '#0a1006', 80);
    }),
  },
  // the walk to the Gate (C2M30): pale stone, dim, a worn path down the middle a little lighter than the rest, hairline joints, nothing else
  floor_unrung_a: {
    seed: 9816, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#8e8e96'); g.solid(0, 0, 256, 256, '#8e8e96');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64, y = r * 64; g.solid(x + 1, y + 1, 62, 62, pick(g, ['#96969e', '#8c8c94', '#a0a0a8', '#888890'])); g.solid(x + 1, y + 1, 62, 2, '#bcbcc4'); }
      wash(g, 88, 0, 80, 256, '#d8d8e0', 34);
      for (let i = 0; i < 10; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-30, 30), y + g.rnd(10, 40), '#6a6a74', g.rnd(1, 2), 110); }
    }),
  },

  // ---- SKIES ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // the underside of the world (open parts of Act D): black, with the tips of pale roots hanging down like icicles all round the rim and a faint copper haze behind them, a few dead-white points that are not stars
  sky_root: {
    seed: 9820, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#06060a'); gradient(g, w, h, [[0, '#030306'], [0.5, '#0a0a10'], [0.85, '#2a1a12'], [1, '#52301a']]);
      for (let i = 0; i < 50; i++) skyBlot(g, g.rnd(0, w), g.rnd(0, h), g.rnd(40, 160), g.rnd(8, 40), pick(g, ['#0e0e16', '#020204', '#1a120e']), g.rnd(50, 120));
      for (let i = 0; i < 40; i++) { const x = g.rnd(0, w), l = g.rnd(24, 120); for (let k = 0; k < l; k += 2) skyBlot(g, x + Math.sin(k * 0.12 + x) * 3, k, Math.max(1.5, 7 - k * 0.07), 2.4, pick(g, ['#d8d4bc', '#c0bca4']), 215); }
      for (let i = 0; i < 90; i++) { const d = g.rnd(1, 2.2); skyBlot(g, g.rnd(0, w), g.rnd(60, 240), d, d, pick(g, ['#e8e4d0', '#c8885a']), g.rnd(60, 190)); }
    }),
  },
  // down the shaft: nothing but a deepening dark and, far under, one small copper point that never gets nearer
  sky_root_below: {
    seed: 9821, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#050507'); gradient(g, w, h, [[0, '#2a1608'], [0.5, '#0c0806'], [1, '#020203']]);
      for (let i = 0; i < 40; i++) skyBlot(g, g.rnd(0, w), g.rnd(0, h), g.rnd(40, 160), g.rnd(6, 30), pick(g, ['#0a0806', '#020202', '#1c1008']), g.rnd(50, 120));
      skyBlot(g, 256, 40, 40, 40, '#ff8a30', 60); skyBlot(g, 256, 40, 16, 16, '#ffd890', 200); skyBlot(g, 256, 40, 5, 5, '#ffffff', 255);
      for (let i = 0; i < 40; i++) { const d = g.rnd(1, 2); skyBlot(g, g.rnd(0, w), g.rnd(0, h), d, d, '#8a6a44', g.rnd(40, 130)); }
    }),
  },
  // the Gate seen from far off at the end (C2M30): a dim white sky, no sun, the thin white ring of the Gate small and low and quite still, and a very pale glow round it
  sky_gate_dim: {
    seed: 9822, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#6a6a74'); gradient(g, w, h, [[0, '#4a4a54'], [0.6, '#8a8a94'], [1, '#c4c4cc']]);
      for (let i = 0; i < 30; i++) skyBlot(g, g.rnd(0, w), g.rnd(40, 200), g.rnd(80, 220), g.rnd(4, 12), pick(g, ['#7a7a84', '#a4a4ae', '#5a5a64']), g.rnd(60, 120));
      skyBlot(g, 256, 214, 120, 120, '#e8e8f0', 60); skyBlot(g, 256, 214, 80, 80, '#f4f4fa', 90);
      for (let a = 0; a < 90; a++) { const t = (a / 90) * Math.PI * 2; skyBlot(g, 256 + Math.cos(t) * 30, 214 + Math.sin(t) * 30, 3, 3, '#fffffe', 230); }
      g.solid(0, 250, w, 6, '#4a4a54');
    }),
  },
};
