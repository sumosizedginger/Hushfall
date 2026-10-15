// GEMINI ATTACK FUZZER: Dry Feed Stranding Non-Flare Players
import fs from 'node:fs';
import { createWorld, step } from '../../../src/engine/world.js';
import { parseMap } from '../../../src/engine/mapformat.js';

console.log('=== GEMINI FUZZER: Dry Feed Non-Flare Stranding Probe ===');

const map = parseMap(JSON.parse(fs.readFileSync('tests/fixtures/C1E1M01.json', 'utf8')));
const w = createWorld(map);

// Player carries carbine and harpoon, but NOT flare
w.player.weapons = ['carbine', 'harpoon', 'fists'];
w.player.weapon = 'carbine';
w.player.ammo = { round: 0, bolt: 0, flare: 0 };

console.log('Initial setup: player weapons =', w.player.weapons, 'ammo =', w.player.ammo);

// Run 1250 ticks (two dryFeed intervals of 600 ticks)
for (let t = 0; t < 1250; t++) {
  step(w, { move: [0, 0] });
}

console.log('After 1250 ticks:');
console.log('Player ammo:', w.player.ammo);
console.log('Player owns flare gun?', w.player.weapons.includes('flare'));
console.log('Player has usable ammunition for carried guns?', (w.player.ammo.round > 0 || w.player.ammo.bolt > 0));
console.log('Player stranded with useless ammo:', w.player.ammo.flare > 0 && !w.player.weapons.includes('flare') && w.player.ammo.round === 0);
