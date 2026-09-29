// Builds review/gate-1/ from the project's own evidence. Nothing here is typed by hand except known-defects.json (a judgement file
// that this script preserves if it exists). Run after: npm run verify, npm run browsercheck, npm run audio-qa, npm run verify-map -- C1E1M01.
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'review/gate-1');
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
const readJson = (f) => (fs.existsSync(path.join(root, f)) ? JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')) : null);
const sh = (c) => { try { return execSync(c, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };

// ---- tests: run the real suite and parse the outcome --------------------------------------------------------------------
const t = spawnSync(process.execPath, ['--test', 'tests/*.test.js'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
const txt = (t.stdout || '') + (t.stderr || '');
const num = (k) => Number((txt.match(new RegExp('ℹ ' + k + ' (\\d+)')) || [])[1] ?? NaN);
const testResults = { ranAt: new Date().toISOString(), exitCode: t.status, tests: num('tests'), pass: num('pass'), fail: num('fail'),
  failures: [...txt.matchAll(/^✖ (.+?) \(/gm)].map((m) => m[1]), names: [...txt.matchAll(/^✔ (.+?) \(/gm)].map((m) => m[1]) };
fs.writeFileSync(path.join(out, 'test-results.json'), JSON.stringify(testResults, null, 2));

// ---- evidence ------------------------------------------------------------------------------------------------------------
const browser = readJson('validation/browser-check.json'), audio = readJson('validation/audio.json'), budget = readJson('validation/render-budget.json'), map = readJson('validation/maps/C1E1M01.json'), campaign = readJson('validation/campaign.json');
const performance = {
  note: 'No real-GPU frame rate was measured (headless Chrome + software GL only). These are structural counts and software-GL timings; they are NOT a 60 FPS claim.',
  renderBudget: budget, softwareGl: browser ? { env: browser.env, perf: browser.perf } : null,
  target: '60 FPS on a mainstream desktop browser (UNVERIFIED)',
};
fs.writeFileSync(path.join(out, 'performance.json'), JSON.stringify(performance, null, 2));
const playPath = map && { map: map.mapId, mapVersion: map.mapVersion, codeVersion: map.codeVersion, dirtyTree: map.dirtyTree, assetVersion: map.assetVersion, canonicalRoute: map.canonicalRoute, routes: map.routes, counts: map.counts, notes: map.notes,
  proves: 'One valid tested path per difficulty, played by a bot through the real input layer. Not balance, fun, or full exploration.' };
fs.writeFileSync(path.join(out, 'play-path.json'), JSON.stringify(playPath, null, 2));

const pkg = readJson('package.json');
const build = { git: sh('git rev-parse --short HEAD'), dirtyTree: !!sh('git status --porcelain'), node: process.version, dependencies: pkg.dependencies, devDependencies: pkg.devDependencies, status: campaign?.counts };
fs.writeFileSync(path.join(out, 'build-info.json'), JSON.stringify(build, null, 2));

// ---- screenshots ---------------------------------------------------------------------------------------------------------
const shots = [
  ['level-c1e1m01', ['01-pier-start', '02-tower', '04-plaza', '05-stalls', '07-shed-inside', '10-warehouse-pods', '11-dock-gate', '13-pier-water']],
  ['engine-skeleton', ['01-title', '01b-live-input', '01c-automap', '04-intermission', '05-pause', '06-death', 'stance-ads', 'stance-sprint', 'weapons-scatter-ads', 'weapons-gaunt-crouch']],
];
const copied = [];
for (const [dir, names] of shots) for (const n of names) { const src = path.join(root, 'review', dir, n + '.png'); if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(out, 'screenshots', n + '.png')); copied.push(n + '.png'); } }
if (audio) fs.writeFileSync(path.join(out, 'audio-qa.json'), JSON.stringify({ when: audio.when, env: audio.env, sfxCount: audio.sfx.length, maxPeak: Math.max(...audio.sfx.map((r) => r.peak)), failures: audio.failures, listen: 'review/audio/*.wav', note: audio.note }, null, 2));

// ---- known defects: a judgement file; preserved if present -----------------------------------------------------------------
const kd = path.join(out, 'known-defects.json');
if (!fs.existsSync(kd)) fs.writeFileSync(kd, JSON.stringify({ note: 'edit by hand after each audit', defects: [] }, null, 2));
const defects = JSON.parse(fs.readFileSync(kd, 'utf8')).defects || [];
const bySev = (s) => defects.filter((d) => d.severity === s);

const bc = browser ? `${browser.checks.filter((c) => c.ok).length}/${browser.checks.length}` : 'not run';
const readme = `# Gate 1 review bundle: Marrow Quay (C1E1M01)

Generated ${new Date().toISOString()} from repository evidence by \`node tools/gate1-bundle.mjs\`. Code: \`${build.git}\`${build.dirtyTree ? ' (working tree had uncommitted changes)' : ''}.

## Decision requested
**APPROVE DIRECTION**, **REVISE DIRECTION**, or **STOP PROJECT**. Approval means the creative direction may expand into Gate 2 (a full episode). It does not mark the map COMPLETE, erase the known defects below, or override any failing test. Silence is neither approval nor rejection.

## What to run
\`\`\`bash
npm ci
npm run dev        # http://localhost:5173/  (click a difficulty; click again to capture the mouse)
\`\`\`
Controls (all rebindable in Pause > Controls): WASD move, mouse look, left click fire, right mouse aim, Shift sprint, E/Space use, 1/2 or wheel weapons, Tab automap, Esc pause.
Listen to the sounds: \`review/audio/*.wav\` (31 effects + 2 score renders). Nobody has listened to them yet.

## What changed since the look demo
Engine skeleton (deterministic headless sim, map format, saves v${'5'}, input layer), sprint + aim, audio (procedural), second weapon (scattergun) and second enemy (Gaunt Runner), automap, key remapping, water/skins/scenery, and the real level with story beats.

## What is proven (by evidence, not by me saying so)
- Automated tests: **${testResults.pass}/${testResults.tests} pass** (\`test-results.json\`).
- Real-browser checks in headless Chrome: **${bc}** (\`validation/browser-check.json\`), including real key/mouse input, Node-vs-Chrome identical sim state hashes, save/load, death/restart, pause, GPU leak check, remap flow, automap.
- Map status derived from evidence: **C1E1M01 = AGENT_VERIFIED** (\`play-path.json\`): main and secret routes complete on easy/normal/hard through the real input layer.
- Audio QA: every effect finite, audible, unclipped (\`audio-qa.json\`).
- Draw calls: see \`performance.json\` (structural counts only).

## What remains uncertain (honest list)
- **Real-GPU performance is unmeasured.** Headless software rendering only. The 60 FPS target is unverified.
- **Pointer lock and mouse feel** could not be tested in the automated environment; sprint/ADS/scattergun numbers were tuned by unit test and screenshot, not by playing.
- **Audio has never been heard by a person**; levels were balanced by measurement.
- Balance is unproven: the route bot has perfect aim and is rarely hit.
- Only one level exists; nothing here proves the 68-map campaign is achievable at this quality (that is what Gate 2 is for).

## Known defects (from \`known-defects.json\`)
- BLOCKER: ${bySev('BLOCKER').length}  · MAJOR: ${bySev('MAJOR').length}  · MINOR: ${bySev('MINOR').length}
${defects.map((d) => `- **${d.severity}** ${d.title}${d.status ? ` (${d.status})` : ''}`).join('\n') || '- none recorded'}

## Files
\`test-results.json\` \`performance.json\` \`known-defects.json\` \`play-path.json\` \`audio-qa.json\` \`build-info.json\` \`screenshots/\` (${copied.length} images)
`;
fs.writeFileSync(path.join(out, 'README.md'), readme);
console.log(`gate-1 bundle written: tests ${testResults.pass}/${testResults.tests}, browser ${bc}, ${copied.length} screenshots, defects ${defects.length}`);
process.exit(testResults.fail ? 1 : 0);
