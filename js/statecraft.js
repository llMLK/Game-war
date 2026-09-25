'use strict';
// الحنكة: عمليات الجواسيس بأهداف يختارها اللاعب وآثار محفوظة تنتهي في موعدها،
// عروض الصلح بمبلغ يحدده اللاعب، وطلب تسليم المدن بلا إعادة رمي.

// العمليات على المدن. الأثر يُحفظ في المدينة وينتهي في موعده
const SPY_OPS = {
  incite: { name: 'تحريض الأهالي', cost: 130, turns: 4, base: 0.62, catch: 0.3, icon: 'torch', what: (m) => `الولاء −${m.now} فوراً، وهدف ولائها −${m.target} لمدة 4 أدوار`, desc: 'عملاء يثيرون السخط على الحكّام: قد تنقلب المدينة إن كان ولاؤها ضعيفاً.' },
  stores: { name: 'إحراق المخازن', cost: 110, turns: 0, base: 0.58, catch: 0.25, icon: 'fire', what: (m) => `مؤن الحصار −${m.now} أدوار`, desc: 'يضعف صمود المدينة إن حوصرت.' },
  garrison: { name: 'تسميم الحامية', cost: 120, turns: 3, base: 0.5, catch: 0.3, icon: 'dagger', what: (m) => `الحامية −${m.now}٪ فوراً، ولا تتعافى 3 أدوار`, desc: 'يفتح الطريق لاقتحام قريب.' },
  market: { name: 'تخريب السوق', cost: 100, turns: 3, base: 0.6, catch: 0.2, icon: 'coins', what: () => 'دخل المدينة −30٪ لمدة 3 أدوار', desc: 'يضرب خزينة العدو من مدينة غنية.' },
};

