#!/usr/bin/env python3
"""Bundle the project into one self-contained file: dist/index.html.

The split project is what you edit and what GitHub Pages serves. This bundle is for
handing someone a single file (email, USB stick, opening straight from disk) — the CSS,
every script and both sprite sheets are inlined, so it needs nothing beside it.
"""
import re, base64, pathlib, sys

ROOT=pathlib.Path(__file__).resolve().parent.parent
html=(ROOT/'index.html').read_text()

css=(ROOT/'styles'/'game.css').read_text()
html=html.replace('<link rel="stylesheet" href="styles/game.css">','<style>\n'+css+'\n</style>')

srcs=re.findall(r'<script src="([^"]+)"></script>', html)
assert srcs, 'no scripts found in index.html'
parts=[]
for rel in srcs:
    code=(ROOT/rel).read_text()
    parts.append('/* ===== '+rel+' ===== */\n'+code)
bundle='\n'.join(parts)

# sprite sheets become data URIs
def inline(m):
    path=ROOT/m.group(2)
    data=base64.b64encode(path.read_bytes()).decode()
    return m.group(1)+"'data:image/png;base64,"+data+"'"
n=[0]
def inline1(m):
    n[0]+=1
    return inline(m)
bundle=re.sub(r"(\w+:\s*)'(assets/[^']+\.png)'", inline1, bundle)
assert n[0]>=2, 'expected the sprite sheets to be inlined, found %d'%n[0]

block='\n'.join('<script src="%s"></script>'%s for s in srcs)
html=html.replace(block,'<script>\n'+bundle+'\n</script>')

out=ROOT/'dist'; out.mkdir(exist_ok=True)
(out/'index.html').write_text(html)
print('dist/index.html', len(html)//1024,'KB from', len(srcs),'scripts')
