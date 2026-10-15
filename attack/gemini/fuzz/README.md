# GEMINI FUZZERS & EXPLOIT HARNESSES

**Author:** Gemini (Hostile QA Engineer & Exploit Hunter)  
**Target:** HUSHFALL Simulation Engine & Game Shell  
**Date:** October 14, 2026

All fuzzers are deterministic, self-contained Node.js scripts requiring no external dependencies beyond the project's existing Node environment. They execute in seconds.

---

## Fuzzers Directory

### 1. `fuzz_progress_proto.mjs`
- **Target:** `src/engine/progress.js` (`buy`, `describeNext`, `TRACKS`)
- **Action:** Probes prototype pollution and property resolution by calling `buy()` and `describeNext()` with built-in prototype property names (`__proto__`, `toString`, `valueOf`, etc.).
- **Execution:** `node attack/fuzz/fuzz_progress_proto.mjs`
- **Result:** Proves unhandled `TypeError: Cannot read properties of undefined (reading 'length')` crash.

### 2. `fuzz_save_overwrite.mjs`
- **Target:** `src/engine/save.js` (`loadWorld`, `worldShapeErrors`)
- **Action:** Injects enumerable `map` and `events` properties into mid-level save state payloads to demonstrate that `worldShapeErrors` fails to validate non-enumerable properties, and `Object.assign` overwrites internal simulation state.
- **Execution:** `node attack/fuzz/fuzz_save_overwrite.mjs`
- **Result:** Proves crash in `step()` when `w.map` is corrupted and `w.events.push` is overwritten.

### 3. `fuzz_void_softlock.mjs`
- **Target:** `src/engine/world.js` (`groundAir`, lines 964–967)
- **Action:** Places the player on a void tile in maps with void but without cars (e.g. `C1E4M01`, `C1E4M02`, `C1E4M07`) and steps the simulation.
- **Execution:** `node attack/fuzz/fuzz_void_softlock.mjs`
- **Result:** Proves that `m.cars.length === 0` skips `voidFall()`, records the void cell as `lastSafe`, and softlocks the player at `y = -6` with 100 HP.

### 4. `fuzz_mortar_wall_pierce.mjs`
- **Target:** `src/engine/mortar.js` (`designate`, lines 33–36)
- **Action:** Aims the mortar at nearby solid walls at various yaw angles and measures the calculated landing coordinates.
- **Execution:** `node attack/fuzz/fuzz_mortar_wall_pierce.mjs`
- **Result:** Proves `minRange` blindly teleports landing points 9 meters forward into and through solid walls.

### 5. `fuzz_weapon_step_neg.mjs`
- **Target:** `src/engine/world.js` (line 1151)
- **Action:** Sends negative `cmd.weaponStep` values (`-2`, `-3`, etc.) to simulate rapid reverse mouse wheel scrolling.
- **Execution:** `node attack/fuzz/fuzz_weapon_step_neg.mjs`
- **Result:** Proves `(i + cmd.weaponStep + ring.length) % ring.length` produces negative indices (`ring[-1] = undefined`), causing weapon selection to fail.

### 6. `fuzz_dry_feed.mjs`
- **Target:** `src/engine/world.js` (lines 1223–1225)
- **Action:** Sets player inventory with carbine/harpoon/melee with 0 ammo (no flare cannon) and steps the world past `dryFeed.every` intervals.
- **Execution:** `node attack/fuzz/fuzz_dry_feed.mjs`
- **Result:** Proves the game continuously awards flare ammo that the player cannot use, leaving them permanently stranded.

### 7. `fuzz_gamepad_nan.mjs`
- **Target:** `src/game/gamepad.js` & `src/engine/world.js`
- **Action:** Passes `NaN` and `Infinity` through `deadzone()`, `stickLook()`, and `InputState`.
- **Execution:** `node attack/fuzz/fuzz_gamepad_nan.mjs`
- **Result:** Demonstrates `Infinity` in `cmd.yaw` corrupts `p.yaw = Infinity` and produces `forwardVec = [NaN, 0, NaN]`.

### 8. `fuzz_sim_invariants.mjs`
- **Target:** Core engine loop across multiple maps (`C1E1M01`, `C1E2M01`, `C1E3M01`, `C1E4M01`, `C2M01`)
- **Action:** Drives the simulation with randomized inputs, verifying finite numbers and determinism.
- **Execution:** `node attack/fuzz/fuzz_sim_invariants.mjs`
- **Result:** 0 invariant crashes, bit-for-bit determinism holds.

### 9. `fuzz_save_roundtrip.mjs`
- **Target:** `src/engine/save.js` & `src/engine/world.js`
- **Action:** Compares 600 continuous ticks against 300 ticks + mid-level save + loadWorld + 300 ticks.
- **Execution:** `node attack/fuzz/fuzz_save_roundtrip.mjs`
- **Result:** Bit-for-bit identical world hashes (4b2267a7).
