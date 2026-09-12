#!/usr/bin/env python3
"""Generate + render UML Use Case Diagram 'Jajan Riyen' via Playwright+CSS (charts skill route)."""
import os

HTML_PATH = "/tmp/usecase.html"
PNG_PATH = "/home/z/my-project/docs/usecase.png"

# ---------------------------------------------------------------- CSS
CSS = """
* { margin:0; padding:0; box-sizing:border-box; }
:root{
  --teal-900:#134E4A; --teal-700:#0F766E; --teal-600:#0D9488; --teal-500:#14B8A6;
  --teal-50:#F0FDFA; --em-700:#047857; --em-600:#10B981; --em-50:#ECFDF5;
  --ink:#1F2937; --muted:#64748B; --line:#94A3B8;
}
body{ font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
      background:#FFFFFF; color:var(--ink); -webkit-font-smoothing:antialiased; }
#root{ position:relative; width:1960px; height:1430px; background:#FFFFFF; overflow:hidden; }

.title{ position:absolute; top:26px; left:0; width:1960px; text-align:center;
        font-size:27px; font-weight:800; color:var(--teal-900); letter-spacing:.2px; }
.subtitle{ position:absolute; top:64px; left:0; width:1960px; text-align:center;
           font-size:14.5px; color:var(--muted); font-weight:500; }

/* system boundary */
.boundary{ position:absolute; left:370px; top:150px; width:1220px; height:1220px;
           border:2.5px solid var(--teal-600); border-radius:26px; background:#FFFFFF; z-index:0; }
.boundary-label{ position:absolute; top:14px; left:0; width:100%; text-align:center;
                 font-size:19px; font-weight:800; color:var(--teal-700); }

/* swim zones */
.zone{ position:absolute; border-radius:18px; z-index:1; }
.zone-cap{ position:absolute; top:6px; left:0; width:100%; text-align:center;
           font-size:11.5px; font-weight:700; letter-spacing:1.4px; color:var(--teal-600); }
.zl{ left:392px; top:240px; width:326px; height:1068px; background:rgba(13,148,136,.045);
     border:1.5px dashed rgba(13,148,136,.30); }
.zm{ left:832px; top:240px; width:336px; height:1068px; background:rgba(15,118,110,.028);
     border:1.5px dashed rgba(15,118,110,.22); }
.zr{ left:1242px; top:240px; width:306px; height:780px; background:rgba(16,185,134,.05);
     border:1.5px dashed rgba(4,120,87,.30); }
.zr .zone-cap{ color:var(--em-700); }

/* use case pills */
.uc{ position:absolute; z-index:2; width:300px; min-height:60px; border-radius:16px;
     display:flex; align-items:center; justify-content:center; text-align:center;
     padding:9px 16px; font-size:13.5px; font-weight:600; line-height:1.32;
     box-shadow:0 1px 3px rgba(15,118,110,.10); }
.uc.buy   { background:var(--teal-50); border:2px solid var(--teal-500); color:var(--teal-700); }
.uc.sell  { background:var(--em-50);  border:2px solid var(--em-600);  color:#065F46; }
.uc.share { background:#FFFFFF;      border:2px solid var(--teal-600); color:var(--teal-700); }
.badge{ position:absolute; top:-9px; left:-9px; width:20px; height:20px; border-radius:50%;
        color:#fff; font-size:10.5px; font-weight:800; display:flex; align-items:center;
        justify-content:center; box-shadow:0 0 0 2px #FFFFFF; }
.buy .badge { background:var(--teal-700); }
.sell .badge{ background:var(--em-700); }
.share .badge{ background:var(--teal-600); }

/* actors */
.actor{ position:absolute; z-index:2; text-align:center; }
.actor .nm{ font-size:17px; font-weight:800; color:var(--teal-900); margin-top:4px; }
.actor .sub{ font-size:11.5px; color:var(--muted); margin-top:2px; }

/* external systems */
.ext{ position:absolute; z-index:2; background:#FFFFFF; border:2px solid var(--teal-600);
      border-radius:14px; text-align:center; padding:10px 12px 11px;
      box-shadow:0 2px 6px rgba(15,118,110,.12); }
.ext .st{ font-size:11px; font-style:italic; font-weight:600; color:var(--teal-600); letter-spacing:.4px; }
.ext .nm{ font-size:15px; font-weight:800; color:var(--teal-900); margin-top:3px; }
.ext .sb{ font-size:10.8px; color:var(--muted); margin-top:3px; }

/* legend + note */
.panel{ position:absolute; z-index:2; }
.legend{ left:845px; top:280px; width:310px; background:#F8FAFC; border:1.5px solid #E2E8F0;
         border-radius:14px; padding:14px 16px 12px; }
.legend .lt{ font-size:12px; font-weight:800; letter-spacing:1.6px; color:var(--teal-700);
             margin-bottom:9px; }
.li{ display:flex; align-items:center; gap:11px; padding:5.5px 0; font-size:12.4px; color:#374151; }
.li svg{ flex:0 0 46px; }
.note{ left:845px; top:582px; width:310px; background:#FFFBEB; border:1.5px solid #FCD34D;
       border-radius:10px; padding:12px 16px 13px; overflow:visible; }
.note .fold{ position:absolute; top:-1.5px; right:-1.5px; width:22px; height:22px;
             background:linear-gradient(225deg,#FFFFFF 0 50%,#FDE68A 50%); border-radius:0 8px 0 4px; }
.note .nt{ font-size:11px; font-weight:800; letter-spacing:1.6px; color:#92400E; margin-bottom:6px; }
.note p{ font-size:12.2px; color:#78350F; line-height:1.5; margin-top:4px; padding-left:13px;
         position:relative; }
.note p::before{ content:'\\2022'; position:absolute; left:0; color:#B45309; }

#wires{ position:absolute; left:0; top:0; z-index:3; pointer-events:none; }
"""

