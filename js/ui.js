'use strict';
// إطار الواجهة: النوافذ الحوارية، النوافذ الجانبية القابلة للتصغير إلى الشريط السفلي، التلميحات، التنبيهات

// زر بأيقونة ونص
function ib(name, label, attrs = {}) {
  return h('button', attrs, icon(name), label != null && label !== '' ? h('span', null, label) : null);
}
// قيمة بأيقونة
function iv(name, value, cls) { return h('span', { class: 'iv' + (cls ? ' ' + cls : '') }, icon(name), h('bdi', null, value)); }

const UI = {
  modal({ title, icon: ic, body, buttons = [], cls = '', dismissable = false, onClose }) {
    const layer = h('div', { class: 'modal-layer' });
    let closed = false;
    const close = () => { if (closed) return; closed = true; layer.remove(); if (onClose) onClose(); };
    const box = h('div', { class: 'modal ' + cls },
      title ? h('h2', null, ic ? icon(ic) : null, h('span', null, title)) : null,
      h('div', { class: 'modal-body' }, body),
      buttons.filter(Boolean).length ? h('div', { class: 'modal-btns' }, buttons.filter(Boolean).map((b) => h('button', {
        class: 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '') + (b.ghost ? ' ghost' : ''),
        disabled: b.disabled, title: b.title || null,
        onclick: () => { if (b.keep) { if (b.onClick) b.onClick(close); return; } close(); if (b.onClick) b.onClick(); },
      }, b.icon ? icon(b.icon) : null, h('span', null, b.label), b.sub ? h('small', null, b.sub) : null))) : null,
    );
    layer.appendChild(box);
    if (dismissable) layer.addEventListener('click', (e) => { if (e.target === layer) close(); });
    document.body.appendChild(layer);
    return close;
  },
  ask(opts) {
    return new Promise((res) => {
      UI.modal({ ...opts, buttons: opts.buttons.map((b) => b && ({ ...b, onClick: () => res(b.value) })) });
    });
  },
  toast(msg, ms = 2600) {
    let t = document.getElementById('toast');
    if (!t) { t = h('div', { id: 'toast', class: 'toast' }); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(this.tt);
    this.tt = setTimeout(() => { t.hidden = true; }, ms);
  },
  anyModal() { return !!document.querySelector('.modal-layer'); },
};

