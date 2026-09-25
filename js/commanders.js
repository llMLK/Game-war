'use strict';
// القادة: شخصيات لا وحدات بأسماء.
// - مجلس حرب بسعة تتوسع مع رتبة الدولة ومؤسستها العسكرية وهيبتها، لا بالمال.
// - فرص استقطاب تأتي من تقدم حقيقي، وفي كل فرصة مرشحان تختار أحدهما، ومورد محدود لاستبدال مرشح.
// - تفاوض على الراتب قبل التعيين، وراتب له تفسير.
// - سجل وألقاب وندوب وذاكرة تؤثر في الولاء والكلام والطلبات، وخسارة القائد حدث مؤلم.
// النجوم تلخص الخبرة والقيادة والسمعة والسجل، وأثرها في دقة التنفيذ وحفظ المعنويات لا في مضاعفة الجيش.

const PRESTIGE = [
  { k: 'novice', name: 'ناشئ', min: 0, cls: 'p0' },
  { k: 'tried', name: 'مجرّب', min: 10, cls: 'p1' },
  { k: 'veteran', name: 'مخضرم', min: 25, cls: 'p2' },
  { k: 'famous', name: 'شهير', min: 45, cls: 'p3' },
  { k: 'legend', name: 'أسطوري', min: 70, cls: 'p4' },
];
// النمط القيادي لكل موهبة: ما يتقنه، وأين يضعف، وما يفضّله
const ARCH = {
  tactician: { name: 'الداهية', doctrine: 'maneuver', style: 'cunning', terrain: [], units: [], strong: 'الالتفاف والخدعة وقراءة العدو', weak: 'لا يتميز في الصدام المباشر' },
  brave: { name: 'المقتحم', doctrine: 'aggressive', style: 'fearless', terrain: [], units: ['inf'], strong: 'الهجوم الصادم وحفظ معنويات القلب', weak: 'يتكبد خسائر أكبر ويعرّض نفسه للخطر' },
  cavalier: { name: 'فارس الخيل', doctrine: 'maneuver', style: 'fearless', terrain: ['plains', 'desert'], units: ['cav'], strong: 'انقضاض الفرسان والالتفاف في الأرض المكشوفة', weak: 'يضعف في الغابات والجبال والحصار' },
  archer: { name: 'سيد الرماة', doctrine: 'defensive', style: 'careful', terrain: ['hills'], units: ['missile'], strong: 'الرماية والاستنزاف من موقع ثابت', weak: 'أقل حيلة في الالتحام المتحرك' },
  siege: { name: 'مهندس الحصار', doctrine: 'siegecraft', style: 'careful', terrain: [], units: ['mach'], strong: 'الأسوار: معدات أسرع وثغرات أدق', weak: 'متوسط في المعارك المفتوحة' },
  defender: { name: 'الصامد', doctrine: 'defensive', style: 'disciplined', terrain: [], units: ['inf'], strong: 'الدفاع عن المدن والثبات والاحتياط', weak: 'بطيء المبادرة في الهجوم' },
  merchant: { name: 'رجل الإدارة', doctrine: 'cautious', style: 'careful', terrain: [], units: [], strong: 'إدارة المدن والدخل والولاء', weak: 'متوسط عسكرياً، ومعنويات جيشه أقل' },
  logistician: { name: 'خبير التموين', doctrine: 'cautious', style: 'disciplined', terrain: [], units: [], strong: 'الإمداد والحملات الطويلة والانسحاب المنظم', weak: 'لا يحسم المعارك بنفسه' },
  swift: { name: 'الغازي السريع', doctrine: 'maneuver', style: 'cunning', terrain: ['plains', 'desert'], units: ['cav'], strong: 'الحركة السريعة والمطاردة والإغارة', weak: 'يضعف في الحصار والثبات الطويل' },
  mountaineer: { name: 'ابن الجبال', doctrine: 'defensive', style: 'disciplined', terrain: ['hills', 'mountains'], units: ['inf'], strong: 'الممرات والمرتفعات', weak: 'عادي في السهول' },
  desert: { name: 'ابن الصحراء', doctrine: 'maneuver', style: 'cunning', terrain: ['desert'], units: ['cav'], strong: 'الصحراء: لا عطش ولا إبطاء، وقتال أقوى فيها', weak: 'عادي في الغابات والجبال' },
  naval: { name: 'الربّان', doctrine: 'maneuver', style: 'careful', terrain: ['river', 'coast'], units: [], strong: 'الأنهار والسواحل والطرق المائية', weak: 'عادي بعيداً عن الماء' },
  elite: { name: 'قائد النخبة', doctrine: 'aggressive', style: 'inspiring', terrain: [], units: [], strong: 'يجنّد نخبة حضارته ويرفع معنويات رجاله', weak: 'كلفة جيشه عالية' },
  none: { name: 'ضابط', doctrine: 'cautious', style: 'careful', terrain: [], units: [], strong: 'لا موهبة خاصة', weak: 'أوامره أقل دقة' },
};
const STYLES = { inspiring: 'ملهم: يرفع المعنويات', disciplined: 'منضبط: صفوف متماسكة وانسحاب منظم', cunning: 'ماكر: خدع والتفاف', fearless: 'جريء: يقاتل في المقدمة', careful: 'حذر: أخطاء أقل واحتياط محفوظ' };
const DOCTRINES = { aggressive: 'هجومية', defensive: 'دفاعية', cautious: 'حذرة', maneuver: 'مناورة', siegecraft: 'حصار' };
const TERRAIN_AR = { plains: 'السهول', desert: 'الصحراء', hills: 'التلال', mountains: 'الجبال', forest: 'الغابات', river: 'الأنهار', coast: 'السواحل' };
const UNITCLS_AR = { cav: 'الفرسان', inf: 'المشاة', missile: 'الرماة', mach: 'آلات الحصار' };
const STATE_RANK = [
  { k: 'emirate', name: 'إمارة', min: 0, slots: 3 },
  { k: 'kingdom', name: 'مملكة', min: 4, slots: 6 },
  { k: 'empire', name: 'إمبراطورية', min: 10, slots: 8 },
];
const OPP_WHY = {
  start: 'بداية الحملة', rank: 'ارتفعت رتبة دولتك', city: 'فتحت مدينة مهمة', diwan: 'اكتمل ديوان الجند', loss: 'خسرت قائداً وتحتاج بديلاً',
  victory: 'نصر كبير يجذب الطامحين', prestige: 'ارتفعت هيبتك بين الممالك', event: 'حدث في العالم',
};
const DRAFT_MAX = 3, OPP_MAX = 3;
const FIC_NAMES = {
  arab: ['عامر بن سعد', 'خالد بن زياد', 'منصور بن عمرو', 'ثابت بن قيس', 'حمزة بن مالك', 'سالم بن عبيد', 'نصر بن حبيب', 'ليث بن عتبة', 'زياد بن حارثة', 'رافع بن هانئ', 'عتبة بن شداد', 'مالك بن نافع'],
  rum: ['نقيطاس', 'يوحنا', 'ميخائيل', 'ثيوفيلاكتوس', 'بطرس', 'قسطا', 'ديمتريوس', 'لاون الصغير', 'ستافراكيوس', 'بردانيس'],
  steppe: ['قاطون', 'قوتلوغ', 'تونغا', 'قرلغ', 'ساروخ', 'باغاتور', 'إلتر', 'كوباك', 'تارغو'],
  caucasus: ['فاسك', 'غريغور', 'ساهاك', 'فاختانغ', 'أرشاك'],
  han: ['لي تشنغ', 'وانغ شو', 'جانغ مينغ', 'تشن لي', 'ليو فانغ', 'جاو هونغ', 'سون جي', 'هو يان', 'دنغ شي', 'فنغ تشاو'],
};
const WAGE_BASE = [0, 4, 8, 14];

