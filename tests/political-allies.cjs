'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { createContext } = require('./harness.cjs');
const checks = [], scenarios = [];
let c;
function setup(seed = 411) {
  c = createContext(seed);
  if (!c.run('typeof Game.alliedContribution === "function"')) c.run(fs.readFileSync(path.join(__dirname, '../js/political-allies.js'), 'utf8'));
  c.run("Game.newGame('umayyad','byzantine','normal')");
}
const run = code => c.run('{' + code + '}');
const read = code => JSON.parse(run('JSON.stringify(' + code + ')'));
async function test(name, fn) { setup(); await fn(); assert.deepEqual(c.errors, []); checks.push(name); console.log('PASS ' + name); }
const localFront = () => run("Game.armiesOf('khazar')[0].node='caesarea';Game.armiesOf('khazar')[1].node='samandar';Game.armiesOf('umayyad').forEach(a=>a.node='damascus');Game.node('tarsus').garrison.forEach(r=>r.men=10);Game.node('tarsus').walls=1;Game.armiesOf('khazar').forEach(a=>a.mp=4)");
(async () => {
  await test('new alliance has no invented contribution; accepting or arriving earns no points', () => {
    localFront();
    assert.equal(run("Game.contribPoints('khazar','umayyad')"), 0);
    assert.ok(run("Game.allySupportPreview('byzantine','khazar','attack','tarsus').ok"));
    const relation = run("Game.rel('byzantine','khazar')");
    assert.ok(run("Game.requestCoord('byzantine','khazar','attack','tarsus').ok"));
    assert.equal(run("Game.rel('byzantine','khazar')"), relation);
    run("Game.armiesOf('khazar')[0].node='tarsus';Game.coordTick()");
    assert.equal(run("Game.contribPoints('khazar','umayyad')"), 0);
  });
  await test('same-turn requests are bounded and survive reload without relation farming', () => {
    localFront();
    run("Game.requestCoord('byzantine','khazar','attack','tarsus');Game.save('slot3')");
    const relation = run("Game.rel('byzantine','khazar')");
    for (let i = 0; i < 5; i++) { run("Game.load('slot3');Game.requestCoord('byzantine','khazar','defend','amorium')"); assert.equal(run('Game.S.coord.length'), 1); assert.equal(run("Game.rel('byzantine','khazar')"), relation); }
  });
  await test('blocked geography and insufficient armies produce concrete refusal', () => {
    run("Game.armiesOf('khazar').forEach(a=>a.node='samandar')");
    assert.equal(run("Game.allySupportPreview('byzantine','khazar','attack','sevilla').ok"), false);
    run("Game.armiesOf('khazar').forEach(a=>a.regs.forEach(r=>r.men=2))");
    const p = read("Game.allySupportPreview('byzantine','khazar','attack','tarsus')");
    assert.equal(p.ok, false); assert.match(p.why, /جيش|قوات/);
  });
  await test('the ally protects its threatened home and cannot be commandeered by defense requests', () => {
    localFront();
    run("Game.node('caesarea').owner='khazar';Game.node('caesarea').garrison=[];Game.armiesOf('umayyad')[0].node='tarsus'");
    assert.equal(run("Game.allyArmyAvailability(Game.armiesOf('khazar')[0]).ok"), false);
    assert.equal(run("Game.allySupportPreview('byzantine','khazar','defend','amorium').ok"), false);
  });
  await test('exhausted available armies are not sent on new allied expeditions', () => {
    localFront();
    run("Game.armiesOf('khazar').forEach(a=>a.ready={...Game.readyOf(a),fat:99,mor:5,coh:5,sup:5,ammo:0})");
    assert.equal(run("Game.allySupportPreview('byzantine','khazar','attack','tarsus').ok"), false);
  });
  await test('allied siege reinforcement uses existing movement and preserves siege age', async () => {
    localFront();
    run("const a=Game.armiesOf('byzantine')[1];a.node='tarsus';a.siege={turns:3,from:'caesarea'};Game.node('tarsus').siegeStart=0;Game.S.turn=3");
    const p = read("Game.planMove(Game.armiesOf('khazar')[0],'tarsus')");
    assert.equal(p.kind, 'siege'); assert.equal(p.alliedSiege, 'byzantine');
    const before = run("Game.readyOf(Game.armiesOf('khazar')[0]).fat");
    assert.ok((await run("Game.executeMove(Game.armiesOf('khazar')[0],'tarsus')")).ok);
    assert.ok(run("Game.armiesOf('khazar')[0].siege")); assert.equal(run("Game.node('tarsus').siegeStart"), 0);
    assert.ok(run("Game.readyOf(Game.armiesOf('khazar')[0]).fat") > before);
    assert.equal(run("Game.contribPoints('khazar','umayyad')"), 0);
  });
  await test('siege contribution requires real supply attrition and cannot multiply by army splitting', () => {
    localFront();
    run("Game.f('khazar').gold=10000;Game.f('khazar').food=300;for(const a of Game.armiesOf('khazar')){a.node='tarsus';a.siege={turns:0,from:'caesarea'}};Game.node('tarsus').stores=5;Game.endRound()");
    assert.equal(run("Game.alliedContribution('khazar','umayyad').sieges"), 1);
    assert.equal(run("Game.alliedContribution('khazar','umayyad').events.filter(e=>e.kind==='siege').length"), 1);
    assert.equal(run("Game.node('tarsus').stores"), 4);
  });
  await test('legacy contribution migrates factual casualties and captures without fabricated aid/siege evidence', () => {
    run("const w=Game.warRec('byzantine','umayyad',true);delete w.contributions;Object.assign(w.st.byzantine,{kills:33,battles:2,won:1,took:['tarsus'],sieges:100,aid:5000})");
    const x = read("Game.alliedContribution('byzantine','umayyad')");
    assert.equal(x.damage, 33); assert.equal(x.battles, 2); assert.equal(x.captures.length, 1); assert.equal(x.sieges, 0); assert.equal(x.aid, 0);
  });
  await test('mixed allied battle records actual unit damage and loss separately by faction', async () => {
    run("const a=Game.armiesOf('umayyad')[0],d=Game.armiesOf('byzantine')[1],h=Game.armiesOf('khazar')[0];a.node='tarsus';d.node='caesarea';h.node='caesarea';Game.node('caesarea').garrison=[];Game.node('caesarea').walls=0;globalThis.enc=Game.makeEnc('assault',[a],'caesarea');globalThis.out=Game.autoResolve(enc)");
    const evidence = read('out.alliedEvidence');
    assert.ok(evidence.some(e => e.fid === 'byzantine')); assert.ok(evidence.some(e => e.fid === 'khazar'));
    await run('Game.finishEncounter(enc,out)');
    for (const fid of ['byzantine', 'khazar']) {
      const p = evidence.find(e => e.fid === fid), contribution = read(`Game.alliedContribution('${fid}','umayyad')`);
      assert.equal(contribution.damage, p.damage); assert.equal(contribution.lost, p.lost); assert.equal(contribution.battles, 1); assert.equal(contribution.defenses, 1);
    }
    scenarios.push({ name: 'allied defense against an actual simulated assault', result: read('out.report.verdict'), allies: ['byzantine', 'khazar'].map(fid => ({ fid, ...read(`Game.alliedContribution('${fid}','umayyad')`) })) });
  });
  await test('contribution survives save/load; settled wars retain their effort for peace comparison', () => {
    run("const w=Game.warRec('byzantine','umayyad',true);w.st.byzantine.kills=100;w.st.byzantine.battles=1;Game.alliedContribution('byzantine','umayyad');Game.save('slot3')");
    const before = read("Game.alliedContribution('byzantine','umayyad')");
    run("Game.load('slot3')"); assert.deepEqual(read("Game.alliedContribution('byzantine','umayyad')"), before);
    run("Game.setStatus('byzantine','umayyad','peace',8)"); assert.equal(run("Game.contribPoints('byzantine','umayyad')"), before.points);
  });
  await test('peace contribution feedback and shared spoils persist and can only pay once', () => {
    run("Game.warRec('khazar','umayyad',true).st.khazar.kills=120;Game.warRec('byzantine','umayyad',true).st.byzantine.kills=120;Game.f('byzantine').gold=1000;Game.makePeace('byzantine','umayyad',8);Game.resolveAlliedPeace('byzantine','umayyad',{payer:'umayyad',gold:600});Game.save('slot3')");
    assert.ok(run('Game.spoilsTo.cut > 0')); const cut = run('Game.spoilsTo.cut');
    run("Game.load('slot3')"); assert.equal(run('Game.spoilsTo.cut'), cut);
    const gold = run("Game.f('khazar').gold"); run('Game.shareSpoils(true);Game.shareSpoils(true)'); assert.equal(run("Game.f('khazar').gold"), gold + cut);
    run("Game.save('slot3');Game.load('slot3');Game.resolveAlliedPeace('byzantine','umayyad',{payer:'umayyad',gold:600});Game.shareSpoils(true)"); assert.equal(run("Game.f('khazar').gold"), gold + cut);
    assert.equal(run('Game.spoilsTo'), null);
  });
  await test('independent military dispatch performs a useful common-front action with limited forces', async () => {
    localFront();
    const before = run("Game.contribPoints('khazar','umayyad')");
    const options = read("Game.alliedSupportOptions('khazar')"); assert.ok(options.length > 0);
    await run("CampaignAI.military('khazar')");
    assert.ok(run("Game.armiesOf('khazar').some(a=>a.node==='tarsus'&&a.siege)"));
    assert.equal(run("Game.contribPoints('khazar','umayyad')"), before);
    scenarios.push({ name: 'limited allied force common-front dispatch', options, armies: read("Game.armiesOf('khazar').map(a=>({id:a.id,node:a.node,siege:!!a.siege}))"), contributionBeforeBattle: before });
  });
  fs.mkdirSync(path.join(__dirname, '../artifacts/politics'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../artifacts/politics/allies-results.json'), JSON.stringify({ passed: checks.length, checks, scenarios }, null, 2));
  console.log(`${checks.length} allied-action checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
