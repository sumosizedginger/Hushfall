// Episode 4 materials (PT-032), Batch A: the ASCENT TETHER (a space-elevator's service lattice: rust-red steel girders against the black, hazard-striped decks, frost) and the WRECK BELT (hulls of earlier invasions: torn grey-teal plate, scorch, frost, sparks),
// and the two skies of orbit: `sky_orbit` (stars over a thin blue limb) and `sky_orbit_below` (the world under the feet: atmosphere glow at the horizon, cloud and sea and land going down to the nadir). Same conventions as recipes_e3b.js: opaque, tiling
// (g.tile paints at 9 wrapped offsets), top-left px, big shapes and strong value steps first (the game renders at about 480 px wide and bands the value). A sky is 512 x 256: the upper hemisphere has the zenith at the TOP of the picture and the horizon at the
// bottom; the lower hemisphere (sky_orbit_below) has the horizon at the TOP and the nadir at the bottom.
import { R } from './recipes.js';
import { hex, mix } from './paint_util.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };
const wash = (g, x, y, w, h, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.rect(x + dx - g.p.width / 2, y + dy - g.p.height / 2, w, h); g.p.pop(); });
const blot = (g, x, y, d, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, d, d); g.p.pop(); });
/** a sky blot: like blot, but wrapped sideways only (a sky does not wrap top to bottom), and an ellipse (rw x rh) */
const skyBlot = (g, x, y, rw, rh, c, a) => g.tile((dx, dy) => { if (dy) return; g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y - g.p.height / 2, rw, rh); g.p.pop(); });
const ink = (g, x1, y1, x2, y2, c, wt, a = 255) => g.tile((dx, dy) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 + dx - g.p.width / 2, y1 + dy - g.p.height / 2, x2 + dx - g.p.width / 2, y2 + dy - g.p.height / 2); g.p.pop(); });

/** a vertical gradient through colour stops [[0..1, '#rrggbb'], ...] in 2 px solid rows (no brush: smooth and fast) */
const gradient = (g, w, h, stops) => { for (let y = 0; y < h; y += 2) { const t = y / h; let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++; const [t0, c0] = stops[i], [t1, c1] = stops[i + 1], k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1))); g.solid(0, y, w, 2.5, mix(c0, c1, k)); } };

