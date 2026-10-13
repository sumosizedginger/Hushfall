// THE FINDABILITY LINT (PT-043; design/ACTC.md section 0, law 1; the owner after the Ossuary winch: "it is impossible to find the switch"). A thing that opens the way must be FINDABLE, and this checks what a node can check, per map:
//   LANE      every lever (a `switch` entity) and every locked exit is on or beside the lane: within `--lane` cells (default 5) of a cell the main route's player stood in
//   LIT       in a place that is not dark, a lamp, a lantern or a lamppost within 4 cells of the lever (in a dark place its own lamp glows: levelmesh.js)
//   HINT      a message within 9 cells of the lever, or an objective set by a trigger that names it (lever, winch, valve, relay, latch, wheel, rope, handle)
//   RESTATED  every locked exit and every remote door has a message within 7 cells that names what opens it (an exit that is shut says what shuts it)
// Not decided here: whether the objective NAMES it by what it looks like (a person reads that), and whether it is told at the moment it matters (the route stories show it). Exit code 1 when a lever or gate fails.
//   node tools/dev/findable.mjs [--lane=5] [--route=main] [--dir=maps] ID [ID ...]      (one route run, node only, one core)
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';

const root = path.resolve(import.meta.dirname, '../..');
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; })), ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const LANE = Number(flags.lane ?? 5), dir = path.join(root, flags.dir ?? 'maps'), ROUTE = flags.route ?? 'main';
const NAMES = /(lever|winch|valve|relay|latch|wheel|rope|handle|switch|plate|crank|panel|key|brazier|beacon|bell)/i;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
let bad = 0;
for (const id of ids) {
  const file = path.join(dir, id + '.json'), map = loadMapFile(file), src = JSON.parse(fs.readFileSync(file, 'utf8')), rf = path.join(root, 'routes', `${id}.${ROUTE}.route.json`);
  const lane = new Set(); if (fs.existsSync(rf)) { runRoute(map, loadRouteFile(rf), { seed: 1, difficulty: 'normal', onTick: (w) => lane.add(Math.floor(w.player.x / map.cell) + ',' + Math.floor(w.player.z / map.cell)) }); }
  const laneCells = [...lane].map((k) => k.split(',').map(Number)), msgs = (src.messages ?? []).map((m) => ({ at: m.at, text: m.text, id: m.id })), dark = src.atmosphere?.dark === true;
  const lights = (src.entities ?? []).filter((e) => e.type === 'prop' && ['lamp', 'lantern', 'lamppost'].includes(e.kind)).map((e) => e.at);
  const objectives = (src.triggers ?? []).flatMap((t) => (t.do ?? []).filter((a) => a.objective).map((a) => a.objective)).concat(src.objective ?? []);
  const issues = [], notes = [];
  const near = (p, list, r) => list.some((q) => dist(p, q) <= r);
  for (const e of (src.entities ?? []).filter((q) => q.type === 'switch')) {
    const p = e.at, name = `switch '${e.id}' at ${p}`;
    if (laneCells.length && !near(p, laneCells, LANE)) issues.push(`${name}: LANE: ${Math.min(...laneCells.map((c) => dist(p, c))).toFixed(1)} cells from the route (limit ${LANE})`);
    if (!dark && !near(p, lights, 4)) issues.push(`${name}: LIT: no lamp, lantern or lamppost within 4 cells`);
    const hint = msgs.some((m) => dist(p, m.at) <= 9) || objectives.some((o) => NAMES.test(o));
    if (!hint) issues.push(`${name}: HINT: no message within 9 cells and no objective that names a lever`);
  }
  // only a gate that a LEVER opens must be restated at the gate: one that opens when something dies or a place is reached is told by the objective
  const bySwitch = (src.entities ?? []).filter((q) => q.type === 'switch').flatMap((q) => q.do ?? []), exitByLever = bySwitch.some((a) => a.exit?.set === 'unlock'), doorByLever = new Set(bySwitch.flatMap((a) => (a.open ?? a.unlock ?? a.toggle) ? [(a.open ?? a.unlock ?? a.toggle).join(',')] : []));
  const gates = [...(src.entities ?? []).filter((q) => q.type === 'exit' && q.locked && exitByLever).map((q) => ({ at: q.at, name: `exit at ${q.at}` })), ...(src.doors ?? []).filter((d) => d.remote && doorByLever.has(d.at.join(','))).map((d) => ({ at: d.at, name: `remote door at ${d.at}` }))];
  for (const g of gates) { if (!msgs.some((m) => dist(g.at, m.at) <= 7 && NAMES.test(m.text))) issues.push(`${g.name}: RESTATED: no message within 7 cells that names what opens it`); }
  notes.push(`${(src.entities ?? []).filter((q) => q.type === 'switch').length} lever(s), ${gates.length} sealed gate(s), lane ${lane.size} cells`);
  console.log(`${issues.length ? 'FAIL' : 'ok  '} ${id}: ${notes.join('; ')}`); for (const i of issues) console.log('   ' + i); if (issues.length) bad++;
}
process.exit(bad ? 1 : 0);
