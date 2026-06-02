import assert from 'node:assert/strict';
import test from 'node:test';
import { installRendererDomStubs } from './test-helpers.mjs';

installRendererDomStubs();

const mod = await import('../src/index.js');

test('named ESM exports match globals', () => {
  assert.equal(typeof mod.EmiRecipeRenderer, 'function');
  assert.equal(mod.EmiRecipeRenderer, globalThis.EmiRecipeRenderer);
  assert.equal(mod.hideEmiTagPopover, globalThis.hideEmiTagPopover);
  assert.equal(mod.stripRegistryId, globalThis.stripEmiRegistryId);
  assert.equal(mod.setFormattedText, mod.applyMinecraftFormattedContent);
});

test('displaySizeFromMeta is a public alias', () => {
  const size = mod.EmiRecipeRenderer.displaySizeFromMeta({ width: 144, height: 18, margin: 4 }, 2);
  assert.equal(size.width, 304);
  assert.equal(size.height, 52);
});
