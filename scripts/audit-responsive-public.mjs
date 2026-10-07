// Read-only public responsive audit. Local pass-and-play interactions stay in browser state.
import { chromium, webkit } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.env.QA_PUBLIC_ORIGIN || 'https://naijagamehub.vercel.app';
const artifact = process.env.QA_PUBLIC_ORIGIN ? 'responsive-public-final' : 'responsive-public';
const report = { origin: base, at: new Date().toISOString(), checks: [], defects: [], errors: [], engines: {}, screenshots: [] };
const sizes = [[320,740],[360,800],[375,812],[390,844],[412,915],[540,720],[768,1024],[820,1180],[1024,768],[1440,900],[1920,1080],[844,390],[344,882],[717,512]];
const slugs = ['mystery-card','know-your-partner','code-crackers','word-chain','reverse-definition','mental-math-duel','rule-discoverer','who-remembers'];
mkdirSync('.forge/screenshots', { recursive: true });
const persist = () => writeFileSync(`.forge/${artifact}.json`, JSON.stringify(report, null, 2));
async function measure(page, label) {
 await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getTiming().iterations)).map(a => a.finished.catch(() => {}))); });
 await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
 const result = await page.evaluate(() => {
  const root = document.documentElement;
  const describe = e => `${e.tagName.toLowerCase()}${e.id ? '#'+e.id : ''}.${String(e.className).split(/\s+/).slice(0,3).join('.')}: ${e.textContent?.trim().slice(0,65)}`;
  const intentional = e => { for(let p=e.parentElement;p && p!==document.body;p=p.parentElement) if(/auto|scroll/.test(getComputedStyle(p).overflowX) && p.scrollWidth>p.clientWidth) return true; return false; };
  const controls = [...document.querySelectorAll('main a, main button, main input, main select, main textarea, header a, header button')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility!=='hidden');
  return { width: innerWidth, height: innerHeight, documentWidth: root.scrollWidth, documentHeight: root.scrollHeight,
   outside: controls.filter(e => {const r=e.getBoundingClientRect();return (r.left < -1 || r.right>innerWidth+1) && !intentional(e);}).map(describe),
   clipped: controls.filter(e => {const r=e.getBoundingClientRect();for(let p=e.parentElement;p && p!==document.body;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(s.overflowX==='hidden' && (r.left < b.left-1 || r.right>b.right+1))return true;}return false;}).map(describe),
   overflowing: [...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width && (r.right>innerWidth+1||r.left < -1)&&!intentional(e);}).slice(0,8).map(describe)
  };
 });
 await page.evaluate(() => scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
 result.bottomReachable = await page.evaluate(() => Math.abs(scrollY+innerHeight-document.documentElement.scrollHeight)<3 || document.documentElement.scrollHeight<=innerHeight);
 const requestedWidth=page.viewportSize().width;
 const check={label,requestedWidth,...result}; report.checks.push(check);
 if(result.documentWidth>requestedWidth+1 || result.width>requestedWidth+1 || result.outside.length || result.clipped.length || !result.bottomReachable){ report.defects.push(check); if(report.screenshots.length<8){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'})); const path=`.forge/screenshots/responsive-public-defect-${report.screenshots.length+1}.png`;await page.screenshot({path});report.screenshots.push({label,path});} }
 persist();
}
async function runChrome() {
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 report.engines.chromium=browser.version();
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 try {
  for(const route of ['/','/games','/themes','/login','/register','/forgot-password','/reset-password',...slugs.map(s=>'/games/local/'+s)]){
   await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000}); await page.locator('main').waitFor();
   for(const [width,height] of sizes){ await page.setViewportSize({width,height});await measure(page,`chromium ${route} ${width}x${height}`); }
   if(route.includes('/games/local/')){await page.getByRole('button',{name:/^Start (game|duel)$/}).click();for(const [width,height] of [[320,740],[390,844],[768,1024],[844,390],[344,882],[717,512]]){await page.setViewportSize({width,height});await measure(page,`chromium ${route} playing ${width}x${height}`);}}
   console.log(`Completed ${route}; ${report.checks.length} viewport checks, ${report.defects.length} findings`);
  }
  await page.goto(base+'/games',{waitUntil:'domcontentloaded',timeout:60000});
  for(const theme of ['dark','light','arcade','ocean']) {await page.evaluate(t=>{localStorage.setItem('gamehub-theme',t);document.documentElement.dataset.theme=t;},theme);for(const [width,height]of[[320,740],[390,844],[768,1024],[844,390],[1920,1080]]){await page.setViewportSize({width,height});await measure(page,`chromium /games theme:${theme} ${width}x${height}`);} }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:'.forge/screenshots/responsive-public-games-phone.png'});
 }finally{await browser.close();}
}
async function runWebkit(){let browser;try{
 browser=await webkit.launch({headless:true,executablePath:'/Users/blaze/Library/Caches/ms-playwright/webkit-2359/pw_run.sh'});report.engines.webkit=browser.version();const context=await browser.newContext({isMobile:true,hasTouch:true});const page=await context.newPage();
 for(const route of ['/','/games','/themes',...slugs.map(s=>'/games/local/'+s)]){await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});for(const [width,height]of[[375,812],[390,844],[820,1180],[844,390]]){await page.setViewportSize({width,height});await measure(page,`webkit ${route} ${width}x${height}`);}}
}catch(error){report.engines.webkitUnsupported=String(error);}finally{if(browser)await browser.close();}}
try{await runChrome();await runWebkit();}catch(error){report.errors.push(error.stack);process.exitCode=1;}finally{persist();console.log(JSON.stringify({checks:report.checks.length,defects:report.defects.length,errors:report.errors,engines:report.engines},null,2));if(report.defects.length||report.errors.length)process.exitCode=1;}
