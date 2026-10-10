const assert=require('node:assert/strict');
const {createContext}=require('./harness.cjs');
const tests=[];function test(name,fn){tests.push([name,fn]);}
function world(s='umayyad',p='umayyad'){const c=createContext(11);c.run(`Game.newGame('${s}','${p}','normal')`);return {c,G:c.run('Game'),P:p};}
function opOf(w){return w.G.oppsOf(w.P)[0];}
function seedFor(w,candidate,predicate){for(let n=1;n<20000;n++)if(predicate(w.c.run(`rng(${n})()`))){candidate.seed=n;return;}throw Error('seed');}
function hire(w,op=opOf(w),idx=0){const cand=op.cands[idx];seedFor(w,cand,r=>r<.5);return w.G.proposeContract(w.P,op.id,idx,Math.floor(w.G.candView(cand,w.P).demand.total*1.4),false);}
test('Six campaign starts: valid two-candidate opportunities, capacity and state',()=>{
 for(const [s,p]of [['umayyad','umayyad'],['umayyad','byzantine'],['umayyad','khazar'],['threeKingdoms','shu'],['threeKingdoms','wei'],['threeKingdoms','wu']]){
  const w=world(s,p),op=opOf(w);assert.equal(op.cands.length,2);assert.notEqual(op.cands[0].n,op.cands[1].n);assert.equal(w.G.draftOf(p),1);w.G.validate();assert.equal(w.c.errors.length,0);
 }
});
test('Earned keys including turn zero cannot grant twice; cooldown and bank cap',()=>{
 const w=world(),G=w.G;assert.equal(G.grantOpp(w.P,'start','start'),null);G.S.turn=4;assert.equal(G.grantOpp(w.P,'start','start'),null);assert.ok(G.grantOpp(w.P,'city','city:one'));G.S.turn=8;assert.equal(G.grantOpp(w.P,'city','city:two'),null);assert.equal(G.oppsOf(w.P).length,2);
});
test('One replacement per delegation, capped earned tokens, no repeated-city tokens',()=>{
 const w=world(),G=w.G,op=opOf(w),old=op.cands[0].n;G.addDraft(w.P,30,'فتح دمشق');assert.equal(G.draftOf(w.P),3);G.addDraft(w.P,1,'فتح دمشق');assert.equal(G.draftOf(w.P),3);assert.equal(G.replaceCand(w.P,op.id,0),null);assert.equal(G.draftOf(w.P),2);assert.ok(G.replaceCand(w.P,op.id,1));assert.ok(!op.cands.some(c=>c.n===old));assert.ok(G.leaderState(w.P).retiredNames.includes(old));
});
test('Contract hires exactly one, deducts one-turn advance and retires the other name',()=>{
 const w=world(),G=w.G,op=opOf(w),other=op.cands[1].n,n=Object.keys(G.S.gens).length,gold=G.f(w.P).gold,r=hire(w);assert.equal(r.ok,true);assert.equal(Object.keys(G.S.gens).length,n+1);assert.equal(G.f(w.P).gold,gold-r.g.wage);assert.equal(G.oppsOf(w.P).length,0);assert.ok(G.leaderState(w.P).retiredNames.includes(other));assert.equal(G.proposeContract(w.P,op.id,1,30,false).ok,undefined);assert.equal(G.genSalary(r.g),Math.ceil(r.g.wage*.5));
});
test('Invalid salaries, no funds and full capacity never create leaders or consume attempts',()=>{
 const w=world(),G=w.G,op=opOf(w),n=Object.keys(G.S.gens).length;
 for(const wage of [NaN,Infinity,-1,0,2.5,100000])assert.ok(G.proposeContract(w.P,op.id,0,wage,false).err);
 const ask=G.candView(op.cands[0],w.P).demand.total;G.f(w.P).gold=0;assert.ok(G.proposeContract(w.P,op.id,0,ask,false).err);G.f(w.P).gold=9999;
 const room=G.cmdRoom;G.cmdRoom=()=>0;assert.ok(G.proposeContract(w.P,op.id,0,ask,false).err);G.cmdRoom=room;assert.equal(Object.keys(G.S.gens).length,n);assert.equal(op.tries[0],undefined);
});
test('Salary acceptance rises with offer, prestige and personality change expectations',()=>{
 const w=world(),G=w.G,c=opOf(w).cands[0],d=G.candView(c,w.P).demand.total;let previous=0;
 for(let salary=1;salary<=d*1.5;salary++){const p=G.offerReaction(c,w.P,salary,false).probability;assert.ok(p>=previous);previous=p;}
 const g={name:'local',fid:w.P,trait:'defender',lead:2,fame:0,xp:0};const low=G.wageDemand(g).total;g.fame=75;assert.ok(G.wageDemand(g).total>low);const famous=G.wageDemand(g).total;g.flaw='greedy';assert.ok(G.wageDemand(g).total>famous);
});
test('Insult ends negotiation, two ordinary refusals exhaust attempts, fixed saved threshold',()=>{
 let w=world(),G=w.G,op=opOf(w),d=G.candView(op.cands[0],w.P).demand.total;let r=G.proposeContract(w.P,op.id,0,Math.floor(d*.6),false);assert.equal(r.gone,true);assert.equal(op.cands[0],null);
 w=world();G=w.G;op=opOf(w);d=G.candView(op.cands[0],w.P).demand.total;seedFor(w,op.cands[0],r=>r>.85);G.save('slot1');const result=G.proposeContract(w.P,op.id,0,d,false);assert.equal(result.ok,false);assert.equal(result.gone,false);G.load('slot1');op=opOf(w);assert.equal(G.proposeContract(w.P,op.id,0,d,false).ok,false);assert.equal(G.proposeContract(w.P,op.id,0,d,false).gone,true);assert.equal(op.cands[0],null);
});
test('Pending offers freeze salary through treasury changes and save/load',()=>{
 const w=world(),G=w.G,op=opOf(w),s=JSON.stringify(op);G.save('slot1');G.f(w.P).gold=900000;assert.equal(JSON.stringify(op),s);G.load('slot1');assert.equal(JSON.stringify(opOf(w)),s);assert.equal(G.draftOf(w.P),1);
});
test('Old saves retain leader IDs, contracts, army references, XP and biography identity',()=>{
 const w=world(),G=w.G,g=G.gensOf(w.P).find(g=>g.status==='army'),a=G.army(g.army);g.xp=37;g.wage=19;const id=g.id,aid=a.id;delete G.S.leaders;for(const x of Object.values(G.S.gens)){delete x.bond;delete x.growth;delete x.dialogue;delete x.relationships;delete x.leaderFlags;}G.S.draft[w.P]=99;const op=opOf(w);delete op.expires;delete op.rerolls;delete op.tries;G.save('slot1');G.load('slot1');const migrated=G.gen(id);assert.equal(migrated.xp,37);assert.equal(migrated.wage,19);assert.equal(G.army(aid).gen,id);assert.equal(migrated.army,aid);assert.ok(migrated.bond);assert.equal(G.draftOf(w.P),3);assert.ok(opOf(w).expires);const saved=JSON.stringify(G.S.leaders);G.normalizeState();assert.equal(JSON.stringify(G.S.leaders),saved);
});
test('Legacy invalid candidates and duplicate offers are migrated safely',()=>{
 const w=world(),G=w.G,op=opOf(w);op.cands[0]={n:'not a catalog leader',cat:true};G.S.opps[w.P].push({...JSON.parse(JSON.stringify(op)),id:'duplicate'});G.normalizeState();assert.equal(opOf(w).cands[0],null);assert.equal(G.oppsOf(w.P).length,1);assert.ok(G.leaderAvailable(null,w.P)===false);
});
test('Historical candidate timing, affiliation, local fallback and spoiler-free copy',()=>{
 const w=world(),G=w.G;assert.ok(!G.leaderAvailable(G.catFind('بارجيك'),w.P));assert.ok(!G.leaderAvailable(G.catFind('عبد الله البطال'),w.P));assert.ok(G.catFind('عبد الله البطال').fame<45);
 const w2=world('umayyad','khazar');assert.ok(opOf(w2).cands.every(c=>!c.cat));assert.ok(opOf(w2).cands.every(c=>w2.G.candView(c,w2.P).fame===0));
 for(const entries of Object.values(w.c.run('CMD_CATALOG')))for(const e of entries.filter(e=>e.at!=='legacy'))assert.ok(!/ويكيبيديا|Wikipedia|سوف|لاحقاً|سيصبح|قُتل عام|مات سنة/i.test(e.bio),e.n);
});
test('Rerolls persist after load; dismissed hires do not refresh offers',()=>{
 const w=world(),G=w.G,op=opOf(w);G.replaceCand(w.P,op.id,0);G.save('slot1');G.load('slot1');assert.equal(opOf(w).rerolls,1);assert.ok(G.replaceCand(w.P,opOf(w).id,1));const r=hire(w);assert.ok(r.ok);assert.equal(G.retireGeneral(r.g),null);assert.equal(G.oppsOf(w.P).length,0);assert.equal(r.g.status,'retired');assert.ok(G.leaderState(w.P).retiredNames.includes(r.g.name));assert.ok(G.retireGeneral(G.rulerOf(w.P)));
});
test('Relationships materially change loyalty, honor cannot be bought repeatedly',()=>{
 const w=world(),G=w.G,g=G.gensOf(w.P).find(g=>!G.isRuler(g));const before=g.bond.trust;G.f(w.P).gold=10000;assert.equal(G.honorGeneral(w.P,g),null);assert.ok(g.bond.trust>before);const gold=G.f(w.P).gold,trust=g.bond.trust;assert.ok(G.honorGeneral(w.P,g));assert.equal(G.f(w.P).gold,gold);assert.equal(g.bond.trust,trust);
 const target=G.genLoyTarget(g);G.S.turn+=1;G.leaderEvent(g,'broken');assert.ok(g.bond.trust<trust);assert.ok(G.genLoyTarget(g)<target);
});
test('Assignment, rivalry, ignored requests and promises have distinct consequences',()=>{
 const w=world(),G=w.G,g=G.gensOf(w.P).find(g=>g.status==='pool'&&!G.isRuler(g));const n=G.nodesOf(w.P).find(n=>!G.governorAt(n));const trust=g.bond.trust;assert.equal(G.appointGovernor(g,n),null);assert.ok(g.bond.trust>trust);G.recallGovernor(g);g.ask={k:'command',turn:0,until:4};G.S.turn=5;G.commanderTick();assert.equal(g.ask,null);assert.ok(g.bond.resentment>0);const bond=JSON.stringify(g.bond);G.commanderTick();assert.equal(JSON.stringify(g.bond),bond);
 g.promise={k:'army',until:5};G.S.turn=6;G.commanderTick();assert.equal(g.promise,null);assert.ok(g.mem.some(m=>m.k==='broken'));
});
test('Capture, valid rescue, invalid rescue and repeated fate callbacks are safe',()=>{
 const w=world(),G=w.G,g=G.gensOf(w.P).find(g=>!G.isRuler(g));const before=g.bond.trust;G.setGenFate(g,'captured','byzantine');const count=g.rec.captured;G.setGenFate(g,'captured','byzantine');assert.equal(g.rec.captured,count);assert.ok(g.bond.trust<before);
 const snapshot=JSON.stringify([g,G.f(w.P).gold,G.f('byzantine').gold]);assert.ok(G.ransomCaptive(g,'khazar',1));assert.ok(G.ransomCaptive(g,'byzantine',-1));assert.equal(JSON.stringify([g,G.f(w.P).gold,G.f('byzantine').gold]),snapshot);G.f(w.P).gold=10000;const trust=g.bond.trust;G.ransomCaptive(g,'byzantine',150);assert.equal(g.status,'pool');assert.ok(g.bond.trust>trust);assert.ok(G.ransomCaptive(g,'byzantine',150));
});
test('Execution records a loss without generating a fictional replacement; invalid execution does nothing',()=>{
 const w=world('threeKingdoms','shu'),G=w.G,g=G.gensOf(w.P).find(x=>x.name==='قوان يو'),friend=G.gensOf(w.P).find(x=>x.name==='جانغ في'),n=Object.keys(G.S.gens).length;assert.ok(G.executeCaptive(g,'wei'));assert.equal(g.status,'army');G.setGenFate(g,'captured','wei');const trust=friend.bond.trust;G.executeCaptive(g,'wei');assert.equal(g.status,'dead');assert.equal(Object.keys(G.S.gens).length,n);assert.ok(friend.bond.trust<trust);assert.ok(G.S.leaders.memorials.some(m=>m.id===g.id));const memorials=G.S.leaders.memorials.length;assert.ok(G.executeCaptive(g,'wei'));assert.equal(G.S.leaders.memorials.length,memorials);
});
test('Defection produces a memorial and surviving friendship becomes rivalry',()=>{
 const w=world('threeKingdoms','shu'),G=w.G,g=G.gensOf(w.P).find(x=>x.name==='قوان يو'),friend=G.gensOf(w.P).find(x=>x.name==='جانغ في');g.fid='wei';G.S.turn=1;G.leaderTick();assert.ok(G.S.leaders.memorials.some(m=>m.id===g.id&&m.fid==='shu'&&m.fate==='betrayed'));assert.equal(friend.relationships[g.id].kind,'rival');
});
test('Specialized growth persists, grants mobility only to qualified leaders; officers stay modest',()=>{
 const w=world(),G=w.G,g=G.gensOf(w.P).find(g=>g.name==='مسلمة بن عبد الملك'),a=G.army(g.army);const trait=g.trait,mp=G.mpMax(a);G.gainXp(g,25);assert.equal(g.growth.level,1);assert.equal(g.trait,trait);assert.equal(G.mpMax(a),mp+1);G.gainXp(g,500);assert.equal(g.growth.level,2);assert.equal(G.mpMax(a),mp+1);const officer=G.officer(w.P);G.gainXp(officer,999);assert.equal(officer.rank,1);assert.equal(officer.xp,0);G.save('slot1');G.load('slot1');assert.equal(G.gen(g.id).growth.level,2);
});
test('Late-game treasury does not buy opportunities; repeated losses and recaptures cannot spam',()=>{
 const w=world(),G=w.G;G.f(w.P).gold=10000000;G.S.turn=300;G.commanderTick();assert.equal(G.oppsOf(w.P).length,0);
 for(let i=0;i<200;i++)G.grantOpp(w.P,'city','city:damascus');assert.equal(G.oppsOf(w.P).length,1);const op=opOf(w);assert.equal(op.cands.length,2);G.dropOpp(w.P,op.id);G.S.turn=304;assert.equal(G.grantOpp(w.P,'city','city:damascus'),null);
 let count=0;for(let i=0;i<15;i++){G.S.turn=312+i*8;const o=G.grantOpp(w.P,'loss','lost:'+i);if(o){count++;G.dropOpp(w.P,o.id);}}assert.ok(count<=2);assert.equal(G.leaderState(w.P).lossGrants,count);
});
test('End-round and world-tick integration stay runnable for both scenarios',async()=>{
 for(const [s,p]of [['umayyad','umayyad'],['threeKingdoms','shu']]){const w=world(s,p),G=w.G;for(let n=0;n<24;n++){G.endRound();await G.worldTick();}G.save('slot1');assert.ok(G.load('slot1'));assert.ok(G.oppsOf(p).length<=2);assert.ok(G.draftOf(p)<=3);assert.equal(w.c.errors.length,0,w.c.errors.join('\n'));for(const g of Object.values(G.S.gens)){assert.ok(Number.isFinite(g.bond.trust));assert.ok(Number.isFinite(G.wageDemand(g).total));}}
});

