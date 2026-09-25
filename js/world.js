'use strict';
// العالم الحيّ — «التاريخ يصنع الحرب».
// أزمات تُنذر بقدومها على مراحل، وقرارات حقيقية للاعب وللممالك، وحكّام يشيخون ويموتون،
// وقادة لهم طموح، وطريق قوافل يُثري من يحميه، ومخرج للحملة يراقب الإيقاع دون أن يغش.

// ——— مادة تاريخية لكل سيناريو ———
const WORLD_DATA = {
  threeKingdoms: {
    plague: 'الوباء',
    rulers: { shu: ['ليو باي', 47], wei: ['تساو تساو', 53], wu: ['سون تشوان', 26] },
    hordes: [
      {
        key: 'xianbei', name: 'الشيانبي', people: 'قبائل الشيانبي', color: '#8a6a3c', from: 'سهوب الشمال', dir: 'الشمال', away: 'الغرب البعيد',
        gates: [['wuwei', 'tianshui'], ['luoyang', 'xuchang']],
        leaders: [['كبي نينغ', 'cavalier', null, 3], ['بو دو غن', 'swift', 'harsh', 2], ['سو لي', 'archer', null, 2]],
        beyond: ['حصون السور العظيم الغربية', 'مراعي الوو هوان', 'إمارة داي'],
        units: { horsearcher: 5, cavalry: 3, spear: 1, sword: 1 },
      },
      {
        key: 'nanman', name: 'النانمان', people: 'قبائل النانمان', color: '#5f6e2d', from: 'أدغال الجنوب', dir: 'الجنوب', away: 'ممالك الجنوب البعيدة',
        gates: [['nanzhong', 'jiangzhou'], ['jiaozhou', 'changsha']],
        leaders: [['مولو ملك الوحوش', 'brave', 'reckless', 2], ['وو تو قو', 'defender', null, 3], ['تشو رونغ', 'swift', null, 2]],
        beyond: ['ممالك يونان', 'قرى الأدغال الحدودية'],
        units: { sword: 3, spear: 3, archer: 2, cavalry: 0.5 },
      },
    ],
    migrants: [{ key: 'qiang', name: 'التشيانغ', people: 'قبائل التشيانغ', color: '#7d5a44', from: 'هضاب الغرب', gates: ['wuwei', 'tianshui', 'hanzhong'], leader: ['يو فو لوو', 'mountaineer', null, 2], units: { cavalry: 3, horsearcher: 2, spear: 2 } }],
    uprisings: { def: ['بقايا العمائم الصفراء', 'جانغ يان'], shu: ['أتباع طريق الأرزات الخمسة', 'جانغ شيو'] },
    stars: [['جونغ هوي', 'tactician', 'arrogant'], ['لو كانغ', 'defender', null], ['يانغ هو', 'merchant', null], ['وين يانغ', 'brave', 'reckless'], ['دو يو', 'siege', null], ['شو شنغ', 'naval', null]],
    mercs: [
      { name: 'عصابات بايبو', leader: 'هان شيان', trait: 'swift', units: { sword: 3, spear: 2, archer: 2 } },
      { name: 'قراصنة البحيرة', leader: 'جانغ باو', trait: 'naval', units: { sword: 3, archer: 3, spear: 1 } },
    ],
    routes: [
      { key: 'silk', name: 'طريق الحرير', path: ['wuwei', 'tianshui', 'changan', 'luoyang', 'xuchang'] },
      { key: 'brocade', name: 'طريق الديباج', path: ['chengdu', 'jiangzhou', 'yongan', 'jiangling', 'chaisang', 'jianye'] },
      { key: 'sea', name: 'طريق البحر الجنوبي', path: ['jiaozhou', 'kuaiji', 'jianye'] },
    ],
  },
  umayyad: {
    plague: 'الطاعون',
    rulers: { umayyad: ['سليمان بن عبد الملك', 41, 'merchant', 'greedy', 2], byzantine: ['ثيودوسيوس', 55], khazar: ['الخاقان بيهار', 44, 'cavalier', null, 2] },
    hordes: [
      {
        key: 'turgesh', name: 'الترغش', people: 'الترك الترغش', color: '#8b5a2b', from: 'ما وراء النهر', dir: 'الشرق', away: 'بلاد الصين',
        gates: [['kufa', 'mosul'], ['dvin', 'mosul']],
        leaders: [['سولوك أبو مزاحم', 'cavalier', null, 3], ['كورصول', 'swift', 'reckless', 2], ['بغا طرخان', 'archer', null, 2]],
        beyond: ['إمارات الصغد', 'حصون خراسان', 'مدن فرغانة'],
        units: { horsearcher: 5, cavalry: 3, spear: 1 },
      },
      {
        key: 'bulgar', name: 'البلغار', people: 'قبائل البلغار', color: '#6d4c3a', from: 'ما وراء الدانوب', dir: 'الشمال الغربي', away: 'سهول بانونيا',
        gates: [['constantinople', 'nicaea'], ['cherson']],
        leaders: [['ترفل خان', 'cavalier', null, 3], ['كورميسوش', 'brave', null, 2], ['سيفار', 'swift', null, 2]],
        beyond: ['قرى تراقيا', 'حصون الدانوب'],
        units: { cavalry: 3, horsearcher: 2, spear: 3, sword: 1 },
      },
      {
        key: 'pecheneg', name: 'البجناك', people: 'قبائل البجناك', color: '#7a6040', from: 'سهوب الشمال', dir: 'الشمال', away: 'الغرب',
        gates: [['atil', 'balanjar'], ['cherson']],
        leaders: [['كوريا خان', 'swift', 'harsh', 2], ['تيراخ', 'archer', null, 2]],
        beyond: ['مراعي الأوغوز', 'قرى الفولغا'],
        units: { horsearcher: 6, cavalry: 2, spear: 1 },
      },
    ],
    migrants: [{ key: 'slavs', name: 'الصقالبة', people: 'قبائل الصقالبة', color: '#6f6a4a', from: 'ما وراء الدانوب', gates: ['constantinople', 'nicaea', 'cherson'], leader: ['بوريسلاف', 'brave', null, 2], units: { spear: 3, sword: 2, archer: 2 } }],
    uprisings: { def: ['ثورة المحرومين', 'زعيم مجهول'], umayyad: ['ثورة الخوارج', 'بهلول بن بشر'], byzantine: ['فتنة الأيقونات', 'الراهب كوزماس'], khazar: ['انتفاضة العشائر', 'تارخان يولدوز'] },
    stars: [['عبد الله البطال', 'brave', null], ['نصر بن سيار', 'defender', null], ['أسد بن عبد الله', 'cavalier', 'harsh'], ['الحارث بن سريج', 'swift', 'disloyal'], ['قسطنطين الأرمني', 'tactician', null], ['بشر بن الوليد', 'archer', null]],
    mercs: [
      { name: 'مرتزقة الديلم', leader: 'ماكان الديلمي', trait: 'mountaineer', units: { spear: 3, sword: 3, archer: 1 } },
      { name: 'فرسان الأرمن', leader: 'سمبات الباغراتي', trait: 'cavalier', units: { cavalry: 4, spear: 2 } },
    ],
    routes: [
      { key: 'silk', name: 'طريق الحرير', path: ['kufa', 'mosul', 'raqqa', 'aleppo', 'antioch', 'tarsus'] },
      { key: 'fur', name: 'طريق الفراء', path: ['atil', 'samandar', 'derbent', 'dvin', 'trebizond'] },
      { key: 'incense', name: 'طريق البخور', path: ['kufa', 'palmyra', 'damascus', 'antioch'] },
    ],
  },
};

// أثر الحاكم على مملكته (سمة واحدة واضحة بدل أرقام كثيرة)
const RULER_FX = {
  merchant: { income: 0.1, txt: 'دخل المدن +10٪' },
  defender: { loyalty: 5, txt: 'ولاء المدن +5' },
  tactician: { genloy: 10, txt: 'ولاء القادة +10' },
  elite: { genloy: 5, txt: 'ولاء القادة +5' },
  brave: { morale: 5, txt: 'معنويات الجيوش +5' },
  cavalier: { morale: 5, txt: 'معنويات الجيوش +5' },
  logistician: { eat: -0.15, txt: 'الجيوش تأكل أقل 15٪' },
  swift: { genloy: 4, txt: 'ولاء القادة +4' },
  harsh: { loyalty: -5, txt: 'ولاء المدن −5' },
  greedy: { income: -0.05, txt: 'دخل المدن −5٪' },
  arrogant: { genloy: -10, txt: 'ولاء القادة −10' },
};

// ——— أدوات ———
const WX = {
  near(id, d) {
    const seen = new Set([id]);
    let layer = [id];
    for (let i = 0; i < d; i++) {
      const nx = [];
      for (const x of layer) for (const y of Game.adjAll(x)) if (!seen.has(y)) { seen.add(y); nx.push(y); }
      layer = nx;
    }
    return [...seen];
  },
  owners(ids) { return [...new Set(ids.map((id) => Game.node(id).owner))].filter((f) => f !== 'neutral' && Game.f(f) && Game.f(f).alive); },
  names(ids) { return ids.map((id) => Game.node(id).name).join(' و'); },
  fnames(fids) { return fids.map((f) => Game.fname(f)).join(' و'); },
  est(v, k = 0.25) { const lo = Math.round(v * (1 - k) / 10) * 10, hi = Math.round(v * (1 + k) / 10) * 10; return `${fmt(lo)}–${fmt(hi)}`; },
  when(turn) { return `${SEASONS[turn % 4]} ${Game.sc.startYear + Math.floor(turn / 4)}`; },
  alive(fid) { return !!(fid && Game.f(fid) && Game.f(fid).alive); },
  shade(hex, k) {
    const [r, g, b] = hexRgb(hex);
    const f = (v) => clamp(Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)), 0, 255).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  },
  dirName(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'الشرقية' : 'الغربية';
    return dy > 0 ? 'الجنوبية' : 'الشمالية';
  },
};

