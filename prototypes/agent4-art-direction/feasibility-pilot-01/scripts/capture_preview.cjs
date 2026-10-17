'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'evidence');
let server,browser;
(async()=>{
 server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const target=path.resolve(root,'.'+pathname);
  if(target!==root&&!target.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(target,(err,bytes)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.png':'image/png','.json':'application/json'})[path.extname(target)]||'application/octet-stream');res.end(bytes)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const reports=[];
 for(const dpr of [1,2]){
  const context=await browser.newContext({viewport:{width:1180,height:950},deviceScaleFactor:dpr});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/preview.html`);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(im=>im.decode()))});
  const measurements=await page.locator('.desktop-only .sprite').evaluateAll(images=>images.map(im=>{const b=im.getBoundingClientRect();return {src:im.getAttribute('src'),expectedWidth:+im.dataset.cssWidth,width:b.width,height:b.height,anchor:im.dataset.anchor,naturalWidth:im.naturalWidth,naturalHeight:im.naturalHeight}}));
  for(const m of measurements)if(Math.abs(m.width-m.expectedWidth)>.02||m.naturalWidth!==1536||m.naturalHeight!==1024)throw new Error(JSON.stringify(m));
  for(const id of ['mobile-matrix','crowded','state-matrix','value-check','phaseR']){
   if(dpr===2&&!['mobile-matrix','state-matrix'].includes(id))continue;
   await page.locator('#'+id).screenshot({path:path.join(out,`${id}-dpr${dpr}.png`),scale:'device'});
  }
  reports.push({viewportCss:[1180,950],dpr,engine:await browser.version(),measurements,errors});
  if(errors.length)throw new Error(errors.join('\n'));
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/preview.html?mode=phone`);
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(im=>im.decode()))});
 const phone=await page.locator('.phone-only .sprite').evaluateAll(images=>images.map(im=>({expectedWidth:+im.dataset.cssWidth,width:im.getBoundingClientRect().width,height:im.getBoundingClientRect().height})));
 if(phone.some(m=>Math.abs(m.width-m.expectedWidth)>.02))throw new Error('Phone width mismatch');
 const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);if(scrollWidth!==390)throw new Error('Phone overflow: '+scrollWidth);
 await page.screenshot({path:path.join(out,'phone-390x844-dpr1.png'),scale:'device'});
 reports.push({viewportCss:[390,844],dpr:1,hasTouch:true,isMobile:true,scrollWidth,measurements:phone});
 fs.writeFileSync(path.join(out,'browser-scale-verification.json'),JSON.stringify({kind:'Isolated static preview capture; not game integration or physical-device testing',date:'2026-10-17',zoom:'100% default browser page zoom; image widths checked with getBoundingClientRect',screenshots:'DPR1 images have one raster pixel per CSS pixel; DPR2 have two. Image viewers may rescale them.',reports},null,2)+'\n');
 await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));
 console.log('PASS: actual CSS widths verified at DPR 1 and 2; 390px mobile viewport has no horizontal overflow. No production game or personal save loaded.');
})().catch(async err=>{console.error(err);await browser?.close();server?.close();process.exitCode=1});
