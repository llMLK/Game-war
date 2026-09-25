'use strict';
// واجهة الدبلوماسية والتجسس والفتح: كل قرار يُعرض قبله ما سيحدث وأسبابه

const BAND_CLS = { 'غير مقبول': 'bad', 'ضعيف': 'bad', 'محتمل': 'warn', 'جيد': 'good', 'مرجح': 'good' };
const bandTag = (band) => h('span', { class: 'tag ' + (BAND_CLS[band] || '') }, band);
const partLines = (parts, sumLabel, sum) => h('div', { class: 'pop-lines' },
  ...parts.map(([k, v]) => h('div', { class: 'pl' }, h('span', null, rich(k)), h('span', { class: 'v ' + (v > 0 ? 'pos' : v < 0 ? 'neg' : '') }, typeof v === 'number' ? signed(Math.round(v)) : String(v)))),
  sumLabel ? h('div', { class: 'pl sum' }, h('span', null, sumLabel), h('span', { class: 'v' }, typeof sum === 'number' ? signed(Math.round(sum)) : String(sum))) : null);

Object.assign(Panels, {
  // ═══════ الصلح ═══════
  warBox(P, id) {
    const ws = Game.warScore(P, id);
    const w = Game.warRec(P, id);
    return h('div', { class: 'box' },
      h('div', { class: 'sec-h' }, icon('scales'), 'ميزان الحرب من منظورك', h('span', { class: 'sp' }), h('b', { class: ws.score > 10 ? 'good' : ws.score < -10 ? 'bad' : '' }, signed(ws.score))),
      partLines(ws.parts.length ? ws.parts : [['لا وقائع بعد', 0]]),
      w ? h('p', { class: 'hint' }, `الحرب منذ الدور ${w.since + 1} (${ws.turns} أدوار).`) : null,
    );
  },
  peaceDialog(scene, id, preset) {
    const P = scene.P, myF = Game.f(P), F = Game.f(id);
    const inc = Math.max(40, Game.economy(id).income);
    const maxDemand = Math.round((Math.max(0, F.gold) + inc * 6) / 10) * 10;
    const maxPay = Math.max(0, Math.round(myF.gold / 10) * 10);
    const fair = Game.peaceFair(id, P, 0.5);
    // gold موجب: أنت تدفع؛ سالب: هم يدفعون
    let amount = preset != null ? preset : clamp(fair, -maxDemand, maxPay);
    let overTurns = false, city = null;
    const caps = Game.captivesHeldBy(P).filter((g) => g.fid === id);
    const capSel = new Set();
    const cities = Game.nodesOf(id).filter((n) => Game.besiegers(n.id).some((b) => b.fid === P) || Game.adjAll(n.id).some((x) => Game.node(x).owner === P)).filter((n) => !n.capital);
    const terms = () => {
      const t = { payer: amount > 0 ? P : amount < 0 ? id : null, gold: Math.abs(amount), perTurn: 0, turns: 0, city, captives: [...capSel] };
      if (overTurns && t.payer && t.gold) { t.perTurn = Math.ceil(t.gold * 1.15 / 6 / 5) * 5; t.turns = 6; t.gold = 0; }
      if (t.payer === P && t.gold > myF.gold) t.gold = myF.gold;
      return t;
    };
    const out = h('div', { class: 'peace-live' });
    const val = h('b', { class: 'nv' });
    const range = h('input', { type: 'range', min: -maxDemand, max: maxPay, step: 10, value: amount });
    range.addEventListener('input', () => { amount = +range.value; upd(); });
    const upd = () => {
      const t = terms();
      const c = Game.peaceChance(id, P, t);
      val.textContent = amount === 0 ? 'صلح بلا مال' : amount > 0 ? `تدفع ${t.perTurn ? t.perTurn + ' كل دور لستة أدوار' : amount}` : `يدفعون ${t.perTurn ? t.perTurn + ' كل دور لستة أدوار' : -amount}`;
      out.innerHTML = '';
      out.append(
        h('div', { class: 'nego-row' }, h('span', null, 'احتمال القبول: '), bandTag(c.band), c.why ? h('span', { class: 'hint' }, ' ', c.why) : null),
        c.urge ? h('details', { class: 'ord-more' }, h('summary', null, `ما يدفع ${F.name} إلى الصلح أو يبعدها عنه`), partLines(c.urge.parts, 'المجموع', c.urge.v)) : null,
      );
    };
    const fairTxt = fair > 0 ? `تطلب نحو ${fair} ذهباً` : fair < 0 ? `مستعدة لدفع نحو ${-fair} ذهباً` : 'صلحاً بلا مال';
    const optRow = h('div', { class: 'acts' },
      h('label', { class: 'check-row' }, h('input', { type: 'checkbox', onchange: (e) => { overTurns = e.target.checked; upd(); } }), ' جزية على ستة أدوار بدل دفعة واحدة (+15٪ مجموعاً، والدافع يقبلها أسهل)'),
      cities.length ? h('select', { class: 'sel', onchange: (e) => { city = e.target.value || null; upd(); } }, h('option', { value: '' }, 'بلا مدينة'), cities.map((n) => h('option', { value: n.id }, `تسليم ${n.name}`))) : null,
      ...caps.map((g) => h('label', { class: 'check-row' }, h('input', { type: 'checkbox', onchange: (e) => { if (e.target.checked) capSel.add(g.id); else capSel.delete(g.id); upd(); } }), ` إطلاق ${g.name} الأسير`)),
    );
    upd();
    const wait = Game.envoyWait(P, id);
    UI.modal({
      title: `مفاوضات الصلح مع ${F.name}`, icon: 'dove', cls: 'wide',
      body: h('div', { class: 'nego' },
        this.warBox(P, id),
        h('p', { class: 'small' }, rich(`بحسب حال الحرب ${F.name} ${fairTxt}. هذا المبلغ يتغير مع المعارك والحصار والمدن.`)),
        h('div', { class: 'nego-row' }, h('span', null, 'عرضك: '), val),
        range,
        h('div', { class: 'range-ends small muted' }, h('span', null, `يدفعون ${maxDemand}`), h('span', null, `تدفع ${maxPay}`)),
        optRow, out,
        wait ? h('p', { class: 'hint warn' }, `أرسلت رسولاً هذا الدور. العرض القادم في الدور التالي.`) : h('p', { class: 'hint' }, 'رسول واحد كل دور. إن رفضوا قد يقترحون عرضاً مضاداً تقبله أو ترفضه.'),
      ),
      buttons: [
        { label: 'أرسل العرض', primary: true, disabled: !!wait, why: 'رسول واحد كل دور', keep: true, onClick: (cl) => {
          const r = Game.proposePeaceTerms(P, id, terms());
          if (r.err) { UI.toast(r.err); return; }
          cl();
          if (Game.track) Game.track('diplo');
          if (r.ok) { UI.toast(`${F.name} تقبل الصلح`); this.afterPeace(scene); return; }
          this.counterDialog(scene, id, r);
        } },
        { label: 'إغلاق' },
      ],
    });
  },
  termsText(t, P) {
    const who = (x) => (x === P ? 'تدفع' : `${Game.fname(x)} تدفع`);
    const bits = [];
    if (t.payer && t.gold) bits.push(`${who(t.payer)} ${t.gold} الآن`);
    if (t.payer && t.perTurn) bits.push(`${who(t.payer)} ${t.perTurn} كل دور لـ${t.turns} أدوار`);
    if (t.city) bits.push(`تسليم ${Game.node(t.city).name}`);
    if ((t.captives || []).length) bits.push(`إطلاق ${t.captives.map((id) => Game.gen(id).name).join('، ')}`);
    return bits.length ? bits.join('، ') : 'صلح بلا مال';
  },
  counterDialog(scene, id, r) {
    const P = scene.P, F = Game.f(id);
    const c = r.counter;
    UI.modal({
      title: `${F.name} ترفض`, icon: 'treaty',
      body: h('div', null,
        h('p', { class: 'lead' }, rich(`احتمال القبول كان «${r.c.band}». ${r.c.why || ''}`)),
        c ? h('p', null, rich(`عرضها المضاد: ${this.termsText(c, P)}. تقبله الآن إن وافقت، ويسقط بنهاية الدور.`)) : h('p', { class: 'hint' }, 'لم تقدّم عرضاً مضاداً: ما زالت ترى أن الحرب في صالحها.'),
      ),
      buttons: [
        c ? { label: 'اقبل العرض المضاد', primary: true, disabled: c.payer === P && c.gold > Game.f(P).gold, why: 'الذهب لا يكفي', onClick: () => { const x = Game.acceptCounter(P, id, c); UI.toast(x.err || `صلح مع ${F.name}`); if (!x.err) this.afterPeace(scene); } } : null,
        { label: c ? 'ارفض' : 'حسناً', onClick: () => scene.afterAction && scene.afterAction() },
      ].filter(Boolean),
    });
  },
  afterPeace(scene) {
    const s = Game.spoilsTo;
    if (s && s.winner === scene.P) {
      UI.ask({
        title: 'غنيمة الصلح والحليف', icon: 'coins',
        body: h('div', null, h('p', { class: 'lead' }, rich(`${Game.fname(s.ally)} قاتلت معك ${Game.fname(s.enemy)}، ومساهمتها ${Math.round(s.share * 100)}٪ من جهدكما.`)),
          h('ul', { class: 'steps' }, h('li', null, rich(`تقاسم الغنيمة: تعطيها ${s.cut} ذهباً، والعلاقة +10.`)), h('li', null, 'الاحتفاظ بها: العلاقة −15، وتذكر أنك صالحت منفرداً.'))),
        buttons: [{ label: `أعطها ${s.cut}`, value: true, primary: true, disabled: Game.f(scene.P).gold < s.cut, why: 'الذهب لا يكفي' }, { label: 'احتفظ بها', value: false }],
      }).then((give) => { Game.shareSpoils(!!give); if (scene.afterAction) scene.afterAction(); });
    } else if (scene.afterAction) scene.afterAction();
  },

  // ═══════ تنسيق الحرب مع الحليف ═══════
  contribBox(P, ally) {
    const wars = Game.commonWars(P, ally);
    if (!wars.length) return null;
    return h('div', { class: 'box' }, wars.map((e) => {
      const share = Game.contribShare(P, e, ally);
      return h('div', null,
        h('div', { class: 'sec-h' }, icon('scales'), `الجهد في الحرب على ${Game.fname(e)}`),
        h('div', { class: 'cbar' }, h('i', { style: { width: Math.round(share * 100) + '%' } })),
        h('div', { class: 'cl' }, h('span', null, `أنت ${Math.round(share * 100)}٪`), h('span', null, `${Game.fname(ally)} ${100 - Math.round(share * 100)}٪`)),
        h('details', { class: 'ord-more' }, h('summary', null, 'من أين جاء الرقم'),
          h('div', { class: 'cols2' }, partLines(Game.contribParts(P, e).map(([k, v]) => [k, v])), partLines(Game.contribParts(ally, e).map(([k, v]) => [k, v])))),
        h('p', { class: 'hint' }, 'مساهمتك تغيّر علاقتها بك، وقبولها طلباتك، ونصيبها من الغنيمة إن صالحت، وطلباتها منك.'),
      );
    }));
  },
  coordDialog(scene, ally) {
    const P = scene.P;
    let kind = 'attack';
    const body = h('div');
    let close;
    const render = () => {
      body.innerHTML = '';
      const seg = h('div', { class: 'seg' }, Object.entries(COORD).map(([k, c]) => h('button', { class: k === kind ? 'on' : '', onclick: () => { kind = k; render(); } }, icon(c.icon), c.name)));
      const list = Game.coordTargets(P, ally, kind);
      const rows = list.map((t) => {
        const ans = Game.coordAnswer(P, ally, kind, t.id);
        return h('div', { class: 'coord-row' + (ans.ok ? '' : ' off') },
          h('div', null, h('b', null, t.name), h('span', { class: 'muted small' }, ' ', t.sub)),
          h('p', { class: 'small ' + (ans.ok ? 'good' : 'muted') }, rich(ans.why)),
          actBtn([icon(COORD[kind].icon), 'اطلب'], { cls: 'chip', err: ans.ok ? null : ans.why, onClick: () => {
            const c = Game.requestCoord(P, ally, kind, t.id);
            UI.toast(c.ok ? `${Game.fname(ally)} تقبل: ${c.why}` : `${Game.fname(ally)} ترفض: ${c.why}`);
            if (close) close();
            if (scene.afterAction) scene.afterAction();
          } }),
        );
      });
      body.append(seg, this.contribBox(P, ally) || h('p', { class: 'hint' }, 'لا حرب مشتركة الآن.'),
        rows.length ? h('div', { class: 'coord-list' }, rows) : h('p', { class: 'hint' }, 'لا أهداف من هذا النوع الآن.'),
        h('p', { class: 'hint' }, `الحليف يعطيك جوابه قبل أن تطلب. إن قبل يحاول ${COORD_TURNS} أدوار، وتصلك أخباره.`));
      const act = Game.coordsOf(P).filter((c) => c.ally === ally);
      if (act.length) body.append(h('div', { class: 'box' }, h('div', { class: 'sec-h' }, 'طلبات جارية'), act.map((c) => h('p', { class: 'small' }, rich(`${COORD[c.kind].name}: ${c.log.length ? c.log[c.log.length - 1].text : c.why} (حتى الدور ${c.until + 1})`)))));
    };
    render();
    close = UI.modal({ title: `تنسيق الحرب مع ${Game.fname(ally)}`, icon: 'treaty', cls: 'wide', body, buttons: [{ label: 'إغلاق' }] });
  },

  // ═══════ التجسس ═══════
  spyDialog(scene, target) {
    const P = scene.P;
    let op = 'scout', pickT = null, sub = 'stores';
    const body = h('div');
    let close;
    const render = () => {
      body.innerHTML = '';
      const O = SPY_OPS[op];
      const seg = h('div', { class: 'seg' }, Object.entries(SPY_OPS).map(([k, o]) => h('button', { class: k === op ? 'on' : '', onclick: () => { op = k; pickT = null; render(); } }, icon(o.icon), o.name)));
      const list = Game.spyTargets(P, target, op);
      if (!pickT || !list.find((x) => x.id === pickT)) pickT = list[0] ? list[0].id : null;
      const cur = list.find((x) => x.id === pickT);
      const err = Game.canSpyOp(P, target, op);
      body.append(seg, h('p', { class: 'small' }, O.desc, ` الكلفة ${O.cost}.`));
      if (O.target !== 'realm') body.append(h('div', { class: 'spy-list' }, list.slice(0, 10).map((x) => h('button', { class: 'spy-row' + (x.id === pickT ? ' on' : ''), onclick: () => { pickT = x.id; render(); } },
        h('b', null, x.name), h('span', { class: 'muted small' }, 'النجاح '), bandTag(x.band), h('span', { class: 'muted small' }, ' الانكشاف '), bandTag(x.discBand)))));
      if (op === 'sabotage') body.append(h('div', { class: 'acts' }, Object.entries(SABOTAGE).map(([k, s]) => {
        const n = pickT && Game.node(pickT);
        const why = k === 'gap' && n && !Game.besiegers(n.id).some((b) => b.fid === P) ? 'ينفع حين تحاصرها' : k === 'market' && n && !n.market ? 'لا سوق فيها' : null;
        return actBtn([icon(s.icon), s.name], { cls: 'chip' + (k === sub ? ' on' : ''), err: why, onClick: () => { sub = k; render(); } });
      })), h('p', { class: 'small muted' }, SABOTAGE[sub].desc));
      if (cur) body.append(h('div', { class: 'box' },
        h('div', { class: 'nego-row' }, h('span', null, 'فرصة النجاح: '), bandTag(cur.band), h('span', null, ' · فرصة انكشاف من أرسلهم: '), bandTag(cur.discBand)),
        partLines(cur.parts.map(([k, v]) => [k, Math.round(v * 100) + '٪'])),
        h('p', { class: 'hint' }, 'إن فشلت العملية ولم يُعرف الفاعل فلا ضرر. السمعة والعلاقة تتضرران فقط إن انكشف من أرسل العملاء.')));
      body.append(actBtn([icon(O.icon), 'نفّذ العملية'], { cls: 'btn primary', err: err || (!cur ? 'لا هدف' : null), onClick: () => {
        const r = Game.spyOp(P, target, op, pickT, op === 'sabotage' ? sub : undefined);
        if (r.err) { UI.toast(r.err); return; }
        if (Game.track) Game.track('spy');
        if (close) close();
        UI.modal({ title: r.ok ? 'نجحت العملية' : 'فشلت العملية', icon: r.found ? 'dagger' : O.icon, body: h('p', { class: 'lead' }, rich(r.text)), buttons: [{ label: 'حسناً', onClick: () => scene.afterAction && scene.afterAction() }] });
      } }));
    };
    render();
    close = UI.modal({ title: `عمليات سرية في ${Game.fname(target)}`, icon: 'eye', cls: 'wide', body, buttons: [{ label: 'إغلاق' }] });
  },

  // ═══════ الفتح ═══════
  occupation(node, how) {
    return new Promise((resolve) => {
      const P = Game.S.player;
      const ctx = Game.capCtx && Game.capCtx.node === node.id ? Game.capCtx : { defMen: 0 };
      const defMen = ctx.defMen || 0;
      let choice = how === 'surrender' ? 'clemency' : 'occupy', fate = how === 'surrender' ? 'withdraw' : 'disarm';
      const body = h('div');
      const render = () => {
        body.innerHTML = '';
        const pv = Game.occupationPreview(node, P, how, choice, fate, defMen);
        const pol = [['occupy', 'الضمّ بالقوة', 'swords'], ['clemency', 'الأمان', 'dove'], ['sack', 'النهب', 'fire']];
        body.append(
          h('p', { class: 'lead' }, how === 'surrender' ? `فتحت ${node.name} أبوابها. كيف تعامل أهلها؟` : `سقطت ${node.name}. كيف تعامل أهلها؟`),
          h('div', { class: 'seg' }, pol.map(([k, n, ic]) => h('button', { class: k === choice ? 'on' : '', onclick: () => { choice = k; render(); } }, icon(ic), n))),
          partLines(pv.policy),
          defMen ? h('div', { class: 'sec-h' }, icon('men'), `مصير المدافعين (${defMen} رجل)`) : h('p', { class: 'hint' }, 'لم يبق من الحامية أحد.'),
          defMen ? h('div', { class: 'seg' }, Object.entries(GARRISON_FATE).map(([k, g]) => h('button', { class: k === fate ? 'on' : '', onclick: () => { fate = k; render(); } }, icon(g.icon), g.name))) : null,
          defMen ? partLines(pv.fate) : null,
        );
      };
      render();
      UI.modal({ title: `دخلتَ ${node.name}`, icon: 'flag', cls: 'wide', body, buttons: [{ label: 'نفّذ', primary: true, onClick: () => resolve({ choice, fate: defMen ? fate : null }) }] });
    });
  },
});

// عرض الصلح من الذكاء: الشروط وسببها
{
  const proposal = Panels.proposal;
  Panels.proposal = function (p) {
    if (p.kind !== 'peace' || !p.offer) return proposal.call(this, p);
    const P = Game.S.player, f = Game.f(p.from), t = p.offer;
    const cant = t.payer === P && t.gold > Game.f(P).gold;
    return UI.ask({
      title: 'رسول من ' + f.name, icon: 'dove', cls: 'wide',
      body: h('div', null,
        h('p', { class: 'lead' }, rich(`${f.name} تعرض الصلح: ${this.termsText(t, P)}.`)),
        this.warBox(P, p.from),
        h('p', { class: 'hint' }, t.payer === p.from ? 'تعرض أن تدفع لأن الحرب تميل عليها أو لأنها منهكة.' : t.payer === P ? 'تطلب ثمن الصلح لأن الحرب تميل لصالحها، لكنها تريد التفرغ لغيرك.' : 'ترى الحرب متكافئة وتريد إنهاءها.'),
      ),
      buttons: [{ label: t.payer === P ? 'ادفع واقبل' : 'اقبل', value: true, primary: true, disabled: cant, why: 'الذهب لا يكفي' }, { label: 'ارفض', value: false }],
    });
  };
}
