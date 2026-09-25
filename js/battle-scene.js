'use strict';
// مشهد المعركة: خريطة حرب تكتيكية، الاستطلاع، الخطة، التشكيل، المراحل والقرارات، ثم التحليل

const BW = 1000, BH = 600;
const SX_OURS = { L: 250, C: 500, R: 750 };
const SX_THEIRS = { R: 250, C: 500, L: 750 };

class BattleScene {
  constructor(cfg, onEnd) {
    this.cfg = cfg;
    this.onEnd = onEnd;
    this.sim = new WarSim(cfg);
    let me = cfg.sides.findIndex((s) => s.player);
    if (me < 0) me = 0;
    this.me = me;
    this.A = this.sim.sides[me];
    this.E = this.sim.sides[1 - me];
    this.stage = 'intel';
    this.cam = new Camera(BW, BH);
    this.t = 0;
    this.pos = new Map();
    this.fx = [];
    this.floats = [];
    this.auto = false;
    this.speed = 1;
    this.sel = null;
    this.linesSeen = 0;
    this.siege = this.sim.kind === 'siege';
    this.weDefend = this.siege && !this.A.att;
    this.wallY = this.weDefend ? 372 : 228;
    // اقتراح خطة للاعب (يمكن تغييرها)
    this.sim.autoFormation(this.E, this.sim.aiPlan(this.E));
    this.planPick = this.sim.aiPlan(this.A);
    this.sim.autoFormation(this.A, this.planPick);
  }

  enter() {
    App.ui.innerHTML = '';
    this.root = h('div', { class: 'bs-ui' });
    App.ui.appendChild(this.root);
    this.top = h('div', { class: 'bs-top' });
    this.panel = h('div', { class: 'bs-panel' });
    this.root.append(this.top, this.panel);
    this.bg = this.renderBg();
    this.fit();
    this.layoutUnits(true);
    this.renderTop();
    this.showIntel();
  }
  exit() { clearTimeout(this.timer); Help.hide(); App.ui.innerHTML = ''; }
  onResize() { this.fit(); }
  // الخريطة في المساحة الحرة: اللوحة جانبية أفقياً، وسفلية عمودياً
  fit() {
    const land = App.W > App.H;
    const pw = land && this.panel ? Math.min(this.panel.offsetWidth || 340, App.W * 0.45) + 14 : 0;
    const ph = !land && this.panel ? Math.min(this.panel.offsetHeight || 200, App.H * 0.5) + 10 : 0;
    const top = (this.top && this.top.offsetHeight ? this.top.offsetHeight + this.top.offsetTop : 40) + 4;
    const W = App.W - pw, H = App.H - ph - top;
    const vw = 820, vh = 540;
    const z = Math.min(W / vw, H / vh);
    this.cam.z = z; this.cam.minZ = z * 0.9; this.cam.maxZ = z * 3;
    // مركز المساحة الحرة (اللوحة على اليمين في الوضع الأفقي)
    this.cam.x = BW / 2 + (pw / 2) / z;
    this.cam.y = BH / 2 - (top / 2 - ph / 2) / z;
    this.free = { cx: (App.W - pw) / 2, w: App.W - pw, top: top + 6 };
  }

  // ----------- الرسم المسبق لأرض المعركة -----------
  renderBg() {
    const K = 2, cv = document.createElement('canvas');
    cv.width = BW * K; cv.height = BH * K;
    const g = cv.getContext('2d');
    g.scale(K, K);
    const r = rng(hashStr(String(this.cfg.seed || 1)) + 13);
    const T = this.sim.terrain;
    const base = T === 'desert' ? ['#e6cf9c', '#d8bc85'] : T === 'forest' ? ['#cdd0a4', '#b9bd8c'] : ['#e2d6ad', '#d3c496'];
    const gr = g.createLinearGradient(0, 0, 0, BH);
    gr.addColorStop(0, base[0]); gr.addColorStop(1, base[1]);
    g.fillStyle = gr; g.fillRect(0, 0, BW, BH);
    for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(90,70,40,.06)' : 'rgba(255,250,230,.08)'; g.fillRect(r() * BW, r() * BH, 1 + r() * 2, 1 + r() * 2); }
    // شبكة خريطة الحرب
    g.strokeStyle = 'rgba(110,85,50,.12)'; g.lineWidth = 0.6;
    for (let x = 0; x <= BW; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, BH); g.stroke(); }
    for (let y = 0; y <= BH; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(BW, y); g.stroke(); }
    const tree = (x, y, s) => {
      g.fillStyle = 'rgba(40,50,25,.25)'; g.beginPath(); g.ellipse(x + s * 0.3, y + s * 0.9, s * 0.8, s * 0.3, 0, 0, TAU); g.fill();
      g.fillStyle = '#5c7a42'; g.beginPath(); g.arc(x, y, s * 0.62, 0, TAU); g.fill();
      g.fillStyle = 'rgba(170,200,120,.4)'; g.beginPath(); g.arc(x - s * 0.18, y - s * 0.18, s * 0.28, 0, TAU); g.fill();
    };
    const oursY = this.weDefend ? 1 : 0;
    void oursY;
    if (T === 'forest') {
      for (let i = 0; i < 420; i++) {
        const side = r() < 0.5;
        const x = side ? r() * 190 : BW - r() * 190, y = 40 + r() * (BH - 80);
        tree(x, y, 5 + r() * 5);
      }
      for (let i = 0; i < 40; i++) tree(200 + r() * 600, 60 + r() * 480, 4 + r() * 3);
    } else if (T === 'plains' || T === 'river' || T === 'coast') {
      for (let i = 0; i < 90; i++) { const x = r() * BW, y = r() * BH; g.strokeStyle = 'rgba(100,120,60,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 5); g.moveTo(x + 2, y); g.lineTo(x + 3, y - 5); g.stroke(); }
      for (let i = 0; i < 26; i++) { const x = r() < 0.5 ? r() * 120 : BW - r() * 120, y = r() * BH; tree(x, y, 4 + r() * 4); }
    } else if (T === 'desert') {
      for (let i = 0; i < 180; i++) { const x = r() * BW, y = r() * BH, w = 10 + r() * 20; g.strokeStyle = 'rgba(160,115,60,.4)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - w * 0.3, x + w, y); g.stroke(); }
    }
    if (T === 'hills' || (T === 'mountains' && !this.siege)) {
      // مرتفع لدى المدافع
      const defTop = !this.weDefend ? (this.sim.sides[1] === this.E) : false;
      const cy = defTop ? 150 : 450;
      for (let k = 7; k >= 1; k--) {
        g.strokeStyle = `rgba(120,95,55,${0.15 + k * 0.04})`; g.lineWidth = 1.2;
        g.fillStyle = `rgba(160,135,85,${0.05})`;
        g.beginPath(); g.ellipse(500, cy, 60 + k * 55, 18 + k * 16, 0, 0, TAU); g.fill(); g.stroke();
      }
    }
    if (T === 'mountains') {
      for (const side of [0, 1]) {
        const x0 = side ? BW - 230 : 0, x1 = side ? BW : 230;
        g.fillStyle = 'rgba(120,100,78,.55)';
        g.beginPath(); g.moveTo(x0, 0); g.lineTo(x1, 0); g.lineTo(x1, BH); g.lineTo(x0, BH); g.closePath(); g.fill();
        for (let i = 0; i < 40; i++) {
          const x = x0 + r() * (x1 - x0), y = r() * BH, s = 14 + r() * 16;
          g.fillStyle = '#8c7a62'; g.beginPath(); g.moveTo(x - s, y + s * 0.6); g.lineTo(x, y - s); g.lineTo(x + s, y + s * 0.6); g.closePath(); g.fill();
          g.fillStyle = '#b9a88c'; g.beginPath(); g.moveTo(x - s, y + s * 0.6); g.lineTo(x, y - s); g.lineTo(x - s * 0.15, y + s * 0.6); g.closePath(); g.fill();
        }
      }
    }
    if (T === 'river' && !this.siege) {
      g.fillStyle = 'rgba(110,150,165,.9)'; g.fillRect(0, 286, BW, 28);
      g.strokeStyle = 'rgba(230,245,245,.4)'; g.lineWidth = 1;
      for (let i = 0; i < 60; i++) { const x = r() * BW, y = 290 + r() * 20; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y - 2, x + 8, y); g.stroke(); }
      g.strokeStyle = 'rgba(60,80,80,.5)'; g.lineWidth = 1.5; g.strokeRect(-2, 286, BW + 4, 28);
      g.setLineDash([3, 4]); g.strokeStyle = 'rgba(245,235,210,.7)';
      for (const x of [250, 500, 750]) { g.beginPath(); g.moveTo(x - 40, 300); g.lineTo(x + 40, 300); g.stroke(); }
      g.setLineDash([]);
    }
    if (T === 'coast') {
      g.fillStyle = 'rgba(100,140,155,.95)'; g.beginPath(); g.moveTo(BW - 90, 0); g.quadraticCurveTo(BW - 130, BH / 2, BW - 90, BH); g.lineTo(BW, BH); g.lineTo(BW, 0); g.closePath(); g.fill();
    }
    // الأسوار والمدينة
    if (this.siege) {
      const wy = this.wallY;
      const cityDir = this.weDefend ? 1 : -1;
      // بيوت خلف السور
      for (let i = 0; i < 140; i++) {
        const x = 60 + r() * 880, y = wy + cityDir * (30 + r() * 170);
        if (y < 10 || y > BH - 10) continue;
        g.fillStyle = 'rgba(40,28,15,.25)'; g.fillRect(x + 1, y + 1, 12, 8);
        g.fillStyle = this.cfg.style === 'east' ? '#d9ccb0' : '#e6d6b0'; g.fillRect(x, y, 12, 8);
        g.fillStyle = 'rgba(80,90,100,.8)'; g.fillRect(x - 1, y - 2, 14, 3);
      }
      this.wallSegs = [];
    }
    // إطار
    g.strokeStyle = 'rgba(70,45,20,.8)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, BW - 3, BH - 3);
    return cv;
  }

