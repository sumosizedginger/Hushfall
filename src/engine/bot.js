// Semantic route bot. It READS world state but ACTS only through InputState (press/release/addYaw), i.e. the same path as a
// human. Used for canonical play paths and regression tests. Route ops: goto | use | kill | wait | switch {id} | waitsector {id, to} | waitplatform {id, at: 'high'|'low', min} (a timing platform, PT-029) | ride {id, board: [cx, cz], from: vertex, to: vertex, exit: [cx, cz]} (PT-046: wait on the dock beside a car's stop, step on while it dwells, ride it, step off at another stop).
import { PLAYER, WEAPONS, ENEMIES, PROPS, PICKUPS, STEP, FX } from './defs.js';
import { hasLOS, moveClear } from './world.js';
import { cellFloor, fxAt } from './terrain.js';
import { gateRemaining, sporeState } from './breath.js';
import { platformReady } from './platforms.js';
import { lockBusy } from './airlock.js';                                                  // PT-033: a lock's second door waits for the air: the bot stands and waits, as it does at a sound-lock
import { loadState, loadAtCell } from './loads.js';
import { activeLoad, loadCount, loadCost } from './ammoloads.js';                            // PT-056: the bot reads the pairing table of the ammunition loads (only once it carries one)
import { conditionMet } from './script.js';                                                // PT-046: the waitfor op asks the same question a trigger does
import { carState, carCovers } from './cars.js';                                           // PT-046: the ride op

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
    const w = this.w, p = w.player; let best = null, bd = Infinity, bossT = null;
    const ringUp = w.enemies.some((n) => ENEMIES[n.kind].node && n.state !== 'dead'), conductor = w.enemies.find((n) => ENEMIES[n.kind].unison && n.state !== 'dead'), choirG = conductor ? ENEMIES[conductor.kind].unison.group : null;
    for (const e of w.enemies) {
      if (e.state === 'dead' || ENEMIES[e.kind].peaceful || (e.state === 'idle' && !ENEMIES[e.kind].node && !(choirG && e.group === choirG))) continue;                   // (a singer of a living conductor's choir is a target even asleep: PT-046)
      if (ringUp && ENEMIES[e.kind].boss) continue;                                                // shielded: cut the ring first
      if (ENEMIES[e.kind].unison && w.enemies.some((o) => o.group === ENEMIES[e.kind].unison.group && o.state !== 'dead')) continue;          // PT-046: a conductor whose choir still sings takes a twentieth of a hit: the singers first
      const d = Math.hypot(e.x - p.x, e.z - p.z), lim = ENEMIES[e.kind].hive ? 45 : (ENEMIES[e.kind].node && this.nodeReach) ? this.nodeReach : (this.standing || 16);          // (PT-046: the Hive Cantor is a target from the far tiers, where its low ring does not reach; anything else within 16 m as ever)
      if (d < lim && hasLOS(w, p.x, p.z, e.x, e.z)) { if (ENEMIES[e.kind].hive) { if (!bossT || d < bossT.d) bossT = { e, d }; } else if (d < bd) { best = e; bd = d; } }
    }
    if (!best && bossT) return bossT;                                                                         // (the conductor only when nothing else is in reach: its summoned Choristers first, as a human would)
    return best ? { e: best, d: bd } : null;
  }
  /** PT-056: the pairing table. Plate: the penetrator. A bell node, or something that dashes (a Gaunt): rime. Anything of some substance (a pack, 40 hit points and over) that is not standing in water: slag. Otherwise the standard. */
  wantLoad(t, gun) {
    const w = this.w, p = w.player, d = ENEMIES[t.e.kind], has = (id) => loadCount(p, gun, id) >= loadCost(id, gun);
    if (d.armor && has('pen')) return 'pen';
    if ((d.node || d.lunge) && has('rime')) return 'rime';
    const c = fxAt(w, t.e.x, t.e.z), wet = c === 'w' || !!FX[c]?.water;
    if (!wet && !d.node && !d.boss && (t.e.hp >= 40 || w.enemies.some((e) => e !== t.e && e.state !== 'dead' && e.state !== 'idle' && Math.hypot(e.x - t.e.x, e.z - t.e.z) < 4.5)) && has('slag')) return 'slag';
    return null;
  }
  fight(t) {
    const w = this.w, p = w.player;
    // weapon choice: scattergun for Gaunts and anything close (if it has shells), flare cannon for range
    const sr = p.weapon === 'scattergun' ? 1.3 : 1, rr = p.weapon === 'rivet' ? 1.3 : 1;                       // hysteresis: hovering around a threshold must not flip weapons (every flip costs the raise time)
    const plated = !!ENEMIES[t.e.kind].armor, hr = p.weapon === 'harpoon' ? 1.3 : 1, hd = ENEMIES[t.e.kind];
    const wantHarpoon = p.weapons.includes('harpoon') && (p.ammo.bolt || 0) > 0 && ((plated && t.d > 3) || (t.d > 9 / hr && (!!hd.ranged || !!hd.hover) && !(hd.hive && (p.ammo.rivet || 0) > 30 && t.d < 15)));          // (the Hive Cantor hovers, but the rivet driver is the faster gun on it: 77 against the harpoon's 59 a second)       // the long gun: plate (the bolt goes through it) and shooters or flyers that are not close
    const near = w.enemies.filter((e) => e !== t.e && e.state !== 'dead' && e.state !== 'idle' && !ENEMIES[e.kind].peaceful && Math.hypot(e.x - t.e.x, e.z - t.e.z) < 4.5).length;
    const wantArc = !wantHarpoon && p.weapons.includes('arc') && (p.ammo.cell || 0) > 0 && t.d < (p.weapon === 'arc' ? 11 : 9) && (near >= 1 || !!hd.hover);       // the lamp: a clutch of bodies, or a flyer, inside its reach (the arc jumps)
    const wantFlare = !wantHarpoon && !wantArc && plated && (p.ammo.flare || 0) > 0 && t.d > 4;                    // front plate: only splash gets through cleanly
    const wantScatter = !wantFlare && !wantHarpoon && !wantArc && p.weapons.includes('scattergun') && (p.ammo.shell || 0) > 0 && (t.d < 7 * sr || (t.e.kind === 'gaunt' && t.d < 10 * sr) || ((p.ammo.flare || 0) <= 0 && (p.ammo.rivet || 0) <= 0));   // and shells are all there is
    const wantRivet = !wantScatter && !wantFlare && !wantHarpoon && !wantArc && p.weapons.includes('rivet') && (p.ammo.rivet || 0) > 0 && (t.d < 14 * rr || (p.ammo.flare || 0) <= 0);                 // mid-range: the driver's steady stream (flares are for range and crowds)
    const lastResort = p.weapons.includes('carbine') && (p.ammo.round || 0) > 0 && !p.weapons.some((id) => BOT_GUNS.has(id) && (p.ammo[WEAPONS[id].ammo] || 0) > 0 && (id !== 'arc' || t.d < 11));          // PT-023: the carbine is the bot's LAST resort: with it in the pocket the sim's flare feed no longer carries a bot that has run out of everything else, so the bot has to use it
    let wantId = wantHarpoon ? 'harpoon' : wantArc ? 'arc' : wantScatter ? 'scattergun' : wantRivet ? 'rivet' : lastResort ? 'carbine' : 'flare';
    if (this.fallback) {                                                                                                    // PT-046 (an op with `fallback: true`: C2M28, C2M29): when the gun it wants is empty it takes whichever gun still has something in it, as a human does
      const has = (id) => p.weapons.includes(id) && (p.ammo[WEAPONS[id].ammo] || 0) > 0;
      if (!has(wantId)) { const alt = ['rivet', 'harpoon', 'scattergun', 'carbine', 'arc', 'flare'].find((id) => has(id) && (id !== 'arc' || t.d < 11) && (id !== 'scattergun' || t.d < 12)); if (alt) wantId = alt; }
    }
    if (p.weapon !== wantId && p.weapons.includes(wantId) && w.tick - (this.lastSwitch ?? -99) > 30) { const key = wantId === 'flare' ? 'weapon1' : wantId === 'scattergun' ? 'weapon2' : wantId === 'rivet' ? 'weapon3' : wantId === 'harpoon' ? 'weapon4' : wantId === 'arc' ? 'weapon5' : 'weapon7'; this.in.press(key); this.pendingRelease = key; this.lastSwitch = w.tick; }        // a slot key is a tap: released next tick, or the same slot could never be pressed again
    if (p.loads?.[p.weapon] && p.weapon === wantId && p.switchT <= 0 && w.tick - (this.lastLoadKey ?? -99) > 14) {                                // PT-056: turn the gun to the load the pairing table names for this target (none = the standard); one tap at a time, the sim cycles in order
      const want = this.wantLoad(t, p.weapon); if (want !== activeLoad(p, p.weapon)) { this.in.press('load'); this.releaseLoad = true; this.lastLoadKey = w.tick; }
    }
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
    const inRange = def.kind === 'arc' ? t.d < def.range * 0.9 : hitscan ? t.d < def.range * (ENEMIES[t.e.kind].hive ? 0.9 : 0.5) : t.d > 2.8;          // (a gun is good for most of its range against the Hive Cantor, which the bot shoots from a far tier)
    const shoot = Math.abs(yawErr) < (hitscan ? 0.09 : 0.06) && inRange && (p.ammo[def.ammo] || 0) > 0 && p.ads > 0.85 && p.switchT <= 0;
    this.setHeld('fire', shoot && (def.charge ? w.tick % 10 < 5 : true));         // a charging weapon (the lamp) fires on RELEASE: the bot taps it, five ticks down and five up (about six a second)
    this.setHeld('back', !hitscan && t.d < 2.8);                       // keep clear of our own flare splash
    this.setHeld('forward', !inRange && t.d > 6);                       // not close enough for this weapon: close the distance instead of standing there (a bot that HOLDS a position, PT-046 C2M28, lets the enemy come: the landing is where the supplies are)
    // out of ammunition for everything it carries: the bot closes in and bashes (key V) instead of standing there with a dry gun (the old last-resort flare feed is gone, fists never run out)
    const dry = !lastResort && !p.weapons.some((id) => BOT_GUNS.has(id) && (p.ammo[WEAPONS[id].ammo] || 0) > 0) && !plated && !ENEMIES[t.e.kind].boss;          // (never walks up to plate or a boss with fists: a player flanks, the bot just waits for the feed's flare)
    if (dry) { this.setHeld('fire', false); this.setHeld('aim', false); this.setHeld('back', false); this.setHeld('forward', t.d > 1.6); if (t.d < 2.3 && w.tick % 30 === 0) { this.in.press('melee'); this.releaseMelee = true; } }
    const dodge = (t.e.lungeT ?? -1) >= 0 || (t.e.chargeT ?? -1) >= 0, shooter = this.weave && (this.weave === 2 ? this.shootersNear() : !!ENEMIES[t.e.kind].ranged && t.d > 5), weave = shooter && ((w.tick / 36) | 0) % 2 === 0;   // strafe in alternating half-second runs while trading with a shooter: slow toll-shots miss a moving target
    this.setHeld('right', dodge || weave); this.setHeld('left', shooter && !weave && !dodge);   // a crouching Gaunt or a lowered Warden shoulder is about to dash: sidestep it
  }
  /** PT-052 (Bot v2, first half): weave: 2 strafes while ANY awake shooter is within range, not only while the creature it is fighting is one (a Bellhand's toll-shot is aimed at where the player IS: a moving player is not hit; with a Tollbearer in front and three Bellhands behind, the old weave stood still) */
  shootersNear() { const w = this.w, p = w.player; for (const e of w.enemies) { if (e.state === 'dead' || e.state === 'idle') continue; const R = ENEMIES[e.kind].ranged, Sn = ENEMIES[e.kind].snipe; if (R && Math.hypot(e.x - p.x, e.z - p.z) < Math.min(R.maxRange, 20)) return true; if (Sn && Math.hypot(e.x - p.x, e.z - p.z) < Sn.max) return true; } return false; }          // (PT-060: a Marksman's line is a shooter too)
  /**
   * The boss op: cut the bell ring, then the singer. A tone pulse (windup or ring in flight) is answered by getting behind stone: cover is any nearby point the boss has no line to.
   * Otherwise fight the nearest thing in view; with nothing in view, walk toward the next node (or the boss once the ring is broken).
   */
  bossTick() {
    const w = this.w, p = w.player, boss = w.enemies.find((e) => ENEMIES[e.kind].boss && e.state !== 'dead');
    if (!boss) { for (const a of ['fire', 'aim', 'forward', 'back', 'right', 'sprint']) this.setHeld(a, false); return true; }
    // the Gate Warden stands a whole arena away: a ring it has only just drawn breath for, or one that is still forty metres off, is no reason to stop (a human takes cover when the ring is about to arrive, and always from the beam)
    if (boss.rb && (this.dodgeSpikes() || this.dodgeCharge(boss))) return false;                                                                       // (PT-046, C2M29: the spikes first)
    const far = !!ENEMIES[boss.kind].sweep;
    const ringsMatter = (!far || p.hp < 45) && !(boss.rb?.last && p.hp >= 45);                                           // (the Last Note's ring comes every three seconds: a bot with hit points to spare fights through it instead of cowering for good)                                                                                // a ring costs 13: only the beam is worth hiding from while there is hit points to spare
    const danger = (ringsMatter && (boss.pulseT ?? -1) >= 0) || (boss.sweepT ?? -1) >= 0 || (boss.echoT ?? 0) > 0 || (ringsMatter && w.pulses.some((q) => (q.back ? q.r > Math.hypot(p.x - q.x, p.z - q.z) - 1.5 : q.r < Math.hypot(p.x - q.x, p.z - q.z) + 1.5)));      // (PT-039: a ring that has turned back is dangerous while it is still outside the player: it is coming in)
    if (danger && !this.heightClear(boss, p.y)) {
      if (this.exposedTo(boss, p.x, p.z) && (!this.cover || w.tick > this.coverExpires)) { this.cover = this.findCover(boss); this.coverExpires = w.tick + 45; }
      if (this.cover && this.exposedTo(boss, p.x, p.z)) {                                       // still exposed: go
        const t = this.combatTarget(); if (t && t.d < 5) this.fight(t); else { this.setHeld('fire', false); this.setHeld('aim', false); this.setHeld('back', false); this.setHeld('right', false); }
        this.steerTo(this.cover[0], this.cover[1], 0.4); this.setHeld('sprint', true); return false;
      }
      if (this.cover) { const t = this.combatTarget(); if (t && t.d < 5) this.fight(t); else for (const a of ['fire', 'forward', 'sprint']) this.setHeld(a, false); return false; }   // safe: hold until it passes
    } else this.cover = null;
    const t = this.combatTarget();
    if (t) { this.calm = 0; this.fight(t); if (this.heightClear(boss, p.y)) this.setHeld('forward', false); return false; }                  // (PT-046: on the tier it stays on the tier: walking down to the conductor is walking into its ring)
    this.setHeld('fire', false); this.setHeld('aim', false); this.setHeld('back', false); this.setHeld('right', false);
    const want = this.forage(); if (want) { if (this.follow([Math.floor(want.x / w.map.cell), Math.floor(want.z / w.map.cell)], 0.5)) { const st = this.forageStuck?.id === want.id ? this.forageStuck : (this.forageStuck = { id: want.id, n: 0 }); if (++st.n > 180) (this.skipPickups ??= new Set()).add(want.id); } return false; }      // `follow` says 'close enough' (something sits on the exact spot): a pickup it cannot collect is given up, or the bot would forage at it forever instead of going for the boss              // quiet moment: top up
    const cg = ENEMIES[boss.kind].unison?.group, singers = cg ? w.enemies.filter((e) => e.group === cg && e.state !== 'dead').sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)) : [];
    const nodes = (singers.length ? singers : w.enemies.filter((e) => ENEMIES[e.kind].node && e.state !== 'dead')).slice().sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const goal = nodes[0] ?? boss, m = w.map;
    if (boss.rb && goal !== boss) {                                                                                         // PT-046 (C2M29): an anchor with a pillar in front of it is shot from the next place on the SAME tier where it shows, not from the middle of the floor under the clapper
      const cx = boss.rb.cx, cz = boss.rb.cz, r = Math.hypot(p.x - cx, p.z - cz), a0 = Math.atan2(p.z - cz, p.x - cx);
      if (r > 8 && !hasLOS(w, p.x, p.z, goal.x, goal.z)) for (let k = 1; k <= 24; k++) for (const sgn of [1, -1]) {
        const a = a0 + sgn * k * (Math.PI / 24), gx = Math.floor((cx + Math.cos(a) * r) / m.cell), gz = Math.floor((cz + Math.sin(a) * r) / m.cell), x = (gx + 0.5) * m.cell, z = (gz + 0.5) * m.cell;          // (PT-076: the line is judged from the middle of the cell the bot will stand in: judged from the ring point, a cell that does NOT show the anchor was "arrived at" and the bot stood there for good)
        if ((gx === Math.floor(p.x / m.cell) && gz === Math.floor(p.z / m.cell)) || this.anchorSkip?.has(gx + ',' + gz) || !hasLOS(w, x, z, goal.x, goal.z) || !this.plainWalk(x, z, x, z)) continue;
        const key = gx + ',' + gz, st = this.anchorStuck?.key === key ? this.anchorStuck : (this.anchorStuck = { key, x: p.x, z: p.z, n: 0 });          // (PT-076: a spot it has not got a step nearer in two seconds, a tier edge it cannot step down, is given up for the next one)
        if (Math.hypot(p.x - st.x, p.z - st.z) > 0.5) { st.x = p.x; st.z = p.z; st.n = 0; } else if (++st.n > 120) (this.anchorSkip ??= new Set()).add(key);
        this.follow([gx, gz], 0.6, 0.8); return false;
      }
    }
    this.follow([Math.floor(goal.x / m.cell), Math.floor(goal.z / m.cell)], 0.6, boss.rb && !hasLOS(w, p.x, p.z, goal.x, goal.z) ? 1.5 : 7);          // (PT-046, C2M29: within seven metres but behind a pillar is not arrived: walk round it)
    return false;
  }
  /** PT-046 (C2M29): a straight walk over plain floor (no door, no secret panel, nothing inside a secret room): a spot to dodge or hide in must not be a place the bot would have to open a panel to reach */
  plainWalk(x0, z0, x1, z1) {
    const m = this.w.map, n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5));
    for (let i = 1; i <= n; i++) {
      const cx = Math.floor((x0 + (x1 - x0) * i / n) / m.cell), cz = Math.floor((z0 + (z1 - z0) * i / n) / m.cell), k = m.kind(cx, cz);
      if (k !== 'floor' && k !== 'outdoor') return false;
      for (const sc of m.secrets) if (sc.cells.some(([a, b]) => a === cx && b === cz)) return false;
    }
    return true;
  }
  /** PT-046 (C2M29): the Root Bell's rooted spikes are called a second ahead at the place you stand: step out of the circle (the nearest clear point two and a half metres off it) and keep going till it has struck */
  dodgeSpikes() {
    const w = this.w, p = w.player, S = ENEMIES.rootbell.bell.spikes; if (!w.spikes?.length) return false;
    for (const q of w.spikes) {
      if (q.struck) continue; const d = Math.hypot(p.x - q.x, p.z - q.z); if (d >= S.r + 0.9) continue;
      const base = d > 0.2 ? Math.atan2(p.x - q.x, p.z - q.z) : 0; let best = null;
      for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.2, -2.2, Math.PI]) {
        const a = base + off, x = q.x + Math.sin(a) * (S.r + 1.6), z = q.z + Math.cos(a) * (S.r + 1.6);
        if (moveClear(w, p.x, p.z, x, z, PLAYER.radius + 0.1) && this.plainWalk(p.x, p.z, x, z) && Math.abs(cellFloor(w, Math.floor(x / w.map.cell), Math.floor(z / w.map.cell)) - p.y) < 0.9) { best = [x, z]; break; }
      }
      if (best) { this.setHeld('fire', false); this.setHeld('aim', false); this.steerTo(best[0], best[1], 0.3); this.setHeld('sprint', true); return true; }
    }
    return false;
  }
  /** PT-046 (C2M29): the clapper's charge is a straight dash after a second's tell: leave its line (a body's width and more on either side), whichever creature is nearer */
  dodgeCharge(boss) {
    const w = this.w, p = w.player; if ((boss.chargeT ?? -1) < 0) return false;
    const fx = Math.sin(boss.yaw), fz = Math.cos(boss.yaw), rx = p.x - boss.x, rz = p.z - boss.z, along = rx * fx + rz * fz, lat = rx * fz - rz * fx;
    if (along < -3 || along > 40 || Math.abs(lat) > 3.6) return false;
    const sgn = lat >= 0 ? 1 : -1;
    for (const s2 of [sgn, -sgn]) {
      const x = p.x + fz * s2 * 4.2, z = p.z - fx * s2 * 4.2;
      if (moveClear(w, p.x, p.z, x, z, PLAYER.radius + 0.1) && this.plainWalk(p.x, p.z, x, z) && Math.abs(cellFloor(w, Math.floor(x / w.map.cell), Math.floor(z / w.map.cell)) - p.y) < 0.9) { this.setHeld('fire', false); this.setHeld('aim', false); this.steerTo(x, z, 0.3); this.setHeld('sprint', true); return true; }
    }
    return false;
  }
  /** a pickup worth walking to when nothing is shooting: health when hurt, armour when bare, ammo when low (within 16 m) */
  forage() {
    const w = this.w, p = w.player; let best = null, bd = 16;
    const OWNER = { flare: 'flare', shell: 'scattergun', rivet: 'rivet', bolt: 'harpoon', cell: 'arc' };                 // ammunition for a gun it does not carry is not worth a walk (the boxes may be there for a later weapon, or for the player who found the gun)
    for (const it of w.pickups) {
      if (this.skipPickups?.has(it.id)) continue;
      if (w.map.secrets.length) { const cx = Math.floor(it.x / w.map.cell), cz = Math.floor(it.z / w.map.cell); if (w.map.secrets.some((sc) => sc.cells.some(([a, b]) => a === cx && b === cz))) continue; }          // (PT-046: a box in a secret room is not on the way: the main route finds no secret)
      const def = PICKUPS[it.kind], d = Math.hypot(it.x - p.x, it.z - p.z); if (d >= bd || (it.drop && d > 7) || Math.abs(it.y - p.y) > 1.2) continue;          // a box a creature dropped is worth a short walk (7 m; the magnet brings it the last 3): not a march across a boss arena (PT-025)
      const low = def.type === 'health' ? p.hp < 85 : def.type === 'armor' ? p.armor < 40 : def.type === 'ammo' ? p.weapons.includes(OWNER[def.ammo] ?? 'none') && (p.ammo[def.ammo] || 0) < (def.ammo === 'rivet' ? 90 : def.ammo === 'shell' ? 14 : 8) : false;
      if (low) { best = it; bd = d; }
    }
    return best;
  }
  /** PT-046: the Hive Cantor's ring is a plane `h` metres high at the conductor's floor: a player standing more than that above it is under no ring and need not hide (a human climbs a tier). Only for a boss whose rings say so (`hive.ring.h`). */
  /** the vertical reach of the boss's ring right now (m above its floor): the Hive Cantor's ring, the Root Bell's ring and (once the Last Note has begun) its taller one; null for a boss with no low ring */
  ringH(boss) { const d = ENEMIES[boss.kind], b = d.bell; return d.hive?.ring?.h ?? (b ? (boss.rb?.last ? b.lastRing.h : (b.ring.h ?? 1)) : null); }
  heightClear(boss, y) { const h = this.ringH(boss); if (h == null) return false; const up = y - boss.y; const clear = up > h + 0.6 || (this.tierHold && up > h + 0.1); this.tierHold = clear; return clear; }          // (a little hysteresis: standing on the lip of a tier is still standing on it)
  /** a point the boss can see: for the Gate Warden also a point a body-width to either side of it (its beam is 0.9 m wide: a corner is not cover from it) */
  exposedTo(boss, x, z) {
    const w = this.w, rh0 = this.ringH(boss); if (rh0 != null) { const cs = w.map.cell, fy = cellFloor(w, Math.floor(x / cs), Math.floor(z / cs)); if (fy - boss.y > rh0 + 0.6) return false; }          // (a floor above the ring's plane is cover from it)
    if (hasLOS(w, boss.x, boss.z, x, z)) return true;
    if (!ENEMIES[boss.kind].sweep) return false;
    const dx = x - boss.x, dz = z - boss.z, l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l;
    return hasLOS(w, boss.x, boss.z, x + px * 1.0, z + pz * 1.0) || hasLOS(w, boss.x, boss.z, x - px * 1.0, z - pz * 1.0);
  }
  /** the nearest point within 9 m that the boss has no line to (behind a pillar), or null */
  findCover(boss) {
    const w = this.w, p = w.player; let best = null, bd = 1e9;
    const rh = this.ringH(boss);
    if (rh != null) {                                                                                                         // PT-046: against the Hive Cantor's low ring a human climbs a tier: the nearest floor a metre and more above the conductor's, within 14 m, with a clear walk (and a line to the boss: from there it can be shot)
      for (const r of [2, 3, 4, 5.5, 7, 9, 11, 14]) for (let k = 0; k < 24 && !best; k++) {
        const a = k / 24 * Math.PI * 2, x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r, cs = w.map.cell;
        if (cellFloor(w, Math.floor(x / cs), Math.floor(z / cs)) - boss.y <= rh + 0.6 || !moveClear(w, p.x, p.z, x, z, PLAYER.radius + 0.1) || !this.plainWalk(p.x, p.z, x, z) || !hasLOS(w, boss.x, boss.z, x, z)) continue;
        best = [x, z];
      }
      if (best) return best;
    }
    for (const r of [2, 3, 4, 5.5, 7, 9]) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      if (this.exposedTo(boss, x, z) || !moveClear(w, p.x, p.z, x, z, PLAYER.radius + 0.1) || !this.plainWalk(p.x, p.z, x, z)) continue;
      const d = r + 0.3 * Math.hypot(x - boss.x, z - boss.z); if (d < bd) { bd = d; best = [x, z]; }
    }
    return best;
  }
  /**
   * PT-046 (E8b): ride a car. Phases: 0 walk to the dock cell beside the car's stop; 1 wait there until the car stands at the `from` stop with at least 3 s of dwell left; 2 step onto the deck; 3 stay on it (steered to its middle) until
   * it stands at the `to` stop; 4 step off to the `exit` cell. Phases 2 to 4 ignore combat (a human is busy getting on and off); phases 0 and 1 fight as any op does.
   */
  rideOp(op) {
    const w = this.w, p = w.player, m = w.map, pool = op.id && op.id !== '*' ? m.cars.filter((c) => c.id === op.id) : m.cars;
    if (!pool.length) { this.failed = 'no car ' + op.id; return false; }
    if (this.rideState?.i !== this.i) this.rideState = { i: this.i, phase: 0, since: w.tick, car: null };
    const R = this.rideState, cell = m.cell;
    if (R.phase === 0) { if (this.follow(op.board, 0.6, 0.9)) { R.phase = 1; } return false; }
    if (R.phase === 1) {                                                                                                      // wait for ANY car of the pool to stand at the stop with time to spare
      if (Math.hypot((op.board[0] + 0.5) * cell - p.x, (op.board[1] + 0.5) * cell - p.z) > 3.5 * cell) { R.phase = 0; return false; }       // a fight has drawn it off the dock: walk back
      this.setHeld('forward', false); this.setHeld('sprint', false);
      for (const c of pool) { const st = carState(c, w.time); if (st.stop === op.from && st.until >= 3.2) { R.car = c; R.phase = 2; R.since = w.tick; break; } }
      return false;
    }
    const car = R.car, st = carState(car, w.time), over = carCovers(car, st, p.x, p.z, -0.2);
    if (R.phase === 2) {
      if (over && Math.hypot(st.x - p.x, st.z - p.z) < 1.2) { R.phase = 3; R.since = w.tick; this.setHeld('forward', false); this.setHeld('sprint', false); return false; }
      if (st.stop !== op.from || st.until < 0.9) { R.phase = 1; R.car = null; this.setHeld('forward', false); return false; }       // it is leaving: wait for the next
      this.setHeld('sprint', false); this.steerTo(st.x, st.z, 0.5); return false;
    }
    if (R.phase === 3) {
      this.setHeld('sprint', false);
      if (st.stop === op.to && st.until >= 1.6) { R.phase = 4; R.since = w.tick; return false; }
      if (!over) { R.phase = 0; R.car = null; this.setHeld('forward', false); return false; }                                  // fell off: start again
      const t = this.combatTarget();                                                                                           // a rider shoots back, standing on the deck (a human would not walk off it)
      if (t) { this.fight(t); for (const a of ['forward', 'back', 'left', 'right']) this.setHeld(a, false); return false; }
      this.setHeld('fire', false); this.setHeld('aim', false); this.steerTo(st.x, st.z, 0.7); return false;
    }
    // phase 4: step off
    const gx = (op.exit[0] + 0.5) * cell, gz = (op.exit[1] + 0.5) * cell;
    if (Math.hypot(gx - p.x, gz - p.z) < 0.9 && !over) { this.setHeld('forward', false); return true; }
    if (w.tick - R.since > 60 * 12) { this.failed = 'could not step off the car ' + car.id; return false; }
    this.setHeld('sprint', false); this.steerTo(gx, gz, 0.3); return false;
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
    if (this.releaseLoad) { this.in.release('load'); this.releaseLoad = false; }
    if (this.failed || this.done) return;
    const w = this.w, p = w.player, op = this.route[this.i];
    if (this.usePressed && this.in.down.has('use')) { this.in.release('use'); }   // 1-tick press: released the tick after
    else if (this.usePressed) this.usePressed = false;
    if (p.lamp) {                                                                    // PT-038 (E5): in a dark place the bot carries its lantern lit, unless a route op says otherwise ({ op: 'lamp', on: false })
      if (this.lampPressed) { this.in.release('lamp'); this.lampPressed = false; }
      else if (w.map.dark && (op.op === 'lamp' ? op.on !== false : (this.lampWanted ?? true)) !== p.lamp.on && (p.lamp.on || p.lamp.oil > 0 || p.lamp.eternal)) { this.in.press('lamp'); this.lampPressed = true; }
    }
    if (++this.opTicks > (op.max ? op.max * 60 : this.maxOp * (op.op === 'killboss' ? 2 : 1))) { this.failed = `op ${this.i} (${op.op}) timed out`; return; }
    if (p.air) { for (const a of ['forward', 'back', 'left', 'right', 'sprint']) this.setHeld(a, false); this.stillFor = 0; this.lastAir = w.tick; return; }       // PT-032: in the air the bot rides the arc (a steered bot misses what the throw would have hit)
    const moved = Math.hypot(p.x - this.lastPos[0], p.z - this.lastPos[1]);
    this.stillFor = moved > 0.02 ? 0 : this.stillFor + 1; if (moved > 0.02) this.lastPos = [p.x, p.z];
    if (this.escapePool()) { this.stillFor = 0; return; }
    this.fallback = !!op.fallback; this.nodeReach = op.op === 'killboss' && op.fallback ? 26 : 0;                                     // (the Root Bell's anchors are shot from the tier they can be seen from: a human fires at what he can see)
    this.standing = op.op === 'waitfor' ? (op.reach ?? 26) : 0;                                                                   // PT-046 (C2M28): a bot that holds a position answers a shooter at the range the shooter has, as a human would (16 m on the move, as ever)
    const t = op.op === 'killboss' || this.atUsePoint(op) || (op.op === 'ride' && (this.rideState?.i === this.i ? this.rideState.phase >= 2 : false)) ? null : this.combatTarget();
    if (t) {
      this.calm = 0; this.wasFighting = true; this.fight(t); if (t.d <= 4 && w.tick - (this.lastAir ?? -99999) < 900) this.stillFor = 0;          // (PT-046: landing from a vent among them and fighting them in your face is not being stuck)
      { let hp = 0; for (const e of w.enemies) if (e.state !== 'dead') hp += e.hp; if (this.foeHp != null && hp < this.foeHp - 1e-6) this.stillFor = 0; this.foeHp = hp; }          // (PT-076: damage dealt is progress: a Bellhand that runs across between shots and dodges takes longer than four seconds at range, and a brawl in its face that ends with the nearest target far off was both called "stuck in combat")
      // a human stops trading shots with something pinned behind cover and gets on with it: after ~3 s of one fight on a non-kill op, ignore combat for 2.5 s
      if ((op.op === 'goto' || op.op === 'use' || op.op === 'chime') && t.d > 4) { if (++this.fightTicks > 200) { this.fightTicks = 0; this.noFightUntil = w.tick + 150; this.stillFor = 0; } }          // never walk away from something that is in your face (PT-076: and the walk on gets its own time: the stuck clock had run through the fight and failed the bot first)
      if (op.op === 'kill' || op.op === 'ride') { this.stillFor = 0; return; } if (op.op !== 'wait' && op.op !== 'waitfor' && op.op !== 'waitsector' && op.op !== 'waitplatform') { if (this.stillFor > this.stuckTicks && t.d > 6) this.failed = 'stuck in combat'; return; } }          // (ENEMY ACTIONS, 2026-10-26: a fight within 6 m is a fight, not being stuck: the bot's own shots kept knocking a Bulwark back from 2.7 to 5 m on the Hollow Stair, and the old 4 m called that stuck)
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
    else if (op.op === 'waitfor') done = conditionMet(w, { when: op.when });                                           // PT-046 (C2M28): stand and fight until a trigger condition holds ('time:200', 'dead:w8', a list is an AND); the wave comes to the bot
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
    } else if (op.op === 'ride') {
      done = this.rideOp(op);
    } else if (op.op === 'waitplatform') {
      const i = w.map.sectors.findIndex((q) => q.id === op.id), def = w.map.sectors[i]; if (!def?.cycle) this.failed = 'no timing platform ' + op.id; else { this.setHeld('forward', false); this.setHeld('sprint', false); done = platformReady(def, w.time, op.at ?? 'high', op.min ?? 3); }
    } else if (op.op === 'waitsector') {
      const s = w.sectors.find((q) => q.id === op.id), def = w.map.sectors.find((q) => q.id === op.id), goal = op.to === 'high' ? def?.high : def?.low;
      if (!s) this.failed = 'no sector ' + op.id; else done = Math.abs(s.h - goal) < 1e-6 && Math.abs(s.target - goal) < 1e-6;
    }
    else this.failed = 'unknown op ' + op.op;
    if (this.stillFor > this.stuckTicks && op.op !== 'wait' && op.op !== 'waitfor' && op.op !== 'waitsector' && op.op !== 'waitplatform' && op.op !== 'killboss' && op.op !== 'ride' && !done) this.failed = `stuck during op ${this.i} (${op.op}) at ${p.x.toFixed(1)},${p.z.toFixed(1)}`;
    if (done) { this.log.push({ op: op, tick: w.tick }); this.i++; this.opTicks = 0; this.path = null; this.setHeld('forward', false); this.setHeld('sprint', false); this.stillFor = 0; }
  }
}
