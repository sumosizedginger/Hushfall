# HUSHFALL, THE COMMERCIAL FINISH LINE AND THE WORK QUEUE FOR LOW USAGE (PT-049, 2026-10-14)

The owner, with 8% of their weekly usage left, asked what to discuss and how to update the plan so the work can run when usage returns. Their answers: the finish line is **a commercial release**; the first session after the reset is **my choice**; the big new systems of the Director's Plan (ammo loads, weapon mods, Marksman and Mender, cinematics) **keep the plan order as written**; and the things that hurt the fun most are the crosshair, the hurt flash, lighting, faceless enemies, hard-to-read bosses, and a new one: they do not know when they pick something up or how important it is, and message text sits on screen while the game runs at full speed, so it cannot be read ("a menu or something like in an RPG that shows you a minimap, objectives, basically everything except exactly what to do"). Nothing here is built. The visual plan is `design/VISUAL_DIRECTION.md` (the information workstream U is its section 10); the road to the end is `design/ROADMAP.md` (section 0.9 points here).

## 1. How to resume cold
`git status`, `git log --oneline -8`, the top of `PRODUCTION_LOG.md` (the 2026-10-15 state paragraph), then section 0 of `design/VISUAL_DIRECTION.md`. (Updated 2026-10-18: sessions A, B, H1, H2 and H3 are done; the next task is **R1**, finish the director's audit and the ratchet test, then **R2**, the roster-and-encounter pass: see `design/ROADMAP.md` 0.12 and the plan page, section R.) The repo is pushed and tidy (GitHub main = 8dcf0e3; `.git` 11 MB; the game about 18 MB; what moved out and how to restore it: `design/ARCHIVE_INDEX.md`). No sub-agents, no re-exploring settled ground.

## 2. The finish line: a commercial release (workstream M; replaces the thin "release candidate" stage)
The 68-map target stands; nothing here reduces it. What a store needs and the game did not yet plan for:
| # | Item | Who | Kind |
|---|---|---|---|
| M1 | **Name.** Search "Hushfall" on Steam, itch.io and the trademark registers (USPTO, EUIPO) before any art or marketing money is spent; keep two fallback names | owner | before anything else is paid for |
| M2 | **Licences.** A LICENSE (proprietary terms), `THIRD_PARTY_NOTICES.md` (three is MIT and the only shipped dependency; vite, p5, p5.brush, pngjs and puppeteer are dev-only; the baked art is our own output; no stock assets), a production-dependency audit script, a credits screen. Today there is no LICENSE or README; `package.json` says ISC, private | me | doc and node, cheap, early |
| M3 | **Packaging.** The web build for itch.io (`npm run build`, `base: './'`); a desktop wrapper (Electron or Tauri) for Steam later; save compatibility between builds. Recommendation: itch.io web demo first, Steam after | me, then a decision | node plus one run |
| M4 | **Performance and compatibility.** A minimum spec (an integrated GPU at 720p, 60 fps), an automatic quality fallback when frame time passes the budget, the 81-creature stand and the largest maps. Every browser test so far is Chromium on SwiftShader: Firefox, Safari and real GPUs are untested, so the owner's machine and one low-end laptop are the evidence | me and owner | needs real hardware |
| M5 | **First-run experience.** The first map teaches through the Journal and prompts; difficulty copy; Continue and save sanity; controller prompts | me | with workstream H |
| M6 | **Accessibility.** Crosshair options (V2), message size, reduced flash (the hurt-flash curve, the beat and tremor cues), colour-blind-safe cues for keys and rings, rebinding (exists) | me | with V and U |
| M7 | **Stability.** A crash and error log the player can export (BUILT 2026-10-18: `src/game/errorlog.js`, the crash screen), save-migration tests, a browser and resolution matrix | me and owner | node plus hardware |
| M8 | **Audio.** The listening pass (workstream G), the chainsaw voice (S1), loudness across sounds and music | me and the owner's ears | each render a named yes |
| M9 | **Store assets.** Screenshots and a trailer captured on the owner's real GPU (not SwiftShader), key art from the title painting, a short description, a price and demo plan. Recommendation: a free demo of Campaign 1 Episode 1, the full game paid | owner decides, I supply captures | late |
| M10 | **Legal and admin.** Entity and tax, age-rating questionnaires, store fees | owner | not mine |
| M11 | **Outside players.** 5 to 10 testers on a private itch.io link, an opt-in play log (workstream I) and a short form | owner recruits, I build the log | before the paid release |
| M12 | **Release gate.** Only the owner awards COMPLETE; a push only on their word | owner | unchanged |
| M13 | **Developer key.** When the build is finished (after RC1, never before): a code map for other engineers: `ARCHITECTURE.md` (the layers and the flow sim -> events -> render, audio and UI), the map format, how to add a creature, a weapon or a map, a glossary, a tour of the tests and tools, licence and contribution notes. Until then the repo keeps only what the game and its assessment need (`design/ARCHIVE_INDEX.md`) | me | after RC1 |
Commercially, strangers will not play on Easy: Normal and Hard balance (Bot v2, the Director's Plan P2) matters more than it has so far.

## 3. The work queue, sized for low usage (the builder's order; each session ends stop-safe)
Sizes: S about one short session, M one long session, L two (first guesses). Every session ends with tests green, a local commit, a PRODUCTION_LOG line with the exact next task and nothing half done. A push happens only on the owner's word.
| Session | Scope | Size | Window jobs (ledger in VISUAL_DIRECTION.md section 6) | Owner needs |
|---|---|---|---|---|
| **Session A: quick wins** (my choice for the first one) | F1 fork wall impact (DONE 2026-10-18); V1 hurt flash (node half DONE 2026-10-18); V2 crosshair, toast column, title and controls text (DONE in code 2026-10-18; only the owner's play and the capture jobs are left) | M | J1, J2, J17 (capture, covered by the 2026-10-14 yes) | try them in play |
| **Session H1: hardening, saves and the frame loop** | (DONE 2026-10-18: the save family, the frame-loop guard, the void)  prove the void softlock on a REAL route (a vent miss with the bot), then the save family: one strict validator, `loadWorld` never throws, a rejected slot is set aside; the frame-loop guard with an exportable error log; Grok's 16 contract tests go green (`design/HARDENING.md` section 2) | M | none (node only) | nothing |
| **Session B: reading and pickups** | U1 pickup cards (DONE in code 2026-10-18); U2 (DONE in code 2026-10-18) the message log, unread badge and priority; Tab opens the Journal and pauses (no clock change for text, decided 2026-10-15) | M | J18 | play |
| **Session H2: hardening, economy, weapons, input** | (DONE 2026-10-18: five fixed, two closed as not bugs) the dry feed, the Brood Vat total, script spawns, the mortar through walls, the weapon step, an infinite yaw (`design/HARDENING.md`); `route-fingerprint.mjs check` after each | M | none (node only) | nothing |
| **Session C: the Journal and the minimap** | U3 (and U3b if affordable), U4 | L | J19, J20 | play |
| **Session D: light** | V3 gun in the place's light; V4 tone shoulder; V5 480 against 640 | M | J3 to J5 | a word on 640 |
| **Session E: the chainsaw's voice** | S1 | M | J16 audio renders (a named yes each round) | LISTEN, say yes or no |
| **Session F: commercial groundwork** | M2 licences and notices, M3 packaging note, M4 performance harness | M | none or one | the name search (M1), a low-end test machine |
| **Session H3: hardening, GPU leaks** | (DONE 2026-10-18, measured in the real page: two real leaks fixed, two not leaks) the chime, tide, beam and sweep views and the Brood Vat corpses; extend the browser check's leak test to reload those maps many times | S | the browser check (a named yes) | the yes |
| **Session G: floors, fists, faces** | V6 to V8 | L | J6 to J10; bakes J7, J9 need a named yes | play |
| **Session T2: the tidy, part two** (only after the evidence regeneration) | retire the frozen look demo (`look.html`, `src/look`, `shoot-look`, the npm scripts `look` and `shoot`, recipes only it uses) after checking what the bake still needs; fold the one-off `shoot-ptNN` scripts away; trim `review/gate-1` and `gate-2` to the files tools read; a test that holds the repo layout rule (`AGENTS.md` "Repo hygiene") | S | none | nothing |
| **Then, in the Director's Plan order as written** | P1 Measure, P2 Bot v2, P3 Weapons (mods, loads), P4 Exemplars, P5 and P6 level rollout, P7 Enemies and bosses with V9 and V10, P8 and P8b Story and cinematics, P9 Sound and the look sign-off (V11, V12), P10 Release (now M) | XL each | the single regeneration J15, bakes | play at each exit |
The evidence regeneration stays ONCE, after the last visual and map change (any change in `src/render`, `src/game` or `assets/baked` stales every map's real-game evidence).

**Revision 9 re-order (2026-10-18, the plan page section R and `design/ROADMAP.md` 0.12):** the level work moves ahead of the weapons and of the floors-and-faces art, and Session C moves after the exemplars. New order of what is left: R1 finish measuring (M) · R2 the roster-and-encounter pass, node only, Episode 1 first (XL) · R3 the four exemplars (L) · R4 Session C (L) · R5 Bot v2 first half (L) · R6 Level B (XL) · R7 Level A on Campaign 2 (XL) · R8 Marksman and Mender (L) · R9 weapons: loads, then mods (XL) · R10 boss changes (M) · R11 sessions D and G, V9, V10 (XL) · R12 session E (M) · R13 story and cinematics (L+L) · R14 sound pass and look sign-off (L) · R15 session F and M1 to M12 (XL) · R16 integration, the one regeneration, T2, RC1, M13 (L). Sessions A, B, H1, H2, H3 are done. The audit and the triage of all 68 maps are in `design/DIRECTOR_AUDIT.md`.


## 4. The working protocol for low usage (what I commit to)
- Start each session from the top of `PRODUCTION_LOG.md` and section 0 of `design/VISUAL_DIRECTION.md`; no sub-agents; no re-exploration.
- Judge frames by numbers (`tools/dev/lumstats.mjs`, a crosshair-contrast tool, pure-function tests) and read at most about six frames or contact sheets per job. Image reads were the most expensive thing of the last session.
- Batch tool calls; no repeated whole-file reads; republish the plan page only at the end of a session; run the full 105-minute suite at most once per push.
- Effort level: the owner's `~/.claude/settings.json` sets effort "xhigh" and model "opus". Sessions A, F and most of B are mechanical (tests, settings plumbing, documents) and a lower effort costs less; sessions C (layout), E (sound design) and G (faces) are where xhigh is worth it. That setting is the owner's to change.
- At most three decisions asked per session, each with a recommended default.
- Never put backticks inside a double-quoted shell or `node -e` string; write text with the Write tool and read it from a file.

## 5. What to discuss next (cheap to answer, each with my recommendation)
1. Demo and price: a free Episode 1 demo and a paid full game (recommended).
2. Platform order: the itch.io web build first, Steam through a desktop wrapper afterwards (recommended).
3. The cut line if usage runs short: ship what is best first (Campaign 1 and Acts A and B at the highest polish) and finish the rest in later updates. The 68-map target stays; this is only an order.
4. The result of the name search (M1) and which fallback names to keep.
5. (Decided 2026-10-15: slow-while-reading is dropped; the player pauses to read.) Still open, default NO: should a found document open a pausing reader?

## 6. What I need from the owner, when they are back
Play Session A's results and say whether it is still fun; run the name search (M1); say yes or no to the chainsaw WAVs when Session E renders them; a veto on anything here. Nothing blocks the node-only parts.
