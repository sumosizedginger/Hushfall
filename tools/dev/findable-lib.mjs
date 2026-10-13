// The checks of the findability lint (PT-043), pure: a map's JSON source and the cells of the lane in, issues out. Used by tools/dev/findable.mjs and tests/findable.test.js.
const NAMES = /(lever|winch|valve|relay|latch|wheel|rope|handle|switch|plate|crank|panel|key|brazier|beacon|bell)/i;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function lintMap(src, laneCells, LANE = 5) {
  const msgs = (src.messages ?? []).map((m) => ({ at: m.at, text: m.text, id: m.id })), dark = src.atmosphere?.dark === true;
  const lights = (src.entities ?? []).filter((e) => e.type === 'prop' && ['lamp', 'lantern', 'lamppost'].includes(e.kind)).map((e) => e.at);
  const objectives = (src.triggers ?? []).flatMap((t) => (t.do ?? []).filter((a) => a.objective).map((a) => a.objective)).concat(src.objective ?? []);
  const issues = [], near = (p, list, r) => list.some((q) => dist(p, q) <= r);
  for (const e of (src.entities ?? []).filter((q) => q.type === 'switch')) {
    const p = e.at, name = `switch '${e.id}' at ${p}`;
    if (laneCells.length && !near(p, laneCells, LANE)) issues.push(`${name}: LANE: ${Math.min(...laneCells.map((c) => dist(p, c))).toFixed(1)} cells from the route (limit ${LANE})`);
    if (!dark && !near(p, lights, 4)) issues.push(`${name}: LIT: no lamp, lantern or lamppost within 4 cells`);
    if (!(msgs.some((m) => dist(p, m.at) <= 9) || objectives.some((o) => NAMES.test(o)))) issues.push(`${name}: HINT: no message within 9 cells and no objective that names a lever`);
  }
  // only a gate that a LEVER opens must be restated at the gate: one that opens when something dies or a place is reached is told by the objective
  const bySwitch = (src.entities ?? []).filter((q) => q.type === 'switch').flatMap((q) => q.do ?? []), exitByLever = bySwitch.some((a) => a.exit?.set === 'unlock'), doorByLever = new Set(bySwitch.flatMap((a) => (a.open ?? a.unlock ?? a.toggle) ? [(a.open ?? a.unlock ?? a.toggle).join(',')] : []));
  const gates = [...(src.entities ?? []).filter((q) => q.type === 'exit' && q.locked && exitByLever).map((q) => ({ at: q.at, name: `exit at ${q.at}` })), ...(src.doors ?? []).filter((d) => d.remote && doorByLever.has(d.at.join(','))).map((d) => ({ at: d.at, name: `remote door at ${d.at}` }))];
  for (const g of gates) if (!msgs.some((m) => dist(g.at, m.at) <= 7 && NAMES.test(m.text))) issues.push(`${g.name}: RESTATED: no message within 7 cells that names what opens it`);
  return { issues, levers: (src.entities ?? []).filter((q) => q.type === 'switch').length, gates: gates.length };
}