test('Context and personality change spoken reactions; city service and scars are recorded',()=>{
 const w=world(),G=w.G,gs=G.gensOf(w.P).filter(g=>!G.isRuler(g));
 const a=gs.find(g=>g.name==='مسلمة بن عبد الملك'),b=gs.find(g=>g.name==='العباس بن الوليد');G.leaderEvent(a,'victory');G.leaderEvent(b,'victory');assert.notEqual(a.dialogue.at(-1).text,b.dialogue.at(-1).text);
 const army=G.army(a.army),node=G.node(army.node);G.recordCapture(node,w.P,[army]);assert.equal(a.dialogue.at(-1).k,'city');assert.ok(a.rec.cities.includes(node.name));
 const enc={node:node.id,kind:'field',type:'battle'},side={attGens:[a],defGens:[b],attRegs:army.regs,defRegs:[],attArmies:[army],defArmies:[]};G.recordBattle(enc,{winner:1,fates:{},wounded:[a.id]},side);assert.equal(a.rec.losses,1);assert.equal(a.rec.wounds,1);assert.equal(a.dialogue.at(-1).k,'defeat');assert.ok(a.scars.length);
});
test('Historical rivals link when hired later and exert political pressure',()=>{
 const w=world('threeKingdoms','wu'),G=w.G,op=opOf(w);op.cands[0]={n:'لينغ تونغ',cat:true,seed:1};G.freezeCandidate(op.cands[0],w.P);const r=hire(w,op,0);assert.ok(r.ok);const gan=G.gensOf(w.P).find(g=>g.name==='غان نينغ');assert.equal(gan.relationships[r.g.id].kind,'rival');assert.equal(r.g.relationships[gan.id].kind,'rival');assert.ok(G.genLoyParts(r.g).some(([label,value])=>label==='منافس في المجلس'&&value<0));
});
test('Prestige adds social abilities and mentorship rather than only raw bonuses',()=>{
 const w=world('threeKingdoms','wei'),G=w.G,tutor=G.gensOf(w.P).find(g=>g.name==='تساو تساو'),pupil=G.gensOf(w.P).find(g=>g.name==='شياهو دون');
 tutor.status=pupil.status='pool';tutor.army=pupil.army=null;pupil.xp=-1;G.S.turn=4;G.leaderTick();assert.equal(pupil.xp,0);assert.ok(pupil.dialogue.some(d=>d.k==='lesson'));assert.equal(G.leaderPerks(tutor).length,3);G.leaderTick();assert.equal(pupil.xp,0);
 const w2=world('threeKingdoms','shu'),g=w2.G.gensOf('shu').find(g=>g.name==='قوان يو'),friend=w2.G.gensOf('shu').find(g=>g.name==='جانغ في'),trust=friend.bond.trust;w2.G.f('shu').gold=10000;w2.G.honorGeneral('shu',g);assert.ok(friend.bond.trust>trust);assert.equal(friend.dialogue.at(-1).k,'peerHonor');
});
test('Direct event deaths have consequences once; expired opportunities never reopen',()=>{
 const w=world('threeKingdoms','shu'),G=w.G,g=G.gensOf(w.P).find(g=>g.name==='قوان يو'),friend=G.gensOf(w.P).find(g=>g.name==='جانغ في'),trust=friend.bond.trust;g.status='dead';G.S.turn=1;G.leaderTick();assert.ok(friend.bond.trust<trust);assert.ok(G.S.leaders.memorials.some(m=>m.id===g.id));const rep=G.f(w.P).rep;G.S.turn=2;G.leaderTick();assert.equal(G.f(w.P).rep,rep);
 const w2=world(),op=opOf(w2);w2.G.S.turn=op.expires;assert.ok(w2.G.proposeContract(w2.P,op.id,0,20,false).err);w2.G.leaderTick();assert.equal(w2.G.oppsOf(w2.P).length,0);assert.ok(op.cands.every(c=>w2.G.leaderState(w2.P).retiredNames.includes(c.n)));
});
test('Geography and political context gate recruitment and salary expectations',()=>{
 const w=world(),G=w.G,e=G.catFind('طارق بن زياد');assert.ok(G.leaderAvailable(e,w.P));for(const n of G.nodesOf(w.P))if(['الأندلس','المغرب'].includes(n.region)||n.id==='damascus')n.owner='neutral';assert.ok(!G.leaderAvailable(e,w.P));
 const g=G.gensOf(w.P).find(g=>g.name==='الجراح الحكمي');G.setStatus(w.P,'byzantine','peace');G.setStatus(w.P,'khazar','peace');const peace=G.wageDemand(g).total;G.setStatus(w.P,'byzantine','war');G.setStatus(w.P,'khazar','war');assert.ok(G.wageDemand(g).total>peace);
});

