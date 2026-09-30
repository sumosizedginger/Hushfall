// Authored events: switches and triggers run lists of actions. Everything is sim state (plain data), evaluated in fixed ticks, deterministic.
// Actions are validated by mapformat.validateKit; the sim can therefore assume the shapes below.
import { wakeEnemy, spawnEnemy, doorAtCell, emit } from './world.js';

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
    if (v.group) e.group = v.group; w.stats.total.enemies++;
    emit(w, 'enemy_spawn', { id: e.id, kind: e.kind, x: e.x, z: e.z });
    if (v.wake !== false) wakeEnemy(w, e, false, true);
  }
  else if (k === 'sector') sectorTarget(w, v.id, v.to);
  else if (k === 'message') { const msg = m.messages.find((q) => q.id === v); if (msg && !w.messagesSeen.includes(v)) { w.messagesSeen.push(v); emit(w, 'message', { id: v, speaker: msg.speaker || '', text: msg.text }); } }
  else if (k === 'exit') { const id = v.id; for (const x of m.exits) if (!id || x.id === id) w.exitLocked[x.id] = v.set === 'lock'; emit(w, v.set === 'lock' ? 'exit_lock' : 'exit_unlock', {}); }
  else if (k === 'alert') { for (const e of w.enemies) if (e.state === 'idle') wakeEnemy(w, e, false, true); emit(w, 'alarm', {}); }
  else if (k === 'shake') emit(w, 'shake', { amount: v });
  else if (k === 'objective') { w.objective = v; emit(w, 'objective', { text: v }); }
}
export function runActions(w, list) { for (const a of list || []) runAction(w, a); }

/** advance moving floors */
export function updateSectors(w, dt) {
  for (const s of w.sectors) {
    if (Math.abs(s.h - s.target) < 1e-6) continue;
    const dir = Math.sign(s.target - s.h); s.h += dir * Math.min(Math.abs(s.target - s.h), s.speed * dt);
    if (Math.abs(s.h - s.target) < 1e-6) { s.h = s.target; const def = w.map.sectors.find((q) => q.id === s.id); emit(w, 'sector_stop', { id: s.id, ...cellPos(w, ...def.cells[0]) }); }
  }
}

const cond = {
  start: (w) => w.tick >= 1,
  enter: (w, t) => Math.hypot(w.player.x - t.x, w.player.z - t.z) <= t.r,
};
function conditionMet(w, t) {
  const c = String(t.when);
  if (c === 'start' || c === 'enter') return cond[c](w, t);
  if (c.startsWith('key:')) return w.player.keys.includes(c.slice(4));
  if (c.startsWith('msg:')) return w.messagesSeen.includes(c.slice(4));
  if (c.startsWith('time:')) return w.time >= Number(c.slice(5));
  if (c.startsWith('dead:')) { const g = c.slice(5), members = w.enemies.filter((e) => e.group === g); return members.length > 0 && members.every((e) => e.state === 'dead'); }
  if (c.startsWith('sector:')) { const [, id, pos] = c.split(':'), s = w.sectors.find((q) => q.id === id), def = w.map.sectors.find((q) => q.id === id); return !!s && Math.abs(s.h - s.target) < 1e-6 && Math.abs(s.h - (pos === 'high' ? def.high : def.low)) < 1e-6; }
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
  st.used = true; st.on = !st.on; emit(w, 'switch', { id: sw.id, on: st.on, x: sw.px, z: sw.pz });
  runActions(w, sw.do);
}
