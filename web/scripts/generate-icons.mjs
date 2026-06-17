// Generuje ikony PWA z logo „Postęp" (geometria wklejona, niezależna od folderu design/).
// Rasteryzacja przez `sharp` z worker/node_modules (bez nowej instalacji w web/).
// Uruchom: node scripts/generate-icons.mjs  (z katalogu web/)

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// sharp jest zainstalowany w worker/ — rozwiązujemy go stamtąd.
const require = createRequire(path.resolve(__dirname, "../../worker/package.json"));
const sharp = require("sharp");

const publicDir = path.resolve(__dirname, "../public");

// Gradient akcentu „Aurora" + znak „Postęp" (pierścień postępu + odhaczenie).
const GRAD = `<defs><linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse"><stop stop-color="#9A86FF"/><stop offset="1" stop-color="#C06BFF"/></linearGradient></defs>`;
const MARK = `<g transform="translate(64 64) scale(16)" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="12" cy="12" r="9" stroke-dasharray="46 60" transform="rotate(-90 12 12)"/><path d="m8.4 12.4 2.5 2.5 4.7-5.4"/></g>`;
const tile = (rx) =>
  `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">${GRAD}<rect width="512" height="512" rx="${rx}" fill="url(#g)"/>${MARK}</svg>`;

const rounded = Buffer.from(tile(160)); // purpose: any (squircle, transparentne rogi)
const square = Buffer.from(tile(0)); // maskable / apple (pełny gradient, system sam zaokrągla)

const jobs = [
  { svg: rounded, size: 192, out: "icon-192.png" },
  { svg: rounded, size: 512, out: "icon-512.png" },
  { svg: square, size: 512, out: "icon-512-maskable.png" },
  { svg: square, size: 180, out: "apple-touch-icon.png" },
];

for (const { svg, size, out } of jobs) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, out));
  console.log(`✓ ${out} (${size}×${size})`);
}

// Favicon jako SVG (skaluje się bez utraty jakości w 16–48 px).
fs.writeFileSync(path.join(publicDir, "favicon.svg"), tile(160));
console.log("✓ favicon.svg");
