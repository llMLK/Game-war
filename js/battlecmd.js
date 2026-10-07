'use strict';
// أوامر المعركة والجاهزية والتقرير:
// - في كل مرحلة بطاقات أوامر قليلة، تتاح حسب الوحدات والقائد والأرض والخطة والحال والمرحلة، ولكل بطاقة أرقام وخطر.
// - القائد يفتح أوامر لا يملكها غيره (الإطباق المزدوج لفارس الخيل والداهية، الاختراق المركّز لمهندس الحصار)،
//   وطبعه يغيّر دقة التنفيذ وكلفته. النجوم تعطي أمراً إضافياً وثباتاً، لا ضرباً أقوى.
// - الجاهزية (تعب، معنويات، سهام، تماسك، إمداد) تبقى مع الجيش بعد المعركة وتتعافى بالراحة.
// - التقرير مقسّم: النتيجة، لحظة التحول، ما نجح، ما كلّفك، دور القائد، الخسائر. والقصة تُبنى من وقائع المحاكاة.

const RISK = ['منخفض', 'متوسط', 'مرتفع'];
const RISK_CLS = ['good', 'warn', 'bad'];
const PH_AR = { approach: 'الاستطلاع والتهيؤ', contact: 'الالتحام الأول', main: 'الاشتباك الرئيسي', crisis: 'حسم الاحتياط', collapse: 'الحسم' };
const pctTxt = (p) => Math.round(p * 100) + '٪';

