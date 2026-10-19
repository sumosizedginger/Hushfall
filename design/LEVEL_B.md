# LEVEL B, AS BUILT (2026-10-19, the Director's Plan R6; node only, nothing seen in a browser)

The plan said "the ten structural maps". The audit had put ten maps in the tier `B structural` by blunt rules (long, sparse, symmetrical, one-note). Reading the ten briefs (the header of each map source) before touching them
changed the plan, because **five of the ten call themselves SET-PIECES, two are designed to be what the rules call a fault, and only three are really too big for what they are**:

| map | its own class | audit said | what was done |
|---|---|---|---|
| C2M26 Silent Roots | COMPRESSION, yet 100 x 100 cells | 5605 cells, 36 creatures, density 6, the sparsest map | **SQUEEZED on both axes** (16 columns and 18 rows out, where nothing stands and no stair runs): 84 x 82, 3776 cells, density 10; the encounter pass: two ambushes, a Gill and a Chorister for two Gaunts (shooters 17% -> 22%); every route completes on all three difficulties with the standing bot |
| C2M04 Tuning Fork Fields | MIXED | 2698 cells, density 13, no ambush | **SQUEEZED on both axes** (13 columns, 11 rows): 67 x 67, 2031 cells, density 18 (the law); the encounter pass: two ambushes, a Bellhand for a Gaunt; every route completes standing |
| C2M10 Echo Markets | COMPRESSION, a ring bazaar | 3121 cells, density 9, six empty rooms | the encounter pass: **one ambush**; NOT squeezed: forty peaceful Vael stand in the columns the scan wants to cut (six free columns in 88), and the crowd is why the density number looks low (they are not combatants) |
| C2M18 Nerve Cathedral | SET-PIECE (a lattice with pulses on a clock) | ambush 1 | **one ambush** added; layout kept; every law met |
| C2M27 Fault Line | SET-PIECE (a front of falling stones, a metre a second) | no ambush | **two ambushes** added; layout KEPT ON PURPOSE: the road's length IS the clock (a squeeze would shorten the run the front chases); every law met |
| C1E2M02 Evaporation Pans | SET-PIECE (the open crossing of Episode 2) | 65% Tollbearers, 9% shooters | the roster: Tollbearers 35 -> 26 (48%), Bellhands 5 -> 11 (shooters 20%), Gaunts 14 -> 17; layout kept; two laws still wait (the cap at 48% of 45, three kinds) |
| C2M12 The Drowned Choir | SET-PIECE | 66% Tollbearers | **left as it is**: the Drowned (Tollbearers in water-colours, one in every stall) are the theme; turning seventeen of them into Gaunts made drowned Gaunts, so the pass was reverted |
| C2M14 Harmonic Gardens | SET-PIECE (the first sound puzzle) | sparse, three empty rooms | **left as it is**: a puzzle map is calm by design and every law is already met |
| C2M15 Ash Basilica | COMPRESSION, an elite gauntlet | density 9, no ambush | **left as it is**: five elite fights in a row; the encounter pass found NO ambush the bot gates will take (an extra pack killed the strafing bot), so the map is declared a gauntlet in the audit |
| C2M22 Mourning Halls | MIXED, the trough | 26 creatures, 8% shooters | **left as it is**: its brief says the map is short, quiet and melee on purpose (the campaign needs one rest); declared in the audit |

THE AUDIT changed with it (`tools/dev/director-audit.mjs`): a map whose `quality.scaleClass` is SET-PIECE is judged as one (18 maps are `KEEP` now), and `DESIGNED` names the two exceptions with their reasons. The tier `B structural` is down to the maps still to look at.

THE TOOL: the squeeze (`tools/mapkit/squeeze.mjs`) learned three things on the way. It takes a LIST of specs (a set of columns and a set of rows). It never cuts a column or a row that a stair or a ramp runs through (the first Silent Roots cut took the middle step out of a three-step ramp and a chamber became unreachable: the step rule is 0.6 m), nor the wall behind a lever, an exit, a door, a secret panel or a closet (the first cut left a lever on a floor). `write-routes.mjs` applies a map's squeeze to its waypoints, `lane-of.mjs` writes the lane in the authoring frame, and `tools/dev/route-matrix.mjs` plays every route of a map on every difficulty and three seeds in ten seconds.

