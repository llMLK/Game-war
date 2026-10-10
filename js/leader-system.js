'use strict';
// Phase B. Leader state and recruitment rules; existing campaign actions emit the events.
// All selection/negotiation entropy and pending offers live in the save, not the UI.
const LEADER_RULES={version:2,opportunities:2,rerolls:3,cooldown:4,offerLife:8,attempts:2};
const LEADER_SKILLS={command:'القيادة',logistics:'التموين',stewardship:'الإدارة',influence:'النفوذ',scouting:'الاستطلاع',resolve:'الثبات'};
const LEADER_PERSONALITIES={
 loyal:{name:'وفيّ بالعهد',ambition:30,trust:65,negotiation:-.06,need:'حفظ العهد والرفقة'},
 proud:{name:'عزيز النفس',ambition:72,trust:45,negotiation:.06,need:'منصب يليق بمقامه'},
 careful:{name:'متأنٍّ',ambition:40,trust:50,negotiation:.02,need:'وضوح المهمة وضمان العطاء'},
 bold:{name:'مقدام',ambition:65,trust:52,negotiation:0,need:'قيادة في الميدان'},
 pragmatic:{name:'عملي',ambition:50,trust:52,negotiation:0,need:'مهمة واضحة وأجر منتظم'},
 ambitious:{name:'طالب مكانة',ambition:85,trust:38,negotiation:.1,need:'مقام ونفوذ في المجلس'},
 austere:{name:'منضبط',ambition:42,trust:58,negotiation:-.03,need:'الانضباط وحفظ الرجال'},
};
Object.assign(Game,{
 leaderState(fid){
  const S=this.S;S.leaders=S.leaders||{version:LEADER_RULES.version,factions:{},memorials:[]};
  S.leaders.factions=S.leaders.factions||{};S.leaders.memorials=S.leaders.memorials||[];
  if(S.leaders.seed==null)S.leaders.seed=Math.floor(R()*4294967296);
  const st=S.leaders.factions[fid]||(S.leaders.factions[fid]={});
  for(const [k,v] of Object.entries({earned:{},retiredNames:[],lastGrant:-99,lastHire:-99,serial:0,hires:0,lastTick:-1,lossGrants:0}))if(st[k]==null)st[k]=v;
  return st;
 },
 leaderIdentity(g){
  const e=this.catOf(g)||{},flaw=g.flaw;
  const personality=e.persona||({arrogant:'proud',disloyal:'ambitious',greedy:'ambitious',reckless:'bold',cautious:'careful',harsh:'austere'}[flaw])||({brave:'bold',defender:'loyal',logistician:'austere',siege:'careful'}[g.trait])||'pragmatic';
  const traits={command:g.lead||1,logistics:g.trait==='logistician'?5:2,stewardship:g.trait==='merchant'?5:1,influence:Math.max(1,Math.min(5,Math.ceil((g.fame||0)/20))),scouting:['swift','desert','mountaineer'].includes(g.trait)?5:2,resolve:['brave','defender'].includes(g.trait)?5:3,...e.aptitudes};
  return {key:personality,...LEADER_PERSONALITIES[personality],identity:e.identity||ARCH[g.trait||'none'].name,skills:traits,ambition:e.ambition??LEADER_PERSONALITIES[personality].ambition};
 },
 ensureLeader(g){
  if(!g)return g;
  const p=this.leaderIdentity(g);
  g.bond=g.bond||{};
  for(const [k,v] of Object.entries({trust:p.trust,respect:50,resentment:0,gratitude:0,opinion:Math.round((p.trust+50)/2),ambition:p.ambition}))g.bond[k]=clamp(Number.isFinite(g.bond[k])?g.bond[k]:v,0,100);
  g.growth=g.growth||{path:g.trait||'none',insight:0,level:0};
  g.dialogue=g.dialogue||[];g.relationships=g.relationships||{};g.leaderFlags=g.leaderFlags||{};
  return g;
 },
 leaderAvailable(e,fid){
  if(!e||e.at!=='cand'||e.src!=='hist'||!this.candValid(e,this.year()))return false;
  if(e.aff&&e.aff!==fid&&this.f(e.aff)?.alive)return false;
  if(e.region&&!this.nodesOf(fid).some(n=>e.region.includes(n.region)||e.region.includes(n.id)))return false;
  if(e.minRep!=null&&this.f(fid).rep<e.minRep)return false;
  return true;
 },
 drawCands(fid,n,exclude=[]){
  const st=this.leaderState(fid),taken=this.takenNames();
  for(const op of Object.values(this.S.opps||{}).flat())for(const c of op.cands||[])if(c)taken.add(c.n);
  for(const name of [...exclude,...st.retiredNames])taken.add(name);
  const r=rng(hashStr(this.S.leaders.seed+':'+this.S.scenario+':'+fid+':'+this.S.turn+':'+st.serial++));
  const pool=this.catalog().filter(e=>this.leaderAvailable(e,fid)&&!taken.has(e.n));
  const out=[];
  while(out.length<n&&pool.length){
   const weights={};for(const e of pool){const tier=this.prestigeOf({fame:e.fame});weights[e.n]=(e.aff===fid?3:1)*(tier.k==='legend'?.18:tier.k==='famous'?.55:1)*(e.fame>=45?1+Math.min(.5,st.hires*.06):1);}
   const name=weightedPick(weights,r),e=pool.splice(pool.findIndex(e=>e.n===name),1)[0];out.push({n:e.n,cat:true,seed:Math.floor(r()*1e9)});
  }
  // Poorly documented courts get modest local officers, never invented famous heroes.
  const homes=this.nodesOf(fid);let attempt=0;
  while(out.length<n&&homes.length&&attempt++<80){
   const home=homes[Math.floor(r()*homes.length)],name=pick(FIC_NAMES[this.cultureOf(fid)]||FIC_NAMES.arab,r)+'، من '+home.name;
   if(taken.has(name)||out.some(c=>c.n===name))continue;
   const trait=pick(['logistician','defender','mountaineer','swift','merchant'],r);
   out.push({n:name,cat:false,src:'local',home:home.id,trait,flaw:pick(['cautious',null,'arrogant'],r),lead:1,seed:Math.floor(r()*1e9),culture:this.cultureOf(fid)});
  }
  return out;
 },
 grantOpp(fid,why,key){
  const F=this.f(fid);if(!F?.alive||F.neutral||F.kind==='horde')return null;
  const st=this.leaderState(fid),identity=key||why+':'+Math.floor(this.S.turn/LEADER_RULES.cooldown);
  this.S.oppKeys=this.S.oppKeys||{};
  if(st.earned[identity]!=null||this.S.oppKeys[fid+':'+identity]!=null)return null;
  // Loss is relief, not a repeatable route to elite candidates.
  if(why==='loss'&&(st.lossGrants>=2||this.S.turn-st.lastHire<8))return null;
  if(this.oppsOf(fid).length>=LEADER_RULES.opportunities||this.S.turn-st.lastGrant<LEADER_RULES.cooldown)return null;
  const cands=this.drawCands(fid,2);if(cands.length!==2)return null;
  st.earned[identity]=this.S.turn;this.S.oppKeys[fid+':'+identity]=this.S.turn;st.lastGrant=this.S.turn;
  if(why==='loss')st.lossGrants++;
  const op={id:'o'+this.S.nextId++,why,key:identity,turn:this.S.turn,expires:this.S.turn+LEADER_RULES.offerLife,cands,tries:{},rerolls:0};
  for(const c of cands)this.freezeCandidate(c,fid);
  this.oppsOf(fid).push(op);
  if(fid===this.S.player)this.alert('imp',`وفد إلى المجلس: ${OPP_WHY[why]||why}`,{icon:'helmet',win:'opps',key:'opp:'+op.id});else this.aiOpp(fid,op);
  return op;
 },
 addDraft(fid,v,why,key){
  const st=this.leaderState(fid),k='reroll:'+(key||why);
  if(st.earned[k]!=null)return;st.earned[k]=this.S.turn;
  this.S.draft=this.S.draft||{};this.S.draft[fid]=clamp(this.draftOf(fid)+v,0,LEADER_RULES.rerolls);
 },
 candView(c,fid){
  const e=c.cat?this.catFind(c.n):null;
  const g={id:null,name:c.n,cat:e?.n,fid,orig:e?.aff||fid,trait:e?.trait||c.trait,flaw:e?e.flaw:c.flaw,lead:e?.lead||c.lead||1,fame:e?.fame||0,rank:1,xp:0,status:'cand',culture:c.culture||this.cultureOf(e?.aff||fid)};
  this.enrichGen(g);this.ensureLeader(g);g.status='cand';g.src=e?'hist':'local';g.home=c.home;
  g.demand=c.quote||this.wageDemand(g,fid);return g;
 },
 wageDemand(g,fid=g.fid){
  const p=this.leaderIdentity(g),tier=PRESTIGE.indexOf(this.prestigeOf(g)),F=this.f(fid);
  const ability=Object.values(p.skills).reduce((a,b)=>a+b,0),base=4+tier*4+(g.lead||1)*2+Math.round(ability/5)+Math.min(5,Math.floor((g.xp||0)/8));
  let factor=1;
  const reasons=['مكانته وخبرته','تخصصه القيادي'];
  if(g.flaw==='greedy'){factor+=.2;reasons.push('تعلقه بالعطاء');}
  if(p.ambition>=70){factor+=.12;reasons.push('طموحه ومكانته بين الأتباع');}
  if(!this.gensOf(fid).some(x=>x!==g&&this.employed(x)&&x.trait===g.trait)){factor+=.08;reasons.push('ندرة اختصاصه في المجلس');}
  if(F?.rep>=70){factor-=.08;reasons.push('سمعة الدولة تجذبه');}
  if(F?.gold>2000){factor+=.08;reasons.push('سعة خزينة الدولة');}
  if(F?.gold<100){factor+=.08;reasons.push('قلقه من انتظام العطاء');}
  if(this.nodesOf(fid).length<=2){factor+=.06;reasons.push('هشاشة موقف الدولة');}
  const wars=this.majors().filter(id=>id!==fid&&this.f(id).alive&&this.atWar(fid,id)).length;
  if(wars>=2){factor+=.08;reasons.push('القتال على جبهات متعددة');}
  if((F?.rep||50)<35){factor+=.08;reasons.push('اضطراب المكانة السياسية');}
  return {total:Math.max(6,Math.round(base*factor)),reasons,parts:[]};
 },
 freezeCandidate(c,fid){
  if(c.seed==null)c.seed=hashStr(c.n+':'+this.S.turn);
  if(!c.quote)c.quote=this.candView(c,fid).demand;
  return c;
 },
 offerReaction(c,fid,wage,promise){
  this.freezeCandidate(c,fid);const g=this.candView(c,fid),p=this.leaderIdentity(g),ratio=wage/g.demand.total;
  const probability=clamp(.58+(ratio-1)*1.5-p.negotiation+(promise&&p.ambition>=60?.08:0)-(c.offended?.16:0),.03,.97);
  return {probability,k:ratio<.65?'offended':probability<.3?'no':probability<.6?'maybe':probability<.85?'ok':'eager',name:ratio<.65?'عرض مهين':probability<.3?'قبول ضعيف':probability<.6?'متردد':probability<.85?'قبول مرجّح':'قبول مرتفع'};
 },
 candFloor(c,fid){return Math.round(this.candView(c,fid).demand.total*.8);},
 replaceCand(fid,opId,idx){
  const op=this.oppsOf(fid).find(o=>o.id===opId);
  if(!op||!op.cands[idx]||op.expires<=this.S.turn)return 'انتهت هذه الفرصة';
  if(op.rerolls>=1)return 'استُعمل الاستبدال الوحيد لهذا الوفد';
  if(this.draftOf(fid)<1)return 'تحتاج إلى نفوذ استقطاب تكسبه من إنجاز مهم';
  const c=this.drawCands(fid,1,op.cands.filter(Boolean).map(c=>c.n))[0];if(!c)return 'لا مرشح مناسب الآن';
  const st=this.leaderState(fid);st.retiredNames.push(op.cands[idx].n);
  this.S.draft[fid]--;op.rerolls++;op.cands[idx]=this.freezeCandidate(c,fid);delete op.tries[idx];this.save();return null;
 },
 proposeContract(fid,opId,idx,wage,promise){
  const op=this.oppsOf(fid).find(o=>o.id===opId),c=op?.cands[idx];
  if(!c||op.expires<=this.S.turn)return{err:'الوفد لم يعد متاحاً'};
  if(!Number.isFinite(wage)||!Number.isInteger(wage)||wage<1)return{err:'حدد راتباً صحيحاً'};
  if(this.takenNames().has(c.n))return{err:'القائد مرتبط بخدمة أخرى'};
  if(c.cat&&!this.leaderAvailable(this.catFind(c.n),fid))return{err:'تغيرت ظروف القائد ولم يعد متاحاً'};
  if(this.cmdRoom(fid)<=0)return{err:'المجلس ممتلئ؛ الإعفاء لا يمنح فرصة جديدة'};
  const g0=this.candView(c,fid),ask=g0.demand.total;
  if(wage>ask*1.6)return{err:'العرض يتجاوز نطاق التفاوض'};
  if(this.f(fid).gold<wage)return{err:'تحتاج إلى مقدم يعادل راتب دور واحد'};
  const attempt=op.tries[idx]||0;if(attempt>=LEADER_RULES.attempts)return{err:'انتهى التفاوض'};
  const reaction=this.offerReaction(c,fid,wage,promise);op.tries[idx]=attempt+1;
  // A saved per-candidate threshold prevents reloading the same offer to reroll acceptance.
  const roll=rng(c.seed)();const insult=wage<ask*.65;
  if(insult)c.offended=true;
  if(insult||roll>reaction.probability){
   const gone=insult||op.tries[idx]>=LEADER_RULES.attempts;
   if(gone){this.leaderState(fid).retiredNames.push(c.n);op.cands[idx]=null;if(!op.cands.some(Boolean))this.dropOpp(fid,op.id);}
   this.save();return{ok:false,gone,msg:insult?'«لم أحضر إلى مجلسكم لأُهان». يغادر المرشح.':gone?'يرفض العرض الأخير ويغادر المجلس.':'لم يطمئن إلى العرض. بقي عرض أخير؛ يمكنك تحسينه.'};
  }
  const g=this.addGeneral(fid,c.n,g0.trait,g0.flaw,1,{lead:g0.lead,fame:g0.fame,culture:g0.culture});
  this.ensureLeader(g);g.src=g0.src;g.home=c.home;g.wage=wage;g.contract={signed:this.S.turn,expected:ask,advance:wage};this.f(fid).gold-=wage;
  g.loy=clamp(58+this.leaderIdentity(g).trust/5+(wage/ask-1)*20-(c.offended?15:0),30,92);
  if(promise)g.promise={k:'army',until:this.S.turn+4};
  const st=this.leaderState(fid);st.hires++;st.lastHire=this.S.turn;
  for(const other of op.cands)if(other&&other!==c)st.retiredNames.push(other.n);
  this.dropOpp(fid,opId);this.linkLeaderTies();this.leaderEvent(g,'recruited',{generous:wage>=ask*1.15});
  this.event('int',`${g.name} يدخل المجلس بعطاء ${wage} كل دور.`,{fids:[fid],imp:2});this.save();return{ok:true,g};
 },
});

