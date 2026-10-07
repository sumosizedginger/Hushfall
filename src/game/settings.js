// Player settings, versioned like saves. Invalid or foreign data falls back to defaults and says so; it never half-loads.
import { DEFAULT_BINDINGS, ACTIONS } from '../engine/input.js';
import { PAD_SETTINGS, defaultPadBindings, sanitizePadBindings } from './gamepad.js';

export const SETTINGS_VERSION = 1;
export const RESOLUTIONS = [320, 400, 480, 640, 800];
export const defaultSettings = () => ({
  version: SETTINGS_VERSION, sensitivity: 1, masterVolume: 0.8, sfxVolume: 1, musicVolume: 0.6,
  internalWidth: 480, outline: true, paint: true, aimToggle: false, sprintToggle: false, fov: 70, brightness: 1, bindings: JSON.parse(JSON.stringify(DEFAULT_BINDINGS)),
  wheelSlow: true, wheelToggle: false,                                        // the weapon wheel: slow/freeze time while open (owner decision D7); toggle-to-open instead of hold
  gamepad: { ...PAD_SETTINGS }, padBindings: defaultPadBindings(),            // the controller (gamepad.js)
});
const clamp = (x, a, b, d) => (Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : d);

/** Validate + repair a parsed object field by field. Returns {settings, notes[]}. */
export function sanitizeSettings(raw) {
  const d = defaultSettings(), notes = [];
  if (!raw || raw.version !== SETTINGS_VERSION) return { settings: d, notes: [`settings version ${raw?.version} not supported; defaults used`] };
  const s = { ...d };
  s.sensitivity = clamp(raw.sensitivity, 0.1, 4, d.sensitivity);
  s.masterVolume = clamp(raw.masterVolume, 0, 1, d.masterVolume); s.sfxVolume = clamp(raw.sfxVolume, 0, 1, d.sfxVolume); s.musicVolume = clamp(raw.musicVolume, 0, 1, d.musicVolume);
  s.internalWidth = RESOLUTIONS.includes(raw.internalWidth) ? raw.internalWidth : d.internalWidth;
  s.fov = clamp(raw.fov, 60, 105, d.fov); s.brightness = clamp(raw.brightness, 0.6, 1.8, d.brightness);
  s.outline = raw.outline !== false; s.paint = raw.paint !== false; s.aimToggle = raw.aimToggle === true; s.sprintToggle = raw.sprintToggle === true;
  // bindings are repaired per action: a missing/invalid action falls back to its default, custom ones are kept
  if (raw.bindings && typeof raw.bindings === 'object') {
    const fixed = [];
    for (const a of ACTIONS) { const v = raw.bindings[a]; if (Array.isArray(v) && v.every((c) => typeof c === 'string')) s.bindings[a] = v; else if (v !== undefined) fixed.push(a); }
    if (fixed.length) notes.push('key bindings invalid for ' + fixed.join(', ') + '; defaults used for those');
    // an action added since these settings were saved (melee, last weapon, slot 6) comes with its default key, unless the player already gave that key to something else
    const stored = ACTIONS.filter((a) => Array.isArray(raw.bindings[a])), taken = new Set(stored.flatMap((a) => s.bindings[a]));
    for (const a of ACTIONS) if (!stored.includes(a)) s.bindings[a] = s.bindings[a].filter((c) => !taken.has(c));
  } else if (raw.bindings) notes.push('key bindings invalid; defaults used');
  s.wheelSlow = raw.wheelSlow !== false; s.wheelToggle = raw.wheelToggle === true;
  { const g = raw.gamepad && typeof raw.gamepad === 'object' ? raw.gamepad : {}, P = PAD_SETTINGS; s.gamepad = { enabled: g.enabled !== false, lookRate: clamp(g.lookRate, 1, 8, P.lookRate), deadzone: clamp(g.deadzone, 0.05, 0.5, P.deadzone), curve: clamp(g.curve, 1, 3, P.curve), invertY: g.invertY === true, assist: clamp(g.assist, 0, 1, P.assist), vibration: g.vibration !== false, glyphs: ['auto', 'ps', 'xbox'].includes(g.glyphs) ? g.glyphs : 'auto' }; }
  s.padBindings = sanitizePadBindings(raw.padBindings);
  return { settings: s, notes };
}

const KEY = 'hushfall.settings';
export function loadSettings(storage) {
  try {
    const t = storage?.getItem(KEY);
    if (t == null) return { settings: defaultSettings(), notes: [] };
    return sanitizeSettings(JSON.parse(t));
  } catch (e) { return { settings: defaultSettings(), notes: ['settings unreadable: ' + e.message] }; }
}
export function saveSettings(storage, s) { try { storage?.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } }
