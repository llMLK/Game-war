'use strict';
// القادة: سجل تاريخي لكل سيناريو، ودرجات الشهرة، والقدرات المعلنة، وفرص الاستقطاب، والتفاوض على الأجر.
// «bio» مادة موثقة مختصرة بصياغة أصلية (راجعناها على ويكيبيديا). ما تفعله الشخصية داخل الحملة
// (السمة والعيب والولاء والمصير) محاكاة من اللعبة وليست تاريخاً.

const TIERS = {
  basic: { name: 'عادي', cls: 't-basic', why: 'قائد بلا سجل مشهور بعد.' },
  veteran: { name: 'مخضرم', cls: 't-vet', why: 'اكتسب شهرته في هذه الحملة بالانتصارات.' },
  notable: { name: 'بارز تاريخياً', cls: 't-notable', why: 'شخصية موثقة في المصادر التاريخية.' },
  legend: { name: 'أسطوري', cls: 't-legend', why: 'من أشهر شخصيات عصره.' },
};
const LEADER_SRC = { hist: 'سيرة موثقة', novel: 'من رواية لاحقة', fic: 'شخصية متخيَّلة' };
const FIC_BIO = 'شخصية متخيَّلة من صنع اللعبة، لا تستند إلى سيرة تاريخية.';
const NOVEL_BIO = 'شخصية من رواية «الممالك الثلاث» التي كُتبت في القرن الرابع عشر، ولا ذكر لها في السجلات التاريخية.';
const SKILL_NAMES = { coh: 'التماسك', exe: 'دقة الأوامر', res: 'إدارة الاحتياط', ret: 'الانسحاب المنظم' };
// التخصص يحدد أين تذهب نقطة المهارة التالية حين يتعلم القائد من المعارك
const SPEC_PREF = {
  tactician: ['exe', 'ret', 'coh', 'res'], brave: ['coh', 'res', 'exe', 'ret'], cavalier: ['exe', 'coh', 'ret', 'res'],
  archer: ['exe', 'res', 'coh', 'ret'], siege: ['exe', 'res', 'coh', 'ret'], defender: ['res', 'coh', 'exe', 'ret'],
  merchant: ['res', 'coh', 'exe', 'ret'], logistician: ['ret', 'res', 'coh', 'exe'], swift: ['ret', 'exe', 'coh', 'res'],
  mountaineer: ['exe', 'ret', 'res', 'coh'], desert: ['ret', 'exe', 'coh', 'res'], naval: ['exe', 'coh', 'res', 'ret'],
  elite: ['coh', 'exe', 'res', 'ret'], none: ['coh', 'exe', 'res', 'ret'],
};
const RETINUE = { pay: 6, men: 8 };
const INCOME_MARKS = [200, 350, 550];
const MAX_CHANCES = 3;
// العدد مع المعدود بالعربية: 1، 2، 3 إلى 10، 11 فأكثر
function arN(n, w) { return n === 1 ? w[0] : n === 2 ? w[1] : n <= 10 ? `${n} ${w[2]}` : `${n} ${w[3]}`; }

// L(الاسم، الموقع، السمة، العيب، [تماسك، دقة، احتياط، انسحاب]، الدرجة، [من، إلى]، صفحة ويكيبيديا الإنجليزية، العنوان العربي، السيرة، إضافات)
// الموقع: اسم مملكة (في بلاطها منذ البداية) أو 'stock' (مرشح حر يظهر في فرص الاستقطاب بين سنتي «من» و«إلى»)
function L(n, at, trait, flaw, sk, tier, y, wiki, ar, bio, o) {
  return { n, at, trait: trait || null, flaw: flaw || null, sk, tier, y, wiki, ar: ar || null, bio, src: 'hist', ...(o || {}) };
}
function F(n, at, trait, flaw, sk, o) { return { n, at, trait, flaw: flaw || null, sk, tier: 'basic', y: [0, 9999], wiki: null, ar: null, bio: FIC_BIO, src: 'fic', ...(o || {}) }; }

