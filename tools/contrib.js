/* Bakes the GitHub contribution graph into index.html as static squares.
 *
 * The alternative was an <img> from one of the third-party chart services.
 * That hands a stranger the traffic of everyone who opens the page, puts a
 * render-blocking request on the critical path, and leaves a broken image on
 * the front page the day that service goes down. The data is 53x7 integers --
 * there is no reason to fetch it at view time instead of at deploy time.
 *
 * The anchor carries target="_blank" rel="noopener" deliberately: every
 * outbound link on this page opens in a new tab, and this block is
 * GENERATED, so dropping the attributes here silently reverts that the
 * next time anyone regenerates the graph. It already did once.
 *
 * Run it before deploying:  node tools/contrib.js
 * It needs `gh` authenticated, rewrites the block between the two markers in
 * index.html, and makes no network call at page load.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const LOGIN = 'altorienl';
/* The login is interpolated into the query rather than passed with -f. `gh`
 * substitutes -f values into the query text itself, so a real GraphQL
 * variable declaration ($login:String!) gets mangled before it is sent and
 * the API rejects it at column 7. */
/* One line. JSON.stringify turns a template literal's newlines into a literal
 * backslash-n inside the shell argument, which GraphQL rejects as an unknown
 * character rather than whitespace. */
const q = `query{ user(login:"${LOGIN}"){ contributionsCollection{ contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } } } } }`;

const raw = execSync(
  `gh api graphql -f query=${JSON.stringify(q)}`,
  { encoding: 'utf8', maxBuffer: 8 << 20 });
const cal = JSON.parse(raw).data.user.contributionsCollection.contributionCalendar;

const days = cal.weeks.flatMap(w => w.contributionDays);
const active = days.filter(d => d.contributionCount > 0).length;
const busiest = days.reduce((a, b) => (b.contributionCount > a.contributionCount ? b : a));

/* Five steps, like GitHub's own, but on this page's amber rather than its
 * green -- the graph is one element in a cream-and-amber page and a green
 * block would read as a widget somebody pasted in. Thresholds are relative to
 * the busiest day so a quiet year still shows contrast. */
const peak = Math.max(1, busiest.contributionCount);
const RAMP = ['#e2ddd1', '#f0cf8e', '#e8a93a', '#c07c00', '#8a5600'];
const step = n => (n === 0 ? 0
  : n >= peak * 0.6 ? 4 : n >= peak * 0.3 ? 3 : n >= peak * 0.12 ? 2 : 1);

/* One <i> per day, column per week. Title text is the accessible layer: the
 * grid itself is aria-hidden, and the sentence above it carries the numbers
 * for anyone not looking at squares. */
const cols = cal.weeks.map(w => {
  const cells = w.contributionDays.map(d => {
    const s = step(d.contributionCount);
    return `<i style="background:${RAMP[s]}" title="${d.date}: ${d.contributionCount}"></i>`;
  }).join('');
  return `<span class="gw">${cells}</span>`;
}).join('');

/* A label every time the month changes, EXCEPT when the previous one is
 * fewer than four columns back. A three-letter month occupies about four
 * columns, so two labels closer than that collide -- the first render put
 * "OCT" and "NOV" on top of each other as "ONOV". The dropped label is
 * always the later of the pair, so the row still starts where the data
 * does. */
const MIN_GAP = 4;
const months = [];
let last = '', lastCol = -MIN_GAP;
cal.weeks.forEach((w, i) => {
  const m = new Date(w.contributionDays[0].date + 'T00:00:00Z')
    .toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  if (m === last || i >= cal.weeks.length - 1) return;
  if (i - lastCol < MIN_GAP) { last = m; return; }
  months.push(`<span style="--c:${i + 1}">${m}</span>`);
  last = m; lastCol = i;
});

/* The grid alone is a grid. The owner's note: somebody who is not technical
 * has no idea what it is, and this page is read by finance people. So it is
 * labeled in words, says what a square means, and the whole block is a link
 * to the profile so the claim can be checked in one tap. The octocat mark is
 * there because it is the one piece of this that is recognized without
 * reading anything. */
const block = `<!--CONTRIB-->
    <a class="contrib" href="https://github.com/${LOGIN}" target="_blank" rel="noopener">
        <div class="contrib-head">
            <svg viewBox="0 0 16 16" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
            <b>GitHub</b>
            <span class="contrib-what">one square per day, last 12 months</span>
            <span class="contrib-go" aria-hidden="true">&rsaquo;</span>
        </div>
        <div class="gmonths">${months.join('')}</div>
        <div class="grid" aria-hidden="true">${cols}</div>
        <div class="glegend"><span>Fewer</span>${
          RAMP.map(c => `<i style="background:${c}"></i>`).join('')}<span>More</span></div>
        <div class="contrib-line">
            <b>${cal.totalContributions}</b> contributions on
            <b>${active}</b> days &middot; busiest was <b>${busiest.contributionCount}</b>
            on ${new Date(busiest.date + 'T00:00:00Z').toLocaleDateString('en-US',
              { month: 'long', day: 'numeric', timeZone: 'UTC' })}
        </div>
    </a>
    <!--/CONTRIB-->`;

const file = __dirname + '/../index.html';
let html = fs.readFileSync(file, 'utf8');
const re = /<!--CONTRIB-->[\s\S]*?<!--\/CONTRIB-->/;
if (!re.test(html)) throw new Error('index.html has no <!--CONTRIB--> block to fill');
fs.writeFileSync(file, html.replace(re, block));
console.log(`${cal.totalContributions} contributions, ${active} active days, peak ${busiest.contributionCount} (${busiest.date})`);
