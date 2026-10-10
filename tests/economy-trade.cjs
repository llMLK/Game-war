'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createContext } = require('./harness.cjs');
let passed = 0;
function fresh(scenario = 'umayyad') {
  const ctx = createContext(42);
  if (!ctx.run('!!Game.tradeBreakdown')) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/economy-trade.js'), 'utf8'), ctx);
  ctx.run(`Game.newGame('${scenario}','${scenario === 'umayyad' ? 'umayyad' : 'shu'}','normal')`);
  ctx.read = code => JSON.parse(ctx.run(`JSON.stringify(${code})`));
  return ctx;
}
function network(edges = [['damascus','homs'],['homs','aleppo']], owners = ['umayyad','umayyad','byzantine']) {
  const ctx = fresh();
  ctx.run(`Game.S.armies=[];Game.S.crises=[];Game.sc.edges=${JSON.stringify(edges)};
    Game.S.nodes=Game.S.nodes.filter(n=>['damascus','homs','aleppo'].includes(n.id));
    ['damascus','homs','aleppo'].forEach((id,i)=>Object.assign(Game.node(id),{owner:${JSON.stringify(owners)}[i],loyalty:75,unrest:0,market:1,roads:1,port:1}));
    for(const f of Object.values(Game.S.factions))f.treaty={};
    Game.setStatus('umayyad','byzantine','peace',0);Game.setStatus('umayyad','khazar','peace',0);Game.setStatus('khazar','byzantine','peace',0);
    Game.setTreaty('umayyad','byzantine','trade',true);
    Game.S.route={key:'test',name:'طريق الاختبار',path:['damascus','homs','aleppo'],escort:{},bad:0,dead:false};`);
  return ctx;
}
function test(name, body) { body(); passed++; console.log('PASS ' + name); }

test('treaties pay only for connected usable links, symmetrically and at the existing cap', () => {
  const ctx = network();
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 70);
  assert.equal(ctx.run("Game.tradeIncome('byzantine')"), 70);
  assert.deepEqual(ctx.read("Game.tradeBreakdown('umayyad').partners[0].path"), ['damascus','homs','aleppo']);
  ctx.run("Game.sc.edges=[['damascus','homs']]");
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 0);
  assert.equal(ctx.run("Game.treaty('umayyad','byzantine').trade"), true);
  assert.ok(ctx.read("Game.tradeBreakdown('umayyad').partners[0].reasons").every(x => x.text && x.fix));
});

test('isolated cities reduce income and reconnection restores it without creating money', () => {
  const ctx = network();
  ctx.run("Game.sc.edges=[['homs','aleppo']]");
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 26);
  assert.equal(ctx.run("Game.tradeBreakdown('umayyad').partners[0].share"), .5);
  const gold = ctx.run("Game.f('umayyad').gold");
  for (let i = 0; i < 10; i++) ctx.run("Game.tradeBreakdown('umayyad');Game.routeStatus('umayyad')");
  assert.equal(ctx.run("Game.f('umayyad').gold"), gold);
  ctx.run("Game.sc.edges.push(['damascus','homs'])");
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 70);
});

test('ports are required at both ends of maritime trade, with an actionable cause', () => {
  const ctx = network([['damascus','homs'],['homs','aleppo','water']]);
  ctx.run("Game.node('homs').port=0");
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 0);
  assert.equal(ctx.run("Game.routeSegState('homs','aleppo').cause"), 'port');
  assert.match(ctx.run("Game.routeSegState('homs','aleppo').fix"), /ميناء/);
  ctx.run("Game.node('homs').port=1");
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 70);
});

test('merchant paths can reroute around a disrupted port without changing caravan or movement paths', () => {
  const ctx = network([['damascus','homs','water'],['homs','aleppo'],['damascus','aleppo']]);
  ctx.run("Game.node('homs').port=0");
  assert.equal(ctx.run("Game.tradeBreakdown('umayyad').partners[0].share"), 1);
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').cause"), 'port');
  assert.deepEqual(ctx.read('Game.S.route.path'), ['damascus','homs','aleppo']);
});

test('war, hostile third-party territory, siege and hostile armies interrupt merchant access', () => {
  const ctx = network(undefined, ['umayyad','khazar','byzantine']);
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 52);
  ctx.run("Game.setStatus('umayyad','khazar','war',0)");
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 0);
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').cause"), 'war');
  ctx.run("Game.setStatus('umayyad','khazar','peace',0);Game.S.armies=[{id:-1,fid:'khazar',node:'aleppo',regs:[Game.newReg('spear')],siege:true}]");
  assert.equal(ctx.run("Game.routeSegState('homs','aleppo').cause"), 'siege');
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 0);
  ctx.run("Game.S.armies[0].siege=null;Game.setStatus('khazar','byzantine','war',0)");
  assert.equal(ctx.run("Game.routeSegState('homs','aleppo').cause"), 'hostile');
});

