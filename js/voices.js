'use strict';
// ذاكرة القادة وكلامهم.
// الذكريات تُكتب من وقائع الحملة نفسها (المعركة، الأسر، التكريم، ولاية العهد) وتُربط بمدخل السجل.
// الكلام قواعد شرطية بالعربية: كل عبارة تذكر سببها. الذكريات لا تغيّر الأرقام، فهي سرد لا مكافأة خفية.
// طبقة الذكاء الاصطناعي اختيارية: تعيد صياغة الوقائع نفسها فقط، وإن غابت أو فشلت يبقى نص القواعد.

const MEM_MAX = 14;

// ------------------ الذاكرة -------------------
Object.assign(Game, {
  remember(g, k, txt, o = {}) {
    if (!g || g.status === 'dead' && k !== 'death') return;
    if (g.name.startsWith('الضابط') && !['win', 'loss', 'captured'].includes(k)) return;
    g.mem = g.mem || [];
    g.mem.push({ t: this.S.turn, k, txt, foe: o.foe || null, fg: o.fg || null, node: o.node || null, ch: o.ch || null, w: o.w || 1 });
    // تسقط أقدم الذكريات الخفيفة أولاً، وتبقى الكبيرة
    while (g.mem.length > MEM_MAX) {
      const i = g.mem.findIndex((m) => m.w < 2);
      g.mem.splice(i >= 0 ? i : 0, 1);
    }
  },
  memOf(g, k) { return (g && g.mem || []).filter((m) => !k || m.k === k); },
  lastMem(g, pred) { const m = (g && g.mem) || []; for (let i = m.length - 1; i >= 0; i--) if (pred(m[i])) return m[i]; return null; },

  battleMemories(enc, out, att, def, pa, pd, ce) {
    const node = this.node(enc.node);
    const winSide = out.winner;
    const sides = [[att, enc.attFid, pa, pd, def], [def, enc.defFid, pd, pa, att]];
    sides.forEach(([gens, fid, mine, theirs, foes], si) => {
      const foeFid = si === 0 ? enc.defFid : enc.attFid;
      const fg = foes.find((x) => x && !x.name.startsWith('الضابط'));
      const won = winSide === si;
      const odds = mine > 0 ? theirs / mine : 1;
      for (const g of gens) {
        if (!g) continue;
        const fate = out.fates && out.fates[g.id];
        const where = node ? node.name : 'الميدان';
        const vs = fg ? ` بقيادة ${fg.name}` : '';
        let txt;
        if (won) txt = `انتصر على ${this.fname(foeFid)}${vs} عند ${where}${odds >= 1.5 ? `، وكانوا نحو ${Math.round(odds * 10) / 10} أضعاف رجاله` : ''}.`;
        else txt = `هُزم أمام ${this.fname(foeFid)}${vs} عند ${where}${odds <= 0.67 ? ' رغم تفوقه في العدد' : ''}.`;
        this.remember(g, won ? 'win' : 'loss', txt, { foe: foeFid, fg: fg ? fg.name : null, node: enc.node, ch: ce ? ce.id : null, w: (won && odds >= 1.5) || (!won && odds <= 0.67) || node && node.capital ? 2 : 1 });
        if (fate === 'killed') this.remember(g, 'death', `سقط في معركة ${where}.`, { foe: foeFid, node: enc.node, ch: ce ? ce.id : null, w: 3 });
      }
      // من رأى رفيقه يسقط
      const fallen = gens.filter((g) => g && out.fates && out.fates[g.id] === 'killed');
      for (const f of fallen) for (const g of gens) if (g && g !== f && g.status !== 'dead') this.remember(g, 'comrade', `رأى ${f.name} يسقط عند ${node ? node.name : 'الميدان'} على يد ${this.fname(foeFid)}.`, { foe: foeFid, fg: f.name, node: enc.node, ch: ce ? ce.id : null, w: 2 });
    });
  },
});

