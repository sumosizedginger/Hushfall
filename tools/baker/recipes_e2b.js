// Episode 2 theme kit, second half (Gate 4 batch 2): the rail yard, the kilns, the slurry undercroft, the rime vault. Same conventions as recipes_e2.js: opaque, tiling (g.tile paints at 9 wrapped
// offsets), flat opaque areas with g.solid (p5.brush crashes on narrow brush rects), seeds recorded in ART_BIBLE.md. Palette: soot, ember orange, rust, slurry green, frost blue.
import { R } from './recipes.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const blooms = (g, cols, n, a0, a1, r0, r1) => { g.noStroke(); g.bleed(0.7, 'out'); for (let i = 0; i < n; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(r0, r1), c = pick(g, cols), a = g.rnd(a0, a1); g.tile((dx, dy) => { g.fill(c, a); g.circle(x + dx, y + dy, r); }); } };
const dashes = (g, kind, col, w, n, l0, l1, vertical = false) => { g.stroke(kind, col, w); for (let i = 0; i < n; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), l = g.rnd(l0, l1); g.tile((dx, dy) => (vertical ? g.line(x + dx, y + dy, x + g.rnd(-1.5, 1.5) + dx, y + l + dy) : g.line(x + dx, y + dy, x + l + dx, y + g.rnd(-1.5, 1.5) + dy))); } };

