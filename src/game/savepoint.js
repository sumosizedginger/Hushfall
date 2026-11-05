// The save between levels (the owner, 2026-11-04: "put a save screen on the menu in between levels, so people can stop and pick up at the next level when
// they have a chance to come back"). It reads the save back and loads it exactly as Continue will, so the screen says what is really there, not what the
// game meant to write. Pure apart from the store it is given; the world it builds to look at is thrown away.
import { DIFFICULTY } from '../engine/defs.js';
import { sanitizeProgress } from '../engine/progress.js';
import { loadWorld } from '../engine/save.js';
import { mapName } from './campaign.js';
import { armsHtml, campaignHtml, esc, pauseInfo, row, section, youHtml } from './pauseinfo.js';

/** the slot Continue reads a level's start from */
export const SAVE_POINT_SLOT = 'auto';

/** the save as Continue would find it: { ok: true, info, savedAt } or { ok: false, why } */
export function readSavePoint({ store, nextId, maps, manifest, profile = null }) {
  const r = store.read(SAVE_POINT_SLOT);
  if (!r.ok) return { ok: false, why: `${r.reason} ${r.detail}`.trim() };
  const held = r.save.campaign?.mapId;
  if (held !== nextId) return { ok: false, why: `the save holds ${held ?? 'no map'}, not ${nextId}` };
  const loaded = loadWorld(r.save, (id) => maps[id]);
  if (!loaded.ok) return { ok: false, why: `${loaded.reason} ${loaded.detail}`.trim() };
  return {
    ok: true,
    savedAt: r.save.savedAt ?? 0,
    info: pauseInfo({ world: loaded.world, map: maps[nextId], manifest, mapId: nextId, profile, progress: sanitizeProgress(r.save.progress) }),
  };
}

/** the words on the title's Continue button: where it will put you */
export function continueLabel(save, manifest) {
  const c = save?.campaign;
  if (!c?.mapId) return 'Continue';
  return `Continue: ${mapName(manifest, c.mapId)}, ${DIFFICULTY[c.difficulty]?.name ?? c.difficulty}`;
}

export const SAVED_LINE = 'You can stop here. Continue on the title screen starts this map, with everything listed here.';
export const notSavedLine = (why) => `The browser would not keep this save (${why}). If you stop now, you go back to your last save.`;

/** the heading in the menu itself: it stays on screen at every window size */
export function savedWhereHtml(i) {
  return (
    `<div class="pw-name">${esc(i.name)}</div>` +
    `<div class="pw-line">${[i.part, i.place].filter(Boolean).map(esc).join(' &middot; ') || esc(i.campaign)}</div>` +
    `<div class="pw-line">${esc(i.difficulty.name)}</div>`
  );
}

/** the page beside the menu: what Continue will give you */
export function savedPageHtml({ info: i, savedAt }) {
  const when = savedAt ? new Date(savedAt).toLocaleString() : 'just now';
  const where = section(
    'Picks up at',
    `<div class="pi-title">${esc(i.name)}</div><div class="pi-sub">${esc(i.campaign)}</div>` +
      `<div class="pi-sub">${[i.part, i.place].filter(Boolean).map(esc).join(' &middot; ')}</div>` +
      `<div class="rows">${row('Difficulty', esc(i.difficulty.name))}</div><div class="pi-sub">${esc(i.difficulty.detail)}</div>`,
  );
  const kept = section(
    'Where it is kept',
    `<p class="pi-goal">Saved ${esc(when)}, in this browser on this computer. Clearing this site's data in the browser removes it.</p>`,
  );
  return where + youHtml(i, { title: 'You carry', keys: false }) + armsHtml(i) + campaignHtml(i) + kept;
}
