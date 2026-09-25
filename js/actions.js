'use strict';
// الأفعال: معاينة النتيجة قبل الدفع، وتراجع للأفعال العادية، وتأكيد صريح للقرارات التي لا رجعة فيها،
// وزر غير متاح يشرح سببه عند الضغط بدل أن يكون رمادياً صامتاً.

// ——— زر فعل: إن كان غير متاح يبقى قابلاً للضغط ويقول لماذا ———
function actBtn(content, o = {}) {
  const off = !!o.err;
  return h('button', {
    class: (o.cls || 'btn') + (off ? ' off' : ''), 'aria-disabled': off ? 'true' : null, title: o.err || o.title || null,
    onclick: (e) => {
      e.stopPropagation();
      if (off) { Help.explain(e.currentTarget, { icon: 'info', title: 'غير متاح الآن', state: 'لا يمكنك تنفيذ هذا الآن لأن ' + o.err.replace(/\.$/, '') + '.' }); return; }
      if (o.onClick) o.onClick(e);
    },
  }, content);
}

Object.assign(Game, {
  // ——— معاينة الضرائب: الفرق في دخل المملكة كلها ———
  previewTax(fid, k) {
    const f = this.f(fid), old = f.tax;
    const before = this.economy(fid).netGold;
    f.tax = k;
    const after = this.economy(fid).netGold;
    f.tax = old;
    return { gold: after - before };
  },

  // ——— معاينة البناء: ماذا يتغير في المدينة بالأرقام ———
  previewBuild(n, b) {
    const B = BUILDINGS[b];
    const lvl = n[b] || 0;
    if (lvl >= B.max) return null;
    const snap = () => ({ inc: this.cityIncome(n), food: this.cityFood(n), sup: this.supplyCap(n, n.owner), st: this.storesMax(n), mpc: this.mpCap(n), mpr: this.mpRegen(n), upk: this.buildUpkeep(n), loy: this.loyaltyTarget(n).target, route: this.routeIncome ? this.routeIncome(n.owner) : 0 });
    const a = snap();
    n[b] = lvl + 1;
    const z = snap();
    n[b] = lvl;
    const cost = B.cost(lvl), time = this.buildTime(b, lvl);
    const gold = (z.inc - a.inc) + (z.route - a.route);
    const upkeep = z.upk - a.upk;
    const net = gold - upkeep;
    const other = [];
    if (z.food !== a.food) other.push(`الطعام ${signed(z.food - a.food)} كل دور`);
    if (z.sup !== a.sup) other.push(`سعة الإمداد ${signed(z.sup - a.sup)} وحدات`);
    if (z.st !== a.st) other.push(`الصمود في الحصار ${signed(z.st - a.st)} أدوار`);
    if (z.mpc !== a.mpc) other.push(`الرجال ${signed(z.mpc - a.mpc)} للحد الأقصى و${signed(z.mpr - a.mpr)} كل دور`);
    if (z.loy !== a.loy) other.push(`الولاء ${signed(z.loy - a.loy)}`);
    const extra = {
      walls: `الاقتحام أصعب: المدافع على السور أقوى ${Math.round(45 * (lvl + 1))}٪ بدل ${Math.round(45 * lvl)}٪.`,
      barracks: 'يفتح الخيالة والمنجنيق هنا، ويدرّب الجيوش المقيمة.',
      roads: 'الحركة من المدينة وإليها أرخص بنقطة لجيوشك.',
      port: 'يفتح الطرق المائية لجيوشك من هنا، ويزيد التجارة.',
      farm: 'نمو السكان أسرع.',
    }[b];
    if (extra) other.push(extra);
    return {
      b, from: lvl, to: lvl + 1, cost, time, gold, upkeep, net,
      incBefore: a.inc, incAfter: z.inc,
      payback: net > 0 ? Math.ceil(cost / net) : null, other,
    };
  },
  // فرص الاستثمار: كل بناء ممكن في مملكتك مرتباً بمدة الاسترداد
  investOptions(fid) {
    const out = [];
    for (const n of this.nodesOf(fid)) for (const b of Object.keys(BUILDINGS)) {
      if (BUILDINGS[b].coastal && !this.hasWater(n)) continue;
      const pv = this.previewBuild(n, b);
      if (!pv) continue;
      out.push({ n, ...pv, err: this.canBuild(fid, n, b) });
    }
    return out.sort((x, y) => (x.payback == null ? 999 : x.payback) - (y.payback == null ? 999 : y.payback));
  },

  // ——— معاينة التجنيد ———
  previewRecruit(fid, n, type, merc) {
    const d = UNITS[type];
    const r = { type, men: d.men, exp: merc ? 1 : 0, merc: !!merc };
    return { cost: this.recruitCost(type, merc), men: d.men, manpower: merc ? 0 : d.men, upkeep: this.unitUpkeep(r), power: Math.round(this.regPower(r)), mpLeft: Math.floor(n.manpower) - (merc ? 0 : d.men) };
  },
});

