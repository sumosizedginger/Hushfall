# Codex repository audit

Date: 2026-10-20, America/Los_Angeles. Repository: D:/Doom. Input pack: D:/Doom_release/audit-pack.

One improvement was implemented by this audit: evidence regeneration now reports child failures reliably and exits unsuccessfully when a selected verification step fails. This repair changes no gameplay, content, dependencies or rendered output. No second repair was implemented by this audit. Findings and before/after measurements refer to the initially clean f8a0665 snapshot plus the tooling repair; concurrent workspace changes are identified below.

Final verification result: the full `npm run verify` completed successfully on HEAD 986c2a9 plus the working-tree changes present at retry start. All 1,405 tests passed, zero failed and zero skipped; the production build, licence audit and distribution check passed. The subsequent authorized evidence run also passed: 146/146 shared browser checks, all 68 per-map browser runs, all 68 map-gate regenerations and final validation. Derived status is now AGENT_VERIFIED 68/68, COMPLETE 0/68. No input changes were detected during either run. Details and the earlier interruption are preserved below.

## Ranked weaknesses

Ranking weighs severity, strength of evidence, breadth of impact and repair cost. High means a crash, unreliable release decision or substantial lost functionality. Medium means a material qualification or usability problem. Small is roughly half a day; medium is one to three engineering days; large requires several days and/or outside hardware or testers. These are estimates, not commitments.

| Rank | Severity | Classification and evidence | Weakness and likely user impact | Estimated repair |
|---|---|---|---|---|
| 1 | High | Confirmed defect, reproduced through the actual CLI with controlled children and through a real Windows child. Repaired. | The regeneration driver could return success after failed browser, map, validator or test jobs. Its PowerShell launcher swallowed child exit codes; an old green browser JSON could mask a failed run. This undermines the release decision across all 68 maps. | Small. Completed and tested. |
| 2 | High | Confirmed defect, three executable reproductions. | A mid-level save containing a null projectile, enemy shot or door passes load validation, then throws on its first simulation tick. A damaged slot can therefore pass Continue's initial checks and fail only after entering play. Existing frame guards mitigate the crash; they do not make the accepted save playable. | Medium. Validate nested state against its consumers and preserve genuine save compatibility. |
| 3 | High | Confirmed in the initial snapshot; throwing storage reproduced. Subsequently addressed by a concurrent edit outside this audit. Browser quota exhaustion was simulated, not induced in a live profile. | The initial storage probe writes only a tiny value. A later autosave can exceed quota. The original level-entry write had no catch, although quick-save and transition persistence did. A fresh level could abort after its view was constructed but before its mode/UI transition finished. | Medium. A separate storeSave change now exists; it is not part of this audit's repair or validation claim. |
| 4 | High | Confirmed scheduling mismatch in the real route and queue model; live browser presentation not rerun. | Story receipt is verified more strongly than story presentation. C2M30 emits nine messages in 1,505 ticks, 25.083 seconds. At 60 Hz with cinematics disabled, the actual comms scheduler starts only three; six remain queued at the exit, including the radio reunion. Essential dialogue trails the location it describes. The Record retains the messages, so this is not permanent text loss. | Medium. Coordinate presentation deadlines, transitions and message priority without silently dropping text. |
| 5 | High | Architectural/release risk, supported by existing measurements and explicit qualification gaps. No new hardware failure claimed. | The target hardware and browser matrix is unproved. PERFORMANCE_PLAN reports a 13.4 ms worst simulation step on the owner's machine, near the 16.7 ms frame budget before drawing and audio. Render-width reduction cannot cure CPU-bound simulation. Integrated graphics, slower laptops, Firefox and Safari remain unqualified; human completion is recorded for zero maps. | Large. Measure representative hardware and outside play first; optimize only demonstrated bottlenecks. |
| 6 | Medium | Architectural risk, confirmed dependency-model omission. | Evidence freshness hashes runtime source and assets but excludes package-lock.json and the verification tools themselves. A Three.js or harness change can leave old evidence apparently fresh even though the renderer or measurement procedure changed. Source hashes are useful, but are not the complete provenance of a result. | Medium. Version evidence producers and dependency inputs, then regenerate deliberately. |
| 7 | Medium | Confirmed verifier defect, temporary-build reproduction. | check-dist checks HTML references but not CSS resource dependencies or JavaScript asset URLs. A linked stylesheet naming a missing image passes with zero problems. Consequently its successful result is weaker than the advertised assurance that the folder uploads and works as it stands. The existing production build was not found to contain such a missing image. | Small to medium. Validate emitted dependency references and include negative fixtures. |
| 8 | Medium | Architectural performance/reliability risk, source inspection. | Startup eagerly parses all 68 maps and waits for the full texture set across skins, skies and creatures. A missing late-campaign texture blocks the title instead of just its level; startup work scales with the whole campaign. There are 169 baked PNGs totalling 6,463,650 bytes on disk, though the startup set is a subset. No cold-start latency or texture-memory regression was measured here. | Medium to large. Measure first, then consider staged loading and explicit failure recovery. |
| 9 | Medium | Confirmed evidence defect; underlying game defect unproved. | C2M24-scene.jpg is nearly black apart from the skip hint. audit-capture takes the first cinematic frame and immediately skips. This can capture a fade rather than the scene. That frame cannot substantiate cinematic appearance, subtitles, camera placement or readability. The visual index calls it a scene that has just ended, which also misdescribes the capture. | Small. Capture a declared non-fade moment and verify visible scene content. |
| 10 | Low | Confirmed documentation contradiction, direct comparison. | GAME_VISION states that the childhood ear injury causes Ines's immunity. The current canon and the father's revised log explicitly say the cause is unknown. Session-start instructions require reading GAME_VISION, so a future contributor can reintroduce the retired certainty. | Small. Align the current overview with canon and distinguish historical material. |

