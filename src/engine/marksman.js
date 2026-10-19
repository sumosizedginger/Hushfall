// THE MARKSMAN (PT-060, R8 of the Director's Plan; design/ENEMY_ROSTER.md section 1): a Songkeeper with a reed-rifle. A hitscan shot at long range after a TELL you can see: a line of light from the reed to where you stood. The line follows you for `track` s, then
// FREEZES for `lock` s, then the shot goes down the frozen line: it hits only if you are still within `width` m of it and nothing solid is between. So a player who moves after the line freezes is not hit (the enemy design rule: every ranged attack can be dodged by
// moving and hits a stationary target), and cover blocks it. It keeps its distance (`keep`), walks back from you, and fights with its hands only if it is cornered. Pure: the world's own functions come in through `ctx`. Lazy fields on the creature: `snipeT` (-1 none, else seconds into a shot),
// `snipeCd`, `snipeAim` ([x, y, z]: where the line points), `snipeLost`.
export function snipeStep(ctx) {
  const { w, e, def, diff, dt, sees, dist, emit, hurt, rayClear, retreat } = ctx, S = def.snipe, p = w.player;
  e.snipeCd = Math.max(0, (e.snipeCd ?? 1.2) - dt);
  const muzzle = () => [e.x + Math.sin(e.yaw) * 0.5, e.y + (S.muzzleY ?? 1.7), e.z + Math.cos(e.yaw) * 0.5];
  if ((e.snipeT ?? -1) >= 0) {
    e.snipeT += dt; e.walk *= 0.85;
    if (!sees) { e.snipeLost = (e.snipeLost ?? 0) + dt; if (e.snipeLost > 0.5) { e.snipeT = -1; e.snipeAim = null; e.snipeCd = 1; return true; } } else e.snipeLost = 0;
    if (e.snipeT < S.track && sees) e.snipeAim = [p.x, p.y + S.aimHeight, p.z];          // the line follows you...
    if (e.snipeT >= S.track + S.lock) {                                                      // ...and then it goes down the line it froze on
      const o = muzzle(), a = e.snipeAim ?? [p.x, p.y + S.aimHeight, p.z];
      let dx = a[0] - o[0], dy = a[1] - o[1], dz = a[2] - o[2]; const len = Math.hypot(dx, dy, dz) || 1; dx /= len; dy /= len; dz /= len;
      const reach = S.max * 1.3, c = [p.x, p.y + 0.9, p.z], t = Math.min(reach, Math.max(0, (c[0] - o[0]) * dx + (c[1] - o[1]) * dy + (c[2] - o[2]) * dz)), px = o[0] + dx * t, py = o[1] + dy * t, pz = o[2] + dz * t;
      const miss = Math.hypot(c[0] - px, c[1] - py, c[2] - pz), hit = miss < S.width && rayClear(w, o[0], o[1], o[2], px, py, pz);
      const end = hit ? [px, py, pz] : [o[0] + dx * Math.min(reach, Math.max(t, 6)), o[1] + dy * Math.min(reach, Math.max(t, 6)), o[2] + dz * Math.min(reach, Math.max(t, 6))];
      if (hit) hurt(Math.round(S.damage * diff.enemyDamage));
      emit(w, 'snipe_shot', { id: e.id, kind: e.kind, x: e.x, z: e.z, x0: o[0], y0: o[1], z0: o[2], x1: end[0], y1: end[1], z1: end[2], hit });
      e.snipeT = -1; e.snipeAim = null; e.snipeCd = S.cooldown * diff.reaction;
    }
    return true;
  }
  if (sees && e.snipeCd <= 0 && dist >= S.min && dist <= S.max) { e.snipeT = 0; e.snipeLost = 0; e.snipeAim = [p.x, p.y + S.aimHeight, p.z]; emit(w, 'snipe_tell', { id: e.id, kind: e.kind, x: e.x, z: e.z }); return true; }
  if (sees && dist < S.keep && retreat()) { e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * def.gait; return true; }       // too close: it backs off (cornered, it fights with its hands: the caller falls through)
  if (sees && dist <= S.max * 0.85 && dist >= S.keep) { e.walk = Math.max(0, e.walk - dt * 3); return true; }                          // at its range: it stands and waits for the shot
  return false;                                                                                                                          // too far, or out of sight: the ordinary chase
}