// ------------------ الكلام: قواعد شرطية -------------------
// كل قاعدة: أولوية، وشرط يعيد بيانات القالب أو لا شيء، وقوالب، وسبب يُعرض للاعب
const VOICE_RULES = [
  { id: 'vendetta', pri: 9, when: (g) => g.vendetta && WX.alive(g.vendetta) ? { v: Game.fname(g.vendetta) } : null,
    t: ['لن أرتاح حتى آخذ بثأر أبي من {v}.', 'كل خطوة أخطوها طريق إلى {v}.'], why: 'يطلب الثأر من {v}' },
  { id: 'rematch_loss', pri: 8, ctx: 'battle', when: (g, c) => { const m = Game.lastMem(g, (x) => x.k === 'loss' && c.foeGens.includes(x.fg)); return m ? { fg: m.fg, n: Game.node(m.node) ? Game.node(m.node).name : 'الميدان', t: m.t } : null; },
    t: ['{fg} كسرني عند {n}. هذه المرة أعرف أين يضع خيله.', 'لم أنسَ {n}. لن يضحك {fg} مرتين.'], why: 'هزمه {fg} عند {n} في الدور {t}' },
  { id: 'rematch_win', pri: 7, ctx: 'battle', when: (g, c) => { const m = Game.lastMem(g, (x) => x.k === 'win' && c.foeGens.includes(x.fg)); return m ? { fg: m.fg, n: Game.node(m.node) ? Game.node(m.node).name : 'الميدان', t: m.t } : null; },
    t: ['{fg} مرة أخرى؟ هزمته عند {n} وسيذكر ذلك.', 'رجالي يعرفون وجه {fg} منذ {n}. لا تخف.'], why: 'هزم {fg} عند {n} في الدور {t}' },
  { id: 'captor', pri: 7, ctx: 'battle', when: (g, c) => { const m = Game.lastMem(g, (x) => x.k === 'captured' && x.foe === c.foe); return m ? { f: Game.fname(c.foe), t: m.t } : null; },
    t: ['ذقت أسر {f}. لن أسلّمهم سيفي ثانية.', 'أعرف سجون {f} من الداخل. اليوم يعرفون سيفي.'], why: 'أسرته {f} في الدور {t}' },
  { id: 'comrade', pri: 6, ctx: 'battle', when: (g, c) => { const m = Game.lastMem(g, (x) => x.k === 'comrade' && x.foe === c.foe); return m ? { fg: m.fg, f: Game.fname(c.foe) } : null; },
    t: ['دم {fg} في رقاب {f}. لن ننسى.', 'قاتلنا مع {fg} حتى سقط. اليوم نقاتل من أجله.'], why: 'رأى {fg} يسقط على يد {f}' },
  { id: 'tired', pri: 6, ctx: 'battle', when: (g, c) => c.army && (c.army.fat || 0) >= 45 ? { fat: Math.round(c.army.fat) } : null,
    t: ['الرجال منهكون. إن قاتلنا الآن فلنقاتل على أرض نختارها.', 'التعب في الصفوف، ولن تصلحه الخطب.'], why: 'إرهاق جيشه {fat}٪' },
  { id: 'shaken', pri: 5, ctx: 'battle', when: (g, c) => c.army && (c.army.mor || 0) <= -15 ? {} : null,
    t: ['الجنود لم ينسوا الهزيمة الأخيرة. أعطهم نصراً صغيراً قبل الكبير.'], why: 'معنويات جيشه منخفضة' },
  { id: 'disloyal', pri: 6, when: (g) => g.loy != null && g.loy < 32 && !Game.isRuler(g) ? { l: g.loy } : null,
    t: ['أخدم ما دام الذهب يصل، ولا أكثر.', 'لكل صبر حدّ، ولصبري حدود قريبة.'], why: 'ولاؤه {l}: قد ينشق إن ساءت الأحوال' },
  { id: 'passed', pri: 5, when: (g) => { const m = Game.lastMem(g, (x) => x.k === 'passed' && Game.S.turn - x.t < 16); return m ? { h: m.fg } : null; },
    t: ['سمّيتَ {h} ولياً للعهد. أنا أتذكر من اختار غيري.', 'لم يُسأل رأيي في {h}. لا بأس، سأنتظر.'], why: 'سُمّي {h} ولياً للعهد بدلاً منه' },
  { id: 'honored', pri: 4, when: (g) => g.honored != null && Game.S.turn - g.honored < 10 ? { t: g.honored } : null,
    t: ['لن أنسى تكريمك في الدور {t}. سيفي لك.', 'من يكرم رجاله يجدهم عند الشدة.'], why: 'كرّمته في الدور {t}' },
  { id: 'freed', pri: 5, when: (g) => { const m = Game.lastMem(g, (x) => x.k === 'freed' && Game.S.turn - x.t < 12); return m ? { how: m.txt } : null; },
    t: ['خرجت من الأسر ولم يخرج مني الأسر بعد.', 'الحرية طعمها أحلى بعد السجن. دعني أرد الدين.'], why: '{how}' },
  { id: 'underdog', pri: 4, when: (g) => { const m = Game.lastMem(g, (x) => x.k === 'win' && x.w >= 2); return m && Game.S.turn - m.t < 12 ? { n: Game.node(m.node) ? Game.node(m.node).name : 'الميدان' } : null; },
    t: ['كانوا أكثر منا عند {n}، ومع ذلك انتصرنا. العدد ليس كل شيء.'], why: 'انتصر على جيش أكبر عند {n}' },
  { id: 'bitter', pri: 4, when: (g) => { const ls = Game.memOf(g, 'loss').filter((x) => Game.S.turn - x.t < 12); return ls.length >= 2 ? { k: ls.length } : null; },
    t: ['{k} هزائم متتالية تثقل الكتفين. أحتاج رجالاً ووقتاً.'], why: '{k} هزائم في آخر ثلاث سنوات' },
  { id: 'paid_well', pri: 3, when: (g) => { const m = Game.lastMem(g, (x) => x.k === 'join'); return m && m.w >= 2 && Game.S.turn - m.t < 20 ? {} : null; },
    t: ['أجري يكفيني ويزيد. لن يشتريني أحد منك.'], why: 'عقده أعلى من مطلبه' },
  { id: 'newcomer', pri: 3, when: (g) => { const m = Game.lastMem(g, (x) => x.k === 'join'); return m && Game.S.turn - m.t < 6 ? {} : null; },
    t: ['وصلت حديثاً، وأريد أن أثبت نفسي في أول معركة.'], why: 'انضم حديثاً' },
  { id: 'governor', pri: 3, when: (g) => g.status === 'gov' && Game.node(g.city) ? { c: Game.node(g.city).name, u: Game.node(g.city).unrest > 0 } : null,
    t: ['{c} في يدي. الأسواق مفتوحة ما دام الخبز فيها.'], why: 'يحكم {c}' },
  { id: 'idle', pri: 2, when: (g) => g.status === 'pool' && Game.S.turn - (g.since || 0) > 10 && !Game.isRuler(g) ? {} : null,
    t: ['السيف يصدأ في البلاط. أرسلني إلى حيث القتال.'], why: 'في البلاط منذ مدة بلا مهمة' },
  { id: 'trait', pri: 1, when: (g) => g.trait ? {} : null,
    tt: { tactician: 'دعهم يروا ما يريدون رؤيته، والضربة من حيث لا ينظرون.', brave: 'أعطني الطليعة، والباقي عليّ.', cavalier: 'السهل للخيل، والخيل تعرف ذلك.', archer: 'من يملك السماء يملك نصف المعركة.', siege: 'لكل سور حجر أضعف من غيره.', defender: 'الأسوار نصف المعركة، والصبر نصفها الآخر.', merchant: 'الجيش يمشي على بطنه، والبطن يمشي على الذهب.', logistician: 'المعركة تُكسب في المخازن قبل الميدان.', swift: 'أصل قبل أن يستيقظوا.', mountaineer: 'حيث تتعب خيلهم تبدأ أرضي.', desert: 'العطش عدوهم لا عدوي.', naval: 'الماء طريق لمن يعرفه.', elite: 'رجالي قليلون، وكل واحد منهم بعشرة.' },
    why: 'من تخصصه' },
];

