'use strict';
// DOM-free map camera and saved-atlas migration regressions.
// Browser hit testing and real CSS occlusion are covered by map-preview.cjs.
const assert = require('node:assert/strict');
const { createContext } = require('./harness.cjs');
const c = createContext(98), failures = [];
let passed = 0;
const read = code => JSON.parse(c.run(`JSON.stringify(${code})`));
const fresh = scenario => c.run(`Game.newGame('${scenario}','${scenario === 'umayyad' ? 'umayyad' : 'shu'}','normal');`);
const viewports = [[1440,900],[1024,768],[844,390],[390,844],[360,740],[320,568]];
const oldWestIds = ['constantinople','nicaea','amorium','ancyra','caesarea','trebizond','tarsus','malatya','antioch','aleppo','damascus','palmyra','raqqa','mosul','kufa','dvin','tiflis','cherson','derbent','balanjar','samandar','atil'];
function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); passed++; }
  catch (e) { failures.push({ name, message:e.message }); console.error(`FAIL ${name}: ${e.message}`); }
}
function setupCamera(w, h, sheet) {
  // Measured-layout-shaped fixtures: landscape side panel, portrait bottom sheet.
  const portrait = h > w;
  const top = portrait ? 124 : 112;
  const bottom = portrait ? (sheet ? Math.round(h * .44) : 68) : 64;
  const right = sheet && !portrait ? Math.min(320, Math.round(w * .39)) : 0;
  c.run(`App.W=${w}; App.H=${h}; globalThis.cameraScene=Object.create(CampaignScene.prototype); cameraScene.cam=new Camera(MW,MH); cameraScene.cam.safeFrame=true; cameraScene.cam.padTop=${top}; cameraScene.cam.padBottom=${bottom}; cameraScene.cam.padRight=${right}; cameraScene.cam.padLeft=0; cameraScene.updatePads=()=>{}; cameraScene.fitCam(false);`);
}

test('world and screen transforms round-trip at every supported viewport and zoom', () => {
  for (const scenario of ['umayyad','threeKingdoms']) {
    fresh(scenario);
    for (const [w,h] of viewports) for (const sheet of [false,true]) {
      setupCamera(w,h,sheet);
      const errors = read(`(() => {
        const errors=[], cam=cameraScene.cam;
        for(const z of [cam.minZ,1.45,cam.maxZ]) {
          cam.z=z;
          for(const p of [[0,0],[MW,MH],[MW/2,MH/2],[-25,MH+25]]) {
            const s=cam.toScreen(...p), q=cam.toWorld(s.x,s.y);
            if(Math.abs(q.x-p[0])>1e-7||Math.abs(q.y-p[1])>1e-7) errors.push(p.join(',')+' z='+z);
          }
        }
        return errors;
      })()`);
      assert.deepEqual(errors, [], `${scenario} ${w}x${h} sheet=${sheet}`);
    }
  }
});

test('every settlement can be focused inside the unobstructed frame at all zoom levels', () => {
  let count = 0;
  for (const scenario of ['umayyad','threeKingdoms']) {
    fresh(scenario);
    for (const [w,h] of viewports) for (const sheet of [false,true]) {
      setupCamera(w,h,sheet);
      const result = read(`(() => {
        const failures=[], cam=cameraScene.cam, v=cameraScene.visCenter();let count=0;
        for(const z of [cam.minZ,1.45,cam.maxZ]) for(const n of Game.S.nodes) {
          cam.z=z; cam.x=n.x-(v.x-App.W/2)/z; cam.y=n.y-(v.y-App.H/2)/z;cam.clamp();count++;
          if(!cameraScene.inView(n.x,n.y,12))failures.push(n.id+' z='+z.toFixed(3));
        }
        return {failures,count};
      })()`);
      count += result.count;
      assert.deepEqual(result.failures, [], `${scenario} ${w}x${h} sheet=${sheet}`);
    }
  }
  assert.ok(count >= 3000, 'exercise all cities instead of only capital positions');
});

test('camera clamps finite coordinates at all extreme bounds and pan directions', () => {
  for (const scenario of ['umayyad','threeKingdoms']) {
    fresh(scenario);
    for (const [w,h] of viewports) {
      setupCamera(w,h,true);
      const errors = read(`(() => {
        const cam=cameraScene.cam, errors=[];
        for(const z of [cam.minZ,1.45,cam.maxZ])for(const x of [-1e9,1e9])for(const y of [-1e9,1e9]) {
          cam.z=z;cam.x=x;cam.y=y;cam.clamp();
          const a={x:cam.x,y:cam.y};cam.clamp();
          if(!Number.isFinite(cam.x)||!Number.isFinite(cam.y)||cam.x!==a.x||cam.y!==a.y)errors.push('non-finite or non-idempotent');
          cam.pan(x,y); const center=cameraScene.visCenter(), p=cam.toWorld(center.x,center.y);
          if(!Number.isFinite(p.x)||!Number.isFinite(p.y))errors.push('pan failed');
        }
        return errors;
      })()`);
      assert.deepEqual(errors, [], `${scenario} ${w}x${h}`);
    }
  }
});

