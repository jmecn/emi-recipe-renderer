/**
 * Precomputed registry display names from bundle {@code items-lang/<locale>.json}.
 */

/** Plain registry id: strip SNBT `{...}` and export NBT hash suffix `id@hex`. */
export function stripRegistryId(id) {
  if (!id) return id;
  let s = String(id);
  const brace = s.indexOf('{');
  if (brace >= 0) s = s.slice(0, brace);
  const at = s.indexOf('@');
  if (at >= 0) s = s.slice(0, at);
  return s;
}

/**
 * @param {{ items?: Array<{ id?: string, label?: string }> } | null | undefined} payload
 * @returns {Record<string, string>}
 */
export function buildRegistryLabelTable(payload) {
  const table = Object.create(null);
  if (!payload?.items?.length) {
    return table;
  }
  for (const row of payload.items) {
    if (!row?.id || row.label == null) {
      continue;
    }
    const bare = stripRegistryId(String(row.id));
    if (bare) {
      table[bare] = String(row.label);
    }
  }
  return table;
}

/**
 * @param {Record<string, string> | null | undefined} table
 * @param {string} registryId
 * @returns {string}
 */
export function lookupRegistryLabel(table, registryId) {
  const bare = stripRegistryId(registryId);
  if (!bare) {
    return String(registryId || '');
  }
  if (table && table[bare] != null) {
    return table[bare];
  }
  return bare;
}
