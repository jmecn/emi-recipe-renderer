import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateBundleRoot } from '../src/validate/index.mjs';
import { installRendererDomStubs, jsonResponse } from './test-helpers.mjs';

const fixtureRoot = path.resolve(
  fileURLToPath(new URL('./fixtures/minimal-bundle', import.meta.url)),
);

test('v2 fixture: meta has id and matching png on disk', () => {
  const result = validateBundleRoot(fixtureRoot);
  assert.equal(result.bundle.schema, 2);
  assert.deepEqual(result.recipeIds, ['test:smoke']);
  const png = path.join(fixtureRoot, 'recipes/test/smoke.png');
  assert.ok(fs.existsSync(png));
  assert.ok(fs.statSync(png).size > 0);
});

test('v2 bundle still ships items/index.json for item catalog', () => {
  const itemsIndexPath = path.join(fixtureRoot, 'items/index.json');
  assert.ok(fs.existsSync(itemsIndexPath));
  const itemsIndex = JSON.parse(fs.readFileSync(itemsIndexPath, 'utf8'));
  assert.ok(typeof itemsIndex === 'object' && itemsIndex !== null);
});

test('opening N visible recipes uses N meta fetches not layout packs', async () => {
  installRendererDomStubs();
  await import('../src/index.js');
  const { EmiRecipeRenderer } = globalThis;

  const recipeIds = ['demo:a', 'demo:b', 'demo:c'];
  const meta = {
    schema: 1,
    id: 'demo:x',
    width: 10,
    height: 10,
    widgets: [],
  };
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/bundle.json')) {
      return jsonResponse({
        schema: 2,
        imageScale: 2,
        recipeCount: 3,
        languages: ['en_us'],
        missingIconId: 'fieldguide:missing_icon',
      });
    }
    if (href.endsWith('/lang/en_us.json')) return jsonResponse({});
    if (href.endsWith('/recipes/demo/a.json')) return jsonResponse({ ...meta, id: 'demo:a' });
    if (href.endsWith('/recipes/demo/b.json')) return jsonResponse({ ...meta, id: 'demo:b' });
    if (href.endsWith('/recipes/demo/c.json')) return jsonResponse({ ...meta, id: 'demo:c' });
    if (href.endsWith('.png')) {
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { status: 200 });
    }
    throw new Error(`unexpected url ${href}`);
  };

  const renderer = new EmiRecipeRenderer({ baseUrl: '/v2', locale: 'en_us' });
  const bundle = await renderer.loadIndex();
  for (const id of recipeIds) {
    await renderer.loadRecipeMeta(id);
  }

  const metaFetches = fetchCalls.filter((u) => u.endsWith('.json') && u.includes('/recipes/demo/'));
  assert.equal(metaFetches.length, 3);
  assert.equal(fetchCalls.filter((u) => u.includes('layout-packs')).length, 0);
  assert.equal(fetchCalls.filter((u) => u.includes('/routes/')).length, 0);
  assert.equal(bundle.schema, 2);
});
