from PIL import Image
import numpy as np, json, base64, os
from scipy import ndimage

SRC='/root/.claude/uploads/eb277529-9727-56a5-9403-7d548a1a0c27/0153d5c4-image.png'
im=Image.open(SRC).convert('RGBA')
A=np.array(im); M=A[:,:,3]>30
lab,_=ndimage.label(M,np.ones((3,3)))

def region(x0,x1,y0,y1):
    """Everything inside the box, minus cast shadows and bits of the neighbouring frames."""
    sub=A[y0:y1, x0:x1].copy()
    sl=lab[y0:y1, x0:x1]
    W=x1-x0
    parts=[]
    for i in (int(v) for v in np.unique(sl) if v):
        ys,xs=np.where(sl==i)
        parts.append({'i':i,'a':len(ys),'x0':xs.min(),'x1':xs.max(),'y0':ys.min(),'y1':ys.max()})
    if not parts: return None
    main=max(parts,key=lambda p:p['a'])
    keep=np.zeros_like(sl,dtype=bool)
    for p in parts:
        w=p['x1']-p['x0']+1; h=p['y1']-p['y0']+1
        if p is not main:
            if w>h*3 and p['y0']>=main['y1']-6: continue          # flat cast shadow
            if p['a']<main['a']*0.08 and (p['x0']<=1 or p['x1']>=W-2): continue   # clipped bit of the next frame
            dx=max(main['x0']-p['x1'], p['x0']-main['x1'], 0)
            dy=max(main['y0']-p['y1'], p['y0']-main['y1'], 0)
            if (dx*dx+dy*dy)**.5>55: continue                      # too far to belong here
        keep|=(sl==p['i'])
    sub[~keep]=0
    m=sub[:,:,3]>30
    if not m.any(): return None
    ys,xs=np.where(m)
    sub=sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
    return Image.fromarray(sub)

# name -> (x0,x1,y0,y1)
BOXES={
 'run0':(457,672,40,310),   'run1':(678,918,40,310),  'run2':(901,1121,40,310),
 'run3':(1121,1334,40,310), 'run4':(1337,1536,40,310),
 'idle':(14,199,313,592),   'stand':(196,400,313,592), 'crouch':(396,607,313,592),
 'jump':(653,879,305,592),  'fall':(857,1121,313,592),
 'attack':(240,640,589,812),                  # the big orb cast
 'hurt':(745,930,805,1020),                   # surprised, with the "!"
 'think':(574,748,805,1020),                  # the "?" pose, shown while a question is open
 'down':(1155,1370,860,1020),                 # lying down, for game over
}
ORDER=list(BOXES)
S=float(os.environ.get('SCALE','0.40'))
COLORS=int(os.environ.get('COLORS','160'))
PAD=2

frames=[]
for name in ORDER:
    x0,x1,y0,y1=BOXES[name]
    img=region(x0,x1,y0,y1)
    assert img is not None, name
    w,h=img.size
    img=img.resize((max(1,round(w*S)),max(1,round(h*S))),Image.LANCZOS)
    m=np.array(img)[:,:,3]>30
    ys,xs=np.where(m)
    low=ys.max()-max(2,int((ys.max()-ys.min())*0.15))
    frames.append({'n':name,'img':img,'ax':float(xs[ys>=low].mean()),'ay':float(ys.max())})

cols=4; rn=(len(frames)+cols-1)//cols
cw=max(f['img'].size[0] for f in frames)+PAD*2
ch=max(f['img'].size[1] for f in frames)+PAD*2
atlas=Image.new('RGBA',(cw*cols,ch*rn),(0,0,0,0)); meta={}
for k,f in enumerate(frames):
    cx=(k%cols)*cw+PAD; cy=(k//cols)*ch+PAD
    atlas.paste(f['img'],(cx,cy))
    meta[f['n']]=[cx,cy,f['img'].size[0],f['img'].size[1],round(f['ax'],1),round(f['ay'],1)]
q=atlas.quantize(colors=COLORS,method=Image.FASTOCTREE).convert('RGBA')
q.save('sensei.png',optimize=True)
b64=base64.b64encode(open('sensei.png','rb').read()).decode()
open('sensei_b64.txt','w').write(b64)
json.dump(meta,open('sensei_meta.json','w'))
print('atlas',atlas.size,'png',os.path.getsize('sensei.png')//1024,'KB  base64',len(b64)//1024,'KB')
print('idle h',meta['idle'][3],'attack w',meta['attack'][2])
