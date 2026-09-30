// R16: the repairs changed the content of maps M05, M06, M07 and M08 but left each map's `version` at 1, and save.js decides between "resume mid-level" and "fall back to level start" ONLY by comparing that integer.
// A mid-level save made by the PRE-repair build (f79bf59) therefore loads into the repaired map with the old world state. Demonstration on M07: the old world has TWO exits (exit0 unlocked from the duplicate '>' glyph, exit1 locked);
// the repaired map has one locked exit called exit0, yet the old save's exitLocked {exit0:false, exit1:true} is restored verbatim, so the fuse gate is open again in that save (audit A01 resurrected through a save).
// Usage: node r16_old_save_into_repaired_map.mjs <preRepairRoot>       (a scratch copy of f79bf59: git archive f79bf59 src maps routes package.json | tar -x -C <dir>)
// Run from the repo root so that the repaired tree is the current directory.
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const oldRoot = path.resolve(process.argv[2] ?? '');
const O = { H: await import(pathToFileURL(path.join(oldRoot, 'src/engine/harness.js')).href), W: await import(pathToFileURL(path.join(oldRoot, 'src/engine/world.js')).href), S: await import(pathToFileURL(path.join(oldRoot, 'src/engine/save.js')).href) };
import { loadMapFile } from '../../../../src/engine/harness.js';
import { parseSave, loadWorld } from '../../../../src/engine/save.js';
import { step } from '../../../../src/engine/world.js';
for (const id of ['C1E1M07', 'C1E1M08', 'C1E1M05']) {
  const oldMap = O.H.loadMapFile(path.join(oldRoot, 'maps', id + '.json')), newMap = loadMapFile(`maps/${id}.json`);
  const w = O.W.createWorld(oldMap, { seed: 1, difficulty: 'normal' }); for (let i = 0; i < 30; i++) O.W.step(w, { move: [0, 0], yaw: 0, pitch: 0 });
  const text = JSON.stringify(O.S.makeSave(w, 'mid-level', { now: 5 }));
  const parsed = parseSave(text); const r = parsed.ok ? loadWorld(parsed.save, () => newMap) : parsed;
  console.log(id, 'map versions old/new:', oldMap.version, newMap.version, '| old exits', JSON.stringify(Object.keys(w.exitLocked)), '-> loaded into the repaired map:', r.ok ? (r.degraded ?? 'resumed mid-level (old world state kept)') : 'REJECTED ' + r.reason + ' ' + r.detail, r.ok ? '| exitLocked ' + JSON.stringify(r.world.exitLocked) : '');
  if (r.ok && id === 'C1E1M07') { const lw = r.world; lw.player.x = newMap.exits[0].x; lw.player.z = newMap.exits[0].z; lw.player.y = 0; step(lw, { move: [0, 0], yaw: 0, pitch: 0 }); console.log('   standing on the exit with no fuses after loading the old save: status =', lw.status); }
}
