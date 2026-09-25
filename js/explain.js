'use strict';
// الشرح: كل رقم مهم يُفتح بالضغط ويجيب عن خمسة أسئلة:
// ماذا يعني؟ من أين جاء؟ ماذا يؤثر الآن؟ ماذا يحدث لو ارتفع أو انخفض؟ كيف أحسّنه؟
// المضاعفات الخام (مثل ×0.80) لا تظهر إلا في «تفاصيل متقدمة».
// كل دالة تُرجع كائن شرح يعرضه Help.explain.

const pct = (x) => Math.round(x * 100) + '٪';
const gl = (v) => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v));
const Explain = {
  // ——— دخل المدينة ———
  cityIncome(n) {
    const ip = Game.incomeParts(n);
    const f = Game.f(n.owner);
    const x = { icon: 'coins', title: `دخل ${n.name}`, value: `${gl(ip.total)} كل دور` };
    if (ip.sieged) {
      x.state = 'المدينة محاصرة: لا يخرج الجباة ولا تدخل القوافل، فلا دخل منها حتى يُرفع الحصار.';
      x.improve = ['أرسل جيشاً يفك الحصار، أو ادفع للمحاصِر ليرحل.'];
      return x;
    }
    x.state = 'ذهب هذه المدينة لخزينتك كل دور، بعد الولاء والاضطراب والأحداث.';
    x.from = [...ip.lines.map(([k, v, c, note]) => [note ? `${k}: ${note}` : k, v, c]), ['الصافي كل دور', gl(ip.total), 'sum']];
    const lf = Game.loyEff(n);
    if (lf < 1) x.now = [['المستحق قبل الولاء', gl(ip.gross)], [`كفاءة التحصيل (الولاء ${n.loyalty})`, pct(lf), lf < 0.75 ? 'neg' : ''], ['ما يصل فعلاً', gl(ip.total), 'sum']];
    const imp = [];
    if (lf < 0.95) imp.push(`ارفع الولاء: كل 10 نقاط ولاء تضيف نحو ${Math.round(ip.gross * 0.06)} ذهباً هنا.`);
    if (n.market < BUILDINGS.market.max && Game.previewBuild) {
      const pv = Game.previewBuild(n, 'market');
      if (pv && pv.gold > 0) imp.push(`سوق المستوى ${n.market + 1}: ${gl(pv.gold)} كل دور مقابل ${pv.cost} ذهباً.`);
    }
    if (n.unrest > 0) imp.push(`الاضطراب يأخذ ${pct(1 - ECON.unrestK)} من الدخل ${n.unrest} أدوار أخرى. الاحتفالات تقصّره دوراً.`);
    if (Game.overstack(n, n.owner) > 0) imp.push('خفّف الجيوش المقيمة هنا: الازدحام يأكل من الدخل.');
    if (!Game.governorAt(n) && Game.poolOf(n.owner).some((g) => g.trait === 'merchant')) imp.push('عيّن حاكماً إدارياً: +30٪.');
    if (f.tax === 'low') imp.push('الضرائب منخفضة: رفعها إلى معتدلة يزيد الضرائب لكنه يخفض الولاء 8.');
    x.improve = imp;
    x.adv = [['ضرائب لكل ألف نسمة', ECON.taxPer1k], ['السوق لكل ألف نسمة لكل مستوى', ECON.marketPer1k], ['معامل الولاء', '×' + lf.toFixed(2)], ['معامل الضرائب', '×' + TAXES[f.tax].income]];
    return x;
  },

  // ——— ولاء المدينة ———
  loyaltyState(v) {
    if (v >= 75) return 'مستقرة: أهلها راضون، والجباية شبه كاملة.';
    if (v >= 55) return 'مستقرة نسبياً، لكن انخفاض الولاء يقلل كفاءة الضرائب ويقرّب الاضطرابات.';
    if (v >= 35) return 'متململة: جزء كبير من الضرائب لا يصل، والتجنيد النظامي يتوقف تحت 30.';
    if (v >= 20) return 'ساخطة: التجنيد النظامي متوقف، والتمرد وارد إن نزل الولاء تحت 20.';
    return 'على حافة الثورة: كل دور احتمال 30٪ أن تثور وتنفصل إن لم يكن فيها جيش.';
  },
  cityLoyalty(n) {
    const lt = Game.loyaltyTarget(n);
    const ip = Game.incomeParts(n);
    const lf = Game.loyEff(n);
    const move = clamp(lt.target - n.loyalty, -5, Game.governorOf(n, 'merchant') ? 7 : 4);
    const x = { icon: 'heart', title: `ولاء ${n.name}`, value: `${n.loyalty} من 100`, meter: n.loyalty };
    x.state = this.loyaltyState(n.loyalty);
    x.now = [
      ['الدخل المستحق', gl(ip.gross)],
      ['أثر الولاء على التحصيل', lf < 1 ? '−' + pct(1 - lf) : 'لا نقص', lf < 0.8 ? 'neg' : ''],
      ['الدخل بعد الولاء', gl(ip.total), 'sum'],
      ['التجنيد النظامي', n.loyalty < 30 ? 'متوقف (تحت 30)' : 'متاح', n.loyalty < 30 ? 'neg' : ''],
      ['خطر الثورة', n.loyalty < 20 ? (Game.armiesOfAt(n.owner, n.id).length ? 'يخمدها جيشك بخسائر' : '30٪ كل دور') : 'لا', n.loyalty < 20 ? 'neg' : ''],
    ];
    const sorted = lt.parts.slice().sort((a, b) => a[1] - b[1]);
    x.from = [...sorted.map(([k, v]) => [k, signed(v), v > 0 ? 'pos' : v < 0 ? 'neg' : '']), ['يتجه نحو', lt.target, 'sum']];
    x.note = move === 0 ? 'الولاء عند هدفه الآن.' : `يتحرك نحو هدفه ${move > 0 ? '+' + move : '−' + Math.abs(move)} كل دور.`;
    const has = (k) => lt.parts.some((p) => p[2] === k);
    const f = Game.f(n.owner);
    const imp = [];
    if (f.tax === 'high') imp.push('خفّض الضرائب إلى معتدلة: +12 ولاء في كل المدن.');
    if (has('occupied')) imp.push('الاحتلال الحديث يزول مع الوقت. جيش مقيم (+8) أو احتفالات (+20 فوراً) تعين حتى ذلك.');
    if (!has('army')) imp.push('أبقِ جيشاً في المدينة: +8.');
    if (!Game.governorAt(n)) imp.push('عيّن حاكماً: +4، والإداري أو الصامد +5 إضافية.');
    if (n.market < BUILDINGS.market.max) imp.push('كل مستوى سوق: +2 ولاء ودخل أكبر.');
    if (has('size') || has('far')) imp.push('المدن البعيدة في الممالك الواسعة أصعب ولاءً: الحكّام والجيوش المقيمة تعوّض ذلك.');
    if (has('harsh')) imp.push('انقل القائد أو الحاكم القاسي من هنا.');
    const fc = Game.festivalCost(n);
    imp.push(Game.canFestival(n.owner, n) ? `الاحتفالات غير متاحة الآن: ${Game.canFestival(n.owner, n)}.` : `احتفالات: +20 فوراً مقابل ${fc} ذهباً.`);
    x.improve = imp;
    return x;
  },

  // ——— الإمداد ———
  citySupply(n, fid) {
    const cap = Game.supplyCap(n, fid), stack = Game.stackAt(n, fid), ov = Game.overstack(n, fid);
    const own = Game.friendly(n.owner, fid);
    const x = { icon: 'cart', title: `الإمداد في ${n.name}`, value: `${stack} من ${cap} وحدات` };
    x.state = ov > 0 ? `الجيوش هنا تزيد ${ov} وحدات على ما تستطيع الأرض إطعامه.` : 'المدينة تطعم الجيوش الموجودة فيها دون ضغط.';
    const from = [];
    if (own) {
      from.push(['أساس المدينة الصديقة', '+8'], n.farm ? [`المزارع (المستوى ${n.farm})`, '+' + n.farm * 2, 'pos'] : null, n.granary ? [`المخازن (المستوى ${n.granary})`, '+' + n.granary * 3, 'pos'] : null, [`السكان`, '+' + Math.floor(n.pop / 10000)]);
    } else {
      const t = { plains: 2, river: 2, coast: 1, desert: -3, mountains: -2, hills: 0, forest: 0 }[n.terrain] || 0;
      from.push(['أرض العدو: ما يُجمع من الريف', '+6'], t ? [TERRAIN[n.terrain].name, signed(t), t > 0 ? 'pos' : 'neg'] : null);
    }
    if (Game.isWinter()) from.push(['الشتاء', '−2', 'neg']);
    from.push(['السعة', cap, 'sum']);
    x.from = from.filter(Boolean);
    if (ov > 0) {
      const frac = Math.min(0.2, 0.03 * ov);
      x.now = [['خسارة الرجال كل دور', '−' + pct(frac), 'neg'], own ? ['ولاء المدينة كل دور', '−' + ov, 'neg'] : null, own ? ['دخل المدينة', '−' + pct(1 - Math.max(0.5, 1 - 0.05 * ov)), 'neg'] : null].filter(Boolean);
    }
    x.improve = ov > 0 ? ['قسّم الجيوش على مدن مجاورة.', 'خبير التموين يحسب جيشه نصف حجمه.', own ? 'المزارع (+2) والمخازن (+3) ترفع السعة.' : 'أرض العدو أفقر: لا تحشد فيها طويلاً.'] : ['كل وحدة فوق السعة تسبب خسائر ومرضاً وهروباً.'];
    x.adv = [['الوحدات المحسوبة', stack], ['خبير التموين', 'يُحسب جيشه ×0.5']];
    return x;
  },

  // ——— القوى البشرية ———
  cityManpower(n) {
    const x = { icon: 'men', title: `رجال ${n.name}`, value: `${Math.floor(n.manpower)} من ${Game.mpCap(n)}` };
    x.state = 'الرجال القادرون على حمل السلاح. التجنيد النظامي يأخذ منهم، وتعويض الخسائر في مدنك أيضاً.';
    const regen = Game.mpRegen(n);
    const from = [['من السكان', '+' + Math.round(n.pop * 0.0021)], n.farm ? ['المزارع', '+' + n.farm * 12, 'pos'] : null];
    if (Game.besieger(n.id)) from.push(['الحصار يوقف التجدد', '×0', 'neg']);
    if (n.unrest > 0) from.push(['الاضطراب', '−70٪', 'neg']);
    if (n.loyalty < 40) from.push(['ولاء أقل من 40', '−40٪', 'neg']);
    if (n.owner !== 'neutral' && Game.lastStand(n.owner)) from.push(['النفير الأخير: المملكة على حافة السقوط', '×2', 'pos']);
    from.push(['يتجدد كل دور', '+' + regen, 'sum']);
    x.from = from.filter(Boolean);
    x.now = [['تكفي لوحدة رمّاحة (60)', Math.floor(n.manpower / 60) + ' مرات'], ['يمتلئ خلال', regen > 0 ? Math.ceil(Math.max(0, Game.mpCap(n) - n.manpower) / regen) + ' أدوار' : 'لا يتجدد']];
    x.improve = ['المزارع: +50 للحد الأقصى و+12 كل دور.', 'الولاء فوق 40 والاستقرار يحافظان على التجدد.', 'المرتزقة لا يحتاجون رجالاً من المدينة لكنهم أغلى.'];
    return x;
  },

  // ——— الدفاع ———
  cityDefense(n, P) {
    const own = n.owner === P;
    const intel = own ? 3 : Game.intelLevel(P, n.owner);
    const gMen = Game.menOf(n.garrison);
    const x = { icon: 'castle', title: `دفاع ${n.name}`, value: WALL_NAMES[Math.min(4, n.walls)] };
    x.state = n.walls ? 'الأسوار تفرض الحصار: لا تسقط المدينة إلا باقتحام بمعدات أو بالتجويع.' : 'بلا أسوار: يدخلها أي جيش يهزم حاميتها في معركة مفتوحة.';
    x.from = [
      ['الأسوار', n.walls ? `المستوى ${n.walls}` : 'لا شيء'],
      ['الحامية', own || intel >= 2 ? gMen + ' رجل' : Game.estimate(P, n.owner, gMen).text],
      own || intel >= 2 ? ['مؤن الحصار', n.stores < 0 ? 'مجاعة' : `${n.stores} من ${Game.storesMax(n)} أدوار`] : null,
      ['جيوش داخلها', Game.defendersOf(n).length],
    ].filter(Boolean);
    if (n.walls) x.now = [['المدافع على السور أقوى', '+' + pct(0.45 * n.walls)], ['رماة السور أدق', '+' + pct(0.25 * n.walls)]];
    if (n.walls) x.adv = [['معامل الدفاع على السور', '×' + (1 + 0.45 * n.walls).toFixed(2)]];
    x.improve = own ? ['كل مستوى أسوار يجعل الاقتحام أغلى بكثير، لكن صيانتها ترتفع.', 'المخازن تطيل الصمود 3 أدوار لكل مستوى.', 'قائد صامد في المدينة: دفاع أقوى وحامية تتعافى أسرع.'] : ['الحصار يُنقص مؤنهم كل دور، والمنجنيق أو المهندس يفتح الثغرات.'];
    return x;
  },

  // ——— الخزينة ———
  treasury(fid) {
    const f = Game.f(fid), e = Game.economy(fid);
    const x = { icon: 'gold', title: 'الخزينة', value: `${f.gold} (${gl(e.netGold)} كل دور)` };
    x.state = e.netGold < 0 ? `المصروفات أكبر من الدخل: الخزينة تنفد خلال ${Math.max(1, Math.floor(f.gold / Math.max(1, -e.netGold)))} أدوار، ثم تتسرّح الوحدات ويتراجع الولاء.` : 'الصافي يُضاف في نهاية كل دور.';
    x.from = this.budgetLines(e);
    x.improve = e.netGold < 0 ? ['سرّح الوحدات الزائدة أو المرتزقة أولاً.', 'الحملات البعيدة تكلّف إمداداً: اقترب من مدنك.', 'الأسواق والولاء يرفعان الدخل.'] : ['اضغط «الميزانية» في شاشة المملكة لترى كل بند.'];
    return x;
  },
  budgetLines(e) {
    const I = e.inc, X = e.exp;
    return [
      ['الضرائب', gl(I.tax), 'pos'], I.market ? ['الأسواق', gl(I.market), 'pos'] : null, I.food ? ['بيع فائض الطعام', gl(I.food), 'pos'] : null,
      I.route ? ['القوافل', gl(I.route), 'pos'] : null, I.trade ? ['اتفاقات التجارة', gl(I.trade), 'pos'] : null, I.tribute > 0 ? ['الجزية', gl(I.tribute), 'pos'] : null,
      ['الدخل', gl(e.income), 'sum'],
      ['الجيوش', '−' + X.army, 'neg'], X.merc ? ['المرتزقة', '−' + X.merc, 'neg'] : null, ['رواتب القادة', '−' + X.wages, 'neg'],
      X.supply ? ['الإمداد خارج أرضك', '−' + X.supply, 'neg'] : null, X.admin ? ['إدارة المدن البعيدة', '−' + X.admin, 'neg'] : null,
      X.forts ? ['صيانة التحصينات والمباني', '−' + X.forts, 'neg'] : null, X.overhead ? ['جيوش أكثر من مدنك', '−' + X.overhead, 'neg'] : null, I.tribute < 0 ? ['جزية تدفعها', gl(I.tribute), 'neg'] : null,
      ['المصروفات', '−' + e.expense, 'sum'], ['الصافي', gl(e.netGold), 'sum'],
    ].filter(Boolean);
  },
  food(fid) {
    const f = Game.f(fid), e = Game.economy(fid);
    const x = { icon: 'food', title: 'الطعام', value: `${f.food} (${gl(e.netFood)} كل دور)` };
    x.state = e.netFood < 0 ? `الجيوش تأكل أكثر مما تنتج المدن: ينفد خلال ${Math.max(1, Math.floor(f.food / Math.max(1, -e.netFood)))} أدوار، ثم تجوع الجيوش وتخسر رجالاً.` : f.food + e.netFood > ECON.foodCap ? `المخازن ممتلئة (${ECON.foodCap}): الفائض يُباع بـ${gl(e.inc.food)} ذهباً.` : 'مخزون لإطعام الجيوش.';
    x.from = [['إنتاج المدن', gl(e.food), 'pos'], ['أكل الجيوش', '−' + e.eat, 'neg'], ['الصافي', gl(e.netFood), 'sum']];
    x.improve = ['المزارع +6 لكل مستوى.', 'الخيالة تأكل ضعف المشاة، وأرض العدو والصحراء والشتاء تزيد الأكل.', 'خبير التموين: جيشه يأكل النصف.'];
    return x;
  },

  // ——— ضغط الاتساع ———
  expansion(fid) {
    const list = Game.adminCosts(fid);
    const n = Game.nodesOf(fid).length;
    const tot = list.reduce((t, c) => t + c.c, 0);
    const x = { icon: 'map', title: 'ضغط الاتساع', value: tot ? `−${tot} كل دور` : 'لا كلفة بعد' };
    x.state = `كلما اتسعت المملكة بعيداً عن مركز الحكم ارتفعت كلفة الإدارة وضعف ولاء الأطراف. أول ${ECON.adminFree} مدن بلا كلفة إدارة، ولديك ${n}.`;
    x.from = list.length ? [...list.slice().sort((a, b) => b.c - a.c).slice(0, 8).map((c) => [`${c.n.name} (${c.d} خطوات${c.gov ? '، لها حاكم' : ''})`, '−' + c.c, 'neg']), list.length > 8 ? [`و${list.length - 8} مدن أخرى`, ''] : null, ['المجموع', '−' + tot, 'sum']].filter(Boolean) : null;
    x.now = [['ولاء كل مدنك', n > 7 ? '−' + Math.round((n - 7) * 2.5) : 'لا أثر', n > 7 ? 'neg' : ''], ['ولاء المدن الأبعد من 3 خطوات', 'حتى −12']];
    x.improve = ['الحاكم يخفض كلفة إدارة مدينته إلى النصف ويرفع ولاءها.', 'المدن القريبة من العاصمة أرخص إدارة.', 'التابعون يدفعون الجزية دون كلفة إدارة.'];
    x.adv = [['مدن بلا كلفة', ECON.adminFree], ['كلفة المدينة', `${ECON.adminBase} + ${ECON.adminDist} لكل خطوة بعد الثانية`]];
    return x;
  },

  // ——— الجيش ———
  armyStrength(a) {
    const g = Game.armyGen(a);
    const by = {};
    for (const r of a.regs) { const k = r.type; by[k] = by[k] || { men: 0, pw: 0, exp: 0, n: 0 }; by[k].men += r.men; by[k].pw += Game.regPower(r); by[k].exp += r.exp || 0; by[k].n++; }
    const total = Game.armyPower(a);
    const x = { icon: 'swords', title: 'قوة الجيش', value: `${Game.armyMen(a)} رجل` };
    x.state = 'العدد مهم لكنه ليس الحكم: النوع والخبرة والقائد والأرض والخطة والتعب تقرر المعركة.';
    x.from = [...Object.entries(by).sort((p, q) => q[1].pw - p[1].pw).map(([t, v]) => [`${UNITS[t].name} (${v.n})${v.exp ? ' خبرة ' + '★'.repeat(Math.round(v.exp / v.n)) : ''}`, `${v.men} رجل · ${pct(v.pw / Math.max(1, total))}`]),
      g ? [`حرس القائد ${g.name}`, `${Game.genMen(g)} رجل`] : null].filter(Boolean);
    const mood = a.mood ? { shaken: 'مهزوز: أضعف 10٪', confident: 'واثق: أقوى 5٪', hungry: 'جائع: أضعف 10٪' }[a.mood.k] : null;
    x.now = [mood ? ['الحالة', mood, a.mood.k === 'confident' ? 'pos' : 'neg'] : null, ['الإمداد هنا', `${Game.stackAt(Game.node(a.node), a.fid)} من ${Game.supplyCap(Game.node(a.node), a.fid)}`]].filter(Boolean);
    x.improve = ['الخبرة تأتي من المعارك والتدريب في مدينة بها إسطبلات وورش.', 'المزج بين الرماح والسيوف والرماة والفرسان يغطي نقاط الضعف.', 'الراحة في مدنك تعيد الرجال والمعنويات.'];
    return x;
  },
  armyMorale(a) {
    const names = { shaken: 'مهزوز', confident: 'واثق', hungry: 'جائع' };
    const x = { icon: 'banner', title: 'معنويات الجيش', value: a.mood ? names[a.mood.k] : 'ثابتة' };
    x.state = a.mood ? { shaken: 'خسر معركة مؤخراً: أبطأ وأضعف وأسرع انكساراً.', confident: 'انتصر مؤخراً: يقاتل بثقة.', hungry: 'بلا طعام كافٍ: يخسر رجالاً ويضعف.' }[a.mood.k] : 'لا أثر خاص.';
    if (a.mood) x.now = [['يزول بعد', a.mood.t + ' أدوار'], ['في المعركة', a.mood.k === 'confident' ? '+5 معنويات' : a.mood.k === 'shaken' ? '−10 معنويات' : '−15 معنويات', a.mood.k === 'confident' ? 'pos' : 'neg']];
    x.improve = ['الراحة في مدينتك، والطعام الكافي، والنصر.'];
    return x;
  },

  // ——— القادة ———
  genLoyalty(g) {
    const t = Game.genLoyTarget(g);
    const x = { icon: 'helmet', title: `ولاء ${g.name}`, value: `${g.loy} من 100`, meter: g.loy };
    x.state = g.loy >= 60 ? 'مخلص لعرشك.' : g.loy >= 45 ? 'فاتر: يطيع لكنه يراقب.' : g.loy >= 32 ? 'ساخط: قد يبدأ الطموح إن ساءت الأمور.' : 'طامح: ولائم ثم احتجاز ضرائب ثم تمرد بجيشه ومدنه.';
    x.from = Game.genLoyParts ? [...Game.genLoyParts(g).map(([k, v]) => [k, signed(v), v > 0 ? 'pos' : 'neg']), ['يتجه نحو', t, 'sum']] : [['يتجه نحو', t, 'sum']];
    x.improve = [`كرّمه بالعطايا (${Game.honorCost(g)} ذهباً): +22 الآن و+14 لاثني عشر دوراً.`, 'الانتصارات ترفع ولاءه، والهزائم والخزينة الفارغة تخفضه.', 'جيش ضخم بعيد عن العاصمة يغري القائد بالاستقلال.'];
    return x;
  },

  // ——— الدبلوماسية ———
  relation(P, id) {
    const r = Game.rel(P, id), f = Game.f(id);
    const tA = Game.relParts(id, P), tB = Game.relParts(P, id);
    const target = Math.round((Game.relBaseline(id, P) + Game.relBaseline(P, id)) / 2);
    const x = { icon: 'treaty', title: `علاقتك بـ${f.name}`, value: `${r} (من −100 إلى 100)`, meter: r + 100 };
    x.meterMax = 200;
    x.state = r >= 50 ? 'ودّ متين: تقبل أغلب العروض المعقولة.' : r >= 15 ? 'علاقة طيبة: التجارة والمصاهرة ممكنة، والحلف يحتاج سبباً.' : r >= -15 ? 'فتور: تقبل ما يخدمها فقط.' : r >= -50 ? 'عداء: ترفض أغلب العروض، وقد تبحث عن حلفاء ضدك.' : 'كراهية: لن تقبل شيئاً دون ضغط كبير.';
    x.from = [...tA.map(([k, v]) => [k, signed(v), v > 0 ? 'pos' : v < 0 ? 'neg' : '']), ['تميل نحو', target, 'sum']];
    x.note = r === target ? 'العلاقة عند ما تميل إليه.' : `تتحرك نحو ${target} بمقدار نقطتين كل دور.`;
    x.improve = ['الهدايا ترفعها فوراً (تقل فائدتها كلما ارتفعت).', 'التجارة +8 والمصاهرة +20 دائماً.', 'عدو مشترك +10.', 'سمعتك تؤثر عند الجميع: الوفاء بالعهود وإطلاق الأسرى.'];
    void tB;
    return x;
  },
  rep(fid) {
    const f = Game.f(fid);
    const x = { icon: 'laurel', title: 'سمعتك', value: `${Math.round(f.rep)} من 100`, meter: f.rep };
    x.state = f.rep >= 65 ? 'موثوقة: عروضك تُقبل أسهل، والمدن تستسلم لك أسرع.' : f.rep >= 40 ? 'عادية.' : 'سيئة: الممالك لا تثق بعهودك، والمدن تقاوم أكثر.';
    x.now = [['أثرها على العلاقة مع كل مملكة', signed(Math.round((f.rep - 50) / 5))], ['أثرها على قبول الصلح', signed(Math.round((f.rep - 50) / 4))]];
    x.from = [['ترتفع ببطء إن كانت تحت 50', '+0.5 كل دور'], ['تنخفض ببطء إن كانت فوق 50', '−0.2 كل دور']];
    x.improve = ['الوفاء بالعهود والصلح.', 'إطلاق الأسرى (+3) والأمان للمدن (+4).', 'تجنب النهب (−4) والإعدام (−15) ونقض العهود (−15).', 'الجواسيس المكشوفون يضرونها فقط إن عُرفت مسؤوليتك.'];
    return x;
  },
  power(P, id) {
    const me = Game.factionPower(P), pw = Game.factionPower(id), lvl = Game.intelLevel(P, id);
    const f = Game.f(id);
    const armies = Game.armiesOf(id).reduce((t, a) => t + Game.armyPower(a), 0);
    const gar = Game.nodesOf(id).reduce((t, n) => t + Game.garrisonPower(n) * 0.5, 0);
    const x = { icon: 'swords', title: `قوة ${f.name}`, value: lvl === 0 ? 'مجهولة' : pw > me * 1.6 ? 'أقوى منك بكثير' : pw > me * 1.15 ? 'أقوى منك' : pw > me * 0.85 ? 'ندّ لك' : pw > me * 0.6 ? 'أضعف منك' : 'أضعف بكثير' };
    x.state = 'تقدير يجمع الجيوش والحاميات والخزينة. الممالك تخشى الأقوى وتتحالف ضد المتعاظم.';
    if (lvl >= 2) x.from = [['الجيوش', Math.round(armies)], ['نصف الحاميات', Math.round(gar)], ['عُشر الخزينة', Math.round(Math.max(0, f.gold) / 10)], ['المجموع', Math.round(pw), 'sum'], ['قوتك', Math.round(me)]];
    else x.note = lvl === 0 ? 'لا تعرف عنها شيئاً: الحدود المشتركة أو التجارة أو الجواسيس تكشف المزيد.' : 'تقدير تقريبي: التجارة أو الجواسيس تجعله أدق.';
    return x;
  },
};