const ORDERS = {
  scout: {
    name: 'استطلاع الأجنحة', icon: 'eye', phases: ['approach'], once: true,
    term: 'ترسل الكشافة لرصد موضع الاحتياط ومسالك الالتفاف قبل الالتحام.',
    need() { return null; },
    info(sim, s) { return { does: 'تكشف الخطة المقابلة، وترفع فرص الالتفاف 8 نقاط مئوية حتى نهاية الالتحام الأول.', nums: [['الاستطلاع الحالي', s.intel + ' من 3']], risk: 0, riskWhy: 'ينفق أمرًا كان يمكن استعماله لتحصين الصفوف أو حفظ الجهد' }; },
    apply(sim, s) { s.intel = 3; s.scouted = true; s.buffs.scout = { until: 1 }; return `كشافة ${s.name} تكشف خطة «${PLANS[s.foe.plan].name}» ومواقع العبور.`; },
  },
  fortify: {
    name: 'تثبيت موضع القتال', icon: 'shield', phases: ['approach'], field: true, once: true,
    term: 'تنظم المشاة التروس والحواجز الخفيفة قبل وصول العدو. يلائم انتظار الهجوم.',
    need() { return null; },
    info() { return { does: 'الخسائر الواردة أقل 10٪ حتى نهاية الالتحام الأول ما دامت الصفوف ثابتة. الرمي أقل 15٪ أثناء التهيؤ.', nums: [['تقليل الخسائر', '10٪'], ['المدة', 'مرحلتان']], risk: 0, riskWhy: 'يفقد أثره على أي قطاع تأمره بالتقدم، ويؤخر الرماة وهم يجهزون الموضع' }; },
    apply(sim, s) { s.buffs.fortify = { until: 1 }; for (const k of SECTS) s.sec[k].stance = 'hold'; return `${s.name} تهيئ موضعًا ثابتًا لاستقبال الهجوم.`; },
  },
  conserve: {
    name: 'حفظ السهام والجهد', icon: 'tent', phases: ['approach', 'contact'],
    term: 'تقصر الرمي على الأهداف القريبة، وتبطئ التقدم كي تحتفظ بقوة للقتال الطويل.',
    need() { return null; },
    info() { return { does: 'الرماة لا يرمون في هذه المرحلة، والتعب المكتسب أقل 3 كل نبضة. لا يعيد سهامًا أُنفقت.', nums: [['الرمي', 'متوقف هذه المرحلة'], ['التعب المكتسب', 'أقل 3']], risk: 1, riskWhy: 'يمنح رماة العدو وقتًا للعمل دون رد مماثل' }; },
    apply(sim, s) { s.buffs.conserve = { until: sim.phase }; return `${s.name} تحفظ سهامها وجهدها للاشتباك التالي.`; },
  },
  protect: {
    name: 'حماية القلب', icon: 'shield', phases: ['contact', 'main', 'crisis'], field: true,
    term: 'تشد الصف الأوسط وتمنع الفراغات حول الراية، ولو خف الضغط على العدو.',
    need(sim, s) { return sim.secMen(s, 'C') ? null : 'لم يبق رجال في القلب'; },
    info(sim, s) { return { does: 'خسائر القلب أقل 20٪ وضربه أقل 12٪ في هذه المرحلة، ويستعيد 6 معنويات.', nums: [['رجال القلب', sim.secMen(s, 'C')], ['تقليل الخسائر', '20٪']], risk: 0, riskWhy: 'يمنع كسر القلب ولا يحمي جناحًا مكشوفًا؛ يقل ضغطك الهجومي' }; },
    apply(sim, s) { s.buffs.protect = { until: sim.phase }; s.sec.C.stance = 'hold'; s.sec.C.morale = Math.min(100, s.sec.C.morale + 6); return `${s.name} تغلق الفجوات حول رايتها في القلب.`; },
  },
  watch: {
    name: 'تأمين الجناح', icon: 'eye', phases: ['contact', 'main'], field: true, arg: 'sector',
    term: 'توجه الحرس والرسل نحو الجناح الذي تتوقع التفاف العدو عليه.',
    need(sim, s) { return sim.roleMen(s, ['line', 'cav']) >= 20 ? null : 'يحتاج عشرين رجلًا من الرماح أو الفرسان'; },
    info(sim, s, arg) { return { does: `يخفض احتمال التفاف العدو على ${sim.secName(arg || 'L')} 25 نقطة مئوية، طوال هذه المرحلة.`, nums: [['إضعاف الالتفاف', '25 نقطة مئوية']], risk: 1, riskWhy: 'إذا اختار العدو جهة أخرى ضاع الأمر، وقوة القطاع الهجومية أقل 8٪' }; },
    apply(sim, s, arg) { const k = arg || 'L'; s.buffs.watch = { until: sim.phase, sec: k }; return `${s.name} ترصد المسالك حول ${sim.secName(k)}.`; },
  },
  raid: {
    name: 'الإغارة على الأمتعة', icon: 'horse', phases: ['main'], field: true, once: true, cost: 2,
    term: 'يرسل الفرسان فرقة نحو أمتعة الخصم لتشتيت حراسه وإتلاف بعض مؤنه.',
    need(sim, s) { return !['plains', 'desert', 'coast'].includes(sim.terrain) ? 'المسالك لا تسمح بالوصول إلى الأمتعة هنا' : sim.roleMen(s, ['cav', 'skirm']) < 35 ? 'تحتاج 35 فارسًا على الأقل' : null; },
    info(sim, s) { const p = sim.raidChance(s); return { does: 'النجاح يفقد العدو 18 إمدادًا و5 معنويات. الفرسان يتعبون 12، والفشل يقتل 8٪ من الفرقة.', nums: [['فرصة الوصول', 'نحو ' + pctTxt(p)], ['كلفة القيادة', 'أمران']], chance: p, risk: 2, riskWhy: 'احتياط العدو وحراسة أجنحته يصدّان الفرقة؛ هذه ليست ضربة مباشرة على صفوفه' }; },
    apply(sim, s) {
      const ok = sim.r() < sim.raidChance(s);
      for (const k of SECTS) if (sim.roleMen(s, ['cav', 'skirm'], [k])) s.sec[k].fat += 12;
      if (ok) { s.foe.ready.sup = Math.max(0, s.foe.ready.sup - 18); for (const k of SECTS) s.foe.sec[k].morale -= 5; sim.led(s, 'supplyRaid', 18); }
      else for (const u of s.units.filter((u) => sim.alive(u) && ['cav', 'skirm'].includes(u.role))) u.men = Math.max(0, u.men - Math.ceil(u.men * 0.08));
      sim.decisions.push({ side: s.i, kind: ok ? 'raidSuccess' : 'raidFailed', phase: sim.phase, weight: ok ? 0 : 2, text: ok ? 'بلغت الفرقة الأمتعة وأتلفت مؤنًا' : 'صد الاحتياط فرقة الإغارة فخسرت فرسانًا' });
      return ok ? `فرسان ${s.name} يبددون أمتعة الخصم ويضعفون إمداده.` : `حرس الأمتعة يردون فرسان ${s.name} بخسائر.`;
    },
  },
  volley: {
    name: 'مناوشة بالسهام', icon: 'volley', phases: ['contact', 'main'],
    term: 'المناوشة: الرماة يواصلون الرمي بدل الانشغال بالالتحام، ويتراجعون خلف الصف إن اقترب العدو.',
    need(sim, s) {
      const men = sim.roleMen(s, ['missile', 'skirm']);
      if (men < sim.liveMen(s) * 0.1) return `رماتك ${men} رجلاً فقط، أقل من عُشر الجيش`;
      if (sim.ammoAvg(s) <= 0) return 'نفدت السهام';
      return null;
    },
    info(sim, s) {
      const men = sim.roleMen(s, ['missile', 'skirm']), am = sim.ammoAvg(s), fc = sim.roleShare(s.foe, ['cav']);
      const risk = am <= 1.5 ? 1 : fc > 0.3 ? 1 : 0;
      return {
        does: `رماتك (${men}) يرمون بكامل قوتهم في هذه المرحلة، ويستهلكون السهام مضاعفة، والعدو يتعب أسرع.`,
        nums: [['الرماة', men], ['رميات باقية', am.toFixed(1)], ['أثر الرمي', '+30٪'], sim.weather === 'rain' ? ['المطر', '−40٪'] : null, sim.terrain === 'forest' ? ['الغابة', '−28٪'] : null],
        risk, riskWhy: am <= 1.5 ? 'السهام توشك أن تنفد' : fc > 0.3 ? `فرسانهم نحو ${pctTxt(fc)} من جيشهم وقد يلحقون بالرماة` : 'لا خطر يُذكر',
      };
    },
    apply(sim, s) { s.buffs.volley = { until: sim.phase }; return `رماة ${s.name} يُمطرون العدو بلا توقف.`; },
  },
  shieldwall: {
    name: 'جدار الرماح', icon: 'spear', phases: ['contact', 'main'], field: true,
    term: 'جدار الرماح: صف متلاصق من الرماح والتروس يثبت مكانه. الخيل لا تقتحمه إلا بثمن.',
    need(sim, s) {
      const sh = sim.roleShare(s, ['line']);
      if (sh < 0.2) return `الرماحة ${pctTxt(sh)} من جيشك، والجدار يحتاج خُمس الجيش على الأقل`;
      return null;
    },
    info(sim, s) {
      const fc = sim.roleShare(s.foe, ['cav']), ph = sim.phaseKey();
      return {
        does: ph === 'contact' ? 'قطاعات الرماحة تثبت، وانقضاض فرسان العدو يفقد نصف أثره، والضربات الواردة أقل 10٪.' : 'قطاعات الرماحة تثبت، والضربات الواردة أقل 10٪.',
        nums: [['رماحتك', sim.roleMen(s, ['line'])], ['فرسان العدو', pctTxt(fc)], ph === 'contact' ? ['أثر الانقضاض', '−50٪'] : null],
        risk: 0, riskWhy: 'لا تكسب أرضاً في هذه المرحلة',
      };
    },
    apply(sim, s) {
      s.buffs.shieldwall = { until: sim.phase };
      for (const k of SECTS) if ((sim.secComp(s, k).line || 0) >= 0.4) s.sec[k].stance = 'hold';
      return `رماحة ${s.name} يغرسون رماحهم ويتلاصقون.`;
    },
  },
  highground: {
    name: 'الثبات على المرتفع', icon: 'hill', phases: ['contact', 'main'], field: true,
    term: 'المرتفع: من فوقه يرمي أبعد ويضرب من أعلى، والصاعد إليه يتعب قبل أن يصل.',
    need(sim, s) {
      if (!['hills', 'mountains'].includes(sim.terrain)) return 'لا مرتفع في هذه الأرض';
      if (s.att) return 'العدو هو من يمسك المرتفع، وأنت المهاجم';
      if (s.plan === 'highground') return 'خطتك تمسك المرتفع أصلاً';
      return null;
    },
    info() {
      return { does: 'كل قطاعاتك تثبت فوق المرتفع: الضربات الواردة أقل 15٪، والمهاجمون يتعبون أسرع.', nums: [['الضربات الواردة', '−15٪'], ['تعب العدو', '+3 كل جولة']], risk: 0, riskWhy: 'لا مطاردة بعد النصر إن بقيت فوقه' };
    },
    apply(sim, s) { s.buffs.highground = { until: sim.phase }; for (const k of SECTS) s.sec[k].stance = 'hold'; s.noPursuit = true; return `${s.name} تتمسك بالمرتفع.`; },
  },
  flank: {
    name: 'التفاف الفرسان', icon: 'flank', phases: ['contact', 'main'], field: true, arg: 'wing', cost: 2,
    term: 'الالتفاف: الفرسان يدورون حول جناح العدو ليضربوه من الجانب أو الخلف، فتنهار معنوياته.',
    need(sim, s) {
      if ((FLANK_TERRAIN[sim.terrain] || 1) < 0.5) return `${TERRAIN[sim.terrain] ? TERRAIN[sim.terrain].name : 'الأرض'} لا تسمح بالدوران`;
      if (!sim.flankWings(s).length) return 'لا فرسان على جناحيك، أو التفّوا من قبل';
      return null;
    },
    info(sim, s, arg) {
      const w = arg || sim.bestFlankWing(s);
      const c = sim.flankChance(s, w);
      return {
        does: `فرسان ${sim.secName(w)} يدورون الآن حول ${sim.secName(OPP[w])} لدى العدو. إن نجحوا: معنوياته −25 وضرب من الخلف طوال المعركة.`,
        nums: [['فرسانك هنا', sim.roleMen(s, ['cav', 'skirm'], [w])], ['الأرض', '×' + (FLANK_TERRAIN[sim.terrain] || 1)], ['فرصة النجاح', 'نحو ' + pctTxt(c)]],
        risk: c >= 0.55 ? 1 : 2, riskWhy: `إن فشل خسر الفرسان نحو 18٪ وتعبوا`,
        chance: c,
      };
    },
    apply(sim, s, arg) {
      const w = arg || sim.bestFlankWing(s);
      s.sec[w].stance = 'flank'; s.sec[w].flankDone = false;
      sim.resolveFlank(s, w);
      return null;
    },
  },
  envelop: {
    name: 'الإطباق المزدوج', icon: 'flank', phases: ['main', 'crisis'], field: true, unlock: 'cav', once: true, cost: 2,
    term: 'الإطباق المزدوج: الجناحان يلتفان معاً حول قلب العدو من الجهتين. يفتحه فارس الخيل أو الداهية.',
    need(sim, s) {
      const g = s.cmd;
      if (!g || !['cavalier', 'tactician'].includes(g.trait)) return 'يحتاج قائداً فارس خيل أو داهية';
      if (s.cmdAlive === false) return 'سقط القائد الذي يعرف هذه المناورة';
      if ((FLANK_TERRAIN[sim.terrain] || 1) < 0.8) return 'الأرض ضيقة على مناورة بهذا الاتساع';
      if (!['L', 'R'].every((k) => sim.roleMen(s, ['cav', 'skirm'], [k]) > 0)) return 'يحتاج فرساناً على الجناحين معاً';
      if (s.foe.sec.C.state === 'broken') return 'قلب العدو انهار أصلاً';
      return null;
    },
    info(sim, s) {
      const c = sim.envelopChance(s);
      return {
        does: 'الجناحان يطبقان على قلب العدو. إن نجح: معنويات قلبه −22 وخسائر فورية، ويُضرب من الجانبين.',
        nums: [['فرسان الجناحين', sim.roleMen(s, ['cav', 'skirm'], ['L', 'R'])], ['احتياط العدو', sim.secMen(s.foe, 'Res')], ['فرصة النجاح', 'نحو ' + pctTxt(c)]],
        risk: 2, riskWhy: 'إن فشل تعب الجناحان وخسرا 15٪ من فرسانهما', chance: c,
      };
    },
    apply(sim, s) {
      const c = sim.envelopChance(s);
      const ex = sim.execQuality(s, 'C', 'envelop');
      const p = clamp(c + { excellent: 0.1, good: 0.03, poor: -0.08, fail: -0.2, disobey: -0.25 }[ex.q], 0.05, 0.9);
      sim.cue({ t: 'flank', side: s.i, from: 'L', to: 'C', ok: true });
      if (sim.r() < p) {
        const foe = s.foe;
        foe.sec.C.flanked = true; foe.sec.C.morale -= 22;
        const pw = ['L', 'R'].reduce((t, k) => t + sim.secUnits(s, k).filter((u) => u.role === 'cav' || u.role === 'skirm').reduce((x, u) => x + sim.unitMelee(u), 0), 0);
        const d = sim.applyLoss(foe, 'C', pw * 0.12 / 14, 'flank');
        sim.led(s, 'flank', d + 90);
        sim.moment(s, `الإطباق المزدوج على قلب ${foe.name}`, 9, 'envelop');
        return `الجناحان يطبقان على قلب ${foe.name} من الجهتين!`;
      }
      for (const k of ['L', 'R']) { s.sec[k].fat += 20; s.sec[k].morale -= 8; for (const u of sim.secUnits(s, k).filter((x) => x.role === 'cav' || x.role === 'skirm')) u.men = Math.round(u.men * 0.85); }
      sim.decisions.push({ side: s.i, kind: 'envelopFail', text: 'حاول الإطباق المزدوج فارتد الجناحان منهكين', weight: 3 });
      return 'الإطباق فشل: احتياط العدو صدّ الجناحين.';
    },
  },
  reserve: {
    name: 'إرسال الاحتياط', icon: 'plus', phases: ['contact', 'main', 'crisis'], arg: 'sector',
    term: 'الاحتياط: رجال طازجون خلف الصف. من يحتفظ به حتى اللحظة الحاسمة يملك آخر كلمة.',
    need(sim, s) { return sim.resMen(s) > 0 ? null : 'لا احتياط متبقٍ'; },
    info(sim, s, arg) {
      const k = arg || sim.weakestSec(s);
      const early = sim.phaseKey() === 'contact';
      return {
        does: `${sim.resMen(s)} رجلاً طازجاً إلى ${sim.secName(k)}: معنوياته +14${s.cmd && s.cmd.doctrine === 'cautious' ? ' (+4 لحذر القائد)' : ''}.`,
        nums: [['الاحتياط', sim.resMen(s)], ['معنويات القطاع الآن', Math.round(s.sec[k].morale)], ['بعد الأمر', Math.round(Math.min(100, s.sec[k].morale + 14))]],
        risk: early ? 1 : 0, riskWhy: early ? 'مبكر: لن يبقى احتياط للأزمة' : 'لن يبقى احتياط بعده',
      };
    },
    apply(sim, s, arg) {
      const k = arg || sim.weakestSec(s);
      sim.commitReserve(s, k, 'order');
      if (s.cmd && s.cmd.doctrine === 'cautious') s.sec[k].morale += 4;
      return null;
    },
  },
  press: {
    name: 'الضغط العام', icon: 'charge', phases: ['contact', 'main', 'crisis'],
    term: 'الضغط العام: كل الصفوف تتقدم وتضرب بأقصى ما تستطيع. يحسم إن كان العدو يترنح، ويُنهك إن طال.',
    need(sim, s) { return SECTS.some((k) => sim.secUnits(s, k).length && s.sec[k].state !== 'broken') ? null : 'لا صفوف قادرة على التقدم'; },
    info(sim, s) {
      const hot = sim.pressMul(s);
      const fat = sim.avgFat(s);
      return {
        does: `كل القطاعات تتقدم: الضرب +${Math.round((hot.mul - 1) * 100)}٪ في هذه المرحلة، والتعب +${hot.fat} كل جولة.${hot.bold ? ' قائدك جريء: ضربة أقوى وكلفة أعلى.' : ''}`,
        nums: [['التعب الآن', Math.round(fat)], ['قوة الضرب', '+' + Math.round((hot.mul - 1) * 100) + '٪'], ['تعب إضافي', '+' + hot.fat]],
        risk: fat > 55 ? 2 : 1, riskWhy: fat > 55 ? 'رجالك منهكون أصلاً: قد تنكسر الصفوف' : 'إن لم يحسم تعب الجيش قبل الأزمة',
      };
    },
    apply(sim, s) {
      const hot = sim.pressMul(s);
      s.buffs.press = { until: sim.phase, mul: hot.mul, fat: hot.fat };
      for (const k of SECTS) if (s.sec[k].stance !== 'flank') s.sec[k].stance = 'advance';
      return `${s.name} تضغط بكل صفوفها.`;
    },
  },
  rally: {
    name: 'القائد يحثّ الصفوف', icon: 'banner', phases: ['contact', 'main', 'crisis'], max: 2,
    term: 'الحث: القائد يمرّ بين الصفوف بنفسه. يرفع المعنويات، ويعرّضه للسهام.',
    need(sim, s) {
      if (!s.cmd) return 'لا قائد في هذا الجيش';
      if (s.cmdAlive === false) return 'سقط القائد';
      if (s.cmdWounded) return 'القائد جريح';
      return null;
    },
    info(sim, s) {
      const up = sim.rallyUp(s);
      const risk = CMD_POS[s.cmdPos].risk * 2.5 * (s.cmd.flaw === 'reckless' ? 2 : 1);
      return {
        does: `${s.cmd.name} يمرّ بين الصفوف: معنويات كل القطاعات +${up}.`,
        nums: [['المعنويات الآن', Math.round(sim.avgMorale(s))], ['الرفع', '+' + up], ['خطر إصابته كل جولة', pctTxt(risk)]],
        risk: risk > 0.05 ? 2 : 1, riskWhy: 'خطر إصابة القائد أعلى بمرتين ونصف في هذه المرحلة',
      };
    },
    apply(sim, s) {
      const up = sim.rallyUp(s);
      for (const k of [...SECTS, 'Res']) s.sec[k].morale = Math.min(100, s.sec[k].morale + up);
      for (const k of SECTS) if (s.sec[k].state === 'waver') s.sec[k].state = 'ok';
      s.buffs.rally = { until: sim.phase };
      sim.logCmd(s, 'rally', 'good');
      return `${s.cmd.name} يمرّ بين الصفوف ويرفع رايته.`;
    },
  },
  rotate: {
    name: 'تبديل الصفوف المتعبة', icon: 'undo', phases: ['main', 'crisis'],
    term: 'تبديل الصفوف: الصف الأمامي المتعب يتراجع ويتقدم من خلفه. يحتاج عمقاً أو احتياطاً.',
    need(sim, s) {
      const k = sim.tiredSec(s);
      if (!k) return 'لا قطاع متعب بما يكفي';
      if (!sim.resMen(s) && sim.depth(s, k) <= 0) return `${sim.secName(k)} بلا عمق خلفه ولا احتياط`;
      return null;
    },
    info(sim, s) {
      const k = sim.tiredSec(s), cut = sim.rotateCut(s);
      return { does: `${sim.secName(k)} يبدّل صفوفه: التعب −${cut} والمعنويات +4.`, nums: [['تعب القطاع', Math.round(s.sec[k].fat)], ['بعد التبديل', Math.round(Math.max(0, s.sec[k].fat - cut))]], risk: 0, riskWhy: 'القطاع يتلقى ضربات أكثر 5٪ أثناء التبديل' };
    },
    apply(sim, s) {
      const k = sim.tiredSec(s), cut = sim.rotateCut(s);
      s.sec[k].fat = Math.max(0, s.sec[k].fat - cut); s.sec[k].morale += 4;
      s.buffs.rotate = { until: sim.phase, sec: k };
      return `${sim.secName(k)} لدى ${s.name} يبدّل صفوفه المتعبة.`;
    },
  },
  focus: {
    name: 'الاختراق المركّز', icon: 'breach', phases: ['contact', 'main'], siege: 'att', unlock: 'siege', once: true,
    term: 'الاختراق المركّز: كل الآلات والسلالم على موضع واحد من السور. يفتحه مهندس الحصار.',
    need(sim, s) {
      if (!s.cmd || s.cmd.trait !== 'siege') return 'يحتاج قائداً مهندس حصار';
      if (sim.noMeans) return 'لا وسيلة لاختراق السور';
      return null;
    },
    info(sim, s) {
      const k = sim.focusSec();
      return { does: `كل الجهد على ${sim.wallName(k, s)}: تقدم الثغرة هناك ×2 وفي بقية السور ×0.5.`, nums: [['تقدم الثغرة هناك', pctTxt(sim.sides[1].sec[k].breach)], ['الأسوار', ['بلا', 'سياج', 'حجرية', 'قلعة', 'عظمى'][sim.walls]]], risk: 1, riskWhy: 'المدافعون يركزون عليك هناك: خسائر أكثر 10٪' };
    },
    apply(sim, s) { const k = sim.focusSec(); s.buffs.focus = { until: sim.phase, sec: k }; sim.logCmd(s, 'focus', 'good'); return `${s.cmd.name} يركز الآلات والسلالم على ${sim.wallName(k, s)}.`; },
  },
  waves: {
    name: 'موجات متعاقبة', icon: 'ladder', phases: ['main', 'crisis'], siege: 'att',
    term: 'الموجات: فرق تصعد وأخرى ترتاح بالتناوب، فلا يجد المدافعون لحظة راحة.',
    need(sim, s) { return s.ready.sup < 8 ? 'تحتاج الموجات 8 مؤن' : sim.resMen(s) || SECTS.some((k) => sim.depth(s, k) > 0) ? null : 'لا رجال كافون للتناوب'; },
    info(sim, s) { return { does: 'تعب رجالك −15 الآن، وتعب المدافعين +3 كل جولة في هذه المرحلة. تستهلك الموجات 8 إمداد.', nums: [['تعبك الآن', Math.round(sim.avgFat(s))], ['إمدادك', s.ready.sup]], risk: 1, riskWhy: 'فرق التبديل تتلقى ضربات أكثر 5٪ أثناء صعودها؛ لا يصلح مع مؤن قليلة' }; },
    apply(sim, s) { for (const k of SECTS) s.sec[k].fat = Math.max(0, s.sec[k].fat - 15); s.ready.sup=Math.max(0,s.ready.sup-8); s.buffs.waves = { until: sim.phase }; return `${s.name} ترسل موجة بعد موجة وتستهلك مؤنًا إضافية.`; },
  },
  oil: {
    name: 'الزيت والحجارة', icon: 'fire', phases: ['contact', 'main'], siege: 'def',
    term: 'الزيت والحجارة: ما يُصب من أعلى السور على من تحته. لا يصيب من عبر الثغرة.',
    need(sim, s) { return SECTS.every((k) => s.sec[k].breach >= 1) ? 'العدو عبر كل الأسوار' : null; },
    info(sim) { return { does: `من تحت السور يخسرون نحو 3.5٪ كل جولة، وفرصة إحراق الكبش ${sim.ramAlive ? '+15٪' : 'لا كبش'}.`, nums: [['الكبش', sim.ramAlive ? 'قائم' : 'لا'], ['خسائر تحت السور', '3.5٪ كل جولة']], risk: 0, riskWhy: 'لا خطر يذكر' }; },
    apply(sim, s) { s.buffs.oil = { until: sim.phase }; return 'الزيت المغلي والحجارة تنهال من الأسوار.'; },
  },
  withdraw: {
    name: 'انسحاب منظم', icon: 'retreat', phases: ['contact', 'main', 'crisis', 'collapse'], final: true, cost: 1,
    term: 'الانسحاب المنظم: الجيش يتراجع صفاً خلف صف، فتقل المطاردة. إن فشل التنفيذ صار هزيمة مضطربة.',
    need(sim, s) { return sim.kind === 'siege' && !s.att ? 'المدافعون لا مكان لهم خارج الأسوار' : s.ready.coh < 25 ? 'التماسك لا يكفي؛ الانسحاب الاضطراري متاح' : null; },
    info(sim, s) {
      const p = sim.execChance(s, 'withdraw');
      const cav = sim.roleMen(s.foe, ['cav', 'skirm']);
      const k = sim.pursuitRate(s.foe);
      const men = sim.liveMen(s);
      return {
        does: `ينتهي القتال الآن وتُحسب هزيمة. إن انتظم الانسحاب خسرت نحو ${Math.round(men * k * 0.35)} رجلاً في المطاردة بدل ${Math.round(men * k)}.`,
        nums: [['رجالك الآن', men], ['فرسان العدو', cav], ['فرصة الانتظام', 'نحو ' + pctTxt(p)]],
        risk: p < 0.6 ? 2 : 1, riskWhy: p < 0.6 ? 'طبع القائد أو تماسك الجيش قد يحول الانسحاب إلى فوضى' : 'المعركة تُحسب هزيمة',
      };
    },
    apply(sim, s) { sim.withdraw(s); return null; },
  },
  retreat: {
    name: 'انسحاب اضطراري', icon: 'retreat', phases: ['contact','main','crisis','collapse'], final: true, free: true,
    term: 'تفك الاشتباك فورًا بلا انتظار تنظيم الصفوف. ينقذ الباقين من قتال أطول، لكنه يفتحهم للمطاردة.',
    need(sim,s) { return sim.kind === 'siege' && !s.att ? 'الحامية محاصرة؛ قرار الأمان يظهر إذا سقطت الأسوار' : null; },
    info(sim,s) { return { does:'تنتهي المعركة بهزيمة. لا يحتاج نقطة قيادة؛ خسائر المطاردة أكبر من الانسحاب المنظم والمعنويات تنخفض 8.', nums:[['الرجال الباقون',sim.liveMen(s)],['القيادة المطلوبة',0]],risk:2,riskWhy:'الصفوف تتفرق؛ الفرسان المعادون قد يلحقون بالمؤخرة ويأسرون القائد'}; },
    apply(sim,s) { sim.withdraw(s,true); return null; },
  },
};

