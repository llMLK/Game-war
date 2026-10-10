'use strict';
// Political intelligence extends the existing operations and their economy ledger.
// Expiry fields are inclusive: a three-turn effect ends after T, T+1 and T+2.
(() => {
  SPY_OPS.siegeworks = { name: 'إحراق معدات الحصار', icon: 'fire', cost: 100, base: .57, disc: .32, target: 'army', desc: 'تسلل إلى معسكر محاصِر: يعطّل معدات هذا الجيش دورين، ويمكن لجيوش أخرى بمعدات سليمة مواصلة الحصار.' };
  SABOTAGE.roads = { name: 'قطع الجسور والمعابر', icon: 'road', turns: 3, desc: 'تتعطل فائدة الطرق المعبّدة للحركة ثلاثة أدوار، وتتوقف القوافل عند المدينة دورين. يصلح الحرس المعابر تلقائياً أو أسرع بالتفتيش.' };
  const effectKeys = { market: 'marketOff', reinforce: 'noRecruit', walls: 'wallDmg', caravan: 'caravanStop', roads: 'roadOffUntil' };
  const active = (until, turn) => Number.isFinite(until) && until >= turn;
  const percentBand = p => `${Math.max(5, Math.floor(p * 20) * 5 - 5)}–${Math.min(95, Math.ceil(p * 20) * 5 + 5)}٪`;
  const prior = Object.fromEntries(['citySecurity','spyAssess','spyTargets','canSpyOp','spyOp','secureCity','securityPreview','normalizeState','edgeCost','siegeEquip'].map(k => [k, Game[k]]));

  Object.assign(Game, {
    intelligencePreview(fid) {
      const f = this.f(fid), left = Math.max(0, (f.intelligenceUntil ?? -1) - this.S.turn + 1), cost = 100;
      return { cost, turns: 6, left, err: left ? `شبكة الرصد ممولة؛ بقي ${left} أدوار` : f.gold < cost ? 'الذهب لا يكفي' : null,
        desc: 'تمويل الرسل والمخبرين ستة أدوار: يحسن كشف العملاء في مدنك وعملياتك قليلاً. لا يمنع التسلل يقيناً.' };
    },
    fundIntelligence(fid) {
      const v = this.intelligencePreview(fid); if (v.err) return v.err;
      this.f(fid).gold -= v.cost; this.f(fid).intelligenceUntil = this.S.turn + v.turns - 1;
      this.recordFinance?.(fid, -v.cost, 'espionage', 'تمويل الرسل والمخبرين');
      this.event('int', `${this.fname(fid)} تموّل رسلها ومخبريها ستة أدوار.`, { fids: [fid], imp: 1 });
      return null;
    },
    citySecurity(n) {
      const out = prior.citySecurity.call(this, n), add = (label, v) => { if (v) { out.parts.push([label, v]); out.v += v; } };
      const g = this.governorAt?.(n), skills = g && this.leaderIdentity?.(g)?.skills;
      if (skills) add('خبرة الحاكم في الإدارة والاستطلاع', Math.min(10, Math.round((skills.stewardship + skills.scouting) * .8)));
      if (active(this.f(n.owner)?.intelligenceUntil, this.S.turn)) add('رسل ومخبرون ممولون', 8);
      if (n.unrest > 0) add('الاضطراب يفتح ثغرات في الحراسة', -Math.min(8, n.unrest * 2));
      return out;
    },
    spyAssess(by, target, op, targetId) {
      if (!SPY_OPS[op] || !this.f(by) || !this.f(target)) return { p: 0, disc: 0, parts: [], importance: 0, band: oddsBand(0), discBand: oddsBand(0) };
      const node = SPY_OPS[op].target === 'city' ? this.node(targetId) : null;
      if (SPY_OPS[op].target === 'city' && !node) return { p: 0, disc: 0, parts: [], importance: 0, band: oddsBand(0), discBand: oddsBand(0) };
      const out = prior.spyAssess.call(this, by, target, op, targetId);
      const add = (label, n) => { out.parts.push([label, n]); out.p = clamp(out.p + n, .1, .95); };
      if (active(this.f(by).intelligenceUntil, this.S.turn)) add('تمويل الرسل وتحسين الغطاء', .05);
      if (node && op === 'incite') {
        add(node.loyalty < 50 ? 'سخط السكان يجعل الدعوة أيسر' : 'ولاء السكان يقاوم المحرّضين', clamp((50 - node.loyalty) / 250, -.16, .16));
        if (node.unrest > 0) add('اضطراب قائم يمكن استغلاله', .05);
      }
      if (op === 'siegeworks') {
        const a = this.army(targetId), g = a && this.armyGen(a);
        if (g?.trait === 'siege') add('مهندس الحصار يحرس معداته', -.1);
        if (a && this.readyOf(a).fat >= 60) add('حرس المعسكر مرهقون', .06);
      }
      out.band = oddsBand(out.p); out.discBand = oddsBand(out.disc);
      return out;
    },
    spyCooldown(by, target, op, targetId) {
      const f = this.f(by); if (!f) return 'المرسل غير صالح';
      if (active(f.spyRecovery?.[target], this.S.turn)) return `إعادة بناء الغطاء بعد انكشاف العملاء؛ متاح في الدور ${f.spyRecovery[target] + 1}`;
      const key = `${target}:${targetId ?? target}`;
      if (active(f.spyTargetWait?.[key], this.S.turn)) return `الهدف متيقظ بعد العملية الأخيرة؛ متاح في الدور ${f.spyTargetWait[key] + 1}`;
      return null;
    },
    spyAssessment(by, target, op, targetId, sub) {
      const out = this.spyAssess(by, target, op, targetId), O = SPY_OPS[op];
      if (!O) return { ...out, err: 'العملية غير صالحة', cost: 0 };
      let err = this.canSpyOp(by, target, op) || this.spyCooldown(by, target, op, targetId);
      const n = O.target === 'city' && this.node(targetId), a = O.target === 'army' && this.army(targetId);
      if (O.target === 'city' && (!n || n.owner !== target)) err = 'المدينة لم تعد في ملك الهدف';
      if (O.target === 'army' && (!a || a.fid !== target)) err = 'الجيش لم يعد تابعاً للهدف';
      if (op === 'siegeworks' && (!a?.siege || active(a.siegeDisruptedUntil, this.S.turn))) err = 'لا معدات حصار سليمة لهذا الجيش';
      if (op === 'sabotage') {
        if (!SABOTAGE[sub || 'stores']) err = 'اختر نوع التخريب';
        if (n && sub === 'market' && !n.market) err = 'لا سوق عاملة هنا';
        if (n && sub === 'walls' && !n.walls) err = 'لا أسوار هنا';
        if (n && sub === 'roads' && !n.roads) err = 'لا طرق معبّدة هنا';
        if (n && sub === 'gap' && !this.besiegers(n.id).some(b => b.fid === by)) err = 'كشف الثغرة يحتاج حصاراً قائماً لك';
      }
      return { ...out, err, cost: O.cost, success: percentBand(out.p), discovery: percentBand(out.disc),
        duration: op === 'incite' ? 4 : op === 'siegeworks' ? 2 : op === 'sabotage' ? SABOTAGE[sub || 'stores']?.turns || 0 : op === 'scout' ? 8 : 6,
        consequence: 'إذا انكشف الفاعل: العلاقة −20 والسمعة −5، تفقد الشبكة درجة ويتعطل العمل في المملكة دورين؛ النجاح لا يمنع الانكشاف.',
        cooldown: 'عملية واحدة لكل دور؛ يهدأ الهدف بعد دورين كاملين من العملية. لا يغير الحفظ والتحميل النتيجة.' };
    },
    canSpyOp(by, target, op) {
      if (!this.f(by)?.alive) return 'المرسل غير صالح';
      const err = prior.canSpyOp.call(this, by, target, op); if (err) return err;
      if (active(this.f(by).spyRecovery?.[target], this.S.turn)) return `الشبكة تعيد بناء غطائها حتى نهاية الدور ${this.f(by).spyRecovery[target]}`;
      if (op === 'siegeworks' && !this.armiesOf(target).some(a => a.siege && !active(a.siegeDisruptedUntil, this.S.turn))) return 'لا جيش محاصِر بمعدات سليمة';
      return null;
    },
    spyEffects(n) {
      const T = this.S.turn, list = [];
      const add = (key, name, text) => { if (active(n[key], T)) list.push({ key, name, text, left: n[key] - T + 1, until: n[key] }); };
      add('marketOff', 'تعطيل السوق', 'دخل السوق متوقف؛ تصلحه المدينة تلقائياً أو بالتفتيش.');
      add('taxRefuse', 'رفض الضرائب', 'نصف دخل الضرائب مفقود؛ يسرّع التفتيش استعادة الجباية.');
      add('noRecruit', 'تعطيل الإمدادات', 'التجنيد المحلي أغلى 30٪ ولا تصل تعويضات الحامية.');
      add('wallDmg', 'ضرر في التحصين', 'الأسوار أضعف بدرجة حتى الإصلاح.');
      add('caravanStop', 'توقف القوافل', 'تعود القوافل تلقائياً بعد إصلاح المعابر.');
      add('roadOffUntil', 'معابر مقطوعة', 'لا تعطي الطرق المعبّدة هنا ميزة الحركة.');
      add('incited', 'تحريض السكان', 'اضطراب وولاء أقل؛ خطر تمرد إضافي إذا هبط الولاء دون 35.');
      return list;
    },
    spyTargetScore(by, target, op, x) {
      if (this.spyCooldown(by, target, op, x.id)) return 0;
      let score = 8 + (x.importance || 0) * .6;
      const n = SPY_OPS[op].target === 'city' ? this.node(x.id) : null;
      if (n) {
        const distance = Math.min(...this.nodesOf(by).map(m => this.hops(m.id, n.id, 8)), 9);
        score += Math.max(0, 5 - distance) * 3 + (this.f(by).goals?.target === n.id ? 18 : 0);
        if (op === 'incite') score += Math.max(0, 65 - n.loyalty) * .6 + Math.min(10, (n.unrest || 0) * 2);
        if (op === 'sabotage') score += this.besiegers(n.id).some(a => a.fid === by || this.alliesOf(by).includes(a.fid)) ? 30 : n.market * 4;
        if (op === 'incite' && active(n.incited, this.S.turn)) score *= .12;
        if (op === 'sabotage' && ['marketOff','noRecruit','wallDmg','caravanStop','roadOffUntil'].filter(k => active(n[k], this.S.turn)).length >= 2) score *= .2;
      }
      if (op === 'siegeworks') score += this.node(this.army(x.id).node)?.owner === by ? 35 : 12;
      for (const h of this.f(by).spyHistory || []) if (h.target === x.id && this.S.turn - h.turn < 7) score *= h.op === op ? .2 : .6;
      return score * x.p * (.9 + rng(hashStr(`${by}:${op}:${x.id}:${this.S.turn}:priority`))() * .2);
    },
    spyTargets(by, target, op) {
      if (!SPY_OPS[op] || !this.f(by) || !this.f(target)) return [];
      let list = prior.spyTargets.call(this, by, target, op);
      if (op === 'siegeworks') list = list.filter(x => this.army(x.id)?.siege && !active(this.army(x.id).siegeDisruptedUntil, this.S.turn));
      return list.map(x => ({ ...x, priority: this.spyTargetScore(by, target, op, x), cooldown: this.spyCooldown(by, target, op, x.id) })).sort((a,b) => b.priority - a.priority);
    },
    spyAI(by, target, op) {
      if (this.canSpyOp(by, target, op)) return null;
      const list = this.spyTargets(by, target, op).filter(x => x.priority > 0);
      if (!list.length) return null;
      for (const pick of list) {
        let sub;
        if (op === 'sabotage') {
          const n = this.node(pick.id), besieged = this.besiegers(n.id).some(a => a.fid === by), goal = this.f(by).goals?.target;
          const opts = [['stores',besieged && n.stores > 0 ? 24 : n.stores > 1 ? 2 : 0],['gap',besieged && n.walls > 0 && !active(n.gapBy?.[by],this.S.turn) ? 20 : 0],
            ['walls',goal === n.id && n.walls > 0 && !active(n.wallDmg,this.S.turn) ? 18 : 0],['market',n.market > 0 && !active(n.marketOff,this.S.turn) ? 5 + n.market * 3 : 0],
            ['roads',n.roads && !active(n.roadOffUntil,this.S.turn) && (goal === n.id || this.S.route?.path?.includes(n.id)) ? 16 : 0],
            ['caravan',this.S.route?.path?.includes(n.id) && !active(n.caravanStop,this.S.turn) ? 12 : 0],['reinforce',!active(n.noRecruit,this.S.turn) ? 5 + this.armiesAt(n.id).length * 2 : 0]];
          sub = opts.sort((a,b) => b[1] - a[1]).find(x => x[1] > 0)?.[0]; if (!sub) continue;
        }
        const v = this.spyAssessment(by,target,op,pick.id,sub); if (v.err) continue;
        return this.spyOp(by,target,op,pick.id,sub);
      }
      return null;
    },
    spyOp(by, target, op, targetId, sub) {
      // Realm missions have one canonical target; omitted or arbitrary IDs must
      // not create another deterministic draw after reloading the same turn.
      if (SPY_OPS[op]?.target === 'realm') targetId = target;
      const as = this.spyAssessment(by,target,op,targetId,sub); if (as.err) return {err:as.err};
      const f = this.f(by), T = this.S.turn, n = SPY_OPS[op].target === 'city' && this.node(targetId);
      const beforeLoyalty = n?.loyalty, sec = n && this.citySecurity(n).v, alertStart = this.S.aid;
      let out;
      if (op === 'siegeworks') {
        const r = rng(hashStr(`${by}:${target}:${op}:${targetId}:${T}:spy`)), ok = r() < as.p, found = r() < as.disc, a = this.army(targetId);
        f.gold -= as.cost; f.spyTurn = T; this.recordFinance?.(by,-as.cost,'espionage','تخريب معدات الحصار');
        f.spyHistory = (f.spyHistory || []).filter(h => T-h.turn < 12); f.spyHistory.push({turn:T,target:targetId,op,ok});
        if (ok) { a.siegeDisruptedUntil = T+1; f.net = f.net || {}; f.net[target] = Math.min(3,(f.net[target]||0)+.5); }
        let text = ok ? `احترقت معدات جيش ${this.fname(target)} عند ${this.node(a.node).name}. يعيد تجهيزها خلال دورين؛ معدات الجيوش الأخرى لا تتأثر.` : 'كُشفت صعوبة التسلل ولم تُصب معدات الحصار.';
        if (found) {
          this.addRel(by,target,-20); f.rep = Math.max(0,f.rep-5); f.net = f.net || {}; f.net[target] = Math.max(0,(f.net[target]||0)-1);
          const t = this.f(target); t.grievance = t.grievance || {}; t.grievance[by] = (t.grievance[by]||0)+1;
          text += ' عُرف مرسِل العملاء: العلاقة −20 والسمعة −5 وفقدت الشبكة درجة.';
        }
        this.event('int',text,{fids:found?[by,target]:[by],node:a.node,imp:2});
        if (ok && target === this.S.player) this.alert('imp',`أُحرقت معدات حصارك عند ${this.node(a.node).name}؛ إصلاحها يستغرق دورين.`,{node:a.node,icon:'fire'});
        out = {ok,found,text,as};
      } else out = prior.spyOp.call(this,by,target,op,targetId,sub);
      if (out.err) return out;
      f.spyTargetWait = f.spyTargetWait || {}; f.spyTargetWait[`${target}:${targetId ?? target}`] = T+2;
      if (out.found) { f.spyRecovery = f.spyRecovery || {}; f.spyRecovery[target] = T+2; out.text += ' تحتاج الشبكة دورين كاملين لإعادة بناء غطائها.'; }
      if (n && out.ok && op === 'incite') {
        const drop = Math.round(clamp(14 + Math.max(0,50-beforeLoyalty)*.18 - Math.max(0,sec)*.05,9,23));
        n.loyalty = Math.max(0,beforeLoyalty-drop); n.incited = T+3; n.noRecruit = T+2; n.taxRefuse = T+2;
        out.text = `تحريض في ${n.name}: الولاء −${drop} إلى ${n.loyalty}، اضطراب دورين، ونصف الضرائب وتعويضات الحامية معطّلان ثلاثة أدوار. التجنيد المحلي أغلى 30٪. يبقى خطر التمرد الإضافي أربعة أدوار إذا انخفض الولاء دون 35؛ يسرّع الحاكم والتفتيش التعافي.` + (out.found ? ' انكشف العملاء: العلاقة −20 والسمعة −5 وفقدت الشبكة درجة؛ تحتاج دورين لإعادة بناء الغطاء.' : '');
        for (const alert of this.S.alerts || []) if (alert.id >= alertStart && alert.node === n.id && alert.icon === 'torch') alert.text = `محرّضون في ${n.name}: الولاء ${n.loyalty}، واضطراب ورفض نصف الضرائب. التفتيش يسرّع التعافي.`;
      }
      if (n && out.ok && op === 'sabotage') {
        const kind = sub || 'stores', turns = SABOTAGE[kind].turns;
        if (effectKeys[kind]) n[effectKeys[kind]] = T+turns-1;
        if (kind === 'gap') n.gapBy[by] = T+turns-1;
        if (kind === 'roads') n.caravanStop = Math.max(n.caravanStop??-1,T+1);
      }
      if (out.found) this.rememberDiplomacy?.(target,by,'espionage',-12,'كشفنا عملاء أرسلهم إلى أراضينا',`spy:${by}:${target}:${T}`);
      out.as = as; this.save(); return out;
    },
    securityPreview(n,fid) { const v = prior.securityPreview.call(this,n,fid); return {...v,desc:v.desc+' يسرّع أيضاً إصلاح المعابر والتحصين ويهدّئ نشاط المحرّضين.'}; },
    secureCity(n,fid) {
      const before = this.f(fid)?.gold, err = prior.secureCity.call(this,n,fid); if (err) return err;
      for (const k of ['roadOffUntil','wallDmg','incited']) if (active(n[k],this.S.turn)) n[k] = this.S.turn;
      this.recordFinance?.(fid,this.f(fid).gold-before,'security','تفتيش وحراسة '+n.name); return null;
    },
    edgeCost(a,from,to,kind) {
      const road = n => active(n.roadOffUntil,this.S.turn) ? {...n,roads:0} : n;
      return prior.edgeCost.call(this,a,road(from),road(to),kind);
    },
    siegeEquip(n,fid) {
      const out = prior.siegeEquip.call(this,n,fid), armies = this.besiegers(n.id).filter(a=>a.fid===fid);
      if (armies.length && armies.every(a=>active(a.siegeDisruptedUntil,this.S.turn))) return {...out,ram:false,ladders:false,tower:false,disrupted:true};
      if (armies.some(a=>active(a.siegeDisruptedUntil,this.S.turn))) {
        const intact = armies.filter(a=>!active(a.siegeDisruptedUntil,this.S.turn)), turns = Math.max(0,...intact.map(a=>a.siege.turns));
        const bonus = intact.some(a=>this.hasTrait(a,'siege')) ? 1 : 0;
        return {...out,ram:turns+bonus>=1,ladders:turns+bonus>=1,tower:turns+bonus>=2};
      }
      return out;
    },
    normalizeState() {
      const out = prior.normalizeState.apply(this,arguments);
      for (const f of Object.values(this.S.factions)) {
        for (const field of ['spyTargetWait','spyRecovery']) { if (!f[field] || typeof f[field] !== 'object') f[field] = {}; for (const [key,value] of Object.entries(f[field])) if (!Number.isFinite(value)) delete f[field][key]; }
        f.spyHistory = Array.isArray(f.spyHistory) ? f.spyHistory.filter(h=>h && Number.isFinite(h.turn)) : [];
        // Existing successful/failed attempts keep their cooldown after upgrading a save.
        for (const h of f.spyHistory) if (this.S.turn-h.turn <= 2) {
          const owner = this.node(h.target)?.owner || this.army(h.target)?.fid || (this.f(h.target) ? h.target : null);
          if (owner) f.spyTargetWait[`${owner}:${h.target}`] = Math.max(f.spyTargetWait[`${owner}:${h.target}`]??-1,h.turn+2);
        }
      }
      return out;
    }
  });
})();

