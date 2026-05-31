import assert from 'node:assert/strict';
import test from 'node:test';
import { installRendererDomStubs, jsonResponse } from './test-helpers.mjs';

installRendererDomStubs();
await import('../src/index.js');

const { EmiRecipeRenderer } = globalThis;

function countCalls(fetchCalls, suffix) {
  return fetchCalls.filter((url) => url.endsWith(suffix)).length;
}

function bundlePayload(extra = {}) {
  return {
    schema: 2,
    imageScale: 2,
    recipeCount: 1,
    languages: ['en_us'],
    missingIconId: 'fieldguide:missing_icon',
    ...extra,
  };
}

const DEMO_META = {
  schema: 1,
  id: 'demo:test',
  width: 126,
  height: 62,
  widgets: [],
};

test('ensureBundle requires missingIconId in bundle.json', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/bundle.json')) return jsonResponse({ languages: ['en_us'] });
    throw new Error(`unexpected url ${url}`);
  };

  const renderer = new EmiRecipeRenderer({ baseUrl: '/emi-strict', locale: 'en_us' });
  await assert.rejects(
    () => renderer.loadIndex(),
    /missingIconId/,
  );
});

test('loadIndex reuses bundle and lang across renderer instances', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/bundle.json')) {
      return jsonResponse(bundlePayload());
    }
    if (href.endsWith('/lang/en_us.json')) return jsonResponse({});
    throw new Error(`unexpected url ${href}`);
  };

  const a = new EmiRecipeRenderer({ baseUrl: '/emi-a', locale: 'en_us' });
  const b = new EmiRecipeRenderer({ baseUrl: '/emi-a', locale: 'en_us' });

  await a.loadIndex();
  await b.loadIndex();

  assert.equal(countCalls(fetchCalls, '/bundle.json'), 1);
  assert.equal(countCalls(fetchCalls, '/lang/en_us.json'), 1);
});

test('loadRecipeMeta reuses recipe meta json across renderer instances', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/bundle.json')) {
      return jsonResponse(bundlePayload());
    }
    if (href.endsWith('/recipes/demo/test.json')) {
      return jsonResponse(DEMO_META);
    }
    throw new Error(`unexpected url ${href}`);
  };
  const a = new EmiRecipeRenderer({ baseUrl: '/emi-b', locale: 'en_us' });
  const b = new EmiRecipeRenderer({ baseUrl: '/emi-b', locale: 'en_us' });

  await a.loadRecipeMeta('demo:test');
  await b.loadRecipeMeta('demo:test');

  assert.equal(countCalls(fetchCalls, '/recipes/demo/test.json'), 1);
});

test('resourceVersion appends version to data urls and isolates shared cache per version', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.includes('/bundle.json')) {
      return jsonResponse(bundlePayload());
    }
    if (href.includes('/lang/en_us.json')) return jsonResponse({});
    throw new Error(`unexpected url ${href}`);
  };

  const a = new EmiRecipeRenderer({ baseUrl: '/emi-c', locale: 'en_us', resourceVersion: 'v1' });
  const b = new EmiRecipeRenderer({ baseUrl: '/emi-c', locale: 'en_us', resourceVersion: 'v1' });
  const c = new EmiRecipeRenderer({ baseUrl: '/emi-c', locale: 'en_us', resourceVersion: 'v2' });

  await a.loadIndex();
  await b.loadIndex();
  await c.loadIndex();

  assert.equal(countCalls(fetchCalls, '/bundle.json?v=v1'), 1);
  assert.equal(countCalls(fetchCalls, '/lang/en_us.json?v=v1'), 1);
  assert.equal(countCalls(fetchCalls, '/bundle.json?v=v2'), 1);
  assert.equal(countCalls(fetchCalls, '/lang/en_us.json?v=v2'), 1);
});

test('loadTagCatalog fetches tags/index.json and caches result', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/tags/index.json')) {
      return jsonResponse({
        schema: 1,
        items: ['forge:cloth', 'minecraft:planks'],
        blocks: ['minecraft:mineable/pickaxe'],
      });
    }
    throw new Error(`unexpected url ${href}`);
  };

  const renderer = new EmiRecipeRenderer({ baseUrl: '/emi-tag-catalog', locale: 'en_us' });
  const a = await renderer.loadTagCatalog();
  const b = await renderer.loadTagCatalog();

  assert.equal(a.schema, 1);
  assert.deepEqual(a.items, ['forge:cloth', 'minecraft:planks']);
  assert.deepEqual(a.blocks, ['minecraft:mineable/pickaxe']);
  assert.deepEqual(a.fluids, []);
  assert.strictEqual(a, b);
  assert.equal(countCalls(fetchCalls, '/tags/index.json'), 1);
});

test('ensureTextureManifest enables gui textures used by tag popover', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/textures/manifest.json')) {
      return jsonResponse({
        textures: {
          'emi:textures/gui/background.png': 'emi/textures/gui/background.png',
          'emi:textures/gui/widgets.png': 'emi/textures/gui/widgets.png',
        },
      });
    }
    throw new Error(`unexpected url ${url}`);
  };

  const renderer = new EmiRecipeRenderer({ baseUrl: '/emi-tex', locale: 'en_us' });
  assert.equal(renderer.resolveTexture('emi:textures/gui/background.png'), null);
  await renderer.ensureTextureManifest();
  assert.match(
    renderer.resolveTexture('emi:textures/gui/background.png'),
    /background\.png$/,
  );
});

test('loadTagCatalog returns empty buckets when index is missing', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/tags/index.json')) {
      return new Response('', { status: 404 });
    }
    throw new Error(`unexpected url ${url}`);
  };

  const renderer = new EmiRecipeRenderer({ baseUrl: '/emi-no-tags', locale: 'en_us' });
  const catalog = await renderer.loadTagCatalog();
  assert.deepEqual(catalog, { schema: 1, items: [], blocks: [], fluids: [] });
});

test('loadTagMembers fetches per-tag file and caches result', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCalls.push(href);
    if (href.endsWith('/tags/forge/items/cloth.json')) {
      return jsonResponse({ values: ['tfc:burlap_cloth'] });
    }
    throw new Error(`unexpected url ${href}`);
  };

  const renderer = new EmiRecipeRenderer({ baseUrl: '/emi-tags', locale: 'en_us' });
  const a = await renderer.loadTagMembers('#item:forge:cloth');
  const b = await renderer.loadTagMembers('#item:forge:cloth');

  assert.deepEqual(a, ['tfc:burlap_cloth']);
  assert.deepEqual(b, ['tfc:burlap_cloth']);
  assert.equal(countCalls(fetchCalls, '/tags/forge/items/cloth.json'), 1);
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
