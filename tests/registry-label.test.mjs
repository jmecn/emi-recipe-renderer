import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildRegistryLabelTable,
  createRegistryLabelResolver,
  lookupRegistryLabel,
  registryNamespace,
} from '../src/registry-label.mjs';

test('registryNamespace defaults to minecraft', () => {
  assert.equal(registryNamespace('stick'), 'minecraft');
  assert.equal(registryNamespace('gtceu:ingot'), 'gtceu');
});

test('buildRegistryLabelTable maps id to label', () => {
  const table = buildRegistryLabelTable({
    schema: 2,
    items: [
      { id: 'gtceu:aluminium_ingot', label: '铝锭', haystack: 'x' },
      { id: 'gtceu:steam', label: '蒸汽', haystack: 'y' },
    ],
  });
  assert.equal(table['gtceu:aluminium_ingot'], '铝锭');
  assert.equal(table['gtceu:steam'], '蒸汽');
});

test('lookupRegistryLabel returns bare id when missing', () => {
  assert.equal(lookupRegistryLabel({}, 'gtceu:unknown'), 'gtceu:unknown');
});

test('translateRegistry uses items-lang table only', () => {
  const resolver = createRegistryLabelResolver({
    labelsByRegistryId: {
      'gtceu:aluminium_ingot': '铝锭',
      'afc:wood/hanging_sign/copper/baobab': '铜制猴面包木悬挂告示牌',
    },
  });
  assert.equal(resolver.translateRegistry('gtceu:aluminium_ingot', 'item'), '铝锭');
  assert.equal(
    resolver.translateRegistry('afc:wood/hanging_sign/copper/baobab', 'item'),
    '铜制猴面包木悬挂告示牌',
  );
  assert.equal(resolver.translateRegistry('missing:item', 'item'), 'missing:item');
});