  // ----------- مواقع الوحدات -----------
  sx(side, key) { return side === this.A ? SX_OURS[key] : SX_THEIRS[key]; }
  dir(side) { return side === this.A ? 1 : -1; }
  layoutUnits(snap) {
    const sim = this.sim;
    const ph = sim.phaseKey();
    const approachT = ph === 'approach' ? Math.min(1, (sim.tick + (this.anim || 0)) / Math.max(1, WS_PHASES[0].ticks + sim.extraTicks())) : ph === 'setup' ? 0 : 1;
    for (const side of sim.sides) {
      const d = this.dir(side);
      for (const k of [...SECTS, 'Res']) {
        const us = side.units.filter((u) => u.sec === k && u.men > 0 && u.state !== 'dead');
        const cx = k === 'Res' ? 500 : this.sx(side, k);
        const front = us.filter((u) => u.role !== 'missile' && u.role !== 'engine');
        const back = us.filter((u) => u.role === 'missile' || u.role === 'engine');
        // خط التماس لهذا القطاع
        let lineY;
        if (k === 'Res') lineY = 300 + d * 240;
        else {
          const fr = side.sec[k].front || 0;
          const baseY = 300 + d * 115;
          const mid = this.siege ? this.wallY : 300;
          const contactY = mid + d * 16 - d * fr * (this.siege ? 35 : 55);
          lineY = lerp(baseY, contactY, approachT);
          if (this.siege) {
            const wy = this.wallY;
            const def = sim.sides[1];
            const dk = side.att ? OPP[k] : k;
            const br = def.sec[dk].breach >= 1;
            if (!br) lineY = !side.att ? wy + d * 8 : lerp(baseY, wy + d * 24, approachT);
            if (!side.att) lineY = Math.max(Math.min(lineY, BH - 20), 20);
          }
          if (side.sec[k].stance === 'skirmish' && ph !== 'setup') lineY += d * 30;
        }
        const place = (list, y, spread) => {
          const ws = list.map((u) => this.blockW(u));
          const tot = ws.reduce((a, b) => a + b, 0) + (list.length - 1) * 5;
          let x = cx - tot / 2;
          list.forEach((u, i) => {
            let px = x + ws[i] / 2, py = y;
            if (u.state === 'rout') { py = 300 + d * 290; }
            // الفرسان الملتفون خلف العدو
            if (side.sec[k].stance === 'flank' && !side.sec[k].flankDone && (u.role === 'cav' || u.role === 'skirm')) { px = (k === 'L') === (side === this.A) ? 70 : 930; py = 300 + d * 60; }
            if (side.sec[k].flankOk && (u.role === 'cav' || u.role === 'skirm')) { px = cx + (k === 'L' === (side === this.A) ? -40 : 40); py = 300 - d * 90; }
            this.setTarget(u, px, py, snap);
            x += ws[i] + 5;
          });
          void spread;
        };
        place(front, lineY + d * 14, 1);
        place(back, lineY + d * 44, 1);
      }
    }
  }
  blockW(u) { return Math.round(22 + Math.sqrt(Math.max(1, u.men)) * 2.8); }
  setTarget(u, x, y, snap) {
    let p = this.pos.get(u.id);
    if (!p) { p = { x, y, tx: x, ty: y, a: 1 }; this.pos.set(u.id, p); }
    p.tx = x; p.ty = y;
    if (snap) { p.x = x; p.y = y; }
  }

