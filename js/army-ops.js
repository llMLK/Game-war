'use strict';
// إدارة الجيش: إعادة التسليح بمعدات محلية، ضمّ البقايا، التجنيد بتأكيد وتراجع محدود.
// القاعدة: لا تمنح أي عملية رجالاً أو حركة أو خبرة أو راحة بلا ثمن.

// إعادة التسليح: ما يمكن أن تصير إليه كل وحدة. الخيل من إسطبلات المدينة، والسلاح من ورشها
const REARM = {
  spear: [{ to: 'sword', cost: 45 }, { to: 'cavalry', cost: 95 }],
  archer: [{ to: 'horsearcher', cost: 80 }],
  sword: [{ to: 'cavalry', cost: 85 }],
};

Object.assign(Game, {
  rid() { return 'r' + this.S.nextId++; },

  // --- إعادة التسليح ---
  rearmOptions(a, idx) {
    const r = a.regs[idx];
    if (!r || r.merc || UNITS[r.type].unique) return [];
    return (REARM[r.type] || []).map((o) => ({ ...o, men: Math.min(r.men, UNITS[o.to].men), extra: Math.max(0, r.men - UNITS[o.to].men) }));
  },
  canRearm(a, idx, to) {
    const n = this.node(a.node), r = a.regs[idx];
    const o = this.rearmOptions(a, idx).find((x) => x.to === to);
    if (!r || !o) return 'لا تسليح بديل لهذه الوحدة';
    if (a.siege || n.owner !== a.fid) return 'يحتاج ورش مدينة لك: المحاصِرون في الميدان';
    if (!n.barracks) return `يحتاج إسطبلات وورشاً في ${n.name}`;
    if (a.mp < this.mpMax(a)) return 'تحرّك الجيش هذا الدور: التسليح يحتاج دوراً كاملاً بلا حركة';
    if (a.rearmTurn === this.S.turn) return 'وحدة واحدة كل دور';
    if (this.f(a.fid).gold < o.cost) return `الذهب لا يكفي (${o.cost})`;
    return null;
  },
  rearm(a, idx, to) {
    const err = this.canRearm(a, idx, to);
    if (err) return err;
    const r = a.regs[idx], o = this.rearmOptions(a, idx).find((x) => x.to === to);
    const n = this.node(a.node);
    this.f(a.fid).gold -= o.cost;
    const from = r.type;
    r.type = to; r.men = o.men;
    r.exp = Math.max(0, (r.exp || 0) - 1); r.drill = 0;
    if (o.extra) n.manpower = Math.min(this.mpCap(n), n.manpower + o.extra);
    a.rearmTurn = this.S.turn;
    this.spendMp(a, 'rearm');
    this.event('int', `أعادت ${this.fname(a.fid)} تسليح ${UNITS[from].name} إلى ${UNITS[to].name} في ${n.name}.`, { fids: [a.fid], node: n.id, imp: 1 });
    return null;
  },

  // --- ضمّ البقايا: وحدات من النوع نفسه تحت نصف قوامها تندمج ---
  consolidatePlan(a) {
    const groups = {};
    a.regs.forEach((r, i) => { const k = r.type + (r.merc ? ':m' : ''); (groups[k] = groups[k] || []).push(i); });
    const plans = [];
    for (const k in groups) {
      const idx = groups[k].filter((i) => a.regs[i].men < UNITS[a.regs[i].type].men);
      if (idx.length < 2) continue;
      const max = UNITS[a.regs[idx[0]].type].men;
      const men = idx.reduce((t, i) => t + a.regs[i].men, 0);
      const into = Math.ceil(men / max);
      if (into >= idx.length) continue;
      plans.push({ type: a.regs[idx[0]].type, idx, men, into, save: (idx.length - into) * Math.round((UNITS[a.regs[idx[0]].type].upkeep || 0) * (a.regs[idx[0]].merc ? 1.8 : 1)) });
    }
    return plans;
  },
  consolidate(a) {
    const plans = this.consolidatePlan(a);
    if (!plans.length) return 'لا وحدات ناقصة من النوع نفسه';
    for (const p of plans) {
      const regs = p.idx.map((i) => a.regs[i]);
      const max = UNITS[p.type].men;
      // الخبرة متوسط موزون بالرجال، مقرّب للأسفل: الدمج لا يرفعها
      const exp = Math.floor(regs.reduce((t, r) => t + (r.exp || 0) * r.men, 0) / p.men);
      const ammo = regs.reduce((t, r) => t + (r.ammo != null ? r.ammo : 1) * r.men, 0) / p.men;
      const out = [];
      let left = p.men;
      for (let k = 0; k < p.into; k++) { const m = Math.min(max, left); left -= m; out.push({ ...regs[0], men: m, exp, drill: 0, ammo, rid: this.rid() }); }
      a.regs = a.regs.filter((r) => !regs.includes(r)).concat(out);
    }
    this.event('int', `جيش ${this.gname(this.armyGen(a))} يضمّ بقايا وحداته.`, { fids: [a.fid], node: a.node, imp: 1 });
    return null;
  },

  // --- التجنيد بطلبات قابلة للتراجع في الدور نفسه ---
  recruitMany(fid, node, type, armyId, count) {
    let done = 0, err = null;
    for (let i = 0; i < count; i++) {
      err = this.canRecruit(fid, node, type, armyId, false);
      if (err) break;
      const a = this.targetArmy(fid, node, armyId);
      const cost = this.recruitCost(type);
      this.recruit(fid, node, type, a.id);
      const r = a.regs[a.regs.length - 1];
      r.rid = r.rid || this.rid();
      this.S.recruitLog = (this.S.recruitLog || []).filter((x) => x.turn === this.S.turn);
      this.S.recruitLog.push({ turn: this.S.turn, army: a.id, rid: r.rid, type, cost, men: r.men, node: node.id, mp: a.mp, fid });
      done++;
    }
    return { done, err: done ? null : err };
  },
  // التراجع ممكن ما دامت الوحدة لم تتحرك ولم تقاتل ولم تتغير، وفي الدور نفسه فقط
  undoable(fid) {
    return (this.S.recruitLog || []).filter((x) => x.fid === fid && x.turn === this.S.turn).filter((x) => {
      const a = this.army(x.army);
      const r = a && a.regs.find((y) => y.rid === x.rid);
      return a && r && r.men === x.men && a.node === x.node && a.mp >= x.mp && !a.siege && this.node(x.node).owner === fid;
    });
  },
  undoRecruit(fid, rid) {
    const x = this.undoable(fid).find((y) => y.rid === rid);
    if (!x) return 'لا يمكن التراجع: الوحدة تحركت أو قاتلت أو مضى الدور';
    const a = this.army(x.army), n = this.node(x.node);
    a.regs = a.regs.filter((r) => r.rid !== rid);
    this.f(fid).gold += x.cost;
    n.manpower += x.men;
    this.S.recruitLog = this.S.recruitLog.filter((y) => y !== x);
    if (!a.regs.length && a.hiredTurn === this.S.turn) { /* القائد يبقى: التعيين قرار منفصل */ }
    return null;
  },
});
