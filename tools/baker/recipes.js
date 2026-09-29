// Asset recipes. Coordinates are authored top-left (px) and mapped to p5.brush's centred WEBGL origin by wrap().
// All randomness flows from p.randomSeed(seed) so bakes are seed-reproducible.

export function wrap(p, b, w, h) {
  const X = (x) => x - w / 2, Y = (y) => y - h / 2;
  return {
    p, raw: b,
    bg: (c) => p.background(c),
    // truly opaque rect via plain p5 (brush fills are translucent washes)
    solid: (x, y, ww, hh, col) => { p.push(); p.noStroke(); p.fill(col); p.rect(X(x), Y(y), ww, hh); p.pop(); },
    stroke: (name, col, wt) => b.set(name, col, wt),
    fill: (col, a) => b.fill(col, a), noFill: () => b.noFill(), noStroke: () => b.noStroke(),
    bleed: (s, d) => b.fillBleed(s, d),
    line: (x1, y1, x2, y2) => b.line(X(x1), Y(y1), X(x2), Y(y2)),
    rect: (x, y, ww, hh) => b.rect(X(x), Y(y), ww, hh),
    circle: (x, y, r) => b.circle(X(x), Y(y), r),
    // organic closed shape: soft fill + ink outline. curv 0 = angular .. 1 = round
    blob: (pts, col, o = {}) => {
      const { a = 255, curv = 0.3, out = '#0d0f14', wt = 1.1, ink = true } = o;
      const path = () => { b.beginShape(curv); for (const [x, y] of pts) b.vertex(X(x), Y(y)); b.endShape(true); };
      b.noStroke(); b.fill(col, a); b.fillBleed(0.1, 'out'); b.fillTexture(0.2, 0.25, false); path();
      if (ink) { b.noFill(); b.set('2B', out, wt); path(); }
    },
    poly: (pts) => b.polygon(pts.map(([x, y]) => [X(x), Y(y)])),
    // run fn at 9 wrapped offsets so the tile has no seams
    tile: (fn) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(dx, dy); },
    rnd: (a, c) => p.random(a, c),
  };
}
export const R = (fn) => (p, b, w, h) => fn(wrap(p, b, w, h), w, h);

