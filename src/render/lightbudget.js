// Which lamps are lit, and how strongly (PT-021). The renderer keeps a CONSTANT number of lights in the scene (a changing count means a shader recompile), so exactly the nearest `budget` lamps are switched on.
// Switching one on or off in a single frame is a visible pop, and the pop gets worse the darker the room is. So a lamp's strength is a smooth function of its own distance and of the distance of the first lamp left out
// (the budget+1 nearest): a lamp more than `fade` metres nearer than that one is at full strength, and one that is level with it is at zero. The (budget+1)th distance is continuous in the eye's position, so nothing jumps
// when two lamps swap rank. Pure, so it is testable.

/** for lamps at the given SQUARED distances from the eye (input order): { on: the nearest `budget` are on (so the count the shader sees is constant), w: 0..1 the intensity scale } */
export function lightWeights(d2s, budget, fade) {
  const order = d2s.map((d, i) => i).sort((a, b) => d2s[a] - d2s[b]), on = new Array(d2s.length).fill(false);
  order.forEach((idx, rank) => { if (rank < budget) on[idx] = true; });
  const cut = order.length > budget ? Math.sqrt(d2s[order[budget]]) : Infinity;
  const w = d2s.map((d2, i) => { if (!on[i]) return 0; if (cut === Infinity) return 1; const k = Math.min(1, Math.max(0, (cut - Math.sqrt(d2)) / fade)); return k * k * (3 - 2 * k); });
  return { on, w };
}
