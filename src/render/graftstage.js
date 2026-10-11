// Which stage of the Tollbearer's graft a map draws (render only; models_choir.js `o.stage`): an EARLY graft (a small bell) in Campaign 1 Episode 1, the great bell from Episode 2 on.
// Everything that is not a Campaign 1 map id (Campaign 2, the Range, a map with no id) draws the grown graft.
// PT-035: this was a regex in view.js whose backslashes were lost when it was written (`/^CdE(d)/`), so it matched no map and every map drew the grown graft; nothing asked the game which stage Episode 1 gets.
export function graftStage(map) {
  const m = /^C1E(\d)/.exec(map?.id ?? '');
  return m && Number(m[1]) < 2 ? 0 : 2;
}
