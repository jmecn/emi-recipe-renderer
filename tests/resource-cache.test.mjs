import assert from 'node:assert/strict';
import test from 'node:test';
import { installRendererDomStubs, jsonResponse } from './test-helpers.mjs';

installRendererDomStubs();
await import('../src/index.js');

const { EmiRecipeRenderer } = globalThis;

test('loadIndex reuses bundle, lang, and recipe index across renderer instances', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/bundle.json')) return jsonResponse({ languages: ['en_us'] });
    if (href.endsWith('/lang/en_us.json')) return jsonResponse({});
    if (href.endsWith('/recipes/index.json')) return jsonResponse({ recipes: {}, scale: 2 });
    throw new Error(`unexpected url ${href}`);
  };

  const a = new EmiRecipeRenderer({ baseUrl: '/emi-a', locale: 'en_us' });
  const b = new EmiRecipeRenderer({ baseUrl: '/emi-a', locale: 'en_us' });

  await a.loadIndex();
  await b.loadIndex();

  assert.equal(fetchCalls.filter((u) => u.endsWith('/bundle.json')).length, 1);
  assert.equal(fetchCalls.filter((u) => u.endsWith('/lang/en_us.json')).length, 1);
  assert.equal(fetchCalls.filter((u) => u.endsWith('/recipes/index.json')).length, 1);
});

test('loadLayout reuses layout json across renderer instances', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/recipes/layouts/test.json')) {
      return jsonResponse({ panel: { width: 126, height: 62 }, widgets: [] });
    }
    throw new Error(`unexpected url ${href}`);
  };

  const index = { recipes: { 'demo:test': { layout: 'recipes/layouts/test.json' } } };
  const a = new EmiRecipeRenderer({ baseUrl: '/emi-b', locale: 'en_us' });
  const b = new EmiRecipeRenderer({ baseUrl: '/emi-b', locale: 'en_us' });

  await a.loadLayout('demo:test', index);
  await b.loadLayout('demo:test', index);

  assert.equal(fetchCalls.filter((u) => u.endsWith('/recipes/layouts/test.json')).length, 1);
});

test('resourceVersion appends version to data urls and isolates shared cache per version', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.includes('/bundle.json')) return jsonResponse({ languages: ['en_us'] });
    if (href.includes('/lang/en_us.json')) return jsonResponse({});
    if (href.includes('/recipes/index.json')) return jsonResponse({ recipes: {}, scale: 2 });
    throw new Error(`unexpected url ${href}`);
  };

  const a = new EmiRecipeRenderer({ baseUrl: '/emi-c', locale: 'en_us', resourceVersion: 'v1' });
  const b = new EmiRecipeRenderer({ baseUrl: '/emi-c', locale: 'en_us', resourceVersion: 'v1' });
  const c = new EmiRecipeRenderer({ baseUrl: '/emi-c', locale: 'en_us', resourceVersion: 'v2' });

  await a.loadIndex();
  await b.loadIndex();
  await c.loadIndex();

  assert.equal(fetchCalls.filter((u) => u.endsWith('/bundle.json?v=v1')).length, 1);
  assert.equal(fetchCalls.filter((u) => u.endsWith('/lang/en_us.json?v=v1')).length, 1);
  assert.equal(fetchCalls.filter((u) => u.endsWith('/recipes/index.json?v=v1')).length, 1);
  assert.equal(fetchCalls.filter((u) => u.endsWith('/bundle.json?v=v2')).length, 1);
  assert.equal(fetchCalls.filter((u) => u.endsWith('/lang/en_us.json?v=v2')).length, 1);
  assert.equal(fetchCalls.filter((u) => u.endsWith('/recipes/index.json?v=v2')).length, 1);
});

test('ensureIconStylesheets rewrites atlas urls with resourceVersion for non-demo consumers', async () => {
  installRendererDomStubs();

  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/icons/index.json?v=v3')) {
      return jsonResponse({ items: { 'fieldguide:missing_icon': [0, 0] } });
    }
    if (href.endsWith('/icons/icons.css?v=v3')) {
      return new Response('.icon-atlas{background-image:url("atlas-000.png");}', {
        status: 200,
        headers: { 'Content-Type': 'text/css' },
      });
    }
    throw new Error(`unexpected url ${href}`);
  };

  const renderer = new EmiRecipeRenderer({
    baseUrl: '/emi-d',
    locale: 'en_us',
    resourceVersion: 'v3',
    injectIconStylesheets: true,
  });

  await renderer.ensureIconStylesheets();

  const styleEl = document._appendedNodes.find((node) => node.tagName === 'STYLE' && node.dataset?.emiIcon === 'icons');
  assert.ok(styleEl);
  assert.match(styleEl.textContent, /atlas-000\.png\?v=v3/);
  assert.ok(fetchCalls.some((u) => u.endsWith('/icons/icons.css?v=v3')));
});

test('manifest-driven icons preload the core shard and use inline atlas styles', async () => {
  installRendererDomStubs();

  let idleTask = null;
  globalThis.requestIdleCallback = (cb) => {
    idleTask = cb;
    return 1;
  };

  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/icons/index.json')) {
      return jsonResponse({
        schema: 1,
        cellSize: 32,
        pages: [
          {
            width: 2048,
            height: 2048,
            preload: true,
            sources: [
              { type: 'image/webp', file: 'atlas-000.webp' },
              { type: 'image/png', file: 'atlas-000.png' },
            ],
          },
          {
            width: 2048,
            height: 2048,
            file: 'atlas-001.png',
          },
        ],
        items: {
          'fieldguide:missing_icon': { page: 0, x: 0, y: 0, usage: 1 },
          'demo:core': { page: 0, x: 64, y: 96, usage: 1000 },
          'demo:cold': { page: 1, x: 128, y: 160, usage: 1 },
        },
      });
    }
    throw new Error(`unexpected url ${href}`);
  };

  const renderer = new EmiRecipeRenderer({
    baseUrl: '/emi-e',
    locale: 'en_us',
    injectIconStylesheets: true,
  });

  await renderer.ensureIconStylesheets();

  assert.deepEqual(fetchCalls, ['/emi-e/icons/index.json']);
  const coreLinks = document._appendedNodes.filter((node) => node.tagName === 'LINK' && node.rel === 'preload');
  assert.equal(coreLinks.length, 1);
  assert.equal(coreLinks[0].href, '/emi-e/icons/atlas-000.webp');

  const span = renderer.createAtlasSpanForItem('demo:core');
  assert.equal(span.style.width, '32px');
  assert.equal(span.style.height, '32px');
  assert.equal(span.style.backgroundPosition, '-64px -96px');
  assert.match(span.style.backgroundImage, /image-set/);
  assert.match(span.style.backgroundImage, /atlas-000\.webp/);
  assert.match(span.style.backgroundImage, /atlas-000\.png/);

  assert.ok(idleTask);
  idleTask();
  await Promise.resolve();

  const allLinks = document._appendedNodes.filter((node) => node.tagName === 'LINK' && node.rel === 'preload');
  assert.equal(allLinks.length, 2);
  assert.equal(allLinks[1].href, '/emi-e/icons/atlas-001.png');
});
