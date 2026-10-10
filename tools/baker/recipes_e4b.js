// Episode 4 materials, Batches B to E (PT-033): the MIRROR ARRAY (dark prismatic glass, a mosaic of prisms) and the QUIET ROOM (smoky bronze, polished dark stone), the COLD DOCK (sterile white-cyan plate, safety yellow, frost), the DRIFT ORCHARD (living glass,
// bark, moss), the GATEKEEPER'S APPROACH (grey stone with an indigo cast), the HOLLOW STAIR (indigo basalt with seams of white light), the GATE (white marble and black inlay) and the Gate's two skies (a ring of white light; the light from below).
// Same conventions as recipes_e4.js: opaque, tiling (g.tile paints at 9 wrapped offsets), top-left px, big shapes and strong value steps first (the game renders at about 480 px wide and bands the value); skies are 512 x 256 and use plain p5 ellipses and solid rows
// (a brush fill in the hundreds hangs the baker).
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

export const recipesE4b = {
  // ---- the mirror hall's wall: four panes of black-violet glass in brass frames, long glints, a spectral edge on every pane (magenta, cyan, gold) -----------------------------------------------------------------------------------------------
  wall_glass_a: {
    seed: 9411, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#0e0a1a'); g.solid(0, 0, 256, 256, '#0e0a1a');
      g.solid(6, 6, 244, 244, '#1c1440'); for (let i = 0; i < 18; i++) blot(g, g.rnd(20, 236), g.rnd(20, 236), g.rnd(40, 90), pick(g, ['#241a52', '#18103a', '#2c2060']), 120);                // one tall pane of violet-black glass
      for (let k = 0; k < 16; k++) { const gx = g.rnd(14, 200), gy = g.rnd(14, 200); ink(g, gx, gy, gx + g.rnd(24, 70), gy + g.rnd(24, 80), pick(g, ['#7a62d0', '#9a80e8', '#d8b868']), g.rnd(1.5, 4), g.rnd(60, 170)); }   // long glints
      g.solid(6, 6, 244, 3, '#e060b0'); g.solid(6, 9, 244, 2, '#f0d070'); g.solid(6, 245, 244, 3, '#40d0e0'); g.solid(6, 6, 3, 244, '#9a68e8'); g.solid(247, 6, 3, 244, '#40d0e0');           // the spectral edge
      g.solid(0, 0, 256, 5, '#a07a30'); g.solid(0, 0, 5, 256, '#a07a30'); g.solid(251, 0, 5, 256, '#5a4018'); g.solid(0, 251, 256, 5, '#5a4018');                                          // a thin brass frame
      for (const [bx, by] of [[3, 3], [253, 3], [3, 253], [253, 253]]) { blot(g, bx, by, 6, '#2a1c08', 255); blot(g, bx - 1, by - 1, 2.4, '#f0d890', 230); }
      for (let i = 0; i < 30; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 5), pick(g, ['#fff3c9', '#d0b8ff', '#9ae8f4']), g.rnd(60, 160));
    }),
  },
  // ---- the mirror hall's floor: a mosaic of small prisms (a square cut on the diagonal, two values), gold grout, a scatter of coloured sparks ---------------------------------------------------------------------------------------------
  floor_prism_a: {
    seed: 9412, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#120e22'); g.solid(0, 0, 256, 256, '#120e22');
      for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) {
        const a = pick(g, ['#1a1430', '#221a44', '#161028']), b = pick(g, ['#0c0818', '#120c24', '#281c50']);
        g.solid(x + 2, y + 2, 28, 28, a); for (let k = 0; k < 28; k += 2) g.solid(x + 2 + k, y + 2, 2.5, 28 - k, b);                                                                     // the lower-left half
      }
      for (let i = 0; i <= 8; i++) { g.solid(i * 32 - 1, 0, 2, 256, '#7a5a22'); g.solid(0, i * 32 - 1, 256, 2, '#7a5a22'); }
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 5), pick(g, ['#ff7ad0', '#7ae8ff', '#ffd870', '#b890ff']), g.rnd(70, 190));
    }),
  },
  // ---- the quiet room's wall: smoky bronze panels, fine vertical veining, a few soft amber glints; nothing loud ----------------------------------------------------------------------------------------------------------------------------
  wall_quiet_a: {
    seed: 9413, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#34281c'); g.solid(0, 0, 256, 256, '#34281c');
      for (let i = 0; i < 16; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#3e3022', '#2a2016', '#46361f']), 120);
      for (let c = 0; c < 4; c++) { const x = c * 64; g.solid(x, 0, 3, 256, '#0a0806'); g.solid(x + 3, 0, 2, 256, '#9a7a48'); for (let k = 0; k < 9; k++) { const vx = x + g.rnd(8, 58), vy = g.rnd(0, 200); ink(g, vx, vy, vx + g.rnd(-4, 4), vy + g.rnd(30, 70), '#a07838', g.rnd(0.6, 1.6), g.rnd(50, 130)); } }
      for (let i = 0; i < 9; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(4, 10), '#e8b868', g.rnd(30, 80));
      g.solid(0, 0, 256, 3, '#6a5030'); g.solid(0, 253, 256, 3, '#0a0806');
    }),
  },
  // ---- the quiet room's floor: polished dark stone with faint rings (the room is round), a few specks like far stars ---------------------------------------------------------------------------------------------------------------------------
  floor_quiet_a: {
    seed: 9414, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2a231c'); g.solid(0, 0, 256, 256, '#2a231c');
      for (let i = 0; i < 20; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(50, 110), pick(g, ['#352c22', '#1e1914', '#403428']), 110);
      for (let r = 30; r < 260; r += 34) { g.tile((dx, dy) => { g.p.push(); g.p.noFill(); g.p.stroke(200, 160, 96, 90); g.p.strokeWeight(1.8); g.p.ellipse(128 + dx - 128, 128 + dy - 128, r, r); g.p.pop(); }); }
      for (let i = 0; i < 30; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 3.5), '#f4e0b8', g.rnd(60, 160));
    }),
  },
  // ---- the dock's wall: sterile off-white plate, a cyan band, safety-yellow chevrons low down, stencilled blocks, frost, bolts ------------------------------------------------------------------------------------------------------------
  wall_dock_a: {
    seed: 9415, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#b8ccd0'); g.solid(0, 0, 256, 256, '#b8ccd0');
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#c8dce0', '#a8bcc2', '#d4e4e8']), 110);
      for (const x of [0, 128]) { g.solid(x, 0, 4, 256, '#4a6068'); g.solid(x + 4, 0, 2, 256, '#e8f4f8'); }
      g.solid(0, 62, 256, 22, '#3a9cb4'); g.solid(0, 62, 256, 3, '#8ce0f0'); g.solid(0, 81, 256, 3, '#1c5a6c');
      for (let i = -2; i < 18; i++) { g.solid(i * 18, 196, 9, 44, '#e8b81c'); g.solid(i * 18 + 9, 196, 9, 44, '#1a1c20'); }                                                              // safety chevrons, low
      g.solid(0, 192, 256, 4, '#1a1c20'); g.solid(0, 240, 256, 4, '#1a1c20');
      for (let i = 0; i < 4; i++) g.solid(14 + i * 30, 112 + (i % 2) * 16, 20, 36, '#6c8890');                                                                                       // stencilled blocks
      for (const [bx, by] of [[10, 10], [118, 10], [10, 246], [118, 246], [138, 10], [246, 10], [138, 246], [246, 246]]) { blot(g, bx, by, 5, '#3a4c52', 255); blot(g, bx - 1, by - 1, 2, '#e8f4f8', 220); }
      for (let i = 0; i < 50; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 7), '#ffffff', g.rnd(70, 190));                                                                     // frost
    }),
  },
  // ---- the dock's floor: pale grating plate with yellow safety lines along two edges, a frost line, black seams -------------------------------------------------------------------------------------------------------------------------------
  floor_dock_a: {
    seed: 9416, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#8ea4aa'); g.solid(0, 0, 256, 256, '#8ea4aa');
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#9db2b8', '#7a9096', '#a8bcc2']), 110);
      for (let y = 0; y < 256; y += 8) for (let x = ((y / 8) % 2) * 8; x < 256; x += 16) { g.solid(x, y + 2, 8, 3, '#5e7278'); }
      for (let i = 0; i <= 2; i++) { g.solid(i * 128 - 2, 0, 4, 256, '#2a3a40'); g.solid(0, i * 128 - 2, 256, 4, '#2a3a40'); }
      g.solid(0, 10, 256, 8, '#e8b81c'); g.solid(0, 238, 256, 8, '#e8b81c'); g.solid(0, 18, 256, 2, '#1a1c20'); g.solid(0, 236, 256, 2, '#1a1c20');
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 6), '#ffffff', g.rnd(60, 160));
    }),
  },
  // ---- the orchard's wall: living glass: pale green panes with darker veins, leaf-shaped shadows, gold sap running down the joints ---------------------------------------------------------------------------------------------------------------
  wall_orchard_a: {
    seed: 9417, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#7cae72'); g.solid(0, 0, 256, 256, '#7cae72');
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 100), pick(g, ['#8cc482', '#68a060', '#a4d89a']), 100);
      for (let i = 0; i < 12; i++) { const x = g.rnd(10, 246), y = g.rnd(10, 246); oval(g, x, y, g.rnd(16, 34), g.rnd(6, 12), pick(g, ['#3c6c3a', '#2c5430']), 150); ink(g, x - 12, y, x + 12, y + g.rnd(-3, 3), '#c8f0b0', 1, 140); }
      for (const x of [0, 128]) { g.solid(x, 0, 5, 256, '#3a5a34'); g.solid(x + 5, 0, 3, 256, '#e8d070'); }
      for (const y of [0, 128]) { g.solid(0, y, 256, 5, '#3a5a34'); g.solid(0, y + 5, 256, 3, '#e8d070'); }
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 5), '#f8ffe0', g.rnd(60, 150));
    }),
  },
  // ---- the great tree's bark: deep vertical furrows in brown and gold, moss in the folds, amber seams of sap --------------------------------------------------------------------------------------------------------------------------------
  wall_bark_a: {
    seed: 9418, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#4a3418'); g.solid(0, 0, 256, 256, '#4a3418');
      for (let i = 0; i < 16; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#5c4220', '#3a2810', '#6e5028']), 110);
      for (let c = 0; c < 10; c++) { const x = c * 26 + g.rnd(-4, 4); g.solid(x, 0, 6, 256, '#22160a'); g.solid(x + 6, 0, 8, 256, pick(g, ['#7a5a2c', '#8a6830', '#6a4c22'])); g.solid(x + 14, 0, 3, 256, '#a88040'); }
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(8, 20), pick(g, ['#4a7a34', '#5a8a3c']), 120);
      for (let i = 0; i < 7; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 200); ink(g, x, y, x + g.rnd(-6, 6), y + g.rnd(30, 70), '#ffc850', g.rnd(1.2, 2.6), 200); }
    }),
  },
  // ---- the orchard's floor: moss and turf in mottled greens, pale roots, gold pollen -------------------------------------------------------------------------------------------------------------------------------------------------------------
  floor_moss_a: {
    seed: 9419, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#46702e'); g.solid(0, 0, 256, 256, '#46702e');
      for (let i = 0; i < 46; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(24, 70), pick(g, ['#5a8a38', '#34581f', '#6a9a44', '#3e6628', '#82aa50']), 120);
      for (let i = 0; i < 18; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-30, 30), y + g.rnd(-30, 30), '#cfc8a0', g.rnd(1, 2.4), 150); }
      for (let i = 0; i < 70; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 4), pick(g, ['#f8e070', '#fff4b0', '#d8f088']), g.rnd(90, 210));
    }),
  },
  // ---- the approach's wall: big blocks of grey ashlar with an indigo cast, offset courses, chips, a faint indigo glow in the joints --------------------------------------------------------------------------------------------------------------
  wall_approach_a: {
    seed: 9420, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#4a4c5c'); g.solid(0, 0, 256, 256, '#4a4c5c');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
        const x = c * 128 + (r % 2) * 64 - 64, y = r * 64, tone = pick(g, ['#585a6c', '#4e5064', '#626478', '#454759']);
        g.solid(x + 3, y + 3, 122, 58, tone); g.solid(x + 3, y + 3, 122, 3, mix(tone, '#c8ccec', 0.35)); g.solid(x + 3, y + 3, 3, 58, mix(tone, '#c8ccec', 0.25)); g.solid(x + 3, y + 58, 122, 3, mix(tone, '#0a0a14', 0.5));
        for (let k = 0; k < 6; k++) blot(g, x + g.rnd(8, 118), y + g.rnd(8, 56), g.rnd(3, 9), pick(g, ['#2e3040', '#7a7c92']), 130);
      }
      for (let r = 0; r < 4; r++) { g.solid(0, r * 64, 256, 3, '#1c1e32'); wash(g, 0, r * 64 + 3, 256, 2, '#6a60e0', 130); }
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { const x = c * 64 + (r % 2) * 32 - 32 + 64; g.solid(((x % 256) + 256) % 256, r * 64, 3, 64, '#1c1e32'); }
    }),
  },
  // ---- the approach's floor: big flagstones, worn pale in the middle of each, a pale inlaid line ---------------------------------------------------------------------------------------------------------------------------------------------------
  floor_approach_a: {
    seed: 9421, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3e4052'); g.solid(0, 0, 256, 256, '#3e4052');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const x = c * 128, y = r * 128, t = pick(g, ['#4c4e62', '#444658', '#545668']); g.solid(x + 3, y + 3, 122, 122, t); for (let k = 0; k < 8; k++) blot(g, x + g.rnd(10, 118), y + g.rnd(10, 118), g.rnd(14, 40), mix(t, '#8a8ca8', 0.3), 70); }
      for (let i = 0; i <= 2; i++) { g.solid(i * 128 - 2, 0, 4, 256, '#14162a'); g.solid(0, i * 128 - 2, 256, 4, '#14162a'); }
      g.solid(0, 62, 256, 3, '#9a9cc4'); g.solid(0, 190, 256, 3, '#9a9cc4');
      for (let i = 0; i < 24; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 6), '#1a1c2e', 150);
    }),
  },
  // ---- the stair's wall: black-indigo basalt in tall panels, a long seam of white light down each joint, arched relief ------------------------------------------------------------------------------------------------------------------------------
  wall_stair_a: {
    seed: 9422, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#1a1a34'); g.solid(0, 0, 256, 256, '#1a1a34');
      for (let i = 0; i < 16; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#22224a', '#12122a', '#2a2a58']), 120);
      for (let c = 0; c < 2; c++) { const x = c * 128; g.solid(x + 10, 24, 108, 232, '#20204a'); g.tile((dx, dy) => { g.p.push(); g.p.noFill(); g.p.stroke(70, 70, 140, 200); g.p.strokeWeight(3); g.p.arc(x + 64 + dx - 128, 78 + dy - 128, 90, 110, Math.PI, 0); g.p.pop(); }); g.solid(x + 19, 78, 3, 170, '#464690'); g.solid(x + 106, 78, 3, 170, '#464690'); }
      for (const x of [0, 128]) { g.solid(x, 0, 6, 256, '#06061a'); g.solid(x + 6, 0, 2, 256, '#e8f0ff'); wash(g, x + 8, 0, 6, 256, '#8aa0ff', 90); }                                  // the seam of light
      for (let i = 0; i < 24; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 5), '#c8d4ff', g.rnd(40, 120));
    }),
  },
  // ---- the stair's floor: slabs of dark indigo stone, faint concentric light in the joints, scuffed pale where feet have gone ------------------------------------------------------------------------------------------------------------------------
  floor_stair_a: {
    seed: 9423, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#161630'); g.solid(0, 0, 256, 256, '#161630');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const x = c * 128, y = r * 128, t = pick(g, ['#1e1e44', '#1a1a3c', '#242454']); g.solid(x + 3, y + 3, 122, 122, t); for (let k = 0; k < 6; k++) blot(g, x + g.rnd(10, 118), y + g.rnd(10, 118), g.rnd(14, 40), '#3a3a78', 70); }
      for (let i = 0; i <= 2; i++) { g.solid(i * 128 - 2, 0, 4, 256, '#0a0a1c'); wash(g, i * 128 + 2, 0, 2, 256, '#9aa8ff', 120); g.solid(0, i * 128 - 2, 256, 4, '#0a0a1c'); wash(g, 0, i * 128 + 2, 256, 2, '#9aa8ff', 120); }
      for (let i = 0; i < 20; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 6), '#8a90c8', 70);
    }),
  },
  // ---- the Gate's wall: white marble in tall panels, black inlay bands, a thin gold ring at the heart of each panel ---------------------------------------------------------------------------------------------------------------------------------
  wall_gate_a: {
    seed: 9424, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#e8e8ee'); g.solid(0, 0, 256, 256, '#e8e8ee');
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 100), pick(g, ['#f4f4f8', '#d8d8e2', '#ececf2']), 110);
      for (let i = 0; i < 6; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-50, 50), y + g.rnd(30, 90), '#9a9aaa', g.rnd(0.8, 1.8), 120); }                   // marble veining
      for (const y of [0, 128]) { g.solid(0, y, 256, 10, '#101014'); g.solid(0, y + 10, 256, 2, '#c8a85a'); }
      for (const x of [0, 128]) { g.solid(x, 0, 6, 256, '#101014'); }
      for (const [cx, cy] of [[64, 64], [192, 64], [64, 192], [192, 192]]) g.tile((dx, dy) => { g.p.push(); g.p.noFill(); g.p.stroke(200, 168, 90, 230); g.p.strokeWeight(3); g.p.ellipse(cx + dx - 128, cy + dy - 128, 44, 44); g.p.stroke(16, 16, 20, 255); g.p.strokeWeight(1.5); g.p.ellipse(cx + dx - 128, cy + dy - 128, 56, 56); g.p.pop(); });
    }),
  },
  // ---- the Gate's floor: black polished stone with white rings inlaid (the arena is round), a fine star of lines ----------------------------------------------------------------------------------------------------------------------------------
  floor_gate_a: {
    seed: 9425, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#0e0e12'); g.solid(0, 0, 256, 256, '#0e0e12');
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(50, 110), pick(g, ['#16161c', '#08080c', '#1c1c24']), 110);
      for (const r of [60, 120, 180, 240]) g.tile((dx, dy) => { g.p.push(); g.p.noFill(); g.p.stroke(232, 232, 240, 210); g.p.strokeWeight(r === 120 ? 4 : 2); g.p.ellipse(128 + dx - 128, 128 + dy - 128, r, r); g.p.pop(); });
      for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; ink(g, 128, 128, 128 + Math.cos(t) * 200, 128 + Math.sin(t) * 200, '#e8e8f0', 1, 90); }
      for (let i = 0; i < 24; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 3), '#ffffff', g.rnd(60, 140));
    }),
  },
  // ---- the Gate's sky: black with a few stars; at the horizon a wall of white light, rays standing up out of it ---------------------------------------------------------------------------------------------------------------------------------
  sky_gate: {
    seed: 9426, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#02020a'); gradient(g, w, h, [[0, '#010106'], [0.55, '#06061a'], [0.78, '#2a2a6a'], [0.9, '#9aa0e8'], [1, '#ffffff']]);
      for (let i = 0; i < 160; i++) { const d = g.rnd(1.1, 2.8); skyBlot(g, g.rnd(0, w), g.rnd(0, 170), d, d, pick(g, ['#ffffff', '#cfd8ff']), g.rnd(100, 230)); }
      for (let i = 0; i < 26; i++) { const x = g.rnd(0, w), len = g.rnd(40, 150); ink(g, x, h, x + g.rnd(-6, 6), h - len, '#ffffff', g.rnd(2, 7), g.rnd(30, 90)); }
      skyBlot(g, 256, 252, 420, 70, '#ffffff', 90); skyBlot(g, 256, 254, 200, 36, '#ffffff', 160);
    }),
  },
  // ---- the light from below (the shaft of the Hollow Stair): at the horizon indigo, going down to a blinding white at the nadir; rays and a ring -----------------------------------------------------------------------------------------------
  sky_gate_below: {
    seed: 9427, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#ffffff'); gradient(g, w, h, [[0, '#9aa0e8'], [0.18, '#c8ccff'], [0.5, '#f0f0ff'], [1, '#ffffff']]);
      for (let i = 0; i < 40; i++) { const x = g.rnd(0, w), len = g.rnd(50, 200); ink(g, x, 0, x + g.rnd(-30, 30), len, '#6a70d0', g.rnd(2, 8), g.rnd(30, 80)); }
      for (let r = 40; r < 400; r += 70) skyBlot(g, 256, 230, r * 1.6, r * 0.5, '#8a90e0', 28);
      skyBlot(g, 256, 250, 260, 90, '#ffffff', 255);
    }),
  },
};
