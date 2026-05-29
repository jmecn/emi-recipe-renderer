import fs from 'node:fs';
import path from 'node:path';

import { getSchemaValidator } from './schemas.mjs';
import { fail, readJson } from './util.mjs';

export const ROUTES_DIR = 'recipes/routes';
export const LAYOUT_PACKS_DIR = 'recipes/layout-packs';
export const HARD_CAP_BYTES = 2 * 1024 * 1024;

const schemaValidator = getSchemaValidator();

function assertSchema(data, name, rel) {
  const message = schemaValidator.validate(data, name);
  if (message) {
    fail(`${rel}: ${message}`);
  }
}

export function readRecipeBundle(bundleRoot) {
  const rel = 'bundle.json';
  const bundle = readJson(path.join(bundleRoot, rel));
  assertSchema(bundle, 'bundle', rel);
  const { mods } = bundle;
  const namespaces = Object.keys(mods)
    .filter((id) => typeof id === 'string' && id.length > 0)
    .sort();
  return { bundle, mods, namespaces };
}

export function readRouteShard(bundleRoot, namespace, file) {
  const rel = `${ROUTES_DIR}/${namespace}/${file}.json`;
  const abs = path.join(bundleRoot, rel);
  if (!fs.existsSync(abs)) {
    fail(`missing route shard: ${rel}`);
  }
  assertFileSize(rel, abs, HARD_CAP_BYTES);
  const shard = readJson(abs);
  assertSchema(shard, 'route-shard', rel);
  if (shard.namespace !== namespace) {
    fail(`${rel} namespace expected ${namespace}, got ${shard.namespace}`);
  }
  return shard.routes;
}

export function readLayoutPack(bundleRoot, namespace, file) {
  const rel = `${LAYOUT_PACKS_DIR}/${namespace}/${file}.json`;
  const abs = path.join(bundleRoot, rel);
  if (!fs.existsSync(abs)) {
    fail(`missing layout pack: ${rel}`);
  }
  const bytes = assertFileSize(rel, abs, HARD_CAP_BYTES);
  const pack = readJson(abs);
  assertSchema(pack, 'layout-pack', rel);
  if (pack.namespace !== namespace) {
    fail(`${rel} namespace expected ${namespace}, got ${pack.namespace}`);
  }
  return { pack, bytes, rel };
}

function assertFileSize(relPath, absPath, maxBytes) {
  const bytes = fs.statSync(absPath).size;
  if (bytes > maxBytes) {
    fail(`${relPath} exceeds ${maxBytes} bytes (actual ${bytes})`);
  }
  return bytes;
}

/**
 * Recipe index integrity: routes, packs, layouts bijection per namespace.
 * @param {string} bundleRoot
 * @returns {{ bundle: object, recipeIds: string[] }}
 */
export function readRecipeIds(bundleRoot) {
  const { bundle, mods, namespaces } = readRecipeBundle(bundleRoot);
  const recipeIds = [];

  for (const ns of namespaces) {
    const mod = mods[ns];
    const routeToPackIndex = new Map();

    for (const routeFile of mod.routes) {
      const routes = readRouteShard(bundleRoot, ns, routeFile);
      for (const [recipePath, packIndex] of Object.entries(routes)) {
        if (typeof recipePath !== 'string' || recipePath.length === 0) {
          fail(`${ROUTES_DIR}/${ns}/${routeFile}.json has invalid route key`);
        }
        if (!Number.isInteger(packIndex) || packIndex < 0 || packIndex >= mod.packs.length) {
          fail(
            `${ROUTES_DIR}/${ns}/${routeFile}.json routes["${recipePath}"]=${packIndex} out of range for packs (${mod.packs.length})`,
          );
        }
        if (routeToPackIndex.has(recipePath)) {
          fail(`duplicate route path in mods.${ns}: ${recipePath}`);
        }
        routeToPackIndex.set(recipePath, packIndex);
        recipeIds.push(`${ns}:${recipePath}`);
      }
    }

    const layoutPaths = new Set();
    const packLayouts = [];
    for (let i = 0; i < mod.packs.length; i += 1) {
      const packRef = mod.packs[i];
      const { pack, bytes, rel } = readLayoutPack(bundleRoot, ns, packRef.file);
      if (packRef.bytes !== bytes) {
        fail(`${rel} bytes=${bytes} but bundle.mods.${ns}.packs[${i}].bytes=${packRef.bytes}`);
      }
      if (bytes > bundle.packMaxBytes) {
        fail(`${rel} exceeds bundle.packMaxBytes=${bundle.packMaxBytes} (actual ${bytes})`);
      }
      packLayouts[i] = pack.layouts;
      for (const recipePath of Object.keys(pack.layouts)) {
        layoutPaths.add(recipePath);
      }
    }

    for (const [recipePath, packIndex] of routeToPackIndex) {
      if (!Object.hasOwn(packLayouts[packIndex], recipePath)) {
        fail(`missing layout for ${ns}:${recipePath} in pack ${mod.packs[packIndex].file}`);
      }
    }

    if (routeToPackIndex.size !== layoutPaths.size) {
      fail(
        `mods.${ns} route/layout path sets differ (routes=${routeToPackIndex.size}, layouts=${layoutPaths.size})`,
      );
    }
    for (const recipePath of routeToPackIndex.keys()) {
      if (!layoutPaths.has(recipePath)) {
        fail(`route path missing from layout packs: ${ns}:${recipePath}`);
      }
    }
    for (const recipePath of layoutPaths) {
      if (!routeToPackIndex.has(recipePath)) {
        fail(`layout path missing from route shards: ${ns}:${recipePath}`);
      }
    }
  }

  if (recipeIds.length === 0) {
    fail('bundle has zero recipe paths');
  }
  return { bundle, recipeIds };
}
