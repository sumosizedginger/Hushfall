// A shot is a NOISE: a sleeper inside the gun's noise radius wakes (PT-061: a trailing comment once swallowed the noise call from the fire line, no shot woke anyone, and nothing but a route on Silent Roots noticed: this holds it directly, for every gun and with a mod).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { NOISE, WEAPONS } from '../src/engine/defs.js';
import { addMod } from '../src/engine/mods.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const hall = (x) => ({ format: 1, id: 'N1', version: 1, name: 'N', cellSize: 2, grid: ['#'.repeat(60), ...Array.from({ length: 5 }, () => '#' + '.'.repeat(58) + '#'), '#'.repeat(60)], doors: [], secrets: [], messages: [],
  entities: [{ type: 'player', at: [3, 3], facing: 'east' }, { type: 'exit', at: [58, 3] }, { type: 'enemy', kind: 'tollbearer', at: [x, 3] }] });
test('every gun that fires wakes a sleeper inside its noise radius, and one outside it does not (the scattergun, the rivet driver, the harpoon, the carbine, the flare cannon, and the scattergun with the double barrel)', () => {
  for (const gun of ['flare', 'scattergun', 'rivet', 'harpoon', 'carbine']) for (const mod of gun === 'scattergun' ? [false, true] : [false]) {
    const near = NOISE[gun] - 6, far = NOISE[gun] + 12;
    for (const [d, wakes] of [[near, true], [far, false]]) {
      const cell = 3 + Math.round(d / 2), w = createWorld(parseMap(hall(cell)), { seed: 1, carry: { hp: 100, armor: 0, ammo: { flare: 9, shell: 9, rivet: 99, bolt: 9, round: 99 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'carbine'] } }), e = w.enemies[0];
      Object.assign(w.player, { weapon: gun, switchT: 0, yaw: Math.PI / 2, ads: 0 }); if (mod) addMod(w.player, 'doublebarrel');
      e.sightR = 0.5;                                                                                   // (it cannot SEE the player: only the noise can wake it)
      for (let i = 0; i < 20; i++) { step(w, idle({ fire: i === 0 })); drainEvents(w); }
      assert.equal(e.state !== 'idle', wakes, `${gun}${mod ? ' + double barrel' : ''} at ${d} m (radius ${NOISE[gun]}): ${e.state}`);
    }
  }
  assert.ok(WEAPONS.scattergun && NOISE.scattergun > 0);
});