// A clear role and a counter accompany every order. Postures are mutually exclusive.
const ORDER_GUIDE = {
  scout: ['الكشافة والفرسان', 'قبل اختيار جهة الالتفاف', 'ينفق وقت التهيؤ ولا يمنع ضربات العدو'],
  fortify: ['الرماح والمشاة', 'حين تتوقع هجومًا مباشرًا', 'الرمي البعيد يستنزف الموضع الثابت'],
  conserve: ['الرماة والجيش المتعب', 'حين تحتاج الاحتفاظ بقوتك للحسم', 'ضغط العدو المبكر يمنعه من الراحة الآمنة'],
  protect: ['مشاة القلب', 'حين يترنح الوسط أو يتقدم العدو لكسره', 'الالتفاف يتجاوز قلبًا قويًا'],
  watch: ['الرماح والفرسان', 'حين تتوقع التفافًا على جهة بعينها', 'العدو يستطيع الهجوم من الجهة الأخرى'],
  raid: ['الفرسان والخيالة الرماة', 'ضد جيش بعيد عن الإمداد بلا احتياط قوي', 'الاحتياط وحراسة الأجنحة يصدان الإغارة'],
  volley: ['الرماة والخيالة الرماة', 'قبل اقتراب الفرسان أو حين يتوقف العدو', 'الفرسان السريعون والمطر يضعفانه'],
  shieldwall: ['الرماحة', 'لاستقبال انقضاض الفرسان', 'السيّافة والرمي المستمر يتغلبان على الثبات'],
  highground: ['المشاة والرماة المدافعون', 'لإجبار العدو على صعود مرتفع', 'الاستنزاف بالسهام أو الانسحاب يحرمانك من الحسم'],
  flank: ['فرسان الجناح المختار', 'في أرض واسعة ضد جناح غير محمي', 'الرماح والاحتياط وتأمين الجناح يخفضون النجاح'],
  envelop: ['فرسان الجناحين', 'عندما يثبت قلبك ويضعف احتياط العدو', 'احتياط العدو يرد الجناحين ويكشف ضعفك العددي'],
  reserve: ['رجال الاحتياط والقطاع الذي تسنده', 'لإنقاذ قطاع أو استغلال انهيار الخصم', 'إرسال الجميع مبكرًا يتركك بلا جواب لأزمة لاحقة'],
  press: ['مشاة الصدام والفرسان', 'لحسم قتال يميل لصالحك قبل وصول العدو للاحتياط', 'الجدار الثابت يطيل القتال حتى تُنهك'],
  rally: ['الصفوف المترددة', 'حين تكون المعنويات منخفضة والقائد سليمًا', 'خطر إصابة القائد يزداد؛ لا يعوض نقص الرجال'],
  rotate: ['صفوف لها عمق أو احتياط', 'بعد تعب الصف الأمامي', 'ضغط العدو أثناء التبديل يزيد الخسائر'],
  focus: ['مهندسو الحصار والمشاة', 'حين تريد توسيع ثغرة واحدة', 'المدافع يستطيع جمع رجاله في الموضع نفسه'],
  waves: ['المشاة والاحتياط', 'لاستمرار الاقتحام مع تعب الصف الأول', 'يحتاج رجالًا في الخلف ويستهلك إمدادهم'],
  oil: ['حامية الأسوار', 'قبل أن يعبر المهاجمون الثغرة', 'المدافعون يفقدون أثره عند انهيار السور'],
  withdraw: ['الجيش كله وخاصة المؤخرة', 'عندما تكون خسارة الميدان أقل كلفة من استمرار القتال', 'الفرسان السريعون والتماسك المنخفض يزيدان المطاردة'],
  retreat: ['الناجون من الجيش', 'عند نفاد القيادة أو انهيار التماسك', 'مطاردة الفرسان وعدم وجود مؤخرة منظمة يزيدان الخسائر'],
};
for (const k of ['press', 'shieldwall', 'highground', 'protect', 'conserve']) ORDERS[k].group = 'posture';
for (const k of ['flank', 'envelop', 'raid']) ORDERS[k].deferred = true;