No speculative GPU leak, random-number defect or unobserved soft-lock was promoted to a confirmed finding. The source searches did not establish a render/audio write into simulation state. This is not proof that every possible layer violation is absent.

## Locations and reproductions

1. tools/dev/regen-all.mjs, original lines 17-36; tools/dev/low.ps1, original final lines. Run `node --test tests/regen-all.test.js`. Its fixture runs the actual driver, substitutes child outcomes, and does not launch browsers or modify validation evidence. The Windows launcher test runs a real Node child that exits 7. The retained process handle is necessary for reliable ExitCode retrieval in Windows PowerShell. Failed steps still allow subsequent selected steps to run, as the existing driver intended.

2. src/engine/save.js:67, :119 and :156-159 validate array types but not the affected nested elements. src/engine/world.js:1284 subsequently dereferences a projectile's weapon. Run `node attack/codex/reproduce.mjs`. All three synthetic saves are accepted; the next tick throws respectively on `weapon`, `life` and `breath`. These are local damaged-save scenarios, not a demonstrated remote exploit.

3. Original src/engine/save.js:169; original src/game/main.js:50 and :186. The same reproduction script supplies a storage implementation that throws QuotaExceededError. Compare the original unguarded level-entry write with the handled writes at main.js:213 and :307. The script confirms propagation from SaveStore; the interrupted shell transition is a source-level consequence, not a newly observed browser screenshot. The concurrent shell edit now catches this through storeSave.

4. src/game/commsqueue.js:5-25; src/game/ui.js:228-242; src/game/main.js:232-249. The reproduction script runs the shipped C2M30 route and feeds its timestamped message events through CommsQueue at 60 Hz, including the 6.3-second title-card block. Only `floor`, `lantern` and `shaft` begin displaying before the route completes. This calculation assumes cinematics off, no pause and normal time scale, all supported conditions. It does not claim this exact timing for a slow human playthrough or default cinematic playback.

5. design/PERFORMANCE_PLAN.md, sections on known hardware, automatic quality, window sizes and soak; src/game/quality.js:9 and :25-27. The reported 13.4 ms is prior project evidence, not a measurement made by this audit. No FPS improvement is claimed for this repair.

6. tools/textsha.mjs:16-31. Inspect SOURCE_SETS and DEPENDS: neither dependency lockfiles nor tools/dev/browser-check.mjs, render-census or verifier implementations are inputs. An explicit producer revision would strengthen the meaning of AGENT_VERIFIED.