const LEADER_EVENTS={
 recruited:{name:'دخول المجلس',trust:3,respect:3,line:'أضع خبرتي في خدمتكم؛ والعهد بيننا يحفظه العمل.'},
 command:{name:'عهد القيادة',trust:5,respect:6,line:'عهدتم إليّ برجالكم. سأقودهم بما أعرف وأتحمل حساب مهمتي.'},
 governor:{name:'ولاية مدينة',trust:5,respect:4,line:'شؤون هذه المدينة أمانة. أحتاج إلى وقت لأعرف أهلها.'},
 recalled:{name:'استدعاء إلى البلاط',trust:-3,respect:-3,line:'أعود إلى المجلس، لكنني أنتظر بيان مهمتي القادمة.'},
 promoted:{name:'خبرة ومكانة',trust:3,respect:5,line:'علّمتني الخدمة ما لا تعلّمه مجالس الكلام.'},
 honored:{name:'تقدير علني',trust:6,respect:8,line:'بلغني تقديركم أمام الرجال؛ سأذكره حين تشتد الأمور.'},
 raise:{name:'حفظ العطاء',trust:6,gratitude:5,line:'بان في العطاء أن جهدي لم يضع عندكم.'},
 denied:{name:'طلب مرفوض',trust:-6,resentment:8,line:'سمعتم طلبي ثم رددتموه. سأزن ما بيننا من عهد.'},
 broken:{name:'عهد لم يُحفظ',trust:-12,resentment:14,line:'طلبت مني الثقة بوعدكم، ثم مضت الأيام دون وفاء.'},
 kept:{name:'وفاء بالعهد',trust:9,gratitude:7,line:'وفيتم بالعهد؛ ومثل هذا يبني الثقة بين الرجال.'},
 victory:{name:'عودة منتصرة',respect:5,line:'للرجال نصيب في هذا النصر؛ لا تدعوا تعبهم يضيع.'},
 decimated:{name:'خسائر قاسية',trust:-6,resentment:5,line:'عدنا برجال أقل مما خرجنا به. أطلب وقتاً لالتقاط الأنفاس.'},
 defeat:{name:'مرارة الهزيمة',respect:-4,trust:-3,line:'أتحمل نصيبي من الهزيمة. لنتعلم قبل أن نعود إلى الميدان.'},
 captured:{name:'في الأسر',trust:-4,line:'أنا في أيدي خصومنا. أرجو ألا ينساني المجلس.'},
 rescued:{name:'العودة من الأسر',trust:14,gratitude:15,line:'لم تتركوني خلف القضبان. هذا دين لا أنساه.'},
 abandoned:{name:'انتظار الفرج',trust:-8,resentment:9,line:'يطول الأسر ويقل الخبر. هل بقي لي مكان في مجلسكم؟'},
 grief:{name:'فقد رفيق',trust:-3,line:'يفتقد الصف صوته. سنحمل ذكراه معنا.'},
 retired:{name:'إعفاء من الخدمة',respect:-4,line:'أترك الخدمة وأحمل معي ما عشته بين رجالكم.'},
 betrayed:{name:'انكسار الرفقة',trust:-7,resentment:6,line:'كان بيننا عهد ثم فرّقتنا الرايات. لن يعود كل شيء كما كان.'},
 rest:{name:'إمهال الرجال',trust:5,gratitude:4,line:'وجد الرجال وقتاً يستعيدون فيه أنفاسهم؛ أحسنتم تقدير حالهم.'},
 city:{name:'عهد المدينة',respect:4,line:'صارت المدينة في عهدتنا؛ حفظ أهلها والطريق إليها تمام العمل.'},
 farewell:{name:'رحيل رفيق من المجلس',trust:-2,line:'يغادر رفيق عرفنا معه الخدمة. سيبقى مكانه بيننا خالياً.'},
 peerHonor:{name:'تكريم رفيق',trust:3,respect:3,line:'قدّرتم رفيقاً خبرنا صدقه في الخدمة. مثل هذا يطمئن رجال المجلس.'},
 lesson:{name:'مجلس خبرة',respect:2,line:'سمعت ممن خبر الطريق قبلي. آخذ من درسه ما يصلح لمهمتي.'},
};
const LEADER_LINES={
 loyal:{victory:'النصر للرجال الذين حفظوا العهد. اذكروا من بقي في الطريق.',defeat:'لم يهزمنا القتال في وفائنا. نجمع الباقين ونفي بحقهم.',rescued:'حين ضاق الأسر بقيت أرجو وفاءكم. اليوم صار العهد أقوى.',command:'تأتمنونني على رجالكم؛ أقبل الأمانة قبل أن أقبل المنصب.',denied:'أقبل قلة العطاء، ويشق عليّ أن يقل ما بيننا من ثقة.',city:'لأهل هذه المدينة عهد علينا؛ لا تدعوا النصر ينسينا واجبنا.'},
 proud:{victory:'شهد الرجال صنيعي اليوم. أنتظر من المجلس أن يعرف قدره.',defeat:'لا أرضى أن يعرفني الناس بهذه الهزيمة. أعيدوا إليّ فرصة تحفظ مقامي.',rescued:'أعدتم لي حريتي ومكاني بين الرجال؛ سأرد الجميل بعمل يليق بي.',command:'هذه قيادة تليق بمقامي. أعطوني صلاحيتها واحكموا عليّ بنتيجتها.',denied:'لم أطلب ما يزيد على قدري. إن كان المجلس لا يعرفه، فالميدان يعرفه.',city:'حملت رايتكم إلى هذه المدينة. ينبغي أن يذكر المجلس من فتح أبوابها.'},
 careful:{victory:'استقام التدبير هذه المرة. لنعرف كلفته قبل أن نطلب حملة أخرى.',defeat:'علينا أن نراجع الطريق والمؤن والقرار؛ تكرار الخطة لن يصلحها.',rescued:'كدت أحسب النجاة بعيدة. لن أستخف بخطر الانقطاع عنكم مرة أخرى.',command:'أقبل القيادة إذا استبانت المهمة والطريق الذي نعود منه.',denied:'كنت أطلب ضماناً يطمئنني إلى الخدمة. أرجو ألا نحتاجه بعد فوات أوانه.',city:'لنثبت الحامية ونؤمّن الطريق قبل أن نتجاوز هذه المدينة.'},
 bold:{victory:'عرفنا موضع ضعفهم فضربناه. للرجال اليوم حق في فرحة النصر.',defeat:'لم تنكسر عزيمتي، لكن الاندفاع وحده لم يكف. أعيد ترتيب رجالي.',rescued:'أعدتموني إلى الهواء والسلاح. سأجعل لعودتي أثراً يراه الرجال.',command:'أخيراً مهمة في الميدان. دعوا لي مجال المبادرة ما دام العهد واضحاً.',denied:'يضيق بي انتظار المجلس. دعوا عملي يثبت ما أطلبه.',city:'فتحنا الطريق؛ ليرتاح الرجال ثم ننظر أين تحتاجون بأسهم.'},
 ambitious:{victory:'وسع النصر اسم دولتكم واسمي معها. ينبغي أن تتسع مسؤوليتي أيضاً.',defeat:'لن أترك هذه الهزيمة تحدد قدري. أحتاج مهمة أستعيد بها مكانتي.',rescued:'افتديتموني لأن لي وزناً في هذا المجلس؛ سأثبت أن تقديركم أصاب.',command:'أقبل هذه المسؤولية وأنتظر أن يكون نجاحها باباً إلى مقام أوسع.',denied:'أرى غيري يتقدم وأنا أنتظر. سأعيد النظر في موضعي بين رجالكم.',city:'أضفنا مدينة إلى سلطانكم. أعطوني من المسؤولية ما يناسب هذا العمل.'},
 austere:{victory:'حفظ النظام صفوفنا. أحصوا من فقدنا وأوصلوا عطاء الباقين.',defeat:'تفرق النظام فتفرق الصف. نعيد الانضباط قبل الكلام عن الثأر.',rescued:'عدت إلى الخدمة. لن أنسى من بذل في فكاكي، ولن أفرط برجالي.',command:'أقبل العهد، وأبدأ بضبط الجند والمؤن. لا يعدل النظام شيء.',denied:'ليس طلبي ترفاً. انتظام الخدمة يحتاج إلى حق معلوم يؤدى في وقته.',city:'اضبطوا الأبواب والحامية، واحفظوا حق أهل المدينة.'},
 pragmatic:{victory:'نجح العمل. لنحول هذا النصر إلى موضع نستطيع الاحتفاظ به.',defeat:'الحساب تغير. نحتاج رجالاً وخطة تناسب ما بقي في أيدينا.',rescued:'حفظتم رجلاً خبر الخدمة. سأرد كلفة إنقاذي بعمل نافع.',command:'حدّدوا ما تريدون وما في يدي، ثم احكموا على ما أنجز.',denied:'إن تعذر الطلب، فبيّنوا البديل. يصعب العمل على وعد غير واضح.',city:'المدينة مكسب إذا أمكن حفظها. سأبدأ بما يجعل بقاءنا فيها ممكناً.'},
};
Object.assign(Game,{
 leaderEvent(g,k,context={}){
  if(!g||this.isOfficer(g))return;
  this.ensureLeader(g);const ev=LEADER_EVENTS[k];if(!ev)return;
  const p=this.leaderIdentity(g),b=g.bond,key=k+':'+(context.key||'');
  const cooldown={honored:8,command:8,governor:8,recalled:4,abandoned:8,promoted:4}[k]??1;
  if(g.leaderFlags[key]!=null&&this.S.turn-g.leaderFlags[key]<cooldown)return;
  g.leaderFlags[key]=this.S.turn;
  for(const field of ['trust','respect','resentment','gratitude']){
   let value=ev[field]||0;
   if(p.key==='proud'&&['honored','denied','recalled'].includes(k))value*=1.5;
   if(p.key==='loyal'&&['rescued','kept','broken'].includes(k))value*=1.4;
   if(p.ambition>=70&&['command','governor'].includes(k))value*=1.35;
   if(k==='governor'&&p.skills.stewardship>=4&&value>0)value+=2;
   if(['defeat','decimated'].includes(k)&&value<0&&p.skills.resolve>=4)value*=.65;
   b[field]=clamp(Math.round(b[field]+value),0,100);
  }
  if(context.generous){b.trust=Math.min(100,b.trust+5);b.gratitude=Math.min(100,b.gratitude+5);}
  b.opinion=clamp(Math.round((b.trust+b.respect)/2+b.gratitude*.15-b.resentment*.4),0,100);
  const intro={proud:'لي مقام أحفظه. ',loyal:'العهد عندي باقٍ. ',careful:'دعونا نزن الأمر. ',bold:'ليكن العمل جوابنا. ',ambitious:'أطلب مقاماً بقدر جهدي. ',austere:'حفظ الرجال أولى. ',pragmatic:''}[p.key];
  const text=LEADER_LINES[p.key]?.[k]||intro+ev.line;
  g.dialogue.push({k,turn:this.S.turn,text,why:context.why||ev.name});g.dialogue=g.dialogue.slice(-16);
 },
 leaderBio(g){
  const e=this.catOf(g);if(e?.bio)return e.bio;
  if(g.name==='خاقان الخزر')return 'يتصدر الخاقان مجلس زعماء السهوب. تقوم سلطته على جمع أصحاب الرايات وحفظ طرق النهر والمراعي، وتحتاج قراراته إلى رضا البيوت القوية.';
  const home=g.home&&this.node(g.home);
  return this.isOfficer(g)?'ضابط مكلّف بتسيير شؤون الفصيل. خبرته محدودة ولا يشغل مقعداً في مجلس القيادة.':`قائد محلي ${home?'من '+home.name:'من رجال الإقليم'}، صنع خبرته في خدمة الحاميات. يبدأ اسمه من أعماله في هذه الحملة.`;
 },
 leaderAbility(g){
  const p=this.leaderIdentity(g),A=ARCH[g.trait||'none']||ARCH.none;
  const detail={loyal:'الوفاء بالوعد والإنقاذ يبنيان معه ثقة أعمق؛ إخلاف الوعد يؤذيه أكثر.',proud:'يتأثر بالتكريم العلني ورفض طلباته أكثر من غيره.',careful:'يتأنى في قبول العروض ويقدّر وضوح المهمة.',bold:'يرغب في قيادة ميدانية؛ الانتظار الطويل يضيق به.',ambitious:'يطلب عطاء أعلى ومقاماً أكبر؛ منحه المسؤولية يقوي الثقة.',austere:'يقبل عطاء أكثر اعتدالاً ويقدّر انتظام الخدمة.',pragmatic:'يزن العطاء والمهمة دون مطالبة بمقام استثنائي.'}[p.key];
  const growth=g.growth?.level||0;
  return {name:p.identity,strong:A.strong,weak:A.weak,detail,progress:growth?`خبرة اختصاص ${growth} من 2؛ ${p.skills.scouting>=4||p.skills.logistics>=4?'نقطة حركة إضافية لجيشه.':'زاد تقديره لنفسه ومكانته القيادية.'}`:'الخبرة تفتح درجتين من إتقان اختصاصه؛ لا تبدّل موهبته أو تمحو عيبه.'};
 },
 leaderPerks(g){
  const a=this.leaderAbility(g),perks=[{name:a.name,text:a.detail}];
  if((g.fame||0)>=45)perks.push({name:'صوت في المجلس',text:'تكريمه يقوّي ثقة رفاقه في الحاكم؛ أسره أو فقده يمس سمعة الدولة.'});
  if((g.fame||0)>=70)perks.push({name:'حلقة الخبرة',text:'كل أربعة أدوار يعلّم قائداً أقل شهرة في الموضع نفسه، إذا بقي ولاؤه مستقراً.'});
  return perks;
 },
 leaderPost(g){return g.status==='pool'?'court:'+g.fid:g.status==='gov'?g.city:g.status==='army'?this.army(g.army)?.node:null;},
 leaderRequestMet(g,q){
  const a=g.army&&this.army(g.army);
  if(q.k==='command')return !!(a&&a.regs.length>=5);
  if(q.k==='rest')return !!(a&&g.restedTurn===this.S.turn&&this.S.turn>q.turn);
  if(q.k==='honor')return g.honored!=null&&g.honored>=q.turn;
  return false;
 },
 leaderRequests(g){
  if(g.fid!==this.S.player||!this.employed(g)||this.isRuler(g)||g.ask||g.promise)return;
  if(this.S.turn-(g.lastRequest??0)<12)return;
  const p=this.leaderIdentity(g),a=g.army&&this.army(g.army);
  let k=null;
  if(a&&g.mem?.some(m=>m.k==='decimated'&&this.S.turn-m.turn<6))k='rest';
  else if(g.status==='pool'&&p.ambition>=60)k='command';
  else if(g.fame>=45&&p.key==='proud'&&this.S.turn-(g.honored??-99)>12)k='honor';
  if(!k)return;g.ask={k,turn:this.S.turn,until:this.S.turn+4};g.lastRequest=this.S.turn;
  this.alert('imp',`${g.name}: ${this.leaderRequestText(g.ask)}`,{icon:'helmet',win:'gen:'+g.id,key:'request:'+g.id});
 },
 leaderRequestText(q){return {command:'يطلب جيشاً من خمس وحدات خلال أربعة أدوار',rest:'يطلب قضاء دور دون حركة أو حصار في مدينة صديقة',honor:'يطلب تكريماً أمام المجلس',raise:`يطلب رفع العطاء إلى ${q.to||0} كل دور`}[q.k]||'';},
 memorial(g,fate,former){
  if(!g||this.isOfficer(g))return;
  this.leaderState(g.fid);const list=this.S.leaders.memorials;
  if(list.some(m=>m.id===g.id&&m.fate===fate))return;
  list.push({id:g.id,name:g.name,fid:former||g.fid,fate,turn:this.S.turn,fame:g.fame||0,wins:g.rec?.wins||0,title:this.leaderIdentity(g).identity});
  if(list.length>80)list.shift();
 },
 linkLeaderTies(){
  for(const g of Object.values(this.S.gens)){
   this.ensureLeader(g);const e=this.catOf(g)||{};
   for(const name of e.ties||[]){const f=Object.values(this.S.gens).find(x=>x.name===name&&x.fid===g.fid);if(f){g.friends=g.friends||[];if(!g.friends.includes(f.id))g.friends.push(f.id);g.relationships[f.id]=g.relationships[f.id]||{kind:'friend',since:this.S.turn};}}
   for(const name of e.rivals||[]){const f=Object.values(this.S.gens).find(x=>x.name===name);if(f)g.relationships[f.id]=g.relationships[f.id]||{kind:'rival',since:this.S.turn};}
  }
 },
 migrateLeaders(){
  const S=this.S;for(const fid in S.factions)this.leaderState(fid);
  const seen=this.takenNames();
  for(const fid in S.factions){
   const st=this.leaderState(fid);st.earned=st.earned||{};st.retiredNames=st.retiredNames||[];
   S.draft=S.draft||{};S.draft[fid]=clamp(this.draftOf(fid),0,LEADER_RULES.rerolls);
   const ops=this.oppsOf(fid);const kept=[];
   for(const op of ops){
    op.tries=op.tries||{};op.rerolls=op.rerolls||0;op.expires=op.expires??Math.max(S.turn+2,op.turn+LEADER_RULES.offerLife);
    op.key=op.key||'legacy:'+op.id;st.earned[op.key]=op.turn??S.turn;
    st.lastGrant=Math.max(st.lastGrant??-99,op.turn??S.turn);
    op.cands=(op.cands||[]).slice(0,2).map(c=>{
     if(!c||seen.has(c.n)||c.cat&&!this.leaderAvailable(this.catFind(c.n),fid))return null;
     seen.add(c.n);return this.freezeCandidate(c,fid);
    });
    if(op.cands.some(Boolean)&&op.expires>S.turn&&kept.length<LEADER_RULES.opportunities)kept.push(op);
   }
   S.opps[fid]=kept;
  }
  for(const g of Object.values(S.gens)){
   this.ensureLeader(g);g.observedFid=g.observedFid||g.fid;g.observedStatus=g.observedStatus||g.status;
  }
  this.linkLeaderTies();
  S.leaders.version=LEADER_RULES.version;
 },
 leaderTick(){
  const S=this.S;
  for(const fid in S.factions){
   const st=this.leaderState(fid);if(st.lastTick===S.turn)continue;st.lastTick=S.turn;
   for(const op of [...this.oppsOf(fid)])if(op.expires<=S.turn){
    for(const c of op.cands)if(c)st.retiredNames.push(c.n);this.dropOpp(fid,op.id);
    if(fid===S.player)this.alert('info','غادر وفد المجلس بعد انقضاء مهلة الاستقطاب.',{icon:'helmet',key:'expired:'+op.id});
   }
  }
  for(const g of Object.values(S.gens)){
   this.ensureLeader(g);if(g.leaderTick===S.turn)continue;g.leaderTick=S.turn;
   if(g.observedFid&&g.observedFid!==g.fid){
    this.memorial(g,'betrayed',g.observedFid);
    for(const x of Object.values(S.gens))if(x.fid===g.observedFid&&(x.friends||[]).includes(g.id)){this.leaderEvent(x,'betrayed',{key:g.id});x.relationships[g.id]={kind:'rival',since:S.turn};}
    g.bond.trust=35;g.bond.resentment=0;
   }
   if(g.status==='dead'&&g.observedStatus!=='dead')this.onCommanderLost(g,'killed',null);
   if(g.status==='exiled'&&g.observedStatus!=='exiled')this.memorial(g,'exiled');
   g.observedStatus=g.status;g.observedFid=g.fid;
   if(g.status==='captive'&&S.turn-(g.since||0)>=8)this.leaderEvent(g,'abandoned');
   if(!this.employed(g)||this.isOfficer(g))continue;
   if(g.ask&&g.ask.k!=='raise'){
    if(this.leaderRequestMet(g,g.ask)){this.leaderEvent(g,g.ask.k==='rest'?'rest':'kept');g.ask=null;}
    else if(S.turn>(g.ask.until??g.ask.turn+4))this.answerAsk(g,false);
   }
   this.leaderRequests(g);
   const a=g.army&&this.army(g.army);
   if(a&&a.regs.length>=5)this.leaderEvent(g,'command');
   if(g.status==='gov')this.leaderEvent(g,'governor');
   if(g.fame>=70&&(g.loy??50)>=55&&S.turn>0&&S.turn%4===0){
    const post=this.leaderPost(g),pupil=this.gensOf(g.fid).filter(x=>x!==g&&this.employed(x)&&!this.isRuler(x)&&x.fame<g.fame&&this.leaderPost(x)===post).sort((a,b)=>(a.xp||0)-(b.xp||0))[0];
    if(pupil&&pupil.lastLesson!==S.turn){pupil.lastLesson=S.turn;this.gainXp(pupil,1);this.remember(pupil,'lesson','تعلّم في مجلس '+g.name,1,4);}
   }
  }
 },
});

