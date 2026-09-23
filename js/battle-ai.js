'use strict';
// ذكاء العدو في المعركة: يقرأ الأرض، يختار الأهداف المضادة، يلتف على الأجناب، وينصب الكمائن

const COUNTER = {
  // كلما قلّ الرقم كان الهدف أفضل لهذا النوع
  spear: { cavalry: 0.45, horsearcher: 0.6, general: 0.5, sword: 1.4, archer: 0.8 },
  sword: { spear: 0.6, archer: 0.55, militia: 0.6, cavalry: 1.3, horsearcher: 1.2, catapult: 0.6 },
  militia: { cavalry: 0.7, sword: 1.4 },
  cavalry: { archer: 0.35, catapult: 0.35, horsearcher: 0.7, sword: 0.9, spear: 2.4, militia: 1.6, general: 0.8 },
  general: { archer: 0.5, catapult: 0.5, spear: 2.5 },
};

class BattleAI {
  constructor(b, side, skill) {
    this.b = b; this.side = side; this.skill = clamp(skill, 0, 1);
    this.t = 0; this.next = 1 + R(); this.posture = 'defend';
    this.slots = new Map();
    this.style = 'classic';
  }

  get foe() { return 1 - this.side; }
  mine() { return this.b.regs.filter((r) => r.side === this.side && r.active); }
  enemies() { return this.b.regs.filter((r) => r.side === this.foe && r.alive && r.visibleTo(this.side)); }

  deploy() {
    const b = this.b;
    const hasForest = (() => {
      const z = b.zone(this.side);
      for (let y = z.y0; y < z.y1; y += TS) for (let x = z.x0; x < z.x1; x += TS) if (b.map.tileAt(x, y) === T.FOREST) return true;
      return false;
    })();
    const isAtt = this.side === 0;
    if (b.kind === 'siege') this.style = 'classic';
    else if (!isAtt && hasForest && this.skill > 0.45 && R() < 0.7) this.style = 'ambush';
    else if (!isAtt && this.skill > 0.3) this.style = 'defensive';
    b.autoDeploy(this.side, this.style);
    b.setPlan(this.side, this.choosePlan(isAtt, hasForest));
    for (const r of b.sideRegs(this.side)) {
      r.slotAnchor = { x: r.x, y: r.y, face: r.facing };
      if (r.type === 'cavalry' || r.type === 'horsearcher') r.stance = 'hold';
    }
  }

  choosePlan(isAtt, hasForest) {
    const b = this.b, mine = b.sideRegs(this.side);
    if (this.skill < 0.3) return 'balanced';
    const tr = b.traits[this.side];
    const share = (f) => mine.filter(f).length / Math.max(1, mine.length);
    const cav = share((r) => r.def.cls === 'cav' && r.type !== 'general');
    const arch = share((r) => r.ranged);
    let plan = 'balanced';
    if (b.kind === 'siege') plan = this.side === 0 ? (arch > 0.35 ? 'skirmish' : 'assault') : 'hold';
    else if (this.style === 'ambush' && hasForest) plan = 'ambush';
    else if (!isAtt && this.style === 'defensive') plan = 'hold';
    else if (cav > 0.3) plan = 'flank';
    else if (arch > 0.35) plan = 'skirmish';
    else if (isAtt) plan = 'assault';
    const aff = PLAN_AFFINITY[tr];
    if (aff && aff !== '*' && R() < 0.5 && !(aff === 'hold' && isAtt)) plan = aff;
    return plan;
  }

