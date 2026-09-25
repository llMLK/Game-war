'use strict';
// جاهزية الجيوش في الحملة:
// - ما يحدث في المعركة يبقى: جيش قاتل ثلاث مرات في دور واحد يدخل الثالثة متعباً قليل السهام مهزوز التماسك.
// - الراحة في مدينة لك تعيدها، والمسير والحصار والبعد عن الإمداد تبطئها.
// - الجيش المحاصِر ليس في أتم جاهزيته، وإن هوجم يختار: إبقاء الحصار والقتال بجزء منه، أو فكّ الحصار والقتال بكله.

Object.assign(Game, {
  readyOf(a) { return (a && a.ready) || Ready.base(); },
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
    return w.reduce((t, x) => t + (0.55 + 0.45 * this.readyScore(x.a).total / 100) * x.m / tot, 0);
  },
  garrisonReady(n) {
    const sieged = this.besiegers(n.id).length > 0;
    return { fat: sieged ? 10 : 0, mor: 70 - (n.stores < 0 ? 20 : 0), ammo: 100, coh: 100, sup: n.stores < 0 ? 20 : n.stores <= 1 && sieged ? 60 : 100 };
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
      const hops = this.supplyHops(a);
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
      for (const k of ['fat', 'mor', 'ammo', 'coh', 'sup']) r[k] = Math.round(clamp(r[k], 0, 100));
      a.ready = r;
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
      }
    }
    return cfg;
  };
  const applySim = Game.applySim;
  Game.applySim = function (enc, res) {
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
    const r = split.call(this, a, picks, dest);
    if (r && r.army) r.army.ready = { ...this.readyOf(a) };
    return r;
  };
  const merge = Game.mergeInto;
  Game.mergeInto = function (src, dst) {
    const mix = Ready.mix([{ r: this.readyOf(src), w: this.menOf(src.regs) }, { r: this.readyOf(dst), w: this.menOf(dst.regs) }]);
    const err = merge.call(this, src, dst);
    if (!err) dst.ready = mix;
    return err;
  };
}
