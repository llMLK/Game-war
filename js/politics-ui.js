'use strict';
// Arabic diplomatic surfaces keep decisions and their consequences together.
(() => {
  const note = text => h('p', { class: 'pol-note' }, rich(text));
  const details = (title, ...body) => h('details', { class: 'pol-more' }, h('summary', null, title), ...body);
  const row = (label, value) => h('div', { class: 'pol-row' }, h('span', null, label), h('bdi', null, value));
  const reasons = parts => h('div', { class: 'pol-reasons' }, ...parts.map(([label, v]) => h('p', null, h('span', null, label), h('span', { class: v > 0 ? 'good' : v < 0 ? 'warn' : '' }, v > 0 ? 'يدعم القرار' : v < 0 ? 'يعيق القرار' : 'محايد'))));
  const assessment = c => h('div', { class: 'pol-assessment' }, h('b', null, 'الموقف التقريبي: '), bandTag(c.band), note(c.blocked || c.why || 'يتغير الموقف مع حال المملكة.'), details('أسباب الموقف', reasons(c.parts || [])));
  const after = scene => { Game.save(); scene.afterAction ? scene.afterAction() : scene.refresh?.(); };
  const action = (label, fn, err, primary = false) => actBtn(label, { cls: 'btn' + (primary ? ' primary' : ''), err, onClick: fn });
  Panels.vassalTerms = function (t, lord) {
    const due = Game.vassalDue(t), current = Game.f(t).overlord === lord;
    return h('div', { class: 'pol-terms' },
      row('الجزية الحالية المقدرة', `${due} ذهب / دور`),
      note('الجزية 15٪ من إيراد المدن، وتتغير مع الإنتاج. تُحصّل مرة واحدة في سجل الخزينة؛ تلغي الجزية الثنائية بين التابع والمتبوع.'),
      h('ul', { class: 'steps' },
        h('li', null, 'تبقى المدن والمباني والقيادة المحلية والتجنيد بيد التابع.'),
        h('li', null, 'يدخل التابع حروب المتبوع ويقدم قواته وفق قدرته وطريقه. لا يعلن حرباً خارجية مستقلة ولا يعقد حلفاً مستقلاً.'),
        h('li', null, 'المتبوع يحمي التابع عند تعرضه للهجوم. التجارة والمصاهرة والإدارة الداخلية تبقى ممكنة.'),
        h('li', null, 'الاستقلال يوقف الجزية ويفتح حرباً مع المتبوع؛ تراجع الثقة والحماية قد يدفع تابعاً قوياً إلى ذلك.')),
      note(current ? 'هذا عقدك القائم.' : 'التبعية قد تحفظ الدولة وجيشها أمام خطر الزوال، وتمنح المتبوع دخلاً ونصرة دون احتلال كل المدن وكلفة استقرارها.'));
  };
  Panels.politicalContextBox = function (P, id) {
    const profile = Game.politicalProfile(id), memory = Game.diplomaticMemory(id, P), wars = Game.aliveMajors().filter(e => Game.atWar(id, e));
    return h('div', { class: 'pol-context' },
      h('div', { class: 'pol-tags' }, profile.labels.map(text => h('span', { class: 'tag' }, text))),
      note(wars.length ? `جبهاتها الحالية: ${wars.map(e => Game.fname(e)).join('، ')}.` : 'لا جبهات حربية حالياً.'),
      details('طبع الحكم وأولوياته', ...profile.explanations.map(note)),
      details(`ما تتذكره عنك (${memory.entries.length} وقائع)`, memory.entries.length ? memory.entries.slice(-8).reverse().map(e => h('p', null, h('b', null, e.value > 0 ? 'وفاء · ' : 'توتر · '), rich(e.label), h('small', null, ` — الدور ${e.turn + 1}`))) : note('لا وقائع محفوظة بعد.'), note('يخف أثر الذكريات مع الوقت؛ تكرار الفعل نفسه لا يصنع ثقة بلا حدود.')),
      details('أسباب العلاقة الحالية', reasons(Game.relParts(id, P))));
  };
  Panels.diploBody = function (scene, body) {
    const P = scene.P, container = h('div', { class: 'pol-view', id: 'pol-diplomacy' }); body.append(container);
    const intel = Game.intelligencePreview(P);
    container.append(h('div', { class: 'pol-banner' }, h('b', null, 'مجلس الرسل'), note('اختر مملكة لترى موقفها ومعاهداتها وذاكرتها، ثم راجع شروط القرار قبل إرساله.'),
      row('سمعة دولتك', Math.round(Game.f(P).rep)), details('الرصد وحماية المدن',action(intel.left ? `الرصد ممول · ${intel.left} أدوار` : `موّل الرصد والمخبرين · ${intel.cost}`, () => { UI.toast(Game.fundIntelligence(P) || 'تم تمويل الرصد ستة أدوار'); after(scene); }, intel.err), action('حماية المدن وإصلاح التخريب',()=>this.counterSpyDialog(scene)),note(intel.desc))));
    const offers = Object.values(Game.politicalState().offers).filter(o => o.to === P && !o.resolved && o.until >= Game.S.turn);
    if (offers.length) container.append(h('div', { class: 'pol-banner' }, h('b', null, 'عروض تنتظر جوابك'), offers.map(o => action(`${Game.fname(o.from)} · ${ { peace:'صلح',alliance:'حلف',trade:'تجارة',marriage:'مصاهرة',tribute:'جزية',vassal:'تبعية' }[o.kind] }`, () => this.offerDialog(scene, o)))));
    for (const id of Game.aliveMajors().filter(id => id !== P)) {
      const f = Game.f(id), st = Game.status(P, id), tr = Game.treaty(P, id), open = scene.diploOpen === id;
      const card = h('div', { class: 'pol-realm' + (open ? ' open' : '') },
        h('button', { class: 'pol-realm-head', onclick: () => { scene.diploOpen = open ? null : id; Sheets.render(); } }, dotEl(f.color), h('b', null, f.name), h('span', { class: 'pill ' + st }, Game.vassalLabel(P, id) || STATUS_NAME[st]), icon(open ? 'chevU' : 'chevD')),
        h('div', { class: 'pol-tags' }, h('span', null, `العلاقة ${signed(Game.rel(P,id))}`), tr.trade ? h('span', { class:'tag good' }, 'تجارة') : null, tr.marriage ? h('span', { class:'tag' }, 'مصاهرة') : null, Game.f(P).truce[id] > 0 && st !== 'war' ? h('span', { class:'tag' }, `عهد ${Game.f(P).truce[id]} أدوار`) : null));
      if (open) card.append(this.politicalContextBox(P,id), this.realmActions(scene,id,()=>after(scene)));
      container.append(card);
    }
  };
  Panels.realmActions = function (scene, id) {
    const P = scene.P, st = Game.status(P,id), tr = Game.treaty(P,id), f = Game.f(id), mine = Game.f(P), wait = Game.diplomaticWait(P,id), box = h('div', { class:'pol-actions' });
    const send = kind => this.diplomaticOfferDialog(scene,id,kind);
    if (st === 'war') {
      box.append(this.warBox(P,id), action('مفاوضات الصلح',()=>this.peaceDialog(scene,id),Game.envoyWait(P,id)?'رسول واحد في الدور':null,true));
      const counters = Object.values(Game.politicalState().counters).filter(c=>c.to===P&&c.from===id&&c.until===Game.S.turn);
      for (const c of counters) box.append(action('راجع العرض المضاد المحفوظ',()=>this.counterDialog(scene,id,{counter:c,c:Game.peaceChance(id,P,c)})));
    } else {
      box.append(action('هدية للبلاط · 100',()=>{const r=Game.giveDiplomaticGift(P,id);UI.toast(r.err||'وصلت الهدية');after(scene);},mine.gold<100?'الذهب لا يكفي':Game.politicalWait(P,id,'gift')?'هدية حديثة؛ انتظر أربعة أدوار':null));
      if (st === 'peace' && !mine.overlord && !f.overlord) box.append(action('عرض حلف',()=>send('alliance'),wait?`انتظر ${wait} أدوار`:null));
      if (st === 'alliance') {
        box.append(this.contribBox(P,id), action('تنسيق الحرب مع الحليف',()=>this.coordDialog(scene,id),!Game.commonWars(P,id).length?'لا عدو مشترك':null),
          action('تمويل الحليف · 150',()=>{const r=Game.subsidy(P,id);UI.toast(r?.err||'وصل التمويل');after(scene);},mine.gold<150?'الذهب لا يكفي':Game.politicalWait(P,id,'subsidy')?'وصل التمويل السابق':null),
          action('مراجعة فضّ الحلف',()=>this.confirmPoliticalBreak(scene,id)));
      }
      box.append(action(tr.trade?'إيقاف التجارة':'اتفاق تجارة',()=>tr.trade?UI.ask({title:'إيقاف اتفاق التجارة؟',icon:'camel',cls:'pol-modal',body:h('div',{class:'pol-view'},note('يفقد الطرفان دخل الاتفاق وتتراجع العلاقة. لن يتغير الاتفاق مجدداً قبل أربعة أدوار.')),buttons:[{label:'أوقف التجارة',value:true},{label:'إلغاء',value:false}]}).then(ok=>{if(ok){const r=Game.setTrade(P,id,false);UI.toast(r?.err||'توقفت التجارة');after(scene);}}):send('trade'),Game.politicalWait(P,id,'tradeChange')||Game.politicalWait(id,P,'tradeChange')?'تغيير حديث في اتفاق التجارة':null));
      if (!tr.marriage) box.append(action('عرض مصاهرة',()=>send('marriage'),wait?`انتظر ${wait} أدوار`:null));
      if (!mine.overlord&&!f.overlord) box.append(action('مراجعة طلب الجزية',()=>send('tribute'),wait?`انتظر ${wait} أدوار`:null));
      if (!mine.overlord&&f.overlord!==P) box.append(action('مراجعة إعلان الحرب',()=>this.confirmWarAttack(id).then(ok=>{if(ok){const r=Game.declareWar(P,id,'بقرار من مجلس الحكم');UI.toast(r?.err||'بدأت الحرب');after(scene);}})));
    }
    if (!mine.overlord&&!f.overlord) box.append(action('مفاوضة التبعية والحماية',()=>this.vassalDialog(scene,id),Game.politicalWait(P,id,'vassal')?'طلب حديث؛ انتظر ثلاثة أدوار':null));
    if (Game.isVassalOf(P,id)||Game.isVassalOf(id,P)) box.append(details('واجبات عقد التبعية',this.vassalTerms(Game.isVassalOf(P,id)?P:id,Game.isVassalOf(P,id)?id:P)));
    if (Game.isVassalOf(P,id)) box.append(action('مراجعة الاستقلال',()=>UI.ask({title:'إعلان الاستقلال؟',icon:'flag',cls:'pol-modal',body:h('div',{class:'pol-view'},note('تتوقف جزية التبعية وتبدأ الحرب مع متبوعتك. لا تختفِ آثار تراجع الثقة بعد الحفظ والتحميل.')),buttons:[{label:'أعلن الاستقلال',value:true,primary:true},{label:'إلغاء',value:false}]}).then(ok=>{if(ok){Game.freeVassal(P,'إعلان الاستقلال');after(scene);}})));
    if (mine.allyCall?.enemy===id&&!Game.atWar(P,id)) box.append(action('لبِّ نداء النصرة',()=>{const ally=mine.allyCall.ally;Game.declareWar(P,id,'نصرة للحليف');Game.addRel(P,ally,10);mine.allyCall=null;after(scene);},null,true));
    box.append(action('عمليات سرية',()=>this.spyDialog(scene,id)));
    return box;
  };
  Panels.diplomaticOfferDialog = function (scene,id,kind) {
    const P=scene.P,c=Game.politicalAssessment(id,P,kind), label={alliance:'عرض حلف',trade:'اتفاق تجارة',marriage:'مصاهرة سياسية',tribute:'طلب جزية'}[kind];
    const consequence={alliance:'تبادل النصرة والمعلومات والعبور؛ يحتفظ الحليف بأولوياته وقواته.',trade:'دخل من المدن والطرق المتصلة؛ يمكن مراجعة الاتفاق بعد أربعة أدوار.',marriage:`الكلفة ${Game.marriageCost()} الآن، وعهد اثنا عشر دوراً. خرقه يضر سمعتك.`,tribute:`تطلب ${Game.tributeAmount(id)} كل دور لثمانية أدوار. لا دفعة فورية؛ القبول شراء للوقت والرفض يضر العلاقة قليلاً.`}[kind];
    UI.modal({title:label+' مع '+Game.fname(id),icon:'treaty',cls:'pol-modal',body:h('div',{class:'pol-view'},note(consequence),assessment(c),note('عرض واحد ثم ثلاثة أدوار قبل مراسلة المملكة مجدداً. يبقى جواب نفس الدور ثابتاً بعد التحميل.')),buttons:[{label:'أرسل العرض',primary:true,keep:true,disabled:!!c.blocked||!!Game.diplomaticWait(P,id),why:c.blocked||'عرض حديث',onClick:cl=>{const r=Game.requestDiplomacy(P,id,kind);if(r.err){UI.toast(r.err);return;}cl();UI.toast(r.why);after(scene);}},{label:'إغلاق'}]});
  };
  Panels.confirmPoliticalBreak = function(scene,id){UI.ask({title:'فضّ الحلف؟',icon:'treaty',cls:'pol-modal',body:h('div',{class:'pol-view'},note('ينتهي تبادل النصرة والعبور والمعرفة. العلاقة −20 وتبقى ذكرى التخلي؛ لا يمكنك إعادة الحلف قبل ثمانية أدوار.')),buttons:[{label:'فضّ الحلف',value:true},{label:'إلغاء',value:false}]}).then(ok=>{if(ok){Game.breakAlliance(scene.P,id,'بقرار مجلس الحكم');after(scene);}});};
  Panels.contribBox=function(P,ally){
    const wars=Game.commonWars(P,ally);if(!wars.length)return null;
    return h('div',{class:'box'},wars.map(enemy=>{const a=Game.alliedContribution(P,enemy),b=Game.alliedContribution(ally,enemy),total=a.points+b.points,share=total?Math.round(a.points/total*100):0;
      return h('div',null,h('b',null,'المساهمة الفعلية ضد '+Game.fname(enemy)),total?h('div',null,h('div',{class:'cbar'},h('i',{style:{width:share+'%'}})),row('أنت / '+Game.fname(ally),`${share}٪ / ${100-share}٪`)):note('لم تُسجّل معارك أو آثار حصار أو تمويل فعلي بعد. طلب المساعدة والوصول وحدهما لا يمنحان مساهمة.'),details('وقائع المساهمة',h('b',null,'دولتك'),...a.parts.map(([k,v])=>row(k,v)),h('b',null,Game.fname(ally)),...b.parts.map(([k,v])=>row(k,v))),note('المشاركة الفعلية تؤثر في الثقة ونصيب الصلح؛ لا تُحتسب مرة ثانية بعد التحميل.'));}));
  };
  Panels.vassalDialog = function(scene,id){const c=Game.vassalAssessment(id,scene.P);UI.modal({title:'التبعية والحماية · '+Game.fname(id),icon:'seal',cls:'pol-modal',body:h('div',{class:'pol-view'},this.vassalTerms(id,scene.P),assessment(c)),buttons:[{label:'اطلب التبعية',primary:true,disabled:!!c.blocked,why:c.blocked,keep:true,onClick:cl=>{const r=Game.demandVassal(scene.P,id);if(r.err){UI.toast(r.why||r.err);return;}cl();UI.toast(r.why);after(scene);}},{label:'إغلاق'}]});};
  Panels.termsText = function(t,P){const bits=[];if(t.payer&&t.gold)bits.push(`${t.payer===P?'تدفع':Game.fname(t.payer)+' تدفع'} ${t.gold} الآن`);if(t.payer&&t.perTurn)bits.push(`${t.payer===P?'تدفع':Game.fname(t.payer)+' تدفع'} ${t.perTurn} كل دور لمدة ${t.turns} (المجموع ${t.perTurn*t.turns})`);if(t.city)bits.push(`تسليم مدينة ${Game.node(t.city)?.name||t.city}`);if(t.captives?.length)bits.push('إطلاق '+t.captives.map(id=>Game.gen(id)?.name||id).join('، '));if(t.vassal)bits.push(Game.fname(t.vassal)+' تقبل التبعية');bits.push(`هدنة ${t.truce||8} أدوار`);return bits.join('؛ ');};
  Panels.peaceDialog = function(scene,id,preset){
    const P=scene.P,F=Game.f(id),mine=Game.f(P);let amount=0,installments=false,city=null,truce=8,vassal=null;
    const selected=new Set(),caps=[...Game.captivesHeldBy(P).filter(g=>g.fid===id),...Game.captivesHeldBy(id).filter(g=>g.fid===P)];
    const terms=()=>({payer:amount>0?P:amount<0?id:null,gold:installments?0:Math.abs(amount),perTurn:installments?Math.ceil(Math.abs(amount)/6):0,turns:installments&&amount?6:0,city,captives:[...selected],truce,vassal});
    const max=(fid)=>installments?Math.floor(Math.max(20,Game.economy(fid).income*.3)*6/10)*10:Math.floor(Math.max(0,Game.f(fid).gold)/10)*10;
    const range=h('input',{id:'pol-peace-range',type:'range','aria-label':'مبلغ عرض الصلح',min:-max(id),max:max(P),step:10,value:0,dir:'ltr'}),value=h('div',{class:'pol-offer-value'}),live=h('div',{id:'pol-peace-live'}),ends=h('div',{class:'pol-range-ends'});
    const send={label:'أرسل عرض الصلح',primary:true,keep:true,onClick:cl=>{const r=Game.proposePeaceTerms(P,id,terms());if(r.err){UI.toast(r.err);return;}cl();if(r.ok){UI.toast('تم الصلح');this.afterPeace(scene);}else this.counterDialog(scene,id,r);}};
    const update=()=>{
      range.min=-max(id);range.max=max(P);amount=clamp(amount,-max(id),max(P));range.value=amount;
      const t=terms(),c=Game.peaceChance(id,P,t),err=Game.validatePeaceTerms(P,id,t)|| (Game.envoyWait(P,id)?'رسول واحد في الدور؛ انتظر الدور التالي':null);
      value.replaceChildren(h('b',null,amount===0?'صلح بلا مال':amount>0?`تدفع ${installments?t.perTurn*6:amount}`:`تطلب ${installments?t.perTurn*6:-amount}`),note(this.termsText(t,P)));
      ends.replaceChildren(h('span',null,rich(`تطلب حتى ${max(id)}`)),h('span',null,rich(`تدفع حتى ${max(P)}`)));
      live.replaceChildren(...[h('div',{class:'pol-willing'},h('span',null,'القبول التقريبي'),bandTag(c.band),h('div',{class:'pol-meter'},h('i',{style:{width:Math.round(c.p*100)+'%'}}))),err?note(err):null,details('لماذا تقبل أو ترفض؟',reasons(c.urge?.parts||[]),note('ميزان الحرب والتنازلات والقدرة على الوفاء تغيّر الموقف؛ هذا تقدير وليس وعداً.'))].filter(Boolean));
      send.disabled=!!err;send.why=err;const b=document.querySelector('.pol-peace-modal .modal-btns button');if(b){b.setAttribute('aria-disabled',String(!!err));b.classList.toggle('off',!!err);b.title=err||'';}
    };
    range.addEventListener('input',()=>{amount=+range.value;update();});
    const installmentsInput=h('input',{type:'checkbox','aria-label':'أقساط الصلح',onchange:e=>{installments=e.target.checked;update();}});
    const citySelect=h('select',{'aria-label':'التنازل عن مدينة',onchange:e=>{city=e.target.value||null;update();}},h('option',{value:''},'لا تنازل عن مدينة'),...[P,id].flatMap(fid=>Game.nodesOf(fid).filter(n=>Game.nodesOf(fid).length>1&&!n.capital).map(n=>h('option',{value:n.id},`${n.name} · ${fid===P?'تمنحها لهم':'تطلبها منهم'}`))));
    const truceSelect=h('select',{'aria-label':'مدة الهدنة',onchange:e=>{truce=+e.target.value;update();}},...[4,8,12,16].map(v=>h('option',{value:v,selected:v===8},`هدنة ${v} أدوار`)));
    const vassalSelect=h('select',{'aria-label':'التبعية ضمن الصلح',onchange:e=>{vassal=e.target.value||null;if(vassal){city=null;citySelect.value='';installments=false;installmentsInput.checked=false;}update();}},h('option',{value:''},'حفظ استقلال الطرفين'),...[P,id].filter(fid=>!Game.vassalAssessment(fid,fid===P?id:P).blocked).map(fid=>h('option',{value:fid},fid===P?'تقبل التبعية لهم':'تطلب خضوعهم لك')));
    amount=Math.round(clamp(preset??Game.peaceFair(id,P,.5),-max(id),max(P))/10)*10;
    UI.modal({title:'مفاوضات الصلح · '+F.name,icon:'dove',cls:'pol-modal pol-peace-modal',body:h('div',{class:'pol-view',id:'pol-peace'},value,range,ends,live,
      details('شروط إضافية للاتفاق',h('label',{class:'pol-check'},installmentsInput,'الدفع على ستة أدوار'),h('div',{class:'pol-filters'},truceSelect,citySelect,vassalSelect),...caps.map(g=>h('label',{class:'pol-check'},h('input',{type:'checkbox',onchange:e=>{e.target.checked?selected.add(g.id):selected.delete(g.id);update();}}),`إطلاق ${g.name} · ${g.fid===P?'قائدك':'قائدهم'}`)),note('التبعية تعني جزية 15٪ من إيراد المدن وواجب الحرب والحماية؛ لا تجمع مع أقساط أو تسليم مدينة.')),
      details('وقائع الحرب',this.warBox(P,id)),note('رسول واحد لكل طرف في الدور. يمكن قبول عرض مضاد محفوظ حتى نهاية الدور؛ لا تغيّر إعادة التحميل الجواب.')),
      buttons:[send,{label:'إغلاق'}]});update();
  };
  Panels.counterDialog=function(scene,id,r){const c=r.counter;UI.modal({title:Game.fname(id)+' تجيب على العرض',icon:'treaty',cls:'pol-modal',body:h('div',{class:'pol-view',id:'pol-counter'},note('الموقف تجاه عرضك: '+r.c.band),c?h('div',null,h('b',null,'العرض المضاد'),note(this.termsText(c,scene.P)),c.vassal?this.vassalTerms(c.vassal,c.vassal===scene.P?id:scene.P):null,note('يحفظ العرض بشروطه حتى نهاية الدور. إذا انتهت الحرب أو تغيرت المدينة أو الأسرى يصبح غير صالح.')):note('لا تسوية قريبة قابلة للوفاء؛ تحتاج المملكة تغيراً في حال الحرب.')),buttons:[c?{label:'اقبل العرض المضاد',primary:true,keep:true,onClick:cl=>{const x=Game.acceptCounter(scene.P,id,c);if(x.err){UI.toast(x.err);return;}cl();this.afterPeace(scene);}}:null,{label:c?'ارفض العرض':'إغلاق',onClick:()=>after(scene)}]});};
  const oldAfterPeace=Panels.afterPeace;
  Panels.afterPeace=function(scene){Game.save();if(Game.spoilsTo){oldAfterPeace.call(this,{...scene,afterAction:()=>{Game.save();if(Game.spoilsTo)this.afterPeace(scene);else after(scene);}});}else after(scene);};
  Panels.spyDialog=function(scene,target){
    const P=scene.P;let op='scout',pickT=null,sub='stores';const body=h('div',{class:'pol-view',id:'pol-espionage'});
    const execute={label:'نفّذ العملية',primary:true,keep:true,onClick:close=>{const r=Game.spyOp(P,target,op,pickT,op==='sabotage'?sub:undefined);if(r.err){UI.toast(r.err);return;}close();Game.save();UI.modal({title:r.ok?'نجحت العملية':'فشلت العملية',icon:r.found?'dagger':SPY_OPS[op].icon,cls:'pol-modal',body:h('div',{class:'pol-view'},note(r.text)),buttons:[{label:'حسناً',onClick:()=>after(scene)}]});}};
    const render=()=>{
      const list=Game.spyTargets(P,target,op);if(!list.some(x=>x.id===pickT))pickT=list[0]?.id??null;
      const c=pickT!=null?Game.spyAssessment(P,target,op,pickT,op==='sabotage'?sub:undefined):null;
      body.replaceChildren(h('div',{class:'pol-op-tabs'},Object.entries(SPY_OPS).map(([k,o])=>h('button',{class:k===op?'on':'',onclick:()=>{op=k;pickT=null;render();}},icon(o.icon),o.name))),note(SPY_OPS[op].desc));
      if(SPY_OPS[op].target!=='realm')body.append(h('label',null,'الهدف',h('select',{'aria-label':'هدف العملية',onchange:e=>{pickT=list.find(x=>String(x.id)===e.target.value)?.id;render();}},list.map(x=>h('option',{value:x.id,selected:x.id===pickT},`${x.name}${x.cooldown?' · هدف متيقظ':''}`)))));
      if(op==='sabotage')body.append(h('label',null,'نوع التخريب',h('select',{'aria-label':'نوع التخريب',onchange:e=>{sub=e.target.value;render();}},Object.entries(SABOTAGE).map(([k,s])=>h('option',{value:k,selected:k===sub},s.name)))),note(SABOTAGE[sub].desc));
      if(c)body.append(h('div',{class:'pol-banner'},row('كلفة العملية',c.cost+' ذهب'),row('نجاح تقريبي',c.success),row('كشف الفاعل',c.discovery),note(c.consequence),note(c.cooldown),details('أسباب التقدير وأمن الهدف',reasons(c.parts)),c.err?note(c.err):null));
      const err=c?.err||(!c?'لا هدف صالح':null);execute.disabled=!!err;execute.why=err;const button=body.closest('.modal')?.querySelector('.modal-btns button');if(button){button.setAttribute('aria-disabled',String(!!err));button.classList.toggle('off',!!err);button.title=err||'';}
    };render();UI.modal({title:'العمليات السرية · '+Game.fname(target),icon:'eye',cls:'pol-modal',body,buttons:[execute,{label:'إغلاق'}]});
  };
  Panels.counterSpyDialog=function(scene){
    const P=scene.P,cities=Game.nodesOf(P).sort((a,b)=>Game.spyEffects(b).length-Game.spyEffects(a).length);let pick=cities[0]?.id,close;
    const out=h('div'),select=h('select',{'aria-label':'المدينة المحمية',onchange:e=>{pick=e.target.value;render();}},cities.map(n=>h('option',{value:n.id},n.name)));
    const render=()=>{const n=Game.node(pick),v=Game.securityPreview(n,P),security=Game.citySecurity(n),effects=Game.spyEffects(n);out.replaceChildren(...[row('كلفة التفتيش والحراسة',v.cost+' ذهب'),note(v.desc),effects.length?effects.map(e=>note(`${e.name} · بقي ${e.left} أدوار: ${e.text}`)):note('لا أثر تخريب معروف قائم هنا.'),details('ما يحمي هذه المدينة؟',reasons(security.parts)),action('نظّم التفتيش والحراسة',()=>{const err=Game.secureCity(n,P);if(err){UI.toast(err);return;}Game.save();close();UI.toast('بدأ التفتيش والإصلاح');after(scene);},v.err,true)].flat());};render();
    close=UI.modal({title:'الحماية من العملاء',icon:'shield',cls:'pol-modal',body:h('div',{class:'pol-view',id:'pol-counterspy'},select,out),buttons:[{label:'إغلاق'}]});
  };
  Panels.offerDialog=function(scene,o){return UI.ask({title:'رسول من '+Game.fname(o.from),icon:'treaty',cls:'pol-modal',body:h('div',{class:'pol-view',id:'pol-incoming'},note({peace:this.termsText(o.terms,scene.P),alliance:'حلف مع واجب النصرة وتبادل المرور والمعلومات.',trade:'اتفاق تجارة على الطرق المتصلة.',marriage:'مصاهرة وعهد سياسي طويل.',tribute:`جزية ${o.terms.amount} كل دور لمدة ثمانية أدوار.`,vassal:'عقد تبعية لقاء الحماية.'}[o.kind]),o.kind==='vassal'?this.vassalTerms(scene.P,o.from):null,note(`يسقط العرض بعد الدور ${o.until+1} أو إذا تغيرت حالة المملكة.`)),buttons:[{label:'اقبل الشروط',value:true,primary:true},{label:'ارفض',value:false}]}).then(accept=>{const r=Game.resolvePoliticalOffer(o.id,accept);UI.toast(r.err||(accept?'قُبل الاتفاق':'رُفض العرض'));after(scene);return accept;});};
  const proposal=Panels.proposal;
  Panels.proposal=function(p){if(p.offerId){const o=Game.politicalState().offers[p.offerId];return this.offerDialog(App.scene,o);}if(p.kind==='vassal')return UI.ask({title:'طلب التبعية · '+Game.fname(p.from),icon:'seal',cls:'pol-modal',body:h('div',{class:'pol-view'},this.vassalTerms(Game.S.player,p.from)),buttons:[{label:'اقبل التبعية',value:true},{label:'ارفض',value:false}]});return proposal.call(this,p);};
  const coord=Panels.coordDialog;
  Panels.coordDialog=function(...args){coord.apply(this,args);const modal=document.querySelector('.modal-layer:last-child .modal');if(modal){modal.classList.add('pol-modal');modal.querySelector('.modal-body>div')?.classList.add('pol-view');}};
})();
