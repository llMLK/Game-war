'use strict';
// الدبلوماسية والتجسس والفتح:
// - سجل لكل حرب: المدن المأخوذة والمعارك والقتلى والحصار. منه يُشتق «ميزان الحرب»، ومنه مبلغ الصلح العادل.
// - عرض الصلح بمبلغ يختاره اللاعب، مع احتمال قبول مكتوب بعبارة، وعرض مضاد إن رُفض. جزية على أدوار، مدينة، أسرى.
// - تنسيق الحرب مع الحلفاء: هدف أو مدينة للدفاع أو جيش لاعتراضه أو جبهة. الحليف يحاول فعلاً أو يقول لماذا لا.
// - المساهمة في الحرب تُحسب، وتؤثر في العلاقة والثقة والغنائم والطلبات.
// - التجسس: أهداف تُختار من الشبكة والمسافة والمعرفة والأهمية والأمن والحرب والتجارة، وآثار ملموسة،
//   والسمعة لا تسقط إلا إذا انكشف من يقف وراء العملية.
// - الفتح: ضمّ بالقوة أو أمان أو نهب بآثار مختلفة فعلاً، ومصير واضح للحامية.

const SPY_OPS = {
  scout: { name: 'استطلاع البلاط', icon: 'eye', cost: 60, base: 0.85, disc: 0.08, target: 'realm', desc: 'معرفة مؤكدة بجيوش المملكة ومدنها 8 أدوار، وتقوّي شبكتك فيها.' },
  military: { name: 'معلومات عسكرية', icon: 'men', cost: 70, base: 0.75, disc: 0.12, target: 'army', desc: 'عدد جيش بعينه وأنواعه وقائده وإمداده ووجهته، 6 أدوار.' },
  incite: { name: 'تحريض', icon: 'torch', cost: 130, base: 0.6, disc: 0.3, target: 'city', desc: 'الولاء والاضطراب والتمرد والتجنيد والضرائب في مدينة واحدة.' },
  sabotage: { name: 'تخريب', icon: 'fire', cost: 110, base: 0.6, disc: 0.25, target: 'city', desc: 'ضربة واحدة تختارها في مدينة واحدة.' },
};
const SABOTAGE = {
  market: { name: 'تعطيل السوق', icon: 'market', turns: 3, desc: 'دخل السوق صفر 3 أدوار.' },
  stores: { name: 'إحراق المخازن', icon: 'granary', desc: 'المؤن −3: تجوع المدينة أسرع إن حوصرت.' },
  reinforce: { name: 'تأخير الإمدادات', icon: 'hourglass', turns: 3, desc: 'لا تجنيد ولا استكمال للحامية 3 أدوار.' },
  walls: { name: 'إضعاف التحصين', icon: 'wall', turns: 3, desc: 'السور أدنى بدرجة 3 أدوار.' },
  caravan: { name: 'إيقاف القوافل', icon: 'camel', turns: 3, desc: 'طريق التجارة ينقطع عند المدينة 3 أدوار.' },
  gap: { name: 'كشف ثغرة في السور', icon: 'breach', turns: 4, desc: 'في اقتحامك القادم يبدأ أحد الأسوار مفتوحاً جزئياً.' },
};
const COORD = {
  attack: { name: 'مهاجمة مدينة', icon: 'swords' },
  defend: { name: 'الدفاع عن مدينة', icon: 'shield' },
  intercept: { name: 'اعتراض جيش', icon: 'target' },
  front: { name: 'التركيز على جبهة', icon: 'flag' },
};
const GARRISON_FATE = {
  disarm: { name: 'تسليم السلاح والبقاء', icon: 'shield' },
  withdraw: { name: 'الانسحاب بسلاحهم', icon: 'retreat' },
  passage: { name: 'ممر آمن لهم ولأهلهم', icon: 'dove' },
  captives: { name: 'أسرى', icon: 'chains' },
};
const COORD_TURNS = 6, ENVOY_WAIT = 1;