// --------------- النوافذ الجانبية والشريط السفلي ---------------
// كل نافذة: { key, icon, color, title(), sub(), status(), alert(), render(body), valid(), onClose(), onMin() }
// المفتوحة واحدة فقط. المصغّرة تبقى بطاقة في الشريط حتى تُغلق صراحة.
const Sheets = {
  wins: [], host: null, dockEl: null, root: null,

  attach(root, keep) {
    this.root = root;
    if (!keep) this.wins = [];
    this.host = h('div', { class: 'sheet', hidden: true });
    this.dockEl = h('div', { class: 'dock' });
    root.append(this.host, this.dockEl);
  },
  get(key) { return this.wins.find((w) => w.key === key) || null; },
  current() { return this.wins.find((w) => w.state === 'open') || null; },
  isOpen(key) { const w = this.current(); return !!(w && w.key === key); },

  open(spec) {
    let w = this.get(spec.key);
    const cur = this.current();
    if (cur && cur !== w) {
      if (cur.pinned) cur.state = 'min';
      else this.remove(cur, true);
    }
    if (!w) { w = { key: spec.key, spec, state: 'open', pinned: false, scroll: 0 }; this.wins.push(w); }
    else { w.spec = spec; w.state = 'open'; }
    this.render(true);
    return w;
  },
  minimize(key) {
    const w = key ? this.get(key) : this.current();
    if (!w) return;
    w.state = 'min'; w.pinned = true;
    if (w.spec.onMin) w.spec.onMin();
    this.render();
  },
  restore(key) {
    const w = this.get(key);
    if (!w) return;
    const cur = this.current();
    if (cur && cur !== w) { if (cur.pinned) cur.state = 'min'; else this.remove(cur, true); }
    w.state = 'open'; w.auto = false;
    if (w.spec.onRestore) w.spec.onRestore();
    this.render(true);
  },
  close(key) {
    const w = key ? this.get(key) : this.current();
    if (w) this.remove(w);
    this.render();
  },
  remove(w, silent) {
    const i = this.wins.indexOf(w);
    if (i >= 0) this.wins.splice(i, 1);
    if (w.spec.onClose && !w.closing) { w.closing = true; w.spec.onClose(silent); }
    if (!silent) this.render();
  },
  // لمسة على الخريطة الفارغة: المصغّرة سابقاً تعود للشريط، والعادية تُغلق
  dismissCurrent() {
    const w = this.current();
    if (!w) return false;
    if (w.pinned) this.minimize(w.key); else this.close(w.key);
    return true;
  },
  closeAll() { for (const w of [...this.wins]) this.remove(w, true); this.render(); },

  refresh() {
    for (const w of [...this.wins]) if (w.spec.valid && !w.spec.valid()) this.remove(w, true);
    this.render();
  },

  render(fresh) {
    if (!this.host) return;
    const w = this.current();
    this.root.classList.toggle('has-sheet', !!w);
    if (!w) { this.host.hidden = true; this.host.innerHTML = ''; }
    else {
      const oldBody = this.host.querySelector('.sheet-body');
      if (oldBody && !fresh && this.host.dataset.key === w.key) w.scroll = oldBody.scrollTop;
      else if (fresh) w.scroll = this.host.dataset.key === w.key && oldBody ? oldBody.scrollTop : 0;
      const s = w.spec;
      this.host.innerHTML = '';
      this.host.dataset.key = w.key;
      this.host.hidden = false;
      const body = h('div', { class: 'sheet-body' });
      this.host.append(
        h('div', { class: 'sheet-head' },
          h('span', { class: 'sh-ic', style: { color: s.color || 'var(--bronze-hi)' } }, icon(s.icon || 'info')),
          h('div', { class: 'sh-t' }, h('h3', null, s.title()), s.sub ? h('div', { class: 'sub' }, s.sub()) : null),
          h('div', { class: 'head-btns' },
            ib('minimize', null, { class: 'icon-btn sm', title: 'تصغير إلى الشريط', onclick: () => this.minimize(w.key) }),
            ib('close', null, { class: 'icon-btn sm', title: 'إغلاق', onclick: () => this.close(w.key) }),
          ),
        ),
        body,
      );
      try { s.render(body); } catch (e) { console.error(e); body.appendChild(h('p', { class: 'warn' }, 'تعذّر عرض النافذة.')); }
      body.scrollTop = w.scroll || 0;
    }
    this.renderDock();
  },

  renderDock() {
    const d = this.dockEl;
    d.innerHTML = '';
    const mins = this.wins.filter((w) => w.state === 'min');
    d.hidden = !mins.length;
    for (const w of mins) {
      const s = w.spec;
      const alert = s.alert ? s.alert() : false;
      d.appendChild(h('div', { class: 'dock-card' + (alert ? ' alert ' + (alert === true ? 'imp' : alert) : '') + (s.active && s.active() ? ' active' : '') },
        h('button', { class: 'dc-main', onclick: () => this.restore(w.key), title: 'استعادة' },
          h('span', { class: 'dc-ic', style: { color: s.color || 'var(--bronze-hi)' } }, icon(s.icon || 'info')),
          h('span', { class: 'dc-t' }, h('b', null, s.short ? s.short() : s.title()), s.status ? h('small', null, s.status()) : null),
          alert ? h('i', { class: 'dc-dot' }) : null,
        ),
        h('button', { class: 'dc-x', title: 'إغلاق', onclick: (e) => { e.stopPropagation(); this.close(w.key); } }, icon('close')),
      ));
    }
  },
};

