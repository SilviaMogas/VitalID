import {build} from 'esbuild';
import {mkdir, copyFile} from 'node:fs/promises';

await mkdir('dist/public', {recursive: true});
await build({
  entryPoints: ['src/server.mjs'], outfile: 'dist/server.mjs', bundle: true,
  platform: 'node', format: 'esm', packages: 'external', target: 'node22',
  tsconfig: '../../tsconfig.json',
});
await build({
  entryPoints: ['src/client.mjs'], outfile: 'dist/public/client.js', bundle: true,
  platform: 'browser', format: 'esm', target: 'es2022',
});
for (const file of ['index.html', 'receiver.html', 'style.css']) await copyFile(`public/${file}`, `dist/public/${file}`);
await copyFile('../../public/demo/fatima.svg', 'dist/public/fatima.svg');
