// PT-083 D4: a boss's every attack can be seen coming, and there is a way to hurt it that the game tells you. The fights themselves are held on all three difficulties by the map gates.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ENEMIES } from '../src/engine/defs.js';
import { ROOT, flatSource } from './helpers.js';

const BOSSES = Object.entries(ENEMIES).filter(([, d]) => d.boss);

test('there are seven bosses, and each has a map', () => {
  assert.equal(BOSSES.length, 7);
  const maps = fs.readdirSync(path.join(ROOT, 'maps')).map((f) => fs.readFileSync(path.join(ROOT, 'maps', f), 'utf8'));
  for (const [k] of BOSSES)
    assert.ok(
      maps.some((t) => t.includes(`"${k}"`)),
      k,
    );
});

test('every attack of a boss has a windup long enough to read (half a second at the least)', () => {
  for (const [k, d] of BOSSES) {
    const seen = [];
    if (d.attack) {
      const wu = d.attack.duration ? d.attack.windup * d.attack.duration : d.attack.windup;
      if (Number.isFinite(wu)) seen.push(['blow', wu]);
    }
    if (d.pulse?.windup) seen.push(['ring', d.pulse.windup]);
    if (d.charge?.windup) seen.push(['charge', d.charge.windup]);
    if (d.sweep?.tell) seen.push(['sweep', d.sweep.tell]);
    if (d.hive?.windup) seen.push(['ring', d.hive.windup]);
    assert.ok(seen.length, k + ' has an attack');
    for (const [what, t] of seen) assert.ok(t >= 0.5, `${k}'s ${what} comes in ${t} s`);
  }
});

test('the boss bar says in words what is keeping a shielded boss alive', () => {
  const ui = flatSource('src/game/ui.js');
  assert.ok(ui.includes("$('boss-note')"), 'the note under the bar');
  for (const [k, d] of BOSSES.filter(([, q]) => q.shield || q.unison)) assert.ok(d.shield?.reduce != null || d.unison, k);
});

test('a boss staggers or opens: each has a window', () => {
  for (const [k, d] of BOSSES) assert.ok(d.stagger != null || d.unison || d.bell, k + ' has a window');
});
