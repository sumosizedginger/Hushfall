// The ten Tollbearer / Vael creature atlases (look redesign L1, design/LOOK_BIBLE.md): one 256 px atlas per KIND (`choir_<kind>`), 4x4 cells of 64 px like every game atlas, painted from p5.js 2.x + p5.brush.
// The cell NAMES are the contract with the rigs (src/render/choir_cells.js); each recipe must paint exactly those names in that order (asserted below).
// Every kind has its own hue and its own surface logic on purpose (the assessment's finding was ONE blotch-and-scratch recipe on everything):
//   Tollbearer = oxblood oilskin, drowned grey-green skin        Gaunt = bone-white, raw throat            Bellhand = indigo coat and hat, sallow skin
//   Sexton = ivory surplice, violet stole                          Warden = umber leather, black iron        Cantor = deep violet-black robe, ivory rings
//   Bell node = bone, bronze, verdigris stone                      Gill = engraved ivory dome, amber fringe   Feeder = amber wrappings, bruised skin
//   Graft-Mother = ivory case, raw flesh panels, bronze
// LESSONS from the first renders through the game's post pass at 480 px: a mark thinner than ~1.2 px or closer than ~6 px to the next is lost, so strokes are bold; the big value shifts (light
// shoulders, dark hem, stains) are what survives the value banding. Verdigris is OLIVE (a green-teal reads as the Hush); teal is never painted on a body: it is light, not paint.
// Paint stays inside each cell (3 px margin): a mark across the cell edge would bleed into the neighbour.
import { R } from './recipes.js';
import { mix } from './paint_util.js';
import { CHOIR_CELLS } from '../../src/render/choir_cells.js';

// ---------------------------------------------------------------------------------------------------------------- the painting kit
const bands = (g, X, Y, top, bot, n = 8) => { for (let i = 0; i < n; i++) g.solid(X, Y + (i * 64) / n, 64, 64 / n + 0.6, mix(top, bot, i / (n - 1))); };
/** washes of colour: irregular blobs inside the cell */
function blots(g, X, Y, cols, n, rmin, rmax, a = 210) {
  for (let i = 0; i < n; i++) {
    const r = g.rnd(rmin, rmax), cx = g.rnd(X + r + 4, X + 60 - r), cy = g.rnd(Y + r + 4, Y + 60 - r), pts = [];
    for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2 + g.rnd(-0.3, 0.3); pts.push([cx + Math.cos(ang) * r * g.rnd(0.7, 1.15), cy + Math.sin(ang) * r * g.rnd(0.7, 1.15)]); }
    g.blob(pts, cols[i % cols.length], { a, curv: 0.5, ink: false });
  }
}
/** bold line marks: dir 'v' (drips, folds), 'h' (rings, bands), 'd' (twill, scratches), 'u' (rising diagonal), 'r' (random) */
function marks(g, X, Y, { kind = '2B', col, wt = 1.4, n = 5, dir = 'v', len = [10, 26], top = false }) {
  g.stroke(kind, col, wt);
  for (let i = 0; i < n; i++) {
    const L = g.rnd(len[0], len[1]);
    if (dir === 'v') { const x = X + 6 + ((i + g.rnd(0.1, 0.9)) / n) * 52, y = top ? Y + 3 : g.rnd(Y + 4, Y + 60 - L); g.line(x, y, x + g.rnd(-1.5, 1.5), y + L); }
    else if (dir === 'h') { const y = Y + 6 + ((i + g.rnd(0.1, 0.9)) / n) * 52; g.line(X + 3, y, X + 61, y + g.rnd(-1.2, 1.2)); }
    else if (dir === 'd') { const x = g.rnd(X + 6, X + 58 - L * 0.7), y = g.rnd(Y + 6, Y + 58 - L * 0.7); g.line(x, y, x + L * 0.7, y + L * 0.7); }
    else if (dir === 'u') { const x = g.rnd(X + 6, X + 58 - L * 0.7), y = g.rnd(Y + 8 + L * 0.7, Y + 58); g.line(x, y, x + L * 0.7, y - L * 0.7); }
    else { const x = g.rnd(X + 8, X + 56), y = g.rnd(Y + 8, Y + 56), a = g.rnd(0, 6.28); g.line(x, y, x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5); }
  }
}
/** a cell from a spec: base or a top-to-bottom gradient, washes, marks, then anything bespoke */
const cell = (s) => (g, X, Y) => {
  if (s.grad) bands(g, X, Y, s.grad[0], s.grad[1], s.bands ?? 8); else g.solid(X, Y, 64, 64, s.base);
  if (s.blots) for (const b of s.blots) blots(g, X, Y, b.cols, b.n, b.r?.[0] ?? 5, b.r?.[1] ?? 11, b.a ?? 210);
  if (s.marks) for (const m of s.marks) marks(g, X, Y, m);
  s.extra?.(g, X, Y);
};
const ring = (g, cx, cy, rs, col, wt, kind = '2B') => { g.noFill(); g.stroke(kind, col, wt); for (const r of rs) g.circle(cx, cy, r); };
/** veined cells (nearest-site boundaries drawn as line work): membrane, wrappings, flesh */
function veins(g, X, Y, col, wt, n = 8) {
  const sites = Array.from({ length: n }, () => [g.rnd(X, X + 64), g.rnd(Y, Y + 64)]), N = 18, c = 58 / N;
  const id = (i, j) => { let b = 0, bd = 1e9; sites.forEach(([sx, sy], k) => { const d = (X + 3 + (i + 0.5) * c - sx) ** 2 + (Y + 3 + (j + 0.5) * c - sy) ** 2; if (d < bd) { bd = d; b = k; } }); return b; };
  const grid = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => id(i, j)));
  g.stroke('HB', col, wt);
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) { const px = X + 3 + (i + 1) * c, py = Y + 3 + (j + 1) * c; if (grid[i][j] !== grid[i + 1][j]) g.line(px, py - c, px, py); if (grid[i][j] !== grid[i][j + 1]) g.line(px - c, py, px, py); }
}
/** a bold radial tension pattern (a drum skin, a dome) */
const radial = (g, cx, cy, r0, r1, n, col, wt) => { g.stroke('HB', col, wt); for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; g.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); } };

