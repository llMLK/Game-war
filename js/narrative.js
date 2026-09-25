'use strict';
// روايات المعارك: مكتبة حالات سببية. كل حالة لها شرط على وقائع المحاكاة (سجلها وأحداثها)،
// فلا تُذكر سهام لرماة غير موجودين، ولا خطأ احتياط لم يُستخدم، ولا نهر في غير ساحته.
// كل حالة: معرّف، وفئة، ووزن يُحسب من الوقائع (صفر = لا تنطبق)، وصيغ متعددة تقلل التكرار.

const NARR = [];
const NR = (id, cat, w, ...t) => NARR.push({ id, cat, w, t });
// أدوات صغيرة
const nCmd = (s) => (s.cmd ? s.cmd.name : `قائد ${s.name}`);
const nAt = (F) => (F.place ? ` عند ${F.place}` : '');
const nWalls = (F) => ['بلا أسوار', 'سياج خشبي', 'أسوار حجرية', 'قلعة', 'قلعة عظمى'][clamp(F.walls, 0, 4)];
const nPct = (v) => Math.round(v * 100);
const led = (s, k) => (s.led && s.led[k]) || 0;
const topLed = (s) => { let b = null, bv = 0; for (const [k, v] of Object.entries(s.led || {})) { if (k === 'rout' || k === 'pursuit') continue; if (v > bv) { bv = v; b = k; } } return b; };
const hasMom = (s, k) => s.moments.some((m) => m.kind === k);
const firstBreak = (F, side) => F.brokenLog.filter((b) => b.side === side.i).sort((a, b) => a.phase - b.phase)[0] || null;
const siegeAtt = (F) => F.kind === 'siege' && F.W.att;
const siegeDef = (F) => F.kind === 'siege' && !F.W.att;
const field = (F) => F.kind === 'field';

// ═════════ السبب الرئيسي للنصر ═════════
NR('m_missile_field', 'main', (F) => field(F) && topLed(F.W) === 'missile' && F.W.missile + F.W.skirm >= 0.18 ? 9 : 0,
  (F) => `رماة ${F.W.name} أسقطوا كثيراً من رجال ${F.L.name} قبل أن يبلغوا الصفوف، فوصل من وصل منهم منهكاً قليل العدد.`,
  (F) => `السهام حسمت اليوم: كانت نسبة الرماة في جيش ${F.W.name} ${nPct(F.W.missile + F.W.skirm)}٪، وقد أمطروا صفوف ${F.L.name} طوال الاقتراب.`);
NR('m_missile_walls', 'main', (F) => siegeDef(F) && (topLed(F.W) === 'walls' || topLed(F.W) === 'missile') ? 9 : 0,
  (F) => `رماة الأسوار أصابوا المهاجمين وهم يقتربون بلا غطاء، و${nWalls(F)} ${F.place} حمت المدافعين من الرد.`,
  (F) => `من فوق ${nWalls(F)} تساقطت السهام والحجارة على جيش ${F.L.name}، فلم يبلغ السور إلا القليل.`);
NR('m_horsearchers', 'main', (F) => F.W.skirm >= 0.2 && (led(F.W, 'evade') > 0 || led(F.W, 'missile') > led(F.W, 'melee') * 0.5) ? 10 : 0,
  (F) => `خيالة ${F.W.name} الرماة كرّوا وفرّوا: يرمون ثم يبتعدون قبل الالتحام، فأنهكوا ${F.L.name} دون أن يمسكوا بهم.`,
  (F) => `لم يجد جيش ${F.L.name} عدواً يلتحم به: خيالة ${F.W.name} الرماة كانوا يرمون وينسحبون على طول الميدان.`);
NR('m_charge_open', 'main', (F) => topLed(F.W) === 'charge' && ['plains', 'desert', 'coast'].includes(F.terrain) ? 11 : 0,
  (F) => `انقضاض فرسان ${F.W.name} في الأرض المكشوفة كسر صفوف ${F.L.name} في الالتحام الأول.`,
  (F) => `الأرض المفتوحة${nAt(F)} كانت ميدان الفرسان، وانقضاضهم الأول لم يترك لـ${F.L.name} وقتاً ليتماسك.`);
NR('m_charge_archers', 'main', (F) => topLed(F.W) === 'charge' && F.L.missile >= 0.3 ? 12 : 0,
  (F) => `فرسان ${F.W.name} بلغوا رماة ${F.L.name} المكشوفين، والرماة لا يصمدون أمام الخيل في الالتحام.`);
NR('m_charge', 'main', (F) => topLed(F.W) === 'charge' ? 7 : 0,
  (F) => `انقضاض فرسان ${F.W.name} في بداية الالتحام حطم خط ${F.L.name}.`);
NR('m_spears', 'main', (F) => led(F.W, 'spears') > 20 && F.W.line >= 0.2 && F.L.cav >= 0.2 ? 11 : 0,
  (F) => `جدار الرماح لدى ${F.W.name} صدّ فرسان ${F.L.name}، فخسروا خيرة رجالهم على الأسنة.`,
  (F) => `الرمّاحة ثبتوا في وجه الخيل كما ينبغي لهم، وارتدت فرسان ${F.L.name} بخسائر ثقيلة.`);
NR('m_flank', 'main', (F) => F.W.flankOk && led(F.W, 'flank') >= Math.max(40, led(F.W, 'melee') * 0.5) ? 12 : 0,
  (F) => `نجح التفاف ${F.W.name}: ضرب فرسانه جناح ${F.L.name} من الخلف، فانهار ما كان صامداً في الوجه.`,
  (F) => `دارت خيالة ${F.W.name} حول طرف العدو وضربته حيث لا يرى، وهذا ما حسم اليوم.`);
