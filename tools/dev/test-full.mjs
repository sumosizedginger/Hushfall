// `npm run test:full` and `npm run verify`: the whole suite with the slow sweeps on (FULL_AUDIT=1: the floor-truth test casts its rays over all 68 maps instead of the six-map smoke sample). `npm test` stays the fast run.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const r = spawnSync(process.execPath, ['--test', 'tests/*.test.js'], { cwd: root, stdio: 'inherit', env: { ...process.env, FULL_AUDIT: '1' } });
process.exit(r.status ?? 1);
