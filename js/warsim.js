'use strict';
// محاكاة المعركة بالقيادة: القائد يضع الخطة والتشكيل ويتدخل عند المنعطفات، والمحاكاة تنفّذ
// المعركة على مراحل، مع أحداث تكتيكية، وصفات قادة تغيّر التنفيذ، وتحليل يشرح النتيجة ويروي القصة

const WS_PHASES = [
  { key: 'approach', name: 'الاقتراب', siege: 'الزحف تحت السهام', ticks: 2 },
  { key: 'contact', name: 'الالتحام الأول', siege: 'اقتحام الأسوار', ticks: 2 },
  { key: 'main', name: 'الاشتباك الرئيسي', siege: 'القتال على الأسوار', ticks: 3 },
  { key: 'crisis', name: 'الأزمة', siege: 'حرب الشوارع', ticks: 2 },
  { key: 'collapse', name: 'الحسم والمطاردة', siege: 'الحسم', ticks: 1 },
];
const SECTS = ['L', 'C', 'R'];
const SECT_NAME = { L: 'الجناح الأيسر', C: 'القلب', R: 'الجناح الأيمن', Res: 'الاحتياط' };
const SECT_SIEGE = { L: 'السور الأيسر', C: 'الباب', R: 'السور الأيمن', Res: 'الاحتياط' };
const OPP = { L: 'R', C: 'C', R: 'L' };
const STANCES = {
  hold: { name: 'ثبات', icon: 'shield', desc: 'يثبت ويصدّ: خسائر أقل، ولا يكسب أرضاً.' },
  advance: { name: 'تقدّم', icon: 'arrowUp', desc: 'يضغط على العدو: ضرب أقوى وتعب أكبر.' },
  flank: { name: 'التفاف', icon: 'flank', desc: 'الفرسان يلتفون حول جناح العدو في الاشتباك الرئيسي.' },
  skirmish: { name: 'مناوشة', icon: 'bow', desc: 'يرمي ويتراجع ولا يلتحم إن استطاع.' },
};
const CMD_POS = {
  front: { name: 'في المقدمة', desc: 'معنويات أعلى وأوامر أدق، وخطر أكبر على حياته.', aura: 1.06, morale: 6, risk: 0.035 },
  center: { name: 'مع القلب', desc: 'توازن بين التأثير والأمان.', aura: 1.03, morale: 3, risk: 0.012 },
  rear: { name: 'في المؤخرة', desc: 'آمن تقريباً، لكن تأثيره على الصفوف أقل.', aura: 1.0, morale: 1, risk: 0.002 },
};
const WEATHER = {
  clear: { name: 'صحو', icon: 'sun' },
  rain: { name: 'مطر', icon: 'rain', desc: 'الأوتار المبللة تُضعف الرماة، والوحل يبطئ الانقضاض.' },
  fog: { name: 'ضباب', icon: 'fog', desc: 'الرؤية قليلة: الالتفاف والكمائن أسهل، والسهام أقل دقة.' },
  heat: { name: 'حرّ شديد', icon: 'sun', desc: 'التعب يتضاعف لغير المعتادين.' },
  snow: { name: 'ثلج', icon: 'snow', desc: 'البرد ينهك الجميع ويبطئ الزحف.' },
};

// دور كل وحدة في المحاكاة
function wsRole(type) {
  const d = UNITS[type];
  if (type === 'general') return 'guard';
  if (type === 'catapult') return 'engine';
  if (d.cls === 'cav') return d.range ? 'skirm' : 'cav';
  if (d.range) return 'missile';
  if (type === 'spear' || type === 'militia') return 'line';
  return 'shock';
}
// من يغلب من في الالتحام
const WS_VS = {
  line: { cav: 1.7, skirm: 1.2, shock: 0.85, line: 1, missile: 1.1, guard: 1.3, engine: 1.2 },
  shock: { line: 1.25, missile: 1.3, cav: 0.85, shock: 1, skirm: 1, guard: 1, engine: 1.3 },
  cav: { missile: 1.6, skirm: 1.1, line: 0.6, shock: 1.05, cav: 1, guard: 1, engine: 1.5 },
  skirm: { missile: 1.1, line: 0.7, shock: 0.7, cav: 0.7, skirm: 0.9, guard: 0.7, engine: 1 },
  missile: { line: 0.6, shock: 0.6, cav: 0.6, skirm: 0.7, missile: 0.9, guard: 0.6, engine: 1 },
  guard: { line: 0.95, shock: 1.15, cav: 1.1, skirm: 1.2, missile: 1.4, guard: 1, engine: 1.4 },
  engine: { line: 0.3, shock: 0.3, cav: 0.3, skirm: 0.3, missile: 0.3, guard: 0.3, engine: 0.3 },
};
const FLANK_TERRAIN = { plains: 1.25, desert: 1.15, coast: 1, river: 0.8, hills: 0.85, forest: 0.6, mountains: 0.3 };
const CHARGE_TERRAIN = { plains: 1.25, desert: 1.15, coast: 1.05, river: 0.8, hills: 0.9, forest: 0.6, mountains: 0.5 };

// ——————————————— الخطط ———————————————
// كل خطة تغيّر سلوك المحاكاة، لا مجرد نسبة مئوية
const PLANS = {
  balanced: { name: 'متوازنة', icon: 'scales', desc: 'تقدّم منظم واحتياط حاضر. لا نقاط ضعف واضحة ولا مفاجآت.', good: 'حين لا تعرف العدو جيداً', bad: 'قد تضيع فرصة الحسم' },
  assault: { name: 'هجوم كاسح', icon: 'charge', desc: 'اقتراب سريع تحت السهام والتحام عنيف يهزّ العدو. يُنهك جيشك إن طالت المعركة.', good: 'ضد الرماة والجيوش المهزوزة أو الأضعف', bad: 'ضد جدار الرماح والمدافعين على المرتفع' },
  defensive: { name: 'دفاع صلب', icon: 'shield', defOnly: true, desc: 'صفوف ثابتة ورماة مستعدون. العدو يأتي إليك ويتعب في الطريق.', good: 'حين تكون أضعف أو تملك رماحاً ورماة', bad: 'لا يكسب أرضاً، والاستنزاف بالسهام يؤذيه' },
  flanking: { name: 'التفاف', icon: 'flank', desc: 'الفرسان يدورون حول جناح العدو ليضربوه من الخلف في الاشتباك الرئيسي.', good: 'بخيالة كافية في السهول والصحراء', bad: 'في الغابات والجبال، وأمام الرماح والاحتياط اليقظ' },
  attrition: { name: 'استنزاف وتأخير', icon: 'bow', desc: 'الرماة والخيالة الرماة يُمطرون العدو ويتراجعون قبل الالتحام.', good: 'بالرماة ضد المشاة البطيئة', bad: 'في المطر، وأمام الخيالة السريعة' },
  feigned: { name: 'تقهقر مصطنع', icon: 'retreat', needCav: 2, desc: 'القلب يتظاهر بالانسحاب ليستدرج العدو إلى فخ الفرسان على الجناحين.', good: 'ضد القادة المتهورين والمتكبرين', bad: 'ضد الداهية والمتردد؛ وقد يتحول التظاهر إلى هزيمة حقيقية' },
  highground: { name: 'التمسك بالمرتفع', icon: 'hill', defOnly: true, terrain: ['hills', 'mountains'], desc: 'تثبت فوق المرتفع: رماتك أبعد مدى، والصاعدون يتعبون.', good: 'حين تدافع في التلال أو الجبال', bad: 'لا مطاردة للعدو المنهزم' },
  breakcenter: { name: 'كسر القلب', icon: 'arrowUp', desc: 'أقوى مشاتك في القلب والاحتياط خلفه: إن انكسر قلب العدو انقسم جيشه.', good: 'بمشاة صدام قوية', bad: 'جناحاك رقيقان أمام الالتفاف' },
  hunt: { name: 'استهداف القائد', icon: 'target', needCav: 1, desc: 'فرقة من نخبة الفرسان تتربص لتنقضّ على قائد العدو.', good: 'حين يقاتل قائد العدو في المقدمة', bad: 'فرقة الصيد تغيب عن الصفوف، وقد تُباد' },
  // اقتحام الأسوار
  storm: { name: 'اقتحام البوابة', icon: 'ram', siege: 'att', needEquip: 'ram', desc: 'الكبش إلى البوابة وخيرة الرجال خلفه. سريع ودموي.', good: 'حين تكون البوابة الأضعف', bad: 'الزيت والسهام على الكبش' },
  escalade: { name: 'التسلق من كل الجهات', icon: 'ladder', siege: 'att', needEquip: 'ladders', desc: 'سلالم على طول السور: تشتت المدافعين، وخسائر ثقيلة.', good: 'بعدد كبير ضد حامية قليلة', bad: 'الأسوار العالية' },
  towers: { name: 'أبراج الحصار', icon: 'tower', siege: 'att', needEquip: 'tower', desc: 'البرج يلتصق بالسور ويفتح معبراً آمناً. بطيء لكنه أقل كلفة.', good: 'أمام الأسوار العالية', bad: 'قد يُحرق البرج قبل وصوله' },
  bombard: { name: 'قصف ثم اقتحام', icon: 'catapult', siege: 'att', needCat: true, desc: 'المنجنيق يفتح الثغرات أولاً، ثم الاقتحام.', good: 'بالمنجنيق وصبر', bad: 'قد يخرج المدافعون لإحراق الآلات' },
  night: { name: 'هجوم ليلي', icon: 'eye', siege: 'att', needTrait: ['tactician', 'swift'], desc: 'مباغتة في الظلام: رماة الأسوار لا يرون، لكن الفوضى تربك الأوامر.', good: 'بقائد داهية أو سريع', bad: 'الفوضى وضياع الأوامر' },
  starve: { name: 'مواصلة الحصار', icon: 'tent', siege: 'att', desc: 'لا اقتحام اليوم: الجوع يعمل لصالحك.', good: 'حين تنفد مؤنهم قريباً', bad: 'الوقت يمنح المدافعين فرصة للنجدة' },
  walls: { name: 'الدفاع عن الأسوار', icon: 'wall', siege: 'def', desc: 'كل رجل على السور، والرماة في الأبراج.', good: 'دائماً تقريباً', bad: 'إن سقط السور تبعثرت الصفوف' },
  depth: { name: 'الدفاع بالعمق', icon: 'castle', siege: 'def', desc: 'تتنازل عن السور تدريجياً وتقاتل في الشوارع والقلعة.', good: 'بأسوار عالية وقلعة', bad: 'المهاجم يدخل أسرع' },
  sally: { name: 'الخروج لإحراق المعدات', icon: 'fire', siege: 'def', desc: 'قوة تخرج من البوابة لتحرق الأبراج والكباش قبل الهجوم.', good: 'حين يعتمد العدو على برج أو كبش', bad: 'قد تُحاصر القوة الخارجة وتُباد' },
};

class WarSim {
  constructor(cfg) {
    this.cfg = cfg;
    this.r = rng((cfg.seed || 7) >>> 0);
    this.kind = cfg.kind || 'field';
    this.terrain = cfg.terrain || 'plains';
    this.weather = cfg.weather || 'clear';
    this.walls = this.kind === 'siege' ? (cfg.walls || 0) : 0;
    this.equip = { ...(cfg.equip || {}) };
    this.place = cfg.title || '';
    this.phase = -1; this.tick = 0; this.over = false; this.winner = null; this.reason = null;
    this.lines = [];
    this.cues = [];
    this.decisions = [];
    this.track = [];
    this.pending = [];
    this.moments = [];
    this.sides = cfg.sides.map((s, i) => this.makeSide(s, i));
    for (const s of this.sides) s.foe = this.sides[1 - s.i];
    this.siegeSetup();
  }

  // ——————————— الإعداد ———————————
  makeSide(s, i) {
    const side = {
      i, fid: s.fid, name: s.name, color: s.color, player: !!s.player, ai: s.ai == null ? 0.6 : s.ai,
      att: i === 0, units: [], plan: null, cmdPos: 'center', intel: s.intel == null ? 3 : s.intel,
      gens: (s.gens || []).filter(Boolean).slice().sort((a, b) => b.rank - a.rank),
      mood: s.mood || 0, ledger: {}, killed: 0, men0: 0, withdrew: false, orders: 0, aggr: s.aggr || 1,
      // الجاهزية القادمة من الحملة: تعب ومعنويات وسهام وتماسك وإمداد (تبقى بين المعارك)
      ready: { fat: 0, mor: 70, ammo: 100, coh: 100, sup: 100, ...(s.ready || {}) }, commit: s.commit || 1,
      buffs: {}, cmdLog: [], used: {},
    };
    side.fortune = 0.88 + this.r() * 0.24;
    side.cmd = side.gens[0] || null;
    if (side.cmd && side.cmd.wounded) { side.cmdWounded = true; side.cmdHurt = true; }
    side.sub = { L: side.gens[1] || null, R: side.gens[2] || null, C: null };
    let k = 0;
    for (const r of s.regs) {
      if (!r || r.men <= 0) continue;
      // جيش يحاصر ويقاتل دون فكّ الحصار: جزء منه يبقى على خطوط الحصار
      const men = side.commit < 1 ? Math.max(1, Math.round(r.men * side.commit)) : r.men;
      const u = this.makeUnit(side, r.type, men, r.exp || 0, r, k++);
      u.held = r.men - men;
      side.units.push(u);
    }
    for (const g of side.gens) side.units.push(this.makeUnit(side, 'general', g.men || (12 + 4 * g.rank), 2, null, k++, g));
    side.men0 = side.units.reduce((t, u) => t + u.men, 0);
    side.sec = {};
    for (const key of [...SECTS, 'Res']) side.sec[key] = { key, stance: 'hold', morale: 70, fat: 0, front: 0, state: 'ok', flanked: false, breach: 0, wavered: false };
    return side;
  }
  makeUnit(side, type, men, exp, ref, k, gen) {
    const d = UNITS[type];
    return {
      id: side.i + ':' + k, side: side.i, type, role: wsRole(type), men, men0: men, exp, ref, gen: gen || null,
      hp: d.hp, atk: d.atk, def: d.def, missile: d.missile || 0, charge: d.charge || 0, armor: d.armor || 0,
      ammo: d.range ? Math.round((type === 'catapult' ? 8 : d.cls === 'cav' ? 4 : 5) * side.ready.ammo / 100) : 0, sec: 'C', state: 'ok', kills: 0, fordFree: !!d.fordFree,
    };
  }
  siegeSetup() {
    if (this.kind !== 'siege') return;
    const def = this.sides[1];
    // عدم وجود وسائل: لا ثغرة ممكنة
    const cat = this.sides[0].units.some((u) => u.type === 'catapult');
    this.noMeans = !this.equip.ram && !this.equip.ladders && !this.equip.tower && !cat;
    this.gateHP = 1;
    this.towerAt = null;
    this.ramAlive = !!this.equip.ram;
    this.towerAlive = !!this.equip.tower;
    for (const k of SECTS) def.sec[k].breach = 0;
  }

  alive(u) { return u.state !== 'dead' && u.state !== 'rout' && u.men > 0; }
  secUnits(side, key) { return side.units.filter((u) => u.sec === key && this.alive(u)); }
  secMen(side, key) { return this.secUnits(side, key).reduce((t, u) => t + u.men, 0); }
  totalMen(side) { return side.units.filter((u) => u.men > 0 && u.state !== 'dead').reduce((t, u) => t + u.men, 0); }
  liveMen(side) { return side.units.filter((u) => this.alive(u)).reduce((t, u) => t + u.men, 0); }
  genOf(side, key) { if (key === 'C' || key === 'Res') return side.cmd; return side.sub[key] || null; }
  hasTrait(g, t) { return !!(g && g.trait === t); }
  // أمر نافذ في هذه المرحلة
  bf(side, k) { const b = side.buffs[k]; return b && this.phase <= b.until ? b : null; }
  // التماسك: جيش خرج من معركة للتو ينكسر أسرع وينفذ الأوامر بدقة أقل
  cohK(side) { return (100 - side.ready.coh) / 100; }
  cmdTrait(side, t) { return this.hasTrait(side.cmd, t); }
  phaseKey() { return this.phase >= 0 ? WS_PHASES[this.phase].key : 'setup'; }
  secName(key) { return (this.kind === 'siege' ? SECT_SIEGE : SECT_NAME)[key]; }
  // اسم قطاع السور من منظور الناظر (يسار المهاجم يقابل يمين المدافع)
  wallName(defKey, viewer) { return SECT_SIEGE[viewer && viewer.att ? OPP[defKey] : defKey]; }