  // ----------- الواجهة العلوية -----------
  renderTop() {
    const sim = this.sim;
    this.top.innerHTML = '';
    const bar = (s) => {
      const men = sim.liveMen(s);
      const mor = sim.phase < 0 ? s.sec.C.morale || 70 : sim.avgMorale(s);
      return h('div', { class: 'bs-side' + (s === this.E ? ' foe' : '') },
        dotEl(s.color), h('b', null, s.name), h('bdi', { class: 'bs-men' }, s === this.E && sim.phase < 0 ? this.est(s.units.reduce((t, u) => t + u.men, 0)) : men),
        h('span', { class: 'bs-mor', title: 'المعنويات' }, h('i', { style: { width: clamp(mor, 0, 100) + '%' } })));
    };
    const steps = h('div', { class: 'bs-steps' }, WS_PHASES.map((p, i) => h('span', { class: 'st' + (i === sim.phase ? ' on' : i < sim.phase ? ' done' : '') }, this.siege ? p.siege : p.name)));
    this.top.append(bar(this.A), steps, bar(this.E));
  }
  est(v) {
    const lvl = this.A.intel;
    if (lvl >= 3) return String(v);
    if (lvl <= 0) return '؟';
    const k = lvl === 2 ? 0.2 : 0.45;
    const r = rng(hashStr(String(this.cfg.seed) + ':' + v));
    const c = v * (1 + (r() - 0.5) * k);
    const lo = Math.max(0, Math.round(c * (1 - k / 2) / 10) * 10), hi = Math.round(c * (1 + k / 2) / 10) * 10;
    return lo === hi ? '~' + lo : `${lo}–${hi}`;
  }

  // ----------- المرحلة ١: الاستطلاع -----------
  showIntel() {
    this.stage = 'intel';
    const sim = this.sim, A = this.A, E = this.E;
    const comp = (side, known) => {
      const by = {};
      for (const u of side.units) { if (u.men <= 0) continue; const k = u.role === 'cav' ? 'فرسان' : u.role === 'skirm' ? 'خيالة رماة' : u.role === 'missile' ? 'رماة' : u.role === 'engine' ? 'آلات' : u.role === 'guard' ? 'حرس القادة' : 'مشاة'; by[k] = (by[k] || 0) + u.men; }
      return h('div', { class: 'bs-comp' }, Object.entries(by).map(([k, v]) => h('span', { class: 'tag' }, k + ': ', h('bdi', null, known ? v : this.est(v)))));
    };
    const gline = (side, known) => side.cmd ? h('div', { class: 'gline' }, icon('helmet'), h('b', null, known || side.intel >= 1 ? side.cmd.name : 'قائد مجهول'), known || A.intel >= 1 ? stars(side.cmd.rank) : null, known || A.intel >= 1 ? traitChip(side.cmd) : null) : h('span', { class: 'hint' }, 'بلا قائد');
    const T = TERRAIN[sim.terrain];
    const chips = h('div', { class: 'kv' },
      h('span', { class: 'hstat' }, icon(T.icon), T.name),
      h('span', { class: 'hstat' }, icon(WEATHER[sim.weather].icon), WEATHER[sim.weather].name),
      this.siege ? h('span', { class: 'hstat' }, icon('castle'), ['بلا أسوار', 'سياج خشبي', 'أسوار حجرية', 'قلعة', 'قلعة عظمى'][sim.walls]) : null,
      this.siege && A.att ? h('span', { class: 'hstat' }, icon('ram'), [sim.equip.ram && 'كبش', sim.equip.ladders && 'سلالم', sim.equip.tower && 'برج', A.units.some((u) => u.type === 'catapult') && 'منجنيق'].filter(Boolean).join('، ') || 'بلا معدات') : null,
      A.mood < 0 ? h('span', { class: 'hstat bad' }, icon('warning'), A.mood <= -12 ? 'جيشك جائع أو مهزوز' : 'معنويات منخفضة') : null,
      A.mood > 0 ? h('span', { class: 'hstat' }, icon('banner'), 'جيشك واثق') : null,
    );
    const tip = TERRAIN_TIPS[sim.terrain] + (WEATHER[sim.weather].desc ? ' ' + WEATHER[sim.weather].desc : '');
    this.setPanel(
      h('div', { class: 'bs-h' }, icon('eye'), h('b', null, 'الاستطلاع'), h('span', { class: 'muted small' }, this.cfg.title ? (this.siege ? 'أسوار ' : 'ساحة ') + this.cfg.title : '')),
      chips,
      h('p', { class: 'hint' }, tip),
      h('div', { class: 'bs-cols' },
        h('div', { class: 'bs-col' }, h('div', { class: 'sec-h' }, dotEl(A.color), 'قواتك', h('span', { class: 'muted' }, sim.liveMen(A) + ' رجل')), gline(A, true), comp(A, true)),
        h('div', { class: 'bs-col' }, h('div', { class: 'sec-h' }, dotEl(E.color), E.name, h('span', { class: 'muted' }, this.est(sim.liveMen(E)) + ' رجل')), gline(E, false),
          A.intel >= 1 ? comp(E, A.intel >= 3) : h('p', { class: 'hint' }, 'كشّافتك لم يروا إلا الغبار. أعدادهم تقديرية.')),
      ),
      h('div', { class: 'row-btns' },
        ib('scroll', 'اختر الخطة', { class: 'btn primary', onclick: () => this.showPlan() }),
        ib('fast', 'حسم سريع', { class: 'btn', onclick: () => this.quickResolve() }),
      ),
    );
  }

  // ----------- المرحلة ٢: الخطة -----------
  showPlan() {
    this.stage = 'plan';
    const sim = this.sim, A = this.A;
    const plans = sim.availablePlans(A);
    const cards = h('div', { class: 'bs-plans' });
    const detail = h('div', { class: 'bs-plan-d' });
    const renderD = () => {
      const P = PLANS[this.planPick];
      detail.innerHTML = '';
      detail.append(h('p', null, P.desc), h('div', { class: 'kv' }, h('span', { class: 'tag good' }, icon('check'), P.good), h('span', { class: 'tag bad' }, icon('warning'), P.bad)));
    };
    for (const k of plans) {
      const P = PLANS[k], aff = sim.affinity(A, k);
      cards.appendChild(h('button', { class: 'bs-plan' + (k === this.planPick ? ' on' : ''), onclick: () => { this.planPick = k; sim.autoFormation(A, k); this.layoutUnits(false); this.showPlan(); } },
        icon(P.icon), h('b', null, P.name),
        aff > 0 ? h('span', { class: 'tag good' }, 'يناسب قائدك') : aff < 0 ? h('span', { class: 'tag bad' }, 'يخالف طبعه') : null));
    }
    renderD();
    this.setPanel(
      h('div', { class: 'bs-h' }, icon('scroll'), h('b', null, 'خطة المعركة'), h('span', { class: 'muted small' }, 'الخطة تغيّر سلوك جيشك كله')),
      cards, detail,
      h('div', { class: 'row-btns' },
        ib('chevR', 'رجوع', { class: 'btn ghost', onclick: () => this.showIntel() }),
        this.planPick === 'starve' ? ib('tent', 'واصل الحصار', { class: 'btn primary', onclick: () => this.finishNow('cancel') }) : ib('men', 'التشكيل', { class: 'btn', onclick: () => this.showFormation() }),
        this.planPick !== 'starve' ? ib('swords', 'ابدأ المعركة', { class: 'btn primary', onclick: () => this.startBattle() }) : null,
      ),
    );
  }

