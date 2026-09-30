# Gate 1 review bundle: Marrow Quay (C1E1M01)

Generated 2026-09-30T01:27:08.045Z by `node tools/gate1-bundle.mjs` from repository evidence. Code: `d10df0f`.

Evidence provenance: browser check, map evidence and audio QA are all stamped with the same commit as the code (`d10df0f`).

## Decision requested
**APPROVE DIRECTION**, **REVISE DIRECTION**, or **STOP PROJECT**. Approval means the creative direction may expand into Gate 2 (a full episode). It does not mark the map COMPLETE, erase the known defects below, or override any failing test. Silence is neither approval nor rejection.

## Two ways to look
- **Screenshots** (`screenshots/`, 25 images): appearance only. Each was taken with the title card and transmissions cleared, from a position a player can stand in.
- **Play it:**
```bash
npm ci
npm run dev        # http://localhost:5173/  (click a difficulty; click the game once to capture the mouse)
```
Controls (all rebindable in Pause > Controls): WASD move, mouse look, left click fire, right mouse aim, Shift sprint, E/Space use, 1/2 or wheel weapons, Tab automap, F5/F9 quick save/load, Esc pause. Listen: `review/audio/*.wav` (nobody has yet).

## Where the campaign stands (read from validation/campaign.json)
C1E1M01 derived status: **AGENT_VERIFIED**. PLANNED 67 / IMPLEMENTED 0 / AGENT_VERIFIED 1 / COMPLETE 0 of 68. Agents cannot award COMPLETE.

## What exists
Deterministic headless sim; map format; saves (v6, migrations from v1); input layer with remapping, sprint and aim-down-sights; procedural audio; two weapons (flare cannon, scattergun); three enemies (Tollbearer, Gaunt Runner, Bellhand: hunting AI, wake/alert/noise, cover, ranged toll-shot); automap; water/skins/scenery; one real level with story beats, a secret, a keyed door and a par time.

## What is proven (by evidence)
- Automated tests: **151/151 pass** (`test-results.json`).
- Real-browser checks in headless Chrome: **66/66** (`validation/browser-check.json`): real key/mouse input, an un-teleported walk that delivers the opening transmissions in order, prompts, quick save/load, pause layout at four window sizes, WebGL-unavailable handling, Node-vs-Chrome identical state hashes, save/load, death/restart, remap flow, automap, GPU-leak check.
- Level viability (`play-path.json`): a passive runner that never fires ends easy: bot-failed (45 damage), normal: bot-failed (77 damage), hard: dead (109 damage); a perfect fighter completes on every difficulty taking 24/54/80 damage (easy/normal/hard).
- Audio QA: each effect rendered alone is finite, non-silent and below full scale (`audio-qa.json`). It does NOT measure the mixed output.
- Draw calls and triangles at five vantage points, including all-enemies-awake, are compared with a recorded baseline (`performance.json`). Structural counts only.

## What remains uncertain (honest list)
- **Real-GPU performance is unmeasured.** Headless software rendering only; the 60 FPS target is unverified.
- **Pointer lock and mouse feel** cannot be granted in the automated environment; the Esc -> Resume -> click flow needs a hand test in real Chrome.
- **Audio has never been heard by a person.**
- **Balance and feel are bot-tuned.** The bot has perfect aim; the Bellhand toll-shot has not been read by a human.
- **One level only.** Nothing here proves 68 maps of this quality are achievable; that is what Gate 2 is for.

## Independent audit and known defects
An independent adversarial audit of commit 7bf03a9 (`review/gate-1/audit/`) found 0 verified BLOCKER, 15 MAJOR, 5 MINOR. All were addressed; what is still open, partial or unverified is listed here from `known-defects.json`:
- Open/partial/unverified: BLOCKER 0 · MAJOR 5 · MINOR 2 (of 24 recorded; 17 fixed)
- **MAJOR** [partially-fixed] The spaces still read as one kit on a flat grid — remaining: There are still only two wall skins and one interior floor; every floor is y=0. Level layout variety beyond this is Gate 2 work (the production kit), and is the main creative risk to judge in the screenshots.
- **MAJOR** [open] Real-GPU performance is unmeasured — remaining: All measurements are headless Chrome on software GL. Nothing here says 60 FPS on a real machine. Needs a run on real hardware.
- **MAJOR** [unverified] Pointer lock has never been exercised in a real browser session — remaining: Headless Chrome cannot grant pointer lock; the Esc -> Resume -> click flow must be hand-tested in real Chrome.
- **MAJOR** [unverified] Balance and feel have never been played by a human — remaining: The bot has perfect aim and never misjudges. Enemy speeds, damage, the Bellhand toll-shot readability, ammo and health flow were tuned with bots and unit tests only.
- **MAJOR** [unverified] Audio has never been heard by a person — remaining: 36 effects and 2 score renders exist as WAV files for listening (review/audio/); mix-level loudness and music-versus-effects balance are not measured (audio QA renders each effect in isolation).
- **MINOR** [open] Par time (5:00) is a placeholder — remaining: It is 2x-8x the bot's time by a test; no human run has informed it.
- **MINOR** [open] Only one level exists — remaining: Nothing here proves 68 maps of this quality are achievable; that is precisely what Gate 2 would test.

## Files
`test-results.json` `performance.json` `known-defects.json` `play-path.json` `audio-qa.json` `build-info.json` `audit/` `screenshots/`
