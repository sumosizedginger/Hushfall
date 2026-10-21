# How this game was made, in plain words (for the store forms that ask about AI; PT-071)

Copy from this, do not improve on it. It says what is true. Where a form's boxes do not fit, use the free-text field and paste the "Short version".

## Short version

HUSHFALL was designed and directed by Joseph R Long and built with an AI coding agent (Claude, by Anthropic), which wrote the game's code, its text and the programs that paint and synthesise its art and sound. No image-generation or audio-generation model made any picture or sound in the game: the pictures are painted by programs (p5.js and p5.brush) that the agent wrote, and the sounds are synthesised in the browser by code. No stock, scanned or downloaded art or audio is in it. The only third-party software that ships is three.js (MIT licence). Other AI agents (Google's Gemini, xAI's Grok) were asked to read and test the game and report problems; they did not write any of it.

## By kind of content (what a form such as Steam's "pre-generated content" question wants)

| content | made by | AI-written? |
|---|---|---|
| the program (the game's code, the tools) | the AI agent, under the director's direction and review | **yes** (code assistance) |
| the story and all in-game text (messages, logs, plates, cards, the epilogues) | the AI agent, from a canon the director approved, through editorial passes, and read by two outside AI agents and (before release) a human | **yes: shipped text written by AI** |
| the pictures (textures, creatures, the title art, the cinematics' plates) | baked by programs the AI agent wrote (p5.js, p5.brush), from recipes in the repository: procedural, not produced by an image model | **no image model; the painting programs were written by AI** |
| the sound and the music | synthesised in the browser by code the AI agent wrote (WebAudio), measured by an automatic check | **no audio model; the synthesis code was written by AI** |
| the maps (the level designs) | built with a level kit the AI agent wrote, by the AI agent, checked by automatic play-through gates | **yes** |
| the voice | there is none | no |
| the name, the premise, the direction, every decision of what stays and what goes | Joseph R Long | no |

## What a player can be told on the page

"Made by Joseph R Long with an AI coding agent. Every picture is painted by code and every sound is synthesised in your browser; no image or audio models were used. The story text was written by the AI."

## Why it matters that it is said first

Stores and players are strict about this, and a disclosure you made yourself on day one costs nothing; one a player finds costs a lot. It does not change the licence: the work is Joseph R Long's to publish (`LICENSE`), the third-party notice (`THIRD_PARTY_NOTICES.md`) covers three.js, and whether AI-written material can be copyrighted at all is a legal question that differs by country and is not settled: a lawyer's hour is the right spend before real money depends on it, not before the first release.
