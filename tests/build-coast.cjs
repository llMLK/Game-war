// Optional asset regeneration: Natural Earth 1:50m land, public domain.
// Input downloaded from nvkelso/natural-earth-vector/geojson/ne_50m_land.geojson.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const geo=JSON.parse(fs.readFileSync(path.join(root,'artifacts/map/natural-earth-land.geojson'),'utf8'));
const project=([x,y])=>[80+(x+10)*30,80+(48-y)*32];
function clip(poly,axis,limit,keepGreater){
 const out=[];let a=poly.at(-1);if(!a)return out;
 for(const b of poly){const ai=keepGreater?a[axis]>=limit:a[axis]<=limit,bi=keepGreater?b[axis]>=limit:b[axis]<=limit;
  if(ai!==bi){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  if(bi)out.push(b);a=b;
 }return out;
}
function simplify(p,tol=.65){
 if(p.length<4)return p;const a=p[0],b=p.at(-1),dx=b[0]-a[0],dy=b[1]-a[1];let best=tol*tol,idx=0;
 for(let i=1;i<p.length-1;i++){const t=Math.max(0,Math.min(1,((p[i][0]-a[0])*dx+(p[i][1]-a[1])*dy)/(dx*dx+dy*dy||1)));const d=(p[i][0]-a[0]-t*dx)**2+(p[i][1]-a[1]-t*dy)**2;if(d>best){best=d;idx=i;}}
 return idx?[...simplify(p.slice(0,idx+1),tol).slice(0,-1),...simplify(p.slice(idx),tol)]:[a,b];
}
const area=p=>Math.abs(p.reduce((s,b,i)=>{const a=p[(i+p.length-1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0))/2;
const land=[];
for(const f of geo.features){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 for(const polygon of polygons){const rings=polygon.map(r=>{let p=r.map(project);for(const [axis,limit,gt]of [[0,0,true],[0,2048,false],[1,0,true],[1,1280,false]])p=clip(p,axis,limit,gt);if(p.length<4)return[];if(p[0][0]!==p.at(-1)[0]||p[0][1]!==p.at(-1)[1])p.push(p[0]);return simplify(p).map(p=>p.map(x=>+x.toFixed(1)));});
  if(rings[0].length<4||area(rings[0])<2)continue;
  const valid=rings.filter(r=>r.length>=4),xs=valid[0].map(p=>p[0]),ys=valid[0].map(p=>p[1]);land.push({bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],rings:valid});
 }
}
fs.writeFileSync(path.join(root,'js/atlas-coast.js'),"'use strict';\n// Natural Earth 1:50m land, public domain; clipped and simplified for this atlas.\n// Geographic backdrop, not a reconstruction of every historical shoreline.\nconst ATLAS_LAND = "+JSON.stringify(land)+";\n");
console.log(`${land.length} land polygons, ${land.reduce((s,p)=>s+p.rings.reduce((n,r)=>n+r.length,0),0)} vertices`);