  // أوامر القائد
  commands() {
    const b = this.b, side = this.side;
    if (this.skill < 0.3 || b.cp[side] <= 0 || b.generalDown[side]) return;
    const mine = this.mine();
    if (!mine.length) return;
    const foes = this.enemies().filter((e) => e.state !== 'routing');
    const engaged = mine.filter((r) => r.engaged).length;
    const avgMor = mine.reduce((s, r) => s + r.morale, 0) / mine.length;
    const S = this.strength(mine), E = this.strength(foes);
    const use = (k, t) => b.useCommand(side, k, t) === null;
    if (b.kind === 'siege' && side === 0 && b.time > 15 && !this.usedGate && (b.map.crossings(true).length || mine.some((r) => r.type === 'ram' || r.type === 'tower'))) {
      if (use('gate')) { this.usedGate = true; return; }
    }
    if (avgMor < 42 && engaged >= 2 && use('hold')) return;
    const idleCav = mine.filter((r) => r.def.cls === 'cav' && r.type !== 'general' && !r.ranged && !r.engaged);
    if (idleCav.length && foes.filter((e) => e.engaged).length >= 2 && R() < 0.6 && use('flank')) return;
    const archers = mine.filter((r) => r.ranged && r.ammo > 0);
    if (archers.length >= 2 && R() < 0.35) {
      const gen = foes.find((e) => e.type === 'general' && archers.some((a) => a.inRangeOf(e)));
      if (gen && use('volley', gen)) return;
    }
    if (engaged >= mine.length * 0.5 && S > E * 1.1 && R() < 0.5 && use('charge')) return;
  }

  onStart() {
    this.t = 0;
    for (const r of this.b.sideRegs(this.side)) if (!r.slotAnchor) r.slotAnchor = { x: r.x, y: r.y, face: r.facing };
  }

  update(dt) {
    this.t += dt;
    if (this.t < this.next) return;
    this.next = this.t + (1.3 - 0.7 * this.skill) * (0.8 + R() * 0.4);
    try {
      this.think();
      this.cmdT = (this.cmdT || 0) - 1;
      if (this.cmdT <= 0) { this.cmdT = 3; this.commands(); }
    } catch (e) { console.error(e); }
  }

  strength(list) {
    let s = 0;
    for (const r of list) {
      if (!r.alive || r.state === 'routing') continue;
      const d = r.def;
      s += r.men * d.hp * (d.atk + d.def + (d.missile || 0) * 1.5 + (d.charge || 0) * 0.3) * (r.morale / 100 + 0.5);
    }
    return s;
  }

  centroid(list) {
    let x = 0, y = 0, n = 0;
    for (const r of list) { x += r.x * r.men; y += r.y * r.men; n += r.men; }
    return n ? { x: x / n, y: y / n } : null;
  }

  think() {
    const b = this.b;
    const mine = this.mine();
    if (!mine.length) return;
    const enemiesAll = this.enemies();
    const enemies = enemiesAll.filter((e) => e.state !== 'routing');
    const S = this.strength(mine), E = this.strength(enemies);

    if (b.kind === 'siege') {
      if (this.side === 0) this.siegeAttack(mine, enemies, enemiesAll);
      else this.siegeDefend(mine, enemies, enemiesAll);
      return;
    }

    const isAtt = this.side === 0 && b.cfg.attackerAI !== false;
    if (!enemies.length) {
      // لا نرى أحداً: نتقدم بحذر نحو منطقة العدو (ربما في كمين)
      if (isAtt || b.time > 90) {
        const z = b.zone(this.foe);
        const tgt = { x: (z.x0 + z.x1) / 2, y: (z.y0 + z.y1) / 2 };
        for (const r of mine) if (!r.order && !r.engaged) r.setOrder({ type: 'move', x: tgt.x + (r.x - BW / 2) * 0.6, y: tgt.y });
      }
      return;
    }

    const ec = this.centroid(enemies) || this.centroid(enemiesAll);
    const mc = this.centroid(mine);
    const minDist = Math.min(...enemies.map((e) => Math.min(...mine.map((m) => Math.hypot(e.x - m.x, e.y - m.y)))));
    if (this.posture !== 'attack') {
      if (isAtt || S > E * 1.3 || b.time > 110 - this.skill * 20 || minDist < 170) this.posture = 'attack';
    }
    if (this.posture === 'attack' && !isAtt && S < E * 0.6 && minDist > 260 && b.time < 150) this.posture = 'defend';

    const dir = norm(ec.x - mc.x, ec.y - mc.y);
    const faceAng = Math.atan2(dir.y, dir.x);
    const infantry = mine.filter((r) => r.def.cls === 'inf' && !r.ranged);
    const front = this.centroid(infantry.length ? infantry : mine);

    // تماسك الصف: المشاة المتقدمون ينتظرون البقية
    const prog = (r) => (r.x - mc.x) * dir.x + (r.y - mc.y) * dir.y;
    const infFree = infantry.filter((r) => !r.engaged);
    const avgProg = infFree.length ? infFree.reduce((s, r) => s + prog(r), 0) / infFree.length : 0;
    this.cohesion = { prog, avgProg, anyEngaged: infantry.some((r) => r.engaged), front, dir };

    for (const r of mine) {
      if (r.engaged && !this.shouldDisengage(r)) continue;
      if (r.engaged && this.shouldDisengage(r)) {
        const a = Math.atan2(r.y - r.primary.y, r.x - r.primary.x);
        r.setOrder({ type: 'move', x: clamp(r.x + Math.cos(a) * 130, 30, BW - 30), y: clamp(r.y + Math.sin(a) * 130, 30, BH - 30) });
        r.recharging = true;
        continue;
      }
      if (r.recharging && r.order && r.order.type === 'move') continue;
      r.recharging = false;
      switch (r.type) {
        case 'archer': this.thinkArcher(r, enemies, enemiesAll, front, dir); break;
        case 'horsearcher': this.thinkHorseArcher(r, enemies, enemiesAll); break;
        case 'cavalry': this.thinkCavalry(r, enemies, enemiesAll, mine); break;
        case 'catapult': this.thinkCatapult(r, enemies, mc, dir); break;
        case 'general': this.thinkGeneral(r, enemies, front, dir, S, E); break;
        default: this.thinkInfantry(r, enemies, faceAng); break;
      }
    }
  }

