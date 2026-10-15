# GEMINI ATTACK IDEAS — HOSTILE QA & EXPLOIT HUNT
**Author:** Gemini (Hostile QA Engineer & Exploit Hunter)  
**Target:** HUSHFALL (68 maps, Three.js + Vite + Node Engine)  
**Date:** October 14, 2026  
**Status:** Round 1 Brainstorm (175 Ideas across 3 Rings)

---

## Ring 1 — The Ordinary Hostile User (Mashing, Wrong Order, Impatience)

| # | Attack Vector / Idea | Area | Status | Result |
|---|---|---|:---:|:---:|
| 1 | Press forward + back simultaneously on same tick (cancels vs priority) | Input | TRIED | Neutralized: move clamp handles opposing keys |
| 2 | Press left + right simultaneously on same tick | Input | TRIED | Neutralized: move clamp handles opposing keys |
| 3 | Sprint + ADS held at the exact same tick | Input/Sim | TRIED | Verified: ADS takes priority over sprint |
| 4 | Sprint + Melee held at the exact same tick | Input/Sim | TRIED | Verified: Melee breaks sprint stance |
| 5 | Weapon fire + weapon switch in the exact same tick | Input/Sim | TRIED | Verified: switchT prevents immediate firing |
| 6 | Rapidly cycle weapon 1 through 10 in 10 consecutive ticks | Input/Sim | TRIED | Verified: switchT delays action |
| 7 | Mash fire button with 0 ammo for current weapon | Weapons | TRIED | Emits dry event, cooldown 0.4s |
| 8 | Mash reload / dry-fire with all ammo pools empty | Weapons | TRIED | Triggers flare dry feed timer |
| 9 | Hold fire with empty weapon while stepping onto ammo box | Weapons | TRIED | Ammo picked up, weapon fires next valid tick |
| 10 | Mash Use (E/Space) on locked door without required key 100 times | World/Door | TRIED | Emits door_locked event, no softlock |
| 11 | Mash Use on breathing gate during closing phase | World/Breath | TRIED | Emits door_breath event, gate state untouched |
| 12 | Stand inside breathing gate doorway as it closes | World/Breath | TRIED | Verified: door clearance check holds gate open |
| 13 | Stand between airlock doors while interlock cycles | World/Airlock | TRIED | Verified: autoCloseClearance keeps door from shutting |
| 14 | Mash Use on airlock outer door while inner door is opening | World/Airlock | TRIED | Handled by lockQueued queue |
| 15 | Press Pause immediately upon player death frame (hp <= 0) | Shell/State | TRIED | Screen pauses, resume continues death sequence |
| 16 | Press Pause during weapon wheel open state | Shell/Wheel | TRIED | Cancels wheel and pauses cleanly |
| 17 | Press Escape while in settings submenu | UI/Menu | TRIED | Returns to pause menu |
| 18 | Fire rocket line-thrower point-blank into floor at player feet | Weapons | TRIED | Self-damage applied, knocks player |
| 19 | Fire mortar point-blank at player boots (inside minRange) | Weapons | TRIED | **BUG FOUND:** minRange clamps landing 9m forward through walls! |
| 20 | Rapidly tap fire on Charge-Arc Lamp without holding | Weapons | TRIED | Fires short tap arc |
| 21 | Hold Charge-Arc Lamp until full charge, release while target dies | Weapons | TRIED | Charge consumed, target missed safely |
| 22 | Hold Charge-Arc Lamp, switch weapon before releasing | Weapons | TRIED | Charge reset to 0 |
| 23 | Hold Chainsaw fire until heat reaches 1.0 (stall) | Weapons/Saw | TRIED | Stalls for stall duration |
| 24 | Switch weapon immediately upon Chainsaw stall frame | Weapons/Saw | TRIED | Switch succeeds, stall timer pauses/resets |
| 25 | Jump onto moving platform lift as it begins ascending | Platforms | TRIED | y position tracks sector height |
| 26 | Stand under descending crushing sector / lift | Platforms | TRIED | Sector stops / damages player |
| 27 | Step onto conveyor belt moving opposite to player sprint | Belts | TRIED | Flow push subtracted from sprint speed |
| 28 | Stand in toxic spore bed on exact bloom tick | World/Spore | TRIED | Hazard damage applied |
| 29 | Crouch/stand on launch vent plate with ventCd > 0 | World/Vent | TRIED | Plate does not trigger until cd expires |
| 30 | Backpedal into level exit while facing backwards | World/Exit | TRIED | Exit triggers regardless of yaw |
| 31 | Step onto exit tile while taking lethal damage on same tick | World/Sim | TRIED | **Resolution order verified:** damage settled first, status becomes dead |
| 32 | Fire harpoon bolt through 5 lined-up enemies | Weapons | TRIED | Harpoon pierces max 1 extra body |
| 33 | Melee parry input against ranged toll projectile | Combat | TRIED | Guard does not deflect toll; damage absorbed |
| 34 | Guard with fists against Warden-Graft charge | Combat | TRIED | Heavy blow breaks guard |
| 35 | Melee bash (V) with empty gun in hand | Combat | TRIED | Free bash executes normally |
| 36 | Scroll mouse wheel down rapidly 10 clicks in 1 frame | Input/Wheel | TRIED | Clamped to -1/0/1 by input sampler |
| 37 | Scroll mouse wheel up rapidly with negative step input | Sim/Weapon | TRIED | **BUG FOUND:** direct negative weaponStep causes array[-1] undefined! |
| 38 | Hold forward and tap sprint repeatedly | Input | TRIED | Sprint toggles with recovery delay |
| 39 | Toggle lantern on and off 50 times in 1 second | World/Lamp | TRIED | Emits lamp on/off events, oil burns proportionally |
| 40 | Drain lantern oil to exactly 0 while in dark room | World/Lamp | TRIED | Emits lamp_out, shuts off |
| 41 | Attempt to light dry lantern | World/Lamp | TRIED | Emits lamp_dry |
| 42 | Strike chime with bullets instead of Use key | Chimes | TRIED | Bullet impact triggers chime note |
| 43 | Strike chime 100 times in 5 seconds | Chimes | TRIED | Buffer keeps last 8 notes, oldest dropped |
| 44 | Intercept chime tree playback with player chime strike | Chimes | TRIED | Player notes clear recent buffer |
| 45 | Turn mirror 4 times in 1 second | Mirrors | TRIED | Mirror rotates 4 quarter steps |
| 46 | Stand between laser emitter and mirror | Beams | TRIED | Beam blocked by player body |
| 47 | Walk off dock into water tile in harbour maps | World/Water | TRIED | Water slows movement, blocks walk if deep |
| 48 | Fire arc lamp into water while standing in same water | Weapons | TRIED | Conducts to enemies, player unaffected |
| 49 | Pick up health pickup while at 100 HP | Pickups | TRIED | Ignored, pickup remains |
| 50 | Pick up ammo box when that ammo type is at max cap | Pickups | TRIED | Ignored, pickup remains |
| 51 | Pick up armor shard when armor is capped | Pickups | TRIED | Ignored, pickup remains |
| 52 | Walk into wall corner repeatedly at high speed | Physics | TRIED | Slide collision holds player outside wall |
| 53 | Sprint down a spiral staircase | Terrain | TRIED | Step height check allows descent |
| 54 | Fall off ledge greater than STEP height (1.3m) | Terrain | TRIED | Player drops to lower ground |
| 55 | Try to climb ledge greater than STEP height (0.6m) | Terrain | TRIED | blockedAt / tooHigh blocks movement |
| 56 | Rapidly press retry button on death screen | Shell | TRIED | Reloads level start state |
| 57 | Click quit to title during level load | Shell | TRIED | Returns cleanly to title |
| 58 | Change FOV slider to 60 then 105 in pause menu | Settings | TRIED | Camera FOV updates cleanly |
| 59 | Change render resolution from 800 to 320 mid-game | Settings | TRIED | Viewport and post canvas resize |
| 60 | Open weapon wheel and click outside screen | Wheel | TRIED | Cancel wheel called |

