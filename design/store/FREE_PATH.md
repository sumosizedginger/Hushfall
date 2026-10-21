# The path that costs nothing (PT-071; written for the owner, Joseph R Long, who has no accounts, no budget and one tester)

Not legal or tax advice: the builder is an AI agent and nobody has read this who is paid to. Prices and rules of other companies change; the one-line check for each is named. Where it says "the builder can", that is work that needs no money.

## 1. What costs money, and what does not

| thing | cost | when |
|---|---|---|
| an itch.io account and a game page | **free**. itch.io takes a share of sales that YOU set (it suggests 10%; 0% is allowed); the payment processor's cut comes out of each sale | now |
| the web build on itch.io | **free** (`npm run package` makes the zip; upload it and tick "play in the browser") | now |
| a PayPal account (or Stripe) to be paid | free to open | when you charge anything |
| testers | free (below) | now |
| a Steam page | **$100 per game** (Steam Direct; recouped once the game has earned $1,000) plus an identity and tax interview, and a desktop wrapper (Steam does not run a browser game as it is: the builder can prototype one, it is not built) | later, if the game earns attention |
| registering the name as a trademark | roughly $350 per class at the US office, per application | not now: you gain common-law rights by using the name, and registration is for when money is at stake |
| a lawyer | an hour costs more than the first year of sales | not now |

So the whole path to a public, playable, paid-or-free release is **$0**. The first thing worth paying for is Steam's $100, and only after real people have played it.

## 2. The name (the free check, done 2026-10-20 from the web, and what it cannot tell you)

Searched for "Hushfall" as a game, a trademark, an itch.io or Steam title, a band, a brand, a book. **No game by that name turns up.** What does:
- **The Hushfall Archives**, a small slow-fashion clothing brand (Las Vegas, hushfallarchives.com, the handle @hushfallarchives on Instagram, X, TikTok and Bluesky). Different goods from a game, so the risk is small, but the names are the same word and a fan of either could land on the other.
- Near misses: *Hallowfall* (an RPG on itch.io), several games called *Hush*.

What the search cannot do: it is not a trademark search. **You can do the real one yourself, free:** the US Patent and Trademark Office's trademark search (tmsearch.uspto.gov): look for HUSHFALL and HUSH FALL in class 9 (downloadable software and games) and class 41 (entertainment), then the EU's TMview (tmdn.org/tmview) for the same. If either shows a live "HUSHFALL" for games, the name is taken for your purpose. The fashion brand is in class 25 (clothing), which is a different class.

**If you want the name to be beyond doubt, it is cheap to change:** the name lives in the page (`index.html`), `LICENSE`, `package.json`, the store text in this folder and the key art; `tools/dev/store-title.mjs` photographs the key art again. A rename is a find-and-replace and one capture job, not a rebuild. Say so, and the builder will do it.

## 3. The accounts, in order (each is free)

1. An email address you control and will keep (itch.io, PayPal and every tester reply go there).
2. **itch.io** (itch.io/register): a username (`yourname.itch.io/hushfall` is your page's address; no domain needed).
3. **PayPal** (personal or business) for payouts, only when you set a price.
4. **Reddit** and a **Discord** account if you do not have them, for finding testers (section 5).
5. **GitHub**, later and only for Project 2 (the engine, MIT, from a fresh repository: `design/ENGINE_PROJECT.md`); the game's own repository is never published.

## 4. Price and shape, a recommendation

First: **a free page marked "release candidate"** with the web build, so people can play and the opt-in play log can come back (nothing is sent; they export a file). Charging for something nobody has played end to end is a bad first move and itch.io lets you change the price any day. After the first round of fixes: **a fixed price** (the plan said about $10 for the full game) and **a free Episode One as a separate page**: *that demo build is not built* (a build that carries Episode One only is a few hours of the builder's work; ask for it when you want it).

## 5. Testers at $0 (you have one; here is how to have ten)

- **The page itself is the tester brief**: itch.io lets a page be Draft or Restricted (a secret link or a password), so friends and strangers can be given the link and nobody else sees the game. `TESTERS.md` is the one-page brief they read.
- **Where people who like this kind of game are:** r/boomershooters, r/playtesters, r/WebGames (read each rule post first: some want a "feedback friday" thread), and the Discords of retro-shooter communities. Say what it is in one honest line (an old-school browser shooter, about 68 maps, nobody outside its maker has played it to the end), say what you want (a few maps and why you stopped), and never ask for money or a follow.
- **What to ask each one:** play a map or two, press Settings, turn on the play log, press Export at the end, and send the file (that is also what tells the builder how it runs on THEIR computer: the 99th-percentile frame time and the render width it settled on).
- **The one-tester reality:** one honest person who plays three maps and says where they stopped is worth more than the two AI reads. Get that first.

## 6. What an AI-built game must say about itself (see AI_DISCLOSURE.md)

Both itch.io and Steam ask. Answer truthfully; `AI_DISCLOSURE.md` is the plain account to copy from. It is not a weakness in the listing: say it once and move on.

## 7. Taxes and being paid (the few true things)

You can sell as yourself (a sole proprietor, in your own name) on itch.io; no company is needed. The money lands as income to you. Keep every statement. When it is more than pocket money, a free tax-help clinic (in the US, the IRS's VITA programme) or a paid hour with an accountant is the right spend. Nothing here needs you to do that before the first sale.

## 8. The order

1. The one tester plays (nothing else matters as much).
2. The builder fixes what comes back; the outside agents' reports (`audit-pack/`) come back the same week.
3. The name: the free search in section 2.
4. itch.io account, a Restricted page, the web zip (`npm run package`), the store text (`STORE_COPY.md`, `SHOTS.md`, the pictures in `D:\Doom_release\store`).
5. Testers by link; fixes; then the page goes public, free or priced.
6. Steam only if people ask for it and you have the $100.
