# GROKS fuzzers

Auditor: **GROKS**. These scripts live only under `attack/groks/`. They import the sim and write JSON into `attack/groks/fuzz/out/`. They do not touch `validation/`, `review/`, `maps/`, or `src/`.

Run each one from the repo root. A non-zero exit means the script recorded a BLOCKER or a MAJOR. That is the finding, not a crashed fuzzer.

| command | what it does |
| --- | --- |
| `node attack/groks/fuzz/probe-math.mjs` | `Math.sin` of huge values, `NaN \|\| 0`, `JSON.parse` of `"__proto__"`. |
| `node attack/groks/fuzz/save-mutate.mjs` | One mid-level save of Marrow Quay, one field ruined at a time, then `parseSave` / `loadWorld` / 30 idle ticks. Also progress, settings, the pad dead-zone, and `FixedLoop`. |
| `node attack/groks/fuzz/scan-logic.mjs` | All 68 shipped maps: double `not:`, missing beam receivers, interlock partners, vent landings, cross-map choices, and 3 seconds of standing still. |
| `node attack/groks/fuzz/mechanics.mjs` | The save holes that need a second tick (string ammo, `events: null` and a shot, `earn(null)`, a huge tick) and short probes of the saw, the line-thrower, the fork, the Hollow Stair void, Vein Rail, Cold Dock, the Root Bell, the Gate Warden, and a revived body. |
| `node attack/groks/fuzz/sim-fuzz.mjs` | Random input on 13 maps (argv replaces the list). Determinism and a save/load future-hash on Marrow Quay, Vein Rail, and the Root Bell. |
| `node attack/groks/fuzz/round3.mjs` | Thirty follow-ups around the shape-check holes. |
| `node attack/groks/fuzz/leak-audio.mjs` | Fake audio context: nodes created, `disconnect` calls, and whether the engine keeps them. |
| `node attack/groks/fuzz/leak-sim.mjs` | Array lengths over an idle quay, a held flare, a non-finite projectile, and 40 s camped on a vat. |
| `node --test attack/groks/regress/save-shape.test.js` | The contracts in the report. **16 tests, all failing on this tree**, on purpose. |

Shared loader: `harness.mjs`.
