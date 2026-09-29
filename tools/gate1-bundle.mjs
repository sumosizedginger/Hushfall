// Builds review/gate-1/ from the project's own evidence. Nothing is typed by hand except known-defects.json (a judgement file that
// this script never overwrites). Facts in the README (status, counts, save version, provenance) are READ from evidence files.
// Run after: npm run verify, npm run browsercheck, npm run audio-qa, npm run shoot-level, npm run shoot-stances, npm run verify-map -- C1E1M01.
// Exit codes: 0 ok, 1 tests failed, 2 the defect list is missing/empty (the bundle would be dishonest), 3 evidence is from a different commit than the code.
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'review/gate-1');
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
const readJson = (f) => (fs.existsSync(path.join(root, f)) ? JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')) : null);
const sh = (c) => { try { return execSync(c, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };
const { SAVE_VERSION } = await import(pathToFileURL(path.join(root, 'src/engine/save.js')).href);

// ---- code identity: evidence files may churn, source may not ---------------------------------------------------------------
const head = sh('git rev-parse --short HEAD'), dirtySource = !!sh("git status --porcelain -- . ':!review' ':!validation'");

// ---- tests: run the real suite and parse the outcome ----------------------------------------------------------------------
const t = spawnSync(process.execPath, ['--test', 'tests/*.test.js'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
const txt = (t.stdout || '') + (t.stderr || '');
const num = (k) => Number((txt.match(new RegExp('ℹ ' + k + ' (\\d+)')) || [])[1] ?? NaN);
const testResults = { ranAt: new Date().toISOString(), codeCommit: head, exitCode: t.status, tests: num('tests'), pass: num('pass'), fail: num('fail'),
  failures: [...txt.matchAll(/^✖ (.+?) \(/gm)].map((m) => m[1]), names: [...txt.matchAll(/^✔ (.+?) \(/gm)].map((m) => m[1]) };
fs.writeFileSync(path.join(out, 'test-results.json'), JSON.stringify(testResults, null, 2));

// ---- evidence + provenance ------------------------------------------------------------------------------------------------
const browser = readJson('validation/browser-check.json'), audio = readJson('validation/audio.json'), budget = readJson('validation/render-budget.json'), baseline = readJson('validation/render-budget-baseline.json');
const map = readJson('validation/maps/C1E1M01.json'), campaign = readJson('validation/campaign.json');
const stamps = { code: head, browserCheck: browser?.commit ?? 'unstamped', mapEvidence: map?.codeVersion ?? 'unstamped', audioQa: audio?.commit ?? 'unstamped' };
const stale = Object.entries(stamps).filter(([k, v]) => k !== 'code' && v !== head);
const status = campaign?.perMap?.C1E1M01 ?? 'unknown';

const performance = {
  note: 'No real-GPU frame rate was measured (headless Chrome + software GL only). Counts are structural; timings are software-GL and UNCLAMPED; neither is a 60 FPS claim.',
  renderBudget: budget, baseline: baseline?.budget ?? null, softwareGl: browser ? { env: browser.env, perf: browser.perf } : null,
  target: '60 FPS on a mainstream desktop browser (UNVERIFIED)',
};
fs.writeFileSync(path.join(out, 'performance.json'), JSON.stringify(performance, null, 2));
const playPath = map && { map: map.mapId, mapVersion: map.mapVersion, codeVersion: map.codeVersion, dirtySource: map.dirtySource, assetVersion: map.assetVersion, canonicalRoute: map.canonicalRoute, routes: map.routes, viability: map.viability, counts: map.counts, notes: map.notes,
  proves: 'One valid tested path per difficulty, played by a bot through the real input layer, plus a passive runner that must NOT get through. Not balance, fun, or full exploration.' };
fs.writeFileSync(path.join(out, 'play-path.json'), JSON.stringify(playPath, null, 2));
const pkg = readJson('package.json');
fs.writeFileSync(path.join(out, 'build-info.json'), JSON.stringify({ git: head, dirtySource, node: process.version, dependencies: pkg.dependencies, devDependencies: pkg.devDependencies, status: campaign?.counts, evidenceStamps: stamps }, null, 2));

// ---- screenshots (all from tools that clear overlays: what a player sees) ----------------------------------------------------
const shots = [
  ['level-c1e1m01', ['01-pier-start', '02-tower', '03-boats', '04-plaza', '05-stalls', '06-shed-door', '07-shed-inside', '08-hut', '09-warehouse-entry', '10-warehouse-pods', '11-dock-gate', '12a-secret-tell', '12b-net-loft', '13-pier-water']],
  ['engine-skeleton', ['01-title', '05-pause', '05b-pause-800x600', '06-death', '01c-automap', '04-intermission', 'stance-hip', 'stance-ads', 'stance-sprint', 'weapons-scatter-ads', 'weapons-gaunt-crouch']],
];
const copied = [], missing = [];
for (const [dir, names] of shots) for (const n of names) { const src = path.join(root, 'review', dir, n + '.png'); if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(out, 'screenshots', n + '.png')); copied.push(n + '.png'); } else missing.push(dir + '/' + n + '.png'); }
if (audio) fs.writeFileSync(path.join(out, 'audio-qa.json'), JSON.stringify({ when: audio.when, env: audio.env, sfxCount: audio.sfx.length, maxPeak: Math.max(...audio.sfx.map((r) => r.peak)), failures: audio.failures, listen: 'review/audio/*.wav', scope: 'each effect rendered ALONE offline: finite, non-silent, peak below full scale. Mixed output (master chain, overlapping sounds, music vs effects) is NOT measured.', note: audio.note }, null, 2));

// ---- known defects: a judgement file, never overwritten ----------------------------------------------------------------------
const kd = path.join(out, 'known-defects.json');
const kdJson = fs.existsSync(kd) ? JSON.parse(fs.readFileSync(kd, 'utf8')) : null;
const defects = kdJson?.defects ?? [];
const open = defects.filter((d) => d.status !== 'fixed'), sev = (s, list = open) => list.filter((d) => d.severity === s);
const line = (d) => `- **${d.severity}** [${d.status}] ${d.title}${d.remaining ? ` — remaining: ${d.remaining}` : ''}`;

const bc = browser ? `${browser.checks.filter((c) => c.ok).length}/${browser.checks.length}` : 'not run';
const readme = `# Gate 1 review bundle: Marrow Quay (C1E1M01)

Generated ${new Date().toISOString()} by \`node tools/gate1-bundle.mjs\` from repository evidence. Code: \`${head}\`${dirtySource ? ' **(source tree had uncommitted changes)**' : ''}.
${stale.length ? `\n> **Provenance warning:** these evidence files were generated from a different commit than the code above: ${stale.map(([k, v]) => `${k} = ${v}`).join(', ')}. Regenerate them before trusting this bundle.\n` : `\nEvidence provenance: browser check, map evidence and audio QA are all stamped with the same commit as the code (\`${head}\`).\n`}
## Decision requested
**APPROVE DIRECTION**, **REVISE DIRECTION**, or **STOP PROJECT**. Approval means the creative direction may expand into Gate 2 (a full episode). It does not mark the map COMPLETE, erase the known defects below, or override any failing test. Silence is neither approval nor rejection.

## Two ways to look
- **Screenshots** (\`screenshots/\`, ${copied.length} images): appearance only. Each was taken with the title card and transmissions cleared, from a position a player can stand in.${missing.length ? ` Missing: ${missing.join(', ')}.` : ''}
- **Play it:**
\`\`\`bash
npm ci
npm run dev        # http://localhost:5173/  (click a difficulty; click the game once to capture the mouse)
\`\`\`
Controls (all rebindable in Pause > Controls): WASD move, mouse look, left click fire, right mouse aim, Shift sprint, E/Space use, 1/2 or wheel weapons, Tab automap, F5/F9 quick save/load, Esc pause. Listen: \`review/audio/*.wav\` (nobody has yet).

## Where the campaign stands (read from validation/campaign.json)
C1E1M01 derived status: **${status}**. PLANNED ${campaign?.counts?.PLANNED ?? '?'} / IMPLEMENTED ${campaign?.counts?.IMPLEMENTED ?? '?'} / AGENT_VERIFIED ${campaign?.counts?.AGENT_VERIFIED ?? '?'} / COMPLETE ${campaign?.counts?.COMPLETE ?? '?'} of 68. Agents cannot award COMPLETE.

## What exists
Deterministic headless sim; map format; saves (v${SAVE_VERSION}, migrations from v1); input layer with remapping, sprint and aim-down-sights; procedural audio; two weapons (flare cannon, scattergun); three enemies (Tollbearer, Gaunt Runner, Bellhand: hunting AI, wake/alert/noise, cover, ranged toll-shot); automap; water/skins/scenery; one real level with story beats, a secret, a keyed door and a par time.

## What is proven (by evidence)
- Automated tests: **${testResults.pass}/${testResults.tests} pass** (\`test-results.json\`).
- Real-browser checks in headless Chrome: **${bc}** (\`validation/browser-check.json\`): real key/mouse input, an un-teleported walk that delivers the opening transmissions in order, prompts, quick save/load, pause layout at four window sizes, WebGL-unavailable handling, Node-vs-Chrome identical state hashes, save/load, death/restart, remap flow, automap, GPU-leak check.
- Level viability (\`play-path.json\`): a passive runner that never fires ${map?.viability ? `ends ${['easy', 'normal', 'hard'].map((d) => `${d}: ${map.viability[d].runner.result} (${map.viability[d].runner.damage} damage)`).join(', ')}` : '(no evidence)'}; a perfect fighter completes on every difficulty taking ${map?.viability ? ['easy', 'normal', 'hard'].map((d) => `${map.viability[d].fighter.damage}`).join('/') : '?'} damage (easy/normal/hard).
- Audio QA: each effect rendered alone is finite, non-silent and below full scale (\`audio-qa.json\`). It does NOT measure the mixed output.
- Draw calls and triangles at five vantage points, including all-enemies-awake, are compared with a recorded baseline (\`performance.json\`). Structural counts only.

## What remains uncertain (honest list)
${['- **Real-GPU performance is unmeasured.** Headless software rendering only; the 60 FPS target is unverified.',
  '- **Pointer lock and mouse feel** cannot be granted in the automated environment; the Esc -> Resume -> click flow needs a hand test in real Chrome.',
  '- **Audio has never been heard by a person.**',
  '- **Balance and feel are bot-tuned.** The bot has perfect aim; the Bellhand toll-shot has not been read by a human.',
  '- **One level only.** Nothing here proves 68 maps of this quality are achievable; that is what Gate 2 is for.'].join('\n')}

## Independent audit and known defects
An independent adversarial audit of commit 7bf03a9 (\`review/gate-1/audit/\`) found 0 verified BLOCKER, 15 MAJOR, 5 MINOR. All were addressed; what is still open, partial or unverified is listed here from \`known-defects.json\`:
${defects.length ? `- Open/partial/unverified: BLOCKER ${sev('BLOCKER').length} · MAJOR ${sev('MAJOR').length} · MINOR ${sev('MINOR').length} (of ${defects.length} recorded; ${defects.length - open.length} fixed)\n${open.map(line).join('\n')}` : '- **NO DEFECT LIST RECORDED. This bundle is incomplete: do not present it.**'}

## Files
\`test-results.json\` \`performance.json\` \`known-defects.json\` \`play-path.json\` \`audio-qa.json\` \`build-info.json\` \`audit/\` \`screenshots/\`
`;
fs.writeFileSync(path.join(out, 'README.md'), readme);
console.log(`gate-1 bundle written: code ${head}${dirtySource ? ' (dirty source)' : ''}, tests ${testResults.pass}/${testResults.tests}, browser ${bc}, ${copied.length} screenshots${missing.length ? ` (${missing.length} missing)` : ''}, defects ${defects.length} (${open.length} not fixed), status ${status}${stale.length ? `, STALE EVIDENCE: ${stale.map(([k]) => k).join(',')}` : ''}`);
process.exit(testResults.fail ? 1 : !defects.length ? 2 : stale.length || dirtySource ? 3 : 0);