test('A rest request requires a real idle friendly turn, not merely moving home',async()=>{
 const w=world(),G=w.G,g=G.gensOf(w.P).find(g=>g.name==='مسلمة بن عبد الملك'),a=G.army(g.army);a.siege=null;a.node='damascus';g.ask={k:'rest',turn:0,until:4};a.mp=0;
 G.endRound();await G.worldTick();assert.equal(g.ask?.k,'rest');a.mp=G.mpMax(a);G.endRound();await G.worldTick();assert.equal(g.ask,null);assert.ok(g.dialogue.some(d=>d.k==='rest'));
});

test('Starting armies use their intended historical leaders without stealing rulers',()=>{
 const w=world(),G=w.G;assert.equal(G.armyGen(G.S.armies.find(a=>a.node==='sevilla')).name,'عبد العزيز بن موسى');assert.equal(G.armyGen(G.S.armies.find(a=>a.node==='fustat')).name,'عبد الملك بن رفاعة');assert.equal(G.rulerOf('umayyad').status,'pool');assert.equal(G.rulerOf('byzantine').status,'pool');assert.ok(G.isOfficer(G.armyGen(G.S.armies.find(a=>a.node==='syracuse'))));assert.equal(G.armyGen(G.S.armies.find(a=>a.node==='balanjar')).name,'خاقان الخزر');
});

