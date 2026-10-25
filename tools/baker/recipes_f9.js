// FREEZE F9 (the painted plates of the two epilogues): the pictures behind the cards that were missing. Campaign One's epilogue sat on one plate (the Gate's doorway) for seven cards; its first three cards are about the coast, so they get the coast. Campaign Two's epilogue
// sat on one plate (the door with the lamp already lit) for nine cards; its first four cards come BEFORE the lamp is lit, so they get the door with the lamp dark. Same conventions as `ui_ending_art` in recipes_pt36.js: a 320 x 200 painting, opaque, plain p5 for every hard
// shape (a brush fill in the hundreds hangs the baker), the page puts it behind the cards and a dark gradient, so the subject sits high and the foreground low. Nothing here is lit that the text has not lit.
import { R } from './recipes.js';
import { hex } from './paint_util.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };
/** the little kit every plate here draws with (g.p works in a frame centred on the canvas) */
const kit = (g) => {
  const W2 = g.p.width / 2, H2 = g.p.height / 2;
  const dot = (x, y, d, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, d, d); g.p.pop(); };
  const oval = (x, y, ww, hh, c, a) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
  const ring = (x, y, ww, hh, c, a, wt = 1) => { g.p.push(); g.p.noFill(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
  const seg = (x1, y1, x2, y2, c, wt, a = 255) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 - W2, y1 - H2, x2 - W2, y2 - H2); g.p.pop(); };
  const tri = (x1, y1, x2, y2, x3, y3, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.triangle(x1 - W2, y1 - H2, x2 - W2, y2 - H2, x3 - W2, y3 - H2); g.p.pop(); };
  const quad = (x1, y1, x2, y2, x3, y3, x4, y4, c, a = 255) => { tri(x1, y1, x2, y2, x3, y3, c, a); tri(x1, y1, x3, y3, x4, y4, c, a); };
  const box = (x, y, ww, hh, c, a = 255) => quad(x, y, x + ww, y, x + ww, y + hh, x, y + hh, c, a);
  return { dot, oval, ring, seg, tri, quad, box };
};