  // الخطط المتاحة لكل جانب
  availablePlans(side) {
    const out = [];
    for (const [k, p] of Object.entries(PLANS)) {
      if (this.kind === 'siege') {
        if (p.siege !== (side.att ? 'att' : 'def')) continue;
      } else if (p.siege) continue;
      if (p.defOnly && side.att) continue;
      if (p.terrain && !p.terrain.includes(this.terrain)) continue;
      if (p.needCav && side.units.filter((u) => (u.role === 'cav' || u.role === 'skirm') && u.men > 0).length < p.needCav) continue;
      if (p.needEquip && !this.equip[p.needEquip]) continue;
      if (p.needCat && !side.units.some((u) => u.type === 'catapult')) continue;
      if (p.needTrait && !side.gens.some((g) => p.needTrait.includes(g.trait))) continue;
      if (k === 'sally' && !side.units.some((u) => u.role === 'cav' || u.role === 'shock' || u.role === 'guard')) continue;
      out.push(k);
    }
    return out;
  }
  // هل تناسب الخطة القائد؟
  affinity(side, plan) {
    const t = side.cmd && side.cmd.trait, f = side.cmd && side.cmd.flaw;
    const map = { tactician: ['flanking', 'feigned', 'night', 'hunt'], brave: ['assault', 'breakcenter', 'storm'], cavalier: ['flanking', 'hunt', 'feigned'], archer: ['attrition', 'defensive', 'walls'], siege: ['storm', 'towers', 'bombard', 'escalade'], defender: ['defensive', 'highground', 'walls', 'depth'], mountaineer: ['highground', 'flanking'], desert: ['attrition', 'flanking'], swift: ['night', 'flanking', 'attrition'], logistician: ['attrition', 'depth'] };
    let a = (map[t] || []).includes(plan) ? 1 : 0;
    if (f === 'reckless' && ['defensive', 'highground', 'feigned', 'attrition'].includes(plan)) a = -1;
    if (f === 'cautious' && ['assault', 'hunt', 'storm'].includes(plan)) a = -1;
    return a;
  }

  // ——————————— التشكيل التلقائي حسب الخطة ———————————
  autoFormation(side, plan) {
    side.plan = plan;
    const us = side.units.filter((u) => u.men > 0);
    const pw = (u) => this.unitMelee(u) + u.men * u.missile * 2;
    for (const u of us) u.sec = null;
    const guards = us.filter((u) => u.role === 'guard');
    for (const g of guards) g.sec = g.gen === side.sub.L ? 'L' : g.gen === side.sub.R ? 'R' : 'C';
    const siegeAtt = this.kind === 'siege' && side.att;
    const siegeDef = this.kind === 'siege' && !side.att;
    for (const e of us.filter((u) => u.role === 'engine')) e.sec = siegeAtt ? 'C' : 'Res';
    const rest = us.filter((u) => !u.sec).sort((a, b) => pw(b) - pw(a));
    // الاحتياط
    let resCount = rest.length >= 8 ? 2 : rest.length >= 4 ? 1 : 0;
    // القائد الحذر يحتفظ باحتياط أكبر
    if (side.cmd && side.cmd.flaw === 'cautious' && rest.length >= 6) resCount++;
    if (plan === 'escalade' || plan === 'attrition') resCount = Math.max(0, resCount - 1);
    if (plan === 'depth' || plan === 'sally') resCount = Math.min(Math.max(0, rest.length - 3), resCount + 1);
    // فرقة الصيد: أفضل وحدة فرسان تنتظر في الاحتياط
    if (plan === 'hunt') {
      const hunter = rest.find((u) => u.role === 'cav') || rest.find((u) => u.role === 'skirm');
      if (hunter) { hunter.sec = 'Res'; hunter.hunter = true; }
    }
    const resPref = plan === 'feigned' ? ['shock', 'line', 'cav'] : plan === 'sally' ? ['cav', 'shock'] : ['shock', 'cav', 'line'];
    for (const role of resPref) {
      for (const u of rest) { if (resCount <= 0) break; if (!u.sec && u.role === role) { u.sec = 'Res'; resCount--; } }
    }
    // حصص القطاعات من القوة
    let share = { L: 0.28, C: 0.44, R: 0.28 };
    if (plan === 'breakcenter') share = { L: 0.2, C: 0.6, R: 0.2 };
    if (siegeAtt) {
      if (plan === 'storm') share = { L: 0.22, C: 0.56, R: 0.22 };
      else if (plan === 'towers') { side.towerSector = side.towerSector || (this.r() < 0.5 ? 'L' : 'R'); share = { L: 0.22, C: 0.22, R: 0.22 }; share[side.towerSector] = 0.56; }
      else if (plan === 'bombard') share = { L: 0.25, C: 0.5, R: 0.25 };
      else share = { L: 0.33, C: 0.34, R: 0.33 };
    }
    if (siegeDef) share = { L: 0.3, C: 0.4, R: 0.3 };
    // الفرسان إلى الجناحين
    const cavs = rest.filter((u) => !u.sec && (u.role === 'cav' || u.role === 'skirm'));
    if (!siegeAtt && !siegeDef) {
      if (plan === 'flanking') {
        side.flankWing = side.flankWing || (this.r() < 0.5 ? 'L' : 'R');
        cavs.forEach((u) => { u.sec = side.flankWing; });
      } else {
        let lw = 0, rw = 0;
        for (const u of cavs) { if (lw <= rw) { u.sec = 'L'; lw += pw(u); } else { u.sec = 'R'; rw += pw(u); } }
      }
    } else cavs.forEach((u) => { u.sec = siegeDef ? 'Res' : null; });
    // البقية بالتوازن حسب الحصص
    const load = { L: 0, C: 0, R: 0 };
    for (const u of us) if (load[u.sec] != null) load[u.sec] += pw(u);
    const total = rest.filter((u) => u.sec !== 'Res').reduce((t, u) => t + pw(u), 0) + guards.reduce((t, u) => t + pw(u), 0);
    const missiles = rest.filter((u) => !u.sec && u.role === 'missile');
    const melee = rest.filter((u) => !u.sec && u.role !== 'missile');
    for (const u of [...melee, ...missiles]) {
      let best = 'C', bd = -1e9;
      for (const k of SECTS) {
        const d = share[k] * total - load[k];
        if (d > bd) { bd = d; best = k; }
      }
      u.sec = best; load[best] += pw(u);
    }
    for (const u of us) if (!u.sec) u.sec = 'C';
    // الوضعيات
    const st = side.sec;
    for (const k of SECTS) st[k].stance = 'hold';
    if (siegeAtt || plan === 'assault') for (const k of SECTS) st[k].stance = 'advance';
    else if (plan === 'balanced') for (const k of SECTS) st[k].stance = side.att ? 'advance' : 'hold';
    else if (plan === 'flanking') { st[side.flankWing].stance = 'flank'; st.C.stance = side.att ? 'advance' : 'hold'; }
    else if (plan === 'attrition') for (const k of SECTS) st[k].stance = 'skirmish';
    else if (plan === 'breakcenter' || plan === 'hunt') st.C.stance = 'advance';
    else if (plan === 'feigned') { st.L.stance = st.R.stance = 'hold'; }
    // موقع القائد
    const f = side.cmd && side.cmd.flaw, t = side.cmd && side.cmd.trait;
    side.cmdPos = f === 'reckless' || t === 'brave' || plan === 'assault' || plan === 'breakcenter' ? 'front' : f === 'cautious' || t === 'merchant' ? 'rear' : 'center';
    if (siegeDef) side.cmdPos = t === 'defender' ? 'front' : 'center';
    if (plan === 'attrition') for (const u of us) if (u.missile) u.ammo += 3;
  }

  // ——————————— المعنويات الأولى ———————————
  initMorale(side) {
    let m = 68 + side.mood;
    const g = side.cmd;
    const R0 = side.ready;
    m += (R0.mor - 70) * 0.3 - (100 - R0.sup) / 10;
    if (side.cmdHurt) m -= 5;
    if (g) {
      // النجوم خبرة تثبّت الصفوف، لا قوة ضرب إضافية
      m += (g.rank - 1) * 2;
      if (g.style === 'inspiring') m += 4;
      if (g.trait === 'brave') m += 10;
      if (g.trait === 'defender' && this.kind === 'siege' && !side.att) m += 10;
      if (g.trait === 'merchant') m -= 5;
      if (g.vendetta && g.vendetta === side.foe.fid) m += 8;
    } else m -= 8;
    m += CMD_POS[side.cmdPos].morale;
    if (side.plan === 'defensive' || side.plan === 'highground') m += 2;
    if (this.kind === 'siege' && !side.att && this.cfg.stores != null && this.cfg.stores < 0) m -= 15;
    if (this.kind === 'siege' && !side.att && this.cfg.capital) m += 6;
    m += (this.r() - 0.5) * 12;
    m = clamp(m, 35, 96);
    for (const k of [...SECTS, 'Res']) side.sec[k].morale = m;
    side.morale0 = m;
  }

  // ——————————— التشغيل ———————————
  begin() {
    for (const s of this.sides) {
      if (!s.plan) this.autoFormation(s, this.aiPlan(s));
      this.initMorale(s);
      // جزء من تعب الأيام السابقة يظهر في أول المعركة
      for (const k of [...SECTS, 'Res']) s.sec[k].fat = clamp(s.ready.fat * 0.6, 0, 90);
      for (const k of SECTS) s.sec[k].had = this.secUnits(s, k).length > 0;
      if (s.cmdHurt && s.cmdPos === 'front') s.cmdPos = 'center';
    }
    if (this.kind === 'siege') {
      const a = this.sides[0];
      this.towerSector = a.towerSector || SECTS.reduce((b, k) => (this.secMen(a, k) > this.secMen(a, b) ? k : b), 'C');
      this.catTarget = OPP[SECTS.reduce((b, k) => (this.secMen(a, k) > this.secMen(a, b) ? k : b), 'C')];
      if (a.plan === 'starve') { this.over = true; this.winner = null; this.reason = 'starve'; return; }
      if (this.noMeans) this.line(null, 'لا وسيلة لاختراق الأسوار: لا كبش ولا سلالم ولا برج ولا منجنيق.', 'bad');
    }
    this.terrainNotes();
    this.phase = 0; this.tick = 0;
    this.openPhase();
  }

  line(side, text, tone = '', key) {
    const e = { phase: this.phase, tick: this.tick, side: side ? side.i : null, text, tone, key: key || null };
    this.lines.push(e);
    return e;
  }
  cue(c) { this.cues.push(c); }
  led(side, k, v) { side.ledger[k] = (side.ledger[k] || 0) + v; }
  moment(side, text, weight, kind) { this.moments.push({ phase: this.phase, side: side ? side.i : null, text, weight, kind }); }

  terrainNotes() {
    const [a, d] = this.sides;
    const t = this.terrain;
    const notes = [];
    if (this.kind === 'field') {
      if ((t === 'hills' || t === 'mountains') && d.plan === 'highground') notes.push([d, 'highground', 'المدافع يمسك المرتفع: سهامه أبعد والصاعدون يتعبون']);
      if (t === 'river') notes.push([d, 'river', 'النهر يُضعف المهاجمين العابرين في الالتحام الأول']);
      if (t === 'forest') notes.push([null, 'forest', 'الغابة تكسر انقضاض الخيالة وتحجب السهام']);
      if (t === 'mountains') notes.push([null, 'pass', 'الممر الضيق يُلغي التفوق العددي']);
      if (t === 'plains') notes.push([null, 'plains', 'السهول المكشوفة ميدان الفرسان']);
      if (t === 'desert') notes.push([null, 'desert', 'الصحراء تُنهك غير المعتادين عليها']);
    }
    if (this.weather !== 'clear') notes.push([null, 'weather', WEATHER[this.weather].desc]);
    this.tnotes = notes;
  }

  openPhase() {
    const ph = WS_PHASES[this.phase];
    this.line(null, (this.kind === 'siege' ? ph.siege : ph.name), 'phase');
    // تأثيرات بداية المرحلة
    for (const s of this.sides) this.phaseStart(s, ph.key);
  }

  phaseStart(s, key) {
    const foe = s.foe;
    if (key === 'approach') {
      if (s.plan === 'assault') this.line(s, `${s.name} تندفع بسرعة لتقليل وقت السهام.`, s.player ? 'good' : '');
      if (s.plan === 'attrition') this.line(s, `رماة ${s.name} ينتشرون ويبدؤون المناوشة.`, '');
      if (s.plan === 'night') { this.line(s, `هجوم ليلي! رماة الأسوار لا يرون أهدافهم.`, s.player ? 'good' : 'bad'); for (const k of SECTS) foe.sec[k].morale -= 8; }
      if (s.plan === 'sally') this.resolveSally(s);
    }
    if (key === 'contact') {
      for (const k of SECTS) if (s.sec[k].stance === 'flank' && s.sec[k].state === 'ok') this.resolveFlank(s, k);
      if (s.plan === 'feigned') this.resolveFeint(s);
      if (s.plan === 'hunt') this.resolveHunt(s, 0.85);
    }
    if (key === 'main') {
      if (s.plan === 'hunt' && !s.huntDone) this.resolveHunt(s, 1);
      // الذكاء: زجّ الاحتياط في الهجوم الكاسح وكسر القلب
      if ((s.plan === 'assault' || s.plan === 'breakcenter') && this.secUnits(s, 'Res').length) this.commitReserve(s, s.plan === 'breakcenter' ? 'C' : this.weakestFoeFacing(s), 'auto');
    }
  }
  weakestFoeFacing(s) {
    let best = 'C', bm = 1e9;
    for (const k of SECTS) { const m = this.secMen(s.foe, OPP[k]) * (s.foe.sec[OPP[k]].morale / 100); if (m < bm && s.sec[k].state === 'ok') { bm = m; best = k; } }
    return best;
  }

  // ——— قوة الالتحام ———
  unitMelee(u) {
    const hpF = u.hp / 10;
    return u.men * (u.atk + u.def * 0.6) * hpF * (1 + 0.1 * (u.exp || 0));
  }
  tough(u) { return u.hp * (1 + u.def / 12); }
  secComp(side, key) {
    const us = this.secUnits(side, key);
    const men = us.reduce((t, u) => t + u.men, 0) || 1;
    const c = {};
    for (const u of us) c[u.role] = (c[u.role] || 0) + u.men / men;
    return c;
  }
  frontage(key) {
    if (this.terrain === 'mountains' && this.kind === 'field') return key === 'C' ? 2 : 1;
    return 3;
  }
  depth(side, key) { return Math.max(0, this.secUnits(side, key).filter((u) => u.role !== 'engine').length - this.frontage(key)); }
  // وحدات القتال الفعلي (الواجهة محدودة في الممرات)
  fighting(side, key) {
    const us = this.secUnits(side, key).filter((u) => u.role !== 'engine' && !(side.sec[key].stance === 'skirmish' && (u.role === 'missile' || u.role === 'skirm')));
    const cap = this.frontage(key);
    if (us.length <= cap) return us;
    return us.sort((a, b) => this.unitMelee(b) - this.unitMelee(a)).slice(0, cap);
  }

