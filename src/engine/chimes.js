// PT-038 (Campaign 2 Act B, design/ACTB.md E6): CHIMES. The first sound puzzle that is not an audio test: a chime is a prop with a NOTE (0 to 4, each with a glyph and a colour as well as a pitch), struck by Use (or by a shot);
// a map's `chimes: [{ id, phrase, window }]` are PHRASES, and the trigger condition `seq:<id>` is true once the last `phrase.length` notes struck, in order, each within `window` s of the one before, are that phrase.
// A CHIME TREE (`chimetree`, `plays: [phrase ids]`) is how a Deep teaches the Song: Use plays the phrase of the first round that is not yet solved (one note every `CHIME.beat` s, from the tree, lit in order); the
// player answers on the chimes. State is LAZY (`w.chimes` exists only in a map that has a chime or a tree): { recent: [{ note, t, id }], matched: { id: time }, struck: { chimeId: n }, play: { seq, i, t } | null,
// played: { treeId: n } }. Pure functions of that state and `w.time`: saves, replays and the bot need nothing else; nothing here reads the random stream.
import { CHIME, PLAYER } from './defs.js';
import * as DM from './dmath.js';                                                                            // PT-076: the same bits on every engine (sin, cos, atan2, acos, exp)

/** the state of a world whose map has chimes (or null: a world without them has no chime state at all) */
export function makeChimes(map) {
  if (!map.props.some((p) => p.kind === 'chime' || p.kind === 'chimetree')) return null;
  return { recent: [], matched: {}, struck: {}, play: null, played: {} };
}

const seqById = (map, id) => (map.chimeSeqs ?? []).find((q) => q.id === id) ?? null;

/** a chime is struck (by Use, a shot or the bot): its note sounds, the phrases are checked against the last notes. `emit` is world.js's. Returns the ids of the phrases this note completed. */
export function strikeChime(w, pr, emit) {
  const c = w.chimes; if (!c || pr.kind !== 'chime') return [];
  c.struck[pr.id] = (c.struck[pr.id] || 0) + 1; c.recent.push({ note: pr.note, t: w.time, id: pr.id }); if (c.recent.length > CHIME.keep) c.recent.shift();
  emit(w, 'chime_note', { x: pr.x, z: pr.z, id: pr.id, note: pr.note, who: 'player' });
  const done = [];
  for (const q of w.map.chimeSeqs ?? []) {
    if (c.matched[q.id] != null) continue; const n = q.phrase.length; if (c.recent.length < n) continue;
    const last = c.recent.slice(-n); let ok = true;
    for (let i = 0; i < n && ok; i++) { if (last[i].note !== q.phrase[i]) ok = false; else if (i > 0 && last[i].t - last[i - 1].t > q.window + 1e-9) ok = false; }
    if (ok) { c.matched[q.id] = w.time; done.push(q.id); emit(w, 'chime_seq', { id: q.id }); }
  }
  return done;
}

/** Use on a tree: it plays the phrase of the first of its rounds that is not solved yet (all solved: the last one again). The notes the tree plays are not the player's: the recent notes are forgotten so an answer starts fresh. */
export function playTree(w, tree, emit) {
  const c = w.chimes; if (!c || tree.kind !== 'chimetree' || c.play) return false;
  const id = (tree.plays ?? []).find((q) => c.matched[q] == null) ?? (tree.plays ?? []).at(-1); if (!id || !seqById(w.map, id)) return false;
  c.play = { seq: id, tree: tree.id, i: 0, t: CHIME.lead }; c.recent.length = 0; c.played[tree.id] = (c.played[tree.id] || 0) + 1;
  emit(w, 'chime_play', { x: tree.x, z: tree.z, id: tree.id, seq: id, notes: seqById(w.map, id).phrase.length }); return true;
}

/** one tick: the tree's phrase goes on, a note every `CHIME.beat` s */
export function updateChimes(w, dt, emit) {
  const c = w.chimes; if (!c?.play) return;
  c.play.t -= dt; if (c.play.t > 0) return;
  const q = seqById(w.map, c.play.seq), tree = w.map.props.find((p) => p.kind === 'chimetree' && p.id === c.play.tree);
  if (!q || !tree) { c.play = null; return; }
  emit(w, 'chime_note', { x: tree.x, z: tree.z, id: tree.id, note: q.phrase[c.play.i], who: 'tree', i: c.play.i });
  c.lastTree = { note: q.phrase[c.play.i], t: w.time, tree: tree.id };                                         // (the view lights the fruit of that note)
  c.play.i++; c.play.t = CHIME.beat; if (c.play.i >= q.phrase.length) { c.play = null; emit(w, 'chime_played', { id: tree.id }); }
}

/** what Use would act on among the chimes: the nearest chime or tree within reach that the player is facing, or null. `pr` is the prop. */
export function chimeTarget(w) {
  if (!w.chimes) return null;
  const p = w.player, fx = -DM.sin(p.yaw), fz = -DM.cos(p.yaw); let best = null, bd = 1e9;
  for (const pr of w.map.props) {
    if (pr.kind !== 'chime' && pr.kind !== 'chimetree') continue;
    const dx = pr.x - p.x, dz = pr.z - p.z, d = Math.hypot(dx, dz);
    if (d < PLAYER.useReach + (pr.kind === 'chimetree' ? 1.2 : 0.7) && (dx * fx + dz * fz) / (d || 1) > 0.7 && d < bd) { bd = d; best = pr; }
  }
  return best;
}

/** for the view and the HUD: is the tree playing, which note is lit, how long ago each chime was struck */
export const chimeSince = (w, id) => { const c = w.chimes; if (!c) return Infinity; for (let i = c.recent.length - 1; i >= 0; i--) if (c.recent[i].id === id) return w.time - c.recent[i].t; return Infinity; };
