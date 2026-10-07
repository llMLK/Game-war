'use strict';
// Economic access only: merchants use the atlas links; army movement and diplomacy are unchanged.
(() => {
  const blocked = (cause, text, fix, extra = {}) => ({ ok: false, cause, text, fix, auto: true, temporary: true, ...extra });
  Object.assign(Game, {
    tradeSegmentState(a, b, options = {}) {
      const A = this.node(a), B = this.node(b), edge = this.edge(a, b), r = this.S.route, T = this.S.turn;
      if (options.caravan && r?.dead) return blocked('collapse', 'انتقل التجار عن الطريق القديم', 'تابع سباق الطريق البديل في أحداث العالم؛ حماية الطريق القديم لا تعيده.', { auto: false, temporary: false, story: true });
      if (!A || !B || !edge) return blocked('migration', 'هذا المقطع لا يطابق وصلات الأطلس الحالي', 'افتح الأطلس؛ يستعاد المسار المعتمد عند تحميل حفظ قديم إن كان معروفاً.', { auto: false, temporary: false });
      for (const n of [A, B]) {
        const besiegers = this.besiegers(n.id);
        if (besiegers.length) return blocked('siege', `حصار ${n.name} يقطع مرور التجار`, `رفع حصار ${this.fname(besiegers[0].fid)} يعيد المرور تلقائياً.`, { node: n.id });
        if ((n.caravanStop ?? -1) >= T) return blocked('sabotage', `تخريب عطّل القوافل عند ${n.name}`, `يعود المرور تلقائياً في الدور ${n.caravanStop + 2} المعروض في التقويم.`, { node: n.id, until: n.caravanStop, turns: n.caravanStop - T + 1 });
        const hostile = this.S.armies.find(x => x.node === n.id && x.fid !== n.owner && this.atWar(x.fid, n.owner) && this.menOf(x.regs || []) > 0);
        if (hostile) return blocked('hostile', `قوات ${this.fname(hostile.fid)} تقطع الطريق عند ${n.name}`, 'أبعد الجيش المعادي أو أنهِ الحرب؛ الحراسة التجارية وحدها لا تتجاوز جيشاً.', { node: n.id });
      }
      if (edge.kind === 'water') {
        const missing = [A, B].find(n => !n.port);
        if (missing) return blocked('port', `المعبر البحري يحتاج ميناءً في ${missing.name}`, `ابنِ ميناءً في ${missing.name} إن كانت تحت حكمك، أو اعتمد على وصلة برية أو بحرية أخرى متاحة.`, { node: missing.id, auto: false });
      }
      if (A.owner !== B.owner && this.atWar(A.owner, B.owner)) return blocked('war', `حرب بين ${this.fname(A.owner)} و${this.fname(B.owner)} تقطع هذا المقطع`, A.owner === 'neutral' || B.owner === 'neutral' ? 'المدينة المستقلة لا تسمح بعبور الحدود التجارية؛ السيطرة عليها تفتح هذا المقطع.' : 'الصلح بين المملكتين يعيد المرور تلقائياً.');
      for (const n of [A, B]) for (const fid of options.partners || []) {
        if (n.owner !== fid && this.atWar(fid, n.owner)) return blocked('hostile', `${n.name} تحت حكم ${this.fname(n.owner)} المعادية لأحد طرفي التجارة`, 'أوقف الحرب أو افتح ممراً آخر لا يمر بأرض معادية.', { node: n.id });
      }
      for (const c of this.S.crises || []) {
        if (c.over) continue;
        if (c.type === 'plague' && (c.v?.quar?.[a] || c.v?.quar?.[b])) {
          const n = c.v.quar[a] ? A : B;
          return blocked('plague', `حجر صحي في ${n.name}`, 'رفع الحجر من نافذة الوباء يعيد التجارة، مع خطر انتقال العدوى.', { node: n.id });
        }
        if (c.type === 'horde' && c.v?.blockRoute && c.v.region?.some(id => id === a || id === b)) return blocked('event', `زحف ${c.v.name} يعطل الطريق`, 'يعود المرور حين ينتهي الحدث أو يرحل الغزاة عن المنطقة.', { story: true });
      }
      for (const n of [A, B]) {
        if (n.owner === 'neutral') continue;
        const guarded = this.armiesOfAt(n.owner, n.id).some(x => this.menOf(x.regs || []) > 0) || (r?.escort?.[n.id] ?? -1) >= T;
        if (!guarded && (n.loyalty < 30 || n.unrest > 0 && n.loyalty < 45)) return blocked('bandits', `قطاع طرق حول ${n.name}`, `ضع جيشاً في المدينة، أو ارفع الولاء إلى ${n.unrest > 0 ? 45 : 30}، أو استأجر حراسة لأربعة أدوار.`, { node: n.id, escort: n.owner === this.S.player });
      }
      return { ok: true, cause: null, text: edge.kind === 'water' ? 'ممران مينائيان متصلان؛ التجارة تعبر بحراً' : 'طريق بري مفتوح', temporary: false };
    },
    routeSegState(a, b) { return this.tradeSegmentState(a, b, { caravan: true }); },
    routeStatus(fid) {
      const r = this.S.route;
      if (!r) return null;
      const segs = r.path.slice(1).map((b, i) => ({ a: r.path[i], b, ...this.routeSegState(r.path[i], b) }));
      const cities = r.path.map(id => this.node(id)).filter(n => n?.owner === fid).map(n => ({ id: n.id, name: n.name, ...this.routeCityIncome(n), ...(r.dead ? { full: this.routeCityBase(n) } : {}) }));
      // Keep the former route's potential visible during migration instead of reporting a misleading zero loss.
      const now = cities.reduce((sum, n) => sum + n.now, 0);
      const full = cities.reduce((sum, n) => sum + (r.dead ? this.routeCityBase(this.node(n.id)) : n.full), 0);
      const stopped = segs.filter(x => !x.ok);
      return { name: r.name, dead: !!r.dead, segs, stopped, cities, now, full, loss: full - now,
        state: r.dead ? 'انتقل التجار إلى مسار بديل' : segs.length === 0 ? 'لا مسار صالح' : stopped.length ? (stopped.length === segs.length ? 'متوقفة' : 'متوقفة جزئياً') : 'نشطة',
        controlText: 'القوافل تجارة تلقائية على مسار ثابت، وليست وحدات تحرّكها يدوياً. تحسّن الأسواق والطرق والموانئ دخلها؛ الحراسة تزيل قطاع الطرق، وتغيير المسار يحدث عبر أحداث العالم.',
        ownershipText: 'دخل كل محطة يذهب إلى مالكها الحالي؛ فقدان مدينة أو تغيير ملكيتها ينقل دخلها معه حتى لو بقي الطريق مفتوحاً.',
        foreignCities: r.path.map(id => this.node(id)).filter(n => n && n.owner !== fid).map(n => ({ id: n.id, name: n.name, owner: n.owner })),
        migration: r.migration || null };
    },
    routeCauses(fid) {
      const st = this.routeStatus(fid);
      if (!st) return [];
      const found = new Map();
      for (const seg of st.stopped) {
        const key = `${seg.cause}:${seg.node || [this.node(seg.a)?.owner, this.node(seg.b)?.owner].sort().join(':')}`;
        if (found.has(key)) found.get(key).segments.push([seg.a, seg.b]);
        else found.set(key, { ...seg, segments: [[seg.a, seg.b]] });
      }
      return [...found.values()];
    },
    tradeBreakdown(fid) {
      const f = this.f(fid), partners = [];
      if (!f) return { total: 0, potential: 0, partners };
      const weight = n => 2 + (n.market || 0) + (n.roads || 0) + 2 * (n.port || 0);
      const market = n => (n.market || 0) + (n.roads || 0) + 2 * (n.port || 0);
      for (const [other, treaty] of Object.entries(f.treaty || {})) {
        if (!treaty?.trade || !this.f(other)?.alive || other === fid) continue;
        const own = this.nodesOf(fid), theirs = this.nodesOf(other), both = own.concat(theirs);
        const potential = both.length ? Math.min(70, 12 + both.reduce((sum, n) => sum + market(n), 0) * 5) : 0;
        const blockedEdges = [], connected = new Set(), visited = new Set();
        const operational = new Map();
        for (const [a, b] of this.sc.edges) {
          const state = this.tradeSegmentState(a, b, { partners: [fid, other] });
          if (state.ok) { if (!operational.has(a)) operational.set(a, []); if (!operational.has(b)) operational.set(b, []); operational.get(a).push(b); operational.get(b).push(a); }
          else blockedEdges.push({ a, b, ...state });
        }
        let path = [];
        for (const start of own) {
          if (visited.has(start.id)) continue;
          const queue = [start.id], component = [], previous = new Map([[start.id, null]]);
          visited.add(start.id);
          for (let i = 0; i < queue.length; i++) {
            const id = queue[i]; component.push(id);
            for (const next of operational.get(id) || []) if (!visited.has(next)) { visited.add(next); previous.set(next, id); queue.push(next); }
          }
          const target = component.find(id => this.node(id)?.owner === other);
          if (!target) continue;
          for (const id of component) if ([fid, other].includes(this.node(id)?.owner)) connected.add(id);
          if (!path.length) { let next = target; while (next) { path.unshift(next); next = previous.get(next); } }
        }
        const weightOf = nodes => nodes.reduce((sum, n) => sum + weight(n), 0);
        const reachedOwn = own.filter(n => connected.has(n.id)), reachedOther = theirs.filter(n => connected.has(n.id));
        const share = Math.min(weightOf(reachedOwn) / Math.max(1, weightOf(own)), weightOf(reachedOther) / Math.max(1, weightOf(theirs)));
        const base = Math.min(70, 12 + both.filter(n => connected.has(n.id)).reduce((sum, n) => sum + market(n), 0) * 5);
        const income = this.atWar(fid, other) ? 0 : Math.round(base * share);
        // Explain barriers at the edge of the player's merchant network, not arbitrary distant wars.
        const reasons = blockedEdges.filter(x => visited.has(x.a) !== visited.has(x.b) || [x.a, x.b].some(id => this.node(id)?.owner === fid)).filter((x, i, list) => list.findIndex(y => y.cause === x.cause && y.node === x.node) === i).slice(0, 4);
        if ((share < 1 || !income) && !reasons.length) reasons.push(blocked('disconnected', income ? 'بعض مدن الطرفين معزولة عن الشبكة التجارية' : 'لا وصلة تجارية مفتوحة تصل مدن الطرفين', 'افتح معبراً برياً آمناً أو ميناءين متصلين بالأطلس؛ المعاهدة وحدها لا تنقل البضائع.'));
        partners.push({ fid: other, name: this.fname(other), income, potential, connected: connected.size > 0, share, connectedCities: [...connected], isolatedCities: both.filter(n => !connected.has(n.id)).map(n => ({ id: n.id, name: n.name, owner: n.owner })), ports: both.filter(n => connected.has(n.id) && n.port).map(n => n.id), path,
          reasons: share < 1 || !income ? reasons : [], state: !income ? 'متوقفة' : share < 1 ? 'تجارة جزئية' : 'متصلة',
          fix: !income ? 'عالج انقطاع الممرات؛ المعاهدة باقية لكنها لا تنتج دخلاً بلا طريق آمن.' : share < 1 ? 'وصل المدن المعزولة بطريق آمن لزيادة التجارة.' : 'الأسواق والطرق والموانئ المتصلة تدعم هذه التجارة؛ العائد الأقصى لكل شريك 70 قبل سياسة المملكة.' });
      }
      return { total: partners.reduce((sum, p) => sum + p.income, 0), potential: partners.reduce((sum, p) => sum + p.potential, 0), partners };
    },
    tradeIncome(fid) { return this.tradeBreakdown(fid).total; },
  });
  const migrate = Game.migrateAtlasRoute;
  Game.migrateAtlasRoute = function () {
    const r = this.S.route;
    if (!r) return;
    const old = Array.isArray(r.path) ? r.path.slice() : [];
    if (!Array.isArray(r.path)) r.path = [];
    migrate.call(this);
    r.path = [...new Set(r.path.filter(id => this.node(id)))];
    if (old.join('|') !== r.path.join('|')) r.migration = { turn: this.S.turn, text: 'وُفّق المسار القديم مع الأطلس الحالي؛ الحراسة وحالة الطريق محفوظتان.', previous: old };
    r.escort = r.escort && typeof r.escort === 'object' ? r.escort : {};
    // Removed city names in a legacy stop record must not produce false recovery alerts.
    if (r.stops) for (const key of Object.keys(r.stops)) if (!key.split('|').every(id => this.node(id))) delete r.stops[key];
  };
  if (typeof HELP !== 'undefined' && HELP.route) HELP.route.what = 'تجارة تلقائية على مسار المدن، وليست وحدات تتحرك يدوياً. كل مدينة تكسب بقدر ما يتصل بها من الطريق المفتوح؛ توضح المقاطع سبب الانقطاع وكيف يعود المرور.';
})();
