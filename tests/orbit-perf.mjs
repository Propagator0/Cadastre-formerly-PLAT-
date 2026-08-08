// Orbit-drag performance harness for PLAT / Cadastre.
//
// Loads the city, drags the camera in a circle for a fixed number of steps,
// and records how long each animation frame took while that was happening.
// Absolute numbers are specific to this container (headless, software GL) —
// the point is the BEFORE/AFTER ratio measured the same way.

import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:3210/';
const LABEL = process.argv[3] ?? 'run';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
// The city is rendered once the district buildings exist. They're zero-size
// positioning containers (the cubes inside them carry the size), so wait for
// them to be ATTACHED — 'visible' would never pass on a 0x0 box.
await page.waitForSelector('.plat-building', { state: 'attached', timeout: 120000 });
await page.waitForTimeout(2500); // let first paint + data load settle

const domCount = await page.evaluate(() => ({
  total: document.querySelectorAll('*').length,
  inScene: document.querySelectorAll('.plat-canvas *').length,
  buildings: document.querySelectorAll('.plat-building').length,
}));

// Start sampling frame times.
await page.evaluate(() => {
  window.__frames = [];
  window.__sampling = true;
  let last = performance.now();
  const tick = (now) => {
    window.__frames.push(now - last);
    last = now;
    if (window.__sampling) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// Drag from the middle of the canvas. Start on empty ground, well away from
// the buildings clustered near the centre.
const box = await page.locator('.plat-canvas').boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height * 0.8;

await page.mouse.move(cx, cy);
await page.mouse.down();
const STEPS = 90;
for (let i = 0; i < STEPS; i++) {
  const dx = Math.sin((i / STEPS) * Math.PI * 2) * 220;
  const dy = Math.cos((i / STEPS) * Math.PI * 2) * 40;
  await page.mouse.move(cx + dx, cy + dy);
  await page.waitForTimeout(8);
}
await page.mouse.up();

const frames = await page.evaluate(() => {
  window.__sampling = false;
  return window.__frames;
});

await browser.close();

// Drop the first few frames (drag start-up) and anything absurd (tab throttle).
const clean = frames.slice(3).filter((f) => f > 0 && f < 2000).sort((a, b) => a - b);
const pct = (p) => clean[Math.min(clean.length - 1, Math.floor(clean.length * p))];
const mean = clean.reduce((a, b) => a + b, 0) / clean.length;

console.log(JSON.stringify({
  label: LABEL,
  frames: clean.length,
  meanFrameMs: +mean.toFixed(1),
  medianFrameMs: +pct(0.5).toFixed(1),
  p95FrameMs: +pct(0.95).toFixed(1),
  worstFrameMs: +clean[clean.length - 1].toFixed(1),
  approxFps: +(1000 / mean).toFixed(1),
  framesOver50ms: clean.filter((f) => f > 50).length,
  dom: domCount,
  consoleErrors: consoleErrors.slice(0, 5),
}, null, 2));
