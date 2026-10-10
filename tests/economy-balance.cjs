'use strict';
// Run: node tests/economy-balance.cjs [--compare-reserves]. Production files are never changed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
// Freeze script sources so an in-progress implementation edit cannot mix revisions between cases.
const root=path.resolve(__dirname,'..'), html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sources=new Map([[path.join(root,'index.html'),html]]);
for(const [,file]of html.matchAll(/<script src="([^"]+)"/g))sources.set(path.join(root,file),fs.readFileSync(path.join(root,file),'utf8'));
const sourceDigest=crypto.createHash('sha256').update([...sources].map(([p,s])=>p+'\n'+s).join('\n')).digest('hex');
const frozenFs={...fs,readFileSync(file,encoding){const source=sources.get(path.resolve(String(file)));return source===undefined?fs.readFileSync(file,encoding):encoding?source:Buffer.from(source);}};
const harnessModule={exports:{}};
new Function('require','module','exports','__dirname',fs.readFileSync(path.join(__dirname,'harness.cjs'),'utf8'))(name=>name==='node:fs'?frozenFs:require(name),harnessModule,harnessModule.exports,__dirname);
const { createContext }=harnessModule.exports;
const seed = 42;
const out=path.resolve(__dirname,'../artifacts/economy/balance-results.json');
const prior=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')):null;
const baselineMode=process.argv.includes('--baseline');
const compareMode=process.argv.includes('--compare-reserves');
let activeRate=baselineMode?0:null, results=[];
const round = n => Math.round(n * 100) / 100;
const mean = xs => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
function fresh(scenario = 'umayyad', player = 'umayyad') {
  const c = createContext(seed);
  if(activeRate!==null)c.run(`{
    const productionEconomy=Game.economy;
    Game.economy=function(fid){const e=productionEconomy.call(this,fid),f=this.f(fid),ordinary=e.expense-(e.exp.reserves||0),buffer=Math.max(3000,ordinary*6),excess=Math.max(0,(f?.gold||0)-buffer),cost=f?.horde?0:Math.round(excess*${activeRate});
      e.exp.reserves=cost;e.expense=ordinary+cost;e.netGold=e.income-e.expense;e.reserves={cost,buffer,excess,rate:${activeRate}};return e;};
  }`);
  c.run(`Game.newGame('${scenario}','${player}','normal')`);
  c.read = code => JSON.parse(c.run(`JSON.stringify(${code})`));
  c.run(`globalThis.P='${player}';globalThis.START_EDGES=Game.sc.edges.length;`);
  return c;
}
function snapshot(c) {
  return c.read(`(()=>{const e=Game.economy(P),f=Game.f(P),ns=Game.nodesOf(P),aa=Game.armiesOf(P),last=Game.financeState(P).history.at(-1);return {turn:Game.S.turn,gold:f.gold,food:f.food,cities:ns.length,population:ns.reduce((v,n)=>v+n.pop,0),income:e.income,expense:e.expense,net:e.netGold,admin:e.exp.admin,stabilization:e.exp.stabilization,wages:e.exp.wages,reserves:e.exp.reserves||0,settledNet:last?.net??null,settledReserves:last?.exp?.reserves??0,military:e.exp.army+e.exp.merc+e.exp.garrison+e.exp.supply+e.exp.overhead,army:e.exp.army+e.exp.merc,supply:e.exp.supply,garrison:e.exp.garrison,infrastructure:e.exp.infrastructure+e.exp.forts,trade:e.inc.trade,caravan:e.inc.route,agriculture:e.inc.food,armies:aa.length,regiments:aa.reduce((v,a)=>v+a.regs.length,0),troops:aa.reduce((v,a)=>v+Game.menOf(a.regs),0),foodBalance:e.netFood,loyalty:ns.reduce((v,n)=>v+n.loyalty,0)/Math.max(1,ns.length),inc:e.inc,exp:e.exp};})()`);
}
function investments(c) {
  return c.read(`Game.nodesOf(P).sort((a,b)=>b.pop-a.pop).slice(0,4).flatMap(n=>['market','farm','roads'].map(b=>{const p=Game.previewBuild(n,b);return p?{city:n.id,building:b,from:p.from,cost:p.cost,time:p.time,net:p.net,payback:p.payback,blocked:Game.canBuild(P,n,b)}:null}).filter(Boolean))`);
}
function peaceful(c) { c.run(`for(const a of Game.aliveMajors())for(const b of Game.aliveMajors())if(a!==b)Game.setStatus(a,b,'peace',0);`); }
function develop(c, count, market, farm, armies, regiments) {
  peaceful(c);
  c.run(`{
    const ns=Game.nodesOf(P).concat(Game.S.nodes.filter(n=>n.owner!==P)).slice(0,${count});
    const old=Game.armiesOf(P),gens=old.map(a=>a.gen).filter(Boolean);
    Game.S.armies=Game.S.armies.filter(a=>a.fid!==P&&!ns.some(n=>n.id===a.node));
    ns.forEach(n=>{n.owner=P;n.origOwner=P;n.market=${market};n.farm=${farm};n.roads=1;n.loyalty=75;n.unrest=0;delete n.economicOccupation;Game.fillGarrison(n,true);});
    for(let i=0;i<${armies};i++){const a=Game.createArmy(P,ns[i%ns.length].id,gens[i]||null);a.regs=Array.from({length:${regiments}},(_,k)=>Game.newReg(['spear','sword','archer','spear','cavalry','archer','cavalry','sword'][k%8]));}
    Game.S.turn=40;Game.f(P).gold=12000;Game.f(P).food=300;Game.f(P).finance=null;Game.financeState(P);
  }`);
}
function advanceControlled(c) {
  c.run(`{
    const e=Game.economy(P),gold=Game.f(P).gold;
    if(!Game.settleEconomy(P,e))throw Error('settlement unexpectedly skipped');
    if(Game.f(P).gold!==gold+e.netGold)throw Error('settlement does not match forecast');
    if(Game.settleEconomy(P,e)!==false)throw Error('same-turn settlement duplicated');
    Game.f(P).food=Math.max(0,Math.min(300,Game.f(P).food));
    for(const n of Game.nodesOf(P)){
      if(!Game.besieger(n.id))n.pop=Game.populationNext(n);
      if(n.unrest>0)n.unrest--;
      const target=Game.loyaltyTarget(n).target;
      n.loyalty=Math.round(Math.max(0,Math.min(100,n.loyalty+Math.max(-5,Math.min(4,target-n.loyalty)))));
    }
    Game.workTick();Game.S.turn++;Game.closeFinanceRound();
  }`);
}
function finish(c, spec, rows, roiBefore) {
  assert.deepEqual(c.errors, [], `${spec.name}: hidden runtime errors`);
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${spec.name}: ${key}`);
    assert.equal(row.income - row.expense, row.net);
    assert.equal(Object.values(row.inc).reduce((a,b)=>a+b,0), row.income);
    assert.equal(Object.values(row.exp).reduce((a,b)=>a+b,0), row.expense);
  }
  const start = rows[0], end = rows.at(-1), windows = [];
  for(let i=0;i<spec.turns;i+=20){const slice=rows.slice(i,Math.min(spec.turns,i+20));windows.push({from:i,to:Math.min(spec.turns,i+20),income:round(mean(slice.map(r=>r.income))),expense:round(mean(slice.map(r=>r.expense))),net:round(mean(slice.map(r=>r.net))),populationGain:rows[Math.min(spec.turns,i+20)].population-rows[i].population,goldGain:rows[Math.min(spec.turns,i+20)].gold-rows[i].gold});}
  const summary={openingGold:start.gold,closingGold:end.gold,minGold:Math.min(...rows.map(r=>r.gold)),firstNegativeTurn:rows.find(r=>r.gold<0)?.turn??null,startIncome:start.income,endIncome:end.income,startExpense:start.expense,endExpense:end.expense,startNet:start.net,endNet:end.net,meanNet:round(mean(rows.slice(1).map(r=>r.settledNet))),reserveManagementPaid:rows.slice(1).reduce((sum,r)=>sum+r.settledReserves,0),endReserveCost:end.reserves,populationGrowthPercent:round((end.population/start.population-1)*100),incomeGrowthPercent:round((end.income/start.income-1)*100),startCities:start.cities,endCities:end.cities,startAdmin:start.admin,endAdmin:end.admin,peakStabilization:Math.max(...rows.map(r=>r.stabilization)),endWages:end.wages,endMilitary:end.military,endTrade:end.trade,endCaravan:end.caravan,capitalCompounding:false};
  const drivers={income:Object.fromEntries(Object.keys(end.inc).map(k=>[k,{start:start.inc[k]||0,end:end.inc[k]||0,change:(end.inc[k]||0)-(start.inc[k]||0)}])),expense:Object.fromEntries(Object.keys(end.exp).map(k=>[k,{start:start.exp[k]||0,end:end.exp[k]||0,change:(end.exp[k]||0)-(start.exp[k]||0)}])),netOneOffCash:round(end.gold-start.gold-rows.slice(1).reduce((sum,r)=>sum+r.settledNet,0)),endTaxShare:round(((end.inc.tax||0)+(end.inc.government||0))/end.income*100),endTradeShare:round(((end.inc.trade||0)+(end.inc.route||0))/end.income*100)};
  const item={...spec,seed,summary,drivers,windows,roiBefore,roiAfter:investments(c),rows};results.push(item);
  console.log(`${spec.name}: ${start.cities}→${end.cities} cities; gold ${start.gold}→${end.gold}; net ${start.net}→${end.net}; income ${start.income}→${end.income}; admin ${start.admin}→${end.admin}; wages ${end.wages}; military ${end.military}${summary.firstNegativeTurn!==null?' [NEGATIVE from turn '+summary.firstNegativeTurn+']':''}`);
  return item;
}
function run(spec, setup, eachTurn) {
  const c=fresh(spec.scenario,spec.player);setup?.(c);
  const roi=investments(c),rows=[snapshot(c)];
  for(let i=0;i<spec.turns;i++){
    eachTurn?.(c,i);
    if(spec.mode==='actual-endRound')c.run('Game.endRound()');else advanceControlled(c);
    rows.push(snapshot(c));
  }
  return finish(c,spec,rows,roi);
}

function simulate(rate){
activeRate=rate;results=[];
console.log('\nReserve variant: '+(rate===null?'production':rate*100+'% VM only'));
for(const [scenario,players]of [['threeKingdoms',['shu','wei','wu']],['umayyad',['umayyad','byzantine','khazar']]])for(const player of players)run({name:'early_'+player,scenario,player,turns:20,mode:'actual-endRound',description:'Unmodified initial faction, actual endRound with seeded local mechanics; no strategic AI turns or worldTick events.'});

run({name:'mid_realm',scenario:'threeKingdoms',player:'shu',turns:40,mode:'controlled',description:'10 established cities; markets/farms/roads level 1, six armies of five regiments; no new investments.'},c=>develop(c,10,1,1,6,5));
run({name:'late_large_empire',scenario:'umayyad',player:'umayyad',turns:120,mode:'controlled',description:'58 established cities, market level 2/farm level 1/roads, 24 armies of six regiments. Fixed development isolates population-driven income growth.'},c=>develop(c,58,2,1,24,6));
run({name:'late_small_army_upper_bound',scenario:'umayyad',player:'umayyad',turns:120,mode:'controlled',description:'Same 58-city economy, four armies only, no wars or purchases: deliberate hoarding upper bound, not normal campaign spending.'},c=>develop(c,58,2,1,4,6));
run({name:'late_saturated_population',scenario:'umayyad',player:'umayyad',turns:120,mode:'controlled',description:'Same 58-city military economy, population placed at each current building-dependent capacity to verify there is no unbounded growth at the ceiling.'},c=>{develop(c,58,2,1,24,6);c.run("for(const n of Game.nodesOf(P)){const base=Game.sc.nodes.find(x=>x.id===n.id).pop;n.pop=Math.round(base*(1.5+.25*n.farm+.12*n.market));}");});

run({name:'prolonged_war',scenario:'umayyad',player:'umayyad',turns:60,mode:'controlled',description:'38 developed cities and 12 armies; six armies stay deployed in enemy territory, three under siege. Three home economic cities remain blockaded. No simulated battlefield losses or conquest income; sustained deployment cost stress.'},c=>{
  develop(c,38,1,1,12,6);c.run(`Game.setStatus(P,'byzantine','war',0);{
    const targets=['caesarea','iconium','ancyra','amorium','nicaea','trebizond'];Game.armiesOf(P).slice(0,6).forEach((a,i)=>{a.node=targets[i];a.siege=i<3?{turns:4}:null;});
    for(const id of ['damascus','homs','antioch']){const a=Game.createArmy('byzantine',id,null);a.regs=Array.from({length:4},()=>Game.newReg('spear'));a.siege={turns:4};}
  }`);
});
run({name:'trade_focused',scenario:'umayyad',player:'byzantine',turns:60,mode:'controlled',description:'18 cities, markets/farms/roads level 1; six armies of five regiments. Peace and trade with both partners, free-markets policy, one real affordable economic project every six turns selected by shortest current payback.'},c=>{
  develop(c,18,1,1,6,5);c.run("Game.setTreaty(P,'umayyad','trade',true);Game.setTreaty(P,'khazar','trade',true);Game.setEdict(P,'trade')");
},(c,i)=>{if(i%6===0)c.run(`{
  const choices=Game.nodesOf(P).flatMap(n=>['market','farm','roads','port'].filter(b=>!Game.canBuild(P,n,b)).map(b=>({n,b,p:Game.previewBuild(n,b)}))).filter(x=>x.p?.payback).sort((a,b)=>a.p.payback-b.p.payback);
  if(choices.length){const x=choices[0];Game.build(P,x.n,x.b);}
}`);});

for(const mode of ['annex','aman'])run({name:'conquest_'+mode,scenario:'threeKingdoms',player:'shu',turns:60,mode:'controlled',description:`Start with five cities and existing forces; assume one military victory each five turns (ten total), apply real ${mode==='aman'?'clemency':'occupy'} consequences. Excludes combat casualties/recruitment and assumes victories; an optimistic economic bound, not a conquest success prediction.`},c=>{
  c.run("Game.f(P).gold=2000;Game.f(P).finance=null;Game.financeState(P);globalThis.targets=Game.S.nodes.filter(n=>n.owner!==P&&!n.capital).slice(0,10).map(n=>n.id)");
},(c,i)=>{if(i%5===0&&i/5<10)c.run(`{
  const n=Game.node(targets[${i/5}]),old=n.owner;n.owner=P;n.capturedTurn=Game.S.turn;n.unrest=4;
  Game.S.armies=Game.S.armies.filter(a=>a.node!==n.id||a.fid===P);
  Game.fillGarrison(n,true);Game.applyOccupation(n,P,old,'${mode==='aman'?'clemency':'occupy'}','battle');
}`);});

run({name:'high_payroll',scenario:'threeKingdoms',player:'shu',turns:40,mode:'controlled',description:'Initial five-city force; eight additional contracted leaders at wage 70 (court half-pay 35), plus existing payroll. No forced dismissals or new revenue; intentionally measures an unaffordable council.'},c=>{c.run("for(let i=0;i<8;i++){const g=Game.addGeneral(P,'قائد محاكاة '+i,'tactician',null,2);g.wage=70;g.status='pool';}");});
run({name:'large_standing_army',scenario:'threeKingdoms',player:'shu',turns:40,mode:'controlled',description:'10 developed cities, 15 armies of eight regiments each. Retains army size despite insolvency/starvation to quantify unaffordable commitments; live game attrition/desertion would change them.'},c=>develop(c,10,1,1,15,8));

const saturated=results.find(r=>r.name==='late_saturated_population');
assert.equal(saturated.rows[0].population,saturated.rows.at(-1).population,'population must remain bounded at capacity');
const growing=results.find(r=>r.name==='late_large_empire');
assert.ok(growing.windows.at(-1).populationGain<growing.windows[0].populationGain,'unchanged developed empire must slow population growth');
const concerns=[];
for(const r of results){
  if(r.name.startsWith('early_')&&r.summary.firstNegativeTurn!==null)concerns.push({scenario:r.name,severity:'opening-bankruptcy',detail:'The unchanged starting faction went below zero in actual endRound smoke.'});
  if(r.summary.firstNegativeTurn!==null&&!r.name.startsWith('early_'))concerns.push({scenario:r.name,severity:'stress-deficit',detail:'Fixed commitments exceed resources; this replay retains commitments rather than invoking live desertion.'});
  if(r.name.startsWith('late_')&&r.summary.closingGold>100000)concerns.push({scenario:r.name,severity:r.summary.reserveManagementPaid?'large-reserve-stockpile':'hoarding-surplus',detail:r.summary.reserveManagementPaid?'The fully developed empire can still keep a large operating reserve, but reserve-management expenses oppose continued accumulation; compare final net and 20-turn windows.':'A peaceful established empire can accumulate a large stockpile with no ongoing purchases. This is a linear bounded-income surplus, not gold interest or uncapped exponential population growth.'});
}
const output={version:1,seed,model:'Production economy(), settlement, populationNext(), loyaltyTarget(), construction and occupation; no patched production parameters.',methodology:{opening:'20 actual endRound calls for each of the six starting factions. Strategic AI turns, worldTick crises, missions and leader event processing are excluded.',controlled:'Production settlement once per turn, food clamped to game cap, production population/loyalty progression, workTick and finance reconciliation. Controlled army/city commitments; no interest or automatic reinvestment.',exclusions:['Random AI wars, treaties, conquest outcomes and world events.','Combat casualty/replacement costs, siege starvation and battlefield results in controlled stress cases.','Automatic desertion, revolt, collapse and salary renegotiation in controlled runs; negative treasury is reported, not concealed.','Fixture development starts prebuilt; purchase costs are charged only for trade-focused projects and real occupation fees.'],interpretation:'The controlled cases isolate financial mechanics and are not full campaign-win simulations. A large positive treasury without purchases remains possible; bounded population prevents exponential scaling but does not cap accumulated savings.'},counts:{scenarios:results.length,turns:results.reduce((sum,r)=>sum+r.turns,0),actualEndRoundTurns:results.filter(r=>r.mode==='actual-endRound').reduce((sum,r)=>sum+r.turns,0)},concerns,results};
output.sourceDigest=sourceDigest;
output.reserveManagementMode=rate===null?'Current production economics.':`VM-only reserve expense ${rate*100}% on gold above max(3000, six turns of ordinary expenses); production reserve cost replaced, not compounded.`;
output.reserveRate=rate;
return output;
}
const variants=(compareMode?[0,.01,.04]:[activeRate]).map(simulate);
const output=variants[0];
if(compareMode)output.reserveComparison={sourceDigest,assumption:'Identical cases, seed and frozen code; only substituted reserve cost differs. The fee does not change underlying city output or military needs. Adaptive building purchases may differ as the fee changes payback estimates.',variants:variants.map(v=>({rate:v.reserveRate,counts:v.counts,concerns:v.concerns,results:v.results.map(({rows,...rest})=>rest)}))};
else if(prior?.reserveComparison)output.reserveComparison=prior.reserveComparison;
// Same rear-area force and losses, actual campaign replacement/affordability logic.
// This complements the fixed-front deployment test; it does not claim to predict combat outcomes.
function replacementComparison(){
  activeRate=0;
  const runs=[];
  for(const mode of ['old-flat','production']){
    const c=fresh('umayyad','byzantine');develop(c,18,2,2,12,8);
    c.run(`Game.f(P).gold=100000;Game.f(P).finance=null;Game.financeState(P);Game.setStatus(P,'umayyad','war',0);
      for(const a of Game.armiesOf(P))a.regs=['spear','sword','archer','cavalry','horsearcher','cataphract','catapult','cataphract'].map(t=>Game.newReg(t));`);
    if(mode==='old-flat')c.run('Game.replacementPrice=()=>.4');
    const start=snapshot(c),rows=[];let lost=0,recovered=0,paid=0;
    const prices=c.read(`Object.fromEntries(['spear','sword','archer','cavalry','horsearcher','cataphract','catapult'].map(type=>[type,Game.replacementPrice({type})]))`);
    for(let i=0;i<40;i++){
      if(i%4===0)lost+=c.run(`Game.armiesOf(P).reduce((sum,a)=>sum+a.regs.reduce((v,r)=>{const n=Math.min(r.men-1,Math.floor(UNITS[r.type].men*.25));r.men-=n;return v+n;},0),0)`);
      const before=c.run('Game.armiesOf(P).reduce((s,a)=>s+Game.menOf(a.regs),0)');
      c.run('Game.endRound()');
      const after=c.run('Game.armiesOf(P).reduce((s,a)=>s+Game.menOf(a.regs),0)');
      recovered+=after-before;
      const cost=c.run("-Game.financeState(P).history.at(-1).entries.filter(x=>x.kind==='reinforcement').reduce((sum,x)=>sum+x.amount,0)");paid+=cost;
      rows.push({turn:i+1,gold:c.run('Game.f(P).gold'),troops:after,replacementCost:cost});
    }
    assert.deepEqual(c.errors,[]);assert.ok(rows.every(r=>r.gold>0),'ample-funds replacement fixture should avoid insolvency');
    assert.equal(recovered,lost,'all periodic losses should be replenished by final turn');
    runs.push({mode,startGold:start.gold,endGold:rows.at(-1).gold,prices,lost,recovered,replacementPaid:paid,averageCostPerReplacement:round(paid/recovered),rows});
  }
  assert.equal(runs[0].lost,runs[1].lost);assert.equal(runs[0].recovered,runs[1].recovered);
  return {description:'12 Byzantine armies, eight regiments each (two cataphracts plus spear/sword/archer/cavalry/horse archer/catapult), 18 developed cities. Identical 25% maximum-strength losses every four turns, 40 actual endRound turns, funds100000; no reserve fee. Armies rotate in friendly cities for genuine campaign recovery. No synthetic combat result, extra injected manpower or treasury during simulation.',runs};
}
output.replacementComparison=replacementComparison();
output.methodology.exclusions.push('Controlled variants hold troop and garrison complements fixed; they do not run garrison refill, replenishment, or recruitment unless explicitly stated.');
output.executedCounts={scenarios:variants.reduce((sum,v)=>sum+v.counts.scenarios,0)+2,turns:variants.reduce((sum,v)=>sum+v.counts.turns,0)+80,actualEndRoundTurns:variants.reduce((sum,v)=>sum+v.counts.actualEndRoundTurns,0)+80};
if(baselineMode)output.beforeReserveManagement={counts:output.counts,concerns:output.concerns,results:output.results,method:output.reserveManagementMode};
else if(prior?.beforeReserveManagement){
  output.beforeReserveManagement=prior.beforeReserveManagement;
  output.comparison=output.results.map(r=>{const b=prior.beforeReserveManagement.results.find(x=>x.name===r.name);return {name:r.name,before:b?.summary||null,after:r.summary};});
}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');
console.log(`\n${output.counts.scenarios} scenarios; ${output.counts.turns} simulated turns; ${output.counts.actualEndRoundTurns} actual endRound turns.`);
console.log('Replacement comparison: '+JSON.stringify(output.replacementComparison.runs.map(({rows,...r})=>r)));
console.log('Concerns: '+JSON.stringify(output.concerns));console.log('Saved '+out);
