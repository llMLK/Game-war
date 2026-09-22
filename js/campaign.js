'use strict';
// نموذج الحملة: المدن، الجيوش، الاقتصاد، الحصار، الاحتلال، الدبلوماسية

const SAVE_KEY = 'swords-kingdoms-save-v1';
const DIFFS = {
  easy: { name: 'سهل', aiIncome: 0.85, aiSkill: 0.35, aiAggr: 0.8 },
  normal: { name: 'متوسط', aiIncome: 1.1, aiSkill: 0.6, aiAggr: 1 },
  hard: { name: 'صعب', aiIncome: 1.35, aiSkill: 0.85, aiAggr: 1.2 },
};
const INIT_DIPLO = {
  threeKingdoms: [['wei', 'shu', 'war'], ['wei', 'wu', 'war'], ['shu', 'wu', 'peace']],
  umayyad: [['umayyad', 'byzantine', 'war'], ['umayyad', 'khazar', 'war'], ['byzantine', 'khazar', 'alliance']],
};
const GENERIC_NAMES = ['عامر', 'خالد', 'منصور', 'ثابت', 'حمزة', 'سالم', 'نصر', 'ليث', 'زياد', 'مالك', 'حارث', 'عتبة'];
const MAX_REGS = 8;

const Game = {
  S: null,
  hooks: {},

  // ——— الإنشاء والحفظ ———
  newGame(scId, player, diff) {
    const sc = SCENARIOS[scId];
    const S = {
      v: 1, scenario: scId, turn: 0, player, difficulty: diff, nextId: 1,
      factions: {}, nodes: [], armies: [], log: [], over: null,
    };
    this.S = S;
    const ids = Object.keys(sc.factions);
    for (const id of ids) {
      const f = sc.factions[id];
      S.factions[id] = {
        id, name: f.name, color: f.color, gold: id === player ? 600 : 550, food: 40, alive: true,
        isPlayer: id === player, pool: f.generals.map(([n, t]) => ({ name: n, trait: t })),
        rel: {}, status: {}, truce: {}, warTurns: {}, lostRecently: 0,
      };
    }
    S.factions.neutral = {
      id: 'neutral', name: NEUTRAL.name, color: NEUTRAL.color, gold: 0, food: 99, alive: true, isPlayer: false, neutral: true,
      pool: sc.neutralGenerals.map(([n, t]) => ({ name: n, trait: t })), rel: {}, status: {}, truce: {}, warTurns: {},
    };
    for (const a of ids) for (const b of ids) {
      if (a === b) continue;
      S.factions[a].status[b] = 'peace'; S.factions[a].rel[b] = 0; S.factions[a].truce[b] = 0; S.factions[a].warTurns[b] = 0;
    }
    for (const [a, b, st] of INIT_DIPLO[scId] || []) this.setStatus(a, b, st, 0);
    for (const a of ids) { S.factions[a].status.neutral = 'war'; S.factions.neutral.status[a] = 'war'; }

    for (const n of sc.nodes) {
      S.nodes.push({
        id: n.id, name: n.name, x: n.x, y: n.y, owner: n.owner, origOwner: n.owner, pop: n.pop,
        walls: n.walls, market: 0, farm: 0, barracks: n.capital ? 1 : 0, loyalty: 75, capital: !!n.capital,
        terrain: n.terrain, stores: 3 + n.walls, garrison: [], capturedTurn: -99, parley: -1,
      });
    }
    for (const n of S.nodes) this.fillGarrison(n, true);
    for (const a of sc.armies) {
      const army = this.createArmy(a.owner, a.node);
      for (const t of a.regs) army.regs.push(this.newReg(t));
    }
    this.log('بدأت الحملة. ' + sc.intro, 'info');
    this.save();
    return S;
  },

  save() { if (this.S) store.set(SAVE_KEY, this.S); },
  load() {
    const s = store.get(SAVE_KEY);
    if (!s || s.v !== 1) return null;
    this.S = s;
    return s;
  },
  hasSave() { const s = store.get(SAVE_KEY); return !!(s && s.v === 1 && !s.over); },
  clearSave() { store.del(SAVE_KEY); },

  // ——— مساعدات ———
  get sc() { return SCENARIOS[this.S.scenario]; },
  f(id) { return this.S.factions[id]; },
  node(id) { return this.S.nodes.find((n) => n.id === id); },
  army(id) { return this.S.armies.find((a) => a.id === id); },
  adj(id) {
    const out = [];
    for (const [a, b] of this.sc.edges) { if (a === id) out.push(b); else if (b === id) out.push(a); }
    return out;
  },
  armiesAt(nodeId) { return this.S.armies.filter((a) => a.node === nodeId); },
  armyOf(fid, nodeId) { return this.S.armies.find((a) => a.fid === fid && a.node === nodeId && !a.siege); },
  besieger(nodeId) { return this.S.armies.find((a) => a.node === nodeId && a.siege); },
  insideArmy(node) { return this.S.armies.find((a) => a.node === node.id && a.fid === node.owner && !a.siege); },
  majors() { return Object.keys(this.S.factions).filter((id) => id !== 'neutral'); },
  nodesOf(fid) { return this.S.nodes.filter((n) => n.owner === fid); },
  armiesOf(fid) { return this.S.armies.filter((a) => a.fid === fid); },
  season() { return SEASONS[this.S.turn % 4]; },
  year() { return this.sc.startYear + Math.floor(this.S.turn / 4); },
  isWinter() { return this.S.turn % 4 === 3; },
  fname(fid) { return this.f(fid) ? this.f(fid).name : fid; },

  log(text, type = 'info') {
    this.S.log.push({ turn: this.S.turn, text, type });
    if (this.S.log.length > 200) this.S.log.shift();
  },

  newReg(type, men) { return { type, men: men == null ? UNITS[type].men : men, exp: 0 }; },

  takeGeneral(fid) {
    const f = this.f(fid);
    if (f.pool && f.pool.length) return { ...f.pool.shift(), men: 16 };
    return { name: 'القائد ' + pick(GENERIC_NAMES), trait: R() < 0.4 ? pick(Object.keys(TRAITS)) : null, men: 16 };
  },

  createArmy(fid, nodeId) {
    const a = { id: this.S.nextId++, fid, node: nodeId, from: nodeId, general: this.takeGeneral(fid), regs: [], moved: false, siege: null };
    this.S.armies.push(a);
    return a;
  },

  removeArmy(a) {
    const i = this.S.armies.indexOf(a);
    if (i >= 0) this.S.armies.splice(i, 1);
    if (a.general && a.general.men > 0 && this.f(a.fid) && this.f(a.fid).pool) this.f(a.fid).pool.push({ name: a.general.name, trait: a.general.trait });
  },

  garrisonTarget(n) {
    const out = ['militia'];
    for (let i = 0; i < n.walls; i++) out.push(i === 1 ? 'archer' : 'militia');
    if (n.pop > 22000) out.push('spear');
    if (n.owner === 'neutral') out.push('archer');
    return out;
  },

  fillGarrison(n, full) {
    const target = this.garrisonTarget(n);
    for (let i = 0; i < target.length; i++) {
      const t = target[i];
      const max = UNITS[t].men;
      if (!n.garrison[i]) n.garrison[i] = this.newReg(t, full ? max : Math.round(max * 0.3));
      else if (!full) n.garrison[i].men = Math.min(max, n.garrison[i].men + Math.round(max * 0.12));
      else n.garrison[i].men = max;
    }
    n.garrison.length = target.length;
  },

  regPower(r) {
    const d = UNITS[r.type];
    return r.men * d.hp * (d.atk + d.def + (d.missile || 0) * 1.5 + (d.charge || 0) * 0.3) * (1 + 0.1 * (r.exp || 0)) / 100;
  },
  armyPower(a) {
    if (!a) return 0;
    let s = a.regs.reduce((t, r) => t + this.regPower(r), 0);
    if (a.general) s += this.regPower({ type: 'general', men: a.general.men || 16 }) * 1.3;
    return s;
  },
  garrisonPower(n) { return n.garrison.reduce((t, r) => t + this.regPower(r), 0); },
  defensePower(n) { return this.garrisonPower(n) + this.armyPower(this.insideArmy(n)); },
  factionPower(fid) {
    let p = 0;
    for (const a of this.armiesOf(fid)) p += this.armyPower(a);
    for (const n of this.nodesOf(fid)) p += this.garrisonPower(n) * 0.5;
    return p + (this.f(fid).gold || 0) / 8;
  },
  menOf(list) { return list.reduce((t, r) => t + r.men, 0); },

  // ——— الدبلوماسية ———
  status(a, b) {
    if (a === b) return 'self';
    if (a === 'neutral' || b === 'neutral') return 'war';
    return this.f(a).status[b] || 'peace';
  },
  atWar(a, b) { return this.status(a, b) === 'war'; },
  setStatus(a, b, st, truce = 6) {
    const A = this.f(a), B = this.f(b);
    A.status[b] = st; B.status[a] = st;
    A.warTurns[b] = 0; B.warTurns[a] = 0;
    if (st === 'peace' || st === 'alliance') { A.truce[b] = truce; B.truce[a] = truce; }
    const rel = st === 'war' ? -40 : st === 'alliance' ? 50 : 10;
    if (this.S.turn === 0) { A.rel[b] = rel; B.rel[a] = rel; }
  },
  addRel(a, b, v) {
    if (a === 'neutral' || b === 'neutral') return;
    const A = this.f(a), B = this.f(b);
    A.rel[b] = clamp((A.rel[b] || 0) + v, -100, 100);
    B.rel[a] = clamp((B.rel[a] || 0) + v, -100, 100);
  },
  rel(a, b) { return (this.f(a).rel || {})[b] || 0; },

  declareWar(a, b) {
    const A = this.f(a);
    const treachery = (A.truce[b] || 0) > 0 || this.status(a, b) === 'alliance';
    this.setStatus(a, b, 'war', 0);
    this.addRel(a, b, -30);
    if (treachery) for (const c of this.majors()) if (c !== a && c !== b) this.addRel(a, c, -12);
    this.log(`${this.fname(a)} تعلن الحرب على ${this.fname(b)}${treachery ? ' ناقضةً العهد' : ''}.`, 'war');
    // الحليف ينضم
    for (const c of this.majors()) {
      if (c !== a && c !== b && this.status(b, c) === 'alliance' && this.status(a, c) !== 'war' && this.f(c).alive) {
        this.setStatus(c, a, 'war', 0);
        this.log(`${this.fname(c)} تدخل الحرب وفاءً لحلفها مع ${this.fname(b)}.`, 'war');
      }
    }
  },

  // تقييم الذكاء لعرض ما
  aiWillAcceptPeace(ai, other, tribute = 0) {
    const pa = this.factionPower(ai), po = this.factionPower(other);
    const aggr = this.sc.factions[ai].personality.aggr * DIFFS[this.S.difficulty].aiAggr;
    let s = this.rel(ai, other) * 0.5 + (po / Math.max(1, pa) - 1) * 40 + (this.f(ai).warTurns[other] || 0) * 2 + tribute / 8 + (this.f(ai).lostRecently || 0) * 10 - aggr * 12;
    const otherWars = this.majors().filter((c) => c !== ai && c !== other && this.atWar(ai, c)).length;
    s += otherWars * 12;
    return s + (R() - 0.5) * 16 > 4;
  },
  aiWillAlly(ai, other) {
    const common = this.majors().some((c) => c !== ai && c !== other && this.atWar(ai, c) && this.atWar(other, c));
    return this.status(ai, other) === 'peace' && (this.rel(ai, other) > 60 || (this.rel(ai, other) > 30 && common));
  },

  // ——— الاقتصاد ———
  cityIncome(n) {
    if (this.besieger(n.id)) return 0;
    let g = n.pop / 1000 * 2.8 * (1 + 0.5 * n.market) * (0.4 + n.loyalty / 166);
    if (n.capital) g += 15;
    return Math.round(g);
  },
  cityFood(n) {
    if (this.besieger(n.id)) return 0;
    return Math.round(3 + n.farm * 6 + n.pop / 10000);
  },
  economy(fid) {
    let gold = 0, food = 0, upkeep = 0, eat = 0;
    for (const n of this.nodesOf(fid)) { gold += this.cityIncome(n); food += this.cityFood(n); }
    for (const a of this.armiesOf(fid)) {
      upkeep += 4;
      for (const r of a.regs) { upkeep += UNITS[r.type].upkeep || 0; eat += UNITS[r.type].cls === 'cav' ? 2 : 1; }
    }
    const f = this.f(fid);
    if (!f.isPlayer && fid !== 'neutral') gold = Math.round(gold * DIFFS[this.S.difficulty].aiIncome);
    return { gold, food, upkeep, eat, netGold: gold - upkeep, netFood: food - eat };
  },

  canRecruit(fid, node, type) {
    const d = UNITS[type];
    if (node.owner !== fid) return 'ليست مدينتك';
    if (this.besieger(node.id)) return 'المدينة محاصرة';
    if (node.loyalty < 25) return 'الولاء منخفض جداً';
    if (d.needs === 'barracks' && !node.barracks) return 'تحتاج إسطبلات وورش';
    const a = this.armyOf(fid, node.id);
    if (a && a.regs.length >= MAX_REGS) return 'الجيش مكتمل (8 وحدات)';
    const cost = d.cost + (a ? 0 : 60);
    if (this.f(fid).gold < cost) return 'الذهب لا يكفي';
    return null;
  },
  recruit(fid, node, type) {
    const err = this.canRecruit(fid, node, type);
    if (err) return err;
    let a = this.armyOf(fid, node.id);
    let cost = UNITS[type].cost;
    if (!a) { a = this.createArmy(fid, node.id); a.moved = true; cost += 60; }
    a.regs.push(this.newReg(type));
    this.f(fid).gold -= cost;
    return null;
  },
  canBuild(fid, node, b) {
    const lvl = node[b] || 0, B = BUILDINGS[b];
    if (node.owner !== fid) return 'ليست مدينتك';
    if (lvl >= B.max) return 'بلغت الحد الأعلى';
    if (this.besieger(node.id)) return 'المدينة محاصرة';
    if (node.built === this.S.turn) return 'بناء واحد لكل دور';
    if (this.f(fid).gold < B.cost(lvl)) return 'الذهب لا يكفي';
    return null;
  },
  build(fid, node, b) {
    const err = this.canBuild(fid, node, b);
    if (err) return err;
    this.f(fid).gold -= BUILDINGS[b].cost(node[b] || 0);
    node[b] = (node[b] || 0) + 1;
    node.built = this.S.turn;
    if (b === 'walls') { node.stores = Math.max(node.stores, 3 + node.walls); this.fillGarrison(node, false); }
    return null;
  },
  disband(a, idx) {
    a.regs.splice(idx, 1);
    if (!a.regs.length) this.removeArmy(a);
  },

  // ——— الحركة والمواجهات ———
  moveTargets(a) {
    if (a.moved) return [];
    const here = this.node(a.node);
    if (!a.siege && here.owner === a.fid && this.besieger(here.id)) return [];
    return this.adj(a.node).filter((id) => this.moveCheck(a, this.node(id)) == null);
  },

  moveCheck(a, n) {
    if (a.moved) return 'تحرّك هذا الدور';
    if (!this.adj(a.node).includes(n.id)) return 'ليست مجاورة';
    const here = this.node(a.node);
    if (!a.siege && here.owner === a.fid && this.besieger(here.id)) return 'المدينة محاصرة — اخرج للقتال أولاً';
    if (n.owner === a.fid) {
      const own = this.armyOf(a.fid, n.id);
      if (own && own.regs.length + a.regs.length > MAX_REGS) return 'لا يتسع الجيش هناك (8 وحدات كحد أقصى)';
      const bs = this.besieger(n.id);
      if (bs && !this.atWar(a.fid, bs.fid)) return 'محاصرة من طرف لست في حرب معه';
      return null;
    }
    const st = this.status(a.fid, n.owner);
    if (st !== 'war') return st === 'alliance' ? 'مدينة حليف' : 'بينكما سلام — أعلن الحرب أولاً';
    const bs = this.besieger(n.id);
    if (bs && bs.fid !== a.fid) return 'يحاصرها جيش آخر';
    return null;
  },

  // تُرجع وصف المواجهة أو null إذا كانت حركة عادية
  planMove(a, n) {
    const err = this.moveCheck(a, n);
    if (err) return { err };
    if (n.owner === a.fid) {
      const bs = this.besieger(n.id);
      if (bs) return { enc: this.makeEnc('relief', a, n, bs) };
      return { simple: true };
    }
    const bs = this.besieger(n.id);
    if (bs && bs.fid === a.fid) return { join: bs };
    if (n.walls > 0) return { siege: true };
    return { enc: this.makeEnc('assault', a, n) };
  },

  makeEnc(type, att, node, target) {
    const enc = { type, node: node.id, att: att.id, attFid: att.fid, kind: 'field', equip: null };
    if (type === 'assault') {
      enc.defFid = node.owner;
      const inside = this.insideArmy(node);
      enc.defArmy = inside ? inside.id : null;
      enc.garrison = true;
      if (node.walls > 0) {
        enc.kind = 'siege';
        const t = att.siege ? att.siege.turns : 0;
        enc.equip = { ram: t >= 1, ladders: t >= 1 };
      }
    } else if (type === 'relief' || type === 'sally') {
      enc.defFid = target.fid;
      enc.defArmy = target.id;
      enc.garrison = false;
      enc.withGarrison = type === 'sally';
    }
    return enc;
  },

  encSides(enc) {
    const node = this.node(enc.node);
    const att = this.army(enc.att);
    const def = enc.defArmy ? this.army(enc.defArmy) : null;
    const attRegs = att ? [...att.regs] : [];
    if (enc.withGarrison) attRegs.push(...node.garrison);
    const defRegs = def ? [...def.regs] : [];
    if (enc.garrison) defRegs.push(...node.garrison);
    return { node, att, def, attRegs, defRegs, attGen: att && att.general, defGen: def && def.general };
  },

  encPower(enc) {
    const s = this.encSides(enc);
    let pa = s.attRegs.reduce((t, r) => t + this.regPower(r), 0) + (s.attGen ? this.regPower({ type: 'general', men: s.attGen.men }) * 1.3 : 0);
    let pd = s.defRegs.reduce((t, r) => t + this.regPower(r), 0) + (s.defGen ? this.regPower({ type: 'general', men: s.defGen.men }) * 1.3 : 0);
    if (enc.kind === 'siege') pd *= 1 + 0.35 * s.node.walls * (enc.equip && enc.equip.ram ? 0.55 : 1);
    return { pa, pd };
  },

  // الحسم التلقائي
  autoResolve(enc) {
    const s = this.encSides(enc);
    const { pa, pd } = this.encPower(enc);
    const p = pa ** 1.6 / (pa ** 1.6 + pd ** 1.6 || 1);
    const attWins = R() < p;
    const [wp, lp] = attWins ? [pa, pd] : [pd, pa];
    const lossL = 0.45 + R() * 0.35;
    const lossW = clamp(0.5 * (lp / Math.max(1, wp)) * (0.6 + R() * 0.8), 0.05, 0.6);
    const apply = (regs, frac) => { for (const r of regs) r.men = Math.max(0, Math.round(r.men * (1 - frac * (0.7 + R() * 0.6)))); };
    apply(s.attRegs, attWins ? lossW : lossL);
    apply(s.defRegs, attWins ? lossL : lossW);
    const gd = (g, won) => { if (g && R() < (won ? 0.04 : 0.22)) g.men = 0; };
    gd(s.attGen, attWins); gd(s.defGen, !attWins);
    for (const r of attWins ? s.attRegs : s.defRegs) if (R() < 0.4) r.exp = Math.min(3, (r.exp || 0) + 1);
    return attWins ? 0 : 1;
  },

  // تطبيق نتيجة معركة حقيقية على كائنات الحملة
  applyBattleResult(res) {
    for (let side = 0; side < 2; side++) {
      const won = res.winner === side;
      for (const r of res.sides[side].regs) {
        if (!r.ref) continue;
        r.ref.men = r.men;
        if (won && r.kills >= 8 && r.ref.exp != null) r.ref.exp = Math.min(3, (r.ref.exp || 0) + 1);
      }
    }
  },

  // بعد حسم المعركة بأي طريقة
  async finishEncounter(enc, winner) {
    const node = this.node(enc.node);
    const att = this.army(enc.att);
    const def = enc.defArmy ? this.army(enc.defArmy) : null;
    const clean = (a) => {
      if (!a) return;
      a.regs = a.regs.filter((r) => r.men >= 5);
      if (a.general && a.general.men <= 0) {
        this.log(`سقط القائد ${a.general.name} (${this.fname(a.fid)}).`, 'war');
        a.general = null;
      }
      if (!a.general && a.regs.length) a.general = this.takeGeneral(a.fid);
    };
    clean(att); clean(def);
    node.garrison = node.garrison.filter((r) => r.men >= 5);
    const attName = this.fname(enc.attFid), defName = this.fname(enc.defFid);
    if (att && !att.regs.length) this.removeArmy(att);
    if (def && !def.regs.length) this.removeArmy(def);
    const attAlive = att && this.S.armies.includes(att);
    const defAlive = def && this.S.armies.includes(def);

    if (enc.type === 'assault') {
      if (winner === 0 && attAlive) {
        if (defAlive) this.retreat(def, [att.from]);
        await this.capture(node, att, 'battle');
        this.log(`${attName} تنتصر وتدخل ${node.name}.`, 'war');
      } else {
        if (attAlive) { att.siege = null; this.retreatTo(att, att.from); }
        this.log(`${defName} تصدّ هجوم ${attName} على ${node.name}.`, 'war');
      }
    } else {
      // فكّ حصار أو خروج للقتال
      if (winner === 0) {
        if (defAlive) { def.siege = null; this.retreatTo(def, def.from); }
        if (attAlive && att.node !== node.id) this.enterOwn(att, node);
        this.log(`${attName} تكسر حصار ${node.name}.`, 'war');
      } else {
        if (attAlive && enc.type === 'relief') this.retreatTo(att, att.node);
        this.log(`${defName} تهزم المدافعين عند ${node.name} ويستمر الحصار.`, 'war');
      }
    }
    if (att) att.moved = true;
    this.checkElimination();
  },

  enterOwn(a, n) {
    const own = this.armyOf(a.fid, n.id);
    if (own && own !== a) {
      own.regs.push(...a.regs.splice(0, MAX_REGS - own.regs.length));
      if (!a.regs.length) { this.removeArmy(a); return own; }
      return a;
    }
    a.from = a.node; a.node = n.id; a.siege = null;
    return a;
  },

  retreatTo(a, nodeId) {
    const n = this.node(nodeId);
    if (n && n.owner === a.fid && !this.besieger(n.id)) {
      a.siege = null;
      if (a.node !== n.id) this.enterOwn(a, n);
      return true;
    }
    return this.retreat(a, []);
  },

  retreat(a, avoid) {
    const opts = this.adj(a.node).map((id) => this.node(id)).filter((n) => n.owner === a.fid && !avoid.includes(n.id) && !this.besieger(n.id));
    a.siege = null;
    if (opts.length) {
      const own = opts.find((n) => !this.armyOf(a.fid, n.id)) || opts[0];
      this.enterOwn(a, own);
      return true;
    }
    this.log(`جيش ${this.fname(a.fid)} بقيادة ${a.general ? a.general.name : '—'} حوصر وأُبيد.`, 'war');
    this.removeArmy(a);
    return false;
  },

  async capture(node, a, how) {
    const old = node.owner;
    const oldF = this.f(old);
    for (const o of this.armiesAt(node.id)) if (o !== a && o.fid === old) this.retreat(o, []);
    node.owner = a.fid;
    node.capturedTurn = this.S.turn;
    node.garrison = [];
    this.fillGarrison(node, false);
    node.stores = 2;
    if (a.node !== node.id) { a.from = a.node; a.node = node.id; }
    a.siege = null;
    if (oldF && oldF.lostRecently != null) oldF.lostRecently = (oldF.lostRecently || 0) + 1;
    let choice = 'occupy';
    if (this.f(a.fid).isPlayer) choice = this.hooks.occupation ? await this.hooks.occupation(node, how) : 'occupy';
    else {
      const aggr = this.sc.factions[a.fid] ? this.sc.factions[a.fid].personality.aggr : 1;
      choice = aggr > 1.15 && R() < 0.4 ? 'sack' : 'occupy';
    }
    this.applyOccupation(node, a.fid, old, choice, how);
  },

  applyOccupation(node, fid, old, choice, how) {
    const f = this.f(fid);
    if (choice === 'sack') {
      const loot = Math.round(node.pop / 55);
      f.gold += loot;
      node.pop = Math.round(node.pop * 0.72);
      node.loyalty = 12;
      if (node.market) node.market--;
      this.addRel(fid, old, -15);
      this.log(`${f.name} تنهب ${node.name} وتغنم ${loot} ذهباً.`, 'war');
    } else if (choice === 'clemency') {
      node.loyalty = 62;
      this.addRel(fid, old, 8);
      for (const c of this.majors()) if (c !== fid) this.addRel(fid, c, 4);
      f.gold = Math.max(0, f.gold - 50);
      this.log(`${f.name} تعلن الأمان لأهل ${node.name}.`, 'info');
    } else {
      node.loyalty = how === 'surrender' ? 52 : 40;
    }
  },

  checkElimination() {
    for (const id of this.majors()) {
      const f = this.f(id);
      if (!f.alive) continue;
      if (this.nodesOf(id).length === 0) {
        f.alive = false;
        for (const a of this.armiesOf(id)) this.removeArmy(a);
        this.log(`سقطت مملكة ${f.name}!`, 'war');
      }
    }
    const S = this.S;
    const p = S.player;
    if (!this.f(p).alive || this.nodesOf(p).length === 0) S.over = 'lose';
    else {
      const rivals = this.majors().filter((id) => id !== p && this.f(id).alive);
      const share = this.nodesOf(p).length / S.nodes.length;
      if (rivals.length === 0 || share >= 0.75) S.over = 'win';
    }
  },

  // ——— التفاوض في المواجهة ———
  tryDemandSurrender(enc) {
    const { pa, pd } = this.encPower(enc);
    const ratio = pa / Math.max(1, pd);
    const s = this.encSides(enc);
    let p = clamp((ratio - 1.8) * 0.35, 0, 0.85);
    if (s.defGen && (s.defGen.trait === 'brave' || s.defGen.trait === 'stalwart')) p *= 0.5;
    if (enc.kind === 'siege') {
      if (s.node.stores <= 0) p += 0.3;
      p += (this.army(enc.att).siege ? this.army(enc.att).siege.turns : 0) * 0.05;
    }
    return R() < clamp(p, 0, 0.9);
  },
  bribeCost(enc) {
    const s = this.encSides(enc);
    const men = this.menOf(s.defRegs) + (s.defGen ? s.defGen.men : 0);
    return Math.round(men * 1.1 + (enc.type === 'assault' ? s.node.pop / 120 : 0));
  },
  tryBribe(enc) {
    const s = this.encSides(enc);
    let p = 0.55;
    if (s.defGen && (s.defGen.trait === 'brave' || s.defGen.trait === 'stalwart')) p -= 0.25;
    if (enc.type === 'assault' && s.node.capital) p -= 0.2;
    return R() < p;
  },
  async surrenderAccepted(enc, how) {
    const att = this.army(enc.att);
    const node = this.node(enc.node);
    if (enc.type === 'assault') {
      const def = enc.defArmy ? this.army(enc.defArmy) : null;
      if (def) this.retreat(def, [att.from]);
      att.moved = true;
      await this.capture(node, att, how);
      this.log(`${node.name} تفتح أبوابها لـ${this.fname(att.fid)} دون قتال.`, 'info');
    } else {
      const def = this.army(enc.defArmy);
      if (def) { def.siege = null; this.retreatTo(def, def.from); }
      att.moved = true;
      if (att.node !== node.id) this.enterOwn(att, node);
      this.log(`جيش ${this.fname(enc.defFid)} ينسحب من ${node.name}.`, 'info');
    }
    this.checkElimination();
  },

  // ——— نهاية الجولة ———
  endRound() {
    const S = this.S;
    const events = [];
    // الحصار
    for (const a of [...S.armies]) {
      if (!a.siege) continue;
      const n = this.node(a.node);
      if (n.owner === a.fid) { a.siege = null; continue; }
      a.siege.turns++;
      n.stores--;
      if (n.stores < 0) {
        for (const r of n.garrison) r.men = Math.round(r.men * 0.85);
        const ins = this.insideArmy(n);
        if (ins) for (const r of ins.regs) r.men = Math.round(r.men * 0.88);
        n.loyalty = Math.max(0, n.loyalty - 8);
        if (this.f(n.owner) && this.f(n.owner).isPlayer) events.push(`المجاعة تفتك بالمحاصَرين في ${n.name}!`);
      }
      if (this.isWinter()) for (const r of a.regs) r.men = Math.round(r.men * 0.95);
    }
    for (const id of Object.keys(S.factions)) {
      const f = S.factions[id];
      if (!f.alive) continue;
      const e = this.economy(id);
      if (id === 'neutral') continue;
      f.gold += e.netGold;
      f.food += e.netFood;
      if (f.food < 0) {
        f.food = 0;
        for (const a of this.armiesOf(id)) for (const r of a.regs) r.men = Math.round(r.men * 0.94);
        if (f.isPlayer) events.push('نفد الطعام! جيوشك تخسر رجالاً كل دور. ابنِ مزارع أو قلّل الجيوش.');
      }
      f.food = Math.min(f.food, 300);
      if (f.gold < 0) {
        const armies = this.armiesOf(id).filter((a) => a.regs.length);
        if (armies.length) {
          const a = armies.sort((x, y) => y.regs.length - x.regs.length)[0];
          const r = a.regs.pop();
          if (f.isPlayer) events.push(`الخزينة فارغة: تسرّحت وحدة ${UNITS[r.type].name}.`);
          if (!a.regs.length) this.removeArmy(a);
        }
      }
      for (const k in f.truce) if (f.truce[k] > 0) f.truce[k]--;
      for (const k in f.warTurns) if (this.atWar(id, k)) f.warTurns[k]++;
      f.lostRecently = Math.max(0, (f.lostRecently || 0) - 0.25);
    }
    // المدن
    for (const n of S.nodes) {
      const bs = this.besieger(n.id);
      if (!bs) {
        this.fillGarrison(n, false);
        n.stores = Math.min(3 + n.walls + n.farm * 2, n.stores + 1);
        if (n.farm) n.pop = Math.round(n.pop * 1.012);
        n.pop = Math.round(n.pop * 1.006);
      }
      const army = this.insideArmy(n);
      if (n.owner !== 'neutral') {
        let target = 70 + (n.capital ? 10 : 0) + (army ? 10 : 0) + n.market * 3;
        if (n.origOwner !== n.owner && S.turn - n.capturedTurn < 10) target -= 28;
        if (this.f(n.owner).gold < 0) target -= 10;
        n.loyalty = Math.round(n.loyalty + clamp(target - n.loyalty, -5, 4));
        if (n.loyalty < 20 && !bs && R() < 0.3) {
          if (army) {
            const loss = 0.15;
            for (const r of army.regs) r.men = Math.round(r.men * (1 - loss));
            n.loyalty += 15;
            if (this.f(n.owner).isPlayer) events.push(`تمرّد في ${n.name}! أخمده جيشك بخسائر.`);
          } else {
            const prev = n.owner;
            n.owner = 'neutral';
            n.loyalty = 60;
            n.garrison = [];
            this.fillGarrison(n, true);
            this.log(`ثار أهل ${n.name} وطردوا حكّام ${this.fname(prev)}.`, 'war');
            if (this.f(prev).isPlayer) events.push(`ثورة! خسرت ${n.name} لأن الولاء انهار. اترك جيشاً في المدن المحتلة حديثاً.`);
          }
        }
      }
    }
    // استسلام المدن الجائعة للذكاء
    for (const a of [...S.armies]) {
      if (!a.siege) continue;
      const n = this.node(a.node);
      if (n.stores < 0 && !this.f(n.owner).isPlayer && this.defensePower(n) < this.armyPower(a) * 0.9 && R() < 0.35) {
        this.pendingSurrenders = this.pendingSurrenders || [];
        this.pendingSurrenders.push({ army: a.id, node: n.id });
      }
    }
    for (const a of S.armies) {
      a.moved = false;
      if (a.general) a.general.men = 16;
      if (!this.besieger(a.node) && this.node(a.node).owner === a.fid) {
        for (const r of a.regs) r.men = Math.min(UNITS[r.type].men, r.men + Math.ceil(UNITS[r.type].men * 0.1));
      }
    }
    S.turn++;
    this.checkElimination();
    return events;
  },
};
