'use strict';
// Allied effort records completed actions; marching, promises and repeated UI requests earn nothing.
(() => {
  const blank = () => ({ damage: 0, lost: 0, battles: 0, wins: 0, attacks: 0, defenses: 0, reliefs: 0, sieges: 0, captures: [], aid: 0, events: [] });
  const active = fid => (Game.S.coord || []).filter(c => c.ally === fid && c.ok && !c.done);
  const targetOf = c => c.kind === 'intercept' ? Game.army(c.target)?.node : c.kind === 'front' ? null : c.target;
  const recordFor = (fid, enemy) => {
    const w = Game.warRec(fid, enemy);
    if (!w) return null;
    w.contributions = w.contributions || {};
    if (!w.contributions[fid]) {
      const old = w.st[fid] || {};
      // Casualties, battles and captures were factual in old saves; old siege/aid counters were not reliable.
      w.contributions[fid] = { ...blank(), damage: old.kills || 0, lost: old.lost || 0, battles: old.battles || 0, wins: old.won || 0, captures: [...new Set(old.took || [])], migrated: true };
    }
    return w.contributions[fid];
  };
  const remember = (observer, actor, kind, value, label, key) => {
    if (Game.rememberDiplomacy) Game.rememberDiplomacy(observer, actor, kind, value, label, key);
  };
  const add = (fid, enemy, kind, key, values = {}, node = null) => {
    const r = recordFor(fid, enemy);
    if (!r || r.events.some(e => e.key === key)) return false;
    for (const [k, v] of Object.entries(values)) if (typeof r[k] === 'number' && Number.isFinite(v)) r[k] += Math.max(0, v);
    if (kind === 'capture' && !r.captures.includes(node)) r.captures.push(node);
    r.events.push({ key, kind, turn: Game.S.turn, node, ...values });
    return true;
  };
  Object.assign(Game, {
    alliedContribution(fid, enemy) {
      const w = this.warRec(fid, enemy), r = recordFor(fid, enemy) || blank();
      const points = Math.round(r.damage + r.captures.length * 150 + r.sieges * 12 + r.battles * 10 + r.reliefs * 50 + r.defenses * 20 + Math.min(r.aid * .25, 150));
      return { ...r, points, active: !!w && w.ended == null, since: w?.since ?? null, ended: w?.ended ?? null,
        parts: [['خسائر أوقعها بالعدو', Math.round(r.damage)], ['خسائر تحملها', Math.round(r.lost)], ['معارك خاضها', r.battles], ['هجمات فعلية', r.attacks], ['معارك دفاعية', r.defenses], ['حصارات فكّها', r.reliefs], ['أدوار حصار أضعفت المدينة', Math.round(r.sieges * 10) / 10], ['مدن فتحها', r.captures.length], ['تمويل دُفع فعلاً', r.aid]] };
    },
    contribPoints(fid, enemy) { return this.alliedContribution(fid, enemy).points; },
    contribParts(fid, enemy) { return this.alliedContribution(fid, enemy).parts; },
    contribShare(fid, enemy, partner) {
      const a = this.contribPoints(fid, enemy), b = this.contribPoints(partner, enemy);
      return a + b ? a / (a + b) : .5;
    },
    allyArmyAvailability(a) {
      if (!a || a.role === 'governor' || a.siege || this.menOf(a.regs) < 60) return { ok: false, why: 'لا جيش ميداني حرّ كافٍ' };
      const n = this.node(a.node), readiness = this.readyScore ? this.readyScore(a).total : 100;
      if (readiness < 38) return { ok: false, why: 'الجيش منهك ويحتاج الراحة' };
      if (n.owner === a.fid) {
        const threat = CampaignAI.threat(n, a.fid), guard = this.garrisonPower(n) + this.defendersOf(n).filter(d => d !== a).reduce((s, d) => s + this.armyPower(d), 0);
        if (threat > guard * 1.1) return { ok: false, why: `يحمي ${n.name} من خطر أقرب` };
      }
      const cap = this.nodesOf(a.fid).find(n => n.capital);
      if (cap && this.besiegers(cap.id).some(b => this.atWar(b.fid, a.fid))) return { ok: false, why: `${cap.name} عاصمتها تحت الحصار` };
      return { ok: true, readiness };
    },
    allySupportPreview(from, ally, kind, target, existing = false) {
      if (this.status(from, ally) !== 'alliance') return { ok: false, why: 'لا حلف قائم بينكما' };
      const wars = this.commonWars(from, ally);
      if (!wars.length) return { ok: false, why: 'لا عدو مشترك حالياً' };
      if (!existing && this.coordsOf(from).some(c => c.ally === ally)) return { ok: false, why: 'طلب سابق قيد التنفيذ؛ انتظر نتيجته' };
      const targetArmy = kind === 'intercept' ? this.army(target) : null;
      const cities = kind === 'front' ? (wars.includes(target) ? this.nodesOf(target) : []) : [this.node(targetArmy?.node || target)].filter(Boolean);
      if (!cities.length) return { ok: false, why: 'الهدف لم يعد متاحاً' };
      if (kind === 'defend' && cities[0].owner !== from) return { ok: false, why: 'المدينة لم تعد للحليف' };
      if (kind !== 'defend' && !wars.includes(targetArmy?.fid || cities[0].owner)) return { ok: false, why: 'الهدف ليس عدواً مشتركاً' };
      const all = this.armiesOf(ally).filter(a => a.role !== 'governor'), available = all.filter(a => this.allyArmyAvailability(a).ok);
      if (!available.length) return { ok: false, why: all.map(a => this.allyArmyAvailability(a).why).filter(Boolean)[0] || 'قواتها محدودة ولا جيش حرّ للمساعدة' };
      const memory = this.diplomaticMemory ? this.diplomaticMemory(ally, from).score : 0;
      const trust = this.rel(ally, from) + memory * .3;
      if (trust < -5) return { ok: false, why: 'العلاقة والوعود السابقة لا تكفي لإرسال قوة بعيدة' };
      const choices = [];
      for (const n of cities) for (const a of available) {
        const distance = this.openHops(a, n.id, 6);
        if (distance == null || distance > 4) continue;
        const hostileSiege = this.besiegers(n.id).filter(b => wars.includes(b.fid));
        const friendlySiege = this.besiegers(n.id).filter(b => this.friendly(b.fid, ally));
        const power = this.armyPower(a);
        const defending = kind === 'defend';
        const opposition = targetArmy ? this.armyPower(targetArmy) : defending ? hostileSiege.reduce((s, b) => s + this.armyPower(b), 0) : this.defensePower(n);
        const support = defending ? this.defensePower(n) : friendlySiege.reduce((s, b) => s + this.armyPower(b), 0);
        const ratio = (power + support) / Math.max(1, opposition);
        const aggr = this.pers(ally).aggr || 1;
        const need = defending ? 1.05 : n.walls ? .82 / Math.sqrt(aggr) : 1.15 / Math.sqrt(aggr);
        if (opposition && ratio < need) continue;
        choices.push({ army: a.id, node: n.id, distance, ratio, score: (defending && hostileSiege.length ? 80 : defending ? 48 : friendlySiege.length ? 55 : 30) + (n.capital ? 10 : 0) - distance * 8 + Math.min(2, ratio) * 5 });
      }
      choices.sort((a, b) => b.score - a.score);
      const best = choices[0];
      if (!best) return { ok: false, why: 'لا طريق مفتوح قريب أو لا قوة تكفي دون مجازفة مفرطة' };
      return { ok: true, ...best, why: `قوة واحدة تتجه إلى ${this.node(best.node).name} عبر ${best.distance} مراحل؛ تبقى بقية القوات لأولوياتها.`, limitation: 'تراجع طلبك إذا هُددت مدنها أو تعذر الطريق؛ الوصول وحده لا يُحتسب مساهمة.' };
    },
    coordAnswer(from, ally, kind, target) { return this.allySupportPreview(from, ally, kind, target); },
    requestCoord(from, ally, kind, target) {
      this.S.coord = this.S.coord || [];
      const prior = this.S.coord.find(c => c.from === from && c.ally === ally && c.turn === this.S.turn);
      if (prior) return { ...prior, repeated: true, why: 'أرسلت طلباً إلى هذا الحليف هذا الدور؛ لا يتكرر أو يمنح علاقة إضافية.' };
      const ans = this.coordAnswer(from, ally, kind, target);
      const c = { id: this.S.nextId++, from, ally, kind, target, turn: this.S.turn, until: this.S.turn + 6, ok: ans.ok, why: ans.why, done: !ans.ok, status: ans.ok ? 'accepted' : 'refused', log: [], politicalManaged: true };
      this.S.coord.push(c);
      return c;
    },
    alliedSupportOptions(fid) {
      const options = [];
      for (const c of active(fid)) {
        const p = this.allySupportPreview(c.from, fid, c.kind, c.target, true);
        if (p.ok) options.push({ ...p, from: c.from, kind: c.kind, requested: c.id, score: p.score + 25 });
      }
      for (const ally of this.alliesOf(fid)) {
        const wars = this.commonWars(fid, ally);
        if (!wars.length) continue;
        for (const n of this.nodesOf(ally)) if (this.besiegers(n.id).some(a => wars.includes(a.fid)) || CampaignAI.threat(n, fid) > this.defensePower(n) * .8) {
          const p = this.allySupportPreview(ally, fid, 'defend', n.id, true);
          if (p.ok) options.push({ ...p, from: ally, kind: 'defend' });
        }
        for (const enemy of wars) {
          const p = this.allySupportPreview(ally, fid, 'front', enemy, true);
          if (p.ok) options.push({ ...p, from: ally, kind: 'attack', score: p.score + (this.pers(fid).honor - 1) * 12 });
        }
      }
      return options.sort((a, b) => b.score - a.score);
    },
    resolveAlliedPeace(a, b, terms) {
      this.S.alliedSettlements = this.S.alliedSettlements || {};
      const w = this.warRec(a, b), key = w?.politicalId || `${this.warKey(a, b)}:${w?.since ?? this.S.turn}`;
      if (this.S.alliedSettlements[key]) return this.S.alliedSettlements[key];
      const result = { turn: this.S.turn, a, b, feedback: [], spoils: [] };
      this.S.alliedSettlements[key] = result;
      for (const mine of [a, b]) {
        const enemy = mine === a ? b : a;
        for (const ally of this.alliesOf(mine)) {
          if (ally === enemy || !this.atWar(ally, enemy)) continue;
          const work = this.alliedContribution(ally, enemy), mineWork = this.alliedContribution(mine, enemy);
          if (!work.points && !mineWork.points) continue;
          const share = this.contribShare(ally, enemy, mine);
          const cut = terms.payer === enemy && terms.gold > 0 && work.points > 0 ? Math.floor(terms.gold * Math.min(.4, share * .6)) : 0;
          const abandoned = work.points > 0 && (this.nodesOf(ally).some(n => this.besiegers(n.id).some(x => x.fid === enemy)) || this.factionPower(enemy) > this.factionPower(ally) * 1.4);
          const text = abandoned ? `${this.fname(ally)} تحملت جهداً فعلياً وما زالت معرضة للعدو بعد الصلح المنفرد.` : `${this.fname(ally)} ساهمت بنحو ${Math.round(share * 100)}٪ من جهدكما المسجل ضد ${this.fname(enemy)}.`;
          const change = abandoned ? -Math.max(3, Math.round(share * 12)) : work.points ? 2 : 0;
          if (change) this.addRel(mine, ally, change);
          remember(ally, mine, abandoned ? 'ally-abandoned' : 'shared-campaign', change, text, `${key}:${ally}:${mine}`);
          result.feedback.push({ ally, mine, enemy, share, points: work.points, change, text });
          if (cut > 0) result.spoils.push({ ally, winner: mine, enemy, cut, share, settlement: key, paid: false });
          this.event('pol', text, { fids: [ally, mine, enemy], imp: abandoned ? 2 : 1 });
        }
      }
      // Many allies cannot each claim a full pairwise share of the same payment.
      for (const winner of [a,b]) {
        const pool = result.spoils.filter(s=>s.winner===winner), total = pool.reduce((sum,s)=>sum+s.cut,0), cap = Math.floor((terms.gold || 0)*.6);
        if (total>cap) for (const s of pool) s.cut=Math.floor(s.cut*cap/total);
      }
      for (const s of result.spoils) if (!this.f(s.winner).isPlayer) this.payAlliedSpoils(s, this.pers(s.winner).honor >= .95);
      this.spoilsTo = result.spoils.find(s => this.f(s.winner).isPlayer && !s.resolved) || null;
      return result;
    },
    payAlliedSpoils(s, give) {
      if (!s || s.resolved || !s.settlement || !this.S.alliedSettlements?.[s.settlement]?.spoils.includes(s)) return false;
      if (give && this.f(s.winner).gold < s.cut) return false;
      s.resolved = true;
      if (give) {
        this.f(s.winner).gold -= s.cut; this.f(s.ally).gold += s.cut; s.paid = true;
        if (this.recordFinance) { this.recordFinance(s.winner, -s.cut, 'diplomacy', 'تقاسم غنيمة الصلح مع الحليف'); this.recordFinance(s.ally, s.cut, 'diplomacy', 'نصيب من غنيمة الصلح'); }
      }
      const change = give ? 6 : -6;
      this.addRel(s.winner, s.ally, change);
      remember(s.ally, s.winner, give ? 'spoils-shared' : 'spoils-denied', change, give ? 'قاسمتنا مكاسب صلح بعد مشاركتنا الفعلية' : 'احتفظت بمكاسب الصلح رغم مشاركتنا', `${s.settlement}:spoils:${s.ally}`);
      return true;
    },
    shareSpoils(give) {
      const pending = Object.values(this.S.alliedSettlements || {}).flatMap(x => x.spoils).filter(s => this.f(s.winner).isPlayer && !s.resolved);
      const s = pending[0];
      if (s) this.payAlliedSpoils(s, give);
      this.spoilsTo = pending.find(x => !x.resolved) || null;
    },
  });

  // A friendly army may reinforce an existing allied siege using ordinary movement/readiness costs.
  const planMove = Game.planMove;
  Game.planMove = function (a, target) {
    const p = planMove.call(this, a, target);
    if (!p.err) return p;
    const n = this.node(target), route = this.reach(a)[target];
    const host = n && this.besiegers(target).find(b => this.friendly(b.fid, a.fid));
    if (!route || !host || !this.atWar(a.fid, n.owner)) return p;
    return { path: route.path, cost: route.cost, node: n, kind: 'siege', alliedSiege: host.fid };
  };
  const startSiege = Game.startSiege;
  Game.startSiege = function (a, n) {
    const originalStart = n.siegeStart, existing = this.besiegers(n.id).length > 0;
    const r = startSiege.call(this, a, n);
    if (existing) n.siegeStart = originalStart;
    return r;
  };
  const applySim = Game.applySim;
  Game.applySim = function (enc, res) {
    if (!enc.alliedId) { this.S.alliedBattleSeq = (this.S.alliedBattleSeq || 0) + 1; enc.alliedId = `${this.S.turn}:${this.S.alliedBattleSeq}`; }
    const evidence = [];
    if (res && res.winner != null) {
      const n = this.node(enc.node), sides = this.encSides(enc);
      for (let si = 0; si < 2; si++) {
        const armies = si === 0 ? sides.attArmies : sides.defArmies, byFaction = {};
        for (const u of res.sides[si].units) {
          const owner = armies.find(a => a.regs.includes(u.ref))?.fid || (n.garrison.includes(u.ref) ? n.owner : si === 0 ? enc.attFid : enc.defFid);
          const part = byFaction[owner] || (byFaction[owner] = { fid: owner, si, damage: 0, lost: 0 });
          part.damage += Math.max(0, u.kills || 0); part.lost += Math.max(0, Math.round(u.men0 - u.men));
        }
        evidence.push(...Object.values(byFaction));
      }
    }
    const out = applySim.call(this, enc, res);
    if (out) out.alliedEvidence = evidence;
    return out;
  };
  const finishEncounter = Game.finishEncounter;
  Game.finishEncounter = async function (enc, out) {
    if (enc.alliedFinished) return;
    enc.alliedFinished = true;
    if (!enc.alliedId) { this.S.alliedBattleSeq = (this.S.alliedBattleSeq || 0) + 1; enc.alliedId = `${this.S.turn}:${this.S.alliedBattleSeq}`; }
    if (out && out.winner != null && out.report) {
      const key = `battle:${enc.alliedId || `${this.S.turn}:${enc.node}:${enc.att.join(',')}:${enc.def.join(',')}`}`;
      const n = this.node(enc.node), evidence = out.alliedEvidence?.length ? out.alliedEvidence : [enc.attFid, enc.defFid].map((fid, si) => ({ fid, si, damage: out.report.cas?.[1 - si]?.lost || 0, lost: out.report.cas?.[si]?.lost || 0 }));
      for (const p of evidence) {
        const enemy = p.si === 0 ? enc.defFid : enc.attFid;
        if (p.fid === 'neutral' || enemy === 'neutral' || !this.atWar(p.fid, enemy)) continue;
        this.warRec(p.fid, enemy, true);
        const relief = p.si === 0 && (enc.type === 'relief' || enc.type === 'sally') && out.winner === 0;
        const defense = p.si === 1 && enc.type === 'assault';
        const added = add(p.fid, enemy, relief ? 'relief' : defense ? 'defense' : 'battle', key, { damage: p.damage, lost: p.lost, battles: 1, wins: out.winner === p.si ? 1 : 0, attacks: p.si === 0 && enc.type === 'assault' ? 1 : 0, defenses: defense ? 1 : 0, reliefs: relief ? 1 : 0 }, n.id);
        if (added && (relief || defense) && n.owner !== p.fid && this.friendly(n.owner, p.fid)) remember(n.owner, p.fid, relief ? 'ally-rescued' : 'ally-defended', relief ? 7 : 3, `${relief ? 'فكّت حصار' : 'دافعت في معركة عن'} ${n.name}`, `${key}:${p.fid}`);
      }
    }
    return finishEncounter.call(this, enc, out);
  };
  const capture = Game.capture;
  Game.capture = async function (n, fid, how, armies) {
    const old = n.owner;
    if (old !== 'neutral' && old !== fid && this.atWar(fid, old)) {
      this.warRec(fid, old, true);
      add(fid, old, 'capture', `capture:${n.id}:${this.S.turn}`, {}, n.id);
    }
    return capture.call(this, n, fid, how, armies);
  };
  const endRound = Game.endRound;
  Game.endRound = function (...args) {
    const turn = this.S.turn, before = this.S.nodes.filter(n => this.besiegers(n.id).length).map(n => ({ id: n.id, owner: n.owner, stores: n.stores, men: this.menOf(n.garrison), besiegers: this.besiegers(n.id).map(a => ({ fid: a.fid, power: this.armyPower(a) })) }));
    for (const b of before) for (const fid of new Set(b.besiegers.map(x => x.fid))) if (b.owner !== 'neutral' && this.atWar(fid, b.owner)) { this.warRec(fid, b.owner, true); recordFor(fid, b.owner); }
    const result = endRound.apply(this, args);
    for (const b of before) {
      const n = this.node(b.id);
      if (n.owner !== b.owner || !(n.stores < b.stores || this.menOf(n.garrison) < b.men)) continue;
      const by = {};
      for (const a of b.besiegers) if (this.atWar(a.fid, b.owner)) by[a.fid] = (by[a.fid] || 0) + a.power;
      const total = Object.values(by).reduce((s, p) => s + p, 0);
      for (const [fid, power] of Object.entries(by)) add(fid, b.owner, 'siege', `siege:${b.id}:${turn}`, { sieges: power / Math.max(1, total) }, b.id);
    }
    return result;
  };
  const subsidy = Game.subsidy;
  Game.subsidy = function (a, b, amount = 150) {
    const beforeA = this.f(a)?.gold, beforeB = this.f(b)?.gold;
    for (const e of this.commonWars(a, b)) { this.warRec(a, e, true); recordFor(a, e); }
    const result = subsidy.call(this, a, b, amount);
    const paid = Math.min(beforeA - this.f(a)?.gold, this.f(b)?.gold - beforeB);
    if (paid > 0) for (const e of this.commonWars(a, b)) add(a, e, 'aid', `aid:${a}:${b}:${this.S.turn}`, { aid: paid });
    return result;
  };
  const normalizeState = Game.normalizeState;
  Game.normalizeState = function (...args) {
    const result = normalizeState.apply(this, args);
    this.spoilsTo = Object.values(this.S.alliedSettlements || {}).flatMap(x => x.spoils || []).find(s => this.f(s.winner)?.isPlayer && !s.resolved) || null;
    return result;
  };

  // Legacy dispatch does not reissue unsafe orders; one free army keeps independent national priorities.
  let dispatching = null;
  const coordTargetNode = Game.coordTargetNode;
  Game.coordTargetNode = function (c) { return dispatching === c.ally ? null : coordTargetNode.call(this, c); };
  const planGoals = CampaignAI.planGoals;
  CampaignAI.planGoals = function (fid) {
    planGoals.call(this, fid);
    const f = Game.f(fid);
    if (f.goals?.coord) {
      const c = active(fid).find(c => c.id === f.goals.coord), p = c && Game.allySupportPreview(c.from, fid, c.kind, c.target, true);
      if (!p?.ok) f.goals = null;
    }
  };
  const military = CampaignAI.military;
  CampaignAI.military = async function (fid) {
    const support = Game.alliedSupportOptions(fid).find(p => Game.army(p.army)?.mp > 0);
    if (support) {
      const a = Game.army(support.army), destination = support.node;
      if (a.node === destination && support.kind === 'defend') a.mp = 0;
      else {
        let best = null, bestDistance = Game.openHops(a, destination, 6) ?? 99;
        for (const id of Object.keys(Game.reach(a))) {
          const plan = Game.planMove(a, id);
          if (plan.err || plan.needWar || (id !== destination && plan.kind !== 'move')) continue;
          const d = id === destination ? 0 : Game.openHops({ ...a, node: id }, destination, 6);
          if (d != null && d < bestDistance) { best = id; bestDistance = d; }
        }
        if (best) {
          const result = await Game.executeMove(a, best);
          if (result?.ok) {
            // Reaching an allied defense post is useful posture, but not credited as a battle.
            if (Game.S.armies.includes(a)) a.mp = 0;
            const c = active(fid).find(c => c.id === support.requested);
            if (c && c.lastMovementTurn !== Game.S.turn) { c.lastMovementTurn = Game.S.turn; c.log.push({ turn: Game.S.turn, text: `تحرك جيش نحو ${Game.node(destination).name}؛ تُسجَّل المساهمة عند القتال أو أثر الحصار.` }); }
          }
        }
      }
    }
    const previous = dispatching; dispatching = fid;
    try { return await military.call(this, fid); } finally { dispatching = previous; }
  };
})();
