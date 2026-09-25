'use strict';
// عمق المملكة في منتصف الحملة وآخرها: أهداف نصر متعددة، فصول الحملة، التابعون،
// الحكّام والتطوير التلقائي والمراسيم (بدل إدارة كل مدينة بيدك)، وقيمة الخسارة (الثأر).

const DEV_FOCUS = {
  manual: { name: 'يدوي', icon: 'hammer', desc: 'تبني بنفسك من نافذة المدينة.' },
  economy: { name: 'الازدهار', icon: 'market', desc: 'أسواق وطرق معبّدة ومزارع.' },
  military: { name: 'الحرب', icon: 'horseshoe', desc: 'إسطبلات وورش ومزارع تُطعم الجيوش.' },
  defense: { name: 'الحصون', icon: 'wall', desc: 'أسوار ومخازن في مدن الحدود أولاً.' },
};
const EDICTS = {
  none: { name: 'بلا مرسوم', icon: 'scroll', desc: 'لا أثر.' },
  tolerance: { name: 'التسامح', icon: 'dove', desc: 'ولاء المدن +6، ودخلها −8٪.', loyalty: 6, income: -0.08 },
  levy: { name: 'النفير العام', icon: 'men', desc: 'القوى البشرية تتجدد أسرع 40٪، والولاء −4.', loyalty: -4, mp: 0.4 },
  trade: { name: 'الأسواق الحرة', icon: 'camel', desc: 'التجارة والقوافل +30٪، والولاء −2.', loyalty: -2, trade: 0.3 },
};
// أحلام تاريخية لكل مملكة
const HISTORIC = {
  threeKingdoms: {
    shu: { name: 'استعادة عرش هان', desc: 'احكم العاصمتين القديمتين تشانغآن ولوويانغ مع تشنغدو.', nodes: ['changan', 'luoyang', 'chengdu'] },
    wei: { name: 'السهول الوسطى والنهر', desc: 'اجمع شوتشانغ وشيانغيانغ وجيانغلينغ وخفي وتشايسانغ.', nodes: ['xuchang', 'xiangyang', 'jiangling', 'hefei', 'chaisang'] },
    wu: { name: 'سيادة النهر الطويل', desc: 'املك النهر من جيانغتشو إلى جيانيه.', nodes: ['jiangzhou', 'jiangling', 'xiangyang', 'chaisang', 'jianye'] },
  },
  umayyad: {
    umayyad: { name: 'فتح القسطنطينية', desc: 'الحلم الذي لم يتحقق: القسطنطينية ودمشق معاً.', nodes: ['constantinople', 'damascus'] },
    byzantine: { name: 'استعادة الشام', desc: 'أنطاكية وحلب ودمشق مع القسطنطينية.', nodes: ['antioch', 'aleppo', 'damascus', 'constantinople'] },
    khazar: { name: 'أبواب القوقاز والجزيرة', desc: 'باب الأبواب ودبيل وتفليس وملطية والموصل مع إتل.', nodes: ['derbent', 'dvin', 'tiflis', 'malatya', 'mosul', 'atil'] },
  },
};
const RIVAL = { threeKingdoms: { shu: 'wei', wei: 'shu', wu: 'wei' }, umayyad: { umayyad: 'byzantine', byzantine: 'umayyad', khazar: 'umayyad' } };
const CHAPTERS = [
  { name: 'الفصل الأول: البقاء', short: 'I البقاء', desc: 'ثبّت أقدامك: مدن قليلة، وجيران أقوياء.' },
  { name: 'الفصل الثاني: الطموح', short: 'II الطموح', desc: 'حان وقت التوسع واختيار الطريق.' },
  { name: 'الفصل الثالث: التنافس', short: 'III التنافس', desc: 'خصمك يعرفك الآن. كل حرب قد تكون الحاسمة.' },
  { name: 'الفصل الرابع: عصر الإمبراطوريات', short: 'IV الإمبراطوريات', desc: 'الكبار يتحالفون ويتآمرون، والأطراف تتململ.' },
  { name: 'الفصل الخامس: الأزمة', short: 'V الأزمة', desc: 'العاصفة فوق مملكتك. النجاة هي النصر الآن.' },
];

