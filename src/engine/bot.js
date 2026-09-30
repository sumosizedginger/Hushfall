// Semantic route bot. It READS world state but ACTS only through InputState (press/release/addYaw), i.e. the same path as a
// human. Used for canonical play paths and regression tests. Route ops: goto | use | kill | wait | switch {id} | waitsector {id, to}.
import { PLAYER, WEAPONS, ENEMIES, PROPS, PICKUPS, STEP } from './defs.js';
import { hasLOS, moveClear } from './world.js';
import { cellFloor } from './terrain.js';

const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export class Bot {
  /** fights:false makes a passive RUNNER: it follows the route but never fires and never dodges. Used to prove a level is not survivable by ignoring it. */
  constructor(world, input, route, { stuckTicks = 240, maxTicksPerOp = 60 * 90, fights = true } = {}) {
    if (!fights) stuckTicks = Infinity;                          // a passive runner that is boxed in stays there and takes what comes (that is the point of the runner)
    this.fights = fights; this.fightTicks = 0; this.noFightUntil = 0; this.w = world; this.in = input; this.route = route; this.i = 0; this.opTicks = 0; this.maxOp = maxTicksPerOp; this.stuckTicks = stuckTicks;
    this.path = null; this.pathKey = ''; this.usePressed = false; this.fireHeld = false; this.lastPos = [world.player.x, world.player.z]; this.stillFor = 0; this.calm = 0; this.failed = null; this.log = [];
  }
  get done() { return this.i >= this.route.length; }
  // -- nav -------------------------------------------------------------
  passable(cx, cz, goal) {
    const m = this.w.map, k = m.kind(cx, cz), p = this.w.player;
    if (goal && cx === goal[0] && cz === goal[1]) return true;
    if (this.avoidToxic && m.fx(cx, cz) === 'x') return false;
    if (m.props.some((pr) => PROPS[pr.kind].radius > 0 && Math.floor(pr.at[0]) === cx && Math.floor(pr.at[1]) === cz)) return false;
    if (k === 'secret') { const d = this.w.doors.find((q) => q.cx === cx && q.cz === cz); return !d?.closet || d.open > 0.85; }     // a closet panel is a wall until an event opens it
    if (k === 'floor' || k === 'outdoor') return true;
    if (k === 'door') { const d = m.doorAt(cx, cz); if (d.remote) { const wd = this.w.doors.find((q) => q.cx === cx && q.cz === cz); return !!wd && wd.open > 0.85; } return !d.key || p.keys.includes(d.key); }
    return false;
  }
  /** paths avoid toxic residue when there is any other way round (a player would); if there is none the shortest path is used */
  findPath(goal) { this.avoidToxic = true; const a = this.findPath0(goal); if (a) { this.avoidToxic = false; return a; } this.avoidToxic = false; return this.findPath0(goal); }
  findPath0(goal) {
    const m = this.w.map, p = this.w.player;
    let start = [Math.floor(p.x / m.cell), Math.floor(p.z / m.cell)];
    // a dodge can leave the bot standing at the corner of a prop's cell: that cell is not passable, so start from the nearest cell that is (the walk out is the first step)
    if (!this.passable(start[0], start[1], null)) {
      let best = null, bd = 1e9;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const c = [start[0] + dx, start[1] + dz]; if (!this.passable(c[0], c[1], null)) continue; const d = Math.hypot((c[0] + 0.5) * m.cell - p.x, (c[1] + 0.5) * m.cell - p.z); if (d < bd) { bd = d; best = c; } }
      if (best) { const rest = this.findPathFrom(best, goal); return rest ? [best, ...rest] : null; }
    }
    return this.findPathFrom(start, goal);
  }
  findPathFrom(start, goal) {
    const m = this.w.map;
    const key = (c) => c[0] + ',' + c[1], prev = new Map([[key(start), null]]), q = [start];
    while (q.length) {
      const c = q.shift();
      if (c[0] === goal[0] && c[1] === goal[1]) break;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = [c[0] + dx, c[1] + dz];
        if (!prev.has(key(n)) && this.passable(n[0], n[1], goal) && cellFloor(this.w, n[0], n[1]) - cellFloor(this.w, c[0], c[1]) <= STEP + 1e-6) { prev.set(key(n), c); q.push(n); }
      }
    }
    if (!prev.has(key(goal))) return null;
    const out = []; for (let c = goal; c; c = prev.get(key(c))) out.push(c);
    return out.reverse().slice(1);
  }
  // -- combat ----------------------------------------------------------
  combatTarget() {
    if (!this.fights || this.w.tick < (this.noFightUntil ?? 0)) return null;
    const w = this.w, p = w.player; let best = null, bd = 16;
    const ringUp = w.enemies.some((n) => ENEMIES[n.kind].node && n.state !== 'dead');
    for (const e of w.enemies) {
      if (e.state === 'dead' || (e.state === 'idle' && !ENEMIES[e.kind].node)) continue;
      if (ringUp && ENEMIES[e.kind].boss) continue;                                                // shielded: cut the ring first
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d < bd && hasLOS(w, p.x, p.z, e.x, e.z)) { best = e; bd = d; }
    }
    return best ? { e: best, d: bd } : null;
  }
  fight(t) {
    const w = this.w, p = w.player;
    // weapon choice: scattergun for Gaunts and anything close (if it has shells), flare cannon for range
    const sr = p.weapon === 'scattergun' ? 1.3 : 1, rr = p.weapon === 'rivet' ? 1.3 : 1;                       // hysteresis: hovering around a threshold must not flip weapons (every flip costs the raise time)
    const plated = !!ENEMIES[t.e.kind].armor, wantFlare = plated && (p.ammo.flare || 0) > 0 && t.d > 4;                    // front plate: only splash gets through cleanly
    const wantScatter = !wantFlare && p.weapons.includes('scattergun') && (p.ammo.shell || 0) > 0 && (t.d < 7 * sr || (t.e.kind === 'gaunt' && t.d < 10 * sr) || ((p.ammo.flare || 0) <= 0 && (p.ammo.rivet || 0) <= 0));   // and shells are all there is
    const wantRivet = !wantScatter && !wantFlare && p.weapons.includes('rivet') && (p.ammo.rivet || 0) > 0 && (t.d < 14 * rr || (p.ammo.flare || 0) <= 0);                 // mid-range: the driver's steady stream (flares are for range and crowds)
    const wantId = wantScatter ? 'scattergun' : wantRivet ? 'rivet' : 'flare';
    if (p.weapon !== wantId && p.weapons.includes(wantId) && w.tick - (this.lastSwitch ?? -99) > 30) { const key = wantId === 'flare' ? 'weapon1' : wantId === 'scattergun' ? 'weapon2' : 'weapon3'; this.in.press(key); this.pendingRelease = key; this.lastSwitch = w.tick; }        // a slot key is a tap: released next tick, or the same slot could never be pressed again
    const def = WEAPONS[p.weapon], hitscan = def.kind === 'hitscan';
    const yawWant = Math.atan2(-(t.e.x - p.x), -(t.e.z - p.z)), yawErr = norm(yawWant - p.yaw);
    this.in.addYaw(clamp(yawErr, -0.15, 0.15));
    let pitchWant;
    const dyE = t.e.y - p.y;                                                                                // target and player may stand at different heights
    if (hitscan) pitchWant = Math.atan2(dyE + Math.min(1.0, ENEMIES[t.e.kind].height * 0.6) - PLAYER.eye, t.d);
    else { const flight = t.d / def.speed, aimY = 1.0 + 0.5 * def.gravity * flight * flight; pitchWant = Math.atan2(dyE + aimY - PLAYER.eye, t.d); }
    this.in.addPitch(clamp(pitchWant - p.pitch, -0.1, 0.1));
    this.setHeld('aim', true); this.setHeld('sprint', false);          // fight from the sights; wait for the weapon to come up before firing
    const inRange = hitscan ? t.d < def.range * 0.5 : t.d > 2.8;
    const shoot = Math.abs(yawErr) < (hitscan ? 0.09 : 0.06) && inRange && (p.ammo[def.ammo] || 0) > 0 && p.ads > 0.85 && p.switchT <= 0;
    this.setHeld('fire', shoot);
    this.setHeld('back', !hitscan && t.d < 2.8);                       // keep clear of our own flare splash
    this.setHeld('forward', !inRange && t.d > 6);                       // not close enough for this weapon: close the distance instead of standing there
    this.setHeld('right', (t.e.lungeT ?? -1) >= 0 || (t.e.chargeT ?? -1) >= 0);   // a crouching Gaunt or a lowered Warden shoulder is about to dash: sidestep it
  }
  /**
   * The boss op: cut the bell ring, then the singer. A tone pulse (windup or ring in flight) is answered by getting behind stone: cover is any nearby point the boss has no line to.
   * Otherwise fight the nearest thing in view; with nothing in view, walk toward the next node (or the boss once the ring is broken).
   */
  bossTick() {
    const w = this.w, p = w.player, boss = w.enemies.find((e) => ENEMIES[e.kind].boss && e.state !== 'dead');
    if (!boss) { for (const a of ['fire', 'aim', 'forward', 'back', 'right', 'sprint']) this.setHeld(a, false); return true; }
    const danger = (boss.pulseT ?? -1) >= 0 || w.pulses.some((q) => q.r < Math.hypot(p.x - q.x, p.z - q.z) + 1.5);
    if (danger) {
      if (hasLOS(w, boss.x, boss.z, p.x, p.z) && (!this.cover || w.tick > this.coverExpires)) { this.cover = this.findCover(boss); this.coverExpires = w.tick + 45; }
      if (this.cover && hasLOS(w, boss.x, boss.z, p.x, p.z)) {                                       // still exposed: go
        const t = this.combatTarget(); if (t && t.d < 5) this.fight(t); else { this.setHeld('fire', false); this.setHeld('aim', false); this.setHeld('back', false); this.setHeld('right', false); }
        this.steerTo(this.cover[0], this.cover[1], 0.4); this.setHeld('sprint', true); return false;
      }
      if (this.cover) { const t = this.combatTarget(); if (t && t.d < 5) this.fight(t); else for (const a of ['fire', 'forward', 'sprint']) this.setHeld(a, false); return false; }   // safe: hold until it passes
    } else this.cover = null;
    const t = this.combatTarget();
    if (t) { this.calm = 0; this.fight(t); return false; }
    this.setHeld('fire', false); this.setHeld('aim', false); this.setHeld('back', false); this.setHeld('right', false);
    const want = this.forage(); if (want) { this.follow([Math.floor(want.x / w.map.cell), Math.floor(want.z / w.map.cell)], 0.5); return false; }              // quiet moment: top up
    const nodes = w.enemies.filter((e) => ENEMIES[e.kind].node && e.state !== 'dead').sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const goal = nodes[0] ?? boss, m = w.map;
    this.follow([Math.floor(goal.x / m.cell), Math.floor(goal.z / m.cell)], 0.6, 7);
    return false;
  }
  /** a pickup worth walking to when nothing is shooting: health when hurt, armour when bare, ammo when low (within 16 m) */
  forage() {
    const w = this.w, p = w.player; let best = null, bd = 16;
    for (const it of w.pickups) {
      const def = PICKUPS[it.kind], d = Math.hypot(it.x - p.x, it.z - p.z); if (d >= bd || Math.abs(it.y - p.y) > 1.2) continue;
      const low = def.type === 'health' ? p.hp < 85 : def.type === 'armor' ? p.armor < 40 : def.type === 'ammo' ? (p.ammo[def.ammo] || 0) < (def.ammo === 'rivet' ? 90 : def.ammo === 'shell' ? 14 : 8) : false;
      if (low) { best = it; bd = d; }
    }
    return best;
  }
  /** the nearest point within 9 m that the boss has no line to (behind a pillar), or null */
  findCover(boss) {
    const w = this.w, p = w.player; let best = null, bd = 1e9;
    for (const r of [2, 3, 4, 5.5, 7, 9]) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      if (hasLOS(w, boss.x, boss.z, x, z) || !moveClear(w, p.x, p.z, x, z, PLAYER.radius + 0.1)) continue;
      const d = r + 0.3 * Math.hypot(x - boss.x, z - boss.z); if (d < bd) { bd = d; best = [x, z]; }
    }
    return best;
  }
  setHeld(action, on) { if (on) this.in.press(action); else this.in.release(action); }
  // -- steering --------------------------------------------------------
  steerTo(x, z, arrive) {
    const p = this.w.player, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < arrive) { this.setHeld('forward', false); return true; }
    const err = norm(Math.atan2(-dx, -dz) - p.yaw);
    this.in.addYaw(clamp(err, -0.1, 0.1));
    this.setHeld('forward', Math.abs(err) < 0.5);
    return false;
  }
  follow(goal, arriveCells = 0.7, stopAt = null) {
    const m = this.w.map, p = this.w.player, gx = (goal[0] + 0.5) * m.cell, gz = (goal[1] + 0.5) * m.cell;
    if (stopAt != null && Math.hypot(gx - p.x, gz - p.z) < stopAt) { this.setHeld('forward', false); return true; }
    if (this.stillFor > 60 && Math.hypot(gx - p.x, gz - p.z) < 2.5 * m.cell) { this.setHeld('forward', false); return true; }        // something (a body, a prop) sits on the exact spot: close enough is arrived
    const key = goal.join(',');
    if (this.pathKey !== key || !this.path || this.w.tick % 30 === 0) { this.path = this.findPath(goal); this.pathKey = key; }
    if (!this.path) { this.failed = `no path to ${key}`; return false; }
    const here = [Math.floor(p.x / m.cell), Math.floor(p.z / m.cell)];
    while (this.path.length && this.path[0][0] === here[0] && this.path[0][1] === here[1]) this.path.shift();
    const next = this.path[0];
    if (!next) return this.steerTo(gx, gz, arriveCells * m.cell / 2);
    const nk = m.kind(next[0], next[1]);
    if ((nk === 'door' || nk === 'secret')) {                    // closed door ahead: open it
      const d = this.w.doors.find((q) => q.cx === next[0] && q.cz === next[1]);
      if (d && d.open < 0.85) {
        const dx = (next[0] + 0.5) * m.cell, dz = (next[1] + 0.5) * m.cell;
        if (Math.hypot(dx - p.x, dz - p.z) < 2.0) { this.setHeld('forward', false); this.aimAt(dx, dz); this.pressUse(); return false; }
      }
    }
    this.setHeld('sprint', this.path.length > 3);                   // sprint the long stretches only
    this.steerTo((next[0] + 0.5) * m.cell, (next[1] + 0.5) * m.cell, 0.35);
    return false;
  }
  /** standing at the lever/door of a switch or use op: a human pulls it even with something shooting at them */
  atUsePoint(op) {
    const w = this.w, p = w.player;
    if (op.op === 'switch') { const sw = w.map.switches.find((q) => q.id === op.id); return !!sw && Math.hypot(sw.px - p.x, sw.pz - p.z) < 3.5 && !this.done; }
    if (op.op === 'use') return Math.hypot((op.at[0] + 0.5) * w.map.cell - p.x, (op.at[1] + 0.5) * w.map.cell - p.z) < 3.0;
    return false;
  }
  aimAt(x, z) { const p = this.w.player; this.in.addYaw(clamp(norm(Math.atan2(-(x - p.x), -(z - p.z)) - p.yaw), -0.15, 0.15)); }
  pressUse() { if (!this.usePressed) { this.in.press('use'); this.usePressed = true; } }
  // -- tick ------------------------------------------------------------
  /** Decide inputs for the next sim tick. */
  tick() {
    if (this.pendingRelease) { this.in.release(this.pendingRelease); this.pendingRelease = null; }
    if (this.failed || this.done) return;
    const w = this.w, p = w.player, op = this.route[this.i];
    if (this.usePressed && this.in.down.has('use')) { this.in.release('use'); }   // 1-tick press: released the tick after
    else if (this.usePressed) this.usePressed = false;
    if (++this.opTicks > this.maxOp) { this.failed = `op ${this.i} (${op.op}) timed out`; return; }
    const moved = Math.hypot(p.x - this.lastPos[0], p.z - this.lastPos[1]);
    this.stillFor = moved > 0.02 ? 0 : this.stillFor + 1; if (moved > 0.02) this.lastPos = [p.x, p.z];
    const t = op.op === 'killboss' || this.atUsePoint(op) ? null : this.combatTarget();
    if (t) {
      this.calm = 0; this.wasFighting = true; this.fight(t);
      // a human stops trading shots with something pinned behind cover and gets on with it: after ~3 s of one fight on a non-kill op, ignore combat for 2.5 s
      if ((op.op === 'goto' || op.op === 'use') && t.d > 4) { if (++this.fightTicks > 200) { this.fightTicks = 0; this.noFightUntil = w.tick + 150; } }          // never walk away from something that is in your face
      if (op.op === 'kill') { this.stillFor = 0; return; } if (op.op !== 'wait' && op.op !== 'waitsector') { if (this.stillFor > this.stuckTicks && t.d > 4) this.failed = 'stuck in combat'; return; } }
    else { if (this.wasFighting) { this.stillFor = 0; this.wasFighting = false; } this.fightTicks = 0; this.setHeld('fire', false); this.setHeld('back', false); this.setHeld('right', false); this.setHeld('aim', false); this.calm++; }
    let done = false;
    if (op.op === 'goto') done = this.follow(op.at, 0.6);
    else if (op.op === 'use') {
      const d = w.doors.find((q) => q.cx === op.at[0] && q.cz === op.at[1]);
      if (d && d.target === 1) done = true;
      else done = this.follow(op.at, 0.6, 1.9) && (this.aimAt((op.at[0] + 0.5) * w.map.cell, (op.at[1] + 0.5) * w.map.cell), this.pressUse(), false);
    // done when nothing awake is close by, or after 4 s of calm: an awake enemy can be stuck behind a wall with no path to us
    } else if (op.op === 'kill') done = !this.fights || (this.calm > 90 && !w.enemies.some((e) => e.state !== 'dead' && e.state !== 'idle' && Math.hypot(e.x - p.x, e.z - p.z) < 14)) || this.calm > 240;
    else if (op.op === 'wait') done = this.opTicks >= op.seconds * 60;
    else if (op.op === 'killboss') done = this.bossTick();
    else if (op.op === 'switch') {
      const sw = w.map.switches.find((s) => s.id === op.id);
      if (!sw) this.failed = 'no switch ' + op.id;
      else if (w.switchState[op.id]?.used) done = true;
      else done = this.follow([Math.floor(sw.at[0]), Math.floor(sw.at[1])], 0.6, 1.3) && (this.aimAt(sw.px, sw.pz), this.pressUse(), false);
    } else if (op.op === 'waitsector') {
      const s = w.sectors.find((q) => q.id === op.id), def = w.map.sectors.find((q) => q.id === op.id), goal = op.to === 'high' ? def?.high : def?.low;
      if (!s) this.failed = 'no sector ' + op.id; else done = Math.abs(s.h - goal) < 1e-6 && Math.abs(s.target - goal) < 1e-6;
    }
    else this.failed = 'unknown op ' + op.op;
    if (this.stillFor > this.stuckTicks && op.op !== 'wait' && op.op !== 'waitsector' && op.op !== 'killboss' && !done) this.failed = `stuck during op ${this.i} (${op.op}) at ${p.x.toFixed(1)},${p.z.toFixed(1)}`;
    if (done) { this.log.push({ op: op, tick: w.tick }); this.i++; this.opTicks = 0; this.path = null; this.setHeld('forward', false); this.setHeld('sprint', false); this.stillFor = 0; }
  }
}
