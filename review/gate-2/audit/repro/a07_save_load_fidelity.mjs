// A07: save/load fidelity on the shipped maps. Play the canonical route to tick N, take a REAL mid-level save (makeSave -> JSON text -> parseSave -> loadWorld),
// then advance the original and the loaded world by the same idle inputs and compare state hashes. Resume must equal uninterrupted play.
// Run: node review/gate-2/audit/repro/a07_save_load_fidelity.mjs
import fs from 'node:fs';
import { loadMapFile, loadRouteFile } from '../../../../src/engine/harness.js';
import { createWorld, step, hashWorld } from '../../../../src/engine/world.js';
import { InputState } from '../../../../src/engine/input.js';
import { Bot } from '../../../../src/engine/bot.js';
import { makeSave, parseSave, loadWorld } from '../../../../src/engine/save.js';
const maps = {}; const loader = (id) => (maps[id] ??= loadMapFile(`maps/${id}.json`));
let bad = 0, total = 0;
for (const id of ['C1E1M02', 'C1E1M03', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08']) {
  const map = loader(id), route = loadRouteFile(`routes/${id}.main.route.json`);
  for (const N of [900, 2400, 4200, 6000]) {
    const w = createWorld(map, { seed: 1, difficulty: 'normal' }), input = new InputState(), bot = new Bot(w, input, route);
    for (let i = 0; i < N && w.status === 'playing' && !bot.done; i++) { bot.tick(); step(w, input.sample()); }
    if (w.status !== 'playing') continue;
    const txt = JSON.stringify(makeSave(w, 'mid-level'));
    const p = parseSave(txt); if (!p.ok) { console.log(id, N, 'parseSave failed', p.reason); bad++; continue; }
    const L = loadWorld(p.save, loader); if (!L.ok) { console.log(id, N, 'loadWorld failed', L.reason); bad++; continue; }
    const w2 = L.world, h0 = hashWorld(w), h1 = hashWorld(w2);
    const idle = { move: [0, 0] };
    let firstDiff = null;
    for (let t = 0; t < 900; t++) { step(w, idle); step(w2, idle); if (!firstDiff && hashWorld(w) !== hashWorld(w2)) firstDiff = t + 1; }
    total++;
    const same = hashWorld(w) === hashWorld(w2);
    if (!same || h0 !== h1) bad++;
    console.log(id, 'tick', N, 'hash at save equal:', h0 === h1, '| after 900 idle ticks equal:', same, firstDiff ? '(first divergence at +' + firstDiff + ' ticks)' : '', '| hp', w.player.hp, w2.player.hp, 'enemies awake', w.enemies.filter((e) => e.state === 'chase').length);
  }
}
console.log('checkpoints compared:', total, 'divergent:', bad);
