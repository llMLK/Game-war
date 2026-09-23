'use strict';
// بيانات الوحدات والقادة والتضاريس والسيناريوهات

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
    desc: 'يرمون من بعيد ويزداد مداهم فوق التلال والأسوار. هشّون في الالتحام.',
  },
  horsearcher: {
    name: 'خيّالة رماة', icon: '🏇', cls: 'cav', men: 30, hp: 12, atk: 4, def: 4, speed: 64,
    cost: 115, upkeep: 5, range: 160, missile: 3.6, reload: 3, ammo: 16, forms: ['line', 'loose'],
    needs: 'barracks', desc: 'سريعون، يرمون ثم ينسحبون قبل الالتحام (كرّ وفرّ). أقوى في السهول والصحراء.',
  },
  cavalry: {
    name: 'فرسان ثقيلة', icon: '🐎', cls: 'cav', men: 30, hp: 16, atk: 9, def: 7, speed: 56,
    cost: 135, upkeep: 6, charge: 14, forms: ['line', 'wedge'],
    needs: 'barracks', desc: 'انقضاض مدمّر على الأجناب والمؤخرة والرماة. ضعيفة في الغابات والجبال.',
  },
  catapult: {
    name: 'منجنيق', icon: '☄️', cls: 'mach', men: 12, hp: 10, atk: 2, def: 2, speed: 15,
    cost: 160, upkeep: 6, range: 400, minRange: 90, reload: 8, ammo: 30, forms: ['line'],
    needs: 'barracks', desc: 'يهدم الأسوار والبوابات ويفرّق الصفوف المتراصة.',
  },
  // ——— وحدات النخبة الخاصة بكل حضارة (تُجنَّد حيث يقيم «قائد نخبة») ———
  repeater: {
    name: 'رماة القوس المتكرر', icon: '🎯', cls: 'inf', men: 45, hp: 9, atk: 3, def: 4, speed: 31,
    cost: 150, upkeep: 5, range: 150, missile: 3.2, reload: 1.7, ammo: 30, forms: ['line', 'loose'],
    unique: 'shu', desc: 'اختراع جوغه ليانغ: وابل سريع متواصل من مسافة قصيرة.',
  },
  tigerleopard: {
    name: 'فرسان النمر والفهد', icon: '🐅', cls: 'cav', men: 30, hp: 20, atk: 11, def: 9, speed: 56,
    cost: 220, upkeep: 8, charge: 17, forms: ['line', 'wedge'], unique: 'wei',
    desc: 'حرس تساو الخاص. أقوى خيالة الممالك الثلاث.',
  },
  jinfan: {
    name: 'قراصنة الأجراس', icon: '🔔', cls: 'inf', men: 45, hp: 13, atk: 10, def: 6, speed: 36,
    cost: 150, upkeep: 5, armor: 0.3, fordFree: true, forms: ['line', 'loose'], unique: 'wu',
    desc: 'رجال غان نينغ: سريعون، شرسون، لا تبطئهم الأنهار.',
  },
  shamguard: {
    name: 'حرس الشام', icon: '🦅', cls: 'cav', men: 30, hp: 18, atk: 10, def: 8, speed: 60,
    cost: 200, upkeep: 7, charge: 15, forms: ['line', 'wedge'], unique: 'umayyad',
    desc: 'نخبة الفرسان الشاميين، سريعة وقوية الانقضاض.',
  },
  cataphract: {
    name: 'كاتافراكت', icon: '🛡️', cls: 'cav', men: 28, hp: 24, atk: 10, def: 11, speed: 48,
    cost: 230, upkeep: 8, charge: 16, armor: 0.6, forms: ['line', 'wedge'], unique: 'byzantine',
    desc: 'فرسان مدرّعون من الرأس إلى الحوافر. السهام بالكاد تؤذيهم.',
  },
  tarkhan: {
    name: 'خيّالة الطرخان', icon: '🏹', cls: 'cav', men: 30, hp: 15, atk: 6, def: 6, speed: 64,
    cost: 180, upkeep: 6, range: 170, missile: 4.4, reload: 2.6, ammo: 20, forms: ['line', 'loose'],
    unique: 'khazar', desc: 'نخبة رماة السهوب المدرّعين.',
  },
  // ——— وحدات لا تُجنَّد ———
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
  tower: {
    name: 'برج حصار', icon: '🗼', cls: 'mach', men: 12, hp: 14, atk: 0.5, def: 12, speed: 11,
    armor: 0.85, forms: ['line'], noRecruit: true, desc: 'يلتصق بالسور ويفتح معبراً آمناً للمشاة.',
  },
};

