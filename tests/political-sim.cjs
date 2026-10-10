'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {createContext}=require('./harness.cjs');
const c=createContext(991),run=s=>c.run('{'+s+'}'),read=s=>JSON.parse(run('JSON.stringify('+s+')'));
const output={method:'Seeded saved campaign randomness; actual political APIs and AI decision loop. Controlled diplomacy runs hold territorial ownership and army strength constant, advance real endRound, and exclude random world events. Full campaign samples separately execute military, recruitment, building and world hooks.',matrices:[],campaigns:[],integration:[]};
const fresh=seed=>run(`Game.newGame('umayyad','umayyad','normal');Game.S.leaders.seed=${seed};Game.aliveMajors().forEach(id=>{Game.f(id).isPlayer=false;Game.f(id).gold=4000;Game.f(id).food=300;});Game.S.over=null;Game.S.endless=true;Game.hooks={};Game.politicalState()`);
(async()=>{
 // Match everything except one contextual axis; compare estimates rather than arbitrary target percentages.
 const traits=['proud','pragmatic','expansionist','cautious','opportunistic','loyal','treacherous','commercial'];
 for(const trait of traits){fresh(7);run(`Game.f('umayyad').politicalTraits=['${trait}'];Game.makePeace('umayyad','byzantine',4);Game.f('umayyad').truce.byzantine=0;Game.f('byzantine').truce.umayyad=0;Game.f('umayyad').goals={owner:'byzantine',target:'amorium'};Game.S.turn=12;Game.setStatus('umayyad','khazar','peace',0)`);output.matrices.push({trait,war:read("Game.politicalAssessment('umayyad','byzantine','war')"),alliance:read("Game.politicalAssessment('umayyad','byzantine','alliance')"),trade:read("Game.politicalAssessment('umayyad','byzantine','trade')"),vassal:read("Game.vassalAssessment('umayyad','byzantine')")});}
 assert.ok(output.matrices.find(x=>x.trait==='expansionist').war.p>output.matrices.find(x=>x.trait==='cautious').war.p);
 assert.ok(output.matrices.find(x=>x.trait==='commercial').trade.p>output.matrices.find(x=>x.trait==='proud').trade.p);
 const setups={
  equalRivals:"Game.setStatus('umayyad','khazar','peace',0);Game.setStatus('byzantine','khazar','peace',0);Game.armiesOf('umayyad').forEach(a=>a.regs.forEach(r=>r.men=Math.round(r.men*.65)))",
  dominantVsWeak:"Game.armiesOf('byzantine').forEach(a=>a.regs.forEach(r=>r.men=Math.max(1,Math.round(r.men*.25))));Game.f('byzantine').lostRecently=3;Game.warRec('umayyad','byzantine',true).st.byzantine.lost=1200",
  twoFronts:"Game.f('umayyad').warTurns.byzantine=8;Game.f('umayyad').warTurns.khazar=8",
  commonEnemyAlliance:"Game.f('byzantine').rel.khazar=60;Game.f('khazar').rel.byzantine=60;Game.f('khazar').gold=1000",
  prolongedWar:"Game.f('umayyad').warTurns.byzantine=20;Game.f('byzantine').warTurns.umayyad=20;Game.warRec('umayyad','byzantine',true).st.umayyad.lost=900;Game.warRec('umayyad','byzantine',true).st.byzantine.lost=900",
  exhaustedPeace:"Game.armiesOf('umayyad').concat(Game.armiesOf('byzantine')).forEach(a=>a.ready={fat:85,mor:25,coh:30,sup:20,ammo:5});Game.f('byzantine').gold=50;Game.f('umayyad').gold=50;Game.f('umayyad').warTurns.byzantine=12;Game.f('byzantine').warTurns.umayyad=12",
  threatenedVassal:"Game.armiesOf('khazar').forEach(a=>a.regs.forEach(r=>r.men=Math.max(1,Math.round(r.men*.2))));Game.f('khazar').lostRecently=3;Game.warRec('umayyad','khazar',true).st.khazar.lost=800;Game.f('khazar').politicalTraits=['pragmatic','cautious']",
  limitedAlly:"Game.armiesOf('khazar').forEach(a=>a.regs.forEach(r=>r.men=2));Game.f('byzantine').rel.khazar=60;Game.f('khazar').rel.byzantine=60"
 };
 for(const [name,setup]of Object.entries(setups)){
  const samples=[];
  for(let seed=1;seed<=24;seed++){
   fresh(seed*65537);run(setup);let firstPeace=null,vassals=0,invalidOffers=0,warStarts=0,allianceBreaks=0;
   const beforeUrge=read("({u:Game.peaceUrge('umayyad','byzantine').v,b:Game.peaceUrge('byzantine','umayyad').v})");
   for(let turn=0;turn<36;turn++){
    const oldWars=read("Game.aliveMajors().flatMap(a=>Game.aliveMajors().filter(b=>a<b&&Game.atWar(a,b)).map(b=>[a,b]))");
    for(const fid of read('Game.aliveMajors()'))await run(`CampaignAI.diplomacy('${fid}')`);
    // Re-entering an AI phase, including after load, cannot repeat that turn's negotiations.
    const snap=run('JSON.stringify(Game.S.politics)');await run("CampaignAI.diplomacy('byzantine')");assert.equal(run('JSON.stringify(Game.S.politics)'),snap);
    await run('Game.vassalDemands()');
    for(const pair of read("Game.aliveMajors().flatMap(a=>Game.aliveMajors().filter(b=>a<b&&Game.atWar(a,b)).map(b=>[a,b]))"))if(!oldWars.some(x=>x.join('|')===pair.join('|')))warStarts++;
    if(firstPeace===null&&!run("Game.atWar('umayyad','byzantine')"))firstPeace=turn;
    for(const [a,b]of oldWars){const offer=read(`Game.aiPeaceOffer('${a}','${b}')`);if(run(`Game.validatePeaceTerms('${a}','${b}',${JSON.stringify(offer)})`))invalidOffers++;}
    run('Game.endRound();Game.vassalTick()');
    if(turn===12){run("Game.save('3');Game.load('3')");assert.ok(read('Game.aliveMajors().map(id=>Game.f(id).gold)').every(Number.isFinite));}
   }
   vassals=run('Game.aliveMajors().filter(id=>Game.f(id).overlord).length');allianceBreaks=read('Game.S.log').filter(e=>e.text?.startsWith('انتهى الحلف')).length;
   samples.push({seed,firstPeace,warStarts,vassals,allianceBreaks,invalidOffers,initialUrge:beforeUrge,stillAtWar:run("Game.atWar('umayyad','byzantine')"),memoryEntries:run('Object.values(Game.S.politics.memory).flatMap(x=>Object.values(x)).flat().length')});
  }
  assert.ok(samples.every(x=>x.invalidOffers===0),name+' generated impossible payment terms');
  const peaceSamples=samples.filter(x=>x.firstPeace!==null);const summary={name,samples:samples.length,turns:36,peaceReached:peaceSamples.length,medianFirstPeace:peaceSamples.length?peaceSamples.map(x=>x.firstPeace).sort((a,b)=>a-b)[Math.floor(peaceSamples.length/2)]:null,warStarts:samples.reduce((s,x)=>s+x.warStarts,0),endingVassals:samples.reduce((s,x)=>s+x.vassals,0),allianceBreaks:samples.reduce((s,x)=>s+x.allianceBreaks,0),stillAtWar:samples.filter(x=>x.stillAtWar).length,invalidOffers:0};output.campaigns.push({summary,samples});console.log('SIM '+JSON.stringify(summary));
 }
 // Additional spy scenario: real operations and effects over 30 turns.
 for(const name of ['repeatedEspionage','highUnrest']){
  fresh(421);if(name==='highUnrest')run("Game.nodesOf('byzantine').forEach(n=>{n.loyalty=n.id==='nicaea'?90:25;n.unrest=n.id==='nicaea'?0:3})");
  const operations=[];for(let t=0;t<30;t++){run("Game.f('umayyad').gold=5000");const r=read("Game.spyAI('umayyad','byzantine','incite')");if(r){const h=read("Game.f('umayyad').spyHistory.at(-1)");operations.push({...h,ok:r.ok,found:r.found});}run('Game.endRound()');}
  const distinct=new Set(operations.map(x=>x.target)).size;assert.ok(distinct>3);output.campaigns.push({summary:{name,turns:30,operations:operations.length,distinctTargets:distinct,nicaea:operations.filter(x=>x.target==='nicaea').length},operations});console.log('SIM '+name+' '+distinct+' distinct targets');
 }
 // Uncontrolled integrated gameplay samples: actual orders, casualties, cities and saved state.
 for(const scenario of ['umayyad','threeKingdoms'])for(let sample=1;sample<=3;sample++){
  run(`Game.newGame('${scenario}','${scenario==='umayyad'?'umayyad':'shu'}','normal');Game.S.leaders.seed=${sample*8171};Game.aliveMajors().forEach(id=>Game.f(id).isPlayer=false);Game.S.endless=true;Game.S.over=null;Game.hooks={}`);
  for(let t=0;t<12;t++){for(const fid of read('Game.aliveMajors()'))await run(`CampaignAI.turn('${fid}')`);run('Game.endRound()');await run('Game.worldTick()');run('Game.save("3");Game.load("3")');}
  const snapshot=read("({turn:Game.S.turn,alive:Game.aliveMajors(),wars:Object.values(Game.S.wars||{}).filter(w=>w.ended==null).length,battles:Object.values(Game.S.wars||{}).reduce((s,w)=>s+Object.values(w.st).reduce((x,r)=>x+r.battles,0)/2,0),peace:Game.S.politics?.peaces.length||0,contribution:Object.values(Game.S.wars||{}).flatMap(w=>Object.values(w.contributions||{})).reduce((s,x)=>s+x.battles,0),spy:Game.aliveMajors().reduce((s,id)=>s+(Game.f(id).spyHistory||[]).length,0)})");assert.equal(snapshot.turn,12);assert.ok(snapshot.alive.length>0);output.integration.push({scenario,sample,...snapshot});console.log('INTEGRATION '+JSON.stringify(output.integration.at(-1)));
 }
 assert.deepEqual(c.errors,[]);fs.mkdirSync(path.resolve(__dirname,'../artifacts/politics'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../artifacts/politics/simulation-results.json'),JSON.stringify(output,null,2));console.log('Political simulations completed: 192 controlled campaigns / 6912 turns, 60 espionage turns, 72 full gameplay rounds.');
})().catch(e=>{console.error(e);process.exitCode=1});
