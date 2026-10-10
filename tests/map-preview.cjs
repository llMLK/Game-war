const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const out=path.resolve(__dirname,'../artifacts/map');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('ERR_'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:8000',{waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready;Game.newGame('umayyad','umayyad','normal');startCampaign();document.querySelectorAll('.modal-layer').forEach(e=>e.remove());});
 const results=[];
 for(const [w,h]of [[1440,900],[844,390],[740,360],[568,320],[390,844],[360,740],[320,568],[1024,768]]){
  await page.setViewportSize({width:w,height:h});
  await page.waitForFunction(([w,h])=>App.W===w&&App.H===h,[w,h]);
  await page.evaluate(()=>{const s=App.scene;Sheets.closeAll();s.fitCam(false);s.refresh();s.updatePads();});
  await page.waitForTimeout(250);
  const report=await page.evaluate(()=>{
   const s=App.scene, failures=[];
   for(const withSheet of [false,true]){
    if(withSheet)s.openCity(Game.node('damascus'));else Sheets.closeAll();s.updatePads();
    for(const zoom of [s.cam.minZ,1.45,2.6])for(const n of Game.S.nodes){
     const c=s.cam,v=s.visCenter();c.z=zoom;c.x=n.x-(v.x-App.W/2)/zoom;c.y=n.y-(v.y-App.H/2)/zoom;c.clamp();
     const p=c.toScreen(n.x,n.y);if(!s.inView(n.x,n.y,12))failures.push(`${n.id} z${zoom.toFixed(2)} sheet${withSheet} outside`);
     const el=document.elementFromPoint(p.x,p.y);if(!el||el.id!=='view')failures.push(`${n.id} z${zoom.toFixed(2)} sheet${withSheet} under ${el?.className||'outside canvas'}`);
     if(zoom===1.45){s.selNode=n;s.render(App.ctx);if(!s.visibleLabels.includes(n.id))failures.push(`${n.id} focused label missing sheet${withSheet}`);}
    }
   }
   Sheets.closeAll();s.selNode=null;s.fitCam(false);s.refresh();s.fly=null;s.render(App.ctx);
   const overlaps=s.labelBoxes.filter((a,i,all)=>all.slice(i+1).some(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)).length;
   return {viewport:[App.W,App.H],cityCount:Game.S.nodes.length,failures:[...new Set(failures)],labelOverlaps:overlaps,labels:s.visibleLabels.length,scrollWidth:document.body.scrollWidth};
  });
  await page.screenshot({path:path.join(out,`map-${w}x${h}.png`)});
  await page.evaluate(()=>App.scene.openCity(Game.node('damascus')));await page.waitForTimeout(1300);
  await page.screenshot({path:path.join(out,`city-${w}x${h}.png`)});
  await page.evaluate(()=>{Sheets.closeAll();App.scene.openAtlas()});
  const modal=await page.locator('.modal').last().boundingBox();
  report.modalFits=!!modal&&modal.x>=0&&modal.y>=0&&modal.x+modal.width<=w+1&&modal.y+modal.height<=h+1;
  await page.screenshot({path:path.join(out,`atlas-${w}x${h}.png`)});
  await page.evaluate(()=>document.querySelectorAll('.modal-layer').forEach(e=>e.remove()));
  results.push(report);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.waitForFunction(()=>App.W===1440&&App.H===900);
 await page.evaluate(()=>{Sheets.closeAll();const s=App.scene;s.updatePads();s.cam.z=s.cam.minZ;s.flyTo(s.atlasFrame.x,s.atlasFrame.y,s.cam.minZ)});await page.waitForTimeout(1300);
 await page.screenshot({path:path.join(out,'atlas-overview.png')});
 const overviewFailures=await page.evaluate(()=>Game.S.nodes.filter(n=>!App.scene.inView(n.x,n.y,8)).map(n=>n.id));
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({results,overviewFailures,errors},null,2));
 console.log(JSON.stringify({results,overviewFailures,errors},null,2));await browser.close();
 if(errors.length||overviewFailures.length||results.some(r=>r.failures.length||r.labelOverlaps||!r.modalFits||r.scrollWidth>r.viewport[0]))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
