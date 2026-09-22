'use strict';
// محرك المعركة: الأرض، إيجاد المسارات، الفِرَق، الالتحام والرماية والمعنويات

const T = { GRASS: 0, FOREST: 1, WATER: 2, FORD: 3, WALL: 4, GATE: 5, BUILD: 6, ROAD: 7, BREACH: 8 };
const TS = 20, COLS = 60, ROWS = 40, BW = COLS * TS, BH = ROWS * TS;
const WALL_ROW = 14;
const WALL_Y = WALL_ROW * TS;
const MS = 1.5; // دقة لوحة الأرض

// ——————————————————— الخريطة ———————————————————
class BattleMap {
  constructor(o) {
    this.kind = o.kind; this.terrain = o.terrain; this.walls = o.walls || 0;
    this.ground = o.ground || 'green';
    this.t = new Uint8Array(COLS * ROWS);
    this.elev = new Float32Array(COLS * ROWS);
    this.hp = new Float32Array(COLS * ROWS);
    this.r = rng(o.seed || 7);
    this.hills = [];
    this.gateHp = 0; this.gateMax = 0;
    this.plaza = null;
    this.version = 0;
    this.dirty = true;
    this.corpses = [];
    this.canvas = document.createElement('canvas');
    this.canvas.width = BW * MS; this.canvas.height = BH * MS;
    this.cx = this.canvas.getContext('2d');
    this.gen();
  }

