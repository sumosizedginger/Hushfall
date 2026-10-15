# GROKS — attack ideas

Auditor: **GROKS** (parallel with Gemini; this file is the only idea list GROKS writes).
Rule: nothing outside `attack/groks/` is edited. Known and not re-filed: hurt flash, hollow crosshair, chainsaw one-shots, fork slide along a wall (`gravity.js` `updateShoves`), unreadable messages and pickups.

Status words: `not tried` | `tried` | `result`.

## Ring 1 — ordinary hostile user

1. Hold every movement key at once (forward+back, left+right cancel or stack). — not tried
2. Sprint + ADS + fire + melee + use in one tick. — not tried
3. Tap fire for less than one tick (tap latch) then release. — not tried
4. Hold fire across a weapon switch. — not tried
5. Switch weapons every tick for 1000 ticks. — not tried
6. Press all ten weapon keys in one tick (which one wins). — not tried
7. Wheel up and wheel down in the same tick. — not tried
8. ADS while the chainsaw is in hand (aim is guard or not). — not tried
9. Sprint with the tuning fork and hold aim (beam vs sprint). — not tried
10. Use on a door, a switch, a mirror, a chime and a locked door, same spot. — not tried
11. Pause on the same tick as death. — not tried
12. Pause, then fire, and confirm the sim does not step. — not tried
13. Open the automap and keep walking (Tab does not pause). — not tried
14. Exit the level on the same tick as lethal damage (death wins). — not tried
15. Stand in a closing door until it should crush or shove. — not tried
16. Stand in a breathing gate as it shuts. — not tried
17. Press Use on a breathing gate (should refuse). — not tried
18. Press Use on both airlock doors before either finishes moving. — not tried
19. Stand in the airlock doorway so the queued door can never shut. — not tried
20. Walk away past `LOCK.giveUp` after queueing a lock, then come back. — not tried
21. Make a noise beside a sound-lock, then Use, then wait in silence. — not tried
22. Play a chime phrase wrong 50 times, then the right phrase. — not tried
23. Turn a mirror while a beam is on it, and while a creature stands in the cell. — not tried
24. Toggle the lantern every tick until oil is exactly 0, then once more. — not tried
25. Fire the mortar at the player's own feet. — not tried
26. Fire the line-thrower into a wall at point blank. — not tried
27. Fire the line-thrower through a thin wall (tunnelling). — not tried
28. Empty every gun, confirm the dry-feed flare drip, then fill one gun. — not tried
29. Pick up ammo at exactly the cap, then one more. — not tried
30. Die and Retry: inventory must be the level start, not the mid-level one. — not tried
31. Finish a map, buy an upgrade, Continue, and confirm the cap applies. — not tried
32. Finish the same map twice and confirm salvage is not paid twice. — not tried
33. Skip the epilogue with the skip key held down. — not tried
34. Open the Record from the title, from pause, and from the intermission. — not tried
35. New Game 20 times and confirm each one starts at C1E1M01 with empty progress. — not tried
36. Stand still for 10 seconds on every Act C and D spawn (hazard, trigger, sniper). — not tried
37. Walk into every locked exit before the gate is open. — not tried
38. Kill a required group from outside the arena, if a sightline exists. — not tried
39. Let a Sexton raise a body and kill the body again (drops must not farm). — not tried
40. Kill a vat's brood and the vat (brood must not drop ammo). — not tried

## Ring 2 — weird environment and the tinkerer

