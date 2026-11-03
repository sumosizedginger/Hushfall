# Code notes

The history that used to live in the code comments: each comment that carried a work-order tag or an owner's words, as it was on 2026-11-03, keyed by file and top-level name. The code keeps the why; this keeps the when and who. Written once by `tools/dev/tidy-comments.mjs --notes` (PT-083 K4).

## src/audio/engine.js

- `(top level)`: PT-081: the smart music
- `(top level)`: PT-061 S1: the chainsaw's sustained voice
- `AudioEngine`: PT-028: a map with atmosphere.silence (the Choirless Chamber) has no score and no ambience
- `AudioEngine`: PT-043: the held second of nothing after the Root Bell stops
- `AudioEngine`: PT-081: being hurt pushes the music up
- `AudioEngine`: PT-043: every sound cuts out for a held second, then one footstep
- `AudioEngine`: PT-081: the place's theme
- `AudioEngine`: PT-043: the Hive's low pulse under everything (atmosphere.beat; the beat is world.tick / 90, hive.js)
- `AudioEngine`: PT-043: a map's silence, or the one the Root Bell leaves (world.silenced)

## src/audio/events.js

- `soundsForEvent`: PT-057: both barrels, a beat apart
- `soundsForEvent`: PT-060: the Marksman's line of light
- `soundsForEvent`: PT-056: ammunition loads: the key that turns the gun to its next load
- `soundsForEvent`: PT-076 (brain.js): the scuff of a dash out of your sights
- `soundsForEvent`: PT-039: the Sub-Cantor's ring turns at the wall and comes home
- `soundsForEvent`: PT-045 (E8b): a car pulls out / comes to rest: the sound of a lift
- `soundsForEvent`: PT-033: the Mirror Array
- `soundsForEvent`: PT-033: airlocks and vacuum
- `soundsForEvent`: PT-033: the Gate Warden's sweep
- `soundsForEvent`: PT-038 (E6): the five notes
- `soundsForEvent`: PT-038: the hand lantern
- `soundsForEvent`: PT-038: a Zealot's lance landed and the graft took
- `soundsForEvent`: PT-043: the Resonant's chord on the beat
- `soundsForEvent`: PT-037: a standing fork rings
- `soundsForEvent`: PT-037: a Vael civilian startled
- `soundsForEvent`: PT-037: and the count of the one who was never an enemy

## src/audio/intensity.js

- `(top level)`: HOW BAD IS IT (PT-081, the smart music): a fight's level from what the world says, for the score to follow. Pure: it reads the

## src/audio/music.js

- `(top level)`: * a THEMED score (PT-081, the smart music): a place's tune (`score.js`) in a calm version and a battle version of the same tune,

## src/audio/sawvoice.js

- `(top level)`: THE CHAINSAW'S VOICE (PT-061, S1 of the Director's Plan; the owner, 2026-10-14: "the chainsaw's sound ... never heard"): the saw used to be a retriggered one-shot every 0.4 s with no engine under it. This is a SUSTAINED voice: a two-stroke engine made of two slightly detuned
- `makeSawVoice`: * fade out and stop. `at` (a scheduled stop, as the offline QA render makes) leaves the graph in place until then; a live stop (no `at`) lets it go after the fade (PT-064: the first version disconnected the master at once, which silenced a scheduled stop in an offline render)

## src/audio/score.js

- `(top level)`: THE SCORE (PT-081, the smart music): the themes as DATA and the pure functions that turn a theme, a bar and a fight's level into
- `THEMES`: PT-082, CAMPAIGN TWO. THRESHOLD (Act A: the land beyond the Gate, the glass steppe, the forks, the graves of other worlds): a lone cello over chords on glass in F Dorian, slow and open, a low bell;
- `themeFor`: PT-082: Campaign Two, a theme an act (the secrets take their act's)

## src/audio/synth.js

- `(top level)`: PT-061 S1: the chainsaw voice's QA excerpt (saw_loop)
- `SFX`: --- PT-013: the lamp's charge, melee, guard and parry, burning ground, the pinning bolt ---
- `SFX`: PT-039: the ring has met the wall and is coming back: the same low tone, rising, with a bell that has been struck by the wall
- `SFX`: PT-039: a conductor that has seen you: one note, held a little too long, and a breath that shakes (it does not speak)
- `SFX`: --- PT-043 (the Preview): Acts C and D. The Hive beat, the Resonant, the Hive Cantor, the Root Bell ---
- `SFX`: --- Episode 3 (PT-027): the ship breathes ---
- `SFX`: --- Episode 3 (PT-026): the Chorister, and the shots that go by ---
- `SFX`: --- Episode 3, Batch C (PT-028): the Bulwark Shell and the Weeping Mother ---
- `SFX`: --- Episode 3, Batch D (PT-029): the Cantor Acolyte ---
- `SFX`: --- Episode 4, Batch A (PT-032): the vents and the air ---
- `SFX`: --- Episode 4, Batch B (PT-033): the Mirror Array ---
- `SFX`: --- Episode 3, Batch E (PT-030): the Brood Vat, the Reed, the Grand Cantor ---
- `SFX`: the Gate stands open (PT-036, the campaign epilogue): one low bell struck, an open fifth blooming above it one bell at a time and left ringing, a long breath of air under all of it
- `SFX`: a Vael civilian startled (PT-037): a thin glass note that jumps and breaks; they cannot sing, only startle
- `SFX`: --- Campaign 2, Act B (PT-038): the Zealot ---
- `SFX`: --- Campaign 2, Act B (PT-038): the hand lantern ---
- `SFX`: --- PT-060 (R8): the Marksman and the Mender ---
- `SFX`: --- PT-061 S1: the chainsaw's voice, as a measurable excerpt (the game plays it sustained, from the saw's own state: sawvoice.js) ---
- `SFX`: --- PT-056: ammunition loads ---
- `SFX`: --- Campaign 2, Act B (PT-038): the chimes (a pentatonic: five notes that cannot clash) ---
- `(top level)`: ------------------------------------------------------------------ PT-022: the carbine, the line-thrower, the tuning-fork, the chainsaw (first guesses: not yet heard, not yet measured by audio-qa)
- `(top level)`: * level a recipe down by `k` (a gain stage in front of its output): the first offline render of the PT-013 sounds measured peaks above full scale for these five (audio QA: arc_bolt 1.03, melee_hit_heavy 1.13, parry 1.28, guard_break 1.05, pin_thunk 1.16), so they are scaled to peak near 0.9 like the rest; melee_hit peaked at 0.994, too close, and is scaled as well

## src/engine/airlock.js

- `(top level)`: AIRLOCKS AND VACUUM (PT-033, Episode 4 Batch C, design/EPISODE4.md E2). PURE reads of the sim's doors; the sim keeps the door states and the player's lazy `p.vac`, the view frosts the screen, the audio announces it.

## src/engine/ammoloads.js

