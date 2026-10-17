"""Offline registration/compositing of genuine generated art; no city geometry is drawn."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
SIZE=(1536,1024)
SCALE=.76
SOURCE_ANCHOR=(768,953)
ANCHOR=(768,799)
OFFSET=(round(ANCHOR[0]-SCALE*SOURCE_ANCHOR[0]),round(ANCHOR[1]-SCALE*SOURCE_ANCHOR[1]))

def cleanup(src):
    im=Image.open(src).convert('RGBA')
    a=np.array(im)
    # Preserve original files. Remove only nearly invisible haze and close the
    # generator's near-opaque ceiling (254) for a solid architectural core.
    a[:,:,3]=np.where(a[:,:,3]<=8,0,np.where(a[:,:,3]>=250,255,a[:,:,3]))
    return Image.fromarray(a)

def register(im):
    resized=im.resize((round(SIZE[0]*SCALE),round(SIZE[1]*SCALE)),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',SIZE)
    out.alpha_composite(resized,OFFSET)
    return out

if __name__=='__main__':
    detail=cleanup(ROOT/'drafts/A2-generated.png')
    compact=cleanup(ROOT/'drafts/A2-lod-generated.png')
    detail.save(ROOT/'layers/detail-city-fixed.png')
    compact.save(ROOT/'layers/compact-city-fixed.png')
    register(detail).save(ROOT/'art/A2-strategic-detail.png')
    register(compact).save(ROOT/'art/A2-strategic-compact.png')
    # Preserve original detailed architecture over a generated environmental plate.
    background=Image.open(ROOT/'drafts/A3-context-generated.png').convert('RGBA')
    expanded=Image.alpha_composite(background,detail)
    expanded.convert('RGB').save(ROOT/'art/A3-expanded-inspection.png')
    aa=np.array(detail); ee=np.array(expanded)
    opaque=aa[:,:,3]==255
    fixed_errors=int(np.any(aa[:,:,:3]!=ee[:,:,:3],axis=2)[opaque].sum())
    assert fixed_errors==0
    data={'canvas':list(SIZE),'source_anchor':list(SOURCE_ANCHOR),'registered_anchor':list(ANCHOR),'uniform_scale':SCALE,'translation_px':list(OFFSET),'resampling':'Pillow LANCZOS, one fixed registration, not per-state fitting','alpha_cleanup':'alpha <=8 becomes 0; alpha >=250 becomes 255; all intermediate values retained. Original generated RGBA preserved in drafts.','expanded_composite':'A2 detailed fixed city alpha-composited over A3 generated environmental plate; no source city pixels moved.','opaque_source_pixels':int(opaque.sum()),'opaque_source_rgb_mismatches_in_expanded':fixed_errors,'status':'Technical registration only; no owner approval or historic certification.'}
    (ROOT/'guides/registration.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(data,indent=2))
    # Diagnostic raster sheet. Browser CSS-size evidence is captured separately.
    sheet=Image.new('RGB',(1000,660),'#f5f1e5');draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
    for row,(name,im) in enumerate([('Initial detailed interpretation',register(detail)),('Purpose-painted compact LOD',register(compact))]):
        draw.text((24,20+row*315),name,fill='#243d51',font=font)
        for i,w in enumerate([32,48,64,96]):
            x=30+i*245;y=65+row*315
            draw.text((x,y),f'{w}px canvas',fill='#243d51',font=font)
            small=im.resize((w,round(w*2/3)),Image.Resampling.LANCZOS)
            for j,bg in enumerate(['#ddcba7','#303b42','#36586c']):
                draw.rectangle((x,y+35+j*68,x+220,y+95+j*68),fill=bg)
                sheet.paste(small,(x+20,y+35+j*68),small)
    sheet.save(ROOT/'evidence/LOD-reduction-diagnostic.png')
