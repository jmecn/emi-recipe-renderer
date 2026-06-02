import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

const shared = {
  entryPoints: ['src/index.js'],
  bundle: true,
  platform: 'browser',
  target: ['es2020'],
  sourcemap: true,
  logOverride: {
    'commonjs-variable-in-esm': 'silent',
  },
};

const iife = { ...shared, format: 'iife' };
const esm = { ...shared, format: 'esm' };

mkdirSync('dist', { recursive: true });
copyFileSync('src/emi.css', 'dist/emi.css');
copyFileSync('src/index.d.ts', 'dist/emi.d.ts');

const builds = [
  { ...iife, outfile: 'dist/emi.js' },
  { ...iife, outfile: 'dist/emi.min.js', minify: true },
  { ...esm, outfile: 'dist/emi.esm.js' },
  { ...esm, outfile: 'dist/emi.esm.min.js', minify: true },
];

if (watch) {
  const contexts = await Promise.all(builds.map((opts) => esbuild.context(opts)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log('watching…');
} else {
  await Promise.all(builds.map((opts) => esbuild.build(opts)));
  copyFileSync('dist/emi.css', 'dist/emi.min.css');
  console.log(
    'built dist/emi.js, dist/emi.min.js, dist/emi.esm.js, dist/emi.esm.min.js, dist/emi.css, dist/emi.min.css',
  );
}