  mods(side, key, kind) {
    // kind: 'melee' | 'missile'
    let m = 1;
    const sec = side.sec[key];
    const g = this.genOf(side, key);
    const ph = this.phaseKey();
    const t = this.terrain;
    m *= 0.55 + 0.45 * clamp(sec.morale, 0, 100) / 100;
    m *= 1 - clamp(sec.fat, 0, 100) / 230;
    if (kind === 'melee') {
      if (sec.stance === 'advance') m *= 1.08;
      if (sec.stance === 'hold') m *= 0.96;
      if (t === 'mountains' && !side.att && this.kind === 'field') m *= 1.15;
      if (sec.flanked) m *= 0.85;
      if (side.plan === 'assault') m *= ph === 'contact' ? 1.12 : ph === 'main' ? 1.05 : ph === 'crisis' || ph === 'collapse' ? 0.92 : 1;
      if (side.plan === 'defensive' && ph === 'contact') m *= 1.04;
      if (side.plan === 'breakcenter' && key === 'C' && (ph === 'contact' || ph === 'main')) m *= 1.1;
      if (side.plan === 'highground') m *= 1.05;
      if (side.plan === 'depth') m *= ph === 'crisis' || ph === 'collapse' ? 1.35 : 0.88;
      if (side.plan === 'night' && side.att) m *= 1.08;
      if (t === 'river' && side.att && ph === 'contact' && !this.cmdTrait(side, 'naval')) m *= 0.84;
      if (!side.att && this.kind === 'field' && (t === 'hills' || t === 'mountains')) m *= 1.04;
      if (this.kind === 'siege') {
        const def = this.sides[1];
        const br = def.sec[side.att ? OPP[key] : key].breach >= 1;
        if (side.att && !br) {
          const tower = this.towerAlive && this.towerDocked && key === this.towerSector;
          m *= tower ? 0.85 : (this.equip.ladders || this.equip.ram) ? 0.42 : 0.12;
        }
        if (!side.att) m *= br ? 1.12 : 1 + 0.45 * this.walls;
        if (!side.att && (ph === 'crisis' || ph === 'collapse') && this.walls >= 3) m *= 1.15;
      }
    } else {
      if (!side.att && this.kind === 'siege') m *= 1 + 0.25 * this.walls;
      if (side.plan === 'highground') m *= 1.15;
      if (side.plan === 'defensive' && ph === 'approach') m *= 1.1;
      if (side.plan === 'attrition') m *= 1.15;
      if (this.weather === 'rain') m *= 0.6;
      if (this.weather === 'fog') m *= 0.7;
      if (side.foe.plan === 'night' && !side.att) m *= 0.55;
      if (this.cmdTrait(side, 'archer')) m *= 1.2;
    }
    m *= side.fortune;
    // القائد والقادة الفرعيون
    if (side.cmd && side.cmdAlive !== false && (key === 'C' || side.cmdPos === 'front')) m *= CMD_POS[side.cmdPos].aura;
    if (g) {
      if (g.trait === 'brave') m *= 1.05;
      if (g.trait === 'merchant') m *= 0.95;
      if (g.trait === 'mountaineer' && (t === 'hills' || t === 'mountains')) m *= 1.15;
      if (g.trait === 'desert' && t === 'desert') m *= 1.12;
      if (g.trait === 'naval' && t === 'river') m *= 1.1;
      if (g.trait === 'defender' && !side.att && this.kind === 'siege') m *= 1.15;
      if (g.vendetta && g.vendetta === side.foe.fid) m *= 1.06;
      // الأرض المفضلة للقائد (من ملفه) إن لم تغطها موهبته أصلاً
      if (g.terrain && g.terrain.includes(t) && !['mountaineer', 'desert', 'naval'].includes(g.trait)) m *= 1.05;
    }
    if (kind === 'melee') {
      const pr = this.bf(side, 'press');
      if (pr) m *= pr.mul;
    } else if (this.bf(side, 'volley')) m *= 1.3;
    return m;
  }

  // ——————————— خطوة (نبضة) ———————————
  step() {
    if (this.over) return;
    this.cues = [];
    const ph = this.phaseKey();
    const [A, B] = this.sides;
    const before = [this.liveMen(A), this.liveMen(B)];
    this.volleys(ph);
    if (ph === 'contact' && this.tick === 0) this.charges();
    if (ph !== 'approach') this.melee(ph);
    if (this.kind === 'siege') this.siegeTick(ph);
    this.fatigue(ph);
    this.commanderRisk(ph);
    this.moraleChecks();
    this.interrupts();
    const after = [this.liveMen(A), this.liveMen(B)];
    this.lastLoss = [before[0] - after[0], before[1] - after[1]];
    this.checkEnd();
    this.tick++;
  }

  // هل انتهت المرحلة؟
  phaseDone() { return this.tick >= WS_PHASES[this.phase].ticks + this.extraTicks(); }
  extraTicks() {
    const ph = this.phaseKey();
    if (ph === 'approach' && this.sides.some((s) => s.plan === 'attrition' || s.plan === 'bombard')) return 1;
    if (ph === 'approach' && this.sides.some((s) => s.plan === 'assault' && s.att)) return -1;
    return 0;
  }
  // الانتقال إلى المرحلة التالية (تُرجع أحداثاً تحتاج قراراً)
  endPhase() {
    const [A, B] = this.sides;
    this.track.push({ phase: this.phase, m: [this.avgMorale(A), this.avgMorale(B)], men: [this.liveMen(A), this.liveMen(B)] });
    if (this.over) return [];
    if (this.kind === 'siege' && this.phaseKey() === 'main' && !SECTS.some((k) => B.sec[k].breach >= 1)) {
      this.finish(1, 'repelled');
      this.line(A, 'لم تُفتح ثغرة واحدة: المهاجمون يتراجعون عن الأسوار.', A.player ? 'bad' : 'good');
      return [];
    }
    if (this.phase >= WS_PHASES.length - 1) { this.decideByScore(); return []; }
    const evs = [];
    for (const s of this.sides) {
      const e = this.findEvent(s);
      if (!e) continue;
      if (s.player) evs.push(e);
      else this.choose(e, this.aiChoose(s, e));
    }
    this.pending = evs;
    this.awaitNext = true;
    return evs;
  }
  // بعد القرارات: المرحلة التالية
  nextPhase() {
    this.awaitNext = false;
    this.pending = [];
    if (this.over) return;
    this.phase++; this.tick = 0;
    for (const s of this.sides) s.cp = this.cmdPoints(s);
    this.openPhase();
    for (const s of this.sides) if ((!s.player || this.autoAll) && !this.over) this.aiOrders(s);
  }

  avgMorale(s) {
    let t = 0, w = 0;
    for (const k of SECTS) { const men = this.secMen(s, k); if (!men) continue; t += Math.max(0, s.sec[k].morale) * men; w += men; }
    return w ? t / w : 0;
  }

  // ——— السهام ———
  volleys(ph) {
    for (const s of this.sides) {
      const foe = s.foe;
      for (const k of [...SECTS, 'Res']) {
        let us = this.secUnits(s, k).filter((u) => u.missile && u.type !== 'catapult');
        if (!us.length) continue;
        if (this.terrain === 'mountains' && this.kind === 'field') us = us.slice(0, k === 'C' ? 2 : 1);
        if (k === 'Res' && ph !== 'approach') continue;
        let pow = 0;
        const vo = this.bf(s, 'volley');
        for (const u of us) {
          const ammo = u.ammo > 0 ? 1 : 0.2;
          const rate = u.type === 'repeater' ? 1.6 : 1;
          const melee = (ph === 'main' || ph === 'crisis' || ph === 'collapse') && s.sec[k].stance !== 'skirmish' && !vo && u.role === 'missile' ? 0.5 : 1;
          pow += u.men * u.missile * rate * ammo * melee * (1 + 0.1 * u.exp);
          if (u.ammo > 0) u.ammo -= vo && u.ammo > 1 ? 2 : 1;
          if (u.ammo === 0 && !u.outWarned) { u.outWarned = true; s.ammoOut = (s.ammoOut || 0) + 1; }
        }
        pow *= this.mods(s, k, 'missile');
        const tk = OPP[k === 'Res' ? 'C' : k];
        const tgt = this.secUnits(foe, tk).length ? tk : SECTS.find((x) => this.secUnits(foe, x).length);
        if (!tgt) continue;
        let kill = pow * 0.022;
        // الصفوف الثابتة هدف سهل للمستنزِفين
        if (s.plan === 'attrition' && (foe.plan === 'defensive' || foe.plan === 'highground' || foe.plan === 'walls')) kill *= 1.25;
        if (this.terrain === 'forest') kill *= 0.72;
        if (this.kind === 'siege' && s.att && foe.sec[tgt].breach < 1) kill *= 0.5;
        const menT = this.secMen(foe, tgt);
        const dealt = this.applyLoss(foe, tgt, kill, 'missile');
        foe.sec[tgt].morale -= dealt / Math.max(1, menT) * 70;
        this.led(s, 'missile', dealt);
        if (s.plan === 'highground' || (!s.att && this.kind === 'siege')) this.led(s, this.kind === 'siege' ? 'walls' : 'highground', dealt * 0.4);
        if (dealt > 0) this.cue({ t: 'volley', side: s.i, from: k, to: tgt, n: Math.min(8, 2 + dealt / 6) });
      }
      // المنجنيق
      const cats = s.units.filter((u) => u.type === 'catapult' && this.alive(u) && u.ammo > 0);
      if (cats.length && ph !== 'crisis' && ph !== 'collapse') {
        for (const c of cats) c.ammo--;
        const tgt = this.kind === 'siege' && s.att ? (this.catTarget || 'C') : (this.secUnits(foe, 'C').length ? 'C' : SECTS.find((x) => this.secUnits(foe, x).length) || 'C');
        const dealt = this.applyLoss(foe, tgt, cats.length * 3.2, 'missile');
        this.led(s, 'missile', dealt);
        if (this.kind === 'siege' && s.att) {
          const add = cats.length * (s.plan === 'bombard' ? 0.12 : 0.07) * (this.cmdTrait(s, 'siege') ? 1.5 : 1) / (1 + 0.25 * this.walls);
          this.addBreach(tgt, add, 'catapult');
        }
        this.cue({ t: 'stone', side: s.i, to: tgt, n: cats.length });
      }
    }
  }

  // الخسائر على قطاع: توزيع حسب الانكشاف
  applyLoss(side, key, men, cause, list) {
    const us = list ? list.filter((u) => this.alive(u)) : this.secUnits(side, key);
    if (!us.length || men <= 0) return 0;
    const exp = (u) => ({ line: 1.2, shock: 1.15, cav: 1, guard: 0.5, missile: cause === 'charge' || cause === 'flank' ? 1.5 : 0.7, skirm: 0.8, engine: 0.6 }[u.role] || 1) * u.men;
    const tot = us.reduce((t, u) => t + exp(u), 0) || 1;
    let dealt = 0;
    for (const u of us) {
      let share = men * exp(u) / tot;
      if (cause === 'missile') share /= 1 + u.armor * 1.4;
      const lost = Math.min(u.men, Math.round(share * (0.85 + this.r() * 0.3)));
      u.men -= lost; dealt += lost;
      if (u.men <= 0) { u.men = 0; u.state = 'dead'; }
    }
    return dealt;
  }

  // ——— الانقضاض الأول ———
  charges() {
    for (const s of this.sides) {
      const foe = s.foe;
      for (const k of SECTS) {
        if (s.sec[k].stance === 'flank' || s.sec[k].stance === 'skirmish') continue;
        const holdK = s.sec[k].stance === 'hold' ? 0.6 : 1;
        const cav = this.secUnits(s, k).filter((u) => u.role === 'cav' || (u.role === 'guard' && s.cmdPos === 'front'));
        if (!cav.length) continue;
        if (this.kind === 'siege') continue;
        const tk = OPP[k];
        if (!this.secUnits(foe, tk).length) continue;
        const comp = this.secComp(foe, tk);
        const spear = comp.line || 0;
        let pow = cav.reduce((t, u) => t + u.men * u.charge * (1 + 0.1 * u.exp), 0) * 0.06;
        pow *= CHARGE_TERRAIN[this.terrain] || 1;
        if (this.weather === 'rain') pow *= 0.85;
        const g = this.genOf(s, k);
        if (this.hasTrait(g, 'cavalier')) pow *= 1.25;
        pow *= this.mods(s, k, 'melee') / 1.1 * holdK;
        if (foe.plan === 'defensive') pow *= 0.75;
        if (foe.plan === 'highground') pow *= 0.8;
        if (this.bf(foe, 'shieldwall')) pow *= 0.5;
        pow *= 1 - 0.65 * spear;
        const dealt = this.applyLoss(foe, tk, pow, 'charge');
        const frac = dealt / Math.max(1, this.secMen(foe, tk) + dealt);
        foe.sec[tk].morale -= 6 + frac * 60;
        this.led(s, 'charge', dealt);
        if (spear > 0.3) {
          const back = this.applyLoss(s, k, cav.reduce((t, u) => t + u.men, 0) * 0.12 * spear, 'melee');
          this.led(foe, 'spears', back);
          if (back > 8) this.line(foe, `جدار رماح ${foe.name} يصدّ انقضاض الفرسان على ${this.secName(tk)}.`, foe.player ? 'good' : 'bad');
        } else if (dealt > 10) {
          this.line(s, `انقضاض فرسان ${s.name} يحطم ${this.secName(tk)} لدى ${foe.name}!`, s.player ? 'good' : 'bad');
          if (dealt > 25) this.moment(s, `انقضاض فرسان ${s.name} على ${this.secName(tk)} لدى ${foe.name}`, dealt / 10, 'charge');
        }
        this.cue({ t: 'charge', side: s.i, from: k, to: tk });
      }
    }
  }

  // ——— الالتحام ———
  melee(ph) {
    const k0 = { approach: 0.05, contact: 0.085, main: 0.1, crisis: 0.13, collapse: 0.12 }[ph];
    const [A, B] = this.sides;
    for (const ka of SECTS) {
      const kb = OPP[ka];
      const sa = A.sec[ka], sb = B.sec[kb];
      if (sa.state === 'broken' && sb.state === 'broken') continue;
      const ua = this.fighting(A, ka), ub = this.fighting(B, kb);
      if (!ua.length || !ub.length) continue;
      if (sa.stance === 'flank' && !sa.flankDone) continue;
      // المناوشون يتراجعون إن استطاعوا (الخيالة الرماة أسهل، والفرسان الأعداء يلحقون بهم)
      const evade = (s1, k1, s2, k2) => {
        if (s1.sec[k1].stance !== 'skirmish') return false;
        const c = this.secComp(s1, k1), e = this.secComp(s2, k2);
        const fast = (e.cav || 0) + (e.skirm || 0);
        let p = (c.skirm || 0) * 1 + (c.missile || 0) * 0.75 + (c.line || 0) * 0.35 - fast * 1.1 - (this.terrain === 'forest' || this.terrain === 'mountains' ? 0.3 : 0) - (this.weather === 'rain' ? 0.15 : 0);
        if (this.cmdTrait(s1, 'swift') || this.cmdTrait(s1, 'desert')) p += 0.1;
        if (s2.sec[k2].stance === 'advance' || this.bf(s2, 'press')) p -= 0.2;
        p -= Math.max(0, -s1.sec[k1].front) * 0.4;
        const shooters = this.secUnits(s1, k1).filter((u) => u.missile);
        if (shooters.length && shooters.every((u) => u.ammo <= 0)) p -= 0.3;
        return this.r() < p;
      };
      if (evade(A, ka, B, kb) || evade(B, kb, A, ka)) {
        const who = A.sec[ka].stance === 'skirmish' ? [A, ka, B, kb] : [B, kb, A, ka];
        who[0].sec[who[1]].front = clamp(who[0].sec[who[1]].front - 0.06, -1, 1);
        who[2].sec[who[3]].fat += 6;
        who[0].sec[who[1]].fat += 3;
        this.led(who[0], 'evade', 3);
        continue;
      }
      let skA = sa.stance === 'skirmish' ? 0.55 : 1, skB = sb.stance === 'skirmish' ? 0.55 : 1;
      const pa = this.sidePower(A, ka, ua, B, kb) * skA;
      const pb = this.sidePower(B, kb, ub, A, ka) * skB;
      if (pa <= 0 && pb <= 0) continue;
      const toughA = ua.reduce((t, u) => t + this.tough(u) * u.men, 0) / Math.max(1, ua.reduce((t, u) => t + u.men, 0));
      const toughB = ub.reduce((t, u) => t + this.tough(u) * u.men, 0) / Math.max(1, ub.reduce((t, u) => t + u.men, 0));
      const tk = (st) => (st === 'hold' ? 0.93 : st === 'advance' ? 1.05 : st === 'skirmish' ? 0.7 : 1);
      // كسر القلب يرقّق الجناحين: يتلقيان ضربات أكثر
      let takenA = pb * k0 / toughA * tk(sa.stance) * (A.plan === 'breakcenter' && ka !== 'C' ? 1.12 : 1);
      let takenB = pa * k0 / toughB * tk(sb.stance) * (B.plan === 'breakcenter' && kb !== 'C' ? 1.12 : 1);
      if (A.plan === 'defensive' || A.plan === 'highground') takenA *= 0.98;
      if (B.plan === 'defensive' || B.plan === 'highground') takenB *= 0.98;
      if (A.plan === 'assault' && ph === 'contact') takenA *= 1.08;
      if (B.plan === 'assault' && ph === 'contact') takenB *= 1.08;
      // الهجوم الكاسح على صفوف مستعدة: خوازيق وسهام في الوجه
      if (ph === 'contact') { if (A.plan === 'assault' && (B.plan === 'defensive' || B.plan === 'highground')) takenA *= 1.25; if (B.plan === 'assault' && (A.plan === 'defensive' || A.plan === 'highground')) takenB *= 1.25; }
      if (B.plan === 'depth' && (ph === 'contact' || ph === 'main')) takenB *= 0.72;
      takenA *= this.incoming(A, ka); takenB *= this.incoming(B, kb);
      const dA = this.applyLoss(A, ka, takenA, 'melee', ua);
      const dB = this.applyLoss(B, kb, takenB, 'melee', ub);
      this.led(A, 'melee', dB); this.led(B, 'melee', dA);
      if (this.kind === 'siege') this.led(B, 'walls', dA * (B.sec[kb].breach >= 1 ? 0.1 : 0.5));
      for (const u of ua) u.kills += dB * u.men / Math.max(1, ua.reduce((t, x) => t + x.men, 0));
      for (const u of ub) u.kills += dA * u.men / Math.max(1, ub.reduce((t, x) => t + x.men, 0));
      // الأرض
      const push = 0.28 * (pa - pb) / Math.max(1, pa + pb);
      sa.front = clamp(sa.front + push, -1, 1); sb.front = clamp(sb.front - push, -1, 1);
      // المعنويات
      const menA = this.secMen(A, ka) + dA, menB = this.secMen(B, kb) + dB;
      const dmul = this.terrain === 'mountains' ? 0.5 : 1;
      const ratio = clamp(pa / Math.max(1, pb), 0.5, 2);
      const crisisK = ph === 'crisis' || ph === 'collapse' ? 1.2 : 1;
      const fA = dA / Math.max(1, menA) * (1 + this.cohK(A) * 0.3), fB = dB / Math.max(1, menB) * (1 + this.cohK(B) * 0.3);
      sa.morale -= (Math.max(0, fA - 0.45 * fB) * 150 + fA * 30 + (sa.front < -0.3 ? 3 : 0) + Math.max(0, 1 / ratio - 1) * 4) * crisisK - Math.min(2, this.depth(A, ka) * 0.8 * dmul) + (this.r() - 0.5) * 5;
      sb.morale -= (Math.max(0, fB - 0.45 * fA) * 150 + fB * 30 + (sb.front < -0.3 ? 3 : 0) + Math.max(0, ratio - 1) * 4) * crisisK - Math.min(2, this.depth(B, kb) * 0.8 * dmul) + (this.r() - 0.5) * 5;
      this.cue({ t: 'clash', a: ka, b: kb, n: Math.min(10, 2 + (dA + dB) / 8) });
      // الجناح المكسور عند العدو: قطاعنا الحر يضرب الجانب المجاور
    }
    this.flankPressure();
  }

