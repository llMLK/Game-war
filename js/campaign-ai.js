'use strict';
// تنفيذ الحركات والمواجهات + ذكاء الممالك: أهداف قصيرة ومتوسطة وطويلة المدى

Object.assign(Game, {
  // opts.declare: السماح بإعلان الحرب إن كانت الوجهة لمملكة في سلام
  async executeMove(a, targetId, opts = {}) {
    let plan = this.planMove(a, targetId);
    if (plan.err) return { err: plan.err };
    if (plan.needWar) {
      if (!opts.declare) return { needWar: plan.needWar };
      this.declareWar(a.fid, plan.needWar, opts.why || 'بهجوم مباشر');
      plan = this.planMove(a, targetId);
      if (plan.err || plan.needWar) return { err: plan.err || 'تعذّر الهجوم' };
    }
    const n = plan.node;
    const fromName = this.node(a.node).name;
    const snap = { node: a.node, from: a.from, mp: a.mp, siege: a.siege };
    this.moveAlong(a, plan);
    switch (plan.kind) {
      case 'move':
        a.from = a.node; a.node = n.id;
        if (!this.f(a.fid).isPlayer && (a.regs.length >= 4 || this.adjAll(n.id).some((x) => this.node(x).owner === this.S.player))) {
          this.event('mil', `تحرّك جيش ${this.fname(a.fid)} بقيادة ${this.gname(this.armyGen(a))} (${this.menOf(a.regs)} رجل) من ${fromName} إلى ${n.name}.`, { fids: [a.fid], node: n.id, imp: 1 });
        }
        break;
      case 'join': {
        const host = this.besiegers(n.id).find((b) => b.fid === a.fid);
        a.node = n.id; a.siege = { turns: host.siege.turns, from: a.from }; a.mp = 0;
        this.event('mil', `تعزيزات ${this.fname(a.fid)} تنضم إلى حصار ${n.name}.`, { fids: [a.fid, n.owner], node: n.id, imp: 1 });
        break;
      }
      case 'siege': this.startSiege(a, n); break;
      case 'assault':
      case 'relief': {
        let enc;
        if (plan.kind === 'assault') enc = this.makeEnc('assault', [a], n.id);
        else {
          const hostile = this.besiegers(n.id).filter((b) => this.atWar(b.fid, a.fid));
          enc = this.makeEnc('relief', [a], n.id, hostile.filter((b) => b.fid === hostile[0].fid));
        }
        const r = await this.resolveEnc(enc);
        if (r === 'cancel') { Object.assign(a, snap); return { cancel: true }; }
        break;
      }
    }
    this.validate();
    return { ok: true, kind: plan.kind };
  },

  async resolveEnc(enc) {
    const p = this.S.player;
    const involved = enc.attFid === p || enc.defFid === p;
    let out;
    if (involved && this.hooks.encounter) {
      out = await this.hooks.encounter(enc);
      if (out === 'settled' || out === 'cancel') return out;
    } else out = this.autoResolve(enc);
    await this.finishEncounter(enc, out);
    return out.winner;
  },

  hops(from, to, maxD = 8) {
    if (from === to) return 0;
    const seen = new Set([from]);
    let layer = [from];
    for (let d = 1; d <= maxD; d++) {
      const next = [];
      for (const id of layer) for (const x of this.adjAll(id)) {
        if (x === to) return d;
        if (!seen.has(x)) { seen.add(x); next.push(x); }
      }
      layer = next;
    }
    return 99;
  },
});

