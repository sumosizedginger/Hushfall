// Player settings, versioned like saves. Invalid or foreign data falls back to defaults and says so; it never half-loads.
import { DEFAULT_BINDINGS, ACTIONS } from '../engine/input.js';
import { PAD_SETTINGS, defaultPadBindings, sanitizePadBindings } from './gamepad.js';
import { defaultCrosshair, sanitizeCrosshair } from './crosshair.js';
import { sanitizeMinimap } from './minimap.js';

export const SETTINGS_VERSION = 1;
export const RESOLUTIONS = [320, 400, 480, 640, 800, 960]; // (960 is the sharp option the owner asked for; 480 stays the default)
export const defaultSettings = () => ({
  version: SETTINGS_VERSION,
  sensitivity: 1,
  masterVolume: 0.8,
  sfxVolume: 1,
  musicVolume: 0.6,
  internalWidth: 480,
  outline: true,
  paint: true,
  aimToggle: false,
  sprintToggle: false,
  fov: 70,
  brightness: 1,
  bindings: JSON.parse(JSON.stringify(DEFAULT_BINDINGS)),
  wheelSlow: true,
  wheelToggle: false, // the weapon wheel: slow/freeze time while open (owner decision D7); toggle-to-open instead of hold
  journalPause: true, // Tab opens the Journal and pauses (off: the old live map over the running game)
  minimap: 'small', // the corner map (minimap.js): off | small | large
  coldOpenSeen: false, // the cold open has been shown (it plays before the first level of a new game, once)
  cinematics: 'once', // the story scenes (cinematics.js): once (the first time) | always | off
  gamepad: { ...PAD_SETTINGS },
  padBindings: defaultPadBindings(), // the controller (gamepad.js)
  playLog: false, // the opt-in play log (playlog.js): off unless the player turns it on; nothing is ever sent
  autoQuality: true, // step the render width down by itself when the frame time stays high (quality.js), and back up when it is quiet
  textSize: 'normal', // the HUD's text: normal | large | larger
  reducedMotion: false, // no camera shake, a gentler hurt flash and muzzle light
  captions: false, // the sounds that matter as words on the screen (captions.js)
  firstRunSeen: false, // the first-run line has been shown (it comes once, with the first level of a new game)
  rawMouse: true, // ask for the mouse without the system's acceleration where the browser offers it
  mouseInvertY: false,
  adsSens: 1, // invert the mouse; the sensitivity through the sights, as a share of the one that matches the zoom
  checkpoints: true, // keep a checkpoint at a gate, a key, a silenced bell; death goes back to it
  hints: true, // the one-line hint the first time a system matters
  hintsSeen: {},
  trainingOffered: false,
  trainingDone: false,
  hitMarks: true, // a mark at the crosshair and a tick for every blow you land
  gore: 'full', // full | reduced: a big enough blow bursts a body, or it never does
  headBob: 'full', // full | gentle | off (reduced motion turns it off whatever this says)
  crosshair: defaultCrosshair(), // / V2: style, size, colour, opacity of the crosshair (crosshair.js)
});
const clamp = (x, a, b, d) => (Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : d);

