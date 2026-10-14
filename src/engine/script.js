// Authored events: switches and triggers run lists of actions. Everything is sim state (plain data), evaluated in fixed ticks, deterministic.
// Actions are validated by mapformat.validateKit; the sim can therefore assume the shapes below.
import { wakeEnemy, spawnEnemy, doorAtCell, emit } from './world.js';
import { platformState } from './platforms.js';
import { hpCondition } from './phases.js';

const cellPos = (w, cx, cz) => ({ x: (cx + 0.5) * w.map.cell, z: (cz + 0.5) * w.map.cell });

function sectorTarget(w, id, to) {
  const s = w.sectors.find((q) => q.id === id), def = w.map.sectors.find((q) => q.id === id); if (!s || !def) return;
  const target = to === 'toggle' ? (Math.abs(s.target - def.low) < 1e-6 ? def.high : def.low) : to === 'high' ? def.high : def.low;
  if (Math.abs(target - s.target) < 1e-6 && Math.abs(s.h - target) < 1e-6) return;
  s.target = target; emit(w, 'sector_start', { id, ...cellPos(w, ...def.cells[0]), up: target > s.h });
}

export function runAction(w, a) {
  const k = Object.keys(a)[0], v = a[k], m = w.map;
  if (['open', 'close', 'unlock', 'seal', 'unseal', 'toggle'].includes(k)) {
    const d = doorAtCell(w, v[0], v[1]); if (!d) return; const p = cellPos(w, v[0], v[1]);
    if (k === 'unlock') d.key = null;
    else if (k === 'seal') { d.sealed = true; d.target = 0; }
    else if (k === 'unseal') d.sealed = false;
    else if (k === 'close' || (k === 'toggle' && d.target === 1)) { if (d.target === 1) { d.target = 0; emit(w, 'door_close', { cx: d.cx, cz: d.cz, ...p }); } }
    else if (d.target === 0) { d.target = 1; d.hold = 0; d.sealed = false; emit(w, 'door_open', { cx: d.cx, cz: d.cz, secret: d.secret, remote: true, ...p }); }
  } else if (k === 'wake') { for (const e of w.enemies) if (e.group === v && e.state === 'idle') wakeEnemy(w, e, true, true); }
  else if (k === 'spawn') {
    const e = spawnEnemy(w, v.kind, (v.at[0] + 0.5) * m.cell, (v.at[1] + 0.5) * m.cell, typeof v.facing === 'number' ? v.facing : (v.facing ? { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI }[v.facing] : Math.PI));
    if (v.group) e.group = v.group; if (v.variant) e.variant = v.variant; if (v.hunt) e.hunt = true; w.stats.total.enemies++;
    emit(w, 'enemy_spawn', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    if (v.wake !== false) wakeEnemy(w, e, false, true);
  }
  else if (k === 'choose') { (w.choices ??= {})[v.id] = v.value; emit(w, 'choice', { id: v.id, value: v.value }); }                              // PT-039: a remembered choice (lazy state; the shell keeps it in progress.choices and the next map's world starts with it)
  else if (k === 'sector') sectorTarget(w, v.id, v.to);
  else if (k === 'message') { const msg = m.messages.find((q) => q.id === v); if (msg && !w.messagesSeen.includes(v) && (!msg.choice || choiceHolds(w, msg.choice))) { w.messagesSeen.push(v); emit(w, 'message', { id: v, speaker: msg.speaker || '', text: msg.text }); } }                // PT-046: a message that is answered by a choice is delivered by an action only when the choice holds, as a positional one is
  else if (k === 'exit') { const id = v.id; for (const x of m.exits) if (!id || x.id === id) w.exitLocked[x.id] = v.set === 'lock'; emit(w, v.set === 'lock' ? 'exit_lock' : 'exit_unlock', {}); }
  else if (k === 'alert') { for (const e of w.enemies) if (e.state === 'idle') wakeEnemy(w, e, false, true); emit(w, 'alarm', {}); }
  else if (k === 'shake') emit(w, 'shake', { amount: v });
  else if (k === 'lights') { w.ambient = v; emit(w, 'lights', { level: v }); }                      // the view eases toward this (a dark level brightening as the power comes back)
  else if (k === 'objective') { w.objective = v; emit(w, 'objective', { text: v }); }
  else if (k === 'sound') emit(w, 'cue', { name: v });                                                // PT-043: a toll, a creak, a chord from a trigger (events.js plays the synth recipe of that name)
  else if (k === 'tremor') { emit(w, 'shake', { amount: v }); emit(w, 'tremor', { amount: v }); }     // PT-043: the view shakes and a low sound runs under it
  else if (k === 'beatOff') { w.beatOff = true; emit(w, 'beat_off', {}); }                                  // PT-043: the Hive Cantor is dead: the beat stops, the lights stop swelling (lazy state)
  else if (k === 'lamp') { const L = w.player.lamp; if (L) L.eternal = v === 'own'; }                                  // PT-045 (dev range only): the plain hand lantern, or Ines's own (eternal) lamp, so the lamp yard can feel both holds (mapformat refuses it outside a range map)
  else if (k === 'silence') { w.silenced = true; emit(w, 'silence', {}); }                              // PT-043: the Root Bell hangs still: the score and the ambience are cut from now on (lazy state: only a map that says so has it)
}
export function runActions(w, list) { for (const a of list || []) runAction(w, a); }

/** advance moving floors */
export function updateSectors(w, dt) {
  for (let i = 0; i < w.sectors.length; i++) {
    const s = w.sectors[i], def = w.map.sectors[i];
    if (def.cycle) {                                                                         // PT-029: a timing platform stands where its clock puts it (platforms.js); it announces the start and the end of each move
      const st = platformState(def, w.time), was = s.ph; s.h = st.h; s.target = st.h; s.ph = st.phase;
      if (was !== undefined && was !== st.phase) { if (st.phase === 'down' || st.phase === 'up') emit(w, 'sector_start', { id: s.id, up: st.phase === 'up', ...cellPos(w, ...def.cells[0]) }); else emit(w, 'sector_stop', { id: s.id, ...cellPos(w, ...def.cells[0]) }); }
      continue;
    }
    if (Math.abs(s.h - s.target) < 1e-6) continue;
    const dir = Math.sign(s.target - s.h); s.h += dir * Math.min(Math.abs(s.target - s.h), s.speed * dt);
    if (Math.abs(s.h - s.target) < 1e-6) { s.h = s.target; const def = w.map.sectors.find((q) => q.id === s.id); emit(w, 'sector_stop', { id: s.id, ...cellPos(w, ...def.cells[0]) }); }
  }
}

/** does the remembered choice match a spec '<id>=<value>' (or '<id>!=<value>')? A world with no choices holds none: '=' is false and '!=' is true */
export function choiceHolds(w, spec) { const neg = spec.includes('!='), [id, val] = spec.split(neg ? '!=' : '='); return neg ? w.choices?.[id] !== val : w.choices?.[id] === val; }
const cond = {
  start: (w) => w.tick >= 1,
  enter: (w, t) => Math.hypot(w.player.x - t.x, w.player.z - t.z) <= t.r,
};
export function conditionMet(w, t) {
  if (Array.isArray(t.when)) return t.when.every((q) => conditionMet(w, { ...t, when: q }));                  // PT-033: a list is an AND
  const c = String(t.when);
  if (c.startsWith('not:')) return !conditionMet(w, { ...t, when: c.slice(4) });                                   // PT-037: the opposite of a condition (a seed ripens at time:90 unless not:dead:seed has stopped being true)
  if (c === 'start' || c === 'enter') return cond[c](w, t);
  if (c.startsWith('key:')) return w.player.keys.includes(c.slice(4));
  if (c.startsWith('msg:')) return w.messagesSeen.includes(c.slice(4));
  if (c.startsWith('time:')) return w.time >= Number(c.slice(5));
  if (c.startsWith('dead:')) { const g = c.slice(5), members = w.enemies.filter((e) => e.group === g); return members.length > 0 && members.every((e) => e.state === 'dead'); }
  if (c.startsWith('lit:')) return !!w.beams && w.beams.lit.includes(c.slice(4));
  if (c.startsWith('choice:')) return choiceHolds(w, c.slice(7));                                                                            // PT-039
  if (c.startsWith('seq:')) return w.chimes?.matched?.[c.slice(4)] != null;                                                  // PT-038: a chime phrase was played (chimes.js)                                             // PT-033: a receiver is lit (beams.js)
  if (c.startsWith('sector:')) { const [, id, pos] = c.split(':'), s = w.sectors.find((q) => q.id === id), def = w.map.sectors.find((q) => q.id === id); return !!s && Math.abs(s.h - s.target) < 1e-6 && Math.abs(s.h - (pos === 'high' ? def.high : def.low)) < 1e-6; }
  if (c === 'lamp:on') return !!w.player.lamp?.on;                                                                    // PT-043: the hand lantern is lit
  if (c.startsWith('hp:')) return !!hpCondition(w, c);                                                              // PT-043: a group is under a share of its hit points (phases.js)
  return false;
}
/** evaluate every unfired trigger; a fired trigger runs its actions once */
export function updateTriggers(w) {
  for (const t of w.map.triggers) {
    const st = w.triggerState[t.id]; if (!st || st.fired) continue;
    if (conditionMet(w, t)) { st.fired = true; emit(w, 'trigger', { id: t.id }); runActions(w, t.do); }
  }
}

export function activateSwitch(w, sw) {
  const st = w.switchState[sw.id]; if (!st) return;
  if (sw.once && st.used) { emit(w, 'switch_dead', { id: sw.id, x: sw.px, z: sw.pz }); return; }
  if (sw.needs?.length) {                                                                          // a switch that wants items (fuses): refuse until the player has them all, then spend them
    const missing = sw.needs.filter((k) => !w.player.keys.includes(k));
    if (missing.length) { emit(w, 'switch_need', { id: sw.id, missing, x: sw.px, z: sw.pz }); return; }
    w.player.keys = w.player.keys.filter((k) => !sw.needs.includes(k));
  }
  st.used = true; st.on = !st.on; emit(w, 'switch', { id: sw.id, on: st.on, x: sw.px, z: sw.pz });
  runActions(w, sw.do);
}
