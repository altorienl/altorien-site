# Starting again on a new machine

Written 2026-10-31, because this laptop gets wiped by a former employer on
2026-11-02 and everything below was local-only until that afternoon.

**Nothing here depends on that laptop any more.** All three projects are on
GitHub under `altorienl`, and everything that actually serves traffic runs in
a Cloudflare account that is yours. The laptop was only ever a place to type.

## What exists

| Thing | Lives at | Repo |
|---|---|---|
| Personal site + resume | `altorien.com`, `www.altorien.com` | `altorienl/altorien-site` (private) |
| Fly with Friends | `fly.altorien.com`, `fly-with-friends.altorien.workers.dev` | `altorienl/fly-with-friends` (private) |
| Fly with Friends API | `fly-with-friends-api.altorien.workers.dev` | same repo, `worker/` |
| Intrinsics | `intrinsics.altorien.com` (GitHub Pages) | `altorienl/intrinsics` (public) |

`altorien.com` nameservers are Cloudflare (`april` / `neil`), registration is
still GoDaddy and paid to **October 2029**. It is the only domain that
matters now -- everything above is a subdomain of it.

`intrinsics.app` is a GoDaddy 301 to `intrinsics.altorien.com` and nothing
else. **It can be allowed to lapse.** When it does, old bookmarks to it stop
working and nothing else changes.

## Day one on a new machine

```bash
# 1. tools
xcode-select --install          # git
brew install node gh            # node 20+, GitHub CLI

# 2. identity
gh auth login                   # as altorienl
npx wrangler login              # opens a browser, authorises Cloudflare

# 3. the code
mkdir -p ~/src && cd ~/src
gh repo clone altorienl/altorien-site
gh repo clone altorienl/fly-with-friends
gh repo clone altorienl/intrinsics
```

That is the whole setup. There is no build step, no package.json to install,
no database to restore.

## Deploying

```bash
# personal site
cd ~/src/altorien-site
node tools/contrib.js                 # refresh the GitHub graph (needs gh auth)
cp index.html resume.html favicon.svg public/
cp index.html public/lander/index.html
npx wrangler deploy

# Fly with Friends — see its own RUNBOOK.md, in short:
cd ~/src/fly-with-friends
cp index.html app.js airports.js airports-extra.js optimizer.js \
   flights.json manifest.json *.png favicon.svg robots.txt dist/
cp -r splash dist/
npx wrangler deploy -c wrangler.site.toml
cd worker && npx wrangler deploy -c ./wrangler.toml
```

## The one secret

`SERPAPI_KEY` is a Cloudflare Worker secret on `fly-with-friends-api`. It
**cannot be read back** out of Cloudflare, by anyone, including you. It does
not need to be: it already lives in the Worker and keeps working untouched
forever. You only need the value again if you ever recreate that Worker from
scratch, and the value is in your SerpApi dashboard under API Key.

```bash
cd worker && npx wrangler secret put SERPAPI_KEY    # only if recreating
```

Nothing else is a secret. No `.env` file anywhere, no key in any repo — that
was checked deliberately and there is a test, `test-share-safety.js`, that
fails if one appears.

## What is NOT backed up by any of this

**`~/Downloads/Altorien Personal` — 36 MB, 32 files, nowhere but this laptop.**
Resume sources, the Rippling offer and handbook, tax returns 2019–2023,
insurance and benefits paperwork, the headshot. None of it is in a repo and
none of it should be pushed to one. Copy that folder to a personal drive or
iCloud **before Monday**. It is the only thing in this document that is
genuinely unrecoverable.

## How Intrinsics is wired

Done on 2026-10-31. Recorded because the arrangement is not obvious.

GitHub Pages serves the repo root on the custom domain in the `CNAME` file,
which now reads `intrinsics.altorien.com`. Cloudflare has a **CNAME
`intrinsics` -> `altorienl.github.io`, DNS only (grey cloud)** -- the grey
cloud is required, because GitHub cannot issue its certificate through
Cloudflare's proxy. GoDaddy 301s the old `intrinsics.app` to the new address.

Pages was kept rather than moving to a Worker on purpose: the nightly scan
commits `grades.json` and Pages redeploys itself. A Worker would need a
Cloudflare API token in CI and would serve stale grades silently the day that
token expired, which is the wrong failure mode to leave behind.

Changing the `CNAME` file takes the OLD hostname down the moment it is
pushed -- Pages answers for one domain only. So the DNS record has to exist
first. `tools/finish-intrinsics.sh` enforces that order and is kept for
reference.

## Things that will bite

- **GoDaddy's DNS zone still exists** for altorien.com and still answers, even
  though delegation moved. If a hostname starts resolving to a parking page,
  check that GoDaddy's DNS Records tab is not advertising Cloudflare's
  nameservers as part of its own zone. That caused a real half-outage on
  2026-10-31 where `fly.altorien.com` was dead on 1.1.1.1 and fine on 8.8.8.8.
- **`workers_dev = true` must stay above the `[[routes]]` tables** in every
  wrangler config. Adding a route silently disables the `workers.dev`
  hostname, which breaks every `?t=` trip link ever shared, and a bare key
  placed after a `[[routes]]` block is parsed as part of it.
- **The GitHub graph updates itself.** `src/index.js` serves `/contrib.json`,
  scraped from `github.com/users/altorienl/contributions` -- the PUBLIC
  profile, so there is no API token anywhere and nothing scheduled that can
  rot. Cached six hours at the edge. `index.html` also ships a copy baked at
  deploy time by `tools/contrib.js`, and only replaces it if the fetch
  succeeds, so the card is right with JavaScript off and right if GitHub is
  down. Bump `V` in `src/index.js` if the JSON shape ever changes; the cache
  key ignores the query string on purpose.
- **That graph shows PUBLIC contributions only** -- 260 where the logged-in
  profile says 340. GitHub -> Settings -> Profile -> "Include private
  contributions on my profile" makes the public number the real one, and this
  picks it up within six hours with no deploy.
- **The footer year reads from the clock**, so it does not need touching in
  January. Dates in the experience list are literal and do not.
- **`public/lander/index.html` is a copy of the front page**, on purpose. See
  LANDER.md.
