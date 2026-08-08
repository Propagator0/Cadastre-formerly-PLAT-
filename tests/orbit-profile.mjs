// Splits an orbit drag into script / style / layout / everything-else, using
// the CDP Performance domain. Answers "is the cost JS, or is it the browser
// re-doing style and layout for the whole scene?" — which is the question you
// need answered before optimising anything.
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:3210/';
const LABEL = process.argv[3] ?? 'run';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);

await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForSelector('.plat-building', { state: 'attached', timeout: 120000 });
await page.waitForTimeout(2500);

await cdp.send('Performance.enable');
const asMap = (m) => Object.fromEntries(m.metrics.map((x) => [x.name, x.value]));
const before = asMap(await cdp.send('Performance.getMetrics'));
const t0 = Date.now();

const box = await page.locator('.plat-canvas').boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height * 0.8;
await page.mouse.move(cx, cy);
await page.mouse.down();
const STEPS = 90;
for (let i = 0; i < STEPS; i++) {
  await page.mouse.move(
    cx + Math.sin((i / STEPS) * Math.PI * 2) * 220,
    cy + Math.cos((i / STEPS) * Math.PI * 2) * 40,
  );
  await page.waitForTimeout(8);
}
await page.mouse.up();

const after = asMap(await cdp.send('Performance.getMetrics'));
const wall = (Date.now() - t0) / 1000;
await browser.close();

const d = (k) => +(after[k] - before[k]).toFixed(3);
const secs = (k) => `${d(k).toFixed(2)}s (${((d(k) / wall) * 100).toFixed(0)}% of drag)`;

console.log(JSON.stringify({
  label: LABEL,
  wallClockSec: +wall.toFixed(2),
  script: secs('ScriptDuration'),
  recalcStyle: secs('RecalcStyleDuration'),
  layout: secs('LayoutDuration'),
  totalTask: secs('TaskDuration'),
  recalcStyleCount: d('RecalcStyleCount'),
  layoutCount: d('LayoutCount'),
  nodes: after.Nodes,
  layoutObjects: after.LayoutObjects,
}, null, 2));