const Voices = {
  // يختار أعلى قاعدة تنطبق، وقالباً ثابتاً للدور نفسه فلا تتغير العبارة كل مرة تُفتح النافذة
  say(g, c = {}) {
    if (!g || g.status === 'dead') return null;
    const ctx = { ctx: c.ctx || 'card', foe: c.foe || null, foeGens: c.foeGens || [], army: c.army || null };
    let best = null;
    for (const r of VOICE_RULES) {
      if (r.ctx && r.ctx !== ctx.ctx) continue;
      if (best && r.pri <= best.r.pri) continue;
      let d = null;
      try { d = r.when(g, ctx); } catch (e) { d = null; }
      if (d) best = { r, d };
    }
    if (!best) return null;
    const { r, d } = best;
    const pool = r.tt ? [r.tt[g.trait]].filter(Boolean) : r.t;
    if (!pool.length) return null;
    const i = hashStr(`${g.id}:${r.id}:${Game.S.turn}`) % pool.length;
    const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => (d[k] != null ? d[k] : ''));
    return { id: r.id, pri: r.pri, text: fill(pool[i]), why: fill(r.why) };
  },

  // الطبقة الاختيارية: تعيد صياغة الوقائع المكتوبة فقط. غيابها أو فشلها لا يغير شيئاً
  sampler: null,
  ready: false,
  init() {
    if (this.ready) return;
    this.ready = true;
    const c = typeof window !== 'undefined' && window.claude;
    if (!c || typeof c.use !== 'function') return;
    c.use('sample').then((s) => { this.sampler = s || null; }).catch(() => { this.sampler = null; });
  },
  facts(g) {
    const e = Game.catOf(g);
    const lines = [
      `الاسم: ${g.name}`,
      `المملكة: ${Game.fname(g.fid)}`,
      g.trait ? `التخصص في اللعبة: ${TRAITS[g.trait].name}` : null,
      g.flaw ? `العيب في اللعبة: ${FLAWS[g.flaw].name}` : null,
      g.loy != null ? `الولاء (0 إلى 100): ${g.loy}` : null,
      e && e.src === 'hist' ? `نبذة تاريخية موثقة: ${e.bio}` : null,
      'ذكريات هذه الحملة (من الأقدم):',
      ...(g.mem || []).slice(-8).map((m) => `- الدور ${m.t}: ${m.txt}`),
    ];
    return lines.filter(Boolean).join('\n');
  },
  async compose(g, onText, signal) {
    if (!this.sampler) throw { code: 'unavailable' };
    const prompt = [
      'اكتب بالعربية الفصحى المبسطة ثلاث جمل قصيرة على لسان قائد في لعبة استراتيجية، بصيغة المتكلم، يتأمل ما مرّ به في هذه الحملة.',
      'القواعد: استعمل الوقائع المذكورة أدناه فقط. لا تخترع معارك أو أسماء أو تواريخ أو أحداثاً تاريخية غير مذكورة. لا تستعمل الشرطة الطويلة. لا عناوين ولا شرح، النص فقط.',
      '',
      this.facts(g),
    ].join('\n');
    const r = await this.sampler(prompt, { modelTier: 'quick', onText: ({ text }) => onText && onText(text), signal });
    return r.text;
  },
};

