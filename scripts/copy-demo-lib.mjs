import { copyFileSync, mkdirSync } from 'node:fs';

const outDir = 'demo/lib';
mkdirSync(outDir, { recursive: true });
for (const name of ['emi.js', 'emi.css', 'emi.js.map']) {
  copyFileSync(`dist/${name}`, `${outDir}/${name}`);
}
console.log('copied dist → demo/lib/');