Object.assign(WarSim.prototype, {
  factorSnapshot(s) {
    const r = s.initialReady || s.ready;
    const troops = s.units.filter((u) => u.type !== 'general');
    const men = troops.reduce((n, u) => n + u.men0, 0);
    const quality = men ? troops.reduce((n, u) => n + this.unitMelee({ ...u, men: u.men0 }), 0) / men : 0;
    const ground = this.kind === 'siege' ? (!s.att ? `أسوار من المستوى ${this.walls}` : 'اقتحام تحت دفاعات الأسوار') : !s.att && ['hills', 'mountains'].includes(this.terrain) ? 'يمسك المرتفع' : s.att && this.terrain === 'river' ? 'يعبر النهر تحت الضغط' : this.terrain === 'forest' ? 'مناورة الفرسان محدودة' : this.terrain === 'mountains' ? 'جبهة ضيقة' : 'ميدان مفتوح';
    return [
      { key: 'men', label: 'الجنود المشاركون', value: men + ' رجل', help: 'لا يشمل رجالًا تُركوا على خطوط الحصار. العدد يغذي قوة الصفوف والاحتياط.' },
      { key: 'quality', label: 'جودة التجهيز والخبرة', value: Math.round(quality * 10) / 10, help: 'قوة الالتحام للرجل قبل الأرض والأوامر. ترفعها الوحدات المناسبة والخبرة، ولا تشمل مهارة القائد.' },
      { key: 'leader', label: 'القيادة', value: s.cmd ? s.cmd.name : 'بلا قائد', help: `نقاط القيادة ${this.cmdPoints(s)} في المرحلة. الخبرة تساعد التنفيذ وتثبت الصفوف، ولا تضاعف عدد الرجال.` },
      { key: 'ground', label: 'الموقع والدفاع', value: ground, help: 'المرتفع يحمي المدافع، وضيق الجبهة يقلل قدرة العدد على الالتفاف. معدات الحصار ضرورية لاختراق الأسوار.' },
      { key: 'morale', label: 'المعنويات عند الدخول', value: Math.round(s.morale0 || r.mor) + ' من 100', help: 'انخفاضها يقلل الضرب ويزيد احتمال الفرار. النصر والراحة والقيادة المنضبطة يحسنانها.' },
      { key: 'fatigue', label: 'التعب المحمول', value: Math.round(r.fat) + ' من 100', help: `يبدأ الجيش بكامل تعب القتال السابق. يبقى ${Math.round((1 - r.fat * 0.006) * 100)}٪ من أثر الضرب قبل سائر العوامل.` },
      { key: 'cohesion', label: 'تماسك الصفوف', value: Math.round(r.coh) + '٪', help: 'يحدد قوة الصفوف ودقة الأوامر. الخسائر والفرار يقللانه، والراحة في مدينة صديقة تعيده.' },
      { key: 'supply', label: 'الإمداد والسهام', value: Math.round(r.sup) + '٪ إمداد، ' + Math.round(r.ammo) + '٪ سهام', help: 'كل معركة تنفق مؤنًا. نقص الإمداد يضعف الضرب ويزيد التعب؛ نفاد السهام يوقف الرمي.' },
      { key: 'strain', label: 'إجهاد القيادة', value: Math.round(r.strain || 0) + ' من 100', help: 'يتراكم مع كل معركة ويقل في الدور التالي. عند 65 لا يبقى إلا أمر واحد في المرحلة.' },
      { key: 'plan', label: 'الخطة', value: PLANS[s.plan] ? PLANS[s.plan].name : 'لم تُحدد', help: PLANS[s.plan] ? PLANS[s.plan].desc : 'اختر الخطة والتشكيل قبل بدء القتال.' },
    ];
  },
  // ——— أدوات حساب البطاقات ———
  roleMen(s, roles, secs) { return s.units.filter((u) => this.alive(u) && roles.includes(u.role) && (!secs || secs.includes(u.sec))).reduce((t, u) => t + u.men, 0); },
  roleShare(s, roles) { return this.roleMen(s, roles) / Math.max(1, this.liveMen(s)); },
  ammoAvg(s) {
    const us = s.units.filter((u) => this.alive(u) && u.missile && u.type !== 'catapult');
    const men = us.reduce((t, u) => t + u.men, 0);
    return men ? us.reduce((t, u) => t + Math.max(0, u.ammo) * u.men, 0) / men : 0;
  },
  resMen(s) { return this.secUnits(s, 'Res').filter((u) => u.role !== 'engine' && !(u.hunter && !s.huntDone)).reduce((t, u) => t + u.men, 0); },
  avgFat(s) { const ks = SECTS.filter((k) => this.secUnits(s, k).length); return ks.length ? ks.reduce((t, k) => t + s.sec[k].fat, 0) / ks.length : 0; },
  weakestSec(s) { return SECTS.filter((k) => this.secUnits(s, k).length || s.sec[k].had).sort((a, b) => s.sec[a].morale - s.sec[b].morale)[0] || 'C'; },
  tiredSec(s) { const k = SECTS.filter((x) => this.secUnits(s, x).length).sort((a, b) => s.sec[b].fat - s.sec[a].fat)[0]; return k && s.sec[k].fat >= 25 ? k : null; },
  rotateCut(s) { return s.cmd && s.cmdAlive !== false && (s.cmd.style === 'disciplined' || s.cmd.trait === 'logistician') ? 30 : 20; },
  rallyUp(s) { return s.cmd && (s.cmd.style === 'inspiring' || s.cmd.trait === 'brave') ? 15 : 10; },
  pressMul(s) { const bold = !!(s.cmd && s.cmdAlive !== false && (s.cmd.flaw === 'reckless' || s.cmd.doctrine === 'aggressive')); return { mul: bold ? 1.18 : 1.12, fat: bold ? 6 : 4, bold }; },
  flankWings(s) { return ['L', 'R'].filter((k) => !s.sec[k].flankDone && !s.sec[k].flankOk && s.sec[k].state !== 'broken' && this.roleMen(s, ['cav', 'skirm'], [k]) > 0); },
  bestFlankWing(s) { return this.flankWings(s).sort((a, b) => this.flankChance(s, b) - this.flankChance(s, a))[0] || 'L'; },
  focusSec() { const D = this.sides[1]; return SECTS.filter((k) => D.sec[k].breach < 1).sort((a, b) => D.sec[b].breach - D.sec[a].breach)[0] || 'C'; },
  // فرصة التنفيذ الجيد بلا رمي نرد (للعرض)
  execChance(s, order) {
    const g = s.cmd;
    let p = 0.72 + (g ? 0.05 * (g.rank - 1) : -0.05) - this.cohK(s) * 0.25 - (s.cmdAlive === false ? 0.15 : 0) - (s.cmdHurt ? 0.08 : 0) - s.ready.strain * 0.0025;
    const T = { withdraw: { defender: 0.1, tactician: 0.15, logistician: 0.1, brave: -0.05 } }, F = { withdraw: { reckless: -0.3, cautious: 0.1 } };
    if (g) p += ((T[order] || {})[g.trait] || 0) + ((F[order] || {})[g.flaw] || 0) + ({ cautious: 0.1, defensive: 0.05, aggressive: -0.08 }[g.doctrine] || 0) + ({ disciplined: 0.08, careful: 0.05 }[g.style] || 0);
    return clamp(p + 0.18, 0.1, 0.97);
  },
  flankChance(s, k) {
    const foe = s.foe, tk = OPP[k];
    const cav = this.secUnits(s, k).filter((u) => u.role === 'cav' || u.role === 'skirm' || u.role === 'guard');
    let fp = cav.reduce((t, u) => t + this.unitMelee(u), 0) * (FLANK_TERRAIN[this.terrain] || 1) * (this.weather === 'fog' ? 1.2 : 1);
    if (this.terrain === 'coast' && k === 'R') fp *= 0.5;
    let cp = this.secUnits(foe, tk).reduce((t, u) => t + this.unitMelee(u) * (u.role === 'cav' ? 1.3 : u.role === 'skirm' ? 0.9 : u.role === 'guard' ? 1 : u.role === 'line' ? 0.5 : 0.3), 0) * 0.4;
    cp += (foe.flankCover || 0);
    if (this.cmdTrait(foe, 'tactician')) cp *= 1.2;
    const g = this.genOf(s, k) || s.cmd;
    const bonus = g ? ({ cavalier: 0.2, tactician: 0.15, swift: 0.1 }[g.trait] || 0) * 0.5 + 0.02 * (g.rank - 1) : -0.03;
    let c = 0.3 + 0.45 * (fp - cp) / Math.max(1, fp + cp) + 0.05 + bonus - this.cohK(s) * 0.1;
    if (foe.flankWatch === tk) c -= 0.25;
    if (this.bf(foe, 'watch') && this.bf(foe, 'watch').sec === tk) c -= 0.25;
    if (this.bf(s, 'scout')) c += 0.08;
    if (foe.plan === 'breakcenter') c += 0.12;
    return clamp(c, 0.05, 0.9);
  },
  envelopChance(s) {
    const foe = s.foe;
    const pw = ['L', 'R'].reduce((t, k) => t + this.secUnits(s, k).filter((u) => u.role === 'cav' || u.role === 'skirm').reduce((x, u) => x + this.unitMelee(u), 0), 0) * (FLANK_TERRAIN[this.terrain] || 1);
    const cover = ['L', 'R', 'Res'].reduce((t, k) => t + this.secUnits(foe, k).reduce((x, u) => x + this.unitMelee(u) * (u.role === 'cav' ? 1.2 : 0.4), 0), 0) * 0.5;
    let c = 0.25 + 0.5 * (pw - cover) / Math.max(1, pw + cover) + (s.cmd && s.cmd.trait === 'cavalier' ? 0.08 : 0.04) - this.cohK(s) * 0.1;
    if (this.cmdTrait(foe, 'tactician')) c -= 0.1;
    return clamp(c, 0.05, 0.85);
  },
  logCmd(s, order, q) { s.cmdLog.push({ phase: this.phase, order, q, g: s.cmd ? s.cmd.name : null }); },

  // ——— البطاقات ———
  // عدد الأوامر في المرحلة: واحد، واثنان لقائد بثلاث نجوم أو داهية سليم
  cmdPoints(s) {
    const g = s.cmd;
    if (s.ready.strain >= 65 || s.ready.coh < 40 || s.cmdAlive === false) return 1;
    return 2 + (g && !s.cmdWounded && s.ready.strain < 35 && (g.rank >= 3 || g.trait === 'tactician') ? 1 : 0);
  },
  raidChance(s) { return clamp(0.5 + this.roleShare(s, ['cav', 'skirm']) * 0.25 - this.resMen(s.foe) / Math.max(1, this.liveMen(s.foe)) * 0.6 - (this.bf(s.foe, 'watch') ? 0.15 : 0) - this.cohK(s) * 0.2, 0.12, 0.8); },
  ordersFor(s) {
    const ph = this.phaseKey();
    const out = [];
    for (const [k, o] of Object.entries(ORDERS)) {
      if (o.field && this.kind !== 'field') continue;
      if (o.siege && (this.kind !== 'siege' || o.siege !== (s.att ? 'att' : 'def'))) continue;
      if (o.unlock && !this.unlocked(s, o)) continue;
      let err = null;
      if (!this.awaitingOrders) err = 'بدأ تنفيذ هذه المرحلة؛ الأوامر الجديدة عند بدايتها التالية';
      else if (!o.phases.includes(ph)) err = `متاح في: ${o.phases.map((p) => PH_AR[p]).join('، ')}`;
      else if (s.used[k] === this.phase) err = 'صدر هذا الأمر في هذه المرحلة';
      else if (o.once && s.used[k] != null) err = 'مرة واحدة في المعركة';
      else if (o.max && (s.usedN || {})[k] >= o.max) err = `مرتان في المعركة على الأكثر`;
      else err = o.need(this, s);
      if (!err && (s.cp || 0) < (o.cost || 1) && !o.free) err = `يحتاج ${o.cost || 1} من نقاط القيادة، المتبقي ${s.cp || 0}`;
      if (!err && o.group && Object.keys(s.used).some((key) => s.used[key] === this.phase && ORDERS[key].group === o.group)) err = 'اخترت بالفعل توجيهًا آخر للصفوف في هذه المرحلة';
      out.push({ k, o, err, info: err ? null : o.info(this, s) });
    }
    return out;
  },
  // الأوامر التي يفتحها القائد تظهر فقط إن كان القائد يملكها (مع سبب إن فقد القدرة أثناء المعركة)
  unlocked(s, o) {
    const g = s.gens[0];
    if (o.unlock === 'cav') return !!g && ['cavalier', 'tactician'].includes(g.trait);
    if (o.unlock === 'siege') return !!g && g.trait === 'siege';
    return true;
  },
  issue(s, k, arg) {
    const o = ORDERS[k];
    const x = this.ordersFor(s).find((y) => y.k === k);
    if (!o || !x || x.err) return x ? x.err : 'أمر غير معروف';
    if (!o.free) s.cp = (s.cp || 0) - (o.cost || 1);
    s.used[k] = this.phase;
    s.usedN = s.usedN || {}; s.usedN[k] = (s.usedN[k] || 0) + 1;
    s.orders++;
    this.decisions.push({ side: s.i, kind: 'order:' + k, text: o.name, phase: this.phase, weight: 0 });
    s.orderLog = s.orderLog || [];
    s.orderLog.push({ k, phase: this.phase });
    if (o.deferred) {
      this.queuedOrders.push({ side: s.i, k, arg });
      this.line(s, `أُعد أمر «${o.name}» للتنفيذ عند بدء المرحلة.`, '', 'orderQueued');
      return null;
    }
    const txt = o.apply(this, s, arg);
    if (txt) this.line(s, txt, s.player ? 'good' : '');
    return null;
  },
  // الذكاء يصدر أوامره بالقواعد نفسها
  aiOrders(s) {
    // للاختبار: جانب بلا أوامر أو بأوامر عشوائية لقياس أثر الأوامر
    const mode = this.cfg.sides[s.i] && this.cfg.sides[s.i].orderMode;
    if (mode === 'none') return;
    if (mode === 'random') {
      const opts = this.ordersFor(s).filter((x) => !x.err && !x.o.final);
      while ((s.cp || 0) > 0 && opts.length && !this.over) this.issue(s, opts.splice(Math.floor(this.r() * opts.length), 1)[0].k);
      return;
    }
    const seen = this.observe(s);
    let guard = 0;
    while (((s.cp || 0) > 0 || (this.avgMorale(s) < 18 && this.liveMen(s) / seen.men < .5)) && guard++ < 3 && !this.over) {
      const opts = this.ordersFor(s).filter((x) => !x.err);
      if (!opts.length) return;
      const g = s.cmd, f = g && g.flaw;
      const ratio = this.liveMen(s) / seen.men;
      const minMor = Math.min(...SECTS.filter((k) => this.secUnits(s, k).length).map((k) => s.sec[k].morale), 100);
      const val = (x) => {
        const i = x.info || {};
        switch (x.k) {
          case 'scout': return s.intel < 3 ? 1.5 : 0.7;
          case 'fortify': return ratio < 1.1 || s.plan === 'defensive' || s.plan === 'highground' ? 1.4 : 0.5;
          case 'conserve': return this.roleShare(s, ['missile', 'skirm']) < 0.25 ? clamp((s.ready.fat - 20) / 50, 0, 1.1) : -1;
          case 'protect': return s.sec.C.morale < 45 ? 1.6 : seen.plan === 'breakcenter' ? 1.2 : 0.3;
          case 'watch': return seen.plan === 'flanking' || seen.plan === 'feigned' ? 1.2 : seen.cav > .4 ? .75 : .2;
          case 'raid': return seen.supply < 70 && this.roleShare(s,['cav','skirm']) > .35 ? 1 : .3;
          case 'volley': return 0.4 + this.roleShare(s, ['missile', 'skirm']) * 2 - seen.cav - (this.weather === 'rain' ? 0.8 : 0);
          case 'shieldwall': return this.phaseKey() === 'contact' ? seen.cav * 2.5 + this.roleShare(s, ['line']) - 0.3 : 0.2;
          case 'highground': return 1.2;
          case 'flank': return ((s.scouted ? i.chance : .5 + this.roleShare(s,['cav','skirm'])*.2 - seen.cav*.15) || 0) * 2 - 0.5 + (f === 'cautious' ? -0.1 : 0);
          case 'envelop': return ((s.scouted ? i.chance : .5 - seen.line*.25) || 0) * 2.4 - 0.7;
          case 'reserve': return minMor < 55 ? 1.4 + (55 - minMor) / 20 : this.phaseKey() === 'crisis' ? 1.4 : this.phase >= 1 && ratio < .85 ? .85 : .1;
          case 'press': return (ratio > 1.2 ? 0.8 : 0.2) + (f === 'reckless' || (g && g.doctrine === 'aggressive') ? 0.4 : 0) - (this.avgFat(s) > 55 ? 1 : 0) + (s.aggr - 1);
          case 'rally': return minMor < 50 ? 0.9 + (g && g.trait === 'brave' ? 0.3 : 0) - (g && g.style === 'careful' ? 0.3 : 0) : 0;
          case 'rotate': { const k = this.tiredSec(s); return k ? (s.sec[k].fat - 35) / 25 : 0; }
          case 'waves': return this.avgFat(s) > 30 ? 0.8 : 0.3;
          case 'oil': return 1.3;
          case 'focus': return 1.4;
          // الحذر يرى الهزيمة مبكراً فينسحب ليحفظ رجاله
          case 'withdraw': return (this.avgMorale(s) < 25 && ratio < 0.6) || (f === 'cautious' && this.phase >= 2 && this.avgMorale(s) < 30 && ratio < 0.7) ? 1.2 + (f === 'cautious' ? 0.3 : 0) - (f === 'reckless' ? 0.6 : 0) : -9;
          case 'retreat': return this.avgMorale(s) < 18 && ratio < .5 ? 1.7 : -9;
          default: return 0;
        }
      };
      const competence=clamp(s.ai*.65+(g?.skills?.command||g?.rank||1)*.07,.2,.95);
      const noise = (1.1 - competence) * .9;
      const bold=['bold','ambitious','proud'].includes(g?.personality),careful=['careful','austere'].includes(g?.personality);
      const best = opts.map((x) => ({ x, v: val(x) + (bold && ['press','flank','envelop'].includes(x.k) ? .12 : careful && ['protect','shieldwall','withdraw'].includes(x.k) ? .15 : 0) + (this.r() - 0.5) * noise })).sort((a, b) => b.v - a.v)[0];
      if (!best || best.v < 0.6) return;
      const ownWing=['L','R'].sort((a,b)=>this.roleMen(s,['cav','skirm'],[b])-this.roleMen(s,['cav','skirm'],[a]))[0];
      const arg = best.x.k === 'reserve' ? this.weakestSec(s) : best.x.k === 'flank' ? (s.scouted?this.bestFlankWing(s):ownWing) : best.x.k === 'watch' ? (this.r()<.5?'L':'R') : undefined;
      this.issue(s, best.x.k, arg);
      if (best.x.o.final) return;
    }
  },

  // ——— حال الجيش بعد المعركة (تُحفظ في الحملة) ———
  sideAfter(s) {
    const us = s.units.filter((u) => u.men > 0 && u.state !== 'dead');
    const men = us.reduce((t, u) => t + u.men, 0) || 1;
    const fat = us.reduce((t, u) => t + (s.sec[u.sec] ? s.sec[u.sec].fat : 0) * u.men, 0) / men;
    const ms = us.filter((u) => u.missile && u.type !== 'catapult');
    const a0 = ms.reduce((t, u) => t + (u.ammoFull || 0) * u.men, 0);
    const ammoPct = a0 ? 100 * ms.reduce((t, u) => t + (Math.max(0, u.ammo) + (u.reserveAmmo || 0)) * u.men, 0) / a0 : null;
    const won = this.winner === s.i;
    const lost = s.men0 - this.totalMen(s);
    return {
      won, fat: Math.round(fat), mor: Math.round(this.avgMorale(s)), ammo: ammoPct == null ? null : Math.round(ammoPct),
      lossPct: Math.round(100 * lost / Math.max(1, s.men0)), broken: SECTS.filter((k) => s.sec[k].state === 'broken').length,
      routed: !won && !s.orderly && this.reason !== 'terms', orderly: !!s.orderly, cmdHurt: !!(s.cmdWounded && s.cmdAlive !== false),
      phases: Math.max(1, this.phase + 1), orders: s.orders, supply: s.ready.sup,
    };
  },
});

