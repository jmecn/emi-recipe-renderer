/**
 * EMI recipe category display — bundle {@code categories/index.json} carries authoritative {@code nameKey}.
 */

export function translateCategoryLabel(categoryId, translateKey, manifestEntry) {
  const key = manifestEntry?.nameKey;
  if (key) {
    const value = translateKey(key);
    if (value != null && value !== key) return value;
  }
  const path = categoryId.includes(':') ? categoryId.slice(categoryId.indexOf(':') + 1) : categoryId;
  return path.replace(/[/_]/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}
