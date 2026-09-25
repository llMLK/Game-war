'use strict';
// شروط الفتح والأهداف المشتركة.
// نوع السيطرة (ضمّ مباشر أو حكم ذاتي) منفصل عن معاملة الأهل (أمان، بلا عهد، نهب).
// الشروط تُحفظ على المدينة بآثار معلنة ومدة، ومصير المدافعين يُحسب ويُعرض.
// الحليف يقبل الهدف المشترك أو يرفضه بأسباب أو يقترح بديلاً، وإن قبل يتحرك نحوه فعلاً.

const CONTROL = {
  direct: { name: 'ضمّ مباشر', desc: 'تحكمها بنفسك: دخلها كاملاً بحسب الولاء، وتجنّد منها حين تستقر.' },
  autonomy: { name: 'حكم ذاتي', desc: 'أعيانها يديرونها ويرسلون لك نصف دخلها: ولاء +15، ولا تجنيد نظامي منها، ولا تُحسب في الهدر الإداري. يمكنك إلغاؤه لاحقاً.' },
};
const TERMS = {
  aman: { name: 'الأمان', desc: 'الأرواح والأملاك والعبادات مصونة: ولاء +10 لمدة 12 دوراً، واضطراب أقصر، وسمعة +4. العهد يعفي أهلها من التجنيد 4 أدوار.' },
  plain: { name: 'بلا عهد', desc: 'لا وعود مكتوبة: ولاء متوسط، وتجنّد منها حين تستقر.' },
  sack: { name: 'النهب', desc: 'غنيمة الآن، لكن السكان يقلّون، والولاء ينهار (−10 لمدة 12 دوراً فوق السقوط)، والسمعة تتضرر، وتبقى آثار النهب.' },
};
const AMAN_TURNS = 12, AMAN_LEVY = 4, SACK_TURNS = 12, AUTONOMY_KEEP = 12, PACT_TURNS = 8;

Object.assign(Game, {
  // ------------------ آثار الشروط المحفوظة -------------------
  termsOf(n) { return n && n.terms && n.terms.by === n.owner ? n.terms : null; },
  termsIncome(n) { const t = this.termsOf(n); return t && t.control === 'autonomy' ? 0.5 : 1; },
  termsLoyalty(n) {
    const t = this.termsOf(n), out = [];
    if (!t) return out;
    const age = this.S.turn - t.turn;
    if (t.control === 'autonomy') out.push(['حكم ذاتي', 15]);
    if (t.k === 'aman' && age < AMAN_TURNS) out.push([`عهد الأمان (${AMAN_TURNS - age} أدوار باقية)`, 10]);
    if (t.k === 'sack' && age < SACK_TURNS) out.push([`ذكرى النهب (${SACK_TURNS - age} أدوار باقية)`, -10]);
    return out;
  },
  termsRecruit(n) {
    const t = this.termsOf(n);
    if (!t) return null;
    if (t.control === 'autonomy') return 'حكم ذاتي: أعيانها لا يرسلون مجندين. ألغِ الحكم الذاتي أولاً';
    if (t.k === 'aman' && this.S.turn - t.turn < AMAN_LEVY) return `عهد الأمان يعفي أهلها من التجنيد حتى الدور ${t.turn + AMAN_LEVY}`;
    return null;
  },
  termsLines(n) {
    const t = this.termsOf(n);
    if (!t) return null;
    const age = this.S.turn - t.turn;
    const lines = [[`فُتحت ${t.how === 'surrender' ? 'صلحاً' : 'عنوة'} في الدور ${t.turn}`, `${CONTROL[t.control].name} · ${TERMS[t.k].name}`]];
    for (const [k, v] of this.termsLoyalty(n)) lines.push([k, signed(v) + ' ولاء', v > 0 ? 'pos' : 'neg']);
    if (t.control === 'autonomy') lines.push(['نصيبك من دخلها', '50٪']);
    const rr = this.termsRecruit(n);
    if (rr) lines.push(['التجنيد', rr]);
    if (t.fate) lines.push(['مصير المدافعين', t.fate]);
    if (t.broke != null) lines.push(['نقضتَ العهد', `الدور ${t.broke}`, 'neg']);
    void age;
    return lines;
  },
  // إلغاء الحكم الذاتي: الأعيان يغضبون، ونقضه مبكراً يُعدّ نكثاً
  revokeAutonomy(n) {
    const t = this.termsOf(n);
    if (!t || t.control !== 'autonomy') return 'ليست مدينة ذات حكم ذاتي';
    const early = this.S.turn - t.turn < AUTONOMY_KEEP;
    t.control = 'direct';
    n.loyalty = Math.max(0, n.loyalty - 15);
    const f = this.f(n.owner);
    if (early) { f.rep = Math.max(0, f.rep - 3); t.broke = this.S.turn; }
    this.event('int', `${f.name} تلغي الحكم الذاتي في ${n.name}${early ? ' قبل أوانه' : ''}.`, { fids: [n.owner], node: n.id, imp: 2 });
    return null;
  },
  normChoice(c, how) {
    if (c && typeof c === 'object') return { control: c.control || 'direct', terms: c.terms || 'plain' };
    if (c === 'sack') return { control: 'direct', terms: 'sack' };
    if (c === 'clemency') return { control: 'direct', terms: 'aman' };
    return { control: 'direct', terms: how === 'surrender' ? 'aman' : 'plain' };
  },
});