Object.assign(Game, {
  wd() { return WORLD_DATA[this.S.scenario] || {}; },

  // شخصية أي مملكة: من السيناريو أو المحفوظة للممالك الناشئة، مع طموح يزيده الجمود
  pers(fid) {
    const f = this.f(fid);
    const sc = this.sc.factions[fid];
    const p = (f && f.pers) || (sc && sc.personality) || { aggr: 1, honor: 1, prefs: { spear: 2, sword: 2, archer: 2, cavalry: 1.5 } };
    return { aggr: p.aggr * (1 + ((f && f.ambition) || 0)), honor: p.honor, prefs: p.prefs || {} };
  },

  // ——————————————————— التهيئة ———————————————————
  initWorld() {
    const S = this.S;
    S.crises = S.crises || [];
    S.dir = S.dir || { calm: 0, lastStart: -99, domTurns: 0, dom: null, starts: 0, log: [], gold: [] };
    S.stats = S.stats || { acts: {}, cur: {}, hist: [], dead: 0 };
    S.flips = S.flips || {};
    if (S.route === undefined) this.initRoute();
    for (const g of Object.values(S.gens)) if (g.loy === undefined) g.loy = this.baseLoy(g);
    for (const fid of this.majors()) {
      const f = this.f(fid);
      if (f.ruler === undefined && !f.kind) this.initRuler(fid);
    }
  },
  baseLoy(g) {
    return clamp(74 - (g.flaw === 'disloyal' ? 24 : 0) - (g.flaw === 'arrogant' ? 8 : 0) - (g.rank - 1) * 5 + Math.round((R() - 0.5) * 14), 18, 95);
  },

  // ——————————————————— الحكّام والعرش ———————————————————
  initRuler(fid) {
    const f = this.f(fid);
    const d = (this.wd().rulers || {})[fid];
    let g = null;
    if (d) {
      g = this.gensOf(fid).find((x) => x.name === d[0]);
      if (!g) g = this.addGeneral(fid, d[0], d[2] || 'merchant', d[3] || null, d[4] || 2);
      g.age0 = d[1];
    } else {
      g = this.gensOf(fid).filter((x) => ['pool', 'army', 'gov'].includes(x.status)).sort((a, b) => b.rank - a.rank)[0] || null;
      if (g) g.age0 = 32 + Math.floor(R() * 18);
    }
    f.ruler = g ? g.id : null;
    f.heir = null;
    if (g) { g.loy = 100; g.bornTurn = this.S.turn; }
  },
  ageOf(g) { return (g.age0 || 30) + Math.floor((this.S.turn - (g.bornTurn || 0)) / 4); },
  rulerOf(fid) { const f = this.f(fid); return f && f.ruler ? this.gen(f.ruler) : null; },
  isRuler(g) { return !!(g && this.f(g.fid) && this.f(g.fid).ruler === g.id); },
  isHeir(g) { return !!(g && this.f(g.fid) && this.f(g.fid).heir === g.id); },
  rulerMod(fid, key) {
    const g = this.rulerOf(fid);
    if (!g || g.status === 'captive' || g.status === 'dead') return 0;
    let v = 0;
    for (const t of [g.trait, g.flaw]) if (t && RULER_FX[t] && RULER_FX[t][key]) v += RULER_FX[t][key];
    return v;
  },
  rulerFxText(g) { return [g.trait, g.flaw].filter((t) => t && RULER_FX[t]).map((t) => RULER_FX[t].txt); },
  heirCandidates(fid) {
    const f = this.f(fid);
    return this.gensOf(fid).filter((g) => g.id !== f.ruler && ['pool', 'army', 'gov'].includes(g.status) && !g.name.startsWith('الضابط'))
      .sort((a, b) => (b.rank * 10 + b.loy / 5) - (a.rank * 10 + a.loy / 5));
  },
  bestHeir(fid) { return this.heirCandidates(fid)[0] || null; },
  // من سيشعر بالغبن إن اختير هذا الوريث؟
  passedOver(fid, heir) {
    const hr = heir ? heir.rank : 0;
    return this.heirCandidates(fid).filter((g) => g !== heir && g.rank >= 2 && (g.rank > hr || (g.rank === hr && (g.flaw === 'arrogant' || g.flaw === 'disloyal'))));
  },
  setHeir(fid, g) {
    const f = this.f(fid);
    if (!g || g.fid !== fid) return;
    if (f.heir === g.id) return;
    f.heir = g.id;
    for (const o of this.passedOver(fid, g)) o.loy = Math.max(0, o.loy - 12);
    g.loy = Math.min(100, g.loy + 20);
    this.event('int', `${f.name} تسمّي ${g.name} ولياً للعهد.`, { fids: [fid], imp: 2 });
  },

  // موت الحاكم: الوريث يتسلم، والمغبونون قد ينازعونه
  rulerDeath(fid, cause) {
    const f = this.f(fid);
    const old = this.gen(f.ruler);
    if (old && cause !== 'captive' && old.status !== 'dead') { old.status = 'dead'; old.army = null; old.diedTurn = this.S.turn; }
    if (old && old.status === 'army') { old.status = 'pool'; }
    let heir = this.gen(f.heir);
    if (!heir || heir.fid !== fid || !['pool', 'army', 'gov'].includes(heir.status)) heir = this.bestHeir(fid);
    let noHeir = false;
    if (!heir) {
      noHeir = true;
      heir = this.addGeneral(fid, 'الوصي ' + pick(GENERIC_NAMES), null, null, 1);
      heir.loy = 100;
    }
    const rivals = this.passedOver(fid, heir).filter((g) => g.loy < 62);
    for (const g of rivals) g.loy = Math.max(0, g.loy - 10);
    f.ruler = heir.id;
    f.heir = null;
    heir.loy = 100;
    if (heir.age0 == null) { heir.age0 = 26 + Math.floor(R() * 16); heir.bornTurn = this.S.turn; } else if (heir.bornTurn == null) heir.bornTurn = this.S.turn;
    for (const n of this.nodesOf(fid)) n.loyalty = Math.max(0, n.loyalty - (noHeir ? 15 : 6));
    const how = cause === 'ill' ? 'مات' : cause === 'captive' ? 'خُلع الأسير' : 'سقط';
    this.chronicle('death', `${how} ${old ? old.name : 'الحاكم'} حاكم ${f.name}${cause === 'battle' ? ' في ساحة القتال' : ''}. ${noHeir ? `بلا وريث، فرفع البلاط ${heir.name}.` : `تولّى ${heir.name} العرش.`}`, { fids: [fid], imp: 3 });
    this.event('pol', `${f.name}: ${heir.name} يتولى العرش بعد ${old ? old.name : 'الحاكم'}.`, { fids: [fid], imp: 3 });
    if (f.isPlayer) this.alert('crit', `${how} ${old ? old.name : 'حاكمك'} — ${heir.name} على العرش`, { icon: 'crown', win: 'kingdom' });
    return { heir, rivals, noHeir, old };
  },

  // ——————————————————— ولاء القادة ———————————————————
  // أسباب ولاء القائد، كل سبب بقيمته
  genLoyParts(g) {
    const f = this.f(g.fid);
    const parts = [['الأساس', 62]];
    if (!f) return parts;
    if (g.rank === 1) parts.push(['قائد ناشئ لا يطمع بعد', 10]);
    if (g.flaw === 'disloyal') parts.push(['طبعه متقلّب', -18]);
    if (g.flaw === 'arrogant') parts.push(['متكبّر يرى نفسه أحق', -6]);
    const rm = this.rulerMod(g.fid, 'genloy');
    if (rm) parts.push(['طبع الحاكم', rm]);
    const size = this.nodesOf(g.fid).length;
    if (size > 8) parts.push([`اتساع المملكة (${size} مدن)`, -(size - 8) * 2]);
    const a = g.army ? this.army(g.army) : null;
    if (g.status === 'gov' && g.city) { const n = this.node(g.city); if (n && n.owner === g.fid && this.capitalDist(n) >= 3) parts.push(['يحكم مدينة بعيدة عن العاصمة', -6]); }
    if (a) {
      const n = this.node(a.node);
      if (n && n.owner === g.fid && this.capitalDist(n) >= 3) parts.push(['يقود بعيداً عن العاصمة', -6]);
      const share = this.armyPower(a) / Math.max(1, this.factionPower(g.fid));
      if (share > 0.35 && g.rank >= 2) parts.push([`يقود ${Math.round(share * 100)}٪ من قوة المملكة`, -6]);
    }
    if (f.gold < 0) parts.push(['الخزينة فارغة: رواتب متأخرة', -15]);
    if (g.honored != null && this.S.turn - g.honored < 12) parts.push(['كرّمته مؤخراً', 14]);
    if (g.passed) parts.push(['تخطّيته في ولاية العهد', -8]);
    if (this.isHeir(g)) parts.push(['ولي العهد', 20]);
    return parts;
  },
  genLoyTarget(g) {
    if (!this.f(g.fid) || this.isRuler(g)) return 100;
    return clamp(this.genLoyParts(g).reduce((t, p) => t + p[1], 0), 0, 100);
  },
  honorCost(g) { return 80 + 50 * g.rank; },
  honorGeneral(fid, g) {
    const f = this.f(fid), cost = this.honorCost(g);
    if (f.gold < cost) return 'الذهب لا يكفي';
    f.gold -= cost;
    g.loy = Math.min(100, g.loy + 22);
    g.honored = this.S.turn;
    this.event('int', `${f.name} تكرّم القائد ${g.name} بالعطايا والألقاب.`, { fids: [fid], imp: 1 });
    return null;
  },
  genLoyTick() {
    for (const g of Object.values(this.S.gens)) {
      if (!['army', 'gov', 'pool'].includes(g.status)) continue;
      if (g.loy === undefined) g.loy = this.baseLoy(g);
      const t = this.genLoyTarget(g);
      g.loy = Math.round(clamp(g.loy + clamp(t - g.loy, -2, 2), 0, 100));
    }
  },

  // ——————————————————— الممالك الناشئة ———————————————————
  spawnFaction(o) {
    const S = this.S;
    const id = (o.key || 'x') + S.nextId++;
    const f = this.newFaction(id, o.name, o.color, false);
    Object.assign(f, { gold: o.gold != null ? o.gold : 400, food: 200, pers: o.pers || { aggr: 1.1, honor: 0.9, prefs: {} }, kind: o.kind || 'realm', parent: o.parent || null, born: S.turn, ruler: null, heir: null });
    if (o.kind === 'horde') f.horde = { men0: 0, until: S.turn + 12 };
    S.factions[id] = f;
    for (const b of this.majors()) {
      if (b === id) continue;
      const B = this.f(b);
      f.status[b] = 'peace'; B.status[id] = 'peace';
      f.rel[b] = 0; B.rel[id] = 0;
      f.truce[b] = 0; B.truce[id] = 0;
      f.warTurns[b] = 0; B.warTurns[id] = 0;
    }
    return id;
  },
  // قائد ينشق بجيشه والمدن الساخطة حوله
  generalRebels(g, why, o = {}) {
    const pf = g.fid, PF = this.f(pf);
    if (!PF || !PF.alive || this.isRuler(g)) return null;
    const a = g.status === 'army' ? this.army(g.army) : null;
    let base = a ? this.node(a.node) : g.city ? this.node(g.city) : null;
    if (base && base.owner !== pf) base = null;
    if (!base && a) base = WX.near(a.node, 2).map((id) => this.node(id)).find((n) => n.owner === pf && !n.capital) || null;
    if (!base && !a) {
      g.status = 'exiled';
      this.event('int', `القائد ${g.name} يفرّ من ${PF.name} بعد أن انكشف أمره.`, { fids: [pf], imp: 2 });
      return null;
    }
    const cities = base ? [base, ...this.adjAll(base.id).map((id) => this.node(id)).filter((n) => n.owner === pf && !n.capital && n.loyalty < 55)].slice(0, 3) : [];
    if (base && base.capital) cities.splice(0, 1);
    const cap = this.nodesOf(pf).find((n) => n.capital) || base;
    const name = o.name || (why === 'succession' && cities.length ? `${PF.name} ${WX.dirName(cap, cities[0] || base)}` : `حركة ${g.name}`);
    const pp = this.pers(pf);
    const nid = this.spawnFaction({ key: 'r', name, color: WX.shade(PF.color, R() < 0.5 ? 0.3 : -0.3), kind: 'rebel', parent: pf, pers: { aggr: pp.aggr * 1.1, honor: pp.honor * 0.9, prefs: pp.prefs }, gold: 250 + Math.round(Math.max(0, PF.gold) * 0.15) });
    const NF = this.f(nid);
    g.fid = nid; g.loy = 100; g.passed = false;
    NF.ruler = g.id;
    if (a) { a.fid = nid; a.siege = null; }
    if (g.status === 'gov') { g.status = 'pool'; g.city = null; }
    for (const n of cities) {
      n.owner = nid; n.loyalty = Math.max(n.loyalty, 55); n.capturedTurn = this.S.turn; n.unrest = 1;
      for (const x of this.gensOf(pf)) if (x.status === 'gov' && x.city === n.id) { if (x.loy < 50) { x.fid = nid; x.loy = 80; } else { x.status = 'pool'; x.city = null; } }
      for (const o2 of this.armiesAt(n.id)) if (o2.fid === pf && o2 !== a) this.retreatHome(o2, [n.id]);
    }
    this.setStatus(nid, pf, 'war', 0);
    this.addRel(nid, pf, -60);
    if (a && !cities.length) { const here = this.node(a.node); if (here.owner !== nid && this.atWar(nid, here.owner)) this.startSiege(a, here); }
    for (const c of this.aliveMajors()) if (c !== nid && c !== pf && this.atWar(c, pf)) this.addRel(nid, c, 25);
    if (o.suitor && WX.alive(o.suitor) && this.atWar(o.suitor, pf)) { this.makeAlliance(nid, o.suitor); }
    const txt = why === 'succession' ? `${g.name} يرفض ${this.gname(this.rulerOf(pf))} وينشق بـ${cities.length ? WX.names(cities.map((n) => n.id)) : 'جيشه'}: ${name} تولد من رحم ${PF.name}.`
      : `تمرّد ${g.name} على ${PF.name}${cities.length ? ' واستولى على ' + WX.names(cities.map((n) => n.id)) : ' بجيشه'}!`;
    this.chronicle('rebel', txt, { fids: [pf, nid], imp: 3, node: base ? base.id : null });
    this.event('pol', txt, { fids: [pf, nid], imp: 3 });
    if (PF.isPlayer) this.alert('crit', txt, { icon: 'torch', node: base ? base.id : null });
    this.validate();
    return nid;
  },

  // ——————————————————— طريق القوافل ———————————————————
  initRoute() {
    const r = (this.wd().routes || [])[0];
    this.S.route = r ? { key: r.key, name: r.name, path: r.path.filter((id) => this.node(id)), bad: 0, dead: false } : null;
  },
  routeDef(key) { return (this.wd().routes || []).find((r) => r.key === key) || null; },
  // حالة مقطع من طريق القوافل مع سببه وعلاجه. القوافل تعود وحدها حين يزول السبب
  routeSegState(a, b) {
    const A = this.node(a), B = this.node(b);
    if (!A || !B) return { ok: false, cause: 'gone', text: 'مقطع مفقود' };
    const r = this.S.route;
    if (r && r.dead) return { ok: false, cause: 'collapse', text: 'الطريق كله منقطع: التجار يبحثون عن بديل', fix: 'حدث تاريخي: لا يُستأنف هذا الطريق. تابع سباق الطريق الجديد في أحداث العالم واستثمر فيه.', story: true };
    for (const n of [A, B]) {
      const bs = this.besiegers(n.id);
      if (bs.length) return { ok: false, cause: 'siege', node: n.id, text: `الطريق تحت الحصار عند ${n.name}`, fix: `تعود القوافل وحدها حين يُرفع حصار ${this.fname(bs[0].fid)} عن ${n.name}.`, auto: true };
    }
    if (A.owner !== B.owner && this.atWar(A.owner, B.owner) && !(A.owner === 'neutral' && B.owner === 'neutral')) {
      return { ok: false, cause: 'war', text: `حرب بين ${this.fname(A.owner)} و${this.fname(B.owner)} تقطع ما بين ${A.name} و${B.name}`, fix: A.owner === 'neutral' || B.owner === 'neutral' ? `افتح ${A.owner === 'neutral' ? A.name : B.name} المستقلة، أو اترك التجار يلتفّون حين تهدأ الحرب.` : `الصلح بين ${this.fname(A.owner)} و${this.fname(B.owner)} يعيد القوافل تلقائياً.`, auto: true };
    }
    for (const c of this.S.crises || []) {
      if (c.over) continue;
      if (c.type === 'plague' && (c.v.quar[a] || c.v.quar[b])) { const q = c.v.quar[a] ? A : B; return { ok: false, cause: 'plague', node: q.id, text: `حجر صحي في ${q.name}`, fix: `تعود القوافل برفع الحجر الصحي عن ${q.name} من نافذة الوباء، لكن العدوى قد تنتقل معها.`, auto: true }; }
      if (c.type === 'horde' && c.v.blockRoute && c.v.region && (c.v.region.includes(a) || c.v.region.includes(b))) return { ok: false, cause: 'event', text: `زحف ${c.v.name} على الطريق`, fix: 'حدث تاريخي لا تستطيع منعه: تعود القوافل حين يرحل الغزاة عن المنطقة.', auto: true, story: true };
    }
    // قطاع الطرق: مدينة ساخطة بلا جيش يحفظ الأمن
    for (const n of [A, B]) {
      if (n.owner === 'neutral') continue;
      const guarded = this.armiesOfAt(n.owner, n.id).length > 0 || (r && r.escort && r.escort[n.id] >= this.S.turn);
      if (!guarded && (n.loyalty < 30 || (n.unrest > 0 && n.loyalty < 45))) {
        return { ok: false, cause: 'bandits', node: n.id, text: `قطاع طرق حول ${n.name}`, fix: `جيش مقيم في ${n.name} أو ولاء فوق 30 يطرد اللصوص، أو ادفع حراسة للقوافل.`, auto: true, escort: n.owner === this.S.player };
      }
    }
    return { ok: true };
  },
  routeSegOk(a, b) { return this.routeSegState(a, b).ok; },
  routeHealth() {
    const r = this.S.route;
    if (!r || r.dead || r.path.length < 2) return 0;
    let ok = 0;
    for (let i = 0; i < r.path.length - 1; i++) if (this.routeSegOk(r.path[i], r.path[i + 1])) ok++;
    return ok / (r.path.length - 1);
  },
  // قيمة المدينة على الطريق حين تمر بها القوافل كلها
  routeCityBase(n) { return 7 + 3 * n.market + 4 * n.roads + 5 * (n.port || 0); },
  // القوافل تسير في المقاطع المفتوحة المتصلة؛ المدينة تأخذ من الطريق بقدر ما يتصل بها منه
  routeReach(i) {
    const r = this.S.route, L = r.path.length - 1;
    let lo = i, hi = i;
    while (lo > 0 && this.routeSegOk(r.path[lo - 1], r.path[lo])) lo--;
    while (hi < L && this.routeSegOk(r.path[hi], r.path[hi + 1])) hi++;
    return (hi - lo) / Math.max(1, L);
  },
  routeCityIncome(n) {
    const r = this.S.route;
    if (!r || r.dead) return { now: 0, full: 0 };
    const i = r.path.indexOf(n.id);
    if (i < 0) return { now: 0, full: 0 };
    const full = this.routeCityBase(n);
    if (this.besieger(n.id)) return { now: 0, full };
    return { now: Math.round(full * this.routeReach(i)), full };
  },
  routeIncome(fid) {
    const r = this.S.route;
    if (!r || r.dead) return 0;
    let t = 0;
    for (const id of r.path) { const n = this.node(id); if (n.owner === fid) t += this.routeCityIncome(n).now; }
    return t;
  },
  // حالة الطريق للعرض: المقاطع المتوقفة وأسبابها وخسارة اللاعب
  routeStatus(fid) {
    const r = this.S.route;
    if (!r) return null;
    const segs = [];
    for (let i = 0; i < r.path.length - 1; i++) segs.push({ a: r.path[i], b: r.path[i + 1], ...this.routeSegState(r.path[i], r.path[i + 1]) });
    let now = 0, full = 0;
    for (const id of r.path) { const n = this.node(id); if (n.owner !== fid) continue; const c = this.routeCityIncome(n); now += c.now; full += c.full; }
    const stopped = segs.filter((x) => !x.ok);
    return { name: r.name, dead: !!r.dead, segs, stopped, now, full, loss: full - now, state: r.dead ? 'بانتظار طريق جديد' : stopped.length ? (stopped.length === segs.length ? 'متوقفة' : 'متوقفة جزئياً') : 'نشطة' };
  },
  escortCost(n) { return 50 + Math.round(n.pop / 1000); },
  // حراسة القوافل حول مدينة لأربعة أدوار
  escortRoute(fid, nodeId) {
    const r = this.S.route, n = this.node(nodeId);
    if (!r || !n || n.owner !== fid) return 'ليست مدينتك';
    const cost = this.escortCost(n);
    if (this.f(fid).gold < cost) return `الذهب لا يكفي (${cost})`;
    this.f(fid).gold -= cost;
    r.escort = r.escort || {};
    r.escort[nodeId] = this.S.turn + 3;
    this.event('eco', `${this.fname(fid)} تستأجر حراساً للقوافل حول ${n.name}.`, { fids: [fid], node: nodeId, imp: 1 });
    return null;
  },

  // ——————————————————— محرك الأزمات ———————————————————
  crisisStart(type, o = {}) {
    const def = CRISES[type];
    if (!def) return null;
    const c = { id: 'c' + this.S.nextId++, type, stage: -1, t0: this.S.turn, next: this.S.turn, log: [], fids: [], ask: {}, known: {}, v: {}, node: null, over: false };
    if (def.start.call(def, c, o) === false) return null;
    this.S.crises.push(c);
    this.S.dir.lastStart = this.S.turn;
    this.S.dir.starts++;
    return c;
  },
  crisisEnd(c, why) {
    c.over = true; c.end = this.S.turn; c.why = why || 'done';
    for (const fid in c.ask) delete c.ask[fid];
    for (const a of this.S.alerts || []) if (a.crisis === c.id) a.gone = true;
  },
  crisisById(id) { return (this.S.crises || []).find((c) => c.id === id) || null; },
  // سجل الأزمة (قصتها) + السجل التاريخي عند الحاجة
  cLog(c, text, o = {}) {
    c.log.push({ turn: this.S.turn, text });
    if (c.log.length > 30) c.log.shift();
    if (o.chron) this.chronicle(o.kind || 'crisis', text, { fids: o.fids || c.fids, imp: o.imp || 2, node: o.node || c.node, icon: o.icon || CRISES[c.type].icon });
    this.event(o.cat || 'pol', text, { fids: o.fids || c.fids, imp: o.imp || 2, node: o.node || c.node });
  },
  crisisKnown(c, fid) {
    if (c.fids.includes(fid)) return Math.max(2, c.known[fid] || 0);
    return c.known[fid] || 0;
  },
  // قرار محدد بزمن: اللاعب يُسأل، والممالك تقرر فوراً
  crisisAsk(c, fid, ask, o = {}) {
    const F = this.f(fid);
    if (!F || !F.alive) return;
    if (F.isPlayer) {
      c.ask[fid] = { key: ask, until: this.S.turn + (o.turns || 1) - 1, urgent: !!o.urgent, def: o.def || null, title: o.title || '', text: o.text || '', node: o.node || null, shown: false, data: o.data || null };
      if (!o.silent) this.alert(o.urgent ? 'crit' : 'imp', o.alert || o.title, { icon: CRISES[c.type].icon, win: 'crisis', crisis: c.id, key: 'crisis:' + c.id, node: o.node || c.node || null });
      return;
    }
    const def = CRISES[c.type];
    const k = def.ai ? def.ai.call(def, c, fid, ask, o.data) : null;
    this.crisisDecide(c, fid, ask, k, o.data);
  },
  crisisOpts(c, fid, ask, data) {
    const def = CRISES[c.type];
    const F = this.f(fid);
    const list = (def.opts ? def.opts.call(def, c, fid, ask, data) : []) || [];
    for (const o of list) {
      if (o.gold && F.gold < o.gold) { o.dis = true; o.why = 'الذهب لا يكفي'; }
      if (o.food && F.food < o.food) { o.dis = true; o.why = 'الطعام لا يكفي'; }
    }
    return list;
  },
  crisisDecide(c, fid, ask, k, data) {
    const q = c.ask[fid];
    const d = data || (q && q.data) || null;
    const opts = this.crisisOpts(c, fid, ask, d);
    const o = opts.find((x) => x.k === k && !x.dis) || opts.find((x) => q && x.k === q.def && !x.dis) || opts.find((x) => !x.dis);
    if (q && q.key === ask) delete c.ask[fid];
    for (const a of this.S.alerts || []) if (a.crisis === c.id && this.f(fid).isPlayer) a.gone = true;
    if (!o) return null;
    const F = this.f(fid);
    if (o.gold) F.gold -= o.gold;
    if (o.food) F.food -= o.food;
    CRISES[c.type].decide.call(CRISES[c.type], c, fid, ask, o.k, d);
    if (F.isPlayer) { this.S.dir.lastDecision = this.S.turn; if (this.track) this.track('crisis'); }
    return o.k;
  },
  // أفعال متاحة في أي وقت (مثل الحجر الصحي) — تظهر في نافذة الأزمة
  crisisActions(c, fid) {
    const def = CRISES[c.type];
    const list = (def.actions ? def.actions.call(def, c, fid) : []) || [];
    const F = this.f(fid);
    for (const o of list) {
      if (o.gold && F.gold < o.gold) { o.dis = true; o.why = 'الذهب لا يكفي'; }
      if (o.food && F.food < o.food) { o.dis = true; o.why = 'الطعام لا يكفي'; }
    }
    return list;
  },
  crisisAct(c, fid, k, node) {
    const o = this.crisisActions(c, fid).find((x) => x.k === k && (x.node || null) === (node || null) && !x.dis);
    if (!o) return 'غير متاح';
    const F = this.f(fid);
    if (o.gold) F.gold -= o.gold;
    if (o.food) F.food -= o.food;
    CRISES[c.type].act.call(CRISES[c.type], c, fid, k, node);
    if (F.isPlayer && this.track) this.track('crisis');
    return null;
  },
  activeCrises() { return (this.S.crises || []).filter((c) => !c.over); },
  visibleCrises(fid = this.S.player) { return (this.S.crises || []).filter((c) => this.crisisKnown(c, fid) > 0 && (!c.over || this.S.turn - c.end <= 3)); },
  crisisTitle(c) { return CRISES[c.type].title.call(CRISES[c.type], c); },
  crisisShort(c) { const d = CRISES[c.type]; return d.short ? d.short.call(d, c) : this.crisisTitle(c); },
  crisisStatus(c) {
    if (c.over) return 'انتهت';
    const d = CRISES[c.type];
    return d.status ? d.status.call(d, c) : '';
  },
  // تعديلات الأزمات على المدن (الدخل، الطعام، القوى البشرية، الولاء)
  nodeMods(n) {
    const m = { inc: 1, food: 1, mp: 1, loy: [], why: [] };
    if (n.charter) { m.inc *= 0.65; m.loy.push(['ميثاق حر', 20]); }
    for (const c of this.S.crises || []) {
      if (c.over) continue;
      const d = CRISES[c.type];
      if (!d.mods) continue;
      const i0 = m.inc, f0 = m.food;
      d.mods.call(d, c, n, m);
      if (m.inc !== i0 || m.food !== f0) m.why.push(this.crisisShort(c));
    }
    return m;
  },
  crisisMarkers() {
    const out = [];
    const P = this.S.player;
    for (const c of this.S.crises || []) {
      if (c.over) continue;
      const k = this.crisisKnown(c, P);
      if (!k) continue;
      const d = CRISES[c.type];
      if (d.markers) for (const m of d.markers.call(d, c, k) || []) out.push({ ...m, c });
    }
    return out;
  },

  // ——————————————————— القوة التقديرية ———————————————————
  avgMajorRegs() {
    const ms = this.aliveMajors().filter((id) => !this.f(id).kind);
    if (!ms.length) return 20;
    return ms.reduce((t, id) => t + this.armiesOf(id).reduce((s, a) => s + a.regs.length, 0), 0) / ms.length;
  },

  // ——————————————————— دورة العالم ———————————————————
  async worldTick() {
    const S = this.S;
    this.initWorld();
    const P = S.player;
    // القرارات التي انتهى وقتها: يُطبّق الخيار الافتراضي
    for (const c of S.crises) {
      const q = c.ask[P];
      if (q && q.until < S.turn) this.crisisDecide(c, P, q.key, q.def, q.data);
    }
    // الأزمات الجارية
    for (const c of [...S.crises]) {
      if (c.over) continue;
      const d = CRISES[c.type];
      try {
        if (d.tick) d.tick.call(d, c);
        if (!c.over && S.turn >= c.next) {
          const st = d.stages[c.stage + 1];
          if (!st) this.crisisEnd(c, 'done');
          else { c.stage++; st.call(d, c); }
        }
      } catch (e) {
        console.error('crisis', c.type, e);
        this.crisisEnd(c, 'error');
      }
    }
    // العرش وولاء القادة
    this.rulerTick();
    this.genLoyTick();
    this.ambitionScan();
    // طريق القوافل
    const r = S.route;
    // تنبيه اللاعب حين تتوقف القوافل في مقطع يمس مدنه أو تعود، مع السبب
    if (r && !r.dead) {
      const prev = r.stops || {};
      const cur = {};
      for (let i = 0; i < r.path.length - 1; i++) {
        const a = r.path[i], b = r.path[i + 1];
        const st = this.routeSegState(a, b);
        if (st.ok) continue;
        cur[a + '|' + b] = st.cause;
        const mine = this.node(a).owner === P || this.node(b).owner === P;
        if (mine && prev[a + '|' + b] !== st.cause) this.alert('imp', `توقفت القوافل بين ${this.node(a).name} و${this.node(b).name}: ${st.text}`, { icon: 'camel', win: 'route', node: st.node || a, key: 'route:' + a + b });
      }
      for (const k of Object.keys(prev)) {
        if (cur[k]) continue;
        const [a, b] = k.split('|');
        if (this.node(a) && this.node(b) && (this.node(a).owner === P || this.node(b).owner === P)) this.alert('info', `عادت القوافل بين ${this.node(a).name} و${this.node(b).name}`, { icon: 'camel', win: 'route', key: 'route:' + a + b });
      }
      r.stops = cur;
    }
    if (r && !r.dead) {
      const hp = this.routeHealth();
      r.bad = hp < 0.5 ? (r.bad || 0) + 1 : 0;
      if (r.bad >= 3 && !S.crises.some((c) => !c.over && c.type === 'route')) this.crisisStart('route', { kind: 'collapse' });
    }
    // المملكة: التابعون، الحكّام، التطوير، الثأر، الفصول، الأهداف
    if (this.realmTick) await this.realmTick();
    // المخرج
    this.director();
    this.statsTurn();
    // تنظيف
    S.crises = S.crises.filter((c) => !c.over || S.turn - c.end <= 40);
    this.validate();
    for (const a of S.armies) if (a.sick > 0) a.sick--;
  },

  rulerTick() {
    const S = this.S;
    for (const fid of this.aliveMajors()) {
      const f = this.f(fid);
      if (f.kind === 'horde') continue;
      if (f.ruler === undefined) this.initRuler(fid);
      const busy = S.crises.some((c) => !c.over && c.type === 'succession' && c.v.fid === fid);
      const g = this.gen(f.ruler);
      if (busy) continue;
      if (!g || g.status === 'dead' || g.fid !== fid || g.status === 'exiled') { this.crisisStart('succession', { fid, cause: g && g.status === 'dead' ? 'battle' : 'dead' }); continue; }
      if (g.status === 'captive') { this.crisisStart('succession', { fid, cause: 'captive' }); continue; }
      const age = this.ageOf(g);
      const p = age < 45 ? 0.0025 : 0.0025 + (age - 45) * 0.0017;
      if (R() < p) { this.crisisStart('succession', { fid, cause: 'ill' }); continue; }
      if (!f.isPlayer) {
        const h0 = this.gen(f.heir);
        if (!h0 || h0.fid !== fid || !['pool', 'army', 'gov'].includes(h0.status)) { const b = this.bestHeir(fid); if (b) this.setHeir(fid, b); }
      }
    }
  },
  // القادة الساخطون في الممالك الواسعة يتحولون إلى خطر
  ambitionScan() {
    const S = this.S;
    for (const g of Object.values(S.gens)) {
      if (g.status !== 'army' && g.status !== 'gov') continue;
      if (g.loy >= 32 || g.rank < 2 || this.isRuler(g) || this.isHeir(g)) continue;
      const f = this.f(g.fid);
      if (!f || !f.alive || f.kind === 'horde' || this.nodesOf(g.fid).length < 4) continue;
      if (S.crises.some((c) => !c.over && c.type === 'rebel' && c.v.gen === g.id)) continue;
      if (S.crises.filter((c) => !c.over && c.type === 'rebel').length >= 2) continue;
      if (R() < 0.35) this.crisisStart('rebel', { gen: g.id });
    }
  },

  // ——————————————————— مخرج الحملة ———————————————————
  // يراقب الإيقاع: الهدوء الطويل، الهيمنة، الاقتصاد المتخم، التكرار، جمود الممالك.
  // لا يغش: يختار أزمة معقولة تاريخياً من الأنظمة القائمة، ولا يخلق جيوشاً بجانب اللاعب.
  director() {
    const S = this.S, D = S.dir, P = S.player;
    const F = this.f(P);
    const lastTurn = S.turn - 1;
    const heat = S.log.filter((e) => e.turn === lastTurn && e.imp >= 2 && e.fids.includes(P)).length + (this.aliveMajors().some((o) => o !== P && this.atWar(P, o)) ? 1 : 0) + ((S.stats.cur.battle || 0) > 0 ? 2 : 0);
    D.calm = heat >= 3 ? 0 : heat >= 1 ? Math.max(0, D.calm - 1) + 0.5 : D.calm + 1;
    const dom = this.dominant();
    D.domTurns = dom && dom === D.dom ? D.domTurns + 1 : dom ? 1 : 0;
    D.dom = dom;
    D.gold = [...(D.gold || []).slice(-5), F ? F.gold : 0];
    const hoard = F && F.gold > 1300 + S.turn * 10 && D.gold.length >= 5 && D.gold[D.gold.length - 1] > D.gold[0];
    const boredom = clamp((D.calm - 2) / 6, 0, 1);
    D.boredom = boredom; D.hoard = hoard;
    // طموح الممالك الراكدة
    // طموح الممالك: السلام الطويل والحرب الباردة (حرب بلا قتال) كلاهما يولّد الرغبة في الحسم
    D.fight = D.fight || {};
    for (const e of S.log) if (e.turn === lastTurn && /^(معركة|اقتحام)|تضرب الحصار/.test(e.text)) for (const x of e.fids) D.fight[x] = lastTurn;
    for (const fid of this.aliveMajors()) {
      const f = this.f(fid);
      if (f.isPlayer || f.kind === 'horde') continue;
      const atWar = this.aliveMajors().some((o) => o !== fid && this.atWar(fid, o));
      const stalled = S.turn - (D.fight[fid] != null ? D.fight[fid] : 0);
      if (atWar && stalled > 4) f.ambition = Math.min(0.6, (f.ambition || 0) + 0.06);
      else if (atWar) f.ambition = Math.max(0, (f.ambition || 0) - 0.04);
      else if (S.turn - (f.lastWarTurn || 0) > 8) f.ambition = Math.min(0.45, (f.ambition || 0) + 0.04);
    }
    const active = this.activeCrises();
    // لاعب هادئ طويلاً: يُختار حدث معقول قريب منه (دون خلق جيوش بجانبه)
    const ctx = { boredom, dom, domTurns: D.domTurns, hoard, late: S.turn > 40, calm: D.calm, P, focus: boredom >= 0.5 && F && F.alive ? P : null };
    // مواعيد تاريخية مرنة: تختلف كل حملة، وقد لا تأتي أبداً
    if (!D.sched) D.sched = this.planEras();
    for (const e of D.sched) {
      if (e.done || S.turn < e.turn) continue;
      e.done = true;
      if (active.some((c) => c.type === e.type)) continue;
      const c = this.crisisStart(e.type, { ctx });
      if (c) { D.log.push({ turn: S.turn, type: e.type, era: true }); return; }
    }
    const cap = S.turn > 40 ? 3 : 2;
    if (S.turn < 6 || active.length >= cap || S.turn - D.lastStart < 3) return;
    const p = 0.09 + boredom * 0.3 + (hoard ? 0.06 : 0) + (D.domTurns >= 3 ? 0.12 : 0);
    if (R() > p) return;
    const w = {};
    for (const [k, d] of Object.entries(CRISES)) {
      if (!d.weight) continue;
      if (active.some((c) => c.type === k)) continue;
      const v = d.weight.call(d, ctx);
      if (v > 0) w[k] = v;
    }
    if (!Object.keys(w).length) return;
    const type = weightedPick(w);
    const c = this.crisisStart(type, { ctx });
    if (c) { D.log.push({ turn: S.turn, type, calm: +D.calm.toFixed(1), boredom: +boredom.toFixed(2), dom, hoard: !!hoard }); if (D.log.length > 60) D.log.shift(); }
  },

  planEras() {
    const out = [];
    if ((this.wd().hordes || []).length && R() < 0.85) out.push({ type: 'horde', turn: 14 + Math.floor(R() * 11) });
    if (R() < 0.8) out.push({ type: 'star', turn: 6 + Math.floor(R() * 7) });
    if ((this.wd().migrants || []).length && R() < 0.5) out.push({ type: 'migration', turn: 26 + Math.floor(R() * 12) });
    if ((this.wd().hordes || []).length && R() < 0.55) out.push({ type: 'horde', turn: 44 + Math.floor(R() * 16) });
    return out;
  },

  // ——————————————————— القياس الداخلي (للمطوّر) ———————————————————
  track(kind) {
    const st = this.S && this.S.stats;
    if (!st) return;
    const k = kind.split(':')[0];
    st.acts[kind] = (st.acts[kind] || 0) + 1;
    st.cur[k] = (st.cur[k] || 0) + 1;
  },
  statsTurn() {
    const S = this.S, st = S.stats;
    const cur = st.cur || {};
    const meaningful = Object.keys(cur).filter((k) => k !== 'endTurn' && k !== 'action').reduce((t, k) => t + cur[k], 0);
    const P = S.player;
    const events = S.log.filter((e) => e.turn === S.turn - 1 && e.imp >= 2 && e.fids.includes(P)).length;
    const dead = meaningful === 0 && events === 0;
    if (dead) st.dead++;
    st.hist.push({ turn: S.turn - 1, acts: cur, events, dead, gold: this.f(P) ? this.f(P).gold : 0 });
    if (st.hist.length > 240) st.hist.shift();
    st.cur = {};
  },
});

