// THE SQUEEZE OF ONE MAP, AUTOMATED (PT-052 Level B): scan both axes, write `MAP.squeeze` into the source, write the routes under the same cuts (`write-routes.mjs` when the source exports waypoints, otherwise `squeeze.mjs routes`), compile, and play every route on every difficulty
// (`route-matrix.mjs`). If the map fails to compile or a route stops completing, EVERYTHING is restored and the reason is printed. Run `rebuild-map.mjs` FIRST (the encounter pass is written in the authoring frame, the squeeze is last). Node only.
//   node tools/dev/squeeze-map.mjs <ID> [--want=24] [--axes=xz|x|z]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2), id = args.find((a) => /^C\d/.test(a)), opt = (n, d) => args.find((a) => a.startsWith('--' + n + '='))?.split('=')[1] ?? d;
if (!id) { console.error('usage: squeeze-map.mjs <ID> [--want=24] [--axes=xz]'); process.exit(2); }
const run = (a, env = {}) => spawnSync(process.execPath, a, { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 1 << 26 }), P = (...p) => path.join(root, ...p);
const srcFile = P('maps-src', id + '.level.mjs'), keep = new Map(); for (const f of [srcFile, P('maps', id + '.json'), ...fs.readdirSync(P('routes')).filter((q) => q.startsWith(id + '.')).map((q) => P('routes', q)), P('maps-src', id + '.views.json')]) if (fs.existsSync(f)) keep.set(f, fs.readFileSync(f));
const restore = () => { for (const [f, b] of keep) fs.writeFileSync(f, b); };
const original = fs.readFileSync(srcFile, 'utf8'); if (original.includes('MAP.squeeze')) { console.log(`[${id}] already squeezed`); process.exit(0); }
const want = opt('want', '24'), specs = [];
for (const ax of opt('axes', 'xz').split('')) { const r = run(['tools/mapkit/squeeze.mjs', 'scan', id, ax, '--want=' + want]), m = /cuts = (\[.*\])/.exec(r.stdout || ''), n = /(\d+) of \d+ columns picked/.exec(r.stdout || ''); if (m && JSON.parse(m[1]).length) { specs.push({ axis: ax, cuts: JSON.parse(m[1]) }); console.log(`[${id}] ${ax}: ${n?.[1]} columns`); } }
if (!specs.length) { console.log(`[${id}] nothing can be cut`); process.exit(1); }
const add = run([path.join(import.meta.dirname, 'squeeze-add.mjs'), id, JSON.stringify(specs), `A squeeze of ${specs.map((s) => s.cuts.reduce((n, [a, b]) => n + b - a, 0) + ' ' + (s.axis === 'x' ? 'columns' : 'rows')).join(' and ')}, where nothing stands and no stair runs (tools/dev/squeeze-map.mjs).`]);
if (add.status !== 0) { restore(); console.log(add.stderr || add.stdout); process.exit(1); }
const hasWaypoints = /export const waypoints/.test(original), rr = hasWaypoints ? run(['tools/dev/write-routes.mjs', id]) : run(['tools/mapkit/squeeze.mjs', 'routes', id]);
const c = run(['tools/mapkit/compile.mjs', id]); if (c.status !== 0) { restore(); console.log(`[${id}] COMPILE FAILED, restored: ${(c.stderr || c.stdout).split('\n').filter((l) => /FAIL|rror|squeeze|switch|panel/.test(l)).slice(0, 3).join(' | ')}`); process.exit(1); }
const rm = run(['tools/dev/route-matrix.mjs', id]), lines = (rm.stdout || '').split('\n').filter(Boolean); console.log(lines.join('\n'));
const failed = lines.filter((l) => /^C[A-Z0-9]+ [a-z]+ +(easy|normal|hard) /.test(l)).filter((l) => [...l.replace(/^[^ ]+ +[^ ]+ +[^ ]+ +/, '').matchAll(/([cbd][0-9]+)(?:[/]([cbd][0-9]+))?/g)].some((m) => (m[2] ?? m[1])[0] !== 'c'));
if (failed.length) { console.log(`[${id}] a seed is completed by neither fighter on: ${failed.map((l) => l.split(/ +/).slice(1, 3).join(' ')).join(', ')}: RESTORED`); restore(); process.exit(1); }
console.log(`[${id}] squeezed; run verify-map next`);
