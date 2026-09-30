// R09: mutation runner for the re-audit (auditor tool, not part of the game). It needs a PRISTINE scratch copy of HEAD (PRISTINE_DIR) and a second scratch copy (MUT_DIR) that it mutates and restores;
// both must contain src/, tests/, tools/, maps/, routes/, validation/, assets/, design/, package.json, CAMPAIGN_MANIFEST.json and a node_modules junction. NEVER point either at the real repository.
// Each mutation = textual replacements in MUT_DIR, then `node --test <relevant test files>`; SURVIVED = no test failed.
// Usage: PRISTINE_DIR=... MUT_DIR=... [ALL_TESTS=1] node r09_mutation_runner.mjs [id ...]   (ids: X1..X19 = mutations of the repairs, M11.. = the first audit's survivors)
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
const PRISTINE = process.env.PRISTINE_DIR, MUT = process.env.MUT_DIR, LIMIT = 400000;
if (!PRISTINE || !MUT) throw new Error('set PRISTINE_DIR and MUT_DIR to scratch copies');
if (/^[a-z]:[\\/]+doom[\\/]?$/i.test(MUT) || /^[a-z]:[\\/]+doom[\\/]?$/i.test(PRISTINE)) throw new Error('never point at the real repository');
const KIT = ['tests/kit.test.js'], ELITE = ['tests/elites.test.js', 'tests/kit.test.js', 'tests/sim.test.js'];
const muts = [
  // ---- the repairs
  { id: 'X1 arrival floor removed (carry is used as is)', tests: ['tests/chain.test.js', 'tests/sim.test.js', 'tests/ai.test.js', 'tests/save.test.js'], edits: [['src/engine/world.js', 'carry = arrivalInventory(carry, map.entryLoadout ?? null);', 'carry = carry ?? map.entryLoadout ?? null;']] },
  { id: 'X2 tryMove back to the end-point-only test', tests: [...KIT, 'tests/elites.test.js', 'tests/weapons.test.js', 'tests/ai.test.js'], edits: [['src/engine/world.js', 'const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.25)), sx = dx / n, sz = dz / n;', 'const n = 1, sx = dx, sz = dz;']] },
  { id: 'X3 gateSkip always returns no findings', tests: KIT, edits: [['src/engine/viability.js', 'export function gateSkip(map) {', 'export function gateSkip(map) { return [];']] },
  { id: 'X4 navVersion is a constant (fields never refresh)', tests: [...KIT, 'tests/ai.test.js'], edits: [['src/engine/nav.js', 'function navVersion(w) {', 'function navVersion(w) { return "";']] },
  { id: 'X5 duplicate-exit-cell check removed', tests: KIT, edits: [['src/engine/mapformat.js', 'if (exitCells.has(k)) err(', 'if (false) err(']] },
  { id: 'X6 undriven-sector check removed', tests: KIT, edits: [['src/engine/mapformat.js', 'if (!drivenSectors.has(id)) err(', 'if (false) err(']] },
  { id: 'X7 last-resort flare feed removed', tests: KIT, edits: [['src/engine/world.js', 'if (p.feedT >= PLAYER.dryFeed.every)', 'if (false)']] },
  { id: 'X8 locked-exit-needs-an-unlock check removed', tests: KIT, edits: [['src/engine/mapformat.js', 'if (!unlocks) err(', 'if (false) err(']] },
  { id: 'X9 switch-needs-an-item-that-exists check removed', tests: KIT, edits: [['src/engine/mapformat.js', "if (KEYS[k] && !ents.some(", "if (false && KEYS[k] && !ents.some("]] },
  { id: 'X10 worldShapeErrors never rejects (save structure check removed)', tests: [...KIT, 'tests/save.test.js'], edits: [['src/engine/save.js', 'if (shape.length) return', 'if (false) return']] },
  { id: 'X11 engine-hash staleness check removed (validate.mjs)', tests: ['tests/campaign.test.js'], edits: [['tools/validate.mjs', "if (ev.engineSha && fs.existsSync(path.join(root, 'src/engine'))) {", "if (false) {"]] },
  { id: 'X12 pickups no longer follow moving floors', tests: KIT, edits: [['src/engine/world.js', 'if (w.sectors.length) for (const it of w.pickups) it.y = floorAt(w, it.x, it.z);', '']] },
  { id: 'X13 switch reach uses the creation height again', tests: KIT, edits: [['src/engine/world.js', 'Math.abs(floorAt(w, sw.x, sw.z) - p.y) < 1.5', 'Math.abs(sw.fy - p.y) < 1.5']] },
  { id: 'X14 robustness: ammoScale ignored (pickups not degraded)', tests: ['tests/maps.test.js'], edits: [['src/engine/world.js', '(w.ammoScale ?? 1)', '1']] },
  { id: 'X15 robustness: tremor ignored', tests: ['tests/maps.test.js'], edits: [['src/engine/harness.js', 'if (tremor) {', 'if (false) {']] },
  { id: 'X16 gate check accepts a completed exit run (ok: true)', tests: ['tests/maps.test.js'], edits: [['src/engine/viability.js', "ok: g.result !== 'complete', detail: ''", 'ok: true, detail: ""']] },
  { id: 'X17 ammo slack rule 1.5x -> 0.05x', tests: ['tests/maps.test.js'], edits: [['src/engine/viability.js', 'v[d].ammo.capacity >= v[d].ammo.fired * 1.5', 'v[d].ammo.capacity >= v[d].ammo.fired * 0.05']] },
  { id: 'X18 weave bot does not weave (weave option ignored)', tests: ['tests/maps.test.js'], edits: [['src/engine/bot.js', 'this.weave = weave;', 'this.weave = false;']] },
  { id: 'X19 pulses removed from saves (worldShapeErrors ok, pulses dropped on load)', tests: ['tests/elites.test.js'], edits: [['src/engine/save.js', 'Object.assign(w, snap);', 'Object.assign(w, snap); w.pulses = [];']] },
  // ---- the seven survivors the first audit named (M11 M13 M14 M18 M19 M20 M21)
  { id: 'M11 armour absorbs nothing', tests: ELITE, edits: [['src/engine/defs.js', 'armorAbsorb: 0.5', 'armorAbsorb: 0']] },
  { id: 'M13 warden crash does not stun', tests: ELITE, edits: [['src/engine/defs.js', 'stun: 2.6', 'stun: 0']] },
  { id: 'M14 seal action does nothing', tests: ELITE, edits: [['src/engine/script.js', "else if (k === 'seal') { d.sealed = true; d.target = 0; }", "else if (k === 'seal') { }"]] },
  { id: 'M18 dead:<group> fires on ANY dead member', tests: ELITE, edits: [['src/engine/script.js', "members.every((e) => e.state === 'dead')", "members.some((e) => e.state === 'dead')"]] },
  { id: 'M19 warden takes no extra damage while stunned', tests: ELITE, edits: [['src/engine/defs.js', 'stunMult: 1.6', 'stunMult: 1']] },
  { id: 'M20 warden charge has no knockback', tests: ELITE, edits: [['src/engine/defs.js', 'stun: 2.6, cooldown: 3.2, knock: 3.0', 'stun: 2.6, cooldown: 3.2, knock: 0']] },
  { id: 'M21 cantor pulse does no damage', tests: ELITE, edits: [['src/engine/defs.js', 'pulse: { cooldown: 5.6, windup: 1.2, speed: 9.5, damage: 22', 'pulse: { cooldown: 5.6, windup: 1.2, speed: 9.5, damage: 0']] },
  { id: 'M12 melee ignores height difference', tests: ELITE, edits: [['src/engine/world.js', 'if (dist < def.attack.reach && dyv < 1.6) hurtPlayer', 'if (dist < def.attack.reach) hurtPlayer']] },
];
const ALL = !!process.env.ALL_TESTS;   // ALL_TESTS=1: run the whole suite for every selected mutation instead of the relevant files
const allTests = () => fs.readdirSync(`${MUT}/tests`).filter((f) => f.endsWith('.test.js')).map((f) => 'tests/' + f);
const only = process.argv.slice(2), files = [...new Set(muts.flatMap((m) => m.edits.map((e) => e[0])))];
const restore = () => { for (const f of files) fs.copyFileSync(`${PRISTINE}/${f}`, `${MUT}/${f}`); };
restore();
for (const m of muts) {
  if (only.length && !only.some((o) => m.id.split(' ')[0] === o)) continue;
  restore(); let ok = true;
  for (const [f, from, to] of m.edits) { const s = fs.readFileSync(`${MUT}/${f}`, 'utf8'); if (!s.includes(from)) { ok = false; break; } fs.writeFileSync(`${MUT}/${f}`, s.split(from).join(to)); }
  if (!ok) { console.log('SKIP (pattern not found):', m.id); continue; }
  const t0 = Date.now(); let out = '', timedOut = false;
  await new Promise((resolve) => {
    const p = spawn(process.execPath, ['--test', '--test-reporter=spec', ...(ALL ? allTests() : m.tests)], { cwd: MUT });
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { timedOut = true; spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F']); }, LIMIT);
    p.on('close', () => { clearTimeout(timer); resolve(); });
  });
  restore();
  const pass = (out.match(/ℹ pass (\d+)/) || [])[1], fail = (out.match(/ℹ fail (\d+)/) || [])[1];
  const failed = [...out.matchAll(/^\s*✖ (.+?) \(/gm)].map((x) => x[1]).filter((x, i, a) => a.indexOf(x) === i).slice(0, 4);
  console.log(`${m.id} [${ALL ? 'all' : m.tests.length} test file(s)] => ${timedOut ? 'HUNG (counts as detected)' : `pass ${pass} fail ${fail}`} (${((Date.now() - t0) / 1000).toFixed(0)} s)${fail === '0' ? '   <== SURVIVED' : ''}`);
  for (const f of failed) console.log('     x ' + f.slice(0, 140));
}
console.log('RUNNER-FINISHED');