// ═══════════════════════════ الأزمات ═══════════════════════════
// كل أزمة: مراحل تُنذر (stages)، قرارات (opts/decide/ai)، أفعال (actions/act)، آثار (mods)، علامات على الخريطة (markers)
const CRISES = {};

// ——— 1) زحف القبائل: شائعات ← لاجئون ← مملكة بعيدة تسقط ← رسول يطلب الجزية ← غزو ← عاصفة ———
CRISES.horde = {
  icon: 'horse',
  title(c) { return `زحف ${c.v.name}`; },
  short(c) { return c.v.name; },
  status(c) { return ['شائعات من ' + c.v.dir, 'لاجئون على الحدود', 'مملكة بعيدة تسقط', 'رسول يطلب الجزية', 'الغزو', 'العاصفة'][Math.min(5, Math.max(0, c.stage))]; },
  weight(ctx) {
    const hs = Game.wd().hordes || [];
    if (!hs.length || Game.S.turn < 10) return 0;
    if (Game.S.crises.some((c) => c.type === 'horde' && (!c.over || Game.S.turn - c.end < 24))) return 0;
    return 1.3 + ctx.boredom * 2.6 + (ctx.late ? 1 : 0) + (ctx.dom ? 0.4 : 0);
  },
  start(c, o = {}) {
    const hs = Game.wd().hordes || [];
    if (!hs.length) return false;
    let hd = pick(hs);
    let gi = Math.floor(R() * hd.gates.length);
    const focus = o.ctx && o.ctx.focus;
    if (focus && Game.nodesOf(focus).length) {
      const d = (ids) => Math.min(...ids.filter((id) => Game.node(id)).map((id) => Math.min(...Game.nodesOf(focus).map((n) => Game.hops(n.id, id, 6)))));
      let best = 99;
      for (const h2 of hs) h2.gates.forEach((g, i) => { const x = d(g); if (x < best) { best = x; hd = h2; gi = i; } });
    }
    const gates = hd.gates[gi].filter((id) => Game.node(id));
    if (!gates.length) return false;
    const regs = clamp(Math.round(Game.avgMajorRegs() * (0.95 + R() * 0.4)), 14, 32);
    c.v = {
      key: hd.key, name: hd.name, people: hd.people, color: hd.color, from: hd.from, dir: hd.dir, away: hd.away, gates,
      leader: pick(hd.leaders), subs: hd.leaders, beyond: pick(hd.beyond), units: hd.units, regs, men: regs * 38,
      paid: [], refused: [], stalled: {}, reask: [], redirect: null, ally: null, targets: [], fid: null,
    };
    c.v.subs = hd.leaders.filter((l) => l !== c.v.leader);
    c.node = gates[0];
  },
  stages: [
    function rumor(c) {
      const v = c.v;
      Game.cLog(c, `تتحدث القوافل عن ${v.people} تتجمع في ${v.from} تحت راية ${v.leader[0]}.`, { chron: true, imp: 2, fids: [] });
      for (const fid of Game.aliveMajors()) c.known[fid] = Math.max(c.known[fid] || 0, 1);
      const P = Game.S.player;
      if (WX.alive(P)) {
        Game.crisisAsk(c, P, 'scout', { turns: 3, def: 'ignore', title: `أخبار من ${v.dir}: ${v.people} تتجمع`, alert: `أخبار من ${v.dir}: ${v.people} تتجمع` });
      }
      c.next = Game.S.turn + 2 + (R() < 0.5 ? 1 : 0);
    },
    function refugees(c) {
      const v = c.v;
      v.region = [...new Set(v.gates.flatMap((g) => WX.near(g, 1)))];
      v.blockRoute = true;
      for (const id of v.gates) { const n = Game.node(id); n.pop = Math.round(n.pop * 1.05); n.loyalty = Math.max(0, n.loyalty - 5); Game.addScar(id, 'refugees'); }
      c.fids = WX.owners(v.region);
      for (const fid of c.fids) c.known[fid] = 2;
      Game.cLog(c, `لاجئون يتدفقون على ${WX.names(v.gates)} هرباً من ${v.people}. القوافل على الطريق توقفت.`, { chron: true });
      for (const id of v.gates) {
        const owner = Game.node(id).owner;
        if (owner === 'neutral' || !WX.alive(owner)) continue;
        Game.crisisAsk(c, owner, 'refugees', { turns: 2, def: 'close', title: `لاجئون عند أبواب ${Game.node(id).name}`, node: id, data: { node: id } });
      }
      c.next = Game.S.turn + 2;
    },
    function fall(c) {
      const v = c.v;
      const r = R();
      if (r < 0.07) {
        Game.cLog(c, `مات ${v.leader[0]} فجأة قبل الزحف، فتنازع أبناؤه وتفرقت ${v.people}.`, { chron: true, imp: 3, fids: c.fids });
        Game.crisisEnd(c, 'fizzle');
        return;
      }
      if (r < 0.13) {
        Game.cLog(c, `ارتدّت ${v.people} نحو ${v.away} بعد أن أحرقت ${v.beyond}.`, { chron: true, fids: c.fids });
        Game.crisisEnd(c, 'turned');
        return;
      }
      v.revealed = true;
      for (const fid of Game.aliveMajors()) c.known[fid] = Math.max(c.known[fid] || 0, 1);
      Game.cLog(c, `سقطت ${v.beyond} أمام ${v.people}. الناجون يتحدثون عن ${WX.est(v.men, 0.3)} مقاتل يقودهم ${v.leader[0]}.`, { chron: true, imp: 3, fids: c.fids });
      if (r < 0.34) {
        const gateOwners = WX.owners(v.gates);
        const cand = Game.aliveMajors().filter((fid) => !gateOwners.includes(fid) && !Game.f(fid).kind && gateOwners.some((o) => Game.atWar(fid, o) || Game.rel(fid, o) < -15));
        if (cand.length) {
          const ally = cand.sort((a, b) => Game.pers(b).aggr - Game.pers(a).aggr)[0];
          if (Game.f(ally).isPlayer) Game.crisisAsk(c, ally, 'pact', { turns: 2, def: 'no', urgent: true, title: `رسول ${v.leader[0]} يعرض عليك حلفاً`, data: { enemy: gateOwners[0] } });
          else if (R() < 0.7) { v.ally = ally; c.log.push({ turn: Game.S.turn, text: `رسل ${v.name} شوهدوا في بلاط ${Game.fname(ally)}.` }); }
        }
      }
      c.next = Game.S.turn + 1 + (R() < 0.5 ? 1 : 0);
    },
    function envoy(c) {
      const v = c.v;
      const region = [...new Set(v.gates.flatMap((g) => WX.near(g, 2)))];
      v.targets = WX.owners(region).filter((f) => f !== v.ally && Game.f(f).kind !== 'horde');
      v.trib = Math.round(clamp(120 + v.regs * 12, 180, 520) / 10) * 10;
      c.fids = [...new Set([...c.fids, ...v.targets])];
      if (!v.targets.length) { c.next = Game.S.turn + 1; return; }
      Game.cLog(c, `رسل ${v.leader[0]} في بلاط ${WX.fnames(v.targets)}: «${v.trib} ذهباً، وإلا فالسيف».`, { chron: true, imp: 3 });
      for (const fid of v.targets) Game.crisisAsk(c, fid, 'envoy', { turns: 1, urgent: true, def: 'refuse', title: `رسول ${v.leader[0]} يطلب الجزية`, alert: `رسول ${v.name} يطلب ${v.trib} ذهباً — قرّر` });
      c.next = Game.S.turn + 1;
    },
    function invasion(c) {
      const v = c.v, S = Game.S;
      if (v.reask.length) {
        for (const fid of v.reask) if (WX.alive(fid)) Game.crisisAsk(c, fid, 'envoy', { turns: 1, urgent: true, def: 'refuse', title: `رسول ${v.leader[0]} يعود لجوابك`, alert: `رسول ${v.name} ينتظر جوابك الأخير` });
        v.reask = [];
        c.stage--;
        c.next = S.turn + 1;
        return;
      }
      const refusers = v.refused.filter((f) => WX.alive(f));
      let target = v.redirect && WX.alive(v.redirect.to) ? v.redirect.to : null;
      if (!target && refusers.length) target = refusers.sort((a, b) => Game.factionPower(a) - Game.factionPower(b))[0];
      if (!target && v.ally) target = WX.owners(v.gates).find((o) => o !== v.ally && !v.paid.includes(o)) || null;
      const reachable = (fid) => {
        const seen = new Set();
        const out = [];
        for (const g of v.gates) for (const id of WX.near(g, 3)) {
          if (seen.has(id)) continue;
          seen.add(id);
          const n = Game.node(id);
          if (n.owner === fid && !Game.besiegers(id).length) out.push(n);
        }
        return out.sort((a, b) => Math.min(...v.gates.map((g) => Game.hops(g, a.id, 4))) - Math.min(...v.gates.map((g) => Game.hops(g, b.id, 4))));
      };
      let arrivals = target ? reachable(target) : [];
      if (!arrivals.length) {
        const neutral = reachable('neutral');
        if (neutral.length) { target = 'neutral'; arrivals = neutral; }
      }
      if (!arrivals.length) {
        Game.cLog(c, `اكتفى ${v.leader[0]} بما جمع من ذهب وعاد إلى ${v.from}.`, { chron: true, imp: 2 });
        Game.crisisEnd(c, 'paid');
        return;
      }
      const fid = Game.spawnFaction({ key: 'h', name: v.name, color: v.color, kind: 'horde', pers: { aggr: 1.7, honor: 0.5, prefs: v.units }, gold: 500 });
      v.fid = fid;
      const F = Game.f(fid);
      const leader = Game.addGeneral(fid, v.leader[0], v.leader[1], v.leader[2], v.leader[3]);
      leader.loy = 100; leader.age0 = 40 + Math.floor(R() * 15); leader.bornTurn = S.turn;
      F.ruler = leader.id;
      const subs = v.subs.map((s) => { const g = Game.addGeneral(fid, s[0], s[1], s[2], s[3]); g.loy = 90; return g; });
      if (target !== 'neutral') { Game.setStatus(fid, target, 'war', 0); Game.addRel(fid, target, -60); }
      for (const t of refusers) if (t !== target && !Game.atWar(fid, t)) { Game.setStatus(fid, t, 'war', 0); Game.addRel(fid, t, -40); }
      for (const p of v.paid) if (WX.alive(p)) Game.setStatus(fid, p, 'peace', 14);
      if (v.ally && WX.alive(v.ally)) { Game.setStatus(fid, v.ally, 'peace', 20); Game.addRel(fid, v.ally, 40); }
      const nArmies = clamp(Math.ceil(v.regs / 8), 2, 4);
      const per = Math.ceil(v.regs / nArmies);
      const where = arrivals.slice(0, 2);
      for (let i = 0; i < nArmies; i++) {
        const node = where[i % where.length];
        const g = i === 0 ? leader : subs[i - 1] || Game.officer(fid);
        const a = Game.createArmy(fid, node.id, g.id);
        a.from = node.id;
        for (let j = 0; j < Math.min(MAX_REGS, per); j++) { const r = Game.newReg(weightedPick(v.units)); r.exp = 1; a.regs.push(r); }
        Game.startSiege(a, node);
      }
      F.horde.men0 = Game.armiesOf(fid).reduce((t, a) => t + Game.armyMen(a), 0);
      F.horde.until = S.turn + 10 + Math.floor(R() * 6);
      c.fids = [...new Set([...c.fids, fid, ...(target !== 'neutral' ? [target] : [])])];
      for (const f2 of Game.aliveMajors()) c.known[f2] = 2;
      c.node = where[0].id;
      const victim = target === 'neutral' ? 'المدن المستقلة' : Game.fname(target);
      Game.cLog(c, `${v.people} تعبر الحدود! ${v.leader[0]} يطبق على ${WX.names(where.map((n) => n.id))} (${victim})${v.redirect ? ' — وتقول الألسن إن ذهب ' + Game.fname(v.redirect.by) + ' وجّهه' : ''}.`, { chron: true, imp: 3, kind: 'war', icon: 'horse' });
      if (target === S.player) Game.alert('crit', `${v.name} تغزو أرضك وتحاصر ${where[0].name}!`, { icon: 'horse', node: where[0].id, win: 'crisis', crisis: c.id, key: 'crisis:' + c.id });
      else if (WX.alive(S.player)) Game.alert('imp', `${v.name} تغزو ${victim}`, { icon: 'horse', node: where[0].id, win: 'crisis', crisis: c.id, key: 'crisis:' + c.id });
      c.next = S.turn + 1;
    },
    function storm(c) { c.next = Game.S.turn + 99; },
  ],
  tick(c) {
    const v = c.v, S = Game.S;
    if (c.stage < 4 || !v.fid) return;
    const F = Game.f(v.fid);
    if (!F || !F.alive) { Game.cLog(c, `انكسر زحف ${v.name}، ولم يبقَ من جيوشه إلا الحكايات.`, { chron: true, imp: 3, kind: 'victory', icon: 'laurel' }); Game.crisisEnd(c, 'repelled'); return; }
    if (!F.horde) { Game.crisisEnd(c, 'settled'); return; }
    const armies = Game.armiesOf(v.fid);
    const men = armies.reduce((t, a) => t + Game.armyMen(a), 0);
    const lead = Game.gen(F.ruler);
    if (!v.leaderLost && (!lead || lead.status === 'dead' || lead.status === 'captive' || lead.fid !== v.fid)) {
      v.leaderLost = true;
      Game.cLog(c, `سقط ${v.leader[0]}! ${v.people} بلا خان.`, { chron: true, imp: 3 });
      if (R() < 0.5) { this.leave(c, 'leader'); return; }
      const next = Game.gensOf(v.fid).find((g) => g.status === 'army');
      if (next) F.ruler = next.id;
    }
    if (!armies.length && !Game.nodesOf(v.fid).length) { Game.cLog(c, `تبدد زحف ${v.name}.`, { chron: true }); Game.crisisEnd(c, 'repelled'); return; }
    if (men < F.horde.men0 * 0.35) { this.leave(c, 'broken'); return; }
    if (S.turn >= F.horde.until) { this.leave(c, 'time'); return; }
    // لا حرب قائمة: يبحث عن فريسة قريبة لم تدفع
    const foes = Game.aliveMajors().filter((o) => o !== v.fid && Game.atWar(v.fid, o));
    if (!foes.length && armies.length) {
      const near = [...new Set(armies.flatMap((a) => WX.near(a.node, 2)))].map((id) => Game.node(id)).filter((n) => n.owner !== 'neutral' && n.owner !== v.fid && !v.paid.includes(n.owner) && n.owner !== v.ally && WX.alive(n.owner));
      if (near.length) Game.declareWar(v.fid, near[0].owner, 'طمعاً في الغنائم');
    }
  },
  // نهاية العاصفة: يعود بالغنائم أو يستقر ويؤسس مملكة
  leave(c, why) {
    const v = c.v, F = Game.f(v.fid);
    const cities = Game.nodesOf(v.fid);
    if (cities.length >= 2 && R() < 0.55) {
      F.kind = 'realm'; F.horde = null;
      F.name = `خانية ${v.name}`;
      F.pers = { aggr: 1.25, honor: 0.8, prefs: v.units };
      Game.initRuler(v.fid);
      Game.cLog(c, `استقرّت ${v.people} في ${WX.names(cities.map((n) => n.id))} وأسّست «${F.name}».`, { chron: true, imp: 3, kind: 'realm' });
      Game.crisisEnd(c, 'settled');
      return;
    }
    for (const a of Game.armiesOf(v.fid)) Game.removeArmy(a);
    for (const n of cities) { n.owner = 'neutral'; n.garrison = []; Game.fillGarrison(n, true); n.loyalty = 50; }
    for (const g of Game.gensOf(v.fid)) if (g.status !== 'dead') g.status = 'exiled';
    F.alive = false;
    const txt = why === 'broken' ? `انكسرت ${v.people} وعادت فلولها إلى ${v.from}.` : why === 'leader' ? `تفرقت ${v.people} بعد سقوط خانها.` : `عاد ${v.leader[0]} إلى ${v.from} محمّلاً بالغنائم.`;
    Game.cLog(c, txt, { chron: true, imp: 3, kind: why === 'broken' ? 'victory' : 'crisis' });
    Game.crisisEnd(c, why);
    Game.validate();
  },
  opts(c, fid, ask, data) {
    const v = c.v;
    if (ask === 'scout') return [
      { k: 'spies', label: 'أرسل عيوناً إلى السهوب', icon: 'eye', desc: 'تعرف الطريق الذي سيسلكونه وحجمهم التقريبي قبل غيرك.', gold: 70 },
      { k: 'ignore', label: 'انتظر ما تأتي به الأيام', icon: 'hourglass', desc: 'لا كلفة، لكنك ستعرف متأخراً.' },
    ];
    if (ask === 'refugees') {
      const n = Game.node(data.node);
      return [
        { k: 'shelter', label: 'افتح الأبواب', icon: 'house', desc: `+150 قوى بشرية في ${n.name} و+4 ولاء.`, risk: '−25 طعام', food: 25 },
        { k: 'arm', label: 'سلّح الرجال منهم', icon: 'spear', desc: 'فرقة رمّاحة تنضم إلى حامية المدينة.', risk: 'الولاء −3', gold: 60 },
        { k: 'close', label: 'أغلق الأبواب', icon: 'gate', desc: 'لا كلفة.', risk: 'الولاء −6 وسمعة أسوأ' },
      ];
    }
    if (ask === 'pact') return [
      { k: 'yes', label: 'اقبل الحلف', icon: 'treaty', desc: `لن يهاجمك ${v.name}، وسيضرب ${Game.fname(data.enemy)}.`, risk: '−5 سمعة: التعامل مع الغزاة', gold: 120 },
      { k: 'no', label: 'ارفض', icon: 'close', desc: 'تبقى يدك نظيفة، ومصيرك مع الآخرين.' },
    ];
    if (ask === 'envoy') {
      const rivals = v.targets.filter((t) => t !== fid && WX.alive(t)).concat(Game.aliveMajors().filter((t) => t !== fid && !v.targets.includes(t) && !Game.f(t).kind && Game.atWar(fid, t) && Game.borders(t, Game.node(v.gates[0]).owner)));
      const rival = rivals.sort((a, b) => Game.rel(fid, a) - Game.rel(fid, b))[0] || null;
      const list = [
        { k: 'pay', label: `ادفع الجزية (${v.trib})`, icon: 'gold', desc: `لن يهاجمك ${v.name} في هذا الزحف.`, risk: 'قد يضرب جارك بدلاً منك', gold: v.trib },
        { k: 'refuse', label: 'ارفض واستعد', icon: 'shield', desc: 'تحتفظ بذهبك وكرامتك.', risk: 'قد تكون الهدف الأول' },
      ];
      if (!v.stalled[fid]) list.push({ k: 'stall', label: 'اكسب الوقت بالهدايا', icon: 'hourglass', desc: 'يؤجل الرسول جوابك دوراً، ويتأخر الزحف.', gold: 50 });
      if (rival) list.push({ k: 'redirect', label: `وجّههم إلى ${Game.fname(rival)}`, icon: 'dagger', desc: `تدفع أكثر فيضرب الخان ${Game.fname(rival)}.`, risk: 'إن انكشف الأمر: عداوة وسمعة أسوأ', gold: v.trib + 120, rival });
      return list;
    }
    if (ask === 'aid') {
      const vic = data && data.victim;
      return [
        { k: 'aid', label: `أمدّ ${Game.fname(vic)} بالمال`, icon: 'coins', desc: 'علاقة أفضل كثيراً، والغزاة يُستنزفون عندهم لا عندك.', gold: 150 },
        { k: 'none', label: 'راقب من بعيد', icon: 'eye', desc: 'قد تكون فرصة لضرب المنشغلين — من نافذة الدبلوماسية.' },
      ];
    }
    return [];
  },
  decide(c, fid, ask, k, data) {
    const v = c.v, F = Game.f(fid);
    if (ask === 'scout' && k === 'spies') {
      c.known[fid] = 2;
      c.log.push({ turn: Game.S.turn, text: `عيونك في ${v.from}: ${v.people} ستعبر عبر ${WX.names(v.gates)}، نحو ${WX.est(v.men, 0.2)} مقاتل.` });
    } else if (ask === 'refugees') {
      const n = Game.node(data.node);
      if (k === 'shelter') { n.manpower += 150; n.loyalty = Math.min(100, n.loyalty + 4); F.rep = Math.min(100, F.rep + 2); }
      else if (k === 'arm') { n.garrison.push(Game.newReg('spear')); n.loyalty = Math.max(0, n.loyalty - 3); }
      else { n.loyalty = Math.max(0, n.loyalty - 6); F.rep = Math.max(0, F.rep - 2); }
    } else if (ask === 'pact') {
      if (k === 'yes') { v.ally = fid; F.rep = Math.max(0, F.rep - 5); c.log.push({ turn: Game.S.turn, text: `${F.name} تعقد حلفاً سرياً مع ${v.leader[0]}.` }); }
    } else if (ask === 'envoy') {
      if (k === 'pay') { v.paid.push(fid); c.log.push({ turn: Game.S.turn, text: `${F.name} تدفع الجزية لـ${v.leader[0]}.` }); Game.event('pol', `${F.name} تدفع الجزية لرسل ${v.name}.`, { fids: [fid], imp: 2 }); }
      else if (k === 'stall') { v.stalled[fid] = true; v.reask.push(fid); c.log.push({ turn: Game.S.turn, text: `${F.name} تشغل الرسول بالهدايا والوعود.` }); }
      else if (k === 'redirect') {
        const opt = this.opts(c, fid, 'envoy').find((o) => o.k === 'redirect');
        const rival = opt ? opt.rival : null;
        v.paid.push(fid);
        if (rival) {
          v.redirect = { by: fid, to: rival };
          if (R() < 0.25) {
            const Rv = Game.f(rival);
            Rv.grievance[fid] = (Rv.grievance[fid] || 0) + 3;
            Game.addRel(fid, rival, -35);
            F.rep = Math.max(0, F.rep - 8);
            Game.event('pol', `انكشف أن ${F.name} دفعت ${v.name} نحو ${Rv.name}!`, { fids: [fid, rival], imp: 3 });
            if (rival === Game.S.player) Game.alert('crit', `${F.name} دفعت ${v.name} نحوك!`, { icon: 'dagger' });
          }
        }
      } else {
        v.refused.push(fid);
        for (const o of v.targets) if (o !== fid && v.refused.includes(o)) Game.addRel(fid, o, 10);
        c.log.push({ turn: Game.S.turn, text: `${F.name} ترد الرسول خائباً.` });
      }
    } else if (ask === 'aid' && k === 'aid') {
      const vic = data && data.victim;
      if (WX.alive(vic)) { Game.f(vic).gold += 150; Game.addRel(fid, vic, 22); Game.event('pol', `${F.name} تمدّ ${Game.fname(vic)} بالمال في وجه ${v.name}.`, { fids: [fid, vic], imp: 2 }); }
    }
  },
  ai(c, fid, ask) {
    const v = c.v, F = Game.f(fid), p = Game.pers(fid);
    if (ask === 'refugees') return F.food > 80 ? 'shelter' : F.gold > 300 ? 'arm' : 'close';
    if (ask === 'envoy') {
      const myPow = Game.factionPower(fid);
      const hPow = v.regs * 50;
      const opts = this.opts(c, fid, 'envoy');
      if (opts.some((o) => o.k === 'redirect') && F.gold > v.trib + 450 && p.honor < 1 && R() < 0.35) return 'redirect';
      if (F.gold >= v.trib + 100 && (hPow > myPow * 0.6 || p.aggr < 1) && R() < 0.75) return 'pay';
      return 'refuse';
    }
    return null;
  },
  actions(c, fid) {
    const v = c.v;
    if (c.stage < 4 || !v.fid || !WX.alive(v.fid)) return [];
    const vic = Game.aliveMajors().filter((o) => o !== fid && Game.atWar(v.fid, o) && !Game.f(o).kind);
    if (Game.atWar(fid, v.fid) || !vic.length || (c.v.aided || {})[fid]) return [];
    return [{ k: 'aid', label: `أمدّ ${Game.fname(vic[0])} بالمال`, icon: 'coins', desc: 'علاقة أفضل كثيراً، والغزاة يُستنزفون عندهم لا عندك.', gold: 150, victim: vic[0] }];
  },
  act(c, fid, k) {
    const vic = Game.aliveMajors().find((o) => o !== fid && Game.atWar(c.v.fid, o) && !Game.f(o).kind);
    c.v.aided = c.v.aided || {};
    c.v.aided[fid] = true;
    this.decide(c, fid, 'aid', 'aid', { victim: vic });
  },
  markers(c, known) {
    const v = c.v;
    if (c.stage >= 4) return [];
    // علامة على حافة الخريطة تقترب مع كل مرحلة
    const gs = known >= 2 ? v.gates : [...v.gates, ...((Game.wd().hordes || []).find((h2) => h2.key === v.key) || { gates: [] }).gates.flat()];
    const pts = gs.map((id) => Game.node(id)).filter(Boolean);
    const cx = pts.reduce((t, n) => t + n.x, 0) / pts.length, cy = pts.reduce((t, n) => t + n.y, 0) / pts.length;
    const dl = cx, dr = MW - cx, dt = cy, db = MH - cy;
    const m = Math.min(dl, dr, dt, db);
    const ex = m === dl ? 0 : m === dr ? MW : cx, ey = m === dt ? 0 : m === db ? MH : cy;
    const prog = [0.12, 0.3, 0.5, 0.62][Math.max(0, c.stage)] || 0.62;
    const x = lerp(ex, cx, prog), y = lerp(ey, cy, prog);
    return [{ kind: 'threat', x, y, tx: cx, ty: cy, color: v.color, icon: 'horse', label: v.revealed || known >= 2 ? `${v.name} ~${fmt(Math.round(v.men / 100) * 100)}` : `${v.name} ؟`, sure: known >= 2 }];
  },
  mods(c, n, m) {
    if (c.stage >= 1 && c.stage < 4 && c.v.gates.includes(n.id)) m.loy.push([`خوف من ${c.v.name}`, -6]);
  },
};

