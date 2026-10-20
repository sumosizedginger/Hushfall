// THE READING PAGE (PT-070, R17): the whole story in play order as one page the director reads (and comments on, by line, with the viewer's own comment tool). Built from the data tools/dev/story-export.mjs writes
// (`--json=`), plus the continuity sheet. The page is HTML for the Artifact tool (no <html>/<body>: the tool wraps it). Node only.
//   node tools/dev/story-export.mjs --json=<data.json>   then   node tools/dev/story-page.mjs <data.json> <out.html>
import fs from 'node:fs';
import path from 'node:path';

const [inFile, outFile] = process.argv.slice(2); if (!inFile || !outFile) { console.error('usage: story-page.mjs <data.json> <out.html>'); process.exit(2); }
const root = path.resolve(import.meta.dirname, '../..');
const data = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mmss = (t) => `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}`;
const isDoc = (sp) => /\b(LOG|LOGS|NOTE|NOTES|NOTICE|MANIFEST|LEDGER|REGISTER|BOOK|DRAWING|PLACARD|BOARD|INSCRIPTION|PLATE|TALLY)\b/.test(sp || '');
const kindOf = (sp) => (sp === 'INES' ? 'ines' : sp === 'SIGNAL HOUSE' ? 'signal' : sp === 'HULL' ? 'hull' : isDoc(sp) ? 'doc' : /SILENT|TENDER|QUIET ONE|VAEL|ZEALOT|TIDE-WARDEN|KEEPER/.test(sp || '') ? 'voice' : 'other');
const words = (s) => (String(s).match(/\S+/g) || []).length;

