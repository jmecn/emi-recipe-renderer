import fs from 'node:fs';
import path from 'node:path';

import { getSchemaValidator } from './schemas.mjs';
import { fail, readJson } from './util.mjs';

export const ROUTES_DIR = 'recipes/routes';
export const LAYOUT_PACKS_DIR = 'recipes/layout-packs';

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
  const { mods } = bundle;
  const namespaces = Object.keys(mods)
    .filter((id) => typeof id === 'string' && id.length > 0)
    .sort();
  return { bundle, mods, namespaces };
}

export function readRouteShard(bundleRoot, namespace, file) {
  const rel = `${ROUTES_DIR}/${namespace}/${file}.json`;
  const shard = readJsonAt(bundleRoot, rel);
  assertSchema(shard, 'route-shard', rel);
  return shard.routes;
}

export function readLayoutPack(bundleRoot, namespace, file) {
  const rel = `${LAYOUT_PACKS_DIR}/${namespace}/${file}.json`;
  const pack = readJsonAt(bundleRoot, rel);
  assertSchema(pack, 'layout-pack', rel);
  return { pack, rel };
}

/**
 * Schema-validate bundle.json and every route / layout-pack file it references.
 * @param {string} bundleRoot
 * @returns {{ bundle: object, recipeIds: string[] }}
 */
export function validateRecipeIndexSchemas(bundleRoot) {
  const { bundle, mods, namespaces } = readRecipeBundle(bundleRoot);
  const recipeIds = [];

  for (const ns of namespaces) {
    const mod = mods[ns];
    for (const routeFile of mod.routes) {
      const routes = readRouteShard(bundleRoot, ns, routeFile);
      for (const recipePath of Object.keys(routes)) {
        recipeIds.push(`${ns}:${recipePath}`);
      }
    }
    for (const packRef of mod.packs) {
      readLayoutPack(bundleRoot, ns, packRef.file);
    }
  }

  return { bundle, recipeIds };
}

/** @deprecated alias; same as {@link validateRecipeIndexSchemas} */
export function readRecipeIds(bundleRoot) {
  return validateRecipeIndexSchemas(bundleRoot);
}
