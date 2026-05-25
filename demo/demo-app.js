/**
 * emi-recipe-renderer interactive demo (not part of the library).
 */
(function (global) {
  'use strict';

  const { EmiRecipeRenderer, hideEmiTagPopover } = global;

  const DEMO_BASE_URL = 'emi';
  const STORAGE_LOCALE = 'emiRendererDemoLocale';

  function joinBase(base, path) {
    const b = base.replace(/\/+$/, '');
    const p = path.replace(/^\/+/, '');
    return `${b}/${p}`;
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

      this.els.panelRecipes.hidden = route.tab !== 'recipes';
      this.els.panelItems.hidden = route.tab !== 'items';
      this.els.panelItemDetail.hidden = route.tab !== 'item-detail';

      this.els.tabLinks.forEach((a) => {
        const tab = a.dataset.tab;
        const current = tab === 'recipes' && route.tab === 'recipes'
          || tab === 'items' && (route.tab === 'items' || route.tab === 'item-detail');
        if (current) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });

      this.els.filter.placeholder = route.tab === 'items' || route.tab === 'item-detail'
        ? 'Filter item id or name…'
        : 'Filter recipe id or category…';

      if (route.tab === 'item-detail' && route.itemId) {
        void this.renderItemDetail(route.itemId);
      } else if (route.tab === 'items') {
        void this.renderItemGrid();
      } else {
        void this.renderRecipeGrid();
      }
    }

    onFilterInput() {
      clearTimeout(this._filterTimer);
      this._filterTimer = setTimeout(() => this.syncRoute(), 180);
    }

    async onLocaleChange() {
      this.locale = this.els.locale.value;
      localStorage.setItem(STORAGE_LOCALE, this.locale);
      await this.ensureRenderer();
      this.syncRoute();
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
      this.disconnectMount();
      hideEmiTagPopover();
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

    createIconSpan(renderer, itemId, sizeClass) {
      const wrap = document.createElement('div');
      wrap.className = sizeClass || 'item-card-icon';
      const span = document.createElement('span');
      span.className = 'icon-atlas';
      span.dataset.item = renderer.resolveAtlasId(itemId);
      if (span.dataset.item === renderer.missingIconId) {
        span.title = itemId;
        span.dataset.missingFor = itemId;
      }
      wrap.appendChild(span);
      return wrap;
    }

    async renderItemGrid() {
      const renderer = this.renderer;
      if (!renderer) return;
      await renderer.ensureIconStylesheets();
      await renderer.ensureIconIndices();
      const ids = this.filteredItemIds();
      const frag = document.createDocumentFragment();

      for (const id of ids) {
        const card = document.createElement('article');
        card.className = 'item-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.addEventListener('click', () => this.navigate('item-detail', id));
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.navigate('item-detail', id);
          }
        });

        card.appendChild(this.createIconSpan(renderer, id));
        const name = document.createElement('div');
        name.className = 'item-card-name';
        name.textContent = renderer.translateRegistry(id, 'item');
        card.appendChild(name);
        const idEl = document.createElement('div');
        idEl.className = 'item-card-id';
        idEl.textContent = id;
        card.appendChild(idEl);
        frag.appendChild(card);
      }

      this.els.itemGrid.replaceChildren(frag);
    }

    async renderItemDetail(itemId) {
      const renderer = await this.ensureRenderer();
      const entry = this.itemsIndex?.items?.[itemId];
      if (!entry) {
        this.showError(`Unknown item: ${itemId}`);
        return;
      }
      this.showError('');

      await renderer.ensureIconStylesheets();
      await renderer.ensureIconIndices();

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

    async loadBundle() {
      this.disconnectMount();
      hideEmiTagPopover();
      this.showError('');

      try {
        const renderer = new EmiRecipeRenderer(this.rendererOptions());
        const [recipeIndex, bundleRes, itemsRes] = await Promise.all([
          renderer.loadIndex(),
          fetch(joinBase(this.baseUrl, 'bundle.json')).then((r) => (r.ok ? r.json() : {})),
          fetch(joinBase(this.baseUrl, 'items/index.json')).then((r) => (r.ok ? r.json() : { items: {} })),
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

  document.addEventListener('DOMContentLoaded', () => {
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
