// DOM UI: HUD, toasts and modal screens (title, pause, death, intermission). Pure presentation; game logic lives in main.js/engine.
import { KEYS, PLAYER, AMMO_MAX, DIFFICULTY, WEAPONS, SLOT_KEYS, MELEE_ORDER, ENEMIES, DIFFICULTY as DIFFS } from '../engine/defs.js';
import { gravTarget } from '../engine/gravity.js';
import { noiseHud } from '../engine/noisetell.js';

const AMMO_LABEL = { flare: 'FLARES', shell: 'SHELLS', rivet: 'RIVETS', bolt: 'BOLTS', cell: 'CELLS', round: 'ROUNDS', rocket: 'ROCKETS' };
/** PT-022: what the later weapons say when they are picked up (the older ones are in TOASTS below) */
import { describeNext, TRACKS } from '../engine/progress.js';
import { RESOLUTIONS } from './settings.js';
import { ACTION_LABELS, SLOTS, prettyCode, legendText } from './bindings.js';
import { PAD_ACTIONS, padGlyph } from './gamepad.js';
import { ACTIONS } from '../engine/input.js';
import { CommsQueue } from './commsqueue.js';
import { pickupToast, pickupCard, cardIcon, pushToast, toastLabel, TOAST } from './toasts.js';
import { crosshairCss } from './crosshair.js';

const $ = (id) => document.getElementById(id);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtLong = (s) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const TOASTS = {
  pickup: (e) => pickupToast(e.kind),                                         // amounts come from PICKUPS (toasts.js)
  door_locked: (e) => `Locked. Needs the ${KEYS[e.key]?.name.toLowerCase() || 'key'}.`,
  switch_need: (e, ui) => `It needs: ${e.missing.map((k) => (ui.keyLabels[k] ?? KEYS[k].name).toLowerCase()).join(', ')}.`,
  secret: () => 'A secret!',
  weapon_pickup: (e) => pickupCard(e.kind)?.title ?? 'Weapon',                  // (the card of toasts.js shows the details; this is only the fallback when the page has no card element)
};