# ---------------------------------------------------------------- pills
# (id, num, text, cls, x, y)
PILLS = [
    # left column — pembeli
    ("uc2",  "2",  "Menjelajah &amp; mencari UMKM / produk",             "buy",   405, 270),
    ("uc5",  "5",  "Mengelola keranjang (satu UMKM per transaksi)",      "buy",   405, 376),
    ("uc6",  "6",  "Checkout &amp; memilih metode bayar (Tunai / QRIS)", "buy",   405, 482),
    ("uc7",  "7",  "Melacak pesanan &amp; barcode (timeline)",           "buy",   405, 588),
    ("uc8",  "8",  "Membatalkan pesanan (status PENDING saja)",          "buy",   405, 694),
    ("uc10", "10", "Memasang aplikasi (PWA / install ke HP)",            "buy",   405, 800),
    ("uc9",  "9",  "Mendaftar menjadi penjual",                          "buy",   405, 906),
    ("uc3",  "3",  "Mengurutkan berdasarkan jarak terdekat (GPS)",       "buy",   405, 1012),
    ("uc4",  "4",  "Mengatur lokasi (GPS / pilih area manual)",          "buy",   405, 1118),
    ("uc1",  "1",  "Login dengan kode OTP (WA/SMS)",                     "buy",   405, 1224),
    # right column — penjual
    ("uc12", "12", "Mengelola toko (logo, banner, jam buka)",            "sell", 1245, 270),
    ("uc13", "13", "Mengaktifkan &amp; mengunggah QRIS penjual",         "sell", 1245, 376),
    ("uc14", "14", "Mengelola produk (tambah/hapus, foto, stok)",        "sell", 1245, 482),
    ("uc15", "15", "Menetapkan flash sale produk",                       "sell", 1245, 588),
    ("uc16", "16", "Memproses pesanan (Terima / Tandai Selesai)",        "sell", 1245, 694),
    ("uc17", "17", "Memindai barcode pembeli (kamera HP)",               "sell", 1245, 800),
    ("uc11", "11", "Mengelola profil &amp; data diri (Nama KTP, NIK 16 digit, alamat)", "sell", 1245, 906),
    # middle column — shared / integration
    ("ucLok", "9a", "Menentukan lokasi toko (pin peta / share Gmaps)",   "share", 850, 813),
    ("uc19",  "19", "Menampilkan peta, pin lokasi &amp; koordinat",      "share", 850, 1040),
    ("uc18",  "18", "Menerima kode OTP via WA/SMS",                      "share", 850, 1194),
]

def pill_html(pid, num, text, cls, x, y):
    badge = f'<div class="badge">{num}</div>' if num else ""
    return (f'<div class="uc {cls}" data-id="{pid}" style="left:{x}px;top:{y}px;">'
            f'{badge}<span>{text}</span></div>')

PILLS_HTML = "\n".join(pill_html(*p) for p in PILLS)

