'use strict';
const {chromium}=require('C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../artifacts/phase-f');fs.mkdirSync(out,{recursive:true});
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[],attempts=[],checks=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.PHASE_F_URL||'http://127.0.0.1:8000');await p.evaluate(()=>document.fonts.ready);
 const cdp=await p.context().newCDPSession(p);
 async function fresh(){await p.evaluate(()=>{
  document.querySelectorAll('.modal-layer').forEach(e=>e.remove());Help.hide();if(document.getElementById('toast'))document.getElementById('toast').hidden=true;
  if(window.realMajors)Game.majors=realMajors;if(window.realRound)Game.endRound=realRound;
  Game.newGame('umayyad','umayyad','normal');
  const s=new CampaignScene();s.introShown=true;App.setScene(s);
  window.lastFeedbackAt=0;window.lastTouchUpAt=0;
  s.hud.end.addEventListener('pointerup',()=>{lastTouchUpAt=performance.now()},true);
  const status=s.turnStatus.bind(s);s.turnStatus=(...args)=>{status(...args);lastFeedbackAt=performance.now()};
  window.turnCounts={settlements:0,ai:0,world:0};if(!window.realRound)window.realRound=Game.endRound.bind(Game);
  if(!window.realMajors)window.realMajors=Game.majors.bind(Game);
  window.holdAI=false;window.releaseAI=null;
  Game.majors=()=>['umayyad','byzantine'];CampaignAI.turn=async()=>{turnCounts.ai++;if(holdAI)await new Promise(resolve=>{releaseAI=resolve});else await wait(120)};
  Game.endRound=()=>{turnCounts.settlements++;realRound()};Game.worldTick=async()=>{turnCounts.world++};Game.pendingDecisions=async()=>{};Panels.captivePrompts=()=>{};
 });}
 async function rawTap(x,y,mid){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,radiusX:2,radiusY:2,force:1}]});if(mid)await mid();await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 async function attempt(name,expected,{mid,raw=false}={}){
  const box=await p.locator('.end-turn').boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,name+' target44');
  const x=box.x+box.width*.5,y=box.y+box.height*.5;
  const hit=await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return {end:!!e?.closest('.end-turn'),tag:e?.className||e?.tagName}},[x,y]);
  assert.equal(hit.end,!raw,name+' hit: '+JSON.stringify(hit));
  const before=await p.evaluate(()=>({counts:{...turnCounts},turn:Game.S.turn})),time=Date.now();
  await rawTap(x,y,mid);
  const after=await p.evaluate(()=>({counts:{...turnCounts},turn:Game.S.turn,state:App.scene.turnFlow.state,busy:App.scene.busy,feedback:App.scene.hud.endStatus.textContent,button:App.scene.hud.end.textContent,feedbackMs:lastFeedbackAt-lastTouchUpAt}));
  const feedbackMs=expected==='start'?Math.max(0,after.feedbackMs):null,automationMs=Date.now()-time;
  if(expected==='start'){assert.equal(after.busy,true,name+' first tap starts');assert.equal(after.state,'processing');assert.ok(after.feedback);}
  else{assert.equal(after.counts.settlements,before.counts.settlements,name+' no settlement');assert.equal(after.turn,before.turn);if(!raw)assert.ok(after.feedback,name+' explanation');}
  if(expected==='start')assert.ok(feedbackMs<250,name+' prompt feedback '+feedbackMs);
  attempts.push({viewport:await p.evaluate(()=>[innerWidth,innerHeight]),name,expected,feedbackMs,automationMs,hit,before,after});
 }
 async function complete(){await p.waitForFunction(()=>!App.scene.busy);const n=await p.evaluate(()=>turnCounts);assert.equal(n.settlements,1);assert.equal(n.world,1);assert.equal(n.ai,1);assert.equal(await p.evaluate(()=>Game.S.turn),1);}
 for(const [w,h]of [[320,568],[360,740],[390,844],[430,932],[568,320],[844,390]]){
  await p.setViewportSize({width:w,height:h});await fresh();
  // Real construction, X, 25 HUD/sheet/camera refresh cycles, and a newer action.
  await p.evaluate(()=>{Game.f('umayyad').gold=5000;window.firstBuild=Game.nodesOf('umayyad').find(n=>!n.work&&!Game.canBuild('umayyad',n,'farm'));window.goldBefore=Game.f('umayyad').gold;window.firstCost=Game.previewBuild(firstBuild,'farm').cost;Game.buildU('umayyad',firstBuild,'farm');App.scene.afterAction();});
  const stack=await p.evaluate(()=>Undo.stack.length);await p.getByRole('button',{name:'إخفاء إشعار التراجع',exact:true}).tap();
  for(let i=0;i<25;i++){await p.evaluate(i=>{if(i%5===0)App.scene.openCity(Game.node('damascus'));if(i%5===1)Sheets.minimize(Sheets.current()?.key);if(i%5===2)Sheets.closeAll();App.scene.cam.zoomAt(innerWidth/2,innerHeight/2,i%2?1.02:1/1.02);App.scene.refresh();},i);assert.equal(await p.evaluate(()=>UndoBar.el.hidden),true);assert.equal(await p.evaluate(()=>Undo.stack.length),stack);}
  await p.evaluate(()=>{Sheets.closeAll();window.secondBuild=Game.nodesOf('umayyad').find(n=>!n.work&&!Game.canBuild('umayyad',n,'farm'));Game.buildU('umayyad',secondBuild,'farm');App.scene.afterAction();});
  assert.equal(await p.evaluate(()=>UndoBar.el.hidden),false);await p.getByRole('button',{name:'تراجع عن الفعل الأخير',exact:true}).tap();assert.equal(await p.evaluate(()=>UndoBar.el.hidden),true);assert.equal(await p.evaluate(()=>!!firstBuild.work),true);assert.equal(await p.evaluate(()=>!!secondBuild.work),false);
  await p.evaluate(()=>Undo.run());assert.equal(await p.evaluate(()=>Game.f('umayyad').gold===goldBefore),true);checks.push({viewport:[w,h],undoRefreshes:25,stackPreserved:true,newAction:true,refund:true});
  for(const mode of ['ordinary','refresh-during-touch','city-sheet','minimized-sheet','help-popup','expanded-hud']){
   await fresh();await p.evaluate(mode=>{if(mode==='city-sheet')App.scene.openCity(Game.node('damascus'));if(mode==='minimized-sheet'){App.scene.openCity(Game.node('damascus'));Sheets.minimize(Sheets.current().key)}if(mode==='help-popup')App.scene.hudHelp(App.scene.hud.gold,'gold');if(mode==='expanded-hud'){App.scene.hud.res.classList.add('open');AlertsUI.open=true;AlertsUI.render();App.scene.cam.zoomAt(innerWidth/2,innerHeight/2,1.3)}},mode);
   const label=await p.evaluate(()=>{window.originalEndLabel=App.scene.hud.endLabel;return !!originalEndLabel});assert.ok(label);
   await attempt(mode,'start',{mid:mode==='refresh-during-touch'?async()=>{await p.evaluate(()=>{for(let i=0;i<20;i++)App.scene.refresh();if(App.scene.hud.endLabel!==originalEndLabel||!originalEndLabel.isConnected)throw Error('end label replaced')});}:null});
   await complete();assert.equal(await p.evaluate(()=>Undo.stack.length),0);
  }
  await fresh();await p.evaluate(()=>holdAI=true);for(let i=0;i<10;i++){if(i===5)await p.evaluate(()=>App.scene.busy=false);await attempt('rapid-'+(i+1),i===0?'start':'blocked');if(i===0)await p.waitForFunction(()=>!!releaseAI)}await p.evaluate(()=>releaseAI());await complete();
  for(const reason of ['جارٍ إكمال حركة الجيش نحو دمشق','جارٍ إكمال المعركة ونتائجها']){await fresh();await p.evaluate(reason=>{App.scene.busy=true;App.scene.activityReason=reason},reason);await attempt('busy-action','blocked');assert.equal(await p.evaluate(()=>App.scene.hud.endStatus.textContent),reason);await p.evaluate(()=>App.scene.busy=false);}
  await fresh();await p.evaluate(()=>UI.modal({title:'قرار مفتوح',body:h('p',null,'أكمل القرار قبل إنهاء الدور'),buttons:[{label:'إغلاق'}]}));await attempt('modal-overlay','blocked',{raw:true});assert.equal(await p.locator('.modal-layer').count(),1);
  await fresh();await p.evaluate(()=>Game.S.over={winner:'umayyad'});await attempt('campaign-ended','blocked');assert.match(await p.evaluate(()=>App.scene.hud.endStatus.textContent),/انتهت الحملة/);
  await fresh();await p.evaluate(()=>Undo.push({label:'بدء بناء مزرعة في دمشق',undo:()=>{}}));await p.screenshot({path:path.join(out,`controls-${w}x${h}.png`)});
  await p.evaluate(()=>{Undo.clear();holdAI=true});await attempt('screenshot-processing','start');await p.waitForFunction(()=>!!releaseAI);await p.waitForTimeout(350);
  const control=await p.locator('.end-turn').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),tool=document.querySelector('.map-tools').getBoundingClientRect();return{height:r.height,bg:s.backgroundColor,color:s.color,overlap:tool.left<r.right&&tool.right>r.left&&tool.top<r.bottom&&tool.bottom>r.top}});assert.ok(control.height<=48,'processing layout height');assert.equal(control.bg,'rgb(115, 86, 41)');assert.equal(control.overlap,false,'map tools do not cover processing');
  await p.screenshot({path:path.join(out,`processing-${w}x${h}.png`)});await p.evaluate(()=>releaseAI());await complete();
  console.log(`PASS ${w}x${h}: Undo25, valid touch, refresh race, delayed AI10, busy, modal, over`);
 }
 // Error after settlement cannot settle a second time; explicit snapshot recovery restores all resources.
 await fresh();const snapshot=await p.evaluate(()=>JSON.stringify(Game.S));await p.evaluate(()=>{Game.worldTick=async()=>{throw Error('intentional Phase F failure')}});await attempt('world-error','start');await p.waitForFunction(()=>!!App.scene.turnFlow.recovery);assert.equal(await p.evaluate(()=>turnCounts.settlements),1);
 await p.evaluate(()=>App.scene.endTurn());assert.equal(await p.evaluate(()=>turnCounts.settlements),1);await p.getByRole('button',{name:'استعادة ما قبل إنهاء الدور',exact:true}).tap();
 assert.equal(await p.evaluate(()=>Game.S.turn),0);assert.equal(await p.evaluate(()=>Game.f('umayyad').gold),JSON.parse(snapshot).factions.umayyad.gold);assert.equal(await p.evaluate(()=>App.scene.busy),false);
 checks.push({errorRecovery:true,noRepeatedSettlement:true});
 // Real campaign processing: no mocked AI/world/prompt functions after a reload.
 await p.reload();await p.evaluate(()=>{Game.newGame('umayyad','umayyad','normal');const s=new CampaignScene();s.introShown=true;App.setScene(s);window.realSettlements=0;const round=Game.endRound.bind(Game);Game.endRound=()=>{realSettlements++;round()};});
 await p.locator('.end-turn').tap();await p.waitForFunction(()=>Game.S.turn===1,null,{timeout:45000});
 // Existing prompts remain explicit blocking UI; resolve with their own defer/close controls.
 for(let i=0;i<8;i++){if(await p.getByRole('button',{name:'لاحقاً',exact:true}).count())await p.getByRole('button',{name:'لاحقاً',exact:true}).last().tap();else break;await p.waitForTimeout(100);}
 await p.waitForFunction(()=>!App.scene.busy);assert.equal(await p.evaluate(()=>realSettlements),1);
 const campaign=await p.evaluate(()=>{Game.save('phase-f-test');return JSON.parse(JSON.stringify({player:Game.S.player,turn:Game.S.turn,nodes:Game.S.nodes,armies:Game.S.armies,factions:Game.S.factions,politics:Game.S.politics,leaders:Game.S.leaders,economy:Game.S.economy,tributes:Game.S.tributes}))});
 await p.reload();const loaded=await p.evaluate(()=>{Game.load('phase-f-test');return JSON.parse(JSON.stringify({player:Game.S.player,turn:Game.S.turn,nodes:Game.S.nodes,armies:Game.S.armies,factions:Game.S.factions,politics:Game.S.politics,leaders:Game.S.leaders,economy:Game.S.economy,tributes:Game.S.tributes}))});
 const differences=[];function diff(a,b,prefix=''){for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){const x=a?.[k],y=b?.[k],name=prefix+'.'+k;const emptySpyDefault=x===undefined&&y&&typeof y==='object'&&Object.keys(y).length===0&&/^\.factions\.[^.]+\.(spyTargetWait|spyRecovery|spyHistory)$/.test(name);if(emptySpyDefault)continue;if(x&&y&&typeof x==='object'&&typeof y==='object')diff(x,y,name);else if(x!==y)differences.push({path:name,before:x,after:y})}}diff(campaign,loaded);
 fs.writeFileSync(path.join(out,'save-diff.json'),JSON.stringify(differences,null,2));assert.deepEqual(differences,[],'save/load fields');
 assert.deepEqual(errors,[]);assert.ok(attempts.length>=100);const report={engine:'Playwright/CDP real touch events, Chromium Edge; no physical phone available',attempts:attempts.length,passed:attempts.length,checks,umayyad:true,saveReload:true,errors,records:attempts};fs.writeFileSync(path.join(out,'touch-results.json'),JSON.stringify(report,null,2));console.log(`PASS ${attempts.length} mobile touch attempts; real Umayyad turn and save/reload; error recovery`);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