Object.assign(Game, {
  // ——————————————— السجل ———————————————
  catalog() { return (this.S && CMD_CATALOG[this.S.scenario]) || []; },
  catFind(name) { return name ? this.catalog().find((e) => e.n === name || (e.alias || []).includes(name)) || null : null; },
  catOf(g) { return g && g.cat ? this.catFind(g.cat) : null; },
  wikiUrl(e) {
    if (!e || !e.wiki) return null;
    return e.ar ? 'https://ar.wikipedia.org/wiki/' + encodeURIComponent(e.ar.replace(/ /g, '_')) : 'https://en.wikipedia.org/wiki/' + encodeURIComponent(e.wiki);
  },
  cultureOf(fid) {
    if (this.S.scenario === 'threeKingdoms') return 'han';
    return { umayyad: 'arab', byzantine: 'rum', khazar: 'steppe' }[fid] || (this.f(fid) && this.f(fid).kind === 'horde' ? 'steppe' : 'caucasus');
  },
  isOfficer(g) { return !!g && (g.name.startsWith('الضابط') || g.name.startsWith('الوصي')); },
  employed(g) { return !!g && ['army', 'gov', 'pool'].includes(g.status) && !this.isOfficer(g); },

  // يربط القائد بسجله ويشتق صفاته القيادية
  enrichGen(g, o = {}) {
    const e = this.catFind(g.name);
    if (e) {
      g.cat = e.n; g.src = e.src; g.born = e.born || null; g.died = e.died || null;
      if (!g.trait && e.trait) g.trait = e.trait;
      if (g.flaw == null && e.flaw) g.flaw = e.flaw;
      if (g.lead == null) g.lead = e.lead;
      if (g.fame == null) g.fame = e.fame;
    } else {
      g.src = g.src || (this.isOfficer(g) ? 'officer' : 'fic');
      if (g.lead == null) g.lead = this.isOfficer(g) ? 1 : Math.max(1, (o.rank || g.rank || 1) === 1 ? 1 : (o.rank || g.rank) === 2 ? 3 : 4);
      if (g.fame == null) g.fame = 0;
    }
    const A = ARCH[g.trait || 'none'] || ARCH.none;
    g.arch = g.trait || 'none';
    g.style = g.style || (g.flaw === 'reckless' ? 'fearless' : g.flaw === 'cautious' ? 'careful' : A.style);
    g.doctrine = g.doctrine || (g.flaw === 'reckless' ? 'aggressive' : g.flaw === 'cautious' ? 'cautious' : A.doctrine);
    g.terrain = g.terrain || A.terrain.slice();
    g.units = g.units || A.units.slice();
    if (g.ambition == null) g.ambition = clamp(1 + (['arrogant', 'disloyal', 'greedy'].includes(g.flaw) ? 1 : 0) + (g.fame >= 70 ? 1 : 0) - (g.flaw === 'cautious' ? 1 : 0), 0, 3);
    g.rec = g.rec || { battles: 0, wins: 0, losses: 0, cities: [], wounds: 0, captured: 0, beaten: [], famous: [] };
    g.titles = g.titles || []; g.mem = g.mem || []; g.scars = g.scars || []; g.friends = g.friends || [];
    g.culture = g.culture || this.cultureOf(g.orig || g.fid);
    if (g.xp == null) g.xp = 0;
    this.syncStars(g, false);
    return g;
  },
  // النجوم: قيادة القائد وخبرته وسمعته وسجله معاً (1 إلى 3)
  starScore(g) { return (g.lead || 1) + Math.floor((g.xp || 0) / 5) + (g.fame >= 45 ? 1 : 0) + (g.fame >= 70 ? 1 : 0) + Math.min(1, Math.floor(((g.rec && g.rec.wins) || 0) / 6)); },
  syncStars(g, announce = true) {
    const s = this.starScore(g);
    const r = s <= 3 ? 1 : s <= 6 ? 2 : 3;
    if (announce && r > g.rank && this.S) {
      this.event('int', `ارتقى القائد ${g.name} إلى ${'★'.repeat(r)} (${this.fname(g.fid)}).`, { fids: [g.fid], imp: g.fid === this.S.player ? 2 : 1 });
      if (g.fid === this.S.player) this.remember(g, 'promo', `ارتقى إلى ${'★'.repeat(r)}`, 3, 8);
    }
    g.rank = r;
  },
  prestigeOf(g) { let p = PRESTIGE[0]; for (const x of PRESTIGE) if ((g.fame || 0) >= x.min) p = x; return p; },
  addFame(g, v) { if (!g || this.isOfficer(g)) return; g.fame = Math.max(0, (g.fame || 0) + v); this.syncStars(g); },
  cmdAge(g) {
    if (g.born) return this.year() - g.born;
    if (g.age0 != null) return this.ageOf(g);
    return null;
  },

  // ——————————————— مجلس الحرب ———————————————
  stateRank(fid) { const n = this.nodesOf(fid).length; let r = STATE_RANK[0]; for (const x of STATE_RANK) if (n >= x.min) r = x; return r; },
  cmdCount(fid) { return this.gensOf(fid).filter((g) => this.employed(g) && !this.isRuler(g)).length; },
  cmdCapacity(fid) {
    const r = this.stateRank(fid);
    const parts = [[`رتبة الدولة: ${r.name}`, r.slots]];
    const cap = this.nodesOf(fid).find((n) => n.capital);
    if (cap && cap.diwan) parts.push([`ديوان الجند (المستوى ${cap.diwan})`, cap.diwan]);
    if (this.f(fid).rep >= 70) parts.push(['هيبة عالية (السمعة 70 فأكثر)', 1]);
    const ru = this.rulerOf ? this.rulerOf(fid) : null;
    if (ru && ['tactician', 'elite'].includes(ru.trait) && ru.status !== 'captive') parts.push(['سلطة مركزية: حاكم يحسن إدارة القادة', 1]);
    return { slots: parts.reduce((t, p) => t + p[1], 0), parts };
  },
  cmdRoom(fid) { return this.cmdCapacity(fid).slots - this.cmdCount(fid); },

  // ——————————————— الراتب: له تفسير ———————————————
  wageDemand(g, fid = g.fid) {
    const parts = [];
    const add = (k, v) => { if (Math.round(v)) parts.push([k, Math.round(v)]); };
    add(`الأساس: ${'★'.repeat(g.rank)}`, WAGE_BASE[g.rank] || 4);
    add(`القيادة (${g.lead})`, g.lead || 1);
    const pr = this.prestigeOf(g);
    add(`السمعة: ${pr.name}`, [0, 1, 3, 5, 8][PRESTIGE.indexOf(pr)]);
    const rec = g.rec || {};
    add(`إنجازات: ${(rec.cities || []).length} مدن، ${rec.wins || 0} انتصارات`, Math.min(6, (rec.cities || []).length * 2) + Math.min(6, Math.floor((rec.wins || 0) / 2)));
    let sub = parts.reduce((t, p) => t + p[1], 0);
    const mul = (k, m) => { const d = sub * (m - 1); if (Math.round(d)) { parts.push([k, Math.round(d)]); sub += d; } };
    const same = this.gensOf(fid).filter((x) => x !== g && this.employed(x) && x.trait === g.trait).length;
    if (g.trait && !same) mul('تخصص نادر في مجلسك', 1.15);
    else if (same >= 2) mul('تخصص متوفر عندك', 0.9);
    const r = this.stateRank(fid);
    if (r.k === 'empire') mul('الإمبراطوريات تدفع أكثر', 1.15);
    if (r.k === 'emirate') mul('الإمارة الصغيرة لا تُغري', 0.9);
    const e = this.catOf(g);
    if (g.orig === fid || (e && e.aff === fid)) mul('من أهل دولتك: يقبل أقل', 0.9);
    if (g.flaw === 'disloyal') mul('متقلّب: يريد ضماناً', 1.1);
    if (g.ambition >= 2) mul(`طموح (${g.ambition})`, 1 + 0.08 * g.ambition);
    if (g.flaw === 'greedy') mul('طمّاع', 1.5);
    return { total: Math.max(3, Math.round(sub)), parts };
  },
  // الراتب الفعلي: المتفق عليه، ونصفه لمن ينتظر في البلاط
  genSalary(g) {
    if (!g || this.isRuler && this.isRuler(g)) return 0;
    if (this.isOfficer(g)) return g.status === 'pool' ? 0 : 5;
    const w = g.wage != null ? g.wage : this.wageDemand(g).total;
    return g.status === 'pool' ? Math.round(w / 2) : w;
  },
  hireFee(g) { return this.isOfficer(g) ? 40 : 0; },

  // ——————————————— الفرص ———————————————
  oppsOf(fid) { this.S.opps = this.S.opps || {}; return (this.S.opps[fid] = this.S.opps[fid] || []); },
  draftOf(fid) { this.S.draft = this.S.draft || {}; return this.S.draft[fid] || 0; },
  addDraft(fid, v, why) {
    this.S.draft = this.S.draft || {};
    const before = this.draftOf(fid);
    this.S.draft[fid] = clamp(before + v, 0, DRAFT_MAX);
    if (fid === this.S.player && this.S.draft[fid] > before) this.alert('info', `نفوذ مجلس الحرب +1: ${why}`, { icon: 'seal', win: 'kingdom' });
  },
  // أسماء القادة المستعملين (لا يتكرر مرشح موجود أو ميت)
  takenNames() { return new Set(Object.values(this.S.gens).map((g) => g.cat || g.name)); },
  candValid(e, year) {
    if (e.at !== 'cand') return false;
    if (e.from != null && year < e.from) return false;
    if (e.to != null && year > e.to) return false;
    if (e.died != null && year > e.died) return false;
    if (e.born != null && year - e.born < 16) return false;
    return true;
  },
  drawCands(fid, n, exclude = []) {
    const year = this.year();
    const taken = this.takenNames();
    for (const o of Object.values(this.S.opps || {})) for (const op of o) for (const c of op.cands) if (c) taken.add(c.n);
    for (const x of exclude) taken.add(x);
    const r = rng(hashStr(fid + ':' + this.S.turn + ':' + (this.S.nextId || 0)));
    const pool = this.catalog().filter((e) => this.candValid(e, year) && !taken.has(e.n));
    const out = [];
    for (let i = 0; i < n; i++) {
      const w = {};
      // أهل الدولة أولاً، ثم الأحرار، ولا يُعرض رجل مملكة قائمة على غيرها إلا إن سقطت مملكته
      for (const e of pool) { if (out.some((c) => c.n === e.n)) continue; const v = e.aff === fid ? 4 : !e.aff ? 1.5 : this.f(e.aff) && this.f(e.aff).alive ? 0 : 1; if (v) w[e.n] = v * (e.src === 'hist' ? 1.4 : 1); }
      if (Object.keys(w).length && r() < 0.85) { const nm = weightedPick(w, r); const e = pool.find((x) => x.n === nm); out.push({ n: e.n, cat: true }); continue; }
      // لا مرشح تاريخي مناسب: شخصية متخيَّلة موسومة بذلك
      const cul = this.cultureOf(fid);
      const names = (FIC_NAMES[cul] || FIC_NAMES.arab).filter((x) => !taken.has(x) && !out.some((c) => c.n === x));
      if (!names.length) break;
      const nm = pick(names, r);
      const traits = Object.keys(ARCH).filter((t) => t !== 'none' && t !== 'elite');
      out.push({ n: nm, cat: false, trait: pick(traits, r), flaw: r() < 0.35 ? pick(['reckless', 'cautious', 'greedy', 'arrogant', 'harsh', 'disloyal'], r) : null, lead: 1 + Math.floor(r() * 3), culture: cul });
    }
    return out;
  },
  grantOpp(fid, why, key) {
    const F = this.f(fid);
    if (!F || !F.alive || F.neutral || F.kind === 'horde') return null;
    this.S.oppKeys = this.S.oppKeys || {};
    if (key && this.S.oppKeys[fid + ':' + key]) return null;
    const list = this.oppsOf(fid);
    if (list.length >= OPP_MAX) return null;
    const cands = this.drawCands(fid, 2);
    if (!cands.length) return null;
    if (key) this.S.oppKeys[fid + ':' + key] = this.S.turn;
    const op = { id: 'o' + this.S.nextId++, why, turn: this.S.turn, cands, tries: {} };
    list.push(op);
    if (fid === this.S.player) this.alert('imp', `فرصة استقطاب قائد: ${OPP_WHY[why] || why}`, { icon: 'helmet', win: 'opps', key: 'opp:' + op.id });
    else this.aiOpp(fid, op);
    return op;
  },
  // المرشح كما يُعرض: من السجل أو متخيَّل
  candView(c, fid) {
    const e = c.cat ? this.catFind(c.n) : null;
    const g = { id: null, name: c.n, fid, orig: e && e.aff ? e.aff : fid, trait: e ? e.trait : c.trait, flaw: e ? e.flaw : c.flaw, lead: e ? e.lead : c.lead, fame: e ? e.fame : 0, rank: 1, xp: 0, status: 'cand', culture: c.culture || this.cultureOf(e && e.aff ? e.aff : fid) };
    this.enrichGen(g);
    g.status = 'cand';
    g.demand = this.wageDemand(g, fid);
    return g;
  },
  // الحد الأدنى المخفي: شخصية المرشح تحدده (الطموح يرفعه، وأهل الدار يقبلون أقل)
  candFloor(c, fid) {
    const v = this.candView(c, fid);
    let k = 0.82 + rng(hashStr(c.n + ':floor'))() * 0.1 + 0.03 * v.ambition + (v.flaw === 'greedy' ? 0.08 : 0) - (v.orig === fid ? 0.06 : 0);
    return Math.round(v.demand.total * clamp(k, 0.7, 1.05));
  },
  offerReaction(c, fid, wage, promise) {
    const floor = this.candFloor(c, fid) * (promise ? 0.92 : 1);
    const x = wage / Math.max(1, floor);
    return x < 0.85 ? { k: 'no', name: 'غير مقتنع' } : x < 1 ? { k: 'maybe', name: 'متردد' } : x < 1.12 ? { k: 'ok', name: 'راضٍ' } : { k: 'eager', name: 'متحمس' };
  },
  replaceCand(fid, opId, idx) {
    const op = this.oppsOf(fid).find((o) => o.id === opId);
    if (!op) return 'الفرصة لم تعد قائمة';
    if (this.draftOf(fid) <= 0) return 'لا نفوذ في مجلس الحرب: يُكسب بفتح مدينة مهمة أو نصر كبير أو ارتفاع رتبة الدولة أو ختام فصل';
    const c = this.drawCands(fid, 1, op.cands.filter(Boolean).map((x) => x.n))[0];
    if (!c) return 'لا مرشح آخر متاح الآن';
    this.S.draft[fid]--;
    op.cands[idx] = c;
    return null;
  },
  // تقديم العرض: يقبل إن بلغ حده، ويرفض بسبب، وينسحب بعد رفضين
  proposeContract(fid, opId, idx, wage, promise) {
    const op = this.oppsOf(fid).find((o) => o.id === opId);
    const c = op && op.cands[idx];
    if (!c) return { err: 'المرشح لم يعد متاحاً' };
    if (this.cmdRoom(fid) <= 0) return { err: `مجلس الحرب ممتلئ (${this.cmdCount(fid)} من ${this.cmdCapacity(fid).slots}): أعفِ قائداً أو وسّع المجلس` };
    const v = this.candView(c, fid);
    const floor = this.candFloor(c, fid) * (promise ? 0.92 : 1);
    if (wage < floor) {
      op.tries[idx] = (op.tries[idx] || 0) + 1;
      if (op.tries[idx] >= 2) { op.cands[idx] = null; if (!op.cands.some(Boolean)) this.dropOpp(fid, opId); return { ok: false, gone: true, msg: `${v.name} يرحل: «لا أرى في عرضكم تقديراً لما أقدّمه».` } }
      return { ok: false, msg: `${v.name} يرفض: «${v.ambition >= 2 ? 'رجل بمثل سيرتي لا يُشترى بهذا' : 'العرض دون ما أستحق'}». يمكنك تحسين العرض مرة أخرى قبل أن يرحل.` };
    }
    const g = this.addGeneral(fid, c.n, v.trait, v.flaw, 1, { lead: v.lead, fame: v.fame, culture: v.culture });
    g.wage = Math.round(wage);
    g.loy = clamp(this.baseLoy(g) + Math.round((wage / Math.max(1, v.demand.total) - 1) * 40) + (promise ? 4 : 0), 20, 95);
    if (promise) { g.promise = { k: 'army', until: this.S.turn + 4 }; this.remember(g, 'promise', 'وُعد بقيادة جيش كبير', 0, 0); }
    if (wage >= v.demand.total * 1.1) this.remember(g, 'paid', 'راتب سخي عند التعيين', 4, 12);
    this.dropOpp(fid, opId);
    this.event('int', `${g.name} يدخل خدمة ${this.fname(fid)} براتب ${g.wage} كل دور.`, { fids: [fid], imp: fid === this.S.player ? 2 : 1 });
    if (fid === this.S.player && this.chronicle) this.chronicle('hero', `${g.name} (${ARCH[g.arch].name}) يدخل خدمة ${this.fname(fid)}.`, { fids: [fid], imp: 2 });
    return { ok: true, g };
  },
  dropOpp(fid, opId) { const l = this.oppsOf(fid); const i = l.findIndex((o) => o.id === opId); if (i >= 0) l.splice(i, 1); },
  // الممالك الأخرى تختار بالقواعد نفسها: الأنسب لحاجتها وبالسعر المطلوب
  aiOpp(fid, op) {
    if (this.cmdRoom(fid) <= 0) { this.dropOpp(fid, op.id); return; }
    const F = this.f(fid);
    const vs = op.cands.map((c, i) => c && { i, v: this.candView(c, fid) }).filter(Boolean);
    const need = (v) => (v.lead + (v.fame / 30)) - v.demand.total / 25 + (this.gensOf(fid).some((g) => this.employed(g) && g.trait === v.trait) ? 0 : 1);
    const best = vs.sort((a, b) => need(b.v) - need(a.v))[0];
    if (!best || F.gold < best.v.demand.total * 4) { this.dropOpp(fid, op.id); return; }
    this.proposeContract(fid, op.id, best.i, best.v.demand.total, false);
  },
  retireGeneral(g) {
    if (!g || !this.employed(g)) return 'لا يمكن';
    const a = g.status === 'army' ? this.army(g.army) : null;
    if (a && a.regs.length) return 'انقل وحدات جيشه أولاً';
    if (a) this.removeArmy(a);
    g.status = 'retired'; g.city = null; g.army = null;
    for (const f of this.friendsOf(g)) this.remember(f, 'retired', `اعتزل رفيقه ${g.name}`, -2, 6);
    this.event('int', `${g.name} يعتزل خدمة ${this.fname(g.fid)} مكرّماً.`, { fids: [g.fid], imp: 1 });
    return null;
  },

  // ——————————————— الذاكرة والسجل ———————————————
  remember(g, k, text, loy = 0, turns = 12) {
    if (!g || !g.mem) return;
    g.mem.push({ k, text, turn: this.S.turn, loy, until: this.S.turn + turns });
    if (g.mem.length > 16) g.mem.shift();
    if (loy) g.loy = clamp((g.loy || 50) + Math.round(loy / 2), 0, 100);
  },
  memLoyParts(g) {
    return (g.mem || []).filter((m) => m.loy && m.until >= this.S.turn).map((m) => [`ذكرى: ${m.text}`, m.loy]);
  },
  addTitle(g, t) {
    if (!g || !g.titles || this.isOfficer(g) || g.titles.some((x) => x.t === t)) return;
    g.titles.push({ t, turn: this.S.turn });
    this.addFame(g, 4);
    if (g.fid === this.S.player) { this.chronicle('hero', `${g.name} يُلقّب «${t}».`, { fids: [g.fid], imp: 2 }); this.alert('info', `${g.name}: ${t}`, { icon: 'laurel', win: 'kingdom' }); }
  },
  genTitle(g) { return g ? (g.titles && g.titles.length ? `${g.name}، ${g.titles[g.titles.length - 1].t}` : g.name) : ''; },
  friendsOf(g) { return (g.friends || []).map((id) => this.gen(id)).filter((x) => x && this.employed(x) && x.fid === g.fid); },
  befriend(a, b) {
    if (!a || !b || a === b || a.fid !== b.fid) return;
    a.pals = a.pals || {}; a.pals[b.id] = (a.pals[b.id] || 0) + 1;
    if (a.pals[b.id] === 2 && !a.friends.includes(b.id)) { a.friends.push(b.id); b.friends = b.friends || []; if (!b.friends.includes(a.id)) b.friends.push(a.id); this.remember(a, 'friend', `رفقة السلاح مع ${b.name}`, 2, 20); this.remember(b, 'friend', `رفقة السلاح مع ${a.name}`, 2, 20); }
  },
  // بعد كل معركة: السجل والشهرة والألقاب والذاكرة والرفقة والخصومة
  recordBattle(enc, out, sides) {
    const node = this.node(enc.node);
    const big = this.menOf(sides.attRegs) + this.menOf(sides.defRegs) >= 700 || node.capital;
    const winSide = out.winner === 0 ? sides.attGens : sides.defGens;
    const loseSide = out.winner === 0 ? sides.defGens : sides.attGens;
    const bname = `${enc.kind === 'siege' ? 'اقتحام' : 'معركة'} ${node.name}`;
    for (const [list, won] of [[winSide, true], [loseSide, false]]) {
      for (const g of list) {
        if (!g.rec) this.enrichGen(g);
        g.rec.battles++;
        if (won) g.rec.wins++; else g.rec.losses++;
        if (big) g.rec.famous.push(bname);
        if (g.rec.famous.length > 8) g.rec.famous.shift();
        this.addFame(g, won ? (big ? 7 : 3) : 1);
        for (const o of list) if (o !== g) this.befriend(g, o);
        if (won) for (const e of (won ? loseSide : [])) { if (!g.rec.beaten.includes(e.name)) g.rec.beaten.push(e.name); if (e.fame >= 45 && out.fates && out.fates[e.id]) this.addTitle(g, `قاهر ${e.name}`); }
        if (!won) for (const e of winSide) { g.rival = e.id; }
        if (won && g.rec.wins === 5) this.addTitle(g, 'المظفّر');
        if (won && enc.type === 'assault' && out.winner === 1 && node.walls && node.owner === g.fid) this.addTitle(g, `صامد ${node.name}`);
        if (won && big) this.remember(g, 'victory', `قاد النصر في ${bname}`, 4, 16);
      }
    }
    // جيش فقد معظم رجاله
    for (const a of [...sides.attArmies, ...sides.defArmies]) {
      const g = this.armyGen(a);
      if (!g || !g.mem) continue;
      const men0 = a._men0 || 0, men1 = this.menOf(a.regs);
      if (men0 > 200 && men1 < men0 * 0.45) this.remember(g, 'decimated', `خسر معظم جيشه في ${bname}`, -3, 10);
    }
    for (const id of out.wounded || []) {
      const g = this.gen(id);
      if (!g || !g.rec) continue;
      g.rec.wounds++; g.wounded = this.S.turn + 2;
      g.scars.push(`جرح في ${bname}`);
      this.remember(g, 'wounded', `جُرح في ${bname}`, 0, 0);
    }
  },
  recordCapture(node, fid, armies) {
    const major = node.capital || node.pop >= 20000;
    for (const a of armies) {
      const g = this.armyGen(a);
      if (!g || !g.rec || g.fid !== fid) continue;
      g.rec.cities.push(node.name);
      this.addFame(g, major ? 8 : 4);
      if (major && !g.titles.some((t) => t.t.startsWith('فاتح'))) this.addTitle(g, `فاتح ${node.name}`);
      if (g.promise && g.promise.k === 'army') { this.remember(g, 'kept', 'وفيت بوعده بقيادة جيش', 5, 16); g.promise = null; }
    }
    // فتح مدينة مهمة يفتح فرصة ويمنح نفوذاً
    if (major) { this.grantOpp(fid, 'city', 'city:' + node.id); this.addDraft(fid, 1, `فتح ${node.name}`); }
  },
  // خسارة القائد: ليست سطراً في السجل
  onCommanderLost(g, fate, byFid) {
    if (!g || this.isOfficer(g)) return;
    const fid = g.fid, F = this.f(fid);
    if (!F || !F.alive) return;
    const pr = this.prestigeOf(g);
    const title = this.genTitle(g);
    const a = Object.values(this.S.armies).find((x) => x.gen === g.id);
    if (a) a.mood = { k: 'shaken', t: 2 };
    for (const f of this.friendsOf(g)) {
      this.remember(f, 'grief', fate === 'killed' || fate === 'executed' ? `فقد رفيقه ${g.name}` : `أُسر رفيقه ${g.name}`, fate === 'captured' ? -2 : -4, 12);
      if (byFid && byFid !== fid && (fate === 'killed' || fate === 'executed')) f.vow = { vs: byFid, name: g.name, until: this.S.turn + 12 };
    }
    if (byFid && (fate === 'killed' || fate === 'executed')) {
      this.S.vows = this.S.vows || [];
      this.S.vows.push({ fid, vs: byFid, name: g.name, until: this.S.turn + 12, done: false });
      if (fid === this.S.player) this.alert('imp', `رفاق ${g.name} يقسمون على الثأر من ${this.fname(byFid)}: انتصر عليهم خلال 12 دوراً`, { icon: 'drop', win: 'kingdom' });
    }
    if (PRESTIGE.indexOf(pr) >= 3) {
      F.rep = Math.max(0, F.rep - 2);
      const cap = this.nodesOf(fid).find((n) => n.capital);
      if (cap) cap.loyalty = Math.max(0, cap.loyalty - 3);
      this.chronicle('death', `${fate === 'captured' ? 'أسر' : 'فقدت'} ${F.name} ${title}، ${pr.name} عصره.`, { fids: [fid, byFid].filter(Boolean), imp: 3 });
    }
    this.grantOpp(fid, 'loss', 'loss:' + g.id);
  },
  vowTick() {
    for (const v of this.S.vows || []) {
      if (v.done) continue;
      if (this.S.turn > v.until) { v.done = true; if (v.fid === this.S.player) for (const g of this.gensOf(v.fid).filter((x) => x.vow && x.vow.name === v.name)) { this.remember(g, 'unavenged', `لم يُثأر لـ${v.name}`, -4, 10); g.vow = null; } }
    }
  },
  vowFulfil(winFid, loseFid, g) {
    for (const v of this.S.vows || []) {
      if (v.done || v.fid !== winFid || v.vs !== loseFid) continue;
      v.done = true;
      for (const x of this.gensOf(winFid)) if (x.vow && x.vow.name === v.name) { this.remember(x, 'avenged', `أخذ الثأر لـ${v.name}`, 6, 16); x.vow = null; }
      if (g) this.addFame(g, 6);
      this.f(winFid).rep = Math.min(100, this.f(winFid).rep + 2);
      if (winFid === this.S.player) this.alert('info', `أُخذ الثأر لـ${v.name}`, { icon: 'laurel' });
    }
  },

  // ——————————————— كل دور ———————————————
  commanderTick() {
    const S = this.S;
    S.cmdRank = S.cmdRank || {};
    for (const fid of this.aliveMajors()) {
      const F = this.f(fid);
      if (F.kind === 'horde') continue;
      const r = this.stateRank(fid);
      const prev = S.cmdRank[fid];
      if (prev && STATE_RANK.findIndex((x) => x.k === r.k) > STATE_RANK.findIndex((x) => x.k === prev)) {
        this.grantOpp(fid, 'rank', 'rank:' + r.k);
        this.addDraft(fid, 1, `صارت دولتك ${r.name}`);
        if (fid === S.player) this.chronicle('realm', `${F.name} تصير ${r.name}. يتسع مجلس الحرب.`, { fids: [fid], imp: 2 });
      }
      S.cmdRank[fid] = r.k;
      for (const th of [60, 75]) if (F.rep >= th) this.grantOpp(fid, 'prestige', 'rep' + th);
    }
    this.vowTick();
    // الطلبات: زيادة الراتب لمن اشتهر، وقيادة لمن وُعد أو طمح
    for (const g of Object.values(S.gens)) {
      if (!this.employed(g) || this.isRuler(g) || !g.mem) continue;
      if (g.promise && g.promise.until < S.turn) {
        if (g.status === 'army' && this.army(g.army) && this.army(g.army).regs.length >= 5) { this.remember(g, 'kept', 'نال القيادة التي وُعد بها', 4, 12); }
        else this.remember(g, 'broken', 'لم ينل القيادة التي وُعد بها', -8, 16);
        g.promise = null;
      }
      if (g.fid !== S.player) continue;
      const d = this.wageDemand(g).total;
      if (g.wage != null && d > g.wage * 1.3 && !g.ask && !g.mem.some((m) => m.k === 'denied' && m.until >= S.turn)) {
        g.ask = { k: 'raise', to: d, turn: S.turn };
        this.alert('imp', `${g.name} يطلب زيادة راتبه إلى ${d} بعد ما حققه`, { icon: 'coins', win: 'gen:' + g.id, key: 'ask:' + g.id });
      }
      if (g.ask && S.turn - g.ask.turn > 3) { this.answerAsk(g, false); }
    }
  },
  answerAsk(g, yes) {
    const q = g.ask;
    if (!q) return;
    g.ask = null;
    if (q.k === 'raise') {
      if (yes) { g.wage = q.to; this.remember(g, 'raise', `رفعتَ راتبه إلى ${q.to}`, 6, 16); }
      else this.remember(g, 'denied', 'رفضتَ زيادة راتبه', -8, 12);
    }
  },
});

