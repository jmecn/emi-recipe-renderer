/**
 * GregTech-style composed registry labels (tagprefix + material, fluids, buckets).
 * Mirrors TagPrefix.getUnlocalizedName(Material), FluidStorageKeys, GTBucketItem.
 */

/** Mod id for GregTech CEu composed names (tagprefix + material). */
export const GTCEU_NAMESPACE = 'gtceu';

/** TFG modpack materials use the same tagprefix + material.* compose rules as GTCEu. */
export const TFG_NAMESPACE = 'tfg';

/** Greate uses GTCEu materials + tagprefix compose (rose quartz ores, etc.). */
export const GREATE_NAMESPACE = 'greate';

/**
 * Registry namespaces resolved with mod-specific compose rules before flat `item.*` keys.
 * Add mods here when {@link translateComposedRegistry} gains matching rules (e.g. AE2, AFC).
 */
export const COMPOSED_REGISTRY_NAMESPACES = new Set([
  GTCEU_NAMESPACE,
  TFG_NAMESPACE,
  GREATE_NAMESPACE,
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
  pipe_small_restrictive: '%s_small_restrictive_item_pipe',
  pipe_normal_restrictive: '%s_normal_restrictive_item_pipe',
  pipe_large_restrictive: '%s_large_restrictive_item_pipe',
  pipe_huge_restrictive: '%s_huge_restrictive_item_pipe',
  poor_raw: 'poor_raw_%s',
  rich_raw: 'rich_raw_%s',
  dusty_raw: 'dusty_raw_%s',
  repair_kit: 'repair_kit_%s',
  unfired_repair_kit: 'unfired_repair_kit_%s',
};

/** Item paths whose {@code item.<ns>.<path>} template uses {@code %s} as an empty in-game prefix (fluid cells, etc.). */
const EMPTY_PLACEHOLDER_ITEM_PATHS = new Set([
  'universal_fluid_cell',
  'turbine_rotor',
  'fish_roe',
]);

/** GregTech voltage tiers used as registry id prefixes (GTToolType.idFormat). */
export const GT_VOLTAGE_TIER_PREFIXES = [
  'lv',
  'mv',
  'hv',
  'ev',
  'iv',
  'luv',
  'zpm',
  'uv',
  'uev',
  'uhv',
  'max',
];

/** GTToolType.idFormat overrides when registry id does not match {@code <tier>_%s_<rest>}. */
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

/**
 * Electric tools registered by gtmutils ({@code UtilToolType}, assets under {@code item.gtceu.tool.*}).
 * idFormat is always {@code <tier>_%s_<tool>} except wirecutter → {@code <tier>_%s_wire_cutter}.
 * @see net.neganote.gtutilities.common.tools.UtilToolType (gtmutils 2.9.x)
 */
export const GTMUTILS_ELECTRIC_TOOL_NAMES = [
  'mv_screwdriver',
  'ev_screwdriver',
  'luv_screwdriver',
  'zpm_screwdriver',
  'mv_chainsaw',
  'ev_chainsaw',
  'luv_chainsaw',
  'zpm_chainsaw',
  'luv_drill',
  'zpm_drill',
  'mv_wrench',
  'ev_wrench',
  'luv_wrench',
  'zpm_wrench',
  'mv_wirecutter',
  'ev_wirecutter',
  'luv_wirecutter',
  'zpm_wirecutter',
  'mv_buzzsaw',
  'hv_buzzsaw',
  'ev_buzzsaw',
  'iv_buzzsaw',
  'luv_buzzsaw',
  'zpm_buzzsaw',
];

/**
 * Registry id pattern for {@code item.gtceu.tool.<toolName>} (GTToolType.idFormat).
 * Tiered electric tools use {@code <tier>_%s_<tool>} (e.g. {@code ev_%s_buzzsaw}).
 */
export function defaultGtToolIdPattern(toolName) {
  const override = GT_TOOL_ID_FORMAT_OVERRIDES[toolName];
  if (override) return override;
  const wirecutter = String(toolName).match(
    /^(lv|mv|hv|ev|iv|luv|zpm|uv|uev|uhv|max)_wirecutter$/,
  );
  if (wirecutter) return `${wirecutter[1]}_%s_wire_cutter`;
  const tiered = String(toolName).match(/^(lv|mv|hv|ev|iv|luv|zpm|uv|uev|uhv|max)_(.+)$/);
  if (tiered) return `${tiered[1]}_%s_${tiered[2]}`;
  return `%s_${toolName}`;
}

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

function formatLangTemplateTrimmed(template, ...args) {
  return formatLangTemplate(template, ...args).trim();
}

/**
 * GT fluid cells / universal cell: {@code %s} is often an empty in-game prefix.
 * Per-material cells may embed the material in the template ({@code %s钢单元}) or only in {@code %s} ({@code %s流体单元}).
 */
function tryEmptyPlaceholderItemLang(namespace, path, translateKey) {
  if (!path) return null;
  const itemKey = `item.${namespace}.${path}`;
  const itemTemplate = resolveKey(translateKey, itemKey);
  if (!itemTemplate || !itemTemplate.includes('%s')) return null;

  if (EMPTY_PLACEHOLDER_ITEM_PATHS.has(path)) {
    return formatLangTemplateTrimmed(itemTemplate, '');
  }

  if (!path.endsWith('_fluid_cell')) return null;

  const matPath = path.slice(0, -'_fluid_cell'.length);
  const matLabel = matPath
    ? (
      resolveKey(translateKey, materialKey(namespace, matPath))
      ?? (namespace !== GTCEU_NAMESPACE
        ? resolveKey(translateKey, materialKey(GTCEU_NAMESPACE, matPath))
        : null)
    )
    : null;

  const templateWithoutPlaceholder = itemTemplate.replace(/%s/g, '');
  if (matLabel && templateWithoutPlaceholder.includes(matLabel)) {
    return formatLangTemplateTrimmed(itemTemplate, '');
  }
  if (matLabel) {
    return formatLangTemplate(itemTemplate, matLabel);
  }
  return formatLangTemplateTrimmed(itemTemplate, '');
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
  const seen = new Set();

  function addToolPattern(toolName, templateKey) {
    if (!toolName || toolName.includes('.') || seen.has(toolName)) return;
    const template = table[templateKey];
    if (typeof template !== 'string' || !template.includes('%s')) return;
    seen.add(toolName);
    patterns.push({
      toolName,
      pattern: defaultGtToolIdPattern(toolName),
      templateKey,
    });
  }

  for (const key of Object.keys(table)) {
    if (!key.startsWith(prefix)) continue;
    addToolPattern(key.slice(prefix.length), key);
  }

  for (const toolName of GTMUTILS_ELECTRIC_TOOL_NAMES) {
    addToolPattern(toolName, `${prefix}${toolName}`);
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
 * Heuristic for FluidStorageKeys.GAS element branch (no Material metadata on web).
 * Matches short element ids (oxygen, chlorine) — not polymers (polytetrafluoroethylene) or modpack materials (latex).
 */
export function isLikelyElementMaterial(materialPath) {
  const name = String(materialPath || '');
  if (!name || name.includes('_') || name.length > 12) return false;
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

function pickGenericFluidTemplate(langTable) {
  return (
    firstPresentFluidTemplate(langTable, [
      GTCEU_FLUID_LANG_KEYS.generic,
      GTCEU_FLUID_LANG_KEYS.liquidPlain,
    ]) || GTCEU_FLUID_LANG_KEYS.generic
  );
}

/**
 * Pick gtceu.fluid.* template key from storage variant (mirrors FluidStorageKeys).
 * @param {string} [namespace] Registry namespace ({@code gtceu}, {@code tfg}, …).
 */
export function pickGtceuFluidLangKey(storageKey, materialPath, langTable = null, namespace = GTCEU_NAMESPACE) {
  const table = langTable && typeof langTable === 'object' ? langTable : {};
  const modpackFluid = namespace !== GTCEU_NAMESPACE;
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
      if (modpackFluid) {
        return pickGenericFluidTemplate(table);
      }
      if (isLikelyElementMaterial(materialPath)) {
        return firstPresentFluidTemplate(table, [
          GTCEU_FLUID_LANG_KEYS.gasGeneric,
          GTCEU_FLUID_LANG_KEYS.generic,
        ]) || GTCEU_FLUID_LANG_KEYS.gasGeneric;
      }
      return pickGenericFluidTemplate(table);
    case 'primary':
    default:
      if (modpackFluid) {
        return pickGenericFluidTemplate(table);
      }
      if (isLikelyElementMaterial(materialPath)) {
        return firstPresentFluidTemplate(table, [
          GTCEU_FLUID_LANG_KEYS.gasGeneric,
          GTCEU_FLUID_LANG_KEYS.generic,
        ]) || GTCEU_FLUID_LANG_KEYS.gasGeneric;
      }
      return pickGenericFluidTemplate(table);
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

  const flatFluid = resolveKey(translateKey, `fluid.${namespace}.${path}`);
  if (flatFluid) return flatFluid;

  const { storageKey, materialPath } = parseGtceuFluidPath(path);
  const matLabel = resolveMaterialLabel(namespace, materialPath, path, translateKey);
  if (!matLabel) {
    return resolveKey(translateKey, materialKey(namespace, path));
  }

  const templateKey = pickGtceuFluidLangKey(storageKey, materialPath, langTable, namespace);
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

  const emptyPlaceholder = tryEmptyPlaceholderItemLang(namespace, path, translateKey);
  if (emptyPlaceholder) return emptyPlaceholder;

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

  const emptyPlaceholder = tryEmptyPlaceholderItemLang(namespace, path, translateKey);
  if (emptyPlaceholder) return emptyPlaceholder;

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

  const itemOverride = tryItemSpecificLang(namespace, path, translateKey, langTable);
  if (itemOverride) return itemOverride;

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
  const templateKey = pickGtceuFluidLangKey(storageKey, materialPath, langTable, namespace);
  if (templateKey) keys.add(templateKey);
  keys.add(materialKey(namespace, materialPath));
  if (materialPath !== path) keys.add(materialKey(namespace, path));
  return keys;
}
