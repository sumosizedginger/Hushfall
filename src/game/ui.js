// DOM UI: HUD, toasts and modal screens (title, pause, death, intermission). Pure presentation; game logic lives in main.js/engine.
import { KEYS, PLAYER, AMMO_MAX, DIFFICULTY } from '../engine/defs.js';
import { RESOLUTIONS } from './settings.js';

const $ = (id) => document.getElementById(id);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const TOASTS = {
  pickup: (e) => ({ health_small: 'Field dressing (+15)', health_large: 'Medical satchel (+40)', ammo_flare: 'Flare shells (+4)', armor_vest: 'Canvas flak vest (+50)', key_brass: 'Brass key' })[e.kind] || 'Picked up ' + e.kind,
  door_locked: (e) => `Locked. Needs the ${KEYS[e.key]?.name.toLowerCase() || 'key'}.`,
  secret: () => 'A secret!',
};

export class UI {
  constructor(handlers) {
    this.h = handlers; this.screen = null; this.toastQueue = [];
    $('btn-easy').onclick = () => this.h.newGame('easy'); $('btn-normal').onclick = () => this.h.newGame('normal'); $('btn-hard').onclick = () => this.h.newGame('hard');
    $('btn-continue').onclick = () => this.h.continueGame();
    $('btn-resume').onclick = () => this.h.resume(); $('btn-save').onclick = () => this.h.quickSave(); $('btn-load').onclick = () => this.h.quickLoad();
    $('btn-restart').onclick = () => this.h.restartLevel(); $('btn-quit').onclick = () => this.h.quitToTitle();
    $('btn-retry').onclick = () => this.h.restartLevel(); $('btn-dead-load').onclick = () => this.h.quickLoad(); $('btn-next').onclick = () => this.h.quitToTitle();
    $('set-sens').oninput = (e) => this.h.setSetting('sensitivity', Number(e.target.value)); $('set-vol').oninput = (e) => this.h.setSetting('masterVolume', Number(e.target.value));
    $('set-res').innerHTML = RESOLUTIONS.map((r) => `<option value="${r}">${r} px wide</option>`).join(''); $('set-res').onchange = (e) => this.h.setSetting('internalWidth', Number(e.target.value));
    $('set-aimtoggle').onchange = (e) => this.h.setSetting('aimToggle', e.target.checked); $('set-sprinttoggle').onchange = (e) => this.h.setSetting('sprintToggle', e.target.checked);
    $('set-outline').onchange = (e) => this.h.setSetting('outline', e.target.checked); $('set-paint').onchange = (e) => this.h.setSetting('paint', e.target.checked);
  }
  syncSettings(s) { $('set-sens').value = s.sensitivity; $('set-vol').value = s.masterVolume; $('set-res').value = s.internalWidth; $('set-aimtoggle').checked = s.aimToggle; $('set-sprinttoggle').checked = s.sprintToggle; $('set-outline').checked = s.outline; $('set-paint').checked = s.paint; }
  syncBindings(b) { $('controls').innerHTML = Object.entries(b).map(([a, cs]) => `<div><b>${a}</b><span>${cs.map((c) => c.replace('Key', '').replace('Mouse0', 'Click')).join(' / ') || '-'}</span></div>`).join(''); }
  show(name, data = {}) {
    for (const el of document.querySelectorAll('.screen')) el.classList.add('hidden');
    this.screen = name; document.body.dataset.screen = name || '';
    if (!name) return;
    $('screen-' + name).classList.remove('hidden');
    if (name === 'title') { $('btn-continue').style.display = data.canContinue ? '' : 'none'; $('title-note').textContent = data.note || ''; }
    if (name === 'pause') $('pause-note').textContent = data.note || '';
    if (name === 'complete') {
      const s = data.stats, t = s.total;
      $('stat-rows').innerHTML = [['Kills', `${s.kills} / ${t.enemies}`], ['Items', `${s.items} / ${t.items}`], ['Secrets', `${s.secrets} / ${t.secrets}`], ['Time', `${fmtTime(s.time)}${data.par ? '  (par ' + fmtTime(data.par) + ')' : ''}`], ['Damage taken', String(s.damageTaken)], ['Difficulty', DIFFICULTY[data.difficulty].name]].map(([k, v]) => `<div><b>${k}</b><span>${v}</span></div>`).join('');
      $('complete-title').textContent = data.mapName + ' cleared';
    }
  }
  toast(text) { const d = document.createElement('div'); d.textContent = text; $('toasts').appendChild(d); setTimeout(() => d.remove(), 3200); if ($('toasts').children.length > 4) $('toasts').firstChild.remove(); }
  events(events) { for (const e of events) { const f = TOASTS[e.type]; if (f) this.toast(f(e)); } }
  hud(w, visible) {
    $('hud').classList.toggle('hidden', !visible); if (!visible) return;
    const p = w.player; document.body.dataset.stance = p.sprinting ? 'sprint' : p.ads > 0.5 ? 'ads' : 'hip';
    $('hud-hp').textContent = Math.ceil(p.hp); $('hud-hp').parentElement.classList.toggle('low', p.hp <= 25);
    $('hud-armor').textContent = Math.ceil(p.armor); $('hud-ammo').textContent = p.ammo.flare ?? 0; $('hud-ammo').parentElement.classList.toggle('low', (p.ammo.flare ?? 0) === 0);
    $('hud-keys').innerHTML = p.keys.map((k) => `<i style="background:${KEYS[k].color}" title="${KEYS[k].name}"></i>`).join('');
    $('hud-kills').textContent = `${w.stats.kills}/${w.stats.total.enemies}`; $('hud-secrets').textContent = `${w.stats.secrets}/${w.stats.total.secrets}`;
  }
  setPointerHint(text) { $('hint').textContent = text || ''; }
}
export { AMMO_MAX, PLAYER };
