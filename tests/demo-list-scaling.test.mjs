import assert from 'node:assert/strict';
import test from 'node:test';

import { loadDemoAppTestContext } from './test-helpers.mjs';

function createRendererStub() {
  return {
    missingIconId: 'fieldguide:missing_icon',
    async ensureIconStylesheets() {},
    async ensureIconIndices() {},
    translateRegistry(id) {
      return `name:${id}`;
    },
    resolveAtlasId(id) {
      return id;
    },
  };
}

test('renderItemGrid renders large lists in idle batches', async () => {
  const { DemoClass, elements } = await loadDemoAppTestContext();
  const app = new DemoClass();
  const renderer = createRendererStub();
  const queued = [];

  app.renderer = renderer;
  app.itemIds = ['demo:a', 'demo:b', 'demo:c'];
  app.itemGridBatchSize = 2;
  app.els.itemGrid = elements.get('item-grid');
  app.filteredItemIds = () => [...app.itemIds];
  app.ensureItemRenderer = async () => renderer;
  app.queueIdleWork = (cb) => {
    queued.push(cb);
    return queued.length;
  };

  await app.renderItemGrid();

  assert.equal(app.els.itemGrid.childNodes.length, 2);
  assert.equal(queued.length, 1);

  await queued.shift()();

  assert.equal(app.els.itemGrid.childNodes.length, 3);
});

test('renderItemGrid only mounts card icons after intersection', async () => {
  const { DemoClass, elements } = await loadDemoAppTestContext();
  const app = new DemoClass();
  const renderer = createRendererStub();
  const observers = [];

  globalThis.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }

    observe(target) {
      this.target = target;
    }

    unobserve() {}

    disconnect() {}
  };

  app.renderer = renderer;
  app.itemIds = ['demo:a'];
  app.itemGridBatchSize = 1;
  app.els.itemGrid = elements.get('item-grid');
  app.filteredItemIds = () => [...app.itemIds];
  app.ensureItemRenderer = async () => renderer;
  app.queueIdleWork = async (cb) => cb();

  await app.renderItemGrid();

  const card = app.els.itemGrid.childNodes[0];
  const iconWrap = card.childNodes[0];
  assert.equal(iconWrap.childNodes.length, 0);
  assert.equal(observers.length, 1);

  observers[0].callback([{ isIntersecting: true, target: iconWrap }]);

  assert.equal(iconWrap.childNodes.length, 1);
  assert.equal(iconWrap.childNodes[0].dataset.item, 'demo:a');
});