Object.assign(Game, {
  // ------------------ الأهداف والنصر -------------------
  objectivesOf(fid) {
    const S = this.S;
    S.obj = S.obj || {};
    const total = S.nodes.length;
    const mine = this.nodesOf(fid);
    const out = [];
    const frac = this.sc.empireFrac || 0.65;
    const need = Math.ceil(total * frac);
    out.push({ k: 'empire', icon: 'crown', name: 'الإمبراطورية', desc: `احكم ${need} مدينة من ${total} ثلاثة أدوار متتالية.`, have: mine.length, need, hold: S.obj.emp || 0, done: mine.length >= need && (S.obj.emp || 0) >= 3 });
    const hd = (HISTORIC[S.scenario] || {})[fid];
    if (hd) {
      const have = hd.nodes.filter((id) => this.node(id) && this.node(id).owner === fid).length;
      out.push({ k: 'historic', icon: 'map', name: hd.name, desc: `${hd.desc} (ثلاثة أدوار متتالية)`, have, need: hd.nodes.length, hold: S.obj.hist || 0, done: have >= hd.nodes.length && (S.obj.hist || 0) >= 3, nodes: hd.nodes });
    }
    const rv = (RIVAL[S.scenario] || {})[fid];
    if (rv && this.f(rv)) {
      const gone = !this.f(rv).alive || this.isVassalOf(rv, fid);
      out.push({ k: 'rival', icon: 'swords', name: `كسر ${this.fname(rv)}`, desc: `أسقط ${this.fname(rv)} أو اجعلها تابعة لك.`, have: gone ? 1 : 0, need: 1, done: gone, sub: this.f(rv).alive ? `${this.nodesOf(rv).length} مدن باقية` : 'سقطت' });
    }
    const r = this.tradeGoal(fid);
    if (r) {
      const have = r.path.filter((id) => this.node(id) && this.node(id).owner === fid).length;
      out.push({ k: 'trade', icon: 'camel', name: 'سيد القوافل', desc: `املك كل مدن ${r.name} ستة أدوار متتالية.`, have, need: r.path.length, hold: S.obj.trade || 0, done: have >= r.path.length && (S.obj.trade || 0) >= 6, nodes: r.path });
    }
    const vs = this.aliveMajors().filter((id) => this.isVassalOf(id, fid)).length;
    out.push({ k: 'vassals', icon: 'seal', name: 'ملك الملوك', desc: 'اجعل مملكتين تابعتين لك في وقت واحد.', have: vs, need: 2, done: vs >= 2 });
    return out;
  },
  // طريق القوافل الذي لا تملكه في البداية: هدف يستحق الجهد
  tradeGoal(fid) {
    const S = this.S;
    S.obj = S.obj || {};
    const rs = this.wd().routes || [];
    if (!rs.length) return null;
    if (!S.obj.tradeKey) {
      const frac = (r) => r.path.filter((id) => this.node(id) && this.node(id).owner === fid).length / r.path.length;
      S.obj.tradeKey = rs.slice().sort((a, b) => frac(a) - frac(b))[0].key;
    }
    return rs.find((r) => r.key === S.obj.tradeKey) || null;
  },
  checkObjectives() {
    const S = this.S, P = S.player;
    if (S.over || S.endless || !this.f(P) || !this.f(P).alive) return;
    S.obj = S.obj || {};
    const hd = (HISTORIC[S.scenario] || {})[P];
    S.obj.hist = hd && hd.nodes.every((id) => this.node(id) && this.node(id).owner === P) ? (S.obj.hist || 0) + 1 : 0;
    const frac = this.sc.empireFrac || 0.65;
    S.obj.emp = this.nodesOf(P).length >= Math.ceil(S.nodes.length * frac) ? (S.obj.emp || 0) + 1 : 0;
    // إمبراطورية منافسة تنهي الحملة بدل استمرار بلا معنى
    const rivalEmp = this.aliveMajors().find((id) => id !== P && !this.f(id).kind && this.nodesOf(id).length >= Math.ceil(S.nodes.length * frac));
    S.obj.rivalEmp = rivalEmp && rivalEmp === S.obj.rivalEmpId ? (S.obj.rivalEmp || 0) + 1 : rivalEmp ? 1 : 0;
    S.obj.rivalEmpId = rivalEmp || null;
    if (rivalEmp && S.obj.rivalEmp >= 3 && !this.isVassalOf(P, rivalEmp)) {
      S.over = 'lose';
      S.overWhy = `قامت إمبراطورية ${this.fname(rivalEmp)} على أغلب البلاد، وصار ما بقي لك هامشاً على خريطتها.`;
      this.chronicle('realm', `${this.fname(rivalEmp)} تبسط سلطانها على أغلب البلاد.`, { fids: [rivalEmp, P], imp: 3 });
      return;
    }
    const r = this.tradeGoal(P);
    S.obj.trade = r && r.path.every((id) => this.node(id) && this.node(id).owner === P) ? (S.obj.trade || 0) + 1 : 0;
    const done = S.turn >= 20 ? this.objectivesOf(P).find((o) => o.done) : null;
    if (done) {
      S.over = 'win';
      const txt = {
        empire: 'صارت أغلب البلاد تحت رايتك. قامت الإمبراطورية.',
        historic: `تحقق الحلم القديم: ${done.name}.`,
        rival: `انكسر الخصم التاريخي. ${done.name} صار حقيقة.`,
        trade: 'القوافل كلها تمر بأرضك وتدفع لخزائنك. لا سيف يعلو على الذهب.',
        vassals: 'الملوك يدفعون لك الجزية ويقاتلون في حروبك. أنت ملك الملوك.',
      }[done.k];
      S.overWhy = `${txt} بعد ${S.turn} دوراً.`;
      this.chronicle('victory', `${this.fname(P)}: ${done.name}. ${txt}`, { fids: [P], imp: 3 });
    }
  },

  // ------------------ فصول الحملة -------------------
  chapter() {
    const S = this.S, P = S.player;
    if (!S || !this.f(P)) return null;
    const i = S.chap || 0;
    const crisis = this.inCrisis(P);
    const c = crisis ? CHAPTERS[4] : CHAPTERS[i];
    return { i: crisis ? 4 : i, ...c };
  },
  inCrisis(P) {
    const S = this.S;
    const lost = S.log.filter((e) => e.turn >= S.turn - 4 && e.text.startsWith('سقطت') && e.fids.includes(P) && e.fids[0] !== P).length;
    const cr = (S.crises || []).some((c) => !c.over && ((c.type === 'horde' && c.v.fid && this.atWar(c.v.fid, P)) || (c.type === 'coalition' && c.v.dom === P && c.stage >= 3) || (c.type === 'succession' && c.v.fid === P && c.v.phase === 'civil')));
    return cr || lost >= 2;
  },
  chapterTick() {
    const S = this.S, P = S.player;
    const n = this.nodesOf(P).length, total = S.nodes.length;
    const biggest = Math.max(...this.aliveMajors().map((id) => this.nodesOf(id).length));
    const atWarMajor = this.aliveMajors().some((o) => o !== P && !this.f(o).kind && this.atWar(P, o));
    let st = 0;
    if (S.turn >= 6 || n >= 6) st = 1;
    if (st >= 1 && S.turn >= 12 && atWarMajor) st = 2;
    if (S.turn >= 36 || (S.turn >= 16 && biggest >= total * 0.45)) st = Math.max(st, 3);
    const prev = S.chap || 0;
    if (st > prev) {
      S.chap = st;
      this.chronicle('chapter', `${CHAPTERS[st].name}: ${CHAPTERS[st].desc}`, { fids: [P], imp: 3 });
      this.alert('info', CHAPTERS[st].name, { icon: 'book' });
    }
    const cr = this.inCrisis(P);
    if (cr && !S.inCrisis) { this.chronicle('chapter', `${CHAPTERS[4].name}: ${CHAPTERS[4].desc}`, { fids: [P], imp: 3 }); }
    S.inCrisis = cr;
  },

  // ------------------ التابعون -------------------
  isVassalOf(a, b) { const A = this.f(a); return !!(A && A.alive && A.overlord === b); },
  vassalLabel(P, id) { return this.isVassalOf(id, P) ? 'تابعة لك' : this.isVassalOf(P, id) ? 'متبوعتك' : null; },
  vassalsOf(fid) { return this.aliveMajors().filter((id) => this.isVassalOf(id, fid)); },
  demandVassal(by, t) {
    const T = this.f(t);
    if (!T || T.kind === 'horde') return { why: 'الغزاة لا يخضعون لأحد' };
    if (T.overlord) return { why: `${T.name} تابعة لغيرك` };
    if (T.vendetta && T.vendetta[by] > 0) return { why: `${T.name} ترفض: بينكما دم` };
    const ratio = this.factionPower(by) / Math.max(1, this.factionPower(t));
    const small = this.nodesOf(t).length <= 3;
    const ok = ratio > (small ? 1.7 : 2.3) && (this.atWar(by, t) || this.rel(t, by) > 20);
    if (!ok) { this.addRel(by, t, -10); return { why: `${T.name} ترفض: ما زالت ترى نفسها قادرة (تحتاج قوة أكبر بكثير أو حرباً تكسرها)` }; }
    this.makeVassal(t, by);
    return { ok: true };
  },
  makeVassal(t, by) {
    const T = this.f(t);
    T.overlord = by;
    this.setStatus(t, by, 'peace', 20);
    this.addRel(t, by, 20);
    this.event('pol', `${T.name} تخضع لـ${this.fname(by)} وتصبح تابعة لها.`, { fids: [t, by], imp: 3 });
    this.chronicle('vassal', `${T.name} تصبح تابعة لـ${this.fname(by)}.`, { fids: [t, by], imp: 3 });
    if (by === this.S.player && this.recProgress) this.recProgress('dip', { kind: 'vassal', fid: t, label: 'تبعية' });
    if (t === this.S.player) this.alert('crit', `أصبحت تابعاً لـ${this.fname(by)}: جزية وحروبها حروبك`, { icon: 'seal', win: 'diplo' });
    this.validate();
  },
  freeVassal(v, why) {
    const V = this.f(v), lord = V.overlord;
    V.overlord = null;
    if (!WX.alive(lord)) return;
    this.f(v).truce[lord] = 0; this.f(lord).truce[v] = 0;
    this.declareWar(v, lord, why || 'إعلان الاستقلال');
    this.chronicle('vassal', `${V.name} تنفض تبعيتها لـ${this.fname(lord)}.`, { fids: [v, lord], imp: 3 });
  },
  vassalTick() {
    for (const v of this.aliveMajors()) {
      const V = this.f(v);
      if (!V.overlord) continue;
      const lord = V.overlord;
      if (!WX.alive(lord)) { V.overlord = null; continue; }
      // الجزية
      const trib = Math.max(0, Math.round(this.economy(v).gold * 0.15));
      V.gold -= trib; this.f(lord).gold += trib;
      // حروب المتبوع حروب التابع، وأعداء التابع أعداء المتبوع
      for (const c of this.aliveMajors()) {
        if (c === v || c === lord || this.f(c).kind === 'horde') continue;
        if (this.atWar(lord, c) && !this.atWar(v, c) && !this.friendly(v, c)) { this.setStatus(v, c, 'war', 0); this.event('pol', `${V.name} تدخل حرب متبوعتها ${this.fname(lord)} على ${this.fname(c)}.`, { fids: [v, lord, c], imp: 2 }); if (v === this.S.player) this.alert('imp', `واجب التبعية: أنت الآن في حرب مع ${this.fname(c)}`, { icon: 'seal', win: 'diplo' }); }
        if (this.atWar(v, c) && !this.atWar(lord, c) && !this.friendly(lord, c)) {
          if (this.f(lord).isPlayer) { if (!this.f(lord).allyCall) { this.f(lord).allyCall = { ally: v, enemy: c, turn: this.S.turn }; this.alert('imp', `تابعتك ${V.name} تستنجد بك على ${this.fname(c)}`, { icon: 'bell', win: 'diplo', key: 'vcall:' + v }); } }
          else { this.setStatus(lord, c, 'war', 0); this.event('pol', `${this.fname(lord)} تحمي تابعتها ${V.name} من ${this.fname(c)}.`, { fids: [lord, v, c], imp: 2 }); }
        }
      }
      // الاستقلال حين يضعف المتبوع
      if (!V.isPlayer) {
        const ratio = this.factionPower(lord) / Math.max(1, this.factionPower(v));
        if (ratio < 1.3 && R() < 0.25) this.freeVassal(v, 'بعد أن ضعفت متبوعتها');
      }
    }
  },
  // الممالك القوية تطالب الضعيفة بالخضوع
  async vassalDemands() {
    for (const a of this.aliveMajors()) {
      const A = this.f(a);
      if (A.isPlayer || A.kind === 'horde' || A.overlord) continue;
      for (const t of this.aliveMajors()) {
        const T = this.f(t);
        if (t === a || T.kind === 'horde' || T.overlord || this.isVassalOf(a, t)) continue;
        const ratio = this.factionPower(a) / Math.max(1, this.factionPower(t));
        if (ratio < 2.4 || !this.borders(a, t) || !(this.atWar(a, t) || this.rel(a, t) < 10) || R() > 0.07) continue;
        if (T.isPlayer) {
          const ok = this.hooks.proposal ? await this.hooks.proposal({ from: a, kind: 'vassal' }) : false;
          if (ok) this.makeVassal(t, a);
          else { this.addRel(a, t, -12); if (!this.atWar(a, t) && R() < 0.5) this.declareWar(a, t, 'بعد رفض الخضوع'); }
        } else this.demandVassal(a, t);
        return;
      }
    }
  },

  // ------------------ الحكّام -------------------
  canAppoint: true,
  appointGovernor(g, n) {
    if (!g || n.owner !== g.fid) return 'ليست مدينتك';
    if (this.governorAt(n)) return 'للمدينة حاكم بالفعل';
    const a = g.status === 'army' ? this.army(g.army) : null;
    if (a && a.regs.length) return 'انقل الوحدات أولاً';
    if (a) this.removeArmy(a);
    g.status = 'gov'; g.city = n.id; g.army = null;
    this.event('int', `${this.fname(g.fid)} تعيّن ${g.name} حاكماً على ${n.name}.`, { fids: [g.fid], node: n.id, imp: 1 });
    return null;
  },
  recallGovernor(g) { g.status = 'pool'; g.city = null; },
  govTick() {
    for (const g of Object.values(this.S.gens)) {
      if (g.status !== 'gov') continue;
      const n = this.node(g.city);
      if (!n || n.owner !== g.fid) { g.status = 'pool'; g.city = null; }
    }
  },

  // ------------------ السياسة العامة -------------------
  devFocus(fid) { return (this.f(fid) && this.f(fid).dev) || 'manual'; },
  edictOf(fid) { return (this.f(fid) && this.f(fid).edict) || 'none'; },
  setEdict(fid, k) {
    const f = this.f(fid);
    if (this.edictOf(fid) === k) return null;
    if (f.edictTurn != null && this.S.turn - f.edictTurn < 4) return `تغيير المرسوم ممكن بعد ${4 - (this.S.turn - f.edictTurn)} أدوار`;
    if (f.gold < 100) return 'الذهب لا يكفي (100)';
    f.gold -= 100; f.edict = k; f.edictTurn = this.S.turn;
    this.event('int', `${f.name} تصدر مرسوم «${EDICTS[k].name}».`, { fids: [fid], imp: 1 });
    return null;
  },
  policyMod(fid, key) { const e = EDICTS[this.edictOf(fid)]; return (e && e[key]) || 0; },
  // التطوير التلقائي: بناء واحد كل دور حسب التوجه، مع احتياطي لا يُمس
  devReserve(fid) { return 300 + 40 * this.nodesOf(fid).length; },
  autoDevelop(fid) {
    const f = this.f(fid), focus = this.devFocus(fid);
    const govCities = this.gensOf(fid).filter((g) => g.status === 'gov').map((g) => g.city);
    if (focus === 'manual' && !govCities.length) return;
    const reserve = this.devReserve(fid);
    if (f.gold < reserve + 120) return;
    const eco = this.economy(fid);
    let best = null, bs = 0;
    for (const n of this.nodesOf(fid)) {
      if (focus === 'manual' && !govCities.includes(n.id)) continue;
      const fr = CampaignAI.frontier(n, fid);
      const fc = focus === 'manual' ? 'economy' : focus;
      const w = {
        economy: { market: 3 + n.pop / 10000, roads: n.capital || (this.S.route && this.S.route.path.includes(n.id)) ? 2.5 : 0.8, farm: eco.netFood < 10 ? 3 : 1, granary: 0.4, walls: fr >= 25 && n.walls < 1 ? 1.5 : 0.2, barracks: 0.2, port: 1.6 },
        military: { barracks: 4, farm: 2.5, market: 1, granary: 0.8, walls: fr >= 25 ? 1.5 : 0.3, roads: 1, port: 1 },
        defense: { walls: fr >= 25 ? 4 : 1, granary: fr >= 25 ? 3 : 0.6, barracks: fr >= 25 ? 1.5 : 0.3, farm: 1, market: 0.6, roads: 0.4, port: 0.3 },
      }[fc];
      for (const k of Object.keys(w)) {
        if (!w[k] || this.canBuild(fid, n, k)) continue;
        const cost = BUILDINGS[k].cost(n[k] || 0);
        if (f.gold - cost < reserve) continue;
        const s = w[k] * (govCities.includes(n.id) ? 1.4 : 1) / Math.sqrt(cost / 150);
        if (s > bs) { bs = s; best = [n, k]; }
      }
    }
    if (best) {
      this.build(fid, best[0], best[1]);
      if (f.isPlayer) this.event('eco', `التطوير التلقائي: ${BUILDINGS[best[1]].name} في ${best[0].name}.`, { fids: [fid], node: best[0].id, imp: 1 });
    }
  },

  // ------------------ قيمة الخسارة: الثأر -------------------
  avengerTick() {
    for (const g of Object.values(this.S.gens)) {
      if (!g.vendetta || g.status !== 'pool' || g.avenging) continue;
      const f = this.f(g.fid);
      if (!f || !f.alive || f.isPlayer || !WX.alive(g.vendetta)) continue;
      if (!this.atWar(g.fid, g.vendetta) && R() < 0.5) continue;
      const site = this.nodesOf(g.fid).filter((n) => !this.besieger(n.id)).sort((a, b) => Math.min(...this.nodesOf(g.vendetta).map((m) => this.hops(a.id, m.id, 6))) - Math.min(...this.nodesOf(g.vendetta).map((m) => this.hops(b.id, m.id, 6))))[0];
      if (!site || f.gold < this.hireFee(g) + 150) continue;
      const r = this.hire(g.fid, g.id, site.id);
      if (!r || !r.army) continue;
      g.avenging = true;
      r.army.regs.push(this.newReg('cavalry'), this.newReg('spear'));
      f.gold -= 120;
      this.chronicle('war', `${g.name} يقود جيشاً ليأخذ بثأر أبيه من ${this.fname(g.vendetta)}.`, { fids: [g.fid, g.vendetta], imp: 3 });
      if (g.vendetta === this.S.player) this.alert('imp', `${g.name} يقود جيشاً طالباً الثأر منك`, { icon: 'drop', node: site.id });
    }
  },

  // ------------------ تحليلات المطوّر (لا تظهر للاعب) -------------------
  // تكشف الأدوار الميتة والتكرار والجمود واللولب والاقتصاد المتخم
  analytics() {
    const S = this.S, P = S.player, st = S.stats || { hist: [], acts: {} };
    let streak = 0, longest = 0;
    for (const h2 of st.hist) { streak = h2.dead ? streak + 1 : 0; longest = Math.max(longest, streak); }
    const acts = st.acts || {};
    const totalActs = Object.values(acts).reduce((t, v) => t + v, 0) || 1;
    const topAct = Object.entries(acts).sort((a, b) => b[1] - a[1])[0];
    const flips = Object.entries(S.flips || {}).filter(([, v]) => v >= 3).map(([k, v]) => `${k}×${v}`);
    const idle = this.armiesOf(P).filter((a) => !a.siege && a.mp >= this.mpMax(a) && a.regs.length).length;
    const stale = this.aliveMajors().filter((id) => !this.f(id).isPlayer && this.f(id).goals && S.turn - this.f(id).goals.since > 10).map((id) => this.fname(id));
    const alliances = [];
    for (const a of this.aliveMajors()) for (const b of this.aliveMajors()) if (a < b && this.status(a, b) === 'alliance') alliances.push(`${this.fname(a)}+${this.fname(b)} (${S.turn - ((this.f(a).allySince || {})[b] || 0)})`);
    const over = this.aliveMajors().map((id) => this.overstack ? this.nodesOf(id).reduce((t, n) => t + this.overstack(n, id), 0) : 0).reduce((t, v) => t + v, 0);
    return {
      turn: S.turn, deadTurns: st.dead, longestDead: longest,
      topAction: topAct ? `${topAct[0]} ${Math.round(100 * topAct[1] / totalActs)}٪` : 'لا شيء', actions: acts,
      flipFlops: flips, idleArmies: idle, gold: this.f(P) ? this.f(P).gold : 0,
      staleAI: stale, goalShifts: Object.fromEntries(this.majors().map((id) => [this.fname(id), this.f(id).goalShifts || 0])),
      alliances, overstack: over,
      crises: (S.crises || []).map((c) => `${c.type}:${c.over ? c.why : 'st' + c.stage}`), director: (S.dir || {}).log || [],
    };
  },

  // ------------------ دورة المملكة -------------------
  async realmTick() {
    this.govTick();
    this.vassalTick();
    await this.vassalDemands();
    for (const fid of this.aliveMajors()) if (this.f(fid).isPlayer) this.autoDevelop(fid);
    this.avengerTick();
    this.chapterTick();
    this.checkObjectives();
  },
});
