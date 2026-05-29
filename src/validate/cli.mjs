#!/usr/bin/env node
/**
 * CLI: validate one EMI bundle root directory.
 * Usage: emi-bundle-validate <bundle-dir>
 *    or: node src/validate/cli.mjs <bundle-dir>
 */
import { validateBundleRoot, printValidationOk } from './bundle-root.mjs';

const argRoot = process.argv[2] || process.env.EMI_BUNDLE_ROOT;

if (!argRoot) {
  console.error('Usage: emi-bundle-validate <bundle-dir>');
  process.exit(1);
}

try {
  const result = validateBundleRoot(argRoot);
  printValidationOk(result);
} catch (err) {
  console.error(`FAIL: ${err.message || err}`);
  process.exit(1);
}
