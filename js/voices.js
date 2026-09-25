'use strict';
// كلام القادة: جملة قصيرة في لحظة لها معنى، مبنية على وقائع الحالة فقط.
// النظام يقرر متى يتكلم القائد وماذا يطلب؛ الصياغة الاختيارية بالذكاء الاصطناعي تعيد ترتيب الكلام فقط
// ولا تضيف حقيقة، وإن لم تتوفر تبقى الجملة المكتوبة.

const Voices = {
  pct(a, b) { return Math.round(100 * a / Math.max(1, b)); },
  // قبل المعركة: نصيحة من الأرض والجيشين وسجله
  prebattle(g, enc, P) {
    if (!g) return null;
    const s = Game.encSides(enc);
    const mine = enc.attFid === P ? { regs: s.attRegs, gens: s.attGens } : { regs: s.defRegs, gens: s.defGens };
    const foe = enc.attFid === P ? { regs: s.defRegs, gens: s.defGens, fid: enc.defFid } : { regs: s.attRegs, gens: s.attGens, fid: enc.attFid };
    const share = (regs, f) => regs.filter(f).reduce((t, r) => t + r.men, 0) / Math.max(1, regs.reduce((t, r) => t + r.men, 0));
    const fCav = share(foe.regs, (r) => UNITS[r.type].cls === 'cav'), mSpear = share(mine.regs, (r) => r.type === 'spear' || r.type === 'militia');
    const mArch = share(mine.regs, (r) => !!UNITS[r.type].range && r.type !== 'catapult');
    const { pa, pd } = Game.encPower(enc);
    const ratio = enc.attFid === P ? pa / pd : pd / pa;
    const terr = enc.terrain || s.node.terrain;
    const weather = Game.battleWeather(s.node);
    const rival = g.rival && foe.gens.find((x) => x.id === g.rival);
    const vow = (Game.S.vows || []).find((v) => !v.done && v.fid === P && v.vs === foe.fid);
    const c = [];
    if (vow) c.push([9, `هؤلاء قتلوا ${vow.name}. رجالي يطلبون الثأر اليوم.`, 'قسم الثأر قائم على هذا العدو']);
    if (rival) c.push([8, `${rival.name} هزمني مرة. لن يتكرر ذلك.`, 'هزمه هذا القائد من قبل']);
    const att = enc.attFid === P;
    if (enc.kind === 'siege') {
      if (att && enc.equip && enc.equip.ram) c.push([7, 'الكبش جاهز. إن حميناه بالتروس بلغنا البوابة قبل أن يحرقوه.', 'الكبش جاهز والمعركة اقتحام']);
      else if (att && !(enc.equip && (enc.equip.ram || enc.equip.ladders)) && !mine.regs.some((r) => r.type === 'catapult')) c.push([8, 'بلا كبش ولا سلالم ولا منجنيق لن نفتح ثغرة. لننتظر دوراً حتى تكتمل المعدات، أو نجوّعهم.', 'لا وسيلة لاختراق السور الآن']);
      else if (!att) c.push([6, 'الأسوار معنا. لنبقَ عليها ولا نخرج إلا إن اقتربت آلاتهم.', 'ندافع خلف الأسوار']);
    }
    if (terr === 'mountains' && enc.kind !== 'siege') c.push([7, att ? 'مولاي، الممر ضيق: كثرتنا لا تنفعنا فيه. لندفع المشاة أولاً ونبقي الفرسان احتياطاً للمطاردة.' : 'مولاي، الممر ضيق هنا: كثرتهم لا تنفعهم. لنمسك المضيق ولا نتقدم منه.', 'ممر جبلي ضيق']);
    if (fCav > 0.35 && mSpear > 0.25) c.push([7, `مولاي، فرسانهم كثيرون. أرى أن نثبت الرماح في القلب وندعهم يرتطمون بها، ثم نغلق عليهم.`, `فرسان العدو نحو ${this.pct(fCav, 1)}٪ من جيشه، ولدينا رماح`]);
    if (terr === 'forest' && enc.kind !== 'siege' && fCav > 0.25) c.push([6, 'الغابة تكسر خيلهم. لنقاتلهم بين الأشجار لا في الفسحة.', 'غابة وفرسان للعدو']);
    if (terr === 'hills' && enc.kind !== 'siege' && enc.defFid === P) c.push([6, 'لنمسك المرتفع ونترك الصاعدين يتعبون قبل أن يصلوا.', 'تلال ونحن المدافعون']);
    if (weather === 'rain' && mArch > 0.3) c.push([6, 'الأوتار مبللة اليوم. لا تعوّل على الرماة، فالحسم بالسيوف.', 'مطر ونصف جيشنا تقريباً رماة']);
    if (ratio < 0.7) c.push([5, g.doctrine === 'defensive' || g.doctrine === 'cautious' ? 'هم أكثر منا. لنثبت ونجعلهم يدفعون ثمن كل خطوة.' : 'هم أكثر منا. إن ضربنا جناحهم بدل قلبهم قد ينقلب الميزان.', 'العدو أقوى بوضوح']);
    if (ratio > 1.6) c.push([4, 'الميزان لنا. هجوم منظم يكفي، ولا حاجة للمخاطرة بالرجال.', 'نحن أقوى بوضوح']);
    if (!c.length) return null;
    c.sort((a, b) => b[0] - a[0]);
    return { text: c[0][1], why: c[0][2], g };
  },
  // بعد الهزيمة
  defeat(g, a0, a1, place, outnumbered) {
    if (!g) return null;
    const lost = Math.max(0, a0 - a1);
    if (lost > a0 * 0.5) return { text: `خسرنا ${lost} رجلاً في ${place}، أكثر من نصف الجيش. الخطأ خطئي، وأطلب فرصة لأرد الاعتبار.`, why: `فقد ${this.pct(lost, a0)}٪ من رجاله`, g };
    if (outnumbered) return { text: `كانوا أكثر منا بكثير في ${place}. رجالي قاتلوا، لكننا نحتاج مدداً قبل أن نعود.`, why: 'كان العدو أكثر عدداً', g };
    return { text: 'لقد خذلت الجيش اليوم. أعطني فرصة أخرى.', why: `هُزم في ${place}`, g };
  },
  // سطر القائد الآن (في نافذته أو جيشه): الأقوى أثراً من ذاكرته وحاله
  current(g) {
    if (!g || !g.mem) return null;
    const S = Game.S;
    const recent = (k, t = 8) => g.mem.slice().reverse().find((m) => m.k === k && S.turn - m.turn <= t);
    const years = Math.max(1, Math.floor((S.turn - (g.since || 0)) / 4));
    const c = [];
    if (g.ask && g.ask.k === 'raise') c.push([9, `ما حققته في خدمتك يستحق ${g.ask.to} لا ${g.wage}. أطلب أن يُرفع راتبي.`, 'طلب زيادة الراتب']);
    const broken = recent('broken', 16);
    if (broken) c.push([8, 'وعدتني بقيادة جيش، ولم أنل ما وعدتني به.', 'وعد لم يُنفَّذ']);
    const denied = recent('denied', 12);
    if (denied && g.loy < 55) c.push([7, 'طلبت ما هو حقي فرُددت. سأتذكر ذلك.', 'رُفض طلبه']);
    if (g.loy < 40) {
      const d = Game.wageDemand(g).total;
      if (g.wage != null && g.wage < d * 0.85) c.push([7, `أخدم هذه المملكة منذ ${years} ${years === 1 ? 'سنة' : years === 2 ? 'سنتين' : years <= 10 ? 'سنوات' : 'سنة'}، وراتبي ${g.wage} وأمثالي ينالون ${d}.`, 'ولاء منخفض وراتب دون المطلوب']);
    }
    const grief = recent('grief', 10);
    if (grief) c.push([6, `${grief.text.replace(/^(فقد|أُسر) رفيقه /, 'فقدنا ')}. لن أنسى من فعل ذلك.`, grief.text]);
    const resc = recent('rescued', 12);
    if (resc) c.push([5, 'لن أنسى أنك لم تتركني في الأسر.', resc.text]);
    const wins = (g.rec && g.rec.battles) ? g.rec.wins : 0;
    const a = g.army ? Game.army(g.army) : null;
    const streak = recent('victory', 6) && wins >= 3;
    if (streak) c.push([5, a && a.mood && a.mood.k === 'shaken' ? 'رجالي مرهقون بعد هذه الحملات. أعطهم دوراً في مدينة قبل الحملة التالية.' : 'رجالي مستعدون لحملة أخرى، لكنهم يحتاجون الراحة قريباً.', 'سلسلة انتصارات']);
    const dec = recent('decimated', 8);
    if (dec) c.push([6, `${dec.text}. أحتاج رجالاً قبل أن أعود إلى القتال.`, dec.text]);
    if (g.status === 'pool' && g.ambition >= 2 && S.turn - (g.since || 0) >= 4) c.push([4, 'أنتظر في البلاط وجيوشك في الميدان. أعطني جيشاً.', 'قائد طموح بلا جيش']);
    if (!c.length) return null;
    c.sort((x, y) => y[0] - x[0]);
    return { text: c[0][1], why: c[0][2], g };
  },

  // ——— الصياغة الاختيارية بالذكاء الاصطناعي (داخل Claude فقط) ———
  sampler: null,
  async init() {
    try {
      if (!window.claude || !window.claude.use) return;
      const s = await window.claude.use('sample');
      if (s) this.sampler = s;
    } catch (e) { this.sampler = null; }
  },
  facts(g) {
    const rec = g.rec || {};
    return [`الاسم: ${g.name}`, `المملكة: ${Game.fname(g.fid)}`, `الموهبة: ${ARCH[g.arch || 'none'].name}`, g.flaw ? `العيب: ${FLAWS[g.flaw].name}` : null,
      `الولاء: ${g.loy}`, `المعارك: ${rec.battles || 0}، الانتصارات: ${rec.wins || 0}`, (g.titles || []).length ? `الألقاب: ${g.titles.map((t) => t.t).join('، ')}` : null,
      ...(g.mem || []).slice(-5).map((m) => `ذكرى: ${m.text}`)].filter(Boolean);
  },
  async rephrase(line) {
    if (!this.sampler || !line) return null;
    const prompt = [
      'أنت كاتب حوار للعبة استراتيجية تاريخية بالعربية الفصحى.',
      'أعد صياغة جملة القائد التالية بصوته في جملة أو جملتين قصيرتين.',
      'قواعد صارمة: لا تضف أي حقيقة أو اسم أو رقم أو حدثاً غير موجود في الجملة أو الوقائع. لا تستخدم الشرطة الطويلة. لا رموز تعبيرية.',
      'الوقائع:', ...this.facts(line.g), `الجملة: ${line.text}`, 'أعد الجملة الجديدة فقط.',
    ].join('\n');
    try {
      const r = await this.sampler(prompt, { modelTier: 'quick' });
      const t = (r && r.text || '').trim().replace(/—/g, '،');
      return t && t.length < 280 ? t : null;
    } catch (e) { return null; }
  },
};
window.addEventListener('load', () => { Voices.init(); });
