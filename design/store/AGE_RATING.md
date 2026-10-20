# Age-rating questionnaire and privacy: draft answers (PT-071, R23). A first draft from what the game contains; the owner answers the real questionnaires (IARC and each store's) and is the one who signs them. Not legal advice.

## What the game contains (checked against the data and the text, 2026-10-20)

| question a questionnaire asks | answer | where it comes from |
|---|---|---|
| Violence | Yes: shooting and melee against hostile creatures. The creatures are alien monsters and people turned into them (the harbour town's own, grafted with bronze bell-chitin); they fall and stay down; some are raised again by another creature. Stylised, painted, low resolution. | the whole game |
| Blood and gore | Blood decals: spatter behind a hit, a pool and a smear where a creature dies; no dismemberment, no exposed viscera, no gore as a reward. | `src/render/decalplace.js` |
| Fear / horror themes | Yes, light to moderate: an eerie tone, people standing frozen in rows, bodies hung in cradles, the dead kept in rows. No jump-scare system; no torture shown. | `design/LORE.md`, the story text |
| Sexual content or nudity | None. | text and art checked |
| Language | None that is profane: the text is plain English; no slurs. One mild exclamation by survivors ("You made it up!"). | `tools/dev/story-stats.mjs` |
| Drugs, alcohol, tobacco | None as a theme; a flask and "oil" appear as items. | text |
| Gambling | None. No simulated gambling, no loot boxes, no random purchases. | -- |
| Online interaction / chat / user content | None. Single player; no network code. | -- |
| In-game purchases or ads | None. | -- |
| Shares the user's location or personal data | No. | see Privacy below |
| Flashing lights | The hurt flash and muzzle light are strong; a setting reduces them and turns the camera shake off (Settings, "Reduce flashing and shaking"). A screen-flash warning on the title is **TO CONFIRM** with a tester who is photosensitive. | `design/ACCESSIBILITY.md` |

A likely rating by the content alone: a teen rating (for example PEGI 12 or 16, ESRB T) for stylised violence and a dark theme. **TO CONFIRM** by the questionnaire itself.

## Privacy, as the game stands

- The game runs entirely in the player's browser. It sends nothing anywhere: no analytics, no telemetry, no account, no server of its own.
- It keeps settings, saves, the Record and (only if the player turns it on) a play log in the browser's local storage on that device. A player clears it by clearing the site's data, or with the Clear button beside the play log setting.
- The **play log** is off by default. When on, it keeps, on the device, what a tester would tell the developer: which maps were played on which difficulty, how each ended, how long it took, damage taken, the frame times it saw and the render width it used, the browser's graphics renderer name, and the answers to five optional questions. It contains no name, no address and no identifier that links it to a person (a random session number only). Nothing leaves the device unless the player presses **Export play log** and sends the file themselves. See `design/store/TESTERS.md`.
- The three.js library is bundled into the game; the build loads nothing from another site (`npm run licences` and `npm run check-dist` check the pages for it).

**TO CONFIRM** with a lawyer before a store page: whether the opt-in play log needs a consent line beyond what the setting says, and what a store's own privacy field requires.
