// Controller support (PT-013, owner go 2026-10-07; PS5 and Xbox). PURE: a snapshot of a pad in, plain data out; the shell (main.js) polls navigator.getGamepads() once a frame and feeds the result into the same
// InputState the keyboard uses, so the simulation never knows a pad exists. Everything here runs in node with fake snapshots (tests/gamepad.test.js).
//
// Both families are read through the browser's STANDARD MAPPING (https://w3c.github.io/gamepad/#remapping): a DualSense and an Xbox pad report the same button NUMBERS, so one binding set serves both and
// only the GLYPHS differ (the vendor id in `gamepad.id`: 054c = Sony, 045e = Microsoft). Buttons are bound by code `Pad<n>`: Pad0 = Cross / A, Pad7 = R2 / RT ...
// NOT reachable from a web page: DualSense adaptive triggers, its haptic motors, gyro, light bar and touchpad surface (only the touchpad CLICK, button 17, and plain dual-rumble).

export const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16, TOUCH: 17 };
export const PAD_CODES = Array.from({ length: 18 }, (_, i) => 'Pad' + i);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** default bindings: action -> pad codes. The table the owner was shown (design/WEAPONS_AND_CONTROLS_PLAN.md, W5). Slots 5 and 6 are reached with L1/R1 or the wheel; X/Square and B/Circle are left free. */
export const PAD_DEFAULTS = {
  fire: ['Pad7'], aim: ['Pad6'], sprint: ['Pad10'], use: ['Pad0'], melee: ['Pad11'], weaponLast: ['Pad3'], weaponNext: ['Pad5'], weaponPrev: ['Pad4'],
  weapon1: ['Pad14'], weapon2: ['Pad12'], weapon3: ['Pad15'], weapon4: ['Pad13'], map: ['Pad8'], pause: ['Pad9'],
};
/** the actions a pad may be bound to (movement and look are the sticks; turn/look keys have no pad button) */
export const PAD_ACTIONS = ['fire', 'aim', 'sprint', 'use', 'melee', 'weaponLast', 'weaponNext', 'weaponPrev', 'weapon1', 'weapon2', 'weapon3', 'weapon4', 'weapon5', 'weapon6', 'map', 'pause'];
export const defaultPadBindings = () => JSON.parse(JSON.stringify(PAD_DEFAULTS));

export const PAD_SETTINGS = { enabled: true, lookRate: 3.4, deadzone: 0.18, curve: 1.6, invertY: false, assist: 0.5, vibration: true, glyphs: 'auto' };   // lookRate: rad/s at full tilt (before the sensitivity slider)

/** the glyph family of a pad: 'ps' | 'xbox' (anything unknown reads as Xbox: it is the layout the standard mapping is named after) */
export function glyphFamily(id = '', setting = 'auto') {
  if (setting === 'ps' || setting === 'xbox') return setting;
  const s = String(id).toLowerCase();
  return /054c|sony|dualsense|dualshock|playstation|ps4|ps5/.test(s) ? 'ps' : 'xbox';                   // the vendor id is what Chrome and Firefox both put in the id string (an Xbox pad is also called 'Wireless Controller', so the NAME alone proves nothing)
}
const GLYPHS = {
  ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3', 'D-UP', 'D-DOWN', 'D-LEFT', 'D-RIGHT', 'PS', 'TOUCHPAD'],
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS', 'D-UP', 'D-DOWN', 'D-LEFT', 'D-RIGHT', 'HOME', 'SHARE'],
};
/** the label of a pad code for a family ('Pad7' -> 'R2' | 'RT'); unknown codes come back as they are */
export function padGlyph(code, family = 'xbox') { const m = /^Pad(\d+)$/.exec(code ?? ''); if (!m) return code ?? '—'; return (GLYPHS[family] ?? GLYPHS.xbox)[Number(m[1])] ?? code; }
export const isPadCode = (c) => /^Pad\d+$/.test(c ?? '');

