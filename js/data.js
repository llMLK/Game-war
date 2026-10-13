'use strict';
// بيانات الوحدات والقادة والتضاريس والسيناريوهات

// cls: inf مشاة، cav خيالة، mach آلات
const UNITS = {
  spear: {
    name: 'رمّاحة', icon: 'spear', cls: 'inf', men: 60, hp: 10, atk: 5, def: 7, speed: 30,
    cost: 60, upkeep: 3, antiCav: 2.2, forms: ['line', 'square', 'loose'],
    desc: 'جدار من الرماح. يسحق الخيالة من الأمام، ضعيف أمام السيّافة.',
  },
  sword: {
    name: 'سيّافة بالتروس', icon: 'sword', cls: 'inf', men: 50, hp: 12, atk: 8, def: 6, speed: 31,
    cost: 85, upkeep: 4, armor: 0.4, forms: ['line', 'square', 'loose'],
    desc: 'مشاة صدام بتروس تصدّ السهام. تتفوق على الرمّاحة والرماة.',
  },
  archer: {
    name: 'رماة', icon: 'bow', cls: 'inf', men: 50, hp: 8, atk: 3, def: 3, speed: 32,
    cost: 70, upkeep: 3, range: 200, missile: 4.2, reload: 3.4, ammo: 24, forms: ['line', 'loose'],
    desc: 'يرمون من بعيد ويزداد مداهم فوق التلال والأسوار. هشّون في الالتحام.',
  },
  horsearcher: {
    name: 'خيّالة رماة', icon: 'horsebow', cls: 'cav', men: 30, hp: 12, atk: 4, def: 4, speed: 64,
    cost: 115, upkeep: 5, range: 160, missile: 3.6, reload: 3, ammo: 16, forms: ['line', 'loose'],
    needs: 'barracks', desc: 'سريعون، يرمون ثم ينسحبون قبل الالتحام (كرّ وفرّ). أقوى في السهول والصحراء.',
  },
  cavalry: {
    name: 'فرسان ثقيلة', icon: 'horse', cls: 'cav', men: 30, hp: 16, atk: 9, def: 7, speed: 56,
    cost: 135, upkeep: 6, charge: 14, forms: ['line', 'wedge'],
    needs: 'barracks', desc: 'انقضاض مدمّر على الأجناب والمؤخرة والرماة. ضعيفة في الغابات والجبال.',
  },
  catapult: {
    name: 'منجنيق', icon: 'catapult', cls: 'mach', men: 12, hp: 10, atk: 2, def: 2, speed: 15,
    cost: 160, upkeep: 6, range: 400, minRange: 90, reload: 8, ammo: 30, forms: ['line'],
    needs: 'barracks', desc: 'يهدم الأسوار والبوابات ويفرّق الصفوف المتراصة.',
  },
  // ——— وحدات النخبة الخاصة بكل حضارة (تُجنَّد حيث يقيم «قائد نخبة») ———
  shamguard: {
    name: 'حرس الشام', icon: 'horse', cls: 'cav', men: 30, hp: 18, atk: 10, def: 8, speed: 60,
    cost: 200, upkeep: 7, charge: 15, forms: ['line', 'wedge'], unique: 'umayyad',
    desc: 'نخبة الفرسان الشاميين، سريعة وقوية الانقضاض.',
  },
  cataphract: {
    name: 'كاتافراكت', icon: 'horse', cls: 'cav', men: 28, hp: 24, atk: 10, def: 11, speed: 48,
    cost: 230, upkeep: 8, charge: 16, armor: 0.6, forms: ['line', 'wedge'], unique: 'byzantine',
    desc: 'فرسان مدرّعون من الرأس إلى الحوافر. السهام بالكاد تؤذيهم.',
  },
  tarkhan: {
    name: 'خيّالة الطرخان', icon: 'horsebow', cls: 'cav', men: 30, hp: 15, atk: 6, def: 6, speed: 64,
    cost: 180, upkeep: 6, range: 170, missile: 4.4, reload: 2.6, ammo: 20, forms: ['line', 'loose'],
    unique: 'khazar', desc: 'نخبة رماة السهوب المدرّعين.',
  },
  // ——— وحدات لا تُجنَّد ———
  general: {
    name: 'حرس القائد', icon: 'helmet', cls: 'cav', men: 16, hp: 24, atk: 10, def: 9, speed: 58,
    charge: 11, forms: ['line', 'wedge'], noRecruit: true,
    desc: 'القائد يرفع معنويات من حوله. سقوطه يزلزل الجيش.',
  },
  militia: {
    name: 'حامية المدينة', icon: 'militia', cls: 'inf', men: 40, hp: 8, atk: 4, def: 5, speed: 28,
    antiCav: 1.5, forms: ['line', 'square'], noRecruit: true, desc: 'رجال المدينة المدافعون عنها.',
  },
  ram: {
    name: 'كبش الدكّ', icon: 'ram', cls: 'mach', men: 10, hp: 14, atk: 0.5, def: 10, speed: 14,
    armor: 0.9, forms: ['line'], noRecruit: true, desc: 'يحطّم البوابة إذا وصل إليها.',
  },
  tower: {
    name: 'برج حصار', icon: 'tower', cls: 'mach', men: 12, hp: 14, atk: 0.5, def: 12, speed: 11,
    armor: 0.85, forms: ['line'], noRecruit: true, desc: 'يلتصق بالسور ويفتح معبراً آمناً للمشاة.',
  },
};

