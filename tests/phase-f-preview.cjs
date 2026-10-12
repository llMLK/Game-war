'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { buildPreview, collectRuntimeFiles, STORAGE_NAMESPACE } = require('../tools/phase-f-preview.cjs');

const ROOT = path.resolve(__dirname, '..');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function playwright() {
  try { return require('playwright'); }
  catch { return require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Abdul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
}

async function main() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'suyuf-f-preview-'));
  const output = path.join(parent, 'public');
  let server, browser;
  try {
    const info = buildPreview({ output, allowDirty: true });
    assert.match(info.sourceCommit, /^[0-9a-f]{40}$/);
    assert.equal(info.storageNamespace, STORAGE_NAMESPACE);
    assert.throws(() => buildPreview({ output, allowDirty: true }), /refusing to overwrite/);
    assert.throws(() => buildPreview({ output: ROOT, allowDirty: true }), /fresh directory/);
    const actual = [];
    const walk = (directory, prefix = '') => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const name = prefix + entry.name;
        if (entry.isDirectory()) walk(path.join(directory, entry.name), name + '/');
        else actual.push(name);
      }
    };
    walk(output);
    assert.deepEqual(actual.sort(), [...collectRuntimeFiles().filter((name) => !['index.html', 'manifest.json'].includes(name)), 'index.html', 'game.html', 'manifest.json', 'preview/bootstrap.js', 'build-info.json', '.nojekyll'].sort());
    assert.ok(!actual.some((name) => name !== 'js/save-safety.js' && /(?:^|\/)(?:artifacts|docs|tests|tools|\.git)(?:\/|$)|(?:save|token|secret|\.env)/i.test(name)), 'publication contains only runtime files (save-safety.js is code, not saved player data)');
    for (const file of info.sourceFiles) {
      const expected = file.matchesCommit
        ? execFileSync('git', ['show', `${info.sourceCommit}:${file.path}`], { cwd: ROOT, windowsHide: true })
        : fs.readFileSync(path.join(ROOT, file.path));
      assert.equal(file.sha256, hash(expected), file.path);
      if (!['index.html', 'manifest.json'].includes(file.path)) assert.equal(file.sha256, hash(fs.readFileSync(path.join(output, file.path))), 'copied ' + file.path);
    }
    const dirtyRuntime = info.sourceFiles.filter((file) => !file.matchesCommit);
    if (dirtyRuntime.length) {
      assert.throws(() => buildPreview({ output: path.join(parent, 'strict-rejection') }), /differs from|absent from source commit/);
      assert.ok(!fs.existsSync(path.join(parent, 'strict-rejection')), 'reject before creating output');
    } else {
      const strict = buildPreview({ output: path.join(parent, 'strict-publication') });
      assert.equal(strict.developmentSnapshot, false);
      assert.ok(strict.sourceFiles.every((file) => file.matchesCommit));
    }
    for (const file of info.generatedFiles) assert.equal(file.sha256, hash(fs.readFileSync(path.join(output, file.path))), 'generated ' + file.path);
    const game = fs.readFileSync(path.join(output, 'game.html'), 'utf8');
    assert.ok(game.indexOf('js/util.js') < game.indexOf('preview/bootstrap.js') && game.indexOf('preview/bootstrap.js') < game.indexOf('js/campaign.js'));
    const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json')));
    assert.equal(manifest.start_url, './game.html');
    assert.equal(manifest.id, './phase-f-preview');

    server = http.createServer((request, response) => {
      const url = new URL(request.url, 'http://127.0.0.1');
      const preview = url.pathname.startsWith('/preview/');
      const official = url.pathname.startsWith('/official/');
      if (!preview && !official) return response.writeHead(404).end();
      const root = preview ? output : ROOT;
      const suffix = decodeURIComponent(url.pathname.slice(preview ? 9 : 10)) || 'index.html';
      const filename = path.resolve(root, suffix);
      if (!filename.startsWith(root + path.sep)) return response.writeHead(403).end();
      fs.readFile(filename, (error, bytes) => {
        if (error) return response.writeHead(404).end();
        response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' })[path.extname(filename)] || 'application/octet-stream');
        response.setHeader('Cache-Control', 'no-store');
        response.end(bytes);
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await playwright().chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('https://fonts.**/*', (route) => route.abort());
    await page.goto(base + '/official/index.html');
    await page.waitForFunction(() => typeof Game !== 'undefined' && typeof App !== 'undefined' && App.scene);
    const official = await page.evaluate(() => {
      Game.newGame('umayyad', 'umayyad', 'normal');
      Game.f(Game.S.player).gold = 4321;
      Game.save('auto'); Game.save('1');
      store.set('phase-f-isolation-sentinel', { official: true });
      store.set(SAVE_KEY_V1, { v: 1, sentinel: 'official-legacy-save' });
      return Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]));
    });
    await page.goto(base + '/preview/');
    assert.equal(await page.locator('meta[name="game-source-commit"]').getAttribute('content'), info.sourceCommit);
    await page.getByRole('link', { name: 'افتح معاينة F' }).tap();
    await page.waitForFunction(() => typeof Game !== 'undefined' && window.PHASE_F_PREVIEW && App.scene);
    const isolation = await page.evaluate(() => ({ hasSave: Game.hasSave(), auto: Game.readSlot('auto'), slot: Game.readSlot('1'), sentinel: store.get('phase-f-isolation-sentinel'), info: window.PHASE_F_PREVIEW }));
    assert.deepEqual({ hasSave: isolation.hasSave, auto: isolation.auto, slot: isolation.slot, sentinel: isolation.sentinel }, { hasSave: false, auto: null, slot: null, sentinel: null });
    assert.equal(isolation.info.sourceCommit, info.sourceCommit);
    const before = await page.evaluate(() => {
      Game.newGame('umayyad', 'umayyad', 'normal');
      Game.f(Game.S.player).gold = 987;
      Game.S.turn = 7;
      Game.save('auto'); Game.save('1');
      store.set('phase-f-isolation-sentinel', { preview: true });
      return { gold: Game.f(Game.S.player).gold, turn: Game.S.turn, scenario: Game.S.scenario, cityCount: Game.S.nodes.length, armyCount: Game.S.armies.length };
    });
    await page.reload();
    const restored = await page.evaluate(() => {
      const loaded = !!Game.load('auto');
      return { loaded, gold: Game.f(Game.S.player).gold, turn: Game.S.turn, scenario: Game.S.scenario, cityCount: Game.S.nodes.length, armyCount: Game.S.armies.length, sentinel: store.get('phase-f-isolation-sentinel') };
    });
    assert.equal(restored.loaded, true);
    assert.deepEqual(restored.sentinel, { preview: true });
    assert.deepEqual({ gold: restored.gold, turn: restored.turn, scenario: restored.scenario, cityCount: restored.cityCount, armyCount: restored.armyCount }, before);
    const retained = await page.evaluate(() => {
      Game.deleteSlot('1'); Game.clearSave(); store.del('phase-f-isolation-sentinel');
      return Object.fromEntries(Object.keys(localStorage).filter((key) => !key.startsWith(window.PHASE_F_PREVIEW.storageNamespace)).map((key) => [key, localStorage.getItem(key)]));
    });
    assert.deepEqual(retained, official, 'preview get/set/delete/legacy-save deletion cannot touch official keys');
    await page.goto(base + '/official/index.html');
    const original = await page.evaluate(() => ({ saved: !!Game.load('auto'), gold: Game.f(Game.S.player).gold, sentinel: store.get('phase-f-isolation-sentinel') }));
    assert.deepEqual(original, { saved: true, gold: 4321, sentinel: { official: true } });
    assert.deepEqual(errors, []);
    console.log(`PASS Phase F preview: ${info.sourceFiles.length} allowlisted runtime files; exact Git blob SHA256 manifest with clean-filter/EOL equivalence; strict rejection of genuine runtime changes; fresh-output protection; 390×844 touch landing; same-origin save/load and get/set/delete/legacy isolation; official saves unchanged; zero page errors.`);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    // The verified temporary directory is created by this test; no workspace files are deleted.
    if (path.resolve(parent).startsWith(path.resolve(os.tmpdir()) + path.sep)) fs.rmSync(parent, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
