import fs from 'node:fs';
import path from 'node:path';

import { readRecipeIds } from './recipe-index.mjs';
import { assertFile, fail, isNonEmptyString, readJson } from './util.mjs';

function tagFilePath(tagId, type) {
  const sep = tagId.indexOf(':');
  if (sep <= 0 || sep >= tagId.length - 1) {
    fail(`invalid tag id: ${tagId}`);
  }
  const ns = tagId.slice(0, sep);
  const tagPath = tagId.slice(sep + 1);
  return `tags/${ns}/${type}/${tagPath}.json`;
}

function listTagFiles(bundleRoot) {
  const tagsRoot = path.join(bundleRoot, 'tags');
  const found = [];
  if (!fs.existsSync(tagsRoot)) return found;
  for (const ns of fs.readdirSync(tagsRoot, { withFileTypes: true })) {
    if (!ns.isDirectory() || ns.name === 'index.json') continue;
    for (const type of ['items', 'blocks', 'fluids']) {
      const typeDir = path.join(tagsRoot, ns.name, type);
      if (!fs.existsSync(typeDir)) continue;
      const walk = (dir, prefix) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) {
            walk(full, `${prefix}${ent.name}/`);
            continue;
          }
          if (ent.name.endsWith('.json')) {
            const pathPart = prefix + ent.name.slice(0, -'.json'.length);
            found.push({ type, id: `${ns.name}:${pathPart}` });
          }
        }
      };
      walk(typeDir, '');
    }
  }
  return found;
}

function validateTagsCatalog(bundleRoot) {
  const tagFiles = listTagFiles(bundleRoot);
  if (tagFiles.length === 0) return;

  const catalogRel = 'tags/index.json';
  assertFile(bundleRoot, catalogRel);
  const catalog = readJson(path.join(bundleRoot, catalogRel));
  if (catalog.schema !== 1) {
    fail(`tags/index.json schema expected 1, got ${catalog.schema}`);
  }

  const listed = new Set();
  for (const type of ['items', 'blocks', 'fluids']) {
    const ids = catalog[type];
    if (ids == null) continue;
    if (!Array.isArray(ids)) fail(`tags/index.json "${type}" must be array`);
    for (const id of ids) {
      if (!isNonEmptyString(id)) fail(`tags/index.json ${type} has invalid id`);
      listed.add(`${type}:${id}`);
      assertFile(bundleRoot, tagFilePath(id, type));
    }
  }

  for (const { type, id } of tagFiles) {
    const key = `${type}:${id}`;
    if (!listed.has(key)) {
      fail(`tags/index.json missing ${type} entry: ${id}`);
    }
  }
}

function parseItemIdsFromIndex(itemsIndex) {
  const ids = [];
  for (const [namespace, paths] of Object.entries(itemsIndex || {})) {
    if (namespace === 'schema') continue;
    if (!Array.isArray(paths)) fail(`items/index.json bucket "${namespace}" must be array`);
    for (const p of paths) {
      if (isNonEmptyString(p)) ids.push(`${namespace}:${p}`);
    }
  }
  return ids;
}

/**
 * Full bundle root contract check (JSON Schema + cross-file rules).
 * @param {string} bundleRoot
 * @returns {{ bundle: object, recipeIds: string[], root: string }}
 */
export function validateBundleRoot(bundleRoot) {
  const root = path.resolve(bundleRoot);
  if (!root || !fs.existsSync(root)) {
    fail(`bundle root does not exist: ${root || '<unset>'}`);
  }

  const { bundle, recipeIds } = readRecipeIds(root);

  assertFile(root, 'textures/manifest.json');
  assertFile(root, 'icons/index.json');
  const iconCssPath = path.join(root, 'icons/icons.css');
  if (!fs.existsSync(iconCssPath)) {
    const icons = readJson(path.join(root, 'icons/index.json'));
    const hasInlineAtlas = Object.values(icons?.items || {}).some((entry) => (
      entry
      && typeof entry === 'object'
      && Number.isInteger(entry.page)
      && Number.isFinite(entry.x)
      && Number.isFinite(entry.y)
    ));
    if (!hasInlineAtlas) {
      fail('icons/icons.css missing and icons/index.json has no inline atlas coordinates');
    }
  }

  const fallbackLang = bundle.languages.includes('en_us') ? 'en_us' : bundle.languages[0];
  assertFile(root, `lang/${fallbackLang}.json`);
  assertFile(root, 'items/index.json');
  assertFile(root, 'categories/index.json');
  const categoriesIndex = readJson(path.join(root, 'categories/index.json'));
  if (categoriesIndex.schema !== 1) {
    fail(`categories/index.json schema expected 1, got ${categoriesIndex.schema}`);
  }
  if (!Array.isArray(categoriesIndex.categories) || categoriesIndex.categories.length === 0) {
    fail('categories/index.json must contain a non-empty categories array');
  }
  for (const entry of categoriesIndex.categories) {
    if (!entry?.id || typeof entry.id !== 'string') {
      fail('categories/index.json entries require string id');
    }
  }

  const itemsIndex = readJson(path.join(root, 'items/index.json'));
  const itemIds = parseItemIdsFromIndex(itemsIndex);
  for (const itemId of itemIds) {
    const sep = itemId.indexOf(':');
    const rel = `items/${itemId.slice(0, sep)}/${itemId.slice(sep + 1)}.json`;
    assertFile(root, rel);
  }

  const icons = readJson(path.join(root, 'icons/index.json'));
  if (!icons.items?.[bundle.missingIconId]) {
    fail(`icons/index.json missing missingIconId entry: ${bundle.missingIconId}`);
  }

  if (bundle.recipeCount != null && bundle.recipeCount !== recipeIds.length) {
    fail(`bundle.recipeCount=${bundle.recipeCount} but routes have ${recipeIds.length} recipes`);
  }

  validateTagsCatalog(root);

  return { bundle, recipeIds, root };
}

export function printValidationOk(result) {
  console.log(`OK: ${result.root}`);
  console.log(`  recipes: ${result.recipeIds.length}`);
  console.log(`  languages: ${result.bundle.languages.length}`);
  console.log(`  missingIconId: ${result.bundle.missingIconId}`);
}
