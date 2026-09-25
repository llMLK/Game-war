'use strict';
// الخريطة المرسومة: أرض حيّة، مستوطنات تتطور بصرياً، معسكرات حصار، آثار الحروب

const MW = 1000, MH = 700;

class MapArt {
  // opts.colorOf(owner) → لون المالك
  constructor(sc, opts = {}) {
    this.sc = sc;
    this.colorOf = opts.colorOf || (() => '#8a8378');
    this.style = sc.id === 'threeKingdoms' ? 'east' : 'west';
    this.sprites = new Map();
    this.K = 5;
    this.terrSig = '';
    this.nodesDef = sc.nodes;
    // أبعاد الخريطة من السيناريو. الخرائط الكبيرة تُرسم بدقة أقل حتى تبقى ذاكرة الهاتف معقولة
    this.W = sc.w || MW; this.H = sc.h || MH;
    this.bgK = Math.min(2.5, Math.sqrt(4.4e6 / (this.W * this.H)));
    this.terrK = Math.min(2, Math.sqrt(3.5e6 / (this.W * this.H)));
    this.islands = sc.islands || [];
    this.layout = {};
    for (const n of sc.nodes) this.layout[n.id] = this.nodeLayout(n);
    this.bg = this.buildBg();
    this.terr = document.createElement('canvas');
    this.terr.width = Math.round(this.W * this.terrK); this.terr.height = Math.round(this.H * this.terrK);
  }

  // --- التخطيط الثابت لكل مدينة ---
  edgesOf(id) {
    const out = [];
    for (const e of this.sc.edges) {
      if (e[0] === id) out.push({ to: e[1], kind: e[2] || 'road' });
      else if (e[1] === id) out.push({ to: e[0], kind: e[2] || 'road' });
    }
    return out;
  }
  nodeLayout(n) {
    const angs = this.edgesOf(n.id).filter((e) => e.kind !== 'water').map((e) => {
      const m = this.sc.nodes.find((x) => x.id === e.to);
      return Math.atan2(m.y - n.y, m.x - n.x);
    });
    // البوابة نحو أول طريق بري
    const gate = angs.length ? angs[0] : Math.PI / 2;
    // اتجاه البحر: أقرب نقطة بحرية
    let sea = null, bd = 1e9;
    for (const poly of this.sc.seas) for (const [x, y] of poly) { const d = (x - n.x) ** 2 + (y - n.y) ** 2; if (d < bd) { bd = d; sea = Math.atan2(y - n.y, x - n.x); } }
    for (const e of this.edgesOf(n.id)) if (e.kind === 'water') { const m = this.sc.nodes.find((x) => x.id === e.to); sea = Math.atan2(m.y - n.y, m.x - n.x); }
    return { angs, gate, sea, seed: hashStr(n.id) };
  }

  // الطبقة: 0 قرية، 1 بلدة، 2 مدينة، 3 حاضرة
  tier(n) { return n.capital || n.pop >= 26000 ? 3 : n.pop >= 15000 ? 2 : n.pop >= 10000 ? 1 : 0; }
  rad(n) { return [12.5, 15, 17.5, 20.5][this.tier(n)] + (n.capital ? 1.5 : 0) + Math.min(n.walls || 0, 4) * 0.9; }

