// Painting helpers shared by the look studies (tools/look) and the creature atlases (tools/baker/recipes_choir.js): colour maths, engraving hatch, Chladni (nodal) figures.
// Moved here verbatim from tools/look/recipes_look.js (the game's baker must not import from tools/look).
export function pip(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }

export const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export const toHex = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (c, to, f) => { const a = hex(c), b = hex(to); return toHex(a.map((v, i) => v + (b[i] - v) * f)); };
export const lum = (c) => { const [r, gg, b] = hex(c); return (0.299 * r + 0.587 * gg + 0.114 * b) / 255; };
/** engraving colour that always reads on its ground: darker lines on a light part, lighter lines on a dark part */
export const lineOn = (c) => (lum(c) < 0.3 ? mix(c, '#efe6cc', 0.42) : mix(c, '#0d0f14', 0.62));

/** parallel engraving strokes clipped to a polygon (px coordinates); keepX = only the part of each stroke right of that x (the shadow side) */
export function hatch(g, pts, o, keepX = -Infinity) {
  const a = (o.ang ?? 70) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), gap = o.gap ?? 5;
  const Rr = pts.map(([x, y]) => [x * ca + y * sa, -x * sa + y * ca]), vs = Rr.map((r) => r[1]), v0 = Math.min(...vs), v1 = Math.max(...vs);
  g.stroke(o.kind ?? 'cpencil', o.col ?? '#1a1208', o.wt ?? 0.6);
  for (let v = v0 + gap / 2; v < v1; v += gap) {
    const xs = [];
    for (let i = 0; i < Rr.length; i++) { const [u1, w1] = Rr[i], [u2, w2] = Rr[(i + 1) % Rr.length]; if ((w1 <= v && w2 > v) || (w2 <= v && w1 > v)) xs.push(u1 + (v - w1) * (u2 - u1) / (w2 - w1)); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      let ax = (xs[k] + 1.5) * ca - v * sa, ay = (xs[k] + 1.5) * sa + v * ca, bx = (xs[k + 1] - 1.5) * ca - v * sa, by = (xs[k + 1] - 1.5) * sa + v * ca;
      if (Math.hypot(bx - ax, by - ay) < 3) continue;
      if (ax < keepX && bx < keepX) continue;                                            // wholly in the light
      if (ax < keepX) { const t = (keepX - ax) / (bx - ax); ay += (by - ay) * t; ax = keepX; } else if (bx < keepX) { const t = (keepX - bx) / (ax - bx); by += (ay - by) * t; bx = keepX; }
      g.line(ax, ay, bx, by);
    }
  }
}

/** a Chladni (nodal-line) figure: the zero set of cos(n pi u) cos(m pi v) - cos(m pi u) cos(n pi v) over a box, by marching squares; drawn as brush line-work, clipped to a polygon */
export function nodal(g, box, n, m, col, wt, clip, res = 30, k = 'cpencil') {
  const [x0, y0, x1, y1] = box, f = (i, j) => { const u = i / res, v = j / res; return Math.cos(n * Math.PI * u) * Math.cos(m * Math.PI * v) - Math.cos(m * Math.PI * u) * Math.cos(n * Math.PI * v); };
  const px = (i) => x0 + (x1 - x0) * i / res, py = (j) => y0 + (y1 - y0) * j / res;
  g.stroke(k, col, wt);
  const seg = (a, b) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; if (!clip || pip(mx, my, clip)) g.line(a[0], a[1], b[0], b[1]); };
  for (let i = 0; i < res; i++) for (let j = 0; j < res; j++) {
    const a = f(i, j), b = f(i + 1, j), c = f(i + 1, j + 1), d = f(i, j + 1), idx = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const lerp = (p, q, fp, fq) => p + (q - p) * (fp / (fp - fq));
    const T = [lerp(px(i), px(i + 1), a, b), py(j)], Rt = [px(i + 1), lerp(py(j), py(j + 1), b, c)], Bt = [lerp(px(i), px(i + 1), d, c), py(j + 1)], Lt = [px(i), lerp(py(j), py(j + 1), a, d)];
    const S = { 1: [[Lt, Bt]], 2: [[Bt, Rt]], 3: [[Lt, Rt]], 4: [[T, Rt]], 5: [[T, Lt], [Bt, Rt]], 6: [[T, Bt]], 7: [[T, Lt]], 8: [[T, Lt]], 9: [[T, Bt]], 10: [[T, Rt], [Lt, Bt]], 11: [[T, Rt]], 12: [[Lt, Rt]], 13: [[Bt, Rt]], 14: [[Lt, Bt]] }[idx];
    for (const [s0, s1] of S) seg(s0, s1);
  }
}

