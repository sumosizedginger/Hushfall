// Headless play harness: world + input layer + bot, stepped exactly like the game loop does. Used by tests and evidence tools.
import fs from 'node:fs';
import { createWorld, step, drainEvents, hashWorld } from './world.js';
import { InputState } from './input.js';
import { Bot } from './bot.js';
import { parseMap } from './mapformat.js';

export const loadMapFile = (file) => parseMap(JSON.parse(fs.readFileSync(file, 'utf8')));
export const loadRouteFile = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

export function runRoute(map, route, { seed = 1, difficulty = 'normal', maxTicks = 60 * 60 * 6, world = null, onTick = null } = {}) {
  const w = world || createWorld(map, { seed, difficulty });
  const input = new InputState(), bot = new Bot(w, input, route), events = [];
  let ticks = 0;
  while (!bot.done && !bot.failed && w.status === 'playing' && ticks < maxTicks) {
    bot.tick(); step(w, input.sample()); ticks++;
    events.push(...drainEvents(w));
    if (onTick) onTick(w, ticks);
  }
  const result = w.status === 'complete' ? 'complete' : w.status === 'dead' ? 'dead' : bot.failed ? 'bot-failed' : ticks >= maxTicks ? 'timeout' : bot.done ? 'route-ended' : 'unknown';
  return { world: w, bot, events, ticks, result, failure: bot.failed, hash: hashWorld(w) };
}