test('zoom keeps the finger anchor stable whenever the map boundary does not constrain it', () => {
  let checks = 0;
  for (const scenario of ['umayyad','threeKingdoms']) {
    fresh(scenario);
    for (const [w,h] of viewports) for (const sheet of [false,true]) {
      setupCamera(w,h,sheet);
      const result = read(`(() => {
        const cam=cameraScene.cam, v=cameraScene.visCenter(), errors=[];let checked=0;
        for(const factor of [1.15,1.4,.9])for(const d of [[0,0],[25,20],[-25,-20]]) {
          cam.z=2;cam.x=MW/2-(v.x-App.W/2)/cam.z;cam.y=MH/2-(v.y-App.H/2)/cam.z;cam.clamp();
          const sx=v.x+d[0],sy=v.y+d[1],before=cam.toWorld(sx,sy);
          const trial=new Camera(MW,MH);Object.assign(trial,cam);
          trial.z=clamp(cam.z*factor,cam.minZ,cam.maxZ);
          const shifted=trial.toWorld(sx,sy);trial.x+=before.x-shifted.x;trial.y+=before.y-shifted.y;
          const raw={x:trial.x,y:trial.y};trial.clamp();
          if(Math.abs(trial.x-raw.x)>1e-7||Math.abs(trial.y-raw.y)>1e-7)continue;
          cam.zoomAt(sx,sy,factor);const after=cam.toWorld(sx,sy);checked++;
          if(Math.hypot(after.x-before.x,after.y-before.y)>1e-7)errors.push('anchor drift '+factor);
        }
        return {errors,checked};
      })()`);
      checks += result.checked;
      assert.deepEqual(result.errors, [], `${scenario} ${w}x${h} sheet=${sheet}`);
    }
  }
  assert.ok(checks >= 100, 'anchor preservation must be exercised, not entirely skipped');
});

test('resize preserves the camera location and zoom when they remain legal', () => {
  for (const scenario of ['umayyad','threeKingdoms']) {
    fresh(scenario);
    setupCamera(390,844,false);
    const result = read(`(() => {
      const cam=cameraScene.cam;cam.z=2.8;cam.x=MW/2;cam.y=MH/2;cam.clamp();
      const before={x:cam.x,y:cam.y,z:cam.z};App.W=844;App.H=390;cam.padTop=90;cam.padBottom=64;cameraScene.fitCam(true);
      return {before,after:{x:cam.x,y:cam.y,z:cam.z}};
    })()`);
    assert.deepEqual(result.after, result.before, scenario);
  }
});

function prepareOld(scenario) {
  fresh(scenario);
  c.run(`Game.S.turn=23;Game.f(Game.S.player).gold=997;Game.f(Game.S.player).food=71;Game.S.v=3;delete Game.S.atlas;`);
  if (scenario === 'umayyad') c.run(`Game.S.nodes=Game.S.nodes.filter(n=>${JSON.stringify(oldWestIds)}.includes(n.id));Game.S.armies=Game.S.armies.filter(a=>Game.node(a.node));`);
  c.run(`Game.S.nodes.forEach((n,i)=>{n.x=80+i*20;n.y=120+i*9;});`);
}

test('legacy 22-city western save expands to the atlas without resetting armies, turn or conquered cities', () => {
  prepareOld('umayyad');
  c.run(`Object.assign(Game.node('tarsus'),{owner:'byzantine',pop:13731,market:2,port:1,loyalty:31,manpower:161,capturedTurn:9});`);
  const before = read(`({turn:Game.S.turn,gold:Game.f('umayyad').gold,food:Game.f('umayyad').food,armies:Game.S.armies.map(a=>({id:a.id,node:a.node,gen:a.gen,mp:a.mp,regs:a.regs}))})`);
  c.run(`Game.save('2');Game.S=null;Game.load('2');`);
  const after = read(`({turn:Game.S.turn,gold:Game.f('umayyad').gold,food:Game.f('umayyad').food,armies:Game.S.armies.map(a=>({id:a.id,node:a.node,gen:a.gen,mp:a.mp,regs:a.regs}))})`);
  assert.deepEqual(after,before);
  assert.equal(read('Game.S.nodes.length'), read('SCENARIOS.umayyad.nodes.length'));
  assert.deepEqual(read(`((n)=>({owner:n.owner,pop:n.pop,market:n.market,port:n.port,loyalty:n.loyalty,manpower:n.manpower,capturedTurn:n.capturedTurn}))(Game.node('tarsus'))`),{owner:'byzantine',pop:13731,market:2,port:1,loyalty:31,manpower:161,capturedTurn:9});
  assert.deepEqual(read(`Game.S.nodes.filter(n=>{const d=Game.sc.nodes.find(d=>d.id===n.id);return n.x!==d.x||n.y!==d.y;}).map(n=>n.id)`),[]);
});

