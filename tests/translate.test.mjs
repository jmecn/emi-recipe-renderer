import assert from 'node:assert/strict';
import test from 'node:test';
import { installRendererDomStubs, jsonResponse } from './test-helpers.mjs';

installRendererDomStubs();
await import('../src/index.js');

const { EmiRecipeRenderer } = globalThis;

test('translate falls back en_us then key', async () => {
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.endsWith('/bundle.json')) {
      return jsonResponse({
        schema: 2,
        imageScale: 2,
        recipeCount: 0,
        languages: ['en_us', 'zh_cn'],
        missingIconId: 'fieldguide:missing_icon',
      });
    }
    if (href.endsWith('/lang/en_us.json')) {
      return jsonResponse({ 'item.test.foo': 'Foo EN' });
    }
    if (href.endsWith('/lang/zh_cn.json')) {
      return jsonResponse({ 'item.test.bar': 'Bar CN' });
    }
    throw new Error(`unexpected url ${href}`);
  };

  const renderer = new EmiRecipeRenderer({ baseUrl: '/t', locale: 'zh_cn' });
  await renderer.loadIndex();

  assert.equal(renderer.translate('item.test.bar'), 'Bar CN');
  assert.equal(renderer.translate('item.test.foo'), 'Foo EN');
  assert.equal(renderer.translate('missing.key'), 'missing.key');
});

test('translate does not fetch registry-labels', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/bundle.json')) {
      return jsonResponse({
        schema: 2,
        imageScale: 2,
        recipeCount: 0,
        languages: ['en_us'],
        missingIconId: 'fieldguide:missing_icon',
      });
    }
    if (href.endsWith('/lang/en_us.json')) return jsonResponse({});
    throw new Error(`unexpected url ${href}`);
  };

  const renderer = new EmiRecipeRenderer({ baseUrl: '/t2', locale: 'en_us' });
  await renderer.loadIndex();
  renderer.translate('tag.item.minecraft.logs');

  assert.equal(
    fetchCalls.some((u) => u.includes('registry-labels')),
    false,
  );
});
