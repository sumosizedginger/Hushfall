// Campaign 2, Act C (THE HIVE-SONG) materials (PT-043, the Preview): the district the Vael grew as an organ, where the count is kept and sung. Eight walls and eight floors, one pair for each place of the act, and three skies. Same
// conventions as recipes_c2a.js / recipes_c2b.js: opaque, tiling (g.tile paints at 9 wrapped offsets), top-left px, big shapes and strong value steps first (the game renders at about 480 px wide and bands the value), so every material
// has ONE idea you can name from across a room: ribbed gorge with amber veins; a lattice of nerves; woven bone; iron and meat; copper and portholes; draped mourning white; glass over brick; pale niches with red lamps.
// The helpers are exported for recipes_c4.js (Act D).
import { R } from './recipes.js';
import { hex, mix } from './paint_util.js';

export const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
export const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };
export const wash = (g, x, y, w, h, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.rect(x + dx - g.p.width / 2, y + dy - g.p.height / 2, w, h); g.p.pop(); });
export const blot = (g, x, y, d, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, d, d); g.p.pop(); });
export const oval = (g, x, y, rw, rh, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, rw, rh); g.p.pop(); });
export const skyBlot = (g, x, y, rw, rh, c, a) => g.tile((dx, dy) => { if (dy) return; g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y - g.p.height / 2, rw, rh); g.p.pop(); });
export const gradient = (g, w, h, stops) => { for (let y = 0; y < h; y += 2) { const t = y / h; let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++; const [t0, c0] = stops[i], [t1, c1] = stops[i + 1], k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1))); g.solid(0, y, w, 2.5, mix(c0, c1, k)); } };
export const ink = (g, x1, y1, x2, y2, c, wt, a = 255) => g.tile((dx, dy) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 + dx - g.p.width / 2, y1 + dy - g.p.height / 2, x2 + dx - g.p.width / 2, y2 + dy - g.p.height / 2); g.p.pop(); });
/** a vein: a wandering polyline from (x, y) of `n` segments, drawn in a dark underline, the colour and a thin bright core */
export const vein = (g, x, y, n, c, core, wt, dirx = 0, diry = 1, wob = 14, seg = [14, 30]) => { for (let k = 0; k < n; k++) { const L = g.rnd(seg[0], seg[1]), nx = x + dirx * L + g.rnd(-wob, wob) * (diry ? 1 : 0), ny = y + diry * L + g.rnd(-wob, wob) * (dirx ? 1 : 0); ink(g, x, y, nx, ny, '#08040a', wt + 1.4, 150); ink(g, x, y, nx, ny, c, wt, 235); if (core) ink(g, x, y, nx, ny, core, Math.max(0.8, wt * 0.4), 230); x = nx; y = ny; } };