// ---------------------------------------------------------------------------------------------------------------- shared materials (palette-tinted per kind)
const BONE = (t = 0) => cell({ grad: [mix('#eee4c8', '#cfc6ae', t), mix('#b9ac88', '#8e8468', t)], marks: [{ col: '#7a6e50', wt: 1.3, n: 4, dir: 'v', len: [14, 30] }, { col: '#a89a74', wt: 1.1, n: 3, dir: 'd', len: [8, 16] }], extra: (g, X, Y) => ring(g, X + 20, Y + 18, [4, 8], '#7a6e50', 1.1) });
const BRONZE = () => cell({ grad: ['#d89244', '#8a5020'], blots: [{ cols: ['#7a8a3a', '#5e6e2c'], n: 3, r: [4, 8], a: 230 }], marks: [{ col: '#4a2808', wt: 1.7, n: 3, dir: 'h' }, { col: '#f0b868', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] });
const BRONZE_DK = () => cell({ grad: ['#7a4418', '#2e1606'], marks: [{ col: '#c88a48', wt: 1.2, n: 3, dir: 'h' }, { col: '#1a0c04', wt: 1.5, n: 4, dir: 'v', len: [10, 24] }] });
const IRON = (base = '#4a505a', dk = '#202328') => cell({ grad: [base, dk], marks: [{ col: '#1a1c20', wt: 1.6, n: 4, dir: 'h' }, { col: mix(base, '#c8ccd2', 0.45), wt: 1.1, n: 4, dir: 'v', len: [6, 14] }], extra: (g, X, Y) => { g.noStroke(); g.fill('#9aa0a8', 255); for (const [x, y] of [[8, 8], [56, 8], [8, 56], [56, 56]]) g.circle(X + x, Y + y, 2.6); } });
const ROPE = () => cell({ base: '#9c8a58', marks: [{ col: '#5a4a28', wt: 1.6, n: 9, dir: 'd', len: [26, 40] }, { col: '#c8b880', wt: 1.1, n: 5, dir: 'd', len: [16, 28] }] });
const VERD = () => cell({ base: '#78883a', blots: [{ cols: ['#a4b258', '#5a6a2a'], n: 5, r: [5, 10], a: 220 }], marks: [{ col: '#2c3a14', wt: 1.4, n: 4, dir: 'r', len: [10, 22] }] });
const MOUTH = (red = '#2a0c12') => cell({ base: red, extra: (g, X, Y) => { g.noStroke(); g.fill('#d8cdb0', 255); for (let k = 0; k < 5; k++) g.rect(X + 8 + k * 10, Y + 4, 4, 9); g.stroke('2B', '#0a0406', 1.4); g.line(X + 4, Y + 38, X + 60, Y + 40); } });
const SKIN = (top, bot, bruise, vein) => cell({ grad: [top, bot], blots: [{ cols: [bruise, mix(bruise, bot, 0.5)], n: 3, r: [6, 12], a: 190 }], marks: [{ kind: '2B', col: vein, wt: 1.5, n: 3, dir: 'd', len: [14, 26] }, { kind: 'cpencil', col: mix(bot, '#0c0c10', 0.5), wt: 1.2, n: 5, dir: 'v', len: [8, 20] }] });
const FLESH = (a, b, sinew) => cell({ grad: [a, b], blots: [{ cols: [mix(b, '#000000', 0.35)], n: 3, r: [5, 9], a: 180 }], marks: [{ kind: 'cpencil', col: sinew, wt: 1.5, n: 7, dir: 'd', len: [8, 16] }] });

// ---------------------------------------------------------------------------------------------------------------- the ten
const KINDS = {
  tollbearer: {
    seed: 2301, cells: {
      skin: SKIN('#a2ae9e', '#66746a', '#62587e', '#3a4640'),
      flesh: FLESH('#b05458', '#6c262c', '#ecd2bc'),
      coat: cell({ grad: ['#a03e3e', '#4a171b'], marks: [{ col: '#25080c', wt: 1.9, n: 7, dir: 'v', len: [16, 36] }, { kind: 'cpencil', col: '#d68a6c', wt: 1.3, n: 4, dir: 'd', len: [8, 14] }],           // oxblood oilskin: drips run down from the shoulder, a cracked highlight, a stitched tear
        extra: (g, X, Y) => { g.stroke('2B', '#ecd8a8', 1.5); for (let k = 0; k < 6; k++) g.line(X + 12 + k * 6, Y + 14 + k * 3, X + 15 + k * 6, Y + 22 + k * 3); } }),
      coatDk: cell({ grad: ['#5e2428', '#2c0e12'], marks: [{ col: '#8a4444', wt: 1.2, n: 5, dir: 'v', len: [10, 22] }] }),
      trou: cell({ grad: ['#3c4654', '#1c222c'], marks: [{ col: '#5c6a7e', wt: 1.2, n: 6, dir: 'v', len: [18, 36] }] }),
      bone: BONE(), bronze: BRONZE(), bronzeDk: BRONZE_DK(), rope: ROPE(), verd: VERD(), iron: IRON(), mouth: MOUTH(),
    },
  },
  gaunt: {
    seed: 2302, cells: {
      skin: SKIN('#e2dfd2', '#aaa698', '#7a6a8c', '#4c4658'),
      skinDk: cell({ grad: ['#aaa698', '#6a6a60'], blots: [{ cols: ['#5a4e6c'], n: 3, r: [6, 11], a: 190 }], marks: [{ col: '#3a3a36', wt: 1.5, n: 5, dir: 'v', len: [12, 28] }] }),
      flesh: FLESH('#a8383c', '#601820', '#f0d0c0'),
      bone: BONE(0.2), claw: cell({ grad: ['#f0e8d0', '#a89c78'], marks: [{ col: '#5e5238', wt: 1.5, n: 3, dir: 'v', len: [20, 40] }] }),
      throat: cell({ base: '#8a1c26', blots: [{ cols: ['#c43a44', '#5a0e16'], n: 4, r: [5, 10], a: 220 }], marks: [{ col: '#2a0508', wt: 1.8, n: 3, dir: 'h' }] }),
      mouth: MOUTH('#3a0a10'), iron: IRON(),
    },
  },
  bellhand: {
    seed: 2303, cells: {
      skin: SKIN('#b4aa84', '#7a7254', '#6e5e78', '#463e32'),
      flesh: FLESH('#a8484c', '#642028', '#ecd2bc'),
      coat: cell({ grad: ['#4c5c8c', '#1a2240'], marks: [{ col: '#0e1228', wt: 1.9, n: 6, dir: 'v', len: [16, 36] }, { kind: 'cpencil', col: '#8c9cc8', wt: 1.3, n: 4, dir: 'd', len: [8, 14] }],                 // the crier's long coat: indigo, wet at the hem, bone buttons down the front
        extra: (g, X, Y) => { g.noStroke(); g.fill('#e4d8b8', 255); for (let k = 0; k < 4; k++) g.circle(X + 32, Y + 10 + k * 14, 2.6); } }),
      coatDk: cell({ grad: ['#2c3860', '#0e1428'], marks: [{ col: '#5a6a9c', wt: 1.2, n: 5, dir: 'v', len: [10, 24] }] }),
      trou: cell({ grad: ['#2a3040', '#12161e'], marks: [{ col: '#465068', wt: 1.2, n: 6, dir: 'v', len: [18, 36] }] }),
      bone: BONE(), bronze: BRONZE(), bronzeDk: BRONZE_DK(), rope: ROPE(),
      hat: cell({ grad: ['#303a62', '#141a34'], marks: [{ col: '#080a18', wt: 1.8, n: 4, dir: 'v', len: [16, 32] }], extra: (g, X, Y) => { g.solid(X, Y + 38, 64, 8, '#c0762e'); g.stroke('2B', '#4a2808', 1.5); g.line(X + 3, Y + 38, X + 61, Y + 38); g.line(X + 3, Y + 46, X + 61, Y + 46); } }),
      iron: IRON(), mouth: MOUTH(),
    },
  },
  sexton: {
    seed: 2304, cells: {
      skin: SKIN('#d4ccb2', '#98907a', '#706080', '#4e4a40'),
      robe: cell({ grad: ['#eee6cc', '#b4a888'], marks: [{ col: '#7a6e52', wt: 1.5, n: 7, dir: 'v', len: [20, 44] }, { kind: 'cpencil', col: '#a6987a', wt: 1.2, n: 4, dir: 'd', len: [10, 18] }],                // the surplice: ivory, folds, grave dirt at the hem
        blots: [{ cols: ['#7a5a3a', '#5a4a38'], n: 2, r: [6, 10], a: 150 }] }),
      robeDk: cell({ grad: ['#b4a888', '#6a5e46'], marks: [{ col: '#3e3626', wt: 1.5, n: 6, dir: 'v', len: [18, 40] }] }),
      stole: cell({ grad: ['#7e4a96', '#3e2050'], marks: [{ col: '#e4d8b8', wt: 1.6, n: 3, dir: 'h' }, { col: '#c8a8d8', wt: 1.2, n: 4, dir: 'v', len: [10, 20] }] }),
      trou: cell({ grad: ['#4a4054', '#221c2a'], marks: [{ col: '#6c607c', wt: 1.2, n: 5, dir: 'v', len: [16, 30] }] }),
      bone: BONE(0.1), bronze: BRONZE(), bronzeDk: BRONZE_DK(), iron: IRON(), mouth: MOUTH('#240a14'),
      flesh: FLESH('#a8484c', '#642028', '#ecd2bc'), verd: VERD(),
    },
  },
  wardengraft: {
    seed: 2305, cells: {
      skin: SKIN('#9a9684', '#5e5c50', '#5c4a68', '#34322c'),
      flesh: FLESH('#a8444a', '#5e1c24', '#e8cab6'),
      leather: cell({ grad: ['#86603a', '#33231a'], marks: [{ col: '#1e130c', wt: 1.8, n: 5, dir: 'v', len: [16, 34] }, { kind: 'cpencil', col: '#c0925c', wt: 1.3, n: 4, dir: 'd', len: [8, 14] }] }),
      leatherDk: cell({ grad: ['#4e3622', '#1e140e'], marks: [{ col: '#7a5a3a', wt: 1.2, n: 5, dir: 'v', len: [10, 24] }] }),
      iron: IRON('#565c66', '#1c1e22'), ironDk: IRON('#2e323a', '#0e1012'),
      bronze: BRONZE(), bronzeDk: BRONZE_DK(),
      drumskin: cell({ base: '#dccfa8', blots: [{ cols: ['#b8a67a', '#ece0c0'], n: 4, r: [8, 14], a: 190 }],                                                                                    // a drum skin: taut, scarred by a long claw mark, tension lines to a bold hoop
        extra: (g, X, Y) => { radial(g, X + 32, Y + 32, 12, 28, 10, '#a8946a', 1.1); ring(g, X + 32, Y + 32, [29], '#6a5430', 1.8); g.stroke('2B', '#7a2a2a', 2.2); g.line(X + 16, Y + 16, X + 48, Y + 46); g.line(X + 22, Y + 14, X + 52, Y + 38); } }),
      bone: BONE(0.15), rope: ROPE(), mouth: MOUTH(),
    },
  },
  cantor: {
    seed: 2306, cells: {
      skin: SKIN('#cfc6b0', '#8e8672', '#68587c', '#46423a'),
      flesh: FLESH('#a8484c', '#5e1e28', '#ecd2bc'),
      robe: cell({ grad: ['#6a4a8c', '#241632'], marks: [{ col: '#120a1c', wt: 1.9, n: 7, dir: 'v', len: [20, 44] }, { kind: 'cpencil', col: '#a888c8', wt: 1.3, n: 4, dir: 'd', len: [10, 18] }] }),                  // the choir-master's robe: deep violet, ink-dark at the hem
      robeDk: cell({ grad: ['#3e2a56', '#150c20'], marks: [{ col: '#7a5a9c', wt: 1.2, n: 5, dir: 'v', len: [12, 26] }] }),
      bone: BONE(0.05), bronze: BRONZE(), bronzeDk: BRONZE_DK(), iron: IRON(), mouth: MOUTH('#2a0a18'), verd: VERD(),
      trim: cell({ base: '#eadfc0', marks: [{ col: '#5a4e30', wt: 1.7, n: 3, dir: 'h' }, { col: '#9a8a5a', wt: 1.3, n: 6, dir: 'v', len: [6, 14] }] }),
    },
  },
  bellnode: {
    seed: 2307, cells: {
      iron: IRON('#4e545c', '#1a1c20'), ironDk: IRON('#2a2e34', '#0c0e10'),
      bone: cell({ grad: ['#f0e8cc', '#bcb08a'], marks: [{ col: '#7a6e50', wt: 1.5, n: 5, dir: 'v', len: [20, 44] }, { col: '#2a1c0c', wt: 1.6, n: 2, dir: 'd', len: [14, 24] }] }),       // the fork's tines: engraved ivory
      boneDk: cell({ grad: ['#bcb08a', '#6e6448'], marks: [{ col: '#3e3626', wt: 1.5, n: 5, dir: 'v', len: [16, 38] }] }),
      bronze: BRONZE(), bronzeDk: BRONZE_DK(), verd: VERD(),
      stone: cell({ grad: ['#6e6a62', '#34322e'], blots: [{ cols: ['#8a867a', '#4a4842'], n: 5, r: [6, 12], a: 200 }], marks: [{ col: '#1a1814', wt: 1.5, n: 4, dir: 'r', len: [10, 22] }] }),
    },
  },
  gill: {
    seed: 2308, cells: {
      dome: cell({ grad: ['#f2ecd2', '#c4b88e'], extra: (g, X, Y) => { ring(g, X + 32, Y + 52, [8, 16, 24, 32], '#8a7c52', 1.5); g.stroke('2B', '#6a5c38', 1.6); g.line(X + 32, Y + 4, X + 32, Y + 60); } }),    // the mantle: engraved ivory, growth rings, one nodal line
      domeDk: cell({ grad: ['#c4b88e', '#7a6e48'], marks: [{ col: '#4a4028', wt: 1.5, n: 4, dir: 'h' }] }),
      under: cell({ grad: ['#5a2c58', '#2a1030'], extra: (g, X, Y) => veins(g, X, Y, '#c080b0', 1.6, 7) }),
      fringeA: cell({ grad: ['#d8a850', '#a06a28'], marks: [{ col: '#5a3410', wt: 1.5, n: 4, dir: 'v', len: [24, 50] }] }),
      fringeB: cell({ grad: ['#f0e8cc', '#b4a880'], marks: [{ col: '#7a6e48', wt: 1.4, n: 4, dir: 'v', len: [24, 50] }] }),
      sac: cell({ base: '#d4a030', blots: [{ cols: ['#fff0a8', '#a87018'], n: 3, r: [8, 14], a: 220 }] }),
      heart: cell({ grad: ['#7a2c4a', '#3a1228'], extra: (g, X, Y) => veins(g, X, Y, '#e090b0', 1.5, 6) }),
      bone: BONE(0.1),
      tendril: cell({ grad: ['#6a3a70', '#2c1434'], marks: [{ col: '#c890c0', wt: 1.3, n: 4, dir: 'v', len: [16, 40] }] }),
    },
  },
  feeder: {
    seed: 2309, cells: {
      skin: SKIN('#b8aa94', '#7c7058', '#64507a', '#46382c'),
      wrapA: cell({ grad: ['#d8a048', '#8e5a22'], extra: (g, X, Y) => veins(g, X, Y, '#5a3210', 1.7, 8) }),                                                                                      // the wrappings: amber membrane, veined, wet
      wrapB: cell({ grad: ['#c88a38', '#6e4218'], marks: [{ col: '#3e2008', wt: 1.7, n: 5, dir: 'd', len: [16, 30] }, { col: '#f0c878', wt: 1.2, n: 4, dir: 'd', len: [8, 16] }] }),
      wrapDk: cell({ grad: ['#5a3a1c', '#24160a'], marks: [{ col: '#8a6030', wt: 1.3, n: 5, dir: 'd', len: [10, 22] }] }),
      bone: BONE(0.1), bronze: BRONZE(), bronzeDk: BRONZE_DK(), iron: IRON(),
      cable: cell({ base: '#8a6a3a', marks: [{ col: '#3a2410', wt: 1.8, n: 8, dir: 'd', len: [26, 44] }, { col: '#d8b070', wt: 1.1, n: 4, dir: 'd', len: [12, 24] }] }),
      mouth: MOUTH('#220a10'),
      stand: cell({ grad: ['#5a5e54', '#222420'], blots: [{ cols: ['#7a7a6a', '#3a3c34'], n: 4, r: [6, 11], a: 200 }], marks: [{ col: '#0e100e', wt: 1.5, n: 4, dir: 'h' }] }),
    },
  },
  chorister: {                       // PT-026: cold grey-blue surplice, a brass-ochre stole, pearl chitin and an ivory horn grown where the throat was
    seed: 2311, cells: {
      skin: SKIN('#c4c2b0', '#86857a', '#6a5e84', '#46463e'),
      robe: cell({ grad: ['#d6dade', '#8a9096'], marks: [{ col: '#4e545a', wt: 1.6, n: 7, dir: 'v', len: [20, 44] }, { kind: 'cpencil', col: '#b4bac0', wt: 1.2, n: 4, dir: 'd', len: [10, 18] }],           // the surplice: damp linen, cold, folds, dark water-marks low
        blots: [{ cols: ['#6a5e48', '#4c4a40'], n: 2, r: [6, 10], a: 140 }] }),
      robeDk: cell({ grad: ['#8a9096', '#3c4248'], marks: [{ col: '#22262a', wt: 1.6, n: 6, dir: 'v', len: [18, 40] }] }),
      stole: cell({ grad: ['#c4902e', '#6a4012'], marks: [{ col: '#f2dc98', wt: 1.5, n: 3, dir: 'h' }, { col: '#3a2206', wt: 1.5, n: 4, dir: 'v', len: [12, 26] }] }),
      chitin: cell({ grad: ['#e4dece', '#8e8776'], marks: [{ col: '#5a5444', wt: 1.7, n: 5, dir: 'h' }, { col: '#fffaf0', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),                   // pearl chitin: ridged plates
      chitinDk: cell({ grad: ['#8e8776', '#3e3a30'], marks: [{ col: '#201e18', wt: 1.6, n: 4, dir: 'h' }, { col: '#b8b09c', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      horn: cell({ grad: ['#efe2b0', '#a07c3c'], blots: [{ cols: ['#7a8a3a'], n: 2, r: [4, 8], a: 200 }], marks: [{ col: '#5a4018', wt: 1.8, n: 4, dir: 'h' }, { col: '#fff6d0', wt: 1.1, n: 3, dir: 'v', len: [10, 20] }] }),   // the horn: ivory with growth rings, olive at the lip
      hornDk: cell({ grad: ['#5a3c1c', '#1a0e06'], marks: [{ col: '#8a6228', wt: 1.5, n: 4, dir: 'h' }, { col: '#0a0502', wt: 1.5, n: 4, dir: 'v', len: [10, 24] }] }),
      bone: BONE(0.1), iron: IRON(), mouth: MOUTH('#2a0c12'),
    },
  },
  graftmother: {
    seed: 2310, cells: {
      case: cell({ grad: ['#f0e8d0', '#b8ac88'], marks: [{ col: '#7a6e50', wt: 1.5, n: 6, dir: 'v', len: [20, 44] }, { kind: 'cpencil', col: '#a89a74', wt: 1.2, n: 4, dir: 'd', len: [10, 18] }] }),
      caseDk: cell({ grad: ['#b8ac88', '#6a5e44'], marks: [{ col: '#3e3626', wt: 1.5, n: 5, dir: 'v', len: [18, 40] }] }),
      flesh: cell({ grad: ['#b04e58', '#6a2430'], extra: (g, X, Y) => veins(g, X, Y, '#f0b8b0', 1.6, 7) }),
      fleshDk: cell({ grad: ['#6a2430', '#2e0e16'], extra: (g, X, Y) => veins(g, X, Y, '#c0707a', 1.5, 6) }),
      bone: BONE(0.05), boneDk: cell({ grad: ['#bcb08a', '#6e6448'], marks: [{ col: '#3e3626', wt: 1.5, n: 5, dir: 'v', len: [16, 38] }] }),
      bronze: BRONZE(), bronzeDk: BRONZE_DK(), iron: IRON('#4a4e48', '#1a1c18'),
      sac: cell({ grad: ['#d8a850', '#8a5a24'], extra: (g, X, Y) => veins(g, X, Y, '#5a3410', 1.6, 7) }),
      sacDk: cell({ grad: ['#6e4a2a', '#2c1a0c'], extra: (g, X, Y) => veins(g, X, Y, '#b08050', 1.5, 6) }),
      verd: VERD(),
      horn: cell({ grad: ['#d88a3c', '#7a4418'], blots: [{ cols: ['#7a8a3a'], n: 3, r: [5, 9], a: 220 }], marks: [{ col: '#3a1c06', wt: 1.7, n: 4, dir: 'h' }] }),
      leg: cell({ grad: ['#6a6e60', '#262822'], blots: [{ cols: ['#8a8c7a', '#46483e'], n: 4, r: [6, 11], a: 200 }], marks: [{ col: '#101210', wt: 1.5, n: 4, dir: 'v', len: [14, 30] }] }),
    },
  },
};

export const recipesChoir = Object.fromEntries(Object.entries(KINDS).map(([kind, { seed, cells }]) => {
  const names = CHOIR_CELLS[kind];
  for (const n of names) if (!cells[n]) throw new Error(`choir_${kind}: no painter for cell '${n}'`);
  for (const n of Object.keys(cells)) if (!names.includes(n)) throw new Error(`choir_${kind}: painter '${n}' is not a cell of the contract`);
  return ['choir_' + kind, { seed, width: 256, height: 256, draw: R((g) => { g.bg('#222222'); names.forEach((n, i) => cells[n](g, (i % 4) * 64, Math.floor(i / 4) * 64)); }) }];
}));
