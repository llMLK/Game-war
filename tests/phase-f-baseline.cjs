const {chromium}=require('C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {execFileSync}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'msedge'}),p=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 for(const file of ['actions','campaign-ui']) await p.route(`**/js/${file}.js`,r=>r.fulfill({contentType:'application/javascript',body:execFileSync('git',['show',`a721b9d:js/${file}.js`],{encoding:'utf8'})}));
 await p.route('**/atlas.css',r=>r.fulfill({contentType:'text/css',body:execFileSync('git',['show','a721b9d:atlas.css'],{encoding:'utf8'})}));
 await p.goto('http://127.0.0.1:8000');await p.evaluate(()=>{
  Game.newGame('umayyad','umayyad','normal');startCampaign();document.querySelectorAll('.modal-layer').forEach(e=>e.remove());
  CampaignAI.turn=async()=>{};Game.worldTick=async()=>{};Game.pendingDecisions=async()=>{};Panels.captivePrompts=()=>{};
  window.settlements=0;const round=Game.endRound.bind(Game);Game.endRound=()=>{settlements++;round()};
  Undo.push({label:'فعل اختباري',undo:()=>{},valid:()=>true});UndoBar.el.querySelectorAll('button')[1].click();
 });
 const undo=await p.evaluate(()=>{const before=UndoBar.el.hidden;App.scene.refresh();return{hiddenAfterX:before,hiddenAfterRefresh:UndoBar.el.hidden,stack:Undo.stack.length}});
 const cdp=await p.context().newCDPSession(p),box=await p.locator('.end-turn span').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
 await p.evaluate(()=>{window.touchLabel=App.scene.hud.end.querySelector('span');window.events=[];for(const t of ['touchstart','touchend','pointerdown','pointerup','click'])App.scene.hud.end.addEventListener(t,e=>events.push({type:t,target:e.target.tagName}));});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 const replaced=await p.evaluate(()=>{App.scene.refresh();return !touchLabel.isConnected});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(1500);
 const race={replaced,...await p.evaluate(()=>({events,settlements,turn:Game.S.turn}))};
 await p.waitForFunction(()=>!App.scene.busy);
 const expected=await p.evaluate(()=>settlements+1);await p.locator('.end-turn').tap();await p.waitForFunction(n=>settlements===n,expected);await p.waitForFunction(()=>!App.scene.busy);
 const ordinaryTap=await p.evaluate(()=>({settlements,turn:Game.S.turn}));
 await p.evaluate(()=>{App.scene.busy=true;UI.toast('');window.beforeBusy=settlements});await p.locator('.end-turn').tap();
 const busy=await p.evaluate(()=>({settlements,beforeBusy,feedback:document.querySelector('#toast')?.textContent||'',button:App.scene.hud.end.innerText}));
 assert.equal(undo.hiddenAfterX,true);assert.equal(undo.hiddenAfterRefresh,false);assert.equal(undo.stack,1);assert.equal(busy.feedback,'');assert.equal(busy.settlements,busy.beforeBusy);
 const report={baseline:'a721b9d',viewport:'390x844',undo,race,ordinaryTap,busy};fs.mkdirSync('artifacts/phase-f',{recursive:true});fs.writeFileSync('artifacts/phase-f/baseline.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
