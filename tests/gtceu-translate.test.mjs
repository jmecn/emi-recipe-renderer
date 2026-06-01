import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collectComposedFluidLangKeys,
  collectComposedItemLangKeys,
  extractMaterialFromIdPattern,
  formatLangTemplate,
  parseGtceuFluidPath,
  pickGtceuFluidLangKey,
  translateComposedFluid,
  translateComposedItem,
  translateComposedRegistry,
  tryItemSpecificLang,
  GTMUTILS_ELECTRIC_TOOL_NAMES,
} from '../src/gtceu-translate.js';

const zhCn = {
  'item.gtceu.bucket': '%s桶',
  'item.gtceu.tungsten_steel_fluid_cell': '%s钨钢流体单元',
  'material.gtceu.liquid_air': '液态空气',
  'material.gtceu.air': '空气',
  'material.gtceu.aluminium': '铝',
  'material.gtceu.copper': '铜',
  'tagprefix.ingot': '%s锭',
  'gtceu.fluid.liquid_generic': '液态%s',
  'gtceu.fluid.molten': '熔融%s',
  'gtceu.fluid.gas_generic': '%s气体',
};

function t(key) {
  return zhCn[key] ?? key;
}

test('extractMaterialFromIdPattern handles default and custom patterns', () => {
  assert.equal(extractMaterialFromIdPattern('aluminium_ingot', '%s_ingot'), 'aluminium');
  assert.equal(extractMaterialFromIdPattern('hot_aluminium_ingot', 'hot_%s_ingot'), 'aluminium');
  assert.equal(extractMaterialFromIdPattern('raw_aluminium', 'raw_%s'), 'aluminium');
});

test('parseGtceuFluidPath matches FluidStorageKeys registry naming', () => {
  assert.deepEqual(parseGtceuFluidPath('molten_copper'), {
    storageKey: 'molten',
    materialPath: 'copper',
  });
  assert.deepEqual(parseGtceuFluidPath('liquid_air'), {
    storageKey: 'liquid',
    materialPath: 'air',
  });
  assert.deepEqual(parseGtceuFluidPath('oxygen_gas'), {
    storageKey: 'gas',
    materialPath: 'oxygen',
  });
});

test('translateComposedFluid uses gtceu.fluid templates with material name', () => {
  const liquid = translateComposedFluid('gtceu', 'liquid_air', t, zhCn);
  assert.equal(liquid, '液态空气');

  const molten = translateComposedFluid('gtceu', 'molten_copper', t, zhCn);
  assert.equal(molten, '熔融铜');
});

test('translateComposedFluid falls back to material.<full path> when split material missing', () => {
  const label = translateComposedFluid('gtceu', 'liquid_air', t, {
    'material.gtceu.liquid_air': '液态空气',
    'gtceu.fluid.liquid_generic': '液态%s',
  });
  assert.equal(label, '液态空气');
});

test('translateComposedItem resolves GT fluid buckets via fluid compose', () => {
  const label = translateComposedItem('gtceu', 'liquid_air_bucket', t, zhCn);
  assert.equal(label, '液态空气桶');
});

test('translateComposedItem resolves tagprefix material items', () => {
  const label = translateComposedItem('gtceu', 'aluminium_ingot', t, zhCn);
  assert.equal(label, '铝锭');
});

test('translateComposedItem resolves TFG material.tfg.* with shared tagprefix', () => {
  const lang = {
    'material.tfg.latex': '胶乳',
    'tagprefix.ingot': '%s锭',
  };
  const label = translateComposedItem('tfg', 'latex_ingot', (k) => lang[k] ?? k, lang);
  assert.equal(label, '胶乳锭');
});

test('translateComposedItem resolves TFG bucket via item.gtceu.bucket template', () => {
  const lang = {
    'item.gtceu.bucket': '%s桶',
    'material.tfg.acetylene': '乙炔',
    'gtceu.fluid.generic': '%s',
    'gtceu.fluid.gas_generic': '%s气体',
  };
  const label = translateComposedItem('tfg', 'acetylene_bucket', (k) => lang[k] ?? k, lang);
  assert.equal(label, '乙炔桶');
});

