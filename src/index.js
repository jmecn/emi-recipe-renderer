/**
 * emi.js — Field Guide EMI layout renderer (schema v2). Standalone library; no demo UI.
 *
 * @exports EmiRecipeRenderer, initEmiSlotCarousels, hideEmiTagPopover, showEmiTagPopover
 *
 * Declarative mount: {@code <div class="emi-recipe" data-recipe-id="namespace:path">}.
 * Export root is {@code mountAll({ baseUrl })} only — not per-element attributes.
 */
'use strict';

  const RECIPE_LAYOUTS_DIR = 'recipes/layouts';

  const PATHS = {
    bundle: 'bundle.json',
    recipeIndex: 'recipes/index.json',
    recipeShardsDir: 'recipes/shards',
    textureManifest: 'textures/manifest.json',
    texturesDir: 'textures',
    tagsDir: 'tags',
    tagsIndex: 'tags/index.json',
    iconsDir: 'icons',
    langDir: 'lang',
  };

  const TAG_CATALOG_TYPES = ['items', 'blocks', 'fluids'];
  const FALLBACK_LOCALE = 'en_us';
  const MISSING_ICON_ID = 'fieldguide:missing_icon';
  const SHARED_RESOURCE_CACHE = new Map();

  /** Same rule as minecraft-web-export {@code RecipeLayoutPaths.safeFileName}. */
  function layoutPathForRecipeId(recipeId) {
    const file = String(recipeId || '').replace(/:/g, '_').replace(/\//g, '_') + '.json';
    return `${RECIPE_LAYOUTS_DIR}/${file}`;
  }

  function parseRecipeIndex(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('invalid recipes/index.json');
    }
    if (!Array.isArray(raw.namespaces)) {
      throw new Error('recipes/index.json must contain namespaces array');
    }
    const namespaces = raw.namespaces
      .filter((id) => typeof id === 'string' && id.length > 0);
    return {
      schema: raw.schema ?? 1,
      scale: Number.isFinite(raw.scale) ? raw.scale : 2,
      namespaces,
    };
  }

  function splitRecipeId(recipeId) {
    const value = String(recipeId || '');
    const idx = value.indexOf(':');
    if (idx <= 0 || idx >= value.length - 1) return null;
    return { namespace: value.slice(0, idx), path: value.slice(idx + 1) };
  }

  function parseTagCatalog(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('invalid tags/index.json');
    }
    const catalog = {
      schema: raw.schema ?? 1,
      items: [],
      blocks: [],
      fluids: [],
    };
    for (const type of TAG_CATALOG_TYPES) {
      const list = raw[type];
      if (list == null) continue;
      if (!Array.isArray(list)) {
        throw new Error(`tags/index.json "${type}" must be array`);
      }
      catalog[type] = list.filter((id) => typeof id === 'string' && id.length > 0);
    }
    return catalog;
  }

  function tagRefToResourcePath(tagRef) {
    let value = String(tagRef || '').trim();
    if (!value) return null;
    if (value.startsWith('#')) value = value.slice(1);
    const parts = value.split(':');
    if (parts.length === 2) {
      return { type: 'items', id: value, resourcePath: `${PATHS.tagsDir}/${parts[0]}/items/${parts[1]}.json` };
    }
    if (parts.length !== 3) return null;
    const tagTypeMap = {
      item: 'items',
      block: 'blocks',
      fluid: 'fluids',
    };
    const type = tagTypeMap[parts[0]] || '';
    if (!type || !parts[1] || !parts[2]) return null;
    return {
      type,
      id: `${parts[1]}:${parts[2]}`,
      resourcePath: `${PATHS.tagsDir}/${parts[1]}/${type}/${parts[2]}.json`,
    };
  }

  function normalizeLocale(locale) {
    return String(locale || FALLBACK_LOCALE).trim().toLowerCase().replace('-', '_');
  }

  /** Lang key order aligned with Forge {@code LangKeyCollector#addRegistryKeys}. */
  function registryLangKeyCandidates(kind, registryId) {
    const id = stripRegistryId(registryId);
    if (!id) return [];
    const dotted = id.replace(/\//g, '.').replace(/:/g, '.');
    let prefixes;
    if (kind === 'fluid') {
      prefixes = ['fluid', 'item', 'block'];
    } else if (kind === 'block') {
      prefixes = ['block', 'item'];
    } else {
      prefixes = ['item', 'block', 'fluid'];
    }
    return prefixes.map((p) => `${p}.${dotted}`);
  }

  function tagToLangKey(tag) {
    if (!tag) return '';
    const dotted = String(tag).replace(/\//g, '.').replace(/:/g, '.');
    return `tag.item.${dotted}`;
  }

  function joinBase(base, path) {
    const b = base.replace(/\/+$/, '');
    const p = path.replace(/^\/+/, '');
    return `${b}/${p}`;
  }

  function normalizeResourceVersion(version) {
    return version == null ? '' : String(version).trim();
  }

  function appendResourceVersion(url, version) {
    const v = normalizeResourceVersion(version);
    if (!v) return url;
    return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}`;
  }

  function resolveAbsoluteUrl(url, baseUrl) {
    const base = baseUrl || globalThis.location?.href || 'http://local.invalid/';
    return new URL(url, base).toString();
  }

  function fetchJsonResource(resourceUrl, fallbackValue) {
    return fetch(resourceUrl).then((res) => {
      if (!res.ok) {
        if (fallbackValue !== undefined) return fallbackValue;
        throw new Error(`resource HTTP ${res.status}`);
      }
      return res.json();
    });
  }

  function fetchRequiredJsonResource(resourceUrl, label, attempt = 0) {
    return fetch(resourceUrl).then((res) => {
      if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
      return res.json();
    }).catch((err) => {
      const message = err?.message || String(err);
      const retriable = attempt < 2
        && (/failed to fetch|network|load/i.test(message) || message.includes('HTTP 5'));
      if (!retriable) throw err;
      const delayMs = 80 * (attempt + 1);
      return new Promise((resolve) => { setTimeout(resolve, delayMs); })
        .then(() => fetchRequiredJsonResource(resourceUrl, label, attempt + 1));
    });
  }

  function createMountQueue(concurrency = 8) {
    let active = 0;
    const pending = [];
    const pump = () => {
      while (active < concurrency && pending.length > 0) {
        const { run, resolve, reject } = pending.shift();
        active += 1;
        run()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            pump();
          });
      }
    };
    return (run) => new Promise((resolve, reject) => {
      pending.push({ run, resolve, reject });
      pump();
    });
  }

  function fetchTextResource(resourceUrl, fallbackValue = '') {
    return fetch(resourceUrl).then((res) => (res.ok ? res.text() : fallbackValue));
  }

  function sharedCacheKey(kind, resourceUrl) {
    return `${kind}:${resourceUrl}`;
  }

  function getSharedResource(kind, resourceUrl, loader) {
    const key = sharedCacheKey(kind, resourceUrl);
    if (!SHARED_RESOURCE_CACHE.has(key)) {
      SHARED_RESOURCE_CACHE.set(key, Promise.resolve()
        .then(loader)
        .catch((err) => {
          SHARED_RESOURCE_CACHE.delete(key);
          throw err;
        }));
    }
    return SHARED_RESOURCE_CACHE.get(key);
  }

  function getSharedJsonResource(kind, resourceUrl, fallbackValue) {
    return getSharedResource(kind, resourceUrl, () => fetchJsonResource(resourceUrl, fallbackValue));
  }

  function getSharedRequiredJsonResource(kind, resourceUrl, label) {
    return getSharedResource(kind, resourceUrl, () => fetchRequiredJsonResource(resourceUrl, label));
  }

  function getSharedTextResource(kind, resourceUrl, fallbackValue = '') {
    return getSharedResource(kind, resourceUrl, () => fetchTextResource(resourceUrl, fallbackValue));
  }

  function rewriteVersionedCssUrls(cssText, stylesheetUrl, version) {
    const baseUrl = resolveAbsoluteUrl(stylesheetUrl);
    return String(cssText || '').replace(/url\(([^)]+)\)/g, (full, raw) => {
      const value = String(raw || '').trim().replace(/^['"]|['"]$/g, '');
      if (!value || value.startsWith('data:')) return full;
      const resolved = resolveAbsoluteUrl(value, baseUrl);
      return `url("${appendResourceVersion(resolved, version)}")`;
    });
  }

  function inferIconSourceType(file) {
    const value = String(file || '').toLowerCase();
    if (value.endsWith('.webp')) return 'image/webp';
    if (value.endsWith('.png')) return 'image/png';
    if (value.endsWith('.avif')) return 'image/avif';
    return '';
  }

  function hasInlineIconAtlas(index) {
    return Object.values(index?.items || {}).some((entry) => (
      entry
      && typeof entry === 'object'
      && Number.isInteger(entry.page)
      && Number.isFinite(entry.x)
      && Number.isFinite(entry.y)
    ));
  }

  function buildIconPagePriority(index, pageCount) {
    const usage = Array.from({ length: pageCount }, () => 0);
    for (const entry of Object.values(index?.items || {})) {
      if (!entry || typeof entry !== 'object') continue;
      if (!Number.isInteger(entry.page) || entry.page < 0 || entry.page >= pageCount) continue;
      usage[entry.page] += Number.isFinite(entry.usage) ? entry.usage : 0;
    }
    return usage
      .map((total, pageIndex) => ({ pageIndex, total }))
      .sort((a, b) => (b.total - a.total) || (a.pageIndex - b.pageIndex))
      .reduce((map, entry, priority) => {
        map[entry.pageIndex] = priority;
        return map;
      }, {});
  }

  function normalizeIconAtlas(index, resolvePageUrl) {
    if (!hasInlineIconAtlas(index)) return null;
    const pages = Array.isArray(index?.pages) ? index.pages : [];
    const priorities = buildIconPagePriority(index, pages.length);
    return {
      cellSize: Number.isFinite(index?.cellSize) ? index.cellSize : 32,
      items: index?.items || {},
      pages: pages.map((page, pageIndex) => {
        const rawSources = Array.isArray(page?.sources) && page.sources.length
          ? page.sources
          : ((page?.file || page?.src) ? [{ file: page.file || page.src }] : []);
        const sources = rawSources
          .map((source) => {
            const file = source?.file || source?.src || '';
            if (!file) return null;
            return {
              type: source?.type || inferIconSourceType(file),
              file,
              url: resolvePageUrl(file),
            };
          })
          .filter(Boolean);
        return {
          width: Number.isFinite(page?.width) ? page.width : 0,
          height: Number.isFinite(page?.height) ? page.height : 0,
          preload: page?.preload === true || priorities[pageIndex] === 0,
          priority: Number.isFinite(page?.priority) ? page.priority : priorities[pageIndex],
          sources,
        };
      }),
    };
  }

  function buildAtlasBackgroundImage(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return '';
    if (sources.length === 1) return `url("${sources[0].url}")`;
    const parts = sources.map((source) => {
      const type = source.type ? ` type("${source.type}")` : '';
      return `url("${source.url}")${type}`;
    });
    return `image-set(${parts.join(', ')})`;
  }

  /** Plain registry id: strip SNBT `{...}` and export NBT hash suffix `id@hex`. */
  function stripRegistryId(id) {
    if (!id) return id;
    let s = String(id);
    const brace = s.indexOf('{');
    if (brace >= 0) s = s.slice(0, brace);
    const at = s.indexOf('@');
    if (at >= 0) s = s.slice(0, at);
    return s;
  }

  function fluidAmount(amount) {
    return amount != null && amount > 0 ? amount : 1000;
  }

  function itemAmount(amount) {
    return amount != null && amount > 0 ? amount : 1;
  }

  function formatFluidMb(amount) {
    return `${fluidAmount(amount)} mB`;
  }

  /** Compact label for tank slots (EMI-style: number only, no unit). */
  function formatFluidMbShort(amount) {
    return String(fluidAmount(amount));
  }

  function formatItemCount(amount) {
    const n = itemAmount(amount);
    return n > 1 ? String(n) : '';
  }

  function createSlotCountLabel(text, kind) {
    const el = document.createElement('span');
    el.className = kind === 'fluid' ? 'emi-slot-count emi-slot-count-fluid' : 'emi-slot-count';
    el.textContent = text;
    return el;
  }

  function parseFluidFromItemNbt(nbt) {
    if (!nbt || typeof nbt !== 'string') return null;
    const nameMatch = nbt.match(/FluidName:"([^"]+)"/);
    if (!nameMatch) return null;
    const amountMatch = nbt.match(/Amount:(\d+)/);
    return {
      id: nameMatch[1],
      amount: amountMatch ? parseInt(amountMatch[1], 10) : 1000,
    };
  }

  function parseRemainderIcon(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string') {
      if (raw.startsWith('item:') || raw.startsWith('fluid:')) return 'other';
      return null;
    }
    if (typeof raw === 'object' && raw.type) return 'other';
    return null;
  }

  function parseIngredientEntry(ingredient) {
    if (ingredient == null) return null;
    if (typeof ingredient === 'string') {
      if (ingredient.startsWith('item:')) {
        return { kind: 'item', ids: [stripRegistryId(ingredient.slice(5))], amount: 1 };
      }
      if (ingredient.startsWith('#item:')) {
        return { kind: 'tag', tagType: 'item', tag: ingredient.slice(6), tagRef: ingredient };
      }
      if (ingredient.startsWith('#block:')) {
        return { kind: 'tag', tagType: 'block', tag: ingredient.slice(7), tagRef: ingredient };
      }
      if (ingredient.startsWith('#fluid:')) {
        return { kind: 'tag', tagType: 'fluid', tag: ingredient.slice(7), tagRef: ingredient };
      }
      if (ingredient.startsWith('fluid:')) {
        const body = ingredient.slice(6);
        const colon = body.lastIndexOf(':');
        if (colon > 0) {
          return {
            kind: 'fluid',
            id: body.slice(0, colon),
            amount: fluidAmount(parseInt(body.slice(colon + 1), 10)),
          };
        }
      }
      return { kind: 'item', ids: [stripRegistryId(ingredient)], amount: 1 };
    }
    if (typeof ingredient === 'object') {
      if (ingredient.type === 'fluid' && ingredient.id) {
        return { kind: 'fluid', id: ingredient.id, amount: fluidAmount(ingredient.amount) };
      }
      if (ingredient.type === 'item' && ingredient.id) {
        const entry = {
          kind: 'item',
          ids: [stripRegistryId(String(ingredient.id))],
          amount: itemAmount(ingredient.amount),
          nbt: ingredient.nbt || null,
          iconKey: ingredient.iconKey ? String(ingredient.iconKey) : null,
        };
        const fluid = parseFluidFromItemNbt(entry.nbt);
        if (fluid) entry.fluid = fluid;
        const rem = parseRemainderIcon(ingredient.remainder);
        if (rem) entry.remainderIcon = rem;
        return entry;
      }
      if (ingredient.id) {
        return {
          kind: 'item',
          ids: [String(ingredient.id)],
          amount: itemAmount(ingredient.amount),
        };
      }
    }
    return null;
  }

  function parseIngredient(ingredient) {
    if (Array.isArray(ingredient)) {
      const entries = ingredient.map(parseIngredientEntry).filter(Boolean);
      return entries.length ? { kind: 'list', entries } : null;
    }
    return parseIngredientEntry(ingredient);
  }

  function collectTagRefsFromParsed(parsed, refs) {
    if (!parsed || !refs) return;
    if (parsed.kind === 'tag' && parsed.tagRef) {
      refs.add(parsed.tagRef);
      return;
    }
    if (parsed.kind === 'list') {
      for (const entry of parsed.entries) {
        collectTagRefsFromParsed(entry, refs);
      }
    }
  }

  function collectTagRefsFromLayout(layout) {
    const refs = new Set();
    for (const w of layout?.widgets || []) {
      collectTagRefsFromParsed(parseIngredient(w.ingredient), refs);
    }
    return refs;
  }

  function appendSlotQuantity(inner, parsed) {
    if (!parsed) return;
    if (parsed.kind === 'item') {
      if (parsed.fluid) {
        inner.appendChild(createSlotCountLabel(formatFluidMbShort(parsed.fluid.amount), 'fluid'));
        return;
      }
      const text = formatItemCount(parsed.amount);
      if (text) inner.appendChild(createSlotCountLabel(text, 'item'));
    } else if (parsed.kind === 'fluid') {
      inner.appendChild(createSlotCountLabel(formatFluidMbShort(parsed.amount), 'fluid'));
    }
  }

  /** Lookup key for icon atlas (plain id or id@hash from export). */
  function lookupIconKey(entry) {
    if (!entry) return null;
    if (entry.iconKey) return entry.iconKey;
    if (entry.kind === 'item' && entry.ids?.[0]) return entry.ids[0];
    return null;
  }

  /**
   * EMI ListEmiIngredient: pick one stable display stack (minimum fluid amount when present).
   */
  function resolveListDisplayEntry(parsed, widget) {
    if (!parsed?.entries?.length) return null;
    const withFluid = parsed.entries.filter((e) => e.fluid?.amount != null);
    if (withFluid.length) {
      return withFluid.reduce((a, b) => (a.fluid.amount <= b.fluid.amount ? a : b));
    }
    const displayId = widget?.tagDisplayItem
      ? stripRegistryId(String(widget.tagDisplayItem))
      : null;
    if (displayId) {
      const match = parsed.entries.find((e) => e.ids?.[0] === displayId);
      if (match) return match;
    }
    return parsed.entries[0];
  }

  function formatPopoverEntryTooltip(entry, renderer) {
    if (!entry || entry.kind !== 'item') return '';
    if (entry.fluid?.id) {
      const fid = entry.ids?.[0] || entry.fluid.id;
      const label = renderer ? renderer.translateRegistry(fid, 'fluid') : fid;
      return `${label} (${formatFluidMb(entry.fluid.amount)})`;
    }
    const id = entry.ids?.[0];
    if (!id) return '';
    const label = renderer ? renderer.translateRegistry(id, 'item') : id;
    const count = formatItemCount(entry.amount);
    return count ? `${label} x${count}` : label;
  }

  function formatItemEntryTooltip(entry, renderer) {
    if (!entry || entry.kind !== 'item') return '';
    if (entry.fluid?.id) {
      const label = renderer ? renderer.translateRegistry(entry.fluid.id, 'fluid') : entry.fluid.id;
      return `${label} (${formatFluidMb(entry.fluid.amount)})`;
    }
    return formatPopoverEntryTooltip(entry, renderer);
  }

  function formatListPopoverTitle(entry, renderer) {
    if (!entry) return '';
    if (entry.fluid?.id) {
      return renderer ? renderer.translateRegistry(entry.fluid.id, 'fluid') : entry.fluid.id;
    }
    return formatPopoverEntryTooltip(entry, renderer);
  }

  function formatListSlotTooltip(parsed, widget, renderer) {
    const display = resolveListDisplayEntry(parsed, widget);
    return formatItemEntryTooltip(display, renderer);
  }

  function formatParsedTooltip(parsed, widget, renderer) {
    if (!parsed) return '';
    if (parsed.kind === 'list') {
      return formatListSlotTooltip(parsed, widget, renderer);
    }
    if (parsed.kind === 'fluid' && parsed.id) {
      const label = renderer ? renderer.translateRegistry(parsed.id, 'fluid') : parsed.id;
      return `${label} (${formatFluidMb(parsed.amount)})`;
    }
    if (parsed.kind === 'item') {
      if (parsed.fluid?.id) {
        const label = renderer ? renderer.translateRegistry(parsed.fluid.id, 'fluid') : parsed.fluid.id;
        return `${label} (${formatFluidMb(parsed.fluid.amount)})`;
      }
      const id = parsed.ids?.[0];
      if (!id) return '';
      const label = renderer ? renderer.translateRegistry(id, 'item') : id;
      const count = formatItemCount(parsed.amount);
      return count ? `${label} x${count}` : label;
    }
    if (parsed.kind === 'tag' && parsed.tag) {
      const tagLabel = renderer ? renderer.translateTag(parsed.tag) : parsed.tag;
      return `Tag: ${tagLabel}`;
    }
    return '';
  }

  function slotTooltip(ingredient, w, parsed, renderer) {
    if (parsed) {
      const fromParsed = formatParsedTooltip(parsed, w, renderer);
      if (fromParsed) return fromParsed;
    }
    if (ingredient == null) return '';
    if (Array.isArray(ingredient)) {
      const listParsed = parseIngredient(ingredient);
      const fromList = formatParsedTooltip(listParsed, w, renderer);
      return fromList || `${ingredient.length} ingredient options`;
    }
    if (typeof ingredient === 'string') {
      if (ingredient.startsWith('#item:')) {
        return `Tag: ${ingredient.slice(6)}`;
      }
      const text = ingredient.replace(/^#item:/, 'Tag: ').replace(/^item:/, '');
      return stripRegistryId(text);
    }
    if (typeof ingredient === 'object') {
      if (ingredient.type === 'fluid') {
        const label = renderer ? renderer.translateRegistry(ingredient.id, 'fluid') : ingredient.id;
        return `${label} (${formatFluidMb(ingredient.amount)})`;
      }
      if (ingredient.type === 'item' && ingredient.id) {
        const fluid = parseFluidFromItemNbt(ingredient.nbt);
        if (fluid) {
          const label = renderer ? renderer.translateRegistry(fluid.id, 'fluid') : fluid.id;
          return `${label} (${formatFluidMb(fluid.amount)})`;
        }
        const label = renderer ? renderer.translateRegistry(ingredient.id, 'item') : ingredient.id;
        const count = formatItemCount(ingredient.amount);
        return count ? `${label} x${count}` : label;
      }
      if (ingredient.id) {
        const label = renderer ? renderer.translateRegistry(ingredient.id, 'item') : ingredient.id;
        const count = formatItemCount(ingredient.amount);
        return count ? `${label} x${count}` : label;
      }
    }
    return `${w.type} (${w.role || '?'})`;
  }

  function createAtlasSpan(cssClass, registryId) {
    const span = document.createElement('span');
    span.className = cssClass;
    span.dataset.item = registryId;
    return span;
  }

  /** EMI {@code ListEmiIngredient} uses wall-clock seconds, not shuffle. */
  const LIST_INGREDIENT_CAROUSEL_MS = 1000;

  function listIngredientCarouselIndex(count) {
    return Math.floor(Date.now() / LIST_INGREDIENT_CAROUSEL_MS) % count;
  }

  function initEmiSlotCarousels(root) {
    root.querySelectorAll('.icon-carousel').forEach((container) => {
      if (container._emiCarouselTimer) {
        clearInterval(container._emiCarouselTimer);
        container._emiCarouselTimer = null;
      }
      const frames = container.querySelectorAll(':scope > span');
      if (frames.length < 2) return;
      const update = () => {
        const index = listIngredientCarouselIndex(frames.length);
        frames.forEach((frame, i) => {
          frame.classList.toggle('icon-carousel-active', i === index);
        });
      };
      update();
      container._emiCarouselTimer = window.setInterval(update, 200);
    });
  }

  class EmiRecipeRenderer {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl || 'export';
      this.resourceVersion = normalizeResourceVersion(options.resourceVersion);
      this.missingIconId = options.missingIconId || MISSING_ICON_ID;
      this.injectIconStylesheets = options.injectIconStylesheets === true;
      this.locale = normalizeLocale(options.locale);
      this._langCache = new Map();
      this._langByLocale = options.lang && typeof options.lang === 'object' ? options.lang : null;
      this._langOverrides = options.translations && typeof options.translations === 'object'
        ? options.translations
        : {};
      this._bundle = null;
      this._activeLang = { fallback: {}, current: {} };
      this._tooltipEl = options.tooltipElement
        || (typeof options.tooltipElementId === 'string'
          ? document.getElementById(options.tooltipElementId)
          : null)
        || document.getElementById('tooltip');
      this._tagPopoverEl = options.tagPopoverElement
        || (typeof options.tagPopoverElementId === 'string'
          ? document.getElementById(options.tagPopoverElementId)
          : null)
        || document.getElementById('tag-popover');
      this.onItemClick = typeof options.onItemClick === 'function' ? options.onItemClick : null;
      this.textureManifest = null;
      this.textureManifestPromise = null;
      this.recipeShardPaths = new Map();
      this.allRecipeIdsPromise = null;
      this.tagCatalog = null;
      this.tagCatalogPromise = null;
      this.tagMemberIdsByRef = new Map();
      this.iconIds = null;
      this.iconAtlas = null;
      this.iconIndexPromise = null;
      this.iconStylesPromise = null;
      this.iconPreloadUrls = new Set();
      this.iconIdlePreloadScheduled = false;
    }

    _resetLoadedResources() {
      this._langCache.clear();
      this._bundle = null;
      this._activeLang = { fallback: {}, current: {} };
      this.textureManifest = null;
      this.textureManifestPromise = null;
      this.recipeShardPaths = new Map();
      this.allRecipeIdsPromise = null;
      this.tagCatalog = null;
      this.tagCatalogPromise = null;
      this.tagMemberIdsByRef = new Map();
      this.iconIds = null;
      this.iconAtlas = null;
      this.iconIndexPromise = null;
      this.iconStylesPromise = null;
      this.iconPreloadUrls = new Set();
      this.iconIdlePreloadScheduled = false;
      document.querySelectorAll('[data-emi-icon]').forEach((el) => el.remove());
    }

    resolveResourceUrl(path) {
      return appendResourceVersion(joinBase(this.baseUrl, path), this.resourceVersion);
    }

    setBaseUrl(url) {
      this.baseUrl = url;
      this._resetLoadedResources();
    }

    setResourceVersion(version) {
      this.resourceVersion = normalizeResourceVersion(version);
      this._resetLoadedResources();
    }

    translateKey(key) {
      if (!key) return '';
      const k = String(key);
      if (this._langOverrides[k] != null) return this._langOverrides[k];
      if (this._activeLang.current[k] != null) return this._activeLang.current[k];
      if (this._activeLang.fallback[k] != null) return this._activeLang.fallback[k];
      return k;
    }

    translateRegistry(registryId, kind = 'item') {
      const bare = stripRegistryId(registryId);
      for (const key of registryLangKeyCandidates(kind, registryId)) {
        const label = this.translateKey(key);
        if (label !== key) return label;
      }
      return bare || String(registryId || '');
    }

    translateTag(tag) {
      const key = tagToLangKey(tag);
      const label = this.translateKey(key);
      return label !== key ? label : tag;
    }

    async ensureLang(locale) {
      const code = normalizeLocale(locale);
      if (this._langCache.has(code)) {
        return this._langCache.get(code);
      }
      if (this._langByLocale?.[code]) {
        const table = { ...this._langByLocale[code] };
        this._langCache.set(code, table);
        return table;
      }
      const path = `${PATHS.langDir}/${code}.json`;
      const resourceUrl = this.resolveResourceUrl(path);
      const table = await getSharedJsonResource('lang', resourceUrl, {});
      this._langCache.set(code, table);
      return table;
    }

    async _refreshActiveLang() {
      const fallbackTable = await this.ensureLang(FALLBACK_LOCALE);
      const locale = this.locale;
      const currentTable = locale === FALLBACK_LOCALE
        ? fallbackTable
        : await this.ensureLang(locale);
      this._activeLang = {
        fallback: fallbackTable,
        current: currentTable,
      };
    }

    async setLocale(locale) {
      this.locale = normalizeLocale(locale);
      await this._refreshActiveLang();
    }

    mergeTranslations(overrides) {
      if (!overrides || typeof overrides !== 'object') return;
      Object.assign(this._langOverrides, overrides);
    }

    async ensureBundle() {
      if (this._bundle) return this._bundle;
      const resourceUrl = this.resolveResourceUrl(PATHS.bundle);
      try {
        this._bundle = await getSharedJsonResource('bundle', resourceUrl, {});
      } catch {
        this._bundle = {};
      }
      if (!this._bundle) this._bundle = {};
      const declaredMissing = this._bundle.missingIconId;
      if (!declaredMissing) {
        throw new Error('bundle.json missing required field: missingIconId');
      }
      this.missingIconId = String(declaredMissing);
      return this._bundle;
    }

    async loadIndex() {
      await this.ensureBundle();
      await this._refreshActiveLang();
      const resourceUrl = this.resolveResourceUrl(PATHS.recipeIndex);
      const raw = await getSharedRequiredJsonResource('index', resourceUrl, 'index');
      return parseRecipeIndex(raw);
    }

    async loadRecipeShardPaths(namespace) {
      const ns = String(namespace || '').trim();
      if (!ns) return [];
      if (this.recipeShardPaths.has(ns)) return this.recipeShardPaths.get(ns);
      const resourceUrl = this.resolveResourceUrl(`${PATHS.recipeShardsDir}/${ns}.json`);
      const shard = await getSharedRequiredJsonResource(`index-shard-${ns}`, resourceUrl, `index-shard:${ns}`);
      if (!Array.isArray(shard)) {
        throw new Error(`recipes/shards/${ns}.json must be an array`);
      }
      const paths = shard.filter((entry) => typeof entry === 'string' && entry.length > 0);
      this.recipeShardPaths.set(ns, paths);
      return paths;
    }

    async loadAllRecipeIds(index) {
      if (this.allRecipeIdsPromise) return this.allRecipeIdsPromise;
      const normalized = parseRecipeIndex(index);
      this.allRecipeIdsPromise = Promise.all(
        normalized.namespaces.map(async (namespace) => {
          const paths = await this.loadRecipeShardPaths(namespace);
          return paths;
        }),
      ).then((groups) => groups.flatMap((paths, groupIndex) => (
        paths.map((path) => `${normalized.namespaces[groupIndex]}:${path}`)
      )));
      return this.allRecipeIdsPromise;
    }

    async loadLayout(recipeId, index) {
      const normalized = parseRecipeIndex(index);
      const split = splitRecipeId(recipeId);
      if (!split || !normalized.namespaces.includes(split.namespace)) {
        throw new Error(`no layout for ${recipeId}`);
      }
      const ids = await this.loadAllRecipeIds(normalized);
      if (!ids.includes(recipeId)) throw new Error(`no layout for ${recipeId}`);
      const layoutPath = layoutPathForRecipeId(recipeId);
      const resourceUrl = this.resolveResourceUrl(layoutPath);
      const layout = await getSharedRequiredJsonResource('layout', resourceUrl, 'layout');
      return {
        layout,
        layoutPath,
      };
    }

    async ensureTextureManifest() {
      if (this.textureManifest) return this.textureManifest;
      if (!this.textureManifestPromise) {
        const resourceUrl = this.resolveResourceUrl(PATHS.textureManifest);
        this.textureManifestPromise = getSharedJsonResource(
          'texture-manifest',
          resourceUrl,
          { textures: {} },
        )
          .then((j) => {
            this.textureManifest = j.textures || {};
            return this.textureManifest;
          })
          .catch(() => {
            this.textureManifest = {};
            return this.textureManifest;
          });
      }
      return this.textureManifestPromise;
    }

    /**
     * Tag list/search catalog (§5.7.2). Not used for recipe render or popover.
     * @returns {{ schema: number, items: string[], blocks: string[], fluids: string[] }}
     */
    async loadTagCatalog() {
      if (this.tagCatalog) return this.tagCatalog;
      if (!this.tagCatalogPromise) {
        const resourceUrl = this.resolveResourceUrl(PATHS.tagsIndex);
        const empty = { schema: 1, items: [], blocks: [], fluids: [] };
        this.tagCatalogPromise = getSharedJsonResource('tag-catalog', resourceUrl, empty)
          .then((raw) => {
            if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
              this.tagCatalog = empty;
            } else {
              try {
                this.tagCatalog = parseTagCatalog(raw);
              } catch (err) {
                this.tagCatalog = empty;
                console.warn('[emi] tags/index.json:', err?.message || err);
              }
            }
            return this.tagCatalog;
          })
          .catch(() => {
            this.tagCatalog = empty;
            return this.tagCatalog;
          });
      }
      return this.tagCatalogPromise;
    }

    getCachedTagCatalog() {
      return this.tagCatalog;
    }

    async loadTagMembers(tagRef) {
      const ref = tagRefToResourcePath(tagRef);
      if (!ref) return [];
      const cacheKey = `${ref.type}:${ref.id}`;
      if (this.tagMemberIdsByRef.has(cacheKey)) {
        return this.tagMemberIdsByRef.get(cacheKey);
      }
      const resourceUrl = this.resolveResourceUrl(ref.resourcePath);
      const root = await getSharedJsonResource(`tag-members:${cacheKey}`, resourceUrl, { values: [] });
      const ids = Array.isArray(root?.values)
        ? root.values.filter((id) => typeof id === 'string' && id.length > 0)
        : [];
      this.tagMemberIdsByRef.set(cacheKey, ids);
      return ids;
    }

    getCachedTagMembers(tagRef) {
      const ref = tagRefToResourcePath(tagRef);
      if (!ref) return [];
      return this.tagMemberIdsByRef.get(`${ref.type}:${ref.id}`) || [];
    }

    async ensureIconStylesheets() {
      if (!this.injectIconStylesheets) return;
      if (this.iconStylesPromise) return this.iconStylesPromise;
      this.iconStylesPromise = (async () => {
        await this.ensureIconIndices();
        if (this.iconAtlas) {
          this.preloadPriorityIconPages();
          this.scheduleDeferredIconPagePreloads();
          return;
        }
        const rel = `${PATHS.iconsDir}/icons.css`;
        const resourceUrl = this.resolveResourceUrl(rel);
        if (this.resourceVersion) {
          if (document.querySelector('style[data-emi-icon="icons"]')) {
            return;
          }
          const cssText = await getSharedTextResource('icon-css', resourceUrl, '');
          const style = document.createElement('style');
          style.dataset.emiIcon = 'icons';
          style.textContent = rewriteVersionedCssUrls(cssText, resourceUrl, this.resourceVersion);
          document.head.appendChild(style);
          return;
        }
        if (document.querySelector('link[data-emi-icon="icons"]')) {
          return;
        }
        await new Promise((resolve) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = resourceUrl;
          link.dataset.emiIcon = 'icons';
          link.onload = () => resolve();
          link.onerror = () => resolve();
          document.head.appendChild(link);
        });
      })();
      return this.iconStylesPromise;
    }

    async ensureIconIndices() {
      if (this.iconIds) return;
      if (!this.iconIndexPromise) {
        const resourceUrl = this.resolveResourceUrl(`${PATHS.iconsDir}/index.json`);
        this.iconIndexPromise = getSharedJsonResource('icon-index', resourceUrl, null)
          .then((index) => {
            const items = index?.items || {};
            const ids = new Set(Object.keys(items));
            ids.add(this.missingIconId);
            this.iconAtlas = normalizeIconAtlas(index, (file) => this.resolveResourceUrl(`${PATHS.iconsDir}/${file}`));
            return ids;
          })
          .then((ids) => {
            this.iconIds = ids;
          })
          .catch(() => {
            this.iconIds = new Set([MISSING_ICON_ID]);
          });
      }
      return this.iconIndexPromise;
    }

    preloadIconPage(pageIndex) {
      const page = this.iconAtlas?.pages?.[pageIndex];
      const primary = page?.sources?.[0];
      if (!primary?.url || this.iconPreloadUrls.has(primary.url)) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = primary.url;
      if (primary.type) link.type = primary.type;
      link.dataset.emiIcon = `atlas-preload-${pageIndex}`;
      document.head.appendChild(link);
      this.iconPreloadUrls.add(primary.url);
    }

    preloadPriorityIconPages() {
      (this.iconAtlas?.pages || []).forEach((page, pageIndex) => {
        if (page?.preload) this.preloadIconPage(pageIndex);
      });
    }

    scheduleDeferredIconPagePreloads() {
      if (!this.iconAtlas || this.iconIdlePreloadScheduled) return;
      const coldPages = (this.iconAtlas.pages || [])
        .map((page, pageIndex) => ({ page, pageIndex }))
        .filter(({ page }) => !page?.preload);
      if (!coldPages.length) return;
      this.iconIdlePreloadScheduled = true;
      const schedule = globalThis.requestIdleCallback
        ? globalThis.requestIdleCallback.bind(globalThis)
        : (cb) => setTimeout(cb, 0);
      schedule(() => {
        coldPages
          .sort((a, b) => (a.page.priority - b.page.priority) || (a.pageIndex - b.pageIndex))
          .forEach(({ pageIndex }) => this.preloadIconPage(pageIndex));
      });
    }

    /** Atlas sprite id for an item/fluid, falling back to {@link MISSING_ICON_ID}. */
    resolveAtlasId(registryId) {
      if (!registryId) return this.missingIconId;
      const bare = stripRegistryId(registryId);
      const candidates = bare === registryId ? [registryId] : [bare, registryId];
      for (const id of candidates) {
        if (this.iconIds?.has(id)) return id;
      }
      return this.missingIconId;
    }

    createAtlasSpanForItem(registryId) {
      return this.createAtlasSpanForIconKey(registryId);
    }

    createAtlasSpanForIconKey(lookupKey) {
      const id = this.resolveAtlasId(lookupKey);
      const span = createAtlasSpan('icon-atlas', id);
      const entry = this.iconAtlas?.items?.[id];
      const page = Number.isInteger(entry?.page) ? this.iconAtlas?.pages?.[entry.page] : null;
      const bgImage = buildAtlasBackgroundImage(page?.sources);
      if (entry && page && bgImage) {
        span.style.width = `${this.iconAtlas.cellSize}px`;
        span.style.height = `${this.iconAtlas.cellSize}px`;
        span.style.backgroundImage = bgImage;
        span.style.backgroundRepeat = 'no-repeat';
        span.style.backgroundPosition = `-${entry.x}px -${entry.y}px`;
        if (page.width && page.height) {
          span.style.backgroundSize = `${page.width}px ${page.height}px`;
        }
      }
      if (id === this.missingIconId && lookupKey) {
        span.title = lookupKey;
        span.dataset.missingFor = lookupKey;
      }
      return span;
    }

    /** @deprecated */
    iconRefForItem(id) {
      return { cssClass: 'icon-atlas', legacy: false };
    }

    resolveItemIds(parsed) {
      if (!parsed) return [];
      if (parsed.kind === 'item') return parsed.ids;
      if (parsed.kind === 'list') {
        return parsed.entries.flatMap((entry) => (entry.kind === 'item' ? entry.ids : []));
      }
      if (parsed.kind === 'tag') {
        if (parsed.tagType !== 'item') return [];
        return this.getCachedTagMembers(parsed.tagRef || `#item:${parsed.tag}`);
      }
      if (parsed.kind === 'fluid') return parsed.id ? [parsed.id] : [];
      return [];
    }

    /** Tag/list/item icon keys for slot display (carousel when size > 1). */
    resolveIconIds(parsed, widget, maxCount = 32) {
      if (!parsed) return [];
      let keys = [];
      if (parsed.kind === 'item') {
        const k = lookupIconKey(parsed);
        if (k) keys = [k];
      } else if (parsed.kind === 'list') {
        keys = parsed.entries
          .filter((e) => e.kind === 'item' && lookupIconKey(e))
          .map((e) => lookupIconKey(e));
        if (keys.length === 0 && widget?.tagDisplayItem) {
          const display = stripRegistryId(String(widget.tagDisplayItem));
          if (display) keys = [display];
        }
      } else if (parsed.kind === 'tag') {
        keys = this.resolveItemIds(parsed);
        if (keys.length === 0 && widget?.tagDisplayItem) {
          const display = stripRegistryId(String(widget.tagDisplayItem));
          if (display) keys = [display];
        }
      } else if (parsed.kind === 'fluid') {
        keys = parsed.id ? [parsed.id] : [];
      }
      const withIcons = keys.filter((k) => this.iconIds?.has(k));
      let merged = withIcons.length ? withIcons : keys;
      if (merged.length === 0 && parsed.kind === 'tag') {
        merged = [this.missingIconId];
      }
      return merged.length > maxCount ? merged.slice(0, maxCount) : merged;
    }

    async preloadTagMembersForLayout(layout) {
      const refs = collectTagRefsFromLayout(layout);
      if (refs.size === 0) return;
      await Promise.all([...refs].map((ref) => this.loadTagMembers(ref)));
    }

    /** Item id to open in a host app (e.g. recipe-viewer item detail). Fluids omitted. */
    resolveSlotNavigateItemId(parsed, widget) {
      if (!parsed) return null;
      if (parsed.kind === 'item' && parsed.ids?.[0]) {
        return stripRegistryId(parsed.ids[0]);
      }
      if (parsed.kind === 'tag') {
        const id = this.resolveTagDisplayId(parsed, widget);
        return id && id !== this.missingIconId ? stripRegistryId(id) : null;
      }
      if (parsed.kind === 'list') {
        const display = resolveListDisplayEntry(parsed, widget);
        if (display?.kind === 'item' && display.ids?.[0]) {
          return stripRegistryId(display.ids[0]);
        }
      }
      return null;
    }

    /**
     * When {@code onItemClick} is set, attach click → host navigation and skip tag/list popovers.
     * @returns {boolean} true if navigation was wired
     */
    bindSlotItemNavigation(el, itemId, meta = {}) {
      if (!itemId || typeof this.onItemClick !== 'function') return false;
      const navId = stripRegistryId(itemId);
      if (!navId || navId === this.missingIconId) return false;
      el.dataset.emiItemId = navId;
      el.classList.add('emi-slot-item-nav');
      const label = this.translateRegistry(navId, meta.registryKind || 'item');
      if (label) el.title = label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onItemClick(navId, meta);
      });
      return true;
    }

    /** EMI TagEmiIngredient: stacks.get(0), with fallbacks when tag-members is missing. */
    resolveTagDisplayId(parsed, widget) {
      const members = this.resolveItemIds(parsed);
      const withIcon = members.find((id) => this.iconIds?.has(id));
      if (withIcon) return withIcon;
      if (widget?.tagDisplayItem) {
        const key = stripRegistryId(String(widget.tagDisplayItem));
        if (this.iconIds?.has(key)) return key;
        return key;
      }
      if (members.length) return members[0];
      return this.missingIconId;
    }

    createSlotIcon(parsed, slotW, slotH, widget) {
      const ICON = 16;
      const wrap = document.createElement('div');
      wrap.className = 'emi-slot-icon';
      wrap.style.left = `${(slotW - ICON) / 2}px`;
      wrap.style.top = `${(slotH - ICON) / 2}px`;

      const keys = this.resolveIconIds(parsed, widget);
      if (keys.length === 0) return null;

      if (keys.length === 1) {
        wrap.appendChild(this.createAtlasSpanForIconKey(keys[0]));
      } else {
        const carousel = document.createElement('div');
        carousel.className = 'icon-carousel emi-slot-carousel';
        keys.forEach((id, i) => {
          const span = this.createAtlasSpanForIconKey(id);
          if (!span) return;
          span.classList.toggle('icon-carousel-active', i === listIngredientCarouselIndex(keys.length));
          carousel.appendChild(span);
        });
        if (!carousel.childNodes.length) return null;
        wrap.appendChild(carousel);
      }

      return wrap.childNodes.length ? wrap : null;
    }

    resolveTexture(id) {
      if (!id || !this.textureManifest) return null;
      const rel = this.textureManifest[id];
      return rel ? this.resolveResourceUrl(`${PATHS.texturesDir}/${rel}`) : null;
    }

    /** EMI recipe panel nine-patch: BACKGROUND @ u=27,v=0 corner=4 center=1 */
    createNinePatchBackground(url, w, h, u, v, cor, cen, texSize) {
      const root = document.createElement('div');
      root.className = 'emi-nine-patch';
      root.style.width = `${w}px`;
      root.style.height = `${h}px`;
      const corcen = cor + cen;
      const innerW = w - cor * 2;
      const innerH = h - cor * 2;
      const patches = [
        [0, 0, cor, cor, u, v, cor, cor],
        [cor, 0, innerW, cor, u + cor, v, cen, cor],
        [cor + innerW, 0, cor, cor, u + corcen, v, cor, cor],
        [0, cor, cor, innerH, u, v + cor, cor, cen],
        [cor, cor, innerW, innerH, u + cor, v + cor, cen, cen],
        [cor + innerW, cor, cor, innerH, u + corcen, v + cor, cor, cen],
        [0, cor + innerH, cor, cor, u, v + corcen, cor, cor],
        [cor, cor + innerH, innerW, cor, u + cor, v + corcen, cen, cor],
        [cor + innerW, cor + innerH, cor, cor, u + corcen, v + corcen, cor, cor],
      ];
      for (const [px, py, pw, ph, su, sv, sw, sh] of patches) {
        const el = document.createElement('div');
        el.className = 'emi-nine-patch-cell';
        el.style.left = `${px}px`;
        el.style.top = `${py}px`;
        el.style.width = `${pw}px`;
        el.style.height = `${ph}px`;
        el.style.backgroundImage = `url("${url}")`;
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundSize = `${(texSize / sw) * pw}px ${(texSize / sh) * ph}px`;
        el.style.backgroundPosition = `-${(su / sw) * pw}px -${(sv / sh) * ph}px`;
        root.appendChild(el);
      }
      return root;
    }

    async render(container, layout) {
      await Promise.all([
        this._refreshActiveLang(),
        this.ensureTextureManifest(),
        this.ensureIconIndices(),
        this.ensureIconStylesheets(),
      ]);
      await this.preloadTagMembersForLayout(layout);
      container.replaceChildren();

      const panel = layout.panel || {};
      const margin = panel.margin ?? 4;
      const frameW = panel.frameWidth ?? (panel.width ?? 0) + margin * 2;
      const frameH = panel.frameHeight ?? (panel.height ?? 0) + margin * 2;
      const displayScale = layout.scale ?? 2;

      const stageWrap = document.createElement('div');
      stageWrap.className = 'emi-recipe-stage';
      const displayW = frameW * displayScale;
      const displayH = frameH * displayScale;
      stageWrap.style.width = `${displayW}px`;
      stageWrap.style.height = `${displayH}px`;

      const frameEl = document.createElement('div');
      frameEl.className = 'emi-recipe-root';
      frameEl.style.setProperty('--emi-scale', String(displayScale));
      frameEl.style.width = `${frameW}px`;
      frameEl.style.height = `${frameH}px`;

      const content = document.createElement('div');
      content.className = 'emi-recipe-content';
      content.style.left = `${margin}px`;
      content.style.top = `${margin}px`;
      content.style.width = `${panel.width ?? frameW - margin * 2}px`;
      content.style.height = `${panel.height ?? frameH - margin * 2}px`;

      const bgUrl = this.resolveTexture('emi:textures/gui/background.png');
      if (bgUrl) {
        frameEl.appendChild(this.createNinePatchBackground(bgUrl, frameW, frameH, 27, 0, 4, 1, 256));
      }

      for (const w of layout.widgets || []) {
        const node = this.renderWidget(w);
        if (node) content.appendChild(node);
      }

      frameEl.appendChild(content);
      stageWrap.appendChild(frameEl);
      container.appendChild(stageWrap);
      initEmiSlotCarousels(stageWrap);
    }

    renderWidget(w) {
      switch (w.type) {
        case 'root_chrome':
        case 'drawable_raster':
        case 'raster':
          return this.renderChrome(w);
        case 'texture':
          return this.renderTexture(w);
        case 'animated_texture':
          return this.renderTexture(w);
        case 'filling_arrow':
          return this.renderFillingArrow(w);
        case 'text':
          return this.renderText(w);
        case 'slot':
          return this.renderSlot(w);
        case 'tank':
          return this.renderTank(w);
        default:
          return null;
      }
    }

    renderChrome(w) {
      if (!w.chrome) return null;
      const box = document.createElement('div');
      box.className = 'emi-layer emi-layer-chrome';
      box.style.left = `${w.x}px`;
      box.style.top = `${w.y}px`;
      box.style.width = `${w.w}px`;
      box.style.height = `${w.h}px`;
      const img = document.createElement('img');
      img.src = this.resolveResourceUrl(w.chrome);
      img.alt = '';
      img.draggable = false;
      box.appendChild(img);
      return box;
    }

    renderTexture(w) {
      const url = this.resolveTexture(w.texture);
      if (!url) return null;
      const box = document.createElement('div');
      box.className = 'emi-layer emi-layer-texture';
      box.style.left = `${w.x}px`;
      box.style.top = `${w.y}px`;
      box.style.width = `${w.w}px`;
      box.style.height = `${w.h}px`;
      const texW = w.texW || 256;
      const texH = w.texH || 256;
      box.style.backgroundImage = `url("${url}")`;
      box.style.backgroundPosition = `-${w.u || 0}px -${w.v || 0}px`;
      box.style.backgroundSize = `${texW}px ${texH}px`;
      return box;
    }

    renderFillingArrow(w) {
      const url = this.resolveTexture('emi:textures/gui/widgets.png');
      if (!url) return null;
      const div = document.createElement('div');
      div.className = 'emi-layer emi-layer-texture';
      div.style.left = `${w.x}px`;
      div.style.top = `${w.y}px`;
      div.style.width = '24px';
      div.style.height = '17px';
      div.style.backgroundImage = `url("${url}")`;
      div.style.backgroundPosition = '-44px -17px';
      div.style.backgroundSize = '256px 256px';
      return div;
    }

    renderText(w) {
      const el = document.createElement('div');
      el.className = 'emi-text';
      el.style.left = `${(w.x || 0) + (w.baseX || 0)}px`;
      el.style.top = `${(w.y || 0) + (w.baseY || 0)}px`;
      if (w.color != null) {
        el.style.color = `#${(w.color & 0xffffff).toString(16).padStart(6, '0')}`;
      }
      if (w.translationKey) {
        el.textContent = this.translateKey(w.translationKey);
      } else {
        el.textContent = w.text || '';
      }
      return el;
    }

    drawSlotBackground(inner, isOutput) {
      const url = this.resolveTexture('emi:textures/gui/widgets.png');
      if (!url) return;
      inner.style.backgroundImage = `url("${url}")`;
      inner.style.backgroundSize = '256px 256px';
      inner.style.backgroundRepeat = 'no-repeat';
      inner.style.backgroundPosition = isOutput ? '-18px 0' : '0 0';
    }

    /** Full fluid icon (EMI-style); amount is shown via the slot count label. */
    createTankFluidFill(parsed) {
      const wrap = document.createElement('div');
      wrap.className = 'emi-tank-fluid';
      const tile = this.createAtlasSpanForIconKey(parsed.id);
      tile.classList.add('emi-tank-fluid-tile');
      wrap.appendChild(tile);
      return wrap;
    }

    shouldShowTagIndicator(parsed) {
      if (!parsed) return false;
      if (parsed.kind === 'tag') return this.resolveItemIds(parsed).length > 1;
      if (parsed.kind === 'list') return parsed.entries.length > 1;
      return false;
    }

    resolveRemainderIcon(parsed, w) {
      if (w?.remainderIcon) return w.remainderIcon;
      if (parsed?.kind === 'item' && parsed.remainderIcon) return parsed.remainderIcon;
      if (parsed?.kind === 'list') {
        const display = resolveListDisplayEntry(parsed, w);
        return display?.remainderIcon || null;
      }
      return null;
    }

    appendRemainderIcon(inner, kind) {
      const url = this.resolveTexture('emi:textures/gui/widgets.png');
      if (!url || !kind) return;
      const mark = document.createElement('span');
      mark.className = `emi-slot-remainder-mark emi-slot-remainder-mark-${kind}`;
      mark.style.backgroundImage = `url("${url}")`;
      inner.appendChild(mark);
    }

    appendTagIndicator(inner) {
      const url = this.resolveTexture('emi:textures/gui/widgets.png');
      if (!url) return;
      const mark = document.createElement('span');
      mark.className = 'emi-slot-tag-mark';
      mark.style.backgroundImage = `url("${url}")`;
      inner.appendChild(mark);
    }

    bindSlotHover(el, ingredient, w, parsed) {
      el.tabIndex = 0;
      const tooltipFor = () => {
        if (parsed?.kind === 'tag' && parsed.tag) {
          const tagLabel = this.translateTag(parsed.tag);
          return `Tag: ${tagLabel}`;
        }
        if (parsed?.kind === 'list') {
          return formatListSlotTooltip(parsed, w, this);
        }
        return slotTooltip(ingredient, w, parsed, this);
      };
      el.addEventListener('mouseenter', () => showTooltip(tooltipFor(), el, this._tooltipEl));
      el.addEventListener('mouseleave', () => hideTooltip(this._tooltipEl));
      el.addEventListener('focus', () => showTooltip(tooltipFor(), el, this._tooltipEl));
      el.addEventListener('blur', () => hideTooltip(this._tooltipEl));

      // Tag slots keep the tag member popover; only plain items (and single-choice lists) navigate.
      if (parsed?.kind !== 'tag') {
        const navId = this.resolveSlotNavigateItemId(parsed, w);
        const skipListPopover = parsed?.kind === 'list' && parsed.entries.length > 1;
        if (!skipListPopover && navId && this.bindSlotItemNavigation(el, navId, {
          source: 'recipe-slot',
          parsed,
          widget: w,
          ingredient,
        })) {
          return;
        }
      }

      if (parsed?.kind === 'tag' && parsed.tag) {
        el.classList.add('emi-slot-tag-input');
        el.title = `Click to view tag: ${this.translateTag(parsed.tag)}`;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          showTagPopover(parsed.tag, el, this);
        });
      } else if (parsed?.kind === 'list' && parsed.entries.length > 1) {
        el.classList.add('emi-slot-tag-input');
        el.title = 'Click to view alternatives';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          showListPopover(parsed, w, el, this);
        });
      }
    }

    renderTank(w) {
      const slotW = w.w || 18;
      const slotH = w.h || 18;
      const parsed = parseIngredient(w.ingredient);
      const hasFluid = parsed?.kind === 'fluid' && parsed.id;

      const el = document.createElement('div');
      el.className = 'emi-slot emi-tank';
      el.style.left = `${w.x}px`;
      el.style.top = `${w.y}px`;
      el.style.width = `${slotW}px`;
      el.style.height = `${slotH}px`;

      const inner = document.createElement('div');
      inner.className = 'emi-slot-inner emi-tank-inner';
      this.drawSlotBackground(inner, false);

      if (hasFluid) {
        inner.appendChild(this.createTankFluidFill(parsed));
        appendSlotQuantity(inner, parsed);
        this.bindSlotHover(el, w.ingredient, w, parsed);
      } else {
        el.classList.add('emi-slot-empty');
      }

      el.appendChild(inner);
      return el;
    }

    renderSlot(w) {
      const slotW = w.w || 18;
      const slotH = w.h || 18;
      const parsed = parseIngredient(w.ingredient);
      const hasIngredient = parsed != null && (
        parsed.kind === 'fluid'
        || parsed.kind === 'list'
        || (parsed.kind === 'item' && parsed.ids.length > 0)
        || (parsed.kind === 'tag' && parsed.tag)
      );
      const isOutput = w.role === 'output' || w.output || w.large;
      const showBack = true;

      const el = document.createElement('div');
      el.className = 'emi-slot';
      if (showBack) el.classList.add('draw-back');
      if (w.large) el.classList.add('large');
      if (parsed?.kind === 'fluid') el.classList.add('emi-slot-fluid');
      if (!hasIngredient) el.classList.add('emi-slot-empty');
      el.style.left = `${w.x}px`;
      el.style.top = `${w.y}px`;
      el.style.width = `${slotW}px`;
      el.style.height = `${slotH}px`;

      const inner = document.createElement('div');
      inner.className = 'emi-slot-inner';
      if (showBack) {
        this.drawSlotBackground(inner, isOutput);
      }

      if (hasIngredient) {
        if (parsed.kind === 'fluid' && parsed.id) {
          inner.appendChild(this.createTankFluidFill(parsed));
        } else {
          const icon = this.createSlotIcon(parsed, slotW, slotH, w);
          if (icon) inner.appendChild(icon);
        }
        const remainderIcon = this.resolveRemainderIcon(parsed, w);
        if (remainderIcon) {
          this.appendRemainderIcon(inner, remainderIcon);
        }
        appendSlotQuantity(
          inner,
          parsed?.kind === 'list' ? resolveListDisplayEntry(parsed, w) : parsed,
        );
        if (this.shouldShowTagIndicator(parsed)) {
          this.appendTagIndicator(inner);
        }
        this.bindSlotHover(el, w.ingredient, w, parsed);
      }

      el.appendChild(inner);
      return el;
    }

    static _mountRendererOptions(options) {
      return {
        injectIconStylesheets: options.injectIconStylesheets,
        missingIconId: options.missingIconId,
        locale: options.locale,
        resourceVersion: options.resourceVersion,
        lang: options.lang,
        translations: options.translations,
        tooltipElement: options.tooltipElement,
        tagPopoverElement: options.tagPopoverElement,
        tooltipElementId: options.tooltipElementId,
        tagPopoverElementId: options.tagPopoverElementId,
        onItemClick: options.onItemClick,
      };
    }

    static _collectMountTargets(root, selector) {
      const nodes = root.querySelectorAll(selector);
      const items = [];
      for (const el of nodes) {
        const recipeId = (el.dataset.recipeId || '').trim();
        if (!recipeId) continue;
        items.push({ el, recipeId });
      }
      return { nodes, items };
    }

    static _showMountError(el, recipeId, message) {
      el.replaceChildren();
      el.classList.remove('emi-recipe-pending');
      const p = document.createElement('p');
      p.className = 'emi-recipe-error';
      p.textContent = message || `Failed to load recipe: ${recipeId}`;
      el.appendChild(p);
    }

    static _displaySizeFromLayout(layout) {
      const panel = layout.panel || {};
      const margin = panel.margin ?? 4;
      const scale = layout.scale ?? 2;
      const frameW = panel.frameWidth ?? (panel.width ?? 0) + margin * 2;
      const frameH = panel.frameHeight ?? (panel.height ?? 0) + margin * 2;
      return {
        width: frameW * scale,
        height: frameH * scale,
      };
    }

    /** Reserve block size on the mount node before paint (grid row height). */
    static _reserveContainerSize(el, layout) {
      const { width, height } = EmiRecipeRenderer._displaySizeFromLayout(layout);
      el.style.width = `${width}px`;
      el.style.minHeight = `${height}px`;
      el.style.boxSizing = 'border-box';
    }

    static async _mountOne(renderer, index, el, recipeId) {
      const { layout } = await renderer.loadLayout(recipeId, index);
      const size = EmiRecipeRenderer._displaySizeFromLayout(layout);
      EmiRecipeRenderer._reserveContainerSize(el, layout);
      await renderer.render(el, layout);
      el.dataset.emiMounted = '1';
      el.classList.remove('emi-recipe-pending');
      el.style.width = `${size.width}px`;
      el.style.minWidth = `${size.width}px`;
      el.style.minHeight = `${size.height}px`;
    }

    static _emitMountProgress(options, stats, total) {
      if (typeof options.onProgress === 'function') {
        options.onProgress({
          mounted: stats.mounted,
          failed: stats.failed,
          pending: total - stats.mounted - stats.failed,
          total,
        });
      }
    }

    /**
     * Load and render one {@code .emi-recipe} from {@code data-recipe-id}
     * (via layouts-index → layout JSON). Layout paths are not part of the public API.
     */
    static async mountElement(el, options = {}) {
      const recipeId = (el.dataset.recipeId || options.recipeId || '').trim();
      if (!recipeId) {
        throw new Error('emi-recipe: missing data-recipe-id');
      }
      const baseUrl = (options.baseUrl || 'export').trim();
      const renderer = new EmiRecipeRenderer({
        baseUrl,
        ...EmiRecipeRenderer._mountRendererOptions(options),
      });
      try {
        const index = await renderer.loadIndex();
        await EmiRecipeRenderer._mountOne(renderer, index, el, recipeId);
        return { recipeId, baseUrl, renderer };
      } catch (e) {
        EmiRecipeRenderer._showMountError(el, recipeId, e?.message);
        throw e;
      }
    }

    /**
     * Mount {@code .emi-recipe[data-recipe-id]} under {@code options.root}.
     * {@code options.lazy === true}: Intersection Observer, mount when near viewport.
     */
    static async mountAll(options = {}) {
      if (options.lazy) {
        return EmiRecipeRenderer._mountAllLazy(options);
      }
      return EmiRecipeRenderer._mountAllEager(options);
    }

    static async _mountAllEager(options = {}) {
      const root = options.root || document;
      const selector = options.selector || '.emi-recipe[data-recipe-id]';
      const baseUrl = (options.baseUrl || 'export').trim();
      const { nodes, items } = EmiRecipeRenderer._collectMountTargets(root, selector);
      const mountOpts = EmiRecipeRenderer._mountRendererOptions(options);
      const stats = { mounted: 0, failed: 0, errors: [] };

      if (items.length === 0) {
        return {
          total: nodes.length,
          mounted: 0,
          failed: 0,
          errors: [],
          baseUrl,
          lazy: false,
        };
      }

      const renderer = new EmiRecipeRenderer({ baseUrl, ...mountOpts });
      let index;
      try {
        index = await renderer.loadIndex();
      } catch (e) {
        for (const { el, recipeId } of items) {
          stats.failed += 1;
          EmiRecipeRenderer._showMountError(el, recipeId, `layouts-index: ${e.message}`);
          stats.errors.push({ recipeId, error: e });
        }
        EmiRecipeRenderer._emitMountProgress(options, stats, items.length);
        return {
          total: nodes.length,
          mounted: stats.mounted,
          failed: stats.failed,
          errors: stats.errors,
          baseUrl,
          lazy: false,
        };
      }

      for (const { el, recipeId } of items) {
        try {
          await EmiRecipeRenderer._mountOne(renderer, index, el, recipeId);
          stats.mounted += 1;
        } catch (err) {
          stats.failed += 1;
          EmiRecipeRenderer._showMountError(el, recipeId, err?.message);
          stats.errors.push({ recipeId, error: err });
        }
        EmiRecipeRenderer._emitMountProgress(options, stats, items.length);
      }

      return {
        total: nodes.length,
        mounted: stats.mounted,
        failed: stats.failed,
        errors: stats.errors,
        baseUrl,
        lazy: false,
      };
    }

    static async _mountAllLazy(options = {}) {
      const root = options.root || document;
      const baseUrl = (options.baseUrl || 'export').trim();
      const mountOpts = EmiRecipeRenderer._mountRendererOptions(options);
      const { nodes, items } = EmiRecipeRenderer._collectMountTargets(
        root,
        '.emi-recipe[data-recipe-id]',
      );
      const stats = { mounted: 0, failed: 0, errors: [] };
      const inFlight = new Set();

      if (items.length === 0) {
        return {
          total: nodes.length,
          mounted: 0,
          failed: 0,
          errors: [],
          baseUrl,
          lazy: true,
          getStats: () => ({ ...stats, pending: 0, total: 0 }),
          disconnect() {},
          flush() {},
        };
      }

      const renderer = new EmiRecipeRenderer({ baseUrl, ...mountOpts });
      let index;
      try {
        index = await renderer.loadIndex();
      } catch (e) {
        for (const { el, recipeId } of items) {
          stats.failed += 1;
          EmiRecipeRenderer._showMountError(el, recipeId, `layouts-index: ${e.message}`);
          stats.errors.push({ recipeId, error: e });
        }
        EmiRecipeRenderer._emitMountProgress(options, stats, items.length);
        return {
          total: nodes.length,
          mounted: stats.mounted,
          failed: stats.failed,
          errors: stats.errors,
          baseUrl,
          lazy: true,
          getStats: () => ({
            mounted: stats.mounted,
            failed: stats.failed,
            pending: items.length - stats.mounted - stats.failed,
            total: items.length,
          }),
          disconnect() {},
          async flush() {},
        };
      }

      const mountConcurrency = Number.isFinite(options.mountConcurrency)
        ? Math.max(1, options.mountConcurrency)
        : 8;
      const enqueueMount = createMountQueue(mountConcurrency);

      const tryMount = (el, recipeId) => {
        if (el.dataset.emiMounted === '1') return Promise.resolve();
        if (inFlight.has(el)) return Promise.resolve();
        inFlight.add(el);
        return enqueueMount(async () => {
          try {
            await EmiRecipeRenderer._mountOne(renderer, index, el, recipeId);
            stats.mounted += 1;
          } catch (err) {
            stats.failed += 1;
            EmiRecipeRenderer._showMountError(el, recipeId, err?.message);
            stats.errors.push({ recipeId, error: err });
          } finally {
            inFlight.delete(el);
            EmiRecipeRenderer._emitMountProgress(options, stats, items.length);
          }
        });
      };

      const flushPending = async () => {
        const pending = items.filter(({ el }) => el.dataset.emiMounted !== '1');
        await Promise.all(pending.map(({ el, recipeId }) => tryMount(el, recipeId)));
      };

      if (typeof IntersectionObserver === 'undefined') {
        await flushPending();
        return {
          total: nodes.length,
          mounted: stats.mounted,
          failed: stats.failed,
          errors: stats.errors,
          baseUrl,
          lazy: false,
          getStats: () => ({
            mounted: stats.mounted,
            failed: stats.failed,
            pending: items.length - stats.mounted - stats.failed,
            total: items.length,
          }),
          disconnect() {},
          flush: flushPending,
        };
      }

      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const id = (entry.target.dataset.recipeId || '').trim();
          if (id) tryMount(entry.target, id);
        }
      }, {
        root: options.observeRoot || null,
        rootMargin: options.rootMargin ?? '400px 0px',
        threshold: options.threshold ?? 0,
      });

      for (const { el } of items) {
        if (el.dataset.emiMounted === '1') continue;
        el.classList.add('emi-recipe-pending');
        observer.observe(el);
      }

      EmiRecipeRenderer._emitMountProgress(options, stats, items.length);

      return {
        total: nodes.length,
        mounted: stats.mounted,
        failed: stats.failed,
        errors: stats.errors,
        baseUrl,
        lazy: true,
        getStats: () => ({
          mounted: stats.mounted,
          failed: stats.failed,
          pending: items.length - stats.mounted - stats.failed,
          total: items.length,
        }),
        disconnect() {
          observer.disconnect();
        },
        flush: flushPending,
      };
    }
  }

  function showTooltip(text, anchor, tipEl) {
    const tip = tipEl || document.getElementById('tooltip');
    if (!tip || !text) return;
    tip.textContent = text;
    tip.style.display = 'block';
    const r = anchor.getBoundingClientRect();
    tip.style.left = `${Math.min(r.left, window.innerWidth - 330)}px`;
    tip.style.top = `${r.bottom + 6}px`;
  }

  function hideTooltip(tipEl) {
    const tip = tipEl || document.getElementById('tooltip');
    if (tip) tip.style.display = 'none';
  }

  const TAG_SLOT = 18;
  const TAG_GRID_Y = 24;
  const TAG_DISPLAY_SCALE = 2;
  /** EMI EmiIngredientRecipe: fixed 8-column panel (144px). */
  const TAG_PANEL_COLS = 8;
  const TAG_PANEL_W = TAG_PANEL_COLS * TAG_SLOT;
  /** EMI drawNinePatch uses displayWidth/Height + 8 (4px border each side). */
  const TAG_PANEL_BORDER = 4;

  function tagContentHeight(itemCount) {
    if (!itemCount) return TAG_GRID_Y;
    const rows = Math.ceil(itemCount / TAG_PANEL_COLS);
    return TAG_GRID_Y + rows * TAG_SLOT;
  }

  function tagEmiRecipeId(tag, tagKind = 'item') {
    const segment = tagKind === 'block' ? 'block' : tagKind === 'fluid' ? 'fluid' : 'item';
    return `emi:/tag/${segment}/${tag.replace(':', '/')}`;
  }

  function tagRefForKind(tag, tagKind = 'item') {
    const prefix = tagKind === 'block' ? 'block' : tagKind === 'fluid' ? 'fluid' : 'item';
    return `#${prefix}:${tag}`;
  }

  let tagPopoverAnchor = null;
  let tagPopoverDismissInstalled = false;

  function hideEmiTagPopover(popEl) {
    const pop = popEl || document.getElementById('tag-popover');
    if (pop) pop.hidden = true;
    tagPopoverAnchor = null;
  }

  function installTagPopoverDismiss(pop) {
    if (!pop || tagPopoverDismissInstalled) return;
    tagPopoverDismissInstalled = true;
    pop.addEventListener('click', (e) => {
      if (e.target === pop) hideEmiTagPopover(pop);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && pop && !pop.hidden) hideEmiTagPopover(pop);
    });
  }

  function listPopoverItems(parsed, renderer) {
    return parsed.entries.map((entry) => ({
      lookupKey: lookupIconKey(entry) || entry.ids?.[0] || MISSING_ICON_ID,
      tooltip: formatPopoverEntryTooltip(entry, renderer),
      remainderIcon: entry.remainderIcon || null,
      quantity: entry.fluid ? null : entry,
    }));
  }

  function createPopoverSlot(renderer, spec, showTagMark) {
    const cell = document.createElement('div');
    cell.className = 'tag-popover-slot tag-popover-grid-slot';
    cell.tabIndex = 0;

    const inner = document.createElement('div');
    inner.className = 'emi-slot-inner';
    renderer.drawSlotBackground(inner, false);

    const iconWrap = document.createElement('div');
    iconWrap.className = 'emi-slot-icon';
    iconWrap.style.left = '1px';
    iconWrap.style.top = '1px';
    iconWrap.appendChild(renderer.createAtlasSpanForIconKey(spec.lookupKey));
    inner.appendChild(iconWrap);
    if (spec.remainderIcon) renderer.appendRemainderIcon(inner, spec.remainderIcon);
    if (spec.quantity) appendSlotQuantity(inner, spec.quantity);
    if (showTagMark) renderer.appendTagIndicator(inner);

    cell.appendChild(inner);
    cell.addEventListener('mouseenter', () => showTooltip(spec.tooltip, cell, renderer._tooltipEl));
    cell.addEventListener('mouseleave', () => hideTooltip(renderer._tooltipEl));
    cell.addEventListener('focus', () => showTooltip(spec.tooltip, cell, renderer._tooltipEl));
    cell.addEventListener('blur', () => hideTooltip(renderer._tooltipEl));
    renderer.bindSlotItemNavigation(cell, spec.lookupKey, {
      source: 'tag-popover',
      lookupKey: spec.lookupKey,
    });
    return cell;
  }

  function createTagPopoverSlot(renderer, itemId, showTagMark) {
    return createPopoverSlot(renderer, {
      lookupKey: itemId,
      tooltip: renderer.translateRegistry(itemId, 'item'),
      remainderIcon: null,
      quantity: null,
    }, showTagMark);
  }

  async function showIngredientPopover({
    title,
    subtitle,
    items,
    anchorEl,
    renderer,
    emptyMessage,
    featuredIndex = 0,
  }) {
    const pop = renderer._tagPopoverEl;
    if (!pop) return;
    installTagPopoverDismiss(pop);

    if (tagPopoverAnchor === anchorEl && !pop.hidden) {
      hideEmiTagPopover(pop);
      return;
    }

    await Promise.all([
      renderer._refreshActiveLang(),
      renderer.ensureTextureManifest(),
      renderer.ensureIconStylesheets(),
      renderer.ensureIconIndices(),
    ]);

    hideTooltip(renderer._tooltipEl);
    tagPopoverAnchor = anchorEl;

    const header = pop.querySelector('.tag-popover-header');
    const stageWrap = pop.querySelector('.tag-popover-stage-wrap');
    const footer = pop.querySelector('.tag-popover-footer');

    header.replaceChildren();
    const headRow = document.createElement('div');
    headRow.className = 'tag-popover-header-row';

    const headText = document.createElement('div');
    headText.className = 'tag-popover-header-text';
    const titleEl = document.createElement('div');
    titleEl.className = 'tag-popover-title';
    titleEl.textContent = title;
    const subEl = document.createElement('div');
    subEl.className = 'tag-popover-emi-id';
    subEl.textContent = subtitle;
    headText.appendChild(titleEl);
    headText.appendChild(subEl);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tag-popover-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideEmiTagPopover(pop);
    });

    headRow.appendChild(headText);
    headRow.appendChild(closeBtn);
    header.appendChild(headRow);
    footer.textContent = subtitle;

    stageWrap.replaceChildren();

    const contentW = TAG_PANEL_W;
    const contentH = tagContentHeight(items.length);
    const panelW = contentW + TAG_PANEL_BORDER * 2;
    const panelH = contentH + TAG_PANEL_BORDER * 2;
    const scale = TAG_DISPLAY_SCALE;

    const stage = document.createElement('div');
    stage.className = 'tag-popover-stage';
    stage.style.width = `${panelW * scale}px`;
    stage.style.height = `${panelH * scale}px`;

    const root = document.createElement('div');
    root.className = 'tag-popover-root';
    root.style.setProperty('--emi-scale', String(scale));
    root.style.width = `${panelW}px`;
    root.style.height = `${panelH}px`;

    const body = document.createElement('div');
    body.className = 'tag-popover-body';
    body.style.left = `${TAG_PANEL_BORDER}px`;
    body.style.top = `${TAG_PANEL_BORDER}px`;
    body.style.width = `${contentW}px`;
    body.style.height = `${contentH}px`;

    const bgUrl = renderer.resolveTexture('emi:textures/gui/background.png');
    if (bgUrl) {
      root.appendChild(renderer.createNinePatchBackground(
        bgUrl, panelW, panelH, 27, 0, 4, 1, 256,
      ));
    }

    if (items.length > 0) {
      const featuredSpec = items[featuredIndex] || items[0];
      const featured = document.createElement('div');
      featured.className = 'tag-popover-featured-slot';
      featured.appendChild(createPopoverSlot(renderer, featuredSpec, items.length > 1));
      body.appendChild(featured);

      const grid = document.createElement('div');
      grid.className = 'tag-popover-grid';
      items.forEach((spec, i) => {
        const cell = createPopoverSlot(renderer, spec, false);
        cell.style.left = `${(i % TAG_PANEL_COLS) * TAG_SLOT}px`;
        cell.style.top = `${Math.floor(i / TAG_PANEL_COLS) * TAG_SLOT}px`;
        grid.appendChild(cell);
      });
      body.appendChild(grid);
    } else {
      const empty = document.createElement('p');
      empty.className = 'tag-popover-empty';
      empty.textContent = emptyMessage || 'No items';
      body.appendChild(empty);
    }

    root.appendChild(body);
    stage.appendChild(root);
    stageWrap.appendChild(stage);
    pop.hidden = false;
  }

  async function showListPopover(parsed, widget, anchorEl, renderer) {
    const items = listPopoverItems(parsed);
    const display = resolveListDisplayEntry(parsed, widget);
    const displayKey = lookupIconKey(display) || display?.ids?.[0];
    let featuredIndex = items.findIndex((item) => item.lookupKey === displayKey);
    if (featuredIndex < 0) featuredIndex = 0;
    await showIngredientPopover({
      title: formatListPopoverTitle(display),
      subtitle: `${items.length} ingredient options`,
      items,
      anchorEl,
      renderer,
      emptyMessage: 'No alternatives',
      featuredIndex,
    });
  }

  async function showTagPopover(tag, anchorEl, renderer, tagKind = 'item') {
    const tagRef = tagRefForKind(tag, tagKind);
    const ids = await renderer.loadTagMembers(tagRef);
    const registryKind = tagKind === 'fluid' ? 'fluid' : 'item';
    const items = ids.map((id) => ({
      lookupKey: id,
      tooltip: renderer.translateRegistry(id, registryKind),
      remainderIcon: null,
      quantity: null,
    }));
    const tagTypeDir = tagKind === 'block' ? 'blocks' : tagKind === 'fluid' ? 'fluids' : 'items';
    await showIngredientPopover({
      title: renderer.translateTag(tag),
      subtitle: tagEmiRecipeId(tag, tagKind),
      items,
      anchorEl,
      renderer,
      emptyMessage: `No members for ${tagRef} in ${PATHS.tagsDir}/<namespace>/${tagTypeDir}/*.json`,
    });
  }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EmiRecipeRenderer,
    initEmiSlotCarousels,
    hideEmiTagPopover,
    showEmiTagPopover: showTagPopover,
    MISSING_ICON_ID,
  };
}
globalThis.EmiRecipeRenderer = EmiRecipeRenderer;
globalThis.initEmiSlotCarousels = initEmiSlotCarousels;
globalThis.hideEmiTagPopover = hideEmiTagPopover;
globalThis.showEmiTagPopover = showTagPopover;
globalThis.EmiMissingIconId = MISSING_ICON_ID;
globalThis.stripEmiRegistryId = stripRegistryId;
