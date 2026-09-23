'use strict';
// واجهة الحملة: الخريطة، تسلسل الأدوار، والخطافات التي تحتاج قرار اللاعب

// ——— نوافذ وإشعارات مشتركة ———
const UI = {
  modal({ title, body, buttons = [], cls = '', dismissable = false, onClose }) {
    const layer = h('div', { class: 'modal-layer' });
    const close = () => { layer.remove(); if (onClose) onClose(); };
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
  toast(msg, ms = 2800) {
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
function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function isLight(hex) { const [r, g, b] = hexRgb(hex); return r * 0.3 + g * 0.59 + b * 0.11 > 170; }

const MW = 1000, MH = 700;

class CampaignScene {
  constructor() {
    this.cam = new Camera(MW, MH);
    this.selNode = null; this.selArmy = null;
    this.busy = false;
    this.terrSig = '';
    this.t = 0;
    this.minimized = false;
  }

  get S() { return Game.S; }
  get P() { return Game.S.player; }

  enter() {
    App.ui.innerHTML = '';
    this.root = h('div', { class: 'camp-ui' });
    App.ui.appendChild(this.root);
    this.buildHud();
    this.sheet = h('div', { class: 'sheet', hidden: true });
    this.widget = h('div', { class: 'move-widget', hidden: true });
    this.banner = h('div', { class: 'turn-banner', hidden: true });
    this.root.append(this.sheet, this.widget, this.banner);
    this.cam.padTop = 50; this.cam.padBottom = 0;
    if (!this.bg) this.renderBg();
    this.fitCam(this.entered);
    this.entered = true;
    this.refresh();
    if (this.selNode) this.openNode(this.selNode);
    if (Game.S.turn === 0 && !this.introShown) { this.introShown = true; Panels.intro(this); }
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
    for (const poly of sc.deserts || []) {
      g.save();
      g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      g.fillStyle = 'rgba(226,196,130,.55)'; g.fill();
      g.clip();
      g.strokeStyle = 'rgba(170,130,70,.35)'; g.lineWidth = 1.2;
      for (let i = 0; i < 120; i++) {
        const x = r() * MW, y = r() * MH;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 5, x + 16, y); g.stroke();
      }
      g.restore();
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

  // ——— الرسم ———
  render(ctx) {
    const S = Game.S, d = App.dpr, cam = this.cam;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#17120d'; ctx.fillRect(0, 0, App.canvas.width, App.canvas.height);
    this.renderTerritory();
    cam.apply(ctx);
    ctx.drawImage(this.bg, 0, 0, MW, MH);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.terr, 0, 0, MW, MH);

    const reach = this.selArmy ? Game.reach(this.selArmy) : {};
    const onPath = new Set();
    for (const id in reach) { let prev = this.selArmy.node; for (const p of reach[id].path) { onPath.add(prev + '|' + p); onPath.add(p + '|' + prev); prev = p; } }
    // الطرق
    ctx.lineCap = 'round';
    for (const e of Game.sc.edges) {
      const [a, b, kind = 'road'] = e;
      const A = Game.node(a), B = Game.node(b);
      const hl = onPath.has(a + '|' + b);
      const paved = (A.roads || B.roads);
      if (kind === 'water') { ctx.setLineDash([2, 5]); ctx.strokeStyle = hl ? 'rgba(170,230,255,.95)' : 'rgba(40,80,110,.7)'; ctx.lineWidth = hl ? 3 : 2; }
      else if (kind === 'pass') { ctx.setLineDash([7, 3, 2, 3]); ctx.strokeStyle = hl ? 'rgba(255,215,110,.95)' : 'rgba(90,50,30,.75)'; ctx.lineWidth = hl ? 3 : 2.2; }
      else { ctx.setLineDash(paved ? [] : [4, 4]); ctx.strokeStyle = hl ? 'rgba(255,215,110,.95)' : paved ? 'rgba(90,65,35,.7)' : 'rgba(80,55,30,.55)'; ctx.lineWidth = hl ? 3 : paved ? 2.2 : 1.6; }
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const n of S.nodes) this.drawCity(ctx, n, !!reach[n.id]);

    // بمقاس الشاشة
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this.hits = [];
    for (const n of S.nodes) {
      const s = cam.toScreen(n.x, n.y);
      this.hits.push({ kind: 'node', n, x: s.x, y: s.y, r: 24 });
      const rad = this.cityRad(n);
      ctx.font = `${n.capital ? '700 ' : '600 '}${n.capital ? 13 : 12}px "Noto Naskh Arabic", Tahoma, sans-serif`;
      const ly = s.y + rad * cam.z + 13;
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(245,235,210,.9)';
      ctx.strokeText(n.name, s.x, ly);
      ctx.fillStyle = '#2a1e12'; ctx.fillText(n.name, s.x, ly);
      const ic = TERRAIN[n.terrain].icon;
      if (ic) { ctx.font = '11px sans-serif'; ctx.fillText(ic, s.x - rad * cam.z - 9, s.y - rad * cam.z); }
      if (n.owner === this.P && (n.loyalty < 30 || n.unrest > 0)) { ctx.font = '11px sans-serif'; ctx.fillText(n.loyalty < 30 ? '🔥' : '⚑', s.x + rad * cam.z + 8, s.y - rad * cam.z); }
      if (reach[n.id] && this.selArmy) {
        const cost = reach[n.id].cost;
        ctx.font = '700 11px sans-serif';
        ctx.fillStyle = 'rgba(20,14,8,.85)'; ctx.fillRect(s.x - 12, s.y - rad * cam.z - 26, 24, 15);
        ctx.fillStyle = '#ffe38a'; ctx.fillText('−' + cost, s.x, s.y - rad * cam.z - 18);
      }
    }
    for (const n of S.nodes) this.drawArmiesAt(ctx, n);
  }

  cityRad(n) { return [8, 9.5, 11, 12.5, 14][n.walls] + (n.capital ? 1.5 : 0); }

  drawCity(ctx, n, isTarget) {
    const f = Game.f(n.owner);
    const rad = this.cityRad(n);
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
    const w = n.walls;
    const oct = (r, rot = Math.PI / 8) => { ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + rot; ctx.lineTo(n.x + Math.cos(a) * r, n.y + Math.sin(a) * r); } ctx.closePath(); };
    const towers = (r, count, size) => {
      for (let k = 0; k < count; k++) {
        const a = k / count * TAU + Math.PI / 4;
        const tx = n.x + Math.cos(a) * r, ty = n.y + Math.sin(a) * r;
        ctx.fillStyle = '#9a8f7e'; ctx.strokeStyle = '#3e3326'; ctx.lineWidth = 0.8;
        ctx.fillRect(tx - size / 2, ty - size / 2, size, size); ctx.strokeRect(tx - size / 2, ty - size / 2, size, size);
      }
    };
    if (w === 1) {
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.2; ctx.setLineDash([2, 1.5]);
      ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    } else if (w >= 2) {
      if (w >= 3) { ctx.fillStyle = '#7d7262'; oct(rad + 3.5); ctx.fill(); ctx.strokeStyle = '#3e3326'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = '#8b8172'; oct(rad); ctx.fill(); ctx.strokeStyle = '#3e3326'; ctx.lineWidth = 1; ctx.stroke();
      towers(w >= 3 ? rad + 3.5 : rad, w >= 3 ? 8 : 4, w >= 4 ? 5 : 4);
    }
    const core = w >= 2 ? rad - 3.5 : w === 1 ? rad - 2.5 : rad - 1;
    ctx.fillStyle = f.color; ctx.strokeStyle = '#1e160e'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(n.x, n.y, core, 0, TAU); ctx.fill(); ctx.stroke();
    if (w === 0) {
      ctx.fillStyle = '#7b5b3a';
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.5; ctx.fillRect(n.x + Math.cos(a) * (rad + 3) - 1.5, n.y + Math.sin(a) * (rad + 3) - 1.5, 3, 3); }
    }
    if (w >= 4) {
      ctx.fillStyle = '#6f6555'; ctx.strokeStyle = '#2a2016'; ctx.lineWidth = 0.8;
      ctx.fillRect(n.x - 3.5, n.y - 3.5, 7, 7); ctx.strokeRect(n.x - 3.5, n.y - 3.5, 7, 7);
    }
    if (n.capital) {
      ctx.fillStyle = '#f4d77a'; ctx.strokeStyle = '#3e2c10'; ctx.lineWidth = 0.8;
      ctx.beginPath();
      const cy = w >= 4 ? n.y - 7 : n.y;
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? 2.2 : 5; ctx.lineTo(n.x + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (Game.besiegers(n.id).length) {
      const p = 0.5 + 0.5 * Math.sin(this.t * 8);
      ctx.strokeStyle = `rgba(220,70,40,${0.5 + p * 0.4})`; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(n.x, n.y, rad + 13, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // الجيوش: المقيمون فوق المدينة، المحاصِرون أسفلها
  drawArmiesAt(ctx, n) {
    const cam = this.cam;
    const s = cam.toScreen(n.x, n.y);
    const rad = this.cityRad(n) * cam.z;
    const inside = Game.armiesAt(n.id).filter((a) => !a.siege);
    const outside = Game.armiesAt(n.id).filter((a) => a.siege);
    const row = (list, y, max) => {
      const own = list.filter((a) => a.fid === this.P).sort((a, b) => b.regs.length - a.regs.length);
      const other = list.filter((a) => a.fid !== this.P).sort((a, b) => b.regs.length - a.regs.length);
      let show = [...own, ...other];
      const sel = this.selArmy && show.includes(this.selArmy) ? this.selArmy : null;
      let extra = 0;
      if (show.length > max) {
        extra = show.length - max + 1;
        show = show.slice(0, max - 1);
        if (sel && !show.includes(sel)) { show[show.length - 1] = sel; }
      }
      const W = 34, gap = 3;
      const total = show.length * (W + gap) + (extra ? 22 : 0) - gap;
      let x = s.x - total / 2 + W / 2;
      for (const a of show) {
        this.drawArmy(ctx, a, x, y);
        this.hits.push({ kind: 'army', a, x, y, r: 18 });
        x += W + gap;
      }
      if (extra) {
        ctx.fillStyle = 'rgba(20,14,8,.85)'; ctx.fillRect(x - W / 2 + 2, y - 9, 20, 16);
        ctx.fillStyle = '#ffe38a'; ctx.font = '700 11px sans-serif'; ctx.fillText('+' + extra, x - W / 2 + 12, y - 1);
        this.hits.push({ kind: 'node', n, x: x - W / 2 + 12, y, r: 14 });
      }
    };
    if (inside.length) row(inside, s.y - rad - 22, 4);
    if (outside.length) row(outside, s.y + rad + 36, 3);
  }

  drawArmy(ctx, a, x, y) {
    const f = Game.f(a.fid);
    const own = a.fid === this.P;
    const men = Game.armyMen(a);
    const sel = this.selArmy === a;
    const mpMax = Game.mpMax(a);
    const spent = own && a.mp <= 0;
    ctx.globalAlpha = spent ? 0.6 : 1;
    ctx.strokeStyle = '#2a1e12'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 16, y + 14); ctx.lineTo(x - 16, y - 11); ctx.stroke();
    const w = 32;
    ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.moveTo(x - 16, y - 11); ctx.lineTo(x - 16 + w, y - 11); ctx.lineTo(x - 16 + w - 5, y - 2); ctx.lineTo(x - 16 + w, y + 7); ctx.lineTo(x - 16, y + 7); ctx.closePath();
    ctx.fill();
    ctx.lineWidth = sel ? 2.5 : own && a.mp > 0 ? 2 : 1.2;
    ctx.strokeStyle = sel ? '#ffe38a' : own && a.mp > 0 ? `rgba(255,225,130,${0.6 + 0.4 * Math.sin(this.t * 4)})` : '#1e160e';
    ctx.stroke();
    ctx.font = '700 11px "Noto Naskh Arabic", Tahoma, sans-serif';
    ctx.fillStyle = isLight(f.color) ? '#1e160e' : '#fff8e8';
    const vis = own || Game.intelLevel(this.P, a.fid) >= 2 ? String(men) : '~' + Math.round(men / 50) * 50;
    ctx.fillText(vis, x - 1, y - 2);
    if (own) {
      for (let i = 0; i < mpMax; i++) {
        ctx.fillStyle = i < a.mp ? '#ffe38a' : 'rgba(30,20,10,.6)';
        ctx.fillRect(x - 13 + i * 5, y + 9, 3.5, 3.5);
      }
    }
    if (a.mood && a.mood.k === 'shaken') { ctx.font = '9px sans-serif'; ctx.fillText('😰', x + 14, y - 13); }
    if (a.siege && own) { ctx.font = '10px sans-serif'; ctx.fillText('⚔️', x + 14, y - 13); }
    ctx.globalAlpha = 1;
  }

  // ——— اللمس ———
  onTap(w, p) {
    if (this.busy) return;
    const score = (h2) => h2.d - (h2.kind === 'army' ? 8 : 0);
    const hits = (this.hits || []).map((h2) => ({ ...h2, d: Math.hypot(h2.x - p.x, h2.y - p.y) })).filter((h2) => h2.d < h2.r).sort((a, b) => score(a) - score(b));
    const hit = hits[0];
    if (this.selArmy && hit) {
      const n = hit.kind === 'node' ? hit.n : Game.node(hit.a.node);
      const isOwnHere = hit.kind === 'army' && hit.a.fid === this.P && hit.a.node === this.selArmy.node;
      if (n.id !== this.selArmy.node && !isOwnHere && Game.reach(this.selArmy)[n.id]) { this.tryMove(this.selArmy, n); return; }
    }
    if (!hit) {
      if (this.selArmy) { this.cancelMove(); return; }
      this.closeSheet();
      return;
    }
    if (hit.kind === 'army' && hit.a.fid === this.P) {
      if (this.selArmy === hit.a) this.cancelMove();
      else this.selectArmy(hit.a);
      return;
    }
    const n = hit.kind === 'node' ? hit.n : Game.node(hit.a.node);
    if (this.selArmy) this.cancelMove(true);
    this.selNode = n;
    this.openNode(n);
  }

  selectArmy(a) {
    this.selArmy = a;
    this.selNode = Game.node(a.node);
    if (a.mp <= 0) UI.toast('انتهت نقاط حركة هذا الجيش لهذا الدور');
    this.openNode(this.selNode);
    this.updateWidget();
  }
  cancelMove(silent) {
    this.selArmy = null;
    this.minimized = false;
    this.updateWidget();
    if (!silent && this.selNode) this.openNode(this.selNode);
  }

  updateWidget() {
    const w = this.widget;
    const a = this.selArmy;
    if (!a || !Game.S.armies.includes(a)) { w.hidden = true; if (this.minimized) { this.minimized = false; } return; }
    w.hidden = !this.minimized && !this.sheet.hidden;
    w.innerHTML = '';
    const g = Game.armyGen(a);
    w.append(
      h('span', { class: 'mw-ic' }, '🎯'),
      h('span', { class: 'mw-t' }, h('b', null, `جيش ${g ? g.name : ''}`), h('small', null, a.mp > 0 ? `اختر وجهة مضيئة · نقاط الحركة ${a.mp}/${Game.mpMax(a)}` : 'لا نقاط حركة متبقية')),
      h('button', { class: 'chip', onclick: () => { this.minimized = false; this.openNode(Game.node(a.node)); } }, 'اللوحة'),
      h('button', { class: 'chip warn', onclick: () => this.cancelMove() }, 'إلغاء'),
    );
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
      const hasCat = a.regs.some((r) => r.type === 'catapult');
      const eqNow = Game.hasTrait(a, 'siege');
      const choice = await UI.ask({
        title: `أسوار ${n.name}`,
        body: h('div', null,
          h('p', null, `مدينة ${Game.fname(n.owner)} محصّنة (${BUILDINGS.walls.name} ${n.walls}). ${eqNow ? 'مهندسك جاهز بالمعدات فوراً.' : ''}`),
          Panels.siegeMethods(n),
          Panels.powerCompare(Game.makeEnc('assault', [a], n.id), this.P),
        ),
        buttons: [
          { label: 'ضرب الحصار', value: 'siege', primary: true },
          { label: hasCat || eqNow ? 'حصار ثم اقتحام فوري' : 'اقتحام فوري (يحتاج منجنيق أو مهندس)', value: 'assault', disabled: !(hasCat || eqNow) },
          { label: 'إلغاء', value: 'cancel' },
        ],
      });
      if (choice === 'cancel') return;
      this.busy = true;
      try {
        const r = await Game.executeMove(a, n.id, { declare });
        if (r.err) UI.toast(r.err);
        else if (choice === 'assault') await Game.resolveEnc(Game.makeEnc('assault', Game.besiegers(n.id).filter((b) => b.fid === this.P), n.id));
      } finally { this.busy = false; }
      this.selArmy = null;
      this.afterAction(n);
      return;
    }
    this.busy = true;
    let r;
    try { r = await Game.executeMove(a, n.id, { declare }); } finally { this.busy = false; }
    if (r.err) { UI.toast(r.err); return; }
    if (r.cancel) { this.refresh(); return; }
    const alive = Game.S.armies.includes(a);
    if (!alive || a.mp <= 0 || a.siege || kind !== 'move') this.selArmy = null;
    this.afterAction(Game.node(alive ? a.node : n.id));
  }

  async runEnc(enc) {
    this.busy = true;
    try { await Game.resolveEnc(enc); } finally { this.busy = false; }
  }

  afterAction(focus) {
    Game.validate();
    Game.save();
    if (Game.S.over) { Panels.showEnd(this); return; }
    if (this.selArmy && !Game.S.armies.includes(this.selArmy)) this.selArmy = null;
    if (focus) this.selNode = focus;
    this.refresh();
    if (this.selNode && (!this.minimized || !this.selArmy)) this.openNode(this.selNode);
    this.updateWidget();
    Panels.captivePrompts(this);
  }

  // ——— الواجهة العلوية ———
  buildHud() {
    this.hud = {};
    this.hud.fac = h('span', { class: 'fac' });
    this.hud.gold = h('span', { class: 'res', dir: 'ltr' });
    this.hud.food = h('span', { class: 'res', dir: 'ltr' });
    this.hud.men = h('span', { class: 'res men', dir: 'ltr' });
    this.hud.date = h('span', { class: 'date' });
    const top = h('div', { class: 'c-top' },
      h('div', { class: 'c-stats' }, this.hud.fac, this.hud.gold, this.hud.food, this.hud.men, this.hud.date),
      h('div', { class: 'c-btns' },
        h('button', { class: 'icon-btn', title: 'نظرة عامة على الممالك', onclick: () => Panels.dashboard(this) }, '📊'),
        h('button', { class: 'icon-btn', title: 'الدبلوماسية', onclick: () => Panels.diplomacy(this) }, '🤝'),
        h('button', { class: 'icon-btn', title: 'المملكة والقادة', onclick: () => Panels.kingdom(this) }, '👑'),
        h('button', { class: 'icon-btn', title: 'سجل الأحداث', onclick: () => Panels.report(this, null, true) }, '📜'),
        h('button', { class: 'icon-btn', title: 'القائمة', onclick: () => Panels.menu(this) }, '☰'),
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
    this.hud.men.textContent = `👥 ${Game.manpowerOf(this.P)}`;
    this.hud.date.textContent = `${Game.season()} ${Game.year()}م`;
  }

  closeSheet() { this.sheet.hidden = true; this.selNode = null; if (!this.selArmy) this.minimized = false; this.updateWidget(); }
  minimizeSheet() { this.sheet.hidden = true; this.minimized = true; this.updateWidget(); }
  openNode(n) { Panels.city(this, n); this.updateWidget(); }

  // ——— نهاية الدور ———
  async endTurn() {
    if (this.busy || Game.S.over) return;
    const idle = Game.armiesOf(this.P).filter((a) => a.mp >= Game.mpMax(a) && a.regs.length && !a.siege && a.role !== 'governor');
    this.busy = true;
    this.selArmy = null; this.minimized = false;
    this.closeSheet();
    const mark = Game.S.log.length;
    const startTurn = Game.S.turn;
    const notes = [];
    this.notes = notes;
    try {
      for (const fid of Game.majors()) {
        if (fid === this.P || !Game.f(fid).alive) continue;
        this.banner.hidden = false;
        this.banner.textContent = `دور ${Game.fname(fid)}…`;
        await wait(250);
        await CampaignAI.turn(fid);
        this.refresh();
        if (Game.S.over) break;
      }
      this.banner.hidden = true;
      notes.push(...Game.endRound());
      Game.save();
      this.refresh();
      if (Game.S.over) { Panels.showEnd(this); return; }
      const logs = Game.S.log.slice(Math.min(mark, Game.S.log.length)).filter((l) => l.turn >= startTurn);
      Panels.report(this, { notes, logs, idle: idle.length });
    } finally {
      this.busy = false;
      this.banner.hidden = true;
      this.notes = null;
    }
  }
}

// ——— خطافات الحملة التي تحتاج اللاعب ———
function installHooks(scene) {
  Game.hooks.notify = (msg) => { if (scene.notes) scene.notes.push(msg); else UI.toast(msg); };
  Game.hooks.proposal = (p) => Panels.proposal(p);
  Game.hooks.occupation = (node, how) => Panels.occupation(node, how);
  Game.hooks.encounter = (enc) => Panels.encounter(scene, enc);
}

function launchBattle(enc, resolve) {
  const P = Game.S.player;
  const s = Game.encSides(enc);
  const skill = DIFFS[Game.S.difficulty].aiSkill;
  const moodOf = (armies, fid, defending) => {
    let m = 0;
    for (const a of armies) if (a.mood) m += { shaken: -10, hungry: -15, confident: 5 }[a.mood.k] / armies.length;
    if (defending && enc.kind === 'siege' && s.node.stores < 0) m -= 15;
    const F = Game.f(fid), other = fid === enc.attFid ? enc.defFid : enc.attFid;
    if (F && F.vendetta && F.vendetta[other] > 0) m += 10;
    return Math.round(m);
  };
  const side = (fid, regs, gens, armies, defending) => ({
    name: Game.fname(fid), color: Game.f(fid).color, player: fid === P, fid,
    regs: regs.filter((r) => r.men > 0),
    generals: gens.filter((g) => g.status === 'army').map((g) => ({ name: g.name, trait: g.trait, flaw: g.flaw, rank: g.rank, men: Game.genMen(g), ref: g, vendetta: g.vendetta })),
    morale: moodOf(armies, fid, defending),
    ai: fid === 'neutral' ? Math.min(skill, 0.45) : skill,
  });
  const terrain = enc.terrain || s.node.terrain;
  const cfg = {
    kind: enc.kind, terrain, walls: Game.effWalls(s.node), equip: enc.equip,
    seed: hashStr(s.node.id) + Game.S.turn * 131,
    ground: terrain === 'desert' ? 'sand' : Game.sc.battleGround,
    sides: [side(enc.attFid, s.attRegs, s.attGens, s.attArmies, false), side(enc.defFid, s.defRegs, s.defGens, s.defArmies, true)],
    capital: s.node.capital,
    title: s.node.name,
  };
  const camp = App.scene;
  const scene = new BattleScene(cfg, (res) => {
    const out = Game.battleOutcome(res);
    App.setScene(camp);
    resolve(out);
  });
  App.setScene(scene);
}
