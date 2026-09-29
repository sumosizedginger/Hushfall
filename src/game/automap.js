// Canvas drawing of the automap model (engine/automap.js). Ink-and-paper look, redrawn each frame while open.
const PAL = { bg: 'rgba(9,11,16,0.88)', floor: '#2b3a3f', outdoor: '#2b3550', wall: '#141a1e', edge: '#9fb4b0', brass: '#c9a44c', wood: '#8a6a4a', exit: '#ffc070', me: '#3fffe0', text: '#cfe8e4', dim: '#7f9a98' };

export function drawAutomap(canvas, model) {
  if (canvas.width !== innerWidth || canvas.height !== innerHeight) { canvas.width = innerWidth; canvas.height = innerHeight; }
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
  const s = Math.max(4, Math.floor(Math.min((W * 0.88) / model.w, (H * 0.78) / model.h))), ox = Math.floor((W - s * model.w) / 2), oy = Math.floor((H - s * model.h) / 2) + 14;
  const at = new Map(model.cells.map((c) => [c.cx + ',' + c.cz, c.kind]));
  const walkable = (k) => k === 'floor' || k === 'outdoor' || k === 'door' || k === 'secret-revealed';
  for (const c of model.cells) {
    ctx.fillStyle = c.kind === 'wall' ? PAL.wall : c.kind === 'outdoor' ? PAL.outdoor : PAL.floor;
    ctx.fillRect(ox + c.cx * s, oy + c.cz * s, s, s);
  }
  // room outlines: an edge is drawn where a walkable explored cell meets a wall (explored or not)
  ctx.strokeStyle = PAL.edge; ctx.lineWidth = Math.max(2, s / 8); ctx.lineCap = 'square'; ctx.beginPath();
  for (const c of model.cells) {
    if (!walkable(c.kind)) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = at.get((c.cx + dx) + ',' + (c.cz + dz)), wallish = nk === 'wall' || (nk === undefined && (c.cx + dx < 0 || c.cz + dz < 0 || c.cx + dx >= model.w || c.cz + dz >= model.h));
      if (!wallish) continue;                                      // open floor, a door, or an unexplored neighbour (fog of war): no edge
      const x0 = ox + (c.cx + (dx > 0 ? 1 : 0)) * s, z0 = oy + (c.cz + (dz > 0 ? 1 : 0)) * s;
      if (dx !== 0) { ctx.moveTo(x0, oy + c.cz * s); ctx.lineTo(x0, oy + (c.cz + 1) * s); } else { ctx.moveTo(ox + c.cx * s, z0); ctx.lineTo(ox + (c.cx + 1) * s, z0); }
    }
  }
  ctx.stroke();
  // doors: brass bar for locked-type doors, wood for plain; drawn thin once open
  for (const d of model.doors) {
    ctx.fillStyle = d.key ? PAL.brass : PAL.wood; const t = Math.max(3, s * (d.open > 0.5 ? 0.18 : 0.42));
    if (d.axis === 'x') ctx.fillRect(ox + d.cx * s, oy + d.cz * s + (s - t) / 2, s, t); else ctx.fillRect(ox + d.cx * s + (s - t) / 2, oy + d.cz * s, t, s);
  }
  for (const e of model.exits) { const x = ox + (e.x / model.cell) * s, z = oy + (e.z / model.cell) * s; ctx.fillStyle = PAL.exit; ctx.beginPath(); ctx.moveTo(x, z - s * 0.5); ctx.lineTo(x + s * 0.5, z); ctx.lineTo(x, z + s * 0.5); ctx.lineTo(x - s * 0.5, z); ctx.closePath(); ctx.fill(); }
  // player arrow: forward in world is (-sin yaw, -cos yaw) on (x, z)
  const px = ox + (model.player.x / model.cell) * s, pz = oy + (model.player.z / model.cell) * s, fx = -Math.sin(model.player.yaw), fz = -Math.cos(model.player.yaw), r = Math.max(6, s * 0.6);
  ctx.fillStyle = PAL.me; ctx.strokeStyle = '#0d0f14'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(px + fx * r, pz + fz * r); ctx.lineTo(px - fx * r * 0.6 - fz * r * 0.6, pz - fz * r * 0.6 + fx * r * 0.6); ctx.lineTo(px - fx * r * 0.6 + fz * r * 0.6, pz - fz * r * 0.6 - fx * r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.font = '14px ui-monospace, Consolas, monospace'; ctx.fillStyle = PAL.text; ctx.textAlign = 'left';
  ctx.fillText(model.name.toUpperCase(), ox, oy - 18);
  ctx.fillStyle = PAL.dim; ctx.textAlign = 'right';
  ctx.fillText(`KILLS ${model.kills}/${model.totals.enemies}   SECRETS ${model.secrets}/${model.totals.secrets}   TAB: CLOSE`, ox + s * model.w, oy - 18);
}
