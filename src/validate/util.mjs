import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} message
 * @returns {never}
 */
export function fail(message) {
  const error = new Error(message);
  error.name = 'BundleValidationError';
  throw error;
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

export function assertFile(bundleRoot, rel) {
  const abs = path.join(bundleRoot, rel);
  if (!fs.existsSync(abs)) {
    fail(`missing file: ${rel} (under ${bundleRoot})`);
  }
}
