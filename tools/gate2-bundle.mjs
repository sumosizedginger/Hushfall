// Builds review/gate-2/ from the project's own evidence. Nothing is typed by hand except known-defects.json (a judgement file that this script never overwrites).
// Run after: npm run verify, npm run browsercheck, npm run audio-qa, npm run verify-map -- <each Episode 1 map>, node tools/dev/shoot-map.mjs <each map>.
// Exit codes: 0 ok, 1 tests failed, 2 the defect list is missing/empty (the bundle would be dishonest), 3 evidence is from a different commit than the code (or the source tree is dirty).
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'review/gate-2');
fs.rmSync(path.join(out, 'screenshots'), { recursive: true, force: true });             // never keep images from an earlier build
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
const readJson = (f) => (fs.existsSync(path.join(root, f)) ? JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')) : null);
const sh = (c) => { try { return execSync(c, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };
const { SAVE_VERSION } = await import(pathToFileURL(path.join(root, 'src/engine/save.js')).href);
const IDS = ['C1E1M01', 'C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08', 'C1E1S01'];

const head = sh('git rev-parse --short HEAD'), dirtySource = !!sh("git status --porcelain -- . ':!review' ':!validation'");
const t = spawnSync(process.execPath, ['--test', 'tests/*.test.js'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
const txt = (t.stdout || '') + (t.stderr || '');
const num = (k) => Number((txt.match(new RegExp('ℹ ' + k + ' (\\d+)')) || [])[1] ?? NaN);
const testResults = { ranAt: new Date().toISOString(), codeCommit: head, exitCode: t.status, tests: num('tests'), pass: num('pass'), fail: num('fail'),
  failures: [...txt.matchAll(/^✖ (.+?) \(/gm)].map((m) => m[1]), names: [...txt.matchAll(/^✔ (.+?) \(/gm)].map((m) => m[1]) };
fs.writeFileSync(path.join(out, 'test-results.json'), JSON.stringify(testResults, null, 2));

// ---- evidence + provenance --------------------------------------------------------------------------------------------------
const browser = readJson('validation/browser-check.json'), audio = readJson('validation/audio.json'), budget = readJson('validation/render-budget.json'), baseline = readJson('validation/render-budget-baseline.json');
const maps = Object.fromEntries(IDS.map((id) => [id, readJson('validation/maps/' + id + '.json')])), campaign = readJson('validation/campaign.json');
const stamps = { code: head, browserCheck: browser?.commit ?? 'unstamped', audioQa: audio?.commit ?? 'unstamped', ...Object.fromEntries(IDS.map((id) => ['map:' + id, maps[id]?.codeVersion ?? 'unstamped'])) };
const stale = Object.entries(stamps).filter(([k, v]) => k !== 'code' && v !== head);
const mapShaOk = IDS.map((id) => { const f = path.join(root, 'maps', id + '.json'); return [id, maps[id]?.browser?.mapSha != null && fs.existsSync(f) && maps[id].browser.mapSha === browser?.mapShas?.[id]]; });

fs.writeFileSync(path.join(out, 'performance.json'), JSON.stringify({
  note: 'No real-GPU frame rate was measured (headless Chrome + software GL only). Counts are structural; timings are software-GL and UNCLAMPED; neither is a 60 FPS claim.',
  renderBudget: budget, baseline: baseline?.budget ?? null, softwareGl: browser ? { env: browser.env, perf: browser.perf } : null, target: '60 FPS on a mainstream desktop browser (UNVERIFIED)' }, null, 2));
const mapTable = IDS.map((id) => {
  const m = maps[id]; if (!m) return { id, evidence: 'MISSING' };
  const v = m.viability ?? {}, n = v.normal?.fighter, d = (k) => v[k]?.fighter?.meanDamage ?? v[k]?.fighter?.damage;
  return { id, name: readJson('maps/' + id + '.json')?.name ?? null, status: campaign?.perMap?.[id] ?? 'unknown', automatedPass: m.automated?.pass ?? null, mapVersion: m.mapVersion, counts: m.counts, botSecondsNormal: n?.seconds ?? null, fighterDamage: { easy: d('easy'), normal: d('normal'), hard: d('hard') }, runner: Object.fromEntries(['easy', 'normal', 'hard'].map((k) => [k, v[k] ? `${v[k].runner.result}, ${v[k].runner.damage} damage` : null])), routes: (m.routes ?? []).filter((r) => r.difficulty === 'normal').map((r) => ({ file: r.file, result: r.result, seconds: +(r.ticks / 60).toFixed(1), kills: r.kills, secrets: r.secrets })) };
});
fs.writeFileSync(path.join(out, 'maps.json'), JSON.stringify({ note: 'read from validation/maps/<ID>.json (tools/verify-map.mjs). Status is derived by npm run validate; agents cannot award COMPLETE.', maps: mapTable }, null, 2));
const pkg = readJson('package.json');
fs.writeFileSync(path.join(out, 'build-info.json'), JSON.stringify({ git: head, dirtySource, node: process.version, dependencies: pkg.dependencies, devDependencies: pkg.devDependencies, status: campaign?.counts, evidenceStamps: stamps }, null, 2));
if (audio) fs.writeFileSync(path.join(out, 'audio-qa.json'), JSON.stringify({ when: audio.when, env: audio.env, sfxCount: audio.sfx.length, maxPeak: Math.max(...audio.sfx.map((r) => r.peak)), failures: audio.failures, listen: 'review/audio/*.wav', scope: 'each effect rendered ALONE offline: finite, non-silent, peak below full scale. Mixed output (master chain, overlapping sounds, music vs effects) is NOT measured.', note: audio.note }, null, 2));

// ---- screenshots: every map's vantage tour (taken with overlays cleared) + the runtime shots ---------------------------------------
const copied = [], missing = [];
for (const id of IDS) {
  const dir = path.join(root, 'review', 'level-' + id.toLowerCase()), dst = path.join(out, 'screenshots', id); fs.mkdirSync(dst, { recursive: true });
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')) : []; if (!files.length) missing.push('review/level-' + id.toLowerCase());
  for (const f of files) { fs.copyFileSync(path.join(dir, f), path.join(dst, f)); copied.push(id + '/' + f); }
  const top = path.join(root, 'review/maps', id + '.png'); if (fs.existsSync(top)) { fs.copyFileSync(top, path.join(dst, '_topdown.png')); copied.push(id + '/_topdown.png'); }
}
const rt = path.join(out, 'screenshots', '_runtime'); fs.mkdirSync(rt, { recursive: true });
for (const f of fs.existsSync(path.join(root, 'review/engine-skeleton')) ? fs.readdirSync(path.join(root, 'review/engine-skeleton')).filter((n) => /^(g2-|04-intermission|05-pause|06-death)/.test(n)) : []) { fs.copyFileSync(path.join(root, 'review/engine-skeleton', f), path.join(rt, f)); copied.push('_runtime/' + f); }

// ---- known defects: a judgement file, never overwritten ----------------------------------------------------------------------------
const kd = path.join(out, 'known-defects.json'), kdJson = fs.existsSync(kd) ? JSON.parse(fs.readFileSync(kd, 'utf8')) : null, defects = kdJson?.defects ?? [];
const open = defects.filter((d) => d.status !== 'fixed'), sev = (s, list = open) => list.filter((d) => d.severity === s);
const line = (d) => `- **${d.severity}** [${d.status}] ${d.id ? d.id + ' ' : ''}${d.title}${d.remaining ? ` — remaining: ${d.remaining}` : ''}`;
const bc = browser ? `${browser.checks.filter((c) => c.ok).length}/${browser.checks.length}` : 'not run';
const g2r = browser?.gate2Routes ?? {}, g2ok = Object.values(g2r).filter((r) => r.ok && r.ticks === r.nodeTicks && r.hash === r.nodeHash).length;
const tot = (k) => mapTable.filter((m) => m.status !== 'PLANNED' && m.fighterDamage && m.id !== 'C1E1S01').reduce((a, m) => a + (m.fighterDamage[k] ?? 0), 0);
const audit = fs.existsSync(path.join(out, 'audit/findings.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'audit/findings.json'), 'utf8')) : null;
const auditCount = (sv) => audit?.filter((f) => f.severity === sv).length ?? 0;
const repaired = (id) => defects.find((d) => d.id === id)?.status ?? 'unrecorded';
const rows = mapTable.map((m) => `| ${m.id} | ${m.name ?? '?'} | ${m.status} | ${m.counts?.enemies ?? '?'} | ${m.botSecondsNormal ?? '?'} | ${m.fighterDamage ? `${m.fighterDamage.easy}/${m.fighterDamage.normal}/${m.fighterDamage.hard}` : '?'} | ${m.runner?.normal ?? '?'} |`).join('\n');
const readme = `# Gate 2 review bundle: Episode 1, Port Marrow (C1E1M01-M08 + secret C1E1S01)

Generated ${new Date().toISOString()} by \`node tools/gate2-bundle.mjs\` from repository evidence. Code: \`${head}\`${dirtySource ? ' **(source tree had uncommitted changes)**' : ''}.
${stale.length ? `\n> **Provenance warning:** these evidence files were generated from a different commit than the code above: ${stale.map(([k, v]) => `${k} = ${v}`).join(', ')}. Regenerate them before trusting this bundle.\n` : `\nEvidence provenance: browser check, audio QA and all ${IDS.length} map evidence files are stamped with the same commit as the code (\`${head}\`).\n`}
## Decision requested
**APPROVE**, **REVISE**, or **STOP PROJECT**. Approval means the production process may move to Gate 3: turning what Episode 1 proved (the map kit, the roster, the verification loop) into a repeatable pipeline for the remaining episodes. It does not mark any map COMPLETE (that needs a recorded human review of the map), erase the known defects below, or override a failing test. Silence is neither approval nor rejection.

## Two ways to look
- **Screenshots** (\`screenshots/<map>/\`, ${copied.length} images incl. a top-down plan per map): appearance only. Taken with the title card and transmissions cleared, from positions a player can stand in.${missing.length ? ` No tour found for: ${missing.join(', ')}.` : ''}
- **Play it:**
\`\`\`bash
npm ci
npm run dev        # http://localhost:5173/  (click a difficulty; click the game once to capture the mouse; the intermission's Next button walks the episode)
\`\`\`
Controls (rebindable in Pause > Controls): WASD move, mouse look, left click fire, right mouse aim, Shift sprint, E/Space use, 1/2/3 or wheel weapons, Tab automap, F5/F9 quick save/load, Esc pause. Listen: \`review/audio/*.wav\` (nobody has yet).

## The episode (read from validation/maps/*.json; see maps.json)
| map | name | derived status | enemies | bot s (normal) | fighter damage e/n/h | passive runner (normal) |
|---|---|---|---|---|---|---|
${rows}

Perfect-fighter damage summed over M01-M08 (mean of 3 seeds): easy ${tot('easy')}, normal ${tot('normal')}, hard ${tot('hard')} (the per-map ordering check is loose; the episode total is the real trend).

Derived campaign status: PLANNED ${campaign?.counts?.PLANNED ?? '?'} / IMPLEMENTED ${campaign?.counts?.IMPLEMENTED ?? '?'} / AGENT_VERIFIED ${campaign?.counts?.AGENT_VERIFIED ?? '?'} / COMPLETE ${campaign?.counts?.COMPLETE ?? '?'} of 68. Agents cannot award COMPLETE.

## What Episode 1 added (the production kit and roster)
- **Terrain**: per-cell heights (0.5 m units, 0.6 m step climb, free drops), ceilings, stairs, terraces, cliffs; enemies path over it (BFS distance field) and cannot hit what stands 2 m above them.
- **Moving floors** (lifts, the funicular car, the ferry's bow ramp), **wall switches** (some that demand items: the Signal House's fuses), **trigger scripts** (13 actions: open/close/unlock/seal/wake/spawn/sector/message/exit/alert/shake/objective/lights), **ambush closets**, **wading water and toxic residue**, locked exits, **dark levels that brighten** (\`atmosphere.ambient\`).
- **Roster**: Tollbearer, Gaunt Runner, Bellhand (ranged), **Sexton** (raises the fallen: channel, revive, interrupted by damage), **Warden-Graft** (front plate, charge with a tell, stuns itself on walls and pillars), **Cantor** boss (shielded while any of six bell nodes ring; tone pulses that cover and height stop; summons; toll-shot fans once the ring is broken). Third weapon: **Riveter driver**.
- **Authoring pipeline**: \`maps-src/<ID>.level.mjs\` (builder) -> \`tools/mapkit/compile.mjs\` -> \`maps/<ID>.json\`; \`mapview.mjs\` top-down plans; \`tools/dev/shoot-map.mjs\` vantage tours; campaign flow (next map, secret exit and return, inventory carry-over); shared viability and quality gates (tests + verify-map).

## What is proven (by evidence)
- Automated tests: **${testResults.pass}/${testResults.tests} pass** (\`test-results.json\`). Every map in \`maps/\` gets the same generic bar (loads, reachability, routes on 3 difficulties, viability, quality contract, determinism, story delivery) from \`tests/maps.test.js\`.
- Real-browser checks in headless Chrome: **${bc}** (\`validation/browser-check.json\`), including the **canonical route of every Episode 1 map played in the real game and compared with the headless sim (tick count + state hash): ${g2ok}/${Object.keys(g2r).length} identical**, the intermission Next button carrying the inventory from M01 into M02, the objective line, the boss bar with its shield note, and a fuse pickup named as a fuse.
- Level viability: a passive runner that never fires does not walk through any map; a perfect fighter completes every map on easy/normal/hard and takes real damage (numbers above).
- Audio QA: ${audio ? `${audio.sfx.length} effects rendered alone are finite, non-silent and below full scale (max peak ${Math.max(...audio.sfx.map((r) => r.peak)).toFixed(2)})` : 'not run'}. It does NOT measure the mixed output.
- Draw calls and triangles at ${budget ? Object.keys(budget.budget).length : '?'} vantage points (Gate 1 map plus the heaviest Gate 2 views, asleep and all-awake) are compared with a recorded baseline (\`performance.json\`). Structural counts only.

## What remains uncertain (honest list)
${['- **Real-GPU performance is unmeasured.** Headless software rendering only; the 60 FPS target is unverified. Each awake enemy rig is ~30 draw calls.',
  '- **Nobody has played this.** Difficulty, ammo economy, boss pacing, the Warden and Cantor fights and every par time are bot-tuned placeholders; the bot has perfect aim and no fear.',
  '- **Pointer lock and mouse feel** cannot be granted in the automated environment; the Esc -> Resume -> click flow needs a hand test in real Chrome.',
  '- **Audio has never been heard by a person**, including the 20+ new effects (tone pulses, bell nodes, the ramp, the surge of the Signal House lights).',
  '- **Enemy and boss models are code-authored variants on one rig**; they have been looked at in screenshots only, not in motion by a person.',
  '- **Only Episode 1 exists.** Nothing here proves 68 maps of this quality are achievable; Gate 3 is about making the process repeatable, and Gate 4 about volume.'].join('\n')}

## Independent audit and known defects
${audit ? `An independent adversarial audit of code f79bf59 (the report audit/AUDIT.md, audit/findings.json, reproduction scripts in audit/repro/) found **${auditCount('BLOCKER')} BLOCKER, ${auditCount('MAJOR')} MAJOR, ${auditCount('MINOR')} MINOR** (all confirmed by script). The BLOCKER (two exits on one cell, so the fuse and Cantor gates never locked) was the author's own error that every test and check missed; all seven BLOCKER/MAJOR findings and most MINORs were repaired afterwards (A01 ${repaired('A01')}, A02 ${repaired('A02')}, A03 ${repaired('A03')}, A04 ${repaired('A04')}, A16 ${repaired('A16')}, A17 ${repaired('A17')}, A18 ${repaired('A18')}). The audit ran BEFORE the repairs; nobody has re-audited the repaired code independently.` : '_No independent audit has been recorded yet._'} What is open, partial or unverified is listed from \`known-defects.json\`:
${defects.length ? `- Open/partial/unverified: BLOCKER ${sev('BLOCKER').length} · MAJOR ${sev('MAJOR').length} · MINOR ${sev('MINOR').length} (of ${defects.length} recorded; ${defects.length - open.length} fixed)\n${open.map(line).join('\n')}` : '- **NO DEFECT LIST RECORDED. This bundle is incomplete: do not present it.**'}

## Files
\`test-results.json\` \`performance.json\` \`maps.json\` \`known-defects.json\` \`audio-qa.json\` \`build-info.json\` \`audit/\` \`screenshots/\`
`;
fs.writeFileSync(path.join(out, 'README.md'), readme);
const shaBad = mapShaOk.filter(([, ok]) => !ok).map(([id]) => id);
console.log(`gate-2 bundle written: code ${head}${dirtySource ? ' (dirty source)' : ''}, tests ${testResults.pass}/${testResults.tests}, browser ${bc}, real-game routes identical ${g2ok}/${Object.keys(g2r).length}, ${copied.length} screenshots${missing.length ? ` (missing tours: ${missing.join(',')})` : ''}, defects ${defects.length} (${open.length} not fixed)${stale.length ? `, STALE EVIDENCE: ${stale.map(([k]) => k).join(',')}` : ''}${shaBad.length ? `, browser check did not run on the current file for: ${shaBad.join(',')}` : ''}`);
process.exit(testResults.fail ? 1 : !defects.length ? 2 : stale.length || dirtySource || shaBad.length ? 3 : 0);
