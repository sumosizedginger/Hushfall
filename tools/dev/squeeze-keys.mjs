// Which keys of a map hold a pair of cell-like numbers that the squeeze does not know how to move (PT-052 Level B)? The squeeze fails the compile on such a key rather than leave a coordinate behind; this lists them for the maps given, so a key can be taught once for all.
//   node tools/dev/squeeze-keys.mjs <ID> ...
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { squeezeMap } from '../mapkit/squeeze.mjs';

const root = path.resolve(import.meta.dirname, '../..'), keys = new Map();
for (const id of process.argv.slice(2)) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqk-')); spawnSync(process.execPath, [path.join(root, 'tools/mapkit/compile.mjs'), id], { cwd: root, env: { ...process.env, SQUEEZE: 'off', MAP_OUT: dir }, encoding: 'utf8' });
  const f = path.join(dir, id + '.json'); if (!fs.existsSync(f)) { console.log(id, 'does not compile'); continue; }
  for (const w of squeezeMap(JSON.parse(fs.readFileSync(f, 'utf8')), { axis: 'x', cuts: [[3, 4]] }).warnings) (keys.get(w) ?? keys.set(w, []).get(w)).push(id);
  fs.rmSync(dir, { recursive: true, force: true });
}
if (!keys.size) console.log('every pair of numbers in these maps is a key the squeeze knows (or not a cell)');
for (const [k, v] of keys) console.log(k, '<-', v.join(','));
