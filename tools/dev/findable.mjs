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
import { lintMap } from './findable-lib.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; })), ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const LANE = Number(flags.lane ?? 5), dir = flags.dir && path.isAbsolute(flags.dir) ? flags.dir : path.join(root, flags.dir ?? 'maps'), ROUTE = flags.route ?? 'main';
let bad = 0;
for (const id of ids) {
  const file = path.join(dir, id + '.json'), map = loadMapFile(file), src = JSON.parse(fs.readFileSync(file, 'utf8')), rf = path.join(root, 'routes', `${id}.${ROUTE}.route.json`);
  const lane = new Set(); if (fs.existsSync(rf)) runRoute(map, loadRouteFile(rf), { seed: 1, difficulty: 'normal', onTick: (w) => lane.add(Math.floor(w.player.x / map.cell) + ',' + Math.floor(w.player.z / map.cell)) });
  const { issues, levers, gates } = lintMap(src, [...lane].map((k) => k.split(',').map(Number)), LANE);
  console.log(`${issues.length ? 'FAIL' : 'ok  '} ${id}: ${levers} lever(s), ${gates} sealed gate(s), lane ${lane.size} cells`); for (const i of issues) console.log('   ' + i); if (issues.length) bad++;
}
process.exit(bad ? 1 : 0);
