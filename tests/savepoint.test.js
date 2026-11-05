// PT-086, the owner: "put a save screen on the menu in between levels, so people can stop and pick up at the next level when they have a chance to come
// back". The whole road is played here with the real save code: a level ends, the next level's start is written, the screen reads it back, Continue loads it.
// How the screen looks is not held here: that takes a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createWorld, carryOver, hashWorld } from '../src/engine/world.js';
import { parseMap } from '../src/engine/mapformat.js';
import { SaveStore, loadWorld, makeSave } from '../src/engine/save.js';
import { newProgress } from '../src/engine/progress.js';
import { continueLabel, readSavePoint, savedPageHtml, savedWhereHtml, SAVE_POINT_SLOT } from '../src/game/savepoint.js';
import { UI } from '../src/game/ui.js';
import { standInDom } from './stubs.js';
import { ROOT, flatSource } from './helpers.js';

const load = (id) => parseMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', id + '.json'), 'utf8')));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i],
    get length() {
      return m.size;
    },
  };
};
/** what the shell does when a level ends: the next level's start, carrying what the player holds, goes to the slot Continue reads */
function finishInto(store, fromId, nextId, { difficulty = 'easy', progress = newProgress(), shape = null } = {}) {
  const done = createWorld(load(fromId), { seed: 4, difficulty });
  if (shape) shape(done);
  const next = createWorld(load(nextId), { seed: 5, difficulty, carry: carryOver(done), choices: progress.choices ?? null });
  store.write(SAVE_POINT_SLOT, makeSave(next, 'level-start', { now: 1762300000000, progress }));
  return { done, next };
}

test('what is saved between levels is what Continue loads: the next map, the difficulty, the health, the guns and the salvage', () => {
  const store = new SaveStore(memory());
  const { next } = finishInto(store, 'C1E1M01', 'C1E1M02', {
    progress: { ...newProgress(), salvage: 7 },
    shape: (w) => {
      w.player.hp = 63;
      w.player.armor = 12;
      w.player.weapons = [...new Set([...w.player.weapons, 'scattergun'])];
      w.player.ammo.shell = 9;
    },
  });
  const r = store.read('auto');
  assert.equal(r.ok, true);
  assert.equal(r.save.kind, 'level-start', 'a level start: no half-played world in it');
  const back = loadWorld(r.save, (id) => (id === 'C1E1M02' ? load(id) : null));
  assert.equal(back.ok, true);
  assert.equal(hashWorld(back.world), hashWorld(next), 'Continue builds the same world, bit for bit');
  assert.equal(back.world.mapId, 'C1E1M02');
  assert.equal(back.world.difficulty, 'easy');
  assert.equal(back.world.player.hp, next.player.hp, "what you carry, with the level's own loadout as a floor under it");
  assert.equal(back.world.player.armor, next.player.armor);
  assert.deepEqual(back.world.player.ammo, next.player.ammo);
  assert.ok(back.world.player.weapons.includes('scattergun'));
  assert.ok(back.world.player.ammo.shell >= 9);

  const seen = readSavePoint({ store, nextId: 'C1E1M02', maps: { C1E1M02: load('C1E1M02') }, manifest });
  assert.equal(seen.ok, true);
  assert.equal(seen.info.name, load('C1E1M02').name);
  assert.equal(seen.info.difficulty.name, 'Easy');
  assert.equal(seen.info.you.hp, Math.ceil(next.player.hp));
  assert.ok(
    seen.info.arms.some((a) => a.ammo?.have === next.player.ammo.shell),
    'the shells it holds',
  );
  assert.equal(seen.info.campaignRun.salvage, 7);
  assert.equal(seen.savedAt, 1762300000000);
});

test('the choice a player made survives the stop: the gate taken in C2M11 is still known in C2M12', () => {
  const store = new SaveStore(memory()),
    progress = { ...newProgress(), choices: { gate: 'east' } };
  const { next } = finishInto(store, 'C2M11', 'C2M12', { progress });
  const back = loadWorld(store.read('auto').save, () => load('C2M12'));
  assert.deepEqual(back.world.choices, { gate: 'east' }, 'it used to come back with no choices at all');
  assert.equal(hashWorld(back.world), hashWorld(next));
  // a save with no choices is untouched: no field appears
  const plain = new SaveStore(memory());
  finishInto(plain, 'C2M11', 'C2M12');
  assert.ok(!('choices' in loadWorld(plain.read('auto').save, () => load('C2M12')).world));
});

test('a mid-level save still loads as it did: the choices in it are its own', () => {
  const map = load('C2M12'),
    w = createWorld(map, { seed: 5, difficulty: 'normal', choices: { gate: 'west' } });
  const back = loadWorld(
    JSON.parse(JSON.stringify(makeSave(w, 'mid-level', { now: 1, progress: { ...newProgress(), choices: { gate: 'west' } } }))),
    () => map,
  );
  assert.equal(back.ok, true);
  assert.deepEqual(back.world.choices, { gate: 'west' });
  // and a level whose map changed goes back to its start with the choices, not without them
  const old = JSON.parse(JSON.stringify(makeSave(w, 'mid-level', { now: 1, progress: { ...newProgress(), choices: { gate: 'west' } } })));
  old.campaign.mapVersion = -1;
  const fell = loadWorld(old, () => map);
  assert.match(fell.degraded, /map-changed/);
  assert.deepEqual(fell.world.choices, { gate: 'west' });
});

