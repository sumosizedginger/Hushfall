# Act B: THE SOUNDING DEEP (Campaign 2, maps C2M09 to C2M16 and the secret C2S01)

Builder's brief (PT-037, 2026-10-12; the owner approved the plan: "let me know when you are ready to start on the next maps / the new engine pieces are ready to check"). It follows `design/CAMPAIGN2.md` (the table and the engine steps E4 to E7) and `design/LORE.md` (what the text may say). Act A's play report from the owner: fun, liked the SHAPE of the levels, "more and more enemies as well, which helps". So Act B keeps the density rising and puts its new thing in the SHAPE of the places (caves that are not boxes) and in a REAL puzzle (the chimes: the owner said of Episode 3 "none of it really feels like a puzzle yet").

## What the player learns (LORE section 3)
The Vael live underground, in cities grown round caves that still carry sound. They are divided: the Songkeepers want the Grafting to go on, the Silent have stopped singing and are few. Ines carries a light into dark places (the hand lantern; her own lamp, which never burns out, is Act C's secret). The act ends on the Sub-Cantor, a lesser conductor, in the heart of the Deep.

## The batches (each ends with the owner's play; one regeneration at the end of the act)
| batch | maps | engine first | proves |
|---|---|---|---|
| B0 | none | the cave kit (a node tool), the Zealot, the hand lantern, the chimes, the Deep's looks, Range yards for each | the shape of the Deep and its three new tools, before a map depends on them (**this is what the owner is waiting to check**) |
| B1 | M09 Sounding Deep Gate, M10 Echo Markets | `atmosphere.echo` (noise carries further) | a city seen from above; aim discipline among a crowd |
| B2 | M11 Undercantor Halls, M12 The Drowned Choir, C2S01 The Silent Orchard | `choices` (a remembered act, lazy in progress), the Drowned (a tinted Tollbearer, no new rig) | a choice by architecture; the arc lamp's best room; a hidden garden |
| B3 | M13 Lantern Ossuary, M14 Harmonic Gardens | | the dark; the first real sound puzzle |
| B4 | M15 Ash Basilica, M16 Sounding Deep Heart | pulse reflection (E7), the Sub-Cantor (new creature, a boss) | a gauntlet; Act B's boss |

## B0, the engine tranche (design; every piece lazy so Campaign 1 and Act A stay byte for byte what they were: `route-fingerprint.mjs check` is the proof)

### E4 THE CAVE KIT (`tools/mapkit/cave.mjs`, node only, no render or sim change)
Operations that carve rooms out of solid by a seeded noise, with the same safety as the shaping kit: never touch an existing room, a door or the map edge, deterministic for a seed, and nothing narrower than two cells on a route.
- `blob(L, cx, cz, rx, rz, { seed, rough, floor, lid })`: an ellipse whose radius is perturbed by smooth noise (a cave chamber), with a domed lid (the ceiling is highest in the middle: an absolute lid per cell, 35 units at most).
- `finger(L, [x0, z0], [x1, z1], { seed, width, wobble, floor })`: a winding passage that wanders about the straight line (a random walk that is pulled back to its target), at least two cells wide.
- `tiers(L, cx, cz, { rings, rise, seed })`: concentric stepped terraces for a bowl or an amphitheatre, with a ramp cut through each ring.
- `smooth(L, rect)`: a cellular pass that removes one-cell nubs and fills one-cell pits (so a cave has no wall-hair).
- The measure: `node tools/dev/map-shape.mjs` (room fill, boxiness): a cave map must be well under the 0.81 median room-fill of the shipped maps.

### THE ZEALOT (`ENEMIES.zealot`, a new creature: the owner approves its look in the Range before any map uses it)
A Songkeeper under arms: a tall hooded Vael in bronze plate with broad shoulders and a long bone lance with a small bell at the tip; no frill (the peaceful Vael have one), no coat (the Tollbearers have one). It keeps a lance's distance and thrusts (reach 3.4 m, a 0.7 s tell: the lance dips), and a hit GRAFTS: 12 damage and `p.graft` for 3 s (walking speed 0.65, a bronze tint at the edge of the screen, a sting); it does not drain more than the hit. It is a person who chose this: it speaks one line when it first sees you (a message), nothing else. Hit points 110, speed like the Bellhand, `poise` high (a light hit does not stagger it). Rig `zealot` in `models_choir.js`, atlas `choir_zealot` (a recipe and a bake), sounds (alert, lance, graft, hurt, die), Range target, the silhouette guard (under 0.5 with every other kind), `check-rigs.mjs` and `measure-rig.mjs` for the hit volume.

### E5 THE HAND LANTERN (the hardest piece: sim, view, HUD, save)
- A map says `atmosphere.dark: true` and gives its `lantern: { oil, max }` (or `lantern: 'eternal'`: Ines's own lamp, Act C). `p.lamp = { on, oil }` is LAZY state: a world whose map has no lantern never has it.
- A new action `lamp` toggles it (a key and a pad button; it is a held tool, not a weapon slot).
- Effect on the sim: in a dark map a creature notices the player from 6 m, from 24 m when the lamp is on or the player stands in a lit lantern prop's radius; the Hush-driven (Tollbearer, Bellhand, Sexton) ignore light and use their ordinary range. Oil burns 1 per second while on; pickups `oil` give 30; at 0 the lamp goes out with a cough.
- View: a warm point light at the camera (one slot of the 8-lamp budget), a flicker, a lit cone on the floor; the look `ossuary` is nearly black without it. HUD: a small oil bar beside the flares. Save: a lazy field with a migration (an old save has none).
- Bot: `{ op: 'lamp', on: true|false }`; in a dark map the bot starts with the lamp on.

### E6 CHIMES (a puzzle that is not an audio test)
- A prop `chime` with a note (0 to 4) and a glyph + colour per note (circle, triangle, square, diamond, ring; amber, teal, violet, red, white). Use or a shot strikes it: event `chime_note`, a sound whose pitch follows the note, the plinth lights its glyph.
- A map's `chimes: [{ id, phrase: [..], window }]` and the trigger condition `seq:<id>`: true when the last phrase.length notes struck, in order, each within `window` s of the last. State `w.chimes` is lazy.
- The shape of the puzzle (M14): the Great Chime-Tree plays a phrase on its fruit (lit in order, with the same glyphs and pitches) when used; the player echoes it on the five bed chimes; three rounds (3, 4, 5 notes) open three garden walls. A wrong note resets the round and the tree plays it again. Harvesters (hostile Vael) tend the beds, so it is a puzzle under pressure.
- A solver in a test, like the Mirror Array's: the phrase is replayed through the sim by the bot op `{ op: 'chime', notes: [..] }` and the gates open; a wrong order does not.

### The Deep's looks and art
Five looks (`LOOKS` rows) and a sky-less cave ceiling: `deepgate` (blue-black stone, amber city lights), `markets` (warm lamplight on pale stone, wet), `halls` (cold marble and bronze, two wings lit differently), `drowned` (green-black water, pale shafts), `ossuary` (almost black, bone white where the lantern reaches), `gardens` (phosphor green and violet), `basilica` (ash grey, fire at the altar), `heart` (red-violet, a pulse). A recipe kit `tools/baker/recipes_c2b.js`: cave rock walls (wet, banded), flowstone floor, city stone, bone, phosphor moss, bronze; about eight baked materials. Each map has its own skins and its own light (the look rule).

## The maps (the plan's table, as briefs; counts and pars are set when the map is built)
- **C2M09 Sounding Deep Gate**, an amphitheatre bowl descended in seven tiers (cave kit `tiers`), a city on the far wall as scenery, peaceful Vael on balconies (Vael folk props at height), the first Zealots (one seen across the bowl, then met at the bottom). A lever at the bottom opens the gate. Section: a bowl 42 m across, 14 m of fall; open to a cave roof. Roster: Tollbearers, Gaunts, Choristers, Zealots (introduced), the Bulwark at a stair.
- **C2M10 Echo Markets**, a ring bazaar round an echo-well (the well sinks 3 m), radial alleys, mezzanines; dozens of peaceful Vael (a crowd at scale), `atmosphere.echo: 2` (every noise carries twice as far), Zealots among the crowd. The verb is aim discipline: the quiet weapons (the arc lamp, melee, the fork's gravity) are the answer, a gunshot panics the crowd and calls the market. A civilian killed is an innocent (a rank cost, never a death).
- **C2M11 Undercantor Halls**, a butterfly: two palace wings split by a colonnade and a grand stair. The Songkeepers' wing is a fight; the Silent's wing is a conversation and a stealth route (messages and a quiet way past sleepers); either reaches the exit. `choices` (a flag stored in progress at the exit) is remembered by C2M12 (a line changes) and, later, C2M22.
- **C2M12 The Drowned Choir**, a flooded cathedral: rows of submerged stalls round a nave, raised walks, a hull for a roof; the Drowned (Tollbearers tinted green-grey and rising from water cells on a trigger) in their hundreds; the arc lamp's best room (a bolt through water kills a pew's worth). A secret exit to C2S01.
- **C2S01 The Silent Orchard**, a garden of ten beds under a sky, `atmosphere.silence`, no enemies, a cache and the Tender's testimony (the longest piece of text in the act: five short sentences at a time, plain).
- **C2M13 Lantern Ossuary**, a spider-web of rings and radials of niches (never a maze of boxes), three ring heights and a well in the middle; the dark and the hand lantern; remains of earlier expeditions (Marrow logs: dated, terse, ending mid-thought). Oil is the resource: it is on the lane but not in surplus.
- **C2M14 Harmonic Gardens**, a spiral garden of raised beds on the golden angle with the Great Chime-Tree on a mound in the middle; the chime puzzle (three rounds, three walls); harvesters tend the beds.
- **C2M15 Ash Basilica**, a long nave with aisles raised 2 m and a crypt; five stations of the Grafting along it, each guarded by an elite (Bulwark, Weeping Mother, Acolyte, Zealots in numbers); the altar at the end.
- **C2M16 Sounding Deep Heart**, the boss: the Sub-Cantor on a dais in a bowl of two lobes round a pulsing mass, four giant forks as its nodes; its pulse ring REFLECTS off the wall (E7: a contracting ring comes back to the centre), so cover and the dais's pillars are the answer. Drop-fed ammunition keeps its boxes (a boss map).

## Rules carried over (no decision needed)
One new thing per map (`introduces`), three beats, a secret on a main map; roster variety (no kind above 40%, a new kind or a reskin in every batch); every shipped map has its own look; `traps.js` after any change of height; a message at the moment a hidden state matters; the text rules of LORE.md checked by `tests/campaign2-b.test.js`; real-game stills of every map before it is called done; Chrome jobs one at a time at idle priority on two cores and never taking the owner's mouse.
