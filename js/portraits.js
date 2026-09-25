'use strict';
// صور القادة: رسم متجه يُولَّد من الاسم والثقافة والعمر والندوب، ثابت لكل قائد.
// ليس صورة تاريخية: رسم توضيحي يميّز القادة بطابع عصرهم.

const PORTRAIT_SKIN = {
  arab: ['#c89a6e', '#b98459', '#d4a77c', '#a8744c'], rum: ['#e0b894', '#d5a883', '#c99a74'], steppe: ['#d9b08a', '#c89c74', '#e3bd97'],
  caucasus: ['#dcb18c', '#cf9f79', '#e2bb95'], han: ['#e6c49a', '#dbb68a', '#efcfa6'],
};
const PORTRAIT_CLOTH = {
  arab: ['#e8e2d2', '#2f4f3f', '#6b2a24', '#394a6a'], rum: ['#5b2b6e', '#7a1f2b', '#1f3f6e', '#6b5a1e'], steppe: ['#6a4a2a', '#2f5f5a', '#7a3a24', '#4a4a3a'],
  caucasus: ['#5a3a2a', '#2f4a5a', '#6a2a2a'], han: ['#3f6e4a', '#3a4f7a', '#7a2a24', '#5a4a2a'],
};
const PORTRAIT_HAIR = ['#1e1611', '#2b1d14', '#3a2616', '#4a3420', '#15110d'];

