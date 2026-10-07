'use strict';
// Leader presentation. All recruitment decisions and saved state belong to leader-system.js.
function prestigeChip(g){
 const p=Game.prestigeOf(g);
 return h('span',{class:'pchip '+p.cls,title:'مكانة مكتسبة من الخبرة والسمعة'},p.name);
}
function leaderModal(opts){
 const prior=document.activeElement;
 let close;
 const key=e=>{
  const layers=document.querySelectorAll('.modal-layer');if(layers[layers.length-1]!==layer)return;
  if(e.key==='Escape'){e.preventDefault();close();}
  if(e.key==='Tab'){
   const all=[...layer.querySelectorAll('button:not([disabled]),input:not([disabled]),summary,[tabindex="0"]')].filter(x=>x.getClientRects().length);
   if(!all.length)return;
   if(e.shiftKey&&document.activeElement===all[0]){e.preventDefault();all.at(-1).focus();}
   else if(!e.shiftKey&&document.activeElement===all.at(-1)){e.preventDefault();all[0].focus();}
  }
 };
 close=UI.modal({...opts,cls:'leader-modal '+(opts.cls||''),dismissable:true,onClose:()=>{document.removeEventListener('keydown',key);if(prior?.isConnected)prior.focus();opts.onClose?.();}});
 const layer=document.querySelector('.modal-layer:last-child'),box=layer.querySelector('.modal');
 box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',opts.title);box.setAttribute('dir','rtl');
 document.addEventListener('keydown',key);layer.querySelector('button,input,summary')?.focus({preventScroll:true});return close;
}
function leaderFact(label,value,cls=''){return h('div',{class:'leader-fact '+cls},h('span',null,label),h('b',null,rich(value)));}
function leaderSkills(g){
 const p=Game.leaderIdentity(g);
 return h('div',{class:'leader-skills'},Object.entries(LEADER_SKILLS).map(([k,name])=>h('div',{class:'leader-skill'},h('span',null,name),h('span',{class:'skill-track','aria-hidden':'true'},h('i',{style:`width:${p.skills[k]*20}%`})),h('bdi',null,`${p.skills[k]}/5`))));
}
function leaderPerks(g){return h('div',{class:'leader-perks'},Game.leaderPerks(g).map(p=>h('div',null,h('b',null,p.name),h('p',null,p.text))));}
function leaderStatus(g){return {army:'في الميدان',gov:'والي مدينة',pool:'في المجلس',captive:'في الأسر',dead:'راحل',retired:'معتزل',exiled:'منفي',cand:'يطلب الخدمة'}[g.status]||'في الخدمة';}
function leaderHeader(g,size=112){
 const p=Game.leaderIdentity(g);
 return h('div',{class:'leader-head '+Game.prestigeOf(g).cls},Portrait.el(g,size),h('div',{class:'leader-heading'},h('div',{class:'leader-eyebrow'},prestigeChip(g),h('span',null,p.identity)),h('h3',null,g.name),h('p',{class:'leader-sub'},p.name,' · ',leaderStatus(g)),h('span',{class:'leader-stars',title:'خبرة تنفيذ الأوامر وقيادة الرجال'},stars(g.rank))));
}
Object.assign(Explain,{
 genWage(g){const d=Game.wageDemand(g);return {icon:'coins',title:`عطاء ${g.name}`,value:`${Game.genSalary(g)} كل دور`,state:g.status==='pool'?'يتقاضى نصف العطاء أثناء انتظار التكليف.':'يتقاضى عطاءه الكامل في الخدمة.',now:[['المتفق عليه',g.wage??d.total],['توقعه الحالي',d.total]],improve:d.reasons,note:'السمعة والخبرة والشخصية وحال الدولة تؤثر في توقعه. العطاء السخي يساعد الولاء؛ لا يضمنه.'};},
 capacity(fid){const c=Game.cmdCapacity(fid);return {icon:'seal',title:'مجلس القيادة',value:`${Game.cmdCount(fid)} من ${c.slots}`,state:'مقاعد تتسع مع الدولة وديوان الجند. لا توجد وسيلة لشراء وفود الاستقطاب.',from:c.parts.map(([k,v])=>[k,'+'+v]),improve:['أربعة أدوار على الأقل بين الوفود؛ الفرصة تبقى ثمانية أدوار.','ثلاثة من نفوذ الاستبدال كحد أقصى؛ استبدال واحد فقط في كل وفد.','فتح مدينة مهمة أو تقدم الدولة يكسب نفوذاً؛ الفتح المتكرر للمدينة نفسها لا يعيده.'],note:'الحاكم والضابط المكلّف لا يشغلان مقعداً. لكل وفد مرشحان، وتختار واحداً.'};},
});
Object.assign(Panels,{
 genCard(g,extra){
  Game.ensureLeader(g);const p=Game.leaderIdentity(g);
  return h('div',{class:'gcard leader-card '+Game.prestigeOf(g).cls,tabindex:0,role:'button','aria-label':'ملف '+g.name,onclick:()=>this.cmdProfile(g),onkeydown:e=>{if(e.target===e.currentTarget&&['Enter',' '].includes(e.key)){e.preventDefault();this.cmdProfile(g);}}},
   h('div',{class:'leader-card-main'},Portrait.el(g,70),h('div',{class:'leader-card-copy'},h('div',{class:'leader-eyebrow'},prestigeChip(g),h('span',null,p.identity)),h('h3',null,g.name),h('p',null,p.name,' · ',leaderStatus(g)),h('div',{class:'leader-card-stats'},h('span',null,stars(g.rank)),Game.employed(g)&&!Game.isRuler(g)?h('span',null,`الولاء ${Math.round(g.loy??50)} · العطاء ${Game.genSalary(g)}`):null))),
   g.ask?h('div',{class:'leader-request-flag'},icon('bell'),Game.leaderRequestText(g.ask)):null,extra||null);
 },
 cmdProfile(g){
  Game.enrichGen(g);Game.ensureLeader(g);const own=g.fid===Game.S.player,p=Game.leaderIdentity(g),ability=Game.leaderAbility(g),voice=Voices.current(g),rec=g.rec||{},bond=g.bond;
  const actions=h('div',{class:'leader-actions'});let close;
  const refresh=()=>{close();App.scene?.afterAction?.();this.cmdProfile(g);};
  const act=(label,fn,cls='')=>actions.appendChild(h('button',{class:'btn '+cls,onclick:()=>{const e=fn();if(e?.pending)return;if(e)UI.toast(e);else refresh();}},label));
  if(own&&Game.employed(g)&&!Game.isRuler(g)){
   if(g.ask?.k==='raise')act(`وافق على عطاء ${g.ask.to}`,()=>Game.answerAsk(g,true),'primary');
   if(g.ask)act('رفض الطلب',()=>Game.answerAsk(g,false));
   act(`تكريم · ${Game.honorCost(g)} ذهب`,()=>Game.honorGeneral(g.fid,g));
   if(!Game.isHeir(g))act('إعفاء من الخدمة',()=>{
    UI.ask({title:`إعفاء ${g.name}؟`,body:h('p',null,'يغادر المجلس ولا يعود إلى وفود الاستقطاب. يتأثر رفاقه بفقد خدمته، ولا تحصل على فرصة بديلة.'),buttons:[{label:'إعفاء القائد',danger:true,value:true},{label:'تراجع',value:false}]}).then(ok=>{if(!ok)return;const e=Game.retireGeneral(g);if(e)UI.toast(e);else refresh();});return {pending:true};
   });
  }
  const ties=Object.entries(g.relationships).map(([id,r])=>({g:Game.gen(id),kind:r.kind})).filter(x=>x.g);
  for(const f of Game.friendsOf(g))if(!ties.some(x=>x.g.id===f.id))ties.push({g:f,kind:'friend'});
  close=leaderModal({title:'سجل القائد',cls:'leader-profile',body:h('div',null,
   leaderHeader(g,136),h('p',{class:'leader-bio'},Game.leaderBio(g)),
   h('div',{class:'leader-meta'},h('span',null,Game.fname(g.fid)),h('span',null,Game.cmdAge(g)!=null?`العمر ${Game.cmdAge(g)}`:'العمر غير محدد'),h('span',null,Game.catOf(g)?'من رجال عصره':'قائد محلي')),
   voice?h('blockquote',{class:'leader-quote'},h('p',null,'«',voice.text,'»'),h('footer',null,(g.status==='dead'?'من ذاكرته: ':'')+voice.why)):null,
   g.ask&&own?h('div',{class:'leader-request'},h('b',null,'طلب معلق'),h('p',null,Game.leaderRequestText(g.ask)),h('small',null,`حتى الدور ${(g.ask.until??g.ask.turn+4)+1}. تجاهله يترك ضغينة.`)):null,
   h('div',{class:'leader-columns'},h('section',null,h('h4',null,'موهبته وحدوده'),leaderFact('يتقن',ability.strong),leaderFact('يضعف في',ability.weak,'weak'),g.flaw?leaderFact('طبعه الصعب',FLAWS[g.flaw]?.desc||FLAWS[g.flaw]?.name):null,leaderSkills(g),leaderPerks(g)),
    h('section',null,h('h4',null,'العهد مع الحاكم'),h('div',{class:'leader-bonds'},leaderFact('الثقة',bond.trust),leaderFact('الاحترام',bond.respect),leaderFact('الطموح',bond.ambition),leaderFact('الرأي في الحاكم',bond.opinion),leaderFact('الامتنان',bond.gratitude),leaderFact('الضغائن',bond.resentment)),leaderFact('الولاء',Math.round(g.loy??50)),Game.employed(g)&&!Game.isRuler(g)?leaderFact('العطاء المتفق عليه',`${g.wage??Game.wageDemand(g).total} كل دور`):null,
     h('p',{class:'leader-note'},g.status==='pool'?'يدفع له نصف العطاء حتى يتولى مهمة.':'العلاقة تتغير مع المسؤولية والوفاء والتقدير والخسائر.'),ties.length?h('div',{class:'leader-ties'},ties.map(x=>h('button',{class:'chip',onclick:()=>{close();this.cmdProfile(x.g);}},`${x.kind==='rival'?'منافس':'رفيق'}: ${x.g.name} · ${leaderStatus(x.g)}`))):h('p',{class:'leader-note'},'تنشأ رفقة السلاح مع الخدمة المشتركة.'))),
   h('section',{class:'leader-record'},h('h4',null,'ما صنعته هذه الحملة'),h('div',{class:'leader-bonds'},leaderFact('المعارك',`${rec.battles||0} · نصر ${rec.wins||0} · هزيمة ${rec.losses||0}`),leaderFact('الخبرة',Math.floor(g.xp||0)),leaderFact('الجراح',rec.wounds||0),leaderFact('الأسر',rec.captured||0)),h('p',{class:'leader-note'},ability.progress),h('p',{class:'leader-note'},'القيادة العالية تسرّع الإتقان؛ التموين أو الاستطلاع العالي يمنح حركة إضافية عند إتقانه. الإداري يقدّر الولاية، والثبات يخفف أثر الهزيمة، والنفوذ يزيد أثر المنافسة في المجلس.'),(g.titles||[]).length?h('p',null,'ألقابه: '+g.titles.map(t=>t.t).join('، ')):null),
   (g.dialogue||[]).length?h('details',{class:'leader-memories'},h('summary',null,'ذاكرة العهد'),h('ol',null,g.dialogue.slice(-8).reverse().map(d=>h('li',null,h('b',null,`الدور ${d.turn+1} · ${d.why}`),h('p',null,d.text))))):null,
   actions),buttons:[{label:'إغلاق السجل',ghost:true}]});
 },
 councilBox(scene){
  const fid=scene.P,ops=Game.oppsOf(fid),capacity=Game.cmdCapacity(fid);
  return h('section',{class:'leader-council'},h('div',{class:'leader-council-title'},h('div',null,h('span',{class:'leader-eyebrow'},'ديوان الرجال'),h('h3',null,'مجلس القيادة')),h('b',null,`${Game.cmdCount(fid)} / ${capacity.slots}`)),
   h('p',null,'وفدان معلّقان كحد أقصى. كل وفد يعرض رجلين؛ اختيار أحدهما ينهي الفرصة. يأتي الاستقطاب بإنجازات الحملة.'),
   h('div',{class:'leader-council-metrics'},h('span',null,`نفوذ الاستبدال ${Game.draftOf(fid)} / 3`),h('button',{class:'chip',onclick:e=>Help.explain(e.currentTarget,Explain.capacity(fid))},'المقاعد والقواعد'),h('button',{class:'chip',onclick:()=>this.leaderMemorials(fid)},'سجل الغائبين')),
   ops.length?h('div',{class:'leader-delegations'},ops.map(op=>h('button',{class:'btn leader-delegation',onclick:()=>this.oppDialog(scene,op)},h('b',null,OPP_WHY[op.why]||op.why),h('span',null,`باقي ${Math.max(0,op.expires-Game.S.turn)} أدوار · ${op.cands.filter(Boolean).map(c=>c.n).join(' / ')}`)))):h('p',{class:'leader-note'},'لا وفد ينتظر الآن. فتح مدينة مهمة أو تقدم الدولة أو نصر بارز قد يجذب رجالاً بعد انقضاء مهلة الاستقطاب.'));
 },
 leaderMemorials(fid){
  const list=(Game.S.leaders?.memorials||[]).filter(m=>m.fid===fid).slice().reverse();let close;
  close=leaderModal({title:'سجل الغائبين',cls:'leader-profile',body:h('div',{class:'leader-memorials'},h('p',{class:'leader-bio'},'تبقى أعمال الرجال بعد غيابهم. يذكر المجلس من فقده في هذه الحملة.'),list.length?list.map(m=>h('button',{class:'leader-memorial',onclick:()=>{const g=Game.gen(m.id);if(g){close();this.cmdProfile(g);}}},h('b',null,m.name),h('span',null,`${{killed:'رحل',retired:'اعتزل',exiled:'نُفي',betrayed:'غادر إلى راية أخرى'}[m.fate]||'غاب'} · الدور ${m.turn+1}`),h('small',null,`${m.title} · ${m.wins} انتصارات`))):h('p',null,'لم يسجل المجلس فقداً بعد.')),buttons:[{label:'إغلاق'}]});
 },
 oppDialog(scene,op){
  if(!Game.oppsOf(scene.P).includes(op)){UI.toast('انتهت الفرصة');return;}
  let close;
  const card=(c,i)=>{
   if(!c)return h('article',{class:'leader-candidate departed'},h('h3',null,'غادر المرشح'),h('p',null,'يمكنك التفاوض مع المرشح الباقي.'));
   const g=Game.candView(c,scene.P),p=Game.leaderIdentity(g),a=Game.leaderAbility(g),room=Game.cmdRoom(scene.P)>0;
   return h('article',{class:'leader-candidate '+Game.prestigeOf(g).cls,'data-candidate':i},
    leaderHeader(g,144),h('p',{class:'leader-bio'},Game.leaderBio(g)),
    h('p',{class:'leader-context'},Game.catOf(g)?`قادماً إلى مجلس ${Game.fname(scene.P)} في عام ${Game.year()}؛ ${p.need}.`:`من رجال ${Game.node(g.home)?.name||'الإقليم'}؛ خبرة محلية ومكانة ناشئة.`),
    leaderSkills(g),leaderFact('نقطة قوة',a.strong),leaderFact('نقطة ضعف',a.weak,'weak'),leaderPerks(g),
    h('div',{class:'leader-candidate-bottom'},h('div',{class:'leader-offer-facts'},leaderFact('يتوقع كل دور',`${g.demand.total} ذهب`),leaderFact('الثقة الأولية',p.trust>=60?'راسخة نسبياً':p.trust<45?'حذرة جداً':'حذرة'),leaderFact('الطموح',p.ambition>=70?'مرتفع':p.ambition<40?'معتدل':'حاضر')),
     h('button',{class:'btn primary leader-negotiate',disabled:!room,onclick:()=>{close();this.negotiateDialog(scene,op,i);}},room?'التفاوض مع '+g.name:'المجلس ممتلئ'),
     h('button',{class:'btn ghost leader-reroll',disabled:Game.draftOf(scene.P)<1||op.rerolls>=1,onclick:()=>{const e=Game.replaceCand(scene.P,op.id,i);if(e)UI.toast(e);else{close();this.oppDialog(scene,op);}}},op.rerolls?'استُخدم استبدال الوفد':'استبدال · نفوذ واحد')));
  };
  close=leaderModal({title:'وفد إلى مجلس القيادة',cls:'leader-recruitment',body:h('div',null,
   h('div',{class:'leader-intro'},h('span',{class:'leader-eyebrow'},OPP_WHY[op.why]||op.why),h('h3',null,'رجلان. عهد واحد.'),h('p',null,`اختر من يناسب حملتك. ينصرف الآخر، ولك استبدال مرشح واحد في هذا الوفد. ينتهي الوفد بعد ${Math.max(0,op.expires-Game.S.turn)} أدوار.`)),
   Game.cmdRoom(scene.P)<=0?h('p',{class:'leader-request'},'مجلسك ممتلئ. وسّع قدرته أو أعفِ قائداً قبل تقديم عرض.'):null,
   h('nav',{class:'leader-compare-nav','aria-label':'مقارنة المرشحين'},op.cands.map((c,i)=>c?h('button',{class:'chip',onclick:e=>{const body=e.currentTarget.closest('.modal-body'),target=body.querySelector(`[data-candidate="${i}"]`),nav=body.querySelector('.leader-compare-nav');body.scrollTop+=target.getBoundingClientRect().top-body.getBoundingClientRect().top-nav.offsetHeight-12;}},h('b',null,c.n),h('small',null,`${Game.candView(c,scene.P).demand.total} ذهب / دور`)):null)),
   h('div',{class:'leader-candidates'},op.cands.map(card))),buttons:[{label:'العودة إلى المجلس',ghost:true}]});
 },
 negotiateDialog(scene,op,i){
  const c=op.cands[i];if(!c)return;const g=Game.candView(c,scene.P),dem=g.demand.total;
  let wage=dem,promise=false;
  const value=h('output',{class:'leader-wage','for':'leader-wage'}),reaction=h('p',{class:'leader-reaction','aria-live':'polite'}),message=h('p',{class:'leader-neg-message','aria-live':'polite'}),attempts=h('p',{class:'leader-note'});
  const update=()=>{value.textContent=`${wage} ذهب / دور`;const r=Game.offerReaction(c,scene.P,wage,promise);reaction.textContent=r.name;reaction.dataset.reaction=r.k;attempts.textContent=`باقي ${2-(op.tries[i]||0)} عروض. المقدم عند القبول ${wage} ذهب؛ في انتظار التكليف يدفع نصف العطاء.`;};
  const slider=h('input',{id:'leader-wage',type:'range',min:Math.max(1,Math.floor(dem*.55)),max:Math.floor(dem*1.5),step:1,value:dem,'aria-label':'عرض العطاء لكل دور',oninput:e=>{wage=+e.target.value;update();}});
  update();
  leaderModal({title:'التفاوض على العهد',cls:'leader-negotiation',body:h('div',null,leaderHeader(g,96),
   leaderFact('العطاء المتوقع',`${dem} ذهب كل دور`),
   h('div',{class:'leader-salary'},h('label',{'for':'leader-wage'},'عرضك للقائد'),value,slider,reaction,message),
   Game.leaderIdentity(g).ambition>=60?h('label',{class:'leader-promise'},h('input',{type:'checkbox',onchange:e=>{promise=e.target.checked;update();}}),h('span',null,'عهد بقيادة جيش من خمس وحدات خلال أربعة أدوار. يعزز القبول، وإخلافه يضر الثقة.')):null,
   attempts,h('blockquote',{class:'leader-quote'},h('p',null,`«${Game.leaderIdentity(g).need}؛ ثم نتفق على العطاء».`)),h('p',{class:'leader-note'},'يقدّر عرضه بناءً على '+g.demand.reasons.join('، ')+'.'),h('p',{class:'leader-note'},'القبول تقدير لا ضمان. العرض المتدني جداً يدفعه إلى الرحيل فوراً. الراتب العالي لا يشتري وفاءً مطلقاً.')),
   buttons:[{label:'قدّم العرض',primary:true,keep:true,onClick:cl=>{
    const r=Game.proposeContract(scene.P,op.id,i,wage,promise);
    if(r.err){message.textContent=r.err;message.scrollIntoView({block:'nearest'});return;}
    if(r.ok){cl();scene.afterAction();this.cmdProfile(r.g);return;}
    message.textContent=r.msg;update();if(!r.gone)message.scrollIntoView({block:'nearest'});
    if(r.gone){cl();scene.afterAction();if(Game.oppsOf(scene.P).includes(op))this.oppDialog(scene,op);UI.toast(r.msg,4500);}
   }},{label:'العودة للوفد',onClick:()=>this.oppDialog(scene,op)}]});
 },
 generalPicker(fid,opts={}){
  return new Promise(resolve=>{
   const pool=Game.poolOf(fid).filter(g=>!Game.isOfficer(g)),list=h('div',{class:'glist'});let close,selected=false;
   const done=id=>{selected=true;close();resolve(id);};
   for(const g of pool)list.appendChild(this.genCard(g,h('button',{class:'btn primary',onclick:e=>{e.stopPropagation();done(g.id);}},'عهد القيادة')));
   close=leaderModal({title:opts.title||'اختر قائداً',cls:'leader-profile',body:h('div',null,h('p',{class:'leader-note'},'قادة المجلس ينتظرون تكليفك. الضابط المكلّف بديل محدود بلا موهبة، لا يكتسب مراتب القادة ولا يشغل مقعداً.'),list),onClose:()=>{if(!selected)resolve(null);},buttons:[opts.allowOfficer!==false?{label:'تكليف ضابط · 40 ذهب',disabled:Game.f(fid).gold<40,why:'الذهب لا يكفي',keep:true,onClick:()=>done('officer')}:null,{label:'إلغاء'}]});
  });
 },
});
(()=>{
 const kingdomBody=Panels.kingdomBody;
 Panels.kingdomBody=function(scene,body){kingdomBody.call(this,scene,body);if((scene.kingTab||'goals')==='gens'){const seg=body.querySelector('.seg'),box=this.councilBox(scene);if(seg?.nextSibling)body.insertBefore(box,seg.nextSibling);else body.appendChild(box);}};
 const focus=CampaignScene.prototype.focusAlert;
 CampaignScene.prototype.focusAlert=function(a){if(a.win==='opps'){this.openKingdom('gens');const op=Game.oppsOf(this.P)[0];if(op)Panels.oppDialog(this,op);return;}if(a.win?.startsWith('gen:')){const g=Game.gen(a.win.slice(4));if(g)Panels.cmdProfile(g);return;}return focus.call(this,a);};
})();
