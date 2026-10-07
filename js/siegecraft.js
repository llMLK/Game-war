'use strict';
// الحصار والتجهيز:
// - التجنيد (رجال جدد) غير التجهيز (تسليح رجال موجودين داخل المدينة). الحصار يمنع المرتزقة لأنهم يأتون من الخارج،
//   لكنه لا يمنع تسليح من في الداخل ما دامت المعدات هناك.
// - طلب الاستسلام لا يختفي: يبقى الزر ظاهراً مع احتمال القبول، وبعد الرفض ينتظر دورين بسبب مكتوب.

// ما يمكن أن تصير إليه كل وحدة، وما تحتاجه المدينة لذلك
const REEQUIP = {
  spear: [{ to: 'sword', need: 'arms', why: 'تروس وسيوف من ورش المدينة' }, { to: 'cavalry', need: 'horses', why: 'خيل من إسطبلات المدينة' }],
  sword: [{ to: 'cavalry', need: 'horses', why: 'خيل من إسطبلات المدينة' }],
  archer: [{ to: 'horsearcher', need: 'horses', why: 'خيل من إسطبلات المدينة' }],
};
const NEED_NAME = { arms: 'سوقاً أو إسطبلات وورشاً (حدّادون وتروس)', horses: 'إسطبلات وورشاً (الخيل)' };
const SURRENDER_WAIT = 2;