const Portrait = {
  cache: {},
  svg(g, size = 96) {
    const pr = Game.prestigeOf ? Game.prestigeOf(g) : { cls: 'p0' };
    const age = Game.cmdAge ? Game.cmdAge(g) : null;
    const key = [g.name, g.culture, size, pr.cls, (g.scars || []).length, age != null ? Math.floor(age / 10) : 'x', Game.isRuler && Game.isRuler(g) ? 'r' : ''].join('|');
    if (this.cache[key]) return this.cache[key];
    const r = rng(hashStr(g.name + ':face'));
    const cul = g.culture || 'arab';
    const skin = pick(PORTRAIT_SKIN[cul] || PORTRAIT_SKIN.arab, r);
    const cloth = pick(PORTRAIT_CLOTH[cul] || PORTRAIT_CLOTH.arab, r);
    const old = age != null ? age >= 52 : r() < 0.25;
    const hair = old ? (r() < 0.5 ? '#9a948a' : '#c9c3b8') : pick(PORTRAIT_HAIR, r);
    const ruler = Game.isRuler && Game.isRuler(g);
    const officer = Game.isOfficer && Game.isOfficer(g);
    const fierce = ['brave', 'cavalier'].includes(g.trait) || g.flaw === 'reckless' || g.flaw === 'harsh';
    const faceW = 15 + r() * 3, faceH = 19 + r() * 3;
    const ring = { p0: '#6b5a3e', p1: '#8a6a3a', p2: '#a9a9b0', p3: '#d4a847', p4: '#f0cf6a' }[pr.cls] || '#6b5a3e';
    const bg = { arab: '#3a2f22', rum: '#2e2238', steppe: '#2a2f26', caucasus: '#2e2a26', han: '#23302a' }[cul] || '#2e2a26';
    const parts = [];
    // الخلفية والإطار
    parts.push(`<circle cx="50" cy="50" r="48" fill="${bg}"/>`);
    parts.push(`<circle cx="50" cy="50" r="46" fill="none" stroke="${ring}" stroke-width="${pr.cls === 'p4' ? 3.5 : 2.5}"/>`);
    if (pr.cls === 'p4') parts.push(`<circle cx="50" cy="50" r="42" fill="none" stroke="${ring}" stroke-width="0.8" stroke-dasharray="2 3" opacity=".8"/>`);
    // الكتفان: درع أو ثوب
    const armor = !officer && (cul === 'rum' || cul === 'han' || r() < 0.4);
    parts.push(`<path d="M14 98 Q18 72 38 66 L62 66 Q82 72 86 98 Z" fill="${cloth}"/>`);
    if (armor) parts.push(`<path d="M22 96 Q26 76 40 70 L60 70 Q74 76 78 96" fill="none" stroke="#c8b27a" stroke-width="1.4" opacity=".7"/><path d="M34 78 L66 78 M32 86 L68 86" stroke="#c8b27a" stroke-width="1" opacity=".5"/>`);
    else parts.push(`<path d="M40 66 L50 82 L60 66" fill="none" stroke="#00000055" stroke-width="1.5"/>`);
    // الرقبة والوجه
    parts.push(`<rect x="44" y="56" width="12" height="12" rx="4" fill="${skin}"/>`);
    parts.push(`<ellipse cx="50" cy="44" rx="${faceW}" ry="${faceH}" fill="${skin}"/>`);
    parts.push(`<ellipse cx="${50 - faceW + 1}" cy="45" rx="2.5" ry="4" fill="${skin}"/><ellipse cx="${50 + faceW - 1}" cy="45" rx="2.5" ry="4" fill="${skin}"/>`);
    // العينان والحاجبان
    const ey = 42 + r() * 2;
    parts.push(`<ellipse cx="44" cy="${ey}" rx="2.1" ry="1.3" fill="#1b140f"/><ellipse cx="56" cy="${ey}" rx="2.1" ry="1.3" fill="#1b140f"/>`);
    const bt = fierce ? 2.2 : 0.4;
    parts.push(`<path d="M40 ${ey - 3.5 + bt * 0.3} L47 ${ey - 3.5 - bt * 0.5}" stroke="${hair}" stroke-width="1.6" stroke-linecap="round"/><path d="M53 ${ey - 3.5 - bt * 0.5} L60 ${ey - 3.5 + bt * 0.3}" stroke="${hair}" stroke-width="1.6" stroke-linecap="round"/>`);
    parts.push(`<path d="M50 ${ey + 1} L48.5 ${ey + 7} L51 ${ey + 7.5}" fill="none" stroke="#00000044" stroke-width="1"/>`);
    if (old) parts.push(`<path d="M41 ${ey - 7} Q50 ${ey - 9} 59 ${ey - 7}" fill="none" stroke="#00000033" stroke-width=".8"/><path d="M40 ${ey + 3} L42 ${ey + 5} M60 ${ey + 3} L58 ${ey + 5}" stroke="#00000033" stroke-width=".8"/>`);
    // اللحية والشارب حسب الثقافة
    const beard = cul === 'han' ? 'long' : cul === 'rum' ? (r() < 0.5 ? 'short' : 'full') : cul === 'steppe' ? (r() < 0.6 ? 'mustache' : 'short') : officer ? 'short' : 'full';
    if (beard === 'full') parts.push(`<path d="M${50 - faceW + 2} 46 Q${50 - faceW + 3} 66 50 70 Q${50 + faceW - 3} 66 ${50 + faceW - 2} 46 Q56 58 50 58 Q44 58 ${50 - faceW + 2} 46 Z" fill="${hair}"/>`);
    if (beard === 'short') parts.push(`<path d="M${50 - faceW + 4} 50 Q50 64 ${50 + faceW - 4} 50 Q50 58 ${50 - faceW + 4} 50 Z" fill="${hair}" opacity=".9"/>`);
    if (beard === 'long') parts.push(`<path d="M47 58 Q48 74 50 80 Q52 74 53 58 Z" fill="${hair}"/><path d="M42 55 Q46 53 50 55 Q54 53 58 55" fill="none" stroke="${hair}" stroke-width="1.6"/>`);
    if (beard === 'mustache') parts.push(`<path d="M41 56 Q46 52 50 54 Q54 52 59 56 Q56 58 50 56 Q44 58 41 56 Z" fill="${hair}"/><path d="M48 60 L50 68 L52 60" fill="${hair}"/>`);
    parts.push(`<path d="M46 ${ey + 11} Q50 ${ey + 12.5} 54 ${ey + 11}" fill="none" stroke="#5a2a1a" stroke-width="1.1"/>`);
    // غطاء الرأس
    const gold = '#d4b060';
    if (officer) parts.push(`<path d="M${50 - faceW - 1} 36 Q50 12 ${50 + faceW + 1} 36 Z" fill="#6a6a6a"/><rect x="${50 - faceW - 1}" y="34" width="${2 * faceW + 2}" height="4" fill="#555"/>`);
    else if (cul === 'arab' || cul === 'caucasus' && r() < 0.3) {
      const tc = pick(['#f2ede0', '#e6dcc2', '#2f3f5a', '#5a2a24', '#1f1f1f'], r);
      if (r() < 0.35 && !ruler) parts.push(`<path d="M${50 - faceW - 2} 38 Q50 6 ${50 + faceW + 2} 38 Z" fill="#8a8a86"/><path d="M50 8 L50 14" stroke="#8a8a86" stroke-width="2"/><path d="M${50 - faceW - 2} 37 Q50 31 ${50 + faceW + 2} 37" fill="none" stroke="${tc}" stroke-width="4"/>`);
      else parts.push(`<path d="M${50 - faceW - 3} 38 Q${50 - faceW - 5} 20 50 16 Q${50 + faceW + 5} 20 ${50 + faceW + 3} 38 Q50 30 ${50 - faceW - 3} 38 Z" fill="${tc}"/><path d="M${50 - faceW} 30 Q50 22 ${50 + faceW} 32 M${50 - faceW + 2} 25 Q50 19 ${50 + faceW - 1} 27" fill="none" stroke="#00000022" stroke-width="1.2"/>`);
    } else if (cul === 'rum') {
      if (ruler) parts.push(`<path d="M${50 - faceW} 30 L${50 - faceW} 22 L${50 - 6} 26 L50 18 L${50 + 6} 26 L${50 + faceW} 22 L${50 + faceW} 30 Z" fill="${gold}"/><circle cx="50" cy="24" r="2" fill="#a01e2a"/>`);
      else parts.push(`<path d="M${50 - faceW - 2} 38 Q50 8 ${50 + faceW + 2} 38 Z" fill="#9a8a5a"/><path d="M44 12 Q50 2 60 8 Q66 14 70 26" fill="none" stroke="#a01e2a" stroke-width="4" stroke-linecap="round"/><rect x="${50 - faceW - 2}" y="35" width="${2 * faceW + 4}" height="3.5" fill="#7a6a3a"/>`);
    } else if (cul === 'steppe') {
      parts.push(`<path d="M${50 - faceW - 3} 38 L50 6 L${50 + faceW + 3} 38 Z" fill="${r() < 0.5 ? '#7a6a52' : '#5a4a3a'}"/><path d="M${50 - faceW - 4} 38 Q50 32 ${50 + faceW + 4} 38 L${50 + faceW + 4} 41 Q50 35 ${50 - faceW - 4} 41 Z" fill="#c8b08a"/>`);
    } else if (cul === 'han') {
      if (r() < 0.5 || ruler) parts.push(`<path d="M${50 - faceW + 1} 30 Q50 22 ${50 + faceW - 1} 30 Q50 34 ${50 - faceW + 1} 30 Z" fill="${hair}"/><rect x="45" y="12" width="10" height="12" rx="2" fill="${ruler ? gold : '#1e1611'}"/><path d="M40 16 L60 16" stroke="${ruler ? gold : '#1e1611'}" stroke-width="2"/>`);
      else parts.push(`<path d="M${50 - faceW - 2} 38 Q50 10 ${50 + faceW + 2} 38 Z" fill="#6a5a3a"/><path d="M50 12 Q46 2 52 0" fill="none" stroke="#a01e2a" stroke-width="3"/>`);
    } else parts.push(`<path d="M${50 - faceW - 2} 38 Q50 12 ${50 + faceW + 2} 38 Z" fill="#6a5a4a"/>`);
    // الندوب من سجله
    const sc = (g.scars || []).length;
    if (sc) parts.push(`<path d="M${57 + r() * 3} ${ey - 5} L${53 + r() * 2} ${ey + 8}" stroke="#8a3a2a" stroke-width="1.3" stroke-linecap="round" opacity=".85"/>`);
    if (sc > 1) parts.push(`<path d="M42 ${ey + 6} L46 ${ey + 9}" stroke="#8a3a2a" stroke-width="1.1" opacity=".75"/>`);
    const out = `<svg class="portrait" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${g.name}">${parts.join('')}</svg>`;
    this.cache[key] = out;
    return out;
  },
  el(g, size) { return h('span', { class: 'pt-wrap', html: this.svg(g, size) }); },
};
