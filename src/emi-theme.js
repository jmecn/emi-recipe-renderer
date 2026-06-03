/** @typedef {'light' | 'dark'} EmiThemeName */

/**
 * @param {unknown} value
 * @returns {EmiThemeName | null}
 */
export function normalizeEmiTheme(value) {
  const name = String(value ?? '').trim().toLowerCase();
  return name === 'light' || name === 'dark' ? name : null;
}

/**
 * @param {HTMLElement | null | undefined} themeRoot
 * @returns {HTMLElement | null}
 */
export function resolveEmiThemeRoot(themeRoot) {
  if (themeRoot && typeof themeRoot === 'object' && themeRoot.dataset) {
    return themeRoot;
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    return document.documentElement;
  }
  return null;
}

/**
 * Apply preset light/dark tokens via {@code data-emi-theme} on {@code themeRoot}.
 * @param {EmiThemeName | null | undefined} theme
 * @param {{ themeRoot?: HTMLElement | null }} [options]
 * @returns {EmiThemeName | null} resolved theme name, or null if cleared / invalid
 */
export function applyEmiTheme(theme, options = {}) {
  const root = resolveEmiThemeRoot(options.themeRoot);
  if (!root) return null;

  const name = normalizeEmiTheme(theme);
  if (name) {
    root.dataset.emiTheme = name;
  } else if (root.dataset) {
    delete root.dataset.emiTheme;
  }
  return name;
}
