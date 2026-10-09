// Cells a player can WALK or FALL into from which no exit can be reached (PT-024: the Pump Cathedral's east trench and bays, floor level behind the 4 m catwalk: step off the back of the catwalk and there was no way up).
// The rules are the sim's and live in src/engine/traps.js (an actor steps UP at most STEP metres and drops any distance; walls and deep water block; doors, panels and moving floors are optimistic, as reach.js is).
// Usage: node tools/dev/trap-cells.mjs [--dir=<dir>] [--props=static|all] [ID ...]      (default: every map in maps/; exit code 1 if any map has a trap; `--dir=maps-dev` reads the Range)
//        --props=static treats the cell of every blocking static prop as a wall, --props=all the movable ones too (a player without the fork cannot move them): how a crate in a doorway would show
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { findTraps } from '../../src/engine/traps.js';

const args = process.argv.slice(2), dirArg = args.find((a) => a.startsWith('--dir=')), propsArg = args.find((a) => a.startsWith('--props=')), props = propsArg ? propsArg.slice(8) : null;
const dir = dirArg ? path.resolve(dirArg.slice(6)) : path.resolve(import.meta.dirname, '../../maps');
const ids = args.filter((a) => !a.startsWith('--')), all = ids.length ? ids : fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort();
let bad = 0;
for (const id of all) {
  const r = findTraps(parseMap(JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8'))), { props });
  console.log(id.padEnd(9), r.traps ? `${r.traps} TRAPPED cells in ${r.groups.length} pocket(s)` : 'no trap', `(${r.reachable} cells reachable, ${r.exits} exit(s))`);
  for (const g of r.groups) console.log(`    pocket of ${g.cells} cell(s), x ${g.x.join('..')} z ${g.z.join('..')}, floor ${g.floor} m, entered from ${g.from.join(' ')}`);
  if (r.traps) bad++;
}
process.exit(bad ? 1 : 0);
