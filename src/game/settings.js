// Player settings, versioned like saves. Invalid or foreign data falls back to defaults and says so; it never half-loads.
import { DEFAULT_BINDINGS, ACTIONS } from '../engine/input.js';

export const SETTINGS_VERSION = 1;
export const RESOLUTIONS = [320, 400, 480, 640, 800];
export const defaultSettings = () => ({
  version: SETTINGS_VERSION, sensitivity: 1, masterVolume: 0.8, sfxVolume: 1, musicVolume: 0.6,
  internalWidth: 480, outline: true, paint: true, bindings: JSON.parse(JSON.stringify(DEFAULT_BINDINGS)),
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
  s.outline = raw.outline !== false; s.paint = raw.paint !== false;
  if (raw.bindings && typeof raw.bindings === 'object' && ACTIONS.every((a) => Array.isArray(raw.bindings[a]) && raw.bindings[a].every((c) => typeof c === 'string'))) s.bindings = raw.bindings;
  else if (raw.bindings) notes.push('key bindings invalid; defaults used');
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
