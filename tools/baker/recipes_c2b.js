// Campaign 2, Act B (THE SOUNDING DEEP) materials (PT-039): the world under the stone, where the Vael actually live. Seven walls (cave rock, city stone, cold marble and bronze, drowned stone, ossuary bone, basilica ash,
// the heart's membrane) and three floors (flowstone, marble, the heart's skin). Same conventions as recipes_c2a.js: opaque, tiling (g.tile paints at 9 wrapped offsets), top-left px, big shapes and strong value steps first (the
// game renders at about 480 px wide and bands the value). The Deep is dark: the lantern and the amber lamps do the lighting, so the textures stay mid-value and carry their colour in the shapes.
import { R } from './recipes.js';
import { hex, mix } from './paint_util.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };
const wash = (g, x, y, w, h, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.rect(x + dx - g.p.width / 2, y + dy - g.p.height / 2, w, h); g.p.pop(); });
const blot = (g, x, y, d, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, d, d); g.p.pop(); });
const oval = (g, x, y, rw, rh, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, rw, rh); g.p.pop(); });
const skyBlot = (g, x, y, rw, rh, c, a) => g.tile((dx, dy) => { if (dy) return; g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y - g.p.height / 2, rw, rh); g.p.pop(); });
const gradient = (g, w, h, stops) => { for (let y = 0; y < h; y += 2) { const t = y / h; let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++; const [t0, c0] = stops[i], [t1, c1] = stops[i + 1], k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1))); g.solid(0, y, w, 2.5, mix(c0, c1, k)); } };
const ink = (g, x1, y1, x2, y2, c, wt, a = 255) => g.tile((dx, dy) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 + dx - g.p.width / 2, y1 + dy - g.p.height / 2, x2 + dx - g.p.width / 2, y2 + dy - g.p.height / 2); g.p.pop(); });

