// Zoom deformation check. Screenshots the city at min / default / max zoom and
// at a rotated yaw, so the constant-perspective fix and the billboarded labels
// can be eyeballed. Usage: node tests/zoom-check.mjs <url> <outdir>
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:3210/';
const OUT = process.argv[3] ?? '/tmp';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForSelector('.plat-building', { state: 'attached', timeout: 120000 });
await page.waitForTimeout(3000);

const box = await page.locator('.plat-canvas').boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;

// Read the live zoom straight off the DOM: the world transform string carries
// the scale, and --plat-yaw carries the camera angle.
async function state() {
  return page.evaluate(() => {
    const canvas = document.querySelector('.plat-canvas');
    const world = canvas?.firstElementChild;
    return {
      perspective: getComputedStyle(canvas).perspective,
      worldTransform: world ? getComputedStyle(world).transform.slice(0, 60) : null,
      yaw: getComputedStyle(canvas).getPropertyValue('--plat-yaw').trim(),
      pitch: getComputedStyle(canvas).getPropertyValue('--plat-pitch').trim(),
    };
  });
}

async function wheel(delta) {
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, delta);
  await page.waitForTimeout(700);
}

const shots = [];

await wheel(600); // zoom all the way out (clamped at 0.5)
shots.push(['zoom-min', await state()]);
await page.screenshot({ path: `${OUT}/zoom-min.png` });

await wheel(-600); // back to ~1.0-ish, then normalise
await page.waitForTimeout(400);
shots.push(['zoom-mid', await state()]);
await page.screenshot({ path: `${OUT}/zoom-mid.png` });

await wheel(-900); // zoom all the way in (clamped at 1.9)
shots.push(['zoom-max', await state()]);
await page.screenshot({ path: `${OUT}/zoom-max.png` });

// Rotate hard to check labels stay upright and face the camera.
await page.mouse.move(cx, box.y + box.height * 0.85);
await page.mouse.down();
await page.mouse.move(cx + 320, box.y + box.height * 0.85, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(700);
shots.push(['rotated', await state()]);
await page.screenshot({ path: `${OUT}/rotated.png` });

await browser.close();
for (const [name, s] of shots) console.log(name, JSON.stringify(s));