NR('m_rollup', 'main', (F) => hasMom(F.W, 'roll') && led(F.W, 'flank') > 30 ? 10 : 0,
  (F) => `بعد أن انهار جناح ${F.L.name}، التف المنتصرون على القلب المكشوف، وانطوى الجيش كله من طرفه.`);
NR('m_feint', 'main', (F) => hasMom(F.W, 'feint') ? 14 : 0,
  (F) => `التقهقر المصطنع استدرج ${F.L.name} خلف قلب يبدو منهزماً، ثم أطبق الفرسان من الجانبين.`,
  (F) => `ظن ${nCmd(F.L)} أن القلب ينكسر فلاحقه، وكان ذلك ما أراده ${nCmd(F.W)} تماماً.`);
NR('m_hunt_kill', 'main', (F) => led(F.W, 'hunt') > 0 && F.L.cmd && F.L.cmd.fate === 'killed' ? 15 : 0,
  (F) => `فرقة الصيد بلغت ${F.L.cmd.name} فقتلته، وتزلزل جيشه حين رأى رايته تسقط.`);
NR('m_hunt_capture', 'main', (F) => led(F.W, 'hunt') > 0 && F.L.cmd && F.L.cmd.fate === 'captured' ? 15 : 0,
  (F) => `فرسان ${F.W.name} اقتحموا حرس ${F.L.cmd.name} وأسروه، فلم يبق لجيشه من يصدر الأوامر.`);
NR('m_cmd_fell', 'main', (F) => led(F.W, 'commander') > 0 && !led(F.W, 'hunt') && F.L.cmd && !F.L.cmd.alive ? 11 : 0,
  (F) => `سقط ${F.L.cmd.name} وهو يقاتل${F.L.cmd.pos === 'front' ? ' في المقدمة' : ''}، ومعه سقطت عزيمة جيشه.`);
NR('m_breach_ram', 'main', (F) => siegeAtt(F) && F.breaches.some((b) => b.how === 'ram') ? 12 : 0,
  (F) => `الكبش حطم باب ${F.place}، وتدفق المهاجمون من الفتحة قبل أن يسدها المدافعون.`);
NR('m_breach_tower', 'main', (F) => siegeAtt(F) && F.breaches.some((b) => b.how === 'tower') ? 12 : 0,
  (F) => `برج الحصار التصق بالسور وفتح معبراً آمناً، فعبر رجال ${F.W.name} إلى الأعلى دون أن يتسلقوا تحت السهام.`);
NR('m_breach_ladders', 'main', (F) => siegeAtt(F) && F.breaches.some((b) => b.how === 'ladders') ? 10 : 0,
  (F) => `السلالم على طول السور شتتت المدافعين، ولم يكفِ رجال ${F.L.name} لكل موضع.`,
  (F) => `تسلق رجال ${F.W.name} من جهات كثيرة معاً، فاعتلوا ${F.secName(F.breaches.find((b) => b.how === 'ladders').key)} حيث كان المدافعون أقل.`);
NR('m_breach_catapult', 'main', (F) => siegeAtt(F) && F.breaches.some((b) => b.how === 'catapult') ? 12 : 0,
  (F) => `المنجنيق فتح ثغرة في السور، ومنها دخل ${F.W.name}.`);
NR('m_repelled', 'main', (F) => siegeDef(F) && !F.breaches.length ? 11 : 0,
  (F) => `لم تُفتح ثغرة واحدة في ${nWalls(F)} ${F.place}، فارتد المهاجمون بعد أن استنزفتهم السهام.`,
  (F) => `بقيت الأسوار كاملة حتى آخر اليوم، وما يعجز عن فتح ثغرة لا يسقط مدينة.`);
NR('m_tower_burned', 'main', (F) => siegeDef(F) && F.towerBurn ? 13 : 0,
  (F) => `السهام النارية أشعلت برج الحصار قبل أن يبلغ السور، ومعه احترقت خطة ${F.L.name}.`);
NR('m_ram_burned', 'main', (F) => siegeDef(F) && F.ramBurn ? 12 : 0,
  (F) => `الزيت المغلي أحرق الكبش عند الباب، فلم يبق للمهاجمين ما يفتح به.`);
NR('m_sally_burn', 'main', (F) => siegeDef(F) && hasMom(F.W, 'sally') ? 13 : 0,
  (F) => `خرجت قوة من الباب وأحرقت آلات الحصار قبل الهجوم، فبدأ ${F.L.name} اقتحامه بلا أدوات.`);
NR('m_starving', 'main', (F) => siegeAtt(F) && F.stores != null && F.stores < 0 ? 12 : 0,
  (F) => `الجوع سبق السيف: دافع أهل ${F.place} بأجساد خاوية بعد أن نفدت مؤنهم.`);
NR('m_depth', 'main', (F) => siegeDef(F) && F.W.plan === 'depth' && F.phase >= 3 ? 12 : 0,
  (F) => `تنازل المدافعون عن السور خطوة خطوة ثم قاتلوا في الشوارع، حيث لا ينفع العدد، فانكسر المهاجمون في الأزقة.`);
NR('m_high_walls', 'main', (F) => siegeDef(F) && F.walls >= 3 ? 8 : 0,
  (F) => `${nWalls(F)} ${F.place} ضاعفت قوة كل مدافع، وما كان لجيش ${F.L.name} أن يعوّض ذلك بالعدد.`);