test('translateComposedItem resolves wire_gt_single with modpack tagprefix key', () => {
  const lang = {
    'tagprefix.wire_gt_single': '1x%s导线',
    'material.gtceu.gold': '金',
  };
  const label = translateComposedItem('gtceu', 'gold_single_wire', (k) => lang[k] ?? k, lang);
  assert.equal(label, '1x金导线');
});

test('collectComposedItemLangKeys includes material.tfg for TFG ingots', () => {
  const keys = collectComposedItemLangKeys('tfg', 'latex_ingot', {
    'tagprefix.ingot': '%s锭',
  });
  assert.ok(keys.has('material.tfg.latex'));
  assert.ok(keys.has('tagprefix.ingot'));
});

test('tryItemSpecificLang wins over tagprefix compose', () => {
  const lang = {
    ...zhCn,
    'item.gtceu.aluminium_ingot': '特制%s锭',
  };
  const label = tryItemSpecificLang('gtceu', 'aluminium_ingot', (k) => lang[k] ?? k, lang);
  assert.equal(label, '特制铝锭');
});

test('translateComposedItem prefers tagprefix over item.<modid>.<path> template', () => {
  const lang = {
    'material.gtceu.aluminium': '铝',
    'tagprefix.ingot': '%s锭',
    'item.gtceu.aluminium_ingot': '特制%s锭',
  };
  const label = translateComposedItem('gtceu', 'aluminium_ingot', (k) => lang[k] ?? k, lang);
  assert.equal(label, '铝锭');
});

test('tryItemSpecificLang fills %s from material.<path> without tagprefix pattern', () => {
  const lang = {
    'material.gtceu.tungsten_steel': '钨钢',
    'item.gtceu.tungsten_steel_fluid_cell': '%s流体单元',
  };
  const label = tryItemSpecificLang(
    'gtceu',
    'tungsten_steel_fluid_cell',
    (k) => lang[k] ?? k,
    lang,
  );
  assert.equal(label, '钨钢流体单元');
});

test('translateComposedRegistry composes fluids before flat fluid.* keys', () => {
  const label = translateComposedRegistry('gtceu:liquid_air', 'fluid', t, zhCn);
  assert.equal(label, '液态空气');
});

test('collectComposedItemLangKeys includes wire_gt_single tagprefix for single wires', () => {
  const keys = collectComposedItemLangKeys('gtceu', 'copper_single_wire', {
    'tagprefix.wire_gt_single': '1x%s导线',
  });
  assert.ok(keys.has('tagprefix.wire_gt_single'));
  assert.ok(keys.has('material.gtceu.copper'));
});

test('collectComposedItemLangKeys keeps bucket, item override, and tagprefix dependencies', () => {
  const bucketKeys = collectComposedItemLangKeys('gtceu', 'liquid_air_bucket', zhCn);
  assert.ok(bucketKeys.has('item.gtceu.bucket'));
  assert.ok(bucketKeys.has('gtceu.fluid.liquid_generic'));
  assert.ok(bucketKeys.has('material.gtceu.air'));

  const ingotKeys = collectComposedItemLangKeys('gtceu', 'aluminium_ingot', zhCn);
  assert.ok(ingotKeys.has('item.gtceu.aluminium_ingot'));
  assert.ok(ingotKeys.has('tagprefix.ingot'));
  assert.ok(ingotKeys.has('material.gtceu.aluminium'));
});

test('collectComposedFluidLangKeys includes template and material paths', () => {
  const keys = collectComposedFluidLangKeys('gtceu', 'molten_copper', zhCn);
  assert.ok(keys.has('gtceu.fluid.molten'));
  assert.ok(keys.has('material.gtceu.copper'));
});

test('formatLangTemplate replaces sequential placeholders', () => {
  assert.equal(formatLangTemplate('%s (%s)', 'A', 'B'), 'A (B)');
});

