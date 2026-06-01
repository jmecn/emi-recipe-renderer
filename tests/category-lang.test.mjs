import assert from 'node:assert/strict';
import { test } from 'node:test';

import { translateCategoryLabel } from '../src/category-lang.js';

const zhCn = {
  'gtceu.assembler': '组装机',
  'create.recipe.automatic_shaped': '自动合成',
};

function t(key) {
  return zhCn[key] ?? key;
}

test('translateCategoryLabel uses exported nameKey', () => {
  assert.equal(
    translateCategoryLabel('gtceu:assembler', t, { nameKey: 'gtceu.assembler' }),
    '组装机',
  );
  assert.equal(
    translateCategoryLabel('create:automatic_shaped', t, { nameKey: 'create.recipe.automatic_shaped' }),
    '自动合成',
  );
});

test('translateCategoryLabel title-cases path when nameKey missing', () => {
  assert.equal(translateCategoryLabel('gtceu:arc_furnace', t, null), 'Arc Furnace');
  assert.equal(translateCategoryLabel('create:automatic_shaped', t, {}), 'Automatic Shaped');
});
