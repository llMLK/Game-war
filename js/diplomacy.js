'use strict';
// الدبلوماسية: العلاقات، المعاهدات، التجارة، المصاهرة، الجزية، السمعة، التجسس، الاستخبارات

const SPY = {
  scout: { name: 'استطلاع', cost: 60, catch: 0.1, desc: 'معلومات دقيقة عن المملكة لـ8 أدوار' },
  incite: { name: 'تحريض', cost: 130, catch: 0.3, desc: 'يخفض ولاء أضعف مدنهم بشدة' },
  sabotage: { name: 'تخريب', cost: 110, catch: 0.25, desc: 'يحرق مؤن مدينة حدودية ويضعف حاميتها' },
};

Object.assign(Game, {
  status(a, b) {
    if (a === b) return 'self';
    if (a === 'neutral' || b === 'neutral') return 'war';
    return this.f(a).status[b] || 'peace';
  },
  atWar(a, b) { return a !== b && this.status(a, b) === 'war'; },
  setStatus(a, b, st, truce = 6) {
    const A = this.f(a), B = this.f(b);
    A.status[b] = st; B.status[a] = st;
    A.warTurns[b] = 0; B.warTurns[a] = 0;
    A.truce[b] = B.truce[a] = st === 'war' ? 0 : truce;
    if (st === 'war') {
      A.lastWarTurn = B.lastWarTurn = this.S.turn;
      if (A.treaty[b]) A.treaty[b].trade = false;
      if (B.treaty[a]) B.treaty[a].trade = false;
      this.S.tributes = this.S.tributes.filter((t) => !((t.payer === a && t.payee === b) || (t.payer === b && t.payee === a)));
    }
  },
  addRel(a, b, v) {
    if (!a || !b || a === b || a === 'neutral' || b === 'neutral' || !this.f(a) || !this.f(b)) return;
    const A = this.f(a), B = this.f(b);
    A.rel[b] = clamp((A.rel[b] || 0) + v, -100, 100);
    B.rel[a] = clamp((B.rel[a] || 0) + v, -100, 100);
  },
  rel(a, b) { return Math.round((this.f(a).rel || {})[b] || 0); },
  treaty(a, b) { const t = this.f(a).treaty; return t[b] || (t[b] = { trade: false, marriage: false }); },
  setTreaty(a, b, k, v) { this.treaty(a, b)[k] = v; this.treaty(b, a)[k] = v; },
  borders(a, b) { return this.nodesOf(a).some((n) => this.adjAll(n.id).some((id) => this.node(id).owner === b)); },

  declareWar(a, b, why) {
    const A = this.f(a);
    const st = this.status(a, b);
    const truce = (A.truce[b] || 0) > 0;
    const married = this.treaty(a, b).marriage;
    const treachery = truce || st === 'alliance' || married;
    this.setStatus(a, b, 'war', 0);
    this.addRel(a, b, treachery ? -40 : -25);
    A.rep = clamp(A.rep - (treachery ? (married ? 20 : 15) : 3), 0, 100);
    if (treachery) {
      for (const c of this.aliveMajors()) if (c !== a && c !== b) this.addRel(a, c, -8);
      const B = this.f(b);
      B.grievance[a] = (B.grievance[a] || 0) + 2;
    }
    this.event('pol', `${A.name} تعلن الحرب على ${this.fname(b)}${treachery ? ' ناقضةً العهد' : ''}${why ? ' — ' + why : ''}.`, { fids: [a, b], imp: 3 });
    if (b === this.S.player) this.alert('crit', `${A.name} تعلن الحرب عليك${why ? ' — ' + why : ''}`, { icon: 'swords', win: 'diplo', key: 'war:' + a });
    if (this.chronicle) this.chronicle('war', `${A.name} تعلن الحرب على ${this.fname(b)}${treachery ? ' ناقضةً العهد' : ''}.`, { fids: [a, b], imp: treachery ? 3 : 2 });
    // حلفاء المعتدى عليه يلبّون النداء
    for (const c of this.aliveMajors()) {
      if (c === a || c === b || this.status(b, c) !== 'alliance' || this.atWar(a, c)) continue;
      if (this.f(c).isPlayer) {
        this.alert('imp', `حليفك ${this.fname(b)} يتعرض لهجوم ${A.name} ويستنجد بك`, { icon: 'bell', win: 'diplo', key: 'allycall:' + b });
        this.f(c).allyCall = { ally: b, enemy: a, turn: this.S.turn };
        continue;
      }
      if (this.rel(c, a) > 40 && R() < 0.5) {
        this.breakAlliance(c, b, 'رفضت نصرة حليفها');
        continue;
      }
      this.setStatus(c, a, 'war', 0);
      this.addRel(c, a, -25);
      this.event('pol', `${this.fname(c)} تدخل الحرب وفاءً لحلفها مع ${this.fname(b)}.`, { fids: [c, a, b], imp: 3 });
    }
  },
  makePeace(a, b, truce = 8, note) {
    if (b === this.S.player || a === this.S.player) this.alert('info', `صلح مع ${this.fname(a === this.S.player ? b : a)}`, { icon: 'dove', win: 'diplo' });
    this.setStatus(a, b, 'peace', truce);
    this.addRel(a, b, 15);
    this.f(a).lostRecently = 0; this.f(b).lostRecently = 0;
    this.event('pol', `صلح بين ${this.fname(a)} و${this.fname(b)}${note ? ' ' + note : ''}.`, { fids: [a, b], imp: 3 });
    this.chronicle('peace', `صلح بين ${this.fname(a)} و${this.fname(b)}.`, { fids: [a, b], imp: 2 });
    this.validate();
  },
  makeAlliance(a, b) {
    this.setStatus(a, b, 'alliance', 10);
    this.addRel(a, b, 15);
    this.f(a).allySince = this.f(a).allySince || {}; this.f(b).allySince = this.f(b).allySince || {};
    this.f(a).allySince[b] = this.f(b).allySince[a] = this.S.turn;
    this.event('pol', `حلف بين ${this.fname(a)} و${this.fname(b)}.`, { fids: [a, b], imp: 3 });
    this.chronicle('alliance', `${this.fname(a)} و${this.fname(b)} تعقدان حلفاً.`, { fids: [a, b], imp: 2 });
  },
  breakAlliance(a, b, why) {
    this.setStatus(a, b, 'peace', 0);
    this.addRel(a, b, -20);
    this.event('pol', `انتهى الحلف بين ${this.fname(a)} و${this.fname(b)}${why ? ' — ' + why : ''}.`, { fids: [a, b], imp: 3 });
    this.chronicle('betray', `انفضّ الحلف بين ${this.fname(a)} و${this.fname(b)}${why ? ' — ' + why : ''}.`, { fids: [a, b], imp: 2 });
    if (b === this.S.player) this.alert('imp', `${this.fname(a)} تفضّ حلفها معك${why ? ' — ' + why : ''}`, { icon: 'dagger', win: 'diplo' });
    this.validate();
  },
  setTrade(a, b, on) {
    this.setTreaty(a, b, 'trade', on);
    this.addRel(a, b, on ? 8 : -8);
    this.event('eco', on ? `اتفاق تجارة بين ${this.fname(a)} و${this.fname(b)}.` : `توقفت التجارة بين ${this.fname(a)} و${this.fname(b)}.`, { fids: [a, b], imp: 2 });
  },
  marriageCost() { return 250; },
  marry(a, b) {
    this.f(a).gold -= this.marriageCost();
    this.setTreaty(a, b, 'marriage', true);
    this.addRel(a, b, 30);
    this.f(a).truce[b] = this.f(b).truce[a] = Math.max(this.f(a).truce[b] || 0, 12);
    this.event('pol', `مصاهرة سياسية بين بيت ${this.fname(a)} وبيت ${this.fname(b)} توثّق العهد.`, { fids: [a, b], imp: 3 });
  },
  tributeAmount(payer) { return Math.max(20, Math.round(this.economy(payer).gold * 0.15)); },
  addTribute(payer, payee, amount, turns = 8) {
    this.S.tributes = this.S.tributes.filter((t) => !(t.payer === payer && t.payee === payee));
    this.S.tributes.push({ payer, payee, amount, turns });
    this.event('pol', `${this.fname(payer)} تدفع جزية ${amount} ذهباً كل دور لـ${this.fname(payee)} لمدة ${turns} أدوار.`, { fids: [payer, payee], imp: 2 });
  },
  subsidy(a, b, amount = 150) {
    this.f(a).gold -= amount; this.f(b).gold += amount;
    this.addRel(a, b, 12);
    this.event('pol', `${this.fname(a)} تموّل ${this.fname(b)} بـ${amount} ذهباً.`, { fids: [a, b], imp: 1 });
  },

  // ——— الذكاء في تقييم العروض ———
  honor(fid) { return this.pers(fid).honor; },
  aiWillAcceptPeace(ai, other, tribute = 0) {
    const A = this.f(ai);
    if (A.vendetta && A.vendetta[other] > 0) return false;
    const pa = this.factionPower(ai), po = this.factionPower(other);
    const aggr = this.pers(ai).aggr * DIFFS[this.S.difficulty].aiAggr;
    let s = this.rel(ai, other) * 0.4 + (po / Math.max(1, pa) - 1) * 40 + (A.warTurns[other] || 0) * 2 + tribute / 8 + (A.lostRecently || 0) * 10 - aggr * 12;
    s += (this.f(other).rep - 50) / 4;
    const otherWars = this.aliveMajors().filter((c) => c !== ai && c !== other && this.atWar(ai, c)).length;
    s += otherWars * 12;
    if (A.goals && A.goals.target && this.node(A.goals.target) && this.node(A.goals.target).owner === other) s -= 15;
    const dom = this.dominant();
    if (dom === other) s -= 25;
    else if (dom && dom !== ai) s += 20;
    return s + (R() - 0.5) * 14 > 4;
  },
  commonEnemy(a, b) { return this.aliveMajors().some((c) => c !== a && c !== b && this.atWar(a, c) && this.atWar(b, c)); },
  aiWillAlly(ai, other) {
    if (this.status(ai, other) !== 'peace') return false;
    const r = this.rel(ai, other) + (this.f(other).rep - 50) / 3;
    const dom = this.dominant();
    const coalition = dom && dom !== ai && dom !== other;
    return r > 55 || (r > 20 && (this.commonEnemy(ai, other) || coalition));
  },
  aiWillTrade(ai, other) {
    const A = this.f(ai);
    if (this.atWar(ai, other) || (A.vendetta && A.vendetta[other])) return false;
    return this.rel(ai, other) + (this.f(other).rep - 50) / 4 > -5;
  },
  aiWillMarry(ai, other) {
    if (this.atWar(ai, other) || this.treaty(ai, other).marriage) return false;
    return this.rel(ai, other) + (this.f(other).rep - 50) / 4 > 15;
  },
  aiWillPayTribute(payer, demander) {
    const A = this.f(payer);
    if (A.vendetta && A.vendetta[demander]) return false;
    const ratio = this.factionPower(demander) / Math.max(1, this.factionPower(payer));
    const wars = this.aliveMajors().filter((c) => c !== payer && this.atWar(payer, c)).length;
    return ratio > 1.7 || (ratio > 1.3 && wars >= 1);
  },

  // ——— الهيمنة والاستخبارات ———
  dominant() {
    const alive = this.aliveMajors();
    if (alive.length < 3) return null;
    const pw = alive.map((id) => [id, this.factionPower(id)]);
    const tot = pw.reduce((s, x) => s + x[1], 0);
    const top = pw.sort((x, y) => y[1] - x[1])[0];
    return top[1] / tot > 0.45 ? top[0] : null;
  },
  intelLevel(viewer, target) {
    if (viewer === target) return 3;
    const T = this.f(target);
    if (!T || T.neutral) return 1;
    if (this.status(viewer, target) === 'alliance' || T.overlord === viewer || this.f(viewer).overlord === target) return 3;
    if ((this.f(viewer).intel[target] || 0) > 0) return 3;
    const tr = this.treaty(viewer, target);
    if (tr.trade || tr.marriage) return 2;
    if (this.borders(viewer, target)) return 1;
    return 0;
  },
  // تقدير رقم حسب مستوى المعرفة
  estimate(viewer, target, v) {
    const lvl = this.intelLevel(viewer, target);
    if (lvl >= 3) return { text: fmt(v), lvl };
    if (lvl === 0) return { text: '؟', lvl };
    const k = lvl === 2 ? 0.2 : 0.45;
    const r = rng(hashStr(target + ':' + this.S.turn + ':' + Math.round(v / 50)));
    const c = v * (1 + (r() - 0.5) * k);
    const lo = Math.max(0, Math.round(c * (1 - k / 2) / 10) * 10), hi = Math.round(c * (1 + k / 2) / 10) * 10;
    return { text: lo === hi ? '~' + fmt(lo) : `${fmt(lo)}–${fmt(hi)}`, lvl };
  },

  // ——— التجسس ———
  spyTargetCity(by, target, kind) {
    const nodes = this.nodesOf(target);
    const near = nodes.filter((n) => this.adjAll(n.id).some((x) => this.node(x).owner === by));
    const list = near.length ? near : nodes;
    if (!list.length) return null;
    if (kind === 'incite') return list.reduce((a, n) => (n.loyalty < a.loyalty ? n : a));
    return list.find((n) => this.besiegers(n.id).some((b) => b.fid === by)) || list.reduce((a, n) => (n.walls > a.walls ? n : a));
  },
  canSpy(by, target, kind) {
    if (this.f(by).gold < SPY[kind].cost) return 'الذهب لا يكفي';
    if ((this.f(by).spyTurn || -1) === this.S.turn) return 'مهمة تجسس واحدة كل دور';
    if (kind !== 'scout' && !this.spyTargetCity(by, target, kind)) return 'لا هدف مناسب';
    return null;
  },
  spy(by, target, kind) {
    const err = this.canSpy(by, target, kind);
    if (err) return { err };
    const B = this.f(by), T = this.f(target);
    B.gold -= SPY[kind].cost;
    B.spyTurn = this.S.turn;
    let text = '';
    if (kind === 'scout') { B.intel[target] = 8; text = `جواسيسك في بلاط ${T.name}: معلومات دقيقة لـ8 أدوار.`; }
    else if (kind === 'incite') {
      const n = this.spyTargetCity(by, target, kind);
      n.loyalty = Math.max(0, n.loyalty - 25);
      text = `حرّض عملاؤك أهل ${n.name} (الولاء الآن ${n.loyalty}).`;
      if (target === this.S.player) this.alert('imp', `محرّضون يثيرون أهل ${n.name} (الولاء ${n.loyalty})`, { node: n.id, icon: 'torch' });
    } else {
      const n = this.spyTargetCity(by, target, kind);
      n.stores = Math.max(-1, n.stores - 3);
      for (const r of n.garrison) r.men = Math.round(r.men * 0.7);
      text = `أحرق عملاؤك مخازن ${n.name} وأضعفوا حاميتها.`;
      if (target === this.S.player) this.alert('imp', `حريق مريب في مخازن ${n.name}`, { node: n.id, icon: 'fire' });
    }
    const caught = R() < SPY[kind].catch;
    if (caught) {
      this.addRel(by, target, -20);
      B.rep = Math.max(0, B.rep - 5);
      if (T.grievance) T.grievance[by] = (T.grievance[by] || 0) + 1;
      this.event('pol', `قُبض على جواسيس ${B.name} في أرض ${T.name}!`, { fids: [by, target], imp: 2 });
      text += ' لكن جاسوساً قُبض عليه — العلاقة تضررت.';
    }
    return { ok: true, caught, text };
  },

  // ——— مرور الزمن ———
  relBaseline(a, b) {
    const st = this.status(a, b);
    let base = st === 'war' ? -35 : st === 'alliance' ? 35 : 5;
    const tr = this.treaty(a, b);
    if (tr.marriage) base += 20;
    if (tr.trade) base += 8;
    if (st !== 'alliance' && this.borders(a, b)) base -= 8;
    const dom = this.dominant();
    if (dom === b && dom !== a) base -= 12;
    if (this.commonEnemy(a, b)) base += 10;
    base -= 6 * ((this.f(a).grievance || {})[b] || 0);
    base += (this.f(b).rep - 50) / 5;
    if ((this.f(a).vendetta || {})[b] > 0) base -= 30;
    return base;
  },
  diplomacyTick() {
    const S = this.S;
    const alive = this.aliveMajors();
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      const base = (this.relBaseline(a, b) + this.relBaseline(b, a)) / 2;
      const cur = this.rel(a, b);
      this.addRel(a, b, clamp(base - cur, -2, 2));
    }
    for (const id of alive) {
      const f = this.f(id);
      for (const k in f.truce) if (f.truce[k] > 0) f.truce[k]--;
      for (const k in f.warTurns) if (this.atWar(id, k)) f.warTurns[k]++;
      for (const k in f.vendetta) if (f.vendetta[k] > 0) f.vendetta[k]--;
      for (const k in f.intel) if (f.intel[k] > 0) f.intel[k]--;
      if (S.turn % 10 === 9) for (const k in f.grievance) if (f.grievance[k] > 0) f.grievance[k]--;
      f.lostRecently = Math.max(0, (f.lostRecently || 0) - 0.25);
      f.rep = clamp(f.rep + (f.rep < 50 ? 0.5 : f.rep > 50 ? -0.2 : 0), 0, 100);
      if (f.allyCall && S.turn - f.allyCall.turn > 2) {
        const c = f.allyCall;
        if (this.status(id, c.ally) === 'alliance' && !this.atWar(id, c.enemy) && this.atWar(c.ally, c.enemy)) {
          this.addRel(id, c.ally, -15);
          this.event('pol', `${this.fname(c.ally)} تعتب على ${f.name} لتخلّيها عنها في الحرب.`, { fids: [id, c.ally], imp: 2 });
        }
        f.allyCall = null;
      }
    }
    const allPeace = alive.every((a) => alive.every((b) => a === b || !this.atWar(a, b)));
    S.peaceTurns = allPeace ? (S.peaceTurns || 0) + 1 : 0;
  },
});
