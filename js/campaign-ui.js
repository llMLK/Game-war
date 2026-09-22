'use strict';
// واجهة الحملة: الخريطة، اللوحات، النوافذ، وتسلسل الأدوار

// ——— نوافذ وإشعارات مشتركة ———
const UI = {
  modal({ title, body, buttons = [], cls = '', dismissable = false }) {
    const layer = h('div', { class: 'modal-layer' });
    const close = () => layer.remove();
    const box = h('div', { class: 'modal ' + cls },
      title ? h('h2', null, title) : null,
      h('div', { class: 'modal-body' }, body),
      buttons.length ? h('div', { class: 'modal-btns' }, buttons.map((b) => h('button', {
        class: 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : ''),
        disabled: b.disabled,
        onclick: () => { if (b.keep) { b.onClick && b.onClick(close); return; } close(); b.onClick && b.onClick(); },
      }, b.label))) : null,
    );
    layer.appendChild(box);
    if (dismissable) layer.addEventListener('click', (e) => { if (e.target === layer) close(); });
    document.body.appendChild(layer);
    return close;
  },
  ask(opts) {
    return new Promise((res) => {
      UI.modal({ ...opts, buttons: opts.buttons.map((b) => ({ ...b, onClick: () => res(b.value) })) });
    });
  },
  toast(msg, ms = 2600) {
    let t = document.getElementById('toast');
    if (!t) { t = h('div', { id: 'toast', class: 'toast global' }); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(this.tt);
    this.tt = setTimeout(() => { t.hidden = true; }, ms);
  },
};

