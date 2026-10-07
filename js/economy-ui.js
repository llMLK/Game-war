'use strict';
// Economy-only surfaces; the existing kingdom, city and caravan entry points remain.
(() => {
  const row=(label,value,cls='')=>h('div',{class:'eco-row '+cls},h('span',null,label),h('bdi',null,rich(value)));
  const note=text=>h('p',{class:'eco-note'},text);
  const details=(label,...content)=>h('details',null,h('summary',null,label),content);
  const stat=(label,value,sub)=>h('div',{class:'eco-stat'},h('small',null,label),h('bdi',null,h('b',null,value)),sub?h('small',null,sub):null);
  Explain.budgetLines=function(e){return [...Object.entries(FINANCE_LABELS.income).filter(([k])=>e.inc[k]).map(([k,label])=>[label,signed(e.inc[k]),'pos']),['مجموع الإيرادات',e.income,'sum'],...Object.entries(FINANCE_LABELS.expense).filter(([k])=>e.exp[k]).map(([k,label])=>[label,'−'+e.exp[k],'neg']),['مجموع المصروفات','−'+e.expense,'sum'],['الصافي الدوري',signed(e.netGold),'sum']];};
  Explain.expansion=function(fid){const rs=Game.adminCosts(fid);return {icon:'map',title:'الإدارة المحلية',value:'−'+rs.reduce((s,r)=>s+r.c,0)+' كل دور',state:'أقرب ست مدن يغطيها مقر الحكم. لكل مدينة أخرى مكتب محلي بحسب سكانها واتصالها؛ لا تزيد كلفة مدينة لمجرد احتلال مدينة أخرى.',from:rs.filter(r=>r.c).sort((a,b)=>b.c-a.c).slice(0,10).map(r=>[r.n.name+' · '+(r.d===null?'معزولة':r.d+' خطوات'),r.c]),note:'الأساس 4 ذهب + ذهب لكل 5000 نسمة (حتى 14). البريد 1.2 لكل خطوة بعد الثانية، حتى 12؛ الاتصال المعزول 8. الطريق والميناء يقللان كلفة البريد.',improve:['حاكم مقيم يخفض الكلفة 35٪.','عهد الأمان يخفض الإدارة المحلية 20٪ مقابل إبقاء 15٪ من الضرائب محليًا.','الاستقرار بعد الفتح بند مؤقت مستقل يتناقص كل دور.']};};
  const cityIncome=Explain.cityIncome;
  Explain.cityIncome=function(n){const x=cityIncome.call(this,n);x.adv=x.adv?.map(([k,v])=>[k,typeof v==='string'&&v.startsWith('×')?Math.round(Number(v.slice(1))*100)+'٪ من الأساس':v]);return x;};
  Panels.treasuryBody=function(scene,body){
    const P=scene.P,f=Game.f(P),v=Game.financeView(P),e=v.now,last=v.last,box=h('div',{class:'eco-view',id:'eco-treasury'});
    box.append(h('div',{class:'eco-hero'},stat('في الخزينة',f.gold,'ذهب متاح الآن'),stat('الصافي الدوري',signed(e.netGold),'توقع الدور القادم'),stat('بعد التحصيل',v.projected,'قبل القرارات والأحداث الجديدة')));
    box.append(note('الذهب يأتي من الضرائب والأسواق والتجارة وبيع فائض الزراعة. الغذاء المستخدم لإطعام الجيش لا يُباع. الأرقام أدناه توقع بالقيم الحالية؛ السجل يحتفظ بما دُفع وحُصّل فعلاً.'));
    const cols=h('div',{class:'eco-columns'});
    for(const [group,labels,title,total]of [['inc',FINANCE_LABELS.income,'الإيرادات',e.income],['exp',FINANCE_LABELS.expense,'المصروفات',e.expense]])cols.append(h('section',{class:'eco-card'},h('h3',null,title),Object.entries(labels).map(([k,label])=>row(label,e[group][k],group==='inc'?'pos':'neg')),row('المجموع',total,'sum')));
    box.append(cols);
    box.append(details('الغذاء وعائد الزراعة',row('في المخازن الآن',f.food+' / '+ECON.foodCap),row('إنتاج المدن',e.food+' / دور'),row('استهلاك الجيوش',e.eat+' / دور'),row('صافي الغذاء',signed(e.netFood)),row('ذهب الفائض المباع',e.inc.food),note('يباع فقط ما يزيد على سعة المخزون بعد إطعام الجيوش؛ كل وحدتين من الغذاء تعطيان ذهبًا واحدًا، مع تقريب المبلغ النهائي.')));
    box.append(details('ما الذي تغير منذ التحصيل السابق؟',last?[
      row('صافي الدور السابق',signed(last.net)),row('الصافي المتوقع الآن',signed(e.netGold)),row('التغير',signed(e.netGold-last.net),'sum'),
      v.changes.length?v.changes.map(c=>row(c.label,signed(c.delta),c.delta>0?'pos':'neg')):note('لم تتغير البنود الدورية.'),note('الإشارة الموجبة تحسن الصافي؛ قد تأتي من زيادة إيراد أو خفض مصروف.')
    ]:note('لم ينته دور مالي بعد؛ سيظهر السجل بعد أول تحصيل.')));
    box.append(details('سجل التحصيل والقرارات',last?[
      h('b',null,'آخر تحصيل · الدور '+(last.turn+1)),row('رصيد بداية الفترة',last.opening),row('قرارات وأحداث وتعويض جنود',signed(last.oneOff)),...last.entries.map(x=>row(x.label,signed(x.amount))),row('دخل دوري',last.income),row('مصروف دوري','−'+last.expense),row('الرصيد بعد الإقفال',last.closing,'sum'),
      note(`${last.opening} + (${last.oneOff}) + ${last.income} − ${last.expense} = ${last.closing}`)
    ]:null,h('b',null,'حركة الخزينة منذ آخر إقفال'),v.entries.length?v.entries.map(x=>row(x.label,signed(x.amount))):note('لا معاملات فورية بعد.'),row('رصيدك الآن',f.gold,'sum'),v.history.length>1?details('الأدوار السابقة',v.history.slice(0,-1).reverse().map(x=>row('الدور '+(x.turn+1)+' · صافي دوري '+signed(x.net),x.closing))):null));
    const admin=Game.adminCosts(P);
    box.append(details('الإدارة والاستقرار · تفاصيل المدن',note(Explain.expansion(P).state),note(Explain.expansion(P).note),admin.map(r=>h('div',{class:'eco-change'},row(r.n.name,r.c+' ذهب / دور'),note(r.covered?'يغطي مقر الحكم هذه المدينة.':r.reason+(r.gov?'؛ حاكم مقيم: تخفيض 35٪.':'')+(r.autonomy?'؛ عهد الأمان: تخفيض 20٪.':'')),Game.stabilizationCost(r.n)?row('استقرار مؤقت',Game.stabilizationCost(r.n)):null))));
    const gs=Game.gensOf(P).filter(g=>Game.employed(g)||Game.isOfficer(g)&&g.status==='army');
    box.append(details('رواتب القادة والضباط',gs.filter(g=>Game.genSalary(g)).map(g=>row(g.name+' · '+(g.status==='pool'?'في البلاط':g.status==='gov'?'حاكم':'في الخدمة'),Game.genSalary(g))),note('أجور العقود من نظام القادة نفسه. راتب البلاط مخفّض؛ الضابط المعيّن يُحسب مرة واحدة.')));
    box.append(details('مساهمة كل مدينة',note('دخل المدينة بعد حاميتها وصيانة مبانيها وإدارتها واستقرارها؛ القوافل والتجارة وفائض الغذاء بنود المملكة أعلاه.'),Game.nodesOf(P).map(n=>{const c=Game.cityEconomy(n);return h('div',{class:'eco-change'},row(n.name,signed(c.net),'sum'),note(`إيراد ${c.income} · حامية ${c.garrison} · مرافق ${c.upkeep} · إدارة ${c.admin} · استقرار ${c.stabilization}`));})));
    if(Game.tradeBreakdown){const trade=Game.tradeBreakdown(P);box.append(details('اتصال التجارة والقوافل',trade.partners.length?trade.partners.map(t=>h('div',{class:'eco-change'},row(t.name,t.income+' / '+t.potential),note(t.state+'؛ '+t.fix),t.reasons.map(r=>note(r.text+'؛ '+r.fix)))):note('لا اتفاق تجاري نشط.'),note('القيم لكل شريك قبل أثر سياسة المملكة. القوافل تسلك مسارًا مستقلًا ظاهرًا في نافذتها.'),h('button',{class:'chip',onclick:()=>this.openRoute(scene)},'افتح حالة القوافل')));}
    box.append(h('div',{class:'eco-filters'},h('button',{class:'btn',onclick:()=>this.investDialog(scene)},'قارن فرص الاستثمار'),h('button',{class:'chip',onclick:()=>UI.modal({title:'شرح الإدارة والتموين',body:h('div',{class:'eco-view'},note(Explain.expansion(P).note),Explain.expansion(P).improve.map(note),note('تستمر رواتب الوحدات أثناء الراحة؛ نقل الجيش خارج أرضك والحصار يزيدان كلفة التموين. تعويض الرجال يُدفع عند حدوثه ويظهر منفصلًا في السجل: 40٪ من كلفة تجنيد الوحدة، بنسبة الرجال المعوّضين، وبحد أدنى 0.4 ذهب للرجل. تجهيز النخبة والفرسان أغلى.')),buttons:[{label:'إغلاق'}],dismissable:true})},'شرح التكاليف')));
    body.append(box);
  };
  Panels.buildPreviewBox=function(n,k){
    const p=Game.previewBuild(n,k),B=BUILDINGS[k];if(!p)return note('اكتمل تطوير هذا المبنى.');
    return h('div',{class:'eco-view',id:'eco-building'},h('p',{class:'lead'},`${B.name} في ${n.name} · المستوى ${p.from} إلى ${p.to}`),
      h('div',{class:'eco-comparison'},stat('الآن · '+p.outputLabel,p.outputBefore),h('span',null,'←'),stat('بعد الاكتمال',p.outputAfter)),
      row('زيادة الإنتاج',signed(p.outputAfter-p.outputBefore)+' / دور'),row('كلفة البناء',p.cost+' ذهب'),row('مدة الإنشاء',p.time+' أدوار'),row('صيانة المبنى الإضافية',p.maintenance+' / دور'),row('زيادة إيراد المملكة',signed(p.gold)+' / دور'),row('تغير مصروف المملكة',signed(p.upkeep)+' / دور'),row('العائد النقدي الصافي',signed(p.net)+' / دور','sum'),row('استرداد الكلفة من اليوم',p.payback?p.payback+' أدوار':'لا استرداد نقدي بالقيم الحالية'),
      details('مصادر تغير العائد',Object.entries({tax:'الضرائب',market:'الأسواق',agriculture:'فائض الزراعة المباع',trade:'التجارة والقوافل',administration:'الوفر في الإدارة'}).filter(([k])=>p.components[k]).map(([k,label])=>row(label,signed(p.components[k]))),row('صيانة إضافية','−'+p.maintenance)),
      h('ul',{class:'steps'},p.other.map(x=>h('li',null,x))),note(p.note),note('يبدأ الأثر بعد الاكتمال. يتوقف البناء تحت الحصار ويُلغى إذا سقطت المدينة؛ لا تُحصّل الزيادة مقدمًا.'));
  };
  Panels.investDialog=function(scene){
    const P=scene.P,list=h('div',{class:'eco-invest'}),city=h('select',{'aria-label':'المدينة'},h('option',{value:''},'كل المدن'),Game.nodesOf(P).map(n=>h('option',{value:n.id},n.name))),type=h('select',{'aria-label':'نوع البناء'},Object.entries(BUILDINGS).map(([k,b])=>h('option',{value:k,selected:k==='market'},b.name))),sort=h('select',{'aria-label':'الترتيب'},h('option',{value:'roi'},'أسرع استرداد'),h('option',{value:'net'},'أكبر عائد'),h('option',{value:'cost'},'أقل كلفة'));
    let close;
    const render=()=>{const b=type.value,rows=Game.nodesOf(P).filter(n=>(!city.value||city.value===n.id)&&(!BUILDINGS[b].coastal||Game.hasWater(n))&&(!BUILDINGS[b].capitalOnly||n.capital)).map(n=>({n,p:Game.previewBuild(n,b)})).filter(x=>x.p);rows.sort((a,z)=>sort.value==='net'?z.p.net-a.p.net:sort.value==='cost'?a.p.cost-z.p.cost:(a.p.payback??Infinity)-(z.p.payback??Infinity));list.replaceChildren(...rows.map(({n,p})=>{const err=Game.canBuild(P,n,b);return h('button',{class:'eco-card'+(err?' off':''),onclick:()=>{if(err){UI.toast(err);return;}close();this.buildConfirm(scene,n,b);}},h('b',null,n.name+' · '+BUILDINGS[b].name+' '+p.from+' إلى '+p.to),h('span',null,`الصافي ${signed(p.net)} كل دور · صيانة إضافية ${p.maintenance}`),h('span',null,`${p.cost} ذهب · إنشاء ${p.time} أدوار · `+(p.payback?'استرداد '+p.payback+' أدوار':'عائد غير نقدي حاليًا')),err?h('span',{class:'eco-note'},err):null);}));if(!rows.length)list.append(note('لا ترقيات من هذا النوع تطابق الاختيار.'));};
    for(const s of [city,type,sort])s.addEventListener('change',render);render();
    close=UI.modal({title:'مقارنة الاستثمار',icon:'scales',cls:'wide',body:h('div',{class:'eco-view',id:'eco-investment'},note('قارن المبنى نفسه بين المدن، أو غيّر نوعه. العائد يستخدم الإنتاج والاتصال والصيانة الفعلية الحالية، ويشمل الاسترداد مدة الإنشاء.'),h('div',{class:'eco-filters'},city,type,sort),list),buttons:[{label:'إغلاق'}],dismissable:true});
  };
  const routeBody=Panels.routeBody;
  Panels.routeBody=function(scene,body){
    const st=Game.routeStatus(scene.P);if(!st){routeBody.call(this,scene,body);return;}
    const segments=h('div');routeBody.call(this,scene,segments);segments.firstElementChild?.remove();segments.querySelector('.kv')?.remove();
    const causes=Game.routeCauses(scene.P).sort((a,b)=>Number(Game.node(b.node)?.owner===scene.P)-Number(Game.node(a.node)?.owner===scene.P));
    body.append(h('div',{class:'eco-view',id:'eco-caravan'},row('الدخل الحالي من الممكن',st.now+' / '+st.full),
      causes.length?causes.map(r=>h('div',{class:'eco-route-status'},h('b',null,r.text),note(r.fix),note((r.temporary?'انقطاع مؤقت':'تغير مستمر')+' · '+(r.auto?'يستأنف تلقائيًا عند زوال السبب':'يتطلب الإجراء الموضح أعلاه')))):note('كل مقاطع الطريق مفتوحة حاليًا.'),
      st.migration?note(st.migration.text):null,details('كل مقاطع الطريق وإجراءات الحراسة',segments),details('كيف تعمل القوافل؟',note(st.controlText),note(st.ownershipText))));
  };
  const occupation=Panels.occupation;
  Panels.occupation=function(...args){const result=occupation.apply(this,args),body=document.querySelector('.modal-layer:last-child .modal-body > div');if(body){body.classList.add('eco-view');body.id='eco-occupation';}return result;};
})();
