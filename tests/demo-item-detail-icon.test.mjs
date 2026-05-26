import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

test('item detail icon matches the item grid atlas size', async () => {
  const css = await readFile(path.join(repoRoot, 'demo', 'demo.css'), 'utf8');
  assert.doesNotMatch(css, /\.item-detail-icon\s*\{[\s\S]*width:\s*48px;[\s\S]*height:\s*48px;/);
  assert.match(css, /\.item-detail-icon\s*\{[\s\S]*flex:\s*0 0 32px;/);
  assert.match(css, /\.item-detail-icon[\s\S]*\.icon-atlas[\s\S]*\{[\s\S]*width:\s*32px;[\s\S]*height:\s*32px;[\s\S]*image-rendering:\s*pixelated;/);
  assert.doesNotMatch(css, /transform:\s*scale\(/);
});

test('grid cards enable content visibility for long lists', async () => {
  const css = await readFile(path.join(repoRoot, 'demo', 'demo.css'), 'utf8');
  assert.match(css, /\.recipe-card,\s*[\s\S]*\.item-card\s*\{[\s\S]*content-visibility:\s*auto;/);
  assert.match(css, /\.recipe-card,\s*[\s\S]*\.item-card\s*\{[\s\S]*contain-intrinsic-size:\s*160px 120px;/);
});
