// The weapon wheel (PT-013, owner go 2026-10-07). Hold the last-weapon key (Q; Triangle / Y on a pad), push the mouse or the right stick toward a segment, let go to equip it. A tap is still "last weapon".
// The owner's decision (D7): while the wheel is open time is FROZEN on Easy, 15% speed on Normal, 5% speed on Hard. That happens in the SHELL: the dt fed to the fixed-step loop is scaled (0 = no ticks), the simulation is
// untouched and stays deterministic; par time counts sim ticks, so a frozen wheel costs nothing. Selecting a segment just presses the EXISTING weapon-slot action: no sim change.
// Everything here is pure (state machines and strings), so node tests cover it; main.js owns the DOM and the clock.

/** the wheel's segments, in order, clockwise from the top. `slot` is the 0-based weapon action (weapon1 ..); the mortar and the counter-tone emitter join when they exist. */
export const WHEEL_SLOTS = [
  { id: 'flare', slot: 0, name: 'Flare cannon', role: 'AREA · burning ground' },
  { id: 'scattergun', slot: 1, name: 'Scattergun', role: 'CLOSE · staggers' },
  { id: 'rivet', slot: 2, name: 'Riveter', role: 'SUPPRESS · slows' },
  { id: 'harpoon', slot: 3, name: 'Harpoon rifle', role: 'ONE HEAVY SHOT · pins' },
  { id: 'arc', slot: 4, name: 'Charge-arc lamp', role: 'CHARGE · water · Vael' },
  { id: 'melee', slot: 5, name: 'Melee', role: 'FISTS · found weapons · guard' },
];
/** time scale while the wheel is open, by difficulty (owner decision D7) */
export const WHEEL_TIME = { easy: 0, normal: 0.15, hard: 0.05 };
export const timeScaleFor = (difficulty, enabled = true) => (enabled ? (WHEEL_TIME[difficulty] ?? 0.15) : 1);
/** ease the clock's scale toward its target (a 70 ms-ish glide, so the world does not stop dead between two frames); snaps to the target when close, and to exactly 0 when frozen */
export function easeScale(cur, target, dt, rate = 16) { const k = 1 - Math.exp(-rate * Math.max(0, dt)), n = cur + (target - cur) * k; return Math.abs(n - target) < 0.004 ? target : n; }

/** tap or hold? the last-weapon key: a press shorter than `holdMs` is a tap (last weapon), a longer one opens the wheel */
export const HOLD_MS = 240;
export const isHold = (downMs, nowMs, holdMs = HOLD_MS) => nowMs - downMs >= holdMs;

/** which segment a pointer vector (dx right, dy DOWN, as on screen) points at: 0 = the top, clockwise; -1 inside the dead centre (`minR`) */
export function pickSegment(dx, dy, n = WHEEL_SLOTS.length, minR = 0.35) {
  if (Math.hypot(dx, dy) < minR) return -1;
  const ang = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);                      // 0 = up, clockwise
  return Math.round(ang / (Math.PI * 2 / n)) % n;
}

export class Wheel {
  constructor() { this.open = false; this.x = 0; this.y = 0; this.sel = -1; this.downAt = null; this.openedAt = 0; }
  /** the key went down (nowMs from the shell's clock) */
  press(nowMs) { this.downAt = nowMs; }
  /** called every frame while the key is held: opens the wheel once the press has lasted long enough. Returns true the frame it opens. */
  tick(nowMs, holdMs = HOLD_MS) { if (this.downAt != null && !this.open && isHold(this.downAt, nowMs, holdMs)) { this.open = true; this.x = this.y = 0; this.sel = -1; this.openedAt = nowMs; return true; } return false; }
  /** open at once (the accessibility option: press to open, press again to choose) */
  forceOpen(nowMs) { this.open = true; this.downAt = null; this.x = this.y = 0; this.sel = -1; this.openedAt = nowMs; }
  /** the key went up: { tap: true } when it never opened (a tap), else { pick: segment index | -1 } and the wheel closes */
  release() { const wasOpen = this.open; this.downAt = null; this.open = false; const sel = this.sel; this.sel = -1; this.x = this.y = 0; return wasOpen ? { tap: false, pick: sel } : { tap: true, pick: -1 }; }
  /** close without choosing (Esc, losing focus, a pause) */
  cancel() { this.open = false; this.downAt = null; this.sel = -1; this.x = this.y = 0; }
  /** a mouse movement while open: accumulates a pointer vector inside the unit circle (so the segment follows where you have pushed, not where you have been) */
  feed(dx, dy, gain = 1 / 140) {
    if (!this.open) return; this.x += dx * gain; this.y += dy * gain; const m = Math.hypot(this.x, this.y); if (m > 1) { this.x /= m; this.y /= m; }
    this.sel = pickSegment(this.x, this.y);
  }
  /** a stick while open (x right, y DOWN, -1..1): the vector IS the stick */
  stick(x, y) { if (!this.open) return; this.x = x; this.y = y; this.sel = pickSegment(x, y, WHEEL_SLOTS.length, 0.5); }
}

