import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { validateBundleRoot } from '../src/validate/index.mjs';

const fixtureRoot = path.resolve(
  fileURLToPath(new URL('./fixtures/minimal-bundle', import.meta.url)),
);

test('validateBundleRoot accepts minimal-bundle fixture', () => {
  const result = validateBundleRoot(fixtureRoot);
  assert.equal(result.recipeIds.length, 1);
  assert.equal(result.recipeIds[0], 'test:smoke');
  assert.equal(result.bundle.schema, 1);
});

test('validateBundleRoot rejects invalid bundle.json shape', () => {
  assert.throws(
    () => validateBundleRoot(path.join(fixtureRoot, 'missing-dir')),
    /bundle root does not exist/,
  );
});

test('validateBundleRoot rejects bundle.json that fails schema', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emi-validate-'));
  fs.writeFileSync(path.join(tmp, 'bundle.json'), JSON.stringify({ schema: 99 }), 'utf8');
  assert.throws(() => validateBundleRoot(tmp), /bundle\.json:/);
});