test('the screen never says saved when it is not: nothing there, another map, a broken save, a map that will not load', () => {
  const maps = { C1E1M02: load('C1E1M02') };
  const empty = new SaveStore(memory());
  assert.equal(readSavePoint({ store: empty, nextId: 'C1E1M02', maps, manifest }).ok, false);
  const other = new SaveStore(memory());
  finishInto(other, 'C1E1M02', 'C1E1M03');
  const wrong = readSavePoint({ store: other, nextId: 'C1E1M02', maps, manifest });
  assert.equal(wrong.ok, false);
  assert.match(wrong.why, /C1E1M03/);
  const s = memory(),
    broken = new SaveStore(s);
  finishInto(broken, 'C1E1M01', 'C1E1M02');
  s.setItem('hushfall.save.auto', '{ not json');
  assert.equal(readSavePoint({ store: broken, nextId: 'C1E1M02', maps, manifest }).ok, false);
  const gone = new SaveStore(memory());
  finishInto(gone, 'C1E1M01', 'C1E1M02');
  assert.equal(readSavePoint({ store: gone, nextId: 'C1E1M02', maps: {}, manifest }).ok, false);
});

test('the page says where you pick up and what you carry, in escaped text, and a key is not among it', () => {
  const store = new SaveStore(memory());
  finishInto(store, 'C1E1M01', 'C1E1M02');
  const seen = readSavePoint({ store, nextId: 'C1E1M02', maps: { C1E1M02: load('C1E1M02') }, manifest });
  const page = savedPageHtml(seen);
  for (const want of ['Picks up at', 'You carry', 'Arms', 'The campaign so far', 'Where it is kept', seen.info.name, 'Health', 'this browser on this computer'])
    assert.ok(page.includes(want), want);
  assert.ok(!page.includes('>Keys<'), 'a key never carries into the next map');
  const nasty = savedWhereHtml({ ...seen.info, name: '<img src=x>' });
  assert.ok(!nasty.includes('<img'));
});

test('Continue says where it will put you', () => {
  const store = new SaveStore(memory());
  finishInto(store, 'C1E1M01', 'C1E1M02', { difficulty: 'hard' });
  assert.equal(continueLabel(store.read('auto').save, manifest), `Continue: ${load('C1E1M02').name}, Hard`);
  assert.equal(continueLabel(null, manifest), 'Continue');
  assert.equal(continueLabel({}, manifest), 'Continue');
  assert.match(continueLabel({ campaign: { mapId: 'C1E1M02', difficulty: 'nonsense' } }, manifest), /nonsense$/, 'a strange save does not break the title');
});

test('the screen itself: saved and not saved, through the real UI class on a stand-in page', () => {
  standInDom(); // (it sets globalThis.document, and is left in place: the UI's timers may fire after a test body has ended)
  const ui = new UI(new Proxy({}, { get: () => () => {} }));
  const $ = (id) => globalThis.document.getElementById(id);
  const store = new SaveStore(memory());
  finishInto(store, 'C1E1M01', 'C1E1M02');
  const result = readSavePoint({ store, nextId: 'C1E1M02', maps: { C1E1M02: load('C1E1M02') }, manifest });
  ui.show('saved', { result, nextName: 'Customs Hall' });
  assert.equal($('saved-title').textContent, 'SAVED');
  assert.equal($('btn-saved-next').textContent, 'Keep playing: Customs Hall');
  assert.equal($('btn-saved-quit').textContent, 'Quit to title');
  assert.equal($('btn-saved-retry').style.display, 'none');
  assert.ok($('saved-info').innerHTML.includes('Picks up at'));
  ui.show('saved', { result: { ok: false, why: 'the quota is full' }, nextName: 'Customs Hall' });
  assert.equal($('saved-title').textContent, 'NOT SAVED');
  assert.match($('saved-line').textContent, /the quota is full/);
  assert.equal($('btn-saved-quit').textContent, 'Quit to title without saving');
  assert.equal($('btn-saved-retry').style.display, '');
  assert.equal($('saved-info').innerHTML, '');
});

test('the shell: the button is on the intermission, Enter on it saves instead of skipping it, and Continue from it is a fresh start of the level', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const id of [
    'btn-savepoint',
    'screen-saved',
    'saved-title',
    'saved-where',
    'saved-line',
    'saved-info',
    'btn-saved-quit',
    'btn-saved-next',
    'btn-saved-retry',
    'btn-saved-back',
  ])
    assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(!html.includes('id="btn-title"'), 'one way to stop here, and it says it saved');
  const main = flatSource('src/game/main.js'),
    ui = flatSource('src/game/ui.js');
  assert.ok(ui.includes("$('btn-savepoint').style.display = data.hasNext"), 'no save offered with no next map (a replay, the end of the game)');
  assert.ok(main.includes("if (g.mode !== 'complete' || !g.nextId) return;"), 'nothing saved from a replay');
  assert.ok(main.includes("atStart: save.kind === 'level-start'"), "Continue from a level's start is that level's start: its title card, no old checkpoint");
  assert.ok(main.includes("closest?.('button, input, select, summary')"), 'Enter on a focused button presses that button, not "next level"');
  assert.ok(!ui.includes('not built yet') && !ui.includes('levels built so far'), 'the last screen of the game does not say it is unfinished');
});