// ——— 2) هجرة قبلية: قوم يطلبون أرضاً — استقرار أو سيف أو توجيه نحو الخصم ———
CRISES.migration = {
  icon: 'banner',
  title(c) { return `هجرة ${c.v.name}`; },
  short(c) { return c.v.name; },
  status(c) { return ['قوم يرحلون', 'يطلبون أرضاً', 'الحسم'][Math.max(0, c.stage)] || ''; },
  weight(ctx) {
    const ms = Game.wd().migrants || [];
    if (!ms.length || Game.S.turn < 8) return 0;
    if (Game.S.crises.some((c) => c.type === 'migration' && (!c.over || Game.S.turn - c.end < 20))) return 0;
    return 0.7 + ctx.boredom * 0.8;
  },
  start(c) {
    const md = pick(Game.wd().migrants || []);
    if (!md) return false;
    const gates = md.gates.filter((id) => Game.node(id) && Game.node(id).owner !== 'neutral' && WX.alive(Game.node(id).owner));
    if (!gates.length) return false;
    c.v = { ...md, gate: gates[0], asked: [], regs: clamp(Math.round(Game.avgMajorRegs() * 0.4), 6, 14) };
    c.node = gates[0];
    c.fids = [Game.node(gates[0]).owner];
  },
  stages: [
    function moving(c) {
      const v = c.v;
      for (const f of Game.aliveMajors()) c.known[f] = Math.max(c.known[f] || 0, 1);
      Game.cLog(c, `${v.people} ترحل من ${v.from} بنسائها ومواشيها، هرباً من الجفاف والحروب، ووجهتها أرض ${Game.fname(Game.node(v.gate).owner)}.`, { chron: true });
      if (c.fids.includes(Game.S.player)) Game.alert('imp', `${v.people} تقترب من ${Game.node(v.gate).name}`, { icon: 'banner', node: v.gate, win: 'crisis', crisis: c.id, key: 'crisis:' + c.id });
      c.next = Game.S.turn + 2;
    },
    function plea(c) {
      const v = c.v;
      const owner = Game.node(v.gate).owner;
      if (!WX.alive(owner)) { Game.crisisEnd(c, 'gone'); return; }
      v.asked.push(owner);
      Game.cLog(c, `زعيم ${v.people} ${v.leader[0]} يقف عند ${Game.node(v.gate).name}: «أعطونا أرضاً نزرعها، ونكون سيفكم».`, { chron: true });
      c.next = Game.S.turn + 99;
      Game.crisisAsk(c, owner, 'land', { turns: 2, urgent: true, def: 'refuse', title: `${v.people} تطلب أرضاً`, node: v.gate });
    },
  ],
  opts(c, fid, ask) {
    const v = c.v;
    const n = Game.node(v.gate);
    const rivals = Game.aliveMajors().filter((o) => o !== fid && !Game.f(o).kind && !v.asked.includes(o) && Game.borders(fid, o));
    const list = [
      { k: 'settle', label: `أسكنهم قرب ${n.name}`, icon: 'house', desc: `+35٪ سكان، +300 قوى بشرية، وفرسانهم ينضمون إليك بقيادة ${v.leader[0]}.`, risk: 'الولاء −12: الأهالي يتذمرون' },
      { k: 'refuse', label: 'ارفض', icon: 'shield', desc: 'أرضك لأهلها.', risk: 'قد يشقّون طريقهم بالسيف' },
    ];
    if (rivals.length) list.push({ k: 'redirect', label: `وجّههم إلى ${Game.fname(rivals[0])}`, icon: 'dagger', desc: 'مال ودليل يقودهم إلى أرض خصمك.', gold: 140, rival: rivals[0] });
    return list;
  },
  decide(c, fid, ask, k) {
    const v = c.v, F = Game.f(fid), n = Game.node(v.gate);
    if (k === 'settle') {
      n.pop = Math.round(n.pop * 1.35); n.manpower += 300; n.loyalty = Math.max(0, n.loyalty - 12);
      const g = Game.addGeneral(fid, v.leader[0], v.leader[1], v.leader[2], v.leader[3]);
      g.loy = 55;
      const a = Game.createArmy(fid, n.id, g.id);
      const types = Object.keys(v.units);
      for (let i = 0; i < 3; i++) a.regs.push(Game.newReg(types[i % types.length]));
      F.rep = Math.min(100, F.rep + 4);
      Game.cLog(c, `استقرت ${v.people} قرب ${n.name}، ودخل فرسانها في خدمة ${F.name}.`, { chron: true, imp: 3, fids: [fid] });
      Game.crisisEnd(c, 'settled');
    } else if (k === 'redirect') {
      const o = this.opts(c, fid).find((x) => x.k === 'redirect');
      const rival = o && o.rival;
      const gate = rival && Game.nodesOf(rival).sort((a, b) => Game.hops(n.id, a.id, 6) - Game.hops(n.id, b.id, 6))[0];
      if (!gate) { this.decide(c, fid, ask, 'refuse'); return; }
      Game.cLog(c, `${F.name} تدفع ${v.people} نحو أرض ${Game.fname(rival)}.`, { fids: [fid, rival] });
      v.gate = gate.id; c.node = gate.id; c.fids = [rival];
      c.stage = 0; c.next = Game.S.turn + 1;
    } else {
      // يشقون طريقهم بالسيف: غزوة صغيرة
      const hid = Game.spawnFaction({ key: 'm', name: v.name, color: v.color, kind: 'horde', pers: { aggr: 1.5, honor: 0.7, prefs: v.units }, gold: 200 });
      const H = Game.f(hid);
      const g = Game.addGeneral(hid, v.leader[0], v.leader[1], v.leader[2], v.leader[3]);
      g.loy = 100; H.ruler = g.id;
      Game.setStatus(hid, fid, 'war', 0);
      const a = Game.createArmy(hid, n.id, g.id);
      a.from = n.id;
      for (let i = 0; i < Math.min(MAX_REGS, v.regs); i++) a.regs.push(Game.newReg(weightedPick(v.units)));
      Game.startSiege(a, n);
      H.horde.men0 = Game.armyMen(a); H.horde.until = Game.S.turn + 8;
      Game.cLog(c, `رُدّت ${v.people}، فشقّت طريقها بالسيف وحاصرت ${n.name}.`, { chron: true, imp: 3, fids: [fid, hid] });
      // تتحول إلى زحف صغير تديره أزمة القبائل
      const hc = { id: 'c' + Game.S.nextId++, type: 'horde', stage: 4, t0: Game.S.turn, next: Game.S.turn + 1, log: [], fids: [fid, hid], ask: {}, known: {}, node: n.id, over: false,
        v: { name: v.name, people: v.people, color: v.color, from: v.from, dir: '', gates: [n.id], leader: v.leader, subs: [], units: v.units, regs: v.regs, men: Game.armyMen(a), paid: [], refused: [fid], stalled: {}, reask: [], targets: [fid], fid: hid } };
      for (const f2 of Game.aliveMajors()) hc.known[f2] = 2;
      Game.S.crises.push(hc);
      Game.crisisEnd(c, 'war');
    }
  },
  ai(c, fid) {
    const F = Game.f(fid), p = Game.pers(fid);
    const opts = this.opts(c, fid);
    if (opts.some((o) => o.k === 'redirect') && F.gold > 500 && p.honor < 1 && R() < 0.4) return 'redirect';
    if (Game.nodesOf(fid).length <= 5 || Game.manpowerOf(fid) < 800 || p.honor > 1.05) return 'settle';
    return R() < 0.5 ? 'settle' : 'refuse';
  },
  markers(c) { return c.stage < 1 ? [] : [{ kind: 'camp', node: c.v.gate, color: c.v.color, icon: 'banner' }]; },
};

