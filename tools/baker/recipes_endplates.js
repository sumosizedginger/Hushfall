// THE FOUR EPILOGUE PLATES repainted at 1280 x 720 (2026-10-26, "get the rest of everything done"; the look polish had kept the 320 x 200 set of F9). The same stories, beat for beat (recipes_pt36.js and
// recipes_f9.js say what each must show and why), in the hand of the title and the cold open (recipes_plates.js): gradients for light, screen glows, few bold shapes, rim light on the figures. The page
// lays the cards and a dark gradient over the lower part, so each subject sits high and the foreground low. Nothing here is lit that the text has not lit.
import { R } from './recipes.js';
import { paint2d } from './paint2d.js';

const glow = (K, x, y, r, inner, outer) => { K.mode('screen'); K.radial(x, y, r, inner, outer); K.mode(); };
const ring = (ctx, x, y, rx, ry, color, a, wt) => { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = wt; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
const oval = (ctx, x, y, rx, ry, fill, a = 1) => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
const stars = (K, n, h) => { for (let i = 0; i < n; i++) K.dot(K.R(0, 1280), K.R(0, h), K.R(0.7, 2), K.pick(['#fff0d8', '#d0c8ff', '#fff8e8']), K.R(0.15, 0.7)); };
const grain = (K, n) => { for (let i = 0; i < n; i++) K.dot(K.R(0, 1280), K.R(0, 720), K.R(0.6, 1.8), K.pick(['#fff0d8', '#ffd890', '#9ffff0']), K.R(0.03, 0.12)); };

/** a figure in an oilskin seen from behind: a long coat flared at the hem, shoulders, a hood; `rim` lights the edge on `side` (+1 right, -1 left); `arm` = null, 'up' (a hand raised to a lamp), 'out' (a lamp held out low) */
function figure(K, x, y, s, rim, side, arm = null, lampLit = true) {
  const c = '#10141e';
  K.poly([[x - 24 * s, y], [x + 24 * s, y], [x + 18 * s, y - 50 * s], [x + 25 * s, y - 84 * s], [x + 18 * s, y - 94 * s], [x - 18 * s, y - 94 * s], [x - 25 * s, y - 84 * s], [x - 18 * s, y - 50 * s]], c);
  K.dot(x, y - 108 * s, 14 * s, c); K.poly([[x - 16 * s, y - 100 * s], [x + 16 * s, y - 100 * s], [x + 12 * s, y - 122 * s], [x - 12 * s, y - 122 * s]], c);           // the hood
  if (arm === 'up') { K.stroke(x + side * 20 * s, y - 86 * s, x + side * 30 * s, y - 190 * s, c, 11 * s); K.stroke(x + side * 21 * s, y - 88 * s, x + side * 31 * s, y - 192 * s, rim, 2.2 * s, 0.6); K.dot(x + side * 30 * s, y - 192 * s, 6 * s, c); }          // the arm raised to the lamp, the hand on its ring
  if (arm === 'out') { K.stroke(x + side * 20 * s, y - 84 * s, x + side * 40 * s, y - 40 * s, c, 11 * s); K.stroke(x + side * 41 * s, y - 40 * s, x + side * 41 * s, y - 26 * s, c, 2 * s);
    K.fill(lampLit ? '#ffe0a0' : '#20242c', x + side * 41 * s - 7 * s, y - 26 * s, 14 * s, 18 * s); K.fill('#0a0c10', x + side * 41 * s - 8 * s, y - 28 * s, 16 * s, 3 * s); }
  K.stroke(x + side * 25 * s, y - 84 * s, x + side * 23 * s, y - 6, rim, 2.6 * s, 0.6, 0.02); K.stroke(x + side * 18 * s, y - 94 * s, x + side * 25 * s, y - 84 * s, rim, 2.6 * s, 0.7); K.stroke(x + side * 10 * s, y - 122 * s, x + side * 15 * s, y - 104 * s, rim, 2.4 * s, 0.7);
}

/** the Unrung Gate: a tall arch of dark bronze that is also a bell (the bell in relief across both leaves), set in a wall of dark stone, a stair at its foot; `seam` = how bright the light in its seam is (0..1) */
function unrungDoor(ctx, K, seam) {
  K.grad(0, 0, 1280, 720, [[0, '#0a0a10'], [0.6, '#0e0d14'], [1, '#07070b']]);
  for (let r = 0; r < 12; r++) for (let c = 0; c < 11; c++) { const x = c * 128 + (r % 2) * 64 - 64, y = r * 62; K.fill(K.pick(['#15141c', '#18161f', '#121119']), x + 3, y + 3, 122, 56); K.fill('#22202a', x + 3, y + 3, 122, 2, 0.7); }   // the stone
  const X0 = 452, X1 = 828, TOP = 54, FOOT = 590, MID = 640;
  ctx.save(); ctx.beginPath(); ctx.moveTo(X0, FOOT); ctx.lineTo(X0, 250); ctx.quadraticCurveTo(X0, TOP, MID, TOP); ctx.quadraticCurveTo(X1, TOP, X1, 250); ctx.lineTo(X1, FOOT); ctx.closePath();
  ctx.fillStyle = '#060508'; ctx.lineWidth = 36; ctx.strokeStyle = '#1c1820'; ctx.stroke(); ctx.clip();                                                           // the deep reveal round the arch
  K.grad(X0, TOP, X1 - X0, FOOT - TOP, [[0, '#3a2a1a'], [0.5, '#2c2014'], [1, '#18110a']]);                                                                        // the bronze of the leaves
  for (let k = 0; k < 40; k++) { const x = K.R(X0, X1), y = K.R(TOP, FOOT); K.stroke(x, y, x + K.R(-10, 10), y + K.R(20, 70), '#4a3622', K.R(2, 5), 0.3); }           // patina runs
  // the bell in relief: its outline lit along the top (a little light from the seam), the lip a thick band
  ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(500, 520); ctx.bezierCurveTo(520, 360, 540, 180, MID, 160); ctx.bezierCurveTo(740, 180, 760, 360, 780, 520); ctx.stroke();
  ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.3 * seam; ctx.beginPath(); ctx.moveTo(504, 512); ctx.bezierCurveTo(524, 356, 544, 184, MID, 164); ctx.bezierCurveTo(736, 184, 756, 356, 776, 512); ctx.stroke(); ctx.restore();
  K.fill('#5a4026', 488, 512, 304, 22, 0.9); K.fill('#7a5a34', 488, 512, 304, 4, 0.6 + 0.3 * seam); K.dot(MID, 150, 16, '#4a3420'); K.fill('#4a3420', MID - 6, 120, 12, 32);    // the lip, the crown
  for (const y of [300, 380, 450]) K.stroke(530 + (520 - y) * 0.05, y, 750 - (520 - y) * 0.05, y, '#4a3420', 3, 0.7);                                                    // the bell's bands
  ctx.restore();
  // the seam: down the middle and along the foot
  glow(K, MID, 330, 160 + 120 * seam, `rgba(255,236,200,${0.12 + 0.3 * seam})`, 'rgba(255,236,200,0)');
  K.fill(`rgba(255,246,224,${0.25 + 0.7 * seam})`, MID - 2, TOP + 26, 4, FOOT - TOP - 26); K.fill(`rgba(255,246,224,${0.2 + 0.6 * seam})`, X0 + 6, FOOT - 4, X1 - X0 - 12, 4);
  glow(K, MID, FOOT, 260, `rgba(255,232,190,${0.1 + 0.35 * seam})`, 'rgba(255,232,190,0)');
  // the stair: three wide steps, lit from the seam along their noses
  for (let i = 0; i < 3; i++) { const y = FOOT + i * 40, w2 = 260 + i * 70; K.fill('#14131a', MID - w2, y, w2 * 2, 40); K.fill('#2c2a32', MID - w2, y, w2 * 2, 4, 0.9); K.fill(`rgba(255,232,190,${0.06 + 0.2 * seam})`, MID - w2 * 0.6, y, w2 * 1.2, 3); }
  K.grad(0, 700, 1280, 20, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.6)']]);
}
/** the hook in the wall beside the Gate (right of it), and on it the lantern, lit or not hung at all */
function hook(K, lantern) {
  const HX = 896, HY = 352;
  K.stroke(HX, HY, HX + 24, HY, '#0a0a0e', 6); K.stroke(HX + 24, HY, HX + 24, HY + 22, '#0a0a0e', 5); K.stroke(HX + 24, HY + 22, HX + 14, HY + 30, '#0a0a0e', 4); K.dot(HX, HY, 6, '#1a1a20');
  if (!lantern) return;
  glow(K, HX + 24, HY + 66, 330, 'rgba(255,170,80,0.42)', 'rgba(255,150,70,0)'); glow(K, HX + 24, HY + 66, 70, 'rgba(255,236,190,1)', 'rgba(255,210,140,0)');
  K.stroke(HX + 24, HY + 22, HX + 24, HY + 34, '#0a0a0e', 3); K.fill('#0c0c10', HX + 8, HY + 34, 32, 8); K.fill('#ffd890', HX + 11, HY + 42, 26, 40); K.fill('#fff4d8', HX + 18, HY + 48, 12, 26); K.fill('#0c0c10', HX + 6, HY + 82, 36, 9);
}

export const recipesEndplates = {
  // Campaign One's epilogue: the Gate Warden's doorway seen from the deck: the inside of a bell (rings of bronze and gold closing on a white-gold heart) in a black frame of broken ribs, a lit road
  // of planking to its foot, and one small figure with a lamp, its back to us, in rings of teal sound (the title's rings: this is where the harbour's song was going).
  ui_ending_art: {
    seed: 23601, width: 1280, height: 720,
    draw: R((g, w, h) => paint2d(g, w, h, (ctx, K) => {
      const CX = 640, CY = 250;
      K.grad(0, 0, w, h, [[0, '#08060f'], [0.5, '#120c1c'], [1, '#06050a']]); stars(K, 180, 260);
      glow(K, CX, CY, 620, 'rgba(255,200,110,0.3)', 'rgba(255,170,80,0)');
      const rings = [[300, '#3a2412', '#6a4420'], [256, '#5a3818', '#8a5a26'], [212, '#7a4e1e', '#b07a30'], [170, '#a06a26', '#d8a040'], [128, '#c8902e', '#f0c060'], [88, '#e8b850', '#ffe08e'], [52, '#ffe08e', '#fff4cc'], [24, '#fff8e6', '#ffffff']];
      for (const [r, body, lip] of rings) { oval(ctx, CX, CY, r, r * 1.08, body); ring(ctx, CX, CY + r * 0.05, r * 0.97, r * 1.04, lip, 0.85, Math.max(2, r * 0.035)); }       // the bell's throat: each ring's lit lip below its body
      glow(K, CX, CY, 140, 'rgba(255,250,230,0.9)', 'rgba(255,230,170,0)');
      // the frame of broken ribs round it, black against the glow
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + K.R(-0.06, 0.06), broken = K.R(0, 1) < 0.3, r0 = 300, r1 = broken ? K.R(360, 420) : K.R(470, 620), wd = K.R(0.05, 0.09);
        const P = (r, da) => [CX + Math.sin(a + da) * r, CY - Math.cos(a + da) * r * 1.08];
        K.poly([P(r0, -wd), P(r0, wd), P(r1, wd * 0.35), P(r1, -wd * 0.35)], '#050407');
        if (broken) K.poly([P(r1, -wd * 0.35), P(r1, wd * 0.35), P(r1 + 22, 0)], '#050407');
      }
      K.fill('#050407', 0, 470, w, h - 470);
      // the road of planks to its foot, lit by the doorway, the seams running to it
      ctx.save(); ctx.beginPath(); ctx.moveTo(CX - 70, 470); ctx.lineTo(CX + 70, 470); ctx.lineTo(CX + 560, h); ctx.lineTo(CX - 560, h); ctx.closePath(); ctx.clip();
      K.grad(0, 470, w, h - 470, [[0, '#e8b860'], [0.25, '#8a6030'], [1, '#1a120a']]);
      for (let i = -12; i <= 12; i++) K.stroke(CX + i * 6, 470, CX + i * 47, h, '#140c06', 3, 0.75);
      for (let k = 0; k < 9; k++) { const y = 480 + Math.pow(k / 9, 1.6) * 240; K.stroke(0, y, w, y, '#140c06', 2, 0.35); }
      ctx.restore();
      // rings of sound round the figure on the road, and the figure with its lamp
      for (const [rx, a] of [[60, 0.75], [120, 0.55], [200, 0.38], [300, 0.24], [420, 0.14]]) ring(ctx, CX + 10, 640, rx, rx * 0.22, '#4ffff0', a, 3);
      glow(K, CX + 10, 640, 120, 'rgba(80,255,230,0.25)', 'rgba(80,255,230,0)');
      glow(K, CX + 46, 604, 60, 'rgba(255,220,150,0.9)', 'rgba(255,200,120,0)');
      figure(K, CX, 654, 0.62, '#ffd890', 1, 'out');
      grain(K, 220);
    })),
  },

  // The first cards of Campaign One's epilogue: the coast from the lighthouse gallery, the night the Gate opened. Below, Port Marrow in stepped roofs along the bay, the church tower's bell frame lit teal,
  // the street a pale line with the people standing still in it, faces up, small and dark with a teal rim. Far off over the water, low on the horizon, the Gate's gold light and its rings of teal sound.
  // In front: the gallery rail in black and the set that Signal House talks through, one warm dial.
  ui_ending_coast: {
    seed: 23602, width: 1280, height: 720,
    draw: R((g, w, h) => paint2d(g, w, h, (ctx, K) => {
      const HZ = 300, GX = 1110;
      K.grad(0, 0, w, HZ + 4, [[0, '#05060f'], [0.55, '#10122a'], [0.85, '#2a2040'], [1, '#4a3040']]); stars(K, 240, 240);
      glow(K, GX, HZ, 520, 'rgba(255,200,110,0.4)', 'rgba(255,170,80,0)'); glow(K, GX, HZ, 90, 'rgba(255,240,200,1)', 'rgba(255,210,140,0)');
      for (const [rx, a] of [[70, 0.8], [140, 0.6], [230, 0.42], [340, 0.28], [470, 0.16]]) ring(ctx, GX, HZ, rx, rx * 0.3, '#4ffff0', a, 3);
      K.grad(0, HZ, w, 260, [[0, '#121a2a'], [1, '#06080e']]);                                                                                                       // the bay
      for (let i = 0; i < 40; i++) { const y = HZ + 4 + i * 4, half = 90 - i * 1.6; K.stroke(GX - half, y, GX + half, y, i < 16 ? '#ffd890' : '#c08050', K.R(2, 4), 0.7 - i * 0.016); }
      for (let i = 0; i < 160; i++) { const x = K.R(0, w), y = K.R(HZ + 6, 560); K.stroke(x, y, x + K.R(20, 70), y, K.pick(['#1a2a3c', '#24384c']), K.R(1.5, 3), 0.55); }
      // the town on its curve of shore, roofs stepping down to the water, a few warm windows
      const shore = (x) => 560 - 200 * Math.sin(Math.min(1, x / 900) * Math.PI / 2);
      let x = -20; while (x < 800) { const ww = K.R(46, 86), base = shore(x), hh = K.R(40, 90), top = base - hh; K.fill('#0a0b12', x, top, ww, h - top); K.poly([[x - 6, top], [x + ww + 6, top], [x + ww / 2, top - K.R(18, 40)]], '#0a0b12');
        for (let i = 0; i < Math.floor(ww / 26); i++) if (K.R(0, 1) < 0.45) { const wy = top + K.R(14, hh - 20); K.fill(K.pick(['#ffd890', '#ffb45a']), x + 10 + i * 24, wy, 9, 12); glow(K, x + 14 + i * 24, wy + 6, 18, 'rgba(255,190,110,0.4)', 'rgba(255,170,90,0)'); }
        x += ww + K.R(-4, 8); }
      const TX = 430, TY = shore(TX) - 230; K.fill('#0a0b12', TX - 26, TY, 52, 260); K.poly([[TX - 34, TY], [TX + 34, TY], [TX, TY - 70]], '#0a0b12');                       // the church tower
      for (const ax of [-18, -2, 14]) K.fill('#7ffff0', TX + ax, TY + 14, 8, 30); glow(K, TX, TY + 28, 110, 'rgba(80,255,230,0.5)', 'rgba(60,255,224,0)');
      // the quay below the gallery, a pale line along the water, and the people standing on it with their faces up (teal rims)
      K.fill('#1a1c22', 0, 572, 980, 6); K.fill('#8a8478', 0, 572, 980, 2, 0.5);
      for (let i = 0; i < 26; i++) { const px = K.R(30, 960), py = 571 + K.R(-2, 2), s = K.R(0.9, 1.3); K.fill('#0e1220', px - 3 * s, py - 14 * s, 6 * s, 14 * s); K.dot(px, py - 17 * s, 3 * s, '#0e1220'); K.stroke(px + 3 * s, py - 18 * s, px + 3 * s, py, '#4ffff0', 1.2 * s, 0.6); }
      // the gallery rail of the lighthouse, black, and the set with its one warm dial
      K.fill('#030305', 0, 600, w, 14); K.fill('#16161c', 0, 600, w, 2); for (let x2 = 30; x2 < w; x2 += 70) K.fill('#030305', x2, 614, 9, 106); K.fill('#030305', 0, 690, w, 30);
      K.fill('#08080c', 1010, 560, 220, 130); K.fill('#16161e', 1010, 560, 220, 4); K.dot(1090, 625, 26, '#1a1408'); K.dot(1090, 625, 20, '#ffb45a', 0.9); K.stroke(1090, 625, 1104, 611, '#2a1a08', 3); glow(K, 1090, 625, 90, 'rgba(255,170,80,0.45)', 'rgba(255,150,70,0)');
      for (let i = 0; i < 5; i++) K.dot(1160 + (i % 2) * 24, 590 + Math.floor(i / 2) * 26, 6, '#24242c');
      grain(K, 220);
    })),
  },

  // Campaign Two's epilogue: the Unrung Gate seen from the Vael side. The door of dark bronze that is also a bell, a seam of pale light down its middle and along its foot, the lantern hung on the hook
  // beside it (the only warm light), and her in an oilskin with her hand up to the lamp, her back to us. No rings of sound: nothing is ringing.
  ui_ending_art_2: {
    seed: 23603, width: 1280, height: 720,
    draw: R((g, w, h) => paint2d(g, w, h, (ctx, K) => {
      unrungDoor(ctx, K, 1); hook(K, true);
      glow(K, 882, 560, 140, 'rgba(255,170,80,0.25)', 'rgba(255,150,70,0)');
      figure(K, 890, 650, 1.05, '#ffc070', 1, 'up');
      grain(K, 200);
    })),
  },

  // The first cards of Campaign Two's epilogue: the same door before the lamp is lit. The seam barely there, the hook empty, and her at the foot of the stair with the lamp in her hand, dark.
  ui_ending_lamp_dark: {
    seed: 23604, width: 1280, height: 720,
    draw: R((g, w, h) => paint2d(g, w, h, (ctx, K) => {
      unrungDoor(ctx, K, 0.15); hook(K, false);
      figure(K, 640, 712, 1.05, '#8a8478', -1, 'out', false);
      grain(K, 160);
    })),
  },
};
