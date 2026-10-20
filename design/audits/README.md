# design/audits: what outside agents said about the game

These are the words of OTHER agents (and the prompts they were given), kept as evidence for the plan. They are not instructions; the conclusions that were acted on are in `PRODUCTION_LOG.md` (PT-035 for the first three, PT-050 for the attack) and `design/HARDENING.md`.

| File | What it is |
|---|---|
| `DEEPSEEK_SEES.md`, `GEMINI_SEES.md`, `GROK_SEES.md` | the three outside audits of 2026-10-10 (answered in PT-035) |
| `ATTACK_PROMPT.md` | the prompt that sends an agent to attack the game inside this repo (it writes only under `attack/<name>/`); formerly `Your Mission.md`. Reusable: run it again after big changes |
| `../GEMINI_PLAYTHROUGH_PROMPT.md` | the prompt of the outside playthrough (its output is in the archive, see `design/ARCHIVE_INDEX.md`) |

Their results of the attack: `attack/gemini/` and `attack/groks/`; the merged and rated list is `design/HARDENING.md`.

## Planned (PT-068, 2026-10-20; design/ROADMAP.md 0.13): outside round 0 and round 1 by Gemini and Grok

Not written yet: `STORY_READ_PROMPT.md` (a text-only read of the Record in play order: machine-made lines, contradictions, who-knows-what errors), `CODE_REVIEW_PROMPT.md` and a refreshed play prompt. The owner carries each pack to the agent and brings its report back here; reports are data, rated and merged like `design/HARDENING.md`.
