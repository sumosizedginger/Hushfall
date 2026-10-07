// PT-013: controller support. The module is pure (a snapshot of a pad in, plain data out), so everything is tested here with FAKE snapshots; no controller was available when it was written, so the standard
// button numbering is the W3C standard mapping from the spec (the owner's PS5 pad is the real test: design/WEAPONS_AND_CONTROLS_PLAN.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { PAD, PAD_CODES, PAD_DEFAULTS, PAD_ACTIONS, PAD_SETTINGS, PadDevice, deadzone, curve, stickLook, triggerDown, glyphFamily, padGlyph, padLegend, applyPadRebind, sanitizePadBindings, snapshotOf, assistScale, rumbleFor, defaultPadBindings, isPadCode } from '../src/game/gamepad.js';
import { InputState, ACTIONS } from '../src/engine/input.js';
import { createWorld, step, spawnEnemy } from '../src/engine/world.js';
import { parseMap } from '../src/engine/mapformat.js';

const snap = (over = {}, axes = [0, 0, 0, 0], id = 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)') => {
  const buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }));
  for (const [i, v] of Object.entries(over)) buttons[Number(i)] = { pressed: v >= 0.5, value: v };
  return { id, buttons, axes };
};

test('the standard layout the module assumes, and the default bindings of the plan (one button, one action; every code real)', () => {
  assert.deepEqual([PAD.A, PAD.B, PAD.X, PAD.Y, PAD.LB, PAD.RB, PAD.LT, PAD.RT, PAD.VIEW, PAD.MENU, PAD.LS, PAD.RS, PAD.UP, PAD.DOWN, PAD.LEFT, PAD.RIGHT], Array.from({ length: 16 }, (_, i) => i));
  const seen = new Map(); for (const [a, codes] of Object.entries(PAD_DEFAULTS)) for (const c of codes) { assert.ok(PAD_CODES.includes(c), `${a}: ${c}`); assert.ok(!seen.has(c), `${c} bound to both ${seen.get(c)} and ${a}`); seen.set(c, a); assert.ok(PAD_ACTIONS.includes(a)); assert.ok(ACTIONS.includes(a), a + ' is a real action'); }
  assert.deepEqual([PAD_DEFAULTS.fire, PAD_DEFAULTS.aim, PAD_DEFAULTS.use, PAD_DEFAULTS.melee, PAD_DEFAULTS.sprint, PAD_DEFAULTS.weaponLast, PAD_DEFAULTS.pause, PAD_DEFAULTS.map], [['Pad7'], ['Pad6'], ['Pad0'], ['Pad11'], ['Pad10'], ['Pad3'], ['Pad9'], ['Pad8']], 'R2/RT fire, L2/LT aim, Cross/A use, R3 melee, L3 sprint, Triangle/Y last weapon, Options/Menu pause, Create/View map');
  assert.deepEqual([PAD_DEFAULTS.weapon1, PAD_DEFAULTS.weapon2, PAD_DEFAULTS.weapon3, PAD_DEFAULTS.weapon4], [['Pad14'], ['Pad12'], ['Pad15'], ['Pad13']], 'the D-pad: left, up, right, down');
  assert.ok(isPadCode('Pad7') && !isPadCode('KeyW') && !isPadCode('Pad'));
});