// ——— 3) الطاعون: ينتقل على الطرق ومع الجيوش — حجر أو صدقات أو حرق ———
CRISES.plague = {
  icon: 'skull',
  title(c) { return `${c.v.name} في ${Game.node(c.node).name}`; },
  short(c) { return c.v.name; },
  status(c) { const n = Object.keys(c.v.inf).length; return n === 1 ? 'مدينة موبوءة' : n === 2 ? 'مدينتان موبوءتان' : n ? `${n} مدن موبوءة` : 'ينحسر'; },
  weight(ctx) {
    if (Game.S.turn < 8 || Game.S.crises.some((c) => c.type === 'plague' && (!c.over || Game.S.turn - c.end < 16))) return 0;
    const wars = Game.S.armies.filter((a) => a.siege).length;
    return 0.8 + Math.min(1, wars * 0.15) + ctx.boredom * 0.6 + (ctx.late ? 0.4 : 0);
  },
  start(c, o = {}) {
    const w = {};
    const focus = o.ctx && o.ctx.focus;
    for (const n of Game.S.nodes) if (n.pop >= 11000) w[n.id] = (n.pop / 10000) * (Game.scarsAt(n.id, 4).length ? 2 : 1) * (n.port ? 1.5 : 1) * (Game.besieger(n.id) ? 1.7 : 1) * (Game.overstack(n, n.owner) > 0 ? 1.5 : 1) * (focus && (n.owner === focus || Game.adjAll(n.id).some((x) => Game.node(x).owner === focus)) ? 3 : 1);
    if (!Object.keys(w).length) return false;
    c.node = weightedPick(w);
    c.v = { name: Game.wd().plague || 'الوباء', inf: {}, done: [], quar: {}, alms: {}, deaths: 0, seen: {} };
    c.v.inf[c.node] = 4 + Math.floor(R() * 2);
    c.fids = WX.owners([c.node]);
  },
  stages: [
    function outbreak(c) {
      const n = Game.node(c.node);
      Game.cLog(c, `حمّى غامضة تفتك بأهل ${n.name}. الأطباء يتحدثون عن ${c.v.name}.`, { chron: true, imp: 3, kind: 'plague' });
      this.notify(c, n.id);
      c.next = Game.S.turn + 99;
    },
  ],
  notify(c, id) {
    const n = Game.node(id);
    for (const x of WX.near(id, 1)) for (const f of WX.owners([x])) c.known[f] = 2;
    if (n.owner === Game.S.player) Game.alert('crit', `${c.v.name} في ${n.name}! قرّر: حجر، صدقات، أم حرق`, { icon: 'skull', node: id, win: 'crisis', crisis: c.id, key: 'crisis:' + c.id + ':' + id });
    else if (Game.nodesOf(Game.S.player).some((m) => Game.adjAll(m.id).includes(id))) Game.alert('imp', `${c.v.name} في ${n.name} المجاورة`, { icon: 'skull', node: id, win: 'crisis', crisis: c.id, key: 'crisis:' + c.id + ':' + id });
    if (!c.fids.includes(n.owner) && n.owner !== 'neutral') c.fids.push(n.owner);
    // الممالك تقرر فوراً
    if (n.owner !== 'neutral' && WX.alive(n.owner) && !Game.f(n.owner).isPlayer) {
      const F = Game.f(n.owner), p = Game.pers(n.owner);
      if (p.aggr > 1.2 && p.honor < 0.9 && R() < 0.3) this.act(c, n.owner, 'burn', id);
      else if (F.gold > 350 && R() < 0.6) { F.gold -= 70; this.act(c, n.owner, 'alms', id); }
      if (p.honor >= 1 || R() < 0.5) this.act(c, n.owner, 'quar', id);
    }
  },
  tick(c) {
    if (c.stage < 0) return;
    const v = c.v, fresh = {};
    for (const id of Object.keys(v.inf)) {
      const n = Game.node(id);
      const loss = v.alms[id] ? 0.015 : 0.035;
      const dead = Math.round(n.pop * loss);
      n.pop -= dead; v.deaths += dead;
      n.manpower = Math.floor(n.manpower * 0.85);
      if (!v.alms[id]) n.loyalty = Math.max(0, n.loyalty - 3);
      for (const a of Game.armiesAt(id)) { for (const r of a.regs) r.men = Math.round(r.men * 0.95); a.sick = 3; }
      for (const e of Game.edgesOf(id)) {
        const m = Game.node(e.to);
        if (v.inf[m.id] || v.done.includes(m.id) || fresh[m.id]) continue;
        let p = 0.14 * (e.kind === 'water' ? 1.3 : 1);
        if (v.quar[id] || v.quar[m.id]) p *= 0.15;
        const tr = n.owner !== 'neutral' && m.owner !== 'neutral' && n.owner !== m.owner && Game.treaty(n.owner, m.owner).trade;
        if (m.owner === n.owner || tr) p *= 1.3;
        if (R() < p) fresh[m.id] = 3 + Math.floor(R() * 2);
      }
      v.inf[id]--;
      if (v.inf[id] <= 0) {
        delete v.inf[id]; v.done.push(id); delete v.quar[id]; delete v.alms[id];
        c.log.push({ turn: Game.S.turn, text: `انحسر ${v.name} عن ${n.name}.` });
      }
    }
    // الجيوش المريضة تحمل العدوى
    for (const a of Game.S.armies) if (a.sick > 0 && !v.inf[a.node] && !v.done.includes(a.node) && !fresh[a.node] && R() < 0.3) fresh[a.node] = 3;
    for (const id of Object.keys(fresh)) {
      v.inf[id] = fresh[id];
      const n = Game.node(id);
      Game.cLog(c, `${v.name} يبلغ ${n.name}.`, { chron: n.pop >= 20000 || n.capital, imp: 2, kind: 'plague', node: id, fids: WX.owners([id]) });
      this.notify(c, id);
    }
    if (!Object.keys(v.inf).length) {
      Game.cLog(c, `انقشع ${v.name}، بعد أن حصد نحو ${fmt(Math.round(v.deaths / 100) * 100)} نفس.`, { chron: true, imp: 3, kind: 'plague' });
      Game.crisisEnd(c, 'done');
    }
  },
  actions(c, fid) {
    const v = c.v, out = [];
    for (const id of Object.keys(v.inf)) {
      const n = Game.node(id);
      if (n.owner !== fid) continue;
      out.push({ k: 'quar', node: id, label: v.quar[id] ? `ارفع الحجر عن ${n.name}` : `احجر ${n.name}`, icon: 'gate', desc: v.quar[id] ? 'تعود التجارة والدخل.' : 'العدوى بالكاد تنتقل، لكن لا دخل منها والطريق التجاري ينقطع.', risk: v.quar[id] ? '' : 'الولاء −4' });
      if (!v.alms[id]) out.push({ k: 'alms', node: id, label: `أطباء وصدقات في ${n.name}`, icon: 'heart', desc: 'الموت أقل بكثير، والولاء لا ينهار.', gold: 70 });
      out.push({ k: 'burn', node: id, label: `أحرق الأحياء الموبوءة في ${n.name}`, icon: 'fire', desc: 'ينتهي الوباء هناك فوراً.', risk: 'سكان −12٪ وولاء −18' });
    }
    return out;
  },
  act(c, fid, k, id) {
    const v = c.v, n = Game.node(id);
    if (!v.inf[id]) return;
    if (k === 'quar') {
      if (v.quar[id]) delete v.quar[id];
      else { v.quar[id] = true; n.loyalty = Math.max(0, n.loyalty - 4); c.log.push({ turn: Game.S.turn, text: `${Game.fname(fid)} تغلق أبواب ${n.name}.` }); }
    } else if (k === 'alms') { v.alms[id] = true; c.log.push({ turn: Game.S.turn, text: `أطباء وصدقات في ${n.name}.` }); }
    else if (k === 'burn') {
      n.pop = Math.round(n.pop * 0.88); n.loyalty = Math.max(0, n.loyalty - 18);
      delete v.inf[id]; v.done.push(id); delete v.quar[id];
      Game.addScar(id, 'sack', { fid });
      Game.cLog(c, `${Game.fname(fid)} تحرق الأحياء الموبوءة في ${n.name}. انتهى الوباء هناك، والناس لن ينسوا.`, { chron: true, imp: 2, node: id, fids: [fid] });
    }
  },
  mods(c, n, m) {
    const v = c.v;
    if (!v.inf[n.id]) return;
    m.inc *= v.quar[n.id] ? 0 : 0.6; m.food *= 0.8; m.mp *= 0.3;
    m.loy.push([v.name, v.alms[n.id] ? -2 : -8]);
  },
  markers(c) { return Object.keys(c.v.inf).map((id) => ({ kind: 'plague', node: id, quar: !!c.v.quar[id], icon: 'skull' })); },
};

// ——— 4) الجفاف ثم القحط: إنذار مبكر ← حقول يابسة ← عودة المطر ———
CRISES.famine = {
  icon: 'drop',
  title(c) { return `قحط في ${Game.node(c.node).name} وما حولها`; },
  short() { return 'القحط'; },
  status(c) { return c.v.on ? `القحط ${Math.max(0, c.v.until - Game.S.turn)} أدوار` : 'الأنهار منخفضة'; },
  weight(ctx) {
    if (Game.S.turn < 6 || Game.S.crises.some((c) => c.type === 'famine' && (!c.over || Game.S.turn - c.end < 12))) return 0;
    return 0.9 + (Game.S.turn % 4 === 1 ? 0.6 : 0) + ctx.boredom * 0.5;
  },
  start(c, o = {}) {
    const w = {};
    const focus = o.ctx && o.ctx.focus;
    for (const n of Game.S.nodes) if (['plains', 'desert', 'river', 'hills'].includes(n.terrain)) w[n.id] = n.pop / 10000 * (focus && n.owner === focus ? 3 : 1);
    if (!Object.keys(w).length) return false;
    c.node = weightedPick(w);
    const region = WX.near(c.node, 1).slice(0, 5);
    c.v = { region, len: 4 + Math.floor(R() * 3), open: {}, on: false, until: 0, req: {}, imp: {} };
    c.fids = WX.owners(region);
  },
  stages: [
    function warn(c) {
      Game.cLog(c, `الأنهار حول ${Game.node(c.node).name} منخفضة والسماء شحيحة. الفلاحون يخشون موسماً عجافاً.`, { chron: true, imp: 2, kind: 'famine' });
      for (const fid of c.fids) Game.crisisAsk(c, fid, 'prep', { turns: 2, def: 'none', title: 'موسم عجاف يقترب', node: c.node });
      c.next = Game.S.turn + 2;
    },
    function hit(c) {
      c.v.on = true; c.v.until = Game.S.turn + c.v.len;
      c.fids = WX.owners(c.v.region);
      Game.cLog(c, `القحط يضرب ${WX.names(c.v.region)}. الحقول يابسة والأسعار تشتعل.`, { chron: true, imp: 3, kind: 'famine' });
      if (c.fids.includes(Game.S.player)) Game.alert('crit', `القحط في ${WX.names(c.v.region.filter((id) => Game.node(id).owner === Game.S.player))}: الطعام ينهار`, { icon: 'drop', node: c.node, win: 'crisis', crisis: c.id, key: 'crisis:' + c.id });
      for (const fid of c.fids) if (!Game.f(fid).isPlayer) this.aiAct(c, fid);
      c.next = c.v.until;
    },
    function rain(c) {
      Game.cLog(c, `عادت الأمطار إلى ${Game.node(c.node).name} وما حولها.`, { chron: true, imp: 2 });
      Game.crisisEnd(c, 'done');
    },
  ],
  tick(c) {
    const v = c.v;
    if (!v.on) return;
    for (const id of v.region) {
      const n = Game.node(id);
      if (n.owner === 'neutral') continue;
      const F = Game.f(n.owner);
      if (v.open[n.owner] && F.food >= 8) { F.food -= 8; continue; }
      if (v.open[n.owner]) v.open[n.owner] = false;
      n.loyalty = Math.max(0, n.loyalty - 3);
      n.pop = Math.round(n.pop * 0.99);
    }
    for (const fid of c.fids) if (WX.alive(fid) && !Game.f(fid).isPlayer && Game.S.turn % 2 === 0) this.aiAct(c, fid);
  },
  aiAct(c, fid) {
    const F = Game.f(fid);
    if (F.food > 60 && !c.v.open[fid]) this.act(c, fid, 'open');
    else if (F.gold > 400 && this.actions(c, fid).some((o) => o.k === 'import' && !o.dis)) { F.gold -= 110; this.act(c, fid, 'import'); }
  },
  opts(c, fid, ask) {
    if (ask === 'prep') return [
      { k: 'stock', label: 'اشترِ القمح الآن', icon: 'granary', desc: '+45 طعام قبل أن ترتفع الأسعار.', gold: 100 },
      { k: 'none', label: 'انتظر', icon: 'hourglass', desc: 'ربما تمطر.' },
    ];
    return [];
  },
  decide(c, fid, ask, k) { if (ask === 'prep' && k === 'stock') Game.f(fid).food += 45; },
  ai(c, fid, ask) { return ask === 'prep' && Game.f(fid).gold > 500 && R() < 0.6 ? 'stock' : 'none'; },
  actions(c, fid) {
    const v = c.v;
    if (!v.on || !v.region.some((id) => Game.node(id).owner === fid)) return [];
    const mine = v.region.filter((id) => Game.node(id).owner === fid).length;
    const partner = Game.aliveMajors().find((o) => o !== fid && Game.treaty(fid, o).trade && !Game.nodesOf(o).some((n) => v.region.includes(n.id)));
    const out = [
      { k: 'open', label: v.open[fid] ? 'أغلق مخازن الدولة' : 'افتح مخازن الدولة', icon: 'granary', desc: v.open[fid] ? 'توفّر الطعام، لكن الولاء يعود للانهيار.' : `${8 * mine} طعام كل دور، ولا ينهار الولاء.` },
    ];
    if (!v.req[fid]) out.push({ k: 'req', label: 'صادر مخازن الأغنياء', icon: 'coins', desc: `+${35 * mine} ذهب مرة واحدة.`, risk: 'الولاء −10' });
    if (partner && v.imp[fid] !== Game.S.turn) out.push({ k: 'import', label: `استورد القمح من ${Game.fname(partner)}`, icon: 'cart', desc: '+50 طعام، وعلاقة أفضل مع شريكك التجاري.', gold: 110, partner });
    else if (!partner) out.push({ k: 'import', label: 'استورد القمح', icon: 'cart', desc: 'يحتاج اتفاق تجارة مع مملكة خارج منطقة القحط.', dis: true });
    return out;
  },
  act(c, fid, k) {
    const v = c.v, F = Game.f(fid);
    const mine = v.region.filter((id) => Game.node(id).owner === fid);
    if (k === 'open') v.open[fid] = !v.open[fid];
    else if (k === 'req') { v.req[fid] = true; F.gold += 35 * mine.length; for (const id of mine) Game.node(id).loyalty = Math.max(0, Game.node(id).loyalty - 10); }
    else if (k === 'import') {
      const partner = Game.aliveMajors().find((o) => o !== fid && Game.treaty(fid, o).trade && !Game.nodesOf(o).some((n) => v.region.includes(n.id)));
      if (partner) { F.food += 50; Game.f(partner).gold += 60; Game.addRel(fid, partner, 6); v.imp[fid] = Game.S.turn; }
    }
  },
  mods(c, n, m) {
    if (!c.v.region.includes(n.id)) return;
    if (c.v.on) { m.food *= 0.25; m.mp *= 0.5; }
  },
  markers(c) { return c.v.region.map((id) => ({ kind: 'famine', node: id, on: c.v.on, icon: 'drop' })); },
};

