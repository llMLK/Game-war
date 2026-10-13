'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/phase-r'),results=[];fs.mkdirSync(out,{recursive:true});
let browser,server;
(async()=>{
 server=http.createServer((req,res)=>{const target=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(target!==root&&!target.startsWith(root+path.sep))return res.writeHead(403).end();const file=target===root?path.join(root,'index.html'):target;fs.readFile(file,(err,bytes)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(bytes)})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const [w,h]of [[1365,900],[320,568],[390,844],[568,320],[844,390]]){
  const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:w<1000,acceptDownloads:true}),p=await context.newPage(),errors=[],missing=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))missing.push(r.url())});await p.route('https://fonts.**/*',r=>r.abort());
  await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>App.scene&&typeof SaveSafety!=='undefined');
  assert.equal(await p.locator('html').getAttribute('dir'),'rtl');
  const raw=await p.evaluate(()=>{Game.newGame('umayyad','umayyad','normal');const d=JSON.parse(store.readText(SAVE_PREFIX+'auto').raw);d.meta.scenario=d.S.scenario='threeKingdoms';d.S.player='shu';const raw=JSON.stringify(d,null,2);store.writeText(SAVE_PREFIX+'auto',raw);store.writeText(SAVE_PREFIX+'1',raw);return raw});
  await p.reload();assert.equal(await p.getByRole('button',{name:'متابعة الحملة'}).count(),0);assert.match(await p.locator('.save-warning').innerText(),/لن يُحذف/);
  await p.getByRole('button',{name:'الحفظ القديم / تصدير JSON',exact:true}).tap();assert.equal(await p.getByRole('button',{name:'حمّل',exact:true}).count(),0);
  const [download]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'تصدير JSON',exact:true}).first().tap()]);const stream=await download.createReadStream(),chunks=[];for await(const b of stream)chunks.push(b);assert.equal(Buffer.concat(chunks).toString(),raw);
  await p.screenshot({path:path.join(out,`legacy-save-${w}x${h}.png`)});await p.getByRole('button',{name:'إغلاق',exact:true}).tap();
  await p.getByRole('button',{name:'حملة جديدة',exact:false}).tap();assert.equal(await p.locator('.pick-row').first().locator('button').count(),1);assert.match(await p.locator('.pick-row').first().innerText(),/الأموية/);
  await p.evaluate(()=>{window.originalWrite=store.writeText;store.writeText=(k,v)=>k.startsWith('swords-kingdoms-legacy:')?false:originalWrite(k,v)});
  await p.getByRole('button',{name:'ابدأ الحملة',exact:true}).tap();assert.equal(await p.locator('.modal h2').innerText(),'حماية الحفظ');assert.equal(await p.evaluate(()=>store.readText(SAVE_PREFIX+'auto').raw),raw);assert.equal(await p.evaluate(()=>App.scene instanceof MenuScene),true);
  await p.getByRole('button',{name:'إغلاق',exact:true}).tap();await p.evaluate(()=>store.writeText=originalWrite);await p.getByRole('button',{name:'ابدأ الحملة',exact:true}).tap();await p.getByRole('button',{name:'إلى الحرب',exact:true}).tap();
  assert.equal(await p.evaluate(()=>Game.S.scenario),'umayyad');assert.equal(await p.evaluate(()=>SaveSafety.backups()[0].raw),raw);assert.equal(await p.evaluate(()=>store.readText(SAVE_PREFIX+'1').raw),raw);
  await p.screenshot({path:path.join(out,`umayyad-${w}x${h}.png`)});
  await p.evaluate(()=>Panels.saves(App.scene));assert.equal(await p.getByRole('button',{name:'احفظ هنا',exact:true}).count(),2);await p.getByText('نسخة احتياطية للحفظ القديم',{exact:true}).scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,`backup-export-${w}x${h}.png`)});await p.getByRole('button',{name:'إغلاق',exact:true}).tap();
  const end=await p.locator('.end-turn').boundingBox();assert.ok(end.width>=44&&end.height>=44);assert.ok(await p.evaluate(({x,y,width,height})=>!!document.elementFromPoint(x+width/2,y+height/2)?.closest('.end-turn'),end));
  await p.evaluate(()=>{Game.normalizeState();Game.save('2')});await p.reload();assert.equal(await p.evaluate(()=>!!Game.load('2')),true);
  const roundtrip=await p.evaluate(()=>{const raw=store.get(SAVE_PREFIX+'2').S;return JSON.stringify(Game.S)===JSON.stringify(raw)});assert.equal(roundtrip,true);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.push({viewport:[w,h],checks:12,passed:12,touch:true,rtl:true,exportExact:true,backupFailure:true,manualPreserved:true,assets:true,errors});console.log(`PASS R UI ${w}x${h}: 12 checks`);await context.close();
 }
 fs.writeFileSync(path.join(out,'ui-results.json'),JSON.stringify({engine:'Playwright Edge mobile emulation; no physical phone or personal save',checks:60,passed:60,results},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));
})().catch(async e=>{console.error(e);await browser?.close();server?.close();process.exitCode=1});