  // ----------- المرحلة ٣: التشكيل -----------
  showFormation() {
    this.stage = 'form';
    const sim = this.sim, A = this.A;
    const cols = h('div', { class: 'bs-form' });
    const sname = (k) => (this.siege ? SECT_SIEGE : SECT_NAME)[k];
    for (const k of ['L', 'C', 'R', 'Res']) {
      const us = A.units.filter((u) => u.sec === k && u.men > 0);
      const sec = A.sec[k];
      const allowed = k === 'Res' ? [] : this.siege ? ['advance', 'hold'] : ['hold', 'advance', 'skirmish', ...(us.some((u) => u.role === 'cav' || u.role === 'skirm') ? ['flank'] : [])];
      const g = sim.genOf(A, k);
      const col = h('div', { class: 'bs-fc' + (this.sel && this.sel.sec !== k ? ' target' : ''), onclick: () => { if (this.sel && this.sel.sec !== k && this.sel.role !== 'guard') { this.sel.sec = k; this.sel = null; this.layoutUnits(false); this.showFormation(); } } },
        h('div', { class: 'bs-fh' }, h('b', null, sname(k)), g && k !== 'Res' ? h('span', { class: 'muted small' }, g.name) : null),
        k !== 'Res' ? h('button', { class: 'chip', onclick: (e) => { e.stopPropagation(); const i = allowed.indexOf(sec.stance); sec.stance = allowed[(i + 1) % allowed.length]; this.showFormation(); } }, icon(STANCES[sec.stance].icon), STANCES[sec.stance].name) : h('span', { class: 'hint' }, 'ينتظر أمرك'),
        h('div', { class: 'units' }, us.map((u) => h('button', { class: 'uchip' + (this.sel === u ? ' on' : '') + (u.role === 'guard' ? ' elite' : ''), onclick: (e) => { e.stopPropagation(); this.sel = this.sel === u ? null : u; this.showFormation(); } }, icon(UNIT_ICON[u.type]), h('b', null, u.men)))),
      );
      cols.appendChild(col);
    }
    const pos = h('div', { class: 'row-btns' }, h('span', { class: 'small muted' }, 'موقع القائد:'), Object.entries(CMD_POS).map(([k, p]) => h('button', { class: 'chip' + (A.cmdPos === k ? ' on' : ''), title: p.desc, onclick: () => { A.cmdPos = k; this.showFormation(); } }, p.name)));
    this.setPanel(
      h('div', { class: 'bs-h' }, icon('men'), h('b', null, 'التشكيل'), h('span', { class: 'muted small' }, this.sel ? 'اضغط قطاعاً لنقل الوحدة إليه' : 'اضغط وحدة ثم قطاعاً لنقلها. اضغط الوضعية لتغييرها.')),
      cols, pos,
      h('div', { class: 'row-btns' },
        ib('chevR', 'الخطة', { class: 'btn ghost', onclick: () => this.showPlan() }),
        ib('undo', 'تلقائي حسب الخطة', { class: 'btn', onclick: () => { sim.autoFormation(A, this.planPick); this.sel = null; this.layoutUnits(false); this.showFormation(); } }),
        ib('swords', 'ابدأ المعركة', { class: 'btn primary', onclick: () => this.startBattle() }),
      ),
    );
  }

  setPanel(...kids) {
    this.panel.innerHTML = '';
    for (const k of kids) if (k) this.panel.appendChild(k);
    requestAnimationFrame(() => this.fit());
  }

  // ----------- المعركة -----------
  startBattle() {
    const sim = this.sim;
    if (!this.A.plan) sim.autoFormation(this.A, this.planPick);
    this.A.plan = this.planPick;
    sim.begin();
    if (sim.over) { this.finishNow(sim.reason === 'starve' ? 'cancel' : null); return; }
    this.stage = 'play';
    this.linesSeen = 0;
    this.renderTop();
    this.layoutUnits(false);
    this.playTicks();
  }

  playTicks() {
    clearTimeout(this.timer);
    this.stage = 'play';
    this.showPlayPanel();
    const tickMs = 950 / this.speed;
    const loop = () => {
      const sim = this.sim;
      if (sim.over) { this.afterEnd(); return; }
      sim.step();
      this.anim = 0;
      this.consumeCues();
      this.layoutUnits(false);
      this.renderTop();
      this.showPlayPanel();
      const ev = sim.takeInterrupt();
      if (ev) { this.showEvent(ev, () => { this.stage = 'play'; this.showPlayPanel(); this.timer = setTimeout(loop, tickMs * 0.6); }); return; }
      if (sim.over) { this.timer = setTimeout(() => this.afterEnd(), 900); return; }
      if (sim.phaseDone()) { this.timer = setTimeout(() => this.phaseBreak(), tickMs * 0.8); return; }
      this.timer = setTimeout(loop, tickMs);
    };
    this.timer = setTimeout(loop, 350);
  }

  phaseBreak() {
    const sim = this.sim;
    const evs = sim.endPhase();
    this.renderTop();
    if (sim.over) { this.afterEnd(); return; }
    const next = () => {
      const ev = evs.shift();
      if (ev) { this.showEvent(ev, next); return; }
      // بطاقات الأوامر تظهر حين يوجد قرار حقيقي، أو حين طلبتها؛ وإلا تستمر المعركة
      if (!this.auto && (this.wantOrders || this.breakWorth())) { this.wantOrders = false; this.showBreakPanel(); return; }
      sim.nextPhase();
      this.renderTop();
      this.layoutUnits(false);
      this.showPlayPanel();
      this.timer = setTimeout(() => this.playTicks(), 700);
    };
    next();
  }
  // هل تستحق نهاية المرحلة سؤال القائد؟
  breakWorth() {
    const sim = this.sim, A = this.A, E = this.E;
    const next = WS_PHASES[sim.phase + 1] && WS_PHASES[sim.phase + 1].key;
    if (!next) return false;
    const secs = SECTS.filter((k) => sim.secUnits(A, k).length);
    const hasRes = sim.secUnits(A, 'Res').some((u) => u.role !== 'engine' && !u.hunter);
    this.breakWhy = null;
    const why = (t) => { this.breakWhy = t; return true; };
    if (secs.some((k) => A.sec[k].morale < 50) && (hasRes || !A.rallied)) return why('قطاع من جيشك يضعف');
    if (SECTS.some((k) => sim.secUnits(E, k).length && (E.sec[k].morale < 40 || E.sec[k].state === 'waver'))) return why('قطاع من العدو يترنح');
    if (next === 'crisis' && hasRes) return why('الأزمة قادمة واحتياطك لم يُستخدم');
    if (!this.siege && next === 'main' && ['L', 'R'].some((k) => sim.secUnits(A, k).some((u) => u.role === 'cav') && !A.sec[k].flankDone && A.sec[k].stance !== 'flank')) return why('فرسانك يستطيعون الالتفاف في المرحلة التالية');
    if (A.ammoOut) return why('سهام بعض رماتك نفدت');
    return false;
  }

