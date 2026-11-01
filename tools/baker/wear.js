// WEAR (PT-079, design/ART_ASSESSMENT.md item 3): the two marks every later material is made of, drawn so they no longer read as a generator's.
// The recipes of Episodes 2 to 4 and Campaign Two built their grime from `blot` (a translucent perfect circle) and their scratches from `ink` (a perfectly straight hairline): the same soft disc and the same
// ruled line on brick, iron, plaster and flesh, which is what made a hundred tiles read as one machine's. These keep the SAME signatures, so no recipe changes, and they change only those two marks:
//   blot: a big FAINT one (diameter >= STAIN.minD, alpha < STAIN.maxA) becomes a STAIN: an irregular, elongated, tilted body with a lighter or darker core off its centre, a tide line along its edge and a few
//         specks at its rim. A small or solid one (a rivet, a glint, a lamp, a puffball) is still a perfect circle: it is meant to be one.
//   ink:  a thin FAINT one (weight <= SCRATCH.maxW, alpha <= SCRATCH.maxA, longer than SCRATCH.minL) becomes a SCRATCH: three segments that bend a little and taper at both ends. A drawn edge, a seam, a mortar
//         line or a vein (heavier or more opaque) is still a straight line.
// The shape of a stain or a scratch comes from its OWN numbers (where it is, its size, its colour) through a private hash, never from the recipe's random stream (g.rnd), so every other mark of every tile is
// exactly where it was: only the grime and the scratches change shape. Seamless as before: everything is drawn at the tile's wrapped offsets (g.tile).
import { hex } from './paint_util.js';

export const STAIN = { minD: 22, maxA: 200 };
export const SCRATCH = { maxW: 1.0, maxA: 150, minL: 8 };

/** a small deterministic generator seeded from a mark's own numbers */
function rngOf(...nums) {
  let h = 2166136261 >>> 0;
  for (const n of nums) { const s = typeof n === 'number' ? Math.round(n * 1000) : String(n).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7); h = Math.imul(h ^ (s & 0xffffffff), 16777619) >>> 0; }
  let a = h || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shade = (c, k) => hex(c).map((v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))));
const fillRGB = (g, rgb, a) => g.p.fill(rgb[0], rgb[1], rgb[2], a);

/** the outline of a stain: an irregular closed curve round (0, 0), radius about r, as [x, y] points */
function stainShape(rnd, r) {
  const n = 22, ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], amp = [0.16 + rnd() * 0.12, 0.08 + rnd() * 0.1, 0.04 + rnd() * 0.06], squash = 0.62 + rnd() * 0.4, tilt = rnd() * Math.PI, ct = Math.cos(tilt), st = Math.sin(tilt), pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, k = 1 + amp[0] * Math.sin(t + ph[0]) + amp[1] * Math.sin(2 * t + ph[1]) + amp[2] * Math.sin(3 * t + ph[2]), j = 0.9 + rnd() * 0.18, x = Math.cos(t) * r * k * j, y = Math.sin(t) * r * k * j * squash;
    pts.push([x * ct - y * st, x * st + y * ct]);
  }
  return pts;
}
/** a filled stain as a TRIANGLE FAN round its own centre (p5's WEBGL polygon path tessellates every shape, and a recipe of a few hundred stains drawn at nine wrapped offsets ran past the baker's timeout) */
const fan = (g, pts, ox, oy) => { g.p.beginShape(g.p.TRIANGLE_FAN); g.p.vertex(ox, oy); for (const [x, y] of pts) g.p.vertex(x + ox, y + oy); g.p.vertex(pts[0][0] + ox, pts[0][1] + oy); g.p.endShape(); };
/** the tide line as a thin filled band (a TRIANGLE STRIP between the outline and the outline drawn in by `w`), not a WEBGL stroke */
const band = (g, pts, ox, oy, w, r) => { g.p.beginShape(g.p.TRIANGLE_STRIP); for (let i = 0; i <= pts.length; i++) { const [x, y] = pts[i % pts.length], k = Math.max(0, 1 - w / Math.max(1, r)); g.p.vertex(x + ox, y + oy); g.p.vertex(x * k + ox, y * k + oy); } g.p.endShape(); };
/** the wrapped offsets at which a mark of radius r at (x, y) is on the tile at all (g.tile draws at all nine; most of them are off the canvas) */
const onTile = (g, x, y, r, dx, dy) => x + dx + r >= 0 && x + dx - r <= g.p.width && y + dy + r >= 0 && y + dy - r <= g.p.height;

