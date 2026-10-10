'use strict';
// Political decisions share context, saved offer identities and decaying memory.
// Combat and recurring economic formulas remain owned by their existing systems.
const POLITICAL_TRAITS = {
  proud: ['معتز بالسيادة', 'يصعب عليه التنازل المهين، لكنه يوازن بقاء دولته.'],
  pragmatic: ['عملي', 'يفضل اتفاقاً قابلاً للوفاء حين تصبح الحرب مكلفة.'],
  expansionist: ['توسعي', 'يسعى إلى أهداف قريبة يمكنه الاحتفاظ بها.'],
  cautious: ['حذر', 'يتحاشى فتح جبهات وهو مرهق أو مكشوف.'],
  opportunistic: ['انتهازي', 'يستغل ضعف الخصم وانشغاله بجبهات أخرى.'],
  loyal: ['وفي للعهد', 'يعطي الوفاء والنصرة وزناً أكبر.'],
  treacherous: ['مراوغ', 'قد يضحي بالعلاقة عندما تتغير مصلحته.'],
  commercial: ['تجاري', 'يفضل طرق التجارة الآمنة على الحرب المكلفة.'],
};
const POLITICAL_DEFAULTS = {
  umayyad: ['expansionist', 'pragmatic'], byzantine: ['proud', 'cautious', 'commercial'],
  khazar: ['opportunistic', 'commercial'], shu: ['loyal', 'proud'],
  wei: ['expansionist', 'treacherous'], wu: ['cautious', 'commercial'],
};
const politicalCopy = (x) => JSON.parse(JSON.stringify(x));
const politicalCurve = (x, width = 18) => clamp(1 / (1 + Math.exp(-x / width)), 0.02, 0.98);

