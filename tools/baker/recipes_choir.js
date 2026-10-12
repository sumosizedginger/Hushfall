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
  bulwark: {                         // PT-028: a pearl conch with growth rings and ochre flecks, nacre inside, bronze-bound; drowned grey skin and raw flesh where the shell opens
    seed: 2312, cells: {
      skin: SKIN('#a9b09a', '#6f7a64', '#5c4f78', '#3c4436'),
      flesh: FLESH('#b85c62', '#6a2a34', '#f0c8bc'),
      shell: cell({ grad: ['#cfc2b2', '#5c4c62'], blots: [{ cols: ['#a8703c', '#5a3c2c'], n: 8, r: [3, 7], a: 200 }],                                                                          // the outside of the conch: ivory, ochre flecks, ring on ring of growth
        marks: [{ col: '#2c2030', wt: 2.0, n: 5, dir: 'h' }, { col: '#f0e8d8', wt: 1.2, n: 3, dir: 'v', len: [10, 24] }, { kind: 'cpencil', col: '#7a6a62', wt: 1.2, n: 5, dir: 'd', len: [8, 16] }] }),
      shellDk: cell({ grad: ['#7c6e80', '#2a2030'], marks: [{ col: '#120c18', wt: 1.7, n: 4, dir: 'h' }, { col: '#b8a8b8', wt: 1.1, n: 3, dir: 'v', len: [8, 18] }] }),
      shellIn: cell({ grad: ['#f2cce4', '#a47cba'], marks: [{ col: '#ffffff', wt: 1.3, n: 4, dir: 'h' }, { col: '#7a5a96', wt: 1.5, n: 4, dir: 'v', len: [14, 36] }], blots: [{ cols: ['#e8a8d0', '#c0b0e8'], n: 4, r: [8, 14], a: 160 }] }),   // the inside: nacre, pink going to lavender, bands of sheen
      chitin: cell({ grad: ['#e4dece', '#8e8776'], marks: [{ col: '#5a5444', wt: 1.7, n: 5, dir: 'h' }, { col: '#fffaf0', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      chitinDk: cell({ grad: ['#8e8776', '#3e3a30'], marks: [{ col: '#201e18', wt: 1.6, n: 4, dir: 'h' }, { col: '#b8b09c', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      bone: BONE(0.1), iron: IRON('#52585e', '#1e2024'), mouth: MOUTH('#2a0c12'), bronze: BRONZE(),
    },
  },
  weeping: {                         // PT-028: a dark mourning robe streaked pale where the tears ran, pale skin, ivory and bronze pipes, amber sacs with a person in each
    seed: 2313, cells: {
      skin: SKIN('#d0c8b8', '#8c8576', '#6a5e84', '#4a463e'),
      flesh: FLESH('#b04e58', '#6a2430', '#f0c8c0'),
      fleshDk: cell({ grad: ['#6a2430', '#2e0e16'], extra: (g, X, Y) => veins(g, X, Y, '#c0707a', 1.5, 6) }),
      robe: cell({ grad: ['#5e5482', '#1e1a34'], marks: [{ col: '#0e0a1c', wt: 1.9, n: 7, dir: 'v', len: [20, 46] }, { col: '#c4bcdc', wt: 1.2, n: 4, dir: 'v', len: [18, 40], top: true }, { kind: 'cpencil', col: '#8a80b0', wt: 1.2, n: 4, dir: 'd', len: [10, 18] }] }),      // damp black-violet cloth with pale streaks running down from the top: where she has wept
      robeDk: cell({ grad: ['#36304e', '#120e22'], marks: [{ col: '#6a5e90', wt: 1.2, n: 5, dir: 'v', len: [12, 28] }, { col: '#0a0614', wt: 1.5, n: 4, dir: 'v', len: [14, 36] }] }),
      bone: BONE(0.05), boneDk: cell({ grad: ['#bcb08a', '#6e6448'], marks: [{ col: '#3e3626', wt: 1.5, n: 5, dir: 'v', len: [16, 38] }] }),
      bronze: BRONZE(), bronzeDk: BRONZE_DK(), iron: IRON('#4a4e58', '#1a1c20'),
      sac: cell({ grad: ['#e6b45c', '#9a6a2c'], extra: (g, X, Y) => {                                                                                                                              // a cradle sac: amber membrane, veined, a dark shape inside (a head and shoulders)
        veins(g, X, Y, '#6a3c10', 1.5, 6); g.noStroke(); g.fill('#3a2230', 170); g.circle(X + 32, Y + 22, 15); g.blob([[X + 12, Y + 56], [X + 16, Y + 38], [X + 32, Y + 33], [X + 48, Y + 38], [X + 52, Y + 56]], '#3a2230', { a: 170, curv: 0.5, ink: false }); } }),
      sacDk: cell({ grad: ['#7a5230', '#2e1a0c'], extra: (g, X, Y) => { veins(g, X, Y, '#b88a54', 1.5, 6); g.noStroke(); g.fill('#12080a', 150); g.circle(X + 32, Y + 22, 14); g.blob([[X + 12, Y + 56], [X + 16, Y + 38], [X + 32, Y + 33], [X + 48, Y + 38], [X + 52, Y + 56]], '#12080a', { a: 150, curv: 0.5, ink: false }); } }),
      mouth: MOUTH('#220a10'), verd: VERD(),
    },
  },
  acolyte: {                         // PT-029: saffron and ox-blood vestments, gold trim, pale skin, bone and bronze: the warm one of the choir (the others are grey, violet, indigo, ivory)
    seed: 2314, cells: {
      skin: SKIN('#d6d0c0', '#8a8474', '#7a5a70', '#4a463e'),
      robe: cell({ grad: ['#e0aa4a', '#8a5a1e'], marks: [{ col: '#5a3410', wt: 1.7, n: 7, dir: 'v', len: [20, 46] }, { kind: 'cpencil', col: '#f4d890', wt: 1.2, n: 4, dir: 'd', len: [10, 18] }], blots: [{ cols: ['#b8782a', '#7a4a18'], n: 3, r: [6, 11], a: 150 }] }),
      robeDk: cell({ grad: ['#963430', '#3a0e0e'], marks: [{ col: '#1c0606', wt: 1.7, n: 6, dir: 'v', len: [18, 40] }, { col: '#d07a6a', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      trim: cell({ grad: ['#f4d884', '#a07a2a'], marks: [{ col: '#5a4010', wt: 1.7, n: 3, dir: 'h' }, { col: '#fff4c0', wt: 1.2, n: 5, dir: 'v', len: [6, 14] }] }),
      bronze: BRONZE(), bronzeDk: BRONZE_DK(), bone: BONE(0.12), iron: IRON(), mouth: MOUTH('#2a0c12'),
    },
  },
  vat: {                             // PT-030: riveted rust-black iron and copper pipes, a dome of sickly yellow-green membrane with a dark shape stirring inside it: the Foundry is rust, sulphur and copper (the others are grey, violet, indigo, ivory, saffron)
    seed: 2315, cells: {
      iron: IRON('#4e4842', '#1e1a16'),
      ironDk: cell({ grad: ['#322e28', '#100e0c'], marks: [{ col: '#6a6258', wt: 1.3, n: 4, dir: 'h' }, { col: '#060504', wt: 1.6, n: 4, dir: 'v', len: [10, 24] }] }),
      rust: cell({ grad: ['#c8682a', '#5c2410'], blots: [{ cols: ['#8a3c18', '#e8944c', '#3a1608'], n: 6, r: [4, 9], a: 210 }], marks: [{ col: '#2a0e04', wt: 1.8, n: 4, dir: 'v', len: [12, 30] }, { col: '#f4b878', wt: 1.1, n: 3, dir: 'd', len: [8, 14] }] }),
      dome: cell({ grad: ['#dce864', '#7c8c22'], extra: (g, X, Y) => { veins(g, X, Y, '#3a4a0c', 1.6, 6); g.noStroke(); g.fill('#2a3408', 150); g.circle(X + 32, Y + 26, 18); g.blob([[X + 14, Y + 56], [X + 20, Y + 40], [X + 34, Y + 36], [X + 48, Y + 42], [X + 52, Y + 56]], '#2a3408', { a: 150, curv: 0.5, ink: false }); } }),   // the membrane: veined, with a dark shape inside (head and shoulders)
      domeDk: cell({ grad: ['#7c8c22', '#2e3808'], extra: (g, X, Y) => veins(g, X, Y, '#d0dc78', 1.5, 6) }),
      copper: cell({ grad: ['#e68c4c', '#8c3e22'], blots: [{ cols: ['#5a8a6a', '#3e6a52'], n: 4, r: [4, 8], a: 220 }], marks: [{ col: '#4a1c08', wt: 1.7, n: 3, dir: 'h' }, { col: '#ffcc94', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      verd: VERD(),
      pipe: cell({ grad: ['#70745e', '#262820'], blots: [{ cols: ['#8e907a', '#46483a'], n: 4, r: [6, 11], a: 200 }], marks: [{ col: '#0e100a', wt: 1.6, n: 4, dir: 'h' }, { col: '#c0c4a8', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      slime: cell({ grad: ['#b0cc2c', '#3c5612'], extra: (g, X, Y) => veins(g, X, Y, '#e6f090', 1.5, 7) }),
    },
  },
  reed: {                            // PT-030: a bagpipe grown: a bladder of pale hide laced with cord on a verdigris stone, drone pipes of bronze and ivory
    seed: 2316, cells: {
      flesh: FLESH('#c88480', '#723a3e', '#f4d8c8'),
      fleshDk: cell({ grad: ['#723a3e', '#2e1418'], extra: (g, X, Y) => veins(g, X, Y, '#d48e8a', 1.5, 6) }),
      stone: cell({ grad: ['#7e7e6a', '#34342c'], blots: [{ cols: ['#5e6a40', '#9c9c86'], n: 5, r: [5, 10], a: 200 }], marks: [{ col: '#161610', wt: 1.5, n: 4, dir: 'h' }, { col: '#bcbca4', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      bronze: BRONZE(), bronzeDk: BRONZE_DK(), bone: BONE(0.1), verd: VERD(), mouth: MOUTH('#2a0c12'), cord: ROPE(),
    },
  },
  grandcantor: {                     // PT-030: black-violet chitin plates over oxblood flesh, ivory pipes, and a brass horn gone green at the seams with a raw red throat: the Throat is red and brass (the Cantor is violet and ivory, the Mother ivory and flesh)
    seed: 2317, cells: {
      skin: SKIN('#bcaca2', '#78685e', '#6a4e72', '#483c38'),
      flesh: FLESH('#a0404a', '#56222c', '#eac0b2'),
      fleshDk: cell({ grad: ['#56222c', '#200a12'], extra: (g, X, Y) => veins(g, X, Y, '#bc6e78', 1.5, 6) }),
      chitin: cell({ grad: ['#40405a', '#16161e'], marks: [{ col: '#0a0a10', wt: 2.0, n: 5, dir: 'h' }, { col: '#9494b4', wt: 1.2, n: 4, dir: 'v', len: [8, 18] }, { kind: 'cpencil', col: '#60607c', wt: 1.2, n: 4, dir: 'd', len: [8, 16] }] }),
      chitinDk: cell({ grad: ['#22222e', '#08080e'], marks: [{ col: '#04040a', wt: 1.8, n: 4, dir: 'h' }, { col: '#52526e', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      bone: BONE(0.08), boneDk: cell({ grad: ['#bcb08a', '#6e6448'], marks: [{ col: '#3e3626', wt: 1.5, n: 5, dir: 'v', len: [16, 38] }] }),
      bronze: BRONZE(), bronzeDk: BRONZE_DK(), iron: IRON('#4a4e58', '#1a1c20'), mouth: MOUTH('#2a0a10'), verd: VERD(),
      horn: cell({ grad: ['#e4b454', '#8c5c1e'], blots: [{ cols: ['#7aa45c', '#4c7c4a', '#5e8c52'], n: 6, r: [5, 10], a: 215 }], marks: [{ col: '#3a2006', wt: 1.9, n: 4, dir: 'h' }, { col: '#fff2b4', wt: 1.1, n: 4, dir: 'v', len: [8, 18] }] }),
      hornIn: cell({ grad: ['#661e28', '#14060a'], marks: [{ col: '#b44450', wt: 1.5, n: 5, dir: 'h' }, { col: '#0a0204', wt: 1.7, n: 4, dir: 'v', len: [12, 34] }] }),
      trim: cell({ grad: ['#f6e4a4', '#a88c3c'], marks: [{ col: '#5a4010', wt: 1.7, n: 3, dir: 'h' }, { col: '#fff8d0', wt: 1.2, n: 4, dir: 'v', len: [6, 14] }] }),
      leg: cell({ grad: ['#5e544a', '#221e1a'], blots: [{ cols: ['#7e7266', '#3e3830'], n: 4, r: [6, 11], a: 200 }], marks: [{ col: '#0e0c0a', wt: 1.6, n: 4, dir: 'v', len: [14, 30] }] }),
    },
  },
  gatewarden: {                      // PT-033: the Gate's own colours, white stone and bone with gold trim: enamel-white bell-chitin plates seamed with blue-grey, ivory bone, brass bells, a black iron socket (the Throat is red and brass, the Cantor violet: the Warden is pale)
    seed: 2330, cells: {
      stone: cell({ grad: ['#d8d4c8', '#7c786c'], blots: [{ cols: ['#b8b4a6', '#a4a090', '#e8e4d8'], n: 6, r: [5, 11], a: 190 }], marks: [{ col: '#38352e', wt: 1.7, n: 4, dir: 'h' }, { col: '#f6f2e6', wt: 1.1, n: 3, dir: 'v', len: [8, 18] }] }),
      stoneDk: cell({ grad: ['#7c786c', '#2c2a26'], blots: [{ cols: ['#5a5a4c', '#9a9684'], n: 5, r: [5, 10], a: 190 }], marks: [{ col: '#100f0c', wt: 1.7, n: 4, dir: 'v', len: [12, 30] }] }),
      bone: BONE(0.06), boneDk: cell({ grad: ['#c4baa0', '#726850'], marks: [{ col: '#3e3626', wt: 1.5, n: 5, dir: 'v', len: [16, 38] }, { col: '#f0e8d0', wt: 1.1, n: 3, dir: 'd', len: [8, 14] }] }),
      chitin: cell({ grad: ['#eceee8', '#8e9aa6'], marks: [{ col: '#3a4450', wt: 2.0, n: 4, dir: 'h' }, { col: '#ffffff', wt: 1.3, n: 4, dir: 'v', len: [8, 20] }, { kind: 'cpencil', col: '#aab4bc', wt: 1.2, n: 4, dir: 'd', len: [8, 16] }] }),
      chitinDk: cell({ grad: ['#8e9aa6', '#2c343e'], marks: [{ col: '#10161c', wt: 1.9, n: 4, dir: 'h' }, { col: '#c4ccd4', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      bronze: BRONZE(), bronzeDk: BRONZE_DK(), iron: IRON('#4a4a52', '#18181e'), mouth: MOUTH('#1c0a10'), verd: VERD(),
      trim: cell({ grad: ['#fbeeaa', '#b48e36'], marks: [{ col: '#5a4010', wt: 1.7, n: 3, dir: 'h' }, { col: '#fffbe0', wt: 1.2, n: 4, dir: 'v', len: [6, 14] }] }),
    },
  },
  seal: {                            // PT-033: a bone plinth, a cage of old brass, a pale stone cap: the light inside is the glow
    seed: 2331, cells: {
      stone: cell({ grad: ['#d8d4c8', '#7c786c'], blots: [{ cols: ['#b8b4a6', '#e8e4d8'], n: 5, r: [5, 10], a: 190 }], marks: [{ col: '#38352e', wt: 1.7, n: 3, dir: 'h' }, { col: '#f6f2e6', wt: 1.1, n: 3, dir: 'v', len: [8, 18] }] }),
      stoneDk: cell({ grad: ['#7c786c', '#2c2a26'], marks: [{ col: '#100f0c', wt: 1.7, n: 4, dir: 'v', len: [12, 30] }] }),
      bone: BONE(0.06), bronze: BRONZE(), bronzeDk: BRONZE_DK(), iron: IRON('#4a4a52', '#18181e'),
      trim: cell({ grad: ['#fbeeaa', '#b48e36'], marks: [{ col: '#5a4010', wt: 1.7, n: 3, dir: 'h' }, { col: '#fffbe0', wt: 1.2, n: 4, dir: 'v', len: [6, 14] }] }),
    },
  },
  vaelfolk: {                        // PT-037: the Vael civilian: milk-glass skin, crystal on the shoulders and spine, an amber fan-frill behind the head, undyed cord, gold eyes. Warm and pale where the hostile Vael are bronze and oxblood.
    seed: 3701, cells: {
      skin: cell({ grad: ['#e2e8da', '#9aa896'], blots: [{ cols: ['#c6d2c2', '#f0f4e8'], n: 5, r: [5, 10], a: 170 }], marks: [{ col: '#667666', wt: 1.4, n: 3, dir: 'v', len: [14, 30] }], extra: (g, X, Y) => veins(g, X, Y, '#7e96a2', 1.2, 6) }),
      skinDk: cell({ grad: ['#a2b09e', '#4c5850'], marks: [{ col: '#2a342e', wt: 1.5, n: 4, dir: 'v', len: [12, 30] }, { col: '#d4dccc', wt: 1.1, n: 3, dir: 'v', len: [6, 12] }] }),
      crystal: cell({ grad: ['#f4fafc', '#9cbace'], marks: [{ col: '#587a90', wt: 1.5, n: 4, dir: 'u', len: [14, 30] }, { col: '#ffffff', wt: 1.2, n: 3, dir: 'd', len: [8, 16] }] }),
      crystalDk: cell({ grad: ['#9cbace', '#34505e'], marks: [{ col: '#1c303c', wt: 1.5, n: 4, dir: 'u', len: [12, 26] }] }),
      frill: cell({ grad: ['#f4cc84', '#b0603c'], blots: [{ cols: ['#e8a860', '#cc7a48'], n: 4, r: [6, 11], a: 150 }], extra: (g, X, Y) => { radial(g, X + 32, Y + 32, 3, 31, 15, '#8a3a28', 1.7); g.noStroke(); g.fill('#fff0c0', 120); g.circle(X + 32, Y + 32, 9); } }),
      rib: cell({ grad: ['#eee2c4', '#8c7c58'], marks: [{ col: '#4a3e28', wt: 1.5, n: 4, dir: 'v', len: [14, 30] }] }),
      eye: cell({ base: '#ffe9a2', extra: (g, X, Y) => { g.noStroke(); g.fill('#a8641e', 255); g.circle(X + 32, Y + 32, 26); g.fill('#fff6d0', 255); g.circle(X + 26, Y + 26, 9); } }),
      cord: cell({ grad: ['#cdb98e', '#7c6844'], marks: [{ col: '#4e4028', wt: 1.6, n: 5, dir: 'h' }, { col: '#ecdcb0', wt: 1.1, n: 3, dir: 'v', len: [8, 16] }] }),
      mouth: cell({ base: '#2a1c1e' }),
    },
  },
  zealot: {                          // PT-038: tempered bronze plate edged with verdigris, black-iron lames, an oxblood hood and cord, a bone lance bound in red: the Songkeeper under arms (the civilians are milk-glass and amber)
    seed: 3801, cells: {
      skin: SKIN('#c4bcb8', '#7c7478', '#6a4a58', '#3e383c'),
      hood: cell({ grad: ['#7a2a30', '#34100f'], marks: [{ col: '#14060a', wt: 1.8, n: 6, dir: 'v', len: [18, 44] }, { kind: 'cpencil', col: '#b4585a', wt: 1.2, n: 4, dir: 'd', len: [10, 18] }], blots: [{ cols: ['#5a1c22', '#8a3a3c'], n: 3, r: [6, 11], a: 140 }] }),
      hoodDk: cell({ grad: ['#44161a', '#12060a'], marks: [{ col: '#060204', wt: 1.7, n: 6, dir: 'v', len: [16, 40] }, { col: '#8a3a3c', wt: 1.1, n: 3, dir: 'v', len: [8, 14] }] }),
      plate: cell({ grad: ['#d6a04e', '#93602a'], blots: [{ cols: ['#6f9a7c', '#4e7a64'], n: 4, r: [3, 7], a: 210 }], marks: [{ col: '#4a2a0c', wt: 1.8, n: 3, dir: 'h' }, { col: '#f6d08a', wt: 1.2, n: 4, dir: 'v', len: [8, 18] }], extra: (g, X, Y) => { g.noStroke(); g.fill('#3a2208', 200); for (const [x, y] of [[10, 10], [54, 10], [10, 54], [54, 54]]) g.circle(X + x, Y + y, 3); } }),
      plateDk: cell({ grad: ['#3c3a40', '#121216'], marks: [{ col: '#08080a', wt: 1.7, n: 4, dir: 'h' }, { col: '#8a7a58', wt: 1.1, n: 4, dir: 'v', len: [6, 14] }], extra: (g, X, Y) => { g.noStroke(); g.fill('#a89868', 220); for (const [x, y] of [[8, 8], [56, 8]]) g.circle(X + x, Y + y, 2.6); } }),
      bronze: BRONZE(), bronzeDk: BRONZE_DK(), bone: BONE(0.04), iron: IRON('#3e4048', '#16171b'),
      cord: cell({ grad: ['#b83a38', '#5a1414'], marks: [{ col: '#2a0808', wt: 1.7, n: 5, dir: 'h' }, { col: '#f0968a', wt: 1.1, n: 3, dir: 'v', len: [6, 14] }] }),
      mouth: MOUTH('#2a0c12'),
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