export const recipesC2b = {
  // ---- cave rock: blue-black stone in wet strata, bands of lighter and darker rock, vertical fissures, thin amber mineral veins, pale wet streaks running down from the bands --------------------------------------------------------
  wall_deeprock_a: {
    seed: 9601, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#242c3e'); g.solid(0, 0, 256, 256, '#242c3e');
      for (let b = 0; b < 8; b++) { const y = b * 32 + g.rnd(-4, 4), h = g.rnd(14, 34); g.solid(0, y, 256, h, pick(g, ['#323e58', '#1a2030', '#2c364c', '#3c4a68'])); g.solid(0, y, 256, 2.5, '#566a90'); g.solid(0, y + h - 3, 256, 3, '#10141e'); }
      for (let i = 0; i < 16; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(24, 70), pick(g, ['#3a4866', '#161c2a', '#2a3450']), 110);
      for (let i = 0; i < 9; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 200); ink(g, x, y, x + g.rnd(-10, 10), y + g.rnd(40, 100), '#0a0d14', g.rnd(1.6, 3.4), 220); }              // fissures
      for (let i = 0; i < 6; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 220); ink(g, x, y, x + g.rnd(-30, 30), y + g.rnd(8, 26), '#d89a3a', g.rnd(1.2, 2.2), 200); }                // amber mineral veins
      for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 180); ink(g, x, y, x + g.rnd(-2, 2), y + g.rnd(30, 80), '#8aa4cc', g.rnd(1, 2), 110); }                      // wet streaks
    }),
  },
  // ---- city stone: pale cut blocks (grey cream) in courses, and in each block a recessed arched niche with a lamp in it: warm gold in a dark frame, soot above ------------------------------------------------------------------------------
  wall_citystone_a: {
    seed: 9602, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#a8a08e'); g.solid(0, 0, 256, 256, '#a8a08e');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2 ? 32 : 0), y = r * 64; g.solid(x + 2, y + 2, 60, 60, pick(g, ['#b0a894', '#a09886', '#bab29e', '#98907e'])); g.solid(x + 2, y + 2, 60, 3, '#d4ccb8'); g.solid(x + 2, y + 58, 60, 4, '#5c5648'); }
      for (const [x, y] of [[32, 0], [160, 0], [96, 128], [224, 128]]) { g.solid(x - 14, y + 18, 28, 40, '#3a2c1c'); oval(g, x, y + 18, 28, 26, '#3a2c1c', 255); g.solid(x - 9, y + 26, 18, 30, '#f0b050'); oval(g, x, y + 26, 18, 16, '#f0b050', 255); g.solid(x - 4, y + 34, 8, 20, '#fff0b8'); oval(g, x, y + 8, 22, 12, '#38302a', 120); }
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 40), pick(g, ['#7a7260', '#c4bca8', '#6a6454']), 90);
      for (let i = 0; i < 16; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-5, 5), y + g.rnd(8, 30), '#3a362c', g.rnd(1, 2), 150); }
    }),
  },
  // ---- cold marble and bronze: four large slabs, grey veining, a bronze band across the middle studded at the joints (the Undercantors' halls) ---------------------------------------------------------------------------------------------
  wall_marblebronze_a: {
    seed: 9603, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#c4c8d4'); g.solid(0, 0, 256, 256, '#c4c8d4');
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { g.solid(x + 2, y + 2, 124, 124, pick(g, ['#c8ccd8', '#bcc0cc', '#d0d4de', '#b4b8c6'])); g.solid(x + 2, y + 2, 124, 3, '#eef0f8'); g.solid(x, y, 3, 128, '#6a6e80'); g.solid(x, y, 128, 3, '#6a6e80'); }
      for (let i = 0; i < 16; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-40, 40), y + g.rnd(20, 70), pick(g, ['#8a90a6', '#6a7088', '#a4aabe']), g.rnd(1, 3), 170); }
      g.solid(0, 108, 256, 24, '#8a6a30'); g.solid(0, 108, 256, 4, '#d8b058'); g.solid(0, 128, 256, 4, '#3a2a10');
      for (let k = 0; k < 8; k++) { blot(g, 16 + k * 32, 120, 9, '#2a1c08', 255); blot(g, 15 + k * 32, 119, 4, '#f0d078', 230); }
    }),
  },
  // ---- drowned stone: green-black courses, a waterline across the middle (dry and pale above it, slick and dark with algae below), barnacles, a crust of salt along the line -----------------------------------------------------------------
  wall_drowned_a: {
    seed: 9604, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2a3a38'); g.solid(0, 0, 256, 256, '#2a3a38');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2 ? 32 : 0), y = r * 64; g.solid(x + 2, y + 2, 60, 60, pick(g, ['#34464a', '#2a3a3c', '#3c5050', '#243234'])); g.solid(x + 2, y + 58, 60, 4, '#0e1816'); }
      g.solid(0, 0, 256, 120, '#566a64'); wash(g, 0, 0, 256, 120, '#8aa49a', 70);                                           // above the line: dry, bleached
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) g.solid(c * 64 + (r % 2 ? 32 : 0) + 2, r * 64 + 58, 60, 4, '#2a3a38');
      g.solid(0, 120, 256, 136, '#16241f'); for (let i = 0; i < 18; i++) { const x = g.rnd(0, 256), y = g.rnd(124, 250); ink(g, x, y, x + g.rnd(-3, 3), y + g.rnd(20, 70), pick(g, ['#4a7a4a', '#2e5a3c', '#6a9a58']), g.rnd(2, 5), 150); }
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(126, 254), g.rnd(3, 7), pick(g, ['#c8c8b0', '#a8a890']), g.rnd(150, 230));          // barnacles
      g.solid(0, 114, 256, 8, '#e0e8de'); for (let i = 0; i < 30; i++) blot(g, g.rnd(0, 256), g.rnd(110, 126), g.rnd(2, 6), '#ffffff', 190);        // the salt line
    }),
  },
  // ---- ossuary: dark mortar and ranks of square niches, in each a stack of long bones laid end-out (ivory, round ends) and here and there a skull; nothing is red -------------------------------------------------------------------------------
  wall_ossuary_a: {
    seed: 9605, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#1c1814'); g.solid(0, 0, 256, 256, '#1c1814');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const x = c * 64, y = r * 64; g.solid(x + 4, y + 4, 56, 56, '#0e0c0a'); g.solid(x + 4, y + 4, 56, 3, '#3a342a');
        if ((r * 4 + c) % 5 === 2) { oval(g, x + 32, y + 30, 30, 36, '#e4dac0', 255); oval(g, x + 26, y + 30, 8, 10, '#1a1610', 255); oval(g, x + 38, y + 30, 8, 10, '#1a1610', 255); g.solid(x + 28, y + 44, 8, 8, '#cfc4a6'); continue; }
        for (let k = 0; k < 5; k++) { const yy = y + 10 + k * 9; g.solid(x + 8, yy, 48, 6, pick(g, ['#e0d4b4', '#cabe9e', '#d8cca8'])); oval(g, x + 8, yy + 3, 8, 9, '#ece2c4', 255); oval(g, x + 56, yy + 3, 8, 9, '#ece2c4', 255); }
      }
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(10, 30), pick(g, ['#3a3226', '#0a0806']), 110);
    }),
  },
  // ---- ash stone: grey blocks under soot, vertical pilaster ribs, an ember glow in the cracks at the foot of the wall (the basilica's walls were burned, not built) ----------------------------------------------------------------------------
  wall_ashstone_a: {
    seed: 9606, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#6a6866'); g.solid(0, 0, 256, 256, '#6a6866');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2 ? 32 : 0), y = r * 64; g.solid(x + 2, y + 2, 60, 60, pick(g, ['#78767a', '#5e5c5e', '#82807e', '#6a686c'])); g.solid(x + 2, y + 2, 60, 3, '#a09ea0'); g.solid(x + 2, y + 58, 60, 4, '#262424'); }
      for (const x of [0, 128]) { g.solid(x + 20, 0, 24, 256, '#46444a'); g.solid(x + 20, 0, 4, 256, '#8a888c'); g.solid(x + 40, 0, 4, 256, '#1c1a1e'); }
      for (let i = 0; i < 22; i++) blot(g, g.rnd(0, 256), g.rnd(0, 200), g.rnd(24, 70), pick(g, ['#242224', '#38363a']), 120);                     // soot
      for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(190, 252); ink(g, x, y, x + g.rnd(-12, 12), y + g.rnd(-12, 6), '#e8602a', g.rnd(1.4, 3), 220); ink(g, x, y, x + g.rnd(-4, 4), y + g.rnd(-4, 4), '#ffc060', 1.2, 200); }       // embers
    }),
  },
  // ---- the heart's membrane: red-violet, taut, with branching vessels lighter than the skin, glossy highlights and pale nodules; a slow dark seam between plates ---------------------------------------------------------------------------
  wall_heartflesh_a: {
    seed: 9607, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#5a1e3c'); g.solid(0, 0, 256, 256, '#5a1e3c');
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#6a2848', '#4a1630', '#74304e', '#3e1228']), 130);
      for (let i = 0; i < 7; i++) { let x = g.rnd(0, 256), y = g.rnd(0, 60); for (let k = 0; k < 5; k++) { const nx = x + g.rnd(-22, 22), ny = y + g.rnd(18, 40); ink(g, x, y, nx, ny, '#d05080', Math.max(1, 3.6 - k * 0.6), 190); if (k % 2) ink(g, nx, ny, nx + g.rnd(-24, 24), ny + g.rnd(10, 30), '#b03c6a', 1.4, 160); x = nx; y = ny; } }
      for (let i = 0; i < 12; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), d = g.rnd(6, 16); blot(g, x, y, d, '#2a0c1c', 150); blot(g, x - d * 0.15, y - d * 0.15, d * 0.55, '#f0a0c0', 190); }
      for (const y of [0, 128]) { g.solid(0, y, 256, 4, '#1e0814'); g.solid(0, y + 4, 256, 2, '#a04a74'); }
    }),
  },
  // ---- flowstone: the cave floor, a limestone of low rimstone dams like fish scales: curved rims lighter than the pools between, wet, a scatter of amber grit -------------------------------------------------------------------------------------
  floor_flowstone_a: {
    seed: 9611, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3a4258'); g.solid(0, 0, 256, 256, '#3a4258');
      for (let i = 0; i < 20; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 100), pick(g, ['#444e68', '#2e3548', '#4e5a76', '#262c3e']), 130);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const x = c * 51 + (r % 2 ? 26 : 0), y = r * 51; oval(g, x, y, 60, 40, '#7a88a8', 120); oval(g, x, y - 2, 54, 34, pick(g, ['#3e4862', '#343c54', '#485472']), 255); }
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 4), pick(g, ['#d89a3a', '#e8c070', '#a8b8d8']), g.rnd(110, 220));
      for (let i = 0; i < 10; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-30, 30), y + g.rnd(-6, 6), '#9ab0d8', 1.4, 100); }
    }),
  },
  // ---- marble floor: 4 x 4 tiles in two cold greys, a bronze inlay line at every joint, veining, a worn path of paler stone down the middle --------------------------------------------------------------------------------------------------
  floor_marble_a: {
    seed: 9612, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#9ea2b2'); g.solid(0, 0, 256, 256, '#9ea2b2');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64, y = r * 64; g.solid(x, y, 64, 64, (r + c) % 2 ? '#b4b8c6' : '#7c8094'); g.solid(x, y, 64, 3, '#d0d4e0'); }
      for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-30, 30), y + g.rnd(10, 40), pick(g, ['#5c6074', '#e0e4ee']), g.rnd(1, 2.4), 150); }
      for (let k = 0; k < 4; k++) { g.solid(k * 64 - 1.5, 0, 3, 256, '#a87838'); g.solid(0, k * 64 - 1.5, 256, 3, '#a87838'); g.solid(k * 64 - 0.5, 0, 1, 256, '#f0d078'); }
      wash(g, 96, 0, 64, 256, '#e8ecf6', 40);
    }),
  },
  // ---- the heart's floor: skin over something that moves, polygons of cells with a pale rim and a dark middle, vessels between them, a wet gloss ---------------------------------------------------------------------------------------------------
  floor_flesh_a: {
    seed: 9613, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#4a1830'); g.solid(0, 0, 256, 256, '#4a1830');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2 ? 32 : 0) + g.rnd(-3, 3), y = r * 64 + 32 + g.rnd(-3, 3); oval(g, x, y, 62, 58, '#a04a74', 150); oval(g, x, y, 54, 50, pick(g, ['#6a2848', '#5a2040', '#742e50']), 255); oval(g, x - 6, y - 8, 18, 12, '#d88aae', 130); }
      for (let i = 0; i < 12; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-40, 40), y + g.rnd(-40, 40), '#c04878', g.rnd(1.4, 3), 170); }
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(8, 22), '#2a0c1c', 110);
    }),
  },
  // ---- the roof of the Deep (a sky for the open caverns: the dome the player sees above a bowl, a plaza, a garden): black rock in broad dark masses, a faint blue haze toward the rim where the far walls are, hundreds of small lights
  // (the glow-moss that lives on the roof: teal, amber, pale green), a few pale shafts where a crack lets in some far light -------------------------------------------------------------------------------------------------------------
  sky_deep: {
    seed: 9620, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#06080e'); gradient(g, w, h, [[0, '#030409'], [0.45, '#080b16'], [0.8, '#101828'], [1, '#1c2a42']]);
      for (let i = 0; i < 90; i++) skyBlot(g, g.rnd(0, w), g.rnd(0, h), g.rnd(30, 140), g.rnd(8, 44), pick(g, ['#0e1428', '#04050a', '#182036', '#0a0e1c']), g.rnd(50, 130));            // broad masses of rock
      for (let i = 0; i < 12; i++) skyBlot(g, g.rnd(0, w), g.rnd(40, 230), g.rnd(6, 16), g.rnd(60, 150), '#6a8cb8', g.rnd(14, 34));                                                        // pale shafts from far cracks
      for (let i = 0; i < 260; i++) { const d = g.rnd(1, 2.8); skyBlot(g, g.rnd(0, w), g.rnd(0, 236), d, d, pick(g, ['#7ac8d8', '#e8b868', '#a0e0c0', '#8aa8ff']), g.rnd(70, 210)); }       // glow-moss
      for (let i = 0; i < 24; i++) { const x = g.rnd(0, w), l = g.rnd(8, 40); for (let k = 0; k < l; k += 2) skyBlot(g, x, 250 - k, Math.max(1.5, 9 - k * 0.22), 2.2, '#04050a', 230); }       // stalactites standing up from the rim
      g.solid(0, 250, w, 6, '#06080e');
    }),
  },
};