Object.assign(Game, {
  politicalState() {
    const p = this.S.politics || (this.S.politics = {});
    p.version = 1; p.memory ||= {}; p.waits ||= {}; p.counters ||= {}; p.peaces ||= [];
    p.aiTurns ||= {}; p.treaties ||= {}; p.offers ||= {}; p.serial ||= 0;
    return p;
  },
  politicalProfile(fid) {
    const f = this.f(fid), p = this.pers(fid);
    const names = (f.politicalTraits || POLITICAL_DEFAULTS[fid] || [p.aggr > 1.15 ? 'expansionist' : 'cautious', p.honor >= 1.1 ? 'loyal' : p.honor < .85 ? 'treacherous' : 'pragmatic']).filter(k => POLITICAL_TRAITS[k]);
    const has = (k) => names.includes(k) ? 1 : 0;
    return { names, labels: names.map(k => POLITICAL_TRAITS[k][0]), explanations: names.map(k => POLITICAL_TRAITS[k][1]),
      pride: .25 + .65 * has('proud'), pragmatism: .3 + .65 * has('pragmatic'),
      expansion: clamp((p.aggr - .7) + .35 * has('expansionist'), 0, 1), caution: .2 + .7 * has('cautious'),
      opportunity: .15 + .75 * has('opportunistic'), loyalty: clamp((p.honor - .65) + .5 * has('loyal'), 0, 1),
      deceit: .1 + .8 * has('treacherous'), commerce: .15 + .75 * has('commercial') };
  },
  rememberDiplomacy(observer, actor, kind, value, label, key) {
    if (!this.f(observer) || !this.f(actor) || observer === actor || !Number.isFinite(value)) return false;
    const p = this.politicalState(), by = p.memory[observer] ||= {}, list = by[actor] ||= [];
    const id = key || `${kind}:${this.S.turn}`;
    if (list.some(e => e.id === id)) return false;
    // Repeated acts of the same kind do not stack indefinitely, even across turns.
    list.push({ id, kind, value: clamp(value, -30, 20), label, turn: this.S.turn });
    if (list.length > 64) list.splice(0, list.length - 64);
    return true;
  },
  diplomaticMemory(observer, actor) {
    const list = this.S.politics?.memory?.[observer]?.[actor] || [];
    const entries = list.map(e => ({ ...e, weight: e.value * Math.pow(.5, Math.max(0, this.S.turn - e.turn) / 24) })).filter(e => Math.abs(e.weight) >= .5);
    const kinds = {};
    for (const e of entries) kinds[e.kind] = clamp((kinds[e.kind] || 0) + e.weight, -35, 20);
    return { score: clamp(Object.values(kinds).reduce((a, b) => a + b, 0), -60, 40), entries };
  },
  politicalWait(a, b, kind) { return Math.max(0, (this.S.politics?.waits?.[`${a}|${b}|${kind}`] ?? -1) - this.S.turn); },
  diplomaticWait(a, b) { return this.politicalWait(a, b, 'envoy'); },
  holdDiplomacy(a, b, kind, turns = 3) { this.politicalState().waits[`${a}|${b}|${kind}`] = this.S.turn + turns; },
  politicalRoll(a, b, kind) { return rng(hashStr(`${this.S.leaders?.seed ?? this.S.scenario}:${a}:${b}:${this.S.turn}:${kind}:politics`))(); },
  politicalDistance(a, b) {
    const targets = new Set(this.nodesOf(b).map(n => n.id)), seen = new Set(this.nodesOf(a).map(n => n.id));
    let layer = [...seen];
    for (let d = 0; d <= 12 && layer.length; d++) {
      if (layer.some(id => targets.has(id))) return d;
      const next = [];
      for (const id of layer) for (const e of this.edgesOf(id)) if (!seen.has(e.to)) { seen.add(e.to); next.push(e.to); }
      layer = next;
    }
    return null;
  },
  politicalContext(a, b) {
    const A = this.f(a), B = this.f(b), profile = this.politicalProfile(a);
    const pa = this.factionPower(a), pb = this.factionPower(b);
    const fronts = this.aliveMajors().filter(c => c !== a && this.atWar(a, c));
    const enemyFronts = this.aliveMajors().filter(c => c !== b && this.atWar(b, c));
    const distance = this.politicalDistance(a, b), strain = this.warStrain(a, b);
    const allies = this.alliesOf(b).filter(c => c !== a).reduce((s, c) => s + this.factionPower(c) * .35, 0);
    return { A, B, profile, pa, pb, ratio: pa / Math.max(1, pb), defendedRatio: pa / Math.max(1, pb + allies),
      fronts, enemyFronts, distance, strain, memory: this.diplomaticMemory(a, b).score, common: this.commonEnemy(a, b) };
  },
  politicalAssessment(a, b, kind) {
    const c = this.politicalContext(a, b), p = c.profile, parts = [];
    const add = (label, v) => { if (Math.abs(v) >= .5) parts.push([label, Math.round(v * 10) / 10]); };
    let blocked = null;
    if (a === b || !c.A.alive || !c.B.alive) blocked = 'الطرفان غير متاحين';
    if (kind !== 'war' && this.atWar(a, b)) blocked = 'تحتاج الصلح أولاً';
    add('العلاقة الحالية', this.rel(a, b) * (kind === 'war' ? -.35 : .4));
    add('ذاكرة التعامل السابق', c.memory * (kind === 'war' ? -.4 : .45));
    if (kind === 'war') {
      if (c.A.overlord) blocked = 'قرار الحرب الخارجية للمتبوع؛ الاستقلال له إجراء مستقل';
      if (c.B.overlord === a) blocked = 'هذه المملكة تابعة لك';
      if ((c.A.truce[b] || 0) > 0) blocked = 'عهد قائم';
      if (this.status(a, b) === 'alliance') blocked = 'حلف قائم';
      if (this.atWar(a, b)) blocked = 'الحرب قائمة بالفعل';
      if (c.distance == null || c.distance > 4) blocked = 'لا جبهة يمكن الوصول إليها بحملة معقولة';
      add('كلفة بدء حرب جديدة', -35);
      add('ميزان القوة وحلفاء الخصم', clamp(Math.log(Math.max(.05, c.defendedRatio)) * 28, -70, 45));
      add('قدرة الجيوش على حملة', (c.strain.readiness - 75) * .45);
      add('تعدد الجبهات', -c.fronts.length * (16 + p.caution * 12));
      add('نفقات الحملة واحتياطي الخزينة', clamp((c.strain.reserve - 2) * 4, -22, 8) + (c.strain.balance < 0 ? -10 : 0));
      add('الطموح والحذر', p.expansion * 20 - p.caution * 12);
      add('انشغال الخصم', c.enemyFronts.filter(x => x !== a).length * (5 + p.opportunity * 10));
      add('هدف إقليمي محدد', c.A.goals?.owner === b ? 20 : 0);
      add('أرض تطالب باستعادتها', c.A.claims.some(id => this.node(id)?.owner === b) ? 12 : 0);
      add('ثأر لا يلغي ميزان القوة', (c.A.vendetta?.[b] || 0) > 0 ? 12 : 0);
      add('التجارة والمصاهرة', (this.treaty(a, b).trade ? -12 * p.commerce : 0) + (this.treaty(a, b).marriage ? -20 * p.loyalty : 0));
      add('عدو مشترك أولى بالقتال', c.common ? -25 : 0);
    } else if (kind === 'alliance') {
      if (c.A.overlord || c.B.overlord || c.A.kind === 'horde' || c.B.kind === 'horde') blocked = 'استقلال القرار مطلوب لعقد الحلف';
      if (this.status(a, b) === 'alliance') blocked = 'الحلف قائم بالفعل';
      add('التزام الحلف يحتاج مصلحة', -24);
      add('عدو مشترك', c.common ? 34 : 0);
      add('القدرة على النصرة', c.distance != null && c.distance <= 5 ? 12 : -18);
      add('سمعة الشريك', (c.B.rep - 50) * .25);
      add('طبع الوفاء والحذر', p.loyalty * 10 + p.caution * 4 - p.deceit * 8);
      const dom = this.dominant();
      add('مواجهة قوة مهيمنة', dom && dom !== a && dom !== b ? 14 : dom === b ? -14 : 0);
    } else if (kind === 'trade') {
      add('منفعة التجارة وطبع الحكم', 15 + p.commerce * 18);
      add('وصول الطرق', c.distance != null && c.distance <= 8 ? 8 : -15);
      add('خطر الغدر', c.memory < -15 ? -15 : 0);
    } else if (kind === 'marriage') {
      add('ثقل الارتباط الأسري', -12 + p.loyalty * 12);
      add('سمعة البيت الآخر', (c.B.rep - 50) * .3);
      if (this.treaty(a, b).marriage) blocked = 'المصاهرة قائمة';
    } else if (kind === 'tribute') {
      // a receives a demand from b. This is not an immediate payment.
      add('تهديد القوة القريبة', clamp(Math.log(Math.max(.05, 1 / c.ratio)) * 44, -70, 65));
      add('الجغرافيا', c.distance != null && c.distance <= 3 ? 10 : -45);
      add('السيادة والبراغماتية', -26 - p.pride * 16 + p.pragmatism * 10);
      add('استنزاف وجبهات أخرى', c.fronts.length * 10 + c.strain.attrition * 24);
      if (this.S.tributes.some(t => t.payer === a) || c.A.overlord) blocked = 'هناك التزام جزية قائم بالفعل';
    }
    const score = parts.reduce((s, x) => s + x[1], 0), probability = blocked ? 0 : politicalCurve(score);
    return { p: probability, band: oddsBand(probability), parts, score, blocked, why: blocked || [...parts].sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 3).map(x => x[0]).join('، ') };
  },
  aiWillAlly(a, b) { return this.politicalRoll(a, b, 'alliance') < this.politicalAssessment(a, b, 'alliance').p; },
  aiWillTrade(a, b) { return this.politicalRoll(a, b, 'trade') < this.politicalAssessment(a, b, 'trade').p; },
  aiWillMarry(a, b) { return this.politicalRoll(a, b, 'marriage') < this.politicalAssessment(a, b, 'marriage').p; },
  aiWillPayTribute(a, b) { return this.politicalRoll(a, b, 'tribute') < this.politicalAssessment(a, b, 'tribute').p; },
  requestDiplomacy(a, b, kind) {
    if (!['alliance', 'trade', 'marriage', 'tribute'].includes(kind)) return { err: 'عرض غير معروف' };
    const wait = this.diplomaticWait(a, b);
    if (wait) return { err: `انتظر ${wait} أدوار قبل إرسال عرض آخر` };
    const c = this.politicalAssessment(b, a, kind);
    if (c.blocked) return { err: c.blocked };
    if (kind === 'trade' && this.treaty(a, b).trade) return { err: 'اتفاق التجارة قائم' };
    if (kind === 'marriage' && this.f(a).gold < this.marriageCost()) return { err: 'الذهب لا يكفي' };
    this.holdDiplomacy(a, b, 'envoy', 3);
    const ok = this.politicalRoll(b, a, kind) < c.p;
    if (ok) {
      const result = kind === 'alliance' ? this.makeAlliance(a, b) : kind === 'trade' ? this.setTrade(a, b, true) : kind === 'marriage' ? this.marry(a, b) : this.addTribute(b, a, this.tributeAmount(b), 8);
      if (result?.err) { this.save(); return result; }
    } else this.addRel(a, b, kind === 'tribute' ? -5 : -1);
    this.save(); return { ok, assessment: c, why: ok ? 'قُبل العرض' : 'رُفض العرض: ' + c.why };
  },
  giveDiplomaticGift(a, b, amount = 100) {
    if (!Number.isFinite(amount) || amount < 1 || this.f(a).gold < amount || this.atWar(a, b)) return { err: 'الهدية غير متاحة' };
    if (this.politicalWait(a, b, 'gift')) return { err: 'تذكر الهدية السابقة؛ انتظر أربعة أدوار' };
    this.holdDiplomacy(a, b, 'gift', 4);
    this.f(a).gold -= amount; this.f(b).gold += amount;
    this.recordFinance?.(a, -amount, 'diplomacy', 'هدية إلى ' + this.fname(b));
    this.recordFinance?.(b, amount, 'diplomacy', 'هدية من ' + this.fname(a));
    this.addRel(a, b, Math.min(10, amount / 12) * (1 - Math.max(0, this.rel(a, b)) / 120));
    this.rememberDiplomacy(b, a, 'gift', 3, 'قدّم هدية للبلاط'); this.save(); return { ok: true };
  },
  subsidy(a, b, amount = 150) {
    if (!Number.isFinite(amount) || amount <= 0 || this.f(a).gold < amount || this.status(a, b) !== 'alliance') return { err: 'التمويل يحتاج حليفاً ومالاً كافياً' };
    if (this.politicalWait(a, b, 'subsidy')) return { err: 'وصل التمويل السابق؛ انتظر ثلاثة أدوار' };
    this.holdDiplomacy(a, b, 'subsidy', 3);
    this.f(a).gold -= amount; this.f(b).gold += amount;
    for (const [fid, delta] of [[a, -amount], [b, amount]]) this.recordFinance?.(fid, delta, 'diplomacy', 'تمويل الحليف');
    this.addRel(a, b, 6); this.rememberDiplomacy(b, a, 'funded', 5, 'موّل جيوش حليفه');
    this.event('pol', `${this.fname(a)} موّلت ${this.fname(b)} بـ${amount} ذهباً.`, { fids: [a, b], imp: 1 });
    this.save(); return { ok: true, amount };
  },
  vassalAssessment(t, by) {
    const c = this.politicalContext(t, by), p = c.profile, parts = [], T = c.A;
    let blocked = null;
    if (t === by || !T.alive || !c.B.alive || T.kind === 'horde') blocked = 'هذه المملكة لا تقبل التبعية';
    if (T.overlord || c.B.overlord || this.vassalsOf(t).length) blocked = 'عقد تبعية آخر يمنع هذا الاتفاق';
    const add = (label, v) => parts.push([label, Math.round(v)]);
    add('فقدان استقلال السياسة الخارجية', -38 - p.pride * 16);
    add('ميزان القوة', clamp(Math.log(Math.max(.05, 1 / c.ratio)) * 52, -70, 95));
    add('بعد الحماية أو التهديد', c.distance != null && c.distance <= 4 ? 8 : -40);
    add('الحلفاء المتاحون للدفاع', -Math.min(24, this.alliesOf(t).filter(f => f !== by).reduce((s, f) => s + this.factionPower(f), 0) / Math.max(1, c.pa) * 10));
    add('خسائر الحرب والإرهاق', c.strain.attrition * 30 + Math.max(0, 65 - c.strain.readiness) * .25);
    add('حصار المدن وخطر زوال الدولة', this.nodesOf(t).filter(n => this.besieger(n.id)).length * 10 + (T.lostRecently || 0) * 8);
    add('الحاجة إلى الحماية', c.fronts.filter(f => f !== by).length * 10 + (c.strain.balance < 0 ? 8 : 0));
    add('عملية الحكم والثقة', p.pragmatism * 10 + this.rel(t, by) * .12 + c.memory * .2);
    add('الثأر', (T.vendetta?.[by] || 0) > 0 ? -16 : 0);
    const score = parts.reduce((s, x) => s + x[1], 0), probability = blocked ? 0 : politicalCurve(score, 16);
    return { p: probability, band: oddsBand(probability), parts, blocked, due: this.vassalDue ? this.vassalDue(t) : Math.round(this.economy(t).gold * .15), why: blocked || parts.filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).join('، ') };
  },
  demandVassal(by, t) {
    const c = this.vassalAssessment(t, by);
    if (c.blocked) return { why: c.blocked, err: c.blocked };
    if (this.politicalWait(by, t, 'vassal')) return { why: 'انتظر ثلاثة أدوار لإعادة طلب التبعية', err: 'طلب حديث' };
    this.holdDiplomacy(by, t, 'vassal', 3);
    const ok = this.politicalRoll(t, by, 'vassal') < c.p;
    if (ok) this.makeVassal(t, by); else this.addRel(by, t, -3);
    this.save(); return { ok, assessment: c, why: ok ? 'قبلت التبعية لقاء الحماية' : 'ترفض فقدان السيادة الآن: ' + c.why };
  },
  registerPoliticalOffer(from, to, kind, terms = {}) {
    const p = this.politicalState(), id = `envoy:${this.S.turn}:${++p.serial}`;
    const offer = { id, from, to, kind, terms: politicalCopy(terms), turn: this.S.turn, until: this.S.turn + 1,
      status: this.status(from, to), warSince: this.warRec(from, to)?.since ?? null, warId: this.warRec(from,to)?.politicalId ?? null, cityOwner: terms.city ? this.node(terms.city)?.owner : null, resolved: false };
    p.offers[id] = offer; this.save(); return offer;
  },
  resolvePoliticalOffer(id, accept) {
    const o = this.politicalState().offers[id];
    if (!o || o.resolved || o.until < this.S.turn || !this.f(o.from)?.alive || !this.f(o.to)?.alive || this.status(o.from, o.to) !== o.status || (o.terms.city && o.cityOwner !== this.node(o.terms.city)?.owner) || (o.kind === 'peace' && o.warId !== (this.warRec(o.from, o.to)?.politicalId ?? null))) return { err: 'العرض منقضٍ أو لم يعد صالحاً' };
    let result;
    if (accept) {
      if (o.kind === 'peace') result = this.settlePeace(o.from, o.to, o.terms);
      else if (o.kind === 'alliance') result = this.makeAlliance(o.from, o.to);
      else if (o.kind === 'trade') result = this.setTrade(o.from, o.to, true);
      else if (o.kind === 'marriage') result = this.marry(o.from, o.to);
      else if (o.kind === 'tribute') result = this.addTribute(o.to, o.from, o.terms.amount, 8);
      else if (o.kind === 'vassal') result = this.makeVassal(o.to, o.from);
      else return { err: 'نوع عرض غير معروف' };
      if (result?.err) return result;
    }
    o.resolved = true; o.accepted = !!accept; o.resolvedTurn = this.S.turn;
    this.save(); return { ok: true, accepted: !!accept };
  },
  async presentPoliticalOffer(from, to, kind, terms = {}) {
    const o = this.registerPoliticalOffer(from, to, kind, terms);
    const accepted = await this.hooks.proposal?.({ from, kind, offerId: o.id, offer: kind === 'peace' ? terms : undefined, amount: terms.amount });
    if (!o.resolved) this.resolvePoliticalOffer(o.id, !!accepted);
    return o.accepted;
  },
});

