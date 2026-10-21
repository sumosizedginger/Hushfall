// Read-only reproductions for the audit. Synthetic saves and temporary builds only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createWorld, step } from '../../src/engine/world.js';
import { makeSave, parseSave, loadWorld, SaveStore } from '../../src/engine/save.js';
import { loadMap, mapLoader } from '../../tests/helpers.js';
import { checkDist } from '../../tools/dev/check-dist.mjs';
import { runRoute } from '../../src/engine/harness.js';
import { shippedMap, shippedRoute } from '../../tests/helpers.js';
import { CommsQueue } from '../../src/game/commsqueue.js';

const out = { saves: [] }, idle = { move: [0, 0], yaw: 0, pitch: 0, fire: false, use: false };
for (const key of ['projectiles', 'enemyShots', 'doors']) {
  const save = makeSave(createWorld(loadMap(), { seed: 1 }), 'mid-level');
  if (key === 'doors') save.world.doors[0] = null; else save.world[key] = [null];
  const parsed = parseSave(JSON.stringify(save)), loaded = parsed.ok ? loadWorld(parsed.save, mapLoader) : parsed;
  let error = null; if (loaded.ok) try { step(loaded.world, idle); } catch (e) { error = e.message; }
  out.saves.push({ changed: key, accepted: loaded.ok, nextTickError: error });
}
const store = new SaveStore({ setItem() { throw new Error('QuotaExceededError'); } });
try { store.write('auto', makeSave(createWorld(loadMap()), 'level-start')); } catch (e) { out.storageWriteError = e.message; }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hushfall-check-dist-'));
try {
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<link rel="stylesheet" href="./assets/style.css">');
  fs.writeFileSync(path.join(dir, 'assets/style.css'), 'body { background: url(./missing.png); }');
  out.missingCssAsset = { problems: checkDist(dir).problems };
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
// A supported setting disables cinematics. In that case real-time playback at 60 Hz has this queue budget.
const run = runRoute(shippedMap('C2M30'), shippedRoute('C2M30.main'), { seed: 1, difficulty: 'normal' });
const messages = run.events.filter((e) => e.type === 'message'), queue = new CommsQueue(), shown = [];
queue.blockUntil(6300); let next = 0;
for (let tick = 0; tick <= run.ticks; tick++) {
  const now = tick / 60 * 1000;
  while (next < messages.length && messages[next].tick <= tick) queue.push(messages[next++]);
  const result = queue.update(now); if (result.show) shown.push(result.show.id);
}
out.finalMapComms = { result: run.result, ticks: run.ticks, seconds: run.ticks / 60, emitted: messages.length, startedDisplaying: shown.length, pending: queue.pending, shown };
console.log(JSON.stringify(out, null, 2));
