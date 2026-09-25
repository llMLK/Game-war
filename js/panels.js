'use strict';
// نوافذ الحملة: المدينة، الجيش، الحصار، الممالك، المملكة، السجل، ونوافذ القرار

const TERRAIN_TIPS = {
  plains: 'أرض مكشوفة: الخيالة في أفضل حالاتها، والرماة بلا غطاء.',
  forest: 'غابات: تحجب السهام وتخفي الكمائن، والخيالة تتعثر فيها.',
  hills: 'تلال: من يمسك المرتفع يضرب أقوى ويرمي أبعد، والصاعد يتعب.',
  river: 'نهر: العابر ضعيف في الماء، والمدافع على الضفة متفوق.',
  desert: 'صحراء: حرّ يُنهك غير المعتادين عليه، وخيالة السهوب تتفوق.',
  mountains: 'ممر جبلي ضيق: التفوق العددي لا يفيد كثيراً، والجبليون يتفوقون.',
  coast: 'ساحل: البحر يحمي جناحاً ويحصر المناورة.',
};
const STATUS_NAME = { war: 'حرب', peace: 'سلام', alliance: 'حلف', vassal: 'تابع', overlord: 'متبوع' };
const WALL_NAMES = ['بلا أسوار', 'سياج خشبي', 'أسوار حجرية', 'قلعة', 'قلعة عظمى'];

// --- عناصر صغيرة مشتركة ---
function dotEl(color) { return h('i', { class: 'dot', style: { background: color } }); }
function stars(n) { return n > 0 ? h('span', { class: 'gstar' }, '★'.repeat(n)) : null; }
function traitChip(g) {
  if (!g) return null;
  return [
    g.trait ? h('button', { class: 'trait', onclick: (e) => { e.stopPropagation(); Help.show(e.currentTarget, null, { title: TRAITS[g.trait].name, note: TRAITS[g.trait].desc }); } }, icon(TRAITS[g.trait].icon), TRAITS[g.trait].name) : null,
    g.flaw ? h('button', { class: 'flaw', onclick: (e) => { e.stopPropagation(); Help.show(e.currentTarget, null, { title: FLAWS[g.flaw].name, note: FLAWS[g.flaw].desc }); } }, FLAWS[g.flaw].name) : null,
  ];
}
function unitHelp(e, r) {
  const d = UNITS[r.type];
  Help.show(e.currentTarget, null, {
    title: d.name, value: r.men + ' رجل',
    lines: [['الهجوم', d.atk], ['الدفاع', d.def], d.missile ? ['الرمي', d.missile] : null, d.charge ? ['الانقضاض', d.charge] : null, r.exp ? ['الخبرة', '★'.repeat(r.exp)] : null, d.upkeep ? ['الكلفة كل دور', d.upkeep * (r.merc ? 1.8 : 1)] : null].filter(Boolean),
    note: d.desc + (r.merc ? ' (مرتزقة)' : ''),
  });
}
function uchip(r, onX, onTap) {
  const d = UNITS[r.type];
  const low = r.men < d.men * 0.5;
  return h('button', { class: 'uchip' + (r.merc ? ' merc' : '') + (d.unique ? ' elite' : '') + (low ? ' low' : ''), onclick: (e) => { e.stopPropagation(); if (onTap) onTap(); else unitHelp(e, r); } },
    icon(UNIT_ICON[r.type] || d.icon), h('b', null, r.men), r.exp ? h('span', { class: 'st' }, '★'.repeat(r.exp)) : null,
    onX ? h('span', { class: 'x', title: 'تسريح', onclick: (e) => { e.stopPropagation(); onX(); } }, icon('close')) : null,
  );
}
// ملخص الوحدات بالأيقونات (للبطاقات المختصرة)
function unitSummary(regs) {
  const by = {};
  for (const r of regs) { const k = UNIT_ICON[r.type] || 'swords'; by[k] = (by[k] || 0) + r.men; }
  return h('span', { class: 'units' }, Object.entries(by).map(([ic, men]) => h('span', { class: 'iv' }, icon(ic), h('bdi', null, men))));
}
function mpPips(a) {
  const max = Game.mpMax(a);
  return h('button', { class: 'mp', onclick: (e) => { e.stopPropagation(); Help.show(e.currentTarget, 'mp', { value: `${a.mp}/${max}` }); } }, icon('boot'), [...Array(max)].map((_, i) => h('i', { class: i < a.mp ? 'on' : '' })));
}
function moodTag(a) {
  if (!a.mood) return null;
  const names = { shaken: 'مهزوز', confident: 'واثق', hungry: 'جائع' };
  return h('button', { class: 'mood ' + a.mood.k, onclick: (e) => { e.stopPropagation(); Help.show(e.currentTarget, 'morale', { value: names[a.mood.k] }); } }, names[a.mood.k]);
}
// تقدير ما قبل المعركة بحدود المعرفة: كلما قلت معرفتك بالعدو اتسع هامش التقدير
function powerCompare(enc, P) {
  const { pa, pd } = Game.encPower(enc);
  const mineAtt = enc.attFid === P;
  const foe = mineAtt ? enc.defFid : enc.attFid;
  const lvl = Game.intelLevel(P, foe);
  const my = mineAtt ? pa : pd, en = mineAtt ? pd : pa;
  const ratio = my / Math.max(1, en);
  const spread = lvl >= 3 ? 0 : lvl === 2 ? 0.2 : lvl === 1 ? 0.45 : 1;
  const verdict = lvl === 0 ? 'قوتهم مجهولة: الكشافة لم تعد بشيء' : ratio > 2.2 ? 'تفوّق ساحق' : ratio > 1.4 ? 'أفضلية واضحة' : ratio > 0.85 ? 'متكافئة: الخطة ستحسمها' : ratio > 0.55 ? 'العدو أقوى: تحتاج خطة ذكية' : 'العدو أقوى بكثير';
  const pct = 100 * my / (my + en || 1);
  const s = Game.encSides(enc);
  const mine = mineAtt ? s.attArmies : s.defArmies, theirs = mineAtt ? s.defArmies : s.attArmies;
  const cm = Game.condOf(mine), ce = Game.condOf(theirs);
  const why = [];
  if (cm.fat >= 15) why.push(`جيشك منهك ${Math.round(cm.fat)}٪`);
  if (lvl >= 2 && ce.fat >= 15) why.push(`العدو منهك ${Math.round(ce.fat)}٪`);
  if (cm.mor <= -8) why.push('معنويات جيشك منخفضة');
  if (lvl >= 2 && ce.mor <= -8) why.push('معنويات العدو منخفضة');
  if (enc.kind === 'siege') why.push(`${WALL_NAMES[Math.min(4, s.node.walls)]} تضاعف المدافعين`);
  return h('div', { class: 'compare' },
    h('div', { class: 'cbar' + (spread ? ' fuzzy' : '') }, h('i', { style: { width: (lvl === 0 ? 50 : pct) + '%' } })),
    h('div', { class: 'cl' }, h('span', null, 'قوتك'), h('b', null, verdict, spread && lvl > 0 ? h('small', { class: 'muted' }, ` (تقدير ±${Math.round(spread * 100)}٪)`) : null), h('span', null, 'العدو')),
    why.length ? h('p', { class: 'hint small' }, why.join(' · ')) : null,
  );
}

