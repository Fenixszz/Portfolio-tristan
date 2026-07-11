import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'http://localhost:3000';
const tag = process.argv[3] || 'live';
const width = parseInt(process.argv[4] || '1440', 10);
const height = parseInt(process.argv[5] || '900', 10);
const outDir = path.join(__dirname, 'temporary screenshots');
const browser = await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil:'load', timeout:30000 });
try { await page.evaluate(()=>document.fonts && document.fonts.ready); } catch(e){}
// wait for preloader + intro to finish
await new Promise(r => setTimeout(r, 5200));
await page.screenshot({ path: path.join(outDir, `live-${tag}-hero.png`) });
console.log('hero shot done');
// scroll through and grab a couple
const spots = [['trabalhos','#trabalhos'],['oficio','#oficio'],['idiomas','#idiomas']];
for (const [name,sel] of spots){
  await page.evaluate((s)=>{ const el=document.querySelector(s); if(el) el.scrollIntoView({behavior:'instant',block:'start'}); }, sel);
  await new Promise(r=>setTimeout(r, 1400));
  await page.screenshot({ path: path.join(outDir, `live-${tag}-${name}.png`) });
  console.log('shot', name);
}
await browser.close();