const RECRUITABLE = ['spear', 'sword', 'archer', 'horsearcher', 'cavalry', 'catapult'];
const UNIQUE_OF = { umayyad: 'shamguard', byzantine: 'cataphract', khazar: 'tarkhan' };

// ——— القادة ———
// كل سمة تغيّر نظاماً مختلفاً فعلاً (المعركة، الحركة، الاقتصاد، الإمداد، الحصار...)
const TRAITS = {
  tactician: { name: 'داهية', icon: 'eye', desc: 'الالتفاف والضرب من الخلف أقوى 25٪، ونقطة أوامر إضافية في المعركة.' },
  brave: { name: 'شجاع', icon: 'fire', desc: 'معنويات الجيش +15، وحرسه يقاتل بضراوة.' },
  cavalier: { name: 'فارس', icon: 'horse', desc: 'انقضاض الخيالة أقوى 30٪ وأسرع.' },
  archer: { name: 'رامٍ ماهر', icon: 'bow', desc: 'رماية الجيش أقوى 20٪ وسهامه أكثر.' },
  siege: { name: 'مهندس حصار', icon: 'catapult', desc: 'معدات الحصار جاهزة فوراً وبرج الحصار بعد دور، وضرب الأسوار أقوى 50٪.' },
  defender: { name: 'صامد', icon: 'shield', desc: 'دفاع +20٪ ومعنويات +15 عند حماية مدينة، وحامية مدينته تتعافى أسرع.' },
  merchant: { name: 'إداري', icon: 'coins', desc: 'المدينة التي يقيم فيها: دخل +30٪ وولاء أسرع. ضعيف المعنويات في القتال.' },
  logistician: { name: 'خبير تموين', icon: 'cart', desc: 'جيشه يأكل نصف الطعام، ولا يعاني من الاستنزاف أو الازدحام، ويتعافى أسرع.' },
  swift: { name: 'سريع', icon: 'boot', desc: 'نقطتا حركة إضافيتان كل دور.' },
  mountaineer: { name: 'ابن الجبال', icon: 'mountain', desc: 'الجبال والممرات والتلال لا تبطئه، وقتاله في المرتفعات أقوى 20٪.' },
  desert: { name: 'ابن الصحراء', icon: 'dune', desc: 'يعبر الصحراء بلا إبطاء ولا عطش، وقتاله فيها أقوى 15٪.' },
  naval: { name: 'ربّان', icon: 'ship', desc: 'يعبر الطرق المائية، ولا تُضعفه المخاضات والأنهار في المعركة.' },
  elite: { name: 'قائد نخبة', icon: 'elite', desc: 'يتيح تجنيد وحدة النخبة الخاصة بحضارته حيث يقيم.' },
};
const FLAWS = {
  reckless: { name: 'متهوّر', desc: 'حرسه أكثر عرضة للسقوط في المعركة.' },
  cautious: { name: 'متردد', desc: 'نقطة حركة أقل كل دور.' },
  harsh: { name: 'قاسٍ', desc: 'المدينة التي يقيم فيها تفقد ولاءً كل دور.' },
  greedy: { name: 'طمّاع', desc: 'راتبه مضاعف.' },
  arrogant: { name: 'متكبّر', desc: 'نقطة أوامر أقل في المعركة.' },
  disloyal: { name: 'متقلّب', desc: 'أسهل في الانشقاق إن أُسر، وقد يغادر إن ساءت أحوال مملكته.' },
};

