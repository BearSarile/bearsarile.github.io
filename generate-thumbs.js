// generate-thumbs.js
// Usage: node generate-thumbs.js --src=assets --pattern="**/*.{jpg,jpeg,png}" --thumbW=400 --retina
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const glob = require('glob');
const sharp = require('sharp');
const pGlob = promisify(glob);

const argv = Object.fromEntries(process.argv.slice(2).map(s => s.split('=')));
const SRC = argv.src || 'assets';
const PATTERN = argv.pattern || '**/*.{jpg,jpeg,png}';
const THUMB_W = parseInt(argv.thumbW || '400', 10);
const RETINA = argv.retina !== 'false';

async function run() {
  const files = await pGlob(path.join(SRC, PATTERN), { nodir: true });
  if (!files.length) { console.log('No images found'); return; }
  for (const f of files) {
    try {
      const ext = path.extname(f).toLowerCase();
      const base = f.slice(0, -ext.length);
      const thumb = `${base}-thumb.jpg`;
      const thumb2 = `${base}-thumb@2x.jpg`;
      await sharp(f)
        .resize({ width: THUMB_W })
        .jpeg({ quality: 78, mozjpeg: true })
        .toFile(thumb);
      console.log('Wrote', thumb);
      if (RETINA) {
        await sharp(f)
          .resize({ width: Math.round(THUMB_W * 2) })
          .jpeg({ quality: 70, mozjpeg: true })
          .toFile(thumb2);
        console.log('Wrote', thumb2);
      }
    } catch (err) {
      console.error('Error processing', f, err);
    }
  }
}
run().catch(e => { console.error(e); process.exit(1); });
