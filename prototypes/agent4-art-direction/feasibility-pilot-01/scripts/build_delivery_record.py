"""Provenance and annotated pairing evidence for existing generated images."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw,ImageFont
from prepare_assets import ROOT

ORIGINALS=Path('C:/Users/Abdul/.codex/generated_images/01a136cf-fb4b-7520-8606-0647d44296ba')
calls=[
 ('G01','A1 style generation','A1-style-master.txt','drafts/A1-first-pass.png','exec-e57f2cce-a6e1-445c-96fa-1e4a338ca0c5.png',['guides/city-layout-annotated.png','../exploration/concepts/C-epic-historical-painting.png','../exploration/concepts/A-monumental-imperial-grandeur.png','../exploration/concepts/B-exquisite-illuminated-atlas-refined.png'],False),
 ('G02','A1 local historical/style correction','A1-refinement.txt','art/A1-style-master.png','exec-ec95becd-7f64-4076-8754-bd500ae3877c.png',['drafts/A1-first-pass.png'],False),
 ('G03','Dedicated compact interpretation','A2-strategic-city.txt','drafts/A2-generated.png','exec-c1edde9b-fff8-411e-95b3-39506b03a34f.png',['art/A1-style-master.png','guides/city-layout-annotated.png'],True),
 ('G04','First purpose-painted LOD','A2-compact-lod.txt','drafts/A2-lod-generated.png','exec-608f1788-0ce1-408b-9609-ba971d5ea014.png',['drafts/A2-generated.png'],True),
 ('G05','Matching inspection surroundings','A3-expanded-context.txt','drafts/A3-context-generated.png','exec-aae5525b-fb93-41e3-9ba4-13f5c16fa978.png',['drafts/A2-generated.png'],False),
 ('G06','Bounded final small-scale recomposition','A2-low-scale-recomposition.txt','drafts/A2-lod2-generated.png','exec-5d23ee3f-9dc4-46a3-a021-11d499f2e672.png',['drafts/A2-lod-generated.png'],True),
 ('G07','Three facility donor regions','B-facility-patches.txt','drafts/B-facilities-donor.png','exec-b8e876e2-ede1-4c11-8574-99a8a1524c06.png',['layers/compact-v2-fixed.png','guides/upgrade-regions-annotated-v2.png'],True),
 ('G08','Separate gate donor region','B-defense-patch.txt','drafts/B-defense-donor.png','exec-88fcc5fe-e6b6-4f52-8c50-4a13aa1ba47e.png',['layers/compact-v2-fixed.png','guides/upgrade-regions-annotated-v2.png'],True),
]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
records=[]
for id,role,prompt,file,original,inputs,transparent in calls:
    p=ROOT/file;assert p.read_bytes()==(ORIGINALS/original).read_bytes()
    prompt_path=ROOT/'prompts'/prompt
    with Image.open(p) as im:
        mode=im.mode;size=list(im.size);im.verify()
    records.append({'id':id,'role':role,'prompt':'prompts/'+prompt,'prompt_file_sha256':sha(prompt_path),'request_text_sha256':hashlib.sha256(prompt_path.read_text(encoding='utf-8').strip().encode()).hexdigest(),'request_text_note':'File text with surrounding whitespace stripped, as sent by the recorded execution.','inputs':[{'file':i,'sha256':sha(ROOT/i)} for i in inputs],'transparent_background_requested':transparent,'output':file,'original_tool_output_filename':original,'byte_identical_to_original':True,'sha256':sha(p),'dimensions_px':size,'mode':mode})
record={'project':'Suyuf Al-Mamalik / Imperial Illuminated Atlas / feasibility pilot 01','baseline_commit':'f31d11c570ece0e838fd000fb663317d31f8fc28','branch':'codex/agent4-imperial-art-direction','delivery_verified_date':'2026-10-17','tool':'image_gen.imagegen / image_gen__imagegen','model_version':None,'seed':None,'settings_note':'Built-in tool exposes no model/version, seed or exact raster-size control in this session. All measured outputs are 1536x1024.','call_count':len(records),'ordering_note':'IDs describe dependency order. G04/G05 and G07/G08 were independent concurrent calls; IDs do not assert their completion order. Generation dates/times were not separately logged.','calls':records,'offline_derivatives':'See scripts/prepare_assets.py, scripts/build_modularity.py and guides/registration.json. No procedural city art was substituted.','selected_deliverables':{'A1':'art/A1-style-master.png','A2':'art/A2-strategic-compact-v2.png','A3':'art/A3-expanded-inspection.png','S0':'states/S0.png','S1':'states/S1.png','S2':'states/S2.png','S3':'states/S3.png','defense':'states/S3-defense.png'},'approval_status':'Owner review pending. Production and Phase J integration not authorized.'}
(ROOT/'generation-record.json').write_text(json.dumps(record,indent=2)+'\n')

# Pairing markers are a review aid, not final city artwork.
out=Image.new('RGB',(1600,900),'#f5f1e5');d=ImageDraw.Draw(out)
bold=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',29);body=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
d.text((30,20),'SAME CITY IDENTITY / DIFFERENT LEVELS OF DETAIL',font=bold,fill='#243d51')
d.text((30,66),'Topology correspondence only. Compact repaint is not pixel-identical to the expanded city.',font=body,fill='#53636c')
points=[[(1130,300),(680,435),(1060,540),(450,700),(1180,740)],[(1155,250),(705,395),(1090,450),(450,780),(1250,760)]]
for i,(file,title) in enumerate([('layers/compact-v2-fixed.png','A2 compact repaint / source layout'),('art/A3-expanded-inspection.png','A3 inspection / fixed detailed source')]):
    x=28+i*800;y=155;im=Image.open(ROOT/file).convert('RGBA').resize((744,496),Image.Resampling.LANCZOS)
    out.paste(im,(x,y),im);d.text((x,116),title,font=body,fill='#243d51')
    for n,(px,py) in enumerate(points[i],1):
        xx=x+px*744/1536;yy=y+py*496/1024
        d.ellipse((xx-16,yy-16,xx+16,yy+16),fill='#243d51',outline='#f4dc95',width=2)
        d.text((xx-6,yy-12),str(n),font=body,fill='white')
for j,line in enumerate(['1  Hagia Sophia / eastern core     2  Hippodrome / southwest of church',
                         '3  Low palace precinct / southeast     4  Western land gateway     5  Southern Marmara landing',
                         'Major relationships persist; church scale, minor districts and gate spacing are artistically compressed.',
                         'A3 retains the detailed source pixels. A2 v2 needs a calibrated repaint before exact paired geometry is claimed.']):
    d.text((30,690+j*45),line,font=body,fill='#243d51')
out.save(ROOT/'evidence/A2-A3-identity-comparison.png')

manifest=[]
for p in sorted(ROOT.rglob('*.png')):
    with Image.open(p) as im:
        im.verify()
    with Image.open(p) as im:
        entry={'file':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size,'dimensions_px':list(im.size),'mode':im.mode}
        if im.mode=='RGBA':
            h=im.getchannel('A').histogram();entry['alpha']={'min':im.getchannel('A').getextrema()[0],'max':im.getchannel('A').getextrema()[1],'fully_transparent_pixels':h[0],'fully_opaque_pixels':h[255],'partial_alpha_pixels':sum(h[1:255])}
        manifest.append(entry)
(ROOT/'asset-manifest.json').write_text(json.dumps({'date':'2026-10-17','images':manifest,'memory_note':'A 1536x1024 RGBA decoded buffer uses 6291456 bytes (6 MiB), regardless of PNG transfer bytes. These are authoring/evidence files, not measured runtime budgets.'},indent=2)+'\n')
print(json.dumps({'imagegen_calls':len(records),'original_outputs_verified':len(records),'png_files_verified':len(manifest)},indent=2))
