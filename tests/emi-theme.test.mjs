import assert from 'node:assert/strict';
import test from 'node:test';
import { applyEmiTheme, normalizeEmiTheme } from '../src/emi-theme.js';

test('normalizeEmiTheme accepts light and dark only', () => {
  assert.equal(normalizeEmiTheme('light'), 'light');
  assert.equal(normalizeEmiTheme('DARK'), 'dark');
  assert.equal(normalizeEmiTheme(''), null);
  assert.equal(normalizeEmiTheme('auto'), null);
});

test('applyEmiTheme sets data-emi-theme on themeRoot', () => {
  const root = { dataset: {} };
  assert.equal(applyEmiTheme('light', { themeRoot: root }), 'light');
  assert.equal(root.dataset.emiTheme, 'light');
  assert.equal(applyEmiTheme('dark', { themeRoot: root }), 'dark');
  assert.equal(root.dataset.emiTheme, 'dark');
  assert.equal(applyEmiTheme(null, { themeRoot: root }), null);
  assert.equal(root.dataset.emiTheme, undefined);
});

test('EmiRecipeRenderer setTheme updates themeRoot', async () => {
  const root = { dataset: {} };
  const { EmiRecipeRenderer } = await import('../src/index.js');
  const renderer = new EmiRecipeRenderer({
    baseUrl: 'export',
    theme: 'light',
    themeRoot: root,
  });
  assert.equal(root.dataset.emiTheme, 'light');
  renderer.setTheme('dark');
  assert.equal(root.dataset.emiTheme, 'dark');
});
