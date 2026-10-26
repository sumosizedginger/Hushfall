// A Canvas 2D painting kit for the baker (look polish, 2026-10-26). The p5.brush layer hangs when a recipe asks it for hundreds of fills, so the polish pass paints with the plain Canvas 2D API on an
// off-screen p5.Graphics and lays the result on the bake canvas: gradients, round-capped strokes with alpha, blend modes (multiply for grime, screen for light), clipping to a cell. Everything random comes
// from the recipe's seeded g.rnd, so a bake is reproducible. The helpers speak in the cell's own pixels.
export function paint2d(g, w, h, fn) {
  const pg = g.p.createGraphics(w, h); pg.pixelDensity(1);
  const ctx = pg.drawingContext; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  fn(ctx, kit(ctx, g));
  g.p.push(); g.p.noStroke(); g.p.image(pg, -w / 2, -h / 2, w, h); g.p.pop(); pg.remove();
}

/** the brush kit bound to one 2D context and the recipe's random */
export function kit(ctx, g) {
  const R = (a, b) => g.rnd(a, b), pick = (arr) => arr[Math.floor(R(0, arr.length)) % arr.length];
  const K = {
    R, pick,
    /** run fn with the drawing clipped to a rectangle (a cell of an atlas) and its origin moved there */
    cell(x, y, w, h, fn) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y); fn(w, h); ctx.restore(); },
    fill(c, x, y, w, h, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; },
    /** a vertical (or horizontal) gradient through colour stops [[t, colour], ...] */
    grad(x, y, w, h, stops, vertical = true, a = 1) { const gr = vertical ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0); for (const [t, c] of stops) gr.addColorStop(t, c); ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; },
    radial(x, y, r, inner, outer, a = 1) { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, inner); gr.addColorStop(1, outer); ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; },
    /** one brush stroke: a gently curved line from (x1, y1) to (x2, y2), round caps */
    stroke(x1, y1, x2, y2, c, wt, a = 1, bend = 0) { ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = wt; ctx.beginPath(); ctx.moveTo(x1, y1); const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend; ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke(); ctx.globalAlpha = 1; },
    dot(x, y, r, c, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0.3, r), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; },
    poly(pts, c, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; },
    /** many strokes in one direction over a rectangle: a painted surface (n strokes of length len, width wt, colours from pal, angle in radians, alpha range) */
    strokes(x, y, w, h, n, { pal, len = [10, 30], wt = [2, 5], ang = 0, jit = 0.15, a = [0.25, 0.6], bend = 0.08 }) {
      for (let i = 0; i < n; i++) {
        const cx = x + R(0, w), cy = y + R(0, h), l = R(len[0], len[1]), t = ang + R(-jit, jit), dx = Math.cos(t) * l / 2, dy = Math.sin(t) * l / 2;
        K.stroke(cx - dx, cy - dy, cx + dx, cy + dy, pick(pal), R(wt[0], wt[1]), R(a[0], a[1]), R(-bend, bend));
      }
    },
    specks(x, y, w, h, n, pal, r = [0.5, 1.6], a = [0.3, 0.8]) { for (let i = 0; i < n; i++) K.dot(x + R(0, w), y + R(0, h), R(r[0], r[1]), pick(pal), R(a[0], a[1])); },
    /** a blend mode for what follows ('multiply' to darken with grime, 'screen' to add light), reset with mode() */
    mode(m = 'source-over') { ctx.globalCompositeOperation = m; },
  };
  return K;
}
