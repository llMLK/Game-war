'use strict';
// مشهد الحملة: الخريطة المرسومة، الشريط العلوي الخفيف، الشريط السفلي للنوافذ، التنبيهات، وتسلسل الأدوار

class CampaignScene {
  constructor() {
    this.cam = new Camera(MW, MH);
    this.cam.cover = true;
    this.selArmy = null;
    this.selNode = null;
    this.busy = false;
    this.t = 0;
    this.fly = null;
    this.art = new MapArt(Game.sc, { colorOf: (o) => (Game.f(o) ? Game.f(o).color : NEUTRAL.color) });
  }

  get S() { return Game.S; }
  get P() { return Game.S.player; }

  enter() {
    App.ui.innerHTML = '';
    this.root = h('div', { class: 'camp-ui' });
    App.ui.appendChild(this.root);
    this.buildHud();
    Sheets.attach(this.root, this.entered);
    AlertsUI.attach(this.root, this);
    this.banner = h('div', { class: 'turn-banner', hidden: true });
    this.root.append(this.banner);
    this.fitCam(this.entered);
    this.entered = true;
    Game.scanAlerts();
    this.refresh();
    if (Game.S.turn === 0 && !this.introShown) { this.introShown = true; Panels.intro(this); }
  }
  exit() { Help.hide(); App.ui.innerHTML = ''; }
  onResize() { this.fitCam(true); }

  fitCam(keep) {
    const c = this.cam, ox = c.x, oy = c.y, oz = c.z;
    const cover = Math.max(App.W / MW, App.H / MH);
    c.minZ = cover;
    c.maxZ = Math.max(3.2, cover * 4);
    if (keep) { c.z = clamp(oz, c.minZ, c.maxZ); c.x = ox; c.y = oy; c.clamp(); return; }
    const cap = Game.nodesOf(this.P).find((n) => n.capital) || Game.nodesOf(this.P)[0];
    // عمودياً الخريطة تملأ الطول أصلاً، فنبدأ أبعد لنرى أكثر
    c.z = clamp(cover * (App.H > App.W ? 1.05 : 1.55), c.minZ, c.maxZ);
    if (cap) { c.x = cap.x; c.y = cap.y; }
    c.clamp();
  }

  // تحريك الكاميرا نحو نقطة، مع مراعاة النافذة الجانبية
  flyTo(x, y, zoom) {
    // أفقياً تفتح النافذة على الجانب فنزيح الهدف يساراً، وعمودياً تفتح من الأسفل فنرفع الهدف فوقها
    const portrait = App.H > App.W, cur = Sheets.current();
    const sw = cur && !portrait ? Math.min(356, Math.max(272, App.W * 0.37)) + 16 : 0;
    const sh = cur && portrait ? App.H * (cur.size === 'tall' ? 0.8 : cur.size === 'peek' ? 0.12 : 0.56) : 0;
    const z = zoom ? clamp(zoom, this.cam.minZ, this.cam.maxZ) : this.cam.z;
    this.fly = { x: x + sw / 2 / z, y: y + sh / 2 / z, z, t: 0 };
  }

  update(dt) {
    this.t += dt;
    // هامش النافذة المفتوحة: أسفل الشاشة عمودياً، ويمينها أفقياً
    const host = Sheets.host && !Sheets.host.hidden ? Sheets.host : null;
    const portrait = App.H > App.W;
    const pb = host && portrait ? host.offsetHeight : 0, pr = host && !portrait ? host.offsetWidth + 16 : 0;
    if (pb !== (this.cam.padBottom || 0) || pr !== (this.cam.padRight || 0)) { this.cam.padBottom = pb; this.cam.padRight = pr; if (!this.fly) this.cam.clamp(); }
    if (this.fly) {
      const c = this.cam, f = this.fly;
      f.t += dt;
      const k = Math.min(1, dt * 7);
      c.z += (f.z - c.z) * k;
      c.x += (f.x - c.x) * k; c.y += (f.y - c.y) * k;
      c.clamp();
      if (f.t > 1.2 || (Math.abs(f.x - c.x) < 0.5 && Math.abs(f.y - c.y) < 0.5 && Math.abs(f.z - c.z) < 0.01)) this.fly = null;
    }
  }

