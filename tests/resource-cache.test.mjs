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