WHAT THE FLOOR SAID: a squeeze moves the mirror line and shrinks pillar blocks: Silent Roots' symmetry rose from 0.80 to 0.85 and its loops fell from 14 to 12 (the map is a third smaller, so there is MORE cover per cell); both are recorded by hand in `design/director-floor.json`.

NOT DONE / NOT PROVEN: nothing is played by a person; the bot gates are chaotic near their edges, so a map that passes now may fail after any change; the squeezed maps' vantage tours (`maps-src/<ID>.views.json`) are converted but not re-shot; a squeeze makes a map's creatures meet sooner, so Normal and Hard feel denser than the numbers of the old bot say (the owner's Easy play of the exemplars was liked).

## The six stragglers (2026-10-19, the goal "Hushfall Director's Plan")

The six maps that still missed a law after Level B, worked with the tools of the squeeze and the encounter kit. Every one of them now meets the laws or has the remaining law written down in `design/director-floor.json` under `waiting`, with its reason. Nothing is played by a person.

| map | what was done |
|---|---|
| C2M08 Threshold Ascent | **SQUEEZED on both axes** (19 columns and 18 rows out): 53 x 82, 1431 cells, density 12 -> 21; a second ambush (a drop-in at the middle of the climb); every law met |
| C1E4M03 Cold Dock | **SQUEEZED** (8 columns, 8 rows: the four bays and their lock chambers leave little that holds nothing); a second ambush (a drop-in in the east bay), a Gaunt became a Bellhand (Gaunts 38% -> 33%, shooters 21% -> 25%); density 16 per thousand cells WAITS (four more creatures need places the locks do not use) |
| C1E2M04 Kiln Row | the roster: two Tollbearers became Bellhands, one a Sexton (the fourth kind), one a Gaunt: Tollbearers 45% -> 39%, shooters 18% -> 21%; every law met; hard seed 3 is completed by neither policy, the gate asks two of three |
| C1E3M02 Ribbed Corridors | two ambushes (drop-ins of three in the corridor line) and the roster (a Gaunt to a Bellhand, a Gaunt to a Chorister): Gaunts 38% -> 33%; every law met |
| C1E3M07 The Spore Foundry | two ambushes of two, two Tollbearers became Bellhands; the Foundry's `drops.scale` went 1 -> 1.35 (the second pack cost the ammunition gate 3% and the dead pay it back); the cap (38%) and the shooters (19%) WAIT: the brief asks for eight Tollbearers, which is 38% of 21 creatures, and a third conversion kills the perfect fighter on hard |
| C2M17 The Hive-Song Approach | a second ambush (a drop-in at the east end); density 16 per thousand cells WAITS: the squeeze was tried and restored, hard seeds completed by neither fighter |

THE TOOLS: `tools/dev/squeeze-map.mjs <ID>` does one map's whole squeeze (scan both axes, write the block, write the routes, compile, play every route on every difficulty; it restores everything if a compile fails or a seed is completed by neither fighter). `tools/dev/try-enc.mjs <ID> '<plan>' '<ENC line;ENC line>' ... [--drops=1.3]` tries encounter lines (and a `drops.scale`) against the gates in a scratch folder and puts the source back: that is how every ambush above was placed. The squeeze learned the keys of the airlock maps (`close`, `interlock`, the `seals` and `and` lists of a vacuum region). `tests/squeeze.test.js` holds both new squeezed maps (the shipped JSON is the squeeze of the drawing, every route completes, no stair is cut), and `tests/batch-c.test.js` thinks in the drawing's cells and converts them to the shipped frame.

WHAT THE GATES SAID: a pack of Gaunts is the cheapest ambush and one of them is nearly always accepted; two on a small map often cost the hard seeds or the ammunition slack, and the ammunition gate is repaired by the drops, not by a box on the road. A map with a quality gate (the Foundry: eight Tollbearers) cannot also meet the cap unless it has more creatures. 44 of 68 maps are REBUILT.