const CampaignAI = {
  pers(fid) {
    const p = Game.pers(fid);
    return { aggr: p.aggr * DIFFS[Game.S.difficulty].aiAggr, honor: p.honor, prefs: p.prefs };
  },
  enemyNear(n, fid) { return Game.adjAll(n.id).map((id) => Game.node(id)).filter((m) => m.owner !== fid && Game.atWar(fid, m.owner)); },
  threat(n, fid) {
    let t = 0;
    for (const id of [n.id, ...Game.adjAll(n.id)]) {
      for (const a of Game.armiesAt(id)) if (Game.atWar(fid, a.fid) && a.fid !== 'neutral') t += Game.armyPower(a) * (id === n.id ? 1.3 : 1);
    }
    return t;
  },
  frontier(n, fid) {
    const seen = new Set([n.id]);
    let layer = [n.id], d = 0;
    while (layer.length && d < 6) {
      for (const id of layer) { const m = Game.node(id); if (m.owner !== fid && Game.atWar(fid, m.owner)) return 30 - d * 5; }
      const next = [];
      for (const id of layer) for (const x of Game.adjAll(id)) if (!seen.has(x)) { seen.add(x); next.push(x); }
      layer = next; d++;
    }
    return 0;
  },
  fieldArmies(fid) { return Game.armiesOf(fid).filter((a) => a.role !== 'governor'); },

  async turn(fid) {
    const f = Game.f(fid);
    if (!f || !f.alive || f.neutral) return;
    this.planGoals(fid);
    await this.diplomacy(fid);
    this.economy(fid);
    await this.generals(fid);
    this.recruit(fid);
    this.spendHoard(fid);
    await this.military(fid);
    Game.validate();
  },

  // ------، الأهداف -------
  planGoals(fid) {
    const f = Game.f(fid), pers = this.pers(fid);
    const mine = Game.nodesOf(fid);
    const armies = this.fieldArmies(fid);
    const myPow = armies.reduce((s, a) => s + Game.armyPower(a), 0);
    let best = null, bs = 0;
    // الممالك بلا مدن (الغزاة، المتمردون في الميدان) تقيس المسافة من جيوشها
    const origins = mine.length ? mine.map((m) => m.id) : armies.map((a) => a.node);
    if (!origins.length) { f.goals = null; return; }
    for (const n of Game.S.nodes) {
      if (n.owner === fid || Game.friendly(n.owner, fid)) continue;
      const d = Math.min(...origins.map((id) => Game.hops(id, n.id, 3)));
      if (d > 2) continue;
      const st = Game.status(fid, n.owner);
      const truce = (f.truce[n.owner] || 0) > 0;
      if (truce && !(f.vendetta[n.owner] > 0)) continue;
      const def = Game.defensePower(n) * (1 + 0.25 * n.walls);
      const near = armies.filter((a) => Game.hops(a.node, n.id, 3) <= 2).reduce((s, a) => s + Game.armyPower(a), 0);
      if (near < def * 0.6) continue;
      let v = n.pop / 1000 + (n.capital ? 15 : 0) + (f.claims.includes(n.id) ? 12 : 0) + (n.owner === 'neutral' ? 6 : 0);
      if (Game.defendersOf(n).length === 0) v += 8;
      if (f.vendetta[n.owner] > 0) v += 10;
      const dom = Game.dominant();
      if (dom && n.owner === dom && dom !== fid) v += 6;
      let s = v * Math.min(3, near / Math.max(1, def)) / d;
      if (st !== 'war') s *= 0.55 * pers.aggr;
      if (s > bs) { bs = s; best = n; }
    }
    const old = f.goals && f.goals.target && Game.node(f.goals.target);
    if (old && old.owner !== fid && !Game.friendly(old.owner, fid) && Game.S.turn - f.goals.since < 6 && best && bs < (f.goals.score || 0) * 1.5) return;
    if (best && (!f.goals || f.goals.target !== best.id)) f.goalShifts = (f.goalShifts || 0) + 1;
    f.goals = best ? { target: best.id, owner: best.owner, score: bs, since: Game.S.turn, kind: f.claims.includes(best.id) ? 'reclaim' : Game.defendersOf(best).length ? 'expand' : 'opportunity', myPow } : null;
  },

  // ------، الدبلوماسية -------
  async diplomacy(fid) {
    const f = Game.f(fid), pers = this.pers(fid);
    const pw = Game.factionPower(fid);
    const dom = Game.dominant();
    const wars = Game.aliveMajors().filter((c) => c !== fid && Game.atWar(fid, c));
    let acted = 0;
    for (const g of Game.aliveMajors()) {
      if (g === fid || acted >= 2 || Game.S.over) continue;
      const st = Game.status(fid, g);
      const G = Game.f(g);
      const pg = Game.factionPower(g);
      // الالتزام بالهدف المشترك: لا صلح مع صاحب المدينة المتفق عليها، ولا فضّ لحلف الشريك
      const pact = Game.pactFor ? (Game.S.pacts || []).find((p) => p.status === 'active' && (p.b === fid || p.a === fid) && (p.owner === g || p.a === g || p.b === g)) : null;
      if (st === 'war') {
        if (pact && pact.owner === g) continue;
        const wt = f.warTurns[g] || 0;
        const tired = wt > 4 && (pw < pg * 0.75 || (f.lostRecently || 0) >= 1 || wars.length >= 2 || (wt > 12 && R() < 0.2));
        if (tired && R() < 0.35 && !(f.vendetta[g] > 0)) {
          const tribute = pw < pg * 0.55 ? Math.min(Math.max(0, f.gold), 150) : 0;
          if (G.isPlayer) {
            const ok = Game.hooks.proposal ? await Game.hooks.proposal({ from: fid, kind: 'peace', tribute }) : false;
            if (ok) { if (tribute) { f.gold -= tribute; G.gold += tribute; } Game.makePeace(fid, g, 8); }
            else Game.addRel(fid, g, -5);
          } else if (Game.aiWillAcceptPeace(g, fid, tribute)) {
            if (tribute) { f.gold -= tribute; G.gold += tribute; }
            Game.makePeace(fid, g, 8);
          }
          acted++;
        }
        continue;
      }
      // الغزاة لا يعقدون تجارة ولا مصاهرة ولا أحلافاً: حرب أو صلح بجزية
      if (f.kind === 'horde' || G.kind === 'horde') continue;
      // كسر حلف لم يعد مفيداً
      if (st === 'alliance') {
        const since = (f.allySince || {})[g] || 0;
        const useless = !Game.commonEnemy(fid, g) && Game.S.turn - since > 10;
        if (!pact && (dom === g || (useless && Game.rel(fid, g) < 30)) && R() < 0.2 && (f.truce[g] || 0) <= 0) {
          Game.breakAlliance(fid, g, dom === g ? 'خوفاً من تعاظم قوتها' : 'لم يعد للحلف غاية');
          acted++;
          continue;
        }
        if (Game.atWar(g, wars[0]) && f.gold > 900 && R() < 0.25) { Game.subsidy(fid, g, 150); acted++; }
        continue;
      }
      // حرب لتحقيق الهدف، أو لكسر الجمود
      if ((f.truce[g] || 0) > 0 && !(f.vendetta[g] > 0)) continue;
      const goalOwner = f.goals && f.goals.owner === g;
      const bored = (Game.S.peaceTurns || 0) >= 4 || Game.S.turn - (f.lastWarTurn || 0) > 10;
      const neighbor = Game.borders(fid, g);
      if (Game.isVassalOf && (Game.isVassalOf(fid, g) || Game.isVassalOf(g, fid))) continue;
      const wantWar = (neighbor || dom === g) && (wars.length < 2 || dom === g) && Game.S.turn > 3 && (
        (goalOwner && pw > pg * 0.8 && R() < 0.35 * pers.aggr) ||
        (bored && pw > pg * 0.9 && Game.rel(fid, g) < 30 && R() < 0.25 * pers.aggr) ||
        (f.vendetta[g] > 0 && pw > pg * 0.7 && R() < 0.5) ||
        (dom === g && !Game.atWar(fid, g) && R() < 0.35)
      );
      if (wantWar && (Game.treaty(fid, g).marriage ? R() < 0.25 / pers.honor : true)) {
        Game.declareWar(fid, g, f.vendetta[g] > 0 ? 'ثأراً لقائدها' : dom === g ? 'لكبح هيمنتها' : f.claims.some((id) => Game.node(id).owner === g) ? 'لاستعادة أرضها' : 'طمعاً في أرضها');
        acted++;
        continue;
      }
      // جزية من الأضعف
      if (G.isPlayer ? R() < 0.08 : R() < 0.1) {
        if (pw > pg * 1.8 && neighbor && !Game.S.tributes.some((t) => t.payer === g)) {
          const amount = Game.tributeAmount(g);
          let ok;
          if (G.isPlayer) ok = Game.hooks.proposal ? await Game.hooks.proposal({ from: fid, kind: 'tribute', amount }) : false;
          else ok = Game.aiWillPayTribute(g, fid);
          if (ok) Game.addTribute(g, fid, amount, 8);
          else {
            Game.addRel(fid, g, -15);
            Game.event('pol', `${G.name} ترفض دفع الجزية لـ${f.name}.`, { fids: [fid, g], imp: 2 });
            if (R() < 0.45 * pers.aggr) Game.declareWar(fid, g, 'بعد رفض الجزية');
          }
          acted++;
          continue;
        }
      }
      // حلف، تجارة، مصاهرة
      if (st === 'peace' && Game.aiWillAlly(fid, g) && R() < 0.2) {
        const ok = G.isPlayer ? (Game.hooks.proposal ? await Game.hooks.proposal({ from: fid, kind: 'alliance' }) : false) : Game.aiWillAlly(g, fid);
        if (ok) Game.makeAlliance(fid, g);
        acted++;
        continue;
      }
      if (!Game.treaty(fid, g).trade && Game.aiWillTrade(fid, g) && R() < 0.25) {
        const ok = G.isPlayer ? (Game.hooks.proposal ? await Game.hooks.proposal({ from: fid, kind: 'trade' }) : false) : Game.aiWillTrade(g, fid);
        if (ok) Game.setTrade(fid, g, true);
        acted++;
        continue;
      }
      if (f.gold > 700 && Game.aiWillMarry(fid, g) && R() < 0.06 * pers.honor) {
        const ok = G.isPlayer ? (Game.hooks.proposal ? await Game.hooks.proposal({ from: fid, kind: 'marriage' }) : false) : Game.aiWillMarry(g, fid);
        if (ok) Game.marry(fid, g);
        acted++;
      }
    }
  },

  // ------، الاقتصاد -------
  economy(fid) {
    const f = Game.f(fid);
    const nodes = Game.nodesOf(fid);
    if (!nodes.length) return;
    const avgLoy = nodes.reduce((s, n) => s + n.loyalty, 0) / nodes.length;
    const e = Game.economy(fid);
    if (avgLoy < 42 || nodes.filter((n) => n.loyalty < 30).length >= 2) f.tax = 'low';
    else if ((f.gold < 200 || e.netGold < 0) && avgLoy > 60) f.tax = 'high';
    else if (avgLoy > 55) f.tax = 'normal';
    for (const n of nodes) if (n.loyalty < 30 && f.gold > 250 && !Game.canFestival(fid, n)) Game.festival(fid, n);
    // الخزائن المتخمة تُنفق: تكريم القادة الساخطين
    if (f.gold > 1400 && Game.honorGeneral) {
      const g = Game.gensOf(fid).filter((x) => ['army', 'gov'].includes(x.status) && x.loy < 55 && !Game.isRuler(x)).sort((a, b) => a.loy - b.loy)[0];
      if (g) Game.honorGeneral(fid, g);
    }
    this.build(fid);
    // التجسس والتخريب على الهدف
    if (f.gold > 800 && f.goals && Game.atWar(fid, f.goals.owner) && f.goals.owner !== 'neutral' && R() < 0.3) {
      const kind = Game.besiegers(f.goals.target).some((b) => b.fid === fid) ? 'sabotage' : 'incite';
      Game.spy(fid, f.goals.owner, kind);
    }
  },

  build(fid) {
    const f = Game.f(fid);
    if (f.gold < 380) return;
    const eco = Game.economy(fid);
    let best = null, bs = 0;
    for (const n of Game.nodesOf(fid)) {
      if (Game.canBuild(fid, n, 'market') === 'غير مستقرة') continue;
      const fr = this.frontier(n, fid);
      const opts = {
        walls: fr >= 25 && n.walls < 2 ? 3 + (n.capital ? 2 : 0) : n.capital && n.walls < 3 ? 1.5 : (f.gold > 1500 && fr >= 25 && n.walls < 3 ? 2 : 0),
        barracks: !n.barracks && (n.capital || fr >= 25) ? 3.5 : 0,
        market: n.market < 3 ? n.pop / 9000 : 0,
        farm: n.farm < 2 && eco.netFood < 5 ? 3.2 : 0,
        granary: fr >= 25 && n.walls >= 2 && n.granary < 1 ? 1.8 : 0,
        roads: !n.roads && n.capital ? 1.2 : 0,
      };
      for (const k in opts) {
        if (!opts[k] || Game.canBuild(fid, n, k)) continue;
        if (f.gold - BUILDINGS[k].cost(n[k] || 0) < 150) continue;
        if (opts[k] > bs) { bs = opts[k]; best = [n, k]; }
      }
    }
    if (best) Game.build(fid, best[0], best[1]);
    if (best && f.gold > 1200) this.build(fid);
  },

  // ------، القادة والأسرى -------
  pickGeneral(fid, role) {
    const pool = Game.poolOf(fid).filter((g) => !g.name.startsWith('الضابط'));
    if (!pool.length) return null;
    const want = { siege: ['siege', 'tactician'], defend: ['defender', 'archer'], field: ['tactician', 'cavalier', 'brave', 'swift', 'archer'], governor: ['merchant'], elite: ['elite'] }[role] || [];
    const sc = (g) => g.rank * 2 + (want.includes(g.trait) ? 5 - want.indexOf(g.trait) : 0) - (g.flaw ? 1 : 0) - (g.trait === 'merchant' && role !== 'governor' ? 4 : 0);
    return pool.sort((a, b) => sc(b) - sc(a))[0];
  },

  async generals(fid) {
    const f = Game.f(fid);
    // حاكم إداري في العاصمة
    const cap = Game.nodesOf(fid).find((n) => n.capital) || Game.nodesOf(fid)[0];
    if (cap && f.gold > 650 && !Game.merchantAt(cap)) {
      const g = this.pickGeneral(fid, 'governor');
      if (g && g.trait === 'merchant' && !Game.canHire(fid, g, cap)) { const r = Game.hire(fid, g.id, cap.id); if (r.army) r.army.role = 'governor'; }
    }
    // قائد نخبة يقيم في مدينة بها إسطبلات لتجنيد وحدة الحضارة
    if (f.gold > 900 && !Game.armiesOf(fid).some((a) => Game.hasTrait(a, 'elite'))) {
      const g = Game.poolOf(fid).find((x) => x.trait === 'elite');
      const site = Game.nodesOf(fid).filter((n) => n.barracks && n.unrest === 0).sort((a, b) => this.frontier(b, fid) - this.frontier(a, fid))[0];
      if (g && site) Game.hire(fid, g.id, site.id);
    }
    // الأسرى لدينا
    for (const g of Game.captivesHeldBy(fid)) {
      const owner = Game.f(g.fid);
      const pers = this.pers(fid);
      if (!owner || !owner.alive) { if (!Game.tryRecruitCaptive(g, fid) && R() < 0.2) Game.exileCaptive(g, fid); continue; }
      if (f.vendetta[g.fid] > 0 && g.rank >= 2 && R() < 0.3) { Game.executeCaptive(g, fid); continue; }
      if (pers.honor < 0.9 && g.rank >= 2 && g.trait && Game.atWar(fid, g.fid) && R() < 0.04) { Game.executeCaptive(g, fid); continue; }
      if (g.flaw === 'disloyal' && R() < 0.4) { Game.tryRecruitCaptive(g, fid); continue; }
      if (!Game.atWar(fid, g.fid) && R() < 0.25) { Game.releaseCaptive(g, fid); continue; }
      if (Game.S.turn - g.since < 1 || R() > 0.35) continue;
      // تبادل أو فدية
      const mineHeld = Game.captivesHeldBy(g.fid).filter((x) => x.fid === fid)[0];
      const price = Game.ransomPrice(g);
      if (owner.isPlayer) {
        if (!Game.hooks.proposal) continue;
        if (mineHeld) {
          const ok = await Game.hooks.proposal({ from: fid, kind: 'exchange', gen: g, theirs: mineHeld });
          if (ok) Game.exchangeCaptives(g, mineHeld);
        } else {
          const ok = await Game.hooks.proposal({ from: fid, kind: 'ransom', gen: g, price });
          if (ok && owner.gold >= price) Game.ransomCaptive(g, fid, price);
        }
      } else if (mineHeld) Game.exchangeCaptives(g, mineHeld);
      else if (owner.gold > price * 1.4 && (g.rank >= 2 || R() < 0.5)) Game.ransomCaptive(g, fid, price);
    }
    // قادتنا الأسرى لدى غيرنا: نفتدي القيّمين
    for (const g of Game.gensOf(fid).filter((x) => x.status === 'captive')) {
      const captor = Game.f(g.captor);
      if (!captor || captor.isPlayer) continue;
      const price = Game.ransomPrice(g);
      if (f.gold > price * 1.5 && g.rank >= 2 && R() < 0.3) Game.ransomCaptive(g, g.captor, price);
    }
  },

  // ------، التجنيد -------
  pickUnit(fid, n, army) {
    const w = { ...this.pers(fid).prefs };
    for (const t of Object.keys(w)) if (UNITS[t].needs === 'barracks' && !n.barracks) delete w[t];
    const u = UNIQUE_OF[fid];
    if (u && Game.recruitableTypes(fid, n).includes(u)) w[u] = 2.5;
    let cav = 0, arch = 0, walls = 0;
    for (const m of this.enemyNear(n, fid)) {
      walls += m.walls;
      for (const a of Game.armiesAt(m.id)) for (const r of a.regs) {
        if (UNITS[r.type].cls === 'cav') cav++;
        if (UNITS[r.type].range) arch++;
      }
    }
    if (cav >= 2 && w.spear) w.spear *= 2;
    if (arch >= 3) { if (w.cavalry) w.cavalry *= 1.5; if (w.sword) w.sword *= 1.5; }
    const has = (t) => (army ? army.regs.filter((r) => r.type === t).length : 0);
    if (!has('archer') && w.archer) w.archer *= 2;
    if (!has('spear') && w.spear) w.spear *= 1.5;
    if (['forest', 'mountains'].includes(n.terrain)) { if (w.cavalry) w.cavalry *= 0.6; if (w.sword) w.sword *= 1.3; }
    if (['plains', 'desert'].includes(n.terrain)) { if (w.cavalry) w.cavalry *= 1.3; if (w.horsearcher) w.horsearcher *= 1.3; }
    if (w.catapult) { if (walls < 2 || has('catapult') >= 1) delete w.catapult; else w.catapult *= 1.5; }
    return weightedPick(w);
  },

  recruit(fid) {
    const f = Game.f(fid);
    let net = Game.economy(fid).netGold;
    const goal = f.goals && Game.node(f.goals.target);
    const prio = (n) => this.frontier(n, fid) + (n.capital ? 6 : 0) + (goal ? 12 - 4 * Game.hops(n.id, goal.id, 3) : 0) + (this.threat(n, fid) > Game.defensePower(n) ? 15 : 0);
    const cities = Game.nodesOf(fid).filter((n) => !Game.besieger(n.id)).sort((a, b) => prio(b) - prio(a));
    let loops = 0;
    for (const n of cities) {
      if (loops > 14) break;
      // لا تجنيد فوق قدرة الإمداد: الجيوش المكدسة تموت جوعاً بلا غاية
      if (Game.stackAt(n, fid) >= Game.supplyCap(n, fid)) continue;
      let a = Game.targetArmy(fid, n);
      const cap = Math.max(2, Math.ceil(Game.nodesOf(fid).length / 2)) + Math.floor(f.gold / 800) + 1;
      if (!a) {
        if (this.fieldArmies(fid).length >= cap || f.gold < 380 || n.unrest > 0 || n.manpower < 120) continue;
        if (prio(n) < 18 && !(n.manpower > 250 && f.gold > 500)) continue;
        const role = goal && goal.walls >= 2 && Game.hops(n.id, goal.id, 3) <= 2 ? 'siege' : this.threat(n, fid) > Game.defensePower(n) ? 'defend' : 'field';
        const g = this.pickGeneral(fid, role) || Game.officer(fid);
        const r = Game.hire(fid, g.id, n.id);
        if (!r.army) continue;
        a = r.army;
      }
      while (loops++ < 14) {
        const reserve = net < 0 ? 250 : 90;
        if (f.gold < reserve + 60 || net < -15) break;
        a = Game.targetArmy(fid, n);
        if (!a) break;
        const type = this.pickUnit(fid, n, a);
        const err = Game.canRecruit(fid, n, type, a.id);
        if (err) {
          // القوى البشرية نفدت أو المدينة مضطربة: مرتزقة عند الخطر
          if ((err.startsWith('القوى') || err.startsWith('غير مستقرة')) && f.gold > 600 && this.threat(n, fid) > Game.defensePower(n) * 0.8 && f.mercs.length) {
            if (!Game.hireMerc(fid, n, 0, a.id)) { net -= 8; continue; }
          }
          if (err === 'الذهب لا يكفي') continue;
          break;
        }
        if (f.gold - UNITS[type].cost < reserve) break;
        Game.recruit(fid, n, type, a.id);
        net -= UNITS[type].upkeep;
      }
    }
  },

  // خزينة متخمة في زمن الحرب: المرتزقة لا يحتاجون قوى بشرية
  spendHoard(fid) {
    const f = Game.f(fid);
    if (f.gold < 1500 || !f.mercs || !f.mercs.length) return;
    if (!Game.aliveMajors().some((o) => o !== fid && Game.atWar(fid, o))) return;
    const site = Game.nodesOf(fid).filter((n) => !Game.besieger(n.id)).sort((a, b) => this.frontier(b, fid) - this.frontier(a, fid))[0];
    if (!site) return;
    for (let i = 0; i < 2 && f.gold > 1200 && f.mercs.length; i++) {
      const a = Game.targetArmy(fid, site);
      if (!a || Game.hireMerc(fid, site, 0, a.id)) break;
    }
  },

  // ------، الجيوش -------
  async military(fid) {
    const f = Game.f(fid);
    const pers = this.pers(fid);
    const goal = f.goals && Game.node(f.goals.target);
    const list = this.fieldArmies(fid).filter((a) => a.mp > 0)
      .sort((x, y) => (this.frontier(Game.node(y.node), fid) - this.frontier(Game.node(x.node), fid)) || (Game.armyPower(y) - Game.armyPower(x)));
    for (const a of list) {
      if (!Game.S.armies.includes(a) || a.mp <= 0 || Game.S.over) continue;
      const pow = Game.armyPower(a);
      const here = Game.node(a.node);

      if (a.siege) {
        const enc = Game.makeEnc('assault', Game.besiegers(here.id).filter((b) => b.fid === fid), here.id);
        const { pa, pd } = Game.encPower(enc);
        const ratio = pa / Math.max(1, pd);
        const canBreach = here.walls === 0 || (enc.equip && (enc.equip.ram || enc.equip.tower)) || enc.att.some((id) => Game.army(id).regs.some((r) => r.type === 'catapult'));
        const lead = Game.besiegers(here.id).find((b) => b.fid === fid);
        if (lead !== a) { a.mp = 0; continue; }
        // الغزاة لا يطيلون الحصار الميؤوس منه: يبحثون عن فريسة أضعف
        if (f.kind === 'horde' && ratio < 0.7) {
          const reach = Game.reach(a);
          const prey = Object.keys(reach).map((id) => Game.node(id)).filter((n) => { const pl = Game.planMove(a, n.id); return !pl.err && !pl.needWar && (pl.kind === 'siege' || pl.kind === 'assault'); })
            .sort((x, y) => Game.defensePower(x) - Game.defensePower(y))[0];
          if (prey && Game.defensePower(prey) < pow * 1.2) { await Game.executeMove(a, prey.id); continue; }
        }
        // هدف مشترك قريب: حصار جانبي طويل يُرفع ليفي الحليف بوعده، إلا إن كان الاقتحام وشيكاً
        if (goal && f.goals.kind === 'pact' && here.id !== goal.id && Game.hops(here.id, goal.id, 3) <= 2 && Game.passDist(fid, goal.id) < 99 && here.stores > 1 && !(ratio > 1.4 / pers.aggr && canBreach)) {
          for (const b of Game.besiegers(here.id).filter((x) => x.fid === fid)) Game.retreatHome(b, [], null, b.siege.from);
          Game.event('mil', `${f.name} ترفع الحصار عن ${here.name} لتلحق بالهدف المشترك في ${goal.name}.`, { fids: [fid, here.owner], node: here.id, imp: 2 });
          continue;
        }
        // مدينة جائعة: عرض الأمان قبل الاقتحام
        if (here.stores < 0 && here.parley !== Game.S.turn) {
          here.parley = Game.S.turn;
          const owner = Game.f(here.owner);
          let ok;
          if (owner.isPlayer) ok = Game.hooks.proposal ? await Game.hooks.proposal({ from: fid, kind: 'surrender', node: here }) : false;
          else ok = Game.tryDemandSurrender(enc);
          if (ok) { await Game.surrenderAccepted(enc, 'surrender'); continue; }
        }
        if (ratio > 1.4 / pers.aggr && canBreach) await Game.resolveEnc(enc);
        else if (ratio < 0.45 || (f.food <= 0 && a.siege.turns > 3 && ratio < 1)) {
          for (const b of Game.besiegers(here.id).filter((x) => x.fid === fid)) { Game.retreatHome(b, [], null, b.siege.from); b.mp = 0; }
          Game.event('mil', `${f.name} ترفع الحصار عن ${here.name}.`, { fids: [fid, here.owner], node: here.id, imp: 2 });
        } else a.mp = 0;
        continue;
      }

      const hostileB = Game.besiegers(here.id).filter((b) => Game.atWar(b.fid, fid));
      if (hostileB.length && Game.friendly(here.owner, fid)) {
        const inside = Game.defendersOf(here).filter((d) => d.fid === fid);
        const enc = Game.makeEnc('sally', inside, here.id, hostileB.filter((b) => b.fid === hostileB[0].fid));
        const { pa, pd } = Game.encPower(enc);
        if (pa / Math.max(1, pd) > 1.15 && inside[0] === a) await Game.resolveEnc(enc);
        a.mp = 0;
        continue;
      }

      const reach = Game.reach(a);
      // جيش شبه فارغ: يعود إلى مدينة فيها رجال ليجنّد
      if (a.regs.length < 2) {
        const canHere = here.owner === fid && here.manpower >= 60 && here.unrest === 0;
        if (!canHere) {
          const home = Object.keys(reach).map((id) => Game.node(id)).filter((n) => n.owner === fid && n.manpower >= 60 && n.unrest === 0 && Game.planMove(a, n.id).kind === 'move')
            .sort((x, y) => y.manpower - x.manpower)[0];
          if (home) { await Game.executeMove(a, home.id); continue; }
        }
        if (here.owner === fid) { a.mp = 0; continue; }
      }
      const thr = this.threat(here, fid);
      const guard = Game.garrisonPower(here) + Game.defendersOf(here).filter((d) => d !== a).reduce((s, d) => s + Game.armyPower(d), 0);
      const homeAtRisk = here.owner === fid && thr > guard * 1.2 && (here.capital || thr > guard * 2);
      // مدينة فُتحت للتو والعدو قريب: الجيش يثبّت الفتح بدل أن يتركها بحامية هزيلة
      if (here.owner === fid && Game.S.turn - (here.capturedTurn || -99) <= 2 && thr > Game.garrisonPower(here) * 0.8 && !Game.defendersOf(here).some((d) => d !== a && d.fid === fid)) { a.mp = 0; continue; }

      let best = null, bestScore = 0, bestPlan = null;
      for (const id in reach) {
        const n = Game.node(id);
        const plan = Game.planMove(a, id);
        if (plan.err) continue;
        if (plan.needWar) continue;
        let score = 0;
        if (plan.kind === 'relief') {
          const hostile = Game.besiegers(n.id).filter((b) => Game.atWar(b.fid, fid));
          const ratio = (pow + Game.garrisonPower(n)) / Math.max(1, hostile.reduce((s, b) => s + Game.armyPower(b), 0));
          if (ratio > 1.1) score = 60 * Math.min(ratio, 3);
        } else if (plan.kind === 'join') {
          score = 26 + (goal && goal.id === n.id ? 10 : 0);
        } else if (plan.kind === 'move') {
          if (homeAtRisk) continue;
          const t2 = this.threat(n, fid);
          if (t2 > Game.defensePower(n) * 1.1 && n.owner === fid) score = 25 + (n.capital ? 10 : 0);
          if (goal) {
            const d0 = Game.hops(here.id, goal.id), d1 = Game.hops(n.id, goal.id);
            if (d1 < d0) score = Math.max(score, 8 + (d0 - d1) * 6);
          } else {
            const fr = this.frontier(n, fid), cur = this.frontier(here, fid);
            if (fr > cur) score = Math.max(score, 3 + (fr - cur) * 0.4);
          }
          if (Game.overstack(n, fid) > 0) score *= 0.4;
        } else {
          // هجوم أو حصار
          const def = Game.defensePower(n);
          let comb = pow;
          for (const o of this.fieldArmies(fid)) if (o !== a && !o.siege && o.mp > 0 && Game.reach(o)[n.id]) comb += Game.armyPower(o) * 0.6;
          const ratio = (n.walls ? comb : pow) / Math.max(1, def);
          // هدف مشترك متفق عليه: يقبل الحليف مخاطرة أكبر قليلاً ليفي بوعده
          const need = (n.walls ? 0.9 : 1.3) / pers.aggr * (goal && goal.id === n.id && f.goals.kind === 'pact' ? 0.7 : 1);
          let risk = homeAtRisk;
          if (risk) {
            let other = 0;
            for (const id2 of [here.id, ...Game.adjAll(here.id)]) {
              if (id2 === n.id) continue;
              for (const o of Game.armiesAt(id2)) if (Game.atWar(fid, o.fid) && o.fid !== 'neutral') other += Game.armyPower(o);
            }
            risk = other > guard * 1.2;
          }
          if (ratio >= need && (!risk || ratio > 3)) {
            score = (n.pop / 1000 + (n.capital ? 20 : 0) + (n.owner === 'neutral' ? 4 : 0) + (f.claims.includes(n.id) ? 10 : 0) + (Game.defendersOf(n).length ? 0 : 8)) * Math.min(ratio, 3);
            if (goal && goal.id === n.id) score *= 1.6;
            // هدف مشترك قائم: الحصارات الجانبية تتأخر حتى يُنجز الوعد
            else if (goal && f.goals.kind === 'pact' && Game.passDist(fid, goal.id) < 99) score *= 0.35;
          }
        }
        if (score > bestScore) { bestScore = score; best = n; bestPlan = plan; }
      }
      if (best) { void bestPlan; await Game.executeMove(a, best.id); continue; }
      // لا عمل: جيش في مدينة مزدحمة ينتقل إلى مدينة فيها متسع
      if (Game.overstack(here, fid) > 0) {
        const room = Object.keys(reach).map((id) => Game.node(id)).filter((n) => Game.planMove(a, n.id).kind === 'move' && Game.stackAt(n, fid) + a.regs.length <= Game.supplyCap(n, fid))
          .sort((x, y) => this.frontier(y, fid) - this.frontier(x, fid))[0];
        if (room) { await Game.executeMove(a, room.id); continue; }
      }
      // لا عمل: دمج الجيوش الصغيرة أو التدريب
      const twin = Game.armiesOfAt(fid, a.node).find((o) => o !== a && o.role !== 'governor' && o.regs.length + a.regs.length <= MAX_REGS);
      if (twin && a.regs.length <= 3) { Game.mergeInto(a, twin); continue; }
      if (!Game.canTrain(a) && f.gold > 700 && this.frontier(here, fid) < 25) Game.train(a);
    }
  },
};