  newLines() {
    const lines = this.sim.lines.slice(this.linesSeen);
    this.linesSeen = this.sim.lines.length;
    for (const l of lines) {
      if (l.tone === 'phase') continue;
      if (l.key === 'breach' || l.key === 'broken' || l.key === 'cmdDown' || l.tone === 'good' || l.tone === 'bad') this.floatText(l.text, l.tone);
    }
    return lines;
  }
  lineList(max = 4) {
    const L = this.sim.lines.filter((l) => l.tone !== 'phase').slice(-max);
    return h('div', { class: 'bs-lines' }, L.map((l) => h('p', { class: l.side === this.A.i ? (l.tone === 'bad' ? 'bad' : l.tone === 'good' ? 'good' : '') : l.tone === 'good' ? 'bad' : l.tone === 'bad' ? 'good' : '' }, l.text)));
  }

  showPlayPanel() {
    this.newLines();
    const ph = WS_PHASES[Math.max(0, this.sim.phase)];
    this.setPanel(
      h('div', { class: 'bs-h' }, icon('hourglass'), h('b', null, this.siege ? ph.siege : ph.name), h('span', { class: 'sp' }),
        h('button', { class: 'chip' + (this.wantOrders ? ' on' : ''), title: 'تتوقف المعركة عند نهاية هذه المرحلة لتصدر أوامرك', onclick: () => { this.wantOrders = !this.wantOrders; this.showPlayPanel(); } }, icon('flag'), this.wantOrders ? 'ستتوقف للأوامر' : 'أوامر'),
        h('button', { class: 'chip' + (this.auto ? ' on' : ''), onclick: () => { this.auto = !this.auto; this.showPlayPanel(); } }, icon('play'), 'تلقائي'),
        h('button', { class: 'chip' + (this.speed > 1 ? ' on' : ''), onclick: () => { this.speed = this.speed > 1 ? 1 : 2; this.showPlayPanel(); } }, icon('fast'), this.speed > 1 ? '×2' : '×1')),
      this.lineList(3),
    );
  }

  showBreakPanel() {
    clearTimeout(this.timer);
    this.stage = 'break';
    this.newLines();
    const sim = this.sim, A = this.A;
    const ph = WS_PHASES[sim.phase + 1] || WS_PHASES[sim.phase];
    const cards = sim.availableOrders(A);
    const nm = (k, side) => (this.siege ? SECT_SIEGE : SECT_NAME)[k] + (side === this.E ? ' للعدو' : '');
    const pick = this.cardPick && cards.find((c) => c.k === this.cardPick) || null;
    const grid = h('div', { class: 'ocards' });
    for (const c of cards) {
      grid.appendChild(h('button', { class: 'ocard' + (pick === c ? ' on' : '') + (c.why ? ' dim' : ''), disabled: !!c.why && c.k !== 'withdraw', onclick: () => { this.cardPick = pick === c ? null : c.k; this.showBreakPanel(); } },
        h('b', null, icon(c.icon), c.name), c.why ? h('span', { class: 'why' }, c.why) : h('span', null, c.what)));
    }
    const detail = pick ? h('div', { class: 'ocard-d' },
      h('p', null, h('b', null, 'ما يفعله الجنود: '), pick.what),
      h('p', null, h('b', null, 'متى يفيد: '), pick.when),
      h('p', null, h('b', null, 'يحتاج: '), pick.req),
      h('p', { class: 'warn' }, h('b', null, 'المخاطر: '), pick.risk),
      pick.need ? h('div', { class: 'row-btns' }, h('span', { class: 'small muted' }, pick.need === 'foe' ? 'على أي قطاع للعدو؟' : 'أي قطاع؟'),
        pick.targets.map((k) => h('button', { class: 'chip', onclick: () => { sim.order(A, pick.k, k); if (Game.track) Game.track('order:' + pick.k); this.cardPick = null; this.layoutUnits(false); this.renderTop(); this.newLines(); if (sim.over) { this.afterEnd(); return; } this.showBreakPanel(); } }, nm(k, pick.need === 'foe' ? this.E : A)))) :
        h('div', { class: 'row-btns' }, ib('retreat', 'نفّذ الانسحاب', { class: 'btn danger', onclick: () => { sim.order(A, 'withdraw'); if (Game.track) Game.track('order:withdraw'); this.afterEnd(); } })),
    ) : null;
    this.setPanel(
      h('div', { class: 'bs-h' }, icon('flag'), h('b', null, 'أوامر قبل: ' + (this.siege ? ph.siege : ph.name)), this.breakWhy ? h('span', { class: 'muted small' }, this.breakWhy) : null),
      this.lineList(2),
      grid, detail,
      h('div', { class: 'row-btns' },
        ib('play', 'تابع المعركة', { class: 'btn primary', onclick: () => { this.cardPick = null; sim.nextPhase(); this.renderTop(); this.layoutUnits(false); this.playTicks(); } }),
      ),
    );
  }

  showEvent(ev, done) {
    clearTimeout(this.timer);
    this.newLines();
    this.stage = 'event';
    const box = h('div', { class: 'choice' });
    for (const o of ev.options) {
      box.appendChild(h('button', { disabled: o.dis, onclick: () => { this.sim.choose(ev, o.k); this.layoutUnits(false); this.renderTop(); this.newLines(); if (this.sim.over) { this.afterEnd(); return; } done(); } },
        h('b', null, icon(o.icon || 'chevL'), o.label), h('span', null, o.desc, o.risk && o.risk !== 'لا خطر' ? h('span', { class: 'risk' }, ' الخطر: ' + o.risk) : null)));
    }
    this.setPanel(h('div', { class: 'bs-h ev' }, icon('warning'), h('b', null, ev.title)), h('p', { class: 'lead' }, ev.text), box);
  }

  afterEnd() {
    clearTimeout(this.timer);
    this.renderTop();
    this.layoutUnits(false);
    this.newLines();
    setTimeout(() => this.showReport(), 700);
  }

