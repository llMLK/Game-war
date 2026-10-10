const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),cdp=await page.context().newCDPSession(page),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000',{waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready;Game.newGame('umayyad','umayyad','normal');startCampaign();document.querySelectorAll('.modal-layer').forEach(e=>e.remove());});
 const camera=()=>page.evaluate(()=>({x:App.scene.cam.x,y:App.scene.cam.y,z:App.scene.cam.z,fly:!!App.scene.fly}));
 for(const [w,h]of [[1440,900],[844,390],[740,360],[568,320],[390,844],[360,740],[320,568],[1024,768]]){
  await page.setViewportSize({width:w,height:h});await page.waitForFunction(([w,h])=>App.W===w&&App.H===h,[w,h]);
  await page.evaluate(()=>{const s=App.scene;Sheets.closeAll();s.selArmy=null;s.fly=null;s.fitCam(false);s.updatePads();s.cam.z=1.45;s.cam.x=MW/2;s.cam.y=MH/2;s.cam.clamp();});
  const v=await page.evaluate(()=>App.scene.visCenter());
  let a=await camera();await page.mouse.move(v.x,v.y);await page.mouse.down();await page.mouse.move(v.x+70,v.y+20,{steps:6});await page.mouse.up();let b=await camera();assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>20,'mouse drag pans '+w);
  a=b;await page.mouse.move(v.x,v.y);await page.mouse.wheel(0,-100);await page.waitForTimeout(80);b=await camera();assert.ok(b.z>a.z,'wheel zoom '+w);
  const touch=(type,ps)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:ps.map(([x,y],id)=>({x,y,id,radiusX:1,radiusY:1,force:1}))});
  a=await camera();await touch('touchStart',[[v.x-35,v.y],[v.x+35,v.y]]);for(let d=40;d<=65;d+=5)await touch('touchMove',[[v.x-d,v.y],[v.x+d,v.y]]);await touch('touchEnd',[]);b=await camera();assert.ok(b.z>a.z*1.3,'two-finger pinch '+w);
  a=b;await touch('touchStart',[[v.x,v.y]]);for(let d=10;d<=60;d+=10)await touch('touchMove',[[v.x-d,v.y]]);await touch('touchEnd',[]);b=await camera();assert.ok(Math.abs(a.x-b.x)>10,'touch drag '+w);
  await page.locator('.atlas-open').click();await page.locator('.atlas-search').fill('طرطوس');await page.locator('.atlas-cities button').filter({hasText:'طرطوس'}).click();await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(()=>App.scene.selNode?.id),'tartus','atlas search selects Tartus distinctly');
  const occlusion=await page.evaluate(()=>{
   const s=App.scene,failures=[];s.fly=null;
   for(const sheet of [false,true]){
    if(sheet)s.openCity(Game.node('damascus'));else Sheets.closeAll();s.fly=null;s.updatePads();
    for(const army of Game.S.armies){const n=Game.node(army.node),v=s.visCenter();s.cam.z=1.45;s.cam.x=n.x-(v.x-App.W/2)/s.cam.z;s.cam.y=n.y-(v.y-App.H/2)/s.cam.z;s.cam.clamp();s.render(App.ctx);
     const hit=s.hits.find(h=>h.kind==='army'&&h.a===army);if(!hit){failures.push('missing army '+army.id);continue;}
     for(const [x,y]of [[hit.x,hit.y],[hit.box.x+2,hit.box.y+2],[hit.box.x+hit.box.w-2,hit.box.y+hit.box.h-2]])if(document.elementFromPoint(x,y)?.id!=='view')failures.push('army '+army.id+' blocked sheet='+sheet);
     if(s.labelBoxes.some(a=>s.markerBoxes.some(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)))failures.push('army-label overlap');
    }
   }return failures;
  });assert.deepEqual(occlusion,[],'army targets '+w+'x'+h);
  // Exercise a real canvas army tap, not a direct UI method call.
  const point=await page.evaluate(()=>{Sheets.closeAll();const s=App.scene,a=Game.S.armies.find(a=>a.fid===Game.S.player),n=Game.node(a.node);s.selArmy=null;s.fly=null;s.updatePads();const v=s.visCenter();s.cam.z=1.45;s.cam.x=n.x-(v.x-App.W/2)/s.cam.z;s.cam.y=n.y-(v.y-App.H/2)/s.cam.z;s.cam.clamp();s.render(App.ctx);const h=s.hits.find(h=>h.kind==='army'&&h.a===a);return{x:h.x,y:h.y,id:a.id};});
  await page.touchscreen.tap(point.x,point.y);assert.equal(await page.evaluate(()=>App.scene.selArmy?.id),point.id,'army tap '+w);
  // A critical bulletin remains readable and must leave a usable map rectangle.
  const critical=await page.evaluate(()=>{Game.alert('crit','اختبار تنبيه حصار على الثغر',{key:'map-qa'});Sheets.closeAll();AlertsUI.open=false;AlertsUI.render();const s=App.scene;s.updatePads();const closedHeight=App.H-s.cam.padTop-s.cam.padBottom;s.openCity(Game.node('damascus'));s.fly=null;s.updatePads();return{height:closedHeight,sheetHeight:App.H-s.cam.padTop-s.cam.padBottom,rect:AlertsUI.el.querySelector('.dispatch').getBoundingClientRect().toJSON(),visible:!!AlertsUI.el.querySelector('.crit')};});
  assert.ok(critical.visible,'critical alert is actually displayed');assert.ok(critical.height>=100,'critical alert leaves map '+w);assert.ok(critical.sheetHeight>=70,'critical alert plus sheet leaves map '+w);assert.ok(critical.rect.bottom<h-64&&critical.rect.x>=0&&critical.rect.right<=w,'critical alert fits '+w);
  await page.screenshot({path:path.resolve(__dirname,`../artifacts/map/critical-${w}x${h}.png`)});
  await page.evaluate(()=>{Game.S.alerts=Game.S.alerts.filter(a=>a.key!=='map-qa');AlertsUI.render();App.scene.selArmy=null;});
  results.push({viewport:[w,h],mousePan:true,wheel:true,pinch:true,touchPan:true,atlasSearch:true,armyTap:true,armyTargetsClear:true,criticalAlertFits:true});
 }
 // The shared renderer must also keep the original eastern scenario runnable.
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{Game.newGame('threeKingdoms','shu','normal');startCampaign();document.querySelectorAll('.modal-layer').forEach(e=>e.remove());});
 await page.screenshot({path:path.resolve(__dirname,'../artifacts/map/eastern-390x844.png')});assert.equal(await page.evaluate(()=>Game.S.nodes.length),20);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.resolve(__dirname,'../artifacts/map/interactions.json'),JSON.stringify({results,easternScenario:true,errors},null,2));console.log('PASS real pointer/touch interactions, army occlusion and critical alerts at '+results.length+' sizes; eastern renderer.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
