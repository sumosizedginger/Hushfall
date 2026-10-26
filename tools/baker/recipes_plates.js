// LOOK POLISH 9 (2026-10-26): the two plates that make the first impression, painted at 1280 x 720 in the hand of the polish pass (recipes_polish.js says what that is). The four epilogue plates of F9
// stay as they are: a set made together, flat and graphic on purpose. The page shows a plate this size smoothed, not pixelated (index.html `.hires`, set by main.js from the image's own width).
import { R } from './recipes.js';
import { paint2d } from './paint2d.js';

const screenGlow = (K, x, y, r, inner, outer) => { K.mode('screen'); K.radial(x, y, r, inner, outer); K.mode(); };
const ellipseRing = (ctx, x, y, rx, ry, color, a, wt) => { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = wt; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };

export const recipesPlates = {
  // The title: the harbour at its one dusk hour. A low sun behind banks of lit cloud, its road on dark water, the bell tower against it with one lit window, the far quays and a crane, a lamp on the
  // near quay with its pool of light, and rings of teal sound spreading on the water (the Vael's voice). The page draws the name and the whole menu down the left two fifths, so everything that
  // speaks is right of x 560 and a dark wash calms the left (the first bake put the lamp and the crane under the menu).
  ui_title_art: {
    seed: 24401, width: 1280, height: 720,
    draw: R((g, w, h) => paint2d(g, w, h, (ctx, K) => {
      const SEA = 462, SX = 860, SY = 440, TX = 960, sil = '#0b0814';
      K.grad(0, 0, w, SEA + 4, [[0, '#0e0b22'], [0.22, '#221a44'], [0.42, '#4a2858'], [0.6, '#8a3a62'], [0.76, '#cc6a5e'], [0.9, '#eea05e'], [1, '#f6c27a']]);
      for (let i = 0; i < 160; i++) K.dot(K.R(0, w), K.R(0, 200), K.R(0.8, 2.2), K.pick(['#fff0d8', '#d8d0ff']), K.R(0.25, 0.8));
      screenGlow(K, SX, SY, 620, 'rgba(255,190,120,0.55)', 'rgba(255,150,90,0)'); screenGlow(K, SX, SY, 260, 'rgba(255,230,170,0.8)', 'rgba(255,200,130,0)');
      // banks of cumulus lit from below by the sun: each a cluster of rounded masses, a dark crown and a hot belly (hottest over the sun), with a few wisps drawn out of them; nearer banks lower and warmer
      const darks = ['#2a1c46', '#3a2250', '#52295a', '#6e305c', '#8a3a5e', '#a4485c'], lits = ['#9a6488', '#c06a7c', '#e8826c', '#f6a070', '#ffbe7c', '#ffd090'];
      const mass = (cx, cy, rx, ry, dark, lit, heat) => { const gr = ctx.createLinearGradient(0, cy - ry, 0, cy + ry); gr.addColorStop(0, dark); gr.addColorStop(0.55, dark); gr.addColorStop(1, lit); ctx.globalAlpha = 0.92; ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.save(); ctx.globalAlpha = 0.5 + 0.45 * heat; ctx.strokeStyle = '#ffe2b0'; ctx.lineWidth = 2 + 2 * heat; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.97, ry * 0.97, 0, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke(); ctx.restore(); };
      for (let b = 0; b < 6; b++) {
        const y = 120 + b * 52;
        for (let c = 0; c < 4; c++) {
          const cx = K.R(-80, w + 80), n = Math.floor(K.R(5, 10)), span = K.R(160, 340), heat = Math.max(0, 1 - Math.abs(cx - SX) / 520);
          for (let i = 0; i < n; i++) { const t = i / (n - 1) - 0.5, rx = K.R(34, 70) * (1 - Math.abs(t) * 0.8) + b * 4, ry = rx * K.R(0.45, 0.7); mass(cx + t * span + K.R(-14, 14), y - ry * 0.35 + K.R(-6, 6) - (1 - Math.abs(t) * 2) * 18, rx, ry, darks[b], lits[b], heat); }
          for (let k = 0; k < 3; k++) { const wy = y + K.R(10, 26); K.stroke(cx - span * 0.9, wy, cx + span * 0.9, wy + K.R(-4, 4), lits[b], K.R(3, 7), 0.35 + 0.3 * heat, K.R(-0.02, 0.02)); }
        }
      }
      // the sea: dark, the sky in streaks, the sun's road laid down in hot strokes that narrow toward us
      K.grad(0, SEA, w, h - SEA, [[0, '#18303e'], [0.3, '#0e2230'], [1, '#050b12']]);
      for (let i = 0; i < 260; i++) { const y = SEA + 6 + Math.pow(K.R(0, 1), 1.6) * 200, l = K.R(20, 90) * (0.5 + (y - SEA) / 200), x = K.R(-40, w); K.stroke(x, y, x + l, y, K.pick(['#24607a', '#1a4a5a', '#3a7890', '#123040']), K.R(1.5, 3.5), K.R(0.35, 0.7)); }
      for (let i = 0; i < 46; i++) { const y = SEA + 4 + i * 4, half = 110 - i * 1.6 + K.R(-14, 14); K.stroke(SX - half, y, SX + half, y + K.R(-1, 1), i < 14 ? '#ffd890' : i < 30 ? '#f0a060' : '#c06040', K.R(2.5, 5), 0.85 - i * 0.013); }
      // the far quays and sheds on the horizon, a crane, and the bell tower on its point, rim-lit on its sun side
      for (const [x, y, ww] of [[0, SEA - 10, 250], [580, SEA - 30, 150], [300, SEA - 14, 180], [1080, SEA - 34, 210]]) K.fill(sil, x, y, ww, SEA + 6 - y);
      K.stroke(604, SEA - 30, 604, SEA - 150, sil, 8); K.stroke(600, SEA - 140, 730, SEA - 124, sil, 6); K.stroke(730, SEA - 124, 730, SEA - 40, sil, 4); K.stroke(604, SEA - 150, 660, SEA - 136, sil, 3);
      K.fill(sil, TX - 40, SEA - 250, 80, 256); K.poly([[TX - 50, SEA - 248], [TX + 50, SEA - 248], [TX, SEA - 340]], sil); K.fill(sil, TX - 54, SEA - 200, 108, 12);
      K.stroke(TX - 40, SEA - 246, TX - 40, SEA - 4, '#ff9a6a', 3, 0.55); K.stroke(TX - 50, SEA - 248, TX - 2, SEA - 336, '#ff9a6a', 2.5, 0.5);
      screenGlow(K, TX, SEA - 222, 70, 'rgba(255,210,120,0.8)', 'rgba(255,180,90,0)'); K.fill('#ffd27a', TX - 9, SEA - 236, 18, 26); K.fill('#fff0c0', TX - 5, SEA - 232, 10, 18); K.fill('#ffc870', TX - 10, SEA - 60, 20, 56);
      // rings of the Vael's voice spreading on the water, flattened by the angle we see them at
      for (const [rx, a, wt] of [[50, 0.85, 4], [110, 0.7, 3.5], [190, 0.55, 3], [290, 0.38, 2.6], [420, 0.22, 2.2]]) ellipseRing(ctx, 720, 618, rx * 0.9, rx * 0.24, '#4ffff0', a, wt);
      screenGlow(K, 720, 618, 90, 'rgba(80,255,230,0.35)', 'rgba(80,255,230,0)');
      // the near quay, its lamp and the pool it throws, a bollard
      K.grad(0, 646, w, 74, [[0, '#1c2228'], [0.08, '#0c0f14'], [1, '#05070a']]); K.stroke(0, 647, w, 647, '#3a4048', 3, 0.8);
      for (let i = 0; i < 60; i++) { const x = K.R(0, w), y = K.R(656, 716); K.stroke(x, y, x + K.R(20, 70), y, '#161a20', K.R(1.5, 3), 0.7); }
      const LX = 1186; screenGlow(K, LX, 690, 260, 'rgba(255,190,110,0.5)', 'rgba(255,170,90,0)');
      K.stroke(LX, 690, LX, 420, '#06080b', 10); K.fill('#06080b', LX - 8, 418, 16, 8); K.fill('#06080b', LX - 18, 384, 4, 34); K.fill('#06080b', LX + 14, 384, 4, 34); K.poly([[LX - 24, 386], [LX + 24, 386], [LX, 360]], '#06080b'); K.fill('#06080b', LX - 20, 416, 40, 5);
      screenGlow(K, LX, 404, 160, 'rgba(255,200,120,0.6)', 'rgba(255,170,90,0)'); screenGlow(K, LX, 404, 40, 'rgba(255,240,200,1)', 'rgba(255,220,150,0)'); K.fill('#fff0c8', LX - 12, 398, 24, 14);
      K.fill('#06080b', 1040, 650, 46, 52); K.fill('#06080b', 1030, 642, 66, 14); K.stroke(1034, 644, 1092, 644, '#3a4048', 2, 0.7);
      K.grad(0, 0, 640, h, [[0, 'rgba(8,6,18,0.55)'], [0.6, 'rgba(8,6,18,0.25)'], [1, 'rgba(8,6,18,0)']], false);          // calm under the menu
      for (let i = 0; i < 260; i++) K.dot(K.R(0, w), K.R(0, h), K.R(0.6, 1.8), K.pick(['#fff0d8', '#ffd8a0', '#a0c0d0']), K.R(0.04, 0.16));          // the grain of the air
    })),
  },

  // The cold open's last plate: Port Marrow on the night the Hush began. The Bell Tower on its headland burning teal, rings of sound across the sky, the town's roofs with a few warm windows, the harbour
  // lamp and the fog-bell on the piers, the townspeople on the quay facing the tower with their backs to us, and at the left edge Ines with a hand lamp: the one warm light among them.
  ui_cold_tower: {
    seed: 26302, width: 1280, height: 720,
    draw: R((g, w, h) => paint2d(g, w, h, (ctx, K) => {
      const TX = 928, TT = 168, SEA = 454, QUAY = 540, sil = '#090a14';
      K.grad(0, 0, w, SEA + 4, [[0, '#04050e'], [0.3, '#0b0c20'], [0.6, '#171230'], [0.85, '#2c1c40'], [1, '#4a2c48']]);
      for (let i = 0; i < 260; i++) K.dot(K.R(0, w), K.R(0, 330), K.R(0.8, 2.2), K.pick(['#fff0d8', '#d0c8ff', '#fff8e8']), K.R(0.2, 0.75));
      screenGlow(K, TX, TT + 20, 760, 'rgba(60,255,224,0.22)', 'rgba(60,255,224,0)'); screenGlow(K, TX, TT + 20, 300, 'rgba(90,255,230,0.35)', 'rgba(60,255,224,0)');
      for (const [rx, a, wt] of [[90, 0.9, 4], [170, 0.72, 3.5], [270, 0.55, 3], [390, 0.38, 2.6], [540, 0.24, 2.2], [720, 0.14, 2]]) ellipseRing(ctx, TX, TT + 20, rx, rx * 0.8, '#4ffff0', a, wt);
      // the headland and the tower: a round shaft, a belfry of open arches burning teal, a cap
      K.poly([[560, SEA], [1290, SEA], [1290, 330], [1040, 350], [930, 420]], sil);
      K.fill(sil, TX - 44, TT + 40, 88, SEA - TT - 40); K.fill('#151826', TX - 36, TT + 46, 10, SEA - TT - 50); K.fill(sil, TX - 56, TT + 28, 112, 76);
      for (const ax of [-36, -12, 12]) { K.fill('#9ffff0', TX + ax, TT + 40, 24, 54); K.fill('#e8fffb', TX + ax + 5, TT + 48, 14, 40); }
      K.poly([[TX - 64, TT + 30], [TX + 64, TT + 30], [TX, TT - 56]], sil); K.poly([[TX - 14, TT - 32], [TX + 14, TT - 32], [TX, TT - 84]], sil);
      screenGlow(K, TX, TT + 66, 200, 'rgba(80,255,230,0.6)', 'rgba(60,255,224,0)');
      for (const wy of [SEA - 200, SEA - 120, SEA - 50]) K.fill('#3fffe0', TX - 4, wy, 10, 26, 0.85);
      // the town along the shore: stepped roofs and a few warm windows, their gables caught by the teal
      let x = -20;
      while (x < 850) {
        const ww = K.R(56, 104), hh = K.R(56, 136), top = SEA - hh;
        K.fill(sil, x, top, ww, hh + 8); K.poly([[x - 8, top], [x + ww + 8, top], [x + ww / 2, top - K.R(24, 52)]], sil); K.stroke(x + ww / 2, top - 40, x + ww + 6, top, '#2ab8a8', 2, 0.35);
        for (let i = 0; i < Math.floor(ww / 32); i++) if (K.R(0, 1) < 0.5) { const wy = top + K.R(16, hh - 26); K.fill(K.pick(['#ffd890', '#ffb45a']), x + 12 + i * 30, wy, 12, 16); screenGlow(K, x + 18 + i * 30, wy + 8, 22, 'rgba(255,190,110,0.4)', 'rgba(255,170,90,0)'); }
        x += ww + K.R(-6, 10);
      }
      // the harbour lamp at the end of the pier, the fog-bell frame, the pier
      K.fill(sil, 160, SEA - 176, 22, 176); K.fill(sil, 148, SEA - 200, 46, 28); K.fill('#ffe0a0', 154, SEA - 196, 34, 20); K.poly([[144, SEA - 200], [198, SEA - 200], [171, SEA - 238]], sil);
      screenGlow(K, 171, SEA - 186, 220, 'rgba(255,180,90,0.45)', 'rgba(255,160,80,0)'); K.fill('#0a0a12', 120, SEA, 300, 14);
      K.stroke(416, SEA, 416, SEA - 64, sil, 7); K.stroke(472, SEA, 472, SEA - 64, sil, 7); K.stroke(410, SEA - 64, 478, SEA - 64, sil, 7); K.poly([[428, SEA - 58], [460, SEA - 58], [466, SEA - 20], [422, SEA - 20]], sil); K.dot(444, SEA - 26, 6, '#c8964a', 0.8);
      // the water: the tower's teal and the lamp's warmth laid in streaks
      K.grad(0, SEA, w, QUAY - SEA, [[0, '#0b1018'], [1, '#05070c']]);
      for (let i = 0; i < 30; i++) { const yy = SEA + 4 + i * 2.8, wob = Math.sin(i * 1.7) * 16; K.stroke(TX - 80 + wob, yy, TX + 80 + wob, yy, '#3fffe0', K.R(2, 3.5), 0.55 - i * 0.016); K.stroke(171 - 60 + wob, yy, 171 + 60 + wob, yy, '#ffb45a', K.R(2, 3.5), 0.5 - i * 0.015); }
      for (let i = 0; i < 90; i++) { const xx = K.R(0, w), yy = K.R(SEA + 6, QUAY - 8); K.stroke(xx, yy, xx + K.R(30, 90), yy, '#1a2232', K.R(1.5, 3), 0.5); }
      // the quay and the people on it, backs to us, facing the tower; the tower's light on the edge of each that faces it
      K.grad(0, QUAY, w, h - QUAY, [[0, '#14161e'], [0.06, '#08090e'], [1, '#040508']]); K.stroke(0, QUAY + 1, w, QUAY + 1, '#2a2026', 4, 0.9);
      // a figure seen from behind: a long coat flared at the hem, square shoulders, a neck and a head (a cap on some), the tower's light along the edge that faces it
      const person = (px, py, s, rim = '#3fffe0', side = 1, cap = false) => {
        const c = '#141a2c';
        K.poly([[px - 25 * s, py], [px + 25 * s, py], [px + 19 * s, py - 46 * s], [px + 27 * s, py - 82 * s], [px + 20 * s, py - 92 * s], [px - 20 * s, py - 92 * s], [px - 27 * s, py - 82 * s], [px - 19 * s, py - 46 * s]], c);
        K.fill(c, px - 6 * s, py - 102 * s, 12 * s, 12 * s); K.dot(px, py - 112 * s, 13 * s, c); if (cap) K.poly([[px - 16 * s, py - 116 * s], [px + 16 * s, py - 116 * s], [px + 10 * s, py - 128 * s], [px - 10 * s, py - 128 * s]], c);
        K.stroke(px + side * 26 * s, py - 84 * s, px + side * 23 * s, py - 6, rim, 2.6 * s, 0.6, 0.02); K.stroke(px + side * 21 * s, py - 92 * s, px + side * 27 * s, py - 83 * s, rim, 2.6 * s, 0.7); K.stroke(px + side * 9 * s, py - 122 * s, px + side * 13 * s, py - 108 * s, rim, 2.4 * s, 0.7);
      };
      for (const [px, py, s, i] of [[368, 584, 0.62, 0], [528, 602, 0.74, 1], [672, 578, 0.6, 2], [816, 610, 0.82, 3], [1000, 586, 0.7, 4], [1128, 630, 0.95, 5], [1240, 600, 0.74, 6], [264, 630, 0.82, 7], [464, 676, 1.05, 8], [928, 690, 1.12, 9], [624, 716, 1.25, 10]]) {
        screenGlow(K, px, py + 2, 70 * s, 'rgba(60,255,224,0.16)', 'rgba(60,255,224,0)'); person(px, py, s, '#3fffe0', px < TX ? 1 : -1, i % 3 === 1);
      }
      // Ines at the left edge, a hand lamp held out: the one warm light on the quay
      screenGlow(K, 26, 642, 240, 'rgba(255,180,90,0.45)', 'rgba(255,160,80,0)'); person(104, 726, 1.2, '#ffb45a', -1); K.stroke(78, 640, 30, 646, '#141a2c', 13);
      screenGlow(K, 24, 646, 60, 'rgba(255,240,200,1)', 'rgba(255,200,120,0)'); K.fill('#ffe0a0', 14, 636, 20, 22);
      for (let i = 0; i < 240; i++) K.dot(K.R(0, w), K.R(0, h), K.R(0.6, 1.8), K.pick(['#fff0d8', '#ffd890', '#9ffff0']), K.R(0.04, 0.15));          // the grain of the air
    })),
  },
};
