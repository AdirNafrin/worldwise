// One-time script (needs `npm i -D sharp` locally) to rasterize the app's
// medal/trophy icon into the PNG sizes required by the PWA manifest and
// favicons. Re-run after editing the SVG source below.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const iconsDir = path.join(root, 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

const gold = '#f5b921';
const goldDark = '#d4900f';
const ribbon = '#3b82f6';
const bg = '#0f172a';

// Medal-on-ribbon glyph, drawn on a full-bleed background square so it also
// works as a maskable icon (safe zone respected).
const glyph = (size, withBg) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  ${withBg ? `<rect width="512" height="512" fill="${bg}"/>` : ''}
  <path d="M176 40 L226 210 L150 260 Z" fill="${ribbon}"/>
  <path d="M336 40 L286 210 L362 260 Z" fill="${ribbon}"/>
  <circle cx="256" cy="320" r="132" fill="${goldDark}"/>
  <circle cx="256" cy="320" r="112" fill="${gold}"/>
  <path d="M256 250 L276 300 L330 305 L290 340 L302 393 L256 365 L210 393 L222 340 L182 305 L236 300 Z" fill="${goldDark}"/>
</svg>`;

async function render(size, withBg, filename) {
  await sharp(Buffer.from(glyph(size, withBg))).png().toFile(path.join(iconsDir, filename));
  console.log('wrote', filename);
}

await render(192, true, 'icon-192.png');
await render(512, true, 'icon-512.png');
await render(512, true, 'icon-maskable-512.png');
await render(180, true, 'apple-touch-icon.png');
await render(32, true, 'favicon-32.png');

// favicon.svg (transparent bg, used directly by <link rel="icon">)
writeFileSync(path.join(root, 'public', 'favicon.svg'), glyph(64, false).trim() + '\n');

console.log('Done.');
