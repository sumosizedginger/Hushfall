// A SAVE FROM AN OLDER BUILD (PT-071, R21 / M3 save compatibility): run this against a checkout of an older tag (a git worktree) and it writes the save that build makes after a stretch of the first level, so that
// tests/save-compat.test.js can prove the CURRENT build still reads what a player of that build left behind. Node only; it imports the engine of the checkout it is run from.
//   git worktree add D:/Doom_rc1 rc1-2026-10-20 ; copy this file into the checkout ; node D:/Doom_rc1/tools/dev/make-save-fixture.mjs D:/Doom/tests/fixtures/save-rc1-mid.json mid-level ; ... save-rc1-start.json level-start ; git worktree remove D:/Doom_rc1
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { createWorld, step } from '../../src/engine/world.js';
import { makeSave, SAVE_VERSION } from '../../src/engine/save.js';
import { InputState } from '../../src/engine/input.js';

const root = path.resolve(import.meta.dirname, '../..'), outFile = path.resolve(process.argv[2] ?? 'save-fixture.json'), kind = process.argv[3] ?? 'mid-level';
const map = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps/C1E1M01.json'), 'utf8')));
const w = createWorld(map, { seed: 7, difficulty: 'normal' }), input = new InputState();
for (let i = 0; i < 900; i++) { const c = input.sample(); c.forward = i % 300 < 200 ? 1 : 0; c.yaw = i % 300 < 200 ? 0 : 0.01; step(w, c); }
const save = makeSave(w, kind, { now: 1760000000000, progress: { version: 1 } });
fs.writeFileSync(outFile, JSON.stringify(save)); console.log(`wrote ${outFile}: save version ${SAVE_VERSION}, ${w.tick} ticks, player at ${w.player.x.toFixed(1)}, ${w.player.z.toFixed(1)}`);
