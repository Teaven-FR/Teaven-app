/* Build Teaven Rituel v6.5.0 : l'index.html de production est téléchargé puis patché par
   la chaîne apply-patch*.py ; les binaires (logo, icônes, polices) et le
   manifest sont repris à l'identique ; le service worker passe en v6.5.0 (purge du cache). */
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://teaven-rituel.vercel.app/';
const VERSION = 'v6.5.0';
const BINARIES = [
  'logo-teaven.png',
  'paren-mark.svg',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'fonts/BwModelica-Medium.woff2',
  'fonts/BwModelica-Bold.woff2',
];

async function get(path) {
  const r = await fetch(BASE + path, { redirect: 'follow' });
  if (!r.ok) throw new Error('GET ' + path + ' -> ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}

await mkdir('public/fonts', { recursive: true });

await writeFile('index-prod.html', await get('index.html'));
console.log('index.html de production téléchargé');
for (const p of BINARIES) {
  const b = await get(p);
  await writeFile('public/' + p, b);
  console.log('asset', p, b.length, 'octets');
}

let sw = (await get('sw.js')).toString('utf8');
const m = sw.match(/var VERSION = "v[\d.]+";/);
if (!m) throw new Error('ligne VERSION introuvable dans sw.js');
sw = sw.replace(m[0], 'var VERSION = "' + VERSION + '";');
await writeFile('public/sw.js', sw);
console.log('sw.js :', m[0], '->', VERSION);

await writeFile('public/manifest.webmanifest', await get('manifest.webmanifest'));
console.log('build ok');
