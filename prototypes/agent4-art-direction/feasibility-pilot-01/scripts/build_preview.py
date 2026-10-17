"""Isolated static evidence page. All city pixels are genuine raster artwork."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
sizes=[32,48,64,96]
def sprite(src,w,x=112,y=78,extra=''):
    h=w*2/3;left=x-w*.5;top=y-h*(799/1024)
    return f'<img class="sprite {extra}" data-css-width="{w}" data-anchor="768,799" src="{src}" style="width:{w}px;height:{h}px;left:{left}px;top:{top}px" alt="Constantinople painted asset">'
def coast(w,x=112,y=78,cw=224,ch=112):
    h=w*2/3;left=x-w*.5;top=y-h*(799/1024)
    pts=[(640,950),(720,835),(1090,735),(1510,490)]
    pts=[(left+(184+px*.76)/1536*w,top+(75+py*.76)/1024*h) for px,py in pts]
    water=[(0,ch)]+pts+[(cw,0),(cw,ch)]
    path=' '.join(f'{a:.3f},{b:.3f}' for a,b in water)
    roadx=left+(184+450*.76)/1536*w;roady=top+(75+735*.76)/1024*h
    return f'<svg class="terrain" viewBox="0 0 {cw} {ch}" aria-label="Constructed terrain and road"><polygon points="{path}" fill="#36586c"/><polyline points="0,{ch-8} {roadx-12:.3f},{roady+8:.3f} {roadx:.3f},{roady:.3f}" fill="none" stroke="#a78860" stroke-width="3"/></svg>'
def cell(src,w,kind='light',x=112,y=78,cw=224,ch=112,extra=''):
    terrain=coast(w,x,y,cw,ch) if kind=='coast' else ''
    return f'<div class="sample {kind}" style="width:{cw}px;height:{ch}px">{terrain}{sprite(src,w,x,y,extra)}</div>'
def crowded(w):
    scene=coast(w,190,158,390,290)
    # The routes/markers are construction guides, not generated city artwork.
    scene+='<svg class="terrain" viewBox="0 0 390 290"><g stroke="#8e7257" stroke-width="1.5" stroke-dasharray="4 3" fill="none"><path d="M35 77 L153 151 L270 66 M153 151 L94 237 M153 151 L332 217"/></g><g fill="#ead8b1" stroke="#635e48"><circle cx="35" cy="77" r="8"/><circle cx="270" cy="66" r="8"/><circle cx="94" cy="237" r="8"/><circle cx="332" cy="217" r="8"/></g></svg>'
    scene+=sprite('states/S3.png',w,190,158)
    scene+='<span class="node" style="left:13px;top:91px">N1 • route</span><span class="node" style="left:245px;top:79px">N2</span><span class="node" style="left:65px;top:248px">N3</span><span class="node" style="left:299px;top:230px">N4</span><span class="node city-label" style="left:143px;top:180px">القسطنطينية</span><span class="army" style="left:97px;top:132px">240</span><span class="army" style="left:243px;top:169px">180</span>'
    return f'<figure><figcaption>{w} CSS px — constructed crowded map</figcaption><div class="crowd">{scene}</div></figure>'

html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Imperial Illuminated Atlas — feasibility pilot 01</title><style>
*{box-sizing:border-box}body{margin:0;background:#ede7d8;color:#243d51;font:16px/1.5 Arial,sans-serif}main{max-width:1160px;margin:auto;padding:28px}h1{font-size:30px;line-height:1.2;margin:0 0 10px}h2{font-size:23px;margin:0 0 6px}p{margin:6px 0 16px}section{background:#fffdf7;border:1px solid #cdbf9e;padding:22px;margin:22px 0;overflow:auto}a{color:#315a78}.tag{display:inline-block;background:#243d51;color:#f3e8cd;padding:4px 10px;border-radius:4px}small{color:#5e6d73}.grid4{display:grid;grid-template-columns:repeat(4,224px);gap:10px;width:max-content}.grid-label{padding-top:10px;font-weight:bold}.sample{position:relative;overflow:hidden}.light,.coast,.crowd{background:#ddcba7}.dark{background:#303b42}.sprite{position:absolute;max-width:none;object-fit:contain;image-rendering:auto}.terrain{position:absolute;inset:0;width:100%;height:100%}.row-label{margin:15px 0 5px}.crowd-grid{display:grid;grid-template-columns:390px 390px;gap:18px;width:max-content}.crowd{position:relative;width:390px;height:290px;overflow:hidden}figure{margin:0}figcaption{padding:6px 0;font-size:14px}.node{position:absolute;background:#f0e4c9;color:#243d51;padding:1px 5px;border:1px solid #a59471;border-radius:3px;font-size:12px;white-space:nowrap}.army{position:absolute;border:2px solid #52817b;background:#f0e4c9;padding:1px 7px;font-weight:bold;font-size:13px}.city-label{font-size:14px}.state-grid{display:grid;grid-template-columns:repeat(5,180px);gap:8px;width:max-content}.art-pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.art-pair img{width:100%}.mono{filter:grayscale(1)}.silhouette{filter:brightness(0)}.phase-grid{display:flex;gap:22px;width:max-content}.phase{position:relative;width:390px;height:844px}.phase>img.bg{width:390px;height:844px}.overlay-tag{position:absolute;left:195px;top:654px;font-size:10px;background:#122d40;color:white;padding:3px}.phase .outline{position:absolute;left:192px;top:576px;width:103px;height:102px;border:2px dashed #b22f6a}.ruler{width:100px;border-top:2px solid #243d51;font-size:11px;margin-top:15px}.phone-only{display:none}.phone-mode main{padding:12px;width:390px}.phone-mode .desktop-only{display:none}.phone-mode .phone-only{display:block}.phone-mode h1{font-size:22px}.phone-mode section{padding:8px;margin:10px 0}.phone-mode .grid4{grid-template-columns:repeat(4,84px);gap:4px}.phone-mode .state-grid{grid-template-columns:repeat(5,66px);gap:4px}.phone-mode h2{font-size:16px}.phone-mode p{font-size:12px}.phone-mode .row-label{font-size:12px;margin-top:7px}.phone-mode .grid-label{font-size:12px}
</style><body><main><h1>IMPERIAL ILLUMINATED ATLAS</h1><p>Feasibility pilot 01 · Constantinople, 715 CE · <strong>Owner approval pending</strong></p><p class="tag">Local comparison only — no game integration</p>
<div class="desktop-only"><p dir="rtl">هذه مقارنة محلية لأعمال مرسومة مولّدة فعليًا. ثبات الطبقات لا يثبت جودة القراءة أو الصحة التاريخية. اعرض الصفحة بتكبير المتصفح 100٪؛ صور GitHub قد تُصغَّر تلقائيًا.</p>
<section id="paired"><h2>A1 style master / A3 expanded inspection</h2><p>Large review images; not mobile-scale evidence. The strategic asset is a dedicated repaint.</p><div class="art-pair"><figure><a href="art/A1-style-master.png"><img src="art/A1-style-master.png" alt="Style master"></a><figcaption>A1 · C atmosphere + A architecture + B pigment craft</figcaption></figure><figure><a href="art/A3-expanded-inspection.png"><img src="art/A3-expanded-inspection.png" alt="Expanded city"></a><figcaption>A3 · fixed detailed city over generated surroundings</figcaption></figure></div></section>
<section id="mobile-matrix"><h2>A4 / actual CSS widths</h2><p>Image boxes are exactly 32 / 48 / 64 / 96 CSS px, including transparent margins. All use anchor (768,799). No per-state auto-fit.</p>'''
for kind in ['light','dark','coast']:
    html+=f'<div class="row-label">{kind.title()} terrain'+(' — constructed shoreline and road' if kind=='coast' else '')+'</div><div class="grid4">'
    for w in sizes: html+=f'<div><div class="grid-label">{w} CSS px'+(' · stress' if w==32 else '')+'</div>'+cell('art/A2-strategic-compact-v2.png',w,kind)+'</div>'
    html+='</div>'
html+='<div class="ruler">100 CSS px ruler</div></section><section id="crowded"><h2>Crowded strategic context</h2><p>Constructed terrain, routes, labels and neighbor markers. Not an authentic Phase R screenshot. City art is the genuine layered S3 raster.</p><div class="crowd-grid">'+''.join(crowded(w) for w in sizes)+'</div></section><section id="state-matrix"><h2>Progression at actual size</h2><p>Same camera, anchor and scale in every cell. These labels make this a review sheet, not a blind human test.</p>'
for w in sizes:
    html+=f'<div class="row-label">{w} CSS px</div><div class="state-grid">'
    for name in ['S0','S1','S2','S3','S3-defense']: html+='<div><div class="grid-label">'+name+'</div>'+cell('states/'+name+'.png',w,'light',90,78,180,112)+'</div>'
    html+='</div>'
html+='</section><section id="value-check"><h2>Value and silhouette check</h2><p>64 CSS px, without color cues. No numerical or participant score assigned.</p><div class="grid4">'
for file,extra,label in [('A2-strategic-detail.png','','Detailed first'),('A2-strategic-compact-v2.png','','Compact v2'),('A2-strategic-compact-v2.png','mono','Grayscale'),('A2-strategic-compact-v2.png','silhouette','Silhouette')]:
    html+='<div><div class="grid-label">'+label+'</div>'+cell('art/'+file,64,'light',extra=extra)+'</div>'
html+='</div></section><section id="phaseR"><h2>Phase R / authentic source and offline overlay</h2><p>Left: unmodified committed screenshot from synthetic Playwright test data. Right: identical background with our 64 CSS px art placed over it as a clutter test. This is NOT game integration and NOT Constantinople’s campaign coordinates; coastline adaptation is not validated here.</p><div class="phase-grid"><figure><figcaption>Authentic test screenshot · 390×844 CSS · DPR 1</figcaption><div class="phase"><img class="bg" src="references/phase-r-synthetic-390x844.png" alt="Unmodified synthetic Phase R map screenshot"></div></figure><figure><figcaption>Constructed offline overlay · no game files changed</figcaption><div class="phase"><img class="bg" src="references/phase-r-synthetic-390x844.png" alt="Phase R composition background"><span class="outline"></span>'+sprite('states/S3.png',64,242,643)+'<span class="overlay-tag">OFFLINE ART OVERLAY</span></div></figure></div></section></div>'
html+='<div class="phone-only"><p>390 CSS px viewport · browser emulation only. 100% page zoom. Width includes alpha margins.</p><section id="phone-matrix"><h2>Actual-size city / light, dark, coast</h2>'
for kind in ['light','dark','coast']:
    html+='<div class="row-label">'+kind+'</div><div class="grid4">'
    for w in sizes:html+=f'<div><div class="grid-label">{w} px</div>'+cell('art/A2-strategic-compact-v2.png',w,kind,42,65,84,92)+'</div>'
    html+='</div>'
html+='</section><section id="phone-states"><h2>64 CSS px / cumulative states</h2><div class="state-grid">'
for name in ['S0','S1','S2','S3','S3-defense']:html+='<div><div class="grid-label">'+name+'</div>'+cell('states/'+name+'.png',64,'light',33,62,66,88)+'</div>'
html+='</div><div class="ruler">100 CSS px</div></section><p>Pending: physical devices, blind recognition, owner art approval.</p></div></main><script>if(new URLSearchParams(location.search).get("mode")==="phone")document.body.classList.add("phone-mode");</script></body></html>'
(ROOT/'preview.html').write_text(html,encoding='utf-8')
print(ROOT/'preview.html')
