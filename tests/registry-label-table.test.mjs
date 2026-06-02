import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildRegistryLabelTable, stripRegistryId } from '../src/registry-label-table.mjs';

test('stripRegistryId removes nbt and hash suffix', () => {
  assert.equal(stripRegistryId('gtceu:foo{tag:1}'), 'gtceu:foo');
  assert.equal(stripRegistryId('gtceu:foo@abc'), 'gtceu:foo');
});