function pip(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function hashStr(s) { let h2 = 2166136261; for (let i = 0; i < s.length; i++) { h2 ^= s.charCodeAt(i); h2 = Math.imul(h2, 16777619); } return h2 >>> 0; }

const MW = 1000, MH = 700;

class CampaignScene {
  constructor() {
    this.cam = new Camera(MW, MH);
    this.selNode = null; this.selArmy = null;
    this.busy = false;
    this.terrSig = '';
    this.t = 0;
  }

  get S() { return Game.S; }
  get P() { return Game.S.player; }

  enter() {
    App.ui.innerHTML = '';
    this.root = h('div', { class: 'camp-ui' });
    App.ui.appendChild(this.root);
    this.buildHud();
    this.sheet = h('div', { class: 'sheet', hidden: true });
    this.root.appendChild(this.sheet);
    this.banner = h('div', { class: 'turn-banner', hidden: true });
    this.root.appendChild(this.banner);
    this.cam.padTop = 50; this.cam.padBottom = 0;
    if (!this.bg) this.renderBg();
    this.fitCam(this.entered);
    this.entered = true;
    this.refresh();
    if (Game.S.turn === 0 && !this.introShown) { this.introShown = true; this.showIntro(); }
  }
  exit() { App.ui.innerHTML = ''; }
  onResize() { this.fitCam(true); }

  fitCam(keep) {
    const c = this.cam, ox = c.x, oy = c.y, oz = c.z;
    c.fit(1);
    const cover = Math.max(App.W / MW, (App.H - c.padTop) / MH);
    c.minZ = cover * 0.85;
    c.maxZ = Math.max(3, cover * 4);
    if (keep) { c.z = clamp(oz, c.minZ, c.maxZ); c.x = ox; c.y = oy; c.clamp(); return; }
    const cap = Game.nodesOf(this.P).find((n) => n.capital) || Game.nodesOf(this.P)[0];
    c.z = clamp(cover * 1.35, c.minZ, c.maxZ);
    if (cap) { c.x = cap.x; c.y = cap.y; }
    c.clamp();
  }

  // ——— الرسم المسبق للخريطة ———
  renderBg() {
    const sc = Game.sc, K = 2;
    const cv = document.createElement('canvas');
    cv.width = MW * K; cv.height = MH * K;
    const g = cv.getContext('2d');
    g.scale(K, K);
    g.fillStyle = sc.ground; g.fillRect(0, 0, MW, MH);
    const r = rng(hashStr(sc.id));
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(90,70,40,.07)' : 'rgba(255,250,230,.08)';
      g.fillRect(r() * MW, r() * MH, 1 + r() * 2.5, 1 + r() * 2.5);
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * MW, y = r() * MH, rr = 30 + r() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, r() < 0.5 ? 'rgba(120,140,70,.12)' : 'rgba(140,100,60,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    for (const poly of sc.seas) {
      g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      g.fillStyle = '#6d8d96'; g.fill();
      g.strokeStyle = 'rgba(40,55,60,.6)'; g.lineWidth = 2; g.stroke();
      g.save(); g.clip();
      g.strokeStyle = 'rgba(230,240,235,.18)'; g.lineWidth = 1;
      for (let i = 0; i < 160; i++) {
        const x = r() * MW, y = r() * MH;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y - 3, x + 10, y); g.stroke();
      }
      g.restore();
    }
    for (const rv of sc.rivers) {
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = 'rgba(50,70,80,.5)'; g.lineWidth = 6;
      g.beginPath(); rv.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.strokeStyle = '#7a9aa3'; g.lineWidth = 3.5; g.stroke();
    }
    for (const [mx, my] of sc.mountains) {
      for (let k = 0; k < 4; k++) {
        const x = mx + (r() - 0.5) * 50, y = my + (r() - 0.5) * 30, s = 10 + r() * 9;
        g.fillStyle = 'rgba(95,80,60,.85)';
        g.beginPath(); g.moveTo(x - s, y + s * 0.6); g.lineTo(x, y - s); g.lineTo(x + s, y + s * 0.6); g.closePath(); g.fill();
        g.fillStyle = 'rgba(170,150,120,.9)';
        g.beginPath(); g.moveTo(x - s, y + s * 0.6); g.lineTo(x, y - s); g.lineTo(x - s * 0.1, y + s * 0.6); g.closePath(); g.fill();
        g.fillStyle = 'rgba(245,240,230,.8)';
        g.beginPath(); g.moveTo(x - s * 0.28, y - s * 0.45); g.lineTo(x, y - s); g.lineTo(x + s * 0.28, y - s * 0.45); g.closePath(); g.fill();
      }
    }
    const vg = g.createRadialGradient(MW / 2, MH / 2, MH * 0.35, MW / 2, MH / 2, MW * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,25,10,.35)');
    g.fillStyle = vg; g.fillRect(0, 0, MW, MH);
    g.strokeStyle = 'rgba(60,40,20,.8)'; g.lineWidth = 4; g.strokeRect(2, 2, MW - 4, MH - 4);
    this.bg = cv;
    this.terr = document.createElement('canvas');
    this.terr.width = MW / 10; this.terr.height = MH / 10;
  }

  renderTerritory() {
    const sig = Game.S.nodes.map((n) => n.owner).join(',');
    if (sig === this.terrSig) return;
    this.terrSig = sig;
    const g = this.terr.getContext('2d');
    const W = this.terr.width, H = this.terr.height;
    const img = g.createImageData(W, H);
    const seas = Game.sc.seas;
    const cols = {};
    for (const id in Game.S.factions) cols[id] = hexRgb(Game.S.factions[id].color);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wx = x * 10 + 5, wy = y * 10 + 5;
      const i = (y * W + x) * 4;
      if (seas.some((p) => pip(p, wx, wy))) { img.data[i + 3] = 0; continue; }
      let best = null, bd = 1e9;
      for (const n of Game.S.nodes) { const d = (n.x - wx) ** 2 + (n.y - wy) ** 2; if (d < bd) { bd = d; best = n; } }
      if (!best || bd > 150 * 150) { img.data[i + 3] = 0; continue; }
      const c = cols[best.owner] || [128, 128, 128];
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2];
      img.data[i + 3] = 70 - Math.sqrt(bd) * 0.2;
    }
    g.putImageData(img, 0, 0);
  }

  update(dt) { this.t += dt; }

  render(ctx) {
    const S = Game.S, d = App.dpr, cam = this.cam;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#17120d'; ctx.fillRect(0, 0, App.canvas.width, App.canvas.height);
    this.renderTerritory();
    cam.apply(ctx);
    ctx.drawImage(this.bg, 0, 0, MW, MH);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.terr, 0, 0, MW, MH);

    const targets = this.selArmy ? Game.moveTargets(this.selArmy) : [];
    // الطرق
    ctx.lineCap = 'round';
    for (const [a, b] of Game.sc.edges) {
      const A = Game.node(a), B = Game.node(b);
      const hl = this.selArmy && ((this.selArmy.node === a && targets.includes(b)) || (this.selArmy.node === b && targets.includes(a)));
      ctx.setLineDash(hl ? [] : [4, 4]);
      ctx.strokeStyle = hl ? 'rgba(255,215,110,.95)' : 'rgba(80,55,30,.55)';
      ctx.lineWidth = hl ? 3 : 1.6;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const n of S.nodes) {
      const f = Game.f(n.owner);
      const rad = n.capital ? 11 : 8.5;
      const isTarget = targets.includes(n.id);
      if (isTarget) {
        const p = 0.5 + 0.5 * Math.sin(this.t * 5);
        ctx.strokeStyle = `rgba(255,215,110,${0.5 + p * 0.5})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(n.x, n.y, rad + 9 + p * 3, 0, TAU); ctx.stroke();
      }
      if (this.selNode === n) {
        ctx.strokeStyle = '#ffe38a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, rad + 6, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(n.x + 2, n.y + 2, rad + 2, 0, TAU); ctx.fill();
      if (n.walls > 0) {
        ctx.fillStyle = '#8b8172'; ctx.strokeStyle = '#3e3326'; ctx.lineWidth = 1;
        const wr = rad + 2 + n.walls * 1.4;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + Math.PI / 8; ctx.lineTo(n.x + Math.cos(a) * wr, n.y + Math.sin(a) * wr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = f.color; ctx.strokeStyle = '#1e160e'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, TAU); ctx.fill(); ctx.stroke();
      if (n.capital) {
        ctx.fillStyle = '#f4d77a'; ctx.strokeStyle = '#3e2c10'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? 2.4 : 5.5; ctx.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (Game.besieger(n.id)) {
        const p = 0.5 + 0.5 * Math.sin(this.t * 8);
        ctx.strokeStyle = `rgba(220,70,40,${0.5 + p * 0.4})`; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(n.x, n.y, rad + 13, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // الأسماء والرايات بمقاس الشاشة
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this.hits = [];
    for (const n of S.nodes) {
      const s = cam.toScreen(n.x, n.y);
      this.hits.push({ kind: 'node', n, x: s.x, y: s.y, r: 24 });
      ctx.font = `${n.capital ? '700 ' : '600 '}${n.capital ? 13 : 12}px "Noto Naskh Arabic", Tahoma, sans-serif`;
      const ly = s.y + (n.capital ? 11 : 8.5) * cam.z + 14;
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(245,235,210,.9)';
      ctx.strokeText(n.name, s.x, ly);
      ctx.fillStyle = '#2a1e12'; ctx.fillText(n.name, s.x, ly);
    }
    for (const a of S.armies) {
      const n = Game.node(a.node);
      const s = cam.toScreen(n.x, n.y);
      let x = s.x, y = s.y - 30;
      if (a.siege) { x = s.x + 30; y = s.y - 16; }
      this.drawArmy(ctx, a, x, y);
      this.hits.push({ kind: 'army', a, x, y, r: 22 });
    }
  }

  drawArmy(ctx, a, x, y) {
    const f = Game.f(a.fid);
    const own = a.fid === this.P;
    const men = Game.menOf(a.regs);
    const sel = this.selArmy === a;
    ctx.globalAlpha = own && a.moved ? 0.65 : 1;
    ctx.strokeStyle = '#2a1e12'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 14, y + 16); ctx.lineTo(x - 14, y - 12); ctx.stroke();
    const w = 34, hh = 20;
    ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.moveTo(x - 14, y - 12); ctx.lineTo(x - 14 + w, y - 12); ctx.lineTo(x - 14 + w - 5, y - 2); ctx.lineTo(x - 14 + w, y + 8); ctx.lineTo(x - 14, y + 8); ctx.closePath();
    ctx.fill();
    ctx.lineWidth = sel ? 2.5 : own && !a.moved ? 2 : 1.2;
    ctx.strokeStyle = sel ? '#ffe38a' : own && !a.moved ? `rgba(255,225,130,${0.6 + 0.4 * Math.sin(this.t * 4)})` : '#1e160e';
    ctx.stroke();
    ctx.font = '700 11px "Noto Naskh Arabic", Tahoma, sans-serif';
    const light = isLight(f.color);
    ctx.fillStyle = light ? '#1e160e' : '#fff8e8';
    ctx.fillText(String(men), x + 1, y - 1);
    if (a.siege) { ctx.font = '12px sans-serif'; ctx.fillText('⚔️', x + 24, y - 16); }
    ctx.globalAlpha = 1;
  }

  // ——— اللمس ———
  onTap(w, p) {
    if (this.busy) return;
    const hits = (this.hits || []).map((h2) => ({ ...h2, d: Math.hypot(h2.x - p.x, h2.y - p.y) })).filter((h2) => h2.d < h2.r).sort((a, b) => (a.kind === 'army' ? -8 : 0) + a.d - ((b.kind === 'army' ? -8 : 0) + b.d));
    const hit = hits[0];
    if (this.selArmy && hit) {
      const n = hit.kind === 'node' ? hit.n : Game.node(hit.a.node);
      if (Game.moveTargets(this.selArmy).includes(n.id) && !(hit.kind === 'army' && hit.a.fid === this.P && hit.a.node === this.selArmy.node)) {
        this.tryMove(this.selArmy, n);
        return;
      }
    }
    if (!hit) {
      if (this.selArmy) { this.selArmy = null; this.refresh(); return; }
      this.closeSheet();
      return;
    }
    if (hit.kind === 'army' && hit.a.fid === this.P) {
      if (this.selArmy === hit.a) this.selArmy = null;
      else { this.selArmy = hit.a; if (hit.a.moved) UI.toast('تحرّك هذا الجيش في هذا الدور'); }
      this.selNode = Game.node(hit.a.node);
      this.openNode(this.selNode);
      return;
    }
    const n = hit.kind === 'node' ? hit.n : Game.node(hit.a.node);
    this.selArmy = null;
    this.selNode = n;
    this.openNode(n);
  }

  async tryMove(a, n) {
    const plan = Game.planMove(a, n);
    if (plan.err) { UI.toast(plan.err); return; }
    if (plan.siege) {
      const choice = await UI.ask({
        title: `أسوار ${n.name}`,
        body: h('div', null,
          h('p', null, `مدينة ${Game.fname(n.owner)} محصّنة بأسوار (مستوى ${n.walls}).`),
          h('p', { class: 'hint' }, 'الحصار يمنحك كبشاً وسلالم من الدور القادم ويجوّع المدينة. الاقتحام الفوري بلا معدات صعب إلا بالمنجنيق.'),
          this.powerCompare(Game.makeEnc('assault', a, n)),
        ),
        buttons: [
          { label: 'ضرب الحصار', value: 'siege', primary: true },
          { label: a.regs.some((r) => r.type === 'catapult') ? 'اقتحام فوري بالمنجنيق' : 'اقتحام فوري (يحتاج منجنيق)', value: 'assault', disabled: !a.regs.some((r) => r.type === 'catapult') },
          { label: 'إلغاء', value: 'cancel' },
        ],
      });
      if (choice === 'cancel') return;
      Game.startSiege(a, n);
      if (choice === 'assault') await this.runEnc(Game.makeEnc('assault', a, n));
      this.afterAction();
      return;
    }
    if (plan.simple) {
      Game.executeMove(a, n);
      this.selArmy = null;
      this.selNode = n;
      this.afterAction();
      return;
    }
    await this.runEnc(plan.enc);
    this.afterAction();
  }

  async runEnc(enc) {
    this.busy = true;
    try { await Game.resolveEnc(enc); } finally { this.busy = false; }
  }

  afterAction() {
    this.selArmy = null;
    Game.save();
    if (Game.S.over) { this.showEnd(); return; }
    this.refresh();
    if (this.selNode) this.openNode(this.selNode);
  }

  // ——— الواجهة العلوية ———
  buildHud() {
    this.hud = {};
    this.hud.fac = h('span', { class: 'fac' });
    this.hud.gold = h('span', { class: 'res', dir: 'ltr' });
    this.hud.food = h('span', { class: 'res', dir: 'ltr' });
    this.hud.date = h('span', { class: 'date' });
    const top = h('div', { class: 'c-top' },
      h('div', { class: 'c-stats' }, this.hud.fac, this.hud.gold, this.hud.food, this.hud.date),
      h('div', { class: 'c-btns' },
        h('button', { class: 'icon-btn', title: 'الدبلوماسية', onclick: () => this.openDiplomacy() }, '🤝'),
        h('button', { class: 'icon-btn', title: 'السجل', onclick: () => this.openLog() }, '📜'),
        h('button', { class: 'icon-btn', title: 'القائمة', onclick: () => this.openMenu() }, '☰'),
        h('button', { class: 'btn primary end-turn', onclick: () => this.endTurn() }, 'إنهاء الدور'),
      ),
    );
    this.root.appendChild(top);
  }

  refresh() {
    const f = Game.f(this.P), e = Game.economy(this.P);
    this.hud.fac.innerHTML = '';
    this.hud.fac.append(h('i', { style: { background: f.color } }), f.name);
    this.hud.gold.textContent = `💰 ${f.gold} (${signed(e.netGold)})`;
    this.hud.gold.classList.toggle('neg', e.netGold < 0);
    this.hud.food.textContent = `🌾 ${f.food} (${signed(e.netFood)})`;
    this.hud.food.classList.toggle('neg', e.netFood < 0);
    this.hud.date.textContent = `${Game.season()} ${Game.year()}م`;
  }

  closeSheet() { this.sheet.hidden = true; this.selNode = null; this.selArmy = null; }

  // ——— لوحة المدينة ———
  openNode(n) {
    const S = Game.S, P = this.P;
    const f = Game.f(n.owner);
    const own = n.owner === P;
    const bs = Game.besieger(n.id);
    const inside = Game.insideArmy(n);
    const sheet = this.sheet;
    sheet.innerHTML = '';
    sheet.hidden = false;
    const st = own ? null : Game.status(P, n.owner);
    const stName = { war: 'حرب', peace: 'سلام', alliance: 'حلف' }[st];
    sheet.appendChild(h('div', { class: 'sheet-head' },
      h('div', null,
        h('h3', null, n.name, n.capital ? h('span', { class: 'cap' }, ' ★ عاصمة') : null),
        h('div', { class: 'sub' }, h('i', { class: 'dot', style: { background: f.color } }), f.name, stName ? h('span', { class: 'pill ' + st }, stName) : null, h('span', { class: 'muted' }, ' · ' + TERRAIN_NAMES[n.terrain])),
      ),
      h('button', { class: 'icon-btn', onclick: () => this.closeSheet() }, '✕'),
    ));
    const body = h('div', { class: 'sheet-body' });
    sheet.appendChild(body);

    const stats = h('div', { class: 'stats' },
      stat('السكان', n.pop.toLocaleString('en')),
      stat('الأسوار', n.walls ? '▮'.repeat(n.walls) : 'لا أسوار'),
      own || st === 'alliance' ? stat('الولاء', h('span', { class: 'meter' }, h('i', { style: { width: n.loyalty + '%', background: n.loyalty > 50 ? '#7fc26b' : n.loyalty > 25 ? '#e3b64a' : '#e0553f' } })), n.loyalty) : null,
      own ? stat('الدخل', `💰${Game.cityIncome(n)} 🌾${Game.cityFood(n)}`) : null,
      stat('مؤن الحصار', n.stores < 0 ? 'مجاعة!' : n.stores + ' أدوار'),
      stat('الحامية', Game.menOf(n.garrison) + ' رجل'),
    );
    body.appendChild(stats);

    // الحصار
    if (bs) {
      const sieging = bs.fid === P;
      const box = h('div', { class: 'section siege' },
        h('h4', null, sieging ? `حصارك لـ${n.name}` : `${n.name} تحت حصار ${Game.fname(bs.fid)}`),
        h('p', { class: 'muted' }, `منذ ${bs.siege.turns} ${bs.siege.turns === 1 ? 'دور' : 'أدوار'} · المعدات: ${bs.siege.turns >= 1 ? 'كبش وسلالم جاهزة' : 'تُبنى — جاهزة الدور القادم'}`),
      );
      if (sieging) {
        const enc = Game.makeEnc('assault', bs, n);
        box.appendChild(this.powerCompare(enc));
        box.appendChild(h('div', { class: 'row-btns' },
          h('button', { class: 'btn primary', disabled: bs.moved || (bs.siege.turns < 1 && !bs.regs.some((r) => r.type === 'catapult')), onclick: async () => { await this.runEnc(Game.makeEnc('assault', bs, n)); this.afterAction(); } }, bs.siege.turns < 1 && !bs.regs.some((r) => r.type === 'catapult') ? 'اقتحام (انتظر المعدات)' : 'اقتحام ⚔️'),
          h('button', { class: 'btn', disabled: n.parley === S.turn, onclick: () => this.offerTerms(bs, n) }, 'عرض الأمان مقابل الاستسلام'),
          h('button', { class: 'btn', disabled: bs.moved, onclick: () => { bs.siege = null; Game.retreatTo(bs, bs.from); bs.moved = true; UI.toast('رُفع الحصار'); this.afterAction(); } }, 'رفع الحصار'),
        ));
      } else if (own) {
        box.appendChild(h('div', { class: 'row-btns' },
          inside ? h('button', { class: 'btn primary', disabled: inside.moved, onclick: async () => { await this.runEnc(Game.makeEnc('sally', inside, n, bs)); this.afterAction(); } }, 'الخروج للقتال') : h('span', { class: 'muted' }, 'لا جيش داخل المدينة. أرسل جيشاً من مدينة مجاورة لفكّ الحصار.'),
          h('button', { class: 'btn', disabled: n.parley === S.turn, onclick: () => this.payRansom(bs, n) }, `فدية لرفع الحصار (${this.ransomCost(bs)}💰)`),
        ));
      }
      body.appendChild(box);
    }

    // الجيوش
    for (const a of Game.armiesAt(n.id)) {
      if (a.siege && a.fid !== P) continue;
      body.appendChild(this.armySection(a, n));
    }

    if (own) {
      body.appendChild(this.recruitSection(n));
      body.appendChild(this.buildSection(n));
    } else if (!bs) {
      const ga = h('div', { class: 'section' }, h('h4', null, 'الحامية'), h('div', { class: 'chips' }, n.garrison.map((r) => regChip(r))));
      body.appendChild(ga);
      const near = Game.armiesOf(P).filter((a) => !a.moved && Game.adj(a.node).includes(n.id));
      if (near.length) body.appendChild(h('p', { class: 'hint' }, 'اضغط راية جيشك المجاور ثم اضغط هذه المدينة للزحف إليها.'));
    }
    this.refresh();
  }

  armySection(a, n) {
    const P = this.P, own = a.fid === P;
    const g = a.general;
    const men = Game.menOf(a.regs);
    const sec = h('div', { class: 'section army' + (own ? ' own' : '') },
      h('h4', null,
        h('i', { class: 'dot', style: { background: Game.f(a.fid).color } }),
        g ? `جيش ${g.name}` : 'جيش بلا قائد',
        g && g.trait ? h('span', { class: 'trait', title: TRAITS[g.trait].desc }, TRAITS[g.trait].name) : null,
        h('span', { class: 'muted' }, ` · ${men} رجل`),
      ),
      g && g.trait ? h('p', { class: 'muted small' }, TRAITS[g.trait].desc) : null,
    );
    const chips = h('div', { class: 'chips' });
    a.regs.forEach((r, i) => {
      chips.appendChild(regChip(r, own && !Game.besieger(n.id) ? () => this.confirmDisband(a, i) : null));
    });
    sec.appendChild(chips);
    if (own) {
      const btns = h('div', { class: 'row-btns' });
      if (!a.siege) {
        const targets = Game.moveTargets(a);
        btns.appendChild(h('button', {
          class: 'btn primary' + (this.selArmy === a ? ' on' : ''),
          disabled: a.moved || !targets.length,
          onclick: () => { this.selArmy = this.selArmy === a ? null : a; if (this.selArmy) UI.toast('اضغط مدينة مضيئة للزحف إليها'); this.openNode(n); },
        }, a.moved ? 'تحرّك هذا الدور' : this.selArmy === a ? 'اختر الوجهة…' : 'تحريك الجيش'));
      }
      sec.appendChild(btns);
    }
    return sec;
  }

  confirmDisband(a, i) {
    const r = a.regs[i];
    UI.modal({
      title: 'تسريح الوحدة؟',
      body: h('p', null, `${UNITS[r.type].name} (${r.men} رجل) — يوفّر ${UNITS[r.type].upkeep} ذهب كل دور.`),
      buttons: [
        { label: 'سرّح', danger: true, onClick: () => { Game.disband(a, i); this.openNode(this.selNode); } },
        { label: 'إلغاء' },
      ],
    });
  }

  recruitSection(n) {
    const P = this.P;
    const a = Game.armyOf(P, n.id);
    const sec = h('div', { class: 'section' }, h('h4', null, 'التجنيد', h('span', { class: 'muted' }, a ? ` · ${a.regs.length}/${MAX_REGS}` : ' · جيش جديد +60💰 للقائد')));
    const grid = h('div', { class: 'recruit' });
    for (const t of RECRUITABLE) {
      const d = UNITS[t];
      const err = Game.canRecruit(P, n, t);
      grid.appendChild(h('button', {
        class: 'unit-btn', disabled: !!err, title: err || d.desc,
        onclick: () => { const e = Game.recruit(P, n, t); if (e) UI.toast(e); else UI.toast(`جُنّدت ${d.name}`); this.openNode(n); },
      },
        h('span', { class: 'ic' }, d.icon), h('span', { class: 'nm' }, d.name), h('span', { class: 'cost' }, `💰${d.cost}`),
        err && err !== 'الذهب لا يكفي' ? h('span', { class: 'why' }, err) : null,
      ));
    }
    sec.appendChild(grid);
    sec.appendChild(h('details', { class: 'unit-help' }, h('summary', null, 'ما الذي يهزم ماذا؟'),
      RECRUITABLE.map((t) => h('p', null, h('b', null, UNITS[t].icon + ' ' + UNITS[t].name + ': '), UNITS[t].desc))));
    return sec;
  }

  buildSection(n) {
    const P = this.P;
    const sec = h('div', { class: 'section' }, h('h4', null, 'البناء', h('span', { class: 'muted' }, ' · بناء واحد لكل مدينة في الدور')));
    const grid = h('div', { class: 'build' });
    for (const k of Object.keys(BUILDINGS)) {
      const B = BUILDINGS[k], lvl = n[k] || 0;
      const err = Game.canBuild(P, n, k);
      grid.appendChild(h('button', {
        class: 'unit-btn', disabled: !!err, title: err || B.desc,
        onclick: () => { const e = Game.build(P, n, k); UI.toast(e || `بُني ${B.name}`); this.openNode(n); },
      },
        h('span', { class: 'nm' }, `${B.name} ${lvl}/${B.max}`), h('span', { class: 'desc' }, B.desc),
        lvl < B.max ? h('span', { class: 'cost' }, `💰${B.cost(lvl)}`) : h('span', { class: 'cost' }, 'مكتمل'),
      ));
    }
    sec.appendChild(grid);
    return sec;
  }

  powerCompare(enc) {
    const { pa, pd } = Game.encPower(enc);
    const mineAtt = enc.attFid === this.P;
    const my = mineAtt ? pa : pd, en = mineAtt ? pd : pa;
    const ratio = my / Math.max(1, en);
    const verdict = ratio > 2.2 ? 'تفوّق ساحق' : ratio > 1.4 ? 'أفضلية واضحة' : ratio > 0.85 ? 'قوى متكافئة — التكتيك سيحسمها' : ratio > 0.55 ? 'العدو أقوى — تحتاج خطة ذكية' : 'العدو أقوى بكثير';
    const pct = 100 * my / (my + en || 1);
    return h('div', { class: 'compare' },
      h('div', { class: 'cbar' }, h('i', { style: { width: pct + '%' } })),
      h('div', { class: 'cl' }, h('span', null, 'قوتك'), h('b', null, verdict), h('span', null, 'العدو')),
    );
  }

  ransomCost(bs) { return Math.round(Game.menOf(bs.regs) * 0.9 + 40); }

  payRansom(bs, n) {
    const P = this.P, f = Game.f(P), cost = this.ransomCost(bs);
    if (f.gold < cost) { UI.toast('الذهب لا يكفي'); return; }
    n.parley = Game.S.turn;
    const ratio = Game.armyPower(bs) / Math.max(1, Game.defensePower(n));
    if (R() < (ratio < 2 ? 0.7 : 0.35)) {
      f.gold -= cost; Game.f(bs.fid).gold += cost;
      bs.siege = null; Game.retreatTo(bs, bs.from);
      Game.addRel(P, bs.fid, 5);
      UI.toast(`قبل ${Game.fname(bs.fid)} الفدية ورفع الحصار`);
    } else UI.toast(`رفض ${Game.fname(bs.fid)} الفدية!`);
    this.afterAction();
  }

  offerTerms(a, n) {
    n.parley = Game.S.turn;
    const enc = Game.makeEnc('assault', a, n);
    const { pa, pd } = Game.encPower(enc);
    const ratio = pa / Math.max(1, pd);
    const p = clamp(0.08 + (ratio - 1) * 0.2 + (n.stores <= 0 ? 0.35 : n.stores <= 1 ? 0.15 : 0) + a.siege.turns * 0.05 - (n.capital ? 0.15 : 0), 0, 0.85);
    if (R() < p) {
      UI.toast(`${n.name} تقبل الأمان وتفتح أبوابها!`);
      this.busy = true;
      Game.surrenderAccepted(enc, 'surrender').then(() => { this.busy = false; this.afterAction(); });
    } else {
      UI.toast(`رفض أهل ${n.name} الاستسلام. جرّب في دور لاحق حين يشتدّ الجوع.`);
      this.afterAction();
    }
  }

  // ——— الدبلوماسية ———
  openDiplomacy() {
    const P = this.P;
    const me = Game.factionPower(P);
    const list = h('div', { class: 'diplo' });
    const render = () => {
      list.innerHTML = '';
      for (const id of Game.majors()) {
        if (id === P) continue;
        const f = Game.f(id);
        if (!f.alive) { list.appendChild(h('div', { class: 'd-row dead' }, h('i', { class: 'dot', style: { background: f.color } }), f.name, ' — سقطت')); continue; }
        const st = Game.status(P, id);
        const rel = Math.round(Game.rel(P, id));
        const pw = Game.factionPower(id);
        const cmp = pw > me * 1.6 ? 'أقوى منك بكثير' : pw > me * 1.15 ? 'أقوى منك' : pw > me * 0.85 ? 'نِدّ لك' : pw > me * 0.6 ? 'أضعف منك' : 'أضعف منك بكثير';
        const truce = f.truce[P] || Game.f(P).truce[id] || 0;
        const act = (label, fn, dis) => h('button', { class: 'chip', disabled: dis, onclick: () => { fn(); render(); this.refresh(); } }, label);
        const btns = h('div', { class: 'd-btns' });
        if (st === 'war') {
          btns.append(
            act('عرض الصلح', () => this.proposePeace(id, 0)),
            act('صلح + 150💰', () => this.proposePeace(id, 150), Game.f(P).gold < 150),
          );
        } else {
          btns.append(act('هدية 100💰', () => {
            Game.f(P).gold -= 100; Game.f(id).gold += 100;
            Game.addRel(P, id, 14 * (1 - Math.max(0, rel) / 150));
            UI.toast(`${f.name} تقبل هديتك بسرور`);
          }, Game.f(P).gold < 100));
          if (st === 'peace') btns.append(act('عرض حلف', () => {
            if (Game.aiWillAlly(id, P)) { Game.setStatus(P, id, 'alliance', 10); Game.log(`حلف بين ${Game.fname(P)} و${f.name}.`, 'diplo'); UI.toast(`تحالفت مع ${f.name}!`); }
            else { UI.toast(`${f.name} ترفض الحلف (تحتاج علاقة أفضل أو عدواً مشتركاً)`); Game.addRel(P, id, -2); }
          }));
          btns.append(act('طلب جزية', () => {
            if (me > pw * 1.6 && rel > -50 && R() < 0.75) { const g = Math.min(Game.f(id).gold, 150); Game.f(id).gold -= g; Game.f(P).gold += g; Game.addRel(P, id, -8); UI.toast(`${f.name} تدفع ${g}💰 خوفاً منك`); }
            else { Game.addRel(P, id, -20); UI.toast(`${f.name} ترفض بازدراء`); }
          }));
          btns.append(h('button', { class: 'chip warn', onclick: () => this.confirmWar(id, truce, render) }, 'إعلان الحرب'));
        }
        list.appendChild(h('div', { class: 'd-row' },
          h('div', { class: 'd-head' },
            h('i', { class: 'dot', style: { background: f.color } }), h('b', null, f.name),
            h('span', { class: 'pill ' + st }, { war: 'حرب', peace: 'سلام', alliance: 'حلف' }[st]),
            truce > 0 && st !== 'war' ? h('span', { class: 'muted small' }, `عهد ${truce} أدوار`) : null,
          ),
          h('div', { class: 'd-meta' },
            h('span', null, 'العلاقة '), h('span', { class: 'meter rel' }, h('i', { style: { width: (rel + 100) / 2 + '%', background: rel > 30 ? '#7fc26b' : rel > -20 ? '#e3b64a' : '#e0553f' } })), h('b', { dir: 'ltr' }, rel),
            h('span', { class: 'muted' }, ' · ' + cmp + ' · ' + Game.nodesOf(id).length + ' مدن'),
          ),
          btns,
        ));
      }
    };
    render();
    UI.modal({ title: 'الدبلوماسية', body: h('div', null, h('p', { class: 'hint' }, 'الهدايا ترفع العلاقة. الصلح يقبله العدو إذا أنهكته الحرب أو كنت أقوى. نقض العهد يضرّ سمعتك عند الجميع.'), list), buttons: [{ label: 'إغلاق' }], dismissable: true });
  }

  proposePeace(id, tribute) {
    const P = this.P, f = Game.f(id);
    if (Game.aiWillAcceptPeace(id, P, tribute)) {
      Game.setStatus(P, id, 'peace', 8);
      Game.addRel(P, id, 15);
      if (tribute) { Game.f(P).gold -= tribute; f.gold += tribute; }
      Game.log(`صلح بين ${Game.fname(P)} و${f.name}.`, 'diplo');
      for (const a of Game.armiesOf(P)) if (a.siege && Game.node(a.node).owner === id) { a.siege = null; Game.retreatTo(a, a.from); }
      for (const a of Game.armiesOf(id)) if (a.siege && Game.node(a.node).owner === P) { a.siege = null; Game.retreatTo(a, a.from); }
      UI.toast(`${f.name} تقبل الصلح`);
    } else {
      Game.addRel(P, id, -3);
      UI.toast(`${f.name} ترفض الصلح — ${tribute ? 'لا يكفيها الذهب' : 'ما زالت ترى النصر ممكناً'}`);
    }
  }

  confirmWar(id, truce, rerender) {
    UI.modal({
      title: `الحرب على ${Game.fname(id)}؟`,
      body: h('p', null, truce > 0 ? 'بينكما عهد قائم. نقضه يسيء لسمعتك عند كل الممالك.' : 'ستتمكن جيوشك من الزحف على مدنها.'),
      buttons: [
        { label: 'أعلن الحرب', danger: true, onClick: () => { Game.declareWar(this.P, id); UI.toast('دقّت طبول الحرب'); this.refresh(); if (rerender) this.openDiplomacy(); } },
        { label: 'تراجع' },
      ],
    });
  }

  openLog() {
    const items = Game.S.log.slice(-40).reverse();
    UI.modal({
      title: 'سجل الأحداث',
      body: h('div', { class: 'log' }, items.map((e) => h('div', { class: 'log-item ' + e.type }, h('span', { class: 'muted small' }, `${SEASONS[e.turn % 4]} ${Game.sc.startYear + Math.floor(e.turn / 4)}`), ' ', e.text))),
      buttons: [{ label: 'إغلاق' }], dismissable: true,
    });
  }

  openMenu() {
    UI.modal({
      title: 'القائمة',
      body: h('p', { class: 'muted' }, `${Game.sc.name} · ${Game.fname(this.P)} · ${DIFFS[Game.S.difficulty].name}. تُحفظ اللعبة تلقائياً كل دور.`),
      buttons: [
        { label: 'دليل الحرب', onClick: () => showGuide() },
        { label: 'حفظ', onClick: () => { Game.save(); UI.toast('حُفظت اللعبة'); } },
        { label: 'القائمة الرئيسية', onClick: () => { Game.save(); showMainMenu(); } },
        { label: 'متابعة', primary: true },
      ],
      dismissable: true,
    });
  }

  showIntro() {
    const f = Game.f(this.P);
    UI.modal({
      title: `${Game.sc.name} — ${f.name}`,
      body: h('div', null,
        h('p', { class: 'lead' }, Game.sc.intro),
        h('ul', { class: 'steps' },
          h('li', null, 'اضغط راية جيشك (المتوهجة) ثم مدينة مضيئة للزحف إليها.'),
          h('li', null, 'اضغط مدينتك للتجنيد والبناء. الإسطبلات تفتح الخيالة والمنجنيق.'),
          h('li', null, 'المدن المسوّرة تُحاصَر: انتظر دوراً للكبش والسلالم، أو جوّعها حتى تستسلم.'),
          h('li', null, 'في المعركة: ثبّت العدو بالمشاة، وانقضّ بالخيالة على أجنابه ورماته.'),
          h('li', null, 'اترك جيشاً في المدن المحتلة حديثاً وإلا ثار أهلها.'),
        ),
        h('p', { class: 'hint' }, 'النصر: أسقط الممالك المنافسة أو احكم ثلاثة أرباع المدن.'),
      ),
      buttons: [{ label: 'إلى المعركة', primary: true }],
    });
  }

  showEnd() {
    const win = Game.S.over === 'win';
    Game.save();
    UI.modal({
      title: win ? 'توحّدت الأرض تحت رايتك!' : 'سقطت مملكتك',
      cls: win ? 'win' : 'lose',
      body: h('p', { class: 'lead' }, win ? `بعد ${Game.S.turn} دوراً من الحرب والدهاء، دانت لك البلاد.` : 'ضاعت آخر مدنك. سيذكر التاريخ أنك قاتلت.'),
      buttons: [{ label: 'القائمة الرئيسية', primary: true, onClick: () => { Game.clearSave(); showMainMenu(); } }],
    });
  }

  // ——— نهاية الدور ———
  async endTurn() {
    if (this.busy || Game.S.over) return;
    const idle = Game.armiesOf(this.P).filter((a) => !a.moved && Game.moveTargets(a).length && !a.siege);
    this.busy = true;
    this.closeSheet();
    const mark = Game.S.log.length;
    const notes = [];
    this.notes = notes;
    try {
      for (const fid of Game.majors()) {
        if (fid === this.P || !Game.f(fid).alive) continue;
        this.banner.hidden = false;
        this.banner.textContent = `دور ${Game.fname(fid)}…`;
        await wait(350);
        await CampaignAI.turn(fid);
        this.refresh();
        if (Game.S.over) break;
      }
      this.banner.hidden = true;
      const events = Game.endRound();
      for (const ps of Game.pendingSurrenders || []) {
        const a = Game.army(ps.army), n = Game.node(ps.node);
        if (a && a.siege && a.node === n.id && n.owner !== a.fid) {
          await Game.capture(n, a, 'surrender');
          Game.log(`${n.name} تستسلم لـ${Game.fname(a.fid)} بعد أن أنهكها الجوع.`, 'war');
        }
      }
      Game.pendingSurrenders = [];
      Game.checkElimination();
      Game.save();
      this.refresh();
      if (Game.S.over) { this.showEnd(); return; }
      const logs = Game.S.log.slice(mark);
      this.showReport([...notes, ...events], logs, idle.length);
    } finally {
      this.busy = false;
      this.banner.hidden = true;
      this.notes = null;
    }
  }

  showReport(events, logs, idleCount) {
    const P = this.P, e = Game.economy(P);
    const mine = (t) => t.includes(Game.fname(P));
    UI.modal({
      title: `${Game.season()} ${Game.year()}م`,
      body: h('div', null,
        h('div', { class: 'report-eco', dir: 'ltr' }, `💰 ${Game.f(P).gold} (${signed(e.netGold)})`, ' · ', `🌾 ${Game.f(P).food} (${signed(e.netFood)})`, Game.isWinter() ? ' · ❄️ الشتاء يُنهك المحاصِرين' : ''),
        events.length ? h('div', { class: 'events' }, events.map((t) => h('p', { class: 'warn' }, t))) : null,
        logs.length ? h('div', { class: 'log' }, logs.map((l) => h('div', { class: 'log-item ' + l.type + (mine(l.text) ? ' mine' : '') }, l.text))) : h('p', { class: 'muted' }, 'دور هادئ على الجبهات.'),
        idleCount ? h('p', { class: 'hint' }, `تركتَ ${idleCount} ${idleCount === 1 ? 'جيشاً' : 'جيوش'} دون حركة في الدور الماضي.`) : null,
      ),
      buttons: [{ label: 'متابعة', primary: true }],
    });
  }
}

function stat(label, ...v) { return h('div', { class: 'stat' }, h('span', { class: 'k' }, label), h('span', { class: 'v' }, v)); }
function regChip(r, onX) {
  const d = UNITS[r.type];
  return h('span', { class: 'rchip', title: d.desc },
    h('span', { class: 'ic' }, d.icon), h('span', null, d.name), h('b', null, r.men), r.exp ? h('span', { class: 'star' }, '★'.repeat(r.exp)) : null,
    onX ? h('button', { class: 'x', title: 'تسريح', onclick: (e) => { e.stopPropagation(); onX(); } }, '×') : null,
  );
}
function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function isLight(hex) { const [r, g, b] = hexRgb(hex); return r * 0.3 + g * 0.59 + b * 0.11 > 170; }

// ——— خطافات الحملة التي تحتاج اللاعب ———
function installHooks(scene) {
  Game.hooks.notify = (msg) => { if (scene.notes) scene.notes.push(msg); else UI.toast(msg); };

  Game.hooks.proposal = (p) => {
    const f = Game.f(p.from);
    const text = {
      peace: `${f.name} تعرض الصلح${p.tribute ? ` وتدفع ${p.tribute}💰 تعويضاً` : ''}.`,
      tribute: `${f.name} تطالبك بجزية ${p.amount}💰، وتلوّح بالحرب إن رفضت.`,
      alliance: `${f.name} تعرض عليك حلفاً ضد أعدائكما.`,
    }[p.kind];
    return UI.ask({
      title: 'رسول من ' + f.name,
      body: h('p', { class: 'lead' }, text),
      buttons: [
        { label: p.kind === 'tribute' ? 'ادفع' : 'اقبل', value: true, primary: true, disabled: p.kind === 'tribute' && Game.f(Game.S.player).gold < p.amount },
        { label: 'ارفض', value: false },
      ],
    });
  };

  Game.hooks.occupation = (node, how) => UI.ask({
    title: `دخلتَ ${node.name}`,
    body: h('div', null,
      h('p', { class: 'lead' }, how === 'surrender' ? 'فتحت المدينة أبوابها. كيف تعامل أهلها؟' : 'سقطت المدينة. كيف تعامل أهلها؟'),
      h('ul', { class: 'steps' },
        h('li', null, h('b', null, 'الضمّ: '), 'ولاء متوسط، المدينة كما هي.'),
        h('li', null, h('b', null, 'النهب: '), `غنيمة ~${Math.round(node.pop / 55)}💰، يقلّ السكان وينهار الولاء (خطر الثورة).`),
        h('li', null, h('b', null, 'الأمان: '), 'ولاء عالٍ وتحسّن سمعتك، يكلّف 50💰.'),
      ),
    ),
    buttons: [
      { label: 'ضمّ المدينة', value: 'occupy', primary: true },
      { label: 'نهب', value: 'sack', danger: true },
      { label: 'إعلان الأمان', value: 'clemency' },
    ],
  });

  Game.hooks.encounter = (enc) => new Promise((resolve) => {
    const P = Game.S.player;
    const attacking = enc.attFid === P;
    const s = Game.encSides(enc);
    const node = s.node;
    const foeFid = attacking ? enc.defFid : enc.attFid;
    const sideBox = (label, fid, regs, gen) => h('div', { class: 'enc-side' },
      h('div', { class: 'enc-h' }, h('i', { class: 'dot', style: { background: Game.f(fid).color } }), h('b', null, label)),
      gen ? h('div', { class: 'muted small' }, `القائد ${gen.name}${gen.trait ? ' — ' + TRAITS[gen.trait].name : ''}`) : h('div', { class: 'muted small' }, 'بلا قائد'),
      h('div', { class: 'chips' }, regs.map((r) => regChip(r))),
      h('div', { class: 'small' }, `${Game.menOf(regs) + (gen ? gen.men : 0)} رجل`),
    );
    const title = enc.type === 'assault'
      ? (enc.kind === 'siege' ? `اقتحام ${node.name}` : `معركة ${node.name}`)
      : (enc.type === 'sally' ? `الخروج من ${node.name}` : `فكّ حصار ${node.name}`);
    const lead = attacking ? '' : `${Game.fname(enc.attFid)} ${enc.type === 'assault' ? 'تهاجم' : 'تهاجم جيشك عند'} ${node.name}!`;
    const info = [TERRAIN_NAMES[node.terrain]];
    if (enc.kind === 'siege') info.push(`أسوار ${node.walls}`, enc.equip && enc.equip.ram ? 'مع كبش وسلالم' : 'بلا معدات حصار');
    let closeFn = null;
    const done = (v) => { if (closeFn) closeFn(); resolve(v); };
    const fight = () => { if (closeFn) closeFn(); launchBattle(enc, resolve); };
    const auto = () => { const w = Game.autoResolve(enc); showAutoResult(enc, w, () => resolve(w)); if (closeFn) closeFn(); };
    const buttons = [
      { label: attacking ? 'قُد المعركة ⚔️' : 'قُد الدفاع ⚔️', primary: true, onClick: fight },
      { label: 'حسم سريع 🎲', onClick: auto },
    ];
    if (attacking) {
      buttons.push({ label: 'تفاوض 🗣️', keep: true, onClick: (close) => { close(); negotiate(enc, resolve); } });
      if (enc.type !== 'sally' && !(enc.kind === 'siege')) buttons.push({ label: 'تراجع', onClick: () => done('cancel') });
      if (enc.kind === 'siege') buttons.push({ label: 'لاحقاً', onClick: () => done('cancel') });
    } else if (enc.type === 'assault' && enc.kind === 'siege' && Game.f(P).gold > 0) {
      const cost = Math.round(Game.menOf(s.attRegs) * 1.1 + 40);
      buttons.push({
        label: `فدية ${cost}💰`, disabled: Game.f(P).gold < cost, keep: true, onClick: (close) => {
          if (R() < 0.5) { close(); Game.f(P).gold -= cost; Game.f(enc.attFid).gold += cost; const a = Game.army(enc.att); a.siege = null; Game.retreatTo(a, a.from); UI.toast('قبل العدو الفدية وانسحب'); resolve('settled'); }
          else { UI.toast('رفض العدو الفدية! لا بدّ من القتال'); }
        },
      });
    }
    closeFn = UI.modal({
      title, cls: 'enc',
      body: h('div', null,
        lead ? h('p', { class: 'lead warn' }, lead) : null,
        h('p', { class: 'muted' }, info.join(' · ')),
        h('div', { class: 'enc-sides' },
          sideBox(attacking ? 'جيشك' : Game.fname(enc.attFid), enc.attFid, s.attRegs, s.attGen),
          h('div', { class: 'vs' }, '⚔'),
          sideBox(attacking ? Game.fname(foeFid) : 'المدافعون', enc.defFid, s.defRegs, s.defGen),
        ),
        App.scene.powerCompare ? App.scene.powerCompare(enc) : null,
      ),
      buttons,
    });
  });
}

function negotiate(enc, resolve) {
  const P = Game.S.player;
  const cost = Game.bribeCost(enc);
  const back = () => Game.hooks.encounter(enc).then(resolve);
  UI.modal({
    title: 'التفاوض',
    body: h('div', null,
      h('p', null, enc.type === 'assault' ? 'أرسل رسولاً إلى المدينة:' : 'أرسل رسولاً إلى جيش العدو:'),
      h('ul', { class: 'steps' },
        h('li', null, h('b', null, 'طلب الاستسلام: '), 'ينجح إن كان جيشك أقوى بكثير أو المدينة جائعة.'),
        h('li', null, h('b', null, `شراء الولاء (${cost}💰): `), 'رشوة القادة والأعيان — قد يرفض الشجعان.'),
      ),
    ),
    buttons: [
      {
        label: 'طلب الاستسلام', primary: true, onClick: async () => {
          if (Game.tryDemandSurrender(enc)) { UI.toast('قبلوا الاستسلام!'); await Game.surrenderAccepted(enc, 'surrender'); resolve('settled'); }
          else { Game.addRel(P, enc.defFid, -3); UI.toast('رفضوا بإباء — لا مفرّ من القتال'); back(); }
        },
      },
      {
        label: `رشوة ${cost}💰`, disabled: Game.f(P).gold < cost, onClick: async () => {
          if (Game.tryBribe(enc)) { Game.f(P).gold -= cost; UI.toast('نجحت الرشوة!'); await Game.surrenderAccepted(enc, 'surrender'); resolve('settled'); }
          else { Game.f(P).gold -= Math.round(cost * 0.3); UI.toast('خدعوا رسولك وأخذوا بعض الذهب!'); back(); }
        },
      },
      { label: 'عودة', onClick: back },
    ],
  });
}

function showAutoResult(enc, winner, cb) {
  const P = Game.S.player;
  const mine = (enc.attFid === P ? 0 : 1) === winner;
  UI.modal({
    title: mine ? 'نصر' : 'هزيمة', cls: mine ? 'win' : 'lose',
    body: h('p', { class: 'lead' }, mine ? 'حُسمت المعركة لصالحك.' : 'دارت الدائرة على جيشك.'),
    buttons: [{ label: 'متابعة', primary: true, onClick: cb }],
  });
}

function launchBattle(enc, resolve) {
  const P = Game.S.player;
  const s = Game.encSides(enc);
  const skill = DIFFS[Game.S.difficulty].aiSkill;
  const side = (fid, regs, gen) => ({
    name: Game.fname(fid), color: Game.f(fid).color, player: fid === P,
    regs: regs.filter((r) => r.men > 0), general: gen && gen.men > 0 ? gen : null,
    ai: fid === 'neutral' ? Math.min(skill, 0.45) : skill,
  });
  const cfg = {
    kind: enc.kind, terrain: s.node.terrain, walls: s.node.walls, equip: enc.equip,
    seed: hashStr(s.node.id) + Game.S.turn * 131,
    ground: Game.S.scenario === 'umayyad' ? 'dry' : 'green',
    sides: [side(enc.attFid, s.attRegs, s.attGen), side(enc.defFid, s.defRegs, s.defGen)],
  };
  const camp = App.scene;
  const scene = new BattleScene(cfg, (res) => {
    Game.applyBattleResult(res);
    App.setScene(camp);
    resolve(res.winner);
  });
  App.setScene(scene);
}
