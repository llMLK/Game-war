'use strict';
// واجهة القادة: بطاقات بدرجات هيبة، وملف كامل، ومجلس الحرب وفرصه، وصفحة التفاوض قبل التعيين.

Object.assign(Explain, {
  genWage(g) {
    const d = Game.wageDemand(g);
    const x = { icon: 'coins', title: `راتب ${g.name}`, value: `${Game.genSalary(g)} كل دور` };
    x.state = g.status === 'pool' ? 'في البلاط بلا جيش: يُدفع له نصف راتبه المتفق عليه.' : 'يُدفع كل دور ما دام في خدمتك.';
    x.now = [['المتفق عليه', g.wage != null ? g.wage : d.total], ['ما يراه حقه الآن', d.total, d.total > (g.wage || 0) * 1.15 ? 'neg' : '']];
    x.from = [...d.parts.map(([k, v]) => [k, signed(v), v >= 0 ? '' : 'pos']), ['المطلوب', d.total, 'sum']];
    x.note = 'الأغلى لا يعني الأفضل في كل شيء: قائد رخيص متخصص في أرض المعركة قد يفوق أسطورة في غير أرضه.';
    return x;
  },
  capacity(fid) {
    const c = Game.cmdCapacity(fid);
    const x = { icon: 'seal', title: 'مجلس الحرب', value: `${Game.cmdCount(fid)} من ${c.slots}` };
    x.state = 'عدد القادة الذين تستطيع دولتك إدارتهم. لا يُشترى بالمال: يتسع مع رتبة الدولة ومؤسستها العسكرية وهيبتها.';
    x.from = [...c.parts.map(([k, v]) => [k, '+' + v, 'pos']), ['المقاعد', c.slots, 'sum']];
    x.improve = ['إمارة (أقل من 4 مدن) 3 مقاعد، مملكة 6، إمبراطورية (10 مدن فأكثر) 8.', 'ديوان الجند في العاصمة: مقعد لكل مستوى.', 'سمعة 70 فأكثر: مقعد.', 'الحاكم لا يشغل مقعداً، والضباط لا يُحسبون.'];
    return x;
  },
});

// شريط صغير بدرجة الهيبة
function prestigeChip(g) {
  const p = Game.prestigeOf(g);
  return h('button', { class: 'pchip ' + p.cls, onclick: (e) => { e.stopPropagation(); Help.explain(e.currentTarget, { icon: 'laurel', title: `الهيبة: ${p.name}`, value: `${Math.round(g.fame || 0)} نقطة`, state: 'تأتي من سيرته التاريخية ومن انتصاراته وفتوحه وألقابه في هذه الحملة. الأسطوري لا يعني النصر المضمون: يعني أن الرجال يعرفون اسمه.', from: PRESTIGE.map((x) => [x.name, `${x.min}+`, x === p ? 'sum' : '']) }); } }, p.name);
}