- `(top level)`: AMMUNITION LOADS (PT-056, R9 of the Director's Plan; design/WEAPONS_AND_CONTROLS_PLAN.md section 15). PURE: the state a player carries (`p.loads`, `p.loadSel`), the cycling, the spending, the changed copy of a weapon definition a loaded shot uses, and what a hit leaves

## src/engine/automap.js

- `automapModel`: PT-045 (law 1 of design/ACTC.md, the Ossuary winch): a lever the player has SEEN stays on the map, red until it is thrown, green after

## src/engine/beams.js

- `(top level)`: THE BEAM TRACER (PT-033, Episode 4 Batch B, design/EPISODE4.md E3): light that runs the cell grid. PURE: it reads a map and the turning state of its mirrors (and which doors are open) and returns what is lit; the sim keeps the state

## src/engine/belts.js

- `(top level)`: CLOCKED CONVEYORS (PT-045, drop B, E8a; design/ACTC.md section 3): the flowing floors of Act A (FX '>' '<' '^' 'v', world.js flowPush) with a CLOCK on them. A belt is `{ rect: [x0, z0, x1, z1] (cells), period, phase, mode, on? , speed? }`;

## src/engine/bot.js

- `(top level)`: human. Used for canonical play paths and regression tests. Route ops: goto | use | kill | wait | switch {id} | waitsector {id, to} | waitplatform {id, at: 'high'|'low', min} (a timing platform, PT-029) | ride {id, board: [cx, cz], from: vertex, to: vertex, exit: [cx, cz]} (PT-046: wait on the dock beside a car's stop, step on while it dwells, ride it, step off at another stop).
- `(top level)`: PT-033: a lock's second door waits for the air: the bot stands and waits, as it does at a sound-lock
- `(top level)`: PT-056: the bot reads the pairing table of the ammunition loads (only once it carries one)
- `(top level)`: PT-046: the waitfor op asks the same question a trigger does
- `(top level)`: PT-046: the ride op
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)
- `(top level)`: * the guns the route bot fights with; a weapon it does not use (a found melee weapon, the carbine, the line-thrower, the fork: PT-023) is switched away from in a fight and its ammunition is not foraged
- `Bot`: PT-032: stepping on a plate throws you: only a path that means to goes there
- `Bot`: a crate, barrel or sack the tuning-fork could lift: a walker without it is stopped by it (PT-025: a bot that went to collect a drop walked into one)
- `Bot`: PT-032: a vent plate is a way through, and only to its landing (stepping on it throws you)
- `Bot`: (a singer of a living conductor's choir is a target even asleep: PT-046)
- `Bot`: PT-046: a conductor whose choir still sings takes a twentieth of a hit: the singers first
- `Bot`: (PT-046: the Hive Cantor is a target from the far tiers, where its low ring does not reach; anything else within 16 m as ever)
- `Bot`: * PT-056: the pairing table. Plate: the penetrator. A bell node, or something that dashes (a Gaunt): rime. Anything of some substance (a pack, 40 hit points and over) that is not standing in water: slag. Otherwise the standard.
- `Bot`: PT-023: the carbine is the bot's LAST resort: with it in the pocket the sim's flare feed no longer carries a bot that has run out of everything else, so the bot has to use it
- `Bot`: PT-046 (an op with `fallback: true`: C2M28, C2M29): when the gun it wants is empty it takes whichever gun still has something in it, as a human does
- `Bot`: PT-056: turn the gun to the load the pairing table names for this target (none = the standard); one tap at a time, the sim cycles in order
- `Bot`: not close enough for this weapon: close the distance instead of standing there (a bot that HOLDS a position, PT-046 C2M28, lets the enemy come: the landing is where the supplies are)
- `Bot`: * PT-052 (Bot v2, first half): weave: 2 strafes while ANY awake shooter is within range, not only while the creature it is fighting is one (a Bellhand's toll-shot is aimed at where the player IS: a moving player is not hit; with a Tollbearer in front and three Bellhands behind, the old weave stood still)
- `Bot`: (PT-060: a Marksman's line is a shooter too)
- `Bot`: (PT-046, C2M29: the spikes first)
- `Bot`: (PT-039: a ring that has turned back is dangerous while it is still outside the player: it is coming in)
- `Bot`: (PT-046: on the tier it stays on the tier: walking down to the conductor is walking into its ring)
- `Bot`: PT-046 (C2M29): an anchor with a pillar in front of it is shot from the next place on the SAME tier where it shows, not from the middle of the floor under the clapper
- `Bot`: (PT-076: the line is judged from the middle of the cell the bot will stand in: judged from the ring point, a cell that does NOT show the anchor was "arrived at" and the bot stood there for good)
- `Bot`: (PT-076: a spot it has not got a step nearer in two seconds, a tier edge it cannot step down, is given up for the next one)
- `Bot`: (PT-046, C2M29: within seven metres but behind a pillar is not arrived: walk round it)
- `Bot`: * PT-046 (C2M29): a straight walk over plain floor (no door, no secret panel, nothing inside a secret room): a spot to dodge or hide in must not be a place the bot would have to open a panel to reach
- `Bot`: * PT-046 (C2M29): the Root Bell's rooted spikes are called a second ahead at the place you stand: step out of the circle (the nearest clear point two and a half metres off it) and keep going till it has struck
- `Bot`: * PT-046 (C2M29): the clapper's charge is a straight dash after a second's tell: leave its line (a body's width and more on either side), whichever creature is nearer
- `Bot`: (PT-046: a box in a secret room is not on the way: the main route finds no secret)
- `Bot`: a box a creature dropped is worth a short walk (7 m; the magnet brings it the last 3): not a march across a boss arena (PT-025)
- `Bot`: * PT-046: the Hive Cantor's ring is a plane `h` metres high at the conductor's floor: a player standing more than that above it is under no ring and need not hide (a human climbs a tier). Only for a boss whose rings say so (`hive.ring.h`).
- `Bot`: PT-046: against the Hive Cantor's low ring a human climbs a tier: the nearest floor a metre and more above the conductor's, within 14 m, with a clear walk (and a line to the boss: from there it can be shot)
- `Bot`: * * PT-046 (E8b): ride a car. Phases: 0 walk to the dock cell beside the car's stop; 1 wait there until the car stands at the `from` stop with at least 3 s of dwell left; 2 step onto the deck; 3 stay on it (steered to its middle) until * it stands at the `to` stop; 4 step off to the `exit` cell. Phases 2 to 4 ignore combat (a human is busy getting on and off); phases 0 and 1 fight as any op does.
- `Bot`: PT-033: on a floor with no grip a human does not aim for the exact spot
- `Bot`: PT-027, the ship breathes: a human waits at a shut breathing gate until it is open for long enough to get through, and waits outside a spore bed that is blooming or would bloom before it was crossed
- `Bot`: PT-033: let go and coast the last stretch (a drift floor carries you about 0.6 s of your speed)
- `Bot`: * PT-032: a falling load lands on its rect every `period` s: wait outside it until the whole crossing fits before the next impact (like a spore bloom; after a full period of waiting go anyway)
- `Bot`: * PT-028: standing in a Weeping Mother's pool, or under a tear that will land on it within a second: a human walks out (the pool slows and burns). Returns true while it is walking out.
- `Bot`: PT-038
- `Bot`: PT-033: a human turns a mirror under fire
- `Bot`: PT-038 (E5): in a dark place the bot carries its lantern lit, unless a route op says otherwise ({ op: 'lamp', on: false })
- `Bot`: PT-032: in the air the bot rides the arc (a steered bot misses what the throw would have hit)
- `Bot`: PT-046 (C2M28): a bot that holds a position answers a shooter at the range the shooter has, as a human would (16 m on the move, as ever)
- `Bot`: (PT-046: landing from a vent among them and fighting them in your face is not being stuck)
- `Bot`: (PT-076: damage dealt is progress: a Bellhand that runs across between shots and dodges takes longer than four seconds at range, and a brawl in its face that ends with the nearest target far off was both called "stuck in combat")
- `Bot`: never walk away from something that is in your face (PT-076: and the walk on gets its own time: the stuck clock had run through the fight and failed the bot first)
- `Bot`: PT-029: a sound-lock door listens: stand still and quiet until it has heard nothing for its `quiet` s
- `Bot`: PT-046 (C2M28): stand and fight until a trigger condition holds ('time:200', 'dead:w8', a list is an AND); the wave comes to the bot
- `Bot`: PT-038: the lantern lit or out from here on
- `Bot`: PT-081: a cracked wall: walk near it, face it and shoot until it gives
- `Bot`: PT-033: stand beside a mirror and turn it until it faces `rot`
- `Bot`: PT-038 (E6): stand beside a chime (or the tree) and strike it (or hear it); done when the sim says it rang, or the tree has finished its phrase

## src/engine/brain.js

- `(top level)`: THE BRAIN (PT-076; the owner, 2026-10-26, after playing the enemy actions of PT-075: "the enemies seem to move and fight the exact same as before", "even on easy this is not hard", "I just want to give
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

## src/engine/breath.js

- `(top level)`: THE SHIP BREATHES (PT-027, Episode 3 Batch B): the gates and the spore beds of a Choir Ship run on a clock. Everything here is a pure function of the sim time (`w.time`, seconds), so

## src/engine/cars.js

- `(top level)`: CARS (PT-045, drop B, E8b; design/ACTC.md section 3: the one risky piece of the act, felt in the Hive yards before C2M20 depends on it): a rectangular floor that rides a CLOSED polyline on a pure clock and dwells at its stops.

## src/engine/chimes.js

- `(top level)`: PT-038 (Campaign 2 Act B, design/ACTB.md E6): CHIMES. The first sound puzzle that is not an audio test: a chime is a prop with a NOTE (0 to 4, each with a glyph and a colour as well as a pitch), struck by Use (or by a shot);
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

## src/engine/corpses.js

- `(top level)`: PT-050 H-L4 (Gemini LEAK-04): a vat, a Weeping Mother or a summoner keeps bearing creatures for as long as the player stays on the map, and every dead one stayed in `w.enemies` for good (and, in the view, as a drawn rig):

## src/engine/defs.js

- `(top level)`: * ECHO (PT-039, Act B; a map's atmosphere.echo): a noise louder than `loud` metres carries `echo` times as far (a shot in the Echo Markets' well); the quiet ones (the arc lamp uncharged, a blow, the fork) carry as they always did: that is the whole of the answer
- `(top level)`: * ENEMY VARIANTS (PT-039, Act B): a map entity (or a `spawn` action) of an ordinary kind may wear a variant: a tint on its rig and nothing else (the Drowned of C2M12 are Tollbearers in the colours the water made of them)
- `(top level)`: PT-043 (Acts C and D): the Hive's amber-veined, the Loom's pale, the copy-town's glass
- `(top level)`: * AMMO_LOADS (PT-056, R9 of the Director's Plan; design/WEAPONS_AND_CONTROLS_PLAN.md section 15; not the falling LOADS of loads.js): an alternate type of ammunition for a gun you already hold, chosen with the `load` action (key T, the pad's X). A gun carries its standard ammunition plus up to three * loads, each with its own count and a cap that is a share (`cap`) of the standard cap; a load never replaces the standard (it runs out and the gun goes back to it) and drops only from caches, secrets and elites. Lazy state: `p.loads` ({ gun: { load: n } }) and * `p.loadSel` ({ gun: load }) exist only once a load has been picked up, so a world that never meets one is byte-for-byte what it was. `cost` is how many units of the load a shot spends (default 1). * SLAG sets what it hits alight (`ignite`: dps for t s; it fizzles on a creature standing in water). RIME does `dmg` x the damage, chills for `chill.t` s (`slow` of its speed taken away) and makes the NEXT hit do `chill.brittle` x; it puts a fire out; a bell node takes `nodeMult` x. * PEN (the penetrator) does `plate` x to a plated creature (a Warden-Graft, a Bulwark, ...) and goes through one more body (`through`) at `throughMult` of the damage; the rivet driver and the carbine spend two rounds a shot. Every number a first guess, none played.
- `(top level)`: * MODS (PT-057, R9; design/WEAPONS_AND_CONTROLS_PLAN.md section 16): a permanent upgrade to ONE gun, found on a map (a pickup `mod_<id>`) and carried like a weapon. Tier 2 is bought with salvage at the Locker (`tier2.cost`, progress.js `buyMod`). Lazy state: `p.mods` ({ id: 1 }) exists once a mod is * found; the tier two a player has bought rides in `w.upgrades.mods2` (only once any is bought). `src/engine/mods.js` turns a gun's definition into the modded one at the moment of the shot. Every number a first guess, nothing played. * DOUBLE BARREL: both barrels at once (`pellets` x2 for `cost` 2 shells, a cycle of `cooldown` s; tier two `cooldown2`); with one shell left it fires one barrel as before. SPIN-UP: the rate climbs while the trigger is held (`rate` x the cooldown at full speed after `time` s) and the spread tightens (`tighten`); * tier two stops the heat bloom. LONG CHAIN: the lamp chains `chain` more jumps (tier two one more). BARBED BOLT: the harpoon pins a lunging or charging creature for `pin` s and staggers a Bulwark (tier two: `pin2` s and a bleed of `bleed.dps` for `bleed.t` s). PHOSPHOR: a flare's ground burns `t` x as long and its light reaches * further (tier two: `r2` x the radius). AIRBURST (optional, the mortar): `r` x the blast radius and no ground effect (tier two: `r2`).
- `(top level)`: * the KEYS: 1..5 the first five guns, 6 the melee slot (fists always, plus the found weapons of MELEE_ORDER: pressing 6 again cycles them; it has been key 6 since PT-013 and stays), 7..9 the guns PT-022 added, 0 the mortar (PT-027)
- `(top level)`: * Guard and parry (PT-013, owner go 2026-10-07; every number a first guess). With a melee weapon in hand the Aim key GUARDS (always a hold). A guard raised no more than `window` s before a melee strike lands PARRIES it: * the attacker is staggered `parryStun` s and the next melee hit lands for `riposteMult` x (for `riposteT` s). A guard held longer BLOCKS (`block` of the damage gets through; a heavy blow breaks the block for `brokenT` s). A parry window that found nothing * costs `whiffCd` s before a new one can open (no spamming the key). Only attackers in front of the player (`cos`) can be guarded against. Ranged toll-shots are not guarded (a deliberate limit).
- `(top level)`: * PT-014: where an enemy's melee blow can land. A blow lands only on a player INSIDE the creature's frontal arc at the moment it lands (cos of the half-angle: 0.34 = about 70 degrees each side), a dash (a Gaunt's lunge, a Warden's charge) only on a player AHEAD of it (0.5 = 60 degrees). The windup is the tell: a creature does not turn once it has begun. cos -1 = the old behaviour, a blow all the way round.
- `(top level)`: * PT-016, the dev-only weapons range (maps-dev/RANGE.json, `range: true`; never part of the campaign). A target with `hold` stands on its post: 'inert' never fights, 'turn' faces you and swings, 'fixed' never turns; it heals fully after `healAfter` s unhurt and, killed, stands up again after `respawnAfter` s. The player cannot die there, is healed after `playerHealAfter` s unhurt and has every ammunition refilled after `refillAfter` s without firing (or at once when the gun in hand is empty).
- `(top level)`: * The tell of a secret panel (PT-015: the owner finished the level and "no sign of a secret"; the old tell was a 5 cm hairline at 32% in the middle of the panel). View constants only, the sim never reads them: lamplight leaks out of the * seam into every open side as a bright full-height seam (`seam` metres wide), stepped halos round it ([width m, opacity]) and a patch of light on the floor in front of it ([width m, depth m, opacity]), all additive.
- `(top level)`: * * The LOOK of a place (PT-021, the outside critique: "the rooms are boxes... a player should know which place they are in with the gun down", "the light is flat"): until now EVERY map was lit by the same hemisphere, the same purple * sun and one global post grade, and a map differed only by its fog colour, its sky and an `ambient` scalar. A map now names a look (`atmosphere.look`); the default is exactly the old one, so a map that names none is unchanged. * View constants only: the simulation never reads them (render and post read them; the validator only checks the name). * hemi [sky, ground, level] sun [colour, level, [x, y, z] direction] lamp scale of every lamp / pod / lantern light exposure scale of the post exposure * grade { shadow, light, sat } the post pass's cool-shadow / warm-light tint (multipliers per channel) and its saturation * shade { foot, ao, patch } baked into the level's vertex colours: how dark a wall's foot and head are, how much a floor / ceiling darkens toward a wall, how strongly large patches vary the tile (0 = off)
- `LOOKS`: the pre-PT-021 light: the default
- `LOOKS`: institutional: cold tubes, grey-green, drained // PT-079 (design/ART_ASSESSMENT.md item 8): the lamps brighter, so its dark has highlights in it (it measured murky: dark on average AND a narrow spread)
- `LOOKS`: the harbour at night: blue shade, the lamps are the warm things // PT-079 (design/ART_ASSESSMENT.md item 8): the lamps brighter, so its dark has highlights in it (it measured murky: dark on average AND a narrow spread)
- `LOOKS`: damp stone under the quay: green-black, a lamp is a room // PT-079 (design/ART_ASSESSMENT.md item 8): the lamps brighter, so its dark has highlights in it (it measured murky: dark on average AND a narrow spread)
- `LOOKS`: the dark house on the hill: cold blue, the generator light // PT-079 (design/ART_ASSESSMENT.md item 8): the lamps brighter, so its dark has highlights in it (it measured murky: dark on average AND a narrow spread)
- `LOOKS`: the works: bleached, hard, chemical (PT-035: the pans were one white plane under a white sky: a lower, warmer sun, a cooler shadow, a little more colour and a darker foot to every wall, so the white has a side that is lit and a side that is not)
- `LOOKS`: the Spore Foundry: green-black iron, the glow is the light (PT-035: the grade eased so the furnace's kiln brick can read as hot)
- `LOOKS`: the Cantor's Throat: wet pink and red-violet (PT-035: the grade eased so the bone ribs and the brass bell can read)
- `LOOKS`: the Gatekeeper's Approach: stone that warms rank by rank, indigo shadow, the Gate's light at the far end (PT-035: it was too dark to read, hemisphere 2.1 -> 3, lamps 1.9 -> 2.6, a warmer light grade)
- `LOOKS`: the Hollow Stair: deep indigo, the light comes up the shaft (a bright ground in the hemisphere) // PT-079 (design/ART_ASSESSMENT.md item 8): the lamps brighter, so its dark has highlights in it (it measured murky: dark on average AND a narrow spread); PT-080: a less saturated sky light and a stronger sun, so the drum's ribs and courses cast shade
- `LOOKS`: ---- Campaign 2, Act A, THRESHOLD (PT-037): bleached glass, salt and rust under a low red sun ---------------------------------------------------------------------------------------------------------------------------------------------------------
- `LOOKS`: PT-038: the Deep Range (dev only): a cave that is dark but for a hand lantern and a few hung ones
- `LOOKS`: ---- Campaign 2, Act B, THE SOUNDING DEEP (PT-039): the Vael under the stone; amber lamps and a lantern are the light ---------------------------------------------------------------------------------------------------------------------------------------
- `LOOKS`: ---- Campaign 2, Acts C and D (PT-043, the Preview): fourteen places, each its own light ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
- `LOOKS`: C2M21, the pulse foundry: copper and orange heat // PT-079 (design/ART_ASSESSMENT.md item 8): the lamps brighter, so its dark has highlights in it (it measured murky: dark on average AND a narrow spread)
- `LOOKS`: C2M30, the walk to the Gate: warm ivory marble and one gold line (PT-043 report 1: it read as extremely gray at saturation 0.35; the walk to it now passes through the colours of the places it recalls)
- `(top level)`: * * MARKS THAT STAY (PT-021 step 2): the cells of the 4 x 4 `decals_atlas` by name, how many marks of each ring the view keeps (the oldest is recycled), and which creatures bleed (the rest leave the Vael's ichor). * A map may list its own marks (`decals`, validated by kind). View data only: the simulation never reads it and no save holds it.
- `(top level)`: * THE VAEL'S GROWTH with thickness (PT-021 step 5): a map lists where it started (`growth: [{ at, r, power }]`); render-only. max sources, how fast it thins with distance, lobes per wall face at full strength, how high it climbs, sacs at the heart.
- `(top level)`: * heights are authored in 0.5 m units (0-9, a-z, and A-Z for 36 to 61: 30.5 m at most, PT-045); an actor can step UP at most STEP metres and can drop any distance
- `(top level)`: PT-037 (Campaign 2 Act A, E3): CURRENT, wading water that PUSHES (`flow` is the direction: > east, < west, ^ north (-z), v south (+z)), FLOW.push m/s on top of whatever you do, on the player and every awake walker; it conducts the arc lamp like any wading water (`water`) // `d` (PT-033, Episode 4 Batch D): DRIFT, a floor with almost no grip: the body's velocity follows what you ask for at `grip` of the ground's rate (momentum: it takes about 0.7 s to get going and as long to stop); the speed cap is the walking speed // `p` is never drawn in a map's fx layer: it is the pool a Weeping Mother's tear leaves (PT-028)
- `(top level)`: * THE SHIP BREATHES (PT-027, Episode 3 Batch B; src/engine/breath.js): `warn` is how long a spore bed swells and glows before it blooms, `fade` how long the glow lingers after it stops; a breathing gate never closes on anyone within DOOR.autoCloseClearance
- `(top level)`: * CURRENT (PT-037, E3): how hard a flowing floor (FX '>' '<' '^' 'v') pushes a body that stands on it, in m/s, added to its own movement (a walker upstream at full speed still gains ground: 6.4 x 0.78 - 2.2 = 2.8 m/s)
- `(top level)`: * CLOCKED CONVEYORS (PT-045, drop B, E8a; src/engine/belts.js): a map's `belts: [{ rect, period, phase, mode, on?, speed? }]` put a clock on the flowing floors (FX '>' '<' '^' 'v') under their rect. 'flip': the floor carries you the way it is drawn for half a period, * stops for `stop` s, carries you the other way for half, stops again; 'run': it runs for `on` s of every period and stands still for the rest. A belt eases to and from a stop over `ease` s (so the push is never a jump and the chevrons visibly slow before it stops); * `speed` (m/s, default `speed` here) is how hard a running belt pushes: harder than a current, because it is a machine.
- `(top level)`: * THE TIDE (PT-045, drop B, E12; src/engine/tide.js): a map's `tide: { levels: [[t, h], ...], loop?, rect? }` is the water level of the whole map (or of the cells in `rect`, so one yard of a dev map can have a tide) in metres, a piecewise-linear function of the sim clock; a walkable cell whose floor is more than `wet` below it takes the wading effect * (FX 'w': slow, and the arc lamp conducts) and the view draws a sea at that height. It never drowns anyone: it takes standing room and speed, and it is the only thing in the game that changes which floors are cheap to stand on.
- `(top level)`: * CARS (PT-045, drop B, E8b; src/engine/cars.js): a rectangular floor that rides a closed polyline over the void on a pure clock, dwelling at its stops. `speed` is the PEAK speed of a run (m/s: a run eases in and out, its average is two thirds of it), `dwell` how long it waits at a stop * (never under `minDwell`: time to step on), `warn` how long before it leaves the rim lights blink (the tell), `board` how far a rider's feet may be from the deck and still be carried, `size` limits in cells. A car carries the player and nobody else (a creature never boards).
- `(top level)`: * * LOW GRAVITY WITHOUT A JUMP KEY (PT-032, Episode 4 Batch A; design/EPISODE4.md E1). A map's `vents` ([{ at, to, time }]) throw a player who steps on the plate at cell `at` along a ballistic arc to the cell `to` in `time` s (the arc is exact for the sim's * integrator, as the mortar's and the Weeping Mother's are) under gravity `g`; in the air the body keeps its launch velocity plus a little steering (`steer` of walking speed), the weapon fires as usual, a wall stops the horizontal part, a ceiling the climb. * A `_` tile is the VOID (open sky, kind 'void': it blocks walking for everyone but a body in the air, is not solid for sight or shots, and has no floor; its floor is `voidDepth` m down): landing over it is a MISS, the body falls on (`voidFallG`) * and is set back on the last solid ground it stood on after `voidDamage` hurt, never killed outright. `ventCooldown` s after a launch (or a set-back) a plate does not fire again. `p.air` is lazy state: only a world with a vent ever has it.
- `(top level)`: * FALLING LOADS (PT-032; src/engine/loads.js): the warning, the settling cloud, and what a landing does to someone under it
- `(top level)`: * AIRLOCKS AND VACUUM (PT-033; src/engine/airlock.js): how long a lock's second door stays refused after the first has shut (the pressure equalising), and what a body in vacuum takes
- `(top level)`: PT-050 H-L4: of the creatures a vat, a mother or a summoner BORE, at most `cap` corpses are kept (the oldest go), checked every `every` ticks; a mapped creature's body is never removed
- `(top level)`: PT-043: Acts C and D (recipes_c3.js, recipes_c4.js): the ASCII alphabet is full, so these are Greek letters // Campaign 2 Act B (PT-039, recipes_c2b.js): cave rock, city stone, cold marble and bronze, drowned stone, ossuary bone, basilica ash, the heart's membrane; // Campaign 2 Act A (PT-037, recipes_c2a.js): fused glass crust, rusted salt plate, basalt bastion, ivory bone-coral slots, cold reliquary stone, pale ribbed chitin // Episode 4: glass, dock, orchard, bark, approach, stair, gate, quiet // L, K: Episode 2 (the Salt Works); Y kiln brick, Z frosted steel (Gate 4 batch 2)
- `FLOOR_SKINS`: Episode 3 (PT-027): the gill gardens' damp floor, roofed and open to the sky
- `FLOOR_SKINS`: Episode 3 (PT-029, PT-030): the Loom's woven floor, the Loft's boards, the Foundry's grating, the Throne's wet membrane
- `FLOOR_SKINS`: Episode 4 (PT-033): prism, quiet, dock, moss (roofed / open), approach, stair (roofed / open), gate
- `FLOOR_SKINS`: Campaign 2 Act A (PT-037): glass sand, basalt flags, terrace turf, aqueduct chitin (open and roofed)
- `FLOOR_SKINS`: PT-043: Acts C and D // Campaign 2 Act B (PT-039): flowstone, marble, the heart's skin
- `(top level)`: * * THE GRAVITY TOOL (PT-022, owner go 2026-10-08: "if we're going to make a gravity gun we should make a gravity gun"): the Vael tuning-fork. HOLD AIM = the beam: it drags the body nearest the middle of the view toward you (a movable prop is * lifted and held `hold.dist` m ahead; a creature is dragged in and stunned at melee range), FIRE with a prop held THROWS it, FIRE with nothing held is a PUNT: a shock that shoves the creatures in front of it (a wall or another body is struck * for `impact`), launches the props, and turns a toll-shot back on the one who tolled it. No ammunition: a cooldown. Every number a first guess.
- `WEAPONS`: PT-013 identity: AREA. The burst leaves burning ground (enemies standing in it burn; the player is not hurt by their own fire) and lights the room for as long as it lasts.
- `WEAPONS`: PT-013 identity: CLOSE. Every hit staggers a little; inside `interrupt` metres a hit CANCELS the windup of the attack it lands on. (First try 0.45 s: on C1E2M03 it cut a perfect bot's damage taken on normal from 51 to 19: a flinch that long is a stun-lock in a stationary player's hands.)
- `WEAPONS`: PT-013 identity: SUPPRESS. Rivets slow what they hit (10% for 0.8 s, at most 1 s at a time: SLOW_MAX in world.js) and break a Gaunt's lunge windup (once in a while): it holds crowds off, it does not kill them. (First tries: 30% for 1 s cut a perfect bot's damage taken on C1E2M04 hard from 45 to 9; 20% still failed C1E2M04 and C1E2M07's viability gates; 10% passes all of them. A stream of 12 shots a second turns any slow into a permanent one: that is why it is small.)
- `WEAPONS`: the long gun (Gate 4, owner go 2026-10-06): one heavy bolt, instant, almost no drop-off at 90 m, and it goes THROUGH: it punches the front plate of an armoured target (the Warden-Graft's shield-arm no longer
- `WEAPONS`: PT-013 identity: ONE HEAVY SHOT. A bolt that leaves a body with a wall within `wall` metres behind it PINS it for `t` s (not the elites or the bosses)
- `WEAPONS`: PT-013 identity (owner: 'it doesn't make me feel more powerful or like I have more range'): TAP = the short arc above (it fires on release). HOLD past `min` s CHARGES to `max`: a forked bolt, `range` m, `damage`, `chain` jumps at `chainFalloff`, up to `forks` branches, for up to `cells` cells.
- `WEAPONS`: ---- PT-022 (owner go 2026-10-08; built in the Range first, on no map yet; every number a first guess) ----------------------------------------------------------------------------------------------------
- `WEAPONS`: the Bell-breaker mortar (key 0, PT-027): INDIRECT fire. The shell flies TO the point the crosshair rests on (src/engine/mortar.js): a high arc, 1 to 2.6 s in the air, so it reaches a ledge or goes over a crate; the landing point is pushed out to `minRange`
- `WEAPONS`: ---- melee (PT-013): fists are always owned (slot 6); the found weapons are picked up and take the same slot (key 6 again cycles). `swing`: reach m (from the player's centre to the body's surface), arc rad (full cone), damage, windup/recover s, knock m, flinch s,
- `WEAPONS`: the chainsaw (PT-022; joins key 6's cycle): HOLD FIRE to rev (`spinUp` s), then it cuts every body in front of you every `every` s for `damage` (cleaves the lot, a flinch each time), drags you forward `drag` m/s into what it is cutting and slows you `slow` while it runs;
- `(top level)`: `hitForward` (default 0: metres ahead of the feet along the facing) fit the drawn body. Measured on the real rigs and enforced by tests/hit-volume-fair.test.js (owner decision 2026-10-05, PT-005).
- `(top level)`: PT-062 (R10, the boss changes): the feeders now FEED her: every `every` s an awake feeder swells and a Drone-Gill hatches beside it (`max` of its own alive), so cutting the feeders is cutting the supply, and while any stands her shield is HALF (it was a twentieth). Same machinery as the Brood Vat (vatStep).
- `(top level)`: ---- PT-060 (R8 of the Director's Plan): the two new archetypes; design/ENEMY_ROSTER.md. Every number a first guess, nothing played. ----
- `PICKUPS`: PT-022: placed on no map yet
- `PICKUPS`: PT-027: three shells' worth of the line-thrower's rockets
- `PICKUPS`: PT-038: a tin of lamp oil for the hand lantern (only taken where the map has a lantern, and not past `max`)
- `(top level)`: the load pickups (PT-056): `ld_<load>_<gun>`, one kind for every pairing LOADS allows (the toast names them, the sim adds the units to p.loads)
- `(top level)`: PT-057: one pickup kind per mod
- `PROPS`: Episode 3, Batches D and E (PT-029, PT-030): the second half's own furniture
- `PROPS`: Episode 4, Batch B (PT-033, beams.js): the Mirror Array's furniture; drawn by the view from the sim's own state (never merged into the static level mesh)
- `PROPS`: PT-038 (E6): a note on a plinth: Use or a shot strikes it
- `PROPS`: PT-038: the Great Chime-Tree: Use plays the phrase of the next round // lit while a beam enters its cell
- `PROPS`: Episode 4, Batch C (PT-033): the dock's furniture
- `PROPS`: PT-037 (Campaign 2 Act A): a grave of the Reliquary Road: a slab on a low mound, low enough to step over a creature's reach but a solid post to a round
- `PROPS`: PT-037 (Campaign 2, resonator.js): a standing tuning-fork: it rings at a noise and calls what sleeps
- `(top level)`: arch (the Gate seen from Anselm-Nine's shore) and spire (a far Vael needle): PT-037, models_c2.js
- `(top level)`: * PT-037 (Campaign 2 Act A, resonator.js): the standing forks of the Tuning Fork Fields. `hear` x a noise's radius is how far from the shot a fork listens (the arc lamp's 14 m is heard within 8.4 m, a rocket's 30 within 18 m); it rings `delay` s later, * sends out a ring (`pulse`: a tone pulse, `damage` before the difficulty), wakes every sleeper within `lure` m of ITSELF, and calls the forks within `chain` m of it; then it is deaf for `cooldown` s.
- `(top level)`: * * AMMUNITION DROPS (PT-025, owner 2026-10-09: "maybe instead of ground pickups we make it drops from enemies? The gun you're using or the one missing the most ammo is the type?"). * A map that says `drops: { scale }` gets its ammunition from the dead instead of from boxes on the road (a few boxes stay in its secrets). On a kill (never a summoned or a raised creature, a bell node or a range * target) the dead may drop one box, of the type the player NEEDS: among the guns fired in the last `window` s (the one in hand always counts) the one with the lowest share of its cap; with none fired, the * emptiest carried gun. The chance rises as that share falls and a run of dry kills guarantees one (`pity`), so a player is neither starved nor flooded. A drop is the ordinary box of that type (`amount` * is each type's old ground box), pulled toward the player inside `magnet.r` m. Every number is a first guess; the ones a map can move are `scale` (its overall supply) and a creature's own `chance`.
- `(top level)`: ---- Episode 3, The Choir Ships (PT-026, owner approval 2026-10-09 of the five new creatures; Batch A needs only the first) --------------------------------------------------------------------------------------------
- `(top level)`: * suppression (PT-026): a shot that passes close sets `p.suppT` to `time`; every weapon's cone is opened by `cone` x (the share of `time` left)
- `(top level)`: ---- Episode 3, Batch C (PT-028, owner go 2026-10-09 "batch c"): the two ELITES the Marrow Nave needs ------------------------------------------------------------------------------------------------
- `(top level)`: Cantor Acolyte (PT-029, Episode 3 Batch D): the Choir's attendant, a tall thin figure on stilts with a halo of bells. It WARDS: while it is awake (and not staggered) every other creature within `ward.r` m takes `ward.reduce` of the damage
- `(top level)`: ---- Episode 3, Batch E (PT-030, owner overnight go 2026-10-09): the Foundry's spawner and the Throat's boss -----------------------------------------------------------------------------------------------
- `(top level)`: PT-062 (R10, the boss changes): the Grand Cantor is a MOBILE fight now, with no shield. It walks (2.4 m/s), keeps 9 m from you and circles at that range (`strafe`), and every reed that stands is a voice in its song: while ANY reed sings it throws its second returning ring (`echoReeds`),
- `(top level)`: * THE GATE WARDEN (PT-033, Episode 4 Batch E; design/EPISODE4.md E5): the Campaign One boss. An arch of grafted bone and bell-chitin standing in the mouth of the Gate with a ring of light behind it (a silhouette of its own: nothing else is a ring). It does not move. * Shielded (5%) while any of its three SEALS (nodes on the arch) stand; a seal's death staggers it, the last drops the shield. A SWEEP (src/engine/sweep.js): after a 2.4 s tell a beam from its eye turns through 143 degrees in 2.8 s (pillars stop it, the Mirror Array's * mirrors turn it: a reflected stretch through a seal shatters it); a ring pulse like the Cantors'; Drone-Gills called out of the Gate (from the entity's `summons` cells); and it slams what stands at its feet.
- `(top level)`: * THE SUB-CANTOR (PT-039, Act B; the boss of the Sounding Deep Heart): the conductor of ONE district, a lesser Cantor and an afraid one: it keeps its distance (`keepAway`), never speaks, and breathes out a tone pulse whose RING TURNS BACK at `pulse.reflect` m (the wall of its bowl) * and comes home to it as its own voice: cover that held for the ring going out must be held again for the ring coming in (the first hit does not spend the ring: `hit` is cleared when it turns). Shielded (5%) while any of its four FORKS (`bellnode`, the nodes that * hold the note it no longer remembers) stands; calls Gaunts out of its `summons` cells; fans toll-shots once the forks are down (enraged). Every number a first guess.
- `(top level)`: ---- Campaign 2, Act A (PT-037; design/CAMPAIGN2.md E1): THE QUIET FOLK ------------------------------------------------------------------------------------------------------------------------------
- `(top level)`: ---- Campaign 2, Act B (PT-038; design/ACTB.md): THE ZEALOT ---------------------------------------------------------------------------------------------------------------------------------------
- `(top level)`: ---- Campaign 2, Act B (PT-038; design/ACTB.md E6): CHIMES (src/engine/chimes.js) ---------------------------------------------------------------------------------------------------------------------
- `(top level)`: ---- Campaign 2, Act B (PT-038; design/ACTB.md E5): THE HAND LANTERN ---------------------------------------------------------------------------------------------------------------------------
- `(top level)`: ---- Campaign 2, Acts C and D: THE PREVIEW (PT-043; design/PREVIEW.md, design/ACTC.md, design/ACTD.md) ----------------------------------------------------------------------------------------------------------------
- `(top level)`: h: the ring is 0.8 m high: any floor a metre above the conductor's clears it, a half-step does not (PT-043 report 3)
- `(top level)`: (PT-046: three every thirteen seconds, six at most, was more than a bot or the second half of the fight could stand: two every sixteen, four at most)
- `(top level)`: PT-076 THE BRAIN (brain.js, the numbers in BRAIN there): what each ordinary creature does besides walk and strike. `dodge` is its chance to dash out of your sights when you fire at it or hold it

## src/engine/dmath.js

- `(top level)`: PORTABLE MATHS (PT-076). The simulation must compute the same bits wherever it runs: the headless Node sim that plays the route bot for the gates, the browser the player plays in, and the desktop wrapper. It did not: headless Chrome 154's

## src/engine/drops.js

- `(top level)`: Ammunition drops (PT-025; the rules and every number are DROPS in defs.js). Pure sim code: a kill may leave one ordinary ammunition box where the creature fell, of the type the player needs most, and a box that

## src/engine/folk.js

- `(top level)`: PT-037, Campaign 2 Act A (design/CAMPAIGN2.md E1): THE QUIET FOLK. A peaceful creature (`ENEMIES.<kind>.peaceful`, today the Vael civilian) is an ordinary entry of `w.enemies`, so every weapon already hits it,
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

## src/engine/gravity.js

- `(top level)`: PT-022 (owner go 2026-10-08): THE GRAVITY TOOL and the movable props it works on. Pure functions of the world, called from world.js only when a map has movable props (`w.phys`) or the player holds the fork; no shipped map has either,
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)
- `updateShoves`: PT-048 (F1): the wall is found by the BLOCKED COMPONENT of the step, not by how far the creature got. tryMove slides along a wall, so an angled punt kept most of its distance and was struck only at a corner.

## src/engine/harness.js

- `(top level)`: * PT-052 (Bot v2, first half): play a route with the standing fighter and, only if it does not complete, with the strafing one (weave: 2). Returns the run that completed (or the standing one) with `policy`: 'standing' | 'strafing'.

## src/engine/hitvolume.js

- `(top level)`: Fairness rule (owner decision, 2026-10-05: "the hit box should match the enemy"): the volume matches the drawn body, measured on the real rig in
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

## src/engine/hive.js

- `(top level)`: THE HIVE BEAT (PT-043; design/ACTC.md section 2): the one clock of Act C. A pure function of the tick, like breath.js / platforms.js / loads.js, so a save, a replay and a bot need nothing stored and a world that never asks
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

## src/engine/hivecantor.js

- `(top level)`: THE HIVE CANTOR'S BEAT (PT-043; design/ACTC.md section 4): the conductor of the Hive hovers over its podium and never walks. It works on the Hive beat (hive.js): one beat before it lets go its ring it draws it (the rig's arms come up), on the beat itself

## src/engine/loads.js

- `(top level)`: FALLING LOADS (PT-032, Episode 4 Batch A, the Ascent Tether): a region of a deck is struck by a load (a cargo container, a section of the lattice) on a clock. Pure functions of the sim time (`w.time`, seconds), like breath.js: a save, a
- `(top level)`: A SCHEDULED load (PT-045, drop B: the collapse front of C2M27): a load that says `start` (the time of its FIRST impact, s), `count` (how many impacts it makes, then no more) or `loop` (the whole schedule restarts every `loop` s, so a yard can be run again) follows a

## src/engine/loop.js

- `FixedLoop`: PT-050 H1: one NaN or negative frame time (a timer glitch) must not poison the accumulator for the rest of the session (Grok G-08)

## src/engine/mapformat.js

- `(top level)`: _ = the void (PT-032): open sky, no floor
- `(top level)`: the height alphabet (PT-045, E13): `.` 0, `0-9` 0-9, `a-z` 10-35 (the original 17.5 m), `A-Z` 36-61 (31 m: the Root Bell Descent's shaft); a unit is HEIGHT_UNIT metres. Old maps use no capital, so they parse as they always did.
- `(top level)`: PT-043: a sound cue, a rumble, and the end of the score
- `MapData`: PT-037 (E3): a flowing floor somewhere in the map
- `MapData`: PT-032: a map with open sky has a floor 6 m down in those cells, so it is never 'flat'
- `MapData`: PT-045 (E8b): floors that ride a loop on a clock (cars.js)
- `MapData`: PT-032: launch plates (LOWG in defs.js)
- `MapData`: PT-029: a `cycle` sector is a TIMING PLATFORM (platforms.js)
- `MapData`: PT-029: a map with a sound-lock door records the player's noise (world.noise)
- `MapData`: PT-081: how a panel opens: Use (the default), a SHOT (a cracked wall) or a SWITCH elsewhere
- `MapData`: PT-032: falling loads on a clock (loads.js)
- `MapData`: PT-045 (E8a): conveyors on a clock (belts.js)
- `MapData`: PT-045 (E12): the water level of the whole map on a clock (tide.js)
- `MapData`: PT-033: regions of vacuum while their seal doors are open (airlock.js)
- `MapData`: PT-027: spore regions that bloom on a clock (breath.js)
- `MapData`: PT-038 (E6): the phrases of this map's chimes: [{ id, phrase: [notes], window }]
- `MapData`: PT-039 (Act B): a place where every noise carries `echo` times as far (the Echo Markets' well); 1 = the ordinary world
- `MapData`: PT-045 (E9): the HUD and the automap say how far a shot from the weapon in hand carries (noisetell.js)
- `MapData`: PT-043: a dev map that is NOT the Range (mortal, real rules): its exit goes back to the title without scoring
- `MapData`: PT-043 (dev maps only): rooms lit by their own look: [{ rect, look, sky?, fog?, fogDensity? }] (view.js applyZone)
- `MapData`: PT-043 (dev maps only): an exit with this `dest` shows the draft epilogue of that campaign instead of leaving at once
- `MapData`: PT-043 (design/ACTD.md): a lit lantern cuts the damage of a ring to `plain` of it (`own` with Ines's eternal lamp)
- `MapData`: PT-038 (E5): a dark place and the hand lantern that is carried in it ({ oil, max, eternal }; null = none)
- `MapData`: PT-025: { scale }: this map's ammunition comes from the dead (src/engine/drops.js), not from boxes on the road
- `MapData`: PT-016: the dev-only weapons range (never a campaign map): the player cannot die, is refilled and healed (range.js)
- `MapData`: PT-022: props the gravity tool can lift and throw (world.phys, drawn one by one, never part of the static props)
- `MapData`: PT-033: the beam tracer's emitters, mirrors and receivers (beams.js); they are ordinary solid props too
- `MapData`: where the Vael's growth started (PT-021): view data, the simulation never reads it
- `MapData`: PT-063 (V6b): a map may say `floorMarks: false` and keep its floors clean (view data)
- `MapData`: marks the map starts with (PT-021): view data, the simulation never reads it
- `validateMapChecks`: PT-033: an airlock: the partner is a door that says the same of this one
- `validateMapChecks`: PT-029: a sound-lock door only opens (by Use) when nothing loud has been heard near it for `quiet` s
- `validateMapChecks`: PT-027: a breathing gate opens on a clock and nothing else opens it
- `validateMapChecks`: PT-043: starts an attack only on a Hive beat (hive.js)
- `validateMapChecks`: PT-033: the beam tracer's props
- `validateMapChecks`: PT-038: chimes and the tree
- `validateMapChecks`: PT-039: shown only when the remembered choice matches (or does not)
- `validateMapChecks`: PT-070: `unless` = one condition or a list (msg:<id> | key:<k> | dead:<group> | sector:<id>:<low|high> | lit:<receiver> | lamp:on), the message is silent once any holds
- `validateKit`: PT-027: spore regions
- `validateKit`: PT-032: falling loads
- `validateKit`: PT-045: a scheduled load (a strip of the collapse front)
- `validateKit`: PT-045 (E12): the tide
- `validateKit`: PT-045 (E8b): cars
- `validateKit`: PT-045 (E8a): clocked conveyors
- `validateKit`: PT-033: regions of vacuum
- `validateKit`: PT-032: launch vents
- `validateKit`: PT-029: a timing platform rises and falls on a clock of its own
- `validateKit`: PT-043: a toll from a trigger (the name is checked against the synth by a test)
- `validateKit`: PT-043: the view shakes and a low sound runs
- `validateKit`: PT-045: switch the hand lantern between the plain one and Ines's own
- `validateKit`: PT-063 (R13): a story scene; the sim only announces it, the shell plays it
- `validateKit`: PT-043: the Hive's beat stops (hive.js zoneBeat reads w.beatOff) // PT-043: from then on the score and the ambience are cut
- `validateKit`: PT-039: a remembered choice (progress.choices, read by later maps)
- `validateKit`: PT-033: a list of conditions is an AND (the Hollow Stair: all four levers)
- `validateKit`: PT-037: 'not:<condition>' is the opposite of any condition that is not a position or the start (a seed that ripens unless its bell is dead: not:dead:seed)
- `validateKit`: PT-038: a chime phrase has been played
- `validateKit`: PT-039: a choice an earlier map recorded
- `validateKit`: PT-043: a group has less than that share of its hit points left (phases.js)
- `validateKit`: PT-043: the hand lantern is lit (the Unrung Gate)

## src/engine/marksman.js

- `(top level)`: THE MARKSMAN (PT-060, R8 of the Director's Plan; design/ENEMY_ROSTER.md section 1): a Songkeeper with a reed-rifle. A hitscan shot at long range after a TELL you can see: a line of light from the reed to where you stood. The line follows you for `track` s, then
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)
- `snipeStep`: too close: it turns and RUNS to open the range (PT-064: it no longer walks backwards facing you); walled in, it fights with its hands: the caller falls through

## src/engine/mender.js

- `(top level)`: THE MENDER (PT-060, R8 of the Director's Plan; design/ENEMY_ROSTER.md section 2): a small Vael that heals the creatures near it. A priority target with a smaller footprint than the Acolyte's ward: it does not make anything take less, it undoes what you have done, `rate` hit points
- `healStep`: too close: it turns and runs (PT-064), it does not moonwalk; walled in, it fights with its hands

## src/engine/mods.js

- `(top level)`: WEAPON MODS (PT-057, R9 of the Director's Plan; design/WEAPONS_AND_CONTROLS_PLAN.md section 16). PURE: which mods a player owns (`p.mods`), which tier (`w.upgrades.mods2`: bought at the Locker), and the changed copy of a gun's definition a modded shot is fired with. Lazy: `p.mods` exists only

## src/engine/mortar.js

- `(top level)`: THE BELL-BREAKER MORTAR (PT-027, Episode 3 Batch B; weapon 10, key 0): INDIRECT FIRE. The shell does not fly down the crosshair, it flies TO the point the crosshair rests on: the view ray is marched out to the first wall, floor, ceiling,
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)
- `designate`: PT-050 H-W1 (Gemini-04): the push-out to minRange must not land INSIDE a wall (4 of 4 aims at a near wall did, and the ring lied): walk it back to the wall's foot

## src/engine/nav.js

- `(top level)`: PT-054 (the owner's report: Glass Steppe stutters): a field is a flood of the whole map, and the cache held four of them, so a dozen creatures that had lost sight of the player (each hunts a DIFFERENT last-seen cell) rebuilt a field on nearly every tick;
- `(top level)`: (PT-029: a timing platform counts at its high stop:
- `(top level)`: fields kept per world: one per distinct target cell (the player's, and every hunter's last-seen spot: the biggest stand has 81 creatures); a field is W x H x 4 bytes. Least recently USED goes first: a FIFO that is one short of the number of hunters rebuilds every field on every pass (PT-054, measured: 37 fps instead of 60 with 58 hunters and 48 places)
- `(top level)`: * a door or secret cell, right now: shut doors are walls; a breathing gate is a way through for the field (PT-027: a creature waits at it while it is shut)

## src/engine/noisetell.js

- `(top level)`: THE NOISE TELL (PT-045, drop B, E9; design/ACTD.md section 2: the quiet play of C2M26 Silent Roots). Pure and read-only: what a shot from the weapon in hand would carry, so the HUD can say QUIET or LOUD with a number and the automap can draw the ring. The numbers are the

## src/engine/phases.js

- `(top level)`: PHASES, THE UNISON SHIELD AND THE `hp:` CONDITION (PT-043; design/ACTC.md section 3, design/ACTD.md section 2). Pure functions of the world's enemies; nothing here stores anything on a world that does not use it.

## src/engine/platforms.js

- `(top level)`: TIMING PLATFORMS (PT-029, Episode 3 Batch D, the Resonance Loom): a moving floor (a map `sectors` entry) with a `cycle: { period, hold, phase }` rises and falls on a clock that is a PURE function of `w.time`, exactly like the

## src/engine/progress.js

- `(top level)`: Campaign progression (owner decision, PT-008, 2026-10-05): a RANK per map (S/A/B/C from time, kills and secrets), SALVAGE earned from ranks and secrets, and persistent UPGRADES bought with it
- `(top level)`: * PT-057: the second tiers of mods bought at the Locker ({ id: true }): known mods only; null when there are none, so a progress that never bought one is exactly what it was
- `rankFor`: PT-037: a Vael who never raised a hand and is dead costs the rank, and only a map that has such Vael ever carries the count
- `sanitizeProgress`: PT-050 H1: a safe integer, never 1e308 (Grok G-05)
- `sanitizeProgress`: PT-037, THE RECORD: the ids of the messages a player has received, per map (the text is read from the map, so a corrected line corrects the Record). Lazy: absent until the first message.
- `sanitizeProgress`: PT-039 (Act B): the choices a player has made (a wing taken at C2M11): id -> value, short lower-case tokens. Lazy: absent until the first choice.
- `sanitizeProgress`: PT-077: which playthrough of the stats database this run belongs to (a row id there). Lazy: absent in a save made before the stats.
- `sanitizeProgress`: PT-063 (R13, the story cinematics): the ids of the scenes a player has watched (a scene plays once by default; the Record replays one). Lazy: absent until the first scene.
- `sanitizeProgress`: PT-054 (the Log): when and where each message was received, [seconds, cell x, cell z], per map. Lazy: absent until the first message.
- `sanitizeProgress`: PT-054 (the Items page): the pickups of the attempt being played, [kind, seconds, cell x, cell z], per map, at most 300 each. Lazy: absent until the first pickup.
- `sanitizeProgress`: PT-052 U3b (the Bestiary): the kinds of creature the player has met, in the order of ENEMIES. Lazy: absent until the first meeting.
- `earn`: PT-050 H1: a finish without real numbers pays nothing and records nothing (Grok G-01, G-04)
- `buy`: (PT-050 H-S6: `toString` and `__proto__` are not upgrade tracks)
- `(top level)`: * PT-057: buy tier two of a mod the player has FOUND (`owned` = the mod ids the world says they carry). -> { ok, progress, cost, reason } (reason: 'unknown' | 'notfound' | 'bought' | 'salvage')
- `(top level)`: * PT-057: the Locker's rows for the mods a player owns: [{ id, name, tier, cost, text }] (cost null once bought)
- `describeNext`: PT-050 H-S6

## src/engine/range.js

- `(top level)`: The dev-only weapons range (PT-016). Pure functions of the world, called from world.js only when a map says `range: true` or an enemy says `hold`; no shipped map does, so nothing here touches the campaign's simulation.
- `rangePlayer`: PT-056: every load for every gun held, kept full (nothing is selected for you: T turns the gun to its next load; `w.range.loadsOff` is the hook a test uses to keep the Range's loads out of its arithmetic)
- `rangePlayer`: PT-057: every mod, tier one (a tester buys nothing: tier two is tried through the dev hook)

## src/engine/reach.js

- `analyseReach`: PT-045: a car is a ride between the cells beside its stops
- `analyseReach`: PT-032: a vent plate throws the player to its landing

## src/engine/reposition.js

- `(top level)`: RUNNING TO OPEN THE RANGE (PT-064; the owner, 2026-10-19, playing the Marksman: "Sniper moves clunky"). The trace of the sim said why: a creature that wants more distance used `retreatStep`, which walks straight AWAY from you while the body keeps FACING you at its turn rate, with the
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

## src/engine/resonator.js

- `(top level)`: PT-037, Campaign 2 Act A (design/CAMPAIGN2.md E2): RESONATORS, the standing forks of the Tuning Fork Fields. A `resonator` prop hears every noise the sim makes (world.js `noise()`: gunfire, a landed blow, a blast) inside

## src/engine/rootbell.js

- `(top level)`: THE ROOT BELL'S CLAPPER (PT-043; design/ACTD.md section 4): the last boss as a shooting fight. Pure behaviour, with the world's helpers handed in (`ctx`, as sweep.js does), so a node test can hold every rule.
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

## src/engine/save.js

- `MIGRATIONS`: v9 -> v10 (2026-10-07): weapon identities and melee (PT-013). The player gains the charge, swing, guard and melee-slot fields, the world gains burning ground. Old worlds start with all of it at rest.
- `worldShapeErrors`: PT-050 H1: a list stored as a string, an object as a number
- `(top level)`: ---- PT-050 H1 (the hostile testers' save findings, design/HARDENING.md): a save the loader ACCEPTS must be one the game can play. Before, a save with the right shape but wrong VALUES (an unknown weapon, a string for a list, ammunition of 1e9,
- `(top level)`: * PT-056: the ammunition loads a player carries ({ gun: { load: units } }) and which is selected ({ gun: load }): known guns, known loads that fit the gun, counts the sim could have made (a share of the standard cap)
- `(top level)`: * PT-057: the mods a player owns ({ id: 1 }): known mods only
- `(top level)`: * Rebuild a world from a save. mapLoader(id) -> MapData. Mid-level saves need the same map version; otherwise fall back to level start. * -> { ok: true, world, degraded? } | { ok: false, reason, detail }. It NEVER throws: any failure while rebuilding is a rejected save (PT-050 H1).
- `SaveStore`: * PT-050 H1: a slot that broke the game is set aside as `<slot>.bad` (the text is kept for a bug report) and cleared, so Continue falls through to the next slot instead of loading it again. -> true if there was something to set aside

## src/engine/saw.js

- `(top level)`: PT-022 (owner go 2026-10-08): the CHAINSAW, held fire. Unlimited fuel, a STALL (owner: "unlimited with a stall"): hold fire to rev, it cuts every body in front of you every WEAPONS.chainsaw.saw.every seconds, cutting builds heat, plate
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

## src/engine/script.js

- `runAction`: PT-039: a remembered choice (lazy state; the shell keeps it in progress.choices and the next map's world starts with it)
- `runAction`: PT-046: a message that is answered by a choice is delivered by an action only when the choice holds, as a positional one is
- `runAction`: PT-043: a toll, a creak, a chord from a trigger (events.js plays the synth recipe of that name)
- `runAction`: PT-043: the view shakes and a low sound runs under it
- `runAction`: PT-043: the Hive Cantor is dead: the beat stops, the lights stop swelling (lazy state)
- `runAction`: PT-045 (dev range only): the plain hand lantern, or Ines's own (eternal) lamp, so the lamp yard can feel both holds (mapformat refuses it outside a range map)
- `runAction`: PT-063 (R13): a story scene starts here. The sim only ANNOUNCES it (a headless run and the bots ignore the event); the shell stops stepping the world and plays it (src/game/cinematics.js)
- `runAction`: PT-043: the Root Bell hangs still: the score and the ambience are cut from now on (lazy state: only a map that says so has it)
- `updateSectors`: PT-029: a timing platform stands where its clock puts it (platforms.js); it announces the start and the end of each move
- `(top level)`: * PT-070: a message with `unless` (one trigger condition or a list; ANY of them true) is not said: a reminder that a gate is shut is silent once it is open. A message without `unless` is never held.
- `conditionMet`: PT-033: a list is an AND
- `conditionMet`: PT-037: the opposite of a condition (a seed ripens at time:90 unless not:dead:seed has stopped being true)
- `conditionMet`: PT-039
- `conditionMet`: PT-038: a chime phrase was played (chimes.js) // PT-033: a receiver is lit (beams.js)
- `conditionMet`: PT-043: the hand lantern is lit
- `conditionMet`: PT-043: a group is under a share of its hit points (phases.js)
- `activateSwitch`: PT-050 H-E3: a switch that SPAWNS creatures is single-use whatever the map says (C1E1M03's north hoist had no `once`: every flip of the lever added four Gaunts to the kill total and to the ammunition drops)

## src/engine/sweep.js

- `(top level)`: THE GATE WARDEN'S SWEEP (PT-033, Episode 4 Batch E, design/EPISODE4.md E5): a beam from the Warden's eye that turns through an arc after a tell. A ray, not a cell walk: it is traced in 0.25 m steps along any angle, stops at a wall, a shut door
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

## src/engine/tactics.js

- `(top level)`: ENEMY ACTIONS (2026-10-26; the owner, after the look polish: "enemy actions is part of what we are testing"). The ordinary creatures were a straight line at the player: every melee creature walked the
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)
- `TACTICS`: (the first numbers, 2 / 3 / 4 of each, killed the perfect bot on Hard on six maps: a fan lets more blows land than a queue did; PT-076: four shots at once on Hard, from shooters that now run across between shots and ring for help, was a volley of seventy hit points in a second)
- `(top level)`: (PT-076: a Tollbearer's lurch is an attack and holds a turn: in a wave, four surging at once was a wall)

## src/engine/terrain.js

- `cellFloor`: PT-032: open sky has no floor to speak of
- `(top level)`: (PT-045: a car's deck is a floor over the point it covers)
- `fxAt`: PT-027: a spore bed does nothing while it is dormant (breath.js)
- `fxAt`: PT-045 (E12): the tide wets every walkable cell whose floor is under the water

## src/engine/tide.js

- `(top level)`: THE TIDE (PT-045, drop B, E12; design/ACTD.md section 2: used by the Last Tide, C2M28): the water level of the whole map as a pure function of the sim clock, like breath.js, platforms.js, loads.js and belts.js, so a save, a replay and a route bot need

## src/engine/traps.js

- `(top level)`: Cells a player can WALK or FALL into from which no exit can be reached any more (PT-024: the Pump Cathedral's east side, a one-cell trench and six bays at floor level behind the 4 m catwalk: step off the back of the
- `findTraps`: PT-032: a vent plate throws the player to its landing (the void sets a miss back: it traps nobody)
- `findTraps`: PT-045: a car carries a rider from any stop to any other (the loop comes round)

## src/engine/viability.js

- `(top level)`: * the ammunition the route bot fights with (PT-023): the capacity the gates count is what a bot with THOSE guns can use; a carbine round or a rocket would only inflate the total and hide a shortage of the rest, and a found melee weapon has no ammunition at all
- `(top level)`: * * The same for a map fed by DROPS (PT-025): there is no box count to add up, so what is available is what the perfect bot's own run shows: what it started with, what it was GIVEN (`stats.gained`: after the caps) and what lies on the * floor uncollected (drops and the few boxes a map keeps), per type (only the types the bot fights with count in the total, as above).
- `evaluateViability`: PT-052 (Bot v2, first half): a seed is completed if EITHER policy completes it
- `evaluateViability`: PT-052: the ammunition is judged on the run that COMPLETED (a standing fighter that died at the half-way mark has burnt its shells in a panic)
- `levelFacts`: (the peaceful are scenery to the quality gates: PT-037)

## src/engine/world.js

- `(top level)`: PT-045 (E8b): cars (lazy: a map with no `cars` never reaches them)
- `(top level)`: PT-045 (E8a): conveyors on a clock (lazy: a map with no `belts` never reaches them)
- `(top level)`: PT-060: the Marksman's frozen line (lazy: only a creature with `snipe` reaches it)
- `(top level)`: PT-060: the Mender's tether (lazy: only a creature with `heal` reaches it) // PT-057: weapon mods (lazy: only a player who has found one has `p.mods`)
- `(top level)`: PT-056: ammunition loads (lazy: only a player who has picked one up has `p.loads`)
- `(top level)`: PT-076: the brain (dodge, strafe, lurch, circle, cower, call)
- `(top level)`: PT-022: the gravity tool and the movable props (nothing here runs on a map without movable props unless the fork is in hand)
- `(top level)`: PT-027: the Bell-breaker mortar (indirect fire)
- `(top level)`: PT-022: the chainsaw's held fire
- `(top level)`: PT-033: the Mirror Array's light (lazy state: only a map with an emitter has `w.mirrors` and `w.beams`)
- `(top level)`: PT-033: airlocks and vacuum (lazy: only a map that has them uses them)
- `(top level)`: PT-033: the Gate Warden's sweep
- `(top level)`: PT-043: the Hive beat (a pure function of the tick)
- `(top level)`: PT-043: the unison shield and the phases of a boss
- `(top level)`: PT-043: the Hive Cantor's beat
- `(top level)`: PT-043: the Root Bell's clapper
- `(top level)`: PT-037: the standing forks (lazy: only a map with a resonator prop has `w.resonators`) // PT-037: the Vael civilians (peaceful: states 'calm' and 'flee', never 'idle' or 'chase')
- `(top level)`: PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)
- `spawnEnemy`: PT-043: the Root Bell's clapper hangs from the moment it exists
- `createWorld`: PT-039: what earlier maps remembered (progress.choices): lazy, a world without any has no field
- `createWorld`: PT-057: found mods ride between maps (lazy)
- `createWorld`: PT-056: ammunition loads ride between maps like ammunition (lazy: only a carry that has some)
- `createWorld`: PT-022: props the gravity tool can lift (only a map that lists them has any)
- `createWorld`: PT-081: a cracked wall is a wall to Use; a panel a switch opens says "opened elsewhere"
- `createWorld`: PT-038 (E6): chime state, only where the map has a chime or a tree
- `createWorld`: PT-038 (E5): the hand lantern: lazy, only a map that carries one has it; PT-046: Ines's own lamp (taken in C2S02: choices.lamp = 'own') burns without oil and holds a ring back harder
- `createWorld`: PT-037 (resonator.js)
- `createWorld`: PT-033: the beams (beams.js)
- `(top level)`: * PT-033: trace the beams again; a receiver that becomes lit or dark says so (the view and the audio read the events, a trigger reads `w.beams.lit`)
- `(top level)`: * PT-033: Use on a mirror turns it a quarter step clockwise
- `(top level)`: (PT-032: open sky blocks everyone who is not in the air)
- `blockedCircle`: (PT-045: in a map with cars the void blocks the player's CENTRE and not the whole body: a body may overhang an edge, so a deck that leaves a dock can never strand it inside a rule it no longer satisfies; the centre may be over a void cell only where a deck covers it)
- `blockedCircle`: PT-033: a body in the air above the height of a prop or a creature passes over it
- `tryMove`: PT-050 H1: at most 64 sub-steps (16 m a tick; play uses 1 to 3): a speed of 1e9 in a damaged save was 66 million sub-steps, a frozen tab
- `(top level)`: * wading water or a current: what the arc lamp conducts through (PT-037: a current is water that moves)
- `(top level)`: (a conveyor is a machine, not water: PT-045)
- `(top level)`: * PT-037 (E3): a flowing floor pushes whoever stands on it, FLOW.push m/s, on top of their own movement
- `flowPush`: PT-045 (E8a): a clocked belt pushes by its own speed, signed by its clock, and not at all while it stands still
- `(top level)`: * PT-033: a body in a region of vacuum takes VACUUM.dps a second (the difficulty scales it, as a toxic bed's); `p.vac` is lazy state that only a map with vacuum has
- `(top level)`: * `from` (optional) = where the blow came from, { x, z } in metres: it rides on the `hurt` event as fx / fz so the view can point at it (look polish 10). Event payload only: the sim's state is the same. * `src` (PT-077, the stats database) = WHO or WHAT did it, a `sources` id: 'enemy:<kind>', 'hazard:<name>', 'self:own_blast'; when it is not given it comes from `from` (a creature, or a shot or ring that carries its shooter's `src`). Also payload only, with the hit points left.
- `(top level)`: PT-077: a floor that hurts, as a source of the stats (the pool is the Weeping Mother's tear)
- `(top level)`: * how far a creature notices the player (PT-038, E5): its own range, except in a dark place, where it is `sightDark` unless the player is lit; the Hush-driven kinds ignore the light
- `(top level)`: * * A MELEE strike on the player (a swing, a Gaunt's lunge, a Warden's charge): the guard (PT-013) answers it. Returns 'hit' | 'block' | 'broken' | 'parry'. * With a melee weapon in hand and the guard up, and the attacker in front: a guard raised no more than GUARD.window s ago PARRIES (no damage, the attacker is staggered, the next melee hit is doubled); * a guard held longer BLOCKS (most of the damage is stopped); a heavy blow breaks the block. Ranged toll-shots never come through here.
- `(top level)`: * a Zealot's lance that lands GRAFTS (PT-038): `p.graftT` is lazy state, set only here; it slows the walk (the speed line in updatePlayer) and counts down with the clock
- `noise`: PT-039 (Act B): in a place with an echo a loud noise carries that much further (a quiet one does not)
- `noise`: PT-037: a fork in earshot will ring
- `noise`: PT-029: a sound-lock door listens (only a map that has one records this)
- `noise`: PT-037: a peaceful creature runs from it instead of waking
- `damageEnemy`: PT-056: did the plate turn this blow? (the penetrator load doubles what a plated creature takes)
- `damageEnemy`: (a Bulwark Shell's carapace is open while it bashes, PT-028) plate on the front arc: only the shooter's side counts, splash and a harpoon bolt ignore it
- `damageEnemy`: PT-029: an awake Acolyte's ward
- `damageEnemy`: PT-043: the Hive Cantor takes a twentieth until its choir has fallen
- `damageEnemy`: PT-056: a load's own effect on the blow
- `damageEnemy`: PT-056: a chilled creature takes the next BLOW harder, once (every pellet of that volley: they land on one tick) // PT-043: the Root Bell's heart is open in the Last Note
- `damageEnemy`: PT-077 (the stats database): the player's blow, by gun and by attack number (event payload only)
- `damageEnemy`: PT-037: hurt, it runs (from the one who did it)
- `damageEnemy`: PT-037: an innocent is not a kill, and leaves nothing
- `(top level)`: ---- what a hit DOES to a creature that survives it (PT-013: every weapon has its own answer) ----------------------------------------------------------------------------------------------------
- `(top level)`: (PT-056: a rime load's chill)
- `(top level)`: * PT-056: the statuses a load leaves: a creature alight burns (and is put out by water), a chilled one thaws. Runs only once a load has hit something (`w.loadFx`).
- `loadFxStep`: PT-057: the barbed bolt's wound
- `(top level)`: * PT-056: a load's mark on a creature that survived the shot (slag lights it unless it stands in water, rime chills it); the event tells the view and the sound which
- `updateBurns`: PT-056: a rime flare's ground chills whoever stands in it and puts their fire out
- `(top level)`: * PT-081: a cracked wall (a secret whose panel opens to a SHOT) gives way to a pellet, a bolt or a blast that reaches it
- `explode`: PT-022: the rocket's direct hit, and a bell node takes the blast twice over
- `fireHitscan`: PT-022, the carbine: a round in the top of the body
- `fireHitscan`: PT-056: the penetrator goes on through one more body
- `fireHitscan`: PT-038: a shot that stopped on a chime struck it (once a volley)
- `fireBolt`: PT-057: the barbed bolt pins a lunging or charging creature, staggers a Bulwark, and (tier two) the wound bleeds
- `fireArc`: (PT-037: the lamp never locks onto a peaceful Vael)
- `(top level)`: ---- melee (PT-013) ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
- `(top level)`: * PT-077: the weapon a swing is made with, for the stats (the fists' jab and heavy are the fists, the quick bash is the bash)
- `startSwing`: PT-077: every swing is an attack with a number, like a shot
- `fireWeapon`: PT-057: the gun as a mod leaves it
- `fireWeapon`: PT-056: a selected load with enough in it is fired INSTEAD of the standard ammunition
- `fireWeapon`: (PT-077: every shot has a number, carried by a flare or a rocket to where it lands)
- `fireWeapon`: PT-027: the mortar throws the shell TO the point the crosshair rests on (the landing, not the aim, is what the unsteady hand scatters)
- `fireWeapon`: PT-076: the creatures read it later in this same tick (a dodge); never saved, never hashed
- `(top level)`: * PT-076: a Bellhand's call along the floor: the sleeping ordinary creatures within `r` m whose walk to it is at most 1.3 r (a shut door is not walked through), the nearest `most` of them; `wake` = wake them, else only count
- `(top level)`: * PT-076: what the brain may use of the world (brain.js)
- `useTarget`: a closet panel is a wall to the player (and so is a cracked wall: PT-081)
- `useTarget`: PT-038: a chime or the tree
- `useTarget`: mirrors (PT-033): the nearest one within reach that the player is facing
- `(top level)`: * PT-060: one step toward a point (the Mender goes to the ones it tends), round whatever is in the way as the others do; false if it could not move
- `(top level)`: * PT-064 (reposition.js): a heading away from the player that is open for a metre and a half, tried nearest the straight line away first (or round `prefer`); null when the creature is walled in
- `bossStep`: PT-030: the second ring of a double pulse (the Grand Cantor)
- `bossStep`: PT-033: the Gate Warden's sweep
- `bossStep`: PT-062: a mobile boss circles at its range
- `(top level)`: ---------------------------------------------------------------- the Cantor Acolyte (PT-029)
- `(top level)`: ---------------------------------------------------------------- the Brood Vat (PT-030)
- `vatStep`: PT-062 (R10): a feeder FEEDS the Graft-Mother's brood with the same machinery a vat uses
- `(top level)`: ---------------------------------------------------------------- the Weeping Mother (PT-028)
- `(top level)`: * PT-043 (design/ACTD.md section 1): a map that says `lampHolds` has a lit lantern cut a ring's damage to `plain` (or to `own` with Ines's eternal lamp): the lamp is the counter-tone (Campaign 1's first secret)
- `(top level)`: * PT-043, the Resonant: on every beat, a ring whose damage grows with the company it keeps (awake, living, hostile creatures within `ring.near` m); alone it is only a slow brute
- `updatePulses`: PT-039: the Sub-Cantor's ring turns at the wall and comes home: it can hurt a second time
- `(top level)`: ---------------------------------------------------------------- falling loads (PT-032, Episode 4 Batch A: the Ascent Tether)
- `updateLoads`: (PT-045: a strip of a collapse front that says `tremor` shakes the view as it begins to fall)
- `(top level)`: ---------------------------------------------------------------- cars (PT-045, drop B, E8b)
- `(top level)`: ---------------------------------------------------------------- the air state and the launch vents (PT-032, Episode 4 Batch A)
- `(top level)`: * PT-050 H-E1: what the last-resort feed hands out: flares (the cannon every player starts with and keeps), and only if a player somehow has no cannon, the ammunition of the first gun they do carry (Gemini-06: flares for a gun nobody holds were no feed at all)
- `groundAir`: PT-045: over the void on a car's deck is riding (nothing to go back to mid-air); over the void with no deck under the feet is a miss. PT-050 H1 (Gemini-03): on a map WITHOUT cars too (carDeckY is -Infinity there): a body on the ground over open sky is put back, never remembered as "the last solid place" (1,740 random vent flights never reached this state; only a teleport or the 14 s timeout below could)
- `airMove`: (a deck of a car under the body is a landing, not a miss: PT-045)
- `airMove`: a body that has not come down in 14 s is put down (a ceiling, a wedge) - unless it is over open sky, where that is a miss (PT-050 H1)
- `(top level)`: * PT-045 (the lamp yard): the pulse of a boss on its own, for a range target that says `rings: true`: after its cooldown, when it sees you, a windup, then one ring (`reflect` as the boss's own); nothing else of bossStep. Only a range map can say it.
- `updateEnemy`: PT-043: the Root Bell's clapper hangs on a pendulum (rootbell.js): its place is a function of the clock
- `updateEnemy`: PT-030: a Brood Vat swells and births while it is awake; it never fights
- `updateEnemy`: PT-037: a walker in a current is carried by it (a sleeper is not: it lies where the map put it)
- `updateEnemy`: the rest of a Chorister's burst (PT-026)
- `updateEnemy`: PT-037: it never fights: it wanders, watches, and runs (folk.js)
- `updateEnemy`: PT-043: the Resonant rings on the beat
- `updateEnemy`: PT-045 (dev range only): a target that only RINGS (the lamp yard's Sub-Cantor): its pulse, and nothing else of a boss
- `updateEnemy`: PT-046 (C2M28): a `hunt` creature (a wave out of the dock's gates) always knows where you stand and never goes back to sleep
- `updateEnemy`: PT-043: the clapper (rootbell.js): hung and falling take the tick, on the ground the ordinary code below runs
- `updateEnemy`: PT-060: the Marksman's shot
- `updateEnemy`: PT-060: the Mender's tether
- `updateEnemy`: PT-043: the Hive Cantor works on the beat (hivecantor.js)
- `updateEnemy`: PT-076: the brain (brain.js): a dodge, a run across, a lurch, a circle, a cower, a call
- `updateEnemy`: (ENEMY ACTIONS: a walking shooter side-steps after a shot; PT-076: one with a brain RUNS across, brain.js)
- `(top level)`: * PT-033 (owner 2026-10-10: "the lock won't open"): a Use on an airlock door that is still cycling is not thrown away. `want` is set by that press: the OTHER door is told to shut now (unless somebody stands in it), and this one opens by itself the moment the air has settled (airlock.js `lockBusy`). Walking more than LOCK.giveUp metres away forgets it. Lazy: only a lock door that was pressed while busy ever has it, and the route bot never presses a busy door.
- `(top level)`: * PT-045 (E8b): a rider whose feet were on a car's deck at the previous tick is carried by the deck's motion since (the car is a pure function of the clock; creatures never board)
- `step`: PT-050 H-L4: the born corpses beyond the cap leave (nothing changes for a run that has fewer)
- `step`: PT-056: the key that turns the gun to its next load
- `step`: PT-038 (E5)
- `step`: PT-045 (E8b): a car carries what stands on it, before anything else moves
- `step`: PT-050 H-I2: an infinite look value (a broken device) would make the view vector NaN for good
- `step`: PT-032: a vent has thrown the player: low gravity, a little steering
- `step`: PT-033: a drift floor has almost no grip (FX.d): the same pull, a tenth of the rate
- `step`: PT-037: the current carries you
- `step`: PT-033: vacuum (airlock.js)
- `step`: PT-022: keys 1-5 the first guns, 6 the melee slot, 7-9 the later guns
- `step`: PT-050 H-I1: a true modulo (a step below -1 gave a negative index); the input layer only makes -1, 0 and 1
- `step`: PT-029: the lock is listening: it will not open to Use until it has heard nothing for `quiet` s
- `step`: PT-027: it opens when the ship breathes in, whatever you do
- `step`: PT-033: the other door of the airlock is open or the air is still moving; the press is KEPT (owner 2026-10-10, "the lock won't open"): the other door shuts now and this one opens by itself when the air has settled (the door loop below)
- `step`: PT-057: the rivet driver's spin-up climbs while the trigger is held and runs down when it is let go
- `step`: PT-022: the chainsaw (hold to rev and cut, saw.js)
- `step`: PT-022: the tuning-fork (gravity.js)
- `step`: PT-022: creatures a punt is carrying, and the movable props (both do nothing unless there are some)
- `step`: PT-033: a Use that came while the airlock was cycling is kept
- `step`: PT-013 gave everybody fists, and the first version of this batch removed the feed ("fists mean you are never empty"). It is back, as a safety net: fists cannot hurt a plated Warden from the front (a bash does a third of its damage through the plate), so a player who ran dry in front of one could be soft-locked, and the robustness gate (a strafing fighter with 25% less ammunition pickups must finish C1E1M06) failed without it.
- `step`: ammunition drops (PT-025): the guns fired this tick are noted and a box that has dropped slides toward the player; both do nothing on a map without `drops`
- `step`: PT-057: a found mod stays with the gun for good
- `step`: PT-056
- `step`: PT-038: lamp oil (only where there is a lantern, and not past its tank)
- `step`: PT-038: the chime tree's phrase goes on
- `step`: PT-033: the beams follow the mirrors and the doors

## src/game/automap.js

- `drawAutomap`: levers seen so far: a small plate on the wall they are set in, red until thrown (PT-045)
- `drawAutomap`: the noise tell: how far a shot from the weapon in hand carries (PT-045, E9)
- `drawAutomap`: PT-054: where each line of the Journal's Log was said: a numbered disc on the cell the player stood in (the number is the one beside the line)

## src/game/bestiary.js

- `(top level)`: PT-052 U3b, the BESTIARY (the Journal's fifth page): a page that fills the first time a creature is MET (it has noticed the player or it has died), with its name, its hit points and ONE plain line on what it does and the way to answer it. It also serves the players who want to know what they are fighting.

## src/game/bindings.js

- `legendText`: every slot of defs.js, the mortar's 0 included (PT-047 D5)

## src/game/captions.js

- `(top level)`: SOUND CAPTIONS (PT-071, R20 accessibility): the sounds that matter, as words on the screen, with where they came from. Off by default (settings.captions). Pure: no DOM, no sim; it reads drained events, the way the audio layer does.
- `CAPTIONS`: PT-076 (brain.js)

## src/game/cinematics.js

- `(top level)`: STORY CINEMATICS (PT-063, R13 of the Director's Plan, workstream L): a SEQUENCER. Pure data in, data out, so a node test can hold it without a browser. A scene is a camera path (keyframes eased between), subtitles, and a short list of declared
- `(top level)`: - the clock is real time: the sim is never slowed for a scene (decided 2026-10-15, PT-051), it simply is not stepped while one plays.

## src/game/credits.js

- `(top level)`: THE CREDITS (PT-071, R25). PURE: the lines of the roll and where the roll stands at a given moment; main.js and ui.js draw it. Nothing here invents a name:
- `(top level)`: * [role, names]: the owner's own list. An empty `names` hides the role.

## src/game/crosshair.js

- `(top level)`: PT-048 / V2 (the owner, 2026-10-14: "we need to make the cross hair stand out a bit more, the hallow circle is hard to see. A cross or a solid dot would be better."): the crosshair's settings, PURE.

## src/game/difficulty.js

- `(top level)`: PT-071 (R20, first run): what a difficulty changes, in words, derived from the numbers the sim uses (DIFFICULTY in defs.js) so the copy cannot drift from the game. Pure: no DOM, no sim.

## src/game/ending.js

- `(top level)`: The end of a campaign (PT-036; the owner, 2026-10-11, after the Gate Warden: "we need a real ending beat for the campaign").
- `ENDINGS`: PT-043: THE DRAFT of Campaign Two's epilogue (design/ACTD.md C2M30; written to be revised after the owner has played the descent). The facts it must carry, in order: the Bell has stopped; the Gate is a bell and a lit lamp holds it shut; someone has
- `(top level)`: * PT-063 (R13, workstream L): THE COLD OPEN, shown before the first level of a new campaign (once; the Record replays it from the title). Four cards over the title picture, the last over the plate of the tower (`ui_cold_tower`). It plants what the ending pays: * the harbour lamp and the fog-bell (the Campaign Two beach names its world after the bell, and the last scene hangs the lamp). `coldOpen: true` makes the shell go on to the level (or back to the title) instead of to a tally. Original text, LORE.md section 5.

## src/game/errorlog.js

- `(top level)`: PT-050 H1 (design/HARDENING.md H-F1, and M7 of the commercial plan: "a crash and error log the player can export"). Two things, both PURE so a node test can run them:

## src/game/firstrun.js

- `(top level)`: PT-071 (R20, first run): the line a new player gets once, after the controls reminder of their first level. Pure: it names the keys (or the pad's buttons) the player actually has.

## src/game/gamepad.js

- `(top level)`: Controller support (PT-013, owner go 2026-10-07; PS5 and Xbox). PURE: a snapshot of a pad in, plain data out; the shell (main.js) polls navigator.getGamepads() once a frame and feeds the result into the same

## src/game/itemhelp.js

- `(top level)`: PT-054 (the owner, 2026-10-19: the Journal "does not track items or weapons you pick up, so the player still isn't sure what all they have and how best to use it"): what each gun, each key and each kind of pickup is FOR, in plain words, for the Items page.

## src/game/journal.js

- `(top level)`: PT-049 U2 (the owner: "the writing is on the screen while the game continues to move at full speed, so you can't really read" ... "we need a menu or something like in an RPG"), DECIDED 2026-10-15: the simulation clock is NEVER slowed for text.
- `(top level)`: PT-054 (the owner, 2026-10-19: "no way to tell when or where it was said, the sayings should be based on the level you are currently on, and be sorted by the level you are currently on"): the Log is SORTED BY LEVEL: the level being played first (what was said
- `(top level)`: ---- PT-052 U3 (Session C): the other pages of the Journal. All PURE (data in, data out; no DOM, no sim): the shell passes what the world and the progress hold at the moment the Journal opens. ----
- `(top level)`: * the Items page (PT-054: it now says what you picked up and how to use it): `weapons` carried (the key, the ammunition against its cap, what it is for, how to get the most from it, and where it came from), `keys` by colour, `armor` against its cap, `lamp` (the oil, on a map with a lantern), * the Locker's tiers, and `ledger`: everything picked up on THIS attempt of the map, one row per kind (how many, when and where the first and the last), the guns and keys first, then armour, oil and satchels, then ammunition and dressings. * `found` = progress.found[mapId] (the pickups of this attempt: [kind, seconds, cell x, cell z]), `map` = the map being played (for the words of a place).

## src/game/lockpolicy.js

- `(top level)`: Pointer-lock policy (PT-050, the owner's fifth mouse complaint, 2026-10-18: "Do not take control of my mouse"). The game asks the browser to lock the pointer every time a level starts or resumes.
- `(top level)`: hides and confines the real cursor on the desktop: the symptom the owner described, "the mouse stops reaching the whole screen". The test hook used to switch the lock off only AFTER the level had started,

## src/game/main.js

- `(top level)`: PT-016: the dev-only weapons range lives in maps-dev/, never in maps/ (it is not a campaign map and no validation, status or test counts it); loaded only by the dev server
- `(top level)`: PT-077, THE STATS DATABASE (src/game/stats, design/STATS_DATABASE.md): sql.js starts in the background. The game never waits for it; if it cannot start, the stats are off this session and the stats screen says why.
- `ui`: PT-063: the cold open plays before the first level of a new game, once
- `(top level)`: * PT-071 R20: the text size and the reduced-motion class of the page (the view reads reducedMotion through setLook)
- `(top level)`: * PT-071 R24: one finished attempt at a map goes into the play log, if the player turned the log on (never twice for one attempt)
- `(top level)`: ---- PT-077, the stats: what the shell tells the recorder, and the stats screen ----
- `(top level)`: ---- the Record (PT-037, record.js): every message received, replayed from the pause menu and the title ----
- `(top level)`: * PT-071 R25: the credits roll, from the title: a screen on the wall clock (the roll's own pace), nothing in the world moves
- `(top level)`: PT-039: a choice the player made is kept in the progress at once (the next map's world starts with it)
- `(top level)`: PT-071 R21: the width the quality governor says (the player's own choice until the frames run slow)
- `startLevel`: PT-077: an attempt still open ends here (a load closes it as 'reloaded': what happened after the save still happened)
- `startLevel`: PT-063: a level never starts under the overlay of a story scene that was playing
- `startLevel`: (applySave sets them again after this: a save that breaks the game in its first three seconds is set aside, PT-050 H1)
- `startLevel`: PT-071 R24: a new attempt for the play log
- `startLevel`: PT-071 R20: a new profile also gets one line about the objective and the Journal
- `buyModTier`: PT-057: tier two of a mod you carry, bought with salvage at the Locker
- `(top level)`: * PT-036, the end of a campaign: the finale's exit shows the epilogue (cards typed over the Gate's picture, then the tally of the whole campaign), THEN the intermission (rank, Locker, next map) as for any map. * The records are already written when it starts (earn + commitProgress ran at the exit), so closing the game here loses nothing.
- `startEpilogue`: PT-043: each campaign's own picture (syncEpilogue sets it, a card may name its own: PT-063)
- `syncEpilogue`: PT-063: the picture behind the card
- `syncEpilogue`: PT-063: the cold open has no tally: on to the level, or back to the title for a replay
- `syncEpilogue`: PT-043: a dev map's draft epilogue ends at the title, with no tally of a campaign nobody finished
- `syncEpilogue`: PT-077: the playthrough told from the stats
- `(top level)`: * PT-063 (R13): the cold open, as the epilogue's machinery (cards typed over a picture) with a different end: `then` runs when the last card has been read or Esc has skipped it
- `(top level)`: * PT-063 (R13, workstream L): A STORY SCENE. The world stands still (no tick is stepped while one plays), the view's eye is the scene's camera (cinematics.js `cameraAt`), the HUD is gone, and the WALL clock runs the sequencer: the simulation is never slowed or sped for a scene. * A scene plays the first time by default (`settings.cinematics`: once | always | off; `progress.cinematicsSeen`), Esc / Enter / Space / the pad's A or B skips it, and a skip runs the actions that had not run, so a skipped scene and a watched one leave the same world.
- `(top level)`: * PT-063: watch a scene again from the Record (the title only: no game is in hand there). It builds a world of the scene's map that nothing writes to, plays the scene on it, and goes back to the title; no save, no record and no setting changes.
- `(top level)`: * PT-049 U2: Tab opens the Journal and PAUSES (no clock change for text, decided 2026-10-15): it opens on the Log when a message has not been read, otherwise on the Map; what was unread has now been put in front of the player
- `openJournal`: PT-054: the Log by level, with a pin on the Map page for every line said on this one
- `requestLock`: PT-050: a script-driven browser never asks for the pointer lock (it can hide and confine the real cursor; see lockpolicy.js)
- `stepOnce`: PT-052 U3b: the Bestiary fills when a creature is first met
- `stepOnce`: PT-077: the stats hear every event; saved every two minutes of play as well
- `stepOnce`: PT-063 (R13): a map's trigger named a story scene
- `(top level)`: PT-077: the stats screen, like the Record
- `(top level)`: PT-052 U3: left and right turn the Journal's pages
- `padMenu`: PT-077: up and down scroll the stats, left and right move between the buttons, A presses one, B goes back
- `padMenu`: the Record (PT-037): up and down scroll it, A or B goes back
- `(top level)`: * a throw anywhere in a frame (errorlog.js guardedFrame): log it, put the game back on the title and say so plainly. A save that broke the game within its first three seconds of play is set aside, so Continue does not load it again (PT-050 H1).
- `frameBody`: PT-071 R21: only frames of real play count
- `frameBody`: the dev range has no scoring, salvage or next map: its exit just goes back to the title (PT-043: a dev map may show a draft epilogue first)
- `frameBody`: a campaign's last map: the epilogue first (PT-036)
- `frameBody`: PT-052 U4: the corner map, redrawn every few frames from the same model as the big one
- `(top level)`: * the weapons range's readout (PT-016): shown only while a range map is being played
- `doorPrompt`: PT-038: a chime or the tree
- `(top level)`: the range's slow motion (PT-020): watch a swing at a tenth of its speed in the real game

## src/game/minimap.js

- `(top level)`: PT-052 U4, the MINIMAP (the owner: "a menu or something like in an RPG that shows you a minimap, objectives, basically everything except exactly what to do"): a small corner map from the SAME model as the automap (engine/automap.js): only what the player has

## src/game/padmenu.js

- `(top level)`: Moving around the menus with a controller (PT-013). Pure: items with rectangles in, the next item out, so node tests cover it without a DOM; main.js turns the DOM into items and the answer back into a focus.

## src/game/playlog.js

- `(top level)`: PT-071 (R24, proof for outside players): the OPT-IN PLAY LOG. When the player turns it on (Settings: "Keep a play log on this device") the game writes down, in the browser's local storage on that device, what a tester would tell the

## src/game/quality.js

- `(top level)`: PT-071 (R21, performance): the automatic quality fallback designed in design/PERFORMANCE_PLAN.md. If MOST frames over the last few seconds are slow (the 60th percentile over `slowMs`: more than two in five), the internal render width steps down one rung

## src/game/rangemeter.js

- `(top level)`: The weapons range's readout (PT-016): what is under the crosshair, what the last hit did, the damage of the current burst, what the targets did to you. PURE: it reads a world and a list of events and builds text; main.js owns the DOM.
- `RangeMeter`: PT-022: the carbine's head zone: the readout says HEAD beside the hit it belongs to

## src/game/record.js

- `(top level)`: THE RECORD (PT-037, the owner: players are going to want the lore and the story). Every message a player receives (a voice on the radio, a log, a placard, a note) is remembered in the run's progress by its id and
- `(top level)`: * PT-063 (R13): the story scenes a player has seen, in the order the scenes are written (the Record offers to watch them again from the title; scenes.js has the list)
- `(top level)`: ---- PT-054 (the owner, 2026-10-19: "no way to tell when or where it was said"; the Journal "does not track items or weapons you pick up"): WHEN and WHERE, and what was picked up. Both live in the run's progress, next to the Record, as small arrays of numbers.

## src/game/scenes.js

- `(top level)`: THE STORY SCENES (PT-063, R13, workstream L): the in-engine cinematics, as data for src/game/cinematics.js. Each is played by the game's own renderer from a camera path, with the simulation standing still, at a moment a map's trigger names with `{ cinematic: '<id>' }`.

## src/game/settings.js

- `(top level)`: (PT-080: 960 is the sharp option the owner asked for; 480 stays the default)
- `defaultSettings`: PT-049 U2: Tab opens the Journal and pauses (off: the old live map over the running game)
- `defaultSettings`: PT-052 U4: the corner map (minimap.js): off | small | large
- `defaultSettings`: PT-063 (R13): the cold open has been shown (it plays before the first level of a new game, once)
- `defaultSettings`: PT-063 (R13): the story scenes (cinematics.js): once (the first time) | always | off
- `defaultSettings`: PT-071 R24: the opt-in play log (playlog.js): off unless the player turns it on; nothing is ever sent
- `defaultSettings`: PT-071 R21: step the render width down by itself when the frame time stays high (quality.js), and back up when it is quiet
- `defaultSettings`: PT-071 R20: the HUD's text: normal | large | larger
- `defaultSettings`: PT-071 R20: no camera shake, a gentler hurt flash and muzzle light
- `defaultSettings`: PT-071 R20: the sounds that matter as words on the screen (captions.js)
- `defaultSettings`: PT-071 R20: the first-run line has been shown (it comes once, with the first level of a new game)
- `defaultSettings`: PT-083 C2: ask for the mouse without the system's acceleration where the browser offers it
- `defaultSettings`: PT-083 C3: invert the mouse; the sensitivity through the sights, as a share of the one that matches the zoom
- `defaultSettings`: PT-083 C5: full | gentle | off (reduced motion turns it off whatever this says)
- `defaultSettings`: PT-048 / V2: style, size, colour, opacity of the crosshair (crosshair.js)
- `sanitizeSettings`: PT-050 H1 (Grok G-07): one key, one action (the pad's bindings already were). The first action in the list keeps a shared code; an action left with none gets its default keys back unless another action holds them

## src/game/stats/boot.js

- `(top level)`: THE STATS, IN THE BROWSER (PT-077): load sql.js (SQLite compiled to WebAssembly; MIT licence, THIRD_PARTY_NOTICES.md) and the browser's IndexedDB, then open the stats service. Browser only (Vite's `?url`).

## src/game/stats/page.js

- `(top level)`: THE STATS PAGES (PT-077): the rundown (report.js) as HTML for the stats screen, the line on the death screen and the card after a level. Pure: data in, text out, every text escaped; ui.js puts it in the page.
- `(top level)`: * PT-080, THE DEATH MAP: a level's plan (its open ground, row by row) with a red dot where each death happened. `map` is the parsed level, `spots` [{ x, z }] in metres. An SVG string.
- `statsHtml`: PT-080: the three levels you died on most, each a plan with a dot where you fell

## src/game/stats/recorder.js

- `(top level)`: THE STATS RECORDER (PT-077): it LISTENS to the simulation's events and writes rows into the stats database; it never touches the world (a stats error can never change a fight).

## src/game/stats/report.js

- `(top level)`: THE STATS SCREENS' QUESTIONS (PT-077): every number the game shows about your play is one SQL query here, asked of the stats database when a screen opens (nothing is cached: the database is small and local).
- `Q`: * PT-080, the death map: every death's level and where (metres), for the plans on the stats screen

## src/game/stats/schema.js

- `(top level)`: THE STATS DATABASE, its blueprint (PT-077; design/STATS_DATABASE.md is the plan, written for someone learning SQL). Pure: SQL text and plain rows, no DOM, no sql.js.

## src/game/stats/service.js

- `(top level)`: THE STATS SERVICE (PT-077): what the game shell holds. The database (statsdb.js), the recorder (recorder.js), the place the database is kept between sessions (`store`: IndexedDB in the browser, a

## src/game/stats/statsdb.js

- `(top level)`: THE STATS DATABASE (PT-077): a thin wrapper round one SQLite database run by sql.js (in the browser and in node tests alike). It knows the blueprint (schema.js), keeps the integrity rules on, wraps the

## src/game/testhook.js

- `installTestHook`: * PT-077: what the stats database has recorded (tools/dev/probe-stats.mjs): ready, saved, the open run, and the overview for this playthrough (or 'life')
- `installTestHook`: PT-071 R21: what the quality governor has decided (tools/dev/probe-quality.mjs)
- `installTestHook`: PT-065: a new game starts a fresh campaign, as the real button does: a choice made in C2M11 leaked into the next map's world of the same page session and made the browser's state hash differ from the node sim's on every later Campaign Two map
- `installTestHook`: * PT-065 (V4/V12): the tone shoulder's two numbers, set live (a probe renders one state under several curves and measures the picture; `shoulder` in post.js and tonecurve.js)
- `installTestHook`: PT-054: one frame of the route bot with NO snapshot (the snapshot hashes the whole world and would drown the numbers of tools/dev/probe-perf.mjs)
- `installTestHook`: * PT-039: a tone pulse of the Sub-Cantor's kind (it turns back at `reflect` m) from (x, z), and what the view draws of the creature `id`: the colour of its first atlas material
- `installTestHook`: * PT-043 (the Preview): the new creatures and effects, what the SIM says and what the VIEW draws of it
- `installTestHook`: PT-035: the contact shadows (shadows.js)
- `installTestHook`: * PT-027: what the view draws for the ship's breath: the mortar's landing ring, each spore region's bed / mist, each breathing gate's slab height against the sim's `open`
- `installTestHook`: * PT-038 (E5): what the view draws for the hand lantern: its light's strength, whether the held lantern is there, the HUD gauge text
- `installTestHook`: * PT-038 (E6): what the chime view draws: each chime's glow and the tree's lit fruit (the sim's own clock decides)
- `installTestHook`: * PT-028: what the view draws for the two elites: the Weeping Mother's tears in the air and the pools they leave (against the sim's), each Bulwark Shell's hinge angle (the open carapace is the tell) and each Mother's sac swell
- `installTestHook`: * PT-030: the Brood Vats' and the Grand Cantor's state (sim) and how they are drawn (the dome's height scale, the horn's tilt), for the stills and the browser check
- `installTestHook`: * PT-032: the air state and what is drawn for it: the player's height and the camera's, the field of view, every vent plate and falling load as the view has them
- `installTestHook`: * PT-029: every moving floor: the sim's height, the height the view draws it at, and the clock (a timing platform follows `platformState`)
- `installTestHook`: * PT-030: every node (bell nodes, feeders, reeds, vats) dead at once: a boss with none left has no shield (the Range's stills)
- `installTestHook`: * PT-036: the campaign epilogue as if the finale's exit had just been taken (the map in hand need not be one). `at` = seconds to step the sequence first, or 'tally' to go straight to the tally
- `installTestHook`: * PT-036: what the shell says about the epilogue and what the page shows (the card, the typed text, the tally's rows, the picture loaded)
- `installTestHook`: * PT-063 (R13): start a story scene on the map in hand as if its trigger had fired (`replay` plays it whatever the setting and the seen list say), run its clock `at` seconds, and say what the shell and the page show
- `installTestHook`: * PT-063: the scene's clock, the camera the view actually has against the pose the scene asked for, and the overlay the page shows (the HUD must be gone, the subtitle typed, the black over it)
- `installTestHook`: * PT-037: open the Record as the pause menu or the title would, and what the page then shows
- `installTestHook`: a screen with sample data, for the front-end stills (PT-021 step 4)
- `installTestHook`: try another place's light on the map in hand (PT-021 stills)
- `installTestHook`: * PT-033: set the mirrors (ids -> rotation 0..3) and trace the beams again: the stills and the browser check put the Mirror Array in a chosen state
- `installTestHook`: * PT-033: what the sim says about the beams and what the view has drawn: lit receivers, the mirror rotations, the plates' drawn yaws, how many bars of light, each receiver's glow
- `installTestHook`: * PT-033: the Gate Warden: what the sim says (the sweep clock, the traced line) and what the view has drawn (the beam's meshes in view, the eye's lid and iris)
- `installTestHook`: * the weapon wheel (PT-013): is it open, what is selected, the clock scale; and push the pointer as the mouse would (the real mouse needs pointer lock, which the harness turns off)

## src/game/toasts.js

- `(top level)`: the load pickups (PT-056): "Slag shells", "Rime bolts", "Penetrator rounds"
- `(top level)`: (PT-057: a mod is named by the mod)
- `(top level)`: * PT-047 V2: the toast column as a MODEL (the DOM only draws it). A toast equal to the newest one still showing is MERGED into it (a count, a renewed life: "Rivets (+40) x2") instead of stacking a copy; at most `max` show at once, the oldest goes first. * `stack` is [{ text, count, until }] in order, oldest first; `now` is in seconds. Returns the new stack (expired toasts dropped).
- `(top level)`: ---- PT-049 U1 (the owner: "not knowing when you pick something up or the importance of it"): pickups come in three tiers. MINOR (ammunition, a small dressing): the toast in the column, as before. MEDIUM (armour, a large satchel, lamp oil): the toast and its own
- `pickupCard`: PT-057: a mod is a card

## src/game/ui.js

- `(top level)`: * PT-080: the pixel-size setting in words (the world is drawn this many pixels wide and enlarged to the screen)
- `(top level)`: * PT-022: what the later weapons say when they are picked up (the older ones are in TOASTS below)
- `UI`: PT-071 R20: what a difficulty changes, in the game's own numbers
- `UI`: PT-077: the stats database's screen
- `UI`: a click anywhere goes on (the button is only a label for it); the mouse must not focus it, or Enter would press it twice (PT-036)
- `UI`: PT-048 / V2: the crosshair's style, size, colour and opacity (crosshair.js)
- `UI`: * the Journal (PT-049 U2, PT-052 U3): Map is the automap the page draws behind it; Objectives, Log, Items and Bestiary are text pages built from pure models (journal.js, bestiary.js). Every text is escaped.
- `UI`: the arrival card is not left ghosted behind the dimmed Journal (seen in the PT-050 probe's still)
- `UI`: PT-054: the Log by LEVEL: this level first (what was said on this attempt, newest first, each with the time into the level, a place in words and the number of its pin on the Map page), then every earlier level the Record holds, the most recent first
- `UI`: PT-054: what you carry and how to use it, then what you picked up on this level and when
- `UI`: PT-077: this attempt from the stats database (stats/page.js builds and escapes it)
- `UI`: * PT-077, YOUR STATS: `html` is stats/page.js statsHtml (escaped there); `scope` 'pt' | 'life'; `hasPt` = there is a playthrough to show; `canImport` only on the title (no level in hand)
- `UI`: * PT-071 R25: the credits roll (credits.js): every line is given its height here, so the roll's height is the sum credits.js computes and no measuring is needed
- `UI`: * the Record (PT-037, record.js): a heading per map with entries, each message under its speaker; found documents are set apart; the map being played is scrolled into view
- `UI`: PT-063 (R13): only offered from the title, where no game is in hand
- `UI`: * the campaign epilogue (PT-036): the heading and an empty card; main.js feeds it `endingView` every frame, then `endingTally`
- `UI`: * a story scene (cinematics.js, PT-063): `v` = { who, text, k, fade } (the subtitle being typed, the black over the picture) or null to take the overlay down. main.js feeds it every frame while a scene plays.
- `UI`: PT-077: report.js story(), every line a fact from the stats database
- `UI`: PT-057: tier two of every mod you own
- `UI`: * PT-049 U1: a MAJOR pickup (a gun, a key) gets a card at lower centre, not a toast in the column: the icon, the name, one line of what it does (toasts.js pickupCard). -> true when it showed one
- `UI`: PT-071: a finished card leaves no animation behind (the HUD going away for a cinematic and coming back replayed the last card of the session)
- `UI`: * PT-047 V2: a toast joins the model (toasts.js): equal consecutive ones merge, three at most; the DOM below only draws it
- `UI`: * PT-071 R20: the sound captions (captions.js): up to three lines above the controls tip; redrawn only when the words change
- `UI`: * PT-071 R24: the five questions after a map (playlog.js SURVEY); each answer is saved at once by the shell, the note too
- `UI`: suppressed (PT-026): the crosshair opens red, as your guns do
- `UI`: PT-022: the tuning-fork's crosshair: wide when it can take something, solid when it holds something
- `UI`: PT-038 (E5): the oil gauge, shown only where the map has a lantern; amber while it burns, red when nearly dry
- `UI`: PT-045 (E9): the noise tell: QUIET or LOUD for the weapon in hand, and how far a shot carries (only a map that says noiseTell)
- `UI`: PT-056: the load readout: the one in use (its colour, its count), or the standard with the key that changes it
- `UI`: the wording is the boss's: bells ring, feeders feed // PT-043: the Hive Cantor's shield is its choir (unison): the count is the singers still standing

## src/game/wheel.js

- `(top level)`: The weapon wheel (PT-013, owner go 2026-10-07). Hold the last-weapon key (Q; Triangle / Y on a pad), push the mouse or the right stick toward a segment, let go to equip it. A tap is still "last weapon".
- `(top level)`: The owner's decision (D7): while the wheel is open time is FROZEN on Easy, 15% speed on Normal, 5% speed on Hard. That happens in the SHELL: the dt fed to the fixed-step loop is scaled (0 = no ticks), the simulation is

## src/render/airfx.js

- `(top level)`: What Episode 4's low-gravity machinery looks like (PT-032): the launch VENT plates (a bronze ring, a pulsing disc, chevrons that run towards the landing) and the falling LOADS (a container that drops out of the dark in the last LOADS.warn seconds, a hazard-orange

## src/render/beamfx.js

- `(top level)`: What the Mirror Array looks like (PT-033, Episode 4 Batch B; engine/beams.js): the EMITTERS (a bronze plinth, a barrel with a bright lens pointing where the beam goes), the MIRRORS (a plinth with a framed plate that turns a quarter step when
- `makeBeamView`: PT-080: the soft parts fade across the beam (glowfx.js), no flat translucent face
- `makeBeamView`: * PT-050 H-L3: free every geometry and material the view owns (the scene sweep in GameView.dispose gets them too; this makes the view whole by itself)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ THE GATE WARDEN'S SWEEP (PT-033, Batch E; engine/sweep.js)
- `makeSweepView`: PT-080: the soft parts fade across the beam (glowfx.js): the sweep was a wide translucent slab

## src/render/beltfx.js

- `(top level)`: What a clocked conveyor looks like (PT-045, drop B, E8a; src/engine/belts.js): a dark strip over the flowing cells and two rows of chevrons per cell that slide the way the floor is carrying you (reversing with it), slow to a stop with it and turn AMBER when it

## src/render/carfx.js

- `(top level)`: What a car looks like (PT-045, drop B, E8b; src/engine/cars.js): a steel deck with a tread plate, a rim of lamps, four corner posts and a dark undercarriage, carried along its loop by the clock. The rim is the TELL: steady dim amber while the car waits, blinking

## src/render/chimefx.js

- `(top level)`: What the chimes look like (PT-038, Campaign 2 Act B; engine/chimes.js): a CHIME is a stone plinth with a brass bell hung over it and a disc on its face that wears the note's GLYPH in the note's COLOUR (circle, triangle,
- `makeChimeView`: * PT-050 H-L1: the five glyph canvases are this view's own GPU textures (a material's dispose never frees its map): GameView.dispose calls this

## src/render/choir_cells.js

- `CHOIR_CELLS`: PT-026 (Episode 3): the eleventh creature
- `CHOIR_CELLS`: PT-028 (Episode 3, Batch C): the shield-bearer
- `CHOIR_CELLS`: PT-028: the brood-mother
- `CHOIR_CELLS`: PT-029 (Episode 3, Batch D): the Choir's attendant
- `CHOIR_CELLS`: PT-030 (Episode 3, Batch E): the Foundry's spawner
- `CHOIR_CELLS`: PT-030: a pipe the Grand Cantor sings through
- `CHOIR_CELLS`: PT-030: the Episode 3 boss
- `CHOIR_CELLS`: PT-033 (Episode 4, Batch E): the Gate Warden, the Campaign One boss
- `CHOIR_CELLS`: PT-033: a seal on the Warden's arch (a node)
- `CHOIR_CELLS`: PT-037 (Campaign 2, Act A): the Vael civilian, the first Vael who is not a weapon
- `CHOIR_CELLS`: PT-038 (Campaign 2, Act B): the Songkeeper under arms
- `CHOIR_CELLS`: PT-060 (R8): the Songkeeper with a reed-rifle, in a lichen-grey cloak
- `CHOIR_CELLS`: PT-060 (R8): a small Vael that mends, in milk-white wraps stitched with amber
- `CHOIR_CELLS`: PT-039 (Campaign 2, Act B): the conductor of one district, an afraid one, in the grey-green of a robe that has been washed too often
- `CHOIR_CELLS`: PT-043 (Campaign 2, Act C): three Tollbearers fused at the hip, bound in rust-brown hide, a ring of bells welded round the waist
- `CHOIR_CELLS`: PT-043 (Act C boss): the conductor of the Hive: throat-pale, a crest of nerves, no coat
- `CHOIR_CELLS`: PT-043 (Act D, the last boss): the Bell's clapper: bronze wrapped in black root, a heart that glows through a split
- `CHOIR_CELLS`: PT-043: one of the four root anchors that pin the clapper's chain

## src/render/choir_kit.js

- `(top level)`: * SMOOTHED MOTION (PT-078; the owner, 2026-10-31: "is there a way to smooth out the enemy actions? ... the bell monster in red that swings ... seems stiff"; `tools/dev/pose-pops.mjs` measured it: the end of every * Tollbearer swing turned its arm 141 degrees in ONE frame, a Gaunt's arms snapped 126 at the lunge, a Bellhand's jaw shut in a frame). INERTIALIZATION: a pose that would make a joint jump more than `rot` radians * (or `pos` metres) in one frame keeps the jump as an offset that fades to nothing over `blend` seconds (a smoothstep), so the joint ARRIVES instead of teleporting; motion slower than that is untouched (a blow's * slam is under it, so blows keep their speed). Render only: the sim, the hit volumes and the tells' clocks never see it. A pose that is not a small step forward in time (the same instant twice, a rig posed for a * still, a gap of more than `maxDt`, or `p.cut`) is a CUT: no blending. `rig.position` belongs to the grounder and is never touched.
- `makeCreature`: teal is the Hush's light; amber (PT-043) is the Hive's and the Root Bell's own
- `makeCreature`: PT-081: a bell that turns to LIGHT as it swings (the owner: "looks cool"); `echo(..., { solid: true })`
- `makeCreature`: PT-078: into a dash, across a side-step (the view measures it, render only)
- `(top level)`: * PT-078: the phases of a blow from the view's inputs (`p.attack` 0..1, `p.strike` the share of it at which the sim deals the damage, `p.dur` its seconds): raise (the tell) 0..1, slam 0..1 centred on the strike, * rec 0..1 the way back to the walk, w the weight of the whole blow (in over the first instants, out with the recovery), coil = raised but not yet fallen, follow a short swing past the blow. Every rig that lifts * something to strike uses these, so the drawn blow lands when the damage does and every part goes back to rest.
- `humanoidPose`: PT-080 (Art Gate 3, the walk's weight): the hips SINK when a foot lands (legs apart: |sin| at its peak) and rise as the legs pass (it was the other way round: a body that floated up at each footfall);
- `humanoidPose`: THE BLOW (PT-078). The raise is the tell; the slam LANDS on the tick the sim deals the damage (`p.strike` = the attack's windup as a share of its duration, `p.dur` its seconds; a held pose such as a charge or a
- `humanoidPose`: PT-078: the head follows you a little before the body turns (and lets go when you are behind it)

## src/render/creaturefx.js

- `(top level)`: What the view draws for the Marksman and the Mender (PT-060, R8) that the rigs cannot. Render only: it reads the sim's state (`e.snipeT`, `e.snipeAim`, `e.healTarget`) and the drained `snipe_shot` events, never writes either.
- `(top level)`: THE NODE MARKER (PT-061, V9): ONE cue for every node of every boss (a bell node, a feeder, a reed, a seal, a root anchor, a brood vat): a thin ring of white-cyan light round its body at the height of its vulnerable point, pulsing while a boss that it holds a shield for still stands,
- `(top level)`: BOSS STAGING (PT-061, V10): an awake boss is lit from BEHIND (a cool point light on the far side of it from the player, so its silhouette reads against the room) and stands in a faint ground ring the size of its reach (the line past which its blows cannot land).

## src/render/decalplace.js

- `(top level)`: Where the world remembers (PT-021 step 2, "nothing sticks: no blood, scorch, body, drag mark or growth crossing a wall"). PURE: a sim event (or a map's own list) in, a list of decal SPECS out; decals.js draws them. Nothing here
- `floorSpot`: (a current is water: PT-037)

## src/render/decals.js

- `(top level)`: The marks themselves (PT-021 step 2): ONE mesh of quads, drawn after the level, lit by the scene's lights (a stain in a dark room is dark), blended over the floor and the walls with no depth write (so the ink pass, which reads

## src/render/diagnostics.js

- `(top level)`: * per enemy, the sim's numbers next to what is actually DRAWN, in world space (PT-001/PT-002). `min`/`max` are the exact vertex bounds of the mesh on screen (the live rig, * or the merged mesh of a sleeper), `root` is the rig's world position. `ground` is the sim's own contract (groundAt over the actor's footprint, what e.y is kept equal to); * `floorCentre` is the centre-cell floor, kept only to show where the two differ.

## src/render/dressing.js

- `(top level)`: THE DRESSING (PT-079, design/ART_ASSESSMENT.md item 1: "rooms are boxes, and the boxes are empty": two or three wall planes from floor to ceiling, little at eye level). Things people put on the walls of the
- `DRESS`: PT-080 (Art Gate 1): green that spills over the top of a garden's box walls, so a planted wall is not a cube (the maps and the wall skins it grows on); and chains with a lamp under the roof of a tall hall
- `buildDressing`: PT-080: the green over a garden's walls (drawn on top of the wall, inside its footprint but for a hand's breadth: the walls already block every sight line, so nothing the sim sees changes)
- `buildDressing`: PT-080: chains with a lamp hanging from the roof of a tall hall of a human place (above head height, every few cells, never near a wall: thin, high things that never hide a creature)

## src/render/entityflag.js

- `(top level)`: (owner, PT-006: the corner ink traced every box edge of a rig and read as a wireframe). A depth buffer cannot tell an enemy from a wall, so entity materials write ALPHA 0 into the

## src/render/eyes.js

- `(top level)`: EYES AS STATE (PT-061, V8 of design/VISUAL_DIRECTION.md): every creature kit builds ONE `glow` material for its eyes (and whatever else it lights); the view sets its colour each frame from what the creature is doing, so a player reads the creature's mood

## src/render/floorscatter.js

- `(top level)`: THE FLOOR MARKS (PT-063, V6b of the visual plan: "floors are flat"). PURE: a parsed map in, a list of decal SPECS out (render only: the simulation never reads it, no save holds it); `DecalLayer` (decals.js) draws them from the baked `decals_floor_atlas`.

## src/render/glowfx.js

- `(top level)`: GLOWING EFFECTS (PT-079, design/ART_ASSESSMENT.md item 5: the shields, rings and pulses were single-colour see-through planes, which read as debug drawing next to the painted plates). Two materials, render only:
- `(top level)`: shellMaterial (PT-080): the shield's bell of sound. beamMaterial (PT-080): the soft part of a beam drawn as a box. `opacity` stays a plain number on all of them (the view sets it every frame).
- `(top level)`: * PT-080 (Art Gate 4): the shield's BELL OF SOUND (shield.js). Additive: clear where you look straight through it, glowing where you see it edge-on (a resonating volume, not a pane), thin bright rings of sound * running along it from the crown to the lip (`rings` of them, `speed` how fast and which way), and a hit (`uFlash`, with the view raising `opacity` to SHIELD.flare) lights the whole bell.
- `(top level)`: * PT-080 (Art Gate 4): the soft part of a beam drawn as a long box (the Mirror Array's beams, the Gate Warden's sweep): brightest along the beam's axis and fading to nothing at the box's sides, so no * flat translucent face and no edge shows. Additive. Works on any box: the across-the-beam coordinate is read from the face's own normal and UV.

## src/render/graftstage.js

- `(top level)`: PT-035: this was a regex in view.js whose backslashes were lost when it was written (`/^CdE(d)/`), so it matched no map and every map drew the grown graft; nothing asked the game which stage Episode 1 gets.

## src/render/ground-contract.js

- `(top level)`: The render-side GROUNDING CONTRACT for actors (PT-001 / PT-002: enemies drawn under the floor).

## src/render/growth.js

- `(top level)`: The Vael's growth with THICKNESS (PT-021 step 5): "alien growth should have thickness. A wet front. A place it started. Not a flat sheet." A map names where it started (`growth: [{ at, r, power }]`, cells and metres) and the

## src/render/gunkit.js

- `(top level)`: What the five guns share (PT-021 step 3), and nothing else: their own materials, and HANDS that look like hands. The outside critique: "the guns are still the same yellow glove on five thin sticks... Bigger in the frame.
- `(top level)`: gunKit(tex, gunTex) tex = the weapon atlas (the hands, wraps and sleeves: cells 4, 8, 9), gunTex = guns_atlas (every gun's own steel, wood, brass, rubber...; PT-021). The gun material says userData.atlas = 'guns' so the

## src/render/gunlight.js

- `(top level)`: THE HELD GUN IN THE PLACE'S LIGHT (PT-065, V3 measured): the first build scaled the weapon scene's light by the look's HEMISPHERE (view.js), and the sign-off probe (tools/dev/probe-gun.mjs, 29 maps' arrival frames) showed that is a poor guide to how bright a place LOOKS: C2M19's look has

## src/render/hitdir.js

- `(top level)`: LOOK POLISH 10 (the owner, 2026-10-26: "the screen flashes and shows the direction you are hit from, but not so much it overwhelms the screen"): a short red glow on the EDGE of the screen on the side a blow came from,

## src/render/hivefx.js

- `(top level)`: What the view draws for Acts C and D that the creatures' rigs cannot (PT-043, the Preview). Render only: it reads the sim's state (`w.enemies`, `w.spikes`, an enemy's `rb`) and the rigs' joints, and writes nothing back.

## src/render/hurtflash.js

- `(top level)`: PT-047 V1 (the owner, 2026-10-14: the hurt flash is too strong): the red vignette that follows a hit, as a PURE function of the hit's size.

## src/render/levelmesh.js

- `(top level)`: * PT-079: floors whose pattern is drawn this many times smaller than one tile a cell (the Customs Hall's checkerboard read as squares a metre wide)
- `(top level)`: * Additive glow quads in ONE mesh (PT-015): each quad is a centre, two unit axes, half sizes and an intensity that goes into the vertex colour (SECRET_TELL.color scaled), so one material draws all of them.
- `buildLevel`: the baked brightness of a floor / ceiling corner (PT-021)
- `buildLevel`: PT-027: a bed and a knee-high mist per spore region (the view swells them on the clock, breath.js) // the sea reaches past the fog: no black gap at the horizon from a high vantage
- `buildLevel`: one big water plane below covers all water cells; open sky (PT-032) has no floor at all
- `buildLevel`: PT-032: the deck's edge is a plate 80 cm thick, and below it is the sky
- `buildLevel`: PT-079 (design/ART_ASSESSMENT.md item 10): a floor whose pattern is too big for a room is drawn at FLOOR_REPEAT times (its clone is freed with the level)
- `buildLevel`: (a map with open sky has no sea under it: PT-032)
- `buildLevel`: PT-037: a current is wading water that flows: its own copy of the sea texture, scrolled along its direction by the view (view.js), tinted greener than still water
- `buildLevel`: a second, finer and paler skin of ripples that slides faster (view.js): two layers at two speeds read as water moving, one layer on a green floor read as a green floor (the real-game still of the aqueduct, PT-037)
- `buildLevel`: the tell (PT-015): lamplight leaking out of the seam into every open side: a bright seam the height of the panel, stepped halos round it, and a patch of light on the floor in front of it (SECRET_TELL). The seam and halos ride with
- `buildLevel`: PT-081: a CRACK, not a seam: a jagged line of light up the face (shoot it open)
- `buildLevel`: PT-039 (Lantern Ossuary: "impossible to find the switch"): in a dark map a lever shows a big lamp and throws a red glow on the wall round it, so it can be seen from down the corridor
- `buildLevel`: PT-038: drawn by GameView from the sim's own state (chimefx.js)
- `buildLevel`: PT-033: the Mirror Array's furniture is drawn by GameView from the sim's own state (beamfx.js)
- `buildLevel`: PT-043: the scenery of Acts C and D (models_c2.js)
- `buildLevel`: PT-027: the spore beds: the view sets both materials from the clock every frame
- `buildLevel`: PT-043: the Hive's beds bloom pink-amber, not spore-green
- `buildLevel`: the Vael's growth, thick where it started (PT-021)

## src/render/lightbudget.js

- `(top level)`: Which lamps are lit, and how strongly (PT-021). The renderer keeps a CONSTANT number of lights in the scene (a changing count means a shader recompile), so exactly the nearest `budget` lamps are switched on.

## src/render/models_c2.js

- `(top level)`: Set dressing of Campaign 2 (PT-037): what makes Anselm-Nine read as another world even with the gun down. Static, merged into the level mesh like every other prop (levelmesh.js); plain primitives in plain materials, as models_e3d.js.
- `(top level)`: * the hand lantern (PT-038, E5): a brass cage round a glowing core, a ring handle, seen small at the lower left of the weapon view; `glow` is the core's material so the view can dim it with the oil
- `(top level)`: * a Vael city built into the wall of a cavern (scenery, PT-039, Act B): five terraces of pale stone houses stepped up a cliff 26 m wide and 20 m tall, a window or two lit amber in every house, a bridge of gold lamps between the terraces, a dark mouth of a stair in the middle. Faces +z. The windows are a deterministic pattern (no random stream).
- `(top level)`: * a stand of stalactites hanging from a cavern roof (scenery, PT-039): nine cones of wet stone, 1 to 5 m long, hung from y = 0 downward in a cluster 8 m across; place it at the roof's height
- `(top level)`: * the mass at the heart of the Deep (scenery, PT-039): a cluster of swollen red-violet lumps hung from the roof by a stem of vein, 9 m tall, with a pale glowing core and a ring of smaller sacs: static (the look's light does the pulsing)
- `(top level)`: ---- PT-043 (the Preview): the scenery of Acts C and D. Plain primitives in plain materials, as the rest of this file; all of it far off and never collided with ----------------------------------------------------------------------------------------

## src/render/models_carbine.js

- `(top level)`: The Harbour carbine (weapon 7, PT-022): view model and world pickups. Its own file, like the other guns'. guns_atlas cells (gunkit.js): 0 walnut, 1 blued steel, 2 brass, 4 yellow enamel, 5 stamped steel, 6 black rubber, 8 pitted iron, 14 leather, 15 gunmetal.

## src/render/models_choir.js

- `(top level)`: PT-043: the creatures of Acts C and D
- `head`: PT-065 (V8, "faceless teal-eyed heads"): a FACE and not a skull with two lit holes. A dark brow ridge over each socket, slanting down toward the nose (`brow` = the tilt in radians: positive is a scowl, negative worried, 0 flat), a wedge of nose, and teeth: four short fangs hanging from the lip and three rising from the jaw (`teeth: false` for a mild creature).
- `tollbearer`: PT-080 (Art Gate 3): MASS inside the hit cylinder: the limbs and torso, not the outline, are fuller (tools/look/check-rigs.mjs keeps the 85% radius within the cylinder)
- `tollbearer`: the torso under the coat: skin (PT-080: a heavier trunk)
- `tollbearer`: (PT-080: heavier arms)
- `tollbearer`: PT-081: the swing turns the bell to light
- `tollbearer`: (PT-080: it lurches under the bell: a deeper bob than a walker's)
- `tollbearer`: PT-035: it slumps toward the weight of the bell and the other arm trails out: no other creature's outline leans or trails
- `gaunt`: (PT-080: haunches with mass)
- `gaunt`: (PT-080: heavier arms)
- `bellhand`: (PT-080: left slim on purpose: its outline must stay apart from the Tollbearer's and the Sexton's, tests/silhouettes.test.js)
- `bellhand`: PT-081: the toll turns the hand-bell to light
- `cantor`: (PT-078: and closes again with the recovery)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ SUB-CANTOR (PT-039: the conductor of one district, a lesser Cantor and an afraid one: a tall thin bell of grey-green robe, a cowl, a pale mask, a baton)
- `subcantor`: (PT-078: and closes again with the recovery)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ CHORISTER (PT-026, Episode 3: the voice; a grafted singer whose throat is a grown horn)
- `chorister`: the surplice (PT-035: a narrow column now, so the Sexton's cone is the only cone)
- `chorister`: a fan of seven (a halo of pipes behind the head and shoulders: the Chorister's outline from the front, PT-028)
- `chorister`: PT-035: both hands raised in the singer's goalpost: the Chorister is the one outline that is wide at the top and narrow below
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ BULWARK SHELL (PT-028, Episode 3 Batch C: the shield-bearer)
- `bulwark`: PT-028 repair: the first Bulwark was a tall dome like a Feeder or a Warden's chest (silhouette overlap 0.66 / 0.58). It is now LOW and WIDE: a crab-like carapace 2.4 m across and 1.8 m high on four stubs of legs, edged with a row of spikes.
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ WEEPING MOTHER (PT-028, Episode 3 Batch C: the brood-mother, an organ throne hung with cradle sacs)
- `weeping`: PT-028 repair: the first Mother was a smooth bell like the Cantor's robe (silhouette overlap 0.50). She is now THREE STEPPED DRUMS (a tiered throne) with sacs hung on arms that stand out from the middle tier, and a wide fan of pipes behind.
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ CANTOR ACOLYTE (PT-029, Episode 3 Batch D: the Choir's attendant, a stilted figure with a wheel of bells behind its head)
- `acolyte`: PT-078: the wheel's ANGLE is integrated (it was time x speed, so a change of speed threw the whole wheel round in one frame)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ BROOD VAT (PT-030, Episode 3 Batch E: the Foundry's spawner, a riveted cistern on stilts under a membrane dome)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ REED (PT-030, Episode 3 Batch E: a bagpipe grown from the floor of the Throat, the Grand Cantor's shield node)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ GRAND CANTOR (PT-030, Episode 3 Batch E: the Choir's voice, four legs and a horn the size of a doorway)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ GATE WARDEN (PT-033, Episode 4 Batch E: the Campaign One boss, an arch in the mouth of the Gate)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ SEAL (PT-033: a seal on the Warden's arch; a node: an ARMILLARY, three crossed rings of old brass round a diamond of light, on a bone post and a stone plinth)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ VAEL CIVILIAN (PT-037, Campaign 2 Act A: the first Vael who is not a weapon)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ ZEALOT (PT-038, Campaign 2 Act B: a Songkeeper under arms)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ MARKSMAN (PT-060, R8: a Songkeeper with a reed-rifle)
- `(top level)`: ------------------------------------------------------------------------------------------------------------------ MENDER (PT-060, R8: a small Vael that mends)

## src/render/models_e3d.js

- `(top level)`: Set dressing of Episode 3's second half (PT-029, PT-030): what makes the Loom, the Loft, the Foundry and the Throat read as different places even with the gun down. Static, merged into the level mesh like every other prop (levelmesh.js);

## src/render/models_e4.js

- `(top level)`: Set dressing of Episode 4's dock (PT-033, Batch C): the Vael LIGHTER, a squat shuttle on its landing struts, parked in the Cold Dock's bays. Static, merged into the level mesh like every other prop (levelmesh.js); plain primitives in plain materials, like models_e3d.js.

## src/render/models_fork.js

- `(top level)`: The Vael tuning-fork (weapon 9, PT-022): the gravity tool. view model and its world pickup. Everything the Vael make is an instrument, and a recovered tuning rig is the one that moves things: a brass resonator on a leather grip, a copper-wound

## src/render/models_g2.js

- `(top level)`: * * A Vael cradle (PT-021 step 2, "the cradle has to show a person in it"): a captive hung from the ceiling by two chains, upright and slumped, in a translucent resin cocoon, a sou'wester knocked back off the head, the arms * hanging, the boots dangling, tubes running from the ceiling into the back and the skull, a bronze graft seeded at the shoulder, teal veins down the chest, drips under the feet. The old one was a capsule and a ball. * Hangs from local y = 0 downward; the feet end near y = -2.8. Returns { group, light }.

## src/render/models_guns.js

- `(top level)`: The flare cannon (weapon 1) and the Tidewarden scattergun (weapon 2), rebuilt (PT-021 step 3): each in its OWN materials (guns_atlas, via gunkit.js), a body with a silhouette of its own, a fat grip and a fore-end a hand can
- `makeFlareCannon`: PT-079: the flare in its glass glows signal red (it was the atlas's teal glass, the Hush's colour, which the art bible keeps for the Vael)

## src/render/models_hive.js

- `(top level)`: The creatures of Acts C and D (PT-043, the Preview): the RESONANT (a fused-human hulk with a ring of bells), the HIVE CANTOR (the conductor of the Hive: throat-pale, hovering, a crest of nerves, ten fingers that trail the choir's threads), the ROOT BELL'S
- `resonant`: PT-078: the blow lands with the damage and every arm goes back to rest (the inner arms used to rise again and drop in one frame)
- `hivecantor`: PT-065 (V10, the climax creatures read as props: a pale cross "reads as a scarecrow"): the crest is a HALO. A ring of bone behind the head, twelve spokes of nerve from the skull to it and an amber bead on every spoke's end; the ring is the tell the eye finds at 30 m, and it swells with the beat.

## src/render/models_melee.js

- `(top level)`: The melee view models (PT-013): the fists (always in hand, slot 6) and the four found weapons (boat hook, marlinspike, lamplighter's mallet, fire axe).
- `(top level)`: * * a two-bone arm (PT-019) wearing ONE continuous sleeve (PT-020): the arm is solved every frame from a shoulder to the wrist (group space): an upper arm and a forearm that meet at an elbow, the elbow bending out and down (`pole`), * a hand out of reach dragging the SHOULDER toward it (the body leans into the blow) instead of stretching the arm. The sleeve is a single tube swept along the smooth curve through shoulder, elbow and wrist, with a radius that swells * at the elbow, tapers to the wrist and ripples with creases: no stacked cylinders, so no seams for the ink pass to draw and no faceted kink at the elbow. `last` = { S, E, W } of the latest solve (the tests project them).
- `(top level)`: * a hand closed round a haft (the haft runs through it along y; PT-019: the boxes of the first two versions read as 2x4s): four bare fingers, each a ring round the haft that is open on the player's side, the linen-wrapped back of the hand closing that side, and a thumb along the haft
- `makeFists`: PT-061 V7 (the audit: two flat cream planks with a brick-orange block): a rounded wrapped back of the hand, a row of FOUR knuckles with the fingers curled under, a thumb laid across them, and cord bands on the wrap
- `holdRig`: `rot`: a hand closed round a grip that does not run along the weapon's own y (the chainsaw's handles, PT-022)
- `makeMallet`: the bronze head: a barrel with chamfered faces. Its axis runs along local z, which lies IN the plane the swing turns in (the swing is a rotation about x), so a blow lands with an END FACE (PT-021: it was laid along x, the swing's own axis, and struck with the curved side like a rolling pin)
- `(top level)`: * * The shipwright's chainsaw (PT-022): authored with the guide bar along +y like every found weapon (so the key poses read the same), a housing of fire-service red enamel behind it, a rear grip that runs along z (which is UP once the saw is carried * level) and a top handle along x. The chain is two sets of teeth in turns: at rest both show, running the view flips between them every frame so the chain seems to travel (and a faint blur sweeps the bar). `st.saw` = { spin 0..1, heat 0..1, stall (s), eng } * from the sim's player; a running saw shakes in the hands, a hot one smokes (the view), a stalled one hangs dead.

## src/render/models_mortar.js

- `(top level)`: The Bell-breaker mortar (weapon 10, PT-027): view model, the bomb in flight, and the world pickup. A short, fat cast-iron tube with a flared BELL for a mouth (it was made to ring the Vael's bells loose), hooped in brass, a ladder sight on a

## src/render/models_rocket.js

- `(top level)`: The Rocket line-thrower (weapon 8, PT-022): view model, the rocket in flight, and world pickups. A lifesaving line-thrower turned on the dead: a yellow enamel tube on a leather rest, brass hoops, a flared muzzle, a venturi at the back, a reel of line on the left,

## src/render/models.js

- `(top level)`: ------------------------------------------------------------- Flare cannon and scattergun: models_guns.js (PT-021)
- `(top level)`: * a soft ball of light round a bulb (PT-021: the lamps were black hooks with a point of colour): two nested additive spheres, shared materials so they merge with the other props

## src/render/post.js

- `(top level)`: * PT-079 (design/ART_ASSESSMENT.md item 2): the held weapon's pixels are this many times finer than the world's (1 = the world's own chunky pixels; the look polish drew it at the screen's resolution)

## src/render/shading.js

- `(top level)`: Baked vertex shading for the level mesh (PT-021, "the light is flat", "same door, same beams, different wallpaper"). Pure maths, no Three: levelmesh.js calls it while it builds the quads, and tests/shading.test.js holds it.

## src/render/shadows.js

- `(top level)`: Contact shadows (PT-035): the outside audits, and my own note since the first look assessment, "actors cast nothing": in a dark room a creature stood on the floor with nothing under it. One soft dark disc under every live creature,

## src/render/shield.js

- `(top level)`: The shield of a boss whose nodes still live (the Cantor's ring, the Graft-Mother's feeders, the Root Bell's anchors, the Gate Warden's seals): PT-021 step 3. It was a teal wireframe icosphere (the outside critique: "the old
- `(top level)`: design/ART_GATE0_EVIDENCE.md row 6). PT-080: it is a BELL OF SOUND round the boss: one bell-shaped shell, clear where you look straight through it (the boss shows), glowing where you see it edge-on, with rings

## src/render/tells.js

- `tellOf`: PT-076 (brain.js): the groan before a Tollbearer's surge

## src/render/textures.js

- `loadAll`: the marks' atlas (PT-021): a cosmetic layer must never take the game down, so a build without the baked file draws no marks (and says so) rather than failing to start
- `loadAll`: PT-063 (V6b): the marks floors carry before anyone fights on them (floorscatter.js)
- `loadAll`: the guns' own materials (PT-021 step 3)
- `loadAll`: every painted sky (PT-021 added sky_bleach and sky_ash)
- `(top level)`: * the picture behind the campaign epilogue (PT-036): its own painting once baked, the Gate's sky until then (the game never depends on the bake)
- `(top level)`: PT-063 (R13): the last card of the cold open: the tower burning teal over the quay (falls back to the title picture)
- `(top level)`: PT-043: the Unrung Gate's door, the lamp and the figure (Campaign Two's epilogue)

## src/render/tidefx.js

- `(top level)`: What the tide looks like (PT-045, drop B, E12; src/engine/tide.js): one translucent sea over the whole footprint of the map, lifted to the water level of the sim clock each frame. Read-only: the level is a pure function of `w.time`. Every walkable cell whose floor
- `makeTideView`: PT-050 H-L2: the clone is this view's own texture; the level mesh's water texture (`base`) is shared and stays

## src/render/tonecurve.js

- `(top level)`: THE TONE SHOULDER (PT-061, V4 of design/VISUAL_DIRECTION.md): the curve the post pass puts on the LINEAR colour before the sRGB encode and the painted value steps. The audit found the tone clip narrow (exit frames and the finale: 14.6% of the pixels in the top band): a
- `(top level)`: PT-065 (V12): MEASURED with tools/dev/probe-tone.mjs on seven maps (the exit moment, rendered under five curves through the real post pass): k 0.6 / pre 0.72 left the lit exit chambers at 22.3% of the picture in the top band (the sign-off capture: 16.1% against a baseline of 14.6%, i.e. no change); k 1.0 / pre 0.55 takes it to 5.2% (the plan asked for 6% or less) with the arrival frames' mean luma 3% lower and the black share +0.7 points; k 1.5 and above empty the top band altogether and flatten the exits.

## src/render/trims.js

- `(top level)`: LOOK POLISH 2 and 3 (2026-10-26; the owner: "show me your style and your art and your taste"): ARCHITECTURE the grid never drew, built from the map and drawn only (the simulation, its collisions,
- `buildTrims`: PT-079: what people put on their walls (dressing.js)

## src/render/view.js

- `(top level)`: PT-061 V8: eyes as state
- `(top level)`: PT-060: the Marksman's line of light and the Mender's tether
- `(top level)`: PT-043: the Hive Cantor's threads, the Root Bell's chain and shadow, the spikes
- `(top level)`: PT-079: rings of sound with a leading edge and a trail
- `(top level)`: PT-045 (E8b): cars
- `(top level)`: PT-045 (E12): the tide
- `(top level)`: PT-045 (E8a): clocked conveyors
- `(top level)`: * what the comfort settings make of every camera motion and flash (1 = as built): head bob, the shake, the view's own kicks (recoil, a swing), the widening of the view (sprint, air, a parry, a hit), the weapon's sway, the hurt flash, the muzzle light. PT-083 C5: reduced motion stills all of them.
- `(top level)`: * which builder draws a pickup (PT-022 added the carbine, the rocket line-thrower, the tuning-fork and the chainsaw)
- `(top level)`: * PT-065 (V3, measured): the share of the old weapon-scene light the held gun keeps in the darkest place (the rest of the range follows the place's own hemisphere); a probe sets it live (`setup_weaponLight`)
- `GameView`: the place's light and grade (PT-021)
- `GameView`: PT-060
- `GameView`: PT-043: made with the view when the map has a conductor or a clapper (the clapper's light must not change the scene's light count in a fight)
- `GameView`: marks that stay (PT-021): what the map started with, then what the events leave
- `GameView`: PT-063 (V6b, "floors are flat"): what a floor is made of decides the marks it carries (floorscatter.js), under the blood
- `GameView`: PT-032: a map with open sky has a lower dome too: the world beneath the feet
- `GameView`: PT-045 (E8b): the cars that ride the loop
- `GameView`: PT-045 (E12): the sea that rises and falls on the clock
- `GameView`: PT-045 (E8a): the conveyors on a clock
- `GameView`: PT-038 (E6): the chimes and the tree
- `GameView`: PT-033: the Gate Warden's beam // PT-033: the Mirror Array's emitters, mirrors, receivers and the light between them
- `GameView`: PT-061 V3: the held gun wears the PLACE's light (setPlace scales these two, with a floor so it is never lost)
- `GameView`: PT-038 (E5): the hand lantern: one warm light that rides with the eye (it is in the scene for the whole level, at strength 0 when out: a constant light count means no shader recompile) and a brass lantern held low at the left of the weapon view
- `GameView`: PT-063 (R13): a story scene's camera pose { x, y, z, yaw, pitch, fov } while one plays (setCinematic); render only
- `GameView`: PT-020: the swing's own clock (a freeze on contact: view only), the view model trailing a turning view
- `GameView`: PT-029: the floor ring of an awake Acolyte's ward // PT-028: a Weeping Mother's tears in the air and the pools they leave
- `GameView`: PT-056: embers off a creature alight, frost off a chilled one // the Vael's light going out of a body; the spark of a blow
- `GameView`: PT-022: the rocket's light and smoke, the gravity tool's beam / shock rings / movable props, and what a boom's size does
- `GameView`: PT-035: a soft contact shadow under every live creature (shadows.js: one instanced mesh)
- `GameView`: PT-071 R20, PT-083 C5: every camera motion and flash the settings can calm (render only: the sim is untouched)
- `GameView`: * PT-043 (the Preview): a dev map may list `lookZones: [{ rect: [x0, z0, x1, z1], look, sky?, fog?, fogDensity? }]` (cells): the room the player stands in is lit and graded by that look and wears its sky and fog; elsewhere the map's own
- `GameView`: look polish 10: a blow with a source points at it (hitdir.js) and flushes the edges less // PT-047 V1: the screen flash follows the size of the hit (hurtflash.js); p.hurt stays sim state
- `GameView`: each gun lights the room its own colour (a load its own: PT-056)
- `GameView`: PT-060: the line that was fired stays bright for a tenth of a second
- `GameView`: a round went by close (PT-026): a little jolt
- `GameView`: * PT-027: while the mortar is in hand a ring on the ground says where the shell will land (the sim's own `designate`, so it cannot disagree): a broad ring the size of the blast and a small mark in the middle; amber, dimmer when the minimum range pushed it out
- `GameView`: * PT-063 (R13): a story scene's camera pose { x, y, z, yaw, pitch, fov? } (cinematics.js `cameraAt`), or null to give the eye back to the player. The held weapon is not drawn while it is set. Render only.
- `GameView`: PT-038: the lantern's light follows the eye, fades in and out in a fifth of a second, flickers, and sinks as the oil runs low
- `GameView`: PT-032: the view opens a little in the air
- `GameView`: PT-043: a dev map's rooms are lit by their own look
- `GameView`: markEntity: enemies keep the classic ink (entityflag.js, PT-006)
- `GameView`: PT-054 (the owner: Glass Steppe stutters): a sleeper that is already frozen into its merged mesh needs nothing: no pose, no grounding (which walks every vertex of the rig), and its invisible rig is out of the scene graph (three.js recomputed the matrices of all fifty nodes of every sleeper on every frame)
- `GameView`: (PT-076: so does a body that has finished falling)
- `GameView`: PT-078: the SHORT way round (the sim keeps some creatures' facing in -pi..pi: a plain lerp across the seam spun them a full turn in one frame)
- `GameView`: PT-078, how the body moves on the screen this frame (render only): turning on the spot steps the feet instead of sliding them round, a dash faster than its walk leans into it, a side-step tilts across it
- `GameView`: (PT-076: a Bellhand calling for help lifts its bell as for a shot, brain.js)
- `GameView`: PT-028: the Weeping Mother's swelling sacs and the tear she draws up
- `GameView`: PT-033: the Gate Warden's eye follows its beam
- `GameView`: ENEMY ACTIONS: the windup's glint (tells.js) // PT-061 V8: asleep dim, awake teal, hunting amber-white, striking white
- `GameView`: PT-076 (the owner: "should we have old bodies disappear to help with performance?"): a body that has finished falling is as still as a sleeper, so it is frozen the same way (it stays; a Sexton that raises it thaws it)
- `GameView`: PT-050 H-L4: a creature the sim dropped (born corpses beyond the cap) frees its rig's geometry and materials; textures are the shared atlas and stay
- `GameView`: PT-043: the Hive Cantor's threads, the clapper's chain and shadow, the spikes
- `GameView`: PT-022: the rocket points along its flight, its flame breathes, it leaves smoke and lights the place it passes
- `GameView`: PT-027: the bomb tumbles along its arc and leaves a thin trail of smoke; its fuse spark flickers
- `GameView`: PT-028: the tears in flight (a warm bead with a trailing drop) and the pools they leave (the spore bed's own painted overlay, amber, fading as they dry)
- `GameView`: PT-029: the ward: a thin ring and a faint disc on the floor round every awake, unstaggered Acolyte, as wide as the ward reaches
- `GameView`: PT-022: the movable props (drawn one by one: they move) and the tractor beam from the fork to what it holds or drags
- `GameView`: (b.id is a string: a number is needed here, an opacity of NaN draws BLACK: PT-013, seen in the first real-game stills) v.fm.opacity = 0.9 * fade;
- `GameView`: PT-056: a creature alight throws embers, a chilled one breathes frost (render only: it reads e.ignT / e.chillT)
- `GameView`: PT-033: the mirrors turn, the beams follow them
- `GameView`: PT-032: the plates breathe, the loads fall on the clock
- `GameView`: PT-027: the beds swell before they bloom and the mist lingers
- `GameView`: PT-037: a current's surface slides the way it pushes (8 m a texture tile)
- `GameView`: PT-033: the frost at the edges of the picture while in vacuum
- `GameView`: PT-061 V3 (the audit: the gun was the same brightness, luma 109 to 116, in every map): the weapon scene's light follows the place's, from 0.35 of the old value in the darkest to the old value at the harbour's level and a little over in the brightest
- `GameView`: PT-061 V4: the tone shoulder (a look may name its own)
- `GameView`: a sleeping creature's own rig is out of the scene (PT-054), its frozen copy is not: free both
- `GameView`: PT-050 H-L1..L3: the textures a view owns (the scene sweep above frees only geometry and materials); the level's own flow clones too (round 1, Gemini 1)

## src/render/weapon-pose.js

- `(top level)`: THE SIGHT PICTURE (PT-011, the owner: "Is this what I should see when I aim down sights? No, like COD."): every rig names its sights in group space, `rig.sights = { rear: [x, y, z], front: [x, y, z] }`
- `(top level)`: look polish 1 (2026-10-26): smaller and lower right, so the gun frames the fight instead of covering it (PT-021 had made it 0.74 for "bigger in the frame"; now it is drawn crisp, it needs less size to read); the aimed gun's own scale is unchanged
- `weaponPose`: the pose before PT-011 (kept so the old stills can be reproduced)
- `(top level)`: ---------------------------------------------------------------- melee (PT-013): where a swing is, how a gun is bashed, where the fists / a found weapon sit
- `(top level)`: * the blow's own travel: the LAST part of the wind-up, so that it ends at the very instant the sim resolves the hit (t = windup; PT-017: the first version drew the blow AFTER the damage, up to a quarter of a second late)
- `(top level)`: * * How a blow FEELS (PT-020; VIEW ONLY: the simulation never reads this, so no balance, hash or evidence depends on it). * stop the freeze on contact, seconds: the weapon sticks in the body for a moment (a hit-stop of the view model only; the heavier the weapon the longer) * pitch the camera's kick, radians, [as the weapon is raised, on the blow]: + looks up. roll: the same for the camera's roll, + leans to the right * over how far past the hit pose the weapon sinks and settles, as a share of the stroke * Kept small: the camera kick is visual and the hit arc is wide, but a blow must never feel like it moved your aim.
- `(top level)`: * * The swing's own clock for the VIEW (PT-020): sim seconds since the swing began, minus the time the view model was held at the contact (the hit-stop). Pure and testable; the simulation never sees it, and because it counts SIM * time (the pause and the wheel's slowed time hold it too) a freeze lasts as long as the game says, not as long as the frame rate does. * start(kind, t0) a swing began at sim time t0 (the 'swing' event's tick) hit(kind, killed) the 'melee_hit' event: snap to the hit pose and hold it FEEL[kind].stop seconds (once per swing) * sample(now) the phase { a, b, c, h, on } at sim time `now` (null once the swing, and its freeze, are over)
- `meleePose`: lagX / lagY: the view model trails a turning view (PT-020)

## src/render/weapon-sights.js

- `(top level)`: Iron sights for the first-person guns (PT-011): a REAL sight picture, not two 3 px bumps. A rear U-notch (two posts joined by a base block) and a front blade with a bright tip, sized to read at the
- `(top level)`: * * A tang: the top of the receiver carried BACK and DOWN toward the shoulder, so that with the gun raised to the eye you look along a ramp that widens to the bottom of the screen, not at a flat * vertical rear face (the owner's PT-011 stills: a 160-230 px slab). (z, y) = the rear top edge of the plate it continues; width = its width; len = its length along the slope; drop = angle in radians.
