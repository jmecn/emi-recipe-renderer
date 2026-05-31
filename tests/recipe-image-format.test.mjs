import assert from 'node:assert/strict';
import test from 'node:test';
import { installRendererDomStubs, jsonResponse } from './test-helpers.mjs';

installRendererDomStubs();
await import('../src/index.js');

const { EmiRecipeRenderer } = globalThis;

test('resolveRecipeCard uses bundle recipeImageFormat extension', async () => {
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.endsWith('/bundle.json')) {
      return jsonResponse({
        schema: 2,
        imageScale: 2,
        recipeCount: 1,
        recipeImageFormat: 'webp',
        languages: ['en_us'],
        missingIconId: 'fieldguide:missing_icon',
      });
    }
    if (href.endsWith('/lang/en_us.json')) return jsonResponse({});
    throw new Error(`unexpected url ${href}`);
  };

  const renderer = new EmiRecipeRenderer({ baseUrl: '/fmt', locale: 'en_us' });
  await renderer.ensureBundle();
  const card = renderer.resolveRecipeCard('demo:foo/bar');
  assert.equal(card.imageFormat, 'webp');
  assert.match(card.imageUrl, /\/recipes\/demo\/foo_bar\.webp$/);
});
