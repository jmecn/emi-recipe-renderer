/**
 * emi-recipe-renderer interactive demo (not part of the library).
 */
(function (global) {
  'use strict';

  const { EmiRecipeRenderer, hideEmiTagPopover } = global;

  const DEMO_BASE_URL = 'emi';
  const STORAGE_LOCALE = 'emiRendererDemoLocale';
  const DEMO_JSON_CACHE = new Map();
  const RECIPE_FILTER_PLACEHOLDER = 'Filter recipe id or category…';
  const ITEM_FILTER_PLACEHOLDER = 'Filter item id or name…';
  const ITEM_GRID_BATCH_SIZE = 120;

  function joinBase(base, path) {
    const b = base.replace(/\/+$/, '');
    const p = path.replace(/^\/+/, '');
    return `${b}/${p}`;
  }

  function loadDemoJson(baseUrl, path, fallbackValue) {
    const key = joinBase(baseUrl, path);
    if (!DEMO_JSON_CACHE.has(key)) {
      DEMO_JSON_CACHE.set(key, fetch(key)
        .then((r) => (r.ok ? r.json() : fallbackValue))
        .catch(() => fallbackValue));
    }
    return DEMO_JSON_CACHE.get(key);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    };
    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
  }

  /** Same rules as library {@code stripRegistryId} (SNBT + `@nbtHash`). */
  function canonicalItemId(id) {
    if (!id) return id;
    let s = String(id);
    const brace = s.indexOf('{');
    if (brace >= 0) s = s.slice(0, brace);
    const at = s.indexOf('@');
    if (at >= 0) s = s.slice(0, at);
    return s;
  }

  function isItemRoute(tab) {
    return tab === 'items' || tab === 'item-detail';
  }

  function mergeItemsIndex(raw) {
    const merged = {};
    for (const [rawId, entry] of Object.entries(raw?.items || {})) {
      const id = canonicalItemId(rawId);
      if (!merged[id]) merged[id] = { inputs: new Set(), outputs: new Set() };
      for (const r of entry.inputs || []) merged[id].inputs.add(r);
      for (const r of entry.outputs || []) merged[id].outputs.add(r);
    }
    const items = {};
    for (const [id, entry] of Object.entries(merged)) {
      items[id] = {
        inputs: [...entry.inputs].sort(),
        outputs: [...entry.outputs].sort(),
      };
    }
    return { schema: raw?.schema ?? 1, itemCount: Object.keys(items).length, items };
  }

  class EmiBundleDemo {
    constructor() {
      this.baseUrl = DEMO_BASE_URL;
      this.locale = 'en_us';
      this.renderer = null;
      this.recipeIndex = null;
      this.itemsIndex = null;
      this.bundle = null;
      this.recipeIds = [];
      this.itemIds = [];
      this.mountSession = null;
      this._filterTimer = null;
      this.itemGridBatchSize = ITEM_GRID_BATCH_SIZE;
      this.itemGridRenderVersion = 0;
      this.itemGridState = { ids: [], renderedCount: 0 };
      this.itemIconObserver = null;

      this.els = {
        locale: document.getElementById('locale-select'),
        filter: document.getElementById('filter-input'),
        error: document.getElementById('demo-error'),
        recipeGrid: document.getElementById('recipe-grid'),
        itemGrid: document.getElementById('item-grid'),
        panelRecipes: document.getElementById('panel-recipes'),
        panelItems: document.getElementById('panel-items'),
        panelItemDetail: document.getElementById('panel-item-detail'),
        itemDetailHeader: document.getElementById('item-detail-header'),
        itemOutputs: document.getElementById('item-outputs'),
        itemInputs: document.getElementById('item-inputs'),
        itemOutputsEmpty: document.getElementById('item-outputs-empty'),
        itemInputsEmpty: document.getElementById('item-inputs-empty'),
        backItems: document.getElementById('btn-back-items'),
        tabLinks: document.querySelectorAll('.demo-tabs a[data-tab]'),
      };

      this.els.locale.addEventListener('change', () => this.onLocaleChange());
      this.els.filter.addEventListener('input', () => this.onFilterInput());
      this.els.backItems.addEventListener('click', () => this.navigate('items'));

      window.addEventListener('hashchange', () => this.syncRoute());
    }

    showError(msg) {
      if (!msg) {
        this.els.error.hidden = true;
        this.els.error.textContent = '';
        return;
      }
      this.els.error.hidden = false;
      this.els.error.textContent = msg;
    }

    rendererOptions() {
      return {
        baseUrl: this.baseUrl,
        injectIconStylesheets: true,
        locale: this.locale,
      };
    }

    async ensureRenderer() {
      if (!this.renderer) {
        this.renderer = new EmiRecipeRenderer(this.rendererOptions());
      } else {
        this.renderer.setBaseUrl(this.baseUrl);
        await this.renderer.setLocale(this.locale);
      }
      return this.renderer;
    }

    disconnectMount() {
      if (this.mountSession?.disconnect) {
        this.mountSession.disconnect();
      }
      this.mountSession = null;
    }

    disconnectItemIconObserver() {
      if (this.itemIconObserver?.disconnect) {
        this.itemIconObserver.disconnect();
      }
      this.itemIconObserver = null;
    }

    cancelPendingItemGridWork() {
      this.itemGridRenderVersion += 1;
      this.disconnectItemIconObserver();
      return this.itemGridRenderVersion;
    }

    queueIdleWork(callback) {
      if (typeof window.requestIdleCallback === 'function') {
        return window.requestIdleCallback(() => callback());
      }
      return setTimeout(() => callback(), 0);
    }

    resetMountedView() {
      this.disconnectMount();
      hideEmiTagPopover();
    }

    async ensureItemRenderer(renderer = this.renderer) {
      if (!renderer) return null;
      await renderer.ensureIconStylesheets();
      await renderer.ensureIconIndices();
      return renderer;
    }

    runRouteAction(route, handlers) {
      if (route.tab === 'item-detail' && route.itemId) {
        return handlers.itemDetail(route.itemId);
      }
      if (route.tab === 'items') {
        return handlers.items();
      }
      return handlers.recipes();
    }

    syncPanels(route) {
      this.els.panelRecipes.hidden = route.tab !== 'recipes';
      this.els.panelItems.hidden = route.tab !== 'items';
      this.els.panelItemDetail.hidden = route.tab !== 'item-detail';
    }

    syncTabLinks(route) {
      this.els.tabLinks.forEach((a) => {
        const tab = a.dataset.tab;
        const current = tab === 'recipes' ? route.tab === 'recipes' : tab === 'items' && isItemRoute(route.tab);
        if (current) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    }

    syncFilterPlaceholder(route) {
      this.els.filter.placeholder = isItemRoute(route.tab)
        ? ITEM_FILTER_PLACEHOLDER
        : RECIPE_FILTER_PLACEHOLDER;
    }

    parseHash() {
      const raw = (location.hash || '#recipes').replace(/^#/, '');
      if (raw === 'items') {
        return { tab: 'items', itemId: null };
      }
      if (raw.startsWith('item/')) {
        const itemId = canonicalItemId(decodeURIComponent(raw.slice(5)));
        return { tab: 'item-detail', itemId };
      }
      return { tab: 'recipes', itemId: null };
    }

    navigate(tab, itemId) {
      if (tab === 'item-detail' && itemId) {
        location.hash = `item/${encodeURIComponent(itemId)}`;
      } else if (tab === 'items') {
        location.hash = 'items';
      } else {
        location.hash = 'recipes';
      }
    }

    syncRoute() {
      const route = this.parseHash();
      this.syncPanels(route);
      this.syncTabLinks(route);
      this.syncFilterPlaceholder(route);
      void this.runRouteAction(route, {
        itemDetail: (itemId) => this.renderItemDetail(itemId),
        items: () => this.renderItemGrid(),
        recipes: () => this.renderRecipeGrid(),
      });
    }

    onFilterInput() {
      clearTimeout(this._filterTimer);
      this._filterTimer = setTimeout(() => this.syncRoute(), 180);
    }

    async onLocaleChange() {
      this.locale = this.els.locale.value;
      localStorage.setItem(STORAGE_LOCALE, this.locale);
      await this.ensureRenderer();
      await this.refreshCurrentViewForLocale();
    }

    async refreshCurrentViewForLocale() {
      return this.runRouteAction(this.parseHash(), {
        itemDetail: (itemId) => this.refreshItemDetailLocale(itemId),
        items: () => this.refreshItemGridLocale(),
        recipes: () => this.refreshRecipeGridLocale(),
      });
    }

    populateLocaleSelect() {
      const langs = this.bundle?.languages || ['en_us'];
      this.els.locale.replaceChildren();
      for (const code of langs) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = code;
        if (code === this.locale) opt.selected = true;
        this.els.locale.appendChild(opt);
      }
    }

    filteredRecipeIds() {
      const q = (this.els.filter.value || '').trim().toLowerCase();
      if (!q) return [...this.recipeIds];
      return this.recipeIds.filter((id) => {
        const cat = this.recipeIndex?.recipes?.[id]?.category || '';
        return id.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
      });
    }

    filteredItemIds() {
      const q = (this.els.filter.value || '').trim().toLowerCase();
      if (!q) return [...this.itemIds];
      const r = this.renderer;
      return this.itemIds.filter((id) => {
        const name = r ? r.translateRegistry(id, 'item').toLowerCase() : '';
        return id.toLowerCase().includes(q) || name.includes(q);
      });
    }

    buildRecipeCards(container, ids) {
      const scale = this.recipeIndex?.scale ?? 2;
      const frag = document.createDocumentFragment();
      for (const id of ids) {
        const card = document.createElement('article');
        card.className = 'recipe-card';

        const label = document.createElement('p');
        label.className = 'recipe-card-id';
        label.textContent = id;
        card.appendChild(label);

        const stage = document.createElement('div');
        stage.className = 'emi-recipe emi-recipe-pending recipe-card-stage';
        stage.dataset.recipeId = id;
        stage.style.minWidth = `${126 * scale}px`;
        stage.style.minHeight = `${62 * scale}px`;
        card.appendChild(stage);

        frag.appendChild(card);
      }
      container.replaceChildren(frag);
    }

    async mountRecipeGrid(root) {
      this.resetMountedView();
      if (!root.querySelector('.emi-recipe[data-recipe-id]')) {
        return;
      }
      this.mountSession = await EmiRecipeRenderer.mountAll({
        root,
        ...this.rendererOptions(),
        lazy: true,
        rootMargin: '400px 0px',
      });
    }

    async renderRecipeGrid() {
      const ids = this.filteredRecipeIds();
      this.buildRecipeCards(this.els.recipeGrid, ids);
      await this.mountRecipeGrid(this.els.recipeGrid);
    }

    async rerenderMountedRecipes(root) {
      const renderer = await this.ensureRenderer();
      if (!renderer || !this.recipeIndex || !root?.querySelectorAll) return;
      const mounted = [...root.querySelectorAll('.emi-recipe[data-recipe-id][data-emi-mounted="1"]')];
      this.resetMountedView();
      for (const el of mounted) {
        const recipeId = (el.dataset.recipeId || '').trim();
        if (!recipeId) continue;
        try {
          const { layout } = await renderer.loadLayout(recipeId, this.recipeIndex);
          await renderer.render(el, layout);
          el.dataset.emiMounted = '1';
          el.classList?.remove?.('emi-recipe-pending');
        } catch (err) {
          EmiRecipeRenderer._showMountError?.(el, recipeId, err?.message);
        }
      }
      await this.mountRecipeGrid(root);
    }

    async refreshRecipeGridLocale() {
      if (!this.els.recipeGrid?.querySelector?.('.emi-recipe[data-recipe-id]')) {
        await this.renderRecipeGrid();
        return;
      }
      await this.rerenderMountedRecipes(this.els.recipeGrid);
    }

    createIconSpan(renderer, itemId, sizeClass) {
      const wrap = document.createElement('div');
      wrap.className = sizeClass || 'item-card-icon';
      this.mountIconSpan(wrap, renderer, itemId);
      return wrap;
    }

    mountIconSpan(wrap, renderer, itemId) {
      if (!wrap || wrap.dataset.iconMounted === '1') return wrap;
      const span = document.createElement('span');
      span.className = 'icon-atlas';
      span.dataset.item = renderer.resolveAtlasId(itemId);
      if (span.dataset.item === renderer.missingIconId) {
        span.title = itemId;
        span.dataset.missingFor = itemId;
      }
      wrap.appendChild(span);
      wrap.dataset.iconMounted = '1';
      return wrap;
    }

    createLazyIconWrap(itemId, sizeClass) {
      const wrap = document.createElement('div');
      wrap.className = sizeClass || 'item-card-icon';
      wrap.dataset.iconKey = itemId;
      return wrap;
    }

    ensureItemIconObserver(renderer) {
      if (typeof IntersectionObserver === 'undefined') return null;
      if (this.itemIconObserver) return this.itemIconObserver;
      this.itemIconObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this.itemIconObserver?.unobserve?.(entry.target);
          this.mountIconSpan(entry.target, renderer, canonicalItemId(entry.target.dataset.iconKey));
        }
      }, {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0,
      });
      return this.itemIconObserver;
    }

    observeItemIcons(renderer, wraps) {
      if (!wraps.length) return;
      const observer = this.ensureItemIconObserver(renderer);
      if (!observer) {
        wraps.forEach((wrap) => {
          this.mountIconSpan(wrap, renderer, canonicalItemId(wrap.dataset.iconKey));
        });
        return;
      }
      wraps.forEach((wrap) => {
        if (wrap.dataset.iconMounted === '1') return;
        observer.observe(wrap);
      });
    }

    buildItemCard(renderer, id) {
      const card = document.createElement('article');
      card.className = 'item-card';
      card.dataset.itemId = id;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('click', () => this.navigate('item-detail', id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.navigate('item-detail', id);
        }
      });

      const iconWrap = this.createLazyIconWrap(id);
      card.appendChild(iconWrap);
      const name = document.createElement('div');
      name.className = 'item-card-name';
      name.textContent = renderer.translateRegistry(id, 'item');
      card.appendChild(name);
      const idEl = document.createElement('div');
      idEl.className = 'item-card-id';
      idEl.textContent = id;
      card.appendChild(idEl);
      return { card, iconWrap };
    }

    scheduleItemGridBatch(renderer, ids, start, replace, version) {
      const end = Math.min(start + this.itemGridBatchSize, ids.length);
      const cards = [];
      const iconWraps = [];
      for (const id of ids.slice(start, end)) {
        const built = this.buildItemCard(renderer, id);
        cards.push(built.card);
        iconWraps.push(built.iconWrap);
      }

      if (replace) {
        this.els.itemGrid.replaceChildren(...cards);
      } else {
        cards.forEach((card) => this.els.itemGrid.appendChild(card));
      }
      this.itemGridState = { ids, renderedCount: end };
      this.observeItemIcons(renderer, iconWraps);

      if (end < ids.length) {
        this.queueIdleWork(() => {
          if (version !== this.itemGridRenderVersion) return;
          this.scheduleItemGridBatch(renderer, ids, end, false, version);
        });
      }
    }

    async renderItemGrid() {
      const renderer = await this.ensureItemRenderer(this.renderer);
      if (!renderer) return;
      const ids = this.filteredItemIds();
      const version = this.cancelPendingItemGridWork();
      this.itemGridState = { ids, renderedCount: 0 };
      this.scheduleItemGridBatch(renderer, ids, 0, true, version);
    }

    async refreshItemGridLocale() {
      const renderer = await this.ensureItemRenderer(await this.ensureRenderer());
      if (!renderer) return;
      const cards = this.els.itemGrid?.querySelectorAll?.('.item-card[data-item-id]') || [];
      if (!cards.length) {
        await this.renderItemGrid();
        return;
      }
      for (const card of cards) {
        const itemId = canonicalItemId(card.dataset.itemId);
        const nameEl = card.querySelector?.('.item-card-name');
        if (itemId && nameEl) {
          nameEl.textContent = renderer.translateRegistry(itemId, 'item');
        }
      }
      const ids = this.filteredItemIds();
      const version = this.cancelPendingItemGridWork();
      this.itemGridState = { ids, renderedCount: cards.length };
      if (cards.length < ids.length) {
        this.scheduleItemGridBatch(renderer, ids, cards.length, false, version);
      }
    }

    async renderItemDetail(itemId) {
      const renderer = await this.ensureRenderer();
      const entry = this.itemsIndex?.items?.[itemId];
      if (!entry) {
        this.showError(`Unknown item: ${itemId}`);
        return;
      }
      this.showError('');
      await this.ensureItemRenderer(renderer);

      this.els.itemDetailHeader.replaceChildren();
      const icon = this.createIconSpan(renderer, itemId, 'item-detail-icon');
      const text = document.createElement('div');
      const title = document.createElement('h1');
      title.className = 'item-detail-title';
      title.textContent = renderer.translateRegistry(itemId, 'item');
      const sub = document.createElement('p');
      sub.className = 'item-detail-id';
      sub.textContent = itemId;
      text.appendChild(title);
      text.appendChild(sub);
      this.els.itemDetailHeader.appendChild(icon);
      this.els.itemDetailHeader.appendChild(text);

      const outputs = entry.outputs || [];
      const inputs = entry.inputs || [];

      this.els.itemOutputsEmpty.hidden = outputs.length > 0;
      this.els.itemInputsEmpty.hidden = inputs.length > 0;

      this.buildRecipeCards(this.els.itemOutputs, outputs);
      this.buildRecipeCards(this.els.itemInputs, inputs);

      await this.mountRecipeGrid(this.els.panelItemDetail);
    }

    async refreshItemDetailLocale(itemId) {
      const renderer = await this.ensureRenderer();
      const entry = this.itemsIndex?.items?.[itemId];
      if (!renderer || !entry) return;
      await this.ensureItemRenderer(renderer);
      const title = this.els.itemDetailHeader?.querySelector?.('.item-detail-title');
      if (title) {
        title.textContent = renderer.translateRegistry(itemId, 'item');
      } else {
        await this.renderItemDetail(itemId);
        return;
      }
      await this.rerenderMountedRecipes(this.els.panelItemDetail);
    }

    async loadBundle() {
      this.resetMountedView();
      this.showError('');

      try {
        const renderer = new EmiRecipeRenderer(this.rendererOptions());
        const [recipeIndex, bundleRes, itemsRes] = await Promise.all([
          renderer.loadIndex(),
          renderer.ensureBundle(),
          loadDemoJson(this.baseUrl, 'items/index.json', { items: {} }),
        ]);

        this.renderer = renderer;
        this.recipeIndex = recipeIndex;
        this.bundle = bundleRes;
        this.itemsIndex = mergeItemsIndex(itemsRes);
        this.recipeIds = Object.keys(recipeIndex.recipes || {}).sort();
        this.itemIds = Object.keys(this.itemsIndex.items || {}).sort();

        this.populateLocaleSelect();
        this.syncRoute();
      } catch (e) {
        this.showError(`Failed to load demo data: ${e.message}`);
        this.recipeIds = [];
        this.itemIds = [];
        this.els.recipeGrid.replaceChildren();
        this.els.itemGrid.replaceChildren();
      }
    }
  }

  global.EmiBundleDemo = EmiBundleDemo;

  document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    const app = new EmiBundleDemo();
    const localeParam = new URLSearchParams(location.search).get('locale');
    app.locale = localeParam || localStorage.getItem(STORAGE_LOCALE) || 'en_us';
    app.loadBundle();
    global.emiBundleDemo = app;

    document.getElementById('tag-popover')?.addEventListener('click', (e) => {
      if (e.target.id === 'tag-popover') hideEmiTagPopover();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideEmiTagPopover();
    });
  });
})(window);
