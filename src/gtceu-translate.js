/**
 * GregTech-style composed registry labels (tagprefix + material, fluids, buckets).
 * Mirrors TagPrefix.getUnlocalizedName(Material), FluidStorageKeys, GTBucketItem.
 */

/** Mod id for GregTech CEu composed names (tagprefix + material). */
export const GTCEU_NAMESPACE = 'gtceu';

/** TFG modpack materials use the same tagprefix + material.* compose rules as GTCEu. */
export const TFG_NAMESPACE = 'tfg';

/**
 * Registry namespaces resolved with mod-specific compose rules before flat `item.*` keys.
 * Add mods here when {@link translateComposedRegistry} gains matching rules (e.g. AE2, AFC).
 */
export const COMPOSED_REGISTRY_NAMESPACES = new Set([
  GTCEU_NAMESPACE,
  TFG_NAMESPACE,
]);

/** Fluid lang templates (FluidStorageKeys.translationKeyFunction). */
export const GTCEU_FLUID_LANG_KEYS = {
  molten: 'gtceu.fluid.molten',
  plasma: 'gtceu.fluid.plasma',
  liquid: 'gtceu.fluid.liquid_generic',
  liquidPlain: 'gtceu.fluid.generic',
  gasVapor: 'gtceu.fluid.gas_vapor',
  gasGeneric: 'gtceu.fluid.gas_generic',
  generic: 'gtceu.fluid.generic',
};

export function isComposedRegistryNamespace(namespace) {
  return COMPOSED_REGISTRY_NAMESPACES.has(namespace);
}

/** TagPrefix.idPattern overrides keyed by tagprefix lang suffix (getLowerCaseName). */
export const GTCEU_TAG_PREFIX_PATTERN_OVERRIDES = {
  raw: 'raw_%s',
  raw_ore_block: 'raw_%s_block',
  refined_ore: 'refined_%s_ore',
  purified_ore: 'purified_%s_ore',
  crushed_ore: 'crushed_%s_ore',
  hot_ingot: 'hot_%s_ingot',
  chipped_gem: 'chipped_%s_gem',
  flawed_gem: 'flawed_%s_gem',
  flawless_gem: 'flawless_%s_gem',
  exquisite_gem: 'exquisite_%s_gem',
  small_dust: 'small_%s_dust',
  tiny_dust: 'tiny_%s_dust',
  impure_dust: 'impure_%s_dust',
  pure_dust: 'pure_%s_dust',
  dense_plate: 'dense_%s_plate',
  double_plate: 'double_%s_plate',
  long_rod: 'long_%s_rod',
  small_spring: 'small_%s_spring',
  fine_wire: 'fine_%s_wire',
  wire_gt_single: '%s_single_wire',
  wire_gt_double: '%s_double_wire',
  wire_gt_quadruple: '%s_quadruple_wire',
  wire_gt_octal: '%s_octal_wire',
  wire_gt_hex: '%s_hex_wire',
  cable_gt_single: '%s_single_cable',
  cable_gt_double: '%s_double_cable',
  cable_gt_quadruple: '%s_quadruple_cable',
  cable_gt_octal: '%s_octal_cable',
  cable_gt_hex: '%s_hex_cable',
  small_gear: 'small_%s_gear',
};

export function splitRegistryId(registryId) {
  const bare = String(registryId || '').trim();
  const idx = bare.indexOf(':');
  if (idx <= 0 || idx >= bare.length - 1) {
    return { namespace: '', path: bare };
  }
  return { namespace: bare.slice(0, idx), path: bare.slice(idx + 1) };
}

export function formatLangTemplate(template, ...args) {
  let i = 0;
  return String(template ?? '').replace(/%s/g, () => (i < args.length ? args[i++] : '%s'));
}

export function extractMaterialFromIdPattern(path, pattern) {
  if (!path || !pattern || !pattern.includes('%s')) return null;
  if (pattern.startsWith('%s_')) {
    const suffix = pattern.slice(2);
    if (path.endsWith(suffix)) {
      const material = path.slice(0, path.length - suffix.length);
      return material || null;
    }
    return null;
  }
  if (pattern.endsWith('_%s')) {
    const prefix = pattern.slice(0, -2);
    if (path.startsWith(prefix)) {
      const material = path.slice(prefix.length);
      return material || null;
    }
    return null;
  }
  const idx = pattern.indexOf('%s');
  const before = pattern.slice(0, idx);
  const after = pattern.slice(idx + 2);
  if (path.startsWith(before) && path.endsWith(after)) {
    const material = path.slice(before.length, path.length - after.length);
    return material || null;
  }
  return null;
}