{
  const oldUrge = Game.peaceUrge;
  Game.peaceUrge = function (x, y) {
    const old = oldUrge.call(this, x, y), p = this.politicalProfile(x), wt = this.f(x).warTurns[y] || 0;
    const parts = old.parts.filter(([k]) => !k.startsWith('الحرب بدأت') && !k.includes('تهيمن على الجميع') && k !== 'طبع الحكم');
    if (wt < 3) parts.push(['لم تنضج أهداف الحملة بعد', -12 * (3 - wt) / 3]);
    parts.push(['طبع الحكم: السيادة والمصلحة', p.pragmatism * 8 + p.commerce * 3 - p.pride * 7 - p.expansion * 4]);
    const trust = this.diplomaticMemory(x, y).score;
    if (trust) parts.push(['الثقة في دوام الاتفاق', trust * .22]);
    if ((this.f(x).vendetta?.[y] || 0) > 0) parts.push(['ثأر القائد يجعل التسوية أصعب', -18]);
    const ratio = this.factionPower(y) / Math.max(1, this.factionPower(x));
    if (ratio > 1.4) parts.push(['حفظ الدولة أمام قوة متفوقة', Math.min(28, Math.log(ratio / 1.4) * 22)]);
    const prisoners = this.captivesHeldBy(y).filter(g => g.fid === x);
    if (prisoners.length) parts.push(['قادة أسرى لدى الخصم', Math.min(10, prisoners.length * 3)]);
    return { parts, v: parts.reduce((s, q) => s + q[1], 0) };
  };
  const oldTermsValue = Game.termsValue;
  Game.termsValue = function (x, y, t) {
    let v = oldTermsValue.call(this, x, y, t);
    const p = this.politicalProfile(x);
    if (t.city && this.node(t.city)?.owner === x) v -= p.pride * 8;
    if ((t.truce || 8) > 8) v += ((t.truce || 8) - 8) * (.4 + p.caution - p.expansion * .5);
    return v;
  };
  const oldValidation = Game.validatePeaceTerms;
  Game.validatePeaceTerms = function (a, b, t) {
    if (a === b || !this.f(a)?.alive || !this.f(b)?.alive) return 'أطراف الاتفاق غير متاحة';
    if (!t || ['gold', 'perTurn', 'turns'].some(k => t[k] != null && (!Number.isSafeInteger(t[k]) || t[k] < 0 || t[k] > 1000000000))) return 'قيم الاتفاق غير صالحة';
    if (((t.gold || 0) + (t.perTurn || 0)) > 0 && ![a, b].includes(t.payer)) return 'حدّد الطرف الدافع';
    if (t.truce != null && (!Number.isInteger(t.truce) || t.truce < 4 || t.truce > 20)) return 'الهدنة بين 4 و20 دوراً';
    if (t.city && this.node(t.city) && this.nodesOf(this.node(t.city).owner).length < 2) return 'لا يمكن التنازل عن آخر مدينة؛ تفاوض على التبعية أو المال';
    if (!Array.isArray(t.captives || []) || new Set(t.captives || []).size !== (t.captives || []).length) return 'قائمة الأسرى غير صالحة';
    if ((t.captives || []).some(id => { const g = this.gen(id); return g && g.fid === g.captor; })) return 'الأسير ليس لدى الطرف الآخر';
    if (t.vassal && (![a, b].includes(t.vassal) || t.city || t.perTurn || this.vassalAssessment(t.vassal, t.vassal === a ? b : a).blocked)) return 'شروط التبعية لا يمكن جمعها مع هذه التنازلات';
    return oldValidation.call(this, a, b, t);
  };
  Game.peaceChance = function (x, y, t) {
    const err = this.validatePeaceTerms(y, x, t);
    const ws = this.warScore(x, y), urge = this.peaceUrge(x, y);
    if (err) return { p: 0, band: oddsBand(0), why: err, ws, urge, val: 0 };
    const val = this.termsValue(x, y, t);
    let p = clamp(1 / (1 + Math.exp(-(val + urge.v - ws.score * .8) / 12)), .01, .97);
    if (t.vassal === x) p = Math.min(p, this.vassalAssessment(x, y).p);
    // Becoming overlord only has value when the prospective subject could plausibly consent.
    if (t.vassal === y) p = Math.max(p, this.vassalAssessment(y, x).p * .9);
    return { p, band: oddsBand(p), ws, urge, val };
  };
  Game.aiWillAcceptPeace = function (a, b, gold = 0) { return this.politicalRoll(b, a, 'peace') < this.peaceChance(a, b, { payer: b, gold }).p; };
  Game.peaceCounter = function (a, b, original = {}) {
    // Counteroffer by b. Preserve legitimate original concessions; never demand unavailable gold.
    const t = { payer: null, gold: 0, perTurn: 0, turns: 0, truce: 10, captives: [...(original.captives || [])], city: original.city || null };
    const fair = this.peaceFair(b, a, .68, t), payer = fair >= 0 ? a : b;
    let need = Math.abs(fair); t.payer = need >= 10 ? payer : null;
    const cash = Math.max(0, Math.floor(this.f(payer).gold));
    t.gold = Math.min(Math.round(need), Math.floor(cash * .65)); need -= t.gold;
    if (need > 10) { t.turns = 6; t.perTurn = Math.min(Math.floor(Math.max(20, this.economy(payer).income * .3)), Math.ceil(need / 6)); }
    if (this.peaceChance(b, a, t).p < .5) {
      const captive = this.captivesHeldBy(a).filter(g => g.fid === b && !t.captives.includes(g.id)).sort((x, y) => y.rank - x.rank)[0];
      if (captive) t.captives.push(captive.id);
    }
    if (this.peaceChance(b, a, t).p < .4 && !t.city) {
      const city = this.nodesOf(a).filter(n => !n.capital && (this.besiegers(n.id).some(s => s.fid === b) || this.f(b).claims.includes(n.id))).sort((x, y) => x.pop - y.pop)[0];
      if (city && this.warScore(b, a).score > 15 && this.nodesOf(a).length > 1) t.city = city.id;
    }
    if (original.vassal && !this.vassalAssessment(original.vassal,original.vassal===a?b:a).blocked) { t.vassal=original.vassal;t.city=null;t.perTurn=0;t.turns=0; }
    else if (this.peaceChance(b,a,t).p<.35 && this.vassalAssessment(a,b).p>.75) { t.vassal=a;t.city=null;t.perTurn=0;t.turns=0; }
    if (this.validatePeaceTerms(a, b, t) || this.peaceChance(b, a, t).p < .35) return null;
    const p = this.politicalState(); t.id = `${this.warKey(a, b)}:${this.S.turn}:${++p.serial}`;
    t.from = b; t.to = a; t.until = this.S.turn; t.warSince = this.warRec(a, b)?.since; t.warId=this.warRec(a,b)?.politicalId;
    if (t.city) t.cityOwner = this.node(t.city).owner;
    p.counters[t.id] = politicalCopy(t); return t;
  };
  Game.proposePeaceTerms = function (a, b, t) {
    if (!this.atWar(a, b)) return { err: 'لستما في حرب' };
    const err = this.validatePeaceTerms(a, b, t);
    if (err) return { err };
    if (this.envoyWait(a, b)) return { err: 'رسول واحد لكل طرف في الدور؛ انتظر الدور التالي' };
    const terms = politicalCopy(t), c = this.peaceChance(b, a, terms);
    this.f(a).envoy ||= {}; this.f(a).envoy[b] = this.S.turn;
    const ok = this.politicalRoll(a, b, 'peace') < c.p;
    if (ok) { const r = this.settlePeace(a, b, terms); if (r?.err) return r; this.save(); return { ok, c }; }
    const counter = this.peaceCounter(a, b, terms);
    this.addRel(a, b, -1); this.save(); return { ok, c, counter };
  };
  Game.acceptCounter = function (a, b, counter) {
    const saved = counter?.id && this.politicalState().counters[counter.id];
    if (!saved || saved.to !== a || saved.from !== b || saved.until !== this.S.turn || saved.warId !== this.warRec(a, b)?.politicalId || (saved.city && saved.cityOwner !== this.node(saved.city)?.owner) || JSON.stringify(counter) !== JSON.stringify(saved)) return { err: 'العرض المضاد منقضٍ أو تغيرت شروطه' };
    return this.settlePeace(a, b, politicalCopy(saved));
  };
  Game.settlePeace = function (a, b, t) {
    if (!this.atWar(a, b)) return { err: 'انتهت الحرب؛ لا يمكن تطبيق الاتفاق مرتين' };
    const err = this.validatePeaceTerms(a, b, t); if (err) return { err };
    const terms = politicalCopy(t), payer = t.payer, payee = payer === a ? b : a;
    const ws = this.warScore(a, b).score, war = this.warRec(a, b), key = war?.politicalId || `${this.warKey(a, b)}:${war?.since ?? this.S.turn}`;
    if (payer && t.gold) {
      this.f(payer).gold -= t.gold; this.f(payee).gold += t.gold;
      this.recordFinance?.(payer, -t.gold, 'diplomacy', 'تسوية الصلح'); this.recordFinance?.(payee, t.gold, 'diplomacy', 'تسوية الصلح');
    }
    if (payer && t.perTurn) this.addTribute(payer, payee, t.perTurn, t.turns);
    if (t.city) this.cedeCity(t.city, this.node(t.city).owner === a ? b : a);
    for (const id of t.captives || []) { const g = this.gen(id); this.releaseCaptive(g, g.captor); }
    this.makePeace(a, b, t.truce || 8, t.gold ? `(تسوية ${t.gold} ذهباً)` : '');
    if (t.vassal) this.makeVassal(t.vassal, t.vassal === a ? b : a);
    this.politicalState().peaces.push({ a, b, turn: this.S.turn, warSince: war?.since, terms });
    if (this.S.politics.peaces.length > 40) this.S.politics.peaces.shift();
    for (const [winner, loser, advantage] of [[a, b, ws], [b, a, -ws]]) {
      const humiliating = t.vassal === loser || (t.city && this.node(t.city).owner === winner) || (payer === loser && (t.gold || 0) + (t.perTurn || 0) * (t.turns || 0) > this.economy(loser).income * 3);
      this.rememberDiplomacy(loser, winner, humiliating ? 'humiliation' : 'peace', humiliating ? -12 : advantage > 15 ? 10 : 4, humiliating ? 'فرض صلحاً مثقلاً بالتنازلات' : advantage > 15 ? 'قبل صلحاً معتدلاً وهو متفوق' : 'عقد صلحاً متبادلاً', key + ':' + loser);
    }
    for (const id of Object.keys(this.politicalState().counters)) { const c = this.S.politics.counters[id]; if ([a, b].includes(c.from) && [a, b].includes(c.to)) delete this.S.politics.counters[id]; }
    this.resolveAlliedPeace?.(a, b, terms);
    this.save(); return { ok: true };
  };
  Game.aiPeaceOffer = function (x, y) {
    const fair = this.peaceFair(x, y, .45), payer = fair > 0 ? y : x;
    const cash = Math.max(0, Math.floor(this.f(payer).gold)), total = Math.abs(fair);
    const gold = Math.min(total, Math.floor(cash * .65)), remainder = total - gold;
    const t = { payer: total >= 10 ? payer : null, gold: total >= 10 ? gold : 0, perTurn: remainder > 10 ? Math.min(Math.ceil(remainder / 6), Math.floor(Math.max(20, this.economy(payer).income * .3))) : 0, turns: remainder > 10 ? 6 : 0, truce: 10, captives: [], from: x };
    // A losing state values survival more than extracting its theoretical price.
    if (this.warScore(x, y).score < -15 && this.peaceChance(y, x, t).p < .2) { t.payer = x; t.gold = Math.floor(Math.max(0, this.f(x).gold) * .5); t.perTurn = 0; t.turns = 0; t.captives = this.captivesHeldBy(x).filter(g => g.fid === y).map(g => g.id); }
    return t;
  };
}

