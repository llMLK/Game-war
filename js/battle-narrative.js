'use strict';
// Every passage has an explicit factual predicate. Prose variation never consumes combat RNG.
const BattleNarrative = {
  rules: [],
  add(key, group, priority, test, variants) { this.rules.push({ key, group, priority, test, variants }); },
  build(sim, rep) {
    const eligible = [];
    for (const s of sim.sides) {
      const f = s.foe, r = s.initialReady, ledger = s.ledger;
      const state = { sim, s, f, r, ledger, won: sim.winner === s.i,
        hasOrder: (k) => (s.orderLog || []).some((o) => o.k === k),
        hasDecision: (k) => sim.decisions.some((d) => d.side === s.i && d.kind === k),
        fate: s.cmd ? sim.resolvedFates?.[s.cmd.id] || (s.cmdAlive === false ? s.cmdFate : null) : null };
      for (const rule of this.rules) if (rule.test(state)) {
        const index = hashStr(`${sim.cfg.seed}:${s.i}:${rule.key}`) % rule.variants.length;
        const text = rule.variants[index].replaceAll('{name}', s.name).replaceAll('{foe}', f.name).replaceAll('{leader}', s.cmd?.name || 'القائد');
        eligible.push({ key: rule.key, side: s.i, group: rule.group, priority: rule.priority, text,
          facts: { terrain: sim.terrain, phase: sim.phase, winner: sim.winner, men0: s.men0, remaining: sim.totalMen(s), fatigue: r.fat, battles: r.battles, ledger: { ...ledger }, fate: state.fate } });
      }
    }
    const selected = [], groups = new Set();
    for (const e of eligible.sort((a, b) => b.priority - a.priority || a.side - b.side)) {
      // One passage per theme keeps the account concise and avoids saying the same thing twice.
      if (groups.has(e.group)) continue;
      groups.add(e.group); selected.push(e);
      if (selected.length === 9) break;
    }
    selected.sort((a, b) => (a.group === 'ending' ? 1 : b.group === 'ending' ? -1 : a.priority > 85 ? -1 : b.priority > 85 ? 1 : 0));
    const decisive = sim.moments.filter((m) => m.weight >= 4).sort((a, b) => b.weight - a.weight)[0];
    if (decisive && !selected.some((e) => e.text.includes(decisive.text))) selected.splice(Math.max(0, selected.length - 1), 0, { key: 'turningPoint', side: decisive.side, group: 'turning', text: `وفي ${WS_PHASES[decisive.phase]?.name || 'الميدان'}، سُجل منعطف واضح: ${decisive.text}.`, facts: { ...decisive } });
    rep.narrativeEvidence = selected;
    rep.storyParts = selected.map((e) => e.text);
    return rep.storyParts;
  },
  get fragmentCount() { return this.rules.reduce((n, r) => n + r.variants.length, 0); },
};
{
  const add = (...args) => BattleNarrative.add(...args);
  add('outnumbered', 'numbers', 90, ({ s, f }) => s.men0 < f.men0 * .7, [
    'دخلت {name} الميدان بعدد أقل بكثير، فكان تعويض كل صف مفقود أصعب عليها.',
    'تقدم رجال {name} وهم أقل عددًا؛ لم يكن في عمق صفوفهم ما لدى {foe} من رجال.',
    'ظهر نقص رجال {name} منذ الاصطفاف، وأصبحت المحافظة على الصفوف حاجة ملحة.'
  ]);
  add('numbers', 'numbers', 89, ({ s, f }) => s.men0 > f.men0 * 1.4, [
    'حشدت {name} رجالًا أكثر، بما يتيح لها تعويض الخسائر من عمق الجيش.',
    'كانت الرايات الأكثر عددًا لـ{name}، لكن بقاء هذه الكثرة في القتال مرهون بتماسكها.',
    'اتسع صف {name} بفضل العدد؛ وهو سند حقيقي، لا وعد بالنصر.'
  ]);
  add('repeated', 'condition', 99, ({ r }) => r.battles >= 1, [
    'لم تصل {name} من راحة؛ حملت إلى الميدان آثار قتال سابق في الدور نفسه.',
    'خاضت {name} مواجهة أخرى قبل هذه؛ التعب والمؤن الناقصة دخلا معها المعركة.',
    'كانت هذه جولة أخرى لرجال {name} في دور واحد، ولم تتجدد قوتهم بين المعارك.'
  ]);
  add('exhausted', 'condition', 98, ({ r }) => r.fat >= 55, [
    'بلغ رجال {name} الميدان منهكين؛ ثقلت الضربات والخطوات معًا.',
    'بدت كلفة المسير والقتال السابق على {name} منذ البداية، فقل الجهد المتاح للضغط.',
    'بدأت {name} بتعب شديد، وكانت كل إطالة للقتال عبئًا إضافيًا على صفوفها.'
  ]);
  add('cohesion', 'cohesion', 87, ({ r }) => r.coh < 65, [
    'دخلت {name} بصفوف ضعيفة التماسك، فكان تنفيذ الأوامر تحت الضغط أصعب.',
    'لم تكن صفوف {name} قد استعادت انتظامها؛ ظهرت آثار التفكك في قدرتها على القتال.',
    'حملت {name} تماسكًا منخفضًا إلى المعركة، فقل احتمال اجتماع رجالها على أمر واحد.'
  ]);
  add('lowMorale', 'morale', 87, ({ r }) => r.mor < 45, [
    'المعنويات المنخفضة لـ{name} جعلت احتمال الانكسار حاضرًا منذ الاصطفاف.',
    'كان رجال {name} قليلَي الثقة عند الدخول، ولم تكن أعدادهم وحدها تصف حالهم.',
    'بدأت {name} بمعنويات مضطربة، فاحتاجت إلى تثبيت الصف أكثر من المعتاد.'
  ]);
  add('supply', 'supply', 88, ({ r }) => r.sup < 50, [
    'دخلت {name} بمؤن ناقصة، فضعف الجهد الذي تستطيع بذله طوال القتال.',
    'قلة الإمداد عند {name} سبقت السيوف إلى الميدان وأثقلت الرجال أثناء القتال.',
    'لم تكن أمتعة {name} كافية لقتال مريح؛ انعكس ذلك على قوة الصفوف وتعبها.'
  ]);
  add('fewArrows', 'arrows', 88, ({ r, s }) => r.ammo < 40 && s.units.some((u) => u.missile), [
    'وصل رماة {name} بسهام قليلة؛ الخطة الجديدة لم تملأ كناناتهم.',
    'لم يكن لدى رماة {name} مخزون كامل عند البداية، فتقيدت قدرتهم على الرمي.',
    'بدأت {name} بمخزون ناقص من السهام في هذا الميدان.'
  ]);
  add('ammoSpent', 'arrows', 83, ({ sim, s }) => s.units.some((u) => u.missile && u.ammoFull > 0) && sim.sideAfter(s).ammo === 0, [
    'انتهى القتال وقد نفدت سهام رماة {name} الباقين؛ لا رمية تخرج من كنانة فارغة.',
    'استنفد رماة {name} ما بقي معهم من السهام، وأصبح الرمي المتواصل مستحيلًا.',
    'لم يبق سهم لدى رماة {name} الأحياء في نهاية المعركة.'
  ]);
  add('mountains', 'terrain', 86, ({ sim, s }) => sim.kind === 'field' && sim.terrain === 'mountains' && !s.att, [
    'أعطى الممر الجبلي مدافعي {name} جبهة ضيقة، وحدّ من دخول رجال العدو إلى الاشتباك معًا.',
    'قاتلت {name} من موضع جبلي؛ لم تجد خيل المهاجمين مساحة انقضاض واسعة.',
    'ضاق الميدان عند مدافعي {name}، فصار عمق الجيش أقل نفعًا من جودة الصف الأمامي.'
  ]);
  add('hills', 'terrain', 85, ({ sim, s }) => sim.kind === 'field' && sim.terrain === 'hills' && !s.att, [
    'استفاد مدافعو {name} من التلال، واضطر المهاجم إلى القتال صعودًا.',
    'كان المرتفع في جهة {name}، فزاد مشقة الوصول إلى صفوفها.',
    'خدمت التلال موضع {name} الدفاعي وجعلت الضغط عليها أكلف.'
  ]);
  add('river', 'terrain', 85, ({ sim, s }) => sim.kind === 'field' && sim.terrain === 'river' && s.att, [
    'واجهت {name} النهر قبل الصف المقابل؛ أضعف العبور الالتحام الأول.',
    'لم تبلغ {name} خصمها فوق أرض يابسة متصلة، فدخل أثر العبور في بداية القتال.',
    'فرض النهر على {name} اقترابًا أصعب، خصوصًا عند تماس الصفوف الأول.'
  ]);
  add('forestCav', 'terrain', 86, ({ sim, s }) => sim.terrain === 'forest' && s.units.some((u) => u.role === 'cav'), [
    'ضيقت الأشجار مسالك خيل {name}؛ فقد الانقضاض بعض أثره.',
    'لم تجد خيالة {name} في الغابة عرض السهل، فكانت حركتها أقل فاعلية.',
    'كبحت الغابة سرعة فرسان {name} وجعلت الالتفاف أخطر.'
  ]);
  add('openCharge', 'terrain', 84, ({ sim, ledger }) => ['plains', 'desert'].includes(sim.terrain) && ledger.charge > 0, [
    'أتاحت الأرض الواسعة لخيالة {name} تنفيذ انقضاض سجل خسائر في صفوف الخصم.',
    'عمل فرسان {name} في ميدان مفتوح، وظهر أثر اندفاعهم في سجل الإصابات.',
    'وجدت خيل {name} مجالًا للسرعة، وأوقعت ضربة الالتحام خسائر فعلية.'
  ]);
  add('rain', 'weather', 73, ({ sim, s }) => sim.weather === 'rain' && s.units.some((u) => u.missile), [
    'قلل المطر فاعلية رماة {name}؛ لم تكن كثرة السهام مساوية لدقتها.',
    'أضعف البلل أثر الرمي لدى {name} طوال المعركة.',
    'عمل رماة {name} تحت المطر، فتراجع أثر سهامهم عن يوم الصحو.'
  ]);
  add('heat', 'weather', 74, ({ sim }) => sim.weather === 'heat', [
    'زاد الحر مشقة القتال على {name} مع امتداد الاشتباك.',
    'كان الحر عبئًا آخر على رجال {name} مع كل امتداد للاشتباك.',
    'ارتفعت كلفة الجهد لدى {name} في هذا الحر، فصار حفظ القوة ذا قيمة أكبر.'
  ]);
  add('missiles', 'arms', 75, ({ ledger }) => ledger.missile >= 8, [
    'سجل رماة {name} إصابات حقيقية في صفوف الخصم، ولم يكن دورهم مجرد تمهيد صامت.',
    'أسقطت سهام {name} رجالًا من الجيش المقابل خلال القتال.',
    'كان للرمي سهم واضح في خسائر {foe} التي سجلتها المعركة.'
  ]);
  add('spears', 'arms', 76, ({ ledger }) => ledger.spears >= 8, [
    'أوقعت رماح {name} خسائر بالخيالة المقابلة عند الالتحام.',
    'لم يمر فرسان الخصم عبر رماح {name} دون ثمن؛ سجل المدافعون إصابات في الخيل.',
    'ظهر دور رماحة {name} في صد الخيالة وإسقاط رجال منها.'
  ]);
  add('flank', 'maneuver', 82, ({ ledger }) => ledger.flank > 0, [
    'وصل التفاف {name} إلى صفوف الخصم، فانضاف ضغط الجانب إلى قتال المواجهة.',
    'نجحت مناورة التفاف لـ{name} في ضرب موضع من الجهة المكشوفة.',
    'لم تبق المعركة وجهًا لوجه؛ بلغت قوات {name} جانب العدو بالالتفاف.'
  ]);
  add('flankFail', 'maneuver', 82, ({ hasDecision }) => hasDecision('flankFail') || hasDecision('envelopFail'), [
    'ارتدت محاولة التفاف {name} بخسائر وتعب بدل أن تفتح طريق الحسم.',
    'فشل التفاف {name}، فدفعت الخيالة ثمن مخاطرة لم تحقق غرضها.',
    'لم تصل خيالة {name} إلى النتيجة المرجوة من الالتفاف، وعادت منهكة.'
  ]);
  add('feint', 'maneuver', 82, ({ ledger }) => ledger.feint > 0, [
    'نجح استدراج {name} في جر الخصم إلى فخ الفرسان.',
    'تحول التراجع المصطنع لـ{name} إلى كمين سجل أثره في صفوف الخصم.',
    'وقع رجال من {foe} في استدراج {name} بدل أن يحسموا الأمر بالمطاردة.'
  ]);
  add('reserveLate', 'reserve', 80, ({ s }) => s.reserveCommit?.phase >= 2, [
    'دفعت {name} احتياطها بعد بدء الاشتباك الرئيسي، فأدخلت رجال الخلف حين اشتدت الحاجة.',
    'احتفظت {name} برجال خلف الصف إلى مرحلة متأخرة ثم أرسلتهم إلى القتال.',
    'وصل احتياط {name} بعد استهلاك الصفوف الأولى جزءًا من جهدها.'
  ]);
  add('reserveEarly', 'reserve', 79, ({ s }) => s.reserveCommit && s.reserveCommit.phase < 2, [
    'زجت {name} باحتياطها مبكرًا؛ كسبت رجالًا في الخط ولم تحتفظ بهم للأزمة التالية.',
    'دخل احتياط {name} قبل الاشتباك الرئيسي، فاستُعمل سند الخلف منذ البداية.',
    'اختارت {name} تقوية القتال المبكر برجال الاحتياط بدل ادخارهم للحسم.'
  ]);
  add('reserveIdle', 'reserve', 78, ({ sim, s }) => !s.reserveCommit && sim.resMen(s) > 0 && sim.phase >= 2, [
    'بقي رجال من احتياط {name} خارج خط الاشتباك حتى النهاية.',
    'لم يصدر لـ{name} قرار دفع احتياطها كله، فبقي رجال في الخلف.',
    'انتهت المواجهة ولدى {name} احتياط لم يدخل الصف الأمامي.'
  ]);
  add('raidSuccess', 'supply', 85, ({ hasDecision }) => hasDecision('raidSuccess'), [
    'بلغ فرسان {name} الأمتعة المقابلة وأتلفوا مؤنًا، وفق ما سجلته الإغارة.',
    'نجحت إغارة {name} على الأمتعة، فنقص إمداد خصمها ومعنوياته.',
    'أصابت {name} مؤن {foe} عبر إغارة وصلت إلى هدفها.'
  ]);
  add('raidFail', 'supply', 85, ({ hasDecision }) => hasDecision('raidFailed'), [
    'صد حرس الأمتعة إغارة {name}، وخسرت الفرقة رجالًا في المحاولة.',
    'لم تبلغ فرقة {name} مؤن خصمها؛ ارتدت الإغارة بخسائر.',
    'حافظ الخصم على أمتعته أمام {name} ودفع الفرسان المغيرون الثمن.'
  ]);
  add('rally', 'command', 79, ({ hasOrder }) => hasOrder('rally'), [
    'خرج {leader} لحث صفوف {name}، معرضًا نفسه للخطر في محاولة تثبيتها.',
    'استعمل {leader} حضوره قرب الرجال لرفع معنويات {name}.',
    'اختارت قيادة {name} مخاطرة الحث المباشر بدل البقاء بعيدًا عن الصفوف.'
  ]);
  add('wounded', 'fate', 97, ({ s, fate }) => !fate && s.cmdWounded && !s.cmdHurt, [
    'أُصيب {leader} خلال القتال، وبقي أثر الجرح مع الجيش بعده.',
    'خرج {leader} من هذه المعركة جريحًا؛ للقيادة ثمن دفعه في الميدان.',
    'سُجل جرح {leader} أثناء المعركة، وهو مما سيحمله إلى الأيام التالية.'
  ]);
  add('captured', 'fate', 100, ({ fate }) => fate === 'captured', [
    'انتهى أمر {leader} في الأسر، فأضيف فقد القائد إلى حساب المعركة.',
    'لم يعد {leader} مع رجاله؛ وقع في يد الخصم أسيرًا.',
    'كان أسر {leader} من النتائج الفعلية للقتال، لا مجرد خطر محتمل.'
  ]);
  add('killed', 'fate', 100, ({ fate }) => fate === 'killed', [
    'قُتل {leader} في هذه المواجهة، وخسرت {name} قائدًا لا تعيده الراحة.',
    'لم ينجُ {leader} من المعركة؛ بقي اسمه في سجل الخسائر.',
    'انتهت قيادة {leader} بالموت في هذا القتال.'
  ]);
  add('oldWound', 'command', 89, ({ s }) => s.cmdHurt, [
    'دخل {leader} وهو جريح أصلًا، فحملت القيادة قيدًا من معركة سابقة.',
    'لم يكن جرح {leader} قد برئ حين قاد رجال {name} مرة أخرى.',
    'قاد {leader} هذه المعركة مع أثر جرح سابق يضعف جاهزيته.'
  ]);
  add('walls', 'terrain', 89, ({ sim, s }) => sim.kind === 'siege' && !s.att && sim.walls > 0, [
    'قاتلت {name} وراء الأسوار؛ لم تكن هذه مواجهة سهل مكشوف.',
    'جعلت أسوار {name} الاقتراب والالتحام أشد كلفة على المهاجمين.',
    'استفادت حامية {name} من دفاعات ثابتة إلى أن تُفتح مواضع العبور.'
  ]);
  add('breach', 'siege', 85, ({ sim, s }) => sim.kind === 'siege' && s.att && SECTS.some((k) => sim.sides[1].sec[k].breach >= 1), [
    'فتحت {name} ثغرة في دفاع المدينة، فتغير القتال عند ذلك الموضع.',
    'بلغ رجال {name} موضعًا انهار فيه السور، وأصبح العبور ممكنًا.',
    'لم تبق كل أسوار {foe} مغلقة؛ سجل الهجوم ثغرة مكتملة.'
  ]);
  add('noBreach', 'siege', 84, ({ sim, s }) => sim.kind === 'siege' && s.att && sim.phase >= 1 && !SECTS.some((k) => sim.sides[1].sec[k].breach >= 1), [
    'انتهى هجوم {name} من دون فتح ثغرة مكتملة في السور.',
    'لم تسجل معدات {name} ورجالها معبرًا مكتملًا عبر الدفاعات.',
    'بقيت مواضع السور أمام {name} دون حد الاختراق الكامل.'
  ]);
  add('siegeDuty', 'condition', 96, ({ s }) => s.commit < 1, [
    'أبقت {name} بعض رجالها على خطوط الحصار، فدخلت القتال بجزء من الجيش.',
    'توزع رجال {name} بين مواجهة النجدة وحراسة طوق الحصار.',
    'لم تصل كل قوة {name} إلى المعركة؛ ظل قسم منها ممسكًا بخطوط الحصار.'
  ]);
  add('towerLost', 'equipment', 80, ({ sim, s }) => sim.kind === 'siege' && s.att && sim.equip.tower && !sim.towerAlive, [
    'فقدت {name} برج حصارها أثناء الهجوم، فضاع طريقه المحمي إلى السور.',
    'لم يبق برج {name} صالحًا للعمل حتى نهاية الاقتحام.',
    'سجلت {name} خسارة برج الحصار، وأصبح الوصول إلى أعلى السور أصعب.'
  ]);
  add('ramLost', 'equipment', 80, ({ sim, s }) => sim.kind === 'siege' && s.att && sim.equip.ram && !sim.ramAlive, [
    'خرج كبش {name} من القتال، فلم يعد يواصل ضرب البوابة.',
    'فقد رجال {name} وسيلة دك البوابة حين تعطل الكبش.',
    'لم ينجُ كبش {name} حتى نهاية الهجوم، فتوقف دوره في فتح الباب.'
  ]);
  add('withdrawOrderly', 'ending', 95, ({ sim, s, won }) => !won && sim.reason === 'withdraw' && s.orderly, [
    'اختارت {name} انسحابًا منظمًا. فقدت الميدان وحاولت حفظ ما بقي من رجالها.',
    'تراجعت {name} بأمر انسحاب منظم؛ بقاء الجيش صار أهم من البقاء في الموضع.',
    'أنهت {name} قتالها بانسحاب مضبوط، مع تحمل خسائر الخروج من الاشتباك.'
  ]);
  add('withdrawHasty', 'ending', 95, ({ sim, s, won }) => !won && sim.reason === 'withdraw' && !s.orderly, [
    'انسحبت {name} على عجل، فكان الخروج أقل انتظامًا وأشد تعرضًا للمطاردة.',
    'انتهى قرار {name} إلى انسحاب مضطرب من الميدان.',
    'لم تحتفظ {name} بنظام كامل أثناء الانسحاب، فحملت معها كلفة الاضطراب.'
  ]);
  add('rout', 'ending', 94, ({ sim, s, won }) => !won && sim.reason !== 'withdraw' && sim.reason !== 'terms' && SECTS.some((k) => s.sec[k].state === 'broken'), [
    'انكسر قطاع من {name} قبل انتهاء الهزيمة، وبقي أثر الفرار في جاهزية الجيش.',
    'لم تنته هزيمة {name} بصفوف سليمة؛ سجل الميدان انهيارًا في قطاعاتها.',
    'حملت {name} خسارة الميدان ومعها صفوفًا انهارت تحت الضغط.'
  ]);
  add('pursuit', 'pursuit', 81, ({ ledger }) => ledger.pursuit > 0, [
    'لحقت قوات {name} بالمنسحبين وأوقعت خسائر إضافية أثناء المطاردة.',
    'استمرت خسائر الخصم بعد انفصال الصفوف بسبب مطاردة {name}.',
    'سجلت مطاردة {name} قتلى فوق خسائر الاشتباك المباشر.'
  ]);
  add('victory', 'ending', 70, ({ won }) => won, [
    'بقي الميدان لـ{name}، وبقيت خسائرها وتعبها معها إلى المواجهة التالية.',
    'خرجت {name} منتصرة، لكن النصر لم يُعد الرجال ولا المؤن المستهلكة.',
    'حُسمت المواجهة لصالح {name}؛ التعافي مهمة ما بعد المعركة.'
  ]);
  add('terms', 'ending', 99, ({ sim, won }) => !won && sim.reason === 'terms', [
    'أنهت حامية {name} مقاومتها وطلبت الأمان بدل مواصلة القتال.',
    'وضعت {name} حدًا للقتال باستسلام الحامية.',
    'خرجت الحامية من المواجهة بطلب الأمان وتسليم الميدان.'
  ]);
}
WarSim.prototype.storyParts = function (rep) { return BattleNarrative.build(this, rep); };

// The report exposes the same initial conditions used by the simulation.
{
  const render = BattleReport.render;
  BattleReport.render = function (rep, side, options = {}) {
    const el = render.call(this, rep, side, options);
    const facts = rep?.sides?.[side ?? rep.winner]?.factors;
    if (facts) el.appendChild(h('details', { class: 'br-story' }, h('summary', null, 'لماذا كانت هذه النتيجة؟'),
      h('dl', { class: 'br-factors' }, facts.map((f) => h('div', null, h('dt', null, f.label), h('dd', null, rich(f.value)), h('small', null, f.help))))));
    return el;
  };
}