NR('m_reserve_late', 'main', (F) => F.W.res && F.W.res.phase >= 2 && led(F.W, 'reserve') > 40 ? 11 : 0,
  (F) => `احتفظ ${nCmd(F.W)} باحتياطه حتى ${F.phName(F.W.res.phase)}، ثم دفعه حين استنفد العدو رجاله.`,
  (F) => `الاحتياط الطازج دخل في اللحظة الحاسمة، وكان ${F.L.name} قد زجّ بكل ما لديه.`);
NR('m_reserve_saved', 'main', (F) => F.W.res && F.W.res.why === 'waver' && led(F.W, 'reserve') > 40 ? 10 : 0,
  (F) => `حين ترنح ${F.secName(F.W.res.key)} أرسل ${nCmd(F.W)} احتياطه في وقته، فثبت الموضع الذي كاد يسقط.`);
NR('m_reserve_flank', 'main', (F) => F.W.res && F.W.res.why === 'flank' && F.L.kinds.has('flankFail') ? 13 : 0,
  (F) => `احتياط ${F.W.name} كان بانتظار الفرسان الملتفين، فتحول التفاف ${F.L.name} إلى كارثة عليه.`);
NR('m_breakcenter', 'main', (F) => led(F.W, 'breakcenter') > 0 ? 13 : 0,
  (F) => `ركّز ${nCmd(F.W)} أقوى مشاته في القلب، فانكسر قلب ${F.L.name} وانشق جيشه نصفين.`);
NR('m_highground', 'main', (F) => field(F) && !F.W.att && F.W.plan === 'highground' ? 12 : 0,
  (F) => `أمسك ${F.W.name} المرتفع: سهامه أبعد مدى، والصاعدون إليه وصلوا متعبين.`,
  (F) => `من فوق التل كان ${F.W.name} يرى كل حركة ويضرب من أعلى، وتعب ${F.L.name} في الصعود قبل أن يقاتل.`);
NR('m_pass', 'main', (F) => field(F) && F.terrain === 'mountains' && F.ratio < 0.9 ? 12 : 0,
  (F) => `في الممر الضيق لا يقاتل إلا الصف الأول، فلم ينفع ${F.L.name} عدده الأكبر.`);
NR('m_river', 'main', (F) => field(F) && F.terrain === 'river' && !F.W.att ? 10 : 0,
  (F) => `ضرب ${F.W.name} المهاجمين وهم في الماء، والعابر ضعيف حتى يبلغ الضفة.`);
NR('m_forest_cav', 'main', (F) => field(F) && F.terrain === 'forest' && F.L.cav >= 0.25 && F.W.cav < F.L.cav ? 10 : 0,
  (F) => `الغابة كسرت انقضاض فرسان ${F.L.name}، ومشاة ${F.W.name} قاتلوهم بين الأشجار حيث لا تنفع الخيل.`);
NR('m_numbers', 'main', (F) => F.ratio >= 1.45 && ['melee', 'reserve', null].includes(topLed(F.W)) ? 9 : 0,
  (F) => `التفوق العددي حسم الأمر: ${F.W.men0} رجل مقابل ${F.L.men0}، فلم يجد جيش ${F.L.name} ما يسد به الثغرات.`,
  (F) => `كان رجال ${F.W.name} نحو ${Math.round(F.ratio * 10) / 10} أضعاف خصمهم، وفي الاشتباك الطويل يغلب العدد.`);
NR('m_quality', 'main', (F) => F.ratio <= 0.77 && F.W.exp >= F.L.exp + 0.5 ? 13 : 0,
  (F) => `رغم قلة عددهم، قاتل مخضرمو ${F.W.name} كما يقاتل من خبر الحرب، وتفككت أمامهم صفوف أقل خبرة.`);
NR('m_quality_units', 'main', (F) => F.ratio <= 0.8 && (F.W.shock + F.W.cav) >= 0.45 && F.L.line + F.L.missile >= 0.55 && !F.L.types.includes('cavalry') ? 11 : 0,
  (F) => `جيش ${F.W.name} الأصغر كان من السيّافة والفرسان، وخصمه من الحامية والرماة، والنوع غلب العدد في الالتحام.`);
NR('m_infantry', 'main', (F) => topLed(F.W) === 'melee' && F.W.shock + F.W.line >= 0.5 ? 6 : 0,
  (F) => `مشاة ${F.W.name} صمدوا في الاشتباك الطويل وضغطوا حتى تراجع جيش ${F.L.name}.`,
  (F) => `لم يكن في اليوم مناورة لامعة: صفّان تدافعا حتى تعب الأضعف منهما، وكان ${F.L.name}.`);
NR('m_tired_foe', 'main', (F) => F.L.fat0 >= 25 && F.W.fat0 + 15 <= F.L.fat0 ? 13 : 0,
  (F) => `دخل جيش ${F.L.name} المعركة منهكاً من قتال سابق (الإرهاق ${Math.round(F.L.fat0)}٪)، وجيش ${F.W.name} مرتاح.`,
  (F) => `الإرهاق هزم جيش ${F.L.name} قبل السيف: رجاله لم يستريحوا منذ معركتهم الأخيرة.`);
NR('m_low_morale_foe', 'main', (F) => F.L.mood <= -12 ? 11 : 0,
  (F) => `جيش ${F.L.name} كان مهزوزاً أو جائعاً قبل أن يبدأ القتال، فانكسر عند أول ضغط حقيقي.`);
NR('m_vendetta', 'main', (F) => F.W.cmd && F.W.cmd.vendetta ? 9 : 0,
  (F) => `قاتل رجال ${nCmd(F.W)} بثأر في صدورهم، ولم يكن في صفوفهم من يفكر في التراجع.`);