Object.assign(Game, {
  recruitmentConditions(n, merc = false) {
    const siege = !!this.besieger(n.id), disrupted = (n.noRecruit ?? -1) >= this.S.turn;
    const extra = merc ? 0 : (siege ? 0.35 : 0) + (disrupted ? 0.3 : 0);
    return { siege, disrupted, extra, note: [siege && !merc ? 'حصار: تجهيز محلي بتكلفة إضافية 35٪' : null, disrupted && !merc ? 'تعطيل الإمداد: تكلفة إضافية 30٪' : null].filter(Boolean).join('، ') };
  },
  localRecruitCost(type, merc, n) {
    return Math.round(this.recruitCost(type, merc) * (1 + this.recruitmentConditions(n, merc).extra));
  },
  // ——— التجهيز ———
  reequipOptions(a, r) {
    const n = this.node(a.node);
    const out = [];
    for (const o of REEQUIP[r.type] || []) {
      const from = UNITS[r.type], to = UNITS[o.to];
      const newMen = Math.max(5, Math.round(r.men / from.men * to.men));
      const back = Math.max(0, r.men - newMen);
      const cost = Math.round(Math.max(20, Math.round((to.cost - from.cost) * (newMen / to.men)) + 10) * (1 + this.recruitmentConditions(n).extra));
      let err = null;
      if (a.siege || n.owner !== a.fid) err = 'التجهيز يحتاج مدينة لك: الورش والإسطبلات فيها';
      else if (o.need === 'arms' && !n.market && !n.barracks) err = `يحتاج ${NEED_NAME.arms} في ${n.name}`;
      else if (o.need === 'horses' && !n.barracks) err = `يحتاج ${NEED_NAME.horses} في ${n.name}`;
      else if (this.f(a.fid).gold < cost) err = `الذهب لا يكفي (${cost})`;
      out.push({ ...o, from: r.type, newMen, back, cost, err, sieged: !!this.besieger(n.id), upk: this.unitUpkeep({ type: o.to, men: newMen }) - this.unitUpkeep(r) });
    }
    return out;
  },
  reequip(a, idx, to) {
    const r = a.regs[idx];
    if (!r) return 'الوحدة غير موجودة';
    const o = this.reequipOptions(a, r).find((x) => x.to === to);
    if (!o) return 'لا يمكن تجهيزها هكذا';
    if (o.err) return o.err;
    const n = this.node(a.node);
    const before = { type: r.type, men: r.men, exp: r.exp || 0, drill: r.drill || 0 };
    this.f(a.fid).gold -= o.cost;
    r.type = to; r.men = o.newMen; r.exp = Math.max(0, (r.exp || 0) - 1); r.drill = 0;
    n.manpower = Math.min(this.mpCap(n), n.manpower + o.back);
      const mp0 = a.mp;
    if (typeof Undo !== 'undefined') Undo.push({
      label: `تجهيز ${UNITS[before.type].name} إلى ${UNITS[to].name}`,
      valid: () => this.S.armies.includes(a) && a.regs[idx] === r && r.type === to && r.men === o.newMen && a.mp >= mp0,
      undo: () => { Object.assign(r, before); this.f(a.fid).gold += o.cost; n.manpower = Math.max(0, n.manpower - o.back); },
    });
    this.event('mil', `${this.fname(a.fid)} تسلّح ${UNITS[before.type].name} في ${n.name} لتصبح ${UNITS[to].name}.`, { fids: [a.fid], node: n.id, imp: 1 });
    return null;
  },

  // ——— طلب الاستسلام: الاحتمال من حال الحصار لا من الحظ وحده ———
  surrenderOdds(n, fid) {
    const bs = this.besiegers(n.id).filter((b) => b.fid === fid);
    const f = [];
    const add = (label, v) => { if (Math.abs(v) >= 0.01) f.push([label, v]); };
    const enc = bs.length ? this.makeEnc('assault', bs, n.id) : null;
    const { pa, pd } = enc ? this.encPower(enc) : { pa: 1, pd: 1 };
    const ratio = pa / Math.max(1, pd);
    add('الأساس', 0.05);
    add(`ميزان القوة (جيشك ${ratio >= 1 ? 'أقوى ×' + ratio.toFixed(1) : 'أضعف'})`, clamp((ratio - 1.2) * 0.12, -0.1, 0.3));
    const t = this.siegeTurns(n, fid);
    add(`مدة الحصار (${t} أدوار)`, Math.min(0.25, t * 0.05));
    if (n.stores <= 0) add('المجاعة بدأت', 0.3);
    else if (n.stores <= 1) add('المؤن توشك أن تنفد', 0.12);
    const g0 = this.garrisonTarget(n).reduce((s, x) => s + UNITS[x].men, 0), g1 = this.menOf(n.garrison);
    if (g0 && g1 < g0 * 0.6) add(`الحامية فقدت ${Math.round(100 * (1 - g1 / g0))}٪ من رجالها`, 0.12);
    const defs = this.defendersOf(n);
    if (defs.some((d) => d.mood && (d.mood.k === 'shaken' || d.mood.k === 'hungry'))) add('معنويات المدافعين منهارة', 0.1);
    const gens = defs.map((d) => this.armyGen(d)).filter(Boolean);
    if (!gens.length && defs.length === 0) add('لا قائد في المدينة', 0.06);
    if (gens.some((g) => g.trait === 'brave' || g.trait === 'defender')) add('قائد صامد أو شجاع في الداخل', -0.15);
    const relief = this.S.armies.some((x) => x.fid === n.owner && !x.siege && this.adjAll(n.id).includes(x.node) && this.armyPower(x) > this.armyPower(bs[0] || x) * 0.5);
    if (relief) add('نجدة قريبة منهم', -0.15);
    if (n.lastBreach != null && this.S.turn - n.lastBreach <= 1) add('ثغرة فُتحت في السور مؤخراً', 0.12);
    if (n.capital) add('العاصمة لا تُسلَّم بسهولة', -0.15);
    const rep = this.f(fid).rep;
    add(`سمعتك (${Math.round(rep)})`, (rep - 50) / 250);
    const F = this.f(n.owner);
    if (F && F.vendetta && F.vendetta[fid] > 0) add('بينكم دم وثأر', -0.25);
    let p = clamp(f.reduce((s, x) => s + x[1], 0), 0, 0.9);
    return { p, band: oddsBand(p), factors: f };
  },
  // انتظار ما بعد الرفض
  surrenderWait(n, fid) { const w = (n.parleyBy || {})[fid]; return w != null && w > this.S.turn ? w - this.S.turn : 0; },
  canDemandSurrender(n, fid) {
    if (!this.besiegers(n.id).some((b) => b.fid === fid)) return 'لا تحاصرها';
    const w = this.surrenderWait(n, fid);
    if (w) return `رفض أهلها الطلب الأخير. يمكن تقديم طلب جديد بعد ${w === 1 ? 'دور واحد' : w === 2 ? 'دورين' : w + ' أدوار'}`;
    return null;
  },
  // القرار ثابت لنفس الدور والمدينة: لا فائدة من التكرار
  demandSurrender(n, fid) {
    const err = this.canDemandSurrender(n, fid);
    if (err) return { err };
    const o = this.surrenderOdds(n, fid);
    const roll = rng(hashStr(n.id + ':' + fid + ':' + this.S.turn + ':surr'))();
    const ok = roll < o.p;
    if (!ok) {
      n.parleyBy = n.parleyBy || {};
      n.parleyBy[fid] = this.S.turn + SURRENDER_WAIT;
      n.parley = this.S.turn;
    }
    return { ok, odds: o };
  },
});

