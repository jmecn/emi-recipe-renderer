import fs from 'node:fs';
import path from 'node:path';

import { getSchemaValidator } from './schemas.mjs';
import { fail, readJson } from './util.mjs';

export const RECIPES_DIR = 'recipes';

const schemaValidator = getSchemaValidator();

function assertSchema(data, name, rel) {
  const message = schemaValidator.validate(data, name);
  if (message) {
    fail(`${rel}: ${message}`);
  }
}

function readJsonAt(bundleRoot, rel) {
  const abs = path.join(bundleRoot, rel);
  if (!fs.existsSync(abs)) {
    fail(`missing file: ${rel}`);
  }
  return readJson(abs);
}

export function readRecipeBundle(bundleRoot) {
  const rel = 'bundle.json';
  const bundle = readJsonAt(bundleRoot, rel);
  assertSchema(bundle, 'bundle', rel);
  if (bundle.schema !== 2) {
    fail(`${rel}: schema must be 2`);
  }
  return { bundle };
}

/**
 * Validate bundle.json and recipe card files under recipes/<namespace>/.
 * @param {string} bundleRoot
 */
function recipeImageExtension(bundle) {
  const format = bundle.recipeImageFormat ?? 'png';
  if (format !== 'png' && format !== 'webp') {
    fail('bundle.json: recipeImageFormat must be "png" or "webp"');
  }
  return format;
}

export function validateRecipeIndexSchemas(bundleRoot) {
  const { bundle } = readRecipeBundle(bundleRoot);
  const imageExt = recipeImageExtension(bundle);
  const recipeIds = [];
  const recipesRoot = path.join(bundleRoot, RECIPES_DIR);
  if (!fs.existsSync(recipesRoot)) {
    fail(`missing directory: ${RECIPES_DIR}/`);
  }

  for (const namespace of fs.readdirSync(recipesRoot)) {
    const nsDir = path.join(recipesRoot, namespace);
    if (!fs.statSync(nsDir).isDirectory()) continue;
    for (const file of fs.readdirSync(nsDir)) {
      if (!file.endsWith('.json')) continue;
      const stem = file.slice(0, -5);
      const rel = `${RECIPES_DIR}/${namespace}/${file}`;
      const meta = readJsonAt(bundleRoot, rel);
      assertSchema(meta, 'recipe-meta', rel);
      const imageRel = `${RECIPES_DIR}/${namespace}/${stem}.${imageExt}`;
      if (!fs.existsSync(path.join(bundleRoot, imageRel))) {
        fail(`missing ${imageExt} for meta: ${imageRel}`);
      }
      if (!meta.id || typeof meta.id !== 'string') {
        fail(`${rel}: missing id field`);
      }
      recipeIds.push(meta.id);
    }
  }

  recipeIds.sort();
  return { bundle, recipeIds };
}

/** @deprecated alias */
export function readRecipeIds(bundleRoot) {
  return validateRecipeIndexSchemas(bundleRoot);
}
