# The new archetypes (PT-060, R8 of the Director's Plan, 2026-10-19)

Two creatures the roster lacked: something that makes you MOVE from far away, and something that makes you choose a target. Every number is a first guess; nothing here has been played.

## 1. The Marksman (`ENEMIES.marksman`, `src/engine/marksman.js`)
A Songkeeper with a reed-rifle: lichen-grey poncho, a flat reed hat, a monocle, a long bone-white barrel bound in brass. 2.5 m tall and lanky (the tallest soldier, the only one in a poncho and a hat), 34 hit points, hush (the lantern does not hide you from it).
- **The shot.** From 10 to 40 m, with a line of sight, it starts a shot: a thin amber line of light follows you for 0.9 s (`track`), then FREEZES for 0.45 s (`lock`, the line turns thick and white-hot), then the shot goes down the frozen line. It hits only if you are still within 0.55 m of the line and nothing solid is between: a player who moves when the line freezes is not hit, and cover stops it. 18 damage, a cooldown of 3.4 s.
- **The rule it obeys:** every ranged attack in the game can be dodged by moving and hits a stationary target, with a tell of at least 0.4 s. The tell here is 1.35 s long.
- **Behaviour.** It keeps 14 m from you and backs away when you close in; cornered it fights with its hands. At its range it stands and waits for the shot.
- **Counters:** the carbine and the harpoon, closing in, or stone between you.
- **Drawn:** the lens at the muzzle swells with the tell; the rifle is a yoke across the shoulders asleep, carried forward awake, laid to the cheek when it aims. `src/render/creaturefx.js` draws the line (thin and amber while it follows, thick and white when it freezes) and the streak of the shot.
- **For the bot:** a Marksman within its range counts as a shooter (`Bot.shootersNear`), so the strafing policy strafes.

## 2. The Mender (`ENEMIES.mender`, `src/engine/mender.js`)
A small pale hooded Vael, 1.4 m, wrapped in milk-white bandage stitched with amber, carrying a hooked staff with an amber glass lantern. 22 hit points.
- **The mend.** The most hurt awake creature within 8 m (below 90% of its hit points) is mended at 7 hit points a second, one at a time, with a visible tether, until it is whole. It never mends a node, a boss, a spawner, a peaceful creature, a corpse or another Mender. (It undoes what you did; it does not make anything take less, as the Acolyte's ward does.)
- **Behaviour.** It keeps 9 m from you and stands among the others; with nothing to mend it stays near the nearest creature; cornered it fights with its hands.
- **Counters:** any ranged weapon; the arc lamp in a cluster. It is a priority target with a small footprint.
- **Drawn:** the lantern swells and the free hand reaches toward the creature it mends; `creaturefx.js` draws the amber thread and a glow on the one being mended.

## 3. What was built (all of it exists)
Definitions (`defs.js`), the sim (`marksman.js`, `mender.js`, the hooks in `world.js`: lazy fields `snipeT / snipeAim / snipeCd` and `healTarget` exist only on these two kinds), the rigs (`models_choir.js`: `marksman`, `mender`), the atlas cells and recipes (`choir_cells.js`, `tools/baker/recipes_choir.js`), the sounds (`marksman_alert`, `snipe_tell`, `snipe_shot`, `marksman_die`, `mender_alert`, `mender_hum`, `mender_die`; not yet measured by `audio-qa`), the bestiary lines, a Range target of each kind in the songkeeper yard and in the HIVE lineup, the silhouette guard (both are under 0.5 against every other creature), and `tests/roster-r8.test.js`.

## 4. NOT done / NOT verified
Nothing has been placed on a shipped map: a map that holds one of them is a rosters-and-gates job (`tools/dev/tune-roster.mjs`), and the strafing policy is the only one of the bot's two that dodges a frozen line reliably. Whether the tell reads in the painted look is unseen (the baked atlases are made and the stills of the two rigs are the next look job), whether 1.35 s is a fair tell or a long one, whether a Mender is annoying or fun, and where each belongs in the campaign: all of that waits for play.
