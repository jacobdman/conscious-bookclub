/**
 * Scroll focused form controls into view inside nested scroll regions (e.g. MUI fullscreen Dialog).
 * iOS WebKit often does not scroll nested overflow containers when the keyboard resizes the WebView.
 */

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'hidden',
  'image',
  'radio',
  'reset',
  'submit',
]);

/**
 * @param {EventTarget|null} el
 * @returns {boolean}
 */
export function isTextInputElement(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (NON_TEXT_INPUT_TYPES.has(type)) return false;
    return true;
  }
  if (el.isContentEditable) return true;
  return false;
}

function runScrollIntoView(el) {
  el.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: 'smooth',
  });
}

/**
 * @param {EventTarget|null} el
 */
export function scrollFieldIntoView(el) {
  if (!isTextInputElement(el)) return;
  runScrollIntoView(el);
}
