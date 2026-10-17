"""Bounded replacement patches; never regenerate a whole progression state."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter,ImageChops
from prepare_assets import ROOT,SIZE,cleanup,register

base=Image.open(ROOT/'layers/compact-v2-fixed.png').convert('RGBA')
donors={'facilities':cleanup(ROOT/'drafts/B-facilities-donor.png'),'defense':cleanup(ROOT/'drafts/B-defense-donor.png')}
regions=json.loads((ROOT/'guides/upgrade-regions-v2.json').read_text())
# Fit to donor extents after inspection, not to whole-image differences.
# The extended port region is entirely seaward; it does not move the shore.
regions['regions']['market']=[[608,545],[698,518],[800,567],[778,601],[750,619],[710,608],[674,593],[629,580]]
regions['regions']['port']=[[1090,687],[1155,680],[1330,732],[1330,828],[1139,790]]
regions['regions']['defense']=[[355,581],[467,557],[551,603],[559,768],[488,808],[351,773]]
regions['revision_note']='Final bounded masks fit the generated canopy, seaward pier extension and gateway buttresses. Earlier guides preserved. Coastline and neighboring facilities remain outside edit regions.'
(ROOT/'guides/upgrade-regions-final.json').write_text(json.dumps(regions,indent=2)+'\n')

def replace_region(old,new,mask):
    # Interpolate premultiplied RGBA so alpha-bearing shoreline patches have
    # no artificial black fringe. Byte identity outside the mask is explicit.
    a=np.asarray(old,dtype=np.float32)/255; b=np.asarray(new,dtype=np.float32)/255
    w=np.asarray(mask,dtype=np.float32)[:,:,None]/255
    alpha=a[:,:,3:4]*(1-w)+b[:,:,3:4]*w
    rgb=(a[:,:,:3]*a[:,:,3:4]*(1-w)+b[:,:,:3]*b[:,:,3:4]*w)/np.maximum(alpha,1e-8)
    out=np.clip(np.rint(np.concatenate([rgb,alpha],axis=2)*255),0,255).astype('uint8')
    untouched=np.asarray(mask)==0
    out[untouched]=np.asarray(old)[untouched]
    return Image.fromarray(out)

masks={};bounds={};patches={}
for name,poly in regions['regions'].items():
    hard=Image.new('L',SIZE);ImageDraw.Draw(hard).polygon([tuple(pt) for pt in poly],fill=255)
    feather=hard.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(1.3))
    mask=ImageChops.multiply(feather,hard)
    masks[name]=mask; bounds[name]=mask.getbbox()
    mask.save(ROOT/f'layers/{name}-replacement-mask.png')
    donor=donors['defense' if name=='defense' else 'facilities']
    patches[name]=donor
    donor.crop(bounds[name]).save(ROOT/f'layers/{name}-replacement-crop.png')
    for other,prev in masks.items():
        if other!=name: assert not np.any((np.asarray(mask)>0)&(np.asarray(prev)>0)),(name,other)

states={'S0':base}; checks=[]
for before,after,region in [('S0','S1','market'),('S1','S2','port'),('S2','S3','granary'),('S3','S3-defense','defense')]:
    old=states[before]; new=replace_region(old,patches[region],masks[region]);states[after]=new
    aa=np.asarray(old);bb=np.asarray(new);changed=np.any(aa!=bb,axis=2)
    outside=np.asarray(masks[region])==0
    assert not changed[outside].any()
    prior=regions['state_mapping'][before]
    retained={r:int(changed[np.asarray(masks[r])>0].sum()) for r in prior}
    assert not any(retained.values())
    added=changed&(aa[:,:,3]<=8)&(bb[:,:,3]>8)
    removed=changed&(aa[:,:,3]>8)&(bb[:,:,3]<=8)
    replaced=changed&(aa[:,:,3]>8)&(bb[:,:,3]>8)
    check={'from':before,'to':after,'region':region,'changed_pixels':int(changed.sum()),'outside_mask_changed_pixels':int(changed[outside].sum()),'prior_facility_changed_pixels':retained,'new_coverage_pixels':int(added.sum()),'replaced_coverage_pixels':int(replaced.sum()),'removed_coverage_pixels':int(removed.sum())}
    checks.append(check)
    heat=np.zeros((SIZE[1],SIZE[0],3),dtype='uint8');heat[:]=[28,43,57]
    heat[aa[:,:,3]>8]=[72,96,112]
    heat[replaced]=[234,97,162];heat[added]=[66,218,151];heat[removed]=[244,172,68]
    Image.fromarray(heat).save(ROOT/f'evidence/difference-{before}-{after}.png')

for name,state in states.items(): register(state).save(ROOT/f'states/{name}.png')
# Verify actual deliverable exports outside each transformed mask plus filter support.
for c in checks:
    a=np.asarray(Image.open(ROOT/f"states/{c['from']}.png"));b=np.asarray(Image.open(ROOT/f"states/{c['to']}.png"))
    mask_rgba=Image.new('RGBA',SIZE,(255,255,255,0));mask_rgba.putalpha(masks[c['region']])
    support=register(mask_rgba).getchannel('A').filter(ImageFilter.MaxFilter(9))
    exported_changes=np.any(a!=b,axis=2)
    c['registered_outside_filter_support_changed_pixels']=int(exported_changes[np.asarray(support)==0].sum())
    assert c['registered_outside_filter_support_changed_pixels']==0

manifest={'method':'One fixed compact-v2 master + three bounded facility replacements + one separate gate replacement. S0/S1/S2/S3 are never independent generations.','masks':{k:{'bbox':list(bounds[k]),'mask':f'layers/{k}-replacement-mask.png','donor_crop':f'layers/{k}-replacement-crop.png'} for k in masks},'checks':checks,'geometry_scope':'Pixel identity outside the edit regions is proved. Historical correctness and aesthetic continuity require visual review.','not_claimed':['Owner style approval','QA17 human success','Physical-device performance','Tiny-scale upgrade recognition'],'state_meaning':'Illustrative gameplay development, not exact historical upgrade stages in 715.'}
(ROOT/'evidence/modularity-verification.json').write_text(json.dumps(manifest,indent=2)+'\n')

font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20);bold=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',27)
def board(size,title,subtitle):
    im=Image.new('RGB',size,'#f5f1e5');d=ImageDraw.Draw(im);d.text((26,20),title,font=bold,fill='#243d51');d.text((26,60),subtitle,font=font,fill='#53636c');return im,d
overview,d=board((1100,920),'CUMULATIVE UPGRADES / FIXED CITY','Overview only: 500px panels. Actual CSS-scale evidence is separate.')
for i,(name,desc) in enumerate([('S0','Base city'),('S1','Market'),('S2','Market + port'),('S3','Market + port + granary')]):
    x=30+(i%2)*550;y=112+(i//2)*390
    d.text((x,y),name+'  '+desc,font=bold,fill='#243d51')
    sm=Image.open(ROOT/f'states/{name}.png').resize((500,333),Image.Resampling.LANCZOS);overview.paste(sm,(x,y+40),sm)
overview.save(ROOT/'evidence/B-cumulative-overview.png')
defense,d=board((1100,750),'SEPARATE DEFENSE COMPARISON','S3 facilities retained; gateway patch only. Enlarged inspection, not phone scale.')
for i,name in enumerate(['S3','S3-defense']):
    x=30+i*550;d.text((x,108),name,font=bold,fill='#243d51')
    sm=Image.open(ROOT/f'states/{name}.png').resize((500,333),Image.Resampling.LANCZOS);defense.paste(sm,(x,148),sm)
    crop=states[name].crop((335,550,570,820));crop.thumbnail((210,242));defense.paste(crop,(x+130,482),crop)
defense.save(ROOT/'evidence/B-defense-comparison.png')
diff,d=board((1100,920),'WHAT CHANGED / PIXEL DIFFERENCES','Green: added coverage | pink: replaced | amber: removed | slate: unchanged')
for i,c in enumerate(checks):
    x=30+(i%2)*550;y=112+(i//2)*390
    d.text((x,y),c['from']+' > '+c['to'],font=bold,fill='#243d51')
    sm=Image.open(ROOT/f"evidence/difference-{c['from']}-{c['to']}.png").resize((500,333),Image.Resampling.NEAREST);diff.paste(sm,(x,y+40))
diff.save(ROOT/'evidence/B-difference-comparison.png')
guide=Image.new('RGB',SIZE,'#e5dac1');guide.paste(base,mask=base.getchannel('A'));gd=ImageDraw.Draw(guide)
colors={'market':'#dc3761','port':'#258bd1','granary':'#bc7a1b','defense':'#784dbd'}
for name,poly in regions['regions'].items():
    gd.line([tuple(pt) for pt in poly+[poly[0]]],fill=colors[name],width=4)
    x,y=poly[0];gd.text((x,y-30),name.upper(),fill=colors[name],font=font)
guide.save(ROOT/'guides/upgrade-regions-final.png')
print(json.dumps(checks,indent=2))