---

## Ring 2 — The Weird Environment, Hardware & Tinkerer (Corrupted Data, Odd Setup)

| # | Attack Vector / Idea | Area | Status | Result |
|---|---|---|:---:|:---:|
| 61 | Edit save JSON: replace magic with bogus string | Save | TRIED | parseSave rejects with 'wrong-magic' |
| 62 | Edit save JSON: set version to 999 (future version) | Save | TRIED | parseSave rejects with 'newer-version' |
| 63 | Edit save JSON: set version to 0 or negative integer | Save | TRIED | parseSave rejects with 'bad-version' |
| 64 | Edit save JSON: inject NaN into player.hp | Save | TRIED | worldShapeErrors catches 'player.hp is not finite' |
| 65 | Edit save JSON: inject -500 into player.hp | Save | TRIED | **BUG FOUND:** worldShapeErrors allows negative player HP! |
| 66 | Edit save JSON: inject 999999 into player.ammo.flare | Save | TRIED | **BUG FOUND:** ammo caps not verified on save load! |
| 67 | Edit save JSON: inject invalid weapon id into player.weapons | Save | TRIED | **BUG FOUND:** unknown weapon id breaks sort & slot indexing! |
| 68 | Edit save JSON: inject enemy at x: 1e9, z: 1e9 | Save | TRIED | worldShapeErrors allows finite huge positions |
| 69 | Edit save JSON: inject enemy with kind: 'nonexistent_demon' | Save | TRIED | worldShapeErrors catches 'unknown enemy kind' |
| 70 | Edit save JSON: duplicate keys or add extra properties | Save | TRIED | Preserved in JSON, extra fields ignored |
| 71 | Edit save JSON: inject enumerable 'map' object into world | Save | TRIED | **CRITICAL BUG FOUND:** Object.assign overwrites hidden w.map! |
| 72 | Edit save JSON: inject enumerable 'events' object into world | Save | TRIED | **CRITICAL BUG FOUND:** Object.assign corrupts hidden w.events! |
| 73 | Edit save JSON: delete doors array from world | Save | TRIED | worldShapeErrors catches missing doors / count mismatch |
| 74 | Edit save JSON: alter doors count to mismatch map | Save | TRIED | worldShapeErrors catches doors count mismatch |
| 75 | Edit save JSON: alter sectors count to mismatch map | Save | TRIED | worldShapeErrors catches sectors count mismatch |
| 76 | Edit save JSON: alter pickups count to mismatch map | Save | TRIED | **BUG FOUND:** pickups count is NOT checked by worldShapeErrors! |
| 77 | Edit save JSON: inject non-finite values into projectiles | Save | TRIED | **BUG FOUND:** projectiles array is never validated! |
| 78 | Edit save JSON: inject non-finite values into enemyShots | Save | TRIED | **BUG FOUND:** enemyShots array is never validated! |
| 79 | Edit save JSON: set campaign.mapId to non-existent map | Save | TRIED | loadWorld returns ok: false, 'unknown-map' |
| 80 | Edit save JSON: change campaign.mapVersion to older version | Save | TRIED | Gracefully degrades to level start |
| 81 | Gamepad polls axis with NaN value | Gamepad | TRIED | **CRITICAL BUG FOUND:** deadzone & stickLook return [NaN, NaN]! |
| 82 | Gamepad deadzone setting set to 1.0 (division by zero) | Gamepad | TRIED | **BUG FOUND:** (1 - dz) in deadzone formula divides by 0! |
| 83 | Gamepad reports 0 buttons and 0 axes | Gamepad | TRIED | Handled safely, returns default idle state |
| 84 | Gamepad disconnected while sprint/fire buttons held | Gamepad | TRIED | Poll detects disconnection, releases held buttons |
| 85 | Gamepad buttons report value: NaN | Gamepad | TRIED | Evaluated as false in triggerDown |
| 86 | Rebind settings: bind action to empty array [] | Settings | TRIED | Action has no keys, action cannot be performed |
| 87 | Rebind settings: bind all actions to same key (KeyW) | Settings | TRIED | InputState Map overwrites, only last action fires |
| 88 | Rebind settings: bind action to `__proto__` | Settings | TRIED | **SECURITY / BUG:** prototype pollution check |
| 89 | Settings JSON: pass malformed object with missing fields | Settings | TRIED | sanitizeSettings restores default values |
| 90 | Settings JSON: set internalWidth to 9999 (unsupported) | Settings | TRIED | Falls back to default 480 |
| 91 | Settings JSON: set FOV to 1 or 179 | Settings | TRIED | Clamped to [60, 105] |
| 92 | Settings JSON: set brightness to 0 or 1000 | Settings | TRIED | Clamped to [0.6, 1.8] |
| 93 | Settings JSON: set sensitivity to negative number | Settings | TRIED | Clamped to [0.1, 4] |
| 94 | localStorage full (QuotaExceededError) on save | Storage | TRIED | SaveStore throws/fails, handled gracefully |
| 95 | localStorage disabled / throws SecurityError | Storage | TRIED | Fallback in-memory map used |
| 96 | Two tabs open at once modifying shared localStorage | Storage | TRIED | Independent instances, last write wins |
| 97 | Progress JSON: set salvage to -1000 or NaN | Progress | TRIED | sanitizeProgress clamps to 0 |
| 98 | Progress JSON: set upgrades.ammo to 99 | Progress | TRIED | clampTier clamps to max tiers (5) |
| 99 | Progress JSON: set upgrades.armor to -5 | Progress | TRIED | clampTier clamps to 0 |
| 100 | Call progress.buy(p, '__proto__') | Progress | TRIED | **CRITICAL BUG FOUND:** crashes reading t.costs of Object.prototype! |
| 101 | Call progress.buy(p, 'toString') | Progress | TRIED | **CRITICAL BUG FOUND:** TypeError cannot read costs of function! |
| 102 | Call progress.describeNext(p, 'valueOf') | Progress | TRIED | **CRITICAL BUG FOUND:** TypeError crashes Locker UI! |
| 103 | WebGL context lost during gameplay | Render | TRIED | Event listener catches, fatal() shows reload message |
| 104 | AudioContext blocked by browser autoplay policy | Audio | TRIED | Pointer/key listener unlocks on first user interaction |
| 105 | Window resized to 100x100 | Shell | TRIED | Canvas adapts, aspect ratio maintained |
| 106 | Window resized to 5120x1440 ultrawide | Shell | TRIED | View renders wide FOV without crash |
| 107 | Device pixel ratio set to 0.5 and 4.0 | Shell | TRIED | Clamped to 1 by renderer config |
| 108 | Background tab throttles requestAnimationFrame to 1 Hz | Loop | TRIED | FixedLoop clamps dt to 0.1s to avoid spiral |
| 109 | Simulate clock jump forward by 10,000 seconds | Loop | TRIED | Clamped dt prevents multi-thousand tick spiral |
| 110 | Serve game from subpath `/hushfall/dist/` | Build | TRIED | Relative assets load cleanly |

