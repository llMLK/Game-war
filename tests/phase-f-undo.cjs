'use strict';
const assert = require('node:assert/strict');
const { createContext } = require('./harness.cjs');

// A tiny DOM exercises the real Undo/UndoBar event handlers without a browser.
class Element {
  constructor(tag, attrs = {}) { this.tag = tag; this.attrs = attrs || {}; this.children = []; this.hidden = !!this.attrs.hidden; this.events = {}; this.dataset = {}; this.style = {}; for (const [key, value] of Object.entries(this.attrs)) if (key.startsWith('on')) this.events[key.slice(2)] = value; }
  append(...children) { for (const child of children.flat()) { if (child == null) continue; this.children.push(child); if (typeof child === 'object') child.parent = this; } }
  appendChild(child) { this.append(child); return child; }
  contains(child) { return this === child || this.children.some(node => node && typeof node === 'object' && node.contains?.(child)); }
  set innerHTML(value) { this.children = []; this.html = value; }
  get innerHTML() { return this.html || ''; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
}
const c = createContext(708), run = code => c.run('{' + code + '}'), checks = [];
c.document = { body: new Element('body') };
c.element = (tag, attrs, ...children) => { const el = new Element(tag, attrs); el.append(...children); return el; };
run("h = element; icon = name => element('svg', { name }); App.ui = document.body; App.scene = { refresh() {} }; UI.toast = () => {}; Sheets.render = () => {};");
function fresh() { run("Game.newGame('umayyad', 'umayyad', 'normal'); Undo.clear(); globalThis.undone = 0;"); }
function push(label = 'فعل عادي') { run(`Undo.push({ label: ${JSON.stringify(label)}, undo() { undone++; } });`); }
function dismiss() { run('UndoBar.el.children[2].events.click({ stopPropagation() {} });'); }
function test(name, fn) { fresh(); fn(); assert.deepEqual(c.errors, []); checks.push(name); console.log('PASS ' + name); }

test('X keeps the undo stack intact and remains dismissed through 25 UI shows', () => {
  push(); dismiss();
  assert.equal(run('Undo.stack.length'), 1); assert.equal(run('undone'), 0);
  for (let i = 0; i < 25; i++) { run('UndoBar.show()'); assert.equal(run('UndoBar.el.hidden'), true, 'refresh ' + (i + 1) + ' resurrected a dismissed notification'); }
});
test('a genuine new same-turn action shows, but undoing it cannot revive an older dismissed action', () => {
  push('الأول'); const first = run('Undo.top().undoToken'); dismiss(); push('الثاني');
  assert.equal(run('UndoBar.el.hidden'), false); assert.ok(run('Undo.top().undoToken') > first);
  run('Undo.run()'); assert.equal(run('undone'), 1); assert.equal(run('Undo.stack.length'), 1); assert.equal(run('UndoBar.el.hidden'), true);
  run('Undo.run()'); assert.equal(run('undone'), 2); assert.equal(run('Undo.stack.length'), 0);
});
test('distinct dismissals survive revealing older entries and token IDs are never reused', () => {
  push('الأول'); const first = run('Undo.top().undoToken'); dismiss(); push('الثاني'); dismiss(); push('الثالث');
  run('Undo.run()'); assert.equal(run('UndoBar.el.hidden'), true); run('Undo.run()'); assert.equal(run('UndoBar.el.hidden'), true);
  run('Undo.clear()'); push('الرابع'); assert.ok(run('Undo.top().undoToken') > first + 2); assert.equal(run('UndoBar.el.hidden'), false);
});
test('the 12-action cap prunes discarded dismissal identities without reviving retained entries', () => {
  const ids = []; for (let i = 0; i < 30; i++) { push('فعل ' + i); ids.push(run('Undo.top().undoToken')); dismiss(); }
  assert.equal(run('Undo.stack.length'), 12); assert.equal(run('Undo.dismissed.size'), 12); assert.equal(run(`Undo.dismissed.has(${ids[0]})`), false);
  for (let i = 0; i < 12; i++) { run('Undo.run()'); assert.equal(run('UndoBar.el.hidden'), true); }
  assert.equal(run('undone'), 12); assert.equal(run('Undo.dismissed.size'), 0);
});
test('invalidating a newer action does not resurrect a dismissed valid older action', () => {
  push('الأقدم'); dismiss(); run("globalThis.actionValid = true; Undo.push({ label: 'الأحدث', valid: () => actionValid, undo() { undone++; } }); actionValid = false; UndoBar.show();");
  assert.equal(run('Undo.stack.length'), 1); assert.equal(run('UndoBar.el.hidden'), true); assert.equal(run('undone'), 0);
});
test('clear resets only Undo UI state and a new action can notify immediately', () => {
  push(); dismiss(); const state = run('JSON.stringify(Game.S)'), token = run('Undo.top().undoToken'); run('Undo.clear()');
  assert.equal(run('Undo.stack.length'), 0); assert.equal(run('Undo.dismissed.size'), 0); assert.equal(run('UndoBar.el.hidden'), true); assert.equal(run('JSON.stringify(Game.S)'), state);
  push(); assert.ok(run('Undo.top().undoToken') > token); assert.equal(run('UndoBar.el.hidden'), false);
});
test('advancing the turn invalidates UI generation and never restores previous-turn actions', () => {
  push(); dismiss(); run('Game.S.turn++; UndoBar.show()'); assert.equal(run('Undo.stack.length'), 0); assert.equal(run('UndoBar.el.hidden'), true);
  push(); assert.equal(run('UndoBar.el.hidden'), false); assert.equal(run('Undo.top().turn'), run('Game.S.turn'));
});
test('save/load and a new campaign discard closure-bound undo entries without changing save data', () => {
  push(); dismiss(); run("Game.save('3'); Game.load('3')"); assert.equal(run('Undo.stack.length'), 0); assert.equal(run('Undo.dismissed.size'), 0); assert.equal(run('UndoBar.el.hidden'), true);
  push(); run("Game.newGame('umayyad', 'umayyad', 'normal')"); assert.equal(run('Undo.stack.length'), 0); assert.equal(run('UndoBar.el.hidden'), true);
  assert.equal(run('Object.keys(Game.S).some(key => /undo/i.test(key))'), false);
});
test('a failed load preserves the active campaign, undo stack and dismissal identities', () => {
  push(); dismiss(); const state = run('Game.S'), token = run('Undo.top().undoToken');
  assert.equal(run("Game.load('missing-phase-f-slot')"), null); assert.equal(run('Game.S'), state); assert.equal(run('Undo.top().undoToken'), token); assert.equal(run('Undo.stack.length'), 1);
  for (let i = 0; i < 20; i++) run('UndoBar.show()'); assert.equal(run('UndoBar.el.hidden'), true);
  push('فعل بعد فشل التحميل'); assert.equal(run('UndoBar.el.hidden'), false);
});
test('refresh preserves a single DOM bar and stable accessible buttons, including during pointer activation', () => {
  push(); const el = run('UndoBar.el'), undoButton = el.children[1], closeButton = el.children[2];
  for (let i = 0; i < 25; i++) run('UndoBar.show()');
  assert.equal(run('UndoBar.el'), el); assert.equal(el.children[1], undoButton); assert.equal(el.children[2], closeButton);
  assert.ok(undoButton.attrs['aria-label']); assert.ok(closeButton.attrs['aria-label']);
  let stopped = false; closeButton.events.click({ stopPropagation() { stopped = true; } }); assert.equal(stopped, true); assert.equal(run('UndoBar.el.hidden'), true);
  push('فعل جديد'); let undoStopped = false; undoButton.events.click({ stopPropagation() { undoStopped = true; } }); assert.equal(undoStopped, true); assert.equal(run('undone'), 1);
});
test('real construction Undo still refunds correctly after dismissal and newer action Undo', () => {
  run("Game.f('umayyad').gold = 5000; globalThis.city = Game.node('damascus'); globalThis.goldBefore = Game.f('umayyad').gold; globalThis.buildErr = Game.buildU('umayyad', city, 'market');");
  assert.equal(run('buildErr'), null); assert.ok(run('city.work')); dismiss(); push('لاحق'); run('Undo.run()'); assert.equal(run('UndoBar.el.hidden'), true);
  run('Undo.run()'); assert.equal(run('city.work'), null); assert.equal(run("Game.f('umayyad').gold"), run('goldBefore')); assert.equal(run('Undo.stack.length'), 0);
});
test('real recruitment stays undoable after X and restores soldiers, manpower and gold', () => {
  run("Game.f('umayyad').gold=5000;globalThis.recruitArmy=Game.armiesOf('umayyad').find(a=>!Game.canRecruit('umayyad',Game.node(a.node),'spear',a.id));globalThis.recruitCity=Game.node(recruitArmy.node);globalThis.recruitBefore=JSON.stringify({gold:Game.f('umayyad').gold,manpower:recruitCity.manpower,regs:recruitArmy.regs});globalThis.recruitErr=Game.recruitU('umayyad',recruitCity,'spear',recruitArmy.id);");
  assert.equal(run('recruitErr'), null); dismiss(); for (let i=0;i<25;i++) run('UndoBar.show()'); assert.equal(run('UndoBar.el.hidden'), true); assert.equal(run('Undo.stack.length'), 1); run('Undo.run()');
  assert.equal(run("JSON.stringify({gold:Game.f('umayyad').gold,manpower:recruitCity.manpower,regs:recruitArmy.regs})"), run('recruitBefore'));
});
console.log('PASS ' + checks.length + ' Phase F Undo checks');
