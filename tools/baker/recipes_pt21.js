// PT-021 material pass: wall textures that SUPERSEDE the earlier recipe of the same id (tools/baker/all.js spreads this file last). The outside critique was right that "the surfaces are one recipe in different colours":
// every earlier wall used the same ingredients (translucent blooms, short white dashes, black dash scratches, dots) in different colours. Here each material is built from what that material really does: corrugated sheet has ribs,
// laps and bolts with rust weeping from the bolts and salt crusting from the bottom; plaster falls off in patches and shows brick; boards have grain, knots and nails; iron has plates, welds, rivets and a painted hazard band;
// concrete has form joints, tie holes and spalls. Big shapes and strong value steps first (the game renders at about 480 px wide and bands the value, so fine lines vanish at distance), small marks last.
// Same conventions as recipes_g2.js: opaque, tiling (g.tile paints at 9 wrapped offsets), top-left px. Translucent washes and ellipses are plain p5 (`g.p`) so they do not depend on brush's scatter.
import { R } from './recipes.js';
import { hex, mix } from './paint_util.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
// (g.p works in a frame centred on the canvas: x + dx - width / 2)
const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };
/** a translucent rectangle, an ellipse and a straight ink line, each repeated at the nine wrapped offsets */
const wash = (g, x, y, w, h, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.rect(x + dx - g.p.width / 2, y + dy - g.p.height / 2, w, h); g.p.pop(); });
const blot = (g, x, y, d, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, d, d); g.p.pop(); });
const ink = (g, x1, y1, x2, y2, c, wt, a = 255) => g.tile((dx, dy) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 + dx - g.p.width / 2, y1 + dy - g.p.height / 2, x2 + dx - g.p.width / 2, y2 + dy - g.p.height / 2); g.p.pop(); });
/** an irregular stain: a cluster of small blots round (x, y), not one round disc */
const stain = (g, x, y, r, cols, a, n = 9) => { for (let i = 0; i < n; i++) { const t = g.rnd(0, Math.PI * 2), d = r * Math.sqrt(g.rnd(0, 1)); blot(g, x + Math.cos(t) * d, y + Math.sin(t) * d * 0.8, r * g.rnd(0.22, 0.6), pick(g, cols), a * g.rnd(0.6, 1)); } };