const Panels = {
  // ═══════════════ المدينة ═══════════════
  citySpec(scene, n) {
    const P = scene.P;
    return {
      key: 'city:' + n.id, icon: 'castle',
      get color() { return Game.f(n.owner).color; },
      title: () => n.name,
      short: () => n.name,
      sub: () => {
        const f = Game.f(n.owner), own = n.owner === P;
        const st = own ? null : Game.status(P, n.owner);
        return [dotEl(f.color), f.name, st ? h('span', { class: 'pill ' + st }, STATUS_NAME[st]) : null, n.capital ? h('span', { class: 'tag' }, icon('crown'), 'عاصمة') : null,
          h('span', { class: 'tag' }, icon(TERRAIN[n.terrain].icon), TERRAIN[n.terrain].name)];
      },
      status: () => (Game.besiegers(n.id).length ? `محاصرة · مؤن ${Math.max(0, n.stores)}` : n.owner === P ? `ولاء ${n.loyalty}` : Game.fname(n.owner)),
      alert: () => (n.owner === P && Game.besiegers(n.id).some((b) => Game.atWar(b.fid, P)) ? 'crit' : n.owner === P && n.loyalty < 25 ? 'imp' : false),
      render: (body) => this.cityBody(scene, n, body),
      onClose: () => { if (scene.selNode === n) scene.selNode = null; },
    };
  },

  cityBody(scene, n, body) {
    const P = scene.P;
    const own = n.owner === P;
    const intel = own ? 3 : Game.intelLevel(P, n.owner);
    const gMen = Game.menOf(n.garrison);
    const bs = Game.besiegers(n.id);
    // --- الأرقام المهمة فقط، والتفصيل عند الضغط ---
    const kv = h('div', { class: 'kv' });
    if (own || intel >= 2) {
      const lt = own ? Game.loyaltyTarget(n) : null;
      kv.appendChild(hstat('loyalty', n.loyalty, {
        meter: n.loyalty, cls: n.loyalty < 30 ? 'bad' : n.loyalty < 45 ? 'warn' : '',
        lines: lt ? () => {
          const step = clamp(lt.target - n.loyalty, -5, Game.merchantAt(n) || Game.governorOf(n, 'merchant') ? 7 : 4);
          return [...lt.parts.map(([k, v]) => [k, signed(v) + ' نقطة', v > 0 ? 'pos' : v < 0 ? 'neg' : '']), ['يتجه نحو', lt.target, 'sum'],
            ['التغير في الدور القادم', step ? signed(step) + ' نقطة' : 'مستقر', step > 0 ? 'pos' : step < 0 ? 'neg' : ''],
            ['أثره على دخل المدينة', `تحصل على ${Math.round(Game.loyaltyIncomeFactor(n.loyalty) * 100)}٪`, '']];
        } : null,
      }));
    }
    if (own) {
      const ip = Game.incomeParts(n);
      kv.appendChild(hstat('income', '+' + ip.total, { icon: 'coins', lines: () => ip.lines }));
    }
    const defLines = () => [['الأسوار', WALL_NAMES[Math.min(4, n.walls)]], ['الحامية', own ? gMen + ' رجل' : Game.estimate(P, n.owner, gMen).text], own || intel >= 2 ? ['مؤن الحصار', n.stores < 0 ? 'مجاعة' : `${n.stores}/${Game.storesMax(n)} أدوار`] : null, own ? ['السكان', n.pop.toLocaleString('en')] : null].filter(Boolean);
    kv.appendChild(hstat('defense', own || intel >= 2 ? gMen : Game.estimate(P, n.owner, gMen).text, { label: n.walls ? `أسوار ${n.walls}` : 'بلا أسوار', lines: defLines }));
    if (own) {
      kv.appendChild(hstat('manpower', Math.floor(n.manpower), {
        cls: n.manpower < 60 ? 'warn' : '',
        lines: () => [['المتاح الآن', Math.floor(n.manpower)], ['الحد الأقصى', Game.mpCap(n)], ['يتجدد كل دور', '+' + Game.mpRegen(n), 'pos'], ['السكان', n.pop.toLocaleString('en')]],
      }));
    } else if (intel >= 1) kv.appendChild(hstat('pop', n.pop.toLocaleString('en')));
    body.appendChild(kv);
    // --- التحذيرات ---
    if (bs.length) {
      const sf = bs[0].fid;
      body.appendChild(h('button', { class: 'box siege', onclick: () => scene.openSiege(n) },
        h('div', { class: 'sec-h' }, icon('tent'), sf === P ? `حصارك لـ${n.name}` : `تحت حصار ${Game.fname(sf)}`, h('span', { class: 'muted' }, `منذ ${Game.siegeTurns(n, sf)} أدوار`)),
        h('div', { class: 'progress' }, icon('granary'), h('span', { class: 'bar' }, h('i', { class: n.stores <= 1 ? 'bad' : '', style: { width: clamp(Math.max(0, n.stores) / Game.storesMax(n), 0, 1) * 100 + '%' } })), h('span', null, n.stores < 0 ? 'مجاعة' : `${n.stores} أدوار`)),
        h('span', { class: 'hint' }, 'افتح نافذة الحصار'),
      ));
    }
    if (own && n.unrest > 0) body.appendChild(h('p', { class: 'hint' }, hstat('unrest', `${n.unrest} أدوار`, { cls: 'warn' }), ' مدينة مضطربة: المرتزقة فقط، ودخل منخفض.'));
    if (own && Game.overstack(n, P) > 0) body.appendChild(h('p', { class: 'hint warn' }, hstat('supply', `${Game.stackAt(n, P)}/${Game.supplyCap(n, P)}`, { cls: 'bad' }), ' ازدحام: الجيوش هنا فوق قدرة الإمداد.'));
    const gov = Game.governorAt(n);
    if (gov) body.appendChild(h('p', { class: 'hint' }, icon('seal'), ` الحاكم: ${gov.name} `, traitChip(gov)));
    if (n.charter) body.appendChild(h('p', { class: 'hint' }, icon('scroll'), ' مدينة ذات ميثاق حر: ولاء أعلى ودخل أقل.'));
    if (Game.crisesAt) for (const c of Game.crisesAt(n.id)) body.appendChild(h('button', { class: 'box crisis', onclick: () => this.openCrisis(scene, c) }, h('div', { class: 'sec-h' }, icon(CRISES[c.type].icon), Game.crisisTitle(c), h('span', { class: 'muted' }, c.ask[P] ? 'قرار مطلوب' : Game.crisisStatus(c)))));

    if (!own) { this.foreignCity(scene, n, body, intel); return; }
    // --- أقسام المدينة ---
    scene.cityTab = scene.cityTab || {};
    const armies = Game.armiesAt(n.id).filter((a) => !a.siege);
    let tab = scene.cityTab[n.id] || (armies.some((a) => a.fid === P) ? 'armies' : 'build');
    const seg = h('div', { class: 'seg' });
    const tabs = [['armies', 'swords', `الجيوش ${armies.filter((a) => a.fid === P).length || ''}`], ['recruit', 'men', 'التجنيد'], ['build', 'hammer', 'التطوير']];
    for (const [k, ic, name] of tabs) seg.appendChild(h('button', { class: k === tab ? 'on' : '', onclick: () => { scene.cityTab[n.id] = k; Sheets.render(); } }, icon(ic), name));
    body.appendChild(seg);
    if (tab === 'armies') {
      const mine = armies.filter((a) => a.fid === P);
      for (const a of mine) body.appendChild(this.armyMini(scene, a));
      for (const a of armies.filter((x) => x.fid !== P)) body.appendChild(this.foreignArmy(a));
      if (!mine.length) body.appendChild(h('p', { class: 'hint' }, 'لا جيش لك هنا. عيّن قائداً من قسم التجنيد.'));
    } else if (tab === 'recruit') body.appendChild(this.recruitSection(scene, n));
    else body.appendChild(this.buildSection(scene, n));
  },

  foreignCity(scene, n, body, intel) {
    const P = scene.P;
    if (intel >= 2 && n.garrison.length) body.appendChild(h('div', { class: 'section' }, h('div', { class: 'sec-h' }, icon('shield'), 'الحامية'), h('div', { class: 'units' }, n.garrison.map((r) => uchip(r)))));
    else if (intel < 2) body.appendChild(h('p', { class: 'hint' }, icon('eye'), ' التفاصيل مجهولة، التجارة أو الجواسيس تكشف المزيد.'));
    for (const a of Game.armiesAt(n.id).filter((x) => !x.siege)) body.appendChild(this.foreignArmy(a));
    const near = Game.armiesOf(P).filter((a) => a.mp > 0 && Game.reach(a)[n.id]);
    if (near.length) {
      body.appendChild(h('div', { class: 'section' }, h('div', { class: 'sec-h' }, icon('swords'), 'جيوشك القريبة'),
        near.map((a) => h('button', { class: 'chip', onclick: () => scene.startMove(a) }, icon('banner'), `${Game.armyGen(a).name} · ${Game.armyMen(a)}`)),
        h('p', { class: 'hint' }, 'اختر جيشاً ثم اضغط هذه المدينة على الخريطة.')));
    }
  },

  armyMini(scene, a) {
    const g = Game.armyGen(a);
    const sel = scene.selArmy === a;
    return h('div', { class: 'acard own' + (sel ? ' sel' : '') },
      h('div', { class: 'ah' }, icon('banner'), h('b', null, g ? g.name : 'بلا قائد'), stars(g && g.rank), h('span', { class: 'sp' }), h('span', { class: 'muted small' }, `${Game.armyMen(a)} رجل`)),
      h('div', { class: 'gline' }, traitChip(g), mpPips(a), moodTag(a), a.siege ? h('span', { class: 'tag bad' }, icon('tent'), 'يحاصر') : null),
      a.regs.length ? unitSummary(a.regs) : h('span', { class: 'hint' }, 'القائد وحرسه فقط'),
      h('div', { class: 'row-btns' },
        ib('boot', a.mp > 0 && a.regs.length ? 'تحريك' : 'لا حركة', { class: 'btn primary', disabled: a.mp <= 0 || !a.regs.length, onclick: () => scene.startMove(a) }),
        ib('expand', 'التفاصيل', { class: 'btn', onclick: () => scene.openArmy(a) }),
      ),
    );
  },

  foreignArmy(a) {
    const P = Game.S.player;
    const g = Game.armyGen(a);
    const lvl = Game.intelLevel(P, a.fid);
    const men = Game.menOf(a.regs);
    return h('div', { class: 'acard' },
      h('div', { class: 'ah' }, dotEl(Game.f(a.fid).color), h('b', null, lvl >= 1 && g ? g.name : 'قائد مجهول'), lvl >= 1 ? stars(g && g.rank) : null, h('span', { class: 'sp' }), h('span', { class: 'muted small' }, Game.fname(a.fid))),
      lvl >= 1 ? h('div', { class: 'gline' }, traitChip(g), a.siege ? h('span', { class: 'tag bad' }, icon('tent'), 'يحاصر') : null) : null,
      lvl >= 2 ? h('div', { class: 'units' }, a.regs.map((r) => uchip(r))) : h('p', { class: 'hint' }, `نحو ${Game.estimate(P, a.fid, men).text} رجل`),
    );
  },

  // ═══════════════ الجيش ═══════════════
  armySpec(scene, a) {
    return {
      key: 'army:' + a.id, icon: 'banner', color: Game.f(a.fid).color,
      title: () => { const g = Game.armyGen(a); return 'جيش ' + (g ? g.name : ''); },
      short: () => { const g = Game.armyGen(a); return g ? g.name : 'جيش'; },
      sub: () => [icon('castle'), Game.node(a.node).name, a.siege ? h('span', { class: 'tag bad' }, icon('tent'), 'يحاصر') : null],
      status: () => (scene.selArmy === a ? `يختار الوجهة · ${a.mp}/${Game.mpMax(a)}` : `${Game.armyMen(a)} رجل`),
      active: () => scene.selArmy === a,
      alert: () => (a.mood && a.mood.k !== 'confident' ? 'imp' : false),
      valid: () => Game.S.armies.includes(a),
      onClose: () => { if (scene.selArmy === a) scene.selArmy = null; },
      render: (body) => this.armyBody(scene, a, body),
    };
  },

  armyBody(scene, a, body) {
    const P = scene.P;
    const g = Game.armyGen(a);
    const n = Game.node(a.node);
    body.appendChild(h('div', { class: 'acard own' },
      h('div', { class: 'ah' }, icon('helmet'), h('b', null, g ? g.name : 'بلا قائد'), stars(g && g.rank), h('span', { class: 'sp' }), h('span', { class: 'muted small' }, `${a.regs.length}/${MAX_REGS} وحدات`)),
      h('div', { class: 'gline' }, traitChip(g), g && g.vendetta ? h('span', { class: 'tag bad' }, icon('drop'), 'يطلب الثأر') : null),
    ));
    const kv = h('div', { class: 'kv' },
      hstat('morale', a.mood ? { shaken: 'مهزوز', confident: 'واثق', hungry: 'جائع' }[a.mood.k] : 'ثابتة', { cls: a.mood && a.mood.k !== 'confident' ? 'warn' : '', lines: () => [['معنويات الجيش', signed(a.mor || 0) + ' عن المعتاد', (a.mor || 0) < 0 ? 'neg' : (a.mor || 0) > 0 ? 'pos' : ''], ['تعود نحو المعتاد', `${n.owner === a.fid && !Game.besieger(n.id) ? 8 : 5} نقاط كل دور`]] }),
      hstat('fatigue', `${a.fat || 0}٪`, { cls: (a.fat || 0) >= 50 ? 'bad' : (a.fat || 0) >= 25 ? 'warn' : '', lines: () => { const rest = a.siege ? 12 : n.owner === a.fid ? (Game.besieger(n.id) ? 15 : 35) : Game.friendly(n.owner, a.fid) ? 25 : 15; return [['الإرهاق الآن', `${a.fat || 0}٪`], ['أثره في القتال', `−${Math.round((a.fat || 0) / 2.6)}٪ من القوة`, (a.fat || 0) ? 'neg' : ''], ['يزول كل دور هنا', `${rest} نقاط${Game.hasTrait(a, 'logistician') ? ' (+30٪ خبير تموين)' : ''}`, 'pos']]; } }),
      a.regs.some((r) => UNITS[r.type].range) ? hstat('ammo', `${Math.round(100 * a.regs.filter((r) => UNITS[r.type].range).reduce((t, r) => t + (r.ammo != null ? r.ammo : 1), 0) / a.regs.filter((r) => UNITS[r.type].range).length)}٪`) : null,
      hstat('mp', `${a.mp}/${Game.mpMax(a)}`),
      hstat('armymen', Game.armyMen(a), { lines: () => [['الوحدات', Game.menOf(a.regs)], ['حرس القائد', g ? Game.genMen(g) : 0]] }),
    );
    const ov = Game.overstack(n, a.fid);
    if (ov > 0) kv.appendChild(hstat('supply', `${Game.stackAt(n, a.fid)}/${Game.supplyCap(n, a.fid)}`, { cls: 'bad' }));
    body.appendChild(kv);
    const units = h('div', { class: 'units' });
    a.regs.forEach((r, i) => {
      units.appendChild(uchip(r, () => this.confirmDisband(scene, a, i), () => this.unitActions(scene, a, i)));
    });
    if (!a.regs.length) units.appendChild(h('span', { class: 'hint' }, 'القائد وحرسه فقط. جنّد وحدات أو انقلها إليه.'));
    body.appendChild(units);
    if (a.regs.length) body.appendChild(h('p', { class: 'hint small' }, 'اضغط أي وحدة لتسريحها أو إعادة تسليحها.'));
    const others = Game.armiesAt(a.node).filter((o) => o !== a && o.fid === P && !!o.siege === !!a.siege);
    const cons = Game.consolidatePlan(a);
    const terr = Game.canTrain(a);
    const ops = h('div', { class: 'row-btns' },
      a.regs.length && n.owner === P && !a.siege ? ib('star', terr ? `تدريب: ${terr}` : `تدريب (${Game.trainCost(a)})`, { class: 'btn', disabled: !!terr, title: 'دور كامل بلا حركة: نصف نجمة خبرة لكل وحدة', onclick: () => { const e = Game.train(a); UI.toast(e || 'يتدرّب الجيش هذا الدور: نصف نجمة خبرة لكل وحدة'); scene.afterAction(n); } }) : null,
      cons.length ? ib('plus', `ضمّ البقايا: ${cons.map((c) => `${c.idx.length}←${c.into} ${UNITS[c.type].name}`).join('، ')} (يوفّر ${cons.reduce((t, c) => t + c.save, 0)}/دور)`, { class: 'btn', onclick: () => this.confirmConsolidate(scene, a, cons) }) : null,
    );
    if (ops.children.length) body.appendChild(ops);
    body.appendChild(h('div', { class: 'row-btns' },
      ib('boot', scene.selArmy === a ? 'اختر الوجهة على الخريطة' : a.mp <= 0 ? 'لا حركة متبقية' : 'تحريك', {
        class: 'btn primary' + (scene.selArmy === a ? ' on' : ''), disabled: a.mp <= 0 || !a.regs.length,
        onclick: () => { if (scene.selArmy === a) { Sheets.minimize('army:' + a.id); } else scene.startMove(a); },
      }),
      a.siege ? ib('tent', 'نافذة الحصار', { class: 'btn', onclick: () => scene.openSiege(n) }) : null,
      a.regs.length ? ib('men', 'تقسيم / نقل', { class: 'btn', onclick: () => this.splitDialog(scene, a) }) : null,
      others.length ? ib('plus', 'دمج', { class: 'btn', onclick: () => this.mergeDialog(scene, a, others) }) : null,
      !a.regs.length ? ib('close', 'إعفاء القائد', { class: 'btn ghost', onclick: () => { Game.dismissGeneral(a); scene.afterAction(n); } }) : null,
      Game.canAppoint && !a.siege && n.owner === P && g && !a.regs.length ? ib('seal', 'تعيينه حاكماً', { class: 'btn', onclick: () => { const e = Game.appointGovernor(g, n); UI.toast(e || `${g.name} حاكماً على ${n.name}`); scene.afterAction(n); } }) : null,
    ));
    if (n.barracks && n.owner === P && !a.siege) body.appendChild(h('p', { class: 'hint' }, icon('horseshoe'), Game.besieger(n.id) ? ' المدينة محاصرة: لا تدريب تلقائي، لكن التدريب بأمر وإعادة التسليح ممكنان من ورشها.' : ' الجيوش المقيمة هنا دون حركة تتدرّب تلقائياً ببطء (ربع نجمة كل دور)، والتدريب بأمر أسرع.'));
  },

  confirmDisband(scene, a, i) {
    const r = a.regs[i];
    const n = Game.node(a.node);
    const back = Game.disbandRefund(a, r);
    const why = r.merc ? 'المرتزقة يرحلون ولا يعود منهم أحد.' : a.siege || n.owner !== a.fid ? 'الجيش خارج مدنك: الرجال يعودون إلى قراهم ولا يُسترد منهم شيء.' : back < Math.round(r.men * 0.7) ? `المدينة قريبة من حدها الأقصى، فلا يعود إلا ${back}.` : `يعود 70٪ من الرجال إلى القوى البشرية في ${n.name}.`;
    UI.modal({
      title: 'تسريح نهائي؟', icon: 'close',
      body: h('div', null,
        EconUI.lines([
          ['الوحدة', `${UNITS[r.type].name} · ${r.men} رجل${r.exp ? ' · خبرة ' + '★'.repeat(r.exp) : ''}`],
          ['رجال الجيش', `${Game.armyMen(a)} ← ${Game.armyMen(a) - r.men}`],
          ['الصيانة', `توفّر ${Math.round(UNITS[r.type].upkeep * (r.merc ? 1.8 : 1))} كل دور`, 'pos'],
          ['خانات الجيش', `${a.regs.length}/${MAX_REGS} ← ${a.regs.length - 1}/${MAX_REGS}`],
          ['يعود إلى القوى البشرية', back ? `${back} رجل` : 'لا شيء', back ? 'pos' : ''],
        ]),
        h('p', { class: 'hint' }, why, ' الخبرة تضيع مع الوحدة.'),
      ),
      buttons: [
        { label: 'سرّح نهائياً', danger: true, onClick: () => { Game.disband(a, i); if (Game.track) Game.track('disband'); scene.afterAction(n); } },
        { label: 'إلغاء' },
      ],
    });
  },
  confirmConsolidate(scene, a, plans) {
    UI.modal({
      title: 'ضمّ البقايا', icon: 'plus',
      body: h('div', null,
        EconUI.lines(plans.flatMap((p) => [[UNITS[p.type].name, `${p.idx.length} وحدات ناقصة (${p.men} رجل) ← ${p.into}`], ['توفير الصيانة', `${p.save} كل دور`, 'pos']])),
        h('p', { class: 'hint' }, 'الرجال أنفسهم في وحدات أقل: لا رجال جدد، والخبرة متوسط الوحدات مقرّباً للأسفل، والحركة كما هي.')),
      buttons: [{ label: 'اضمم', primary: true, onClick: () => { const e = Game.consolidate(a); UI.toast(e || 'ضُمّت البقايا'); scene.afterAction(Game.node(a.node)); } }, { label: 'إلغاء' }],
    });
  },
  // أفعال الوحدة: التفاصيل، إعادة التسليح، التسريح
  unitActions(scene, a, i) {
    const r = a.regs[i], d = UNITS[r.type];
    const opts = Game.rearmOptions(a, i);
    UI.modal({
      title: `${d.name} · ${r.men} رجل`, icon: UNIT_ICON[r.type] || 'swords',
      body: h('div', null,
        EconUI.lines([['الهجوم / الدفاع', `${d.atk} / ${d.def}`], d.missile ? ['الرمي', d.missile] : null, d.charge ? ['الانقضاض', d.charge] : null, ['الخبرة', r.exp ? '★'.repeat(r.exp) : 'بلا'], ['الصيانة', `${Math.round(d.upkeep * (r.merc ? 1.8 : 1))} كل دور`], r.merc ? ['النوع', 'مرتزقة'] : null]),
        h('p', { class: 'small' }, d.desc),
        opts.length ? h('div', { class: 'sec-h' }, icon('hammer'), 'إعادة التسليح بمعدات المدينة') : null,
        opts.length ? h('p', { class: 'hint' }, 'الخيل من إسطبلات المدينة والسلاح من ورشها، فتصح حتى تحت الحصار. تأخذ دوراً كاملاً بلا حركة، وتفقد الوحدة نجمة خبرة لأن السلاح جديد عليها.') : null,
      ),
      buttons: [
        ...opts.map((o) => { const err = Game.canRearm(a, i, o.to); return { label: `إلى ${UNITS[o.to].name} (${o.cost})`, sub: err || (o.extra ? `${o.men} رجل، ويعود ${o.extra} إلى المدينة` : `${o.men} رجل`), disabled: !!err, onClick: () => { const e = Game.rearm(a, i, o.to); UI.toast(e || `أُعيد تسليحها: ${UNITS[o.to].name}`); scene.afterAction(Game.node(a.node)); } }; }),
        { label: 'تسريح…', danger: true, onClick: () => this.confirmDisband(scene, a, i) },
        { label: 'إغلاق', ghost: true },
      ],
    });
  },

  // --- تقسيم الجيش ---
  splitDialog(scene, a) {
    const P = scene.P;
    const picks = a.regs.map((r) => ({ men: 0, max: r.men }));
    let dest = null;
    const others = Game.armiesAt(a.node).filter((o) => o !== a && o.fid === P && !!o.siege === !!a.siege);
    const total = h('b');
    const list = h('div', { class: 'split-list' });
    const upd = () => { total.textContent = `${picks.reduce((s, p) => s + p.men, 0)} / ${picks.reduce((s, p) => s + p.max, 0)}`; };
    a.regs.forEach((r, i) => {
      const val = h('b', { class: 'sv' }, '0');
      const range = h('input', { type: 'range', min: 0, max: r.men, step: 1, value: 0, id: 'split-' + a.id + '-' + i });
      const set = (v) => { v = Math.round(clamp(v, 0, r.men)); if (v > 0 && v < 5) v = 5; if (r.men - v > 0 && r.men - v < 5) v = r.men; picks[i].men = v; range.value = v; val.textContent = v; upd(); };
      range.addEventListener('input', () => set(+range.value));
      list.appendChild(h('div', { class: 'split-row' },
        h('span', { class: 'sn' }, icon(UNIT_ICON[r.type]), UNITS[r.type].name),
        h('button', { class: 'step', onclick: () => set(picks[i].men - 10) }, icon('minus')),
        range,
        h('button', { class: 'step', onclick: () => set(picks[i].men + 10) }, icon('plus')),
        val, h('span', { class: 'muted small' }, '/' + r.men),
      ));
      picks[i].set = set;
    });
    const quick = h('div', { class: 'row-btns' },
      h('button', { class: 'chip', onclick: () => picks.forEach((p, i) => p.set(a.regs[i].men)) }, 'الكل'),
      h('button', { class: 'chip', onclick: () => picks.forEach((p, i) => p.set(Math.round(a.regs[i].men / 2))) }, 'النصف'),
      h('button', { class: 'chip', onclick: () => picks.forEach((p) => p.set(0)) }, 'لا شيء'),
    );
    const destBox = h('div', { class: 'dest' });
    const renderDest = () => {
      destBox.innerHTML = '';
      destBox.append(h('div', { class: 'label' }, 'إلى من تذهب القوات المفصولة؟'));
      const row = h('div', { class: 'row-btns' });
      for (const o of others) {
        const g = Game.armyGen(o);
        row.appendChild(h('button', { class: 'chip' + (dest && dest.kind === 'army' && dest.armyId === o.id ? ' on' : ''), onclick: () => { dest = { kind: 'army', armyId: o.id }; renderDest(); } }, `ضمّ إلى ${g.name} (${o.regs.length}/8)`));
      }
      const chosen = dest && dest.kind === 'new' ? (dest.officer ? 'ضابط' : Game.gen(dest.genId).name) : null;
      row.appendChild(h('button', { class: 'chip' + (dest && dest.kind === 'new' ? ' on' : ''), onclick: async () => { const r = await this.generalPicker(P, { allowOfficer: true, title: 'قائد القوة الجديدة' }); if (r) { dest = r === 'officer' ? { kind: 'new', officer: true } : { kind: 'new', genId: r }; renderDest(); } } }, chosen ? `قوة جديدة بقيادة ${chosen}` : 'قوة جديدة بقائد جديد…'));
      destBox.appendChild(row);
    };
    renderDest(); upd();
    UI.modal({
      title: `تقسيم جيش ${Game.armyGen(a).name}`, icon: 'men',
      body: h('div', null, h('p', { class: 'hint' }, 'حدّد عدد الرجال من كل وحدة. القائد يبقى مع ما تبقى، وكل قائد يقود 8 وحدات على الأكثر.'), quick, list, h('p', null, 'المختار: ', total), destBox),
      buttons: [
        {
          label: 'افصل', primary: true, keep: true, onClick: (close) => {
            if (!dest) { UI.toast('اختر إلى من تذهب القوات'); return; }
            const res = Game.splitArmy(a, picks.map((p, i) => ({ idx: i, men: p.men })), dest);
            if (res.err) { UI.toast(res.err); return; }
            close();
            const na = res.army;
            if (Game.track) Game.track('split');
            scene.afterAction(Game.node(na.node));
            if (dest.kind === 'new' && na.mp > 0) { scene.startMove(na); UI.toast('القوة الجديدة جاهزة، اختر وجهتها أو ألغِ لتبقى هنا'); }
          },
        },
        { label: 'إلغاء' },
      ],
    });
  },

  mergeDialog(scene, a, others) {
    UI.modal({
      title: 'دمج الجيوش', icon: 'plus',
      body: h('p', null, 'انقل كل وحدات هذا الجيش إلى قائد آخر هنا (حتى 8 وحدات). يعود القائد الحالي إلى البلاط إن فرغ جيشه.'),
      buttons: [
        ...others.map((o) => ({ label: `إلى ${Game.armyGen(o).name} (${o.regs.length}/8)`, disabled: o.regs.length >= MAX_REGS, onClick: () => { const e = Game.mergeInto(a, o); if (e) UI.toast(e); scene.afterAction(Game.node(o.node)); } })),
        { label: 'إلغاء' },
      ],
    });
  },

  // --- اختيار قائد ---
  genCard(g, extra) {
    const ruler = Game.isRuler && Game.isRuler(g), heir = Game.isHeir && Game.isHeir(g);
    const own = g.fid === Game.S.player;
    const loyWarn = own && !ruler && g.loy != null && g.loy < 45 && ['army', 'gov', 'pool'].includes(g.status);
    return h('div', { class: 'gcard' + (ruler ? ' ruler' : '') },
      h('div', { class: 'gtop' }, h('b', null, ruler ? icon('crown', 'crown-i') : null, g.name, ' ', stars(g.rank)), h('span', { class: 'muted small' }, iv('gold', Game.genSalary(g)), '/دور')),
      h('div', { class: 'gline' }, traitChip(g), ruler ? h('span', { class: 'tag' }, 'الحاكم') : null, heir ? h('span', { class: 'tag' }, icon('seal'), 'ولي العهد') : null,
        loyWarn ? hstat('genloy', g.loy, { label: g.loy < 32 ? 'طامح' : 'ساخط', cls: g.loy < 32 ? 'bad' : 'warn', lines: () => [['الولاء الآن', g.loy], ['يتجه نحو', Game.genLoyTarget(g), 'sum']] }) : null,
        own && !ruler && g.loy != null && g.loy < 60 && ['army', 'gov', 'pool'].includes(g.status) ? h('button', { class: 'chip', onclick: (e) => { e.stopPropagation(); const er = Game.honorGeneral(Game.S.player, g); UI.toast(er || `كرّمتَ ${g.name}: الولاء ${g.loy}`); if (!er && Game.track) Game.track('honor'); Sheets.render(); } }, icon('star'), `كرّمه ${Game.honorCost(g)}`) : null),
      g.trait ? h('p', { class: 'small' }, TRAITS[g.trait].desc) : h('p', { class: 'small muted' }, 'ضابط بلا موهبة خاصة.'),
      (() => { const k = Game.genSkills(g); const parts = [k.coh ? `تماسك +${k.coh * 3} معنويات` : null, k.exe ? `دقة الأوامر +${k.exe * 4}٪` : null, k.res ? `الاحتياط +${k.res * 4} معنويات` : null, k.ret ? `انسحاب منظم، مطاردة −${k.ret * 12}٪` : null].filter(Boolean); return h('p', { class: 'small muted' }, `${'★'.repeat(g.rank)}: `, parts.length ? parts.join('، ') : 'قائد جديد بلا قدرات قيادة إضافية'); })(),
      g.flaw ? h('p', { class: 'small warn' }, FLAWS[g.flaw].desc) : null,
      g.vendetta ? h('p', { class: 'small warn' }, `يطلب الثأر من ${Game.fname(g.vendetta)}`) : null,
      extra || null,
    );
  },
  generalPicker(fid, opts = {}) {
    return new Promise((resolve) => {
      const pool = Game.poolOf(fid).filter((g) => !g.name.startsWith('الضابط')).sort((a, b) => b.rank - a.rank);
      const list = h('div', { class: 'glist' });
      let close;
      for (const g of pool) {
        const fee = Game.hireFee(g);
        list.appendChild(h('button', { class: 'gpick', disabled: Game.f(fid).gold < fee, onclick: () => { close(); resolve(g.id); } }, this.genCard(g, h('span', { class: 'fee' }, `تعيين ${fee} مرة واحدة · ثم ${Game.genSalary(g)} كل دور`))));
      }
      if (!pool.length) list.appendChild(h('p', { class: 'muted' }, 'لا قادة متاحون في البلاط. يمكنك ترقية ضابط.'));
      close = UI.modal({
        title: opts.title || 'اختر قائداً', icon: 'helmet', cls: 'wide',
        body: h('div', null, h('p', { class: 'hint' }, 'كل قائد يغيّر نظاماً مختلفاً: الحركة، الحصار، الاقتصاد، الإمداد، أو القتال. اختر حسب المهمة.'), list),
        buttons: [
          opts.allowOfficer !== false ? { label: 'ترقية ضابط', sub: '40 مرة واحدة · ثم 8 كل دور', disabled: Game.f(fid).gold < 40, onClick: () => resolve('officer') } : null,
          { label: 'إلغاء', onClick: () => resolve(null) },
        ],
      });
    });
  },

  // --- التجنيد ---
  recruitSection(scene, n) {
    const P = scene.P;
    const armies = Game.armiesOfAt(P, n.id).filter((a) => a.regs.length < MAX_REGS);
    if (!scene.recruitTo || !armies.find((a) => a.id === scene.recruitTo)) scene.recruitTo = armies[0] ? armies[0].id : null;
    const sec = h('div', { class: 'section' });
    const who = h('div', { class: 'row-btns' });
    for (const a of armies) who.appendChild(h('button', { class: 'chip' + (scene.recruitTo === a.id ? ' on' : ''), onclick: () => { scene.recruitTo = a.id; Sheets.render(); } }, icon('helmet'), `${Game.armyGen(a).name} (${a.regs.length}/8)`));
    who.appendChild(h('button', {
      class: 'chip', onclick: async () => {
        const r = await this.generalPicker(P, { title: `تعيين قائد في ${n.name}` });
        if (!r) return;
        const g = r === 'officer' ? Game.officer(P) : Game.gen(r);
        const res = Game.hire(P, g.id, n.id);
        if (res.err) UI.toast(res.err); else { scene.recruitTo = res.army.id; UI.toast(`عُيّن ${g.name}`); }
        scene.afterAction(n);
      },
    }, icon('plus'), 'تعيين قائد'));
    sec.append(h('div', { class: 'label' }, 'الوحدات الجديدة تنضم إلى:'), who);
    sec.appendChild(h('div', { class: 'kv' }, hstat('manpower', Math.floor(n.manpower), { label: 'رجال متاحون' })));
    if (Game.besieger(n.id)) sec.appendChild(h('p', { class: 'hint warn' }, icon('tent'), ' المدينة محاصرة: تجنّد من رجالها وورشها فقط. لا مرتزقة من الخارج، ولا تتجدد القوى البشرية حتى يُرفع الحصار.'));
    // الضغط يختار ويعرض؛ التنفيذ بزر مستقل يذكر العدد والكلفة
    const pickKey = 'rec:' + n.id;
    const sel = scene.recPick && scene.recPick.key === pickKey ? scene.recPick : null;
    const grid = h('div', { class: 'ugrid' });
    for (const t of Game.recruitableTypes(P, n)) {
      const d = UNITS[t];
      const err = Game.canRecruit(P, n, t, scene.recruitTo, false);
      grid.appendChild(h('button', {
        class: 'ubtn' + (d.unique ? ' elite' : '') + (err ? ' blocked' : '') + (sel && sel.type === t && !sel.merc ? ' picked' : ''), title: err || d.desc,
        onclick: () => { scene.recPick = { key: pickKey, type: t, merc: false, count: 1 }; Sheets.render(); },
      },
        icon(UNIT_ICON[t]), h('span', { class: 'nm' }, d.name), h('span', { class: 'cost' }, icon('gold'), d.cost, ' ', icon('men'), d.men),
        err && err !== 'الذهب لا يكفي' ? h('span', { class: 'why' }, err) : null,
      ));
    }
    sec.appendChild(grid);
    const mercs = Game.f(P).mercs;
    if (mercs.length) {
      sec.appendChild(h('div', { class: 'label' }, 'مرتزقة: بلا قوى بشرية، مخضرمون، تُجنَّد حتى في المدن المضطربة، وصيانتهم ضعف تقريباً'));
      const mg = h('div', { class: 'ugrid' });
      mercs.forEach((m, i) => {
        const d = UNITS[m.type];
        const err = Game.canRecruit(P, n, m.type, scene.recruitTo, true);
        mg.appendChild(h('button', { class: 'ubtn merc' + (err ? ' blocked' : '') + (sel && sel.merc && sel.idx === i ? ' picked' : ''), title: err || '', onclick: () => { scene.recPick = { key: pickKey, type: m.type, merc: true, idx: i, count: 1 }; Sheets.render(); } },
          icon(UNIT_ICON[m.type]), h('span', { class: 'nm' }, d.name, ' ', '★'.repeat(m.exp)), h('span', { class: 'cost' }, icon('gold'), Game.recruitCost(m.type, true)),
          err && err !== 'الذهب لا يكفي' ? h('span', { class: 'why' }, err) : null));
      });
      sec.appendChild(mg);
    }
    if (sel) sec.appendChild(this.recruitConfirm(scene, n, sel));
    const und = Game.undoable(P).filter((x) => x.node === n.id);
    if (und.length) {
      sec.appendChild(h('div', { class: 'undo-row' }, h('span', { class: 'small muted' }, 'تجنيد هذا الدور، قابل للتراجع ما دام لم يتحرك أو يقاتل:'),
        und.slice(-4).map((x) => h('button', { class: 'chip', onclick: () => { const e = Game.undoRecruit(P, x.rid); UI.toast(e || `أُلغي تجنيد ${UNITS[x.type].name}: عاد ${x.cost} ذهباً و${x.men} رجل`); scene.afterAction(n); } }, icon('undo'), `ألغِ ${UNITS[x.type].name}`))));
    }
    sec.appendChild(h('details', { class: 'hint' }, h('summary', null, 'ما الذي يهزم ماذا؟'),
      [...RECRUITABLE, UNIQUE_OF[P]].filter(Boolean).map((t) => h('p', null, h('b', null, UNITS[t].name + ': '), UNITS[t].desc))));
    return sec;
  },

  // معاينة التجنيد وتأكيده
  recruitConfirm(scene, n, sel) {
    const P = scene.P, d = UNITS[sel.type];
    const a = Game.targetArmy(P, n, scene.recruitTo);
    const cost = Game.recruitCost(sel.type, sel.merc);
    const upkeep = Math.round((d.upkeep || 0) * (sel.merc ? 1.8 : 1));
    const slots = a ? MAX_REGS - a.regs.length : 0;
    const maxN = sel.merc ? Math.min(1, slots) : Math.max(0, Math.min(slots, Math.floor(n.manpower / d.men), Math.floor(Game.f(P).gold / cost)));
    const count = clamp(sel.count || 1, 1, Math.max(1, maxN));
    const err = Game.canRecruit(P, n, sel.type, scene.recruitTo, sel.merc);
    const pv = Game.commitPreview(P, cost * count, upkeep * count);
    const box = h('div', { class: 'box decide recruit-pv' },
      h('div', { class: 'sec-h' }, icon(UNIT_ICON[sel.type]), sel.merc ? `مرتزقة ${d.name}` : d.name, h('span', { class: 'muted' }, a ? `إلى ${Game.armyGen(a).name} (${a.regs.length}/${MAX_REGS})` : '')),
      h('p', { class: 'small' }, d.desc),
      !sel.merc && maxN > 1 ? h('div', { class: 'stepper' },
        h('button', { class: 'step', disabled: count <= 1, onclick: () => { sel.count = count - 1; Sheets.render(); } }, icon('minus')),
        h('b', null, count),
        h('button', { class: 'step', disabled: count >= maxN, onclick: () => { sel.count = count + 1; Sheets.render(); } }, icon('plus')),
        h('span', { class: 'muted small' }, `حتى ${maxN}`)) : null,
      EconUI.lines([
        ['الكلفة الآن (مرة واحدة)', `${cost * count} ذهباً`],
        ['الصيانة (كل دور)', `${upkeep * count} ذهباً`],
        sel.merc ? ['القوى البشرية', 'لا تحتاج'] : ['من القوى البشرية', `${d.men * count} من ${Math.floor(n.manpower)}`],
        ...EconUI.commitLines(pv),
      ]),
      h('div', { class: 'row-btns' },
        ib('men', err ? err : `جنّد ${count > 1 ? count + ' وحدات' : 'وحدة'} (${cost * count})`, {
          class: 'btn primary', disabled: !!err || !maxN, onclick: (e) => {
            e.currentTarget.disabled = true;
            if (sel.merc) { const r = Game.hireMerc(P, n, sel.idx, scene.recruitTo); UI.toast(r || `انضم مرتزقة ${d.name}`); if (!r && Game.track) Game.track('merc'); }
            else { const r = Game.recruitMany(P, n, sel.type, scene.recruitTo, count); UI.toast(r.done ? `جُنّدت ${r.done} ${d.name}` : r.err); if (r.done && Game.track) Game.track('recruit'); }
            scene.recPick = null; scene.afterAction(n);
          },
        }),
        h('button', { class: 'btn ghost', onclick: () => { scene.recPick = null; Sheets.render(); } }, 'إلغاء الاختيار')),
    );
    requestAnimationFrame(() => { if (box.isConnected) box.scrollIntoView({ block: 'nearest' }); });
    return box;
  },

  // --- التطوير ---
  buildSection(scene, n) {
    const P = scene.P;
    const sec = h('div', { class: 'section' });
    if (Game.devFocus && Game.devFocus(P) !== 'manual') sec.appendChild(h('p', { class: 'hint' }, icon('scroll'), ` التطوير التلقائي مفعّل (${DEV_FOCUS[Game.devFocus(P)].name})، يمكنك البناء يدوياً أيضاً.`));
    const grid = h('div', { class: 'bgrid' });
    for (const k of Object.keys(BUILDINGS)) {
      const B = BUILDINGS[k], lvl = n[k] || 0;
      if (B.coastal && !Game.hasWater(n)) continue;
      const err = Game.canBuild(P, n, k);
      const done = lvl >= B.max;
      grid.appendChild(h('button', {
        class: 'ubtn' + (done ? ' done' : '') + (err && !done ? ' blocked' : ''), disabled: done, title: err || B.desc,
        onclick: () => EconUI.buildPreview(scene, n, k),
      },
        icon(B.icon), h('span', { class: 'nm' }, B.name), h('span', { class: 'lvl' }, [...Array(B.max)].map((_, i) => h('i', { class: i < lvl ? 'on' : '' }))),
        done ? h('span', { class: 'lv' }, 'مكتمل') : h('span', { class: 'cost' }, icon('gold'), B.cost(lvl)),
        err && !done && err !== 'الذهب لا يكفي' ? h('span', { class: 'why' }, err) : null,
      ));
    }
    const ferr = Game.canFestival(P, n);
    grid.appendChild(h('button', { class: 'ubtn', disabled: !!ferr, title: ferr || '', onclick: () => { const e = Game.festival(P, n); if (!e && Game.track) Game.track('festival'); UI.toast(e || 'أقيمت الاحتفالات'); scene.afterAction(n); } },
      icon('lantern'), h('span', { class: 'nm' }, 'احتفالات'), h('span', { class: 'lv' }, '+20 ولاء'), h('span', { class: 'cost' }, icon('gold'), Game.festivalCost(n))));
    sec.appendChild(grid);
    sec.appendChild(h('div', { class: 'row-btns' }, ib('coins', 'قارن فرص التطوير في كل المدن', { class: 'btn', onclick: () => EconUI.investTable(scene) })));
    sec.appendChild(h('p', { class: 'hint' }, 'اضغط أي مبنى لترى أثره قبل البناء: الدخل قبل وبعد، والاسترداد.'));
    return sec;
  },

  // ═══════════════ الحصار ═══════════════
  siegeSpec(scene, n) {
    const P = scene.P;
    const bf = () => (Game.besiegers(n.id)[0] || {}).fid;
    return {
      key: 'siege:' + n.id, icon: 'tent',
      get color() { const f = Game.f(bf()); return f ? f.color : '#c0392b'; },
      title: () => 'حصار ' + n.name,
      short: () => 'حصار ' + n.name,
      sub: () => { const f = bf(); return f ? [dotEl(Game.f(f).color), Game.fname(f), icon('chevL'), dotEl(Game.f(n.owner).color), Game.fname(n.owner)] : []; },
      status: () => `${Game.siegeTurns(n, bf())} أدوار · مؤن ${Math.max(0, n.stores)}`,
      alert: () => (n.owner === P && n.stores <= 1 ? 'crit' : false),
      valid: () => Game.besiegers(n.id).length > 0,
      render: (body) => this.siegeBody(scene, n, body),
    };
  },

  siegeBody(scene, n, body) {
    const P = scene.P;
    const bs = Game.besiegers(n.id);
    if (!bs.length) { body.appendChild(h('p', { class: 'hint' }, 'انتهى الحصار.')); return; }
    const sFid = bs[0].fid;
    const mine = sFid === P, ownCity = n.owner === P;
    const turns = Game.siegeTurns(n, sFid);
    const eq = Game.siegeEquip(n, sFid);
    const max = Game.storesMax(n);
    const know = mine || ownCity || Game.intelLevel(P, n.owner) >= 2;
    // من يحاصر من
    body.appendChild(h('div', { class: 'box siege' },
      h('div', { class: 'sec-h' }, dotEl(Game.f(sFid).color), Game.fname(sFid), h('span', { class: 'muted' }, 'تحاصر'), dotEl(Game.f(n.owner).color), n.name, h('span', { class: 'muted' }, `· منذ ${turns} أدوار`)),
      h('div', { class: 'progress' }, icon('granary'), h('span', { class: 'bar' }, h('i', { class: n.stores <= 1 ? 'bad' : '', style: { width: know ? clamp(Math.max(0, n.stores) / max, 0, 1) * 100 + '%' : '50%' } })),
        h('span', null, !know ? 'المؤن مجهولة' : n.stores < 0 ? 'مجاعة!' : `${n.stores} أدوار قبل المجاعة`)),
      h('div', { class: 'equip' },
        h('span', { class: eq.ram ? 'on' : '' }, icon('ram'), eq.ram ? 'كبش جاهز' : 'كبش بعد دور'),
        h('span', { class: eq.ladders ? 'on' : '' }, icon('ladder'), eq.ladders ? 'سلالم' : 'سلالم بعد دور'),
        h('span', { class: eq.tower ? 'on' : '' }, icon('tower'), eq.tower ? 'برج حصار' : `برج بعد ${Math.max(1, 2 - turns)} أدوار`),
        bs.some((b) => b.regs.some((r) => r.type === 'catapult')) ? h('span', { class: 'on' }, icon('catapult'), 'منجنيق') : null,
      ),
    ));
    // القوات
    const att = h('div', { class: 'section' }, h('div', { class: 'sec-h' }, icon('swords'), 'المحاصِرون', h('span', { class: 'muted' }, `${bs.length} ${bs.length === 1 ? 'جيش' : 'جيوش'}`)));
    for (const b of bs) att.appendChild(b.fid === P ? this.armyMini(scene, b) : this.foreignArmy(b));
    body.appendChild(att);
    const defs = Game.defendersOf(n);
    const dsec = h('div', { class: 'section' }, h('div', { class: 'sec-h' }, icon('shield'), 'المدافعون'));
    dsec.appendChild(h('div', { class: 'kv' },
      hstat('defense', WALL_NAMES[Math.min(4, n.walls)]),
      hstat('garrison', ownCity ? Game.menOf(n.garrison) : Game.estimate(P, n.owner, Game.menOf(n.garrison)).text),
    ));
    for (const d of defs) dsec.appendChild(d.fid === P ? this.armyMini(scene, d) : this.foreignArmy(d));
    body.appendChild(dsec);
    if (mine) {
      const enc = Game.makeEnc('assault', bs.filter((b) => b.fid === P), n.id);
      body.appendChild(powerCompare(enc, P));
      const canBreach = eq.ram || eq.ladders || bs.some((b) => b.regs.some((r) => r.type === 'catapult'));
      const lead = bs.find((b) => b.fid === P && b.mp > 0);
      body.appendChild(h('div', { class: 'row-btns' },
        ib('swords', !canBreach ? 'اقتحام (بعد دور)' : !lead ? 'استنفدت الجيوش حركتها' : 'اقتحام', { class: 'btn primary', disabled: !lead || !canBreach, onclick: async () => { await scene.runEnc(Game.makeEnc('assault', Game.besiegers(n.id).filter((b) => b.fid === P), n.id)); scene.afterAction(n); } }),
        (() => { const e0 = Game.makeEnc('assault', bs.filter((b) => b.fid === P), n.id); const lock = Game.surrenderLock(e0); const o = Game.surrenderOdds(e0); return ib('talk', lock ? 'طلب التسليم مؤجل' : `اطلب تسليم المدينة (نحو ${Math.round(o.p * 100)}٪)`, { class: 'btn', disabled: !!lock, title: lock || '', onclick: () => this.offerTerms(scene, n) }); })(),
        ib('retreat', 'رفع الحصار', { class: 'btn ghost', onclick: () => { for (const b of Game.besiegers(n.id).filter((x) => x.fid === P)) { Game.retreatHome(b, [], null, b.siege.from); b.mp = 0; } UI.toast('رُفع الحصار'); scene.afterAction(n); } }),
      ));
      body.appendChild(h('p', { class: 'hint' }, 'كل دور حصار تنقص مؤنهم وتكتمل معداتك. أرسل جيوشاً أخرى إلى هنا لتنضم للحصار.'));
    } else if (ownCity) {
      const inside = Game.defendersOf(n).filter((a) => a.fid === P && a.mp > 0);
      body.appendChild(h('div', { class: 'row-btns' },
        inside.length ? ib('charge', 'الخروج للقتال', { class: 'btn primary', onclick: async () => { await scene.runEnc(Game.makeEnc('sally', inside, n.id, bs.filter((b) => b.fid === sFid))); scene.afterAction(n); } }) : null,
        ib('gold', `فدية لرفع الحصار (${this.ransomCost(bs)})`, { class: 'btn', disabled: n.parley === Game.S.turn, onclick: () => this.payRansom(scene, n, bs) }),
      ));
      if (!inside.length) body.appendChild(h('p', { class: 'hint' }, 'لا جيش جاهز داخل المدينة. حرّك جيشاً مجاوراً إليها لفكّ الحصار.'));
    }
  },

  // خيار الحصار عند الوصول إلى مدينة مسوّرة
  siegeChoice(scene, a, n) {
    const hasCat = a.regs.some((r) => r.type === 'catapult');
    const eqNow = Game.hasTrait(a, 'siege');
    return UI.ask({
      title: `أسوار ${n.name}`, icon: 'castle',
      body: h('div', null,
        h('p', null, `${WALL_NAMES[Math.min(4, n.walls)]} · ${Game.fname(n.owner)}. ${eqNow ? 'مهندسك جاهز بالمعدات فوراً.' : ''}`),
        h('ul', { class: 'steps small' },
          h('li', null, h('b', null, 'التجويع: '), `مؤنهم ${Math.max(0, n.stores)} أدوار ثم المجاعة. بطيء لكنه بلا خسائر تقريباً.`),
          h('li', null, h('b', null, 'الكبش والسلالم: '), 'بعد دور. البرج بعد دورين: معبر آمن فوق السور.'),
          h('li', null, h('b', null, 'المنجنيق: '), 'يفتح ثغرات بلا انتظار.'),
        ),
        powerCompare(Game.makeEnc('assault', [a], n.id), scene.P),
      ),
      buttons: [
        { label: 'ضرب الحصار', icon: 'tent', value: 'siege', primary: true },
        { label: hasCat || eqNow ? 'حصار ثم اقتحام فوري' : 'اقتحام فوري (يحتاج منجنيق أو مهندساً)', icon: 'swords', value: 'assault', disabled: !(hasCat || eqNow) },
        { label: 'إلغاء', value: 'cancel' },
      ],
    });
  },

  ransomCost(bs) { return Math.round(bs.reduce((s, b) => s + Game.menOf(b.regs), 0) * 0.9 + 40); },
  payRansom(scene, n, bs) {
    const P = scene.P, f = Game.f(P), cost = this.ransomCost(bs);
    if (f.gold < cost) { UI.toast('الذهب لا يكفي'); return; }
    n.parley = Game.S.turn;
    const sFid = bs[0].fid;
    const ratio = bs.reduce((s, b) => s + Game.armyPower(b), 0) / Math.max(1, Game.defensePower(n));
    if (R() < (ratio < 2 ? 0.7 : 0.35) && !((Game.f(sFid).vendetta || {})[P] > 0)) {
      f.gold -= cost; Game.f(sFid).gold += cost;
      for (const b of bs) Game.retreatHome(b, [], null, b.siege.from);
      Game.addRel(P, sFid, 5);
      Game.event('pol', `${Game.fname(sFid)} تقبل فدية ${cost} ذهباً وترفع الحصار عن ${n.name}.`, { fids: [P, sFid], imp: 2 });
      UI.toast(`قبل ${Game.fname(sFid)} الفدية ورفع الحصار`);
    } else UI.toast(`رفض ${Game.fname(sFid)} الفدية!`);
    scene.afterAction(n);
  },
  offerTerms(scene, n) {
    const P = scene.P;
    const enc = Game.makeEnc('assault', Game.besiegers(n.id).filter((b) => b.fid === P), n.id);
    const o = Game.surrenderOdds(enc);
    const lock = Game.surrenderLock(enc);
    UI.modal({
      title: `طلب تسليم ${n.name}`, icon: 'talk',
      body: h('div', null,
        h('p', null, 'رسول إلى حامية المدينة: تُسلَّم المدينة وتخرج الحامية بسلاحها بممر آمن. هذا تسليم مدينة واحدة، أما استسلام المملكة كلها فبفرض التبعية من نافذة الممالك.'),
        EconUI.lines([...o.parts.map(([k, v]) => [k, typeof v === 'number' ? signed(v) + '٪' : v, typeof v === 'number' ? (v > 0 ? 'pos' : 'neg') : '']), ['فرصة القبول', `نحو ${Math.round(o.p * 100)}٪`, 'sum']]),
        h('p', { class: 'hint' }, lock || 'رمية واحدة: إن رفضوا لا يُعاد الطلب قبل الدور التالي بدورين، إلا إن جاعوا أو زادت قوتك الربع أو سقطت لهم مدينة.'),
      ),
      buttons: [
        { label: 'أرسل الرسول', primary: true, disabled: !!lock || o.p <= 0, onClick: () => {
          if (Game.track) Game.track('parley');
          const r = Game.demandSurrender(enc);
          if (r.ok) {
            UI.toast(`${n.name} تقبل الأمان وتفتح أبوابها. حاميتها تغادر بممر آمن.`);
            scene.busy = true;
            Game.surrenderAccepted(enc, 'surrender').then(() => { scene.busy = false; scene.afterAction(n); });
          } else { UI.toast(`رفض أهل ${n.name}. ${Game.surrenderLock(enc) || ''}`, 5000); scene.afterAction(n); }
        } },
        { label: 'إلغاء', ghost: true },
      ],
    });
  },

  confirmWarAttack(fid) {
    const P = Game.S.player;
    const st = Game.status(P, fid);
    const truce = (Game.f(P).truce[fid] || 0) > 0;
    const tr = Game.treaty(P, fid);
    const allies = Game.aliveMajors().filter((c) => c !== P && c !== fid && Game.status(fid, c) === 'alliance');
    const cons = [];
    if (st === 'alliance') cons.push('نقض حلف: سمعتك تنهار عند الجميع.');
    else if (truce) cons.push(`نقض عهد الصلح (باقٍ ${Game.f(P).truce[fid]} أدوار): −15 سمعة وغضب الممالك.`);
    if (tr.marriage) cons.push('خيانة المصاهرة: ضرر إضافي بالسمعة.');
    if (tr.trade) cons.push('تتوقف التجارة معها.');
    if (allies.length) cons.push(`حلفاؤها (${allies.map((c) => Game.fname(c)).join('، ')}) قد يدخلون الحرب ضدك.`);
    if (Game.isVassalOf && Game.isVassalOf(fid, P)) cons.push('إنها تابعة لك: الهجوم عليها يُسقط هيبتك عند كل التابعين.');
    return UI.ask({
      title: 'إعلان حرب', icon: 'swords',
      body: h('div', null,
        h('p', { class: 'lead warn' }, `هذا الهجوم سينهي حالة ${STATUS_NAME[st] || 'السلام'} ويبدأ حرباً مع ${Game.fname(fid)}.`),
        cons.length ? h('ul', { class: 'steps' }, cons.map((c) => h('li', null, c))) : h('p', { class: 'muted' }, 'لا معاهدة قائمة، فالعواقب محدودة.'),
      ),
      buttons: [{ label: 'أعلن الحرب وهاجم', value: true, danger: true }, { label: 'تراجع', value: false }],
    });
  },

  // ═══════════════ الممالك والدبلوماسية ═══════════════
  diploSpec(scene, focus) {
    if (focus) scene.diploOpen = focus;
    return {
      key: 'diplo', icon: 'treaty', title: () => 'الممالك', short: () => 'الممالك',
      sub: () => { const w = Game.aliveMajors().filter((c) => c !== scene.P && Game.atWar(scene.P, c)).length; return [w ? `في حرب مع ${w}` : 'لا حروب', ' · ', 'السمعة ', Math.round(Game.f(scene.P).rep)]; },
      status: () => { const w = Game.aliveMajors().filter((c) => c !== scene.P && Game.atWar(scene.P, c)).length; return w ? `${w} حروب` : 'سلام'; },
      alert: () => (Game.f(scene.P).allyCall ? 'imp' : false),
      render: (body) => this.diploBody(scene, body),
    };
  },

  diploBody(scene, body) {
    const P = scene.P;
    const myF = Game.f(P);
    const me = Game.factionPower(P);
    body.appendChild(h('div', { class: 'kv' }, hstat('rep', Math.round(myF.rep), { meter: myF.rep }), hstat('power', 'قوتك', { lines: () => [['تقدير', Math.round(me)]] })));
    const redo = () => { scene.refresh(); };
    for (const id of Game.majors()) {
      if (id === P) continue;
      const f = Game.f(id);
      if (!f.alive) continue;
      const st = Game.status(P, id);
      const rel = Game.rel(P, id);
      const pw = Game.factionPower(id);
      const lvl = Game.intelLevel(P, id);
      const cmp = lvl === 0 ? 'قوتها مجهولة' : pw > me * 1.6 ? 'أقوى منك بكثير' : pw > me * 1.15 ? 'أقوى منك' : pw > me * 0.85 ? 'نِدّ لك' : pw > me * 0.6 ? 'أضعف منك' : 'أضعف بكثير';
      const truce = myF.truce[id] || 0;
      const tr = Game.treaty(P, id);
      const open = scene.diploOpen === id;
      const tribs = Game.S.tributes.filter((t) => (t.payer === id && t.payee === P) || (t.payer === P && t.payee === id));
      const vass = Game.vassalLabel ? Game.vassalLabel(P, id) : null;
      const box = h('div', { class: 'realm' + (open ? ' open' : '') },
        h('button', { class: 'rhead', onclick: () => { scene.diploOpen = open ? null : id; Sheets.render(); } },
          dotEl(f.color), h('b', null, f.name), h('span', { class: 'pill ' + (vass ? 'vassal' : st) }, vass || STATUS_NAME[st]),
          h('span', { class: 'intel tag' }, icon('eye'), ['مجهول', 'تقديري', 'تقريبي', 'مؤكد'][lvl]),
          h('span', { class: 'sp' }), icon(open ? 'chevU' : 'chevD'),
        ),
        h('div', { class: 'rmeta' },
          h('span', null, 'العلاقة'), meter(rel + 100, 200), h('bdi', null, rel), ' · ', cmp, ' · ', Game.nodesOf(id).length, ' مدن',
          truce > 0 && st !== 'war' ? h('span', { class: 'tag' }, icon('hourglass'), `عهد ${truce}`) : null,
          tr.trade ? h('span', { class: 'tag good' }, icon('camel'), 'تجارة') : null,
          tr.marriage ? h('span', { class: 'tag good' }, icon('ring'), 'مصاهرة') : null,
          f.vendetta && f.vendetta[P] > 0 ? h('span', { class: 'tag bad' }, icon('drop'), 'ثأر') : null,
          tribs.map((t) => h('span', { class: 'tag warn' }, icon('gold'), t.payer === P ? `تدفع ${t.amount}` : `تقبض ${t.amount}`)),
          f.goals && lvl >= 2 && f.goals.target ? h('span', { class: 'tag' }, icon('target'), 'هدفها: ' + Game.node(f.goals.target).name) : null,
        ),
      );
      if (open) box.appendChild(this.realmActions(scene, id, redo));
      body.appendChild(box);
    }
    const dead = Game.majors().filter((id) => id !== P && !Game.f(id).alive);
    if (dead.length) body.appendChild(h('p', { class: 'hint' }, 'ممالك سقطت: ', dead.map((id) => Game.fname(id)).join('، ')));
    body.appendChild(h('p', { class: 'hint' }, 'الهدايا والتجارة والمصاهرة تبني العلاقة، والحدود المشتركة والخيانات تهدمها.'));
  },

  realmActions(scene, id, redo) {
    const P = scene.P, myF = Game.f(P), f = Game.f(id);
    const st = Game.status(P, id);
    const rel = Game.rel(P, id);
    const tr = Game.treaty(P, id);
    // أزرار نصية بلا أيقونات: الاسم وحده يكفي هنا
    const act = (ic, label, fn, dis, cls = '') => h('button', { class: 'chip ' + cls, disabled: dis, onclick: () => { fn(); if (Game.track) Game.track('diplo'); redo(); } }, label);
    const box = h('div', { class: 'acts' });
    box.append = (...k) => { for (const x of k) if (x) box.appendChild(x); };
    if (st === 'war') {
      box.append(
        act('dove', 'تفاوض على الصلح…', () => this.peaceDialog(scene, id)),
        act('scales', 'صلح وجزية سنوية منهم', () => {
          if (Game.aiWillPayTribute(id, P) && Game.peaceTerms(id, P, -60).ok) { Game.makePeace(P, id, 8); Game.addTribute(id, P, Game.tributeAmount(id), 6); UI.toast(`${f.name} تقبل الصلح وتدفع الجزية`); }
          else { Game.addRel(P, id, -3); UI.toast(`${f.name} ترفض: ما زالت ترى نفسها قوية`); }
        }),
        Game.demandVassal ? act('seal', 'استسلام المملكة: فرض التبعية', () => { const r = Game.demandVassal(P, id); UI.toast(r.ok ? `${f.name} تقبل أن تكون تابعة لك` : r.why); }) : null,
      );
    } else {
      box.append(act('gold', 'هدية 100', () => { myF.gold -= 100; f.gold += 100; Game.addRel(P, id, 14 * (1 - Math.max(0, rel) / 150)); UI.toast(`${f.name} تقبل هديتك`); }, myF.gold < 100));
      if (st === 'peace') box.append(act('treaty', 'عرض حلف', () => {
        if (Game.aiWillAlly(id, P)) { Game.makeAlliance(P, id); UI.toast(`تحالفت مع ${f.name}!`); }
        else { UI.toast(`${f.name} ترفض الحلف (تحتاج علاقة أفضل أو عدواً مشتركاً)`); Game.addRel(P, id, -2); }
      }));
      if (st === 'alliance') {
        box.append(act('coins', 'تمويل 150', () => { Game.subsidy(P, id, 150); UI.toast('وصلت الأموال'); }, myF.gold < 150));
        box.append(act('close', 'فضّ الحلف', () => { Game.breakAlliance(P, id, 'بقرار منك'); UI.toast('انتهى الحلف'); }, false, 'warn'));
      }
      box.append(tr.trade
        ? act('camel', 'إيقاف التجارة', () => Game.setTrade(P, id, false))
        : act('camel', 'اتفاق تجارة', () => { if (Game.aiWillTrade(id, P)) { Game.setTrade(P, id, true); UI.toast('بدأت القوافل'); } else UI.toast(`${f.name} ترفض التجارة`); }));
      if (!tr.marriage) box.append(act('ring', `مصاهرة ${Game.marriageCost()}`, () => { if (Game.aiWillMarry(id, P)) { Game.marry(P, id); UI.toast('تمّت المصاهرة'); } else UI.toast(`${f.name} ترفض المصاهرة الآن`); }, myF.gold < Game.marriageCost()));
      box.append(act('scales', 'طلب جزية', () => {
        if (Game.aiWillPayTribute(id, P)) { Game.addTribute(id, P, Game.tributeAmount(id), 8); UI.toast(`${f.name} تقبل دفع الجزية`); }
        else { Game.addRel(P, id, -20); Game.event('pol', `${f.name} ترفض دفع الجزية لـ${myF.name}.`, { fids: [P, id], imp: 2 }); UI.toast(`${f.name} ترفض بازدراء`); }
      }));
      box.append(h('button', { class: 'chip warn', onclick: () => this.confirmWarAttack(id).then((ok) => { if (ok) { Game.declareWar(P, id, 'بقرار منك'); redo(); } }) }, 'إعلان الحرب'));
    }
    if (Game.isVassalOf && Game.isVassalOf(P, id)) box.append(h('button', { class: 'chip warn', onclick: () => { Game.freeVassal(P, 'إعلان الاستقلال'); UI.toast('أعلنت استقلالك: إنها الحرب'); redo(); } }, 'إعلان الاستقلال'));
    if (Game.isVassalOf && Game.isVassalOf(id, P)) box.append(h('span', { class: 'lbl' }, `تابعة لك: تدفع ${Math.max(0, Math.round(Game.economy(id).gold * 0.15))} كل دور`));
    if (myF.allyCall && myF.allyCall.enemy === id && !Game.atWar(P, id)) {
      box.append(act('bell', 'لبِّ نداء الحليف', () => { Game.declareWar(P, id, 'نصرةً لحليفها'); Game.addRel(P, myF.allyCall.ally, 15); myF.allyCall = null; }, false, 'on'));
    }
    box.append(h('span', { class: 'lbl' }, 'الجواسيس: مهمة واحدة كل دور'));
    const serr = Game.canSpy(P, id, 'scout');
    box.append(h('button', { class: 'chip', disabled: !!serr, title: serr || SPY.scout.desc, onclick: () => { const r = Game.spy(P, id, 'scout'); if (Game.track && !r.err) Game.track('spy'); UI.toast(r.err || r.text); redo(); } }, `استطلاع البلاط (${SPY.scout.cost})`));
    box.append(h('button', { class: 'chip', onclick: () => this.spyDialog(scene, id) }, 'عمليات في مدنها…'));
    return box;
  },

  // عمليات الجواسيس: المدينة يختارها اللاعب، والأثر والمدة والفرصة معلنة
  spyDialog(scene, id) {
    const P = scene.P, f = Game.f(id);
    let close = null;
    const list = h('div', { class: 'spy-list' });
    for (const t of Game.spyTargets(P, id)) {
      const n = t.n;
      const active = (n.ops || []).filter((o) => o.until >= Game.S.turn && o.by === P).map((o) => `${SPY_OPS[o.k].name} حتى الدور ${o.until + 1}`);
      const row = h('div', { class: 'spy-city' + (t.ok ? '' : ' dim') },
        h('div', { class: 'sc-h' }, dotEl(f.color), h('b', null, n.name), h('span', { class: 'muted small' }, `${t.why} · الولاء ${Game.intelLevel(P, id) >= 2 || t.ok ? n.loyalty : '؟'}`), active.length ? h('span', { class: 'tag warn' }, active.join('، ')) : null));
      if (t.ok) {
        const ops = h('div', { class: 'choice compact' });
        for (const [k, op] of Object.entries(SPY_OPS)) {
          const err = Game.canSpyOp(P, id, n.id, k);
          const ch = Game.spyChance(P, n, k);
          ops.appendChild(h('button', { disabled: !!err, title: err || '', onclick: () => { const r = Game.spyOp(P, id, n.id, k); UI.toast(r.err || r.text, 5000); if (close) close(); scene.afterAction(n); } },
            h('b', null, op.name, h('span', { class: 'cost' }, iv('gold', op.cost))),
            h('span', null, `${op.what(Game.spyMagnitude(n, k))}. النجاح نحو ${Math.round(ch.p * 100)}٪ (${ch.parts.map(([a, v]) => `${a} ${a === 'الأساس' ? v : signed(v)}`).join('، ')}). الانكشاف نحو ${Math.round(op.catch * 100)}٪ ويزيد عند الفشل.`),
            err ? h('span', { class: 'risk' }, err) : null));
        }
        row.appendChild(ops);
      }
      list.appendChild(row);
    }
    close = UI.modal({
      title: `عمليات في ${f.name}`, icon: 'eye', cls: 'wide',
      body: h('div', null, h('p', { class: 'hint' }, 'اختر المدينة والعملية. النجاح يغيّر حال المدينة فعلاً وينتهي أثره في موعده، والعملية نفسها لا تتكرر على المدينة قبل انتهائها. الانكشاف وحده يضر علاقتك وسمعتك.'), list),
      buttons: [{ label: 'إغلاق', ghost: true }],
    });
  },

  // التفاوض على الصلح: المبلغ واتجاهه يحددهما اللاعب، والرد ثابت بأسبابه
  peaceDialog(scene, id) {
    const P = scene.P, f = Game.f(id), me = Game.f(P);
    const lvl = Game.intelLevel(P, id);
    let dir = 'pay', amt = 0, close = null;
    const maxPay = Math.max(0, Math.floor(me.gold / 10) * 10);
    const maxAsk = Math.max(0, Math.floor(Math.max(0, f.gold) / 10) * 10);
    const out = h('div', { class: 'peace-out' });
    const range = h('input', { type: 'range', min: 0, max: maxPay, step: 10, value: 0 });
    const num = h('input', { type: 'number', min: 0, max: maxPay, step: 10, value: 0, inputmode: 'numeric', class: 'num' });
    const btn = h('button', { class: 'btn primary' }, 'أرسل العرض');
    const upd = () => {
      const max = dir === 'pay' ? maxPay : maxAsk;
      range.max = max; num.max = max;
      amt = clamp(Math.round(+num.value || 0), 0, max);
      const signedAmt = dir === 'pay' ? amt : -amt;
      const t = Game.peaceTerms(id, P, signedAmt);
      out.innerHTML = '';
      const verdict = t.ok ? 'تقبل هذا العرض' : t.hard ? 'ترفض أي صلح الآن' : 'ترفض هذا العرض';
      out.append(...[
        h('p', { class: 'lead ' + (t.ok ? 'good' : 'warn') }, `${f.name} ${verdict}.`),
        t.parts && lvl >= 2 ? EconUI.lines([...t.parts.map(([k, v]) => [k, signed(v), v > 0 ? 'pos' : 'neg']), ['المطلوب للقبول', `أكثر من ${t.need}`, 'sum'], ['حسابك الآن', Math.round(t.score), t.ok ? 'pos' : 'neg']]) : t.parts ? h('p', { class: 'hint' }, 'معرفتك بها تقديرية: الأسباب الدقيقة مجهولة. التجارة أو الاستطلاع يكشفانها.') : null,
        !t.hard && !t.ok && dir === 'pay' && t.minPay != null ? h('p', { class: 'small' }, lvl >= 2 ? `أقل مبلغ تقبله الآن: ${t.minPay} ذهباً${t.minPay > maxPay ? ' (أكثر مما تملك)' : ''}.` : `تحتاج مبلغاً أكبر، ربما بين ${Math.round(t.minPay * 0.7 / 10) * 10} و${Math.round(t.minPay * 1.3 / 10) * 10}.`) : null,
        !t.hard && t.ok && dir === 'ask' && lvl >= 2 && t.maxAsk != null ? h('p', { class: 'small' }, `أقصى ما قد تدفعه الآن نحو ${Math.min(t.maxAsk, maxAsk)}.`) : null,
        t.why && t.why.length ? h('ul', { class: 'steps small' }, t.why.map((w) => h('li', null, w))) : null,
      ].filter(Boolean));
      btn.disabled = !t.ok || (dir === 'pay' && amt > me.gold);
      btn.textContent = dir === 'pay' ? (amt ? `صالح وادفع ${amt}` : 'صالح بلا مال') : `صالح واقبض ${amt}`;
    };
    const setDir = (d) => { dir = d; num.value = 0; range.value = 0; seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.d === d)); upd(); };
    const seg = h('div', { class: 'seg' }, h('button', { class: 'on', 'data-d': 'pay', onclick: () => setDir('pay') }, 'تدفع أنت'), h('button', { 'data-d': 'ask', onclick: () => setDir('ask') }, 'تطلب منها'));
    range.addEventListener('input', () => { num.value = range.value; upd(); });
    num.addEventListener('input', () => { range.value = num.value; upd(); });
    btn.onclick = () => {
      btn.disabled = true;
      const r = Game.offerPeace(P, id, dir === 'pay' ? amt : -amt);
      if (Game.track) Game.track('diplo:peace');
      UI.toast(r.ok ? `${f.name} تقبل الصلح` : `${f.name} ترفض: ${(r.why || [])[0] || 'العرض لا يكفي'}`);
      if (close) close();
      scene.afterAction();
    };
    close = UI.modal({
      title: `الصلح مع ${f.name}`, icon: 'dove',
      body: h('div', null, seg, h('div', { class: 'amount-row' }, range, num), out,
        h('p', { class: 'hint' }, 'الرد محسوب من حال الحرب الآن، لا بالحظ: العرض نفسه يلقى الجواب نفسه. المال يرجّح القبول ولا يمحو الثأر.')),
      buttons: [{ label: 'إغلاق', ghost: true }],
    });
    close.box = out.parentElement;
    out.parentElement.appendChild(h('div', { class: 'row-btns' }, btn));
    upd();
  },


  // ═══════════════ المملكة ═══════════════
  kingdomSpec(scene, tab) {
    if (tab) scene.kingTab = tab;
    const F = Game.f(scene.P);
    return {
      key: 'kingdom', icon: 'crown', color: F.color,
      title: () => `مملكة ${F.name}`, short: () => F.name,
      sub: () => [Game.nodesOf(scene.P).length, ' مدن · ', Game.armiesOf(scene.P).length, ' جيوش'],
      status: () => `${Game.nodesOf(scene.P).length} مدن`,
      alert: () => (Game.captivesHeldBy(scene.P).some((g) => !g.prompted) ? 'imp' : false),
      render: (body) => this.kingdomBody(scene, body),
    };
  },

  kingdomBody(scene, body) {
    const P = scene.P, F = Game.f(P);
    const tab = scene.kingTab || (Game.objectivesOf ? 'goals' : 'gens');
    const seg = h('div', { class: 'seg' });
    const tabs = [Game.objectivesOf ? ['goals', 'target', 'الأهداف'] : null, ['gens', 'helmet', 'القادة'], ['capt', 'chains', `الأسرى ${Game.captivesHeldBy(P).length || ''}`], ['policy', 'scales', 'السياسة']].filter(Boolean);
    for (const [k, ic, name] of tabs) seg.appendChild(h('button', { class: k === tab ? 'on' : '', onclick: () => { scene.kingTab = k; Sheets.render(); } }, icon(ic), name));
    body.appendChild(seg);
    if (tab === 'goals' && Game.objectivesOf) { this.goalsTab(scene, body); return; }
    if (tab === 'gens') {
      if (Game.rulerOf) body.appendChild(this.throneBox(scene));
      const groups = [['army', 'في الميدان'], ['gov', 'حكّام المدن'], ['pool', 'في البلاط (متاحون)'], ['captive', 'أسرى لدى العدو'], ['dead', 'الراحلون']];
      for (const [st, name] of groups) {
        const gs = Game.gensOf(P).filter((g) => g.status === st && !(st === 'pool' && g.name.startsWith('الضابط')));
        if (!gs.length) continue;
        body.appendChild(h('div', { class: 'sec-h' }, name, h('span', { class: 'muted' }, gs.length)));
        const list = h('div', { class: 'glist' });
        for (const g of gs) {
          let extra = null;
          if (st === 'army') { const a = Game.army(g.army); extra = a ? h('button', { class: 'chip', onclick: () => { scene.openArmy(a); } }, icon('castle'), Game.node(a.node).name, ` · ${a.regs.length} وحدات`) : null; }
          if (st === 'gov') extra = h('div', { class: 'row-btns' }, h('span', { class: 'small' }, icon('castle'), ' ', Game.node(g.city).name), h('button', { class: 'chip', onclick: () => { Game.recallGovernor(g); scene.afterAction(); } }, 'استدعاء'));
          if (st === 'captive') extra = h('p', { class: 'small warn' }, `أسير لدى ${Game.fname(g.captor)}، فديته نحو ${Game.ransomPrice(g)}`);
          list.appendChild(this.genCard(g, extra));
        }
        body.appendChild(list);
      }
      body.appendChild(h('p', { class: 'hint' }, 'يرتقي القادة بالمعارك (★). الرواتب تُدفع لقادة الميدان والحكّام.'));
    } else if (tab === 'capt') {
      const cs = Game.captivesHeldBy(P);
      if (!cs.length) body.appendChild(h('p', { class: 'hint' }, 'لا أسرى لديك. يقع القادة في الأسر حين تُباد جيوشهم أو يسقط حرسهم.'));
      for (const g of cs) body.appendChild(h('div', { class: 'acard' }, this.genCard(g, h('p', { class: 'small' }, `من ${Game.fname(g.fid)} · أسير منذ ${Game.S.turn - g.since} أدوار`)), ib('scales', 'قرّر مصيره', { class: 'btn', onclick: () => this.captiveDialog(scene, g) })));
    } else {
      body.appendChild(h('div', { class: 'sec-h' }, icon('scales'), 'الضرائب'));
      const row = h('div', { class: 'row-btns' });
      for (const [k, tx] of Object.entries(TAXES)) row.appendChild(h('button', { class: 'chip' + (F.tax === k ? ' on' : ''), onclick: () => { F.tax = k; if (Game.track) Game.track('policy'); scene.refresh(); } }, `${tx.name}: دخل ×${tx.income}، ولاء ${signed(tx.loyalty)}`));
      body.appendChild(row);
      if (Game.devFocus) this.policyExtras(scene, body);
      body.appendChild(h('div', { class: 'sec-h' }, icon('gold'), 'الخزينة'));
      body.appendChild(EconUI.lines(Game.treasuryLines(P)));
      const cities = Game.nodesOf(P).length;
      body.appendChild(h('p', { class: 'hint' }, cities > 8
        ? `الهدر الإداري: مملكتك ${cities} مدن، فتضيع ${Math.round(Math.min(0.4, 0.03 * (cities - 8)) * 100)}٪ من دخل كل مدينة (3٪ لكل مدينة بعد الثامنة). الحاكم المقيم يخفّضه للنصف في مدينته، والتابعون لا يُحسبون.`
        : 'كل جيش زائد عن عدد مدنك يكلّف 10 كل دور. بعد المدينة الثامنة يبدأ هدر إداري يخفض دخل كل المدن.'));
      body.appendChild(h('div', { class: 'row-btns' }, ib('coins', 'فرص التطوير', { class: 'btn', onclick: () => EconUI.investTable(scene) }), Game.S.route ? ib('camel', 'طريق القوافل', { class: 'btn', onclick: () => scene.openRoute() }) : null));
    }
  },

  captiveDialog(scene, g) {
    const P = scene.P, owner = Game.f(g.fid);
    const alive = owner && owner.alive;
    const price = Game.ransomPrice(g);
    const mineHeld = alive ? Game.captivesHeldBy(g.fid).filter((x) => x.fid === P) : [];
    const chance = Math.round(Game.recruitChance(g, P) * 100);
    const done = (kind) => { if (Game.track) Game.track('captive:' + kind); scene.afterAction(); };
    UI.modal({
      title: `مصير ${g.name}`, icon: 'chains',
      body: h('div', null,
        this.genCard(g),
        h('p', null, `قائد من ${Game.fname(g.fid)}${alive ? '' : ' (مملكة سقطت)'}.`),
        h('ul', { class: 'steps small' },
          h('li', null, h('b', null, 'إطلاق السراح: '), 'علاقة وسمعة أفضل، لكنه يعود ليقاتلك.'),
          alive ? h('li', null, h('b', null, `فدية (${price}): `), 'قد تدفع مملكته إن كان ثميناً.') : null,
          mineHeld.length ? h('li', null, h('b', null, 'تبادل: '), `مقابل ${mineHeld[0].name} الأسير عندهم.`) : null,
          h('li', null, h('b', null, `ضمّه (${chance}٪): `), 'إن رفض يبقى أسيراً.'),
          h('li', null, h('b', null, 'النفي: '), 'يختفي من الحرب دون دم.'),
          h('li', { class: 'warn' }, h('b', null, 'الإعدام: '), 'يزول خطره نهائياً، لكن: −15 سمعة، ثأر وعداوة، غضب حلفائها، وقد ينهض ابنه يطلب الانتقام.'),
        ),
      ),
      buttons: [
        { label: 'إطلاق السراح', onClick: () => { Game.releaseCaptive(g, P); done('release'); } },
        alive ? { label: `فدية ${price}`, icon: 'gold', onClick: () => { const o = Game.f(g.fid); if (o.gold >= price && (g.rank >= 2 || R() < 0.6) && !(o.vendetta && o.vendetta[P])) { Game.ransomCaptive(g, P, price); UI.toast(`دفعت ${o.name} الفدية`); } else UI.toast(`${o.name} ترفض الدفع الآن`); done('ransom'); } } : null,
        mineHeld.length ? { label: `تبادل مع ${mineHeld[0].name}`, onClick: () => { if (R() < 0.8) { Game.exchangeCaptives(g, mineHeld[0]); UI.toast('تم التبادل'); } else UI.toast('رفضوا التبادل'); done('exchange'); } } : null,
        { label: `ضمّه (${chance}٪)`, onClick: () => { UI.toast(Game.tryRecruitCaptive(g, P) ? `${g.name} ينضم إليك!` : `${g.name} يرفض خدمتك`); done('recruit'); } },
        { label: 'نفي', onClick: () => { Game.exileCaptive(g, P); done('exile'); } },
        { label: 'إعدام', danger: true, icon: 'skull', onClick: () => this.confirmExecute(scene, g) },
        { label: 'إبقاؤه أسيراً', ghost: true },
      ],
    });
  },
  confirmExecute(scene, g) {
    UI.modal({
      title: 'هل أنت متأكد؟', icon: 'skull',
      body: h('p', { class: 'lead warn' }, `إعدام ${g.name} قرار لا رجعة فيه، وسيذكره التاريخ.`),
      buttons: [
        { label: 'نفّذ الإعدام', danger: true, onClick: () => { Game.executeCaptive(g, Game.S.player); if (Game.track) Game.track('captive:execute'); scene.afterAction(); } },
        { label: 'تراجع', onClick: () => this.captiveDialog(scene, g) },
      ],
    });
  },
  captivePrompts(scene) {
    const P = scene.P;
    const fresh = Game.captivesHeldBy(P).filter((g) => !g.prompted);
    if (!fresh.length || UI.anyModal()) return;
    const g = fresh[0];
    g.prompted = true;
    UI.modal({
      title: 'أسرى!', icon: 'chains',
      body: h('div', null, h('p', { class: 'lead' }, `وقع ${g.name} (${Game.fname(g.fid)}) في أسرك.`), this.genCard(g)),
      buttons: [{ label: 'قرّر مصيره الآن', primary: true, onClick: () => this.captiveDialog(scene, g) }, { label: 'لاحقاً' }],
    });
  },

  // ═══════════════ السجل التاريخي ═══════════════
  chronSpec(scene, tab) {
    if (tab) scene.chronTab = tab;
    return {
      key: 'chron', icon: 'book', title: () => 'السجل التاريخي', short: () => 'السجل',
      sub: () => [Game.sc.name, ' · ', Game.chapter ? Game.chapter().name : `${Game.year()}م`],
      status: () => `${Game.year()}م`,
      render: (body) => this.chronBody(scene, body),
    };
  },
  chronBody(scene, body) {
    const P = scene.P;
    const tab = scene.chronTab || 'realm';
    const seg = h('div', { class: 'seg' });
    for (const [k, ic, name] of [['realm', 'crown', 'مملكتي'], ['world', 'map', 'العالم'], ['news', 'bell', 'الأخبار'], ['log', 'scroll', 'الأحداث']]) seg.appendChild(h('button', { class: k === tab ? 'on' : '', onclick: () => { scene.chronTab = k; Sheets.render(); } }, icon(ic), name));
    body.appendChild(seg);
    if (tab === 'news') {
      const box = h('div', { class: 'log' });
      for (const e of Game.alertHistory().slice(0, 80)) box.appendChild(h('button', { class: `log-item news ${e.level}`, onclick: () => { const n = e.node && Game.node(e.node); if (n) { scene.flyTo(n.x, n.y); scene.openCity(n); } } }, h('span', { class: 'muted small' }, `الدور ${e.turn + 1} · `), e.text));
      if (!box.children.length) box.appendChild(h('p', { class: 'hint' }, 'لا أخبار بعد.'));
      body.appendChild(h('p', { class: 'hint' }, 'كل التنبيهات التي وصلتك، حتى المغلقة منها. إغلاق الأخبار لا يتخذ أي قرار.'));
      body.appendChild(box);
      return;
    }
    if (tab === 'log') {
      const logs = Game.S.log.slice(-160).filter((e) => Game.eventVisible(e)).reverse();
      const box = h('div', { class: 'log' });
      for (const e of logs) box.appendChild(h('div', { class: `log-item ${e.cat} imp${e.imp}${e.fids.includes(P) ? ' mine' : ''}` }, h('span', { class: 'muted small' }, `${SEASONS[e.turn % 4]} ${Game.sc.startYear + Math.floor(e.turn / 4)} · `), e.text));
      if (!logs.length) box.appendChild(h('p', { class: 'hint' }, 'لا أحداث بعد.'));
      body.appendChild(box);
      return;
    }
    if (tab === 'world' && Game.visibleCrises) {
      const cs = Game.visibleCrises(P);
      if (cs.length) {
        body.appendChild(h('div', { class: 'sec-h' }, hstat('crisis', 'أحداث جارية', { label: '' })));
        body.appendChild(h('div', { class: 'crisis-list' }, cs.map((c) => h('button', { class: 'crisis-row' + (c.ask[P] ? ' ask' : '') + (c.over ? ' over' : ''), onclick: () => this.openCrisis(scene, c) },
          icon(CRISES[c.type].icon), h('b', null, Game.crisisTitle(c)), h('span', { class: 'muted small' }, c.ask[P] ? 'قرار مطلوب' : Game.crisisStatus(c))))));
      }
      if (Game.S.route) body.appendChild(h('div', { class: 'row-btns' }, hstat('route', `${Game.S.route.name} ${Game.S.route.dead ? '(متوقف)' : Math.round(Game.routeHealth() * 100) + '٪'}`, { icon: 'camel', label: '' }), ib('camel', 'تفاصيل الطريق', { class: 'chip', onclick: () => scene.openRoute() })));
    }
    const list = (Game.S.chron || []).filter((e) => (tab === 'realm' ? e.fids.includes(P) : e.imp >= 2)).slice().reverse();
    const box = h('div', { class: 'chron' });
    let year = null;
    for (const e of list) {
      const y = Game.sc.startYear + Math.floor(e.turn / 4);
      if (y !== year) { year = y; box.appendChild(h('div', { class: 'chron-year' }, `سنة ${y}م`)); }
      const item = h('div', { class: 'chron-item' + (e.fids.includes(P) ? ' mine' : '') }, icon(e.icon || 'scroll'),
        h('div', null, h('p', null, e.text), h('span', { class: 'when' }, SEASONS[e.turn % 4]),
          e.story ? h('details', null, h('summary', { class: 'small muted' }, 'قصة المعركة'), h('div', { class: 'story' }, e.story)) : null));
      box.appendChild(item);
    }
    if (!list.length) box.appendChild(h('p', { class: 'hint' }, 'لم يُكتب شيء بعد. التاريخ يُصنع الآن.'));
    body.appendChild(box);
  },



  devReport() {
    const a = Game.analytics();
    UI.modal({ title: 'تحليلات المطوّر', icon: 'info', cls: 'wide', body: h('pre', { class: 'dev' }, JSON.stringify(a, null, 1)), buttons: [{ label: 'إغلاق', primary: true }] });
  },
  // ═══════════════ طريق القوافل ═══════════════
  routeSpec(scene) {
    return {
      key: 'route', icon: 'camel', color: '#b8862a',
      title: () => (Game.S.route ? Game.S.route.name : 'طريق القوافل'),
      short: () => 'القوافل',
      sub: () => { const r = Game.S.route; return r ? [r.dead ? 'متوقف' : `سالك ${Math.round(Game.routeHealth() * 100)}٪`, ' · ', 'دخلك ', Game.routeIncome(scene.P), '/دور'] : []; },
      status: () => { const r = Game.S.route; return !r ? '' : r.dead ? 'متوقف' : `${Math.round(Game.routeHealth() * 100)}٪`; },
      alert: () => { const r = Game.S.route; return r && (r.dead || Game.routeHealth() < 0.5) && r.path.some((id) => Game.node(id).owner === scene.P) ? 'imp' : false; },
      valid: () => !!Game.S.route,
      render: (body) => this.routeBody(scene, body),
    };
  },
  routeBody(scene, body) {
    const P = scene.P, r = Game.S.route;
    if (!r) { body.appendChild(h('p', { class: 'hint' }, 'لا طريق قوافل في هذه الحملة.')); return; }
    const mine = r.path.filter((id) => Game.node(id).owner === P);
    const now = Game.routeIncome(P), full = Game.routeIncome(P, true);
    body.appendChild(h('p', { class: 'lead small' }, 'طريق تجارة دائم وليس رحلة واحدة: كل مدينة تملكها عليه تكسب ذهباً في كل دور ما دام الطريق سالكاً. الحروب والحصار والحجر تقطع مقاطعه.'));
    const race = Game.S.crises.find((c) => !c.over && c.type === 'route');
    body.appendChild(EconUI.lines([
      ['الحالة', r.dead ? `متوقف منذ الدور ${(r.deadSince != null ? r.deadSince : Game.S.turn) + 1}` : Game.routeRamp() < 1 ? `القوافل تعود بنصف حجمها حتى الدور ${r.rampUntil + 1}` : `سالك ${Math.round(Game.routeHealth() * 100)}٪`, r.dead ? 'neg' : ''],
      ['مدنك على الطريق', mine.length ? mine.map((id) => Game.node(id).name).join('، ') : 'لا شيء'],
      ['دخلك منه الآن', `${now} كل دور`, now ? 'pos' : ''],
      ['دخلك لو كان سالكاً كله', `${full} كل دور`, ''],
    ]));
    body.appendChild(h('div', { class: 'sec-h' }, icon('road'), 'المقاطع'));
    const segs = h('div', { class: 'crisis-list' });
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1], A = Game.node(a), B = Game.node(b);
      const bl = Game.routeBlock(a, b), det = Game.routeDetour(a, b);
      const down = r.down && r.down[a + '|' + b];
      const opts = bl && !r.dead ? Game.routeDetourOptions(a, b) : [];
      const val = Game.routeSegValue(a, b);
      segs.appendChild(h('div', { class: 'crisis-row seg' + (bl && !val ? ' ask' : '') },
        icon(bl ? (val ? 'road' : 'close') : 'check'), h('b', null, `${A.name} ← ${B.name}`),
        h('span', { class: 'muted small' }, bl ? `${bl.why}${down ? ` منذ الدور ${down.since + 1}` : ''}${det ? ` · تحويلة عبر ${Game.node(det.via).name} حتى الدور ${det.until + 1}` : ''}` : 'سالك'),
        bl && !det ? h('span', { class: 'small' }, `العلاج: ${bl.fix}`) : null,
        opts.length && mine.length && !det ? h('div', { class: 'row-btns' }, opts.slice(0, 2).map((via) => h('button', { class: 'chip', disabled: Game.f(P).gold < Game.routeDetourCost(), onclick: () => { const e = Game.setRouteDetour(P, a, b, via); UI.toast(e || `القوافل تمر عبر ${Game.node(via).name} ستة أدوار`); scene.afterAction(); } }, icon('camel'), `حوّلها عبر ${Game.node(via).name} (${Game.routeDetourCost()})`))) : null,
      ));
    }
    body.appendChild(segs);
    if (r.dead) {
      const err = Game.canResumeRoute(P);
      body.appendChild(h('div', { class: 'box decide' },
        h('div', { class: 'sec-h' }, icon('camel'), 'استئناف القوافل'),
        h('p', { class: 'small' }, race ? 'التجار يتسابقون على طريق بديل: الاستثمار في نافذة الحدث يرجّح الطريق الذي تريده. الطريق المقطوع لا يُختار.' : 'إن بقيت المقاطع سالكة دورين تعود القوافل وحدها، بنصف حجمها ثلاثة أدوار.'),
        h('div', { class: 'row-btns' },
          ib('gold', err && err !== 'الذهب لا يكفي' ? err : `موّل العودة الآن (${Game.routeResumeCost()})`, { class: 'btn', disabled: !!err, onclick: () => { const e = Game.resumeRoute(P); UI.toast(e || 'عادت القوافل إلى الطريق'); scene.afterAction(); } }),
          race ? ib('warning', 'نافذة السباق', { class: 'btn', onclick: () => this.openCrisis(scene, race) }) : null)));
    }
    body.appendChild(h('p', { class: 'hint' }, 'التحويلة تكلّف 120 وتُبقي المقطع مفتوحاً بأربعة أخماس دخله ستة أدوار، إن وُجدت مدينة سالكة بين طرفيه. القافلة المنقطعة لا تعود بلا ثمن.'));
  },

  // ═══════════════ الأهداف والفصول ═══════════════
  goalsTab(scene, body) {
    const P = scene.P;
    const ch = Game.chapter();
    if (ch) body.appendChild(h('div', { class: 'box chapter' }, h('div', { class: 'sec-h' }, hstat('chapter', ch.name, { label: '' })), h('p', { class: 'small' }, ch.desc)));
    body.appendChild(h('p', { class: 'hint' }, 'يكفي تحقيق هدف واحد للنصر. اختر الطريق الذي يناسب مملكتك.'));
    for (const o of Game.objectivesOf(P)) {
      const pct = clamp(o.have / Math.max(1, o.need), 0, 1) * 100;
      body.appendChild(h('div', { class: 'goal' + (o.done ? ' done' : '') },
        h('div', { class: 'gh' }, icon(o.icon), h('b', null, o.name), h('span', { class: 'sp' }), h('bdi', { class: 'muted small' }, `${o.have}/${o.need}`)),
        h('span', { class: 'bar' }, h('i', { style: { width: pct + '%' } })),
        h('p', { class: 'small' }, o.desc, o.sub ? `، ${o.sub}` : '', o.hold ? ` (متتالية: ${o.hold})` : ''),
        o.nodes ? h('div', { class: 'row-btns wrap' }, o.nodes.map((id) => { const n = Game.node(id); return h('button', { class: 'chip' + (n.owner === P ? ' on' : ''), onclick: () => scene.flyTo(n.x, n.y) }, dotEl(Game.f(n.owner).color), n.name); })) : null));
    }
    const vs = Game.vassalsOf(P);
    if (vs.length) body.appendChild(h('p', { class: 'hint' }, icon('seal'), ' تابعوك: ', vs.map((v) => Game.fname(v)).join('، '), '، يدفعون 15٪ من دخلهم ويقاتلون في حروبك.'));
  },
  policyExtras(scene, body) {
    const P = scene.P, F = Game.f(P);
    body.appendChild(h('div', { class: 'sec-h' }, icon('hammer'), 'توجّه التطوير'));
    const row = h('div', { class: 'row-btns wrap' });
    for (const [k, d] of Object.entries(DEV_FOCUS)) row.appendChild(h('button', { class: 'chip' + (Game.devFocus(P) === k ? ' on' : ''), title: d.desc, onclick: () => { F.dev = k; if (Game.track) Game.track('policy'); Sheets.render(); } }, icon(d.icon), d.name));
    body.appendChild(row);
    body.appendChild(h('p', { class: 'hint' }, Game.devFocus(P) === 'manual' ? 'تبني بنفسك. المدن التي لها حاكم تتطور وحدها.' : `${DEV_FOCUS[Game.devFocus(P)].desc} بناء واحد كل دور، ولا يُمس احتياطي ${Game.devReserve(P)} ذهباً.`));
    body.appendChild(h('div', { class: 'sec-h' }, icon('scroll'), 'المرسوم الملكي'));
    const er = h('div', { class: 'choice' });
    for (const [k, d] of Object.entries(EDICTS)) {
      const on = Game.edictOf(P) === k;
      er.appendChild(h('button', { class: on ? 'on' : '', disabled: on, onclick: () => { const e = Game.setEdict(P, k); UI.toast(e || `صدر مرسوم «${d.name}»`); if (!e && Game.track) Game.track('policy'); scene.refresh(); Sheets.render(); } },
        h('b', null, icon(d.icon), d.name, on ? h('span', { class: 'cost' }, 'نافذ') : h('span', { class: 'cost' }, iv('gold', 100))), h('span', null, d.desc)));
    }
    body.appendChild(er);
  },

  // ═══════════════ أحداث العالم ═══════════════
  crisisSpec(scene, c) {
    const d = CRISES[c.type];
    return {
      key: 'crisis:' + c.id, icon: d.icon, color: '#9a3a26',
      title: () => Game.crisisTitle(c),
      short: () => Game.crisisShort(c),
      sub: () => [icon('hourglass'), Game.crisisStatus(c)],
      status: () => (c.ask[scene.P] ? 'قرار مطلوب' : Game.crisisStatus(c)),
      alert: () => { const q = c.ask[scene.P]; return q ? (q.urgent ? 'crit' : 'imp') : false; },
      valid: () => Game.S.crises.includes(c) && Game.crisisKnown(c, scene.P) > 0,
      render: (body) => this.crisisBody(scene, c, body),
    };
  },
  openCrisis(scene, c) {
    Sheets.open(this.crisisSpec(scene, c));
    const n = c.node && Game.node(c.node);
    if (n) scene.flyTo(n.x, n.y);
  },
  optBtn(o, onPick) {
    return h('button', { disabled: o.dis, title: o.why || '', onclick: onPick },
      h('b', null, icon(o.icon || 'chevL'), o.label, o.gold ? h('span', { class: 'cost' }, iv('gold', o.gold)) : null, o.food ? h('span', { class: 'cost' }, iv('food', o.food)) : null),
      h('span', null, o.desc || '', o.risk ? h('span', { class: 'risk' }, ' الخطر: ' + o.risk) : null, o.why ? h('span', { class: 'risk' }, ` (${o.why})`) : null));
  },
  crisisBody(scene, c, body) {
    const P = scene.P;
    const why = CRISIS_WHY[c.type];
    if (why) body.appendChild(h('p', { class: 'lead small' }, why));
    const q = c.ask[P];
    if (q && !c.over) {
      const opts = Game.crisisOpts(c, P, q.key, q.data);
      const left = q.until - Game.S.turn + 1;
      const def = opts.find((o) => o.k === q.def);
      body.appendChild(h('div', { class: 'box decide' + (q.urgent ? ' urgent' : '') },
        h('div', { class: 'sec-h' }, icon('warning'), q.title, h('span', { class: 'muted' }, left > 1 ? `أمامك ${left} أدوار` : 'قرّر هذا الدور')),
        h('div', { class: 'choice' }, opts.map((o) => this.optBtn(o, () => { Game.crisisDecide(c, P, q.key, o.k, q.data); scene.afterAction(); Sheets.render(); }))),
        def ? h('p', { class: 'hint' }, `إن لم تقرر: «${def.label}».`) : null));
    }
    const acts = c.over ? [] : Game.crisisActions(c, P);
    if (acts.length) {
      body.appendChild(h('div', { class: 'sec-h' }, icon('hammer'), 'ما تستطيع فعله الآن'));
      body.appendChild(h('div', { class: 'choice' }, acts.map((o) => this.optBtn(o, () => { const e = Game.crisisAct(c, P, o.k, o.node); if (e) UI.toast(e); scene.afterAction(); Sheets.render(); }))));
    }
    const places = [...new Set([c.node, ...(c.type === 'plague' ? Object.keys(c.v.inf) : c.type === 'famine' ? c.v.region : c.type === 'uprising' ? c.v.cities : [])].filter((id) => id && Game.node(id)))].slice(0, 8);
    if (places.length) body.appendChild(h('div', { class: 'row-btns wrap' }, places.map((id) => { const n = Game.node(id); return h('button', { class: 'chip', onclick: () => { scene.selNode = n; scene.flyTo(n.x, n.y); } }, dotEl(Game.f(n.owner).color), n.name); })));
    body.appendChild(h('div', { class: 'sec-h' }, icon('scroll'), 'ما جرى حتى الآن'));
    const tl = h('div', { class: 'ctl' });
    for (const l of c.log.slice().reverse()) tl.appendChild(h('div', { class: 'ctl-i' }, h('span', { class: 'when' }, WX.when(l.turn)), h('p', null, l.text)));
    if (!c.log.length) tl.appendChild(h('p', { class: 'hint' }, 'لم يتضح شيء بعد.'));
    body.appendChild(tl);
    if (c.over) body.appendChild(h('p', { class: 'hint' }, icon('check'), ' انتهى هذا الحدث، وبقي في السجل التاريخي.'));
  },
  // القرارات العاجلة فقط تظهر فوراً؛ الباقي تنبيه في الشريط
  async pendingDecisions(scene) {
    const P = scene.P;
    for (const c of Game.S.crises) {
      const q = c.ask[P];
      if (!q || !q.urgent || q.shown || c.over) continue;
      q.shown = true;
      await this.decisionModal(scene, c, q);
      if (Game.S.over) return;
    }
  },
  decisionModal(scene, c, q) {
    return new Promise((resolve) => {
      const P = scene.P;
      const opts = Game.crisisOpts(c, P, q.key, q.data);
      const last = c.log.slice(-2).map((l) => l.text).join(' ');
      let close = null;
      const done = () => { resolve(); };
      const box = h('div', { class: 'choice' }, opts.map((o) => this.optBtn(o, () => { if (close) close(); Game.crisisDecide(c, P, q.key, o.k, q.data); scene.afterAction(); done(); })));
      const n = q.node || c.node;
      close = UI.modal({
        title: q.title, icon: CRISES[c.type].icon, cls: 'wide',
        body: h('div', null, last ? h('p', { class: 'lead' }, last) : null, box, h('p', { class: 'hint' }, 'يمكنك التأجيل والقرار من نافذة الحدث قبل نهاية الدور.')),
        buttons: [
          n ? { label: 'انظر إلى الخريطة', icon: 'map', ghost: true, onClick: () => { const nn = Game.node(n); if (nn) scene.flyTo(nn.x, nn.y); this.openCrisis(scene, c); done(); } } : null,
          { label: 'لاحقاً', ghost: true, onClick: () => { this.openCrisis(scene, c); done(); } },
        ].filter(Boolean),
        dismissable: false,
      });
    });
  },
  // مختصر العرش في شاشة المملكة
  throneBox(scene) {
    const P = scene.P, F = Game.f(P);
    const r = Game.rulerOf(P);
    const heir = Game.gen(F.heir);
    const box = h('div', { class: 'box throne' });
    if (r) {
      const fx = Game.rulerFxText(r);
      box.appendChild(h('div', { class: 'sec-h' }, icon('crown'), hstat('ruler', `${r.name} · ${Game.ageOf(r)} سنة`, { label: 'الحاكم' }),
        r.status === 'army' ? h('span', { class: 'tag warn' }, icon('swords'), 'في الميدان') : r.status === 'captive' ? h('span', { class: 'tag bad' }, icon('chains'), 'أسير') : null));
      if (fx.length) box.appendChild(h('p', { class: 'small' }, 'أثره: ', fx.join(' · ')));
      if (r.status === 'army') box.appendChild(h('p', { class: 'hint warn' }, 'الحاكم يرفع معنويات جيشه، لكنه قد يُقتل أو يؤسر فيهتز العرش.'));
    }
    box.appendChild(h('div', { class: 'row-btns' },
      h('span', { class: 'small' }, icon('seal'), ' ولي العهد: ', heir && heir.fid === P ? h('b', null, heir.name) : h('b', { class: 'warn' }, 'لم يُسمَّ')),
      h('button', { class: 'chip', onclick: () => this.heirPicker(scene) }, icon('crown'), heir ? 'تغيير' : 'سمِّ وريثاً')));
    return box;
  },
  heirPicker(scene) {
    const P = scene.P;
    const cands = Game.heirCandidates(P).slice(0, 6);
    let close = null;
    const list = h('div', { class: 'glist' });
    for (const g of cands) {
      const hurt = Game.passedOver(P, g).map((x) => x.name);
      const fx = Game.rulerFxText(g);
      list.appendChild(h('button', { class: 'gpick', onclick: () => { Game.setHeir(P, g); if (Game.track) Game.track('heir'); if (close) close(); scene.afterAction(); Sheets.render(); } },
        this.genCard(g, h('div', null, fx.length ? h('p', { class: 'small' }, 'حاكماً: ', fx.join(' · ')) : h('p', { class: 'small muted' }, 'حاكماً: بلا أثر خاص'),
          hurt.length ? h('p', { class: 'small warn' }, 'سيغضب: ', hurt.join('، ')) : null))));
    }
    if (!cands.length) list.appendChild(h('p', { class: 'hint' }, 'لا قادة يصلحون للعهد.'));
    close = UI.modal({ title: 'ولي العهد', icon: 'crown', cls: 'wide', body: h('div', null, h('p', { class: 'hint' }, 'سمة الوريث تصبح أثراً على المملكة كلها. القادة الأعلى رتبة الذين تتخطاهم يغضبون.'), list), buttons: [{ label: 'إغلاق', ghost: true }] });
  },

  // ═══════════════ القائمة والحفظ ═══════════════
  menu(scene) {
    UI.modal({
      title: 'القائمة', icon: 'menu',
      body: h('p', { class: 'muted' }, `${Game.sc.name} · ${Game.fname(scene.P)} · ${DIFFS[Game.S.difficulty].name}. تُحفظ اللعبة تلقائياً بعد كل إجراء.`),
      buttons: [
        { label: 'حفظ / تحميل', onClick: () => this.saves(scene) },
        { label: 'دليل الحرب', onClick: () => showGuide() },
        /[?&]dev\b/.test(location.search) ? { label: 'تحليلات المطوّر', onClick: () => this.devReport() } : null,
        { label: 'القائمة الرئيسية', onClick: () => { Game.save(); showMainMenu(); } },
        { label: 'متابعة', primary: true },
      ],
      dismissable: true,
    });
  },
  saves(scene) {
    const list = h('div', { class: 'glist' });
    let close;
    for (const { slot, data } of Game.listSaves()) {
      const m = data && data.meta;
      const label = slot === 'auto' ? 'الحفظ التلقائي' : `الخانة ${slot}`;
      const desc = m ? `${SCENARIOS[m.scenario].name} · ${m.fname} · ${SEASONS[m.turn % 4]} ${SCENARIOS[m.scenario].startYear + Math.floor(m.turn / 4)}م${m.time ? ' · ' + new Date(m.time).toLocaleDateString('ar-EG-u-nu-latn') : ''}` : 'فارغة';
      list.appendChild(h('div', { class: 'save-row' },
        h('div', null, h('b', null, label), h('p', { class: 'small muted' }, desc)),
        h('div', { class: 'row-btns' },
          scene && slot !== 'auto' ? h('button', { class: 'chip', onclick: () => { Game.save(slot); UI.toast('حُفظت في ' + label); close(); this.saves(scene); } }, 'احفظ هنا') : null,
          m ? h('button', { class: 'chip', onclick: () => { close(); if (Game.load(slot)) { UI.toast('تم التحميل'); startCampaign(); } else UI.toast('تعذّر التحميل'); } }, 'حمّل') : null,
        ),
      ));
    }
    close = UI.modal({ title: 'حفظ وتحميل', icon: 'scroll', body: list, buttons: [{ label: 'إغلاق' }], dismissable: true });
  },

  intro(scene) {
    const f = Game.f(scene.P);
    UI.modal({
      title: `${Game.sc.name} · ${f.name}`, icon: 'flag',
      body: h('div', null,
        h('p', { class: 'lead' }, Game.sc.intro),
        h('ul', { class: 'steps' },
          h('li', null, 'اضغط راية جيشك ثم مدينة مضيئة للتحرك. الرقم فوقها كلفة الحركة.'),
          h('li', null, 'اضغط أي رقم في النوافذ لتعرف ما يعنيه وما يرفعه ويخفضه.'),
          h('li', null, 'صغّر النوافذ بزر التصغير فتبقى بطاقة في الشريط السفلي تعود إليها متى شئت.'),
          h('li', null, 'التنبيهات العسكرية تظهر يساراً، اضغطها لتنتقل إلى الحدث.'),
          h('li', null, 'التاريخ لا ينتظرك: أزمات كبرى تلوح في الأفق، وعلاماتها تسبقها.'),
        ),
        Game.objectivesOf ? h('p', { class: 'hint' }, 'أهدافك تجدها في نافذة المملكة، النصر ليس بالضرورة احتلال الخريطة كلها.') : null,
      ),
      buttons: [{ label: 'إلى الحرب', primary: true }],
    });
  },

  showEnd(scene) {
    const win = Game.S.over === 'win';
    Game.save();
    const why = Game.S.overWhy || (win ? `بعد ${Game.S.turn} دوراً من الحرب والدهاء، دانت لك البلاد.` : 'ضاعت آخر مدنك. سيذكر التاريخ أنك قاتلت.');
    UI.modal({
      title: win ? 'نصر خالد!' : 'سقطت مملكتك', icon: win ? 'laurel' : 'crownbroken', cls: win ? 'win' : 'lose',
      body: h('div', null, h('p', { class: 'lead' }, why), h('p', { class: 'hint' }, 'سجلك التاريخي محفوظ في كتاب الحملة.')),
      buttons: [
        { label: 'اقرأ السجل', onClick: () => { scene.openChron('realm'); } },
        win && !Game.S.endless ? { label: 'تابع الحكم', onClick: () => { Game.S.over = null; Game.S.endless = true; Game.save(); scene.refresh(); } } : null,
        { label: 'القائمة الرئيسية', primary: true, onClick: () => { Game.clearSave(); showMainMenu(); } },
      ],
    });
  },

  // ═══════════════ قرارات أثناء أدوار الآخرين ═══════════════
  proposal(p) {
    const f = Game.f(p.from);
    const P = Game.S.player;
    const text = {
      peace: `${f.name} تعرض الصلح${p.tribute ? ` وتدفع ${p.tribute} ذهباً تعويضاً` : ''}.`,
      tribute: `${f.name} تطالبك بجزية ${p.amount} ذهباً كل دور لمدة 8 أدوار، وتلوّح بالحرب إن رفضت.`,
      alliance: `${f.name} تعرض عليك حلفاً${Game.dominant() && Game.dominant() !== P ? ' ضد المملكة المتعاظمة' : ' ضد أعدائكما'}.`,
      trade: `${f.name} تقترح اتفاق تجارة: دخل إضافي للطرفين ومعرفة أفضل ببعضكما.`,
      marriage: `${f.name} تعرض مصاهرة سياسية بين البيتين: عهد طويل وعلاقة متينة.`,
      ransom: p.gen ? `${f.name} تعرض إطلاق قائدك ${p.gen.name} مقابل فدية ${p.price} ذهباً.` : '',
      exchange: p.gen ? `${f.name} تعرض تبادل قائدك ${p.gen.name} بقائدها ${p.theirs.name} الأسير عندك.` : '',
      surrender: p.node ? `${f.name} تعرض على أهل ${p.node.name} الجائعين الأمان: تُسلَّم المدينة وتخرج حاميتك وجيشك بممر آمن.` : '',
      vassal: `${f.name} تطالبك بالخضوع: تصبح تابعاً لها، تدفع جزية وتقاتل في حروبها، أو تواجه جيوشها.`,
    }[p.kind];
    const payLabel = { tribute: 'ادفع', ransom: 'ادفع الفدية', surrender: 'سلّم المدينة', vassal: 'اخضع' }[p.kind] || 'اقبل';
    const cant = (p.kind === 'tribute' && Game.f(P).gold < p.amount) || (p.kind === 'ransom' && Game.f(P).gold < p.price);
    return UI.ask({
      title: 'رسول من ' + f.name, icon: 'treaty',
      body: h('div', null, h('p', { class: 'lead' }, text), p.kind === 'tribute' ? h('p', { class: 'hint' }, 'الرفض قد يعني الحرب. القبول يستنزف خزينتك لكنه يشتري الوقت.') : null),
      buttons: [{ label: payLabel, value: true, primary: true, disabled: cant }, { label: 'ارفض', value: false }],
    });
  },

  occupation(node, how) {
    return UI.ask({
      title: `دخلتَ ${node.name}`, icon: 'flag',
      body: h('div', null,
        h('p', { class: 'lead' }, how === 'surrender' ? 'فتحت المدينة أبوابها. كيف تعامل أهلها؟' : 'سقطت المدينة. كيف تعامل أهلها؟'),
        h('ul', { class: 'steps' },
          h('li', null, h('b', null, 'الضمّ: '), 'ولاء متوسط واضطراب 4 أدوار.'),
          h('li', null, h('b', null, 'النهب: '), `غنيمة نحو ${Math.round(node.pop / 55)} ذهباً الآن، لكن السكان يقلّون والولاء ينهار والسمعة تتضرر، وتبقى آثار النهب.`),
          h('li', null, h('b', null, 'الأمان: '), 'ولاء عالٍ واضطراب أقصر وسمعة أفضل، يكلّف 50.'),
        ),
      ),
      buttons: [
        { label: 'ضمّ المدينة', value: 'occupy', primary: true },
        { label: 'نهب', value: 'sack', danger: true, icon: 'fire' },
        { label: 'إعلان الأمان', value: 'clemency', icon: 'dove' },
      ],
    });
  },

  encounter(scene, enc) {
    return new Promise((resolve) => {
      const P = Game.S.player;
      const attacking = enc.attFid === P;
      const s = Game.encSides(enc);
      const node = s.node;
      const sideBox = (label, fid, regs, gens) => {
        const known = fid === P || Game.intelLevel(P, fid) >= 2;
        return h('div', { class: 'enc-side' },
          h('div', { class: 'enc-h' }, dotEl(Game.f(fid).color), h('b', null, label)),
          gens.length ? gens.map((g) => h('div', { class: 'gline' }, h('b', null, g.name), stars(g.rank), traitChip(g))) : h('div', { class: 'muted small' }, 'بلا قائد'),
          known ? unitSummary(regs) : h('p', { class: 'hint' }, `${regs.length} وحدات تقريباً`),
          h('div', { class: 'small' }, known ? `${Game.menOf(regs) + gens.reduce((t, g) => t + Game.genMen(g), 0)} رجل` : `نحو ${Game.estimate(P, fid, Game.menOf(regs)).text} رجل`),
          (() => { const arm = fid === enc.attFid ? s.attArmies : s.defArmies; const c = Game.condOf(arm); return known && arm.length ? h('div', { class: 'small muted' }, `إرهاق ${Math.round(c.fat)}٪ · معنويات ${signed(Math.round(c.mor))}`) : null; })(),
        );
      };
      const title = enc.type === 'assault' ? (enc.kind === 'siege' ? `اقتحام ${node.name}` : `معركة ${node.name}`) : (enc.type === 'sally' ? `الخروج من ${node.name}` : `فكّ حصار ${node.name}`);
      const lead = attacking ? '' : `${Game.fname(enc.attFid)} ${enc.type === 'assault' ? 'تهاجم' : 'تهاجم جيشك عند'} ${node.name}!`;
      const terr = enc.terrain || node.terrain;
      const info = [];
      if (enc.kind === 'siege') {
        const eq = enc.equip || {};
        info.push(WALL_NAMES[Math.min(4, node.walls)], [eq.tower && 'برج حصار', eq.ram && 'كبش', eq.ladders && 'سلالم'].filter(Boolean).join(' و') || 'بلا معدات حصار');
        if (node.stores < 0) info.push('المدافعون جائعون');
      }
      let closeFn = null;
      const fight = () => { if (closeFn) closeFn(); if (Game.track) Game.track('battle:lead'); launchBattle(enc, resolve); };
      const auto = () => {
        if (closeFn) closeFn();
        this.intentPicker((intent) => {
          if (!intent) { this.encounter(scene, enc).then(resolve); return; }
          enc.intent = intent;
          if (Game.track) Game.track('battle:auto:' + intent);
          const out = Game.autoResolve(enc);
          this.autoResult(enc, out, () => resolve(out));
        });
      };
      const buttons = [
        { label: attacking ? 'قُد المعركة' : 'قُد الدفاع', icon: 'swords', primary: true, onClick: fight },
        { label: 'حسم سريع', icon: 'fast', onClick: auto },
      ];
      if (attacking) {
        buttons.push({ label: 'تفاوض', icon: 'talk', keep: true, onClick: (close) => { close(); this.negotiate(scene, enc, resolve); } });
        buttons.push({ label: enc.kind === 'siege' ? 'لاحقاً' : 'تراجع', onClick: () => resolve('cancel') });
      } else if (enc.type === 'assault' && enc.kind === 'siege') {
        const cost = Math.round(Game.menOf(s.attRegs) * 1.1 + 40);
        buttons.push({
          label: `فدية ${cost}`, icon: 'gold', disabled: Game.f(P).gold < cost, keep: true, onClick: (close) => {
            if (R() < 0.5 && !((Game.f(enc.attFid).vendetta || {})[P] > 0)) {
              close(); Game.f(P).gold -= cost; Game.f(enc.attFid).gold += cost;
              for (const id of enc.att) { const a = Game.army(id); if (a) Game.retreatHome(a, [], null, a.siege ? a.siege.from : a.from); }
              UI.toast('قبل العدو الفدية وانسحب'); resolve('settled');
            } else UI.toast('رفض العدو الفدية! لا بدّ من القتال');
          },
        });
      }
      closeFn = UI.modal({
        title, icon: 'swords', cls: 'wide',
        body: h('div', null,
          lead ? h('p', { class: 'lead warn' }, lead) : null,
          h('p', { class: 'terrain-tip' }, icon(TERRAIN[terr].icon), h('span', null, h('b', null, TERRAIN[terr].name + ': '), TERRAIN_TIPS[terr])),
          info.length ? h('p', { class: 'hint' }, info.join(' · ')) : null,
          h('div', { class: 'enc-sides' },
            sideBox(attacking ? 'جيشك' : Game.fname(enc.attFid), enc.attFid, s.attRegs, s.attGens),
            h('div', { class: 'vs' }, icon('swords')),
            sideBox(attacking ? Game.fname(enc.defFid) : 'المدافعون', enc.defFid, s.defRegs, s.defGens),
          ),
          powerCompare(enc, P),
        ),
        buttons,
      });
    });
  },

  negotiate(scene, enc, resolve) {
    const P = Game.S.player;
    const cost = Game.bribeCost(enc);
    const back = () => this.encounter(scene, enc).then(resolve);
    const o = Game.surrenderOdds(enc);
    const lock = Game.surrenderLock(enc);
    const city = enc.type === 'assault';
    UI.modal({
      title: 'التفاوض', icon: 'talk',
      body: h('div', null,
        h('p', null, city ? 'أرسل رسولاً إلى المدينة:' : 'أرسل رسولاً إلى جيش العدو:'),
        h('ul', { class: 'steps' },
          h('li', null, h('b', null, city ? 'طلب تسليم المدينة: ' : 'طلب الانسحاب: '), lock || `فرصة القبول نحو ${Math.round(o.p * 100)}٪. رمية واحدة، وبعد الرفض يُؤجَّل الطلب.`),
          h('li', null, h('b', null, `شراء الولاء (${cost}): `), 'الشجعان والصامدون يرفضون غالباً، والطمّاعون يقبلون.'),
        ),
      ),
      buttons: [
        {
          label: city ? 'اطلب التسليم' : 'اطلب الانسحاب', primary: true, disabled: !!lock || o.p <= 0, onClick: async () => {
            if (Game.track) Game.track('parley');
            const r = Game.demandSurrender(enc);
            if (r.ok) { UI.toast('قبلوا!'); await Game.surrenderAccepted(enc, 'surrender'); resolve('settled'); }
            else { Game.addRel(P, enc.defFid, -3); UI.toast('رفضوا بإباء: لا مفرّ من القتال الآن'); back(); }
          },
        },
        {
          label: `رشوة ${cost}`, icon: 'gold', disabled: Game.f(P).gold < cost || enc.bribed, onClick: async () => {
            enc.bribed = true;
            if (Game.tryBribe(enc)) { Game.f(P).gold -= cost; UI.toast('نجحت الرشوة!'); await Game.surrenderAccepted(enc, 'surrender'); resolve('settled'); }
            else { Game.f(P).gold -= Math.round(cost * 0.3); UI.toast('خدعوا رسولك وأخذوا بعض الذهب!'); back(); }
          },
        },
        { label: 'عودة', onClick: back },
      ],
    });
  },

  // نية القائد في الحسم السريع: المحرك نفسه يختار الخطة والأوامر وفقها
  intentPicker(cb) {
    UI.modal({
      title: 'حسم سريع', icon: 'fast',
      body: h('div', null, h('p', null, 'المعركة نفسها تجري بالمحرك نفسه، وقائدك يختار الخطة والأوامر حسب نيتك:'),
        h('ul', { class: 'steps small' },
          h('li', null, h('b', null, 'اقتحام: '), 'خطط هجومية، مطاردة المنهزم، والاحتياط لكسر أضعف قطاعات العدو.'),
          h('li', null, h('b', null, 'متوازن: '), 'خطة تناسب الأرض والجيش، والاحتياط لإنقاذ القطاع المترنح.'),
          h('li', null, h('b', null, 'حذر: '), 'خطط دفاعية، بلا مطاردة، وانسحاب منظم إن مالت الكفة بشدة.'))),
      buttons: [
        { label: 'اقتحام', icon: 'charge', onClick: () => cb('bold') },
        { label: 'متوازن', icon: 'scales', primary: true, onClick: () => cb('steady') },
        { label: 'حذر', icon: 'shield', onClick: () => cb('careful') },
        { label: 'رجوع', ghost: true, onClick: () => cb(null) },
      ],
    });
  },
  autoResult(enc, out, cb) {
    const P = Game.S.player;
    const side = enc.attFid === P ? 0 : 1;
    const mine = side === out.winner;
    const me = out.report && typeof BattleReport !== 'undefined' ? BattleReport.mine(out.report, side) : null;
    const lost = Object.entries(out.fates || {}).filter(([, f]) => f !== 'ok').map(([id, fate]) => `${Game.gen(id).name}: ${fate === 'captured' ? 'أُسر' : 'قُتل'}`);
    UI.modal({
      title: me ? `${me.text} ${me.sub}` : mine ? 'نصر' : 'هزيمة', icon: mine ? 'laurel' : 'crownbroken', cls: (mine ? 'win' : 'lose') + (out.report ? ' wide' : ''),
      body: h('div', null,
        me ? BattleReport.render(out.report, side, { head: false }) : h('p', { class: 'lead' }, mine ? 'حُسمت المعركة لصالحك.' : 'دارت الدائرة على جيشك.'),
        lost.length ? h('p', { class: 'warn small' }, lost.join(' · ')) : null),
      buttons: [{ label: 'متابعة', primary: true, onClick: cb }],
    });
  },
};