Object.assign(Game, {
  // ——————————————— سجل الحرب ———————————————
  warKey(a, b) { return [a, b].sort().join('|'); },
  warRec(a, b, create) {
    const S = this.S;
    S.wars = S.wars || {};
    const k = this.warKey(a, b);
    let w = S.wars[k];
    if ((!w || w.ended) && create) {
      const blank = () => ({ kills: 0, lost: 0, won: 0, battles: 0, took: [], sieges: 0, aid: 0 });
      w = S.wars[k] = { a, b, since: S.turn, ended: null, st: { [a]: blank(), [b]: blank() } };
    }
    return w || null;
  },
  // ميزان الحرب من منظور a: أرقام يمكن شرحها
  warScore(a, b) {
    const w = this.warRec(a, b) || { st: {} };
    const A = w.st[a] || { kills: 0, lost: 0, won: 0, took: [] }, B = w.st[b] || { kills: 0, lost: 0, won: 0, took: [] };
    const parts = [];
    const add = (label, v) => { v = Math.round(v); if (v) parts.push([label, v]); };
    const heldA = A.took.filter((id) => this.node(id).owner === a).length, heldB = B.took.filter((id) => this.node(id).owner === b).length;
    add(`المدن المأخوذة: ${heldA} مقابل ${heldB}`, (heldA - heldB) * 14);
    add(`الانتصارات: ${A.won} مقابل ${B.won}`, clamp((A.won - B.won) * 4, -20, 20));
    const tot = A.kills + B.kills;
    if (tot) add(`القتلى في صفوف الخصم: ${A.kills} مقابل ${B.kills}`, clamp((A.kills - B.kills) / Math.max(300, tot) * 30, -20, 20));
    const sgA = this.nodesOf(b).filter((n) => this.besiegers(n.id).some((x) => x.fid === a)), sgB = this.nodesOf(a).filter((n) => this.besiegers(n.id).some((x) => x.fid === b));
    if (sgA.length || sgB.length) add(`مدن الخصم تحت الحصار: ${sgA.length} مقابل ${sgB.length}`, (sgA.length - sgB.length) * 6 + (sgA.some((n) => n.capital) ? 15 : 0) - (sgB.some((n) => n.capital) ? 15 : 0));
    const pa = this.factionPower(a), pb = this.factionPower(b);
    add('ميزان القوة الآن', clamp((pa / Math.max(1, pb) - 1) * 20, -20, 20));
    const score = clamp(parts.reduce((t, p) => t + p[1], 0), -100, 100);
    return { score, parts, turns: (this.f(a).warTurns || {})[b] || 0 };
  },

  // ——————————————— الصلح ———————————————
  // ما يدفع الطرف إلى الصلح أو يبعده عنه، بغض النظر عن ميزان الحرب
  peaceUrge(x, y) {
    const X = this.f(x);
    const parts = [];
    const add = (label, v) => { v = Math.round(v); if (v) parts.push([label, v]); };
    const wt = (X.warTurns || {})[y] || 0;
    if (wt < 3) add('الحرب بدأت للتو ولم تحقق غايتها', -12);
    if (wt > 4) add(`طول الحرب (${wt} أدوار)`, Math.min(20, (wt - 4) * 1.5));
    const others = this.aliveMajors().filter((c) => c !== x && c !== y && this.atWar(x, c)).length;
    if (others) add(`حروب أخرى (${others})`, others * 12);
    if ((X.lostRecently || 0) >= 1) add('خسرت مدناً مؤخراً', X.lostRecently * 8);
    if (X.gold < 150) add('الخزينة شبه فارغة', 8);
    add(`العلاقة (${this.rel(x, y)})`, this.rel(x, y) * 0.15);
    add(`سمعة ${this.fname(y)}`, (this.f(y).rep - 50) / 5);
    const aggr = (this.pers ? this.pers(x).aggr : 1) * (DIFFS[this.S.difficulty] ? DIFFS[this.S.difficulty].aiAggr || 1 : 1);
    add('طبع الحكم', -(aggr - 1) * 25);
    if (X.goals && X.goals.owner === y && X.goals.target) add(`ما زالت تريد ${this.node(X.goals.target).name}`, -10);
    const dom = this.dominant();
    if (dom === y) add(`${this.fname(y)} تهيمن على الجميع`, -20);
    else if (dom && dom !== x) add(`${this.fname(dom)} تهيمن: الأولى التفرغ لها`, 15);
    return { v: parts.reduce((t, p) => t + p[1], 0), parts };
  },
  // قيمة شروط الصلح عند x (بـ«أدوار من دخله»): موجبة إن كان x يكسب
  termsValue(x, y, t) {
    const inc = Math.max(40, this.economy(x).income);
    let v = 0;
    const g = (t.gold || 0) + (t.perTurn || 0) * (t.turns || 0) * 0.85;
    // t.gold موجب = y يدفع لـx
    v += (t.payer === y ? g : t.payer === x ? -g * (t.perTurn ? 0.8 : 1) : 0) / inc * 10;
    if (t.city) { const n = this.node(t.city); const cv = 8 + n.pop / 1200 + (n.market || 0) * 3 + (n.capital ? 40 : 0); v += n.owner === x ? -cv : cv; }
    for (const id of t.captives || []) { const cg = this.gen(id); if (cg) v += (cg.fid === x ? 1 : -1) * (4 + (cg.fame || 0) / 6 + cg.rank * 2); }
    return v;
  },
  // احتمال أن يقبل x الشروط: من ميزان الحرب والدوافع والقيمة، لا من الحظ وحده
  peaceChance(x, y, t) {
    const X = this.f(x);
    if (X.vendetta && X.vendetta[y] > 0) return { p: 0, band: oddsBand(0), why: `دم قائدها بينكما (${X.vendetta[y]} أدوار)` };
    const ws = this.warScore(x, y), urge = this.peaceUrge(x, y), val = this.termsValue(x, y, t);
    const z = (val + urge.v - ws.score * 0.8) / 12;
    const p = clamp(1 / (1 + Math.exp(-z)), 0, 0.97);
    return { p, band: oddsBand(p), ws, urge, val };
  },
  // المبلغ الذي يجعل الاحتمال عند نسبة معينة (موجب: y يدفع لـx)
  peaceFair(x, y, target = 0.5, extra = {}) {
    const inc = Math.max(40, this.economy(x).income);
    const ws = this.warScore(x, y), urge = this.peaceUrge(x, y);
    const base = this.termsValue(x, y, { ...extra, gold: 0, payer: null });
    const zT = Math.log(target / (1 - target)) * 12;
    const need = zT - urge.v + ws.score * 0.8 - base;
    const g = need * inc / 10;
    return Math.round(g / 10) * 10;
  },
  envoyWait(a, b) { const t = ((this.f(a).envoy || {})[b]); return t != null && t >= this.S.turn ? t - this.S.turn + 1 : 0; },
  // عرض صلح من a إلى b بشروط t: t = { payer, gold, perTurn, turns, city, captives }
  proposePeaceTerms(a, b, t) {
    if (!this.atWar(a, b)) return { err: 'لستما في حرب' };
    const w = this.envoyWait(a, b);
    if (w) return { err: `أرسلت رسولاً هذا الدور. الجواب القادم بعد ${w === 1 ? 'دور' : w + ' أدوار'}` };
    if (t.payer === a && t.gold > this.f(a).gold) return { err: 'الذهب لا يكفي' };
    const c = this.peaceChance(b, a, t);
    const roll = rng(hashStr(`${a}:${b}:${this.S.turn}:peace`))();
    const ok = roll < c.p;
    if (ok) { this.settlePeace(a, b, t); return { ok: true, c }; }
    this.f(a).envoy = this.f(a).envoy || {};
    this.f(a).envoy[b] = this.S.turn + ENVOY_WAIT - 1;
    this.addRel(a, b, -2);
    // عرض مضاد إن لم يكن الرفض مطلقاً
    let counter = null;
    if (c.p >= 0.05 && !(this.f(b).vendetta || {})[a]) {
      const fair = this.peaceFair(b, a, 0.7, t);
      const g = Math.abs(fair);
      const payer = fair >= 0 ? a : b;
      if (payer !== a || g <= this.f(a).gold + 400) counter = { payer, gold: payer === a ? Math.min(g, this.f(a).gold) : g, perTurn: payer === a && g > this.f(a).gold ? Math.ceil((g - this.f(a).gold) / 6 / 10) * 10 : 0, turns: payer === a && g > this.f(a).gold ? 6 : 0, city: t.city || null, captives: t.captives || [], from: b, until: this.S.turn };
      if (counter && counter.payer === b && counter.gold > this.f(b).gold) { counter.perTurn = Math.ceil((counter.gold - Math.max(0, this.f(b).gold)) / 6 / 10) * 10; counter.turns = 6; counter.gold = Math.max(0, this.f(b).gold); }
    }
    return { ok: false, c, counter };
  },
  acceptCounter(a, b, counter) {
    if (!counter || counter.until !== this.S.turn) return { err: 'انقضى العرض المضاد' };
    if (counter.payer === a && counter.gold > this.f(a).gold) return { err: 'الذهب لا يكفي' };
    this.settlePeace(a, b, counter);
    return { ok: true };
  },
  // تطبيق الشروط ثم الصلح، مع تقاسم الغنيمة مع الحلفاء بحسب المساهمة
  settlePeace(a, b, t) {
    const payer = t.payer, payee = payer === a ? b : a;
    if (payer && t.gold > 0) { this.f(payer).gold -= t.gold; this.f(payee).gold += t.gold; }
    if (payer && t.perTurn > 0 && t.turns > 0) this.addTribute(payer, payee, t.perTurn, t.turns);
    if (t.city) this.cedeCity(t.city, t.city && this.node(t.city).owner === a ? b : a);
    for (const id of t.captives || []) { const g = this.gen(id); if (g && g.status === 'captive') { g.status = this.f(g.fid) && this.f(g.fid).alive ? 'pool' : 'exiled'; g.captor = null; } }
    const note = [payer && t.gold ? `${this.fname(payer)} تدفع ${t.gold}` : null, payer && t.perTurn ? `وجزية ${t.perTurn} لـ${t.turns} أدوار` : null, t.city ? `وتُسلَّم ${this.node(t.city).name}` : null].filter(Boolean).join(' ');
    this.makePeace(a, b, 8, note ? `(${note})` : '');
    const w = this.warRec(a, b);
    if (w) w.ended = this.S.turn;
    this.spoilsTo = null;
    // الحلفاء الذين يحاربون العدو نفسه
    const enemy = payee === a || payee === b ? payer : null;
    const winner = enemy === a ? b : enemy === b ? a : null;
    if (winner && t.gold > 0) {
      for (const ally of this.alliesOf(winner)) {
        if (!this.atWar(ally, enemy)) continue;
        const share = this.contribShare(ally, enemy, winner);
        const cut = Math.round(t.gold * share);
        this.spoilsTo = { ally, cut, share, winner, enemy };
        if (!this.f(winner).isPlayer) this.shareSpoils((this.pers ? this.pers(winner).honor : 1) >= 1);
      }
    }
    for (const ally of this.alliesOf(a).concat(this.alliesOf(b))) {
      const mine = this.alliesOf(a).includes(ally) ? a : b, foe = mine === a ? b : a;
      if (this.atWar(ally, foe) && !(this.spoilsTo && this.spoilsTo.ally === ally)) {
        this.addRel(ally, mine, -10);
        this.event('pol', `${this.fname(ally)} تستاء من صلح ${this.fname(mine)} المنفرد مع ${this.fname(foe)}.`, { fids: [ally, mine, foe], imp: 1 });
      }
    }
  },
  // نصيب الحليف من الغنيمة: يُعرض على اللاعب ليقرر
  shareSpoils(give) {
    const s = this.spoilsTo;
    if (!s) return;
    if (give && this.f(s.winner).gold >= s.cut) {
      this.f(s.winner).gold -= s.cut; this.f(s.ally).gold += s.cut;
      this.addRel(s.winner, s.ally, 10);
      this.event('pol', `${this.fname(s.winner)} تتقاسم غنيمة الصلح مع ${this.fname(s.ally)} (${s.cut}).`, { fids: [s.winner, s.ally], imp: 1 });
    } else {
      this.addRel(s.winner, s.ally, -15);
      this.event('pol', `${this.fname(s.ally)} تستاء: ${this.fname(s.winner)} صالحت ${this.fname(s.enemy)} منفردة واحتفظت بالغنيمة.`, { fids: [s.winner, s.ally], imp: 1 });
    }
    this.spoilsTo = null;
  },
  cedeCity(id, to) {
    const n = this.node(id), from = n.owner;
    for (const a of this.armiesAt(id).filter((x) => x.fid === from)) this.retreatHome(a, [], null);
    for (const a of this.besiegers(id).filter((x) => x.fid === to)) a.siege = null;
    n.owner = to; n.capturedTurn = this.S.turn; n.work = null; n.garrison = [];
    this.fillGarrison(n, false);
    n.loyalty = 45; n.unrest = 2;
    const F = this.f(from);
    if (F && from !== 'neutral' && !F.claims.includes(id)) F.claims.push(id);
    this.event('pol', `${this.fname(from)} تسلّم ${n.name} لـ${this.fname(to)} صلحاً.`, { fids: [from, to], node: id, imp: 2 });
  },
  // عرض الذكاء للصلح: يحسب ما يراه عادلاً من حال الحرب
  aiPeaceOffer(x, y) {
    const fair = this.peaceFair(x, y, 0.5);
    // fair موجب: x يريد أن يُدفع له؛ سالب: x مستعد أن يدفع
    const g = Math.abs(fair);
    const payer = fair > 0 ? y : x;
    const t = { payer: g >= 20 ? payer : null, gold: 0, perTurn: 0, turns: 0, from: x };
    if (t.payer) {
      const cash = Math.max(0, this.f(t.payer).gold);
      if (g <= cash) t.gold = g;
      else { t.gold = Math.round(cash * 0.6 / 10) * 10; t.perTurn = Math.ceil((g - t.gold) / 6 / 10) * 10; t.turns = 6; }
    }
    return t;
  },

  // عدد المراحل عبر طريق مفتوح فعلاً (المدن المعادية في الطريق تمنع العبور)، أو null
  openHops(a, targetId, max = 8) {
    if (a.node === targetId) return 0;
    const seen = new Set([a.node]);
    let layer = [a.node];
    for (let d = 1; d <= max; d++) {
      const next = [];
      for (const id of layer) for (const e of this.edgesOf(id)) {
        if (seen.has(e.to)) continue;
        if (e.kind === 'water' && !(this.hasTrait(a, 'naval') || (this.node(id).port && this.friendly(this.node(id).owner, a.fid)))) continue;
        if (e.to === targetId) return d;
        seen.add(e.to);
        if (this.passable(a, this.node(e.to))) next.push(e.to);
      }
      layer = next;
    }
    return null;
  },
  // ——————————————— الحلفاء: المساهمة والتنسيق ———————————————
  alliesOf(fid) { return this.aliveMajors().filter((c) => c !== fid && this.status(fid, c) === 'alliance'); },
  contribPoints(fid, enemy) {
    const w = this.warRec(fid, enemy);
    if (!w || w.ended) return 0;
    const s = w.st[fid];
    return s.kills + s.took.length * 150 + s.sieges * 12 + s.battles * 10 + s.aid * 0.5;
  },
  // حصة fid من الجهد ضد العدو، مقارنةً بشريكه
  contribShare(fid, enemy, partner) {
    const a = this.contribPoints(fid, enemy), b = this.contribPoints(partner, enemy);
    return a + b > 0 ? a / (a + b) : 0.5;
  },
  contribParts(fid, enemy) {
    const w = this.warRec(fid, enemy);
    const s = w && !w.ended ? w.st[fid] : { kills: 0, took: [], sieges: 0, battles: 0, aid: 0 };
    return [['قتلى العدو', s.kills], ['مدن أُخذت', s.took.length], ['أدوار حصار', s.sieges], ['معارك', s.battles], ['تمويل الحلفاء', s.aid]];
  },
  commonWars(a, b) { return this.aliveMajors().filter((c) => c !== a && c !== b && this.atWar(a, c) && this.atWar(b, c)); },
  coordsOf(fid) { return (this.S.coord || []).filter((c) => c.from === fid && !c.done); },
  // الأهداف الممكنة لكل نوع من طلبات التنسيق
  coordTargets(from, ally, kind) {
    const wars = this.commonWars(from, ally);
    if (kind === 'attack') return this.S.nodes.filter((n) => wars.includes(n.owner)).map((n) => ({ id: n.id, name: n.name, sub: this.fname(n.owner) })).slice(0, 40);
    if (kind === 'defend') return this.nodesOf(from).filter((n) => this.adjAll(n.id).some((x) => this.armiesAt(x).some((a) => wars.includes(a.fid))) || this.besiegers(n.id).length).map((n) => ({ id: n.id, name: n.name, sub: 'مهددة' }));
    if (kind === 'intercept') return this.S.armies.filter((a) => wars.includes(a.fid) && this.intelLevel(from, a.fid) >= 1).map((a) => ({ id: a.id, name: `جيش ${this.fname(a.fid)} في ${this.node(a.node).name}`, sub: `${this.menOf(a.regs)} رجل تقريباً` }));
    if (kind === 'front') return wars.map((c) => ({ id: c, name: this.fname(c), sub: `${this.nodesOf(c).length} مدن` }));
    return [];
  },
  // جواب الحليف قبل الإرسال وبعده: يحاول فعلاً أو يشرح لماذا لا
  coordAnswer(from, ally, kind, target) {
    const reasons = [];
    if (this.status(from, ally) !== 'alliance') return { ok: false, why: 'ليست حليفتك' };
    const wars = this.commonWars(from, ally);
    if (!wars.length) return { ok: false, why: `لا عدو مشترك بينكما الآن` };
    if (this.coordsOf(from).some((c) => c.ally === ally)) return { ok: false, why: 'تنفّذ طلبك السابق' };
    const A = this.f(ally);
    const armies = this.armiesOf(ally).filter((a) => a.role !== 'governor' && !a.siege);
    const at = kind === 'intercept' ? (this.army(target) && this.army(target).node) : kind === 'front' ? null : target;
    const share = wars.length ? Math.min(...wars.map((e) => this.contribShare(from, e, ally))) : 0.5;
    const trust = this.rel(ally, from) + (share - 0.35) * 60;
    // عاصمة الحليف مهددة؟
    const cap = this.nodesOf(ally).find((n) => n.capital);
    if (cap && this.besiegers(cap.id).length) return { ok: false, why: `${cap.name} عاصمتها تحت الحصار: لن تسحب جيوشها` };
    if (trust < 5) return { ok: false, why: `لا ترى منك ما يكفي في هذه الحرب: مساهمتك نحو ${Math.round(share * 100)}٪، والعلاقة ${this.rel(ally, from)}` };
    if (kind === 'front') {
      if (!wars.includes(target)) return { ok: false, why: 'ليست في حرب معها' };
      return { ok: true, why: `ستركز هجماتها على ${this.fname(target)} ${COORD_TURNS} أدوار` };
    }
    if (!at) return { ok: false, why: 'الهدف لم يعد موجوداً' };
    // جيش يحرس مدينة مهددة لن يتركها (القاعدة نفسها التي تحكم تحركات الذكاء)
    const pinned = (a) => {
      const here = this.node(a.node);
      if (here.owner !== ally || kind === 'defend') return false;
      const thr = CampaignAI.threat(here, ally);
      const guard = this.garrisonPower(here) + this.defendersOf(here).filter((d) => d !== a).reduce((t, d) => t + this.armyPower(d), 0);
      return thr > guard * 1.2 && (here.capital || thr > guard * 2);
    };
    const all = armies.map((a) => ({ a, d: this.openHops(a, at, 6) })).filter((x) => x.d != null);
    const near = all.filter((x) => !pinned(x.a)).sort((x, y) => x.d - y.d);
    if (!near.length && all.length) { const pn = this.node(all[0].a.node); return { ok: false, why: `جيوشها القريبة تحرس ${pn.name} المهددة ولن تتركها الآن` }; }
    if (!near.length) {
      const closest = armies.map((a) => ({ a, d: this.hops(a.node, at, 8) })).sort((x, y) => x.d - y.d)[0];
      const wn = closest && this.whyNot ? this.whyNot(closest.a, at) : null;
      return { ok: false, why: wn && wn.kind !== 'mp' && wn.kind !== 'far' ? `لا طريق مفتوح لجيوشها: ${wn.msg}` : 'جيوشها بعيدة جداً ولا طريق مفتوح إلى الهدف' };
    }
    if (near[0].d > 3) return { ok: false, why: `جيوشها بعيدة: أقرب جيش على بعد ${near[0].d} مراحل عبر طريق مفتوح` };
    const pow = near.filter((x) => x.d <= 3).reduce((t, x) => t + this.armyPower(x.a), 0);
    if (kind === 'attack') {
      const n = this.node(at);
      const def = this.defensePower(n);
      const need = (n.walls ? 0.9 : 1.3) / (this.pers ? this.pers(ally).aggr : 1) * 0.7;
      if (pow < def * need) return { ok: false, why: `${n.name} أقوى مما تستطيع: قوتها القريبة ${Math.round(100 * pow / Math.max(1, def))}٪ من دفاعها، وتحتاج ${Math.round(need * 100)}٪` };
      reasons.push(`أقرب جيش على بعد ${near[0].d} مراحل`);
    }
    if (kind === 'intercept') {
      const e = this.army(target);
      if (pow < this.armyPower(e) * 0.8) return { ok: false, why: `جيشهم أقوى من جيوشها القريبة (${Math.round(100 * pow / Math.max(1, this.armyPower(e)))}٪)` };
    }
    if (kind === 'defend') {
      const n = this.node(at);
      if (n.owner !== from) return { ok: false, why: 'المدينة لم تعد لك' };
    }
    const others = this.aliveMajors().filter((c) => c !== ally && this.atWar(ally, c) && !wars.includes(c)).length;
    if (others && A.lostRecently >= 1) return { ok: false, why: 'تخسر في حرب أخرى وتحتاج جيوشها هناك' };
    return { ok: true, why: `ستتحرك خلال ${near[0].d <= 1 ? 'هذا الدور' : near[0].d + ' أدوار'}. ${reasons.join('، ')}`.trim() };
  },
  requestCoord(from, ally, kind, target) {
    const ans = this.coordAnswer(from, ally, kind, target);
    this.S.coord = this.S.coord || [];
    const c = { id: this.S.nextId++, from, ally, kind, target, turn: this.S.turn, until: this.S.turn + COORD_TURNS, ok: ans.ok, why: ans.why, done: !ans.ok, status: ans.ok ? 'accepted' : 'refused', log: [] };
    this.S.coord.push(c);
    if (ans.ok) this.addRel(ally, from, 2);
    return c;
  },
  coordTargetNode(c) { return c.kind === 'intercept' ? (this.army(c.target) ? this.army(c.target).node : null) : c.kind === 'front' ? null : c.target; },
  // كل دور: متابعة ما فعله الحليف
  coordTick() {
    for (const c of this.S.coord || []) {
      if (c.done) continue;
      const at = this.coordTargetNode(c);
      const A = this.armiesOf(c.ally).filter((a) => a.role !== 'governor');
      let st = null;
      // الحليف لا يتحرك لأن مدنه صارت مهددة: يقول ذلك
      const pinnedAt = c.kind !== 'defend' && A.length && A.every((a) => {
        const here = this.node(a.node);
        if (here.owner !== c.ally) return false;
        const thr = CampaignAI.threat(here, c.ally);
        const guard = this.garrisonPower(here) + this.defendersOf(here).filter((d) => d !== a).reduce((t, d) => t + this.armyPower(d), 0);
        return thr > guard * 1.2 && (here.capital || thr > guard * 2);
      }) ? this.node(A[0].node) : null;
      if (c.kind === 'attack') {
        const n = this.node(c.target);
        if (n.owner === c.ally || n.owner === c.from) st = ['done', `سقطت ${n.name}`];
        else if (this.besiegers(n.id).some((b) => b.fid === c.ally)) st = ['sieging', `${this.fname(c.ally)} تحاصر ${n.name}`];
        else if (pinnedAt) st = ['pinned', `${this.fname(c.ally)} لا تتحرك نحو ${n.name}: جيوش العدو تهدد ${pinnedAt.name} فبقيت تحرسها`];
        else if (A.some((a) => this.hops(a.node, n.id, 2) <= 1)) st = ['near', `جيش ${this.fname(c.ally)} على مشارف ${n.name}`];
      } else if (c.kind === 'defend') {
        const n = this.node(c.target);
        if (A.some((a) => a.node === n.id)) st = ['there', `جيش ${this.fname(c.ally)} في ${n.name}`];
      } else if (c.kind === 'intercept') {
        if (!this.army(c.target)) st = ['done', 'الجيش المعادي لم يعد موجوداً'];
        else if (pinnedAt) st = ['pinned', `${this.fname(c.ally)} لا تلاحقهم: جيوش العدو تهدد ${pinnedAt.name}`];
        else if (at && A.some((a) => this.hops(a.node, at, 2) <= 1)) st = ['near', `جيش ${this.fname(c.ally)} يلاحقهم`];
      } else if (c.kind === 'front') {
        if (!this.atWar(c.ally, c.target)) st = ['done', 'انتهت الحرب على هذه الجبهة'];
      }
      if (st && st[0] !== c.status) {
        c.status = st[0]; c.log.push({ turn: this.S.turn, text: st[1] });
        if (c.from === this.S.player) this.alert('info', `تنسيق الحرب: ${st[1]}`, { icon: COORD[c.kind].icon, win: 'diplo', node: at || undefined });
      }
      if (st && st[0] === 'done') c.done = true;
      if (!c.done && this.S.turn >= c.until) {
        c.done = true;
        const txt = c.status === 'accepted' ? `${this.fname(c.ally)} لم تبلغ الهدف في الوقت: الطريق أو القوة لم يسمحا` : `انتهت مدة طلب التنسيق مع ${this.fname(c.ally)}`;
        c.log.push({ turn: this.S.turn, text: txt });
        if (c.from === this.S.player) this.alert('info', txt, { icon: 'hourglass', win: 'diplo' });
      }
    }
  },
  // الحليف الذي لا يرى مساهمة كافية يطلب المزيد
  allyRequests() {
    const P = this.S.player;
    for (const ally of this.alliesOf(P)) {
      for (const e of this.commonWars(P, ally)) {
        const w = this.warRec(P, e);
        if (!w || this.S.turn - w.since < 4) continue;
        const share = this.contribShare(P, e, ally);
        const key = `askhelp:${ally}:${e}`;
        const F = this.f(P);
        F.asked = F.asked || {};
        if (share < 0.25 && (F.asked[key] || -99) + 8 <= this.S.turn) {
          F.asked[key] = this.S.turn;
          this.alert('imp', `${this.fname(ally)} تطلب منك مشاركة أكبر في الحرب على ${this.fname(e)}: مساهمتك ${Math.round(share * 100)}٪ من جهدكما`, { icon: 'bell', win: 'diplo', key });
        }
      }
    }
  },

  // ——————————————— التجسس ———————————————
  spyNet(by, target) { return ((this.f(by).net || {})[target]) || 0; },
  citySecurity(n) {
    const parts = [];
    const add = (label, v) => { v = Math.round(v); if (v) parts.push([label, v]); };
    add(`الأسوار (${n.walls})`, n.walls * 4);
    add('الحامية', Math.min(12, this.garrisonPower(n) / 15));
    if (n.capital) add('عاصمة يحرسها البلاط', 12);
    if (this.governorOf && this.governorOf(n)) add('حاكم يقظ', 6);
    if (n.loyalty >= 70) add(`أهلها أوفياء (${n.loyalty})`, 6);
    if (n.loyalty < 40) add(`أهلها ساخطون (${n.loyalty})`, -8);
    if (n.caught && this.S.turn - n.caught < 6) add('قُبض على جاسوس هنا مؤخراً', 10);
    return { v: parts.reduce((t, p) => t + p[1], 0), parts };
  },
  // تقييم هدف: فرصة النجاح وفرصة انكشاف الفاعل، مع أسبابهما
  spyAssess(by, target, op, targetId) {
    const O = SPY_OPS[op];
    const parts = [];
    const add = (label, v) => { if (Math.abs(v) >= 0.01) parts.push([label, v]); };
    const net = this.spyNet(by, target);
    add(`شبكتك في ${this.fname(target)} (${net} من 3)`, net * 0.07);
    const lvl = this.intelLevel(by, target);
    add(`معرفتك (${['مجهول', 'تقديري', 'تقريبي', 'مؤكد'][lvl]})`, (lvl - 1) * 0.04);
    if (this.treaty(by, target).trade) add('التجار غطاء لعملائك', 0.06);
    if (this.atWar(by, target)) add('الحرب تجعلهم أكثر حذراً', -0.05);
    let node = null, importance = 0;
    if (O.target === 'city') {
      node = this.node(targetId);
      const d = Math.min(...this.nodesOf(by).map((m) => this.hops(m.id, node.id, 6)).concat([6]));
      add(`المسافة (${d} مراحل)`, -Math.max(0, d - 1) * 0.05);
      const sec = this.citySecurity(node);
      add(`أمن المدينة (${sec.v})`, -sec.v / 100);
      importance = node.pop / 1000 + (node.capital ? 15 : 0) + (node.market || 0) * 3 + (this.besiegers(node.id).some((b) => b.fid === by) ? 10 : 0);
    } else if (O.target === 'army') {
      const a = this.army(targetId);
      if (a) { const d = Math.min(...this.nodesOf(by).map((m) => this.hops(m.id, a.node, 6)).concat([6])); add(`المسافة (${d} مراحل)`, -Math.max(0, d - 1) * 0.05); }
    }
    const p = clamp(O.base + parts.reduce((t, x) => t + x[1], 0), 0.1, 0.95);
    const disc = clamp(O.disc - net * 0.05 + (node ? this.citySecurity(node).v / 200 : 0) + (this.atWar(by, target) ? 0 : 0.05), 0.03, 0.8);
    return { p, disc, parts, importance, band: oddsBand(p), discBand: oddsBand(disc) };
  },
  spyTargets(by, target, op) {
    const O = SPY_OPS[op];
    if (O.target === 'realm') return [{ id: target, name: this.fname(target), ...this.spyAssess(by, target, op) }];
    if (O.target === 'army') return this.armiesOf(target).map((a) => ({ id: a.id, name: `جيش في ${this.node(a.node).name}`, ...this.spyAssess(by, target, op, a.id) })).sort((x, y) => y.p - x.p);
    return this.nodesOf(target).map((n) => ({ id: n.id, name: n.name, ...this.spyAssess(by, target, op, n.id) }))
      .sort((x, y) => (y.p * (4 + y.importance)) - (x.p * (4 + x.importance)));
  },
  canSpyOp(by, target, op) {
    if (this.f(by).gold < SPY_OPS[op].cost) return 'الذهب لا يكفي';
    if ((this.f(by).spyTurn || -1) === this.S.turn) return 'مهمة تجسس واحدة كل دور';
    if (op === 'military' && !this.armiesOf(target).length) return 'لا جيوش لها الآن';
    return null;
  },
  spyOp(by, target, op, targetId, sub) {
    const err = this.canSpyOp(by, target, op);
    if (err) return { err };
    const B = this.f(by), T = this.f(target), S = this.S;
    const as = this.spyAssess(by, target, op, targetId);
    B.gold -= SPY_OPS[op].cost;
    B.spyTurn = S.turn;
    const r = rng(hashStr(`${by}:${target}:${op}:${targetId}:${S.turn}:spy`));
    const ok = r() < as.p, found = r() < as.disc;
    let text = '';
    const n = SPY_OPS[op].target === 'city' ? this.node(targetId) : null;
    if (ok) {
      B.net = B.net || {}; B.net[target] = Math.min(3, (B.net[target] || 0) + (op === 'scout' ? 1 : 0.5));
      if (op === 'scout') { B.intel[target] = 8; text = `عملاؤك في بلاط ${T.name}: معرفة مؤكدة 8 أدوار.`; }
      else if (op === 'military') {
        B.armyIntel = B.armyIntel || {}; B.armyIntel[targetId] = S.turn + 6;
        const a = this.army(targetId);
        const ai = this.armyIntelText(by, a);
        text = `تقرير عن جيش ${T.name}: ${ai}`;
      } else if (op === 'incite') {
        n.loyalty = Math.max(0, n.loyalty - 20);
        n.unrest = Math.max(n.unrest, 2);
        n.incited = S.turn + 4; n.noRecruit = Math.max(n.noRecruit || 0, S.turn + 3); n.taxRefuse = S.turn + 3;
        text = `المحرّضون في ${n.name}: الولاء ${n.loyalty}، اضطراب دورين، الأعيان يرفضون الضرائب 3 أدوار، ولا تجنيد 3 أدوار، واحتمال التمرد أعلى.`;
        if (target === this.S.player) this.alert('imp', `محرّضون يثيرون أهل ${n.name}: الولاء ${n.loyalty} ورفض للضرائب`, { node: n.id, icon: 'torch' });
      } else {
        const k = sub || 'stores';
        const SB = SABOTAGE[k];
        if (k === 'market') n.marketOff = S.turn + SB.turns;
        if (k === 'stores') n.stores = Math.max(-1, n.stores - 3);
        if (k === 'reinforce') n.noRecruit = Math.max(n.noRecruit || 0, S.turn + SB.turns);
        if (k === 'walls') n.wallDmg = S.turn + SB.turns;
        if (k === 'caravan') n.caravanStop = S.turn + SB.turns;
        if (k === 'gap') { n.gapBy = n.gapBy || {}; n.gapBy[by] = S.turn + SB.turns; }
        text = `${SB.name} في ${n.name}: ${SB.desc}`;
        if (target === this.S.player && k !== 'gap') this.alert('imp', `تخريب في ${n.name}: ${SB.name}`, { node: n.id, icon: SB.icon });
      }
    } else text = op === 'scout' ? `فشل عملاؤك في بلوغ بلاط ${T.name}.` : `فشلت العملية${n ? ' في ' + n.name : ''}: لم يتحقق شيء.`;
    // السمعة والعلاقة لا تتضرران إلا إن عُرف الفاعل
    if (found) {
      this.addRel(by, target, -20);
      B.rep = Math.max(0, B.rep - 5);
      if (T.grievance) T.grievance[by] = (T.grievance[by] || 0) + 1;
      if (n) n.caught = S.turn;
      B.net = B.net || {}; B.net[target] = Math.max(0, (B.net[target] || 0) - 1);
      this.event('pol', `قُبض على عملاء ${B.name} في أرض ${T.name}، وعُرف من أرسلهم.`, { fids: [by, target], imp: 2 });
      text += ' لكن أحد العملاء قُبض عليه واعترف بمن أرسله: العلاقة −20 والسمعة −5.';
      if (target === this.S.player) this.alert('imp', `قبضنا على عملاء ${B.name}${n ? ' في ' + n.name : ''}`, { icon: 'dagger', win: 'diplo' });
    } else if (ok && op !== 'scout' && op !== 'military' && target === this.S.player) text += '';
    return { ok, found, text, as };
  },
  // وصف جيش بما يعرفه المراقب
  armyIntelText(by, a) {
    if (!a) return 'الجيش لم يعد موجوداً';
    const g = this.armyGen(a);
    const by2 = {};
    for (const r of a.regs) by2[UNITS[r.type].name] = (by2[UNITS[r.type].name] || 0) + r.men;
    const dest = this.f(a.fid).goals && this.f(a.fid).goals.target ? this.node(this.f(a.fid).goals.target).name : 'لا وجهة واضحة';
    const rd = this.readyScore ? this.readyScore(a).total : null;
    return `${this.menOf(a.regs)} رجل (${Object.entries(by2).map(([k, v]) => `${k} ${v}`).join('، ')})، القائد ${g ? g.name + ' ' + '★'.repeat(g.rank) : 'بلا قائد'}، الإمداد ${this.supplyHops(a) ? 'بعيد ' + this.supplyHops(a) + ' مراحل' : 'في أرضهم'}${rd != null ? '، الجاهزية ' + rd + '٪' : ''}، الوجهة المرجحة: ${dest}.`;
  },
  knowsArmy(by, a) { return !!a && (((this.f(by).armyIntel || {})[a.id] || 0) >= this.S.turn); },
  // الذكاء يختار هدفه بالقواعد نفسها
  spyAI(by, target, op) {
    const list = this.spyTargets(by, target, op);
    if (!list.length) return null;
    const pick0 = list[0];
    let sub;
    if (op === 'sabotage') {
      const n = this.node(pick0.id);
      sub = this.besiegers(n.id).some((b) => b.fid === by) ? (n.walls >= 2 ? 'gap' : 'stores') : n.market >= 2 ? 'market' : (this.f(by).goals && this.f(by).goals.target === n.id ? 'walls' : 'reinforce');
    }
    return this.spyOp(by, target, op, pick0.id, sub);
  },

  // ——————————————— الفتح: مصير المدينة والحامية ———————————————
  occupationPreview(node, fid, how, choice, fate, defMen) {
    const old = node.owner === fid ? node.prevOwner : node.owner;
    const out = [];
    if (choice === 'sack') out.push(['غنيمة الآن', '+' + Math.round(node.pop / 55)], ['السكان', '−28٪'], ['الولاء يصبح', '12'], ['الاضطراب', '6 أدوار'], ['السمعة', '−4'], ['العلاقة معهم', '−15'], ['المباني', 'السوق يخسر درجة']);
    else if (choice === 'clemency') out.push(['الكلفة', '−50'], ['الولاء يصبح', '62'], ['الاضطراب', 'أقصر بدورين'], ['السمعة', '+4'], ['العلاقة معهم', '+8'], ['المباني', 'تبقى سليمة'], ['مدنهم الأخرى', 'أسهل استسلاماً 8 أدوار']);
    else out.push(['مصادرة أموال الأعيان', '+' + Math.round(node.pop / 200)], ['الولاء يصبح', String(how === 'surrender' ? 52 : 40)], ['الاضطراب', (how === 'surrender' ? 2 : 4) + ' أدوار'], ['مظالمهم عليك', '+1']);
    const fx = {
      disarm: [['القوى البشرية للمدينة', '+' + Math.round(defMen * 0.5)], ['الولاء', '−5']],
      withdraw: [['يعود إليهم', Math.round(defMen * 0.8) + ' رجلاً'], ['السمعة', '+2'], ['العلاقة', '+5']],
      passage: [['السكان', '−4٪'], ['الولاء', '+8'], ['السمعة', '+2'], ['العلاقة', '+3']],
      captives: [['فدية وعمل', '+' + Math.round(defMen * 0.6)], ['السمعة', '−3'], ['العلاقة', '−10'], ['الولاء', '−6']],
    }[fate] || [];
    void old;
    return { policy: out, fate: fx };
  },
  applyGarrisonFate(node, fid, old, fate, defMen) {
    const f = this.f(fid);
    if (!defMen || !fate) return;
    if (fate === 'disarm') { node.manpower = Math.min(this.mpCap(node), node.manpower + Math.round(defMen * 0.5)); node.loyalty = Math.max(0, node.loyalty - 5); }
    else if (fate === 'withdraw' || fate === 'passage') {
      const home = this.nodesOf(old).sort((a, b) => this.hops(node.id, a.id, 8) - this.hops(node.id, b.id, 8))[0];
      if (home) home.manpower = Math.min(this.mpCap(home), home.manpower + Math.round(defMen * (fate === 'withdraw' ? 0.8 : 0.5)));
      f.rep = Math.min(100, f.rep + 2);
      this.addRel(fid, old, fate === 'withdraw' ? 5 : 3);
      if (fate === 'passage') { node.pop = Math.round(node.pop * 0.96); node.loyalty = Math.min(100, node.loyalty + 8); }
    } else if (fate === 'captives') {
      f.gold += Math.round(defMen * 0.6);
      f.rep = Math.max(0, f.rep - 3);
      this.addRel(fid, old, -10);
      node.loyalty = Math.max(0, node.loyalty - 6);
      const O = this.f(old);
      if (O && O.grievance) O.grievance[fid] = (O.grievance[fid] || 0) + 1;
    }
    this.event('mil', `${GARRISON_FATE[fate].name}: مصير ${defMen} من مدافعي ${node.name}.`, { fids: [fid, old], node: node.id, imp: 1 });
  },
});

