// FREEZE F9, the plates of the two epilogues: Campaign One's first three cards sit on the coast and the rest on the Gate's doorway; Campaign Two's first four cards sit on the door with the lamp still dark and the rest on the plate where it is lit. The paintings are
// baked (tools/baker/recipes_f9.js); the game never depends on the bake (the URL helpers fall back to the older plates). Scene stings: the four scenes that have a sound to make already have one, and the two that are silent are silent on purpose (below).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ENDINGS } from '../src/game/ending.js';
import { SCENES } from '../src/game/scenes.js';
import { ROOT } from './helpers.js';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('Campaign One: the coast behind the first three cards, the Gate behind the rest; Campaign Two: the dark lamp behind the first four, the lit one behind the rest', () => {
  const arts = (n) => ENDINGS[n].cards.map((c) => c.art ?? '');
  assert.deepEqual(arts(1), ['coast', 'coast', 'coast', '', '', '', '']); assert.deepEqual(arts(2), ['lampdark', 'lampdark', 'lampdark', 'lampdark', '', '', '', '', '']);
});

test('the first card that says the lamp is lit is the first card on the lit plate', () => {
  const cards = ENDINGS[2].cards, lit = cards.findIndex((c) => /hangs the lamp on the hook and lights it/.test(c.text)); assert.ok(lit > 0 && cards[lit].art == null && cards[lit - 1].art === 'lampdark', 'the lamp is hung and lit on card ' + lit);
});

test('the shell maps both keys to their plates and fetches them at start; the URL helpers fall back to older plates; both recipes are registered at 320 x 200', () => {
  const main = read('src/game/main.js'), tex = read('src/render/textures.js'), all = read('tools/baker/all.js'), rec = read('tools/baker/recipes_f9.js');
  assert.match(main, /key === 'coast' \? endingCoastUrl\(\)/); assert.match(main, /key === 'lampdark' \? endingLampDarkUrl\(\)/); assert.match(main, /new Image\(\)\.src = u/);
  assert.match(tex, /endingCoastUrl = \(\) => URL_BY_NAME\.ui_ending_coast \?\? URL_BY_NAME\.ui_ending_art/); assert.match(tex, /endingLampDarkUrl = \(\) => URL_BY_NAME\.ui_ending_lamp_dark \?\? URL_BY_NAME\.ui_ending_art_2/);
  assert.match(all, /recipesF9/); for (const id of ['ui_ending_coast', 'ui_ending_lamp_dark']) assert.match(rec, new RegExp(id + ': \\{\\s+seed: \\d+, width: 320, height: 200'));
});

test('scene stings: every scene that has a sound to make makes one at its start, and the two silent scenes (the Bell stops, the Unrung Gate) are silent on purpose', () => {
  const cue = (s) => s.actions.find((a) => a.cue)?.cue; const sound = SCENES.filter((s) => cue(s)).map((s) => s.id), silent = SCENES.filter((s) => !cue(s)).map((s) => s.id);
  assert.deepEqual(sound.sort(), ['deep-gate', 'gate-open', 'hive-cantor', 'threshold']); assert.deepEqual(silent.sort(), ['bell-stops', 'the-gate']);
  for (const s of SCENES.filter((q) => cue(q))) assert.ok(s.actions.find((a) => a.cue).t <= 0.5, s.id + ' sounds in the first half second');
  assert.match(read('design/LORE.md'), /silen/i, 'the lore says why the Bell stopping and the silent walk make no sound');
});
