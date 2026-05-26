import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createStubElement(overrides = {}) {
  const element = {
    value: '',
    hidden: false,
    textContent: '',
    placeholder: '',
    dataset: {},
    style: {},
    className: '',
    childNodes: [],
    addEventListener() {},
    appendChild(child) {
      this.childNodes.push(child);
      return child;
    },
    replaceChildren(...children) {
      this.childNodes = children;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute() {},
    removeAttribute() {},
  };
  return Object.assign(element, overrides);
}

function createRendererNode(tagName, appendedNodes) {
  const node = createStubElement({
    tagName: String(tagName).toUpperCase(),
    textContent: '',
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    remove() {
      const index = appendedNodes.indexOf(node);
      if (index >= 0) appendedNodes.splice(index, 1);
    },
  });
  return node;
}

export function installRendererDomStubs() {
  const appendedNodes = [];
  globalThis.window = globalThis;
  globalThis.document = {
    getElementById() {
      return null;
    },
    querySelector(selector) {
      if (selector === 'link[data-emi-icon="icons"]') {
        return appendedNodes.find((node) => node.tagName === 'LINK' && node.dataset?.emiIcon === 'icons') || null;
      }
      if (selector === 'style[data-emi-icon="icons"]') {
        return appendedNodes.find((node) => node.tagName === 'STYLE' && node.dataset?.emiIcon === 'icons') || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-emi-icon]') {
        return appendedNodes.filter((node) => node.dataset?.emiIcon);
      }
      return [];
    },
    createElement(tag) {
      return createRendererNode(tag, appendedNodes);
    },
    head: {
      appendChild(node) {
        appendedNodes.push(node);
        if (typeof node.onload === 'function') node.onload();
      },
    },
    _appendedNodes: appendedNodes,
  };
}

function createDemoRendererStub() {
  return class {
    constructor(options = {}) {
      this.options = options;
      this.locale = options.locale || 'en_us';
      this.missingIconId = 'fieldguide:missing_icon';
    }

    setBaseUrl() {}

    async setLocale(locale) {
      this.locale = locale;
    }

    async ensureIconStylesheets() {}

    async ensureIconIndices() {}

    translateRegistry(id) {
      return `${this.locale}:${id}`;
    }
  };
}

export async function loadDemoAppTestContext() {
  const elements = new Map([
    ['locale-select', createStubElement()],
    ['filter-input', createStubElement()],
    ['demo-error', createStubElement()],
    ['recipe-grid', createStubElement()],
    ['item-grid', createStubElement()],
    ['panel-recipes', createStubElement()],
    ['panel-items', createStubElement()],
    ['panel-item-detail', createStubElement()],
    ['item-detail-header', createStubElement()],
    ['item-outputs', createStubElement()],
    ['item-inputs', createStubElement()],
    ['item-outputs-empty', createStubElement()],
    ['item-inputs-empty', createStubElement()],
    ['btn-back-items', createStubElement()],
    ['tag-popover', createStubElement()],
  ]);

  globalThis.window = globalThis;
  globalThis.window.addEventListener = () => {};
  globalThis.location = { hash: '#items', search: '' };
  globalThis.localStorage = {
    store: new Map(),
    getItem(key) {
      return this.store.get(key) ?? null;
    },
    setItem(key, value) {
      this.store.set(key, String(value));
    },
  };
  globalThis.navigator = {};
  globalThis.document = {
    readyState: 'loading',
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.demo-tabs a[data-tab]') return [];
      return [];
    },
    createElement() {
      return createStubElement();
    },
    addEventListener() {},
  };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '' });
  globalThis.hideEmiTagPopover = () => {};
  globalThis.EmiRecipeRenderer = createDemoRendererStub();

  const moduleUrl = pathToFileURL(path.join(process.cwd(), 'demo', 'demo-app.js')).href;
  await import(`${moduleUrl}?t=${Date.now()}-${Math.random()}`);
  return { DemoClass: globalThis.EmiBundleDemo, elements };
}
