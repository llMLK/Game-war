'use strict';
// Focused verification of the last contribution UI change and real siege negotiation controls.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let browser;
(async () => {
  const out = path.resolve(__dirname, '../artifacts/politics'), checks = [], errors = [];
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  async function start() {
    await page.evaluate(() => {
      document.querySelectorAll('.modal-layer').forEach(e => e.remove());
      Game.newGame('umayyad', 'umayyad', 'normal'); Game.normalizeState();
      Game.f('umayyad').gold = 4000; Game.f('byzantine').gold = 4000;
      const s = new CampaignScene(); s.introShown = true; App.setScene(s);
      if (document.getElementById('toast')) document.getElementById('toast').hidden = true;
    });
  }
  async function tap(target) { await target.scrollIntoViewIfNeeded(); await target.tap(); }
  async function check(name, w, h, selector) {
    const report = await page.locator(selector).last().evaluate(el => {
      const r = el.getBoundingClientRect(), body = el.querySelector('.modal-body,.sheet-body') || el;
      return { fits: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        overflow: body.scrollWidth > body.clientWidth + 2, rtl: getComputedStyle(el).direction === 'rtl' };
    });
    assert.ok(report.fits && !report.overflow && report.rtl, JSON.stringify(report));
    await page.screenshot({ path: path.join(out, `${name}-${w}x${h}.png`) }); return report;
  }
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844], [360, 740], [320, 568], [844, 390], [568, 320]]) {
    await page.setViewportSize({ width: w, height: h }); await start(); const result = { viewport: [w, h] };
    await page.evaluate(() => {
      Game.makePeace('umayyad', 'byzantine', 8); Game.makeAlliance('umayyad', 'byzantine');
      Game.setStatus('umayyad', 'khazar', 'war', 0); Game.setStatus('byzantine', 'khazar', 'war', 0);
      Game.f('byzantine').rel.umayyad = 60; Game.f('umayyad').rel.byzantine = 60;
      Game.armiesOf('byzantine')[1].node = 'caesarea';
      const threat = Game.armiesOf('khazar')[0]; threat.node = 'tarsus';
      threat.siege = { turns: 0, from: 'caesarea' }; threat.regs.forEach(r => r.men = 8);
      App.scene.openDiplo('byzantine');
    });
    const contribution = page.locator('.pol-actions>.box').filter({ hasText: 'المساهمة الفعلية' });
    await contribution.scrollIntoViewIfNeeded();
    assert.ok((await contribution.textContent()).includes('لم تُسجّل'));
    assert.equal(await contribution.locator('.cbar').count(), 0);
    result.noInventedShare = await check('contributions-empty', w, h, '.sheet');
    await tap(page.getByRole('button', { name: 'تمويل الحليف · 150', exact: true }));
    assert.equal(await page.evaluate(() => Game.alliedContribution('umayyad', 'khazar').aid), 150);
    assert.equal(await page.evaluate(() => Game.f('umayyad').gold), 3850);
    await contribution.scrollIntoViewIfNeeded(); assert.equal(await contribution.locator('.cbar').count(), 1);
    assert.ok((await contribution.textContent()).includes('100٪ / 0٪'));
    result.actualContribution = await check('contributions-funded', w, h, '.sheet');
    await tap(page.getByRole('button', { name: 'تنسيق الحرب مع الحليف', exact: true }));
    await tap(page.locator('.modal').getByRole('button', { name: 'الدفاع عن مدينة', exact: true }));
    const row = page.locator('.coord-row').filter({ hasText: 'طرسوس' }); await row.scrollIntoViewIfNeeded();
    result.coordination = await check('coordination', w, h, '.modal');
    await tap(row.getByRole('button', { name: 'اطلب', exact: true }));
    assert.ok(await page.evaluate(() => Game.S.coord.some(c => c.ok && c.target === 'tarsus')));
    const saved = await page.evaluate(() => { Game.save('3'); return JSON.stringify({ politics: Game.S.politics, wars: Game.S.wars, coord: Game.S.coord, gold: Game.f('umayyad').gold }); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const loaded = await page.evaluate(() => { Game.load('3'); return JSON.stringify({ politics: Game.S.politics, wars: Game.S.wars, coord: Game.S.coord, gold: Game.f('umayyad').gold }); });
    assert.equal(loaded, saved); result.contributionReload = true;
    await start(); await page.evaluate(() => App.scene.openDiplo('byzantine'));
    const close = page.locator('.sheet .head-btns button[title="إغلاق"]');
    assert.ok(await close.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }));
    await tap(close); assert.ok(await page.locator('.sheet').evaluate(el => el.hidden));
    if (w < 700 && h > w) assert.notEqual(await page.locator('.map-tools').evaluate(el => getComputedStyle(el).display), 'none');
    result.headerClose = true;
    await page.evaluate(() => {
      const a = Game.armiesOf('umayyad')[0], n = Game.node('amorium');
      a.node = n.id; a.siege = { turns: 0, from: 'tarsus' }; n.stores = 9; n.walls = 4;
      Game.f('umayyad').rep = 0; App.scene.openSiege(n);
    });
    const surrender = page.locator('.surr .btn'); await surrender.scrollIntoViewIfNeeded();
    const rect = await surrender.boundingBox(); assert.ok(rect.height >= 43 && rect.width >= 43);
    result.surrender = await check('surrender', w, h, '.sheet');
    await tap(surrender); assert.ok(await page.evaluate(() => Game.canDemandSurrender(Game.node('amorium'), 'umayyad')));
    assert.equal(await page.evaluate(() => Game.node('amorium').owner), 'byzantine');
    await page.evaluate(() => { Game.save('3'); Game.load('3'); });
    assert.ok(await page.evaluate(() => Game.canDemandSurrender(Game.node('amorium'), 'umayyad')));
    await page.evaluate(() => Game.S.turn += 2);
    assert.equal(await page.evaluate(() => Game.canDemandSurrender(Game.node('amorium'), 'umayyad')), null);
    result.surrenderCooldown = true; checks.push(result); console.log('PASS final political controls ' + w + 'x' + h);
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'final-ui-results.json'), JSON.stringify({ checks, contributionReloads: 7, errors }, null, 2));
  await browser.close(); console.log('Final contribution visuals, coordination, header touch and surrender cooldown checks passed.');
})().catch(async e => { console.error(e); await browser?.close(); process.exitCode = 1; });