export const recipesF9 = {
  // The coast from the lighthouse gallery, the night the Gate opened. Below: Port Marrow in stepped roofs along a bay, a church tower with its bell frame lit teal, the street a pale line, and in it and on the quay the people standing still with their faces up, small and
  // dark with a teal rim. Far off over the water, low on the horizon, the Gate's gold light and rings of teal sound spreading from it. In front: the gallery rail of the lighthouse in black and the set that Signal House talks through, one warm dial.
  ui_ending_coast: {
    seed: 9101, width: 320, height: 200,
    draw: R((g, w, h) => {
      const { dot, oval, ring, seg, tri, quad, box } = kit(g), HZ = 98, SEA = 112;
      g.noStroke(); g.bleed(0.8, 'out');
      ['#04050b', '#070813', '#0c0b1e', '#13112c', '#1d1638', '#2b1d42', '#432a48', '#6a3a48'].forEach((c, i) => { g.fill(c, 250); g.rect(-10, i * 14 - 6, w + 20, 24); });        // night going to a bruise of warm light at the horizon
      for (let i = 0; i < 70; i++) dot(g.rnd(0, w), g.rnd(0, 70), g.rnd(0.7, 1.6), pick(g, ['#fff0d8', '#d0c8ff', '#fff8e8']), g.rnd(40, 150));                              // the stars
      // the Gate, far off over the water: a gold glow on the horizon, a white heart, and the teal rings of the Hush spreading over the whole sky
      for (let k = 0; k < 7; k++) oval(250, HZ, 260 - k * 30, 120 - k * 14, '#ffd890', 14 + k * 4);
      dot(250, HZ - 2, 14, '#fffbe6', 240); dot(250, HZ - 2, 34, '#fff0b8', 70);
      for (const [rx, ry, a] of [[30, 14, 210], [58, 26, 170], [92, 42, 130], [132, 60, 90], [178, 80, 56]]) ring(250, HZ - 2, rx * 2, ry * 2, '#3fffe0', a, 1.2);
      // the far headland and the water
      tri(150, HZ + 1, 330, HZ + 1, 330, HZ - 20, '#090a14'); tri(200, HZ + 1, 330, HZ - 20, 280, HZ - 6, '#090a14');
      g.solid(0, HZ, w, h - HZ, '#07090f'); for (let i = 0; i < 20; i++) { const yy = HZ + 2 + i * 2.4; seg(250 - 40 + Math.sin(i * 1.7) * 6, yy, 250 + 40 + Math.sin(i * 1.7) * 6, yy, '#ffd890', 1, 56 - i * 2.3); }
      // the town along the bay: stepped roofs with a few warm windows, the church tower in the middle with its bell frame lit teal
      let x = -6; while (x < 318) {
        const ww = g.rnd(14, 26), hh = g.rnd(12, 30), top = SEA - hh; box(x, top, ww, hh + 40, '#090a13'); tri(x - 2, top, x + ww + 2, top, x + ww / 2, top - g.rnd(5, 11), '#090a13');
        const nw = Math.floor(ww / 9); for (let k = 0; k < nw; k++) if (g.rnd(0, 1) < 0.5) box(x + 3 + k * 9, top + 6 + g.rnd(0, hh - 14), 3, 4, '#ffb45a', 190); x += ww + g.rnd(0, 3);
      }
      box(150, SEA - 62, 20, 64, '#0b0c14'); tri(146, SEA - 62, 174, SEA - 62, 160, SEA - 84, '#0b0c14'); for (const ax of [-5, 1]) { box(150 + 5 + ax + 3, SEA - 56, 5, 11, '#9ffff0', 255); box(150 + 6 + ax + 3, SEA - 54, 3, 7, '#e8fffb', 255); }
      for (let k = 0; k < 4; k++) oval(160, SEA - 50, 60 - k * 12, 44 - k * 9, '#3fffe0', 16 + k * 8);
      // the streets and the quay below it: pale lines, and the people in them, standing still, their faces up
      g.solid(0, SEA + 14, w, h - SEA - 14, '#06070c'); seg(0, SEA + 16, w, SEA + 16, '#241a1c', 2, 200);
      for (let i = -9; i <= 9; i++) seg(160 + i * 3, SEA + 16, 160 + i * 34, h, '#0b0c14', 1, 170); for (let k = 0; k < 5; k++) seg(0, SEA + 24 + k * 14, w, SEA + 24 + k * 14, '#0b0c14', 1, 140);
      const person = (px, py, s) => {                                                                                                                                          // a figure seen from above and behind: a dark oval of shoulders, a pale face turned up, the teal on the edge that faces the sky
        oval(px, py, 9 * s, 6 * s, '#0a0b12', 255); dot(px, py - 3 * s, 5 * s, '#0e1220'); dot(px + 0.4 * s, py - 4 * s, 2.2 * s, '#9ffff0', 130); seg(px + 3.6 * s, py - 1.4 * s, px + 4 * s, py + 1.4 * s, '#3fffe0', 0.9, 150);
      };
      for (let i = 0; i < 96; i++) { const row = Math.floor(i / 16), px = 8 + (i % 16) * 19.5 + g.rnd(-5, 5), py = SEA + 22 + row * 12 + g.rnd(-2, 2); person(px, py, 0.8 + row * 0.13); }
      // the lighthouse gallery in front: the rail in black, the Signal House set on the ledge with one warm dial
      g.solid(0, 178, w, 22, '#030304'); seg(0, 176, w, 176, '#0a0a10', 2.2, 255); for (let i = 0; i < 17; i++) seg(i * 20 + 6, 176, i * 20 + 6, 154, '#030304', 2.4); seg(0, 154, w, 154, '#030304', 3);
      box(212, 160, 62, 18, '#0d0c10'); box(214, 162, 58, 14, '#16141a'); dot(228, 169, 7, '#ffe0a0'); dot(228, 169, 22, '#ffb45a', 74); dot(228, 169, 46, '#ffb45a', 28); for (let k = 0; k < 4; k++) dot(246 + k * 6, 169, 3, '#3a3438');
      seg(262, 160, 270, 132, '#030304', 1.4); seg(270, 132, 272, 120, '#030304', 1);                                                                                            // its aerial
      oval(236, 178, 90, 7, '#ffb45a', 40);
      for (let i = 0; i < 60; i++) dot(g.rnd(0, w), g.rnd(0, h), g.rnd(0.7, 1.5), pick(g, ['#fff0d8', '#ffd890', '#9ffff0']), g.rnd(24, 80));                                      // the grain of the air
    }),
  },
  // The door of the Unrung Gate before the lamp is lit: the same door and wall as ui_ending_art_2 (a tall arch of dark bronze that is also a bell, a seam of pale light barely there), the hook empty beside it, and her at the foot of the stair with the lamp in her hand, dark.
  // The only light is the seam, and it is faint. Same conventions as ui_ending_art_2.
  ui_ending_lamp_dark: {
    seed: 9102, width: 320, height: 200,
    draw: R((g, w, h) => {
      const { dot, oval, seg, tri, quad } = kit(g), CX = 176, FLOOR = 152;
      g.noStroke(); g.bleed(0.8, 'out');
      ['#030407', '#04050a', '#07070d', '#0a0910', '#0d0b14', '#100e18', '#14111c'].forEach((c, i) => { g.fill(c, 252); g.rect(-10, i * 22 - 8, w + 20, 34); });                       // darker than the lit plate: a stone hall with nothing burning in it
      quad(70, 0, 282, 0, 282, FLOOR, 70, FLOOR, '#090910', 255); for (let k = 0; k < 6; k++) seg(70, 24 + k * 22, 282, 24 + k * 22, '#040408', 1.2, 150);
      quad(CX - 46, 34, CX + 46, 34, CX + 46, FLOOR, CX - 46, FLOOR, '#1e150f', 255); oval(CX, 34, 92, 60, '#1e150f', 255);
      quad(CX - 40, 38, CX + 40, 38, CX + 40, FLOOR, CX - 40, FLOOR, '#2c1f14', 255); oval(CX, 38, 80, 54, '#2c1f14', 255);
      for (let k = 0; k < 10; k++) quad(CX - 38 + k * 8, 48, CX - 30 + k * 8, 48, CX - 30 + k * 8, FLOOR, CX - 38 + k * 8, FLOOR, ['#33231a', '#3a281a', '#30211a'][k % 3], 110);
      oval(CX, 64, 54, 46, '#4a3520', 255); quad(CX - 24, 66, CX + 24, 66, CX + 34, 124, CX - 34, 124, '#4a3520', 255); oval(CX, 126, 70, 12, '#56402a', 255);
      oval(CX, 62, 40, 30, '#5a4026', 130); seg(CX - 26, 98, CX + 26, 98, '#1e150a', 1.6, 200); seg(CX - 31, 112, CX + 31, 112, '#1e150a', 1.6, 200); dot(CX, 40, 7, '#8a6a38', 200); seg(CX, 28, CX, 36, '#120a06', 2);
      seg(CX, 34, CX, FLOOR, '#fff0c8', 1.1, 120); seg(CX - 40, FLOOR - 1, CX + 40, FLOOR - 1, '#fff0c8', 1, 100); oval(CX, FLOOR - 1, 100, 5, '#fff0c8', 22);                       // the seam and the sill: the other side, barely
      seg(112, 74, 112, 84, '#120d0b', 3); seg(112, 84, 120, 84, '#120d0b', 2.4); seg(112, 84, 112, 90, '#120d0b', 1.6);                                                          // the hook, with nothing on it
      g.solid(0, FLOOR, w, h - FLOOR, '#050508'); g.solid(0, FLOOR - 1, w, 2, '#1a1315');
      for (let i = -8; i <= 8; i++) seg(CX + i * 6, FLOOR, CX + i * 40, h, '#020204', 1, 150); for (let k = 0; k < 5; k++) seg(0, FLOOR + 6 + k * 11, w, FLOOR + 6 + k * 11, '#020204', 0.9 + k * 0.2, 130);
      oval(CX, FLOOR + 4, 130, 7, '#fff0c8', 18);                                                                                                                                   // the light of the seam laid on the floor
      // her: the oilskin column, the hood, one arm down with the lamp, dark, hanging from her hand; her back to us
      tri(112, 190, 138, 190, 125, 148, '#020203'); quad(119, 146, 131, 146, 133, 168, 117, 168, '#020203'); dot(125, 140, 11, '#020203'); seg(131, 152, 140, 176, '#020203', 3);
      quad(137, 176, 145, 176, 146, 190, 136, 190, '#1a1410', 255); quad(139, 178, 143, 178, 144, 188, 138, 188, '#0a0807', 255); seg(138, 176, 144, 176, '#6a5028', 1.4, 200);        // the lamp: unlit glass, a brass cap
      for (let i = 0; i < 40; i++) dot(g.rnd(0, w), g.rnd(0, h), g.rnd(0.7, 1.4), pick(g, ['#fff0d8', '#ffd890']), g.rnd(14, 46));                                                 // dust in the dark
    }),
  },
};
