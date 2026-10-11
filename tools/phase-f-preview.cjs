#!/usr/bin/env node
'use strict';

// Publish an allowlisted static snapshot. Never copy saves, reports, or .git.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const STORAGE_NAMESPACE = 'suyuf-preview:phase-f:';
const SOURCE_REPOSITORY = 'https://github.com/llMLK/Game-war';
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();

function localPath(reference) {
  if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(reference)) return null;
  const name = reference.split(/[?#]/, 1)[0].replace(/\\/g, '/').replace(/^\.\//, '');
  if (!name || name.startsWith('/') || name.split('/').some((part) => part === '..' || part.startsWith('.'))) {
    throw new Error(`Unsafe runtime reference: ${reference}`);
  }
  return name;
}

function collectRuntimeFiles() {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const names = new Set(['index.html', 'manifest.json', 'icon.svg']);
  for (const match of index.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"[^>]*>/gi)) {
    const name = localPath(match[1]);
    if (name) names.add(name);
  }
  const extensions = new Set(['.html', '.js', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.woff', '.woff2', '.ttf', '.ogg', '.mp3', '.wav']);
  for (const name of names) {
    if (!extensions.has(path.extname(name).toLowerCase())) throw new Error(`Unexpected runtime file: ${name}`);
    if (!fs.statSync(path.join(ROOT, name)).isFile()) throw new Error(`Missing runtime file: ${name}`);
    if (name.endsWith('.css')) {
      const css = fs.readFileSync(path.join(ROOT, name), 'utf8');
      for (const match of css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) {
        const asset = localPath(match[1]);
        if (asset) names.add(path.posix.join(path.posix.dirname(name), asset));
      }
    }
    if (name.endsWith('.js') && name !== 'js/util.js' && /\blocalStorage\b/.test(fs.readFileSync(path.join(ROOT, name), 'utf8'))) {
      throw new Error(`Storage isolation needs review: direct localStorage in ${name}`);
    }
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  for (const icon of manifest.icons || []) {
    const name = localPath(icon.src);
    if (name) names.add(name);
  }
  return [...names].sort();
}

function bootstrap(commit, developmentSnapshot) {
  return `'use strict';\n(() => {\n  const info = Object.freeze(${JSON.stringify({ sourceCommit: commit, storageNamespace: STORAGE_NAMESPACE, developmentSnapshot })});\n  if (window.PHASE_F_PREVIEW) throw new Error('Preview storage initialized twice');\n  const base = { get: store.get, set: store.set, del: store.del };\n  for (const method of ['get', 'set', 'del']) {\n    store[method] = (key, ...args) => base[method].call(store, info.storageNamespace + key, ...args);\n  }\n  Object.defineProperty(window, 'PHASE_F_PREVIEW', { value: info });\n})();\n`;
}

function landing(commit, developmentSnapshot) {
  const warning = developmentSnapshot ? '<p class="warning">نسخة اختبار محلية غير مخصصة للنشر.</p>' : '';
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="game-source-commit" content="${commit}"><title>سيوف الممالك · معاينة المرحلة F</title>
<style>*{box-sizing:border-box}body{margin:0;background:#17120d;color:#eadfc8;font:18px/1.8 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}main{width:min(100%,640px);border:1px solid #6b583b;border-radius:16px;padding:clamp(20px,5vw,40px);background:#211b14}h1{font-size:clamp(24px,5vw,34px);line-height:1.5;margin:0 0 12px}p{margin:12px 0}a{color:#f2ce85}.play{display:flex;align-items:center;justify-content:center;min-height:52px;margin:24px 0;background:#bd9654;color:#17120d;font-weight:bold;text-decoration:none;border-radius:10px}.commit{direction:ltr;overflow-wrap:anywhere;font:14px/1.6 monospace}small{display:block;color:#bfaf92}.warning{color:#ffb57f}</style></head>
<body><main><h1>سيوف الممالك · معاينة المرحلة F</h1><p>اختبار إصلاح إشعار التراجع ولمس زر إنهاء الدور. هذه معاينة منفصلة، ولم تُستبدل بها اللعبة الرسمية.</p>${warning}<p>حفظ المعاينة معزول بمفاتيح خاصة: لا تقرأ المعاينة حفظ اللعبة الرسمية ولا تغيّره. لا تنقل إليها بيانات لاعب حقيقية.</p><a class="play" href="game.html">افتح معاينة F</a><small>نسخة اللعبة المقصودة:</small><p class="commit"><a href="${SOURCE_REPOSITORY}/commit/${commit}">${commit}</a></p><small><a href="build-info.json">سجل النسخة وبصمات ملفاتها</a> · بعد الاختبار يعود القرار لصاحب المشروع.</small></main></body></html>\n`;
}

function buildPreview({ output, sourceCommit = 'HEAD', allowDirty = false } = {}) {
  if (!output) throw new Error('Specify a fresh output directory with --out.');
  const target = path.resolve(ROOT, output);
  const inWorkspace = target.startsWith(ROOT + path.sep);
  const inTemporary = target.startsWith(path.resolve(os.tmpdir()) + path.sep);
  if (!inWorkspace && !inTemporary) throw new Error('Output must be a fresh directory in this workspace or the system temporary directory.');
  if (fs.existsSync(target)) throw new Error(`Output already exists; refusing to overwrite: ${target}`);
  const commit = git('rev-parse', '--verify', `${sourceCommit}^{commit}`);
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('Expected a complete source commit SHA.');
  const snapshot = collectRuntimeFiles().map((name) => {
    const working = fs.readFileSync(path.join(ROOT, name));
    let committed, committedOid;
    try {
      committedOid = git('rev-parse', '--verify', `${commit}:${name}`);
      committed = execFileSync('git', ['show', `${commit}:${name}`], { cwd: ROOT, windowsHide: true });
    }
    catch { if (!allowDirty) throw new Error(`Runtime file absent from source commit: ${name}`); }
    // A clean CRLF checkout can differ bytewise from its LF Git blob. Compare
    // Git's configured clean-filter result without writing any Git objects.
    const workingOid = git('hash-object', `--path=${name}`, name);
    const matchesCommit = !!committed && workingOid === committedOid;
    if (!matchesCommit && !allowDirty) throw new Error(`Runtime file differs from ${commit}: ${name}. Commit the tested build before publication.`);
    const data = matchesCommit ? committed : working;
    return { path: name, sha256: sha256(data), bytes: data.length, matchesCommit, data };
  });
  const files = snapshot.map(({ data, ...metadata }) => metadata);
  const developmentSnapshot = files.some((file) => !file.matchesCommit);
  fs.mkdirSync(target, { recursive: true });
  for (const file of snapshot) {
    if (file.path === 'index.html' || file.path === 'manifest.json') continue;
    const destination = path.join(target, file.path);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, file.data);
  }
  const sourceHtml = snapshot.find((file) => file.path === 'index.html').data.toString('utf8');
  const utilityTag = '<script src="js/util.js"></script>';
  if (sourceHtml.split(utilityTag).length !== 2) throw new Error('Expected exactly one util.js entry point.');
  const gameHtml = sourceHtml.replace(utilityTag, `${utilityTag}\n<script src="preview/bootstrap.js"></script>`)
    .replace('<title>سيوف الممالك</title>', '<title>سيوف الممالك · معاينة F</title>')
    .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta name="game-source-commit" content="${commit}">`);
  fs.writeFileSync(path.join(target, 'game.html'), gameHtml);
  fs.writeFileSync(path.join(target, 'index.html'), landing(commit, developmentSnapshot));
  const manifest = JSON.parse(snapshot.find((file) => file.path === 'manifest.json').data.toString('utf8'));
  manifest.name = 'سيوف الممالك · معاينة F';
  manifest.short_name = 'معاينة F';
  manifest.start_url = './game.html';
  manifest.id = './phase-f-preview';
  manifest.scope = './';
  fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.mkdirSync(path.join(target, 'preview'));
  fs.writeFileSync(path.join(target, 'preview/bootstrap.js'), bootstrap(commit, developmentSnapshot));
  fs.writeFileSync(path.join(target, '.nojekyll'), '');
  const generated = ['index.html', 'game.html', 'manifest.json', 'preview/bootstrap.js', '.nojekyll'].map((name) => {
    const bytes = fs.readFileSync(path.join(target, name));
    return { path: name, sha256: sha256(bytes), bytes: bytes.length };
  });
  const info = { schema: 1, sourceRepository: SOURCE_REPOSITORY, sourceCommit: commit, developmentSnapshot, storageNamespace: STORAGE_NAMESPACE, sourceFiles: files, generatedFiles: generated };
  fs.writeFileSync(path.join(target, 'build-info.json'), JSON.stringify(info, null, 2) + '\n');
  return { output: target, ...info };
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--out') options.output = args[++i];
      else if (args[i] === '--source-commit') options.sourceCommit = args[++i];
      else if (args[i] === '--allow-dirty') options.allowDirty = true;
      else throw new Error(`Unknown argument: ${args[i]}`);
    }
    const result = buildPreview(options);
    console.log(JSON.stringify({ output: result.output, sourceCommit: result.sourceCommit, developmentSnapshot: result.developmentSnapshot, sourceFileCount: result.sourceFiles.length, storageNamespace: result.storageNamespace }, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { buildPreview, collectRuntimeFiles, STORAGE_NAMESPACE };