# ---------------------------------------------------------------- actors & externals
STICK = """<svg width="96" height="118" viewBox="0 0 96 118" fill="none">
<circle cx="48" cy="16" r="13.5" stroke="#0F766E" stroke-width="3.6"/>
<line x1="48" y1="30" x2="48" y2="70" stroke="#0F766E" stroke-width="3.6" stroke-linecap="round"/>
<line x1="21" y1="47" x2="75" y2="47" stroke="#0F766E" stroke-width="3.6" stroke-linecap="round"/>
<line x1="48" y1="70" x2="28" y2="104" stroke="#0F766E" stroke-width="3.6" stroke-linecap="round"/>
<line x1="48" y1="70" x2="68" y2="104" stroke="#0F766E" stroke-width="3.6" stroke-linecap="round"/>
</svg>"""

CHAT_ICON = """<svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="margin-bottom:2px">
<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.3c-1.5 0-2.9-.35-4.1-1L3 20l1.3-4.1A8 8 0 0 1 3.5 11.5 8.38 8.38 0 0 1 12 3.2a8.38 8.38 0 0 1 9 8.3z" stroke="#0D9488" stroke-width="1.9" stroke-linejoin="round"/>
<path d="M8.5 10.5h7M8.5 13.5h4.5" stroke="#0D9488" stroke-width="1.9" stroke-linecap="round"/></svg>"""

PIN_ICON = """<svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="margin-bottom:2px">
<path d="M20 10.4c0 5.6-8 11.1-8 11.1s-8-5.5-8-11.1a8 8 0 1 1 16 0z" stroke="#0D9488" stroke-width="1.9" stroke-linejoin="round"/>
<circle cx="12" cy="10.4" r="2.9" stroke="#0D9488" stroke-width="1.9"/></svg>"""

ACTORS_HTML = f"""
<div class="actor" data-id="act-buy" style="left:137px; top:540px; width:96px;">
  {STICK}<div class="nm">Pembeli</div><div class="sub">pengguna aplikasi</div>
</div>
<div class="actor" data-id="act-sell" style="left:1727px; top:434px; width:96px;">
  {STICK}<div class="nm">Penjual UMKM</div><div class="sub">pemilik toko</div>
</div>
<div class="ext" data-id="ext-gw" style="left:70px; top:1148px; width:230px;">
  {CHAT_ICON}<div class="st">&#171;eksternal&#187;</div>
  <div class="nm">Gateway WA/SMS</div><div class="sb">Fonnte / Wablas / Twilio</div>
</div>
<div class="ext" data-id="ext-map" style="left:1655px; top:1083px; width:240px;">
  {PIN_ICON}<div class="st">&#171;eksternal&#187;</div>
  <div class="nm">Layanan Peta</div><div class="sb">Leaflet OSM / Google Maps</div>
</div>
"""

# ---------------------------------------------------------------- legend & note
LEGEND_HTML = """
<div class="panel legend">
  <div class="lt">LEGENDA</div>
  <div class="li"><svg width="46" height="10"><line x1="2" y1="5" x2="44" y2="5" stroke="#0D9488" stroke-width="2.2"/></svg>
    Asosiasi aktor &#8596; use case</div>
  <div class="li"><svg width="46" height="10"><line x1="2" y1="5" x2="38" y2="5" stroke="#0F766E" stroke-width="2" stroke-dasharray="5 3.5"/><path d="M36 1.5 L43 5 L36 8.5" fill="none" stroke="#0F766E" stroke-width="1.8"/></svg>
    &#171;include&#187; &#8212; selalu dijalankan</div>
  <div class="li"><svg width="46" height="10"><line x1="2" y1="5" x2="38" y2="5" stroke="#0F766E" stroke-width="2" stroke-dasharray="2.5 3"/><path d="M36 1.5 L43 5 L36 8.5" fill="none" stroke="#0F766E" stroke-width="1.8"/></svg>
    &#171;extend&#187; &#8212; opsional / kondisional</div>
  <div class="li"><svg width="46" height="18"><rect x="2" y="2" width="42" height="14" rx="7" fill="#F0FDFA" stroke="#14B8A6" stroke-width="1.8"/></svg>
    Use case dalam batas sistem</div>
  <div class="li"><svg width="46" height="22"><circle cx="12" cy="6" r="3.6" stroke="#0F766E" stroke-width="1.8"/><line x1="12" y1="9.6" x2="12" y2="15.6" stroke="#0F766E" stroke-width="1.8"/><line x1="7" y1="11.5" x2="17" y2="11.5" stroke="#0F766E" stroke-width="1.8"/><line x1="12" y1="15.6" x2="8" y2="19.6" stroke="#0F766E" stroke-width="1.8"/><line x1="12" y1="15.6" x2="16" y2="19.6" stroke="#0F766E" stroke-width="1.8"/><rect x="27" y="4" width="17" height="12" rx="3" stroke="#0D9488" stroke-width="1.8" fill="#fff"/></svg>
    Aktor &amp; sistem eksternal</div>
</div>
<div class="panel note">
  <div class="fold"></div>
  <div class="nt">CATATAN</div>
  <p>Keranjang &amp; checkout terikat <b>satu UMKM per transaksi</b>.</p>
  <p>QRIS hanya dapat dipilih bila penjual sudah mengunggah &amp; mengaktifkannya.</p>
  <p>Kode OTP kedaluwarsa 5 menit, dikirim via WhatsApp/SMS.</p>
</div>
"""