41. Save difficulty `nightmare` / `null` / `EASY` / `''`. — not tried
42. Save version 0, 1.5, 11, -1, and every integer 1..9 migrated. — not tried
43. Truncated JSON, a single byte flipped, wrong magic, extra top-level keys. — not tried
44. Mid-level world missing `enemies`, `player`, `doors` (must reject, already partly tested). — not tried
45. Mid-level `player.weapon` set to `nope`, `null`, `''`, or deleted. — not tried
46. `player.weapons` as a string, an object, or containing unknown ids. — not tried
47. `player.ammo.flare` NaN, -5, 1e9, or the key missing. — not tried
48. `player.hp` / `armor` of -10, 0, 1e9. — not tried
49. `player.keys` as a string. — not tried
50. Enemy `y` or `yaw` NaN while `x`,`z`,`hp` stay finite (shape check looks at those three only). — not tried
51. Enemy `state` of `banana`, or `hp` 0 with state still `chase`. — not tried
52. Enemy at x = 1e9 (finite, far outside the map). — not tried
53. Inject `world.map` and `world.events = null` (both non-enumerable on a real world, so the shape check never sees them). — not tried
54. `tick` of -5 and of `Number.MAX_VALUE` (finite, but `tick * (1/60)` may overflow). — not tried
55. `carry.weapons` as a non-iterable object so `createWorld` throws. — not tried
56. Progress `salvage` of -10, 1e308, NaN, Infinity. — not tried
57. Progress record `paid: 0` on a map already ranked S (replay farm). — not tried
58. Progress `choices` with uppercase, spaces, or `__proto__`. — not tried
59. Settings version 0 and version 2. — not tried
60. Settings FOV 1 and 179, brightness 0 and 1e6, sensitivity 0, -1, NaN, 1e9. — not tried
61. `internalWidth` 0, 639, 641, `480` as a string. — not tried
62. Bind two actions to one key in the settings blob (pad path dedupes; keyboard path may not). — not tried
63. Bind Escape, Tab, F5, F11, and an empty list for every action except pause. — not tried
64. Bindings value `__proto__`, a number, null, and a 100000-long code list. — not tried
65. Prototype pollution through `JSON.parse('{"__proto__":...}')` on saves and settings. — tried (probe-math): Node 24 keeps `__proto__` as an own key; `({}).pwn` stayed undefined.
66. Gamepad axes NaN, Infinity, 1e9, and a missing axes array. — not tried
67. Two pads, a disconnect mid-sprint, a trigger stuck at 0.5. — not tried
68. `FixedLoop.advance` with dt 5, -1, NaN, Infinity (frame clamp is 0.1 in `main.js`). — not tried
69. `performance.now` going backwards (negative dt into audio and the loop). — not tried
70. 10,000 mouse deltas in one frame at sensitivity 4. — not tried
71. `addMouse` with sensitivity NaN (settings clamp should stop this on the real path). — not tried
72. localStorage `setItem` throwing, `getItem` throwing, quota full. — not tried
73. Two `SaveStore`s on one storage object, interleaved quick and auto. — not tried
74. Query `?outline=classic` plus `?outline=classic&outline=no`, hash, and a subfolder base. — not tried
75. Production build grep for `__GAME_TEST__`, `maps-dev`, `setup_teleport`, `dev-salvage`. — not tried
76. Resize 200x100 and 5120x1440, dpr 0 and 8 (shell only; needs a browser). — not tried
77. WebGL context lost, AudioContext suspended, AudioContext constructor throwing. — not tried
78. A map id in the save that is not in `MAPS` (`unknown-map`, must not throw). — not tried
79. Map version bumped so a mid-level save degrades to level start, then confirm the carry is the LEVEL start. — not tried
80. Save during a vent flight, a door cycle, a car ride, a boss phase, and round-trip the next 60 ticks. — not tried

## Ring 3 — absurd, and the assumptions to falsify

