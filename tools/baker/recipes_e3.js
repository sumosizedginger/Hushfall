// Episode 3 materials (PT-027, Batch B): the ribbed wall of the Choir Ship's interior, the damp gill floor of the gardens, the membrane of a breathing gate and the spore bed overlay. Same conventions as recipes_g2.js / recipes_pt21.js:
// opaque, tiling (g.tile paints at 9 wrapped offsets), top-left px; big shapes and strong value steps first (the game renders at about 480 px wide and bands the value), small marks last. The palette is the `choir` look's:
// bone and cream for what the ship grows hard, violet-brown for what it grows soft, teal for the glints, a sick green for what breathes.
import { R } from './recipes.js';
import { hex, mix } from './paint_util.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };
const wash = (g, x, y, w, h, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.rect(x + dx - g.p.width / 2, y + dy - g.p.height / 2, w, h); g.p.pop(); });
const blot = (g, x, y, d, c, a) => g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, d, d); g.p.pop(); });
const ink = (g, x1, y1, x2, y2, c, wt, a = 255) => g.tile((dx, dy) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 + dx - g.p.width / 2, y1 + dy - g.p.height / 2, x2 + dx - g.p.width / 2, y2 + dy - g.p.height / 2); g.p.pop(); });

export const recipesE3 = {
  // ---- the ribbed wall: pale bone ribs standing out of dark violet-brown resin, wet where the light catches them ------------------------------------------------------------------------
  wall_rib_a: {
    seed: 9301, width: 256, height: 256,
    draw: R((g) => {
      const soft = '#3a2a3a', rib = '#cfc6a8';
      g.bg(soft); g.solid(0, 0, 256, 256, soft);
      for (let i = 0; i < 14; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 90), pick(g, ['#4a3548', '#2a1e2e', '#33403a']), 90);              // the soft resin between the ribs: big tone, so a long wall is not one value
      for (let c = 0; c < 4; c++) {                                                                       // four ribs across the tile, each a round bar lit from the left
        const x = c * 64 + 14;
        g.solid(x, 0, 6, 256, mix(rib, '#403448', 0.55));                                                  // the falling flank, in shadow
        g.solid(x + 6, 0, 10, 256, mix(rib, '#807468', 0.25));                                             // the turn
        g.solid(x + 16, 0, 12, 256, mix(rib, '#f6f0da', 0.45));                                            // the crest, in light
        g.solid(x + 28, 0, 8, 256, mix(rib, '#2a2030', 0.35));                                             // the rising flank
        for (let y = 20; y < 256; y += 60 + Math.floor(g.rnd(0, 20))) { blot(g, x + 22, y, 15, '#e9e2cb', 120); blot(g, x + 22, y, 8, '#ffffff', 90); }       // knuckles along the rib: where it was grown in sections
        ink(g, x + 6, 0, x + 6, 256, '#150f18', 1.4, 200); ink(g, x + 36, 0, x + 36, 256, '#150f18', 1.4, 200);
      }
      for (let i = 0; i < 18; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-6, 6), y + g.rnd(18, 50), '#5fe8d0', 0.9, 120); }                       // the thin teal veins that run along the grain
      for (let i = 0; i < 34; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 4), '#d8fff4', 150);                                        // wet glints
      for (let i = 0; i < 40; i++) { const y = g.rnd(0, 256); ink(g, 0, y, 256, y + g.rnd(-3, 3), '#1a121c', 0.8, 60); }                                // growth lines across the grain
      wash(g, 0, 224, 256, 32, '#0d0a10', 70);                                                           // a dark foot to every wall, so the tile reads as standing on something
    }),
  },
  // ---- the gill floor: dark wet soil, rows of pale curved gills, puffball dots, a green bloom of damp ------------------------------------------------------------------------------------------
  floor_gill_a: {
    seed: 9302, width: 256, height: 256,
    draw: R((g) => {
      const soil = '#2b3426';
      g.bg(soil); g.solid(0, 0, 256, 256, soil);
      for (let i = 0; i < 30; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(36, 80), pick(g, ['#34402c', '#222a1f', '#3a3a2c', '#2a3a34']), 110);        // damp patches
      for (let r = 0; r < 8; r++) {                                                                       // rows of gills: a comb of thin curved slits, cream on dark, the way the bed is planted
        const y = 16 + r * 32;
        for (let x = 6; x < 256; x += 9) { const l = 16 + g.rnd(0, 8), bend = g.rnd(-3, 3); ink(g, x, y, x + bend, y + l, '#d4dcb0', 1.5, 220); ink(g, x + 1.6, y, x + 1.6 + bend, y + l, '#10160e', 1.0, 160); }
        ink(g, 0, y - 2, 256, y - 2, '#161d12', 2.2, 180);
      }
      for (let i = 0; i < 26; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(3, 7); blot(g, x, y, r + 3, '#101610', 120); blot(g, x, y, r, pick(g, ['#c8d49a', '#b8c880', '#dfe4b8']), 230); blot(g, x - r * 0.25, y - r * 0.25, r * 0.4, '#ffffff', 150); }   // puffballs
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1, 2.6), '#e8f8d0', 120);
      wash(g, 0, 0, 256, 18, '#0d120b', 54);
    }),
  },
  // ---- the membrane of a breathing gate: pale flesh-resin with a vein net, a puckered vertical slit in the middle with a lipped rim ------------------------------------------------------------
  door_gill_a: {
    seed: 9303, width: 256, height: 256,
    draw: R((g) => {
      const flesh = '#8a625e';
      g.bg(flesh); g.solid(0, 0, 256, 256, flesh);
      for (let i = 0; i < 22; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(40, 100), pick(g, ['#9a706a', '#7a5450', '#a47e72', '#6a4a52']), 90);            // the pallor of a thing that has never seen light
      for (let i = 0; i < 16; i++) { let x = g.rnd(0, 256), y = g.rnd(0, 256); for (let k = 0; k < 6; k++) { const nx = x + g.rnd(-26, 26), ny = y + g.rnd(10, 34); ink(g, x, y, nx, ny, '#4a1c28', 1.6, 190); ink(g, x + 1, y, nx + 1, ny, '#c88890', 0.7, 110); x = nx; y = ny; } }   // veins
      const cx = 128;                                                                                      // the slit: the gate's own mouth, dark inside, a thick pale lip round it
      for (let s = 0; s < 5; s++) { const w = 10 + s * 6, c = mix('#d0a49c', '#3a1a24', s / 5); g.solid(cx - w, 0, w * 2, 256, c); }
      g.solid(cx - 5, 0, 10, 256, '#1c0a12'); ink(g, cx - 5, 0, cx - 5, 256, '#0a0408', 2.2); ink(g, cx + 5, 0, cx + 5, 256, '#0a0408', 2.2);
      for (let y = 8; y < 256; y += 22) { blot(g, cx - 19, y, 12, '#e2bab0', 140); blot(g, cx + 19, y + 9, 12, '#e2bab0', 140); }                                    // the puckered lip: a string of folds on either side of the slit
      for (let i = 0; i < 30; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(1.5, 4), '#ffe8e0', 130);                                                      // wet highlights
      wash(g, 0, 0, 256, 20, '#1a0a10', 60); wash(g, 0, 236, 256, 20, '#1a0a10', 60);
    }),
  },
  // ---- the spore bed overlay: drawn unlit over the floor, its brightness set by the clock (dull while it sleeps, blazing as it blooms) --------------------------------------------------------------
  floor_spore_a: {
    seed: 9304, width: 256, height: 256,
    draw: R((g) => {
      const base = '#5d7a30';
      g.bg(base); g.solid(0, 0, 256, 256, base);
      for (let i = 0; i < 40; i++) blot(g, g.rnd(0, 256), g.rnd(0, 256), g.rnd(30, 74), pick(g, ['#7a9a3a', '#4a6628', '#98b448', '#6a8a30']), 120);       // swollen, uneven bed
      for (let i = 0; i < 22; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); blot(g, x, y, g.rnd(22, 40), '#d8f06a', 60); blot(g, x, y, g.rnd(10, 18), '#f6ffb0', 90); }          // pale puffs of spore, soft
      for (let i = 0; i < 90; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); blot(g, x, y, g.rnd(1.4, 3.6), pick(g, ['#fbffd0', '#e8fa8a', '#ffffff']), 200); }                   // motes
      for (let i = 0; i < 18; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); blot(g, x, y, g.rnd(8, 14), '#1c2a10', 150); blot(g, x, y, g.rnd(3, 6), '#0a1204', 220); }          // the pores they come out of
      for (let i = 0; i < 20; i++) { const x = g.rnd(0, 256), y = g.rnd(0, 256); ink(g, x, y, x + g.rnd(-16, 16), y + g.rnd(8, 28), '#2e4416', 1.2, 150); }                       // fine cracks
    }),
  },
};