const LEADERS = {
  threeKingdoms: [
    // --- شو ---
    L('ليو باي', 'shu', 'merchant', null, [2, 1, 1, 1], 'legend', [161, 223], 'Liu_Bei', 'ليو باي', 'أمير حرب من أواخر أسرة هان الشرقية، أسّس دولة شو هان وصار أول أباطرتها سنة 221.'),
    L('قوان يو', 'shu', 'brave', 'arrogant', [3, 2, 1, 0], 'legend', [160, 220], 'Guan_Yu', 'كوان يو', 'من أوائل أتباع ليو باي مع جانغ في. قاد جبهة جينغ حتى أسرته قوات سون تشوان وقتلته مطلع سنة 220.'),
    L('جانغ في', 'shu', 'brave', 'harsh', [3, 1, 1, 0], 'notable', [165, 221], 'Zhang_Fei', 'جانغ فاي', 'قائد وسياسي في خدمة ليو باي منذ بداياته، ومات سنة 221.'),
    L('جاو يون', 'shu', 'cavalier', null, [2, 2, 1, 1], 'legend', [168, 229], 'Zhao_Yun', 'جاو يون', 'كان تابعاً لأمير الحرب الشمالي غونغسون زان قبل أن يلتحق بليو باي، وخدم شو حتى وفاته سنة 229.'),
    L('جوغه ليانغ', 'shu', 'elite', null, [2, 3, 2, 1], 'legend', [181, 234], 'Zhuge_Liang', 'تشوغ ليانغ', 'رجل دولة واستراتيجي عاش انهيار أسرة هان، والمهندس الأول لدولة شو هان حتى وفاته سنة 234.'),
    L('هوانغ جونغ', 'shu', 'archer', null, [2, 1, 1, 0], 'notable', [150, 220], 'Huang_Zhong', null, 'قائد في خدمة ليو باي، اشتهر بانتصاره في معركة جبل دينغجون سنة 219 التي قُتل فيها قائد وي شياهو يوان.'),
    L('وي يان', 'shu', 'mountaineer', 'arrogant', [1, 1, 1, 0], 'notable', [175, 234], 'Wei_Yan', null, 'بدأ تابعاً لليو باي ثم صار قائداً وسياسياً بارزاً في شو هان، ومات نحو سنة 234.'),
    L('ما ليانغ', 'shu', 'logistician', null, [1, 1, 0, 0], 'notable', [187, 222], 'Ma_Liang_(Three_Kingdoms)', null, 'مسؤول في خدمة ليو باي اشتهر بموهبته منذ صغره، وقُتل في معركة شياوتينغ سنة 222.'),
    L('بانغ تونغ', 'stock', 'tactician', null, [1, 2, 1, 0], 'notable', [209, 214], 'Pang_Tong', 'بانغ تونغ', 'مستشار رئيسي لليو باي، استُخفّ به في صباه لبساطة مظهره. مات سنة 214.', { aff: 'shu', star: true }),
    L('فا جنغ', 'stock', 'tactician', null, [1, 2, 0, 1], 'notable', [211, 220], 'Fa_Zheng', null, 'من أسرة عريقة، رحل إلى إقليم يي في خدمة ليو جانغ ثم صار مستشاراً رئيسياً لليو باي.', { aff: 'shu' }),
    L('ما تشاو', 'stock', 'cavalier', 'reckless', [2, 1, 0, 1], 'notable', [212, 222], 'Ma_Chao', null, 'من نسل القائد ما يوان وأكبر أبناء ما تنغ. هُزم أمام تساو تساو في معبر تونغ سنة 211، ثم انضم إلى ليو باي.', { aff: 'shu' }),
    L('وانغ بينغ', 'stock', 'defender', null, [1, 1, 2, 0], 'notable', [219, 248], 'Wang_Ping_(Three_Kingdoms)', null, 'ضابط في جيش تساو تساو انشق إلى ليو باي في حملة هانزونغ سنة 219، ولم يتعلم القراءة لأنه دخل الجيش صغيراً.', { aff: 'shu' }),
    L('جيانغ وي', 'stock', 'mountaineer', null, [1, 2, 1, 1], 'notable', [228, 264], 'Jiang_Wei', null, 'وُلد سنة 202 في مقاطعة جي، وصار من أبرز قادة شو هان وسياسييها.', { aff: 'shu', star: true }),
    L('ما داي', 'stock', 'cavalier', null, [1, 1, 0, 1], 'notable', [214, 235], 'Ma_Dai', null, 'خدم عمّه ما تنغ في الشمال الغربي ثم صار قائداً في شو هان.', { aff: 'shu' }),
    L('لي يان', 'stock', 'logistician', null, [0, 1, 1, 0], 'notable', [214, 231], 'Li_Yan_(Three_Kingdoms)', null, 'قائد في شو هان، ويُعرف أيضاً باسم لي بينغ. بلغ ذروة مسيرته حين عُهد إليه بالوصاية مع جوغه ليانغ.', { aff: 'shu' }),
    L('منغ دا', 'stock', 'swift', 'disloyal', [1, 1, 0, 1], 'notable', [211, 228], 'Meng_Da', null, 'خدم ليو جانغ ثم ليو باي، وانشق إلى وي، ثم ثار عليها نحو سنة 227 ساعياً إلى العودة لشو.'),
    L('هوانغ تشيوان', 'stock', 'defender', null, [1, 1, 1, 0], 'notable', [214, 240], 'Huang_Quan_(general)', null, 'خدم ليو جانغ ثم ليو باي الذي اعتمد عليه، ثم انتقل إلى وي.'),
    L('ليو با', 'stock', 'merchant', null, [0, 1, 0, 0], 'notable', [214, 222], 'Liu_Ba', null, 'مسؤول خدم ليو جانغ ثم ليو باي، وساعده على مكافأة أتباعه من الخزينة دون أن يفقرها.', { aff: 'shu' }),
    // --- وي ---
    L('تساو تساو', 'wei', 'tactician', 'harsh', [3, 3, 1, 1], 'legend', [155, 220], 'Cao_Cao', 'تساو تساو', 'رجل دولة وأمير حرب وشاعر، أحكم قبضته على بلاط هان في سنواتها الأخيرة ووضع أساس دولة وي.'),
    L('شياهو دون', 'wei', 'brave', 'reckless', [2, 1, 1, 0], 'notable', [160, 220], 'Xiahou_Dun', null, 'من قادة تساو تساو وسياسييه، وخدم أشهراً قليلة في عهد خليفته قبل وفاته سنة 220.'),
    L('شياهو يوان', 'wei', 'swift', 'reckless', [1, 2, 0, 1], 'notable', [160, 219], 'Xiahou_Yuan', null, 'قائد في خدمة تساو تساو، عُرف بحملاته في غرب الصين، وقُتل في معركة جبل دينغجون سنة 219.'),
    L('جانغ لياو', 'wei', 'cavalier', null, [3, 2, 1, 0], 'notable', [169, 222], 'Zhang_Liao', null, 'قائد في خدمة تساو تساو، ذاع صيته بدفاعه عن خفي في معركة معبر شياوياو.'),
    L('سيما يي', 'wei', 'defender', 'disloyal', [2, 2, 2, 1], 'notable', [179, 251], 'Sima_Yi', 'سيما يي', 'قائد وسياسي ثم وصي على دولة وي. بدأ مسيرته الرسمية في عهد تساو تساو.'),
    L('تساو رن', 'wei', 'defender', null, [2, 1, 2, 0], 'notable', [168, 223], 'Cao_Ren', null, 'ابن عم تساو تساو ومن كبار قادته، وواصل الخدمة في دولة وي حتى وفاته سنة 223.'),
    L('شو هوانغ', 'wei', 'siege', null, [1, 2, 1, 0], 'notable', [169, 227], 'Xu_Huang', null, 'قائد في خدمة تساو تساو ثم في دولة وي حتى وفاته سنة 227.'),
    L('جانغ خه', 'wei', 'mountaineer', null, [1, 2, 1, 1], 'notable', [170, 231], 'Zhang_He', 'تشانغ هي (ضابط)', 'قائد في خدمة تساو تساو، واستمر في دولة وي في عهد أول حاكمين لها.'),
    L('تساو تشون', 'wei', 'elite', null, [1, 1, 1, 0], 'notable', [170, 210], 'Cao_Chun', null, 'ابن عم تساو تساو، اشتهر بقيادة فرسان «النمر والفهد».'),
    L('شون يو', 'wei', 'merchant', null, [0, 1, 1, 0], 'notable', [163, 212], 'Xun_Yu', null, 'مستشار تساو تساو ومن أبرز رجال إدارته.'),
    L('يو جين', 'wei', 'logistician', 'disloyal', [1, 1, 1, 0], 'notable', [165, 221], 'Yu_Jin', null, 'انضم إلى تساو تساو سنة 192 مع بداية الحروب الأهلية وصار من قادته.'),
    L('شو تشو', 'wei', 'brave', null, [2, 1, 0, 0], 'notable', [170, 230], 'Xu_Chu', null, 'بدأ حارساً شخصياً لتساو تساو ثم صار قائداً في وي. لقّبه رجاله «النمر الأحمق» لقوته وبساطته.'),
    L('دنغ آي', 'stock', 'mountaineer', 'cautious', [1, 2, 1, 1], 'notable', [230, 264], 'Deng_Ai', null, 'قائد وسياسي في وي، اشتهر بدوره الحاسم في غزو وي لشو.', { aff: 'wei', star: true }),
    L('بانغ دي', 'stock', 'brave', null, [2, 1, 0, 0], 'notable', [211, 219], 'Pang_De', null, 'بدأ في خدمة ما تنغ ثم ابنه ما تشاو، وبقي في هانزونغ حين انتقل ما تشاو إلى ليو باي.'),
    L('تساو جانغ', 'stock', 'cavalier', null, [2, 1, 0, 0], 'notable', [216, 223], 'Cao_Zhang', null, 'ابن تساو تساو الملقب «ذو اللحية الصفراء»، قاد جنده إلى انتصارات على غارات الووهوان في الشمال.', { aff: 'wei' }),
    L('تساو شيو', 'stock', 'swift', null, [1, 1, 0, 1], 'notable', [217, 228], 'Cao_Xiu', null, 'قريب بعيد لتساو تساو، تفوّق على جانغ في في بداية حملة هانزونغ، ومات بعد هزيمة وي في معركة شيتينغ سنة 228.', { aff: 'wei' }),
    L('شو شو', 'stock', 'tactician', null, [0, 2, 1, 0], 'notable', [208, 234], 'Xu_Shu', null, 'كان في شبابه مقاتلاً يأخذ الحق بيده، ثم خدم ليو باي قبل أن ينتقل إلى معسكر تساو تساو.', { star: true }),
    L('لي ديان', 'stock', 'defender', null, [1, 1, 1, 0], 'notable', [200, 217], 'Li_Dian', 'لي ديان', 'قائد وسياسي في خدمة تساو تساو، شارك في معركة غواندو سنة 200.', { aff: 'wei' }),
    L('مان تشونغ', 'stock', 'defender', null, [1, 1, 2, 0], 'notable', [208, 242], 'Man_Chong', null, 'قائد وسياسي خدم تساو تساو ثم دولة وي من بعده.', { aff: 'wei' }),
    // --- وو ---
    L('سون تشوان', 'wu', 'merchant', 'cautious', [1, 1, 1, 1], 'notable', [182, 252], 'Sun_Quan', 'سون تشوان', 'مؤسس وو الشرقية، ورث السلطة التي أقامها أبوه سون جيان وأخوه سون تسه.'),
    L('جو يو', 'wu', 'naval', null, [2, 3, 1, 1], 'legend', [175, 210], 'Zhou_Yu', null, 'خدم سون تسه ثم سون تشوان، وأدّى دوراً قيادياً في هزيمة تساو تساو في معركة المنحدرات الحمراء.'),
    L('لو منغ', 'wu', 'tactician', null, [2, 2, 1, 0], 'notable', [178, 220], 'Lü_Meng', null, 'قائد وسياسي في خدمة سون تشوان، قاد غزو إقليم جينغ سنة 219.'),
    L('غان نينغ', 'wu', 'elite', 'reckless', [2, 1, 0, 1], 'notable', [172, 220], 'Gan_Ning', 'غان نينغ', 'كان قرصاناً سيئ السمعة، ثم ترك حياة النهب وصار قائداً في خدمة سون تشوان.'),
    L('تشنغ بو', 'wu', 'defender', null, [2, 1, 1, 0], 'notable', [170, 210], 'Cheng_Pu', null, 'قائد مخضرم خدم سون جيان ثم سون تسه ثم سون تشوان.'),
    L('هان دانغ', 'wu', 'archer', null, [1, 1, 1, 0], 'notable', [170, 227], 'Han_Dang', null, 'خدم سون جيان وسون تسه ثم سون تشوان، وعاش حتى أوائل عصر الممالك الثلاث.'),
    L('هوانغ غاي', 'wu', 'naval', null, [1, 1, 1, 0], 'notable', [180, 215], 'Huang_Gai', null, 'قائد خدم سون جيان وسون تسه ثم سون تشوان.'),
    L('لينغ تونغ', 'wu', 'brave', null, [1, 1, 0, 0], 'notable', [189, 217], 'Ling_Tong', 'لينغ تونغ', 'دخل خدمة سون تشوان وهو فتى، ومات سنة 217.'),
    L('لو سو', 'wu', 'logistician', null, [1, 1, 1, 0], 'notable', [172, 217], 'Lu_Su', null, 'قائد وسياسي، انضم إلى سون تشوان سنة 200 حين تسلّم السلطة.'),
    L('جو تاي', 'wu', 'defender', null, [2, 0, 1, 0], 'notable', [170, 223], 'Zhou_Tai', null, 'خدم سون تسه ثم سون تشوان، وعاش حتى أوائل عصر الممالك الثلاث.'),
    L('جيانغ تشين', 'wu', 'naval', null, [1, 1, 0, 0], 'notable', [175, 220], 'Jiang_Qin', null, 'قائد وخبير بحري خدم سون تسه ثم سون تشوان، وشارك في معركة معبر شياوياو.'),
    L('جو هوان', 'wu', 'siege', 'arrogant', [1, 1, 0, 0], 'notable', [177, 238], 'Zhu_Huan', null, 'بدأ مبكراً في خدمة سون تشوان، لكنه لم ينل قيادة مهمة إلا متأخراً.'),
    L('لو شون', 'stock', 'defender', null, [2, 2, 2, 1], 'notable', [215, 245], 'Lu_Xun_(Eastern_Wu)', null, 'بدأ موظفاً عند سون تشوان، وساعد لو منغ في غزو جينغ سنة 219، وصار لاحقاً مستشاراً إمبراطورياً لوو.', { aff: 'wu', star: true }),
    L('جو ران', 'stock', 'defender', null, [2, 1, 2, 0], 'notable', [212, 249], 'Zhu_Ran', null, 'صديق طفولة سون تشوان. ساعد في أسر قوان يو سنة 219، ودافع عن جيانغلينغ بخمسة آلاف رجل أمام جيش يفوقه عشر مرات.', { aff: 'wu' }),
    L('شو شنغ', 'stock', 'naval', null, [1, 1, 1, 0], 'notable', [208, 229], 'Xu_Sheng', null, 'قائد في خدمة سون تشوان في أواخر هان وأوائل الممالك الثلاث.', { aff: 'wu', star: true }),
    L('دينغ فنغ', 'stock', 'swift', null, [1, 1, 0, 1], 'notable', [222, 271], 'Ding_Feng_(general)', null, 'قائد وسياسي في دولة وو الشرقية، مات سنة 271.', { aff: 'wu' }),
    // --- المحايدون ---
    L('جانغ لو', 'neutral', 'defender', null, [1, 0, 2, 0], 'notable', [180, 216], 'Zhang_Lu_(Han_dynasty)', null, 'زعيم ديني وأمير حرب، ثالث «المعلمين السماويين» الطاويين. حكم هانزونغ حتى استسلم لتساو تساو سنة 215.'),
    L('منغ هوو', 'neutral', 'brave', 'reckless', [1, 0, 1, 0], 'notable', [190, 230], 'Meng_Huo', null, 'زعيم محلي في منطقة نانجونغ. معظم ما يُروى عنه يأتي من مصادر متأخرة ومن الرواية الشعبية.'),
    L('شي شيه', 'neutral', 'merchant', null, [0, 1, 1, 0], 'notable', [137, 226], 'Shi_Xie', null, 'قائد وسياسي وأمير حرب حكم جياوتشو (شمال فيتنام اليوم) في أواخر هان وأوائل الممالك الثلاث.'),
    L('هان سوي', 'neutral', 'desert', 'disloyal', [1, 1, 0, 1], 'notable', [145, 215], 'Han_Sui', null, 'قائد وأمير حرب صغير، نشط معظم حياته في إقليم ليانغ الشمالي الغربي.'),
    L('ما تنغ', 'neutral', 'cavalier', null, [1, 1, 0, 1], 'notable', [150, 212], 'Ma_Teng', null, 'قائد وأمير حرب سيطر على إقليم ليانغ، وأبو ما تشاو.'),
    // --- قادة الأحداث: غزاة ومرتزقة ---
    L('كبي نينغ', 'event', 'cavalier', null, [2, 2, 1, 1], 'notable', [207, 235], 'Kebineng', null, 'زعيم من الشيانبي صعد نجمه بعد أن هزم تساو تساو الووهوان سنة 207، واغتالته قوات وي سنة 235.'),
    L('بو دو غن', 'event', 'swift', 'harsh', [1, 2, 0, 1], 'notable', [200, 233], 'Budugen', null, 'زعيم من الشيانبي وحفيد تانشيهواي، حفظ استقلاله بإعلان الولاء لوي وإرسال الجزية.'),
    F('سو لي', 'event', 'archer', null, [1, 1, 1, 0]),
    { n: 'مولو ملك الوحوش', at: 'event', trait: 'brave', flaw: 'reckless', sk: [1, 1, 0, 0], tier: 'basic', y: [0, 9999], wiki: 'List_of_fictional_people_of_the_Three_Kingdoms', ar: null, bio: NOVEL_BIO, src: 'novel' },
    { n: 'وو تو قو', at: 'event', trait: 'defender', flaw: null, sk: [2, 1, 2, 0], tier: 'basic', y: [0, 9999], wiki: 'List_of_fictional_people_of_the_Three_Kingdoms', ar: null, bio: NOVEL_BIO, src: 'novel' },
    { n: 'تشو رونغ', at: 'event', trait: 'swift', flaw: null, sk: [1, 1, 0, 1], tier: 'basic', y: [0, 9999], wiki: 'List_of_fictional_people_of_the_Three_Kingdoms', ar: null, bio: NOVEL_BIO, src: 'novel' },
    F('يو فو لوو', 'event', 'mountaineer', null, [1, 1, 1, 0]),
    F('تشين دا', 'event', 'swift', 'greedy', [1, 1, 0, 1]),
    F('لوو هاي', 'event', 'naval', 'greedy', [1, 1, 1, 0]),
  ],

  umayyad: [
    // --- الدولة الأموية ---
    L('سليمان بن عبد الملك', 'umayyad', 'merchant', 'greedy', [1, 1, 1, 0], 'notable', [675, 717], 'Sulayman_ibn_Abd_al-Malik', 'سليمان بن عبد الملك', 'الخليفة الأموي السابع (715 إلى 717)، ابن الخليفة عبد الملك. كان والياً على فلسطين قبل الخلافة.'),
    L('مسلمة بن عبد الملك', 'umayyad', 'siege', null, [2, 2, 2, 1], 'legend', [705, 738], 'Maslama_ibn_Abd_al-Malik', 'مسلمة بن عبد الملك', 'أمير أموي ومن أبرز قادة العرب في مطلع القرن الثامن، قاد حملات على الروم والخزر.'),
    L('العباس بن الوليد', 'umayyad', 'cavalier', null, [2, 2, 1, 0], 'notable', [705, 750], 'Al-Abbas_ibn_al-Walid', 'العباس بن الوليد بن عبد الملك', 'أمير وقائد أموي، أكبر أبناء الخليفة الوليد الأول، وبرز قائداً في الحروب مع الروم.'),
    L('الجراح الحكمي', 'umayyad', 'brave', 'reckless', [2, 1, 1, 0], 'notable', [700, 730], 'Al-Jarrah_ibn_Abdallah_al-Hakami', 'الجراح الحكمي', 'نبيل وقائد عربي من قبيلة حكم، برز في الحروب الأموية مطلع القرن الثامن.'),
    L('محمد بن مروان', 'umayyad', 'defender', null, [2, 1, 2, 0], 'notable', [690, 720], 'Muhammad_ibn_Marwan', 'محمد بن مروان', 'أمير أموي ومن أهم قادة الدولة بين 690 و710، ومات نحو سنة 720.'),
    L('عمر بن هبيرة', 'umayyad', 'naval', null, [1, 1, 1, 0], 'notable', [696, 726], 'Umar_ibn_Hubayra', 'عمر بن هبيرة', 'قائد أموي بارز صار والياً على العراق، وأدى دوراً في صراع القيسية واليمنية.'),
    L('سعيد الحرشي', 'umayyad', 'swift', 'harsh', [2, 1, 0, 1], 'notable', [715, 735], "Sa'id_ibn_Amr_al-Harashi", 'سعيد بن عمرو الحرشي', 'قائد ووالٍ أموي بارز، أدى دوراً مهماً في الحروب العربية الخزرية.'),
    L('مروان بن محمد', 'umayyad', 'tactician', null, [1, 1, 1, 0], 'notable', [691, 750], 'Marwan_II', 'مروان بن محمد', 'آخر خلفاء بني أمية (744 إلى 750). قبل الخلافة قاد جبهة القوقاز وهزم الخزر سنة 737.'),
    L('بشر بن الوليد', 'umayyad', 'archer', null, [1, 1, 0, 0], 'notable', [710, 745], 'Bishr_ibn_al-Walid', 'بشر بن الوليد بن عبد الملك', 'أمير وقائد أموي، قاد غزوتين على الروم سنة 710 و714.'),
    L('خالد القسري', 'umayyad', 'merchant', 'greedy', [0, 1, 1, 0], 'notable', [705, 743], 'Khalid_al-Qasri', 'خالد القسري', 'والي مكة ثم والي العراق من 724 إلى 738، وكان منصبه من أرفع مناصب الدولة وأغناها.'),
    L('سليمان بن معاذ', 'umayyad', 'defender', null, [1, 1, 1, 0], 'basic', [710, 720], 'Siege_of_Constantinople_(717–718)', null, 'يرد اسمه في روايات حصار القسطنطينية (717 إلى 718) قائداً في الجيش الأموي. لا سيرة مستقلة له في ويكيبيديا.'),
    L('يزيد بن المهلب', 'umayyad', 'logistician', 'disloyal', [1, 2, 1, 0], 'notable', [690, 720], 'Yazid_ibn_al-Muhallab', 'يزيد بن المهلب', 'قائد ورجل دولة أموي في العراق وخراسان، ثار على الدولة سنة 720.'),
    L('هشام بن عبد الملك', 'umayyad', 'elite', 'cautious', [1, 1, 1, 0], 'notable', [691, 743], 'Hisham_ibn_Abd_al-Malik', 'هشام بن عبد الملك', 'الخليفة الأموي العاشر، حكم من 724 حتى وفاته سنة 743.'),
    L('عبد الله البطال', 'stock', 'brave', null, [3, 1, 1, 0], 'legend', [715, 740], 'Abdallah_al-Battal', 'عبد الله البطال', 'قائد في الحروب العربية البيزنطية مطلع القرن الثامن. أخباره الموثقة قليلة، ونشأت حوله بعد موته سيرة شعبية واسعة في الأناضول.', { aff: 'umayyad', star: true }),
    L('نصر بن سيار', 'stock', 'defender', null, [2, 1, 2, 0], 'notable', [715, 748], 'Nasr_ibn_Sayyar', 'نصر بن سيار الكناني', 'قائد عربي وآخر ولاة بني أمية على خراسان (738 إلى 748)، وبرز في الحروب ضد الترغش.', { aff: 'umayyad', star: true }),
    L('أسد بن عبد الله القسري', 'stock', 'cavalier', 'harsh', [1, 2, 1, 0], 'notable', [723, 738], 'Asad_ibn_Abdallah_al-Qasri', 'أسد بن عبد الله القسري', 'والي خراسان مرتين في عهد الخليفة هشام بن عبد الملك.', { aff: 'umayyad', star: true }),
    L('الحارث بن سريج', 'stock', 'swift', 'disloyal', [1, 1, 0, 1], 'notable', [728, 746], 'Al-Harith_ibn_Surayj', 'الحارث بن سريج', 'قائد ثورة اجتماعية واسعة على الدولة الأموية في خراسان.', { star: true }),
    L('مسلم بن سعيد الكلابي', 'stock', 'tactician', 'cautious', [1, 1, 1, 0], 'notable', [720, 735], "Muslim_ibn_Sa'id_al-Kilabi", 'مسلم بن سعيد الكلابي', 'والي خراسان (723 إلى 724). عُرف بمحاولته استمالة أهل ما وراء النهر، وبهزيمته الكبيرة في «يوم العطش» أمام الترغش.', { aff: 'umayyad' }),
    L('إسحاق بن مسلم العقيلي', 'stock', 'mountaineer', null, [1, 1, 1, 0], 'notable', [730, 760], 'Ishaq_ibn_Muslim_al-Uqayli', 'إسحاق بن مسلم العقيلي', 'قائد ووالٍ أموي على أرمينية، ومن أقرب أنصار مروان بن محمد.', { aff: 'umayyad' }),
    L('مسلمة بن هشام', 'stock', 'siege', null, [1, 1, 1, 0], 'notable', [735, 750], 'Maslama_ibn_Hisham', 'مسلمة بن هشام', 'أمير وقائد أموي. كان استيلاؤه على أنقرة سنة 739 آخر مكاسب الأمويين في حروبهم مع الروم.', { aff: 'umayyad' }),
    // --- الروم ---
    L('ثيودوسيوس', 'byzantine', 'merchant', 'cautious', [0, 1, 1, 0], 'notable', [660, 754], 'Theodosius_III', 'ثيودوسيوس الثالث', 'إمبراطور الروم من نحو 715 إلى 717. كان جابي ضرائب في أدراميتيون قبل أن يُرفع إلى العرش.'),
    L('ليون الإيساوري', 'byzantine', 'defender', null, [2, 2, 3, 1], 'legend', [685, 741], 'Leo_III_the_Isaurian', 'لاون الثالث الإيساوري', 'قائد رومي صار إمبراطوراً سنة 717 وأسس الأسرة الإيساورية، وحكم حتى وفاته سنة 741.'),
    L('أرتاباسدوس', 'byzantine', 'cavalier', 'disloyal', [2, 1, 1, 1], 'notable', [700, 743], 'Artabasdos', 'أرتاباسدوس', 'قائد رومي من أصل أرمني، استولى على العرش بين 741 و743.'),
    L('سيسينيوس', 'byzantine', 'brave', null, [1, 1, 0, 0], 'basic', [700, 719], 'Rendakis', null, 'من أسرة رينداكيس النبيلة القوية في الدولة الرومية بين القرنين الثامن والعاشر.'),
    L('باسيل أونوماغولوس', 'byzantine', 'logistician', null, [0, 1, 1, 0], 'notable', [700, 718], 'Basil_Onomagoulos', null, 'موظف رومي أُعلن إمبراطوراً منافساً في صقلية سنة 717 باسم طيباريوس.'),
    F('نقيطاس', 'byzantine', 'swift', null, [1, 1, 0, 1]),
    F('مانويل', 'byzantine', 'elite', null, [2, 1, 1, 0]),
    F('بطرس', 'byzantine', 'mountaineer', null, [1, 1, 0, 0]),
    F('ثيوفيلاكتوس', 'byzantine', 'siege', null, [0, 1, 1, 0]),
    F('يوحنا', 'byzantine', 'archer', null, [1, 1, 0, 0]),
    F('ميخائيل', 'byzantine', 'naval', 'greedy', [1, 1, 1, 0]),
    L('أناستاسيوس', 'stock', 'naval', null, [1, 2, 1, 0], 'notable', [715, 719], 'Anastasius_II_(emperor)', 'أرتيميوس أناستاسيوس الثاني', 'إمبراطور الروم من 713 إلى 715، واسمه الأصلي أرتيميوس. خُلع سنة 715 ومات سنة 719.', { aff: 'byzantine' }),
    L('قسطنطين', 'stock', 'tactician', 'harsh', [2, 2, 1, 1], 'notable', [736, 775], 'Constantine_V', 'قسطنطين الخامس', 'ابن ليون الثالث، وُلد سنة 718 وحكم إمبراطوراً من 741 إلى 775، وكان قائداً عسكرياً قديراً.', { aff: 'byzantine', star: true }),
    // --- الخزر ---
    L('بارجيك', 'khazar', 'cavalier', 'reckless', [2, 1, 1, 1], 'notable', [700, 731], 'Barjik', 'بارجيك', 'خاقان خزري قاد جيوش الخزر في الحروب العربية الخزرية، ولقّبه أعداؤه «الخاقان الملعون». مات سنة 731 أو 732.'),
    L('آلب طرخان', 'khazar', 'archer', null, [2, 1, 0, 1], 'notable', [700, 737], 'Alp_Tarkhan', null, 'قائد خزري في الحروب العربية الخزرية. لا يُعرف إن كان «آلب طرخان» اسماً أم لقباً، فآلب تعني البطل وطرخان تعني أمير الحرب.'),
    L('هزر طرخان', 'khazar', 'brave', null, [1, 1, 1, 0], 'notable', [700, 737], 'Hazer_Tarkhan', 'هزر طرخان', 'قائد خزري قاد سنة 737 جيشاً في مواجهة مروان بن محمد.', { alias: ['هزار طرخان'] }),
    L('بولان', 'khazar', 'merchant', null, [0, 1, 1, 0], 'notable', [700, 760], 'Bulan_(Khazar)', 'بولان (خزر)', 'حاكم خزري ومؤسس السلالة البولانية، ويُنسب إليه عادةً قيادة تحوّل الخزر إلى اليهودية.'),
    F('قاطون', 'khazar', 'swift', 'harsh', [1, 1, 0, 1]),
    F('قوتلوغ', 'khazar', 'elite', null, [1, 1, 1, 0]),
    F('تونغا', 'khazar', 'tactician', 'arrogant', [1, 1, 0, 0]),
    F('قرلغ', 'khazar', 'mountaineer', null, [1, 1, 0, 0]),
    F('ساروخ', 'khazar', 'logistician', null, [0, 1, 1, 0]),
    F('باغاتور', 'khazar', 'desert', null, [1, 1, 0, 0]),
    L('بيهار', 'stock', 'cavalier', null, [1, 1, 1, 0], 'notable', [730, 750], 'Bihar_(Khazar)', 'بهار (خزر)', 'خاقان الخزر في ثلاثينيات القرن الثامن، وربما هو «بوسير إرباس» المذكور في المصادر الرومية.', { aff: 'khazar', alias: ['الخاقان بيهار'] }),
    // --- المحايدون ---
    L('سمبات الباغراتي', 'neutral', 'cavalier', null, [1, 1, 1, 0], 'notable', [670, 726], 'Smbat_VI_Bagratuni', null, 'أمير أرمني من الأسرة الباغراتية، كان الأمير الحاكم لأرمينية بانقطاعات من 691 حتى العقد الثاني من القرن الثامن.', { alias: ['سمبات'] }),
    L('غوارام الكرجي', 'neutral', 'mountaineer', null, [1, 1, 1, 0], 'notable', [690, 748], 'Guaram_III_of_Iberia', null, 'أمير حاكم لإيبيريا (كارتلي، شرق جورجيا) من قبل 693 إلى نحو 748، وحمل لقب «كوروبالاتيس» الرومي.'),
    F('حسّان التدمري', 'neutral', 'desert', null, [1, 1, 0, 0]),
    L('أشوط الباغراتي', 'stock', 'defender', null, [1, 1, 1, 0], 'notable', [732, 748], 'Ashot_III_Bagratuni', null, 'أمير أرمينية من 732 إلى 748، ويُعرف بأشوط الأعمى. عيّنه مروان بن محمد، وانتهج سياسة التقارب مع العرب.', { alias: ['أشوط الأرمني'] }),
    // --- قادة الأحداث ---
    L('سولوك أبو مزاحم', 'event', 'cavalier', null, [2, 2, 1, 1], 'notable', [717, 738], 'Suluk_(khagan)', null, 'خاقان الترغش الذي قاتل الأمويين في ما وراء النهر، وسمّته المصادر العربية «أبا مزاحم». قُتل سنة 738.'),
    L('كورصول', 'event', 'swift', 'reckless', [1, 2, 0, 1], 'notable', [720, 740], 'Kül-chor', 'كورصول', 'من كبار قادة الترغش في عهد الخاقان سولوك، ويُعرف في المصادر الصينية باسم «باغا طرخان». قتل سولوك سنة 738.'),
    F('يلدوز طرخان', 'event', 'archer', null, [1, 1, 1, 0]),
    L('ترفل خان', 'event', 'cavalier', null, [2, 2, 1, 1], 'notable', [700, 721], 'Tervel_of_Bulgaria', 'تيرفيل ملك بلغاريا', 'حاكم بلغاريا مطلع القرن الثامن، ومنحه الإمبراطور جستنيان الثاني لقب «قيصر» سنة 705.'),
    L('كورميسوش', 'event', 'brave', null, [1, 1, 1, 0], 'notable', [720, 740], 'Kormisosh', null, 'حاكم لبلغاريا في القرن الثامن ورد اسمه في وثائق قليلة، ويُختلف في ترتيبه بين الحكام.'),
    L('سيفار', 'event', 'swift', null, [1, 1, 0, 1], 'notable', [730, 753], 'Sevar_of_Bulgaria', 'سيفار', 'حاكم لبلغاريا في القرن الثامن.'),
    F('قتلو خان', 'event', 'swift', 'harsh', [1, 1, 0, 1]),
    F('باياندور', 'event', 'archer', null, [1, 1, 1, 0]),
    F('بوريسلاف', 'event', 'brave', null, [1, 1, 0, 0]),
    F('شهريار الديلمي', 'event', 'mountaineer', 'greedy', [1, 1, 1, 0]),
    F('غريغور الأرمني', 'event', 'cavalier', 'greedy', [1, 1, 0, 1]),
  ],
};