// Idempotent treaty operations also guard legacy UI/world entry points.
{
  const warRec = Game.warRec;
  Game.warRec = function (a,b,create) { const w=warRec.call(this,a,b,create);if(w&&!w.politicalId)w.politicalId=`war:${this.warKey(a,b)}:${w.since}:${++this.politicalState().serial}`;return w; };
  const peace = Game.makePeace, alliance = Game.makeAlliance, breakAlliance = Game.breakAlliance, trade = Game.setTrade, marry = Game.marry, war = Game.declareWar, vassal = Game.makeVassal, tribute = Game.addTribute;
  Game.addTribute = function (payer, payee, amount, turns = 8) {
    if (payer === payee || !this.f(payer)?.alive || !this.f(payee)?.alive || !Number.isSafeInteger(amount) || amount <= 0 || amount > Math.max(20, this.economy(payer).income * .55) || !Number.isInteger(turns) || turns < 1 || turns > 12) return { err: 'جزية غير صالحة أو تتجاوز القدرة على الوفاء' };
    if (this.f(payer).overlord === payee || this.f(payee).overlord === payer) return { err: 'التزامات التبعية تحل محل الجزية الثنائية' };
    if (this.S.tributes.some(t => t.payer === payer && t.payee === payee)) return { err: 'الجزية قائمة؛ لا تُجدّد أو تُدفع مرتين' };
    const r = tribute.call(this, payer, payee, amount, turns), t = this.S.tributes.at(-1);
    t.since = this.S.turn; t.id = `tribute:${payer}:${payee}:${this.S.turn}`; return r;
  };
  Game.makePeace = function (a, b, ...args) { if (!this.atWar(a, b)) return { err: 'الصلح قائم' }; const r = peace.call(this, a, b, ...args); this.politicalState().treaties[this.warKey(a, b)] = { since: this.S.turn, until: this.S.turn + (args[0] || 8), a, b }; return r; };
  Game.makeAlliance = function (a, b) {
    if (a === b || this.status(a, b) !== 'peace' || this.f(a).overlord || this.f(b).overlord || this.politicalWait(a, b, 'brokenAlliance') || this.politicalWait(b, a, 'brokenAlliance')) return { err: 'الحلف غير متاح الآن' };
    return alliance.call(this, a, b);
  };
  Game.breakAlliance = function (a, b, why) {
    if (this.status(a, b) !== 'alliance') return { err: 'لا حلف قائم' };
    const result = breakAlliance.call(this, a, b, why);
    this.holdDiplomacy(a, b, 'brokenAlliance', 8);
    this.rememberDiplomacy(b, a, 'abandoned', -18, why || 'تخلّى عن الحلف', `break:${this.S.turn}`); return result;
  };
  Game.setTrade = function (a, b, on) {
    if (this.treaty(a, b).trade === on) return { err: 'الاتفاق بهذه الحالة بالفعل' };
    if (this.atWar(a, b) || this.politicalWait(a, b, 'tradeChange') || this.politicalWait(b, a, 'tradeChange')) return { err: 'انتظر أربعة أدوار قبل تغيير اتفاق التجارة' };
    this.holdDiplomacy(a, b, 'tradeChange', 4); return trade.call(this, a, b, on);
  };
  Game.marry = function (a, b) {
    if (this.atWar(a, b) || this.treaty(a, b).marriage || this.f(a).gold < this.marriageCost()) return { err: 'المصاهرة غير متاحة' };
    const before = this.f(a).gold, result = marry.call(this, a, b);
    this.recordFinance?.(a, this.f(a).gold - before, 'diplomacy', 'مصاهرة سياسية'); return result;
  };
  Game.declareWar = function (a, b, why) {
    if (a === b || this.atWar(a, b) || !this.f(a)?.alive || !this.f(b)?.alive) return { err: 'الحرب غير متاحة' };
    if (this.f(a).overlord && b !== this.f(a).overlord) return { err: 'لا يعلن التابع حرباً مستقلة' };
    if (this.f(b).overlord === a) return { err: 'المملكة تابعة لك' };
    const betrayal = (this.f(a).truce[b] || 0) > 0 || this.status(a, b) === 'alliance' || this.treaty(a, b).marriage;
    const pact = this.politicalState().treaties[this.warKey(a, b)]; if (pact) pact.broken = true;
    const oldCall = this.f(a).allyCall;
    const r = war.call(this, a, b, why);
    this.rememberDiplomacy(b, a, betrayal ? 'betrayal' : 'war', betrayal ? -28 : -8, betrayal ? 'نقض العهد وبدأ الحرب' : 'بدأ حرباً علينا');
    if (betrayal) for (const c of this.aliveMajors()) if (c !== a && c !== b) this.rememberDiplomacy(c, a, 'betrayal', -8, 'شهد نقضه عهداً مع مملكة أخرى');
    if (oldCall?.enemy === b) this.rememberDiplomacy(oldCall.ally, a, 'answered', 6, 'لبّى النداء ودخل الحرب');
    return r;
  };
  Game.makeVassal = function (t, by) {
    if (t === by || this.f(t)?.overlord || this.f(by)?.overlord || this.vassalsOf(t).length || !this.f(t)?.alive || !this.f(by)?.alive) return { err: 'التبعية غير متاحة أو تنشئ سلسلة متعارضة' };
    const result = vassal.call(this, t, by);
    this.f(t).vassalSince = this.S.turn;
    this.S.tributes = this.S.tributes.filter(x => !([t, by].includes(x.payer) && [t, by].includes(x.payee)));
    this.rememberDiplomacy(t, by, 'protection', 5, 'قبل حمايتنا مع بقاء الإدارة المحلية'); this.save(); return result;
  };
  const relParts = Game.relParts;
  Game.relParts = function (a, b) { const p = relParts.call(this, a, b), m = this.diplomaticMemory(a, b); if (Math.abs(m.score) >= 1) p.push(['ذاكرة المعاهدات والتعامل', Math.round(m.score)]); return p; };
  const release = Game.releaseCaptive, ransom = Game.ransomCaptive, execute = Game.executeCaptive;
  Game.releaseCaptive = function (g, by) { const fid = g?.fid, was = g?.status === 'captive' && g.captor === by; const r = release.call(this, g, by); if (was && !r) this.rememberDiplomacy(fid, by, 'prisoners', 8, `أطلق القائد ${g.name}`, `release:${g.id}:${g.since}`); return r; };
  Game.ransomCaptive = function (g, by, price) { const fid = g?.fid; const r = ransom.call(this, g, by, price); if (!r) { this.rememberDiplomacy(fid, by, 'prisoners', 3, `احترم فدية ${g.name}`, `ransom:${g.id}:${g.since}`); this.recordFinance?.(fid, -price, 'diplomacy', 'فدية قائد'); this.recordFinance?.(by, price, 'diplomacy', 'فدية قائد'); } return r; };
  Game.executeCaptive = function (g, by) { const fid = g?.fid, r = execute.call(this, g, by); if (!r) this.rememberDiplomacy(fid, by, 'executed', -25, `أعدم القائد ${g.name}`, `execute:${g.id}`); return r; };
  const normalize = Game.normalizeState;
  Game.normalizeState = function () {
    const r = normalize.apply(this, arguments); this.politicalState();
    for(const w of Object.values(this.S.wars||{}))this.warRec(w.a,w.b);
    for(const o of Object.values(this.S.politics.offers))if(o.kind==='peace'&&!o.warId){const w=this.warRec(o.from,o.to);o.warId=w?.ended==null&&o.warSince===w?.since?w.politicalId:'expired';}
    for(const o of Object.values(this.S.politics.counters))if(!o.warId){const w=this.warRec(o.from,o.to);o.warId=w?.ended==null&&o.warSince===w?.since?w.politicalId:'expired';}
    this.S.tributes = this.S.tributes.filter(t => this.f(t.payer)?.alive && this.f(t.payee)?.alive).map(t => ({ ...t, turns: Number.isFinite(t.turns) ? t.turns : Number.isFinite(t.t) ? t.t : 8 }));
    for (const n of this.S.nodes) if (n.parley === true || n.demanded === true) { delete n.demanded; n.parley = this.S.turn; n.parleyBy ||= {}; for (const a of this.besiegers(n.id)) n.parleyBy[a.fid] = this.S.turn + 2; }
    return r;
  };
  const surrender = Game.surrenderOdds;
  Game.surrenderOdds = function (n, fid) {
    const o = surrender.call(this, n, fid), rd = this.garrisonReady(n);
    const add = (k, v) => { if (Math.abs(v) >= .005) { o.factors.push([k, v]); o.p += v; } };
    add('السور القائم يطمئن المدافعين', -Math.min(.12, this.effWalls(n) * .025));
    if (rd) add('إنهاك الحامية ونقص الذخائر', (rd.fat || 0) * .001 + Math.max(0, 40 - (rd.ammo ?? 100)) * .001);
    if (n.lastPoliticalAssault && this.S.turn - n.lastPoliticalAssault.turn <= 2) add(n.lastPoliticalAssault.held ? 'صدّت الحامية اقتحاماً قريباً' : 'نزفت الحامية في اقتحام قريب', n.lastPoliticalAssault.held ? -.08 : .06);
    o.p = clamp(o.p, 0, .94); o.band = oddsBand(o.p); return o;
  };
  const finish = Game.finishEncounter;
  Game.finishEncounter = async function (enc, out) { if (enc.kind === 'siege' || enc.type === 'assault') { const n = this.node(enc.node); if (n && out?.report) n.lastPoliticalAssault = { turn: this.S.turn, held: out.winner === 1 && out.report.cas[1].lost < out.report.cas[0].lost }; } return finish.call(this, enc, out); };
  const end = Game.endRound;
  Game.endRound = function () {
    const t = this.S.turn, tributes = politicalCopy(this.S.tributes), calls = this.aliveMajors().map(id => [id, this.f(id).allyCall]).filter(x => x[1]);
    const r = end.call(this), p = this.politicalState();
    for (const [key, treaty] of Object.entries(p.treaties)) if (!treaty.broken && !treaty.kept && this.S.turn >= treaty.until && !this.atWar(treaty.a, treaty.b)) { treaty.kept = true; for (const [a, b] of [[treaty.a, treaty.b], [treaty.b, treaty.a]]) this.rememberDiplomacy(a, b, 'kept', 8, 'وفى بهدنة كاملة', `kept:${key}:${treaty.since}`); }
    for (const tr of tributes) if (!this.S.tributes.some(x => x.payer === tr.payer && x.payee === tr.payee)) this.rememberDiplomacy(tr.payee, tr.payer, 'tribute', this.f(tr.payer).gold < 0 ? -8 : 5, this.f(tr.payer).gold < 0 ? 'عجز عن مواصلة الجزية' : 'أتم أقساط الجزية', `tribute:${tr.payer}:${tr.payee}:${t}`);
    for (const [id, c] of calls) if (!this.f(id).allyCall && !this.atWar(id, c.enemy) && this.atWar(c.ally, c.enemy)) this.rememberDiplomacy(c.ally, id, 'abandoned', -15, 'تجاهل نداء النصرة', `call:${c.turn}`);
    for (const id of Object.keys(p.counters)) if (p.counters[id].until < this.S.turn) delete p.counters[id];
    for (const [id, o] of Object.entries(p.offers)) if (this.S.turn - o.turn > 16) delete p.offers[id];
    return r;
  };
}

