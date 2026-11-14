# HUSHFALL: everything left to do (written 2026-11-14)

One list of what stands between the game as it is and a store release. Each item says who does it, where its instructions are, and whether it needs a browser job (which always needs the owner's named yes). The visual work has its own handoff (`design/VISUAL_AWE_HANDOFF.md`) and is only summarised here.

Sources: `design/OPUS_HANDOFF.md` (sessions), `design/ASSESSMENT_2026-11-10.md` (the change list by id), `design/VISUAL_AWE_PLAN.md`, `design/RELEASE_QUALITY_PLAN.md` (phases 14 and 15), `design/COMMERCIAL_AND_USAGE_PLAN.md` (workstream M), and the top of `PRODUCTION_LOG.md`.

## 0. Where the project stands

- 68 of 68 maps built. The owner has played Campaign 1 Act 1 and is in Act 2. `COMPLETE` (human-reviewed) is 0 of 68: only the owner's review awards it.
- `master` in `D:\Doom` is many local commits ahead of GitHub. Nothing has been pushed since 2026-11-01.
- Every map's browser evidence is stale (render code, one look and one map changed on 2026-11-13/14). `npm run status` will say AGENT_VERIFIED 0 of 68 until the next regeneration.
- The fast suite was green at 1693 of 1693 on 2026-11-14.

## 1. The order I recommend

1. Finish the visual work (section 2).
2. Things the owner should judge by playing (section 3): they may change what gets built.
3. Level content left from the earlier handoff (section 4).
4. Small code and safety items (section 5).
5. One evidence regeneration and a push (section 6).
6. Release work (section 7).
7. After release (section 8).

Play reports from the owner outrank this list at every step: log them in `PLAYTEST_NOTES.md`, fix them, then come back.

## 2. Visual work (builder; several short browser jobs)

Full instructions: `design/VISUAL_AWE_HANDOFF.md`.

| Item | State | Browser |
|---|---|---|
| Hand-rebuild the view on Marrow Nave, Hollow Stair, Bell Tower, Gate Warden | not started; what to do on each is written | one shoot of all four |
| The next five weakest maps after those | not started | one shoot per batch |
| Wall bands on tall walls, and a second colour per place (A8) | not started; a shader change | boot check, then a shoot |
| Grey skies repainted (`sky_overcast`, `sky_bleach`) | not started | a bake |
| A short moving capture to judge embers, dust, swinging lamps | not started | one capture |
| Reshoot all 68 hero frames and compare with the baseline | not started | one 10-minute shoot |
| Room accents, continuing (13 maps done) | in progress: `design/OPUS_HANDOFF.md` session 12 | none |
| Store pictures and the trailer made again on the final build | not started | several jobs |

## 3. For the owner to judge by playing

None of these can be settled by a test.

- **The seven ambushes added on key-hunt walks** (Pump Cathedral, Choir Loft, C2M01, C2M06, C2M09, Undercantor Halls, Hive-Song Approach). They were added to satisfy the "no quiet walk over 90 m" rule. Fun or annoying?
- **Hive-Song Approach's timed waves.** Two waves fire at 171 and 186 seconds once the key is held, tuned to the bot's pace. A slower player will get both the instant they pick up the key. If it feels cheap, replace the timer with a place trigger on the last crossing.
- **The ten new key hunts** (C1E2M06, C1E3M06, C1E4M07, C2M01, C2M06, C2M09, C2M11, C2M12, C2M13, C2M17).
- **Far-off enemies.** They are now drawn in two flat tones past about 9 m. Readable, or washed out? (The tone threshold averages the creature's whole paint sheet, which has dark unused space; `FAR` in `src/render/entityflag.js`.)
- **The new lighting** on levels already played: darker rooms between lamps, sun shadows outdoors, haze, lamp glow.
- **Rail Yard and Bell Tower on Normal**, both eased (116 to 76 and 144 to 105 damage to the test bot).
- **The music and sound.** All eight themes and every sound are measured by machine and have never been judged by ear in play past Episode 1.
- **Everything from Campaign 1 Act 2 onward**, which the owner has not yet played.

## 4. Level content left (builder; node only unless noted)

From `design/OPUS_HANDOFF.md`, sessions left on purpose because they change played roads:

- **Sessions 6 and 7: four mechanics get a second required use.** Mirrors, timing platforms, the tide and rail cars each appear on the required path of one later map. The owner confirmed these four. Do one map at a time and have the owner play it.
- **Sessions 8 and 9: the level-floor exceptions.** About 20 of 62 main maps carry a written exception; the ones excused only because "the bot refused more" need a hand-cut ambush closet each, or an honest reason about the map. Target: 10 or fewer.
- **Reading load (session 11, measured only).** 12,127 words across 62 main routes, the heaviest fifteen all in Campaign 2 (Mourning Halls most at 375). No line was moved, because the game has no way to show a found document off the road: a "document" is only a speaker name. Reducing the reading needs a small shell feature (a readable prop) or cuts to non-protected lines, and it is the owner's call whether it matters.
- **Lamplighter Hill is flat from Easy to Normal** (60 and 70 damage). Left alone as within noise; revisit only if the owner finds Easy too hard there.

## 5. Small code and safety items (builder)

- **A Content Security Policy.** There is none in `index.html`, the local server or the desktop wrapper. The game makes no network calls, so it can be strict (scripts and styles from itself, WebAssembly allowed for the stats database, no outside connections). It matters most for the desktop wrapper. It edits `index.html`, so do it before the regeneration.
- **A test for the stats import:** feed it a database whose text fields hold HTML and confirm the page shows it as text. Test only.
- **Event gaps found by the event catalogue test** (`tests/event-catalogue.test.js`, its `KNOWN_GAPS` list): events with no sound or no caption decision. Read the list and decide each.
- **Props are not darkened by the lamp bake** (their materials are shared), so a crate in a dark room may look too bright. Fix only if a frame shows it.
- **`tools/dev/low.ps1`** fails to write its log when the log's folder does not exist. Make it create the folder.
- **Firefox and a weaker machine.** Nothing has been tested outside headless Chrome on the owner's desktop. One pass each (by hand or a probe), with the numbers written into `design/PERFORMANCE_PLAN.md`. The sun shadows and the glow are the things most likely to cost frame rate on a laptop; both drop on the quality governor's effects rung.

## 6. The regeneration and the push (owner's word for each)

- **One evidence regeneration** when the visual, content and code work above has settled: `GPU=1 npm run regen` through `tools/dev/low.ps1`, from a clean commit, nothing edited while it runs. It takes 90 to 170 minutes. It must end at AGENT_VERIFIED 68 of 68 with the pointer-lock count at 0. A later change to `src`, `index.html`, `vite.config.js`, `package-lock.json` or `assets/baked` stales it again, so do it once, late.
- **Push to GitHub** on the owner's word.

## 7. Release work (mostly the owner's)

From `design/RELEASE_QUALITY_PLAN.md` phases 14 and 15 and workstream M:

| Item | Who | Notes |
|---|---|---|
| Play the whole game; a friend plays too | owner | The play log and the five questions after each map are built in; the tester brief is `design/store/TESTERS.md` |
| Record `COMPLETE` per map from that review | owner | Never by an agent |
| Triage and fix what the play finds, then a second regeneration | builder | Check each report against the game before fixing |
| Name clearance for "HUSHFALL" | owner | A trademark and store search |
| Price, and a store account (itch.io or other) | owner | |
| The licence | owner | `LICENSE` is a draft: fill in the holder and the terms |
| Credits names | owner | `src/game/credits.js` `PEOPLE`; editing it stales the evidence, so do it before the last regeneration |
| Age-rating answers | owner, with the builder | `design/store/` has the draft answers; update for the current content |
| Store page copy, pictures, trailer | builder drafts, owner approves | Reshoot on the final build; the store pictures on disk are stale |
| AI disclosure on the store page | owner | The credits already say an AI agent wrote the code, text and the programs that paint and synthesise; stores ask for this |
| The web build | builder | `npm run package` (a zip in `D:\Doom_release`); `npm run check-dist` |
| The desktop wrapper | builder, then owner | `tools/desktop` is a prototype: installers, code signing, Steam and auto-update are not done |
| Accessibility check by someone who needs it | owner | Captions, text size and reduced motion exist; nobody who relies on them has tried them |

## 8. After release

Deferred on purpose, with the owner's agreement (2026-11-10):

- **The large refactors:** split `updateEnemy` (347 lines) into ordered behaviour steps, divide `src/game/main.js` and `src/render/view.js` (about 2,000 lines each), split `defs.js`, type the event and save contracts, narrow what stales the evidence. They change nothing a player sees and each one stales every map. Do them first only if a second programmer joins or a bug takes more than a session to find because of those files.
- **Project 2, the engine** (`design/ENGINE_PROJECT.md`): starts after the game is finished and played; the refactors above are its first steps.

## 9. Decisions already made (do not reopen)

- Hard stays very hard.
- Not a Doom copy: the sprint lockout, the sights' slowdown, spread, parry, loads and mods stay.
- Easy keeps every creature Normal has.
- The 68-map count stands.
- The mallet, carbine and line-thrower stay in Episode 1.
- The simulation clock is never slowed for text.
- All art is made by code; no outside or hand-painted art.