  homeDir() { return { x: 0, y: this.b.fleeY(this.side) < 0 ? -1 : 1 }; }

  shouldDisengage(r) {
    if (this.skill < 0.5) return false;
    if (r.type !== 'cavalry' && r.type !== 'general') return false;
    if (!r.primary) return false;
    const bad = r.primary.def.antiCav && relDir(r.primary, r) === 'front';
    return (r.engageTime > 7 && (bad || r.men < r.startMen * 0.5)) || (bad && r.engageTime > 2.5);
  }

  score(r, e) {
    const d = Math.hypot(e.x - r.x, e.y - r.y);
    const table = COUNTER[r.type] || {};
    let s = d * (table[e.type] || 1);
    if (e.state === 'routing') s *= r.def.cls === 'cav' ? 1.2 : 3;
    if (e.engaged) s *= 0.75;
    if (e.def.antiCav && r.def.cls === 'cav' && !e.engaged) s *= 1.8;
    return s;
  }

  bestTarget(r, list) {
    let best = null, bs = 1e12;
    for (const e of list) { const s = this.score(r, e); if (s < bs) { bs = s; best = e; } }
    return best;
  }

  retarget(r, t, extra = {}) {
    const o = r.order;
    if (o && o.type === 'attack' && o.target === t && !!o.flank === !!extra.flank) return;
    if (o && o.type === 'attack' && o.target.alive && o.target.state !== 'routing' && t && this.score(r, t) > this.score(r, o.target) * 0.7) return;
    r.setOrder({ type: 'attack', target: t, ...extra });
  }

  thinkInfantry(r, enemies, faceAng) {
    if (r.type === 'spear' && this.skill > 0.4) {
      const cavNear = enemies.some((e) => e.def.cls === 'cav' && e.type !== 'horsearcher' && Math.hypot(e.x - r.x, e.y - r.y) < 160);
      const infNear = enemies.some((e) => e.def.cls === 'inf' && !e.ranged && Math.hypot(e.x - r.x, e.y - r.y) < 120);
      r.formation = cavNear && !infNear && !r.engaged ? 'square' : 'line';
    }
    if (r.type === 'sword' && this.skill > 0.4) {
      const underFire = r.sinceHit < 2 && !enemies.some((e) => !e.ranged && Math.hypot(e.x - r.x, e.y - r.y) < 150);
      r.formation = underFire && this.posture === 'defend' ? 'square' : 'line';
    }
    if (this.posture === 'defend') {
      const threat = r.nearestEnemy(120, (e) => e.active);
      if (threat) return this.retarget(r, threat);
      const a = r.slotAnchor;
      if (a && Math.hypot(a.x - r.x, a.y - r.y) > 20 && !r.order) r.setOrder({ type: 'move', x: a.x, y: a.y, face: faceAng });
      else if (!r.order) r.wantFace = faceAng;
      return;
    }
    const t = this.bestTarget(r, enemies);
    const c = this.cohesion;
    if (t && c && this.skill > 0.35 && !c.anyEngaged && c.prog(r) > c.avgProg + 45 && Math.hypot(t.x - r.x, t.y - r.y) > 110) {
      if (r.order) r.setOrder(null);
      r.wantFace = faceAng;
      return;
    }
    if (t) this.retarget(r, t);
  }