test('pickGtceuFluidLangKey selects gas_generic for element-like materials', () => {
  assert.equal(pickGtceuFluidLangKey('primary', 'air', zhCn, 'gtceu'), 'gtceu.fluid.gas_generic');
  assert.equal(pickGtceuFluidLangKey('gas', 'oxygen', zhCn, 'gtceu'), 'gtceu.fluid.gas_generic');
});

test('pickGtceuFluidLangKey uses generic for modpack fluids and long chemical names', () => {
  assert.equal(pickGtceuFluidLangKey('primary', 'latex', zhCn, 'tfg'), 'gtceu.fluid.generic');
  assert.equal(
    pickGtceuFluidLangKey('primary', 'polytetrafluoroethylene', zhCn, 'gtceu'),
    'gtceu.fluid.generic',
  );
});

test('translateComposedFluid avoids gas/liquid prefixes for TFG primary fluids', () => {
  const lang = {
    'material.tfg.latex': '乳胶',
    'material.tfg.vulcanized_latex': '硫化乳胶',
    'material.gtceu.polytetrafluoroethylene': '聚四氟乙烯',
    'gtceu.fluid.generic': '%s',
    'gtceu.fluid.gas_generic': '气态%s',
    'gtceu.fluid.liquid_generic': '液态%s',
    'item.gtceu.bucket': '%s桶',
  };
  assert.equal(
    translateComposedFluid('tfg', 'latex', (k) => lang[k] ?? k, lang),
    '乳胶',
  );
  assert.equal(
    translateComposedFluid('tfg', 'vulcanized_latex', (k) => lang[k] ?? k, lang),
    '硫化乳胶',
  );
  assert.equal(
    translateComposedItem('tfg', 'latex_bucket', (k) => lang[k] ?? k, lang),
    '乳胶桶',
  );
  assert.equal(
    translateComposedFluid('gtceu', 'polytetrafluoroethylene', (k) => lang[k] ?? k, lang),
    '聚四氟乙烯',
  );
});

test('translateComposedItem resolves GT fluid pipes via pipe tagprefix overrides', () => {
  const lang = {
    'tagprefix.pipe_huge_fluid': '巨型%s流体管道',
    'material.gtceu.aluminium': '铝',
  };
  const label = translateComposedItem('gtceu', 'aluminium_huge_fluid_pipe', (k) => lang[k] ?? k, lang);
  assert.equal(label, '巨型铝流体管道');
});

test('translateComposedItem resolves GT tools via item.gtceu.tool templates', () => {
  const lang = {
    'item.gtceu.tool.axe': '%s斧',
    'material.gtceu.bismuth_bronze': '铋青铜',
  };
  const label = translateComposedItem('gtceu', 'bismuth_bronze_axe', (k) => lang[k] ?? k, lang);
  assert.equal(label, '铋青铜斧');
});

test('translateComposedItem resolves wrench and wire_cutter tool types', () => {
  const lang = {
    'item.gtceu.tool.wrench': '%s扳手',
    'item.gtceu.tool.wire_cutter': '%s剪线钳',
    'item.gtceu.tool.mining_hammer': '%s采矿锤',
    'material.gtceu.copper': '铜',
  };
  assert.equal(
    translateComposedItem('gtceu', 'copper_wrench', (k) => lang[k] ?? k, lang),
    '铜扳手',
  );
  assert.equal(
    translateComposedItem('gtceu', 'copper_wire_cutter', (k) => lang[k] ?? k, lang),
    '铜剪线钳',
  );
  assert.equal(
    translateComposedItem('gtceu', 'copper_mining_hammer', (k) => lang[k] ?? k, lang),
    '铜采矿锤',
  );
});

test('translateComposedItem resolves electric tools with idFormat overrides', () => {
  const lang = {
    'item.gtceu.tool.lv_wirecutter': '%s剪线钳（LV）',
    'item.gtceu.tool.hv_wrench': '%s扳手（HV）',
    'material.gtceu.copper': '铜',
    'material.gtceu.aluminium': '铝',
  };
  assert.equal(
    translateComposedItem('gtceu', 'lv_copper_wire_cutter', (k) => lang[k] ?? k, lang),
    '铜剪线钳（LV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'hv_aluminium_wrench', (k) => lang[k] ?? k, lang),
    '铝扳手（HV）',
  );
});