// ——— التراجع: للأفعال العادية فقط، وما دام لم يتغير شيء يجعله استغلالاً ———
const Undo = {
  stack: [],
  push(e) { e.turn = Game.S.turn; this.stack.push(e); if (this.stack.length > 12) this.stack.shift(); UndoBar.show(); },
  valid(e) { return e && e.turn === Game.S.turn && (!e.valid || e.valid()); },
  top() { while (this.stack.length && !this.valid(this.stack[this.stack.length - 1])) this.stack.pop(); return this.stack[this.stack.length - 1] || null; },
  run() {
    const e = this.top();
    if (!e) return;
    this.stack.pop();
    e.undo();
    Game.validate();
    Game.save();
    UI.toast(`تراجعت: ${e.label}`);
    if (App.scene && App.scene.refresh) App.scene.refresh();
    Sheets.render();
    UndoBar.show();
  },
  clear() { this.stack = []; UndoBar.show(); },
};
const UndoBar = {
  el: null,
  show() {
    const e = Game.S ? Undo.top() : null;
    if (!e) { if (this.el) this.el.hidden = true; return; }
    if (!this.el || !document.body.contains(this.el)) {
      this.el = h('div', { class: 'undo-bar' });
      (App.ui || document.body).appendChild(this.el);
    }
    this.el.hidden = false;
    this.el.innerHTML = '';
    this.el.append(h('span', null, e.label), h('button', { class: 'chip on', onclick: () => Undo.run() }, icon('retreat'), 'تراجع'), h('button', { class: 'chip ghost', title: 'إخفاء', onclick: () => { this.el.hidden = true; } }, icon('close')));
  },
};

// الأفعال القابلة للتراجع
Object.assign(Game, {
  recruitU(fid, n, type, armyId) {
    const err = this.recruit(fid, n, type, armyId);
    if (err) return err;
    const a = this.targetArmy(fid, n, armyId) || this.armiesOfAt(fid, n.id).find((x) => x.regs.length && x.regs[x.regs.length - 1].type === type);
    const r = a && a.regs[a.regs.length - 1];
    const mp0 = a ? a.mp : 0, cost = this.recruitCost(type);
    Undo.push({
      label: `تجنيد ${UNITS[type].name} في ${n.name}`,
      valid: () => a && this.S.armies.includes(a) && a.regs.includes(r) && a.node === n.id && a.mp >= mp0 && r.men === UNITS[type].men && !a.siege,
      undo: () => { a.regs.splice(a.regs.indexOf(r), 1); this.f(fid).gold += cost; n.manpower += UNITS[type].men; },
    });
    return null;
  },
  hireMercU(fid, n, idx, armyId) {
    const m = this.f(fid).mercs[idx];
    const err = this.hireMerc(fid, n, idx, armyId);
    if (err) return err;
    const a = this.armiesOfAt(fid, n.id).find((x) => x.regs.some((r) => r.merc && r.type === m.type && r.men === UNITS[m.type].men));
    const r = a && [...a.regs].reverse().find((x) => x.merc && x.type === m.type);
    const mp0 = a ? a.mp : 0, cost = this.recruitCost(m.type, true);
    Undo.push({
      label: `استئجار مرتزقة ${UNITS[m.type].name}`,
      valid: () => a && this.S.armies.includes(a) && a.regs.includes(r) && a.node === n.id && a.mp >= mp0 && r.men === UNITS[m.type].men,
      undo: () => { a.regs.splice(a.regs.indexOf(r), 1); this.f(fid).gold += cost; this.f(fid).mercs.splice(Math.min(idx, this.f(fid).mercs.length), 0, m); },
    });
    return null;
  },
  buildU(fid, n, b) {
    const err = this.build(fid, n, b);
    if (err) return err;
    const w = n.work;
    Undo.push({
      label: `بدء ${BUILDINGS[b].name} في ${n.name}`,
      valid: () => n.work === w && n.owner === fid,
      undo: () => { n.work = null; n.built = -1; this.f(fid).gold += w.cost; },
    });
    return null;
  },
  hireU(fid, genId, nodeId) {
    const g = this.gen(genId);
    const fee = this.hireFee(g);
    const res = this.hire(fid, genId, nodeId);
    if (res.err) return res;
    const a = res.army, mp0 = a.mp;
    Undo.push({
      label: `تعيين ${g.name} قائداً`,
      valid: () => this.S.armies.includes(a) && !a.regs.length && a.mp >= mp0 && a.node === nodeId && a.gen === g.id,
      undo: () => { this.removeArmy(a); g.status = 'pool'; g.army = null; this.f(fid).gold += fee; },
    });
    return res;
  },
  festivalU(fid, n) {
    const loy0 = n.loyalty, un0 = n.unrest, fest0 = n.festival, cost = this.festivalCost(n);
    const err = this.festival(fid, n);
    if (err) return err;
    const loy1 = n.loyalty;
    Undo.push({
      label: `احتفالات ${n.name}`,
      valid: () => n.owner === fid && n.loyalty === loy1,
      undo: () => { n.loyalty = loy0; n.unrest = un0; n.festival = fest0; this.f(fid).gold += cost; },
    });
    return null;
  },
  trainU(a) {
    const mp0 = a.mp, cost = this.trainCost(a);
    const err = this.train(a);
    if (err) return err;
    Undo.push({
      label: `تدريب جيش ${this.gname(this.armyGen(a))}`,
      valid: () => this.S.armies.includes(a) && a.training && a.mp === 0,
      undo: () => { a.training = false; a.mp = mp0; this.f(a.fid).gold += cost; },
    });
    return null;
  },
});