// المعدات الكاملة لكل وحدة (لحساب نسبة السهام الباقية)
{
  const mk = WarSim.prototype.makeUnit;
  WarSim.prototype.makeUnit = function (side, type, men, exp, ref, k, gen) {
    const u = mk.call(this, side, type, men, exp, ref, k, gen);
    const d = UNITS[type];
    u.ammoFull = d.range ? (type === 'catapult' ? 8 : d.cls === 'cav' ? 4 : 5) : 0;
    u.reserveAmmo = type !== 'catapult' && u.ammo >= 3 ? 1 : 0;
    u.ammo -= u.reserveAmmo;
    return u;
  };
  const res = WarSim.prototype.result;
  WarSim.prototype.result = function () {
    const r = res.call(this);
    // ثغرة فُتحت ولو صُدّ الاقتحام: تزيد فرص قبول الاستسلام بعدها
    r.breached = this.kind === 'siege' && SECTS.some((k) => this.sides[1].sec[k].breach >= 1);
    this.sides.forEach((s, i) => {
      r.sides[i].after = this.sideAfter(s);
      r.sides[i].units.forEach((u, j) => { u.held = s.units[j] ? s.units[j].held || 0 : 0; });
    });
    return r;
  };
}

// ——————————————— الجاهزية ———————————————
const Ready = {
  base() { return { fat: 0, mor: 72, ammo: 100, coh: 100, sup: 100, strain: 0, battles: 0 }; },
  // الجاهزية مجموع موزون يمكن شرحه: الراحة والمعنويات والتماسك والإمداد والسهام
  score(r, o = {}) {
    r = { ...this.base(), ...(r || {}) };
    const parts = [
      ['الراحة', 100 - r.fat, 0.25, 'fat'],
      ['المعنويات', Math.min(100, Math.round(r.mor / 75 * 100)), 0.2, 'mor'],
      ['التماسك', r.coh, 0.2, 'coh'],
      ['الإمداد', r.sup, 0.15, 'sup'],
      ['السهام', o.missile === false ? 100 : r.ammo, 0.1, 'ammo'],
      ['تركيز القيادة', 100 - r.strain, 0.1, 'strain'],
    ];
    let t = parts.reduce((s, p) => s + p[1] * p[2], 0);
    if (o.hurt) t -= 8;
    return { total: Math.round(clamp(t, 0, 100)), parts };
  },
  // بعد المعركة: ما حدث في الميدان يبقى مع الجيش
  after(before, st) {
    const b = { ...this.base(), ...(before || {}) };
    const r = { ...b };
    const rounds = Math.max(1, st.phases || 1);
    r.fat = clamp(Math.round(Math.max(st.fat, b.fat + 12 + rounds * 2 + b.battles * 4)), 0, 100);
    r.mor = st.won ? clamp(Math.round(Math.min(b.mor + 6, st.mor + 10)), 15, 88) : clamp(Math.round(st.mor + (st.orderly ? 10 : 3)), 5, 55);
    if (st.ammo != null) r.ammo = clamp(Math.min(b.ammo, st.ammo), 0, 100);
    r.coh = clamp(Math.round(b.coh - 5 - st.lossPct * 0.7 - st.broken * 5 - (st.routed ? 12 : 0) - b.battles * 3), 5, 100);
    r.sup = clamp(Math.min(b.sup, st.supply == null ? b.sup : st.supply) - 6 - rounds * 2 - (st.routed ? 10 : 0), 0, 100);
    r.strain = clamp(b.strain + 10 + rounds * 2 + Math.ceil((st.orders || 0) / 2) + (st.routed ? 8 : 0), 0, 100);
    r.battles = b.battles + 1;
    return r;
  },
  mix(list) {
    // جيوش متعددة في معركة واحدة: متوسط موزون بالرجال
    const tot = list.reduce((t, x) => t + x.w, 0);
    if (!tot) return this.base();
    const r = { fat: 0, mor: 0, ammo: 0, coh: 0, sup: 0, strain: 0 };
    for (const x of list) for (const k in r) r[k] += (x.r[k] == null ? this.base()[k] : x.r[k]) * x.w / tot;
    for (const k in r) r[k] = Math.round(r[k]);
    r.battles = Math.max(0, ...list.filter((x) => x.w > 0).map((x) => x.r.battles || 0));
    return r;
  },
};

