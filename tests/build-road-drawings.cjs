// Offline cartographic repair only. Never used for army movement or permissions.
const fs=require('node:fs'),path=require('node:path'),{createContext}=require('./harness.cjs');
const c=createContext();
const result=c.run(`(()=>{
 const sc=SCENARIOS.umayyad, cache=new Map(),C=2;
 const dry=(x,y)=>{const k=x+','+y;if(!cache.has(k))cache.set(k,!mapIsSea(sc,x,y));return cache.get(k);};
 const clear=(a,b)=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=0;t<=d;t+=1){const x=a[0]+(b[0]-a[0])*t/(d||1),y=a[1]+(b[1]-a[1])*t/(d||1);if(!dry(Math.round(x),Math.round(y)))return false;}return true;};
 const snap=p=>{const a=p.map(v=>Math.round(v/C)*C);for(let r=0;r<20;r+=C)for(let x=-r;x<=r;x+=C)for(let y=-r;y<=r;y+=C){const q=[a[0]+x,a[1]+y];if(dry(...q)&&clear(p,q))return q;}throw Error('no dry anchor '+p);};
 function walk(a,b){
  if(clear(a,b))return[a,b];const start=snap(a),end=snap(b),key=p=>p.join(','),last=key(end),queue=[],score=new Map(),prev=new Map(),point=new Map();
  const push=q=>{queue.push(q);let i=queue.length-1;while(i){const p=(i-1)>>1;if(queue[p].f<=q.f)break;queue[i]=queue[p];i=p;}queue[i]=q;};
  const pop=()=>{const first=queue[0],v=queue.pop();if(queue.length){let i=0;while(i*2+1<queue.length){let j=i*2+1;if(j+1<queue.length&&queue[j+1].f<queue[j].f)j++;if(queue[j].f>=v.f)break;queue[i]=queue[j];i=j;}queue[i]=v;}return first;};
  score.set(key(start),0);point.set(key(start),start);push({p:start,g:0,f:0});let count=0;
  while(queue.length&&count++<180000){const q=pop(),k=key(q.p);if(q.g!==score.get(k))continue;if(k===last){const out=[b];let id=k;while(id){out.push(point.get(id));id=prev.get(id);}out.push(a);out.reverse();const simple=[out[0]];for(let i=0;i<out.length-1;){let j=out.length-1;while(j>i+1&&!clear(out[i],out[j]))j--;simple.push(out[j]);i=j;}return simple;}
   for(const [dx,dy]of [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[-2,2],[2,-2],[2,2]]){const p=[q.p[0]+dx,q.p[1]+dy];if(p[0]<Math.min(a[0],b[0])-130||p[0]>Math.max(a[0],b[0])+130||p[1]<Math.min(a[1],b[1])-130||p[1]>Math.max(a[1],b[1])+130||!dry(...p)||!clear(q.p,p))continue;
    const id=key(p),g=q.g+Math.hypot(dx,dy);if(g>=(score.get(id)??Infinity))continue;score.set(id,g);prev.set(id,k);point.set(id,p);push({p,g,f:g+Math.hypot(p[0]-end[0],p[1]-end[1])});}
  }throw Error('no land drawing '+a+' to '+b);
 }
 const out={};for(const e of sc.edges){if(e[2]==='water')continue;const A=sc.nodes.find(n=>n.id===e[0]),B=sc.nodes.find(n=>n.id===e[1]),p=[[A.x,A.y],...(e[3]||[]).filter(p=>dry(...p)),[B.x,B.y]];if(p.slice(1).every((b,i)=>clear(p[i],b)))continue;let result=[p[0]];for(let i=1;i<p.length;i++)result.push(...walk(p[i-1],p[i]).slice(1));out[e[0]+'|'+e[1]]=result.slice(1,-1);}
 return out;
})()`);
fs.writeFileSync(path.resolve(__dirname,'../js/atlas-routes.js'),"'use strict';\n// Coastal road drawings follow dry land; these points do not change the movement graph.\nconst ATLAS_ROUTE_DRAWINGS = "+JSON.stringify({...c.run('ATLAS_ROUTE_DRAWINGS'),...result},null,2)+";\n");
console.log(Object.keys(result));
