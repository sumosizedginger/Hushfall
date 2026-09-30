// Headless play harness: world + input layer + bot, stepped exactly like the game loop does. Used by tests and evidence tools.
import fs from 'node:fs';
import { createWorld, step, drainEvents, hashWorld } from './world.js';
import { InputState } from './input.js';
import { Bot } from './bot.js';
import { parseMap } from './mapformat.js';

export const loadMapFile = (file) => parseMap(JSON.parse(fs.readFileSync(file, 'utf8')));
export const loadRouteFile = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** a small deterministic generator for degraded-play inputs (kept apart from the sim's own RNG) */
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/**
 * Play a route with the bot. Robustness options degrade the PLAYER, not the level: tremor adds +-tremor rad of aim error on every fire tick (a human is not a perfect shot); ammoScale scales every ammo pickup (a human wastes shots).
 */
export function runRoute(map, route, { seed = 1, difficulty = 'normal', maxTicks = 60 * 60 * 6, world = null, onTick = null, fights = true, weave = false, tremor = 0, ammoScale = null } = {}) {
  const w = world || createWorld(map, { seed, difficulty, ammoScale });
  const input = new InputState(), bot = new Bot(w, input, route, { fights, weave }), events = [];
  if (tremor) { const rnd = mulberry(seed * 977 + 13), sample = input.sample.bind(input); input.sample = () => { const c = sample(); if (c.fire) { c.yaw += (rnd() + rnd() + rnd() - 1.5) * tremor; c.pitch += (rnd() + rnd() + rnd() - 1.5) * tremor; } return c; }; }
  let ticks = 0;
  while (!bot.done && !bot.failed && w.status === 'playing' && ticks < maxTicks) {
    bot.tick(); step(w, input.sample()); ticks++;
    events.push(...drainEvents(w));
    if (onTick) onTick(w, ticks);
  }
  const result = w.status === 'complete' ? 'complete' : w.status === 'dead' ? 'dead' : bot.failed ? 'bot-failed' : ticks >= maxTicks ? 'timeout' : bot.done ? 'route-ended' : 'unknown';
  return { world: w, bot, events, ticks, result, failure: bot.failed, hash: hashWorld(w) };
}
