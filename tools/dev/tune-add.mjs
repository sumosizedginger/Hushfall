// Tries ONE MORE roster step on a map that already has a roster plan (PT-060: the Marksman and the Mender): reads `MAP.roster.plan` from the map source, appends the step(s), runs tools/dev/tune-roster.mjs on the combined plan and prints the verdict; with --apply it writes the combined plan into the
// source (then `node tools/mapkit/compile.mjs <ID>` and `npm run verify-map -- <ID>`). A map whose source has no `MAP.roster = {` line fails (reroster() maps: edit the call by hand). Node only.
//   node tools/dev/tune-add.mjs <ID> '<step json>' ['<step json>' ...] [--apply]      step = {"from":"bellhand","to":"marksman","n":1,"pick":"range"}
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..'), args = process.argv.slice(2), apply = args.includes('--apply'), [id, ...steps] = args.filter((a) => a !== '--apply');
if (!id || !steps.length) { console.error("usage: tune-add.mjs <ID> '<step json>' ... [--apply]"); process.exit(2); }
const file = path.join(root, 'maps-src', id + '.level.mjs'), src = fs.readFileSync(file, 'utf8'), m = /plan: (\[.*?\]) \};/.exec(src.split('\n').find((l) => l.startsWith('MAP.roster = {')) ?? '');
if (!m) { console.error(id + ': no `MAP.roster = { ... plan: [...] };` line'); process.exit(1); }
const plan = [...new Function("return " + m[1])(), ...steps.map((s) => ({ pick: 'range', ...JSON.parse(s) }))], text = JSON.stringify(plan);
const r = spawnSync(process.execPath, ['tools/dev/tune-roster.mjs', id, text], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const out = (r.stdout || r.stderr).split('\n').filter((l) => /^ {3}/.test(l)); console.log(id + ' plan ' + text); console.log(out.join('\n'));
const pass = out.some((l) => /gates: all pass/.test(l));
if (apply && pass) { fs.writeFileSync(file, src.replace(m[0], () => 'plan: ' + text + ' };')); console.log('APPLIED to ' + path.relative(root, file)); } else if (apply) console.log('NOT applied: the gates do not pass');
