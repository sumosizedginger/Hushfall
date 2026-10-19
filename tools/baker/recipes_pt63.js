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
};
