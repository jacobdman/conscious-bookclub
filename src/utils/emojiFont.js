/** Color emoji fonts first — required for WebKit/Capacitor when body uses Georgia. */
export const EMOJI_FONT_FALLBACK =
  '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

/** Global stack: text face, then emoji, then generic serif last. */
export const TYPOGRAPHY_FONT_FAMILY = `Georgia, ${EMOJI_FONT_FALLBACK}, serif`;

/** Emoji-only UI (chips, picker): emoji fonts before text face. */
export const EMOJI_FONT_FAMILY = `${EMOJI_FONT_FALLBACK}, Georgia, serif`;