test('translateComposedItem resolves MV/EV tier electric tools and repair kits', () => {
  const lang = {
    'item.gtceu.tool.ev_buzzsaw': '%s圆锯（EV）',
    'item.gtceu.tool.ev_wrench': '%s扳手（EV）',
    'item.gtceu.tool.mv_buzzsaw': '%s圆锯（MV）',
    'item.gtceu.tool.mv_wrench': '%s扳手（MV）',
    'item.gtceu.tool.mv_wirecutter': '%s剪线钳（MV）',
    'item.gtceu.tool.hv_chainsaw': '%s链锯（HV）',
    'item.gtceu.tool.iv_screwdriver': '%s螺丝刀（IV）',
    'item.gtceu.tool.luv_drill': '%s电钻（LuV）',
    'item.gtceu.tool.zpm_wrench': '%s扳手（ZPM）',
    'tagprefix.repair_kit': '%s修复工具',
    'tagprefix.unfired_repair_kit': '未烧制的%s修复工具',
    'material.gtceu.tungsten_carbide': '钨钢',
    'material.gtceu.vanadium_steel': '钒钢',
    'material.gtceu.ultimet': '哈氏合金',
    'material.gtceu.hsse': 'HSSE',
    'material.gtceu.duranium': '铿铀',
    'material.gtceu.neutronium': '中子素',
    'material.gtceu.steel': '钢',
  };
  assert.equal(
    translateComposedItem('gtceu', 'ev_tungsten_carbide_buzzsaw', (k) => lang[k] ?? k, lang),
    '钨钢圆锯（EV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'ev_tungsten_carbide_wrench', (k) => lang[k] ?? k, lang),
    '钨钢扳手（EV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'mv_vanadium_steel_wrench', (k) => lang[k] ?? k, lang),
    '钒钢扳手（MV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'mv_vanadium_steel_wire_cutter', (k) => lang[k] ?? k, lang),
    '钒钢剪线钳（MV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'hv_ultimet_chainsaw', (k) => lang[k] ?? k, lang),
    '哈氏合金链锯（HV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'iv_hsse_screwdriver', (k) => lang[k] ?? k, lang),
    'HSSE螺丝刀（IV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'luv_duranium_drill', (k) => lang[k] ?? k, lang),
    '铿铀电钻（LuV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'zpm_neutronium_wrench', (k) => lang[k] ?? k, lang),
    '中子素扳手（ZPM）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'repair_kit_tungsten_carbide', (k) => lang[k] ?? k, lang),
    '钨钢修复工具',
  );
  assert.equal(
    translateComposedItem('gtceu', 'unfired_repair_kit_steel', (k) => lang[k] ?? k, lang),
    '未烧制的钢修复工具',
  );
});

test('translateComposedItem resolves gtmutils UtilToolType tier tools', () => {
  const lang = {
    'item.gtceu.tool.hv_buzzsaw': '%s圆锯（HV）',
    'item.gtceu.tool.luv_drill': '%s电钻（LuV）',
    'item.gtceu.tool.zpm_wirecutter': '%s剪线钳（ZPM）',
    'material.gtceu.ultimet': '哈氏合金',
    'material.gtceu.duranium': '铿铀',
    'material.gtceu.naquadah_alloy': '硅岩合金',
  };
  assert.ok(GTMUTILS_ELECTRIC_TOOL_NAMES.includes('hv_buzzsaw'));
  assert.equal(
    translateComposedItem('gtceu', 'hv_ultimet_buzzsaw', (k) => lang[k] ?? k, lang),
    '哈氏合金圆锯（HV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'luv_duranium_drill', (k) => lang[k] ?? k, lang),
    '铿铀电钻（LuV）',
  );
  assert.equal(
    translateComposedItem('gtceu', 'zpm_naquadah_alloy_wire_cutter', (k) => lang[k] ?? k, lang),
    '硅岩合金剪线钳（ZPM）',
  );
});

