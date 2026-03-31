# patch-package

## `@capacitor+keyboard+8.0.1.patch`

This patch is tied to `@capacitor/keyboard@8.0.1`. If you upgrade `@capacitor/keyboard`, `npm install` may fail when `postinstall` runs `patch-package` because the upstream file changed.

**When upgrading:** Re-apply the intent of the patch manually (see diff), or drop it if upstream fixed:

- Removing the artificial `keyboardAnimationDuration + 0.2` delay before WebView resize
- Animating `ResizeNative` frame changes with `UIView animateWithDuration:0.25`

If you change the native animation duration, update `KEYBOARD_RESIZE_SCROLL_DELAY_MS` in [`src/UI/FullscreenDialog/FullscreenDialog.js`](../src/UI/FullscreenDialog/FullscreenDialog.js) so scroll-into-view runs after the resize finishes.
