/** Minecraft legacy formatting codes (§0–§f, §l/§o/§n/§m, §r). */

export const MINECRAFT_COLORS = {
  '0': '#000000',
  '1': '#0000AA',
  '2': '#00AA00',
  '3': '#00AAAA',
  '4': '#AA0000',
  '5': '#AA00AA',
  '6': '#FFAA00',
  '7': '#AAAAAA',
  '8': '#555555',
  '9': '#5555FF',
  a: '#55FF55',
  b: '#55FFFF',
  c: '#FF5555',
  d: '#FF55FF',
  e: '#FFFF55',
  f: '#FFFFFF',
};

const DEFAULT_STYLE = Object.freeze({
  color: null,
  baseColor: null,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
});

export function stripMinecraftFormatting(text) {
  return String(text ?? '').replace(/§./g, '');
}

function cloneStyle(style) {
  return { ...style };
}

function applyStyle(span, style) {
  if (style.color) {
    span.classList.add(`mc-${style.color}`);
  } else if (style.baseColor) {
    span.style.color = style.baseColor;
  }
  if (style.bold) span.style.fontWeight = 'bold';
  if (style.italic) span.style.fontStyle = 'italic';
  const deco = [];
  if (style.underline) deco.push('underline');
  if (style.strikethrough) deco.push('line-through');
  if (deco.length) span.style.textDecoration = deco.join(' ');
}

function appendSegment(parent, text, style) {
  if (!text) return;
  const span = document.createElement('span');
  span.textContent = text;
  applyStyle(span, style);
  parent.appendChild(span);
}

function applyFormattingCode(code, style) {
  const key = code.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MINECRAFT_COLORS, key)) {
    style.color = key;
    style.bold = false;
    style.italic = false;
    style.underline = false;
    style.strikethrough = false;
    return;
  }
  switch (key) {
    case 'r':
      style.color = null;
      style.bold = false;
      style.italic = false;
      style.underline = false;
      style.strikethrough = false;
      break;
    case 'l':
      style.bold = true;
      break;
    case 'o':
      style.italic = true;
      break;
    case 'n':
      style.underline = true;
      break;
    case 'm':
      style.strikethrough = true;
      break;
    default:
      break;
  }
}

/**
 * @param {HTMLElement} element
 * @param {string} text
 * @param {string|null} [baseColor] CSS color (#RRGGBB) applied before the first § code
 */
export function applyMinecraftFormattedContent(element, text, baseColor = null) {
  element.replaceChildren();
  const str = String(text ?? '');
  if (!str) return;

  const style = cloneStyle(DEFAULT_STYLE);
  if (baseColor) style.baseColor = baseColor;

  let buf = '';
  for (let i = 0; i < str.length; i += 1) {
    if (str[i] === '§' && i + 1 < str.length) {
      appendSegment(element, buf, style);
      buf = '';
      applyFormattingCode(str[i + 1], style);
      i += 1;
      continue;
    }
    buf += str[i];
  }
  appendSegment(element, buf, style);
}

export function createMinecraftFormattedFragment(text, baseColor = null) {
  const frag = document.createDocumentFragment();
  const host = document.createElement('span');
  applyMinecraftFormattedContent(host, text, baseColor);
  while (host.firstChild) frag.appendChild(host.firstChild);
  return frag;
}

export function hasMinecraftFormatting(text) {
  return /§./.test(String(text ?? ''));
}