81. Assumption: `loadWorld` never throws. Falsify with a bad difficulty and a bad carry. — not tried
82. Assumption: a save that returns `ok: true` can be stepped. Falsify with a bad weapon name. — not tried
83. Assumption: `Object.assign` of a snapshot cannot replace the hidden `map`. Falsify by adding `map` to the snapshot (`hidden()` is writable). — not tried
84. Assumption: one key fires one action, and the legend tells the truth. Falsify with duplicate codes. — not tried
85. Assumption: `NaN || 0` saves the pad. Falsify `deadzone` / `stickLook` / `poll` with NaN and Infinity. — not tried
86. Assumption: random inputs cannot NaN the player. Fuzz every late map. — not tried
87. Assumption: 1 tick x N equals N ticks. — not tried
88. Assumption: two worlds, same seed, same inputs, same hash every tick. — not tried
89. Assumption: save/load at a random tick does not change the future hash. — not tried
90. Assumption: the player centre is never in a wall cell. — not tried
91. Assumption: hp, armor and ammo never go negative and never exceed caps during play. — not tried
92. Assumption: the event list of one tick stays small. — not tried
93. Assumption: enemy count cannot run away on a hunt map. — not tried
94. Assumption: a punted creature cannot leave the map or enter a wall. (The slide-along-wall case is KNOWN; look for escape, void, boss, node.) — not tried
95. Assumption: a thrown crate cannot tunnel a thin wall or land the player out of bounds. — not tried
96. Assumption: you cannot rocket-jump (no player knockback). Confirm, or find a velocity write. — not tried
97. Assumption: props are not a floor, so you cannot stack them out of the map. — not tried
98. Assumption: bosses and nodes cannot be punted or dragged. — not tried
99. Assumption: a dragged creature cannot be pulled through a door into a sealed room and softlock a `dead:` gate. — not tried
100. Assumption: killing every seal / anchor / node in one tick does not throw and does drop the shield. — not tried
101. Assumption: the Root Bell falls when the last anchor dies, and does not fall if the map has no anchors. — not tried
102. Assumption: spikes and pulses are capped (spikes age out; pulses splice at maxR). — tried by reading `rootbell.js` and `world.js`. They are removed. Not a leak on that path.
103. Assumption: decals recycle (`DECALS.rings`). — tried by reading `decals.js`. Capped.
104. Assumption: a `dead:` group that is only spawned cannot be required by the same trigger that spawns it. — not tried
105. Assumption: `not:` conditions are not already true at spawn. — not tried
106. Assumption: the player does not spawn inside an `enter` trigger that unlocks the exit. — not tried
107. Assumption: standing still at spawn is safe for 3 seconds on every shipped map. — not tried
108. Assumption: a choice id written in one map is the id the next map reads. — not tried
109. Assumption: `hp:<group><fraction` groups exist, including groups that are only spawned later. — not tried
110. Assumption: an interlock door's partner exists and points back. — not tried
111. Assumption: a vent's landing cell is inside the map and not void. — not tried
112. Assumption: a car's path never leaves the player inside a void cell without `voidFall`. — not tried
113. Assumption: a tide cell and a belt cell do not double-move the player out of the map. — not tried
114. Assumption: a falling load and a car cannot occupy the player on the same tick and NaN the position. — not tried
115. Assumption: the chainsaw stall boundary (`heat >= 1` then `stall === 0`) does not double-fire `saw_restart` or stick at heat 1.2. — not tried
116. Assumption: switching off the saw mid-stall clears `stall` or at least stops the cut. — not tried
117. Assumption: holding a prop, then dying, then Retry, does not leave `grav.prop` on a fresh world (Retry is a new world). — not tried
118. Assumption: holding a prop while the level completes does not throw in `carryOver`. — not tried
119. Assumption: ammo pity cannot be farmed by a respawning range target or a revived body. — not tried
120. Assumption: hunt spawns are allowed to drop ammo (they are not `summoned`). Confirm it is once, not a loop. — not tried
121. Assumption: `script.js` spawn does not set `summoned`, so a repeating trigger would print ammo. Triggers fire once. Confirm none re-arm. — not tried
122. Assumption: `Math.sin` of a finite yaw never returns NaN. — tried (probe-math): sin(1e308) is finite; only Infinity is NaN, and Infinity is rejected as a saved number.
123. Assumption: the fixed loop cannot spiral. dt is clamped to 0.1 in `main.js` and to 6 steps in `FixedLoop`. — not tried as a run; read both files.
124. Assumption: a 2012-laptop hitch only slows the sim, it does not skip a door shut or a load landing in a way that softlocks. — not tried
125. Assumption: god-mode hp in a save is rejected. (The shape check only requires finite.) — not tried
126. Assumption: deleting every enemy from a save is rejected. (Count is not checked; `dead:` of an empty group stays false, so this softlocks gates rather than skipping them.) — not tried
127. Assumption: setting every enemy `state` to `dead` in a save completes the gate. Cheat, if the loader allows it. — not tried
128. Assumption: the production bundle contains no dev level picker and no `maps-dev` JSON. — not tried
129. Assumption: `?outline=` is the only query switch. Find every `location.search` read. — tried by search: only `post.js` `outline=classic`. Abuse is limited to that one flag.
130. Assumption: colour is not the only cue for keys and rings. — not tried (needs eyes; note as untested accessibility).
131. A bored child holds Use on the title screen and the pause screen. — not tried (shell; browser).
132. A speedrunner quicksaves every tick of a boss phase and reloads the one where the shield dropped. — not tried
133. A cheater sets `player.weapon` to a weapon the map has not given them, via the save, and fires it. — not tried
134. A modder adds an enemy kind the tables do not know. Must reject. — not tried
135. A troll fills `explored` with 1e7 entries. — not tried
136. A troll sets `nextId` to `Number.MAX_SAFE_INTEGER` so the next id overflows. — not tried
137. Someone with a broken controller reports axes `[NaN, NaN, 0, 0]` for an hour. — not tried
138. Someone on 5120x1440 opens three tabs and both write `hushfall.save.quick`. — not tried
139. Alt-tab on keydown without keyup sticks sprint forever. — not tried (browser). The sim itself has `releaseAll` only when the shell asks.
140. Pointer lock lost mid-hold. Same stuck-key class. — not tried (browser).
141. IME composition sends keydown with `code` of empty string. — not tried
142. Numpad enters a code that is not in the binding table and also a code that is. — not tried
143. Mouse buttons 3, 4, 5 bound and then the browser uses them for back/forward. — not tried
144. Horizontal wheel (`deltaX`) while capturing a bind (only `deltaY` is read). — not tried
145. FOV clamp vs the mortar ring and the ADS zoom fighting each other. — not tried
146. Brightness 0.6 (the floor of the clamp) makes a dark map unreadable. Preference, not a bug, unless it clamps the wrong way. — not tried
147. Reduced motion is ignored and the hurt flash / shake still runs. — not tried (known flash is excluded; shake is separate).
148. A message of several hundred characters overflows the comms box. — not tried
149. The longest speaker name in Act D overflows the subtitle line. — not tried
150. C2M28's 81 hunters plus a mortar barrage make one tick emit enough events to stall audio. — not tried
151. Restarting C2M29 30 times grows `w.enemies` or a module-level cache. — not tried
152. The Gate Warden sweep with every mirror rotated every tick does not throw and does not hit through a wall. — not tried
153. A beam that starts inside a prop cell is born already stopped, or it escapes. — not tried
154. Turning the last seal's mirror after the seal is dead does not revive the shield. — not tried
155. Vacuum damage while dead does not emit forever. — not tried
156. A car at the exact edge of its polyline (`phase` 0 and 1) does not move the player by NaN. — not tried
157. Belt `mode: 'flip'` at the exact half period does not push both ways in one tick. — not tried
158. Tide loop that the validator required to close still disagrees with `tide.js` at the join. — not tried
159. Low gravity steer into a ceiling sticks `vy` and never lands. — not tried
160. Void set-back onto a vent plate immediately launches again, forever, until death. — not tried
161. `lastSafe` recorded on a void cell (non-car maps set it unconditionally) traps the player. — not tried
162. Self-blast does not move the player, so "rocket jump out of the map" is impossible. Confirm. — not tried
163. Fork punt of a peaceful Vael counts as an innocent only on death, and a punt into the void kills them. — not tried
164. Drop magnet pulls a box through a hazard the player is then forced to enter. — not tried
165. Drop magnet NaNs when the player and the box are in the same spot (`dist` 0 is guarded by `M.stop`). — not tried
166. `hashWorld` treats Infinity as null, so a poisoned world can hash equal to a clean one. — not tried
167. `earn` with `end.time` NaN makes a rank of C and still adds salvage. — not tried
168. `rankFor` with `total.enemies` 0 scores perfect kills and can pay S for an empty map. — not tried
169. Buying with salvage exactly equal to the cost leaves 0, and a second buy fails. — not tried
170. `clampTier` of tier 1e9 clamps to max, and a save with tier 100 does not grant 100 steps. — not tried
171. `describeNext` throws when `track` is unknown (Locker only passes known tracks). — not tried
172. A choice value of `a=b=c` splits wrong in `choiceHolds`. — not tried
173. `not:not:dead:x` is rejected by the validator. Confirm a raw world still does something sensible if a test skips the validator. — not tried
174. Door index in a trigger action past the end of `w.doors` is ignored (`if (!d) return`) rather than thrown. — not tried
175. Sector id that does not exist is ignored. — not tried
176. `lights` action sets `w.ambient` to a string and the renderer NaNs. — not tried (render).
177. `silence` then a vent launch still plays `vent_launch` (audio). — not tried
178. The beat clock at tick 0 (`isBeatTick`) lets `onBeat` enemies attack before the player can see them. — not tried
179. Hive Cantor phase-two summon uses `summoned: true`. Confirm the callback in `world.js` still does. — tried by reading `world.js` line 1042. It sets `summoned`.
180. A required kill that is a node with `hp` 0 but state not `dead` never completes the gate. — not tried