/** a mark of grime: a STAIN when it is big and faint, otherwise the perfect circle it always was */
export function blot(g, x, y, d, c, a) {
  if (!(d >= STAIN.minD && a < STAIN.maxA)) return g.tile((dx, dy) => { g.p.push(); g.p.noStroke(); fillRGB(g, hex(c), a); g.p.ellipse(x + dx - g.p.width / 2, y + dy - g.p.height / 2, d, d); g.p.pop(); });
  const rnd = rngOf(x, y, d, c, a), body = stainShape(rnd, d / 2), dark = rnd() < 0.5, core = stainShape(rnd, d * (0.22 + rnd() * 0.16)).map(([px, py]) => [px + (rnd() - 0.5) * d * 0.3, py + (rnd() - 0.5) * d * 0.3]);
  const rgb = hex(c), coreRGB = shade(c, dark ? -0.22 : 0.16), rimRGB = shade(c, -0.35), specks = Array.from({ length: 2 + Math.floor(rnd() * 5) }, () => { const k = body[Math.floor(rnd() * body.length)]; return [k[0] * (1 + rnd() * 0.25), k[1] * (1 + rnd() * 0.25), 0.6 + rnd() * 1.1]; });
  const R = d * 0.8;
  g.tile((dx, dy) => {
    if (!onTile(g, x, y, R, dx, dy)) return;
    const ox = x + dx - g.p.width / 2, oy = y + dy - g.p.height / 2;
    g.p.push(); g.p.noStroke();
    fillRGB(g, rgb, a * 0.82); fan(g, body, ox, oy);                                                                // the body, a little thinner than the old disc (it no longer fills its bounding circle)
    fillRGB(g, coreRGB, a * 0.42); fan(g, core, ox, oy);                                                           // the core where it pooled (darker) or dried (lighter)
    fillRGB(g, rimRGB, a * 0.4); band(g, body, ox, oy, 1.2, d / 2);                                                  // the tide line
    fillRGB(g, rimRGB, a * 0.6); for (const [sx, sy, sr] of specks) g.p.rect(ox + sx - sr, oy + sy - sr, sr * 2, sr * 2);
    g.p.pop();
  });
}

/** a line: a SCRATCH when it is thin and faint (it bends a little and tapers at both ends), otherwise the straight line it always was */
export function ink(g, x1, y1, x2, y2, c, wt, a = 255) {
  const L = Math.hypot(x2 - x1, y2 - y1), rgb = hex(c);
  if (!(wt <= SCRATCH.maxW && a <= SCRATCH.maxA && L >= SCRATCH.minL)) return g.tile((dx, dy) => { g.p.push(); g.p.stroke(rgb[0], rgb[1], rgb[2], a); g.p.strokeWeight(wt); g.p.line(x1 + dx - g.p.width / 2, y1 + dy - g.p.height / 2, x2 + dx - g.p.width / 2, y2 + dy - g.p.height / 2); g.p.pop(); });
  const rnd = rngOf(x1, y1, x2, y2, c, wt), nx = -(y2 - y1) / L, ny = (x2 - x1) / L, bend = (rnd() - 0.5) * L * 0.09, kink = (rnd() - 0.5) * L * 0.05;
  const at = (t, off) => [x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off];
  const pts = [at(0, 0), at(0.3 + rnd() * 0.08, bend * 0.8 + kink), at(0.66 + rnd() * 0.08, bend), at(1, bend * 0.3)];
  const seg = [[0.55, 0.65], [1, 1], [0.6, 0.55]];                                                                // [weight, alpha] of each segment: thin at the ends, full in the middle
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, R = L / 2 + 4;
  g.tile((dx, dy) => {
    if (!onTile(g, cx, cy, R, dx, dy)) return;
    g.p.push(); const ox = dx - g.p.width / 2, oy = dy - g.p.height / 2;
    for (let i = 0; i < 3; i++) { g.p.stroke(rgb[0], rgb[1], rgb[2], a * seg[i][1]); g.p.strokeWeight(Math.max(0.35, wt * seg[i][0])); g.p.line(pts[i][0] + ox, pts[i][1] + oy, pts[i + 1][0] + ox, pts[i + 1][1] + oy); }
    g.p.pop();
  });
}
