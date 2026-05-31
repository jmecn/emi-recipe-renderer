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

test('_displaySizeFromMeta uses imageScale and recipe margin', () => {
  const size = EmiRecipeRenderer._displaySizeFromMeta({ width: 144, height: 18 }, 2);
  assert.equal(size.width, 320);
  assert.equal(size.height, 68);
});

test('createTankFluidFill renders fluid tiles from icon atlas', () => {
  const renderer = new EmiRecipeRenderer({ baseUrl: '/emi', locale: 'en_us' });
  renderer.iconIds = new Set(['minecraft:lava']);
  renderer.iconAtlas = {
    cellSize: 32,
    pages: [{ file: 'atlas-000.png', width: 32, height: 32, sources: ['atlas-000.png'] }],
    items: { 'minecraft:lava': { page: 0, x: 0, y: 0 } },
  };
  const fill = renderer.createTankFluidFill({ kind: 'fluid', id: 'minecraft:lava', amount: 1000 });
  assert.equal(fill.className, 'emi-tank-fluid');
  assert.equal(fill.childNodes.length, 1);
  assert.equal(fill.childNodes[0].dataset.item, 'minecraft:lava');
});
