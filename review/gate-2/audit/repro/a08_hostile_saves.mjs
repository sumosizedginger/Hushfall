// A08: hostile / malformed saves against parseSave + loadWorld + step. Reports what throws (uncaught in the API) or is accepted and then breaks the sim.
// Run: node review/gate-2/audit/repro/a08_hostile_saves.mjs
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, step } from '../../../../src/engine/world.js';
import { makeSave, parseSave, loadWorld, SAVE_VERSION } from '../../../../src/engine/save.js';
const maps = {}; const loader = (id) => (id in { C1E1M06: 1, C1E1M08: 1 } ? (maps[id] ??= loadMapFile(`maps/${id}.json`)) : null);
const good = () => JSON.parse(JSON.stringify(makeSave(createWorld(loader('C1E1M06'), { seed: 1 }), 'mid-level')));
const cases = {
  'baseline (valid)': (s) => s,
  'difficulty: "godmode"': (s) => { s.campaign.difficulty = 'godmode'; return s; },
  'difficulty missing': (s) => { delete s.campaign.difficulty; return s; },
  'seed is a string': (s) => { s.campaign.seed = 'abc'; return s; },
  'mapVersion equal, world = {}': (s) => { s.world = {}; return s; },
  'world.enemies = null': (s) => { s.world.enemies = null; return s; },
  'world.sectors missing': (s) => { delete s.world.sectors; return s; },
  'world.player.hp = "lots" (string)': (s) => { s.world.player.hp = 'lots'; return s; },
  'world.player.x = null': (s) => { s.world.player.x = null; return s; },
  'player.hp = 1e309 (Infinity via JSON text)': (s) => s,
  'enemy with unknown kind': (s) => { s.world.enemies.push({ id: 999, kind: 'dragon', x: 1, z: 1, state: 'chase' }); return s; },
  'enemy x = null (NaN after math)': (s) => { s.world.enemies[0].x = null; return s; },
  'world.status = "complete" injected': (s) => { s.world.status = 'complete'; return s; },
  'world.mapId != campaign.mapId (M08 world inside M06 save)': (s) => { s.world.mapId = 'C1E1M08'; return s; },
  'campaign.mapId = M08 but world is M06 (sectors mismatch)': (s) => { s.campaign.mapId = 'C1E1M08'; s.campaign.mapVersion = 1; return s; },
  'sector id unknown': (s) => { s.world.sectors = [{ id: 'nope', h: 0, target: 9, speed: 1 }]; return s; },
  'triggerState missing an id': (s) => { s.world.triggerState = {}; return s; },
  'pulses = "x"': (s) => { s.world.pulses = 'x'; return s; },
  'ambient = "dark"': (s) => { s.world.ambient = 'dark'; return s; },
  'huge explored array': (s) => { s.world.explored = new Array(5).fill(1); return s; },
  'version 7 with no world.pulses (valid old save)': (s) => { s.version = 7; delete s.world.pulses; return s; },
};
for (const [name, mut] of Object.entries(cases)) {
  let text = JSON.stringify(mut(good()));
  if (name.startsWith('player.hp = 1e309')) text = text.replace(/"hp":100/, '"hp":1e309');
  let outcome = '';
  try {
    const p = parseSave(text); if (!p.ok) { outcome = 'parseSave rejects: ' + p.reason; }
    else {
      let L; try { L = loadWorld(p.save, loader); } catch (e) { outcome = 'loadWorld THROWS: ' + e.message.slice(0, 80); }
      if (L) { if (!L.ok) outcome = 'loadWorld rejects: ' + L.reason; else {
        const w = L.world; let bad = null;
        try { for (let i = 0; i < 120; i++) step(w, { move: [0, 1] }); const nan = JSON.stringify(w).includes('null,') && /"(x|z|hp)":null/.test(JSON.stringify(w)); bad = nan ? 'state has null/NaN numbers after 120 ticks' : null; } catch (e) { bad = 'step THROWS: ' + e.message.slice(0, 80); }
        outcome = 'loaded ' + (L.degraded ? '(degraded: ' + L.degraded + ') ' : '') + (bad ? '-> ' + bad : '-> plays 120 ticks (status ' + w.status + ', hp ' + w.player?.hp + ')'); } }
    }
  } catch (e) { outcome = 'parseSave THROWS: ' + e.message.slice(0, 80); }
  console.log(name.padEnd(58), outcome);
}
