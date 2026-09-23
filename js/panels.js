'use strict';
// لوحات الحملة ونوافذها

const TERRAIN_TIPS = {
  plains: 'أرض مكشوفة: الخيالة في أفضل حالاتها، والرماة بلا غطاء.',
  forest: 'غابات: تحجب السهام وتخفي الكمائن، والخيالة تتعثر فيها.',
  hills: 'تلال: من يمسك المرتفع يضرب أقوى ويرمي أبعد، والصاعد يتعب.',
  river: 'نهر: لا يُعبر إلا من المخاضات، والعابر ضعيف في الماء.',
  desert: 'صحراء: حرّ يُنهك غير المعتادين عليه، وخيالة السهوب تتفوق.',
  mountains: 'ممر جبلي ضيق: التفوق العددي لا يفيد كثيراً، والجبليون يتفوقون.',
  coast: 'ساحل: البحر يحمي جناحاً ويحصر المناورة.',
};

function stat(label, ...v) { return h('div', { class: 'stat' }, h('span', { class: 'k' }, label), h('span', { class: 'v' }, v)); }
function meter(v, max = 100, color) {
  const pct = clamp(v / max, 0, 1) * 100;
  const c = color || (pct > 50 ? '#7fc26b' : pct > 25 ? '#e3b64a' : '#e0553f');
  return h('span', { class: 'meter' }, h('i', { style: { width: pct + '%', background: c } }));
}
function regChip(r, onX) {
  const d = UNITS[r.type];
  return h('span', { class: 'rchip' + (r.merc ? ' merc' : '') + (d.unique ? ' elite' : ''), title: d.desc },
    h('span', { class: 'ic' }, d.icon), h('span', null, d.name), h('b', null, r.men), r.exp ? h('span', { class: 'star' }, '★'.repeat(r.exp)) : null,
    onX ? h('button', { class: 'x', title: 'تسريح', onclick: (e) => { e.stopPropagation(); onX(); } }, '×') : null,
  );
}
function traitChip(g) {
  if (!g) return null;
  return [
    g.trait ? h('span', { class: 'trait', title: TRAITS[g.trait].desc }, TRAITS[g.trait].icon + ' ' + TRAITS[g.trait].name) : null,
    g.flaw ? h('span', { class: 'flaw', title: FLAWS[g.flaw].desc }, FLAWS[g.flaw].name) : null,
  ];
}

