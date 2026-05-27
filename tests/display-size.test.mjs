import assert from 'node:assert/strict';
import test from 'node:test';
import { installRendererDomStubs } from './test-helpers.mjs';

installRendererDomStubs();
await import('../src/index.js');

const { EmiRecipeRenderer } = globalThis;

test('_displaySizeFromLayout uses panel frame dimensions and scale', () => {
  const size = EmiRecipeRenderer._displaySizeFromLayout({
    scale: 2,
    panel: { width: 144, height: 18, margin: 4, frameWidth: 152, frameHeight: 26 },
  });
  assert.equal(size.width, 304);
  assert.equal(size.height, 52);
});