  gen() {
    const r = this.r, t = this.t, E = this.elev;
    const siege = this.kind === 'siege';
    const nh = siege ? 2 : ({ plains: 2, forest: 2, hills: 5, river: 2 }[this.terrain] || 2);
    for (let k = 0; k < nh; k++) {
      const cx = 4 + r() * (COLS - 8);
      const cy = siege ? WALL_ROW + 8 + r() * 12 : 8 + r() * (ROWS - 16);
      const rad = 4 + r() * 5.5, ht = 0.55 + r() * 0.45;
      this.hills.push({ x: cx * TS, y: cy * TS, rad: rad * TS, ht });
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d < rad) { const i = y * COLS + x; E[i] = Math.max(E[i], ht * (1 - (d / rad) ** 2)); }
      }
    }
    const nf = siege ? 4 : ({ plains: 4, forest: 11, hills: 3, river: 4 }[this.terrain] || 4);
    for (let k = 0; k < nf; k++) {
      const cx = r() * COLS, cy = siege ? WALL_ROW + 6 + r() * (ROWS - WALL_ROW - 6) : 4 + r() * (ROWS - 8);
      const rad = 1.6 + r() * 3.2;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d < rad * (0.75 + 0.5 * r())) t[y * COLS + x] = T.FOREST;
      }
    }
    if (!siege && this.terrain === 'river') {
      const ph = r() * 6;
      const fordCols = [8 + Math.floor(r() * 8), 26 + Math.floor(r() * 6), 44 + Math.floor(r() * 8)];
      for (let x = 0; x < COLS; x++) {
        const rc = Math.round(20 + 3 * Math.sin(x * 0.16 + ph));
        const ford = fordCols.some((c) => x >= c && x < c + 3);
        for (let dy = -1; dy <= 1; dy++) {
          const i = (rc + dy) * COLS + x;
          t[i] = ford ? T.FORD : T.WATER; E[i] = 0;
        }
      }
    }
    if (siege) {
      const lvl = Math.max(1, this.walls);
      for (let y = 0; y <= WALL_ROW; y++) for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x; t[i] = T.GRASS; E[i] = 0;
      }
      for (let x = 0; x < COLS; x++) {
        const i = WALL_ROW * COLS + x;
        if (x >= 28 && x <= 31) { t[i] = T.GATE; }
        else { t[i] = T.WALL; this.hp[i] = 90 + 45 * lvl; }
      }
      this.gateMax = this.gateHp = 300 + 150 * lvl;
      this.plaza = { x: 25 * TS, y: 2 * TS, w: 10 * TS, h: 6 * TS };
      for (let k = 0; k < 70; k++) {
        const w = 2 + Math.floor(r() * 3), hh = 2 + Math.floor(r() * 2);
        const c0 = 1 + Math.floor(r() * (COLS - w - 2)), r0 = 1 + Math.floor(r() * (WALL_ROW - 4 - hh));
        if (c0 + w > 23 && c0 < 37 && r0 < 9) continue;
        if (c0 + w > 27 && c0 < 33) continue;
        let ok = true;
        for (let y = r0 - 1; y <= r0 + hh && ok; y++) for (let x = c0 - 1; x <= c0 + w && ok; x++) {
          if (y < 0 || x < 0 || x >= COLS) continue;
          if (t[y * COLS + x] !== T.GRASS) ok = false;
        }
        if (!ok) continue;
        for (let y = r0; y < r0 + hh; y++) for (let x = c0; x < c0 + w; x++) t[y * COLS + x] = T.BUILD;
      }
      for (let y = 2; y < WALL_ROW; y++) for (let x = 29; x <= 30; x++) t[y * COLS + x] = T.ROAD;
      for (let y = WALL_ROW + 1; y < ROWS; y++) for (let x = 29; x <= 30; x++) t[y * COLS + x] = T.ROAD;
      for (let y = 2; y < 8; y++) for (let x = 25; x < 35; x++) t[y * COLS + x] = T.ROAD;
    }
  }

  idx(x, y) { return Math.floor(y / TS) * COLS + Math.floor(x / TS); }
  inside(x, y) { return x >= 0 && y >= 0 && x < BW && y < BH; }
  tileAt(x, y) { return this.inside(x, y) ? this.t[this.idx(x, y)] : -1; }
  elevAt(x, y) { return this.inside(x, y) ? this.elev[this.idx(x, y)] : 0; }

  tileOk(tile, u) {
    if (tile < 0 || tile === T.WATER || tile === T.BUILD || tile === T.GATE) return false;
    if (tile === T.WALL) return !!(u && u.ladders);
    return true;
  }
  passAt(x, y, u) { return this.tileOk(this.tileAt(x, y), u); }

  speedMulIdx(i, cls) {
    let m = 1;
    switch (this.t[i]) {
      case T.FOREST: m = cls === 'cav' ? 0.5 : cls === 'mach' ? 0.45 : 0.68; break;
      case T.FORD: m = 0.5; break;
      case T.ROAD: m = 1.12; break;
      case T.BREACH: m = 0.6; break;
      case T.WALL: m = 0.2; break;
    }
    if (this.elev[i] > 0.45) m *= 0.88;
    return m;
  }
  speedMul(x, y, cls) { return this.inside(x, y) ? this.speedMulIdx(this.idx(x, y), cls) : 1; }

  lineClear(ax, ay, bx, by, u) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 8);
    for (let k = 1; k <= n; k++) {
      const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n;
      if (!this.passAt(x, y, u)) return false;
    }
    return true;
  }

  nearestOk(ci, u) {
    const cx = ci % COLS, cy = Math.floor(ci / COLS);
    for (let rad = 1; rad < 12; rad++) {
      let best = -1, bd = 1e9;
      for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        const i = y * COLS + x;
        if (this.tileOk(this.t[i], u)) { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; best = i; } }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  findPath(sx, sy, tx, ty, u) {
    tx = clamp(tx, 2, BW - 2); ty = clamp(ty, 2, BH - 2);
    const cellOf = (x, y) => clamp(Math.floor(y / TS), 0, ROWS - 1) * COLS + clamp(Math.floor(x / TS), 0, COLS - 1);
    let start = cellOf(sx, sy), goal = cellOf(tx, ty);
    const goalOk = this.tileOk(this.t[goal], u);
    if (!goalOk) { goal = this.nearestOk(goal, u); if (goal < 0) return null; }
    if (!this.tileOk(this.t[start], u)) { const s2 = this.nearestOk(start, u); if (s2 >= 0) start = s2; }
    const endPt = goalOk ? { x: tx, y: ty } : { x: (goal % COLS + 0.5) * TS, y: (Math.floor(goal / COLS) + 0.5) * TS };
    if (this.lineClear(sx, sy, endPt.x, endPt.y, u)) return [endPt];
    const N = COLS * ROWS;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = new MinHeap();
    const gx = goal % COLS, gy = Math.floor(goal / COLS);
    const hf = (i) => { const dx = Math.abs(i % COLS - gx), dy = Math.abs(Math.floor(i / COLS) - gy); return (Math.max(dx, dy) + 0.414 * Math.min(dx, dy)) * TS / 1.12; };
    g[start] = 0; heap.push(hf(start), start);
    const cls = u ? u.cls : 'inf';
    let iter = 0, found = false;
    while (heap.size && iter++ < N * 3) {
      const cur = heap.pop();
      if (cur === goal) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % COLS, cy = Math.floor(cur / COLS);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const ni = ny * COLS + nx;
        if (closed[ni] || !this.tileOk(this.t[ni], u)) continue;
        if (dx && dy && (!this.tileOk(this.t[cy * COLS + nx], u) || !this.tileOk(this.t[ny * COLS + cx], u))) continue;
        const step = (dx && dy ? 1.414 : 1) * TS / this.speedMulIdx(ni, cls);
        const ng = g[cur] + step;
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; heap.push(ng + hf(ni), ni); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = goal; c !== start && c >= 0; c = came[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => ({ x: (c % COLS + 0.5) * TS, y: (Math.floor(c / COLS) + 0.5) * TS }));
    if (pts.length) pts[pts.length - 1] = endPt; else pts.push(endPt);
    const out = [];
    let cur = { x: sx, y: sy }, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.lineClear(cur.x, cur.y, pts[j].x, pts[j].y, u)) j--;
      out.push(pts[j]); cur = pts[j]; i = j + 1;
    }
    return out;
  }

  damageTile(i, dmg) {
    const tile = this.t[i];
    if (tile === T.WALL) {
      this.hp[i] -= dmg;
      if (this.hp[i] <= 0) { this.t[i] = T.BREACH; this.version++; this.dirty = true; return 'wall'; }
    } else if (tile === T.GATE) {
      return this.damageGate(dmg);
    }
    return null;
  }
  damageGate(dmg) {
    if (this.gateHp <= 0) return null;
    this.gateHp -= dmg;
    if (this.gateHp <= 0) {
      this.gateHp = 0;
      for (let x = 28; x <= 31; x++) this.t[WALL_ROW * COLS + x] = T.BREACH;
      this.version++; this.dirty = true;
      return 'gate';
    }
    return null;
  }
  get gateOpen() { return this.kind === 'siege' && this.gateHp <= 0; }
  breaches() {
    const out = [];
    if (this.kind !== 'siege') return out;
    for (let x = 0; x < COLS; x++) if (this.t[WALL_ROW * COLS + x] === T.BREACH) out.push({ x: (x + 0.5) * TS, y: WALL_Y + TS / 2 });
    return out;
  }

  addCorpse(x, y, cls) {
    if (this.corpses.length > 4000) this.corpses.shift();
    const c = { x, y, cls };
    this.corpses.push(c);
    if (!this.dirty) this.drawCorpse(c);
  }
  drawCorpse(c) {
    const g = this.cx;
    g.fillStyle = c.cls === 'cav' ? 'rgba(70,40,25,.75)' : 'rgba(90,25,20,.6)';
    g.beginPath();
    g.arc(c.x * MS, c.y * MS, (c.cls === 'cav' ? 2.6 : 1.7) * MS, 0, TAU);
    g.fill();
  }

  render() {
    this.dirty = false;
    const g = this.cx, r = rng(99);
    g.setTransform(MS, 0, 0, MS, 0, 0);
    const dry = this.ground === 'dry';
    const base = dry ? [150, 142, 92] : [98, 124, 70];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x, e = this.elev[i];
      const n = (r() - 0.5) * 10;
      const k = 1 + e * 0.28;
      g.fillStyle = `rgb(${base[0] * k + n + e * 25 | 0},${base[1] * k + n + e * 12 | 0},${base[2] * k + n | 0})`;
      g.fillRect(x * TS, y * TS, TS + 0.5, TS + 0.5);
    }
    // تظليل التلال وخطوط الكنتور
    for (const hl of this.hills) {
      const gr = g.createRadialGradient(hl.x - hl.rad * 0.25, hl.y - hl.rad * 0.25, hl.rad * 0.1, hl.x, hl.y, hl.rad);
      gr.addColorStop(0, 'rgba(255,240,190,.18)'); gr.addColorStop(1, 'rgba(40,30,10,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(hl.x, hl.y, hl.rad, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(70,50,20,.28)'; g.lineWidth = 1.1;
      for (const lv of [0.3, 0.55, 0.8]) {
        if (lv >= hl.ht) continue;
        const rr = hl.rad * Math.sqrt(1 - lv / hl.ht);
        g.beginPath(); g.arc(hl.x, hl.y, rr, 0, TAU); g.stroke();
      }
    }
    // عشب ونقوش
    for (let k = 0; k < 2600; k++) {
      const x = r() * BW, y = r() * BH;
      g.fillStyle = r() < 0.5 ? 'rgba(40,50,20,.18)' : 'rgba(230,220,160,.12)';
      g.fillRect(x, y, 1.5, 1.5);
    }
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x, tile = this.t[i], px = x * TS, py = y * TS;
      if (tile === T.WATER) {
        g.fillStyle = '#3f6f86'; g.fillRect(px, py, TS + 0.5, TS + 0.5);
        g.strokeStyle = 'rgba(200,230,240,.25)'; g.beginPath();
        g.moveTo(px + 3, py + 7 + r() * 6); g.lineTo(px + 14, py + 7 + r() * 6); g.stroke();
      } else if (tile === T.FORD) {
        g.fillStyle = '#7f9a92'; g.fillRect(px, py, TS + 0.5, TS + 0.5);
        g.fillStyle = 'rgba(210,200,160,.5)';
        for (let k = 0; k < 4; k++) g.fillRect(px + r() * 17, py + r() * 17, 3, 2);
      } else if (tile === T.ROAD) {
        g.fillStyle = dry ? '#b9a37a' : '#a89370'; g.fillRect(px, py, TS + 0.5, TS + 0.5);
        g.fillStyle = 'rgba(80,60,40,.18)';
        for (let k = 0; k < 3; k++) g.fillRect(px + r() * 18, py + r() * 18, 2, 2);
      } else if (tile === T.BUILD) {
        g.fillStyle = '#6b5846'; g.fillRect(px, py, TS + 0.5, TS + 0.5);
      } else if (tile === T.WALL) {
        g.fillStyle = '#8d8578'; g.fillRect(px, py - 3, TS + 0.5, TS + 6);
        g.fillStyle = '#6f675b';
        g.fillRect(px + 2, py - 5, 6, 4); g.fillRect(px + 12, py - 5, 6, 4);
        const dmg = 1 - this.hp[i] / (150 + 80 * Math.max(1, this.walls));
        if (dmg > 0.3) { g.fillStyle = `rgba(40,35,30,${dmg * 0.6})`; g.fillRect(px + 4, py + 4, 10, 8); }
      } else if (tile === T.GATE) {
        g.fillStyle = '#5a3b22'; g.fillRect(px, py - 2, TS + 0.5, TS + 4);
        g.strokeStyle = '#2e1d10'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(px, py + 5); g.lineTo(px + TS, py + 5); g.moveTo(px, py + 14); g.lineTo(px + TS, py + 14); g.stroke();
      } else if (tile === T.BREACH) {
        g.fillStyle = '#8e8676';
        for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(px + r() * TS, py + r() * TS, 1.5 + r() * 2.5, 0, TAU); g.fill(); }
      }
    }
    // الأسقف فوق المباني
    if (this.kind === 'siege') {
      const seen = new Uint8Array(COLS * ROWS);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        if (this.t[i] !== T.BUILD || seen[i]) continue;
        let w = 0; while (x + w < COLS && this.t[y * COLS + x + w] === T.BUILD && !seen[y * COLS + x + w]) w++;
        let hh = 0; while (y + hh < ROWS && this.t[(y + hh) * COLS + x] === T.BUILD) hh++;
        for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + w; xx++) seen[yy * COLS + xx] = 1;
        const roof = r() < 0.5 ? (this.ground === 'dry' ? '#c9b28a' : '#7a3a2c') : (this.ground === 'dry' ? '#b59c72' : '#45505a');
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x * TS + 3, y * TS + 3, w * TS, hh * TS);
        g.fillStyle = roof; g.fillRect(x * TS + 1, y * TS + 1, w * TS - 2, hh * TS - 2);
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
        g.beginPath();
        if (w >= hh) { g.moveTo(x * TS + 2, (y + hh / 2) * TS); g.lineTo((x + w) * TS - 2, (y + hh / 2) * TS); }
        else { g.moveTo((x + w / 2) * TS, y * TS + 2); g.lineTo((x + w / 2) * TS, (y + hh) * TS - 2); }
        g.stroke();
      }
      // أبراج الأسوار
      for (let x = 2; x < COLS; x += 9) {
        if (x >= 26 && x <= 33) continue;
        const i = WALL_ROW * COLS + x;
        if (this.t[i] !== T.WALL) continue;
        g.fillStyle = '#9a9284'; g.fillRect(x * TS - 4, WALL_Y - 8, TS + 8, TS + 14);
        g.strokeStyle = '#5d564b'; g.strokeRect(x * TS - 4, WALL_Y - 8, TS + 8, TS + 14);
      }
      if (this.plaza) {
        const p = this.plaza;
        g.strokeStyle = 'rgba(80,60,30,.35)'; g.lineWidth = 0.6;
        for (let yy = p.y; yy < p.y + p.h; yy += 6) { g.beginPath(); g.moveTo(p.x, yy); g.lineTo(p.x + p.w, yy); g.stroke(); }
      }
    }
    // الأشجار
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (this.t[y * COLS + x] !== T.FOREST) continue;
      for (let k = 0; k < 3; k++) {
        const tx = x * TS + 3 + r() * 14, ty = y * TS + 3 + r() * 14, tr = 4 + r() * 4;
        g.fillStyle = 'rgba(15,25,10,.35)'; g.beginPath(); g.arc(tx + 2, ty + 2, tr, 0, TAU); g.fill();
        g.fillStyle = dry ? `rgb(${70 + r() * 20 | 0},${90 + r() * 20 | 0},${45 + r() * 10 | 0})` : `rgb(${35 + r() * 20 | 0},${70 + r() * 25 | 0},${35 + r() * 15 | 0})`;
        g.beginPath(); g.arc(tx, ty, tr, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,200,.08)'; g.beginPath(); g.arc(tx - 1.5, ty - 1.5, tr * 0.5, 0, TAU); g.fill();
      }
    }
    for (const c of this.corpses) this.drawCorpse(c);
  }
}

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.v.length; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = v.length; k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop() {
    const k = this.k, v = this.v, top = v[0];
    const lk = k.pop(), lv = v.pop();
    if (v.length) {
      k[0] = lk; v[0] = lv;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, rr = l + 1;
        let m = i;
        if (l < v.length && k[l] < k[m]) m = l;
        if (rr < v.length && k[rr] < k[m]) m = rr;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

// ——————————————————— الفرقة ———————————————————
let REG_ID = 1;

class Regiment {
  constructor(b, side, type, men, o = {}) {
    this.b = b; this.id = REG_ID++; this.side = side; this.type = type; this.def = UNITS[type];
    this.maxMen = UNITS[type].men; this.men = Math.max(1, Math.round(men)); this.startMen = this.men;
    this.exp = o.exp || 0; this.ref = o.ref || null; this.name = o.name || this.def.name;
    this.x = 0; this.y = 0;
    this.facing = side === 0 ? -Math.PI / 2 : Math.PI / 2;
    this.wantFace = null;
    this.formation = this.def.forms[0];
    this.stance = 'aggressive'; this.fireAtWill = true;
    this.state = 'idle'; this.order = null; this.path = []; this.pathGoal = null; this.pathT = 0;
    const tr = b.traits[side];
    let mor = 62 + this.exp * 6 + (tr === 'brave' ? 15 : 0);
    if (type === 'general') mor = 90;
    if (type === 'militia') mor -= 10;
    if (b.kind === 'siege' && side === 1) mor += 12; // يدافعون عن بيوتهم
    this.maxMorale = Math.min(100, mor); this.morale = this.maxMorale;
    this.dmgAcc = 0; this.reload = R() * 1.5; this.ammo = this.def.ammo || 0;
    this.contacts = []; this.prevContacts = new Set();
    this.engaged = false; this.primary = null; this.engageTime = 0;
    this.chargeReady = true; this.calmT = 10; this.sinceHit = 99; this.sinceFire = 99; this.speedNow = 0;
    this.kills = 0; this.hidden = false; this.rallies = 0; this.routT = 0; this.disengage = false;
    this.dead = false; this.fled = false; this.selected = false;
    this.soldiers = []; this.slots = null; this.slotMen = -1; this.slotForm = null;
    this.kiteT = 0; this.kiteFrom = null; this.shotTarget = null; this.machines = 1;
    this.flankedT = 0; this.ladders = !!o.ladders;
    this.u = { cls: this.def.cls, ladders: this.ladders && this.def.cls === 'inf' };
    this.layout();
  }

  get alive() { return !this.dead && !this.fled; }
  get active() { return this.alive && this.state !== 'routing'; }
  get ranged() { return !!this.def.range; }
  get fx() { return Math.cos(this.facing); }
  get fy() { return Math.sin(this.facing); }

  visibleTo(side) { return side === this.side || side < 0 || !this.hidden; }

  layout() {
    if (this.slotMen === this.men && this.slotForm === this.formation) return;
    this.slotMen = this.men; this.slotForm = this.formation;
    const d = this.def, n = Math.max(1, this.men), f = this.formation;
    let sp = d.cls === 'cav' ? 9 : 5.6;
    if (f === 'loose') sp *= 1.8;
    const slots = [];
    let hw, hd;
    if (d.cls === 'mach') {
      const m = this.type === 'ram' ? 1 : Math.max(1, Math.ceil(n / 4));
      this.machines = m;
      const msp = 30;
      this.machineSlots = [];
      for (let j = 0; j < m; j++) this.machineSlots.push({ s: (j - (m - 1) / 2) * msp, f: 0 });
      for (let i = 0; i < n; i++) {
        const j = i % m, k = Math.floor(i / m);
        const ms = this.machineSlots[j];
        if (this.type === 'ram') slots.push({ s: (k % 2 ? 7 : -7), f: 10 - Math.floor(k / 2) * 5 });
        else slots.push({ s: ms.s + (k % 2 ? 7 : -7), f: -12 - Math.floor(k / 2) * 4 });
      }
      hw = m * msp / 2; hd = 16;
    } else if (f === 'wedge') {
      let k = 0, i = 0;
      while (i < n) { for (let j = 0; j <= 2 * k && i < n; j++, i++) slots.push({ s: (j - k) * sp, f: -k * sp * 0.85 }); k++; }
      hw = k * sp; hd = k * sp * 0.85 / 2;
      for (const s of slots) s.f += hd;
    } else {
      let rows = f === 'square' ? Math.ceil(Math.sqrt(n)) : (d.cls === 'cav' ? 2 : 3);
      if (f !== 'square' && n < rows * 3) rows = 1;
      const cols = Math.ceil(n / rows);
      for (let i = 0; i < n; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        slots.push({ s: (col - (cols - 1) / 2) * sp, f: ((rows - 1) / 2 - row) * sp });
      }
      hw = cols * sp / 2; hd = rows * sp / 2;
    }
    this.slots = slots;
    this.hw = hw + 2; this.hd = hd + 2;
    this.rad = Math.hypot(this.hw, this.hd);
  }

  placeSoldiers() {
    this.layout();
    this.soldiers = [];
    const fx = this.fx, fy = this.fy;
    for (let i = 0; i < this.men; i++) {
      const s = this.slots[i];
      this.soldiers.push({ x: this.x + fx * s.f - fy * s.s, y: this.y + fy * s.f + fx * s.s, jx: R() * 2 - 1, jy: R() * 2 - 1 });
    }
  }

  frontage() {
    const f = this.formation;
    return Math.min(this.men, f === 'line' ? 30 : f === 'square' ? 18 : f === 'wedge' ? 22 : 20);
  }

  containsPoint(px, py, pad = 0) {
    const dx = px - this.x, dy = py - this.y;
    const lf = dx * this.fx + dy * this.fy, ls = -dx * this.fy + dy * this.fx;
    return Math.abs(lf) <= this.hd + pad && Math.abs(ls) <= this.hw + pad;
  }

  speed() {
    let s = this.def.speed * this.b.map.speedMul(this.x, this.y, this.def.cls);
    if (this.formation === 'square') s *= 0.6;
    else if (this.formation === 'wedge') s *= 1.04;
    if (this.state === 'routing') s *= 1.15;
    else if (this.morale < 25) s *= 0.9;
    if (this.engaged && this.disengage) s *= 0.5;
    return s;
  }

  range() {
    let r = this.def.range || 0;
    if (this.b.map.elevAt(this.x, this.y) > 0.45) r *= 1.2;
    if (this.b.onWallLine(this)) r *= 1.15;
    return r;
  }

  hit(dmg, src) {
    if (!this.alive || dmg <= 0) return;
    this.dmgAcc += dmg; this.sinceHit = 0;
    const hp = this.def.hp * (1 + 0.05 * this.exp);
    while (this.dmgAcc >= hp && this.men > 0) {
      this.dmgAcc -= hp;
      this.killOne();
      if (src) src.kills++;
    }
  }

  killOne() {
    this.men--;
    const s = this.soldiers.splice(Math.floor(R() * Math.min(this.soldiers.length, 20)), 1)[0];
    if (s) this.b.map.addCorpse(s.x, s.y, this.def.cls);
    this.b.stats[this.side].lost++;
    this.morale -= (38 / this.maxMen) * (this.def.cls === 'mach' ? 0.4 : 1);
    if (this.men <= 0) {
      this.dead = true; this.state = 'dead'; this.selected = false;
      this.b.onRegDead(this);
    }
  }

  rout() {
    if (this.state === 'routing' || !this.alive) return;
    this.state = 'routing'; this.order = null; this.path = []; this.routT = 0; this.morale = 0;
    this.disengage = false;
    const edgeY = this.b.fleeY(this.side);
    this.path = this.b.map.findPath(this.x, this.y, clamp(this.x, 40, BW - 40), clamp(edgeY, 4, BH - 4), this.u) || [];
    this.b.onRout(this);
  }

  setOrder(o) {
    if (!this.alive || this.state === 'routing') return;
    this.order = o; this.path = []; this.pathGoal = null; this.pathT = 0;
    if (o && this.engaged && !o.auto) this.disengage = o.type === 'move';
    if (o && o.type === 'move') this.planPath(o.x, o.y);
  }

  planPath(gx, gy) {
    this.pathGoal = { x: gx, y: gy }; this.pathT = 0;
    this.path = this.b.map.findPath(this.x, this.y, gx, gy, this.u) || [];
  }

  turnToward(ang, dt, rate) {
    const d = angDiff(this.facing, ang);
    const r = (rate || (this.def.cls === 'cav' ? 2.4 : this.def.cls === 'mach' ? 0.8 : 1.6)) * dt;
    if (Math.abs(d) <= r) { this.facing = ang; return true; }
    this.facing += Math.sign(d) * r;
    return false;
  }

  stepPath(dt) {
    if (!this.path.length) return true;
    const wp = this.path[0];
    const dx = wp.x - this.x, dy = wp.y - this.y, d = Math.hypot(dx, dy);
    if (d < 3) { this.path.shift(); return this.path.length === 0; }
    const want = Math.atan2(dy, dx);
    const diff = Math.abs(angDiff(this.facing, want));
    this.turnToward(want, dt);
    const slow = diff > 1.2 ? 0.25 : diff > 0.6 ? 0.6 : 1;
    const step = Math.min(this.speed() * slow * dt, d);
    const nx = this.x + dx / d * step, ny = this.y + dy / d * step;
    if (!this.b.map.passAt(nx, ny, this.u) && this.b.map.passAt(this.x, this.y, this.u)) {
      if (this.pathGoal) this.planPath(this.pathGoal.x, this.pathGoal.y);
      else this.path = [];
      return false;
    }
    this.x = nx; this.y = ny;
    this.speedNow = step / dt;
    return false;
  }

  goTo(gx, gy, dt) {
    this.pathT += dt;
    const pg = this.pathGoal;
    if (!pg || !this.path.length || Math.hypot(pg.x - gx, pg.y - gy) > 30 || this.pathT > 2 || this.b.map.version !== this.pathVer) {
      this.pathVer = this.b.map.version;
      this.planPath(gx, gy);
    }
    return this.stepPath(dt);
  }

  inRangeOf(t) {
    const d = Math.hypot(t.x - this.x, t.y - this.y);
    return d <= this.range() && !(this.def.minRange && d < this.def.minRange);
  }

  shootAt(t, dt) {
    const want = Math.atan2(t.y - this.y, t.x - this.x);
    const tol = this.type === 'horsearcher' ? 1.6 : this.def.cls === 'mach' ? 0.5 : 0.4;
    const ok = this.turnToward(want, dt) || Math.abs(angDiff(this.facing, want)) < tol;
    this.shotTarget = t;
    if (ok && this.reload <= 0 && this.ammo > 0) this.b.fireVolley(this, t);
  }

  pickRangedTarget() {
    const st = this.shotTarget;
    if (st && st.alive && st.visibleTo(this.side) && this.inRangeOf(st) && (st.state !== 'routing' || this.def.cls !== 'mach')) return st;
    let best = null, bd = 1e9;
    for (const e of this.b.regs) {
      if (e.side === this.side || !e.alive || !e.visibleTo(this.side)) continue;
      if (!this.inRangeOf(e)) continue;
      let d = Math.hypot(e.x - this.x, e.y - this.y);
      if (e.state === 'routing') d *= 2.5;
      if (this.def.cls === 'mach') d /= Math.max(1, e.men / 20);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  nearestEnemy(maxD, filter) {
    let best = null, bd = maxD;
    for (const e of this.b.regs) {
      if (e.side === this.side || !e.alive || !e.visibleTo(this.side)) continue;
      if (filter && !filter(e)) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y) - e.rad - this.rad;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  update(dt) {
    this.layout();
    this.reload -= dt; this.sinceHit += dt; this.sinceFire += dt;
    this.speedNow *= 0.9;
    if (this.state === 'routing') { this.updateRout(dt); this.updateSoldiers(dt); return; }

    const foes = this.contacts.filter((e) => e.state !== 'routing');
    this.engaged = foes.length > 0;
    if (this.engaged) {
      this.engageTime += dt; this.calmT = 0;
      if (!this.primary || !foes.includes(this.primary)) this.primary = foes[0];
      if (!this.disengage) this.turnToward(Math.atan2(this.primary.y - this.y, this.primary.x - this.x), dt, 0.35);
    } else {
      this.engageTime = 0; this.primary = null; this.calmT += dt;
      if (this.calmT > 5) this.chargeReady = true;
      this.disengage = false;
    }
    this.state = this.engaged ? 'fighting' : (this.order ? 'moving' : 'idle');

    // المعنويات
    if (!this.engaged && this.sinceHit > 3) {
      const regen = 1.2 + (this.b.nearGeneral(this) ? 1.5 : 0);
      this.morale = Math.min(this.maxMorale, this.morale + regen * dt);
    }
    if (this.morale <= 0 || (this.men < this.startMen * 0.12 && this.morale < 35)) { this.rout(); this.updateSoldiers(dt); return; }

    // الكرّ والفرّ للخيالة الرماة
    if (this.type === 'horsearcher' && !this.engaged) {
      if (this.kiteT <= 0) {
        const th = this.nearestEnemy(70, (e) => e.active && !e.ranged && e.def.cls !== 'mach');
        if (th) { this.kiteT = 1.6; this.kiteFrom = th; }
      }
      if (this.kiteT > 0) {
        this.kiteT -= dt;
        const k = this.kiteFrom;
        const a = Math.atan2(this.y - k.y, this.x - k.x);
        const gx = clamp(this.x + Math.cos(a) * 80, 20, BW - 20), gy = clamp(this.y + Math.sin(a) * 80, 20, BH - 20);
        this.goTo(gx, gy, dt);
        this.updateSoldiers(dt);
        return;
      }
    }

    this.act(dt);
    this.updateSoldiers(dt);
  }

  act(dt) {
    let o = this.order;
    if (o && o.type === 'attack' && (!o.target.alive || (o.auto && o.target.state === 'routing' && this.def.cls !== 'cav'))) { this.order = o = null; }
    if (o && o.type === 'attack' && !o.target.visibleTo(this.side)) {
      this.setOrder({ type: 'move', x: o.target.x, y: o.target.y });
      o = this.order;
    }
    if (o && o.auto && o.type === 'attack' && o.anchor && Math.hypot(this.x - o.anchor.x, this.y - o.anchor.y) > 260) {
      this.order = o = null;
    }
    if (this.engaged && !this.disengage) return;

    if (o && o.type === 'move') {
      if (this.stepPath(dt)) {
        if (o.face != null) this.wantFace = o.face;
        this.order = null;
      }
      return;
    }
    if (o && o.type === 'attack') {
      const t = o.target;
      if (this.ranged && this.ammo > 0 && !o.melee) {
        if (this.inRangeOf(t)) { this.path = []; this.shootAt(t, dt); return; }
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (this.def.minRange && d < this.def.minRange) {
          const a = Math.atan2(this.y - t.y, this.x - t.x);
          this.goTo(this.x + Math.cos(a) * 60, this.y + Math.sin(a) * 60, dt);
          return;
        }
        this.chase(t, dt, o, this.range() * 0.85);
        return;
      }
      this.chase(t, dt, o, 0);
      return;
    }
    if (o && o.type === 'wall') {
      const d = Math.hypot(o.x - this.x, o.y - this.y);
      if (d <= this.range() && d >= (this.def.minRange || 0)) {
        this.path = [];
        const want = Math.atan2(o.y - this.y, o.x - this.x);
        if ((this.turnToward(want, dt) || Math.abs(angDiff(this.facing, want)) < 0.5) && this.reload <= 0 && this.ammo > 0) this.b.fireAtPoint(this, o.x, o.y);
        const i = this.b.map.idx(o.x, o.y), tile = this.b.map.t[i];
        if (tile !== T.WALL && tile !== T.GATE) this.order = null;
      } else this.goTo(o.x, o.y + 80, dt);
      return;
    }
    if (o && o.type === 'gate') {
      if (this.b.map.gateOpen) { this.order = null; return; }
      const gx = 30 * TS, gy = WALL_Y + TS + 16;
      if (Math.hypot(gx - this.x, gy - this.y) > 12) this.goTo(gx, gy, dt);
      else { this.path = []; this.turnToward(-Math.PI / 2, dt); }
      return;
    }

    // خامل
    if (this.wantFace != null) { if (this.turnToward(this.wantFace, dt)) this.wantFace = null; }
    if (this.ranged && this.ammo > 0 && this.fireAtWill) {
      const t = this.pickRangedTarget();
      if (t) { this.shootAt(t, dt); return; }
    }
    if (this.stance === 'aggressive' && this.def.cls !== 'mach' && !(this.ranged && this.ammo > 0)) {
      const e = this.nearestEnemy(70, (x) => x.active);
      if (e) this.setOrder({ type: 'attack', target: e, auto: true, anchor: { x: this.x, y: this.y } });
    }
  }

  chase(t, dt, o, keep) {
    let gx = t.x, gy = t.y;
    const d = Math.hypot(t.x - this.x, t.y - this.y);
    if (o.flank && t.active && d > this.rad + t.rad + 25) {
      const tfx = t.fx, tfy = t.fy;
      const rx = -tfy, ry = tfx;
      const dx = this.x - t.x, dy = this.y - t.y;
      const inFront = dx * tfx + dy * tfy > -t.hd;
      if (inFront) {
        const sgn = Math.sign(dx * rx + dy * ry) || 1;
        gx = t.x + rx * sgn * (t.hw + 70) - tfx * 20; gy = t.y + ry * sgn * (t.hw + 70) - tfy * 20;
      } else {
        gx = t.x - tfx * (t.hd + 35); gy = t.y - tfy * (t.hd + 35);
        if (Math.hypot(gx - this.x, gy - this.y) < 30) { gx = t.x; gy = t.y; }
      }
    }
    if (keep > 0) {
      if (d > keep) this.goTo(t.x, t.y, dt);
      return;
    }
    this.goTo(gx, gy, dt);
  }

  updateRout(dt) {
    this.routT += dt;
    this.engaged = false;
    const edgeY = this.b.fleeY(this.side);
    if (this.stepPath(dt)) {
      const dir = edgeY < 0 ? -1 : 1;
      this.facing = dir < 0 ? -Math.PI / 2 : Math.PI / 2;
      this.y += dir * this.speed() * dt;
      this.speedNow = this.speed();
    }
    if (this.y < -15 || this.y > BH + 15) {
      this.fled = true; this.state = 'fled'; this.selected = false;
      this.b.onFled(this);
      return;
    }
    const near = this.nearestEnemy(150, (e) => e.active);
    if (!near && this.routT > 7 && this.rallies < 2) {
      this.morale += 5 * dt;
      if (this.morale >= 30) {
        this.state = 'idle'; this.rallies++; this.routT = 0; this.path = [];
        this.b.float(this.x, this.y - 20, 'تجمّعوا من جديد', '#e8d27a');
      }
    }
  }

  updateSoldiers(dt) {
    const fx = this.fx, fy = this.fy;
    const routing = this.state === 'routing';
    const t = this.b.time;
    const k = Math.min(1, dt * (this.def.cls === 'cav' ? 5 : 4));
    const n = this.soldiers.length;
    for (let i = 0; i < n; i++) {
      const s = this.soldiers[i], sl = this.slots[i] || this.slots[0];
      let tx = this.x + fx * sl.f - fy * sl.s, ty = this.y + fy * sl.f + fx * sl.s;
      if (routing) { tx += s.jx * 14; ty += s.jy * 14; }
      else if (this.engaged) { const w = Math.sin(t * 7 + i * 1.7) * 1.6; tx += fx * w + s.jx; ty += fy * w + s.jy; }
      s.x += (tx - s.x) * k; s.y += (ty - s.y) * k;
    }
  }
}

function obbOverlap(a, b, pad) {
  const ax = [a.fx, a.fy], ar = [-a.fy, a.fx], bx = [b.fx, b.fy], br = [-b.fy, b.fx];
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const ax2 of [ax, ar, bx, br]) {
    const pa = a.hd * Math.abs(ax[0] * ax2[0] + ax[1] * ax2[1]) + a.hw * Math.abs(ar[0] * ax2[0] + ar[1] * ax2[1]);
    const pb = b.hd * Math.abs(bx[0] * ax2[0] + bx[1] * ax2[1]) + b.hw * Math.abs(br[0] * ax2[0] + br[1] * ax2[1]);
    if (Math.abs(dx * ax2[0] + dy * ax2[1]) > pa + pb + pad) return false;
  }
  return true;
}

// اتجاه الضربة بالنسبة للهدف
function relDir(t, a) {
  const dx = a.x - t.x, dy = a.y - t.y;
  const lf = dx * t.fx + dy * t.fy, ls = -dx * t.fy + dy * t.fx;
  const nf = lf / (t.hd + (a.hd || 8)), ns = ls / (t.hw + (a.hd || 8) * 0.5);
  if (Math.abs(nf) >= Math.abs(ns)) return nf > 0 ? 'front' : 'rear';
  return 'flank';
}

// ——————————————————— المعركة ———————————————————
class Battle {
  constructor(cfg) {
    this.cfg = cfg;
    this.kind = cfg.kind || 'field';
    this.map = new BattleMap({ kind: this.kind, terrain: cfg.terrain, seed: cfg.seed, walls: cfg.walls, ground: cfg.ground });
    this.regs = []; this.projectiles = []; this.particles = []; this.floaters = [];
    this.time = 0; this.phase = 'deploy'; this.speed = 1; this.paused = false;
    this.playerSide = cfg.sides.findIndex((s) => s.player);
    this.traits = cfg.sides.map((s) => (s.general && s.general.trait) || null);
    this.stats = cfg.sides.map(() => ({ start: 0, lost: 0 }));
    this.plazaT = 0; this.timeLimit = cfg.timeLimit || (this.kind === 'siege' ? 720 : 600);
    this.result = null; this.hiddenT = 0; this.checkT = 0; this.events = [];
    this.generalDown = [false, false];
    cfg.sides.forEach((s, side) => {
      const ladders = this.kind === 'siege' && side === 0 && cfg.equip && cfg.equip.ladders;
      for (const rg of s.regs) {
        const r = new Regiment(this, side, rg.type, rg.men, { exp: rg.exp, ref: rg, ladders });
        this.regs.push(r);
      }
      if (s.general) {
        const g = new Regiment(this, side, 'general', s.general.men || 16, { name: s.general.name, ref: s.general });
        this.regs.push(g);
      }
      if (this.kind === 'siege' && side === 0 && cfg.equip && cfg.equip.ram) {
        this.regs.push(new Regiment(this, side, 'ram', 10, { ref: null }));
      }
    });
    for (const r of this.regs) this.stats[r.side].start += r.men;
    this.ais = cfg.sides.map((s, i) => (s.player ? null : new BattleAI(this, i, s.ai == null ? 0.6 : s.ai)));
    for (let i = 0; i < 2; i++) {
      if (this.ais[i]) this.ais[i].deploy();
      else this.autoDeploy(i, 'classic');
    }
  }

  sideRegs(side) { return this.regs.filter((r) => r.side === side); }
  color(side) { return this.cfg.sides[side].color; }
  fleeY(side) {
    if (this.kind === 'siege') return side === 0 ? BH + 60 : -60;
    return side === 0 ? BH + 60 : -60;
  }

  zone(side) {
    if (this.kind === 'siege') {
      return side === 0 ? { x0: 60, x1: BW - 60, y0: WALL_Y + 250, y1: BH - 25 } : { x0: 40, x1: BW - 40, y0: 30, y1: WALL_Y - 14 };
    }
    return side === 0 ? { x0: 120, x1: BW - 120, y0: BH - 200, y1: BH - 25 } : { x0: 120, x1: BW - 120, y0: 25, y1: 200 };
  }

  onWallLine(r) {
    return this.kind === 'siege' && r.side === 1 && r.y < WALL_Y && r.y > WALL_Y - 55;
  }

  nearGeneral(r) {
    for (const g of this.regs) {
      if (g.type === 'general' && g.side === r.side && g.active && g !== r && Math.hypot(g.x - r.x, g.y - r.y) < 160) return true;
    }
    return false;
  }

  // ——— التمركز ———
  ensurePassable(r) {
    if (this.map.passAt(r.x, r.y, r.u)) return;
    const i = this.map.nearestOk(this.map.idx(clamp(r.x, 0, BW - 1), clamp(r.y, 0, BH - 1)), r.u);
    if (i >= 0) { r.x = (i % COLS + 0.5) * TS; r.y = (Math.floor(i / COLS) + 0.5) * TS; }
  }

  placeReg(r, x, y, face) {
    const z = this.zone(r.side);
    r.x = clamp(x, z.x0 + 10, z.x1 - 10); r.y = clamp(y, z.y0 + 8, z.y1 - 8);
    if (face != null) r.facing = face;
    this.ensurePassable(r);
    r.placeSoldiers();
  }

  autoDeploy(side, style) {
    const list = this.sideRegs(side).filter((r) => r.alive);
    const z = this.zone(side);
    const fwd = side === 0 ? -1 : 1;
    const face = side === 0 ? -Math.PI / 2 : Math.PI / 2;
    for (const r of list) { r.facing = face; r.layout(); }
    const inf = list.filter((r) => r.def.cls === 'inf' && !r.ranged);
    const arch = list.filter((r) => r.def.cls === 'inf' && r.ranged);
    const cav = list.filter((r) => r.type === 'cavalry');
    const ha = list.filter((r) => r.type === 'horsearcher');
    const cat = list.filter((r) => r.type === 'catapult');
    const ram = list.filter((r) => r.type === 'ram');
    const gen = list.filter((r) => r.type === 'general');

    if (this.kind === 'siege' && side === 1) {
      // المدافعون: الرماة على السور، المشاة خلف البوابة، الخيالة في الساحة
      const wy = WALL_Y - 26;
      arch.forEach((r, i) => this.placeReg(r, 150 + (BW - 300) * ((i + 0.5) / Math.max(1, arch.length)), wy, face));
      inf.forEach((r, i) => this.placeReg(r, BW / 2 + (i - (inf.length - 1) / 2) * 130, WALL_Y - 80 - Math.floor(i / 4) * 40, face));
      [...cav, ...ha, ...gen, ...cat].forEach((r, i) => this.placeReg(r, this.map.plaza.x + 40 + (i % 3) * 70, this.map.plaza.y + 30 + Math.floor(i / 3) * 40, face));
      return;
    }

    let cx = (z.x0 + z.x1) / 2;
    if (style === 'defensive') {
      let best = -1, bx = cx;
      for (let x = z.x0 + 150; x < z.x1 - 150; x += TS) {
        for (let y = z.y0; y < z.y1; y += TS) { const e = this.map.elevAt(x, y); if (e > best) { best = e; bx = x; } }
      }
      if (best > 0.3) cx = bx;
    }
    const frontY = side === 0 ? z.y0 + 45 : z.y1 - 45;
    const row = (arr, y, center, gap = 14) => {
      const w = arr.reduce((s, r) => s + r.hw * 2 + gap, -gap);
      let x = center - w / 2;
      for (const r of arr) { this.placeReg(r, x + r.hw, y, face); x += r.hw * 2 + gap; }
      return w;
    };
    const infFront = this.kind === 'siege' ? frontY - fwd * 50 : frontY;
    if (ram.length) row(ram, frontY, cx);
    const iw = inf.length ? row(inf, infFront, cx) : 0;
    const aw = arch.length ? row(arch, infFront - fwd * 42, cx) : 0;
    const half = Math.max(iw, aw) / 2 + 20;
    let lx = cx - half, rxx = cx + half;
    const wings = [...cav, ...ha];
    wings.forEach((r, i) => {
      if (i % 2 === 0) { this.placeReg(r, lx - r.hw, infFront - fwd * 10, face); lx -= r.hw * 2 + 14; }
      else { this.placeReg(r, rxx + r.hw, infFront - fwd * 10, face); rxx += r.hw * 2 + 14; }
    });
    if (cat.length) row(cat, infFront - fwd * 110, cx, 30);
    gen.forEach((r) => this.placeReg(r, cx, infFront - fwd * 80, face));

    if (style === 'ambush') {
      const forestSpots = [];
      for (let y = z.y0; y < z.y1; y += TS) for (let x = z.x0; x < z.x1; x += TS) {
        if (this.map.tileAt(x, y) === T.FOREST) forestSpots.push({ x, y });
      }
      forestSpots.sort((a, b) => Math.abs(b.x - cx) - Math.abs(a.x - cx));
      const used = [];
      for (const r of [...cav, ...ha]) {
        const s = forestSpots.find((p) => used.every((u) => Math.hypot(u.x - p.x, u.y - p.y) > 70));
        if (!s) break;
        used.push(s);
        this.placeReg(r, s.x, s.y, face);
      }
    }
  }

  start() {
    this.phase = 'battle';
    for (const r of this.regs) { r.selected = false; }
    for (const ai of this.ais) if (ai) ai.onStart();
  }

  // ——— الحلقة ———
  update(dt) {
    this.updateFx(this.paused || this.phase !== 'battle' ? 0 : dt * this.speed);
    if (this.phase !== 'battle' || this.paused) return;
    const n = this.speed;
    for (let k = 0; k < n; k++) { this.step(dt); if (this.phase !== 'battle') break; }
  }

  step(dt) {
    this.time += dt;
    for (const ai of this.ais) if (ai) ai.update(dt);
    this.computeContacts();
    for (const r of this.regs) if (r.alive) r.update(dt);
    this.resolveMelee(dt);
    this.separate(dt);
    this.updateProjectiles(dt);
    this.updateRam(dt);

    this.hiddenT -= dt;
    if (this.hiddenT <= 0) { this.hiddenT = 0.5; this.updateHidden(); }
    this.checkT -= dt;
    if (this.checkT <= 0) { this.checkT = 0.5; this.checkEnd(0.5); }
  }

  computeContacts() {
    for (const r of this.regs) r.contacts.length = 0;
    const a0 = this.regs.filter((r) => r.alive && r.side === 0);
    const a1 = this.regs.filter((r) => r.alive && r.side === 1);
    for (const a of a0) for (const b of a1) {
      if (Math.abs(a.x - b.x) > a.rad + b.rad + 8 || Math.abs(a.y - b.y) > a.rad + b.rad + 8) continue;
      if (obbOverlap(a, b, 3)) { a.contacts.push(b); b.contacts.push(a); }
    }
    for (const r of this.regs) {
      if (!r.alive) continue;
      const now = new Set();
      for (const c of r.contacts) {
        now.add(c.id);
        if (!r.prevContacts.has(c.id)) this.onContact(r, c);
      }
      r.prevContacts = now;
    }
  }

  onContact(a, t) {
    if (!a.active) return;
    const dir = relDir(t, a);
    if (dir !== 'front' && t.active && t.formation !== 'square' && t.side === this.playerSide) {
      this.float(t.x, t.y - 18, dir === 'rear' ? 'هجوم من الخلف!' : 'التفاف على الجناح!', '#ff9a6a');
    }
    if (a.def.charge && a.chargeReady && a.speedNow > a.def.speed * 0.5) {
      a.chargeReady = false;
      const braced = t.def.antiCav && dir === 'front' && t.active && t.formation !== 'loose';
      if (braced) {
        a.hit(Math.min(t.men, 40) * 2.2, t);
        a.morale -= 8;
        this.float(t.x, t.y - 22, 'صدّ الرماحُ الانقضاض', '#bfe3ff');
      } else {
        let dmg = a.men * a.def.charge * 0.2 * (dir === 'rear' ? 1.6 : dir === 'flank' ? 1.3 : 1);
        if (a.formation === 'wedge') dmg *= 1.25;
        if (this.traits[a.side] === 'cavalier') dmg *= 1.25;
        if (t.formation === 'square' && t.def.antiCav) dmg *= 0.4;
        t.hit(dmg, a);
        t.morale -= dir === 'front' ? 10 : 18;
        this.float(t.x, t.y - 22, 'انقضاض!', '#ffd36a');
        this.dust(t.x, t.y, 10, 'rgba(160,130,90,.6)');
      }
    }
  }

  meleeMult(a, t) {
    let m = 1;
    const dir = relDir(t, a);
    if (t.state !== 'routing' && t.formation !== 'square') {
      let fb = dir === 'flank' ? 0.4 : dir === 'rear' ? 0.8 : 0;
      if (fb && this.traits[a.side] === 'tactician') fb *= 1.25;
      m *= 1 + fb;
    }
    if (t.state === 'routing') m *= 2.5;
    if (a.def.antiCav && t.def.cls === 'cav') m *= a.def.antiCav;
    if (a.def.cls === 'cav' && t.def.antiCav && dir === 'front' && t.state !== 'routing') m *= 0.6;
    const ea = this.map.elevAt(a.x, a.y), et = this.map.elevAt(t.x, t.y);
    if (ea > et + 0.12) m *= 1.2; else if (et > ea + 0.12) m *= 0.88;
    if (a.morale < 25) m *= 0.75;
    if (a.formation === 'wedge') m *= 1.12; else if (a.formation === 'loose') m *= 0.85; else if (a.formation === 'square') m *= 0.9;
    m *= 1 + 0.08 * a.exp;
    if (this.nearGeneral(a)) m *= 1.1;
    if (this.map.tileAt(a.x, a.y) === T.WALL) m *= 0.6;
    return { m, dir };
  }

  defEff(t, a) {
    let d = t.def.def * (1 + 0.06 * t.exp);
    if (t.formation === 'square') d *= a.def.cls === 'cav' ? 1.5 : 1.15;
    else if (t.formation === 'wedge') d *= 0.85;
    else if (t.formation === 'loose') d *= 0.75;
    const tile = this.map.tileAt(t.x, t.y);
    if (tile === T.WALL) d *= 0.5;
    if (tile === T.FORD) d *= 0.8;
    if (this.kind === 'siege' && t.side === 1) { d *= 1.12; if (this.traits[1] === 'stalwart') d *= 1.2; }
    return d;
  }

  resolveMelee(dt) {
    for (const a of this.regs) {
      if (!a.active || !a.contacts.length) continue;
      if (a.disengage) continue;
      const fighters = a.frontage();
      const per = fighters / a.contacts.length;
      for (const t of a.contacts) {
        if (!t.alive) continue;
        const { m, dir } = this.meleeMult(a, t);
        const dmg = per * 0.042 * a.def.atk * m * 10 / (10 + this.defEff(t, a)) * dt;
        t.hit(dmg, a);
        if (t.state !== 'routing' && t.formation !== 'square') {
          if (dir === 'flank') t.morale -= 2.5 * dt;
          else if (dir === 'rear') t.morale -= 5 * dt;
        }
        if (R() < dt * 3) this.spark((a.x + t.x) / 2, (a.y + t.y) / 2);
      }
    }
  }

  separate(dt) {
    const list = this.regs.filter((r) => r.alive);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        if (a.side === b.side) {
          if (d > a.rad + b.rad) continue;
          if (!obbOverlap(a, b, -3)) continue;
          if (a.state === 'routing' || b.state === 'routing') continue;
        } else {
          if (d > (a.hd + b.hd) * 0.9) continue;
        }
        const push = 22 * dt;
        const ux = dx / d, uy = dy / d;
        const aFix = a.engaged && a.side === b.side, bFix = b.engaged && a.side === b.side;
        if (!aFix) { const nx = a.x - ux * push, ny = a.y - uy * push; if (this.map.passAt(nx, ny, a.u)) { a.x = nx; a.y = ny; } }
        if (!bFix) { const nx = b.x + ux * push, ny = b.y + uy * push; if (this.map.passAt(nx, ny, b.u)) { b.x = nx; b.y = ny; } }
      }
    }
  }

  // ——— الرماية ———
  fireVolley(r, t) {
    const d = r.def;
    r.sinceFire = 0; r.ammo--;
    r.reload = d.reload * (0.9 + R() * 0.2);
    if (r.def.cls === 'mach') { this.fireAtPoint(r, t.x, t.y, t); return; }
    const n = Math.min(10, Math.ceil(r.men / 5));
    let total = r.men * d.missile * 0.085 * (1 + 0.05 * r.exp);
    if (this.traits[r.side] === 'archer') total *= 1.15;
    if (r.morale < 25) total *= 0.7;
    if (this.map.elevAt(r.x, r.y) > this.map.elevAt(t.x, t.y) + 0.15) total *= 1.1;
    const per = total / n;
    const dd = Math.hypot(t.x - r.x, t.y - r.y);
    for (let k = 0; k < n; k++) {
      const s = r.soldiers[Math.floor(R() * r.soldiers.length)] || r;
      const ls = (R() * 2 - 1) * t.hw * 0.85, lf = (R() * 2 - 1) * t.hd * 0.85;
      const tx = t.x + t.fx * lf - t.fy * ls, ty = t.y + t.fy * lf + t.fx * ls;
      this.projectiles.push({ kind: 'arrow', sx: s.x, sy: s.y, tx, ty, t: 0, dur: dd / 290 + R() * 0.15, dmg: per, target: t, src: r, h: dd * 0.12 });
    }
  }

  fireAtPoint(r, x, y, target) {
    r.sinceFire = 0;
    if (r.reload > 0 && !target) return;
    if (!target) { r.ammo--; r.reload = r.def.reload * (0.9 + R() * 0.2); }
    const dd = Math.hypot(x - r.x, y - r.y);
    const spread = 14 + dd * 0.05;
    for (let j = 0; j < r.machines; j++) {
      const tx = x + (R() * 2 - 1) * spread, ty = y + (R() * 2 - 1) * spread;
      this.projectiles.push({ kind: 'stone', sx: r.x, sy: r.y, tx, ty, t: -j * 0.25, dur: 1.2 + dd / 400, dmg: 70, src: r, h: dd * 0.3 });
    }
  }

  arrowCover(t, p) {
    let m = 1;
    const tile = this.map.tileAt(t.x, t.y);
    if (tile === T.FOREST) m *= 0.55;
    if (t.formation === 'loose') m *= 0.6;
    const a = t.def.armor || 0;
    if (a) m *= 1 - a * (relDir(t, p.src) === 'front' ? 1 : 0.5);
    if (t.type === 'sword' && t.formation === 'square') m *= 0.45;
    if (this.onWallLine(t)) m *= 0.4;
    if (t.state === 'routing') m *= 1.3;
    return m;
  }

  updateProjectiles(dt) {
    const keep = [];
    for (const p of this.projectiles) {
      p.t += dt;
      if (p.t < p.dur) { keep.push(p); continue; }
      if (p.kind === 'arrow') {
        const t = p.target;
        if (t.alive && t.containsPoint(p.tx, p.ty, 9)) {
          t.hit(p.dmg * this.arrowCover(t, p), p.src);
          t.morale -= (t.def.armor ? 0.06 : 0.13);
          t.sinceHit = 0;
        }
      } else {
        this.dust(p.tx, p.ty, 12, 'rgba(120,105,85,.7)');
        for (const r of this.regs) {
          if (!r.alive || !r.containsPoint(p.tx, p.ty, 16)) continue;
          r.hit(p.dmg * (r.formation === 'loose' ? 0.5 : 1) * (r.type === 'ram' ? 0.6 : 1), p.src);
          r.morale -= 6;
        }
        if (this.kind === 'siege' && Math.abs(p.ty - WALL_Y - TS / 2) < TS * 1.3) {
          const c = Math.floor(p.tx / TS);
          let gateHit = false;
          for (let x = c - 1; x <= c + 1; x++) {
            if (x < 0 || x >= COLS) continue;
            const i = WALL_ROW * COLS + x;
            let res;
            if (this.map.t[i] === T.GATE) {
              if (gateHit) continue;
              gateHit = true;
              res = this.map.damageGate(x === c ? 26 : 12);
            } else res = this.map.damageTile(i, x === c ? 32 : 14);
            if (res) this.onBreach(res, (x + 0.5) * TS);
          }
        }
      }
    }
    this.projectiles = keep;
  }

  updateRam(dt) {
    if (this.kind !== 'siege' || this.map.gateOpen) return;
    for (const r of this.regs) {
      if (r.type !== 'ram' || !r.active) continue;
      if (Math.hypot(r.x - 30 * TS, r.y - (WALL_Y + TS + 16)) < 26) {
        const res = this.map.damageGate(10 * dt * (r.men / 10));
        if (R() < dt * 1.2) this.dust(30 * TS + (R() - 0.5) * 50, WALL_Y + TS, 5, 'rgba(110,80,50,.7)');
        if (res) this.onBreach('gate', 30 * TS);
      }
    }
  }

  onBreach(kind, x) {
    this.float(x, WALL_Y - 10, kind === 'gate' ? 'تحطمت البوابة!' : 'ثغرة في السور!', '#ffcf6a');
    this.dust(x, WALL_Y + 10, 30, 'rgba(140,130,115,.8)');
    this.events.push({ t: this.time, kind: 'breach' });
    for (const r of this.regs) if (r.side === 1 && r.alive) r.morale -= kind === 'gate' ? 10 : 4;
  }

  updateHidden() {
    for (const r of this.regs) {
      if (!r.alive) continue;
      const inForest = this.map.tileAt(r.x, r.y) === T.FOREST;
      if (!inForest || r.sinceFire < 4 || r.engaged || r.state === 'routing') { r.hidden = false; continue; }
      let seen = false;
      for (const e of this.regs) {
        if (e.side === r.side || !e.active) continue;
        if (Math.hypot(e.x - r.x, e.y - r.y) < 90 + e.rad + r.rad) { seen = true; break; }
      }
      r.hidden = !seen;
    }
  }

  onRegDead(r) {
    if (r.type === 'general') this.generalFell(r);
  }
  onFled(r) {
    if (r.type === 'general') this.generalFell(r);
  }
  generalFell(r) {
    if (this.generalDown[r.side]) return;
    this.generalDown[r.side] = true;
    this.float(r.x, r.y - 30, r.dead ? 'سقط القائد!' : 'فرّ القائد!', '#ff6a5a');
    for (const x of this.regs) if (x.side === r.side && x.active) x.morale -= 22;
    for (const x of this.regs) if (x.side !== r.side && x.active) x.morale = Math.min(x.maxMorale, x.morale + 10);
  }
  onRout(r) {
    if (r.side === this.playerSide) this.float(r.x, r.y - 24, 'فرّوا!', '#ff8a7a');
    else this.float(r.x, r.y - 24, 'العدو يفرّ!', '#bff5a0');
    for (const x of this.regs) {
      if (x.side === r.side && x.active && x !== r && Math.hypot(x.x - r.x, x.y - r.y) < 160) x.morale -= 7;
    }
  }

  armyStrength(side) {
    let s = 0;
    for (const r of this.regs) if (r.side === side && r.alive) s += r.men;
    return s;
  }

  checkEnd(dt) {
    // استنزاف معنويات الجيش بعد الخسائر الكبيرة
    for (let side = 0; side < 2; side++) {
      const st = this.stats[side];
      if (st.lost > st.start * 0.55) for (const r of this.regs) if (r.side === side && r.active) r.morale -= 0.6 * dt * 2;
    }
    const act = [0, 1].map((s) => this.regs.some((r) => r.side === s && r.active && r.type !== 'ram'));
    if (!act[0] && !act[1]) return this.end(1, 'rout');
    if (!act[0]) return this.end(1, 'rout');
    if (!act[1]) return this.end(0, 'rout');
    if (this.kind === 'siege' && this.map.plaza) {
      const p = this.map.plaza;
      const inP = (r) => r.active && r.x > p.x && r.x < p.x + p.w && r.y > p.y && r.y < p.y + p.h;
      const att = this.regs.some((r) => r.side === 0 && inP(r));
      const def = this.regs.some((r) => r.side === 1 && inP(r));
      if (att && !def) {
        this.plazaT += dt;
        if (this.plazaT >= 25) return this.end(0, 'plaza');
      } else this.plazaT = Math.max(0, this.plazaT - dt * 0.5);
    }
    if (this.kind === 'siege' && this.time > 20 && !this.map.gateOpen && !this.map.breaches().length) {
      const means = this.regs.some((r) => r.side === 0 && r.active && (r.type === 'ram' || (r.type === 'catapult' && r.ammo > 0) || r.u.ladders));
      if (!means) return this.end(1, 'nomeans');
    }
    if (this.time >= this.timeLimit) return this.end(1, 'time');
  }

  withdraw() {
    if (this.phase !== 'battle' && this.phase !== 'deploy') return;
    const ps = this.playerSide;
    for (const r of this.regs) if (r.side === ps && r.alive && r.engaged) r.men = Math.round(r.men * 0.65);
    this.end(1 - ps, 'withdraw');
  }

  end(winner, reason) {
    if (this.phase === 'over') return;
    this.phase = 'over';
    const sides = [0, 1].map((side) => {
      const regs = this.regs.filter((r) => r.side === side);
      return {
        regs: regs.map((r) => ({ ref: r.ref, type: r.type, men: r.dead ? 0 : Math.max(0, r.men), startMen: r.startMen, kills: r.kills, fled: r.fled || r.state === 'routing' })),
        start: this.stats[side].start,
        lost: this.stats[side].lost,
        remaining: regs.reduce((s, r) => s + (r.dead ? 0 : r.men), 0),
        generalDied: regs.some((r) => r.type === 'general' && r.dead),
      };
    });
    this.result = { winner, reason, sides, time: this.time };
    if (this.onEnd) this.onEnd(this.result);
  }

  // ——— المؤثرات ———
  float(x, y, text, color) { this.floaters.push({ x, y, text, color, t: 0 }); }
  dust(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, s = 8 + R() * 30;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + R() * 0.8, t: 0, color, size: 2 + R() * 4 });
    }
  }
  spark(x, y) {
    this.particles.push({ x: x + (R() - 0.5) * 16, y: y + (R() - 0.5) * 10, vx: (R() - 0.5) * 20, vy: -10 - R() * 10, life: 0.35, t: 0, color: 'rgba(255,240,200,.9)', size: 1.2 });
  }
  updateFx(dt) {
    if (dt <= 0) return;
    this.particles = this.particles.filter((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; return p.t < p.life; });
    this.floaters = this.floaters.filter((f) => { f.t += dt; f.y -= 12 * dt; return f.t < 2.2; });
  }

  // ——— الرسم ———
  render(ctx, cam, ui) {
    const d = App.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b1510';
    ctx.fillRect(0, 0, App.canvas.width, App.canvas.height);
    cam.apply(ctx);
    if (this.map.dirty) this.map.render();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.map.canvas, 0, 0, BW, BH);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, BW, BH);
    const ps = this.playerSide;

    if (this.phase === 'deploy' && ps >= 0) {
      const z = this.zone(ps);
      ctx.fillStyle = 'rgba(255,225,140,.10)';
      ctx.fillRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
      ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,225,140,.7)'; ctx.lineWidth = 1.5 / cam.z * 1.5;
      ctx.strokeRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0); ctx.setLineDash([]);
    }
    if (this.kind === 'siege' && this.map.plaza) {
      const p = this.map.plaza;
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(230,190,90,.8)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x, p.y, p.w, p.h); ctx.setLineDash([]);
      if (this.plazaT > 0) {
        ctx.fillStyle = 'rgba(200,60,40,.25)';
        ctx.fillRect(p.x, p.y, p.w * Math.min(1, this.plazaT / 25), p.h);
      }
    }

    // خطوط الأوامر للمختارين
    if (ui) {
      ctx.lineWidth = 1.2;
      for (const r of this.regs) {
        if (!r.selected || !r.alive) continue;
        const o = r.order;
        if (o && o.type === 'move') {
          ctx.strokeStyle = 'rgba(255,235,160,.65)'; ctx.setLineDash([5, 4]);
          ctx.beginPath(); ctx.moveTo(r.x, r.y);
          for (const p of r.path) ctx.lineTo(p.x, p.y);
          ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(255,235,160,.8)'; ctx.beginPath(); ctx.arc(o.x, o.y, 3, 0, TAU); ctx.fill();
        } else if (o && o.type === 'attack' && o.target.alive) {
          ctx.strokeStyle = 'rgba(255,110,90,.7)'; ctx.setLineDash([5, 4]);
          ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(o.target.x, o.target.y); ctx.stroke(); ctx.setLineDash([]);
          this.outline(ctx, o.target, 'rgba(255,90,70,.9)', 4);
        }
      }
    }

    for (const r of this.regs) {
      if (!r.alive) continue;
      if (ps >= 0 && r.side !== ps && !r.visibleTo(ps)) continue;
      this.drawReg(ctx, r);
    }

    // المقذوفات
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(40,30,20,.85)';
    ctx.beginPath();
    for (const p of this.projectiles) {
      if (p.kind !== 'arrow' || p.t < 0) continue;
      const k = p.t / p.dur;
      const x = lerp(p.sx, p.tx, k), y = lerp(p.sy, p.ty, k) - Math.sin(k * Math.PI) * p.h;
      const k2 = Math.max(0, k - 0.05);
      const x2 = lerp(p.sx, p.tx, k2), y2 = lerp(p.sy, p.ty, k2) - Math.sin(k2 * Math.PI) * p.h;
      ctx.moveTo(x2, y2); ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (const p of this.projectiles) {
      if (p.kind !== 'stone' || p.t < 0) continue;
      const k = p.t / p.dur;
      const x = lerp(p.sx, p.tx, k), y = lerp(p.sy, p.ty, k);
      const hh = Math.sin(k * Math.PI) * p.h;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5b5550'; ctx.beginPath(); ctx.arc(x, y - hh, 3.5 + hh * 0.02, 0, TAU); ctx.fill();
    }
    for (const p of this.particles) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (ui && ui.dragArrow) {
      const a = ui.dragArrow;
      ctx.strokeStyle = '#ffe38a'; ctx.lineWidth = 2.5 / cam.z * 1.5;
      ctx.beginPath(); ctx.moveTo(a.x0, a.y0); ctx.lineTo(a.x1, a.y1); ctx.stroke();
      const ang = Math.atan2(a.y1 - a.y0, a.x1 - a.x0);
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(a.x1 - Math.cos(ang - 0.5) * 12, a.y1 - Math.sin(ang - 0.5) * 12);
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(a.x1 - Math.cos(ang + 0.5) * 12, a.y1 - Math.sin(ang + 0.5) * 12);
      ctx.stroke();
    }

    // الرايات بمقاس الشاشة
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const r of this.regs) {
      if (!r.alive) continue;
      if (ps >= 0 && r.side !== ps && !r.visibleTo(ps)) continue;
      this.drawBanner(ctx, cam, r);
    }
    ctx.font = '600 13px "Noto Naskh Arabic", Tahoma, sans-serif';
    for (const f of this.floaters) {
      const s = cam.toScreen(f.x, f.y);
      ctx.globalAlpha = Math.min(1, 2.2 - f.t);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,14,8,.85)';
      ctx.strokeText(f.text, s.x, s.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
  }

  outline(ctx, r, color, pad) {
    ctx.save();
    ctx.translate(r.x, r.y); ctx.rotate(r.facing);
    ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    ctx.strokeRect(-r.hd - pad, -r.hw - pad, (r.hd + pad) * 2, (r.hw + pad) * 2);
    ctx.restore();
  }

  drawReg(ctx, r) {
    const col = this.color(r.side);
    const fx = r.fx, fy = r.fy, rx = -fy, ry = fx;
    const S = r.soldiers;
    const own = r.side === this.playerSide;
    if (r.hidden && own) ctx.globalAlpha = 0.55;
    if (r.selected) this.outline(ctx, r, '#ffe38a', 4);
    const routing = r.state === 'routing';
    const dark = 'rgba(25,18,12,.9)';
    if (r.def.cls === 'mach') {
      for (let j = 0; j < r.machines; j++) {
        const ms = r.machineSlots[j];
        const mx = r.x + fx * ms.f + rx * ms.s, my = r.y + fy * ms.f + ry * ms.s;
        ctx.save(); ctx.translate(mx, my); ctx.rotate(r.facing);
        if (r.type === 'ram') {
          ctx.fillStyle = '#5a3b22'; ctx.fillRect(-16, -6, 32, 12);
          ctx.fillStyle = '#7b5a36'; ctx.fillRect(-14, -8, 26, 16);
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(12, -2.5, 8, 5);
        } else {
          ctx.fillStyle = '#6d4c2d'; ctx.fillRect(-8, -7, 16, 14);
          ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(10, 0); ctx.stroke();
          ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(-7, 0, 2.5, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
    }
    if (r.def.cls === 'cav') {
      ctx.strokeStyle = r.type === 'general' ? '#3d2a1a' : '#5b3d24'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const s of S) {
        const hx = routing ? Math.cos(Math.atan2(s.jy, s.jx)) : fx, hy = routing ? Math.sin(Math.atan2(s.jy, s.jx)) : fy;
        ctx.moveTo(s.x - hx * 3.4, s.y - hy * 3.4); ctx.lineTo(s.x + hx * 3.4, s.y + hy * 3.4);
      }
      ctx.stroke(); ctx.lineCap = 'butt';
    }
    // الأجساد
    ctx.fillStyle = col;
    ctx.beginPath();
    const br = r.def.cls === 'cav' ? 1.8 : 2;
    for (const s of S) { ctx.moveTo(s.x + br, s.y); ctx.arc(s.x, s.y, br, 0, TAU); }
    ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 0.45; ctx.stroke();
    // الأسلحة
    if (!routing) {
      ctx.strokeStyle = r.type === 'general' ? '#e6c35c' : '#2a2016'; ctx.lineWidth = 0.7;
      ctx.beginPath();
      if (r.type === 'spear' || r.type === 'militia' || r.type === 'cavalry' || r.type === 'general') {
        const L = r.type === 'spear' ? 7 : r.type === 'militia' ? 5 : 8;
        for (const s of S) { ctx.moveTo(s.x - fx * 1.5 + rx * 1.2, s.y - fy * 1.5 + ry * 1.2); ctx.lineTo(s.x + fx * L + rx * 1.2, s.y + fy * L + ry * 1.2); }
      } else if (r.type === 'sword') {
        for (const s of S) { ctx.moveTo(s.x + rx * 1.8, s.y + ry * 1.8); ctx.lineTo(s.x + fx * 3.5 + rx * 1.8, s.y + fy * 3.5 + ry * 1.8); }
      } else if (r.type === 'archer' || r.type === 'horsearcher') {
        for (const s of S) {
          ctx.moveTo(s.x + fx * 2.2 - rx * 2.2, s.y + fy * 2.2 - ry * 2.2);
          ctx.quadraticCurveTo(s.x + fx * 4, s.y + fy * 4, s.x + fx * 2.2 + rx * 2.2, s.y + fy * 2.2 + ry * 2.2);
        }
      }
      ctx.stroke();
      if (r.type === 'sword') {
        ctx.fillStyle = '#8a6a3a';
        ctx.beginPath();
        for (const s of S) { const sx = s.x + fx * 2 - rx * 0.6, sy = s.y + fy * 2 - ry * 0.6; ctx.moveTo(sx + 1.4, sy); ctx.arc(sx, sy, 1.4, 0, TAU); }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawBanner(ctx, cam, r) {
    const s = cam.toScreen(r.x, r.y);
    const ext = Math.abs(r.fy) * r.hd + Math.abs(r.fx) * r.hw;
    const y = s.y - Math.max(8, ext * cam.z) - 16;
    const x = s.x;
    if (x < -40 || x > App.W + 40 || y < -40 || y > App.H + 40) return;
    const own = r.side === this.playerSide;
    const routing = r.state === 'routing';
    ctx.globalAlpha = r.hidden ? 0.6 : 1;
    const w = 30, hh = 19;
    ctx.fillStyle = routing ? 'rgba(240,235,225,.9)' : 'rgba(22,17,12,.82)';
    ctx.strokeStyle = r.selected ? '#ffe38a' : this.color(r.side);
    ctx.lineWidth = r.selected ? 2.2 : 1.6;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x - w / 2, y - hh / 2, w, hh, 4) : ctx.rect(x - w / 2, y - hh / 2, w, hh);
    ctx.fill(); ctx.stroke();
    ctx.font = '12px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(routing ? '🏳️' : r.def.icon, x, y + 1);
    // أشرطة العدد والمعنويات
    const bw = 30, by = y + hh / 2 + 2;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - bw / 2, by, bw, 6);
    ctx.fillStyle = own ? '#e9dcb4' : '#e0b6a8';
    ctx.fillRect(x - bw / 2, by, bw * clamp(r.men / r.maxMen, 0, 1), 2.5);
    const m = clamp(r.morale / 100, 0, 1);
    ctx.fillStyle = m > 0.5 ? '#7fc26b' : m > 0.25 ? '#e3b64a' : '#e0553f';
    ctx.fillRect(x - bw / 2, by + 3.5, bw * m, 2.5);
    if (r.hidden && own) {
      ctx.font = '10px sans-serif'; ctx.fillText('🌿', x + 18, y - 6);
    }
    if (r.ranged && r.ammo <= 0 && own) {
      ctx.font = '9px sans-serif'; ctx.fillText('∅', x - 18, y - 6);
    }
    ctx.globalAlpha = 1;
  }
}
