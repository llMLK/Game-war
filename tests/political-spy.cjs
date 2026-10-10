'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {createContext} = require('./harness.cjs');
const c = createContext(573), checks = [], sims = {};
if(c.run('typeof Game.spyAssessment') !== 'function') c.run(fs.readFileSync(path.join(__dirname,'../js/political-spy.js'),'utf8'));
const run = s => c.run('{'+s+'}'), read = s => JSON.parse(run('JSON.stringify('+s+')'));
function fresh(){run("Game.newGame('umayyad','umayyad','normal');Game.f('umayyad').gold=5000");}
function test(name,fn){fresh();fn();checks.push(name);console.log('PASS '+name);}
function success(op,id,sub){
 run(`for(let t=Game.S.turn;t<Game.S.turn+100;t++){const v=Game.spyAssessment('umayyad','byzantine','${op}',${JSON.stringify(id)},${JSON.stringify(sub)}),r=rng(hashStr('umayyad:byzantine:${op}:${id}:'+t+':spy'));if(r()<v.p&&r()>=v.disc){Game.S.turn=t;break;}}`);
 const out=read(`Game.spyOp('umayyad','byzantine','${op}',${JSON.stringify(id)},${JSON.stringify(sub)})`);assert.equal(out.ok,true,JSON.stringify(out));return out;
}
test('assessment explains approximate chances, concrete costs, consequences and cooldowns',()=>{
 const p=read("Game.spyAssessment('umayyad','byzantine','incite','nicaea')");assert.equal(p.cost,130);assert.match(p.success,/٪/);assert.match(p.discovery,/٪/);assert.ok(p.parts.length>=3);assert.match(p.consequence,/−20/);assert.match(p.cooldown,/الحفظ/);
});
test('same-turn operations and post-detection recovery reject without charging again',()=>{
 const a=read("Game.spyOp('umayyad','byzantine','incite','nicaea')");assert.equal(a.found,true);const gold=run("Game.f('umayyad').gold");assert.ok(read("Game.spyOp('umayyad','byzantine','scout','byzantine')").err);assert.equal(run("Game.f('umayyad').gold"),gold);
 run('Game.S.turn++');assert.ok(run("Game.canSpyOp('umayyad','byzantine','scout')"));run('Game.S.turn+=2');assert.equal(run("Game.canSpyOp('umayyad','byzantine','scout')"),null);
});
test('save/reload cannot change outcome or reset operation cooldown and ledger charge',()=>{
 run("Game.save('slot1')");const a=read("Game.spyOp('umayyad','byzantine','incite','nicaea')"),gold=run("Game.f('umayyad').gold");run("Game.load('slot1')");const b=read("Game.spyOp('umayyad','byzantine','incite','nicaea')");assert.deepEqual([a.ok,a.found],[b.ok,b.found]);assert.equal(run("Game.f('umayyad').gold"),gold);
 run("Game.save('slot2');Game.load('slot2')");assert.ok(read("Game.spyAssessment('umayyad','byzantine','incite','nicaea')").err);assert.equal(run("Game.financeView('umayyad').entries.filter(x=>x.kind==='espionage').length"),1);
});
test('realm intelligence uses one deterministic draw regardless of an omitted target ID',()=>{
 run("Game.save('slot1')");const a=read("Game.spyOp('umayyad','byzantine','scout')");run("Game.load('slot1')");const b=read("Game.spyOp('umayyad','byzantine','scout','arbitrary')");assert.deepEqual([a.ok,a.found],[b.ok,b.found]);
});
test('incitement weakens loyalty, actual tax and reinforcement/recruitment for exact duration',()=>{
 run("Object.assign(Game.node('nicaea'),{loyalty:40,unrest:0,walls:0})");const before=read("{loyalty:Game.node('nicaea').loyalty,tax:Game.incomeSteps(Game.node('nicaea')).tax,cost:Game.localRecruitCost('spear',false,Game.node('nicaea'))}");
 success('incite','nicaea');const n=read("Game.node('nicaea')");assert.ok(n.loyalty<before.loyalty);assert.ok(n.loyalty>=before.loyalty-23);assert.equal(n.unrest,2);assert.ok(run("Game.incomeSteps(Game.node('nicaea')).tax")<before.tax);assert.ok(run("Game.localRecruitCost('spear',false,Game.node('nicaea'))")>before.cost);assert.equal(n.noRecruit-run('Game.S.turn')+1,3);assert.equal(n.incited-run('Game.S.turn')+1,4);
 run('Game.S.turn+=3');assert.equal(run("Game.recruitmentConditions(Game.node('nicaea')).disrupted"),false);assert.equal(read("Game.spyEffects(Game.node('nicaea'))").filter(x=>x.key==='taxRefuse').length,0);
});
test('loyal stable cities are harder to incite than restive cities',()=>{
 const vals=[];for(const loyalty of [20,50,90]){run(`Game.node('nicaea').loyalty=${loyalty}`);vals.push(run("Game.spyAssess('umayyad','byzantine','incite','nicaea').p"));}assert.ok(vals[0]>vals[1]);assert.ok(vals[1]>vals[2]);sims.loyaltySuccess=vals;
});
test('security and intelligence investment are finite, meaningful, charged once and saved',()=>{
 const n='nicaea';run("Game.f('byzantine').gold=5000");const before=run("Game.citySecurity(Game.node('nicaea')).v");assert.equal(run("Game.secureCity(Game.node('nicaea'),'byzantine')"),null);assert.ok(run("Game.citySecurity(Game.node('nicaea')).v")>before);const gold=run("Game.f('byzantine').gold");assert.ok(run("Game.secureCity(Game.node('nicaea'),'byzantine')"));assert.equal(run("Game.f('byzantine').gold"),gold);
 const p=run("Game.spyAssess('umayyad','byzantine','scout','byzantine').p");assert.ok(p>=.1);assert.equal(run("Game.fundIntelligence('umayyad')"),null);assert.ok(run("Game.spyAssess('umayyad','byzantine','scout','byzantine').p")>p);assert.ok(run("Game.fundIntelligence('umayyad')"));assert.equal(run("Game.financeView('umayyad').entries.filter(x=>x.label==='تمويل الرسل والمخبرين').length"),1);
 run("Game.save('slot1');Game.load('slot1')");assert.equal(run("Game.intelligencePreview('umayyad').left"),6);assert.ok(run("Game.securityPreview(Game.node('nicaea'),'byzantine').err"));
});
test('road sabotage changes movement without changing road data, then recovers',()=>{
 run("Object.assign(Game.node('nicaea'),{roads:1});Object.assign(Game.node('amorium'),{roads:0});Game.armiesOf('byzantine')[0].node='nicaea'");
 const before=run("Game.edgeCost(Game.armiesOf('byzantine')[0],Game.node('nicaea'),Game.node('amorium'),'road')");success('sabotage','nicaea','roads');const after=run("Game.edgeCost(Game.armiesOf('byzantine')[0],Game.node('nicaea'),Game.node('amorium'),'road')");assert.equal(after,before+1);assert.equal(run("Game.node('nicaea').roads"),1);assert.equal(run("Game.node('nicaea').caravanStop-Game.S.turn+1"),2);
 run('Game.S.turn+=3');assert.equal(run("Game.edgeCost(Game.armiesOf('byzantine')[0],Game.node('nicaea'),Game.node('amorium'),'road')"),before);
});
test('each sabotage has live consequences and the stated inclusive duration',()=>{
 for(const [sub,key]of [['market','marketOff'],['walls','wallDmg'],['reinforce','noRecruit'],['caravan','caravanStop']]){fresh();run("Object.assign(Game.node('nicaea'),{market:2,walls:2})");success('sabotage','nicaea',sub);assert.equal(run(`Game.node('nicaea').${key}-Game.S.turn+1`),3);if(sub==='market')assert.equal(run("Game.incomeSteps(Game.node('nicaea')).market"),0);if(sub==='walls')assert.equal(run("Game.effWalls(Game.node('nicaea'))"),1);}
});
test('siege-equipment sabotage affects only targeted camp and is persisted/repaired',()=>{
 run("Object.assign(Game.armiesOf('byzantine')[0],{node:'damascus',siege:{turns:3}})");const id=run("Game.armiesOf('byzantine')[0].id");assert.equal(run("Game.siegeEquip(Game.node('damascus'),'byzantine').tower"),true);success('siegeworks',id);assert.equal(run("Game.siegeEquip(Game.node('damascus'),'byzantine').tower"),false);assert.equal(run("Game.financeView('umayyad').entries.filter(x=>x.kind==='espionage').length"),1);
 run("Game.save('slot1');Game.load('slot1')");assert.equal(run("Game.siegeEquip(Game.node('damascus'),'byzantine').tower"),false);run('Game.S.turn+=2');assert.equal(run("Game.siegeEquip(Game.node('damascus'),'byzantine').tower"),true);
});
test('another intact allied camp keeps its own siege equipment',()=>{
 run("const a=Game.armiesOf('byzantine')[0],b=Game.armiesOf('byzantine')[1];Object.assign(a,{node:'damascus',siege:{turns:3},siegeDisruptedUntil:2});Object.assign(b,{node:'damascus',siege:{turns:3}})");assert.equal(run("Game.siegeEquip(Game.node('damascus'),'byzantine').tower"),true);
 run("Game.armiesOf('byzantine')[1].siege.turns=0");assert.equal(run("Game.siegeEquip(Game.node('damascus'),'byzantine').tower"),false);
});
test('invalid targets and ineffective sabotage are refused before charging',()=>{
 const gold=run("Game.f('umayyad').gold");for(const expr of ["Game.spyOp('umayyad','byzantine','sabotage','damascus','market')","Game.spyOp('umayyad','byzantine','sabotage','nicaea','roads')","Game.spyOp('umayyad','byzantine','siegeworks',-50)","Game.spyOp('umayyad','byzantine','sabotage','nicaea','bad')"])assert.ok(read(expr).err);assert.equal(run("Game.f('umayyad').gold"),gold);
});
test('old-save migration preserves histories, derives cooldowns and is idempotent',()=>{
 run("Game.f('umayyad').spyHistory=[{turn:0,target:'nicaea',op:'incite',ok:false}];delete Game.f('umayyad').spyTargetWait;delete Game.f('umayyad').spyRecovery;Game.normalizeState()");assert.ok(run("Game.spyCooldown('umayyad','byzantine','incite','nicaea')"));const before=read("Game.f('umayyad').spyTargetWait");run('Game.normalizeState()');assert.deepEqual(read("Game.f('umayyad').spyTargetWait"),before);
});
test('repeated espionage chooses contextual varied targets and does not fixate on Nicaea',()=>{
 const hist=[];for(let t=0;t<36;t++){run(`Game.S.turn=${t};Game.f('umayyad').gold=5000`);const out=read("Game.spyAI('umayyad','byzantine','incite')");if(out&&!out.err)hist.push(read("Game.f('umayyad').spyHistory.slice(-1)[0]"));}const ids=new Set(hist.map(h=>h.target));assert.ok(ids.size>=5);assert.ok(hist.filter(h=>h.target==='nicaea').length<hist.length/2);for(let i=1;i<hist.length;i++)if(hist[i].target===hist[i-1].target)assert.ok(hist[i].turn-hist[i-1].turn>=3);sims.repeatedIncitement={attempts:hist.length,uniqueTargets:ids.size,targets:[...ids],nicaea:hist.filter(h=>h.target==='nicaea').length};
});
test('strategic siege and unrest changes alter priorities',()=>{
 run("Game.f('umayyad').goals={target:'nicaea'};Object.assign(Game.node('nicaea'),{loyalty:15,unrest:4,walls:0});Game.f('umayyad').net={byzantine:3}");const a=read("Game.spyTargets('umayyad','byzantine','incite')");assert.equal(a[0].id,'nicaea');sims.unrestTarget=a[0].id;
});
assert.deepEqual(c.errors,[]);
const out=path.join(__dirname,'../artifacts/politics');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'spy-results.json'),JSON.stringify({checks:checks.length,passed:checks,simulations:sims},null,2));console.log(`${checks.length} espionage groups passed`);
