'use strict';
// تشخيص الحركة: لماذا لا يصل الجيش إلى مدينة؟ لا ضغط بلا نتيجة ولا منع بلا سبب.
// ويفحص المطوّر شبكة الطرق كلها: مدن معزولة، معابر بحرية، طرق مكسورة، ومرور عبر الحلفاء.

Object.assign(Game, {
  // أقصر طريق «مثالي» يتجاهل الملكية ونقاط الحركة، ثم نبحث فيه عن أول عائق
  idealPath(a, targetId) {
    const start = a.node;
    const dist = { [start]: 0 }, prev = {}, prevKind = {};
    const open = [start];
    const cost = (from, to, kind) => {
      if (kind === 'water') return 3;
      const c = this.edgeCost(a, this.node(from), this.node(to), kind);
      return c === Infinity ? 3 : c;
    };
    // العقد غير القابلة للعبور تحمل عقوبة كبيرة حتى يُفضَّل طريق مفتوح إن وُجد
    const penalty = (id) => (id === start || id === targetId ? 0 : this.passable(a, this.node(id)) ? 0 : 40);
    while (open.length) {
      open.sort((x, y) => dist[x] - dist[y]);
      const cur = open.shift();
      if (cur === targetId) break;
      for (const e of this.edgesOf(cur)) {
        const water = e.kind === 'water' && !(this.hasTrait(a, 'naval') || (this.node(cur).port && this.friendly(this.node(cur).owner, a.fid)));
        const nd = dist[cur] + cost(cur, e.to, e.kind) + penalty(e.to) + (water ? 25 : 0);
        if (dist[e.to] !== undefined && dist[e.to] <= nd) continue;
        dist[e.to] = nd; prev[e.to] = cur; prevKind[e.to] = e.kind;
        open.push(e.to);
      }
    }
    if (dist[targetId] === undefined) return null;
    const path = [];
    for (let c = targetId; c !== start; c = prev[c]) path.unshift({ id: c, kind: prevKind[c], from: prev[c] });
    return path;
  },

  // سبب عدم إمكان الوصول (أو null إن كان ممكناً)
  whyNot(a, targetId) {
    if (!a || targetId === a.node) return null;
    const T = this.node(targetId);
    if (this.reach(a)[targetId]) return null;
    const out = (msg, o = {}) => ({ msg, ...o });
    if (!a.regs.length) return out('الجيش بلا وحدات: جنّد أو انقل إليه وحدات قبل أن يتحرك.');
    if (a.mp <= 0) return out(`استنفد جيش ${this.gname(this.armyGen(a))} نقاط حركته هذا الدور. تتجدد في الدور التالي.`, { kind: 'mp' });
    if (a.siege) {
      return this.adjAll(a.node).includes(targetId)
        ? out(`الطريق إلى ${T.name} مغلق من موقع الحصار.`)
        : out(`الجيش يحاصر ${this.node(a.node).name}: يتحرك خطوة واحدة فقط من موقع الحصار. ارفع الحصار أو تحرّك خطوة أولاً.`, { kind: 'siege' });
    }
    const start = this.node(a.node);
    if (!this.passable(a, start)) return out(`${start.name} محاصرة: الجيش لا يخرج منها إلا للقتال. فكّ الحصار أو اخرج للمعركة من نافذة الحصار.`, { kind: 'trapped' });
    const path = this.idealPath(a, targetId);
    if (!path) return out(`لا يوجد طريق بري أو بحري يصل إلى ${T.name} على هذه الخريطة.`, { kind: 'nopath' });
    let spent = 0;
    for (let i = 0; i < path.length; i++) {
      const step = path[i], n = this.node(step.id), from = this.node(step.from);
      const last = i === path.length - 1;
      if (step.kind === 'water') {
        const ok = this.hasTrait(a, 'naval') || (from.port && this.friendly(from.owner, a.fid));
        if (!ok) return out(`الطريق إلى ${T.name} يعبر البحر من ${from.name}: يتطلب ميناءً لك في ${from.name} أو قائداً ربّاناً.`, { kind: 'water', node: from.id });
      }
      if (!last && !this.passable(a, n)) {
        if (this.friendly(n.owner, a.fid)) return out(`الطريق إلى ${T.name} يمر عبر ${n.name} المحاصرة: لا يعبرها جيش حتى يُفك الحصار عنها.`, { kind: 'besieged', node: n.id });
        if (n.owner === 'neutral') return out(`الطريق إلى ${T.name} يمر عبر ${n.name}، مدينة مستقلة لا تسمح بمرور الجيوش. افتحها أولاً أو التفّ حولها.`, { kind: 'neutral', node: n.id });
        if (this.atWar(a.fid, n.owner)) return out(`الطريق إلى ${T.name} يمر عبر ${n.name} (${this.fname(n.owner)}): لا يعبر جيش مدينة معادية دون فتحها. حاصر ${n.name} أولاً.`, { kind: 'enemy', node: n.id });
        return out(`الطريق إلى ${T.name} يمر عبر ${n.name}، و${this.fname(n.owner)} لا تسمح بالمرور العسكري: لا حلف بينكما.`, { kind: 'access', node: n.id });
      }
      spent += step.kind === 'water' ? 3 : this.edgeCost(a, from, n, step.kind);
    }
    const turns = Math.max(2, Math.ceil(spent / this.mpMax(a)));
    return out(`${T.name} تبعد ${spent} نقاط حركة ولدى الجيش ${a.mp}. تصلها في نحو ${turns} أدوار عبر ${path.slice(0, -1).map((p) => this.node(p.id).name).join('، ') || 'الطريق المباشر'}.`, { kind: 'far', node: path[0].id });
  },

  // ——— فحص المطوّر لشبكة الطرق كلها ———
  pathDiagnostics() {
    const sc = this.sc, ids = new Set(sc.nodes.map((n) => n.id));
    const report = { badEdges: [], dupEdges: [], isolated: [], waterOnly: [], landComponents: 0, landIslands: [], seaCrossings: [], blocked: [] };
    const seen = new Set();
    for (const e of sc.edges) {
      if (!ids.has(e[0]) || !ids.has(e[1])) report.badEdges.push(e.join('-'));
      const k = [e[0], e[1]].sort().join('|');
      if (seen.has(k)) report.dupEdges.push(k); seen.add(k);
      if (e[2] === 'water') report.seaCrossings.push(`${this.node(e[0]).name} ↔ ${this.node(e[1]).name}`);
    }
    for (const n of sc.nodes) {
      const es = this.edgesOf(n.id);
      if (!es.length) report.isolated.push(n.name);
      else if (es.every((e) => e.kind === 'water')) report.waterOnly.push(n.name);
    }
    // مكونات البر
    const comp = {};
    let c = 0;
    for (const n of sc.nodes) {
      if (comp[n.id] != null) continue;
      c++;
      const st = [n.id]; comp[n.id] = c;
      while (st.length) { const x = st.pop(); for (const y of this.adj(x)) if (comp[y] == null) { comp[y] = c; st.push(y); } }
    }
    report.landComponents = c;
    if (c > 1) {
      const by = {};
      for (const [id, k] of Object.entries(comp)) (by[k] = by[k] || []).push(this.node(id).name);
      report.landIslands = Object.values(by).filter((v) => v.length < sc.nodes.length / 2);
    }
    // لكل جيش للاعب: المدن المجاورة غير الممكنة وأسبابها
    for (const a of this.armiesOf(this.S.player)) {
      for (const id of WX.near(a.node, 2)) {
        if (id === a.node) continue;
        const w = this.whyNot(a, id);
        if (w && w.kind !== 'far' && w.kind !== 'mp') report.blocked.push(`${this.node(a.node).name} → ${this.node(id).name}: ${w.msg}`);
      }
    }
    return report;
  },
});
