const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function createContext(seed = 1) {
  const root = path.resolve(__dirname, '..'), saved = new Map(), errors = [];
  let state = seed >>> 0;
  const math = Object.create(Math);
  math.random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  const context = vm.createContext({ Math: math, console: { log: console.log, warn: console.warn, error: (...args) => errors.push(args.map(String).join(' ')) }, setTimeout, clearTimeout, window: { addEventListener() {} }, localStorage: { getItem: k => saved.get(k) || null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) } });
  for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  context.run = code => vm.runInContext(code, context);
  context.errors = errors;
  context.saved = saved;
  return context;
}
function run(code, seed = 1) { return createContext(seed).run(code); }
module.exports = { createContext, run };
