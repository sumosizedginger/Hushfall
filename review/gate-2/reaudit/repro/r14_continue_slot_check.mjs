// R14: does the browser check that claims to prove audit A18 ('Continue loads the newest save, not an older quick save') actually exercise the bug?
// tools/dev/browser-check.mjs (section 2c) does:  t.newGame(M02); t.tick(30); t.saveSlot('quick'); sleep; t.newGame(M06); pause; Quit; Continue; expect C1E1M06.
// src/game/testhook.js defines   saveSlot: (slot) => store.read(slot)   i.e. saveSlot READS a slot, it does not write one (t.save() is the writer: app.quickSave()).
// So the 'quick' slot is never written in that check. This script replays the check's slot operations against the real SaveStore and the two loadFirstSave variants
// (old: quick before auto; new: newest savedAt first), once as the check is written (quick never written) and once as the bug scenario needs (quick really written).
// Run from repo root: node review/gate-2/reaudit/repro/r14_continue_slot_check.mjs
import fs from 'node:fs';
import { SaveStore, makeSave } from '../../../../src/engine/save.js';
import { createWorld } from '../../../../src/engine/world.js';
import { loadMapFile } from '../../../../src/engine/harness.js';
const tv = fs.readFileSync('src/game/testhook.js', 'utf8'), mn = fs.readFileSync('src/game/main.js', 'utf8'), bc = fs.readFileSync('tools/dev/browser-check.mjs', 'utf8');
console.log('testhook.js saveSlot:', (tv.match(/saveSlot:[^\n]*/) || ['(missing)'])[0].trim());
console.log("browser-check.mjs uses:", (bc.match(/t\.saveSlot\('quick'\)/) ? "t.saveSlot('quick') (a read)" : '?'), '| the writer would be t.save():', /t\.save\(\)/.test(bc) ? 'used somewhere' : 'not used in the check');
console.log('main.js loadFirstSave sorts by savedAt:', /sort\(\(a, b\) => \(b\[1\]\.save\.savedAt/.test(mn));
const mem = () => { const d = new Map(); return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: (k) => d.delete(k) }; };
const first = (store, order) => { const slots = order.map((s) => [s, store.read(s)]).filter(([, r]) => r.ok); return slots.length ? slots[0] : null; };
const oldPick = (store) => first(store, ['quick', 'auto']);
const newPick = (store) => { const s = ['quick', 'auto'].map((slot) => [slot, store.read(slot)]).filter(([, r]) => r.ok).sort((a, b) => (b[1].save.savedAt ?? 0) - (a[1].save.savedAt ?? 0)); return s[0] ?? null; };
const scenario = (writeQuick) => {
  const store = new SaveStore(mem()); const m2 = loadMapFile('maps/C1E1M02.json'), m6 = loadMapFile('maps/C1E1M06.json');
  store.write('auto', makeSave(createWorld(m2, { seed: 1 }), 'level-start', { now: 1000 }));                        // newGame(M02)
  if (writeQuick) store.write('quick', makeSave(createWorld(m2, { seed: 1 }), 'mid-level', { now: 2000 }));        // a real quick save at tick 30
  else store.read('quick');                                                                                          // what t.saveSlot('quick') does
  store.write('auto', makeSave(createWorld(m6, { seed: 2 }), 'level-start', { now: 3000 }));                        // newGame(M06) rewrites the auto slot, newer
  return [oldPick(store)?.[1].save.campaign.mapId, newPick(store)?.[1].save.campaign.mapId];
};
const a = scenario(false), b = scenario(true);
console.log(`as the browser check is written (quick never written): old code -> ${a[0]}, new code -> ${a[1]}   => the check passes on BOTH, it cannot tell the bug from the fix`);
console.log(`with the quick slot really written (the audit's A18 scenario): old code -> ${b[0]}, new code -> ${b[1]}   => only this scenario discriminates`);
