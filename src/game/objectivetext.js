// The objective line in the corner (the outside playtest of 2026-11-18: objectives clipped and wrapped; the longest ran to 158 characters, three
// lines at the top of the picture on most of Campaign 2). A new objective is shown whole for OBJ_FULL_S seconds of play, then the corner keeps
// only the whole sentences that fit two lines; the Journal's Objectives page always has the whole text. Pure.
export const OBJ_FULL_S = 12;
export const OBJ_SHORT_MAX = 90;

/** as many whole sentences of an objective as fit in OBJ_SHORT_MAX characters (the whole when it fits); a single long sentence is cut at a clause */
export function objectiveShort(text) {
  const t = String(text ?? '').trim();
  if (t.length <= OBJ_SHORT_MAX) return t;
  // whole sentences, as many as fit ("Nine. Hold the dock until the ferry is in" keeps both)
  const parts = t.match(/[^.!?]+[.!?]*(\s+|$)/g) ?? [t];
  let kept = '';
  for (const p of parts) {
    const next = kept ? kept + ' ' + p.trim() : p.trim();
    if (next.replace(/[.!?]+$/, '').length > OBJ_SHORT_MAX) break;
    kept = next;
  }
  if (kept) return kept.replace(/[.!?]+$/, '');
  const first = parts[0].trim().replace(/[.!?]+$/, '');
  // still long: up to the last colon or semicolon that leaves a whole clause
  const cut = Math.max(first.lastIndexOf(':', OBJ_SHORT_MAX), first.lastIndexOf(';', OBJ_SHORT_MAX), first.lastIndexOf(',', OBJ_SHORT_MAX));
  if (cut > 24) return first.slice(0, cut);
  const sp = first.lastIndexOf(' ', OBJ_SHORT_MAX - 1);
  return first.slice(0, sp > 24 ? sp : OBJ_SHORT_MAX - 1) + '…';
}

/** what the corner shows `since` seconds after the objective last changed */
export const objectiveShown = (text, since) => (!text ? '' : since < OBJ_FULL_S ? String(text) : objectiveShort(text));
