#!/usr/bin/env python3
"""QA: detect overlaps between diagram elements and connectors crossing node bodies."""
from playwright.sync_api import sync_playwright
import json, sys

JS = """
() => {
  const root = document.getElementById('root');
  const rq = root.getBoundingClientRect();
  const rel = r => ({x:r.left-rq.left, y:r.top-rq.top, w:r.width, h:r.height, r:r.right-rq.left, b:r.bottom-rq.top});
  const sel = {
    pills: [...document.querySelectorAll('.uc')].map(e=>({id:e.dataset.id, ...rel(e.getBoundingClientRect())})),
    actors: [...document.querySelectorAll('.actor,.ext,.legend,.note')].map(e=>({id:e.dataset.id||e.className.split(' ')[1]||e.className, ...rel(e.getBoundingClientRect())})),
    texts: [...document.querySelectorAll('.title,.subtitle,.boundary-label,.zone-cap')].map(e=>({id:e.className, ...rel(e.getBoundingClientRect())})),
    svgLabels: [...document.querySelectorAll('#wires text')].map(e=>{
      const b = e.getBBox(); return {id:e.textContent, x:b.x, y:b.y, w:b.width, h:b.height};
    }),
    paths: [...document.querySelectorAll('#wires path')].filter(p=>p.getAttribute('d')).map(p=>{
      const L = p.getTotalLength(), pts=[];
      for(let i=0;i<=Math.min(400,Math.max(40,Math.round(L/4)));i++){
        const pt = p.getPointAtLength(L*i/Math.min(400,Math.max(40,Math.round(L/4))));
        pts.push([pt.x, pt.y]);
      }
      return {d:p.getAttribute('d').slice(0,60), pts, dashed: !!p.getAttribute('stroke-dasharray')};
    })
  };
  return sel;
}
"""

def overlap(a, b, pad=0):
    return not (a['r']+pad <= b['x'] or b['r']+pad <= a['x'] or a['b']+pad <= b['y'] or b['b']+pad <= a['y'])

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 2000, "height": 1470})
    page.goto("file:///tmp/usecase.html", wait_until="networkidle")
    page.wait_for_timeout(400)
    data = page.evaluate(JS)
    browser.close()

problems = []

# 1) pills vs pills / actors / panels
nodes = data['pills'] + data['actors']
for i in range(len(nodes)):
    for j in range(i+1, len(nodes)):
        a, b = nodes[i], nodes[j]
        if overlap(a, b, pad=1):
            problems.append(f"NODE OVERLAP: {a['id']} <-> {b['id']}")

# 2) titles/captions vs pills/actors
for t in data['texts']:
    for n in nodes:
        if overlap(t, n, pad=1):
            problems.append(f"TEXT OVERLAP: {t['id']} <-> {n['id']}")

# 3) svg edge labels vs pills/actors (labels have white halo; must not sit on node text)
for lb in data['svgLabels']:
    box = {'x':lb['x'],'y':lb['y'],'w':lb['w'],'h':lb['h'],'r':lb['x']+lb['w'],'b':lb['y']+lb['h'],'id':lb['id']}
    for n in data['pills'] + data['actors']:
        if overlap(box, n, pad=-2):   # tolerate 2px halo kiss
            problems.append(f"LABEL ON NODE: '{lb['id']}' over {n['id']} (label {box['x']:.0f},{box['y']:.0f})")
    for other in data['svgLabels']:
        if other is lb: continue
        ob = {'x':other['x'],'y':other['y'],'w':other['w'],'h':other['h'],'r':other['x']+other['w'],'b':other['y']+other['h']}
        if overlap(box, ob):
            problems.append(f"LABEL-LABEL: '{lb['id']}' vs '{other['id']}'")

# 4) connector paths through node interiors
for path in data['paths']:
    pts = path['pts']
    for n in data['pills']:
        # interior inset 3px; ignore first/last 3 samples (endpoints touch edges)
        inner = {'x':n['x']+3,'y':n['y']+3,'w':n['w']-6,'h':n['h']-6,'r':n['r']-3,'b':n['b']-3}
        hits = [pt for k,pt in enumerate(pts)
                if 3 < k < len(pts)-3 and inner['x']<pt[0]<inner['r'] and inner['y']<pt[1]<inner['b']]
        if hits:
            problems.append(f"PATH THRU NODE: {path['d']}... crosses {n['id']} at {hits[0]} ({len(hits)} pts)")

print(f"pills={len(data['pills'])} actors/ext/panels={len(data['actors'])} paths={len(data['paths'])} svgLabels={len(data['svgLabels'])}")
if problems:
    print(f"\n❌ {len(problems)} PROBLEM(S):")
    for pr in problems: print("  -", pr)
    sys.exit(1)
print("\n✅ GEOMETRY QA CLEAN: no node overlaps, no connector-through-node, no label collisions")
