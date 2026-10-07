// DOM UI: HUD, toasts and modal screens (title, pause, death, intermission). Pure presentation; game logic lives in main.js/engine.
import { KEYS, PLAYER, AMMO_MAX, DIFFICULTY, WEAPONS, WEAPON_ORDER, MELEE_ORDER, ENEMIES, DIFFICULTY as DIFFS } from '../engine/defs.js';

const AMMO_LABEL = { flare: 'FLARES', shell: 'SHELLS', rivet: 'RIVETS', bolt: 'BOLTS', cell: 'CELLS' };
import { describeNext, TRACKS } from '../engine/progress.js';
import { RESOLUTIONS } from './settings.js';
import { ACTION_LABELS, SLOTS, prettyCode, legendText } from './bindings.js';
import { PAD_ACTIONS, padGlyph } from './gamepad.js';
import { ACTIONS } from '../engine/input.js';
import { CommsQueue } from './commsqueue.js';
import { pickupToast } from './toasts.js';

const $ = (id) => document.getElementById(id);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const TOASTS = {
  pickup: (e) => pickupToast(e.kind),                                         // amounts come from PICKUPS (toasts.js)
  door_locked: (e) => `Locked. Needs the ${KEYS[e.key]?.name.toLowerCase() || 'key'}.`,
  switch_need: (e, ui) => `It needs: ${e.missing.map((k) => (ui.keyLabels[k] ?? KEYS[k].name).toLowerCase()).join(', ')}.`,
  secret: () => 'A secret!',
  weapon_pickup: (e) => (e.kind === 'weapon_boathook' ? 'Boat hook  (6): long reach, it pulls them in' : e.kind === 'weapon_marlinspike' ? 'Marlinspike  (6): fast, three times as deadly in the back' : e.kind === 'weapon_mallet' ? "Lamplighter's mallet  (6): it staggers, and plate does not turn it" : e.kind === 'weapon_axe' ? 'Fire axe  (6): slow, it cleaves everything in front of you' : e.kind === 'weapon_scattergun' ? 'Tidewarden scattergun  (2)' : e.kind === 'weapon_rivet' ? 'Riveter driver  (3): hold to fire' : e.kind === 'weapon_harpoon' ? 'Harpoon rifle  (4): hold aim to zoom, it goes through plate and bodies' : e.kind === 'weapon_arc' ? 'Charge-arc lamp  (5): tap for an arc that picks its own targets; HOLD to charge a forked bolt (it conducts through water); it lights the dark' : 'Weapon'),
  weapon_switch: (e) => WEAPONS[e.weapon]?.name || e.weapon,
};

