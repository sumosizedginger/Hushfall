// Mutation runner used for A21 (auditor, not part of the game). Copies nothing by itself: create a scratch copy of the repo first (src, tests, maps, routes, validation, tools, assets, design,
// package.json, CAMPAIGN_MANIFEST.json, plus a node_modules junction), then: MUT_DIR=<copy> node mutation_runner.mjs [M01 M02 ...]. Each mutation is one textual replacement in the COPY; the full
// node:test suite runs after each; the file is restored afterwards. Never point MUT_DIR at the real repository.
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
const ROOT = process.env.ROOT_DIR ?? 'D:/Doom', MUT = process.env.MUT_DIR, LIMIT = 330000;
if (!MUT || MUT.split('\\').join('/') === ROOT) throw new Error('set MUT_DIR to a scratch copy (never the real repository)');
const muts = [
  { id: 'M01 warden plate does nothing (armor.front 0.34 -> 1)', file: 'src/engine/defs.js', from: 'armor: { front: 0.34, cos: 0.6, stunMult: 1.6 }', to: 'armor: { front: 1, cos: 0.6, stunMult: 1.6 }' },
  { id: 'M02 tone pulse ignores cover (drop hasLOS in updatePulses)', file: 'src/engine/world.js', from: ' && hasLOS(w, q.x, q.z, p.x, p.z)) { q.hit = true;', to: ') { q.hit = true;' },
  { id: 'M03 tone pulse ignores height (drop |dy|<1)', file: 'src/engine/world.js', from: ' && Math.abs(p.y - q.y) < 1.0 && hasLOS', to: ' && hasLOS' },
  { id: 'M04 enter-triggers re-fire every tick (fire-once guard dropped for enter)', file: 'src/engine/script.js', from: 'if (!st || st.fired) continue;', to: "if (!st || (st.fired && t.when !== 'enter')) continue;" },
  { id: 'M05 switch `needs` never refuses', file: 'src/engine/script.js', from: 'if (missing.length) {', to: 'if (false && missing.length) {' },
  { id: 'M06 hard enemyDamage 1.25 -> 1.0', file: 'src/engine/defs.js', from: 'hard: { name: \'Hard\', enemyHp: 1.2, enemyDamage: 1.25', to: 'hard: { name: \'Hard\', enemyHp: 1.2, enemyDamage: 1.0' },
  { id: 'M07 Sexton revive cap removed', file: 'src/engine/world.js', from: '(o.revived || 0) < S.maxRevives', to: 'true' },
  { id: 'M08 toxic residue does no damage (dps 6 -> 0)', file: 'src/engine/defs.js', from: 'dps: 6 }', to: 'dps: 0 }' },
  { id: 'M09 Cantor shield does nothing (reduce 0.05 -> 1)', file: 'src/engine/defs.js', from: 'shield: { reduce: 0.05 }', to: 'shield: { reduce: 1 }' },
  { id: 'M10 exit lock ignored', file: 'src/engine/world.js', from: 'if (near && w.exitLocked[near.id])', to: 'if (false)' },
  { id: 'M11 armour absorbs nothing', file: 'src/engine/defs.js', from: 'armorAbsorb: 0.5', to: 'armorAbsorb: 0' },
  { id: 'M12 melee ignores height difference (dyv<1.6 always true)', file: 'src/engine/world.js', from: 'if (dist < def.attack.reach && dyv < 1.6) hurtPlayer', to: 'if (dist < def.attack.reach) hurtPlayer' },
  { id: 'M13 warden crash does not stun (stun 2.6 -> 0)', file: 'src/engine/defs.js', from: 'stun: 2.6', to: 'stun: 0' },
  { id: 'M14 seal action does nothing', file: 'src/engine/script.js', from: "else if (k === 'seal') { d.sealed = true; d.target = 0; }", to: "else if (k === 'seal') { }" },
  { id: 'M15 sectors never move', file: 'src/engine/script.js', from: 'const dir = Math.sign(s.target - s.h); s.h += dir *', to: 'const dir = Math.sign(s.target - s.h); s.h += 0 * dir *' },
  { id: 'M16 enemies cannot climb (nav ignores STEP rule)', file: 'src/engine/nav.js', from: 'if (fa - cellFloor(w, nx, nz) > STEP + 1e-6) continue;', to: '' },
  { id: 'M17 sexton channel is not interrupted by damage', file: 'src/engine/world.js', from: 'if ((e.channelT ?? -1) >= 0 && dmg > 0) { e.channelT = -1;', to: 'if (false) { e.channelT = -1;' },
  { id: 'M18 dead:<group> trigger fires on ANY dead member', file: 'src/engine/script.js', from: "members.every((e) => e.state === 'dead')", to: "members.some((e) => e.state === 'dead')" },
  { id: 'M19 warden takes no extra damage while stunned (stunMult 1.6 -> 1)', file: 'src/engine/defs.js', from: 'stunMult: 1.6', to: 'stunMult: 1' },
  { id: 'M20 warden charge has no knockback (knock 3 -> 0)', file: 'src/engine/defs.js', from: 'stun: 2.6, cooldown: 3.2, knock: 3.0', to: 'stun: 2.6, cooldown: 3.2, knock: 0' },
  { id: 'M21 cantor pulse does no damage (22 -> 0)', file: 'src/engine/defs.js', from: 'pulse: { cooldown: 5.6, windup: 1.2, speed: 9.5, damage: 22', to: 'pulse: { cooldown: 5.6, windup: 1.2, speed: 9.5, damage: 0' },
  { id: 'M22 cantor never summons (max 8 -> 0)', file: 'src/engine/defs.js', from: 'every: 18, max: 8', to: 'every: 18, max: 0' }
];
const only = process.argv.slice(2), restore = (f) => fs.copyFileSync(`${ROOT}/${f}`, `${MUT}/${f}`);
const tests = fs.readdirSync(`${MUT}/tests`).filter((f) => f.endsWith('.test.js')).map((f) => 'tests/' + f);
for (const m of muts) {
  if (only.length && !only.some((o) => m.id.startsWith(o + ' '))) continue;
  restore(m.file); const s = fs.readFileSync(`${MUT}/${m.file}`, 'utf8'); if (!s.includes(m.from)) { console.log('SKIP (pattern not found):', m.id); continue; }
  fs.writeFileSync(`${MUT}/${m.file}`, s.replace(m.from, m.to));
  const t0 = Date.now(); let out = '', timedOut = false;
  await new Promise((resolve) => {
    const p = spawn(process.execPath, ['--test', '--test-reporter=spec', ...tests], { cwd: MUT });
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { timedOut = true; spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F']); }, LIMIT);
    p.on('close', () => { clearTimeout(timer); resolve(); });
  });
  restore(m.file);
  const pass = (out.match(/ℹ pass (\d+)/) || [])[1], fail = (out.match(/ℹ fail (\d+)/) || [])[1];
  const failed = [...out.matchAll(/^\s*✖ (.+?) \(/gm)].map((x) => x[1]).filter((x, i, a) => a.indexOf(x) === i).slice(0, 6);
  if (timedOut) console.log(`${m.id} => HUNG: the suite did not finish in ${LIMIT / 1000} s and was killed (an infinite loop in the mutated sim; counts as detected)`);
  else console.log(`${m.id} => pass ${pass} fail ${fail} (${((Date.now() - t0) / 1000).toFixed(0)} s)${fail === '0' ? '   <== SURVIVED (no test failed)' : ''}`);
  for (const f of failed) console.log('     x ' + f.slice(0, 120));
}
console.log('RUNNER-FINISHED');
