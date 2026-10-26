# HUSHFALL: a critical review before the polish (2026-10-26)

The owner asked me to be my own worst critic: is this a turd worth saving, or one to flush? This is my answer, written from the frozen `rc2`. I built almost all of it, so I have tried to argue against my own work, not defend it. Where I give a number, I measured it today; where I give an opinion about how something looks, it comes from the store frames, the trailer and the audit frames I looked at, at the size a player sees them.

What I cannot judge: how it feels to play (a bot is not a player), and how it sounds (I have measured the audio, I have never heard it). Those two gaps are the biggest risk in everything below.

## 1. The verdict

**Save it, but do not polish it as it is. Cut it down and re-author the part you keep.**

The foundation is worth more than most finished indie shooters ever have: a deterministic simulation with a bot that proves every map can be finished, a no-softlock lint, hardened saves, an art and sound pipeline with no licensing risk, and a premise with a real hook (a deaf woman is the only one in town who can't hear the tone that stops everyone else). Throwing that away would be a mistake.

The content on top of it is wide and shallow. 68 maps were built in about four weeks (440 commits since 2026-09-29). The numbers below say most of them are short, linear and structurally alike. The weapon you look at for the whole game reads as a placeholder. The text does the level designer's job by radio. Almost none of it has been played end to end by a person. "Polish" applied to 68 maps of this kind would mean sanding 68 things that need rebuilding.

So: pick the part that gets a player's first hour (Episode One, nine maps, which is also the free demo), bring it to a real bar with human play as the judge, then decide how much of the rest earns the same treatment. Expect to ship fewer maps than 68, or to ship Campaign Two later.

## 2. What is genuinely good (keep all of this)

- **The engine and its guarantees.** A fixed-step, deterministic, headless simulation; replays; the route bot; `traps.js` (no cell you can fall into without a way out); saves that refuse bad data; the frame-loop test that runs the real shell headless. This is rare rigor and it is why nothing in the game is known to softlock.
- **The premise and some of the moments.** The Hush, Ines's hearing, the lamp as the counter-tone, the Tender, the "short by 2,595" plate. The Mirror Array puzzle, and the Gate Warden fight where the mirrors turn the beam onto the seals, are real ideas.
- **Mood in the best frames.** The Marrow Quay sunset, the Root Bell's hall and the Hollow Stair have a colour identity that is not generic.
- **No licensing risk.** Every picture is baked from code and every sound is synthesised; three.js is the only thing that ships (`npm run licences` holds it).
- **The player-side work.** Rebinding for keyboard, mouse and pad, text size, reduced motion, captions, the Journal, the quality fallback, a crash screen with a copyable report.

## 3. The problems, worst first (what costs the player most)

### 3.1 The weapon in your hands looks like a placeholder
The held gun is the object on screen for the whole game. In the store frames the flare cannon is a flat mustard-yellow block that fills the lower middle of the picture, and the rivet driver is a grey cylinder with dots. They read as toy blocks, not tools. Shooters live or die on this one object: its silhouette, its material, its motion, its sound. It was listed as a "taste call for the owner"; I now think it is the single biggest visual problem in the game.

### 3.2 The levels are mostly linear corridors with one secret
Across the 60 maps that have combat (from `tools/dev/director-audit.mjs`, measured today):
- **59 of 60 have exactly one secret.** The genre's habit is several, of different kinds.
- **50 of 60 have no keys.** The key-and-locked-door hunt is the spine of the genre's level design; here it barely exists.
- **28 of 60 have no loop.** You go forward and come back the same way, or don't come back.
- The median map is finished by the bot in **1.7 minutes**, with **36 enemies** of **6 kinds**.

The "rebuild" passes (rosters, scripted ambushes, the squeeze that removed columns from long maps, chamfered corners) changed who stands where and how long a corridor is. They did not change the shape of the maps. And the five "returning mechanics" I added last week are honest about what they are: pockets cut into a wall with a satchel and a vest in them, so that a checklist line could be ticked. That is box-ticking, not level design, and I would not defend it to a player.

### 3.3 The world is boxes wearing repeated tiles
The geometry is axis-aligned blocks (hedges in the Harmonic Gardens are green cubes; the Pulse Foundry is orange boxes with the same dotted tile on every face). Each map is mostly one hue. The "painterly" pipeline (p5.brush atlases) is real, but the game renders at 480 pixels wide by default and then adds an ink outline and value banding, so the brushwork mostly disappears. At the size a player sees it, the look reads closer to a blocky retro game than to a painting. The pipeline spends effort that the screen throws away.

Two smaller cases of the same thing:
- **The painted plates are 320 x 200.** The title picture, the cold open and the four epilogue plates are drawn with plain p5 shapes (brush fills hang the baker) and shown full screen, six times enlarged. They have charm, but they are clip-art scale, and the store's key art is the same 320 x 200 picture.
- **The bosses read as abstract objects at a distance.** The Gate Warden is a white arch, the Hive Cantor is a pale figure in a halo, the Root Bell is a cage. Up close they are better; at fighting distance they look like props.

### 3.4 The screen is hard to read
The HUD labels, the objective strip and the message box are small monospace text. At 1920 x 1080 the message box sits in the lower middle, partly over the gun, in type a few millimetres high. I made the HUD wrap last week; I did not make it legible. The owner already reported that pickups and messages can't be read at full speed (PT-049). The Journal fixed where the text goes, not how it reads in the moment.

### 3.5 The story is told as a strategy guide
668 messages, 14,736 words. Of the speakers, **HULL has 205 lines** and most of them are instructions ("The ramps to the middle ring are at the corners…", "Pillars are cover from the bells"). INES (238 lines) is often tactics too ("Let it run into a pillar"). The text is doing what the levels should do: telling you where to go, what a mechanic is, how to beat a creature. The anti-slop rules made the prose plain and short, which is good, but the result is clinical: one fact per line, every line useful, very few lines that are about a person. The best writing is in the found objects (plates, notes, the Tender), and there is too little of it.

### 3.6 Nobody has listened to the sound
Every effect and the score are synthesised. The audio QA proves they are finite, audible, unclipped and repeatable. It cannot say whether they are good. The only real ear-test so far was the owner's report that the chainsaw had no engine sound. Synthesised effects risk sounding thin and alike; I have no evidence either way. The trailer mix also showed that bursts of rivets pile up to several times full scale before the master compressor, so the in-game mix in a big fight is worth a deliberate listen.

### 3.7 Combat is tuned for a bot, and there is a lot of it
Fifteen weapons, three ammunition loads, six mods with Locker tiers, salvage, ammunition drops from kills, and now a crate. Every number is a first guess. The difficulty gates were tuned until a scripted bot (standing or strafing) could finish each map and a passive one could not. That proves the maps can be finished. It says nothing about whether a fight is tense, fair or boring. A person may find several of these systems invisible or redundant.

### 3.8 The scope was measured in maps, not in quality
The plan's numbers were "68 slots, AGENT_VERIFIED 68 of 68". That metric rewarded finishing maps, and I finished them. The evidence system is excellent at proving that nothing is broken. It is silent about whether anything is good, and I let its green ticks stand in for that. COMPLETE (a person's review) is 0 of 68.