const RECRUITABLE = ['spear', 'sword', 'archer', 'horsearcher', 'cavalry', 'catapult'];
const UNIQUE_OF = { shu: 'repeater', wei: 'tigerleopard', wu: 'jinfan', umayyad: 'shamguard', byzantine: 'cataphract', khazar: 'tarkhan' };

const FORMS = {
  line: { name: 'صفّ', tip: 'واجهة عريضة وأكثر مقاتلين في الاشتباك' },
  square: { name: 'مربّع', tip: 'لا أجناب له، صلب أمام الخيالة والسهام، لكنه بطيء' },
  loose: { name: 'منتشر', tip: 'يقلّل أذى السهام والمنجنيق، أضعف في الالتحام' },
  wedge: { name: 'إسفين', tip: 'انقضاض أقوى واختراق، دفاع أقل' },
};

// ——— القادة ———
// كل سمة تغيّر نظاماً مختلفاً فعلاً (المعركة، الحركة، الاقتصاد، الإمداد، الحصار...)
const TRAITS = {
  tactician: { name: 'داهية', icon: '🧠', desc: 'الالتفاف والضرب من الخلف أقوى 25٪، ونقطة أوامر إضافية في المعركة.' },
  brave: { name: 'شجاع', icon: '🦁', desc: 'معنويات الجيش +15، وحرسه يقاتل بضراوة.' },
  cavalier: { name: 'فارس', icon: '🐎', desc: 'انقضاض الخيالة أقوى 30٪ وأسرع.' },
  archer: { name: 'رامٍ ماهر', icon: '🏹', desc: 'رماية الجيش أقوى 20٪ وسهامه أكثر.' },
  siege: { name: 'مهندس حصار', icon: '🪵', desc: 'معدات الحصار جاهزة فوراً وبرج الحصار بعد دور، وضرب الأسوار أقوى 50٪.' },
  defender: { name: 'صامد', icon: '🏰', desc: 'دفاع +20٪ ومعنويات +15 عند حماية مدينة، وحامية مدينته تتعافى أسرع.' },
  merchant: { name: 'إداري', icon: '💰', desc: 'المدينة التي يقيم فيها: دخل +30٪ وولاء أسرع. ضعيف المعنويات في القتال.' },
  logistician: { name: 'خبير تموين', icon: '🌾', desc: 'جيشه يأكل نصف الطعام، ولا يعاني من الاستنزاف أو الازدحام، ويتعافى أسرع.' },
  swift: { name: 'سريع', icon: '💨', desc: 'نقطتا حركة إضافيتان كل دور.' },
  mountaineer: { name: 'ابن الجبال', icon: '⛰️', desc: 'الجبال والممرات والتلال لا تبطئه، وقتاله في المرتفعات أقوى 20٪.' },
  desert: { name: 'ابن الصحراء', icon: '🏜️', desc: 'يعبر الصحراء بلا إبطاء ولا عطش، وقتاله فيها أقوى 15٪.' },
  naval: { name: 'ربّان', icon: '⛵', desc: 'يعبر الطرق المائية، ولا تُضعفه المخاضات والأنهار في المعركة.' },
  elite: { name: 'قائد نخبة', icon: '⭐', desc: 'يتيح تجنيد وحدة النخبة الخاصة بحضارته حيث يقيم.' },
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
  plains: { name: 'سهول', mp: 2, icon: '' },
  river: { name: 'نهر', mp: 2, icon: '' },
  coast: { name: 'ساحل', mp: 2, icon: '' },
  forest: { name: 'غابات', mp: 3, icon: '🌲' },
  hills: { name: 'تلال', mp: 3, icon: '' },
  desert: { name: 'صحراء', mp: 3, icon: '🏜️' },
  mountains: { name: 'جبال', mp: 4, icon: '⛰️' },
};
const TERRAIN_NAMES = Object.fromEntries(Object.entries(TERRAIN).map(([k, v]) => [k, v.name]));
const EDGE_KINDS = { road: 'طريق', pass: 'ممر جبلي', water: 'طريق مائي' };
const BASE_MP = 4;