// ——— التضاريس ———
// mp: كلفة الدخول بنقاط الحركة (لكل جيش 4 نقاط في الدور)
const TERRAIN = {
  plains: { name: 'سهول', mp: 2, icon: 'plains' },
  river: { name: 'نهر', mp: 2, icon: 'wave' },
  coast: { name: 'ساحل', mp: 2, icon: 'ship' },
  forest: { name: 'غابات', mp: 3, icon: 'tree' },
  hills: { name: 'تلال', mp: 3, icon: 'hill' },
  desert: { name: 'صحراء', mp: 3, icon: 'dune' },
  mountains: { name: 'جبال', mp: 4, icon: 'mountain' },
};
const TERRAIN_NAMES = Object.fromEntries(Object.entries(TERRAIN).map(([k, v]) => [k, v.name]));
const EDGE_KINDS = { road: 'طريق', pass: 'ممر جبلي', water: 'طريق مائي' };
const BASE_MP = 4;

const BUILDINGS = {
  walls: { name: 'أسوار', icon: 'wall', max: 4, cost: (lvl) => [180, 300, 450, 750][lvl], desc: 'تفرض الحصار وتضاعف كلفة الاقتحام. الرابع قلعة عظمى.' },
  market: { name: 'سوق', icon: 'market', max: 3, cost: (lvl) => [300, 500, 800][lvl], desc: 'دخل إضافي يزيد مع حجم المدينة، وتجارة أكثر، وولاء +2' },
  farm: { name: 'مزارع', icon: 'farm', max: 2, cost: (lvl) => [120, 240][lvl], desc: '+6 طعام، سكان وقوى بشرية أكثر' },
  granary: { name: 'مخازن', icon: 'granary', max: 2, cost: (lvl) => [140, 280][lvl], desc: '+3 أدوار صمود في الحصار، +3 سعة إمداد' },
  barracks: { name: 'إسطبلات وورش', icon: 'horseshoe', max: 1, cost: () => 220, desc: 'تتيح الخيالة والمنجنيق، وتدريب الجيوش المقيمة' },
  roads: { name: 'طرق معبّدة', icon: 'road', max: 1, cost: () => 260, desc: 'الحركة من المدينة وإليها أرخص بنقطة، وتجارة أكثر' },
  port: { name: 'ميناء', icon: 'ship', max: 1, cost: () => 280, coastal: true, desc: 'يفتح الطرق المائية لكل جيوشك من هنا، ويزيد التجارة' },
  diwan: { name: 'ديوان الجند', icon: 'seal', max: 2, cost: (lvl) => [400, 800][lvl], capitalOnly: true, desc: 'مؤسسة عسكرية في العاصمة: مقعد إضافي في مجلس الحرب لكل مستوى، وفرصة استقطاب قائد عند اكتماله' },
};

