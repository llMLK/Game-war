'use strict';
// القائمة الرئيسية، المعركة السريعة، والإقلاع

// خلفية القائمة: خريطة مرسومة لأحد العصرين تتحرك ببطء
class MenuScene {
  constructor() {
    const sc = SCENARIOS[pick(Object.keys(SCENARIOS))];
    this.sc = sc;
    const cols = {};
    for (const [id, f] of Object.entries(sc.factions)) cols[id] = f.color;
    cols.neutral = NEUTRAL.color;
    this.art = new MapArt(sc, { colorOf: (o) => cols[o] || NEUTRAL.color });
    const r = rng(hashStr(sc.id + 'menu'));
    this.nodes = sc.nodes.map((n) => ({ ...n, market: n.pop > 15000 ? 1 + (r() < 0.5 ? 1 : 0) : 0, farm: r() < 0.6 ? 1 : 0, granary: n.walls >= 2 ? 1 : 0, barracks: n.capital ? 1 : 0, port: 0 }));
    this.cam = new Camera(MW, MH);
    this.cam.cover = true;
    this.t = 0;
    this.path = this.nodes.filter((n) => n.capital);
  }
  enter() { this.fit(); }
  onResize() { this.fit(); }
  fit() {
    const cover = Math.max(App.W / MW, App.H / MH);
    this.cam.minZ = cover; this.cam.maxZ = cover * 4;
    this.cam.z = cover * 1.8;
  }
  update(dt) {
    this.t += dt;
    const k = (this.t / 22) % this.path.length;
    const a = this.path[Math.floor(k)], b = this.path[(Math.floor(k) + 1) % this.path.length];
    const f = k - Math.floor(k), e = f * f * (3 - 2 * f);
    this.cam.x = lerp(a.x, b.x, e); this.cam.y = lerp(a.y, b.y, e);
    this.cam.clamp();
  }
  render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b2217'; ctx.fillRect(0, 0, App.canvas.width, App.canvas.height);
    this.art.renderTerritory(this.nodes);
    this.cam.apply(ctx);
    ctx.drawImage(this.art.bg, 0, 0, MW, MH);
    ctx.drawImage(this.art.terr, 0, 0, MW, MH);
    for (const e of this.sc.edges) {
      const A = this.nodes.find((n) => n.id === e[0]), B = this.nodes.find((n) => n.id === e[1]);
      ctx.setLineDash(e[2] === 'water' ? [2, 4] : [3.5, 3]); ctx.strokeStyle = 'rgba(95,65,35,.6)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const n of [...this.nodes].sort((a, b) => a.y - b.y)) this.art.drawNode(ctx, n, { color: this.art.colorOf(n.owner), t: this.t, scars: [], age: () => 99 });
  }
}

