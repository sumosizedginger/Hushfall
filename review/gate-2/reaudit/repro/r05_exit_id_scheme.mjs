// R05: exit id schemes disagree. MapData (mapformat.js:48) names an id-less exit 'exit' + (index among ALL exit entities); validateKit (mapformat.js:~267) names it 'exit' + (count of id-less exits so far).
// With one explicit-id exit before an id-less locked exit the validator looks for an unlock aimed at 'exit0' while the sim's exit is 'exit1'. Two consequences, both shown here on a copy of C1E1M07:
//   (a) a VALID map (the radio switch unlocks {id:'exit1'}, exactly the id the sim uses) is REJECTED;
//   (b) the same map with the unlock aimed at the WRONG id ('exit0', which the sim assigns to the other exit) is ACCEPTED although the locked exit can then never be unlocked.
// Run from repo root: node review/gate-2/reaudit/repro/r05_exit_id_scheme.mjs
import fs from 'node:fs';
import { validateMap, parseMap } from '../../../../src/engine/mapformat.js';
import { createWorld, step } from '../../../../src/engine/world.js';
const base = JSON.parse(fs.readFileSync('maps/C1E1M07.json', 'utf8'));
const make = (unlockId) => {
  const m = JSON.parse(JSON.stringify(base));
  const spawn = m.entities.find((e) => e.type === 'player').at;
  // an extra, unlocked exit with an explicit id, listed BEFORE the locked one; put it on a floor cell next to the spawn
  const c = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [spawn[0] + dx, spawn[1] + dz]).find(([x, z]) => m.grid[z][x] === '.' || m.grid[z][x] === ':');
  const firstExit = m.entities.findIndex((e) => e.type === 'exit');
  m.entities.splice(firstExit, 0, { type: 'exit', id: 'side', dest: 'next', at: c });
  for (const e of m.entities) if (e.type === 'switch') for (const a of e.do) if (a.exit) a.exit.id = unlockId;
  return m;
};
for (const id of ['exit1', 'exit0']) {
  const m = make(id), v = validateMap(m);
  let sim = '-';
  if (v.ok) { const w = createWorld(parseMap(m)); sim = 'sim exit ids: ' + JSON.stringify(Object.entries(w.exitLocked)) + ' (the locked one is the id-less exit)'; }
  console.log(`unlock aimed at '${id}' (sim's id for the locked, id-less exit is 'exit1'):`, v.ok ? 'validateMap ACCEPTS' : 'validateMap REJECTS: ' + v.errors[0], '|', sim);
}
