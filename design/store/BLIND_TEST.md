# The blind test: three strangers play Episode 1 (step 7 of the 2026-11-18 playtest list)

The outside playtest of 2026-11-18 (`design/audits/PLAYTEST_2026-11-18.md`) ended: *get three strangers to play Episode 1 blind on Normal and time them before building more.* A bot cannot say whether the first ten minutes teach, whether a fight is fair, or whether a level drags. This page is everything needed to run that test without me in the room. The owner runs it; the people are the owner's to find.

## Who
Three people who have **not** seen the game, heard it described, or watched it played. At least one who plays shooters often and at least one who rarely does. Nobody who knows the owner well enough to be polite about it.

## What they are given
1. **The build.** From a clean commit, `npm run package` writes `hushfall-web-<version>-<commit>.zip` to `D:/Doom_release` (outside the repo; checked on 2026-11-18: 178 files, 11.2 MB zipped) and `npm run check-dist` checks the build. On the owner's machine `npm run play` serves it; elsewhere, unzip it behind any static web server and send the link. A new browser profile, so they start as a stranger: no save, no settings, no hints seen.
2. **One sentence, and nothing more:** *"It is a first-person shooter in your browser; play on Normal from the first map for as long as you want to, and think out loud."* No controls explained: the game has to teach them (that is what is being tested).
3. **The play log on.** Before they start, the observer turns on Settings > *Keep a play log on this device*. When they finish, the observer presses Export and keeps the file. It holds no name (`src/game/playlog.js`).

## The rules for the observer
- **Do not help.** No hints, no pointing, no "try the other door". If they ask, say *"what would you try?"*. If they are stuck for **five minutes**, note it and only then tell them one thing, and write down what you told them.
- Sit behind them, not beside them. Do not react to deaths.
- Stop when **they** want to stop, or after Episode 1 (eight maps), or after 90 minutes, whichever comes first. Why they stopped is the most useful answer of all.

## The sheet (one per person; copy it)

| | |
|---|---|
| Person (A, B or C) | |
| Plays shooters: often / sometimes / rarely | |
| Mouse and keyboard, or a pad | |
| Machine (and does it stutter?) | |

| Map | Started (clock) | Finished (clock) | Deaths | Where they died (room, what killed them) | Stuck? (where, how long) | What they said out loud |
|---|---|---|---|---|---|---|
| C1E1M01 Marrow Quay | | | | | | |
| C1E1M02 Customs Hall | | | | | | |
| C1E1M03 Fishmarket Rows | | | | | | |
| C1E1M04 The Drowned Chandlery | | | | | | |
| C1E1M05 Lamplighter Hill | | | | | | |
| C1E1M06 Ferry Terminal | | | | | | |
| C1E1M07 Signal House | | | | | | |
| C1E1M08 Bell Tower of St. Orrin | | | | | | |

**The first ten minutes (tick what you saw them do without being told):** aimed down the sights · used the quick melee · ran · switched weapons · read the objective line · opened the Journal or the map · noticed a creature's warning before it struck · understood the peaceful Vael before shooting one (Episode 1 has none; skip) · found a secret.

**After they stop, ask these and write their words down, not yours:**
1. What was the game about?
2. When did you first feel you knew what you were doing? When did you feel lost?
3. Which fight was unfair, if any? Why?
4. Was there a moment you wanted to stop? What kept you going (or didn't)?
5. Would you play the next episode? What would make you?

## What each finding decides
| If they | Then |
|---|---|
| never aim, run or melee in the first two maps | the lessons (`src/game/hints.js`) come too late or too quietly |
| get lost on a map (stuck five minutes) | that map's objective line and its first sight of the way on (`design/OPENING_VIEWS.md`) |
| die three times or more in one room | that room is a spike: compare with `node tools/dev/burst-report.mjs <ID>` |
| take a hit they say they never saw coming | the creature's tell at that distance (`tools/dev/probe-read.mjs`) |
| finish Episode 1 in under 25 minutes, or take over 2 hours | the length and the par times (`par` in each map source) |
| say "it dragged" twice on the same map | that map's longest walk with no fight (`node tools/dev/director-audit.mjs --routes`) |
| stop before the Bell Tower | why they stopped is the finding: write it down word for word |

## What to send back
The three sheets and the three exported play logs, into `design/audits/BLIND_<date>.md` (the words) and kept out of git (the logs). Nothing changes in the game until all three have played.