export const recipesPT21 = {
  // ---- Episode 2: galvanised corrugated sheet (pump houses, kennels, the guardhouse, fences) -------------------------------------------------------------------
  wall_corrugated_a: {
    seed: 9102, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#7c8688'); g.solid(0, 0, 256, 256, '#7c8688');
      const rw = 16;
      for (const [base, y0] of [['#76817f', 0], ['#8e9899', 128]]) {                                       // two overlapped sheets, each with its own tone
        for (let c = 0; c < 16; c++) {
          const x = c * rw;
          g.solid(x, y0, 3, 128, mix(base, '#1c2628', 0.6));                                                 // the trough, in shadow
          g.solid(x + 3, y0, 4, 128, mix(base, '#b4bebc', 0.18));                                            // the rising flank
          g.solid(x + 7, y0, 4, 128, mix(base, '#f4f8f4', 0.55));                                            // the crest, in light
          g.solid(x + 11, y0, 5, 128, mix(base, '#323d3a', 0.38));                                           // the falling flank, turned from the light
        }
        wash(g, 0, y0, 256, 26, '#0e1618', 78); wash(g, 0, y0 + 22, 256, 22, '#0e1618', 34);                // soot and rain shadow under each lap
        wash(g, 0, y0 + 92, 256, 36, '#dcd8c4', 56);                                                          // salt, drawn up from the ground by the sheet
      }
      for (let i = 0; i < 8; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(44, 96), pick(g, ['#1e282a', '#e4e8e0']), 36);       // large soft tone, so a long wall is not one value
      for (const y0 of [0, 128]) for (const by of [y0 + 9, y0 + 119]) for (let c = 0; c < 16; c += 2) {      // bolts through the crests, rust weeping from them
        const x = c * rw + 9;
        blot(g, x, by, 5.6, '#171f21', 255); blot(g, x - 0.7, by - 0.7, 3.4, '#cdd6d3', 255);
        if (by > y0 + 100 || g.rnd(0, 1) > 0.55) ink(g, x, by + 3, x + g.rnd(-1.6, 1.6), by + g.rnd(18, 58), '#9a5a2e', 1.8, 175);
      }
      for (let i = 0; i < 12; i++) stain(g, g.rnd(0, 256), pick(g, [0, 128]) + g.rnd(80, 126), g.rnd(10, 26), ['#8a4e28', '#a8643a', '#6e3c20'], 140);   // rust where the water sits
      for (let i = 0; i < 340; i++) blot(g, g.rnd(0, 256), pick(g, [0, 128]) + 128 * Math.sqrt(g.rnd(0, 1)), g.rnd(1.2, 3.4), '#f6f4ea', g.rnd(120, 230));                // salt crust, thickest at the foot
      for (const y of [0, 128]) { ink(g, 0, y + 1, 256, y + 1, '#0a1012', 2.6); wash(g, 0, y + 3, 256, 3, '#f2f6f2', 120); }            // the lap: a shadow and a lit edge
    }),
  },

  // ---- plaster: Customs Hall, Signal House (the wainscot sits at the bottom of the tile, the plaster above it must not repeat up a tall wall) ----------------------
  wall_plaster_a: {
    seed: 7201, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#cdc3a4'); g.solid(0, 0, 256, 150, '#cfc6a8'); g.solid(0, 150, 256, 106, '#3d5c4a');
      for (let i = 0; i < 28; i++) blot(g, g.rnd(0, 256), g.rnd(0, 150), g.rnd(26, 70), pick(g, ['#e4dcc2', '#b8ae8e', '#a89e80', '#d8cfb2']), g.rnd(40, 90));        // the plaster's own mottling
      { let h = 24; for (let x = 0; x < 256; x += 4) { h = Math.min(44, Math.max(12, h + g.rnd(-3, 3))); wash(g, x, 150 - h, 5, h, '#a89a72', 66); wash(g, x, 150 - h, 5, 2, '#85774f', 150); } }   // rising damp: a tide mark with a hard top edge
      for (const [cx, cy, rx, ry] of [[62, 56, 34, 26], [182, 38, 26, 30], [150, 108, 30, 20]]) {            // plaster fallen away: the brick underneath, with a lit lip and a shadowed lip
        const pts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx * g.rnd(0.72, 1.12), cy + Math.sin(a) * ry * g.rnd(0.72, 1.12)]); }
        g.blob(pts.map(([x, y]) => [x + 2.5, y + 3]), '#3a2a22', { a: 150, curv: 0.4, ink: false });        // the shadow the lip throws
        g.blob(pts, '#5e5244', { a: 255, curv: 0.4, out: '#2a1a14', wt: 1.5 });                                  // the mortar
        for (let r = -4; r <= 4; r++) for (let q = -4; q <= 4; q++) { const bx = cx + q * 16 + (r % 2) * 8, by = cy + r * 8; if (((bx - cx) / (rx * 0.92)) ** 2 + ((by - cy) / (ry * 0.92)) ** 2 < 1) g.solid(bx - 7, by - 3, 14, 6, pick(g, ['#8e4a38', '#7a3e2e', '#9c5842', '#6e3828'])); }   // the brick under the plaster
        let ax = cx + rx * 0.9, ay = cy; for (let k = 0; k < 4; k++) { const bx = ax + g.rnd(6, 14), by = ay + g.rnd(-12, 12); ink(g, ax, ay, bx, by, '#5a4c3a', 1.3, 210); ax = bx; ay = by; }      // a crack that runs on from the patch
      }
      for (let i = 0; i < 6; i++) { const x = g.rnd(8, 248), y = g.rnd(12, 120); ink(g, x, y, x + g.rnd(-6, 6), y + g.rnd(20, 50), '#8a7c58', 3, 70); }                              // a long water stain
      g.solid(0, 146, 256, 5, '#e4dcc2'); wash(g, 0, 151, 256, 8, '#0c1a14', 110);                         // the chair rail and its shadow
      for (let x = 0; x < 256; x += 64) { ink(g, x + 1, 160, x + 1, 256, '#1e3228', 2.2); ink(g, x + 3, 160, x + 3, 256, '#6c8a76', 1.0, 150); }   // panel grooves
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(160, 256), g.rnd(5, 12), pick(g, ['#9ab8a2', '#c8d4c0']), 150);           // chips down to the primer
      wash(g, 0, 216, 256, 40, '#0a1610', 70);                                                                // the foot, scuffed dark
    }),
  },

  // ---- weathered siding: fishing sheds, cellars, ferry cabins, the market ----------------------------------------------------------------------------------------
  wall_timber_a: {
    seed: 7101, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3a3028'); g.solid(0, 0, 256, 256, '#3a3028');
      const n = 8, cw = 32;
      for (let c = 0; c < n; c++) {
        const x = c * cw, base = pick(g, ['#6a5c4a', '#5e5242', '#76684f', '#544838', '#827458']);
        g.solid(x + 1, 0, cw - 2, 256, base);
        wash(g, x + 1, 0, cw - 2, 70, '#d8cfb8', 34);                                                         // sun-silvered at the top
        for (let k = 0; k < 7; k++) { const gx = x + g.rnd(3, cw - 3); let y = g.rnd(-30, 0); while (y < 256) { const len = g.rnd(30, 84); ink(g, gx, y, gx + g.rnd(-1.4, 1.4), y + len, mix(base, '#160e08', 0.55), 1.0, 160); y += len + g.rnd(2, 20); } }   // grain
        for (let k = 0; k < 2; k++) { const gx = x + g.rnd(4, cw - 4), y = g.rnd(0, 200); ink(g, gx, y, gx, y + g.rnd(24, 60), mix(base, '#f0e6cc', 0.4), 1.2, 140); }                                    // a lit fibre
        if (g.rnd(0, 1) > 0.42) { const kx = x + g.rnd(9, cw - 9), ky = g.rnd(24, 230), kd = g.rnd(8, 13); blot(g, kx, ky, kd + 5, mix(base, '#140e08', 0.35), 130); blot(g, kx, ky, kd, mix(base, '#140e08', 0.6), 225); blot(g, kx - 0.8, ky - 0.8, kd * 0.45, mix(base, '#2a2016', 0.5), 255); }   // a knot with its swirl
        for (const ny of [22, 128, 234]) { blot(g, x + 5, ny + 1, 4.4, '#14100a', 255); blot(g, x + 5, ny, 2.8, '#b8ac94', 255); blot(g, x + cw - 5, ny + 1, 4.4, '#14100a', 255); blot(g, x + cw - 5, ny, 2.8, '#b8ac94', 255);
          ink(g, x + 5, ny + 3, x + 5, ny + g.rnd(14, 34), '#5a3a26', 1.4, 120); }                              // nail heads and their rust runs
      }
      for (let c = 0; c <= n; c++) { g.solid(c * cw - 1, 0, 2, 256, '#0e0a06'); if (c < n) wash(g, c * cw + 1, 0, 2, 256, '#0e0a06', 90); }       // the gaps and the shadow inside each
      wash(g, 0, 196, 256, 60, '#0c0a08', 80); wash(g, 0, 224, 256, 32, '#0c0a08', 60);                       // damp and dirt at the foot
      for (let i = 0; i < 90; i++) blot(g, g.rnd(0, 256), 190 + 66 * Math.sqrt(g.rnd(0, 1)), g.rnd(1.2, 3), '#e8e4d4', g.rnd(110, 210));     // salt
      for (let i = 0; i < 5; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 80), pick(g, ['#14100a', '#d8cfb8']), 30);
    }),
  },

  // ---- riveted iron plate: ferry, gantries, signal house ---------------------------------------------------------------------------------------------------------
  wall_iron_a: {
    seed: 7401, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2e3438'); g.solid(0, 0, 256, 256, '#2e3438');
      const tones = ['#4a5156', '#3c4347', '#545b60', '#343b3f'];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
        const x = c * 128, y = r * 128, t = tones[(r * 2 + c + Math.floor(g.rnd(0, 2))) % 4];
        g.solid(x + 3, y + 3, 122, 122, t); wash(g, x + 3, y + 3, 122, 14, '#d8e0e4', 26); wash(g, x + 3, y + 100, 122, 25, '#0a0e10', 62);        // lit top, shaded lower edge: a plate with some thickness
        blot(g, x + g.rnd(30, 98), y + g.rnd(30, 98), g.rnd(50, 90), pick(g, ['#1a2024', '#7a8488']), 26);                                       // the plate is not flat: a belly of light or dark
      }
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { ink(g, x, y, x + 128, y, '#0a0e10', 2.4); ink(g, x, y, x, y + 128, '#0a0e10', 2.4); ink(g, x + 3, y + 3, x + 125, y + 3, '#a8b2b6', 1.0, 150); }   // seams with a weld bead
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) for (const [ox, oy] of [[11, 11], [43, 11], [85, 11], [117, 11], [11, 117], [43, 117], [85, 117], [117, 117], [11, 64], [117, 64]]) {
        const x = c * 128 + ox, y = r * 128 + oy;
        blot(g, x + 0.8, y + 1.2, 6.4, '#080b0d', 255); blot(g, x, y, 5.2, '#7e888c', 255); blot(g, x - 0.8, y - 0.8, 2.4, '#dce4e6', 255);          // a rivet: shadow, dome, glint
        ink(g, x, y + 3, x + g.rnd(-1, 1), y + g.rnd(14, 50), '#9a5a2e', 2.0, 150);                                                              // rust running down from it
      }
      for (let k = 0; k < 11; k++) { const x0 = -8 + k * 26;                                                                                  // a faded hazard band across the lower plates
        g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, k % 2 ? '#c8a42c' : '#16181a', 150); g.p.quad(x0 + dx - g.p.width / 2, 214 + dy - g.p.height / 2, x0 + 13 + dx - g.p.width / 2, 214 + dy - g.p.height / 2, x0 + 30 + dx - g.p.width / 2, 244 + dy - g.p.height / 2, x0 + 17 + dx - g.p.width / 2, 244 + dy - g.p.height / 2); g.p.pop(); }); }
      wash(g, 0, 214, 256, 30, '#14181a', 36);
      for (let i = 0; i < 14; i++) stain(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(10, 28), ['#8a4e28', '#a8643a', '#6e3c20'], 130, 10);      // rust bloom
      for (let i = 0; i < 4; i++) blot(g, g.rnd(0, 256), 226 + g.rnd(0, 30), g.rnd(16, 34), '#d6d2c0', 50);                                      // salt tide
    }),
  },

  // ---- poured concrete: ferry terminal, signal house exterior ---------------------------------------------------------------------------------------------------
  wall_concrete_a: {
    seed: 7301, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#8a8a84'); g.solid(0, 0, 256, 256, '#8a8a84');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {                                              // four form panels, each poured on its own: a different grey
        const x = c * 128, y = r * 128; g.solid(x + 2, y + 2, 124, 124, pick(g, ['#8e8e88', '#82827c', '#979790', '#7a7a76']));
        for (let k = 0; k < 7; k++) ink(g, x + 2, y + 10 + k * 18, x + 126, y + 10 + k * 18 + g.rnd(-0.6, 0.6), '#5a5a56', 1.0, 90);              // the board marks of the formwork
      }
      for (let i = 0; i < 160; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.2, 3.2), pick(g, ['#4e4e4a', '#b4b4ac', '#6a6a64']), g.rnd(110, 200));   // the aggregate
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { ink(g, x, y, x + 128, y, '#2e2e2c', 2.6); ink(g, x, y, x, y + 128, '#2e2e2c', 2.6); wash(g, x + 2, y + 2, 124, 4, '#c8c8c0', 70); }          // form joints and a lit lip
      for (const x of [40, 88, 168, 216]) for (const y of [32, 96, 160, 224]) {                              // tie holes, rust weeping from some of them
        blot(g, x, y, 8, '#34342f', 255); blot(g, x, y, 4.4, '#101010', 255); blot(g, x - 0.6, y - 0.6, 8, '#b8b8b0', 0);
        if (g.rnd(0, 1) > 0.4) ink(g, x, y + 3, x + g.rnd(-2, 2), y + g.rnd(24, 80), '#a05a30', 2.6, 150);
      }
      for (const [cx, cy, rx, ry] of [[70, 70, 26, 20], [200, 180, 22, 26]]) {                               // spalling: the cover has come off and the rebar shows
        const pts = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx * g.rnd(0.7, 1.15), cy + Math.sin(a) * ry * g.rnd(0.7, 1.15)]); }
        g.blob(pts, '#5c5a54', { a: 255, curv: 0.35, out: '#1e1e1c', wt: 1.5 });
        for (let k = -1; k <= 1; k++) ink(g, cx - rx * 0.8, cy + k * 9, cx + rx * 0.8, cy + k * 9, '#a8582a', 2.4, 235);
        stain(g, cx, cy - ry * 0.3, rx * 0.8, ['#2e2c28', '#3a3834'], 90, 8);
      }
      for (let i = 0; i < 8; i++) { const x = g.rnd(0, 256); ink(g, x, 0, x + g.rnd(-5, 5), g.rnd(40, 120), '#e8e8e0', 3.2, 70); }       // efflorescence: white streaks from the top
      wash(g, 0, 0, 256, 34, '#1c1c1a', 62);                                                                  // soot at the head
      wash(g, 0, 214, 256, 42, '#3a4a34', 60); for (let i = 0; i < 26; i++) blot(g, g.rnd(0, 256), 214 + g.rnd(0, 42), g.rnd(4, 12), '#4a6a3a', 90);  // green at the foot
    }),
  },
  // ---- Episode 2: salt-caked brick (the works' boundary walls, kiln stacks, the gatehouse) -------------------------------------------------------------------------
  wall_saltbrick_a: {
    seed: 9101, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#4a4638'); g.solid(0, 0, 256, 256, '#4a4638');                                                   // dark mortar shows through the joints
      const rows = 8, rh = 32, joints = [];
      for (let r = 0; r < rows; r++) {
        let x = -(r % 2) * 22 - g.rnd(0, 6);
        while (x < 256) { const w = g.rnd(38, 52), xx = x, rr = r, tone = pick(g, ['#b6b2a0', '#c2beac', '#a8a494', '#cac6b4', '#9c9888']); g.solid(xx + 2, rr * rh + 2, w - 4, rh - 4, tone); if (xx + w > 254) g.solid(xx - 256 + 2, rr * rh + 2, w - 4, rh - 4, tone); wash(g, xx + 2, rr * rh + rh - 9, w - 4, 7, '#2e2a20', 40); joints.push([xx, rr]); x += w; }
      }
      for (let r = 0; r < rows; r++) ink(g, 0, r * rh, 256, r * rh, '#2a261c', 1.6);
      for (const [x, r] of joints) ink(g, x, r * rh, x, r * rh + rh, '#2a261c', 1.4);
      for (let r = 0; r < rows; r++) wash(g, 0, r * rh + 2, 256, 2, '#e4e0cc', 60);                         // the lit top edge of every course
      wash(g, 0, 150, 256, 106, '#f2f0e4', 58); wash(g, 0, 196, 256, 60, '#f4f2e8', 70);                    // the salt crust rises from the ground
      for (let i = 0; i < 16; i++) stain(g, g.rnd(0, 256), 140 + 116 * Math.sqrt(g.rnd(0, 1)), g.rnd(10, 26), ['#f6f4ea', '#e6e4d6', '#dcdac8'], 170, 9);        // efflorescence: crystalline patches
      for (let i = 0; i < 7; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 170); ink(g, x, y, x + g.rnd(-3, 3), y + g.rnd(24, 60), '#a8582a', 2.0, 130); }          // rust weeping from the joints
      for (let i = 0; i < 5; i++) stain(g, g.rnd(0, 256), g.rnd(0, 90), g.rnd(14, 30), ['#2a261c', '#3a362a'], 70, 8);                                       // soot
      for (let i = 0; i < 160; i++) blot(g, g.rnd(0, 256), g.rnd(110, 256), g.rnd(1, 2.6), '#fffef4', g.rnd(150, 240));                                      // salt glitter
    }),
  },

  // ---- Episode 2: kiln brick: black, fire-cracked, the mortar glowing ------------------------------------------------------------------------------------------------
  wall_kiln_a: {
    seed: 9301, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#1a1612'); g.solid(0, 0, 256, 256, '#1a1612');
      const rows = 8, rh = 32;
      for (let r = 0; r < rows; r++) {
        let x = -(r % 2) * 20 - g.rnd(0, 6);
        while (x < 256) { const w = g.rnd(36, 50), xx = x, tone = pick(g, ['#2e2620', '#3a2e24', '#262018', '#42342a', '#221c16']); g.solid(xx + 2, r * rh + 2, w - 4, rh - 4, tone); if (xx + w > 254) g.solid(xx - 256 + 2, r * rh + 2, w - 4, rh - 4, tone); wash(g, xx + 2, r * rh + 2, w - 4, 6, '#d8c8a8', 26); x += w; }
      }
      for (let i = 0; i < 26; i++) { const y = pick(g, [0, 1, 2, 3, 4, 5, 6, 7, 8]) * rh, x = g.rnd(0, 256), l = g.rnd(18, 46);                                 // the fire in the joints: a glow, then a hot line
        ink(g, x, y, x + l, y, '#d8541c', 5, 70); ink(g, x, y, x + l, y, '#ff9a3a', 2.2, 235); ink(g, x + l * 0.5, y, x + l * 0.5, y + g.rnd(10, 28), '#ff8a2a', 1.6, 200); }
      for (let i = 0; i < 12; i++) { let x = g.rnd(0, 256), y = g.rnd(0, 256); for (let k = 0; k < 4; k++) { const nx = x + g.rnd(-12, 12), ny = y + g.rnd(8, 18); ink(g, x, y, nx, ny, '#0a0806', 1.8, 230); x = nx; y = ny; } }   // heat cracks
      for (let i = 0; i < 6; i++) stain(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(18, 36), ['#0a0806', '#14100c'], 90, 9);                                                    // soot
      wash(g, 0, 214, 256, 42, '#e4d8c0', 38);                                                                                                                       // ash, settled low
      for (let i = 0; i < 120; i++) blot(g, g.rnd(0, 256), 190 + 66 * Math.sqrt(g.rnd(0, 1)), g.rnd(1, 2.4), '#e8e0cc', g.rnd(90, 170));
    }),
  },

  // ---- Episode 2: frosted steel (the rime vault) -------------------------------------------------------------------------------------------------------------------
  wall_rime_a: {
    seed: 9302, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#7e94a6'); g.solid(0, 0, 256, 256, '#7e94a6');
      const tones = ['#9ab0c2', '#8aa0b4', '#a6bccc', '#7c92a6'];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const x = c * 128, y = r * 128; g.solid(x + 3, y + 3, 122, 122, pick(g, tones)); wash(g, x + 3, y + 3, 122, 12, '#f4faff', 60); wash(g, x + 3, y + 104, 122, 21, '#2a4254', 56); }
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { ink(g, x, y, x + 128, y, '#16242e', 2.4); ink(g, x, y, x, y + 128, '#16242e', 2.4); }
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) for (const [ox, oy] of [[11, 11], [117, 11], [11, 117], [117, 117]]) { const x = c * 128 + ox, y = r * 128 + oy; blot(g, x + 0.8, y + 1, 6, '#0c1620', 255); blot(g, x, y, 4.8, '#b6c8d6', 255); blot(g, x - 0.7, y - 0.7, 2, '#ffffff', 255); }
      for (const [x, y, dx, dy] of [[0, 0, 1, 1], [256, 0, -1, 1], [0, 256, 1, -1], [256, 256, -1, -1], [128, 0, 1, 1], [128, 256, 1, -1]]) {      // frost ferns growing from the corners and the seams
        let px = x, py = y; for (let k = 0; k < 7; k++) { const nx = px + dx * g.rnd(8, 18), ny = py + dy * g.rnd(6, 16); ink(g, px, py, nx, ny, '#f4faff', 2.2, 230);
          for (const sgn of [-1, 1]) ink(g, nx, ny, nx + sgn * g.rnd(5, 12), ny + dy * g.rnd(2, 10), '#e6f2fa', 1.2, 200); px = nx; py = ny; }
      }
      for (let i = 0; i < 12; i++) stain(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 32), ['#f4faff', '#dcecf6'], 110, 9);                       // rime thickening in patches
      for (let i = 0; i < 200; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1, 2.6), '#ffffff', g.rnd(130, 230));                            // crystals
    }),
  },

  // ---- the Vael's growth: bone ribs over a dark wet membrane, veins, sacs (the alien wall; not violet, not a sheet of lightning) -----------------------------------------
  wall_resin_a: {
    seed: 7501, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#15282a'); g.solid(0, 0, 256, 256, '#15282a');
      for (let i = 0; i < 18; i++) stain(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(26, 56), ['#1c3a38', '#102022', '#244a42', '#2a3a2a'], 120, 7);        // the membrane's mottling
      for (const x0 of [24, 96, 168, 232]) {                                                                 // ribs: bone-coloured, bowed, thicker in the middle, with a lit edge and a shadow
        const A = g.rnd(8, 16), ph = g.rnd(0, 6.28);
        for (let y = -8; y < 264; y += 4) {
          const t = y / 256, w = 8 + 8 * Math.sin(Math.PI * ((y % 256 + 256) % 256) / 256), x = x0 + A * Math.sin(t * Math.PI * 2 + ph), x2 = x0 + A * Math.sin((y + 4) / 256 * Math.PI * 2 + ph);
          ink(g, x + 3, y, x2 + 3, y + 4, '#06100e', w + 4, 150);                                              // the shadow it throws
          ink(g, x, y, x2, y + 4, '#a89a6e', w, 255); ink(g, x - w * 0.22, y, x2 - w * 0.22, y + 4, '#d8c898', w * 0.34, 255); ink(g, x + w * 0.32, y, x2 + w * 0.32, y + 4, '#6a5c40', w * 0.28, 255);
        }
      }
      for (let i = 0; i < 14; i++) { let x = g.rnd(0, 256), y = g.rnd(0, 256); const col = pick(g, ['#d8a040', '#40e0c8', '#d8a040']); for (let k = 0; k < 5; k++) { const nx = x + g.rnd(-18, 18), ny = y + g.rnd(6, 20); ink(g, x, y, nx, ny, col, 1.5, 210); x = nx; y = ny; } }        // veins
      for (let i = 0; i < 9; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), d = g.rnd(12, 24); blot(g, x + 1.5, y + 2, d + 3, '#06100e', 170); blot(g, x, y, d, pick(g, ['#7a9a3a', '#9ab04a', '#6a8a3a']), 235); blot(g, x - d * 0.2, y - d * 0.25, d * 0.34, '#f0f8c8', 220); }      // sacs: a wet skin and a highlight
      for (let i = 0; i < 70; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.2, 2.8), '#e8fff0', g.rnd(120, 220));                           // wet glints
    }),
  },

  // ---- the harbour bulkhead (the default wall): teal steel plates, the tide line, barnacles, algae at the foot ------------------------------------------------------------
  wall_bulkhead_a: {
    seed: 1101, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2b3a3f'); g.solid(0, 0, 256, 256, '#2b3a3f');
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
        const x = col * 128 + (row % 2) * 64, y = row * 64, tone = pick(g, ['#3a5258', '#334a50', '#40595e', '#2e444a']);
        g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); const [r, gg, b] = hex(tone); g.p.fill(r, gg, b, 255); g.p.rect(x + 3 + dx - g.p.width / 2, y + 3 + dy - g.p.height / 2, 122, 58); g.p.pop(); });
        wash(g, x + 3, y + 3, 122, 8, '#c8e0e0', 34); wash(g, x + 3, y + 44, 122, 17, '#0a1618', 60);
      }
      for (let row = 0; row < 4; row++) ink(g, 0, row * 64, 256, row * 64, '#0c1618', 2.2);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) { const x = col * 128 + (row % 2) * 64; ink(g, x, row * 64, x, row * 64 + 64, '#0c1618', 2.0); }
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) { const x = col * 128 + (row % 2) * 64; for (const [ox, oy] of [[9, 9], [117, 9], [9, 53], [117, 53]]) { blot(g, x + ox + 0.6, row * 64 + oy + 0.9, 5, '#08100f', 255); blot(g, x + ox, row * 64 + oy, 4, '#8aa4a2', 255); blot(g, x + ox - 0.6, row * 64 + oy - 0.6, 1.6, '#e0f0ee', 255); } }
      for (let i = 0; i < 14; i++) stain(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(12, 28), ['#a8582a', '#7a3a1a', '#c9743a'], 120, 9);                       // rust
      wash(g, 0, 150, 256, 106, '#0a1a1c', 66); ink(g, 0, 150, 256, 150, '#d8d4c0', 1.6, 120);                                                          // the tide line: wet and dark below it
      for (let i = 0; i < 110; i++) { const x = g.rnd(0, 256), y = 168 + 88 * Math.sqrt(g.rnd(0, 1)), d = g.rnd(3, 7); blot(g, x, y + 1, d + 1.5, '#0a100e', 200); blot(g, x, y, d, '#c6c2ae', 235); blot(g, x, y, d * 0.42, '#3a3a30', 235); }   // barnacles
      wash(g, 0, 226, 256, 30, '#2a4a2c', 82); for (let i = 0; i < 30; i++) stain(g, g.rnd(0, 256), 226 + g.rnd(0, 30), g.rnd(6, 14), ['#3a6a38', '#4a7a3c'], 120, 5);                          // algae
    }),
  },

  // ---- skies: Episode 2 gets its own (the pink-lilac overcast was the default of the whole game). Painted the way the earlier skies are: soft brush bands, then soft brush clouds that wrap -------------------
  sky_bleach: {                                               // the salt works at noon: a white-grey glare, a sick yellow-green haze at the horizon, thin high cloud
    seed: 8401, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.noStroke(); g.bleed(0.9, 'out');
      ['#b4bcbc', '#c2c9c8', '#d0d5d0', '#dcdfd2', '#e6e6d0', '#eae8c8', '#e2dfba'].forEach((c, i) => { g.fill(c, 250); g.rect(-10, i * 40 - 10, w + 20, 56); });
      for (let i = 0; i < 30; i++) { const x = g.rnd(0, w), y = g.rnd(10, 190), r = g.rnd(34, 96); g.tile((dx) => { g.fill(pick(g, ['#ffffff', '#c8d0d0', '#eef0e6', '#a8b2b2']), g.rnd(40, 100)); g.circle(x + dx, y, r); }); }
      for (let i = 0; i < 8; i++) { const y = g.rnd(50, 200); g.stroke('marker', '#f4f6ee', 0.8); g.line(0, y, w, y + g.rnd(-10, 10)); }
    }),
  },
  sky_ash: {                                                  // the kilns: a low brown-grey roof of smoke with a dull orange glow under it
    seed: 8402, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.noStroke(); g.bleed(0.9, 'out');
      ['#1c1816', '#26201c', '#342a24', '#4a382c', '#6a4630', '#8a5632', '#a8683a'].forEach((c, i) => { g.fill(c, 250); g.rect(-10, i * 40 - 10, w + 20, 56); });
      for (let i = 0; i < 34; i++) { const x = g.rnd(0, w), y = g.rnd(10, 230), r = g.rnd(34, 100); g.tile((dx) => { g.fill(pick(g, ['#100c0a', '#4a3a30', '#6a5040', '#2a2018', '#7a6a5c']), g.rnd(40, 100)); g.circle(x + dx, y, r); }); }
    }),
  },

  // ---- the marks that stay (PT-021 step 2): a 4 x 4 atlas of 64 px cells, transparent. Painted as dark INK stains, not red fountains: the game is painterly, not gory. Cells (DECALS.kinds in defs.js): 0-2 blood splats, 3 a bullet pock,
  // 4-6 ichor splats, 7 a drip stain, 8 a blood pool, 9 an ichor pool, 10 a scorch burst, 11 a wall scorch streak, 12 a smear (a drag), 13 claw scrapes, 14 a damp patch, 15 a soot burst. The smear and the drip are painted NEUTRAL and
  // tinted at run time (blood or ichor), so one cell serves both.
  decals_atlas: {
    seed: 9701, width: 256, height: 256, transparent: true,
    draw: R((g) => {
      const W2 = g.p.width / 2, H2 = g.p.height / 2;
      const dot = (x, y, d, c, a) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, d, d); g.p.pop(); };
      const seg = (x1, y1, x2, y2, c, wt, a = 255) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 - W2, y1 - H2, x2 - W2, y2 - H2); g.p.pop(); };
      const cellAt = (i) => [(i % 4) * 64 + 32, Math.floor(i / 4) * 64 + 32];
      const splat = (i, base, rim, hi) => {                                                                   // a body, a rim of satellite drops, streaks thrown outward, a wet highlight
        const [cx, cy] = cellAt(i), ang0 = g.rnd(0, 6.28);
        for (let k = 0; k < 4; k++) dot(cx + g.rnd(-5, 5), cy + g.rnd(-5, 5), g.rnd(14, 24), base, 235);
        for (let k = 0; k < 3; k++) dot(cx + g.rnd(-4, 4), cy + g.rnd(-4, 4), g.rnd(10, 16), rim, 150);
        for (let k = 0; k < 6; k++) { const a = ang0 + g.rnd(-1, 1) + k * 1.05, l = g.rnd(12, 27), x2 = cx + Math.cos(a) * l, y2 = cy + Math.sin(a) * l; seg(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, x2, y2, base, g.rnd(1.6, 3.4), 235); dot(x2, y2, g.rnd(3, 6), base, 235); }
        for (let k = 0; k < 13; k++) { const a = g.rnd(0, 6.28), l = g.rnd(16, 30); dot(cx + Math.cos(a) * l, cy + Math.sin(a) * l, g.rnd(1.4, 5), base, 225); }
        dot(cx - 5, cy - 6, g.rnd(4, 7), hi, 190);
      };
      for (const [i, t] of [[0, 0], [1, 1], [2, 2]]) splat(i, ['#7c1a12', '#6e1610', '#8a2016'][t], '#b02a1c', '#e0583c');
      for (const [i, t] of [[4, 0], [5, 1], [6, 2]]) splat(i, ['#12806e', '#0e7464', '#188a78'][t], '#30c0a0', '#a8ffec');
      { const [cx, cy] = cellAt(3);                                                                           // a bullet pock: the pale chips round a dark hole, hairline cracks
        for (let k = 0; k < 9; k++) { const a = k * 0.7 + g.rnd(-0.2, 0.2), l = g.rnd(9, 15); dot(cx + Math.cos(a) * l, cy + Math.sin(a) * l, g.rnd(2.6, 5), '#d6cfba', 235); }
        dot(cx, cy, 11, '#0e0c0a', 250); dot(cx - 1, cy - 1, 5, '#000000', 255);
        for (let k = 0; k < 5; k++) { const a = g.rnd(0, 6.28), l = g.rnd(12, 24); seg(cx, cy, cx + Math.cos(a) * l, cy + Math.sin(a) * l, '#1a1612', 1.1, 210); } }
      { const [cx, cy] = cellAt(7);                                                                           // a drip stain (neutral; tinted): a wash, then streaks that run down and end in a drop
        dot(cx, cy - 8, 28, '#e0e0e0', 90); dot(cx + 3, cy - 4, 20, '#c8c8c8', 140);
        for (let k = 0; k < 6; k++) { const x = cx - 14 + k * 5.6 + g.rnd(-1.5, 1.5), l = g.rnd(18, 44); seg(x, cy - 22, x + g.rnd(-1, 1), cy - 22 + l, '#d8d8d8', g.rnd(2.6, 4.6), 230); dot(x, cy - 22 + l, g.rnd(4, 6.5), '#ececec', 240); } }
      const pool = (i, base, rim, hi) => {                                                                   // a pool: a lumpy round body with lobes, a darker skin at the edge and a shine on the upper side
        const [cx, cy] = cellAt(i), lobes = [];
        for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, r = 19 + g.rnd(-3, 6) + (k % 5 === 0 ? 6 : 0); lobes.push([cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8, g.rnd(13, 20)]); }
        for (const [x, y, d] of lobes) dot(x, y, d, rim, 240);
        for (const [x, y, d] of lobes) dot(x * 0.82 + cx * 0.18, y * 0.82 + cy * 0.18, d * 0.85, base, 245);
        dot(cx, cy, 30, base, 245);
        for (let k = 0; k < 7; k++) { const a = 3.4 + k * 0.22, r = 17; dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r, g.rnd(2.2, 4.2), hi, 170); }
      };
      pool(8, '#6a1810', '#3a0c08', '#e0583c'); pool(9, '#10766a', '#0a4a42', '#a8ffec');
      { const [cx, cy] = cellAt(10);                                                                          // a scorch burst: black soot, ray streaks, an ash rim
        for (let k = 0; k < 18; k++) { const a = k / 18 * 6.28 + g.rnd(-0.12, 0.12), l = g.rnd(20, 30); seg(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, cx + Math.cos(a) * l, cy + Math.sin(a) * l, '#0a0908', g.rnd(2.2, 5), 215); }
        for (let k = 0; k < 6; k++) dot(cx + g.rnd(-6, 6), cy + g.rnd(-6, 6), g.rnd(22, 34), '#0a0908', 230);
        for (let k = 0; k < 14; k++) { const a = g.rnd(0, 6.28); dot(cx + Math.cos(a) * g.rnd(22, 29), cy + Math.sin(a) * g.rnd(22, 29), g.rnd(3, 8), '#6a6660', 90); }
        for (let k = 0; k < 16; k++) { const a = g.rnd(0, 6.28), l = g.rnd(16, 30); dot(cx + Math.cos(a) * l, cy + Math.sin(a) * l, g.rnd(1, 2.4), '#d8d0c0', 150); } }
      { const [cx, cy] = cellAt(11);                                                                          // a wall scorch: soot licked upward, widest low and thinning, a few clean streaks
        for (let k = 0; k < 14; k++) { const t = k / 13, y = cy + 28 - t * 56, d = 30 - t * 18 + g.rnd(-2, 2); dot(cx + g.rnd(-4, 4) * (1 + t), y, d, '#0a0908', 210 - t * 120); }
        for (let k = 0; k < 7; k++) { const x = cx - 12 + k * 4 + g.rnd(-1, 1); seg(x, cy + 26, x + g.rnd(-3, 3), cy - 6 - g.rnd(0, 20), '#0a0908', g.rnd(1.6, 3.2), 170); } }
      { const [cx, cy] = cellAt(12);                                                                          // a smear (neutral; tinted): the head is a heavy blot on the right, the tail thins out to the left in dry-brush streaks
        for (let k = 0; k < 12; k++) { const t = k / 11, x = cx - 28 + t * 54, d = 6 + 18 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 1.2; dot(x, cy + g.rnd(-2, 2), d, '#d0d0d0', 235); }
        for (let k = 0; k < 6; k++) { const y = cy - 9 + k * 3.6 + g.rnd(-1, 1); seg(cx - 30 + g.rnd(0, 8), y, cx + 6 + g.rnd(0, 16), y, '#dcdcdc', g.rnd(1.2, 2.4), 190); }
        for (let k = 0; k < 6; k++) dot(cx + 18 + g.rnd(0, 12), cy + g.rnd(-14, 14), g.rnd(2, 5), '#e4e4e4', 230);
        dot(cx + 20, cy - 3, 5, '#ffffff', 140); }
      { const [cx, cy] = cellAt(13);                                                                          // claw scrapes: four gouges, each a pale edge over a dark shadow, with chips
        for (let k = 0; k < 4; k++) { const x = cx - 14 + k * 9, c = g.rnd(-4, 4); let px = x, py = cy - 26; for (let s = 0; s < 6; s++) { const nx = x + c * Math.sin(s * 0.5) + g.rnd(-0.6, 0.6), ny = cy - 26 + (s + 1) * 8.6; seg(px + 1.6, py, nx + 1.6, ny, '#15110c', 2.6, 215); seg(px, py, nx, ny, '#d8d0b8', 1.8, 235); px = nx; py = ny; } }
        for (let k = 0; k < 10; k++) dot(cx + g.rnd(-20, 20), cy + g.rnd(-24, 24), g.rnd(1.2, 3), '#cfc8b0', 200); }
      { const [cx, cy] = cellAt(14);                                                                          // a damp patch: soft, dark, uneven (many faint dots build it)
        for (let k = 0; k < 22; k++) { const a = g.rnd(0, 6.28), r = 22 * Math.sqrt(g.rnd(0, 1)); dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r, g.rnd(14, 30), '#08100f', 40); } }
      { const [cx, cy] = cellAt(15);                                                                          // a soot burst: small and sharp
        for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28 + g.rnd(-0.2, 0.2), l = g.rnd(12, 24); seg(cx, cy, cx + Math.cos(a) * l, cy + Math.sin(a) * l, '#0a0908', g.rnd(1.6, 3.2), 200); }
        dot(cx, cy, 20, '#0a0908', 225); for (let k = 0; k < 12; k++) { const a = g.rnd(0, 6.28), l = g.rnd(14, 28); dot(cx + Math.cos(a) * l, cy + Math.sin(a) * l, g.rnd(1.2, 3), '#3a3632', 150); } }
    }),
  },

  // ---- the guns' own materials (PT-021 step 3, "the guns are the same yellow glove on five thin sticks... different materials"): until now all five guns drew from the SAME eight cells (slate steel, brass, wood, oilskin) of the
  // weapon atlas, so a scattergun, a rivet driver, a harpoon and a lamp were cousins. A second 4 x 4 atlas of 64 px cells, opaque: each gun gets its own stuff. The hands, sleeves and wraps stay in the old atlas (cells 4, 8, 9).
  //  0 walnut   1 blued steel   2 brass (verdigris in the recesses)   3 hammered copper   4 yellow enamel (chipped)   5 stamped steel (perforated)   6 black rubber (checkered)   7 bleached whaling oak with bone inlay
  //  8 pitted black iron   9 rope   10 polished lantern brass (ribbed)   11 teal glass   12 copper coil   13 crazed porcelain   14 stitched leather   15 dark gunmetal
  guns_atlas: {
    seed: 9801, width: 256, height: 256,
    draw: R((g) => {
      const W2 = g.p.width / 2, H2 = g.p.height / 2, ox = (i) => (i % 4) * 64, oy = (i) => Math.floor(i / 4) * 64, cl = (v, lo = 0.5, hi = 63.5) => Math.min(hi, Math.max(lo, v));
      const base = (i, c) => g.solid(ox(i), oy(i), 64, 64, c);
      const dot = (i, x, y, d, c, a = 255) => { const r = d / 2; if (x - r < 0 || x + r > 64 || y - r < 0 || y + r > 64) { const rr = Math.min(r, x, y, 64 - x, 64 - y); if (rr < 0.4) return; d = rr * 2; } g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(ox(i) + x - W2, oy(i) + y - H2, d, d); g.p.pop(); };
      const seg = (i, x1, y1, x2, y2, c, wt = 1, a = 255) => {                                                  // a line CLIPPED to the cell (Liang-Barsky: clamping the ends would bend a diagonal)
        let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
        for (const [p, q] of [[-dx, x1 - 0.5], [dx, 63.5 - x1], [-dy, y1 - 0.5], [dy, 63.5 - y1]]) { if (p === 0) { if (q < 0) return; } else { const r = q / p; if (p < 0) { if (r > t1) return; if (r > t0) t0 = r; } else { if (r < t0) return; if (r < t1) t1 = r; } } }
        g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(ox(i) + x1 + dx * t0 - W2, oy(i) + y1 + dy * t0 - H2, ox(i) + x1 + dx * t1 - W2, oy(i) + y1 + dy * t1 - H2); g.p.pop();
      };
      const band = (i, y, h, c, a) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.rect(ox(i) - W2, oy(i) + cl(y, 0, 64) - H2, 64, Math.min(h, 64 - cl(y, 0, 64))); g.p.pop(); };
      const wave = (i, y0, amp, ph, c, wt, a) => { let px = 0.5, py = y0 + amp * Math.sin(ph); for (let x = 4; x <= 64; x += 4) { const y = y0 + amp * Math.sin(ph + x * 0.11); seg(i, px, py, x, y, c, wt, a); px = x; py = y; } };
      const speck = (i, n, c, a, d0, d1, x0 = 1, x1 = 63, y0 = 1, y1 = 63) => { for (let k = 0; k < n; k++) dot(i, g.rnd(x0, x1), g.rnd(y0, y1), g.rnd(d0, d1), c, a); };
      // 0 walnut: flowing grain, a figured swirl, open pores
      base(0, '#6a3f22'); for (let k = 0; k < 11; k++) wave(0, 3 + k * 5.6, g.rnd(1, 3), g.rnd(0, 6), pick(g, ['#3e2312', '#4c2c16', '#2e1a0c']), g.rnd(0.8, 1.6), 190); for (let k = 0; k < 5; k++) wave(0, 6 + k * 12, 2, g.rnd(0, 6), '#9a6a3c', 1, 150); dot(0, 38, 30, 14, '#4a2a14', 90); dot(0, 38, 30, 7, '#2e1a0c', 120); speck(0, 40, '#25140a', 170, 0.8, 1.6);
      // 1 blued steel: a deep blue-black, a long soft highlight, silvered edge wear, pitting
      base(1, '#26323c'); band(1, 8, 14, '#4a6074', 110); band(1, 12, 5, '#7890a4', 100); band(1, 40, 10, '#10181e', 90); seg(1, 0, 1.5, 64, 1.5, '#a8b8c4', 1.6, 200); seg(1, 0, 62.5, 64, 62.5, '#a8b8c4', 1.4, 160); speck(1, 22, '#cfd8de', 150, 0.8, 1.8); speck(1, 18, '#0a1014', 190, 0.8, 1.6);
      // 2 brass: a warm body, a bright band, engraved lines, verdigris specks where the polish does not reach
      base(2, '#bc9236'); band(2, 10, 12, '#e6c25a', 150); band(2, 44, 12, '#7a5a1e', 110); for (const y of [6, 30, 58]) seg(2, 2, y, 62, y, '#4a3510', 1.1, 210); for (let k = 0; k < 6; k++) dot(2, 8 + k * 10, 31, 4, '#4a3510', 190); speck(2, 18, '#5a9a7a', 190, 1.2, 3, 1, 63, 40, 63); speck(2, 20, '#f2dc8a', 150, 0.8, 1.6);
      // 3 hammered copper: a red-brown skin dimpled all over (a light lip and a dark lip to each dimple)
      base(3, '#a85a2c'); for (let k = 0; k < 44; k++) { const x = g.rnd(5, 59), y = g.rnd(5, 59), d = g.rnd(6, 11); dot(3, x + 0.8, y + 1, d, '#6a3418', 130); dot(3, x - 0.4, y - 0.5, d * 0.85, '#c8783c', 150); } band(3, 0, 6, '#6a3418', 60); speck(3, 14, '#4a8a6a', 160, 1, 2.4);
      // 4 yellow enamel: a safety-yellow paint, chipped through to dark steel at the edges, soot and grease streaks
      base(4, '#d4a626'); band(4, 0, 22, '#e8c24a', 70); band(4, 46, 18, '#8a6a14', 80); for (let k = 0; k < 12; k++) { const x = g.rnd(2, 60), y = pick(g, [g.rnd(1, 7), g.rnd(57, 63)]); dot(4, x, y, g.rnd(2.5, 6), '#2a2c2e', 235); } for (let k = 0; k < 5; k++) seg(4, g.rnd(4, 60), 4, g.rnd(4, 60), 4 + g.rnd(14, 40), '#1c1a14', g.rnd(1.2, 2.8), 120); speck(4, 16, '#fff0b0', 140, 0.8, 1.6);
      // 5 stamped steel: pale grey sheet with a regular perforation and pressed seams
      base(5, '#7c868c'); band(5, 0, 8, '#a8b4ba', 90); band(5, 52, 12, '#4a5258', 90); for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const x = 6 + c * 10.4 + (r % 2) * 5, y = 8 + r * 11; dot(5, x, y, 5.4, '#161a1c', 255); dot(5, x - 0.5, y - 0.5, 2, '#5a646a', 200); } seg(5, 32, 1, 32, 63, '#2a3034', 1.4, 200); speck(5, 14, '#d8e0e4', 140, 0.8, 1.6);
      // 6 black rubber: a matt black with a diamond checkering and a sheen along one edge
      base(6, '#241d19'); for (let k = -4; k <= 8; k++) { seg(6, 8 * k, 0, 8 * k + 64, 64, '#0a0807', 1.4, 255); seg(6, 8 * k + 64, 0, 8 * k, 64, '#0a0807', 1.4, 255); } for (let k = -4; k <= 8; k++) { seg(6, 8 * k + 1.4, 0, 8 * k + 65.4, 64, '#4a3d34', 0.8, 150); } band(6, 0, 6, '#5a4a3e', 60);
      // 7 bleached whaling oak: pale, salt-silvered, long grain, a knot, and two bone (scrimshaw) inlays
      base(7, '#b49e76'); for (let k = 0; k < 9; k++) wave(7, 4 + k * 7, g.rnd(0.6, 1.8), g.rnd(0, 6), pick(g, ['#7a6540', '#8a7448', '#6a5632']), g.rnd(0.8, 1.4), 170); dot(7, 14, 40, 9, '#5a4626', 220); dot(7, 14, 40, 4, '#3e2e16', 230); dot(7, 44, 20, 12, '#f0eadc', 235); dot(7, 44, 20, 12, '#cfc6b0', 90); seg(7, 38, 20, 50, 20, '#3a2e1e', 1, 220); seg(7, 44, 14, 44, 26, '#3a2e1e', 1, 220); speck(7, 26, '#e8e0cc', 150, 0.8, 1.8);
      // 8 pitted black iron: a cast-iron black, a few rust bleeds, a rim of orange where the black is gone
      base(8, '#1c1f22'); band(8, 6, 10, '#33383c', 100); speck(8, 70, '#0a0c0e', 220, 0.8, 2.2); speck(8, 12, '#8a4a22', 200, 1.2, 3); seg(8, 0, 1, 64, 1, '#6a3a1a', 1.4, 160); seg(8, 0, 63, 64, 63, '#6a3a1a', 1.4, 160);
      // 9 rope: a twisted hemp, diagonal strands light and dark, fibres standing
      base(9, '#a68c5a'); for (let k = -8; k <= 12; k++) { seg(9, 6 * k, 0, 6 * k + 30, 64, '#5a4624', 2.2, 230); seg(9, 6 * k + 2.2, 0, 6 * k + 32.2, 64, '#d8c088', 1.4, 190); } speck(9, 26, '#e8d8a8', 150, 0.8, 1.4);
      // 10 polished lantern brass: bright, ribbed (a dark groove and a lit lip every 9 px), a hot highlight column
      base(10, '#d9b244'); for (let k = 0; k < 7; k++) { seg(10, 0.5, 4 + k * 9, 63.5, 4 + k * 9, '#6a4a14', 1.6, 230); seg(10, 0.5, 6 + k * 9, 63.5, 6 + k * 9, '#fff0a8', 1.2, 190); } g.p.push(); g.p.noStroke(); rgba(g, '#fff6c8', 120); g.p.rect(ox(10) + 14 - W2, oy(10) - H2, 8, 64); g.p.pop(); band(10, 0, 64, '#3a2808', 0); speck(10, 14, '#fffbe0', 160, 0.8, 1.6);
      // 11 teal glass: a deep teal that lightens to the centre, a bright streak, a dark rim (the material is lit from within)
      base(11, '#168a7c'); dot(11, 32, 32, 52, '#3adcc4', 150); dot(11, 32, 32, 30, '#8affea', 150); seg(11, 14, 10, 14, 52, '#e8fffa', 3, 220); seg(11, 20, 12, 20, 30, '#e8fffa', 1.4, 170); seg(11, 0.5, 0.5, 63.5, 0.5, '#0a4a44', 2, 230); seg(11, 0.5, 63.5, 63.5, 63.5, '#0a4a44', 2, 230);
      // 12 copper coil: wire wound in tight turns, each with a lit crown and a dark gap
      base(12, '#6a3a1c'); for (let k = 0; k < 12; k++) { const y = 2 + k * 5.2; band(12, y, 3.4, '#c8702e', 255); band(12, y, 1.2, '#f0a05a', 220); band(12, y + 3.4, 1.8, '#2a160a', 255); } speck(12, 16, '#e8b078', 140, 0.8, 1.4);
      // 13 crazed porcelain: off-white with a web of hairlines and one tea-brown stain
      base(13, '#e4e0d2'); band(13, 40, 24, '#c8c4b4', 80); for (let k = 0; k < 9; k++) { let x = g.rnd(0, 64), y = g.rnd(0, 64); for (let s = 0; s < 4; s++) { const nx = x + g.rnd(-12, 12), ny = y + g.rnd(-12, 12); seg(13, x, y, nx, ny, '#8a8678', 0.9, 170); x = nx; y = ny; } } dot(13, 40, 22, 14, '#b89a6a', 70);
      // 14 stitched leather: tan hide, two rows of stitching, creases, wear to a lighter grain at the edges
      base(14, '#6e4a2a'); band(14, 0, 8, '#8a6238', 90); band(14, 54, 10, '#3e2812', 90); for (const y of [9, 55]) for (let x = 3; x < 62; x += 6) seg(14, x, y, x + 3.2, y, '#e0cfa4', 1.4, 235); for (let k = 0; k < 7; k++) wave(14, 12 + k * 6, 1, g.rnd(0, 6), '#3a2410', 1, 130); speck(14, 30, '#2a1808', 150, 0.8, 1.6);
      // 15 dark gunmetal: near black with a faint sheen and fine wear
      base(15, '#171b1d'); band(15, 10, 8, '#2e3a40', 90); seg(15, 0, 1, 64, 1, '#7a8a92', 1.2, 150); speck(15, 20, '#5a6a72', 140, 0.8, 1.4);
    }),
  },

  // ---- the title picture (PT-021 step 4: "the title art (320x200) is a smudge you cannot read"). One composition you can read at a glance: the harbour at its one dusk hour, a bell tower with one lit window against a low sun, the sun's road
  // on dark water, a lamp on the quay throwing a pool of warm light, and rings of teal sound spreading across the water (the Vael's voice). Shown behind the menu; the HTML draws the name.
  ui_title_art: {
    seed: 4401, width: 320, height: 200,
    draw: R((g, w, h) => {
      const W2 = g.p.width / 2, H2 = g.p.height / 2;
      const dot = (x, y, d, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, d, d); g.p.pop(); };
      const oval = (x, y, ww, hh, c, a) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const ring = (x, y, ww, hh, c, a, wt = 1) => { g.p.push(); g.p.noFill(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const seg = (x1, y1, x2, y2, c, wt, a = 255) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 - W2, y1 - H2, x2 - W2, y2 - H2); g.p.pop(); };
      g.noStroke(); g.bleed(0.8, 'out');
      ['#120e26', '#1d1640', '#33204f', '#5a2e62', '#963e66', '#cc6a5e', '#eea05e'].forEach((c, i) => { g.fill(c, 245); g.rect(-10, i * 19 - 8, w + 20, 30); });          // the dusk, dark above and a low fire at the horizon
      for (let i = 0; i < 16; i++) { const x = g.rnd(0, w), y = g.rnd(18, 104), r = g.rnd(14, 38); g.fill(pick(g, ['#1d1640', '#5a2e62', '#d87a64', '#8a3a66']), g.rnd(40, 100)); g.circle(x, y, r); }
      for (let k = 0; k < 4; k++) oval(212, 118, 150 - k * 28, 70 - k * 14, '#ffd8a0', 26);                                                                                  // the low sun's glow
      g.solid(0, 128, w, 72, '#0b1b27');                                                                                                                                      // the water
      for (let i = 0; i < 46; i++) { const x = g.rnd(0, w), y = g.rnd(130, 198), l = g.rnd(10, 40); seg(x, y, x + l, y, pick(g, ['#1a4a5a', '#12303f', '#24607a']), g.rnd(0.8, 1.6), g.rnd(120, 200)); }
      for (let i = 0; i < 20; i++) { const y = 130 + i * 3.4, l = 46 - i * 1.7 + g.rnd(-6, 6); seg(212 - l / 2, y, 212 + l / 2, y, i < 8 ? '#ffc880' : '#e07a4a', g.rnd(1.2, 2.2), 200 - i * 6); }          // the sun's road on the water
      for (const [rx, ry, a] of [[16, 5, 200], [34, 9, 170], [58, 14, 130], [88, 21, 90], [124, 30, 55]]) ring(96, 166, rx * 2, ry * 2, '#3fffe0', a, 1.4);                         // rings of sound
      g.solid(0, 126, 62, 4, '#0a0810'); g.solid(70, 121, 38, 9, '#0a0810'); g.solid(120, 124, 54, 6, '#0a0810'); g.solid(268, 120, 52, 10, '#0a0810'); g.solid(0, 128, 320, 2, '#0a0810');   // the far quays and sheds
      seg(76, 122, 76, 92, '#0a0810', 2); seg(76, 96, 108, 100, '#0a0810', 1.6); seg(108, 100, 108, 122, '#0a0810', 1.4);                                                                   // a crane
      g.solid(232, 62, 18, 66, '#0a0810'); g.p.push(); g.p.noStroke(); rgba(g, '#0a0810', 255); g.p.triangle(230 - W2, 64 - H2, 252 - W2, 64 - H2, 241 - W2, 40 - H2); g.p.pop();           // the bell tower and its roof
      g.solid(228, 76, 26, 4, '#0a0810'); dot(241, 70, 5, '#ffcf70', 255); dot(241, 70, 12, '#ffcf70', 60); g.solid(238, 90, 6, 10, '#ffcf70');                                                  // one lit window, one lit door
      for (let k = 0; k < 8; k++) seg(0, 134 + k * 8, w, 134 + k * 8 + g.rnd(-1.5, 1.5), '#050709', g.rnd(0.6, 1.2), 60);
      g.solid(0, 178, w, 22, '#07090d'); g.solid(0, 176, w, 3, '#1a2228');                                                                                                                     // the quay edge
      seg(26, 178, 26, 108, '#07090d', 3); g.solid(20, 104, 12, 6, '#07090d'); dot(26, 106, 8, '#ffe0a0', 255); dot(26, 106, 26, '#ffb45a', 70); dot(26, 106, 54, '#ffb45a', 34);               // the lamp
      oval(26, 186, 110, 14, '#ffb45a', 60); oval(26, 186, 64, 8, '#ffd48a', 80);                                                                                                              // its pool on the quay
      g.solid(284, 168, 12, 14, '#07090d'); g.solid(281, 166, 18, 4, '#07090d');                                                                                                               // a bollard
      for (let i = 0; i < 70; i++) dot(g.rnd(0, w), g.rnd(0, 120), g.rnd(0.8, 1.6), '#fff0d8', g.rnd(60, 150));                                                                               // the first stars and the grain of the air
    }),
  },

};
