'use strict';
// مشهد المعركة: الواجهة ولمسات القيادة على الجوال

const TIPS = [
  ['الأجناب والمؤخرة', 'الضربة من الجنب أقوى بـ40٪ ومن الخلف بـ80٪، وتنهار معها المعنويات. ثبّت العدو بالمشاة ثم التفّ عليه بالخيالة.'],
  ['حجر ورقة مقص', 'الرمّاحة تسحق الخيالة، السيّافة تهزم الرمّاحة، الخيالة تفتك بالرماة والمنجنيق. الرماة يستنزفون الجميع من بعيد.'],
  ['الانقضاض', 'الفرسان المندفعون بسرعة يوقعون ضربة أولى مدمّرة. اسحبهم بعد الالتحام ثم انقضّ مجدداً. لا تنقضّ على رماح من الأمام!'],
  ['الأرض', 'التلّ يمنح +20٪ في الالتحام ومدى أطول للرماة. الغابة تحجب السهام وتخفي جنودك عن عين العدو (كمين!). المخاضات تبطئ وتُضعف.'],
  ['المعنويات', 'الوحدات لا تُباد غالباً بل تنكسر وتفرّ. القائد يرفع المعنويات حوله، وسقوطه يهزّ الجيش كله. احمِ قائدك.'],
  ['التشكيلات', 'المربّع صلب أمام الخيالة ولا أجناب له. المنتشر يقلّل أذى السهام. الإسفين يضاعف الانقضاض. السيّافة في المربّع تصبح سلحفاة ضد السهام.'],
  ['الحصار', 'حاصِر المدينة دوراً على الأقل لتبني كبشاً وسلالم. المنجنيق يفتح الثغرات. احتلّ الساحة (المستطيل الذهبي) 25 ثانية لتسقط المدينة.'],
  ['التحكم', 'اضغط وحدة لتحديدها ثم اضغط الأرض للتحرك أو العدو للهجوم. اضغط مطوّلاً على الأرض ثم اسحب لتحدد اتجاه الصف. قرصتان للتكبير.'],
];

class BattleScene {
  constructor(cfg, onDone) {
    this.cfg = cfg;
    this.b = new Battle(cfg);
    this.cam = new Camera(BW, BH);
    this.onDone = onDone;
    this.multi = false;
    this.dragArrow = null;
    this.hudT = 0;
    this.cards = new Map();
    this.b.onEnd = (res) => setTimeout(() => this.showResult(res), 900);
  }

  get ps() { return this.b.playerSide; }
  get sel() { return this.b.regs.filter((r) => r.selected && r.alive); }

  enter() {
    App.ui.innerHTML = '';
    this.root = h('div', { class: 'battle-ui' });
    App.ui.appendChild(this.root);
    this.build();
    this.cam.padTop = 46; this.cam.padBottom = 70;
    this.focusStart();
  }
  exit() { App.ui.innerHTML = ''; }
  onResize() { this.focusStart(true); }

  focusStart(keep) {
    const c = this.cam;
    const oz = c.z, ox = c.x, oy = c.y;
    c.fit();
    if (keep && oz) { c.z = clamp(oz, c.minZ, c.maxZ); c.x = ox; c.y = oy; c.clamp(); return; }
    const target = Math.min(1.05, Math.max(c.z * 1.9, Math.min(App.W / 700, 0.9)));
    c.z = clamp(target, c.minZ, c.maxZ);
    const z = this.ps >= 0 ? this.b.zone(this.ps) : { x0: 0, x1: BW, y0: 0, y1: BH };
    c.x = (z.x0 + z.x1) / 2;
    c.y = this.b.kind === 'siege' ? (this.ps === 1 ? WALL_Y - 60 : WALL_Y + 200) : (this.ps === 0 ? (z.y0 - 60) : (z.y1 + 60));
    c.clamp();
  }