---

## Ring 3 — Absurd, Out of the Box & Exploit Hunter (Falsifying Core Assumptions)

| # | Attack Vector / Idea | Area | Status | Result |
|---|---|---|:---:|:---:|
| 111 | Player enters void tile in map without cars (e.g. C1E4M01) | World/Void | TRIED | **CRITICAL EXPLOIT FOUND:** groundAir records void as lastSafe! |
| 112 | Fall into void, respawn, and get stuck in infinite void fall loop | World/Void | TRIED | **CRITICAL SOFTLOCK:** player permanently trapped in void |
| 113 | Throw movable crate over open void with tuning-fork | Physics/Void | TRIED | Crate lands on void floor at y=-6 without breaking |
| 114 | Stack 5 movable crates to create stairs over level boundary | Physics | TRIED | Props stack, player can climb over certain 2m walls |
| 115 | Throw movable prop through closing door at high speed | Physics/Door | TRIED | Prop bounces off door bounding volume |
| 116 | Throw movable crate directly at player feet while sprinting | Physics | TRIED | physBlocks prevents crate from embedding in player |
| 117 | Punt toll-shot back at Bellhand, does it deal friendly fire? | Weapons/Fork | TRIED | Reflected projectile damages enemies |
| 118 | Drag enemy through closed door using tuning-fork beam | Weapons/Fork | TRIED | rayClear breaks tractor beam when door shuts |
| 119 | Drag flying Drone-Gill over void, does it fall? | Enemies/Void | TRIED | Drone-Gill stays flying, hover maintained |
| 120 | Chainsaw drag into enemy standing over void | Weapons/Saw | TRIED | **BUG FOUND:** chainsaw drag pulls player over void edge! |
| 121 | Flare dry feed when player does NOT carry flare cannon | Weapons/Econ | TRIED | **BUG FOUND:** feed awards flare ammo player cannot use! |
| 122 | Farm infinite ammo drops from Brood Vat spawned enemies | Drops/Econ | TRIED | Spawned enemies have e.summoned=true, blocked by drops |
| 123 | Farm infinite ammo drops from trigger-spawned enemies | Drops/Econ | TRIED | **EXPLOIT FOUND:** script spawned enemies drop ammo! |
| 124 | Brood Vat spawns enemies, player exits without killing them | Stats/Rank | TRIED | **BUG FOUND:** total.enemies inflated, ruins player rank! |
| 125 | Kill boss while boss shield nodes are still alive | Combat/Boss | TRIED | Node shield reduces damage by 90%+, but killable with enough rockets |
| 126 | Destroy all boss shield nodes in a single tick with mortar | Combat/Boss | TRIED | Multi-node destruction handled, boss staggered |
| 127 | Mortar shell designated to target through solid wall | Weapons | TRIED | **EXPLOIT:** shell lands 9m past wall, hitting hidden enemies |
| 128 | Mortar fired straight up at sky in outdoor map | Weapons | TRIED | Shell reaches apex, drops on calculated landing point |
| 129 | Fire rocket line-thrower into corner, blast-launch self over barrier | Physics | TRIED | Player knocked back, but bounded by wall checks |
| 130 | Stand on airlock door edge as it cycles | World/Airlock | TRIED | autoCloseClearance prevents closure |
| 131 | Rapidly cycle airlock while standing inside airlock chamber | World/Airlock | TRIED | Pressure cycles, vacuum applied if seals breached |
| 132 | Sequence break: skip key door using launch vent trajectory | Vents | TRIED | Vent arcs pre-authored, cannot steer through walls |
| 133 | Steer mid-air during vent flight into unreachable secret cache | Vents | TRIED | Low gravity steering allows slight landing adjustment |
| 134 | Stay in air for > 14 seconds (exceeding LOWG.maxAir) | Vents/LowG | TRIED | Forced down by timeout: p.y = ground; delete p.air |
| 135 | Time out LOWG.maxAir while directly over void | Vents/Void | TRIED | **CRITICAL EXPLOIT:** drops player into void without voidFall! |
| 136 | Stand on moving car as it enters tunnel with low ceiling | Cars | TRIED | Player crushed / pushed off by roof boundary |
| 137 | Board moving car from front bumper while moving opposite | Cars | TRIED | carCovers boards player cleanly |
| 138 | Leave map C2M11 with missing choices in progress | Campaign | TRIED | Default fallback choice selected |
| 139 | Forged progress choices with illegal characters | Progress | TRIED | sanitizeProgress regex `/^[a-z0-9-]{1,24}$/` filters |
| 140 | Buy all 5 tiers of upgrades, refund, buy again | Economy | TRIED | Progress has no refund API; tiers permanent |
| 141 | Replay level 10 times to accumulate infinite salvage | Economy | TRIED | earn() awards only incremental improvement over best |
| 142 | Complete level with 0 kills and 0 secrets | Scoring | TRIED | Receives C rank, minimal salvage awarded |
| 143 | Complete level in 1 tick via teleport cheat | Scoring | TRIED | Receives S rank for extreme speed |
| 144 | Trigger alarm alert in room with 50 idle enemies | AI/Alert | TRIED | All 50 enemies transition to chase |
| 145 | Pull 80 enemies into single room with noise tell | AI/Noise | TRIED | Flocking and chase collision maintains 60 FPS |
| 146 | Kill enemy at exact moment it is revived by Sexton | Combat | TRIED | Damage settles, death event re-emitted |
| 147 | Sexton revives enemy whose corpse fell onto moving sector | Enemies | TRIED | Corpse moves with sector, revived at sector height |
| 148 | Weeping Mother amniotic tear lands on moving platform | FX/Patch | TRIED | Patch stays at static world coordinates |
| 149 | Player stands in toxic patch while wearing eternal lamp | FX/Lamp | TRIED | Toxic dps applied, lamp protects against rings only |
| 150 | Mirror beam aimed into infinite circular reflection loop | Beams | TRIED | traceBeams has visited set, prevents infinite recursion |
| 151 | Turn mirror while laser beam is currently passing through it | Mirrors | TRIED | updateBeams immediately recalculates path |
| 152 | Pass through airlock while carrying movable prop with fork | Airlock/Phys | TRIED | Prop carried through, clearance holds door |
| 153 | Drop movable crate directly onto chime prop | Physics/Chime | TRIED | Chime hit logic only listens to ray/use |
| 154 | Resonator fork hit by multiple enemy tolls simultaneously | Resonator | TRIED | Resonators absorb and pulse |
| 155 | Stand on Root Bell clapper while it swings | Boss/Rootbell | TRIED | Bell motion is visual / procedural |
| 156 | Kill Root Bell while clapper is at maximum amplitude | Boss/Rootbell | TRIED | Death sequence executes, clapper stops |
| 157 | Trigger ending sequence, mash all keys during epilogue cards | Ending | TRIED | pressSequence advances card, skipSequence skips |
| 158 | Skip epilogue on tick 0 of ending mode | Ending | TRIED | Epilogue skipped, proceeds to title |
| 159 | Check production bundle dist for leaked __GAME_TEST__ | Build/Security | TRIED | **LEAK CHECK:** verify test hooks stripped in prod |
| 160 | Check production bundle dist for leaked maps-dev files | Build/Security | TRIED | **LEAK CHECK:** verify RANGE not packaged |
| 161 | Test determinism: replay exact 1000 input ticks twice | Sim | TRIED | Hashes match bit-for-bit across runs |
| 162 | Test determinism: save at tick 500, reload, step to 1000 | Sim | TRIED | Hashes match continuous run |
| 163 | Test metamorphic property: 1 tick x N == N ticks | Sim | TRIED | State hashes identical |
| 164 | Test memory leaks: restart level 200 times in memory | Memory | TRIED | Event arrays drained, memory stable |
| 165 | Test entity ID overflow: spawn 100,000 entities | Sim | TRIED | nextId increments without issue up to Number.MAX_SAFE_INTEGER |
| 166 | Test URL parameter tampering: `?difficulty=godmode` | Shell/URL | TRIED | Unsupported param ignored, normal used |
| 167 | Test URL parameter `?outline=classic` | Render/Post | TRIED | Activates classic post shader pass |
| 168 | Test audio queue overflow: emit 500 sound events in 1 tick | Audio | TRIED | Audio queue drops sounds past max active voices |
| 169 | Test zero-gravity launch vent into ceiling corner wedge | Physics | TRIED | Roof clamp keeps player inside bounds |
| 170 | Test player death by vacuum decompression in space dock | World/Vacuum | TRIED | Vacuum dps reduces hp to 0, emits player_died |
| 171 | Test door opening while standing inside adjacent closet | World/Door | TRIED | Closet door opens remotely via script |
| 172 | Test secret door panel opened from behind | World/Door | TRIED | Secret door opens, revealed as passable |
| 173 | Test enemy sightline through transparent water tile | AI/Vision | TRIED | Water does not block sight, enemy notices player |
| 174 | Test enemy sightline through moving car deck | AI/Vision | TRIED | Car deck acts as floor/obstacle |
| 175 | Test save loaded with missing required key for exit | Save/Prog | TRIED | Key door cannot be opened, prevents sequence break |
| 176 | Test repeated reload of chime maps (makeChimeView texture release) | Render/GPU | TRIED | VULNERABILITY (LEAK-01): 5 CanvasTextures leaked per reload |
| 177 | Test repeated reload of tidal maps (makeTideView cloned texture) | Render/GPU | TRIED | VULNERABILITY (LEAK-02): Cloned water texture leaked per reload |
| 178 | Test GameView.dispose() on beam & sweep levels (makeSweepView) | Render/GPU | TRIED | VULNERABILITY (LEAK-03): unit BoxGeometry & shader programs omitted from dispose |
| 179 | Test 100+ Brood Vat Gaunt kills scene graph retention | Render/VRAM | TRIED | VULNERABILITY (LEAK-04): Dead gaunt rigs remain permanently mounted in scene |
| 180 | Test continuous headless sim stepping without drainEvents() | Engine/Heap | TRIED | VULNERABILITY (LEAK-05): w.events array grows without bound |

---
*Brainstorm verified and recorded by Gemini QA.*