  thinkArcher(r, enemies, all, front, dir) {
    if (r.ammo <= 0) {
      // نفدت السهام: الانضمام للالتحام على هدف مشتبك
      const t = this.bestTarget(r, enemies.filter((e) => e.engaged)) || this.bestTarget(r, all.filter((e) => e.state === 'routing'));
      if (t) this.retarget(r, t, { melee: true });
      return;
    }
    const threat = r.nearestEnemy(85, (e) => e.active && !e.ranged && e.def.cls !== 'mach');
    if (threat && this.skill > 0.3 && !r.engaged) {
      // التراجع نحو خطوطنا لا نحو العدو
      const away = norm(r.x - threat.x, r.y - threat.y);
      const home = this.homeDir();
      const v = norm(away.x + home.x * 1.2, away.y + home.y * 1.2);
      r.setOrder({ type: 'move', x: clamp(r.x + v.x * 110, 30, BW - 30), y: clamp(r.y + v.y * 110, 30, BH - 30) });
      return;
    }
    let best = null, bs = 1e12;
    for (const e of enemies) {
      const d = Math.hypot(e.x - r.x, e.y - r.y);
      let s = d;
      if (e.type === 'sword') s *= e.formation === 'square' ? 2.6 : 1.5;
      if (this.b.map.tileAt(e.x, e.y) === T.FOREST) s *= 1.8;
      if (e.type === 'archer' || e.type === 'horsearcher') s *= 0.8;
      if (e.def.cls === 'cav') s *= 0.9;
      if (e.formation === 'loose') s *= 1.5;
      if (s < bs) { bs = s; best = e; }
    }
    if (!best) return;
    const c = this.cohesion;
    const tooFar = c && c.prog(r) > c.avgProg - 35;
    if (!r.inRangeOf(best) && (this.posture === 'defend' || tooFar)) {
      // لا يتقدم الرماة أمام صف المشاة
      const inRange = enemies.filter((e) => r.inRangeOf(e));
      if (inRange.length) { this.retarget(r, inRange.reduce((a, e) => (Math.hypot(e.x - r.x, e.y - r.y) < Math.hypot(a.x - r.x, a.y - r.y) ? e : a))); return; }
      if (r.order && r.order.type === 'attack') r.setOrder(null);
      if (this.posture !== 'defend' && c && c.prog(r) < c.avgProg - 90) {
        r.setOrder({ type: 'move', x: r.x + dir.x * 50, y: r.y + dir.y * 50, face: Math.atan2(dir.y, dir.x) });
      } else r.wantFace = Math.atan2(dir.y, dir.x);
      return;
    }
    this.retarget(r, best);
  }

  thinkHorseArcher(r, enemies, all) {
    if (r.ammo <= 0) {
      const t = this.bestTarget(r, all.filter((e) => e.state === 'routing' || (e.ranged && e.def.cls === 'inf')));
      if (t) this.retarget(r, t, { melee: true });
      return;
    }
    if (this.posture === 'defend' && r.stance === 'hold') {
      const t = enemies.find((e) => r.inRangeOf(e));
      if (t) this.retarget(r, t);
      return;
    }
    let best = null, bs = 1e12;
    for (const e of enemies) {
      let s = Math.hypot(e.x - r.x, e.y - r.y);
      if (e.def.cls === 'cav' && !e.ranged) s *= 2.2;
      if (e.type === 'sword') s *= 1.6;
      if (s < bs) { bs = s; best = e; }
    }
    if (best) this.retarget(r, best);
  }

