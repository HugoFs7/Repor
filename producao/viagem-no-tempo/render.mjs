import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
const [,, mode, out, ...rest] = process.argv;
const srv = spawn(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'http.server', '8768'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
page.on('console', m => console.log('console:', m.text()));
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto('http://localhost:8768/index.html');
await page.waitForFunction('window.ready === true', null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
const stage = await page.$('#stage');
fs.mkdirSync(out, { recursive: true });
if (mode === 'stills') {
  for (const t of rest) { await page.evaluate(t => window.renderAt(t), parseFloat(t)); await stage.screenshot({ path: `${out}/t_${t}.png` }); }
} else {
  const fps = parseInt(rest[0] || '24'); const dur = await page.evaluate(() => window.DURATION);
  fs.mkdirSync(out, { recursive: true });
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) { await page.evaluate(t => window.renderAt(t), i / fps); await stage.screenshot({ path: `${out}/f_${String(i).padStart(4, '0')}.png` }); if (i % 48 === 0) console.log('frame', i, '/', n); }
}
await browser.close(); srv.kill();
