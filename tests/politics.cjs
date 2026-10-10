'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createContext}=require('./harness.cjs');const c=createContext(661),checks=[];
const run=s=>c.run('{'+s+'}'),read=s=>JSON.parse(run('JSON.stringify('+s+')'));
const fresh=()=>run("Game.newGame('umayyad','umayyad','normal');Game.f('umayyad').gold=4000;Game.f('byzantine').gold=4000;Game.politicalState();Game.spoilsTo=null");
function test(name,fn){fresh();fn();assert.deepEqual(c.errors,[]);checks.push(name);console.log('PASS '+name);}
const cashTerms="{payer:'umayyad',gold:200,perTurn:0,turns:0,truce:8,captives:[]}";
test('money offers change willingness monotonically, with contextual reasons',()=>{
 const ps=[0,100,200,400,800].map(g=>run(`Game.peaceChance('byzantine','umayyad',{payer:'umayyad',gold:${g}}).p`));for(let i=1;i<ps.length;i++)assert.ok(ps[i]>ps[i-1]);assert.ok(read("Game.peaceChance('byzantine','umayyad',{}).urge.parts").length>=3);
 const before=run("Game.peaceChance('byzantine','umayyad',{}).p");run("Game.f('byzantine').gold=0;Game.f('byzantine').warTurns.umayyad=16;Game.armiesOf('byzantine').forEach(a=>a.ready={fat:85,mor:25,sup:20,coh:30,ammo:10})");assert.ok(run("Game.peaceChance('byzantine','umayyad',{}).p")>before);
});
test('invalid money, missing payer, excessive tribute and stale prisoners cannot negotiate',()=>{
 for(const terms of ["{gold:100}","{payer:'umayyad',gold:-1}","{payer:'umayyad',gold:1.5}","{payer:'umayyad',gold:NaN}","{payer:'umayyad',gold:5000}","{payer:'umayyad',perTurn:9999,turns:6}","{truce:30}","{captives:['missing']}"])assert.ok(run(`Game.proposePeaceTerms('umayyad','byzantine',${terms}).err`));assert.equal(run("Game.envoyWait('umayyad','byzantine')"),0);
});
test('rejection consumes one envoy, persists and cannot be rerolled by changing offers',()=>{
 run("Game.f('byzantine').warTurns.umayyad=0;globalThis.rejection=Game.proposePeaceTerms('umayyad','byzantine',{payer:'byzantine',gold:4000})");assert.equal(run('rejection.ok'),false);assert.equal(run("Game.envoyWait('umayyad','byzantine')"),1);run("Game.save('3')");for(let i=0;i<3;i++){run("Game.load('3')");assert.ok(run(`Game.proposePeaceTerms('umayyad','byzantine',${cashTerms}).err`));}
 run('Game.S.turn++');assert.equal(run("Game.envoyWait('umayyad','byzantine')"),0);
});
test('pending counter survives reload and applies exactly once with reconciled money',()=>{
 run("globalThis.counter=Game.peaceCounter('umayyad','byzantine');Game.save('3')");assert.ok(run('!!counter?.id'));const p=read('counter'),a=run("Game.f('umayyad').gold"),b=run("Game.f('byzantine').gold");run("Game.load('3')");assert.ok(run(`Game.acceptCounter('umayyad','byzantine',${JSON.stringify(p)}).ok`));assert.equal(run("Game.atWar('umayyad','byzantine')"),false);
 const delta=p.payer==='umayyad'?-p.gold:p.payer==='byzantine'?p.gold:0;assert.equal(run("Game.f('umayyad').gold"),a+delta);assert.equal(run("Game.f('byzantine').gold"),b-delta);const state=run('JSON.stringify(Game.S)');assert.ok(run(`Game.acceptCounter('umayyad','byzantine',${JSON.stringify(p)}).err`));assert.equal(run('JSON.stringify(Game.S)'),state);
});
test('counter cannot be accepted after peace, expiry, a new war or edited terms',()=>{
 for(const change of ["Game.makePeace('umayyad','byzantine',8)",'Game.S.turn++',"Game.makePeace('umayyad','byzantine',8);Game.S.turn++;Game.declareWar('umayyad','byzantine')","Game.makePeace('umayyad','byzantine',8);Game.declareWar('umayyad','byzantine')"]){fresh();const t=read("Game.peaceCounter('umayyad','byzantine')");run(change);const gold=run("Game.f('umayyad').gold");assert.ok(run(`Game.acceptCounter('umayyad','byzantine',${JSON.stringify(t)}).err`));assert.equal(run("Game.f('umayyad').gold"),gold);}
 fresh();const t=read("Game.peaceCounter('umayyad','byzantine')");t.gold=0;assert.ok(run(`Game.acceptCounter('umayyad','byzantine',${JSON.stringify(t)}).err`));
});
test('peace terms apply money, captives, city, truce and memory through actual campaign APIs',()=>{
 const g=run("Game.gensOf('byzantine').find(g=>!Game.isRuler(g)).id");run(`Game.gen('${g}').status='captive';Game.gen('${g}').captor='umayyad';Game.settlePeace('umayyad','byzantine',{payer:'umayyad',gold:200,perTurn:20,turns:6,truce:12,city:'amorium',captives:['${g}']})`);
 assert.equal(run("Game.node('amorium').owner"),'umayyad');assert.equal(run(`Game.gen('${g}').status`),'pool');assert.equal(run("Game.f('umayyad').truce.byzantine"),12);assert.ok(run("Game.diplomaticMemory('byzantine','umayyad').entries.length")>0);assert.equal(run('Game.S.tributes.length'),1);assert.equal(run("Game.financeState('umayyad').entries.filter(e=>e.label==='تسوية الصلح').reduce((s,e)=>s+e.amount,0)"),-200);
});
test('peace settlement itself rejects duplicate execution, even without a counter id',()=>{
 assert.ok(run(`Game.settlePeace('umayyad','byzantine',${cashTerms}).ok`));const gold=run("Game.f('byzantine').gold"),rel=run("Game.rel('byzantine','umayyad')");assert.ok(run(`Game.settlePeace('umayyad','byzantine',${cashTerms}).err`));assert.equal(run("Game.f('byzantine').gold"),gold);assert.equal(run("Game.rel('byzantine','umayyad')"),rel);
});
test('counter respects current city ownership and excludes impossible final-city concessions',()=>{
 const t=read("Game.peaceCounter('umayyad','byzantine',{city:'amorium'})");assert.ok(t);run("Game.node('amorium').owner='umayyad'");assert.ok(run(`Game.acceptCounter('umayyad','byzantine',${JSON.stringify(t)}).err`));run("Game.nodesOf('khazar').filter(n=>n.id!=='samandar').forEach(n=>n.owner='neutral')");assert.ok(run("Game.validatePeaceTerms('umayyad','khazar',{city:'samandar'})"));
});
test('treaty actions cannot renew truces or farm relations by repeated calls',()=>{
 run("Game.makePeace('umayyad','byzantine',8);Game.makeAlliance('umayyad','byzantine')");const rel=run("Game.rel('umayyad','byzantine')");run('Game.S.turn++;Game.f("umayyad").truce.byzantine=9;Game.f("byzantine").truce.umayyad=9');assert.ok(run("Game.makeAlliance('umayyad','byzantine').err"));assert.equal(run("Game.rel('umayyad','byzantine')"),rel);assert.equal(run("Game.f('umayyad').truce.byzantine"),9);
 run("Game.breakAlliance('umayyad','byzantine')");assert.ok(run("Game.makeAlliance('umayyad','byzantine').err"));
});
test('trade toggling, marriage and gifts have bounded persistent effects',()=>{
 run("Game.makePeace('umayyad','byzantine',8);Game.setTrade('umayyad','byzantine',true)");const rel=run("Game.rel('umayyad','byzantine')");assert.ok(run("Game.setTrade('umayyad','byzantine',true).err"));assert.ok(run("Game.setTrade('umayyad','byzantine',false).err"));assert.equal(run("Game.rel('umayyad','byzantine')"),rel);
 run("Game.marry('umayyad','byzantine');Game.giveDiplomaticGift('umayyad','byzantine');Game.save('3')");const gold=run("Game.f('umayyad').gold");run("Game.load('3')");assert.ok(run("Game.marry('umayyad','byzantine').err"));assert.ok(run("Game.giveDiplomaticGift('umayyad','byzantine').err"));assert.equal(run("Game.f('umayyad').gold"),gold);
});
test('one diplomatic proposal interval applies across types and survives reload',()=>{
 run("Game.makePeace('umayyad','byzantine',8);Game.requestDiplomacy('umayyad','byzantine','alliance');Game.save('3');Game.load('3')");assert.ok(run("Game.requestDiplomacy('umayyad','byzantine','marriage').err"));assert.equal(run("Game.diplomaticWait('umayyad','byzantine')"),3);
});
test('memory deduplicates keys, caps repetition, decays and affects diplomacy',()=>{
 const before=run("Game.politicalAssessment('byzantine','umayyad','alliance').p");for(let i=0;i<50;i++)run(`Game.rememberDiplomacy('byzantine','umayyad','betrayal',-20,'نقض العهد','test:${i}')`);const score=run("Game.diplomaticMemory('byzantine','umayyad').score");assert.equal(score,-35);assert.ok(run("Game.politicalAssessment('byzantine','umayyad','alliance').p")<=before);assert.equal(run("Game.rememberDiplomacy('byzantine','umayyad','betrayal',-20,'نقض','test:0')"),false);run('Game.S.turn+=120');assert.ok(Math.abs(run("Game.diplomaticMemory('byzantine','umayyad').score"))<35);
});
test('personalities affect war and trade without bypassing unsafe conditions',()=>{
 run("Game.makePeace('umayyad','byzantine',4);Game.f('umayyad').truce.byzantine=0;Game.f('byzantine').truce.umayyad=0;Game.f('umayyad').goals={owner:'byzantine',target:'amorium'};Game.f('umayyad').politicalTraits=['expansionist','opportunistic']");const war=run("Game.politicalAssessment('umayyad','byzantine','war').p");run("Game.f('umayyad').politicalTraits=['cautious','commercial']");assert.ok(run("Game.politicalAssessment('umayyad','byzantine','war').p")<war);const trade=run("Game.politicalAssessment('umayyad','byzantine','trade').p");run("Game.f('umayyad').politicalTraits=['proud','treacherous']");assert.ok(run("Game.politicalAssessment('umayyad','byzantine','trade').p")<trade);run("Game.f('umayyad').truce.byzantine=1");assert.equal(run("Game.politicalAssessment('umayyad','byzantine','war').p"),0);
});
test('threatened vassal considers survival, allies, distance and exhaustion',()=>{
 const before=run("Game.vassalAssessment('byzantine','umayyad').p");run("Game.armiesOf('byzantine').forEach(a=>{a.regs.forEach(r=>r.men=Math.max(1,Math.floor(r.men*.2)));a.ready={fat:85,mor:15,coh:20,sup:10,ammo:5}});Game.f('byzantine').lostRecently=3;Game.warRec('byzantine','umayyad',true).st.byzantine.lost=1500");assert.ok(run("Game.vassalAssessment('byzantine','umayyad').p")>before);assert.ok(run("Game.vassalAssessment('byzantine','umayyad').parts.length")>=8);
});
test('vassalage preserves autonomy, pays once, forbids chains and independent wars',()=>{
 run("Game.makeVassal('khazar','umayyad')");assert.equal(run("Game.f('khazar').overlord"),'umayyad');assert.equal(run("Game.economy('khazar').exp.vassal"),run("Game.economy('umayyad').inc.vassal"));const gold=run("Game.f('khazar').gold");run('Game.vassalTick();Game.vassalTick()');assert.equal(run("Game.f('khazar').gold"),gold);assert.equal(run("Game.atWar('khazar','byzantine')"),true);assert.ok(run("Game.declareWar('khazar','byzantine').err"));assert.ok(run("Game.makeVassal('umayyad','byzantine').err"));assert.ok(run("Game.makeAlliance('khazar','byzantine').err"));assert.ok(run("Game.addTribute('khazar','umayyad',20,8).err"));
});
test('tribute is not renewed, not immediately collected and ledger collection is idempotent',()=>{
 run("Game.makePeace('umayyad','byzantine',8);Game.addTribute('byzantine','umayyad',20,6)");const gold=run("Game.f('byzantine').gold");assert.ok(run("Game.addTribute('byzantine','umayyad',20,8).err"));assert.equal(run("Game.f('byzantine').gold"),gold);assert.equal(run('Game.S.tributes[0].turns'),6);run("Game.settleEconomy('byzantine',Game.economy('byzantine'));Game.save('3')");const after=run("Game.f('byzantine').gold");run("Game.load('3');Game.settleEconomy('byzantine',Game.economy('byzantine'))");assert.equal(run("Game.f('byzantine').gold"),after);
});
test('many allies share a bounded actual peace payment and cannot collect it twice',()=>{
 run("const cities=['merida','sevilla','zaragoza','toledo'];for(const city of cities){const id=Game.spawnFaction({key:'test',name:city,color:'#887744',gold:200});Game.node(city).owner=id;Game.makeAlliance('umayyad',id);Game.setStatus(id,'byzantine','war',0);Game.warRec(id,'byzantine',true).st[id].kills=300;}Game.warRec('umayyad','byzantine',true).st.umayyad.kills=300;Game.settlePeace('umayyad','byzantine',{payer:'byzantine',gold:600,truce:8})");
 const pool=read('Object.values(Game.S.alliedSettlements).flatMap(x=>x.spoils)');assert.equal(pool.length,4);assert.ok(pool.reduce((s,x)=>s+x.cut,0)<=360);const gold=run("Game.f('umayyad').gold");run('for(let i=0;i<8;i++)Game.shareSpoils(true)');assert.equal(run("Game.f('umayyad').gold"),gold-pool.reduce((s,x)=>s+x.cut,0));run('Game.save("3");Game.load("3");Game.shareSpoils(true)');assert.equal(run("Game.f('umayyad').gold"),gold-pool.reduce((s,x)=>s+x.cut,0));
});
test('incoming offer survives reload and cannot execute twice or after context changes',()=>{
 const o=read("Game.registerPoliticalOffer('byzantine','umayyad','peace',{payer:'byzantine',gold:100,truce:8})");run("Game.save('3');Game.load('3')");assert.ok(run(`Game.resolvePoliticalOffer('${o.id}',true).ok`));const gold=run("Game.f('umayyad').gold");assert.ok(run(`Game.resolvePoliticalOffer('${o.id}',true).err`));assert.equal(run("Game.f('umayyad').gold"),gold);
 fresh();const x=read("Game.registerPoliticalOffer('byzantine','umayyad','peace',{payer:'byzantine',gold:100})");run('Game.S.turn+=2');assert.ok(run(`Game.resolvePoliticalOffer('${x.id}',true).err`));
});
test('surrender rejection expires instead of permanently disabling negotiations',()=>{
 run("Game.armiesOf('umayyad')[0].node='amorium';Game.armiesOf('umayyad')[0].siege={turns:0,from:'tarsus'};Game.node('amorium').stores=9;Game.node('amorium').walls=4;Game.f('umayyad').rep=0");const r=read("Game.demandSurrender(Game.node('amorium'),'umayyad')");assert.equal(r.ok,false);assert.ok(run("Game.canDemandSurrender(Game.node('amorium'),'umayyad')"));run("Game.save('3');Game.load('3')");assert.ok(run("Game.canDemandSurrender(Game.node('amorium'),'umayyad')"));run('Game.S.turn+=2');assert.equal(run("Game.canDemandSurrender(Game.node('amorium'),'umayyad')"),null);
 const before=run("Game.surrenderOdds(Game.node('amorium'),'umayyad').p");run("Game.node('amorium').stores=-1;Game.armiesOf('umayyad')[0].siege.turns=6;Game.node('amorium').ready={fat:90,ammo:0};Game.f('umayyad').rep=90");assert.ok(run("Game.surrenderOdds(Game.node('amorium'),'umayyad').p")>before);
});
test('surrender and contribution previews never mutate campaign state',()=>{
 run("Game.armiesOf('umayyad')[0].node='amorium';Game.armiesOf('umayyad')[0].siege={turns:2,from:'tarsus'}");const before=run('JSON.stringify(Game.S)');for(let i=0;i<4;i++)run("Game.surrenderOdds(Game.node('amorium'),'umayyad')");assert.equal(run('JSON.stringify(Game.S)'),before);
});
test('broken and kept treaties produce different persistent memories',()=>{
 run("Game.makePeace('umayyad','byzantine',4);Game.declareWar('umayyad','byzantine');Game.S.turn=6;Game.endRound()");assert.ok(read("Game.diplomaticMemory('byzantine','umayyad').entries").some(e=>e.kind==='betrayal'));assert.ok(!read("Game.diplomaticMemory('byzantine','umayyad').entries").some(e=>e.kind==='kept'));
 fresh();run("Game.makePeace('umayyad','byzantine',4);Game.S.turn=3;Game.endRound();Game.save('3');Game.load('3')");assert.ok(read("Game.diplomaticMemory('byzantine','umayyad').entries").some(e=>e.kind==='kept'));
});
test('political save roundtrip retains offers, counters, terms, memory, spy effects and war effort',()=>{
 run("Game.peaceCounter('umayyad','byzantine');Game.registerPoliticalOffer('byzantine','umayyad','peace',{});Game.rememberDiplomacy('umayyad','byzantine','kept',8,'وفى بعهد','manual');Game.node('amorium').marketOff=4;Game.f('umayyad').spyTargetWait={'byzantine:amorium':3};Game.alliedContribution('byzantine','umayyad');Game.save('3')");const before=read("({politics:Game.S.politics,war:Game.S.wars,wait:Game.f('umayyad').spyTargetWait,effect:Game.node('amorium').marketOff})");run("Game.load('3');Game.save('3');Game.load('3')");assert.deepEqual(read("({politics:Game.S.politics,war:Game.S.wars,wait:Game.f('umayyad').spyTargetWait,effect:Game.node('amorium').marketOff})"),before);
});
test('legacy cooldown and tribute migration is idempotent without adding empty node fields',()=>{
 run("delete Game.S.politics;Game.S.tributes=[{payer:'umayyad',payee:'byzantine',amount:20,t:3}];Game.node('amorium').demanded=true;Game.armiesOf('umayyad')[0].node='amorium';Game.armiesOf('umayyad')[0].siege={turns:0};Game.normalizeState()");assert.equal(run('Game.S.tributes[0].turns'),3);assert.ok(run("Game.surrenderWait(Game.node('amorium'),'umayyad')")>0);const before=run('JSON.stringify(Game.S)');run('Game.normalizeState()');assert.equal(run('JSON.stringify(Game.S)'),before);
});
fs.mkdirSync(path.resolve(__dirname,'../artifacts/politics'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../artifacts/politics/logic-results.json'),JSON.stringify({passed:checks.length,checks},null,2));console.log(checks.length+' political logic groups passed');