// ---------------------------------------------------------------------------------------------------------------------- sticks and triggers
/** radial dead zone with the live range rescaled to 0..1, so a stick pushed just past the zone does not jump */
export function deadzone(x, y, dz = 0.18) {
  const m = Math.hypot(x, y); if (m <= dz) return [0, 0];
  const k = (Math.min(1, m) - dz) / (1 - dz) / m; return [x * k, y * k];
}
/** response curve: fine control near the centre, full rate at the edge (exp 1 = linear) */
export const curve = (v, exp = 1.6) => Math.sign(v) * Math.abs(v) ** exp;
/** how far to turn this frame: [dyaw, dpitch] in radians (positive yaw = turn LEFT, as everywhere in the sim; stick right = turn right) */
export function stickLook(rx, ry, dt, s = PAD_SETTINGS, scale = 1) {
  const [x, y] = deadzone(rx, ry, s.deadzone), m = Math.hypot(x, y); if (!m) return [0, 0];
  const f = curve(m, s.curve) / m, rate = s.lookRate * scale;
  return [-x * f * rate * dt, -y * f * rate * dt * (s.invertY ? -1 : 1)];                  // stick up (y < 0) looks UP (pitch +)
}
/** a trigger as a button, with hysteresis so a squeeze hovering at the threshold does not chatter */
export function triggerDown(value, wasDown, on, off) { return wasDown ? value > off : value >= on; }
const TRIGGERS = { 6: { on: 0.5, off: 0.35 }, 7: { on: 0.25, off: 0.15 } };           // LT/L2 (aim, guard): a firmer squeeze; RT/R2 (fire): a light one

// ---------------------------------------------------------------------------------------------------------------------- the pad as a device
/** a plain snapshot of a real Gamepad (or null): { id, buttons: [{ pressed, value }], axes: [..] } */
export function snapshotOf(gp) { return gp && gp.connected !== false ? { id: gp.id ?? '', buttons: Array.from(gp.buttons ?? [], (b) => ({ pressed: !!b.pressed, value: b.value ?? (b.pressed ? 1 : 0) })), axes: Array.from(gp.axes ?? []) } : null; }

export class PadDevice {
  constructor(bindings = defaultPadBindings(), settings = PAD_SETTINGS) { this.settings = { ...PAD_SETTINGS, ...settings }; this.setBindings(bindings); this.down = new Set(); this.connected = false; this.id = ''; }
  setBindings(b) { this.bindings = JSON.parse(JSON.stringify(b)); this.byCode = new Map(); for (const [action, codes] of Object.entries(this.bindings)) for (const c of codes) this.byCode.set(c, action); }
  setSettings(s) { this.settings = { ...PAD_SETTINGS, ...s }; }
  get family() { return glyphFamily(this.id, this.settings.glyphs); }
  /**
   * One frame. Returns { connected, pressed: [codes], released: [codes], actions: { pressed: [action], released: [action] }, move: [x, forward] (-1..1, analog), look: [dyaw, dpitch], stick: [rx, ry] (raw right stick, for the wheel), active }.
   * `scale` multiplies the look rate (the sights, the aim assist). A disconnected pad releases everything it held.
   */
  poll(snap, dt, scale = 1) {
    const out = { connected: !!snap, pressed: [], released: [], actions: { pressed: [], released: [] }, move: [0, 0], look: [0, 0], stick: [0, 0], active: false };
    if (!snap || this.settings.enabled === false) { for (const c of this.down) { out.released.push(c); const a = this.byCode.get(c); if (a) out.actions.released.push(a); } this.down.clear(); this.connected = false; return out; }
    this.connected = true; this.id = snap.id;
    const now = new Set();
    snap.buttons.forEach((b, i) => {
      const t = TRIGGERS[i], was = this.down.has('Pad' + i), on = t ? triggerDown(b.value ?? (b.pressed ? 1 : 0), was, t.on, t.off) : !!b.pressed;
      if (on) now.add('Pad' + i);
    });
    for (const c of now) if (!this.down.has(c)) { out.pressed.push(c); const a = this.byCode.get(c); if (a) out.actions.pressed.push(a); }
    for (const c of this.down) if (!now.has(c)) { out.released.push(c); const a = this.byCode.get(c); if (a) out.actions.released.push(a); }
    this.down = now;
    const [lx, ly] = deadzone(snap.axes[0] ?? 0, snap.axes[1] ?? 0, this.settings.deadzone), [rx, ry] = [snap.axes[2] ?? 0, snap.axes[3] ?? 0];
    out.move = [lx || 0, -ly || 0]; out.stick = [rx, ry]; out.look = stickLook(rx, ry, dt, this.settings, scale);
    out.active = out.pressed.length > 0 || Math.abs(lx) + Math.abs(ly) > 0 || Math.hypot(...deadzone(rx, ry, this.settings.deadzone)) > 0;
    return out;
  }
}