  // ما تغيّره الأوامر في الضربات الواردة على قطاع
  incoming(s, key) {
    let m = 1;
    // القائد الحذر أو الدفاعي: الصف الثابت يصمد أكثر
    const g = this.genOf(s, key) || s.cmd;
    if (g && s.sec[key].stance === 'hold' && (g.flaw === 'cautious' || g.doctrine === 'defensive')) m *= 0.94;
    if (this.bf(s, 'highground')) m *= 0.85;
    if (this.bf(s, 'shieldwall') && (s.sec[key].stance === 'hold')) m *= 0.9;
    const rot = this.bf(s, 'rotate');
    if (rot && rot.sec === key) m *= 1.05;
    return m;
  }

  sidePower(s, key, us, foe, fkey) {
    const comp = this.secComp(foe, fkey);
    let p = 0;
    for (const u of us) {
      let mul = 0;
      for (const r in comp) mul += comp[r] * (WS_VS[u.role][r] || 1);
      if (foe.sec[fkey].flanked && (u.role === 'cav' || u.role === 'skirm')) mul = Math.max(mul, 1.3);
      let v = this.unitMelee(u) * (mul || 1);
      if (u.role === 'cav' && this.terrain === 'forest') v *= 0.7;
      if (u.role === 'cav' && this.cmdTrait(s, 'cavalier')) v *= 1.12;
      if (u.fordFree && this.terrain === 'river') v *= 1.1;
      if (u.role === 'engine') v *= 0.3;
      p += v;
    }
    p *= this.mods(s, key, 'melee');
    // الالتفاف الناجح على هذا القطاع يضاعف ضغط العدو
    if (foe.sec[fkey].flanked) p *= 1.5;
    return p;
  }

  // قطاع انهار خصمه: يلتف على القطاع المجاور
  flankPressure() {
    if (this.kind === 'siege') return;
    // الفرسان الملتفون يواصلون الضرب من الخلف
    for (const s of this.sides) {
      for (const k of SECTS) {
        const tk = OPP[k];
        if (!s.foe.sec[tk].flanked || s.foe.sec[tk].state === 'broken' || !s.sec[k].flankOk) continue;
        const riders = this.secUnits(s, k).filter((u) => u.role === 'cav' || u.role === 'skirm' || u.role === 'guard');
        if (!riders.length || !this.secUnits(s.foe, tk).length) continue;
        const pw = riders.reduce((t, u) => t + this.unitMelee(u), 0) * this.mods(s, k, 'melee') * 0.45;
        const d = this.applyLoss(s.foe, tk, pw * 0.09 / 14, 'flank');
        s.foe.sec[tk].morale -= 4;
        this.led(s, 'flank', d);
      }
    }
    for (const s of this.sides) {
      const foe = s.foe;
      for (const k of SECTS) {
        if (s.sec[k].state !== 'ok') continue;
        const opp = OPP[k];
        if (foe.sec[opp].state !== 'broken' && this.secUnits(foe, opp).length) continue;
        if (!this.secUnits(s, k).length) continue;
        // القطاع المجاور لدى العدو
        const adj = k === 'C' ? ['R', 'L'].find((x) => foe.sec[x].state === 'ok' && this.secUnits(foe, x).length) : foe.sec.C.state === 'ok' && this.secUnits(foe, 'C').length ? 'C' : null;
        if (!adj) continue;
        const pw = this.secUnits(s, k).reduce((t, u) => t + this.unitMelee(u), 0) * this.mods(s, k, 'melee') * 0.5;
        const dealt = this.applyLoss(foe, adj, pw * 0.08 / 14, 'flank');
        foe.sec[adj].morale -= 6;
        this.led(s, 'flank', dealt);
        if (!foe.sec[adj].rolled) {
          foe.sec[adj].rolled = true;
          this.line(s, `${this.secName(k)} لدى ${s.name} يلتف على ${this.secName(adj)} المكشوف!`, s.player ? 'good' : 'bad');
          this.moment(s, `التفاف ${s.name} على ${this.secName(adj)} لدى ${foe.name} بعد انهيار جناحه`, 3, 'roll');
          this.cue({ t: 'flank', side: s.i, from: k, to: adj });
        }
      }
    }
  }

  // ——— مناورات خاصة ———
  execQuality(side, key, order) {
    const g = this.genOf(side, key) || side.cmd;
    let p = 0.72 + (g ? 0.05 * (g.rank - 1) : -0.05);
    const t = g && g.trait, f = g && g.flaw;
    const T = { hold: { brave: 0.1, defender: 0.2, tactician: 0.1, mountaineer: this.terrain === 'hills' || this.terrain === 'mountains' ? 0.15 : 0 }, withdraw: { defender: 0.1, tactician: 0.15, logistician: 0.1, brave: -0.05 }, flank: { cavalier: 0.2, tactician: 0.15, swift: 0.1, mountaineer: this.terrain === 'hills' || this.terrain === 'mountains' ? 0.15 : 0, desert: this.terrain === 'desert' ? 0.1 : 0 }, charge: { brave: 0.15, cavalier: 0.15 }, pursue: { cavalier: 0.1, swift: 0.15 }, bait: { tactician: 0.25, cavalier: 0.1 }, hunt: { cavalier: 0.15, tactician: 0.1, brave: 0.05 }, siege: { siege: 0.2 } };
    const F = { hold: { reckless: -0.25, cautious: 0.1, greedy: -0.05 }, withdraw: { reckless: -0.3, cautious: 0.1 }, flank: { cautious: -0.1, arrogant: -0.05 }, charge: { reckless: 0.1, cautious: -0.2 }, pursue: { cautious: -0.2, greedy: 0.1 }, bait: { arrogant: -0.2, reckless: -0.15 }, hunt: { cautious: -0.15 }, siege: {} };
    p += ((T[order] || {})[t] || 0) + ((F[order] || {})[f] || 0);
    if (t === 'merchant') p -= 0.05;
    if (side.plan === 'night') p -= 0.08;
    if (side.cmdAlive === false) p -= 0.15;
    p -= this.cohK(side) * 0.25;
    if (side.cmdHurt && g === side.cmd) p -= 0.08;
    if (g) {
      const D = { aggressive: { charge: 0.08, press: 0.08, withdraw: -0.08 }, defensive: { hold: 0.08, withdraw: 0.05 }, cautious: { withdraw: 0.1, hold: 0.05, charge: -0.05 }, maneuver: { flank: 0.08, bait: 0.05, envelop: 0.08 }, siegecraft: { siege: 0.1 } }[g.doctrine] || {};
      const St = { disciplined: { hold: 0.05, withdraw: 0.08 }, cunning: { bait: 0.08, flank: 0.04 }, careful: { withdraw: 0.05 }, fearless: { charge: 0.05 } }[g.style] || {};
      p += (D[order] || 0) + (St[order] || 0);
    }
    if (side.cmdPos === 'front' && (key === 'C' || key === 'Res')) p += 0.05;
    const roll = this.r();
    const disobey = f === 'disloyal' && roll < 0.05 ? true : (f === 'reckless' && (order === 'hold' || order === 'withdraw') && roll < 0.22) || (f === 'arrogant' && roll < 0.08);
    const q = disobey ? 'disobey' : roll < p - 0.35 ? 'excellent' : roll < p ? 'good' : roll < p + 0.18 ? 'poor' : 'fail';
    // سجل التنفيذ لدور القائد في التقرير
    if (side.cmdLog) side.cmdLog.push({ phase: this.phase, order, q, g: g ? g.name : null });
    return { q, g, p };
  }
  gname(side, key) { const g = this.genOf(side, key); return g ? g.name : `قائد ${this.secName(key)}`; }

  resolveFlank(s, k) {
    const foe = s.foe;
    const tk = OPP[k];
    const sec = s.sec[k];
    sec.flankDone = true;
    const cav = this.secUnits(s, k).filter((u) => u.role === 'cav' || u.role === 'skirm' || u.role === 'guard');
    if (!cav.length) { sec.stance = 'advance'; return; }
    const ex = this.execQuality(s, k, 'flank');
    let fp = cav.reduce((t, u) => t + this.unitMelee(u), 0) * (FLANK_TERRAIN[this.terrain] || 1) * (this.weather === 'fog' ? 1.2 : 1);
    if (this.terrain === 'coast' && k === 'R') fp *= 0.5;
    const tcomp = this.secComp(foe, tk);
    let cp = this.secUnits(foe, tk).reduce((t, u) => t + this.unitMelee(u) * (u.role === 'cav' ? 1.3 : u.role === 'skirm' ? 0.9 : u.role === 'guard' ? 1 : u.role === 'line' ? 0.5 : 0.3), 0) * 0.4;
    cp += (foe.flankCover || 0);
    if (this.cmdTrait(foe, 'tactician')) cp *= 1.2;
    let chance = 0.3 + 0.45 * (fp - cp) / Math.max(1, fp + cp) + { excellent: 0.2, good: 0.08, poor: -0.1, fail: -0.25, disobey: -0.3 }[ex.q];
    if (foe.flankWatch && foe.flankWatch === tk) chance -= 0.25;
    if (foe.plan === 'breakcenter') chance += 0.12;
    chance = clamp(chance, 0.05, 0.9);
    this.lastFlankChance = chance;
    const ok = this.r() < chance;
    this.cue({ t: 'flank', side: s.i, from: k, to: tk, ok });
    if (ex.q === 'disobey') {
      this.line(s, `${ex.g ? ex.g.name : 'قائد الجناح'} يرفض الدوران ويلتحم مباشرة!`, 'bad');
      sec.stance = 'advance';
      this.decisions.push({ side: s.i, kind: 'disobey', text: `${ex.g ? ex.g.name : 'قائد الجناح'} عصى أمر الالتفاف`, weight: 2 });
      return;
    }
    if (ok) {
      sec.flankOk = true;
      foe.sec[tk].flanked = true;
      foe.sec[tk].morale -= 25;
      const dealt = this.applyLoss(foe, tk, fp * 0.1 / 14, 'flank');
      this.led(s, 'flank', dealt + 60);
      sec.stance = 'advance';
      this.line(s, `نجح الالتفاف! فرسان ${s.name} يضربون ${this.secName(tk)} لدى ${foe.name} من الخلف.`, s.player ? 'good' : 'bad');
      this.moment(s, `التفاف ${this.gname(s, k)} (${s.name}) على ${this.secName(tk)} لدى ${foe.name}`, 6, 'flank');
      if (ex.q === 'excellent' && ex.g) this.line(s, `نفّذ ${ex.g.name} الدوران ببراعة.`, s.player ? 'good' : '');
    } else {
      const lost = this.applyLoss(s, k, cav.reduce((t, u) => t + u.men, 0) * 0.18, 'melee');
      for (const u of cav) u.fat = (u.fat || 0) + 20;
      sec.fat += 25;
      sec.morale -= 8;
      sec.stance = 'advance';
      this.led(foe, 'spears', lost);
      this.line(s, `فشل الالتفاف: ${foe.flankWatch === tk ? 'الاحتياط كان بانتظارهم' : 'الرماح صدّت الفرسان'} وخسروا ${lost} رجل.`, s.player ? 'bad' : 'good');
      this.decisions.push({ side: s.i, kind: 'flankFail', text: `التفاف فاشل على ${this.secName(tk)}`, weight: 2 + lost / 30 });
    }
  }

  resolveFeint(s) {
    const foe = s.foe;
    const ex = this.execQuality(s, 'C', 'bait');
    const f = foe.cmd && foe.cmd.flaw, t = foe.cmd && foe.cmd.trait;
    let pursue = 0.38 + (f === 'reckless' ? 0.3 : 0) + (f === 'arrogant' ? 0.15 : 0) + (f === 'greedy' ? 0.1 : 0) - (t === 'tactician' ? 0.3 : 0) - (f === 'cautious' ? 0.2 : 0) - (foe.plan === 'defensive' || foe.plan === 'highground' ? 0.25 : 0) + (foe.plan === 'assault' ? 0.2 : 0);
    if (foe.feintCaution) pursue -= 0.35;
    if (foe.feintChase) pursue += 0.3;
    s.sec.C.front -= 0.35;
    this.cue({ t: 'retreat', side: s.i, from: 'C' });
    if (ex.q === 'fail' || ex.q === 'disobey') {
      s.sec.C.morale -= 22;
      this.line(s, `التقهقر المصطنع خرج عن السيطرة — القلب لدى ${s.name} يتراجع فعلاً!`, s.player ? 'bad' : 'good');
      this.decisions.push({ side: s.i, kind: 'feintFail', text: 'التقهقر المصطنع تحوّل إلى تراجع حقيقي', weight: 4 });
      this.moment(foe, 'انهيار خدعة التقهقر', 4, 'feint');
      return;
    }
    if (this.r() < clamp(pursue, 0.05, 0.95)) {
      foe.sec.C.morale -= 26;
      foe.sec.C.flanked = true;
      const cavPow = this.secUnits(s, 'L').concat(this.secUnits(s, 'R')).filter((u) => u.role === 'cav' || u.role === 'skirm').reduce((t, u) => t + this.unitMelee(u), 0);
      const dealt = this.applyLoss(foe, 'C', 20 + cavPow * 0.05 / 14, 'flank');
      this.led(s, 'feint', dealt + 80);
      this.line(s, `${foe.name} تلاحق القلب المتقهقر… فتنقضّ عليها فرسان ${s.name} من الجانبين!`, s.player ? 'good' : 'bad');
      this.moment(s, 'التقهقر المصطنع استدرج العدو إلى الفخ', 8, 'feint');
      this.decisions.push({ side: foe.i, kind: 'baited', text: 'لاحق عدواً متراجعاً فوقع في الكمين', weight: 6 });
      this.cue({ t: 'ambush', side: s.i });
    } else {
      s.sec.C.morale -= 2; s.sec.C.front += 0.15;
      this.line(s, `${foe.name} لم تبتلع الطُّعم${t === 'tactician' ? ' — قائدها الداهية كشف الخدعة' : ''}. خسر القلب لدى ${s.name} أرضاً.`, s.player ? 'bad' : 'good');
      this.decisions.push({ side: s.i, kind: 'feintIgnored', text: 'خدعة التقهقر لم تنطلِ على العدو', weight: 1.5 });
    }
  }

