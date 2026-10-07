import {chromium,webkit} from 'playwright-core';
import {writeFileSync,mkdirSync} from 'node:fs';
const base='http://127.0.0.1:3202';const checks=[];const errors=[];
mkdirSync('.forge/screenshots',{recursive:true});
for(const engine of ['chromium','webkit']){
 const browser=await (engine==='chromium'?chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}):webkit.launch({executablePath:'/Users/blaze/Library/Caches/ms-playwright/webkit-2359/pw_run.sh',headless:true}));
 const page=await browser.newPage({viewport:{width:375,height:812}});page.on('pageerror',e=>errors.push({engine,message:e.message}));
 await page.goto(base+'/play/pocket-paradise');await page.getByRole('button',{name:'Build a neighborhood',exact:true}).click();
 await page.getByRole('button',{name:'Row 1, column 1: empty plot',exact:true}).click();
 if(!(await page.getByRole('button',{name:/Confirm placement/}).isEnabled()))throw Error('No preview');
 await page.getByRole('button',{name:'Cancel preview'}).click();
 if(!(await page.getByRole('button',{name:'Choose a plot to continue'}).isDisabled()))throw Error('Cancel failed');
 await page.getByRole('button',{name:'Row 1, column 1: empty plot',exact:true}).click();await page.getByRole('button',{name:/Confirm placement/}).click();
 await page.reload();await page.getByText('1/20 plots',{exact:true}).waitFor();checks.push({engine,check:'save/resume, preview/cancel',passed:true});
 await page.getByRole('button',{name:'Row 1, column 2: empty plot',exact:true}).click();
 for(const width of [320,375,717,820,1440]) { await page.setViewportSize({width,height:812}); const d=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));if(d.scroll>d.inner)throw Error('Preview overflow'); const b=await page.getByRole('button',{name:/Confirm placement/}).boundingBox();if(width<1024&&(!b||b.y+b.height>812))throw Error('Dock unreachable');checks.push({engine,width,check:'preview dock visible without overflow',passed:true});if(width===375&&engine==='chromium'){await page.getByRole('button',{name:'Row 1, column 2: empty plot, selected',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'.forge/screenshots/pocket-dimensional-preview.png'});}}
 await page.getByRole('button',{name:'Cancel preview'}).click();
 for(let i=1;i<20;i++){await page.getByRole('button',{name:`Row ${Math.floor(i/5)+1}, column ${i%5+1}: empty plot`,exact:true}).click();await page.getByRole('button',{name:/Confirm placement/}).click();}
 await page.getByRole('heading',{name:'A little paradise'}).waitFor();await page.getByText('Sign in to save this game to your progress, then return here and retry.',{exact:true}).waitFor();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download your postcard'}).click();await download;checks.push({engine,check:'20-turn complete, guest progress, postcard',passed:true});
 await page.getByRole('button',{name:'Dimensional board',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Flat board · on',exact:true}).waitFor();checks.push({engine,check:'flat preference survives reload',passed:true});
 for(const theme of ['dark','light','arcade','ocean'])for(const width of [320,375,717,820,1440]){await page.setViewportSize({width,height:width===717?512:900});await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem('gamehub-theme',t)},theme);const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));if(dimensions.scroll>dimensions.inner)throw Error(`Overflow ${engine} ${theme} ${width}`);checks.push({engine,theme,width,check:'no horizontal overflow',passed:true});if(engine==='chromium'&&width===375){await page.screenshot({path:`.forge/screenshots/pocket-${theme}.png`,fullPage:true});}}
 await page.getByText('Build another neighborhood',{exact:true}).click();await page.getByRole('button',{name:'New practice run'}).click();
 for(let i=0;i<20;i++){await page.getByRole('button',{name:`Row ${Math.floor(i/5)+1}, column ${i%5+1}: empty plot`,exact:true}).click();await page.getByRole('button',{name:/Confirm placement/}).click();}
 await page.getByText('Practice complete. This relaxed run does not update account statistics.',{exact:true}).waitFor();checks.push({engine,check:'practice complete without account save',passed:true});
 await browser.close();
}
writeFileSync('.forge/pocket-browser.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors}));if(errors.length)process.exitCode=1;