## What was run

Auditor **GROKS**. Gemini may be writing `attack/` at the same time; this ledger is only `attack/groks/`.

Ideas below that are not named here were not run. They lost the rank, or they need a browser, a bake, or a long Chrome job, and this session had no fresh yes for that.

| idea | result |
| --- | --- |
| 1–7, 18, random mashing | `sim-fuzz.mjs` on 13 maps, 200–400 ticks, stock and fully armed. No throw, no non-finite player. |
| 18 airlock both Use | Cold Dock, both `want` flags, player in the doorway, 8 s. One door stayed open. Player died. No throw. |
| 161 lastSafe on void | Teleport onto a Hollow Stair void cell (no cars). The body stays: `groundAir` only calls `voidFall` when the map has cars (`world.js:965`). Walking onto void is blocked, so a player does not reach this state. Left off the list. |
| 162 rocket jump | 40 ticks of the line-thrower on Marrow Quay. Moved 0. hp stayed 100. No self-knockback. |
| 167–168 empty tally pays a rank | Confirmed. `endStats: {}` earns rank B, score 0.55, gain 1, because a missing enemy total scores perfect kills (`progress.js:30`). Filed as G-04. |
| 179 Hive summon sets `summoned` | Confirmed by reading `world.js:1042`. |
| save edits, god stats, duplicate keys, NaN frame | `save-mutate.mjs`, `mechanics.mjs`, `round3.mjs`. Filed as G-01 through G-08. |
| 68-map idle stand, vents, interlocks, choices | `scan-logic.mjs`. One flag: C1E1M08 loses 41 hp. A gaunt 4.5 m from spawn, idle, then hits of 9, 9, 9 and 14. Left off the list. |