test('sabotage reports an exact remaining duration and automatically recovers at expiry', () => {
  const ctx = network();
  ctx.run("Game.S.turn=5;Game.node('homs').caravanStop=7");
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').cause"), 'sabotage');
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').turns"), 3);
  assert.match(ctx.run("Game.routeSegState('damascus','homs').fix"), /9/);
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 0);
  ctx.run('Game.S.turn=8');
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 70);
});

test('bandit remedies match loyalty thresholds, guards expire, and duplicate causes merge', () => {
  const ctx = network();
  ctx.run("Game.node('homs').loyalty=35;Game.node('homs').unrest=2");
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').cause"), 'bandits');
  assert.match(ctx.run("Game.routeSegState('damascus','homs').fix"), /45/);
  assert.equal(ctx.run("Game.routeCauses('umayyad').length"), 1);
  assert.equal(ctx.run("Game.routeCauses('umayyad')[0].segments.length"), 2);
  assert.equal(ctx.run("Game.escortRoute('umayyad','homs')"), null);
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').ok"), true);
  ctx.run('Game.S.turn+=4');
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').cause"), 'bandits');
});

test('quarantine and world events have temporary contextual explanations', () => {
  const ctx = network();
  ctx.run("Game.S.crises=[{type:'plague',v:{quar:{homs:true}}}]");
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').cause"), 'plague');
  ctx.run("Game.S.crises=[{type:'horde',v:{blockRoute:true,region:['homs'],name:'الغزاة'}}]");
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').cause"), 'event');
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').temporary"), true);
});

test('caravan migration does not falsely shut every treaty trade link in the world', () => {
  const ctx = network();
  ctx.run('Game.S.route.dead=true');
  assert.equal(ctx.run("Game.routeIncome('umayyad')"), 0);
  assert.equal(ctx.run("Game.routeStatus('umayyad').loss"), 38);
  assert.equal(ctx.run("Game.routeSegState('damascus','homs').temporary"), false);
  assert.equal(ctx.run("Game.tradeIncome('umayyad')"), 70);
});

test('changing city ownership changes the recipient, not the meaning of automatic caravans', () => {
  const ctx = network();
  const previous = ctx.run("Game.routeIncome('umayyad')");
  ctx.run("Game.node('homs').owner='byzantine'");
  assert.equal(ctx.run("Game.routeIncome('umayyad')"), previous / 2);
  assert.match(ctx.run("Game.routeStatus('umayyad').ownershipText"), /مالكها/);
  assert.match(ctx.run("Game.routeStatus('umayyad').controlText"), /تلقائية/);
});

test('old atlas routes migrate while preserving guards and permanent state in both scenarios', () => {
  for (const scenario of ['umayyad','threeKingdoms']) {
    const ctx = fresh(scenario);
    const first = ctx.run('Game.S.route.path[0]');
    ctx.run(`Game.S.route.path=['removed-city','${first}'];Game.S.route.escort={'${first}':15};Game.S.route.dead=true;Game.S.route.bad=2;Game.S.route.stops={'removed-city|${first}':'war'};Game.normalizeState()`);
    assert.equal(ctx.run('Game.S.route.path.every((id,i)=>Game.node(id)&&(!i||Game.edge(Game.S.route.path[i-1],id)))'), true);
    assert.equal(ctx.run(`Game.S.route.escort['${first}']`), 15);
    assert.equal(ctx.run('Game.S.route.dead'), true);
    assert.equal(ctx.run('Game.S.route.bad'), 2);
    assert.ok(ctx.run('Game.S.route.migration.text'));
    assert.deepEqual(ctx.read('Game.S.route.stops'), {});
    assert.deepEqual(ctx.errors, []);
  }
});

test('save/load preserves economic route state and reading forecasts never collects trade twice', () => {
  const ctx = fresh();
  ctx.run("Game.S.route.escort={homs:23};Game.S.route.bad=2;Game.node('homs').caravanStop=8;Game.setStatus('umayyad','byzantine','peace',0);Game.setTreaty('umayyad','byzantine','trade',true);Game.save('trade-test')");
  const before = ctx.read("({route:Game.S.route,trade:Game.tradeBreakdown('umayyad'),gold:Game.f('umayyad').gold,stop:Game.node('homs').caravanStop})");
  for (let i = 0; i < 3; i++) { ctx.run("Game.load('trade-test')"); assert.deepEqual(ctx.read("({route:Game.S.route,trade:Game.tradeBreakdown('umayyad'),gold:Game.f('umayyad').gold,stop:Game.node('homs').caravanStop})"), before); }
  assert.deepEqual(ctx.errors, []);
});
console.log(`\nEconomy trade: ${passed} passed.`);
