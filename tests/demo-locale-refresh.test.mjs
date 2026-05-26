import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDemoAppTestContext } from './test-helpers.mjs';

test('onLocaleChange refreshes the current view without calling syncRoute', async () => {
  const { DemoClass, elements } = await loadDemoAppTestContext();
  assert.equal(typeof DemoClass, 'function');

  const app = new DemoClass();
  app.els.locale = elements.get('locale-select');
  app.els.locale.value = 'zh_cn';

  let syncRouteCalls = 0;
  let refreshCalls = 0;
  app.ensureRenderer = async () => ({});
  app.syncRoute = () => {
    syncRouteCalls += 1;
  };
  app.refreshCurrentViewForLocale = async () => {
    refreshCalls += 1;
  };

  await app.onLocaleChange();

  assert.equal(refreshCalls, 1);
  assert.equal(syncRouteCalls, 0);
});

test('refreshItemGridLocale updates item names in place', async () => {
  const { DemoClass, elements } = await loadDemoAppTestContext();
  assert.equal(typeof DemoClass, 'function');

  const app = new DemoClass();
  const firstName = { textContent: 'old:first' };
  const secondName = { textContent: 'old:second' };
  let replaced = false;
  app.renderer = {
    setBaseUrl() {},
    async setLocale() {},
    async ensureIconStylesheets() {},
    async ensureIconIndices() {},
    translateRegistry(id) {
      return `name:${id}`;
    },
  };
  app.els.itemGrid = elements.get('item-grid');
  app.els.itemGrid.replaceChildren = () => {
    replaced = true;
  };
  app.els.itemGrid.querySelectorAll = () => [
    {
      dataset: { itemId: 'demo:first' },
      querySelector(selector) {
        return selector === '.item-card-name' ? firstName : null;
      },
    },
    {
      dataset: { itemId: 'demo:second' },
      querySelector(selector) {
        return selector === '.item-card-name' ? secondName : null;
      },
    },
  ];

  await app.refreshItemGridLocale();

  assert.equal(firstName.textContent, 'name:demo:first');
  assert.equal(secondName.textContent, 'name:demo:second');
  assert.equal(replaced, false);
});
