'use strict';
// نموذج الحملة: القادة، الجيوش، الحركة، الاقتصاد، الإمداد، الحصار، الاحتلال، الأسرى

const SAVE_KEY_V1 = 'swords-kingdoms-save-v1';
const SAVE_PREFIX = 'swords-kingdoms-v2:';
const SAVE_SLOTS = ['auto', '1', '2', '3'];
const DIFFS = {
  easy: { name: 'سهل', aiIncome: 0.9, aiSkill: 0.35, aiAggr: 0.8 },
  normal: { name: 'متوسط', aiIncome: 1.1, aiSkill: 0.6, aiAggr: 1 },
  hard: { name: 'صعب', aiIncome: 1.3, aiSkill: 0.85, aiAggr: 1.2 },
};
const INIT_DIPLO = {
  threeKingdoms: [['wei', 'shu', 'war'], ['wei', 'wu', 'war'], ['shu', 'wu', 'peace']],
  umayyad: [['umayyad', 'byzantine', 'war'], ['umayyad', 'khazar', 'war'], ['byzantine', 'khazar', 'alliance']],
};
const GENERIC_NAMES = ['عامر', 'خالد', 'منصور', 'ثابت', 'حمزة', 'سالم', 'نصر', 'ليث', 'زياد', 'مالك', 'حارث', 'عتبة', 'رافع', 'عمرو'];
const MAX_REGS = 8;
const EV_CATS = { mil: 'عسكرية', pol: 'سياسية ودبلوماسية', eco: 'اقتصادية', int: 'داخلية' };
const RANK_XP = [0, 0, 4, 10];
const CHRON_ICON = { start: 'flag', war: 'swords', peace: 'dove', alliance: 'treaty', betray: 'dagger', fall: 'breach', capital: 'crown', battle: 'swords', death: 'skull', execute: 'skull', captive: 'chains', realm: 'crownbroken', chapter: 'book', crisis: 'warning', rebel: 'torch', hero: 'star', victory: 'laurel', vassal: 'seal', plague: 'skull', famine: 'food' };

