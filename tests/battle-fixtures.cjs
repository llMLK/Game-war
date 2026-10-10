const {createContext}=require('./harness.cjs');
const ctx=createContext(712),WarSim=ctx.run('WarSim'),Ready=ctx.run('Ready');
const units=ctx.run('UNITS');
function regs(types,exp=0){return types.map(type=>({type,men:units[type].men,exp}));}
function force(name,types,{rank=2,trait='none',flaw=null,exp=0,ready,player=false,personality='pragmatic',...extra}={}){
 return {fid:name,name,color:name==='A'?'#43766b':'#a35042',regs:regs(types,exp),gens:[{id:name+'-g',name:'قائد '+name,rank,trait,flaw,men:20,personality,skills:{command:rank+1,resolve:rank+1}}],intel:3,ai:.65,player,ready:ready||Ready.base(),...extra};
}
const average=['spear','spear','spear','spear','archer','archer','cavalry','cavalry']; // 400
const small=['spear','sword','archer','cavalry']; // 190
function config(seed=1,a=force('A',average),b=force('B',small,{rank:3,trait:'tactician'}),extra={}) {return {seed,kind:'field',terrain:'plains',weather:'clear',title:'ميدان الاختبار',sides:[a,b],...extra};}
function battle(cfg){const sim=new WarSim(cfg);if(cfg.plans)sim.sides.forEach((s,i)=>sim.autoFormation(s,cfg.plans[i]));return {sim,res:sim.runAuto()};}
module.exports={ctx,WarSim,Ready,units,regs,force,average,small,config,battle};