# ---------------------------------------------------------------- JS connector engine
JS = """
const svg = document.getElementById('wires');
const NS = 'http://www.w3.org/2000/svg';
const root = document.getElementById('root');

function el(id){ return document.querySelector('[data-id="'+id+'"]'); }
function rectOf(node){
  const r = node.getBoundingClientRect(), q = root.getBoundingClientRect();
  return {x:r.left-q.left, y:r.top-q.top, w:r.width, h:r.height,
          cx:r.left-q.left+r.width/2, cy:r.top-q.top+r.height/2,
          l:r.left-q.left, rt:r.left-q.left+r.width, t:r.top-q.top, b:r.top-q.top+r.height};
}
function pts(d){ const p=document.createElementNS(NS,'path'); p.setAttribute('d',d); return p; }
function stylePath(p, dashed){
  p.setAttribute('fill','none');
  if(dashed){ p.setAttribute('stroke','#0F766E'); p.setAttribute('stroke-width','2');
    p.setAttribute('stroke-dasharray','7 5'); p.setAttribute('marker-end','url(#depArrow)'); }
  else{ p.setAttribute('stroke','#0D9488'); p.setAttribute('stroke-width','2.1'); p.setAttribute('opacity','0.9'); }
  svg.appendChild(p);
}
function poly(P, dashed){
  stylePath(pts('M '+P.map(p=>p.join(' ')).join(' L ')), dashed);
}
function label(x, y, text, anchor){
  const t = document.createElementNS(NS,'text');
  t.setAttribute('x',x); t.setAttribute('y',y);
  t.setAttribute('text-anchor',anchor||'middle');
  t.setAttribute('font-size','12'); t.setAttribute('font-weight','700');
  t.setAttribute('font-style','italic'); t.setAttribute('fill','#0F766E');
  t.setAttribute('stroke','#FFFFFF'); t.setAttribute('stroke-width','5');
  t.setAttribute('paint-order','stroke'); t.setAttribute('stroke-linejoin','round');
  t.textContent = text; svg.appendChild(t);
}
// defs
(function(){ const d=document.createElementNS(NS,'defs');
  d.innerHTML = '<marker id="depArrow" markerWidth="16" markerHeight="14" refX="13" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M2 1.5 L13 6 L2 10.5" fill="none" stroke="#0F766E" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></marker>';
  svg.appendChild(d); })();

function fit(){ const r = root.getBoundingClientRect();
  svg.setAttribute('width', r.width); svg.setAttribute('height', r.height);
  svg.setAttribute('viewBox', '0 0 '+r.width+' '+r.height); }
fit();

// ---- associations: solid ----
// fan with anchors SPREAD along the actor's edge (avoids bunched single-point fan)
const fanP = ['uc2','uc5','uc6','uc7','uc8','uc10','uc9','uc3','uc4','uc1']
  .map(id=>({id, cy: rectOf(el(id)).cy})).sort((a,b)=>a.cy-b.cy);
fanP.forEach((t,i)=>{ const r = rectOf(el(t.id)); poly([[218, 556+i*10],[r.l, r.cy]]); });
const fanJ = ['uc12','uc13','uc14','uc15','uc16','uc17','uc11']
  .map(id=>({id, cy: rectOf(el(id)).cy})).sort((a,b)=>a.cy-b.cy);
fanJ.forEach((t,i)=>{ const r = rectOf(el(t.id)); poly([[1742, 458+i*14],[r.rt, r.cy]]); });
// gateway -> uc18 (route below UC1)
const gw = rectOf(el('ext-gw')), u18 = rectOf(el('uc18'));
poly([[gw.cx, gw.b],[gw.cx, 1318],[u18.cx, 1318],[u18.cx, u18.b]]);
// layanan peta -> uc4 (straight, corridor y = uc4.cy) + branch to uc19
const u4 = rectOf(el('uc4')), mp = rectOf(el('ext-map')), u19 = rectOf(el('uc19'));
poly([[mp.l, u4.cy],[u4.rt, u4.cy]]);
poly([[1190, u4.cy],[1190, u19.cy],[u19.rt, u19.cy]]);

// ---- include / extend: dashed ----
function aSide(id, side){ const r = rectOf(el(id));
  return side==='l'?[r.l,r.cy]: side==='r'?[r.rt,r.cy]: side==='t'?[r.cx,r.t]:[r.cx,r.b]; }
poly([aSide('uc1','r'),  aSide('uc18','l')], true);
poly([aSide('uc9','r'),  aSide('uc11','l')], true);
poly([aSide('uc9','r'),  aSide('ucLok','l')], true);
poly([aSide('uc3','r'),  aSide('uc19','l')], true);
poly([aSide('uc6','b'),  aSide('uc7','t')], true);
poly([aSide('uc8','t'),  aSide('uc7','b')], true);
poly([aSide('uc15','t'), aSide('uc14','b')], true);
poly([aSide('uc17','t'), aSide('uc16','b')], true);

// ---- labels ----
const m1=[aSide('uc1','r'),aSide('uc18','l')];   label((m1[0][0]+m1[1][0])/2,(m1[0][1]+m1[1][1])/2-7,'\\u00ABinclude\\u00BB');
const m2=[aSide('uc9','r'),aSide('ucLok','l')];  label((m2[0][0]+m2[1][0])/2,(m2[0][1]+m2[1][1])/2-8,'\\u00ABinclude\\u00BB');
label(975, aSide('uc9','r')[1]-9, '\\u00ABinclude\\u00BB');
const m3=[aSide('uc3','r'),aSide('uc19','l')];   label((m3[0][0]+m3[1][0])/2,(m3[0][1]+m3[1][1])/2-8,'\\u00ABinclude\\u00BB');
label(aSide('uc6','b')[0]+15, (aSide('uc6','b')[1]+aSide('uc7','t')[1])/2+4.5, '\\u00ABinclude\\u00BB','start');
label(aSide('uc8','t')[0]+15, (aSide('uc8','t')[1]+aSide('uc7','b')[1])/2+4.5, '\\u00ABextend\\u00BB','start');
label(aSide('uc15','t')[0]+15,(aSide('uc15','t')[1]+aSide('uc14','b')[1])/2+4.5,'\\u00ABextend\\u00BB','start');
label(aSide('uc17','t')[0]+15,(aSide('uc17','t')[1]+aSide('uc16','b')[1])/2+4.5,'\\u00ABinclude\\u00BB','start');
"""