const BUILDINGS = {
  walls: { name: 'أسوار', max: 4, cost: (lvl) => [180, 300, 450, 750][lvl], desc: 'تفرض الحصار. المستوى الرابع قلعة عظمى.' },
  market: { name: 'سوق', max: 3, cost: (lvl) => [150, 300, 550][lvl], desc: '+40٪ دخل لكل مستوى' },
  farm: { name: 'مزارع', max: 2, cost: (lvl) => [120, 240][lvl], desc: '+6 طعام، نمو السكان والقوى البشرية' },
  granary: { name: 'مخازن', max: 2, cost: (lvl) => [140, 280][lvl], desc: '+3 أدوار مؤن حصار، +3 سعة إمداد' },
  barracks: { name: 'إسطبلات وورش', max: 1, cost: () => 220, desc: 'تتيح الخيالة والمنجنيق' },
  roads: { name: 'طرق معبّدة', max: 1, cost: () => 260, desc: 'الحركة من المدينة وإليها أرخص بنقطة، وتجارة أكثر' },
};

const TAXES = {
  low: { name: 'منخفضة', income: 0.7, loyalty: 8 },
  normal: { name: 'معتدلة', income: 1, loyalty: 0 },
  high: { name: 'مرتفعة', income: 1.35, loyalty: -12 },
};

const SEASONS = ['الربيع', 'الصيف', 'الخريف', 'الشتاء'];

