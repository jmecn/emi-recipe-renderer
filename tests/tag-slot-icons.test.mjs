import assert from 'node:assert/strict';
import test from 'node:test';
import { installRendererDomStubs } from './test-helpers.mjs';

installRendererDomStubs();
await import('../src/index.js');

const { EmiRecipeRenderer } = globalThis;

test('resolveIconIds uses tagDisplayItem when tag members are not cached', () => {
  const renderer = new EmiRecipeRenderer({ baseUrl: '/emi', locale: 'en_us' });
  renderer.iconIds = new Set(['minecraft:dark_oak_log', 'minecraft:chest']);

  const parsed = {
    kind: 'tag',
    tagType: 'item',
    tag: 'minecraft:logs_that_burn',
    tagRef: '#item:minecraft:logs_that_burn',
  };
  const widget = { tagDisplayItem: 'minecraft:dark_oak_log' };

  assert.deepEqual(renderer.resolveIconIds(parsed, widget), ['minecraft:dark_oak_log']);

  const forgeTag = {
    kind: 'tag',
    tagType: 'item',
    tag: 'forge:chests/wooden',
    tagRef: '#item:forge:chests/wooden',
  };
  assert.deepEqual(renderer.resolveIconIds(forgeTag, { tagDisplayItem: 'minecraft:chest' }), [
    'minecraft:chest',
  ]);
});