export const recipesE2b = {
  // ---- walls ------------------------------------------------------------------------------------------------------------
  wall_kiln_a: {                                              // sooted kiln brick: the furnaces of Kiln Row; black with a live orange seam showing wherever the mortar has burnt through
    seed: 9103, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#1e1a16'); g.solid(0, 0, 256, 256, '#1e1a16');
      const rows = 8, rh = 32, seams = [];
      for (let r = 0; r < rows; r++) {
        let x = -(r % 2) * 24 - g.rnd(0, 6);
        while (x < 256) { const w = g.rnd(40, 54), xx = x, rr = r; g.noStroke(); g.bleed(0.12, 'out'); g.tile((dx, dy) => { g.fill(pick(g, ['#3a2e28', '#2a221e', '#46362c', '#342923', '#50403a']), 255); g.rect(xx + 2 + dx, rr * rh + 2 + dy, w - 4, rh - 4); }); seams.push([xx, rr]); x += w; }
      }
      g.stroke('2B', '#120e0c', 1.2); for (let r = 0; r <= rows; r++) g.tile((dx, dy) => g.line(dx, r * rh + dy, 256 + dx, r * rh + dy));                       // the courses
      blooms(g, ['#a83a1a', '#e0602a', '#c8421e'], 12, 60, 130, 6, 20);                                                                                           // heat bloom through the soot
      g.stroke('cpencil', '#e8702a', 1.1); for (const [x, r] of seams) if (g.rnd(0, 1) > 0.62) g.tile((dx, dy) => g.line(x + dx, r * rh + dy, x + dx, r * rh + rh + dy));   // seams burnt through to the fire
      g.stroke('cpencil', '#f0a050', 0.7); for (let r = 0; r <= rows; r++) if (g.rnd(0, 1) > 0.7) { const x = g.rnd(0, 200); g.tile((dx, dy) => g.line(x + dx, r * rh + dy, x + g.rnd(20, 56) + dx, r * rh + dy)); }  // a lit course
      dashes(g, 'charcoal', '#0c0a08', 0.8, 14, 14, 40, true);                                                                                                    // soot runs
      dashes(g, 'cpencil', '#8a8478', 0.5, 20, 4, 10);                                                                                                            // ash on the faces
    }),
  },
  wall_rime_a: {                                              // frosted steel plate: the cold-storage vault; blue-grey, riveted seams, ice growing out of the joints
    seed: 9104, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#7c8c9a'); g.solid(0, 0, 256, 256, '#7c8c9a');
      const cols = 4, rows = 2, cw = 64, rh = 128;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g.solid(c * cw + 2, r * rh + 2, cw - 4, rh - 4, pick(g, ['#8a9aa8', '#8294a2', '#92a2b0', '#7a8a98']));
      blooms(g, ['#a8bccc', '#6a7c8c', '#b8ccda'], 16, 50, 110, 12, 34);                                                                                         // mottled steel
      g.stroke('2B', '#26323c', 1.4); for (let c = 0; c <= cols; c++) g.tile((dx, dy) => g.line(c * cw + dx, dy, c * cw + dx, 256 + dy)); for (let r = 0; r <= rows; r++) g.tile((dx, dy) => g.line(dx, r * rh + dy, 256 + dx, r * rh + dy));   // plate seams
      g.stroke('HB', '#d0dce6', 0.9); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) for (const [ox, oy] of [[8, 8], [56, 8], [8, 120], [56, 120]]) g.tile((dx, dy) => g.circle(c * cw + ox + dx, r * rh + oy + dy, 2));   // rivet heads
      blooms(g, ['#f0f6fa', '#dce8f0', '#e8f2f8'], 26, 80, 160, 6, 24);                                                                                          // frost
      dashes(g, 'cpencil', '#f6fafc', 0.8, 30, 14, 40, true);                                                                                                     // icicles and ice growing out of the seams
      dashes(g, 'cpencil', '#5a6c7c', 0.6, 12, 10, 26, true);                                                                                                     // meltwater streaks
    }),
  },
  // ---- floors -----------------------------------------------------------------------------------------------------------
  floor_track_a: {                                            // rail ballast with two rails and timber sleepers running east-west: the yard (`b`, outdoor)
    seed: 9202, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#6e6a62'); g.solid(0, 0, 256, 256, '#6e6a62'); g.noStroke(); g.bleed(0.4, 'out');
      for (let i = 0; i < 130; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(3, 10); g.tile((dx, dy) => { g.fill(pick(g, ['#8a867a', '#5e5a52', '#9a9688', '#4e4a44', '#7a766c']), g.rnd(150, 230)); g.circle(x + dx, y + dy, r); }); }   // ballast stones
      for (let k = 0; k < 4; k++) g.solid(k * 64 + 14, 0, 24, 256, pick(g, ['#3a2a1e', '#42301f', '#33261b', '#3e2c20']));                                           // sleepers (across the track)
      dashes(g, 'cpencil', '#5a4630', 0.6, 22, 40, 120, true);                                                                                                    // grain, drawn short so it stays on the ties
      for (const y of [56, 184]) { g.solid(0, y, 256, 14, '#46464a'); g.solid(0, y, 256, 4, '#a0a0a4'); g.solid(0, y + 11, 256, 3, '#26262a'); }                      // the two rails: lit top, shaded foot
      g.stroke('cpencil', '#a8582a', 0.9); for (let i = 0; i < 12; i++) { const x = g.rnd(0, 230), y = pick(g, [58, 188]); g.tile((dx, dy) => g.line(x + dx, y + dy, x + g.rnd(8, 24) + dx, y + dy)); }   // rust bloom on the rails
      g.stroke('HB', '#c8a878', 0.9); for (let k = 0; k < 4; k++) for (const y of [63, 191]) g.tile((dx, dy) => g.circle(k * 64 + 26 + dx, y + dy, 2.4));            // spikes where rail meets tie
      blooms(g, ['#2a2622', '#3a342e'], 8, 50, 100, 10, 24);                                                                                                       // oil and soot
    }),
  },
  floor_clinker_a: {                                          // kiln clinker and ash with live embers in the cracks (`k`: the furnace floors; the ember bed uses the same cracks under the glow)
    seed: 9203, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#34302a'); g.solid(0, 0, 256, 256, '#34302a'); g.noStroke(); g.bleed(0.5, 'out');
      for (let i = 0; i < 44; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(10, 30); g.tile((dx, dy) => { g.fill(pick(g, ['#4a443c', '#26221e', '#58504a', '#3e3832', '#1e1a18']), g.rnd(100, 190)); g.circle(x + dx, y + dy, r); }); }   // cinder lumps
      // cracks: jagged polylines that branch, dark first, then the same path again in ember orange (thinner), so the glow sits in the crack
      const crack = (x0, y0, a0, n) => { const pts = [[x0, y0]]; let x = x0, y = y0, a = a0; for (let k = 0; k < n; k++) { a += g.rnd(-0.9, 0.9); const l = g.rnd(8, 20); x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); } return pts; };
      const cracks = []; for (let i = 0; i < 14; i++) { const c = crack(g.rnd(0, 256), g.rnd(0, 256), g.rnd(0, 6.28), Math.floor(g.rnd(3, 7))); cracks.push(c); const m = c[Math.floor(c.length / 2)]; if (g.rnd(0, 1) > 0.4) cracks.push(crack(m[0], m[1], g.rnd(0, 6.28), 3)); }
      g.stroke('2B', '#14100e', 1.5); for (const c of cracks) for (let k = 0; k + 1 < c.length; k++) g.tile((dx, dy) => g.line(c[k][0] + dx, c[k][1] + dy, c[k + 1][0] + dx, c[k + 1][1] + dy));
      g.stroke('cpencil', '#e8602a', 0.9); for (const c of cracks) if (g.rnd(0, 1) > 0.35) for (let k = 0; k + 1 < c.length; k++) g.tile((dx, dy) => g.line(c[k][0] + dx, c[k][1] + dy, c[k + 1][0] + dx, c[k + 1][1] + dy));
      blooms(g, ['#a83a1a', '#c8421e', '#e0782a'], 8, 40, 100, 6, 16);                                                                                            // heat
      dashes(g, 'cpencil', '#9a9488', 0.5, 26, 4, 12);                                                                                                            // pale ash
    }),
  },
  floor_slurry_a: {                                           // slurry: dark wet sludge with an oily sheen; the undercroft floor (`v`)
    seed: 9204, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#26342c'); g.solid(0, 0, 256, 256, '#26342c'); g.noStroke(); g.bleed(0.6, 'out');
      for (let i = 0; i < 46; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(14, 40); g.tile((dx, dy) => { g.fill(pick(g, ['#34483a', '#1c2a22', '#3e5242', '#2a3a30', '#16221a']), g.rnd(90, 170)); g.circle(x + dx, y + dy, r); }); }   // sludge
      blooms(g, ['#5a3a6a', '#3a6a5a', '#6a5a2a'], 7, 30, 70, 10, 26);                                                                                            // oil sheen, purple and gold
      dashes(g, 'cpencil', '#9ab8a0', 0.6, 24, 6, 20);                                                                                                            // wet highlights
      g.stroke('HB', '#b8d0b8', 0.8); for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.circle(x + dx, y + dy, g.rnd(1.5, 4))); }   // bubbles
      dashes(g, 'charcoal', '#0e1612', 0.8, 10, 12, 34);                                                                                                          // drag marks
    }),
  },
  floor_rime_a: {                                             // frosted steel deck plate: the vault floor (`r`)
    seed: 9205, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#8a9aa8'); g.solid(0, 0, 256, 256, '#8a9aa8');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.solid(c * 64 + 2, r * 64 + 2, 60, 60, pick(g, ['#94a4b2', '#8696a4', '#a0b0be', '#7e8e9c']));
      g.stroke('2B', '#2a3640', 1.3); for (let i = 0; i <= 4; i++) { g.tile((dx, dy) => g.line(i * 64 + dx, dy, i * 64 + dx, 256 + dy)); g.tile((dx, dy) => g.line(dx, i * 64 + dy, 256 + dx, i * 64 + dy)); }   // plate seams
      blooms(g, ['#e4eef4', '#cfe0ea', '#f2f8fc'], 30, 70, 150, 8, 28);                                                                                          // frost
      dashes(g, 'cpencil', '#f6fafc', 0.8, 26, 6, 18);                                                                                                            // ice crack lines
      dashes(g, 'charcoal', '#4a5a68', 0.7, 14, 8, 24);                                                                                                           // scuffs
    }),
  },
  floor_ember_a: {                                            // the ember bed: a hazard overlay (fx `h`), bright, drawn unlit over the floor: crust plates floating on a glowing bed
    seed: 9206, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#b8380e'); g.solid(0, 0, 256, 256, '#b8380e');
      blooms(g, ['#e8601c', '#ff8a30', '#d44a12', '#ffb040'], 44, 110, 210, 14, 40);                                                                                // the glowing bed
      g.noStroke(); g.bleed(0.3, 'out');
      for (let i = 0; i < 24; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), rr = g.rnd(9, 24); g.tile((dx, dy) => { g.fill(pick(g, ['#3a1810', '#4a2014', '#5a2a18']), g.rnd(200, 255)); g.circle(x + dx, y + dy, rr); }); }   // dark crust plates
      dashes(g, 'cpencil', '#ffd060', 1.0, 44, 8, 24);                                                                                                                // bright cracks between the plates
      g.stroke('HB', '#fff0b0', 0.9); for (let i = 0; i < 16; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); g.tile((dx, dy) => g.circle(x + dx, y + dy, g.rnd(1, 2.5))); }   // sparks
    }),
  },
};