  // ----------- الخلفية المرسومة -----------
  buildBg() {
    const sc = this.sc, K = this.bgK, MW = this.W, MH = this.H;
    const cv = document.createElement('canvas');
    cv.width = MW * K; cv.height = MH * K;
    const g = cv.getContext('2d');
    g.scale(K, K);
    const r = rng(hashStr(sc.id + ':bg'));
    const nodes = sc.nodes;
    const nearNode = (x, y, d) => nodes.some((n) => (n.x - x) ** 2 + (n.y - y) ** 2 < d * d);
    const segD = (px, py, ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay; const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      return Math.hypot(px - ax - t * dx, py - ay - t * dy);
    };
    const edgesXY = sc.edges.filter((e) => (e[2] || 'road') !== 'water').map(([a, b]) => { const A = nodes.find((n) => n.id === a), B = nodes.find((n) => n.id === b); return [A.x, A.y, B.x, B.y]; });
    const nearRoad = (x, y, d) => edgesXY.some(([ax, ay, bx, by]) => segD(x, y, ax, ay, bx, by) < d);
    const inSea = (x, y) => sc.seas.some((p) => pip(p, x, y)) && !this.islands.some((p) => pip(p, x, y));
    const inDesert = (x, y) => (sc.deserts || []).some((p) => pip(p, x, y));
    const path = (poly) => { g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };

    // الأرض
    const base = g.createLinearGradient(0, 0, MW, MH);
    base.addColorStop(0, this.style === 'east' ? '#d9cea3' : '#d9c594');
    base.addColorStop(1, this.style === 'east' ? '#cdbf92' : '#cfb682');
    g.fillStyle = base; g.fillRect(0, 0, MW, MH);
    // بقع لونية حسب التضاريس
    const tint = { forest: 'rgba(96,128,68,.30)', hills: 'rgba(140,138,80,.22)', mountains: 'rgba(120,105,85,.26)', plains: 'rgba(150,170,90,.16)', river: 'rgba(120,160,95,.2)', coast: 'rgba(200,190,140,.18)', desert: 'rgba(225,195,130,.3)' };
    for (const n of nodes) {
      const rr = 80 + r() * 40;
      const gr = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, rr);
      gr.addColorStop(0, tint[n.terrain] || 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(n.x - rr, n.y - rr, rr * 2, rr * 2);
    }
    const area = (MW * MH) / 700000;
    for (let i = 0; i < Math.round(26 * area); i++) {
      const x = r() * MW, y = r() * MH, rr = 40 + r() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, r() < 0.55 ? 'rgba(120,150,80,.10)' : 'rgba(150,110,60,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    // حبيبات الورق
    // حبيبات الورق: مربّع صغير يتكرر بدل عشرات آلاف النقاط
    const tile = document.createElement('canvas'); tile.width = tile.height = 200;
    const tgc = tile.getContext('2d');
    for (let i = 0; i < 800; i++) { tgc.fillStyle = r() < 0.5 ? 'rgba(90,70,40,.06)' : 'rgba(255,250,230,.07)'; tgc.fillRect(r() * 200, r() * 200, 0.6 + r() * 1.8, 0.6 + r() * 1.8); }
    g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, MW, MH);
    // الصحارى
    for (const poly of sc.deserts || []) {
      // حافة ذائبة: القناع يُرسم صغيراً ثم يُكبَّر فتتلاشى حافته في الأرض بلا خط
      const f = 12, mk = document.createElement('canvas');
      mk.width = Math.ceil(MW / f); mk.height = Math.ceil(MH / f);
      const mg = mk.getContext('2d');
      mg.scale(1 / f, 1 / f); mg.fillStyle = 'rgba(232,203,140,.6)';
      mg.beginPath(); poly.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fill();
      g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(mk, 0, 0, MW, MH); g.restore();
      g.save(); path(poly); g.clip();
      for (let i = 0; i < 260; i++) {
        const x = r() * MW, y = r() * MH, w = 6 + r() * 12;
        g.strokeStyle = 'rgba(170,125,65,.35)'; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - w * 0.35, x + w, y); g.stroke();
        g.strokeStyle = 'rgba(255,240,200,.35)'; g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(x + 1, y + 1.2); g.quadraticCurveTo(x + w / 2, y - w * 0.25, x + w - 1, y + 1.2); g.stroke();
      }
      g.restore();
    }
    // شريط رملي على الشاطئ قبل الماء
    for (const poly of sc.seas) {
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(232,214,166,.9)'; g.lineWidth = 9; path(poly); g.stroke();
      g.strokeStyle = 'rgba(200,175,120,.5)'; g.lineWidth = 12; g.setLineDash([2, 5]); path(poly); g.stroke(); g.setLineDash([]);
    }
    // البحار: عمق، ضحالة، ساحل مزدوج، أمواج
    for (const poly of sc.seas) {
      g.save(); path(poly);
      g.fillStyle = '#6a8e96'; g.fill();
      g.clip();
      g.strokeStyle = 'rgba(150,190,185,.55)'; g.lineWidth = 16; path(poly); g.stroke();
      g.strokeStyle = 'rgba(175,210,200,.45)'; g.lineWidth = 7; path(poly); g.stroke();
      for (let i = 0; i < 220; i++) {
        const x = r() * MW, y = r() * MH;
        if (!pip(poly, x, y)) continue;
        g.strokeStyle = 'rgba(235,245,240,.22)'; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 3, y - 2.2, x + 6, y); g.quadraticCurveTo(x + 9, y + 2.2, x + 12, y); g.stroke();
      }
      g.restore();
      g.strokeStyle = 'rgba(45,58,60,.75)'; g.lineWidth = 1.6; path(poly); g.stroke();
    }
    // الجزر: أرض فوق البحر بشاطئ رملي وخط ساحل
    for (const poly of this.islands) {
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(150,190,185,.55)'; g.lineWidth = 10; path(poly); g.stroke();
      g.strokeStyle = 'rgba(232,214,166,.95)'; g.lineWidth = 5; path(poly); g.stroke();
      g.fillStyle = this.style === 'east' ? '#d4c89c' : '#d4bf8c'; path(poly); g.fill();
      g.strokeStyle = 'rgba(45,58,60,.7)'; g.lineWidth = 1.3; path(poly); g.stroke();
    }
    // الأنهار: مجرى متعرّج ناعم يتسع مع الجريان، وسهل فيضي أخضر على ضفتيه (الأنهار تسقي الزرع وتعيق العبور)
    const meander = (rv) => {
      const out = [rv[0]];
      for (let i = 1; i < rv.length; i++) {
        const [ax, ay] = rv[i - 1], [bx, by] = rv[i];
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
        const k = Math.max(2, Math.round(L / 22));
        for (let j = 1; j <= k; j++) {
          const t = j / k, off = j === k ? 0 : Math.sin(t * Math.PI * 2 + i) * (3 + r() * 3);
          out.push([ax + dx * t + nx * off, ay + dy * t + ny * off]);
        }
      }
      return out;
    };
    const smooth = (pts) => {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
      const e = pts[pts.length - 1]; g.lineTo(e[0], e[1]);
    };
    const rivers = sc.rivers.map(meander);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const rv of rivers) { g.strokeStyle = 'rgba(120,150,80,.16)'; g.lineWidth = 22; smooth(rv); g.stroke(); g.strokeStyle = 'rgba(120,150,80,.14)'; g.lineWidth = 11; smooth(rv); g.stroke(); }
    for (const rv of rivers) {
      // عرض متدرج: نقسم المجرى أجزاء يتسع كل منها قليلاً
      const parts = 6;
      for (let pass = 0; pass < 3; pass++) {
        for (let q = 0; q < parts; q++) {
          const a = Math.floor(q * (rv.length - 1) / parts), b = Math.min(rv.length - 1, Math.floor((q + 1) * (rv.length - 1) / parts) + 1);
          const w = 1.5 + (q + 0.5) / parts * 3.6;
          g.strokeStyle = pass === 0 ? 'rgba(55,75,72,.42)' : pass === 1 ? '#7aa3a8' : 'rgba(220,240,238,.38)';
          g.lineWidth = pass === 0 ? w + 2 : pass === 1 ? w : w * 0.28;
          smooth(rv.slice(a, b + 1)); g.stroke();
        }
      }
    }
    // تلال حول مدن التلال
    const hill = (x, y, s) => {
      g.fillStyle = 'rgba(120,110,70,.35)';
      g.beginPath(); g.ellipse(x, y + s * 0.15, s * 1.2, s * 0.45, 0, 0, TAU); g.fill();
      g.fillStyle = '#b3a36e';
      g.beginPath(); g.moveTo(x - s * 1.1, y + s * 0.2); g.quadraticCurveTo(x - s * 0.2, y - s * 0.95, x + s * 1.1, y + s * 0.2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(90,75,45,.55)'; g.lineWidth = 0.7;
      for (let k = 0; k < 4; k++) { const hx = x + s * (0.1 + k * 0.22); g.beginPath(); g.moveTo(hx, y - s * 0.35 + k * 0.1 * s); g.lineTo(hx + s * 0.12, y + s * 0.12); g.stroke(); }
    };
    // جبال مرسومة: ضوء من الشمال الغربي، وجه مضاء ووجه في الظل، وثلج على القمم العالية فقط
    const peak = (x, y, s) => {
      const tw = 0.18 * (r() - 0.5) * s, top = [x + tw, y - s], L = [x - s, y + s * 0.6], Rr = [x + s, y + s * 0.6];
      const mid = [x + tw * 0.4 + s * 0.08, y + s * 0.6];
      g.fillStyle = 'rgba(60,45,30,.22)';
      g.beginPath(); g.ellipse(x + s * 0.25, y + s * 0.64, s * 1.2, s * 0.28, 0, 0, TAU); g.fill();
      g.fillStyle = '#7d6b54';
      g.beginPath(); g.moveTo(...L); g.lineTo(...top); g.lineTo(...Rr); g.closePath(); g.fill();
      g.fillStyle = '#b8a688';
      g.beginPath(); g.moveTo(...L); g.lineTo(...top); g.lineTo(...mid); g.closePath(); g.fill();
      // أخاديد في وجه الظل
      g.strokeStyle = 'rgba(55,42,28,.35)'; g.lineWidth = 0.5;
      for (let k = 1; k <= 2; k++) { g.beginPath(); g.moveTo(top[0] + s * 0.12 * k, top[1] + s * 0.45 * k); g.lineTo(top[0] + s * 0.28 * k, y + s * 0.55); g.stroke(); }
      if (s > 10.5) {
        g.fillStyle = 'rgba(248,245,236,.95)';
        g.beginPath(); g.moveTo(top[0] - s * 0.3, top[1] + s * 0.48); g.lineTo(...top); g.lineTo(top[0] + s * 0.3, top[1] + s * 0.48); g.lineTo(top[0] + s * 0.1, top[1] + s * 0.56); g.lineTo(top[0] - s * 0.05, top[1] + s * 0.44); g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(50,38,25,.62)'; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(...L); g.lineTo(...top); g.lineTo(...Rr); g.stroke();
    };
    // كتلة سلسلة جبلية تحت القمم: الأرض ترتفع قبل الصخر
    const massif = (x, y, w, hgt) => {
      const gr = g.createRadialGradient(x, y, 2, x, y, w);
      gr.addColorStop(0, 'rgba(125,105,80,.34)'); gr.addColorStop(0.6, 'rgba(140,120,90,.18)'); gr.addColorStop(1, 'rgba(140,120,90,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, w, hgt, 0, 0, TAU); g.fill();
    };
    for (const [mx, my] of sc.mountains) massif(mx, my + 4, 46, 26);
    // أشجار
    const tree = (x, y, s, kind) => {
      g.fillStyle = 'rgba(40,50,25,.28)';
      g.beginPath(); g.ellipse(x + s * 0.25, y + s * 0.9, s * 0.8, s * 0.28, 0, 0, TAU); g.fill();
      if (kind === 'palm') {
        g.strokeStyle = '#7a5a36'; g.lineWidth = s * 0.25;
        g.beginPath(); g.moveTo(x, y + s); g.quadraticCurveTo(x + s * 0.2, y, x - s * 0.1, y - s * 0.6); g.stroke();
        g.strokeStyle = '#5d7d3c'; g.lineWidth = s * 0.3; g.lineCap = 'round';
        for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.7; g.beginPath(); g.moveTo(x - s * 0.1, y - s * 0.6); g.quadraticCurveTo(x - s * 0.1 + Math.cos(a) * s * 0.7, y - s * 0.6 + Math.sin(a) * s * 0.7 - s * 0.2, x - s * 0.1 + Math.cos(a) * s, y - s * 0.6 + Math.sin(a) * s * 0.9 + s * 0.3); g.stroke(); }
        return;
      }
      g.fillStyle = '#6b4e2e'; g.fillRect(x - s * 0.08, y + s * 0.3, s * 0.16, s * 0.6);
      if (kind === 'pine') {
        g.fillStyle = '#4d6b3a';
        g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.55, y + s * 0.45); g.lineTo(x - s * 0.55, y + s * 0.45); g.closePath(); g.fill();
        g.fillStyle = 'rgba(160,190,110,.35)';
        g.beginPath(); g.moveTo(x, y - s); g.lineTo(x - s * 0.1, y + s * 0.4); g.lineTo(x - s * 0.55, y + s * 0.45); g.closePath(); g.fill();
      } else {
        g.fillStyle = '#5a7a40';
        g.beginPath(); g.arc(x, y - s * 0.1, s * 0.55, 0, TAU); g.fill();
        g.fillStyle = 'rgba(170,200,120,.4)';
        g.beginPath(); g.arc(x - s * 0.16, y - s * 0.26, s * 0.28, 0, TAU); g.fill();
      }
    };
    const items = [];
    const place = (x, y, fn) => { if (!inSea(x, y)) items.push({ x, y, fn }); };
    for (const n of nodes) {
      const ringFree = (d) => { const a = r() * TAU, rr = d[0] + r() * (d[1] - d[0]); return [n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr * 0.85]; };
      if (n.terrain === 'forest') for (let i = 0; i < 46; i++) { const [x, y] = ringFree([26, 72]); if (!nearRoad(x, y, 6) && !nearNode(x, y, 24)) place(x, y, () => tree(x, y, 3.2 + r() * 2, this.style === 'east' && r() < 0.5 ? 'round' : 'pine')); }
      if (n.terrain === 'hills') for (let i = 0; i < 9; i++) { const [x, y] = ringFree([28, 62]); if (!nearRoad(x, y, 8) && !nearNode(x, y, 26)) place(x, y, () => hill(x, y, 6 + r() * 4)); }
      if (n.terrain === 'mountains') for (let i = 0; i < 9; i++) { const [x, y] = ringFree([30, 64]); if (!nearRoad(x, y, 9) && !nearNode(x, y, 28)) place(x, y, () => peak(x, y, 8 + r() * 5)); }
      if (n.terrain === 'desert') for (let i = 0; i < 5; i++) { const [x, y] = ringFree([22, 34]); if (!nearRoad(x, y, 5) && !nearNode(x, y, 20)) place(x, y, () => tree(x, y, 3.4 + r() * 1.5, 'palm')); }
      if (n.terrain === 'plains' || n.terrain === 'river') for (let i = 0; i < 12; i++) { const [x, y] = ringFree([30, 80]); if (!nearRoad(x, y, 5) && !nearNode(x, y, 26) && !inDesert(x, y)) place(x, y, () => tree(x, y, 2.6 + r() * 1.4, 'round')); }
    }
    for (const [mx, my] of sc.mountains) {
      for (let k = 0; k < 5; k++) {
        const x = mx + (r() - 0.5) * 56, y = my + (r() - 0.5) * 34;
        if (nearNode(x, y, 26) || nearRoad(x, y, 8)) continue;
        const s = 9 + r() * 8;
        place(x, y, () => peak(x, y, s));
      }
    }
    // غابات مبعثرة
    for (let c = 0; c < Math.round(10 * area); c++) {
      const cx = r() * MW, cy = r() * MH;
      if (inSea(cx, cy) || inDesert(cx, cy) || nearNode(cx, cy, 40)) continue;
      for (let i = 0; i < 14; i++) {
        const x = cx + (r() - 0.5) * 50, y = cy + (r() - 0.5) * 30;
        if (nearRoad(x, y, 6) || nearNode(x, y, 26)) continue;
        place(x, y, () => tree(x, y, 2.8 + r() * 1.6, r() < 0.5 ? 'pine' : 'round'));
      }
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();
    // وردة الرياح في أكبر بحر
    const bigSea = [...sc.seas].sort((a, b) => b.length - a.length)[0];
    if (bigSea) {
      let cx = 0, cy = 0;
      for (const [x, y] of bigSea) { cx += x; cy += y; }
      cx /= bigSea.length; cy /= bigSea.length;
      if (pip(bigSea, cx, cy)) this.compass(g, cx, cy, 26);
      for (let i = 0; i < 2; i++) {
        const x = cx + (r() - 0.5) * 120, y = cy + (r() - 0.5) * 120;
        if (pip(bigSea, x, y) && Math.hypot(x - cx, y - cy) > 40) drawIcon(g, 'ship', x, y, 12, 'rgba(50,40,30,.55)');
      }
    }
    // إطار الخريطة
    const vg = g.createRadialGradient(MW / 2, MH / 2, MH * 0.4, MW / 2, MH / 2, MW * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,35,12,.28)');
    g.fillStyle = vg; g.fillRect(0, 0, MW, MH);
    g.strokeStyle = 'rgba(70,45,20,.85)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, MW - 3, MH - 3);
    g.strokeStyle = 'rgba(70,45,20,.5)'; g.lineWidth = 0.8; g.strokeRect(6, 6, MW - 12, MH - 12);
    return cv;
  }

  compass(g, x, y, s) {
    g.save(); g.translate(x, y);
    g.strokeStyle = 'rgba(50,40,30,.55)'; g.lineWidth = 0.8;
    g.beginPath(); g.arc(0, 0, s * 0.72, 0, TAU); g.stroke();
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, L = k % 2 ? s * 0.55 : s;
      g.fillStyle = k % 2 ? 'rgba(60,45,30,.45)' : 'rgba(60,45,30,.7)';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.18) * L * 0.3, Math.sin(a - 0.18) * L * 0.3); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.lineTo(Math.cos(a + 0.18) * L * 0.3, Math.sin(a + 0.18) * L * 0.3); g.closePath(); g.fill();
    }
    g.restore();
  }

  // ----------- الأقاليم والحدود -----------
  // nodes: [{id,x,y,owner}]
  renderTerritory(nodes) {
    const sig = nodes.map((n) => n.owner).join(',');
    if (sig === this.terrSig) return;
    this.terrSig = sig;
    const C = 4, W = Math.ceil(this.W / C), H = Math.ceil(this.H / C), isl = this.islands;
    const cv = this.terr, g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    const seas = this.sc.seas;
    const cols = {};
    for (const n of nodes) cols[n.owner] = cols[n.owner] || hexRgb(this.colorOf(n.owner));
    const tiny = document.createElement('canvas'); tiny.width = W; tiny.height = H;
    const tg = tiny.getContext('2d');
    const img = tg.createImageData(W, H);
    const near = new Int16Array(W * H).fill(-1);
    // الجزء الثابت يُحسب مرة واحدة: اليابسة، وأقرب ست مدن لكل خلية ومسافاتها. بعدها تتغير الملكية وحدها
    const idSig = nodes.map((n) => n.id).join(',');
    if (!this.cells || this.cells.sig !== idSig) {
      const KN = 6, nn = new Int16Array(W * H * KN).fill(-1), nd = new Float32Array(W * H * KN);
      // قناع البحر يُرسم على لوحة صغيرة بدقة الخلايا ويُقرأ مرة واحدة (أسرع بكثير من اختبار كل خلية)
      const mc = document.createElement('canvas'); mc.width = W; mc.height = H;
      const mg = mc.getContext('2d');
      mg.setTransform(1 / C, 0, 0, 1 / C, 0, 0);
      const poly = (pts) => { mg.beginPath(); pts.forEach(([px, py], j) => (j ? mg.lineTo(px, py) : mg.moveTo(px, py))); mg.closePath(); };
      mg.fillStyle = '#000'; for (const p of seas) { poly(p); mg.fill(); }
      mg.globalCompositeOperation = 'destination-out'; for (const p of isl) { poly(p); mg.fill(); }
      const sea = mg.getImageData(0, 0, W, H).data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const wx = x * C + C / 2, wy = y * C + C / 2, i = y * W + x;
        if (sea[i * 4 + 3] > 127) continue;
        for (let k = 0; k < nodes.length; k++) {
          const d = (nodes[k].x - wx) ** 2 + (nodes[k].y - wy) ** 2;
          let j = KN - 1;
          if (nn[i * KN + j] >= 0 && d >= nd[i * KN + j]) continue;
          while (j > 0 && (nn[i * KN + j - 1] < 0 || d < nd[i * KN + j - 1])) { nn[i * KN + j] = nn[i * KN + j - 1]; nd[i * KN + j] = nd[i * KN + j - 1]; j--; }
          nn[i * KN + j] = k; nd[i * KN + j] = d;
        }
      }
      this.cells = { sig: idSig, KN, nn, nd };
    }
    const { KN, nn, nd } = this.cells;
    for (let i = 0; i < W * H; i++) {
      const a = nn[i * KN], da = nd[i * KN];
      if (a < 0 || da > 160 * 160) continue;
      near[i] = a;
      const A = nodes[a];
      let dborder = 1e9;
      for (let k = 1; k < KN; k++) {
        const b = nn[i * KN + k];
        if (b < 0) break;
        const B = nodes[b];
        if (B.owner === A.owner) continue;
        const ab = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        dborder = Math.min(dborder, (nd[i * KN + k] - da) / (2 * ab));
      }
      const c = cols[A.owner];
      const fade = clamp(1 - (Math.sqrt(da) - 110) / 50, 0, 1);
      const band = clamp(1 - dborder / 16, 0, 1);
      img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2];
      // المدن المستقلة بلا لون مملكة تقريباً: أرضها لا تبدو كتلة رمادية
      img.data[i * 4 + 3] = Math.round((A.owner === 'neutral' ? 8 + band * 22 : 30 + band * 60) * fade);
    }
    tg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(tiny, 0, 0, cv.width, cv.height);
    // حدود سياسية دقيقة على منصّفات المواقع
    const K = cv.width / this.W;
    g.setTransform(K, 0, 0, K, 0, 0);
    g.lineCap = 'round';
    const seg = (A, B, cx, cy, vertical) => {
      // المنصّف: (B-A)·p = (|B|²-|A|²)/2 ، نرسم منه القطعة المحلية فقط
      const nx = B.x - A.x, ny = B.y - A.y, c = (B.x * B.x + B.y * B.y - A.x * A.x - A.y * A.y) / 2;
      let p, q;
      if (vertical) {
        if (Math.abs(nx) < 1e-6) return;
        const y0 = cy - C / 2 - 0.3, y1 = cy + C / 2 + 0.3;
        p = [(c - ny * y0) / nx, y0]; q = [(c - ny * y1) / nx, y1];
        if (Math.abs(p[0] - cx) > C * 1.2 || Math.abs(q[0] - cx) > C * 1.2) return;
      } else {
        if (Math.abs(ny) < 1e-6) return;
        const x0 = cx - C / 2 - 0.3, x1 = cx + C / 2 + 0.3;
        p = [x0, (c - nx * x0) / ny]; q = [x1, (c - nx * x1) / ny];
        if (Math.abs(p[1] - cy) > C * 1.2 || Math.abs(q[1] - cy) > C * 1.2) return;
      }
      // خط رفيع بلون كل مملكة على جانبها وخيط داكن في المنتصف. المدن المستقلة بلا خط ملوّن،
      // والألوان الفاتحة أخف حتى لا تبدو الحدود سوراً أبيض
      const L = Math.hypot(nx, ny), ox = nx / L * 0.7, oy = ny / L * 0.7;
      const side = (o, sx) => {
        if (o === 'neutral') return;
        const c = cols[o], light = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11 > 170;
        g.strokeStyle = `rgba(${c.join(',')},${light ? 0.55 : 0.9})`; g.lineWidth = light ? 0.7 : 1;
        g.beginPath(); g.moveTo(p[0] + sx * ox, p[1] + sx * oy); g.lineTo(q[0] + sx * ox, q[1] + sx * oy); g.stroke();
      };
      side(A.owner, -1); side(B.owner, 1);
      g.strokeStyle = 'rgba(40,28,16,.5)'; g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = near[y * W + x];
      if (a < 0) continue;
      if (x + 1 < W) {
        const b = near[y * W + x + 1];
        if (b >= 0 && b !== a && nodes[a].owner !== nodes[b].owner) seg(nodes[a], nodes[b], (x + 1) * C, y * C + C / 2, true);
      }
      if (y + 1 < H) {
        const b = near[(y + 1) * W + x];
        if (b >= 0 && b !== a && nodes[a].owner !== nodes[b].owner) seg(nodes[a], nodes[b], x * C + C / 2, (y + 1) * C, false);
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ----------- رسم المستوطنة (مخزّنة) -----------
  spriteKey(n, ruined) {
    return [n.id, this.tier(n), n.walls, n.market || 0, n.farm || 0, n.granary || 0, n.barracks || 0, n.port || 0, n.capital ? 1 : 0, ruined ? 1 : 0].join('|');
  }
  sprite(n, ruined) {
    const key = this.spriteKey(n, ruined);
    let sp = this.sprites.get(n.id);
    if (sp && sp.key === key) return sp;
    const R = this.rad(n);
    const S = Math.ceil(R + 26);
    const K = this.K;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S * 2 * K;
    const g = cv.getContext('2d');
    g.setTransform(K, 0, 0, K, S * K, S * K);
    this.drawSettlement(g, n, R, ruined);
    sp = { key, cv, S };
    this.sprites.set(n.id, sp);
    return sp;
  }

  drawSettlement(g, n, R, ruined) {
    const L = this.layout[n.id] || this.nodeLayout(n);
    const r = rng(L.seed);
    const east = this.style === 'east';
    const tier = this.tier(n);
    const walls = Math.min(4, n.walls || 0);
    const avoid = (a) => L.angs.some((b) => Math.abs(angDiff(a, b)) < 0.42);
    // الحقول حول المدينة
    const fields = 2 + (n.farm || 0) * 3 + (tier === 0 ? 1 : 0);
    let placed = 0;
    for (let k = 0; k < 40 && placed < fields; k++) {
      const a = r() * TAU;
      if (avoid(a) || (L.sea != null && Math.abs(angDiff(a, L.sea)) < 0.6)) continue;
      const d = R + 5 + r() * 10;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9;
      const w = 7 + r() * 5, hgt = 5 + r() * 3;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2 + (r() - 0.5) * 0.4);
      g.fillStyle = ['#a8b86a', '#d6c27a', '#93a85c', '#c9b56c'][placed % 4];
      g.globalAlpha = 0.88;
      g.fillRect(-w / 2, -hgt / 2, w, hgt);
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(90,80,40,.35)'; g.lineWidth = 0.35;
      for (let f = -w / 2 + 1.2; f < w / 2; f += 1.3) { g.beginPath(); g.moveTo(f, -hgt / 2); g.lineTo(f, hgt / 2); g.stroke(); }
      g.strokeStyle = 'rgba(80,65,35,.5)'; g.lineWidth = 0.4; g.strokeRect(-w / 2, -hgt / 2, w, hgt);
      g.restore();
      placed++;
    }
    // الميناء والسفن
    if (n.port && L.sea != null) {
      const a = L.sea;
      const x0 = Math.cos(a) * (R - 2), y0 = Math.sin(a) * (R - 2);
      const x1 = Math.cos(a) * (R + 13), y1 = Math.sin(a) * (R + 13);
      g.strokeStyle = '#6b4a2a'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      const px = -Math.sin(a), py = Math.cos(a);
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x1 - px * 4, y1 - py * 4); g.lineTo(x1 + px * 4, y1 + py * 4); g.stroke();
      drawIcon(g, 'ship', x1 + px * 7 + Math.cos(a) * 3, y1 + py * 7 + Math.sin(a) * 3, 9, '#4a3a2a');
      drawIcon(g, 'ship', x1 - px * 7 + Math.cos(a) * 5, y1 - py * 7 + Math.sin(a) * 5, 7.5, '#4a3a2a');
    }
    // أرضية المدينة
    const gr = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R + 4);
    gr.addColorStop(0, 'rgba(196,170,120,.95)'); gr.addColorStop(0.75, 'rgba(176,150,105,.85)'); gr.addColorStop(1, 'rgba(160,135,95,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R + 4, 0, TAU); g.fill();
    // الإسطبلات والورش: ساحة تدريب وخيام خارج السور
    if (n.barracks) {
      let a = L.gate + 0.9;
      if (avoid(a)) a = L.gate - 0.9;
      const x = Math.cos(a) * (R + 7), y = Math.sin(a) * (R + 6);
      g.fillStyle = 'rgba(150,120,80,.85)'; g.beginPath(); g.ellipse(x, y, 6.5, 4.5, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(90,65,40,.7)'; g.lineWidth = 0.5; g.stroke();
      for (let k = 0; k < 3; k++) this.tent(g, x - 3.6 + k * 3.6, y - 0.6 + (k % 2) * 1.6, 2.1, '#efe5cc');
    }
    // الأزقة
    g.strokeStyle = 'rgba(235,220,185,.7)'; g.lineWidth = tier >= 2 ? 1.6 : 1.1;
    g.beginPath(); g.moveTo(Math.cos(L.gate) * R, Math.sin(L.gate) * R); g.lineTo(-Math.cos(L.gate) * R * 0.6, -Math.sin(L.gate) * R * 0.6); g.stroke();
    if (tier >= 1) { const a2 = L.gate + Math.PI / 2; g.beginPath(); g.moveTo(Math.cos(a2) * R * 0.8, Math.sin(a2) * R * 0.8); g.lineTo(-Math.cos(a2) * R * 0.8, -Math.sin(a2) * R * 0.8); g.stroke(); }
    // السور (الحلقة الخلفية)
    const ring = this.wallRing(L, walls >= 3 ? R + 1 : R, r);
    if (walls >= 3) { g.strokeStyle = 'rgba(80,120,125,.55)'; g.lineWidth = 2.4; this.poly(g, this.wallRing(L, R + 4.2, rng(L.seed + 7))); g.stroke(); }
    if (walls >= 1) this.drawWall(g, ring, walls, L, 'back');
    // البيوت
    const count = [7, 12, 18, 26][tier] + (n.capital ? 4 : 0);
    const houses = [];
    const inner = walls >= 1 ? R - 2.6 : R - 1;
    const centerFree = tier >= 2 || n.capital || walls >= 4 ? R * 0.34 : 0;
    for (let k = 0; k < 400 && houses.length < count; k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * inner;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.92;
      if (Math.hypot(x, y) < centerFree) continue;
      if (houses.some((q) => Math.abs(q.x - x) < 3.8 && Math.abs(q.y - y) < 3.2)) continue;
      houses.push({ x, y, w: 2.8 + r() * 1.8, d: 2.2 + r() * 1.3, dome: !east && r() < 0.12 });
    }
    // السوق: مظلات ملوّنة
    const stalls = [];
    for (let k = 0; k < (n.market || 0) * 3; k++) {
      const a = L.gate + (r() - 0.5) * 1.6, d = R * (0.35 + r() * 0.3);
      stalls.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.9, c: ['#b8412f', '#d9a53a', '#3f6fa0', '#4c8a66'][k % 4] });
    }
    // المخازن: صوامع
    const silos = [];
    for (let k = 0; k < (n.granary || 0); k++) { const a = L.gate + Math.PI + (k ? 0.6 : -0.3); silos.push({ x: Math.cos(a) * inner * 0.7, y: Math.sin(a) * inner * 0.65 }); }
    const all = [...houses.map((q) => ({ ...q, k: 'h' })), ...stalls.map((q) => ({ ...q, k: 's' })), ...silos.map((q) => ({ ...q, k: 'g' }))];
    if (tier >= 2 || n.capital) all.push({ x: 0, y: 0, k: walls >= 4 ? 'keep' : 'palace' });
    else if (walls >= 4) all.push({ x: 0, y: 0, k: 'keep' });
    all.sort((a, b) => a.y - b.y);
    for (const q of all) {
      if (q.k === 'h') this.house(g, q, east, ruined && r() < 0.6);
      else if (q.k === 's') this.stall(g, q);
      else if (q.k === 'g') this.silo(g, q);
      else if (q.k === 'palace') this.palace(g, east, tier, ruined);
      else this.keep(g, R, east);
    }
    if (walls >= 1) this.drawWall(g, ring, walls, L, 'front');
    // أنقاض بعد النهب
    if (ruined) {
      g.fillStyle = 'rgba(40,30,20,.35)';
      for (let k = 0; k < 10; k++) { const a = r() * TAU, d = r() * inner; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 0.8 + r() * 1.4, 0, TAU); g.fill(); }
    }
  }

  wallRing(L, R, r) {
    const pts = [];
    const n = 10;
    for (let k = 0; k < n; k++) {
      const a = L.gate + k / n * TAU;
      const rr = R * (0.94 + r() * 0.08);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.92]);
    }
    return pts;
  }
  poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }

  // الجزء الخلفي أولاً ثم الأمامي فوق البيوت (إحساس بالعمق)
  drawWall(g, pts, lvl, L, part) {
    const n = pts.length;
    const front = (i) => (pts[i][1] + pts[(i + 1) % n][1]) / 2 > 0;
    for (let i = 0; i < n; i++) {
      if (i === 0) continue; // البوابة
      if ((part === 'front') !== front(i)) continue;
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
      if (lvl === 1) {
        g.strokeStyle = '#6b4a2a'; g.lineWidth = 1.5; g.setLineDash([0.9, 0.6]);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
      } else {
        const w = lvl >= 3 ? 2.8 : 2.1;
        g.strokeStyle = '#4a4034'; g.lineWidth = w + 1;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = lvl >= 4 ? '#b3a88f' : '#a89c84'; g.lineWidth = w;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = 'rgba(245,238,220,.55)'; g.lineWidth = 0.5; g.setLineDash([0.7, 0.7]);
        g.beginPath(); g.moveTo(x0, y0 - w * 0.35); g.lineTo(x1, y1 - w * 0.35); g.stroke(); g.setLineDash([]);
      }
    }
    // الأبراج
    if (lvl >= 2) {
      const every = lvl >= 3 ? 1 : 2;
      for (let i = 1; i < n; i++) {
        if (i % every && i !== 1 && i !== n - 1) continue;
        const [x, y] = pts[i];
        if ((part === 'front') !== (y > 0)) continue;
        this.towerAt(g, x, y, lvl >= 3 ? 2.2 : 1.8, lvl);
      }
    }
    // البوابة
    if (part === 'front' || pts[0][1] <= 0) {
      const [x0, y0] = pts[0], [x1, y1] = pts[1], [xl, yl] = pts[n - 1];
      if ((part === 'front') === (y0 > 0)) {
        if (lvl >= 2) {
          this.towerAt(g, (x0 + x1) / 2 * 0.98 + x1 * 0.02, (y0 + y1) / 2, lvl >= 3 ? 2.4 : 2, lvl);
          this.towerAt(g, (x0 + xl) / 2, (y0 + yl) / 2, lvl >= 3 ? 2.4 : 2, lvl);
        } else {
          g.fillStyle = '#6b4a2a'; g.fillRect(x0 - 1, y0 - 1, 2, 2);
        }
      }
    }
  }
  towerAt(g, x, y, s, lvl) {
    g.fillStyle = '#453b30'; g.fillRect(x - s - 0.4, y - s * 1.6 - 0.4, s * 2 + 0.8, s * 2.2 + 0.8);
    g.fillStyle = lvl >= 4 ? '#c2b79d' : '#b0a48b'; g.fillRect(x - s, y - s * 1.6, s * 2, s * 2.2);
    g.fillStyle = '#8a7d67'; g.fillRect(x - s, y + s * 0.2, s * 2, s * 0.4);
    g.fillStyle = '#453b30';
    for (let k = -1; k <= 1; k += 2) g.fillRect(x + k * s * 0.55 - 0.35, y - s * 1.6 - 0.8, 0.7, 0.8);
  }
  house(g, q, east, burnt) {
    const { x, y, w, d } = q;
    g.fillStyle = 'rgba(40,28,15,.28)'; g.fillRect(x - w / 2 + 0.6, y - d / 2 + 0.8, w, d);
    if (east) {
      g.fillStyle = burnt ? '#6d5a48' : '#e3d7bd'; g.fillRect(x - w / 2, y - d * 0.1, w, d * 0.6);
      g.fillStyle = burnt ? '#2e2620' : '#4d5560';
      g.beginPath(); g.moveTo(x - w / 2 - 0.6, y); g.lineTo(x - w / 2 + 0.3, y - d * 0.75); g.lineTo(x + w / 2 - 0.3, y - d * 0.75); g.lineTo(x + w / 2 + 0.6, y); g.closePath(); g.fill();
      g.strokeStyle = burnt ? '#1c1612' : '#343a42'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(x - w / 2 + 0.3, y - d * 0.75); g.lineTo(x + w / 2 - 0.3, y - d * 0.75); g.stroke();
    } else {
      g.fillStyle = burnt ? '#5f5043' : '#cdb991'; g.fillRect(x - w / 2, y - d / 2 + d * 0.55, w, d * 0.35);
      g.fillStyle = burnt ? '#3b322a' : '#eadcb8'; g.fillRect(x - w / 2, y - d / 2, w, d * 0.58);
      g.strokeStyle = 'rgba(120,95,60,.6)'; g.lineWidth = 0.3; g.strokeRect(x - w / 2, y - d / 2, w, d * 0.58);
      if (q.dome && !burnt) { g.fillStyle = '#d7c49a'; g.beginPath(); g.arc(x, y - d / 2 + 0.2, w * 0.32, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(120,95,60,.6)'; g.stroke(); }
    }
  }
  stall(g, q) {
    g.fillStyle = 'rgba(40,28,15,.25)'; g.fillRect(q.x - 1.3, q.y - 0.3, 2.8, 1.4);
    g.fillStyle = q.c; g.beginPath(); g.moveTo(q.x - 1.6, q.y); g.lineTo(q.x, q.y - 1.6); g.lineTo(q.x + 1.6, q.y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,245,220,.8)'; g.fillRect(q.x - 0.25, q.y - 1.5, 0.5, 1.5);
  }
  silo(g, q) {
    g.fillStyle = 'rgba(40,28,15,.3)'; g.beginPath(); g.ellipse(q.x + 0.6, q.y + 1.8, 2, 0.9, 0, 0, TAU); g.fill();
    g.fillStyle = '#c9b28a'; g.fillRect(q.x - 1.6, q.y - 1.2, 3.2, 3);
    g.fillStyle = '#8a6a44'; g.beginPath(); g.moveTo(q.x - 1.9, q.y - 1.2); g.lineTo(q.x, q.y - 3.2); g.lineTo(q.x + 1.9, q.y - 1.2); g.closePath(); g.fill();
  }
  tent(g, x, y, s, c) {
    g.fillStyle = 'rgba(40,28,15,.3)'; g.beginPath(); g.ellipse(x + s * 0.3, y + s * 0.5, s * 1.1, s * 0.35, 0, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(x - s, y + s * 0.5); g.lineTo(x, y - s); g.lineTo(x + s, y + s * 0.5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s, y + s * 0.5); g.lineTo(x + s * 0.15, y + s * 0.5); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,45,30,.7)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x - s, y + s * 0.5); g.lineTo(x, y - s); g.lineTo(x + s, y + s * 0.5); g.stroke();
  }
  palace(g, east, tier, burnt) {
    if (east) {
      const w = 6 + tier;
      g.fillStyle = 'rgba(40,28,15,.3)'; g.fillRect(-w / 2 + 0.8, -1, w, 4.4);
      g.fillStyle = '#e8dcc0'; g.fillRect(-w / 2, -2.4, w, 4.2);
      g.fillStyle = burnt ? '#3b2a22' : '#9b3226'; g.fillRect(-w / 2 + 0.6, -1.2, w - 1.2, 2.6);
      g.fillStyle = burnt ? '#2a221c' : '#3f4852';
      g.beginPath(); g.moveTo(-w / 2 - 1.4, -2); g.quadraticCurveTo(-w / 2, -2.4, -w / 2 + 0.8, -4.6); g.lineTo(w / 2 - 0.8, -4.6); g.quadraticCurveTo(w / 2, -2.4, w / 2 + 1.4, -2); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-w / 3 - 1, -4.8); g.quadraticCurveTo(-w / 3, -5, -w / 3 + 0.6, -6.6); g.lineTo(w / 3 - 0.6, -6.6); g.quadraticCurveTo(w / 3, -5, w / 3 + 1, -4.8); g.closePath(); g.fill();
      g.fillStyle = '#d9b45a'; g.fillRect(-0.4, -7.4, 0.8, 0.8);
    } else {
      const s = 3.6 + tier * 0.5;
      g.fillStyle = 'rgba(40,28,15,.3)'; g.fillRect(-s + 0.8, -s * 0.2, s * 2, s * 1.3);
      g.fillStyle = burnt ? '#6d5a48' : '#e6d6b0'; g.fillRect(-s, -s * 0.5, s * 2, s * 1.2);
      g.strokeStyle = 'rgba(120,95,60,.7)'; g.lineWidth = 0.35; g.strokeRect(-s, -s * 0.5, s * 2, s * 1.2);
      g.fillStyle = burnt ? '#3b322a' : '#d0b67a';
      g.beginPath(); g.arc(0, -s * 0.5, s * 0.78, Math.PI, 0); g.fill();
      g.fillStyle = 'rgba(255,245,220,.45)'; g.beginPath(); g.arc(-s * 0.2, -s * 0.7, s * 0.3, Math.PI, 0); g.fill();
      g.fillStyle = burnt ? '#6d5a48' : '#e9dcbc'; g.fillRect(s * 0.75, -s * 1.9, s * 0.38, s * 2);
      g.fillStyle = burnt ? '#3b322a' : '#c9ad6e'; g.beginPath(); g.moveTo(s * 0.7, -s * 1.9); g.lineTo(s * 0.94, -s * 2.4); g.lineTo(s * 1.18, -s * 1.9); g.closePath(); g.fill();
    }
  }
  keep(g, R, east) {
    const s = R * 0.3;
    g.fillStyle = 'rgba(40,28,15,.35)'; g.fillRect(-s + 1, -s + 1, s * 2, s * 2);
    g.fillStyle = '#4a4034'; g.fillRect(-s - 0.5, -s - 0.5, s * 2 + 1, s * 2 + 1);
    g.fillStyle = '#b8ad93'; g.fillRect(-s, -s, s * 2, s * 2);
    g.fillStyle = east ? '#4d5560' : '#9a8c70'; g.fillRect(-s * 0.55, -s * 0.9, s * 1.1, s * 1.1);
    for (const [x, y] of [[-s, -s], [s, -s], [-s, s], [s, s]]) this.towerAt(g, x, y, 1.9, 4);
  }

  // ----------- الرسم في كل إطار -----------
  // n: عقدة الحالة (مع الحقول الديناميكية). fx: { siege, scars, t }
  drawNode(ctx, n, o) {
    const ruined = !!(o.scars && o.scars.some((s) => s.kind === 'sack' && o.age(s) <= 4));
    const sp = this.sprite(n, ruined);
    const R = this.rad(n);
    // حالة الحصار: ظلّ داكن
    if (o.siege) {
      ctx.fillStyle = 'rgba(60,20,10,.22)';
      ctx.beginPath(); ctx.arc(n.x, n.y, R + 6, 0, TAU); ctx.fill();
    }
    ctx.drawImage(sp.cv, n.x - sp.S, n.y - sp.S, sp.S * 2, sp.S * 2);
    // علم المالك فوق المبنى الأوسط
    const fx = n.x + (this.tier(n) >= 2 || n.capital ? 0 : 0), fy = n.y - R * (this.tier(n) >= 2 ? 0.25 : 0.1);
    const wave = Math.sin(o.t * 3 + n.x) * 0.8;
    ctx.strokeStyle = '#2a1e12'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 11); ctx.stroke();
    ctx.fillStyle = o.color;
    ctx.beginPath(); ctx.moveTo(fx, fy - 11); ctx.quadraticCurveTo(fx + 3.5, fy - 11.5 + wave, fx + 7.5, fy - 10.2 + wave); ctx.lineTo(fx + 7.5, fy - 6.2 + wave); ctx.quadraticCurveTo(fx + 3.5, fy - 7.5 + wave, fx, fy - 6.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,8,.8)'; ctx.lineWidth = 0.5; ctx.stroke();
    if (n.capital) drawIcon(ctx, 'crown', fx, fy - 13.5, 4.4, '#f2d77a', { outline: '#3e2c10' });
  }

  // دخان وحرائق
  smoke(ctx, x, y, t, k = 1, dark = false) {
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.35 + i / 5 + k * 0.13) % 1;
      const px = x + Math.sin(ph * 5 + i + k) * 2.5 + ph * 5, py = y - ph * 22;
      ctx.fillStyle = dark ? `rgba(40,34,30,${0.45 * (1 - ph)})` : `rgba(120,110,100,${0.4 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(px, py, 1.6 + ph * 4.5, 0, TAU); ctx.fill();
    }
  }
  fire(ctx, x, y, t) {
    const f = 0.7 + 0.3 * Math.sin(t * 13 + x);
    ctx.fillStyle = `rgba(255,150,40,${0.75 * f})`;
    ctx.beginPath(); ctx.moveTo(x - 1.4, y); ctx.quadraticCurveTo(x, y - 4 * f, x + 1.4, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,230,120,${0.8 * f})`;
    ctx.beginPath(); ctx.arc(x, y - 0.6, 0.6, 0, TAU); ctx.fill();
  }

  // معسكر الحصار: خيام على قوس نحو جهة القدوم، طوق، معدات، سهم
  drawSiegeCamp(ctx, n, s) {
    const R = this.rad(n);
    const a0 = s.angle;
    const t = s.t;
    // طوق الحصار
    ctx.save();
    ctx.strokeStyle = 'rgba(30,15,10,.6)'; ctx.lineWidth = 2.6; ctx.setLineDash([3.5, 2.5]); ctx.lineDashOffset = -t * 4;
    ctx.beginPath(); ctx.arc(n.x, n.y, R + 9, 0, TAU); ctx.stroke();
    ctx.strokeStyle = s.color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // خط الحصار الخارجي حول المعسكر
    ctx.strokeStyle = 'rgba(95,65,35,.85)'; ctx.lineWidth = 1; ctx.setLineDash([1.2, 1]);
    ctx.beginPath(); ctx.arc(n.x, n.y, R + 25, a0 - 0.95, a0 + 0.95); ctx.stroke(); ctx.setLineDash([]);
    // أرض المعسكر
    ctx.fillStyle = 'rgba(110,80,45,.28)';
    ctx.beginPath(); ctx.ellipse(n.x + Math.cos(a0) * (R + 18), n.y + Math.sin(a0) * (R + 18), 15, 9, a0 + Math.PI / 2, 0, TAU); ctx.fill();
    // الخيام
    const tents = Math.min(9, 4 + s.count * 2);
    for (let k = 0; k < tents; k++) {
      const a = a0 + (k / (tents - 1) - 0.5) * 1.3;
      const d = R + 14 + (k % 3) * 3.2;
      this.tent(ctx, n.x + Math.cos(a) * d, n.y + Math.sin(a) * d, 3, k % 3 === 0 ? s.color : '#f1e7cf');
    }
    // نيران المعسكر
    for (let k = 0; k < 2; k++) {
      const a = a0 + (k ? 0.35 : -0.35), d = R + 20;
      this.fire(ctx, n.x + Math.cos(a) * d, n.y + Math.sin(a) * d + 1, t + k);
    }
    // معدات الحصار الجاهزة
    const eq = s.equip || {};
    const icons = [eq.ram && 'ram', eq.tower && 'tower', eq.ladders && 'ladder', s.catapult && 'catapult'].filter(Boolean);
    icons.forEach((ic, k) => {
      const a = a0 + (k - (icons.length - 1) / 2) * 0.32;
      const d = R + 11;
      drawIcon(ctx, ic, n.x + Math.cos(a) * d, n.y + Math.sin(a) * d, 5.5, '#3a2a1a', { outline: 'rgba(240,225,190,.9)' });
    });
    // دخان من المدينة المحاصرة
    if (s.turns >= 1) this.smoke(ctx, n.x - R * 0.3, n.y - R * 0.2, t, 1, s.famine);
    if (s.famine) { this.smoke(ctx, n.x + R * 0.35, n.y, t, 2, true); this.fire(ctx, n.x + R * 0.2, n.y + R * 0.2, t); }
  }

  // آثار الحروب
  drawScars(ctx, n, list, t, age) {
    const R = this.rad(n);
    for (const s of list) {
      const a = age(s);
      if (s.kind === 'battle' && a <= 2) {
        const alpha = a === 0 ? 0.85 : a === 1 ? 0.55 : 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(90,60,35,.35)'; ctx.beginPath(); ctx.ellipse(n.x - R - 6, n.y + R * 0.4, 7, 3.5, 0, 0, TAU); ctx.fill();
        drawIcon(ctx, 'swords', n.x - R - 6, n.y + R * 0.3, 7, '#4a2a1a', { outline: 'rgba(240,225,190,.8)' });
        ctx.globalAlpha = 1;
      }
      if ((s.kind === 'capture' && a <= 1) || (s.kind === 'sack' && a <= 4)) {
        this.smoke(ctx, n.x + R * 0.2, n.y - R * 0.3, t, 3, true);
        if (s.kind === 'sack' && a <= 2) { this.smoke(ctx, n.x - R * 0.4, n.y + R * 0.1, t, 4, true); this.fire(ctx, n.x - R * 0.3, n.y + R * 0.3, t); }
      }
      if (s.kind === 'surrender' && a === 0) drawIcon(ctx, 'flag', n.x + R + 4, n.y - R * 0.6, 7, '#f4efe2', { outline: '#2a1e12' });
      // مخيم لاجئين عند الأسوار
      if (s.kind === 'refugees' && a <= 4) {
        const bx = n.x + R + 4, by = n.y + R * 0.55;
        ctx.globalAlpha = a <= 2 ? 0.95 : 0.6;
        ctx.fillStyle = 'rgba(120,95,60,.28)'; ctx.beginPath(); ctx.ellipse(bx, by + 1.5, 9, 3.8, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < 4; i++) this.tent(ctx, bx - 6 + i * 4, by - (i % 2) * 1.8, 1.9, i % 2 ? '#cdbb92' : '#b9a67c');
        this.smoke(ctx, bx + 2, by - 3, t, 5);
        ctx.globalAlpha = 1;
      }
    }
  }
}

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
