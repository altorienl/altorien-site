/* Renders tools/og-template.html to public/og.png at exactly 1200x630.
 *
 * Headless render rather than a hand-drawn image, so the card uses the same
 * tokens and type as the site and cannot drift from it. Run after changing
 * the template:  node tools/og.js
 */
const { launch, Page } = require('/tmp/cdp.js');
const path = require('path'), fs = require('fs');
(async () => {
  await launch();
  const p = await Page.open('about:blank');
  await p.send('Emulation.setDeviceMetricsOverride',
    { width: 1200, height: 630, deviceScaleFactor: 2, mobile: false });
  await p.goto('file://' + path.join(__dirname, 'og-template.html'));
  await new Promise(r => setTimeout(r, 900));
  const r = await p.send('Page.captureScreenshot',
    { format: 'png', clip: { x: 0, y: 0, width: 1200, height: 630, scale: 2 } });
  const out = path.join(__dirname, '..', 'public', 'og.png');
  fs.writeFileSync(out, Buffer.from(r.data, 'base64'));
  console.log('og.png ' + (fs.statSync(out).size / 1024).toFixed(0) + 'KB');
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
