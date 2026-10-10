'use strict';
// Recheck only the espionage surface after keeping its primary action in the modal footer.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const errors = [], checks = [], out = path.resolve(__dirname, '../artifacts/politics');
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  async function tap(l) { await l.scrollIntoViewIfNeeded(); await l.tap(); }
  async function check(name, w, h) {
    const result = await page.locator('.modal').last().evaluate(el => {
      const r = el.getBoundingClientRect(), b = el.querySelector('.modal-body'), footer = el.querySelector('.modal-btns');
      const controls = [...el.querySelectorAll('button,select,summary')].filter(e => e.getClientRects().length);
      return { fits: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        overflow: b.scrollWidth > b.clientWidth + 2, rtl: getComputedStyle(el).direction === 'rtl',
        targets: controls.every(e => e.getBoundingClientRect().height >= 43),
        actionVisible: [...footer.querySelectorAll('button')].every(e => { const a = e.getBoundingClientRect(); return a.left >= r.left && a.right <= r.right && a.top >= r.top && a.bottom <= r.bottom && e.contains(document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2)); }) };
    });
    assert.ok(result.fits && !result.overflow && result.rtl && result.targets && result.actionVisible, JSON.stringify(result));
    await page.screenshot({ path: path.join(out, `${name}-${w}x${h}.png`) }); return result;
  }
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844], [360, 740], [320, 568], [844, 390], [568, 320]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => {
      document.querySelectorAll('.modal-layer').forEach(e => e.remove());
      Game.newGame('umayyad', 'umayyad', 'normal'); Game.normalizeState();
      Game.f('umayyad').gold = 4000; Game.S.leaders.seed = 12345; Game.node('nicaea').market = 2;
      const s = new CampaignScene(); s.introShown = true; App.setScene(s); s.openDiplo('byzantine');
      if (document.getElementById('toast')) document.getElementById('toast').hidden = true;
      Panels.spyDialog(s, 'byzantine');
    });
    const result = { viewport: [w, h] };
    await tap(page.getByRole('button', { name: 'تحريض', exact: true }));
    await page.getByLabel('هدف العملية').selectOption('nicaea'); result.incitement = await check('espionage', w, h);
    await tap(page.getByRole('button', { name: 'تخريب', exact: true }));
    await page.getByLabel('هدف العملية').selectOption('nicaea'); await page.getByLabel('نوع التخريب').selectOption('market');
    result.sabotage = await check('sabotage', w, h);
    const execute = page.getByRole('button', { name: 'نفّذ العملية', exact: true });
    assert.notEqual(await execute.getAttribute('aria-disabled'), 'true'); await execute.tap();
    assert.equal(await page.evaluate(() => Game.f('umayyad').gold), 3890);
    assert.equal(await page.evaluate(() => Game.f('umayyad').spyTurn), 0);
    result.outcome = await check('spy-result', w, h); await tap(page.getByRole('button', { name: 'حسناً', exact: true }));
    await page.evaluate(() => Panels.spyDialog(App.scene, 'byzantine'));
    assert.equal(await execute.getAttribute('aria-disabled'), 'true');
    // Disabled game buttons explain their reason on touch; Playwright's locator rejects aria-disabled.
    const disabledRect = await execute.boundingBox(); await page.touchscreen.tap(disabledRect.x + disabledRect.width / 2, disabledRect.y + disabledRect.height / 2);
    assert.equal(await page.evaluate(() => Game.f('umayyad').gold), 3890);
    await page.evaluate(() => { document.querySelectorAll('.modal-layer').forEach(e => e.remove()); Game.save('3'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.ok(await page.evaluate(() => { Game.load('3'); return Game.f('umayyad').gold === 3890 && Game.f('umayyad').spyTurn === 0; }));
    result.reloadAndNoDuplicateCharge = true; checks.push(result); console.log('PASS espionage footer ' + w + 'x' + h);
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'spy-ui-results.json'), JSON.stringify({ checks, saveReloads: 7, errors }, null, 2));
  await browser.close(); console.log('Espionage fixed footer, real touch, disabled action and reload checks passed.');
})().catch(async e => { console.error(e); await browser?.close(); process.exitCode = 1; });
