// PT-063 (R13, workstream L): the painted plate of the cold open. Port Marrow at dusk on the night the Hush began, seen from the quay: the harbour lamp at the end of the pier (warm), the fog-bell frame on the north pier, a row of roofs with a few lit windows, the Bell Tower on its headland burning teal
// (the colour of the title picture's rings), rings of sound spreading across the sky from it, and the townspeople standing on the quay facing it with their backs to us, one small figure at the left edge with a hand lamp. Not a tiling material: a 320 x 200 painting, opaque,
// plain p5 for every hard shape (a brush fill in the hundreds hangs the baker). Same conventions and helpers as `ui_ending_art` in recipes_pt36.js. The first cards of the cold open sit over the title picture; this is the plate of the last card.
import { R } from './recipes.js';
import { hex } from './paint_util.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };

export const recipesPT63 = {
  ui_cold_tower: {
    seed: 6301, width: 320, height: 200,
    draw: R((g, w, h) => {
      const W2 = g.p.width / 2, H2 = g.p.height / 2;
      const dot = (x, y, d, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, d, d); g.p.pop(); };
      const oval = (x, y, ww, hh, c, a) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const ring = (x, y, ww, hh, c, a, wt = 1) => { g.p.push(); g.p.noFill(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const seg = (x1, y1, x2, y2, c, wt, a = 255) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 - W2, y1 - H2, x2 - W2, y2 - H2); g.p.pop(); };
      const tri = (x1, y1, x2, y2, x3, y3, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.triangle(x1 - W2, y1 - H2, x2 - W2, y2 - H2, x3 - W2, y3 - H2); g.p.pop(); };
      const quad = (x1, y1, x2, y2, x3, y3, x4, y4, c, a = 255) => { tri(x1, y1, x2, y2, x3, y3, c, a); tri(x1, y1, x3, y3, x4, y4, c, a); };
      const box = (x, y, ww, hh, c, a = 255) => quad(x, y, x + ww, y, x + ww, y + hh, x, y + hh, c, a);
      const TX = 232, TB = 124, TT = 46, SEA = 126, QUAY = 150;                                                                                               // the tower's axis, base and top; the waterline; the quay's edge

      g.noStroke(); g.bleed(0.8, 'out');
      ['#05060f', '#080a18', '#0d0e24', '#15122f', '#1e1639', '#2a1c42', '#3a2446', '#4a2c48'].forEach((c, i) => { g.fill(c, 250); g.rect(-10, i * 17 - 6, w + 20, 26); });             // dusk gone to night, a bruise of warm light low on the horizon
      for (let i = 0; i < 80; i++) dot(g.rnd(0, w), g.rnd(0, 92), g.rnd(0.7, 1.6), pick(g, ['#fff0d8', '#d0c8ff', '#fff8e8']), g.rnd(40, 150));                         // the stars
      // the teal light of the tower thrown on the sky, then its rings of sound
      for (let k = 0; k < 8; k++) oval(TX, TT + 4, 300 - k * 30, 230 - k * 24, '#3fffe0', 7 + k * 3);
      for (const [rx, ry, a] of [[26, 22, 230], [46, 38, 190], [72, 58, 150], [102, 82, 110], [138, 112, 70]]) ring(TX, TT + 4, rx * 2, ry * 2, '#3fffe0', a, 1.2);
      // the far shore and the headland the tower stands on
      tri(150, SEA, 330, SEA, 330, 84, '#0a0b16', 255); tri(190, SEA, 330, 84, 236, SEA - 34, '#0a0b16', 255); quad(196, SEA, 330, SEA, 330, 96, 216, 106, '#0a0b16', 255); for (let i = 0; i < 9; i++) { const rx = 258 + i * 9; tri(rx, 102 - i * 1.6, rx + 9, 102 - i * 1.6, rx + g.rnd(2, 7), 92 - i * 1.6 - g.rnd(2, 9), '#0a0b16'); }
      g.solid(0, SEA, w, h - SEA, '#07090f');
      // the Bell Tower: a round shaft, a belfry of open arches burning teal, a cap
      box(TX - 11, TB - 70, 22, 70, '#0b0c14'); box(TX - 9, TB - 66, 3, 66, '#161826', 200); box(TX + 5, TB - 64, 4, 64, '#050609', 180);
      box(TX - 14, TT + 8, 28, 20, '#0b0c14'); for (const ax of [-9, -3, 3]) { box(TX + ax, TT + 11, 6, 14, '#9ffff0', 255); box(TX + ax + 1, TT + 13, 4, 10, '#e8fffb', 255); }
      tri(TX - 16, TT + 8, TX + 16, TT + 8, TX, TT - 14, '#0b0c14'); tri(TX - 4, TT - 8, TX + 4, TT - 8, TX, TT - 20, '#0b0c14');
      for (let k = 0; k < 5; k++) oval(TX, TT + 18, 90 - k * 16, 70 - k * 12, '#3fffe0', 14 + k * 8);
      for (const wy of [TB - 50, TB - 30, TB - 12]) box(TX - 1, wy, 3, 7, '#3fffe0', 210);                                                                              // slit windows down the shaft
      // the town along the shore: stepped roofs, a few warm windows
      let x = -6; while (x < 214) { const ww = g.rnd(14, 26), hh = g.rnd(14, 34), top = SEA - hh; box(x, top, ww, hh + 2, '#090a13'); tri(x - 2, top, x + ww + 2, top, x + ww / 2, top - g.rnd(6, 13), '#090a13'); const nw = Math.floor(ww / 9); for (let i = 0; i < nw; i++) if (g.rnd(0, 1) < 0.5) box(x + 3 + i * 8, top + g.rnd(5, hh - 8), 3, 4, pick(g, ['#ffd890', '#ffb45a']), 230); x += ww + g.rnd(-2, 3); }
      // the harbour lamp at the end of the pier (warm) and its light on the water
      box(52, SEA - 44, 6, 44, '#090a13'); box(49, SEA - 50, 12, 7, '#090a13'); box(51, SEA - 49, 8, 5, '#ffe0a0', 255); tri(48, SEA - 50, 62, SEA - 50, 55, SEA - 60, '#090a13');
      for (let k = 0; k < 6; k++) oval(55, SEA - 46, 110 - k * 16, 80 - k * 12, '#ffb45a', 9 + k * 4);
      g.solid(40, SEA, 70, 4, '#0a0a12');                                                                                                                              // the pier
      // the fog-bell on the north pier: a small frame and a bell
      seg(104, SEA - 1, 104, SEA - 16, '#090a13', 2); seg(118, SEA - 1, 118, SEA - 16, '#090a13', 2); seg(103, SEA - 16, 119, SEA - 16, '#090a13', 2); oval(111, SEA - 12, 8, 9, '#090a13', 255); dot(111, SEA - 8, 2, '#c8964a', 200);
      // the water: the tower's teal and the lamp's warmth laid down in streaks
      for (let i = 0; i < 26; i++) { const yy = SEA + 2 + i * 2.6, wob = Math.sin(i * 1.7) * 5; seg(TX - 20 + wob, yy, TX + 20 + wob, yy, '#3fffe0', 1, 60 - i * 1.7); seg(55 - 15 + wob, yy, 55 + 15 + wob, yy, '#ffb45a', 1, 52 - i * 1.5); }
      for (let i = 0; i < 40; i++) seg(g.rnd(0, w), g.rnd(SEA + 4, QUAY - 6), g.rnd(0, w), g.rnd(SEA + 4, QUAY - 6), '#1a2030', 1, g.rnd(30, 70));
      // the quay and the people standing on it, backs to us, facing the tower
      g.solid(0, QUAY, w, h - QUAY, '#06070b'); g.solid(0, QUAY - 1, w, 2, '#241a1c'); for (let i = -9; i <= 9; i++) seg(160 + i * 2, QUAY, 160 + i * 26, h, '#0a0b12', 1, 150); for (let k = 0; k < 6; k++) seg(0, QUAY + 6 + k * 9, w, QUAY + 6 + k * 9, '#0a0b12', 0.8 + k * 0.15, 120);
      const person = (px, py, s, rim = '#3fffe0', side = 1, c = '#1b2238') => {                                                                                // a figure seen from behind: shoulders, a hood, the tower's light on the edge that faces it
        tri(px - 5 * s, py, px + 5 * s, py, px, py - 20 * s, c); box(px - 3.6 * s, py - 27 * s, 7.2 * s, 14 * s, c); oval(px, py - 26 * s, 11 * s, 5 * s, c, 255); dot(px, py - 30 * s, 8 * s, c);
        seg(px + side * 3.8 * s, py - 27 * s, px + side * 5 * s, py - 1, rim, 1, 150); seg(px + side * 3 * s, py - 33 * s, px + side * 4.2 * s, py - 28 * s, rim, 1, 170);
      };
      for (const [px, py, s] of [[92, 159, 0.8], [132, 164, 0.95], [168, 158, 0.78], [204, 167, 1.05], [250, 160, 0.9], [282, 171, 1.2], [310, 163, 0.95], [66, 171, 1.05], [116, 181, 1.3], [232, 184, 1.4], [156, 192, 1.55]]) { person(px, py, s); oval(px, py + 1, 16 * s, 3 * s, '#3fffe0', 26); }
      // Ines: left foreground, a hand lamp held out; the one warm light on the quay, so her rim is warm and on the lamp side
      person(26, 194, 1.5, '#ffb45a', -1); seg(18, 160, 6, 176, '#1b2238', 4); dot(5, 179, 7, '#ffe0a0'); dot(5, 179, 26, '#ffb45a', 74); dot(5, 179, 54, '#ffb45a', 32); oval(20, 197, 84, 9, '#ffb45a', 44);
      for (let i = 0; i < 70; i++) dot(g.rnd(0, w), g.rnd(0, h), g.rnd(0.7, 1.5), pick(g, ['#fff0d8', '#ffd890', '#9ffff0']), g.rnd(24, 80));                          // the grain of the air
    }),
  },

  // PT-063 (V6b of the visual plan: "floors are flat"): THE FLOOR MARKS. A second 4 x 4 atlas of 64 px cells, transparent, painted as plain ink and chips (like `decals_atlas`, which keeps the marks that EVENTS leave): what the floors of a place carry before anyone
  // fights on them. Scattered at load by src/render/floorscatter.js, family by family (wood, stone, metal, earth, soft, organic: FLOOR_FAMILY in that file), tinted at run time. Cells: 0 plank seams, 1 an iron grate, 2 a crack, 3 a cracked web, 4 a puddle, 5 a long puddle,
  // 6 rubble, 7 a coil of rope, 8 a drain, 9 tile seams crossing, 10 a drift of dust, 11 a rust stain, 12 a chalk tally (the count: four bars and a stroke), 13 boot prints, 14 a patch of soot and ash, 15 straw and litter.
  decals_floor_atlas: {
    seed: 6302, width: 256, height: 256, transparent: true,
    draw: R((g) => {
      const W2 = g.p.width / 2, H2 = g.p.height / 2;
      const dot = (x, y, d, c, a) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, d, d); g.p.pop(); };
      const oval = (x, y, ww, hh, c, a) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const seg = (x1, y1, x2, y2, c, wt, a = 255) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 - W2, y1 - H2, x2 - W2, y2 - H2); g.p.pop(); };
      const ringO = (x, y, ww, hh, c, a, wt) => { g.p.push(); g.p.noFill(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const tri = (x1, y1, x2, y2, x3, y3, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.triangle(x1 - W2, y1 - H2, x2 - W2, y2 - H2, x3 - W2, y3 - H2); g.p.pop(); };
      const box = (x, y, ww, hh, c, a = 255) => { tri(x, y, x + ww, y, x + ww, y + hh, c, a); tri(x, y, x + ww, y + hh, x, y + hh, c, a); };
      const cellAt = (i) => [(i % 4) * 64 + 32, Math.floor(i / 4) * 64 + 32];
      const wobble = (x1, y1, x2, y2, n, amp) => { const pts = [[x1, y1]]; for (let k = 1; k < n; k++) { const t = k / n; pts.push([x1 + (x2 - x1) * t + g.rnd(-amp, amp), y1 + (y2 - y1) * t + g.rnd(-amp, amp)]); } pts.push([x2, y2]); return pts; };
      const crack = (pts, wt, a) => { for (let k = 0; k < pts.length - 1; k++) { seg(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], '#0a0908', wt, a); seg(pts[k][0] + 1, pts[k][1] + 1, pts[k + 1][0] + 1, pts[k + 1][1] + 1, '#c4bca8', Math.max(0.6, wt * 0.45), a * 0.4); } };
      { const [cx, cy] = cellAt(0);                                                                           // plank seams: two long dark joints with a pale lip and the heads of nails
        for (const dy of [-10, 9]) { seg(cx - 31, cy + dy, cx + 31, cy + dy + g.rnd(-1, 1), '#0b0907', 2.8, 235); seg(cx - 31, cy + dy + 1.8, cx + 31, cy + dy + 1.8, '#a89478', 1.1, 110); }
        for (const [nx, ny] of [[-23, -10], [3, -9], [24, -10], [-18, 9], [11, 10], [27, 9]]) { dot(cx + nx, cy + ny, 3.2, '#16110d', 235); dot(cx + nx - 0.6, cy + ny - 0.6, 1.2, '#b8a888', 180); }
        for (let k = 0; k < 7; k++) { const x = cx - 28 + k * 9 + g.rnd(-2, 2); seg(x, cy - 7 + g.rnd(-1, 1), x + g.rnd(4, 9), cy - 6 + g.rnd(-1, 1), '#2a2018', 0.9, 90); } }
      { const [cx, cy] = cellAt(1);                                                                           // a grate: a dark frame, six bars of dull metal, a lip of light on two edges
        box(cx - 27, cy - 27, 54, 54, '#08090b', 240); box(cx - 24, cy - 24, 48, 48, '#13161a', 245);
        for (let k = 0; k < 6; k++) { const x = cx - 21 + k * 8.4; box(x, cy - 24, 4.6, 48, '#4a4f56', 240); box(x, cy - 24, 1.4, 48, '#8a9098', 190); }
        seg(cx - 27, cy - 27, cx + 27, cy - 27, '#7a8088', 1.6, 200); seg(cx - 27, cy - 27, cx - 27, cy + 27, '#7a8088', 1.6, 200); for (let k = 0; k < 4; k++) dot(cx + (k % 2 ? 24 : -24), cy + (k < 2 ? -24 : 24), 2.8, '#1a1c20', 240); }
      { const [cx, cy] = cellAt(2); crack(wobble(cx - 31, cy + 4, cx + 31, cy - 5, 9, 4.5), 2.2, 235);       // a crack: one meandering line, two short branches
        crack(wobble(cx - 4, cy + 1, cx + 6, cy + 24, 4, 3), 1.5, 215); crack(wobble(cx + 12, cy - 2, cx + 26, cy - 22, 4, 3), 1.3, 200); for (let k = 0; k < 6; k++) dot(cx + g.rnd(-26, 26), cy + g.rnd(-8, 10), g.rnd(1.2, 2.6), '#cfc8b4', 160); }
      { const [cx, cy] = cellAt(3);                                                                           // a cracked web: arms from where something struck, each forking once, pale chips round the middle
        for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + g.rnd(-0.3, 0.3), l = g.rnd(18, 30), ex = cx + Math.cos(a) * l, ey = cy + Math.sin(a) * l; crack(wobble(cx, cy, ex, ey, 4, 2.4), 1.9, 235); const b = a + g.rnd(-0.7, 0.7); crack(wobble(cx + Math.cos(a) * l * 0.5, cy + Math.sin(a) * l * 0.5, cx + Math.cos(b) * l * 0.95, cy + Math.sin(b) * l * 0.95, 3, 2), 1.2, 200); }
        dot(cx, cy, 9, '#0a0908', 235); for (let k = 0; k < 9; k++) { const a = g.rnd(0, 6.28), l = g.rnd(6, 15); dot(cx + Math.cos(a) * l, cy + Math.sin(a) * l, g.rnd(1.6, 3.6), '#cfc8b4', 190); } }
      { const [cx, cy] = cellAt(4);                                                                           // a puddle: lobed, dark water with a cooler middle and a bright arc where the light sits
        const lobes = []; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28, r = 17 + g.rnd(-4, 6); lobes.push([cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.7, g.rnd(13, 20)]); }
        for (const [x, y, d] of lobes) dot(x, y, d, '#070d12', 215); dot(cx, cy, 34, '#070d12', 215); for (const [x, y, d] of lobes) dot(x * 0.8 + cx * 0.2, y * 0.8 + cy * 0.2, d * 0.8, '#13242f', 190); dot(cx, cy, 26, '#1c3442', 175);
        for (let k = 0; k < 7; k++) { const a = 3.5 + k * 0.2; dot(cx + Math.cos(a) * 15, cy + Math.sin(a) * 12, g.rnd(2.2, 4.4), '#d4ecf4', 150); } }
      { const [cx, cy] = cellAt(5);                                                                           // a long puddle: a flat string of lobes with a thin bright line along the top
        for (let k = 0; k < 9; k++) { const t = k / 8, x = cx - 27 + t * 54, d = 9 + 13 * Math.sin(Math.PI * Math.min(1, t * 1.05)); dot(x, cy + g.rnd(-2, 2), d, '#070d12', 210); dot(x, cy + g.rnd(-1, 1), d * 0.72, '#16293a', 185); }
        seg(cx - 20, cy - 6, cx + 12, cy - 7, '#d4ecf4', 1.4, 150); dot(cx + 14, cy - 5, 3, '#ecfaff', 160); }
      { const [cx, cy] = cellAt(6);                                                                           // rubble: angular chips and a few stones, each with a shadow
        const chip = (x, y, d, c, a) => { const pts = []; for (let k = 0; k < 4; k++) { const an = k / 4 * 6.28 + g.rnd(-0.5, 0.5), r = d * g.rnd(0.55, 1); pts.push([x + Math.cos(an) * r, y + Math.sin(an) * r * 0.85]); } tri(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1], c, a); tri(pts[0][0], pts[0][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1], c, a); };
        for (let k = 0; k < 17; k++) { const x = cx + g.rnd(-26, 26), y = cy + g.rnd(-24, 24), d = g.rnd(2.6, 8.5) * (k < 4 ? 1.4 : 1); chip(x + 1.3, y + 1.5, d, '#0a0908', 150); chip(x, y, d, k % 3 ? '#8d8574' : '#b1a88f', 240); chip(x - d * 0.2, y - d * 0.22, d * 0.5, '#d8d0bc', 170); } }
      { const [cx, cy] = cellAt(7);                                                                           // a coil of rope: three turns of a thick strand, a dark twist across each, one tail
        for (let k = 0; k < 3; k++) { const r = 24 - k * 7; ringO(cx, cy, r * 2, r * 1.5, '#0a0806', 255, 6.4); ringO(cx, cy, r * 2, r * 1.5, '#a8895a', 255, 4.6); ringO(cx, cy - 1, r * 2 - 2, r * 1.5 - 2, '#d0b480', 150, 1.4); for (let j = 0; j < 14; j++) { const a = j / 14 * 6.28; seg(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r * 0.75 - 1.2, cx + Math.cos(a) * r + 1.4, cy + Math.sin(a) * r * 0.75 + 1.2, '#3a2c1a', 1, 200); } }
        seg(cx + 18, cy + 8, cx + 29, cy + 21, '#0a0806', 6, 255); seg(cx + 18, cy + 8, cx + 29, cy + 21, '#a8895a', 4.2, 255); seg(cx + 28, cy + 21, cx + 31, cy + 25, '#d0b480', 3, 255); }
      { const [cx, cy] = cellAt(8);                                                                           // a drain: an iron disc, a rim, eight slots
        dot(cx, cy, 50, '#08090b', 240); dot(cx, cy, 44, '#161a1f', 245); ringO(cx, cy, 46, 46, '#555b63', 230, 3); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28 + 0.2; seg(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, cx + Math.cos(a) * 17, cy + Math.sin(a) * 17, '#030405', 4, 245); }
        dot(cx, cy, 8, '#5c626a', 235); dot(cx - 1, cy - 1, 3, '#aab0b8', 200); for (let k = 0; k < 6; k++) { const a = 3.6 + k * 0.18; dot(cx + Math.cos(a) * 21, cy + Math.sin(a) * 21, 2.2, '#9aa0a8', 170); } }
      { const [cx, cy] = cellAt(9);                                                                           // tile seams: a cross of joints that do not quite meet, a pale lip, one chipped corner
        for (const [x1, y1, x2, y2] of [[-31, -1, 29, 1], [-1, -31, 2, 29]]) { seg(cx + x1, cy + y1, cx + x2, cy + y2, '#0b0907', 2.4, 215); seg(cx + x1 + 1.4, cy + y1 + 1.4, cx + x2 + 1.4, cy + y2 + 1.4, '#a8a08c', 1, 100); }
        for (let k = 0; k < 5; k++) dot(cx + 3 + g.rnd(0, 8), cy + 3 + g.rnd(0, 8), g.rnd(1.4, 3), '#d0c8b4', 170); }
      { const [cx, cy] = cellAt(10);                                                                          // a drift of dust: a soft lens of pale grain with a few clean ridges
        for (let k = 0; k < 28; k++) { const t = g.rnd(-1, 1), x = cx + t * 29, y = cy + g.rnd(-1, 1) * 11 * (1 - Math.abs(t) * 0.6); dot(x, y, g.rnd(7, 16), '#dccfae', 36); }
        for (let k = 0; k < 5; k++) { const y = cy - 8 + k * 4 + g.rnd(-1, 1); seg(cx - 20 + g.rnd(0, 8), y, cx + 8 + g.rnd(0, 14), y + g.rnd(-1, 1), '#efe4c4', 1.1, 80); } }
      { const [cx, cy] = cellAt(11);                                                                          // a rust stain: a bloom at the foot of a streak that ran down from a joint
        for (let k = 0; k < 7; k++) { const x = cx - 8 + k * 2.6 + g.rnd(-1, 1); seg(x, cy - 28, x + g.rnd(-1.4, 1.4), cy - 28 + g.rnd(26, 50), '#6a2e14', g.rnd(1.6, 3.4), g.rnd(70, 130)); }
        for (let k = 0; k < 16; k++) { const a = g.rnd(0, 6.28), r = 16 * Math.sqrt(g.rnd(0, 1)); dot(cx + Math.cos(a) * r, cy + 12 + Math.sin(a) * r * 0.6, g.rnd(8, 18), k % 3 ? '#7a3a1c' : '#4a200e', 62); } }
      { const [cx, cy] = cellAt(12);                                                                          // a chalk tally: two sets of five (four bars and the stroke across), the strokes a little uneven
        for (let grp = 0; grp < 2; grp++) { const ox = cx - 22 + grp * 24, oy = cy - 14 + grp * 10; for (let k = 0; k < 4; k++) { const x = ox + k * 4.8 + g.rnd(-0.6, 0.6); seg(x, oy + g.rnd(-1, 1), x + g.rnd(-0.8, 0.8), oy + 22 + g.rnd(-1, 1), '#f2eee2', g.rnd(1.7, 2.4), g.rnd(190, 235)); }
          seg(ox - 3, oy + 19 + g.rnd(-1, 1), ox + 19, oy + 3 + g.rnd(-1, 1), '#f2eee2', 2, 225); }
        for (let k = 0; k < 12; k++) dot(cx + g.rnd(-30, 30), cy + g.rnd(-26, 26), g.rnd(0.9, 2), '#e6e2d4', 120); }
      { const [cx, cy] = cellAt(13);                                                                          // boot prints: two soles walking away, a heel and a sole each, a little dirt thrown off
        for (const [dx, dy, rot] of [[-9, 10, -0.18], [10, -9, 0.14]]) { const co = Math.cos(rot), si = Math.sin(rot), at = (u, v) => [cx + dx + u * co - v * si, cy + dy + u * si + v * co]; const [sx, sy] = at(0, -6), [hx, hy] = at(0, 12); oval(sx, sy, 13, 21, '#0c0b0a', 175); oval(hx, hy, 11, 9, '#0c0b0a', 175); oval(sx, sy - 2, 7, 11, '#2a2622', 110); }
        for (let k = 0; k < 8; k++) dot(cx + g.rnd(-24, 24), cy + g.rnd(-24, 24), g.rnd(1, 2.6), '#1a1612', 150); }
      { const [cx, cy] = cellAt(14);                                                                          // soot and ash: a dark smudge made of many faint dots, grey flecks round the edge
        for (let k = 0; k < 26; k++) { const a = g.rnd(0, 6.28), r = 22 * Math.sqrt(g.rnd(0, 1)); dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, g.rnd(9, 20), '#0a0908', 52); }
        for (let k = 0; k < 18; k++) { const a = g.rnd(0, 6.28), r = g.rnd(8, 28); dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, g.rnd(1, 3.4), k % 2 ? '#8a847a' : '#bcb6aa', 120); } }
      { const [cx, cy] = cellAt(15);                                                                          // straw and litter: short pale strands lying every way, a few darker flecks
        for (let k = 0; k < 20; k++) { const a = g.rnd(0, 6.28), l = g.rnd(6, 15), x = cx + g.rnd(-22, 22), y = cy + g.rnd(-22, 22); seg(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, k % 4 ? '#b89c5a' : '#8a7440', g.rnd(1.2, 2), 225); }
        for (let k = 0; k < 7; k++) dot(cx + g.rnd(-24, 24), cy + g.rnd(-24, 24), g.rnd(2, 4), '#5a6a30', 190); }
    }),
  },
};
