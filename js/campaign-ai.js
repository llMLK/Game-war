'use strict';
// تنفيذ الحركات والمواجهات + ذكاء الممالك المنافسة على الخريطة

Object.assign(Game, {
  startSiege(a, n) {
    a.from = a.node; a.node = n.id; a.siege = { turns: 0 }; a.moved = true;
    this.log(`${this.fname(a.fid)} تضرب الحصار على ${n.name}.`, 'war');
    if (this.f(n.owner) && this.f(n.owner).isPlayer && this.hooks.notify) this.hooks.notify(`⚠️ ${this.fname(a.fid)} تحاصر ${n.name}!`);
  },

  // تُرجع true إذا تمت الحركة/المواجهة
  async executeMove(a, n) {
    const plan = this.planMove(a, n);
    if (plan.err) return false;
    if (plan.simple) { const res = this.enterOwn(a, n); if (res) res.moved = true; a.moved = true; return true; }
    if (plan.siege) { this.startSiege(a, n); return true; }
    if (plan.join) {
      const room = MAX_REGS - plan.join.regs.length;
      plan.join.regs.push(...a.regs.splice(0, room));
      a.moved = true;
      if (!a.regs.length) this.removeArmy(a);
      this.log(`تعزيزات ${this.fname(a.fid)} تنضم إلى حصار ${n.name}.`, 'war');
      return true;
    }
    await this.resolveEnc(plan.enc);
    return true;
  },

  async resolveEnc(enc) {
    const p = this.S.player;
    const involved = enc.attFid === p || enc.defFid === p;
    let winner;
    if (involved && this.hooks.encounter) {
      winner = await this.hooks.encounter(enc);
      if (winner === 'settled' || winner === 'cancel') return winner;
    } else winner = this.autoResolve(enc);
    await this.finishEncounter(enc, winner);
    return winner;
  },
});