// مدة البناء بالأدوار لكل مستوى
const BUILD_TIME = { walls: [2, 3, 3, 4], market: [1, 2, 2], farm: [1, 2], granary: [1, 2], barracks: 2, roads: 2, port: 2, diwan: [2, 3] };

const TAXES = {
  low: { name: 'منخفضة', income: 0.7, loyalty: 8 },
  normal: { name: 'معتدلة', income: 1, loyalty: 0 },
  high: { name: 'مرتفعة', income: 1.35, loyalty: -12 },
};

const SEASONS = ['الربيع', 'الصيف', 'الخريف', 'الشتاء'];

// ——— دليل الحرب ———
const GUIDE = [
  ['القائد لا الجندي', 'في المعركة تضع الخطة والتشكيل وموقع القائد، ثم تتدخل عند المنعطفات: جناح يترنح، فرسان يلتفون، قائد مكشوف. صفات قادتك تغيّر تنفيذ أوامرك.'],
  ['حجر ورقة مقص', 'الرماح تصدّ الفرسان من الأمام، والسيّافة تهزم الرماح، والفرسان تفتك بالرماة وتلتف على الأجناب. الرماة يستنزفون الجميع، إلا في المطر.'],
  ['الخطط تتعاكس', 'الهجوم الكاسح يكسر المترددين ويتحطم على الصفوف المستعدة. الالتفاف والاستنزاف يفككان الدفاع الثابت. التقهقر المصطنع فخ للمتهورين.'],
  ['الأرض تقرر', 'المرتفع للمدافع، والممر الضيق يُلغي العدد، والغابة تكسر الفرسان، والسهول ميدانهم، والنهر يُضعف العابر، والصحراء تُنهك الغريب.'],
  ['الحصار', 'حاصر أولاً: كل دور تنقص مؤنهم وتكتمل معداتك (الكبش والسلالم ثم البرج). المنجنيق يفتح الثغرات. أو انتظر المجاعة واعرض الأمان.'],
  ['الاحتياط والمعنويات', 'الجيوش تنكسر قبل أن تُباد. من يحتفظ باحتياط طازج للأزمة يحسم اليوم، ومن يفقد قائده يفقد نصف قوته.'],
  ['التاريخ لا ينتظرك', 'أزمات كبرى تلوح بعلامات قبلها: شائعات، لاجئون، طرق تجارة تنقطع. استعد، أو تحالف، أو ادفع، أو انتهز الفوضى.'],
  ['النصر', 'لكل مملكة أهداف تاريخية، لا يلزم احتلال الخريطة كلها. تجدها في نافذة المملكة.'],
];

