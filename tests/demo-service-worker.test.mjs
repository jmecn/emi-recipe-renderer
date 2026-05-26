import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

test('demo app registers a service worker', async () => {
  const source = await readFile(path.join(repoRoot, 'demo', 'demo-app.js'), 'utf8');
  assert.match(source, /navigator\.serviceWorker\.register\((['"`])\.\/sw\.js\1/);
});

test('demo app registers immediately after window load has already completed', async () => {
  const source = await readFile(path.join(repoRoot, 'demo', 'demo-app.js'), 'utf8');
  assert.match(source, /document\.readyState === ['"`]complete['"`]/);
});

test('build:demo emits a versioned service worker', async () => {
  execFileSync('npm', ['run', 'build:demo'], {
    cwd: repoRoot,
    stdio: 'pipe',
  });

  let swSource = '';
  try {
    swSource = await readFile(path.join(repoRoot, 'demo', 'sw.js'), 'utf8');
  } catch {
    swSource = '';
  }

  assert.match(swSource, /emi-demo-static-/);
  assert.match(swSource, /self\.addEventListener\('fetch'/);
  assert.doesNotMatch(swSource, /__CACHE_VERSION__/);
});
