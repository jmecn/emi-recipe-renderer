/**
 * Registry display labels: precomputed {@code items-lang} table at runtime (no GT compose).
 */

import { splitRegistryId } from './gtceu-translate.js';
import { lookupRegistryLabel, stripRegistryId } from './registry-label-table.mjs';

export { stripRegistryId, lookupRegistryLabel, buildRegistryLabelTable } from './registry-label-table.mjs';

export const FALLBACK_LOCALE = 'en_us';

export function normalizeLocale(locale) {
  return String(locale || FALLBACK_LOCALE).trim().toLowerCase().replace('-', '_');
}

/** Registry namespace: segment before {@code :}, or {@code minecraft} when absent. */
export function registryNamespace(registryId) {
  const bare = stripRegistryId(registryId);
  const { namespace } = splitRegistryId(bare);
  return namespace || 'minecraft';
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
 * @param {Record<string, string>} [options.labelsByRegistryId] precomputed {@code items-lang} labels
 * @param {Record<string, string>} [options.current] kept for {@link #translate} in tests
 * @param {Record<string, string>} [options.fallback]
 * @param {Record<string, string>} [options.overrides]
 * @param {Record<string, string>} [options.nameKeysByRegistryId]
 */
export function createRegistryLabelResolver(options) {
  const labelsByRegistryId = options.labelsByRegistryId || null;
  const fallback = options.fallback || {};
  const current = options.current || {};
  const overrides = options.overrides || {};
  const nameKeysByRegistryId = options.nameKeysByRegistryId || {};

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
      if (labelsByRegistryId && Object.keys(labelsByRegistryId).length > 0) {
        return lookupRegistryLabel(labelsByRegistryId, registryId);
      }
      return lookupRegistryLabel(null, registryId);
    },
  };
}
