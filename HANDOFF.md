# Starting again on a new machine

Written 2026-10-31, because this laptop gets wiped by a former employer on
2026-11-02 and everything below was local-only until that afternoon.

**Nothing here depends on that laptop any more.** All three projects are on
GitHub under `altorienl`, and everything that actually serves traffic runs in
a Cloudflare account that is yours. The laptop was only ever a place to type.

## Before the laptop goes — the last-day list

Written Sunday 2026-11-01, the day before the wipe. Everything here is
something **only a person with a browser and the passwords can do**. None of
it can be done from a repo, and none of it can be done afterwards.

- [ ] **Grant the workflow scope and push the budget monitor.**
      `gh auth refresh -s workflow`, then commit and push
      `fly-with-friends/.github/workflows/budget-watch.yml`. It is written and
      sitting untracked because a plain `repo` token is not allowed to push
      anything under `.github/workflows/`. Without it, running out of searches
      looks exactly like the app working.
- [ ] **Export the GitHub 2FA recovery codes** for `altorienl`, and keep them
      somewhere that is not this machine. `gh auth login` on the new Mac needs
      a second factor and there is no other way in. Everything — all three
      repos, Pages, the Actions secrets, the schedules — hangs off this one
      account.
- [ ] **Check the GitHub notification email is personal.**
      github.com/settings/emails. If it is an employer address, every Actions
      failure notice and the account recovery mail both die with the job.
- [ ] **Log in to each account once from your phone**, not this laptop:
      GitHub, Cloudflare, GoDaddy, SerpApi, financialmodelingprep.com. This is
      the cheap way to find out that a password only ever lived in this
      machine's keychain, while there is still time to reset it.
- [x] **Copy `~/Downloads/Altorien Personal` off** — done, 2026-11-01, to a
      personal Google Drive. This was the only item on the list that nothing
      else could recover: every line of code and every site is on GitHub and
      Cloudflare, but those 112 files existed in one place.

**Decided against, on purpose, so it does not look like an oversight later:**
rotating the FMP key. It was public for 161 days and should be treated as
compromised by the book, but it is out of the browser now (see
`intrinsics/worker/`), so the exposure stopped growing. If FMP's dashboard
ever shows daily calls that do not look like your own traffic, rotate it then
— `intrinsics/worker/README.md` says where both copies live.

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
gh auth login                   # as altorienl -- needs the password AND 2FA
gh auth refresh -s workflow     # without this, pushing .github/workflows/ is rejected
npx wrangler login              # opens a browser, authorizes Cloudflare
git config --global user.name  "Altorien Lockwood"
git config --global user.email "Altorien.Lockwood@outlook.com"

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

## The secrets

| Secret | Lives on | Set it with |
|---|---|---|
| `SERPAPI_KEY` | Cloudflare Worker `fly-with-friends-api` | `cd worker && npx wrangler secret put SERPAPI_KEY` |
| `FMP_API_KEY` | Cloudflare Worker `intrinsics-api` | `cd worker && npx wrangler secret put FMP_API_KEY` |
| `FMP_API_KEY` | GitHub Actions secret on `altorienl/intrinsics` | repo Settings -> Secrets -> Actions |

The two FMP entries are the same key in two places, and missing either one
fails quietly: the Worker copy blanks the page, the Actions copy silently
stops `grades.json` updating. See `intrinsics/README.md`.

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

## Two custom-domain rules that are exact opposites

Getting these backwards takes a live site down, and the habit one teaches is
wrong for the other.

- **GitHub Pages (intrinsics):** the DNS record must exist **first**. Changing
  the `CNAME` file takes the old hostname down the moment it is pushed.
- **Cloudflare Workers (altorien.com, fly.altorien.com):** the hostname must
  have **no DNS records at all**. A Workers custom domain refuses to attach to
  a name that already resolves, and `wrangler deploy` creates the record
  itself from the `[[routes]] custom_domain = true` entries.

Related, and already learned twice the hard way: in `wrangler.toml` a bare key
written **after** a `[[routes]]` table is parsed as part of that table. `name`,
`main` and `workers_dev` must sit above every route block, or `workers_dev`
silently becomes false and every link ever shared at the `workers.dev`
hostname 404s while the custom domain keeps working.

## The account everything hangs off

`altorienl` on GitHub owns all three repos, Pages hosting for Intrinsics, the
Actions secrets and the scheduled workflows. Losing it loses everything in
this document at once.

- **Log in as `altorienl`, not `alockwood-lab`.** On the old machine `gh`
  was labelled `alockwood-lab` while the token underneath belonged to
  `altorienl`, and the two disagreeing is why `gh auth refresh -s workflow`
  would not take: the browser authorised one account and the terminal held a
  token for the other. A clean `gh auth login` as `altorienl` avoids the
  whole thing. Symptom if it happens again: a push is rejected for "without
  `workflow` scope" no matter how many times the scope is granted, and
  `gh api user --jq .login` disagrees with `gh auth status`.
- The notification address must be **personal**, never an employer one. Every
  Actions failure notice and the account recovery mail both go there.
- Export the **2FA recovery codes** and keep them with the personal files, not
  on the machine. `gh auth login` on a new Mac needs the password and a second
  factor, and there is no other way in.
- Registrar is **GoDaddy** (`altorien.com`, paid to Oct 2029). Nameservers
  point at Cloudflare. The `intrinsics.app` forward lives there too and can be
  allowed to lapse.
- One paid API each: **SerpApi** ($25/mo Starter, Fly with Friends) and
  **financialmodelingprep.com** (Intrinsics). Both on the personal email and
  the personal card.

## Monitoring, now that nothing runs on a laptop

- `.github/workflows/budget-watch.yml` in `fly-with-friends` checks the public
  `/budget` endpoint daily and opens a GitHub issue when the search allowance
  goes low or dry. Without it, running out looks exactly like everything
  working: users get a polite 429 and nothing else changes.
- `scan.yml` in `intrinsics` opens an issue when the nightly grade refresh
  fails. It commits daily, which also keeps GitHub from disabling the schedule
  for inactivity — the 60-day idle rule that would otherwise switch both of
  these off silently.
- `./check-secrets.sh` in `fly-with-friends` scans a working tree **and the
  full history of every ref** before publishing. Run it in any repo. The
  one-line grep it replaced was broken for months and reported clean on a file
  holding a live key.
