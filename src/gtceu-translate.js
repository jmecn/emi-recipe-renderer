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
  pipe_tiny_fluid: '%s_tiny_fluid_pipe',
  pipe_small_fluid: '%s_small_fluid_pipe',
  pipe_normal_fluid: '%s_normal_fluid_pipe',
  pipe_large_fluid: '%s_large_fluid_pipe',
  pipe_huge_fluid: '%s_huge_fluid_pipe',
  pipe_quadruple_fluid: '%s_quadruple_fluid_pipe',
  pipe_nonuple_fluid: '%s_nonuple_fluid_pipe',
  pipe_small_item: '%s_small_item_pipe',
  pipe_normal_item: '%s_normal_item_pipe',
  pipe_large_item: '%s_large_item_pipe',
  pipe_huge_item: '%s_huge_item_pipe',
  pipe_small_restrictive: '%s_small_restrictive_pipe',
  pipe_normal_restrictive: '%s_normal_restrictive_pipe',
  pipe_large_restrictive: '%s_large_restrictive_pipe',
  pipe_huge_restrictive: '%s_huge_restrictive_pipe',
};

/** GTToolType.idFormat overrides (default is {@code %s_<name>}). */
export const GT_TOOL_ID_FORMAT_OVERRIDES = {
  lv_drill: 'lv_%s_drill',
  mv_drill: 'mv_%s_drill',
  hv_drill: 'hv_%s_drill',
  ev_drill: 'ev_%s_drill',
  iv_drill: 'iv_%s_drill',
  lv_chainsaw: 'lv_%s_chainsaw',
  hv_chainsaw: 'hv_%s_chainsaw',
  iv_chainsaw: 'iv_%s_chainsaw',
  lv_wrench: 'lv_%s_wrench',
  hv_wrench: 'hv_%s_wrench',
  iv_wrench: 'iv_%s_wrench',
  lv_wirecutter: 'lv_%s_wire_cutter',
  hv_wirecutter: 'hv_%s_wire_cutter',
  iv_wirecutter: 'iv_%s_wire_cutter',
  lv_screwdriver: 'lv_%s_screwdriver',
  hv_screwdriver: 'hv_%s_screwdriver',
  iv_screwdriver: 'iv_%s_screwdriver',
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

export function buildGtToolPatterns(langTable) {
  const patterns = [];
  const table = langTable && typeof langTable === 'object' ? langTable : {};
  const prefix = `item.${GTCEU_NAMESPACE}.tool.`;
  for (const key of Object.keys(table)) {
    if (!key.startsWith(prefix)) continue;
    const toolName = key.slice(prefix.length);
    if (!toolName || toolName.includes('.')) continue;
    const template = table[key];
    if (typeof template !== 'string' || !template.includes('%s')) continue;
    const pattern = GT_TOOL_ID_FORMAT_OVERRIDES[toolName] || `%s_${toolName}`;
    patterns.push({ toolName, pattern, templateKey: key });
  }
  patterns.sort((a, b) => b.pattern.length - a.pattern.length);
  return patterns;
}

export function resolveGtToolTemplateKey(namespace, toolName, langTable = null) {
  const table = langTable && typeof langTable === 'object' ? langTable : {};
  const own = `item.${namespace}.tool.${toolName}`;
  if (table[own] != null) return own;
  const gtceu = `item.${GTCEU_NAMESPACE}.tool.${toolName}`;
  if (namespace !== GTCEU_NAMESPACE && table[gtceu] != null) return gtceu;
  return null;
}

export function translateGtToolItem(namespace, path, translateKey, langTable = null) {
  if (!isComposedRegistryNamespace(namespace) || !path) return null;

  for (const entry of buildGtToolPatterns(langTable)) {
    const materialPath = extractMaterialFromIdPattern(path, entry.pattern);
    if (!materialPath) continue;
    const templateKey = resolveGtToolTemplateKey(namespace, entry.toolName, langTable)
      ?? entry.templateKey;
    const matLabel = resolveKey(translateKey, materialKey(namespace, materialPath));
    if (!matLabel) continue;
    const composed = composeFromTemplate(templateKey, matLabel, translateKey);
    if (composed) return composed;
  }
  return null;
}

export function translateBudIndicator(namespace, path, translateKey) {
  if (!path || !path.endsWith('_bud_indicator')) return null;
  const materialPath = path.slice(0, -'_bud_indicator'.length);
  if (!materialPath) return null;
  const matLabel = resolveKey(translateKey, materialKey(namespace, materialPath));
  if (!matLabel) return null;
  return composeFromTemplate('block.bud_indicator', matLabel, translateKey);
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

/** TFG fluids use GT bucket items; modpack often has only {@code item.gtceu.bucket}, not {@code item.tfg.bucket}. */
export function resolveBucketTemplateKey(namespace, langTable = null) {
  const table = langTable && typeof langTable === 'object' ? langTable : {};
  const own = `item.${namespace}.bucket`;
  if (table[own] != null) return own;
  if (namespace === TFG_NAMESPACE && table[`item.${GTCEU_NAMESPACE}.bucket`] != null) {
    return `item.${GTCEU_NAMESPACE}.bucket`;
  }
  return null;
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

  const budLabel = translateBudIndicator(namespace, path, translateKey);
  if (budLabel) return budLabel;

  const toolLabel = translateGtToolItem(namespace, path, translateKey, langTable);
  if (toolLabel) return toolLabel;

  const bucketTemplateKey = resolveBucketTemplateKey(namespace, langTable);
  if (path.endsWith('_bucket') && bucketTemplateKey != null) {
    const fluidPath = path.slice(0, -'_bucket'.length);
    const bucketTemplate = resolveKey(translateKey, bucketTemplateKey);
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
    if (namespace === TFG_NAMESPACE) {
      keys.add(`item.${GTCEU_NAMESPACE}.bucket`);
    }
    const fluidPath = path.slice(0, -'_bucket'.length);
    for (const k of collectComposedFluidLangKeys(namespace, fluidPath, langTable)) {
      keys.add(k);
    }
    return keys;
  }

  if (path.endsWith('_bud_indicator')) {
    keys.add('block.bud_indicator');
    keys.add(materialKey(namespace, path.slice(0, -'_bud_indicator'.length)));
    return keys;
  }

  for (const entry of buildGtToolPatterns(langTable)) {
    const materialPath = extractMaterialFromIdPattern(path, entry.pattern);
    if (!materialPath) continue;
    const templateKey = resolveGtToolTemplateKey(namespace, entry.toolName, langTable)
      ?? entry.templateKey;
    keys.add(templateKey);
    keys.add(materialKey(namespace, materialPath));
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