// عبارة الاحتمال بدل الرقم الدقيق حتى لا يُستغل
function oddsBand(p) {
  if (p < 0.08) return 'غير مقبول';
  if (p < 0.25) return 'ضعيف';
  if (p < 0.45) return 'محتمل';
  if (p < 0.65) return 'جيد';
  return 'مرجح';
}

// المحاصرون يسلّحون رجال مدينتهم؛ لا يستطيع المرتزقة عبور الطوق.
{
  Game.canRecruit = function (fid, n, type, armyId, merc) {
    const unit = UNITS[type];
    if (!unit || n.owner !== fid) return 'الوحدة أو المدينة غير متاحة';
    const conditions = this.recruitmentConditions(n, merc);
    if (merc && conditions.siege) return 'المرتزقة خارج الأسوار؛ فك الحصار أو جنّد من أهل المدينة';
    if (!merc) {
      if (n.unrest > 0 && !conditions.siege && !conditions.disrupted) return `اضطراب محلي (${n.unrest} أدوار): هدّئ أهل المدينة أولاً`;
      if (n.loyalty < 20) return 'الأهالي يرفضون الخدمة؛ ارفع الولاء إلى 20 على الأقل';
      if (unit.needs === 'barracks' && !n.barracks) return 'تحتاج إسطبلات وورشاً لتوفير المعدات';
      if (unit.unique && !this.recruitableTypes(fid, n).includes(type)) return 'تحتاج قائد نخبة هنا';
      if (n.manpower < unit.men) return `رجال المدينة لا يكفون (${Math.floor(n.manpower)}/${unit.men})`;
    }
    const army = this.targetArmy(fid, n, armyId);
    if (!army) return 'عيّن قائداً في المدينة أو أفرغ موضعاً في جيش قائم';
    if (army.regs.length >= MAX_REGS) return 'الجيش مكتمل؛ ادمج الوحدات المتوافقة أو انقل بعضها';
    const cost = this.localRecruitCost(type, merc, n);
    if (this.f(fid).gold < cost) return `تحتاج ${cost} ذهباً${conditions.note ? ' (' + conditions.note + ')' : ''}`;
    return null;
  };
  const recruit = Game.recruit;
  Game.recruit = function (fid, n, type, armyId) {
    const extra = this.localRecruitCost(type, false, n) - this.recruitCost(type, false);
    const result = recruit.call(this, fid, n, type, armyId);
    if (!result) this.f(fid).gold -= extra;
    return result;
  };
  const demand = Game.tryDemandSurrender;
  Game.tryDemandSurrender = function (enc) {
    if (enc.type === 'assault' && this.besiegers(enc.node).some((a) => a.fid === enc.attFid)) return !!this.demandSurrender(this.node(enc.node), enc.attFid).ok;
    return demand.call(this, enc);
  };
}
