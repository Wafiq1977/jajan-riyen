/**
 * Membuat ikon PWA (192, 512, maskable, apple-touch) dari desain logo
 * "mulut melet" Jajan Riyen memakai sharp. Dijalankan sekali via:
 *   bun scripts/gen-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "fs";

const OUT = "public/icons";
mkdirSync(OUT, { recursive: true });

function svgWithBg(size) {
  // Maskable-safe: gambar maksimal ~72% dari kanvas (safe zone 80%)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14b8a6"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" transform="translate(256,252) scale(5.4) translate(-32,-32)">
    <path d="M8 27 C14 14.5 26 12.5 32 19.5 C38 12.5 50 14.5 56 27" stroke-width="4.6"/>
    <path d="M8 27 C15 41 24 44.5 32 44.5 C40 44.5 49 41 56 27" stroke-width="4.6"/>
    <path d="M13.5 26 C22 29.5 42 29.5 50.5 26" stroke-width="3" opacity="0.75"/>
    <path d="M25.5 44 C24.5 56.5 41 57 40 45.5" stroke="#6ee7a0" stroke-width="4.2"/>
    <path d="M32.7 47.5 V53.5" stroke="#6ee7a0" stroke-width="3" opacity="0.75"/>
  </g>
</svg>`;
}

function svgFullBleed(size) {
  // Transparan di luar, mouth besar di tengah
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <g fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 28 C12.4 15 24.4 12.8 32 20.2 C39.6 12.8 51.6 15 58 28" stroke-width="4.2"/>
    <path d="M6 28 C13.6 42.6 24 46.4 32 46.4 C40 46.4 50.4 42.6 58 28" stroke-width="4.2"/>
    <path d="M12 27 C21 30.6 43 30.6 52 27" stroke-width="2.6" opacity="0.75"/>
    <path d="M25 45.8 C24 60 41.4 60.4 40.4 47.4" stroke="#6ee7a0" stroke-width="3.8"/>
    <path d="M32.8 49 V55.4" stroke="#6ee7a0" stroke-width="2.6" opacity="0.75"/>
  </g>
</svg>`;
}

async function main() {
  await sharp(Buffer.from(svgWithBg(192))).png().toFile(`${OUT}/icon-192.png`);
  await sharp(Buffer.from(svgWithBg(512))).png().toFile(`${OUT}/icon-512.png`);
  // Maskable: latar penuh (aman dipotong lingkaran OS)
  await sharp(Buffer.from(svgWithBg(512))).png().toFile(`${OUT}/maskable-512.png`);
  // Apple touch icon (iOS home screen, sudut dibulatkan iOS otomatis)
  await sharp(Buffer.from(svgWithBg(180))).resize(180, 180).png().toFile(`${OUT}/apple-touch-icon.png`);
  // favicon raster fallback
  await sharp(Buffer.from(svgFullBleed(48))).png().toFile(`${OUT}/favicon-48.png`);
  console.log("✅ icons generated:", OUT);
}

main();
