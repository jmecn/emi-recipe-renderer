import assert from 'node:assert/strict';
import test from 'node:test';
import { installRendererDomStubs } from './test-helpers.mjs';

installRendererDomStubs();
await import('../src/index.js');

const { EmiRecipeRenderer } = globalThis;

test('bindSlotItemNavigation invokes onItemClick with stripped id', () => {
  const clicks = [];
  const renderer = new EmiRecipeRenderer({
    baseUrl: '/emi',
    locale: 'en_us',
    onItemClick: (id, meta) => clicks.push({ id, meta }),
  });
  renderer.iconIds = new Set(['minecraft:stick']);
  const clickHandlers = [];
  const el = {
    dataset: {},
    classList: { add() {} },
    title: '',
    addEventListener(type, fn) {
      if (type === 'click') clickHandlers.push(fn);
    },
  };

  assert.equal(
    renderer.bindSlotItemNavigation(el, 'minecraft:stick', { source: 'test' }),
    true,
  );
  assert.equal(el.dataset.emiItemId, 'minecraft:stick');
  clickHandlers[0]({ stopPropagation() {} });
  assert.equal(clicks.length, 1);
  assert.equal(clicks[0].id, 'minecraft:stick');
  assert.equal(clicks[0].meta.source, 'test');
});

test('resolveSlotNavigateItemId prefers tagDisplayItem for tag slots', () => {
  const renderer = new EmiRecipeRenderer({ baseUrl: '/emi', locale: 'en_us' });
  renderer.iconIds = new Set(['minecraft:chest']);
  const parsed = {
    kind: 'tag',
    tagType: 'item',
    tag: 'forge:chests/wooden',
    tagRef: '#item:forge:chests/wooden',
  };
  const widget = { tagDisplayItem: 'minecraft:chest' };
  assert.equal(renderer.resolveSlotNavigateItemId(parsed, widget), 'minecraft:chest');
});