// These hooks consume leader actions and established campaign results; battle resolution is unchanged.
(()=>{
 const normalize=Game.normalizeState;
 Game.normalizeState=function(){const result=normalize.apply(this,arguments);this.migrateLeaders();return result;};
 const start=Game.newGame;
 Game.newGame=function(){let result;this._leaderStarting=true;try{result=start.apply(this,arguments);}finally{this._leaderStarting=false;}this.migrateLeaders();for(const fid of this.aliveMajors())this.addDraft(fid,1,'بداية الحملة','start');this.save();return result;};
 const createArmy=Game.createArmy;
 Game.createArmy=function(fid,node,genId){
  // A missing scenario identity must never silently send another ruler to this post.
  if(this._leaderStarting&&!genId){
   const definition=SCENARIOS[this.S.scenario].armies.find(a=>a.owner===fid&&a.node===node);
   const office=definition?.gen==='خاقان الخزر';
   const g=office?this.addGeneral(fid,'خاقان الخزر','cavalier',null,1,{lead:2,fame:20,culture:'steppe'}):this.addGeneral(fid,'الضابط، حامية '+this.node(node).name,null,null,1,{lead:1,fame:0,culture:this.cultureOf(fid)});
   g.home=node;g.src=office?'office':'local';genId=g.id;
  }
  return createArmy.call(this,fid,node,genId);
 };
 const add=Game.addGeneral;
 Game.addGeneral=function(){const g=add.apply(this,arguments);this.ensureLeader(g);g.observedFid=g.fid;g.observedStatus=g.status;return g;};
 const remember=Game.remember;
 Game.remember=function(g,k,text){const r=remember.apply(this,arguments);const event=k==='promo'?'promoted':k==='retired'&&text.startsWith('اعتزل رفيقه')?'farewell':k;this.leaderEvent(g,event,{why:text,key:k==='grief'?text:''});return r;};
 const loy=Game.genLoyParts;
 Game.genLoyParts=function(g){this.ensureLeader(g);const parts=loy.call(this,g),b=g.bond,p=this.leaderIdentity(g);
  // The expanded 38-city starting realm must not impose the old -60 loyalty floor.
  // Administrative distance remains relevant, but cannot erase every personal decision.
  const size=this.nodesOf(g.fid).length;
  for(const part of parts)if(part[0].startsWith('اتساع المملكة'))part[1]=-Math.min(12,Math.ceil(Math.max(0,size-8)/4));
  parts.push(['الثقة والاحترام',Math.round((b.trust-50)*.15+(b.respect-50)*.08)],['امتنان وضغائن',Math.round(b.gratitude*.06-b.resentment*.14)]);
  if(p.key==='loyal')parts.push(['يحفظ العهد',5]);
  if(p.ambition>=70&&g.status==='pool')parts.push(['طموح بلا مسؤولية',-5]);
  const rivals=Object.entries(g.relationships).filter(([id,r])=>r.kind==='rival'&&this.gen(id)?.fid===g.fid&&this.employed(this.gen(id))).map(([id])=>this.gen(id));
  if(rivals.length)parts.push(['منافس في المجلس',-Math.max(...rivals.map(x=>this.leaderIdentity(x).skills.influence))]);return parts;};
 const gain=Game.gainXp;
 Game.gainXp=function(g,v){if(!g||!Number.isFinite(v)||v<=0||this.isOfficer(g))return;this.ensureLeader(g);const before=g.rank;gain.call(this,g,v);
  const p=this.leaderIdentity(g);g.growth.insight+=v*(1+(p.skills.command>=4?.15:0));
  const level=Math.min(2,Math.floor(g.growth.insight/24));
  if(level>g.growth.level){g.growth.level=level;this.addFame(g,3);this.leaderEvent(g,'promoted');}
  if(g.rank>before)this.leaderEvent(g,'promoted');};
 const mp=Game.mpMax;
 Game.mpMax=function(a){const g=this.armyGen(a);if(!g)return mp.call(this,a);const p=this.leaderIdentity(g);return mp.call(this,a)+((g.growth?.level||0)>=1&&(p.skills.scouting>=4||p.skills.logistics>=4)?1:0);};
 const honor=Game.honorGeneral;
 Game.honorGeneral=function(fid,g){if(!g||g.fid!==fid||!this.employed(g)||this.isRuler(g))return 'لا يمكن تكريم هذا القائد';if(g.honored!=null&&this.S.turn-g.honored<8)return 'لا يتكرر التكريم إلا بعد ثمانية أدوار';const r=honor.call(this,fid,g);if(!r&&g.fame>=45)for(const f of this.friendsOf(g))this.leaderEvent(f,'peerHonor',{key:g.id,why:'قدّر الحاكم رفيقه '+g.name});return r;};
 const retire=Game.retireGeneral;
 Game.retireGeneral=function(g){if(!g||this.isRuler(g)||this.isHeir(g))return 'لا يمكن إعفاء الحاكم أو ولي العهد';const r=retire.call(this,g);if(!r){g.ask=null;g.promise=null;this.leaderEvent(g,'retired');this.memorial(g,'retired');this.leaderState(g.fid).retiredNames.push(g.name);this.save();}return r;};
 const appoint=Game.appointGovernor;
 Game.appointGovernor=function(g,n){if(!g||!this.employed(g))return 'القائد غير متاح';const r=appoint.call(this,g,n);if(!r)this.leaderEvent(g,'governor');return r;};
 const recall=Game.recallGovernor;
 Game.recallGovernor=function(g){if(!g||g.status!=='gov')return;const r=recall.call(this,g);this.leaderEvent(g,'recalled');return r;};
 const dismiss=Game.dismissGeneral;
 Game.dismissGeneral=function(a){const g=this.armyGen(a);const r=dismiss.call(this,a);if(!r&&g)this.leaderEvent(g,'recalled');return r;};
 const fate=Game.setGenFate;
 Game.setGenFate=function(g,k,by){if(!g||g.status==='dead'||k==='captured'&&g.status==='captive')return;const r=fate.call(this,g,k,by);if(['killed','captured'].includes(k)){g.ask=null;g.promise=null;}if(k==='killed')this.memorial(g,k);return r;};
 const lost=Game.onCommanderLost;
 Game.onCommanderLost=function(g,k,by){if(!g)return;this.ensureLeader(g);const permanent=['killed','executed'].includes(k),key='lost:'+k+':'+(g.since??this.S.turn);if(g.leaderFlags[key]||permanent&&g.leaderFlags.permanentLoss)return;g.leaderFlags[key]=true;if(permanent)g.leaderFlags.permanentLoss=true;const r=lost.call(this,g,k,by);if(permanent)this.memorial(g,'killed');return r;};
 const ransom=Game.ransomCaptive;
 Game.ransomCaptive=function(g,by,price){if(!g||g.status!=='captive'||g.captor!==by||!this.f(by)||!Number.isFinite(price)||price<0||this.f(g.fid).gold<price)return 'الفدية غير متاحة';return ransom.call(this,g,by,price);};
 const exchange=Game.exchangeCaptives;
 Game.exchangeCaptives=function(a,b){if(!a||!b||a===b||a.status!=='captive'||b.status!=='captive'||a.captor!==b.fid||b.captor!==a.fid)return 'التبادل غير متاح';return exchange.call(this,a,b);};
 const execute=Game.executeCaptive;
 Game.executeCaptive=function(g,by){if(!g||g.status!=='captive'||g.captor!==by)return 'هذا القائد ليس أسيراً لديك';return execute.call(this,g,by);};
 const exile=Game.exileCaptive;
 Game.exileCaptive=function(g,by){if(!g||g.status!=='captive'||g.captor!==by)return 'هذا القائد ليس أسيراً لديك';const r=exile.call(this,g,by);this.memorial(g,'exiled');for(const f of this.friendsOf(g))this.leaderEvent(f,'farewell',{key:g.id,why:'نُفي رفيقه '+g.name});return r;};
 const release=Game.releaseCaptive;
 if(release)Game.releaseCaptive=function(g,by){if(!g||g.status!=='captive'||g.captor!==by)return 'هذا القائد ليس أسيراً لديك';const r=release.call(this,g,by);this.leaderEvent(g,'rescued');return r;};
 const recruit=Game.tryRecruitCaptive;
 Game.tryRecruitCaptive=function(g,by){if(!g||g.status!=='captive'||g.captor!==by||this.isRuler(g)||g.lastRecruitTry===this.S.turn||(g.refused||0)>=2)return false;g.lastRecruitTry=this.S.turn;const before=g.fid;const r=recruit.call(this,g,by);if(r){this.memorial(g,'betrayed',before);g.bond={...g.bond,trust:35,respect:40,resentment:0,gratitude:0,opinion:38};}return r;};
 const answer=Game.answerAsk;
 Game.answerAsk=function(g,yes){if(!g?.ask||!this.employed(g))return 'لا طلب معلق';const q=g.ask;
  if(q.k==='raise')return answer.call(this,g,yes);
  if(yes&&!this.leaderRequestMet(g,q))return 'أنجز الطلب في الحملة قبل إغلاقه';
  g.ask=null;this.leaderEvent(g,yes?'kept':'denied');return null;};
 const tick=Game.commanderTick;
 Game.commanderTick=function(){if(this.S.leaders?.tick===this.S.turn)return;this.leaderTick();tick.call(this);this.S.leaders.tick=this.S.turn;};
 // Snapshot a genuine idle turn before the campaign restores movement points.
 const endRound=Game.endRound;
 Game.endRound=function(){for(const a of this.S.armies){const g=this.armyGen(a);if(g?.ask?.k==='rest'&&!a.siege&&!a.training&&a.mp>=this.mpMax(a)&&this.node(a.node)?.owner===g.fid)g.restedTurn=this.S.turn+1;}return endRound.apply(this,arguments);};
 const battle=Game.recordBattle;
 Game.recordBattle=function(enc,win,...args){const losses=new Map(Object.values(this.S.gens).map(g=>[g.id,g.rec?.losses||0]));const r=battle.call(this,enc,win,...args);for(const g of Object.values(this.S.gens))if((g.rec?.losses||0)>(losses.get(g.id)||0))this.leaderEvent(g,'defeat');return r;};
 const capture=Game.recordCapture;
 Game.recordCapture=function(node,fid,armies){const r=capture.call(this,node,fid,armies);for(const a of armies){const g=this.armyGen(a);if(g&&g.fid===fid)this.leaderEvent(g,'city',{key:node.id,why:'دخول '+node.name});}return r;};
})();