// One proposal per pair per interval; deterministic scheduling survives reload.
CampaignAI.diplomacy = async function (fid) {
  const p = Game.politicalState(), F = Game.f(fid);
  if (p.aiTurns[fid] === Game.S.turn || F.isPlayer) return;
  p.aiTurns[fid] = Game.S.turn;
  let acted = 0;
  const partners = Game.aliveMajors().filter(b => b !== fid).sort((a, b) => Number(Game.atWar(fid, b)) - Number(Game.atWar(fid, a)) || Game.politicalRoll(fid, a, 'order') - Game.politicalRoll(fid, b, 'order'));
  for (const b of partners) {
    if (acted >= 2 || Game.S.over || Game.politicalWait(fid, b, 'aiTalk')) continue;
    const B = Game.f(b), st = Game.status(fid, b), roll = k => Game.politicalRoll(fid, b, 'ai:' + k);
    if (st === 'war') {
      const urge = Game.peaceUrge(fid, b), score = Game.warScore(fid, b).score;
      if (roll('seekPeace') < politicalCurve(urge.v - score * .25 - 18) * .7) {
        const offer = Game.aiPeaceOffer(fid, b);
        Game.holdDiplomacy(fid, b, 'aiTalk', 4); acted++;
        if (B.isPlayer) await Game.presentPoliticalOffer(fid, b, 'peace', offer);
        else if (roll('acceptPeace') < Game.peaceChance(b, fid, offer).p) Game.settlePeace(fid, b, offer);
      }
      continue;
    }
    if (st === 'alliance') {
      const profile = Game.politicalProfile(fid), trust = Game.diplomaticMemory(fid, b).score;
      const breakPressure = -Game.rel(fid, b) * .5 - trust * .5 + profile.deceit * 20 - profile.loyalty * 20 - (Game.commonEnemy(fid, b) ? 25 : 0) - 35;
      if (!(F.truce[b] > 0) && roll('break') < politicalCurve(breakPressure) * .2) { Game.breakAlliance(fid, b, 'تراجع الثقة والمصلحة المشتركة'); acted++; }
      else if (Game.commonEnemy(fid, b) && Game.economy(fid).netGold > 0 && F.gold > Game.economy(fid).expense * 3 && B.gold < Game.economy(b).expense && roll('fund') < .3) { if (Game.subsidy(fid, b, 150)?.ok) acted++; }
      continue;
    }
    const war = Game.politicalAssessment(fid, b, 'war');
    if (Game.S.turn >= 3 && roll('war') < war.p * .22) { Game.declareWar(fid, b, war.why); acted++; continue; }
    if (F.kind === 'horde' || B.kind === 'horde') continue;
    const kind = !Game.treaty(fid, b).trade && roll('tradeFirst') < .35 + Game.politicalProfile(fid).commerce * .35 ? 'trade' : 'alliance';
    const own = Game.politicalAssessment(fid, b, kind), other = Game.politicalAssessment(b, fid, kind);
    if (!own.blocked && own.p >= .45 && !other.blocked && roll('offer:' + kind) < own.p * .22) {
      Game.holdDiplomacy(fid, b, 'aiTalk', 5); acted++;
      if (B.isPlayer) await Game.presentPoliticalOffer(fid, b, kind);
      else if (roll('accept:' + kind) < other.p) kind === 'trade' ? Game.setTrade(fid, b, true) : Game.makeAlliance(fid, b);
    } else if (!F.overlord && Game.politicalDistance(fid, b) != null && Game.politicalDistance(fid, b) <= 3 && Game.factionPower(fid) > Game.factionPower(b) * 1.5 && !Game.atWar(fid, b) && !Game.S.tributes.some(t => t.payer === b) && !B.overlord && roll('tribute') < .06) {
      Game.holdDiplomacy(fid, b, 'aiTalk', 5); acted++;
      const amount = Game.tributeAmount(b);
      if (B.isPlayer) await Game.presentPoliticalOffer(fid, b, 'tribute', { amount });
      else if (Game.aiWillPayTribute(b, fid)) Game.addTribute(b, fid, amount, 8);
    }
  }
};

