'use strict';
// One set of economic calculations feeds settlement, previews and the treasury.
const FINANCE_LABELS = {
  income:{tax:'ضرائب السكان',market:'الأسواق',government:'إيراد مقار الحكم',food:'بيع فائض الزراعة',route:'القوافل',trade:'التجارة المتصلة',tribute:'جزية واتفاقات مستحقة',vassal:'إيراد التابعين'},
  expense:{army:'رواتب الوحدات النظامية',merc:'المرتزقة',wages:'رواتب القادة والضباط',garrison:'حاميات المدن',supply:'تموين الحملات والحصار',admin:'الإدارة والبريد المحلي',stabilization:'استقرار وإعمار الأقاليم الجديدة',forts:'صيانة التحصينات',infrastructure:'صيانة البنية والمرافق',overhead:'قيادة الجيوش الإضافية',tribute:'أقساط الجزية',vassal:'التزامات التبعية'}
};
Object.assign(Game, {
  financeState(fid) {
    const f=this.f(fid);if(!f)return null;
    if(!f.finance)f.finance={version:1,history:[],entries:[],anchor:f.gold,lastSettled:-1};
    const l=f.finance;l.history=l.history||[];l.entries=l.entries||[];if(!Number.isFinite(l.anchor))l.anchor=f.gold;
    return l;
  },
  recordFinance(fid,amount,kind,label) {
    if(!amount||!this.f(fid))return;
    const l=this.financeState(fid);l.entries.push({turn:this.S.turn,amount:Math.round(amount),kind,label});
    if(l.entries.length>100)l.entries.splice(0,l.entries.length-100);
  },
  administrationReach(fid) {
    const own=this.nodesOf(fid),centres=own.filter(n=>n.capital),dist=new Map(),queue=(centres.length?centres:own.slice(0,1)).map(n=>n.id);
    for(const id of queue)dist.set(id,0);
    for(let i=0;i<queue.length;i++)for(const e of this.edgesOf(queue[i])){
      const a=this.node(queue[i]),b=this.node(e.to);
      if(!b||dist.has(b.id)||b.owner!==fid&&this.atWar(fid,b.owner))continue;
      if(e.kind==='water'&&(!a.port||!b.port))continue;
      dist.set(b.id,dist.get(a.id)+1);queue.push(b.id);
    }
    return dist;
  },
  localAdministration(n,reach=this.administrationReach(n.owner)) {
    const d=reach.has(n.id)?reach.get(n.id):null;
    const gov=!!this.governorAt(n),road=n.roads?1:0,port=n.port?1:0;
    const distance=d===null?8:Math.min(12,Math.max(0,d-2-road-port)*1.2),population=Math.min(14,n.pop/5000);
    const base=4+population+distance;
    const autonomy=n.economicOccupation?.mode==='aman';
    return {n,d,gov,autonomy,c:Math.round(base*(gov?.65:1)*(autonomy?.8:1)),base:Math.round(4+population),distance:Math.round(distance),reason:d===null?'لا ممر آمن متصل إلى مقر الحكم؛ مكتب محلي مستقل بكلفة اتصال 8':`ممر إداري آمن: ${d} خطوات؛ كلفة البريد لا تتجاوز 12`};
  },
  adminCosts(fid) {
    const reach=this.administrationReach(fid);
    const rows=this.nodesOf(fid).map(n=>this.localAdministration(n,reach)).sort((a,b)=>(a.d??Infinity)-(b.d??Infinity)||String(a.n.id).localeCompare(String(b.n.id)));
    // Six local offices are covered by the central household. No city-count multiplier.
    return rows.map((r,i)=>({...r,c:i<6?0:r.c,covered:i<6}));
  },
  expansionPressure() {return 0;},
  stabilizationCost(n) {
    const o=n.economicOccupation;if(!o)return 0;
    const duration=o.mode==='aman'?6:o.mode==='sack'?14:10;
    const left=Math.max(0,duration-(this.S.turn-o.since));
    return Math.round((8+n.pop/2500)*(o.mode==='aman'?.55:1)*left/duration);
  },
  infrastructureCost(n) {return [0,1,3,6][Math.min(3,n.market||0)]+(n.farm||0)+(n.roads?2:0)+(n.port||0)*3+(n.granary||0)*2+(n.barracks||0)*4+(n.diwan||0)*6;},
  buildUpkeep(n) {return (ECON.fortUpkeep.walls[Math.min(4,n.walls||0)]||0)+this.infrastructureCost(n);},
  populationNext(n) {
    const origin=this.sc.nodes.find(x=>x.id===n.id),base=origin?.pop||n.pop;
    const capacity=Math.max(base,base*(1.5+.25*(n.farm||0)+.12*(n.market||0)));
    if(n.pop>=capacity)return n.pop; // Old larger saved populations are never discarded.
    return Math.min(Math.round(capacity),Math.round(n.pop+n.pop*(.004+.004*(n.farm||0))*Math.max(0,1-n.pop/capacity)));
  },
  supplyCost(a) {
    if(this.f(a.fid)?.horde)return 0;
    const hops=this.militarySupplyHops?this.militarySupplyHops(a):this.supplyHops(a);
    return Math.round(a.regs.length*ECON.supplyPerUnitHop*(hops+(a.siege?1:0))*(this.hasTrait(a,'logistician')?.7:1));
  },
  vassalDue(fid) {
    return Math.max(0,Math.round(this.nodesOf(fid).reduce((v,n)=>v+this.cityIncome(n),0)*.15));
  },
  replacementPrice(r) {const u=UNITS[r.type];return Math.max(.4,.4*(u.cost||0)/Math.max(1,u.men));},
  economy(fid) {
    const f=this.f(fid),inc=Object.fromEntries(Object.keys(FINANCE_LABELS.income).map(k=>[k,0])),exp=Object.fromEntries(Object.keys(FINANCE_LABELS.expense).map(k=>[k,0]));
    if(!f)return {inc,exp,income:0,expense:0,netGold:0,food:0,eat:0,netFood:0,gold:0,trade:0,route:0,tribute:0,upkeep:0,salaries:0,overhead:0};
    let food=0,eat=0;
    for(const n of this.nodesOf(fid)){
      const st=this.incomeSteps(n),capital=n.capital?Math.round(st.tax*ECON.capital/Math.max(1,n.pop/1000*ECON.taxPer1k*TAXES[f.tax].income+ECON.capital)):0;
      inc.tax+=st.tax-capital;inc.government+=capital;inc.market+=st.market;food+=this.cityFood(n);
      exp.forts+=ECON.fortUpkeep.walls[Math.min(4,n.walls||0)]||0;exp.infrastructure+=this.infrastructureCost(n);exp.garrison+=this.garrisonUpkeep(n);exp.stabilization+=this.stabilizationCost(n);
    }
    for(const a of this.armiesOf(fid)){
      for(const r of a.regs)exp[r.merc?'merc':'army']+=this.unitUpkeep(r);
      const g=this.armyGen(a);if(g&&this.isOfficer(g))exp.wages+=this.genSalary(g);
      exp.supply+=this.supplyCost(a);eat+=this.armyEat(a);
    }
    for(const g of this.gensOf(fid))if(this.employed(g))exp.wages+=this.genSalary(g);
    exp.admin=this.adminCosts(fid).reduce((v,r)=>v+r.c,0);
    exp.overhead=Math.max(0,this.armiesOf(fid).length-Math.max(2,this.nodesOf(fid).length))*ECON.armyOverhead;
    const tradeK=1+(this.policyMod?this.policyMod(fid,'trade'):0);
    inc.trade=Math.round(this.tradeIncome(fid)*tradeK);inc.route=Math.round((this.routeIncome?this.routeIncome(fid):0)*tradeK);
    for(const t of this.S.tributes||[]){if(t.payee===fid)inc.tribute+=t.amount;if(t.payer===fid)exp.tribute+=t.amount;}
    if(f.overlord&&this.f(f.overlord)?.alive)exp.vassal=this.vassalDue(fid);
    for(const v of Object.values(this.S.factions))if(v.alive&&v.overlord===fid)inc.vassal+=this.vassalDue(v.id||Object.keys(this.S.factions).find(k=>this.f(k)===v));
    if(f.horde){for(const k in exp)exp[k]=0;eat=0;}
    eat=Math.round(eat);const netFood=food-eat;
    inc.food=Math.round(Math.max(0,(f.food||0)+netFood-ECON.foodCap)*ECON.foodSale);
    for(const k in exp)exp[k]=Math.round(exp[k]);
    const income=Object.values(inc).reduce((a,b)=>a+b,0),expense=Object.values(exp).reduce((a,b)=>a+b,0);
    return {inc,exp,income,expense,netGold:income-expense,food,eat,netFood,gold:inc.tax+inc.market+inc.government,trade:inc.trade+inc.route,route:inc.route,tribute:inc.tribute-exp.tribute,upkeep:exp.army+exp.merc,salaries:exp.wages,overhead:exp.admin+exp.overhead};
  },
  settleEconomy(fid,e) {
    const f=this.f(fid),l=this.financeState(fid);if(l.lastSettled===this.S.turn)return false;
    const previous=l.history.at(-1),opening=l.anchor,oneOff=f.gold-opening;
    f.gold+=e.netGold;f.food+=e.netFood;
    const entry={turn:this.S.turn,opening,oneOff,entries:l.entries.slice(),inc:{...e.inc},exp:{...e.exp},income:e.income,expense:e.expense,net:e.netGold,closing:f.gold};
    l.history.push(entry);l.history=l.history.slice(-12);l.entries=[];l.anchor=f.gold;l.lastSettled=this.S.turn;
    if(previous&&fid===this.S.player&&e.netGold-previous.net< -Math.max(40,previous.income*.15))this.alert('imp',`تراجع صافي الميزانية ${previous.net-e.netGold} ذهبًا؛ راجع أسباب التغير في الخزينة.`,{icon:'gold',key:'finance-drop:'+this.S.turn,win:'kingdom'});
    return true;
  },
  closeFinanceRound() {
    for(const fid of Object.keys(this.S.factions)){
      const f=this.f(fid),l=this.financeState(fid),last=l.history.at(-1);
      if(!last||last.turn!==this.S.turn-1)continue;
      last.oneOff+=f.gold-l.anchor;last.entries.push(...l.entries);
      const known=last.entries.reduce((v,x)=>v+x.amount,0);
      if(known!==last.oneOff)last.entries.push({label:'أحداث ومكافآت ومعاملات أخرى',kind:'other',amount:last.oneOff-known});
      last.closing=f.gold;l.entries=[];l.anchor=f.gold;
    }
  },
  financeView(fid) {
    const f=this.f(fid),l=this.financeState(fid),now=this.economy(fid),last=l.history.at(-1),changes=[];
    if(last)for(const [group,key,sign]of [['inc','income',1],['exp','expense',-1]])for(const [k,label]of Object.entries(FINANCE_LABELS[key])){const d=sign*((now[group][k]||0)-(last[group][k]||0));if(d)changes.push({label,delta:d});}
    const actions=f.gold-l.anchor,known=l.entries.reduce((v,x)=>v+x.amount,0);
    return {now,last,history:l.history,changes:changes.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)),actions,entries:[...l.entries,...(actions!==known?[{label:'أحداث ومكافآت أو مصروفات أخرى',amount:actions-known,kind:'other'}]:[])],projected:f.gold+now.netGold};
  },
  cityEconomy(n) {
    const st=this.incomeSteps(n),admin=this.adminCosts(n.owner).find(r=>r.n.id===n.id)?.c||0;
    const upkeep=this.buildUpkeep(n),garrison=this.garrisonUpkeep(n),stabilization=this.stabilizationCost(n);
    return {income:st.total,tax:st.tax,market:st.market,food:this.cityFood(n),admin,upkeep,garrison,stabilization,net:st.total-admin-upkeep-garrison-stabilization};
  },
  previewBuild(n,b) {
    const B=BUILDINGS[b],lvl=n[b]||0;if(!B||lvl>=B.max)return null;
    const snapshot=()=>({city:this.cityEconomy(n),eco:this.economy(n.owner),supply:this.supplyCap(n,n.owner),stores:this.storesMax(n),loy:this.loyaltyTarget(n).target});
    const before=snapshot();let after;try{n[b]=lvl+1;after=snapshot();}finally{n[b]=lvl;}
    const cost=B.cost(lvl),time=this.buildTime(b,lvl),net=after.eco.netGold-before.eco.netGold,other=[];
    const food=after.city.food-before.city.food;
    if(food)other.push(`الغذاء ${before.city.food} إلى ${after.city.food}؛ ${signed(food)} كل دور. يباع فقط ما يزيد على سعة المخازن.`);
    if(after.supply!==before.supply)other.push(`سعة الإمداد ${before.supply} إلى ${after.supply} وحدات.`);
    if(after.stores!==before.stores)other.push(`مؤن الحصار ${before.stores} إلى ${after.stores} أدوار.`);
    if(after.loy!==before.loy)other.push(`هدف الولاء ${Math.round(before.loy)}٪ إلى ${Math.round(after.loy)}٪؛ يتغير تدريجيًا.`);
    const effects={walls:'دفاع أقوى، مع صيانة أعلى؛ لا عائد نقدي مباشر.',roads:'حركة أرخص واتصال إداري وتجاري أفضل.',port:'يفتح الطرق المائية المدعومة ويحسن التجارة والاتصال.',barracks:'يفتح الخيالة والمنجنيق والتدريب المحلي.',diwan:'يزيد مقاعد مجلس الحرب وفرص الاستقطاب؛ رواتب القادة منفصلة.',farm:'يزيد الغذاء وقدرة المدينة على النمو؛ نمو السكان يتباطأ قرب سعتها.'};if(effects[b])other.push(effects[b]);
    return {b,from:lvl,to:lvl+1,cost,time,net,gold:after.eco.income-before.eco.income,maintenance:after.city.upkeep-before.city.upkeep,upkeep:after.eco.expense-before.eco.expense,incBefore:before.city.income,incAfter:after.city.income,foodBefore:before.city.food,foodAfter:after.city.food,outputBefore:b==='farm'?before.city.food:b==='market'?before.city.market:before.city.income,outputAfter:b==='farm'?after.city.food:b==='market'?after.city.market:after.city.income,outputLabel:b==='farm'?'غذاء المدينة':b==='market'?'دخل السوق':'دخل المدينة',payback:net>0?time+Math.ceil(cost/net):null,other,components:{tax:after.eco.inc.tax-before.eco.inc.tax,market:after.eco.inc.market-before.eco.inc.market,agriculture:after.eco.inc.food-before.eco.inc.food,trade:after.eco.trade-before.eco.trade,administration:before.eco.exp.admin-after.eco.exp.admin},note:'تقدير وفق السكان والولاء والتجارة الحالية، بعد الصيانة؛ قد يتغير أثناء البناء. فترة الاسترداد تشمل مدة البناء.'};
  },
  economicOccupationPreview(n,choice,how,fate=null,defMen=0) {
    const saved={...n};
    try{
      n.unrest=how==='surrender'?2:4;n.economicOccupation={mode:choice==='clemency'?'aman':choice==='sack'?'sack':'annex',since:this.S.turn};
      if(choice==='clemency'){n.loyalty=62;n.unrest=Math.max(1,n.unrest-2);const ctx=this.capCtx;if(ctx?.node===n.id&&ctx.bldBefore)['market','farm','granary','roads'].forEach((b,i)=>n[b]=Math.max(n[b]||0,ctx.bldBefore[i]));}
      else if(choice==='sack'){n.pop=Math.round(n.pop*.72);n.loyalty=12;n.unrest=6;n.market=Math.max(0,n.market-1);}
      else n.loyalty=how==='surrender'?52:40;
      if(defMen){if(fate==='disarm')n.loyalty=Math.max(0,n.loyalty-5);if(fate==='captives')n.loyalty=Math.max(0,n.loyalty-6);if(fate==='passage'){n.pop=Math.round(n.pop*.96);n.loyalty=Math.min(100,n.loyalty+8);}}
      const fee=(choice==='clemency'?-50:choice==='sack'?Math.round(saved.pop/55):Math.round(saved.pop/200))+(fate==='captives'?Math.round(defMen*.6):0);
      return {...this.cityEconomy(n),loyalty:n.loyalty,unrest:n.unrest,fee,duration:choice==='clemency'?6:choice==='sack'?14:10};
    }finally{for(const key of Object.keys(n))delete n[key];Object.assign(n,saved);}
  }
});