// ——— الشرح السياقي: ماذا يعني الرقم؟ ما الذي يرفعه ويخفضه؟ ما أثره؟ ———
const HELP = {
  gold: { t: 'الخزينة', icon: 'gold', what: 'ذهب المملكة. الرقم الصغير صافي كل دور.', up: 'دخل المدن، التجارة، الجزية، الغنائم.', down: 'رواتب الوحدات والقادة، المشاريع، الرشى والفدى.', eff: 'إن صارت سالبة تتسرّح الوحدات ويتراجع الولاء.' },
  food: { t: 'الطعام', icon: 'food', what: 'مخزون الغذاء لإطعام الجيوش.', up: 'المزارع والمدن غير المحاصرة.', down: 'الجيوش (الخيالة ضعفان)، القتال خارج أرضك، الصحراء، الشتاء.', eff: 'إن نفد تجوع الجيوش وتخسر رجالاً كل دور.' },
  loyalty: { t: 'الولاء', icon: 'heart', what: 'استعداد أهل المدينة لقبول حكمك.', up: 'جيش مقيم، الأسواق، الضرائب المنخفضة، الاحتفالات، حاكم إداري.', down: 'الاحتلال الحديث، الضرائب المرتفعة، الازدحام، البعد عن العاصمة، اتساع المملكة، القادة القساة.', eff: 'يرفع الدخل والتجنيد. تحت 20 قد تثور المدينة وتنفصل.' },
  income: { t: 'الدخل', icon: 'coins', what: 'ذهب هذه المدينة كل دور.', up: 'السكان، الأسواق، الولاء، الضرائب، حاكم إداري.', down: 'الحصار، الاضطراب، ازدحام الجيوش، وضعف الولاء الذي يقلل ما يصل من الضرائب.', eff: 'يدفع رواتب الجيوش والمشاريع.' },
  manpower: { t: 'القوى البشرية', icon: 'men', what: 'رجال المدينة القادرون على حمل السلاح.', up: 'السكان، المزارع، الولاء، والنفير العام حين تضعف المملكة.', down: 'التجنيد وتعويض الخسائر، الحصار، الاضطراب.', eff: 'بدونها لا تجنيد نظامي ولا تعويض، المرتزقة فقط.' },
  defense: { t: 'الدفاع', icon: 'castle', what: 'الأسوار والحامية معاً.', up: 'بناء الأسوار، حاكم صامد، جيش داخل المدينة، مرور الوقت.', down: 'الحصار الطويل، المجاعة، التخريب.', eff: 'الأسوار تفرض الحصار؛ كل مستوى يجعل الاقتحام أغلى بكثير.' },
  stores: { t: 'مؤن الحصار', icon: 'granary', what: 'أدوار الصمود قبل المجاعة.', up: 'المخازن والمزارع والأسوار، والسلم.', down: 'كل دور حصار، والتخريب.', eff: 'حين تنفد يموت المدافعون جوعاً ويقترب الاستسلام.' },
  supply: { t: 'الإمداد', icon: 'cart', what: 'عدد الوحدات التي تستطيع المدينة إطعامها.', up: 'المزارع، المخازن، السكان، خبير التموين.', down: 'الشتاء، أرض العدو، الصحراء والجبال.', eff: 'فوق السعة: مرض وهروب، والولاء والدخل يتراجعان.' },
  morale: { t: 'المعنويات', icon: 'banner', what: 'روح الجيش القتالية.', up: 'النصر، القائد الشجاع، طلب الثأر، الشبع.', down: 'الهزيمة، الجوع، سقوط القائد، الالتفاف عليه.', eff: 'الجيش المهزوز أبطأ وأضعف وأسرع انكساراً.' },
  mp: { t: 'نقاط الحركة', icon: 'boot', what: 'مسافة الجيش في الدور (4 عادة).', up: 'القائد السريع، الطرق المعبّدة.', down: 'الجبال والممرات والشتاء، القائد المتردد، الهزيمة.', eff: 'السهول 2، التلال والغابات والصحراء 3، الجبال والممرات 4.' },
  rep: { t: 'السمعة', icon: 'laurel', what: 'كيف تنظر إليك الممالك والمدن.', up: 'الوفاء بالعهود، إطلاق الأسرى، الأمان للمدن.', down: 'نقض العهود، الإعدام، النهب، الجواسيس المكشوفون.', eff: 'العالية تجعل العروض مقبولة والمدن تستسلم أسهل.' },
  unrest: { t: 'الاستقرار', icon: 'fire', what: 'المدن المحتلة حديثاً تحتاج وقتاً لتستقر.', up: 'مرور الأدوار، الاحتفالات، الأمان عند الفتح.', down: 'النهب، التمرد، التحريض.', eff: 'المضطربة: دخل قليل، لا تجنيد نظامي، الحامية لا تتعافى.' },
  tax: { t: 'الضرائب', icon: 'scales', what: 'سياسة الضرائب في المملكة كلها.', eff: 'المرتفعة: ضرائب أكثر 35٪ وولاء −12 في كل المدن. المنخفضة: ضرائب أقل 30٪ وولاء +8.' },
  upkeep: { t: 'كلفة الجيوش', icon: 'swords', what: 'رواتب الوحدات والقادة كل دور.', up: 'المرتزقة (قرابة الضعف)، القادة الطمّاعون، القتال بعيداً عن مدنك (الإمداد)، وجيوش أكثر من عدد مدنك (إدارة).', down: 'التسريح، إعفاء القادة، القتال قرب مدنك.', eff: 'الجيش الذي لا يعمل يأكل الخزينة.' },
  pop: { t: 'السكان', icon: 'house', what: 'حجم المدينة.', up: 'المزارع والسلم.', down: 'النهب، الحصار، الأوبئة، المجاعة.', eff: 'يحدد الدخل والقوى البشرية والحامية.' },
  armymen: { t: 'الرجال', icon: 'men', what: 'رجال الجيش: الوحدات وحرس القائد.', up: 'التجنيد، والتعويض التلقائي في مدنك (يستهلك القوى البشرية والذهب).', down: 'المعارك، الاستنزاف، الجوع، الازدحام.', eff: 'الوحدة التي تفقد نصف رجالها تقاتل بنصف قوتها.' },
  garrison: { t: 'الحامية', icon: 'shield', what: 'رجال المدينة الثابتون فيها.', up: 'السكان والأسوار، وتتعافى من القوى البشرية.', down: 'القتال، المجاعة، التخريب.', eff: 'تقاتل مع أي جيش مدافع.' },
  relation: { t: 'العلاقة', icon: 'treaty', what: 'ودّ المملكة تجاهك (−100 إلى 100).', up: 'الهدايا، التجارة، المصاهرة، عدو مشترك، السمعة.', down: 'الحدود المشتركة، الحرب، الخيانة، الثأر، تعاظم قوتك.', eff: 'تحدد قبول الصلح والحلف والتجارة.' },
  intel: { t: 'المعرفة', icon: 'eye', what: 'دقة معلوماتك عن مملكة: مجهول، تقديري، تقريبي، مؤكد.', up: 'الحلف، التجارة، المصاهرة، الجواسيس.', eff: 'دونها ترى نطاقات تقريبية فقط لجيوشهم.' },
  power: { t: 'القوة', icon: 'swords', what: 'تقدير الجيوش والحاميات والخزينة.', eff: 'الممالك تخشى الأقوى وتتحالف ضد المتعاظم.' },
  siege: { t: 'الحصار', icon: 'tent', what: 'جيش يطوّق المدينة: تنقص مؤنها كل دور وتكتمل معداته.', eff: 'الكبش والسلالم بعد دور، البرج بعد دورين. المجاعة تُسقط المدن.' },
  governor: { t: 'الحاكم', icon: 'seal', what: 'قائد يدير مدينة بدل أن يقود جيشاً.', eff: 'يمنح المدينة موهبته، ويبني وفق سياستك. الطموح في المدن البعيدة قد يتمرد.' },
  genloy: { t: 'ولاء القائد', icon: 'helmet', what: 'مدى إخلاص القائد لعرشك.', up: 'التكريم بالعطايا، الانتصارات، حاكم داهية، أن يكون ولياً للعهد.', down: 'اتساع المملكة، القيادة بعيداً عن العاصمة، جيش ضخم تحت يده، خزينة فارغة، تخطّيه في ولاية العهد، الهزائم.', eff: 'تحت 32 يبدأ الطموح: ولائم، ثم احتجاز ضرائب، ثم تمرد بجيشه ومدنه.' },
  ruler: { t: 'الحاكم والعرش', icon: 'crown', what: 'سمة الحاكم تؤثر في المملكة كلها. الحكّام يشيخون ويمرضون ويموتون.', up: 'سمِّ ولياً للعهد مبكراً، واشترِ ولاء القادة الكبار حين يمرض الحاكم.', down: 'حاكم في الميدان قد يُقتل أو يؤسر. غياب الوريث يُضعف المدن.', eff: 'عند موت الحاكم يتسلم الوريث، والقادة الكبار المغبونون قد يشقّون المملكة.' },
  route: { t: 'طريق القوافل', icon: 'camel', what: 'طريق تجارة يمر بعدة مدن. كل مدينة عليه تكسب ذهباً كل دور.', up: 'السلام بين مالكي مدن الطريق، الأسواق والطرق المعبّدة والموانئ على الطريق.', down: 'الحرب بين مدينتين متجاورتين عليه، الحصار، الوباء، الغزاة.', eff: 'إن تعطل نصفه أدواراً ينقطع، ويتسابق التجار على طريق جديد: من يستثمر يربحه.' },
  crisis: { t: 'أحداث العالم', icon: 'warning', what: 'التاريخ يتحرك: غزاة، أوبئة، قحط، عروش تهتز، قادة طموحون، أحلاف.', eff: 'كل حدث يُنذر قبل وقوعه على مراحل. قرارك في كل مرحلة يغيّر النتيجة، ولكل خيار ثمن.' },
  chapter: { t: 'فصول الحملة', icon: 'book', what: 'مراحل تاريخ حملتك: البقاء، الطموح، التنافس، عصر الإمبراطوريات، الأزمة.', eff: 'كل فصل يفتح أحداثاً وقرارات مختلفة.' },
};

