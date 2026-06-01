/**
 * Registry display labels from merged lang tables (same rules as EmiRecipeRenderer).
 */

import {
  isComposedRegistryNamespace,
  splitRegistryId,
  translateComposedRegistry,
} from './gtceu-translate.js';

export const FALLBACK_LOCALE = 'en_us';

/** Namespaces that resolve labels via material + tagprefix (or fluid templates) before flat keys. */
export const COMPOSED_FIRST_NAMESPACES = new Set(['gtceu', 'tfg']);

export function normalizeLocale(locale) {
  return String(locale || FALLBACK_LOCALE).trim().toLowerCase().replace('-', '_');
}

/** Registry namespace: segment before {@code :}, or {@code minecraft} when absent. */
export function registryNamespace(registryId) {
  const bare = stripRegistryId(registryId);
  const { namespace } = splitRegistryId(bare);
  return namespace || 'minecraft';
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

function isRegistryKind(kind) {
  return kind === 'item' || kind === 'block' || kind === 'fluid';
}

/**
 * @param {object} options
 * @param {Record<string, string>} options.current
 * @param {Record<string, string>} [options.fallback]
 * @param {Record<string, string>} [options.overrides]
 * @param {Record<string, string>} [options.nameKeysByRegistryId]
 */
export function createRegistryLabelResolver(options) {
  const fallback = options.fallback || {};
  const current = options.current || {};
  const overrides = options.overrides || {};
  const nameKeysByRegistryId = options.nameKeysByRegistryId || {};
  const merged = { ...fallback, ...current };

  function translate(key) {
    if (key == null || key === '') return '';
    const k = String(key);
    if (overrides[k] != null) return overrides[k];
    if (current[k] != null) return current[k];
    if (fallback[k] != null) return fallback[k];
    return k;
  }

  function translateDefaultRules(bare, registryId, kind) {
    const exportedKey = nameKeysByRegistryId[bare];
    if (exportedKey) {
      const label = translate(exportedKey);
      if (label !== exportedKey) return label;
    }
    for (const candidate of registryLangKeyCandidates(kind, registryId)) {
      const label = translate(candidate);
      if (label !== candidate) return label;
    }
    return bare || String(registryId || '');
  }

  return {
    translate,
    translateRegistry(registryId, kind = 'item') {
      const bare = stripRegistryId(registryId);
      const ns = registryNamespace(registryId);
      const translateFn = (k) => translate(k);

      switch (ns) {
        case 'gtceu':
        case 'tfg':
          if (isRegistryKind(kind)) {
            const composed = translateComposedRegistry(bare, kind, translateFn, merged);
            if (composed) return composed;
          }
          return translateDefaultRules(bare, registryId, kind);
        default:
          return translateDefaultRules(bare, registryId, kind);
      }
    },
  };
}

/** @deprecated use {@link COMPOSED_FIRST_NAMESPACES} + {@link registryNamespace} */
export function usesComposedLabelsFirst(namespace) {
  return COMPOSED_FIRST_NAMESPACES.has(namespace) || isComposedRegistryNamespace(namespace);
}