// ------------------ الربط بأحداث اللعبة -------------------
(() => {
  // مدخل السجل يحمل رقماً ثابتاً لتشير إليه الذكريات
  const chron = Game.chronicle;
  Game.chronicle = function (...args) {
    const e = chron.apply(this, args);
    if (e && e.id == null) { this.S.cid = (this.S.cid || 0) + 1; e.id = this.S.cid; }
    return e;
  };
  const fe = Game.finishEncounter;
  Game.finishEncounter = async function (enc, out) {
    const s = this.encSides(enc);
    const att = [...s.attGens], def = [...s.defGens];
    const pa = this.menOf(s.attRegs), pd = this.menOf(s.defRegs);
    const n0 = (this.S.chron || []).length;
    const r = await fe.call(this, enc, out);
    const ce = (this.S.chron || []).slice(n0).find((x) => x.kind === 'battle') || null;
    if (ce) ce.gens = [...att, ...def].filter((g) => g && !g.name.startsWith('الضابط')).map((g) => g.id);
    this.battleMemories(enc, out, att, def, pa, pd, ce);
    return r;
  };
  const sf = Game.setGenFate;
  Game.setGenFate = function (g, fate, captor) {
    const r = sf.call(this, g, fate, captor);
    if (fate === 'captured' && g) this.remember(g, 'captured', `أُسر بيد ${this.fname(captor)}.`, { foe: captor, w: 3 });
    return r;
  };
  const rel = Game.releaseCaptive;
  Game.releaseCaptive = function (g, by) { const r = rel.call(this, g, by); this.remember(g, 'freed', `أطلقت ${this.fname(by)} سراحه دون مقابل.`, { foe: by, w: 2 }); return r; };
  const ran = Game.ransomCaptive;
  Game.ransomCaptive = function (g, by, price) { const r = ran.call(this, g, by, price); this.remember(g, 'freed', `افتدته مملكته من ${this.fname(by)} بـ${price} ذهباً.`, { foe: by, w: 2 }); return r; };
  const ex = Game.exchangeCaptives;
  Game.exchangeCaptives = function (g1, g2) { const r = ex.call(this, g1, g2); this.remember(g1, 'freed', `عاد في تبادل أسرى مقابل ${g2.name}.`, { w: 2 }); this.remember(g2, 'freed', `عاد في تبادل أسرى مقابل ${g1.name}.`, { w: 2 }); return r; };
  const hon = Game.honorGeneral;
  Game.honorGeneral = function (fid, g) { const r = hon.call(this, fid, g); if (!r) this.remember(g, 'honor', `كرّمته ${this.fname(fid)} بالعطايا والألقاب.`, { w: 2 }); return r; };
  const sh = Game.setHeir;
  Game.setHeir = function (fid, g) {
    const f = this.f(fid);
    const same = f && f.heir === (g && g.id);
    const over = !same && g ? this.passedOver(fid, g) : [];
    const r = sh.call(this, fid, g);
    if (!same && g) {
      this.remember(g, 'heir', `سُمّي ولياً لعهد ${f.name}.`, { w: 3 });
      for (const o of over) this.remember(o, 'passed', `سُمّي ${g.name} ولياً للعهد بدلاً منه.`, { fg: g.name, w: 2 });
    }
    return r;
  };
  const cap = Game.capture;
  Game.capture = async function (node, fid, how, armies = []) {
    const r = await cap.call(this, node, fid, how, armies);
    for (const a of armies) { const g = this.armyGen(a); if (g && node.owner === fid) this.remember(g, 'city', `دخل ${node.name} فاتحاً${how === 'surrender' ? ' بعد استسلامها' : ''}.`, { node: node.id, w: node.capital ? 3 : 2 }); }
    return r;
  };
  if (Game.proposeContract) {
    const pc = Game.proposeContract;
    Game.proposeContract = function (key, o) {
      const r = pc.call(this, key, o);
      if (r && r.ok && r.g) {
        const e = this.candOf ? this.catFind(r.g.name) : null;
        const d = e ? this.demandParts(e, r.g.fid).demand : null;
        const over = d && this.offerValue(r.g.pay, r.g.bonus || 0) > d * 1.1;
        this.remember(r.g, 'join', `دخل خدمة ${this.fname(r.g.fid)} بأجر ${r.g.pay} كل دور${over ? '، أعلى مما طلب' : ''}.`, { w: over ? 2 : 1 });
      }
      return r;
    };
  }
  if (typeof window !== 'undefined') Voices.init();
})();