Object.assign(Panels, {
  // بطاقة قائد مختصرة: الصورة والاسم واللقب والدرجة والموهبة والراتب والولاء
  genCard(g, extra) {
    if (!g.rec && !Game.isOfficer(g)) Game.enrichGen(g);
    const ruler = Game.isRuler && Game.isRuler(g), heir = Game.isHeir && Game.isHeir(g);
    const own = g.fid === Game.S.player;
    const p = Game.prestigeOf(g);
    const A = ARCH[g.arch || g.trait || 'none'] || ARCH.none;
    const title = g.titles && g.titles.length ? g.titles[g.titles.length - 1].t : null;
    return h('div', { class: 'gcard tier ' + p.cls + (ruler ? ' ruler' : ''), onclick: () => this.cmdProfile(g) },
      h('div', { class: 'gc-row' },
        Portrait.el(g, 54),
        h('div', { class: 'gc-main' },
          h('div', { class: 'gtop' }, h('b', null, ruler ? icon('crown', 'crown-i') : null, g.name), stars(g.rank), prestigeChip(g)),
          title ? h('div', { class: 'gc-title' }, title) : null,
          h('div', { class: 'gline' }, h('span', { class: 'arch' }, A.name), traitChip(g), ruler ? h('span', { class: 'tag' }, 'الحاكم') : null, heir ? h('span', { class: 'tag' }, icon('seal'), 'ولي العهد') : null,
            own && !ruler && g.loy != null && Game.employed(g) ? xstat('genloy', g.loy, () => Explain.genLoyalty(g), { label: g.loy < 32 ? 'طامح' : g.loy < 45 ? 'ساخط' : 'الولاء', cls: g.loy < 32 ? 'bad' : g.loy < 45 ? 'warn' : '' }) : null,
            own && !ruler && Game.employed(g) ? xstat('upkeep', Game.genSalary(g), () => Explain.genWage(g), { icon: 'coins', label: 'راتب' }) : null,
            g.ask ? h('span', { class: 'tag warn' }, icon('bell'), 'يطلب') : null),
        ),
      ),
      extra || null,
    );
  },

  // الملف الكامل للقائد
  cmdProfile(g) {
    if (!g.rec && !Game.isOfficer(g)) Game.enrichGen(g);
    const P = Game.S.player, own = g.fid === P;
    const e = Game.catOf(g);
    const A = ARCH[g.arch || 'none'] || ARCH.none;
    const age = Game.cmdAge(g);
    const rec = g.rec || {};
    const url = Game.wikiUrl(e);
    const src = g.src === 'hist' ? 'سيرة موثقة' : g.src === 'novel' ? 'من رواية لاحقة، لا ذكر له في السجلات' : Game.isOfficer(g) ? 'ضابط من عامة الجند' : 'شخصية متخيَّلة من صنع اللعبة';
    const line = Voices.current(g);
    const lineBox = line ? h('div', { class: 'quote' }, h('p', null, '«', h('span', { class: 'qt' }, line.text), '»'), h('span', { class: 'muted small' }, 'لماذا يقول هذا: ', line.why)) : null;
    if (line && Voices.sampler) lineBox.appendChild(h('button', { class: 'chip', onclick: async (ev) => { const b = ev.currentTarget; b.disabled = true; const t = await Voices.rephrase(line); if (t) lineBox.querySelector('.qt').textContent = t; b.remove(); } }, 'صياغة أخرى بالذكاء الاصطناعي'));
    const L = (k, v) => h('div', { class: 'pl' }, h('span', null, k), h('span', { class: 'v' }, rich(v)));
    const acts = [];
    if (own && g.ask && g.ask.k === 'raise') {
      acts.push({ label: `وافق: راتبه ${g.ask.to}`, primary: true, onClick: () => { Game.answerAsk(g, true); UI.toast(`${g.name} راضٍ`); App.scene.refresh(); } });
      acts.push({ label: 'ارفض الزيادة', onClick: () => { Game.answerAsk(g, false); UI.toast(`${g.name} يتذكر الرفض`); App.scene.refresh(); } });
    }
    if (own && Game.employed(g) && !Game.isRuler(g)) {
      acts.push({ label: `كرّمه ${Game.honorCost(g)}`, icon: 'star', disabled: Game.f(P).gold < Game.honorCost(g), why: 'الذهب لا يكفي', onClick: () => { const er = Game.honorGeneral(P, g); UI.toast(er || `كرّمتَ ${g.name}`); App.scene.refresh(); } });
      acts.push({ label: 'إعفاؤه من الخدمة', ghost: true, onClick: () => UI.ask({ title: `إعفاء ${g.name}؟`, icon: 'close', body: h('p', null, 'يعتزل مكرّماً ويفرغ مقعده في مجلس الحرب. لا يعود، ورفاقه يحزنون قليلاً.'), buttons: [{ label: 'أعفِه', danger: true, value: true }, { label: 'تراجع', value: false }] }).then((ok) => { if (!ok) return; const er = Game.retireGeneral(g); UI.toast(er || `${g.name} يعتزل`); if (!er) App.scene.afterAction(); }) });
    }
    acts.push({ label: 'إغلاق', ghost: !acts.length ? false : true });
    UI.modal({
      title: Game.genTitle(g), icon: 'helmet', cls: 'wide cmd-profile',
      body: h('div', null,
        h('div', { class: 'cp-head tier ' + Game.prestigeOf(g).cls },
          Portrait.el(g, 112),
          h('div', null,
            h('div', { class: 'gtop' }, stars(g.rank), prestigeChip(g), h('span', { class: 'arch' }, A.name)),
            h('p', { class: 'small' }, `${Game.fname(g.fid)}${age != null ? ` · العمر ${age}` : ' · العمر غير معروف'}${g.status === 'army' ? ' · في الميدان' : g.status === 'gov' ? ' · حاكم مدينة' : g.status === 'pool' ? ' · في البلاط' : g.status === 'captive' ? ' · أسير' : g.status === 'dead' ? ' · راحل' : ''}`),
            h('p', { class: 'small muted' }, src, url ? ' · ' : null, url ? h('a', { href: url, target: '_blank', rel: 'noopener' }, 'ويكيبيديا') : null),
          ),
        ),
        e && e.bio ? h('p', { class: 'bio' }, h('b', null, 'من التاريخ: '), e.bio) : g.src !== 'hist' ? h('p', { class: 'bio muted small' }, 'لا سيرة تاريخية: ما يلي من هذه الحملة وحدها.') : null,
        lineBox,
        h('div', { class: 'cp-grid' },
          h('div', { class: 'pop-lines' },
            L('يتقن', A.strong), L('يضعف في', A.weak), L('الأسلوب', STYLES[g.style] || '-'), L('العقيدة', DOCTRINES[g.doctrine] || '-'),
            g.terrain && g.terrain.length ? L('أرضه المفضلة', g.terrain.map((t) => TERRAIN_AR[t]).join('، ')) : null,
            g.units && g.units.length ? L('يحسن قيادة', g.units.map((u) => UNITCLS_AR[u]).join('، ')) : null,
            L('القيادة', `${g.lead || 1} من 5`), L('الطموح', ['قانع', 'عادي', 'طموح', 'طموح جداً'][g.ambition || 0]),
            g.flaw ? L('عيبه', `${FLAWS[g.flaw].name}: ${FLAWS[g.flaw].desc}`) : null,
          ),
          h('div', { class: 'pop-lines' },
            L('المعارك', `${rec.battles || 0} (نصر ${rec.wins || 0}، هزيمة ${rec.losses || 0})`),
            L('المدن التي فتحها', (rec.cities || []).length ? rec.cities.slice(-4).join('، ') : 'لا شيء بعد'),
            L('الجراح', rec.wounds || 0), L('وقع في الأسر', rec.captured || 0),
            (rec.beaten || []).length ? L('هزم', rec.beaten.slice(-3).join('، ')) : null,
            (rec.famous || []).length ? L('معارك مشهورة', [...new Set(rec.famous)].slice(-3).join('، ')) : null,
            (g.titles || []).length ? L('ألقابه', g.titles.map((t) => t.t).join('، ')) : null,
            (g.scars || []).length ? L('ندوبه', g.scars.slice(-2).join('، ')) : null,
            Game.friendsOf(g).length ? L('رفاق السلاح', Game.friendsOf(g).map((x) => x.name).join('، ')) : null,
            g.rival && Game.gen(g.rival) ? L('خصمه', Game.gen(g.rival).name) : null,
          ),
        ),
        (g.mem || []).length ? h('details', { class: 'mem' }, h('summary', null, `ذاكرته (${g.mem.length})`), h('ul', { class: 'steps small' }, g.mem.slice().reverse().slice(0, 8).map((m) => h('li', null, `${WX.when(m.turn)}: ${m.text}`, m.loy ? h('span', { class: m.loy > 0 ? 'good' : 'bad' }, ` (الولاء ${signed(m.loy)})`) : null)))) : null,
      ),
      buttons: acts, dismissable: true,
    });
  },

  // مجلس الحرب: المقاعد والنفوذ والفرص المعلقة
  councilBox(scene) {
    const P = scene.P;
    const cap = Game.cmdCapacity(P), n = Game.cmdCount(P), d = Game.draftOf(P);
    const ops = Game.oppsOf(P);
    const box = h('div', { class: 'box council' },
      h('div', { class: 'sec-h' }, icon('seal'), 'مجلس الحرب',
        xstat('genloy', `${n} من ${cap.slots}`, () => Explain.capacity(P), { icon: 'helmet', label: 'المقاعد', cls: n >= cap.slots ? 'warn' : '' }),
        xstat('genloy', d, () => ({ icon: 'seal', title: 'نفوذ مجلس الحرب', value: `${d} من ${DRAFT_MAX}`, state: 'مورد محدود لاستبعاد مرشح والحصول على غيره. لا يُشترى.', improve: ['فتح مدينة مهمة (عاصمة أو كبيرة).', 'نصر كبير.', 'ارتفاع رتبة الدولة.', 'ختام فصل من الحملة.'] }), { icon: 'scroll', label: 'النفوذ' })),
    );
    if (ops.length) {
      for (const op of ops) box.appendChild(h('button', { class: 'opp-row', onclick: () => this.oppDialog(scene, op) }, icon('helmet'), h('b', null, `فرصة استقطاب: ${OPP_WHY[op.why] || op.why}`), h('span', { class: 'muted small' }, op.cands.filter(Boolean).map((c) => c.n).join(' أو '))));
    } else box.appendChild(h('p', { class: 'hint' }, 'لا فرص الآن. تأتي الفرص من فتح مدينة مهمة، أو نصر كبير، أو ارتفاع رتبة الدولة، أو بناء ديوان الجند، أو فقد قائد.'));
    return box;
  },

  // الفرصة: مرشحان، تختار أحدهما
  oppDialog(scene, op) {
    const P = scene.P;
    let close;
    const card = (c, i) => {
      if (!c) return h('div', { class: 'cand gone' }, h('p', { class: 'muted' }, 'رحل هذا المرشح.'));
      const v = Game.candView(c, P);
      const e = c.cat ? Game.catFind(c.n) : null;
      const A = ARCH[v.arch] || ARCH.none;
      return h('div', { class: 'cand tier ' + Game.prestigeOf(v).cls },
        Portrait.el(v, 96),
        h('b', { class: 'cn' }, v.name), h('div', { class: 'gtop' }, stars(v.rank), prestigeChip(v)),
        h('span', { class: 'arch' }, A.name), traitChip(v),
        h('p', { class: 'small' }, e ? e.bio : 'شخصية متخيَّلة من صنع اللعبة: لا سيرة تاريخية لها.'),
        h('p', { class: 'small muted' }, `يطلب ${v.demand.total} كل دور${Game.cmdAge(v) != null ? ` · العمر ${Game.cmdAge(v)}` : ''}`),
        h('div', { class: 'row-btns' },
          actBtn([icon('talk'), 'فاوضه'], { cls: 'btn primary', err: Game.cmdRoom(P) <= 0 ? `مجلس الحرب ممتلئ (${Game.cmdCount(P)} من ${Game.cmdCapacity(P).slots}): أعفِ قائداً أو وسّع المجلس` : null, onClick: () => { close(); this.negotiateDialog(scene, op, i); } }),
          actBtn([icon('retreat'), 'استبدله'], { cls: 'btn', err: Game.draftOf(P) <= 0 ? 'لا نفوذ في مجلس الحرب لاستبدال مرشح' : null, onClick: () => { const er = Game.replaceCand(P, op.id, i); if (er) { UI.toast(er); return; } close(); this.oppDialog(scene, op); } }),
        ));
    };
    close = UI.modal({
      title: `فرصة استقطاب: ${OPP_WHY[op.why] || op.why}`, icon: 'helmet', cls: 'wide',
      body: h('div', null, h('p', { class: 'hint' }, `اختر أحدهما فقط. ${Game.draftOf(P) ? `لديك ${Game.draftOf(P)} من نفوذ مجلس الحرب لاستبدال مرشح.` : ''} الفرصة تبقى حتى تستعملها.`), h('div', { class: 'cands' }, op.cands.map(card))),
      buttons: [{ label: 'لاحقاً', ghost: true }], dismissable: true,
    });
  },

  // التفاوض قبل التعيين: عرض براتب، ورد فعل حي، ووعد اختياري
  negotiateDialog(scene, op, i) {
    const P = scene.P;
    const c = op.cands[i];
    if (!c) return;
    const v = Game.candView(c, P);
    const dem = v.demand.total;
    let wage = dem, promise = false;
    const val = h('b', { class: 'nv' }), react = h('span', { class: 'react' });
    const upd = () => {
      val.textContent = wage;
      const r = Game.offerReaction(c, P, wage, promise);
      react.textContent = r.name; react.className = 'react ' + r.k;
    };
    const range = h('input', { type: 'range', min: Math.max(2, Math.round(dem * 0.6)), max: Math.round(dem * 1.3) + 1, step: 1, value: dem });
    range.addEventListener('input', () => { wage = +range.value; upd(); });
    const canPromise = v.ambition >= 2 || v.fame >= 45;
    const prom = canPromise ? h('label', { class: 'check-row' }, h('input', { type: 'checkbox', onchange: (e) => { promise = e.target.checked; upd(); } }), ' عِده بقيادة جيش كبير خلال أربعة أدوار (يقبل أجراً أقل، وإن أخلفت الوعد غضب)') : null;
    upd();
    const close = UI.modal({
      title: `التفاوض مع ${v.name}`, icon: 'talk', cls: 'wide',
      body: h('div', { class: 'nego' },
        h('div', { class: 'cp-head tier ' + Game.prestigeOf(v).cls }, Portrait.el(v, 96), h('div', null, h('div', { class: 'gtop' }, stars(v.rank), prestigeChip(v), h('span', { class: 'arch' }, (ARCH[v.arch] || ARCH.none).name)), traitChip(v), h('p', { class: 'small' }, (ARCH[v.arch] || ARCH.none).strong))),
        h('div', { class: 'pop-lines' }, ...v.demand.parts.map(([k, x]) => h('div', { class: 'pl' }, h('span', null, rich(k)), h('span', { class: 'v' }, signed(x)))), h('div', { class: 'pl sum' }, h('span', null, 'راتبه المطلوب كل دور'), h('span', { class: 'v' }, String(dem)))),
        h('div', { class: 'nego-row' }, h('span', null, 'عرضك كل دور: '), val, h('span', null, ' · رأيه: '), react),
        range, prom,
        h('p', { class: 'hint' }, 'كلما اقترب العرض من توقعاته تحسّن قبوله. الطموح يريد أكثر، ومن هو من أهل دولتك يقبل أقل. إن رفض مرتين رحل. الراتب السخي يرفع ولاءه من البداية.'),
      ),
      buttons: [
        { label: 'قدّم العرض', primary: true, keep: true, onClick: (cl) => {
          const r = Game.proposeContract(P, op.id, i, wage, promise);
          if (r.err) { UI.toast(r.err); return; }
          if (r.ok) { cl(); UI.toast(`${r.g.name} يدخل خدمتك براتب ${r.g.wage}`); if (Game.track) Game.track('hire'); scene.afterAction(); this.cmdProfile(r.g); return; }
          UI.toast(r.msg); if (r.gone) { cl(); scene.afterAction(); }
        } },
        { label: 'رجوع', onClick: () => this.oppDialog(scene, op) },
      ],
    });
    void close;
  },

  // اختيار قائد للجيش الجديد: من في البلاط بلا كلفة إضافية، أو ترقية ضابط
  generalPicker(fid, opts = {}) {
    return new Promise((resolve) => {
      const pool = Game.poolOf(fid).filter((g) => !Game.isOfficer(g)).sort((a, b) => b.rank - a.rank);
      const list = h('div', { class: 'glist' });
      let close;
      for (const g of pool) list.appendChild(h('div', { class: 'gpick-wrap' }, this.genCard(g, h('button', { class: 'btn primary sm', onclick: (e) => { e.stopPropagation(); close(); resolve(g.id); } }, icon('helmet'), 'عيّنه'))));
      if (!pool.length) list.appendChild(h('p', { class: 'muted' }, 'لا قادة في البلاط. الفرص في مجلس الحرب تأتي بقادة جدد، ويمكنك ترقية ضابط.'));
      close = UI.modal({
        title: opts.title || 'اختر قائداً', icon: 'helmet', cls: 'wide',
        body: h('div', null, h('p', { class: 'hint' }, 'قادة البلاط يتقاضون نصف رواتبهم وهم ينتظرون؛ تعيينهم لا يكلّف شيئاً إضافياً غير راتبهم الكامل. الضابط رجل بلا موهبة، أوامره أقل دقة، ولا يشغل مقعداً في المجلس.'), list),
        buttons: [
          opts.allowOfficer !== false ? { label: 'ترقية ضابط', sub: '40 ذهباً', disabled: Game.f(fid).gold < 40, why: 'الذهب لا يكفي (40)', onClick: () => resolve('officer') } : null,
          { label: 'إلغاء', onClick: () => resolve(null) },
        ],
      });
    });
  },
});

// شاشة المملكة: مجلس الحرب أعلى قائمة القادة
(() => {
  const kingdomBody = Panels.kingdomBody;
  Panels.kingdomBody = function (scene, body) {
    kingdomBody.call(this, scene, body);
    if ((scene.kingTab || 'goals') === 'gens') {
      const seg = body.querySelector('.seg');
      const box = this.councilBox(scene);
      if (seg && seg.nextSibling) body.insertBefore(box, seg.nextSibling); else body.appendChild(box);
    }
  };
  const focusAlert = CampaignScene.prototype.focusAlert;
  CampaignScene.prototype.focusAlert = function (a) {
    if (a.win === 'opps') { this.openKingdom('gens'); const op = Game.oppsOf(this.P)[0]; if (op) Panels.oppDialog(this, op); return; }
    if (a.win && a.win.startsWith('gen:')) { const g = Game.gen(a.win.slice(4)); if (g) Panels.cmdProfile(g); return; }
    return focusAlert.call(this, a);
  };
})();
