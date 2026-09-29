// Pure key-binding helpers for the remap screen: display names, applying a rebind with conflict handling, resetting.
import { ACTIONS, DEFAULT_BINDINGS } from '../engine/input.js';

export const ACTION_LABELS = {
  forward: 'Move forward', back: 'Move back', left: 'Strafe left', right: 'Strafe right', turnLeft: 'Turn left', turnRight: 'Turn right', lookUp: 'Look up', lookDown: 'Look down',
  fire: 'Fire', aim: 'Aim down sights', sprint: 'Sprint', use: 'Use / open', weapon1: 'Weapon 1', weapon2: 'Weapon 2', weapon3: 'Weapon 3', weaponNext: 'Next weapon', weaponPrev: 'Previous weapon', map: 'Automap', pause: 'Pause',
};
export const SLOTS = 2;
/** Escape cancels a capture and is how browsers release the mouse, so it cannot be assigned to an action. */
export const RESERVED = new Set(['Escape']);

export function prettyCode(code) {
  if (!code) return '—';
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  const names = { Mouse0: 'Mouse L', Mouse1: 'Mouse M', Mouse2: 'Mouse R', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5', WheelUp: 'Wheel ↑', WheelDown: 'Wheel ↓', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', Space: 'Space', Tab: 'Tab', Enter: 'Enter', Backspace: 'Backspace', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc' };
  return names[code] || code;
}

/**
 * Set slot `slot` of `action` to `code`. A code already used elsewhere is taken from that action (reported in `displaced`).
 * Refuses reserved codes, and refuses to leave Pause with no key at all (the player could never open the menu again).
 * Returns {ok, bindings, displaced:[actions], reason?}. Never mutates its input.
 */
export function applyRebind(bindings, action, slot, code) {
  if (!ACTIONS.includes(action)) return { ok: false, reason: 'unknown action ' + action, bindings };
  if (!code || RESERVED.has(code)) return { ok: false, reason: `${prettyCode(code)} cannot be assigned`, bindings };
  if (!(slot >= 0 && slot < SLOTS)) return { ok: false, reason: 'bad slot', bindings };
  const b = JSON.parse(JSON.stringify(bindings)), displaced = [];
  for (const a of ACTIONS) {
    if (a === action) continue;
    const keep = (b[a] || []).filter((c) => c !== code);
    if (keep.length !== (b[a] || []).length) { displaced.push(a); b[a] = keep; }
  }
  if (displaced.includes('pause') && b.pause.length === 0) return { ok: false, reason: 'Pause needs at least one key', bindings };
  const list = (b[action] || []).filter((c, i) => i !== slot && c !== code);       // drop the same code elsewhere in this action, keep the other slot
  const other = list[0];
  b[action] = slot === 0 ? [code, ...(other ? [other] : [])] : [...(other ? [other] : []), code];
  return { ok: true, bindings: b, displaced };
}

export const defaultBindings = () => JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