/** a small markdown for the continuity sheet: headings, tables, bullets, bold, code */
function md(src) {
  const inline = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
  const lines = src.split('\n'), out = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^#{1,3} /.test(l)) { const n = l.match(/^#+/)[0].length; out.push(`<h${n + 2}>${inline(l.replace(/^#+ /, ''))}</h${n + 2}>`); i++; }
    else if (/^\|/.test(l) && /^\|[-| ]+\|$/.test(lines[i + 1] || '')) {
      const head = l.split('|').slice(1, -1).map((c) => c.trim()); i += 2; const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim())); i++; }
      out.push(`<div class="scroll"><table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    }
    else if (/^- /.test(l)) { const items = []; while (i < lines.length && /^- /.test(lines[i])) { items.push(`<li>${inline(lines[i].slice(2))}</li>`); i++; } out.push(`<ul>${items.join('')}</ul>`); }
    else if (l.trim()) { out.push(`<p>${inline(l)}</p>`); i++; }
    else i++;
  }
  return out.join('\n');
}

let nMsg = 0, nWords = 0; for (const m of data.maps) for (const x of [...m.messages, ...m.never]) { nMsg++; nWords += words(x.text); }
const groups = []; for (const m of data.maps) { const key = `${m.campaign}|${m.group}`; let g = groups.find((q) => q.key === key); if (!g) { g = { key, campaign: m.campaign, title: m.group, maps: [] }; groups.push(g); } g.maps.push(m); }

const msgRow = (x, extra = '') => `<li class="m k-${kindOf(x.speaker)}${extra}" id="m-${esc(x.id)}"><span class="who">${esc(x.speaker || '-')}</span><span class="tx">${esc(x.text)}</span><span class="meta">${x.tick != null ? mmss(x.tick) + ' ' : ''}${esc(x.route ?? '')}${x.route ? ' ' : ''}<span class="id">${esc(x.id)}</span></span></li>`;
const cards = (list, cls = '') => `<ul class="cards ${cls}">${list.map((c) => `<li class="m k-${kindOf(c.who)}"><span class="who">${esc(c.who || '')}</span><span class="tx">${esc(c.text)}</span></li>`).join('')}</ul>`;

function mapHtml(m) {
  const sec = m.kind === 'secret';
  const ob = m.objectives.length ? `<details class="obj"><summary>Objectives on the main route (${m.objectives.length})</summary><ul>${m.objectives.map((o) => `<li><span class="meta">${mmss(o.t)}</span> ${esc(o.text)}</li>`).join('')}</ul></details>` : '';
  const never = m.never.length ? `<p class="held">Said only in another case (a reminder held once its gate is open, or the other choice):</p><ul class="msgs">${m.never.map((x) => msgRow({ ...x, route: x.choice ? 'choice ' + x.choice : 'held', tick: null }, ' held')).join('')}</ul>` : '';
  return `<article class="map${sec ? ' secret' : ''}" id="${m.id}">
  <h3><span class="mid">${m.id}</span> ${esc(m.name)}${sec ? ' <span class="tag">secret</span>' : ''}</h3>
  ${m.purpose ? `<p class="purpose">${esc(m.purpose)}</p>` : ''}
  ${m.intro ? `<div class="card intro"><b>${esc(m.intro.title ?? '')}</b><span>${(m.intro.lines ?? []).map(esc).join(' <i>/</i> ')}</span></div>` : ''}
  <ul class="msgs">${m.messages.map((x) => msgRow(x, x.route === 'main' ? '' : ' alt')).join('')}</ul>
  ${never}
  ${m.scenes.map((s) => `<div class="card scene"><b>Cinematic: ${esc(s.title || s.id)}</b>${cards(s.lines.map((l) => ({ who: l.who, text: l.text })))}</div>`).join('')}
  ${m.outro ? `<div class="card outro"><b>Outro</b><span>${esc(m.outro)}</span></div>` : ''}
  ${ob}
  ${data.epilogues[m.campaign]?.after === m.id ? `<div class="card epilogue"><b>Epilogue of Campaign ${m.campaign === 1 ? 'One' : 'Two'}: ${esc(data.epilogues[m.campaign].title)}</b>${cards(data.epilogues[m.campaign].cards)}</div>` : ''}
</article>`;
}

const sheet = fs.readFileSync(path.join(root, 'design/story/CONTINUITY.md'), 'utf8');
const nav = groups.map((g) => `<div class="grp"><b>${g.campaign === 1 ? 'One' : 'Two'}: ${esc(g.title)}</b>${g.maps.map((m) => `<a href="#${m.id}">${m.id}</a>`).join('')}</div>`).join('');

const html = `<title>Hushfall Story Record</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap">
<style>
:root { --bg:#eceeed; --surface:#f7f8f7; --ink:#18232a; --muted:#566872; --line:#cbd4d6; --accent:#a1600f; --accent-soft:#f0dfc4; --ines:#1d6573; --signal:#7a4b9e; --hull:#566872; --doc:#8a5a14; --voice:#2b7a4b; --held:#b0352c;
  --f-display:"Barlow Condensed","Arial Narrow",sans-serif; --f-body:"Newsreader",Georgia,serif; --f-mono:"IBM Plex Mono",ui-monospace,monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0e1418; --surface:#151d23; --ink:#e4ebee; --muted:#93a4ae; --line:#28343c; --accent:#e8a23a; --accent-soft:#3a2c13; --ines:#62b4c3; --signal:#b99ae0; --hull:#93a4ae; --doc:#e0b36a; --voice:#66c08b; --held:#e8776d; color-scheme:dark; } }
:root[data-theme="dark"] { --bg:#0e1418; --surface:#151d23; --ink:#e4ebee; --muted:#93a4ae; --line:#28343c; --accent:#e8a23a; --accent-soft:#3a2c13; --ines:#62b4c3; --signal:#b99ae0; --hull:#93a4ae; --doc:#e0b36a; --voice:#66c08b; --held:#e8776d; color-scheme:dark; }
* { box-sizing:border-box; }
body { background:var(--bg); color:var(--ink); font:400 18px/1.6 var(--f-body); padding-inline:16px; padding-block:0 80px; }
.wrap { max-width:1180px; margin-inline:auto; display:grid; grid-template-columns:minmax(0,1fr); gap:24px; }
@media (min-width:1000px) { .wrap { grid-template-columns:200px minmax(0,1fr); } }
header { grid-column:1/-1; padding-block:36px 8px; border-bottom:2px solid var(--ink); }
h1 { font:700 clamp(36px,6vw,60px)/0.95 var(--f-display); text-transform:uppercase; margin:0 0 10px; }
.lede { max-width:68ch; margin:0 0 14px; }
.stats { display:flex; flex-wrap:wrap; gap:8px; list-style:none; margin:0 0 16px; padding:0; }
.stats li { font:500 13px/1 var(--f-mono); padding:8px 10px; border:1px solid var(--line); background:var(--surface); }
.stats b { color:var(--accent); font-weight:500; }
nav { position:sticky; top:env(safe-area-inset-top,0px); align-self:start; max-height:100vh; overflow:auto; font:500 13px/1.2 var(--f-mono); padding-block:12px; }
@media (max-width:999px) { nav { position:static; max-height:none; } }
nav .grp { margin-bottom:14px; } nav .grp b { display:block; font:600 14px var(--f-display); letter-spacing:.06em; text-transform:uppercase; color:var(--accent); margin-bottom:4px; }
nav a { display:inline-block; margin:0 6px 4px 0; color:var(--muted); text-decoration:none; } nav a:hover { color:var(--accent); text-decoration:underline; }
main { min-width:0; }
.legend { display:flex; flex-wrap:wrap; gap:6px 14px; font:500 12px var(--f-mono); color:var(--muted); margin:6px 0 0; }
.legend i { font-style:normal; font-weight:600; } .k-ines i{color:var(--ines)} .k-signal i{color:var(--signal)} .k-hull i{color:var(--hull)} .k-doc i{color:var(--doc)} .k-voice i{color:var(--voice)}
.look { background:var(--accent-soft); border-left:4px solid var(--accent); padding:12px 16px; margin:18px 0; max-width:76ch; font-size:16px; } .look p { margin:0 0 6px; } .look ul { margin:6px 0 0; padding-left:20px; }
.controls { display:flex; flex-wrap:wrap; gap:10px 18px; align-items:center; margin:16px 0 8px; font:500 13px var(--f-mono); } .controls input[type=search] { font:inherit; padding:6px 8px; border:1px solid var(--line); background:var(--surface); color:var(--ink); min-width:220px; }
h2 { font:700 clamp(28px,4vw,40px)/1 var(--f-display); text-transform:uppercase; margin:44px 0 6px; padding-top:8px; border-top:2px solid var(--ink); }
h2 .c { color:var(--accent); margin-right:10px; }
.map { margin-block:30px; padding:16px 0 4px; border-top:1px solid var(--line); scroll-margin-top:12px; }
h3 { font:600 26px/1.15 var(--f-display); letter-spacing:.03em; text-transform:uppercase; margin:0 0 4px; } h3 .mid { color:var(--accent); font:500 14px var(--f-mono); letter-spacing:.04em; margin-right:8px; vertical-align:2px; }
.tag { font:500 11px var(--f-mono); letter-spacing:.05em; text-transform:uppercase; border:1px solid currentColor; padding:2px 5px; color:var(--doc); vertical-align:3px; }
.purpose { margin:0 0 10px; color:var(--muted); font-style:italic; font-size:15px; }
.card { border:1px solid var(--line); background:var(--surface); padding:8px 12px; margin:8px 0; font-size:16px; } .card > b { display:block; font:600 12px var(--f-mono); letter-spacing:.05em; text-transform:uppercase; color:var(--muted); margin-bottom:2px; } .card.outro { border-style:dashed; } .card.epilogue { border-color:var(--accent); background:var(--accent-soft); }
ul.msgs, ul.cards { list-style:none; margin:8px 0; padding:0; }
.m { display:grid; grid-template-columns:128px minmax(0,1fr); gap:2px 14px; padding:5px 0; border-bottom:1px solid color-mix(in srgb, var(--line) 55%, transparent); }
@media (max-width:640px) { .m { grid-template-columns:minmax(0,1fr); } }
.who { font:600 13px/1.5 var(--f-display); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); padding-top:3px; }
.k-ines .who { color:var(--ines); } .k-signal .who { color:var(--signal); } .k-hull .who { color:var(--hull); } .k-doc .who { color:var(--doc); } .k-voice .who { color:var(--voice); }
.k-doc .tx { font-family:var(--f-mono); font-size:15px; } .k-hull .tx { font-size:17px; color:color-mix(in srgb, var(--ink) 82%, var(--muted)); }
.meta { grid-column:2; font:400 11px var(--f-mono); color:var(--muted); } @media (max-width:640px) { .meta { grid-column:1; } } .id { opacity:.65; }
.alt .tx { opacity:.9; } .alt .meta::before { content:"also: "; } .held { }
li.held .tx { border-left:3px dashed var(--held); padding-left:8px; } p.held { font:500 12px var(--f-mono); color:var(--held); margin:10px 0 0; }
details.obj { margin:10px 0 0; font-size:14px; color:var(--muted); } details.obj summary { cursor:pointer; font:500 12px var(--f-mono); } details.obj ul { margin:6px 0; padding-left:18px; }
.sheet { margin-top:56px; padding-top:8px; border-top:2px solid var(--ink); } .sheet h3, .sheet h4, .sheet h5 { font-family:var(--f-display); text-transform:uppercase; letter-spacing:.03em; margin:22px 0 6px; } .sheet h3 { font-size:26px; } .sheet h4 { font-size:21px; color:var(--accent); } .sheet p, .sheet li { font-size:16px; max-width:80ch; }
.scroll { overflow-x:auto; margin-block:10px; border:1px solid var(--line); background:var(--surface); } table { border-collapse:collapse; width:100%; font:400 14px/1.45 var(--f-body); } th,td { text-align:left; vertical-align:top; padding:6px 10px; border-bottom:1px solid var(--line); } th { font:600 11px var(--f-mono); text-transform:uppercase; letter-spacing:.05em; color:var(--muted); } code { font:400 .88em var(--f-mono); background:var(--surface); border:1px solid var(--line); padding:0 4px; }
.hide-alt .alt, .hide-held .held, .hide-obj details.obj { display:none; } .filtered .map { display:none; } .filtered .map.hit { display:block; } .m.hl { background:var(--accent-soft); }
</style>
<div class="wrap">
<header>
  <h1>Hushfall: the story, in play order</h1>
  <p class="lede">Every line a player is made to read, in the order a player meets it: the cold open, then both campaigns map by map, with the cards, the cinematics and the two epilogues. Written by an AI agent for a human director, so it is read here the way an outside reader would read it. The canon is <code>design/LORE.md</code>; the facts it is checked against are the continuity sheet at the end of this page.</p>
  <ul class="stats"><li><b>${data.maps.length}</b> maps</li><li><b>${nMsg}</b> messages</li><li><b>${nWords.toLocaleString('en')}</b> words in them</li><li>2 campaigns, 2 epilogues, 6 cinematics, 1 cold open</li></ul>
  <div class="look"><p><b>What to look for</b> (and to say, by commenting on a line):</p><ul>
    <li>A line that sounds written instead of said; a line another speaker could have said.</li>
    <li>Something a character could not know where they stand, or something the story never explained.</li>
    <li>A fact told twice in one map, or one sentence shape too many times.</li>
    <li>A place where you did not know why the player goes on.</li>
    <li>A line you would keep exactly as it is. (That list matters as much as the other.)</li></ul></div>
</header>
<nav aria-label="Maps"><div class="grp"><b>Start</b><a href="#cold">Cold open</a><a href="#sheet">Continuity</a></div>${nav}</nav>
<main id="top">
  <div class="legend"><span class="k-ines"><i>INES</i> the player</span><span class="k-signal"><i>SIGNAL HOUSE</i> the operator</span><span class="k-hull"><i>HULL</i> the place</span><span class="k-doc"><i>logs, plates, notes</i></span><span class="k-voice"><i>the Silent, the Tender, the Vael</i></span></div>
  <div class="controls"><input type="search" id="q" placeholder="Search the text" aria-label="Search the text"> <label><input type="checkbox" id="alt" checked> secret-route lines</label> <label><input type="checkbox" id="held" checked> held and choice lines</label> <label><input type="checkbox" id="obj" checked> objectives</label></div>
  <section id="cold"><h2><span class="c">0</span>Cold open</h2><div class="card"><b>Before the first level of a new game</b>${cards(data.cold)}</div></section>
  ${groups.map((g) => `<section><h2><span class="c">${g.campaign === 1 ? 'I' : 'II'}</span>${esc(g.title)}</h2>${g.maps.map(mapHtml).join('\n')}</section>`).join('\n')}
  <section class="sheet" id="sheet"><h2>The continuity sheet</h2>${md(sheet.replace(/^# .*\n/, ''))}</section>
</main>
</div>
<script>
(function () {
  var wrap = document.querySelector('.wrap'), q = document.getElementById('q');
  function flag(id, cls) { var el = document.getElementById(id); el.addEventListener('change', function () { wrap.classList.toggle(cls, !el.checked); }); }
  flag('alt', 'hide-alt'); flag('held', 'hide-held'); flag('obj', 'hide-obj');
  q.addEventListener('input', function () {
    var t = q.value.trim().toLowerCase(), maps = document.querySelectorAll('.map');
    wrap.classList.toggle('filtered', !!t);
    document.querySelectorAll('.m.hl').forEach(function (e) { e.classList.remove('hl'); });
    maps.forEach(function (m) { m.classList.remove('hit'); });
    if (!t) return;
    document.querySelectorAll('.map .m').forEach(function (e) { if (e.textContent.toLowerCase().indexOf(t) >= 0) { e.classList.add('hl'); e.closest('.map').classList.add('hit'); } });
  });
})();
</script>
`;
fs.writeFileSync(outFile, html);
console.log(`wrote ${outFile}: ${(html.length / 1024).toFixed(0)} KB, ${data.maps.length} maps, ${nMsg} messages`);
