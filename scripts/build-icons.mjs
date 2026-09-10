// Renders every PWA asset from one vector source so the icon, the splash
// screens and the OG card can never drift apart.
// Usage: node scripts/build-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const BASE = "#0b0c0f";
const HI = "#FF7D4D";
const LO = "#D43F08";

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/splash", { recursive: true });

/** The dumbbell glyph, drawn inside a 512 box. */
const glyph = (scale = 1, cx = 256, cy = 256) => `
  <g transform="translate(${cx} ${cy}) scale(${scale}) translate(-256 -256)" fill="#fff">
    <rect x="170" y="238" width="172" height="36" rx="18"/>
    <rect x="132" y="192" width="46" height="128" rx="20"/>
    <rect x="334" y="192" width="46" height="128" rx="20"/>
    <rect x="92" y="220" width="32" height="72" rx="15" opacity="0.72"/>
    <rect x="388" y="220" width="32" height="72" rx="15" opacity="0.72"/>
  </g>`;

const gradient = (id) => `
  <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${HI}"/>
    <stop offset="100%" stop-color="${LO}"/>
  </linearGradient>`;

// Standard icon: rounded square, glyph nearly edge to edge.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>${gradient("g")}</defs>
  <rect width="512" height="512" rx="118" fill="url(#g)"/>
  ${glyph(1)}
</svg>`;

// Maskable icon: full bleed, glyph shrunk into the 80% safe circle.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>${gradient("g")}</defs>
  <rect width="512" height="512" fill="url(#g)"/>
  ${glyph(0.66)}
</svg>`;

// Favicon: legible at 16px, so the thin outer plates are dropped.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 512 512">
  <defs>${gradient("g")}</defs>
  <rect width="512" height="512" rx="118" fill="url(#g)"/>
  <g fill="#fff">
    <rect x="160" y="232" width="192" height="48" rx="24"/>
    <rect x="118" y="176" width="56" height="160" rx="26"/>
    <rect x="338" y="176" width="56" height="160" rx="26"/>
  </g>
</svg>`;

const splashSvg = (w, h) => {
  const scale = Math.min(w, h) / 512 * 0.34;
  const markSize = 512 * scale;
  const textSize = Math.round(markSize * 0.30);
  const cy = h / 2 - markSize * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${gradient("g")}</defs>
  <rect width="${w}" height="${h}" fill="${BASE}"/>
  <g transform="translate(${w / 2 - markSize / 2} ${cy - markSize / 2}) scale(${scale})">
    <rect width="512" height="512" rx="118" fill="url(#g)"/>
    ${glyph(1)}
  </g>
  <text x="${w / 2}" y="${cy + markSize * 0.86}" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="${textSize}" font-weight="700" letter-spacing="-0.02em" fill="#f2f4f7">Gymly</text>
</svg>`;
};

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>${gradient("g")}
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF5A1F" stop-opacity="0.20"/>
      <stop offset="60%" stop-color="#FF5A1F" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="${BASE}"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(96 150) scale(0.32)">
    <rect width="512" height="512" rx="118" fill="url(#g)"/>
    ${glyph(1)}
  </g>
  <text x="96" y="424" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="76" font-weight="700" letter-spacing="-0.03em" fill="#f2f4f7">Your training, tracked.</text>
  <text x="96" y="486" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="34" font-weight="500" fill="#98a1b2">Plan your split · log every set · watch the kilos add up</text>
</svg>`;

const png = (svg, size) =>
  sharp(Buffer.from(svg))
    .resize(size.w, size.h, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();

const write = async (path, svg, w, h) => {
  writeFileSync(path, await png(svg, { w, h }));
  console.log("  ", path, `${w}x${h}`);
};

// Apple needs one startup image per device resolution; media queries in the
// layout pick the right one.
export const SPLASH = [
  { w: 640, h: 1136, dw: 320, dh: 568, r: 2 },
  { w: 750, h: 1334, dw: 375, dh: 667, r: 2 },
  { w: 828, h: 1792, dw: 414, dh: 896, r: 2 },
  { w: 1125, h: 2436, dw: 375, dh: 812, r: 3 },
  { w: 1170, h: 2532, dw: 390, dh: 844, r: 3 },
  { w: 1179, h: 2556, dw: 393, dh: 852, r: 3 },
  { w: 1206, h: 2622, dw: 402, dh: 874, r: 3 },
  { w: 1242, h: 2208, dw: 414, dh: 736, r: 3 },
  { w: 1242, h: 2688, dw: 414, dh: 896, r: 3 },
  { w: 1284, h: 2778, dw: 428, dh: 926, r: 3 },
  { w: 1290, h: 2796, dw: 430, dh: 932, r: 3 },
  { w: 1320, h: 2868, dw: 440, dh: 956, r: 3 },
  { w: 1536, h: 2048, dw: 768, dh: 1024, r: 2 },
  { w: 1620, h: 2160, dw: 810, dh: 1080, r: 2 },
  { w: 1668, h: 2388, dw: 834, dh: 1194, r: 2 },
  { w: 2048, h: 2732, dw: 1024, dh: 1366, r: 2 },
];

console.log("Icons:");
writeFileSync("public/icons/favicon.svg", faviconSvg);
console.log("   public/icons/favicon.svg");
await write("public/icons/icon-192.png", iconSvg, 192, 192);
await write("public/icons/icon-512.png", iconSvg, 512, 512);
await write("public/icons/icon-192-maskable.png", maskableSvg, 192, 192);
await write("public/icons/icon-512-maskable.png", maskableSvg, 512, 512);
await write("public/icons/apple-touch-icon.png", iconSvg, 180, 180);
await write("public/icons/og.png", ogSvg, 1200, 630);
// Browsers still probe /favicon.ico; a PNG under that name is served fine.
writeFileSync("public/favicon.ico", await png(faviconSvg, { w: 32, h: 32 }));
console.log("   public/favicon.ico 32x32");

console.log("Splash screens:");
for (const s of SPLASH) {
  await write(`public/splash/${s.w}x${s.h}.png`, splashSvg(s.w, s.h), s.w, s.h);
}

// Emit the <link> tags so the layout never drifts from the generated files.
const links = SPLASH.map(
  (s) =>
    `  { media: "(device-width: ${s.dw}px) and (device-height: ${s.dh}px) and (-webkit-device-pixel-ratio: ${s.r}) and (orientation: portrait)", href: "/splash/${s.w}x${s.h}.png" },`,
).join("\n");
writeFileSync(
  "src/lib/splash.ts",
  `// GENERATED by scripts/build-icons.mjs — do not edit by hand.\nexport const APPLE_SPLASH = [\n${links}\n] as const;\n`,
);
console.log("   src/lib/splash.ts");
