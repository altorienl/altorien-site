/* Renders tools/og-template.html to public/og.png at exactly 1200x630.
 *
 * Headless render rather than a hand-drawn image, so the card uses the same
 * tokens and type as the site and cannot drift from it. Run after changing
 * the template:  node tools/og.js
 *
 * Self-contained on purpose. This used to require a CDP driver from /tmp,
 * which is a scratch directory: the script worked on the machine where that
 * file happened to exist and nowhere else, and it would not have survived a
 * reboot, never mind a new laptop. Chrome's own --screenshot does the same
 * job with nothing to install.
 */
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(p => fs.existsSync(p));

if (!CHROME) {
  console.error('No Chrome found. Install Google Chrome, or point CHROME at a binary.');
  process.exit(1);
}

const tpl = path.join(__dirname, 'og-template.html');
const out = path.join(__dirname, '..', 'public', 'og.png');

execFileSync(CHROME, [
  '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  /* The card is a fixed 1200x630 surface, so the window IS the artboard and
     there is nothing to crop. Scale factor 1: these dimensions are what the
     og:image:width and :height tags declare, and an unfurler that fetches
     four times the pixels it renders is just slower. */
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  '--screenshot=' + out,
  '--virtual-time-budget=4000',
  'file://' + tpl,
], { stdio: 'ignore' });

const { size } = fs.statSync(out);
console.log('public/og.png  ' + Math.round(size / 1024) + ' KB');
