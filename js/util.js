'use strict';
// أدوات عامة مشتركة بين كل أجزاء اللعبة

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// مولد أرقام عشوائية قابل للتكرار (xorshift32)
function rng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const R = Math.random;
const rand = (a, b) => a + R() * (b - a);
const pick = (arr, r = R) => arr[Math.floor(r() * arr.length)];
const chance = (p) => R() < p;

function weightedPick(weights, r = R) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let x = r() * total;
  for (const k in weights) {
    x -= weights[k];
    if (x <= 0) return k;
  }
  return Object.keys(weights)[0];
}

// إنشاء عناصر الواجهة
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

const fmt = (n) => String(Math.round(n));
const signed = (n) => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n));

function shuffle(arr, r = R) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* تجاهل */ } },
};