## Round 3 — thirty new ideas, all run

31. `status: 'banana'`. **Result:** loads, `step` returns at once, status stays. G-03.
32. `status: 'complete'` and `endStats` omitted. **Result:** loads, `earn()` throws on `.total`. G-01.
33. `status: 'complete'` and `endStats: {}`. **Result:** pays rank B, gain 1. G-04.
34. `pickups: [null]`. **Result:** `updateDrops` throws on `.drop`. G-02.
35. `enemyShots: [null]`. **Result:** throws on `.life`. G-02.
36. `burns: [null]`. **Result:** throws on `.t`. G-02.
37. `projectiles: [{}]`. **Result:** no throw; x/y/z stay undefined. Noted under G-05.
38. projectile `life: 'long'`. **Result:** no throw, no invariant. Left off the list (one projectile, `life` becomes NaN and the `<= 0` test never passes).
39. `doors[0].open = 'wide'`. **Result:** no throw. Left off the list.
40. `player.ammo = null`, then fire. **Result:** throws on `.flare`. G-02.
41. `weapons: [null, 'flare']`. **Result:** survives. `includes` still works. Left off the list.
42. `weapon: 0` (a number). **Result:** throws on `.saw`. G-02.
43. `exitLocked: null`. **Result:** rejected, `field exitLocked is a null, expected object`.
44. `stats: null`. **Result:** rejected the same way.
45. `swingT: 'x'`. **Result:** rejected, `player.swingT is not finite`.
46. `keys: null`, idle, no key in reach. **Result:** survives. A key in reach would throw on `.includes`. Same family as 49.
47. `messagesSeen: 'nope'` beside a message. **Result:** rejected, string vs array.
48. `secretsFound: 'nope'` inside a secret. **Result:** rejected, string vs array.
49. `keys: 'brass'` standing on the brass key. **Result:** no throw. `'brass'.includes('brass')` is true, so the key is treated as already owned.
50. `keys: 'brass'` standing on an iron key. **Result:** `p.keys.push is not a function` at `world.js:1237`. G-02.
51. `weapons: 'flare'`, then `maybeDrop`. **Result:** `p.weapons.map is not a function` at `drops.js:22`. G-02.
52. The fov line in `GameView.render` (`view.js:286`) with `weapon: 'nope'`. **Result:** throws on `.adsFov`. Expression only; the page was not opened. G-01.
53. `status: 'complete'` plus `weapon: 'nope'`. **Result:** `step` does not throw, so the render path in 52 is the one that runs. G-01.
54. C1E1M08 idle for 3 s, event log. **Result:** gaunt at 4.47 m. Not filed.
55. `FixedLoop.advance(NaN)` then a normal frame. **Result:** `acc` stays NaN, zero steps. G-08.
56. `salvage: 1e308`, then `buy('ammo')`. **Result:** kept, purchase succeeds, tier becomes 1. G-05.
57. `hp` and `armor` of `1e9`. **Result:** kept. Cap is 100. G-05.
58. every enemy `hp: 0, state: 'dead'`. **Result:** accepted. A real mid-level save looks like this after a fight, so it is not filed as a defect. Skipping a `dead:` gate this way is an edit of a legal shape.
59. enemy `hp: '10'`. **Result:** rejected, non-finite hp.
60. `events: null`, then fire. **Result:** `emit` throws on `.push` at `world.js:108`. G-02.