export function buildTagPrefixPatterns(langTable) {
  const patterns = [];
  const table = langTable && typeof langTable === 'object' ? langTable : {};
  for (const key of Object.keys(table)) {
    if (!key.startsWith('tagprefix.')) continue;
    const langSuffix = key.slice('tagprefix.'.length);
    if (langSuffix.startsWith('polymer.')) continue;
    const pattern = GTCEU_TAG_PREFIX_PATTERN_OVERRIDES[langSuffix] || `%s_${langSuffix}`;
    patterns.push({ langSuffix, pattern, langKey: key });
  }
  patterns.sort((a, b) => b.pattern.length - a.pattern.length);
  return patterns;
}

/**
 * Infer FluidStorageKey variant from registry path (FluidStorageKeys registryNameFunction).
 * @returns {{ storageKey: 'molten'|'plasma'|'liquid'|'gas'|'primary', materialPath: string }}
 */
export function parseGtceuFluidPath(path) {
  const p = String(path || '');
  if (p.startsWith('molten_')) {
    return { storageKey: 'molten', materialPath: p.slice('molten_'.length) };
  }
  if (p.endsWith('_plasma')) {
    return { storageKey: 'plasma', materialPath: p.slice(0, -'_plasma'.length) };
  }
  if (p.startsWith('liquid_')) {
    return { storageKey: 'liquid', materialPath: p.slice('liquid_'.length) };
  }
  if (p.endsWith('_gas')) {
    return { storageKey: 'gas', materialPath: p.slice(0, -'_gas'.length) };
  }
  return { storageKey: 'primary', materialPath: p };
}

/**
 * Heuristic for FluidStorageKeys.GAS element branch (no Material on web).
 * Single-segment chemical-style ids (air, oxygen) — not alloy names with underscores.
 */
export function isLikelyElementMaterial(materialPath) {
  const name = String(materialPath || '');
  if (!name || name.includes('_')) return false;
  return /^[a-z][a-z0-9]*$/.test(name);
}

function resolveKey(translateKey, key) {
  if (!key) return null;
  const value = translateKey(key);
  return value != null && value !== key ? value : null;
}

function materialKey(namespace, materialPath) {
  return `material.${namespace}.${materialPath}`;
}

function langKeyPresent(langTable, key) {
  return langTable != null && typeof langTable === 'object' && langTable[key] != null;
}

function firstPresentFluidTemplate(langTable, keys) {
  for (const key of keys) {
    if (langKeyPresent(langTable, key)) return key;
  }
  return null;
}

/**
 * Pick gtceu.fluid.* template key from storage variant (mirrors FluidStorageKeys).
 */
export function pickGtceuFluidLangKey(storageKey, materialPath, langTable = null) {
  const table = langTable && typeof langTable === 'object' ? langTable : {};
  switch (storageKey) {
    case 'molten':
      return GTCEU_FLUID_LANG_KEYS.molten;
    case 'plasma':
      return GTCEU_FLUID_LANG_KEYS.plasma;
    case 'liquid':
      return firstPresentFluidTemplate(table, [
        GTCEU_FLUID_LANG_KEYS.liquid,
        GTCEU_FLUID_LANG_KEYS.liquidPlain,
      ]) || GTCEU_FLUID_LANG_KEYS.liquid;
    case 'gas':
      if (isLikelyElementMaterial(materialPath)) {
        return firstPresentFluidTemplate(table, [
          GTCEU_FLUID_LANG_KEYS.gasGeneric,
          GTCEU_FLUID_LANG_KEYS.generic,
        ]) || GTCEU_FLUID_LANG_KEYS.gasGeneric;
      }
      return firstPresentFluidTemplate(table, [
        GTCEU_FLUID_LANG_KEYS.gasVapor,
        GTCEU_FLUID_LANG_KEYS.gasGeneric,
        GTCEU_FLUID_LANG_KEYS.generic,
      ]) || GTCEU_FLUID_LANG_KEYS.gasVapor;
    case 'primary':
    default:
      if (isLikelyElementMaterial(materialPath)) {
        return firstPresentFluidTemplate(table, [
          GTCEU_FLUID_LANG_KEYS.gasGeneric,
          GTCEU_FLUID_LANG_KEYS.generic,
        ]) || GTCEU_FLUID_LANG_KEYS.gasGeneric;
      }
      return firstPresentFluidTemplate(table, [
        GTCEU_FLUID_LANG_KEYS.liquid,
        GTCEU_FLUID_LANG_KEYS.gasVapor,
        GTCEU_FLUID_LANG_KEYS.generic,
      ]) || GTCEU_FLUID_LANG_KEYS.liquid;
  }
}

