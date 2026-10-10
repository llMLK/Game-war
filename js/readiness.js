'use strict';
// جاهزية الجيوش في الحملة:
// - ما يحدث في المعركة يبقى: جيش قاتل ثلاث مرات في دور واحد يدخل الثالثة متعباً قليل السهام مهزوز التماسك.
// - الراحة في مدينة لك تعيدها، والمسير والحصار والبعد عن الإمداد تبطئها.
// - الجيش المحاصِر ليس في أتم جاهزيته، وإن هوجم يختار: إبقاء الحصار والقتال بجزء منه، أو فكّ الحصار والقتال بكله.

Object.assign(Game, {
  readyOf(a) { return { ...Ready.base(), ...((a && a.ready) || {}) }; },
  hasMissile(a) { return !!a && a.regs.some((r) => UNITS[r.type].range && r.type !== 'catapult'); },
  readyScore(a) {
    const g = this.armyGen(a);
    return Ready.score(this.readyOf(a), { missile: this.hasMissile(a), hurt: !!(g && g.wounded && g.wounded > this.S.turn) });
  },
  // أثر الجاهزية في تقدير القوة (نفس اتجاه المحاكاة)
  readyMul(armies) {
    const w = armies.map((a) => ({ a, m: this.menOf(a.regs) }));
    const tot = w.reduce((t, x) => t + x.m, 0);
    if (!tot) return 1;
    return w.reduce((t, x) => {
      const r = this.readyOf(x.a);
      return t + (1 - r.fat * 0.006) * (0.65 + r.coh * 0.0035) * (0.65 + r.sup * 0.0035) * (0.6 + Math.min(90, r.mor) / 225) * x.m / tot;
    }, 0);
  },
  garrisonReady(n) {
    const sieged = this.besiegers(n.id).length > 0;
    const r = { ...Ready.base(), ...(n.ready || {}) };
    if (sieged) r.fat = Math.max(10, r.fat);
    if (n.stores < 0) { r.mor = Math.min(50, r.mor); r.sup = Math.min(20, r.sup); }
    else if (n.stores <= 1 && sieged) r.sup = Math.min(60, r.sup);
    return r;
  },
  // Military supply only: an occupied hostile city cannot relay wagons to a distant friend.
  militarySupplyHops(a) {
    const seen = new Set([a.node]); let layer = [a.node];
    const safe = (id) => !this.S.armies.some((b) => b.node === id && this.atWar(b.fid, a.fid));
    const friendly = (id) => this.friendly(this.node(id)?.owner, a.fid) && safe(id);
    if (!a.siege && friendly(a.node)) return 0;
    for (let d = 1; d <= 6; d++) {
      const next = [];
      for (const id of layer) for (const x of this.adj(id)) {
        if (seen.has(x)) continue;
        seen.add(x);
        if (friendly(x)) return d;
        if (safe(x) && !this.atWar(this.node(x)?.owner, a.fid)) next.push(x);
      }
      layer = next;
    }
    return 6;
  },
  readyReasons(a) {
    const r = this.readyOf(a), hops = this.militarySupplyHops(a), n = this.node(a.node);
    return [hops === 0 ? 'إمداد محلي من مدينة صديقة آمنة' : hops === 6 ? 'لا طريق إمداد آمن قريب؛ المؤن والتعافي محدودان' : `الإمداد على بعد ${hops} طرق آمنة`,
      a.siege ? 'نوبات الحصار تمنع الراحة الكاملة' : null,
      ['desert', 'mountains', 'forest'].includes(n?.terrain) ? 'المسير في هذه الأرض يستهلك جهدًا إضافيًا' : null,
      r.battles ? `خاض ${r.battles} معارك هذا الدور؛ لا تعافٍ بين المواجهات` : null,
      r.fat > 40 ? 'التعب يقلل الضرب ودقة الأوامر' : null,
      r.ammo < 30 && this.hasMissile(a) ? 'مخزون السهام محدود؛ تغيير الخطة لا يعيده' : null].filter(Boolean);
  },

  // ——— الجيش المحاصِر حين يُهاجَم ———
  siegeHoldInfo(enc) {
    const s = this.encSides(enc);
    const armyMen = s.defArmies.reduce((t, a) => t + this.menOf(a.regs), 0);
    const garMen = this.menOf(s.node.garrison) + this.defendersOf(s.node).reduce((t, a) => t + this.menOf(a.regs), 0);
    const held = clamp(garMen / Math.max(1, armyMen), 0.25, 0.5);
    return { armyMen, garMen, commit: Math.round((1 - held) * 100) / 100, fight: Math.round(armyMen * (1 - held)), hold: Math.round(armyMen * held), turns: Math.max(0, ...s.defArmies.map((a) => (a.siege ? a.siege.turns : 0))) };
  },
  setKeep(enc, keep) {
    enc.keep = !!keep;
    enc.withGarrison = !keep && enc.garrisonCanJoin;
    enc.commit = keep ? this.siegeHoldInfo(enc).commit : 1;
  },
  // قرار الذكاء: أي الخيارين يعطيه ميزاناً أفضل
  besiegerKeeps(enc) {
    const a = { ...enc }, b = { ...enc };
    this.setKeep(a, true); this.setKeep(b, false);
    const pa = this.encPower(a), pb = this.encPower(b);
    return pa.pd / pa.pa >= 0.9 * (pb.pd / pb.pa);
  },

  // ——— التعافي كل دور ———
  readyTick() {
    for (const a of this.S.armies) {
      const r = { ...this.readyOf(a) };
      const f = this.f(a.fid);
      const n = this.node(a.node);
      const hops = this.militarySupplyHops(a);
      const rested = a.mp >= this.mpMax(a) && !a.siege;
      const home = hops === 0 && n.owner === a.fid && !this.besieger(n.id);
      const logi = this.hasTrait(a, 'logistician') ? 1.5 : 1;
      // الإمداد: من أقرب مدينة صديقة، والرحّل يعيشون على المراعي
      let supT = hops === 0 ? 100 : Math.max(20, 100 - hops * 18);
      if (f && f.horde) supT = Math.max(supT, 65);
      if (this.hasTrait(a, 'logistician')) supT = Math.min(100, supT + 15);
      if (f && f.food <= 0) supT = 10;
      r.sup = Math.round(r.sup + clamp(supT - r.sup, -30, 30));
      if (a.siege) {
        // واجب الحصار: الخطوط ممتدة والرجال في نوبات
        r.fat = Math.max(r.fat - 10 * logi, 25);
        r.coh = Math.min(85, r.coh + 8 * logi);
        r.ammo = Math.min(100, r.ammo + (hops <= 2 ? 20 : 8));
        r.mor += clamp(70 - r.mor, -4, 5);
      } else if (home && rested) {
        r.fat = Math.max(0, r.fat - 35 * logi);
        r.coh = Math.min(100, r.coh + 25 * logi);
        r.ammo = Math.min(100, r.ammo + 50);
        r.mor += clamp(75 - r.mor, -5, 14);
      } else {
        r.fat = Math.max(0, r.fat - (rested ? 15 : 8) * logi);
        r.coh = Math.min(100, r.coh + (rested ? 12 : 6) * logi);
        r.ammo = Math.min(100, r.ammo + (hops === 0 ? 30 : hops <= 2 ? 15 : 5));
        r.mor += clamp(72 - r.mor, -4, rested ? 8 : 4);
      }
      if (r.sup < 40) r.mor -= 4;
      r.strain = Math.max(0, r.strain - (home && rested ? 40 : a.siege ? 12 : rested ? 25 : 18));
      r.battles = 0;
      for (const k of ['fat', 'mor', 'ammo', 'coh', 'sup', 'strain']) r[k] = Math.round(clamp(r[k], 0, 100));
      a.ready = r;
    }
    for (const n of this.S.nodes) {
      const r = this.garrisonReady(n), sieged = this.besiegers(n.id).length > 0;
      r.fat = Math.max(sieged ? 10 : 0, r.fat - (sieged ? 8 : 30));
      r.coh = Math.min(sieged ? 85 : 100, r.coh + (sieged ? 5 : 20));
      r.ammo = Math.min(100, r.ammo + (sieged ? (n.stores > 0 ? 8 : 0) : 40));
      r.sup = sieged ? Math.min(r.sup, n.stores < 0 ? 20 : n.stores <= 1 ? 60 : 90) : Math.min(100, r.sup + 30);
      r.mor = Math.min(sieged ? 70 : 75, r.mor + (sieged ? 3 : 12));
      r.strain = Math.max(0, r.strain - (sieged ? 12 : 30)); r.battles = 0; n.ready = r;
    }
  },
});