// ——————————————— التقرير المقسّم ———————————————
const LEDGER_TXT = {
  missile: (v, s) => `سهام ${s.name} أسقطت نحو ${Math.round(v)} رجلاً`,
  charge: (v, s) => `انقضاض فرسان ${s.name} في الالتحام الأول أسقط ${Math.round(v)} رجلاً`,
  melee: (v, s) => `مشاة ${s.name} في الالتحام أسقطوا ${Math.round(v)} رجلاً`,
  spears: (v, s) => `رماح ${s.name} صدّت الفرسان وأسقطت ${Math.round(v)} منهم`,
  flank: (v, s) => `التفاف جيش ${s.name} على جناح خصمه وضربه من الجانب`,
  feint: (v, s) => `استدراج جيش ${s.name} لخصمه إلى فخ الفرسان`,
  hunt: (v, s) => `فرقة صيد ${s.name} التي بلغت القائد`,
  commander: (v, s) => `سقوط القائد أمام ${s.name}`,
  breach: (v, s) => `ثغرة فتحها جيش ${s.name} في السور`,
  walls: (v, s) => `أسوار ${s.name}: من تحتها سقط نحو ${Math.round(v * 2)} رجلاً`,
  highground: (v, s) => `تمسك ${s.name} بالمرتفع`,
  reserve: (v, s) => `احتياط ${s.name} دخل في وقته`,
  sally: (v, s) => `خروج ${s.name} المفاجئ على المعدات`,
  pursuit: (v, s) => `مطاردة ${s.name} للمنهزمين (${Math.round(v)} رجلاً)`,
  guard: (v, s) => `حرس قائد ${s.name}`,
  evade: (v, s) => `مراوغة رماة ${s.name} قبل الالتحام`,
  breakcenter: (v, s) => `كسر جيش ${s.name} لقلب خصمه وشق صفوفه`,
};
// الأمر يُنسب إليه أثر فقط إن وقع الأثر المرتبط به في المرحلة نفسها
const ORDER_MOMENT = { flank: ['flank'], envelop: ['envelop'], reserve: ['hold', 'counter', 'breakcenter'], rally: ['hold'], focus: ['breach'], oil: ['ram'], press: ['broken', 'breakcenter', 'roll'], shieldwall: [], volley: [], highground: [], rotate: [], waves: ['breach'], withdraw: [] };
const orderHit = (sim, s, o) => sim.moments.find((m) => m.side === s.i && m.phase === o.phase && (ORDER_MOMENT[o.k] || []).includes(m.kind) && m.weight >= 3);
const ORDER_Q = { excellent: 'بإتقان', good: 'جيداً', poor: 'بتعثر', fail: 'ففشل', disobey: 'فعصاه قادته' };

Object.assign(WarSim.prototype, {
  sideReport(s, rep) {
    const foe = s.foe, siege = this.kind === 'siege';
    const good = Object.entries(s.ledger).filter(([k, v]) => LEDGER_TXT[k] && v > 0 && !(k === 'rout')).sort((a, b) => b[1] - a[1]);
    const worked = good.slice(0, 3).filter(([k, v]) => v >= 8).map(([k, v]) => LEDGER_TXT[k](v, s, this));
    for (const o of s.orderLog || []) {
      const m = orderHit(this, s, o);
      if (m && worked.length < 4) worked.push(`أمر «${ORDERS[o.k].name}» في ${PH_AR[WS_PHASES[o.phase].key] || 'المعركة'}: ${m.text}`);
    }
    const fgood = Object.entries(foe.ledger).filter(([k, v]) => LEDGER_TXT[k] && v >= 8 && k !== 'rout' && k !== 'pursuit').sort((a, b) => b[1] - a[1]);
    const cost = fgood.slice(0, 2).map(([k, v]) => LEDGER_TXT[k](v, foe, this));
    for (const d of this.decisions.filter((x) => x.side === s.i && x.weight > 0).sort((a, b) => b.weight - a.weight).slice(0, 2)) cost.push(d.text);
    const R0 = s.initialReady || s.ready;
    if (R0.fat >= 30) cost.push(`دخل المعركة متعباً (التعب ${Math.round(R0.fat)} من 100)`);
    if (R0.coh <= 70) cost.push(`دخل المعركة بتماسك ${Math.round(R0.coh)} من 100 بعد قتال سابق`);
    if (R0.ammo <= 50 && this.roleMen(s, ['missile', 'skirm']) > 0) cost.push(`سهام قليلة منذ البداية (${Math.round(R0.ammo)}٪)`);
    if (s.commit < 1) cost.push(`قاتل بجزء من الجيش (${pctTxt(s.commit)}) وبقي الباقي على خطوط الحصار`);
    // دور القائد
    const g = s.cmd;
    let role;
    if (!g) role = 'لم يكن للجيش قائد: الأوامر أبطأ والمعنويات أقل.';
    else {
      const posTxt = { front: 'قاتل في المقدمة', center: 'قاد من القلب', rear: 'أدار المعركة من المؤخرة' }[s.cmdPos] || 'قاد الجيش';
      const bits = [`${g.name} (${'★'.repeat(g.rank)}) ${posTxt}`];
      const ords = (s.orderLog || []).map((o) => ORDERS[o.k].name);
      if (ords.length) bits.push(`وأصدر: ${[...new Set(ords)].join('، ')}`);
      const q = s.cmdLog.filter((x) => x.q === 'excellent').length, bad = s.cmdLog.filter((x) => x.q === 'fail' || x.q === 'disobey').length;
      if (q) bits.push('ونُفّذ بعض أوامره بإتقان');
      if (bad) bits.push('وتعثر تنفيذ بعضها');
      if ((s.orderLog || []).some((o) => ORDERS[o.k].unlock)) bits.push('واستعمل مناورة لا يعرفها إلا أمثاله');
      const fate = this.resolvedFates?.[g.id] || (s.cmdAlive === false ? s.cmdFate || 'killed' : null);
      if (fate) bits.push(fate === 'captured' ? 'ثم أُسر' : 'ثم سقط في الميدان');
      else if (s.cmdWounded && !s.cmdHurt) bits.push('وجُرح أثناء القتال');
      else if (s.cmdHurt) bits.push('وقاتل وهو جريح من معركة سابقة');
      role = bits.join(' ') + '.';
    }
    const lostBy = {};
    for (const u of s.units) { const l = u.men0 - Math.max(0, u.men); if (l > 0 && u.type !== 'general') lostBy[UNITS[u.type].name] = (lostBy[UNITS[u.type].name] || 0) + l; }
    const after = this.sideAfter(s);
    const before = Ready.score(R0, { hurt: s.cmdHurt }).total;
    const rNext = Ready.after(R0, after);
    return { worked, cost: cost.slice(0, 4), role, lostBy, after, readyBefore: before, readyAfter: Ready.score(rNext, { hurt: after.cmdHurt }).total, readyNext: rNext, factors: s.initialFactors || this.factorSnapshot(s) };
  },
  // حكم أدق من منظور كل طرف
  verdictFor(i, rep) {
    const me = rep.cas[i], them = rep.cas[1 - i];
    const won = rep.winner === i;
    if (rep.reason === 'withdraw') return won ? 'العدو انسحب' : (this.sides[i].orderly ? 'انسحاب منظم' : 'انسحاب مضطرب');
    if (rep.reason === 'terms') return won ? 'استسلمت الحامية' : 'استسلام';
    if (won) {
      if (me.pct >= 40) return 'نصر باهظ الثمن';
      if (me.pct <= 20 && them.pct - me.pct >= 30) return 'نصر حاسم';
      if (me.pct >= 22 || them.pct - me.pct < 10 || this.avgMorale(this.sides[i]) < 40) return 'نصر صعب';
      return 'نصر واضح';
    }
    if (me.pct >= 50 || me.pct - them.pct >= 30) return 'هزيمة ساحقة';
    if (them.pct >= me.pct) return 'هزيمة كلّفت العدو غالياً';
    return 'هزيمة';
  },
});