// ——— 5) العرش: مرض الحاكم ← موته أو أسره ← الوريث ← من ينازعه؟ ———
CRISES.succession = {
  icon: 'crown',
  title(c) { return `عرش ${Game.fname(c.v.fid)}`; },
  short(c) { return `عرش ${Game.fname(c.v.fid)}`; },
  status(c) { return { ill: 'الحاكم مريض', captive: 'الحاكم أسير', dead: 'الخلافة', battle: 'الخلافة', civil: 'حرب الخلافة' }[c.v.phase || c.v.cause] || ''; },
  start(c, o) {
    const g = Game.rulerOf(o.fid);
    c.v = { fid: o.fid, cause: o.cause, ruler: g ? g.id : null, rname: g ? g.name : 'الحاكم', rivals: [], rebels: [] };
    c.fids = [o.fid];
    c.node = (Game.nodesOf(o.fid).find((n) => n.capital) || Game.nodesOf(o.fid)[0] || { id: null }).id;
  },
  stages: [
    function first(c) {
      const v = c.v, F = Game.f(v.fid);
      for (const f of Game.aliveMajors()) if (Game.intelLevel(f, v.fid) >= 1) c.known[f] = Math.max(c.known[f] || 0, 1);
      if (v.cause === 'ill') {
        v.phase = 'ill';
        Game.cLog(c, `${v.rname} حاكم ${F.name} طريح الفراش، والأطباء لا يبشّرون.`, { chron: true, imp: 2, kind: 'crisis' });
        c.next = Game.S.turn + 2 + (R() < 0.5 ? 1 : 0);
        if (F.isPlayer) Game.crisisAsk(c, v.fid, 'ill', { turns: 2, def: 'wait', title: `${v.rname} مريض — العرش في خطر` });
        return;
      }
      if (v.cause === 'captive') {
        v.phase = 'captive';
        const g = Game.gen(v.ruler);
        Game.cLog(c, `${v.rname} حاكم ${F.name} أسير لدى ${Game.fname(g.captor)}!`, { chron: true, imp: 3 });
        c.next = Game.S.turn + 99;
        Game.crisisAsk(c, v.fid, 'captive', { turns: 2, urgent: true, def: 'crown', title: `${v.rname} في الأسر` });
        return;
      }
      c.stage = 0;
      this.stages[1].call(this, c);
    },
    function death(c) {
      const v = c.v, F = Game.f(v.fid);
      if (!F || !F.alive) { Game.crisisEnd(c, 'gone'); return; }
      if (v.cause === 'ill') {
        const g = Game.gen(v.ruler);
        if (g && g.status !== 'dead' && R() < 0.3) {
          Game.cLog(c, `تعافى ${v.rname} من مرضه، وتنفّس البلاط.`, { chron: true, imp: 2 });
          g.age0 = (g.age0 || 50) - 2;
          Game.crisisEnd(c, 'recovered');
          return;
        }
      }
      const r = Game.rulerDeath(v.fid, v.cause === 'ill' ? 'ill' : v.cause === 'captive' ? 'captive' : 'battle');
      v.heir = r.heir.id; v.hname = r.heir.name;
      v.rivals = r.rivals.map((g) => g.id);
      v.phase = 'dead';
      c.log.push({ turn: Game.S.turn, text: `${r.heir.name} على عرش ${F.name}.` });
      for (const f of Game.aliveMajors()) c.known[f] = Math.max(c.known[f] || 0, 1);
      if (v.rivals.length) {
        const top = Game.gen(v.rivals[0]);
        c.next = Game.S.turn + 1;
        Game.crisisAsk(c, v.fid, 'rivals', { turns: 1, urgent: true, def: 'risk', title: `${top.name} لا يعترف بـ${r.heir.name}`, data: { rival: top.id } });
      } else {
        Game.cLog(c, `استقرّ الأمر لـ${r.heir.name} في ${F.name}.`, { chron: false });
        Game.crisisEnd(c, 'smooth');
      }
    },
    function civil(c) {
      const v = c.v, F = Game.f(v.fid);
      if (!F || !F.alive) { Game.crisisEnd(c, 'gone'); return; }
      for (const id of v.rivals) {
        const g = Game.gen(id);
        if (!g || g.fid !== v.fid || !['army', 'gov', 'pool'].includes(g.status)) continue;
        const size = Game.nodesOf(v.fid).length;
        const p = clamp((55 - g.loy) / 55, 0, 1) * (g.rank / 3) * (size >= 6 ? 1.3 : 0.8) * (g.status === 'army' ? 1.2 : 0.6);
        if (R() < p) {
          const nid = Game.generalRebels(g, 'succession');
          if (nid) v.rebels.push(nid);
        }
      }
      if (!v.rebels.length) {
        Game.cLog(c, `ثبت ${v.hname} على عرش ${F.name}، وانحنى المنافسون.`, { chron: true, imp: 2 });
        Game.crisisEnd(c, 'smooth');
        return;
      }
      v.phase = 'civil';
      c.fids = [v.fid, ...v.rebels];
      Game.cLog(c, `حرب الخلافة في ${F.name}!`, { chron: true, imp: 3, kind: 'rebel' });
      c.next = Game.S.turn + 99;
    },
  ],
  tick(c) {
    const v = c.v;
    if (v.phase === 'civil') {
      const alive = v.rebels.filter((id) => WX.alive(id));
      if (!alive.length) { Game.cLog(c, `انتهت حرب الخلافة: ${v.hname} يوحّد ${Game.fname(v.fid)} من جديد.`, { chron: true, imp: 3, kind: 'victory' }); Game.crisisEnd(c, 'won'); }
      else if (!WX.alive(v.fid)) { Game.cLog(c, `انتصر المنشقون وسقط بيت ${v.hname}.`, { chron: true, imp: 3 }); Game.crisisEnd(c, 'lost'); }
      else if (alive.every((id) => !Game.atWar(id, v.fid))) { Game.cLog(c, `صلح بعد حرب الخلافة: ${Game.fname(v.fid)} منقسمة.`, { chron: true, imp: 3 }); Game.crisisEnd(c, 'split'); }
    }
    if (v.phase === 'captive') {
      const g = Game.gen(v.ruler);
      if (!g || g.status !== 'captive') { if (g && g.status !== 'dead') { Game.cLog(c, `عاد ${v.rname} إلى عرشه.`, { chron: true, imp: 2 }); Game.crisisEnd(c, 'freed'); } else { c.v.cause = 'dead'; c.stage = 0; c.next = Game.S.turn; } }
    }
  },
  opts(c, fid, ask, data) {
    const v = c.v;
    if (ask === 'ill') {
      const gens = Game.gensOf(fid).filter((g) => g.rank >= 2 && ['army', 'gov', 'pool'].includes(g.status) && !Game.isRuler(g));
      const cost = Math.max(60, 45 * gens.length);
      return [
        { k: 'reward', label: 'اشترِ ولاء القادة', icon: 'coins', desc: `+15 ولاء لكل القادة الكبار (${gens.length}).`, gold: cost },
        { k: 'heir', label: Game.f(fid).heir ? `أكّد ${Game.gname(Game.gen(Game.f(fid).heir))} ولياً للعهد` : 'سمِّ ولياً للعهد الآن', icon: 'crown', desc: 'من شاشة المملكة ← القادة ← العرش.' },
        { k: 'wait', label: 'انتظر وادعُ له', icon: 'hourglass', desc: 'لا كلفة.' },
      ];
    }
    if (ask === 'captive') {
      const g = Game.gen(v.ruler);
      const price = g ? Game.ransomPrice(g) * 3 : 400;
      return [
        { k: 'ransom', label: `افتده (${price})`, icon: 'gold', desc: `يعود ${v.rname} إن قبل آسره (غالباً يقبل).`, gold: price, price },
        { k: 'crown', label: 'توّج الوريث', icon: 'crown', desc: 'العرش لا ينتظر. الأسير يصبح قائداً عادياً إن عاد يوماً.', risk: 'الولاء −6 في المدن' },
      ];
    }
    if (ask === 'rivals') {
      const g = Game.gen(data.rival);
      const n = v.rivals.length;
      return [
        { k: 'grant', label: `امنح ${g.name} إقطاعاً وألقاباً`, icon: 'scroll', desc: `+35 ولاء لـ${g.name}.`, gold: 150 },
        { k: 'pay', label: 'اشترِ الجيش', icon: 'coins', desc: `+12 ولاء لكل المنافسين (${n}).`, gold: 60 * n },
        { k: 'prison', label: `اعتقل ${g.name}`, icon: 'chains', desc: 'يزول الخطر منه.', risk: '−8 سمعة، وقد يتمرد جيشه بقيادة نائبه' },
        { k: 'risk', label: 'دع السيف يقرر', icon: 'swords', desc: 'لا كلفة.', risk: 'قد تنقسم المملكة' },
      ];
    }
    return [];
  },
  decide(c, fid, ask, k, data) {
    const v = c.v, F = Game.f(fid);
    if (ask === 'ill') {
      if (k === 'reward') for (const g of Game.gensOf(fid)) if (g.rank >= 2 && ['army', 'gov', 'pool'].includes(g.status)) g.loy = Math.min(100, g.loy + 15);
      if (k === 'heir' && !F.heir) { const b = Game.bestHeir(fid); if (b) Game.setHeir(fid, b); }
    } else if (ask === 'captive') {
      const g = Game.gen(v.ruler);
      if (k === 'ransom' && g && g.status === 'captive') {
        const captor = g.captor;
        const C = Game.f(captor);
        if (C && !(C.vendetta && C.vendetta[fid] > 0) && (C.isPlayer ? true : R() < 0.8)) {
          const price = Game.ransomPrice(g) * 3;
          C.gold += price; g.status = 'pool'; g.captor = null;
          Game.cLog(c, `${F.name} تفتدي ${g.name} بـ${price} ذهباً.`, { chron: true, imp: 2 });
          Game.crisisEnd(c, 'ransomed');
        } else {
          F.gold += Game.ransomPrice(g) * 3;
          c.log.push({ turn: Game.S.turn, text: `${Game.fname(g.captor)} ترفض الفدية!` });
          if (F.isPlayer) Game.crisisAsk(c, fid, 'captive', { turns: 1, urgent: true, def: 'crown', title: `رُفضت الفدية — ${v.rname} ما زال أسيراً` });
          else this.decide(c, fid, 'captive', 'crown');
        }
      } else if (k === 'crown') {
        if (g) { g.loy = 20; }
        c.stage = 0; c.next = Game.S.turn; v.cause = 'captive';
        v.phase = 'dead';
        this.stages[1].call(this, c);
        c.stage = 1;
      }
    } else if (ask === 'rivals') {
      const g = Game.gen(data.rival);
      if (!g) return;
      if (k === 'grant') { g.loy = Math.min(100, g.loy + 35); g.honored = Game.S.turn; }
      else if (k === 'pay') { for (const id of v.rivals) { const x = Game.gen(id); if (x) x.loy = Math.min(100, x.loy + 12); } }
      else if (k === 'prison') {
        const a = g.status === 'army' ? Game.army(g.army) : null;
        g.status = 'exiled'; g.army = null;
        F.rep = Math.max(0, F.rep - 8);
        v.rivals = v.rivals.filter((id) => id !== g.id);
        Game.cLog(c, `${F.name} تعتقل ${g.name} قبل أن يتحرك.`, { chron: true, imp: 2 });
        if (a && a.regs.length >= 3 && R() < 0.35) {
          const lt = Game.officer(fid); lt.loy = 10; lt.rank = 2;
          lt.status = 'army'; lt.army = a.id; a.gen = lt.id;
          const nid = Game.generalRebels(lt, 'ambition', { name: `أنصار ${g.name}` });
          if (nid) { v.rebels.push(nid); }
        } else if (a) Game.fixLeaderless();
      }
    }
  },
  ai(c, fid, ask, data) {
    const F = Game.f(fid), p = Game.pers(fid);
    if (ask === 'captive') return F.gold > Game.ransomPrice(Game.gen(c.v.ruler) || { rank: 2 }) * 3 + 150 ? 'ransom' : 'crown';
    if (ask === 'rivals') {
      if (F.gold > 400) return p.honor >= 1 ? 'grant' : 'pay';
      if (p.aggr > 1.2 && p.honor < 0.9 && R() < 0.4) return 'prison';
      return 'risk';
    }
    return 'wait';
  },
  markers(c) { return c.node && Game.node(c.node) && Game.node(c.node).owner === c.v.fid ? [{ kind: 'crown', node: c.node, icon: c.v.phase === 'civil' ? 'crownbroken' : 'crown' }] : []; },
};

// ——— 6) قائد طموح: ولائم ← احتجاز الضرائب ← رسائل مع العدو ← تمرد ———
CRISES.rebel = {
  icon: 'dagger',
  title(c) { return `طموح ${Game.gname(Game.gen(c.v.gen))}`; },
  short(c) { return Game.gname(Game.gen(c.v.gen)); },
  status(c) { return ['ولائم وأحاديث', 'يحتجز الضرائب', 'رسائل مع العدو', 'تمرد'][Math.max(0, c.stage)] || ''; },
  start(c, o) {
    const g = Game.gen(o.gen);
    if (!g || Game.isRuler(g) || Game.isHeir(g)) return false;
    c.v = { gen: g.id, fid: g.fid, suitor: null, withhold: null };
    c.fids = [g.fid];
    c.node = this.place(c);
  },
  place(c) {
    const g = Game.gen(c.v.gen);
    if (!g) return null;
    if (g.status === 'army') { const a = Game.army(g.army); return a ? a.node : null; }
    return g.city || null;
  },
  valid(c) { const g = Game.gen(c.v.gen); return g && g.fid === c.v.fid && ['army', 'gov'].includes(g.status) && WX.alive(c.v.fid); },
  calm(c) {
    const g = Game.gen(c.v.gen);
    if (g.loy >= 45) { Game.cLog(c, `عاد ${g.name} إلى الطاعة.`, { fids: [c.v.fid] }); Game.crisisEnd(c, 'calm'); return true; }
    return false;
  },
  stages: [
    function whispers(c) {
      if (!this.valid(c)) { Game.crisisEnd(c, 'gone'); return; }
      const g = Game.gen(c.v.gen);
      c.node = this.place(c);
      Game.cLog(c, `${g.name} يقيم الولائم لضباطه في ${Game.node(c.node).name} ويتحدث عن «ظلم البلاط».`, { fids: [c.v.fid], imp: 2 });
      for (const f of Game.aliveMajors()) if (f !== c.v.fid && Game.intelLevel(f, c.v.fid) >= 3) c.known[f] = 1;
      c.next = Game.S.turn + 2;
      Game.crisisAsk(c, c.v.fid, 'ambition', { turns: 2, def: 'wait', title: `${g.name} يتحدث عن «ظلم البلاط»`, node: c.node });
    },
    function taxes(c) {
      if (!this.valid(c)) { Game.crisisEnd(c, 'gone'); return; }
      if (this.calm(c)) return;
      const g = Game.gen(c.v.gen);
      c.node = this.place(c);
      c.v.withhold = c.node;
      const foes = Game.aliveMajors().filter((o) => o !== c.v.fid && Game.atWar(o, c.v.fid) && !Game.f(o).kind);
      c.v.suitor = foes.sort((a, b) => Game.factionPower(b) - Game.factionPower(a))[0] || null;
      Game.cLog(c, `${g.name} يحتجز ضرائب ${Game.node(c.node).name} «لحاجة جنده».`, { fids: [c.v.fid], imp: 2 });
      c.next = Game.S.turn + 2;
      Game.crisisAsk(c, c.v.fid, 'ambition', { turns: 2, def: 'wait', title: `${g.name} يحتجز الضرائب`, node: c.node });
    },
    function letters(c) {
      if (!this.valid(c)) { Game.crisisEnd(c, 'gone'); return; }
      if (this.calm(c)) return;
      const g = Game.gen(c.v.gen);
      Game.cLog(c, c.v.suitor ? `اعتُرضت رسائل بين ${g.name} و${Game.fname(c.v.suitor)}.` : `${g.name} يجمع حوله الساخطين ويتهيأ.`, { fids: [c.v.fid], imp: 2 });
      c.next = Game.S.turn + 1;
      Game.crisisAsk(c, c.v.fid, 'ambition', { turns: 1, urgent: true, def: 'wait', title: `${g.name} على وشك التمرد`, node: c.node });
    },
    function revolt(c) {
      if (!this.valid(c)) { Game.crisisEnd(c, 'gone'); return; }
      if (this.calm(c)) return;
      const g = Game.gen(c.v.gen);
      const nid = Game.generalRebels(g, 'ambition', { suitor: c.v.suitor });
      if (!nid) { Game.crisisEnd(c, 'fled'); return; }
      c.v.rfid = nid; c.v.withhold = null;
      c.fids = [c.v.fid, nid];
      for (const f of Game.aliveMajors()) c.known[f] = Math.max(c.known[f] || 0, 1);
      c.next = Game.S.turn + 99;
    },
  ],
  tick(c) {
    if (!c.v.rfid) return;
    if (!WX.alive(c.v.rfid)) { Game.cLog(c, `سُحق تمرد ${Game.gname(Game.gen(c.v.gen))}.`, { chron: true, imp: 3, kind: 'victory' }); Game.crisisEnd(c, 'crushed'); }
    else if (!WX.alive(c.v.fid)) Game.crisisEnd(c, 'won');
    else if (!Game.atWar(c.v.rfid, c.v.fid)) { Game.cLog(c, `اعترفت ${Game.fname(c.v.fid)} بـ${Game.fname(c.v.rfid)} على مضض.`, { chron: true, imp: 3 }); Game.crisisEnd(c, 'split'); }
  },
  opts(c, fid, ask) {
    const g = Game.gen(c.v.gen);
    if (!g) return [];
    const a = g.status === 'army' ? Game.army(g.army) : null;
    const list = [
      { k: 'honor', label: `كرّمه (${Game.honorCost(g) + 40})`, icon: 'star', desc: '+25 ولاء. قد يكفي لإطفاء الطموح.', gold: Game.honorCost(g) + 40 },
      { k: 'recall', label: 'استدعه إلى البلاط', icon: 'crown', desc: 'يُنزع منه الجيش ويبقى تحت العين.', risk: g.loy < 20 ? 'قد يرفض ويتمرد فوراً' : 'ولاؤه يتحسن قليلاً' },
    ];
    if (a && a.regs.length >= 4) list.push({ k: 'split', label: 'قسّم جيشه', icon: 'minus', desc: 'نصف وحداته تنتقل إلى ضابط موالٍ.', risk: 'ولاؤه −8' });
    list.push({ k: 'kill', label: 'تخلّص منه سراً', icon: 'dagger', desc: 'ينتهي الخطر إن نجح (نحو 55٪).', risk: 'إن فشل: تمرد فوري وسمعة أسوأ', gold: 150 });
    list.push({ k: 'wait', label: 'تجاهل', icon: 'hourglass', desc: 'لا كلفة.' });
    return list;
  },
  decide(c, fid, ask, k) {
    const g = Game.gen(c.v.gen), F = Game.f(fid);
    if (!g) return;
    if (k === 'honor') { g.loy = Math.min(100, g.loy + 25); g.honored = Game.S.turn; c.log.push({ turn: Game.S.turn, text: `${F.name} تغمر ${g.name} بالعطايا.` }); if (g.loy >= 45) { Game.crisisEnd(c, 'calm'); } }
    else if (k === 'recall') {
      if (g.loy < 20 && R() < 0.5) { c.log.push({ turn: Game.S.turn, text: `${g.name} يرفض أمر الاستدعاء!` }); c.stage = 2; c.next = Game.S.turn; return; }
      const a = g.status === 'army' ? Game.army(g.army) : null;
      g.status = 'pool'; g.army = null; g.city = null; g.loy = Math.min(100, g.loy + 8);
      if (a) Game.fixLeaderless();
      Game.cLog(c, `${g.name} يمثل أمام البلاط وتُنزع منه القيادة.`, { fids: [fid] });
      Game.crisisEnd(c, 'recalled');
    } else if (k === 'split') {
      const a = Game.army(g.army);
      if (a && a.regs.length >= 4) {
        const half = a.regs.splice(Math.ceil(a.regs.length / 2));
        const off = Game.officer(fid); off.loy = 85;
        const b = Game.createArmy(fid, a.node, off.id);
        b.regs.push(...half); b.siege = a.siege ? { ...a.siege } : null; b.from = a.from;
        g.loy = Math.max(0, g.loy - 8);
        c.log.push({ turn: Game.S.turn, text: `نصف جيش ${g.name} يُنقل إلى ${off.name}.` });
      }
    } else if (k === 'kill') {
      if (R() < 0.55) {
        g.status = 'dead'; g.diedTurn = Game.S.turn;
        const a = g.army ? Game.army(g.army) : null;
        g.army = null;
        if (a) Game.fixLeaderless();
        F.rep = Math.max(0, F.rep - 4);
        Game.cLog(c, `مات ${g.name} فجأة بعد عشاء في البلاط. الألسن لا تسكت.`, { chron: true, imp: 3, kind: 'death', fids: [fid] });
        Game.crisisEnd(c, 'killed');
      } else {
        F.rep = Math.max(0, F.rep - 10);
        c.log.push({ turn: Game.S.turn, text: `نجا ${g.name} من خنجر مأجور — وعرف من أرسله.` });
        g.loy = 0;
        c.stage = 2; c.next = Game.S.turn;
      }
    }
  },
  ai(c, fid) {
    const F = Game.f(fid), p = Game.pers(fid), g = Game.gen(c.v.gen);
    if (!g) return 'wait';
    if (F.gold > Game.honorCost(g) + 250 && (p.honor >= 1 || R() < 0.5)) return 'honor';
    if (p.aggr > 1.2 && p.honor < 0.9 && F.gold > 300 && R() < 0.35) return 'kill';
    if (g.loy >= 20 || R() < 0.4) return 'recall';
    const a = g.army ? Game.army(g.army) : null;
    return a && a.regs.length >= 4 ? 'split' : 'wait';
  },
  mods(c, n, m) { if (c.v.withhold === n.id) { m.inc *= 0; m.loy.push(['قائد متمرد يحتجز الضرائب', -4]); } },
  markers(c) { return c.node && c.stage < 3 ? [{ kind: 'dagger', node: c.node, icon: 'dagger' }] : []; },
};

