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

function createStubFragment() {
  return {
    childNodes: [],
    appendChild(child) {
      this.childNodes.push(child);
      return child;
    },
  };
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