  // ——— بناء الواجهة ———
  build() {
    const b = this.b;
    const my = this.ps >= 0 ? this.cfg.sides[this.ps] : this.cfg.sides[0];
    const en = this.ps >= 0 ? this.cfg.sides[1 - this.ps] : this.cfg.sides[1];
    this.el = {};
    this.el.pause = h('button', { class: 'icon-btn', title: 'إيقاف مؤقت', onclick: () => this.togglePause() }, '⏸');
    this.el.speed = h('button', { class: 'icon-btn', title: 'السرعة', onclick: () => this.toggleSpeed() }, '×1');
    this.el.myBar = h('i'); this.el.enBar = h('i');
    this.el.myN = h('b'); this.el.enN = h('b');
    this.el.timer = h('span', { class: 'b-timer' }, '');
    const top = h('div', { class: 'b-top' },
      h('div', { class: 'b-top-btns' }, this.el.pause, this.el.speed),
      h('div', { class: 'b-str' },
        h('div', { class: 'b-side mine' }, h('span', { class: 'sw', style: { background: my.color } }), h('span', { class: 'nm' }, my.name), this.el.myN, h('div', { class: 'bar' }, this.el.myBar)),
        this.el.timer,
        h('div', { class: 'b-side foe' }, h('span', { class: 'sw', style: { background: en.color } }), h('span', { class: 'nm' }, en.name), this.el.enN, h('div', { class: 'bar' }, this.el.enBar)),
      ),
      h('div', { class: 'b-top-btns' },
        h('button', { class: 'icon-btn', title: 'دليل التكتيك', onclick: () => this.showTips() }, '؟'),
        h('button', { class: 'icon-btn danger', title: 'انسحاب', onclick: () => this.confirmWithdraw() }, '⚑'),
      ),
    );
    this.el.deploy = h('div', { class: 'b-deploy' },
      h('div', { class: 'b-deploy-msg' },
        h('strong', null, b.kind === 'siege' ? (this.ps === 0 ? 'حصار — تمركز جيشك' : 'دفاع عن المدينة — تمركز جيشك') : 'مرحلة التمركز'),
        h('span', null, 'اختر وحدة ثم اضغط داخل منطقتك لنقلها. اضغط مطوّلاً واسحب لتحديد اتجاه الصف.'),
        this.siegeInfo(),
      ),
      h('div', { class: 'b-deploy-btns' },
        h('button', { class: 'chip', onclick: () => { b.autoDeploy(this.ps, 'classic'); } }, 'تشكيل كلاسيكي'),
        h('button', { class: 'chip', onclick: () => { b.autoDeploy(this.ps, 'defensive'); } }, 'على المرتفع'),
        h('button', { class: 'chip', onclick: () => { b.autoDeploy(this.ps, 'ambush'); this.toast('الخيالة في الغابات إن وُجدت — مخفيّون عن العدو'); } }, 'كمين في الغابة'),
        h('button', { class: 'btn primary', onclick: () => this.startBattle() }, 'ابدأ المعركة ⚔️'),
      ),
      this.planBox = h('div', { class: 'b-plan' }),
    );
    this.renderPlans();
    this.el.cmdBar = h('div', { class: 'b-cmdbar', hidden: true });
    this.el.cmds = h('div', { class: 'b-cmds', hidden: true });
    this.el.cardsWrap = h('div', { class: 'b-cards' });
    this.el.multi = h('button', { class: 'grp', onclick: () => { this.multi = !this.multi; this.refreshCmds(); } }, '＋ متعدد');
    const groups = h('div', { class: 'b-groups' },
      h('button', { class: 'grp', onclick: () => this.selectGroup('all') }, 'الكل'),
      h('button', { class: 'grp', onclick: () => this.selectGroup('inf') }, 'مشاة'),
      h('button', { class: 'grp', onclick: () => this.selectGroup('ranged') }, 'رماة'),
      h('button', { class: 'grp', onclick: () => this.selectGroup('cav') }, 'خيالة'),
      this.el.multi,
    );
    const bottom = h('div', { class: 'b-bottom' }, groups, this.el.cardsWrap);
    this.el.toast = h('div', { class: 'toast', hidden: true });
    this.root.append(top, this.el.deploy, this.el.cmdBar, this.el.cmds, bottom, this.el.toast);
    this.buildCards();
    this.refreshHud();
  }