export class UI {
  constructor(handlers) {
    this.h = handlers; this.screen = null; this.toastQueue = []; this.comq = new CommsQueue(); this.shownAt = 0; this._useHint = null; this.keyLabels = {};
    $('btn-easy').onclick = () => this.h.newGame('easy'); $('btn-normal').onclick = () => this.h.newGame('normal'); $('btn-hard').onclick = () => this.h.newGame('hard');
    $('btn-continue').onclick = () => this.h.continueGame();
    $('btn-resume').onclick = () => this.h.resume(); $('btn-save').onclick = () => this.h.quickSave(); $('btn-load').onclick = () => this.h.quickLoad();
    $('btn-reset-keys').onclick = () => this.h.resetBindings();
    $('btn-restart').onclick = () => this.h.restartLevel(); $('btn-quit').onclick = () => this.h.quitToTitle();
    $('btn-retry').onclick = () => this.h.restartLevel(); $('btn-dead-load').onclick = () => this.h.quickLoad(); $('btn-next').onclick = () => this.h.nextLevel(); $('btn-title').onclick = () => this.h.quitToTitle();
    $('locker').onclick = (e) => { const b = e.target.closest?.('button[data-track]'); if (b && !b.disabled) this.h.buyUpgrade(b.dataset.track); };
    $('set-sens').oninput = (e) => this.h.setSetting('sensitivity', Number(e.target.value)); $('set-vol').oninput = (e) => this.h.setSetting('masterVolume', Number(e.target.value)); $('set-sfx').oninput = (e) => this.h.setSetting('sfxVolume', Number(e.target.value)); $('set-music').oninput = (e) => this.h.setSetting('musicVolume', Number(e.target.value));
    $('set-fov').oninput = (e) => this.h.setSetting('fov', Number(e.target.value)); $('set-bright').oninput = (e) => this.h.setSetting('brightness', Number(e.target.value));
    $('set-res').innerHTML = RESOLUTIONS.map((r) => `<option value="${r}">${r} px wide</option>`).join(''); $('set-res').onchange = (e) => this.h.setSetting('internalWidth', Number(e.target.value));
    $('set-aimtoggle').onchange = (e) => this.h.setSetting('aimToggle', e.target.checked); $('set-sprinttoggle').onchange = (e) => this.h.setSetting('sprintToggle', e.target.checked);
    $('set-wheelslow').onchange = (e) => this.h.setSetting('wheelSlow', e.target.checked); $('set-wheeltoggle').onchange = (e) => this.h.setSetting('wheelToggle', e.target.checked);
    $('set-pad').onchange = (e) => this.h.setPadSetting('enabled', e.target.checked); $('set-padlook').oninput = (e) => this.h.setPadSetting('lookRate', Number(e.target.value)); $('set-paddz').oninput = (e) => this.h.setPadSetting('deadzone', Number(e.target.value)); $('set-padinvert').onchange = (e) => this.h.setPadSetting('invertY', e.target.checked);
    $('set-padassist').oninput = (e) => this.h.setPadSetting('assist', Number(e.target.value)); $('set-padvib').onchange = (e) => this.h.setPadSetting('vibration', e.target.checked); $('set-padglyph').onchange = (e) => this.h.setPadSetting('glyphs', e.target.value); $('btn-reset-pad').onclick = () => this.h.resetPadBindings();
    $('set-outline').onchange = (e) => this.h.setSetting('outline', e.target.checked); $('set-paint').onchange = (e) => this.h.setSetting('paint', e.target.checked);
  }
  syncSettings(s) { $('set-sens').value = s.sensitivity; $('set-fov').value = s.fov; $('set-bright').value = s.brightness; $('set-vol').value = s.masterVolume; $('set-sfx').value = s.sfxVolume; $('set-music').value = s.musicVolume; $('set-res').value = s.internalWidth; $('set-aimtoggle').checked = s.aimToggle; $('set-sprinttoggle').checked = s.sprintToggle; $('set-outline').checked = s.outline; $('set-paint').checked = s.paint; $('set-wheelslow').checked = s.wheelSlow; $('set-wheeltoggle').checked = s.wheelToggle;
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
      $('stat-rows').innerHTML = [['Kills', `${s.kills} / ${t.enemies}`], ['Items', `${s.items} / ${t.items}`], ['Secrets', `${s.secrets} / ${t.secrets}`], ['Time', `${fmtTime(s.time)}${data.par ? '  (par ' + fmtTime(data.par) + ')' : ''}`], ['Damage taken', String(s.damageTaken)], ['Difficulty', DIFFICULTY[data.difficulty].name]].map(([k, v]) => `<div><b>${k}</b><span>${v}</span></div>`).join('');
      $('rank-line').innerHTML = `<span class="rank r-${data.rank}">${data.rank}</span><span>score ${data.score.toFixed(2)} · ${data.gain > 0 ? '+' + data.gain + ' salvage' : 'no new salvage'}${data.record && data.record.rank !== data.rank ? ' · best ' + data.record.rank : ''}</span>`;
      this.locker(data.progress, data.lockerNote ?? '');
      $('complete-title').textContent = data.mapName + ' cleared'; $('complete-outro').textContent = data.outro || ''; $('complete-end').textContent = data.hasNext ? '' : 'This is the end of the levels built so far.'; $('btn-next').textContent = data.hasNext ? 'Next: ' + data.nextName : 'Back to title'; $('btn-title').style.display = data.hasNext ? '' : 'none';
    }
  }
  /** the Locker on the intermission: one row per upgrade track (the next tier, what it gives, what it costs) and the salvage in hand. Buying is the shell's job (h.buyUpgrade). */
  locker(p, note = '') {
    $('locker-salvage').textContent = `salvage ${p.salvage}`;
    $('locker').innerHTML = Object.keys(TRACKS).map((t) => { const d = describeNext(p, t); return `<div><b>${d.name} · tier ${d.tier}/${TRACKS[t].costs.length}</b><span>${d.cost == null ? 'maxed' : `${d.cost} salvage<button class="buy" data-track="${t}"${p.salvage < d.cost ? ' disabled' : ''}>Buy</button>`}</span><span class="what">${d.text}</span></div>`; }).join('');
    $('locker-note').textContent = note;
  }
  toast(text) { const d = document.createElement('div'); d.textContent = text; $('toasts').appendChild(d); setTimeout(() => d.remove(), 3200); if ($('toasts').children.length > 4) $('toasts').firstChild.remove(); }
  /** hotkeys (Enter/Space on the death and complete screens) are ignored for half a second after a screen appears, so a held fire key cannot skip it */
  canAct() { return performance.now() - this.shownAt > 500; }
  /** the crosshair's answers: a tick when you hit, red when it dies, grey on plate; a call-out for the guard and the pin */
  hitMark(kind) { const el = $('hitmark'); if (!el) return; el.className = ''; void el.offsetWidth; el.className = 'on ' + kind; }
  crossNote(text, color) { const el = $('cross-note'); if (!el) return; el.textContent = text; el.style.color = color || ''; el.className = ''; void el.offsetWidth; el.className = 'on'; }
  events(events) {
    let mark = '';
    for (const e of events) {
      if (e.type === 'enemy_died') mark = 'kill'; else if (e.type === 'armor_hit') { if (mark !== 'kill') mark = 'plate'; }
      else if (e.type === 'enemy_hit' || e.type === 'melee_hit') { if (!mark) mark = 'hit'; if (e.riposte) this.crossNote('RIPOSTE', '#ffd45a'); }
      else if (e.type === 'parry') this.crossNote('PARRY', '#ffd45a'); else if (e.type === 'block') this.crossNote('BLOCK', '#c4d4d0'); else if (e.type === 'guard_break') this.crossNote('GUARD BROKEN', '#e0583a'); else if (e.type === 'pin') this.crossNote('PINNED', '#7ffff0');
    }
    if (mark) this.hitMark(mark === 'hit' ? '' : mark);
    for (const e of events) { if (e.type === 'message') this.comms(e); else if (e.type === 'objective') this.toast('New objective'); else if (e.type === 'exit_locked') this.toast('The gate is sealed.'); else if (e.type === 'door_remote') this.toast('Opened from elsewhere.'); else if (e.type === 'switch_dead') this.toast('Already used.'); else if (e.type === 'dry_feed') this.toast('Out of ammunition: the cannon feed clanks a flare home'); else if (e.type === 'node_severed') this.toast('A bell falls silent.'); else if (e.type === 'enemy_revived') this.toast('A Sexton raised the fallen!'); else if (e.type === 'pickup' && e.label) this.toast(e.label); else { const f = TOASTS[e.type]; if (f) this.toast(f(e, this)); } } }
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
    const p = w.player; document.body.dataset.stance = p.sprinting ? 'sprint' : p.guarding ? 'guard' : p.ads > 0.5 ? 'ads' : 'hip'; $('cross').classList.toggle('ripo', (p.riposteT || 0) > 0);
    $('hud-hp').textContent = Math.ceil(p.hp); $('hud-hp').parentElement.classList.toggle('low', p.hp <= 25);
    $('hud-armor').textContent = Math.ceil(p.armor); const wd = WEAPONS[p.weapon], melee = wd.kind === 'melee', have = melee ? 0 : p.ammo[wd.ammo] ?? 0; $('hud-ammo').textContent = melee ? '—' : have; $('hud-ammo-label').textContent = melee ? 'NO AMMO NEEDED' : AMMO_LABEL[wd.ammo] || wd.ammo.toUpperCase(); $('hud-ammo').parentElement.classList.toggle('low', !melee && have === 0);
    { const C = wd.charge, bar = $('charge'); const lo = melee ? 0.12 : C ? C.min : 0, f = C ? Math.min(1, Math.max(0, ((p.charge || 0) - lo) / (C.max - lo))) : 0, on = !!C && (p.charge || 0) > lo && (melee || have > 0);
      bar.classList.toggle('on', on); bar.classList.toggle('fist', melee); bar.classList.toggle('full', on && f >= 1); bar.firstElementChild.style.width = Math.round(f * 100) + '%'; }
    { const mid = melee ? p.weapon : (MELEE_ORDER.includes(p.meleeWeapon) ? p.meleeWeapon : 'fists');
      $('hud-weapons').innerHTML = WEAPON_ORDER.map((id, i) => (p.weapons.includes(id) ? `<span class="${id === p.weapon ? 'on' : ''}">${i + 1} ${WEAPONS[id].name.split(' ').pop().toUpperCase()}</span>` : '')).join('') + `<span class="${melee ? 'on' : ''}">${WEAPON_ORDER.length + 1} ${WEAPONS[mid].name.split(' ').pop().toUpperCase()}</span>`; }
    $('hud-keys').innerHTML = p.keys.map((k) => `<i style="background:${KEYS[k].color}" title="${this.keyLabels[k] ?? KEYS[k].name}"></i>`).join('');
    $('objective').textContent = w.objective ? 'OBJECTIVE  ' + w.objective : '';
    const boss = w.enemies.find((e) => ENEMIES[e.kind].boss && e.state !== 'dead' && e.state !== 'idle'), bossEl = $('boss');
    bossEl.classList.toggle('hidden', !boss); $('objective').style.top = boss ? '64px' : '';        // the objective panel must not sit on the boss bar (audit A15)
    if (boss) { const shielded = w.enemies.some((n) => ENEMIES[n.kind].node && n.state !== 'dead'), nodes = w.enemies.filter((n) => ENEMIES[n.kind].node && n.state !== 'dead').length; $('boss-name').textContent = ENEMIES[boss.kind].name.toUpperCase(); $('boss-fill').style.width = Math.max(0, boss.hp / (ENEMIES[boss.kind].hp * DIFFS[w.difficulty].enemyHp)) * 100 + '%'; bossEl.classList.toggle('shielded', shielded); const NL = ENEMIES[boss.kind].shield?.note ?? ['BELL', 'BELLS', 'STILL RING']; $('boss-note').textContent = shielded ? `SHIELDED: ${nodes} ${nodes === 1 ? NL[0] : NL[1]} ${NL[2]}` : (boss.stunT > 0 ? 'STAGGERED' : ''); }      // the wording is the boss's: bells ring, feeders feed
    $('hud-kills').textContent = `${w.stats.kills}/${w.stats.total.enemies}`; $('hud-secrets').textContent = `${w.stats.secrets}/${w.stats.total.secrets}`;
  }
  setPointerHint(text) { $('hint').textContent = text || ''; }
}
export { AMMO_MAX, PLAYER };