// ——————————————— ربط القادة بالأنظمة القائمة ———————————————
(() => {
  const addGeneral = Game.addGeneral;
  Game.addGeneral = function (fid, name, trait, flaw, rank = 1, o = {}) {
    const g = addGeneral.call(this, fid, name, trait, flaw, rank);
    if (o.lead != null) g.lead = o.lead;
    if (o.fame != null) g.fame = o.fame;
    if (o.culture) g.culture = o.culture;
    g.xp = 0;
    this.enrichGen(g, { rank });
    if (!this.isOfficer(g) && g.wage == null) g.wage = this.wageDemand(g).total;
    return g;
  };
  // الخبرة تُحسب بالنقاط والنجوم تُشتق منها ومن القيادة والسمعة
  Game.gainXp = function (g, v) { if (!g || g.status === 'dead') return; g.xp = (g.xp || 0) + v; this.syncStars(g); };
  const setGenFate = Game.setGenFate;
  Game.setGenFate = function (g, fate, captor) {
    const r = setGenFate.call(this, g, fate, captor);
    if (fate === 'captured' && g.rec) { g.rec.captured++; this.remember(g, 'captured', `أسره ${this.fname(captor)}`, 0, 0); }
    if (fate === 'killed' || fate === 'captured') this.onCommanderLost(g, fate, captor || (g.rival && this.gen(g.rival) ? this.gen(g.rival).fid : null));
    return r;
  };
  const ransomCaptive = Game.ransomCaptive;
  Game.ransomCaptive = function (g, by, price) { const r = ransomCaptive.call(this, g, by, price); this.remember(g, 'rescued', `افتدته دولته بـ${price} ذهباً`, 8, 20); return r; };
  const exchangeCaptives = Game.exchangeCaptives;
  Game.exchangeCaptives = function (g1, g2) { const r = exchangeCaptives.call(this, g1, g2); this.remember(g1, 'rescued', 'حرّرته دولته بتبادل الأسرى', 6, 16); this.remember(g2, 'rescued', 'حرّرته دولته بتبادل الأسرى', 6, 16); return r; };
  const executeCaptive = Game.executeCaptive;
  Game.executeCaptive = function (g, by) { const r = executeCaptive.call(this, g, by); g.status = 'dead'; this.onCommanderLost(g, 'executed', by); return r; };
  const honorGeneral = Game.honorGeneral;
  Game.honorGeneral = function (fid, g) { const e = honorGeneral.call(this, fid, g); if (!e) this.remember(g, 'honored', 'كرّمته بالعطايا', 5, 12); return e; };
  const genLoyParts = Game.genLoyParts;
  Game.genLoyParts = function (g) {
    const parts = genLoyParts.call(this, g);
    if (g.wage != null && !this.isOfficer(g)) {
      const d = this.wageDemand(g).total;
      if (g.wage < d * 0.85) parts.push([`راتبه (${g.wage}) دون ما يراه حقه (${d})`, -6]);
      else if (g.wage >= d * 1.15) parts.push(['راتب سخي', 4]);
    }
    if (this.employed(g) && !this.isRuler(g) && this.cmdRoom(g.fid) < 0) parts.push([`مجلس الحرب فوق طاقته (${this.cmdCount(g.fid)} من ${this.cmdCapacity(g.fid).slots}): القادة يتنافسون`, -5]);
    return parts.concat(this.memLoyParts(g));
  };
  // ضم الأسير يحتاج مقعداً في المجلس
  const tryRecruitCaptive = Game.tryRecruitCaptive;
  Game.tryRecruitCaptive = function (g, by) {
    if (!this.isOfficer(g) && this.cmdRoom(by) <= 0) { g.refused = (g.refused || 0) + 1; return false; }
    const ok = tryRecruitCaptive.call(this, g, by);
    if (ok) { g.wage = this.wageDemand(g, by).total; this.remember(g, 'turned', `انتقل إلى ${this.fname(by)} بعد أسره`, 0, 0); }
    return ok;
  };
  const finishEncounter = Game.finishEncounter;
  Game.finishEncounter = async function (enc, out) {
    const sides = this.encSides(enc);
    for (const a of [...sides.attArmies, ...sides.defArmies]) a._men0 = this.menOf(a.regs);
    const gens = { attGens: sides.attGens.slice(), defGens: sides.defGens.slice() };
    const r = await finishEncounter.call(this, enc, out);
    try {
      this.recordBattle(enc, out, { ...sides, ...gens });
      const winFid = out.winner === 0 ? enc.attFid : enc.defFid, loseFid = out.winner === 0 ? enc.defFid : enc.attFid;
      this.vowFulfil(winFid, loseFid, (out.winner === 0 ? gens.attGens : gens.defGens)[0]);
      const lost = this.menOf(out.winner === 0 ? sides.defRegs : sides.attRegs);
      const lost0 = (out.winner === 0 ? sides.defArmies : sides.attArmies).reduce((t, a) => t + (a._men0 || 0), 0);
      const big = Object.keys(out.fates || {}).some((id) => (this.gen(id) || {}).fid === loseFid) || (lost0 >= 300 && lost < lost0 * 0.6);
      this.S.oppVict = this.S.oppVict || {};
      if (big && (this.S.oppVict[winFid] == null || this.S.turn - this.S.oppVict[winFid] >= 6)) { this.S.oppVict[winFid] = this.S.turn; this.grantOpp(winFid, 'victory'); if (lost0 >= 600) this.addDraft(winFid, 1, 'نصر كبير'); }
    } catch (e) { console.error('record', e); }
    for (const a of [...sides.attArmies, ...sides.defArmies]) delete a._men0;
    return r;
  };
  const capture = Game.capture;
  Game.capture = async function (node, fid, how, armies = []) {
    const r = await capture.call(this, node, fid, how, armies);
    this.recordCapture(node, fid, armies.filter((a) => this.S.armies.includes(a)));
    return r;
  };
})();
