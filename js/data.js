'use strict';
// بيانات الوحدات والقادة والسيناريوهات

// cls: inf مشاة، cav خيالة، mach آلات
const UNITS = {
  spear: {
    name: 'رمّاحة', icon: '🔱', cls: 'inf', men: 60, hp: 10, atk: 5, def: 7, speed: 30,
    cost: 60, upkeep: 3, antiCav: 2.2, forms: ['line', 'square', 'loose'],
    desc: 'جدار من الرماح. يسحق الخيالة من الأمام، ضعيف أمام السيّافة.',
  },
  sword: {
    name: 'سيّافة بالتروس', icon: '⚔️', cls: 'inf', men: 50, hp: 12, atk: 8, def: 6, speed: 31,
    cost: 85, upkeep: 4, armor: 0.4, forms: ['line', 'square', 'loose'],
    desc: 'مشاة صدام بتروس تصدّ السهام. تتفوق على الرمّاحة والرماة.',
  },
  archer: {
    name: 'رماة', icon: '🏹', cls: 'inf', men: 50, hp: 8, atk: 3, def: 3, speed: 32,
    cost: 70, upkeep: 3, range: 200, missile: 4.2, reload: 3.4, ammo: 24, forms: ['line', 'loose'],
    desc: 'يرمون من بعيد ويتضاعف مداهم فوق التلال. هشّون في الالتحام.',
  },
  horsearcher: {
    name: 'خيّالة رماة', icon: '🏇', cls: 'cav', men: 30, hp: 12, atk: 4, def: 4, speed: 64,
    cost: 115, upkeep: 5, range: 160, missile: 3.6, reload: 3, ammo: 16, forms: ['line', 'loose'],
    needs: 'barracks', desc: 'سريعون، يرمون ثم ينسحبون قبل الالتحام (كرّ وفرّ).',
  },
  cavalry: {
    name: 'فرسان ثقيلة', icon: '🐎', cls: 'cav', men: 30, hp: 16, atk: 9, def: 7, speed: 56,
    cost: 135, upkeep: 6, charge: 14, forms: ['line', 'wedge'],
    needs: 'barracks', desc: 'انقضاض مدمّر على الأجناب والمؤخرة والرماة. تجنّب الرماح من الأمام.',
  },
  catapult: {
    name: 'منجنيق', icon: '☄️', cls: 'mach', men: 12, hp: 10, atk: 2, def: 2, speed: 15,
    cost: 160, upkeep: 6, range: 400, minRange: 90, reload: 8, ammo: 30, forms: ['line'],
    needs: 'barracks', desc: 'يهدم الأسوار والبوابات ويفرّق الصفوف المتراصة.',
  },
  general: {
    name: 'حرس القائد', icon: '👑', cls: 'cav', men: 16, hp: 24, atk: 10, def: 9, speed: 58,
    charge: 11, forms: ['line', 'wedge'], noRecruit: true,
    desc: 'القائد يرفع معنويات من حوله. سقوطه يزلزل الجيش.',
  },
  militia: {
    name: 'حامية المدينة', icon: '🛡️', cls: 'inf', men: 40, hp: 8, atk: 4, def: 5, speed: 28,
    antiCav: 1.5, forms: ['line', 'square'], noRecruit: true, desc: 'رجال المدينة المدافعون عنها.',
  },
  ram: {
    name: 'كبش الدكّ', icon: '🪵', cls: 'mach', men: 10, hp: 14, atk: 0.5, def: 10, speed: 14,
    armor: 0.9, forms: ['line'], noRecruit: true, desc: 'يحطّم البوابة إذا وصل إليها.',
  },
};

const RECRUITABLE = ['spear', 'sword', 'archer', 'horsearcher', 'cavalry', 'catapult'];