{
  const income=Game.incomeSteps;
  Game.incomeSteps=function(n){const out=income.call(this,n);if(n.economicOccupation?.mode==='aman'&&out.tax){const cut=Math.round(out.tax*.15);out.tax-=cut;out.total-=cut;out.steps.push({k:'aman',label:'عهد الأمان: احتفاظ محلي بـ15٪ من الضرائب',v:-cut,note:'الأسواق لا تتأثر، والإدارة المحلية أرخص 20٪'});}return out;};
  const loyalty=Game.loyaltyTarget;
  Game.loyaltyTarget=function(n){const out=loyalty.call(this,n);if(!n.economicOccupation)return out;const old=out.parts.filter(p=>p[2]==='occupied').reduce((v,p)=>v+p[1],0);out.parts=out.parts.filter(p=>p[2]!=='occupied');const o=n.economicOccupation,d=o.mode==='aman'?6:10,left=Math.max(0,d-(this.S.turn-o.since)),v=-Math.round((o.mode==='aman'?10:25)*left/d);if(v)out.parts.push(['دمج الإقليم تدريجيًا ('+left+' أدوار)',v,'occupied']);out.target=out.target-old+v;return out;};
  const occupy=Game.applyOccupation;
  Game.applyOccupation=function(n,fid,old,choice,how){const f=this.f(fid),before=f.gold,key=typeof choice==='object'?choice.choice:choice;this.financeState(fid);const out=occupy.call(this,n,fid,old,choice,how);n.economicOccupation={mode:key==='clemency'?'aman':key==='sack'?'sack':'annex',since:this.S.turn};this.recordFinance(fid,f.gold-before,'occupation',key==='sack'?'غنيمة المدينة ومصير الحامية':key==='clemency'?'عهد الأمان ومصير الحامية':'ضم المدينة ومصير الحامية');return out;};
  const occupationPreview=Game.occupationPreview;
  Game.occupationPreview=function(n,fid,how,choice,fate,defMen){const out=occupationPreview.apply(this,arguments),e=this.economicOccupationPreview(n,choice,how,fate,defMen);out.policy.push(['حصيلة الخزينة فورًا (مع مصير الحامية)',signed(e.fee)],['الدخل في حالتها الحالية',e.income+' / دور'],['حامية وصيانة وإدارة',e.garrison+e.upkeep+e.admin+' / دور'],['استقرار مؤقت يتناقص خلال '+e.duration+' أدوار',e.stabilization+' / دور'],['المساهمة الصافية للمدينة',signed(e.net)+' / دور'],['النظام المالي',choice==='clemency'?'15٪ من الضرائب تبقى محليًا؛ كلفة الإدارة أقل 20٪':'تحصيل كامل بعد استعادة الولاء'],['حدود التقدير','يشمل مصير الحامية المختار؛ لا يشمل جيوش الحملة والتجارة']);if(choice==='clemency')out.policy.push(['الإغاثة','تُخصم 50 كاملة حتى لو دخلت الخزينة في عجز']);return out;};
  const endRound=Game.endRound;
  Game.endRound=function(){const out=endRound.apply(this,arguments);this.closeFinanceRound();return out;};
  const normalize=Game.normalizeState;
  Game.normalizeState=function(){const out=normalize.apply(this,arguments);for(const fid of Object.keys(this.S.factions))this.financeState(fid);for(const n of this.S.nodes)if(!n.economicOccupation&&n.origOwner!==n.owner&&n.capturedTurn>=0&&this.S.turn-n.capturedTurn<10)n.economicOccupation={mode:'annex',since:n.capturedTurn};return out;};
  const newGame=Game.newGame;
  Game.newGame=function(){const out=newGame.apply(this,arguments);for(const fid of Object.keys(this.S.factions))this.financeState(fid);return out;};
  // These actions spend once. Reversals are shown by treasury reconciliation.
  for(const [method,kind,label]of [['build','construction','مشروع بناء'],['recruit','recruitment','تجنيد الوحدات'],['hireMerc','recruitment','استئجار مرتزقة'],['escortRoute','trade','حراسة طريق القوافل'],['setEdict','policy','إصدار مرسوم'],['festival','stability','احتفال واستقرار'],['spyOp','espionage','عملية استخبارات'],['honorGeneral','leaders','تكريم قائد'],['proposeContract','leaders','مقدم عقد قائد']]){
    const original=Game[method];if(!original)continue;
    Game[method]=function(fid,...args){const f=typeof fid==='string'?this.f(fid):null;if(!f)return original.call(this,fid,...args);this.financeState(fid);const before=f.gold,out=original.call(this,fid,...args);this.recordFinance(fid,f.gold-before,kind,label);if(method==='proposeContract'&&f.gold!==before)this.save();return out;};
  }
  const undoPush=Undo.push;
  Undo.push=function(entry){const undo=entry.undo,fid=Game.S.player;entry.undo=function(){const before=Game.f(fid).gold;undo();Game.recordFinance(fid,Game.f(fid).gold-before,'refund','تراجع عن '+entry.label);};return undoPush.call(this,entry);};
}