// ——— السيناريوهات ———
// القادة: [الاسم، السمة، العيب، الرتبة]
const SCENARIOS = {
  umayyad: {
    id: 'umayyad',
    name: 'الفتوحات الأموية',
    sub: 'من الأندلس إلى القوقاز، سنة 715م',
    intro: 'من قرطبة إلى دمشق، ومن وادي النيل إلى أبواب القوقاز. اتساع الدولة ثروة ومسؤولية، ومضائق البحر وممرات الجبال مفاتيح الحرب.',
    startYear: 715,
    ground: '#cdb27a',
    battleGround: 'dry',
    factions: {
      umayyad: {
        name: 'الدولة الأموية', color: '#347a68', personality: { aggr: 1.2, honor: 1.1, prefs: { spear: 2, sword: 2, archer: 2, cavalry: 3, horsearcher: 1.5, catapult: 1 } },
        desc: 'خيالة سريعة وقادة فاتحون وجيوش منظّمة. نخبتها: حرس الشام.',
        generals: [
          ['مسلمة بن عبد الملك', 'siege', null, 3], ['العباس بن الوليد', 'cavalier', null, 2], ['الجراح الحكمي', 'brave', 'reckless', 2],
          ['محمد بن مروان', 'defender', null, 2], ['عمر بن هبيرة', 'naval', null, 1], ['سعيد الحرشي', 'swift', 'harsh', 2],
          ['مروان بن محمد', 'tactician', null, 1], ['قتيبة بن مسلم', 'desert', 'arrogant', 2], ['خالد القسري', 'merchant', 'greedy', 1],
          ['سليمان بن معاذ', 'archer', null, 1], ['يزيد بن المهلب', 'logistician', 'disloyal', 2], ['هشام بن عبد الملك', 'elite', 'cautious', 1],
        ],
      },
      byzantine: {
        name: 'الروم', color: '#6b2f79', personality: { aggr: 0.85, honor: 1.0, prefs: { spear: 3, sword: 1.5, archer: 2, cavalry: 2.5, horsearcher: 0.5, catapult: 1 } },
        desc: 'مدن منيعة وأساطيل ودبلوماسية ماكرة. نخبتها: الكاتافراكت.',
        generals: [
          ['ليون الإيساوري', 'defender', null, 3], ['أرتاباسدوس', 'cavalier', 'disloyal', 2], ['سيسينيوس', 'brave', null, 1],
          ['ثيودوسيوس', 'merchant', 'cautious', 1], ['قسطنطين', 'tactician', 'harsh', 1], ['بردانيس', 'archer', null, 1],
          ['نقيطاس', 'swift', null, 1], ['كالينيكوس', 'siege', null, 1], ['أبسيمار', 'naval', 'greedy', 2],
          ['مانويل', 'elite', null, 2], ['ثيوفانيس', 'logistician', null, 1], ['بطرس', 'mountaineer', null, 1],
        ],
      },
      khazar: {
        name: 'الخزر', color: '#986427', personality: { aggr: 1.3, honor: 0.8, prefs: { spear: 1, sword: 1, archer: 1, cavalry: 2, horsearcher: 4, catapult: 0.3 } },
        desc: 'سهوب وخيّالة رماة لا يُلحق بهم. نخبتها: خيّالة الطرخان.',
        generals: [
          ['بارجيك', 'cavalier', 'reckless', 2], ['آلب طرخان', 'archer', null, 2], ['هزار طرخان', 'brave', null, 1],
          ['بولان', 'merchant', null, 2], ['عبديا', 'elite', null, 1], ['قاطون', 'swift', 'harsh', 1],
          ['تون يابغو', 'tactician', 'arrogant', 1], ['قرلغ', 'mountaineer', null, 1], ['ساروخ', 'logistician', null, 1],
          ['باغاتور', 'desert', null, 1],
        ],
      },
    },
    neutralGenerals: [['أشوط الأرمني', 'defender', null, 1], ['غوارام الكرجي', 'mountaineer', null, 1], ['سمبات', 'cavalier', null, 1], ['حسّان التدمري', 'desert', null, 1]],
    width: WEST_ATLAS.width, height: WEST_ATLAS.height,
    nodes: WEST_ATLAS.nodes, edges: WEST_ATLAS.edges,
    armies: [
      { owner: 'umayyad', node: 'damascus', gen: 'مسلمة بن عبد الملك', regs: ['spear', 'sword', 'sword', 'archer', 'cavalry', 'cavalry'] },
      { owner: 'umayyad', node: 'malatya', gen: 'العباس بن الوليد', regs: ['spear', 'sword', 'archer', 'horsearcher'] },
      { owner: 'umayyad', node: 'sevilla', gen: 'عبد العزيز بن موسى', regs: ['spear', 'sword', 'archer', 'cavalry'] },
      { owner: 'umayyad', node: 'fustat', gen: 'عبد الملك بن رفاعة', regs: ['spear', 'sword', 'archer'] },
      { owner: 'byzantine', node: 'constantinople', gen: 'ليون الإيساوري', regs: ['spear', 'spear', 'sword', 'archer', 'archer', 'cavalry'] },
      { owner: 'byzantine', node: 'caesarea', gen: 'أرتاباسدوس', regs: ['spear', 'spear', 'archer', 'cavalry'] },
      { owner: 'byzantine', node: 'syracuse', gen: 'سرجيوس', regs: ['spear', 'archer', 'cavalry'] },
      { owner: 'khazar', node: 'balanjar', gen: 'خاقان الخزر', regs: ['spear', 'horsearcher', 'horsearcher', 'horsearcher', 'cavalry', 'cavalry'] },
      { owner: 'khazar', node: 'samandar', gen: '', regs: ['spear', 'archer', 'horsearcher', 'horsearcher'] },
    ],
    seas: WEST_ATLAS.seas, deserts: WEST_ATLAS.deserts, rivers: WEST_ATLAS.rivers,
    mountains: WEST_ATLAS.mountains, labels: WEST_ATLAS.labels, islands: WEST_ATLAS.islands, land: WEST_ATLAS.land, forests: WEST_ATLAS.forests,

  },
};

const NEUTRAL = { name: 'المدن المستقلة', color: '#8a8378' };

// قائمة جيش المعركة السريعة
const QUICK_ARMIES = [
  ['spear', 'spear', 'sword', 'sword', 'archer', 'archer', 'cavalry', 'horsearcher'],
  ['spear', 'spear', 'sword', 'archer', 'archer', 'archer', 'cavalry', 'cavalry'],
  ['spear', 'sword', 'sword', 'sword', 'archer', 'archer', 'horsearcher', 'cavalry'],
];
