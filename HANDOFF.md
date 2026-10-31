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
| Intrinsics | `intrinsics.app` (GitHub Pages) | `altorienl/intrinsics` (public) |

`altorien.com` nameservers are Cloudflare (`april` / `neil`), registration is
still GoDaddy and paid to **October 2029**. `intrinsics.app` is GoDaddy on
`ns73/ns74.domaincontrol.com`.

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
- **The GitHub graph is baked at deploy time.** It is as old as the last
  deploy. Re-run `node tools/contrib.js` to refresh it.
- **`public/lander/index.html` is a copy of the front page**, on purpose. See
  LANDER.md.
