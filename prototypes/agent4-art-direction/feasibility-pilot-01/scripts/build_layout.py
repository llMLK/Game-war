"""Annotated art-direction diagram, NOT generated artwork or a city renderer."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, subprocess, hashlib

ROOT = Path(__file__).resolve().parents[1]
for folder in ['guides','art','drafts','evidence','prompts','layers','states','references']:
    (ROOT/folder).mkdir(parents=True,exist_ok=True)
FONT = 'C:/Windows/Fonts/arial.ttf'
BOLD = 'C:/Windows/Fonts/arialbd.ttf'
im=Image.new('RGB',(1536,1024),'#f5f1e5'); d=ImageDraw.Draw(im)
def text(x,y,s,size=22,color='#243d51',bold=False):
    d.text((x,y),s,font=ImageFont.truetype(BOLD if bold else FONT,size),fill=color)
def line(points,fill='#36586c',width=3): d.line(points,fill=fill,width=width,joint='curve')
def label(name,point,xy,color='#243d51'):
    line([point,xy],color,2); d.ellipse((point[0]-5,point[1]-5,point[0]+5,point[1]+5),fill=color)
    text(xy[0]+6,xy[1]-23,name,20,color,True)
def arrow(a,b,color='#b99449',width=5):
    import math
    line([a,b],color,width)
    t=math.atan2(b[1]-a[1],b[0]-a[0]); l=15
    d.polygon([b,(b[0]-l*math.cos(t-.5),b[1]-l*math.sin(t-.5)),(b[0]-l*math.cos(t+.5),b[1]-l*math.sin(t+.5))],fill=color)

text(42,24,'CONSTANTINOPLE 715  /  LOCKED LAYOUT GUIDE',31,bold=True)
text(42,66,'Schematic art blockout before generation. Not a surveyed reconstruction; not final artwork.',20)
text(42,99,'C01: parallel, 35 deg elevation, looking NE from SW.  L01: warm upper-left light; shadows lower-right.',18)
# Mainland must continue beyond the western land wall. This is not an island.
d.polygon([(0,410),(340,450),(680,820),(640,1024),(0,1024)],fill='#d5d4b2')
# Separate north and south waters; unpainted mainland along the left is deliberate.
d.polygon([(0,180),(860,150),(1510,185),(1280,290),(900,325),(700,260),(340,450),(0,410)],fill='#b0c9cd')
d.polygon([(1280,290),(1536,300),(1536,1024),(640,1024),(680,820),(1120,610)],fill='#8faebd')
city=[(340,450),(700,260),(1040,225),(1280,290),(1210,480),(1120,610),(680,820)]
d.polygon(city,fill='#e7d7b7')
north=[(340,450),(700,260),(1040,225),(1280,290)]
south=[(680,820),(1120,610),(1210,480),(1280,290)]
line(north,'#788577',9); line(south,'#788577',9)
# Layered western defenses: two lines ONLY on the landward side.
line([(340,450),(680,820)],'#60594e',22)
line([(295,485),(635,855)],'#92816c',12)
line([(255,515),(595,885)],'#baa87f',12)
line([(470,700),(530,650),(735,535),(960,410)],'#c1a275',16)
# Low district groups indicate hierarchy; not a procedural depiction of buildings.
for poly in [[(430,440),(635,330),(720,390),(520,500)],[(550,525),(710,440),(765,485),(610,580)],[(690,650),(790,590),(850,635),(745,695)]]:
    d.polygon(poly,fill='#cda17e',outline='#9b765c')
# Landmark mass: broad dome, two semidomes, weighty supporting basilica.
d.polygon([(940,410),(1040,345),(1160,410),(1060,477)],fill='#bdb8a6',outline='#60594e',width=3)
d.polygon([(940,410),(940,365),(1040,300),(1160,365),(1160,410),(1060,477),(1060,430)],fill='#e9dfc8',outline='#60594e',width=3)
d.rectangle((981,320,1116,350),fill='#777e7c',outline='#454844',width=3)
d.pieslice((981,255,1116,385),180,360,fill='#8e9692',outline='#454844',width=3)
d.ellipse((945,346,1006,386),fill='#8e9692',outline='#454844',width=2)
d.ellipse((1097,349,1155,388),fill='#8e9692',outline='#454844',width=2)
# Hippodrome and palace are distinct lower precincts.
d.polygon([(815,568),(948,460),(992,492),(860,601)],fill='#f0e5ca',outline='#997b50',width=6)
line([(849,570),(956,487)],'#b99449',4)
d.polygon([(1045,515),(1130,454),(1193,490),(1101,558)],fill='#cebca0',outline='#8b857c',width=4)
slots={
 'market':{'center':[730,535],'polygon':[[660,527],[735,483],[797,524],[727,570]],'class':'R/I'},
 'port':{'center':[925,710],'polygon':[[878,675],[943,639],[1008,690],[951,739]],'class':'H coast / R facility / I upgrade'},
 'granary':{'center':[818,646],'polygon':[[767,629],[831,594],[883,632],[820,670]],'class':'R/I'}
}
for name,slot in slots.items():
    d.polygon(slot['polygon'],outline='#984b67',width=5)
    text(slot['center'][0]-20,slot['center'][1]-12,name[0].upper(),22,'#984b67',True)
line([(920,689),(963,720)],'#876646',9)
label('NORTH / GOLDEN HORN', (610,300),(70,230))
label('SOUTH / SEA OF MARMARA',(1117,687),(1120,825))
label('H: Hagia Sophia / R: minor attachments',(1050,278),(1000,169))
label('H: Hippodrome (elongated civic void)',(902,535),(942,915))
label('H: Palace precinct / R: low courts',(1125,512),(1100,570))
label('H: layered LAND defenses / R: gate form',(430,560),(35,599))
label('Mainland continues west',(210,730),(30,800))
label('Lower SEA wall; single coastal line',(1200,490),(1100,640))
label('R: market beside through-route',(730,535),(396,310))
label('R: stores inland of the port',(818,646),(760,840))
label('H: Marmara harbor / R: selected landing',(955,710),(912,763))
d.ellipse((760,791,776,807),outline='#9b354f',width=3)
line([(748,799),(788,799)],'#9b354f',2);line([(768,779),(768,819)],'#9b354f',2)
text(42,920,'Ground anchor: (768,799) / strategic canvas 1536 x 1024',19,bold=True)
text(42,949,'H = supported relationship; R = reconstruction; I = artistic compression.',19)
text(42,978,'No scale in metres. Upgrade slots are illustrative gameplay choices, not excavated locations.',17)
arrow((170,135),(280,192));text(80,140,'L01 light',18,'#99753b')
arrow((1380,370),(1315,332),'#243d51',3);text(1280,306,'N',20,bold=True)
arrow((1380,370),(1445,332),'#243d51',3);text(1455,312,'E',20,bold=True)
im.save(ROOT/'guides/city-layout-annotated.png')
layout={'canvas':[1536,1024],'camera':'C01','elevation_degrees':35,'projection':'parallel','look':'NE from SW','light':'L01 upper-left, shadows lower-right','anchor':[768,799],'peninsula_polygon':city,'north_shore':north,'south_shore':south,'land_wall':[[340,450],[680,820]],'road_gate':[520,650],'hagia_sophia_ground_center':[1050,410],'hippodrome_center':[905,535],'palace_center':[1125,512],'slots':slots,'note':'Illustrative compressed art blockout. Output compliance must be reviewed, not assumed.'}
(ROOT/'guides/layout.json').write_text(json.dumps(layout,indent=2)+'\n',encoding='utf-8')
# Read committed synthetic evidence, never another worktree or personal saves.
ref='29f34b333ff4c424e0b0a987838138a4bf697d94'
source='artifacts/phase-r/umayyad-390x844.png'
raw=subprocess.check_output(['git','show',ref+':'+source])
(ROOT/'references/phase-r-synthetic-390x844.png').write_bytes(raw)
proof={'source_commit':ref,'source_path':source,'sha256':hashlib.sha256(raw).hexdigest(),'test_script':'tests/phase-r-ui.cjs','test_method':'Fresh Playwright context; Game.newGame; synthetic legacy-save payload; screenshot after entering Umayyad campaign. No owner saves. Existing committed screenshot copied read-only.','viewport_css':[390,844],'device_scale_factor':1,'device':'Edge mobile emulation, not a physical phone','captured_this_pilot':False,'screenshot_unmodified':True,'composite_warning':'Any artwork placed over this screenshot is an offline composition experiment, not a screenshot of game integration.'}
(ROOT/'references/phase-r-provenance.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
print(ROOT/'guides/city-layout-annotated.png')
