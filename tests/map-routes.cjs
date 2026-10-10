'use strict';
// Run with: node tests/map-routes.cjs
// These tests exercise the real campaign graph and movement rules without a DOM.
const assert = require('node:assert/strict');
const { createContext } = require('./harness.cjs');
const failures = [];
let passed = 0;

function test(name, body) {
  try { body(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, message: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
const context = createContext(42);
const read = code => JSON.parse(context.run(`JSON.stringify(${code})`));
const fresh = (scenario = 'umayyad') => context.run(`Game.newGame('${scenario}', '${scenario === 'umayyad' ? 'umayyad' : 'shu'}', 'normal');`);
const armyAt = (node = 'tarsus') => context.run(`globalThis.routeArmy = {id: -7, fid:'umayyad', node:'${node}', from:'${node}', gen:null, regs:[Game.newReg('spear')], mp:4, siege:null, mood:null}; routeArmy.mp=Game.mpMax(routeArmy);`);

test('all scenarios have valid, unique, bidirectional graph edges and bounded cities', () => {
  for (const scenario of read('Object.keys(SCENARIOS)')) {
    fresh(scenario);
    const errors = read(`(() => {
      const sc=Game.sc, ids=new Set(), pairs=new Set(), errors=[];
      for(const n of sc.nodes) {
        if(ids.has(n.id)) errors.push('duplicate city '+n.id);
        ids.add(n.id);
        if(!Number.isFinite(n.x)||!Number.isFinite(n.y)||n.x<0||n.y<0||n.x>MW||n.y>MH) errors.push('out of bounds '+n.id);
        if(!TERRAIN[n.terrain]) errors.push('invalid terrain '+n.id);
        if(n.owner!=='neutral'&&!sc.factions[n.owner]) errors.push('invalid owner '+n.id);
      }
      for(const [a,b,kind] of sc.edges) {
        const key=[a,b].sort().join('|');
        if(!ids.has(a)||!ids.has(b)||a===b) errors.push('invalid endpoint '+key);
        if(pairs.has(key)) errors.push('duplicate route '+key);
        pairs.add(key);
        if(kind&&!['pass','water'].includes(kind)) errors.push('invalid route kind '+key);
        if(!Game.edgesOf(a).some(e=>e.to===b)||!Game.edgesOf(b).some(e=>e.to===a)) errors.push('one-way graph '+key);
      }
      return errors;
    })()`);
    assert.deepEqual(errors, [], scenario);
    const diagnostics = read('Game.pathDiagnostics()');
    assert.deepEqual(diagnostics.badEdges, [], scenario);
    assert.deepEqual(diagnostics.dupEdges, [], scenario);
    assert.deepEqual(diagnostics.isolated, [], scenario);
  }
});

test('expanded atlas remains a single connected network including maritime islands', () => {
  fresh();
  const result = read(`(() => {
    const seen=new Set([Game.sc.nodes[0].id]), open=[...seen];
    while(open.length) for(const n of Game.adjAll(open.pop())) if(!seen.has(n)){seen.add(n);open.push(n);}
    return {cities:Game.sc.nodes.length, missing:Game.sc.nodes.filter(n=>!seen.has(n.id)).map(n=>n.id)};
  })()`);
  assert.ok(result.cities >= 60, 'expanded campaign should include its western and southern regions');
  assert.deepEqual(result.missing, []);
});

test('every caravan template follows actual route segments', () => {
  const broken = [];
  for (const scenario of read('Object.keys(SCENARIOS)')) {
    fresh(scenario);
    broken.push(...read(`WORLD_DATA['${scenario}'].routes.flatMap(route=>route.path.slice(1).filter((id,i)=>!Game.edge(route.path[i],id)).map((id)=>route.key+': missing edge into '+id))`).map(value => `${scenario}: ${value}`));
  }
  assert.deepEqual(broken, []);
});

test('western maritime endpoints allow a normal army to embark in both directions', () => {
  fresh();
  const blocked = read(`Game.sc.edges.filter(e=>e[2]==='water').flatMap(([a,b])=>[[a,b],[b,a]].flatMap(([from,to])=>{
    const n=Game.node(from), owner=n.owner; n.owner='umayyad';
    const army={fid:'umayyad',gen:null}; const cost=Game.edgeCost(army,n,Game.node(to),'water'); n.owner=owner;
    return Number.isFinite(cost)?[]:[from+' → '+to+' lacks an embarkation port'];
  }))`);
  assert.deepEqual(blocked, []);
});

test('Tarsus and Tartus are distinct cities and the Cilician pass has two strategic approaches', () => {
  fresh();
  assert.equal(read(`Game.node('tarsus').name`), 'طرسوس');
  assert.equal(read(`Game.node('tartus').name`), 'طرطوس');
  for (const id of ['iconium', 'caesarea']) {
    assert.equal(read(`Game.edge('tarsus','${id}').kind`), 'pass');
    assert.ok(read(`!!Game.edge('${id}','amorium')`));
  }
});

test('Tarsus reaches the enemy pass but cannot skip a hostile checkpoint to Amorium', () => {
  fresh(); armyAt();
  assert.ok(read(`!!Game.reach(routeArmy).iconium`), 'a full turn permits the first mountain pass');
  assert.equal(read(`Game.planMove(routeArmy,'iconium').kind`), 'siege');
  context.run('routeArmy.mp=99;');
  assert.equal(read(`!!Game.reach(routeArmy).amorium`), false, 'extra points never authorize hostile transit');
  const reason = read(`Game.whyNot(routeArmy,'amorium')`);
  assert.equal(reason.kind, 'enemy');
  assert.ok(['iconium', 'caesarea'].includes(reason.node));
});

test('controlling the pass opens the route to Amorium with normal points on the next turn', () => {
  fresh(); armyAt();
  context.run(`Game.node('iconium').owner='umayyad'; routeArmy.node='iconium'; routeArmy.from='tarsus'; routeArmy.mp=Game.mpMax(routeArmy);`);
  assert.ok(read(`!!Game.reach(routeArmy).amorium`));
  assert.equal(read(`Game.planMove(routeArmy,'amorium').kind`), 'siege');
});

test('allied access opens transit generically, while exhausted armies remain stationary', () => {
  fresh(); armyAt();
  context.run(`Game.setStatus('umayyad','byzantine','alliance',0); routeArmy.mp=99;`);
  assert.ok(read(`!!Game.reach(routeArmy).amorium`));
  assert.equal(read(`Game.planMove(routeArmy,'amorium').kind`), 'move');
  context.run('routeArmy.mp=0;');
  assert.deepEqual(read('Game.reach(routeArmy)'), {});
  assert.equal(read(`Game.whyNot(routeArmy,'amorium').kind`), 'mp');
});

test('Tartus has a connected land approach without an accidental forced sea crossing', () => {
  fresh(); armyAt('tartus');
  const path = read(`Game.idealPath(routeArmy,'amorium')`);
  assert.ok(path?.length > 0);
  assert.equal(path.some(step => step.kind === 'water'), false);
  assert.equal(read(`Game.whyNot(routeArmy,'amorium').kind`), 'enemy');
  assert.ok(path.some(step => step.id === 'tarsus'));
});

test('winter mountain passes consume the turn without becoming permanent movement locks', () => {
  fresh(); armyAt();
  context.run(`Game.S.turn=3; routeArmy.mp=Game.mpMax(routeArmy);`);
  const result = read(`({cost:Game.edgeCost(routeArmy,Game.node('tarsus'),Game.node('iconium'),'pass'),mp:routeArmy.mp,reach:Game.reach(routeArmy).iconium})`);
  assert.ok(result.cost > 0);
  assert.ok(result.reach, 'full-movement first-step rule should allow a long mountain pass');
  assert.equal(result.reach.cost, Math.min(result.cost, result.mp));
  context.run('routeArmy.mp=1;');
  assert.equal(read(`!!Game.reach(routeArmy).iconium`), false);
});

assert.deepEqual(context.errors, [], 'campaign should not report hidden runtime errors');
console.log(`\nMap routes: ${passed} passed, ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