7. tools/dev/check-dist.mjs:17-29. The reproduction script creates an index linking assets/style.css, whose background names missing.png. checkDist returns an empty problems array. Only temporary files are used and removed.

8. src/game/main.js:43-46 and :71; src/render/textures.js:30 and :52. This is an existing design tradeoff, not a request to introduce lazy loading without measurement.

9. D:/Doom_release/audit-pack/visual/C2M24-scene.jpg; visual/INDEX.md; tools/dev/audit-capture.mjs:58. Inspection of the existing image and capture code explains the limitation without launching Chrome.

10. GAME_VISION.md:5 versus design/LORE.md, opening canon bullet, and design/story/RECORD.md:113-114. The revised father distinguishes what he observed from what he only suspects.

## The completed repair

Production-tool changes are confined to two files:

- tools/dev/low.ps1 retains the child process handle, captures its real exit code and returns it. Failure to start the process is terminating; an unavailable exit code is a failure.
- tools/dev/regen-all.mjs accumulates failure across all selected steps and sets process.exitCode. A failed browser process is never summarized from old JSON. Browser-map completion must name every shipped map exactly once with nonzero passing checks. Validator and status commands both matter. Test-process exit status and its totals both matter. Missing browser logs do not prevent remaining steps or the summary from running.

Regression coverage is in tests/regen-all.test.js and tests/fixtures/regen-spawn.mjs. It covers failures in every stage, failure of the separate status command, signal termination, launch failure, absent logs, incomplete and duplicate map coverage, failed checks, page errors, malformed/empty evidence, inconsistent or absent test totals, failed map-gate output, successful execution and selection/resume options. It also exercises the real Windows launcher.

This audit changed no package, runtime source, map, route, art or sound. At the build comparison and initial real-validator smoke test, source hashes matched the existing shared browser evidence. Subsequent external runtime edits invalidate that statement for the final shared workspace. No map was awarded COMPLETE.

## Measured before and after

| Measurement | Before | After |
|---|---|---|
| Original 12 regression tests | 1 passed, 11 failed | 12 passed, 0 failed |
| Real child exits 7 | Launcher returned 0 | Launcher returns 7 |
| Nine controlled failure scenarios that previously returned driver success | Exit 0 | Exit 1, with a failed summary |
| Launch failure without browser log | Driver aborted before writing SUMMARY.txt | Failed summary written; later steps run |
| Extended release-tooling group | No pre-change baseline for the eight added edge cases | 45 passed, 0 failed; initial complete run 9.281 seconds, final recheck 7.545 seconds |
| Full verification retry after the user's request | First attempt interrupted by concurrent edits | 1,405 passed, 0 failed, 0 skipped; validation and production build passed; 4,387.278 seconds total |
| Production build inventory | 169 files, 9,607,864 bytes | 169 files, 9,607,864 bytes |
| Aggregate production-build SHA-256 | a9a69f8575b644abbba6bbf2602d2f0482643aa2d043d3442b1fa4909382ef33 | Identical |

The byte comparison hashes sorted relative filenames and their contents using attack/codex/build-check.mjs. It is evidence that this tooling repair leaves the produced game unchanged. It is not a frame-rate benchmark. The independent build completed successfully in 5.377 seconds; no comparable pre-change build duration was measured.

The first targeted run was 44/45 because the sandbox denied the packaging test's loopback HTTP connection with EACCES. All four packaging tests passed when rerun with localhost access, and the entire 45-test group then passed with that access. This was an environment restriction, not a game-code failure.

The repaired driver also ran real validation and status commands with `--only=4`: both exited 0, and its summary reported AGENT_VERIFIED 68/68, COMPLETE 0/68. That was before the concurrent runtime edits. Raw local evidence is under review/codex-audit/. Logs are not intended for version control.

## Concurrent changes, initial interruption and completed retry

While the broader `npm run verify` job was running, these files acquired edits not made by this audit: src/engine/save.js, src/game/main.js, tests/save.test.js, tests/errorlog.test.js and PRODUCTION_LOG.md. The diff adds storeSave and handles the level-entry autosave failure ranked third. Later, HEAD advanced to 986c2a9 and src/render/levelmesh.js and src/render/view.js also acquired external edits. I left those edits intact. Their author and their separate test claims are not inferred from the shared filesystem.