NR('m_night', 'main', (F) => F.W.plan === 'night' ? 12 : 0,
  (F) => `الهجوم الليلي أعمى رماة الأسوار، وحين أدرك المدافعون ما يجري كان المهاجمون فوقهم.`);
NR('m_assault', 'main', (F) => F.W.plan === 'assault' && F.phase <= 2 ? 9 : 0,
  (F) => `اندفع ${F.W.name} بسرعة تحت السهام والتحم بعنف، فاهتز ${F.L.name} قبل أن يستقر.`);
NR('m_withdraw', 'main', (F) => F.reason === 'withdraw' && F.L.withdrew ? 16 : 0,
  (F) => `لم يُهزم جيش ${F.L.name} في الميدان بل انسحب منه${F.L.orderly ? ' بانتظام، حافظاً معظم رجاله' : '، وتحول انسحابه إلى فوضى'}، فبقي الميدان لجيش ${F.W.name}.`);
NR('m_terms', 'main', (F) => F.reason === 'terms' ? 16 : 0,
  (F) => `حين سقط السور طلبت الحامية الأمان، وخرجت من ${F.place} بممر آمن بدل أن تموت في الشوارع.`);
NR('m_rally', 'main', (F) => F.W.rallied && hasMom(F.W, 'rally') ? 9 : 0,
  (F) => `حين ترنح القطاع مر ${nCmd(F.W)} بين الصفوف واستنهضهم، فثبتوا حتى تغير الحال.`);
NR('m_focus', 'main', (F) => F.W.focus && topLed(F.W) === 'missile' ? 12 : 0,
  (F) => `ركّز رماة ${F.W.name} سهامهم على قطاع واحد حتى انهار، بدل أن يوزعوها على الصفوف كلها.`);
NR('m_ammo_foe', 'main', (F) => F.L.ammoOut >= 2 && F.L.missile >= 0.25 ? 9 : 0,
  (F) => `نفدت سهام ${F.L.name} في منتصف اليوم، فصار رماته رجالاً بلا سلاح أمام الالتحام.`);
NR('m_defender_trait', 'main', (F) => siegeDef(F) && F.W.cmd && F.W.cmd.trait === 'defender' ? 9 : 0,
  (F) => `${nCmd(F.W)} يعرف الأسوار: وزّع رجاله حيث يُحتاج إليهم، وكان حيث يترنح الدفاع.`);
NR('m_cavalier', 'main', (F) => F.W.cmd && F.W.cmd.trait === 'cavalier' && (led(F.W, 'charge') > 20 || F.W.flankOk) ? 10 : 0,
  (F) => `${nCmd(F.W)} فارس يعرف متى يُطلق الخيل، وانقضاضه جاء في موضعه ووقته.`);
NR('m_tactician', 'main', (F) => F.W.cmd && F.W.cmd.trait === 'tactician' && F.W.mistakes.length === 0 && F.L.mistakes.length > 0 ? 9 : 0,
  (F) => `${nCmd(F.W)} الداهية قرأ حركة خصمه، فلم يخطئ حين أخطأ الآخر.`);
NR('m_generic', 'main', () => 1,
  (F) => `${F.W.name} أدار المعركة أفضل في كل مرحلة، دون ضربة واحدة حاسمة.`,
  (F) => `لم يحسمها سبب واحد: كفة ${F.W.name} رجحت قليلاً في كل مرحلة حتى انقلبت.`);

// ═════════ الأرض والطقس ═════════
NR('t_rain_bows', 'terrain', (F) => F.weather === 'rain' && (F.W.missile + F.L.missile) >= 0.2 ? 8 : 0,
  (F) => `المطر أرخى أوتار الأقواس، فخسر الرماة نصف حدتهم${F.L.missile > F.W.missile ? `، وكان ${F.L.name} أحوج إليها` : ''}.`);
NR('t_fog', 'terrain', (F) => F.weather === 'fog' && (F.W.flankOk || F.L.flankTried || F.W.plan === 'night') ? 9 : 0,
  (F) => `الضباب أخفى الحركة، فما رآه الكشافة إلا حين صار قريباً.`);
NR('t_fog_bows', 'terrain', (F) => F.weather === 'fog' && F.W.missile + F.L.missile >= 0.2 ? 5 : 0,
  (F) => `في الضباب ضاعت كثير من السهام، فلم يكن للرماة أثرهم المعتاد.`);
NR('t_heat', 'terrain', (F) => (F.weather === 'heat' || F.terrain === 'desert') && F.L.fatEnd > F.W.fatEnd + 8 ? 8 : 0,
  (F) => `الحر أنهك ${F.L.name} أكثر من خصمه، ورجاله يلهثون قبل منتصف النهار.`);
NR('t_snow', 'terrain', (F) => F.weather === 'snow' ? 6 : 0,
  (F) => `البرد والثلج أبطآ الزحف وأتعبا الجميع، والجيش الأطول مسيراً دفع الثمن.`);
NR('t_plains_cav', 'terrain', (F) => F.terrain === 'plains' && field(F) && (led(F.W, 'charge') > 20 || F.W.flankOk) ? 7 : 0,
  (F) => `السهول المكشوفة لم تترك للمشاة ما يحتمون به من الخيل.`);
NR('t_forest', 'terrain', (F) => F.terrain === 'forest' && field(F) && (F.W.cav + F.L.cav) >= 0.2 ? 7 : 0,
  (F) => `بين الأشجار تعثرت الخيل وحُجبت السهام، فصار القتال للمشاة.`);