function showMainMenu() {
  if (!(App.scene instanceof MenuScene)) App.setScene(new MenuScene());
  App.ui.innerHTML = '';
  const hasSave = Game.hasSave();
  const saved = hasSave ? Game.readSlot('auto').meta : null;
  const menu = h('div', { class: 'menu' },
    h('div', { class: 'menu-card' },
      h('div', { class: 'title' },
        h('h1', null, 'سيوف الممالك'),
        h('p', null, 'حرب استراتيجية في العصور القديمة — الخطة تهزم العدد'),
      ),
      h('div', { class: 'menu-btns' },
        hasSave ? h('button', { class: 'btn primary big', onclick: () => continueCampaign() },
          'متابعة الحملة', h('small', null, `${SCENARIOS[saved.scenario].name} · ${saved.fname} · ${SEASONS[saved.turn % 4]} ${SCENARIOS[saved.scenario].startYear + Math.floor(saved.turn / 4)}م`)) : null,
        h('button', { class: 'btn big' + (hasSave ? '' : ' primary'), onclick: () => newCampaignFlow() }, 'حملة جديدة', h('small', null, 'بناء الجيش، الحصار، الاحتلال، التفاوض')),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn', onclick: () => quickBattle('field') }, 'معركة سريعة'),
          h('button', { class: 'btn', onclick: () => quickBattle('siege') }, 'حصار سريع'),
          h('button', { class: 'btn', onclick: () => quickBattle('defend') }, 'دفاع عن مدينة'),
        ),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn ghost', onclick: () => Panels.saves(null) }, 'تحميل حملة'),
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
  if (!Game.load('auto')) { UI.toast('لا توجد حملة محفوظة'); return; }
  startCampaign();
}

function startCampaign() {
  const scene = new CampaignScene();
  installHooks(scene);
  App.setScene(scene);
}

function quickBattle(kind) {
  const mk = (list) => list.map((t) => ({ type: t, men: UNITS[t].men, exp: 0 }));
  const terrains = ['plains', 'forest', 'hills', 'river', 'desert', 'mountains'];
  const g = (name, trait, flaw, rank = 2) => ({ name, trait, flaw, rank, men: 12 + 4 * rank });
  const P = { fid: 'p', name: 'قواتك', color: '#3f8a4f', player: true, intel: 2, ai: 0.6 };
  const E = { fid: 'e', name: 'قوات العدو', color: '#b0392c', ai: 0.6, intel: 3 };
  const traits = Object.keys(TRAITS).filter((t) => !['merchant', 'elite', 'naval', 'swift', 'logistician'].includes(t));
  let cfg;
  if (kind === 'field') {
    cfg = {
      kind: 'field', terrain: pick(terrains), weather: pick(['clear', 'clear', 'rain', 'fog', 'heat']), seed: Math.floor(R() * 1e9), title: 'الميدان',
      sides: [
        { ...P, regs: mk(pick(QUICK_ARMIES)), gens: [g('قائدك', pick(traits), null), g('قائد الجناح', pick(traits), null, 1)] },
        { ...E, regs: mk(pick(QUICK_ARMIES)), gens: [g('قائد العدو', pick(traits), pick([null, 'reckless', 'cautious', 'arrogant']))] },
      ],
    };
  } else if (kind === 'siege') {
    cfg = {
      kind: 'siege', terrain: 'plains', walls: 2, seed: Math.floor(R() * 1e9), equip: { ram: true, ladders: true, tower: R() < 0.5 }, title: 'المدينة', stores: 2,
      sides: [
        { ...P, regs: mk(['spear', 'sword', 'sword', 'sword', 'archer', 'archer', 'cavalry', 'catapult', 'spear', 'sword']), gens: [g('قائدك', pick(['siege', 'brave', 'tactician']), null)] },
        { ...E, regs: mk(['militia', 'militia', 'archer', 'archer', 'spear', 'sword']), gens: [g('حاكم المدينة', 'defender', null)] },
      ],
    };
  } else {
    cfg = {
      kind: 'siege', terrain: 'plains', walls: 2, seed: Math.floor(R() * 1e9), equip: { ram: true, ladders: true, tower: R() < 0.5 }, title: 'مدينتك', stores: 3,
      sides: [
        { ...E, regs: mk(['spear', 'sword', 'sword', 'sword', 'archer', 'archer', 'cavalry', 'catapult', 'spear', 'sword']), gens: [g('قائد الغزاة', pick(['siege', 'brave']), null)] },
        { ...P, regs: mk(['militia', 'militia', 'archer', 'archer', 'spear', 'sword', 'cavalry']), gens: [g('أنت', 'defender', null)] },
      ],
    };
  }
  App.setScene(new BattleScene(cfg, () => showMainMenu()));
}

function showGuide() {
  UI.modal({
    title: 'دليل الحرب',
    body: h('div', { class: 'tips' },
      GUIDE.map(([t, d]) => h('div', { class: 'tip' }, h('b', null, t), h('p', null, d))),
      h('div', { class: 'tip' }, h('b', null, 'الوحدات'), RECRUITABLE.map((t) => h('p', null, h('b', null, UNITS[t].name + ': '), UNITS[t].desc))),
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
