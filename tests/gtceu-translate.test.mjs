import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collectComposedItemLangKeys,
  extractMaterialFromIdPattern,
  formatLangTemplate,
  translateComposedItem,
  translateComposedRegistry,
} from '../src/gtceu-translate.js';

const zhCn = {
  'item.gtceu.bucket': '%s桶',
  'material.gtceu.liquid_air': '液态空气',
  'material.gtceu.aluminium': '铝',
  'tagprefix.ingot': '%s锭',
};

function t(key) {
  return zhCn[key] ?? key;
}

test('extractMaterialFromIdPattern handles default and custom patterns', () => {
  assert.equal(extractMaterialFromIdPattern('aluminium_ingot', '%s_ingot'), 'aluminium');
  assert.equal(extractMaterialFromIdPattern('hot_aluminium_ingot', 'hot_%s_ingot'), 'aluminium');
  assert.equal(extractMaterialFromIdPattern('raw_aluminium', 'raw_%s'), 'aluminium');
});

test('translateComposedItem resolves GT fluid buckets', () => {
  const label = translateComposedItem('gtceu', 'liquid_air_bucket', t, zhCn);
  assert.equal(label, '液态空气桶');
});

test('translateComposedItem resolves tagprefix material items', () => {
  const label = translateComposedItem('gtceu', 'aluminium_ingot', t, zhCn);
  assert.equal(label, '铝锭');
});

test('translateComposedRegistry falls back to material for fluids', () => {
  const label = translateComposedRegistry('gtceu:liquid_air', 'fluid', t, zhCn);
  assert.equal(label, '液态空气');
});

test('collectComposedItemLangKeys keeps bucket and tagprefix dependencies', () => {
  const bucketKeys = collectComposedItemLangKeys('gtceu', 'liquid_air_bucket', zhCn);
  assert.ok(bucketKeys.has('item.gtceu.bucket'));
  assert.ok(bucketKeys.has('material.gtceu.liquid_air'));

  const ingotKeys = collectComposedItemLangKeys('gtceu', 'aluminium_ingot', zhCn);
  assert.ok(ingotKeys.has('tagprefix.ingot'));
  assert.ok(ingotKeys.has('material.gtceu.aluminium'));
});

test('formatLangTemplate replaces sequential placeholders', () => {
  assert.equal(formatLangTemplate('%s (%s)', 'A', 'B'), 'A (B)');
});
