// PT-050 H1 (design/HARDENING.md H-F1, and M7 of the commercial plan: "a crash and error log the player can export"). Two things, both PURE so a node test can run them:
//  1. guardedFrame: the page's frame loop. Before, a throw anywhere in a frame except inside `step` (the rank at a finish, the renderer, the HUD, the audio) skipped the `requestAnimationFrame` at its end and the page simply stopped, with no message.
//     Now the next frame is scheduled FIRST, so no throw can end the loop; a throw goes to `onCrash` (a plain screen: "Something broke", back to the title, copy the report), and if the SAME failure repeats every frame the loop halts instead of spamming.
//  2. the error report: what broke, where in the game, kept in a short list the player can copy and send. Strings are cut to a sane length; nothing here ever throws (storage may be full or off).
export const ERROR_KEY = 'hushfall.errors';
export const MAX_REPORTS = 20;

/** `body(now)` once per frame; `schedule(frame)` asks for the next one; `onCrash(error, crashesInWindow)` is told about a throw and must not be trusted not to throw itself */
export function guardedFrame({ body, schedule, onCrash, maxCrashes = 3, windowMs = 2000 }) {
  const state = { crashes: [], halted: false, total: 0 };
  const frame = (now) => {
    if (state.halted) return;
    schedule(frame);                                                                                // first, so that nothing below can end the loop
    try { body(now); }
    catch (e) {
      const t = Number.isFinite(now) ? now : state.total;                                           // (a frame time that is NaN must not break the window arithmetic)
      state.total++; state.crashes = state.crashes.filter((c) => t - c < windowMs); state.crashes.push(t);
      try { onCrash(e, state.crashes.length); } catch { /* the crash screen itself must never take the page down */ }
      if (state.crashes.length >= maxCrashes) state.halted = true;                                  // the same failure again and again: stop, the crash screen stays up
    }
  };
  return { frame, state };
}

const cut = (v, n) => String(v ?? '').slice(0, n);
/** one report: when, what, the first lines of the stack, and where in the game it happened (`ctx`: mode, map, tick, difficulty, seed ...) */
export function makeReport(err, ctx = {}, now = Date.now()) {
  const message = cut(err?.message ?? err, 300), stack = cut(err?.stack, 1500).split('\n').slice(0, 8).join('\n');
  const where = {}; for (const [k, v] of Object.entries(ctx)) if (typeof v === 'number' || typeof v === 'boolean') where[k] = Number.isFinite(v) || typeof v === 'boolean' ? v : null; else if (typeof v === 'string') where[k] = cut(v, 60);
  return { at: new Date(Number.isFinite(now) ? now : 0).toISOString(), message, stack, where };
}
/** the newest `max` reports, oldest first */
export function appendReport(list, report, max = MAX_REPORTS) { const out = [...(Array.isArray(list) ? list : []).filter((r) => r && typeof r === 'object'), report]; return out.slice(-max); }
/** plain text the player can paste into a message */
export function reportText(list) {
  const rows = (Array.isArray(list) ? list : []).map((r) => `[${r.at}] ${r.message}\n  ${Object.entries(r.where ?? {}).map(([k, v]) => k + '=' + v).join(' ')}\n${r.stack ?? ''}`);
  return `HUSHFALL error report (${rows.length})\n` + rows.join('\n\n');
}
export function loadErrors(storage) { try { const v = JSON.parse(storage?.getItem(ERROR_KEY) ?? '[]'); return Array.isArray(v) ? v.slice(-MAX_REPORTS) : []; } catch { return []; } }
export function saveErrors(storage, list) { try { storage?.setItem(ERROR_KEY, JSON.stringify(list.slice(-MAX_REPORTS))); return true; } catch { return false; } }
