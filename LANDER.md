# Why public/lander/ exists

GoDaddy's parking page was the whole of altorien.com for years, and it is one
line of JavaScript: `window.location.href = "/lander"`. Every browser that ever
opened the parked domain still has that HTML on disk under `/`, often with a
long max-age, so it runs before the network is consulted.

Three attempts, for the next person:

1. Nothing — `/lander` 404s with an empty body, so the site reads as blank to
   exactly the people most likely to have visited before.
2. `_redirects` with `/lander / 301` — a redirect loop. Cached `/` fires the
   script, `/lander` sends the browser back to `/`, the browser serves the same
   cached HTML. Safari had let its copy expire; Chrome had not, and hung.
3. `_redirects` with `/lander /index.html 200` — Cloudflare refuses it:
   "Infinite loop detected in this rule", because the rewrite strips `/index`
   and re-triggers itself.

So `/lander/index.html` is a real copy of the front page. No rule, nothing to
loop. The copy carries a `history.replaceState` that tidies the address bar
back to `/` without navigating.

It can be deleted once nobody has a year-old cache of the parked domain, which
is to say: not soon, and there is no cost to leaving it.

Regenerate it with the rest of the copy step:

    cp index.html public/lander/index.html

## Regenerating everything before a deploy

    node tools/contrib.js          # refreshes the GitHub graph from the API
    cp index.html resume.html projects.html favicon.svg public/
    cp index.html public/lander/index.html
    npx wrangler deploy

The contribution graph is baked, so it is as old as the last deploy. That is
the tradeoff for making no third-party request at page load.