### 3.9 The code works, but is hard to change
- **Dense.** 2,094 lines in `src` are over 200 characters, 122 over 400, and 9 over 800. `world.js` is 1,378 lines and 132 KB, about 96 characters a line. Comments are long paragraphs at the end of code lines. Another engineer would struggle to review it.
- **Knotted.** `defs.js` (95 KB) is where everything meets; the engine project already names it the knot.
- **Tests that check the source text.** 27 test files (about 144 assertions) check that a file *contains a string* instead of checking behaviour. I wrote several of them last week. They break on harmless refactors and pass on real bugs.
- **Tool sprawl.** `tools/dev` has 126 scripts. Many launch headless Chrome with the same copied setup code; I added three more copies last week.
- **The safety net makes polish slow.** Any change to `src`, the baked assets or `index.html` stales the evidence of all 68 maps, and re-proving it is a 90-minute job. For a polish phase of hundreds of small changes, that is the wrong cadence.
- **The operating documents are a liability.** `AGENTS.md` is 125 KB, with 44 single lines over 1,000 characters; `PRODUCTION_LOG.md` is 181 KB and `PLAYTEST_NOTES.md` 204 KB. Every new session pays tens of thousands of tokens to load rules that are mostly history.

### 3.10 The commercial picture is harder than the plan assumes
- The name is not cleared.
- The key art is a 320 x 200 picture enlarged.
- Steam requires disclosure of AI-generated content, and part of this genre's audience will reject a game an AI agent wrote. That needs a decision about positioning, not just a disclosure line.
- The store copy's strongest claim, "every picture painted by code", is true, but the frames don't yet show a painting.
- The browser is a fine place for a free demo and a hard place to sell a full game. The desktop wrapper is a prototype.

## 4. What I would do, in order

1. **Get human play before anything else.** The owner and three to five others play Episode One end to end, with the opt-in play log on (it is built), answering the five questions after each map. A week of that will overrule half of this document, and it should.
2. **Fix the hero object and the reading.**
   - Redesign the held weapons: silhouette, materials, scale, position, idle and recoil motion. Start with the four you hold most.
   - Make the HUD and message text legible at 1080p and up: larger type, a proper typeface, nothing over the gun.
   - Test the default render width at 640 against 480 with players. The brushwork may only show at 640.
3. **Make Episode One the bar.** Re-author its nine maps (not re-roster them): keys and locked doors where they serve, at least one loop each, two or three secrets of different kinds, a landmark you can navigate by, and spaces that teach so HULL can be quiet. Then cut every HULL line the level now makes unnecessary.
4. **Fix the world's materials on that episode.** Break up the boxes (trim, columns, bevels, height), vary the surfaces in a room, use more than one hue per place, and repaint the plates and key art at a real resolution.
5. **Then decide the scope with evidence.** If Episode One at the new bar takes N weeks, Campaign One is about 4N and Campaign Two another 3.5N. The honest options are:
   - ship Campaign One polished and Campaign Two later as an expansion;
   - or cut Campaign Two to its strongest half.

   I would not promise 68 maps at the new bar.
6. **Change the engineering cadence for polish.**
   - A fast lane: node gates, the frame-loop test and one real-page smoke run per change.
   - The full 90-minute regeneration only at a release candidate.
   - Run a formatter (a line length) once, as one commit.
   - Retire the source-text tests as behaviour tests replace them.
   - Cut `AGENTS.md` to a few pages that link to the history.
7. **Listen.** A deliberate listening pass over the loudness report's list and a big fight, before any more sound is built.

### Candidates to cut (decide after play, not before)
- The five side-pocket returns of last week: keep a mechanic only where a map is built around it.
- One or two of the progression systems (loads, mods, Locker tiers, salvage, crate) if players don't notice them.
- The HULL tutorial lines as each level learns to teach itself.
- Maps the play logs show nobody enjoys. The bar should cost maps, not lower itself to keep them.

## 5. One sentence

It is not a turd: under it is a sound engine, a good premise and a real visual identity trying to get out. But it is a wide first draft certified by machines, and the polish has to start by making it smaller and letting people, not bots, say what is good.