const Panels = {
  // ——————————————— المدينة ———————————————
  city(scene, n) {
    const P = scene.P;
    const f = Game.f(n.owner);
    const own = n.owner === P;
    const sheet = scene.sheet;
    sheet.innerHTML = '';
    sheet.hidden = false;
    scene.minimized = false;
    const st = own ? null : Game.status(P, n.owner);
    const intel = own ? 3 : Game.intelLevel(P, n.owner);
    sheet.appendChild(h('div', { class: 'sheet-head' },
      h('div', null,
        h('h3', null, n.name, n.capital ? h('span', { class: 'cap' }, ' ★ عاصمة') : null),
        h('div', { class: 'sub' }, h('i', { class: 'dot', style: { background: f.color } }), f.name,
          st ? h('span', { class: 'pill ' + st }, { war: 'حرب', peace: 'سلام', alliance: 'حلف' }[st]) : null,
          h('span', { class: 'muted' }, ' · ' + TERRAIN[n.terrain].name)),
      ),
      h('div', { class: 'head-btns' },
        h('button', { class: 'icon-btn' + (scene.selArmy ? ' pulse' : ''), title: 'تصغير', onclick: () => scene.minimizeSheet() }, '—'),
        h('button', { class: 'icon-btn', title: 'إغلاق', onclick: () => { scene.selArmy = null; scene.closeSheet(); } }, '✕'),
      ),
    ));
    const body = h('div', { class: 'sheet-body' });
    sheet.appendChild(body);

    const gMen = Game.menOf(n.garrison);
    const stats = h('div', { class: 'stats' },
      stat('السكان', intel >= 1 ? n.pop.toLocaleString('en') : '؟'),
      stat('التحصين', h('span', { class: 'walls' }, n.walls ? '▮'.repeat(n.walls) : '—'), h('small', { class: 'muted' }, n.walls ? `مستوى ${n.walls}` : 'بلا أسوار')),
      own || intel >= 2 ? stat('الولاء', meter(n.loyalty), n.loyalty) : null,
      own ? stat('الدخل', `💰${Game.cityIncome(n)} 🌾${Game.cityFood(n)}`) : null,
      own ? stat('القوى البشرية', `👥 ${Math.floor(n.manpower)}/${Game.mpCap(n)}`) : null,
      stat('مؤن الحصار', n.stores < 0 ? 'مجاعة!' : intel >= 2 ? `${n.stores}/${Game.storesMax(n)} أدوار` : '؟'),
      stat('الحامية', own ? gMen + ' رجل' : h('bdi', { dir: 'ltr' }, Game.estimate(P, n.owner, gMen).text)),
      own || Game.armiesAt(n.id).some((a) => a.fid === P) ? stat('الإمداد', `${Game.stackAt(n, P)}/${Game.supplyCap(n, P)} وحدة`) : null,
      own && n.unrest > 0 ? stat('الاستقرار', h('span', { class: 'warn' }, `مضطربة ${n.unrest} أدوار`)) : null,
    );
    body.appendChild(stats);
    if (own && Game.overstack(n, P) > 0) body.appendChild(h('p', { class: 'warn small' }, 'ازدحام! الجيوش هنا تتجاوز قدرة الإمداد: استنزاف وتراجع ولاء كل دور.'));
    if (own && n.unrest > 0) body.appendChild(h('p', { class: 'hint' }, 'مدينة محتلة حديثاً: دخل منخفض، لا تجنيد نظامي (المرتزقة فقط)، والحامية لا تتعافى.'));

    // الحصار
    const bs = Game.besiegers(n.id);
    if (bs.length) body.appendChild(this.siegeSection(scene, n, bs));

    // الجيوش
    const armies = Game.armiesAt(n.id).filter((a) => !(a.siege && a.fid !== P) || true);
    const ownArmies = armies.filter((a) => a.fid === P);
    const others = armies.filter((a) => a.fid !== P);
    for (const a of ownArmies) body.appendChild(this.armyCard(scene, a, n));
    for (const a of others) body.appendChild(this.foreignArmy(a));

    if (own) {
      body.appendChild(this.recruitSection(scene, n));
      body.appendChild(this.buildSection(scene, n));
    } else if (!bs.length) {
      if (intel >= 1) body.appendChild(h('div', { class: 'section' }, h('h4', null, 'الحامية'), intel >= 2 ? h('div', { class: 'chips' }, n.garrison.map((r) => regChip(r))) : h('p', { class: 'muted' }, 'التفاصيل مجهولة — أرسل جواسيس أو اعقد تجارة لتعرف أكثر.')));
      const near = Game.armiesOf(P).filter((a) => Game.reach(a)[n.id]);
      if (near.length) body.appendChild(h('p', { class: 'hint' }, 'اضغط راية جيشك ثم هذه المدينة للزحف إليها.'));
    }
    scene.refresh();
  },

  siegeSection(scene, n, bs) {
    const P = scene.P;
    const sFid = bs[0].fid;
    const mine = sFid === P;
    const turns = Game.siegeTurns(n, sFid);
    const eq = Game.siegeEquip(n, sFid);
    const box = h('div', { class: 'section siege' },
      h('h4', null, mine ? `حصارك لـ${n.name}` : `${n.name} تحت حصار ${Game.fname(sFid)}`),
      h('p', { class: 'muted small' }, `منذ ${turns} أدوار · ${bs.length} جيوش · المعدات: ${[eq.ram && 'كبش', eq.ladders && 'سلالم', eq.tower && 'برج حصار'].filter(Boolean).join('، ') || 'تُبنى — الكبش والسلالم بعد دور، البرج بعد دورين'}`),
    );
    if (mine) {
      const enc = Game.makeEnc('assault', bs, n.id);
      box.appendChild(this.powerCompare(enc, P));
      const canBreach = eq.ram || bs.some((b) => b.regs.some((r) => r.type === 'catapult'));
      const lead = bs.find((b) => b.mp > 0);
      box.appendChild(h('div', { class: 'row-btns' },
        h('button', { class: 'btn primary', disabled: !lead || !canBreach, onclick: async () => { await scene.runEnc(Game.makeEnc('assault', Game.besiegers(n.id).filter((b) => b.fid === P), n.id)); scene.afterAction(n); } },
          !canBreach ? 'اقتحام (انتظر المعدات)' : !lead ? 'استنفدت الجيوش حركتها' : 'اقتحام ⚔️'),
        h('button', { class: 'btn', disabled: n.parley === Game.S.turn, onclick: () => this.offerTerms(scene, n) }, 'عرض الأمان مقابل الاستسلام'),
        h('button', { class: 'btn', onclick: () => { for (const b of Game.besiegers(n.id).filter((x) => x.fid === P)) { Game.retreatHome(b, [], null, b.siege.from); b.mp = 0; } UI.toast('رُفع الحصار'); scene.afterAction(n); } }, 'رفع الحصار'),
      ));
      box.appendChild(h('p', { class: 'hint' }, 'كل دور حصار: تنقص مؤنهم، وتكتمل معداتك. أرسل جيوشاً أخرى إلى هنا لتنضم للحصار.'));
    } else if (n.owner === P) {
      const inside = Game.defendersOf(n).filter((a) => a.fid === P && a.mp > 0);
      box.appendChild(h('div', { class: 'row-btns' },
        inside.length ? h('button', { class: 'btn primary', onclick: async () => { await scene.runEnc(Game.makeEnc('sally', inside, n.id, bs.filter((b) => b.fid === sFid))); scene.afterAction(n); } }, 'الخروج للقتال') : h('span', { class: 'muted small' }, 'لا جيش جاهز داخل المدينة. أرسل جيشاً مجاوراً لفكّ الحصار.'),
        h('button', { class: 'btn', disabled: n.parley === Game.S.turn, onclick: () => this.payRansom(scene, n, bs) }, `فدية لرفع الحصار (${this.ransomCost(bs)}💰)`),
      ));
    }
    return box;
  },

  armyCard(scene, a, n) {
    const P = scene.P;
    const g = Game.armyGen(a);
    const men = Game.menOf(a.regs);
    const mpMax = Game.mpMax(a);
    const sel = scene.selArmy === a;
    const card = h('div', { class: 'section army own' + (sel ? ' sel' : '') },
      h('div', { class: 'army-head' },
        h('div', null,
          h('h4', null, h('i', { class: 'dot', style: { background: Game.f(a.fid).color } }), g ? Game.genTitle(g) : 'بلا قائد', a.role === 'governor' ? h('span', { class: 'muted small' }, ' (حاكم)') : null),
          h('div', { class: 'chips' }, traitChip(g),
            h('span', { class: 'mp' }, '🥾 ', [...Array(mpMax)].map((_, i) => h('i', { class: i < a.mp ? 'on' : '' }))),
            a.mood ? h('span', { class: 'mood ' + a.mood.k }, { shaken: 'مهزوز', confident: 'واثق', hungry: 'جائع' }[a.mood.k]) : null,
            a.training ? h('span', { class: 'mood confident' }, 'يتدرب') : null),
        ),
        h('span', { class: 'muted small' }, `${men + (g ? Game.genMen(g) : 0)} رجل · ${a.regs.length}/${MAX_REGS}`),
      ),
      g && g.trait ? h('p', { class: 'muted small' }, TRAITS[g.trait].desc + (g.flaw ? ' — ' + FLAWS[g.flaw].desc : '')) : null,
    );
    const chips = h('div', { class: 'chips' });
    a.regs.forEach((r, i) => chips.appendChild(regChip(r, !a.siege ? () => this.confirmDisband(scene, a, i) : null)));
    if (!a.regs.length) chips.appendChild(h('span', { class: 'muted small' }, 'القائد وحرسه فقط — جنّد وحدات أو انقلها إليه.'));
    card.appendChild(chips);
    const others = Game.armiesAt(n.id).filter((o) => o !== a && o.fid === P && !!o.siege === !!a.siege);
    const btns = h('div', { class: 'row-btns' },
      h('button', {
        class: 'btn primary' + (sel ? ' on' : ''), disabled: a.mp <= 0 || !a.regs.length,
        onclick: () => { if (scene.selArmy === a) scene.cancelMove(); else { scene.selectArmy(a); UI.toast('اضغط مدينة مضيئة. الرقم فوقها كلفة الحركة.'); } },
      }, a.mp <= 0 ? 'لا حركة متبقية' : sel ? 'اختر الوجهة… (إلغاء)' : 'تحريك الجيش'),
      a.regs.length ? h('button', { class: 'btn', onclick: () => this.splitDialog(scene, a) }, 'تقسيم / نقل وحدات') : null,
      others.length ? h('button', { class: 'btn', onclick: () => this.mergeDialog(scene, a, others) }, 'دمج مع قائد آخر') : null,
      !a.siege && n.owner === P ? h('button', { class: 'btn', disabled: !!Game.canTrain(a), title: Game.canTrain(a) || '', onclick: () => { const e = Game.train(a); UI.toast(e || 'يتدرب الجيش هذا الدور: خبرة للوحدات'); scene.afterAction(n); } }, `تدريب (${Game.trainCost(a)}💰)`) : null,
      !a.regs.length ? h('button', { class: 'btn ghost', onclick: () => { Game.dismissGeneral(a); scene.afterAction(n); } }, 'إعفاء القائد') : null,
    );
    card.appendChild(btns);
    return card;
  },

  foreignArmy(a) {
    const P = Game.S.player;
    const g = Game.armyGen(a);
    const lvl = Game.intelLevel(P, a.fid);
    const men = Game.menOf(a.regs);
    return h('div', { class: 'section army' },
      h('h4', null, h('i', { class: 'dot', style: { background: Game.f(a.fid).color } }), `${Game.fname(a.fid)} — ${lvl >= 1 ? Game.genTitle(g) : 'قائد مجهول'}`, a.siege ? h('span', { class: 'muted small' }, ' (يحاصر)') : null),
      lvl >= 1 ? h('div', { class: 'chips' }, traitChip(g)) : null,
      lvl >= 2 ? h('div', { class: 'chips' }, a.regs.map((r) => regChip(r))) : h('p', { class: 'muted small' }, `نحو ${Game.estimate(P, a.fid, men).text} رجل · ${lvl >= 1 ? a.regs.length + ' وحدات' : 'عدد الوحدات مجهول'}`),
    );
  },

  confirmDisband(scene, a, i) {
    const r = a.regs[i];
    UI.modal({
      title: 'تسريح الوحدة؟',
      body: h('p', null, `${UNITS[r.type].name} (${r.men} رجل) — يوفّر ${UNITS[r.type].upkeep * (r.merc ? 1.8 : 1)} ذهب كل دور.${r.merc ? '' : ' يعود معظم الرجال إلى القوى البشرية للمدينة.'}`),
      buttons: [
        { label: 'سرّح', danger: true, onClick: () => { Game.disband(a, i); scene.afterAction(Game.node(a.node)); } },
        { label: 'إلغاء' },
      ],
    });
  },

  // ——— تقسيم الجيش ———
  splitDialog(scene, a) {
    const P = scene.P;
    const picks = a.regs.map((r) => ({ men: 0, max: r.men }));
    let dest = null;
    const others = Game.armiesAt(a.node).filter((o) => o !== a && o.fid === P && !!o.siege === !!a.siege);
    const total = h('b');
    const list = h('div', { class: 'split-list' });
    const upd = () => {
      const t = picks.reduce((s, p) => s + p.men, 0);
      const all = picks.reduce((s, p) => s + p.max, 0);
      total.textContent = `${t} / ${all}`;
    };
    a.regs.forEach((r, i) => {
      const val = h('b', { class: 'sv' }, '0');
      const range = h('input', { type: 'range', min: 0, max: r.men, step: 1, value: 0, id: 'split-' + a.id + '-' + i });
      const set = (v) => { v = Math.round(clamp(v, 0, r.men)); if (v > 0 && v < 5) v = 5; if (r.men - v > 0 && r.men - v < 5) v = r.men; picks[i].men = v; range.value = v; val.textContent = v; upd(); };
      range.addEventListener('input', () => set(+range.value));
      list.appendChild(h('div', { class: 'split-row' },
        h('span', { class: 'sn' }, UNITS[r.type].icon + ' ' + UNITS[r.type].name),
        h('button', { class: 'step', onclick: () => set(picks[i].men - 10) }, '−'),
        range,
        h('button', { class: 'step', onclick: () => set(picks[i].men + 10) }, '+'),
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
      const row = h('div', { class: 'chips' });
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
      title: `تقسيم جيش ${Game.armyGen(a).name}`,
      body: h('div', null, h('p', { class: 'hint' }, 'حدّد عدد الرجال من كل وحدة. القائد يبقى مع ما تبقى، والقوة المفصولة تحتاج قائداً (كل قائد يقود 8 وحدات على الأكثر).'), quick, list, h('p', null, 'المختار: ', total), destBox),
      buttons: [
        {
          label: 'افصل', primary: true, keep: true, onClick: (close) => {
            if (!dest) { UI.toast('اختر إلى من تذهب القوات'); return; }
            const res = Game.splitArmy(a, picks.map((p, i) => ({ idx: i, men: p.men })), dest);
            if (res.err) { UI.toast(res.err); return; }
            close();
            if (!Game.S.armies.includes(a)) { /* الجيش الأصلي انتقل بالكامل */ }
            const na = res.army;
            if (dest.kind === 'new' && na.mp > 0) { scene.selectArmy(na); UI.toast('القوة الجديدة جاهزة — اختر وجهتها أو أغلق لتبقى هنا'); }
            scene.afterAction(Game.node(na.node));
          },
        },
        { label: 'إلغاء' },
      ],
    });
  },

  mergeDialog(scene, a, others) {
    UI.modal({
      title: 'دمج الجيوش',
      body: h('p', null, 'انقل كل وحدات هذا الجيش إلى قائد آخر هنا (حتى 8 وحدات). يعود القائد الحالي إلى البلاط إن فرغ جيشه.'),
      buttons: [
        ...others.map((o) => ({ label: `إلى ${Game.armyGen(o).name} (${o.regs.length}/8)`, disabled: o.regs.length >= MAX_REGS, onClick: () => { const e = Game.mergeInto(a, o); if (e) UI.toast(e); scene.afterAction(Game.node(o.node)); } })),
        { label: 'إلغاء' },
      ],
    });
  },

  // ——— اختيار قائد ———
  genCard(g, extra) {
    return h('div', { class: 'gcard' },
      h('div', { class: 'gtop' }, h('b', null, Game.genTitle(g)), h('span', { class: 'muted small' }, `راتب ${Game.genSalary(g)}💰/دور`)),
      h('div', { class: 'chips' }, traitChip(g)),
      g.trait ? h('p', { class: 'small' }, TRAITS[g.trait].desc) : h('p', { class: 'small muted' }, 'ضابط بلا موهبة خاصة.'),
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
        list.appendChild(h('button', { class: 'gpick', disabled: Game.f(fid).gold < fee, onclick: () => { close(); resolve(g.id); } }, this.genCard(g, h('span', { class: 'fee' }, `تعيين: ${fee}💰`))));
      }
      if (!pool.length) list.appendChild(h('p', { class: 'muted' }, 'لا قادة متاحون في البلاط. يمكنك ترقية ضابط.'));
      close = UI.modal({
        title: opts.title || 'اختر قائداً',
        body: h('div', null, h('p', { class: 'hint' }, 'كل قائد يغيّر نظاماً مختلفاً: الحركة، الحصار، الاقتصاد، الإمداد، أو القتال. اختر حسب المهمة.'), list),
        buttons: [
          opts.allowOfficer !== false ? { label: 'ترقية ضابط (40💰)', disabled: Game.f(fid).gold < 40, onClick: () => resolve('officer') } : null,
          { label: 'إلغاء', onClick: () => resolve(null) },
        ].filter(Boolean),
      });
    });
  },

  // ——— التجنيد والبناء ———
  recruitSection(scene, n) {
    const P = scene.P;
    const armies = Game.armiesOfAt(P, n.id).filter((a) => a.regs.length < MAX_REGS);
    if (!scene.recruitTo || !armies.find((a) => a.id === scene.recruitTo)) scene.recruitTo = armies[0] ? armies[0].id : null;
    const sec = h('div', { class: 'section' }, h('h4', null, 'التجنيد', h('span', { class: 'muted' }, ` · 👥 ${Math.floor(n.manpower)} رجل متاح`)));
    const who = h('div', { class: 'chips' });
    for (const a of armies) who.appendChild(h('button', { class: 'chip' + (scene.recruitTo === a.id ? ' on' : ''), onclick: () => { scene.recruitTo = a.id; this.city(scene, n); } }, `${Game.armyGen(a).name} (${a.regs.length}/8)`));
    who.appendChild(h('button', {
      class: 'chip', onclick: async () => {
        const r = await this.generalPicker(P, { title: `تعيين قائد في ${n.name}` });
        if (!r) return;
        const g = r === 'officer' ? Game.officer(P) : Game.gen(r);
        const res = Game.hire(P, g.id, n.id);
        if (res.err) UI.toast(res.err); else { scene.recruitTo = res.army.id; UI.toast(`عُيّن ${g.name}`); }
        scene.afterAction(n);
      },
    }, '＋ تعيين قائد'));
    sec.appendChild(h('div', { class: 'label' }, 'الوحدات الجديدة تنضم إلى:'));
    sec.appendChild(who);
    const grid = h('div', { class: 'recruit' });
    for (const t of Game.recruitableTypes(P, n)) {
      const d = UNITS[t];
      const err = Game.canRecruit(P, n, t, scene.recruitTo, false);
      grid.appendChild(h('button', {
        class: 'unit-btn' + (d.unique ? ' elite' : ''), disabled: !!err, title: err || d.desc,
        onclick: () => { const e = Game.recruit(P, n, t, scene.recruitTo); UI.toast(e || `جُنّدت ${d.name}`); scene.afterAction(n); },
      },
        h('span', { class: 'ic' }, d.icon), h('span', { class: 'nm' }, d.name), h('span', { class: 'cost' }, `💰${d.cost} · 👥${d.men}`),
        err && err !== 'الذهب لا يكفي' ? h('span', { class: 'why' }, err) : null,
      ));
    }
    sec.appendChild(grid);
    const mercs = Game.f(P).mercs;
    if (mercs.length) {
      sec.appendChild(h('div', { class: 'label' }, 'مرتزقة متاحون (بلا قوى بشرية، مخضرمون، يُجنَّدون حتى في المدن المضطربة، صيانتهم مضاعفة تقريباً):'));
      const mg = h('div', { class: 'recruit' });
      mercs.forEach((m, i) => {
        const d = UNITS[m.type];
        const err = Game.canRecruit(P, n, m.type, scene.recruitTo, true);
        mg.appendChild(h('button', { class: 'unit-btn merc', disabled: !!err, title: err || '', onclick: () => { const e = Game.hireMerc(P, n, i, scene.recruitTo); UI.toast(e || `انضم مرتزقة ${d.name}`); scene.afterAction(n); } },
          h('span', { class: 'ic' }, d.icon), h('span', { class: 'nm' }, d.name + ' ' + '★'.repeat(m.exp)), h('span', { class: 'cost' }, `💰${Game.recruitCost(m.type, true)}`)));
      });
      sec.appendChild(mg);
    }
    sec.appendChild(h('details', { class: 'unit-help' }, h('summary', null, 'ما الذي يهزم ماذا؟'),
      [...RECRUITABLE, UNIQUE_OF[P]].filter(Boolean).map((t) => h('p', null, h('b', null, UNITS[t].icon + ' ' + UNITS[t].name + ': '), UNITS[t].desc))));
    return sec;
  },

  buildSection(scene, n) {
    const P = scene.P;
    const sec = h('div', { class: 'section' }, h('h4', null, 'البناء والمشاريع', h('span', { class: 'muted' }, ' · بناء واحد لكل مدينة في الدور')));
    const grid = h('div', { class: 'build' });
    for (const k of Object.keys(BUILDINGS)) {
      const B = BUILDINGS[k], lvl = n[k] || 0;
      const err = Game.canBuild(P, n, k);
      grid.appendChild(h('button', {
        class: 'unit-btn', disabled: !!err, title: err || B.desc,
        onclick: () => { const e = Game.build(P, n, k); UI.toast(e || `بُني ${B.name}`); scene.afterAction(n); },
      },
        h('span', { class: 'nm' }, `${B.name} ${lvl}/${B.max}`), h('span', { class: 'desc' }, B.desc),
        lvl < B.max ? h('span', { class: 'cost' }, `💰${B.cost(lvl)}`) : h('span', { class: 'cost' }, 'مكتمل'),
      ));
    }
    const ferr = Game.canFestival(P, n);
    grid.appendChild(h('button', { class: 'unit-btn project', disabled: !!ferr, title: ferr || '', onclick: () => { const e = Game.festival(P, n); UI.toast(e || 'أقيمت الاحتفالات'); scene.afterAction(n); } },
      h('span', { class: 'nm' }, '🎉 احتفالات وعطايا'), h('span', { class: 'desc' }, '+20 ولاء، يقصّر الاضطراب'), h('span', { class: 'cost' }, `💰${Game.festivalCost(n)}`)));
    sec.appendChild(grid);
    return sec;
  },

  siegeMethods(n) {
    return h('ul', { class: 'steps small' },
      h('li', null, h('b', null, 'التجويع: '), `مؤنهم ${n.stores} أدوار، ثم تبدأ المجاعة وقد يستسلمون. بطيء لكنه بلا خسائر تقريباً.`),
      h('li', null, h('b', null, 'الكبش والسلالم: '), 'جاهزة بعد دور. البوابة والتسلّق مكلفان في الرجال.'),
      h('li', null, h('b', null, 'برج الحصار: '), 'بعد دورين. معبر آمن فوق السور.'),
      h('li', null, h('b', null, 'المنجنيق: '), 'يفتح ثغرات بلا انتظار، لكنه بطيء وثمين.'),
    );
  },

  powerCompare(enc, P) {
    const { pa, pd } = Game.encPower(enc);
    const mineAtt = enc.attFid === P;
    const my = mineAtt ? pa : pd, en = mineAtt ? pd : pa;
    const ratio = my / Math.max(1, en);
    const verdict = ratio > 2.2 ? 'تفوّق ساحق' : ratio > 1.4 ? 'أفضلية واضحة' : ratio > 0.85 ? 'قوى متكافئة — التكتيك سيحسمها' : ratio > 0.55 ? 'العدو أقوى — تحتاج خطة ذكية' : 'العدو أقوى بكثير';
    const pct = 100 * my / (my + en || 1);
    return h('div', { class: 'compare' },
      h('div', { class: 'cbar' }, h('i', { style: { width: pct + '%' } })),
      h('div', { class: 'cl' }, h('span', null, 'قوتك'), h('b', null, verdict), h('span', null, 'العدو')),
      h('p', { class: 'muted small' }, 'التقدير يشمل القادة والتضاريس والأسوار والمعنويات.'),
    );
  },

  ransomCost(bs) { return Math.round(bs.reduce((s, b) => s + Game.menOf(b.regs), 0) * 0.9 + 40); },
  payRansom(scene, n, bs) {
    const P = scene.P, f = Game.f(P), cost = this.ransomCost(bs);
    if (f.gold < cost) { UI.toast('الذهب لا يكفي'); return; }
    n.parley = Game.S.turn;
    const sFid = bs[0].fid;
    const ratio = bs.reduce((s, b) => s + Game.armyPower(b), 0) / Math.max(1, Game.defensePower(n));
    if (R() < (ratio < 2 ? 0.7 : 0.35) && !(Game.f(sFid).vendetta[P] > 0)) {
      f.gold -= cost; Game.f(sFid).gold += cost;
      for (const b of bs) Game.retreatHome(b, [], null, b.siege.from);
      Game.addRel(P, sFid, 5);
      Game.event('pol', `${Game.fname(sFid)} تقبل فدية ${cost} ذهباً وترفع الحصار عن ${n.name}.`, { fids: [P, sFid], imp: 2 });
      UI.toast(`قبل ${Game.fname(sFid)} الفدية ورفع الحصار`);
    } else UI.toast(`رفض ${Game.fname(sFid)} الفدية!`);
    scene.afterAction(n);
  },
  offerTerms(scene, n) {
    n.parley = Game.S.turn;
    const P = scene.P;
    const enc = Game.makeEnc('assault', Game.besiegers(n.id).filter((b) => b.fid === P), n.id);
    const { pa, pd } = Game.encPower(enc);
    const ratio = pa / Math.max(1, pd);
    let p = clamp(0.08 + (ratio - 1) * 0.2 + (n.stores <= 0 ? 0.35 : n.stores <= 1 ? 0.15 : 0) + Game.siegeTurns(n, P) * 0.05 - (n.capital ? 0.15 : 0) + (Game.f(P).rep - 50) / 200, 0, 0.85);
    if (Game.f(n.owner) && Game.f(n.owner).vendetta && Game.f(n.owner).vendetta[P] > 0) p *= 0.3;
    if (R() < p) {
      UI.toast(`${n.name} تقبل الأمان وتفتح أبوابها! حاميتها تغادر بممر آمن.`);
      scene.busy = true;
      Game.surrenderAccepted(enc, 'surrender').then(() => { scene.busy = false; scene.afterAction(n); });
    } else {
      UI.toast(`رفض أهل ${n.name} الاستسلام. جرّب حين يشتدّ الجوع.`);
      scene.afterAction(n);
    }
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
    return UI.ask({
      title: 'إعلان حرب',
      body: h('div', null,
        h('p', { class: 'lead warn' }, `هذا الهجوم سينهي حالة ${st === 'alliance' ? 'الحلف' : 'السلام'} ويبدأ حرباً مع ${Game.fname(fid)}.`),
        cons.length ? h('ul', { class: 'steps' }, cons.map((c) => h('li', null, c))) : h('p', { class: 'muted' }, 'لا معاهدة قائمة — العواقب محدودة.'),
      ),
      buttons: [{ label: 'أعلن الحرب وهاجم', value: true, danger: true }, { label: 'تراجع', value: false }],
    });
  },

  // ——————————————— نظرة عامة ———————————————
  dashboard(scene) {
    const P = scene.P;
    const rows = [];
    for (const id of [P, ...Game.aliveMajors().filter((x) => x !== P)]) {
      const f = Game.f(id);
      const nodes = Game.nodesOf(id);
      const eco = Game.economy(id);
      const armies = Game.armiesOf(id);
      const est = (v) => h('bdi', { dir: 'ltr' }, Game.estimate(P, id, v).text);
      const lvl = Game.intelLevel(P, id);
      const lvlName = ['مجهول', 'تقديري', 'تقريبي', 'مؤكد'][lvl];
      const allies = Game.aliveMajors().filter((c) => c !== id && Game.status(id, c) === 'alliance').map((c) => Game.fname(c));
      rows.push(h('div', { class: 'dash-card' + (id === P ? ' me' : '') },
        h('div', { class: 'dash-head' }, h('i', { class: 'dot', style: { background: f.color } }), h('b', null, f.name), h('span', { class: 'intel l' + lvl }, lvlName)),
        h('div', { class: 'dash-grid' },
          stat('المدن', `${nodes.length} (${nodes.filter((n) => n.walls >= 2).length} محصّنة)`),
          stat('السكان', est(nodes.reduce((s, n) => s + n.pop, 0))),
          stat('الدخل/دور', est(eco.gold + eco.trade)),
          stat('الخزينة', est(Math.max(0, f.gold))),
          stat('الجيوش', lvl >= 1 ? [est(armies.reduce((s, a) => s + Game.armyMen(a), 0)), ' رجل'] : '؟'),
          stat('القادة', lvl >= 1 ? `${armies.length} ميدان · ${Game.poolOf(id).length} في البلاط` : '؟'),
          stat('القوة', est(Game.factionPower(id))),
          stat('القوى البشرية', est(Game.manpowerOf(id))),
          stat('التجارة', est(eco.trade)),
          stat('السمعة', h('span', null, meter(f.rep)), Math.round(f.rep)),
        ),
        allies.length ? h('p', { class: 'small muted' }, 'حلفاء: ' + allies.join('، ')) : null,
      ));
    }
    UI.modal({
      title: 'الممالك', cls: 'wide',
      body: h('div', null,
        h('p', { class: 'hint' }, 'معلوماتك عن الخصوم تتحسن بالحلف والتجارة والمصاهرة والجواسيس. الحدود المشتركة تكشف القليل.'),
        h('div', { class: 'dash' }, rows)),
      buttons: [{ label: 'إغلاق' }], dismissable: true,
    });
  },

  // ——————————————— الدبلوماسية ———————————————
  diplomacy(scene) {
    const P = scene.P;
    const list = h('div', { class: 'diplo' });
    let closeFn;
    const redo = () => { render(); scene.refresh(); };
    const render = () => {
      list.innerHTML = '';
      const me = Game.factionPower(P);
      const myF = Game.f(P);
      list.appendChild(h('p', { class: 'small' }, 'سمعتك: ', meter(myF.rep), ` ${Math.round(myF.rep)} — السمعة العالية تجعل العروض مقبولة والمدن تستسلم أسهل.`));
      for (const id of Game.majors()) {
        if (id === P) continue;
        const f = Game.f(id);
        if (!f.alive) { list.appendChild(h('div', { class: 'd-row dead' }, h('i', { class: 'dot', style: { background: f.color } }), f.name, ' — سقطت')); continue; }
        const st = Game.status(P, id);
        const rel = Game.rel(P, id);
        const pw = Game.factionPower(id);
        const lvl = Game.intelLevel(P, id);
        const cmp = lvl === 0 ? 'قوتها مجهولة' : pw > me * 1.6 ? 'أقوى منك بكثير' : pw > me * 1.15 ? 'أقوى منك' : pw > me * 0.85 ? 'نِدّ لك' : pw > me * 0.6 ? 'أضعف منك' : 'أضعف منك بكثير';
        const truce = myF.truce[id] || 0;
        const tr = Game.treaty(P, id);
        const act = (label, fn, dis, cls = '') => h('button', { class: 'chip ' + cls, disabled: dis, onclick: () => { fn(); redo(); } }, label);
        const btns = h('div', { class: 'd-btns' });
        if (st === 'war') {
          btns.append(
            act('عرض الصلح', () => this.proposePeace(id, 0)),
            act('صلح + 150💰', () => this.proposePeace(id, 150), myF.gold < 150),
            act('صلح + جزية منهم', () => {
              if (Game.aiWillPayTribute(id, P) && Game.aiWillAcceptPeace(id, P, 60)) { Game.makePeace(P, id, 8); Game.addTribute(id, P, Game.tributeAmount(id), 6); UI.toast(`${f.name} تقبل الصلح وتدفع الجزية`); }
              else { Game.addRel(P, id, -3); UI.toast(`${f.name} ترفض — ما زالت قوية`); }
            }),
          );
        } else {
          btns.append(act('هدية 100💰', () => { myF.gold -= 100; f.gold += 100; Game.addRel(P, id, 14 * (1 - Math.max(0, rel) / 150)); UI.toast(`${f.name} تقبل هديتك`); }, myF.gold < 100));
          if (st === 'peace') btns.append(act('عرض حلف', () => {
            if (Game.aiWillAlly(id, P)) { Game.makeAlliance(P, id); UI.toast(`تحالفت مع ${f.name}!`); }
            else { UI.toast(`${f.name} ترفض الحلف (تحتاج علاقة أفضل أو عدواً مشتركاً)`); Game.addRel(P, id, -2); }
          }));
          if (st === 'alliance') {
            btns.append(act('تمويل الحليف 150💰', () => { Game.subsidy(P, id, 150); UI.toast('وصلت الأموال'); }, myF.gold < 150));
            btns.append(act('فضّ الحلف', () => { Game.breakAlliance(P, id, 'بقرار منك'); UI.toast('انتهى الحلف'); }, false, 'warn'));
          }
          btns.append(tr.trade
            ? act('إيقاف التجارة', () => Game.setTrade(P, id, false))
            : act('اتفاق تجارة', () => { if (Game.aiWillTrade(id, P)) { Game.setTrade(P, id, true); UI.toast('بدأت القوافل'); } else UI.toast(`${f.name} ترفض التجارة`); }));
          if (!tr.marriage) btns.append(act(`مصاهرة (${Game.marriageCost()}💰)`, () => { if (Game.aiWillMarry(id, P)) { Game.marry(P, id); UI.toast('تمّت المصاهرة'); } else UI.toast(`${f.name} ترفض المصاهرة الآن`); }, myF.gold < Game.marriageCost()));
          btns.append(act('طلب جزية', () => {
            if (Game.aiWillPayTribute(id, P)) { Game.addTribute(id, P, Game.tributeAmount(id), 8); UI.toast(`${f.name} تقبل دفع الجزية`); }
            else { Game.addRel(P, id, -20); Game.event('pol', `${f.name} ترفض دفع الجزية لـ${myF.name}.`, { fids: [P, id], imp: 2 }); UI.toast(`${f.name} ترفض بازدراء`); }
          }));
          btns.append(h('button', { class: 'chip warn', onclick: () => this.confirmWarAttack(id).then((ok) => { if (ok) { Game.declareWar(P, id, 'بقرار منك'); redo(); } }) }, 'إعلان الحرب'));
        }
        if (myF.allyCall && myF.allyCall.enemy === id && !Game.atWar(P, id)) {
          btns.append(act('لبِّ نداء الحليف', () => { Game.declareWar(P, id, 'نصرةً لحليفها'); Game.addRel(P, myF.allyCall.ally, 15); myF.allyCall = null; }, false, 'on'));
        }
        const spies = h('div', { class: 'd-btns spies' }, h('span', { class: 'muted small' }, '🕵️'),
          Object.entries(SPY).map(([k, sp]) => {
            const err = Game.canSpy(P, id, k);
            return h('button', { class: 'chip', disabled: !!err, title: err || sp.desc, onclick: () => { const r = Game.spy(P, id, k); UI.toast(r.err || r.text); redo(); } }, `${sp.name} ${sp.cost}💰`);
          }));
        const tribs = Game.S.tributes.filter((t) => (t.payer === id && t.payee === P) || (t.payer === P && t.payee === id));
        list.appendChild(h('div', { class: 'd-row' },
          h('div', { class: 'd-head' },
            h('i', { class: 'dot', style: { background: f.color } }), h('b', null, f.name),
            h('span', { class: 'pill ' + st }, { war: 'حرب', peace: 'سلام', alliance: 'حلف' }[st]),
            truce > 0 && st !== 'war' ? h('span', { class: 'muted small' }, `عهد ${truce} أدوار`) : null,
            tr.trade ? h('span', { class: 'tag' }, '🐪 تجارة') : null,
            tr.marriage ? h('span', { class: 'tag' }, '💍 مصاهرة') : null,
            f.vendetta && f.vendetta[P] > 0 ? h('span', { class: 'tag bad' }, '🩸 ثأر') : null,
            tribs.map((t) => h('span', { class: 'tag' }, t.payer === P ? `تدفع ${t.amount}💰` : `تقبض ${t.amount}💰`)),
          ),
          h('div', { class: 'd-meta' },
            h('span', null, 'العلاقة '), meter(rel + 100, 200), h('b', { dir: 'ltr' }, rel),
            h('span', { class: 'muted' }, ' · ' + cmp + ' · ' + Game.nodesOf(id).length + ' مدن · سمعة ' + Math.round(f.rep)),
          ),
          btns, spies,
        ));
      }
    };
    render();
    closeFn = UI.modal({ title: 'الدبلوماسية', cls: 'wide', body: h('div', null, h('p', { class: 'hint' }, 'الهدايا والتجارة والمصاهرة تبني العلاقة، والحدود المشتركة والخيانات تهدمها. نقض العهد يضرّ سمعتك عند الجميع.'), list), buttons: [{ label: 'إغلاق' }], dismissable: true });
    void closeFn;
  },

  proposePeace(id, tribute) {
    const P = Game.S.player, f = Game.f(id);
    if (Game.aiWillAcceptPeace(id, P, tribute)) {
      if (tribute) { Game.f(P).gold -= tribute; f.gold += tribute; }
      Game.makePeace(P, id, 8);
      UI.toast(`${f.name} تقبل الصلح`);
    } else {
      Game.addRel(P, id, -3);
      UI.toast(f.vendetta && f.vendetta[P] > 0 ? `${f.name} ترفض — دم قائدها بينكما` : `${f.name} ترفض الصلح — ${tribute ? 'لا يكفيها الذهب' : 'ما زالت ترى النصر ممكناً'}`);
    }
  },

  // ——————————————— المملكة والقادة والأسرى ———————————————
  kingdom(scene, tab = 'gens') {
    const P = scene.P, F = Game.f(P);
    let close;
    const tabs = h('div', { class: 'tabs' });
    const body = h('div', { class: 'tab-body' });
    const render = (t) => {
      tab = t;
      tabs.innerHTML = '';
      for (const [k, name] of [['gens', 'القادة'], ['capt', `الأسرى (${Game.captivesHeldBy(P).length})`], ['policy', 'السياسة الداخلية']]) {
        tabs.appendChild(h('button', { class: 'chip' + (k === tab ? ' on' : ''), onclick: () => render(k) }, name));
      }
      body.innerHTML = '';
      if (t === 'gens') {
        const groups = [['army', 'في الميدان'], ['pool', 'في البلاط (متاحون للتعيين)'], ['captive', 'أسرى لدى العدو'], ['dead', 'الراحلون']];
        for (const [st, name] of groups) {
          const gs = Game.gensOf(P).filter((g) => g.status === st && !(st === 'pool' && g.name.startsWith('الضابط')));
          if (!gs.length) continue;
          body.appendChild(h('h4', null, name));
          const list = h('div', { class: 'glist' });
          for (const g of gs) {
            let extra = null;
            if (st === 'army') { const a = Game.army(g.army); extra = h('p', { class: 'small muted' }, a ? `في ${Game.node(a.node).name} · ${a.regs.length} وحدات` : ''); }
            if (st === 'captive') extra = h('p', { class: 'small warn' }, `أسير لدى ${Game.fname(g.captor)} — فديته ~${Game.ransomPrice(g)}💰`);
            list.appendChild(this.genCard(g, extra));
          }
          body.appendChild(list);
        }
        body.appendChild(h('p', { class: 'hint' }, 'يكسب القادة الخبرة من المعارك ويرتقون (★) فتقوى سماتهم ونقاط أوامرهم. الرواتب تُدفع لقادة الميدان فقط.'));
      } else if (t === 'capt') {
        const cs = Game.captivesHeldBy(P);
        if (!cs.length) body.appendChild(h('p', { class: 'muted' }, 'لا أسرى لديك. يقع القادة في الأسر حين تُباد جيوشهم أو يسقط حرسهم في المعركة.'));
        for (const g of cs) body.appendChild(h('div', { class: 'section army' }, this.genCard(g, h('p', { class: 'small' }, `من ${Game.fname(g.fid)} · أسير منذ ${Game.S.turn - g.since} أدوار`)), h('button', { class: 'btn', onclick: () => { close(); this.captiveDialog(scene, g); } }, 'قرر مصيره')));
      } else {
        body.appendChild(h('h4', null, 'الضرائب'));
        const row = h('div', { class: 'chips' });
        for (const [k, tx] of Object.entries(TAXES)) row.appendChild(h('button', { class: 'chip' + (F.tax === k ? ' on' : ''), onclick: () => { F.tax = k; scene.refresh(); render('policy'); } }, `${tx.name}: دخل ×${tx.income}، ولاء ${signed(tx.loyalty)}`));
        body.appendChild(row);
        const e = Game.economy(P);
        body.appendChild(h('h4', null, 'الخزينة كل دور'));
        body.appendChild(h('div', { class: 'stats' },
          stat('دخل المدن', '+' + e.gold), stat('التجارة', '+' + e.trade), stat('الجزية', signed(e.tribute)),
          stat('صيانة الوحدات', '−' + e.upkeep), stat('رواتب القادة', '−' + e.salaries), stat('إدارة الجيوش الزائدة', '−' + e.overhead),
          stat('الصافي', h('b', { dir: 'ltr' }, signed(e.netGold))), stat('الطعام', h('span', { dir: 'ltr' }, `${e.food} − ${e.eat}`)),
        ));
        body.appendChild(h('p', { class: 'hint' }, `كل جيش زائد عن عدد مدنك يكلّف 10💰 إدارة. المدن فوق 8 تزيد الفساد وتخفض الولاء. القوى البشرية: ${Game.manpowerOf(P)} رجل.`));
      }
    };
    render(tab);
    close = UI.modal({ title: `مملكة ${F.name}`, cls: 'wide', body: h('div', null, tabs, body), buttons: [{ label: 'إغلاق' }], dismissable: true });
  },

  captiveDialog(scene, g) {
    const P = scene.P, owner = Game.f(g.fid);
    const alive = owner && owner.alive;
    const price = Game.ransomPrice(g);
    const mineHeld = alive ? Game.captivesHeldBy(g.fid).filter((x) => x.fid === P) : [];
    const chance = Math.round(Game.recruitChance(g, P) * 100);
    const done = () => scene.afterAction();
    UI.modal({
      title: `مصير ${g.name}`,
      body: h('div', null,
        this.genCard(g),
        h('p', null, `قائد من ${Game.fname(g.fid)}${alive ? '' : ' (مملكة سقطت)'}.`),
        h('ul', { class: 'steps small' },
          h('li', null, h('b', null, 'إطلاق السراح: '), 'علاقة +15 وسمعة. يعود ليقاتلك لاحقاً.'),
          alive ? h('li', null, h('b', null, `طلب فدية (${price}💰): `), 'قد تدفع مملكته إن كان ثميناً.') : null,
          mineHeld.length ? h('li', null, h('b', null, 'تبادل: '), `مقابل ${mineHeld[0].name} الأسير عندهم.`) : null,
          h('li', null, h('b', null, `محاولة ضمه (${chance}٪): `), 'إن رفض يبقى أسيراً وتقل فرصتك.'),
          h('li', null, h('b', null, 'النفي: '), 'يختفي من الحرب دون دم، بضرر طفيف للعلاقة.'),
          h('li', { class: 'warn' }, h('b', null, 'الإعدام: '), 'يزول خطره نهائياً، لكن: −15 سمعة، ثأر وعداوة شديدة مع مملكته، غضب حلفائها، اضطراب مدنها السابقة لديك، وقد يظهر قائد يطلب الانتقام.'),
        ),
      ),
      buttons: [
        { label: 'إطلاق السراح', onClick: () => { Game.releaseCaptive(g, P); done(); } },
        alive ? { label: `فدية ${price}💰`, onClick: () => { const o = Game.f(g.fid); if (o.gold >= price && (g.rank >= 2 || R() < 0.6) && !(o.vendetta && o.vendetta[P])) { Game.ransomCaptive(g, P, price); UI.toast(`دفعت ${o.name} الفدية`); } else UI.toast(`${o.name} ترفض الدفع الآن`); done(); } } : null,
        mineHeld.length ? { label: `تبادل مع ${mineHeld[0].name}`, onClick: () => { if (R() < 0.8) { Game.exchangeCaptives(g, mineHeld[0]); UI.toast('تم التبادل'); } else UI.toast('رفضوا التبادل'); done(); } } : null,
        { label: `ضمّه (${chance}٪)`, onClick: () => { UI.toast(Game.tryRecruitCaptive(g, P) ? `${g.name} ينضم إليك!` : `${g.name} يرفض خدمتك`); done(); } },
        { label: 'نفي', onClick: () => { Game.exileCaptive(g, P); done(); } },
        { label: 'إعدام', danger: true, onClick: () => this.confirmExecute(scene, g) },
        { label: 'إبقاؤه أسيراً' },
      ].filter(Boolean),
    });
  },
  confirmExecute(scene, g) {
    UI.modal({
      title: 'هل أنت متأكد؟',
      body: h('p', { class: 'lead warn' }, `إعدام ${g.name} قرار لا رجعة فيه، وسيذكره التاريخ.`),
      buttons: [
        { label: 'نفّذ الإعدام', danger: true, onClick: () => { Game.executeCaptive(g, Game.S.player); scene.afterAction(); } },
        { label: 'تراجع', onClick: () => this.captiveDialog(scene, g) },
      ],
    });
  },
  captivePrompts(scene) {
    const P = scene.P;
    const fresh = Game.captivesHeldBy(P).filter((g) => !g.prompted);
    if (!fresh.length || document.querySelector('.modal-layer')) return;
    const g = fresh[0];
    g.prompted = true;
    UI.modal({
      title: 'أسرى!',
      body: h('div', null, h('p', { class: 'lead' }, `وقع ${g.name} (${Game.fname(g.fid)}) في أسرك.`), this.genCard(g)),
      buttons: [{ label: 'قرر مصيره الآن', primary: true, onClick: () => this.captiveDialog(scene, g) }, { label: 'لاحقاً (من شاشة المملكة)' }],
    });
  },

  // ——————————————— التقرير والسجل ———————————————
  report(scene, data, isLog) {
    const P = scene.P;
    const logs = (isLog ? Game.S.log.slice(-160) : data.logs).filter((e) => Game.eventVisible(e));
    let cat = 'all';
    const tabs = h('div', { class: 'tabs' });
    const box = h('div', { class: 'log' });
    const mine = (e) => e.fids.includes(P);
    const render = () => {
      tabs.innerHTML = '';
      const counts = { all: logs.length };
      for (const e of logs) counts[e.cat] = (counts[e.cat] || 0) + 1;
      for (const [k, name] of [['all', 'الكل'], ...Object.entries(EV_CATS)]) {
        if (k !== 'all' && !counts[k]) continue;
        tabs.appendChild(h('button', { class: 'chip' + (k === cat ? ' on' : ''), onclick: () => { cat = k; render(); } }, `${name} ${counts[k] || 0}`));
      }
      box.innerHTML = '';
      let list = logs.filter((e) => cat === 'all' || e.cat === cat);
      if (!isLog) list = [...list].sort((a, b) => (b.imp + (mine(b) ? 1 : 0)) - (a.imp + (mine(a) ? 1 : 0)));
      else list = [...list].reverse();
      const shown = isLog ? list : list.slice(0, cat === 'all' ? 14 : 30);
      for (const e of shown) box.appendChild(h('div', { class: `log-item ${e.cat} imp${e.imp}${mine(e) ? ' mine' : ''}` }, isLog ? h('span', { class: 'muted small' }, `${SEASONS[e.turn % 4]} ${Game.sc.startYear + Math.floor(e.turn / 4)} · `) : null, e.text));
      if (shown.length < list.length) box.appendChild(h('p', { class: 'muted small' }, `+${list.length - shown.length} أحداث أقل أهمية — اختر فئة لعرضها.`));
      if (!list.length) box.appendChild(h('p', { class: 'muted' }, 'لا أحداث معروفة لك في هذه الفئة.'));
    };
    render();
    const e = Game.economy(P);
    UI.modal({
      title: isLog ? 'سجل الأحداث' : `${Game.season()} ${Game.year()}م`, cls: 'wide',
      body: h('div', null,
        !isLog ? h('div', { class: 'report-eco', dir: 'ltr' }, `💰 ${Game.f(P).gold} (${signed(e.netGold)}) · 🌾 ${Game.f(P).food} (${signed(e.netFood)}) · 👥 ${Game.manpowerOf(P)}`, Game.isWinter() ? ' · ❄️' : '') : null,
        !isLog && Game.isWinter() ? h('p', { class: 'hint' }, 'الشتاء: الممرات الجبلية أصعب، والإمداد أقل، والجيوش تأكل أكثر.') : null,
        !isLog && data.notes.length ? h('div', { class: 'events' }, data.notes.map((t) => h('p', { class: 'warn' }, t))) : null,
        tabs, box,
        !isLog && data.idle ? h('p', { class: 'hint' }, `تركتَ ${data.idle} ${data.idle === 1 ? 'جيشاً' : 'جيوش'} دون حركة أو تدريب.`) : null,
      ),
      buttons: [{ label: isLog ? 'إغلاق' : 'متابعة', primary: !isLog, onClick: () => { if (!isLog) this.captivePrompts(scene); } }],
      dismissable: isLog,
    });
  },

  // ——————————————— القائمة والحفظ ———————————————
  menu(scene) {
    UI.modal({
      title: 'القائمة',
      body: h('p', { class: 'muted' }, `${Game.sc.name} · ${Game.fname(scene.P)} · ${DIFFS[Game.S.difficulty].name}. تُحفظ اللعبة تلقائياً بعد كل إجراء.`),
      buttons: [
        { label: 'حفظ / تحميل', onClick: () => this.saves(scene) },
        { label: 'دليل الحرب', onClick: () => showGuide() },
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
    close = UI.modal({ title: 'حفظ وتحميل', body: list, buttons: [{ label: 'إغلاق' }], dismissable: true });
  },

  intro(scene) {
    const f = Game.f(scene.P);
    UI.modal({
      title: `${Game.sc.name} — ${f.name}`,
      body: h('div', null,
        h('p', { class: 'lead' }, Game.sc.intro),
        h('ul', { class: 'steps' },
          h('li', null, 'لكل جيش 4 نقاط حركة (🥾): السهول تكلف 2، التلال والغابات والصحراء 3، الجبال والممرات 4. يمكنك التحرك ثم الحصار أو الانضمام لجيش.'),
          h('li', null, 'كل قائد يقود 8 وحدات، ويمكن لعدة قادة البقاء في مدينة — لكن الازدحام فوق قدرة الإمداد يُنهك الجنود.'),
          h('li', null, 'التجنيد يستهلك القوى البشرية للمدينة (👥) التي تتجدد ببطء. الخسائر لها ثمن.'),
          h('li', null, 'المدن المحتلة حديثاً مضطربة: دخل قليل ولا تجنيد نظامي لعدة أدوار.'),
          h('li', null, 'القادة مختلفون فعلاً: مهندس الحصار، الإداري، ابن الجبال، الربّان… اختر لكل مهمة قائدها.'),
          h('li', null, 'في المعركة: اختر خطة قبل البدء، واستخدم أوامر القائد في اللحظة الحاسمة.'),
        ),
        h('p', { class: 'hint' }, 'النصر: أسقط الممالك المنافسة أو احكم ثلاثة أرباع المدن.'),
      ),
      buttons: [{ label: 'إلى المعركة', primary: true }],
    });
  },

  showEnd(scene) {
    const win = Game.S.over === 'win';
    Game.save();
    UI.modal({
      title: win ? 'توحّدت الأرض تحت رايتك!' : 'سقطت مملكتك', cls: win ? 'win' : 'lose',
      body: h('p', { class: 'lead' }, win ? `بعد ${Game.S.turn} دوراً من الحرب والدهاء، دانت لك البلاد.` : 'ضاعت آخر مدنك. سيذكر التاريخ أنك قاتلت.'),
      buttons: [{ label: 'القائمة الرئيسية', primary: true, onClick: () => { Game.clearSave(); showMainMenu(); } }],
    });
    void scene;
  },

  // ——————————————— قرارات أثناء أدوار الآخرين ———————————————
  proposal(p) {
    const f = Game.f(p.from);
    const P = Game.S.player;
    const text = {
      peace: `${f.name} تعرض الصلح${p.tribute ? ` وتدفع ${p.tribute}💰 تعويضاً` : ''}.`,
      tribute: `${f.name} تطالبك بجزية ${p.amount}💰 كل دور لمدة 8 أدوار، وتلوّح بالحرب إن رفضت.`,
      alliance: `${f.name} تعرض عليك حلفاً${Game.dominant() && Game.dominant() !== P ? ' ضد المملكة المتعاظمة' : ' ضد أعدائكما'}.`,
      trade: `${f.name} تقترح اتفاق تجارة: دخل إضافي للطرفين ومعرفة أفضل ببعضكما.`,
      marriage: `${f.name} تعرض مصاهرة سياسية بين البيتين: عهد طويل وعلاقة متينة.`,
      ransom: p.gen ? `${f.name} تعرض إطلاق قائدك ${p.gen.name} مقابل فدية ${p.price}💰.` : '',
      exchange: p.gen ? `${f.name} تعرض تبادل قائدك ${p.gen.name} بقائدها ${p.theirs.name} الأسير عندك.` : '',
      surrender: p.node ? `${f.name} تعرض على أهل ${p.node.name} الجائعين الأمان: تُسلَّم المدينة وتخرج حاميتك وجيشك بممر آمن.` : '',
    }[p.kind];
    const payLabel = { tribute: 'ادفع', ransom: 'ادفع الفدية', surrender: 'سلّم المدينة' }[p.kind] || 'اقبل';
    const cant = (p.kind === 'tribute' && Game.f(P).gold < p.amount) || (p.kind === 'ransom' && Game.f(P).gold < p.price);
    return UI.ask({
      title: 'رسول من ' + f.name,
      body: h('div', null, h('p', { class: 'lead' }, text), p.kind === 'tribute' ? h('p', { class: 'hint' }, 'الرفض قد يعني الحرب. القبول يستنزف خزينتك لكنه يشتري الوقت.') : null),
      buttons: [{ label: payLabel, value: true, primary: true, disabled: cant }, { label: 'ارفض', value: false }],
    });
  },

  occupation(node, how) {
    return UI.ask({
      title: `دخلتَ ${node.name}`,
      body: h('div', null,
        h('p', { class: 'lead' }, how === 'surrender' ? 'فتحت المدينة أبوابها. كيف تعامل أهلها؟' : 'سقطت المدينة. كيف تعامل أهلها؟'),
        h('ul', { class: 'steps' },
          h('li', null, h('b', null, 'الضمّ: '), 'ولاء متوسط واضطراب 4 أدوار.'),
          h('li', null, h('b', null, 'النهب: '), `غنيمة ~${Math.round(node.pop / 55)}💰 الآن، لكن السكان يقلّون، والولاء ينهار، والاضطراب يطول، وسمعتك تتضرر.`),
          h('li', null, h('b', null, 'الأمان: '), 'ولاء عالٍ واضطراب أقصر وسمعة أفضل، يكلّف 50💰.'),
        ),
      ),
      buttons: [
        { label: 'ضمّ المدينة', value: 'occupy', primary: true },
        { label: 'نهب', value: 'sack', danger: true },
        { label: 'إعلان الأمان', value: 'clemency' },
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
          h('div', { class: 'enc-h' }, h('i', { class: 'dot', style: { background: Game.f(fid).color } }), h('b', null, label)),
          gens.length ? gens.map((g) => h('div', { class: 'small' }, Game.genTitle(g), ' ', traitChip(g))) : h('div', { class: 'muted small' }, 'بلا قائد'),
          known ? h('div', { class: 'chips' }, regs.map((r) => regChip(r))) : h('p', { class: 'muted small' }, `${regs.length} وحدات تقريباً`),
          h('div', { class: 'small' }, known ? `${Game.menOf(regs) + gens.reduce((t, g) => t + Game.genMen(g), 0)} رجل` : `نحو ${Game.estimate(P, fid, Game.menOf(regs)).text} رجل`),
        );
      };
      const title = enc.type === 'assault' ? (enc.kind === 'siege' ? `اقتحام ${node.name}` : `معركة ${node.name}`) : (enc.type === 'sally' ? `الخروج من ${node.name}` : `فكّ حصار ${node.name}`);
      const lead = attacking ? '' : `${Game.fname(enc.attFid)} ${enc.type === 'assault' ? 'تهاجم' : 'تهاجم جيشك عند'} ${node.name}!`;
      const terr = enc.terrain || node.terrain;
      const info = [];
      if (enc.kind === 'siege') {
        const eq = enc.equip || {};
        info.push(`أسوار مستوى ${node.walls}`, [eq.tower && 'برج حصار', eq.ram && 'كبش', eq.ladders && 'سلالم'].filter(Boolean).join(' و') || 'بلا معدات حصار');
        if (node.stores < 0) info.push('المدافعون جائعون');
      }
      let closeFn = null;
      const fight = () => { if (closeFn) closeFn(); launchBattle(enc, resolve); };
      const auto = () => { if (closeFn) closeFn(); const out = Game.autoResolve(enc); this.autoResult(enc, out, () => resolve(out)); };
      const buttons = [
        { label: attacking ? 'قُد المعركة ⚔️' : 'قُد الدفاع ⚔️', primary: true, onClick: fight },
        { label: 'حسم سريع 🎲', onClick: auto },
      ];
      if (attacking) {
        buttons.push({ label: 'تفاوض 🗣️', keep: true, onClick: (close) => { close(); this.negotiate(scene, enc, resolve); } });
        buttons.push({ label: enc.kind === 'siege' ? 'لاحقاً' : 'تراجع', onClick: () => resolve('cancel') });
      } else if (enc.type === 'assault' && enc.kind === 'siege') {
        const cost = Math.round(Game.menOf(s.attRegs) * 1.1 + 40);
        buttons.push({
          label: `فدية ${cost}💰`, disabled: Game.f(P).gold < cost, keep: true, onClick: (close) => {
            if (R() < 0.5 && !(Game.f(enc.attFid).vendetta[P] > 0)) {
              close(); Game.f(P).gold -= cost; Game.f(enc.attFid).gold += cost;
              for (const id of enc.att) { const a = Game.army(id); if (a) Game.retreatHome(a, [], null, a.siege ? a.siege.from : a.from); }
              UI.toast('قبل العدو الفدية وانسحب'); resolve('settled');
            } else UI.toast('رفض العدو الفدية! لا بدّ من القتال');
          },
        });
      }
      closeFn = UI.modal({
        title, cls: 'enc',
        body: h('div', null,
          lead ? h('p', { class: 'lead warn' }, lead) : null,
          h('p', { class: 'terrain-tip' }, h('b', null, TERRAIN[terr].name + ': '), TERRAIN_TIPS[terr]),
          info.length ? h('p', { class: 'muted small' }, info.join(' · ')) : null,
          h('div', { class: 'enc-sides' },
            sideBox(attacking ? 'جيشك' : Game.fname(enc.attFid), enc.attFid, s.attRegs, s.attGens),
            h('div', { class: 'vs' }, '⚔'),
            sideBox(attacking ? Game.fname(enc.defFid) : 'المدافعون', enc.defFid, s.defRegs, s.defGens),
          ),
          this.powerCompare(enc, P),
        ),
        buttons,
      });
    });
  },

  negotiate(scene, enc, resolve) {
    const P = Game.S.player;
    const cost = Game.bribeCost(enc);
    const back = () => this.encounter(scene, enc).then(resolve);
    UI.modal({
      title: 'التفاوض',
      body: h('div', null,
        h('p', null, enc.type === 'assault' ? 'أرسل رسولاً إلى المدينة:' : 'أرسل رسولاً إلى جيش العدو:'),
        h('ul', { class: 'steps' },
          h('li', null, h('b', null, 'طلب الاستسلام: '), 'ينجح إن كان جيشك أقوى بكثير أو المدينة جائعة، وتساعده سمعتك. المدافعون يخرجون بممر آمن.'),
          h('li', null, h('b', null, `شراء الولاء (${cost}💰): `), 'رشوة القادة والأعيان — الشجعان والصامدون يرفضون غالباً، والطمّاعون يقبلون.'),
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
  },

  autoResult(enc, out, cb) {
    const P = Game.S.player;
    const mine = (enc.attFid === P ? 0 : 1) === out.winner;
    const lost = Object.entries(out.fates).map(([id, fate]) => `${Game.gen(id).name}: ${fate === 'captured' ? 'أُسر' : 'قُتل'}`);
    UI.modal({
      title: mine ? 'نصر' : 'هزيمة', cls: mine ? 'win' : 'lose',
      body: h('div', null, h('p', { class: 'lead' }, mine ? 'حُسمت المعركة لصالحك.' : 'دارت الدائرة على جيشك.'), lost.length ? h('p', { class: 'warn small' }, lost.join(' · ')) : null),
      buttons: [{ label: 'متابعة', primary: true, onClick: cb }],
    });
  },
};
