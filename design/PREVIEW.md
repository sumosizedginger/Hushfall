# THE HIVE PREVIEW (dev only): the level that tests every new thing before any map depends on it

**PLAN ONLY, 2026-10-12 (PT-042).** The owner, after reading the plans for Acts C and D: "**PLAN!** I think first we should build a Dev level to test your new suggestions and everything, what the mobs look like, all of it." This is that plan, and it changes the order of the road (`design/ROADMAP.md`): the engine pieces, the three new creatures, the looks and both boss fights are built FIRST, inside a dev level the owner can walk and fight in, and the fifteen maps are built afterwards on whatever survives the owner's play. It is the same method as the Range (weapons), the Deep Range (Act B's cave kit, Zealot, lantern, chimes), and the Episode 4 sky yard: a new thing is tried in a room made for it before a map is built on it ("Proof before expansion", `AGENTS.md`). Nothing below is built yet.

## 1. What it is
Two dev-only maps in the DEV level picker on the title screen (compiled to `maps-dev/`, never `maps/`: no validation, status, manifest or test counts them; the shell loads `maps-dev/` only under `import.meta.env.DEV`):
1. **`HIVE` THE HIVE PREVIEW** (the Range's rules: every weapon from the start, ammunition refilled, a player who cannot die and is healed): a hub and wings. Look at things, shoot things, test the mechanics.
2. **`HIVEBOSS` THE TWO ARENAS** (the real game's rules: mortal, every weapon, caches, a reset lever): the Hive Cantor's arena and the Root Bell's arena as the live prototype fights, so the owner feels the real thing and not a sponge.
Plus **stills in `review/preview/`** (one contact sheet per wing, a close-up of every creature and the dead body of each) so the mobs and looks can be seen in the app's file pane without launching anything. I read every still myself before telling the owner it is ready.

## 2. The wings (what is in each, and what the owner is asked to judge by looking and playing)
**Wing 1, THE BESTIARY** (the first thing the owner asked for: "what the mobs look like").
- Every new creature on a stand with a plain name plate (hit points, speed, what it does in one line): the **Resonant** (alone; a group of three; a lone one beside two Tollbearers, to see its ring grow with company), the **Hive Cantor** (hovering over a stand with its threads running to a small tier of six singers), the **Root Bell's clapper** (hung from a short chain, swinging), each in three states: ASLEEP (look), INERT (a sponge that takes hits), LIVE (a lever wakes a real one that fights).
- The **variants** beside their plain kinds: hived and woven and crystal Tollbearers and Gaunts, the Drowned for comparison.
- A **scale and silhouette lineup**: every creature in the game in one row (so the new ones can be judged against the old, not alone).
- The new **scenery** seen through windows: the Hive tower, the ganglion, the reactor, rails, the crystal tower, root columns, the shaft.
- *To judge:* does the Resonant read as a new enemy and not a reskin? Is the Hive Cantor readable at a glance? Are the variants different enough, or a tint too far? Anything that looks like AI-slop or a fifth coat-wearer.

**Wing 2, THE LOOKS** (fourteen small rooms in a row, no enemies: the eight looks of Act C and the six of Act D, each in its own walls, floors, sky, light and props, so palette and material can be judged in a minute each). *To judge:* is each a different PLACE, or is it one brown room fourteen times (the audits' sharpest criticism of the early maps)?

**Wing 3, THE MECHANICS** (the yards; drop B).
- A conveyor lane with a swinging shuttle (E8a); a car yard: a car on a loop over a void with two stops (E8b: the risky one); the beat yard: beat floors, a choir that acts in unison, lights that swell, and the low pulse (is the beat READABLE?); a nerve bridge over a void with a travelling pulse; the tall shaft: a 31 m shaft with vent-falls down it (E13); the tide dock: water that rises and falls on a button's clock (E12); a collapse yard: a front of falling stones and sinking decks (loads with a start, sectors); a dark stealth yard: a few root columns, sleepers, the noise tell on the HUD and on the automap (E9); and the **lamp yard**: a sponge Sub-Cantor that sends rings, with the lantern lit and unlit, so the lamp's hold (0.6, and Ines's lamp 0.4) can be felt (is it a real trade or a fiddly one?).
- *To judge:* the cars (does a moving floor under a fight feel good or sick?), the tide and the front (fair or cheap?), the noise tell (useful?), the shaft (does a fall read as a dive?).

**Wing 4, THE ENDING ROOM.** The Gate seen from the Vael side, the lamp, and the last input (light the lamp and keep it lit); a lever plays the epilogue cards (`ENDINGS[2]`, a first draft in the same voice as Campaign 1's) and the closing titles over the second ending painting. *To judge:* does the ending land after a stretch of shooting; is "I will keep it lit" a callback or a stretch?

**`HIVEBOSS`, the arenas.**
- **The Hive Cantor's arena** (C2M24's design: an amphitheatre, three tiers of singers acting in unison on the beat, a hovering conductor, threads that snap, the unison shield): a live fight.
- **The Root Bell's arena** (the inside of a bell: the pendulum clapper, four root anchors, the charge, the roots, the guard, the dark of phase 3, the ring that the lamp cuts, the silence at the end): a live fight, with every weapon and the mortar's cache on the top tier.
- Each has a heal station, an ammunition cache and a reset lever. *To judge:* is it a FIGHT (a big target, cover, dodging, adds, a payoff), is it too busy, is the final silence satisfying. The cut lines are named in the plans (the tier strikes in M24; the pendulum, with concept B as the fallback, in M29).

## 3. What gets built, in two drops (the owner plays after each; nothing else waits on them)
**DROP A: the creatures, the looks, the arenas and the ending (about the size of Act B's B0 and the Sub-Cantor together).**
- Engine, node first with tests, all lazy: the Hive constant and `onBeat`; the unison shield; the `hp:` condition and boss `phases`; MOTION (the pendulum); the lamp's hold; the small actions `sound` / `tremor` / `silence`; a clock `start` for loads; the variants `hived`, `woven`, `crystal`; the findability lint (a node tool); the automap marks (shell). Proof: `route-fingerprint.mjs check` over every shipped run identical.
- Creatures: the **Resonant**, the **Hive Cantor**, the **Root Bell's clapper**: each a definition, a rig in `models_choir.js`, a recipe and a BAKED atlas, sounds, a Range target, `check-rigs.mjs` and `measure-rig.mjs`, and the silhouette guard (under 0.5 against every other kind).
- Art: the kit `tools/baker/recipes_c3.js` and `recipes_c4.js` (about twenty-two materials, the skies, the scenery), the fourteen looks.
- `ENDINGS[2]` as a draft and the painting.
- The two dev maps and their stills.
**DROP B: the mechanics yards.** E8a conveyors, E8b cars (the fallback to conveyors and lifts is named in `design/ACTC.md`), E12 the tide, E13 the taller format (the one that touches the map format: the fingerprint is its proof), the collapse front, E9 the noise tell; the yards in `HIVE` wing 3 and their stills.

## 4. How it is proven (nothing here is "done" because I say so)
- Tests per piece (`tests/hive.test.js`, `resonant`, `hivecantor`, `rootbell`, `phases`, `motion`, `lamphold`, `carriers`, `tide`, `format-tall`, `findability`), the silhouette guard, `route-fingerprint.mjs check` identical, `node tools/dev/measure-rig.mjs` and `check-rigs.mjs` for each rig.
- The real page: a probe (`tools/dev/probe-hive.mjs`, like `probe-actb.mjs`) that loads both dev maps, steps them, draws them and checks what is DRAWN against the sim (the clapper where the clock says, the threads snap, the ring dims at the lamp, the silence is silent); ONE Chrome job at a time at idle priority on two cores, never the owner's mouse.
- The stills in `review/preview/`, which I read before saying it is ready.
- NOT proven by any of it: that it is fun. That is the owner's play, and it is the point of building this first.

## 5. What happens after the owner plays
The owner's findings go into `PLAYTEST_NOTES.md` (PT-042). Each piece is KEPT, CHANGED or CUT (the cut lines are written into the plans). Then the maps are built on what is left, unattended, in the order of `design/ROADMAP.md`. Because the engine and the creatures exist and have been felt by then, the fifteen maps are map-only work, each invalidating only itself.