test('legacy 20-city Three Kingdoms save keeps its city set, units and progression', () => {
  prepareOld('threeKingdoms');
  const before = read(`({ids:Game.S.nodes.map(n=>n.id),turn:Game.S.turn,gold:Game.f('shu').gold,armies:Game.S.armies.map(a=>({id:a.id,node:a.node,gen:a.gen,regs:a.regs}))})`);
  c.run(`Game.save('2');Game.S=null;Game.load('2');`);
  assert.deepEqual(read(`({ids:Game.S.nodes.map(n=>n.id),turn:Game.S.turn,gold:Game.f('shu').gold,armies:Game.S.armies.map(a=>({id:a.id,node:a.node,gen:a.gen,regs:a.regs}))})`),before);
  assert.equal(before.ids.length,20);
});

test('atlas expansion never revives an eliminated state through newly added cities', () => {
  prepareOld('umayyad');
  c.run(`Game.f('byzantine').alive=false;Game.S.armies=Game.S.armies.filter(a=>a.fid!=='byzantine');for(const n of Game.S.nodes)if(n.owner==='byzantine')n.owner='neutral';Game.save('2');Game.S=null;Game.load('2');`);
  assert.equal(read(`Game.f('byzantine').alive`),false);
  assert.deepEqual(read(`Game.S.nodes.filter(n=>n.owner==='byzantine').map(n=>n.id)`),[]);
  assert.deepEqual(read(`Game.S.nodes.filter(n=>!Game.f(n.owner)).map(n=>n.id)`),[]);
});

test('existing expanded-atlas save retains historical ownership instead of replaying starting borders', () => {
  fresh('umayyad');
  c.run(`Game.S.turn=41;Game.node('jerusalem').owner='byzantine';Game.node('jerusalem').loyalty=47;Game.save('2');Game.S=null;Game.load('2');`);
  assert.equal(read('Game.S.turn'),41);
  assert.equal(read(`Game.node('jerusalem').owner`),'byzantine');
  assert.equal(read(`Game.node('jerusalem').loyalty`),47);
  assert.equal(read('Game.S.nodes.length'),66);
});

test('legacy active caravan routes migrate to valid atlas segments without erasing their state', () => {
  prepareOld('umayyad');
  c.run(`Game.S.route={key:'incense',name:'طريق البخور',path:['kufa','palmyra','damascus','antioch'],bad:2,dead:false,escort:{damascus:27}};Game.save('2');Game.S=null;Game.load('2');`);
  assert.deepEqual(read(`Game.S.route.path.slice(1).filter((id,i)=>!Game.edge(Game.S.route.path[i],id))`),[]);
  assert.equal(read('Game.S.route.key'),'incense');
  assert.equal(read('Game.S.route.dead'),false);
  assert.equal(read('Game.S.route.bad'),2);
  assert.equal(read('Game.S.route.escort.damascus'),27);
});

test('caravan status rejects nonexistent graph segments even between peaceful cities', () => {
  fresh('umayyad');
  assert.equal(read(`!!Game.edge('damascus','mecca')`),false);
  const missing = read(`Game.routeSegState('damascus','mecca')`);
  assert.equal(missing.ok,false,'a geographic gap must never generate caravan income');
  assert.ok(missing.cause && missing.text,'the unavailable segment needs an explanation');
  assert.equal(read(`Game.routeSegState('antioch','tarsus').ok`),true,'valid peaceful segments must remain open');
});

test('existing legacy harbor cities gain atlas embarkation ports when old ports were zero or absent', () => {
  prepareOld('umayyad');
  const harbors = read(`Game.sc.nodes.filter(d=>d.port>0&&Game.node(d.id)).map(d=>d.id)`);
  const inland = read(`Game.sc.nodes.find(d=>!d.port&&Game.node(d.id)).id`);
  assert.ok(harbors.length>=3,'exercise several existing coastal cities');
  c.run(`globalThis.migrationHarbors=${JSON.stringify(harbors)};migrationHarbors.forEach((id,i)=>{const n=Game.node(id);if(i%2)delete n.port;else n.port=0;});Game.node('${inland}').port=0;Game.save('2');Game.S=null;Game.load('2');`);
  for (const id of harbors) {
    assert.ok(read(`Game.node('${id}').port`)>=read(`Game.sc.nodes.find(n=>n.id==='${id}').port`),`${id} must support the atlas harbor connection`);
  }
  assert.equal(read(`Game.node('${inland}').port`),0,'migration must follow atlas definitions, not grant ports to every old city');
  assert.deepEqual(read(`Game.sc.edges.filter(e=>e[2]==='water').flatMap(([a,b])=>[[a,b],[b,a]].flatMap(([from,to])=>{const n=Game.node(from),owner=n.owner;n.owner='umayyad';const cost=Game.edgeCost({fid:'umayyad',gen:null},n,Game.node(to),'water');n.owner=owner;return Number.isFinite(cost)?[]:[from+' → '+to];}))`),[],'migrated saves need maritime embarkation in both directions');
});

assert.deepEqual(c.errors,[], 'no hidden runtime errors during camera or migration checks');
console.log(`\nCamera and migration: ${passed} passed, ${failures.length} failed.`);
if(failures.length)process.exitCode=1;