// ——————————————— القصة من مكوّنات ———————————————
// كل مكوّن يقرأ وقائع المحاكاة، وله صيغ متعددة تُختار ببذرة المعركة: الأرض، القائد، الوحدة، المعنويات، القرار، التحول، الخاتمة
const TERRAIN_STORY = { plains: 'السهول', hills: 'التلال', forest: 'الغابة', mountains: 'الجبال', desert: 'الصحراء', river: 'ضفاف النهر', coast: 'الساحل' };
const STORY = {
  terrain(sim, W, L, pick) {
    const T = TERRAIN_STORY[sim.terrain] || 'الميدان';
    const wx = sim.weather !== 'clear' ? WEATHER[sim.weather].name : null;
    const place = sim.place || 'الحدود';
    if (sim.kind === 'siege') {
      const wn = ['بلا أسوار', 'سياج خشبي', 'أسوار حجرية', 'قلعة', 'قلعة عظمى'][sim.walls];
      return pick([
        `كانت ${place} خلف ${wn}${wx ? '، والسماء ' + wx : ''}.`,
        `تحمي ${place} ${wn}${wx ? ' في يوم ' + wx : ''}، وأمامها معسكر جيش ${sim.sides[0].name}.`,
        `وقف جيش ${sim.sides[0].name} أمام ${wn} في ${place}${wx ? '، و' + wx + ' يثقل الرجال' : ''}.`,
      ]);
    }
    const note = (sim.tnotes || []).find(([side]) => !side || side === W);
    const mattered = note && ((note[1] === 'plains' && (W.ledger.charge > 20 || W.ledger.flank > 40)) || note[1] === 'highground' || note[1] === 'pass' || (note[1] === 'forest' && L.units.some((u) => u.role === 'cav')) || note[1] === 'weather');
    if (mattered) return pick([`${note[2]}، وكان لذلك أثره في يوم ${place}.`, `في ${T} عند ${place}: ${note[2]}.`, `لم تكن الأرض محايدة عند ${place}: ${note[2]}.`]);
    return pick([`جرت المعركة في ${T} عند ${place}${wx ? ' في يوم ' + wx : ''}.`, `عند ${place}، في ${T}${wx ? ' تحت ' + wx : ''}، اصطف الجيشان.`, `التقى الجيشان في ${T} قرب ${place}${wx ? ' في يوم ' + wx : ''}.`]);
  },
  commanders(sim, W, L, pick) {
    const [a, d] = sim.sides;
    const gn = (s) => (s.cmd ? `${s.cmd.name}${s.cmd.rank >= 3 ? ' ذو الصيت' : ''}` : 'قائد بلا اسم');
    const pl = (s) => (PLANS[s.plan] ? PLANS[s.plan].name : 'بلا خطة');
    const tired = [a, d].find((s) => s.ready.fat >= 35 || s.ready.coh <= 65);
    const extra = tired ? ` وكان جيش ${tired.name} قد خرج من قتال قريب منهكاً.` : '';
    return pick([
      `قاد ${gn(a)} جيش ${a.name} بخطة «${pl(a)}»، وقابله ${gn(d)} بخطة «${pl(d)}».${extra}`,
      `اختار ${gn(a)} «${pl(a)}»، بينما رأى ${gn(d)} أن «${pl(d)}» أنسب.${extra}`,
      `جيش ${a.name} بقيادة ${gn(a)} في مواجهة جيش ${d.name} بقيادة ${gn(d)}: «${pl(a)}» ضد «${pl(d)}».${extra}`,
    ]);
  },
  unit(sim, W, L, pick) {
    const by = {};
    for (const u of W.units) if (u.type !== 'general') by[u.type] = (by[u.type] || 0) + (u.kills || 0);
    const top = Object.entries(by).sort((x, y) => y[1] - x[1])[0];
    if (!top || top[1] < 10) return null;
    const nm = UNITS[top[0]].name, k = Math.round(top[1]);
    return pick([`أشد ما لقيه جيش ${L.name} وحدات ${nm} في جيش ${W.name}: نحو ${k} قتيلاً بأيديهم.`, `حملت وحدات ${nm} العبء الأكبر في جيش ${W.name}، وأسقطت نحو ${k} رجلاً.`, `نحو ${k} من قتلى جيش ${L.name} سقطوا أمام وحدات ${nm}.`]);
  },
  morale(sim, W, L, pick) {
    const br = sim.lines.find((l) => l.key === 'broken' && l.side === L.i);
    if (br) {
      const ph = WS_PHASES[Math.max(0, br.phase)];
      const phn = sim.kind === 'siege' ? ph.siege : ph.name;
      const where = br.text.replace(/^انهار /, '').replace(/ لدى .*$/, '');
      return pick([`أول ما انكسر كان ${where} في ${phn}.`, `في ${phn} لم يعد ${where} في جيش ${L.name} يحتمل.`, `بدأ الانهيار من ${where} في ${phn}.`]);
    }
    const m = Math.round(sim.avgMorale(L));
    return pick([`لم ينكسر جيش ${L.name} دفعة واحدة، لكن معنوياته هبطت إلى ${m} من 100.`, `تآكلت معنويات جيش ${L.name} حتى ${m} من 100.`, `بقي جيش ${L.name} متماسكاً إلى حد، ثم نزلت معنوياته إلى ${m}.`]);
  },
  decision(sim, W, L, pick) {
    const ords = sim.sides.flatMap((s) => (s.orderLog || []).map((o) => ({ s, o })));
    const hits = ords.map(({ s, o }) => ({ s, o, m: orderHit(sim, s, o) })).filter((x) => x.m);
    const hit = hits.filter((x) => x.s === W).sort((a, b) => b.m.weight - a.m.weight)[0] || hits.sort((a, b) => b.m.weight - a.m.weight)[0];
    if (hit) {
      const who = hit.s.cmd ? hit.s.cmd.name : `قائد ${hit.s.name}`, on = ORDERS[hit.o.k].name, phn = PH_AR[WS_PHASES[hit.o.phase].key] || 'المعركة';
      if (hit.s === W) return pick([`القرار الذي صنع الفرق: «${on}» من ${who}، فكان ${hit.m.text}.`, `أمر ${who} بـ«${on}»، ونتج عنه ${hit.m.text}.`, `في ${phn} جاء أمر «${on}»: ${hit.m.text}.`]);
      return pick([`حاول ${who} أن يقلب اليوم بأمر «${on}»، فكان ${hit.m.text}، لكن ذلك لم يكفِ.`, `في ${phn} أمر ${who} بـ«${on}» فنجح أمره، ولم يغيّر ذلك النتيجة.`]);
    }
    const mis = sim.decisions.filter((d) => d.weight > 1).sort((a, b) => b.weight - a.weight)[0];
    if (mis) { const nm = sim.sides[mis.side].name; return pick([`ومن أثقل ما جرى على جيش ${nm}: ${mis.text.replace(/\.$/, '')}.`, `ولم ينسَ الناجون من جيش ${nm} ما حدث: ${mis.text.replace(/\.$/, '')}.`]); }
    return null;
  },
  turning(sim, W, L, pick, rep) {
    if (!rep.turning) return null;
    const t = rep.turning.replace(/\.$/, '');
    return pick([`ولحظة التحول: ${t}.`, `ومن هنا مالت الكفة: ${t}.`, `ثم جاءت اللحظة التي حسمت اليوم: ${t}.`]);
  },
  ending(sim, W, L, pick, rep) {
    const cw = rep.cas[W.i], cl = rep.cas[L.i];
    const fall = sim.sides.filter((s) => s.cmdAlive === false).map((s) => `${s.cmdFate === 'captured' ? 'أُسر' : 'سقط'} ${s.cmd.name}`);
    const fates = fall.length ? ' ' + fall.join('، و') + '.' : '';
    if (sim.reason === 'terms') return `وانتهى اليوم باستسلام الحامية. خسر جيش ${W.name} ${cw.lost} رجلاً.${fates}`;
    if (sim.reason === 'withdraw') return pick([`وانسحب جيش ${L.name} ${L.orderly ? 'بانتظام' : 'في فوضى'} بعد أن خسر ${cl.lost} رجلاً، وخسر جيش ${W.name} ${cw.lost}.${fates}`, `ترك جيش ${L.name} الميدان (${cl.lost} بين قتيل وأسير) ليقاتل يوماً آخر.${fates}`]);
    const v = rep.verdict;
    return pick([`${v} ${arLam(W.name)}: خسر ${cw.lost} من ${cw.men0}، وخسر جيش ${L.name} ${cl.lost} من ${cl.men0}.${fates}`, `انتهى اليوم ${v} ${arLam(W.name)}. القتلى والأسرى: ${cw.lost} مقابل ${cl.lost}.${fates}`, `ثمن اليوم: ${cw.lost} رجلاً ${arLam(W.name)} و${cl.lost} ${arLam(L.name)}، و${v} ${arLam(W.name)}.${fates}`]);
  },
};