// ——— 7) حلف ضد المهيمن: رسل سرية ← حلف ← إنذار ← حرب الحلف ———
CRISES.coalition = {
  icon: 'treaty',
  title(c) { return `حلف ضد ${Game.fname(c.v.dom)}`; },
  short() { return 'الحلف'; },
  status(c) { return ['رسل سرية', 'الحلف يُعقد', 'الإنذار', 'حرب الحلف'][Math.max(0, c.stage)] || ''; },
  weight(ctx) {
    if (!ctx.dom || ctx.domTurns < 3) return 0;
    if (Game.S.crises.some((c) => c.type === 'coalition' && (!c.over || Game.S.turn - c.end < 14))) return 0;
    const others = Game.aliveMajors().filter((f) => f !== ctx.dom && !Game.f(f).kind);
    return others.length >= 2 ? 3 + ctx.domTurns * 0.5 : 0;
  },
  start(c, o) {
    const dom = o.ctx && o.ctx.dom;
    if (!dom) return false;
    const members = Game.aliveMajors().filter((f) => f !== dom && !Game.f(f).kind && (Game.rel(f, dom) < 25 || Game.borders(f, dom)));
    if (members.length < 2) return false;
    c.v = { dom, members, joined: [], ult: null, demand: null };
    c.fids = [dom, ...members];
    c.node = (Game.nodesOf(dom).find((n) => n.capital) || Game.nodesOf(dom)[0] || { id: null }).id;
  },
  stages: [
    function envoys(c) {
      const v = c.v;
      for (const f of v.members) c.known[f] = 2;
      if (v.members.some((f) => Game.intelLevel(v.dom, f) >= 2)) c.known[v.dom] = 2;
      Game.cLog(c, `رسل يتنقلون سراً بين ${WX.fnames(v.members)}. الحديث كله عن ${Game.fname(v.dom)}.`, { fids: v.members, imp: 2 });
      const P = Game.S.player;
      if (v.dom === P && c.known[P]) Game.crisisAsk(c, P, 'counter', { turns: 2, def: 'ignore', title: `جيرانك يتآمرون عليك` });
      if (v.members.includes(P)) Game.crisisAsk(c, P, 'join', { turns: 1, urgent: true, def: 'decline', title: `دعوة إلى حلف ضد ${Game.fname(v.dom)}` });
      for (const f of v.members) if (!Game.f(f).isPlayer) v.joined.push(f);
      c.next = Game.S.turn + 2;
    },
    function pact(c) {
      const v = c.v;
      v.joined = v.joined.filter((f) => WX.alive(f) && !Game.friendly(f, v.dom));
      if (v.joined.length < 2) { Game.cLog(c, `فشلت مساعي الحلف ضد ${Game.fname(v.dom)}.`, { fids: c.fids }); Game.crisisEnd(c, 'failed'); return; }
      for (let i = 0; i < v.joined.length; i++) for (let j = i + 1; j < v.joined.length; j++) {
        const a = v.joined[i], b = v.joined[j];
        if (Game.atWar(a, b)) Game.makePeace(a, b, 10, 'لمواجهة عدو مشترك');
        if (Game.status(a, b) !== 'alliance') Game.makeAlliance(a, b);
      }
      c.known[v.dom] = 2;
      Game.cLog(c, `حلف يُعقد على ${Game.fname(v.dom)} بين ${WX.fnames(v.joined)}.`, { chron: true, imp: 3, kind: 'alliance' });
      if (v.dom === Game.S.player) Game.alert('crit', `حلف يُعقد ضدك: ${WX.fnames(v.joined)}`, { icon: 'treaty', win: 'crisis', crisis: c.id, key: 'crisis:' + c.id });
      c.next = Game.S.turn + 1;
    },
    function ultimatum(c) {
      const v = c.v;
      const mine = Game.nodesOf(v.dom).filter((n) => !n.capital);
      const recent = mine.filter((n) => v.joined.includes(n.origOwner)).sort((a, b) => b.capturedTurn - a.capturedTurn)[0];
      const border = mine.filter((n) => Game.adjAll(n.id).some((id) => v.joined.includes(Game.node(id).owner))).sort((a, b) => a.pop - b.pop)[0];
      const n = recent || border;
      if (!n) { c.stage = 2; c.next = Game.S.turn; return; }
      v.demand = n.id;
      Game.cLog(c, `الحلف يطالب ${Game.fname(v.dom)} بالتخلي عن ${n.name}، وإلا فالحرب.`, { chron: true, imp: 3 });
      c.next = Game.S.turn + 1;
      Game.crisisAsk(c, v.dom, 'ultimatum', { turns: 1, urgent: true, def: 'refuse', title: `إنذار الحلف: ${n.name}`, node: n.id });
    },
    function war(c) {
      const v = c.v;
      if (v.ult === 'cede' || v.ult === 'paid') { Game.crisisEnd(c, 'appeased'); return; }
      let n = 0;
      for (const f of v.joined) if (WX.alive(f) && !Game.atWar(f, v.dom)) { Game.declareWar(f, v.dom, 'حرب الحلف'); n++; }
      Game.cLog(c, `حرب الحلف على ${Game.fname(v.dom)}!`, { chron: true, imp: 3, kind: 'war' });
      void n;
      v.until = Game.S.turn + 12;
      c.next = v.until;
    },
    function end(c) { Game.cLog(c, `انفضّ الحلف على ${Game.fname(c.v.dom)}.`, { chron: true }); Game.crisisEnd(c, 'done'); },
  ],
  tick(c) {
    const v = c.v;
    if (!WX.alive(v.dom)) { Game.crisisEnd(c, 'dom-fell'); return; }
    if (c.stage === 3) {
      const tot = Game.aliveMajors().reduce((t, f) => t + Game.factionPower(f), 0) || 1;
      if (Game.factionPower(v.dom) / tot < 0.34) { Game.cLog(c, `انكسرت هيمنة ${Game.fname(v.dom)}، والحلف ينفرط.`, { chron: true, imp: 3 }); Game.crisisEnd(c, 'broken'); }
    }
  },
  opts(c, fid, ask) {
    const v = c.v;
    if (ask === 'counter') {
      const weak = v.members.filter((f) => WX.alive(f)).sort((a, b) => Game.factionPower(a) - Game.factionPower(b))[0];
      return [
        { k: 'gifts', label: `هدايا لـ${Game.fname(weak)}`, icon: 'coins', desc: 'علاقة +25، وقد تنسحب من الحلف.', gold: 160, who: weak },
        { k: 'ignore', label: 'تجاهل', icon: 'hourglass', desc: 'لا كلفة.' },
      ];
    }
    if (ask === 'join') return [
      { k: 'join', label: 'انضم إلى الحلف', icon: 'treaty', desc: `حلف مع ${WX.fnames(v.members.filter((f) => f !== fid))} وحرب على ${Game.fname(v.dom)} بعد الإنذار.` },
      { k: 'decline', label: 'اعتذر', icon: 'close', desc: 'تبقى خارج الحرب.', risk: 'علاقة −10 مع الأعضاء' },
      { k: 'betray', label: `أخبر ${Game.fname(v.dom)}`, icon: 'dagger', desc: `+150 ذهب وعلاقة أفضل مع ${Game.fname(v.dom)}.`, risk: 'إن انكشف: −12 سمعة وعداوة الأعضاء' },
    ];
    if (ask === 'ultimatum') {
      const n = Game.node(v.demand);
      return [
        { k: 'cede', label: `تخلَّ عن ${n.name}`, icon: 'flag', desc: 'ينفرط الحلف غالباً.', risk: 'تخسر المدينة' },
        { k: 'pay', label: 'ادفع تعويضاً (260)', icon: 'gold', desc: 'قد يرضيهم (نحو النصف).', gold: 260 },
        { k: 'refuse', label: 'ارفض', icon: 'swords', desc: 'تحتفظ بكل شيء.', risk: 'حرب على أكثر من جبهة' },
      ];
    }
    return [];
  },
  decide(c, fid, ask, k) {
    const v = c.v, F = Game.f(fid);
    if (ask === 'counter' && k === 'gifts') {
      const o = this.opts(c, fid, 'counter').find((x) => x.k === 'gifts');
      if (o && WX.alive(o.who)) {
        Game.f(o.who).gold += 160; Game.addRel(fid, o.who, 25);
        if (R() < 0.55) { v.members = v.members.filter((f) => f !== o.who); v.joined = v.joined.filter((f) => f !== o.who); c.log.push({ turn: Game.S.turn, text: `${Game.fname(o.who)} تنسحب من المؤامرة.` }); }
      }
    } else if (ask === 'join') {
      if (k === 'join') v.joined.push(fid);
      else if (k === 'decline') for (const m of v.members) if (m !== fid) Game.addRel(fid, m, -10);
      else if (k === 'betray') {
        F.gold += 150; Game.f(v.dom).gold -= 150; Game.addRel(fid, v.dom, 20);
        c.known[v.dom] = 2;
        if (R() < 0.35) { F.rep = Math.max(0, F.rep - 12); for (const m of v.members) if (m !== fid) Game.addRel(fid, m, -30); c.log.push({ turn: Game.S.turn, text: `انكشفت خيانة ${F.name} للحلف!` }); }
      }
    } else if (ask === 'ultimatum') {
      if (k === 'cede') {
        const n = Game.node(v.demand);
        const to = v.joined.includes(n.origOwner) && WX.alive(n.origOwner) ? n.origOwner : v.joined.filter((f) => WX.alive(f)).sort((a, b) => Game.hops((Game.nodesOf(a)[0] || n).id, n.id, 6) - Game.hops((Game.nodesOf(b)[0] || n).id, n.id, 6))[0];
        if (to) {
          for (const a of Game.armiesAt(n.id)) if (a.fid === fid) Game.retreatHome(a, [n.id]);
          n.owner = to; n.capturedTurn = Game.S.turn; n.loyalty = 60; n.garrison = []; Game.fillGarrison(n, true);
          Game.cLog(c, `${F.name} تتخلى عن ${n.name} لـ${Game.fname(to)} اتقاءً للحرب.`, { chron: true, imp: 3 });
        }
        v.ult = R() < 0.7 ? 'cede' : 'refuse';
        if (v.ult === 'refuse') c.log.push({ turn: Game.S.turn, text: 'لم يكفِ الحلفَ ذلك.' });
      } else if (k === 'pay') {
        for (const f of v.joined) if (WX.alive(f)) Game.f(f).gold += Math.round(260 / v.joined.length);
        v.ult = R() < 0.5 ? 'paid' : 'refuse';
        c.log.push({ turn: Game.S.turn, text: v.ult === 'paid' ? `${F.name} تدفع التعويض والحلف يتراجع.` : `أخذ الحلف المال ولم يتراجع!` });
      } else v.ult = 'refuse';
      Game.validate();
    }
  },
  ai(c, fid, ask) {
    const v = c.v, F = Game.f(fid), p = Game.pers(fid);
    if (ask === 'ultimatum') {
      const n = Game.node(v.demand);
      if (F.gold > 700 && R() < 0.5) return 'pay';
      if (n && n.pop < 14000 && p.honor >= 1 && R() < 0.5) return 'cede';
      return 'refuse';
    }
    if (ask === 'counter') return F.gold > 600 ? 'gifts' : 'ignore';
    return null;
  },
};

// ——— 8) مدينة غنية تطالب بميثاق: حكم ذاتي أو قمع أو استقلال ———
CRISES.freecity = {
  icon: 'scroll',
  title(c) { return `مطالب ${Game.node(c.node).name}`; },
  short(c) { return Game.node(c.node).name; },
  status(c) { return c.stage <= 0 ? 'عريضة التجار' : 'الحسم'; },
  cands() {
    return Game.S.nodes.filter((n) => {
      if (n.owner === 'neutral' || n.capital || n.charter || (n.petition || -99) > Game.S.turn - 16) return false;
      const f = Game.f(n.owner);
      if (!f || f.kind === 'horde' || Game.nodesOf(n.owner).length < 5) return false;
      return (n.market >= 1 || n.pop >= 18000) && Game.capitalDist(n) >= 2 && n.loyalty < 78 && !Game.besieger(n.id);
    });
  },
  weight(ctx) { return this.cands().length ? 0.7 + (ctx.hoard ? 0.8 : 0) + ctx.boredom * 0.4 + (ctx.dom ? 0.4 : 0) : 0; },
  start(c, o = {}) {
    const cs = this.cands();
    if (!cs.length) return false;
    const w = {};
    for (const n of cs) w[n.id] = n.pop / 10000 + n.market + (n.owner === Game.S.player ? (o.ctx && o.ctx.focus ? 4 : 1) : 0) + (n.owner === (Game.S.dir.dom || '') ? 1.5 : 0);
    c.node = weightedPick(w);
    const n = Game.node(c.node);
    n.petition = Game.S.turn;
    c.v = { fid: n.owner, answer: null };
    c.fids = [n.owner];
  },
  stages: [
    function petition(c) {
      const n = Game.node(c.node);
      Game.cLog(c, `تجار ${n.name} يطالبون ${Game.fname(c.v.fid)} بميثاق حر: ضرائب أخف وحكم ذاتي.`, { fids: [c.v.fid], imp: 2 });
      c.next = Game.S.turn + 3;
      Game.crisisAsk(c, c.v.fid, 'charter', { turns: 2, def: 'refuse', title: `تجار ${n.name} يطالبون بميثاق`, node: c.node });
    },
    function outcome(c) {
      const n = Game.node(c.node);
      if (n.owner !== c.v.fid) { Game.crisisEnd(c, 'gone'); return; }
      if (c.v.answer === 'refuse' && n.loyalty < 45 && !Game.armiesOfAt(n.owner, n.id).length) {
        const prev = n.owner;
        n.owner = 'neutral'; n.walls = Math.min(3, n.walls + 1); n.garrison = []; Game.fillGarrison(n, true); n.loyalty = 70; n.capturedTurn = Game.S.turn;
        Game.cLog(c, `${n.name} تطرد عمّال ${Game.fname(prev)} وتعلن نفسها مدينة حرة!`, { chron: true, imp: 3, kind: 'rebel', fids: [prev] });
        if (prev === Game.S.player) Game.alert('crit', `${n.name} تعلن استقلالها!`, { icon: 'scroll', node: n.id });
        Game.validate();
      } else if (c.v.answer === 'refuse') c.log.push({ turn: Game.S.turn, text: `هدأت ${n.name} على مضض.` });
      Game.crisisEnd(c, c.v.answer || 'done');
    },
  ],
  opts(c, fid) {
    const n = Game.node(c.node);
    const army = Game.armiesOfAt(fid, n.id).length > 0;
    return [
      { k: 'grant', label: 'امنحهم الميثاق', icon: 'scroll', desc: `ولاء ${n.name} +20 دائماً.`, risk: 'يصلك ثلثا دخلها فقط، للأبد' },
      { k: 'bribe', label: 'اشترِ كبار التجار', icon: 'coins', desc: 'تُطوى العريضة لسنوات.', gold: 110 },
      { k: 'garrison', label: 'جيشك في المدينة يكفي', icon: 'shield', desc: 'ترفض بلا ثمن ما دام جيشك هناك.', risk: 'الولاء −5', dis: !army, why: army ? '' : 'لا جيش لك فيها' },
      { k: 'refuse', label: 'ارفض', icon: 'close', desc: 'المال مال الدولة.', risk: 'الولاء −15، وقد تعلن استقلالها' },
    ];
  },
  decide(c, fid, ask, k) {
    const n = Game.node(c.node);
    c.v.answer = k;
    if (k === 'grant') { n.charter = true; Game.cLog(c, `${Game.fname(fid)} تمنح ${n.name} ميثاقاً حراً.`, { chron: true, imp: 2 }); Game.crisisEnd(c, 'granted'); }
    else if (k === 'bribe') { n.petition = Game.S.turn + 10; Game.crisisEnd(c, 'bribed'); }
    else if (k === 'garrison') { n.loyalty = Math.max(0, n.loyalty - 5); Game.crisisEnd(c, 'suppressed'); }
    else n.loyalty = Math.max(0, n.loyalty - 15);
  },
  ai(c, fid) {
    const F = Game.f(fid), n = Game.node(c.node);
    if (Game.armiesOfAt(fid, n.id).length) return 'garrison';
    if (F.gold > 500) return 'bribe';
    return n.loyalty < 55 ? 'grant' : 'refuse';
  },
  markers(c) { return [{ kind: 'scroll', node: c.node, icon: 'scroll' }]; },
};

