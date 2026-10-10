const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const out=path.resolve(__dirname,'../artifacts/leaders');fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({headless:true,channel:'msedge'}),results=[],errors=[];
 const page=await b.newPage({viewport:{width:1440,height:900},hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('ERR_'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:8000',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof Game!=='undefined'&&typeof Panels!=='undefined');
 await page.evaluate(async()=>{await document.fonts.ready;});
 async function start(s='umayyad',f='umayyad'){
  await page.evaluate(([s,f])=>{Game.newGame(s,f,'normal');startCampaign();document.querySelectorAll('.modal-layer').forEach(e=>e.remove());Sheets.closeAll();App.scene.openKingdom('gens');},[s,f]);
 }
 async function check(label,w,h){
  const report=await page.evaluate(()=>{
   const m=document.querySelector('.leader-modal:last-child')||[...document.querySelectorAll('.leader-modal')].at(-1),body=m.querySelector('.modal-body'),b=m.getBoundingClientRect(),buttons=m.querySelector('.modal-btns').getBoundingClientRect();
   const txt=m.innerText,layoutOverflow=[...m.querySelectorAll('h3,.leader-fact,.leader-skills,.leader-promise,.leader-card')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className);
   return {fits:b.x>=-1&&b.y>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1,bodyFits:body.scrollWidth<=body.clientWidth+2,footerFits:buttons.bottom<=innerHeight+1,layoutOverflow,dir:getComputedStyle(m).direction,forbidden:/Wikipedia|ويكيبيديا|من التاريخ|مصادر|بالذكاء الاصطناعي|—/i.test(txt),minButton:Math.min(...[...m.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height))};
  });
  assert.ok(report.fits&&report.bodyFits&&report.footerFits,`${label} ${w}x${h} overflows ${JSON.stringify(report)}`);assert.equal(report.dir,'rtl');assert.equal(report.forbidden,false);assert.equal(report.layoutOverflow.length,0,report.layoutOverflow.join());assert.ok(report.minButton>=44,'touch target too small');
  await page.screenshot({path:path.join(out,`${label}-${w}x${h}.png`)});return report;
 }
 for(const [w,h]of [[1440,900],[1024,768],[390,844],[360,740],[320,568],[844,390],[568,320]]){
  await page.setViewportSize({width:w,height:h});await page.waitForFunction(([w,h])=>App.W===w&&App.H===h,[w,h]);await start();
  // Open the recruitment flow through the real council button.
  await page.locator('.leader-delegation').first().click();
  const r={viewport:[w,h],recruit:await check('recruit',w,h)};
  assert.equal(await page.locator('.leader-candidate').count(),2);
  const namesBefore=await page.locator('.leader-candidate h3').allTextContents();
  if(w<=760){await page.locator('.leader-compare-nav button').last().click();const target=await page.locator('[data-candidate="1"] h3').boundingBox();assert.ok(target.y>0&&target.y<h,'candidate comparison jump');await page.locator('.leader-compare-nav button').first().click();}
  await page.locator('.leader-reroll').first().click();assert.equal(await page.locator('.leader-reroll:disabled').count(),2);
  const namesAfter=await page.locator('.leader-candidate h3').allTextContents();assert.notEqual(namesAfter[0],namesBefore[0]);assert.equal(namesAfter[1],namesBefore[1]);
  await page.locator('.leader-negotiate').first().click();r.negotiate=await check('negotiate',w,h);
  // Use the actual slider hit target, including phones, before verifying the keyboard endpoint.
  await page.locator('#leader-wage').scrollIntoViewIfNeeded();const slider=await page.locator('#leader-wage').boundingBox();
  await page.touchscreen.tap(slider.x+slider.width*.82,slider.y+slider.height/2);
  await page.locator('#leader-wage').focus();await page.keyboard.press('End');
  assert.equal(await page.locator('#leader-wage').inputValue(),await page.locator('#leader-wage').getAttribute('max'));
  await page.screenshot({path:path.join(out,`offer-${w}x${h}.png`)});
  // Seed a deterministic accepted offer to exercise all real UI mutation and persistence paths.
  const expected=await page.evaluate(()=>{const o=Game.oppsOf(Game.S.player)[0],c=o.cands[0];for(let i=1;i<20000;i++)if(rng(i)()<.4){c.seed=i;break;}return {name:c.n,n:Game.cmdCount(Game.S.player),gold:Game.f(Game.S.player).gold};});
  const wage=+(await page.locator('#leader-wage').inputValue());
  await page.getByRole('button',{name:'قدّم العرض',exact:true}).click();
  await page.waitForSelector('.leader-profile');r.profile=await check('profile',w,h);
  const actual=await page.evaluate(()=>({names:Game.gensOf(Game.S.player).map(g=>g.name),n:Game.cmdCount(Game.S.player),gold:Game.f(Game.S.player).gold,op:Game.oppsOf(Game.S.player).length}));
  assert.ok(actual.names.includes(expected.name));assert.equal(actual.n,expected.n+1);assert.equal(actual.gold,expected.gold-wage);assert.equal(actual.op,0);
  await page.locator('.leader-profile .modal-body').evaluate(e=>{e.scrollTop=e.scrollHeight;});r.profileBottom=await check('profile-record',w,h);
  // Touch/mouse clicking the persistent footer must work in short landscape too.
  await page.getByRole('button',{name:'إغلاق السجل',exact:true}).click();assert.equal(await page.locator('.leader-modal').count(),0);
  await page.evaluate(()=>{Game.save('slot1');Game.load('slot1');App.scene.refresh();});assert.ok(await page.evaluate(name=>Game.gensOf(Game.S.player).some(g=>g.name===name),expected.name));
  results.push(r);
 }

 // Every initially available leader profile at phone width: scan visible copy and link targets.
 await page.setViewportSize({width:320,height:568});
 let profilesChecked=0;
 for(const [scenario,faction]of [['umayyad','umayyad'],['threeKingdoms','shu']]){
  await start(scenario,faction);const ids=await page.evaluate(()=>Object.keys(Game.S.gens));
  for(const id of ids){
   await page.evaluate(id=>Panels.cmdProfile(Game.gen(id)),id);
   const copy=await page.locator('.leader-modal').innerText();assert.ok(!/Wikipedia|ويكيبيديا|المصادر|المصدر|مصدر تاريخي|سيرة موثقة|https?:\/\//i.test(copy));assert.equal(await page.locator('.leader-modal a[href]').count(),0);
   const overflow=await page.locator('.leader-modal .modal-body').evaluate(e=>e.scrollWidth>e.clientWidth+2);assert.equal(overflow,false);await page.getByRole('button',{name:'إغلاق السجل',exact:true}).click();profilesChecked++;
  }
 }
 // Chinese culture, known friendships and loss memorial presentation.
 await page.setViewportSize({width:1440,height:900});await start('threeKingdoms','shu');
 await page.evaluate(()=>Panels.cmdProfile(Game.gensOf(Game.S.player).find(g=>g.name==='قوان يو')));await check('guan-yu',1440,900);
 await page.getByRole('button',{name:'إغلاق السجل',exact:true}).click();
 await page.evaluate(()=>{const g=Game.gensOf(Game.S.player).find(g=>g.name==='قوان يو');Game.setGenFate(g,'killed','wei');Panels.leaderMemorials(Game.S.player);});await check('memorial',1440,900);
 // Keyboard tab cycle stays within modal; Escape closes only the top dossier.
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('.leader-modal')));await page.keyboard.press('Escape');assert.equal(await page.locator('.leader-modal').count(),0);
 const report={results,profilesChecked,errors};fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({viewports:results.map(r=>r.viewport),profilesChecked,errors,report:path.join(out,'verification.json')},null,2));await b.close();assert.equal(errors.length,0);
})().catch(e=>{console.error(e);process.exit(1)});