const Game = {
  S: null,
  hooks: {},

  // ------------------، الإنشاء -------------------
  newGame(scId, player, diff) {
    const sc = SCENARIOS[scId];
    const S = {
      v: 3, scenario: scId, turn: 0, player, difficulty: diff, nextId: 1,
      factions: {}, nodes: [], armies: [], gens: {}, tributes: [], log: [], over: null,
      alerts: [], scars: [], chron: [], aid: 1,
    };
    this.S = S;
    const ids = Object.keys(sc.factions);
    for (const id of ids) {
      const f = sc.factions[id];
      S.factions[id] = this.newFaction(id, f.name, f.color, id === player);
      for (const [n, t, fl, rk] of f.generals) this.addGeneral(id, n, t, fl, rk);
    }
    S.factions.neutral = this.newFaction('neutral', NEUTRAL.name, NEUTRAL.color, false);
    S.factions.neutral.neutral = true;
    for (const [n, t, fl, rk] of sc.neutralGenerals) this.addGeneral('neutral', n, t, fl, rk);
    for (const a of ids) for (const b of ids) {
      if (a === b) continue;
      const A = S.factions[a];
      A.status[b] = 'peace'; A.rel[b] = 5; A.truce[b] = 0; A.warTurns[b] = 0;
    }
    for (const [a, b, st] of INIT_DIPLO[scId] || []) {
      this.setStatus(a, b, st, 0);
      const r = st === 'war' ? -40 : st === 'alliance' ? 50 : 15;
      S.factions[a].rel[b] = r; S.factions[b].rel[a] = r;
    }
    for (const n of sc.nodes) {
      S.nodes.push({
        id: n.id, name: n.name, x: n.x, y: n.y, owner: n.owner, origOwner: n.owner, pop: n.pop,
        walls: n.walls, market: 0, farm: 0, granary: 0, roads: 0, port: 0, barracks: n.capital ? 1 : 0,
        loyalty: 75, capital: !!n.capital, terrain: n.terrain, stores: 3 + n.walls, garrison: [],
        capturedTurn: -99, unrest: 0, manpower: 0, parley: -1, built: -1, festival: -99,
      });
    }
    for (const n of S.nodes) { n.manpower = this.mpCap(n); this.fillGarrison(n, true); }
    for (const a of sc.armies) {
      const g = this.gensOf(a.owner).find((x) => x.name === a.gen && x.status === 'pool');
      const army = this.createArmy(a.owner, a.node, g ? g.id : null);
      for (const t of a.regs) army.regs.push(this.newReg(t));
    }
    for (const id of ids) this.refreshMercs(id);
    this.event('pol', 'بدأت الحملة. ' + sc.intro, { imp: 3 });
    this.chronicle('start', `${S.factions[player].name} تبدأ طريقها. ${sc.intro}`, { fids: [player], imp: 3 });
    if (this.initWorld) this.initWorld();
    if (this.tradeGoal) this.tradeGoal(player);
    this.save();
    return S;
  },

  newFaction(id, name, color, isPlayer) {
    return {
      id, name, color, gold: isPlayer ? 600 : 550, food: 40, alive: true, isPlayer,
      rel: {}, status: {}, truce: {}, warTurns: {}, lostRecently: 0,
      rep: 50, tax: 'normal', treaty: {}, grievance: {}, vendetta: {}, intel: {}, claims: [], mercs: [],
      lastWarTurn: 0, goals: null,
    };
  },

  // ------------------، الحفظ والتحميل -------------------
  save(slot = 'auto') {
    if (!this.S) return false;
    const f = this.f(this.S.player);
    const meta = { scenario: this.S.scenario, player: this.S.player, fname: f.name, turn: this.S.turn, time: Date.now(), over: this.S.over };
    return store.set(SAVE_PREFIX + slot, { meta, S: this.S });
  },
  readSlot(slot) {
    const d = store.get(SAVE_PREFIX + slot);
    if (d && d.S) return d;
    if (slot === 'auto') {
      const old = store.get(SAVE_KEY_V1);
      if (old && old.v === 1) return { meta: { scenario: old.scenario, player: old.player, fname: (old.factions[old.player] || {}).name, turn: old.turn, time: 0, over: old.over }, S: old };
    }
    return null;
  },
  load(slot = 'auto') {
    const d = this.readSlot(slot);
    if (!d) return null;
    let S = JSON.parse(JSON.stringify(d.S));
    if (!S.v || S.v === 1) S = this.migrateV1(S);
    this.S = S;
    this.normalizeState();
    this.validate();
    return S;
  },
  listSaves() { return SAVE_SLOTS.map((s) => ({ slot: s, data: this.readSlot(s) })); },
  hasSave() { const d = this.readSlot('auto'); return !!(d && !d.meta.over); },
  clearSave() { store.del(SAVE_PREFIX + 'auto'); store.del(SAVE_KEY_V1); },

  // ترقية حفظ الإصدار الأول
  migrateV1(o) {
    const S = {
      v: 2, scenario: o.scenario, turn: o.turn, player: o.player, difficulty: o.difficulty || 'normal', nextId: (o.nextId || 1) + 1000,
      factions: {}, nodes: o.nodes, armies: [], gens: {}, tributes: [], log: [], over: o.over || null,
    };
    this.S = S;
    const tmap = { stalwart: 'defender' };
    for (const id in o.factions) {
      const of = o.factions[id];
      const f = this.newFaction(id, of.name, of.color, of.isPlayer);
      Object.assign(f, { gold: of.gold, food: of.food, alive: of.alive, rel: of.rel || {}, status: of.status || {}, truce: of.truce || {}, warTurns: of.warTurns || {}, lostRecently: of.lostRecently || 0 });
      if (of.neutral) f.neutral = true;
      S.factions[id] = f;
      for (const p of of.pool || []) this.addGeneral(id, p.name, tmap[p.trait] || p.trait || null, null, 1);
    }
    for (const a of o.armies) {
      const g0 = a.general || { name: 'القائد ' + pick(GENERIC_NAMES), trait: null };
      const g = this.addGeneral(a.fid, g0.name, tmap[g0.trait] || g0.trait || null, null, 1);
      const army = { id: a.id, fid: a.fid, node: a.node, from: a.from || a.node, gen: g.id, regs: a.regs, mp: BASE_MP, siege: a.siege, mood: null };
      g.status = 'army'; g.army = army.id;
      S.armies.push(army);
    }
    for (const e of o.log || []) S.log.push({ turn: e.turn, cat: { war: 'mil', diplo: 'pol' }[e.type] || 'int', text: e.text, imp: 2, fids: [] });
    for (const id of Object.keys(S.factions)) this.refreshMercs(id);
    return S;
  },

  // ملء الحقول الناقصة (يحمي الحفظ القديم من أي حقل جديد)
  normalizeState() {
    const S = this.S;
    S.tributes = S.tributes || [];
    S.alerts = S.alerts || []; S.scars = S.scars || []; S.chron = S.chron || []; S.aid = S.aid || 1;
    S.v = 3;
    for (const id in S.factions) {
      const d = this.newFaction(id, '', '', false);
      const f = S.factions[id];
      for (const k in d) if (f[k] === undefined) f[k] = d[k];
    }
    // مزامنة المدن مع تعريف السيناريو (مدن أضيفت في إصدارات لاحقة)
    const sc = SCENARIOS[S.scenario];
    for (const d of sc.nodes) {
      const n = S.nodes.find((x) => x.id === d.id);
      if (n) { n.terrain = d.terrain; n.x = d.x; n.y = d.y; continue; }
      const nn = {
        id: d.id, name: d.name, x: d.x, y: d.y, owner: 'neutral', origOwner: 'neutral', pop: d.pop, walls: d.walls,
        loyalty: 70, capital: false, terrain: d.terrain, stores: 3 + d.walls, garrison: [],
      };
      S.nodes.push(nn);
      this.fillGarrison(nn, true);
    }
    S.nodes = S.nodes.filter((n) => sc.nodes.some((d) => d.id === n.id));
    for (const n of S.nodes) {
      for (const [k, v] of Object.entries({ granary: 0, roads: 0, market: 0, farm: 0, barracks: 0, port: 0, unrest: 0, festival: -99, parley: -1, built: -1, capturedTurn: -99 })) if (n[k] === undefined) n[k] = v;
      if (n.manpower === undefined) n.manpower = this.mpCap(n);
      if (!n.garrison) n.garrison = [];
      if (!n.origOwner) n.origOwner = n.owner;
    }
    for (const a of S.armies) {
      if (a.mp === undefined) a.mp = this.mpMax(a);
      if (a.mood === undefined) a.mood = null;
      if (!a.from) a.from = a.node;
    }
    if (this.initWorld) this.initWorld();
  },

  // ------------------، مساعدات -------------------
  get sc() { return SCENARIOS[this.S.scenario]; },
  f(id) { return this.S.factions[id]; },
  node(id) { return this.S.nodes.find((n) => n.id === id); },
  army(id) { return this.S.armies.find((a) => a.id === id); },
  gen(id) { return id ? this.S.gens[id] : null; },
  armyGen(a) { return a ? this.gen(a.gen) : null; },
  gensOf(fid) { return Object.values(this.S.gens).filter((g) => g.fid === fid); },
  poolOf(fid) { return this.gensOf(fid).filter((g) => g.status === 'pool'); },
  captivesHeldBy(fid) { return Object.values(this.S.gens).filter((g) => g.status === 'captive' && g.captor === fid); },
  edgesOf(id) {
    const out = [];
    for (const e of this.sc.edges) {
      if (e[0] === id) out.push({ to: e[1], kind: e[2] || 'road' });
      else if (e[1] === id) out.push({ to: e[0], kind: e[2] || 'road' });
    }
    return out;
  },
  adj(id) { return this.edgesOf(id).filter((e) => e.kind !== 'water').map((e) => e.to); },
  adjAll(id) { return this.edgesOf(id).map((e) => e.to); },
  edge(a, b) { return this.edgesOf(a).find((e) => e.to === b) || null; },
  armiesAt(nodeId) { return this.S.armies.filter((a) => a.node === nodeId); },
  besiegers(nodeId) { return this.S.armies.filter((a) => a.node === nodeId && a.siege); },
  besieger(nodeId) { return this.besiegers(nodeId)[0] || null; },
  friendly(a, b) { if (a === b || this.status(a, b) === 'alliance') return true; const A = this.f(a), B = this.f(b); return !!((A && A.overlord === b) || (B && B.overlord === a)); },
  // المدافعون عن المدينة: جيوش مالكها وحلفائه داخلها
  defendersOf(n) { return this.S.armies.filter((a) => a.node === n.id && !a.siege && this.friendly(a.fid, n.owner)); },
  armiesOfAt(fid, nodeId) { return this.S.armies.filter((a) => a.fid === fid && a.node === nodeId && !a.siege); },
  insideArmy(n) { return this.defendersOf(n).find((a) => a.fid === n.owner) || null; },
  majors() { return Object.keys(this.S.factions).filter((id) => id !== 'neutral'); },
  aliveMajors() { return this.majors().filter((id) => this.f(id).alive); },
  nodesOf(fid) { return this.S.nodes.filter((n) => n.owner === fid); },
  armiesOf(fid) { return this.S.armies.filter((a) => a.fid === fid); },
  season() { return SEASONS[this.S.turn % 4]; },
  year() { return this.sc.startYear + Math.floor(this.S.turn / 4); },
  isWinter() { return this.S.turn % 4 === 3; },
  fname(fid) { return this.f(fid) ? this.f(fid).name : fid; },
  gname(g) { return g ? g.name : 'بلا قائد'; },
  hasTrait(a, t) { const g = this.armyGen(a); return !!(g && g.trait === t); },
  hasFlaw(a, t) { const g = this.armyGen(a); return !!(g && g.flaw === t); },
  menOf(list) { return list.reduce((t, r) => t + r.men, 0); },
  armyMen(a) { const g = this.armyGen(a); return this.menOf(a.regs) + (g ? this.genMen(g) : 0); },

  // ------------------، سجل الأحداث -------------------
  event(cat, text, o = {}) {
    const S = this.S;
    if (S.log.slice(-12).some((e) => e.turn === S.turn && e.text === text)) return;
    S.log.push({ turn: S.turn, cat, text, imp: o.imp || 1, fids: o.fids || [], node: o.node || null });
    if (S.log.length > 500) S.log.splice(0, S.log.length - 500);
  },
  // هل يعلم اللاعب بهذا الحدث؟ (ضباب الحرب)
  eventVisible(e) {
    const P = this.S.player;
    if (e.imp >= 3) return true;
    if (!e.fids.length) return true;
    if (e.fids.includes(P)) return true;
    if (e.fids.some((id) => id !== 'neutral' && this.f(id) && this.intelLevel(P, id) >= 2)) return true;
    if (e.node) {
      const mine = this.nodesOf(P).map((n) => n.id);
      if (mine.includes(e.node) || this.adjAll(e.node).some((x) => mine.includes(x))) return true;
    }
    return e.imp >= 2 && e.fids.some((id) => id !== 'neutral' && this.f(id) && this.intelLevel(P, id) >= 1);
  },

  // ------------------، التنبيهات العسكرية -------------------
  // level: crit | imp | info، للّاعب فقط. key يمنع التكرار ويستبدل القديم
  alert(level, text, o = {}) {
    const S = this.S;
    if (!S || !S.alerts) return;
    const ttl = { crit: 3, imp: 2, info: 1 }[level] || 1;
    const a = { id: S.aid++, turn: S.turn, level, text, node: o.node || null, army: o.army || null, icon: o.icon || null, key: o.key || null, cond: !!o.cond, until: S.turn + ttl, win: o.win || null, crisis: o.crisis || null };
    if (a.key) {
      const old = S.alerts.find((x) => x.key === a.key);
      if (old) { a.seen = old.seen && old.text === text; S.alerts.splice(S.alerts.indexOf(old), 1); }
    }
    S.alerts.push(a);
    if (S.alerts.length > 40) S.alerts.splice(0, S.alerts.length - 40);
    S.alertLog = S.alertLog || [];
    const last = S.alertLog[S.alertLog.length - 1];
    if (!(last && last.text === text && last.turn === S.turn)) S.alertLog.push({ turn: S.turn, level, text, node: a.node, icon: a.icon });
    if (S.alertLog.length > 120) S.alertLog.splice(0, S.alertLog.length - 120);
    return a;
  },
  activeAlerts() {
    const S = this.S;
    const rank = { crit: 3, imp: 2, info: 1 };
    return (S.alerts || []).filter((a) => !a.gone && a.until >= S.turn).sort((x, y) => (rank[y.level] - rank[x.level]) || (y.id - x.id));
  },
  dismissAlert(id) { const a = (this.S.alerts || []).find((x) => x.id === id); if (a) { a.gone = true; a.seen = true; } },
  // تنبيه لا يُغلق دفعة واحدة: قرار ينتظرك بمهلة، أو مدينتك تحت الحصار الآن
  alertKeeps(a) {
    const c = a.crisis && this.crisisById ? this.crisisById(a.crisis) : null;
    if (c && !c.over && c.ask && c.ask[this.S.player]) return true;
    return a.level === 'crit' && a.cond;
  },
  // سجل الأخبار: كل تنبيه وصلك، ليبقى مقروءاً بعد إغلاقه
  alertHistory() { return (this.S.alertLog || []).slice().reverse(); },
  // تنبيهات الحالة: تُعاد كل دور ما دام السبب قائماً
  scanAlerts() {
    const S = this.S, P = S.player;
    if (!S.alerts) return;
    for (const a of S.alerts) if (a.cond) a.stale = true;
    const mine = this.nodesOf(P);
    const mineIds = new Set(mine.map((n) => n.id));
    for (const n of mine) {
      const bs = this.besiegers(n.id).filter((b) => this.atWar(b.fid, P));
      if (bs.length) {
        const pw = bs.reduce((t, b) => t + this.armyPower(b), 0);
        const falling = n.stores <= 0 || this.defensePower(n) < pw * 0.45;
        this.alert(falling ? 'crit' : 'imp', falling ? `${n.name} قد تسقط قريباً: ${n.stores <= 0 ? 'المجاعة بدأت' : 'المحاصِرون أقوى بكثير'}` : `${n.name} محاصرة من ${this.fname(bs[0].fid)} · المؤن ${Math.max(0, n.stores)} أدوار`, { node: n.id, key: 'siege:' + n.id, cond: true, icon: 'tent', win: 'siege' });
      } else if (n.loyalty < 25 && n.unrest <= 0) {
        this.alert('imp', `${n.name} على حافة التمرد (الولاء ${n.loyalty})`, { node: n.id, key: 'revolt:' + n.id, cond: true, icon: 'torch' });
      }
      const ex = this.overstack(n, P);
      if (ex > 0) this.alert('info', `ازدحام في ${n.name}: الجيوش تتجاوز الإمداد بـ${ex} وحدات`, { node: n.id, key: 'over:' + n.id, cond: true, icon: 'cart' });
    }
    // جيوش معادية وصلت حديثاً إلى الحدود (مرة واحدة لكل وصول)
    S.lastPos = S.lastPos || {};
    const seen = {};
    for (const a of S.armies) {
      seen[a.id] = a.node;
      if (!this.atWar(a.fid, P) || a.fid === 'neutral' || a.siege) continue;
      if (S.lastPos[a.id] === a.node) continue;
      const border = mineIds.has(a.node) ? null : this.adjAll(a.node).find((x) => mineIds.has(x));
      if (!border) continue;
      const men = Game.armyMen(a);
      if (men < 150) continue;
      const lvl = this.intelLevel(P, a.fid) >= 2;
      const txt = `جيش ${this.fname(a.fid)} (${lvl ? men : '~' + Math.round(men / 100) * 100} رجل) على حدود ${this.node(border).name}`;
      const strong = this.armyPower(a) > this.defensePower(this.node(border));
      this.alert(strong ? 'imp' : 'info', txt, { node: a.node, key: 'border:' + a.id, icon: 'swords' });
    }
    S.lastPos = seen;
    for (const a of S.alerts) if (a.cond && a.stale) a.gone = true;
    S.alerts = S.alerts.filter((a) => !(a.gone && a.turn < S.turn - 1));
  },
  // السجل التاريخي: أهم لحظات الحملة (للّاعب وللعالم)
  chronicle(kind, text, o = {}) {
    const S = this.S;
    if (!S || !S.chron) return null;
    const e = { turn: S.turn, kind, text, fids: o.fids || [], node: o.node || null, imp: o.imp || 2, icon: o.icon || CHRON_ICON[kind] || 'scroll', story: o.story || null };
    if (S.chron.slice(-8).some((x) => x.turn === e.turn && x.text === e.text)) return null;
    S.chron.push(e);
    if (S.chron.length > 400) S.chron.splice(0, S.chron.length - 400);
    return e;
  },
  addScar(node, kind, extra) {
    const S = this.S;
    if (!S.scars) S.scars = [];
    S.scars.push({ node, kind, turn: S.turn, ...(extra || {}) });
    if (S.scars.length > 80) S.scars.splice(0, S.scars.length - 80);
  },
  scarsAt(node, maxAge = 6) { return (this.S.scars || []).filter((x) => x.node === node && this.S.turn - x.turn <= maxAge); },

  // ------------------، القادة -------------------
  addGeneral(fid, name, trait, flaw, rank = 1) {
    const g = { id: 'g' + this.S.nextId++, name, fid, orig: fid, trait: trait || null, flaw: flaw || null, rank: rank || 1, xp: RANK_XP[rank || 1], status: 'pool', army: null, captor: null, since: this.S.turn, vendetta: null };
    this.S.gens[g.id] = g;
    return g;
  },
  officer(fid) {
    return this.addGeneral(fid, 'الضابط ' + pick(GENERIC_NAMES), null, R() < 0.25 ? pick(['cautious', 'greedy', 'reckless']) : null, 1);
  },
  genMen(g) { return 12 + 4 * g.rank; },
  // ما تعنيه النجوم فعلاً: قدرات قيادة معلنة لا مضاعف قوة خفي. كل نجمة بعد الأولى تمنح ثلاث نقاط
  genSkills(g) {
    if (!g) return { coh: 0, exe: 0, res: 0, ret: 0 };
    if (g.skills) return g.skills;
    const r = g.rank || 1;
    return { coh: r - 1, exe: r - 1, res: r >= 2 ? 1 : 0, ret: r >= 3 ? 1 : 0 };
  },
  genSalary(g) { return (4 + 4 * g.rank) * (g.flaw === 'greedy' ? 2 : 1); },
  hireFee(g) { return g.name.startsWith('الضابط') ? 40 : 50 + 40 * g.rank; },
  genTitle(g) { return g ? `${g.name} ${'★'.repeat(g.rank)}` : 'بلا قائد'; },
  mpMax(a) {
    const g = this.armyGen(a);
    let m = BASE_MP;
    if (g && g.trait === 'swift') m += 2;
    if (g && g.flaw === 'cautious') m -= 1;
    if (a.mood && a.mood.k === 'shaken') m -= 1;
    return Math.max(2, m);
  },
  gainXp(g, v) {
    if (!g || g.status === 'dead') return;
    g.xp += v;
    while (g.rank < 3 && g.xp >= RANK_XP[g.rank + 1]) {
      g.rank++;
      this.event('int', `ارتقى القائد ${g.name} إلى رتبة ${'★'.repeat(g.rank)} (${this.fname(g.fid)}).`, { fids: [g.fid], imp: g.fid === this.S.player ? 2 : 1 });
    }
  },

  // ------------------، الجيوش -------------------
  newReg(type, men, extra) { return { type, men: men == null ? UNITS[type].men : men, exp: 0, ...(extra || {}) }; },

  createArmy(fid, nodeId, genId) {
    let g = this.gen(genId);
    if (!g || g.status !== 'pool' || g.fid !== fid) g = this.poolOf(fid).sort((a, b) => b.rank - a.rank)[0] || this.officer(fid);
    const a = { id: this.S.nextId++, fid, node: nodeId, from: nodeId, gen: g.id, regs: [], mp: 0, siege: null, mood: null };
    g.status = 'army'; g.army = a.id;
    this.S.armies.push(a);
    a.mp = this.mpMax(a);
    return a;
  },

  // تعيين قائد جديد في مدينة (جيش فارغ يمكن تجنيده أو نقل وحدات إليه)
  canHire(fid, g, node) {
    if (!node || node.owner !== fid) return 'ليست مدينتك';
    if (!g || g.status !== 'pool' || g.fid !== fid) return 'القائد غير متاح';
    if (this.f(fid).gold < this.hireFee(g)) return 'الذهب لا يكفي';
    return null;
  },
  hire(fid, genId, nodeId) {
    const g = this.gen(genId), n = this.node(nodeId);
    const err = this.canHire(fid, g, n);
    if (err) return { err };
    this.f(fid).gold -= this.hireFee(g);
    const a = this.createArmy(fid, nodeId, g.id);
    this.event('int', `عُيّن ${g.name} قائداً لجيش جديد في ${n.name}.`, { fids: [fid], node: n.id, imp: 1 });
    return { army: a };
  },

  removeArmy(a, genFate) {
    const i = this.S.armies.indexOf(a);
    if (i >= 0) this.S.armies.splice(i, 1);
    const g = this.armyGen(a);
    if (g && g.status === 'army') {
      if (genFate) this.setGenFate(g, genFate.fate, genFate.captor);
      else { g.status = 'pool'; g.army = null; }
    }
  },

  setGenFate(g, fate, captor) {
    g.army = null;
    if (fate === 'captured') {
      g.status = 'captive'; g.captor = captor; g.since = this.S.turn;
      this.event('mil', `أُسر القائد ${g.name} (${this.fname(g.fid)}) بيد ${this.fname(captor)}.`, { fids: [g.fid, captor], imp: 3 });
      if (g.fid === this.S.player) this.alert('imp', `أُسر قائدك ${g.name} بيد ${this.fname(captor)}`, { icon: 'chains' });
      if (captor === this.S.player) this.alert('info', `أسرتَ ${g.name}، قرّر مصيره من شاشة المملكة`, { icon: 'chains', win: 'captives' });
    } else if (fate === 'killed') {
      g.status = 'dead';
      g.diedTurn = this.S.turn;
      if (g.rank >= 2 || g.fid === this.S.player) this.chronicle('death', `سقط القائد ${g.name} (${this.fname(g.fid)}) في ساحة القتال.`, { fids: [g.fid], imp: g.rank >= 3 ? 3 : 2 });
      this.event('mil', `قُتل القائد ${g.name} (${this.fname(g.fid)}) في المعركة.`, { fids: [g.fid], imp: g.rank >= 2 ? 3 : 2 });
      if (g.fid === this.S.player) this.alert(g.rank >= 2 ? 'crit' : 'imp', `قُتل قائدك ${g.name} في المعركة`, { icon: 'skull' });
    } else { g.status = 'pool'; }
  },

  // فصل جزء من الجيش. picks: [{idx, men}] ، dest: {kind:'new', genId} | {kind:'army', armyId}
  splitArmy(a, picks, dest) {
    const moving = [];
    for (const p of picks) {
      const r = a.regs[p.idx];
      if (!r) continue;
      const men = Math.round(clamp(p.men, 0, r.men));
      if (men < 5) continue;
      if (r.men - men < 5) moving.push({ r, whole: true });
      else moving.push({ r, men });
    }
    if (!moving.length) return { err: 'لم تختر أي جنود' };
    let target;
    if (dest.kind === 'army') {
      target = this.army(dest.armyId);
      if (!target || target.fid !== a.fid || target.node !== a.node || !!target.siege !== !!a.siege) return { err: 'الجيش الآخر ليس هنا' };
    } else {
      const g = this.gen(dest.genId);
      const n = this.node(a.node);
      if (g && g.status === 'pool') {
        if (this.f(a.fid).gold < this.hireFee(g)) return { err: 'الذهب لا يكفي لتعيين القائد' };
      } else if (!dest.officer) return { err: 'اختر قائداً للقوة الجديدة' };
      const fee = g && g.status === 'pool' ? this.hireFee(g) : 40;
      if (this.f(a.fid).gold < fee) return { err: 'الذهب لا يكفي لتعيين القائد' };
      this.f(a.fid).gold -= fee;
      target = this.createArmy(a.fid, a.node, g && g.status === 'pool' ? g.id : this.officer(a.fid).id);
      target.siege = a.siege ? { ...a.siege } : null;
      target.from = a.from;
      void n;
    }
    const newRegs = moving.length + (target.regs.length);
    if (newRegs > MAX_REGS) return { err: `القائد يقود 8 وحدات على الأكثر (${newRegs})` };
    for (const m of moving) {
      if (m.whole) { a.regs.splice(a.regs.indexOf(m.r), 1); target.regs.push(m.r); }
      else { m.r.men -= m.men; target.regs.push({ ...m.r, men: m.men, rid: this.rid ? this.rid() : undefined }); }
    }
    target.mp = Math.min(target.mp, a.mp);
    return { army: target };
  },

  mergeInto(src, dst) {
    if (src.fid !== dst.fid || src.node !== dst.node) return 'ليسا في المكان نفسه';
    const room = MAX_REGS - dst.regs.length;
    if (room <= 0) return 'الجيش الآخر مكتمل';
    dst.regs.push(...src.regs.splice(0, room));
    dst.mp = Math.min(dst.mp, src.mp);
    if (!src.regs.length) this.removeArmy(src);
    return null;
  },

  // ------------------، القوة -------------------
  regPower(r) {
    const d = UNITS[r.type];
    return r.men * d.hp * (d.atk + d.def + (d.missile || 0) * 1.5 + (d.charge || 0) * 0.3) * (1 + 0.1 * (r.exp || 0)) / 100;
  },
  genPower(g) { return g ? this.regPower({ type: 'general', men: this.genMen(g) }) : 0; },
  armyPower(a) {
    if (!a) return 0;
    return a.regs.reduce((t, r) => t + this.regPower(r), 0) + this.genPower(this.armyGen(a));
  },
  garrisonPower(n) { return n.garrison.reduce((t, r) => t + this.regPower(r), 0); },
  defensePower(n) { return this.garrisonPower(n) + this.defendersOf(n).reduce((t, a) => t + this.armyPower(a), 0); },
  factionPower(fid) {
    let p = 0;
    for (const a of this.armiesOf(fid)) p += this.armyPower(a);
    for (const n of this.nodesOf(fid)) p += this.garrisonPower(n) * 0.5;
    return p + Math.max(0, this.f(fid).gold) / 10;
  },

  // ------------------، الحامية والقوى البشرية -------------------
  // الحامية تكبر مع السكان والأسوار، المدن لا تسقط بلا جيش كبير أو حصار طويل
  garrisonTarget(n) {
    const out = [];
    const militia = 1 + Math.floor(n.pop / 12000) + (n.walls >= 3 ? 1 : 0);
    for (let i = 0; i < militia; i++) out.push('militia');
    for (let i = 1; i < Math.min(4, n.walls + 1); i++) out.push('archer');
    if (n.pop > 20000 || n.capital) out.push('spear');
    // النفير العام: مملكة على حافة السقوط تحشد كل رجل
    const f = this.f(n.owner);
    if (f && !f.neutral && this.lastStand(n.owner)) out.push('militia', 'militia');
    return out;
  },
  fillGarrison(n, full) {
    const target = this.garrisonTarget(n);
    if (!full && this.opGarrisonBlocked && this.opGarrisonBlocked(n)) return;
    const g = this.defendersOf(n).map((a) => this.armyGen(a));
    const fast = g.some((x) => x && x.trait === 'defender') ? 2 : 1;
    for (let i = 0; i < target.length; i++) {
      const t = target[i];
      const max = UNITS[t].men;
      if (!n.garrison[i] || n.garrison[i].type !== t) n.garrison[i] = this.newReg(t, full ? max : 0);
      if (full) { n.garrison[i].men = max; continue; }
      if (n.unrest > 0 && n.owner !== 'neutral') continue;
      const want = Math.min(max - n.garrison[i].men, Math.round(max * 0.1 * fast));
      const take = n.owner === 'neutral' ? want : Math.min(want, Math.floor(n.manpower));
      n.garrison[i].men += take;
      if (n.owner !== 'neutral') n.manpower -= take;
    }
    n.garrison.length = target.length;
  },
  lastStand(fid) { const c = this.nodesOf(fid).length; return c > 0 && c <= 3; },
  mpCap(n) { return Math.round(n.pop * 0.02 + n.farm * 50); },
  mpRegen(n) {
    if (this.besieger(n.id)) return 0;
    let r = n.pop * 0.0021 + n.farm * 12;
    if (n.unrest > 0) r *= 0.3;
    if (n.loyalty < 40) r *= 0.6;
    if (n.owner !== 'neutral' && this.lastStand(n.owner)) r *= 2;
    if (this.nodeMods) r *= this.nodeMods(n).mp;
    if (this.policyMod && n.owner !== 'neutral') r *= 1 + this.policyMod(n.owner, 'mp');
    return Math.round(r);
  },
  manpowerOf(fid) { return this.nodesOf(fid).reduce((t, n) => t + Math.floor(n.manpower), 0); },

  // ------------------، الإمداد والازدحام -------------------
  supplyCap(n, fid) {
    let c;
    if (this.friendly(n.owner, fid)) c = 8 + n.farm * 2 + n.granary * 3 + Math.floor(n.pop / 10000);
    else c = 6 + ({ plains: 2, river: 2, coast: 1, desert: -3, mountains: -2, hills: 0, forest: 0 }[n.terrain] || 0);
    if (this.isWinter()) c -= 2;
    return Math.max(3, c);
  },
  stackAt(n, fid) {
    let s = 0;
    for (const a of this.armiesAt(n.id)) {
      if (!this.friendly(a.fid, fid)) continue;
      if (this.friendly(n.owner, fid) ? a.siege : !a.siege) continue;
      s += a.regs.length * (this.hasTrait(a, 'logistician') ? 0.5 : 1);
    }
    return Math.round(s);
  },
  overstack(n, fid) { return Math.max(0, this.stackAt(n, fid) - this.supplyCap(n, fid)); },

  // ------------------، الاقتصاد -------------------
  merchantAt(n) { return this.armiesOfAt(n.owner, n.id).some((a) => this.hasTrait(a, 'merchant')); },
  cityIncome(n) { return this.incomeModel(n).total; },
  // نسبة الولاء إلى الدخل: الولاء 100 = 100٪، والولاء 0 = 40٪
  loyaltyIncomeFactor(loy) { return 0.4 + 0.6 * clamp(loy, 0, 100) / 100; },
  // الهدر الإداري: كل مدينة بعد الثامنة تُضيع 3٪ من دخل كل مدينة (حتى 40٪). الحاكم المقيم يخفّضه للنصف في مدينته
  adminWaste(n, count) {
    const cities = count != null ? count : this.nodesOf(n.owner).length;
    let w = Math.min(0.4, 0.03 * Math.max(0, cities - 8));
    if (w > 0 && this.governorAt(n)) w *= 0.5;
    return w;
  },
  // نموذج الدخل الوحيد: الحساب والشرح من المصدر نفسه، بالترتيب الذي تُطبَّق به النسب
  // o.ignoreSiege / o.ignoreUnrest: العائد المتوقع بعد زوال العائق. o.patch: تغييرات افتراضية على المدينة (للمعاينة)
  incomeModel(n0, o = {}) {
    const n = o.patch ? { ...n0, ...o.patch } : n0;
    const steps = [];
    const res = (total, blocked) => ({ total: Math.round(total), steps, blocked: blocked || null });
    if (n.owner === 'neutral') return res(0);
    if (this.besieger(n.id) && !o.ignoreSiege) return res(0, 'siege');
    const f = this.f(n.owner);
    let g = n.pop / 1000 * 2.8;
    steps.push({ k: 'pop', label: `السكان (${Math.round(n.pop / 1000)} ألفاً)`, add: g });
    const mul = (k, label, m, note) => { if (Math.abs(m - 1) < 1e-9) return; const before = g; g *= m; steps.push({ k, label, mul: m, add: g - before, note }); };
    mul('market', `الأسواق (مستوى ${n.market})`, 1 + 0.4 * n.market);
    const lf = this.loyaltyIncomeFactor(n.loyalty);
    mul('loyalty', `أثر الولاء ${n.loyalty}: تحصل على ${Math.round(lf * 100)}٪`, lf);
    if (n.capital) { steps.push({ k: 'capital', label: 'العاصمة', add: 15 }); g += 15; }
    mul('tax', `الضرائب ${TAXES[f.tax].name}`, TAXES[f.tax].income);
    if (n.unrest > 0 && !o.ignoreUnrest) mul('unrest', `اضطراب (${n.unrest} أدوار)`, 0.4);
    if (this.merchantAt(n) || this.governorOf(n, 'merchant')) mul('admin', 'إداري مقيم', 1.3);
    const ov = this.overstack(n, n.owner);
    if (ov > 0) mul('crowd', `ازدحام الجيوش (${ov} وحدات فوق الإمداد)`, Math.max(0.5, 1 - 0.05 * ov));
    const waste = this.adminWaste(n, o.cities);
    if (waste > 0) mul('waste', `هدر إداري: مملكة من ${o.cities != null ? o.cities : this.nodesOf(n.owner).length} مدن`, 1 - waste);
    if (this.nodeMods) {
      const m = this.nodeMods(n);
      if (n.charter) mul('charter', 'ميثاق المدينة الحرة', 0.65);
      const crisis = n.charter ? m.inc / 0.65 : m.inc;
      if (Math.abs(crisis - 1) > 1e-6) mul('crisis', 'أحداث العالم (وباء أو قحط أو حجر)', crisis);
      const rm = this.rulerMod(n.owner, 'income'), pm = this.policyMod ? this.policyMod(n.owner, 'income') : 0;
      if (rm) mul('ruler', 'سمة الحاكم', 1 + rm);
      if (pm) mul('policy', 'المرسوم الملكي', 1 + pm);
    }
    if (this.opIncome) mul('sabotage', 'سوق مخرَّب', this.opIncome(n));
    return res(g);
  },
  // تفصيل الدخل للواجهة: كل سطر بقيمته بالذهب، ومجموع الأسطر يساوي الصافي تماماً
  incomeParts(n) {
    const m = this.incomeModel(n);
    if (m.blocked === 'siege') {
      const pot = this.incomeModel(n, { ignoreSiege: true }).total;
      return { total: 0, lines: [['محاصرة: لا يصل الذهب', '0', 'neg'], ['بعد رفع الحصار', '+' + pot, 'pos'], ['الصافي الآن', '0', 'sum']] };
    }
    const lines = [];
    let run = 0, shown = 0;
    for (const s of m.steps) {
      run += s.add;
      const d = Math.round(run) - shown;
      shown += d;
      const pct = s.mul != null ? ` (${s.mul >= 1 ? '+' : '−'}${Math.round(Math.abs(s.mul - 1) * 100)}٪)` : '';
      lines.push([s.label + pct, signed(d), d > 0 ? 'pos' : d < 0 ? 'neg' : '']);
    }
    lines.push(['الصافي كل دور', '+' + m.total, 'sum']);
    if (n.unrest > 0) lines.push([`بعد الاستقرار (${n.unrest} أدوار)`, '+' + this.incomeModel(n, { ignoreUnrest: true }).total, 'pos']);
    return { total: m.total, lines };
  },
  // هدف الولاء الذي تتجه إليه المدينة كل دور، مع أسبابه
  loyaltyTarget(n) {
    const S = this.S;
    const f = this.f(n.owner);
    const parts = [['الأساس', 68]];
    if (n.capital) parts.push(['العاصمة', 10]);
    const here = this.armiesOfAt(n.owner, n.id);
    if (here.length) parts.push(['جيش مقيم', 8]);
    if (n.market) parts.push(['الأسواق', n.market * 2]);
    if (TAXES[f.tax].loyalty) parts.push(['الضرائب', TAXES[f.tax].loyalty]);
    if (n.origOwner !== n.owner && S.turn - n.capturedTurn < 10) parts.push(['احتلال حديث', -25]);
    if (n.origOwner !== n.owner && this.f(n.origOwner) && this.f(n.origOwner).alive && this.f(n.origOwner).vendetta && this.f(n.origOwner).vendetta[n.owner]) parts.push(['ثأر أهلها القدامى', -8]);
    if (f.gold < 0) parts.push(['خزينة فارغة', -10]);
    const size = this.nodesOf(n.owner).length;
    if (size > 7) parts.push(['اتساع المملكة', -Math.round((size - 7) * 2.5)]);
    const d = this.capitalDist(n);
    if (d > 3) parts.push(['البعد عن العاصمة', -Math.min(12, (d - 3) * 3)]);
    if (here.some((a) => this.hasFlaw(a, 'harsh'))) parts.push(['قائد قاسٍ', -8]);
    const gov = this.governorAt(n);
    if (gov) {
      parts.push(['حاكم مقيم', 4]);
      if (gov.trait === 'merchant' || gov.trait === 'defender') parts.push(['حاكم ' + TRAITS[gov.trait].name, 5]);
      if (gov.flaw === 'harsh') parts.push(['حاكم قاسٍ', -8]);
    }
    if (this.policyMod) { const pm = this.policyMod(n.owner, 'loyalty'); if (pm) parts.push(['سياسة المملكة', pm]); }
    if (this.opLoyalty) { const ol = this.opLoyalty(n); if (ol) parts.push(['محرّضون أجانب', ol]); }
    if (this.nodeMods) {
      for (const pl of this.nodeMods(n).loy) parts.push(pl);
      const rl = this.rulerMod(n.owner, 'loyalty');
      if (rl) parts.push(['الحاكم', rl]);
    }
    const target = parts.reduce((t, p) => t + p[1], 0);
    return { target: Math.round(target), parts };
  },
  capitalDist(n) {
    const cap = this.nodesOf(n.owner).find((x) => x.capital);
    if (!cap) return 0;
    return this.hops(cap.id, n.id, 8);
  },
  governorAt(n) { return Object.values(this.S.gens).find((g) => g.status === 'gov' && g.city === n.id && g.fid === n.owner) || null; },
  governorOf(n, trait) { const g = this.governorAt(n); return g && g.trait === trait ? g : null; },
  cityFood(n) {
    if (this.besieger(n.id)) return 0;
    let f = 5 + n.farm * 6 + n.pop / 8000;
    if (n.unrest > 0) f *= 0.5;
    if (this.nodeMods) f *= this.nodeMods(n).food;
    return Math.round(f);
  },
  armyEat(a) {
    const n = this.node(a.node);
    let e = a.regs.reduce((t, r) => t + (UNITS[r.type].cls === 'cav' ? 2 : 1), 0) + 1;
    if (!this.friendly(n.owner, a.fid)) e *= 1.5;
    if (n.terrain === 'desert' && !this.hasTrait(a, 'desert')) e *= 1.5;
    if (this.isWinter()) e *= 1.2;
    if (this.hasTrait(a, 'logistician')) e *= 0.5;
    if (this.rulerMod) e *= 1 + this.rulerMod(a.fid, 'eat');
    return e;
  },
  tradeIncome(fid) {
    let t = 0;
    const f = this.f(fid);
    for (const other in f.treaty) {
      if (!f.treaty[other] || !f.treaty[other].trade || !this.f(other) || !this.f(other).alive) continue;
      const mk = (x) => this.nodesOf(x).reduce((s, n) => s + n.market + n.roads + (n.port || 0) * 2, 0);
      t += Math.min(70, 12 + (mk(fid) + mk(other)) * 5);
    }
    return Math.round(t);
  },
  // صيانة مباني المدينة كل دور
  worksUpkeep(n) { let t = 0; for (const k in BUILDINGS) t += BUILDINGS[k].upkeep ? BUILDINGS[k].upkeep(n[k] || 0) : 0; return t; },
  // الجيش خارج الأرض الصديقة أو يحاصر: تموين الحملة يرفع كلفته ثلثاً
  onCampaign(a) { const n = this.node(a.node); return !!a.siege || !this.friendly(n.owner, a.fid); },
  economy(fid) {
    let gold = 0, food = 0, upkeep = 0, eat = 0, salaries = 0, overhead = 0, works = 0, field = 0;
    const f = this.f(fid);
    for (const n of this.nodesOf(fid)) { gold += this.cityIncome(n); food += this.cityFood(n); works += this.worksUpkeep(n); }
    const armies = this.armiesOf(fid);
    for (const a of armies) {
      const g = this.armyGen(a);
      if (g) salaries += this.genSalary(g);
      const camp = this.onCampaign(a);
      for (const r of a.regs) { const u = (UNITS[r.type].upkeep || 0) * (r.merc ? 1.8 : 1); upkeep += u; if (camp) field += u * 0.35; }
      eat += this.armyEat(a);
    }
    const cities = this.nodesOf(fid).length;
    overhead = Math.max(0, armies.length - Math.max(2, cities)) * 10;
    if (!f.isPlayer && fid !== 'neutral') gold = Math.round(gold * DIFFS[this.S.difficulty].aiIncome);
    // الغزاة يعيشون على النهب: لا رواتب ولا مؤن
    if (f.horde) { upkeep = 0; eat = 0; salaries = 0; overhead = 0; works = 0; field = 0; }
    const route = this.routeIncome ? this.routeIncome(fid) : 0;
    const trade = Math.round((this.tradeIncome(fid) + route) * (1 + (this.policyMod ? this.policyMod(fid, 'trade') : 0)));
    for (const g of this.gensOf(fid)) if (g.status === 'gov') salaries += this.genSalary(g);
    let tribute = 0;
    for (const t of this.S.tributes) { if (t.payee === fid) tribute += t.amount; if (t.payer === fid) tribute -= t.amount; }
    upkeep = Math.round(upkeep);
    field = Math.round(field);
    eat = Math.round(eat);
    const netGold = gold + trade + tribute - upkeep - field - salaries - overhead - works;
    return { gold, trade, route, tribute, upkeep, field, works, salaries, overhead, food, eat, netGold, netFood: food - eat };
  },

  // ------------------، التجنيد والبناء -------------------
  recruitableTypes(fid, node) {
    const list = [...RECRUITABLE];
    const u = UNIQUE_OF[fid];
    if (u && this.armiesOfAt(fid, node.id).some((a) => this.hasTrait(a, 'elite'))) list.push(u);
    return list;
  },
  targetArmy(fid, node, armyId) {
    if (armyId) { const a = this.army(armyId); return a && a.fid === fid && a.node === node.id && !a.siege ? a : null; }
    return this.armiesOfAt(fid, node.id).filter((a) => a.regs.length < MAX_REGS).sort((x, y) => y.regs.length - x.regs.length)[0] || null;
  },
  recruitCost(type, merc) { return Math.round(UNITS[type].cost * (merc ? 1.7 : 1)); },
  canRecruit(fid, node, type, armyId, merc) {
    const d = UNITS[type];
    if (node.owner !== fid) return 'ليست مدينتك';
    // الحصار يقطع ما يأتي من الخارج فقط: رجال المدينة وورشها ما زالوا في الداخل
    if (merc && this.besieger(node.id)) return 'المرتزقة يأتون من خارج الأسوار، والحصار يقطع طريقهم';
    if (!merc) {
      if (node.unrest > 0) return `غير مستقرة (${node.unrest} أدوار): المرتزقة فقط`;
      if (node.loyalty < 30) return 'الولاء منخفض جداً';
      if (d.needs === 'barracks' && !node.barracks) return 'تحتاج إسطبلات وورش';
      if (d.unique && !this.recruitableTypes(fid, node).includes(type)) return 'يحتاج قائد نخبة هنا';
      if (node.manpower < d.men) return `القوى البشرية لا تكفي (${Math.floor(node.manpower)}/${d.men})`;
    }
    const a = this.targetArmy(fid, node, armyId);
    if (!a) return 'لا قائد هنا لديه مكان: عيّن قائداً';
    if (a.regs.length >= MAX_REGS) return 'الجيش مكتمل (8 وحدات)';
    if (this.f(fid).gold < this.recruitCost(type, merc)) return 'الذهب لا يكفي';
    return null;
  },
  recruit(fid, node, type, armyId) {
    const err = this.canRecruit(fid, node, type, armyId, false);
    if (err) return err;
    const a = this.targetArmy(fid, node, armyId);
    a.regs.push(this.newReg(type, null, this.hasTrait(a, 'elite') && UNITS[type].unique ? { exp: 1 } : null));
    this.f(fid).gold -= this.recruitCost(type);
    node.manpower -= UNITS[type].men;
    return null;
  },
  refreshMercs(fid) {
    const f = this.f(fid);
    if (!f || f.neutral) return;
    const pool = ['spear', 'sword', 'archer', 'horsearcher', 'cavalry', 'sword', 'archer'];
    f.mercs = [];
    const n = 2 + (R() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) f.mercs.push({ type: pick(pool), exp: 1 + (R() < 0.3 ? 1 : 0) });
  },
  hireMerc(fid, node, idx, armyId) {
    const f = this.f(fid), m = f.mercs[idx];
    if (!m) return 'العرض غير متاح';
    const err = this.canRecruit(fid, node, m.type, armyId, true);
    if (err) return err;
    const a = this.targetArmy(fid, node, armyId);
    a.regs.push(this.newReg(m.type, null, { exp: m.exp, merc: true }));
    f.gold -= this.recruitCost(m.type, true);
    f.mercs.splice(idx, 1);
    return null;
  },
  hasWater(node) { return this.edgesOf(node.id).some((e) => e.kind === 'water'); },
  canBuild(fid, node, b) {
    const lvl = node[b] || 0, B = BUILDINGS[b];
    if (node.owner !== fid) return 'ليست مدينتك';
    if (B.coastal && !this.hasWater(node)) return 'لا طريق مائياً من هنا';
    if (lvl >= B.max) return 'بلغت الحد الأعلى';
    if (this.besieger(node.id)) return 'البناء يحتاج حجارة وخشباً وعمالاً من خارج الأسوار، والحصار يقطعها';
    if (node.unrest > 0) return 'غير مستقرة';
    if (node.built === this.S.turn) return 'بناء واحد لكل دور';
    if (this.f(fid).gold < B.cost(lvl)) return 'الذهب لا يكفي';
    return null;
  },
  build(fid, node, b) {
    const err = this.canBuild(fid, node, b);
    if (err) return err;
    const lvl = node[b] || 0;
    this.f(fid).gold -= BUILDINGS[b].cost(lvl);
    node[b] = lvl + 1;
    node.built = this.S.turn;
    if (b === 'walls' || b === 'granary') node.stores = Math.max(node.stores, this.storesMax(node));
    const imp = b === 'walls' ? 2 : node[b] >= 2 ? 1 : 1;
    this.event('eco', `${this.fname(fid)} ${b === 'walls' ? 'ترفع تحصين' : 'تطوّر'} ${node.name}: ${BUILDINGS[b].name} ${node[b]}.`, { fids: [fid], node: node.id, imp: fid === this.S.player ? 1 : imp });
    return null;
  },
  storesMax(n) { return 3 + n.walls + n.farm + n.granary * 3; },
  festivalCost(n) { return Math.round(60 + n.pop / 350); },
  canFestival(fid, n) {
    if (n.owner !== fid) return 'ليست مدينتك';
    if (this.S.turn - n.festival < 4) return 'أقيم احتفال مؤخراً';
    if (this.f(fid).gold < this.festivalCost(n)) return 'الذهب لا يكفي';
    return null;
  },
  festival(fid, n) {
    const err = this.canFestival(fid, n);
    if (err) return err;
    this.f(fid).gold -= this.festivalCost(n);
    n.festival = this.S.turn;
    n.loyalty = Math.min(100, n.loyalty + 20);
    if (n.unrest > 0) n.unrest--;
    this.event('int', `احتفالات وعطايا في ${n.name} ترفع رضا الأهالي.`, { fids: [fid], node: n.id });
    return null;
  },
  canTrain(a) {
    const n = this.node(a.node);
    if (a.siege || n.owner !== a.fid) return 'التدريب في مدنك فقط: المحاصِرون في الميدان';
    if (!n.barracks) return `يحتاج إسطبلات وورشاً في ${n.name}`;
    if (a.training) return 'يتدرّب الجيش هذا الدور';
    if (a.mp < this.mpMax(a)) return 'تحرّك الجيش هذا الدور: التدريب يحتاج دوراً كاملاً بلا حركة';
    if (!a.regs.length) return 'لا وحدات';
    if (!a.regs.some((r) => (r.exp || 0) < 3)) return 'كل الوحدات بلغت أعلى خبرة';
    if (this.f(a.fid).gold < this.trainCost(a)) return `الذهب لا يكفي (${this.trainCost(a)})`;
    return null;
  },
  trainCost(a) { return a.regs.length * 15; },
  train(a) {
    const err = this.canTrain(a);
    if (err) return err;
    this.f(a.fid).gold -= this.trainCost(a);
    this.spendMp(a, 'train'); a.training = true;
    return null;
  },
  // ما يعود من التسريح: في مدينتك يعود 70٪ من الرجال إلى قواها البشرية، وخارجها يعودون إلى قراهم فلا يُسترد شيء
  disbandRefund(a, r) {
    const n = this.node(a.node);
    if (!r || r.merc || n.owner !== a.fid || a.siege) return 0;
    return Math.min(Math.max(0, this.mpCap(n) - n.manpower), Math.round(r.men * 0.7));
  },
  disband(a, idx) {
    const r = a.regs[idx];
    if (!r) return 'لا وحدة';
    const back = this.disbandRefund(a, r);
    a.regs.splice(idx, 1);
    const n = this.node(a.node);
    if (back) n.manpower += back;
    this.event('int', `سُرّحت ${UNITS[r.type].name} (${r.men} رجل)${back ? `: عاد ${back} رجل إلى ${n.name}` : ''}.`, { fids: [a.fid], node: n.id, imp: 1 });
    return null;
  },
  dismissGeneral(a) {
    if (a.regs.length) return 'انقل الوحدات أولاً';
    this.removeArmy(a);
    return null;
  },

  // ------------------، الحركة -------------------
  edgeCost(a, from, to, kind) {
    const g = this.armyGen(a);
    const tr = g && g.trait;
    if (kind === 'water') return tr === 'naval' || (from.port && this.friendly(from.owner, a.fid)) ? 3 : Infinity;
    let c;
    if (kind === 'pass') c = tr === 'mountaineer' ? 2 : 4;
    else {
      c = TERRAIN[to.terrain].mp;
      if (tr === 'mountaineer' && (to.terrain === 'hills' || to.terrain === 'mountains')) c = 2;
      if (tr === 'desert' && to.terrain === 'desert') c = 2;
    }
    if ((from.roads && this.friendly(from.owner, a.fid)) || (to.roads && this.friendly(to.owner, a.fid))) c -= 1;
    if (this.isWinter() && (kind === 'pass' || to.terrain === 'mountains') && tr !== 'mountaineer') c += 1;
    return Math.max(1, c);
  },

  // عقد يمكن المرور عبرها (مدن صديقة غير محاصرة)
  passable(a, n) {
    if (!this.friendly(n.owner, a.fid)) return false;
    return !this.besiegers(n.id).some((b) => this.atWar(b.fid, a.fid));
  },

  // البحث عن كل الوجهات الممكنة هذا الدور (ديكسترا)
  reach(a) {
    const out = {};
    if (!a || a.mp <= 0) return out;
    const full = a.mp >= this.mpMax(a);
    const start = this.node(a.node);
    if (a.siege || !this.passable(a, start)) {
      // من موقع الحصار أو من مدينة محاصرة: خطوة واحدة فقط
      if (a.siege) {
        for (const e of this.edgesOf(a.node)) {
          const to = this.node(e.to);
          const c = this.edgeCost(a, start, to, e.kind);
          if (c <= a.mp || (full && c < Infinity)) out[to.id] = { cost: Math.min(c, a.mp), path: [to.id] };
        }
      }
      return out;
    }
    const dist = { [start.id]: 0 }, prev = {};
    const open = [start.id];
    while (open.length) {
      open.sort((x, y) => dist[x] - dist[y]);
      const cur = open.shift();
      const cn = this.node(cur);
      if (cur !== start.id && !this.passable(a, cn)) continue;
      for (const e of this.edgesOf(cur)) {
        const to = this.node(e.to);
        const c = this.edgeCost(a, cn, to, e.kind);
        if (c === Infinity) continue;
        const nd = dist[cur] + c;
        const firstStep = cur === start.id && full;
        if (nd > a.mp && !firstStep) continue;
        if (dist[to.id] !== undefined && dist[to.id] <= nd) continue;
        dist[to.id] = nd; prev[to.id] = cur;
        open.push(to.id);
      }
    }
    for (const id in dist) {
      if (id === start.id) continue;
      const path = [];
      for (let c = id; c !== start.id; c = prev[c]) path.unshift(c);
      out[id] = { cost: Math.min(dist[id], a.mp), path };
    }
    return out;
  },
  moveTargets(a) { return Object.keys(this.reach(a)); },
  // سبب توقف الحركة (يُحفظ ليُشرح للاعب)
  spendMp(a, why) { a.mp = 0; a.mpWhy = why; },
  // لماذا لا يبلغ الجيش هذه المدينة؟ سبب محدد وما يلزم لتجاوزه، القواعد نفسها التي تحسب الحركة
  moveBlocker(a, targetId) {
    const n = this.node(targetId), here = this.node(a.node);
    if (!n || !here) return 'وجهة غير معروفة';
    if (!a.regs.length) return 'القائد بلا جنود: جنّد وحدات أو انقل إليه وحدات أولاً.';
    if (a.mp <= 0) {
      const why = { battle: 'خاض الجيش معركة هذا الدور', siege: 'بدأ الجيش حصاراً هذا الدور', capture: 'دخل الجيش مدينة فتحها هذا الدور ويثبّت الفتح', train: 'الجيش في التدريب هذا الدور', rearm: 'الجيش يعيد تسليح وحداته هذا الدور', move: 'استنفد الجيش حركته' }[a.mpWhy] || 'لا نقاط حركة متبقية';
      return `${why}: يتحرك في الدور القادم.`;
    }
    const waterWhy = (from) => `الطريق البحري من ${from.name} يحتاج ميناءً في ${from.name}${this.friendly(from.owner, a.fid) ? ` (${BUILDINGS.port.cost()} ذهباً)` : ''} أو قائداً ربّاناً.`;
    if (a.siege || !this.passable(a, here)) {
      const e = this.edge(here.id, n.id);
      if (!a.siege) return `${here.name} محاصرة: الجيش المحاصَر داخلها لا يخرج إلا بقتال المحاصِرين (الخروج للقتال).`;
      if (!e) return `الجيش يحاصر ${here.name}: يتحرك خطوة واحدة فقط إلى مدينة مجاورة، و${n.name} ليست مجاورة.`;
      if (e.kind === 'water' && this.edgeCost(a, here, n, e.kind) === Infinity) return waterWhy(here);
      return `الطريق إلى ${n.name} يكلّف ${this.edgeCost(a, here, n, e.kind)} نقاط وحركتك ${a.mp}.`;
    }
    // أرخص طريق لو كانت كل المدن مفتوحة: نبحث عن أول عائق حقيقي عليه
    const dist = { [here.id]: 0 }, prev = {}, open = [here.id];
    let waterBlocked = null;
    while (open.length) {
      open.sort((x, y) => dist[x] - dist[y]);
      const cur = open.shift(), cn = this.node(cur);
      if (cur === n.id) break;
      for (const e of this.edgesOf(cur)) {
        const to = this.node(e.to);
        const c = this.edgeCost(a, cn, to, e.kind);
        if (c === Infinity) { if (e.kind === 'water' && (e.to === n.id || !waterBlocked)) waterBlocked = { from: cn, to }; continue; }
        const nd = dist[cur] + c;
        if (dist[to.id] !== undefined && dist[to.id] <= nd) continue;
        dist[to.id] = nd; prev[to.id] = cur; open.push(to.id);
      }
    }
    if (dist[n.id] === undefined) return waterBlocked ? waterWhy(waterBlocked.from) : `لا طريق بري إلى ${n.name} من هنا.`;
    const path = [];
    for (let c = n.id; c !== here.id; c = prev[c]) path.unshift(c);
    for (const id of path.slice(0, -1)) {
      const m = this.node(id);
      if (!this.friendly(m.owner, a.fid)) {
        const wf = waterBlocked && waterBlocked.to.id === n.id && (waterBlocked.from.id === here.id || this.reach(a)[waterBlocked.from.id]) ? waterBlocked.from : null;
        const alt = wf ? ` أو اعبر البحر من ${wf.name} مباشرة: يحتاج ميناءً فيها${this.friendly(wf.owner, a.fid) ? ` (${BUILDINGS.port.cost()} ذهباً)` : ''} أو قائداً ربّاناً.` : '';
        return `الطريق إلى ${n.name} يمر عبر ${m.name} (${this.fname(m.owner)}): لا يعبر جيش مدينة غير صديقة دون فتحها. حاصر ${m.name} أولاً${alt ? '،' + alt : '.'}`;
      }
      if (this.besiegers(m.id).some((b) => this.atWar(b.fid, a.fid))) return `الطريق إلى ${n.name} يمر عبر ${m.name} المحاصَرة: لا يمر جيش عبر مدينة تحت حصار العدو. فكّ الحصار أولاً.`;
    }
    const need = dist[n.id];
    const turns = Math.ceil(need / Math.max(1, this.mpMax(a)));
    const via = path.length > 1 ? ` عبر ${path.slice(0, -1).map((id) => this.node(id).name).join('، ')}` : '';
    return `المسافة ${need} نقاط حركة وبقي لك ${a.mp}: تصل خلال ${turns} ${turns === 1 ? 'دور' : 'أدوار'}${via}.`;
  },

  // ماذا سيحدث عند التحرك إلى مدينة؟
  planMove(a, targetId) {
    const r = this.reach(a)[targetId];
    if (!r) return { err: this.moveBlocker(a, targetId) };
    const n = this.node(targetId);
    const plan = { path: r.path, cost: r.cost, node: n };
    if (this.friendly(n.owner, a.fid)) {
      const hostile = this.besiegers(n.id).filter((b) => b.fid !== a.fid);
      if (hostile.length) {
        const warWith = hostile.find((b) => this.atWar(b.fid, a.fid));
        if (!warWith) return { ...plan, needWar: hostile[0].fid, then: 'relief' };
        return { ...plan, kind: 'relief' };
      }
      return { ...plan, kind: 'move' };
    }
    const own = this.besiegers(n.id).filter((b) => b.fid === a.fid);
    if (own.length) return { ...plan, kind: 'join' };
    const other = this.besiegers(n.id).find((b) => b.fid !== a.fid);
    if (other) return { err: `يحاصرها جيش ${this.fname(other.fid)}` };
    if (!this.atWar(a.fid, n.owner)) return { ...plan, needWar: n.owner, then: n.walls > 0 ? 'siege' : 'assault' };
    return { ...plan, kind: n.walls > 0 ? 'siege' : 'assault' };
  },

  // تنفيذ الحركة. تُرجع وصف المواجهة إن وُجدت
  moveAlong(a, plan) {
    const path = plan.path;
    for (let i = 0; i < path.length - 1; i++) { a.from = a.node; a.node = path[i]; }
    a.from = a.node;
    if (a.siege) { a.from = a.siege.from || a.from; a.siege = null; }
    a.mp = Math.max(0, a.mp - plan.cost);
    a.mpWhy = a.mp <= 0 ? 'move' : null;
    a.fat = Math.min(95, (a.fat || 0) + plan.cost * 2);
  },

  startSiege(a, n) {
    const already = this.besiegers(n.id).some((b) => b.fid === a.fid && b !== a);
    a.node = n.id;
    const other = this.besiegers(n.id).find((b) => b.fid === a.fid && b !== a);
    a.siege = { turns: other ? other.siege.turns : 0, from: a.from };
    this.spendMp(a, 'siege');
    if (!already) {
      n.siegeStart = this.S.turn;
      this.event('mil', `${this.fname(a.fid)} تضرب الحصار على ${n.name} بقيادة ${this.gname(this.armyGen(a))}.`, { fids: [a.fid, n.owner], node: n.id, imp: 2 });
      if (n.owner === this.S.player) this.alert(n.capital || n.stores <= 1 ? 'crit' : 'imp', `${this.fname(a.fid)} تحاصر ${n.name}!`, { node: n.id, key: 'siege:' + n.id, cond: true, icon: 'tent', win: 'siege' });
    } else {
      this.event('mil', `تعزيزات ${this.fname(a.fid)} تصل إلى حصار ${n.name}.`, { fids: [a.fid, n.owner], node: n.id, imp: 1 });
      this.addScar(n.id, 'reinforce', { fid: a.fid });
      if (a.fid === this.S.player) this.alert('info', `وصلت تعزيزاتك إلى حصار ${n.name}`, { node: n.id, icon: 'banner' });
      else if (n.owner === this.S.player) this.alert('imp', `تعزيزات ${this.fname(a.fid)} تصل إلى حصار ${n.name}`, { node: n.id, icon: 'banner', win: 'siege' });
    }
  },

  // ------------------، المواجهات -------------------
  effWalls(n) { return n.walls; },
  siegeTurns(n, fid) { return Math.max(0, ...this.besiegers(n.id).filter((b) => b.fid === fid).map((b) => b.siege.turns)); },
  siegeEquip(n, fid) {
    const t = this.siegeTurns(n, fid);
    const eng = this.besiegers(n.id).some((b) => b.fid === fid && this.hasTrait(b, 'siege'));
    const bonus = eng ? 1 : 0;
    return { ram: t + bonus >= 1, ladders: t + bonus >= 1, tower: t + bonus >= 2, turns: t };
  },

  makeEnc(type, attArmies, nodeId, defArmies) {
    const n = this.node(nodeId);
    const att = attArmies.filter(Boolean);
    const enc = { type, node: n.id, att: att.map((a) => a.id), attFid: att[0].fid, def: [], defFid: null, garrison: false, withGarrison: false, kind: 'field', equip: null, from: att[0].from };
    if (type === 'assault') {
      enc.defFid = n.owner;
      enc.def = this.defendersOf(n).map((a) => a.id);
      enc.garrison = true;
      if (n.walls > 0) { enc.kind = 'siege'; enc.equip = this.siegeEquip(n, enc.attFid); }
    } else {
      // فكّ الحصار أو الخروج
      enc.def = defArmies.map((a) => a.id);
      enc.defFid = defArmies[0].fid;
      if (type === 'sally') enc.withGarrison = true;
      if (type === 'relief') {
        for (const d of this.defendersOf(n)) if (!enc.att.includes(d.id) && this.atWar(d.fid, enc.defFid)) enc.att.push(d.id);
        enc.withGarrison = n.owner === enc.attFid;
      }
    }
    const e = this.edge(enc.from, n.id);
    enc.terrain = e && e.kind === 'pass' && type !== 'sally' ? 'mountains' : n.terrain;
    return enc;
  },

  encSides(enc) {
    const node = this.node(enc.node);
    const attArmies = enc.att.map((id) => this.army(id)).filter(Boolean);
    const defArmies = enc.def.map((id) => this.army(id)).filter(Boolean);
    const attRegs = attArmies.flatMap((a) => a.regs);
    if (enc.withGarrison) attRegs.push(...node.garrison);
    const defRegs = defArmies.flatMap((a) => a.regs);
    if (enc.garrison) defRegs.push(...node.garrison);
    const attGens = attArmies.map((a) => this.armyGen(a)).filter(Boolean);
    const defGens = defArmies.map((a) => this.armyGen(a)).filter(Boolean);
    return { node, attArmies, defArmies, attRegs, defRegs, attGens, defGens };
  },

  // تقدير القوة مع التضاريس والقادة والأسوار
  sideMod(gens, enc, defending) {
    const node = this.node(enc.node);
    const g = [...gens].sort((a, b) => b.rank - a.rank)[0];
    let m = 1;
    if (!g) return 0.9;
    m += 0.02 * this.genSkills(g).coh;
    const t = g.trait;
    if (t === 'tactician') m += 0.1;
    if (t === 'brave') m += 0.06;
    if (t === 'merchant') m -= 0.05;
    if (t === 'defender' && defending && enc.kind === 'siege') m += 0.2;
    if (t === 'mountaineer' && (enc.terrain === 'mountains' || enc.terrain === 'hills')) m += 0.2;
    if (t === 'desert' && enc.terrain === 'desert') m += 0.15;
    if (t === 'naval' && enc.terrain === 'river') m += 0.1;
    if (t === 'siege' && !defending && enc.kind === 'siege') m += 0.15;
    if (defending && enc.kind === 'field' && (enc.terrain === 'hills' || enc.terrain === 'mountains')) m += 0.15;
    if (defending && enc.terrain === 'river') m += 0.12;
    void node;
    return m;
  },
  encPower(enc) {
    const s = this.encSides(enc);
    const node = s.node;
    let pa = s.attRegs.reduce((t, r) => t + this.regPower(r), 0) + s.attGens.reduce((t, g) => t + this.genPower(g), 0);
    let pd = s.defRegs.reduce((t, r) => t + this.regPower(r), 0) + s.defGens.reduce((t, g) => t + this.genPower(g), 0);
    pa *= this.sideMod(s.attGens, enc, false) * this.moodMul(s.attArmies);
    pd *= this.sideMod(s.defGens, enc, true) * this.moodMul(s.defArmies);
    if (enc.kind === 'siege') {
      const eq = enc.equip || {};
      const w = this.effWalls(node);
      const cav = s.attRegs.filter((r) => UNITS[r.type].cls === 'cav').length / Math.max(1, s.attRegs.length);
      pd *= 1 + 0.35 * w * (eq.tower ? 0.45 : eq.ram ? 0.6 : 1);
      pa *= 1 - cav * 0.3;
      if (node.stores < 0) pd *= 0.8;
    }
    if (enc.type === 'assault' && node.capital) pd *= 1.2;
    // خيالة في السهول، مشاة في الغابات
    const cavShare = (regs) => regs.filter((r) => UNITS[r.type].cls === 'cav').length / Math.max(1, regs.length);
    if (enc.kind === 'field') {
      const k = { plains: 0.2, desert: 0.15, forest: -0.25, mountains: -0.2 }[enc.terrain] || 0;
      pa *= 1 + k * cavShare(s.attRegs); pd *= 1 + k * cavShare(s.defRegs);
    }
    return { pa: Math.max(1, pa), pd: Math.max(1, pd) };
  },
  // الحالة المتوسطة لمجموعة جيوش، موزونة بالرجال
  condOf(armies) {
    let men = 0, fat = 0, mor = 0;
    for (const a of armies) { const m = this.armyMen(a); men += m; fat += (a.fat || 0) * m; mor += (a.mor || 0) * m; }
    return { fat: men ? fat / men : 0, mor: men ? mor / men : 0 };
  },
  // وسم الحالة للعرض: مشتق من المعنويات الرقمية، لا مكافأة مستقلة
  moodTag(a) {
    if (a.mood && a.mood.k === 'hungry') return;
    a.mood = (a.mor || 0) <= -12 ? { k: 'shaken', t: 99 } : (a.mor || 0) >= 5 ? { k: 'confident', t: 99 } : null;
  },
  moodMul(armies) {
    const c = this.condOf(armies);
    let m = (1 + c.mor / 200) * (1 - c.fat / 260);
    for (const a of armies) if (a.mood && a.mood.k === 'hungry') m -= 0.1 / armies.length;
    return m;
  },
  // التعافي: الراحة والإمداد يزيلان التعب ويعيدان السهام. المحاصِر لا يأخذ مؤن المدينة
  recoverArmy(a) {
    const n = this.node(a.node), f = this.f(a.fid);
    const own = n.owner === a.fid, besieged = own && this.besieger(n.id) && !a.siege;
    let rest = a.siege ? 12 : own ? (besieged ? 15 : 35) : this.friendly(n.owner, a.fid) ? 25 : 15;
    if (this.hasTrait(a, 'logistician')) rest *= 1.3;
    if (f && f.food <= 0) rest = -8;
    a.fat = Math.round(clamp((a.fat || 0) - rest, 0, 95));
    const back = own && !besieged ? 8 : 5;
    a.mor = Math.round((a.mor || 0) + clamp(-(a.mor || 0), -back, back));
    const arrows = a.siege ? (f && f.food > 0 ? 0.25 : 0) : own ? (besieged ? (n.barracks ? 0.35 : 0.2) : 0.6) : 0.3;
    for (const r of a.regs) if (UNITS[r.type].range && r.ammo != null) r.ammo = Math.min(1, r.ammo + arrows);
    this.moodTag(a);
  },

  // --- المعركة بالقيادة: الإعداد والنتيجة ---
  battleWeather(node) {
    const r = rng(hashStr(node.id + ':' + this.S.turn));
    const season = this.S.turn % 4, x = r();
    if (season === 3) return x < 0.3 ? 'snow' : x < 0.5 ? 'rain' : 'clear';
    if (season === 1 && (node.terrain === 'desert' || node.terrain === 'plains')) return x < 0.35 ? 'heat' : 'clear';
    if (season === 0) return x < 0.2 ? 'rain' : x < 0.3 ? 'fog' : 'clear';
    if (season === 2) return x < 0.18 ? 'fog' : x < 0.3 ? 'rain' : 'clear';
    return x < 0.1 ? 'rain' : 'clear';
  },
  simConfig(enc) {
    const s = this.encSides(enc);
    const P = this.S.player;
    const moodOf = (armies, fid, defending) => {
      let m = this.condOf(armies).mor;
      for (const a of armies) if (a.mood && a.mood.k === 'hungry') m -= 15 / armies.length;
      if (defending && enc.kind === 'siege' && s.node.stores < 0) m -= 15;
      const F = this.f(fid), other = fid === enc.attFid ? enc.defFid : enc.attFid;
      if (F && F.vendetta && F.vendetta[other] > 0) m += 8;
      return Math.round(m);
    };
    const skill = DIFFS[this.S.difficulty].aiSkill;
    const side = (fid, regs, gens, armies, defending) => {
      const other = fid === enc.attFid ? enc.defFid : enc.attFid;
      let intel = fid === P ? this.intelLevel(P, other) : 3;
      if (fid === P && regs.some((r) => UNITS[r.type].cls === 'cav')) intel = Math.min(3, intel + 1);
      if (fid === P && gens.some((g) => g.trait === 'tactician')) intel = Math.min(3, intel + 1);
      const pers = this.pers ? this.pers(fid) : { aggr: 1 };
      const rm = this.rulerMod ? this.rulerMod(fid, 'morale') + (gens.some((g) => this.isRuler(g)) ? 6 : 0) : 0;
      return {
        fid, name: this.fname(fid), color: this.f(fid).color, player: fid === P,
        regs: regs.filter((r) => r.men > 0),
        gens: gens.filter((g) => g.status === 'army').map((g) => ({ id: g.id, name: g.name, trait: g.trait, flaw: g.flaw, rank: g.rank, men: this.genMen(g), vendetta: g.vendetta, skills: this.genSkills(g) })),
        mood: moodOf(armies, fid, defending) + rm, ai: fid === 'neutral' ? Math.min(skill, 0.45) : skill, intel, aggr: pers.aggr || 1,
        fat: this.condOf(armies).fat, intent: fid === P && enc.intent ? enc.intent : null,
      };
    };
    return {
      kind: enc.kind, terrain: enc.terrain || s.node.terrain, walls: this.effWalls(s.node), equip: enc.equip || {},
      capital: s.node.capital, stores: s.node.stores, weather: this.battleWeather(s.node),
      seed: hashStr(s.node.id) + this.S.turn * 131 + (this.S.nextId || 0), title: s.node.name, style: this.sc.id === 'threeKingdoms' ? 'east' : 'west',
      sides: [side(enc.attFid, s.attRegs, s.attGens, s.attArmies, false), side(enc.defFid, s.defRegs, s.defGens, s.defArmies, true)],
    };
  },
  // تطبيق نتيجة المحاكاة على جيوش الحملة
  applySim(enc, res) {
    if (!res || res === 'cancel' || res.winner == null) return null;
    const sides = this.encSides(enc);
    for (let si = 0; si < 2; si++) {
      const won = res.winner === si;
      const R2 = res.sides[si], F2 = res.sides[1 - si];
      for (const u of R2.units) {
        if (!u.ref) continue;
        u.ref.men = Math.max(0, Math.round(u.men));
        if (u.ammo0) u.ref.ammo = clamp(u.ammo / u.ammo0, 0, 1);
        if (won && u.kills >= 10 && u.ref.exp != null && R() < 0.5) u.ref.exp = Math.min(3, (u.ref.exp || 0) + 1);
      }
      // الإرهاق والمعنويات بقدر شدة القتال ونسبة من اشتبك: هجوم جندي واحد لا ينهك جيشاً
      const own0 = Math.max(1, R2.men0 || 1), foe0 = F2.men0 || 0;
      const engage = clamp(1.5 * foe0 / own0, 0.05, 1);
      const loss = clamp(1 - (R2.menEnd != null ? R2.menEnd : own0) / own0, 0, 1);
      const armies = si === 0 ? sides.attArmies : sides.defArmies;
      for (const a of armies) {
        a.fat = Math.round(clamp((a.fat || 0) + Math.max(0, (R2.fat || 0) - (R2.fat0 || 0)) * engage, 0, 95));
        a.mor = Math.round(clamp((a.mor || 0) + (won ? 4 - loss * 30 : -10 - loss * 40) * engage, -40, 10));
      }
    }
    const fates = {};
    for (const [id, f] of Object.entries(res.fates || {})) if (f === 'killed' || f === 'captured') fates[id] = f;
    // النصر يربط القادة بمملكتهم، والهزيمة تزرع الشك
    for (let si = 0; si < 2; si++) {
      for (const gg of (res.sides[si].gens || [])) {
        const g = this.gen(gg.id || gg);
        if (g && g.loy != null && !(this.isRuler && this.isRuler(g))) g.loy = clamp(g.loy + (res.winner === si ? 3 : -2), 0, 100);
      }
    }
    return { winner: res.winner, fates, report: res.report, reason: res.reason };
  },
  autoResolve(enc) {
    const cfg = this.simConfig(enc);
    // بلا نية: كل جانب يديره الذكاء. بنية: جانب اللاعب يتبع نيته بالأوامر نفسها المتاحة له في العرض المفصل
    for (const sd of cfg.sides) if (!sd.intent) sd.player = false;
    const res = new WarSim(cfg).runAuto();
    const out = this.applySim(enc, res) || { winner: 1, fates: {}, report: null };
    out.auto = true;
    return out;
  },

  // بعد حسم المعركة بأي طريقة
  async finishEncounter(enc, out) {
    const node = this.node(enc.node);
    const winner = out.winner;
    const sides = this.encSides(enc);
    const attArmies = sides.attArmies, defArmies = sides.defArmies;
    const winFid = winner === 0 ? enc.attFid : enc.defFid;
    const loseFid = winner === 0 ? enc.defFid : enc.attFid;
    const { pa, pd } = { pa: this.menOf(sides.attRegs), pd: this.menOf(sides.defRegs) };
    // مصائر القادة
    for (const gid in out.fates) {
      const g = this.gen(gid);
      if (!g || g.status !== 'army') continue;
      const fate = out.fates[gid];
      if (fate === 'ok') continue;
      const a = this.army(g.army);
      if (a) a.gen = null;
      this.setGenFate(g, fate, fate === 'captured' ? (g.fid === enc.attFid ? enc.defFid : enc.attFid) : null);
    }
    for (const g of [...sides.attGens, ...sides.defGens]) {
      if (g.status !== 'army') continue;
      const won = (g.fid === winFid);
      this.gainXp(g, won ? 2 : 1);
      if (won && this.addFame) this.addFame(g, enc.kind === 'siege' ? 4 : 3);
    }
    if (winFid === this.S.player && this.recProgress) this.recProgress('win');
    const winners = winner === 0 ? attArmies : defArmies;
    const losers = winner === 0 ? defArmies : attArmies;
    for (const a of [...attArmies, ...defArmies]) { this.spendMp(a, 'battle'); a.regs = a.regs.filter((r) => r.men >= 5); }
    for (const a of [...winners, ...losers]) this.moodTag(a);
    node.garrison = node.garrison.filter((r) => r.men >= 5);
    this.fixLeaderless();

    const verb = enc.kind === 'siege' ? 'اقتحام' : 'معركة';
    this.addScar(node.id, 'battle', { winner: winFid, loser: loseFid });
    const involves = enc.attFid === this.S.player || enc.defFid === this.S.player;
    if (out.report && (involves || pa + pd >= 800 || Object.keys(out.fates).length || node.capital)) {
      this.chronicle('battle', `${verb} ${node.name}: ${out.report.verdict} لـ${this.fname(winFid)} على ${this.fname(loseFid)}.`, { fids: [enc.attFid, enc.defFid], node: node.id, imp: involves ? 3 : 2, story: out.report.story });
    }
    const P = this.S.player;
    if ((enc.attFid === P || enc.defFid === P) && out.auto) {
      this.alert(winFid === P ? 'info' : 'imp', `${verb} ${node.name}: ${winFid === P ? 'انتصار على' : 'هزيمة أمام'} ${this.fname(winFid === P ? loseFid : winFid)}`, { node: node.id, icon: 'swords' });
    }
    if (enc.type === 'assault') {
      if (winner === 0) {
        for (const d of losers) if (this.S.armies.includes(d)) this.retreatHome(d, [enc.from, node.id], winFid);
        const alive = attArmies.filter((a) => this.S.armies.includes(a));
        if (alive.length) {
          this.event('mil', `${verb} ${node.name}: ${this.fname(enc.attFid)} تنتصر على ${this.fname(enc.defFid)} (${pa} مقابل ${pd} رجل في البداية).`, { fids: [enc.attFid, enc.defFid], node: node.id, imp: 2 });
          await this.capture(node, enc.attFid, 'storm', alive);
        }
      } else {
        this.event('mil', `${this.fname(enc.defFid)} تصدّ ${verb} ${this.fname(enc.attFid)} على ${node.name}.`, { fids: [enc.attFid, enc.defFid], node: node.id, imp: 2 });
        for (const a of attArmies) {
          if (!this.S.armies.includes(a)) continue;
          const keepSiege = a.siege && this.armyPower(a) > this.defensePower(node) * 0.35;
          if (!keepSiege) { a.siege = null; this.retreatHome(a, [], winFid, a.from); }
        }
      }
    } else if (winner === 0) {
      for (const d of defArmies) if (this.S.armies.includes(d)) this.retreatHome(d, [], winFid, d.siege ? d.siege.from : d.from);
      for (const a of attArmies) if (this.S.armies.includes(a) && a.node !== node.id) { a.from = a.node; a.node = node.id; }
      this.event('mil', `${this.fname(enc.attFid)} تكسر حصار ${node.name} وتهزم ${this.fname(enc.defFid)}.`, { fids: [enc.attFid, enc.defFid], node: node.id, imp: 2 });
    } else {
      if (enc.type === 'relief') for (const a of attArmies) if (this.S.armies.includes(a) && a.node !== node.id) this.retreatHome(a, [], winFid, a.from);
      this.event('mil', `${this.fname(enc.defFid)} تهزم المدافعين عند ${node.name} ويستمر الحصار.`, { fids: [enc.attFid, enc.defFid], node: node.id, imp: 2 });
    }
    void loseFid;
    this.validate();
  },

  // الجيوش التي فقدت قائدها: تنضم لقائد آخر هنا أو يتولاها ضابط
  fixLeaderless() {
    for (const a of [...this.S.armies]) {
      const g = this.armyGen(a);
      if (g && g.status === 'army' && g.army === a.id) continue;
      a.gen = null;
      if (!a.regs.length) { this.removeArmy(a); continue; }
      const host = this.S.armies.find((o) => o !== a && o.fid === a.fid && o.node === a.node && !!o.siege === !!a.siege && o.gen && o.regs.length < MAX_REGS);
      if (host) {
        host.regs.push(...a.regs.splice(0, MAX_REGS - host.regs.length));
        if (!a.regs.length) { this.removeArmy(a); continue; }
      }
      const off = this.poolOf(a.fid).filter((x) => x.name.startsWith('الضابط'))[0] || this.officer(a.fid);
      off.status = 'army'; off.army = a.id; a.gen = off.id;
      this.event('int', `تولّى ${off.name} قيادة فلول الجيش (${this.fname(a.fid)}).`, { fids: [a.fid], node: a.node });
    }
  },

  // انسحاب إلى أقرب مدينة صديقة (ممر آمن حتى 3 خطوات). وإن تعذّر: يستسلم
  retreatHome(a, avoid = [], captorFid = null, prefer = null) {
    a.siege = null;
    const ok = (n) => n && this.friendly(n.owner, a.fid) && !this.besiegers(n.id).some((b) => this.atWar(b.fid, a.fid)) && !avoid.includes(n.id);
    let dest = null;
    if (prefer && ok(this.node(prefer)) && prefer !== a.node) dest = this.node(prefer);
    if (!dest && ok(this.node(a.node))) return true;
    if (!dest) {
      const seen = new Set([a.node]);
      let layer = [a.node];
      for (let d = 0; d < 3 && !dest; d++) {
        const next = [];
        for (const id of layer) for (const x of this.adj(id)) {
          if (seen.has(x)) continue;
          seen.add(x);
          const n = this.node(x);
          if (ok(n)) { dest = n; break; }
          if (this.friendly(n.owner, a.fid)) next.push(x);
        }
        layer = next;
      }
    }
    if (dest) {
      a.from = a.node; a.node = dest.id;
      return true;
    }
    // لا مهرب: الغزاة يعودون إلى السهوب، وغيرهم يلقي السلاح
    const here = this.node(a.node);
    if (this.f(a.fid) && this.f(a.fid).horde) {
      this.event('mil', `${this.fname(a.fid)}: جيش ${this.gname(this.armyGen(a))} يرتد نحو السهوب${here ? ' من ' + here.name : ''}.`, { fids: [a.fid], node: a.node, imp: 2 });
      this.removeArmy(a);
      return false;
    }
    const captor = captorFid || (here && this.atWar(here.owner, a.fid) ? here.owner : null);
    const g = this.armyGen(a);
    this.event('mil', `جيش ${this.fname(a.fid)} بقيادة ${this.gname(g)} حوصر وألقى السلاح${here ? ' قرب ' + here.name : ''}.`, { fids: [a.fid, captor].filter(Boolean), node: a.node, imp: 3 });
    this.removeArmy(a, captor ? { fate: 'captured', captor } : null);
    return false;
  },

  // ------------------، سقوط المدن -------------------
  async capture(node, fid, how, armies = []) {
    const old = node.owner;
    // جيوش المالك السابق وحلفائه في المدينة: ممر آمن أو استسلام
    for (const o of [...this.armiesAt(node.id)]) {
      if (o.fid === fid || o.siege) continue;
      if (this.friendly(o.fid, fid)) continue;
      const moved = this.retreatHome(o, [node.id], fid);
      if (moved) this.event('mil', `جيش ${this.fname(o.fid)} يغادر ${node.name} بممر آمن.`, { fids: [o.fid, fid], node: node.id, imp: 1 });
    }
    node.owner = fid;
    node.capturedTurn = this.S.turn;
    if (fid === this.S.player && this.recProgress) this.recProgress('city', node);
    if (this.addFame) for (const a of armies) this.addFame(this.armyGen(a), node.capital ? 6 : 3);
    node.garrison = [];
    this.fillGarrison(node, false);
    node.stores = Math.min(2, this.storesMax(node));
    node.manpower = Math.floor(node.manpower * 0.3);
    node.unrest = how === 'surrender' ? 2 : 4;
    for (const a of armies) if (this.S.armies.includes(a)) { if (a.node !== node.id) { a.from = a.node; a.node = node.id; } a.siege = null; }
    for (const b of this.besiegers(node.id)) if (b.fid === fid) b.siege = null;
    const oldF = this.f(old);
    if (oldF) {
      oldF.lostRecently = (oldF.lostRecently || 0) + 1;
      if (old !== 'neutral' && !oldF.claims.includes(node.id)) oldF.claims.push(node.id);
    }
    const nf = this.f(fid);
    nf.claims = nf.claims.filter((id) => id !== node.id);
    if (how === 'storm' && R() < 0.4) {
      const bs = ['market', 'farm', 'granary', 'roads'].filter((b) => node[b] > 0);
      if (bs.length) { const b = pick(bs); node[b]--; }
    }
    this.event('mil', `سقطت ${node.name}${node.capital ? ' (العاصمة!)' : ''} بيد ${this.fname(fid)}${how === 'surrender' ? ' صلحاً' : ''}.`, { fids: [fid, old], node: node.id, imp: 3 });
    this.addScar(node.id, how === 'surrender' ? 'surrender' : 'capture', { fid, old });
    if (node.capital || node.pop >= 20000 || fid === this.S.player || old === this.S.player) {
      this.chronicle(node.capital ? 'capital' : 'fall', `${how === 'surrender' ? 'استسلمت' : 'سقطت'} ${node.name}${node.capital ? ' عاصمة ' + this.fname(old) : ''} بيد ${this.fname(fid)}.`, { fids: [fid, old], node: node.id, imp: node.capital ? 3 : 2 });
    }
    if (old === this.S.player) this.alert('crit', `سقطت ${node.name} بيد ${this.fname(fid)}${how === 'surrender' ? ' صلحاً' : ''}`, { node: node.id, icon: 'breach' });
    if (this.S.flips) { const k = [fid, old].sort().join('|') + ':' + node.id; this.S.flips[k] = (this.S.flips[k] || 0) + 1; }
    let choice = 'occupy';
    if (this.f(fid).isPlayer) choice = this.hooks.occupation ? await this.hooks.occupation(node, how) : 'occupy';
    else {
      const p = this.pers ? this.pers(fid) : { aggr: 1, honor: 1 };
      choice = this.f(fid).horde ? (R() < 0.7 ? 'sack' : 'occupy') : p.aggr > 1.15 && p.honor < 1 && R() < 0.45 ? 'sack' : (p.honor > 1.1 && R() < 0.4 ? 'clemency' : 'occupy');
    }
    this.applyOccupation(node, fid, old, choice, how);
    this.validate();
  },

  applyOccupation(node, fid, old, choice, how) {
    const f = this.f(fid);
    if (choice === 'sack') {
      const loot = Math.round(node.pop / 55);
      f.gold += loot;
      node.pop = Math.round(node.pop * 0.72);
      node.loyalty = 12;
      node.unrest = 6;
      if (node.market) node.market--;
      this.addRel(fid, old, -15);
      if (this.f(old) && this.f(old).grievance) this.f(old).grievance[fid] = (this.f(old).grievance[fid] || 0) + 2;
      f.rep = Math.max(0, f.rep - 4);
      this.event('int', `${f.name} تنهب ${node.name} وتغنم ${loot} ذهباً. سكانها يتذكرون.`, { fids: [fid, old], node: node.id, imp: 2 });
      this.addScar(node.id, 'sack', { fid });
    } else if (choice === 'clemency') {
      node.loyalty = 62;
      node.unrest = Math.max(1, node.unrest - 2);
      this.addRel(fid, old, 8);
      f.rep = Math.min(100, f.rep + 4);
      f.gold = Math.max(0, f.gold - 50);
      this.event('int', `${f.name} تعلن الأمان لأهل ${node.name}.`, { fids: [fid], node: node.id, imp: 1 });
    } else {
      node.loyalty = how === 'surrender' ? 52 : 40;
    }
  },

  checkElimination() {
    for (const id of this.majors()) {
      const f = this.f(id);
      if (!f.alive) continue;
      if (this.nodesOf(id).length === 0 && !(f.kind && this.armiesOf(id).length)) {
        f.alive = false;
        for (const a of this.armiesOf(id)) this.removeArmy(a);
        for (const g of this.gensOf(id)) if (g.status === 'pool') g.status = 'exiled';
        this.S.tributes = this.S.tributes.filter((t) => t.payer !== id && t.payee !== id);
        this.event('pol', `سقطت مملكة ${f.name}!`, { fids: [id], imp: 3 });
        this.chronicle('realm', `سقطت مملكة ${f.name} وانطوت صفحتها.`, { fids: [id], imp: 3 });
      }
    }
    const S = this.S, p = S.player;
    if (!this.f(p).alive || this.nodesOf(p).length === 0) S.over = 'lose';
    else {
      const rivals = this.majors().filter((id) => id !== p && this.f(id).alive);
      if (!S.endless && (rivals.length === 0 || this.nodesOf(p).length / S.nodes.length >= 0.85)) { S.over = 'win'; if (!S.overWhy) S.overWhy = rivals.length === 0 ? 'لم تبقَ مملكة تنازعك. البلاد كلها لك.' : null; }
    }
  },

  // ------------------، سلامة الحالة -------------------
  // تُستدعى بعد كل تغيير مهم لضمان ألا يبقى جيش في حالة غير معرّفة
  validate() {
    const S = this.S;
    for (const a of [...S.armies]) {
      const n = this.node(a.node);
      if (!n || !this.f(a.fid) || !this.f(a.fid).alive) { this.removeArmy(a); continue; }
      a.regs = a.regs.filter((r) => r.men >= 5);
    }
    this.fixLeaderless();
    for (const a of [...S.armies]) {
      if (!S.armies.includes(a)) continue;
      const n = this.node(a.node);
      if (a.siege) {
        if (n.owner === a.fid || this.friendly(n.owner, a.fid)) { a.siege = null; continue; }
        if (!this.atWar(a.fid, n.owner)) {
          this.event('mil', `رُفع حصار ${this.fname(a.fid)} عن ${n.name} بعد انتهاء الحرب.`, { fids: [a.fid, n.owner], node: n.id, imp: 1 });
          this.retreatHome(a, [], null, a.siege.from);
        }
        continue;
      }
      if (this.friendly(n.owner, a.fid)) continue;
      // جيش داخل أرض غير صديقة وليس محاصِراً: يخرج بممر آمن
      this.retreatHome(a, [], this.atWar(n.owner, a.fid) ? n.owner : null);
    }
    for (const n of S.nodes) {
      n.garrison = n.garrison.filter((r) => r.men >= 1 || this.garrisonTarget(n).includes(r.type));
      if (n.stores > this.storesMax(n)) n.stores = this.storesMax(n);
    }
    for (const g of Object.values(S.gens)) {
      if (g.status === 'army' && !S.armies.some((a) => a.gen === g.id)) { g.status = 'pool'; g.army = null; }
      if (g.status === 'captive' && (!this.f(g.captor) || !this.f(g.captor).alive)) { g.status = 'pool'; g.captor = null; }
    }
    this.checkElimination();
  },

  // ------------------، التفاوض في المواجهة -------------------
  // طلب التسليم: احتمال معلن، رمية مثبتة بالدور، ومهلة بعد الرفض (statecraft.js)
  tryDemandSurrender(enc) { return this.demandSurrender(enc).ok; },
  bribeCost(enc) {
    const s = this.encSides(enc);
    const men = this.menOf(s.defRegs) + s.defGens.reduce((t, g) => t + this.genMen(g), 0);
    return Math.round(men * 1.1 + (enc.type === 'assault' ? s.node.pop / 120 : 0));
  },
  tryBribe(enc) {
    const s = this.encSides(enc);
    let p = 0.55;
    if (s.defGens.some((g) => g.trait === 'brave' || g.trait === 'defender')) p -= 0.25;
    if (s.defGens.some((g) => g.flaw === 'greedy' || g.flaw === 'disloyal')) p += 0.2;
    if (enc.type === 'assault' && s.node.capital) p -= 0.2;
    return R() < p;
  },
  async surrenderAccepted(enc, how) {
    const node = this.node(enc.node);
    const att = enc.att.map((id) => this.army(id)).filter(Boolean);
    if (enc.type === 'assault') {
      for (const a of att) this.spendMp(a, 'capture');
      await this.capture(node, enc.attFid, how, att);
    } else {
      for (const id of enc.def) { const d = this.army(id); if (d) this.retreatHome(d, [], null, d.siege ? d.siege.from : d.from); }
      for (const a of att) { this.spendMp(a, 'battle'); if (a.node !== node.id) { a.from = a.node; a.node = node.id; } }
      this.event('mil', `جيش ${this.fname(enc.defFid)} ينسحب من ${node.name} بعد التفاوض.`, { fids: [enc.attFid, enc.defFid], node: node.id, imp: 2 });
    }
    this.validate();
  },

  // ------------------، الأسرى -------------------
  ransomPrice(g) { return 100 + 90 * g.rank + (g.trait ? 30 : 0); },
  releaseCaptive(g, by) {
    g.status = this.f(g.fid) && this.f(g.fid).alive ? 'pool' : 'exiled';
    g.captor = null;
    this.addRel(by, g.fid, 15);
    this.f(by).rep = Math.min(100, this.f(by).rep + 3);
    this.event('pol', `${this.fname(by)} تطلق سراح ${g.name} دون مقابل.`, { fids: [by, g.fid], imp: 2 });
  },
  ransomCaptive(g, by, price) {
    const owner = this.f(g.fid);
    owner.gold -= price; this.f(by).gold += price;
    g.status = 'pool'; g.captor = null;
    this.addRel(by, g.fid, 5);
    this.event('pol', `${owner.name} تفتدي قائدها ${g.name} بـ${price} ذهباً.`, { fids: [by, g.fid], imp: 2 });
  },
  exchangeCaptives(g1, g2) {
    // g1 أسير عند مالك g2، و g2 أسير عند مالك g1
    for (const g of [g1, g2]) { g.status = 'pool'; g.captor = null; }
    this.addRel(g1.fid, g2.fid, 8);
    this.event('pol', `تبادل أسرى: ${g1.name} مقابل ${g2.name}.`, { fids: [g1.fid, g2.fid], imp: 2 });
  },
  recruitChance(g, by) {
    let p = 0.12;
    if (g.flaw === 'disloyal') p += 0.4;
    if (!this.f(g.fid) || !this.f(g.fid).alive) p += 0.45;
    if (g.orig === by) p += 0.5;
    p += (this.f(by).rep - 50) / 200;
    p += Math.min(0.2, (this.S.turn - g.since) * 0.03);
    if (g.vendetta === by) p = 0;
    return clamp(p, 0, 0.9);
  },
  tryRecruitCaptive(g, by) {
    const ok = R() < this.recruitChance(g, by);
    if (ok) {
      const from = g.fid;
      g.fid = by; g.status = 'pool'; g.captor = null; g.since = this.S.turn;
      this.event('int', `القائد ${g.name} ينضم إلى ${this.fname(by)} بعد أسره (كان من ${this.fname(from)}).`, { fids: [by, from], imp: 3 });
    } else g.refused = (g.refused || 0) + 1;
    return ok;
  },
  exileCaptive(g, by) {
    g.status = 'exiled'; g.captor = null;
    this.addRel(by, g.fid, -10);
    this.f(by).rep = Math.max(0, this.f(by).rep - 2);
    this.event('pol', `${this.fname(by)} تنفي القائد ${g.name} إلى أرض بعيدة.`, { fids: [by, g.fid], imp: 2 });
  },
  // الإعدام: قرار صعب له ثمن
  executeCaptive(g, by) {
    const victim = g.fid;
    const V = this.f(victim), B = this.f(by);
    g.status = 'dead'; g.captor = null;
    B.rep = Math.max(0, B.rep - 15);
    this.addRel(by, victim, -40);
    if (V && V.vendetta) V.vendetta[by] = 10;
    if (V && V.grievance) V.grievance[by] = (V.grievance[by] || 0) + 3;
    for (const c of this.majors()) {
      if (c === by || c === victim || !this.f(c).alive) continue;
      this.addRel(by, c, this.status(c, victim) === 'alliance' ? -12 : -4);
    }
    for (const n of this.nodesOf(by)) if (n.origOwner === victim) n.loyalty = Math.max(0, n.loyalty - 12);
    // جيوش الضحية في حداد ثم ثأر
    for (const a of this.armiesOf(victim)) { a.mor = Math.min(a.mor || 0, -12); this.moodTag(a); }
    let avenger = null;
    if (V && V.alive && victim !== 'neutral' && R() < 0.55) {
      avenger = this.addGeneral(victim, 'ابن ' + g.name.split(' ').slice(-1)[0] + ' الثائر', 'brave', R() < 0.5 ? 'reckless' : null, Math.max(1, g.rank - 1));
      avenger.vendetta = by;
    }
    this.event('pol', `${B.name} تعدم القائد ${g.name}! ${V ? V.name + ' تقسم على الثأر.' : ''}${avenger ? ` ظهر ${avenger.name} يطلب الانتقام.` : ''}`, { fids: [by, victim], imp: 3 });
    this.chronicle('execute', `${B.name} تعدم القائد الأسير ${g.name}.${avenger ? ` ${avenger.name} يقسم على الثأر.` : ''}`, { fids: [by, victim], imp: 3 });
    if (victim === this.S.player) this.alert('crit', `${B.name} أعدمت قائدك ${g.name}${avenger ? `، ${avenger.name} يطلب الثأر` : ''}`, { icon: 'skull' });
  },

  // ------------------، نهاية الجولة -------------------
  endRound() {
    const S = this.S;
    const notes = [];
    const P = S.player;
    // الحصار والتجويع
    const sieged = new Set();
    for (const a of S.armies) {
      if (!a.siege) continue;
      a.siege.turns++;
      sieged.add(a.node);
    }
    for (const id of sieged) {
      const n = this.node(id);
      n.stores--;
      if (n.stores < 0) {
        for (const r of n.garrison) r.men = Math.round(r.men * 0.85);
        for (const d of this.defendersOf(n)) { for (const r of d.regs) r.men = Math.round(r.men * 0.88); d.mood = { k: 'hungry', t: 1 }; }
        n.loyalty = Math.max(0, n.loyalty - 8);
        if (n.owner === P) { notes.push(`المجاعة تفتك بالمحاصَرين في ${n.name}!`); this.alert('crit', `المجاعة تفتك بالمحاصَرين في ${n.name}`, { node: n.id, icon: 'skull', key: 'famine:' + n.id, win: 'siege' }); }
        this.event('mil', `الجوع يفتك بأهل ${n.name} المحاصَرة.`, { fids: [n.owner], node: n.id, imp: 1 });
      }
    }
    // الاقتصاد
    for (const id of Object.keys(S.factions)) {
      const f = S.factions[id];
      if (!f.alive || id === 'neutral') continue;
      const e = this.economy(id);
      f.gold += e.netGold;
      f.food += e.netFood;
      if (f.food < 0) {
        f.food = 0;
        for (const a of this.armiesOf(id)) { for (const r of a.regs) r.men = Math.round(r.men * 0.94); a.mood = { k: 'hungry', t: 1 }; }
        if (f.isPlayer) { notes.push('نفد الطعام!'); this.alert('crit', 'نفد الطعام: جيوشك جائعة وتخسر رجالاً. ابنِ مزارع أو قلّل الجيوش', { icon: 'food', key: 'nofood' }); }
      }
      f.food = Math.min(f.food, 400);
      if (f.gold < 0) {
        const all = this.armiesOf(id).flatMap((a) => a.regs.map((r) => ({ a, r })));
        const pickR = all.find((x) => x.r.merc) || all.sort((x, y) => (UNITS[y.r.type].upkeep || 0) - (UNITS[x.r.type].upkeep || 0))[0];
        if (pickR) {
          pickR.a.regs.splice(pickR.a.regs.indexOf(pickR.r), 1);
          if (f.isPlayer) { notes.push('الخزينة فارغة'); this.alert('crit', `الخزينة فارغة: تسرّحت وحدة ${UNITS[pickR.r.type].name}${pickR.r.merc ? ' من المرتزقة' : ''}`, { icon: 'gold', key: 'broke' }); }
          this.event('eco', `${f.name} عاجزة عن دفع الرواتب وتسرّح جنوداً.`, { fids: [id], imp: 1 });
        }
        for (const n of this.nodesOf(id)) n.loyalty = Math.max(0, n.loyalty - 3);
      }
    }
    // الجزية
    for (const t of [...S.tributes]) {
      t.turns--;
      if (this.f(t.payer).gold < 0) {
        S.tributes.splice(S.tributes.indexOf(t), 1);
        this.addRel(t.payer, t.payee, -20);
        this.event('pol', `${this.fname(t.payer)} تعجز عن دفع الجزية لـ${this.fname(t.payee)} وينقض الاتفاق.`, { fids: [t.payer, t.payee], imp: 2 });
      } else if (t.turns <= 0) {
        S.tributes.splice(S.tributes.indexOf(t), 1);
        this.event('pol', `انتهت جزية ${this.fname(t.payer)} لـ${this.fname(t.payee)}.`, { fids: [t.payer, t.payee], imp: 1 });
      }
    }
    // الإمداد والازدحام
    const checked = new Set();
    for (const a of S.armies) {
      const key = a.node + ':' + a.fid;
      if (checked.has(key)) continue;
      checked.add(key);
      const n = this.node(a.node);
      const ex = this.overstack(n, a.fid);
      if (ex <= 0) continue;
      const frac = Math.min(0.2, 0.03 * ex);
      for (const b of this.armiesAt(n.id)) {
        if (b.fid !== a.fid || this.hasTrait(b, 'logistician')) continue;
        for (const r of b.regs) r.men = Math.round(r.men * (1 - frac));
      }
      if (n.owner === a.fid) n.loyalty = Math.max(0, n.loyalty - ex);
      if (a.fid === P) notes.push(`ازدحام في ${n.name}`);
    }
    // المدن
    for (const n of S.nodes) {
      const bs = this.besiegers(n.id).length > 0;
      if (!bs) {
        n.manpower = Math.min(this.mpCap(n), n.manpower + this.mpRegen(n));
        this.fillGarrison(n, false);
        n.stores = Math.min(this.storesMax(n), n.stores + 1);
        n.pop = Math.round(n.pop * (1.004 + n.farm * 0.004));
      }
      if (n.unrest > 0) n.unrest--;
      if (n.owner === 'neutral') continue;
      const here = this.armiesOfAt(n.owner, n.id);
      const target = this.loyaltyTarget(n).target;
      const rate = here.some((a) => this.hasTrait(a, 'merchant')) || this.governorOf(n, 'merchant') ? 7 : 4;
      n.loyalty = Math.round(clamp(n.loyalty + clamp(target - n.loyalty, -5, rate), 0, 100));
      if (n.loyalty < 20 && !bs && R() < 0.3) this.revolt(n, notes);
    }
    // الجيوش
    for (const a of S.armies) {
      const n = this.node(a.node);
      if (a.training) {
        for (const r of a.regs) { r.drill = (r.drill || 0) + 1; if (r.drill >= 2 && r.exp < 3) { r.exp++; r.drill = 0; } }
        a.training = false;
      } else if (!a.siege && n.owner === a.fid && n.barracks && a.mp >= this.mpMax(a) && !this.besieger(n.id)) {
        // الجيوش المقيمة في مدينة بها إسطبلات وورش تتدرّب تلقائياً
        for (const r of a.regs) { r.drill = (r.drill || 0) + 0.5; if (r.drill >= 2 && (r.exp || 0) < 3) { r.exp = (r.exp || 0) + 1; r.drill = 0; } }
      }
      // التعويض من رجال المدينة: كاملاً في السلم، وبنصف السرعة تحت الحصار (الرجال في الداخل، والتدريب على الأسوار)
      if (!a.siege && n.owner === a.fid && this.f(a.fid).gold > 0) {
        const rate = (this.hasTrait(a, 'logistician') ? 0.18 : 0.12) * (this.besieger(n.id) ? 0.5 : 1);
        let spent = 0;
        for (const r of a.regs) {
          if (r.merc) continue;
          const max = UNITS[r.type].men;
          const want = Math.min(max - r.men, Math.ceil(max * rate), Math.floor(n.manpower));
          if (want <= 0) continue;
          r.men += want; n.manpower -= want; spent += want;
        }
        this.f(a.fid).gold -= Math.round(spent * 0.4);
      }
      const g = this.armyGen(a);
      if (g) g.men = this.genMen(g);
      if (a.mood && a.mood.k === 'hungry') { a.mood.t--; if (a.mood.t <= 0) a.mood = null; }
      this.recoverArmy(a);
      a.mp = this.mpMax(a); a.mpWhy = null;
    }
    // الأسرى: محاولات الهرب
    for (const g of Object.values(S.gens)) {
      if (g.status !== 'captive') continue;
      if (g.flaw !== 'disloyal' && R() < 0.04) {
        g.status = this.f(g.fid) && this.f(g.fid).alive ? 'pool' : 'exiled';
        this.event('int', `القائد ${g.name} يفرّ من أسر ${this.fname(g.captor)}!`, { fids: [g.fid, g.captor], imp: 2 });
        g.captor = null;
      }
    }
    this.diplomacyTick();
    if (S.turn % 3 === 2) for (const id of this.majors()) this.refreshMercs(id);
    S.turn++;
    this.validate();
    return notes;
  },

  revolt(n, notes) {
    const armies = this.armiesOfAt(n.owner, n.id);
    if (armies.length) {
      for (const a of armies) for (const r of a.regs) r.men = Math.round(r.men * 0.85);
      n.loyalty += 15;
      this.event('int', `تمرّد في ${n.name} أخمده جيش ${this.fname(n.owner)} بخسائر.`, { fids: [n.owner], node: n.id, imp: 2 });
      if (n.owner === this.S.player) { notes.push('تمرد'); this.alert('imp', `تمرّد في ${n.name} أخمده جيشك بخسائر`, { node: n.id, icon: 'torch' }); }
      return;
    }
    const prev = n.owner;
    const back = n.origOwner !== prev && this.f(n.origOwner) && this.f(n.origOwner).alive && !this.f(n.origOwner).neutral;
    n.owner = back ? n.origOwner : 'neutral';
    n.loyalty = 60; n.unrest = 1; n.garrison = [];
    this.fillGarrison(n, true);
    this.event('int', `ثار أهل ${n.name} وطردوا حكّام ${this.fname(prev)}${back ? ' وعادوا إلى ' + this.fname(n.owner) : ''}.`, { fids: [prev, n.owner], node: n.id, imp: 3 });
    if (prev === this.S.player) { notes.push('ثورة'); this.alert('crit', `ثورة! خسرت ${n.name} لانهيار الولاء`, { node: n.id, icon: 'torch' }); }
    this.validate();
  },
};
