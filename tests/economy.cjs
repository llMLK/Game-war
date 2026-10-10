'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createContext}=require('./harness.cjs');
const c=createContext(173),checks=[];
const run=s=>c.run('{'+s+'}'),read=s=>JSON.parse(run('JSON.stringify('+s+')'));
const fresh=()=>run("Game.newGame('umayyad','umayyad','normal')");
function test(name,fn){fresh();fn();checks.push(name);console.log('PASS '+name);}
test('income and expense categories sum to the live forecast',()=>{
 for(const fid of read('Game.majors()')){const e=read(`Game.economy('${fid}')`);assert.equal(Object.values(e.inc).reduce((a,b)=>a+b,0),e.income);assert.equal(Object.values(e.exp).reduce((a,b)=>a+b,0),e.expense);assert.equal(e.income-e.expense,e.netGold);assert.ok(Number.isFinite(e.netGold));}
});
test('administrative paths use actual geography and bounded isolation, never 99 hops',()=>{
 const originalEdges=read('Game.sc.edges');
 run("Game.S.nodes.forEach(n=>{n.owner='umayyad';n.port=1})");
 const before=read("Game.adminCosts('umayyad')");assert.ok(before.every(x=>x.d===null||x.d<99));assert.ok(before.every(x=>x.c<=30));
 run("Game.sc.edges=Game.sc.edges.filter(e=>e[0]!=='damascus'&&e[1]!=='damascus');Game.S.nodes.forEach(n=>n.capital=n.id==='damascus')");
 const isolated=read("Game.adminCosts('umayyad')");assert.ok(isolated.some(x=>x.d===null));assert.ok(isolated.every(x=>x.c<=26));assert.ok(isolated.filter(x=>x.d===null).every(x=>x.distance===8));
 // Restore scenario graph for later fixtures; Game.newGame intentionally reuses immutable scenario data.
 run('Game.sc.edges='+JSON.stringify(originalEdges));
});
test('local administration does not multiply existing city costs after expansion',()=>{
 const x=read("Game.localAdministration(Game.node('kufa'))");run("Game.S.nodes.find(n=>n.owner!=='umayyad'&&!n.capital).owner='umayyad'");const y=read("Game.localAdministration(Game.node('kufa'))");assert.ok(y.c<=x.c);
 run("Game.node('kufa').economicOccupation={mode:'aman',since:Game.S.turn}");assert.ok(run("Game.localAdministration(Game.node('kufa')).c")<x.c);
});
test('population growth smoothly diminishes and preserves oversized old cities',()=>{
 const v=read("(()=>{const n=Game.node('damascus'),base=Game.sc.nodes.find(x=>x.id===n.id).pop;n.farm=2;n.market=3;const cap=base*2.36;return [.5,.8,.95,.99].map(k=>{n.pop=Math.floor(cap*k);return (Game.populationNext(n)-n.pop)/n.pop})})()");for(let i=1;i<v.length;i++)assert.ok(v[i]<v[i-1]);
 run("Game.node('damascus').pop=1000000");assert.equal(run("Game.populationNext(Game.node('damascus'))"),1000000);
});
test('all building previews equal actual formula changes and do not mutate saved state',()=>{
 run("Game.f('umayyad').food=300;Game.f('umayyad').gold=10000");
 for(const b of read('Object.keys(BUILDINGS)')){
  run(`Game.node('damascus')['${b}']=0`);const before=run('JSON.stringify(Game.S)'),e=read("Game.economy('umayyad')"),p=read(`Game.previewBuild(Game.node('damascus'),'${b}')`);assert.equal(run('JSON.stringify(Game.S)'),before,b+' preview side effects');
  run(`Game.node('damascus')['${b}']=1`);const after=read("Game.economy('umayyad')");assert.equal(p.net,after.netGold-e.netGold,b);assert.equal(p.gold,after.income-e.income,b);assert.equal(p.upkeep,after.expense-e.expense,b);if(p.net>0)assert.equal(p.payback,p.time+Math.ceil(p.cost/p.net));else assert.equal(p.payback,null);
 }
});
test('construction charges once, grants no premature yield, completes on its due turn',()=>{
 run("Game.node('damascus').market=0;Game.f('umayyad').gold=10000;Game.financeState('umayyad').anchor=10000");const e=read("Game.economy('umayyad')"),gold=run("Game.f('umayyad').gold");assert.equal(run("Game.build('umayyad',Game.node('damascus'),'market')"),null);assert.equal(run("Game.f('umayyad').gold"),gold-300);assert.equal(run("Game.economy('umayyad').inc.market"),e.inc.market);run("Game.S.turn=Game.node('damascus').work.done;Game.workTick()");assert.equal(run("Game.node('damascus').market"),1);assert.ok(run("Game.economy('umayyad').inc.market")>e.inc.market);
});
test('investment preference changes with local resources and route position',()=>{
 run("Game.f('umayyad').food=300");
 assert.ok(run("Game.previewBuild(Game.node('merida'),'farm').payback < Game.previewBuild(Game.node('merida'),'market').payback"));
 assert.ok(run("Game.previewBuild(Game.node('damascus'),'market').payback < Game.previewBuild(Game.node('damascus'),'farm').payback"));
 assert.ok(run("Game.previewBuild(Game.node('tarsus'),'roads').net")>0);
});
test('leader contracts and assigned officers are charged exactly once',()=>{
 const expected=run("Game.gensOf('umayyad').filter(g=>Game.employed(g)).reduce((s,g)=>s+Game.genSalary(g),0)+Game.armiesOf('umayyad').reduce((s,a)=>s+(Game.isOfficer(Game.armyGen(a))?Game.genSalary(Game.armyGen(a)):0),0)");assert.equal(run("Game.economy('umayyad').exp.wages"),expected);
 const id=run("Game.gensOf('umayyad').find(g=>Game.employed(g)&&!Game.isRuler(g)).id");run(`Game.gen('${id}').wage=80;Game.gen('${id}').status='pool'`);assert.equal(run(`Game.genSalary(Game.gen('${id}'))`),40);
});
test('upkeep and campaign supply use the existing unit and readiness integration formulas',()=>{
 assert.equal(run("Game.economy('umayyad').exp.army"),run("Game.armiesOf('umayyad').flatMap(a=>a.regs).filter(r=>!r.merc).reduce((s,r)=>s+Game.unitUpkeep(r),0)"));
 const a=run("Game.armiesOf('umayyad')[0].id");run(`Game.readyOf(Game.army(${JSON.stringify(a)})).fat=99;Game.readyOf(Game.army(${JSON.stringify(a)})).ammo=0`);assert.ok(run("Game.economy('umayyad').exp.army")>0);
});
test('full endRound ledger reconciles construction, reinforcement and recurring collection',()=>{
 run("Game.node('damascus').market=0;Game.build('umayyad',Game.node('damascus'),'market');const damaged=Game.armiesOf('umayyad')[0];damaged.node='damascus';damaged.regs[0].men-=20;Game.endRound()");
 const v=read("Game.financeView('umayyad')"),last=v.last,gold=run("Game.f('umayyad').gold");assert.equal(last.opening+last.oneOff+last.income-last.expense,last.closing);assert.equal(last.closing,gold);assert.equal(last.entries.reduce((s,e)=>s+e.amount,0),last.oneOff);assert.ok(last.entries.some(x=>x.kind==='construction'));assert.ok(last.entries.some(x=>x.kind==='reinforcement'));assert.equal(v.actions,0);
});
test('settlement is idempotent and cannot duplicate income after reload',()=>{
 run("Game.settleEconomy('umayyad',Game.economy('umayyad'));Game.save('slot3')");const before=read("({gold:Game.f('umayyad').gold,food:Game.f('umayyad').food,ledger:Game.financeState('umayyad')})");
 for(let i=0;i<3;i++){run("Game.load('slot3');Game.settleEconomy('umayyad',Game.economy('umayyad'))");assert.deepEqual(read("({gold:Game.f('umayyad').gold,food:Game.f('umayyad').food,ledger:Game.financeState('umayyad')})"),before);}
});
test('tribute and vassal transfers reconcile symmetrically and are not paid twice',()=>{
 run("Game.f('khazar').overlord='umayyad';Game.S.tributes=[{payer:'umayyad',payee:'byzantine',amount:27,t:4}]");assert.equal(run("Game.economy('umayyad').inc.vassal"),run("Game.economy('khazar').exp.vassal"));assert.equal(run("Game.economy('umayyad').exp.tribute"),27);assert.equal(run("Game.economy('byzantine').inc.tribute"),27);
 const gold=read("Object.fromEntries(Object.entries(Game.S.factions).map(([id,f])=>[id,f.gold]))");run('Game.vassalTick()');assert.deepEqual(read("Object.fromEntries(Object.entries(Game.S.factions).map(([id,f])=>[id,f.gold]))"),gold);
});
test('Annexation and Aman previews match execution with declining local costs',()=>{
 for(const choice of ['occupy','clemency','sack']){
  fresh();run("const city=Game.node('amorium');city.owner='umayyad';city.unrest=4;city.capturedTurn=0;Game.f('umayyad').gold=10");const state=run('JSON.stringify(Game.S)'),p=read(`Game.economicOccupationPreview(Game.node('amorium'),'${choice}','storm')`);assert.equal(run('JSON.stringify(Game.S)'),state);
  run(`Game.applyOccupation(Game.node('amorium'),'umayyad','byzantine','${choice}','storm')`);const actual=read("Game.cityEconomy(Game.node('amorium'))");assert.equal(actual.net,p.net);assert.equal(run("Game.f('umayyad').gold"),10+p.fee);const costs=[];for(let t=0;t<=p.duration;t++){run(`Game.S.turn=${t}`);costs.push(run("Game.stabilizationCost(Game.node('amorium'))"));}assert.equal(costs.at(-1),0);for(let i=1;i<costs.length;i++)assert.ok(costs[i]<=costs[i-1]);
 }
});
test('save migration preserves population, buildings, burdens and route disruption',()=>{
 run("const city=Game.node('damascus');city.pop=150000;city.market=3;city.farm=2;city.caravanStop=8;city.economicOccupation={mode:'aman',since:0};Game.f('umayyad').gold=-13;Game.endRound();Game.save('slot3')");
 const snap=()=>read("({gold:Game.f('umayyad').gold,e:Game.economy('umayyad'),n:Game.node('damascus'),ledger:Game.financeState('umayyad'),route:Game.routeStatus('umayyad')})");const before=snap();run("Game.load('slot3')");assert.deepEqual(snap(),before);
 run("delete Game.f('umayyad').finance;Game.save('slot3');Game.load('slot3')");assert.equal(run("Game.financeState('umayyad').anchor"),run("Game.f('umayyad').gold"));assert.equal(run("Game.node('damascus').pop"),before.n.pop);
});
test('occupation keeps defender choices and previews their gold and production effects exactly',()=>{
 for(const choice of ['occupy','clemency','sack'])for(const fate of ['disarm','withdraw','passage','captives']){
  fresh();run("const n=Game.node('amorium');n.owner='umayyad';n.unrest=4;n.market=0;Game.capCtx={node:n.id,defMen:120,bldBefore:[2,1,1,0]};Game.f('umayyad').gold=10");
  const p=read(`Game.economicOccupationPreview(Game.node('amorium'),'${choice}','storm','${fate}',120)`);
  run(`Game.applyOccupation(Game.node('amorium'),'umayyad','byzantine',{choice:'${choice}',fate:'${fate}'},'storm')`);assert.equal(run("Game.cityEconomy(Game.node('amorium')).net"),p.net,choice+'/'+fate);assert.equal(run("Game.f('umayyad').gold"),10+p.fee,choice+'/'+fate);
 }
});
test('saving a large treasury carries no fee or change to normal recurring costs',()=>{
 run("Game.f('umayyad').gold=1000");const before=read("Game.economy('umayyad')");run("Game.f('umayyad').gold=1000000");assert.deepEqual(read("Game.economy('umayyad')"),before);
});
test('equipment replacement is proportional to unit cost and reconciles with the live round',()=>{
 for(const type of ['spear','sword','cavalry','cataphract','catapult']){
  fresh();run(`Game.f('umayyad').gold=10000;const a=Game.armiesOf('umayyad')[0];a.node='damascus';a.regs=[Game.newReg('${type}')];a.regs[0].men=Math.max(6,Math.floor(UNITS['${type}'].men/2));Game.node('damascus').manpower=5000`);
  const price=run(`Game.replacementPrice({type:'${type}'})`);assert.equal(Math.round(price*run(`UNITS['${type}'].men`)),Math.round(.4*run(`UNITS['${type}'].cost`)));
  const menBefore=run("Game.armiesOf('umayyad')[0].regs[0].men");run('Game.endRound()');const healed=run("Game.armiesOf('umayyad')[0].regs[0].men")-menBefore,last=read("Game.financeView('umayyad').last");assert.ok(healed>0);assert.equal(last.entries.filter(x=>x.kind==='reinforcement').reduce((s,x)=>s-x.amount,0),Math.round(healed*price));assert.equal(last.opening+last.oneOff+last.net,last.closing);
 }
});
test('unclassified events reconcile exactly and reading explanations never collects money',()=>{
 run("Game.f('umayyad').gold+=31");const before=run("Game.f('umayyad').gold");for(let i=0;i<3;i++)run("Game.financeView('umayyad');Explain.treasury('umayyad');Explain.expansion('umayyad')");assert.equal(run("Game.f('umayyad').gold"),before);const v=read("Game.financeView('umayyad')");assert.equal(v.actions,31);assert.equal(v.entries.reduce((s,e)=>s+e.amount,0),31);
});
assert.deepEqual(c.errors,[]);const out=path.resolve(__dirname,'../artifacts/economy');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'logic-results.json'),JSON.stringify({passed:checks.length,checks},null,2));console.log('Economy: '+checks.length+' groups passed.');
