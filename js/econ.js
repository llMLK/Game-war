'use strict';
// الاقتصاد المقروء: تفصيل الخزينة، معاينة أثر كل بناء قبل تأكيده، ومقارنة فرص الاستثمار بين المدن.
// كل الأرقام هنا تُحسب بالدوال نفسها التي تُنهي الدور، فلا تختلف المعاينة عن الناتج.

const BUILD_FX = {
  walls: (n) => [`الأسوار ${n.walls} ← ${n.walls + 1}: الاقتحام أصعب`, 'مؤن الحصار +1 دور، ورماة إضافيون في الحامية'],
  granary: () => ['مؤن الحصار +3 أدوار', 'سعة الإمداد +3 وحدات'],
  barracks: () => ['تتيح الخيالة والمنجنيق وإعادة التسليح', 'تدريب الجيوش المقيمة (خبرة)'],
  port: () => ['يفتح الطرق المائية من هنا لكل جيوشك'],
  roads: () => ['الحركة من المدينة وإليها أرخص بنقطة'],
};

Object.assign(Game, {
  // لقطة للأرقام التي يغيّرها البناء
  econSnap(fid, n) {
    const e = this.economy(fid);
    return {
      net: e.netGold, city: this.cityIncome(n), potential: this.incomeModel(n, { ignoreSiege: true, ignoreUnrest: true }).total,
      trade: e.trade, food: e.netFood, cityFood: this.cityFood(n), mpCap: this.mpCap(n), mpRegen: this.mpRegen(n),
      supply: this.supplyCap(n, fid), stores: this.storesMax(n), growth: 0.4 + (n.farm || 0) * 0.4,
    };
  },
  // أثر مستوى إضافي من بناء: قبل وبعد، على الحساب نفسه
  buildEffect(fid, n, b) {
    const B = BUILDINGS[b], lvl = n[b] || 0;
    if (lvl >= B.max) return null;
    const before = this.econSnap(fid, n);
    n[b] = lvl + 1;
    let after;
    try { after = this.econSnap(fid, n); } finally { n[b] = lvl; }
    const cost = B.cost(lvl);
    const gold = after.net - before.net;
    const blockedNow = this.besieger(n.id) ? 'siege' : n.unrest > 0 ? 'unrest' : null;
    const goldLater = after.potential - before.potential + (after.trade - before.trade);
    const lines = [];
    if (b === 'market' || b === 'roads' || b === 'port') {
      lines.push(['دخل المدينة', `${before.city} ← ${after.city}`, after.city > before.city ? 'pos' : '']);
      if (after.trade !== before.trade) lines.push(['التجارة وطريق القوافل', `${before.trade} ← ${after.trade}`, 'pos']);
    }
    if (b === 'farm') {
      lines.push(['طعام المدينة', `${before.cityFood} ← ${after.cityFood}`, 'pos']);
      lines.push(['القوى البشرية القصوى', `${before.mpCap} ← ${after.mpCap}`, 'pos']);
      lines.push(['تجدد القوى البشرية', `+${before.mpRegen} ← +${after.mpRegen} كل دور`, 'pos']);
      lines.push(['نمو السكان', `${before.growth.toFixed(1)}٪ ← ${after.growth.toFixed(1)}٪ كل دور`, 'pos']);
      lines.push(['سعة الإمداد', `${before.supply} ← ${after.supply}`, 'pos']);
    }
    if (b === 'granary') { lines.push(['مؤن الحصار القصوى', `${before.stores} ← ${after.stores} أدوار`, 'pos']); lines.push(['سعة الإمداد', `${before.supply} ← ${after.supply}`, 'pos']); }
    if (b === 'walls') lines.push(['مؤن الحصار القصوى', `${before.stores} ← ${after.stores} أدوار`, 'pos']);
    return {
      b, lvl, next: lvl + 1, cost, time: 'يكتمل فوراً (بناء واحد في المدينة كل دور)',
      gold, goldLater: blockedNow ? goldLater : gold, blockedNow, food: after.food - before.food,
      payback: gold > 0 ? Math.ceil(cost / gold) : blockedNow && goldLater > 0 ? Math.ceil(cost / goldLater) : null,
      lines, fx: BUILD_FX[b] ? BUILD_FX[b](n) : [],
    };
  },
  // كل فرص الاستثمار المالي في المملكة، الأسرع استرداداً أولاً
  investOptions(fid) {
    const out = [];
    for (const n of this.nodesOf(fid)) {
      for (const b of ['market', 'roads', 'port', 'farm']) {
        const B = BUILDINGS[b];
        if ((n[b] || 0) >= B.max || (B.coastal && !this.hasWater(n))) continue;
        const e = this.buildEffect(fid, n, b);
        if (!e) continue;
        out.push({ n, ...e, err: this.canBuild(fid, n, b) });
      }
    }
    return out.sort((x, y) => (x.payback == null ? 1e9 : x.payback) - (y.payback == null ? 1e9 : y.payback) || y.food - x.food);
  },
  // الخزينة بالترتيب: المصادر ثم الالتزامات ثم الصافي والرصيد المتوقع
  treasuryLines(fid) {
    const e = this.economy(fid), f = this.f(fid);
    const merc = this.armiesOf(fid).reduce((t, a) => t + a.regs.filter((r) => r.merc).reduce((s, r) => s + Math.round((UNITS[r.type].upkeep || 0) * 0.8), 0), 0);
    const govSal = this.gensOf(fid).filter((g) => g.status === 'gov').reduce((t, g) => t + this.genSalary(g), 0);
    const L = [
      ['دخل المدن', '+' + e.gold, 'pos'],
      e.trade - (e.route || 0) ? ['اتفاقات التجارة', '+' + (e.trade - (e.route || 0)), 'pos'] : null,
      e.route ? ['طريق القوافل', '+' + e.route, 'pos'] : null,
      e.tribute ? [e.tribute > 0 ? 'جزية تقبضها' : 'جزية تدفعها', signed(e.tribute), e.tribute > 0 ? 'pos' : 'neg'] : null,
      ['صيانة الوحدات' + (merc ? ` (منها ${merc} زيادة المرتزقة)` : ''), '−' + e.upkeep, 'neg'],
      ['رواتب القادة' + (govSal ? ` (منها ${govSal} للحكّام)` : ''), '−' + e.salaries, 'neg'],
      e.overhead ? [`أعباء ${Math.round(e.overhead / 10)} جيوش زائدة عن عدد مدنك`, '−' + e.overhead, 'neg'] : null,
      ['الصافي كل دور', signed(e.netGold), 'sum'],
      ['الرصيد الآن', String(f.gold), ''],
      ['الرصيد بعد نهاية الدور', String(f.gold + e.netGold), e.netGold < 0 && f.gold + e.netGold < 0 ? 'neg' : ''],
    ];
    return L.filter(Boolean);
  },
  // أثر التزام جديد (راتب، صيانة، جزية) على الصافي والرصيد
  commitPreview(fid, now, perTurn) {
    const e = this.economy(fid), f = this.f(fid);
    return { gold: f.gold, after: f.gold - now, net: e.netGold, netAfter: e.netGold - perTurn, in5: f.gold - now + (e.netGold - perTurn) * 5 };
  },
});

