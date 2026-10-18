# attack/: hostile testing of the game

Two outside agents attacked the game on 2026-10-14 using `design/audits/ATTACK_PROMPT.md`. Each has its own folder; nothing outside `attack/` was changed by them.

| Folder | Who | What is in it |
|---|---|---|
| `gemini/` | Gemini | `REPORT.md`, `IDEAS.md`, `fuzz/` (9 scripts), `tests/` (12 DEMONSTRATION tests: they PASS while the bug exists and will fail when it is fixed) |
| `groks/` | Grok | `REPORT.md`, `IDEAS.md`, `fuzz/` (12 scripts, raw outputs in `fuzz/out/`), `regress/save-shape.test.js` (16 contract tests: they FAIL now and must go green) |

The merged, rated list with the place of every fix in the work queue is `design/HARDENING.md`. Read that first.

Run (node only, no browser, from the repo root):

    node attack/gemini/fuzz/fuzz_void_softlock.mjs
    node --test attack/gemini/tests/repro_gemini.test.js attack/gemini/tests/leak_gemini.test.js
    node --test attack/groks/regress/save-shape.test.js

Rules for the next attacker: write only inside `attack/<your name>/`, keep a tester build in `attack/<name>/dist` (git-ignored), do not run the full `npm test`, no desktop or mouse control, headless browsers only with the owner's yes for that job.

Status 2026-10-18: Grok's regress file now passes except three tests whose assertions demanded that a damaged save LOAD (the permanent version is `tests/hardening-saves.test.js`); two of Gemini's demonstration tests (GEMINI-02, GEMINI-10) fail on purpose because those bugs are fixed.