  resolveHunt(s, mul) {
    if (s.huntDone) return;
    const foe = s.foe;
    if (!foe.cmd || foe.cmdAlive === false) return;
    const hunters = s.units.filter((u) => u.hunter && this.alive(u));
    const pool = hunters.length ? hunters : SECTS.concat('Res').flatMap((k) => this.secUnits(s, k)).filter((u) => u.role === 'cav').sort((a, b) => this.unitMelee(b) - this.unitMelee(a)).slice(0, 1);
    if (!pool.length) return;
    s.huntDone = true;
    const ex = this.execQuality(s, 'Res', 'hunt');
    const pw = pool.reduce((t, u) => t + this.unitMelee(u), 0);
    let c = 0.38 + { front: 0.2, center: 0, rear: -0.25 }[foe.cmdPos] + { excellent: 0.15, good: 0.06, poor: -0.08, fail: -0.2, disobey: -0.25 }[ex.q];
    c += clamp((pw - 500) / 3000, -0.08, 0.12);
    if (this.weather === 'fog') c += 0.1;
    if (this.terrain === 'forest') c += 0.05;
    if (this.secUnits(foe, 'Res').some((u) => u.role === 'cav')) c -= 0.12;
    c = clamp(c * mul, 0.05, 0.8);
    this.cue({ t: 'hunt', side: s.i });
    if (this.r() < c) {
      const roll = this.r();
      const fate = roll < 0.45 ? 'killed' : roll < 0.65 ? 'captured' : 'wounded';
      this.commanderDown(foe, fate, s, 'hunt');
      this.led(s, 'hunt', 150);
      for (const u of pool) { u.hunter = false; if (u.sec === 'Res') u.sec = 'C'; }
    } else {
      const lost = 0;
      for (const u of pool) { const l = Math.round(u.men * 0.35); u.men -= l; this.led(foe, 'guard', l); u.hunter = false; if (u.sec === 'Res') u.sec = 'C'; }
      void lost;
      for (const k of SECTS) s.sec[k].morale -= 4;
      this.line(s, `فرقة الصيد لم تبلغ ${foe.cmd.name}: حرسه ردّها بخسائر.`, s.player ? 'bad' : 'good');
      this.decisions.push({ side: s.i, kind: 'huntFail', text: 'فرقة صيد القائد أُبيدت تقريباً', weight: 2 });
    }
  }

  resolveSally(s) {
    if (this.kind !== 'siege' || s.att) return;
    const foe = s.foe;
    const group = this.secUnits(s, 'Res').filter((u) => u.role === 'cav' || u.role === 'shock' || u.role === 'guard');
    if (!group.length) return;
    const pw = group.reduce((t, u) => t + this.unitMelee(u), 0) * this.mods(s, 'Res', 'melee') / (1 + 0.45 * this.walls);
    const cover = this.secUnits(foe, 'Res').concat(this.secUnits(foe, 'C')).reduce((t, u) => t + this.unitMelee(u), 0) * 0.5;
    const ex = this.execQuality(s, 'Res', 'charge');
    const c = clamp(0.35 + 0.4 * (pw - cover) / Math.max(1, pw + cover) + { excellent: 0.15, good: 0.05, poor: -0.1, fail: -0.2, disobey: -0.2 }[ex.q], 0.05, 0.85);
    this.cue({ t: 'sally', side: s.i });
    if (this.r() < c) {
      const burnt = [];
      if (this.towerAlive) { this.towerAlive = false; burnt.push('برج الحصار'); }
      if (this.ramAlive && this.r() < 0.6) { this.ramAlive = false; burnt.push('الكبش'); }
      for (const u of foe.units.filter((x) => x.type === 'catapult')) if (this.r() < 0.5) { u.men = 0; u.state = 'dead'; burnt.push('منجنيق'); }
      for (const u of group) u.men = Math.round(u.men * 0.86);
      this.led(s, 'sally', 120);
      this.line(s, burnt.length ? `خرجت قوة من البوابة وأحرقت ${burnt.join(' و')}!` : 'خرجت قوة من البوابة وأربكت المعسكر ثم عادت.', s.player ? 'good' : 'bad');
      if (burnt.length) this.moment(s, `إحراق ${burnt[0]} في الخروج المفاجئ`, 5, 'sally');
    } else {
      for (const u of group) u.men = Math.round(u.men * 0.55);
      for (const k of SECTS) s.sec[k].morale -= 8;
      this.line(s, 'القوة الخارجة حوصرت قرب المعسكر وأُبيد أكثرها.', s.player ? 'bad' : 'good');
      this.decisions.push({ side: s.i, kind: 'sallyFail', text: 'خرج من الأسوار فحوصرت قوته', weight: 3 });
    }
  }

  // ——— الحصار ———
  addBreach(key, v, how) {
    const def = this.sides[1];
    const sec = def.sec[key];
    if (sec.breach >= 1) return;
    const fo = this.bf(this.sides[0], 'focus');
    if (fo) v *= fo.sec === key ? 2 : 0.5;
    sec.breach = Math.min(1, sec.breach + v);
    if (sec.breach >= 1) {
      const text = how === 'ram' ? 'تحطمت البوابة تحت ضربات الكبش!' : how === 'tower' ? 'برج الحصار يفتح معبراً والمهاجمون يعبرون!' : how === 'catapult' ? `ثغرة في ${this.wallName(key, this.sides[0])} بعد القصف!` : `المهاجمون يعتلون ${this.wallName(key, this.sides[0])}!`;
      this.line(this.sides[0], text, this.sides[0].player ? 'good' : 'bad', 'breach');
      this.moment(this.sides[0], `فتح الثغرة: ${text}`, 7, 'breach');
      this.led(this.sides[0], 'breach', 120);
      def.sec[key].morale -= 12;
      this.cue({ t: 'breach', to: key, how });
    }
  }
  siegeTick(ph) {
    const [A, B] = this.sides;
    if (this.noMeans) return;
    const siegeK = this.cmdTrait(A, 'siege') ? 1.4 : 1;
    if (ph === 'approach' && this.towerAlive && !this.towerDocked) {
      const burnP = 0.05 + 0.02 * this.secUnits(B, OPP[this.towerSector]).filter((u) => u.role === 'missile').length - (A.plan === 'night' ? 0.04 : 0);
      if (this.r() < burnP) {
        this.towerAlive = false;
        this.line(B, 'سهام نارية تشعل برج الحصار قبل أن يبلغ السور!', B.player ? 'good' : 'bad', 'towerBurn');
        this.moment(B, 'إحراق برج الحصار', 4, 'tower');
      } else if (this.tick >= 1 || A.plan === 'night') { this.towerDocked = true; this.line(A, `برج الحصار يلتصق بالسور.`, ''); }
    }
    if (ph === 'approach') return;
    // الزيت والحجارة: خسائر على من تحت السور ما لم يعبر الثغرة
    if (this.bf(B, 'oil')) {
      for (const k of SECTS) {
        if (B.sec[OPP[k]].breach >= 1) continue;
        const men = this.secMen(A, k);
        if (!men) continue;
        const d = this.applyLoss(A, k, men * 0.035, 'missile');
        A.sec[k].morale -= 2;
        this.led(B, 'walls', d);
      }
    }
    if (this.ramAlive && this.secUnits(A, 'C').length) {
      const destroy = 0.07 + 0.035 * this.walls + (B.plan === 'walls' ? 0.03 * this.secUnits(B, 'C').filter((u) => u.role === 'missile').length : 0) - (A.ramCover ? 0.08 : 0) + (this.bf(B, 'oil') ? 0.15 : 0);
      if (this.r() < destroy) { this.ramAlive = false; this.line(B, 'الزيت المغلي يحرق الكبش عند البوابة!', B.player ? 'good' : 'bad', 'ramBurn'); this.moment(B, 'تدمير الكبش عند البوابة', 3, 'ram'); }
      else this.addBreach('C', 0.4 * siegeK * (A.ramCover ? 0.7 : 1) * (A.ramPush ? 1.5 : 1) / (1 + 0.2 * this.walls), 'ram');
    }
    if (this.towerAlive && this.towerDocked) this.addBreach(OPP[this.towerSector], 0.6 * siegeK, 'tower');
    if (this.equip.ladders) {
      for (const k of SECTS) {
        const pa = this.fighting(A, k).reduce((t, u) => t + this.unitMelee(u), 0) * this.mods(A, k, 'melee');
        const pb = this.fighting(B, OPP[k]).reduce((t, u) => t + this.unitMelee(u), 0) * this.mods(B, OPP[k], 'melee') + 1;
        if (pa <= 0) continue;
        const v = 0.16 * clamp(pa / pb, 0.3, 2.5) * siegeK / (1 + 0.15 * this.walls) * (A.plan === 'escalade' ? 1.4 : 1);
        this.addBreach(OPP[k], v, 'ladders');
      }
    }
  }

  fatigue(ph) {
    for (const s of this.sides) {
      const heat = (this.terrain === 'desert' && !this.cmdTrait(s, 'desert')) || this.weather === 'heat' ? 1.45 : this.weather === 'snow' ? 1.25 : 1;
      for (const k of SECTS) {
        const sec = s.sec[k];
        let f = ph === 'approach' ? 3 : 7;
        if (sec.stance === 'advance') f += 1.5;
        if (s.plan === 'assault') f += 3.5;
        if (s.att && s.foe.plan === 'highground') f += 3;
        if (s.att && this.terrain === 'mountains' && this.kind === 'field') f += 3;
        const pr = this.bf(s, 'press');
        if (pr) f += pr.fat;
        if (this.bf(s.foe, 'highground') && s.att) f += 3;
        if (this.bf(s.foe, 'volley')) f += 2;
        if (this.bf(s.foe, 'waves')) f += 3;
        f *= 1 + (100 - s.ready.sup) / 250;
        f *= 1 - Math.min(0.4, this.depth(s, k) * 0.12);
        if (this.cmdTrait(s, 'logistician')) f *= 0.8;
        sec.fat = clamp(sec.fat + f * heat, 0, 100);
      }
    }
  }

  commanderRisk(ph) {
    if (ph === 'approach') return;
    for (const s of this.sides) {
      if (!s.cmd || s.cmdAlive === false || s.cmdWounded) continue;
      const k = s.cmdPos === 'rear' ? 'Res' : 'C';
      if (k === 'C' && !this.secUnits(s.foe, 'C').length) continue;
      let p = CMD_POS[s.cmdPos].risk * (s.cmd.flaw === 'reckless' ? 2 : 1) * (s.cmdCharge ? 3 : 1) * (this.bf(s, 'rally') ? 2.5 : 1) * (s.cmd.style === 'careful' ? 0.7 : s.cmd.style === 'fearless' && s.cmd.flaw !== 'reckless' ? 1.15 : 1);
      if (s.sec.C.flanked) p *= 1.8;
      if (this.r() < p) {
        const fate = this.r() < 0.45 ? 'killed' : 'wounded';
        this.commanderDown(s, fate, s.foe, 'battle');
      }
    }
  }
  commanderDown(s, fate, by, how) {
    const g = s.cmd;
    if (!g) return;
    if (fate === 'wounded') {
      s.cmdWounded = true;
      for (const k of SECTS) s.sec[k].morale -= 8;
      this.line(s, `${how === 'hunt' ? 'فرسان ' + by.name + ' يبلغون ' : ''}${g.name} جريح!`, s.player ? 'bad' : 'good', 'cmdWounded');
      if (s.player) this.pendingWound = true;
      else if (this.r() < 0.5) { this.evacuate(s); }
      this.moment(by, `جرح ${g.name}`, 4, 'commander');
      return;
    }
    s.cmdAlive = false;
    s.cmdFate = fate;
    for (const k of [...SECTS, 'Res']) s.sec[k].morale -= 24;
    const guard = s.units.find((u) => u.gen === g);
    if (guard) { guard.men = Math.round(guard.men * 0.2); }
    this.led(by, 'commander', 200);
    this.line(s, fate === 'captured' ? `أُسر القائد ${g.name}! الصفوف تضطرب.` : `سقط القائد ${g.name}! الصفوف تتزلزل.`, s.player ? 'bad' : 'good', 'cmdDown');
    this.moment(by, `${fate === 'captured' ? 'أسر' : 'مقتل'} ${g.name}`, 9, 'commander');
    this.decisions.push({ side: s.i, kind: 'cmdLost', text: s.cmdPos === 'front' ? `قاتل ${g.name} في المقدمة فسقط` : `سقط ${g.name}`, weight: 5 });
    // القائد التالي يتولى
    const next = s.gens.find((x) => x !== g && !(s.fallen || []).includes(x));
    s.fallen = [...(s.fallen || []), g];
    if (next) this.line(s, `${next.name} يتولى القيادة.`, '');
  }
  evacuate(s) {
    for (const k of SECTS) s.sec[k].morale -= 6;
    s.cmdPos = 'rear';
    s.evacuated = true;
    this.line(s, `حُمل ${s.cmd.name} إلى المؤخرة.`, '');
  }

  // أزمة وسط المرحلة: جناح يترنح أو قائد جريح — الذكاء يقرر فوراً، واللاعب يُسأل
  interrupts() {
    this.queue = this.queue || [];
    for (const s of this.sides) {
      for (const k of SECTS) {
        const sec = s.sec[k];
        if (sec.state === 'waver' && !sec.asked && this.secUnits(s, k).length && !this.over) {
          const ev = this.buildEvent(s, { id: 'wingWaver', wing: k });
          if (s.player) this.queue.push(ev); else this.choose(ev, this.aiChoose(s, ev));
        }
      }
      if (s.player && this.pendingWound && s.cmdWounded && !s.evacuated && !s.woundAsked) {
        s.woundAsked = true;
        this.queue.push(this.buildEvent(s, { id: 'wounded' }));
      }
    }
    this.pendingWound = false;
  }
  takeInterrupt() { return this.queue && this.queue.length ? this.queue.shift() : null; }
  moraleChecks() {
    for (const s of this.sides) {
      for (const k of SECTS) {
        const sec = s.sec[k];
        if (sec.state === 'broken') continue;
        const men = this.secMen(s, k);
        const men0 = s.units.filter((u) => u.sec === k).reduce((t, u) => t + u.men0, 0) || 1;
        if (men <= 0) { if (s.units.some((u) => u.sec === k)) sec.state = 'broken'; continue; }
        if (sec.flanked) sec.morale -= 5;
        if (s.cmd && s.cmdAlive !== false && !s.cmdWounded && k === 'C') sec.morale += 1;
        if (sec.morale < 30 && !sec.wavered) { sec.wavered = true; sec.state = 'waver'; }
        if (sec.morale <= 8 + this.cohK(s) * 8 || men < men0 * 0.2) this.breakSector(s, k);
      }
    }
  }
  breakSector(s, k) {
    const sec = s.sec[k];
    if (sec.state === 'broken') return;
    sec.state = 'broken';
    const foe = s.foe;
    const us = this.secUnits(s, k);
    const cav = this.secUnits(foe, OPP[k]).filter((u) => u.role === 'cav' || u.role === 'skirm').reduce((t, u) => t + u.men, 0);
    let pur = 0;
    for (const u of us) { const l = Math.round(u.men * (0.1 + Math.min(0.25, cav / 600))); u.men -= l; pur += l; u.state = 'rout'; }
    this.led(foe, 'pursuit', pur);
    this.led(foe, 'rout', 80);
    for (const x of SECTS) if (x !== k) s.sec[x].morale -= k === 'C' ? 16 : 10;
    this.line(s, `انهار ${this.secName(k)} لدى ${s.name}!`, s.player ? 'bad' : 'good', 'broken');
    if (k === 'C' && foe.plan === 'breakcenter') {
      for (const x of SECTS) s.sec[x].morale -= 15;
      this.line(foe, `انشقّ جيش ${s.name} إلى نصفين!`, foe.player ? 'good' : 'bad');
      this.moment(foe, 'كسر القلب وشقّ الجيش إلى نصفين', 8, 'breakcenter');
      this.led(foe, 'breakcenter', 200);
    }
    this.moment(foe, `انهيار ${this.secName(k)} لدى ${s.name}`, k === 'C' ? 7 : 5, 'broken');
    this.cue({ t: 'rout', side: s.i, from: k });
  }