const FORMS = {
  line: { name: 'صفّ', tip: 'واجهة عريضة وأكثر مقاتلين في الاشتباك' },
  square: { name: 'مربّع', tip: 'لا أجناب له، صلب أمام الخيالة والسهام، لكنه بطيء' },
  loose: { name: 'منتشر', tip: 'يقلّل أذى السهام والمنجنيق، أضعف في الالتحام' },
  wedge: { name: 'إسفين', tip: 'انقضاض أقوى واختراق، دفاع أقل' },
};

const TRAITS = {
  brave: { name: 'شجاع', desc: 'معنويات الجيش +15' },
  tactician: { name: 'داهية', desc: 'هجمات الأجناب والمؤخرة أقوى 25٪' },
  archer: { name: 'رامٍ ماهر', desc: 'رماية الجيش أقوى 15٪' },
  cavalier: { name: 'فارس', desc: 'انقضاض الخيالة أقوى 25٪' },
  stalwart: { name: 'صامد', desc: 'دفاع أقوى 20٪ عند حماية المدن' },
};

const BUILDINGS = {
  walls: { name: 'أسوار', max: 3, cost: (lvl) => 180 + lvl * 120, desc: 'تحمي المدينة وتفرض الحصار' },
  market: { name: 'سوق', max: 2, cost: (lvl) => 150 + lvl * 150, desc: '+50٪ دخل لكل مستوى' },
  farm: { name: 'مزارع', max: 2, cost: (lvl) => 120 + lvl * 120, desc: '+6 طعام ومؤن حصار أطول' },
  barracks: { name: 'إسطبلات وورش', max: 1, cost: () => 220, desc: 'تتيح الخيالة والمنجنيق' },
};

const SEASONS = ['الربيع', 'الصيف', 'الخريف', 'الشتاء'];