const CampaignAI = {
  pers(fid) {
    const p = Game.sc.factions[fid] ? Game.sc.factions[fid].personality : { aggr: 1, prefs: {} };
    return { aggr: p.aggr * DIFFS[Game.S.difficulty].aiAggr, prefs: p.prefs };
  },

  enemyNear(n, fid) {
    return Game.adj(n.id).map((id) => Game.node(id)).filter((m) => m.owner !== fid && Game.atWar(fid, m.owner));
  },

  threat(n, fid) {
    let t = 0;
    for (const id of [n.id, ...Game.adj(n.id)]) {
      for (const a of Game.armiesAt(id)) if (a.fid !== fid && Game.atWar(fid, a.fid) && a.fid !== 'neutral') t += Game.armyPower(a);
    }
    return t;
  },

  frontier(n, fid) {
    // المسافة إلى أقرب عدو (بحث بالعرض)
    const seen = new Set([n.id]);
    let layer = [n.id], d = 0;
    while (layer.length && d < 6) {
      for (const id of layer) {
        const m = Game.node(id);
        if (m.owner !== fid && Game.atWar(fid, m.owner)) return 30 - d * 5;
      }
      const next = [];
      for (const id of layer) for (const x of Game.adj(id)) if (!seen.has(x)) { seen.add(x); next.push(x); }
      layer = next; d++;
    }
    return 0;
  },

  async turn(fid) {
    const f = Game.f(fid);
    if (!f || !f.alive) return;
    await this.diplomacy(fid);
    this.build(fid);
    this.recruit(fid);
    await this.moveArmies(fid);
  },

  pickUnit(fid, n, army) {
    const w = { ...this.pers(fid).prefs };
    for (const t of Object.keys(w)) if (UNITS[t].needs === 'barracks' && !n.barracks) delete w[t];
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
    const has = (t) => army ? army.regs.filter((r) => r.type === t).length : 0;
    if (!has('archer') && w.archer) w.archer *= 2;
    if (!has('spear') && w.spear) w.spear *= 1.5;
    if (w.catapult) { if (walls < 2 || has('catapult') >= 1) delete w.catapult; else w.catapult *= 1.5; }
    return weightedPick(w);
  },

  recruit(fid) {
    const f = Game.f(fid);
    const eco = Game.economy(fid);
    let net = eco.netGold;
    const cities = Game.nodesOf(fid).filter((n) => !Game.besieger(n.id) && n.loyalty >= 25)
      .sort((a, b) => (this.frontier(b, fid) + (b.capital ? 6 : 0) + (Game.armyOf(fid, b.id) ? 8 : 0)) - (this.frontier(a, fid) + (a.capital ? 6 : 0) + (Game.armyOf(fid, a.id) ? 8 : 0)));
    let loops = 0;
    for (const n of cities) {
      const a = Game.armyOf(fid, n.id);
      const count = Game.armiesOf(fid).length;
      const cap = Math.max(2, Math.ceil(Game.nodesOf(fid).length / 2)) + Math.floor(f.gold / 700);
      if (!a && (count >= cap || f.gold < 320 || this.frontier(n, fid) < (f.gold > 1500 ? 10 : 20))) continue;
      while (loops++ < 14) {
        const reserve = net < 0 ? 250 : 90;
        if (f.gold < reserve + 60) break;
        if (net < -15) break;
        const type = this.pickUnit(fid, n, Game.armyOf(fid, n.id));
        const err = Game.canRecruit(fid, n, type);
        if (err) {
          if (err === 'الذهب لا يكفي') continue;
          break;
        }
        const cost = UNITS[type].cost + (Game.armyOf(fid, n.id) ? 0 : 60);
        if (f.gold - cost < reserve) break;
        Game.recruit(fid, n, type);
        net -= UNITS[type].upkeep;
      }
    }
  },

  build(fid) {
    const f = Game.f(fid);
    if (f.gold < 380) return;
    const eco = Game.economy(fid);
    let best = null, bs = 0;
    for (const n of Game.nodesOf(fid)) {
      if (Game.besieger(n.id)) continue;
      const fr = this.frontier(n, fid);
      const opts = {
        walls: fr >= 25 && n.walls < 2 ? 3 + (n.capital ? 2 : 0) : n.capital && n.walls < 3 ? 1.5 : 0,
        barracks: !n.barracks && (n.capital || fr >= 25) ? 3.5 : 0,
        market: n.market < 2 ? n.pop / 9000 : 0,
        farm: n.farm < 2 && eco.netFood < 5 ? 3.2 : 0,
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

  async moveArmies(fid) {
    const pers = this.pers(fid);
    const list = Game.armiesOf(fid).filter((a) => !a.moved)
      .sort((x, y) => (this.frontier(Game.node(y.node), fid) - this.frontier(Game.node(x.node), fid)) || (Game.armyPower(y) - Game.armyPower(x)));
    for (const a of list) {
      if (!Game.S.armies.includes(a) || a.moved || Game.S.over) continue;
      const pow = Game.armyPower(a);
      const here = Game.node(a.node);

      if (a.siege) {
        const enc = Game.makeEnc('assault', a, here);
        const { pa, pd } = Game.encPower(enc);
        const ratio = pa / Math.max(1, pd);
        const canBreach = a.siege.turns >= 1 || a.regs.some((r) => r.type === 'catapult');
        if (ratio > 1.45 / pers.aggr && canBreach) await Game.resolveEnc(enc);
        else if (ratio < 0.5) { a.siege = null; Game.retreatTo(a, a.from); a.moved = true; }
        else a.moved = true;
        continue;
      }

      const bs = Game.besieger(here.id);
      if (bs && here.owner === fid) {
        const enc = Game.makeEnc('sally', a, here, bs);
        const { pa, pd } = Game.encPower(enc);
        if (pa / Math.max(1, pd) > 1.15) await Game.resolveEnc(enc);
        a.moved = true;
        continue;
      }

      const thr = this.threat(here, fid);
      const guard = Game.garrisonPower(here);
      const homeAtRisk = thr > guard * 1.2 && (here.capital || thr > guard * 2);

      let best = null, bestScore = 0;
      for (const id of Game.adj(a.node)) {
        const n = Game.node(id);
        if (Game.moveCheck(a, n)) continue;
        let score = 0;
        if (n.owner === fid) {
          const b2 = Game.besieger(n.id);
          if (b2) {
            const ratio = (pow + Game.garrisonPower(n)) / Math.max(1, Game.armyPower(b2));
            if (ratio > 1.1) score = 60 * Math.min(ratio, 3);
          } else if (!homeAtRisk) {
            const fr = this.frontier(n, fid), cur = this.frontier(here, fid);
            const t2 = this.threat(n, fid);
            if (fr > cur) score = 4 + (fr - cur) * 0.4;
            if (t2 > Game.garrisonPower(n) * 1.2 && !Game.armyOf(fid, n.id)) score = Math.max(score, 25);
          }
        } else {
          const bsOwn = Game.besieger(n.id);
          if (bsOwn && bsOwn.fid === fid) {
            // تعزيز حصار قائم
            if (bsOwn.regs.length < MAX_REGS) score = 30;
            if (score > bestScore) { bestScore = score; best = n; }
            continue;
          }
          const def = Game.defensePower(n);
          let ratio = pow / Math.max(1, def);
          if (n.walls) {
            // جيوشنا المجاورة الأخرى ستلحق بالحصار
            let comb = pow;
            for (const o of Game.armiesOf(fid)) if (o !== a && !o.siege && !o.moved && Game.adj(o.node).includes(n.id)) comb += Game.armyPower(o) * 0.6;
            ratio = comb / Math.max(1, def);
          }
          // الأسوار: يكفي أن نكون أنداداً لنضرب الحصار ونجوّعهم
          const need = (n.walls ? 0.95 : 1.3) / pers.aggr;
          // الخطر على مدينتنا يزول إذا كان مصدره الجيش الذي سنحاصره
          let risk = homeAtRisk;
          if (risk) {
            let other = 0;
            for (const id2 of [here.id, ...Game.adj(here.id)]) {
              if (id2 === n.id) continue;
              for (const o of Game.armiesAt(id2)) if (o.fid !== fid && Game.atWar(fid, o.fid) && o.fid !== 'neutral') other += Game.armyPower(o);
            }
            risk = other > guard * 1.2;
          }
          if (ratio >= need && (!risk || ratio > 3)) {
            score = (n.pop / 1000 + (n.capital ? 20 : 0) + (n.owner === 'neutral' ? 4 : 0) + (Game.f(n.owner).isPlayer ? 3 : 0)) * Math.min(ratio, 3);
          }
        }
        if (score > bestScore) { bestScore = score; best = n; }
      }
      if (best) await Game.executeMove(a, best);
      a.moved = true;
    }
  },

  async diplomacy(fid) {
    const f = Game.f(fid);
    const pw = Game.factionPower(fid);
    const pers = this.pers(fid);
    for (const g of Game.majors()) {
      if (g === fid || !Game.f(g).alive || Game.S.over) continue;
      const st = Game.status(fid, g);
      const G = Game.f(g);
      const pg = Game.factionPower(g);
      Game.addRel(fid, g, st === 'war' ? -0.5 : st === 'alliance' ? 1 : 0.5);
      if (st === 'war') {
        const wt = f.warTurns[g] || 0;
        const wantPeace = wt > 4 && (pw < pg * 0.75 || (f.lostRecently || 0) >= 1 || (wt > 12 && R() < 0.2));
        if (wantPeace && R() < 0.35) {
          if (G.isPlayer) {
            const tribute = pw < pg * 0.6 ? Math.min(f.gold, 120) : 0;
            const ok = Game.hooks.proposal ? await Game.hooks.proposal({ from: fid, kind: 'peace', tribute }) : false;
            if (ok) {
              Game.setStatus(fid, g, 'peace', 8);
              Game.addRel(fid, g, 20);
              if (tribute) { f.gold -= tribute; G.gold += tribute; }
              Game.log(`صلح بين ${f.name} و${G.name}.`, 'diplo');
            } else Game.addRel(fid, g, -5);
          } else if (Game.aiWillAcceptPeace(g, fid)) {
            Game.setStatus(fid, g, 'peace', 8);
            Game.addRel(fid, g, 15);
            Game.log(`صلح بين ${f.name} و${G.name}.`, 'diplo');
          }
        }
        continue;
      }
      if ((f.truce[g] || 0) > 0) continue;
      const wars = Game.majors().filter((c) => c !== fid && Game.f(c).alive && Game.atWar(fid, c)).length;
      const borders = Game.nodesOf(fid).some((n) => Game.adj(n.id).some((id) => Game.node(id).owner === g));
      const ambition = wars === 0 && borders && Game.rel(fid, g) < 25 && pw > pg * 0.9 && R() < 0.2 * pers.aggr;
      const greed = wars < 2 && Game.rel(fid, g) < -5 && pw > pg * 1.35 && R() < 0.2 * pers.aggr;
      if (st === 'peace' && Game.S.turn > 3 && (ambition || greed)) {
        Game.declareWar(fid, g);
        if (G.isPlayer && Game.hooks.notify) Game.hooks.notify(`⚔️ ${f.name} تعلن الحرب عليك!`);
        continue;
      }
      if (G.isPlayer && pw > pg * 1.8 && R() < 0.1) {
        const amount = 150;
        const ok = Game.hooks.proposal ? await Game.hooks.proposal({ from: fid, kind: 'tribute', amount }) : false;
        if (ok && G.gold >= amount) { G.gold -= amount; f.gold += amount; Game.addRel(fid, g, 10); Game.log(`${G.name} تدفع الجزية لـ${f.name}.`, 'diplo'); }
        else {
          Game.addRel(fid, g, -15);
          if (st !== 'war' && R() < 0.5 * pers.aggr) { Game.declareWar(fid, g); if (Game.hooks.notify) Game.hooks.notify(`⚔️ رفضت الجزية فأعلنت ${f.name} الحرب!`); }
        }
        continue;
      }
      if (st === 'peace' && Game.aiWillAlly(fid, g) && R() < 0.2) {
        if (G.isPlayer) {
          const ok = Game.hooks.proposal ? await Game.hooks.proposal({ from: fid, kind: 'alliance' }) : false;
          if (ok) { Game.setStatus(fid, g, 'alliance', 10); Game.log(`حلف بين ${f.name} و${G.name}.`, 'diplo'); }
        } else if (Game.aiWillAlly(g, fid)) {
          Game.setStatus(fid, g, 'alliance', 10);
          Game.log(`حلف بين ${f.name} و${G.name}.`, 'diplo');
        }
      }
    }
  },
};
