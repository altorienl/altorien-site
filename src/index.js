/* The site is static assets plus exactly one dynamic route.
 *
 * /contrib.json returns the GitHub contribution calendar, fetched from the
 * PUBLIC profile page -- github.com/users/<login>/contributions needs no
 * token, which is the whole reason this approach was chosen over a scheduled
 * job. No CI, no API token to create, expire or leak, and the graph is never
 * more than six hours behind.
 *
 * index.html still ships a baked copy of the graph, rendered at deploy time,
 * and only replaces it if this responds. So the page is correct with
 * JavaScript off, correct if GitHub is down, and current otherwise.
 */
const LOGIN = 'altorienl';
const TTL = 60 * 60 * 6;   /* six hours, at the edge */
/* Bump when parseCalendar changes shape. The cache key deliberately ignores
 * the query string -- otherwise anyone could force a GitHub fetch per
 * request -- which also means a deploy alone will not invalidate it. This is
 * the handle that does. */
const V = 3;

function parseCalendar(html) {
  /* Counts live in <tool-tip for="cell-id">N contributions on March 3rd.</tool-tip>,
   * not on the cell, so the tips are indexed first and joined by id. */
  const counts = {};
  for (const m of html.matchAll(/<tool-tip[^>]*\sfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^No contributions/.test(m[2]) ? 0 : parseInt(m[2], 10);
    if (!Number.isNaN(n)) counts[m[1]] = n;
  }
  /* GitHub lays the table out as seven rows of weekdays, so the cells arrive
   * in day-of-week order: every Sunday, then every Monday. The grid on the
   * page is drawn week by week, so they are re-sorted into column order
   * using the row and column encoded in the cell id. Rendering the scraped
   * order directly would redraw the year transposed. */
  const cells = [];
  for (const m of html.matchAll(
      /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="contribution-day-component-(\d+)-(\d+)"[^>]*data-level="(\d)"/g)) {
    cells.push({ date: m[1], row: +m[2], col: +m[3], level: +m[4],
                 count: counts['contribution-day-component-' + m[2] + '-' + m[3]] ?? 0 });
  }
  if (!cells.length) throw new Error('no day cells parsed');
  cells.sort((a, b) => (a.col - b.col) || (a.row - b.row));
  const weeks = Math.max(...cells.map(c => c.col)) + 1;
  const days = cells.map(({ date, level, count }) => ({ date, level, count }));

  const active = days.filter(d => d.count > 0);
  const busiest = active.reduce((a, b) => (b.count > a.count ? b : a), { count: 0, date: null });
  return {
    total: days.reduce((s, d) => s + d.count, 0),
    activeDays: active.length,
    busiest,
    weeks,
    days,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    /* One address for one page.
     *
     * www and the apex both answered 200 with identical bytes, which is two
     * indexable URLs for every page on the site. The canonical tag already
     * pointed at the apex and Google usually honours that, but "usually" is
     * the wrong word for the result somebody gets when they search your name.
     * A 301 is a directive rather than a hint, it consolidates any links
     * pointing at www, and it means there is only ever one answer.
     *
     * Done here rather than in _redirects because this Worker answers before
     * the asset handler and both hostnames are routed to it -- a rule in the
     * assets layer never sees the request first. Path and query are preserved
     * so a shared /resume link on www still lands on /resume. */
    if (url.hostname === 'www.altorien.com') {
      url.hostname = 'altorien.com';
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname !== '/contrib.json') return env.ASSETS.fetch(request);

    const cache = caches.default;
    const key = new Request(url.origin + '/contrib.json?v=' + V, { method: 'GET' });
    const hit = await cache.match(key);
    if (hit) return hit;

    try {
      const res = await fetch(`https://github.com/users/${LOGIN}/contributions`, {
        headers: { 'User-Agent': 'altorien.com', 'Accept': 'text/html' },
        cf: { cacheTtl: TTL, cacheEverything: true },
      });
      if (!res.ok) throw new Error('github ' + res.status);
      const body = JSON.stringify(parseCalendar(await res.text()));
      const out = new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${TTL}`,
        },
      });
      ctx.waitUntil(cache.put(key, out.clone()));
      return out;
    } catch (err) {
      /* 204, not 500. The page treats "no answer" as "keep the baked graph",
       * so a GitHub outage leaves a slightly old graph rather than a hole. */
      return new Response(null, { status: 204 });
    }
  },
};
