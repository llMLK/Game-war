'use strict';
// الخريطة المرسومة: أرض حيّة، مستوطنات تتطور بصرياً، معسكرات حصار، آثار الحروب

let MW = 1000, MH = 700;
function mapDimensions(sc) { MW = sc.width || 1000; MH = sc.height || 700; }
function mapIsSea(sc,x,y) {
  if(sc.land) return !sc.land.some(p=>x>=p.bounds[0]&&y>=p.bounds[1]&&x<=p.bounds[2]&&y<=p.bounds[3]&&pip(p.rings[0],x,y)&&!p.rings.slice(1).some(r=>pip(r,x,y)));
  return sc.seas.some(p=>pip(p,x,y))&&!(sc.islands||[]).some(p=>pip(p,x,y));
}

class MapArt {
  // opts.colorOf(owner) → لون المالك
  constructor(sc, opts = {}) {
    mapDimensions(sc);
    this.sc = sc;
    this.colorOf = opts.colorOf || (() => '#8a8378');
    this.style = sc.id === 'threeKingdoms' ? 'east' : 'west';
    this.sprites = new Map();
    // Baked sprites remain sharp at phone zoom without 66 large fivefold canvases.
    this.K = sc.nodes.length > 40 ? 2.5 : 3;
    this.terrSig = '';
    this.nodesDef = sc.nodes;
    if(sc.land) {
      const mask=document.createElement('canvas');mask.width=MW;mask.height=MH;
      const mg=mask.getContext('2d',{willReadFrequently:true});this.landPath(mg);mg.fill('evenodd');
      this.landPixels=mg.getImageData(0,0,MW,MH).data;
    }
    this.layout = {};
    for (const n of sc.nodes) this.layout[n.id] = this.nodeLayout(n);
    this.bg = this.buildBg();
    this.terr = document.createElement('canvas');
    const density = Math.min(2, 2048 / MW);
    this.terr.width = MW * density; this.terr.height = MH * density;
  }

