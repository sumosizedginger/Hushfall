// DOM UI: HUD, toasts and modal screens (title, pause, death, intermission). Pure presentation; game logic lives in main.js/engine.
import { KEYS, PLAYER, AMMO_MAX, DIFFICULTY, WEAPONS, WEAPON_ORDER } from '../engine/defs.js';

const AMMO_LABEL = { flare: 'FLARES', shell: 'SHELLS' };
import { RESOLUTIONS } from './settings.js';
import { ACTION_LABELS, SLOTS, prettyCode, legendText } from './bindings.js';
import { ACTIONS } from '../engine/input.js';
import { CommsQueue } from './commsqueue.js';

const $ = (id) => document.getElementById(id);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const TOASTS = {
  pickup: (e) => ({ health_small: 'Field dressing (+15)', health_large: 'Medical satchel (+40)', ammo_flare: 'Flare shells (+4)', armor_vest: 'Canvas flak vest (+50)', key_brass: 'Brass key', ammo_shell: 'Shotgun shells (+6)' })[e.kind] || 'Picked up ' + e.kind,
  door_locked: (e) => `Locked. Needs the ${KEYS[e.key]?.name.toLowerCase() || 'key'}.`,
  secret: () => 'A secret!',
  weapon_pickup: (e) => (e.kind === 'weapon_scattergun' ? 'Tidewarden scattergun  (2)' : 'Weapon'),
  weapon_switch: (e) => WEAPONS[e.weapon]?.name || e.weapon,
};

