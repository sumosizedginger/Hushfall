# GEMINI REGRESSION TEST SUITE

**Author:** Gemini (Hostile QA Engineer & Exploit Hunter)  
**Target:** HUSHFALL Simulation Engine & Exploit Verification  
**Date:** October 14, 2026

## How to Run

Execute via standard Node test runner:
```bash
node --test attack/tests/repro_gemini.test.js
```

## Test Inventory

1. **`GEMINI-01`**: Verifies that `buy()` and `describeNext()` in `src/engine/progress.js` crash with `TypeError: Cannot read properties of undefined (reading 'length')` when passed prototype property names (`toString`, `valueOf`, `__proto__`).
2. **`GEMINI-02`**: Verifies that `loadWorld()` in `src/engine/save.js` accepts saves with injected enumerable `map` and `events` properties (because `worldShapeErrors` only inspects enumerable properties of `fresh`), and that `Object.assign` overwrites non-enumerable simulation state, crashing subsequent `step()`.
3. **`GEMINI-03`**: Verifies that on void maps without cars (e.g. `C1E4M01`), `groundAir()` in `src/engine/world.js` fails to trigger `voidFall()`, records the void cell at `y = -6` as `lastSafe`, and softlocks the player on the void floor with 100 HP.
4. **`GEMINI-04`**: Verifies that `designate()` in `src/engine/mortar.js` clamps landing points to `minRange` (9m) without clipping against walls, pushing landing targets through exterior and interior solid walls.
5. **`GEMINI-05`**: Verifies that `step()` in `src/engine/world.js` produces a negative array index (`ring[-1] = undefined`) and fails to cycle weapons when given negative `cmd.weaponStep` deltas `< -1`.
6. **`GEMINI-06`**: Verifies that the emergency dry feed in `src/engine/world.js` awards flare ammo to players who do not own the flare cannon, leaving them stranded without ammunition for their carried weapons.
7. **`GEMINI-07`**: Verifies that passing `Infinity` into `cmd.yaw` sets `p.yaw = Infinity`, corrupting `forwardVec(p)` into `[NaN, 0, NaN]` and breaking all subsequent directional math.