  // ——— التخطيط الثابت لكل مدينة ———
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
    for (const poly of this.sc.land ? this.sc.land.flatMap(p=>p.rings) : this.sc.seas) for (const [x, y] of poly) { const d = (x - n.x) ** 2 + (y - n.y) ** 2; if (d < bd) { bd = d; sea = Math.atan2(y - n.y, x - n.x); } }
    for (const e of this.edgesOf(n.id)) if (e.kind === 'water') { const m = this.sc.nodes.find((x) => x.id === e.to); sea = Math.atan2(m.y - n.y, m.x - n.x); }
    return { angs, gate, sea, seed: hashStr(n.id) };
  }

  // الطبقة: 0 قرية، 1 بلدة، 2 مدينة، 3 حاضرة
  tier(n) { return n.capital || n.pop >= 26000 ? 3 : n.pop >= 15000 ? 2 : n.pop >= 10000 ? 1 : 0; }
  rad(n) { return [12.5, 15, 17.5, 20.5][this.tier(n)] + (n.capital ? 1.5 : 0) + Math.min(n.walls || 0, 4) * 0.9; }

  culture(n) {
    if (this.style === 'east') return 'east';
    const origin = n.origOwner || (this.nodesDef.find((p) => p.id === n.id) || {}).owner || n.owner;
    return origin === 'byzantine' ? 'roman' : origin === 'khazar' ? 'steppe' : 'umayyad';
  }
  landPath(g, inverse=false) {
    g.beginPath();if(inverse)g.rect(0,0,MW,MH);
    for(const p of this.sc.land||[])for(const r of p.rings){g.moveTo(...r[0]);for(let i=1;i<r.length;i++)g.lineTo(...r[i]);g.closePath();}
  }
  isSea(x,y) {return this.landPixels ? !this.landPixels[(clamp(Math.floor(y),0,MH-1)*MW+clamp(Math.floor(x),0,MW-1))*4+3] : mapIsSea(this.sc,x,y);}
  biomePath(g,points) {
    const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    g.beginPath();g.moveTo(...mid(points.at(-1),points[0]));
    for(let i=0;i<points.length;i++)g.quadraticCurveTo(...points[i],...mid(points[i],points[(i+1)%points.length]));
    g.closePath();
  }

  // Rounded corners stay within six map units of the supplied geographic line.
  // The source polygons still determine ownership, land and sea; no invented bays.
  atlasPath(g, points, closed = true, roughness = 1.7) {
    if (!points || points.length < 2) return;
    const N = points.length;
    const corners = points.map((p, i) => {
      if (!closed && (i === 0 || i === N - 1)) return { in: p, out: p, p };
      const a = points[(i + N - 1) % N], b = points[(i + 1) % N];
      const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const d = Math.min(6, da * 0.16, db * 0.16);
      return { p, in: [p[0] + (a[0] - p[0]) * d / (da || 1), p[1] + (a[1] - p[1]) * d / (da || 1)], out: [p[0] + (b[0] - p[0]) * d / (db || 1), p[1] + (b[1] - p[1]) * d / (db || 1)] };
    });
    g.beginPath(); g.moveTo(...corners[0].out);
    for (let i = 1; i <= (closed ? N : N - 1); i++) {
      const a = corners[(i - 1) % N].out, c = corners[i % N], b = c.in;
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const edge = (a[0] < 1 && b[0] < 1) || (a[1] < 1 && b[1] < 1) || (a[0] > MW - 1 && b[0] > MW - 1) || (a[1] > MH - 1 && b[1] > MH - 1);
      const steps = Math.max(1, Math.ceil(len / 15)), amp = edge ? 0 : Math.min(roughness, len * 0.035);
      for (let j = 1; j <= steps; j++) {
        const t = j / steps, bend = Math.sin(t * Math.PI) * Math.sin((a[0] + a[1]) * 0.07 + t * Math.PI * 2) * amp;
        g.lineTo(clamp(a[0] + dx * t - dy / len * bend, 0, MW), clamp(a[1] + dy * t + dx / len * bend, 0, MH));
      }
      g.quadraticCurveTo(c.p[0], c.p[1], c.out[0], c.out[1]);
    }
    if (closed) g.closePath();
  }

  // ——————————— الخلفية المرسومة ———————————
  buildBg() {
    const sc = this.sc, K = Math.min(2.5, 2560 / MW);
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
    const edgesXY = sc.edges.filter((e) => (e[2] || 'road') !== 'water').flatMap(([a,b,kind,bends=[]])=>{const A=nodes.find(n=>n.id===a),B=nodes.find(n=>n.id===b),p=[[A.x,A.y],...bends,[B.x,B.y]];return p.slice(1).map((b,i)=>[...p[i],...b]);});
    const nearRoad = (x, y, d) => edgesXY.some(([ax, ay, bx, by]) => segD(x, y, ax, ay, bx, by) < d);
    const inSea = (x, y) => this.isSea(x,y);
    const inDesert = (x, y) => (sc.deserts || []).some((p) => pip(p, x, y));
    const path = (poly) => this.atlasPath(g, poly);

    // الأرض
    const base = g.createLinearGradient(0, 0, MW, MH);
    base.addColorStop(0, this.style === 'east' ? '#e4d8b8' : '#eee0ba');
    base.addColorStop(.55, this.style === 'east' ? '#c7c6a1' : '#d9c89c');
    base.addColorStop(1, this.style === 'east' ? '#c8b68f' : '#c4a574');
    g.fillStyle = base; g.fillRect(0, 0, MW, MH);
    // بقع لونية حسب التضاريس
    const tint = { forest: 'rgba(96,128,68,.30)', hills: 'rgba(140,138,80,.22)', mountains: 'rgba(120,105,85,.26)', plains: 'rgba(150,170,90,.16)', river: 'rgba(120,160,95,.2)', coast: 'rgba(200,190,140,.18)', desert: 'rgba(225,195,130,.3)' };
    for (const n of nodes) {
      const rr = 80 + r() * 40;
      const gr = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, rr);
      gr.addColorStop(0, tint[n.terrain] || 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(n.x - rr, n.y - rr, rr * 2, rr * 2);
    }
    for (let i = 0; i < 26; i++) {
      const x = r() * MW, y = r() * MH, rr = 40 + r() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, r() < 0.55 ? 'rgba(120,150,80,.10)' : 'rgba(150,110,60,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    // حبيبات الورق
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(90,70,40,.06)' : 'rgba(255,250,230,.07)';
      g.fillRect(r() * MW, r() * MH, 0.6 + r() * 1.8, 0.6 + r() * 1.8);
    }
    // الصحارى
    for (const poly of sc.deserts || []) {
      // حافة ناعمة للصحراء
      for (const [lw, al] of [[70, 0.05], [46, 0.07], [22, 0.08]]) { g.strokeStyle = `rgba(232,203,140,${al})`; g.lineWidth = lw; g.lineJoin = 'round'; this.biomePath(g,poly); g.stroke(); }
      g.save(); this.biomePath(g,poly);
      g.fillStyle = 'rgba(232,203,140,.29)'; g.fill(); g.clip();
      for (let row = 0; row < MH / 21; row++) for (let col = 0; col < MW / 34; col++) {
        const x = col * 34 + (row % 2) * 17 + r() * 9, y = row * 21 + r() * 7;
        if (!inDesert(x, y) || nearNode(x, y, 32) || inSea(x, y) || r() < 0.28) continue;
        const w = 11 + r() * 19, rise = 2.5 + r() * 3;
        g.fillStyle = 'rgba(177,132,65,.09)';
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w * 0.44, y - rise, x + w, y - 0.5); g.quadraticCurveTo(x + w * 0.58, y + rise, x, y); g.fill();
        g.strokeStyle = 'rgba(151,106,52,.30)'; g.lineWidth = 0.72;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w * 0.44, y - rise, x + w, y - 0.5); g.stroke();
        g.strokeStyle = 'rgba(255,244,204,.56)'; g.lineWidth = 0.65;
        g.beginPath(); g.moveTo(x + 1, y - 0.7); g.quadraticCurveTo(x + w * 0.44, y - rise - 0.8, x + w - 2, y - 1.2); g.stroke();
      }
      g.restore();
    }
    // البحار: عمق، ضحالة، ساحل مزدوج، أمواج
    if(sc.land) {
      g.save();this.landPath(g,true);g.clip('evenodd');
      const water=g.createLinearGradient(0,0,MW,MH);water.addColorStop(0,'#749c9e');water.addColorStop(.5,'#527c84');water.addColorStop(1,'#315965');g.fillStyle=water;g.fillRect(0,0,MW,MH);
      g.lineJoin='round';this.landPath(g);g.strokeStyle='#afc5b0';g.lineWidth=7;g.stroke();g.strokeStyle='#d2d4b5';g.lineWidth=2;g.stroke();
      for(let i=0;i<1200;i++){const x=r()*MW,y=r()*MH;if(!inSea(x,y))continue;g.strokeStyle='rgba(227,240,225,.17)';g.lineWidth=.7;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+4,y-2,x+8,y);g.stroke();}
      g.restore();this.landPath(g);g.strokeStyle='rgba(51,72,62,.68)';g.lineWidth=.65;g.stroke();
    }
    for (const poly of sc.land ? [] : sc.seas) {
      g.save(); path(poly);
      const water = g.createLinearGradient(0, 0, MW, MH);
      water.addColorStop(0, '#709e9f'); water.addColorStop(.55, '#456f79'); water.addColorStop(1, '#2d545f');
      g.fillStyle = water; g.fill();
      g.clip();
      g.strokeStyle = 'rgba(158,192,176,.32)'; g.lineWidth = 20; path(poly); g.stroke();
      g.strokeStyle = 'rgba(195,216,188,.48)'; g.lineWidth = 6; path(poly); g.stroke();
      g.strokeStyle = 'rgba(235,235,197,.68)'; g.lineWidth = 1.5; path(poly); g.stroke();
      for (let i = 0; i < 220; i++) {
        const x = r() * MW, y = r() * MH;
        if (!pip(poly, x, y)) continue;
        g.strokeStyle = 'rgba(235,245,240,.22)'; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 3, y - 2.2, x + 6, y); g.quadraticCurveTo(x + 9, y + 2.2, x + 12, y); g.stroke();
      }
      g.restore();
      g.strokeStyle = 'rgba(48,68,65,.74)'; g.lineWidth = 0.9; path(poly); g.stroke();
    }
    // Islands share the same illustrated land language and political overlay.
    for(const poly of sc.land ? [] : sc.islands||[]){path(poly);g.fillStyle=base;g.fill();g.lineWidth=2;g.strokeStyle='#d1c6a0';g.stroke();g.lineWidth=.8;g.strokeStyle='#454f43';g.stroke();}
    // الأنهار: تتسع مع الجريان
    for (const rv of sc.rivers) {
      g.lineCap = 'round'; g.lineJoin = 'round';
      // The cultivated corridor follows the river, rather than arbitrary green dots.
      for (const [w, color] of [[22, 'rgba(103,126,64,.065)'], [12, 'rgba(111,141,73,.11)'], [6, 'rgba(86,116,69,.12)'], [3.7, 'rgba(65,85,75,.6)'], [2.25, '#759d9e'], [0.65, 'rgba(216,229,207,.7)']]) {
        g.strokeStyle = color; g.lineWidth = w; this.atlasPath(g, rv, false, 3); g.stroke();
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
    // جبال مرسومة
    const peak = (x, y, s) => {
      g.fillStyle = 'rgba(60,45,30,.25)';
      g.beginPath(); g.ellipse(x + s * 0.2, y + s * 0.62, s * 1.15, s * 0.3, 0, 0, TAU); g.fill();
      g.fillStyle = '#9b8662';
      g.beginPath(); g.moveTo(x - s * 1.2, y + s * 0.5); g.lineTo(x - s * 0.45, y - s * 0.2); g.lineTo(x - s * 0.05, y - s); g.lineTo(x + s * 0.48, y - s * 0.12); g.lineTo(x + s * 1.12, y + s * 0.56); g.closePath(); g.fill();
      g.fillStyle = '#d1c49b';
      g.beginPath(); g.moveTo(x - s * 1.2, y + s * 0.5); g.lineTo(x - s * 0.45, y - s * 0.2); g.lineTo(x - s * 0.05, y - s); g.lineTo(x - s * 0.13, y - s * 0.22); g.lineTo(x + s * 0.12, y + s * 0.24); g.lineTo(x - s * 0.22, y + s * 0.5); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(83,65,39,.52)'; g.lineWidth = 0.62;
      for (let h = 0; h < 6; h++) {
        const t = h / 6;
        g.beginPath(); g.moveTo(x + s * t * 0.52, y - s * (0.68 - t * 0.93)); g.lineTo(x + s * (0.4 + t * 0.66), y + s * 0.44); g.stroke();
      }
      g.strokeStyle = 'rgba(73,57,37,.72)'; g.lineWidth = 0.72;
      g.beginPath(); g.moveTo(x - s * 1.2, y + s * 0.5); g.lineTo(x - s * 0.45, y - s * 0.2); g.lineTo(x - s * 0.05, y - s); g.lineTo(x + s * 0.48, y - s * 0.12); g.lineTo(x + s * 1.12, y + s * 0.56); g.stroke();
      if (s > 13 && y < MH * 0.49) {
        g.fillStyle = 'rgba(244,237,213,.76)'; g.beginPath(); g.moveTo(x - s * 0.25, y - s * 0.57); g.lineTo(x - s * 0.05, y - s); g.lineTo(x + s * 0.2, y - s * 0.55); g.lineTo(x, y - s * 0.64); g.closePath(); g.fill();
      }
    };
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
      if (n.terrain === 'forest') for (let i = 0; i < 48; i++) {
        const a = i * 2.399, radius = 28 + Math.sqrt(i / 48) * 34;
        const x = n.x + Math.cos(a) * radius, y = n.y + Math.sin(a) * radius * 0.6 - 13;
        if (!nearRoad(x, y, 7) && !nearNode(x, y, 25)) place(x, y, () => tree(x, y, 3.2 + r() * 2, 'pine'));
      }
      if (n.terrain === 'hills') for (let i = 0; i < 6; i++) { const [x, y] = ringFree([29, 61]); if (!nearRoad(x, y, 8) && !nearNode(x, y, 26)) place(x, y, () => hill(x, y, 6 + r() * 4)); }
      if (n.terrain === 'mountains') for (let i = 0; i < 4; i++) { const [x, y] = ringFree([34, 62]); if (!nearRoad(x, y, 9) && !nearNode(x, y, 29)) place(x, y, () => peak(x, y, 8 + r() * 5)); }
      if (n.terrain === 'desert') for (let i = 0; i < 3; i++) { const [x, y] = ringFree([27, 39]); if (!nearRoad(x, y, 5) && !nearNode(x, y, 24)) place(x, y, () => tree(x, y, 3.4 + r() * 1.5, 'palm')); }
      if (n.terrain === 'plains' || n.terrain === 'river') for (let i = 0; i < 4; i++) { const [x, y] = ringFree([33, 65]); if (!nearRoad(x, y, 5) && !nearNode(x, y, 28) && !inDesert(x, y)) place(x, y, () => tree(x, y, 2.6 + r() * 1.4, 'round')); }
    }
    // Link close mountain landmarks into ridges, leaving road passes visibly open.
    const ridges = sc.mountains || [];
    for (let i = 0; i < ridges.length; i++) {
      const A = ridges[i];
      const next = ridges.map((B, j) => ({ B, j, d: Math.hypot(B[0] - A[0], B[1] - A[1]) })).filter((p) => p.j > i && p.d < 160).sort((a, b) => a.d - b.d)[0];
      if (!next) continue;
      const [bx, by] = next.B, count = Math.max(2, Math.ceil(next.d / 12));
      for (let k = 0; k < count; k++) {
        const t = k / count, x = A[0] + (bx - A[0]) * t, y = A[1] + (by - A[1]) * t + Math.sin(t * Math.PI * 3) * 5;
        if (nearNode(x, y, 31) || nearRoad(x, y, 9)) continue;
        const size = 8 + 6 * Math.sin(t * Math.PI) + r() * 3;
        place(x, y, () => peak(x, y, size));
        if (k % 2 === 0 && !nearNode(x - 7, y + 12, 29)) place(x - 7, y + 12, () => hill(x - 7, y + 12, size * 0.65));
      }
    }
    for (const [mx, my] of sc.mountains) {
      for (let k = 0; k < 3; k++) {
        const x = mx + (r() - 0.5) * 56, y = my + (r() - 0.5) * 34;
        if (nearNode(x, y, 26) || nearRoad(x, y, 8)) continue;
        const s = 9 + r() * 8;
        place(x, y, () => peak(x, y, s));
      }
    }
    // Sparse vegetation belongs to riverbanks and foothills, not random map patches.
    for(const [cx,cy,radius]of sc.forests||[])for(let i=0;i<80;i++){
      const a=i*2.399,rr=radius*Math.sqrt(i/80),x=cx+Math.cos(a)*rr*1.6,y=cy+Math.sin(a)*rr*.7;
      if(nearNode(x,y,30)||nearRoad(x,y,7)||inDesert(x,y))continue;
      place(x,y,()=>tree(x,y,3.2+r()*1.8,'pine'));
    }
    for (const river of sc.rivers) for (let j = 1; j < river.length; j++) {
      const [ax, ay] = river[j - 1], [bx, by] = river[j], len = Math.hypot(bx - ax, by - ay), count = Math.floor(len / 21);
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / Math.max(1, count), side = k % 2 ? 1 : -1;
        const x = ax + (bx - ax) * t + side * (by - ay) / (len || 1) * 7;
        const y = ay + (by - ay) * t - side * (bx - ax) / (len || 1) * 7;
        if (nearNode(x, y, 28) || nearRoad(x, y, 4)) continue;
        const kind = this.style !== 'east' && y > MH * 0.42 ? 'palm' : 'round';
        place(x, y, () => tree(x, y, 2.8 + r(), kind));
      }
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();
    // وردة الرياح في أكبر بحر
    const bigSea = sc.land ? null : [...sc.seas].sort((a, b) => b.length - a.length)[0];
    if(sc.land)this.compass(g,850,520,28);
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
    // Atlas lettering, graticule and engraved frame are baked once, not each frame.
    g.save(); g.strokeStyle = 'rgba(83,66,40,.1)'; g.lineWidth = .65; g.setLineDash([2,6]);
    for(let x=40;x<MW;x+=120){g.beginPath();g.moveTo(x,18);g.lineTo(x,MH-18);g.stroke();}
    for(let y=40;y<MH;y+=120){g.beginPath();g.moveTo(18,y);g.lineTo(MW-18,y);g.stroke();}
    g.setLineDash([]); g.textAlign='center'; g.direction='rtl';
    for(const label of sc.labels || []) {
      g.font = `${label.kind === 'sea' ? 'italic ' : ''}24px "Noto Naskh Arabic", Tahoma, serif`;
      g.fillStyle = label.kind==='sea'?'rgba(227,237,222,.66)':'rgba(89,67,40,.38)';
      g.fillText(label.text,label.x,label.y);
    }
    g.restore();
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

  // ——————————— الأقاليم والحدود ———————————
  // nodes: [{id,x,y,owner}]
  renderTerritory(nodes) {
    const sig = nodes.map((n) => n.owner).join(',');
    if (sig === this.terrSig) return;
    this.terrSig = sig;
    const C = 2, W = MW / C, H = MH / C;
    const cv = this.terr, g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    const cols = {};
    for (const n of nodes) cols[n.owner] = cols[n.owner] || hexRgb(this.colorOf(n.owner));
    const tiny = document.createElement('canvas'); tiny.width = W; tiny.height = H;
    const tg = tiny.getContext('2d');
    const img = tg.createImageData(W, H);

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wx = x * C + C / 2, wy = y * C + C / 2;
      const i = y * W + x;
      if (this.isSea(wx,wy)) continue;
      // Low-frequency terrain variation gives control frontiers a softer, local course.
      const qx=wx+7*Math.sin(wy/41)+3*Math.sin(wx/29+wy/23),qy=wy+6*Math.sin(wx/53)+3*Math.cos(wy/31);
      let a = -1, da = 1e12;
      for (let k = 0; k < nodes.length; k++) { const n = nodes[k]; const d = (n.x - qx) ** 2 + (n.y - qy) ** 2; if (d < da) { da = d; a = k; } }
      if (da > 160 * 160) continue;

      const A = nodes[a];
      let dborder = 1e9;
      for (let k = 0; k < nodes.length; k++) {
        const B = nodes[k];
        if (B.owner === A.owner) continue;
        const db = (B.x - qx) ** 2 + (B.y - qy) ** 2;
        const ab = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        dborder = Math.min(dborder, (db - da) / (2 * ab));
      }
      const c = cols[A.owner];
      const fade = clamp(1 - (Math.sqrt(da) - 110) / 50, 0, 1);
      const band = clamp(1 - dborder / 16, 0, 1);
      img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2];
      img.data[i * 4 + 3] = Math.round((18 + band * 48 + 105 * Math.pow(clamp(1-dborder/3.8,0,1),2)) * fade);
    }
    tg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(tiny, 0, 0, cv.width, cv.height);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ——————————— رسم المستوطنة (مخزّنة) ———————————
  spriteKey(n, ruined) {
    return [n.id, this.culture(n), this.tier(n), n.walls, n.market || 0, n.farm || 0, n.granary || 0, n.barracks || 0, n.port || 0, n.capital ? 1 : 0, ruined ? 1 : 0].join('|');
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
    const culture = this.culture(n);
    const L = { ...(this.layout[n.id] || this.nodeLayout(n)), culture };
    const r = rng(L.seed);
    const east = culture === 'east';
    const tier = this.tier(n);
    const walls = Math.min(4, n.walls || 0);
    const avoid = (a) => L.angs.some((b) => Math.abs(angDiff(a, b)) < 0.42);
    // الحقول حول المدينة
    const fields = (culture === 'steppe' ? 1 : 2) + (n.farm || 0) * 3 + (tier === 0 ? 1 : 0);
    let placed = 0;
    for (let k = 0; k < 40 && placed < fields; k++) {
      const a = r() * TAU;
      if (avoid(a) || (L.sea != null && Math.abs(angDiff(a, L.sea)) < 0.6)) continue;
      const d = R + 5 + r() * 10;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9;
      const w = 7 + r() * 5, hgt = 5 + r() * 3;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2 + (r() - 0.5) * 0.4);
      g.fillStyle = ['#9fa770', '#c8b782', '#8f9f66', '#c4aa71'][placed % 4];
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
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 1, R + 4, (R + 4) * (culture === 'steppe' ? 0.75 : 0.9), 0, 0, TAU); g.fill();
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
    if (walls >= 3) { g.strokeStyle = 'rgba(107,83,48,.32)'; g.lineWidth = 2.4; this.poly(g, this.wallRing(L, R + 4.2, rng(L.seed + 7))); g.stroke(); }
    if (walls >= 1) this.drawWall(g, ring, walls, L, 'back');
    // البيوت
    const count = (culture === 'steppe' ? [5, 8, 12, 16] : [6, 10, 15, 21])[tier] + (n.capital ? 3 : 0);
    const houses = [];
    const inner = walls >= 1 ? R - 2.6 : R - 1;
    const centerFree = tier >= 1 || n.capital || walls >= 4 ? R * 0.39 : 0;
    for (let k = 0; k < 400 && houses.length < count; k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * inner;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.92;
      if (Math.hypot(x, y) < centerFree) continue;
      if (houses.some((q) => Math.abs(q.x - x) < 3.8 && Math.abs(q.y - y) < 3.2)) continue;
      houses.push({ x, y, w: 3.2 + r() * 2, d: 2.6 + r() * 1.3, dome: culture === 'umayyad' && r() < 0.07 });
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
    if (tier >= 1 || n.capital) all.push({ x: 0, y: 0, k: walls >= 4 ? 'keep' : 'palace' });
    else if (walls >= 4) all.push({ x: 0, y: 0, k: 'keep' });
    all.sort((a, b) => a.y - b.y);
    for (const q of all) {
      if (q.k === 'h') this.house(g, q, culture, ruined && r() < 0.6);
      else if (q.k === 's') this.stall(g, q);
      else if (q.k === 'g') this.silo(g, q);
      else if (q.k === 'palace') this.palace(g, culture, tier, ruined);
      else this.keep(g, R, culture);
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
    if (L.culture === 'roman' || L.culture === 'east' || L.culture === 'umayyad') {
      // Rectangular urban circuits, with bevelled corners, replace identical tokens.
      const shape = L.culture === 'roman' ? [[1, 0], [1, .6], [.72, .87], [-.7, .87], [-1, .62], [-1, -.6], [-.72, -.86], [.72, -.86], [1, -.6]] : L.culture === 'east' ? [[1, 0], [1, .73], [.78, .9], [-.8, .9], [-1, .72], [-1, -.73], [-.78, -.9], [.8, -.9], [1, -.73]] : [[1, 0], [.92, .62], [.5, .91], [-.62, .83], [-1, .36], [-.94, -.57], [-.38, -.84], [.67, -.78], [1, -.4]];
      const a = L.culture === 'roman' ? -0.2 : L.culture === 'east' ? 0.12 : -0.1;
      for (const [x, y] of shape) { const jitter = .96 + r() * .07; pts.push([(x * Math.cos(a) - y * Math.sin(a)) * R * jitter, (x * Math.sin(a) + y * Math.cos(a)) * R * jitter]); }
      // Gate position remains tied to a real road for the street and port drawing.
      const gate = pts.reduce((best, p, i) => Math.abs(angDiff(Math.atan2(p[1], p[0]), L.gate)) < Math.abs(angDiff(Math.atan2(pts[best][1], pts[best][0]), L.gate)) ? i : best, 0);
      return pts.slice(gate).concat(pts.slice(0, gate));
    }
    const n = 14;
    for (let k = 0; k < n; k++) {
      const a = L.gate + k / n * TAU;
      const rr = R * (0.94 + r() * 0.08);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.76]);
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
        g.strokeStyle = L.culture === 'steppe' ? '#735737' : '#b39b73'; g.lineWidth = 1.8; g.setLineDash(L.culture === 'steppe' ? [0.7, 0.5] : []);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
      } else {
        const w = lvl >= 3 ? 2.8 : 2.1;
        g.strokeStyle = '#4a4034'; g.lineWidth = w + 1;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = L.culture === 'roman' ? '#c4b79b' : L.culture === 'steppe' ? '#9a825d' : '#c6ad80'; g.lineWidth = w;
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
        this.towerAt(g, x, y, lvl >= 3 ? 2.2 : 1.8, lvl, L.culture);
      }
    }
    // البوابة
    if (part === 'front' || pts[0][1] <= 0) {
      const [x0, y0] = pts[0], [x1, y1] = pts[1], [xl, yl] = pts[n - 1];
      if ((part === 'front') === (y0 > 0)) {
        if (lvl >= 2) {
          this.towerAt(g, (x0 + x1) / 2 * 0.98 + x1 * 0.02, (y0 + y1) / 2, lvl >= 3 ? 2.4 : 2, lvl, L.culture);
          this.towerAt(g, (x0 + xl) / 2, (y0 + yl) / 2, lvl >= 3 ? 2.4 : 2, lvl, L.culture);
        } else {
          g.fillStyle = '#6b4a2a'; g.fillRect(x0 - 1, y0 - 1, 2, 2);
        }
      }
    }
  }
  towerAt(g, x, y, s, lvl, culture = 'umayyad') {
    if (culture === 'steppe') {
      g.fillStyle = '#654a30'; g.fillRect(x - s * .6, y - s * 2, s * 1.2, s * 2.4);
      g.fillStyle = '#b1a07b'; g.beginPath(); g.moveTo(x - s, y - s * 1.4); g.lineTo(x, y - s * 2.8); g.lineTo(x + s, y - s * 1.4); g.closePath(); g.fill();
      g.strokeStyle = '#553c27'; g.lineWidth = .3; g.stroke(); return;
    }
    g.fillStyle = '#453b30'; g.fillRect(x - s - 0.4, y - s * 1.6 - 0.4, s * 2 + 0.8, s * 2.2 + 0.8);
    g.fillStyle = lvl >= 4 ? '#c2b79d' : '#b0a48b'; g.fillRect(x - s, y - s * 1.6, s * 2, s * 2.2);
    g.fillStyle = '#8a7d67'; g.fillRect(x - s, y + s * 0.2, s * 2, s * 0.4);
    g.fillStyle = '#453b30';
    for (let k = -1; k <= 1; k += 2) g.fillRect(x + k * s * 0.55 - 0.35, y - s * 1.6 - 0.8, 0.7, 0.8);
  }
  house(g, q, culture, burnt) {
    const { x, y, w, d } = q;
    const east = culture === 'east';
    if (culture === 'steppe') {
      g.fillStyle = 'rgba(64,44,25,.25)'; g.beginPath(); g.ellipse(x + .6, y + .9, w * .7, d * .45, 0, 0, TAU); g.fill();
      g.fillStyle = burnt ? '#655344' : '#dacdaf'; g.beginPath(); g.ellipse(x, y, w * .64, d * .5, 0, 0, Math.PI); g.lineTo(x - w * .64, y - d * .22); g.quadraticCurveTo(x, y - d * 1.3, x + w * .64, y - d * .22); g.closePath(); g.fill();
      g.strokeStyle = '#796444'; g.lineWidth = .4; g.stroke();
      g.strokeStyle = burnt ? '#45362b' : '#ad8b57'; g.beginPath(); g.moveTo(x - w * .6, y - d * .15); g.quadraticCurveTo(x, y + d * .1, x + w * .6, y - d * .15); g.stroke();
      g.fillStyle = '#64503a'; g.fillRect(x - .45, y - .3, .9, d * .65); return;
    }
    if (culture === 'roman') {
      g.fillStyle = 'rgba(60,40,24,.3)'; g.fillRect(x - w / 2 + .7, y - d * .2, w, d * .85);
      g.fillStyle = burnt ? '#70614e' : '#dfcfac'; g.fillRect(x - w / 2, y - d * .2, w, d * .75);
      g.fillStyle = burnt ? '#473a31' : '#a56649'; g.beginPath(); g.moveTo(x - w * .65, y - d * .17); g.lineTo(x - w * .05, y - d * .86); g.lineTo(x + w * .6, y - d * .1); g.closePath(); g.fill();
      g.fillStyle = burnt ? '#574135' : '#c78f68'; g.beginPath(); g.moveTo(x - w * .65, y - d * .17); g.lineTo(x - w * .05, y - d * .86); g.lineTo(x - w * .08, y - d * .08); g.closePath(); g.fill();
      g.strokeStyle = '#78543b'; g.lineWidth = .35; g.beginPath(); g.moveTo(x - w * .65, y - d * .17); g.lineTo(x - w * .05, y - d * .86); g.lineTo(x + w * .6, y - d * .1); g.stroke();
      g.fillStyle = '#927a55'; g.fillRect(x + w * .12, y + d * .12, .55, d * .38); return;
    }
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
  palace(g, culture, tier, burnt) {
    const east = culture === 'east';
    if (culture === 'roman') {
      const s = 4 + tier * .8;
      g.fillStyle = 'rgba(53,40,27,.28)'; g.fillRect(-s + 1, -s * .4, s * 2.2, s * 1.4);
      g.fillStyle = burnt ? '#74634f' : '#ddceb0'; g.fillRect(-s, -s * .6, s * 2, s * 1.35);
      g.strokeStyle = '#766043'; g.lineWidth = .45; g.strokeRect(-s, -s * .6, s * 2, s * 1.35);
      g.fillStyle = burnt ? '#49392d' : '#b47b55';
      g.beginPath(); g.moveTo(-s * 1.18, -s * .45); g.lineTo(0, -s * 1.25); g.lineTo(s * 1.18, -s * .45); g.closePath(); g.fill();
      g.fillStyle = '#e4d8ba'; g.fillRect(-s * .42, -s * 1.05, s * .84, s * .86);
      g.fillStyle = burnt ? '#564334' : '#a57955'; g.beginPath(); g.arc(0, -s * 1.02, s * .53, Math.PI, 0); g.fill();
      g.strokeStyle = '#645039'; g.lineWidth = .42; g.stroke();
      g.strokeStyle = '#8b7448'; g.lineWidth = .55; g.beginPath(); g.moveTo(0, -s * 1.55); g.lineTo(0, -s * 1.98); g.moveTo(-s * .17, -s * 1.82); g.lineTo(s * .17, -s * 1.82); g.stroke();
      g.fillStyle = '#745b3f'; for (const x of [-.64, 0, .64]) { g.beginPath(); g.arc(s * x, s * .22, s * .13, Math.PI, 0); g.lineTo(s * (x + .13), s * .62); g.lineTo(s * (x - .13), s * .62); g.closePath(); g.fill(); }
      return;
    }
    if (culture === 'steppe') {
      const s = 4 + tier * .65;
      g.fillStyle = 'rgba(52,38,22,.3)'; g.beginPath(); g.ellipse(1, 2, s * 1.6, s * .75, 0, 0, TAU); g.fill();
      g.fillStyle = burnt ? '#66503a' : '#a17f52'; g.fillRect(-s, -s * .25, s * 2, s * 1.2);
      g.fillStyle = burnt ? '#483527' : '#d5c49d'; g.beginPath(); g.moveTo(-s * 1.4, 0); g.lineTo(-s * .22, -s * 1.55); g.lineTo(s * .22, -s * 1.55); g.lineTo(s * 1.4, 0); g.closePath(); g.fill();
      g.strokeStyle = '#77603e'; g.lineWidth = .5; g.stroke();
      for (const k of [-.7, -.35, 0, .35, .7]) { g.beginPath(); g.moveTo(k * s * .3, -s * 1.25); g.lineTo(k * s * 1.6, 0); g.stroke(); }
      g.fillStyle = '#5a4029'; g.fillRect(-s * .27, s * .06, s * .54, s * .83);
      this.house(g, { x: -s * 1.3, y: s * .6, w: 3.6, d: 3 }, 'steppe', burnt);
      return;
    }
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
      // Early courtyard complex: low prayer hall and square corner pavilions.
      // No later Ottoman pencil minaret or oversized bulbous dome.
      const s = 4.4 + tier * .65;
      g.fillStyle = 'rgba(55,37,20,.28)'; g.fillRect(-s * 1.15 + .8, -s * .6 + .8, s * 2.3, s * 1.65);
      g.fillStyle = burnt ? '#6c5743' : '#e6d8b5'; g.fillRect(-s * 1.15, -s * .7, s * 2.3, s * 1.65);
      g.strokeStyle = '#987a4d'; g.lineWidth = .5; g.strokeRect(-s * 1.15, -s * .7, s * 2.3, s * 1.65);
      g.fillStyle = burnt ? '#443429' : '#b9a06f'; g.fillRect(-s * .64, -s * .1, s * 1.28, s * .69);
      g.fillStyle = burnt ? '#534030' : '#f1e5c5'; g.fillRect(-s * 1.05, -s * .88, s * 2.1, s * .65);
      g.fillStyle = '#95784d'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(k * s * .35, -s * .24, s * .09, Math.PI, 0); g.lineTo(k * s * .35 + s * .09, s * .04); g.lineTo(k * s * .35 - s * .09, s * .04); g.closePath(); g.fill(); }
      for (const x of [-1.05, 1.05]) { g.fillStyle = burnt ? '#67533d' : '#d5bf92'; g.fillRect(s * x - s * .17, -s * .97, s * .34, s * .55); g.fillStyle = '#efe0bb'; g.fillRect(s * x - s * .21, -s * 1.04, s * .42, s * .13); }
      g.fillStyle = '#836544'; g.fillRect(-s * .14, s * .62, s * .28, s * .34);
      if (tier >= 3) { g.fillStyle = burnt ? '#514032' : '#bca574'; g.beginPath(); g.arc(0, -s * .82, s * .3, Math.PI, 0); g.fill(); }
    }
  }
  keep(g, R, culture) {
    const east = culture === 'east';
    const s = R * 0.3;
    g.fillStyle = 'rgba(40,28,15,.35)'; g.fillRect(-s + 1, -s + 1, s * 2, s * 2);
    g.fillStyle = '#4a4034'; g.fillRect(-s - 0.5, -s - 0.5, s * 2 + 1, s * 2 + 1);
    g.fillStyle = '#b8ad93'; g.fillRect(-s, -s, s * 2, s * 2);
    g.fillStyle = east ? '#4d5560' : '#9a8c70'; g.fillRect(-s * 0.55, -s * 0.9, s * 1.1, s * 1.1);
    g.save(); g.scale(.65, .65); g.translate(0, -s * .3); this.palace(g, culture, 1, false); g.restore();
    for (const [x, y] of [[-s, -s], [s, -s], [-s, s], [s, s]]) this.towerAt(g, x, y, 1.9, 4, culture);
  }

  // ——————————— الرسم في كل إطار ———————————
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

function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function isLight(hex) { const [r, g, b] = hexRgb(hex); return r * 0.3 + g * 0.59 + b * 0.11 > 170; }
