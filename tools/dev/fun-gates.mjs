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
process.exit(bad ? 1 : 0);