Object.assign(Game, {
  // --- الجواسيس ---
  // المدن المؤهلة: على حدودك، أو معروفة لك بالتجارة أو الاستطلاع
  spyTargets(by, target) {
    const lvl = this.intelLevel(by, target);
    return this.nodesOf(target).map((n) => {
      const border = this.adjAll(n.id).some((x) => this.node(x).owner === by);
      const ok = border || lvl >= 2;
      return { n, ok, why: ok ? (border ? 'على حدودك' : 'عملاؤك يعرفونها') : 'بعيدة ولا تعرفها: استطلع مملكتها أو اعقد معها تجارة' };
    }).sort((a, b) => (b.ok - a.ok) || a.n.loyalty - b.n.loyalty);
  },
  opActive(n, k) { return (n.ops || []).find((o) => o.k === k && o.until >= this.S.turn) || null; },
  // فرصة النجاح بأسبابها. المقاومة: الولاء العالي، حاكم أو قائد صامد، العاصمة، عمليات سابقة كُشفت
  spyChance(by, n, k) {
    const op = SPY_OPS[k];
    let p = op.base;
    const parts = [['الأساس', Math.round(op.base * 100)]];
    const add = (label, v) => { if (!v) return; p += v; parts.push([label, Math.round(v * 100)]); };
    if (k === 'incite') add(`ولاء المدينة ${n.loyalty}`, (50 - n.loyalty) / 200);
    if (n.capital) add('العاصمة محروسة', -0.15);
    const gov = this.governorAt(n);
    if (gov) add(`الحاكم ${gov.name}`, gov.trait === 'defender' || gov.trait === 'tactician' ? -0.2 : -0.1);
    if (this.armiesOfAt(n.owner, n.id).some((a) => this.hasTrait(a, 'defender'))) add('قائد صامد مقيم', -0.12);
    const burnt = (n.caught || {})[by] || 0;
    if (burnt > 0) add('شبكتك هنا انكشفت من قبل', -0.12 * Math.min(2, burnt));
    if (this.intelLevel(by, n.owner) >= 3) add('معلومات دقيقة', 0.08);
    return { p: clamp(p, 0.1, 0.9), parts };
  },
  spyMagnitude(n, k) {
    if (k === 'incite') return { now: 12, target: 15 };
    if (k === 'stores') return { now: 3 };
    if (k === 'garrison') return { now: 30 };
    return {};
  },
  canSpyOp(by, target, cityId, k) {
    const F = this.f(by), op = SPY_OPS[k], n = this.node(cityId);
    if (!op || !n || n.owner !== target) return 'هدف غير صالح';
    if ((F.spyTurn || -1) === this.S.turn) return 'مهمة تجسس واحدة كل دور';
    const t = this.spyTargets(by, target).find((x) => x.n === n);
    if (!t || !t.ok) return t ? t.why : 'هدف غير صالح';
    const act = this.opActive(n, k);
    if (act) return `عملية مماثلة جارية هنا حتى الدور ${act.until + 1}: لا تتراكم`;
    if (k === 'stores' && n.stores <= 0) return 'مخازنها فارغة أصلاً';
    if (F.gold < op.cost) return `الذهب لا يكفي (${op.cost})`;
    return null;
  },
  // تنفيذ العملية: رمية واحدة مثبتة بالمدينة والدور، فلا تُعاد بنتيجة مختلفة
  spyOp(by, target, cityId, k) {
    const err = this.canSpyOp(by, target, cityId, k);
    if (err) return { err };
    const F = this.f(by), T = this.f(target), op = SPY_OPS[k], n = this.node(cityId);
    F.gold -= op.cost; F.spyTurn = this.S.turn;
    const r = rng(hashStr(`${cityId}:${k}:${by}:${this.S.turn}`));
    const { p } = this.spyChance(by, n, k);
    const ok = r() < p;
    const caught = r() < op.catch * (ok ? 1 : 1.6);
    const m = this.spyMagnitude(n, k);
    let text;
    if (ok) {
      n.ops = (n.ops || []).filter((o) => o.until >= this.S.turn);
      if (k === 'incite') { n.loyalty = Math.max(0, n.loyalty - m.now); n.ops.push({ k, by, until: this.S.turn + op.turns, mag: m.target }); }
      if (k === 'stores') n.stores = Math.max(-1, n.stores - m.now);
      if (k === 'garrison') { for (const g of n.garrison) g.men = Math.round(g.men * (1 - m.now / 100)); n.ops.push({ k, by, until: this.S.turn + op.turns }); }
      if (k === 'market') n.ops.push({ k, by, until: this.S.turn + op.turns, mag: 0.3 });
      text = `نجح ${op.name} في ${n.name}: ${op.what(m)}${op.turns ? `، حتى الدور ${this.S.turn + op.turns + 1}` : ''}.`;
      if (target === this.S.player) this.alert('imp', `${op.name} في ${n.name}${caught ? ` بيد عملاء ${F.name}` : ' على يد مجهولين'}`, { node: n.id, icon: op.icon });
    } else text = `فشل ${op.name} في ${n.name}: لم يتغير شيء${caught ? '' : '، وخسرت الكلفة'}.`;
    if (caught) {
      this.addRel(by, target, -20);
      F.rep = Math.max(0, F.rep - 5);
      if (T.grievance) T.grievance[by] = (T.grievance[by] || 0) + 1;
      n.caught = n.caught || {}; n.caught[by] = (n.caught[by] || 0) + 1;
      this.event('pol', `قُبض على عملاء ${F.name} في ${n.name}!`, { fids: [by, target], node: n.id, imp: 2 });
      text += ` وقُبض على عميل: العلاقة مع ${T.name} −20 والسمعة −5.`;
    }
    if (this.track && by === this.S.player) this.track('spy:' + k + (ok ? ':ok' : ':fail'));
    return { ok, caught, text };
  },
  // أثر العمليات الجارية على هدف الولاء والدخل
  opLoyalty(n) { const o = this.opActive(n, 'incite'); return o ? -o.mag : 0; },
  opIncome(n) { const o = this.opActive(n, 'market'); return o ? 1 - o.mag : 1; },
  opGarrisonBlocked(n) { return !!this.opActive(n, 'garrison'); },

  // --- الصلح بمبلغ يحدده اللاعب ---
  // amount موجب: تدفعه أنت. سالب: تطلبه منهم. الحساب ثابت بلا رمي: إما يقبلون أو يرفضون مع السبب
  peaceTerms(ai, other, amount) {
    const A = this.f(ai), O = this.f(other);
    const why = [];
    if (A.vendetta && A.vendetta[other] > 0) return { ok: false, hard: true, score: -999, why: [`دم قائدها بينكما: لا صلح بالمال حتى تنقضي مدة الثأر (${A.vendetta[other]} أدوار)`] };
    const pa = this.factionPower(ai), po = this.factionPower(other);
    const aggr = this.pers(ai).aggr * DIFFS[this.S.difficulty].aiAggr;
    const parts = [];
    const add = (label, v) => { if (Math.abs(v) >= 0.5) parts.push([label, Math.round(v)]); return v; };
    let s = 0;
    s += add('العلاقة بينكما', this.rel(ai, other) * 0.4);
    s += add(po > pa ? 'أنت أقوى منها' : 'هي أقوى منك', (po / Math.max(1, pa) - 1) * 40);
    s += add('طول الحرب', (A.warTurns[other] || 0) * 2);
    s += add('خسائرها الأخيرة', (A.lostRecently || 0) * 10);
    s += add('طبعها الحربي', -aggr * 12);
    s += add('سمعتك', (O.rep - 50) / 4);
    const otherWars = this.aliveMajors().filter((c) => c !== ai && c !== other && this.atWar(ai, c)).length;
    s += add('حروبها الأخرى', otherWars * 12);
    if (A.goals && A.goals.target && this.node(A.goals.target) && this.node(A.goals.target).owner === other) { s += add(`تطمع في ${this.node(A.goals.target).name}`, -15); why.push(`تريد ${this.node(A.goals.target).name}: المال وحده قد لا يكفي`); }
    const dom = this.dominant();
    if (dom === other) { s += add('تخشى تعاظمك', -25); why.push('تراك الأقوى وتخشى تعاظمك'); }
    else if (dom && dom !== ai) s += add('تخشى المملكة المتعاظمة', 20);
    const money = amount >= 0 ? amount / 8 : amount / 5;
    s += add(amount >= 0 ? `ما تدفعه (${amount})` : `ما تطلبه (${-amount})`, money);
    if (amount < 0 && -amount > Math.max(0, A.gold)) return { ok: false, score: s, parts, why: [`لا تملك ${-amount}: في خزينتها نحو ${Math.max(0, Math.round(A.gold / 50) * 50)}`] };
    const need = 4;
    return { ok: s > need, score: s, need, parts, why, minPay: Math.max(0, Math.ceil((need - (s - money)) * 8)), maxAsk: Math.max(0, Math.floor((s - money - need) * 5)) };
  },
  offerPeace(from, to, amount) {
    const t = this.peaceTerms(to, from, amount);
    if (!t.ok) { this.addRel(from, to, -2); return t; }
    if (amount > 0) { if (this.f(from).gold < amount) return { ok: false, why: ['الذهب لا يكفي'] }; this.f(from).gold -= amount; this.f(to).gold += amount; }
    if (amount < 0) { this.f(to).gold += amount; this.f(from).gold -= amount; }
    this.makePeace(from, to, 8, amount > 0 ? `بعد أن دفعت ${this.fname(from)} ${amount} ذهباً` : amount < 0 ? `ودفعت ${this.fname(to)} ${-amount} ذهباً` : '');
    return t;
  },

  // --- طلب تسليم المدينة: احتمال معلن، رمية واحدة، ومهلة بعد الرفض ---
  surrenderOdds(enc) {
    const { pa, pd } = this.encPower(enc);
    const ratio = pa / Math.max(1, pd);
    const s = this.encSides(enc);
    const parts = [];
    let p = clamp((ratio - 1.8) * 0.35, 0, 0.85);
    parts.push([`ميزان القوة ${ratio.toFixed(1)} إلى 1`, Math.round(p * 100)]);
    if (s.defGens.some((g) => g.trait === 'brave' || g.trait === 'defender')) { p *= 0.5; parts.push(['قائدها شجاع أو صامد', '÷2']); }
    if (enc.kind === 'siege') {
      if (s.node.stores <= 0) { p += 0.3; parts.push(['الجوع داخل الأسوار', 30]); }
      const t = this.siegeTurns(s.node, enc.attFid);
      if (t) { p += t * 0.05; parts.push([`${t} أدوار من الحصار`, t * 5]); }
      if (s.node.capital) { p -= 0.15; parts.push(['عاصمة', -15]); }
    }
    const rep = (this.f(enc.attFid).rep - 50) / 250;
    if (Math.abs(rep) > 0.004) { p += rep; parts.push(['سمعتك', Math.round(rep * 100)]); }
    const V = this.f(enc.defFid);
    if (V && V.vendetta && V.vendetta[enc.attFid] > 0) { p *= 0.3; parts.push(['ثأر بينكما', '×0.3']); }
    return { p: clamp(p, 0, 0.9), parts, ratio, stores: s.node.stores };
  },
  // هل الطلب مغلق مؤقتاً بعد رفض؟ يعود بتغير حقيقي: الجوع، ميزان القوة، سقوط مدينة لهم، أو مرور دورين
  surrenderLock(enc) {
    const n = this.node(enc.node), d = n.demand;
    if (!d || d.by !== enc.attFid) return null;
    const now = this.surrenderOdds(enc);
    const open = this.S.turn >= d.turn + 2 || (d.stores > 0 && now.stores <= 0) || now.ratio >= d.ratio * 1.25 || (this.f(enc.defFid) && (this.f(enc.defFid).lostRecently || 0) > (d.lost || 0) + 0.5);
    if (open) return null;
    return `رفضوا في الدور ${d.turn + 1}. يُعاد الطلب في الدور ${d.turn + 3}، أو قبله إن جاعوا أو زادت قوتك الربع أو سقطت لهم مدينة.`;
  },
  demandSurrender(enc) {
    const lock = this.surrenderLock(enc);
    if (lock) return { ok: false, lock };
    const o = this.surrenderOdds(enc);
    const n = this.node(enc.node);
    const r = rng(hashStr(`${n.id}:${enc.attFid}:${this.S.turn}:surrender`));
    const ok = r() < o.p;
    if (!ok) n.demand = { by: enc.attFid, turn: this.S.turn, ratio: o.ratio, stores: o.stores, lost: (this.f(enc.defFid) || {}).lostRecently || 0 };
    else n.demand = null;
    return { ok, p: o.p };
  },
});
