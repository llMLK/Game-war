'use strict';
// Independent QA: synthetic fixtures + isolated VM storage. Never opens a browser.
// node tests/agent2-phase-r-save-safety.cjs [--root PATH] [--group baseline|phase-r] [--filter TEXT]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  assert.ok(args[i + 1] && !args[i + 1].startsWith('--'), `${name} requires a value`);
  return args[i + 1];
}
for (let i = 0; i < args.length; i += 2) assert.ok(['--root', '--group', '--filter'].includes(args[i]), `Unknown option ${args[i]}`);
const root = path.resolve(option('--root', path.join(__dirname, '..')));
const group = option('--group', 'all'), filter = option('--filter', '');
assert.ok(['all', 'baseline', 'phase-r'].includes(group), 'Unknown group');
const AUTO = 'swords-kingdoms-v2:auto', V1 = 'swords-kingdoms-save-v1';
const slotKey = s => `swords-kingdoms-v2:${s}`;
const copy = v => JSON.parse(JSON.stringify(v));
const frozen = JSON.parse(fs.readFileSync(path.join(__dirname, 'agent2-phase-r-umayyad-fixture.json'), 'utf8'));
const frozenChinese = JSON.parse(fs.readFileSync(path.join(__dirname, 'agent2-phase-r-chinese-fixture.json'), 'utf8'));
function umayyad() { const d = copy(frozen); delete d._fixture; return d; }
// Deliberately historical save data only: no dependency on a live Chinese catalog.
function chinese() {
  const d = copy(frozenChinese); delete d._fixture; return d;
}
function v1(sc = 'umayyad') {
  const s = (sc === 'umayyad' ? umayyad() : chinese()).S;
  s.v = 1;
  for (const f of Object.values(s.factions)) f.pool = [];
  for (const g of Object.values(s.gens)) if (g.status === 'pool') s.factions[g.fid].pool.push({ name: g.name, trait: g.trait });
  s.armies = s.armies.map(a => ({ ...a, general: { name: s.gens[a.gen]?.name || 'QA General', trait: s.gens[a.gen]?.trait } }));
  delete s.gens; delete s.atlas;
  return s;
}
function raw(d) { return JSON.stringify(d, null, 1); }