Game.vassalDemands = async function () {
  for (const a of this.aliveMajors()) {
    if (this.f(a).isPlayer || this.f(a).overlord || this.f(a).kind === 'horde') continue;
    for (const b of this.aliveMajors()) {
      if (a === b || this.politicalWait(a, b, 'vassal') || this.politicalWait(a, b, 'aiTalk')) continue;
      const c = this.vassalAssessment(b, a);
      if (c.blocked || c.p < .5 || this.politicalRoll(a, b, 'seekVassal') > .07) continue;
      this.holdDiplomacy(a, b, 'aiTalk', 6);
      if (this.f(b).isPlayer) { this.holdDiplomacy(a, b, 'vassal', 6); await this.presentPoliticalOffer(a, b, 'vassal'); }
      else this.demandVassal(a, b);
      return;
    }
  }
};

Game.vassalTick = function () {
  for (const v of this.aliveMajors()) {
    const V = this.f(v), lord = V.overlord;
    if (!lord) continue;
    if (!this.f(lord)?.alive) { V.overlord = null; continue; }
    // Recurring tribute is settled once by the economy ledger. Protection works both ways.
    for (const c of this.aliveMajors()) {
      if (c === v || c === lord || this.f(c).kind === 'horde') continue;
      if (this.f(c).overlord === lord) { if(this.atWar(v,c))this.makePeace(v,c,8,'صلح بين تابعين للمتبوع نفسه');continue; }
      if (this.atWar(lord, c) && !this.atWar(v, c)) { if(this.status(v,c)==='alliance')this.breakAlliance(v,c,'الحلف يناقض واجب التبعية');this.setStatus(v, c, 'war', 0); this.event('pol', `${V.name} تدخل حرب متبوعتها على ${this.fname(c)}.`, { fids: [v, lord, c], imp: 2 }); }
      if (this.atWar(v, c) && !this.atWar(lord, c)) {
        if (this.f(lord).isPlayer) { this.f(lord).allyCall ||= { ally: v, enemy: c, turn: this.S.turn }; }
        else {if(this.status(lord,c)==='alliance')this.breakAlliance(lord,c,'حماية تابعته المهاجَمة');this.setStatus(lord, c, 'war', 0);}
      }
    }
    if (V.isPlayer || this.S.turn - (V.vassalSince ?? 0) < 8) continue;
    const memory = this.diplomaticMemory(v, lord).score, p = this.politicalProfile(v), ratio = this.factionPower(v) / Math.max(1, this.factionPower(lord));
    const safety = this.aliveMajors().filter(c => c !== lord && this.atWar(v, c)).length;
    const pressure = Math.log(Math.max(.05, ratio)) * 38 - this.rel(v, lord) * .3 - memory * .5 + p.pride * 12 + p.deceit * 12 - p.loyalty * 15 - safety * 20 - 28;
    if (!this.politicalWait(v, lord, 'independence') && this.politicalRoll(v, lord, 'independence') < politicalCurve(pressure) * .12) { this.holdDiplomacy(v, lord, 'independence', 8); this.freeVassal(v, 'ترى أنها تستطيع حفظ استقلالها بعد تراجع الثقة والحماية'); }
  }
};