export class UI {
  constructor(handlers) {
    this.h = handlers; this.screen = null; this.toastQueue = []; this.comq = new CommsQueue(); this.shownAt = 0; this._useHint = null; this.keyLabels = {};
    $('btn-easy').onclick = () => this.h.newGame('easy'); $('btn-normal').onclick = () => this.h.newGame('normal'); $('btn-hard').onclick = () => this.h.newGame('hard');
    $('btn-continue').onclick = () => this.h.continueGame();
    $('btn-crash-title').onclick = () => this.h.crashToTitle(); $('btn-crash-copy').onclick = () => this.copyCrash();
    $('btn-journal-map').onclick = () => this.h.journalTab('map'); $('btn-journal-log').onclick = () => this.h.journalTab('log'); $('btn-journal-close').onclick = () => this.h.resume(); $('btn-journal-record').onclick = () => this.h.openRecord('pause');
    $('btn-resume').onclick = () => this.h.resume(); $('btn-save').onclick = () => this.h.quickSave(); $('btn-load').onclick = () => this.h.quickLoad();
    $('btn-reset-keys').onclick = () => this.h.resetBindings();
    $('btn-restart').onclick = () => this.h.restartLevel(); $('btn-quit').onclick = () => this.h.quitToTitle();
    $('btn-retry').onclick = () => this.h.restartLevel(); $('btn-dead-load').onclick = () => this.h.quickLoad(); $('btn-next').onclick = () => this.h.nextLevel(); $('btn-title').onclick = () => this.h.quitToTitle();
    $('btn-record').onclick = () => this.h.openRecord('pause'); $('btn-record-title').onclick = () => this.h.openRecord('title'); $('btn-record-close').onclick = () => this.h.closeRecord();
    $('screen-ending').onclick = () => this.h.epiloguePress(); $('btn-ending').onmousedown = (e) => e.preventDefault();       // a click anywhere goes on (the button is only a label for it); the mouse must not focus it, or Enter would press it twice (PT-036)
    $('locker').onclick = (e) => { const b = e.target.closest?.('button[data-track]'); if (b && !b.disabled) this.h.buyUpgrade(b.dataset.track); };
    $('set-sens').oninput = (e) => this.h.setSetting('sensitivity', Number(e.target.value)); $('set-vol').oninput = (e) => this.h.setSetting('masterVolume', Number(e.target.value)); $('set-sfx').oninput = (e) => this.h.setSetting('sfxVolume', Number(e.target.value)); $('set-music').oninput = (e) => this.h.setSetting('musicVolume', Number(e.target.value));
    $('set-fov').oninput = (e) => this.h.setSetting('fov', Number(e.target.value)); $('set-bright').oninput = (e) => this.h.setSetting('brightness', Number(e.target.value));
    { const xh = (key, conv = (v) => v) => (e) => { this.xh = { ...this.xh, [key]: conv(e.target.value) }; this.h.setSetting('crosshair', this.xh); };      // PT-048 / V2: the crosshair's style, size, colour and opacity (crosshair.js)
      $('set-xh-style').onchange = xh('style'); $('set-xh-size').onchange = xh('size'); $('set-xh-color').onchange = xh('color'); $('set-xh-opacity').oninput = xh('opacity', Number); }
    $('set-res').innerHTML = RESOLUTIONS.map((r) => `<option value="${r}">${r} px wide</option>`).join(''); $('set-res').onchange = (e) => this.h.setSetting('internalWidth', Number(e.target.value));
    $('set-aimtoggle').onchange = (e) => this.h.setSetting('aimToggle', e.target.checked); $('set-sprinttoggle').onchange = (e) => this.h.setSetting('sprintToggle', e.target.checked);
    $('set-wheelslow').onchange = (e) => this.h.setSetting('wheelSlow', e.target.checked); $('set-wheeltoggle').onchange = (e) => this.h.setSetting('wheelToggle', e.target.checked);
    $('set-journalpause').onchange = (e) => this.h.setSetting('journalPause', e.target.checked);
    $('set-pad').onchange = (e) => this.h.setPadSetting('enabled', e.target.checked); $('set-padlook').oninput = (e) => this.h.setPadSetting('lookRate', Number(e.target.value)); $('set-paddz').oninput = (e) => this.h.setPadSetting('deadzone', Number(e.target.value)); $('set-padinvert').onchange = (e) => this.h.setPadSetting('invertY', e.target.checked);
    $('set-padassist').oninput = (e) => this.h.setPadSetting('assist', Number(e.target.value)); $('set-padvib').onchange = (e) => this.h.setPadSetting('vibration', e.target.checked); $('set-padglyph').onchange = (e) => this.h.setPadSetting('glyphs', e.target.value); $('btn-reset-pad').onclick = () => this.h.resetPadBindings();
    $('set-outline').onchange = (e) => this.h.setSetting('outline', e.target.checked); $('set-paint').onchange = (e) => this.h.setSetting('paint', e.target.checked);
  }
  /** the crosshair's look from the player's settings (crosshair.js): `data-style` and three CSS variables on #cross; index.html does the drawing */
  applyCrosshair(ch) { const el = $('cross'); if (!el) return; const { style, vars } = crosshairCss(ch); el.dataset.style = style; for (const [k, v] of Object.entries(vars)) { if (el.style.setProperty) el.style.setProperty(k, v); else el.style[k] = v; } }
  syncCrosshair(ch) { this.xh = { ...ch }; $('set-xh-style').value = this.xh.style; $('set-xh-size').value = this.xh.size; $('set-xh-color').value = this.xh.color; $('set-xh-opacity').value = this.xh.opacity; this.applyCrosshair(this.xh); }
  /** the Journal (PT-049 U2): the Map tab is the automap the page draws behind it, the Log tab the messages of this map, newest first, the unread ones marked (journal.js). Text is escaped. */
  journalOpen({ log, mapName, tab }) {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    $('journal-title').textContent = mapName ?? ''; $('journal-new').textContent = log.newCount ? `(${log.newCount} new)` : '';
    $('journal-list').innerHTML = log.entries.length ? log.entries.map((e) => `<div class="rec${e.document ? ' doc' : ''}${e.isNew ? ' new' : ''}"><b>${esc(e.speaker || 'unsigned')}</b><p>${esc(e.text)}</p></div>`).join('') + (log.earlier ? `<div id="journal-empty">${log.earlier} more from earlier maps are in the Record.</div>` : '') : `<div id="journal-empty">Nothing received on this map yet.${log.earlier ? ' ' + log.earlier + ' from earlier maps are in the Record.' : ''}</div>`;
    $('journal-log').scrollTop = 0; this.journalShowTab(tab);
  }
  journalShowTab(tab) { const log = tab === 'log'; $('screen-journal').classList.toggle('map', !log); $('journal-log').classList.toggle('hidden', !log); $('btn-journal-map').classList.toggle('on', !log); $('btn-journal-log').classList.toggle('on', log); }
  /** the HUD's count of messages not yet read in the Journal (main.js keeps the number) */
  setUnread(n) { this.unread = n; $('hud-log').classList.toggle('hidden', !n); $('hud-log-n').textContent = String(n); }
  /** the crash screen (errorlog.js): over everything, plain words, the report text can be copied for a bug report */
  showCrash({ message, text, halted, aside }) {
    this.crashText = text; $('crash-text').textContent = (halted ? 'The game stopped itself because the same thing kept going wrong. Reload the page to start again.' : 'The game hit a problem and went back to the title. Your progress up to your last save is safe.') + (aside ? ` The "${aside}" save was set aside as damaged.` : '');
    $('crash-detail').textContent = message; $('btn-crash-title').classList.toggle('hidden', !!halted); $('btn-crash-copy').textContent = 'Copy the report'; $('screen-crash').classList.remove('hidden');
  }
  hideCrash() { $('screen-crash').classList.add('hidden'); }
  copyCrash() { const t = this.crashText ?? ''; try { navigator.clipboard.writeText(t).then(() => { $('btn-crash-copy').textContent = 'Copied'; }, () => { $('crash-detail').textContent = t; }); } catch { $('crash-detail').textContent = t; } }
  syncSettings(s) { $('set-sens').value = s.sensitivity; $('set-fov').value = s.fov; $('set-bright').value = s.brightness; $('set-vol').value = s.masterVolume; $('set-sfx').value = s.sfxVolume; $('set-music').value = s.musicVolume; $('set-res').value = s.internalWidth; $('set-aimtoggle').checked = s.aimToggle; $('set-sprinttoggle').checked = s.sprintToggle; $('set-outline').checked = s.outline; $('set-paint').checked = s.paint; $('set-wheelslow').checked = s.wheelSlow; $('set-wheeltoggle').checked = s.wheelToggle; $('set-journalpause').checked = s.journalPause;
    const G = s.gamepad; $('set-pad').checked = G.enabled; $('set-padlook').value = G.lookRate; $('set-paddz').value = G.deadzone; $('set-padinvert').checked = G.invertY; $('set-padassist').value = G.assist; $('set-padvib').checked = G.vibration; $('set-padglyph').value = G.glyphs; }
  /** interactive remap list: one row per action, two clickable slots each. `capturing` = {action, slot} highlights the slot awaiting a key. */
  syncBindings(b, capturing = null, note = '') {
    $('controls').innerHTML = ACTIONS.map((a) => `<div><b>${ACTION_LABELS[a] || a}</b><span>${Array.from({ length: SLOTS }, (_, i) => `<button class="bind${capturing && capturing.action === a && capturing.slot === i ? ' capturing' : ''}" data-a="${a}" data-i="${i}">${capturing && capturing.action === a && capturing.slot === i ? 'press a key…' : prettyCode(b[a]?.[i])}</button>`).join('')}</span></div>`).join('');
    for (const el of document.querySelectorAll('#controls button.bind')) el.onclick = () => this.h.beginRebind(el.dataset.a, Number(el.dataset.i));
    this.kbLegend = legendText(b); this.legends(); $('bind-note').textContent = note;
  }
  /** the controls reminder under the title and the pause menu: the keyboard line, and the pad's line (in its own glyphs) while a pad is connected */
  legends(pad = this.padLegendText ?? '') { this.padLegendText = pad; $('legend-title').textContent = $('legend-pause').textContent = pad ? this.kbLegend + '\n' + pad : this.kbLegend; }
  /** the controller's button list: one row per action, the pad's glyph on a button; `capturing` = the action waiting for a press */
  syncPadBindings(b, capturing = null, family = 'xbox', note = '') {
    $('padcontrols').innerHTML = PAD_ACTIONS.map((a) => `<div><b>${ACTION_LABELS[a] || a}</b><span><button class="bind${capturing === a ? ' capturing' : ''}" data-pa="${a}">${capturing === a ? 'press a button…' : (b[a]?.[0] ? padGlyph(b[a][0], family) : '—')}</button></span></div>`).join('');
    for (const el of document.querySelectorAll('#padcontrols button.bind')) el.onclick = () => this.h.beginPadRebind(el.dataset.pa);
    $('pad-note').textContent = note;
  }
  /** the weapon wheel (an SVG string), or null to hide it; `note` says what the clock is doing */
  setWheel(svg, note = '') { const el = $('wheel'); if (!svg) { el.classList.add('hidden'); document.body.classList.remove('wheel-open'); this._wheelSvg = null; return; } el.classList.remove('hidden'); document.body.classList.add('wheel-open'); if (svg + note !== this._wheelSvg) { el.innerHTML = svg + (note ? `<div class="wnote">${note}</div>` : ''); this._wheelSvg = svg + note; } }
  show(name, data = {}) {
    for (const el of document.querySelectorAll('.screen')) el.classList.add('hidden');
    this.screen = name; document.body.dataset.screen = name || ''; this.shownAt = performance.now();
    if (!name) return;
    $('screen-' + name).classList.remove('hidden');
    if (name === 'title') { $('btn-continue').style.display = data.canContinue ? '' : 'none'; $('title-note').textContent = data.note || ''; }
    if (name === 'pause') { $('pause-note').textContent = data.note || ''; $('btn-load').style.display = data.canLoad ? '' : 'none'; }
    if (name === 'dead') $('btn-dead-load').style.display = data.canLoad ? '' : 'none';
    if (name === 'complete') {
      const s = data.stats, t = s.total;
      $('stat-rows').innerHTML = [['Kills', `${s.kills} / ${t.enemies}`], ['Items', `${s.items} / ${t.items}`], ['Secrets', `${s.secrets} / ${t.secrets}`], ...(s.innocents ? [['Innocents harmed', String(s.innocents)]] : []), ['Time', `${fmtTime(s.time)}${data.par ? '  (par ' + fmtTime(data.par) + ')' : ''}`], ['Damage taken', String(s.damageTaken)], ['Difficulty', DIFFICULTY[data.difficulty].name]].map(([k, v]) => `<div><b>${k}</b><span>${v}</span></div>`).join('');
      $('rank-line').innerHTML = `<span class="rank r-${data.rank}">${data.rank}</span><span>score ${data.score.toFixed(2)} · ${data.gain > 0 ? '+' + data.gain + ' salvage' : 'no new salvage'}${data.record && data.record.rank !== data.rank ? ' · best ' + data.record.rank : ''}</span>`;
      this.locker(data.progress, data.lockerNote ?? '');
      $('complete-title').textContent = data.mapName + ' cleared'; $('complete-outro').textContent = data.outro || ''; $('complete-end').textContent = data.hasNext ? '' : data.campaignEnd ? 'The Gate is open. Campaign Two is not built yet.' : 'This is the end of the levels built so far.'; $('btn-next').textContent = data.hasNext ? 'Next: ' + data.nextName : 'Back to title'; $('btn-title').style.display = data.hasNext ? '' : 'none';
    }
    if (name === 'ending') this.endingOpen(data.ending);
    if (name === 'record') this.recordOpen(data.view, data.counts, data.current);
    if (name === 'journal') this.journalOpen(data);
  }
  /** the Record (PT-037, record.js): a heading per map with entries, each message under its speaker; found documents are set apart; the map being played is scrolled into view */
  recordOpen(view, counts, current) {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    $('record-sub').textContent = counts.all ? `${counts.all} messages received, ${counts.docs} of them found documents. Each is kept the first time it reaches you.` : '';
    $('record-list').innerHTML = view.length ? view.map((gr) => `<h3 data-map="${gr.mapId}"${gr.mapId === current ? ' class="cur"' : ''}>${esc(gr.name)}<small>${esc(gr.mapId)}</small></h3>` + gr.entries.map((e) => `<div class="rec${e.document ? ' doc' : ''}"><b>${esc(e.speaker || 'unsigned')}</b><p>${esc(e.text)}</p></div>`).join('')).join('') : '<div id="record-empty">Nothing yet. What you hear and read along the way is kept here.</div>';
    $('record-list').scrollTop = 0; const cur = $('record-list').querySelector('h3.cur'); if (cur) cur.scrollIntoView?.({ block: 'start' });
    $('btn-record-close').focus?.();
  }
  /** the campaign epilogue (PT-036): the heading and an empty card; main.js feeds it `endingView` every frame, then `endingTally` */
  endingOpen(e) {
    $('screen-ending').classList.remove('is-tally'); $('ending-tally').classList.add('hidden');
    $('ending-kicker').textContent = e.kicker; $('ending-title').textContent = e.title;
    $('ending-who').textContent = ''; $('ending-text').textContent = ''; this._endingCard = -1;
  }
  /** one frame of the sequence (ending.js viewSequence): a new card fades in under its speaker, its text is typed */
  endingView(v) {
    if (v.tally) return;
    const card = $('ending-card');
    if (v.index !== this._endingCard) { this._endingCard = v.index; card.className = ''; void card.offsetWidth; card.className = 'in'; card.dataset.who = v.who || 'narrator'; $('ending-who').textContent = v.who; }
    if ($('ending-text').textContent !== v.text) $('ending-text').textContent = v.text;
    card.classList.toggle('typing', !v.full);
  }
  /** the whole campaign at a glance (ending.js tally): a row per episode with a disc per map, the totals, and what comes next */
  endingTally(t, e) {
    $('screen-ending').classList.add('is-tally'); $('ending-tally').classList.remove('hidden'); this.shownAt = performance.now();        // (a held key cannot skip it)
    $('tally-title').textContent = `${e.kicker.replace(/^End of /, '')} · ${e.name}`; $('tally-sub').textContent = `${t.cleared} of ${t.total} maps finished`;
    $('tally-eps').innerHTML = t.episodes.map((ep) => `<div class="ep"><b>${ep.title}</b><span class="discs">${ep.maps.map((m) => `<i class="disc${m.rank ? ' r-' + m.rank : ''}" title="${m.name}">${m.rank ?? '·'}</i>`).join('')}</span><span class="sec${ep.secretMapsFound ? ' found' : ''}">${ep.secretMaps ? (ep.secretMapsFound ? 'secret found' : 'secret unfound') : ''}</span></div>`).join('');
    const ranks = ['S', 'A', 'B', 'C'].map((r) => `${r} ${t.ranks[r]}`).join(' · ');
    $('tally-totals').innerHTML = [['Ranks', ranks], ['Kills', String(t.kills)], ['Secrets found', String(t.secrets)], ['Secret maps', `${t.secretMapsFound} / ${t.secretMaps}`], ['Time', fmtLong(t.time)], ['Salvage in hand', String(t.salvage)]].map(([k, v]) => `<div><b>${k}</b><span>${v}</span></div>`).join('');
    $('tally-note').textContent = 'The best you have done on each map. The time is the sum of each map\'s fastest finish, not one sitting.';
    $('tally-next').innerHTML = `<small>${e.next.kicker}</small><strong>${e.next.name}</strong><em>${e.next.line}</em>`;
  }
  /** the Locker on the intermission: one row per upgrade track (the next tier, what it gives, what it costs) and the salvage in hand. Buying is the shell's job (h.buyUpgrade). */
  locker(p, note = '') {
    $('locker-salvage').textContent = `salvage ${p.salvage}`;
    $('locker').innerHTML = Object.keys(TRACKS).map((t) => { const d = describeNext(p, t); return `<div><b>${d.name} · tier ${d.tier}/${TRACKS[t].costs.length}</b><span>${d.cost == null ? 'maxed' : `${d.cost} salvage<button class="buy" data-track="${t}"${p.salvage < d.cost ? ' disabled' : ''}>Buy</button>`}</span><span class="what">${d.text}</span></div>`; }).join('');
    $('locker-note').textContent = note;
  }
  /** PT-049 U1: a MAJOR pickup (a gun, a key) gets a card at lower centre, not a toast in the column: the icon, the name, one line of what it does (toasts.js pickupCard). -> true when it showed one */
  showPickupCard(kind) {
    const c = pickupCard(kind), el = c && $('pickup-card'); if (!el) return false;
    el.innerHTML = `<i>${cardIcon(c.icon)}</i><div><b>${c.title}</b><span>${c.line}</span></div>`; if (el.style.setProperty) el.style.setProperty('--card', c.color); else el.style['--card'] = c.color;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); return true;
  }
  /** PT-047 V2: a toast joins the model (toasts.js): equal consecutive ones merge, three at most; the DOM below only draws it */
  toast(text) { this.toasts = pushToast(this.toasts, text, performance.now() / 1000); this.renderToasts(); setTimeout(() => this.renderToasts(), TOAST.life * 1000 + 60); }
  renderToasts() { const now = performance.now() / 1000; this.toasts = (this.toasts ?? []).filter((t) => t.until > now); $('toasts').replaceChildren(...this.toasts.map((t) => { const d = document.createElement('div'); d.textContent = toastLabel(t); return d; })); }
  /** hotkeys (Enter/Space on the death and complete screens) are ignored for half a second after a screen appears, so a held fire key cannot skip it */
  canAct() { return performance.now() - this.shownAt > 500; }
  /** the crosshair's answers: a tick when you hit, red when it dies, grey on plate; a call-out for the guard and the pin */
  hitMark(kind) { const el = $('hitmark'); if (!el) return; el.className = ''; void el.offsetWidth; el.className = 'on ' + kind; }
  crossNote(text, color) { const el = $('cross-note'); if (!el) return; el.textContent = text; el.style.color = color || ''; el.className = ''; void el.offsetWidth; el.className = 'on'; }
  events(events) {
    let mark = '';
    for (const e of events) {
      if (e.type === 'enemy_died') { if (!e.folk) mark = 'kill'; } else if (e.type === 'armor_hit') { if (mark !== 'kill') mark = 'plate'; }
      else if (e.type === 'enemy_hit' || e.type === 'melee_hit') { if (!mark) mark = 'hit'; if (e.riposte) this.crossNote('RIPOSTE', '#ffd45a'); }
      else if (e.type === 'parry') this.crossNote('PARRY', '#ffd45a'); else if (e.type === 'block') this.crossNote('BLOCK', '#c4d4d0'); else if (e.type === 'guard_break') this.crossNote('GUARD BROKEN', '#e0583a'); else if (e.type === 'pin') this.crossNote('PINNED', '#7ffff0');
    }
    if (mark) this.hitMark(mark === 'hit' ? '' : mark);
    for (const e of events) { if ((e.type === 'pickup' || e.type === 'weapon_pickup') && this.showPickupCard(e.kind)) continue; if (e.type === 'message') this.comms(e); else if (e.type === 'objective') this.toast('New objective'); else if (e.type === 'exit_locked') this.toast('The gate is sealed.'); else if (e.type === 'door_remote') this.toast('Opened from elsewhere.'); else if (e.type === 'door_breath') this.toast('It opens when the ship breathes in.'); else if (e.type === 'door_listen') this.toast('The lock is listening. Be quiet.'); else if (e.type === 'lamp_out') this.toast('The lantern has burned dry.'); else if (e.type === 'lamp_dry') this.toast('No oil.'); else if (e.type === 'switch_dead') this.toast('Already used.'); else if (e.type === 'dry_feed') this.toast('Out of ammunition: the cannon feed clanks a flare home'); else if (e.type === 'node_severed') this.toast('A bell falls silent.'); else if (e.type === 'enemy_revived') this.toast('A Sexton raised the fallen!'); else if (e.type === 'innocent') this.toast('It had no weapon.'); else if (e.type === 'pickup' && e.label) this.toast(e.label); else { const f = TOASTS[e.type]; if (f) this.toast(f(e, this)); } } }
  /** In-world transmissions/notes are shown IN ORDER, one at a time, each long enough to read (55 ms per character, 4 s minimum, then a short gap), never on top of the title card.
   *  The radio blip plays when a message is actually shown. */
  comms(e) { this.comq.push(e); this.pumpComms(); }
  /** drive the (pure, unit-tested) queue from the wall clock: show/hide when it says so, and wake up again for its next deadline */
  pumpComms() {
    clearTimeout(this._pumpT); const r = this.comq.update(performance.now()), box = $('comms');
    if (r.hide) box.classList.add('hidden');
    if (r.show) { const e = r.show; box.classList.remove('hidden'); box.classList.toggle('note', /NOTE|LOG|MANIFEST/.test(e.speaker)); $('comms-who').textContent = e.speaker; $('comms-text').textContent = e.text; this.h.playRadio?.(); }
    if (this.comq.current || this.comq.pending) this._pumpT = setTimeout(() => this.pumpComms(), Math.max(30, Math.min(500, Math.max(this.comq.until, this.comq.current ? 0 : this.comq.blockedUntil) - performance.now() + 20)));
  }
  /** level title card at the start of a fresh run */
  card(intro) {
    const c = $('card'); if (!intro) return c.classList.add('hidden');
    $('card-title').textContent = intro.title; $('card-lines').innerHTML = intro.lines.map((l) => `<div>${l}</div>`).join('');
    c.classList.remove('hidden'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; this.comq.blockUntil(performance.now() + 6300); this.pumpComms();
  }
  clearOverlays() { clearTimeout(this._pumpT); clearTimeout(this._tipT); this.comq.clear(); $('toasts').replaceChildren(); $('comms').classList.add('hidden'); $('card').classList.add('hidden'); $('tips').classList.add('hidden'); }
  /** the contextual prompt under the crosshair ('' hides it) */
  useHint(text) { if (text === this._useHint) return; this._useHint = text; const el = $('use-hint'); el.textContent = text; el.classList.toggle('hidden', !text); }
  /** a controls reminder that appears after `delay` ms and stays `dur` ms (cancelled by clearOverlays) */
  tip(text, delay, dur) { clearTimeout(this._tipT); this._tipT = setTimeout(() => { const el = $('tips'); el.textContent = text; el.classList.remove('hidden'); this._tipT = setTimeout(() => el.classList.add('hidden'), dur); }, delay); }
  hud(w, visible) {
    this.keyLabels = w?.map?.keyLabels || {};
    $('hud').classList.toggle('hidden', !visible); if (!visible) return;
    const p = w.player; document.body.dataset.stance = p.sprinting ? 'sprint' : p.guarding ? 'guard' : p.ads > 0.5 ? 'ads' : 'hip'; $('cross').classList.toggle('ripo', (p.riposteT || 0) > 0); $('cross').classList.toggle('supp', (p.suppT || 0) > 0);          // suppressed (PT-026): the crosshair opens red, as your guns do
    { const gt = WEAPONS[p.weapon]?.grav ? gravTarget(w) : null; $('cross').classList.toggle('grab', gt === 'prop' || gt === 'creature'); $('cross').classList.toggle('held', gt === 'held'); }       // PT-022: the tuning-fork's crosshair: wide when it can take something, solid when it holds something
    { const lampEl = $('hud-lamp'), L = p.lamp; lampEl.classList.toggle('hidden', !L);                               // PT-038 (E5): the oil gauge, shown only where the map has a lantern; amber while it burns, red when nearly dry
      if (L) { $('hud-oil').textContent = L.eternal ? '∞' : Math.ceil(L.oil); $('hud-oil-label').textContent = L.on ? 'OIL · LIT' : 'OIL · L'; lampEl.classList.toggle('lit', !!L.on); lampEl.classList.toggle('low', !L.eternal && L.oil < 10); } }
    { const nt = $('hud-noise'), on = !!w.map.noiseTell; nt.classList.toggle('hidden', !on);                          // PT-045 (E9): the noise tell: QUIET or LOUD for the weapon in hand, and how far a shot carries (only a map that says noiseTell)
      if (on) { const n = noiseHud(w); $('hud-noise-v').textContent = n.value; $('hud-noise-label').textContent = n.label; nt.classList.toggle('loud', n.loud); } }
    $('hud-hp').textContent = Math.ceil(p.hp); $('hud-hp').parentElement.classList.toggle('low', p.hp <= 25);
    $('hud-armor').textContent = Math.ceil(p.armor); const wd = WEAPONS[p.weapon], melee = wd.kind === 'melee', noAmmo = melee || wd.kind === 'tool', have = noAmmo ? 0 : p.ammo[wd.ammo] ?? 0, stalled = !!wd.saw && (p.saw?.stall ?? 0) > 0;
    $('hud-ammo').textContent = wd.saw ? (stalled ? 'STALL' : Math.round((p.saw?.heat ?? 0) * 100) + '%') : noAmmo ? '—' : have; $('hud-ammo-label').textContent = wd.saw ? 'ENGINE HEAT' : noAmmo ? 'NO AMMO NEEDED' : AMMO_LABEL[wd.ammo] || wd.ammo.toUpperCase(); $('hud-ammo').parentElement.classList.toggle('low', (!noAmmo && have === 0) || stalled || (!!wd.saw && (p.saw?.heat ?? 0) > 0.75));
    { const C = wd.charge, bar = $('charge'); const lo = melee ? 0.12 : C ? C.min : 0, f = C ? Math.min(1, Math.max(0, ((p.charge || 0) - lo) / (C.max - lo))) : 0, on = !!C && (p.charge || 0) > lo && (melee || have > 0);
      bar.classList.toggle('on', on); bar.classList.toggle('fist', melee); bar.classList.toggle('full', on && f >= 1); bar.firstElementChild.style.width = Math.round(f * 100) + '%'; }
    { const mid = melee ? p.weapon : (MELEE_ORDER.includes(p.meleeWeapon) ? p.meleeWeapon : 'fists');
      $('hud-weapons').innerHTML = SLOT_KEYS.map((id, i) => (id === 'melee' ? `<span class="${melee ? 'on' : ''}">${(i + 1) % 10} ${WEAPONS[mid].name.split(' ').pop().toUpperCase()}</span>` : p.weapons.includes(id) ? `<span class="${id === p.weapon ? 'on' : ''}">${(i + 1) % 10} ${WEAPONS[id].name.split(' ').pop().toUpperCase()}</span>` : '')).join(''); }
    $('hud-keys').innerHTML = p.keys.map((k) => `<i style="background:${KEYS[k].color}" title="${this.keyLabels[k] ?? KEYS[k].name}"></i>`).join('');
    $('objective').textContent = w.objective ? 'OBJECTIVE  ' + w.objective : '';
    const boss = w.enemies.find((e) => ENEMIES[e.kind].boss && e.state !== 'dead' && e.state !== 'idle' && !e.hold), bossEl = $('boss');
    bossEl.classList.toggle('hidden', !boss); $('objective').style.top = boss ? '64px' : '';        // the objective panel must not sit on the boss bar (audit A15)
    if (boss) { const BD = ENEMIES[boss.kind], unison = BD.unison ? w.enemies.filter((n) => n.group === BD.unison.group && n.state !== 'dead').length : 0, nodes = BD.unison ? unison : w.enemies.filter((n) => ENEMIES[n.kind].node && n.state !== 'dead').length, shielded = BD.unison ? unison > 0 : !!BD.shield && nodes > 0; $('boss-name').textContent = ENEMIES[boss.kind].name.toUpperCase(); $('boss-fill').style.width = Math.max(0, boss.hp / (ENEMIES[boss.kind].hp * DIFFS[w.difficulty].enemyHp)) * 100 + '%'; bossEl.classList.toggle('shielded', shielded); const NL = BD.unison ? ['SINGER', 'SINGERS', 'STILL SING'] : BD.shield?.note ?? ['BELL', 'BELLS', 'STILL RING']; $('boss-note').textContent = shielded ? `SHIELDED: ${nodes} ${nodes === 1 ? NL[0] : NL[1]} ${NL[2]}` : (boss.stunT > 0 ? 'STAGGERED' : ''); }      // the wording is the boss's: bells ring, feeders feed      // PT-043: the Hive Cantor's shield is its choir (unison): the count is the singers still standing
    $('hud-kills').textContent = `${w.stats.kills}/${w.stats.total.enemies}`; $('hud-secrets').textContent = `${w.stats.secrets}/${w.stats.total.secrets}`;
  }
  setPointerHint(text) { $('hint').textContent = text || ''; }
}
export { AMMO_MAX, PLAYER };