test('dead zone: nothing inside it, the live range rescaled so a nudge past it does not jump, full tilt is full', () => {
  assert.deepEqual(deadzone(0.1, 0.1, 0.18), [0, 0]); assert.deepEqual(deadzone(0, 0), [0, 0]);
  const [x, y] = deadzone(1, 0); assert.ok(Math.abs(x - 1) < 1e-9 && y === 0);
  const [a] = deadzone(0.19, 0, 0.18); assert.ok(a > 0 && a < 0.02, 'just past the zone: almost nothing'); const [b] = deadzone(0.59, 0, 0.18); assert.ok(Math.abs(b - 0.5) < 1e-9, 'halfway through the live range is half');
  const [dx, dy] = deadzone(0.8, 0.8, 0.18); assert.ok(Math.hypot(dx, dy) <= 1 && dx === dy, 'a diagonal pushed past the rim stays inside the unit circle');
});
test('look: stick right turns right (negative yaw, as the mouse), stick up looks up, the curve gives fine control, invert flips the pitch, nothing in the dead zone', () => {
  const S = { ...PAD_SETTINGS }; const [yr, pr] = stickLook(1, 0, 0.1, S); assert.ok(yr < 0 && pr === 0, 'right -> yaw < 0'); const [yl] = stickLook(-1, 0, 0.1, S); assert.ok(yl > 0);
  const [, pu] = stickLook(0, -1, 0.1, S); assert.ok(pu > 0, 'up (axis -1) -> pitch +'); const [, pi] = stickLook(0, -1, 0.1, { ...S, invertY: true }); assert.ok(pi < 0);
  assert.ok(Math.abs(yr + S.lookRate * 0.1) < 1e-9, 'full tilt = the look rate'); const half = stickLook(0.6, 0, 0.1, S)[0]; assert.ok(Math.abs(half) < Math.abs(yr) * 0.45, 'a half push turns less than half as fast (the curve): ' + half);
  assert.deepEqual(stickLook(0.1, 0.1, 0.1, S), [0, 0]); assert.ok(Math.abs(stickLook(1, 0, 0.1, S, 0.5)[0] - yr / 2) < 1e-9, 'the scale (sights, assist) halves it'); assert.ok(curve(0.5, 1) === 0.5 && curve(-0.5, 2) === -0.25);
});
test('triggers are buttons with hysteresis: a light squeeze fires, a firmer one aims, a hovering finger does not chatter', () => {
  assert.equal(triggerDown(0.3, false, 0.25, 0.15), true); assert.equal(triggerDown(0.2, true, 0.25, 0.15), true, 'held through the dip'); assert.equal(triggerDown(0.1, true, 0.25, 0.15), false); assert.equal(triggerDown(0.2, false, 0.25, 0.15), false);
  const d = new PadDevice(); let o = d.poll(snap({ 7: 0.3 }), 1 / 60); assert.deepEqual(o.actions.pressed, ['fire']); o = d.poll(snap({ 7: 0.2 }), 1 / 60); assert.deepEqual(o.actions, { pressed: [], released: [] }); o = d.poll(snap({ 7: 0.05 }), 1 / 60); assert.deepEqual(o.actions.released, ['fire']);
  o = d.poll(snap({ 6: 0.4 }), 1 / 60); assert.deepEqual(o.actions.pressed, [], 'L2 at 0.4 is not an aim yet'); o = d.poll(snap({ 6: 0.6 }), 1 / 60); assert.deepEqual(o.actions.pressed, ['aim']);
});
test('a pad poll: button edges become actions once, held buttons do not repeat, a disconnect releases everything, the dead zone applies to movement', () => {
  const d = new PadDevice(); let o = d.poll(snap({ 0: 1, 3: 1 }), 1 / 60); assert.deepEqual(o.pressed.sort(), ['Pad0', 'Pad3']); assert.deepEqual(o.actions.pressed.sort(), ['use', 'weaponLast']); assert.ok(o.active);
  o = d.poll(snap({ 0: 1, 3: 1 }), 1 / 60); assert.deepEqual(o.pressed, [], 'held: no new edge'); o = d.poll(snap({ 3: 1 }), 1 / 60); assert.deepEqual(o.actions.released, ['use']);
  o = d.poll(null, 1 / 60); assert.equal(o.connected, false); assert.deepEqual(o.actions.released, ['weaponLast'], 'unplugged: what it held is released'); assert.equal(d.down.size, 0);
  o = d.poll(snap({}, [0.05, 0.05, 0, 0]), 1 / 60); assert.deepEqual(o.move, [0, 0]); assert.ok(!o.active);
  o = d.poll(snap({}, [0.9, -0.9, 0, 0]), 1 / 60); assert.ok(o.move[0] > 0.6 && o.move[1] > 0.6, 'left stick up-right = move right and FORWARD (axis y is down-positive)');
  const off = new PadDevice(PAD_DEFAULTS, { enabled: false }); assert.equal(off.poll(snap({ 0: 1 }), 1 / 60).actions.pressed.length, 0, 'a disabled pad does nothing');
});
test('glyphs: DualSense (vendor 054c) reads as PlayStation, an Xbox pad as Xbox, the setting overrides, unknown pads read as Xbox', () => {
  assert.equal(glyphFamily('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'), 'ps'); assert.equal(glyphFamily('Xbox 360 Controller (XInput STANDARD GAMEPAD)'), 'xbox'); assert.equal(glyphFamily('054c-0ce6-Wireless Controller'), 'ps');
  assert.equal(glyphFamily('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'), 'xbox'); assert.equal(glyphFamily('whatever'), 'xbox'); assert.equal(glyphFamily('x', 'ps'), 'ps'); assert.equal(glyphFamily('Wireless Controller 054c', 'xbox'), 'xbox');
  assert.deepEqual([padGlyph('Pad7', 'ps'), padGlyph('Pad7', 'xbox'), padGlyph('Pad0', 'ps'), padGlyph('Pad0', 'xbox'), padGlyph('Pad3', 'ps'), padGlyph('Pad3', 'xbox'), padGlyph('Pad9', 'ps'), padGlyph('Pad9', 'xbox'), padGlyph('Pad11', 'ps'), padGlyph('Pad11', 'xbox')], ['R2', 'RT', '✕', 'A', '△', 'Y', 'OPTIONS', 'MENU', 'R3', 'RS']);
  assert.equal(padGlyph('KeyW', 'ps'), 'KeyW'); assert.equal(padGlyph(undefined), '—');
  const ps = padLegend(PAD_DEFAULTS, 'ps'), xb = padLegend(PAD_DEFAULTS, 'xbox'); assert.match(ps, /Fire R2/); assert.match(ps, /Use ✕/); assert.match(xb, /Fire RT/); assert.match(xb, /Use A/); assert.match(ps, /hold: wheel/);
});
test('rebinding a pad button: the code is taken from whoever had it, Pause keeps a button, bad input is refused, stored garbage is repaired', () => {
  const b = defaultPadBindings(); const r = applyPadRebind(b, 'use', 'Pad2'); assert.ok(r.ok && r.bindings.use[0] === 'Pad2' && r.displaced.length === 0);
  const t = applyPadRebind(b, 'use', 'Pad7'); assert.ok(t.ok && t.displaced[0] === 'fire' && t.bindings.fire.length === 0 && t.bindings.use[0] === 'Pad7');
  assert.equal(applyPadRebind(b, 'pause', 'Pad7').ok, true); const nopause = applyPadRebind(b, 'fire', 'Pad9'); assert.equal(nopause.ok, false, 'taking the only Pause button is refused'); assert.match(nopause.reason, /Pause/);
  assert.equal(applyPadRebind(b, 'jump', 'Pad1').ok, false); assert.equal(applyPadRebind(b, 'use', 'KeyE').ok, false); assert.equal(applyPadRebind(b, 'use', 'Pad99').ok, false); assert.deepEqual(b, defaultPadBindings(), 'never mutates its input');
  const fixed = sanitizePadBindings({ fire: ['Pad99'], aim: 'x', use: ['Pad2'], melee: ['Pad2'], junk: ['Pad1'] }); assert.deepEqual(fixed.fire, ['Pad7'], 'a bad entry falls back'); assert.deepEqual(fixed.aim, ['Pad6']); assert.equal(fixed.use[0], 'Pad2'); assert.deepEqual(fixed.melee, [], 'one button, one action: the later claim loses'); assert.ok(!('junk' in fixed));
  assert.deepEqual(sanitizePadBindings(null), defaultPadBindings());
});
test('snapshotOf: a real Gamepad (or null) becomes plain data', () => {
  assert.equal(snapshotOf(null), null); assert.equal(snapshotOf({ connected: false }), null);
  const s = snapshotOf({ id: 'x', connected: true, buttons: [{ pressed: true, value: 1 }, { pressed: false }], axes: [0.5, -0.5] }); assert.deepEqual(s, { id: 'x', buttons: [{ pressed: true, value: 1 }, { pressed: false, value: 0 }], axes: [0.5, -0.5] });
});

