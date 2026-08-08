// Screenshot helper — loads the city and saves a PNG so visual changes can be
// eyeballed side by side. Usage: node tests/shot.mjs <url> <outfile>
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:3210/';
const OUT = process.argv[3] ?? 'shot.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForSelector('.plat-building', { state: 'attached', timeout: 120000 });
await page.waitForTimeout(3000); // let the entrance animation settle
await page.screenshot({ path: OUT });
await browser.close();
console.log('saved', OUT);