  siegeInfo() {
    const b = this.b;
    if (b.kind !== 'siege') return null;
    const eq = this.cfg.equip || {};
    if (this.ps === 0) {
      const parts = [];
      parts.push(eq.ram ? 'لديك كبش لدكّ البوابة' : 'لا كبش — استخدم المنجنيق');
      parts.push(eq.ladders ? 'والسلالم تتيح للمشاة تسلّق السور' : 'ولا سلالم بعد');
      return h('span', { class: 'hint' }, parts.join('، ') + '. احتلّ الساحة الذهبية 25 ثانية للنصر.');
    }
    return h('span', { class: 'hint' }, 'الرماة على السور محميون. اصمد حتى ينفد وقت المهاجم أو اكسره.');
  }

  buildCards() {
    this.el.cardsWrap.innerHTML = '';
    this.cards.clear();
    for (const r of [...this.b.regs, ...(this.b.reserves[this.ps] || [])]) {
      if (r.side !== this.ps) continue;
      const bar = h('i'), mor = h('i'), num = h('span', { class: 'num' });
      const card = h('button', { class: 'card', onclick: () => this.cardTap(r) },
        h('span', { class: 'ic' }, r.def.icon),
        h('span', { class: 'nm' }, r.type === 'general' ? r.name : r.def.name),
        num,
        h('span', { class: 'bars' }, h('span', { class: 'men' }, bar), h('span', { class: 'mor' }, mor)),
      );
      this.cards.set(r.id, { card, bar, mor, num });
      this.el.cardsWrap.appendChild(card);
    }
  }

  cardTap(r) {
    if (r.reserve) { this.toast('وحدة في الاحتياط — تدخل الميدان حين يفرغ مكان'); return; }
    if (!r.alive) return;
    if (this.multi) r.selected = !r.selected;
    else {
      const only = r.selected && this.sel.length === 1;
      for (const x of this.b.regs) x.selected = false;
      r.selected = !only;
      if (r.selected) { this.cam.x = r.x; this.cam.y = r.y; this.cam.clamp(); }
    }
    this.refreshCmds(); this.refreshHud();
  }

  selectGroup(kind) {
    const mine = this.b.regs.filter((r) => r.side === this.ps && r.active);
    const f = {
      all: () => true,
      inf: (r) => r.def.cls === 'inf' && !r.ranged,
      ranged: (r) => r.ranged || r.type === 'catapult',
      cav: (r) => r.def.cls === 'cav',
    }[kind];
    const list = mine.filter(f);
    const allSel = list.length && list.every((r) => r.selected) && this.sel.length === list.length;
    for (const r of this.b.regs) r.selected = false;
    if (!allSel) for (const r of list) r.selected = true;
    this.refreshCmds(); this.refreshHud();
  }