// ——— 9) دعوة وانتفاضة: داعية ← انتشار ← ثورة ———
CRISES.uprising = {
  icon: 'torch',
  title(c) { return c.v.title; },
  short(c) { return c.v.title; },
  status(c) { return ['داعية يجمع الفقراء', 'الدعوة تنتشر', 'ثورة'][Math.max(0, c.stage)] || ''; },
  cands() {
    const out = [];
    for (const fid of Game.aliveMajors()) {
      const f = Game.f(fid);
      if (f.kind === 'horde') continue;
      const low = Game.nodesOf(fid).filter((n) => n.loyalty < 42 && !n.capital && !Game.besieger(n.id));
      if (low.length >= 2 || (low.length >= 1 && f.tax === 'high')) out.push([fid, low]);
    }
    return out;
  },
  weight(ctx) { return this.cands().length ? 0.8 + ctx.boredom * 0.4 : 0; },
  start(c, o = {}) {
    const cs = this.cands();
    if (!cs.length) return false;
    const mine = o.ctx && o.ctx.focus && cs.find(([f]) => f === o.ctx.focus);
    const [fid, low] = mine || pick(cs);
    const origin = low.sort((a, b) => a.loyalty - b.loyalty)[0];
    const U = Game.wd().uprisings || {};
    const [title, leader] = U[fid] || U.def || ['ثورة المحرومين', 'زعيم مجهول'];
    c.v = { fid, title, leader, cities: [origin.id] };
    c.node = origin.id;
    c.fids = [fid];
  },
  stages: [
    function preacher(c) {
      const v = c.v;
      Game.cLog(c, `${v.leader} يجمع الفقراء في ${Game.node(c.node).name} ويعدهم بزمن عادل.`, { fids: [v.fid], imp: 2 });
      c.next = Game.S.turn + 2;
      Game.crisisAsk(c, v.fid, 'movement', { turns: 2, def: 'ignore', title: `${v.title}: داعية في ${Game.node(c.node).name}`, node: c.node });
    },
    function spread(c) {
      const v = c.v;
      if (Game.node(c.node).owner !== v.fid) { Game.crisisEnd(c, 'gone'); return; }
      if (v.cities.every((id) => Game.node(id).loyalty >= 50)) { Game.cLog(c, `خمدت دعوة ${v.leader}.`, { fids: [v.fid] }); Game.crisisEnd(c, 'calm'); return; }
      const add = [];
      for (const id of v.cities) for (const x of Game.adjAll(id)) { const m = Game.node(x); if (m.owner === v.fid && m.loyalty < 52 && !v.cities.includes(x) && !add.includes(x)) add.push(x); }
      v.cities.push(...add.slice(0, 2));
      for (const id of v.cities) { const n = Game.node(id); n.unrest = Math.max(n.unrest, 2); }
      Game.cLog(c, `${v.title} تنتشر${add.length ? ' إلى ' + WX.names(add.slice(0, 2)) : ' في ' + Game.node(c.node).name}.`, { chron: true, imp: 2, fids: [v.fid], kind: 'rebel' });
      c.next = Game.S.turn + 2;
      Game.crisisAsk(c, v.fid, 'movement', { turns: 1, urgent: true, def: 'ignore', title: `${v.title} تنتشر`, node: c.node });
    },
    function revolt(c) {
      const v = c.v;
      const hot = v.cities.map((id) => Game.node(id)).filter((n) => n.owner === v.fid && n.loyalty < 50 && !Game.armiesOfAt(v.fid, n.id).length);
      if (!hot.length) { Game.cLog(c, `انطفأت ${v.title} قبل أن تشتعل.`, { fids: [v.fid] }); Game.crisisEnd(c, 'calm'); return; }
      const PF = Game.f(v.fid);
      const nid = Game.spawnFaction({ key: 'u', name: v.title, color: WX.shade('#8a2f24', R() * 0.3), kind: 'rebel', parent: v.fid, pers: { aggr: 1.3, honor: 1.1, prefs: { spear: 3, sword: 2, archer: 2 } }, gold: 150 });
      const NF = Game.f(nid);
      const g = Game.addGeneral(nid, v.leader, 'brave', 'reckless', 2);
      g.loy = 100; NF.ruler = g.id;
      for (const n of hot) {
        for (const a of Game.armiesAt(n.id)) if (a.fid === v.fid) Game.retreatHome(a, [n.id]);
        n.owner = nid; n.loyalty = 70; n.unrest = 0; n.capturedTurn = Game.S.turn; n.garrison = []; Game.fillGarrison(n, true);
      }
      const a = Game.createArmy(nid, hot[0].id, g.id);
      for (let i = 0; i < 4; i++) a.regs.push(Game.newReg(i % 2 ? 'spear' : 'sword'));
      Game.setStatus(nid, v.fid, 'war', 0);
      v.rfid = nid;
      c.fids = [v.fid, nid];
      for (const f of Game.aliveMajors()) c.known[f] = Math.max(c.known[f] || 0, 1);
      Game.cLog(c, `${v.title} تثور على ${PF.name} وتستولي على ${WX.names(hot.map((n) => n.id))}!`, { chron: true, imp: 3, kind: 'rebel' });
      if (PF.isPlayer) Game.alert('crit', `${v.title} تستولي على ${WX.names(hot.map((n) => n.id))}!`, { icon: 'torch', node: hot[0].id });
      Game.validate();
      c.next = Game.S.turn + 99;
    },
  ],
  tick(c) {
    if (!c.v.rfid) return;
    if (!WX.alive(c.v.rfid)) { Game.cLog(c, `أُخمدت ${c.v.title}.`, { chron: true, imp: 2, kind: 'victory' }); Game.crisisEnd(c, 'crushed'); }
    else if (!WX.alive(c.v.fid) || !Game.atWar(c.v.rfid, c.v.fid)) Game.crisisEnd(c, 'settled');
  },
  opts(c, fid) {
    const v = c.v;
    const cost = 50 + 25 * v.cities.length;
    const army = Game.armiesOfAt(fid, c.node).length > 0;
    return [
      { k: 'alms', label: 'صدقات وتخفيف', icon: 'heart', desc: `ولاء +12 في ${v.cities.length} مدن.`, gold: cost },
      { k: 'suppress', label: 'اقمع الدعوة', icon: 'swords', desc: 'تنتهي غالباً (65٪).', risk: 'سمعة −4، والمدن المجاورة تغضب', dis: !army, why: army ? '' : 'يحتاج جيشاً في المدينة' },
      { k: 'coopt', label: `استمل ${v.leader}`, icon: 'crown', desc: `يصبح قائداً في بلاطك وتنتهي الدعوة.`, risk: 'ولاؤه ضعيف', gold: 90 },
      { k: 'ignore', label: 'تجاهل', icon: 'hourglass', desc: 'لا كلفة.' },
    ];
  },
  decide(c, fid, ask, k) {
    const v = c.v, F = Game.f(fid);
    if (k === 'alms') { for (const id of v.cities) { const n = Game.node(id); if (n.owner === fid) n.loyalty = Math.min(100, n.loyalty + 12); } if (v.cities.every((id) => Game.node(id).loyalty >= 50)) { Game.cLog(c, `خمدت ${v.title} بالعطاء.`, { fids: [fid] }); Game.crisisEnd(c, 'calm'); } }
    else if (k === 'suppress') {
      const n = Game.node(c.node);
      n.pop = Math.round(n.pop * 0.96); F.rep = Math.max(0, F.rep - 4);
      for (const id of v.cities) if (id !== c.node) Game.node(id).loyalty = Math.max(0, Game.node(id).loyalty - 8);
      if (R() < 0.65) { Game.cLog(c, `${F.name} تقمع ${v.title} في ${n.name}.`, { chron: true, imp: 2, fids: [fid] }); Game.crisisEnd(c, 'crushed'); }
      else c.log.push({ turn: Game.S.turn, text: `القمع صنع شهداء، والدعوة تشتعل.` });
    } else if (k === 'coopt') {
      const g = Game.addGeneral(fid, v.leader, 'brave', 'disloyal', 1);
      g.loy = 40;
      for (const id of v.cities) Game.node(id).loyalty = Math.min(100, Game.node(id).loyalty + 6);
      Game.cLog(c, `${v.leader} يقبل منصباً في بلاط ${F.name}، وتنطفئ الدعوة.`, { chron: true, imp: 2, fids: [fid] });
      Game.crisisEnd(c, 'coopted');
    }
  },
  ai(c, fid) {
    const F = Game.f(fid), p = Game.pers(fid);
    if (Game.armiesOfAt(fid, c.node).length && p.aggr > 1.1) return 'suppress';
    if (F.gold > 300) return p.honor >= 1 ? 'alms' : 'coopt';
    return 'ignore';
  },
  markers(c) { return c.v.rfid ? [] : c.v.cities.map((id) => ({ kind: 'torch', node: id, icon: 'torch' })); },
};

// ——— 10) نجم صاعد أو فرقة مرتزقة: من يدفع أكثر؟ ومن لا يدفع يواجهها ———
CRISES.star = {
  icon: 'star',
  title(c) { return c.v.merc ? c.v.name : `النجم الصاعد ${c.v.name}`; },
  short(c) { return c.v.name; },
  status(c) { return c.stage <= 0 ? 'يعرض سيفه' : 'الحسم'; },
  weight(ctx) {
    if (Game.S.turn < 6 || Game.S.crises.some((c) => c.type === 'star' && (!c.over || Game.S.turn - c.end < 10))) return 0;
    return 0.7 + ctx.boredom * 0.5 + (ctx.hoard ? 0.9 : 0);
  },
  start(c, o) {
    const wd = Game.wd();
    const hoard = o.ctx && o.ctx.hoard;
    const merc = (wd.mercs || []).length && R() < (hoard ? 0.6 : 0.35);
    const neutral = Game.S.nodes.filter((n) => n.owner === 'neutral');
    const focus = o.ctx && o.ctx.focus;
    const nearF = focus ? neutral.filter((n) => Game.adjAll(n.id).some((x) => Game.node(x).owner === focus)) : [];
    const home = pick(nearF.length ? nearF : neutral.length ? neutral : Game.S.nodes);
    if (merc) {
      const m = pick(wd.mercs);
      if (Game.S.crises.some((x) => !x.over && x.type === 'star' && x.v.name === m.name)) return false;
      c.v = { merc: true, name: m.name, leader: m.leader, trait: m.trait, units: m.units, bids: {}, regs: 6, home: home.id };
    } else {
      const used = new Set(Object.values(Game.S.gens).map((g) => g.name));
      const free = (wd.stars || []).filter((s) => !used.has(s[0]));
      if (!free.length) return false;
      const s = pick(free);
      c.v = { merc: false, name: s[0], trait: s[1], flaw: s[2], bids: {}, home: home.id };
    }
    c.node = home.id;
    c.fids = [];
  },
  stages: [
    function tales(c) {
      const v = c.v, n = Game.node(v.home);
      for (const f of Game.aliveMajors()) c.known[f] = 2;
      Game.cLog(c, v.merc ? `${v.name} بقيادة ${v.leader} تعرض سيوفها قرب ${n.name} على من يدفع أكثر.` : `حكايات عن شاب من ${n.name} اسمه ${v.name} (${TRAITS[v.trait].name}) هزم عصابة كاملة بمئة رجل. الممالك تتسابق إليه.`, { chron: true, imp: 2, kind: 'hero', fids: [] });
      for (const f of Game.aliveMajors()) if (!Game.f(f).kind) Game.crisisAsk(c, f, 'bid', { turns: 2, def: 'none', title: v.merc ? `${v.name} تعرض خدماتها` : `${v.name} يبحث عن سيد يخدمه`, node: v.home });
      c.next = Game.S.turn + 2;
    },
    function decide(c) {
      const v = c.v;
      let best = null, bs = 0;
      for (const [fid, amt] of Object.entries(v.bids)) {
        if (!WX.alive(fid) || Game.f(fid).gold < amt) continue;
        const s = amt + Game.f(fid).rep * 2 + (v.merc ? 0 : Game.pers(fid).honor * 40);
        if (s > bs) { bs = s; best = fid; }
      }
      if (best) {
        const F = Game.f(best);
        F.gold -= v.bids[best];
        if (v.merc) {
          const site = Game.nodesOf(best).sort((a, b) => Game.hops(v.home, a.id, 8) - Game.hops(v.home, b.id, 8))[0];
          if (site) {
            const g = Game.addGeneral(best, v.leader, v.trait, 'greedy', 2);
            g.loy = 45;
            const a = Game.createArmy(best, site.id, g.id);
            for (let i = 0; i < v.regs; i++) { const r = Game.newReg(weightedPick(v.units)); r.merc = true; r.exp = 1; a.regs.push(r); }
          }
          Game.cLog(c, `${v.name} تدخل في خدمة ${F.name}.`, { chron: true, imp: 2, fids: [best] });
        } else {
          const g = Game.addGeneral(best, v.name, v.trait, v.flaw, 2);
          g.loy = 75;
          Game.cLog(c, `${v.name} ينضم إلى ${F.name}. يقول الناس إن نجمه لن يخبو.`, { chron: true, imp: 3, kind: 'hero', fids: [best] });
        }
        if (best === Game.S.player) Game.alert('info', `${v.name} في خدمتك الآن`, { icon: 'star', win: 'kingdom' });
        Game.crisisEnd(c, 'hired');
        return;
      }
      // لا أحد دفع: يرفع رايته في مدينة ضعيفة
      const n = Game.node(v.home);
      if (n.owner === 'neutral' && (v.merc || R() < 0.6)) {
        const nid = Game.spawnFaction({ key: v.merc ? 'k' : 's', name: v.merc ? v.name : `إمارة ${v.name}`, color: WX.shade('#6a5a8a', (R() - 0.5) * 0.4), kind: v.merc ? 'merc' : 'realm', pers: { aggr: 1.2, honor: v.merc ? 0.7 : 1.1, prefs: v.merc ? v.units : { spear: 2, sword: 2, archer: 2, cavalry: 1.5 } }, gold: 300 });
        const NF = Game.f(nid);
        const g = Game.addGeneral(nid, v.merc ? v.leader : v.name, v.trait, v.merc ? 'greedy' : v.flaw, 2);
        g.loy = 100; NF.ruler = g.id; g.age0 = 26; g.bornTurn = Game.S.turn;
        n.owner = nid; n.loyalty = 65; n.capturedTurn = Game.S.turn; n.garrison = []; Game.fillGarrison(n, true);
        for (const a of Game.armiesAt(n.id)) if (a.fid === 'neutral') Game.removeArmy(a);
        const a = Game.createArmy(nid, n.id, g.id);
        const units = v.merc ? v.units : { spear: 2, sword: 2, archer: 2 };
        for (let i = 0; i < (v.merc ? v.regs : 4); i++) a.regs.push(Game.newReg(weightedPick(units)));
        for (const f of Game.aliveMajors()) c.known[f] = 2;
        Game.cLog(c, v.merc ? `لم يدفع أحد، فاستولت ${v.name} على ${n.name}. قوة جديدة تبيع سيفها.` : `${v.name} يرفع رايته في ${n.name}: إمارة جديدة تولد.`, { chron: true, imp: 3, kind: 'realm' });
        Game.validate();
      } else Game.cLog(c, v.merc ? `رحلت ${v.name} إلى أرض أخرى.` : `رحل ${v.name} إلى أرض بعيدة.`, { fids: [] });
      Game.crisisEnd(c, 'unhired');
    },
  ],
  opts(c, fid) {
    const v = c.v;
    if (v.merc) return [
      { k: 'hire', label: 'استأجرهم (380)', icon: 'coins', desc: `${v.regs} وحدات مخضرمة بقيادة ${v.leader} (صيانة المرتزقة مرتفعة).`, risk: 'قد يزايد غيرك', gold: 380, amt: 380 },
      { k: 'none', label: 'لا حاجة', icon: 'close', desc: 'قد يستأجرهم خصمك، أو يستولون على مدينة.' },
    ];
    return [
      { k: 'b100', label: 'ادعُه بـ100', icon: 'coins', desc: 'دعوة متواضعة.', gold: 100, amt: 100 },
      { k: 'b220', label: 'ادعُه بـ220', icon: 'coins', desc: 'عرض سخي.', gold: 220, amt: 220 },
      { k: 'b360', label: 'ادعُه بـ360', icon: 'gold', desc: 'عرض لا يُرد غالباً.', gold: 360, amt: 360 },
      { k: 'none', label: 'تجاهل', icon: 'hourglass', desc: 'قد يخدم خصمك، أو يرفع رايته.' },
    ];
  },
  decide(c, fid, ask, k) {
    const o = this.opts(c, fid).find((x) => x.k === k);
    if (o && o.amt) { Game.f(fid).gold += o.amt; c.v.bids[fid] = o.amt; c.log.push({ turn: Game.S.turn, text: `${Game.fname(fid)} تقدّم عرضاً.` }); }
  },
  ai(c, fid) {
    const F = Game.f(fid), v = c.v;
    if (v.merc) return F.gold > 900 && Game.aliveMajors().some((o) => o !== fid && Game.atWar(fid, o)) && R() < 0.6 ? 'hire' : 'none';
    if (F.gold > 800 && R() < 0.5) return 'b360';
    if (F.gold > 500 && R() < 0.5) return 'b220';
    if (F.gold > 300 && R() < 0.4) return 'b100';
    return 'none';
  },
  markers(c) { return [{ kind: 'star', node: c.v.home, icon: c.v.merc ? 'coins' : 'star' }]; },
};

// ——— 11) طريق القوافل: انقطاع الطريق أو طريق جديد — المال يشتري المسار ———
CRISES.route = {
  icon: 'camel',
  title(c) { return c.v.kind === 'collapse' ? `انقطاع ${c.v.oldName}` : `طريق جديد: ${c.v.alts.map((a) => a.name).join(' أو ')}`; },
  short() { return 'القوافل'; },
  status(c) { return c.stage <= 0 ? 'التجار يبحثون عن طريق' : 'الحسم'; },
  weight(ctx) {
    const rs = Game.wd().routes || [];
    if (rs.length < 2 || Game.S.turn < 12 || Game.S.crises.some((c) => c.type === 'route' && (!c.over || Game.S.turn - c.end < 16))) return 0;
    return 0.5 + (ctx.hoard ? 0.9 : 0) + ctx.boredom * 0.3;
  },
  start(c, o) {
    const r = Game.S.route;
    const rs = (Game.wd().routes || []).filter((x) => !r || x.key !== r.key);
    if (!rs.length) return false;
    c.v = { kind: o.kind || 'shift', oldKey: r ? r.key : null, oldName: r ? r.name : '', alts: rs.map((x) => ({ key: x.key, name: x.name, path: x.path.filter((id) => Game.node(id)) })), bids: {} };
    c.fids = WX.owners(c.v.alts.flatMap((a) => a.path));
    c.node = c.v.alts[0].path[0];
  },
  stages: [
    function first(c) {
      const v = c.v;
      for (const f of Game.aliveMajors()) c.known[f] = Math.max(c.known[f] || 0, 1);
      for (const f of c.fids) c.known[f] = 2;
      if (v.kind === 'collapse') {
        const r = Game.S.route;
        if (r) r.dead = true;
        Game.cLog(c, `توقفت القوافل على ${v.oldName}: الطريق لم يعد آمناً. التجار يبحثون عن بديل عبر ${v.alts.map((a) => a.name).join(' أو ')}.`, { chron: true, imp: 3, kind: 'crisis' });
      } else Game.cLog(c, `تجار أغراب يسألون عن طريق جديد عبر ${v.alts.map((a) => a.name).join(' أو ')}. من يمهّد الطريق يربح القوافل.`, { chron: true, imp: 2 });
      for (const f of c.fids) Game.crisisAsk(c, f, 'invest', { turns: 2, def: 'none', title: 'سباق على طريق القوافل' });
      c.next = Game.S.turn + 2;
    },
    function settle(c) {
      const v = c.v;
      const score = (a) => a.path.reduce((t, id) => { const n = Game.node(id); return t + (v.bids[n.owner] || 0) / Math.max(1, a.path.filter((x) => Game.node(x).owner === n.owner).length) + 30 * (n.roads + (n.port || 0)) + 10 * n.market; }, 0);
      const pickA = v.alts.slice().sort((a, b) => score(b) - score(a))[0];
      const old = v.oldKey && Game.routeDef(v.oldKey);
      const keepOld = v.kind === 'shift' && old && score(pickA) < 80;
      if (keepOld) { Game.cLog(c, `بقيت القوافل على ${v.oldName}.`, { fids: c.fids }); Game.crisisEnd(c, 'kept'); return; }
      Game.S.route = { key: pickA.key, name: pickA.name, path: pickA.path.slice(), bad: 0, dead: false };
      const winners = WX.owners(pickA.path);
      Game.cLog(c, `القوافل تسلك ${pickA.name} الآن. الذهب يتدفق على ${WX.fnames(winners) || 'المدن المستقلة'}.`, { chron: true, imp: 3, kind: 'crisis' });
      if (winners.includes(Game.S.player)) Game.alert('info', `${pickA.name} يمر بأرضك — دخل القوافل لك`, { icon: 'camel' });
      Game.crisisEnd(c, 'settled');
    },
  ],
  opts(c, fid) {
    const mine = c.v.alts.filter((a) => a.path.some((id) => Game.node(id).owner === fid)).map((a) => a.name);
    return [
      { k: 'i250', label: 'استثمر 250', icon: 'gold', desc: `محطات وحراسة على ${mine.join(' و')}.`, gold: 250, amt: 250 },
      { k: 'i120', label: 'استثمر 120', icon: 'coins', desc: 'مساهمة متواضعة.', gold: 120, amt: 120 },
      { k: 'none', label: 'لا', icon: 'close', desc: 'الطرق المعبّدة والموانئ على الطريق تحسب لك وحدها.' },
    ];
  },
  decide(c, fid, ask, k) { const o = this.opts(c, fid).find((x) => x.k === k); if (o && o.amt) c.v.bids[fid] = (c.v.bids[fid] || 0) + o.amt; },
  ai(c, fid) {
    const F = Game.f(fid);
    const nodes = c.v.alts.flatMap((a) => a.path).filter((id) => Game.node(id).owner === fid).length;
    if (F.gold > 900 && nodes >= 2) return 'i250';
    if (F.gold > 500 && nodes >= 1 && R() < 0.6) return 'i120';
    return 'none';
  },
};