Because tests were reading a changing tree, I stopped only this audit's verified runner process and its descendants. That first full verify command was interrupted and has no full-suite result. The user then requested a retry, which completed as recorded below. The original byte-identical build comparison must not be presented as a comparison of the later external runtime edits.

The external changes touch engine, shell and rendering source sets and therefore stale the prior browser/map evidence. A final real `--only=4` run returned exit 0 for validation and status and correctly derived IMPLEMENTED 68/68, AGENT_VERIFIED 0/68, COMPLETE 0/68. Validation's OK here means topology/evidence consistency, not that the combined workspace is ready for release. The complete 45-test tooling group was also rerun after the external save/shell edits and passed in 7.545 seconds.

At the end of the initial audit, the combined runtime changes still required normal evidence regeneration. The validator then derived IMPLEMENTED because the older evidence was stale. The user later explicitly authorized regeneration, which completed as recorded in the evidence section below. Derived status updates are not gameplay repairs.

### Completed retry

The user requested "Try again", then "resume". The retry started at 2026-10-20 21:28:20 America/Los_Angeles and ran at idle priority on two cores with localhost access for the packaging fixtures. It launched no browser. The input monitor hashed source, tests, tools, assets, maps, routes, design files and relevant root files before the commands, every thirty seconds and after each command. Its final changed-input list is empty.

| Command | Exit | Result | Elapsed |
|---|---|---|---|
| npm run verify | 0 | validate OK; 1,405 tests passed, 0 failed, 0 skipped; production build passed | 4,387.278 s, about 73 min 7 s |
| npm run licences | 0 | licence audit OK; three.js is the production dependency | 0.737 s |
| npm run check-dist | 0 | build check OK; 169 files, approximately 9.2 MB | 0.720 s |

The build emitted its existing large-chunk warning; that warning did not fail the build and is consistent with the eager-startup risk ranked eighth. These elapsed times describe verification on this machine under the imposed load limits, not game frame rate.

Raw logs: review/codex-audit/retry/verify.log, licences.log, check-dist.log and verification.json. This complete Node/build verification superseded the interrupted run. It did not by itself promote the maps back to AGENT_VERIFIED; that required the subsequent browser and map evidence regeneration below.

## Evidence regeneration completed, 2026-10-21

At the user's explicit "run the evidence", the normal regeneration driver ran with `--skip-tests`: the full 1,405-test suite had just passed, and no runtime source changed. The evidence job ran from 2026-10-20 22:47:16 to 2026-10-21 00:08:33 America/Los_Angeles, approximately 81 minutes 18 seconds. Every job inherited idle priority and two-core affinity. Browser jobs ran sequentially; the existing automated-browser guard refused pointer-lock requests. The source-change monitor detected zero changed inputs.

| Evidence | Result |
|---|---|
| Shared real-game browser check | 146/146 checks passed, zero recorded page errors |
| Render-ground census | All 68 maps covered; 9/9 aggregate checks passed; 2,138 sleeping enemy rows and 7,261 pose rows checked |
| Each map's own real-game evidence | 68/68 maps passed every check; route ticks and state hashes matched Node |
| Regenerated map gates | 68/68 maps passed; no failed map |
| Final validate/status | Exit 0; AGENT_VERIFIED 68/68, IMPLEMENTED 0/68, COMPLETE 0/68 |
| Secret maps | 6/6 verified |
| Input-change guard | Zero changed input files detected |
| Audio QA freshness | Existing audio source hash still matches; no unnecessary audio rerender |

