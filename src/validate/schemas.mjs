import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

const schemasDir = path.join(fileURLToPath(new URL('.', import.meta.url)), '../../schemas');

const SCHEMA_FILES = [
  'bundle.schema.json',
  'recipe-meta.schema.json',
];

const SCHEMA_IDS = {
  bundle: 'https://github.com/jmecn/emi-recipe-renderer/schemas/bundle.schema.json',
  'recipe-meta': 'https://github.com/jmecn/emi-recipe-renderer/schemas/recipe-meta.schema.json',
};

/**
 * @param {import('ajv').ErrorObject[] | null | undefined} errors
 * @param {string} label
 */
export function formatSchemaErrors(errors, label) {
  const lines = (errors || []).map((err) => {
    const at = err.instancePath || '/';
    return `${label}: ${at} ${err.message || 'invalid'}`;
  });
  return lines.join('\n');
}

let validatorCache;

/**
 * @returns {{
 *   validate: (data: unknown, name: 'bundle' | 'recipe-meta') => string | null
 * }}
 */
export function getSchemaValidator() {
  if (validatorCache) return validatorCache;

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  for (const file of SCHEMA_FILES) {
    const abs = path.join(schemasDir, file);
    ajv.addSchema(JSON.parse(fs.readFileSync(abs, 'utf8')));
  }

  const validators = {};
  for (const [name, id] of Object.entries(SCHEMA_IDS)) {
    const fn = ajv.getSchema(id);
    if (!fn) {
      throw new Error(`schema not registered: ${id}`);
    }
    validators[name] = fn;
  }

  validatorCache = {
    validate(data, name) {
      const fn = validators[name];
      if (!fn) {
        return `${name}: unknown schema`;
      }
      if (fn(data)) {
        return null;
      }
      return formatSchemaErrors(fn.errors, name);
    },
  };

  return validatorCache;
}
