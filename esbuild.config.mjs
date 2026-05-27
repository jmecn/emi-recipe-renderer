import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/index.js'],
  outfile: 'dist/emi.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: true,
  logOverride: {
    'commonjs-variable-in-esm': 'silent',
  },
};

mkdirSync('dist', { recursive: true });
copyFileSync('src/emi.css', 'dist/emi.css');

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  const minCtx = await esbuild.context({
    ...buildOptions,
    outfile: 'dist/emi.min.js',
    minify: true,
  });
  await ctx.watch();
  await minCtx.watch();
  console.log('watching…');
} else {
  await esbuild.build(buildOptions);
  await esbuild.build({
    ...buildOptions,
    outfile: 'dist/emi.min.js',
    minify: true,
  });
  copyFileSync('dist/emi.css', 'dist/emi.min.css');
  console.log('built dist/emi.js, dist/emi.min.js, dist/emi.css, dist/emi.min.css');
}
