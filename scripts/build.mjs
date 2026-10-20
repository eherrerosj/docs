import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

await build({
  entryPoints: ['src/desk.js'], bundle: true, minify: true, format: 'esm',
  outfile: 'docs/assets/desk.js', legalComments: 'linked',
});

const bundle = await readFile('docs/assets/desk.js');
const version = createHash('sha256').update(bundle).digest('hex').slice(0, 12);
let index = await readFile('docs/index.html', 'utf8');
index = index.replace(
  /src="assets\/desk\.js(?:\?v=[^"]*)?"/,
  `src="assets/desk.js?v=${version}"`,
);
for (const asset of ['style.css', 'favicon.svg']) {
  const content = await readFile(`docs/assets/${asset}`);
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
  index = index.replace(
    new RegExp(`href="assets/${asset.replace('.', '\\.')}[^\"]*"`),
    `href="assets/${asset}?v=${hash}"`,
  );
}
await writeFile('docs/index.html', index);