test('translateComposedItem resolves TFG tools via gtceu tool template fallback', () => {
  const lang = {
    'item.gtceu.tool.axe': '%s斧',
    'material.tfg.arsenic_bronze': '砷青铜',
  };
  const label = translateComposedItem('tfg', 'arsenic_bronze_axe', (k) => lang[k] ?? k, lang);
  assert.equal(label, '砷青铜斧');
});

test('translateComposedItem resolves bud indicators via block.bud_indicator', () => {
  const lang = {
    'block.bud_indicator': '%s 表面芽',
    'material.gtceu.amethyst': '紫水晶',
  };
  const label = translateComposedItem('gtceu', 'amethyst_bud_indicator', (k) => lang[k] ?? k, lang);
  assert.equal(label, '紫水晶 表面芽');
});

test('collectComposedItemLangKeys includes pipe and tool closure keys', () => {
  const pipeKeys = collectComposedItemLangKeys('gtceu', 'copper_small_fluid_pipe', {
    'tagprefix.pipe_small_fluid': '小型%s流体管道',
  });
  assert.ok(pipeKeys.has('tagprefix.pipe_small_fluid'));
  assert.ok(pipeKeys.has('material.gtceu.copper'));

  const toolKeys = collectComposedItemLangKeys('gtceu', 'copper_pickaxe', {
    'item.gtceu.tool.pickaxe': '%s镐',
  });
  assert.ok(toolKeys.has('item.gtceu.tool.pickaxe'));
  assert.ok(toolKeys.has('material.gtceu.copper'));
});

test('translateComposedItem resolves poor/rich/dusty raw ores and restrictive item pipes', () => {
  const lang = {
    'tagprefix.poor_raw': '贫瘠粗%s',
    'tagprefix.rich_raw': '富集粗%s',
    'tagprefix.dusty_raw': '积尘粗%s',
    'tagprefix.pipe_huge_restrictive': '巨型低优先%s物品管道',
    'material.gtceu.borax': '硼砂',
    'material.gtceu.almandine': '铁铝榴石',
    'material.gtceu.bauxite': '铝土矿',
    'material.gtceu.brass': '黄铜',
    'material.tfg.lorandite': '硫砷铊矿',
  };
  const tr = (k) => lang[k] ?? k;
  assert.equal(translateComposedItem('gtceu', 'poor_raw_borax', tr, lang), '贫瘠粗硼砂');
  assert.equal(translateComposedItem('gtceu', 'rich_raw_almandine', tr, lang), '富集粗铁铝榴石');
  assert.equal(translateComposedItem('tfg', 'dusty_raw_lorandite', tr, lang), '积尘粗硫砷铊矿');
  assert.equal(
    translateComposedItem('gtceu', 'brass_huge_restrictive_item_pipe', tr, lang),
    '巨型低优先黄铜物品管道',
  );
});

test('translateComposedItem resolves greate ores and empty-placeholder fluid cells', () => {
  const lang = {
    'tagprefix.poor_raw': '贫瘠粗%s',
    'tagprefix.chipped_gem': '破碎的%s',
    'material.greate.rose_quartz': '玫瑰石英',
    'item.gtceu.universal_fluid_cell': '%s通用单元',
    'item.gtceu.steel_fluid_cell': '%s钢单元',
    'item.tfg.fish_roe': '%s鱼卵',
  };
  const tr = (k) => lang[k] ?? k;
  assert.equal(translateComposedItem('greate', 'poor_raw_rose_quartz', tr, lang), '贫瘠粗玫瑰石英');
  assert.equal(translateComposedItem('greate', 'chipped_rose_quartz_gem', tr, lang), '破碎的玫瑰石英');
  assert.equal(translateComposedItem('gtceu', 'universal_fluid_cell', tr, lang), '通用单元');
  assert.equal(translateComposedItem('gtceu', 'steel_fluid_cell', tr, lang), '钢单元');
  assert.equal(translateComposedItem('tfg', 'fish_roe', tr, lang), '鱼卵');
});
