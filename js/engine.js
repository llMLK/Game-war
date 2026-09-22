'use strict';
// المحرك: حلقة الرسم، الكاميرا، اللمس والتكبير

class Camera {
  constructor(ww, wh) {
    this.ww = ww; this.wh = wh;
    this.x = ww / 2; this.y = wh / 2; this.z = 1;
    this.minZ = 0.3; this.maxZ = 3;
    // هوامش الواجهة (بكسل شاشة) حتى لا يختفي العالم خلف الأشرطة
    this.padTop = 0; this.padBottom = 0;
  }
  fit(extra = 1) {
    const W = App.W, H = App.H - this.padTop - this.padBottom;
    const z = Math.min(W / this.ww, H / this.wh) * extra;
    this.z = z;
    this.minZ = Math.min(z, Math.min(W / this.ww, H / this.wh)) * 0.9;
    this.maxZ = Math.max(2.5, z * 5);
    this.x = this.ww / 2;
    this.y = this.wh / 2 - (this.padTop - this.padBottom) / 2 / z;
  }
  toWorld(sx, sy) {
    return { x: (sx - App.W / 2) / this.z + this.x, y: (sy - App.H / 2) / this.z + this.y };
  }
  toScreen(wx, wy) {
    return { x: (wx - this.x) * this.z + App.W / 2, y: (wy - this.y) * this.z + App.H / 2 };
  }
  apply(ctx) {
    const d = App.dpr, z = this.z;
    ctx.setTransform(d * z, 0, 0, d * z, d * (App.W / 2 - this.x * z), d * (App.H / 2 - this.y * z));
  }
  clamp() {
    const halfW = App.W / 2 / this.z, halfH = App.H / 2 / this.z;
    const mx = Math.max(0, halfW - this.ww / 2) + 60 / this.z;
    const my = Math.max(0, halfH - this.wh / 2) + 80 / this.z;
    this.x = clamp(this.x, halfW - mx, this.ww - halfW + mx);
    this.y = clamp(this.y, halfH - my - this.padTop / this.z, this.wh - halfH + my + this.padBottom / this.z);
  }
  zoomAt(sx, sy, f) {
    const a = this.toWorld(sx, sy);
    this.z = clamp(this.z * f, this.minZ, this.maxZ);
    const b = this.toWorld(sx, sy);
    this.x += a.x - b.x; this.y += a.y - b.y;
    this.clamp();
  }
  pan(dx, dy) {
    this.x -= dx / this.z; this.y -= dy / this.z;
    this.clamp();
  }
}

const App = {
  canvas: null, ctx: null, dpr: 1, W: 0, H: 0,
  scene: null, last: 0, ui: null,
  pointers: new Map(),
  gesture: null,

  init() {
    this.canvas = document.getElementById('view');
    this.ctx = this.canvas.getContext('2d');
    this.ui = document.getElementById('ui');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    this.bindInput();
    requestAnimationFrame((t) => this.frame(t));
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    if (this.scene && this.scene.onResize) this.scene.onResize();
  },

  setScene(s) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.scene = s;
    if (s && s.enter) s.enter();
  },

  frame(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0);
    this.last = t;
    const s = this.scene;
    if (s) {
      try {
        if (s.update) s.update(dt);
        if (s.render) s.render(this.ctx);
      } catch (e) {
        console.error(e);
      }
    } else {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.fillStyle = '#17120d';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    requestAnimationFrame((tt) => this.frame(tt));
  },

  bindInput() {
    const c = this.canvas;
    const P = this.pointers;
    const pos = (e) => ({ x: e.clientX, y: e.clientY });

    c.addEventListener('pointerdown', (e) => {
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* مؤشر اصطناعي */ }
      P.set(e.pointerId, pos(e));
      const s = this.scene;
      if (P.size === 1) {
        const p = pos(e);
        this.gesture = { mode: 'tap', sx: p.x, sy: p.y, t: performance.now(), moved: false };
        clearTimeout(this.lpTimer);
        this.lpTimer = setTimeout(() => {
          const g = this.gesture;
          if (g && g.mode === 'tap' && !g.moved && s && s.onLongPress && s.cam) {
            if (s.onLongPress(s.cam.toWorld(g.sx, g.sy))) {
              g.mode = 'custom';
              if (navigator.vibrate) { try { navigator.vibrate(15); } catch (err) { /* */ } }
            }
          }
        }, 380);
      } else if (P.size === 2) {
        clearTimeout(this.lpTimer);
        if (this.gesture && this.gesture.mode === 'custom' && s && s.onDragCancel) s.onDragCancel();
        const [a, b] = [...P.values()];
        this.gesture = { mode: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      }
    });

    c.addEventListener('pointermove', (e) => {
      if (!P.has(e.pointerId)) return;
      const prev = P.get(e.pointerId);
      const p = pos(e);
      P.set(e.pointerId, p);
      const g = this.gesture, s = this.scene;
      if (!g || !s || !s.cam) return;
      if (g.mode === 'pinch' && P.size >= 2) {
        const [a, b] = [...P.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (g.d > 10) s.cam.zoomAt(mx, my, d / g.d);
        s.cam.pan(mx - g.mx, my - g.my);
        g.d = d; g.mx = mx; g.my = my;
      } else if (g.mode === 'custom') {
        if (s.onDrag) s.onDrag(s.cam.toWorld(p.x, p.y));
      } else if (g.mode === 'tap' || g.mode === 'pan') {
        if (g.mode === 'tap' && Math.hypot(p.x - g.sx, p.y - g.sy) > 9) {
          g.mode = 'pan'; g.moved = true;
          clearTimeout(this.lpTimer);
        }
        if (g.mode === 'pan') s.cam.pan(p.x - prev.x, p.y - prev.y);
      }
    });

    const end = (e) => {
      if (!P.has(e.pointerId)) return;
      const p = pos(e);
      P.delete(e.pointerId);
      clearTimeout(this.lpTimer);
      const g = this.gesture, s = this.scene;
      if (!g || !s) { this.gesture = null; return; }
      if (g.mode === 'tap' && P.size === 0 && e.type === 'pointerup') {
        if (s.onTap && s.cam) s.onTap(s.cam.toWorld(p.x, p.y), p);
      } else if (g.mode === 'custom') {
        if (e.type === 'pointerup' && s.onDragEnd && s.cam) s.onDragEnd(s.cam.toWorld(p.x, p.y));
        else if (s.onDragCancel) s.onDragCancel();
      }
      if (P.size === 0) this.gesture = null;
      else if (g.mode === 'pinch') {
        const [a] = [...P.values()];
        this.gesture = { mode: 'pan', sx: a.x, sy: a.y, moved: true };
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const s = this.scene;
      if (s && s.cam) s.cam.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });

    c.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  },
};