The regenerated files are validation/browser-check.json, validation/render-ground.json, validation/render-budget.json, validation/browser/*.json, validation/maps/*.json and the derived validation/campaign.json. The source sets recorded in those files match the tested working tree. Human completion was not awarded.

The job used HEAD 986c2a9 plus the explicitly recorded working-tree changes. It was not a clean tagged release commit; the tools accurately record dirty-source provenance alongside their source hashes. This report does not describe the uncommitted snapshot as a different committed release. No additional game repair, art bake or campaign expansion was performed.

Logs and provenance: review/codex-audit/evidence/SUMMARY.txt, run.json, 1-browsercheck.log, 2-browser-maps.log and verify/<ID>.log. The driver and wrapper both exited 0. These completed results supersede the stale-evidence status and outstanding-regeneration notes earlier in the report.

## Story and visual review

The pack's four jobs were handled in this chat rather than delegated. I reviewed the dialogue across both campaigns, all 68 intro/outro pairs, the continuity sheet, the ending and relevant canon. Objectives and cinematic stage directions were sampled rather than exhaustively compared with every trigger. The important software finding is presentation timing, rank 4: a coherent exported Record does not prove a coherent live reading experience.

Additional story notes, left unchanged:

- MINOR contradiction, C2M29: "The chain is gone: it falls" is followed at the end by "The heart has stopped on its chain." The phase transition and later narration need to agree on the chain's physical state.
- MINOR timing, C2M28: the exported main route receives "Pick them up before the first stroke" at 1:46, after the first stroke at 0:30. Advice that is already impossible to follow should be delivered before its deadline or phrased for the current state. Queue delay can make this worse.
- MINOR continuity, C1E3M05: "Another of the tall ones" introduces the wheel-bearing Acolyte at what the continuity sheet calls its first appearance. A first introduction should not imply an earlier lesson.
- NOTE on voice: numerical damage and geometry tutorials sometimes sound like a manual in HULL's mouth. Examples are C1E4M01 "Thirty if it catches you", C1E4M02 "A miss costs fifteen", C2M03 "4 m up", C2M13 "an oil a second" and C2M24 "a twentieth of a hit". This is a taste concern: precise teaching has usability value. It is not a correctness defect and I did not rewrite it.

Keep these lines intact: C1E1M01 "Signed for by no one" turns a count into absence; C1E1M02 "They take people. Then they file them" makes the bureaucracy concrete; C2M13's unfinished final log earns the later page; C2M23's correct voice and wrong ferry gives the player a verifiable clue; the ending's promise to stay on the air pays off the opening relationship.

All 24 images named by visual/INDEX.md were inspected. No supplied frame was skipped. Besides the unusable scene capture, the default weapon-strip labels and bottom-right counters are very small at 1080p, and long communications compete for attention during aimed combat. These are MINOR readability concerns for human testing, not measured accessibility failures. The completion and Journal frames also retain dimmed live overlays behind their panels; no actionable control was visibly obscured in those frames.

Keep these three frames: C1E1M01-arrival.jpg establishes the harbour and palette; C1E3M04-fight.jpg shows cover, enemies and a distinct ship interior/exterior setting; C2M29-hurt.jpg shows a boss, a moving threat, the lantern and surviving damage without losing the scene. Drop C2M24-scene.jpg from any showcase until a meaningful scene frame exists. The set still lacks close views of several weapon mechanics, readable accessibility settings and a cinematic frame that actually shows its camera work.

## Inspection limits

This was a focused architectural audit, not a line-by-line certification of all seven dense code bundles, all authored map geometry, every shader and all audio recipes. I inspected the live repository across simulation, saves, shell, UI, rendering, audio and release tooling, with deeper execution around failure handling. Searches for time/randomness in the simulation and render/audio state writes did not establish a new determinism defect.

During the initial audit, existing screenshots were inspected as supplied. The subsequently authorized headless browser/render evidence is recorded above. No real-GPU performance qualification, art bake, new audio-listening review or human playtest was performed. Headless SwiftShader evidence does not certify mixed audio balance, controller feel, frame pacing on other hardware, narrative comprehension during human combat, or the fun/fairness of the 68 maps.

The Windows environment denied direct execution of low.ps1 under its default execution policy. The launcher regression used a process-scoped ExecutionPolicy Bypass to test the child exit code. The later authorized evidence launcher supplied the same process-scoped policy through its environment so nested PowerShell jobs could run. No persistent execution policy was changed. The production driver reports launch failures rather than hiding them.

Reproduction scripts live under attack/codex/. This report records the remaining work; it does not authorize or implement the other nine repairs.
