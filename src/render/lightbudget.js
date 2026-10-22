// Which lamps are lit, and how strongly (PT-021). The renderer keeps a CONSTANT number of lights in the scene (a changing count means a shader recompile), so exactly the nearest `budget` lamps are switched on.
// Switching one on or off in a single frame is a visible pop, and the pop gets worse the darker the room is. So a lamp's strength is a smooth function of its own distance and of the distance of the first lamp left out
// (the budget+1 nearest): a lamp more than `fade` metres nearer than that one is at full strength, and one that is level with it is at zero. The (budget+1)th distance is continuous in the eye's position, so nothing jumps
// when two lamps swap rank. Pure, so it is testable.

/** for lamps at the given SQUARED distances from the eye (input order): { on: the nearest `budget` are on (so the count the shader sees is constant), w: 0..1 the intensity scale } */
export function lightWeights(d2s, budget, fade, scratch = null) {
  // `scratch` ({}): the arrays are kept in it and reused, so a caller that runs this every frame allocates none (FREEZE F12, round 1, Grok 3); the answer is the same either way, and a caller must use it before the next call
  const n = d2s.length, s = scratch ?? {}, order = (s.order ??= []), on = (s.on ??= []), w = (s.w ??= []);
  order.length = n; on.length = n; w.length = n;
  for (let i = 0; i < n; i++) { order[i] = i; on[i] = false; }
  order.sort((a, b) => d2s[a] - d2s[b]);
  for (let rank = 0; rank < n && rank < budget; rank++) on[order[rank]] = true;
  const cut = n > budget ? Math.sqrt(d2s[order[budget]]) : Infinity;
  for (let i = 0; i < n; i++) { if (!on[i]) { w[i] = 0; continue; } if (cut === Infinity) { w[i] = 1; continue; } const k = Math.min(1, Math.max(0, (cut - Math.sqrt(d2s[i])) / fade)); w[i] = k * k * (3 - 2 * k); }
  return { on, w };
}