// ------------------، منطق القادة -------------------
Object.assign(Game, {
  cat() { return (this.S && LEADERS[this.S.scenario]) || []; },
  catFind(name) { return name ? this.cat().find((e) => e.n === name || (e.alias || []).includes(name)) || null : null; },
  catOf(g) { return g && g.cat ? this.catFind(g.cat) : null; },
  wikiUrl(e) {
    if (!e || !e.wiki) return null;
    return e.ar ? 'https://ar.wikipedia.org/wiki/' + encodeURIComponent(e.ar.replace(/ /g, '_')) : 'https://en.wikipedia.org/wiki/' + encodeURIComponent(e.wiki);
  },
  nameTaken(name) {
    const e = this.catFind(name);
    return Object.values(this.S.gens).some((g) => g.name === name || (e && g.cat === e.n));
  },
  skArr(sk) { return { coh: sk[0] || 0, exe: sk[1] || 0, res: sk[2] || 0, ret: sk[3] || 0 }; },
  skillSum(g) { const k = this.genSkills(g); return k.coh + k.exe + k.res + k.ret; },
  starsFor(sum) { return sum <= 2 ? 1 : sum <= 5 ? 2 : 3; },
  syncRank(g) { if (g && g.skills) g.rank = this.starsFor(this.skillSum(g)); },

  // يربط القائد بسجله التاريخي بالاسم: السيرة والدرجة، والمهارات للقادة الجدد فقط
  enrichGen(g, keepSkills) {
    const e = this.catFind(g.name);
    if (!e) return g;
    g.cat = e.n;
    g.tier0 = e.tier;
    if (!keepSkills && e.sk) { g.skills = this.skArr(e.sk); this.syncRank(g); }
    if (this.S.stock) this.S.stock = this.S.stock.filter((k) => k !== e.n);
    return g;
  },

  // الدرجة شهرة لا قوة: المؤرخون أو الحملة يمنحانها، والمهارات وحدها تغيّر أداء القائد
  tierOf(g) {
    const base = (g && g.tier0) || 'basic', fame = (g && g.fame) || 0;
    if (base === 'legend') return { k: 'legend', ...TIERS.legend };
    if (fame >= 45) return { k: 'legend', ...TIERS.legend, why: 'صنع أسطورته في هذه الحملة بانتصاراته.' };
    if (base === 'notable') return { k: 'notable', ...TIERS.notable };
    if (fame >= 12) return { k: 'veteran', ...TIERS.veteran };
    return { k: 'basic', ...TIERS.basic };
  },
  addFame(g, v) {
    if (!g || g.status === 'dead') return;
    const t0 = this.tierOf(g).k;
    g.fame = (g.fame || 0) + v;
    const t1 = this.tierOf(g);
    if (t1.k !== t0 && g.fid === this.S.player) this.alert('info', `${g.name} صار ${t1.name}: ${t1.why}`, { icon: 'star', win: 'kingdom' });
  },

  // الخبرة تمنح نقاط مهارة حسب التخصص. الكلفة ترتفع كلما تمرّس القائد
  pointCost(g) { const s = this.skillSum(g); return s < 3 ? 2 : s < 6 ? 3 : 4; },
  growSkill(g) {
    const pref = SPEC_PREF[g.trait || 'none'] || SPEC_PREF.none;
    const k = this.genSkills(g);
    const open = pref.filter((x) => k[x] < 3);
    if (!open.length) return null;
    // التخصص يتقدم بنقطة على الأقل، ثم يلحقه الباقي فلا يبقى القائد أعرج
    const lo = Math.min(...open.map((x) => k[x]));
    const pickK = open.find((x) => k[x] <= lo + (x === pref[0] ? 1 : 0)) || open[0];
    g.skills = { ...k, [pickK]: k[pickK] + 1 };
    return pickK;
  },
  gainXp(g, v) {
    if (!g || g.status === 'dead') return;
    if (!g.skills) g.skills = { ...this.genSkills(g) };
    g.xp = (g.xp || 0) + v;
    g.xpBank = (g.xpBank || 0) + v;
    const r0 = g.rank, grew = [];
    while (this.skillSum(g) < 9 && g.xpBank >= this.pointCost(g)) {
      const c = this.pointCost(g);
      const k = this.growSkill(g);
      if (!k) break;
      g.xpBank -= c;
      grew.push(SKILL_NAMES[k]);
    }
    if (!grew.length) return;
    this.syncRank(g);
    const up = g.rank > r0 ? ` وارتقى إلى ${'★'.repeat(g.rank)}` : '';
    this.event('int', `تعلّم ${g.name} من المعارك: ${grew.join('، ')} +1${up} (${this.fname(g.fid)}).`, { fids: [g.fid], imp: g.fid === this.S.player ? 2 : 1 });
  },
  xpToNext(g) { return Math.max(0, this.pointCost(g) - (g.xpBank || 0)); },

  // الراتب يُشتق من الكفاءة والتخصص والمكانة. العقد الموقّع يثبّته
  genSalaryBase(g) {
    const t = this.tierOf(g).k;
    let v = 3 + 1.5 * this.skillSum(g) + (g.trait ? 2 : 0) + (t === 'legend' ? 3 : t === 'notable' ? 1 : 0);
    v = Math.max(6, Math.round(v));
    return g.flaw === 'greedy' ? v * 2 : v;
  },
  genSalary(g) { return (g.pay != null ? g.pay : this.genSalaryBase(g)) + (g.retinue ? RETINUE.pay : 0); },
  genMen(g) { return 12 + 4 * g.rank + (g.retinue ? RETINUE.men : 0); },
  // من وقّع عقداً دفع مكافأة توقيعه، فلا رسوم تعيين عليه حين يقود جيشاً
  hireFee(g) { if (g.pay != null) return 0; return g.name.startsWith('الضابط') ? 40 : 50 + 40 * g.rank; },

  // ------------------، المخزون والفرص -------------------
  initLeaders(fresh) {
    const S = this.S;
    if (!S.seed) S.seed = fresh ? (Math.random() * 1e9) >>> 0 : hashStr(S.scenario + ':' + S.player + ':' + S.turn);
    for (const g of Object.values(S.gens)) {
      if (g.cat === undefined) { this.enrichGen(g, !fresh); if (!g.cat) g.cat = null; }
      if (!fresh && !g.skills) g.skills = { ...this.genSkills(g) };
      if (g.xpBank === undefined) g.xpBank = 0;
      if (g.fame === undefined) g.fame = 0;
    }
    if (!S.stock) S.stock = this.cat().filter((e) => e.at === 'stock' || (!fresh && e.at !== 'event' && !this.nameTaken(e.n))).filter((e) => !this.nameTaken(e.n)).map((e) => e.n);
    if (!S.rec) S.rec = { chances: 1, seq: 0, offer: null, got: { cities: {}, wins: 0, inc: 0, dip: {}, chap: S.chap || 0 }, hist: [{ turn: S.turn, why: fresh ? 'بداية الحملة' : 'تحديث: فرصة ترحيبية' }] };
  },
  candAff(e) { return e.aff || (['stock', 'event', 'neutral'].includes(e.at) ? null : e.at); },
  eligible(fid) {
    const y = this.year(), S = this.S;
    const busy = new Set(S.rec && S.rec.offer ? S.rec.offer.keys : []);
    return (S.stock || []).map((k) => this.catFind(k)).filter((e) => e && !busy.has(e.n) && y >= e.y[0] && y <= e.y[1] && !this.nameTaken(e.n) && !(S.rec && S.rec.gone && S.rec.gone[e.n] > S.turn));
  },
  nextStockYear() {
    const y = this.year();
    const up = (this.S.stock || []).map((k) => this.catFind(k)).filter((e) => e && e.y[0] > y).map((e) => e.y[0]);
    return up.length ? Math.min(...up) : null;
  },
  earnChance(kind, why) {
    const R0 = this.S.rec;
    if (!R0) return;
    if (R0.chances >= MAX_CHANCES) {
      R0.hist.push({ turn: this.S.turn, kind, why: `${why} (لم تُحفظ: لديك ${MAX_CHANCES} فرص)`, lost: true });
      this.alert('imp', `فاتتك فرصة استقطاب (${why}): لديك ${MAX_CHANCES} فرص محفوظة، وهو الحد. استخدم إحداها`, { icon: 'helmet', win: 'recruit' });
      return;
    }
    R0.chances++;
    R0.hist.push({ turn: this.S.turn, kind, why });
    if (R0.hist.length > 40) R0.hist.shift();
    this.alert('info', `فرصة استقطاب قائد: ${why}`, { icon: 'helmet', win: 'recruit' });
    this.event('int', `${this.fname(this.S.player)} تكسب فرصة لاستقطاب قائد (${why}).`, { fids: [this.S.player], imp: 1 });
  },
  recProgress(kind, data) {
    const S = this.S, P = S.player, R0 = S.rec;
    if (!R0) return;
    const got = R0.got;
    if (kind === 'win') {
      got.wins++;
      if (got.wins % 3 === 0) this.earnChance('mil', `${arN(got.wins, ['انتصار', 'انتصاران', 'انتصارات', 'انتصاراً'])} في الميدان`);
    } else if (kind === 'city') {
      // كل مدينة تُحسب مرة واحدة مهما تكرر فتحها، وكل مدينتين جديدتين تمنحان فرصة
      if (got.cities[data.id]) return;
      got.cities[data.id] = S.turn;
      const c = Object.keys(got.cities).length;
      if (c % 2 === 0) this.earnChance('mil', `دخلت ${arN(c, ['مدينة', 'مدينتين', 'مدن', 'مدينة'])} لأول مرة، آخرها ${data.name}`);
    } else if (kind === 'dip') {
      const key = data.kind + ':' + data.fid;
      if (got.dip[key]) return;
      got.dip[key] = S.turn;
      this.earnChance('dip', `${data.label} مع ${this.fname(data.fid)}`);
    } else if (kind === 'tick') {
      const net = this.economy(P).netGold;
      while (got.inc < INCOME_MARKS.length && net >= INCOME_MARKS[got.inc]) {
        this.earnChance('eco', `صافي دخلك بلغ ${INCOME_MARKS[got.inc]} كل دور`);
        got.inc++;
      }
      if ((S.chap || 0) > (got.chap || 0)) { got.chap = S.chap; this.earnChance('chap', `فصل جديد من الحملة`); }
    }
  },
  // ما يلزم للفرصة التالية من كل طريق (تُعرض للاعب)
  recRoads() {
    const got = this.S.rec.got;
    const w = got.wins % 3;
    return [
      ['المحفوظ', `${this.S.rec.chances} من ${MAX_CHANCES} (ما زاد لا يُحفظ)`],
      ['عسكري', `${arN(3 - w, ['انتصار آخر', 'انتصاران آخران', 'انتصارات أخرى', ''])}، أو ${Object.keys(got.cities).length % 2 ? 'مدينة واحدة جديدة' : 'مدينتان جديدتان'} لم تدخلها من قبل`],
      ['اقتصادي', got.inc < INCOME_MARKS.length ? `صافي دخل ${INCOME_MARKS[got.inc]} كل دور (الآن ${this.economy(this.S.player).netGold})` : 'بلغت كل عتبات الدخل'],
      ['دبلوماسي', 'حلف أو تابع أو مصاهرة مع مملكة لأول مرة'],
      ['تاريخي', 'بداية فصل جديد من الحملة'],
    ];
  },

  // العرض: مرشحان ثابتان يُحفظان مع اللعبة، ويُسحبان بمولّد مبذور فلا يتغيران بإعادة الفتح أو التحميل
  localCand(i) {
    const r = rng(hashStr(`${this.S.seed}:local:${this.S.rec.seq}:${i}`));
    const tr = Object.keys(TRAITS).filter((t) => t !== 'elite');
    const trait = tr[Math.floor(r() * tr.length)];
    const sk = [0, 0, 0, 0]; sk[Math.floor(r() * 4)] = 1;
    const nm = GENERIC_NAMES[Math.floor(r() * GENERIC_NAMES.length)] + ' ' + ['الحدودي', 'الجبلي', 'البحري', 'الشامي', 'الريفي', 'الفارس'][Math.floor(r() * 6)];
    return { n: nm, at: 'local', trait, flaw: null, sk, tier: 'basic', y: [0, 9999], wiki: null, bio: 'ضابط محلي متخيَّل رفعته الحاجة: لا سيرة تاريخية له. يظهر حين ينفد المرشحون التاريخيون المتاحون في هذه السنة.', src: 'fic', local: true };
  },
  drawCands(fid, n, exclude, salt) {
    const pool = this.eligible(fid).filter((e) => !exclude.includes(e.n));
    const r = rng(hashStr(`${this.S.seed}:${this.S.rec.seq}:${salt}`));
    const out = [];
    const w = (e) => (this.candAff(e) === fid ? 3 : this.candAff(e) && this.atWar(this.candAff(e), fid) ? 0.4 : 1) * (e.star ? 1.2 : 1);
    while (out.length < n && pool.length) {
      const tot = pool.reduce((t, e) => t + w(e), 0);
      let x = r() * tot, i = 0;
      for (; i < pool.length - 1; i++) { x -= w(pool[i]); if (x <= 0) break; }
      out.push(pool.splice(i, 1)[0].n);
    }
    return out;
  },
  candOf(key) {
    const o = this.S.rec.offer;
    if (o && o.locals && o.locals[key]) return o.locals[key];
    return this.catFind(key);
  },
  recOffer() {
    const S = this.S, R0 = S.rec, P = S.player;
    if (!R0 || R0.chances <= 0) return null;
    if (R0.offer) return R0.offer;
    const keys = this.drawCands(P, 2, [], 'offer');
    const offer = { keys, turn: S.turn, replaced: false, rej: {}, last: {}, locals: {}, histN: keys.length };
    for (let i = 0; keys.length < 2; i++) { const c = this.localCand(i); offer.locals[c.n] = c; keys.push(c.n); }
    R0.offer = offer;
    return offer;
  },
  replaceCand(key) {
    const o = this.S.rec.offer;
    if (!o) return 'لا عرض مفتوح';
    if (o.replaced) return 'استبدلت مرشحاً في هذا العرض من قبل. لكل عرض استبدال واحد فقط.';
    const nk = this.drawCands(this.S.player, 1, o.keys, 'swap:' + key)[0];
    if (!nk) return 'لا مرشح تاريخي آخر متاح في هذه السنة.';
    o.keys = o.keys.map((k) => (k === key ? nk : k));
    delete o.locals[key];
    o.replaced = true;
    return null;
  },

  // ------------------، التفاوض -------------------
  // المطلب: الكفاءة والتخصص والمكانة، ثم الظروف (سمعة المملكة، حروبها، هوى المرشح). الحد الأدنى الحقيقي ثابت لكل مرشح
  candGen(e) { return { name: e.n, trait: e.trait, flaw: e.flaw, skills: this.skArr(e.sk), tier0: e.tier, fame: 0, rank: this.starsFor(e.sk.reduce((a, b) => a + b, 0)) }; },
  demandParts(e, fid) {
    const F0 = this.f(fid), g = this.candGen(e);
    const base = this.genSalaryBase(g);
    const parts = [['الكفاءة والتخصص والمكانة', base]];
    let mul = 1;
    if (F0.rep < 40) { mul *= 1.15; parts.push(['سمعة مملكتك ضعيفة', '+15٪']); } else if (F0.rep >= 70) { mul *= 0.92; parts.push(['سمعة مملكتك طيبة', '−8٪']); }
    const aff = this.candAff(e);
    if (aff === fid) { mul *= 0.85; parts.push(['يميل إلى مملكتك', '−15٪']); } else if (aff && WX.alive(aff) && this.atWar(aff, fid)) { mul *= 1.2; parts.push([`هواه مع ${this.fname(aff)} التي تحاربها`, '+20٪']); }
    const wars = this.aliveMajors().filter((o) => o !== fid && this.atWar(o, fid)).length;
    if (wars >= 2) { mul *= 1.1; parts.push([`مملكتك في ${wars} حروب`, '+10٪']); }
    const rej = (this.S.rec.offer && this.S.rec.offer.rej[e.n]) || 0;
    if (rej) { mul *= 1 + 0.08 * rej; parts.push([`رفض عروضك ${rej} مرة`, `+${8 * rej}٪`]); }
    return { demand: Math.max(4, Math.round(base * mul)), parts };
  },
  floorK(e) { return 0.8 + 0.15 * rng(hashStr(`${this.S.seed}:floor:${e.n}`))(); },
  offerValue(pay, bonus) { return pay + bonus / 12; },
  travelTurns(e, cityId) {
    const aff = this.candAff(e);
    let from = e.home || null;
    if (!from && aff && WX.alive(aff)) { const c = this.nodesOf(aff).find((n) => n.capital) || this.nodesOf(aff)[0]; from = c ? c.id : null; }
    if (!from) return 2;
    const d = this.hops(from, cityId, 12);
    return clamp(1 + Math.floor((d >= 99 ? 6 : d) / 3), 1, 4);
  },
  arrivalSites(fid, e) {
    return this.nodesOf(fid).filter((n) => !this.besieger(n.id)).map((n) => ({ n, t: this.travelTurns(e, n.id) })).sort((a, b) => a.t - b.t || (b.n.capital ? 1 : 0) - (a.n.capital ? 1 : 0));
  },
  expectLoy(e, fid, pay, bonus) {
    const { demand } = this.demandParts(e, fid);
    const over = clamp(this.offerValue(pay, bonus) / demand - 1, -0.2, 0.5);
    return clamp(Math.round(62 + over * 50 + (this.candAff(e) === fid ? 10 : 0) - (e.flaw === 'disloyal' ? 18 : 0)), 20, 98);
  },
  // النتيجة حتمية: يقبل إن بلغ العرض حدّه الأدنى المخفي. كل رفض يرفع مطلبه، وبعد ثلاثة ينسحب
  proposeContract(key, o) {
    const S = this.S, P = S.player, F0 = this.f(P), R0 = S.rec, off = R0 && R0.offer;
    const e = this.candOf(key);
    if (!off || !off.keys.includes(key) || !e) return { err: 'المرشح لم يعد في العرض' };
    if (R0.chances <= 0) return { err: 'لا فرص استقطاب متاحة' };
    const pay = Math.max(0, Math.round(o.pay || 0)), bonus = Math.max(0, Math.round(o.bonus || 0));
    if (F0.gold < bonus) return { err: `مكافأة التوقيع ${bonus} أكثر من خزينتك ${Math.floor(F0.gold)}` };
    const val = this.offerValue(pay, bonus);
    const last = off.last[key];
    if (last && val <= this.offerValue(last.pay, last.bonus)) return { err: `عرضت ${last.pay} و${last.bonus} من قبل ورُفض. قدّم عرضاً أعلى قيمة.` };
    const site = this.node(o.city);
    if (!site || site.owner !== P || this.besieger(site.id)) return { err: 'اختر مدينة لك غير محاصرة ليصل إليها' };
    const { demand } = this.demandParts(e, P);
    const floor = Math.round(demand * this.floorK(e) * 10) / 10;
    if (val < floor) {
      off.rej[key] = (off.rej[key] || 0) + 1;
      off.last[key] = { pay, bonus };
      if (off.rej[key] >= 3) {
        off.keys = off.keys.filter((k) => k !== key);
        R0.gone = R0.gone || {};
        R0.gone[key] = S.turn + 8;
        if (!off.keys.length) R0.offer = null;
        return { gone: true, msg: `${e.n} ينسحب بعد ثلاثة عروض رفضها. الفرصة باقية لك، وقد يعود مرشحاً بعد 8 أدوار.` };
      }
      return { rejected: true, msg: `${e.n} يرفض. مطلبه يرتفع 8٪، وبقي لك ${3 - off.rej[key]} عروض قبل أن ينسحب.` };
    }
    // قبول
    F0.gold -= bonus;
    const rank = this.starsFor(e.sk.reduce((a, b) => a + b, 0));
    const g = this.addGeneral(P, e.n, e.trait, e.flaw, rank);
    if (e.local) { g.skills = this.skArr(e.sk); g.cat = null; this.syncRank(g); }
    g.pay = pay; g.bonus = bonus; g.retinue = !!o.retinue;
    g.loy = this.expectLoy(e, P, pay, bonus);
    const T = this.travelTurns(e, site.id);
    g.status = 'travel'; g.dest = site.id; g.arrive = S.turn + T;
    R0.chances--;
    R0.seq++;
    R0.offer = null;
    R0.hist.push({ turn: S.turn, kind: 'sign', why: `وقّع ${e.n}: ${pay} كل دور ومكافأة ${bonus}` });
    this.event('int', `${e.n} يقبل خدمة ${F0.name} بأجر ${pay} كل دور، ويصل إلى ${site.name} بعد ${T} ${T === 1 ? 'دور' : 'أدوار'}.`, { fids: [P], node: site.id, imp: 2 });
    return { ok: true, g, T, msg: `${e.n} وقّع العقد. يصل إلى ${site.name} في الدور ${S.turn + T}.` };
  },

  // ------------------، كل دور -------------------
  leadersTick() {
    const S = this.S;
    if (!S.rec) return;
    for (const g of Object.values(S.gens)) {
      if (g.status !== 'travel' || g.arrive > S.turn) continue;
      const n = this.node(g.dest);
      if (n && n.owner === g.fid && !this.besieger(n.id)) {
        g.status = 'pool'; g.at = n.id; g.dest = null;
        if (g.fid === S.player) this.alert('info', `وصل ${g.name} إلى ${n.name} وينتظر أوامرك في البلاط`, { icon: 'helmet', node: n.id, win: 'kingdom' });
      } else {
        const alt = this.nodesOf(g.fid).find((x) => x.capital && !this.besieger(x.id)) || this.nodesOf(g.fid).find((x) => !this.besieger(x.id));
        if (!alt) { g.status = 'exiled'; continue; }
        g.dest = alt.id; g.arrive = S.turn + 1;
        if (g.fid === S.player) this.alert('imp', `${g.name} لم يستطع دخول ${n ? n.name : 'المدينة'}، فغيّر طريقه إلى ${alt.name} (دور إضافي)`, { icon: 'helmet', node: alt.id });
      }
    }
    this.recProgress('tick');
    this.aiRecruit();
  },
  // الممالك الأخرى تستقطب أيضاً من المخزون نفسه، فالمرشح الذي تتركه قد يخدم عدوك
  aiRecruit() {
    const S = this.S;
    if (S.turn < 4) return;
    const ids = this.aliveMajors().filter((id) => id !== S.player && !this.f(id).kind);
    ids.forEach((fid, i) => {
      if ((S.turn + i * 3) % 9 !== 0) return;
      const F0 = this.f(fid);
      if (F0.gold < 450) return;
      const pool = this.eligible(fid).filter((e) => this.candAff(e) === fid || (!this.candAff(e) && R() < 0.4));
      if (!pool.length) return;
      const e = pool.sort((a, b) => b.sk.reduce((x, y) => x + y, 0) - a.sk.reduce((x, y) => x + y, 0))[0];
      const { demand } = this.demandParts(e, fid);
      const bonus = demand * 4;
      if (F0.gold < bonus + 300) return;
      F0.gold -= bonus;
      const g = this.addGeneral(fid, e.n, e.trait, e.flaw, 1);
      g.pay = demand; g.loy = this.expectLoy(e, fid, demand, bonus);
      const cap = this.nodesOf(fid).find((n) => n.capital) || this.nodesOf(fid)[0];
      g.status = 'travel'; g.dest = cap ? cap.id : null; g.arrive = S.turn + 2;
      this.event('int', `${e.n} يدخل خدمة ${F0.name}.`, { fids: [fid], imp: e.tier === 'legend' ? 3 : 2 });
    });
  },
});

// ربط السجل بكل قائد يُنشأ، مهما كان مصدره (بداية الحملة، نجم صاعد، مرتزقة، غزاة)
(() => {
  const add = Game.addGeneral;
  Game.addGeneral = function (...args) {
    const g = add.apply(this, args);
    g.cat = null;
    this.enrichGen(g);
    if (!g.skills) g.skills = { ...this.genSkills(g) };
    g.xpBank = 0; g.fame = 0;
    // الولاء يُحدد لحظة الإنشاء لا عند الدور التالي، فالحفظ والتحميل لا يغيّران القائد
    if (g.loy === undefined && this.baseLoy && this.S.factions && this.S.factions[g.fid] && this.S.factions[g.fid].ruler !== undefined) g.loy = this.baseLoy(g);
    return g;
  };
  const ng = Game.newGame;
  Game.newGame = function (...args) { const S = ng.apply(this, args); this.initLeaders(true); this.save(); return S; };
  const norm = Game.normalizeState;
  Game.normalizeState = function (...args) { const r = norm.apply(this, args); this.initLeaders(false); return r; };
  const er = Game.endRound;
  Game.endRound = function (...args) { const r = er.apply(this, args); this.leadersTick(); return r; };
})();
