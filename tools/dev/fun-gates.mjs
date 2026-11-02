// PT-081: the node gates of a batch of maps in one go: map-check (determinism, every message delivered, only the secret route finds the secrets) and verify-map (every route on three difficulties, viability,
// ammunition, robustness, placement, traps), one line a map plus every node failure. The real-game checks (browser evidence) are left out: they wait for the one regeneration.
//   node tools/dev/fun-gates.mjs <ID> [<ID> ...]          exit code 1 when any map has a node failure
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), ids = process.argv.slice(2); let bad = 0;
for (const id of ids) {
  let mc = ''; try { mc = execFileSync(process.execPath, ['tools/dev/map-check.mjs', id], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { mc = String(e.stdout ?? '') + String(e.stderr ?? ''); }
  try { execFileSync(process.execPath, ['tools/verify-map.mjs', id], { cwd: root, stdio: 'ignore' }); } catch { /* the evidence file says what failed */ }
  const v = JSON.parse(fs.readFileSync(path.join(root, 'validation', 'maps', id + '.json'), 'utf8'));
  const fails = [...mc.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => l.replace(/^FAIL \S+ /, 'map-check: ')), ...v.automated.checks.filter((c) => c.pass === false && !/real-game|browser check|THIS map/.test(c.name ?? '')).map((c) => (c.name ?? '').slice(0, 140) + (c.detail ? ' | ' + String(c.detail).slice(0, 160) : ''))];
  console.log(`${fails.length ? 'FAIL' : 'PASS'} ${id}${fails.length ? '' : ' (every node gate)'}`); for (const f of fails) console.log('   ' + f);
  if (fails.length) bad++;
}
// PT-082: the strict per-map tests of tests/maps.test.js (the gate-skip probe, ammunition on Hard, the robustness runs judged as the suite judges them) failed where verify-map passed, more than once: run them too
if (!process.env.NO_STRICT) {
  let out = ''; try { out = execFileSync(process.execPath, ['--test', 'tests/maps.test.js'], { cwd: root, encoding: 'utf8', env: { ...process.env, MAPS: ids.join(',') }, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
  const failed = out.split('\n').filter((l) => /^✖ /.test(l) && !/failing tests/.test(l)), uniq = [...new Set(failed)];
  console.log(uniq.length ? 'STRICT FAIL' : 'STRICT PASS (tests/maps.test.js)'); for (const l of uniq) console.log('   ' + l.replace(/ \(\d+(\.\d+)?ms\)$/, ''));
  for (const l of out.split('\n').filter((q) => /AssertionError/.test(q))) console.log('     ' + l.trim().slice(0, 220));
  if (uniq.length) bad++;
}
process.exit(bad ? 1 : 0);