// عرض كائن الشرح في النافذة الصغيرة
Help.explain = function (anchor, x) {
  if (!x) return;
  this.hide();
  const sec = (title, lines) => (lines && lines.length ? [title ? h('div', { class: 'pop-t' }, title) : null, h('div', { class: 'pop-lines' }, lines.map(([k, v, c]) => h('div', { class: 'pl' + (c ? ' ' + c : '') }, h('span', null, rich(k)), h('span', { class: 'v' }, rich(v)))))] : null);
  const el = h('div', { class: 'pop wide' },
    h('div', { class: 'pop-h' }, x.icon ? icon(x.icon) : null, h('b', null, x.title), x.value != null ? h('span', { class: 'pop-v' }, rich(x.value)) : null),
    x.meter != null ? meter(x.meter, x.meterMax || 100) : null,
    x.state ? h('p', { class: 'state' }, rich(x.state)) : null,
    sec('الأثر الآن', x.now),
    sec('من أين جاء الرقم', x.from),
    x.note ? h('p', { class: 'eff' }, rich(x.note)) : null,
    x.improve && x.improve.length ? [h('div', { class: 'pop-t' }, 'كيف تحسّنه'), h('ul', { class: 'pop-ul' }, x.improve.map((t) => h('li', null, rich(t))))] : null,
    x.adv && x.adv.length ? h('details', { class: 'pop-adv' }, h('summary', null, 'تفاصيل متقدمة'), sec(null, x.adv)) : null,
  );
  document.body.appendChild(el);
  this.el = el;
  this.place(anchor, el);
};
// قيمة قابلة للضغط تفتح شرحاً كاملاً
function xstat(key, value, build, o = {}) {
  const H = HELP[key] || {};
  return h('button', {
    class: 'hstat' + (o.cls ? ' ' + o.cls : ''), title: H.t || '',
    onclick: (e) => { e.stopPropagation(); Help.explain(e.currentTarget, build()); },
  }, icon(o.icon || H.icon || 'info'), o.label ? h('span', { class: 'hk' }, o.label) : null, h('bdi', { class: 'hv' }, value), o.meter != null ? meter(o.meter, o.meterMax || 100) : null);
}
// شرح عند نقطة على الشاشة (مثل مدينة على الخريطة)
Help.explainAt = function (x, y, obj) {
  const a = h('div', { style: { position: 'fixed', left: x + 'px', top: y + 'px', width: '1px', height: '1px' } });
  document.body.appendChild(a);
  this.explain(a, obj);
  a.remove();
};
