# Gate 1 audit summary (HUSHFALL, Marrow Quay)

Audited commit 7bf03a9 (working tree held the lead's uncommitted FOV/brightness edits). I read all docs, code, tests, evidence and images, ran `npm test` (122/122), `validate`, `status` and read-only sim experiments. No browser was run, so browser-only claims are UNVERIFIED. Result: 0 verified BLOCKER, 15 MAJOR, 5 MINOR.

## Ranked findings

1. **F01 The level plays itself.** Bot damage is 0 in all six evidence runs. A bot that never fires finishes in 54 s taking 10/18/26 damage (easy/normal/hard). Enemies move 1.2-3.4 m/s against 6.4-9.9; one flare kills anything. Par 7:00, route 70 s.
2. **F02 The opening story is lost.** Transmissions collide with the 6.3 s title card and overwrite each other; a walking player sees only the third line. Tests report it as delivered.
3. **F03 Review images misrepresent the build.** The title card covers the centre of all 13 tour shots, `12-net-loft.png` uses an unreachable camera, the bundle includes pre-Marrow-Quay shots (KILLS 0/8, 0/9), and the README template hard-codes AGENT_VERIFIED and defaults to "no known defects".
4. **F04/F05 Enemies.** The plaza Gaunt shares a cell with a lamppost and moved 0.000 m in 12 s awake. AI freezes when sight breaks (0.00 m in 20 s), ignores being shot, and nothing body-collides with the player.
5. **F06 Load-then-Retry corrupts inventory.** Reproduced: save at 7 HP, load, Retry starts a fresh level at 7 HP with the scattergun.
6. **F07-F09 First minute.** Title says "engine skeleton build". No Use prompt or control hints. The pause menu clips at 1280x720 with Controls open and grows with the new FOV/Brightness rows.
7. **F10-F11 Art and layout.** Three interiors share one kit, the plaza is 44% of walkable area and near-empty, props sit on a lattice, and the ADS pose covers about 40% of the lower frame.
8. **F12-F13 Verification.** Frame-time stats are clamped at 100 ms, the budget check accepts 900 draw calls (measured 274; docs say 182), and awake-enemy cost is never sampled. `verify-map` hard-codes empty `knownBlockers` and a stale "engine-skeleton" note; AGENT_VERIFIED has no combat-viability test.
9. **F14/F15 UNVERIFIED, possibly BLOCKERs.** A rejected pointer-lock request (likely Esc-to-resume) latches drag-to-look for the session; default Fire includes Left Ctrl, so W+Ctrl is close-tab. Hand-test first.
10. **F16-F20 MINOR.** Dead "Load quick save" button, "Next: Customs Hall" leading to the title, wheel without accumulation, brittle deployment (absolute `/assets`, no WebGL or context-loss handling), a secret with no tell.

## Tests and claims

18 weak or mislabelled tests are listed. Worst: "different seeds diverge" passes with zero steps; "flare hit something" is true before any shot (fixture Gaunts have hp 24 < 45); "within par" cannot fail; "walking is faster than before" passes at the old speed; the "shipped map" reachability test loads the skeleton fixture; the browser check teleports past the first message. Nine documentation claims are unsupported or stale.

## Verdict

Not ready for a creative decision as packaged. The engine is sound and deterministic and the painted world is a promising base, but the user would be judging obscured screenshots, an evidence file that cannot record defects, and a level a passive player finishes in under a minute with half its story dropped. Fix first: (1) re-shoot evidence from one commit with the card dismissed and reachable cameras, and fill `known-defects.json` from this audit; (2) message queue, title text, first-minute prompts, pause overflow; (3) embedded Gaunt, sight-loss AI, retry inventory; (4) a runner-bot viability gate in `verify-map`, then tune threat until it fails; (5) hand-test pointer lock (Esc/Esc) and the Ctrl default in real Chrome. Then present.
