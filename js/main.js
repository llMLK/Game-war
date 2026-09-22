'use strict';
// القائمة الرئيسية، المعركة السريعة، والإقلاع

// خلفية القائمة: معركة حيّة بين جيشين يقودهما الذكاء الاصطناعي
class MenuScene {
  constructor() {
    this.cam = new Camera(BW, BH);
    this.newBattle();
  }
  newBattle() {
    const terrains = ['plains', 'forest', 'hills', 'river'];
    const pal = [['#b0392c', '#3a5f9a'], ['#3f8a4f', '#b0392c'], ['#6b2f79', '#f1ece0'], ['#2f7f7a', '#3a5f9a']];
    const [c0, c1] = pick(pal);
    const mk = (list) => list.map((t) => ({ type: t, men: UNITS[t].men, exp: 0 }));
    this.b = new Battle({
      kind: 'field', terrain: pick(terrains), seed: Math.floor(R() * 1e9), ground: R() < 0.5 ? 'green' : 'dry',
      sides: [
        { name: 'أ', color: c0, regs: mk(pick(QUICK_ARMIES)), general: { name: 'قائد', trait: null, men: 16 }, ai: 0.8 },
        { name: 'ب', color: c1, regs: mk(pick(QUICK_ARMIES)), general: { name: 'قائد', trait: null, men: 16 }, ai: 0.8 },
      ],
    });
    this.b.ais[0].posture = 'attack';
    this.b.start();
    this.b.onEnd = () => { setTimeout(() => this.newBattle(), 2500); };
    this.t = 0;
  }
  enter() { this.fit(); }
  onResize() { this.fit(); }
  fit() {
    this.cam.fit();
    this.cam.z = Math.max(this.cam.z * 1.5, Math.min(App.W / 900, 1));
  }
  update(dt) {
    this.t += dt;
    this.b.update(dt);
    const act = this.b.regs.filter((r) => r.active);
    if (act.length) {
      let x = 0, y = 0;
      for (const r of act) { x += r.x; y += r.y; }
      x /= act.length; y /= act.length;
      this.cam.x += (x + Math.sin(this.t * 0.1) * 60 - this.cam.x) * dt * 0.3;
      this.cam.y += (y - this.cam.y) * dt * 0.3;
      this.cam.clamp();
    }
  }
  render(ctx) { this.b.render(ctx, this.cam, null); }
}

function showMainMenu() {
  if (!(App.scene instanceof MenuScene)) App.setScene(new MenuScene());
  App.ui.innerHTML = '';
  const hasSave = Game.hasSave();
  const saved = hasSave ? store.get(SAVE_KEY) : null;
  const menu = h('div', { class: 'menu' },
    h('div', { class: 'menu-card' },
      h('div', { class: 'title' },
        h('h1', null, 'سيوف الممالك'),
        h('p', null, 'حرب استراتيجية في العصور القديمة — الخطة تهزم العدد'),
      ),
      h('div', { class: 'menu-btns' },
        hasSave ? h('button', { class: 'btn primary big', onclick: () => continueCampaign() },
          'متابعة الحملة', h('small', null, `${SCENARIOS[saved.scenario].name} · ${saved.factions[saved.player].name} · ${SEASONS[saved.turn % 4]} ${SCENARIOS[saved.scenario].startYear + Math.floor(saved.turn / 4)}م`)) : null,
        h('button', { class: 'btn big' + (hasSave ? '' : ' primary'), onclick: () => newCampaignFlow() }, 'حملة جديدة', h('small', null, 'بناء الجيش، الحصار، الاحتلال، التفاوض')),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn', onclick: () => quickBattle('field') }, 'معركة سريعة'),
          h('button', { class: 'btn', onclick: () => quickBattle('siege') }, 'حصار سريع'),
          h('button', { class: 'btn', onclick: () => quickBattle('defend') }, 'دفاع عن مدينة'),
        ),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn ghost', onclick: () => showGuide() }, 'دليل الحرب'),
          h('button', { class: 'btn ghost', onclick: () => goFullscreen() }, 'ملء الشاشة'),
        ),
      ),
      h('p', { class: 'rotate-hint' }, 'أدر الهاتف أفقياً لأفضل تجربة'),
    ),
  );
  App.ui.appendChild(menu);
}

function goFullscreen() {
  const el = document.documentElement;
  const p = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
  Promise.resolve(p).then(() => {
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* */ }
  }).catch(() => UI.toast('ملء الشاشة غير متاح هنا'));
}