// ------------------ الأهداف المشتركة مع الحلفاء -------------------
Object.assign(Game, {
  pactsOf(fid) { return (this.S.pacts || []).filter((p) => p.status === 'active' && (p.a === fid || p.b === fid)); },
  pactFor(ally) { return (this.S.pacts || []).find((p) => p.status === 'active' && p.b === ally) || null; },
  distTo(fid, target) {
    const origins = [...this.nodesOf(fid).map((n) => n.id), ...this.armiesOf(fid).map((a) => a.node)];
    return origins.length ? Math.min(...origins.map((id) => this.hops(id, target, 8))) : 99;
  },
  // المسافة الفعلية: عبر مدن صديقة فقط، ثم خطوة أخيرة إلى الهدف. الجيوش لا تعبر مدينة غير صديقة دون فتحها
  passDist(fid, target) {
    const start = [...new Set([...this.nodesOf(fid).map((n) => n.id), ...this.armiesOf(fid).filter((a) => !a.siege).map((a) => a.node)])];
    if (start.includes(target)) return 0;
    const seen = new Set(start);
    let layer = start;
    for (let d = 1; d <= 8; d++) {
      const next = [];
      for (const id of layer) for (const x of this.adjAll(id)) {
        if (x === target) return d;
        if (seen.has(x)) continue;
        seen.add(x);
        if (this.friendly(this.node(x).owner, fid)) next.push(x);
      }
      layer = next;
    }
    return 99;
  },
  // تقدّم جيوش الحليف نفسها: أقرب جيش ميداني عبر طريق صديق، والمحاصِر للهدف على بعد صفر
  armyDist(fid, target) {
    let best = 99;
    for (const a of this.armiesOf(fid)) {
      if (a.siege) { if (a.node === target) return 0; continue; }
      if (a.node === target) return 0;
      const seen = new Set([a.node]);
      let layer = [a.node];
      for (let d = 1; d <= 8 && d < best; d++) {
        const next = [];
        for (const id of layer) for (const x of this.adjAll(id)) {
          if (x === target) { best = Math.min(best, d); break; }
          if (seen.has(x)) continue;
          seen.add(x);
          if (this.friendly(this.node(x).owner, fid)) next.push(x);
        }
        layer = next;
      }
    }
    return best;
  },
  fieldPow(fid) { return this.armiesOf(fid).filter((a) => !a.siege).reduce((s, a) => s + this.armyPower(a), 0); },
  // حساب حتمي معلن: كل سبب بقيمته، والقبول إن بلغ المجموع العتبة
  pactTerms(ally, targetId) {
    const n = this.node(targetId), P = this.S.player, A = this.f(ally);
    const parts = [];
    if (!n || !A || !A.alive) return { ok: false, hard: 'الحليف أو المدينة لم يعد موجوداً', parts };
    if (this.status(P, ally) !== 'alliance') return { ok: false, hard: 'لستما في حلف', parts };
    if (n.owner === ally || n.owner === P) return { ok: false, hard: 'المدينة لكما أصلاً', parts };
    if (n.owner !== 'neutral' && !this.atWar(ally, n.owner)) return { ok: false, hard: `${A.name} ليست في حرب مع ${this.fname(n.owner)}. أعلن الحرب وادعُها لنصرتك أولاً`, parts };
    const d = this.passDist(ally, targetId), raw = this.distTo(ally, targetId);
    const st = (k) => arN(k, ['خطوة واحدة', 'خطوتان', 'خطوات', 'خطوة']);
    if (d >= 99) parts.push([raw < 99 ? `الطريق إليها يمر بمدن غير صديقة لهم (${st(raw)} على الخريطة): عليهم فتحها أولاً` : 'لا طريق إليها من أرضهم', -6]);
    else parts.push([d <= 2 ? `قريبة من أرضهم (${st(d)})` : `بعيدة عن أرضهم (${st(d)})`, d <= 2 ? 3 : d === 3 ? 0 : d === 4 ? -2 : -5]);
    const def = this.defensePower(n) * (1 + 0.25 * n.walls) + this.defendersOf(n).reduce((s, a) => s + this.armyPower(a), 0);
    const pow = this.fieldPow(ally);
    const ratio = pow / Math.max(1, def);
    parts.push([`قوتهم الميدانية أمام دفاعها (${Math.round(ratio * 10) / 10} ضعفاً)`, ratio >= 1.5 ? 3 : ratio >= 0.8 ? 1 : -3]);
    const mine = this.armiesOf(P).filter((a) => this.hops(a.node, targetId, 3) <= 2);
    parts.push([mine.length ? 'جيشك قريب منها ويشاركهم' : 'لا جيش لك قريب منها', mine.length ? 2 : -1]);
    const threatened = this.nodesOf(ally).some((m) => CampaignAI.threat(m, ally) > this.defensePower(m) * 1.2);
    if (threatened) parts.push(['أرضهم مهددة ويحتاجون جيوشهم للدفاع', -3]);
    const rel = this.rel(P, ally);
    parts.push([`العلاقة بكم (${Math.round(rel)})`, rel >= 60 ? 2 : rel >= 30 ? 1 : 0]);
    if (n.capital) parts.push(['عاصمة: غنيمة كبيرة وخطر كبير', 1]);
    if (A.claims && A.claims.includes(targetId)) parts.push(['يرونها حقاً لهم', 2]);
    if (this.pactFor(ally)) parts.push(['عندهم هدف مشترك قائم معك', -6]);
    const score = parts.reduce((t, p) => t + p[1], 0);
    return { ok: score >= 3, score, need: 3, parts, d, ratio };
  },
  // إن رفض الحليف: أفضل مدينة يقبلها بدلاً منها (إن وُجدت)
  pactAlternative(ally, exclude) {
    const P = this.S.player;
    let best = null;
    for (const n of this.S.nodes) {
      if (n.id === exclude || n.owner === P || n.owner === ally) continue;
      if (n.owner !== 'neutral' && !(this.atWar(ally, n.owner) && this.atWar(P, n.owner))) continue;
      const t = this.pactTerms(ally, n.id);
      if (t.ok && (!best || t.score > best.t.score || (t.score === best.t.score && this.distTo(P, n.id) < this.distTo(P, best.n.id)))) best = { n, t };
    }
    return best;
  },
  proposePact(ally, targetId) {
    const t = this.pactTerms(ally, targetId);
    const n = this.node(targetId), A = this.f(ally), P = this.S.player;
    if (!t.ok) {
      this.addRel(P, ally, -1);
      const alt = t.hard ? null : this.pactAlternative(ally, targetId);
      return { ok: false, t, alt: alt ? alt.n.id : null };
    }
    this.S.pacts = this.S.pacts || [];
    const p = { id: (this.S.pid = (this.S.pid || 0) + 1), a: P, b: ally, target: targetId, owner: n.owner, since: this.S.turn, until: this.S.turn + PACT_TURNS, status: 'active', d0: this.armyDist(ally, targetId), near: false, log: [] };
    this.S.pacts.push(p);
    this.event('pol', `${A.name} توافق على هدف مشترك مع ${this.fname(P)}: ${n.name}، خلال ${PACT_TURNS} أدوار.`, { fids: [P, ally], node: targetId, imp: 2 });
    this.chronicle('alliance', `${this.fname(P)} و${A.name} تتفقان على الزحف إلى ${n.name}.`, { fids: [P, ally], node: targetId, imp: 2 });
    return { ok: true, p };
  },
  // كل دور: هل تحقق الهدف، هل انتهت المهلة، هل انسحب أحدهما، وأين جيوش الحليف
  pactTick() {
    for (const p of this.S.pacts || []) {
      if (p.status !== 'active') continue;
      const n = this.node(p.target), A = this.f(p.b);
      const done = (st, txt, rel) => {
        p.status = st; p.end = this.S.turn;
        this.addRel(p.a, p.b, rel);
        this.event('pol', txt, { fids: [p.a, p.b], node: p.target, imp: 2 });
        if (p.a === this.S.player) this.alert(st === 'done' ? 'info' : 'imp', txt, { icon: 'treaty', node: p.target, win: 'diplo' });
      };
      if (!A || !A.alive || this.status(p.a, p.b) !== 'alliance') { done('broken', `سقط الهدف المشترك في ${n ? n.name : 'المدينة'}: لم يعد الحلف قائماً.`, 0); continue; }
      if (n.owner === p.a || n.owner === p.b || this.friendly(n.owner, p.a)) { done('done', `تحقق الهدف المشترك: ${n.name} بيد ${this.fname(n.owner)}.`, 10); continue; }
      if (n.owner !== 'neutral' && !this.atWar(p.b, n.owner)) { done('broken', `${A.name} صالحت ${this.fname(n.owner)} فتخلت عن الهدف المشترك في ${n.name}.`, -5); continue; }
      if (this.armiesOf(p.a).some((a) => this.hops(a.node, p.target, 3) <= 1)) p.near = true;
      const d = this.armyDist(p.b, p.target);
      if (!p.log.length || p.log[p.log.length - 1].d !== d) p.log.push({ t: this.S.turn, d });
      if (this.S.turn >= p.until) done('expired', `انتهت مهلة الهدف المشترك في ${n.name}${p.near ? '' : '، وحليفك يعاتبك: لم يرَ جيشك قربها'}.`, p.near ? 0 : -6);
    }
  },
});

// ------------------ الربط -------------------
(() => {
  // الحليف يتخذ الهدف المشترك غايةً لجيوشه ما دام قائماً
  const pg = CampaignAI.planGoals;
  CampaignAI.planGoals = function (fid) {
    pg.call(this, fid);
    const p = Game.pactFor(fid);
    const n = p && Game.node(p.target);
    if (p && n && n.owner !== fid) Game.f(fid).goals = { target: n.id, owner: n.owner, score: 999, since: p.since, kind: 'pact' };
  };
  const er = Game.endRound;
  Game.endRound = function (...args) { const r = er.apply(this, args); this.pactTick(); return r; };
  // ولا تقبل صلحاً يعرضه صاحب المدينة المتفق عليها ما دام الهدف قائماً
  const wap = Game.aiWillAcceptPeace;
  Game.aiWillAcceptPeace = function (ai, other, ...rest) {
    if ((this.S.pacts || []).some((p) => p.status === 'active' && p.b === ai && p.owner === other)) return false;
    return wap.call(this, ai, other, ...rest);
  };
})();