// ——— السيناريوهات ———
const SCENARIOS = {
  threeKingdoms: {
    id: 'threeKingdoms',
    name: 'الممالك الثلاث',
    sub: 'الصين — سنة 208م',
    intro: 'انهارت أسرة هان، وتقاسمت الأرضَ ثلاثُ ممالك. من يوحّد ما تحت السماء؟',
    startYear: 208,
    ground: '#d8c9a0',
    factions: {
      shu: {
        name: 'شو', color: '#3f8a4f', personality: { aggr: 1.0, prefs: { spear: 3, sword: 2, archer: 2, cavalry: 2, horsearcher: 0.5, catapult: 0.5 } },
        desc: 'مملكة الفضيلة. رمّاحة صلبة وقادة أبطال.',
        generals: [['ليو باي', 'brave'], ['قوان يو', 'brave'], ['جانغ في', 'cavalier'], ['جاو يون', 'cavalier'], ['جوغه ليانغ', 'tactician'], ['هوانغ جونغ', 'archer'], ['ما تشاو', 'cavalier'], ['وي يان', 'brave']],
      },
      wei: {
        name: 'وي', color: '#3a5f9a', personality: { aggr: 1.25, prefs: { spear: 2, sword: 2, archer: 2, cavalry: 3, horsearcher: 1, catapult: 0.7 } },
        desc: 'أقوى الممالك. خيالة الشمال وجيوش كبيرة.',
        generals: [['تساو تساو', 'tactician'], ['شياهو دون', 'brave'], ['جانغ لياو', 'cavalier'], ['سيما يي', 'tactician'], ['شو هوانغ', 'stalwart'], ['تساو رن', 'stalwart'], ['شياهو يوان', 'archer'], ['يو جين', 'brave']],
      },
      wu: {
        name: 'وو', color: '#b0392c', personality: { aggr: 0.9, prefs: { spear: 2, sword: 2, archer: 3.5, cavalry: 1, horsearcher: 0.5, catapult: 0.8 } },
        desc: 'سادة النهر. رماة مهرة ومدن حصينة.',
        generals: [['سون تشوان', 'stalwart'], ['جو يو', 'tactician'], ['لو منغ', 'tactician'], ['غان نينغ', 'brave'], ['لو شون', 'archer'], ['تاي شي تسي', 'archer'], ['هوانغ غاي', 'brave'], ['لينغ تونغ', 'cavalier']],
      },
    },
    neutralGenerals: [['جانغ لو', 'stalwart'], ['منغ هوو', 'brave'], ['شي شيه', 'stalwart'], ['هان سوي', 'cavalier']],
    nodes: [
      { id: 'chengdu', name: 'تشنغدو', x: 150, y: 470, owner: 'shu', pop: 30000, walls: 2, capital: true, terrain: 'plains' },
      { id: 'jiangzhou', name: 'جيانغتشو', x: 290, y: 540, owner: 'shu', pop: 14000, walls: 1, terrain: 'river' },
      { id: 'yongan', name: 'يونغآن', x: 390, y: 470, owner: 'shu', pop: 9000, walls: 1, terrain: 'hills' },
      { id: 'jiangling', name: 'جيانغلينغ', x: 520, y: 440, owner: 'shu', pop: 22000, walls: 2, terrain: 'river' },
      { id: 'changsha', name: 'تشانغشا', x: 560, y: 580, owner: 'shu', pop: 15000, walls: 1, terrain: 'forest' },
      { id: 'hanzhong', name: 'هانزونغ', x: 260, y: 320, owner: 'neutral', pop: 16000, walls: 2, terrain: 'hills' },
      { id: 'nanzhong', name: 'نانزونغ', x: 130, y: 640, owner: 'neutral', pop: 9000, walls: 0, terrain: 'forest' },
      { id: 'tianshui', name: 'تيانشوي', x: 180, y: 180, owner: 'neutral', pop: 10000, walls: 1, terrain: 'hills' },
      { id: 'jiaozhou', name: 'جياوتشو', x: 700, y: 660, owner: 'neutral', pop: 11000, walls: 1, terrain: 'forest' },
      { id: 'changan', name: 'تشانغآن', x: 360, y: 190, owner: 'wei', pop: 26000, walls: 2, terrain: 'plains' },
      { id: 'luoyang', name: 'لوويانغ', x: 520, y: 140, owner: 'wei', pop: 24000, walls: 2, terrain: 'hills' },
      { id: 'xuchang', name: 'شوتشانغ', x: 680, y: 170, owner: 'wei', pop: 34000, walls: 3, capital: true, terrain: 'plains' },
      { id: 'wan', name: 'وان', x: 560, y: 260, owner: 'wei', pop: 13000, walls: 1, terrain: 'plains' },
      { id: 'xiangyang', name: 'شيانغيانغ', x: 520, y: 345, owner: 'wei', pop: 20000, walls: 2, terrain: 'river' },
      { id: 'hefei', name: 'خفي', x: 780, y: 300, owner: 'wei', pop: 12000, walls: 2, terrain: 'plains' },
      { id: 'jianye', name: 'جيانيه', x: 900, y: 420, owner: 'wu', pop: 32000, walls: 3, capital: true, terrain: 'river' },
      { id: 'chaisang', name: 'تشايسانغ', x: 690, y: 450, owner: 'wu', pop: 15000, walls: 2, terrain: 'river' },
      { id: 'yuzhang', name: 'يوجانغ', x: 740, y: 560, owner: 'wu', pop: 13000, walls: 1, terrain: 'forest' },
      { id: 'kuaiji', name: 'كوايجي', x: 900, y: 570, owner: 'wu', pop: 16000, walls: 1, terrain: 'forest' },
    ],
    edges: [
      ['chengdu', 'jiangzhou'], ['chengdu', 'hanzhong'], ['chengdu', 'nanzhong'], ['jiangzhou', 'yongan'], ['jiangzhou', 'nanzhong'],
      ['yongan', 'jiangling'], ['yongan', 'hanzhong'], ['jiangling', 'changsha'], ['jiangling', 'xiangyang'], ['jiangling', 'chaisang'],
      ['changsha', 'yuzhang'], ['changsha', 'jiaozhou'], ['hanzhong', 'changan'], ['hanzhong', 'tianshui'], ['tianshui', 'changan'],
      ['changan', 'luoyang'], ['luoyang', 'xuchang'], ['luoyang', 'wan'], ['wan', 'xiangyang'], ['wan', 'xuchang'],
      ['xuchang', 'hefei'], ['hefei', 'jianye'], ['hefei', 'chaisang'], ['chaisang', 'jianye'], ['chaisang', 'yuzhang'],
      ['yuzhang', 'kuaiji'], ['kuaiji', 'jianye'], ['jiaozhou', 'yuzhang'], ['xiangyang', 'chaisang'],
    ],
    armies: [
      { owner: 'shu', node: 'chengdu', regs: ['spear', 'spear', 'sword', 'archer', 'archer', 'cavalry'] },
      { owner: 'shu', node: 'jiangling', regs: ['spear', 'sword', 'archer', 'cavalry'] },
      { owner: 'wei', node: 'xuchang', regs: ['spear', 'sword', 'sword', 'archer', 'cavalry', 'cavalry'] },
      { owner: 'wei', node: 'xiangyang', regs: ['spear', 'sword', 'archer', 'cavalry'] },
      { owner: 'wei', node: 'changan', regs: ['spear', 'archer', 'horsearcher'] },
      { owner: 'wu', node: 'jianye', regs: ['spear', 'sword', 'archer', 'archer', 'archer', 'cavalry'] },
      { owner: 'wu', node: 'chaisang', regs: ['spear', 'sword', 'archer', 'archer'] },
      { owner: 'neutral', node: 'hanzhong', regs: ['spear', 'archer', 'sword'] },
    ],
    seas: [
      [[960, 0], [1000, 0], [1000, 700], [930, 700], [960, 640], [945, 560], [975, 480], [955, 400], [985, 320], [950, 230], [975, 130]],
    ],
    rivers: [
      [[100, 520], [210, 500], [300, 510], [400, 480], [520, 460], [620, 470], [700, 440], [800, 430], [880, 400], [960, 395]],
      [[260, 90], [380, 110], [480, 105], [600, 100], [720, 130], [840, 150], [960, 170]],
      [[520, 460], [540, 380], [560, 300], [600, 240]],
    ],
    mountains: [[230, 390], [300, 400], [200, 270], [320, 270], [420, 330], [440, 400], [110, 330], [90, 230], [620, 610], [460, 600], [360, 620], [400, 260]],
  },

  umayyad: {
    id: 'umayyad',
    name: 'الفتوحات الأموية',
    sub: 'الثغور — سنة 715م',
    intro: 'تمتد الدولة الأموية من دمشق، وتقف الروم على الأسوار، ويتربص الخزر خلف القوقاز.',
    startYear: 715,
    ground: '#cdb27a',
    factions: {
      umayyad: {
        name: 'الأمويون', color: '#f1ece0', personality: { aggr: 1.2, prefs: { spear: 2, sword: 2, archer: 2, cavalry: 3, horsearcher: 1.5, catapult: 1 } },
        desc: 'خيالة سريعة وقادة فاتحون وجيوش منظّمة.',
        generals: [['مسلمة بن عبد الملك', 'tactician'], ['العباس بن الوليد', 'cavalier'], ['الجراح الحكمي', 'brave'], ['محمد بن مروان', 'stalwart'], ['سليمان بن معاذ', 'archer'], ['عمر بن هبيرة', 'brave'], ['سعيد الحرشي', 'cavalier'], ['مروان بن محمد', 'tactician']],
      },
      byzantine: {
        name: 'الروم', color: '#6b2f79', personality: { aggr: 0.85, prefs: { spear: 3, sword: 1.5, archer: 2, cavalry: 2.5, horsearcher: 0.5, catapult: 1 } },
        desc: 'مدن منيعة وفرسان مدرّعون (كاتافراكت).',
        generals: [['ليون الإيساوري', 'tactician'], ['أرتيميوس', 'stalwart'], ['ثيودوسيوس', 'stalwart'], ['قسطنطين', 'cavalier'], ['سيسينيوس', 'brave'], ['بردانيس', 'archer'], ['تيبيريوس', 'brave'], ['نقيطاس', 'cavalier']],
      },
      khazar: {
        name: 'الخزر', color: '#2f7f7a', personality: { aggr: 1.3, prefs: { spear: 1, sword: 1, archer: 1, cavalry: 2, horsearcher: 4, catapult: 0.3 } },
        desc: 'سهوب وخيّالة رماة لا يُلحق بهم.',
        generals: [['بارجيك', 'cavalier'], ['آلب طرخان', 'archer'], ['هزار طرخان', 'brave'], ['بولان', 'tactician'], ['أوبادياه', 'stalwart'], ['قاطون', 'cavalier'], ['تون يابغو', 'archer']],
      },
    },
    neutralGenerals: [['أشوط الأرمني', 'stalwart'], ['غوارام الكرجي', 'brave'], ['سمبات', 'cavalier']],
    nodes: [
      { id: 'constantinople', name: 'القسطنطينية', x: 130, y: 120, owner: 'byzantine', pop: 40000, walls: 3, capital: true, terrain: 'plains' },
      { id: 'nicaea', name: 'نيقية', x: 210, y: 200, owner: 'byzantine', pop: 16000, walls: 2, terrain: 'hills' },
      { id: 'amorium', name: 'عمورية', x: 300, y: 290, owner: 'byzantine', pop: 20000, walls: 2, terrain: 'plains' },
      { id: 'ancyra', name: 'أنقرة', x: 380, y: 200, owner: 'byzantine', pop: 14000, walls: 1, terrain: 'hills' },
      { id: 'caesarea', name: 'قيصرية', x: 470, y: 290, owner: 'byzantine', pop: 15000, walls: 2, terrain: 'hills' },
      { id: 'trebizond', name: 'طرابزون', x: 590, y: 150, owner: 'byzantine', pop: 12000, walls: 2, terrain: 'forest' },
      { id: 'malatya', name: 'ملطية', x: 570, y: 330, owner: 'umayyad', pop: 11000, walls: 2, terrain: 'hills' },
      { id: 'antioch', name: 'أنطاكية', x: 420, y: 440, owner: 'umayyad', pop: 22000, walls: 2, terrain: 'river' },
      { id: 'aleppo', name: 'حلب', x: 500, y: 470, owner: 'umayyad', pop: 20000, walls: 2, terrain: 'plains' },
      { id: 'damascus', name: 'دمشق', x: 470, y: 630, owner: 'umayyad', pop: 36000, walls: 2, capital: true, terrain: 'plains' },
      { id: 'raqqa', name: 'الرقة', x: 610, y: 470, owner: 'umayyad', pop: 13000, walls: 1, terrain: 'river' },
      { id: 'mosul', name: 'الموصل', x: 720, y: 470, owner: 'umayyad', pop: 18000, walls: 1, terrain: 'river' },
      { id: 'kufa', name: 'الكوفة', x: 780, y: 640, owner: 'umayyad', pop: 26000, walls: 1, terrain: 'river' },
      { id: 'dvin', name: 'دبيل', x: 720, y: 310, owner: 'neutral', pop: 13000, walls: 2, terrain: 'hills' },
      { id: 'tiflis', name: 'تفليس', x: 760, y: 200, owner: 'neutral', pop: 12000, walls: 1, terrain: 'forest' },
      { id: 'cherson', name: 'خرسون', x: 420, y: 60, owner: 'neutral', pop: 9000, walls: 1, terrain: 'plains' },
      { id: 'derbent', name: 'باب الأبواب', x: 870, y: 260, owner: 'khazar', pop: 11000, walls: 3, terrain: 'hills' },
      { id: 'balanjar', name: 'بلنجر', x: 860, y: 150, owner: 'khazar', pop: 13000, walls: 1, terrain: 'plains' },
      { id: 'samandar', name: 'سمندر', x: 930, y: 200, owner: 'khazar', pop: 10000, walls: 1, terrain: 'plains' },
      { id: 'atil', name: 'إتل', x: 940, y: 70, owner: 'khazar', pop: 28000, walls: 2, capital: true, terrain: 'river' },
    ],
    edges: [
      ['constantinople', 'nicaea'], ['nicaea', 'amorium'], ['nicaea', 'ancyra'], ['amorium', 'ancyra'], ['amorium', 'caesarea'],
      ['ancyra', 'caesarea'], ['ancyra', 'trebizond'], ['caesarea', 'malatya'], ['caesarea', 'antioch'], ['trebizond', 'dvin'],
      ['trebizond', 'tiflis'], ['malatya', 'dvin'], ['malatya', 'aleppo'], ['malatya', 'raqqa'], ['antioch', 'aleppo'],
      ['antioch', 'damascus'], ['aleppo', 'damascus'], ['aleppo', 'raqqa'], ['raqqa', 'mosul'], ['damascus', 'kufa'],
      ['mosul', 'kufa'], ['mosul', 'dvin'], ['dvin', 'tiflis'], ['dvin', 'derbent'], ['tiflis', 'balanjar'],
      ['derbent', 'samandar'], ['balanjar', 'samandar'], ['balanjar', 'atil'], ['samandar', 'atil'], ['cherson', 'constantinople'],
      ['cherson', 'trebizond'], ['cherson', 'atil'],
    ],
    armies: [
      { owner: 'umayyad', node: 'damascus', regs: ['spear', 'sword', 'sword', 'archer', 'cavalry', 'cavalry'] },
      { owner: 'umayyad', node: 'malatya', regs: ['spear', 'sword', 'archer', 'horsearcher'] },
      { owner: 'byzantine', node: 'constantinople', regs: ['spear', 'spear', 'sword', 'archer', 'archer', 'cavalry'] },
      { owner: 'byzantine', node: 'caesarea', regs: ['spear', 'spear', 'archer', 'cavalry'] },
      { owner: 'khazar', node: 'atil', regs: ['spear', 'horsearcher', 'horsearcher', 'horsearcher', 'cavalry', 'cavalry'] },
      { owner: 'khazar', node: 'derbent', regs: ['spear', 'archer', 'horsearcher', 'horsearcher'] },
      { owner: 'neutral', node: 'dvin', regs: ['spear', 'archer', 'sword'] },
    ],
    seas: [
      [[180, 0], [760, 0], [760, 40], [700, 100], [640, 115], [520, 110], [440, 120], [330, 130], [240, 110], [185, 70]],
      [[0, 330], [120, 360], [250, 400], [380, 420], [400, 470], [420, 540], [410, 620], [380, 700], [0, 700]],
      [[905, 250], [960, 240], [1000, 230], [1000, 700], [960, 700], [920, 560], [935, 420], [900, 330]],
      [[0, 0], [100, 0], [90, 70], [60, 150], [0, 190]],
    ],
    rivers: [
      [[600, 280], [610, 360], [620, 440], [660, 520], [720, 600], [770, 700]],
      [[680, 360], [720, 430], [750, 520], [800, 610], [830, 700]],
      [[900, 0], [920, 60], [910, 140], [930, 230]],
    ],
    mountains: [[340, 360], [400, 370], [470, 380], [530, 390], [630, 240], [680, 250], [720, 240], [790, 250], [820, 290], [660, 180], [300, 220], [250, 260]],
  },
};

const NEUTRAL = { name: 'المستقلون', color: '#8a8378' };

// قائمة جيش المعركة السريعة
const QUICK_ARMIES = [
  ['spear', 'spear', 'sword', 'sword', 'archer', 'archer', 'cavalry', 'horsearcher'],
  ['spear', 'spear', 'sword', 'archer', 'archer', 'archer', 'cavalry', 'cavalry'],
  ['spear', 'sword', 'sword', 'sword', 'archer', 'archer', 'horsearcher', 'cavalry'],
];

const TERRAIN_NAMES = { plains: 'سهول', forest: 'غابات', hills: 'تلال', river: 'نهر' };
