// Renders REAUDIT.md from findings.json (source of truth) plus the fixed prose below. Auditor tool, not part of the game.
// Run from the repo root: node review/gate-2/reaudit/build_reaudit.mjs
import fs from 'node:fs';
const dir = 'review/gate-2/reaudit/', ALL = JSON.parse(fs.readFileSync(dir + 'findings.json', 'utf8'));   // flat array: R.. = new findings, A.. = verdicts on the first audit's findings
const F = { auditedCommit: '07f456e', previousAuditedCommit: 'f79bf59' };
const orig = ALL.filter((x) => x.id.startsWith('A')), nw = ALL.filter((x) => x.id.startsWith('R'));
const tally = (v) => orig.filter((o) => o.verdict === v).length;
const sev = (s) => nw.filter((f) => f.severity === s).length;
const auditTitle = Object.fromEntries(JSON.parse(fs.readFileSync('review/gate-2/audit/findings.json', 'utf8')).map((f) => [f.id, f.title]));
const sect = (f) => `### ${f.id} [${f.severity}, ${f.status}] ${f.title}

- **Files:** ${f.files.map((x) => '`' + x + '`').join(', ')}
- **Evidence:** ${f.evidence}
- **Reproduce:** \`${f.repro}\`
- **Impact:** ${f.impact}
- **Suggested fix:** ${f.fix}
`;
const out = `# Independent re-audit of the Gate 2 repairs (HUSHFALL, Episode 1)

- Audited commit: \`${F.auditedCommit}\` (HEAD; repairs \`eb257cc\` + \`07f456e\` on top of the first audit's \`${F.previousAuditedCommit}\`). \`git diff HEAD -- src tools tests maps routes maps-src\` was empty throughout, so what I ran is the committed source.
- Evidence files: \`validation/*.json\` were regenerated in the working tree by the background pipeline at 04:25-04:28 local (stamped \`07f456e\`, engineSha \`32736b82ea91d43f\` = sha of \`src/engine\` at HEAD, 92/92 browser checks, nine maps AGENT_VERIFIED). \`review/gate-2/{README,maps,performance,test-results,build-info,audio-qa}.json\` were still the pre-repair (21:24) versions when I finished, so the regenerated bundle is NOT audited (see Limits).
- Auditor: independent and adversarial; I did not write any of this code. Nothing under src/, tools/, tests/, maps/, maps-src/, routes/, assets/, docs, package.json, validation/ or CAMPAIGN_MANIFEST.json was modified. Copies (git archive of HEAD and f79bf59, mutated copies) lived in the auditor's scratchpad. Deliverables: this file, \`findings.json\`, \`repro/\`, \`build_reaudit.mjs\`.
- Status labels: CONFIRMED = reproduced by a script in \`repro/\` (plain \`node\` from the repo root) or by a command shown; PLAUSIBLE = strong code-reading evidence only.

## Summary

- **Original 22 findings: ${tally('FIXED')} FIXED, ${tally('PARTIALLY')} PARTIALLY, ${tally('NOT FIXED')} NOT FIXED.** The BLOCKER (A01) and five of the six MAJORs (A02, A03, A16, A17, A18) are fixed in mechanism; the sixth MAJOR (A04, thin balance margin) is partial exactly as the author records it.
- **New findings: ${sev('BLOCKER')} BLOCKER / ${sev('MAJOR')} MAJOR / ${sev('MINOR')} MINOR** (${nw.filter((f) => f.status === 'CONFIRMED').length} CONFIRMED, ${nw.filter((f) => f.status === 'PLAUSIBLE').length} PLAUSIBLE). I found no behavioural regression in the game rules the repairs touched (one cost regression, R09). What I did find: several repair "proofs" that cannot fail, one false sentence about mutation survivors, loopholes in the new gate-skip probe, and a handful of authoring/validator/save hazards for Gate 3.
- \`npm test\` equivalent in a hermetic copy of HEAD: **236/236 pass** (130 s). Nothing was run in a browser.

| id | severity | status | title |
|---|---|---|---|
${nw.map((f) => `| ${f.id} | ${f.severity} | ${f.status} | ${f.title} |`).join('\n')}

## Verdicts on the first audit's 22 findings

| id | original | verdict | evidence (what I ran) |
|---|---|---|---|
${orig.map((o) => `| ${o.id} | ${auditTitle[o.id]?.slice(0, 110) ?? ''}${(auditTitle[o.id]?.length ?? 0) > 110 ? '...' : ''} | **${o.verdict}** | ${o.evidence} |`).join('\n')}

## What I ran (all under review/gate-2/reaudit/repro/ unless noted)

- The original reproduction scripts (review/gate-2/audit/repro/, unchanged): a01, a01b, a01c, a02, a03, a06, a07, a07b, a08, a11, a11b, a12, a14, a16, a04 (about 10 minutes on a loaded machine), plus a22 (now rejected by the validator; replaced by r06).
- r01 knock-back tunnel fuzz (pre-repair vs repaired tree), r02 'open the gate' mutations against gateSkip with an invulnerable-bot ground truth, r03 physics-level flood fill of every shipped map with the sim's own collision (keys closure, start-state doors/sectors) to look for a way round a gate, r04 chain seeds, r05 exit id scheme, r06 pickup/switch on a lift (pre-repair vs repaired), r07 secret chain / Retry / old saves, r08 sky seam maths, r09b nav cost by map size, r10 per-type ammo slack, r11 feed-only run, r12 resume fuzz (60 checkpoints, pre-repair vs repaired), r13 robustness matrix, r14 Continue slot check, r15 safe/spawn-only loopholes, r16 old save into repaired maps, r17 per-seed completion rates of the perfect bot (8 seeds x 7 maps x 3 difficulties, 3 minutes), r01b trace of the A03 kit test's charge scenario. The audit's original t06_random_input_fuzz was re-run too: 27 runs, one violation (a Gaunt inside a closed door cell on M07 seed 2), identical on the pre-repair tree, so not a regression.
- r09_mutation_runner.mjs (ids X1-X19 for mutations of the repairs; M11.. for the first audit's survivors): 19 mutations of the repairs + the seven named survivors + M12, each against the relevant test files (and the whole suite for M21, X2 and X4). Also scratch experiments not kept as scripts: M01 canonical hash attribution (below), nav storm benchmarks, audio-coverage mutation, exit-lock-ignored mutation, cross-checks of validation/*.json against the docs.

Mutation table (relevant test files unless noted; SURVIVED = no test failed):

| mutation | result |
|---|---|
| arrival floor removed | killed (2 chain tests) |
| tryMove back to the end-point test (X2) | **SURVIVED** (relevant files 76/76 and the whole suite 236/236; see R01) |
| gateSkip returns [] | killed (1) |
| navVersion constant (X4) | **SURVIVED** in kit+ai; whole suite: 1 unrelated map test fails |
| duplicate-exit check / undriven-sector check / locked-exit-unlock check / needs-item check removed | each killed by 1 kit test |
| flare feed removed | killed (1) |
| worldShapeErrors never rejects | killed (1) |
| engine-hash staleness removed | killed (1) |
| pickups no longer follow floors / switch reach at creation height | killed (1 each) |
| exit lock ignored (M10) | killed (2, incl. the shipped-map gate test) |
| pulses dropped on load | killed (2) |
| ammoScale ignored / tremor ignored / gate check lenient / ammo slack 1.5x -> 0.05x (X14-X17) | **SURVIVED** (maps.test.js 30/30 each; R02) |
| weave option ignored | killed (M06 robustness) |
| M11, M13, M14, M18, M19, M20 | each killed by 1 'pinned' test |
| M21 (Cantor pulse damage 22 -> 0) | **SURVIVED the whole suite (236/236)** |
| M12 (melee ignores height) | SURVIVED (admitted) |

## Explanation of the M01 canonical hash change (f078a6e2 -> 6d0e7965)

The pre-repair evidence (3495524) for C1E1M01 main/normal has 4286 ticks, final hash f078a6e2. HEAD gives the same 4286 ticks and 14 damage but hash 6d0e7965. A world diff of the two final states shows exactly one field differing (enemy 15's z: 46.99984 vs 47.24201). Reverting ONLY tryMove sub-stepping in a copy restores f078a6e2; reverting ONLY nav.js changes nothing. So the difference is the deliberate knock-back change (a scattergun volley's summed push now slides as far as it can in 0.25 m steps instead of being refused whole). An ordinary player move (< 0.25 m per tick at up to 9.9 m/s) uses one step and is bit-identical. The docs/log do not mention that the Gate 1 map's canonical hash changed.

${nw.map(sect).join('\n')}
## Claims checked and found TRUE

- \`npm test\` really is 236/236 (hermetic copy of HEAD, 130 s, no failures); TESTING.md's 236, 92 browser checks (validation/browser-check.json: 92, all ok, no errors, stamped 07f456e), 54 audio effects, 14 render vantage points, 9 AGENT_VERIFIED, and the M03/M05/M06/M07/M08 draw-call numbers match the regenerated evidence.
- Regenerated per-map evidence: gate probe recorded on every map with enemies, robustness (aim error, ammo x0.75) 'complete' on all eight fighting maps, ammo capacity/fired recorded, engineSha == sha of src/engine, passive-runner results and damage identical to the pre-repair evidence on all nine maps (the runner and stationary bot are not weakened by the changes); browser-vs-Node route hashes equal for the ten routes and (spot-checked on M02, M06, M08) equal to the evidence finalHash values.
- No way round a gate on the shipped maps by walking: r03 (sim collision, 0.25 m lattice, 8-neighbour moves, keys closure): M03, M05 and M06 exits are physically unreachable from the start state; M07/M08 exits are reachable but locked (exitLocked true until the fuse switch / dead:cantor trigger); no cell is physically reachable that a plain 4-connected cell BFS with the same keys does not reach, other than the free corners of cells holding a blocking crate/table (no squeeze or diagonal paths past props or wall corners); M01/M02/M04 need their keys.
- The bot only READS world state and acts through InputState (grep of src/engine/bot.js: no write to world or player state); the harness options tremor (on the input stream, on fire ticks) and ammoScale (a key on the world only when set; scales pickups only) do not appear in normal worlds, saves or hashes.
- The fixes for A01, A06, A07, A11, A16, A17, A22 hold under the original repro scripts and the new checks above; A16's chain completes on easy/normal/hard for seeds 1-2 and on the secret route M04 -> S01 -> M05 for normal seed 1 and hard seeds 2 and 3, every arrival >= the authored loadout.
- The audio-coverage test now fails for a new emit in src/engine/script.js (verified by mutation); the two vacuous assertions in elites.test.js are real assertions; exit-lock mutation now fails a shipped-map test.
- Determinism: canonical route runs are not slower than before (M03 1.41 s vs 1.55, M05 1.12 vs 1.27, M06 1.61 vs 1.79 wall time); resume == uninterrupted on 60 active-input checkpoints; the M01 hash change is explained above. Save with the new state (p.feedT, pulses) round-trips (r12, a07b).
- validateMap cap (400 per side, 25,600 cells) is 7.6x the largest shipped map (3,360 cells) and does not reject any shipped map; locked exits unlocked by a dead:<group> trigger (M08) and sectors driven only by triggers (kit tests) are accepted.
- Process/scope: nothing beyond Episode 1 exists; no extra assets; the 68-slot manifest is intact (validate: topology OK).

## Not audited / limits

- No browser: Chrome was not started (the background pipeline owned it). The browser shell repairs (FIRST_MAP, loadFirstSave, applySave try/catch, ui.js, the sky makeSeamless wiring, the objective/boss layout) were read, and their logic simulated in Node where possible (r14, r08), never executed in a page. Nothing was heard or seen.
- The regenerated bundle (review/gate-2/README.md, maps.json, test-results.json, performance.json, audio-qa.json, build-info.json) was not yet rewritten when I finished (timestamps 21:24 the previous evening), so its numbers and wording were not checked; R12 (5) is read from tools/gate2-bundle.mjs. The 236-test count comes from my own hermetic run, not from a regenerated test-results.json.
- Hermetic copies were made with \`git archive\`, which wrote CRLF files on this machine; the tests are insensitive to that (236/236) but sha-based evidence checks are not (R11). All timing numbers were taken on a loaded machine (a background pipeline was running) and are ratios rather than absolutes.
- r03 models keys, doors and sectors at their start height only; it does not model every switch effect, so it shows no unintended shortcut in the START state, not in every intermediate state. The gate-skip mutations are 23 hand-made single mutations (plus one 'all gates open' combination per map), not exhaustive. Mutation runs used the relevant test files for speed except M21, X2 and X4 (whole suite).
- Human validity (balance, feel, fairness of the Warden/Cantor fights) was probed only with bots; the first audit's limits on this still stand.
`;
fs.writeFileSync(dir + 'REAUDIT.md', out);
console.log('REAUDIT.md written,', out.length, 'chars;', nw.length, 'new findings;', orig.length, 'verdicts');
