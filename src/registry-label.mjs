/**
 * Registry display labels from merged lang tables (same rules as EmiRecipeRenderer).
 */

import {
  isComposedRegistryNamespace,
  splitRegistryId,
  translateComposedRegistry,
} from './gtceu-translate.js';

export const FALLBACK_LOCALE = 'en_us';

export function normalizeLocale(locale) {
  return String(locale || FALLBACK_LOCALE).trim().toLowerCase().replace('-', '_');
}

/** Plain registry id: strip SNBT `{...}` and export NBT hash suffix `id@hex`. */
export function stripRegistryId(id) {
  if (!id) return id;
  let s = String(id);
  const brace = s.indexOf('{');
  if (brace >= 0) s = s.slice(0, brace);
  const at = s.indexOf('@');
  if (at >= 0) s = s.slice(0, at);
  return s;
}

/** Lang key order aligned with Forge LangKeyCollector#addRegistryKeys. */
export function registryLangKeyCandidates(kind, registryId) {
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

/**
 * @param {Record<string, string>} tables - merged fallback + current (current wins on duplicate keys)
 * @param {string} key
 */
export function translateKeyFromTables(tables, key) {
  if (key == null || key === '') return '';
  const k = String(key);
  if (tables[k] != null) return tables[k];
  return k;
}

/**
 * @param {object} options
 * @param {Record<string, string>} options.current
 * @param {Record<string, string>} [options.fallback]
 * @param {Record<string, string>} [options.overrides]
 */
export function createRegistryLabelResolver(options) {
  const fallback = options.fallback || {};
  const current = options.current || {};
  const overrides = options.overrides || {};
  const merged = { ...fallback, ...current };

  function translate(key) {
    if (key == null || key === '') return '';
    const k = String(key);
    if (overrides[k] != null) return overrides[k];
    if (current[k] != null) return current[k];
    if (fallback[k] != null) return fallback[k];
    return k;
  }

  return {
    translate,
    translateRegistry(registryId, kind = 'item') {
      const bare = stripRegistryId(registryId);
      const translateFn = (k) => translate(k);
      const { namespace } = splitRegistryId(bare);

      if (isComposedRegistryNamespace(namespace)
        && (kind === 'item' || kind === 'block' || kind === 'fluid')) {
        const composedFirst = translateComposedRegistry(bare, kind, translateFn, merged);
        if (composedFirst) return composedFirst;
      }

      for (const candidate of registryLangKeyCandidates(kind, registryId)) {
        const label = translate(candidate);
        if (label !== candidate) return label;
      }

      const composed = translateComposedRegistry(bare, kind, translateFn, merged);
      if (composed) return composed;

      return bare || String(registryId || '');
    },
  };
}
