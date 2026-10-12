// Semantic route bot. It READS world state but ACTS only through InputState (press/release/addYaw), i.e. the same path as a
// human. Used for canonical play paths and regression tests. Route ops: goto | use | kill | wait | switch {id} | waitsector {id, to} | waitplatform {id, at: 'high'|'low', min} (a timing platform, PT-029).
import { PLAYER, WEAPONS, ENEMIES, PROPS, PICKUPS, STEP, FX } from './defs.js';
import { hasLOS, moveClear } from './world.js';
import { cellFloor, fxAt } from './terrain.js';
import { gateRemaining, sporeState } from './breath.js';
import { platformReady } from './platforms.js';
import { lockBusy } from './airlock.js';                                                  // PT-033: a lock's second door waits for the air: the bot stands and waits, as it does at a sound-lock
import { loadState, loadAtCell } from './loads.js';

/** the guns the route bot fights with; a weapon it does not use (a found melee weapon, the carbine, the line-thrower, the fork: PT-023) is switched away from in a fight and its ammunition is not foraged */
export const BOT_GUNS = new Set(['flare', 'scattergun', 'rivet', 'harpoon', 'arc']);
const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export class Bot {
  /** weave:true makes a COMPETENT fighter that strafes in alternating half-second runs while trading with a shooter (the default fighter stands still and shoots: the conservative baseline the damage gates are measured on). fights:false makes a passive RUNNER: it follows the route but never fires and never dodges. Used to prove a level is not survivable by ignoring it. */
  constructor(world, input, route, { stuckTicks = 240, maxTicksPerOp = 60 * 90, fights = true, weave = false } = {}) {
    if (!fights) stuckTicks = Infinity;                          // a passive runner that is boxed in stays there and takes what comes (that is the point of the runner)
    this.fights = fights; this.weave = weave; this.fightTicks = 0; this.noFightUntil = 0; this.w = world; this.in = input; this.route = route; this.i = 0; this.opTicks = 0; this.maxOp = maxTicksPerOp; this.stuckTicks = stuckTicks;
    this.path = null; this.pathKey = ''; this.usePressed = false; this.fireHeld = false; this.lastPos = [world.player.x, world.player.z]; this.stillFor = 0; this.calm = 0; this.failed = null; this.log = [];
  }
  get done() { return this.i >= this.route.length; }
  // -- nav -------------------------------------------------------------
  /** the plain floor test, for a vent plate (which `passable` refuses, so that a path never crosses one by accident) */
  passable0(cx, cz) { const k = this.w.map.kind(cx, cz); return k === 'floor' || k === 'outdoor'; }
  passable(cx, cz, goal) {
    const m = this.w.map, k = m.kind(cx, cz), p = this.w.player;
    if (m.ventCells.has(cx + ',' + cz) && !(goal && cx === goal[0] && cz === goal[1])) return false;       // PT-032: stepping on a plate throws you: only a path that means to goes there
    if (goal && cx === goal[0] && cz === goal[1]) return true;
    if (this.avoidToxic && FX[m.fx(cx, cz)]?.dps) return false;
    if (m.props.some((pr) => PROPS[pr.kind].radius > 0 && Math.floor(pr.at[0]) === cx && Math.floor(pr.at[1]) === cz)) return false;
    if (m.movables.some((pr) => Math.floor(pr.at[0]) === cx && Math.floor(pr.at[1]) === cz)) return false;          // a crate, barrel or sack the tuning-fork could lift: a walker without it is stopped by it (PT-025: a bot that went to collect a drop walked into one)
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
      const vent = m.vents.length ? m.vents.find((v) => v.at[0] === c[0] && v.at[1] === c[1]) : null;       // PT-032: a vent plate is a way through, and only to its landing (stepping on it throws you)
      if (vent) { const n = [vent.to[0], vent.to[1]]; if (!prev.has(key(n))) { prev.set(key(n), c); q.push(n); } continue; }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = [c[0] + dx, c[1] + dz];
        if (!prev.has(key(n)) && (this.passable(n[0], n[1], goal) || (m.ventCells.has(key(n)) && this.passable0(n[0], n[1]))) && cellFloor(this.w, n[0], n[1]) - cellFloor(this.w, c[0], c[1]) <= STEP + 1e-6) { prev.set(key(n), c); q.push(n); }
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
      if (e.state === 'dead' || ENEMIES[e.kind].peaceful || (e.state === 'idle' && !ENEMIES[e.kind].node)) continue;
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
    const plated = !!ENEMIES[t.e.kind].armor, hr = p.weapon === 'harpoon' ? 1.3 : 1, hd = ENEMIES[t.e.kind];
    const wantHarpoon = p.weapons.includes('harpoon') && (p.ammo.bolt || 0) > 0 && ((plated && t.d > 3) || (t.d > 9 / hr && (!!hd.ranged || !!hd.hover)));       // the long gun: plate (the bolt goes through it) and shooters or flyers that are not close
    const near = w.enemies.filter((e) => e !== t.e && e.state !== 'dead' && e.state !== 'idle' && !ENEMIES[e.kind].peaceful && Math.hypot(e.x - t.e.x, e.z - t.e.z) < 4.5).length;
    const wantArc = !wantHarpoon && p.weapons.includes('arc') && (p.ammo.cell || 0) > 0 && t.d < (p.weapon === 'arc' ? 11 : 9) && (near >= 1 || !!hd.hover);       // the lamp: a clutch of bodies, or a flyer, inside its reach (the arc jumps)
    const wantFlare = !wantHarpoon && !wantArc && plated && (p.ammo.flare || 0) > 0 && t.d > 4;                    // front plate: only splash gets through cleanly
    const wantScatter = !wantFlare && !wantHarpoon && !wantArc && p.weapons.includes('scattergun') && (p.ammo.shell || 0) > 0 && (t.d < 7 * sr || (t.e.kind === 'gaunt' && t.d < 10 * sr) || ((p.ammo.flare || 0) <= 0 && (p.ammo.rivet || 0) <= 0));   // and shells are all there is
    const wantRivet = !wantScatter && !wantFlare && !wantHarpoon && !wantArc && p.weapons.includes('rivet') && (p.ammo.rivet || 0) > 0 && (t.d < 14 * rr || (p.ammo.flare || 0) <= 0);                 // mid-range: the driver's steady stream (flares are for range and crowds)
    const lastResort = p.weapons.includes('carbine') && (p.ammo.round || 0) > 0 && !p.weapons.some((id) => BOT_GUNS.has(id) && (p.ammo[WEAPONS[id].ammo] || 0) > 0);          // PT-023: the carbine is the bot's LAST resort: with it in the pocket the sim's flare feed no longer carries a bot that has run out of everything else, so the bot has to use it
    const wantId = wantHarpoon ? 'harpoon' : wantArc ? 'arc' : wantScatter ? 'scattergun' : wantRivet ? 'rivet' : lastResort ? 'carbine' : 'flare';
    if (p.weapon !== wantId && p.weapons.includes(wantId) && w.tick - (this.lastSwitch ?? -99) > 30) { const key = wantId === 'flare' ? 'weapon1' : wantId === 'scattergun' ? 'weapon2' : wantId === 'rivet' ? 'weapon3' : wantId === 'harpoon' ? 'weapon4' : wantId === 'arc' ? 'weapon5' : 'weapon7'; this.in.press(key); this.pendingRelease = key; this.lastSwitch = w.tick; }        // a slot key is a tap: released next tick, or the same slot could never be pressed again
    const def = BOT_GUNS.has(p.weapon) || (lastResort && p.weapon === 'carbine') ? WEAPONS[p.weapon] : WEAPONS[wantId], hitscan = def.kind === 'hitscan' || def.kind === 'arc';          // a melee weapon in hand (a found one was just picked up) is switched away from within half a second: aim for the gun it is about to raise
    const yawWant = Math.atan2(-(t.e.x - p.x), -(t.e.z - p.z)), yawErr = norm(yawWant - p.yaw);
    this.in.addYaw(clamp(yawErr, -0.15, 0.15));
    let pitchWant;
    const dyE = t.e.y - p.y;                                                                                // target and player may stand at different heights
    const hv = ENEMIES[t.e.kind].hover ?? 0;                                                               // a flyer's body starts above its floor
    if (hitscan) pitchWant = Math.atan2(dyE + hv + Math.min(1.0, ENEMIES[t.e.kind].height * 0.6) - PLAYER.eye, t.d);
    else { const flight = t.d / def.speed, aimY = 1.0 + hv + 0.5 * def.gravity * flight * flight; pitchWant = Math.atan2(dyE + aimY - PLAYER.eye, t.d); }
    this.in.addPitch(clamp(pitchWant - p.pitch, -0.1, 0.1));
    this.setHeld('aim', true); this.setHeld('sprint', false);          // fight from the sights; wait for the weapon to come up before firing
    const inRange = def.kind === 'arc' ? t.d < def.range * 0.9 : hitscan ? t.d < def.range * 0.5 : t.d > 2.8;
    const shoot = Math.abs(yawErr) < (hitscan ? 0.09 : 0.06) && inRange && (p.ammo[def.ammo] || 0) > 0 && p.ads > 0.85 && p.switchT <= 0;
    this.setHeld('fire', shoot && (def.charge ? w.tick % 10 < 5 : true));         // a charging weapon (the lamp) fires on RELEASE: the bot taps it, five ticks down and five up (about six a second)
    this.setHeld('back', !hitscan && t.d < 2.8);                       // keep clear of our own flare splash
    this.setHeld('forward', !inRange && t.d > 6);                       // not close enough for this weapon: close the distance instead of standing there
    // out of ammunition for everything it carries: the bot closes in and bashes (key V) instead of standing there with a dry gun (the old last-resort flare feed is gone, fists never run out)
    const dry = !lastResort && !p.weapons.some((id) => BOT_GUNS.has(id) && (p.ammo[WEAPONS[id].ammo] || 0) > 0) && !plated && !ENEMIES[t.e.kind].boss;          // (never walks up to plate or a boss with fists: a player flanks, the bot just waits for the feed's flare)
    if (dry) { this.setHeld('fire', false); this.setHeld('aim', false); this.setHeld('back', false); this.setHeld('forward', t.d > 1.6); if (t.d < 2.3 && w.tick % 30 === 0) { this.in.press('melee'); this.releaseMelee = true; } }
    const dodge = (t.e.lungeT ?? -1) >= 0 || (t.e.chargeT ?? -1) >= 0, shooter = this.weave && !!ENEMIES[t.e.kind].ranged && t.d > 5, weave = shooter && ((w.tick / 36) | 0) % 2 === 0;   // strafe in alternating half-second runs while trading with a shooter: slow toll-shots miss a moving target
    this.setHeld('right', dodge || weave); this.setHeld('left', shooter && !weave && !dodge);   // a crouching Gaunt or a lowered Warden shoulder is about to dash: sidestep it
  }
  /**
   * The boss op: cut the bell ring, then the singer. A tone pulse (windup or ring in flight) is answered by getting behind stone: cover is any nearby point the boss has no line to.
   * Otherwise fight the nearest thing in view; with nothing in view, walk toward the next node (or the boss once the ring is broken).
   */
  bossTick() {
    const w = this.w, p = w.player, boss = w.enemies.find((e) => ENEMIES[e.kind].boss && e.state !== 'dead');
    if (!boss) { for (const a of ['fire', 'aim', 'forward', 'back', 'right', 'sprint']) this.setHeld(a, false); return true; }
    // the Gate Warden stands a whole arena away: a ring it has only just drawn breath for, or one that is still forty metres off, is no reason to stop (a human takes cover when the ring is about to arrive, and always from the beam)
    const far = !!ENEMIES[boss.kind].sweep;
    const ringsMatter = !far || p.hp < 45;                                                                                // a ring costs 13: only the beam is worth hiding from while there is hit points to spare
    const danger = (ringsMatter && (boss.pulseT ?? -1) >= 0) || (boss.sweepT ?? -1) >= 0 || (boss.echoT ?? 0) > 0 || (ringsMatter && w.pulses.some((q) => q.r < Math.hypot(p.x - q.x, p.z - q.z) + 1.5));
    if (danger) {
      if (this.exposedTo(boss, p.x, p.z) && (!this.cover || w.tick > this.coverExpires)) { this.cover = this.findCover(boss); this.coverExpires = w.tick + 45; }
      if (this.cover && this.exposedTo(boss, p.x, p.z)) {                                       // still exposed: go
        const t = this.combatTarget(); if (t && t.d < 5) this.fight(t); else { this.setHeld('fire', false); this.setHeld('aim', false); this.setHeld('back', false); this.setHeld('right', false); }
        this.steerTo(this.cover[0], this.cover[1], 0.4); this.setHeld('sprint', true); return false;
      }
      if (this.cover) { const t = this.combatTarget(); if (t && t.d < 5) this.fight(t); else for (const a of ['fire', 'forward', 'sprint']) this.setHeld(a, false); return false; }   // safe: hold until it passes
    } else this.cover = null;
    const t = this.combatTarget();
    if (t) { this.calm = 0; this.fight(t); return false; }
    this.setHeld('fire', false); this.setHeld('aim', false); this.setHeld('back', false); this.setHeld('right', false);
    const want = this.forage(); if (want) { if (this.follow([Math.floor(want.x / w.map.cell), Math.floor(want.z / w.map.cell)], 0.5)) { const st = this.forageStuck?.id === want.id ? this.forageStuck : (this.forageStuck = { id: want.id, n: 0 }); if (++st.n > 180) (this.skipPickups ??= new Set()).add(want.id); } return false; }      // `follow` says 'close enough' (something sits on the exact spot): a pickup it cannot collect is given up, or the bot would forage at it forever instead of going for the boss              // quiet moment: top up
    const nodes = w.enemies.filter((e) => ENEMIES[e.kind].node && e.state !== 'dead').sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const goal = nodes[0] ?? boss, m = w.map;
    this.follow([Math.floor(goal.x / m.cell), Math.floor(goal.z / m.cell)], 0.6, 7);
    return false;
  }
  /** a pickup worth walking to when nothing is shooting: health when hurt, armour when bare, ammo when low (within 16 m) */
  forage() {
    const w = this.w, p = w.player; let best = null, bd = 16;
    const OWNER = { flare: 'flare', shell: 'scattergun', rivet: 'rivet', bolt: 'harpoon', cell: 'arc' };                 // ammunition for a gun it does not carry is not worth a walk (the boxes may be there for a later weapon, or for the player who found the gun)
    for (const it of w.pickups) {
      if (this.skipPickups?.has(it.id)) continue;
      const def = PICKUPS[it.kind], d = Math.hypot(it.x - p.x, it.z - p.z); if (d >= bd || (it.drop && d > 7) || Math.abs(it.y - p.y) > 1.2) continue;          // a box a creature dropped is worth a short walk (7 m; the magnet brings it the last 3): not a march across a boss arena (PT-025)
      const low = def.type === 'health' ? p.hp < 85 : def.type === 'armor' ? p.armor < 40 : def.type === 'ammo' ? p.weapons.includes(OWNER[def.ammo] ?? 'none') && (p.ammo[def.ammo] || 0) < (def.ammo === 'rivet' ? 90 : def.ammo === 'shell' ? 14 : 8) : false;
      if (low) { best = it; bd = d; }
    }
    return best;
  }
  /** a point the boss can see: for the Gate Warden also a point a body-width to either side of it (its beam is 0.9 m wide: a corner is not cover from it) */
  exposedTo(boss, x, z) {
    const w = this.w; if (hasLOS(w, boss.x, boss.z, x, z)) return true;
    if (!ENEMIES[boss.kind].sweep) return false;
    const dx = x - boss.x, dz = z - boss.z, l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l;
    return hasLOS(w, boss.x, boss.z, x + px * 1.0, z + pz * 1.0) || hasLOS(w, boss.x, boss.z, x - px * 1.0, z - pz * 1.0);
  }
  /** the nearest point within 9 m that the boss has no line to (behind a pillar), or null */
  findCover(boss) {
    const w = this.w, p = w.player; let best = null, bd = 1e9;
    for (const r of [2, 3, 4, 5.5, 7, 9]) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      if (this.exposedTo(boss, x, z) || !moveClear(w, p.x, p.z, x, z, PLAYER.radius + 0.1)) continue;
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
    const drifting = FX[fxAt(this.w, p.x, p.z)]?.grip != null; if (drifting) arriveCells = Math.max(arriveCells, 1.4);                     // PT-033: on a floor with no grip a human does not aim for the exact spot
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
    // PT-027, the ship breathes: a human waits at a shut breathing gate until it is open for long enough to get through, and waits outside a spore bed that is blooming or would bloom before it was crossed
    if (nk === 'door') {
      const d = this.w.doors.find((q) => q.cx === next[0] && q.cz === next[1]);
      if (d?.breath) {
        const dx = (next[0] + 0.5) * m.cell, dz = (next[1] + 0.5) * m.cell, dist = Math.hypot(dx - p.x, dz - p.z);
        if (dist < 2.6 && !(d.open >= 0.85 && gateRemaining(d.breath, this.w.time) > dist / PLAYER.speed + 0.6)) { this.setHeld('forward', false); this.setHeld('sprint', false); this.aimAt(dx, dz); this.stillFor = 0; return false; }          // waiting for the ship to breathe is not being stuck
        this.setHeld('sprint', this.path.length > 3); this.steerTo(dx, dz, 0.35); return false;
      }
    }
    if (this.sporeHold(here, next) || this.loadHold(here, next)) { this.setHeld('forward', false); this.setHeld('sprint', false); this.stillFor = 0; return false; }
    if ((nk === 'door' || nk === 'secret')) {                    // closed door ahead: open it
      const d = this.w.doors.find((q) => q.cx === next[0] && q.cz === next[1]);
      if (d && d.open < 0.85) {
        const dx = (next[0] + 0.5) * m.cell, dz = (next[1] + 0.5) * m.cell;
        if (Math.hypot(dx - p.x, dz - p.z) < 2.0) { this.setHeld('forward', false); this.aimAt(dx, dz); this.pressUse(); return false; }
      }
    }
    if (drifting && this.path.length <= 4 && Math.hypot(p.vx, p.vz) * 0.55 > Math.hypot(gx - p.x, gz - p.z) - 0.5) { this.setHeld('forward', false); this.setHeld('sprint', false); this.aimAt(gx, gz); return false; }          // PT-033: let go and coast the last stretch (a drift floor carries you about 0.6 s of your speed)
    this.setHeld('sprint', this.path.length > 3 && !drifting);                   // sprint the long stretches only
    this.steerTo((next[0] + 0.5) * m.cell, (next[1] + 0.5) * m.cell, 0.35);
    return false;
  }
  /** about to step from `here` onto a spore bed: stay out while it blooms, or while the dormant spell left is shorter than the walk across it (at most one whole period: after that go and take what comes) */
  /** PT-032: a falling load lands on its rect every `period` s: wait outside it until the whole crossing fits before the next impact (like a spore bloom; after a full period of waiting go anyway) */
  loadHold(here, next) {
    const m = this.w.map; if (!m.loads.length) { this.loadSince = null; return false; }
    const L = loadAtCell(m, next[0], next[1]); if (!L || loadAtCell(m, here[0], here[1]) === L) { if (!L) this.loadSince = null; return false; }
    let n = 0; for (const c of this.path) { if (loadAtCell(m, c[0], c[1]) === L) n++; else if (n) break; }
    const cross = n * m.cell / PLAYER.speed + 0.5, s = loadState(L, this.w.time);
    if (s.until > cross + 0.3) { this.loadSince = null; return false; }
    this.loadSince ??= this.w.time; if (this.w.time - this.loadSince > L.period + 1) return false;
    return true;
  }
  sporeHold(here, next) {
    const m = this.w.map, t = this.w.time;
    if (!m.pulses.length || !FX[m.fx(next[0], next[1])]?.pulse) { this.sporeSince = null; return false; }
    const reg = m.pulseAt(next[0], next[1]); if (!reg || (FX[m.fx(here[0], here[1])]?.pulse && m.pulseAt(here[0], here[1]) === reg)) return false;      // already inside: keep walking
    let n = 0; for (const c of this.path) { if (m.pulseAt(c[0], c[1]) === reg && FX[m.fx(c[0], c[1])]?.pulse) n++; else if (n) break; }
    const cross = n * m.cell / (PLAYER.speed * (FX.s.speed ?? 0.7)) + 0.4, s = sporeState(reg, t);
    const hold = s.on || s.until < cross;
    if (!hold) { this.sporeSince = null; return false; }
    this.sporeSince ??= t;
    if (t - this.sporeSince > reg.period + 1) return false;
    return true;
  }
  /** PT-028: standing in a Weeping Mother's pool, or under a tear that will land on it within a second: a human walks out (the pool slows and burns). Returns true while it is walking out. */
  escapePool() {
    const w = this.w, p = w.player; if (!this.fights || (!w.patches?.length && !w.tears?.length)) { this.poolExit = null; return false; }
    let c = null;
    for (const q of w.patches ?? []) if (Math.hypot(p.x - q.x, p.z - q.z) < q.r + 0.3) { c = q; break; }
    if (!c) for (const q of w.tears ?? []) { const lx = q.x + q.vx * q.left / 60, lz = q.z + q.vz * q.left / 60; if (q.left < 70 && Math.hypot(p.x - lx, p.z - lz) < q.r + 0.5) { c = { x: lx, z: lz, r: q.r }; break; } }
    if (!c) { this.poolExit = null; return false; }
    if (!this.poolExit || Math.hypot(this.poolExit[0] - c.x, this.poolExit[1] - c.z) < c.r + 0.2) {
      let best = null, bd = -1;
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, d = c.r + 1.4, x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d; if (!moveClear(w, p.x, p.z, x, z, PLAYER.radius + 0.1)) continue; const score = -Math.hypot(x - p.x, z - p.z); if (bd < 0 || score > bd) { bd = score; best = [x, z]; } }
      this.poolExit = best;
    }
    if (!this.poolExit) return false;
    this.setHeld('fire', false); this.setHeld('aim', false); this.setHeld('back', false); this.setHeld('left', false); this.setHeld('right', false); this.setHeld('sprint', true);
    this.steerTo(this.poolExit[0], this.poolExit[1], 0.3); return true;
  }
  /** standing at the lever/door of a switch or use op: a human pulls it even with something shooting at them */
  atUsePoint(op) {
    const w = this.w, p = w.player;
    if (op.op === 'switch') { const sw = w.map.switches.find((q) => q.id === op.id); return !!sw && Math.hypot(sw.px - p.x, sw.pz - p.z) < 3.5 && !this.done; }
    if (op.op === 'use') return Math.hypot((op.at[0] + 0.5) * w.map.cell - p.x, (op.at[1] + 0.5) * w.map.cell - p.z) < 3.0;
    if (op.op === 'chime') { const q = w.map.props.find((r) => (r.kind === 'chime' || r.kind === 'chimetree') && r.id === op.id); return !!q && Math.hypot(q.x - p.x, q.z - p.z) < 3.0; }          // PT-038
    if (op.op === 'mirror') { const m = w.map.mirrors.find((q) => q.id === op.id); return !!m && Math.hypot((m.at[0] + 0.5) * w.map.cell - p.x, (m.at[1] + 0.5) * w.map.cell - p.z) < 3.0 && w.mirrors[op.id] !== op.rot; }          // PT-033: a human turns a mirror under fire
    return false;
  }
  aimAt(x, z) { const p = this.w.player; this.in.addYaw(clamp(norm(Math.atan2(-(x - p.x), -(z - p.z)) - p.yaw), -0.15, 0.15)); }
  pressUse() { if (!this.usePressed) { this.in.press('use'); this.usePressed = true; } }
  // -- tick ------------------------------------------------------------
  /** Decide inputs for the next sim tick. */
  tick() {
    if (this.pendingRelease) { this.in.release(this.pendingRelease); this.pendingRelease = null; }
    if (this.releaseMelee) { this.in.release('melee'); this.releaseMelee = false; }
    if (this.failed || this.done) return;
    const w = this.w, p = w.player, op = this.route[this.i];
    if (this.usePressed && this.in.down.has('use')) { this.in.release('use'); }   // 1-tick press: released the tick after
    else if (this.usePressed) this.usePressed = false;
    if (p.lamp) {                                                                    // PT-038 (E5): in a dark place the bot carries its lantern lit, unless a route op says otherwise ({ op: 'lamp', on: false })
      if (this.lampPressed) { this.in.release('lamp'); this.lampPressed = false; }
      else if (w.map.dark && (op.op === 'lamp' ? op.on !== false : (this.lampWanted ?? true)) !== p.lamp.on && (p.lamp.on || p.lamp.oil > 0 || p.lamp.eternal)) { this.in.press('lamp'); this.lampPressed = true; }
    }
    if (++this.opTicks > this.maxOp * (op.op === 'killboss' ? 2 : 1)) { this.failed = `op ${this.i} (${op.op}) timed out`; return; }
    if (p.air) { for (const a of ['forward', 'back', 'left', 'right', 'sprint']) this.setHeld(a, false); this.stillFor = 0; return; }       // PT-032: in the air the bot rides the arc (a steered bot misses what the throw would have hit)
    const moved = Math.hypot(p.x - this.lastPos[0], p.z - this.lastPos[1]);
    this.stillFor = moved > 0.02 ? 0 : this.stillFor + 1; if (moved > 0.02) this.lastPos = [p.x, p.z];
    if (this.escapePool()) { this.stillFor = 0; return; }
    const t = op.op === 'killboss' || this.atUsePoint(op) ? null : this.combatTarget();
    if (t) {
      this.calm = 0; this.wasFighting = true; this.fight(t);
      // a human stops trading shots with something pinned behind cover and gets on with it: after ~3 s of one fight on a non-kill op, ignore combat for 2.5 s
      if ((op.op === 'goto' || op.op === 'use' || op.op === 'chime') && t.d > 4) { if (++this.fightTicks > 200) { this.fightTicks = 0; this.noFightUntil = w.tick + 150; } }          // never walk away from something that is in your face
      if (op.op === 'kill') { this.stillFor = 0; return; } if (op.op !== 'wait' && op.op !== 'waitsector' && op.op !== 'waitplatform') { if (this.stillFor > this.stuckTicks && t.d > 4) this.failed = 'stuck in combat'; return; } }
    else { if (this.wasFighting) { this.stillFor = 0; this.wasFighting = false; } this.fightTicks = 0; this.setHeld('fire', false); this.setHeld('back', false); this.setHeld('right', false); this.setHeld('left', false); this.setHeld('aim', false); this.calm++; }
    let done = false;
    if (op.op === 'goto') done = this.follow(op.at, 0.6);
    else if (op.op === 'use') {
      const d = w.doors.find((q) => q.cx === op.at[0] && q.cz === op.at[1]);
      if (d && d.target === 1) done = true;
      else { const listening = (d?.soundlock && w.time - (w.noise?.t ?? -99) < d.soundlock.quiet) || (d?.interlock && lockBusy(w, d)); done = this.follow(op.at, 0.6, 1.9) && (this.aimAt((op.at[0] + 0.5) * w.map.cell, (op.at[1] + 0.5) * w.map.cell), listening ? (this.stillFor = 0) : this.pressUse(), false); }          // PT-029: a sound-lock door listens: stand still and quiet until it has heard nothing for its `quiet` s
    // done when nothing awake is close by, or after 4 s of calm: an awake enemy can be stuck behind a wall with no path to us
    } else if (op.op === 'kill') done = !this.fights || (this.calm > 90 && !w.enemies.some((e) => e.state !== 'dead' && e.state !== 'idle' && !ENEMIES[e.kind].peaceful && Math.hypot(e.x - p.x, e.z - p.z) < 14)) || this.calm > 240;
    else if (op.op === 'wait') done = this.opTicks >= op.seconds * 60;
    else if (op.op === 'lamp') { this.lampWanted = op.on !== false; done = true; }                                                 // PT-038: the lantern lit or out from here on
    else if (op.op === 'killboss') done = this.bossTick();
    else if (op.op === 'switch') {
      const sw = w.map.switches.find((s) => s.id === op.id);
      if (!sw) this.failed = 'no switch ' + op.id;
      else if (w.switchState[op.id]?.used) done = true;
      else done = this.follow([Math.floor(sw.at[0]), Math.floor(sw.at[1])], 0.6, 1.3) && (this.aimAt(sw.px, sw.pz), this.pressUse(), false);
    } else if (op.op === 'mirror') {                                                                                                // PT-033: stand beside a mirror and turn it until it faces `rot`
      const mi = w.map.mirrors.find((q) => q.id === op.id);
      if (!mi) this.failed = 'no mirror ' + op.id;
      else if (w.mirrors[op.id] === op.rot) done = true;
      else {
        const mx = (mi.at[0] + 0.5) * w.map.cell, mz = (mi.at[1] + 0.5) * w.map.cell;
        const stand = op.from ?? [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [mi.at[0] + dx, mi.at[1] + dz]).filter(([x, z]) => this.passable0(x, z)).sort((a, b) => Math.hypot((a[0] + 0.5) * w.map.cell - p.x, (a[1] + 0.5) * w.map.cell - p.z) - Math.hypot((b[0] + 0.5) * w.map.cell - p.x, (b[1] + 0.5) * w.map.cell - p.z))[0];
        if (!stand) this.failed = 'no cell beside mirror ' + op.id; else if (this.follow(stand, 0.5, 1.2)) { this.aimAt(mx, mz); this.pressUse(); }
      }
    } else if (op.op === 'chime') {                                                                                                 // PT-038 (E6): stand beside a chime (or the tree) and strike it (or hear it); done when the sim says it rang, or the tree has finished its phrase
      const pr = w.map.props.find((q) => (q.kind === 'chime' || q.kind === 'chimetree') && q.id === op.id), C = w.chimes;
      if (!pr || !C) this.failed = 'no chime ' + op.id;
      else {
        const count = () => (pr.kind === 'chime' ? C.struck[pr.id] : C.played[pr.id]) || 0; if (this.chimeBase == null) this.chimeBase = count();
        if (count() > this.chimeBase && !C.play) { done = true; this.chimeBase = null; }
        else if (C.play) this.setHeld('forward', false);                                                                              // the tree is playing: listen
        else {
          const cx = Math.floor(pr.x / w.map.cell), cz = Math.floor(pr.z / w.map.cell);
          const stand = op.from ?? [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [cx + dx, cz + dz]).filter(([x, z]) => this.passable0(x, z)).sort((a, b) => Math.hypot((a[0] + 0.5) * w.map.cell - p.x, (a[1] + 0.5) * w.map.cell - p.z) - Math.hypot((b[0] + 0.5) * w.map.cell - p.x, (b[1] + 0.5) * w.map.cell - p.z))[0];
          if (!stand) this.failed = 'no cell beside chime ' + op.id; else if (this.follow(stand, 0.5, 1.2)) { this.aimAt(pr.x, pr.z); this.pressUse(); }
        }
      }
    } else if (op.op === 'waitplatform') {
      const i = w.map.sectors.findIndex((q) => q.id === op.id), def = w.map.sectors[i]; if (!def?.cycle) this.failed = 'no timing platform ' + op.id; else { this.setHeld('forward', false); this.setHeld('sprint', false); done = platformReady(def, w.time, op.at ?? 'high', op.min ?? 3); }
    } else if (op.op === 'waitsector') {
      const s = w.sectors.find((q) => q.id === op.id), def = w.map.sectors.find((q) => q.id === op.id), goal = op.to === 'high' ? def?.high : def?.low;
      if (!s) this.failed = 'no sector ' + op.id; else done = Math.abs(s.h - goal) < 1e-6 && Math.abs(s.target - goal) < 1e-6;
    }
    else this.failed = 'unknown op ' + op.op;
    if (this.stillFor > this.stuckTicks && op.op !== 'wait' && op.op !== 'waitsector' && op.op !== 'waitplatform' && op.op !== 'killboss' && !done) this.failed = `stuck during op ${this.i} (${op.op}) at ${p.x.toFixed(1)},${p.z.toFixed(1)}`;
    if (done) { this.log.push({ op: op, tick: w.tick }); this.i++; this.opTicks = 0; this.path = null; this.setHeld('forward', false); this.setHeld('sprint', false); this.stillFor = 0; }
  }
}