  thinkCavalry(r, enemies, all, mine) {
    const b = this.b;
    // الكمين: ننتظر حتى يلتحم العدو بمشاتنا
    if (this.posture === 'defend' || (r.stance === 'hold' && r.hidden)) {
      const engagedFoes = enemies.filter((e) => e.engaged);
      const close = r.nearestEnemy(140, (e) => e.active);
      if (!engagedFoes.length && !close && b.time < 150) return;
    }
    r.stance = 'aggressive';
    const c = this.cohesion;
    if (c && this.skill > 0.45 && !c.anyEngaged && b.time < 200) {
      // ننتظر على الجناح حتى تلتحم المشاة، إلا إذا انكشف هدف رخو بعيد عن الرماح
      const exposed = enemies.filter((e) => (e.ranged || e.def.cls === 'mach') && !enemies.some((s) => s.def.antiCav && s.active && Math.hypot(s.x - e.x, s.y - e.y) < 110));
      if (!exposed.length) {
        if (c.front) {
          const lat = { x: -c.dir.y, y: c.dir.x };
          const sgn = ((r.x - c.front.x) * lat.x + (r.y - c.front.y) * lat.y) >= 0 ? 1 : -1;
          const gx = clamp(c.front.x + lat.x * sgn * 230 - c.dir.x * 30, 40, BW - 40), gy = clamp(c.front.y + lat.y * sgn * 230 - c.dir.y * 30, 40, BH - 40);
          if (Math.hypot(gx - r.x, gy - r.y) > 50 && (!r.order || r.order.type !== 'move')) r.setOrder({ type: 'move', x: gx, y: gy, face: Math.atan2(c.dir.y, c.dir.x) });
        }
        return;
      }
      const t0 = this.bestTarget(r, exposed);
      if (t0) { this.retarget(r, t0, { flank: true }); return; }
    }
    const soft = enemies.filter((e) => (e.ranged || e.def.cls === 'mach') && !e.engaged);
    const pinned = enemies.filter((e) => e.engaged && e.contacts.some((c) => c.side === this.side));
    let t = null, flank = false;
    if (soft.length) {
      t = this.bestTarget(r, soft);
      const blockers = enemies.filter((e) => e.def.antiCav && !e.engaged && e !== t && distToSeg(e.x, e.y, r.x, r.y, t.x, t.y) < 50);
      flank = blockers.length > 0 && this.skill > 0.35;
    }
    if (!t && pinned.length) { t = this.bestTarget(r, pinned); flank = this.skill > 0.3; }
    if (!t) {
      const routers = all.filter((e) => e.state === 'routing');
      t = this.bestTarget(r, [...enemies.filter((e) => !(e.def.antiCav && !e.engaged)), ...routers]);
      flank = this.skill > 0.5;
    }
    if (!t) t = this.bestTarget(r, enemies);
    if (!t) return;
    if (r.type === 'cavalry' && this.skill > 0.5) r.formation = 'wedge';
    this.retarget(r, t, { flank });
  }

  thinkCatapult(r, enemies, mc, dir) {
    if (r.ammo <= 0) return;
    let best = null, bs = -1;
    for (const e of enemies) {
      const d = Math.hypot(e.x - r.x, e.y - r.y);
      if (d > r.range() || d < (r.def.minRange || 0)) continue;
      if (e.engaged && e.contacts.some((c) => c.side === this.side)) continue;
      const s = e.men * (e.formation === 'loose' ? 0.5 : 1) * (e.formation === 'square' ? 1.4 : 1);
      if (s > bs) { bs = s; best = e; }
    }
    if (best) { this.retarget(r, best); return; }
    const t = enemies.reduce((a, e) => (!a || Math.hypot(e.x - r.x, e.y - r.y) < Math.hypot(a.x - r.x, a.y - r.y) ? e : a), null);
    if (t && !r.order) {
      const d = Math.hypot(t.x - r.x, t.y - r.y);
      if (d > r.range()) r.setOrder({ type: 'move', x: r.x + dir.x * Math.min(120, d - r.range() + 40), y: r.y + dir.y * Math.min(120, d - r.range() + 40) });
    }
  }

