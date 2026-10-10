const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ctx,WarSim,Ready,force,average,small,config,battle}=require('./battle-fixtures.cjs');
const N=Number(process.env.BATTLE_SEEDS)||160,results=[];let simulations=0;
function run(cfg){simulations++;return battle(cfg);}
function measure(name,make){let wins=0,lossA=0,lossB=0,fat=0,breaches=0;const plans={};
 for(let i=1;i<=N;i++){const {res,sim}=run(make(7919*i+17));wins+=res.winner===1;lossA+=res.report.cas[0].pct;lossB+=res.report.cas[1].pct;fat+=res.sides[1].after.fat;breaches+=!!res.breached;plans[sim.sides[1].plan]=(plans[sim.sides[1].plan]||0)+1;assert.ok(res.sides.every(s=>s.units.every(u=>Number.isFinite(u.men)&&u.men>=0)));}
 const r={name,seeds:N,sideBWinRate:+(wins/N).toFixed(3),sideALossPct:+(lossA/N).toFixed(1),sideBLossPct:+(lossB/N).toFixed(1),sideBFatigue:+(fat/N).toFixed(1),breachRate:+(breaches/N).toFixed(3),plans};results.push(r);console.log(JSON.stringify(r));return r;
}
const plain=measure('400 average vs 190 three-star',seed=>config(seed));
const favorable=measure('400 average vs 190 veteran hill defenders',seed=>config(seed,force('A',average),force('B',small,{rank:3,trait:'mountaineer',exp:3}),{terrain:'hills'}));
const terrainPlain=measure('320 vs 260 defenders: plain, fixed balanced/defensive plans',seed=>config(seed,force('A',['sword','sword','spear','spear','archer','archer']),force('B',['sword','sword','spear','archer','archer']),{terrain:'plains',plans:['balanced','defensive']}));
const terrainHill=measure('320 vs 260 defenders: hills, same plans',seed=>config(seed,force('A',['sword','sword','spear','spear','archer','archer']),force('B',['sword','sword','spear','archer','archer']),{terrain:'hills',plans:['balanced','defensive']}));
const tired=measure('400 exhausted vs 190 fresh',seed=>config(seed,force('A',average,{ready:{...Ready.base(),fat:75,coh:50,mor:40,sup:40,ammo:20,strain:50}}),force('B',small,{rank:2})));
const fresh=measure('400 fresh vs 190 fresh',seed=>config(seed,force('A',average),force('B',small,{rank:2})));
const cavPlain=measure('Cavalry side B on plains',seed=>config(seed,force('A',['sword','sword','archer','archer']),force('B',['cavalry','cavalry','cavalry','cavalry','cavalry','cavalry']),{terrain:'plains'}));
const cavForest=measure('Cavalry side B in forest',seed=>config(seed,force('A',['sword','sword','archer','archer']),force('B',['cavalry','cavalry','cavalry','cavalry','cavalry','cavalry']),{terrain:'forest'}));
const cavSpears=measure('Cavalry side B against spear line on plains',seed=>config(seed,force('A',['spear','spear','spear','spear']),force('B',['cavalry','cavalry','cavalry','cavalry','cavalry','cavalry']),{terrain:'plains'}));
const leader=measure('Strong leader militia vs average leader quality troops',seed=>config(seed,force('A',['militia','militia','militia','militia','militia','militia'],{rank:3,trait:'tactician'}),force('B',['sword','sword','sword','sword','sword'],{rank:2})));
const sameTroopsWeak=measure('Equal units: one-star vs two-star',seed=>config(seed,force('A',small,{rank:1}),force('B',small,{rank:2})));
const sameTroopsStrong=measure('Equal units: three-star vs two-star',seed=>config(seed,force('A',small,{rank:3,trait:'tactician'}),force('B',small,{rank:2})));
const consecutive=[0,1,2].map(()=>({wins:0,men:0,fat:0,morale:0,coh:0,supply:0,ammo:0,strain:0,readiness:0}));
for(let i=1;i<=N;i++){
 let survivor=force('B',small,{rank:3,trait:'mountaineer',exp:3});
 for(let n=0;n<3;n++){
  const row=consecutive[n];row.men+=survivor.regs.reduce((m,r)=>m+r.men,0);row.fat+=survivor.ready.fat;row.morale+=survivor.ready.mor;row.coh+=survivor.ready.coh;row.supply+=survivor.ready.sup;row.ammo+=survivor.ready.ammo;row.strain+=survivor.ready.strain;row.readiness+=Ready.score(survivor.ready).total;
  if(!survivor.regs.some(r=>r.men>=5))continue;
  const {res}=run(config(7919*i+n,force('A',average),survivor,{terrain:'hills'}));row.wins+=res.winner===1;
  survivor={...survivor,regs:res.sides[1].units.filter(u=>u.ref).map(u=>({...u.ref,men:u.men+(u.held||0)})).filter(r=>r.men>=5),ready:Ready.after(survivor.ready,res.sides[1].after),gens:survivor.gens.filter(g=>!res.fates[g.id])};
 }
}
const repeated=consecutive.map((r,i)=>({battle:i+1,...Object.fromEntries(Object.entries(r).map(([k,v])=>[k,k==='wins'?+(v/N).toFixed(3):+(v/N).toFixed(1)]))}));console.log('Consecutive hill battles (entry state)',JSON.stringify(repeated));
// Matched siege comparisons: only the named condition changes; commanders retain the same rank.
const siegeArmy=['sword','sword','sword','spear','spear','archer','archer','catapult'];
const siegeDef=['sword','spear','spear','archer','archer'];
const siegeCfg=(seed,extra={},att={})=>config(seed,force('A',siegeArmy,att),force('B',siegeDef),{kind:'siege',walls:2,equip:{ladders:true,ram:true,tower:true},stores:3,plans:['escalade','walls'],...extra});
const field=measure('Matched force in field',seed=>siegeCfg(seed,{kind:'field',plans:['balanced','defensive']}));
const siegeFresh=measure('Fresh garrison, walls 2, full equipment',seed=>siegeCfg(seed));
const siegeLow=measure('Fresh garrison, walls 1',seed=>siegeCfg(seed,{walls:1}));
const siegeHigh=measure('Fresh garrison, walls 3',seed=>siegeCfg(seed,{walls:3}));
const siegeStarved=measure('Starved exhausted garrison, walls 2',seed=>siegeCfg(seed,{stores:-2,sides:[force('A',siegeArmy),force('B',siegeDef,{ready:{...Ready.base(),fat:65,mor:30,coh:55,sup:15,ammo:15}})]}));
const siegeLadders=measure('Walls 2, ladders only',seed=>siegeCfg(seed,{equip:{ladders:true},sides:[force('A',siegeArmy.filter(x=>x!=='catapult')),force('B',siegeDef)]}));
const siegeEngineer=measure('Walls 2, siege specialist at same rank',seed=>siegeCfg(seed,{}, {trait:'siege'}));
const staticSiege=(seed,trait)=>siegeCfg(seed,{sides:[force('A',siegeArmy,{trait,orderMode:'none'}),force('B',siegeDef,{orderMode:'none'})]});
const siegeFixed=measure('Siege skill control: fixed plans, no tactical orders',seed=>staticSiege(seed,'none'));
const siegeFixedEngineer=measure('Siege skill specialist: same fixed decisions',seed=>staticSiege(seed,'siege'));
const tactics=[];
const scenarios=[
 {name:'Mixed force vs spears',a:['sword','sword','spear','spear','archer','archer','cavalry','cavalry'],b:['spear','spear','spear','spear','spear','spear','archer','archer'],terrain:'plains'},
 {name:'Cavalry vs exposed archers',a:['cavalry','cavalry','cavalry','cavalry','archer','sword'],b:['archer','archer','archer','archer','sword','sword'],terrain:'plains'},
 {name:'Archers vs guarded hillside',a:['archer','archer','archer','archer','sword','spear'],b:['sword','sword','spear','spear','archer','cavalry'],terrain:'hills'},
 {name:'Cavalry in forest vs infantry',a:['cavalry','cavalry','cavalry','cavalry','sword','sword'],b:['sword','sword','spear','spear','archer','archer'],terrain:'forest'},
 {name:'Ranged army under cavalry charge',a:['archer','archer','archer','archer','spear','spear'],b:['cavalry','cavalry','cavalry','cavalry','sword','sword'],terrain:'plains',defPlan:'assault'},
 {name:'Mixed troops in rain against assault',a:['sword','sword','spear','spear','archer','archer','cavalry','cavalry'],b:['sword','sword','spear','spear','archer','archer','cavalry','cavalry'],terrain:'plains',weather:'rain',defPlan:'assault'},
];
const tacticSeeds=64;
for(const scenario of scenarios){const row={name:scenario.name,winRates:{},unavailable:[]};for(const plan of ['balanced','assault','flanking','attrition','breakcenter','hunt']){const preview=new WarSim(config(1,force('A',scenario.a,{trait:'tactician'}),force('B',scenario.b),{terrain:scenario.terrain}));if(!preview.availablePlans(preview.sides[0]).includes(plan)){row.unavailable.push(plan);continue;}let win=0;for(let seed=1;seed<=tacticSeeds;seed++){const cfg=config(seed*3571,force('A',scenario.a,{trait:'tactician'}),force('B',scenario.b),{terrain:scenario.terrain,weather:scenario.weather||'clear'});const test=run({...cfg,plans:[plan,scenario.defPlan||(scenario.terrain==='hills'?'highground':'defensive')]});win+=test.res.winner===0;}row.winRates[plan]=+(win/tacticSeeds).toFixed(3);}tactics.push(row);console.log('Tactics',JSON.stringify(row));}
// Directional invariants, not a forced target win percentage for a particular tactic.
assert.ok(plain.sideBWinRate<.65,'small commander army dominates 400');
assert.ok(favorable.sideBWinRate>plain.sideBWinRate,'favorable conditions do not help');
assert.ok(terrainHill.sideBWinRate>=terrainPlain.sideBWinRate&&terrainHill.sideBLossPct<terrainPlain.sideBLossPct,'terrain irrelevant');
assert.ok(tired.sideBWinRate>fresh.sideBWinRate+.15,'fatigue irrelevant');
assert.ok(cavPlain.sideBWinRate>cavForest.sideBWinRate,'cavalry ignores terrain');
assert.ok(cavSpears.sideBWinRate<cavPlain.sideBWinRate,'spear counter irrelevant');
assert.ok(leader.sideBWinRate>.5,'commander overwhelms troop quality');
assert.ok(sameTroopsStrong.sideBWinRate<sameTroopsWeak.sideBWinRate,'commander quality irrelevant');
assert.ok(repeated[2].readiness<repeated[1].readiness&&repeated[1].readiness<repeated[0].readiness,'successive readiness not degrading');
assert.ok(repeated[2].wins<=repeated[1].wins&&repeated[1].wins<=repeated[0].wins,'repeat combat improves win rate');
for(let i=1;i<3;i++){const a=repeated[i-1],b=repeated[i];assert.ok(b.men<a.men&&b.fat>a.fat&&b.coh<a.coh&&b.supply<a.supply&&b.strain>a.strain,'persistent combat costs missing');assert.ok(b.ammo<=a.ammo&&b.morale<a.morale,'ammo or morale magically restored');}
assert.ok(siegeFresh.sideBWinRate>field.sideBWinRate,'siege no different from field');
assert.ok(siegeHigh.sideBWinRate>siegeLow.sideBWinRate,'walls irrelevant');
assert.ok(siegeStarved.sideBWinRate<siegeFresh.sideBWinRate,'defender exhaustion/starvation irrelevant');
assert.ok(siegeFresh.breachRate>siegeLadders.breachRate,'equipment irrelevant');
assert.ok(siegeEngineer.breachRate>siegeFresh.breachRate,'siege specialist does not improve breaches');
assert.ok(siegeFixedEngineer.sideBWinRate<siegeFixed.sideBWinRate&&siegeFixedEngineer.sideALossPct<siegeFixed.sideALossPct,'siege skill irrelevant with matched decisions');
const allBest=Object.keys(tactics[0].winRates).filter(p=>{const eligible=tactics.filter(s=>p in s.winRates);return eligible.length>=3&&eligible.every(s=>s.winRates[p]===Math.max(...Object.values(s.winRates)));});
assert.equal(allBest.length,0,'one plan wins every matchup');
assert.ok(tactics.find(s=>s.name==='Ranged army under cavalry charge').winRates.attrition<.6,'rapid cavalry does not counter skirmish delay');
assert.equal(ctx.errors.length,0,ctx.errors.join('\n'));
const out=path.resolve(__dirname,'../artifacts/battles');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'balance.json'),JSON.stringify({seeds:N,simulations,results,repeated,tacticSeeds,tactics},null,2));
console.log('Balance invariants passed');