  checkEnd() {
    if (this.over) return;
    for (const s of this.sides) {
      const had = SECTS.filter((k) => s.sec[k].had);
      const broken = had.filter((k) => s.sec[k].state === 'broken' || !this.secUnits(s, k).length);
      const men = this.liveMen(s);
      const resLeft = this.secUnits(s, 'Res').filter((u) => u.role !== 'engine').length;
      const lost = broken.length >= Math.min(2, had.length) || (broken.includes('C') && !resLeft && this.kind === 'field') || men < s.men0 * 0.25 || this.avgMorale(s) < 8;
      if (lost && men < s.men0 * 0.97) {
        this.finish(s.foe.i, this.kind === 'siege' ? (s.att ? 'repelled' : 'fall') : 'rout');
        return;
      }
      if (this.kind === 'siege' && !s.att && SECTS.filter((k) => s.sec[k].breach >= 1).length && s.sec.C.state === 'broken') {
        this.finish(0, 'fall');
        return;
      }
    }
  }
  decideByScore() {
    const sc = this.sides.map((s) => this.liveMen(s) * (0.4 + this.avgMorale(s) / 100) * (1 + 0.08 * SECTS.reduce((t, k) => t + s.sec[k].front, 0)));
    if (this.kind === 'siege') {
      const breached = SECTS.some((k) => this.sides[1].sec[k].breach >= 1);
      const w = breached && this.liveMen(this.sides[0]) > this.liveMen(this.sides[1]) * 0.9 ? 0 : 1;
      this.finish(w, w === 0 ? 'fall' : 'repelled');
    } else this.finish(sc[0] >= sc[1] ? 0 : 1, 'field');
    this.line(null, this.winner === 0 ? `${this.sides[0].name} تكسب الميدان بعد يوم طويل.` : `${this.sides[1].name} تثبت حتى ينسحب خصمها.`, '');
  }
  finish(w, reason) {
    if (this.over) return;
    this.over = true; this.winner = w; this.reason = reason;
    const L = this.sides[1 - w], W = this.sides[w];
    // المطاردة
    if (reason !== 'withdraw' && reason !== 'starve') {
      const cav = W.units.filter((u) => this.alive(u) && (u.role === 'cav' || u.role === 'skirm')).reduce((t, u) => t + u.men, 0);
      let k = (W.noPursuit || W.plan === 'highground' ? 0.03 : 0.08 + Math.min(0.14, cav / 1200)) * (W.pursueHard ? 1.6 : 1);
      if (this.kind === 'siege' && reason === 'fall') k = 0.2;
      if (L.orderly) k *= 0.35;
      // القائد الحذر أو المنضبط يترك مؤخرة تحمي المنسحبين
      else if (L.cmd && L.cmdAlive !== false && (L.cmd.flaw === 'cautious' || L.cmd.style === 'disciplined')) k *= 0.7;
      let pur = 0;
      for (const u of L.units) { if (u.men <= 0) continue; const l = Math.round(u.men * k); u.men -= l; pur += l; }
      this.led(W, 'pursuit', pur);
      if (pur > 20) this.line(W, `المطاردة تحصد ${pur} رجلاً من ${L.name}.`, W.player ? 'good' : 'bad');
      if (W.pursueHard && W.pursueTrap) { for (const u of W.units) if (u.role === 'cav') u.men = Math.round(u.men * 0.7); this.line(L, 'المطاردون وقعوا في كمين الاحتياط!', L.player ? 'good' : 'bad'); }
    }
    this.line(null, `${W.name} تنتصر.`, W.player ? 'win' : 'lose', 'end');
  }

  // ——— الاحتياط ———
  commitReserve(s, key, why) {
    const res = this.secUnits(s, 'Res').filter((u) => u.role !== 'engine' && !(u.hunter && !s.huntDone));
    if (!res.length) return false;
    for (const u of res) u.sec = key;
    s.sec[key].had = true;
    if (s.sec[key].state === 'broken') s.sec[key].state = 'ok';
    s.sec[key].morale = Math.min(100, s.sec[key].morale + 14);
    if (s.sec[key].state === 'waver') s.sec[key].state = 'ok';
    s.reserveCommit = { phase: this.phase, key, why };
    this.line(s, `${s.name} تدفع باحتياطها إلى ${this.secName(key)}.`, s.player ? 'good' : '');
    this.cue({ t: 'reserve', side: s.i, to: key });
    this.led(s, 'reserve', 40 + res.reduce((t, u) => t + u.men, 0) * 0.3);
    if (this.phase <= 1 && why !== 'auto') this.decisions.push({ side: s.i, kind: 'earlyReserve', text: 'زجّ باحتياطه مبكراً', weight: 1.5 });
    return true;
  }

  // انسحاب منظم
  withdraw(s) {
    s.withdrew = true;
    s.orderly = true;
    const ex = this.execQuality(s, 'C', 'withdraw');
    if (ex.q === 'fail' || ex.q === 'disobey') { s.orderly = false; this.line(s, 'الانسحاب يتحول إلى فوضى!', s.player ? 'bad' : 'good'); }
    else this.line(s, `${s.name} تنسحب بانتظام${ex.q === 'excellent' ? ' — تراجع محكم يحفظ الرجال' : ''}.`, '');
    this.finish(s.foe.i, 'withdraw');
  }

  // ——————————— الأحداث التكتيكية ———————————
  findEvent(s) {
    const foe = s.foe;
    const next = WS_PHASES[this.phase + 1] ? WS_PHASES[this.phase + 1].key : null;
    const cands = [];
    const hasRes = this.secUnits(s, 'Res').filter((u) => u.role !== 'engine').length > 0;
    if (this.pendingWound && s.player && s.cmdWounded && !s.evacuated && !s.woundAsked) { s.woundAsked = true; cands.push({ id: 'wounded', pri: 9 }); }
    if (this.kind === 'field') {
      // التفاف قادم من العدو
      if (next === 'contact') {
        const k = SECTS.find((x) => foe.sec[x].stance === 'flank' && !foe.sec[x].flankDone && this.secUnits(foe, x).some((u) => u.role === 'cav' || u.role === 'skirm'));
        if (k && (s.intel >= 1 || this.r() < 0.6)) cands.push({ id: 'enemyFlank', pri: 8, wing: OPP[k] });
      }
      // جناح يترنح
      for (const k of SECTS) {
        const sec = s.sec[k];
        if (sec.state === 'waver' && !sec.asked && this.secUnits(s, k).length) { cands.push({ id: 'wingWaver', pri: 7 + (k === 'C' ? 1 : 0), wing: k }); break; }
      }
      // قلب العدو يترنح: فرصة
      if ((next === 'main' || next === 'crisis') && foe.sec.C.morale < 38 && foe.sec.C.state !== 'broken' && s.sec.C.front > -0.1 && !s.oppAsked) cands.push({ id: 'centerWeak', pri: 6 });
      // قائد العدو مكشوف
      if (foe.cmd && foe.cmdAlive !== false && foe.cmdPos === 'front' && !s.huntDone && !s.exposedAsked && next === 'main' && SECTS.some((k) => this.secUnits(s, k).concat(this.secUnits(s, 'Res')).some((u) => u.role === 'cav'))) cands.push({ id: 'cmdExposed', pri: 5 });
      // نفاد السهام
      if (s.ammoOut && !s.ammoAsked && (next === 'main' || next === 'crisis')) cands.push({ id: 'ammo', pri: 3 });
      // مطاردة
      if (next === 'collapse' && SECTS.some((k) => foe.sec[k].state === 'broken') && !s.pursueAsked) cands.push({ id: 'pursuit', pri: 6 });
      // خدعة محتملة من العدو
      if (next === 'contact' && foe.plan === 'feigned' && !s.feintAsked) cands.push({ id: 'feintWarn', pri: 7 });
    } else if (s.att) {
      if (this.ramAlive && !s.ramAsked && (next === 'contact' || next === 'main')) cands.push({ id: 'ram', pri: 6 });
      const br = SECTS.find((k) => foe.sec[k].breach >= 1 && !s.breachAsked);
      if (br) cands.push({ id: 'breach', pri: 8, wing: br });
      if (next === 'main' && this.towerAlive === false && this.equip.tower && !s.towerAsked) cands.push({ id: 'towerLost', pri: 5 });
    } else {
      if (next === 'approach' || (this.phase === 0 && !s.sallyAsked && (this.towerAlive || this.ramAlive) && s.plan !== 'sally')) {
        if (!s.sallyAsked && (this.towerAlive || this.ramAlive) && this.secUnits(s, 'Res').some((u) => u.role === 'cav' || u.role === 'shock')) cands.push({ id: 'sallyChance', pri: 4 });
      }
      const gate = foe.ramPush || (this.ramAlive && s.sec.C.breach > 0.3 && s.sec.C.breach < 1);
      if (gate && !s.gateAsked) cands.push({ id: 'gate', pri: 6 });
      const lost = SECTS.find((k) => s.sec[k].breach >= 1 && !s.wallAsked);
      if (lost) cands.push({ id: 'wallsLost', pri: 8, wing: lost });
      if (hasRes && !lost) void 0;
    }
    if (!cands.length) return null;
    cands.sort((a, b) => b.pri - a.pri);
    const c = cands[0];
    return this.buildEvent(s, c);
  }

  buildEvent(s, c) {
    const foe = s.foe;
    const hasRes = this.secUnits(s, 'Res').filter((u) => u.role !== 'engine').length > 0;
    const W = c.wing;
    const g = (k) => { const x = this.genOf(s, k); return x ? x.name : 'قائد ' + this.secName(k); };
    const ev = { id: c.id, side: s.i, wing: W, options: [] };
    const opt = (k, label, icon2, desc, risk, dis) => ev.options.push({ k, label, icon: icon2, desc, risk, dis: !!dis });
    switch (c.id) {
      case 'enemyFlank':
        ev.title = 'فرسان العدو يلتفّون!';
        ev.text = `كشّافتك يرون فرسان ${foe.name} يدورون حول ${this.secName(W)}. إن نجحوا سيضربونه من الخلف.`;
        opt('reserve', 'أرسل الاحتياط لتغطية الجناح', 'plus', 'فرصة نجاحهم تنخفض كثيراً.', 'لن يبقى احتياط للأزمة.', !hasRes);
        opt('archers', 'أعِد الرماة إلى الخلف', 'bow', 'الرماة يسلمون من الانقضاض.', 'رمي الجناح يضعف.');
        opt('press', 'تجاهلهم واضغط على القلب', 'arrowUp', 'قلبك يضرب أقوى الآن.', 'قد ينهار الجناح المكشوف.');
        opt('delegate', `دع ${g(W)} يتصرف`, 'helmet', 'قائد الجناح يقرر حسب طبعه.', 'قد يخالف ما تريد.');
        break;
      case 'wingWaver':
        s.sec[W].asked = true;
        if (this.kind === 'siege') {
          ev.title = `رجالك عند ${this.secName(W)} يتراجعون!`;
          ev.text = `معنويات الرجال عند ${this.secName(W)} تنهار تحت الضغط.`;
        } else {
          ev.title = `${this.secName(W)} يتراجع!`;
          ev.text = `معنويات ${this.secName(W)} تنهار تحت الضغط.`;
        }
        opt('reserve', 'أرسل الاحتياط', 'plus', 'رجال جدد يرفعون المعنويات.', 'يفرغ الاحتياط.', !hasRes);
        opt('hold', 'اطلب منهم الثبات', 'shield', `يعتمد على ${g(W)}.`, 'قد يعصي أو ينهار.');
        opt('withdraw', this.kind === 'siege' ? 'اسحب الفرقة' : 'اسحب الجناح', 'retreat', 'تتراجع وتنظم صفوفها بخسائر أقل.', this.kind === 'siege' ? 'يخفّ الضغط على هذا الموضع.' : 'يكشف جانب القلب.');
        if (this.kind !== 'siege') opt('bait', 'استغل تراجعه لاستدراجهم', 'eye', 'إن نجح يقع العدو في فخ.', 'يحتاج داهية وفرساناً، وإلا انهار الجناح.');
        break;
      case 'centerWeak':
        s.oppAsked = true;
        ev.title = 'قلب العدو يترنّح';
        ev.text = `صفوف ${foe.name} في القلب تتخلخل. لحظة قد لا تتكرر.`;
        opt('reserve', 'زجّ الاحتياط لكسر القلب', 'plus', 'دفعة قد تشق جيش العدو.', 'لا احتياط بعدها.', !hasRes);
        opt('charge', 'القائد يقود الهجوم بنفسه', 'helmet', 'معنويات وضربة أقوى.', 'خطر على حياة القائد.', !s.cmd || s.cmdAlive === false);
        opt('steady', 'حافظ على الضغط الحالي', 'shield', 'بلا مخاطرة.', 'قد يستعيد العدو توازنه.');
        break;
      case 'cmdExposed':
        s.exposedAsked = true;
        ev.title = 'قائد العدو مكشوف';
        ev.text = `${foe.cmd.name} يقاتل في المقدمة مع حرسه.`;
        opt('hunt', 'أرسل فرساناً لاصطياده', 'target', 'إن سقط اهتزّ جيشه كله.', 'قد تُباد فرقة الصيد.');
        opt('ignore', 'تجاهله', 'close', 'تبقى الصفوف كما هي.', null);
        break;
      case 'ammo':
        s.ammoAsked = true;
        ev.title = 'نفدت سهام الرماة';
        ev.text = 'جعاب رماتك شبه فارغة.';
        opt('back', 'اسحبهم إلى الاحتياط', 'retreat', 'يسلمون ويعودون وقت الحاجة.', 'تقل الأجساد في الصف.');
        opt('melee', 'ليشاركوا في الالتحام', 'sword', 'رجال إضافيون في الصف.', 'يقاتلون بضعف ويُقتلون.');
        opt('resupply', 'أعِد تزويدهم', 'cart', 'السهام تعود في المرحلة التالية.', 'لا رمي في هذه المرحلة.');
        break;
      case 'pursuit':
        s.pursueAsked = true;
        ev.title = 'العدو ينهار';
        ev.text = `صفوف ${foe.name} تتفكك. المطاردة تحصد الكثير — وقد تكون فخاً.`;
        opt('pursue', 'طارد بالفرسان', 'charge', 'قتلى وأسرى أكثر.', 'كمين محتمل إن بقي لديهم احتياط.');
        opt('hold', 'اثبت في الميدان', 'shield', 'نصر آمن.', 'ينجو كثير منهم.');
        break;
      case 'feintWarn':
        s.feintAsked = true;
        ev.title = 'العدو يتراجع فجأة؟';
        ev.text = `قلب ${foe.name} يبدو وكأنه ينسحب${this.cmdTrait(s, 'tactician') ? ' — قائدك الداهية يشك في خدعة' : ''}.`;
        opt('caution', 'لا تلاحق: اثبتوا', 'shield', 'لن تقع في فخ إن كان خدعة.', 'قد تضيع فرصة إن كان انسحاباً حقيقياً.');
        opt('chase', 'لاحقوهم!', 'charge', 'إن كان انهياراً حقيقياً فهو النصر.', 'إن كانت خدعة فهو الكمين.');
        break;
      case 'wounded':
        ev.title = 'القائد جريح';
        ev.text = `${s.cmd.name} مصاب في المعركة.`;
        opt('evac', 'احملوه إلى المؤخرة', 'retreat', 'ينجو القائد.', 'المعنويات تهبط.');
        opt('stay', 'يبقى ويقاتل', 'helmet', 'الصفوف تبقى متماسكة.', 'قد يموت.');
        break;
      case 'ram':
        s.ramAsked = true;
        ev.title = 'الكبش عند البوابة';
        ev.text = 'المدافعون يصبّون الزيت والحجارة على الكبش.';
        opt('cover', 'غطّوه بالتروس', 'shield', 'الكبش يصمد أكثر والرجال يسلمون.', 'البوابة تتأخر.');
        opt('push', 'ادفعوا بكل قوة', 'charge', 'البوابة تنهار أسرع.', 'خسائر ثقيلة عند البوابة.');
        opt('ladders', 'اتركوه واصعدوا بالسلالم', 'ladder', 'تشتت المدافعين.', 'خسائر التسلق.', !this.equip.ladders);
        break;
      case 'breach':
        s.breachAsked = true;
        ev.title = 'ثغرة مفتوحة!';
        ev.text = `${this.wallName(W, s)} مفتوح أمام رجالك.`;
        opt('pour', 'ادفعوا الجميع إلى الثغرة', 'charge', 'اقتحام سريع.', 'اختناق دامٍ في الثغرة.');
        opt('secure', 'ثبّتوا الثغرة أولاً', 'shield', 'تقدم أبطأ وخسائر أقل.', 'المدافعون يرممون صفوفهم.');
        break;
      case 'towerLost':
        s.towerAsked = true;
        ev.title = 'البرج احترق';
        ev.text = 'خسرت برج الحصار قبل أن يبلغ السور.';
        opt('ladders', 'تابعوا بالسلالم', 'ladder', 'الاقتحام يستمر.', 'خسائر التسلق.', !this.equip.ladders);
        opt('withdraw', 'انسحبوا إلى المعسكر', 'retreat', 'تحفظ الرجال لمحاولة أخرى.', 'يُحسب صدّاً للهجوم.');
        break;
      case 'sallyChance':
        s.sallyAsked = true;
        ev.title = 'آلات العدو مكشوفة';
        ev.text = `${this.towerAlive ? 'برج الحصار' : 'الكبش'} يقترب والمعسكر خلفه قليل الحراسة.`;
        opt('sally', 'اخرجوا واحرقوها', 'fire', 'قد تفقد العدو أهم معداته.', 'القوة الخارجة قد تُحاصر.');
        opt('stay', 'ابقوا على الأسوار', 'wall', 'بلا مخاطرة.', 'الآلات تبلغ السور.');
        break;
      case 'gate':
        s.gateAsked = true;
        ev.title = 'البوابة تتشقق';
        ev.text = 'ضربات الكبش تهز البوابة.';
        opt('reserve', 'دعّموا البوابة بالاحتياط', 'plus', 'صمود أطول عند البوابة.', 'يفرغ الاحتياط.', !hasRes);
        opt('second', 'جهّزوا خطاً ثانياً خلفها', 'shield', 'قتال شوارع أقوى إن سقطت.', 'البوابة ستسقط أسرع.');
        opt('oil', 'الزيت المغلي على الكبش', 'fire', 'فرصة لتدمير الكبش.', 'يستهلك رماة البوابة.');
        break;
      case 'wallsLost':
        s.wallAsked = true;
        ev.title = 'العدو على الأسوار!';
        ev.text = `${this.wallName(W, s)} سقط والمهاجمون يتدفقون.`;
        opt('counter', 'هجوم مضاد بالاحتياط', 'charge', 'قد تطرده من الثغرة.', 'إن فشل انهار كل شيء.', !hasRes);
        opt('fallback', this.walls >= 3 ? 'تراجعوا إلى القلعة' : 'تراجعوا إلى الشوارع', 'castle', 'قتال في العمق بميزة الدفاع.', 'المدينة تحترق.');
        opt('terms', 'فاوضوا على الاستسلام', 'talk', 'تخرج الحامية بممر آمن.', 'تسقط المدينة.');
        break;
      default: return null;
    }
    return ev;
  }