  thinkGeneral(r, enemies, front, dir, S, E) {
    const danger = r.nearestEnemy(110, (e) => e.active && (e.def.cls === 'cav' || e.def.antiCav));
    if (danger && S < E * 1.4 && this.skill > 0.3) {
      const a = Math.atan2(r.y - danger.y, r.x - danger.x);
      r.setOrder({ type: 'move', x: clamp(r.x + Math.cos(a) * 120, 30, BW - 30), y: clamp(r.y + Math.sin(a) * 120, 30, BH - 30) });
      return;
    }
    const routers = enemies.length === 0 || S > E * 2.2;
    if (routers || (r.nearestEnemy(60) && !danger)) {
      const t = this.bestTarget(r, enemies.filter((e) => !e.def.antiCav || e.engaged));
      if (t) { this.retarget(r, t, { flank: true }); return; }
    }
    if (front) {
      const gx = front.x - dir.x * 90, gy = front.y - dir.y * 90;
      if (Math.hypot(gx - r.x, gy - r.y) > 45 && (!r.order || r.order.type !== 'move')) r.setOrder({ type: 'move', x: gx, y: gy, face: Math.atan2(dir.y, dir.x) });
    }
  }

  // ——— الحصار: المهاجم ———
  siegeAttack(mine, enemies, all) {
    const b = this.b, map = b.map;
    const breaches = map.breaches();
    const gateOpen = map.gateOpen;
    const docked = Object.values(map.docked).some(Boolean);
    const entries = breaches.length > 0 || docked;
    const ladders = mine.some((r) => r.ladders) && map.ladders;
    const plaza = map.plaza;
    const stageY = WALL_Y + 250;
    const towersComing = mine.some((r) => r.type === 'tower' && r.docked == null);
    const assault = entries || (ladders && b.time > 25) || b.time > 240;
    const up = -Math.PI / 2;

    for (const r of mine) {
      if (r.engaged) continue;
      if (r.type === 'tower') {
        if (r.docked == null && (!r.order || r.order.type !== 'tower')) r.setOrder({ type: 'tower', col: r.towerCol });
        continue;
      }
      if (r.type === 'ram') {
        if (!gateOpen && (!r.order || r.order.type !== 'gate')) r.setOrder({ type: 'gate' });
        continue;
      }
      if (r.type === 'catapult') {
        if (r.ammo <= 0) continue;
        if (!gateOpen) {
          if (!r.order || r.order.type !== 'wall') r.setOrder({ type: 'wall', x: 30 * TS, y: WALL_Y + TS / 2 });
        } else if (breaches.length < 3) {
          const col = [12, 20, 40, 48][r.id % 4];
          if (!r.order || r.order.type !== 'wall') r.setOrder({ type: 'wall', x: (col + 0.5) * TS, y: WALL_Y + TS / 2 });
        } else this.thinkCatapult(r, enemies, null, { x: 0, y: -1 });
        continue;
      }
      if (r.type === 'archer' || r.type === 'horsearcher') {
        if (r.ammo > 0) {
          const t = this.bestTarget(r, enemies.filter((e) => e.y < WALL_Y + 10 && e.y > WALL_Y - 80)) || this.bestTarget(r, enemies);
          if (t) {
            if (Math.hypot(t.x - r.x, t.y - r.y) > r.range() && r.y < WALL_Y + 140) continue;
            this.retarget(r, t);
          } else if (!r.order) r.setOrder({ type: 'move', x: r.x, y: WALL_Y + 150, face: up });
          continue;
        }
      }
      const inside = r.y < WALL_Y;
      // انتظار الأبراج حتى تلتصق إن كانت قريبة
      if (!entries && towersComing && !ladders && !inside) {
        const t = mine.find((x) => x.type === 'tower' && x.docked == null);
        if (t && !r.order) r.setOrder({ type: 'move', x: t.x + (R() - 0.5) * 60, y: t.y + 70, face: up });
        continue;
      }
      if (!assault && !inside) {
        if (!r.order && Math.abs(r.y - stageY) > 40) r.setOrder({ type: 'move', x: r.x, y: stageY, face: up });
        continue;
      }
      // الاقتحام
      const insideFoes = enemies.filter((e) => e.y < WALL_Y + 20);
      let t = null;
      if (inside || entries) t = this.bestTarget(r, insideFoes.filter((e) => Math.hypot(e.x - r.x, e.y - r.y) < 260));
      if (!t && enemies.length && Math.hypot(enemies[0].x - r.x, enemies[0].y - r.y) < 150) t = this.bestTarget(r, enemies);
      if (t) { this.retarget(r, t); continue; }
      if (!entries && ladders && r.ladders && !inside) {
        const col = LADDER_COLS[r.id % LADDER_COLS.length];
        if (!r.order) r.setOrder({ type: 'move', x: (col + 0.5) * TS, y: RAMP_ROW * TS - 30 });
        continue;
      }
      if (!entries && !inside) {
        if (!r.order) r.setOrder({ type: 'move', x: r.x, y: stageY, face: up });
        continue;
      }
      if (!r.order || r.order.type !== 'move' || Math.hypot(r.order.x - plaza.x - plaza.w / 2, r.order.y - plaza.y - plaza.h / 2) > 60) {
        r.setOrder({ type: 'move', x: plaza.x + plaza.w / 2 + (R() - 0.5) * 80, y: plaza.y + plaza.h / 2 });
      }
    }
  }

