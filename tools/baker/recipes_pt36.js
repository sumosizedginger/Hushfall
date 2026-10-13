// PT-036, the end of Campaign One: the picture behind the epilogue. The Gate Warden's doorway seen from the deck: the inside of a bell (rings of bronze and gold closing on a white-gold heart), a black frame of
// broken ribs round it, a lit road of planking running to its foot, and one small figure with a lamp, its back to us, in rings of teal sound (the same rings as the title picture: that one is the harbour at dusk,
// this is where the harbour's song was going). Not a tiling material: a 320 x 200 painting, opaque, plain p5 for every hard shape (a brush fill in the hundreds hangs the baker); the page puts it behind the
// cards and a dark gradient, so the doorway sits high and the road and the figure low. Same conventions as `ui_title_art` in recipes_pt21.js.
import { R } from './recipes.js';
import { hex } from './paint_util.js';

const pick = (g, arr) => arr[Math.floor(g.rnd(0, arr.length))];
const rgba = (g, c, a) => { const [r, gg, b] = hex(c); g.p.fill(r, gg, b, a); };

export const recipesPT36 = {
  ui_ending_art: {
    seed: 3601, width: 320, height: 200,
    draw: R((g, w, h) => {
      const W2 = g.p.width / 2, H2 = g.p.height / 2;                                                       // (g.p works in a frame centred on the canvas)
      const dot = (x, y, d, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, d, d); g.p.pop(); };
      const oval = (x, y, ww, hh, c, a) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const ring = (x, y, ww, hh, c, a, wt = 1) => { g.p.push(); g.p.noFill(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const seg = (x1, y1, x2, y2, c, wt, a = 255) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 - W2, y1 - H2, x2 - W2, y2 - H2); g.p.pop(); };
      const tri = (x1, y1, x2, y2, x3, y3, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.triangle(x1 - W2, y1 - H2, x2 - W2, y2 - H2, x3 - W2, y3 - H2); g.p.pop(); };
      const quad = (x1, y1, x2, y2, x3, y3, x4, y4, c, a = 255) => { tri(x1, y1, x2, y2, x3, y3, c, a); tri(x1, y1, x3, y3, x4, y4, c, a); };     // two triangles: the one shape proven in this baker
      const CX = 160, CY = 78, FLOOR = 150;

      g.noStroke(); g.bleed(0.8, 'out');
      ['#04050b', '#070813', '#0c0b1e', '#13112c', '#1b1638', '#241c40', '#2c2040'].forEach((c, i) => { g.fill(c, 245); g.rect(-10, i * 22 - 8, w + 20, 34); });        // the dark of the Hollow Sky, a violet haze low down
      for (let i = 0; i < 70; i++) dot(g.rnd(0, w), g.rnd(0, 118), g.rnd(0.8, 1.7), pick(g, ['#fff0d8', '#d0c8ff', '#fff8e8']), g.rnd(50, 150));                        // the stars
      for (let k = 0; k < 7; k++) oval(CX, CY, 330 - k * 34, 270 - k * 30, '#ffd890', 16 + k * 3);                                                                       // the Gate's light thrown on the dark: a warm haze
      // the doorway: the inside of a bell, rings of bronze closing on a white-gold heart (drawn largest first)
      const BELL = ['#2a1c1a', '#3d2a1c', '#5a3d20', '#7d5726', '#a37630', '#c99a40', '#e6bc5c', '#f6d686', '#fff0b8', '#fffbe6'];
      BELL.forEach((c, i) => { const r = 80 - i * 8; dot(CX, CY, r * 2, c, 255); if (i < 9) ring(CX, CY, r * 2, r * 2, i % 3 === 0 ? '#3fffe0' : '#1a1008', i % 3 === 0 ? 70 : 130, 1); });        // each step a band of metal with a ridge; every third ridge verdigris
      for (let i = 0; i < 26; i++) { const a = g.rnd(0, Math.PI * 2), r0 = g.rnd(12, 64), l = g.rnd(6, 18); seg(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0, CX + Math.cos(a) * (r0 + l), CY + Math.sin(a) * (r0 + l), pick(g, ['#fff0b8', '#7d5726']), g.rnd(0.6, 1.4), g.rnd(60, 150)); }   // hammer marks
      dot(CX, CY, 22, '#ffffff', 235); dot(CX, CY, 46, '#fffbe6', 70);                                                                                                  // the heart
      ring(CX, CY, 176, 176, '#050609', 255, 9);                                                                                                                        // the frame the Warden left
      for (const sx of [-1, 1]) {                                                                                                                                        // broken ribs either side, black against the light
        const X = (v) => (sx < 0 ? v : w - v);
        tri(X(0), 0, X(26), 0, X(0), 168, '#050609'); tri(X(26), 0, X(44), 0, X(6), 176, '#050609', 235); tri(X(0), 40, X(58), 74, X(0), 92, '#050609', 220);
        tri(X(10), FLOOR - 4, X(34), FLOOR - 4, X(18), FLOOR - 46, '#050609'); tri(X(36), FLOOR - 2, X(52), FLOOR - 2, X(44), FLOOR - 30, '#050609', 235);
      }
      // the deck and the road of light running to the foot of the Gate
      g.solid(0, FLOOR, w, h - FLOOR, '#06070b'); g.solid(0, FLOOR - 1, w, 2, '#241a1c');
      quad(CX - 24, FLOOR, CX + 24, FLOOR, CX + 118, h, CX - 118, h, '#e6bc5c', 62); quad(CX - 12, FLOOR, CX + 12, FLOOR, CX + 52, h, CX - 52, h, '#fff0b8', 56);
      for (let i = -9; i <= 9; i++) seg(CX + i * 3.2, FLOOR, CX + i * 22, h, '#0a0810', i % 2 ? 1 : 1.6, 150);                                                          // planks converging on the Gate
      for (let k = 0; k < 7; k++) seg(CX - 28 - k * 14, FLOOR + 4 + k * 8, CX + 28 + k * 14, FLOOR + 4 + k * 8, '#050609', 0.8 + k * 0.1, 90);                           // and their joints
      // the rings of sound, the same teal as the title picture, spreading from where she stands
      for (const [rx, ry, a] of [[12, 3, 220], [26, 6, 180], [44, 10, 140], [68, 15, 100], [98, 22, 60]]) ring(CX, 186, rx * 2, ry * 2, '#3fffe0', a, 1.3);
      // the figure: a column of oilskin, a hood, a lamp in the hand, her back to us
      tri(CX - 10, 192, CX + 10, 192, CX, 158, '#030304'); g.solid(CX - 6, 158, 12, 21, '#030304'); dot(CX, 152, 10, '#030304');
      seg(CX - 6, 166, CX - 16, 178, '#030304', 3); dot(CX - 17, 181, 6, '#ffe0a0'); dot(CX - 17, 181, 20, '#ffb45a', 70); dot(CX - 17, 181, 42, '#ffb45a', 34);       // the lamp
      oval(CX - 10, 192, 52, 7, '#ffb45a', 56); oval(CX - 10, 192, 28, 4, '#ffd48a', 80);                                                                               // its pool on the planks
      for (let i = 0; i < 60; i++) dot(g.rnd(0, w), g.rnd(0, h), g.rnd(0.7, 1.5), pick(g, ['#fff0d8', '#ffd890']), g.rnd(30, 90));                                        // the grain of the air
    }),
  },
  // PT-043, the end of Campaign Two: the picture behind ENDINGS[2] (the Unrung Gate). The Gate seen from the Vael side: a tall door of dark bronze that is also a bell (a bell in relief across both leaves, a seam of pale light down the middle and along its foot),
  // a hook in the wall beside it with a lantern hung on it, the only warm light in the picture, and one small figure in an oilskin with her hand up to the lamp, her back to us. No rings of sound: nothing is ringing. Same conventions as ui_ending_art above.
  ui_ending_art_2: {
    seed: 3602, width: 320, height: 200,
    draw: R((g, w, h) => {
      const W2 = g.p.width / 2, H2 = g.p.height / 2;
      const dot = (x, y, d, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, d, d); g.p.pop(); };
      const oval = (x, y, ww, hh, c, a) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const ring = (x, y, ww, hh, c, a, wt = 1) => { g.p.push(); g.p.noFill(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.ellipse(x - W2, y - H2, ww, hh); g.p.pop(); };
      const seg = (x1, y1, x2, y2, c, wt, a = 255) => { g.p.push(); const [r, gg, b] = hex(c); g.p.stroke(r, gg, b, a); g.p.strokeWeight(wt); g.p.line(x1 - W2, y1 - H2, x2 - W2, y2 - H2); g.p.pop(); };
      const tri = (x1, y1, x2, y2, x3, y3, c, a = 255) => { g.p.push(); g.p.noStroke(); rgba(g, c, a); g.p.triangle(x1 - W2, y1 - H2, x2 - W2, y2 - H2, x3 - W2, y3 - H2); g.p.pop(); };
      const quad = (x1, y1, x2, y2, x3, y3, x4, y4, c, a = 255) => { tri(x1, y1, x2, y2, x3, y3, c, a); tri(x1, y1, x3, y3, x4, y4, c, a); };
      const CX = 176, FLOOR = 152;
      g.noStroke(); g.bleed(0.8, 'out');
      ['#040508', '#06070c', '#0a0a12', '#0e0d17', '#12101c', '#171322', '#1c1728'].forEach((c, i) => { g.fill(c, 250); g.rect(-10, i * 22 - 8, w + 20, 34); });             // the dark of a stone hall, a violet haze low down
      // the wall and the door: a tall arch of dark bronze, two leaves, a bell in relief across them
      quad(70, 0, 282, 0, 282, FLOOR, 70, FLOOR, '#0c0b12', 255);
      for (let k = 0; k < 6; k++) seg(70, 24 + k * 22, 282, 24 + k * 22, '#050509', 1.2, 150);                                                                                    // courses of stone
      quad(CX - 46, 34, CX + 46, 34, CX + 46, FLOOR, CX - 46, FLOOR, '#2a1c14', 255); oval(CX, 34, 92, 60, '#2a1c14', 255);
      quad(CX - 40, 38, CX + 40, 38, CX + 40, FLOOR, CX - 40, FLOOR, '#3e2a1a', 255); oval(CX, 38, 80, 54, '#3e2a1a', 255);
      for (let k = 0; k < 10; k++) { const c = ['#4a3220', '#56391f', '#46301c'][k % 3]; quad(CX - 38 + k * 8, 48, CX - 30 + k * 8, 48, CX - 30 + k * 8, FLOOR, CX - 38 + k * 8, FLOOR, c, 120); }
      // the bell in relief: a dome, a straight waist, a flared lip
      oval(CX, 64, 54, 46, '#6a4a28', 255); quad(CX - 24, 66, CX + 24, 66, CX + 34, 124, CX - 34, 124, '#6a4a28', 255); oval(CX, 126, 70, 12, '#7a5a30', 255);
      oval(CX, 62, 40, 30, '#7e5a30', 160); seg(CX - 26, 98, CX + 26, 98, '#2a1c10', 1.6, 200); seg(CX - 31, 112, CX + 31, 112, '#2a1c10', 1.6, 200); ring(CX, 126, 70, 12, '#c8964a', 180, 1.4);
      dot(CX, 40, 7, '#c8964a', 230); seg(CX, 28, CX, 36, '#1a1008', 2);                                                                                                           // the crown of the bell and the staple it hangs from
      seg(CX, 34, CX, FLOOR, '#fff0c8', 1.6, 210); seg(CX - 40, FLOOR - 1, CX + 40, FLOOR - 1, '#fff0c8', 1.4, 190);                                                          // a seam of pale light down the middle and along its foot: the other side
      oval(CX, FLOOR - 1, 100, 6, '#fff0c8', 40);
      // the hook in the wall and the lantern on it: the only warm light
      seg(112, 74, 112, 84, '#1a1210', 3); seg(112, 84, 120, 84, '#1a1210', 2.4); quad(106, 86, 116, 86, 118, 102, 104, 102, '#3a2a1a', 255); quad(108, 88, 114, 88, 115, 100, 107, 100, '#ffd890', 255); dot(111, 94, 8, '#fffbe6', 255);
      for (let k = 0; k < 5; k++) oval(111, 94, 160 - k * 28, 150 - k * 26, '#ffb45a', 16 + k * 6);
      // the floor: dark slabs in perspective, the lamp's pool on it
      g.solid(0, FLOOR, w, h - FLOOR, '#07070b'); g.solid(0, FLOOR - 1, w, 2, '#241a1c');
      for (let i = -8; i <= 8; i++) seg(CX + i * 6, FLOOR, CX + i * 40, h, '#030305', 1, 150); for (let k = 0; k < 5; k++) seg(0, FLOOR + 6 + k * 11, w, FLOOR + 6 + k * 11, '#030305', 0.9 + k * 0.2, 130);
      oval(128, 168, 120, 14, '#ffb45a', 40); oval(128, 168, 66, 8, '#ffd48a', 60);
      // the figure: a column of oilskin, a hood, one arm up to the lamp, her back to us
      tri(112, 190, 138, 190, 125, 148, '#030304'); quad(119, 146, 131, 146, 133, 168, 117, 168, '#030304'); dot(125, 140, 11, '#030304'); seg(120, 150, 112, 126, '#030304', 3.2); dot(112, 124, 4, '#030304');
      for (let i = 0; i < 70; i++) dot(g.rnd(0, w), g.rnd(0, h), g.rnd(0.7, 1.5), pick(g, ['#fff0d8', '#ffd890']), g.rnd(24, 80));                                                // the grain of the air
    }),
  },
};