  // تطبيق القرار
  choose(ev, k) {
    const s = this.sides[ev.side];
    const foe = s.foe;
    const W = ev.wing;
    const opt = ev.options.find((o) => o.k === k) || ev.options[0];
    const say = (t, tone = '') => this.line(s, t, tone);
    s.orders++;
    this.decisions.push({ side: s.i, kind: ev.id + ':' + opt.k, text: opt.label, phase: this.phase, weight: 0 });
    switch (ev.id) {
      case 'enemyFlank': {
        if (opt.k === 'reserve') { this.commitReserve(s, W, 'flank'); s.flankWatch = W; s.flankCover = 700; }
        else if (opt.k === 'archers') { for (const u of this.secUnits(s, W).filter((x) => x.role === 'missile')) u.sec = 'C'; say(`الرماة ينسحبون من ${this.secName(W)} إلى القلب.`); }
        else if (opt.k === 'press') { s.sec.C.stance = 'advance'; s.sec.C.morale += 6; say('القلب يضغط بكل قوته.'); }
        else {
          const g = this.genOf(s, W);
          if (g && g.trait === 'cavalier') { s.flankCover = 500; say(`${g.name} يلتف بفرسانه لملاقاة الملتفين.`); }
          else if (g && g.flaw === 'cautious') { s.sec[W].front -= 0.3; s.flankWatch = W; say(`${g.name} يطوي الجناح إلى الخلف بحذر.`); }
          else if (g && g.flaw === 'reckless') { s.sec[W].stance = 'advance'; s.flankCover = 300; say(`${g.name} يندفع نحو الملتفين بلا انتظار!`); }
          else { s.flankCover = 250; say(`${g ? g.name : 'قائد الجناح'} يحني الصف لمواجهتهم.`); }
        }
        break;
      }
      case 'wingWaver': {
        const sec = s.sec[W];
        if (opt.k === 'reserve') this.commitReserve(s, W, 'waver');
        else if (opt.k === 'hold') {
          const ex = this.execQuality(s, W, 'hold');
          if (ex.q === 'disobey') { sec.stance = 'advance'; sec.morale -= 2; say(`${ex.g ? ex.g.name : 'قائد الجناح'} يتجاهل أمر الثبات ويندفع للهجوم!`, 'bad'); this.decisions.push({ side: s.i, kind: 'disobey', text: `${ex.g ? ex.g.name : 'قائد الجناح'} عصى أمر الثبات`, weight: 3 }); }
          else if (ex.q === 'excellent' || ex.q === 'good') { sec.morale += ex.q === 'excellent' ? 22 : 14; sec.state = 'ok'; sec.stance = 'hold'; say(`${this.secName(W)} يثبت${ex.g ? ' بصوت ' + ex.g.name : ''}!`, 'good'); if (ex.q === 'excellent') this.moment(s, `ثبات ${this.secName(W)} لدى ${s.name} رغم الخسائر`, 4, 'hold'); }
          else if (ex.q === 'poor') { sec.morale += 5; say(`${this.secName(W)} يتماسك بالكاد.`); }
          else { sec.morale -= 6; say(`الأمر لم يصل: ${this.secName(W)} يتفكك.`, 'bad'); }
        } else if (opt.k === 'withdraw') {
          const ex = this.execQuality(s, W, 'withdraw');
          sec.front -= 0.4; sec.morale += ex.q === 'fail' || ex.q === 'disobey' ? -8 : 12; sec.state = 'ok'; sec.stance = 'hold';
          const adj = 'C';
          s.sec[adj].morale -= 5;
          say(ex.q === 'fail' || ex.q === 'disobey' ? `الانسحاب يتحول إلى فوضى في ${this.secName(W)}!` : `${this.secName(W)} يتراجع خطوات وينظم صفوفه.`, ex.q === 'fail' ? 'bad' : '');
        } else {
          const ex = this.execQuality(s, W, 'bait');
          const cav = SECTS.concat('Res').flatMap((x) => this.secUnits(s, x)).filter((u) => u.role === 'cav').length;
          const p = clamp(0.3 + (this.cmdTrait(s, 'tactician') ? 0.3 : 0) + cav * 0.06 + { excellent: 0.15, good: 0.05, poor: -0.1, fail: -0.25, disobey: -0.3 }[ex.q], 0.05, 0.85);
          if (this.r() < p) {
            const fk = OPP[W];
            foe.sec[fk].morale -= 30; foe.sec[fk].flanked = true;
            const d = this.applyLoss(foe, fk, 25 + cav * 8, 'flank');
            this.led(s, 'feint', d + 80);
            say(`العدو يندفع خلف ${this.secName(W)} المتراجع… فيقع في الفخ!`, 'good');
            this.moment(s, `فخ ${this.secName(W)} المتراجع لدى ${s.name}`, 7, 'feint');
            this.decisions.push({ side: foe.i, kind: 'baited', text: 'اندفع خلف جناح متراجع فوقع في الفخ', weight: 5 });
          } else { this.breakSector(s, W); say('الخدعة فشلت والجناح انهار فعلاً.', 'bad'); this.decisions.push({ side: s.i, kind: 'baitFail', text: 'حاول الاستدراج بجناح منهار', weight: 3 }); }
        }
        break;
      }
      case 'centerWeak':
        if (opt.k === 'reserve') { this.commitReserve(s, 'C', 'break'); s.sec.C.stance = 'advance'; }
        else if (opt.k === 'charge') { s.cmdCharge = true; s.sec.C.morale += 14; s.sec.C.stance = 'advance'; s.cmdPos = 'front'; say(`${s.cmd.name} يتقدم الصفوف بنفسه!`, 'good'); this.moment(s, `${s.cmd.name} يقود الهجوم بنفسه`, 3, 'charge'); }
        break;
      case 'cmdExposed':
        if (opt.k === 'hunt') this.resolveHunt(s, 1.1);
        break;
      case 'ammo':
        for (const u of s.units.filter((x) => x.role === 'missile' && this.alive(x))) {
          if (opt.k === 'back') u.sec = 'Res';
          else if (opt.k === 'resupply') { u.ammo = 3; u.resupply = true; }
          else u.atk += 1;
        }
        s.ammoOut = 0;
        break;
      case 'pursuit':
        if (opt.k === 'pursue') { s.pursueHard = true; s.pursueTrap = this.secUnits(foe, 'Res').some((u) => u.role === 'cav' || u.role === 'shock') && this.r() < 0.45; }
        else s.noPursuit = true;
        break;
      case 'feintWarn':
        if (opt.k === 'caution') s.feintCaution = true; else s.feintChase = true;
        break;
      case 'wounded':
        if (opt.k === 'evac') this.evacuate(s);
        else if (this.r() < 0.35) { s.cmdWounded = false; this.commanderDown(s, 'killed', foe, 'battle'); }
        else { for (const k2 of SECTS) s.sec[k2].morale += 5; say(`${s.cmd.name} يربط جرحه ويبقى بين رجاله.`, 'good'); }
        break;
      case 'ram':
        if (opt.k === 'cover') s.ramCover = true;
        else if (opt.k === 'push') { s.ramPush = true; this.applyLoss(s, 'C', 30, 'melee'); }
        else { this.ramAlive = false; s.plan = 'escalade'; say('الرجال يتركون الكبش ويندفعون بالسلالم.'); }
        break;
      case 'breach':
        if (opt.k === 'pour') { const A2 = OPP[W]; for (const k2 of SECTS) { const us = this.secUnits(s, k2); if (k2 !== A2) for (const u of us.slice(0, Math.ceil(us.length / 2))) u.sec = A2; } s.sec[A2].stance = 'advance'; this.applyLoss(s, A2, 25, 'melee'); this.commitReserve(s, A2, 'breach'); }
        else { foe.sec[W].morale -= 6; s.sec[OPP[W]].morale += 8; }
        break;
      case 'towerLost':
        if (opt.k === 'withdraw') this.withdraw(s);
        else {
          s.plan = 'escalade';
          const tsec = this.towerSector;
          const us = this.secUnits(s, tsec);
          us.slice(Math.ceil(us.length / 3)).forEach((u, i) => { u.sec = i % 2 ? 'C' : OPP[tsec]; });
          say('الرجال يحملون السلالم ويتوزعون على السور.');
        }
        break;
      case 'sallyChance':
        if (opt.k === 'sally') this.resolveSally(s);
        break;
      case 'gate':
        if (opt.k === 'reserve') { this.commitReserve(s, 'C', 'gate'); s.sec.C.breach = Math.max(0, s.sec.C.breach - 0.25); }
        else if (opt.k === 'second') { s.secondLine = true; s.sec.C.breach = Math.min(0.99, s.sec.C.breach + 0.15); }
        else if (this.r() < 0.45) { this.ramAlive = false; say('الزيت المغلي يلتهم الكبش!', 'good'); this.moment(s, 'إحراق الكبش بالزيت', 4, 'ram'); }
        else say('الكبش ما زال يدق.', 'bad');
        break;
      case 'wallsLost':
        if (opt.k === 'counter') {
          const ok = this.commitReserve(s, W, 'counter');
          if (ok && this.r() < 0.45) { s.sec[W].breach = 0.6; foe.sec[OPP[W]].morale -= 15; say(`الهجوم المضاد يطرد العدو عن ${this.wallName(W, s)}!`, 'good'); this.moment(s, `طرد المهاجمين عن ${this.wallName(W, s)}`, 6, 'counter'); }
        } else if (opt.k === 'fallback') { s.plan = s.plan === 'walls' ? 'depth' : s.plan; for (const k2 of SECTS) s.sec[k2].morale += 6; say('المدافعون يتراجعون إلى خط أعمق.'); }
        else { this.surrendered = true; this.finish(foe.i, 'terms'); say('الحامية تطلب الأمان وتسلّم المدينة.'); }
        break;
    }
  }

  // قرار الذكاء في الأحداث
  aiChoose(s, ev) {
    const valid = ev.options.filter((o) => !o.dis);
    const pick = (...ks) => (ks.find((k) => valid.some((o) => o.k === k)) || valid[0].k);
    const aggr = s.aggr || 1;
    const t = s.cmd && s.cmd.trait, f = s.cmd && s.cmd.flaw;
    switch (ev.id) {
      case 'enemyFlank': return pick(this.r() < 0.55 ? 'reserve' : 'delegate', 'delegate');
      case 'wingWaver': return t === 'tactician' && this.r() < 0.5 ? pick('bait') : pick('reserve', 'hold');
      case 'centerWeak': return f === 'reckless' || (aggr > 1.1 && this.r() < 0.4) ? pick('charge', 'reserve') : pick('reserve', 'steady');
      case 'cmdExposed': return this.r() < 0.35 + (t === 'cavalier' ? 0.3 : 0) ? 'hunt' : 'ignore';
      case 'ammo': return pick('resupply', 'back');
      case 'pursuit': return f === 'cautious' ? 'hold' : this.r() < 0.6 ? 'pursue' : 'hold';
      case 'feintWarn': return t === 'tactician' || f === 'cautious' ? 'caution' : this.r() < 0.5 ? 'caution' : 'chase';
      case 'wounded': return this.r() < 0.5 ? 'evac' : 'stay';
      case 'ram': return pick(this.r() < 0.5 ? 'cover' : 'push');
      case 'breach': return pick(aggr > 1 ? 'pour' : 'secure');
      case 'towerLost': return pick('ladders', 'withdraw');
      case 'sallyChance': return this.r() < 0.35 ? 'sally' : 'stay';
      case 'gate': return pick('reserve', 'oil', 'second');
      case 'wallsLost': return pick(this.r() < 0.5 ? 'counter' : 'fallback', 'fallback');
      default: return valid[0].k;
    }
  }

