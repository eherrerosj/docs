import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

await build({
  entryPoints: ['src/desk.js'], bundle: true, minify: true, format: 'esm',
  outfile: 'docs/assets/desk.js', legalComments: 'linked',
});

const bundle = await readFile('docs/assets/desk.js');
const version = createHash('sha256').update(bundle).digest('hex').slice(0, 12);
const index = await readFile('docs/index.html', 'utf8');
await writeFile('docs/index.html', index.replace(
  /src="assets\/desk\.js(?:\?v=[^"]*)?"/,
  `src="assets/desk.js?v=${version}"`,
));
