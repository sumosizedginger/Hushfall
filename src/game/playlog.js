// PT-071 (R24, proof for outside players): the OPT-IN PLAY LOG. When the player turns it on (Settings: "Keep a play log on this device") the game writes down, in the browser's local storage on that device, what a tester would tell the
// developer: which maps, how each ended, how long, the damage taken, how smoothly it ran, and the answers to five optional questions. It holds no name, no address and nothing that identifies the player (a random session number only).
// NOTHING IS SENT ANYWHERE: the player presses Export and sends the file themselves. Pure: no DOM, no sim; the shell feeds it. design/store/TESTERS.md says the same to the player.

export const PLAYLOG_VERSION = 1, CAP = 300, KEY = 'hushfall.playlog';
export const OUTCOMES = ['complete', 'dead', 'quit', 'restart'];
/** the five questions after a map (key, text); an answer is 'yes' | 'some' | 'no' */
export const SURVEY = [
  ['know', 'Did I always know where to go?'],
  ['move', 'Did I win a fight by moving, not just by shooting?'],
  ['surprise', 'Did anything surprise me?'],
  ['return', 'Was there a place I wanted to come back to?'],
  ['drag', 'Did it drag?'],
];
export const ANSWERS = ['yes', 'some', 'no'];
const NOTE = "This file was made by the game at the player's request. It contains no name, no address and no identifier of a person. Nothing was sent anywhere: the player exported it.";

const num = (x, lo, hi, d = 0) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x * 100) / 100)) : d);
const text = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const hex8 = (rnd) => Array.from({ length: 8 }, () => Math.floor(rnd() * 16).toString(16)).join('');

/** frame times in a histogram of 1 ms bins (to 200 ms): a whole level's percentiles in 200 numbers, however long it runs */
export class FrameHistogram {
  constructor() { this.reset(); }
  reset() { this.bins = new Array(201).fill(0); this.n = 0; }
  add(ms) { if (!(ms > 0)) return; this.bins[Math.min(200, Math.floor(ms))]++; this.n++; }
  pct(p) { if (!this.n) return 0; let c = 0; const want = Math.ceil(this.n * p); for (let i = 0; i < this.bins.length; i++) { c += this.bins[i]; if (c >= want) return Math.min(200, i + 0.5); } return 200; }
  stats(width) { return { n: this.n, p50: this.pct(0.5), p95: this.pct(0.95), p99: this.pct(0.99), width: width ?? null }; }
}

/** a fresh log. meta: { renderer, browser } (strings, optional) */
export function emptyLog(meta = {}, rnd = Math.random, day = '') {
  return { version: PLAYLOG_VERSION, note: NOTE, session: hex8(rnd), day: text(day, 10), renderer: text(meta.renderer, 80), browser: text(meta.browser, 40), entries: [] };
}

const cap = (entries) => (entries.length > CAP ? entries.slice(entries.length - CAP) : entries);

/** one finished attempt at a map (complete, dead, quit or restart). Never throws on odd input: numbers are clamped, strings cut. */
export function addLevel(log, e) {
  const entry = {
    kind: 'level', map: text(e.map, 12), difficulty: ['easy', 'normal', 'hard'].includes(e.difficulty) ? e.difficulty : 'normal', outcome: OUTCOMES.includes(e.outcome) ? e.outcome : 'quit',
    seconds: num(e.seconds, 0, 86400), kills: num(e.kills, 0, 9999), damageTaken: num(e.damageTaken, 0, 99999), secrets: num(e.secrets, 0, 99), items: num(e.items, 0, 999),
    deathAt: Array.isArray(e.deathAt) && e.deathAt.length === 2 ? [num(e.deathAt[0], 0, 999), num(e.deathAt[1], 0, 999)] : null,
    frames: e.frames ? { n: num(e.frames.n, 0, 1e7), p50: num(e.frames.p50, 0, 1000), p95: num(e.frames.p95, 0, 1000), p99: num(e.frames.p99, 0, 1000), width: Number.isFinite(e.frames.width) ? e.frames.width : null } : null,
    attempt: num(e.attempt, 0, 9999),
  };
  return { ...log, entries: cap([...log.entries, entry]) };
}

/** the answers to the five questions for the attempt `attempt` of `map`: replaces an earlier answer set of the same attempt (the player may change their mind) */
export function addSurvey(log, map, attempt, answers = {}, note = '') {
  const clean = {}; for (const [k] of SURVEY) if (ANSWERS.includes(answers?.[k])) clean[k] = answers[k];
  const entry = { kind: 'survey', map: text(map, 12), attempt: num(attempt, 0, 9999), answers: clean, note: text(note, 200) };
  const rest = log.entries.filter((x) => !(x.kind === 'survey' && x.map === entry.map && x.attempt === entry.attempt));
  return { ...log, entries: cap([...rest, entry]) };
}

/** a parsed log from storage, repaired: a foreign or damaged one gives a fresh log and says why */
export function sanitizeLog(raw, rnd = Math.random) {
  if (!raw || typeof raw !== 'object' || raw.version !== PLAYLOG_VERSION || !Array.isArray(raw.entries)) return { log: emptyLog({}, rnd), note: 'play log not recognised: a fresh one is used' };
  let log = emptyLog({ renderer: raw.renderer, browser: raw.browser }, rnd, raw.day); log.session = /^[0-9a-f]{8}$/.test(raw.session) ? raw.session : log.session;
  for (const e of raw.entries.slice(-CAP)) { if (e?.kind === 'level') log = addLevel(log, e); else if (e?.kind === 'survey') log = addSurvey(log, e.map, e.attempt, e.answers, e.note); }
  return { log, note: '' };
}

export const exportText = (log) => JSON.stringify(log, null, 1) + '\n';
/** a line for the settings screen: "12 maps logged on this device" */
export function describe(log) { const n = log.entries.filter((e) => e.kind === 'level').length, s = log.entries.filter((e) => e.kind === 'survey').length; return n || s ? `${n} map${n === 1 ? '' : 's'} and ${s} set${s === 1 ? '' : 's'} of answers kept on this device` : 'nothing kept yet'; }

export function loadLog(storage, rnd = Math.random) {
  try { const t = storage?.getItem(KEY); if (t == null) return emptyLog({}, rnd); return sanitizeLog(JSON.parse(t), rnd).log; } catch { return emptyLog({}, rnd); }
}
export function saveLog(storage, log) { try { storage?.setItem(KEY, JSON.stringify(log)); return true; } catch { return false; } }
export function clearLog(storage) { try { storage?.removeItem(KEY); } catch { /* nothing to clear */ } }