// Political spending responds to threats and personality before ordinary construction.
{
  const economy = CampaignAI.economy;
  CampaignAI.economy = function (fid) {
    const f = Game.f(fid), profile = Game.politicalProfile(fid), cities = Game.nodesOf(fid);
    const troubled = cities.filter(n => Game.spyEffects(n).length || (n.spyIncidents || []).some(e => Game.S.turn - e.turn < 4)).sort((a,b) => b.pop - a.pop)[0];
    if (troubled && f.gold > Game.securityPreview(troubled,fid).cost + 150 && Game.politicalRoll(fid,fid,'security') < .35 + profile.caution * .4) Game.secureCity(troubled,fid);
    const camp = Game.S.armies.filter(a => a.siege && Game.atWar(fid,a.fid) && Game.node(a.node).owner === fid).sort((a,b) => Game.armyPower(b)-Game.armyPower(a))[0];
    if (camp && f.gold > 250 && Game.politicalRoll(fid,camp.fid,'burnSiege') < .5) Game.spyAI(fid,camp.fid,'siegeworks');
    else if (f.gold > 400 && (f.spyTurn ?? -1) !== Game.S.turn) {
      const foe = Game.aliveMajors().filter(b => Game.atWar(fid,b)).sort((a,b)=>Number(f.goals?.owner===b)-Number(f.goals?.owner===a))[0];
      if (foe && Game.politicalRoll(fid,foe,'spyChoice') < .16 + profile.opportunity*.18 + profile.deceit*.14) {
        const restive = Game.spyTargets(fid,foe,'incite').find(x => !x.cooldown && Game.node(x.id).loyalty < 50);
        const ownSiege = Game.nodesOf(foe).some(n => Game.besiegers(n.id).some(a => a.fid === fid));
        const op = ownSiege ? 'sabotage' : Game.intelLevel(fid,foe)<2 ? 'scout' : restive ? 'incite' : 'military';
        Game.spyAI(fid,foe,op);
      }
    }
    return economy.call(this,fid);
  };
}
