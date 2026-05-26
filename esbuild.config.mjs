import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const buildDemo = process.argv.includes('--demo');

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

function writeDemoArtifacts() {
  const demoLibDir = 'demo/lib';
  mkdirSync(demoLibDir, { recursive: true });
  for (const name of ['emi.js', 'emi.css', 'emi.js.map']) {
    copyFileSync(`dist/${name}`, `${demoLibDir}/${name}`);
  }
  console.log('copied dist -> demo/lib/');

  const buildVersion = process.env.EMI_DEMO_CACHE_VERSION
    || new Date().toISOString().replace(/[-:.TZ]/g, '');
  const template = readFileSync('demo/sw-template.js', 'utf8');
  const output = template.replace('__CACHE_VERSION__', JSON.stringify(buildVersion));
  writeFileSync('demo/sw.js', output);
  console.log(`wrote demo/sw.js (${buildVersion})`);
}

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('watching…');
} else {
  await esbuild.build(buildOptions);
  console.log('built dist/emi.js and dist/emi.css');
  if (buildDemo) {
    writeDemoArtifacts();
  }
}