NR('t_hills', 'terrain', (F) => F.terrain === 'hills' && field(F) && !F.W.att ? 7 : 0,
  (F) => `التلال أعطت المدافع المرتفع، والصاعد يتعب قبل أن يضرب.`);
NR('t_hills_att', 'terrain', (F) => F.terrain === 'hills' && field(F) && F.W.att ? 6 : 0,
  (F) => `رغم أن التلال كانت للمدافع، صعد ${F.W.name} إليها ولم يتوقف.`);
NR('t_pass', 'terrain', (F) => F.terrain === 'mountains' && field(F) ? 7 : 0,
  (F) => `الممر الجبلي ضيّق الجبهة: لا مجال للالتفاف، ولا فائدة للعدد الزائد.`);
NR('t_river_att', 'terrain', (F) => F.terrain === 'river' && field(F) && F.W.att ? 6 : 0,
  (F) => `عبر ${F.W.name} النهر تحت الضربات، وخسر في الماء ما كسبه على الضفة.`);
NR('t_river_def', 'terrain', (F) => F.terrain === 'river' && field(F) && !F.W.att ? 8 : 0,
  (F) => `النهر كان حليف المدافع: المهاجمون وصلوا إلى الضفة مبللين متفرقين.`);
NR('t_coast', 'terrain', (F) => F.terrain === 'coast' && field(F) ? 5 : 0,
  (F) => `البحر حمى جناحاً وحصر المناورة في الجهة الأخرى.`);
NR('t_desert_native', 'terrain', (F) => F.terrain === 'desert' && F.W.cmd && F.W.cmd.trait === 'desert' ? 9 : 0,
  (F) => `${nCmd(F.W)} ابن الصحراء، ورجاله يعرفون حرها وغبارها.`);
NR('t_mountaineer', 'terrain', (F) => ['hills', 'mountains'].includes(F.terrain) && F.W.cmd && F.W.cmd.trait === 'mountaineer' ? 9 : 0,
  (F) => `${nCmd(F.W)} ابن الجبال: عرف المسالك التي يجهلها خصمه.`);
NR('t_walls_palisade', 'terrain', (F) => F.kind === 'siege' && F.walls === 1 ? 5 : 0,
  (F) => `لم يكن حول ${F.place} إلا سياج خشبي، فالاقتحام كان أيسر مما يوحي به اسم الحصار.`);
NR('t_walls_stone', 'terrain', (F) => F.kind === 'siege' && F.walls === 2 ? 5 : 0,
  (F) => `أسوار ${F.place} الحجرية فرضت على المهاجم ثمناً في كل خطوة.`);
NR('t_walls_fort', 'terrain', (F) => F.kind === 'siege' && F.walls >= 3 ? 7 : 0,
  (F) => `${nWalls(F)} ${F.place} من الحصون التي لا تسقط بالاندفاع وحده.`);
NR('t_capital', 'terrain', (F) => F.kind === 'siege' && F.capital ? 6 : 0,
  (F) => `${F.place} عاصمة، وأهلها قاتلوا على أسوارها كمن يدافع عن بيته.`);

// ═════════ خطأ الخاسر (فقط ما سُجل فعلاً) ═════════
const hasK = (s, k) => s.kinds.has(k) || s.mistakes.some((m) => m.kind === k);
NR('e_flank_fail', 'error', (F) => hasK(F.L, 'flankFail') ? 9 : 0,
  (F) => `أرسل ${nCmd(F.L)} فرسانه ليلتفوا، فصدّتهم ${F.W.res && F.W.res.why === 'flank' ? 'قوات الاحتياط التي كانت بانتظارهم' : 'الرماح'} وخسر أسرع رجاله.`);
NR('e_flank_bad_ground', 'error', (F) => F.L.plan === 'flanking' && ['forest', 'mountains'].includes(F.terrain) ? 10 : 0,
  (F) => `حاول ${F.L.name} الالتفاف في ${F.terrain === 'forest' ? 'غابة' : 'ممر جبلي'} لا يتسع للخيل.`);
NR('e_feint_fail', 'error', (F) => hasK(F.L, 'feintFail') ? 12 : 0,
  (F) => `التقهقر المصطنع لدى ${F.L.name} خرج عن السيطرة وصار انسحاباً حقيقياً.`);
NR('e_feint_ignored', 'error', (F) => hasK(F.L, 'feintIgnored') ? 6 : 0,
  (F) => `خدعة التقهقر لم تنطلِ على ${nCmd(F.W)}، فخسر قلب ${F.L.name} أرضاً بلا مقابل.`);
NR('e_baited', 'error', (F) => hasK(F.L, 'baited') ? 12 : 0,
  (F) => `لاحق ${F.L.name} عدواً ظنه منهزماً، فدخل الفخ بقدميه.`);
NR('e_hunt_fail', 'error', (F) => hasK(F.L, 'huntFail') ? 8 : 0,
  (F) => `أرسل ${nCmd(F.L)} فرقة لصيد قائد العدو، فردّها الحرس وغابت عن الصفوف حين احتاجها.`);
NR('e_sally_fail', 'error', (F) => hasK(F.L, 'sallyFail') ? 10 : 0,
  (F) => `القوة التي خرجت من الأسوار حوصرت قرب المعسكر وأُبيد أكثرها.`);
NR('e_disobey', 'error', (F) => hasK(F.L, 'disobey') ? 8 : 0,
  (F) => `${F.L.mistakes.find((m) => m.kind === 'disobey') ? F.L.mistakes.find((m) => m.kind === 'disobey').text : 'قائد جناح عصى الأمر'}، ففسدت الخطة من داخلها.`);