// ——— ربط الجاهزية بالحملة ———
{
  const makeEnc = Game.makeEnc;
  Game.makeEnc = function (type, attArmies, nodeId, defArmies) {
    const enc = makeEnc.call(this, type, attArmies, nodeId, defArmies);
    if (type === 'relief') {
      const defs = enc.def.map((id) => this.army(id)).filter(Boolean);
      if (defs.some((d) => d.siege && d.node === enc.node)) {
        enc.siegeHold = true;
        enc.garrisonCanJoin = enc.withGarrison;
        this.setKeep(enc, true);
        if (enc.defFid !== this.S.player) this.setKeep(enc, this.besiegerKeeps(enc));
      }
    }
    return enc;
  };
  const encPower = Game.encPower;
  Game.encPower = function (enc) {
    const r = encPower.call(this, enc);
    const s = this.encSides(enc);
    r.pa *= this.readyMul(s.attArmies);
    r.pd *= this.readyMul(s.defArmies) * (enc.keep && enc.commit ? enc.commit : 1);
    return r;
  };
  const simConfig = Game.simConfig;
  Game.simConfig = function (enc) {
    const cfg = simConfig.call(this, enc);
    const s = this.encSides(enc);
    const mix = (armies, withGar) => Ready.mix([
      ...armies.map((a) => ({ r: this.readyOf(a), w: this.menOf(a.regs) })),
      ...(withGar ? [{ r: this.garrisonReady(s.node), w: this.menOf(s.node.garrison) }] : []),
    ]);
    cfg.sides[0].ready = mix(s.attArmies, enc.withGarrison);
    cfg.sides[1].ready = mix(s.defArmies, enc.garrison);
    if (enc.keep && enc.commit < 1) cfg.sides[1].commit = enc.commit;
    // ملف القائد: موهبته ونمطه وعقيدته وأرضه ووحداته وجرحه
    for (const sd of cfg.sides) {
      for (const x of sd.gens) {
        const g = this.gen(x.id);
        if (!g) continue;
        Object.assign(x, { arch: g.arch, style: g.style, doctrine: g.doctrine, terrain: g.terrain || [], units: g.units || [], wounded: !!(g.wounded && g.wounded > this.S.turn) });
        if (this.leaderIdentity) {
          const id = this.leaderIdentity(g);
          Object.assign(x, { skills: id.skills, personality: id.key, loyalty: g.loy, trust: g.bond?.trust, ambition: g.bond?.ambition });
        }
      }
    }
    cfg.sides[0].readyReasons = s.attArmies.flatMap((a) => this.readyReasons(a));
    cfg.sides[1].readyReasons = s.defArmies.flatMap((a) => this.readyReasons(a));
    return cfg;
  };
  const applySim = Game.applySim;
  Game.applySim = function (enc, res) {
    if (res && typeof res === 'object' && res._campaignApplied) return res._campaignApplied;
    if (!res || res === 'cancel' || res.winner == null) return null;
    const before = this.encSides(enc);
    enc.menBefore = Object.fromEntries([...before.attArmies, ...before.defArmies].map((a) => [a.id, this.menOf(a.regs)]));
    enc.totalBefore = [this.menOf(before.attRegs), this.menOf(before.defRegs)];
    const out = applySim.call(this, enc, res);
    if (!out) return out;
    if (res.breached && enc.type === 'assault') this.node(enc.node).lastBreach = this.S.turn;
    // الرجال الباقون على خطوط الحصار يعودون إلى وحداتهم
    for (const sd of res.sides) for (const u of sd.units) if (u.ref && u.held > 0) u.ref.men += u.held;
    const s = this.encSides(enc);
    [s.attArmies, s.defArmies].forEach((armies, i) => {
      const st = res.sides[i] && res.sides[i].after;
      if (!st) return;
      for (const a of armies) a.ready = Ready.after(this.readyOf(a), st);
    });
    if (enc.withGarrison && res.sides[0]?.after) s.node.ready = Ready.after(this.garrisonReady(s.node), res.sides[0].after);
    if (enc.garrison && res.sides[1]?.after) s.node.ready = Ready.after(this.garrisonReady(s.node), res.sides[1].after);
    Object.defineProperty(res, '_campaignApplied', { value: out, configurable: true });
    return out;
  };
  const finishEncounter = Game.finishEncounter;
  Game.finishEncounter = async function (enc, out) {
    if (enc.siegeHold && !enc.keep) {
      const s = this.encSides(enc);
      for (const d of s.defArmies) if (d.siege) d.siege.turns = 0;
      this.event('mil', `${this.fname(enc.defFid)} ترفع حصار ${s.node.name} لتقاتل بكامل جيشها، وتضيع معدات الحصار.`, { fids: [enc.defFid, enc.attFid], node: enc.node, imp: 1 });
    }
    return finishEncounter.call(this, enc, out);
  };
  const endRound = Game.endRound;
  Game.endRound = function () {
    this.readyTick();
    return endRound.call(this);
  };
  const split = Game.splitArmy;
  Game.splitArmy = function (a, picks, dest) {
    const sourceReady = this.readyOf(a);
    const target = dest.kind === 'army' ? this.army(dest.armyId) : null;
    const oldMen = target ? this.menOf(target.regs) : 0;
    const oldReady = target ? this.readyOf(target) : null;
    const r = split.call(this, a, picks, dest);
    if (r && r.army) {
      const moved = this.menOf(r.army.regs) - oldMen;
      r.army.ready = oldMen ? Ready.mix([{ r: oldReady, w: oldMen }, { r: sourceReady, w: moved }]) : { ...sourceReady };
    }
    return r;
  };
  const merge = Game.mergeInto;
  Game.mergeInto = function (src, dst) {
    const sourceReady = this.readyOf(src), oldReady = this.readyOf(dst), oldMen = this.menOf(dst.regs);
    const err = merge.call(this, src, dst);
    if (!err) dst.ready = Ready.mix([{ r: sourceReady, w: this.menOf(dst.regs) - oldMen }, { r: oldReady, w: oldMen }]);
    return err;
  };
  const move = Game.moveAlong;
  Game.moveAlong = function (a, plan) {
    const r = this.readyOf(a), cost = Math.max(0, Number(plan.cost) || 0);
    const harsh = (plan.path || []).some((id) => ['mountains', 'desert', 'forest'].includes(this.node(id)?.terrain));
    const logi = this.hasTrait(a, 'logistician') ? 0.7 : 1;
    const result = move.call(this, a, plan);
    r.fat = clamp(r.fat + Math.ceil(cost * (harsh ? 4 : 2) * logi), 0, 100);
    r.sup = clamp(r.sup - Math.ceil(cost * (harsh ? 2 : 1) * logi), 0, 100);
    a.ready = r;
    return result;
  };
  const normalize = Game.normalizeState;
  Game.normalizeState = function () {
    normalize.call(this);
    const clean = (r) => {
      const b = Ready.base(), n = { ...b, ...(r || {}) };
      for (const k of Object.keys(b)) n[k] = Number.isFinite(n[k]) ? Math.round(clamp(n[k], 0, k === 'battles' ? 9999 : 100)) : b[k];
      return n;
    };
    for (const a of this.S.armies) a.ready = clean(a.ready);
    for (const n of this.S.nodes) n.ready = clean(n.ready);
  };
}