/** Validate + repair a parsed object field by field. Returns {settings, notes[]}. */
export function sanitizeSettings(raw) {
  const d = defaultSettings(),
    notes = [];
  if (!raw || raw.version !== SETTINGS_VERSION) return { settings: d, notes: [`settings version ${raw?.version} not supported; defaults used`] };
  const s = { ...d };
  s.sensitivity = clamp(raw.sensitivity, 0.1, 4, d.sensitivity);
  s.masterVolume = clamp(raw.masterVolume, 0, 1, d.masterVolume);
  s.sfxVolume = clamp(raw.sfxVolume, 0, 1, d.sfxVolume);
  s.musicVolume = clamp(raw.musicVolume, 0, 1, d.musicVolume);
  s.internalWidth = RESOLUTIONS.includes(raw.internalWidth) ? raw.internalWidth : d.internalWidth;
  s.fov = clamp(raw.fov, 60, 105, d.fov);
  s.brightness = clamp(raw.brightness, 0.6, 1.8, d.brightness);
  s.outline = raw.outline !== false;
  s.paint = raw.paint !== false;
  s.aimToggle = raw.aimToggle === true;
  s.sprintToggle = raw.sprintToggle === true;
  // bindings are repaired per action: a missing/invalid action falls back to its default, custom ones are kept
  if (raw.bindings && typeof raw.bindings === 'object') {
    const fixed = [];
    for (const a of ACTIONS) {
      const v = raw.bindings[a];
      if (Array.isArray(v) && v.every((c) => typeof c === 'string')) s.bindings[a] = v;
      else if (v !== undefined) fixed.push(a);
    }
    if (fixed.length) notes.push('key bindings invalid for ' + fixed.join(', ') + '; defaults used for those');
    // an action added since these settings were saved (melee, last weapon, slot 6) comes with its default key, unless the player already gave that
    // key to something else
    const stored = ACTIONS.filter((a) => Array.isArray(raw.bindings[a])),
      taken = new Set(stored.flatMap((a) => s.bindings[a]));
    for (const a of ACTIONS) if (!stored.includes(a)) s.bindings[a] = s.bindings[a].filter((c) => !taken.has(c));
  } else if (raw.bindings) notes.push('key bindings invalid; defaults used');
  {
    // one key, one action (the pad's bindings already were). The first action in the list keeps a shared code; an action left with none gets its
    // default keys back unless another action holds them
    const taken = new Set();
    for (const a of ACTIONS) {
      let codes = s.bindings[a].filter((c) => !taken.has(c));
      if (!codes.length) codes = DEFAULT_BINDINGS[a].filter((c) => !taken.has(c));
      s.bindings[a] = codes;
      for (const c of codes) taken.add(c);
    }
  }
  s.wheelSlow = raw.wheelSlow !== false;
  s.journalPause = raw.journalPause !== false;
  s.wheelToggle = raw.wheelToggle === true;
  s.minimap = sanitizeMinimap(raw.minimap);
  s.cinematics = ['once', 'always', 'off'].includes(raw.cinematics) ? raw.cinematics : 'once';
  s.coldOpenSeen = raw.coldOpenSeen === true;
  {
    const g = raw.gamepad && typeof raw.gamepad === 'object' ? raw.gamepad : {},
      P = PAD_SETTINGS;
    s.gamepad = {
      enabled: g.enabled !== false,
      lookRate: clamp(g.lookRate, 1, 8, P.lookRate),
      deadzone: clamp(g.deadzone, 0.05, 0.5, P.deadzone),
      curve: clamp(g.curve, 1, 3, P.curve),
      invertY: g.invertY === true,
      assist: clamp(g.assist, 0, 1, P.assist),
      vibration: g.vibration !== false,
      glyphs: ['auto', 'ps', 'xbox'].includes(g.glyphs) ? g.glyphs : 'auto',
    };
  }
  s.padBindings = sanitizePadBindings(raw.padBindings);
  s.playLog = raw.playLog === true;
  s.autoQuality = raw.autoQuality !== false;
  s.textSize = ['normal', 'large', 'larger'].includes(raw.textSize) ? raw.textSize : d.textSize;
  s.reducedMotion = raw.reducedMotion === true;
  s.captions = raw.captions === true;
  s.firstRunSeen = raw.firstRunSeen === true;
  s.checkpoints = raw.checkpoints !== false;
  s.hints = raw.hints !== false;
  s.hintsSeen =
    raw.hintsSeen && typeof raw.hintsSeen === 'object' && !Array.isArray(raw.hintsSeen)
      ? Object.fromEntries(
          Object.keys(raw.hintsSeen)
            .filter((k) => raw.hintsSeen[k] === true)
            .map((k) => [k, true]),
        )
      : {};
  s.trainingOffered = raw.trainingOffered === true;
  s.trainingDone = raw.trainingDone === true;
  s.hitMarks = raw.hitMarks !== false;
  s.gore = raw.gore === 'reduced' ? 'reduced' : 'full';
  s.rawMouse = raw.rawMouse !== false;
  s.mouseInvertY = raw.mouseInvertY === true;
  s.adsSens = clamp(raw.adsSens, 0.4, 1.6, d.adsSens);
  s.headBob = ['full', 'gentle', 'off'].includes(raw.headBob) ? raw.headBob : d.headBob;
  s.crosshair = sanitizeCrosshair(raw.crosshair); // an older save has none: the new default
  return { settings: s, notes };
}

const KEY = 'hushfall.settings';
export function loadSettings(storage) {
  try {
    const t = storage?.getItem(KEY);
    if (t == null) return { settings: defaultSettings(), notes: [] };
    return sanitizeSettings(JSON.parse(t));
  } catch (e) {
    return { settings: defaultSettings(), notes: ['settings unreadable: ' + e.message] };
  }
}
export function saveSettings(storage, s) {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
/** the field of view setting is the VERTICAL angle (three.js); what it spans across a window of this shape, in degrees */
export const fovAcross = (vertical, aspect) => Math.round((2 * Math.atan(Math.tan((vertical * Math.PI) / 360) * aspect) * 180) / Math.PI);
export const fovLabel = (vertical, aspect) => `${Math.round(vertical)}° tall, ${fovAcross(vertical, aspect)}° across`;
/** the settings by tab, for the panel and its Defaults buttons (a test holds every control of the panel to a tab) */
export const SETTINGS_TABS = {
  controls: { label: 'Controls', keys: ['aimToggle', 'sprintToggle', 'wheelSlow', 'wheelToggle'] },
  mouse: { label: 'Mouse and pad', keys: ['sensitivity', 'adsSens', 'mouseInvertY', 'rawMouse', 'gamepad'] },
  video: { label: 'Video', keys: ['fov', 'headBob', 'brightness', 'internalWidth', 'autoQuality', 'outline', 'paint', 'gore'] },
  audio: { label: 'Audio', keys: ['masterVolume', 'sfxVolume', 'musicVolume', 'hitMarks'] },
  access: { label: 'Accessibility', keys: ['crosshair', 'textSize', 'reducedMotion', 'captions'] },
  gameplay: { label: 'Gameplay', keys: ['hints', 'journalPause', 'minimap', 'cinematics', 'checkpoints', 'playLog'] },
};
