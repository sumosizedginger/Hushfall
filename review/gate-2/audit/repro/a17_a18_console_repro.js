// A17 / A18: paste into the browser console of the DEV build (npm run dev, http://localhost:5173/) after the title screen is up.
// It uses the dev-only window.__GAME_TEST__ hook only to jump to a map through the game's own startLevel(); every other step is the real UI button.
// (Tip: use a private window; the snippet clears localStorage for the origin.)
(async () => {
  const t = window.__GAME_TEST__, $ = (id) => document.getElementById(id), out = {};
  localStorage.clear();

  // ---- A17: New Game after Quit to title re-enters the LAST map ----
  t.newGame('normal', 5, { mapId: 'C1E1M05' });      // stand-in for "played up to Lamplighter Hill"
  t.pause(); $('btn-quit').click();                     // Pause -> Quit to title
  out.A17_title = { mode: t.state().mode, mapId: t.state().mapId };          // mapId is still C1E1M05
  $('btn-normal').click();                              // the title screen's Normal button = "new game"
  out.A17_newGame = { mode: t.state().mode, mapId: t.state().mapId, ammo: t.state().player.ammo };   // EXPECTED C1E1M01 with 8 flares; OBSERVED C1E1M05 with 8/12/60

  // ---- A18: Continue prefers the stale quick-save over the newer auto-save ----
  localStorage.clear();
  t.newGame('normal', 1, { mapId: 'C1E1M02' }); t.tick(30); t.save();       // F5 in Customs Hall
  t.newGame('normal', 2, { mapId: 'C1E1M06' });                              // later: a new level starts, which auto-saves
  t.pause(); $('btn-quit').click(); $('btn-continue').click();
  out.A18_afterContinue = { mapId: t.state().mapId, tick: t.state().tick };  // EXPECTED C1E1M06; OBSERVED C1E1M02 tick 30
  console.log(JSON.stringify(out, null, 2)); localStorage.clear();
})();
