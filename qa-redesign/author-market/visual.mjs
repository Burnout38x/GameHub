import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const evidence=[];
for(const width of [320,390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:3199/qa-market');await page.getByRole('heading',{name:'Market Day',exact:true}).waitFor();await page.screenshot({path:`qa-redesign/author-market/${width}-opening.png`,fullPage:true});
 const board=page.getByRole('region',{name:'Market board',exact:true});await board.screenshot({path:`qa-redesign/author-market/${width}-board.png`});
 const moves=board.getByRole('button');await moves.last().click();await page.getByRole('heading',{name:'Your turn',exact:true}).waitFor();
 const motion=await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.className?.includes?.('traveler')).map(a=>({playState:a.playState,duration:a.effect.getTiming().duration,keyframes:a.effect.getKeyframes().length})));
 await board.screenshot({path:`qa-redesign/author-market/${width}-moving.png`});await page.waitForTimeout(1200);const turnFocus=await page.evaluate(()=>({label:document.activeElement?.getAttribute('aria-label'),top:document.activeElement?.getBoundingClientRect().top}));await page.getByRole('button',{name:/Choose a public contract/}).click();const contractFocus=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'));
 await page.getByRole('button',{name:/Save your resources/}).click();await page.getByRole('button',{name:'Finish turn',exact:true}).click();
 await page.getByRole('button',{name:'Show final fixture',exact:true}).click();await page.getByRole('heading',{name:'Rowan wins!'}).waitFor();await page.waitForTimeout(1200);await page.screenshot({path:`qa-redesign/author-market/${width}-final.png`,fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Reset preview',exact:true}).click();await board.getByRole('button').last().click();const reducedMotionAnimations=await page.evaluate(()=>({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,animations:document.getAnimations().filter(a=>a.effect?.target?.className?.includes?.('traveler')).map(a=>({target:a.effect.target.className,type:a.constructor.name,timing:a.effect.getTiming(),state:a.playState}))}));
 await page.getByRole('button',{name:'Show crowded fixture',exact:true}).click();await board.screenshot({path:`qa-redesign/author-market/${width}-crowded.png`});const crowded=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('[class*=traveler__]')];const boxes=nodes.map(n=>n.getBoundingClientRect());return {count:boxes.length,overlap:boxes.some((a,i)=>boxes.some((b,j)=>j>i&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))};});
 evidence.push({width,motion,turnFocus,contractFocus,reducedMotionAnimations,crowded,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)});await page.close();
}
await fs.writeFile('qa-redesign/author-market/summary.json',JSON.stringify({scope:'Author-run visual simulation. In-browser reducer; no room HTTP or database evidence.',evidence},null,2));await browser.close();