test('aim assist: the turn is slowed over an enemy in front, not over one beside you, not over a dead one, not at strength 0; it only READS the world', () => {
  const world = (extra = []) => ({ player: { x: 0, z: 0, yaw: 0 }, enemies: extra });             // facing -z (yaw 0): forward = (0, -1)
  const e = (x, z, state = 'chase') => ({ x, z, state });
  const on = assistScale(world([e(0, -10)]), 0.5), edge = assistScale(world([e(1.2, -10)]), 0.5), off = assistScale(world([e(8, -10)]), 0.5), side = assistScale(world([e(10, 0)]), 0.5);
  assert.ok(on < 0.8 && on > 0.5, 'dead ahead: slowed ' + on); assert.ok(edge > on && edge < 1, 'near the edge: a little'); assert.equal(off, 1); assert.equal(side, 1); assert.equal(assistScale(world([e(0, -10, 'dead')]), 0.5), 1); assert.equal(assistScale(world([e(0, -10)]), 0), 1);
  assert.ok(assistScale(world([e(0, -10)]), 1) < on, 'more strength, more slow'); assert.equal(assistScale(null, 0.5), 1); const frozen = JSON.stringify(world([e(0, -10)])); const w = JSON.parse(frozen); assistScale(w, 0.5); assert.equal(JSON.stringify(w), frozen);
});
test('rumble: every heavy event has a shape, a rivet is a flutter and a charged lamp is a thump; unknown events do nothing', () => {
  for (const type of ['hurt', 'melee_hit', 'parry', 'block', 'guard_break', 'explode', 'player_died']) assert.ok(rumbleFor({ type, amount: 20, kind: 'axe' }), type);
  assert.ok(rumbleFor({ type: 'fire', weapon: 'harpoon' }).strong > rumbleFor({ type: 'fire', weapon: 'rivet' }).strong * 4); assert.ok(rumbleFor({ type: 'fire', weapon: 'arc', charge: 1 }).ms > rumbleFor({ type: 'fire', weapon: 'arc', charge: 0 }).ms * 2);
  assert.equal(rumbleFor({ type: 'door_open' }), null); assert.equal(rumbleFor({ type: 'fire', weapon: 'nothing' }), null);
  for (const type of ['hurt', 'fire', 'melee_hit', 'parry']) { const r = rumbleFor({ type, weapon: 'scattergun', amount: 99, kind: 'heavy' }); assert.ok(r.strong <= 1 && r.weak <= 1 && r.ms > 0 && r.ms < 600); }
});