export const recipes = {
  // 1. Wall / environment texture: salt-eaten harbour bulkhead, tiles seamlessly.
  wall_bulkhead_a: {
    seed: 1101, width: 256, height: 256,
    draw: R((g, w, h) => {
      g.bg('#2b3a3f');
      g.noStroke(); g.bleed(0.25, 'out');
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
        const x = col * 128 + (row % 2) * 64, y = row * 64;
        g.tile((dx, dy) => {
          g.fill(['#34474c', '#2f4146', '#3a4e52'][(row + col) % 3], 200);
          g.rect(x + 3 + dx, y + 3 + dy, 122, 58);
          g.fill('#0a1214', 70); g.rect(x + 3 + dx, y + 46 + dy, 122, 15);   // plate underside shadow
        });
      }
      g.stroke('2B', '#10181a', 1.4);
      for (let row = 0; row < 4; row++) g.tile((dx, dy) => g.line(dx, row * 64 + dy, 256 + dx, row * 64 + dy));
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
        const x = col * 128 + (row % 2) * 64;
        g.tile((dx, dy) => g.line(x + dx, row * 64 + dy, x + dx, row * 64 + 64 + dy));
      }
      g.stroke('HB', '#7f9a98', 0.7);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
        const x = col * 128 + (row % 2) * 64;
        for (const [ox, oy] of [[8, 8], [116, 8], [8, 54], [116, 54]]) g.tile((dx, dy) => g.circle(x + ox + dx, row * 64 + oy + dy, 1.6));
      }
      // rust bloom + drips
      g.noStroke(); g.bleed(0.6, 'out');
      for (let i = 0; i < 26; i++) {
        const x = g.rnd(0, 256), y = g.rnd(0, 256), r = g.rnd(6, 18), a = g.rnd(60, 130);
        g.tile((dx, dy) => { g.fill(['#7a4a2b', '#5c3620', '#8c5a30'][i % 3], a); g.circle(x + dx, y + dy, r); });
      }
      g.stroke('cpencil', '#3a2416', 0.9);
      for (let i = 0; i < 12; i++) {
        const x = g.rnd(0, 256), y = g.rnd(0, 256), l = g.rnd(20, 60), j = g.rnd(-2, 2);
        g.tile((dx, dy) => g.line(x + dx, y + dy, x + dx + j, y + l + dy));
      }
      // salt crust
      g.stroke('cpencil', '#c9d6d0', 0.6);
      for (let i = 0; i < 40; i++) {
        const x = g.rnd(0, 256), y = g.rnd(0, 256), l = g.rnd(4, 14), j = g.rnd(-2, 2);
        g.tile((dx, dy) => g.line(x + dx, y + dy, x + dx + l, y + dy + j));
      }
      // alien growth: violet bell-spore clusters with teal cores
      g.noStroke(); g.bleed(0.4, 'in');
      for (let i = 0; i < 9; i++) {
        const x = g.rnd(0, 256), y = g.rnd(0, 256), r1 = g.rnd(7, 11), r2 = g.rnd(2.5, 4);
        g.tile((dx, dy) => {
          g.fill('#5b3f7a', 170); g.circle(x + dx, y + dy, r1);
          g.fill('#3fd6c0', 190); g.circle(x + dx + 1, y + dy - 1, r2);
        });
      }
    }),
  },

  // 2. Enemy sprite: Tollbearer (front view, transparent bg). 128x128 source.
  enemy_tollbearer_idle: {
    transparent: true, alphaCurve: [0.12, 0.4], seed: 2201, width: 128, height: 128,
    draw: R((g) => {
      // legs, bent knees
      g.blob([[48, 82], [62, 82], [61, 104], [56, 122], [44, 122], [50, 102]], '#3d4c5a');
      g.blob([[66, 82], [80, 82], [82, 102], [84, 122], [72, 122], [66, 104]], '#33414d');
      g.blob([[41, 118], [57, 118], [59, 127], [39, 127]], '#1a1d22', { curv: 0.15 });
      g.blob([[70, 118], [88, 118], [90, 127], [68, 127]], '#1a1d22', { curv: 0.15 });
      // long left arm dangling past the knee
      g.blob([[36, 50], [47, 52], [45, 90], [43, 112], [33, 114], [32, 88]], '#b8951f');
      g.blob([[31, 108], [44, 108], [45, 122], [39, 126], [31, 121]], '#7d8c86', { curv: 0.4 });
      // oilskin coat, slouched forward
      g.blob([[44, 46], [70, 40], [84, 52], [92, 96], [86, 102], [40, 102], [36, 62]], '#c9a227');
      g.blob([[64, 44], [84, 52], [92, 96], [86, 102], [70, 100]], '#8a6d18', { a: 150, ink: false });
      g.blob([[56, 48], [62, 46], [60, 100], [54, 100]], '#5e4a10', { a: 200, ink: false, curv: 0.1 });
      g.blob([[82, 54], [94, 56], [99, 92], [97, 110], [88, 110], [86, 86]], '#b8951f');
      g.blob([[86, 106], [99, 106], [100, 120], [94, 124], [86, 119]], '#7d8c86', { curv: 0.4 });
      // head, hung forward, slack jaw
      g.blob([[52, 20], [64, 15], [77, 23], [79, 40], [68, 47], [56, 45], [50, 33]], '#93a196');
      g.blob([[57, 44], [70, 44], [69, 57], [59, 56]], '#4a5650', { curv: 0.3 });
      g.blob([[60, 47], [67, 47], [66, 53], [61, 52]], '#0a0a0c', { ink: false });
      g.noStroke(); g.fill('#3fffe0', 255); g.circle(58, 30, 3.4); g.circle(70, 30, 3.4);
      g.fill('#f0fffb', 255); g.circle(58, 30, 1.4); g.circle(70, 30, 1.4);
      // the Bell: bronze crystal erupting from the right shoulder
      g.blob([[84, 48], [88, 28], [100, 12], [113, 30], [107, 54], [94, 58]], '#b8722e', { curv: 0.2 });
      g.blob([[96, 24], [102, 16], [108, 30], [100, 44]], '#e0aa5a', { a: 220, ink: false, curv: 0.2 });
      g.noStroke(); g.fill('#3fffe0', 255); g.circle(98, 56, 5); g.fill('#f0fffb', 255); g.circle(98, 56, 2);
      // hush-veins from the Bell to the skull
      g.stroke('HB', '#3fffe0', 0.9);
      g.line(86, 48, 78, 40); g.line(78, 40, 76, 30); g.line(86, 50, 80, 58); g.line(80, 58, 74, 62);
      // grime + wear
      g.stroke('charcoal', '#241a10', 0.7);
      for (let i = 0; i < 6; i++) { const x = g.rnd(44, 84), j = g.rnd(-2, 2), l = g.rnd(80, 100); g.line(x, 66, x + j, l); }
      g.stroke('cpencil', '#e6d38a', 0.7);
      for (let i = 0; i < 5; i++) { const x = g.rnd(46, 60), y = g.rnd(52, 80), l = g.rnd(6, 14); g.line(x, y, x + 1, y + l); }
    }),
  },

  // 3. Weapon-view: Tidewarden flare-cannon, held low-centre, transparent bg. 256x160 source.
  weapon_flarecannon: {
    transparent: true, alphaCurve: [0.12, 0.4], seed: 3301, width: 256, height: 160,
    draw: R((g) => {
      // barrel: brass, lit from the left, in forced perspective
      g.blob([[108, 12], [148, 12], [162, 90], [94, 90]], '#a07a2c', { curv: 0.08, wt: 1.4 });
      g.blob([[112, 14], [122, 14], [114, 90], [98, 90]], '#e0be6a', { a: 190, ink: false, curv: 0.1 });
      g.blob([[140, 14], [148, 12], [162, 90], [148, 90]], '#4a3810', { a: 170, ink: false, curv: 0.1 });
      g.blob([[104, 6], [152, 6], [154, 22], [102, 22]], '#c9a44c', { curv: 0.12, wt: 1.4 });
      g.blob([[112, 12], [144, 12], [144, 20], [112, 20]], '#0e0e10', { curv: 0.5, ink: false });
      g.stroke('2B', '#1a1408', 1.4); g.line(100, 50, 156, 50); g.line(97, 72, 159, 72);
      // receiver
      g.blob([[80, 88], [176, 88], [194, 134], [62, 134]], '#37474a', { curv: 0.1, wt: 1.4 });
      g.blob([[92, 94], [164, 94], [172, 108], [84, 108]], '#5d7476', { a: 230, ink: false, curv: 0.1 });
      g.blob([[68, 92], [84, 92], [82, 128], [66, 128]], '#3fd6c0', { a: 170, curv: 0.2 });
      // gloved hands, oilskin sleeves
      g.blob([[64, 122], [110, 98], [126, 112], [122, 160], [58, 160]], '#5a4632', { curv: 0.3, wt: 1.4 });
      g.blob([[150, 116], [192, 112], [206, 160], [146, 160]], '#4c3a28', { curv: 0.3, wt: 1.4 });
      g.blob([[24, 138], [62, 128], [66, 160], [18, 160]], '#c9a227', { curv: 0.2 });
      g.blob([[194, 138], [230, 136], [240, 160], [200, 160]], '#b8951f', { curv: 0.2 });
      g.stroke('cpencil', '#8a6a4a', 0.8);
      for (let i = 0; i < 6; i++) { const x = g.rnd(76, 116), y = g.rnd(112, 124); g.line(x, y, x + 4, y + 8); }
      g.stroke('cpencil', '#5fbfa8', 0.8);
      for (let i = 0; i < 14; i++) { const x = g.rnd(100, 152), y = g.rnd(26, 88), a = g.rnd(-2, 2), c = g.rnd(4, 10); g.line(x, y, x + a, y + c); }
      g.stroke('charcoal', '#1a120a', 0.9);
      for (let i = 0; i < 8; i++) { const x = g.rnd(70, 190), y = g.rnd(96, 130), a = g.rnd(-6, 6), c = g.rnd(2, 6); g.line(x, y, x + a, y + c); }
    }),
  },

  // 4. UI illustration: title art, bell tower over the drowned harbour. 320x200 source.
  ui_title_art: {
    seed: 4401, width: 320, height: 200,
    draw: R((g, w) => {
      g.noStroke(); g.bleed(0.7, 'out');
      ['#1a1233', '#2a1b4d', '#48246a', '#7a3a7a', '#c0587a', '#e8946a'].forEach((c, i) => { g.fill(c, 235); g.rect(-10, i * 34 - 6, w + 20, 44); });
      g.stroke('marker', '#3fffe0', 1.2);
      for (let i = 0; i < 5; i++) { const y = 30 + i * 9, d = g.rnd(-14, 14); g.line(0, y, 320, y + d); }
      g.noStroke(); g.fill('#0d1f2b', 250); g.rect(-10, 150, w + 20, 60);
      g.stroke('2B', '#2a5a66', 0.9);
      for (let i = 0; i < 30; i++) { const x = g.rnd(0, 320), y = g.rnd(154, 198), l = g.rnd(8, 26); g.line(x, y, x + l, y); }
      g.noStroke(); g.bleed(0.04, 'out'); g.fill('#0a0d12', 255);
      g.poly([[0, 150], [0, 128], [60, 132], [96, 140], [110, 150]]);
      g.poly([[220, 150], [240, 138], [300, 130], [320, 126], [320, 150]]);
      g.stroke('2B', '#0a0d12', 1.6); g.line(250, 132, 250, 84); g.line(250, 88, 296, 96); g.line(296, 96, 296, 128);
      g.noStroke(); g.fill('#0b0c12', 255);
      g.poly([[144, 150], [148, 60], [172, 60], [176, 150]]);
      g.poly([[140, 62], [160, 22], [180, 62]]);
      g.rect(146, 56, 28, 6);
      g.fill('#3fffe0', 230); g.circle(160, 70, 10); g.fill('#e8fff8', 240); g.circle(160, 70, 4);
      g.stroke('HB', '#3fffe0', 0.7);
      for (let r = 1; r < 5; r++) for (let a = 0; a < 6; a++) {
        const t = a * 1.047 + r * 0.3;
        g.line(160 + Math.cos(t) * r * 12, 70 + Math.sin(t) * r * 8, 160 + Math.cos(t + 0.5) * r * 12, 70 + Math.sin(t + 0.5) * r * 8);
      }
      g.noStroke(); g.fill('#ffcc66', 255);
      for (const [x, y] of [[154, 96], [166, 96], [154, 116], [166, 116], [160, 134]]) g.rect(x - 2, y - 3, 4, 6);
      g.fill('#3fffe0', 140);
      for (let i = 0; i < 6; i++) g.rect(156 + i * 0.5, 156 + i * 7, 8 - i, 1.6); // bell glow on the water
      g.fill('#ffcc66', 255); g.circle(60, 168, 3);
    }),
  },
};