function resolveMaterialLabel(namespace, materialPath, fullPath, translateKey) {
  return (
    resolveKey(translateKey, materialKey(namespace, materialPath))
    ?? resolveKey(translateKey, materialKey(namespace, fullPath))
  );
}

/** Longest material.&lt;ns&gt;.* prefix matching registry path (custom item overrides). */
function resolveMaterialLabelForItemPath(namespace, path, translateKey, langTable) {
  const direct = resolveKey(translateKey, materialKey(namespace, path));
  if (direct) return direct;

  const prefix = `material.${namespace}.`;
  let bestMatPath = null;
  const table = langTable && typeof langTable === 'object' ? langTable : {};
  for (const key of Object.keys(table)) {
    if (!key.startsWith(prefix)) continue;
    const matPath = key.slice(prefix.length);
    if (!matPath) continue;
    if (path === matPath || path.startsWith(`${matPath}_`)) {
      if (!bestMatPath || matPath.length > bestMatPath.length) bestMatPath = matPath;
    }
  }
  if (!bestMatPath) return null;
  return resolveKey(translateKey, materialKey(namespace, bestMatPath));
}

function composeFromTemplate(templateKey, matLabel, translateKey) {
  const template = resolveKey(translateKey, templateKey);
  if (!template || !matLabel) return null;
  if (!template.includes('%s')) return template;
  return formatLangTemplate(template, matLabel);
}

/**
 * GregTech fluid display: gtceu.fluid.* template + material.*, then material-only fallback.
 */
export function translateComposedFluid(namespace, path, translateKey, langTable = null) {
  if (!isComposedRegistryNamespace(namespace) || !path) return null;

  const { storageKey, materialPath } = parseGtceuFluidPath(path);
  const matLabel = resolveMaterialLabel(namespace, materialPath, path, translateKey);
  if (!matLabel) {
    return resolveKey(translateKey, materialKey(namespace, path));
  }

  const templateKey = pickGtceuFluidLangKey(storageKey, materialPath, langTable);
  const composed = composeFromTemplate(templateKey, matLabel, translateKey);
  if (composed) return composed;

  return (
    resolveKey(translateKey, materialKey(namespace, path))
    ?? resolveKey(translateKey, materialKey(namespace, materialPath))
  );
}

function composeTagPrefixLabel(namespace, materialPath, langSuffix, translateKey, langTable) {
  const matLabel = resolveKey(translateKey, materialKey(namespace, materialPath));
  if (!matLabel) return null;

  const polymerKey = `tagprefix.polymer.${langSuffix}`;
  const prefixKey = langTable?.[polymerKey] != null ? polymerKey : `tagprefix.${langSuffix}`;
  const prefixTemplate = resolveKey(translateKey, prefixKey);
  if (!prefixTemplate) return null;

  return formatLangTemplate(prefixTemplate, matLabel);
}

/**
 * item.&lt;modid&gt;.&lt;registry path&gt; when present (TagPrefix.getUnlocalizedName first branch).
 */