const CRISIS_WHY = {
  horde: 'جيش من السهوب يقترب على مراحل. كل مرحلة فرصة: تجسس، تحصّن، ادفع، أو وجّهه نحو غيرك.',
  migration: 'قوم يبحثون عن أرض: رجال وخيل لمن يؤويهم، وسيف لمن يردّهم.',
  plague: 'العدوى تنتقل على الطرق ومع الجيوش. الحجر يوقفها لكنه يقطع الدخل والتجارة.',
  famine: 'الحقول تجف: المدن تجوع والولاء ينهار. المخازن والتجارة تنقذ الموقف، والجار الجائع ضعيف.',
  succession: 'العرش يهتز. الوريث وولاء القادة الكبار يحددان ما سيحدث.',
  rebel: 'قائد يطمح إلى أكثر من القيادة. كل مرحلة تقربه من التمرد بجيشه ومدنه.',
  coalition: 'الممالك تتحالف ضد الأقوى: تنازل، أو مال، أو حرب على أكثر من جبهة.',
  freecity: 'مدينة غنية تريد حكماً ذاتياً: دخل أقل وولاء أكبر، أو خطر الاستقلال.',
  uprising: 'دعوة تنتشر في المدن الساخطة: العطاء، أو القمع، أو استمالة الزعيم.',
  star: 'موهبة نادرة تبحث عن سيد. من يدفع أكثر يكسبها، ومن لا يدفع قد يواجهها.',
  route: 'القوافل تبحث عن طريق. من يستثمر يربح ذهب التجارة لسنوات.',
};
Game.openCrisis = (scene, a) => { const c = Game.crisisById(a.crisis); if (c) Panels.openCrisis(scene, c); };
Game.pendingDecisions = (scene) => Panels.pendingDecisions(scene);
Game.crisesAt = (id) => Game.visibleCrises(Game.S.player).filter((c) => !c.over && (c.node === id || (c.type === 'plague' && c.v.inf[id]) || (c.type === 'famine' && c.v.region.includes(id)) || (c.type === 'uprising' && c.v.cities.includes(id))));
