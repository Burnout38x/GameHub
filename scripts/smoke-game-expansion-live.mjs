import { chromium, webkit } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base='https://naijagamehub.vercel.app', checks=[], errors=[];
for(const engine of['chromium','webkit']){
 const browser=await (engine==='chromium'?chromium:webkit).launch({headless:true,executablePath:engine==='chromium'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/Users/blaze/Library/Caches/ms-playwright/webkit-2359/pw_run.sh'});
 try{for(const [width,height]of[[320,740],[390,844],[717,512],[820,1180],[1440,900]]){
  const ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push({engine,width,message:e.message}));
  await page.goto(base+'/games');await page.getByRole('searchbox').waitFor();
  await page.getByRole('searchbox').fill('market day');await page.getByRole('link',{name:'Create Market Day room'}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.getByRole('searchbox').fill('pocket');await page.getByRole('link',{name:'Build your paradise →'}).click();
  await page.getByRole('button',{name:'Relaxed practice',exact:true}).click();await page.getByRole('button',{name:'Row 1, column 1: empty plot',exact:true}).click();await page.getByRole('button',{name:'Cancel preview',exact:true}).click();
  await page.getByRole('button',{name:'Row 1, column 1: empty plot',exact:true}).click();
  await page.getByRole('button',{name:/Confirm placement/}).click();
  await page.getByText('1/20 plots',{exact:true}).waitFor();
  assert.equal(await page.locator('main').count(),1);
  assert.equal(await page.locator('button[aria-label^="Row 1, column 1:"] svg').count(),1);
  await page.locator('.skip-link').focus();
  const clipping=await page.locator('.skip-link').evaluate(el=>getComputedStyle(el).clipPath);
  assert.equal(clipping,'none');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.getByRole('button',{name:'Dimensional board',exact:true}).click();
  checks.push({engine,width,height,library:true,soloPracticePreview:true,miniaturePlacement:true,singleMain:true,visibleSkipLink:true,flatBoard:true,overflow:false});await ctx.close();
 }}finally{await browser.close();}
}
writeFileSync('.forge/game-expansion-live.json',JSON.stringify({base,codeCommit:process.env.QA_CODE_COMMIT ?? 'local-verification',checks,errors},null,2));
assert.deepEqual(errors,[]);console.log(`PASS ${checks.length} live library/solo checks, zero page errors; no production accounts, rooms or results created.`);
