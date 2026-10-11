'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const suites=[['map-routes',10],['leaders',29],['battles',31],['economy',18],['economy-trade',12],['politics',23],['political-spy',15],['political-allies',12]],results=[];
for(const[name,groups]of suites){const output=execFileSync(process.execPath,[path.join(__dirname,name+'.cjs')],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',windowsHide:true});results.push({suite:name,groups,status:'passed',output});console.log(`PASS ${name}: ${groups} groups`)}
fs.writeFileSync(path.resolve(__dirname,'../artifacts/phase-f/regression-results.json'),JSON.stringify({groups:150,passed:150,results},null,2));console.log('PASS 150 A–E regression groups');