// ---------------------------------------------------------------------------------------------------------------------- drawing (strings)
const ICONS = {                                                         // 40 x 40, stroked in the HUD's colour: simple, bold and quick to read at a glance
  flare: '<rect x="4" y="19" width="22" height="9" rx="2" transform="rotate(-18 15 23)"/><circle cx="31" cy="11" r="3.6"/><path d="M31 3.5v3M38 11h-3M35.5 5.5l-2 2M26.5 5.5l2 2"/><path d="M8 29l-3 6"/>',
  scattergun: '<rect x="3" y="15" width="24" height="4.5" rx="1"/><rect x="3" y="21.5" width="24" height="4.5" rx="1"/><path d="M27 17h2M27 24h2"/><circle cx="33" cy="11" r="1.5"/><circle cx="36" cy="20" r="1.5"/><circle cx="33" cy="29" r="1.5"/><circle cx="37" cy="15" r="1.2"/><circle cx="37" cy="25" r="1.2"/>',
  rivet: '<rect x="5" y="13" width="17" height="13" rx="2"/><path d="M22 19.5h10M26 16v7M9 13v-4h8v4"/><path d="M33 19.5h5"/><path d="M10 26v6h6v-6"/>',
  harpoon: '<path d="M3 31L33 9"/><path d="M33 9l-9 0.5M33 9l-3.5 8"/><path d="M5 29c-3 1-3 6 1 6"/><path d="M12 26l2.5 3"/>',
  arc: '<circle cx="20" cy="15" r="8.5"/><path d="M15.5 27h9M16.5 30.5h7M18 34h4"/><path d="M21.5 8l-4.5 7h6l-4.5 7"/>',
  melee: '<path d="M10 31V19c0-2 2-3 3.5-2V12c0-2 3-2.5 4-0.5 1-2 4-2 4.8 0 1-1.5 4.2-1 4.2 1.3V31z"/><path d="M13.5 19v-3M17.5 17v-4M21.5 17.5v-3M10 24h20M12 31v4h16v-4"/>',
};
const polar = (cx, cy, r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
/** a ring segment path from angle a0 to a1 (radians from the top, clockwise), between radii r0 and r1 */
function wedge(cx, cy, r0, r1, a0, a1) {
  const [x0, y0] = polar(cx, cy, r1, a0), [x1, y1] = polar(cx, cy, r1, a1), [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0), big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r1} ${r1} 0 ${big} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${r0} ${r0} 0 ${big} 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z`;
}
/**
 * The wheel as an SVG string. model: { selected: index | -1, current: id of the weapon in hand, items: [{ id, owned, ammoText, label }] } in WHEEL_SLOTS order.
 * An unowned segment is drawn dim and cannot be picked (the shell ignores it). The centre says what the selection is and what it is for.
 */
export function wheelSvg(model) {
  const n = WHEEL_SLOTS.length, S = 300, c = S / 2, r0 = 62, r1 = 138, gap = 0.035, out = [];
  WHEEL_SLOTS.forEach((slot, i) => {
    const it = model.items[i] ?? { owned: false }, a0 = (i - 0.5) * 2 * Math.PI / n + gap, a1 = (i + 0.5) * 2 * Math.PI / n - gap, mid = i * 2 * Math.PI / n;
    const cls = ['seg', it.owned ? '' : 'off', model.selected === i ? 'sel' : '', model.current === slot.id ? 'cur' : ''].filter(Boolean).join(' ');
    const [ix, iy] = polar(c, c, (r0 + r1) / 2 - 4, mid), [tx, ty] = polar(c, c, r1 - 13, mid);
    out.push(`<g class="${cls}" data-slot="${slot.slot}"><path d="${wedge(c, c, r0, r1, a0, a1)}"/><g class="icon" transform="translate(${(ix - 20).toFixed(1)} ${(iy - 22).toFixed(1)})">${ICONS[slot.id]}</g><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle">${slot.slot + 1}${it.ammoText ? ' · ' + it.ammoText : ''}</text></g>`);
  });
  const sel = model.selected >= 0 ? WHEEL_SLOTS[model.selected] : null, it = sel ? model.items[model.selected] : null;
  out.push(`<text class="mid" x="${c}" y="${c - 4}" text-anchor="middle">${sel ? (it?.label ?? sel.name).toUpperCase() : 'WEAPONS'}</text><text class="role" x="${c}" y="${c + 14}" text-anchor="middle">${sel ? (it?.owned ? sel.role : 'NOT FOUND YET') : 'push toward one · release to equip'}</text>`);
  return `<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="weapon wheel">${out.join('')}</svg>`;
}
/** the model the shell hands to wheelSvg, from the sim's player (read-only) */
export function wheelModel(player, selected, WEAPONS, MELEE_ORDER) {
  const owned = (id) => id === 'melee' || player.weapons.includes(id);
  const items = WHEEL_SLOTS.map((s) => {
    if (s.id === 'melee') { const cur = WEAPONS[player.weapon]?.kind === 'melee' ? player.weapon : (MELEE_ORDER.includes(player.meleeWeapon) ? player.meleeWeapon : 'fists'); return { id: s.id, owned: true, ammoText: '', label: WEAPONS[cur].name }; }
    const w = WEAPONS[s.id]; return { id: s.id, owned: owned(s.id), ammoText: owned(s.id) ? String(player.ammo[w.ammo] ?? 0) : '', label: w.name };
  });
  const cur = WEAPONS[player.weapon]?.kind === 'melee' ? 'melee' : player.weapon;
  return { selected, current: cur, items };
}