function context(initial = new Map(), faults = {}) {
  const saved = new Map(initial), trace = [], errors = [];
  const storage = {
    get length() { return saved.size; },
    key(i) { return [...saved.keys()][i] ?? null; },
    getItem(k) {
      k = String(k);
      if (faults.get?.(k)) { trace.push({ op: 'get-failed', key: k }); throw new Error('SecurityError: synthetic read denial'); }
      const value = saved.get(k) ?? null; trace.push({ op: 'get', key: k, value }); return value;
    },
    setItem(k, value) {
      k = String(k); value = String(value);
      const before = new Map(saved);
      if (faults.set?.(k, value)) { trace.push({ op: 'set-failed', key: k, value, before }); const e = new Error('synthetic quota failure'); e.name = 'QuotaExceededError'; throw e; }
      if (!faults.drop?.(k, value)) saved.set(k, value);
      trace.push({ op: 'set', key: k, value, before });
    },
    removeItem(k) { const before = new Map(saved); saved.delete(String(k)); trace.push({ op: 'remove', key: String(k), before }); },
    clear() { const before = new Map(saved); saved.clear(); trace.push({ op: 'clear', before }); },
  };
  let seed = 211;
  const math = Object.create(Math);
  math.random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const c = vm.createContext({ Math: math, console: { log() {}, warn() {}, error: (...a) => errors.push(a.join(' ')) },
    window: { addEventListener() {} }, localStorage: storage, setTimeout, clearTimeout });
  const scripts = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)];
  assert.ok(scripts.length, 'No production scripts discovered');
  for (const [, file] of scripts) {
    const target = path.resolve(root, file);
    assert.ok(target.startsWith(root + path.sep), 'Only local production scripts are allowed');
    vm.runInContext(fs.readFileSync(target, 'utf8'), c, { filename: file, timeout: 10000 });
  }
  const run = code => vm.runInContext(code, c, { timeout: 10000 });
  return { c, run, saved, trace, errors, faults };
}
function ready(initial, faults) {
  const c = context(initial, faults);
  c.c.qaState = umayyad().S;
  c.run('Game.S = JSON.parse(JSON.stringify(qaState))');
  return c;
}
function core(s) {
  return { scenario: s.scenario, player: s.player, turn: s.turn,
    factions: Object.fromEntries(Object.entries(s.factions).map(([id, f]) => [id, { gold: f.gold, food: f.food }])),
    nodes: s.nodes.map(n => ({ id: n.id, owner: n.owner, pop: n.pop, walls: n.walls, market: n.market, garrison: n.garrison })),
    armies: s.armies.map(a => ({ id: a.id, fid: a.fid, node: a.node, gen: a.gen, regs: a.regs })),
    gens: Object.values(s.gens).map(g => ({ id: g.id, name: g.name, fid: g.fid, rec: g.rec })) };
}
function rejectUnchanged(c, slot, originalKey, bytes) {
  c.run('globalThis.qaPrevious = Game.S; globalThis.qaNormalizeCalls = 0; const qaNormalize = Game.normalizeState; Game.normalizeState = function(...a) { qaNormalizeCalls++; return qaNormalize.apply(this, a); }');
  assert.equal(c.run(`Game.load(${JSON.stringify(slot)})`), null, 'unsupported save must return null');
  assert.equal(c.run('qaNormalizeCalls'), 0, 'unsupported data reached normalization');
  assert.equal(c.run('Game.S === qaPrevious'), true, 'failed load replaced active campaign');
  assert.equal(c.saved.get(originalKey), bytes, 'source save changed');
  assert.equal(c.trace.filter(e => ['set', 'remove', 'clear'].includes(e.op)).length, 0, 'read/rejection mutated storage');
}
// Accept a raw string or exact data object inside a documented backup envelope.
// No hard-coded legacy key: both backup and fail-closed implementations are valid.
function containsOriginal(value, bytes) {
  if (value === bytes) return true;
  if (typeof value === 'string') { try { return containsOriginal(JSON.parse(value), bytes); } catch { return false; } }
  if (!value || typeof value !== 'object') return false;
  try { assert.deepEqual(value, JSON.parse(bytes)); return true; } catch { /* examine an envelope */ }
  return Object.values(value).some(v => containsOriginal(v, bytes));
}
function copies(saved, bytes, source = AUTO) {
  return [...saved].filter(([k, v]) => k !== source && containsOriginal(v, bytes));
}
function protectedThroughout(c, bytes, source = AUTO) {
  for (const e of c.trace) {
    if ((e.op === 'set' && e.key === source && e.value !== bytes && e.before.get(source) === bytes)
      || (e.op === 'remove' && e.key === source && e.before.get(source) === bytes)
      || (e.op === 'clear' && e.before.get(source) === bytes)) {
      assert.ok(copies(e.before, bytes, source).length, 'source overwritten/deleted before any recoverable backup');
    }
  }
  assert.ok(c.saved.get(source) === bytes || copies(c.saved, bytes, source).length, 'original data is no longer recoverable');
}
// Rendering logic smoke tests only; this is not a browser or layout emulator.
function ui(c) {
  c.run(`
    globalThis.qaElements = []; globalThis.qaToasts = []; globalThis.qaModals = [];
    h = function(tag, attrs, ...kids) {
      const el = { tag, attrs: attrs || {}, kids: kids.flat(Infinity).filter(x => x != null && x !== false), style: {},
        append(...xs) { this.kids.push(...xs.flat(Infinity)); }, appendChild(x) { this.kids.push(x); return x; },
        set innerHTML(v) { this.kids = []; this.html = v; }, get innerHTML() { return this.html || ''; },
        setAttribute(k,v) { this.attrs[k]=v; }, remove() {}, querySelector() { return null; } };
      qaElements.push(el); return el;
    };
    icon = () => ''; App.ui = h('div'); App.scene = Object.create(MenuScene.prototype);
    UI.toast = s => qaToasts.push(s); UI.modal = o => { qaModals.push(o); return () => {}; };
    globalThis.qaText = x => x == null ? '' : typeof x === 'object' ? (x.kids || []).map(qaText).join(' ') : String(x);
  `);
}
const tests = [];
function test(group, name, fn) { tests.push({ group, name, fn }); }

