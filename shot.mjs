import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'http://localhost:3000';
const tag = process.argv[3] || 'x';
const width = parseInt(process.argv[4] || '1440', 10);
const height = parseInt(process.argv[5] || '900', 10);
const outDir = path.join(__dirname, 'temporary screenshots');

const browser = await puppeteer.launch({
  headless: true,
  args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--force-color-profile=srgb']
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name:'prefers-reduced-motion', value:'reduce' }]);
const theme = process.argv[6] || '';
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
if (theme) { await page.evaluate((t)=>document.documentElement.setAttribute('data-theme', t), theme); }
try { await page.evaluate(()=>document.fonts && document.fonts.ready); } catch(e){}
await new Promise(r => setTimeout(r, 1500));

const targets = ['#hero', '#trabalhos', '#sobre', '#contato'];
for (let i=0;i<targets.length;i++){
  try {
    await page.evaluate((sel)=>{ const el=document.querySelector(sel); if(el){ window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY); } }, targets[i]);
    await new Promise(r => setTimeout(r, 700));
    const file = path.join(outDir, `cap-${tag}-${i+1}-${targets[i].slice(1)}.png`);
    await page.screenshot({ path: file, captureBeyondViewport: false, optimizeForSpeed: true });
    console.log('saved', file);
  } catch(err){ console.log('FAIL', targets[i], String(err).split('\n')[0]); }
}
await browser.close();