  refreshCmds() {
    const sel = this.sel;
    this.el.multi.classList.toggle('on', this.multi);
    const box = this.el.cmds;
    box.innerHTML = '';
    if (!sel.length || this.b.phase === 'over') { box.hidden = true; return; }
    box.hidden = false;
    const forms = Object.keys(FORMS).filter((f) => sel.some((r) => r.def.forms.includes(f)) && !sel.every((r) => r.def.forms.length === 1));
    const cur = sel[0].formation;
    const title = sel.length === 1 ? (sel[0].type === 'general' ? sel[0].name : sel[0].def.name) : `${sel.length} وحدات`;
    const info = sel.length === 1 ? this.unitInfo(sel[0]) : null;
    box.appendChild(h('div', { class: 'cmd-title' }, h('b', null, title), info));
    const row = h('div', { class: 'cmd-row' });
    for (const f of forms) {
      row.appendChild(h('button', {
        class: 'chip' + (sel.every((r) => r.formation === f) ? ' on' : ''),
        title: FORMS[f].tip,
        onclick: () => { for (const r of sel) if (r.def.forms.includes(f)) { r.formation = f; } this.refreshCmds(); this.toast(FORMS[f].name + ': ' + FORMS[f].tip); },
      }, FORMS[f].name));
    }
    void cur;
    const hold = sel.every((r) => r.stance === 'hold');
    row.appendChild(h('button', { class: 'chip' + (hold ? ' on' : ''), onclick: () => { for (const r of sel) r.stance = hold ? 'aggressive' : 'hold'; this.refreshCmds(); this.toast(hold ? 'اشتباك حرّ: تهاجم من يقترب' : 'ثبات: لا تطارد، تدافع عن موقعها'); } }, hold ? 'ثبات ✓' : 'ثبات'));
    if (sel.some((r) => r.ranged)) {
      const fire = sel.filter((r) => r.ranged).every((r) => r.fireAtWill);
      row.appendChild(h('button', { class: 'chip' + (fire ? ' on' : ''), onclick: () => { for (const r of sel) r.fireAtWill = !fire; this.refreshCmds(); } }, fire ? 'رماية حرّة ✓' : 'رماية حرّة'));
    }
    if (this.b.phase === 'battle') {
      row.appendChild(h('button', { class: 'chip', onclick: () => { for (const r of sel) { r.setOrder(null); r.path = []; } this.toast('توقّفوا'); } }, 'توقّف'));
      row.appendChild(h('button', {
        class: 'chip warn', onclick: () => {
          const y = this.b.fleeY(this.ps) < 0 ? 1 : -1;
          for (const r of sel) r.setOrder({ type: 'move', x: r.x, y: clamp(r.y - y * 140, 30, BH - 30) });
          this.toast('تراجع منظّم');
        },
      }, 'تراجع'));
    }
    box.appendChild(row);
  }

  unitInfo(r) {
    const d = r.def;
    const bits = [`${r.men}/${r.maxMen} رجل`, `معنويات ${Math.round(r.morale)}`];
    if (d.range) bits.push(`ذخيرة ${r.ammo}`);
    if (r.exp) bits.push('★'.repeat(r.exp));
    return h('span', { class: 'cmd-info' }, bits.join(' · '));
  }

  refreshHud() {
    const b = this.b, ps = Math.max(0, this.ps);
    const my = b.armyStrength(ps), en = b.armyStrength(1 - ps);
    const ms = b.stats[ps].start, es = b.stats[1 - ps].start;
    this.el.myN.textContent = my; this.el.enN.textContent = en;
    this.el.myBar.style.width = (100 * my / Math.max(1, ms)) + '%';
    this.el.enBar.style.width = (100 * en / Math.max(1, es)) + '%';
    const left = Math.max(0, b.timeLimit - b.time);
    let t = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    if (b.kind === 'siege' && b.plazaT > 0) t += ` · الساحة ${Math.floor(b.plazaT)}/25`;
    this.el.timer.textContent = b.phase === 'deploy' ? 'التمركز' : t;
    this.el.deploy.hidden = b.phase !== 'deploy';
    this.refreshCmdBar();
    this.el.pause.textContent = b.paused ? '▶' : '⏸';
    this.el.pause.classList.toggle('on', b.paused);
    this.el.speed.textContent = '×' + b.speed;
    for (const r of [...b.regs, ...(b.reserves[ps] || [])]) {
      const c = this.cards.get(r.id);
      if (!c) continue;
      c.bar.style.width = (100 * r.men / r.maxMen) + '%';
      c.mor.style.width = clamp(r.morale, 0, 100) + '%';
      c.mor.style.background = r.morale > 50 ? '#7fc26b' : r.morale > 25 ? '#e3b64a' : '#e0553f';
      c.num.textContent = r.men;
      c.card.classList.toggle('sel', r.selected);
      c.card.classList.toggle('dead', !r.alive);
      c.card.classList.toggle('reserve', !!r.reserve);
      c.card.classList.toggle('rout', r.state === 'routing');
      c.card.classList.toggle('fight', r.engaged);
    }
    const s = this.sel;
    if (s.length === 1 && this.el.cmds.firstChild) {
      const info = this.el.cmds.querySelector('.cmd-info');
      if (info) info.replaceWith(this.unitInfo(s[0]));
    }
  }

