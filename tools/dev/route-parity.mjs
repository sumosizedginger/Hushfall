// One canonical route, played in the REAL game (headless Chrome, live game page, the dev-only __GAME_TEST__ hook) and in the headless Node sim: do they agree?
// Shared by tools/dev/browser-check.mjs (the Episode 1 routes it has always run) and tools/dev/browser-map.mjs (any map, one command): one implementation, so a new map is
// held to exactly the bar the old ones are.
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';

/**
 * ctx: { T, root, shot? }  (T evaluates in the page; shot(name) saves a screenshot)
 * opts: { shots: take 3 screenshots on a main route, onStep(rr): called after every 90-tick step (HUD observations) }
 * returns { ok, status, failed, ticks, hash, nodeTicks, nodeHash, agree, kills, secrets, wallSeconds, routeOps }
 */
export async function runRouteParity({ T, root, shot = null }, id, name, { shots = false, onStep = null, maxSteps = 1500 } = {}) {
  const gm = loadMapFile(path.join(root, 'maps', id + '.json')), gr = loadRouteFile(path.join(root, 'routes', id + '.' + name + '.route.json'));
  const gn = runRoute(gm, gr, { seed: 1, difficulty: 'normal' });
  await T(`t.newGame('normal', 1, { mapId: '${id}' })`); await T('t.clearOverlays()'); await T(`t.startBot('${id}.${name}')`);
  let rr, lastOp = -1, shotN = 0; const t0 = Date.now(), want = new Set(shots && name === 'main' ? [Math.floor(gr.length * 0.3), Math.floor(gr.length * 0.6), gr.length - 3] : []);
  for (let i = 0; i < maxSteps; i++) {
    rr = await T('t.stepBot(90)');
    if (shot && rr.op !== lastOp && want.has(rr.op) && shotN < 3) { await shot('g2-' + id.toLowerCase() + '-' + name + '-op' + String(rr.op).padStart(2, '0')); shotN++; }
    lastOp = rr.op;
    if (onStep) await onStep(rr);
    if (rr.done || rr.failed || rr.status !== 'playing') break;
  }
  const ok = rr.status === 'complete' && !rr.failed;
  await T('t.clearOverlays()');
  return { ok, status: rr.status, failed: rr.failed, ticks: rr.tick, hash: rr.hash, nodeTicks: gn.ticks, nodeHash: gn.hash, agree: rr.tick === gn.ticks && rr.hash === gn.hash, kills: rr.stats?.kills, secrets: rr.stats?.secrets, wallSeconds: Math.round((Date.now() - t0) / 1000), routeOps: gr.length };
}
