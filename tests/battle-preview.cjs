const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const out=path.resolve(__dirname,'../artifacts/battles');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});const errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8000',{waitUntil:'domcontentloaded'});await page.evaluate(async()=>{await document.fonts.ready});
 async function start(kind='field') {await page.evaluate(kind=>{
  document.querySelectorAll('.modal-layer').forEach(e=>e.remove());
  const reg=types=>types.map(type=>({type,men:UNITS[type].men,exp:1}));
  const cfg={seed:513,kind,terrain:kind==='siege'?'hills':'river',weather:'clear',walls:2,equip:{ram:true,ladders:true,tower:true},stores:2,title:kind==='siege'?'أسوار عمورية':'معبر الفرات',sides:[
   {fid:'umayyad',name:'جيش الشام',color:'#377a65',player:true,intel:2,ai:.6,regs:reg(['sword','sword','spear','spear','archer','archer','cavalry','catapult']),gens:[{id:'a',name:'مسلمة بن عبد الملك',rank:3,trait:kind==='siege'?'siege':'tactician',style:'disciplined',doctrine:'maneuver',culture:'arab',personality:'careful',skills:{command:4,resolve:4}}],ready:{fat:18,mor:72,coh:90,ammo:75,sup:85,strain:12,battles:1}},
   {fid:'byzantine',name:'حرس الثغور',color:'#a14d41',intel:2,ai:.6,regs:reg(['spear','sword','sword','archer','archer','cavalry']),gens:[{id:'b',name:'قائد الحامية',rank:2,trait:'defender',culture:'byzantine',doctrine:'defensive'}]}
  ]};App.setScene(new BattleScene(cfg,res=>{window.previewResult=res;showMainMenu()}));
 },kind);await page.waitForTimeout(100);}
 async function check(name,w,h) {
  await page.waitForTimeout(60);
  const state=await page.evaluate(()=>{
   const p=document.querySelector('.bs-panel'),body=p.querySelector('.bs-body'),rect=p.getBoundingClientRect(),foot=p.querySelector('.bs-footer')?.getBoundingClientRect();
   return {fits:rect.x>=0&&rect.y>=0&&rect.right<=innerWidth+1&&rect.bottom<=innerHeight+1,overflow:body.scrollWidth>body.clientWidth+2,footer:!foot||foot.bottom<=innerHeight+1,minButton:Math.min(...[...p.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height)),dir:getComputedStyle(p).direction,stage:App.scene.stage,phase:App.scene.sim.phase,tick:App.scene.sim.tick};
  });assert.ok(state.fits&&state.footer&&!state.overflow,`${name} ${w}x${h} ${JSON.stringify(state)}`);assert.ok(state.minButton>=43,`${name} small target ${state.minButton}`);assert.equal(state.dir,'rtl');
  if(state.stage==='report'){const counts=await page.evaluate(()=>({shown:[...document.querySelectorAll('.bs-men')].map(e=>Number(e.textContent)),expected:[App.scene.A,App.scene.E].map(s=>App.scene.sim.totalMen(s)),sectors:[...document.querySelectorAll('.bs-sector bdi')].reduce((n,e)=>n+Number(e.textContent),0)}));assert.deepEqual(counts.shown,counts.expected,'report header must include routed survivors');assert.equal(counts.sectors,counts.expected[0]);}
  await page.screenshot({path:path.join(out,`${name}-${w}x${h}.png`)});return state;
 }
 for(const [w,h]of [[1440,900],[1024,768],[390,844],[360,740],[320,568],[844,390],[568,320]]){
  await page.setViewportSize({width:w,height:h});await page.waitForFunction(([w,h])=>App.W===w&&App.H===h,[w,h]);await start();const row={viewport:[w,h]};row.intel=await check('intel',w,h);
  await page.getByRole('button',{name:'اختر الخطة',exact:true}).click();row.plan=await check('plans',w,h);
  await page.getByRole('button',{name:'التشكيل',exact:true}).click();row.formation=await check('formation',w,h);
  await page.getByRole('button',{name:'احتياط محدود',exact:true}).click();assert.ok(await page.evaluate(()=>App.scene.sim.resMen(App.scene.A)>0));
  await page.getByRole('button',{name:'ابدأ المعركة',exact:true}).click();row.prepare=await check('preparation',w,h);assert.equal(row.prepare.tick,0);assert.equal(row.prepare.phase,0);assert.equal(await page.evaluate(()=>App.scene.sim.awaitingOrders),true);
  const card=page.locator('.ord').filter({hasText:'تثبيت موضع القتال'});await card.scrollIntoViewIfNeeded();await card.tap();row.card=await check('command',w,h);await page.getByRole('button',{name:'أصدر الأمر',exact:true}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:'أصدر الأمر',exact:true}).tap();assert.ok(await page.evaluate(()=>!!App.scene.A.buffs.fortify));
  await page.getByRole('button',{name:'نفّذ المرحلة',exact:true}).tap();await page.waitForFunction(()=>App.scene.sim.tick>0||App.scene.stage==='event');
  // Preserve the active phase, complete it with the same simulator and verify report touch access.
  await page.evaluate(()=>{clearTimeout(App.scene.timer);App.scene.sim.runAuto();App.scene.showReport();App.scene.renderTop();});row.report=await check('report',w,h);
  const story=page.locator('.br-story').filter({hasText:'قصة المعركة'}).locator('summary');await story.scrollIntoViewIfNeeded();await story.tap();row.story=await check('story',w,h);
  const factors=page.getByText('لماذا كانت هذه النتيجة؟',{exact:true});await factors.scrollIntoViewIfNeeded();await factors.tap();row.factors=await check('factors',w,h);
  await page.getByRole('button',{name:'السجل',exact:true}).tap();assert.ok(await page.locator('.battle-log').isVisible());await page.getByRole('button',{name:'العودة إلى القيادة',exact:true}).tap();
  await page.getByRole('button',{name:'العودة',exact:true}).tap();assert.ok(await page.evaluate(()=>!!window.previewResult?.report));
  await start('siege');await page.getByRole('button',{name:'حسم سريع',exact:true}).tap();row.siege=await check('siege-report',w,h);checks.push(row);
 }
 // Real ordered withdrawal confirmation and contextual interruption are reachable by touch.
 await page.setViewportSize({width:390,height:844});await start();await page.evaluate(()=>{const sc=App.scene;sc.startBattle();sc.sim.commitPhase();while(!sc.sim.phaseDone()&&!sc.sim.over){sc.sim.step();let e;while(e=sc.sim.takeInterrupt())sc.sim.choose(e,sc.sim.aiChoose(sc.sim.sides[e.side],e));}for(const e of sc.sim.endPhase())sc.sim.choose(e,sc.sim.aiChoose(sc.sim.sides[e.side],e));sc.sim.nextPhase();sc.showBreakPanel();});
 await page.locator('.ord').filter({hasText:'انسحاب منظم'}).tap();await page.getByRole('button',{name:'أصدر الأمر',exact:true}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:'أصدر الأمر',exact:true}).tap();await page.getByRole('button',{name:'انسحب',exact:true}).tap();await page.waitForFunction(()=>App.scene.stage==='report');assert.equal(await page.evaluate(()=>App.scene.result.reason),'withdraw');await check('withdrawal',390,844);
 await start();await page.evaluate(()=>{const sc=App.scene;sc.startBattle();sc.A.sec.C.state='waver';sc.A.sec.C.morale=24;sc.showEvent(sc.sim.buildEvent(sc.A,{id:'wingWaver',wing:'C'}),()=>sc.showBreakPanel());});await check('turning-point',390,844);await page.locator('.choice button').filter({hasText:'اطلب منهم الثبات'}).tap();assert.equal(await page.evaluate(()=>App.scene.stage),'break');
 // Persist an applied assault in real browser storage, reload the page twice, and
 // compare every army/garrison readiness field and casualty count exactly.
 const stored=await page.evaluate(async()=>{
  clearTimeout(App.scene.timer);Game.newGame('umayyad','umayyad','normal');
  const a=Game.armiesOf('umayyad')[0],n=Game.S.nodes.find(n=>n.owner!==a.fid&&n.garrison.length);
  a.regs=['spear','sword','archer','cavalry'].map(type=>({type,men:UNITS[type].men,exp:0}));n.walls=3;n.garrison=['spear','spear','spear','spear','sword','sword','archer','archer'].map(type=>({type,men:UNITS[type].men,exp:0}));
  a.ready={fat:28,mor:61,coh:77,ammo:48,sup:64,strain:23,battles:1};n.ready={fat:32,mor:53,coh:69,ammo:35,sup:45,strain:18,battles:1};
  const enc=Game.makeEnc('assault',[a],n.id),cfg=Game.simConfig(enc);cfg.equip={ladders:true,ram:true,tower:true};const res=new WarSim(cfg).runAuto();if(res.winner!==1)throw Error('Expected repelled siege fixture');const applied=Game.applySim(enc,res);await Game.finishEncounter(enc,applied);Game.save('slot3');
  return {armyId:a.id,nodeId:n.id,armyReady:a.ready,garrisonReady:n.ready,armyRegs:a.regs,garrison:n.garrison,bond:Game.armyGen(a)?.bond};
 });
 for(let i=0;i<2;i++){await page.reload({waitUntil:'domcontentloaded'});const loaded=await page.evaluate(({armyId,nodeId})=>{Game.load('slot3');const a=Game.army(armyId),n=Game.node(nodeId);return {armyId,nodeId,armyReady:a.ready,garrisonReady:n.ready,armyRegs:a.regs,garrison:n.garrison,bond:Game.armyGen(a)?.bond};},stored);assert.deepEqual(loaded,stored,'reload restored combat resources or changed casualties');}
 const result={checks,saveReload:{passes:2,preserved:['fatigue','morale','cohesion','ammunition','supply','strain','battles','army casualties','garrison condition','leader relationships']},errors};fs.writeFileSync(path.join(out,'visual-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({viewports:checks.map(r=>r.viewport),saveReload:result.saveReload,errors},null,2));await browser.close();assert.equal(errors.length,0,errors.join('\n'));
})().catch(e=>{console.error(e);process.exit(1)});