export class UI {
  constructor(handlers) {
    this.h = handlers; this.screen = null; this.toastQueue = []; this.comq = new CommsQueue(); this.shownAt = 0; this._useHint = null;
    $('btn-easy').onclick = () => this.h.newGame('easy'); $('btn-normal').onclick = () => this.h.newGame('normal'); $('btn-hard').onclick = () => this.h.newGame('hard');
    $('btn-continue').onclick = () => this.h.continueGame();
    $('btn-resume').onclick = () => this.h.resume(); $('btn-save').onclick = () => this.h.quickSave(); $('btn-load').onclick = () => this.h.quickLoad();
    $('btn-reset-keys').onclick = () => this.h.resetBindings();
    $('btn-restart').onclick = () => this.h.restartLevel(); $('btn-quit').onclick = () => this.h.quitToTitle();
    $('btn-retry').onclick = () => this.h.restartLevel(); $('btn-dead-load').onclick = () => this.h.quickLoad(); $('btn-next').onclick = () => this.h.quitToTitle();
    $('set-sens').oninput = (e) => this.h.setSetting('sensitivity', Number(e.target.value)); $('set-vol').oninput = (e) => this.h.setSetting('masterVolume', Number(e.target.value)); $('set-sfx').oninput = (e) => this.h.setSetting('sfxVolume', Number(e.target.value)); $('set-music').oninput = (e) => this.h.setSetting('musicVolume', Number(e.target.value));
    $('set-fov').oninput = (e) => this.h.setSetting('fov', Number(e.target.value)); $('set-bright').oninput = (e) => this.h.setSetting('brightness', Number(e.target.value));
    $('set-res').innerHTML = RESOLUTIONS.map((r) => `<option value="${r}">${r} px wide</option>`).join(''); $('set-res').onchange = (e) => this.h.setSetting('internalWidth', Number(e.target.value));
    $('set-aimtoggle').onchange = (e) => this.h.setSetting('aimToggle', e.target.checked); $('set-sprinttoggle').onchange = (e) => this.h.setSetting('sprintToggle', e.target.checked);
    $('set-outline').onchange = (e) => this.h.setSetting('outline', e.target.checked); $('set-paint').onchange = (e) => this.h.setSetting('paint', e.target.checked);
  }
  syncSettings(s) { $('set-sens').value = s.sensitivity; $('set-fov').value = s.fov; $('set-bright').value = s.brightness; $('set-vol').value = s.masterVolume; $('set-sfx').value = s.sfxVolume; $('set-music').value = s.musicVolume; $('set-res').value = s.internalWidth; $('set-aimtoggle').checked = s.aimToggle; $('set-sprinttoggle').checked = s.sprintToggle; $('set-outline').checked = s.outline; $('set-paint').checked = s.paint; }
  /** interactive remap list: one row per action, two clickable slots each. `capturing` = {action, slot} highlights the slot awaiting a key. */
  syncBindings(b, capturing = null, note = '') {
    $('controls').innerHTML = ACTIONS.map((a) => `<div><b>${ACTION_LABELS[a] || a}</b><span>${Array.from({ length: SLOTS }, (_, i) => `<button class="bind${capturing && capturing.action === a && capturing.slot === i ? ' capturing' : ''}" data-a="${a}" data-i="${i}">${capturing && capturing.action === a && capturing.slot === i ? 'press a key…' : prettyCode(b[a]?.[i])}</button>`).join('')}</span></div>`).join('');
    for (const el of document.querySelectorAll('#controls button.bind')) el.onclick = () => this.h.beginRebind(el.dataset.a, Number(el.dataset.i));
    $('legend-title').textContent = $('legend-pause').textContent = legendText(b);
    $('bind-note').textContent = note;
  }
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
      $('complete-title').textContent = data.mapName + ' cleared'; $('complete-outro').textContent = data.outro || ''; $('complete-end').textContent = data.hasNext ? '' : 'This is the end of the Gate 1 preview: the next level is not built yet.';
    }
  }
  toast(text) { const d = document.createElement('div'); d.textContent = text; $('toasts').appendChild(d); setTimeout(() => d.remove(), 3200); if ($('toasts').children.length > 4) $('toasts').firstChild.remove(); }
  /** hotkeys (Enter/Space on the death and complete screens) are ignored for half a second after a screen appears, so a held fire key cannot skip it */
  canAct() { return performance.now() - this.shownAt > 500; }
  events(events) { for (const e of events) { if (e.type === 'message') this.comms(e); else { const f = TOASTS[e.type]; if (f) this.toast(f(e)); } } }
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
  clearOverlays() { clearTimeout(this._pumpT); clearTimeout(this._tipT); this.comq.clear(); $('comms').classList.add('hidden'); $('card').classList.add('hidden'); $('tips').classList.add('hidden'); }
  /** the contextual prompt under the crosshair ('' hides it) */
  useHint(text) { if (text === this._useHint) return; this._useHint = text; const el = $('use-hint'); el.textContent = text; el.classList.toggle('hidden', !text); }
  /** a controls reminder that appears after `delay` ms and stays `dur` ms (cancelled by clearOverlays) */
  tip(text, delay, dur) { clearTimeout(this._tipT); this._tipT = setTimeout(() => { const el = $('tips'); el.textContent = text; el.classList.remove('hidden'); this._tipT = setTimeout(() => el.classList.add('hidden'), dur); }, delay); }
  hud(w, visible) {
    $('hud').classList.toggle('hidden', !visible); if (!visible) return;
    const p = w.player; document.body.dataset.stance = p.sprinting ? 'sprint' : p.ads > 0.5 ? 'ads' : 'hip';
    $('hud-hp').textContent = Math.ceil(p.hp); $('hud-hp').parentElement.classList.toggle('low', p.hp <= 25);
    $('hud-armor').textContent = Math.ceil(p.armor); const wd = WEAPONS[p.weapon], have = p.ammo[wd.ammo] ?? 0; $('hud-ammo').textContent = have; $('hud-ammo-label').textContent = AMMO_LABEL[wd.ammo] || wd.ammo.toUpperCase(); $('hud-ammo').parentElement.classList.toggle('low', have === 0);
    $('hud-weapons').innerHTML = WEAPON_ORDER.map((id, i) => (p.weapons.includes(id) ? `<span class="${id === p.weapon ? 'on' : ''}">${i + 1} ${WEAPONS[id].name.split(' ').pop().toUpperCase()}</span>` : '')).join('');
    $('hud-keys').innerHTML = p.keys.map((k) => `<i style="background:${KEYS[k].color}" title="${KEYS[k].name}"></i>`).join('');
    $('hud-kills').textContent = `${w.stats.kills}/${w.stats.total.enemies}`; $('hud-secrets').textContent = `${w.stats.secrets}/${w.stats.total.secrets}`;
  }
  setPointerHint(text) { $('hint').textContent = text || ''; }
}
export { AMMO_MAX, PLAYER };