NR('e_early_reserve', 'error', (F) => hasK(F.L, 'earlyReserve') && F.L.res && F.L.res.phase <= 1 && F.W.res && F.W.res.phase >= 2 ? 10 : 0,
  (F) => `زجّ ${nCmd(F.L)} باحتياطه في ${F.phName(F.L.res.phase)}، فلما جاءت الأزمة لم يبق له ما يدفعه، وكان خصمه قد احتفظ باحتياطه.`);
NR('e_cmd_front', 'error', (F) => F.L.cmd && !F.L.cmd.alive && F.L.cmd.pos === 'front' ? 9 : 0,
  (F) => `قاتل ${F.L.cmd.name} في المقدمة فسقط، وسقط معه تماسك جيشه.`);
NR('e_bait_fail', 'error', (F) => hasK(F.L, 'baitFail') ? 10 : 0,
  (F) => `حاول ${nCmd(F.L)} أن يستدرج العدو بجناح متراجع، لكن الجناح كان ينهار حقاً.`);
NR('e_no_reserve', 'error', (F) => field(F) && !F.L.res && F.L.resLeft === 0 && F.L.broke.length > 0 && F.W.res ? 7 : 0,
  (F) => `لم يحتفظ ${F.L.name} باحتياط، فحين انهار ${F.secName(F.L.broke[0].key)} لم يجد ما يسد به الثغرة.`);
NR('e_unused_reserve', 'error', (F) => field(F) && !F.L.res && F.L.resLeft > 0 && F.L.broke.length > 0 ? 9 : 0,
  (F) => `بقي احتياط ${F.L.name} في مكانه حتى انتهى كل شيء، ولم يُرسل إلى القطاع الذي انهار.`);
NR('e_attrition_rain', 'error', (F) => F.L.plan === 'attrition' && F.weather === 'rain' ? 11 : 0,
  (F) => `اعتمد ${F.L.name} على السهام في يوم ماطر.`);
NR('e_assault_uphill', 'error', (F) => F.L.plan === 'assault' && ['hills', 'mountains'].includes(F.terrain) && F.L.att && F.W.plan && ['highground', 'defensive'].includes(F.W.plan) ? 11 : 0,
  (F) => `اندفع ${F.L.name} صاعداً نحو عدو ثابت على المرتفع، فبلغه متعباً تحت السهام.`);
NR('e_assault_vs_spears', 'error', (F) => F.L.plan === 'assault' && F.W.line >= 0.3 && F.W.plan === 'defensive' ? 9 : 0,
  (F) => `هجوم ${F.L.name} الكاسح اصطدم بصفوف رماح مستعدة، والمستعد لا يُكسر بالاندفاع.`);
NR('e_pursuit_trap', 'error', (F) => F.L.pursueTrap ? 9 : 0,
  (F) => `طارد فرسان ${F.L.name} بلا حذر فوقعوا في كمين الاحتياط.`);
NR('e_withdraw_chaos', 'error', (F) => F.L.withdrew && !F.L.orderly ? 10 : 0,
  (F) => `أمر ${nCmd(F.L)} بالانسحاب، فتحول الانسحاب إلى فرار وحصدت المطاردة أكثر مما حصده القتال.`);
NR('e_starve_wait', 'error', (F) => siegeDef(F) === false && F.kind === 'siege' && F.L.plan === 'walls' && F.stores != null && F.stores < 0 ? 5 : 0,
  (F) => `انتظر المدافعون نجدة لم تأت حتى نفدت المؤن.`);
NR('e_no_means', 'error', (F) => F.noMeans && !F.W.att ? 12 : 0,
  (F) => `اقتحم ${F.L.name} الأسوار بلا كبش ولا سلالم ولا منجنيق، وما كان للرجال أن يتسلقوا الحجر بأيديهم.`);
NR('e_tired_attack', 'error', (F) => F.L.att && F.L.fat0 >= 30 ? 10 : 0,
  (F) => `هاجم ${F.L.name} وجيشه منهك من قتال سابق، ولم ينتظر أن يستريح.`);
NR('e_focus_waste', 'error', (F) => F.L.focus && F.L.ammoOut >= 2 && F.L.missile >= 0.2 ? 7 : 0,
  (F) => `ركز ${F.L.name} رميه على قطاع واحد فنفدت السهام قبل الأزمة.`);
NR('e_plan_counter', 'error', (F) => { const c = { assault: ['defensive', 'highground'], attrition: ['assault', 'flanking'], breakcenter: ['flanking'] }; return (c[F.L.plan] || []).includes(F.W.plan) ? 6 : 0; },
  (F) => `خطة «${F.L.planName}» اصطدمت بخطة «${F.W.planName}» المضادة لها.`);

// ═════════ حين لا يوجد خطأ: خسر رغم خطة معقولة ═════════
NR('ok_outnumbered', 'noerror', (F) => F.ratio >= 1.4 ? 8 : 0,
  (F) => `لم يخطئ ${nCmd(F.L)} خطأ واضحاً، لكن رجاله كانوا أقل بكثير.`);
NR('ok_walls', 'noerror', (F) => siegeDef(F) && F.walls >= 2 ? 8 : 0,
  (F) => `لم يكن في خطة ${F.L.name} خطأ ظاهر، لكن الأسوار أقوى من أي خطة.`);
NR('ok_tired', 'noerror', (F) => F.L.fat0 >= 25 ? 9 : 0,
  (F) => `خطة جيش ${F.L.name} كانت معقولة، لكن رجاله لم يستريحوا من معركتهم السابقة.`);