// ——— ربط الأنظمة ———
{
  // سجل الحرب يبدأ مع إعلانها
  const setStatus = Game.setStatus;
  Game.setStatus = function (a, b, st, truce) {
    const was = this.atWar(a, b);
    setStatus.call(this, a, b, st, truce);
    if (st === 'war' && !was && a !== 'neutral' && b !== 'neutral') this.warRec(a, b, true);
    if (st !== 'war' && was) { const w = this.warRec(a, b); if (w && !w.ended) w.ended = this.S.turn; }
  };
  // المعارك: القتلى والانتصارات لكل طرف
  const finishEncounter = Game.finishEncounter;
  Game.finishEncounter = async function (enc, out) {
    if (out && out.winner != null && out.report && enc.attFid !== 'neutral' && enc.defFid !== 'neutral' && this.atWar(enc.attFid, enc.defFid)) {
      const w = this.warRec(enc.attFid, enc.defFid, true);
      const cas = out.report.cas;
      const A = w.st[enc.attFid], D = w.st[enc.defFid];
      A.kills += cas[1].lost; A.lost += cas[0].lost; D.kills += cas[0].lost; D.lost += cas[1].lost;
      A.battles++; D.battles++;
      (out.winner === 0 ? A : D).won++;
    }
    return finishEncounter.call(this, enc, out);
  };
  // الفتح: المدينة تُحسب لمن أخذها، ومصير الحامية
  const capture = Game.capture;
  Game.capture = async function (node, fid, how, armies) {
    const old = node.owner;
    const defMen = this.menOf(node.garrison) + (how === 'surrender' ? this.defendersOf(node).filter((d) => d.fid === old).reduce((t, d) => t + this.menOf(d.regs), 0) : 0);
    const bldBefore = ['market', 'farm', 'granary', 'roads'].map((b) => node[b] || 0);
    this.capCtx = { node: node.id, old, defMen, bldBefore, how };
    if (old !== 'neutral' && this.atWar(fid, old)) { const w = this.warRec(fid, old, true); w.st[fid].took.push(node.id); }
    const r = await capture.call(this, node, fid, how, armies);
    this.capCtx = null;
    return r;
  };
  const applyOccupation = Game.applyOccupation;
  Game.applyOccupation = function (node, fid, old, choice, how) {
    let fate = null;
    if (choice && typeof choice === 'object') { fate = choice.fate; choice = choice.choice; }
    const ctx = this.capCtx && this.capCtx.node === node.id ? this.capCtx : { defMen: 0, bldBefore: null };
    if (!fate) {
      const p = this.pers ? this.pers(fid) : { aggr: 1, honor: 1 };
      fate = this.f(fid).isPlayer ? 'disarm' : p.honor > 1.1 ? 'withdraw' : p.aggr > 1.2 ? 'captives' : 'disarm';
    }
    applyOccupation.call(this, node, fid, old, choice, how);
    const f = this.f(fid);
    if (choice === 'clemency') {
      // الأمان: لا تُمسّ المباني، ومدنهم الأخرى تسمع بذلك
      if (ctx.bldBefore) ['market', 'farm', 'granary', 'roads'].forEach((b, i) => { node[b] = Math.max(node[b] || 0, ctx.bldBefore[i]); });
      f.mercy = this.S.turn + 8;
    } else if (choice === 'occupy') {
      // الضمّ بالقوة: مصادرة أموال الأعيان وتبقى المظالم
      f.gold += Math.round(node.pop / 200);
      const O = this.f(old);
      if (O && O.grievance) O.grievance[fid] = (O.grievance[fid] || 0) + 1;
    }
    this.applyGarrisonFate(node, fid, old, fate, ctx.defMen);
  };
  // سمعة الأمان تسهّل الاستسلام
  const odds = Game.surrenderOdds;
  Game.surrenderOdds = function (n, fid) {
    const o = odds.call(this, n, fid);
    if ((this.f(fid).mercy || 0) > this.S.turn) {
      o.factors.push(['سمعة أمانك في المدن التي فتحتها', 0.08]);
      o.p = clamp(o.p + 0.08, 0, 0.9); o.band = oddsBand(o.p);
    }
    return o;
  };
  // الحصار والتمويل في سجل الحرب
  const endRound = Game.endRound;
  Game.endRound = function () {
    for (const a of this.S.armies) {
      if (!a.siege) continue;
      const n = this.node(a.node);
      if (n.owner !== 'neutral' && this.atWar(a.fid, n.owner)) { const w = this.warRec(a.fid, n.owner, true); w.st[a.fid].sieges++; }
    }
    const r = endRound.call(this);
    this.coordTick();
    this.allyRequests();
    // انقضاء آثار التحريض: احتمال تمرد أعلى وهي فاعلة
    for (const n of this.S.nodes) if (n.incited && n.incited >= this.S.turn && n.loyalty < 35 && !this.besieger(n.id) && R() < 0.2) this.revolt(n, r || []);
    return r;
  };
  const subsidy = Game.subsidy;
  Game.subsidy = function (a, b, amount = 150) {
    subsidy.call(this, a, b, amount);
    for (const e of this.commonWars(a, b)) { const w = this.warRec(a, e, true); w.st[a].aid += amount; }
  };
  // آثار التخريب والتحريض في الأنظمة
  const incomeSteps = Game.incomeSteps;
  Game.incomeSteps = function (n) {
    const out = incomeSteps.call(this, n);
    if (out.sieged || !out.total) return out;
    const T = this.S.turn;
    let cut = 0;
    if (n.marketOff >= T && out.market) { out.steps.push({ k: 'sabotage', label: 'السوق معطّل (تخريب)', v: -out.market, note: `حتى الدور ${n.marketOff + 1}` }); cut += out.market; out.market = 0; }
    if (n.taxRefuse >= T && out.tax) { const d = Math.round(out.tax * 0.5); out.steps.push({ k: 'incite', label: 'الأعيان يرفضون الضرائب (تحريض)', v: -d, note: `حتى الدور ${n.taxRefuse + 1}` }); cut += d; out.tax -= d; }
    out.total = Math.max(0, out.total - cut);
    return out;
  };
  const canRecruit = Game.canRecruit;
  Game.canRecruit = function (fid, node, type, armyId, merc) {
    if (!merc && node.noRecruit >= this.S.turn && node.owner === fid) return `التجنيد متوقف في ${node.name} حتى الدور ${node.noRecruit + 1} (تحريض أو تخريب)`;
    return canRecruit.call(this, fid, node, type, armyId, merc);
  };
  const fillGarrison = Game.fillGarrison;
  Game.fillGarrison = function (n, full) {
    if (!full && n.noRecruit >= this.S.turn) return;
    return fillGarrison.call(this, n, full);
  };
  Game.effWalls = function (n) { return Math.max(0, n.walls - (n.wallDmg >= this.S.turn ? 1 : 0)); };
  const segState = Game.routeSegState;
  Game.routeSegState = function (a, b) {
    for (const id of [a, b]) {
      const n = this.node(id);
      if (n && n.caravanStop >= this.S.turn) return { ok: false, cause: 'event', node: id, text: `عملاء أوقفوا القوافل عند ${n.name}`, fix: `تعود القوافل وحدها بعد الدور ${n.caravanStop}.`, auto: true };
    }
    return segState.call(this, a, b);
  };
  // ثغرة كشفها الجواسيس: أحد الأسوار يبدأ مفتوحاً جزئياً
  const simConfig = Game.simConfig;
  Game.simConfig = function (enc) {
    const cfg = simConfig.call(this, enc);
    const n = this.node(enc.node);
    if (enc.kind === 'siege' && n.gapBy && n.gapBy[enc.attFid] >= this.S.turn) cfg.gap = true;
    return cfg;
  };
  // جواسيس الذكاء بالقواعد نفسها
  Game.spy = function (by, target, kind) {
    if (kind === 'scout') return this.spyOp(by, target, 'scout', target);
    return this.spyAI(by, target, kind) || { err: 'لا هدف' };
  };
}
// الثغرة المكشوفة في المحاكاة
{
  const setup = WarSim.prototype.siegeSetup;
  WarSim.prototype.siegeSetup = function () {
    setup.call(this);
    if (this.kind === 'siege' && this.cfg.gap) {
      const k = SECTS[Math.floor(this.r() * 3)];
      this.sides[1].sec[k].breach = 0.35;
      this.noMeans = false;
      this.gapSec = k;
    }
  };
}