/** rebind a pad action to a code: a code already used by another action is taken from it; returns { ok, bindings, displaced } (never mutates its input); Pause keeps at least one button */
export function applyPadRebind(bindings, action, code) {
  if (!PAD_ACTIONS.includes(action)) return { ok: false, reason: 'unknown action ' + action, bindings };
  if (!isPadCode(code) || !PAD_CODES.includes(code)) return { ok: false, reason: 'not a pad button', bindings };
  const b = JSON.parse(JSON.stringify(bindings)), displaced = [];
  for (const a of Object.keys(b)) if (a !== action && (b[a] ?? []).includes(code)) { b[a] = b[a].filter((c) => c !== code); displaced.push(a); }
  if (displaced.includes('pause') && !b.pause.length) return { ok: false, reason: 'Pause needs at least one button', bindings };
  b[action] = [code]; return { ok: true, bindings: b, displaced };
}
/** repair stored pad bindings field by field (unknown actions dropped, bad codes dropped, missing actions take their default) */
export function sanitizePadBindings(raw) {
  const out = defaultPadBindings(); if (!raw || typeof raw !== 'object') return out;
  for (const a of PAD_ACTIONS) { const v = raw[a]; if (Array.isArray(v) && v.every((c) => PAD_CODES.includes(c))) out[a] = [...v]; }
  const seen = new Map(); for (const a of Object.keys(out)) for (const c of out[a]) { if (seen.has(c)) out[a] = out[a].filter((x) => x !== c); else seen.set(c, a); }       // one button, one action
  return out;
}

/** the controls reminder for a pad, in the glyphs of its family */
export function padLegend(bindings, family = 'xbox') {
  const g = (a) => (bindings[a]?.length ? padGlyph(bindings[a][0], family) : '—');
  return `Move L-stick · Look R-stick · Fire ${g('fire')} · Aim / Guard ${g('aim')} · Use ${g('use')} · Sprint ${g('sprint')} · Quick melee ${g('melee')} · Weapons ${g('weaponPrev')} ${g('weaponNext')} · Last weapon ${g('weaponLast')} (hold: wheel) · Map ${g('map')} · Pause ${g('pause')}`;
}

// ---------------------------------------------------------------------------------------------------------------------- aim assist
/** how much to slow the stick's turn while the crosshair is on or near an enemy (1 = none). Reads the world, writes nothing: the simulation stays deterministic. strength 0..1 (the setting). */
export function assistScale(world, strength = 0.5) {
  if (!world || strength <= 0) return 1;
  const p = world.player, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); let best = 0;
  for (const e of world.enemies) {
    if (e.state === 'dead') continue;
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz); if (d < 0.5 || d > 28) continue;
    const ang = Math.acos(clamp((dx * fx + dz * fz) / d, -1, 1)), cone = Math.max(0.05, Math.atan2(0.9, d));              // a body ~1.8 m wide
    if (ang < cone * 1.6) best = Math.max(best, 1 - ang / (cone * 1.6));
  }
  return 1 - 0.55 * strength * best;
}

// ---------------------------------------------------------------------------------------------------------------------- rumble
/** what the pad should do for a sim event: { strong, weak, ms } or null. Plain dual-rumble (the only thing a web page can ask of a DualSense). */
export function rumbleFor(e) {
  switch (e.type) {
    case 'fire': return ({ scattergun: { strong: 0.7, weak: 0.4, ms: 120 }, harpoon: { strong: 0.9, weak: 0.5, ms: 160 }, flare: { strong: 0.5, weak: 0.3, ms: 100 }, rivet: { strong: 0.12, weak: 0.25, ms: 40 }, arc: { strong: 0.1 + 0.7 * (e.charge ?? 0), weak: 0.2 + 0.5 * (e.charge ?? 0), ms: 70 + 140 * (e.charge ?? 0) } })[e.weapon] ?? null;
    case 'hurt': return { strong: Math.min(1, 0.3 + (e.amount ?? 10) / 40), weak: 0.4, ms: 160 };
    case 'melee_hit': return { strong: e.kind === 'heavy' || e.kind === 'axe' || e.kind === 'mallet' ? 0.8 : 0.45, weak: 0.3, ms: 110 };
    case 'parry': return { strong: 0.2, weak: 0.9, ms: 140 };
    case 'block': return { strong: 0.5, weak: 0.2, ms: 90 };
    case 'guard_break': return { strong: 1, weak: 0.6, ms: 260 };
    case 'explode': return { strong: 0.6, weak: 0.5, ms: 200 };
    case 'player_died': return { strong: 1, weak: 1, ms: 500 };
    default: return null;
  }
}