export function tryItemSpecificLang(namespace, path, translateKey, langTable = null) {
  if (!path) return null;
  const itemKey = `item.${namespace}.${path}`;
  const itemTemplate = resolveKey(translateKey, itemKey);
  if (!itemTemplate) return null;
  if (!itemTemplate.includes('%s')) return itemTemplate;

  for (const entry of buildTagPrefixPatterns(langTable)) {
    const materialPath = extractMaterialFromIdPattern(path, entry.pattern);
    if (!materialPath) continue;
    const matLabel = resolveKey(translateKey, materialKey(namespace, materialPath));
    if (matLabel) return formatLangTemplate(itemTemplate, matLabel);
  }

  const matLabel = resolveMaterialLabelForItemPath(namespace, path, translateKey, langTable);
  if (matLabel) return formatLangTemplate(itemTemplate, matLabel);
  return null;
}

export function translateComposedItem(namespace, path, translateKey, langTable = null) {
  if (!isComposedRegistryNamespace(namespace) || !path) return null;

  const itemOverride = tryItemSpecificLang(namespace, path, translateKey, langTable);
  if (itemOverride) return itemOverride;

  const bucketKey = `item.${namespace}.bucket`;
  if (path.endsWith('_bucket') && langTable?.[bucketKey] != null) {
    const fluidPath = path.slice(0, -'_bucket'.length);
    const bucketTemplate = resolveKey(translateKey, bucketKey);
    const fluidLabel = translateComposedFluid(namespace, fluidPath, translateKey, langTable);
    if (bucketTemplate && fluidLabel) {
      return formatLangTemplate(bucketTemplate, fluidLabel);
    }
  }

  const patterns = buildTagPrefixPatterns(langTable);
  for (const entry of patterns) {
    const materialPath = extractMaterialFromIdPattern(path, entry.pattern);
    if (!materialPath) continue;
    const label = composeTagPrefixLabel(namespace, materialPath, entry.langSuffix, translateKey, langTable);
    if (label) return label;
  }

  return null;
}

export function translateComposedRegistry(registryId, kind, translateKey, langTable = null) {
  const { namespace, path } = splitRegistryId(registryId);
  if (!path) return null;

  if (kind === 'fluid') {
    return translateComposedFluid(namespace, path, translateKey, langTable);
  }
  if (kind === 'item' || kind === 'block') {
    return translateComposedItem(namespace, path, translateKey, langTable);
  }
  return null;
}

/** GT-style tagprefix + material compose (GTCEu and TFG). */
export function isGtceuComposedNamespace(namespace) {
  return isComposedRegistryNamespace(namespace);
}

export function collectComposedItemLangKeys(namespace, path, langTable = null) {
  const keys = new Set();
  if (!isComposedRegistryNamespace(namespace) || !path) return keys;

  keys.add(`item.${namespace}.${path}`);

  if (path.endsWith('_bucket')) {
    keys.add(`item.${namespace}.bucket`);
    const fluidPath = path.slice(0, -'_bucket'.length);
    for (const k of collectComposedFluidLangKeys(namespace, fluidPath, langTable)) {
      keys.add(k);
    }
    return keys;
  }

  const suffixes = new Set(Object.keys(GTCEU_TAG_PREFIX_PATTERN_OVERRIDES));
  const table = langTable && typeof langTable === 'object' ? langTable : {};
  for (const key of Object.keys(table)) {
    if (key.startsWith('tagprefix.') && !key.startsWith('tagprefix.polymer.')) {
      suffixes.add(key.slice('tagprefix.'.length));
    }
  }

  for (const langSuffix of suffixes) {
    const pattern = GTCEU_TAG_PREFIX_PATTERN_OVERRIDES[langSuffix] || `%s_${langSuffix}`;
    const materialPath = extractMaterialFromIdPattern(path, pattern);
    if (!materialPath) continue;
    keys.add(`tagprefix.${langSuffix}`);
    keys.add(`tagprefix.polymer.${langSuffix}`);
    keys.add(materialKey(namespace, materialPath));
    break;
  }

  return keys;
}

export function collectComposedFluidLangKeys(namespace, path, langTable = null) {
  const keys = new Set();
  if (!isComposedRegistryNamespace(namespace) || !path) return keys;

  const { storageKey, materialPath } = parseGtceuFluidPath(path);
  const templateKey = pickGtceuFluidLangKey(storageKey, materialPath, langTable);
  if (templateKey) keys.add(templateKey);
  keys.add(materialKey(namespace, materialPath));
  if (materialPath !== path) keys.add(materialKey(namespace, path));
  return keys;
}