test('baseline', 'B01 frozen Phase F Umayyad preserves cities armies commanders and resources', () => {
  const d = umayyad(), bytes = raw(d), c = context(new Map([[AUTO, bytes]]));
  assert.ok(c.run('Game.load()'));
  assert.deepEqual(core(copy(c.run('Game.S'))), core(d.S));
  assert.equal(c.saved.get(AUTO), bytes);
  assert.equal(c.run('Game.save("2")'), true);
  const c2 = context(c.saved);
  assert.ok(c2.run('Game.load("2")'));
  assert.deepEqual(core(copy(c2.run('Game.S'))), core(d.S));
});
test('baseline', 'B02 synthetic v1 Umayyad migrates without deleting original', () => {
  const d = v1(), bytes = raw(d), c = context(new Map([[V1, bytes]]));
  assert.ok(c.run('Game.load()'));
  const s = copy(c.run('Game.S'));
  assert.equal(s.scenario, 'umayyad'); assert.equal(s.turn, d.turn);
  for (const [id, f] of Object.entries(d.factions)) { assert.equal(s.factions[id].gold, f.gold); assert.equal(s.factions[id].food, f.food); }
  for (const n of d.nodes) { const next = s.nodes.find(x => x.id === n.id); assert.ok(next); assert.equal(next.owner, n.owner); assert.equal(next.pop, n.pop); }
  for (const a of d.armies) { const next = s.armies.find(x => x.id === a.id); assert.ok(next); assert.deepEqual(next.regs, a.regs); assert.equal(s.gens[next.gen].name, a.general.name); }
  for (const f of Object.values(d.factions)) for (const g of f.pool) assert.ok(Object.values(s.gens).some(x => x.name === g.name));
  assert.equal(c.saved.get(V1), bytes);
});
test('baseline', 'B03 repeated normalization preserves core Umayyad data', () => {
  const c = context(new Map([[AUTO, raw(umayyad())]])); c.run('Game.load()');
  const before = core(copy(c.run('Game.S')));
  c.run('Game.normalizeState(); Game.normalizeState(); Game.save("1"); Game.load("1")');
  assert.deepEqual(core(copy(c.run('Game.S'))), before);
});
for (const version of [2, 3]) test('baseline', `B09 synthetic older Umayyad schema v${version} preserves core data`, () => {
  const d = umayyad(); d.S.v = version; delete d.S.alerts; delete d.S.scars; delete d.S.chron;
  const c = context(new Map([[AUTO, raw(d)]]));
  assert.ok(c.run('Game.load()')); assert.deepEqual(core(copy(c.run('Game.S'))), core(d.S));
});
for (const [name, mutate] of [
  ['missing metadata', d => { delete d.meta; }],
  ['unknown scenario metadata', d => { d.meta.scenario = 'unknown-qa'; }],
  ['discontinued rec schema', d => { d.S.rec = {}; }],
  ['discontinued cid schema', d => { d.S.cid = 19; }],
]) test('baseline', `B04 safe rejection: ${name}`, () => {
  const d = umayyad(); mutate(d); const bytes = raw(d);
  rejectUnchanged(ready(new Map([[slotKey('1'), bytes]])), '1', slotKey('1'), bytes);
});
test('baseline', 'B05 malformed JSON load alone leaves raw bytes intact', () => {
  const bytes = '{broken:synthetic'; rejectUnchanged(ready(new Map([[AUTO, bytes]])), 'auto', AUTO, bytes);
});
test('baseline', 'B06 quota error on normal save returns false and preserves old bytes', () => {
  const bytes = raw(umayyad()), c = ready(new Map([[AUTO, bytes]]), { set: () => true });
  c.run('Game.S.turn++'); assert.equal(c.run('Game.save()'), false); assert.equal(c.saved.get(AUTO), bytes);
});
test('baseline', 'B07 new Umayyad does not automatically touch Chinese manual slots', () => {
  const bytes = raw(chinese()), initial = new Map(['1', '2', '3'].map(s => [slotKey(s), bytes]));
  const c = context(initial); c.run('Game.newGame("umayyad", "umayyad", "normal")');
  for (const [k, v] of initial) assert.equal(c.saved.get(k), v);
  assert.equal(c.trace.filter(e => ['set', 'remove', 'clear'].includes(e.op) && (e.op === 'clear' || initial.has(e.key))).length, 0);
});
test('baseline', 'B08 empty startup and corrupt v2 metadata render without storage mutation', () => {
  for (const bytes of [null, '{bad', raw({ S: umayyad().S }), raw({ meta: { scenario: 'missing' }, S: umayyad().S })]) {
    const c = context(new Map(bytes ? [[AUTO, bytes]] : [])); ui(c);
    c.run('showMainMenu(); Panels.saves(null)');
    if (bytes) assert.equal(c.saved.get(AUTO), bytes);
    assert.equal(c.trace.filter(e => ['set', 'remove', 'clear'].includes(e.op)).length, 0);
  }
});
for (const slot of ['auto', '1', '2', '3']) test('phase-r', `R01 Chinese ${slot} rejected before normalize with bytes intact`, () => {
  const bytes = raw(chinese()); rejectUnchanged(ready(new Map([[slotKey(slot), bytes]])), slot, slotKey(slot), bytes);
});
test('phase-r', 'R02 v1 Chinese rejected before migrate or normalize', () => {
  const bytes = raw(v1('threeKingdoms')), c = ready(new Map([[V1, bytes]]));
  c.run('globalThis.qaMigrationCalls=0; const qaMigrate=Game.migrateV1; Game.migrateV1=function(...a){qaMigrationCalls++;return qaMigrate.apply(this,a)}');
  rejectUnchanged(c, 'auto', V1, bytes); assert.equal(c.run('qaMigrationCalls'), 0);
});
for (const [name, mutate] of [
  ['metadata Umayyad but state Chinese', d => { d.S.scenario = 'threeKingdoms'; }],
  ['metadata Umayyad but state unknown', d => { d.S.scenario = 'unknown-qa'; }],
  ['missing state scenario', d => { delete d.S.scenario; }],
  ['future version', d => { d.S.v = 999; }],
  ['string version', d => { d.S.v = 'broken'; }],
  ['missing nodes', d => { delete d.S.nodes; }],
  ['missing factions', d => { delete d.S.factions; }],
]) test('phase-r', `R03 reject without replacing active campaign: ${name}`, () => {
  const d = umayyad(); mutate(d); const bytes = raw(d);
  rejectUnchanged(ready(new Map([[slotKey('1'), bytes]])), '1', slotKey('1'), bytes);
});
for (const entry of ['newGame', 'save']) test('phase-r', `R04 Chinese autosave protected before ${entry}`, () => {
  const bytes = raw(chinese()), c = ready(new Map([[AUTO, bytes]]));
  c.run(entry === 'newGame' ? 'Game.newGame("umayyad", "umayyad", "normal")' : 'Game.save()');
  protectedThroughout(c, bytes);
});
for (const mode of ['quota', 'silent-drop', 'read-denied']) test('phase-r', `R05 failed backup (${mode}) cannot overwrite original`, () => {
  const bytes = raw(chinese());
  const faults = mode === 'quota' ? { set: k => k !== AUTO } : mode === 'silent-drop' ? { drop: k => k !== AUTO } : { get: k => k === AUTO };
  const c = ready(new Map([[AUTO, bytes]]), faults);
  c.run('Game.newGame("umayyad", "umayyad", "normal"); Game.save()');
  assert.equal(c.saved.get(AUTO), bytes, 'unsafe progress after unreadable source or failed/unverified backup');
  protectedThroughout(c, bytes);
});
test('phase-r', 'R06 retry and process restart preserve original without duplicate backups', () => {
  const bytes = raw(chinese()), c = ready(new Map([[AUTO, bytes]]));
  c.run('Game.save(); Game.save(); Game.save()'); protectedThroughout(c, bytes);
  const before = copies(c.saved, bytes);
  assert.ok(before.length <= 1, 'duplicate backup copies for one original');
  const c2 = ready(c.saved); c2.run('Game.save(); Game.newGame("umayyad", "umayyad", "normal")');
  protectedThroughout(c2, bytes); assert.equal(copies(c2.saved, bytes).length, before.length);
});
test('phase-r', 'R07 interruption after backup before auto replacement is recoverable on retry', () => {
  const bytes = raw(chinese()), c = ready(new Map([[AUTO, bytes]]), { set: k => k === AUTO });
  c.run('Game.save()'); assert.equal(c.saved.get(AUTO), bytes);
  // Some valid implementations block pending conscious export instead of creating a backup.
  const c2 = ready(c.saved); c2.run('Game.save(); Game.save()'); protectedThroughout(c2, bytes);
  assert.ok(copies(c2.saved, bytes).length <= 1, 'retry created duplicate legacy backups');
});
test('phase-r', 'R08 a second different Chinese autosave cannot destroy the first backup', () => {
  const first = raw(chinese()), c = ready(new Map([[AUTO, first]])); c.run('Game.save()'); protectedThroughout(c, first);
  if (!copies(c.saved, first).length) return; // Fail-closed path retained first original; no migration happened.
  const second = chinese(); second.S.turn = second.meta.turn = 29; second.S.qaSentinel += '-second';
  const bytes = raw(second); c.saved.set(AUTO, bytes); c.trace.length = 0; c.run('Game.save()');
  protectedThroughout(c, bytes); assert.ok(copies(c.saved, first).length, 'second save clobbered first legacy backup');
});
for (const [name, bytes] of [
  ['malformed JSON', '{synthetic-broken'], ['missing metadata', raw({ S: umayyad().S })],
  ['future schema', raw({ ...umayyad(), S: { ...umayyad().S, v: 999 } })],
]) test('phase-r', `R09 new game preserves unreadable/unsupported auto: ${name}`, () => {
  const c = ready(new Map([[AUTO, bytes]])); c.run('Game.newGame("umayyad", "umayyad", "normal")'); protectedThroughout(c, bytes);
});
test('phase-r', 'R10 invalid v2 auto cannot silently fall back to v1 then overwrite v2', () => {
  const bytes = '{synthetic-broken', c = context(new Map([[AUTO, bytes], [V1, raw(v1())]]));
  c.run('if (Game.load()) Game.save()'); protectedThroughout(c, bytes);
});
for (const [name, save] of [
  ['unknown v1 scenario', { ...v1(), scenario: 'missing-qa' }],
  ['v1 missing factions', { ...v1(), factions: undefined }],
]) test('phase-r', `R11 startup metadata guards: ${name}`, () => {
  const bytes = raw(save), c = context(new Map([[V1, bytes]])); ui(c);
  c.run('showMainMenu(); Panels.saves(null)'); assert.equal(c.saved.get(V1), bytes);
});
test('phase-r', 'R12 Chinese save UI explains unsupported status and does not offer resume', () => {
  const bytes = raw(chinese()), c = context(new Map([[AUTO, bytes]])); ui(c);
  c.run('showMainMenu(); Panels.saves(null)');
  assert.equal(c.run('Game.hasSave()'), false, 'Chinese save advertised as resumable');
  const text = c.run('qaText(App.ui) + " " + qaModals.map(m => qaText(m.body)).join(" ")');
  assert.match(text, /غير مدعوم|أزيل|لم تعد|غير متاح|لم يعد/, 'missing unsupported explanation');
  assert.match(text, /لن.*حذف|لن.*فقد|محفوظ|احتياط|تصدير/, 'missing preservation/export explanation');
  assert.equal(c.saved.get(AUTO), bytes);
});
test('phase-r', 'R13 new campaign defaults to Umayyad only', () => {
  const c = context(); ui(c); c.run('newCampaignFlow()');
  const text = c.run('qaText(App.ui)');
  assert.doesNotMatch(text, /الممالك الثلاث|مملكة شو|تساو/);
  const selected = c.run('qaElements.filter(x => /pick on/.test(x.attrs.class || ""))');
  assert.equal(selected.length, 1, 'expected one selected scenario');
  assert.equal(c.run('qaElements.filter(x => /pick on/.test(x.attrs.class || "")).every(x => qaText(x).includes("الأمو"))'), true);
});
test('phase-r', 'R14 stale direct Chinese newGame request cannot replace active state or auto', () => {
  const bytes = raw(umayyad()), c = ready(new Map([[AUTO, bytes]]));
  c.run('globalThis.qaPrevious=Game.S');
  c.run('Game.newGame("threeKingdoms", "shu", "normal")');
  assert.equal(c.run('Game.S === qaPrevious'), true); assert.equal(c.saved.get(AUTO), bytes);
});
test('phase-r', 'R15 failed manual save UI must not claim success', () => {
  const c = ready(new Map(), { set: () => true }); ui(c); c.run('Panels.saves({})');
  assert.ok(c.run('qaElements.some(e => e.tag === "button" && qaText(e) === "احفظ هنا")'), 'manual save control missing');
  c.run('qaElements.find(e => e.tag === "button" && qaText(e) === "احفظ هنا").attrs.onclick()');
  assert.doesNotMatch(c.run('qaToasts.join(" ")'), /حُفظت|تم الحفظ/, 'UI reports success after quota failure');
  assert.equal(c.saved.has(slotKey('1')), false);
});
test('phase-r', 'R16 normalization exception leaves previously active campaign intact', () => {
  const bytes = raw(umayyad()), c = ready(new Map([[slotKey('1'), bytes]]));
  c.run('globalThis.qaPrevious=Game.S; Game.normalizeState=function(){throw new Error("synthetic migration interruption")}');
  try { c.run('Game.load("1")'); } catch (e) { assert.match(e.message, /synthetic migration interruption/); }
  assert.equal(c.run('Game.S === qaPrevious'), true, 'failed normalization replaced active campaign');
  assert.equal(c.saved.get(slotKey('1')), bytes);
});
test('phase-r', 'R17 missing display metadata never renders undefined or NaN', () => {
  const d = umayyad(); delete d.meta.fname; delete d.meta.turn;
  const c = context(new Map([[AUTO, raw(d)]])); ui(c); c.run('showMainMenu(); Panels.saves(null)');
  const text = c.run('qaText(App.ui) + " " + qaModals.map(m => qaText(m.body)).join(" ")');
  assert.doesNotMatch(text, /undefined|NaN/);
});

const selected = tests.filter(t => (group === 'all' || t.group === group) && t.name.includes(filter));
assert.ok(selected.length, 'No tests selected');
const counts = { passed: 0, failed: 0 };
console.log(`Independent save QA | source=${root} | fixture baseline=${frozen._fixture.sourceCommit}`);
for (const t of selected) {
  try { t.fn(); counts.passed++; console.log(`PASS [${t.group}] ${t.name}`); }
  catch (e) { counts.failed++; console.log(`FAIL [${t.group}] ${t.name}\n  ${String(e.message).split('\n')[0]}`); }
}
console.log(`RESULT executed=${selected.length} passed=${counts.passed} failed=${counts.failed} skipped=0`);
console.log('NOT AUTOMATED: physical-device Safari/Chrome, real-owner-save acceptance, actual export/download and legacy-version restore, real crash/storage durability, cross-tab races.');
// Expected Phase F failures remain failures: no xfail, TODO, or exit-code masking.
process.exitCode = counts.failed ? 1 : 0;
