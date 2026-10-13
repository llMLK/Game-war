'use strict';
// Run every acceptance suite in a disposable snapshot. Existing A–F artifacts stay untouched.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{spawn,execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/phase-r'),snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'suyuf-r-final-'));
fs.mkdirSync(OUT,{recursive:true});
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
const {collectRuntimeFiles}=require('../tools/phase-f-preview.cjs');
const runtimeBlobs=collectRuntimeFiles().map(file=>({file,gitBlob:execFileSync('git',['hash-object','--path='+file,file],{cwd:ROOT,encoding:'utf8'}).trim()}));
const all=['map-routes','camera','inspect-geometry','leaders','battles','economy','economy-trade','politics','political-spy','political-allies','phase-f-undo','phase-f-campaign','phase-r-saves','agent2-phase-r-save-safety','battle-balance','economy-balance','political-sim','map-preview','map-interactions','leader-preview','leader-actions','battle-preview','economy-preview','politics-preview','politics-final-ui','politics-spy-ui','phase-f-baseline','phase-f-mobile','phase-f-lifecycle','phase-f-ui','phase-f-preview','phase-r-ui','phase-r-content','phase-r-identity'];
const args=process.argv.slice(2),selected=args.length?args:all;
const evidenceTag=process.env.PHASE_R_EVIDENCE_TAG||'';
if(evidenceTag&&!/^[a-z0-9-]+$/.test(evidenceTag))throw Error('Invalid evidence tag');
const resultFile=evidenceTag?`${evidenceTag}-regression-results.json`:args.length?'targeted-regression-results.json':'regression-results.json';
const logFolder=evidenceTag?`${evidenceTag}-logs`:args.length?'targeted-logs':'final-logs';
const evidenceFolder=evidenceTag?`${evidenceTag}-evidence`:args.length?'targeted-evidence':'suite-evidence';
for(const name of selected)if(!all.includes(name))throw Error('Unknown suite: '+name);
const files=execFileSync('git',['ls-files','-co','--exclude-standard'],{cwd:ROOT,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
for(const relative of new Set(files)){
 if(relative.startsWith('artifacts/')||relative.startsWith('docs/'))continue;
 const source=path.join(ROOT,relative);if(!fs.existsSync(source)||!fs.statSync(source).isFile())continue;
 const target=path.join(snapshot,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
}
let server;
const report={sourceCommit,runtimeBlobs,snapshot,method:'Current working-tree snapshot; runtime Git blob manifest allows exact post-commit verification even when sourceCommit is the pre-stage HEAD. URL-only test adaptation to private local server. All suite artifacts remain in TEMP and are copied under Phase R evidence. Original F evidence is not overwritten. Synthetic fixtures and Playwright Edge emulation; no real owner saves or physical phones.',started:new Date().toISOString(),results:[],excluded:[{script:'serve',reason:'infrastructure, private server supplied by this runner'},{script:'harness/battle-fixtures',reason:'shared modules exercised by suites'},{script:'build-coast/build-road-drawings',reason:'offline regeneration tools would rewrite unchanged atlas assets; geometry is independently checked'},{script:'phase-f-regression',reason:'all eight constituent suites executed individually, no duplicate count'},{script:'phase-f-published',reason:'public URL must remain approved F, not R; no R publication authorized'}]};
const persist=()=>fs.writeFileSync(path.join(OUT,resultFile),JSON.stringify(report,null,2));
const browserSuites=new Set(['map-preview','map-interactions','leader-preview','leader-actions','battle-preview','economy-preview','politics-preview','politics-final-ui','politics-spy-ui','phase-f-baseline','phase-f-mobile','phase-f-lifecycle','phase-f-ui','phase-f-preview','phase-r-ui']);
let browserQueue=Promise.resolve();
function run(name){if(!browserSuites.has(name))return runScript(name);const pending=browserQueue.then(()=>runScript(name));browserQueue=pending.catch(()=>{});return pending;}
function runScript(name){return new Promise(resolve=>{
 const log=path.join(OUT,logFolder,name+'.log');fs.mkdirSync(path.dirname(log),{recursive:true});const fd=fs.openSync(log,'w'),start=Date.now();
 const child=spawn(process.execPath,[path.join(snapshot,'tests',name+'.cjs')],{cwd:snapshot,windowsHide:true,env:{...process.env,GIT_DIR:path.join(ROOT,'.git'),GIT_WORK_TREE:snapshot},stdio:['ignore',fd,fd]});
 child.on('error',e=>{fs.writeSync(fd,e.stack)});child.on('close',(exitCode,signal)=>{fs.closeSync(fd);const text=fs.readFileSync(log,'utf8');report.results.push({script:name,exitCode,signal,status:exitCode===0?'passed':'failed',seconds:Math.round((Date.now()-start)/100)/10,passLines:(text.match(/^PASS\b/gm)||[]).length,log:path.relative(ROOT,log).replaceAll('\\','/'),tail:text.slice(-2400)});persist();console.log(`${exitCode===0?'PASS':'FAIL'} ${name} (${Math.round((Date.now()-start)/1000)}s)`);resolve()});
})}
(async()=>{
 server=http.createServer((req,res)=>{const target=path.resolve(snapshot,'.'+new URL(req.url,'http://localhost').pathname);if(target!==snapshot&&!target.startsWith(snapshot+path.sep))return res.writeHead(403).end();const file=target===snapshot?path.join(snapshot,'index.html'):target;fs.readFile(file,(err,bytes)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(bytes)})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 for(const relative of fs.readdirSync(path.join(snapshot,'tests')).filter(x=>x.endsWith('.cjs'))){const file=path.join(snapshot,'tests',relative);const source=fs.readFileSync(file,'utf8');fs.writeFileSync(file,source.replaceAll('http://127.0.0.1:8000',`http://127.0.0.1:${port}`))}
 persist();let cursor=0;async function worker(){while(cursor<selected.length){const name=selected[cursor++];await run(name)}}const workers=Math.max(1,Math.min(2,Number(process.env.PHASE_R_WORKERS)||2));await Promise.all(Array.from({length:workers},()=>worker()));
 const artifacts=path.join(snapshot,'artifacts');if(fs.existsSync(artifacts))fs.cpSync(artifacts,path.join(OUT,evidenceFolder),{recursive:true});
 report.finished=new Date().toISOString();report.passed=report.results.filter(x=>x.status==='passed').length;report.failed=report.results.length-report.passed;persist();await new Promise(resolve=>server.close(resolve));console.log(`Phase R suites: ${report.passed}/${report.results.length} passed; evidence ${OUT}`);if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);server?.close();process.exitCode=1});