  showReport() {
    this.stage = 'report';
    const res = this.sim.result();
    this.result = res;
    const me = res.report ? BattleReport.mine(res.report, this.A.i) : { won: res.winner === this.A.i, text: res.winner === this.A.i ? 'نصر' : 'هزيمة', sub: '' };
    const body = h('div', { class: 'bs-report' },
      h('div', { class: 'bs-h ' + (me.won ? 'win' : 'lose') }, icon(me.won ? 'laurel' : 'crownbroken'), h('b', null, me.text), h('span', { class: 'muted small' }, me.sub)),
      res.report ? BattleReport.render(res.report, this.A.i, { head: false }) : null,
      h('div', { class: 'row-btns' }, ib('chevL', 'العودة', { class: 'btn primary', onclick: () => this.onEnd(res) })),
    );
    this.setPanel(body);
    this.panel.classList.add('tall');
  }

  quickResolve(intent) {
    if (!intent) { Panels.intentPicker((k) => { if (k) this.quickResolve(k); }); return; }
    this.A.intent = intent;
    this.sim.autoFormation(this.A, this.planPick);
    const res = this.sim.runAuto();
    this.result = res;
    this.layoutUnits(true);
    this.renderTop();
    this.showReport();
  }
  finishNow(kind) { clearTimeout(this.timer); this.onEnd(kind === 'cancel' ? 'cancel' : this.sim.result()); }

  // ----------- المؤثرات -----------
  consumeCues() {
    for (const c of this.sim.cues) {
      const sideOf = (i) => this.sim.sides[i];
      if (c.t === 'volley') {
        const s = sideOf(c.side), foe = s.foe;
        const x0 = c.from === 'Res' ? 500 : this.sx(s, c.from), x1 = this.sx(foe, c.to);
        const y0 = 300 + this.dir(s) * 90, y1 = 300 + this.dir(foe) * 40;
        for (let i = 0; i < c.n; i++) this.fx.push({ k: 'arrow', x0: x0 + (Math.random() - 0.5) * 60, y0, x1: x1 + (Math.random() - 0.5) * 70, y1: y1 + (Math.random() - 0.5) * 20, t: -i * 0.06, d: 0.7, c: s.color });
      } else if (c.t === 'stone') {
        const s = sideOf(c.side);
        for (let i = 0; i < c.n; i++) this.fx.push({ k: 'stone', x0: 500 + (i - 0.5) * 30, y0: 300 + this.dir(s) * 250, x1: this.sx(s.foe, c.to) + (Math.random() - 0.5) * 40, y1: this.siege ? this.wallY : 300 + this.dir(s.foe) * 30, t: -i * 0.15, d: 1.1 });
      } else if (c.t === 'clash') {
        const x = SX_OURS[this.A === this.sim.sides[0] ? c.a : c.b] || 500;
        for (let i = 0; i < c.n; i++) this.fx.push({ k: 'dust', x: x + (Math.random() - 0.5) * 150, y: 300 + (Math.random() - 0.5) * 30, t: -Math.random() * 0.5, d: 1.2 });
      } else if (c.t === 'charge' || c.t === 'flank' || c.t === 'reserve' || c.t === 'retreat' || c.t === 'hunt' || c.t === 'sally' || c.t === 'ambush') {
        const s = c.side != null ? sideOf(c.side) : this.A;
        this.fx.push({ k: 'arrowBig', side: s, kind: c.t, from: c.from, to: c.to, ok: c.ok, t: 0, d: 2.2 });
      } else if (c.t === 'focus') {
        const s = sideOf(c.side);
        for (const k of SECTS) if (this.sim.secUnits(s, k).some((u) => u.missile)) this.fx.push({ k: 'arrowBig', side: s, kind: 'focus', from: k, to: c.to, t: 0, d: 2 });
      } else if (c.t === 'rout') {
        this.fx.push({ k: 'arrowBig', side: this.sim.sides[c.side], kind: 'retreat', from: c.from, t: 0, d: 2 });
      } else if (c.t === 'breach') {
        const x = this.sx(this.sim.sides[1], c.to);
        for (let i = 0; i < 10; i++) this.fx.push({ k: 'dust', x: x + (Math.random() - 0.5) * 80, y: this.wallY + (Math.random() - 0.5) * 20, t: -Math.random() * 0.4, d: 1.6 });
      }
    }
  }
  floatText(text, tone) {
    this.floats.push({ text, tone, t: 0 });
    if (this.floats.length > 3) this.floats.shift();
  }