NR('ok_fortune', 'noerror', (F) => F.L.fortune < 0.95 && F.W.fortune > 1.02 ? 6 : 0,
  (F) => `قاتل جيش ${F.L.name} كما ينبغي، لكن الحظ لم يكن معه في ذلك اليوم.`);
NR('ok_quality', 'noerror', (F) => F.W.exp >= F.L.exp + 0.6 ? 7 : 0,
  (F) => `لم يُخطئ ${nCmd(F.L)}، لكن خصمه كان أخبر بالحرب رجلاً لرجل.`);
NR('ok_close', 'noerror', (F) => Math.abs(F.W.loss - F.L.loss) < 0.08 && F.phase >= 3 ? 7 : 0,
  (F) => `كانت معركة متكافئة حتى آخرها، وخسرها جيش ${F.L.name} دون خطأ يُذكر.`);
NR('ok_generic', 'noerror', () => 1,
  (F) => `لم يرتكب جيش ${F.L.name} خطأ واضحاً، لكن ميزان اليوم مال عنه.`);

// ═════════ لحظة التحول (من لحظات المحاكاة) ═════════
const turnOf = (F, kind) => F.W.moments.filter((m) => m.kind === kind).sort((a, b) => b.weight - a.weight)[0] || null;
const TURNS = [['charge', 'في ${ph} جاء الانقضاض الذي غيّر الميدان: ${t}.'], ['flank', 'لحظة التحول في ${ph}: ${t}.'], ['roll', 'في ${ph} ${t}، ومن هناك انقلب اليوم.'], ['feint', 'في ${ph}: ${t}.'], ['commander', 'في ${ph} ${t}، فتغير كل شيء.'], ['breach', 'في ${ph}: ${t}.'], ['broken', 'في ${ph} حدث ${t}، ولم يتعاف الجيش بعده.'], ['sally', 'في ${ph}: ${t}.'], ['tower', 'في ${ph}: ${t}.'], ['ram', 'في ${ph}: ${t}.'], ['hold', 'في ${ph}: ${t}.'], ['counter', 'في ${ph}: ${t}.'], ['rally', 'في ${ph}: ${t}.'], ['breakcenter', 'في ${ph}: ${t}.']];
for (const [kind, tpl] of TURNS) {
  NR('turn_' + kind, 'turn', (F) => { const m = turnOf(F, kind); return m ? 5 + m.weight : 0; },
    (F) => { const m = turnOf(F, kind); return tpl.replace('${ph}', F.phName(m.phase)).replace('${t}', m.text); });
}

// ═════════ ملاحظات تضيف معنى ═════════
NR('n_pyrrhic', 'note', (F) => F.W.loss >= 0.4 ? 8 : 0,
  (F) => `لكنه نصر مكلف: خسر جيش ${F.W.name} ${nPct(F.W.loss)}٪ من رجاله، وسيحتاج وقتاً قبل أن يقاتل مثله.`);
NR('n_decisive', 'note', (F) => F.L.loss - F.W.loss >= 0.35 ? 6 : 0,
  (F) => `كان نصراً حاسماً: فقد جيش ${F.L.name} ${nPct(F.L.loss)}٪ من رجاله مقابل ${nPct(F.W.loss)}٪ فقط.`);
NR('n_cmd_captured', 'note', (F) => F.L.cmd && F.L.cmd.fate === 'captured' && !led(F.W, 'hunt') ? 7 : 0,
  (F) => `ووقع ${F.L.cmd.name} في الأسر، وسيكون مصيره قراراً سياسياً لا عسكرياً.`);
NR('n_w_wounded', 'note', (F) => F.W.cmd && F.W.cmd.wounded && F.W.cmd.alive ? 6 : 0,
  (F) => `جُرح ${F.W.cmd.name} في القتال، ومع ذلك صمد جيشه.`);
NR('n_long', 'note', (F) => F.phase >= 4 && F.reason !== 'withdraw' ? 4 : 0,
  (F) => `دامت المعركة حتى آخر مراحلها، ولم يُحسم شيء قبل أن يُنهك الجانبان.`);
NR('n_short', 'note', (F) => F.phase <= 1 && F.reason !== 'withdraw' ? 5 : 0,
  (F) => `ولم تدم طويلاً: انتهى كل شيء في ${F.phName(Math.max(0, F.phase))}.`);
NR('n_pursuit', 'note', (F) => led(F.W, 'pursuit') >= 40 ? 6 : 0,
  (F) => `حصدت المطاردة ${Math.round(led(F.W, 'pursuit'))} رجلاً من المنهزمين${F.W.pursueHard ? '، فقد أطلق المنتصر فرسانه خلفهم' : ''}.`);
NR('n_orderly', 'note', (F) => F.L.orderly && F.L.withdrew ? 7 : 0,
  (F) => `الانسحاب المنظم حفظ لجيش ${F.L.name} معظم رجاله، ليقاتل يوماً آخر.`);
NR('n_res_intact', 'note', (F) => field(F) && !F.W.res && F.W.resLeft > 0 ? 4 : 0,
  (F) => `انتصر جيش ${F.W.name} دون أن يحتاج إلى احتياطه.`);
NR('n_hold', 'note', (F) => hasMom(F.W, 'hold') ? 5 : 0,
  (F) => `${F.W.moments.find((m) => m.kind === 'hold').text} كان مما يُذكر عن ذلك اليوم.`);
NR('n_w_tired', 'note', (F) => F.W.fat0 >= 25 ? 7 : 0,
  (F) => `ومما يُحسب لجيش ${F.W.name} أنه انتصر وهو متعب من قتال سابق.`);
