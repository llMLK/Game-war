'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const {createContext}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),base='a721b9d';
function baseline(seed){let state=seed>>>0;const math=Object.create(Math),saved=new Map();math.random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296};const c=vm.createContext({Math:math,console,setTimeout,clearTimeout,window:{addEventListener(){}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)}});const html=execFileSync('git',['show',`${base}:index.html`],{cwd:root,encoding:'utf8'});for(const [,file]of html.matchAll(/<script src="([^"]+)"/g))vm.runInContext(execFileSync('git',['show',`${base}:${file}`],{cwd:root,encoding:'utf8'}),c,{filename:file});c.run=s=>vm.runInContext(s,c);return c;}
const current=createContext(714),previous=baseline(714);
for(const c of [current,previous])c.run("UndoBar.show=()=>{};UI.toast=()=>{};App.scene={refresh(){}};Sheets.render=()=>{};Game.newGame('umayyad','umayyad','normal');");
const state=c=>JSON.parse(c.run('JSON.stringify(Game.S)'));
assert.deepEqual(state(current),state(previous));console.log('PASS identical A–E and Phase F Umayyad initial campaign (all saved fields)');
for(const c of [current,previous])c.run("globalThis.city=Game.nodesOf('umayyad').find(n=>!Game.canBuild('umayyad',n,'farm'));globalThis.gold0=Game.f('umayyad').gold;Game.buildU('umayyad',city,'farm');Undo.run();");
assert.deepEqual(state(current),state(previous));assert.ok(current.run("Game.f('umayyad').gold===gold0 && city.work===null"));console.log('PASS identical real construction/Undo resources and campaign state');
for(const c of [current,previous])c.run('Game.endRound();Game.save("1");');assert.deepEqual(state(current),state(previous));console.log('PASS identical endRound military, economy, buildings, leaders and diplomatic fields');
const oldSave=previous.run('JSON.stringify(Game.readSlot("1"))');current.run(`store.set(SAVE_PREFIX+'1',${oldSave});Game.load('1');`);previous.run("Game.load('1')");assert.deepEqual(state(current),state(previous));console.log('PASS baseline A–E synthetic save loads identically into Phase F');
current.run("Game.save('2');globalThis.savedState=JSON.stringify(Game.S);Game.f('umayyad').gold=1;Game.load('2');");assert.ok(current.run('JSON.stringify(Game.S)===savedState'));assert.equal(current.run('Undo.stack.length'),0);assert.deepEqual(current.errors,[]);console.log('PASS Phase F save/load roundtrip and stale Undo cleanup');