// ------------------------------------------------------------------------------------------------------------------------------ the pad through the input layer into the sim
test('analog movement: the stick adds to the keys, is clamped, and the sim scales speed by how far it is pushed', () => {
  const i = new InputState(); i.setAnalog(0.4, 0.5); assert.deepEqual(i.sample().move, [0.4, 0.5]); i.setAnalog(0.9, 0.9); i.press('forward'); assert.deepEqual(i.sample().move, [0.9, 1]); i.release('forward'); i.setAnalog(0, 0); assert.deepEqual(i.sample().move, [0, 0]);
  i.setAnalog(1, 1); i.releaseAll(); assert.deepEqual(i.analog, [0, 0], 'releaseAll lets go of the stick');
  const W = '#'.repeat(40), grid = [W, '#' + '.'.repeat(38) + '#', '#' + '.'.repeat(38) + '#', '#' + '.'.repeat(38) + '#', W];
  const dist = (f) => { const w = createWorld(parseMap({ format: 1, id: 'K1', version: 1, name: 'Kit', grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 2], facing: 'east' }, { type: 'exit', at: [38, 1] }] }), { seed: 1 }); w.enemies.length = 0; const x0 = w.player.x; for (let t = 0; t < 90; t++) step(w, { move: [0, f], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0 }); return Math.abs(w.player.x - x0) + Math.abs(w.player.z - (5)); };
  const full = dist(1), half = dist(0.5); assert.ok(half > full * 0.4 && half < full * 0.6, `half tilt = half speed: ${half.toFixed(2)} vs ${full.toFixed(2)}`);
  void spawnEnemy;
});
test('the pad drives the same actions as the keyboard: pressing the mapped actions on an InputState produces the same cmd', () => {
  const d = new PadDevice(), i = new InputState(); const o = d.poll(snap({ 7: 1, 5: 1, 11: 1, 3: 1 }), 1 / 60); for (const a of o.actions.pressed) i.press(a);
  const cmd = i.sample(); assert.equal(cmd.fire, true); assert.equal(cmd.weaponStep, 1, 'R1 = next weapon'); assert.equal(cmd.melee, true, 'R3 = quick melee'); assert.equal(cmd.weaponLast, true, 'Triangle = last weapon (the shell turns a HOLD into the wheel)');
});
