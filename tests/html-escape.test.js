// FREEZE F6 (round 1, Grok 6): text the page writes as HTML goes through escHtml: the arrival card, the campaign tally and the pickup card. No shipped line has markup (Grok scanned all 68 maps), so nothing changes today;
// this holds a hostile line to a harmless one, so a future map or manifest entry cannot break a card or put a tag in the page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { UI, escHtml } from '../src/game/ui.js';
import { standInDom } from './stubs.js';

const HOSTILE = '<img src=x onerror=alert(1)> & "quoted"';

test('escHtml turns the four characters that matter into entities, leaves the rest, and copes with a missing value', () => {
  assert.equal(escHtml(HOSTILE), '&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quoted&quot;');
  assert.equal(escHtml("it's fine"), "it's fine"); assert.equal(escHtml(undefined), ''); assert.equal(escHtml(null), ''); assert.equal(escHtml(7), '7');
});

test('the arrival card, the tally and the pickup card write hostile text as text', () => {
  const dom = standInDom();
  try {
    const ui = new UI({ journalTab() {}, playRadio() {} });
    ui.card({ title: HOSTILE, lines: [HOSTILE, 'A & B'] });
    assert.equal(dom.els.get('card-lines').innerHTML, `<div>${escHtml(HOSTILE)}</div><div>A &amp; B</div>`);
    assert.equal(dom.els.get('card-title').textContent, HOSTILE, 'the title was already text');
    const t = { cleared: 1, total: 2, episodes: [{ title: HOSTILE, maps: [{ name: HOSTILE, rank: 'S' }, { name: 'x', rank: null }], secretMaps: 1, secretMapsFound: 0 }], ranks: { S: 1, A: 0, B: 0, C: 0 }, kills: 3, secrets: 1, secretMapsFound: 0, secretMaps: 1, time: 61, salvage: 9 };
    ui.endingTally(t, { kicker: 'End of ' + HOSTILE, name: HOSTILE, next: { kicker: HOSTILE, name: HOSTILE, line: HOSTILE } });
    for (const id of ['tally-eps', 'tally-next']) assert.ok(!/<img/.test(dom.els.get(id).innerHTML), id + ' has no injected tag: ' + dom.els.get(id).innerHTML.slice(0, 120));
    assert.ok(dom.els.get('tally-eps').innerHTML.includes('&lt;img'), 'it is shown as text');
    assert.equal(dom.els.get('tally-title').textContent.includes('<img'), true, 'the title stays textContent');
    ui.keyLabels = { brass: HOSTILE };
    assert.equal(ui.showPickupCard('key_brass'), true);
    assert.ok(!/<img/.test(dom.els.get('pickup-card').innerHTML), 'the pickup card has no injected tag: ' + dom.els.get('pickup-card').innerHTML.slice(0, 160));
  } finally { dom.restore(); }
});
