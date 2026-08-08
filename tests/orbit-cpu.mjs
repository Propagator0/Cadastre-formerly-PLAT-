// Captures a JS CPU profile during an orbit drag and prints the functions with
// the most self-time. Use when you know the cost is script (see
// orbit-profile.mjs) and need to know WHICH script.
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:3210/';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);

await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForSelector('.plat-building', { state: 'attached', timeout: 120000 });
await page.waitForTimeout(2500);

await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');

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

const { profile } = await cdp.send('Profiler.stop');
await browser.close();

// Sum self-time per node, then group by function+url.
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const total = profile.timeDeltas.reduce((a, b) => a + Math.max(0, b), 0);
profile.samples.forEach((id, i) => {
  const dt = Math.max(0, profile.timeDeltas[i] ?? 0);
  const n = byId.get(id);
  if (!n) return;
  const f = n.callFrame;
  const name = `${f.functionName || '(anonymous)'} — ${(f.url || '').split('/').slice(-2).join('/')}:${f.lineNumber}`;
  self.set(name, (self.get(name) ?? 0) + dt);
});

const rows = [...self.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 22)
  .map(([name, us]) => `${((us / total) * 100).toFixed(1).padStart(5)}%  ${(us / 1000).toFixed(0).padStart(6)}ms  ${name}`);

console.log(`total sampled: ${(total / 1e6).toFixed(2)}s\n`);
console.log(rows.join('\n'));