  update(dt) {
    this.b.update(dt);
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.25; this.refreshHud();
      if (this.sel.length === 0 && !this.el.cmds.hidden) this.refreshCmds();
    }
  }
  render(ctx) { this.b.render(ctx, this.cam, this); }

  // ——— اللمس ———
  regAt(w) {
    let best = null, bd = 1e9;
    const pad = 16 / this.cam.z;
    for (const r of this.b.regs) {
      if (!r.alive) continue;
      if (this.ps >= 0 && r.side !== this.ps && !r.visibleTo(this.ps)) continue;
      const ext = Math.abs(r.fy) * r.hd + Math.abs(r.fx) * r.hw;
      const bannerY = r.y - Math.max(8 / this.cam.z, ext) - 16 / this.cam.z;
      const dBanner = Math.hypot(w.x - r.x, w.y - bannerY);
      const inBody = r.containsPoint(w.x, w.y, pad * 0.6);
      const d = inBody ? Math.hypot(w.x - r.x, w.y - r.y) * 0.5 : dBanner < 18 / this.cam.z ? dBanner : 1e9;
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }

  onTap(w) {
    const b = this.b;
    if (b.phase === 'over') return;
    const hit = this.regAt(w);
    const sel = this.sel;
    if (hit && hit.side === this.ps) {
      if (hit.state === 'routing') { this.toast('هذه الوحدة تفرّ ولا تطيع الأوامر'); return; }
      if (this.multi) hit.selected = !hit.selected;
      else {
        const only = hit.selected && sel.length === 1;
        for (const r of b.regs) r.selected = false;
        hit.selected = !only;
      }
      this.refreshCmds(); this.refreshHud();
      return;
    }
    if (hit && hit.side !== this.ps) {
      if (sel.length && b.phase === 'battle') {
        for (const r of sel) {
          if (r.state === 'routing') continue;
          if (r.type === 'ram') continue;
          r.setOrder({ type: 'attack', target: hit });
        }
        this.focusEnemy = hit;
        this.toast(`هجوم على ${hit.type === 'general' ? 'القائد' : hit.def.name}`);
      } else {
        this.focusEnemy = hit;
        this.toast(`${hit.def.icon} ${hit.def.name} — ${hit.men} رجل. ${hit.def.desc} (هدف تركيز الرماة)`);
      }
      return;
    }
    if (!sel.length) return;
    // أوامر الحصار: المنجنيق على السور والكبش على البوابة
    if (b.kind === 'siege' && b.phase === 'battle') {
      const tile = b.map.tileAt(w.x, w.y);
      if (tile === T.WALL || tile === T.GATE) {
        let used = false;
        for (const r of sel) {
          if (r.type === 'catapult') { r.setOrder({ type: 'wall', x: w.x, y: WALL_Y + TS / 2 }); used = true; }
          if (r.type === 'ram' && tile === T.GATE) { r.setOrder({ type: 'gate' }); used = true; }
        }
        if (used) { this.toast('استهداف السور'); return; }
      }
    }
    this.issueMove(w.x, w.y, null, false);
  }

  onLongPress(w) {
    if (!this.sel.length || this.b.phase === 'over') return false;
    this.dragArrow = { x0: w.x, y0: w.y, x1: w.x, y1: w.y };
    return true;
  }
  onDrag(w) { if (this.dragArrow) { this.dragArrow.x1 = w.x; this.dragArrow.y1 = w.y; } }
  onDragEnd() {
    const a = this.dragArrow; this.dragArrow = null;
    if (!a) return;
    const len = Math.hypot(a.x1 - a.x0, a.y1 - a.y0);
    this.issueMove(a.x0, a.y0, len > 12 ? Math.atan2(a.y1 - a.y0, a.x1 - a.x0) : null, len > 12);
  }
  onDragCancel() { this.dragArrow = null; }

  issueMove(x, y, face, lineUp) {
    const b = this.b;
    const sel = this.sel.filter((r) => r.state !== 'routing');
    if (!sel.length) return;
    const deploy = b.phase === 'deploy';
    const targets = [];
    if (sel.length === 1) targets.push({ r: sel[0], x, y });
    else {
      let cx = 0, cy = 0;
      for (const r of sel) { cx += r.x; cy += r.y; }
      cx /= sel.length; cy /= sel.length;
      if (lineUp && face != null) {
        const rx = -Math.sin(face), ry = Math.cos(face);
        const sorted = [...sel].sort((p, q) => (p.x * rx + p.y * ry) - (q.x * rx + q.y * ry));
        const total = sorted.reduce((s, r) => s + r.hw * 2 + 12, -12);
        let off = -total / 2;
        for (const r of sorted) { off += r.hw; targets.push({ r, x: x + rx * off, y: y + ry * off }); off += r.hw + 12; }
      } else {
        if (face == null && Math.hypot(x - cx, y - cy) > 40 && !deploy) face = Math.atan2(y - cy, x - cx);
        for (const r of sel) targets.push({ r, x: x + (r.x - cx), y: y + (r.y - cy) });
      }
    }
    for (const t of targets) {
      if (deploy) b.placeReg(t.r, t.x, t.y, face != null ? face : t.r.facing);
      else t.r.setOrder({ type: 'move', x: clamp(t.x, 10, BW - 10), y: clamp(t.y, 10, BH - 10), face });
    }
  }

  // ——— التحكم العام ———
  renderPlans() {
    const b = this.b, ps = this.ps;
    if (ps < 0) return;
    const box = this.planBox;
    box.innerHTML = '';
    const g = b.commander[ps];
    const tr = g && g.trait;
    box.appendChild(h('div', { class: 'b-plan-head' },
      h('b', null, 'خطة المعركة'),
      g ? h('span', { class: 'muted small' }, ` · القائد ${g.name}${tr ? ' (' + TRAITS[tr].name + ')' : ''} · ${b.mods[ps].cp} نقاط أوامر`) : h('span', { class: 'warn small' }, ' · بلا قائد: لا أوامر'),
    ));
    const row = h('div', { class: 'b-plan-row' });
    for (const [k, p] of Object.entries(PLANS)) {
      const aff = PLAN_AFFINITY[tr] === k || (PLAN_AFFINITY[tr] === '*' && k !== 'balanced');
      row.appendChild(h('button', { class: 'chip' + (b.plans[ps] === k ? ' on' : '') + (aff ? ' aff' : ''), title: p.desc, onclick: () => { b.setPlan(ps, k); this.renderPlans(); this.toast(p.name + ': ' + p.desc); } }, p.icon + ' ' + p.name + (aff ? ' ★' : '')));
    }
    box.appendChild(row);
    box.appendChild(h('p', { class: 'hint' }, PLANS[b.plans[ps]].desc + (b.kind === 'field' ? ` · ${TERRAIN[b.cfg.terrain] ? TERRAIN[b.cfg.terrain].name : ''}` : '')));
  }

  refreshCmdBar() {
    const b = this.b, ps = this.ps, bar = this.el.cmdBar;
    if (!bar) return;
    bar.hidden = b.phase !== 'battle' || ps < 0;
    if (bar.hidden) return;
    const sig = b.cp[ps] + ':' + Object.keys(COMMANDS).map((k) => !!b.canCommand(ps, k)).join(',') + ':' + Math.floor(b.cpT[ps] / 15);
    if (sig === this.cmdSig) return;
    this.cmdSig = sig;
    bar.innerHTML = '';
    bar.appendChild(h('div', { class: 'cp', title: 'نقاط أوامر القائد — تتجدد كل 75 ثانية' }, '★'.repeat(b.cp[ps]) || '—'));
    for (const [k, c] of Object.entries(COMMANDS)) {
      if (k === 'gate' && !(b.kind === 'siege' && ps === 0)) continue;
      const err = b.canCommand(ps, k);
      bar.appendChild(h('button', {
        class: 'cmd-btn', disabled: !!err, title: err || c.desc,
        onclick: () => {
          const target = k === 'volley' ? this.focusEnemy : null;
          const e = b.useCommand(ps, k, target);
          this.toast(e || `${c.name}: ${c.desc}`);
          this.cmdSig = null; this.refreshCmdBar();
        },
      }, h('span', null, c.icon), h('small', null, c.name)));
    }
  }

  startBattle() {
    this.b.start();
    this.refreshCmds(); this.refreshHud();
    this.toast('إلى القتال!');
  }
  togglePause() { if (this.b.phase === 'battle') { this.b.paused = !this.b.paused; this.refreshHud(); } }
  toggleSpeed() { this.b.speed = this.b.speed === 1 ? 2 : 1; this.refreshHud(); }

  toast(msg) {
    const t = this.el.toast;
    t.textContent = msg; t.hidden = false;
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }

  showTips() {
    const was = this.b.paused;
    if (this.b.phase === 'battle') this.b.paused = true;
    this.refreshHud();
    UI.modal({
      title: 'دليل التكتيك',
      body: h('div', { class: 'tips' }, TIPS.map(([t, d]) => h('div', { class: 'tip' }, h('b', null, t), h('p', null, d)))),
      buttons: [{ label: 'فهمت', primary: true, onClick: () => { this.b.paused = was; this.refreshHud(); } }],
    });
  }

  confirmWithdraw() {
    if (this.b.phase === 'over') return;
    const was = this.b.paused;
    this.b.paused = true;
    UI.modal({
      title: 'الانسحاب من المعركة؟',
      body: h('p', null, 'تُحسب المعركة هزيمة. الوحدات المشتبكة تخسر ثلث رجالها أثناء الانسحاب.'),
      buttons: [
        { label: 'انسحب', danger: true, onClick: () => this.b.withdraw() },
        { label: 'واصل القتال', primary: true, onClick: () => { this.b.paused = was; } },
      ],
    });
  }

  showResult(res) {
    const ps = Math.max(0, this.ps);
    const won = res.winner === ps;
    const my = res.sides[ps], en = res.sides[1 - ps];
    const reasons = {
      rout: won ? 'انكسر العدو وفرّ من الميدان.' : 'انكسر جيشك وفرّ.',
      plaza: ps === 0 ? 'احتللتم ساحة المدينة فاستسلمت الحامية.' : 'احتلّ العدو ساحة المدينة.',
      time: ps === 1 ? 'صمدت المدينة حتى انقضى وقت المهاجمين.' : 'انقضى الوقت ولم يسقط العدو.',
      withdraw: 'انسحب جيشك من الميدان.',
      nomeans: ps === 0 ? 'لم يبقَ لديك ما تقتحم به الأسوار.' : 'عجز العدو عن اختراق الأسوار فانسحب.',
    };
    const row = (label, a, b2) => h('tr', null, h('td', null, label), h('td', null, a), h('td', null, b2));
    UI.modal({
      title: won ? 'نصر!' : 'هزيمة',
      cls: won ? 'win' : 'lose',
      body: h('div', null,
        h('p', { class: 'lead' }, reasons[res.reason] || ''),
        h('table', { class: 'res' },
          h('thead', null, h('tr', null, h('th'), h('th', null, 'جيشك'), h('th', null, 'العدو'))),
          h('tbody', null,
            row('في البداية', my.start, en.start),
            row('القتلى', my.lost, en.lost),
            row('الباقون', my.remaining, en.remaining),
          )),
        my.generalDied ? h('p', { class: 'warn' }, 'سقط قائدك في المعركة.') : null,
        en.generalDied ? h('p', { class: 'good' }, 'سقط قائد العدو.') : null,
      ),
      buttons: [{ label: 'متابعة', primary: true, onClick: () => this.onDone && this.onDone(res) }],
    });
  }
}
