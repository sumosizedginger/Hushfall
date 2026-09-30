// A07b: targeted save/load round trips at the moments the brief asks about: tone pulses in flight, mid-channel Sexton, mid-charge Warden, revived enemy,
// sector mid-move, lights level. The original world's derived nav cache is dropped at the save point (see a06) so only serialised state is compared.
// Run: node review/gate-2/audit/repro/a07b_save_mid_events.mjs
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, step, hashWorld, spawnEnemy, drainEvents } from '../../../../src/engine/world.js';
import { makeSave, parseSave, loadWorld } from '../../../../src/engine/save.js';
import { activateSwitch } from '../../../../src/engine/script.js';
const maps = {}; const loader = (id) => (maps[id] ??= loadMapFile(`maps/${id}.json`));
function roundTrip(name, w, extraTicks = 600) {
  delete w._nav;
  const p = parseSave(JSON.stringify(makeSave(w, 'mid-level'))); if (!p.ok) return console.log(name, 'parse failed', p.reason);
  const L = loadWorld(p.save, loader); if (!L.ok) return console.log(name, 'load failed', L.reason);
  const w2 = L.world; let first = null;
  for (let t = 0; t < extraTicks; t++) { step(w, { move: [0, 0] }); step(w2, { move: [0, 0] }); if (!first && hashWorld(w) !== hashWorld(w2)) first = t + 1; }
  console.log(name.padEnd(46), first ? 'DIVERGES at +' + first : 'identical after ' + extraTicks + ' ticks', '| pulses', w.pulses.length, w2.pulses.length, '| status', w.status, w2.status);
}
// 1. pulses in flight (M08): put the player in the chamber in view of the Cantor
{
  const w = createWorld(loader('C1E1M08'), { seed: 3, difficulty: 'normal' }); const c = w.enemies.find((e) => e.kind === 'cantor');
  w.player.x = c.x; w.player.z = c.z + 12; w.player.y = c.y; w.player.hp = 100000; c.state = 'chase'; c.lastX = w.player.x; c.lastZ = w.player.z;
  for (let i = 0; i < 900 && !(w.pulses.length && w.pulses[0].r > 3); i++) step(w, { move: [0, 0] });
  roundTrip('M08 tone pulse in flight (r=' + (w.pulses[0]?.r ?? 0).toFixed(1) + ')', w);
}
// 2. mid-channel Sexton (M05): kill a tollbearer next to a Sexton in view of the player
{
  const w = createWorld(loader('C1E1M05'), { seed: 2, difficulty: 'normal' }); for (const e of w.enemies) e.state = 'dead', e.dead = 1;
  const s = spawnEnemy(w, 'sexton', 20, 60, 0), t = spawnEnemy(w, 'tollbearer', 21, 62, 0); t.state = 'dead'; t.dead = 1; s.state = 'chase';
  w.player.x = 21; w.player.z = 68; w.player.y = 0; w.player.hp = 100000; s.lastX = 21; s.lastZ = 68;
  let n = 0; for (; n < 300 && !(s.channelT >= 0.5); n++) step(w, { move: [0, 0] });
  roundTrip('M05 Sexton mid-channel (channelT=' + s.channelT.toFixed(2) + ')', w);
}
// 3. Warden mid-charge (M06)
{
  const w = createWorld(loader('C1E1M06'), { seed: 1, difficulty: 'normal' }); for (const e of w.enemies) e.state = 'dead', e.dead = 1;
  const p = w.player; p.x = 70; p.z = 46; p.hp = 100000; p.y = 0; const W = spawnEnemy(w, 'wardengraft', 84, 46, Math.PI / 2); W.state = 'chase'; W.lastX = p.x; W.lastZ = p.z;
  for (let i = 0; i < 400 && !(W.chargeT > 0.9); i++) step(w, { move: [0, 0] });
  roundTrip('M06 Warden mid-charge (chargeT=' + W.chargeT.toFixed(2) + ')', w);
}
// 4. sector mid-move (M06 winch) and lights (M07)
{
  const map = loader('C1E1M06'), w = createWorld(map, { seed: 1, difficulty: 'normal' }); w.player.hp = 100000; activateSwitch(w, map.switches[0]); for (let i = 0; i < 40; i++) step(w, { move: [0, 0] });
  roundTrip('M06 ramp mid-move (h=' + w.sectors[0].h.toFixed(2) + ' -> ' + w.sectors[0].target + ')', w, 900);
}
{
  const w = createWorld(loader('C1E1M07'), { seed: 1, difficulty: 'normal' }); w.player.keys.push('brass'); for (let i = 0; i < 5; i++) step(w, { move: [0, 0] });
  const before = w.ambient; roundTrip('M07 lights action (w.ambient=' + before + ')', w, 300);
}
// 5. revived enemy (Sexton raises a Tollbearer) - run to the revive and beyond
{
  const w = createWorld(loader('C1E1M05'), { seed: 2, difficulty: 'normal' }); for (const e of w.enemies) e.state = 'dead', e.dead = 1;
  const s = spawnEnemy(w, 'sexton', 20, 60, 0), t = spawnEnemy(w, 'tollbearer', 21, 62, 0); t.state = 'dead'; t.dead = 1; s.state = 'chase';
  w.player.x = 21; w.player.z = 68; w.player.hp = 100000; s.lastX = 21; s.lastZ = 68;
  for (let i = 0; i < 1500 && !w.enemies.some((e) => e.revived); i++) step(w, { move: [0, 0] });
  roundTrip('M05 just after a revive (revived=' + w.enemies.filter((e) => e.revived).length + ')', w);
}
