// LOOK POLISH 2 (2026-10-26): the world's commonest materials repainted in the chunky painted style (recipes_polish.js says what that is), plus the ceiling the level never had. These are the
// materials of Episode One, the standard the rest of the campaign is held to; the steel bulkhead alone is the default wall of every map. Every tile is seamless: a mark that crosses an edge is drawn
// again on the other side (tiler below). The image's top is the top of a wall (a wall's texture runs up from its own floor), so a darker foot and a lit head belong in the shader, not here: these
// tiles are even top to bottom except the plaster's wainscot, which the loader clamps (textures.js). Values stay close to the old tiles' means, so a place's light is not changed by its paint;
// what changes is the STRUCTURE inside them: bold seams, every plate, plank, brick and stone lit from above and shadowed below, warm and cool in the same tile.
import { R } from './recipes.js';
import { paint2d } from './paint2d.js';

/** marks that wrap: each is drawn at the offsets (x +- W, y +- H) its bounds reach, so the tile repeats without a seam */
function tiler(K, ctx, W, H) {
  const offs = (x0, y0, x1, y1) => { const out = []; for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) if (x1 + ox >= 0 && x0 + ox <= W && y1 + oy >= 0 && y0 + oy <= H) out.push([ox, oy]); return out; };
  const T = {
    stroke(x1, y1, x2, y2, c, wt, a = 1, bend = 0) { const p = wt + 2; for (const [ox, oy] of offs(Math.min(x1, x2) - p, Math.min(y1, y2) - p, Math.max(x1, x2) + p, Math.max(y1, y2) + p)) K.stroke(x1 + ox, y1 + oy, x2 + ox, y2 + oy, c, wt, a, bend); },
    dot(x, y, r, c, a = 1) { for (const [ox, oy] of offs(x - r, y - r, x + r, y + r)) K.dot(x + ox, y + oy, r, c, a); },
    poly(pts, c, a = 1) { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); for (const [ox, oy] of offs(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))) K.poly(pts.map(([x, y]) => [x + ox, y + oy]), c, a); },
    radial(x, y, r, inner, outer, a = 1) { for (const [ox, oy] of offs(x - r, y - r, x + r, y + r)) K.radial(x + ox, y + oy, r, inner, outer, a); },
    /** a box lit from above: a gradient body, a lit top lip and a dark bottom lip (a plate, a plank, a brick, a stone), wrapped */
    block(x, y, w, h, top, mid, bot, { lip = 2, lit = null, dark = null, a = 1 } = {}) {
      for (const [ox, oy] of offs(x, y, x + w, y + h)) {
        const gr = ctx.createLinearGradient(0, y + oy, 0, y + oy + h); gr.addColorStop(0, top); gr.addColorStop(0.45, mid); gr.addColorStop(1, bot);
        ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(x + ox, y + oy, w, h); ctx.globalAlpha = 1;
        if (lit) K.fill(lit, x + ox, y + oy, w, lip, 0.8); if (dark) K.fill(dark, x + ox, y + oy + h - lip, w, lip, 0.85);
      }
    },
    /** many wrapped strokes (paint2d's strokes, seamless) */
    strokes(x, y, w, h, n, { pal, len = [10, 30], wt = [2, 5], ang = 0, jit = 0.15, a = [0.25, 0.6], bend = 0.08 }) {
      for (let i = 0; i < n; i++) { const cx = x + K.R(0, w), cy = y + K.R(0, h), l = K.R(len[0], len[1]), t = ang + K.R(-jit, jit), dx = Math.cos(t) * l / 2, dy = Math.sin(t) * l / 2; T.stroke(cx - dx, cy - dy, cx + dx, cy + dy, K.pick(pal), K.R(wt[0], wt[1]), K.R(a[0], a[1]), K.R(-bend, bend)); }
    },
    /** a rounded stone or cobble: a dark rim, a body, a lit crown toward the top left */
    pebble(x, y, rx, ry, body, crown, rim, rot = 0) {
      for (const [ox, oy] of offs(x - rx - 3, y - ry - 3, x + rx + 3, y + ry + 3)) {
        ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate(rot);
        ctx.fillStyle = rim; ctx.beginPath(); ctx.ellipse(1.5, 2, rx + 1.5, ry + 1.5, 0, 0, Math.PI * 2); ctx.fill();
        const gr = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, 1, 0, 0, Math.max(rx, ry) * 1.1); gr.addColorStop(0, crown); gr.addColorStop(0.55, body); gr.addColorStop(1, rim);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    },
  };
  return T;
}
const paintTile = (fn) => R((g, w, h) => paint2d(g, w, h, (ctx, K) => fn(ctx, K, tiler(K, ctx, w, h), w, h)));
const mix = (a, b, t) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