  // --- الرسم ---
  render(ctx) {
    const S = Game.S, d = App.dpr, cam = this.cam, art = this.art, t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b2217'; ctx.fillRect(0, 0, App.canvas.width, App.canvas.height);
    art.renderTerritory(S.nodes);
    cam.apply(ctx);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(art.bg, 0, 0, MW, MH);
    ctx.drawImage(art.terr, 0, 0, MW, MH);

    const reach = this.selArmy && this.selArmy.mp > 0 ? Game.reach(this.selArmy) : {};
    this.reach = reach;
    const onPath = new Set();
    for (const id in reach) { let prev = this.selArmy.node; for (const p of reach[id].path) { onPath.add(prev + '|' + p); onPath.add(p + '|' + prev); prev = p; } }
    // طريق القوافل تحت الطرق
    this.drawRoute(ctx);
    // الطرق
    ctx.lineCap = 'round';
    for (const e of Game.sc.edges) {
      const [a, b, kind = 'road', via] = e;
      const A = Game.node(a), B = Game.node(b);
      const hl = onPath.has(a + '|' + b);
      const paved = (A.roads || B.roads);
      ctx.setLineDash([]);
      if (kind === 'water') {
        const open = A.port || B.port;
        ctx.setLineDash([2, 4]); ctx.strokeStyle = hl ? 'rgba(190,235,255,.95)' : open ? 'rgba(30,70,100,.85)' : 'rgba(40,80,110,.45)'; ctx.lineWidth = hl ? 2.6 : open ? 1.8 : 1.2;
        // الطرق البحرية الطويلة تتبع البحر، فلا تبدو كأنها تصل مدناً على اليابسة
        if (via && via.length) { this.smoothPath(ctx, [[A.x, A.y], ...via, [B.x, B.y]]); ctx.stroke(); continue; }
      } else if (kind === 'pass') {
        ctx.strokeStyle = hl ? 'rgba(255,215,110,.95)' : 'rgba(95,55,30,.8)'; ctx.lineWidth = hl ? 3 : 2; ctx.setLineDash([6, 2.5, 1.5, 2.5]);
      } else if (paved) {
        ctx.strokeStyle = 'rgba(70,52,30,.55)'; ctx.lineWidth = hl ? 4.4 : 3.4;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        ctx.strokeStyle = hl ? 'rgba(255,215,110,.95)' : 'rgba(215,195,150,.95)'; ctx.lineWidth = hl ? 2.6 : 1.9;
      } else { ctx.setLineDash([3.5, 3]); ctx.strokeStyle = hl ? 'rgba(255,215,110,.95)' : 'rgba(95,65,35,.62)'; ctx.lineWidth = hl ? 2.8 : 1.5; }
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    ctx.setLineDash([]);

    const age = (s) => S.turn - s.turn;
    this.siegeInfo = {};
    for (const n of S.nodes) {
      const bs = Game.besiegers(n.id);
      if (bs.length) {
        const lead = bs[0];
        const from = Game.node(lead.siege.from) || Game.node(Game.adjAll(n.id)[0]);
        let angle = from ? Math.atan2(from.y - n.y, from.x - n.x) : Math.PI / 2;
        // المعسكر على الجانبين حتى لا يغطي اسم المدينة أو لوحة الحصار
        for (const avoid of [Math.PI / 2, -Math.PI / 2]) { const dd = angDiff(avoid, angle); if (Math.abs(dd) < 0.95) angle = avoid + (dd >= 0 ? 0.95 : -0.95); }
        this.siegeInfo[n.id] = {
          angle, color: Game.f(lead.fid).color, count: bs.length, turns: Game.siegeTurns(n, lead.fid), equip: Game.siegeEquip(n, lead.fid),
          catapult: bs.some((b) => b.regs.some((r) => r.type === 'catapult')), famine: n.stores < 0, t, fid: lead.fid,
        };
      }
    }
    // المستوطنات
    const order = [...S.nodes].sort((a, b) => a.y - b.y);
    for (const n of order) {
      const si = this.siegeInfo[n.id];
      art.drawNode(ctx, n, { color: Game.f(n.owner).color, siege: !!si, t, scars: Game.scarsAt(n.id), age });
      if (si) art.drawSiegeCamp(ctx, n, si);
      art.drawScars(ctx, n, Game.scarsAt(n.id, 4), t, age);
    }
    // آثار أحداث العالم (وباء، قحط، زحف على الأفق)
    const marks = Game.crisisMarkers ? Game.crisisMarkers() : [];
    this.drawCrisisWorld(ctx, marks);
    // الوجهات الممكنة
    for (const id in reach) {
      const n = Game.node(id), R = art.rad(n);
      const p = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.strokeStyle = `rgba(255,215,110,${0.55 + p * 0.45})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(n.x, n.y, R + 7 + p * 2, 0, TAU); ctx.stroke();
    }
    if (this.selNode && Sheets.current()) {
      const n = this.selNode, R = art.rad(n);
      ctx.strokeStyle = 'rgba(255,227,138,.9)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(n.x, n.y, R + 5, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }

    // --- بمقاس الشاشة ---
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this.hits = [];
    this.badges = {};
    for (const m of marks) if (m.node) (this.badges[m.node] = this.badges[m.node] || []).push(m);
    // مستوى التفصيل: من بعيد تظهر أسماء الممالك الكبيرة، وتُخفى أسماء المدن المتزاحمة (تبقى قابلة للمس)
    const far = cam.z < cam.minZ * 1.3;
    if (far) this.realmLabels(ctx, cam);
    const placed = [];
    const prio = (n) => (n.capital ? 1e6 : 0) + (n.owner === this.P ? 5e5 : 0) + (this.siegeInfo[n.id] ? 4e5 : 0) + n.pop;
    for (const n of [...S.nodes].sort((a, b) => prio(b) - prio(a))) {
      const s = cam.toScreen(n.x, n.y);
      const R = art.rad(n) * cam.z;
      this.hits.push({ kind: 'node', n, x: s.x, y: s.y, r: Math.max(20, R + 4) });
      const box = [s.x - 38, s.y + R + 1, s.x + 38, s.y + R + 18];
      const clash = far && placed.some((b) => b[0] < box[2] && box[0] < b[2] && b[1] < box[3] && box[1] < b[3]);
      if (!clash) { placed.push(box); this.namePlate(ctx, n, s.x, s.y + R + 9); }
      const si = this.siegeInfo[n.id];
      if (si) this.siegePlate(ctx, n, si, s.x, s.y - R - 22);
      if (reach[n.id] && this.selArmy) {
        const cost = reach[n.id].cost;
        const pl = Game.planMove(this.selArmy, n.id);
        const kind = pl.kind || pl.then;
        const ic = kind === 'siege' ? 'tent' : kind === 'assault' || kind === 'relief' ? 'swords' : kind === 'join' ? 'plus' : 'boot';
        const w = 34, y = s.y - R - (si ? 40 : 18);
        ctx.fillStyle = kind === 'move' || kind === 'join' ? 'rgba(20,14,8,.85)' : 'rgba(120,30,20,.9)';
        this.rrect(ctx, s.x - w / 2, y - 8, w, 16, 8); ctx.fill();
        drawIcon(ctx, ic, s.x - 8, y, 11, '#ffe38a');
        ctx.font = '700 11px sans-serif'; ctx.fillStyle = '#ffe38a'; ctx.direction = 'ltr'; ctx.fillText('−' + cost, s.x + 6, y + 0.5); ctx.direction = 'inherit';
      }
    }
    for (const n of S.nodes) this.drawArmiesAt(ctx, n);
    for (const m of marks) if (m.kind === 'threat') this.threatMarker(ctx, m);
    // مقاطع طريق القوافل قابلة للمس (أضعف أولوية من المدن والجيوش)
    const route = S.route;
    if (route) for (let i = 0; i < route.path.length - 1; i++) {
      const A = Game.node(route.path[i]), B = Game.node(route.path[i + 1]);
      if (!A || !B) continue;
      const p = cam.toScreen((A.x + B.x) / 2, (A.y + B.y) / 2);
      this.hits.push({ kind: 'route', x: p.x, y: p.y, r: 14 });
    }
  }

  // --- طريق القوافل: شريط ذهبي وقوافل تتحرك، وأحمر متقطع حيث انقطع ---
  drawRoute(ctx) {
    const r = Game.S.route;
    if (!r || r.path.length < 2) return;
    for (let i = 0; i < r.path.length - 1; i++) {
      const A = Game.node(r.path[i]), B = Game.node(r.path[i + 1]);
      if (!A || !B) continue;
      const val = r.dead ? 0 : Game.routeSegValue(A.id, B.id);
      const ok = val > 0;
      ctx.lineCap = 'round';
      ctx.setLineDash(val >= 1 ? [] : ok ? [9, 4] : [5, 6]);
      ctx.strokeStyle = ok ? 'rgba(214,168,62,.42)' : 'rgba(160,60,40,.38)';
      ctx.lineWidth = ok ? 6.5 : 4;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      ctx.setLineDash([]);
      if (!ok) continue;
      const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
      for (let k = 0; k < 2; k++) {
        const f = ((this.t * 9) / len + i * 0.37 + k * 0.5) % 1;
        drawIcon(ctx, 'camel', lerp(A.x, B.x, f), lerp(A.y, B.y, f) - 2.5, 7.5, '#5e3f18', { outline: 'rgba(255,240,205,.9)' });
      }
    }
  }

  // --- آثار الأزمات على الأرض ---
  drawCrisisWorld(ctx, marks) {
    for (const m of marks) {
      if (m.kind === 'threat') {
        const ang = Math.atan2(m.ty - m.y, m.tx - m.x);
        const p = 0.5 + 0.5 * Math.sin(this.t * 2.2);
        const g = ctx.createRadialGradient(m.x, m.y, 3, m.x, m.y, 44);
        g.addColorStop(0, `rgba(125,92,48,${0.5 + p * 0.12})`); g.addColorStop(1, 'rgba(125,92,48,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(m.x, m.y, 46, 28, ang, 0, TAU); ctx.fill();
        const L = Math.min(80, Math.hypot(m.tx - m.x, m.ty - m.y) * 0.55);
        const ex = m.x + Math.cos(ang) * L, ey = m.y + Math.sin(ang) * L;
        ctx.strokeStyle = m.sure ? 'rgba(150,40,25,.8)' : 'rgba(150,40,25,.45)'; ctx.lineWidth = 2.4; ctx.setLineDash(m.sure ? [] : [5, 4]);
        ctx.beginPath(); ctx.moveTo(m.x + Math.cos(ang) * 16, m.y + Math.sin(ang) * 16); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.moveTo(ex + Math.cos(ang) * 7, ey + Math.sin(ang) * 7); ctx.lineTo(ex + Math.cos(ang + 2.5) * 7, ey + Math.sin(ang + 2.5) * 7); ctx.lineTo(ex + Math.cos(ang - 2.5) * 7, ey + Math.sin(ang - 2.5) * 7); ctx.closePath(); ctx.fill();
        continue;
      }
      const n = m.node ? Game.node(m.node) : null;
      if (!n) continue;
      const R = this.art.rad(n);
      const col = m.kind === 'plague' ? '118,146,58' : m.kind === 'famine' ? '160,112,52' : m.kind === 'torch' ? '190,70,40' : null;
      if (!col) continue;
      const a = (m.kind === 'famine' && !m.on ? 0.16 : 0.42) * (0.85 + 0.15 * Math.sin(this.t * 2 + n.x));
      const g = ctx.createRadialGradient(n.x, n.y, R * 0.4, n.x, n.y, R + 17);
      g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, R + 17, 0, TAU); ctx.fill();
      if (m.quar) { ctx.strokeStyle = 'rgba(96,120,44,.8)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(n.x, n.y, R + 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    }
  }

  // علامة الزحف على الأفق (بمقاس الشاشة)
  threatMarker(ctx, m) {
    const s = this.cam.toScreen(m.x, m.y);
    const x = clamp(s.x, 40, App.W - 40), y = clamp(s.y, 60, App.H - 40);
    ctx.font = '700 11px "Noto Naskh Arabic", Tahoma, sans-serif';
    const w = ctx.measureText(m.label).width + 30, h2 = 20;
    ctx.fillStyle = 'rgba(60,24,14,.9)'; this.rrect(ctx, x - w / 2, y - h2 / 2, w, h2, 10); ctx.fill();
    ctx.strokeStyle = m.color || '#8a6a3c'; ctx.lineWidth = 1.6; this.rrect(ctx, x - w / 2, y - h2 / 2, w, h2, 10); ctx.stroke();
    drawIcon(ctx, m.icon || 'horse', x + w / 2 - 11, y, 12, '#ffd9a0');
    ctx.fillStyle = '#fff0d8'; ctx.fillText(m.label, x - 6, y + 0.5);
    this.hits.push({ kind: 'crisis', c: m.c, x, y, r: Math.max(16, w / 2) });
  }

  smoothPath(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const L = pts[pts.length - 1]; ctx.lineTo(L[0], L[1]);
  }

  rrect(ctx, x, y, w, h2, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h2 - r); ctx.quadraticCurveTo(x + w, y + h2, x + w - r, y + h2);
    ctx.lineTo(x + r, y + h2); ctx.quadraticCurveTo(x, y + h2, x, y + h2 - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  // أسماء الممالك فوق أراضيها حين تكون الخريطة بعيدة
  realmLabels(ctx, cam) {
    const k = clamp((cam.minZ * 1.3 - cam.z) / (cam.minZ * 0.3), 0, 1);
    if (k <= 0) return;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const fid of Game.aliveMajors()) {
      const ns = Game.nodesOf(fid);
      if (ns.length < 2) continue;
      const wsum = ns.reduce((t, n) => t + n.pop, 0);
      const cx = ns.reduce((t, n) => t + n.x * n.pop, 0) / wsum, cy = ns.reduce((t, n) => t + n.y * n.pop, 0) / wsum;
      const p = cam.toScreen(cx, cy);
      const size = clamp(14 + ns.length * 1.6, 16, 30);
      ctx.font = `700 ${size}px "Noto Naskh Arabic", Tahoma, sans-serif`;
      ctx.globalAlpha = 0.42 * k;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(245,235,210,.8)'; ctx.strokeText(Game.fname(fid), p.x, p.y - 30);
      ctx.fillStyle = isLight(Game.f(fid).color) ? '#5a4526' : Game.f(fid).color; ctx.fillText(Game.fname(fid), p.x, p.y - 30);
    }
    ctx.restore();
  }

  namePlate(ctx, n, x, y) {
    const cap = n.capital;
    ctx.font = `${cap ? '700 ' : '600 '}${cap ? 12.5 : 11.5}px "Noto Naskh Arabic", Tahoma, sans-serif`;
    const tw = ctx.measureText(n.name).width;
    const w = tw + 14 + (cap ? 12 : 0), h2 = 17;
    const own = n.owner === this.P;
    const besieged = !!this.siegeInfo[n.id];
    ctx.fillStyle = 'rgba(0,0,0,.25)'; this.rrect(ctx, x - w / 2 + 1, y - h2 / 2 + 1.5, w, h2, 5); ctx.fill();
    ctx.fillStyle = own ? 'rgba(248,238,210,.95)' : 'rgba(236,224,196,.9)'; this.rrect(ctx, x - w / 2, y - h2 / 2, w, h2, 5); ctx.fill();
    ctx.fillStyle = Game.f(n.owner).color; ctx.fillRect(x + w / 2 - 4, y - h2 / 2 + 2, 2.6, h2 - 4);
    ctx.strokeStyle = besieged ? '#c0392b' : own ? 'rgba(150,110,40,.9)' : 'rgba(90,70,40,.5)'; ctx.lineWidth = besieged ? 1.6 : 1;
    this.rrect(ctx, x - w / 2, y - h2 / 2, w, h2, 5); ctx.stroke();
    ctx.fillStyle = '#2a1e12';
    ctx.fillText(n.name, x + (cap ? 4 : -1), y + 0.5);
    if (cap) drawIcon(ctx, 'crown', x - w / 2 + 8, y, 9, '#b8862a');
    if (own && (n.loyalty < 30 || n.unrest > 0) && !besieged) drawIcon(ctx, n.loyalty < 30 ? 'torch' : 'fire', x + w / 2 + 8, y, 11, n.loyalty < 30 ? '#c0392b' : '#b8702a', { outline: 'rgba(250,240,220,.9)' });
    if (n.charter) drawIcon(ctx, 'scroll', x - w / 2 - 8, y, 10, '#7a5a22', { outline: 'rgba(250,240,220,.9)' });
    const bs = (this.badges || {})[n.id] || [];
    let bx = x - w / 2 - (n.charter ? 26 : 11);
    for (const m of bs.slice(0, 3)) {
      const col = m.kind === 'plague' ? '#5d7a22' : m.kind === 'famine' ? '#8a5a1e' : m.kind === 'torch' || m.kind === 'dagger' ? '#a0301e' : m.kind === 'crown' ? '#8a6a1e' : '#6a4a8a';
      ctx.fillStyle = 'rgba(250,240,220,.95)'; ctx.beginPath(); ctx.arc(bx, y, 8.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.stroke();
      drawIcon(ctx, m.icon, bx, y, 10, col);
      if (m.c.ask && m.c.ask[this.P]) { ctx.fillStyle = '#d23a22'; ctx.beginPath(); ctx.arc(bx + 6, y - 6, 3, 0, TAU); ctx.fill(); }
      this.hits.push({ kind: 'crisis', c: m.c, x: bx, y, r: 11 });
      bx -= 19;
    }
  }

  siegePlate(ctx, n, si, x, y) {
    const mine = si.fid === this.P, ownCity = n.owner === this.P;
    const max = Game.storesMax(n);
    const st = Math.max(0, n.stores);
    const txt = si.turns ? `حصار ${si.turns}` : 'بدأ الحصار';
    ctx.font = '700 11px "Noto Naskh Arabic", Tahoma, sans-serif';
    const w = ctx.measureText(txt).width + 56, h2 = 18;
    ctx.fillStyle = ownCity ? 'rgba(120,25,18,.92)' : mine ? 'rgba(30,22,14,.9)' : 'rgba(45,25,18,.9)';
    this.rrect(ctx, x - w / 2, y - h2 / 2, w, h2, 9); ctx.fill();
    ctx.strokeStyle = si.color; ctx.lineWidth = 1.5; this.rrect(ctx, x - w / 2, y - h2 / 2, w, h2, 9); ctx.stroke();
    drawIcon(ctx, 'tent', x + w / 2 - 10, y, 11, '#ffe0b0');
    ctx.fillStyle = '#fff2da'; ctx.fillText(txt, x + w / 2 - 20 - ctx.measureText(txt).width / 2, y + 0.5);
    // شريط المؤن المتبقية
    const bx = x - w / 2 + 7, bw = 24;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx, y - 2.5, bw, 5);
    ctx.fillStyle = st <= 1 ? '#e0553f' : '#e3b64a'; ctx.fillRect(bx, y - 2.5, bw * clamp(st / Math.max(1, max), 0, 1), 5);
    // سهم من المعسكر نحو المدينة
    this.hits.push({ kind: 'siege', n, x, y, r: 16 });
    if (Game.S.scars.some((s) => s.node === n.id && s.kind === 'reinforce' && Game.S.turn - s.turn <= 0)) {
      const p = 0.5 + 0.5 * Math.sin(this.t * 6);
      ctx.fillStyle = `rgba(120,200,120,${0.6 + p * 0.4})`;
      ctx.beginPath(); ctx.arc(x - w / 2 - 8, y, 7, 0, TAU); ctx.fill();
      drawIcon(ctx, 'plus', x - w / 2 - 8, y, 9, '#fff');
    }
  }

  // الجيوش: المقيمون فوق المدينة، والمحاصِرون عند معسكرهم
  drawArmiesAt(ctx, n) {
    const cam = this.cam, art = this.art;
    const s = cam.toScreen(n.x, n.y);
    const R = art.rad(n) * cam.z;
    const inside = Game.armiesAt(n.id).filter((a) => !a.siege);
    const outside = Game.armiesAt(n.id).filter((a) => a.siege);
    const row = (list, cx, cy, max) => {
      const own = list.filter((a) => a.fid === this.P).sort((a, b) => b.regs.length - a.regs.length);
      const other = list.filter((a) => a.fid !== this.P).sort((a, b) => b.regs.length - a.regs.length);
      let show = [...own, ...other];
      const sel = this.selArmy && show.includes(this.selArmy) ? this.selArmy : null;
      let extra = 0;
      if (show.length > max) {
        extra = show.length - max + 1;
        show = show.slice(0, max - 1);
        if (sel && !show.includes(sel)) show[show.length - 1] = sel;
      }
      const W = 30, gap = 3;
      const total = show.length * (W + gap) + (extra ? 22 : 0) - gap;
      let x = cx - total / 2 + W / 2;
      for (const a of show) {
        this.drawArmy(ctx, a, x, cy);
        this.hits.push({ kind: 'army', a, x, y: cy, r: 17 });
        x += W + gap;
      }
      if (extra) {
        ctx.fillStyle = 'rgba(20,14,8,.85)'; this.rrect(ctx, x - W / 2 + 1, cy - 9, 20, 16, 5); ctx.fill();
        ctx.fillStyle = '#ffe38a'; ctx.font = '700 11px sans-serif'; ctx.fillText('+' + extra, x - W / 2 + 11, cy - 1);
        this.hits.push({ kind: 'node', n, x: x - W / 2 + 11, y: cy, r: 14 });
      }
    };
    if (inside.length) row(inside, s.x, s.y - R - (this.siegeInfo[n.id] ? 44 : 20), 4);
    if (outside.length) {
      const si = this.siegeInfo[n.id];
      const d = (art.rad(n) + 22) * cam.z + 14;
      const cx = s.x + Math.cos(si.angle) * d, cy = s.y + Math.sin(si.angle) * d;
      row(outside, cx, cy, 3);
    }
  }

  drawArmy(ctx, a, x, y) {
    const f = Game.f(a.fid);
    const own = a.fid === this.P;
    const men = Game.armyMen(a);
    const sel = this.selArmy === a;
    const mpMax = Game.mpMax(a);
    const spent = own && a.mp <= 0;
    ctx.globalAlpha = spent ? 0.62 : 1;
    if (sel) {
      ctx.fillStyle = 'rgba(255,220,120,.28)';
      ctx.beginPath(); ctx.arc(x, y - 1, 19 + Math.sin(this.t * 6) * 1.5, 0, TAU); ctx.fill();
    }
    // السارية
    ctx.strokeStyle = '#1e160e'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - 13, y + 13); ctx.lineTo(x - 13, y - 12); ctx.stroke();
    ctx.fillStyle = '#d9b45a'; ctx.beginPath(); ctx.arc(x - 13, y - 13, 1.8, 0, TAU); ctx.fill();
    // الراية
    const w = 27;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.moveTo(x - 12, y - 9); ctx.lineTo(x - 12 + w, y - 9); ctx.lineTo(x - 12 + w - 4, y - 1); ctx.lineTo(x - 12 + w, y + 7); ctx.lineTo(x - 12, y + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.moveTo(x - 13, y - 11); ctx.lineTo(x - 13 + w, y - 11); ctx.lineTo(x - 13 + w - 4, y - 3); ctx.lineTo(x - 13 + w, y + 5); ctx.lineTo(x - 13, y + 5); ctx.closePath(); ctx.fill();
    ctx.lineWidth = sel ? 2.2 : own && a.mp > 0 ? 1.7 : 1.1;
    ctx.strokeStyle = sel ? '#ffe38a' : own && a.mp > 0 ? `rgba(255,225,130,${0.6 + 0.4 * Math.sin(this.t * 4)})` : '#1e160e';
    ctx.stroke();
    ctx.font = '700 10.5px "Noto Naskh Arabic", Tahoma, sans-serif';
    ctx.fillStyle = isLight(f.color) ? '#1e160e' : '#fff8e8';
    const vis = own || Game.intelLevel(this.P, a.fid) >= 2 ? String(men) : '~' + Math.round(men / 50) * 50;
    ctx.fillText(vis, x - 1, y - 3);
    if (own) {
      for (let i = 0; i < mpMax; i++) {
        ctx.fillStyle = i < a.mp ? '#ffe38a' : 'rgba(30,20,10,.65)';
        ctx.fillRect(x - 11 + i * 4.6, y + 8, 3.4, 3.4);
      }
    }
    if (a.mood && (a.mood.k === 'shaken' || a.mood.k === 'hungry')) drawIcon(ctx, a.mood.k === 'hungry' ? 'food' : 'warning', x + 13, y - 12, 9, '#ffb49c', { outline: '#2a1208' });
    else if (a.sick > 0) drawIcon(ctx, 'skull', x + 13, y - 12, 9, '#c8e08a', { outline: '#1e2a08' });
    if (Game.isRuler && Game.isRuler(Game.armyGen(a))) drawIcon(ctx, 'crown', x - 13, y - 17, 8, '#ffd24a', { outline: '#2a1a08' });
    ctx.globalAlpha = 1;
  }

  // --- اللمس ---
  onTap(w, p) {
    if (this.busy) return;
    Help.hide();
    const score = (h2) => h2.d - (h2.kind === 'army' ? 8 : h2.kind === 'siege' ? 4 : h2.kind === 'crisis' ? 3 : h2.kind === 'route' ? -10 : 0);
    const hits = (this.hits || []).map((h2) => ({ ...h2, d: Math.hypot(h2.x - p.x, h2.y - p.y) })).filter((h2) => h2.d < h2.r && !(this.selArmy && (h2.kind === 'crisis' || h2.kind === 'route'))).sort((a, b) => score(a) - score(b));
    const hit = hits[0];
    if (hit && hit.kind === 'crisis') { Panels.openCrisis(this, hit.c); return; }
    if (hit && hit.kind === 'route') { this.openRoute(); return; }
    // وضع اختيار الوجهة
    if (this.selArmy && hit) {
      const n = hit.kind === 'army' ? Game.node(hit.a.node) : hit.n;
      const isOwnHere = hit.kind === 'army' && hit.a.fid === this.P;
      if (n.id !== this.selArmy.node && !isOwnHere && this.reach && this.reach[n.id]) { this.tryMove(this.selArmy, n); return; }
      // وجهة غير ممكنة: السبب المحدد أولاً، واللمسة الثانية تفتح المدينة
      if (n.id !== this.selArmy.node && !isOwnHere && hit.kind !== 'siege' && this.lastBlocked !== n.id) {
        this.lastBlocked = n.id;
        UI.toast(Game.moveBlocker(this.selArmy, n.id), 4500);
        return;
      }
    }
    this.lastBlocked = null;
    if (!hit) {
      if (this.selArmy) { this.cancelMove(); return; }
      if (!Sheets.dismissCurrent()) this.selNode = null;
      return;
    }
    if (hit.kind === 'army' && hit.a.fid === this.P) {
      const a = hit.a;
      if (this.selArmy === a) { this.openArmy(a); return; }
      if (a.mp > 0 && a.regs.length) this.startMove(a);
      else this.openArmy(a);
      return;
    }
    if (this.selArmy) this.cancelMove(true);
    if (hit.kind === 'siege') { this.openSiege(hit.n); return; }
    const n = hit.kind === 'army' ? Game.node(hit.a.node) : hit.n;
    if (hit.kind === 'army' && hit.a.siege && Game.besiegers(n.id).length) { this.openSiege(n); return; }
    this.openCity(n);
  }

  // --- النوافذ ---
  openCity(n) { this.selNode = n; Sheets.open(Panels.citySpec(this, n)); this.keepVisible(n); this.refresh(); }
  openArmy(a) { this.selNode = Game.node(a.node); Sheets.open(Panels.armySpec(this, a)); this.keepVisible(this.selNode); this.refresh(); }
  openSiege(n) { this.selNode = n; Sheets.open(Panels.siegeSpec(this, n)); this.keepVisible(n); this.refresh(); }
  // المدينة المختارة لا تختفي خلف النافذة: عمودياً فوقها، وأفقياً إلى يسارها
  keepVisible(n) {
    if (!n || this.fly) return;
    const s = this.cam.toScreen(n.x, n.y), cur = Sheets.current();
    if (!cur) return;
    const portrait = App.H > App.W;
    // الهامش يُحدَّث فوراً ليسمح بالتحريك قبل الإطار التالي
    if (portrait) this.cam.padBottom = App.H * (cur.size === 'tall' ? 0.8 : 0.56); else this.cam.padRight = Math.min(356, Math.max(272, App.W * 0.37)) + 16;
    const hidden = portrait ? s.y > App.H * 0.4 : s.x > App.W - Math.min(356, Math.max(272, App.W * 0.37)) - 30;
    if (hidden) this.flyTo(n.x, n.y);
  }
  openDiplo(focus) { Sheets.open(Panels.diploSpec(this, focus)); this.refresh(); }
  openKingdom(tab) { Sheets.open(Panels.kingdomSpec(this, tab)); this.refresh(); }
  openChron(tab) { Sheets.open(Panels.chronSpec(this, tab)); this.refresh(); }
  openRoute() { Sheets.open(Panels.routeSpec(this)); this.refresh(); }

  // --- الحركة ---
  // اختيار جيش: بطاقة نشطة في الشريط السفلي والخريطة كاملة للاختيار
  startMove(a) {
    this.selArmy = a;
    this.selNode = Game.node(a.node);
    const key = 'army:' + a.id;
    const had = Sheets.get(key);
    const cur = Sheets.current();
    if (cur && cur.key !== key && !cur.pinned) Sheets.close(cur.key);
    if (!had) { const w = Sheets.open(Panels.armySpec(this, a)); w.auto = true; }
    Sheets.minimize(key);
    const w = Sheets.get(key);
    if (w && !had) w.auto = true;
    this.refresh();
    if (!this.moveHint) { this.moveHint = true; UI.toast('اختر مدينة مضيئة، الرقم فوقها كلفة الحركة'); }
  }
  cancelMove(silent) {
    const a = this.selArmy;
    this.selArmy = null;
    if (a) {
      const w = Sheets.get('army:' + a.id);
      if (w && w.auto && w.state === 'min') Sheets.close(w.key);
    }
    if (!silent) this.refresh();
  }

  async tryMove(a, n) {
    let plan = Game.planMove(a, n.id);
    if (plan.err) { UI.toast(plan.err); return; }
    let declare = false;
    if (plan.needWar) {
      const ok = await Panels.confirmWarAttack(plan.needWar);
      if (!ok) return;
      declare = true;
    }
    const kind = plan.kind || plan.then;
    if (kind === 'siege') {
      const choice = await Panels.siegeChoice(this, a, n);
      if (choice === 'cancel') return;
      this.busy = true;
      try {
        const r = await Game.executeMove(a, n.id, { declare });
        if (r.err) UI.toast(r.err);
        else if (choice === 'assault') await Game.resolveEnc(Game.makeEnc('assault', Game.besiegers(n.id).filter((b) => b.fid === this.P), n.id));
      } finally { this.busy = false; }
      this.cancelMove(true);
      this.afterAction(n, choice === 'assault' ? null : 'siege');
      return;
    }
    this.busy = true;
    let r;
    try { r = await Game.executeMove(a, n.id, { declare }); } finally { this.busy = false; }
    if (r.err) { UI.toast(r.err); return; }
    if (r.cancel) { this.refresh(); return; }
    const alive = Game.S.armies.includes(a);
    if (!alive || a.mp <= 0 || a.siege || kind !== 'move') this.cancelMove(true);
    this.afterAction(Game.node(alive ? a.node : n.id), kind === 'join' ? 'siege' : null);
  }

  async runEnc(enc) {
    this.busy = true;
    try { await Game.resolveEnc(enc); } finally { this.busy = false; }
  }

  // بعد كل إجراء: تحقق، حفظ، تحديث
  afterAction(focus, win) {
    Game.validate();
    if (Game.track) Game.track('action');
    Game.save();
    if (Game.S.over) { Panels.showEnd(this); return; }
    if (this.selArmy && !Game.S.armies.includes(this.selArmy)) this.selArmy = null;
    if (focus) {
      this.selNode = focus;
      // لا تترك موضع الحدث خارج الشاشة
      const sp = this.cam.toScreen(focus.x, focus.y);
      if (sp.x < 60 || sp.y < 70 || sp.x > App.W - 60 || sp.y > App.H - 70) this.flyTo(focus.x, focus.y);
    }
    if (win === 'siege' && focus && Game.besiegers(focus.id).length && !this.selArmy) Sheets.open(Panels.siegeSpec(this, focus));
    this.refresh();
    Panels.captivePrompts(this);
  }

  // --- الواجهة العلوية ---
  buildHud() {
    this.hud = {};
    const pill = (cls, key, extra) => h('button', { class: 'hud-pill ' + cls, onclick: (e) => this.hudHelp(e.currentTarget, key, extra) });
    this.hud.fac = h('button', { class: 'hud-pill fac', onclick: () => this.openKingdom() });
    this.hud.gold = pill('gold', 'gold');
    this.hud.food = pill('food', 'food');
    this.hud.date = pill('date', 'date');
    this.hud.chap = h('button', { class: 'hud-pill chap', hidden: true, onclick: () => this.openKingdom('goals') });
    this.root.appendChild(h('div', { class: 'hud-res' }, this.hud.fac, this.hud.gold, this.hud.food, this.hud.date, this.hud.chap));
    this.hud.diplo = ib('treaty', null, { class: 'icon-btn', title: 'الممالك والدبلوماسية', onclick: () => this.openDiplo() });
    this.hud.king = ib('crown', null, { class: 'icon-btn', title: 'المملكة والقادة', onclick: () => this.openKingdom() });
    this.hud.chron = ib('book', null, { class: 'icon-btn', title: 'السجل التاريخي', onclick: () => this.openChron() });
    this.root.appendChild(h('div', { class: 'hud-btns' },
      this.hud.diplo, this.hud.king, this.hud.chron,
      ib('menu', null, { class: 'icon-btn', title: 'القائمة', onclick: () => Panels.menu(this) }),
    ));
    this.hud.end = h('button', { class: 'btn primary end-turn', onclick: () => this.endTurn() });
    this.root.appendChild(this.hud.end);
  }

  hudHelp(el, key) {
    const P = this.P, e = Game.economy(P), f = Game.f(P);
    if (key === 'gold') {
      Help.show(el, 'gold', { title: 'الخزينة', value: `${f.gold} الآن`, lines: Game.treasuryLines(P) });
    } else if (key === 'food') {
      Help.show(el, 'food', { value: `${f.food} الآن`, lines: [['إنتاج المدن', '+' + e.food, 'pos'], ['أكل الجيوش', '−' + e.eat, 'neg'], ['الصافي كل دور', signed(e.netFood), 'sum'], ['المخزون بعد نهاية الدور', Math.min(400, Math.max(0, f.food + e.netFood)), ''], ['الحد الأقصى للمخزون', 400, '']] });
    } else if (key === 'date') {
      Help.show(el, null, { title: `الدور ${Game.S.turn + 1}`, value: `${Game.season()} ${Game.year()}م`, note: Game.isWinter() ? 'الشتاء: الممرات والجبال أصعب، والإمداد أقل، والجيوش تأكل أكثر.' : Game.S.turn % 4 === 2 ? 'الشتاء قادم في الدور التالي: الممرات ستغلق تقريباً.' : 'كل دور فصل من السنة.' });
    }
  }

  refresh() {
    if (!this.hud) return;
    const P = this.P, f = Game.f(P), e = Game.economy(P);
    this.hud.fac.innerHTML = '';
    this.hud.fac.append(h('i', { style: { background: f.color } }), f.name);
    const res = (el, ic, v, net) => { el.innerHTML = ''; el.append(icon(ic), h('bdi', null, v), h('small', { class: net < 0 ? 'neg' : '' }, h('bdi', null, signed(net)), h('span', { class: 'per' }, '/دور'))); };
    res(this.hud.gold, 'gold', f.gold, e.netGold);
    res(this.hud.food, 'food', f.food, e.netFood);
    this.hud.date.innerHTML = '';
    this.hud.date.append(h('b', { class: 'turn-no' }, 'الدور ', h('bdi', null, Game.S.turn + 1)), icon(Game.isWinter() ? 'snow' : 'sun'), h('span', { class: 'season' }, Game.season() + ' '), h('bdi', null, Game.year() + 'م'));
    if (Game.chapter) {
      const ch = Game.chapter();
      this.hud.chap.hidden = !ch;
      if (ch) { this.hud.chap.innerHTML = ''; this.hud.chap.append(icon('book'), ch.short); }
    }
    const idle = Game.armiesOf(P).filter((a) => a.mp >= Game.mpMax(a) && a.regs.length && !a.siege).length;
    this.hud.end.innerHTML = '';
    this.hud.end.appendChild(h('span', null, 'إنهاء الدور'));
    if (idle) this.hud.end.appendChild(h('small', null, `${idle} ${idle === 1 ? 'جيش ينتظر' : 'جيوش تنتظر'}`));
    const pend = Game.captivesHeldBy(P).length;
    this.setBadge(this.hud.king, pend);
    const call = f.allyCall ? 1 : 0;
    this.setBadge(this.hud.diplo, call);
    this.setBadge(this.hud.chron, (Game.S.crises || []).filter((c) => !c.over && c.ask[P]).length);
    Sheets.refresh();
    AlertsUI.render();
  }
  setBadge(btn, n) {
    let b = btn.querySelector('.badge');
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = h('span', { class: 'badge' }); btn.appendChild(b); }
    b.textContent = n;
  }

  // الانتقال إلى حدث التنبيه
  focusAlert(a) {
    const n = a.node ? Game.node(a.node) : null;
    if (a.win === 'diplo') { this.openDiplo(); return; }
    if (a.win === 'captives') { this.openKingdom('capt'); return; }
    if (a.win === 'route') { this.openRoute(); return; }
    if (a.win === 'recruit') { Panels.recruitOffer(this); return; }
    if (a.win === 'kingdom') { this.openKingdom('gens'); return; }
    if (a.win === 'crisis' && Game.openCrisis) { Game.openCrisis(this, a); return; }
    if (!n) return;
    if (a.win === 'siege' && Game.besiegers(n.id).length) this.openSiege(n);
    else this.openCity(n);
    this.flyTo(n.x, n.y, Math.max(this.cam.z, this.cam.minZ * 1.6));
  }

  // --- نهاية الدور ---
  async endTurn() {
    if (this.busy || Game.S.over) return;
    this.busy = true;
    this.cancelMove(true);
    const cur = Sheets.current();
    if (cur) { if (cur.pinned) Sheets.minimize(cur.key); else Sheets.close(cur.key); }
    Help.hide();
    if (Game.track) Game.track('endTurn');
    try {
      for (const fid of Game.majors()) {
        if (fid === this.P || !Game.f(fid).alive) continue;
        this.banner.hidden = false;
        this.banner.textContent = `دور ${Game.fname(fid)}…`;
        await wait(160);
        await CampaignAI.turn(fid);
        this.refresh();
        if (Game.S.over) break;
      }
      this.banner.hidden = true;
      if (!Game.S.over) {
        Game.endRound();
        if (Game.worldTick) await Game.worldTick();
        Game.scanAlerts();
      }
      Game.save();
      this.refresh();
      if (Game.S.over) { Panels.showEnd(this); return; }
      this.banner.hidden = false;
      this.banner.textContent = `${Game.season()} ${Game.year()}م`;
      setTimeout(() => { if (!this.busy) this.banner.hidden = true; }, 1500);
      if (Game.pendingDecisions) await Game.pendingDecisions(this);
      Panels.captivePrompts(this);
    } finally {
      this.busy = false;
      setTimeout(() => { this.banner.hidden = true; }, 1500);
    }
  }
}

// --- خطافات الحملة التي تحتاج اللاعب ---
function installHooks(scene) {
  Game.hooks.notify = (msg) => { Game.alert('info', msg); AlertsUI.render(); };
  Game.hooks.proposal = (p) => Panels.proposal(p);
  Game.hooks.occupation = (node, how, fate) => Panels.occupation(node, how, fate);
  Game.hooks.encounter = (enc) => Panels.encounter(scene, enc);
}

function launchBattle(enc, resolve) {
  const cfg = Game.simConfig(enc);
  const camp = App.scene;
  App.setScene(new BattleScene(cfg, (res) => {
    App.setScene(camp);
    if (res === 'cancel' || !res || res.winner == null) { resolve('cancel'); return; }
    resolve(Game.applySim(enc, res));
  }));
}