{
  const rep0 = WarSim.prototype.report;
  WarSim.prototype.report = function () {
    const rep = rep0.call(this);
    if (!rep) return rep;
    rep.sides = this.sides.map((s) => this.sideReport(s, rep));
    rep.verdicts = this.sides.map((s) => this.verdictFor(s.i, rep));
    rep.verdict = rep.verdicts[rep.winner];
    rep.story = this.storyParts(rep).join(' ');
    return rep;
  };
  WarSim.prototype.storyParts = function (rep) {
    const W = this.sides[this.winner], L = this.sides[1 - this.winner];
    const r = rng(((this.cfg.seed || 7) * 7919 + 17) >>> 0);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const order = r() < 0.5 ? ['terrain', 'commanders', 'unit', 'morale', 'decision', 'turning', 'ending'] : ['commanders', 'terrain', 'decision', 'unit', 'morale', 'turning', 'ending'];
    const parts = [];
    for (const k of order) {
      const t = STORY[k](this, W, L, pick, rep);
      if (!t) continue;
      // لا تكرار للواقعة نفسها في جملتين
      if (k === 'turning' && rep.turning && parts.some((x) => x.includes(rep.turning.replace(/\s*\(.*\)\.?$/, '')))) continue;
      parts.push(t);
    }
    return parts;
  };
}

// عرض التقرير المقسّم
BattleReport.mine = function (rep, P) {
  const won = rep.winner === P;
  const t = rep.verdicts ? rep.verdicts[P] : won ? rep.verdict : 'هزيمة';
  return { won, text: t, sub: won ? `على ${rep.loserName}` : `أمام ${rep.winnerName}` };
};
BattleReport.render = function (rep, P, o = {}) {
  if (!rep) return h('p', null, 'لا تقرير');
  const me = P != null ? this.mine(rep, P) : null;
  const i = P != null ? P : rep.winner;
  const S = rep.sides ? rep.sides[i] : null;
  const headTxt = me ? `${me.text} ${me.sub}` : `${rep.verdict}: ${rep.winnerName}`;
  const sec = (ic, title, body) => (body ? h('div', { class: 'br-sec' }, h('div', { class: 'br-sh' }, icon(ic), h('b', null, title)), body) : null);
  const list = (arr, cls) => (arr && arr.length ? h('ul', { class: 'br-list ' + (cls || '') }, arr.map((x) => h('li', null, rich(x)))) : null);
  return h('div', { class: 'breport' },
    o.head === false ? null : h('div', { class: 'br-verdict' }, icon(me && !me.won ? 'crownbroken' : 'laurel'), h('b', null, headTxt), h('span', { class: 'muted small' }, rep.plans.join(' ضد '))),
    sec('hourglass', 'لحظة التحول', rep.turning ? h('p', null, rich(rep.turning)) : h('p', { class: 'muted' }, 'لم تكن هناك لحظة واحدة حاسمة: تآكل تدريجي.')),
    S ? sec('check', 'ما نجح', list(S.worked, 'good') || h('p', { class: 'muted' }, 'لا شيء يُذكر في هذه المعركة.')) : null,
    S ? sec('warning', 'ما كلّفك', list(S.cost, 'bad') || h('p', { class: 'muted' }, 'لا أخطاء واضحة.')) : null,
    S ? sec('helmet', 'دور القائد', h('p', null, rich(S.role))) : null,
    sec('skull', 'الخسائر', h('div', { class: 'br-cas' }, rep.cas.map((c, k) => h('div', { class: 'br-side' }, dotEl(c.color), h('b', null, c.name), h('span', { class: 'muted' }, `${c.men0} رجل`), h('span', { class: 'bad' }, `−${c.lost} (${c.pct}٪)`),
      rep.sides && k === i ? h('span', { class: 'muted small' }, Object.entries(rep.sides[k].lostBy).map(([n, v]) => `${n} ${v}`).join('، ')) : null)))),
    S && o.ready !== false ? sec('banner', 'جاهزية جيشك بعد المعركة', h('p', null, rich(`${S.readyBefore}٪ قبلها، ${S.readyAfter}٪ بعدها. التعب ${S.readyNext.fat}، المعنويات ${S.readyNext.mor}، التماسك ${S.readyNext.coh}، السهام ${S.readyNext.ammo}٪. الراحة في مدينة لك تعيدها.`))) : null,
    h('details', { class: 'br-story' }, h('summary', null, 'قصة المعركة'), h('p', null, rep.story)),
  );
};

// ——— أرقام الخطة في سياقها (قبل المعركة) ———
Object.assign(WarSim.prototype, {
  planBrief(s, k) {
    const foe = s.foe, t = this.terrain;
    const seen = s.intel >= 2;
    const my = (r) => this.roleMen(s, r), fo = (r) => (seen ? this.roleMen(foe, r) : '؟');
    const ratio = this.liveMen(s) / Math.max(1, this.liveMen(foe));
    const rTxt = seen ? (ratio >= 1 ? '×' + ratio.toFixed(1) + ' لك' : '×' + (1 / Math.max(0.05, ratio)).toFixed(1) + ' للعدو') : 'غير معروف';
    const TN = TERRAIN[t] ? TERRAIN[t].name : t;
    const wall = ['بلا أسوار', 'سياج خشبي', 'أسوار حجرية', 'قلعة', 'قلعة عظمى'][this.walls];
    const eq = [this.equip.ram && 'كبش', this.equip.ladders && 'سلالم', this.equip.tower && 'برج', s.units.some((u) => u.type === 'catapult') && 'منجنيق'].filter(Boolean).join('، ') || 'لا شيء';
    const B = {
      balanced: { nums: [['الرجال', rTxt], ['احتياطك', this.secMen(s, 'Res')]], risk: 0, why: 'لا خطر خاص، ولا حسم سريع' },
      assault: { nums: [['الرجال', rTxt], ['رماة العدو', fo(['missile'])], ['رماحه', fo(['line'])]], risk: ratio < 1.1 ? 2 : 1, why: 'تعب +5 كل جولة: إن طالت المعركة انقلبت عليك' },
      defensive: { nums: [['رماحك', my(['line'])], ['رماتك', my(['missile'])]], risk: 0, why: 'لا تكسب أرضاً، وإن كان العدو رماة استنزفك' },
      flanking: { nums: [['فرسانك', my(['cav', 'skirm'])], ['فرسان العدو', fo(['cav', 'skirm'])], [TN, '×' + (FLANK_TERRAIN[t] || 1)]], risk: (FLANK_TERRAIN[t] || 1) < 1 ? 2 : 1, why: (FLANK_TERRAIN[t] || 1) < 1 ? `${TN} تعيق الدوران` : 'إن فشل الالتفاف تعب الفرسان وخسروا' },
      attrition: { nums: [['رماتك', my(['missile', 'skirm'])], ['رميات', this.ammoAvg(s).toFixed(1)], ['فرسان العدو', fo(['cav'])], this.weather === 'rain' ? ['المطر', '−40٪'] : null], risk: this.weather === 'rain' ? 2 : 1, why: this.weather === 'rain' ? 'المطر يُضعف السهام' : 'الخيالة السريعة تلحق بالرماة' },
      feigned: { nums: [['فرسانك', my(['cav', 'skirm'])], ['قائد العدو', foe.cmd && s.intel >= 1 ? (foe.cmd.flaw && FLAWS[foe.cmd.flaw] ? FLAWS[foe.cmd.flaw].name : 'بلا عيب ظاهر') : 'غير معروف']], risk: 2, why: 'إن لم ينخدع العدو خسر القلب أرضاً، وقد يتحول التظاهر إلى هزيمة' },
      highground: { nums: [['الأرض', TN], ['الضربات الصاعدة', '−15٪']], risk: 0, why: 'لا مطاردة بعد النصر' },
      breakcenter: { nums: [['مشاة الصدام', my(['shock', 'guard'])], ['قلب العدو', seen ? this.secMen(foe, 'C') : '؟']], risk: 1, why: 'الجناحان رقيقان أمام الالتفاف' },
      hunt: { nums: [['فرسانك', my(['cav'])], ['موقع قائد العدو', foe.cmd && s.intel >= 1 ? CMD_POS[foe.cmdPos].name : 'غير معروف']], risk: 2, why: 'فرقة الصيد تغيب عن الصفوف وقد تُباد' },
      storm: { nums: [['الأسوار', wall], ['معداتك', eq]], risk: 2, why: 'الزيت والسهام على الكبش' },
      escalade: { nums: [['الأسوار', wall], ['الرجال', rTxt]], risk: this.walls >= 3 ? 2 : 1, why: 'خسائر التسلق ثقيلة' },
      towers: { nums: [['الأسوار', wall], ['معداتك', eq]], risk: 1, why: 'قد يُحرق البرج قبل وصوله' },
      bombard: { nums: [['المناجيق', s.units.filter((u) => u.type === 'catapult').length], ['الأسوار', wall]], risk: 1, why: 'قد يخرج المدافعون لإحراق الآلات' },
      night: { nums: [['رماة الأسوار', '−45٪'], ['دقة الأوامر', '−8٪']], risk: 1, why: 'الفوضى وضياع الأوامر' },
      starve: { nums: [['مؤن المدينة', this.cfg.stores != null ? this.cfg.stores + ' أدوار' : '؟']], risk: 0, why: 'الوقت يمنح المدافعين فرصة للنجدة' },
      walls: { nums: [['الأسوار', wall], ['رماتك', my(['missile'])]], risk: 0, why: 'إن سقط السور تبعثرت الصفوف' },
      depth: { nums: [['الأسوار', wall], ['قتال الشوارع', '+35٪']], risk: 1, why: 'المهاجم يبلغ السور أسرع' },
      sally: { nums: [['قوة الخروج', this.roleMen(s, ['cav', 'shock', 'guard'], ['Res'])], ['معدات العدو', [this.towerAlive && 'برج', this.ramAlive && 'كبش'].filter(Boolean).join('، ') || 'لا شيء']], risk: 2, why: 'قد تُحاصر القوة الخارجة وتُباد' },
    }[k] || { nums: [], risk: 1, why: '' };
    B.nums = B.nums.filter(Boolean);
    return B;
  },
});