  // ——— الحصار: المدافع ———
  siegeDefend(mine, enemies) {
    const b = this.b, map = b.map;
    const breaches = map.breaches();
    const plaza = map.plaza;
    const intruders = enemies.filter((e) => e.y < WALL_Y + 5);
    const down = Math.PI / 2;
    const pc = { x: plaza.x + plaza.w / 2, y: plaza.y + plaza.h / 2 };
    const plazaThreat = intruders.some((e) => Math.hypot(e.x - pc.x, e.y - pc.y) < 200);
    // نقاط العبور المهدَّدة: الثغرات، الأبراج الملتصقة، والسلالم التي تجمّع عندها العدو
    const holes = [...breaches];
    for (const c in map.docked) if (map.docked[c]) holes.push({ x: (+c + 0.5) * TS, y: WALL_Y });
    if (map.ladders) for (const c of LADDER_COLS) {
      const x = (c + 0.5) * TS;
      if (enemies.some((e) => Math.abs(e.x - x) < 60 && e.y > WALL_Y - 10 && e.y < WALL_Y + 90)) holes.push({ x, y: WALL_Y });
    }

    for (const r of mine) {
      if (r.engaged) continue;
      if (r.ranged && r.ammo > 0 && r.def.cls === 'inf') {
        const close = intruders.find((e) => Math.hypot(e.x - r.x, e.y - r.y) < 90 && !e.ranged);
        if (close && this.skill > 0.3) {
          r.setOrder({ type: 'move', x: r.x, y: Math.max(40, r.y - 100) });
          continue;
        }
        if (!r.order && r.slotAnchor && Math.hypot(r.x - r.slotAnchor.x, r.y - r.slotAnchor.y) > 30) r.setOrder({ type: 'move', x: r.slotAnchor.x, y: r.slotAnchor.y, face: down });
        continue;
      }
      if (r.type === 'catapult') continue;
      if (intruders.length) {
        let t;
        if (r.def.cls === 'cav' || r.type === 'general') t = plazaThreat ? this.bestTarget(r, intruders) : this.bestTarget(r, intruders.filter((e) => e.engaged || e.ranged));
        else t = this.bestTarget(r, intruders);
        if (t && (r.type !== 'general' || plazaThreat || t.engaged)) { this.retarget(r, t); continue; }
      }
      if (r.def.cls === 'cav' || r.type === 'general') {
        if (!r.order && Math.hypot(r.x - pc.x, r.y - pc.y) > 90) r.setOrder({ type: 'move', x: pc.x, y: pc.y + 20 });
        continue;
      }
      // سدّ الثغرات
      if (holes.length) {
        const bp = holes.reduce((a, p) => (!a || Math.hypot(p.x - r.x, p.y - r.y) < Math.hypot(a.x - r.x, a.y - r.y) ? p : a), null);
        const gx = bp.x, gy = RAMP_ROW * TS - 28;
        if (Math.hypot(gx - r.x, gy - r.y) > 40 && (!r.order || r.order.type !== 'move')) r.setOrder({ type: 'move', x: gx, y: gy, face: down });
        continue;
      }
      if (!r.order && r.slotAnchor && Math.hypot(r.x - r.slotAnchor.x, r.y - r.slotAnchor.y) > 30) r.setOrder({ type: 'move', x: r.slotAnchor.x, y: r.slotAnchor.y, face: down });
    }
  }
}

function norm(x, y) { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; }
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
