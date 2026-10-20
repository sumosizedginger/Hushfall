# Story coherence pass, reading notes and what was done (R17, 2026-10-20)

Working file. The first full read of `RECORD.md` (653 messages, 14,700 words, both campaigns, the cards and the cinematics) found the defects below, by kind. Each line says what was done and where. The edits are tables: `tools/dev/story-pass-2.mjs` (rewrites, deletions, reminders), `tools/dev/story-voice.mjs` (contractions); the engine feature is the message field `unless`; the ceilings that keep it fixed are `tests/story-coherence.test.js` and `tests/message-unless.test.js`; the facts are in `CONTINUITY.md`.

## Systemic (the same fault in many maps; fixed by rule)
| # | fault | measured | done |
|---|---|---|---|
| S1 | the next-map teaser said twice (the last operator line and the Outro) | 7 maps | the operator line cut or made local and distinct; `story-stats` `dupOutroMessage` = 0, held by a test |
| S2 | the intro card, the opener and INES saying the same thing | 3 maps (and the Outro of C2M17, C2M18's opener) | one of each pair rewritten; `dupIntroMessage` = 0, held |
| S3 | the "Whatever ..." tic | 30 lines | 0 (ceiling 2) |
| S4 | "Nobody / No one" | 39 lines | 34; the rest are the point (the manifest, the cold open, the ending, the echoed opener); ceiling 36 |
| S5 | "Episode three", "the first act" in the fiction | 5 lines | 0, held |
| S6 | the opener template "Calder, the <Map>." | 21 lines | 1 ("Calder, the Choir grows ..."), ceiling 1 |
| S7 | the Graft-Mother as it / she / the Mother | 4 lines | "it", and objectives name the Weeping Mother in full (held) |
| S8 | item pickup lines with advice | 9 lines | read and kept: each says what the thing is and one fact about it; the Journal's Items page carries the how-to-use |
| S9 | Warden Calder speaking as if present | 3 lines | speaker "WARDEN CALDER'S NOTE" (the Record sets notes apart); held |
| S10 | **no contractions in 600 spoken lines** (one in the game), so INES and the operator read as written, and the Tender's own mark (no contractions) meant nothing | 1 in 600 | `story-voice.mjs`: 105 lines of INES, SIGNAL HOUSE and the lamp-hill survivors loosened by rule and a stable hash (not all: some stay formal, vows and dry lines are protected); HULL, the Silent, the Tender, plates, logs and cards stay formal |
| S11 | a voice naming a key or a screen mark ("The lantern is L", "The mark on the screen") | 4 | 0, held; the objective line carries the key |

## Contradictions and unexplained terms
| # | fault | done |
|---|---|---|
| C1 | the lighthouse lamp "dark" (S01 intro) against the operator keeping it lit | S01 intro: "a lamp that flashes for no ship"; the operator is at the lighthouse on a battery set, so she keeps it lit by being there (C1E1M01, C1E1M07) |
| C2 | who the Lighthouse Keeper is | Ines's grandmother, who kept the light before her son (C1E1M04 secret "I kept this light before him", C1E1S01 "I kept this cellar, and then your father did") |
| C3 | "the firing", never defined | retired; "the kilns were lit" (C1E2S01, C1E2M02); held by a test |
| C4 | how the operator knows the insides of places | she has the plan sheets (C1E1M02, C1E2M01) and from the ship on reads the Vael hum (C1E3M01); consistent with "on no plan I have" (C1E4S01) |
| C5 | INES calling herself "Calder" (C1E2S01) | removed |
| C6 | drones / hatchlings / Gills | "Gills" |
| C7 | the plated enemy is a Tide-Warden and nobody says so | one line at the first (C1E1M06: "Somebody on the Board wore that, once.") |
| C8 | "the Mother" for two creatures | objectives name the Weeping Mother / Graft-Mother in full; the note in CONTINUITY section 3 |
| C9 | a Tide-Warden's message in orbit | "They took me up the cable." |
| C10 | the Marrow Girl taken "through the Gate" before Ines opens it | "the sea opened under the keel"; held by a test |
| C11 | INES says "the Fields, she said"; the Tender never said it | the Tender now says "Go on to the Fields" |
| C12 | PELLEW's name on a fork plate (C2M04) while she writes logs to day 16 | AMBLER, T. BOSUN; held by a test |
| C13 | the outros shift from "you" to "her" | C2M11, C2M14, C2S02 rewritten in the second person |
| C14 | the Drowned wear Marrow boots long before Marrow's taking | read: they are the first night's people (LORE 2b); no change |
| C15 | "sixteen singers" against "nine singers in three tiers" (C2M24) | nine; held |
| C16 | **the call sign SIGNAL HOUSE and the map "Signal House"** | the operator is at the lighthouse; the Signal House is the ridge station with no mains (CONTINUITY section 1) |
| C17 | **the goal of Campaign Two is not on the main path until Act D** (the Tender's account is in a secret) | C2M08 INES at the spire: "I think that is what holds the Gate open. I am going down." |
| C18 | why Ines goes from the Bell Tower to the Salt Works, and from the Choir ships up the cable | C1E1M08 "I have its bearing: the Salt Works"; C1E4M01 "the call went up with it" |

## Order and logic (a reminder said after the thing it reminds of)
Fifteen reminders, one pattern: a position message about a locked gate that fired after the gate was open (C1E1M07 the cold radio, C1E1M08 "one bell down", C2M03, C2M09, C2M13, C2M17, C2M18, C2M19, C2M20, C2M21, C2M22, C2M25, C2M26, C2M27, C2M28). Fixed by the new message field `unless` (engine, validation, and `tests/message-unless.test.js`: each reminder is said to a player who comes early and held once its gate is open); the delivered-message checks do not require a reminder.

## Left for the readers (R18) and the director
Taste: the share of INES lines that open with a noun-phrase fragment ("A hall of cold marble ...") is about half, which is her voice and also a habit: the outside readers are asked to say where it tires. The Silent in the Mourning Halls: the plate says 6 (written again as 4), the text shows 3 or 6. The Tender's S01 account repeats a little of what the plates say. None of these is changed without a second opinion.