NR('n_w_fatEnd', 'note', (F) => F.W.fatEnd >= 60 ? 5 : 0,
  (F) => `خرج المنتصر من الميدان منهكاً، ولن يكون خصماً سهلاً لمن يهاجمه الآن، لكنه ليس في أحسن حاله.`);
NR('n_ammo_both', 'note', (F) => F.W.ammoOut && F.L.ammoOut ? 5 : 0,
  (F) => `نفدت السهام لدى الجانبين قبل آخر اليوم، فكان الختام بالسيوف.`);
NR('n_hunger', 'note', (F) => F.kind === 'siege' && F.stores != null && F.stores < 0 && !siegeAtt(F) ? 6 : 0,
  (F) => `ومع النصر ما زال الجوع داخل الأسوار: المؤن نفدت.`);
NR('n_underdog', 'note', (F) => F.ratio <= 0.7 ? 8 : 0,
  (F) => `انتصر الأقل عدداً: ${F.W.men0} رجل مقابل ${F.L.men0}.`);

// ═════════ الافتتاح والختام ═════════
NR('o_field', 'open', (F) => field(F) ? 3 : 0,
  (F) => `التقى ${nCmd(F.W.att ? F.W : F.L)} على رأس ${(F.W.att ? F.W : F.L).name} بـ${nCmd(F.W.att ? F.L : F.W)} قائد ${(F.W.att ? F.L : F.W).name}${nAt(F)}${F.weather !== 'clear' && WEATHER[F.weather] ? ' في يوم ' + WEATHER[F.weather].name : ''}. اختار الأول «${(F.W.att ? F.W : F.L).planName}»، والثاني «${(F.W.att ? F.L : F.W).planName}».`,
  (F) => `اصطف جيشا ${F.W.name} و${F.L.name}${nAt(F)}: «${F.W.planName}» مقابل «${F.L.planName}».`);
NR('o_siege', 'open', (F) => (F.kind === 'siege' ? 3 : 0),
  (F) => { const a = F.W.att ? F.W : F.L, d = F.W.att ? F.L : F.W; return `زحف ${nCmd(a)} بجيش ${a.name} تحت أسوار ${F.place} بخطة «${a.planName}»، ووقف ${nCmd(d)} على الأسوار بخطة «${d.planName}».`; });
NR('o_tired', 'open', (F) => (F.W.fat0 >= 25 || F.L.fat0 >= 25 ? 4 : 0),
  (F) => { const t = F.W.fat0 >= F.L.fat0 ? F.W : F.L; return `لم يكن هذا القتال الأول لجيش ${t.name} في هذه الأيام، وقد وصل إليه متعباً.`; });
NR('x_field', 'end', (F) => field(F) && F.reason !== 'withdraw' ? 3 : 0, (F) => `وانتهى اليوم بنصر ${F.W.name}.`, (F) => `وبقي الميدان لجيش ${F.W.name}.`);
NR('x_fall', 'end', (F) => siegeAtt(F) ? 3 : 0, (F) => `وسقطت ${F.place} بيد ${F.W.name}.`);
NR('x_repelled', 'end', (F) => siegeDef(F) ? 3 : 0, (F) => `وارتد المهاجمون عن أسوار ${F.place}.`);
NR('x_withdraw', 'end', (F) => F.reason === 'withdraw' ? 4 : 0, (F) => `وانسحب جيش ${F.L.name} ليقاتل يوماً آخر.`);

// ═════════ التأليف ═════════
const Narr = {
  recent: [],
  count() { return NARR.length; },
  // اختيار صيغة: ثابتة للمعركة نفسها، وتتجنب ما استُخدم مؤخراً
  variant(c, F) {
    const n = c.t.length;
    let k = hashStr(c.id + ':' + F.seed) % n;
    for (let i = 0; i < n; i++) { const id = c.id + '#' + ((k + i) % n); if (!this.recent.includes(id)) { k = (k + i) % n; break; } }
    this.recent.push(c.id + '#' + k);
    if (this.recent.length > 40) this.recent.shift();
    try { return c.t[k](F); } catch (e) { return null; }
  },
  best(F, cat, n = 1) {
    const out = [];
    for (const c of NARR) {
      if (c.cat !== cat) continue;
      let w = 0;
      try { w = c.w(F) || 0; } catch (e) { w = 0; }
      if (w > 0) out.push({ c, w });
    }
    return out.sort((a, b) => b.w - a.w).slice(0, n);
  },
  compose(F) {
    const main = this.best(F, 'main')[0];
    const ter = this.best(F, 'terrain')[0];
    const err = this.best(F, 'error')[0];
    const ok = err ? null : this.best(F, 'noerror')[0];
    const turn = this.best(F, 'turn')[0];
    const notes = this.best(F, 'note', 2);
    const open = this.best(F, 'open')[0];
    const end = this.best(F, 'end')[0];
    const T = (x) => (x ? this.variant(x.c, F) : null);
    const r = { main: T(main), terrain: ter ? T(ter) : null, mistake: err ? T(err) : null, noError: ok ? T(ok) : null, turning: turn ? T(turn) : null, notes: notes.map(T).filter(Boolean), ids: [main, ter, err, ok, turn, ...notes].filter(Boolean).map((x) => x.c.id) };
    const loss = `الخسائر: ${F.W.men0 - F.W.menEnd} رجل من جيش ${F.W.name}، و${F.L.men0 - F.L.menEnd} من جيش ${F.L.name}.`;
    r.story = [T(open), r.main, r.terrain, r.turning, r.mistake || r.noError, ...r.notes, T(end), loss].filter(Boolean).join(' ');
    return r;
  },
};