  // ——————————— خطة الذكاء ———————————
  aiPlan(s) {
    const opts = this.availablePlans(s);
    if (!opts.length) return this.kind === 'siege' ? (s.att ? 'escalade' : 'walls') : 'balanced';
    const foe = s.foe;
    const share = (side, roles) => { const us = side.units.filter((u) => u.men > 0); const t = us.reduce((x, u) => x + u.men, 0) || 1; return us.filter((u) => roles.includes(u.role)).reduce((x, u) => x + u.men, 0) / t; };
    const pw = (side) => side.units.reduce((t, u) => t + this.unitMelee(u) + u.men * u.missile * 2, 0);
    const ratio = pw(s) / Math.max(1, pw(foe));
    const cav = share(s, ['cav']), sk = share(s, ['skirm']), mis = share(s, ['missile']), shock = share(s, ['shock']), line = share(s, ['line']);
    const fcav = share(foe, ['cav', 'skirm']), fline = share(foe, ['line']), fmis = share(foe, ['missile']);
    const t = this.terrain;
    const sc = {};
    for (const k of opts) {
      let v = 1;
      switch (k) {
        case 'balanced': v = 1; break;
        case 'assault': v = 0.6 + (ratio - 1) * 1.2 + (shock + cav) * 0.8 + fmis * 0.6 - fline * 0.8 - (!s.att && (t === 'hills' || t === 'mountains') ? 0.5 : 0); break;
        case 'defensive': v = 0.7 + (1 - ratio) * 1.2 + line * 0.9 + mis * 0.5; break;
        case 'flanking': v = 0.15 + (cav + sk) * 1.7 + ((FLANK_TERRAIN[t] || 1) - 1) * 1.5 - fcav * 1.6 - fline * 0.4; break;
        case 'attrition': v = 0.2 + (mis + sk) * 2.2 - fcav * 1.2 - (this.weather === 'rain' ? 0.8 : 0) + (t === 'plains' || t === 'desert' ? 0.15 : 0); break;
        case 'feigned': v = 0.2 + cav * 1.2 + (foe.cmd && ['reckless', 'arrogant'].includes(foe.cmd.flaw) ? 0.6 : 0) - (foe.cmd && foe.cmd.trait === 'tactician' ? 0.6 : 0); break;
        case 'highground': v = 1.5 + (1 - ratio) * 0.5; break;
        case 'breakcenter': v = 0.4 + shock * 1.6 + (ratio - 1) * 0.8; break;
        case 'hunt': v = 0.15 + cav * 0.8 + (foe.cmdPos === 'front' || (foe.cmd && foe.cmd.flaw === 'reckless') ? 0.3 : 0); break;
        case 'storm': v = 1 + (ratio - 1.5) * 0.4; break;
        case 'escalade': v = 0.8 + (ratio - 2) * 0.4 - this.walls * 0.1; break;
        case 'towers': v = 1.25 + this.walls * 0.08; break;
        case 'bombard': v = 1.1; break;
        case 'night': v = 0.9; break;
        case 'starve': v = -99; break;
        case 'walls': v = 1.2; break;
        case 'depth': v = 0.6 + (this.walls >= 3 ? 0.5 : 0); break;
        case 'sally': v = 0.3 + (this.towerAlive ? 0.4 : 0) + (ratio > 0.7 ? 0.3 : 0); break;
      }
      if (s.att && this.kind === 'field' && (t === 'hills' || t === 'mountains') && !s.foe.plan) {
        if (k === 'balanced' || k === 'assault' || k === 'breakcenter') v -= 0.4;
        if (k === 'flanking' || k === 'attrition' || k === 'feigned') v += 0.25;
      }
      v += this.affinity(s, k) * 0.35;
      v += (this.r() - 0.5) * (1.1 - s.ai) * 0.8;
      sc[k] = v;
    }
    return Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
  }

  // ——————————— تشغيل آلي كامل (للحسم السريع ومعارك الذكاء) ———————————
  runAuto() {
    this.autoAll = true;
    this.begin();
    let guard = 0;
    while (!this.over && guard++ < 60) {
      this.step();
      let ev;
      while ((ev = this.takeInterrupt())) this.choose(ev, this.aiChoose(this.sides[ev.side], ev));
      if (this.over) break;
      if (this.phaseDone()) {
        const evs = this.endPhase();
        for (const e of evs) this.choose(e, this.aiChoose(this.sides[e.side], e));
        this.nextPhase();
      }
    }
    if (!this.over) this.decideByScore();
    return this.result();
  }

  // ——————————— النتيجة للحملة ———————————
  result() {
    const fates = {};
    for (const s of this.sides) {
      const won = this.winner === s.i;
      for (const g of s.gens) {
        if (!g.id) continue;
        if (s.cmd === g && s.cmdAlive === false) { fates[g.id] = s.cmdFate || 'killed'; continue; }
        if (won) continue;
        // القادة في الجيش المنهزم: أسر أو قتل في الفوضى
        const guard = s.units.find((u) => u.gen === g);
        const secBroken = guard && s.sec[guard.sec] && s.sec[guard.sec].state === 'broken';
        let risk = (secBroken ? 0.25 : 0.1) * (g.flaw === 'reckless' ? 1.6 : 1) * (s.orderly ? 0.4 : 1) * (this.kind === 'siege' && !s.att && this.winner === 0 ? 1.8 : 1);
        if (this.reason === 'terms') risk = 0;
        if (this.r() < risk) fates[g.id] = this.r() < 0.6 ? 'captured' : 'killed';
      }
    }
    return {
      winner: this.winner, reason: this.reason,
      sides: this.sides.map((s) => ({ gens: s.gens.map((g) => g.id).filter(Boolean), units: s.units.map((u) => ({ ref: u.ref, type: u.type, men: Math.max(0, u.men), men0: u.men0, kills: Math.round(u.kills), gen: u.gen })) })),
      fates,
      wounded: this.sides.filter((s) => s.cmd && s.cmdWounded && s.cmdAlive !== false && s.cmd.id).map((s) => s.cmd.id),
      report: this.report(),
    };
  }

  // ——————————— التحليل والقصة ———————————
  report() {
    const S = this.sides;
    if (this.winner == null) return null;
    const W = S[this.winner], L = S[1 - this.winner];
    const lost = (s) => s.men0 - this.totalMen(s);
    const cas = S.map((s) => ({ name: s.name, color: s.color, men0: s.men0, lost: lost(s), pct: Math.round(100 * lost(s) / Math.max(1, s.men0)) }));
    const siege = this.kind === 'siege';
    // سبب النصر الرئيسي
    const weights = { missile: 1, charge: 1.3, melee: 0.8, flank: 1.6, feint: 1.8, hunt: 1.6, commander: 1.5, breach: 1.4, walls: 1.2, highground: 1.3, reserve: 1.1, pursuit: 0.5, rout: 1, spears: 1.2, sally: 1.4, guard: 1 };
    const led = Object.entries(W.ledger).map(([k, v]) => [k, v * (weights[k] || 1)]).sort((a, b) => b[1] - a[1]);
    let key = led.length ? led[0][0] : 'melee';
    if (key === 'rout' || key === 'pursuit') key = (led.find(([k]) => k !== 'rout' && k !== 'pursuit') || ['melee'])[0];
    const numbers = W.men0 > L.men0 * 1.45;
    const phName = (i) => (siege ? WS_PHASES[i].siege : WS_PHASES[i].name);
    const res = W.reserveCommit;
    const mainTxt = {
      missile: `تفوّق رماة ${W.name}: كثير من قتلى ${L.name} سقطوا بالسهام قبل أن يبلغوا الصفوف.`,
      charge: `انقضاض فرسان ${W.name} في الالتحام الأول كسر صفوف ${L.name}.`,
      melee: numbers ? `التفوق العددي لـ${W.name} أنهك ${L.name} في الاشتباك.` : `صمود مشاة ${W.name} وتفوقهم في الاشتباك المباشر.`,
      flank: `نجاح الالتفاف: ضرب ${W.name} جناح ${L.name} من الخلف.`,
      feint: `التقهقر المصطنع استدرج ${L.name} إلى فخ الفرسان.`,
      hunt: `فرقة الصيد أصابت قائد ${L.name} فتزلزل جيشه.`,
      commander: `سقوط قائد ${L.name} زلزل صفوفه.`,
      breach: `فتح الثغرة حسم الاقتحام.`,
      walls: `الأسوار صمدت: سقط المهاجمون تحت السهام والحجارة.`,
      highground: `التمسك بالمرتفع: الصاعدون تعبوا والسهام من فوقهم أبعد.`,
      reserve: res ? (res.phase >= 2
        ? `احتفاظ ${W.name} بالاحتياط حتى ${phName(res.phase)} سمح له ${res.why === 'flank' ? 'بإيقاف الالتفاف' : res.why === 'waver' ? 'بإنقاذ الموضع المترنح' : 'بكسر الصفوف في اللحظة الحاسمة'}.`
        : `الاحتياط الذي زجّه ${W.name} في ${phName(Math.max(0, res.phase))} ${res.why === 'flank' ? 'أوقف الالتفاف' : res.why === 'waver' ? 'أنقذ الموضع المترنح' : 'رجّح كفّته في الاشتباك'}.`) : `الاحتياط الطازج حسم اللحظة الحاسمة.`,
      spears: `جدار الرماح لدى ${W.name} صدّ فرسان ${L.name}.`,
      sally: `الخروج المفاجئ أحرق آلات الحصار.`,
      guard: `حرس القائد ردّ فرقة الصيد.`,
    }[key] || `${W.name} أدار المعركة أفضل.`;
    // ميزة التضاريس
    let terrainTxt = null;
    for (const [side, k, txt] of this.tnotes || []) {
      if (side && side !== W) continue;
      if (k === 'plains' && !(W.ledger.charge > 20 || W.ledger.flank > 50)) continue;
      if (k === 'forest' && !(L.units.some((u) => u.role === 'cav'))) continue;
      if (k === 'river' && !(this.sides[1] === W)) continue;
      terrainTxt = txt; break;
    }
    if (!terrainTxt && siege && this.winner === 1) terrainTxt = `أسوار ${this.place} (${['بلا أسوار', 'سياج خشبي', 'أسوار حجرية', 'قلعة', 'قلعة عظمى'][this.walls]}) ضاعفت قوة المدافعين.`;
    // خطأ الخاسر
    const mistakes = this.decisions.filter((d) => d.side === L.i && d.weight > 0).sort((a, b) => b.weight - a.weight);
    let mistake = mistakes.length ? mistakes[0].text : null;
    if (!mistake) {
      const counters = { assault: ['defensive', 'highground'], flanking: [], attrition: ['assault', 'flanking'], feigned: [], breakcenter: ['flanking'], hunt: [] };
      if ((counters[L.plan] || []).includes(W.plan)) mistake = `خطة «${PLANS[L.plan].name}» اصطدمت بخطة «${PLANS[W.plan].name}» المضادة لها.`;
      else if (L.plan === 'flanking' && (this.terrain === 'forest' || this.terrain === 'mountains')) mistake = 'حاول الالتفاف في أرض لا تسمح بالمناورة.';
      else if (L.plan === 'attrition' && this.weather === 'rain') mistake = 'اعتمد على السهام تحت المطر.';
      else if (!this.secUnits(L, 'Res').length && !L.reserveCommit && L.units.length > 4) mistake = 'لم يحتفظ باحتياط.';
      else if (L.cmdPos === 'front' && L.cmdAlive === false) mistake = 'قاتل قائده في المقدمة فسقط.';
    }
    // لحظة التحول
    let turning = null;
    let bestSwing = 0, turnPhase = 0;
    for (let i = 0; i < this.track.length; i++) {
      const cur = this.track[i], prev = i ? this.track[i - 1] : { m: [S[0].morale0, S[1].morale0] };
      const sw = (cur.m[this.winner] - cur.m[1 - this.winner]) - (prev.m[this.winner] - prev.m[1 - this.winner]);
      if (sw > bestSwing) { bestSwing = sw; turnPhase = cur.phase; }
    }
    const mom = this.moments.filter((m) => m.side === W.i).sort((a, b) => b.weight - a.weight);
    const inPhase = mom.find((m) => m.phase === turnPhase) || mom[0];
    if (inPhase) turning = `${inPhase.text} (${siege ? WS_PHASES[inPhase.phase].siege : WS_PHASES[inPhase.phase].name}).`;
    const verdict = this.reason === 'withdraw' ? 'انسحاب' : this.reason === 'terms' ? 'استسلام' : cas[1 - this.winner].pct - cas[this.winner].pct > 35 ? 'نصر حاسم' : cas[this.winner].pct > 40 ? 'نصر باهظ الثمن' : 'نصر';
    const story = this.story(W, L, cas, turning, mistake);
    return { place: this.place, kind: this.kind, terrain: this.terrain, weather: this.weather, winner: W.i, winnerName: W.name, loserName: L.name, verdict, main: mainTxt, terrainTxt, mistake, turning, cas, plans: [PLANS[S[0].plan] ? PLANS[S[0].plan].name : '', PLANS[S[1].plan] ? PLANS[S[1].plan].name : ''], story, reason: this.reason };
  }

  story(W, L, cas, turning, mistake) {
    const S = this.sides;
    const [a, d] = S;
    const gn = (s) => (s.cmd ? s.cmd.name : 'قائد مجهول');
    const place = this.place ? `عند ${this.place}` : '';
    const where = this.kind === 'siege' ? `تحت أسوار ${this.place}` : place;
    const open = this.kind === 'siege'
      ? `زحف ${gn(a)} بجيش ${a.name} ${where}، وقد اختار «${PLANS[a.plan].name}»، بينما وقف ${gn(d)} على الأسوار بخطة «${PLANS[d.plan].name}».`
      : `التقى ${gn(a)} على رأس ${a.name} بـ${gn(d)} قائد ${d.name} ${where}${this.weather !== 'clear' ? ' في يوم ' + WEATHER[this.weather].name : ''}. اختار الأول «${PLANS[a.plan].name}»، والثاني «${PLANS[d.plan].name}».`;
    const top = this.moments.slice().sort((x, y) => y.weight - x.weight).slice(0, 2).sort((x, y) => x.phase - y.phase);
    const mid = top.map((m) => m.text).join('، ثم ');
    const endTxt = this.reason === 'terms' ? `وانتهى اليوم باستسلام الحامية.` : this.reason === 'withdraw' ? `وانسحب ${L.name} ليقاتل يوماً آخر.` : this.kind === 'siege' ? (W === a ? `وسقطت المدينة بيد ${a.name}.` : `وارتدّ المهاجمون عن الأسوار.`) : `وانتهى اليوم بنصر ${W.name}.`;
    const loss = `خسر ${W.name} ${cas[W.i].lost} رجلاً، وخسر ${L.name} ${cas[L.i].lost}.`;
    const fall = S.filter((s) => s.cmdAlive === false).map((s) => `${s.cmdFate === 'captured' ? 'أُسر' : 'سقط'} ${s.cmd.name}`);
    return [open, mid ? `كان من أبرز ما جرى: ${mid}.` : '', turning && !mid.includes(turning.replace(/\s*\(.*\)\.$/, '')) ? `وكانت لحظة التحول: ${turning}` : '', mistake ? `أما ${L.name} فقد ${mistake.replace(/\.$/, '')}.` : '', fall.length ? fall.join('، و') + '.' : '', endTxt, loss].filter(Boolean).join(' ');
  }
}

// تقرير المعركة للواجهة
const BattleReport = {
  // الحكم من منظور اللاعب (P = رقم جانبه في المعركة)
  mine(rep, P) {
    const won = rep.winner === P;
    let t;
    if (rep.reason === 'withdraw') t = won ? 'العدو انسحب' : 'انسحاب منظم';
    else if (rep.reason === 'terms') t = won ? 'استسلمت الحامية' : 'استسلام';
    else t = won ? rep.verdict : ({ 'نصر حاسم': 'هزيمة ساحقة', 'نصر باهظ الثمن': 'هزيمة مشرّفة' }[rep.verdict] || 'هزيمة');
    return { won, text: t, sub: won ? `على ${rep.loserName}` : `أمام ${rep.winnerName}` };
  },
  render(rep, P, o = {}) {
    if (!rep) return h('p', null, '—');
    const me = P != null ? this.mine(rep, P) : null;
    const headTxt = me ? `${me.text} ${me.sub}` : `${rep.verdict}: ${rep.winnerName}`;
    return h('div', { class: 'breport' },
      h('div', { class: 'br-verdict' }, o.head === false ? null : icon(me && !me.won ? 'crownbroken' : 'laurel'), o.head === false ? null : h('b', null, headTxt), h('span', { class: 'muted small' }, rep.plans.join(' ضد '))),
      h('div', { class: 'br-cas' }, rep.cas.map((c) => h('div', { class: 'br-side' }, dotEl(c.color), h('b', null, c.name), h('span', { class: 'muted' }, `${c.men0} رجل`), h('span', { class: 'bad' }, `−${c.lost} (${c.pct}٪)`)))),
      h('div', { class: 'br-lines' },
        h('p', null, icon('star'), h('span', null, h('b', null, 'السبب الرئيسي: '), rep.main)),
        rep.terrainTxt ? h('p', null, icon(TERRAIN[rep.terrain] ? TERRAIN[rep.terrain].icon : 'map'), h('span', null, h('b', null, 'التضاريس: '), rep.terrainTxt)) : null,
        rep.mistake ? h('p', null, icon('warning'), h('span', null, h('b', null, me && me.won ? 'خطأ العدو: ' : `خطأ ${rep.loserName}: `), rep.mistake)) : null,
        rep.turning ? h('p', null, icon('hourglass'), h('span', null, h('b', null, 'لحظة التحول: '), rep.turning)) : null,
      ),
      h('details', { class: 'br-story' }, h('summary', null, 'قصة المعركة'), h('p', null, rep.story)),
    );
  },
};