// --------------- التلميحات السياقية ---------------
const Help = {
  el: null,
  show(anchor, key, extra = {}) {
    const H = HELP[key];
    if (!H && !extra.title) return;
    this.hide();
    const el = h('div', { class: 'pop' },
      h('div', { class: 'pop-h' }, H && H.icon ? icon(H.icon) : null, h('b', null, extra.title || H.t), extra.value != null ? h('bdi', { class: 'pop-v' }, extra.value) : null),
      H && H.what ? h('p', null, H.what) : null,
      extra.lines && extra.lines.length ? h('div', { class: 'pop-lines' }, extra.lines.map(([k, v, c]) => h('div', { class: 'pl' + (c ? ' ' + c : '') }, h('span', null, k), h('bdi', null, v)))) : null,
      H && H.up ? h('p', { class: 'up' }, icon('arrowUp'), H.up) : null,
      H && H.down ? h('p', { class: 'down' }, icon('arrowDown'), H.down) : null,
      H && H.eff ? h('p', { class: 'eff' }, H.eff) : null,
      extra.note ? h('p', { class: 'eff' }, extra.note) : null,
    );
    document.body.appendChild(el);
    this.el = el;
    const r = anchor.getBoundingClientRect();
    const W = window.innerWidth, Hh = window.innerHeight;
    const pw = el.offsetWidth, ph = el.offsetHeight;
    let x = r.left + r.width / 2 - pw / 2;
    x = clamp(x, 8, W - pw - 8);
    let y = r.bottom + 6;
    if (y + ph > Hh - 8) y = Math.max(8, r.top - ph - 6);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    setTimeout(() => {
      this.off = (e) => { if (!el.contains(e.target)) this.hide(); };
      document.addEventListener('pointerdown', this.off, true);
    }, 0);
  },
  hide() {
    if (this.el) { this.el.remove(); this.el = null; }
    if (this.off) { document.removeEventListener('pointerdown', this.off, true); this.off = null; }
  },
};
// إحصائية قابلة للنقر: أيقونة + قيمة، تفتح شرحاً مختصراً مع تفصيل الحالة الآن
function hstat(key, value, o = {}) {
  const H = HELP[key] || {};
  return h('button', {
    class: 'hstat' + (o.cls ? ' ' + o.cls : ''), title: H.t || '',
    onclick: (e) => { e.stopPropagation(); Help.show(e.currentTarget, key, { value: o.full != null ? o.full : value, lines: o.lines ? o.lines() : null, note: o.note ? o.note() : null, title: o.title }); },
  }, icon(o.icon || H.icon || 'info'), o.label ? h('span', { class: 'hk' }, o.label) : null, h('bdi', { class: 'hv' }, value), o.meter != null ? meter(o.meter) : null);
}
function meter(v, max = 100, color) {
  const pct = clamp(v / max, 0, 1) * 100;
  const c = color || (pct > 55 ? '#8fc46e' : pct > 30 ? '#e3b64a' : '#e0553f');
  return h('span', { class: 'meter' }, h('i', { style: { width: pct + '%', background: c } }));
}

// --------------- التنبيهات العسكرية ---------------
const ALERT_LV = { crit: { name: 'حرج', icon: 'warning', rank: 3 }, imp: { name: 'مهم', icon: 'bell', rank: 2 }, info: { name: 'معلومة', icon: 'info', rank: 1 } };
const AlertsUI = {
  el: null, scene: null, open: false,
  attach(root, scene) { this.el = h('div', { class: 'alerts' }); this.scene = scene; this.open = false; root.appendChild(this.el); },
  render() {
    if (!this.el || !Game.S) return;
    const list = Game.activeAlerts();
    this.el.innerHTML = '';
    if (!list.length) return;
    const show = this.open ? list : list.slice(0, 3);
    // إغلاق الأخبار دفعة واحدة: لا ينفّذ قراراً ولا يقبل عرضاً، والقرارات ذات المهلة تبقى
    const closable = list.filter((a) => !Game.alertKeeps(a));
    if (closable.length >= 2) this.el.appendChild(h('button', { class: 'alert more closeall', onclick: () => { for (const a of closable) Game.dismissAlert(a.id); this.open = false; this.render(); if (this.scene) this.scene.refresh(); } }, icon('close'), `أغلق ${closable.length} أخبار`, h('small', null, ' (تبقى في السجل)')));
    for (const a of show) {
      this.el.appendChild(h('div', { class: 'alert ' + a.level + (a.seen ? ' seen' : '') },
        h('button', { class: 'al-main', onclick: () => { a.seen = true; this.scene.focusAlert(a); this.render(); } },
          icon(a.icon || ALERT_LV[a.level].icon), h('span', null, a.text)),
        h('button', { class: 'al-x', title: 'إخفاء', onclick: () => { Game.dismissAlert(a.id); this.render(); } }, icon('close')),
      ));
    }
    if (list.length > 3) this.el.appendChild(h('button', { class: 'alert more', onclick: () => { this.open = !this.open; this.render(); } }, this.open ? 'أقل' : `+${list.length - 3} تنبيهات`));
  },
};