export const recipesE4 = {
  // ---- the tether's wall: a lattice of rust-red girders: four uprights across the tile, X bracing between them, rivets, orange paint and white frost, black in the gaps -----------------------------------------------------------------
  wall_lattice_a: {
    seed: 9401, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#0e0c0b'); g.solid(0, 0, 256, 256, '#0e0c0b');
      for (let i = 0; i < 10; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#1a1512', '#241a14', '#120e0c']), 90);
      for (let c = 0; c < 4; c++) {                                                                         // four uprights, a channel section lit from the left
        const x = c * 64; g.solid(x, 0, 6, 256, '#2a1008'); g.solid(x + 6, 0, 10, 256, '#a8442a'); g.solid(x + 16, 0, 8, 256, '#7a2e1c'); g.solid(x + 24, 0, 4, 256, '#3a140c');
        for (let k = 0; k < 8; k++) { blot(g, x + 11, 14 + k * 32, 5, '#1a0a06', 255); blot(g, x + 10, 13 + k * 32, 2, '#f0a888', 220); }      // rivets
      }
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x0 = c * 64 + 28, y0 = r * 64; ink(g, x0, y0 + 2, x0 + 36, y0 + 62, '#8a3a24', 5, 255); ink(g, x0 + 36, y0 + 2, x0, y0 + 62, '#8a3a24', 5, 255); ink(g, x0 + 1, y0 + 2, x0 + 37, y0 + 62, '#d86a44', 1.4, 200); }      // the X bracing
      for (let r = 0; r < 4; r++) { wash(g, 0, r * 64, 256, 6, '#6a2a1a', 255); wash(g, 0, r * 64 + 6, 256, 2, '#e8884c', 200); }                                // a ring girder at every storey
      for (const y of [18, 146]) for (let c = 0; c < 8; c++) wash(g, c * 32, y, 16, 7, '#e8b020', 235);                                                         // an orange warning band, two to a tile
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 6), '#e8f4ff', g.rnd(60, 150));                                               // frost
      wash(g, 0, 232, 256, 24, '#07050a', 110);
    }),
  },
  // ---- the wreck's wall: a hull of grey-teal plate with seams and rivet rows, a long scorch, a torn dark edge, frost, a few orange sparks --------------------------------------------------------------------------------------------
  wall_hull_a: {
    seed: 9402, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2a3a3c'); g.solid(0, 0, 256, 256, '#2a3a3c');
      for (let i = 0; i < 20; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#3a4e50', '#4a6064', '#1e2c2e', '#566c6e']), 110);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {                                              // four big plates, each lit from the top-left
        const x = c * 128, y = r * 128; g.solid(x, y, 128, 4, '#8ea4a4'); g.solid(x, y, 4, 128, '#7a9090'); g.solid(x + 124, y, 4, 128, '#16201e'); g.solid(x, y + 124, 128, 4, '#16201e');
        for (let k = 0; k < 9; k++) { blot(g, x + 10 + k * 13, y + 9, 5, '#10181a', 255); blot(g, x + 10 + k * 13, y + 119, 5, '#10181a', 255); blot(g, x + 9 + k * 13, y + 8, 2, '#a8bcbc', 220); }
      }
      for (let i = 0; i < 4; i++) { const x = g.rnd(10, 240), y = g.rnd(0, 90); ink(g, x, y, x + g.rnd(-14, 14), y + g.rnd(80, 160), '#06090a', g.rnd(5, 11), 200); }      // scorch running down
      for (let i = 0; i < 3; i++) { const x = g.rnd(20, 230), y = g.rnd(30, 220), s = g.rnd(14, 30); for (let k = 0; k < 6; k++) blot(g, x + g.rnd(-s, s), y + g.rnd(-s, s), g.rnd(6, 16), '#05090a', 255); }      // a tear, black
      for (let i = 0; i < 46; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 7), '#dcf0f4', g.rnd(60, 160));                                                // frost
      for (let i = 0; i < 8; i++) { blot(g, g.rnd(0, 256), g.rnd(0, 256), 3, '#ffb040', 255); }                                                                    // sparks
    }),
  },
  // ---- the tether's deck: steel plate with black and yellow hazard stripes along two edges, a diamond tread between, rivets, frost ------------------------------------------------------------------------------------------------------------
  floor_deck_a: {
    seed: 9403, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#26282c'); g.solid(0, 0, 256, 256, '#26282c');
      for (let i = 0; i < 16; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#34363c', '#1a1c20', '#3e4046']), 100);
      for (let y = 0; y < 256; y += 16) for (let x = ((y / 16) % 2) * 8; x < 256; x += 16) { ink(g, x, y + 12, x + 10, y + 2, '#4a4e56', 3, 255); ink(g, x, y + 12, x + 10, y + 2, '#8a8e98', 1, 200); }      // diamond tread
      for (let i = -4; i < 20; i++) { g.solid(i * 24, 0, 12, 24, '#e8b020'); g.solid(i * 24 + 12, 0, 12, 24, '#14100a'); }                                                              // hazard stripes along the top edge...
      for (let i = 0; i < 12; i++) { g.solid(0, 232 + 0, 256, 24, '#26282c'); break; }
      for (let i = -4; i < 20; i++) { g.solid(i * 24 + 6, 232, 12, 24, '#e8b020'); g.solid(i * 24 + 18, 232, 12, 24, '#14100a'); }                                                       // ...and along the bottom
      for (const [x, y] of [[8, 8], [248, 8], [8, 248], [248, 248], [128, 128]]) { blot(g, x, y, 6, '#0e1012', 255); blot(g, x - 1, y - 1, 2.4, '#b0b4be', 230); }
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 5), '#e8f4ff', g.rnd(50, 130));
    }),
  },
  // ---- the wreck's floor: dark grey-blue plate in long panels with seams, scuffs and a few bright scratches, a frost line --------------------------------------------------------------------------------------------------------------------------
  floor_hull_a: {
    seed: 9404, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#1c2628'); g.solid(0, 0, 256, 256, '#1c2628');
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#2a3a3e', '#121a1c', '#324448']), 110);
      for (let i = 0; i < 4; i++) { g.solid(i * 64 - 2, 0, 4, 256, '#0c1214'); g.solid(i * 64 + 2, 0, 2, 256, '#5a7478'); }
      for (let i = 0; i < 2; i++) { g.solid(0, i * 128 - 2, 256, 4, '#0c1214'); g.solid(0, i * 128 + 2, 256, 2, '#5a7478'); }
      for (let i = 0; i < 28; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-24, 24), y + g.rnd(-6, 6), pick(g, ['#8aa4a8', '#0a0e10']), g.rnd(0.8, 1.8), 170); }
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 6), '#dcf0f4', g.rnd(40, 120));
    }),
  },
  // ---- the skies of orbit ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  sky_orbit: {                                                // above: black, a deep blue lifting to the limb of the world at the horizon, stars (a few large), the sun's glare low on one side
    seed: 9405, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#010208'); gradient(g, w, h, [[0, '#010208'], [0.72, '#02040c'], [0.84, '#071632'], [0.92, '#1c4a8a'], [0.97, '#5aa0da'], [1, '#b4dcf4']]);      // black almost to the bottom, then a thin bright limb
      for (let i = 0; i < 300; i++) { const d = g.rnd(1.2, 3.2); skyBlot(g, g.rnd(0, w), g.rnd(0, 205), d, d, pick(g, ['#ffffff', '#cfe0ff', '#fff4d0']), g.rnd(120, 255)); }                    // stars (plain p5 ellipses: brush fills are far too slow for hundreds)
      for (let i = 0; i < 14; i++) { const x = g.rnd(0, w), y = g.rnd(0, 190); skyBlot(g, x, y, 14, 14, '#9ab8ff', 60); { const d = g.rnd(4, 6.5); skyBlot(g, x, y, d, d, '#ffffff', 255); } }              // the bright ones, with a halo
      skyBlot(g, 380, 250, 150, 56, '#fff2c0', 55); skyBlot(g, 380, 252, 70, 26, '#fff8e0', 120); skyBlot(g, 380, 254, 26, 10, '#ffffff', 230);                                                    // the sun, low
    }),
  },
  sky_orbit_below: {                                          // below: the limb's glow at the top, then the world: cloud, sea and land, darker going down to the nadir
    seed: 9406, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#0a1c44'); gradient(g, w, h, [[0, '#b4dcf4'], [0.1, '#6ab0e6'], [0.3, '#3478b8'], [0.6, '#1e4c8c'], [1, '#0a1c44']]);
      for (let i = 0; i < 22; i++) { const x = g.rnd(0, w), y = g.rnd(30, 230), r = g.rnd(28, 88), c = pick(g, ['#2c6a3a', '#4a7a3c', '#6a6a3a', '#8a7a4a']); skyBlot(g, x, y, r * 2.2, r * 0.8, c, g.rnd(120, 200)); skyBlot(g, x + r * 0.6, y + r * 0.2, r * 1.4, r * 0.5, c, g.rnd(120, 200)); }      // land
      for (let i = 0; i < 26; i++) { const x = g.rnd(0, w), y = g.rnd(10, 240), r = g.rnd(30, 100), c = pick(g, ['#ffffff', '#e4f0fa', '#cfe0ee']); skyBlot(g, x, y, r * 2.8, r * 0.55, c, g.rnd(35, 95)); skyBlot(g, x + r * 0.7, y - r * 0.2, r * 1.8, r * 0.4, c, g.rnd(35, 95)); }      // cloud
      for (let i = 0; i < 6; i++) { const y = g.rnd(20, 220); ink(g, 0, y, w, y + g.rnd(-14, 14), '#ffffff', 1.2, 150); }
    }),
  },
};
