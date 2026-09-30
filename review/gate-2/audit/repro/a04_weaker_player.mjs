// A04: how fragile are the bot-tuned maps against a slightly worse player? Runs each canonical main route with (a) 30% less ammo (start loadout and every
// ammo pickup), (b) aim tremor while firing (gaussian-ish +-0.03 rad added to yaw and pitch on every fire tick; the bot's own aim is perfect), (c) both,
// on normal and hard. Every variant goes through the same InputState path as the bot always did; only the input stream is degraded.
// Run: node review/gate-2/audit/repro/a04_weaker_player.mjs
import fs from 'node:fs';
import { loadMapFile, loadRouteFile } from '../../../../src/engine/harness.js';
import { createWorld, step } from '../../../../src/engine/world.js';
import { InputState } from '../../../../src/engine/input.js';
import { Bot } from '../../../../src/engine/bot.js';
import { PICKUPS } from '../../../../src/engine/defs.js';
const ORIG = Object.fromEntries(Object.entries(PICKUPS).map(([k, v]) => [k, v.amount]));
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function play(id, difficulty, { ammoMult = 1, tremor = 0, seed = 1 }) {
  for (const [k, v] of Object.entries(PICKUPS)) if (v.type === 'ammo' || v.type === 'weapon') v.amount = Math.max(1, Math.round(ORIG[k] * ammoMult));
  const map = loadMapFile(`maps/${id}.json`), route = loadRouteFile(`routes/${id}.main.route.json`);
  const carry = map.entryLoadout ? { ...map.entryLoadout, ammo: Object.fromEntries(Object.entries(map.entryLoadout.ammo).map(([k, v]) => [k, Math.max(1, Math.round(v * ammoMult))])) } : null;
  const w = createWorld(map, { seed, difficulty, carry }), input = new InputState(), bot = new Bot(w, input, route), rnd = mulberry(seed * 977 + id.length);
  const sample = input.sample.bind(input);
  input.sample = () => { const c = sample(); if (tremor && c.fire) { c.yaw += (rnd() + rnd() + rnd() - 1.5) * tremor; c.pitch += (rnd() + rnd() + rnd() - 1.5) * tremor; } return c; };
  let ticks = 0, minHp = 100;
  while (!bot.done && !bot.failed && w.status === 'playing' && ticks < 60 * 60 * 6) { bot.tick(); step(w, input.sample()); ticks++; minHp = Math.min(minHp, w.player.hp); }
  const r = w.status === 'complete' ? 'complete' : w.status === 'dead' ? 'DEAD' : bot.failed ? 'BOT-FAILED(' + bot.failed.slice(0, 40) + ')' : 'other';
  return { r, s: Math.round(ticks / 60), dmg: w.stats.damageTaken, minHp, shots: w.stats.shots };
}
const variants = { 'baseline': {}, '-30% ammo': { ammoMult: 0.7 }, 'aim tremor 0.03': { tremor: 0.03 }, '-30% ammo + tremor': { ammoMult: 0.7, tremor: 0.03 } };
for (const id of ['C1E1M02', 'C1E1M03', 'C1E1M04', 'C1E1M05', 'C1E1M06', 'C1E1M07', 'C1E1M08']) {
  for (const difficulty of ['normal', 'hard']) {
    const line = Object.entries(variants).map(([n, o]) => { const x = play(id, difficulty, o); return `${n}: ${x.r} dmg ${x.dmg} minHP ${x.minHp} shots ${x.shots}`; }).join(' | ');
    console.log(id, difficulty.padEnd(6), line);
  }
}
for (const [k, v] of Object.entries(PICKUPS)) if (v.type === 'ammo' || v.type === 'weapon') v.amount = ORIG[k];