// ——— الحليف يحاول فعلاً: طلبات التنسيق المقبولة تغيّر أهداف جيوشه ———
{
  const activeFor = (fid) => (Game.S.coord || []).filter((c) => c.ally === fid && c.ok && !c.done);
  const planGoals = CampaignAI.planGoals;
  CampaignAI.planGoals = function (fid) {
    const f = Game.f(fid);
    const act = activeFor(fid);
    planGoals.call(this, fid);
    const front = act.find((c) => c.kind === 'front');
    if (front && (!f.goals || f.goals.owner !== front.target)) {
      // التركيز على جبهة: أقرب مدن ذلك العدو وأضعفها دفاعاً
      const mine = Game.nodesOf(fid);
      const best = Game.nodesOf(front.target).map((n) => ({ n, d: Math.min(...mine.map((m) => Game.hops(m.id, n.id, 4)).concat([9])) }))
        .filter((x) => x.d <= 3).sort((x, y) => (x.d - y.d) || (Game.defensePower(x.n) - Game.defensePower(y.n)))[0];
      if (best) f.goals = { target: best.n.id, owner: front.target, score: 500, since: Game.S.turn, kind: 'coord', coord: front.id };
    }
    const atk = act.find((c) => c.kind === 'attack' || c.kind === 'intercept');
    if (atk) {
      const at = Game.coordTargetNode(atk);
      const n = at && Game.node(at);
      if (n && !Game.friendly(n.owner, fid)) f.goals = { target: n.id, owner: n.owner, score: 999, since: Game.S.turn, kind: 'coord', coord: atk.id };
    }
  };
  const military = CampaignAI.military;
  CampaignAI.military = async function (fid) {
    // الدفاع عن مدينة الحليف: أقرب جيش حر يتحرك نحوها
    for (const c of activeFor(fid).filter((x) => x.kind === 'defend' || x.kind === 'intercept')) {
      const at = Game.coordTargetNode(c);
      if (!at) continue;
      const cand = CampaignAI.fieldArmies(fid).filter((a) => !a.siege && a.mp > 0 && a.node !== at).sort((x, y) => Game.hops(x.node, at, 8) - Game.hops(y.node, at, 8))[0];
      if (!cand) continue;
      const reach = Game.reach(cand);
      let best = null, bd = Game.hops(cand.node, at, 8);
      for (const id in reach) {
        const pl = Game.planMove(cand, id);
        if (pl.err || pl.needWar) continue;
        if (c.kind === 'defend' && !(pl.kind === 'move' || pl.kind === 'relief')) continue;
        const d = Game.hops(id, at, 8);
        if (d < bd || (d === bd && id === at)) { bd = d; best = id; }
      }
      if (best) await Game.executeMove(cand, best);
    }
    return military.call(this, fid);
  };
}

// المساهمة في الحرب المشتركة جزء مفسَّر من العلاقة
{
  const relParts = Game.relParts;
  Game.relParts = function (a, b) {
    const parts = relParts.call(this, a, b);
    if (this.status(a, b) === 'alliance') {
      for (const e of this.commonWars(a, b)) {
        const w = this.warRec(b, e);
        if (!w || this.S.turn - w.since < 3) continue;
        const share = this.contribShare(b, e, a);
        const v = Math.round((share - 0.5) * 20);
        if (v) parts.push([`جهد ${this.fname(b)} في الحرب على ${this.fname(e)} (${Math.round(share * 100)}٪)`, v]);
      }
    }
    return parts;
  };
}