export const recipesPolish2 = {
  // the default wall of every map: riveted steel plates in four courses, each lit along its top and shadowed under its lap, rivets along both edges, rust bleeding down from a few of them, a weld
  wall_bulkhead_a: {
    seed: 21101, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#1c2428', 0, 0, 256, 256);
      for (let r = 0; r < 4; r++) {
        const y = r * 64, off = (r % 2) * 64 + K.R(-10, 10);
        for (let c = -1; c < 3; c++) {
          const x = off + c * 128, k = K.R(-0.08, 0.08), t = (s) => mix(s, k > 0 ? '#6e8a8c' : '#2c3a44', Math.abs(k) * 2.2);
          T.block(x + 1, y + 1, 126, 62, t('#6f8890'), t('#4a6068'), t('#2c3a42'), { lip: 3, lit: '#a6c0c4', dark: '#141a1e' });
          for (let i = 0; i < 6; i++) { const rx = x + 10 + i * 21.5; for (const ry of [y + 8, y + 56]) { T.dot(rx + 0.8, ry + 1.2, 3.2, '#10161a', 0.9); T.dot(rx, ry, 2.6, '#7c9298'); T.dot(rx - 0.8, ry - 0.9, 1.1, '#d8e8ea', 0.9); } }
          if (K.R(0, 1) < 0.45) { const rx = x + 10 + Math.floor(K.R(0, 6)) * 21.5, l = K.R(14, 46); T.stroke(rx, y + 60, rx + K.R(-2, 2), y + 60 + l, '#8a4622', K.R(2.5, 4.5), 0.55); T.stroke(rx, y + 60, rx, y + 60 + l * 0.6, '#c06a30', 1.4, 0.5); }
          if (K.R(0, 1) < 0.5) T.radial(x + K.R(20, 108), y + K.R(14, 50), K.R(10, 22), 'rgba(18,22,20,0.55)', 'rgba(18,22,20,0)');           // a grease bloom
        }
        T.stroke(0, y + 1, 256, y + 1, '#0a0e10', 2.2, 0.9);                                                                               // the lap's hard shadow line
      }
      for (let i = 0; i < 2; i++) { const x = K.R(20, 236), y = K.R(10, 200); for (let s = 0; s < 9; s++) T.dot(x, y + s * 5, 2.2, s % 2 ? '#8ea4a8' : '#3a4a50', 0.85); }   // a vertical weld bead
      T.strokes(0, 0, 256, 256, 40, { pal: ['#a8c4c8', '#5a7078'], len: [6, 18], wt: [1, 2], ang: 0, jit: 0.4, a: [0.25, 0.5] });                // scratches: light catches them
    }),
  },

  // lime plaster over a painted wainscot (the loader clamps it: plaster above, the wainscot at the foot of the first course only). Mid ochre, not near-white: a pale wall was the flattest thing in the hall
  wall_plaster_a: {
    seed: 27201, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.grad(0, 0, 256, 150, [[0, '#b8a27a'], [0.6, '#a89070'], [1, '#97805e']]);
      for (let i = 0; i < 18; i++) K.radial(K.R(0, 256), K.R(0, 140), K.R(18, 48), K.pick(['rgba(200,184,146,0.55)', 'rgba(120,108,84,0.45)', 'rgba(110,122,108,0.35)']), 'rgba(0,0,0,0)');   // the plaster's own clouds, warm and cool
      T.strokes(0, 0, 256, 140, 70, { pal: ['#c8b48a', '#8c7656', '#b09a74'], len: [14, 34], wt: [3, 7], ang: 0.3, jit: 0.6, a: [0.18, 0.35], bend: 0.2 });   // the trowel
      { let h = 26; for (let x = 0; x < 256; x += 3) { h = Math.min(46, Math.max(14, h + K.R(-3, 3))); K.fill('#6e5c3e', x, 148 - h, 3, h, 0.28); K.fill('#4e3e26', x, 148 - h, 3, 2.5, 0.75); } }   // rising damp with its hard tide mark
      { const cx = 76, cy = 62, pts = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; pts.push([cx + Math.cos(a) * 30 * K.R(0.75, 1.1), cy + Math.sin(a) * 22 * K.R(0.75, 1.1)]); }   // ONE place where it fell away
        K.poly(pts.map(([x, y]) => [x + 3, y + 3]), '#3a2a1c', 0.7); K.poly(pts, '#4a3a2e');
        ctx.save(); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
        for (let r = -4; r <= 4; r++) for (let q = -3; q <= 3; q++) { const bx = cx + q * 22 + (r % 2) * 11, by = cy + r * 11; K.grad(bx - 10, by - 4.5, 20, 9, [[0, '#a85a3a'], [1, '#6a3020']]); }
        ctx.restore(); for (let k = 0; k < pts.length; k++) { const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % pts.length]; K.stroke(x1, y1, x2, y2, y1 < cy ? '#2a1c12' : '#e0cea4', 2, 0.8); } }
      for (let i = 0; i < 3; i++) { let x = K.R(130, 250), y = K.R(10, 60); for (let s = 0; s < 5; s++) { const nx = x + K.R(-10, 10), ny = y + K.R(8, 18); K.stroke(x, y, nx, ny, '#4a3a26', 1.4, 0.7); x = nx; y = ny; } }   // cracks
      // the chair rail: a lit round moulding and the shadow it throws
      K.grad(0, 146, 256, 9, [[0, '#e6d6a8'], [0.5, '#a89060'], [1, '#3c2c18']]); K.fill('#0e1a14', 0, 155, 256, 4, 0.6);
      // the wainscot: deep green painted boards with raised panels, each panel's top and left edge lit, bottom and right dark
      K.grad(0, 155, 256, 101, [[0, '#2e5040'], [1, '#1a3024']]);
      for (let x = 0; x < 256; x += 64) { K.fill('#24402e', x + 8, 166, 48, 72); K.fill('#4e7a62', x + 8, 166, 48, 3, 0.9); K.fill('#4e7a62', x + 8, 166, 3, 72, 0.7); K.fill('#0c1810', x + 8, 235, 48, 3, 0.9); K.fill('#0c1810', x + 53, 166, 3, 72, 0.8); K.stroke(x + 1, 158, x + 1, 256, '#0a140e', 2.5, 0.9); }
      for (let i = 0; i < 14; i++) T.dot(K.R(0, 256), K.R(160, 250), K.R(1.5, 4), K.pick(['#8aa894', '#b8c4a8']), 0.8);                         // chips to the primer
      K.grad(0, 236, 256, 20, [[0, 'rgba(8,14,10,0)'], [1, 'rgba(8,14,10,0.7)']]);                                                                      // kicked dark at the foot
    }),
  },

  // brick in running bond: chunky bricks (four to a course), each its own warm hue, lit top, dark foot, deep mortar; a few sooted and a few cool replacements
  brick_warm_a: {
    seed: 26301, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#2e2420', 0, 0, 256, 256);
      const bh = 256 / 12;
      for (let r = 0; r < 12; r++) for (let c = -1; c < 4; c++) {
        const x = c * 64 + (r % 2) * 32 + 2, y = r * bh + 2, roll = K.R(0, 1);
        const base = roll < 0.08 ? '#5e5a58' : roll < 0.16 ? '#3e2a22' : K.pick(['#a4583a', '#b0643e', '#8c4430', '#9a5034', '#b86e46', '#7e3c2a']);
        T.block(x, y, 60, bh - 3.5, mix(base, '#f0b080', 0.22), base, mix(base, '#1a0e0a', 0.45), { lip: 2, lit: mix(base, '#ffd0a0', 0.4), dark: '#1e1410' });
        if (K.R(0, 1) < 0.3) T.radial(x + K.R(10, 50), y + bh / 2, K.R(8, 16), 'rgba(30,20,16,0.5)', 'rgba(30,20,16,0)');
      }
      for (let i = 0; i < 4; i++) { const x = K.R(0, 256); T.stroke(x, K.R(0, 60), x + K.R(-3, 3), K.R(120, 240), '#d8d0c0', K.R(3, 6), 0.16); }        // efflorescence runs
    }),
  },

  // weathered boards: eight vertical boards a tile, each lit at its left edge, grain that runs the length, a rail across, nails
  wall_timber_a: {
    seed: 27101, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      for (let i = 0; i < 8; i++) {
        const x = i * 32, base = K.pick(['#8a7254', '#7c664a', '#94785a', '#6e5a42']);
        K.grad(x, 0, 32, 256, [[0, mix(base, '#e0c8a0', 0.3)], [0.2, base], [1, mix(base, '#1e1610', 0.5)]], false);
        T.strokes(x + 3, 0, 26, 256, 9, { pal: [mix(base, '#2a1e12', 0.5), mix(base, '#c8b08a', 0.3)], len: [60, 200], wt: [1.2, 2.6], ang: Math.PI / 2, jit: 0.03, a: [0.4, 0.75] });
        if (K.R(0, 1) < 0.4) { const ky = K.R(30, 220); K.radial(x + 16, ky, 6, '#2a1e12', 'rgba(42,30,18,0)', 0.9); }
        K.stroke(x + 0.5, -4, x + 0.5, 260, '#120c08', 3, 0.95);
        for (const ny of [22, 150]) { T.dot(x + 9, ny, 2.4, '#1a1410'); T.dot(x + 23, ny, 2.4, '#1a1410'); T.dot(x + 8.4, ny - 0.8, 1, '#c0b0a0', 0.7); T.dot(x + 22.4, ny - 0.8, 1, '#c0b0a0', 0.7); }
      }
      K.grad(0, 134, 256, 30, [[0, '#a48a64'], [0.4, '#7a6446'], [1, '#2e2216']]); K.fill('#120c08', 0, 164, 256, 3, 0.7);        // the rail
    }),
  },

  // dark iron: two heavy panels a tile in a bolted frame, rust bleeding from the bolts, a hazard band only on the first course
  wall_iron_a: {
    seed: 27401, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#262c32', 0, 0, 256, 256);                                                                                   // (the first bake was near black: a doorway in an iron wall read as a hole in the dark)
      for (const x of [0, 128]) { T.block(x + 6, 6, 116, 244, '#68727a', '#4e5860', '#30383e', { lip: 4, lit: '#a4b0b8', dark: '#12161a' });
        K.grad(x + 18, 18, 92, 220, [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(0,0,0,0.25)']]);
        for (const [bx, by] of [[14, 14], [114, 14], [14, 242], [114, 242], [14, 128], [114, 128]]) { T.dot(x + bx + 1, by + 1.4, 4.4, '#06080a'); T.dot(x + bx, by, 3.8, '#5e6870'); T.dot(x + bx - 1.2, by - 1.2, 1.4, '#c8d4da', 0.9); if (K.R(0, 1) < 0.55) T.stroke(x + bx, by + 4, x + bx + K.R(-2, 2), by + K.R(20, 60), '#8a4420', K.R(2, 4), 0.5); } }
      T.strokes(0, 0, 256, 256, 30, { pal: ['#7a8890', '#262c30'], len: [8, 20], wt: [1, 2.2], ang: 0, jit: 0.5, a: [0.25, 0.5] });
    }),
  },

  // deck planks: eight courses of boards across, end joints staggered, each board its own brown, lit edge, a dark gap, a nail pair at each end
  floor_planks_a: {
    seed: 25301, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#120c08', 0, 0, 256, 256);
      for (let r = 0; r < 8; r++) {
        const y = r * 32, joints = [K.R(0, 256)]; joints.push(joints[0] + K.R(90, 150));
        let x0 = joints[0] - 256;
        for (const xj of [...joints, joints[0] + 256]) { const w = xj - x0 - 2, base = K.pick(['#7a5434', '#6c4a2e', '#86603a', '#5e4028', '#7e5a3a']);
          T.block(x0 + 1, y + 1, w, 29, mix(base, '#e0b07a', 0.25), base, mix(base, '#140c06', 0.5), { lip: 2, lit: mix(base, '#f0c890', 0.35), dark: '#0e0805' });
          T.strokes(0, y + 4, 256, 22, 5, { pal: [mix(base, '#1e1208', 0.6)], len: [40, 120], wt: [1.2, 2.4], ang: 0, jit: 0.02, a: [0.4, 0.7] });
          for (const nx of [x0 + 7, xj - 8]) { T.dot(nx, y + 9, 1.9, '#140c06'); T.dot(nx, y + 22, 1.9, '#140c06'); }
          x0 = xj; }
      }
      for (let i = 0; i < 6; i++) T.radial(K.R(0, 256), K.R(0, 256), K.R(14, 30), 'rgba(20,12,6,0.4)', 'rgba(20,12,6,0)');                          // spilt oil, dark patches
    }),
  },

  // big flagstones: irregular rectangles four or five to a row, cool slate greys with warm ones among them, each with a lit upper bevel and a dark lower one, moss in a few joints
  floor_flag_a: {
    seed: 27901, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#141618', 0, 0, 256, 256);
      const rows = [0, 70, 132, 196, 256];
      for (let r = 0; r < 4; r++) { let x = K.R(0, 40) - 60; const y = rows[r], h = rows[r + 1] - y;
        while (x < 256) { const w = K.R(52, 92), base = K.pick(['#4c545a', '#566068', '#5e5a52', '#464e56', '#62645e']);
          T.block(x + 2, y + 2, w - 4, h - 4, mix(base, '#c0c8cc', 0.25), base, mix(base, '#0a0c0e', 0.5), { lip: 3, lit: mix(base, '#dce2e4', 0.45), dark: '#08090a' });
          T.radial(x + w * K.R(0.3, 0.7), y + h * K.R(0.3, 0.7), K.R(10, 22), K.pick(['rgba(30,34,36,0.45)', 'rgba(150,160,166,0.25)']), 'rgba(0,0,0,0)');
          if (K.R(0, 1) < 0.35) { const cx = x + K.R(10, w - 10), cy = y + K.R(10, h - 10); T.stroke(cx, cy, cx + K.R(-18, 18), cy + K.R(-14, 14), '#0e1012', 1.6, 0.8); }
          x += w; } }
      for (let i = 0; i < 26; i++) { const x = K.R(0, 256), y = K.pick(rows) + K.R(-3, 3); T.stroke(x, y, x + K.R(6, 16), y + K.R(-2, 2), K.pick(['#3e5a30', '#56723a']), K.R(2.5, 4.5), 0.7); }   // moss in the joints
    }),
  },

  // slate: smaller split tiles in courses, blue-grey, the cleft showing as a few hard light and dark marks, chipped corners
  floor_slate_a: {
    seed: 28101, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#0e1114', 0, 0, 256, 256);
      for (let r = 0; r < 6; r++) { const y = r * (256 / 6), h = 256 / 6; let x = (r % 2) * 22 - 44;
        while (x < 256) { const w = K.R(36, 58), base = K.pick(['#3c4652', '#36404a', '#44505a', '#3a3e48']);
          T.block(x + 1.5, y + 1.5, w - 3, h - 3, mix(base, '#9aa8b4', 0.22), base, mix(base, '#06080a', 0.45), { lip: 2, lit: mix(base, '#c4d0d8', 0.35), dark: '#05070a' });
          for (let k = 0; k < 2; k++) { const sx = x + K.R(4, w - 10), sy = y + K.R(5, h - 6); T.stroke(sx, sy, sx + K.R(6, 16), sy + K.R(-1, 1), K.pick(['#8494a0', '#1a2028']), K.R(1.5, 3), 0.6); }
          x += w; } }
    }),
  },

  // wet cobbles: rounded setts packed in rows, each with a wet crown of light at its top left and a dark rim, cool and warm stones together, a puddle glint or two
  cobble_wet_a: {
    seed: 26201, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#0c0e10', 0, 0, 256, 256);
      for (let r = 0; r < 9; r++) { const y = r * (256 / 9) + 14; let x = (r % 2) * 14 + K.R(-4, 4);
        while (x < 256 + 14) { const rx = K.R(11, 15), ry = K.R(10, 12.5), base = K.pick(['#4a5258', '#565a5c', '#5a5248', '#3e464e', '#605a52']);
          T.pebble(x, y + K.R(-1.5, 1.5), rx, ry, base, mix(base, '#e8eef2', 0.55), '#0a0c0e', K.R(-0.3, 0.3)); x += rx * 2 + K.R(1.5, 3.5); } }
      for (let i = 0; i < 4; i++) { const x = K.R(0, 256), y = K.R(0, 256); T.radial(x, y, K.R(16, 28), 'rgba(140,170,190,0.28)', 'rgba(140,170,190,0)'); }                  // puddles: a cool sheen
    }),
  },

  // the checker of the halls: cream and slate tiles, bevelled, crazed glaze on the cream, grime in the joints (the old tile was blotchy clouds that read as a grey smear)
  floor_tile_a: {
    seed: 27601, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#121416', 0, 0, 256, 256);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64, y = r * 64, light = (r + c) % 2 === 0;
        const base = light ? K.pick(['#a8987a', '#b0a080', '#a29274']) : K.pick(['#2c3236', '#30363c', '#283034']);
        T.block(x + 2, y + 2, 60, 60, mix(base, '#ffffff', light ? 0.12 : 0.1), base, mix(base, '#000000', 0.35), { lip: 3, lit: mix(base, '#fff4dc', 0.4), dark: '#0a0b0c' });
        if (light) for (let k = 0; k < 4; k++) { let px = x + K.R(8, 56), py = y + K.R(8, 56); for (let s = 0; s < 3; s++) { const nx = px + K.R(-12, 12), ny = py + K.R(-12, 12); K.stroke(px, py, nx, ny, '#6a5c44', 1, 0.6); px = nx; py = ny; } }
        else K.stroke(x + 10, y + 12, x + 52, y + 10, '#5a646a', 2, 0.35);                                                                 // a gleam on the dark glaze
        T.radial(x + K.R(10, 54), y + K.R(10, 54), K.R(10, 20), 'rgba(30,26,20,0.3)', 'rgba(30,26,20,0)');
      }
    }),
  },

  // a runner of deep red carpet: a woven lattice, a gold border along both edges of the tile, the nap worn paler down the middle
  floor_carpet_a: {
    seed: 27801, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#6a1c1a', 0, 0, 256, 256); K.grad(0, 40, 256, 176, [[0, 'rgba(160,70,50,0)'], [0.5, 'rgba(160,70,50,0.35)'], [1, 'rgba(160,70,50,0)']]);
      for (let k = -8; k <= 8; k++) { T.stroke(k * 32, 22, k * 32 + 212, 234, '#3e0e0e', 3, 0.7); T.stroke(k * 32 + 212, 22, k * 32, 234, '#3e0e0e', 3, 0.7); }
      for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) { const x = c * 32 + 16, y = 32 + r * 32; if (y > 224) continue; T.poly([[x, y - 6], [x + 6, y], [x, y + 6], [x - 6, y]], '#c08a3a', 0.8); }
      for (const y of [6, 238]) { K.fill('#1e0808', 0, y, 256, 12); K.fill('#b88638', 0, y + 3, 256, 2.5); K.fill('#b88638', 0, y + 7, 256, 2.5); }
      T.strokes(0, 0, 256, 256, 160, { pal: ['#8a2c26', '#4a1210'], len: [3, 8], wt: [1, 2], ang: Math.PI / 2, jit: 0.4, a: [0.25, 0.5] });
    }),
  },

  // the ceiling every roofed room has (it used to wear the floor's planks, tinted): dark boards between joists, soot over the joists, the boards lit from the room below
  ceiling_a: {
    seed: 29901, width: 256, height: 256,
    draw: paintTile((ctx, K, T) => {
      K.fill('#120e0a', 0, 0, 256, 256);
      for (let i = 0; i < 8; i++) { const x = i * 32, base = K.pick(['#4a3a2a', '#423426', '#52402e']);
        K.grad(x + 1, 0, 30, 256, [[0, mix(base, '#c09868', 0.22)], [0.5, base], [1, mix(base, '#0a0806', 0.5)]], false);
        T.strokes(x + 3, 0, 26, 256, 6, { pal: [mix(base, '#140e08', 0.6)], len: [80, 220], wt: [1, 2], ang: Math.PI / 2, jit: 0.02, a: [0.4, 0.7] }); }
      for (const y of [0, 128]) { K.grad(0, y, 256, 26, [[0, '#2a2018'], [0.5, '#5a4632'], [1, '#1a120c']]); K.fill('#0a0806', 0, y + 26, 256, 4, 0.8); }   // the joists across
      for (let i = 0; i < 5; i++) T.radial(K.R(0, 256), K.R(0, 256), K.R(20, 40), 'rgba(8,6,4,0.5)', 'rgba(8,6,4,0)');                                 // soot over the lamps
    }),
  },
};
