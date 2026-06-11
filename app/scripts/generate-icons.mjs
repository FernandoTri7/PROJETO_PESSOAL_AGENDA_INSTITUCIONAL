// Gera os PNGs de marca a partir dos SVGs (sharp). Rodar: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = join(__dirname, '..', 'assets');
const brand = join(assets, 'brand');

async function render(svg, size, out) {
  await sharp(join(brand, svg), { density: 512 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(assets, out));
  console.log('  ✓', out, `(${size}px)`);
}

await render('agenda-icon.svg', 1024, 'icon.png');
await render('agenda-icon.svg', 196, 'favicon.png');
await render('agenda-foreground.svg', 1024, 'android-icon-foreground.png');
await render('agenda-monochrome.svg', 1024, 'android-icon-monochrome.png');

await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#0F5C5E' } })
  .png()
  .toFile(join(assets, 'android-icon-background.png'));
console.log('  ✓ android-icon-background.png (teal sólido)');

console.log('Ícones gerados.');
