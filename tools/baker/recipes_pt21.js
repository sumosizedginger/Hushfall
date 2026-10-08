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

};