HTML = f"""<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><style>{CSS}</style></head>
<body>
<div id="root">
  <div class="title">Use Case Diagram &#8212; Jajan Riyen</div>
  <div class="subtitle">Marketplace UMKM &#183; Pembeli &amp; Penjual</div>

  <div class="boundary"><div class="boundary-label">Aplikasi Jajan Riyen &#8212; Marketplace UMKM</div></div>

  <div class="zone zl"><div class="zone-cap">AKTIVITAS PEMBELI</div></div>
  <div class="zone zm"><div class="zone-cap">LAYANAN BERSAMA &amp; INTEGRASI</div></div>
  <div class="zone zr"><div class="zone-cap">AKTIVITAS PENJUAL UMKM</div></div>

  {PILLS_HTML}
  {LEGEND_HTML}
  {ACTORS_HTML}

  <svg id="wires"></svg>
  <script>{JS}</script>
</div>
</body></html>
"""

os.makedirs(os.path.dirname(PNG_PATH), exist_ok=True)
with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(HTML)
print(f"HTML written: {HTML_PATH} ({os.path.getsize(HTML_PATH)/1024:.0f} KB)")

# ---------------------------------------------------------------- render
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 2000, "height": 1470}, device_scale_factor=2)
    page.goto(f"file://{HTML_PATH}", wait_until="networkidle")
    page.wait_for_timeout(600)
    box = page.locator("#root").bounding_box()
    print(f"#root bbox: {box['width']:.0f} x {box['height']:.0f}")
    page.set_viewport_size({"width": int(box["width"] + 40), "height": int(box["height"] + 40)})
    page.wait_for_timeout(300)
    page.locator("#root").screenshot(path=PNG_PATH)
    browser.close()

sz = os.path.getsize(PNG_PATH)
from PIL import Image
im = Image.open(PNG_PATH)
print(f"PNG: {PNG_PATH} | {im.size[0]}x{im.size[1]} px | {sz/1024:.0f} KB")