export const recipesC3 = {
  // ---- the gorge wall (C2M17, the throat): a cliff of folded flesh-rock, deep violet-brown, in tall pleats lit from one side (a bright edge, a dark crease), and through the pleats thin AMBER veins that run and fork: the Hive's own light in the stone ------------------
  wall_hivegorge_a: {
    seed: 9701, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3a1a2a'); g.solid(0, 0, 256, 256, '#3a1a2a');
      for (let k = 0; k < 8; k++) { const x = k * 32 + g.rnd(-2, 2); g.solid(x, 0, 32, 256, pick(g, ['#4a2234', '#3a1a2a', '#52283a', '#321626'])); g.solid(x + 3, 0, 3, 256, '#8a4a5e'); g.solid(x + 27, 0, 5, 256, '#150810'); }
      for (let i = 0; i < 16; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(24, 70), pick(g, ['#5e2e42', '#2a1220', '#6a3650']), 90);
      for (let i = 0; i < 6; i++) vein(g, g.rnd(0, 256), g.rnd(0, 60), 6, '#e8a030', '#ffd878', g.rnd(1.6, 2.6), g.rnd(-0.3, 0.3), 1, 16);        // amber veins
      for (let i = 0; i < 7; i++) { const y = g.rnd(0, 256); ink(g, 0, y, 256, y + g.rnd(-6, 6), '#7a4a5e', 1.3, 90); }
      for (let i = 0; i < 10; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(2, 5), '#f0b8a0', 120);
    }),
  },
  // ---- the nerve cathedral (C2M18): a black-violet wall with a diamond lattice of nerve cords across it, thick, lit along one edge, knotted at every crossing in a bright pink bead: the lattice IS the building ----------------------------------------------------------
  wall_nerve_a: {
    seed: 9702, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#160c1e'); g.solid(0, 0, 256, 256, '#160c1e');
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(30, 80), pick(g, ['#22102e', '#0e0614', '#2c1438']), 120);
      for (let k = -1; k <= 4; k++) for (const s of [1, -1]) { const x0 = k * 64, ya = s > 0 ? 0 : 256, yb = s > 0 ? 256 : 0, xb = x0 + 256 * s; ink(g, x0, ya, xb, yb, '#0a0510', 9, 255); ink(g, x0, ya, xb, yb, '#7a2a52', 6, 255); ink(g, x0 - 1.5, ya, xb - 1.5, yb, '#d05a88', 1.8, 220); }
      for (let m = 0; m < 8; m++) for (let n = 0; n < 8; n++) if ((m + n) % 2 === 0) { const x = m * 32, y = n * 32; blot(g, x, y, 17, '#3a0e28', 255); blot(g, x, y, 12, '#b0386a', 255); blot(g, x - 1.5, y - 1.5, 5, '#ffc0dc', 240); }
      for (let i = 0; i < 24; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 3), '#ff80b0', 120);
    }),
  },
  // ---- the bone loom (C2M19): pale strands of bone woven over and under in a basket, shadows in the crossings, a thread of old gold every second row: a cloth made of the dead -----------------------------------------------------------------------------------------------
  wall_bonewoven_a: {
    seed: 9703, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#7a6e58'); g.solid(0, 0, 256, 256, '#7a6e58');
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const x = c * 32, y = r * 32, tone = pick(g, ['#e4dcc2', '#d6cdb0', '#eee6cc', '#cfc5a8']);
        if ((r + c) % 2) { g.solid(x + 1, y + 4, 31, 24, tone); g.solid(x + 1, y + 4, 31, 3, '#fffaee'); g.solid(x + 1, y + 24, 31, 4, '#8a7e62'); for (let k = 0; k < 2; k++) g.solid(x + 3, y + 11 + k * 6, 26, 1.4, '#b4a88a'); }
        else { g.solid(x + 4, y + 1, 24, 31, tone); g.solid(x + 4, y + 1, 3, 31, '#fffaee'); g.solid(x + 24, y + 1, 4, 31, '#8a7e62'); for (let k = 0; k < 2; k++) g.solid(x + 11 + k * 6, y + 3, 1.4, 26, '#b4a88a'); }
      }
      for (let k = 0; k < 4; k++) { g.solid(k * 64 + 30, 0, 3, 256, '#b8862e'); g.solid(k * 64 + 30, 0, 1.2, 256, '#f0cc70'); }
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(10, 26), pick(g, ['#6a5e46', '#f4ecd6']), 60);
    }),
  },
  // ---- the vein rail (C2M20): iron over meat: a band of riveted plate, a band of dark red muscle with blue-grey vessels running along it, a copper pipe, then plate again; a wall that a train runs through -------------------------------------------------------------------
  wall_vein_a: {
    seed: 9704, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3c2428'); g.solid(0, 0, 256, 256, '#3c2428');
      for (const [y, h] of [[0, 64], [128, 64]]) { g.solid(0, y, 256, h, '#565a64'); g.solid(0, y, 256, 4, '#8a8e9a'); g.solid(0, y + h - 5, 256, 5, '#22242a'); for (let k = 0; k < 8; k++) { blot(g, 16 + k * 32, y + 14, 8, '#2a2c32', 255); blot(g, 15 + k * 32, y + 13, 4, '#a8acb6', 230); blot(g, 16 + k * 32, y + h - 18, 8, '#2a2c32', 255); blot(g, 15 + k * 32, y + h - 19, 4, '#a8acb6', 230); } }
      for (const y of [64, 192]) { g.solid(0, y, 256, 64, '#4c2a30'); for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), y + g.rnd(0, 64), g.rnd(14, 36), pick(g, ['#5e3238', '#3a1e22', '#6a3a40']), 120); for (let i = 0; i < 4; i++) { const yy = y + 8 + i * 14 + g.rnd(-3, 3); ink(g, 0, yy, 256, yy + g.rnd(-5, 5), '#08040a', 5.4, 150); ink(g, 0, yy, 256, yy + g.rnd(-5, 5), '#6a7a98', 3, 230); ink(g, 0, yy - 1, 256, yy - 1, '#a8b8d8', 1, 160); } }
      g.solid(0, 60, 256, 8, '#8a5a3a'); g.solid(0, 60, 256, 2.5, '#d8a070'); g.solid(0, 188, 256, 8, '#8a5a3a'); g.solid(0, 188, 256, 2.5, '#d8a070');
      for (let i = 0; i < 10; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-3, 3), y + g.rnd(14, 40), '#1a1012', g.rnd(1.4, 3), 150); }
    }),
  },
  // ---- the pulse foundry (C2M21): copper panels in a 4 x 4 grid, riveted, with round portholes that glow orange from inside, a vertical pipe at the joints, heat-scorch above each glass -------------------------------------------------------------------------------------
  wall_reactor_a: {
    seed: 9705, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#4a2e1c'); g.solid(0, 0, 256, 256, '#4a2e1c');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const x = c * 64, y = r * 64; g.solid(x + 2, y + 2, 60, 60, pick(g, ['#7a4a2a', '#8a5632', '#6a3e22', '#965f38'])); g.solid(x + 2, y + 2, 60, 3, '#d8986a'); g.solid(x + 2, y + 58, 60, 4, '#2a160a');
        for (const [dx, dy] of [[8, 8], [56, 8], [8, 56], [56, 56]]) { blot(g, x + dx, y + dy, 6, '#2a160a', 255); blot(g, x + dx - 0.8, y + dy - 0.8, 3, '#e0b088', 230); }
        if ((r * 4 + c) % 3 === 0) { blot(g, x + 32, y + 32, 34, '#26120a', 255); blot(g, x + 32, y + 32, 28, '#d8986a', 255); blot(g, x + 32, y + 32, 24, '#ff9a30', 255); blot(g, x + 32, y + 32, 14, '#ffe488', 255); blot(g, x + 28, y + 28, 5, '#ffffff', 200); wash(g, x + 14, y + 4, 36, 10, '#1a0c06', 90); }
      }
      for (const x of [0, 128]) { g.solid(x + 60, 0, 8, 256, '#34200e'); g.solid(x + 62, 0, 2.5, 256, '#c8905a'); }
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(10, 30), '#1a0c06', 70);
    }),
  },
  // ---- the mourning halls (C2M22): ash-white plaster in tall panels, and across the top of each panel a black cloth hung in scallops with a fringe of old gold: grief as an interior decoration; a few long dust streaks -----------------------------------------------------------
  wall_mourning_a: {
    seed: 9706, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#cfc8c0'); g.solid(0, 0, 256, 256, '#cfc8c0');
      for (let c = 0; c < 2; c++) { const x = c * 128; g.solid(x + 4, 4, 120, 248, pick(g, ['#d8d2ca', '#cac3ba'])); g.solid(x, 0, 4, 256, '#8a8278'); g.solid(x + 4, 4, 120, 3, '#f0ece4'); }
      for (let c = 0; c < 2; c++) for (const y of [0, 128]) { const x = c * 128; g.solid(x + 4, y + 4, 120, 22, '#1e1a22'); for (let k = 0; k < 4; k++) oval(g, x + 19 + k * 30, y + 26, 34, 22, '#1e1a22', 255); g.solid(x + 4, y + 4, 120, 3, '#4a4450'); for (let k = 0; k < 4; k++) { ink(g, x + 6 + k * 30, y + 26, x + 8 + k * 30, y + 42, '#b89848', 1.4, 220); } }
      for (let i = 0; i < 14; i++) { const x = g.rnd(0, 256), y = g.rnd(20, 200); ink(g, x, y, x + g.rnd(-2, 2), y + g.rnd(30, 90), '#8a8278', g.rnd(1.2, 3), 80); }
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(10, 24), '#a8a096', 60);
    }),
  },
  // ---- the copy of the quay (C2M23): the wall is glass: a blue-white pane in big facets with a ghost of Port Marrow's brick showing through it (the Hive built the harbour from what the grafted remember and got the material wrong) ------------------------------------------------
  wall_crystal_a: {
    seed: 9707, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#7aa8c8'); g.solid(0, 0, 256, 256, '#7aa8c8');
      for (const [x, y, w, h, t] of [[0, 0, 128, 128, '#86b4d0'], [128, 0, 128, 128, '#6a9cc0'], [0, 128, 128, 128, '#72a2c6'], [128, 128, 128, 128, '#8cbad6']]) { g.solid(x, y, w, h, t); }
      for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2 ? 32 : 0), y = r * 32; g.solid(x + 1, y + 1, 62, 30, pick(g, ['#a86a4e', '#9a5e44', '#b4764e', '#8a5240'])); wash(g, x + 1, y + 1, 62, 30, '#7aa8c8', 175); }
      for (let i = 0; i < 9; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-80, 80), y + g.rnd(-80, 80), '#f0fbff', g.rnd(1.6, 3.2), 200); ink(g, x + 2, y + 2, x + g.rnd(-80, 80), y + g.rnd(-80, 80), '#2e5a82', 1.4, 130); }
      for (let i = 0; i < 20; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(20, 60), '#e4f4ff', 40);
      for (let i = 0; i < 30; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 3.5), '#ffffff', 190);
    }),
  },
  // ---- the amphitheatre (C2M24): pale nerve-white stone with a row of arched niches in each course; inside every niche a lamp that is a red-violet gland, and from each lamp a nerve climbing the wall: the choir's hall, lit by the choir ------------------------------------------------------
  wall_amphi_a: {
    seed: 9708, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#d8c8cc'); g.solid(0, 0, 256, 256, '#d8c8cc');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64, y = r * 64; g.solid(x + 2, y + 2, 60, 60, pick(g, ['#e0d2d4', '#d2c2c6', '#e6dadc', '#c8b8be'])); g.solid(x + 2, y + 2, 60, 3, '#f8f0f2'); g.solid(x + 2, y + 58, 60, 4, '#7a6a72'); }
      for (let c = 0; c < 4; c++) for (const y of [8, 136]) { const x = c * 64 + 32; g.solid(x - 15, y + 24, 30, 42, '#2a1020'); oval(g, x, y + 24, 30, 28, '#2a1020', 255); oval(g, x, y + 40, 16, 20, '#a8386a', 255); oval(g, x, y + 40, 8, 11, '#ff90c0', 255); oval(g, x - 1, y + 37, 3, 4, '#fff0f8', 255); ink(g, x, y + 8, x, y - 30, '#7a2a52', 3, 220); ink(g, x - 1, y + 8, x - 1, y - 30, '#e070a0', 1, 200); }
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 34), pick(g, ['#a898a0', '#f4ecee']), 60);
    }),
  },

  // ---- FLOORS ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // the trench (C2M17): a dark ribbed membrane in rows of grooves, each groove edged with a thread of amber light, mottled between, a vein wandering across
  floor_hivetrench_a: {
    seed: 9711, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#2a1220'); g.solid(0, 0, 256, 256, '#2a1220');
      for (let i = 0; i < 18; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(30, 80), pick(g, ['#3a1a2e', '#1c0a14', '#46223a']), 130);
      for (let k = 0; k < 8; k++) { const y = k * 32; g.solid(0, y + 6, 256, 9, '#12060c'); g.solid(0, y + 15, 256, 2.2, '#e8a030'); g.solid(0, y + 3, 256, 3, '#5e2e44'); }
      for (let i = 0; i < 4; i++) vein(g, g.rnd(0, 256), g.rnd(0, 200), 5, '#7a3a52', '#c05a80', 2.2, 1, 0.3, 10);
    }),
  },
  // the lattice (C2M18): a black grating of square openings, thick nerve cords between them lit along one edge, and under every opening the red glow of what is beneath
  floor_nervegrid_a: {
    seed: 9712, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#0e0610'); g.solid(0, 0, 256, 256, '#0e0610');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64, y = r * 64; g.solid(x + 9, y + 9, 46, 46, '#26081a'); oval(g, x + 32, y + 32, 40, 40, '#a02848', 150); oval(g, x + 32, y + 32, 20, 20, '#ff6a78', 130); }
      for (let k = 0; k < 4; k++) { g.solid(k * 64 - 4, 0, 8, 256, '#7a2a52'); g.solid(0, k * 64 - 4, 256, 8, '#7a2a52'); g.solid(k * 64 - 4, 0, 2, 256, '#d05a88'); g.solid(0, k * 64 - 4, 256, 2, '#d05a88'); g.solid(k * 64 + 2, 0, 2, 256, '#3a0e28'); g.solid(0, k * 64 + 2, 256, 2, '#3a0e28'); }
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { blot(g, c * 64, r * 64, 14, '#3a0e28', 255); blot(g, c * 64, r * 64, 9, '#b0386a', 255); blot(g, c * 64 - 1.5, r * 64 - 1.5, 3.5, '#ffc0dc', 240); }
    }),
  },
  // the loom's mat (C2M19): a woven floor in cream and old gold, thick strips over and under, a gold band at every fourth strip
  floor_loomweave_a: {
    seed: 9713, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#a89870'); g.solid(0, 0, 256, 256, '#a89870');
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const x = c * 32, y = r * 32, tone = pick(g, ['#dcd0b0', '#cfc3a2', '#e6dcbe', '#c8bc9a']);
        if ((r + c) % 2) { g.solid(x + 1, y + 3, 31, 26, tone); g.solid(x + 1, y + 3, 31, 3, '#f8f0d8'); g.solid(x + 1, y + 25, 31, 4, '#7a6e4a'); } else { g.solid(x + 3, y + 1, 26, 31, tone); g.solid(x + 3, y + 1, 3, 31, '#f8f0d8'); g.solid(x + 25, y + 1, 4, 31, '#7a6e4a'); }
      }
      for (let k = 0; k < 2; k++) { g.solid(0, k * 128 + 60, 256, 8, '#a87828'); g.solid(0, k * 128 + 60, 256, 2.4, '#f0cc70'); g.solid(k * 128 + 60, 0, 8, 256, '#a87828'); g.solid(k * 128 + 60, 0, 2.4, 256, '#f0cc70'); }
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(10, 26), '#6a5e3e', 50);
    }),
  },
  // the rail deck (C2M20): iron deck plates with a diamond tread, rivets at the corners, oil stains, one worn bright path
  floor_veinrail_a: {
    seed: 9714, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#464850'); g.solid(0, 0, 256, 256, '#464850');
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { g.solid(x + 2, y + 2, 124, 124, pick(g, ['#505360', '#444650', '#585c68'])); g.solid(x + 2, y + 2, 124, 3, '#8a8e9c'); g.solid(x, y, 3, 128, '#1c1e24'); g.solid(x, y, 128, 3, '#1c1e24'); for (const [dx, dy] of [[10, 10], [118, 10], [10, 118], [118, 118]]) { blot(g, x + dx, y + dy, 8, '#22242a', 255); blot(g, x + dx - 1, y + dy - 1, 4, '#a8acb8', 230); } }
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const x = c * 16 + 8 + (r % 2 ? 8 : 0), y = r * 16 + 8; ink(g, x - 5, y, x, y - 5, '#8a8e9c', 1.6, 200); ink(g, x, y - 5, x + 5, y, '#8a8e9c', 1.6, 200); ink(g, x - 5, y, x, y + 5, '#2a2c34', 1.6, 200); ink(g, x, y + 5, x + 5, y, '#2a2c34', 1.6, 200); }
      for (let i = 0; i < 10; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 40), '#14121a', 120);
      wash(g, 96, 0, 56, 256, '#d8dce8', 22);
    }),
  },
  // the foundry grate (C2M21): a dark perforated plate, a regular field of round holes, and under every hole the orange glow of the pulse
  floor_reactor_a: {
    seed: 9715, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#3a2418'); g.solid(0, 0, 256, 256, '#3a2418');
      for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) { const x = c * 16 + 8 + (r % 2 ? 8 : 0), y = r * 16 + 8; blot(g, x, y, 11, '#150a04', 255); blot(g, x, y + 1, 8, '#d8661e', 255); blot(g, x, y + 1, 4.5, '#ffd070', 255); }
      for (let k = 0; k < 4; k++) { g.solid(k * 64 - 2, 0, 5, 256, '#6a3e22'); g.solid(0, k * 64 - 2, 256, 5, '#6a3e22'); g.solid(k * 64 - 2, 0, 1.6, 256, '#c8905a'); g.solid(0, k * 64 - 2, 256, 1.6, '#c8905a'); }
      for (let i = 0; i < 10; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(14, 40), '#0e0602', 80);
    }),
  },
  // the mourning floor (C2M22): pale flagstones, a black inlay laid in a cross across every joint, a gold stud where they meet, a worn path of paler stone
  floor_mourning_a: {
    seed: 9716, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#bcb6ac'); g.solid(0, 0, 256, 256, '#bcb6ac');
      for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { g.solid(x, y, 128, 128, pick(g, ['#c8c2b8', '#bab4aa', '#d0cac0', '#b4aea4'])); g.solid(x, y, 128, 3, '#e8e4dc'); }
      for (let k = 0; k < 2; k++) { g.solid(k * 128 - 3, 0, 6, 256, '#1e1a22'); g.solid(0, k * 128 - 3, 256, 6, '#1e1a22'); }
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { blot(g, c * 128, r * 128, 14, '#b89848', 255); blot(g, c * 128 - 2, r * 128 - 2, 5, '#f4e098', 240); }
      for (let i = 0; i < 12; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-30, 30), y + g.rnd(10, 40), '#8a8478', g.rnd(1, 2), 130); }
      wash(g, 96, 0, 64, 256, '#f0ece4', 40);
    }),
  },
  // the copy's cobbles (C2M23): glass cobbles of a quay, pale blue, each with a bright spot and a dark rim, the mortar between them a cold white
  floor_crystal_a: {
    seed: 9717, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#d4e8f4'); g.solid(0, 0, 256, 256, '#d4e8f4');
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { const x = c * 43 + (r % 2 ? 21 : 0) + g.rnd(-2, 2), y = r * 43 + g.rnd(-2, 2); oval(g, x, y, 42, 38, '#2e5a82', 255); oval(g, x, y, 37, 33, pick(g, ['#7ab0d4', '#6aa2cc', '#8cbcdc', '#5e96c0']), 255); oval(g, x - 6, y - 6, 14, 9, '#f4fcff', 220); oval(g, x + 7, y + 8, 8, 5, '#2e6a9a', 120); }
      for (let i = 0; i < 24; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 3.5), '#ffffff', 170);
    }),
  },
  // the tiers (C2M24): rows of seats in a pale violet membrane, each row a ribbed bar with a shadow beneath it, and every fourth row a nerve cord
  floor_amphi_a: {
    seed: 9718, width: 256, height: 256,
    draw: R((g) => {
      g.bg('#a898b0'); g.solid(0, 0, 256, 256, '#a898b0');
      for (let k = 0; k < 8; k++) { const y = k * 32; g.solid(0, y, 256, 24, pick(g, ['#c4b4cc', '#b8a8c0', '#cebed6'])); g.solid(0, y, 256, 3, '#ece0f2'); g.solid(0, y + 24, 256, 8, '#4a3a58'); for (let i = 0; i < 8; i++) g.solid(i * 32 + 14, y + 4, 2, 18, '#8a7a98'); }
      for (const y of [30, 94, 158, 222]) { g.solid(0, y, 256, 5, '#7a2a52'); g.solid(0, y, 256, 1.8, '#e070a0'); }
      for (let i = 0; i < 12; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(10, 26), '#6a5a78', 50);
    }),
  },

  // ---- SKIES ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // the Hive's dusk: a plum sky going to a red-amber horizon, long dark streaks of cloud like nerves, a dull red sun low and large behind the tower, small embers rising, and along the rim the black ribs of the district
  sky_hive: {
    seed: 9720, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#2a0c1c'); gradient(g, w, h, [[0, '#1c0814'], [0.35, '#4a1830'], [0.7, '#a83a3a'], [1, '#f08a48']]);
      for (let i = 0; i < 40; i++) skyBlot(g, g.rnd(0, w), g.rnd(60, 190), g.rnd(60, 200), g.rnd(3, 9), pick(g, ['#240a18', '#38122a', '#12060e']), g.rnd(80, 160));
      skyBlot(g, 330, 214, 120, 120, '#ff7a3a', 70); skyBlot(g, 330, 214, 84, 84, '#ff9a50', 120); skyBlot(g, 330, 214, 60, 60, '#ffd890', 255);
      for (let i = 0; i < 90; i++) { const d = g.rnd(1, 2.4); skyBlot(g, g.rnd(0, w), g.rnd(40, 230), d, d, pick(g, ['#ffb060', '#ff8a50', '#ffd890']), g.rnd(90, 220)); }
      for (let k = 0; k < 14; k++) { const x = k * 36 + g.rnd(-4, 4); skyBlot(g, x, 248, 34, 56, '#08030a', 250); }
      g.solid(0, 250, w, 6, '#08030a');
    }),
  },
  // below the Hive's lattice: no ground, a deep red glow rising from far down, thin lit threads and a rain of embers falling away
  sky_hive_below: {
    seed: 9721, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#12040a'); gradient(g, w, h, [[0, '#a02a3a'], [0.4, '#601828'], [0.8, '#220810'], [1, '#0a0206']]);
      for (let i = 0; i < 50; i++) skyBlot(g, g.rnd(0, w), g.rnd(0, h), g.rnd(40, 160), g.rnd(6, 26), pick(g, ['#2a0a14', '#7a2234', '#12040a', '#c04a52']), g.rnd(40, 110));
      for (let i = 0; i < 20; i++) skyBlot(g, g.rnd(0, w), g.rnd(0, h), g.rnd(2, 5), g.rnd(40, 120), '#ff8a60', g.rnd(30, 80));
      for (let i = 0; i < 120; i++) { const d = g.rnd(1, 2.6); skyBlot(g, g.rnd(0, w), g.rnd(0, h), d, d, pick(g, ['#ffb070', '#ff7a58']), g.rnd(80, 210)); }
    }),
  },
  // the quay as the Hive remembers it (C2M23): the dusk of Port Marrow, violet over orange, but the sun is there twice and the wrong size, and a moon that was never in this sky hangs where the lighthouse should be
  sky_marrow_wrong: {
    seed: 9722, width: 512, height: 256,
    draw: R((g, w, h) => {
      g.bg('#2a2848'); gradient(g, w, h, [[0, '#1c1a38'], [0.4, '#4a3e68'], [0.75, '#b0707a'], [1, '#f2a468']]);
      for (let i = 0; i < 34; i++) skyBlot(g, g.rnd(0, w), g.rnd(40, 190), g.rnd(80, 220), g.rnd(4, 12), pick(g, ['#3a2e58', '#6a4a70', '#241c3c']), g.rnd(80, 150));
      skyBlot(g, 150, 210, 90, 90, '#ffb878', 90); skyBlot(g, 150, 210, 50, 50, '#ffe0a8', 255);
      skyBlot(g, 360, 190, 130, 130, '#ffb878', 60); skyBlot(g, 360, 190, 74, 74, '#fff0c8', 255);
      skyBlot(g, 250, 90, 46, 46, '#e8e8f8', 255); skyBlot(g, 262, 86, 40, 40, '#4a3e68', 255);
      for (let i = 0; i < 60; i++) { const d = g.rnd(1, 2); skyBlot(g, g.rnd(0, w), g.rnd(0, 120), d, d, '#f4f0ff', g.rnd(80, 200)); }
      g.solid(0, 250, w, 6, '#1c1a38');
    }),
  },
};
