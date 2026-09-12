/**
 * Memproses logo daun hijau 3D Jajan Riyen:
 *  1. Hapus latar putih (flood-fill dari tepi kanvas) -> PNG transparan
 *  2. Regenerasi ikon PWA (192, 512, maskable, apple-touch, favicon-48)
 * Dijalankan via: bun scripts/process-logo.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "fs";

const RAW = "public/brand/logo-leaf-raw.png";
const OUT = "public/logo-leaf.png";
const ICON_DIR = "public/icons";
mkdirSync(ICON_DIR, { recursive: true });

async function keyBackground() {
  const { data, info } = await sharp(RAW).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const keyed = new Uint8Array(w * h);

  // piksel "seperti latar": terang & saturasi rendah
  const isBgLike = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn > 205 && mx - mn < 22;
  };
  // piksel "agak terang" utk pelunakan tepi anti-alias
  const isLightish = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn > 180 && mx - mn < 48;
  };

  // --- flood fill dari seluruh tepi ---
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x); stack.push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w); stack.push(y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop();
    if (keyed[p]) continue;
    if (!isBgLike(p * ch)) continue;
    keyed[p] = 1;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }

  // --- 2x erosi lembut: piksel terang yang menempel area keyed ikut dihapus ---
  for (let pass = 0; pass < 2; pass++) {
    const extra = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (keyed[p]) continue;
        if (!isLightish(p * ch)) continue;
        if (keyed[p - 1] || keyed[p + 1] || keyed[p - w] || keyed[p + w]) extra.push(p);
      }
    }
    for (const p of extra) keyed[p] = 1;
  }

  // --- terapkan alpha + feather tepi ---
  const feather = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (keyed[p]) { data[p * ch + 3] = 0; continue; }
      let adj = false;
      for (let dy = -1; dy <= 1 && !adj; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (keyed[ny * w + nx]) { adj = true; break; }
        }
      }
      if (adj) feather.push(p);
    }
  }
  for (const p of feather) data[p * ch + 3] = 150;

  // --- crop ke bounding box konten ---
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * ch + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const pad = 8;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const chh = maxY - minY + 1;

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: chh })
    .png()
    .toFile(OUT);
  return { width: cw, height: chh };
}

function gradientSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2dd4bf"/>
      <stop offset="0.55" stop-color="#14b8a6"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
</svg>`;
}

async function composeIcon(size, leafRatio, bg) {
  const inner = Math.round(size * leafRatio);
  const leaf = await sharp(OUT).resize(inner, inner, { fit: "inside" }).png().toBuffer();
  let base;
  if (bg === "transparent") {
    base = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  } else {
    base = sharp(Buffer.from(gradientSvg(size)));
  }
  await base.composite([{ input: leaf, gravity: "centre" }]).png().toFile(`${ICON_DIR}/icon-${size}.png`);
}

async function makeIcons() {
  // ikon transparan (any)
  await composeIcon(192, 0.94, "transparent");
  await composeIcon(512, 0.94, "transparent");
  // maskable: latar penuh, daun ~64% (safe zone)
  {
    const grad = await sharp(Buffer.from(gradientSvg(512))).png().toBuffer();
    const leaf = await sharp(OUT).resize(Math.round(512 * 0.64), Math.round(512 * 0.64), { fit: "inside" }).png().toBuffer();
    await sharp(grad).composite([{ input: leaf, gravity: "centre" }]).png().toFile(`${ICON_DIR}/maskable-512.png`);
  }
  // apple touch icon 180 di gradien
  {
    const grad = await sharp(Buffer.from(gradientSvg(180))).resize(180, 180).png().toBuffer();
    const leaf = await sharp(OUT).resize(124, 124, { fit: "inside" }).png().toBuffer();
    await sharp(grad).composite([{ input: leaf, gravity: "centre" }]).png().toFile(`${ICON_DIR}/apple-touch-icon.png`);
  }
  // favicon raster transparan
  await sharp(OUT).resize(48, 48, { fit: "inside" }).png().toFile(`${ICON_DIR}/favicon-48.png`);
}

const dim = await keyBackground();
console.log(`✅ latar dihapus -> ${OUT} (${dim.width}x${dim.height}, transparan)`);
await makeIcons();
console.log(`✅ ikon PWA diregenerasi di ${ICON_DIR} (icon-192, icon-512, maskable-512, apple-touch-icon, favicon-48)`);