function newCampaignFlow() {
  const state = { sc: 'threeKingdoms', fac: null, diff: 'normal' };
  const card = h('div', { class: 'menu-card wide' });
  const render = () => {
    card.innerHTML = '';
    const sc = SCENARIOS[state.sc];
    if (!state.fac || !sc.factions[state.fac]) state.fac = Object.keys(sc.factions)[0];
    card.append(
      h('h2', null, 'حملة جديدة'),
      h('div', { class: 'label' }, 'العصر'),
      h('div', { class: 'pick-row' }, Object.values(SCENARIOS).map((s) => h('button', {
        class: 'pick' + (state.sc === s.id ? ' on' : ''), onclick: () => { state.sc = s.id; state.fac = null; render(); },
      }, h('b', null, s.name), h('span', null, s.sub)))),
      h('div', { class: 'label' }, 'مملكتك'),
      h('div', { class: 'pick-row' }, Object.entries(sc.factions).map(([id, f]) => h('button', {
        class: 'pick fac' + (state.fac === id ? ' on' : ''), onclick: () => { state.fac = id; render(); },
      }, h('b', null, h('i', { class: 'dot', style: { background: f.color } }), f.name), h('span', null, f.desc)))),
      h('div', { class: 'label' }, 'الصعوبة'),
      h('div', { class: 'pick-row small' }, Object.entries(DIFFS).map(([id, d]) => h('button', {
        class: 'chip' + (state.diff === id ? ' on' : ''), onclick: () => { state.diff = id; render(); },
      }, d.name))),
      h('p', { class: 'muted' }, sc.intro),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn ghost', onclick: () => showMainMenu() }, 'رجوع'),
        h('button', {
          class: 'btn primary', onclick: () => {
            Game.newGame(state.sc, state.fac, state.diff);
            startCampaign();
          },
        }, 'ابدأ الحملة'),
      ),
    );
  };
  render();
  App.ui.innerHTML = '';
  App.ui.appendChild(h('div', { class: 'menu' }, card));
}

function continueCampaign() {
  if (!Game.load()) { UI.toast('لا توجد حملة محفوظة'); return; }
  startCampaign();
}

function startCampaign() {
  const scene = new CampaignScene();
  installHooks(scene);
  App.setScene(scene);
}

function quickBattle(kind) {
  const mk = (list) => list.map((t) => ({ type: t, men: UNITS[t].men, exp: 0 }));
  const terrains = ['plains', 'forest', 'hills', 'river'];
  const P = { name: 'جيشك', color: '#3f8a4f', player: true };
  const E = { name: 'العدو', color: '#b0392c', ai: 0.6 };
  let cfg;
  if (kind === 'field') {
    cfg = {
      kind: 'field', terrain: pick(terrains), seed: Math.floor(R() * 1e9),
      sides: [
        { ...P, regs: mk(pick(QUICK_ARMIES)), general: { name: 'قائدك', trait: 'tactician', men: 16 } },
        { ...E, regs: mk(pick(QUICK_ARMIES)), general: { name: 'قائد العدو', trait: 'brave', men: 16 } },
      ],
    };
  } else if (kind === 'siege') {
    cfg = {
      kind: 'siege', terrain: 'plains', walls: 2, seed: Math.floor(R() * 1e9), equip: { ram: true, ladders: true },
      sides: [
        { ...P, regs: mk(['spear', 'sword', 'sword', 'sword', 'archer', 'archer', 'cavalry', 'catapult']), general: { name: 'قائدك', trait: 'brave', men: 16 } },
        { ...E, regs: mk(['militia', 'militia', 'archer', 'archer', 'spear', 'sword']), general: { name: 'حاكم المدينة', trait: 'stalwart', men: 16 } },
      ],
    };
  } else {
    cfg = {
      kind: 'siege', terrain: 'plains', walls: 2, seed: Math.floor(R() * 1e9), equip: { ram: true, ladders: true },
      sides: [
        { ...E, player: false, regs: mk(['spear', 'sword', 'sword', 'sword', 'archer', 'archer', 'cavalry', 'catapult']), general: { name: 'قائد الغزاة', trait: 'brave', men: 16 } },
        { ...P, regs: mk(['militia', 'militia', 'archer', 'archer', 'spear', 'sword']), general: { name: 'أنت', trait: 'stalwart', men: 16 } },
      ],
    };
  }
  App.setScene(new BattleScene(cfg, () => showMainMenu()));
}

function showGuide() {
  UI.modal({
    title: 'دليل الحرب',
    body: h('div', { class: 'tips' },
      TIPS.map(([t, d]) => h('div', { class: 'tip' }, h('b', null, t), h('p', null, d))),
      h('div', { class: 'tip' }, h('b', null, 'الوحدات'), RECRUITABLE.map((t) => h('p', null, h('b', null, UNITS[t].icon + ' ' + UNITS[t].name + ': '), UNITS[t].desc))),
      h('div', { class: 'tip' }, h('b', null, 'الحملة'), h('p', null, 'كل دور = فصل. جنّد وابنِ في مدنك، حرّك جيوشك خطوة واحدة، حاصر المدن المسوّرة أو اقتحمها، ثم فاوض على الصلح أو الأحلاف. المدن المحتلة حديثاً تثور إن تُركت بلا جيش.')),
    ),
    buttons: [{ label: 'إغلاق', primary: true }],
    dismissable: true,
  });
}

window.addEventListener('load', () => {
  App.init();
  showMainMenu();
});