// ——— السيناريوهات ———
// القادة: [الاسم، السمة، العيب، الرتبة]
const SCENARIOS = {
  threeKingdoms: {
    id: 'threeKingdoms',
    name: 'الممالك الثلاث',
    sub: 'الصين — سنة 208م',
    intro: 'انهارت أسرة هان، وتقاسمت الأرضَ ثلاثُ ممالك. من يوحّد ما تحت السماء؟',
    startYear: 208,
    ground: '#d8c9a0',
    battleGround: 'green',
    factions: {
      shu: {
        name: 'شو', color: '#3f8a4f', personality: { aggr: 1.0, honor: 1.3, prefs: { spear: 3, sword: 2, archer: 2, cavalry: 2, horsearcher: 0.5, catapult: 0.5 } },
        desc: 'مملكة الفضيلة. رمّاحة صلبة وقادة أبطال. نخبتها: رماة القوس المتكرر.',
        generals: [
          ['ليو باي', 'merchant', null, 2], ['قوان يو', 'brave', 'arrogant', 3], ['جانغ في', 'brave', 'harsh', 2],
          ['جاو يون', 'cavalier', null, 2], ['جوغه ليانغ', 'elite', null, 3], ['هوانغ جونغ', 'archer', null, 2],
          ['ما تشاو', 'cavalier', 'reckless', 2], ['وي يان', 'mountaineer', 'arrogant', 1], ['فا جنغ', 'tactician', null, 1],
          ['جيانغ وي', 'mountaineer', null, 1], ['ما ليانغ', 'logistician', null, 1], ['وانغ بينغ', 'defender', null, 1],
        ],
      },
      wei: {
        name: 'وي', color: '#3a5f9a', personality: { aggr: 1.25, honor: 0.8, prefs: { spear: 2, sword: 2, archer: 2, cavalry: 3, horsearcher: 1, catapult: 0.7 } },
        desc: 'أقوى الممالك. خيالة الشمال وجيوش كبيرة. نخبتها: فرسان النمر والفهد.',
        generals: [
          ['تساو تساو', 'tactician', 'harsh', 3], ['شياهو دون', 'brave', 'reckless', 2], ['شياهو يوان', 'swift', 'reckless', 2],
          ['جانغ لياو', 'cavalier', null, 3], ['سيما يي', 'defender', 'disloyal', 2], ['تساو رن', 'defender', null, 2],
          ['شو هوانغ', 'siege', null, 1], ['جانغ خه', 'mountaineer', null, 2], ['تساو تشون', 'elite', null, 1],
          ['شون يو', 'merchant', null, 1], ['يو جين', 'logistician', 'disloyal', 1], ['دنغ آي', 'mountaineer', 'cautious', 1],
        ],
      },
      wu: {
        name: 'وو', color: '#b0392c', personality: { aggr: 0.9, honor: 1.0, prefs: { spear: 2, sword: 2, archer: 3.5, cavalry: 1, horsearcher: 0.5, catapult: 0.8 } },
        desc: 'سادة النهر. رماة مهرة وأساطيل. نخبتها: قراصنة الأجراس.',
        generals: [
          ['سون تشوان', 'merchant', 'cautious', 2], ['جو يو', 'naval', null, 3], ['لو منغ', 'tactician', null, 2],
          ['غان نينغ', 'elite', 'reckless', 2], ['لو شون', 'defender', null, 2], ['تاي شي تسي', 'archer', null, 2],
          ['هوانغ غاي', 'naval', null, 1], ['لينغ تونغ', 'brave', null, 1], ['لو سو', 'logistician', null, 1],
          ['جو تاي', 'defender', null, 1], ['دينغ فنغ', 'swift', null, 1], ['جو هوان', 'siege', 'arrogant', 1],
        ],
      },
    },
    neutralGenerals: [['جانغ لو', 'defender', null, 1], ['منغ هوو', 'brave', 'reckless', 1], ['شي شيه', 'merchant', null, 1], ['هان سوي', 'desert', 'disloyal', 1], ['ما تنغ', 'cavalier', null, 1]],
    nodes: [
      { id: 'chengdu', name: 'تشنغدو', x: 150, y: 470, owner: 'shu', pop: 30000, walls: 2, capital: true, terrain: 'plains' },
      { id: 'jiangzhou', name: 'جيانغتشو', x: 290, y: 540, owner: 'shu', pop: 14000, walls: 1, terrain: 'river' },
      { id: 'yongan', name: 'يونغآن', x: 390, y: 470, owner: 'shu', pop: 9000, walls: 1, terrain: 'mountains' },
      { id: 'jiangling', name: 'جيانغلينغ', x: 520, y: 440, owner: 'shu', pop: 22000, walls: 2, terrain: 'river' },
      { id: 'changsha', name: 'تشانغشا', x: 560, y: 580, owner: 'shu', pop: 15000, walls: 1, terrain: 'forest' },
      { id: 'hanzhong', name: 'هانزونغ', x: 260, y: 320, owner: 'neutral', pop: 16000, walls: 2, terrain: 'mountains' },
      { id: 'nanzhong', name: 'نانزونغ', x: 130, y: 640, owner: 'neutral', pop: 9000, walls: 0, terrain: 'forest' },
      { id: 'tianshui', name: 'تيانشوي', x: 180, y: 190, owner: 'neutral', pop: 10000, walls: 1, terrain: 'hills' },
      { id: 'wuwei', name: 'وووي', x: 80, y: 80, owner: 'neutral', pop: 8000, walls: 1, terrain: 'desert' },
      { id: 'jiaozhou', name: 'جياوتشو', x: 700, y: 660, owner: 'neutral', pop: 11000, walls: 1, terrain: 'coast' },
      { id: 'changan', name: 'تشانغآن', x: 360, y: 190, owner: 'wei', pop: 26000, walls: 2, terrain: 'plains' },
      { id: 'luoyang', name: 'لوويانغ', x: 520, y: 140, owner: 'wei', pop: 24000, walls: 2, terrain: 'hills' },
      { id: 'xuchang', name: 'شوتشانغ', x: 680, y: 170, owner: 'wei', pop: 34000, walls: 3, capital: true, terrain: 'plains' },
      { id: 'wan', name: 'وان', x: 560, y: 260, owner: 'wei', pop: 13000, walls: 1, terrain: 'plains' },
      { id: 'xiangyang', name: 'شيانغيانغ', x: 520, y: 345, owner: 'wei', pop: 20000, walls: 2, terrain: 'river' },
      { id: 'hefei', name: 'خفي', x: 780, y: 300, owner: 'wei', pop: 12000, walls: 2, terrain: 'plains' },
      { id: 'jianye', name: 'جيانيه', x: 900, y: 420, owner: 'wu', pop: 32000, walls: 3, capital: true, terrain: 'river' },
      { id: 'chaisang', name: 'تشايسانغ', x: 690, y: 450, owner: 'wu', pop: 15000, walls: 2, terrain: 'river' },
      { id: 'yuzhang', name: 'يوجانغ', x: 740, y: 560, owner: 'wu', pop: 13000, walls: 1, terrain: 'forest' },
      { id: 'kuaiji', name: 'كوايجي', x: 900, y: 570, owner: 'wu', pop: 16000, walls: 1, terrain: 'coast' },
    ],
    edges: [
      ['chengdu', 'jiangzhou'], ['chengdu', 'hanzhong', 'pass'], ['chengdu', 'nanzhong'], ['jiangzhou', 'yongan'], ['jiangzhou', 'nanzhong'],
      ['yongan', 'jiangling'], ['yongan', 'hanzhong', 'pass'], ['jiangling', 'changsha'], ['jiangling', 'xiangyang'], ['jiangling', 'chaisang'],
      ['changsha', 'yuzhang'], ['changsha', 'jiaozhou'], ['hanzhong', 'changan', 'pass'], ['hanzhong', 'tianshui'], ['tianshui', 'changan'],
      ['tianshui', 'wuwei'], ['changan', 'luoyang'], ['luoyang', 'xuchang'], ['luoyang', 'wan'], ['wan', 'xiangyang'], ['wan', 'xuchang'],
      ['xuchang', 'hefei'], ['hefei', 'jianye'], ['hefei', 'chaisang'], ['chaisang', 'jianye'], ['chaisang', 'yuzhang'],
      ['yuzhang', 'kuaiji'], ['kuaiji', 'jianye'], ['jiaozhou', 'yuzhang'], ['xiangyang', 'chaisang'],
      ['jiangzhou', 'jiangling', 'water'], ['kuaiji', 'jiaozhou', 'water'], ['jianye', 'xiangyang', 'water'],
    ],
    armies: [
      { owner: 'shu', node: 'chengdu', gen: 'ليو باي', regs: ['spear', 'spear', 'sword', 'archer', 'archer', 'cavalry'] },
      { owner: 'shu', node: 'jiangling', gen: 'قوان يو', regs: ['spear', 'sword', 'archer', 'cavalry'] },
      { owner: 'wei', node: 'xuchang', gen: 'تساو تساو', regs: ['spear', 'sword', 'sword', 'archer', 'cavalry', 'cavalry'] },
      { owner: 'wei', node: 'xiangyang', gen: 'تساو رن', regs: ['spear', 'sword', 'archer', 'cavalry'] },
      { owner: 'wei', node: 'changan', gen: 'شياهو يوان', regs: ['spear', 'archer', 'horsearcher'] },
      { owner: 'wu', node: 'jianye', gen: 'جو يو', regs: ['spear', 'sword', 'archer', 'archer', 'archer', 'cavalry'] },
      { owner: 'wu', node: 'chaisang', gen: 'لو منغ', regs: ['spear', 'sword', 'archer', 'archer'] },
      { owner: 'neutral', node: 'hanzhong', gen: 'جانغ لو', regs: ['spear', 'archer', 'sword'] },
    ],
    seas: [
      [[960, 0], [1000, 0], [1000, 700], [930, 700], [960, 640], [945, 560], [975, 480], [955, 400], [985, 320], [950, 230], [975, 130]],
      [[600, 700], [640, 690], [760, 695], [930, 700]],
    ],
    deserts: [[[0, 0], [260, 0], [240, 60], [150, 140], [60, 160], [0, 150]]],
    rivers: [
      [[100, 520], [210, 500], [300, 510], [400, 480], [520, 460], [620, 470], [700, 440], [800, 430], [880, 400], [960, 395]],
      [[260, 90], [380, 110], [480, 105], [600, 100], [720, 130], [840, 150], [960, 170]],
      [[520, 460], [540, 380], [560, 300], [600, 240]],
    ],
    mountains: [[230, 390], [300, 400], [200, 270], [320, 270], [420, 330], [440, 400], [110, 330], [90, 230], [620, 610], [460, 600], [360, 620], [400, 260], [390, 430]],
  },

  umayyad: {
    id: 'umayyad',
    name: 'الفتوحات الأموية',
    sub: 'الثغور — سنة 715م',
    intro: 'تمتد الدولة الأموية من دمشق، وتقف الروم على الأسوار، ويتربص الخزر خلف القوقاز.',
    startYear: 715,
    ground: '#cdb27a',
    battleGround: 'dry',
    factions: {
      umayyad: {
        name: 'الأمويون', color: '#f1ece0', personality: { aggr: 1.2, honor: 1.1, prefs: { spear: 2, sword: 2, archer: 2, cavalry: 3, horsearcher: 1.5, catapult: 1 } },
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
        name: 'الخزر', color: '#2f7f7a', personality: { aggr: 1.3, honor: 0.8, prefs: { spear: 1, sword: 1, archer: 1, cavalry: 2, horsearcher: 4, catapult: 0.3 } },
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
    nodes: [
      { id: 'constantinople', name: 'القسطنطينية', x: 130, y: 120, owner: 'byzantine', pop: 40000, walls: 4, capital: true, terrain: 'coast' },
      { id: 'nicaea', name: 'نيقية', x: 210, y: 200, owner: 'byzantine', pop: 16000, walls: 2, terrain: 'hills' },
      { id: 'amorium', name: 'عمورية', x: 300, y: 290, owner: 'byzantine', pop: 20000, walls: 2, terrain: 'plains' },
      { id: 'ancyra', name: 'أنقرة', x: 380, y: 200, owner: 'byzantine', pop: 14000, walls: 1, terrain: 'hills' },
      { id: 'caesarea', name: 'قيصرية', x: 470, y: 290, owner: 'byzantine', pop: 15000, walls: 2, terrain: 'mountains' },
      { id: 'trebizond', name: 'طرابزون', x: 590, y: 150, owner: 'byzantine', pop: 12000, walls: 2, terrain: 'coast' },
      { id: 'tarsus', name: 'طرسوس', x: 370, y: 390, owner: 'umayyad', pop: 11000, walls: 2, terrain: 'coast' },
      { id: 'malatya', name: 'ملطية', x: 570, y: 330, owner: 'umayyad', pop: 11000, walls: 2, terrain: 'hills' },
      { id: 'antioch', name: 'أنطاكية', x: 420, y: 450, owner: 'umayyad', pop: 22000, walls: 2, terrain: 'river' },
      { id: 'aleppo', name: 'حلب', x: 500, y: 470, owner: 'umayyad', pop: 20000, walls: 2, terrain: 'plains' },
      { id: 'damascus', name: 'دمشق', x: 470, y: 630, owner: 'umayyad', pop: 36000, walls: 2, capital: true, terrain: 'plains' },
      { id: 'palmyra', name: 'تدمر', x: 590, y: 580, owner: 'neutral', pop: 7000, walls: 1, terrain: 'desert' },
      { id: 'raqqa', name: 'الرقة', x: 630, y: 460, owner: 'umayyad', pop: 13000, walls: 1, terrain: 'desert' },
      { id: 'mosul', name: 'الموصل', x: 730, y: 460, owner: 'umayyad', pop: 18000, walls: 1, terrain: 'river' },
      { id: 'kufa', name: 'الكوفة', x: 790, y: 640, owner: 'umayyad', pop: 26000, walls: 1, terrain: 'desert' },
      { id: 'dvin', name: 'دبيل', x: 720, y: 310, owner: 'neutral', pop: 13000, walls: 2, terrain: 'mountains' },
      { id: 'tiflis', name: 'تفليس', x: 760, y: 200, owner: 'neutral', pop: 12000, walls: 1, terrain: 'forest' },
      { id: 'cherson', name: 'خرسون', x: 420, y: 60, owner: 'neutral', pop: 9000, walls: 1, terrain: 'coast' },
      { id: 'derbent', name: 'باب الأبواب', x: 870, y: 260, owner: 'khazar', pop: 11000, walls: 3, terrain: 'mountains' },
      { id: 'balanjar', name: 'بلنجر', x: 860, y: 150, owner: 'khazar', pop: 13000, walls: 1, terrain: 'plains' },
      { id: 'samandar', name: 'سمندر', x: 930, y: 200, owner: 'khazar', pop: 10000, walls: 1, terrain: 'coast' },
      { id: 'atil', name: 'إتل', x: 940, y: 70, owner: 'khazar', pop: 28000, walls: 2, capital: true, terrain: 'river' },
    ],
    edges: [
      ['constantinople', 'nicaea'], ['nicaea', 'amorium'], ['nicaea', 'ancyra'], ['amorium', 'ancyra'], ['amorium', 'caesarea'],
      ['ancyra', 'caesarea'], ['ancyra', 'trebizond'], ['caesarea', 'malatya'], ['caesarea', 'tarsus', 'pass'], ['tarsus', 'antioch'],
      ['trebizond', 'dvin', 'pass'], ['trebizond', 'tiflis'], ['malatya', 'dvin'], ['malatya', 'aleppo'], ['malatya', 'raqqa'],
      ['antioch', 'aleppo'], ['antioch', 'damascus'], ['aleppo', 'damascus'], ['aleppo', 'raqqa'], ['damascus', 'palmyra'],
      ['palmyra', 'raqqa'], ['palmyra', 'kufa'], ['raqqa', 'mosul'], ['damascus', 'kufa'], ['mosul', 'kufa'], ['mosul', 'dvin'],
      ['dvin', 'tiflis'], ['dvin', 'derbent', 'pass'], ['tiflis', 'balanjar', 'pass'], ['derbent', 'samandar'], ['balanjar', 'samandar'],
      ['balanjar', 'atil'], ['samandar', 'atil'], ['cherson', 'atil'],
      ['cherson', 'constantinople', 'water'], ['cherson', 'trebizond', 'water'], ['constantinople', 'trebizond', 'water'], ['tarsus', 'nicaea', 'water'],
    ],
    armies: [
      { owner: 'umayyad', node: 'damascus', gen: 'مسلمة بن عبد الملك', regs: ['spear', 'sword', 'sword', 'archer', 'cavalry', 'cavalry'] },
      { owner: 'umayyad', node: 'malatya', gen: 'العباس بن الوليد', regs: ['spear', 'sword', 'archer', 'horsearcher'] },
      { owner: 'byzantine', node: 'constantinople', gen: 'ليون الإيساوري', regs: ['spear', 'spear', 'sword', 'archer', 'archer', 'cavalry'] },
      { owner: 'byzantine', node: 'caesarea', gen: 'أرتاباسدوس', regs: ['spear', 'spear', 'archer', 'cavalry'] },
      { owner: 'khazar', node: 'atil', gen: 'بارجيك', regs: ['spear', 'horsearcher', 'horsearcher', 'horsearcher', 'cavalry', 'cavalry'] },
      { owner: 'khazar', node: 'derbent', gen: 'آلب طرخان', regs: ['spear', 'archer', 'horsearcher', 'horsearcher'] },
      { owner: 'neutral', node: 'dvin', gen: 'أشوط الأرمني', regs: ['spear', 'archer', 'sword'] },
    ],
    seas: [
      [[180, 0], [760, 0], [760, 40], [700, 100], [640, 115], [520, 110], [440, 120], [330, 130], [240, 110], [185, 70]],
      [[0, 330], [120, 360], [250, 400], [330, 410], [380, 430], [400, 470], [420, 540], [410, 620], [380, 700], [0, 700]],
      [[905, 250], [960, 240], [1000, 230], [1000, 700], [960, 700], [920, 560], [935, 420], [900, 330]],
      [[0, 0], [100, 0], [90, 70], [60, 150], [0, 190]],
    ],
    deserts: [[[520, 520], [600, 500], [700, 520], [760, 560], [860, 600], [900, 700], [500, 700], [520, 640]]],
    rivers: [
      [[600, 280], [610, 360], [625, 440], [660, 520], [720, 600], [770, 700]],
      [[680, 360], [720, 430], [750, 520], [800, 610], [830, 700]],
      [[900, 0], [920, 60], [910, 140], [930, 230]],
    ],
    mountains: [[340, 360], [420, 340], [470, 380], [530, 390], [630, 240], [680, 250], [720, 240], [790, 250], [820, 290], [660, 180], [300, 220], [250, 260], [700, 360]],
  },
};

const NEUTRAL = { name: 'المستقلون', color: '#8a8378' };

// قائمة جيش المعركة السريعة
const QUICK_ARMIES = [
  ['spear', 'spear', 'sword', 'sword', 'archer', 'archer', 'cavalry', 'horsearcher'],
  ['spear', 'spear', 'sword', 'archer', 'archer', 'archer', 'cavalry', 'cavalry'],
  ['spear', 'sword', 'sword', 'sword', 'archer', 'archer', 'horsearcher', 'cavalry'],
];
