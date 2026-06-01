import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  COMPOSED_FIRST_NAMESPACES,
  createRegistryLabelResolver,
  registryNamespace,
} from '../src/registry-label.mjs';

const zhCn = {
  'block.afc.wood.planks.hanging_sign.copper.baobab': '铜制猴面包木悬挂告示牌',
  'item.ae2.lime_smart_cable': '黄绿色ME智能线缆',
  'tagprefix.ingot': '%s锭',
  'material.gtceu.aluminium': '铝',
  'item.gtceu.aluminium_ingot': '扁平键铝锭',
};

test('registryNamespace defaults to minecraft', () => {
  assert.equal(registryNamespace('stick'), 'minecraft');
  assert.equal(registryNamespace('gtceu:ingot'), 'gtceu');
});

test('COMPOSED_FIRST_NAMESPACES includes gtceu and tfg', () => {
  assert.equal(COMPOSED_FIRST_NAMESPACES.has('gtceu'), true);
  assert.equal(COMPOSED_FIRST_NAMESPACES.has('tfg'), true);
  assert.equal(COMPOSED_FIRST_NAMESPACES.has('afc'), false);
});

test('default namespace: nameKey before flat keys', () => {
  const resolver = createRegistryLabelResolver({
    current: zhCn,
    fallback: {},
    nameKeysByRegistryId: {
      'afc:wood/hanging_sign/copper/baobab': 'block.afc.wood.planks.hanging_sign.copper.baobab',
      'ae2:lime_smart_cable': 'item.ae2.lime_smart_cable',
    },
  });
  assert.equal(
    resolver.translateRegistry('afc:wood/hanging_sign/copper/baobab', 'item'),
    '铜制猴面包木悬挂告示牌',
  );
  assert.equal(resolver.translateRegistry('ae2:lime_smart_cable', 'item'), '黄绿色ME智能线缆');
});

test('gtceu: composed labels before exported nameKey', () => {
  const resolver = createRegistryLabelResolver({
    current: zhCn,
    fallback: {},
    nameKeysByRegistryId: {
      'gtceu:aluminium_ingot': 'item.gtceu.aluminium_ingot',
    },
  });
  assert.equal(resolver.translateRegistry('gtceu:aluminium_ingot', 'item'), '铝锭');
});