// --- الواجهة ---
const EconUI = {
  commitLines(p) {
    return [['الرصيد الآن', p.gold], ['بعد الدفع', p.after, p.after < 0 ? 'neg' : ''], ['الصافي كل دور', `${signed(p.net)} ← ${signed(p.netAfter)}`, p.netAfter < 0 ? 'neg' : ''], ['الرصيد المتوقع بعد 5 أدوار', p.in5, p.in5 < 0 ? 'neg' : '']];
  },
  lines(list) { return h('div', { class: 'pop-lines' }, list.filter(Boolean).map(([k, v, c]) => h('div', { class: 'pl' + (c ? ' ' + c : '') }, h('span', null, k), h('bdi', null, v)))); },
  // معاينة البناء قبل تأكيده
  buildPreview(scene, n, b) {
    const P = scene.P, B = BUILDINGS[b];
    const e = Game.buildEffect(P, n, b);
    if (!e) return;
    const err = Game.canBuild(P, n, b);
    const gold = e.gold, later = e.goldLater;
    const incomeLine = b === 'farm' ? ['الذهب', 'لا ينتج ذهباً مباشرة'] : ['صافي الذهب كل دور', signed(gold), gold > 0 ? 'pos' : ''];
    const blockNote = e.blockedNow === 'siege' ? `المدينة محاصرة الآن فلا يصل دخلها. بعد رفع الحصار: ${signed(later)} كل دور.` : e.blockedNow === 'unrest' ? `المدينة مضطربة (${n.unrest} أدوار) فدخلها منخفض. بعد الاستقرار: ${signed(later)} كل دور.` : null;
    UI.modal({
      title: `${B.name} في ${n.name}`, icon: B.icon,
      body: h('div', null,
        this.lines([
          ['المستوى', `${e.lvl} ← ${e.next}`],
          ['الكلفة', `${e.cost} ذهباً مرة واحدة`],
          ['المدة', e.time],
          b === 'farm' || b === 'market' || b === 'roads' || b === 'port' ? incomeLine : null,
          ...e.lines,
          e.food ? ['صافي الطعام في المملكة', signed(e.food) + ' كل دور', 'pos'] : null,
          e.payback ? ['استرداد الكلفة', `بعد ${e.payback} أدوار من اكتماله`, 'sum'] : (b === 'market' || b === 'roads' || b === 'port') ? ['استرداد الكلفة', 'لا يسترد بالذهب هنا', ''] : null,
        ]),
        e.fx.length ? h('ul', { class: 'steps small' }, e.fx.map((t) => h('li', null, t))) : null,
        blockNote ? h('p', { class: 'hint warn' }, blockNote) : null,
        h('p', { class: 'hint' }, 'المباني بلا صيانة. الأرقام محسوبة من حالة المدينة الآن بالمعادلة نفسها التي تنهي الدور.'),
      ),
      buttons: [
        { label: err || `ابنِ (${e.cost})`, primary: true, disabled: !!err, onClick: () => { const r = Game.build(P, n, b); if (!r && Game.track) Game.track('build'); UI.toast(r || `بُني ${B.name} في ${n.name}`); scene.afterAction(n); } },
        { label: 'قارن المدن', onClick: () => this.investTable(scene) },
        { label: 'إلغاء', ghost: true },
      ],
    });
  },
  // جدول فرص الاستثمار في كل المدن
  investTable(scene) {
    const P = scene.P;
    const opts = Game.investOptions(P);
    const money = opts.filter((o) => o.b !== 'farm');
    const food = opts.filter((o) => o.b === 'farm');
    const row = (o, val, pay) => h('tr', { class: o.err ? 'dim' : '' },
      h('td', null, h('button', { class: 'linkish', onclick: () => { scene.flyTo(o.n.x, o.n.y); this.buildPreview(scene, o.n, o.b); } }, `${BUILDINGS[o.b].name} ${o.lvl}←${o.next}`), h('span', { class: 'muted small' }, ' ' + o.n.name)),
      h('td', null, o.cost), h('td', null, val), h('td', null, pay));
    const tbl = (head, list, fn) => h('table', { class: 'res roi' }, h('thead', null, h('tr', null, head.map((x) => h('th', null, x)))), h('tbody', null, list.map(fn)));
    UI.modal({
      title: 'فرص التطوير', icon: 'coins', cls: 'wide',
      body: h('div', null,
        h('p', { class: 'hint' }, 'مرتبة حسب سرعة استرداد الكلفة. الزيادة صافية على خزينة المملكة كلها، بعد أثر الولاء والضرائب والهدر الإداري.'),
        money.length ? tbl(['التطوير', 'الكلفة', 'زيادة كل دور', 'الاسترداد'], money.slice(0, 12), (o) => row(o, o.blockedNow ? `${signed(o.gold)} (بعد العائق ${signed(o.goldLater)})` : signed(o.gold), o.payback ? `${o.payback} أدوار` : 'لا يسترد')) : h('p', { class: 'hint' }, 'لا فرص مالية متاحة.'),
        food.length ? h('div', { class: 'sec-h' }, icon('farm'), 'الغذاء والرجال') : null,
        food.length ? tbl(['التطوير', 'الكلفة', 'طعام كل دور', 'رجال +/دور'], food.slice(0, 8), (o) => row(o, signed(o.food), (() => { const l = o.lines.find((x) => x[0] === 'تجدد القوى البشرية'); return l ? l[1].replace(' كل دور', '') : ''; })())) : null,
      ),
      buttons: [{ label: 'إغلاق', primary: true }],
    });
  },
};