test('Campaign randomness is saved: new campaigns vary, reloads retain the same candidates',()=>{
 const a=createContext(1),b=createContext(2);a.run("Game.newGame('umayyad','umayyad','normal')");b.run("Game.newGame('umayyad','umayyad','normal')");assert.notEqual(a.run('Game.S.leaders.seed'),b.run('Game.S.leaders.seed'));const op=a.run("JSON.stringify(Game.oppsOf('umayyad'))");a.run("Game.save('slot1');Game.load('slot1')");assert.equal(a.run("JSON.stringify(Game.oppsOf('umayyad'))"),op);
});

test('Expanded starting empires retain viable leader loyalty and meaningful personal choices',()=>{
 const w=world(),G=w.G;assert.ok(G.nodesOf(w.P).length>30);
 for(const g of G.gensOf(w.P).filter(g=>!G.isRuler(g))){assert.ok(G.genLoyTarget(g)>=40,g.name);const burden=G.genLoyParts(g).find(([k])=>k.startsWith('اتساع المملكة'));assert.ok(burden[1]>=-12);}
 const g=G.gensOf(w.P).find(g=>g.name==='مسلمة بن عبد الملك'),before=G.genLoyTarget(g);G.leaderEvent(g,'broken');assert.ok(G.genLoyTarget(g)<before);
});
(async()=>{let failures=0;for(const [name,fn]of tests){try{await fn();console.log('PASS '+name);}catch(e){failures++;console.error('FAIL '+name+'\n'+e.stack);}}
console.log(`${tests.length-failures}/${tests.length} leader tests passed`);if(failures)process.exitCode=1;})().catch(e=>{console.error(e);process.exitCode=1;});