  update(dt) {
    this.t += dt;
    for (const p of this.pos.values()) {
      const k = Math.min(1, dt * 2.6);
      p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
    }
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.d);
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter((f) => f.t < 3.2);
    if (this.stage === 'play' && this.sim.phaseKey() === 'approach') {
      this.anim = Math.min(1, (this.anim || 0) + dt / (0.95 / this.speed));
      this.layoutUnits(false);
    }
  }

  // ----------- الرسم -----------
  render(ctx) {
    const d = App.dpr, cam = this.cam;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b2217'; ctx.fillRect(0, 0, App.canvas.width, App.canvas.height);
    cam.apply(ctx);
    // الأرض تمتد خارج الميدان (نسخ معكوسة معتمة) كي لا تظهر أشرطة فارغة
    const ext = (sx, sy, dx, dy) => { ctx.save(); ctx.translate(dx, dy); ctx.scale(sx, sy); ctx.drawImage(this.bg, 0, 0, BW, BH); ctx.restore(); };
    ext(1, -1, 0, 0); ext(1, -1, 0, 2 * BH); ext(-1, 1, 0, 0); ext(-1, 1, 2 * BW, 0);
    ctx.fillStyle = 'rgba(30,22,14,.55)';
    ctx.fillRect(-BW, -BH, 3 * BW, BH); ctx.fillRect(-BW, BH, 3 * BW, BH); ctx.fillRect(-BW, 0, BW, BH); ctx.fillRect(BW, 0, BW, BH);
    ctx.drawImage(this.bg, 0, 0, BW, BH);
    ctx.strokeStyle = 'rgba(60,40,20,.5)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, BW, BH);
    const sim = this.sim;
    // الأرض المكسوبة لكل جانب
    if (sim.phase >= 1) {
      for (const k of SECTS) {
        const fr = this.A.sec[k].front || 0;
        const y = 300 - fr * 55;
        const x = SX_OURS[k];
        ctx.fillStyle = hexA(this.A.color, 0.09); ctx.fillRect(x - 120, y, 240, BH - y);
        ctx.fillStyle = hexA(this.E.color, 0.09); ctx.fillRect(x - 120, 0, 240, y);
        if (!this.siege && (sim.secUnits(this.A, k).length && sim.secUnits(this.E, OPP[k]).length)) {
          ctx.strokeStyle = 'rgba(60,35,20,.55)'; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= 12; i++) { const px = x - 110 + i * 220 / 12; const py = y + (i % 2 ? 4 : -4) * (0.6 + 0.4 * Math.sin(this.t * 3 + i)); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
          ctx.stroke();
        }
      }
    }
    if (this.siege) this.drawWall(ctx);
    // الوحدات
    const all = sim.sides.flatMap((s) => s.units.map((u) => ({ u, s })));
    all.sort((a, b) => (this.pos.get(a.u.id) || { y: 0 }).y - (this.pos.get(b.u.id) || { y: 0 }).y);
    for (const { u, s } of all) this.drawUnit(ctx, u, s);
    // المؤثرات
    for (const f of this.fx) this.drawFx(ctx, f);
    // النصوص العائمة (بمقاس الشاشة)
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fc = this.free ? this.free.cx : App.W / 2;
    let fy = (this.free ? this.free.top : 40) + 14;
    for (const f of this.floats) {
      const a = f.t < 0.3 ? f.t / 0.3 : f.t > 2.6 ? Math.max(0, (3.2 - f.t) / 0.6) : 1;
      ctx.globalAlpha = a;
      ctx.font = '700 15px "Reem Kufi", "Noto Naskh Arabic", sans-serif';
      let w = ctx.measureText(f.text).width + 24;
      const maxW = (this.free ? this.free.w : App.W) - 12;
      if (w > maxW) { const fs = Math.max(10, Math.floor(15 * maxW / w)); ctx.font = `700 ${fs}px "Reem Kufi", "Noto Naskh Arabic", sans-serif`; w = Math.min(maxW, ctx.measureText(f.text).width + 16); }
      ctx.fillStyle = f.tone === 'good' ? 'rgba(30,60,30,.88)' : f.tone === 'bad' ? 'rgba(90,25,18,.88)' : 'rgba(25,18,12,.85)';
      ctx.fillRect(fc - w / 2, fy - 13, w, 26);
      ctx.fillStyle = '#fff4dc'; ctx.fillText(f.text, fc, fy);
      fy += 32;
    }
    ctx.globalAlpha = 1;
  }

  drawWall(ctx) {
    const sim = this.sim, wy = this.wallY;
    const def = sim.sides[1];
    const seg = (x0, x1, key) => {
      const br = def.sec[key].breach;
      if (br >= 1) {
        ctx.fillStyle = '#6d6250';
        for (let x = x0; x < x1; x += 14) if (Math.abs(((x - x0) / (x1 - x0)) - 0.5) > 0.18) ctx.fillRect(x, wy - 6, 12, 12 - Math.random() * 0);
        ctx.fillStyle = 'rgba(60,50,40,.6)';
        for (let i = 0; i < 8; i++) ctx.fillRect((x0 + x1) / 2 - 30 + i * 8, wy - 2 + (i % 3) * 3, 6, 4);
        return;
      }
      ctx.fillStyle = '#4a4034'; ctx.fillRect(x0, wy - 9, x1 - x0, 18);
      ctx.fillStyle = '#a89c84'; ctx.fillRect(x0, wy - 7, x1 - x0, 14);
      ctx.fillStyle = '#4a4034';
      for (let x = x0 + 3; x < x1 - 4; x += 10) ctx.fillRect(x, wy + (this.weDefend ? 5 : -9), 5, 4);
      if (br > 0.05) { ctx.strokeStyle = 'rgba(40,25,15,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo((x0 + x1) / 2 - 20 * br, wy - 7); ctx.lineTo((x0 + x1) / 2, wy + 7); ctx.lineTo((x0 + x1) / 2 + 20 * br, wy - 5); ctx.stroke(); }
    };
    // مفتاح المدافع: يمين المدافع يقابل يسار المهاجم
    const keyAt = (ourKey) => (this.A.att ? OPP[ourKey] : ourKey);
    seg(20, 370, keyAt('L'));
    seg(630, 980, keyAt('R'));
    // البوابة
    const g = def.sec.C.breach;
    ctx.fillStyle = '#4a4034'; ctx.fillRect(370, wy - 12, 260, 24);
    ctx.fillStyle = '#a89c84'; ctx.fillRect(372, wy - 10, 256, 20);
    ctx.fillStyle = g >= 1 ? '#2a2016' : '#6b4a2a'; ctx.fillRect(470, wy - 10, 60, 20);
    if (g >= 1) { ctx.fillStyle = '#6b4a2a'; ctx.save(); ctx.translate(470, wy); ctx.rotate(-0.6); ctx.fillRect(0, -10, 28, 5); ctx.restore(); }
    for (const x of [150, 330, 670, 850, 460, 540]) {
      ctx.fillStyle = '#453b30'; ctx.fillRect(x - 13, wy - 15, 26, 30);
      ctx.fillStyle = '#b8ad93'; ctx.fillRect(x - 11, wy - 13, 22, 26);
    }
    // المعدات
    const att = sim.sides[0];
    const attDir = this.dir(att);
    if (sim.ramAlive) drawIcon(ctx, 'ram', 500, wy + attDir * 26, 26, '#3a2a1a', { outline: 'rgba(240,225,190,.9)' });
    if (sim.equip.tower) {
      const tk = sim.towerSector || 'L';
      const x = this.sx(att, tk) + 60;
      const y = sim.towerDocked ? wy + attDir * 22 : 300 + attDir * 120;
      drawIcon(ctx, 'tower', x, y, 34, sim.towerAlive ? '#4a3a2a' : 'rgba(60,40,30,.5)', { outline: 'rgba(240,225,190,.9)' });
      if (!sim.towerAlive) drawIcon(ctx, 'fire', x, y - 10, 20, '#e0662a');
    }
    if (sim.equip.ladders && sim.phase >= 1) {
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2;
      for (const k of SECTS) {
        if (!sim.secUnits(att, k).length) continue;
        const x = this.sx(att, k);
        for (const dx of [-50, 30]) { ctx.beginPath(); ctx.moveTo(x + dx, wy + attDir * 24); ctx.lineTo(x + dx + 6, wy); ctx.stroke(); }
      }
    }
  }

  drawUnit(ctx, u, s) {
    const p = this.pos.get(u.id);
    if (!p) return;
    const dead = u.men <= 0 || u.state === 'dead';
    const rout = u.state === 'rout';
    if (dead) return;
    const w = this.blockW(u), hh = u.role === 'cav' || u.role === 'skirm' ? 16 : 18;
    const known = s === this.A || this.A.intel >= 2 || this.sim.phase >= 1;
    ctx.globalAlpha = rout ? 0.45 : 1;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(p.x - w / 2 + 2, p.y - hh / 2 + 2, w, hh);
    ctx.fillStyle = s.color;
    if (u.role === 'cav' || u.role === 'skirm') {
      const d = this.dir(s);
      ctx.beginPath(); ctx.moveTo(p.x - w / 2, p.y + d * hh / 2); ctx.lineTo(p.x + w / 2, p.y + d * hh / 2); ctx.lineTo(p.x + w / 2, p.y - d * hh / 4); ctx.lineTo(p.x, p.y - d * hh * 0.75); ctx.lineTo(p.x - w / 2, p.y - d * hh / 4); ctx.closePath(); ctx.fill();
    } else ctx.fillRect(p.x - w / 2, p.y - hh / 2, w, hh);
    const sec = s.sec[u.sec];
    const waver = sec && sec.state === 'waver';
    ctx.strokeStyle = this.sel === u ? '#ffe38a' : waver ? `rgba(255,120,80,${0.6 + 0.4 * Math.sin(this.t * 8)})` : 'rgba(20,14,8,.85)';
    ctx.lineWidth = this.sel === u ? 2.5 : waver ? 2 : 1.2;
    if (u.role === 'cav' || u.role === 'skirm') ctx.stroke(); else ctx.strokeRect(p.x - w / 2, p.y - hh / 2, w, hh);
    if (known) drawIcon(ctx, UNIT_ICON[u.type] || 'swords', p.x - w / 2 + 10, p.y, 14, isLight(s.color) ? '#2a1e12' : '#fff6e2');
    else drawIcon(ctx, 'info', p.x, p.y, 12, isLight(s.color) ? '#2a1e12' : '#fff6e2');
    if (known) {
      ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
      ctx.fillStyle = isLight(s.color) ? '#2a1e12' : '#fff6e2';
      ctx.fillText(String(u.men), p.x + 7, p.y + 0.5);
      ctx.direction = 'inherit';
    }
    if (u.gen) {
      ctx.fillStyle = 'rgba(20,14,8,.7)'; ctx.beginPath(); ctx.arc(p.x, p.y - hh, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#f2d77a'; ctx.lineWidth = 1.8; ctx.stroke();
      drawIcon(ctx, 'helmet', p.x, p.y - hh, 13, '#f2d77a');
      if (s.cmd === u.gen && s.cmdAlive === false) drawIcon(ctx, 'skull', p.x + 13, p.y - hh, 12, '#ff8f7a', { outline: '#2a1e12' });
    }
    ctx.globalAlpha = 1;
  }

  drawFx(ctx, f) {
    const k = clamp(f.t / f.d, 0, 1);
    if (f.t < 0) return;
    if (f.k === 'arrow' || f.k === 'stone') {
      const x = lerp(f.x0, f.x1, k), y = lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * (f.k === 'stone' ? 80 : 40);
      if (f.k === 'stone') { ctx.fillStyle = '#4a4034'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); return; }
      const x2 = lerp(f.x0, f.x1, Math.max(0, k - 0.06)), y2 = lerp(f.y0, f.y1, Math.max(0, k - 0.06)) - Math.sin(Math.max(0, k - 0.06) * Math.PI) * 40;
      ctx.strokeStyle = 'rgba(40,28,16,.8)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
    } else if (f.k === 'dust') {
      ctx.fillStyle = `rgba(150,125,90,${0.35 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(f.x, f.y - k * 12, 6 + k * 14, 0, TAU); ctx.fill();
    } else if (f.k === 'arrowBig') {
      const s = f.side, d = this.dir(s);
      const a = k < 0.2 ? k / 0.2 : k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.globalAlpha = a * 0.9;
      const col = f.kind === 'retreat' ? '#7a2a20' : f.kind === 'reserve' ? '#2f6a3a' : f.kind === 'focus' ? '#8a5a1a' : s.color;
      const x0 = f.from && f.from !== 'Res' ? this.sx(s, f.from) : 500;
      let pts;
      if (f.kind === 'flank' && f.from) {
        const outer = (f.from === 'L') === (s === this.A) ? 60 : 940;
        pts = [[x0, 300 + d * 110], [outer, 300 + d * 20], [outer, 300 - d * 120], [this.sx(s.foe, f.to || OPP[f.from]), 300 - d * 130]];
      } else if (f.kind === 'retreat') pts = [[x0, 300 + d * 30], [x0, 300 + d * 180]];
      else if (f.kind === 'reserve') pts = [[500, 300 + d * 230], [this.sx(s, f.to || 'C'), 300 + d * 60]];
      else if (f.kind === 'hunt') pts = [[500, 300 + d * 220], [460, 300 - d * 30], [500, 300 - d * 140]];
      else if (f.kind === 'ambush') pts = [[150, 300 + d * 60], [400, 300 - d * 40], [500, 300 - d * 20]];
      else if (f.kind === 'sally') pts = [[500, this.wallY], [500, this.wallY + d * -160]];
      else pts = [[x0, 300 + d * 110], [this.sx(s.foe, f.to || 'C'), 300 - d * 40]];
      this.arrowPath(ctx, pts, col, f.kind === 'charge' ? 7 : 5, f.kind === 'retreat');
      if (f.kind === 'flank' && f.ok === false) drawIcon(ctx, 'close', pts[pts.length - 1][0], pts[pts.length - 1][1], 22, '#b8412f');
      ctx.globalAlpha = 1;
    }
  }
  arrowPath(ctx, pts, col, w, dashed) {
    ctx.strokeStyle = 'rgba(20,14,8,.5)'; ctx.lineWidth = w + 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (dashed) ctx.setLineDash([10, 7]);
    const path = () => {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      if (pts.length === 2) ctx.lineTo(pts[1][0], pts[1][1]);
      else for (let i = 1; i < pts.length - 1; i++) { const xc = (pts[i][0] + pts[i + 1][0]) / 2, yc = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], i === pts.length - 2 ? pts[i + 1][0] : xc, i === pts.length - 2 ? pts[i + 1][1] : yc); }
    };
    path(); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; path(); ctx.stroke();
    ctx.setLineDash([]);
    const [xa, ya] = pts[pts.length - 2], [xb, yb] = pts[pts.length - 1];
    const ang = Math.atan2(yb - ya, xb - xa);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(xb + Math.cos(ang) * 10, yb + Math.sin(ang) * 10); ctx.lineTo(xb + Math.cos(ang + 2.5) * 14, yb + Math.sin(ang + 2.5) * 14); ctx.lineTo(xb + Math.cos(ang - 2.5) * 14, yb + Math.sin(ang - 2.5) * 14); ctx.closePath(); ctx.fill();
  }

  onTap(w) {
    // التشكيل باللمس على الخريطة: اختر وحدة ثم قطاعاً
    if (this.stage !== 'form') return;
    let best = null, bd = 30;
    for (const u of this.A.units) {
      const p = this.pos.get(u.id);
      if (!p || u.men <= 0) continue;
      const d2 = Math.hypot(p.x - w.x, p.y - w.y);
      if (d2 < bd) { bd = d2; best = u; }
    }
    if (best) { this.sel = this.sel === best ? null : best; this.showFormation(); return; }
    if (this.sel && this.sel.role !== 'guard') {
      const k = w.y > 300 + 200 ? 'Res' : w.x < 375 ? 'L' : w.x > 625 ? 'R' : 'C';
      this.sel.sec = k; this.sel = null;
      this.layoutUnits(false);
      this.showFormation();
    }
  }
}

function hexA(hex, a) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }
